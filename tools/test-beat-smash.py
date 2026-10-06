#!/usr/bin/env python3
"""Browser tests for Beat Smash (Phase 1: the first minute and Tango).

    pip install playwright           (once; it drives your own Google Chrome)
    python tools/test-beat-smash.py

It serves the app from this folder, opens it in headless Chrome at phone
size, and PLAYS it by pressing the real pads with the mouse and the
keyboard, in time with the audio clock: the first minute, all three of
Tango's steps, a missed take, the comeback rule, the studio, the part
picker and playback. Then an engraving sweep of every bar the dice can
roll, and the layout on a phone, a small phone and a Chromebook.

Each check prints PASS or FAIL; the script exits non-zero if any fails. It
takes a few minutes, because the takes are really played at 100 bpm.

No network? Point KR_VEXFLOW at a local copy of vexflow-min.js (3.0.9) and
the CDN request is answered from it. KR_CHROME names a browser to use
instead of your own Chrome.

Also run tools/check-text.py - this file tests behaviour, that one words.
"""
import functools
import http.server
import os
import json
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8791
URL = 'http://127.0.0.1:%d/index.html' % PORT
PHONE = {'width': 390, 'height': 844}
VEXFLOW_CDN = 'https://cdn.jsdelivr.net/npm/vexflow@3.0.9/releases/vexflow-min.js'

results = []
errors = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  (' + str(detail) + ')') if detail != '' else ''))
    sys.stdout.flush()


def serve():
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def launch(p):
    args = ['--autoplay-policy=no-user-gesture-required']
    if os.environ.get('KR_CHROME'):
        return p.chromium.launch(executable_path=os.environ['KR_CHROME'], args=args)
    try:
        return p.chromium.launch(channel='chrome', args=args)
    except Exception:
        return p.chromium.launch(args=args)


def new_page(browser, size=PHONE):
    page = browser.new_page(viewport=size)
    page.on('pageerror', lambda e: errors.append(str(e)))
    local = os.environ.get('KR_VEXFLOW')
    if local:
        page.route(VEXFLOW_CDN, lambda route: route.fulfill(path=local, content_type='application/javascript'))
    page.route('**/fonts.googleapis.com/**', lambda route: route.abort())
    page.goto(URL)
    return page


def fresh(page, setup=''):
    """A clean device, optionally with some saved state, speech silenced."""
    page.evaluate('localStorage.clear();' + setup)
    page.reload()
    page.wait_for_timeout(400)
    page.evaluate('KR.speak = () => {}')


def screen(page):
    return page.evaluate("[...document.querySelectorAll('#view-beat .screen.active')].map(s => s.id).join()")


def guide(page, box='beat-studio-guide'):
    return page.inner_text('#' + box)


def state(page):
    return page.evaluate("bsmash && { mode: bsmash.mode, step: bsmash.step, streak: bsmash.streak,"
                         " scaffold: bsmash.scaffold, phase: bsmash.phase, delay: bsmash.delay,"
                         " take: bsmash.take && { go: bsmash.take.go, done: bsmash.take.done } }")


def record(page, musician='drums'):
    return page.evaluate("bsmashMusicianRecord('%s')" % musician)


# ---------- playing in time ----------
# The audio clock and Python's clock, lined up: the smallest round trip wins.
def clock_offset(page):
    best = None
    for _ in range(5):
        a = time.perf_counter()
        ctx = page.evaluate('raudioCtx.currentTime')
        b = time.perf_counter()
        if best is None or b - a < best[0]:
            best = (b - a, (a + b) / 2 - ctx)
    return best[1]


def sleep_until(wall):
    left = wall - time.perf_counter()
    if left > 0:
        time.sleep(left)


def pad_point(page, index):
    box = page.locator('#beat-pads .krpad').nth(index).bounding_box()
    return box['x'] + box['width'] / 2, box['y'] + box['height'] / 2


def press_at(page, offset, ctx_time, index=0, hold=0.08, key=None):
    """Press pad `index` (or `key`) at ctx_time on the audio clock. With
    offset None the two clocks are lined up afresh first: over a long run
    of taps the page's audio clock and this one drift apart."""
    if offset is None:
        offset = clock_offset(page)
    sleep_until(ctx_time + offset)
    if key:
        page.keyboard.down(key)
        time.sleep(hold)
        page.keyboard.up(key)
        return
    x, y = pad_point(page, index)
    page.mouse.move(x, y)
    page.mouse.down()
    time.sleep(hold)
    page.mouse.up()


def wait_for_take(page, timeout=20):
    """Wait until a take is booked; return its notes and rests on the audio clock."""
    end = time.time() + timeout
    while time.time() < end:
        take = page.evaluate("bsmash && bsmash.take && !bsmash.take.done && { start: bsmash.take.start,"
                             " end: bsmash.take.end, notes: bsmash.take.notes.map(n => n.t),"
                             " noteBars: bsmash.take.notes.map(n => n.bar),"
                             " slots: bsmash.take.notes.map(n => n.spec.slots),"
                             " rests: bsmash.take.rests.map(r => [r.t, r.end]), delay: bsmash.delay, beat: BSMASH_BEAT }")
        if take:
            return take
        time.sleep(0.05)
    return None


def wait_take_done(page, timeout=25):
    page.wait_for_function('!bsmash || !bsmash.take || bsmash.take.done', timeout=timeout * 1000)


def play_take(page, skip=(), rest_tap=False, use_key=None, let_go=(), wrong_pad=(), shift=None):
    """Play the take that is coming: every note on time, except the note
    indexes in `skip`; with rest_tap, one tap in the first rest too (early in
    it, well clear of the next note). A long note is held for its length,
    except the note indexes in `let_go`, which are let go at once. `shift`
    moves one note's press: {index: seconds}."""
    take = wait_for_take(page)
    if not take:
        return None
    offset = clock_offset(page)
    pads = page.locator('#beat-pads .krpad').count()
    presses = [(t + (shift or {}).get(i, 0), i) for i, t in enumerate(take['notes']) if i not in skip]
    beat_s = take['beat']
    hold = lambda i: 0.08 if i < 0 or i in let_go or take['slots'][i] < 2 else (take['slots'][i] - 0.25) * beat_s
    if rest_tap and take['rests']:
        r0, r1 = take['rests'][0]
        presses.append((r0 + 0.3 * (r1 - r0), -1))
    presses.sort()
    for t, i in presses:
        # The pad is the beat the note sits in: an eighth on the "and" of 2 is pad 2.
        beat = int((t - take['start']) / beat_s + 0.01) % 4
        key = str(beat + 1) if use_key == 'beats' else use_key
        pad = beat if pads == 4 else 0
        if i >= 0 and i in wrong_pad:
            pad = (pad + 2) % 4
        press_at(page, offset, t + take['delay'], index=pad, key=key, hold=hold(i))
    wait_take_done(page)
    return take


def record_take(page, **kw):
    """The studio: wait for the transport, press Record, play the take."""
    page.wait_for_function("bsmash && (bsmash.phase === 'ready' || bsmash.phase === 'verdict') && !document.getElementById('beat-transport-record').disabled", timeout=20000)
    page.click('#beat-transport-record')
    return play_take(page, **kw)


def play_until(page, predicate, limit=12, **kw):
    for _ in range(limit):
        if page.evaluate(predicate):
            return True
        if screen(page) == 'beat-screen-player':
            return True
        play_take(page, **kw)
        page.wait_for_timeout(300)
    return page.evaluate(predicate)


def drag_into(page, card, box, hold=400):
    """Hold a card, then slide it up into the Add box and let go (Rob's
    Balatro move). Returns whether the box appeared and lit under the card."""
    c = page.locator(card).bounding_box()
    x, y = c['x'] + c['width'] / 2, c['y'] + c['height'] / 2
    page.mouse.move(x, y)
    page.mouse.down()
    page.wait_for_timeout(hold)
    shown = page.is_visible(box)
    r = page.locator(box).bounding_box()
    tx, ty = r['x'] + r['width'] / 2, r['y'] + r['height'] / 2
    for k in range(1, 9):
        page.mouse.move(x + (tx - x) * k / 8, y + (ty - y) * k / 8)
        page.wait_for_timeout(15)
    over = page.evaluate("document.querySelector('%s').classList.contains('over')" % box)
    page.mouse.up()
    page.wait_for_timeout(300)
    return shown and over


# ---------- the tests ----------

def test_engraving(page):
    fresh(page)
    out = page.evaluate("""(() => {
        const tango = BSMASH_MUSICIANS[0];
        const grid = bsmashGrid(tango);
        const all = bsmashAllBars(tango);
        let illegal = 0, total = 0, outside = 0;
        const legal = bar => rstompShapeIsLegal(bar, 4, 0, grid);
        Object.keys(tango.steps).forEach(step => tango.steps[step].forEach(rung => {
            const bars = rung === 'all' ? all : rung.map(bsmashParseBar);
            bars.forEach(bar => { total++; if (!legal(bar)) illegal++; });
        }));
        // 300 rolls of every step at every rung: every bar legal, and never
        // a bar from beyond the rung the student has reached.
        let rolled = 0;
        [1, 2, 3].forEach(step => [0, 1, 2, 3, 4, 9].forEach(clean => {
            const table = bsmashDiceTable(tango, step, clean).map(b => b.join());
            for (let i = 0; i < 50; i++) bsmashRoll(tango, step, clean, null).forEach(bar => {
                rolled++;
                if (!legal(bar)) illegal++;
                if (table.indexOf(bar.join()) === -1) outside++;
            });
        }));
        const fourRests = all.some(bar => bar.every(k => k === 'quarter-rest'));
        return { all: all.length, total, rolled, illegal, outside, fourRests };
    })()""")
    check('Tango: every legal bar of quarters and quarter rests is 15 bars', out['all'] == 15, out['all'])
    check('Tango: never a bar of four quarter rests', not out['fourRests'])
    check('Dice: every bar in every table, and every bar rolled, passes the engraving rules',
          out['illegal'] == 0, out)
    check('Dice: a roll never goes beyond the rung the student has reached', out['outside'] == 0, out['outside'])
    ladder = page.evaluate("[0, 1, 2].map(c => bsmashDiceTable(BSMASH_MUSICIANS[0], 1, c).map(b => b.join(' ')))")
    check('The one-bar ladder opens: every beat, the strong beats, the backbeat',
          ladder == [['quarter-note quarter-note quarter-note quarter-note'],
                     ['quarter-note quarter-rest quarter-note quarter-rest'],
                     ['quarter-rest quarter-note quarter-rest quarter-note']], ladder)
    drawn = page.evaluate("""(() => {
        launchGame('view-beat'); switchScreenState('beat', 'beat-screen-studio');
        bsmash = { mode: 'steps', musician: BSMASH_MUSICIANS[0], step: 3 };
        let failed = 0;
        bsmashAllBars(BSMASH_MUSICIANS[0]).forEach(bar => {
            bsmash.specs = [bar, bar, bar, bar].map(bsmashSpecs);
            try { bsmashRenderReading(); if (document.querySelectorAll('#beat-reading svg').length < 1) failed++; }
            catch (e) { failed++; }
        });
        const lines = document.querySelectorAll('#beat-reading .bsmash-line').length;
        bsmash.specs = [bsmashParseBar('q qr q q')].map(bsmashSpecs);
        bsmashRenderReading(); bsmashShow('picture');
        const squares = [...document.querySelectorAll('#beat-reading .bsmash-block')].map(b => [b.offsetWidth, b.offsetHeight]);
        bsmash = null;
        return { failed, lines, squares, stomp: [rstompSlotsPerBar, rstompSlotValue] };
    })()""")
    check('Every Tango bar draws as notation, through Stomp Lab\'s own renderer', drawn['failed'] == 0, drawn)
    check('Four bars take two lines on a phone', drawn['lines'] == 2, drawn['lines'])
    check('Each beat\'s block is a square, not a long rectangle',
          len(drawn['squares']) == 4 and all(abs(w - h) <= 1 and h >= 30 for w, h in drawn['squares']), drawn['squares'])
    check('Drawing a bar leaves Stomp Lab\'s grid as it found it', drawn['stomp'] == [4, 'q'], drawn['stomp'])


def test_first_minute(page):
    fresh(page)
    page.click('.game-card.red')
    page.wait_for_timeout(800)
    check('A new device goes straight into the studio, no name asked', screen(page) == 'beat-screen-studio', screen(page))
    check('Tango says "Copy me!"', 'Copy me' in guide(page), guide(page))
    check('Four beat pads for the first minute', page.locator('#beat-pads .krpad').count() == 4)
    check('Nothing to read in the first minute: no stars, no step', page.evaluate(
        "document.getElementById('beat-stars').hidden && document.getElementById('beat-step-label').hidden"))
    check('Beat Smash is first on the dashboard', page.evaluate(
        "document.querySelector('#view-dashboard .game-card').classList.contains('red')"))
    check('The band needs a pulse: nobody is playing until the student does',
          page.evaluate('Object.keys(bsmashBand.parts).length') == 0)
    # Off-beat taps: they sound, nothing lights, nothing fails.
    offset = clock_offset(page)
    start = page.evaluate('bsmashBand.start')
    now = page.evaluate('raudioCtx.currentTime')
    beat = int((now - start) / 0.6) + 2
    for k in range(3):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.3, index=k)
    check('Off-beat taps don\'t fill the meter', page.evaluate('bsmashJamProgress()') == 0, page.evaluate('bsmashJamProgress()'))
    # The build, shortened for the test: a bar held each for the drums, two
    # each for the bass and the keys, two for the full groove.
    page.evaluate('[1, 2, 2, 2].forEach((bars, i) => { BSMASH_JAM_BUILD[i].bars = bars; })')
    # Back on the beat, from the top of a bar: a wobbly start doesn't stop the
    # meter filling, and a bar held brings the drums in.
    bar = int((page.evaluate('raudioCtx.currentTime') - start) / 2.4) + 1
    for k in range(8):
        press_at(page, None, start + bar * 2.4 + k * 0.6 + 0.04, index=k % 4)
    page.wait_for_timeout(200)
    check('Back on the beat after a wobbly start: a bar held brings the drums in, the pads stay pads',
          'drums' in page.evaluate('Object.keys(bsmashBand.parts)') and page.evaluate('bsmashJamProgress()') > 0
          and not page.evaluate('bsmash.jam.morphed') and page.is_hidden('#beat-jam-next'),
          page.evaluate('Object.keys(bsmashBand.parts)'))
    # Hold the beat, with a steady 40 ms of "device delay", until the groove is full.
    bar += 2
    for k in range(48):
        press_at(page, None, start + bar * 2.4 + k * 0.6 + 0.04, index=k % 4)
        if page.evaluate('bsmash.jam.full'):
            break
    page.wait_for_timeout(300)
    parts = page.evaluate('Object.keys(bsmashBand.parts).sort()')
    check('Holding the beat builds the band: the bass and keys join in', parts == ['bass', 'drums', 'keys'], parts)
    check('The groove is full, and "Show me what I played" appears',
          page.evaluate('bsmash.jam.full') and page.is_visible('#beat-jam-next'), page.evaluate('bsmashJamProgress()'))
    page.wait_for_timeout(1500)
    check('...and the jam carries on until they press it', not page.evaluate('bsmash.jam.morphed'))
    page.click('#beat-jam-next')
    page.wait_for_timeout(300)
    check('Show me: the pads turn into four quarter notes',
          page.evaluate('bsmash.jam.morphed') and page.locator('#beat-reading svg').count() == 1)
    check('...and Tango says so', "That's what you just played" in guide(page), guide(page))
    check('...and the band steps back to Tango alone', page.evaluate('Object.keys(bsmashBand.parts)') == ['drums'])
    delay = page.evaluate('bsmashDelay()')
    check('The device delay is measured and stored', -0.05 <= delay < 0.2, round(delay, 3))
    test = page.evaluate('bsmashLoad().beatTests[0]')
    check('The jam is a beat test: taps, lean, steadiness and % on the beat are kept',
          test and test['taps'] >= 20 and test['onBeat'] >= 80 and -60 <= test['leanMs'] < 200 and test['steadyMs'] < 80, test)
    page.wait_for_function("bsmash && bsmash.mode === 'songs'", timeout=10000)
    check('Then the songs to choose from, over a little click', screen(page) == 'beat-screen-song'
          and page.evaluate('JSON.stringify(bsmashBand.parts)') == '{"click":"click"}', page.evaluate('JSON.stringify(bsmashBand.parts)'))
    page.click('.bsmash-song-card[data-song="c-1-4-1-5"]')
    page.click('#beat-song-add')
    page.wait_for_function("bsmash && bsmash.mode === 'steps'", timeout=10000)
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('Then the first roll: Tango\'s one-bar step, over the song chosen, and the audition\'s click, tune and bass gone',
          state(page)['step'] == 1 and state(page)['scaffold'] == 'star1'
          and parts == {'drums': 'warmup', 'guide': 'guide:c-1-4-1-5'}, parts)


def test_warmup_story(page):
    """Rob, playtest 2: the band needs a pulse, and keeping it is the
    student's job. Each player joins after bars held; back off and the last
    one leaves, to be won back. A rhythm of their own is a cool groove, but
    not what this song needs."""
    fresh(page)
    page.click('.game-card.red')
    page.wait_for_timeout(3000)
    check('The story: the band needs a pulse', 'pulse' in guide(page), guide(page))
    page.evaluate('BSMASH_JAM_BUILD.forEach(step => { step.bars = 1; })')
    start = page.evaluate('bsmashBand.start')
    bar = int((page.evaluate('raudioCtx.currentTime') - start) / 2.4) + 1
    for k in range(8):
        press_at(page, None, start + bar * 2.4 + k * 0.6 + 0.04, index=k % 4)
    # One tap in the next bar: that bar will be let go.
    press_at(page, None, start + (bar + 2) * 2.4 + 0.04, index=0)
    page.wait_for_timeout(250)
    check('Two bars held: the drums, then the bass', page.evaluate('Object.keys(bsmashBand.parts).sort()') == ['bass', 'drums'],
          page.evaluate('Object.keys(bsmashBand.parts)'))
    check('...and the desk lights the channels playing', page.evaluate(
        "[...document.querySelectorAll('#beat-desk .lit')].length") == 2)
    for k in range(4):
        press_at(page, None, start + (bar + 3) * 2.4 + k * 0.6 + 0.04, index=k)
        if k == 0:
            page.wait_for_timeout(150)
            parts = page.evaluate('Object.keys(bsmashBand.parts)')
            check('Back off, and the last to join leaves: the bass', parts == ['drums'] and 'bass' in guide(page), [parts, guide(page)])
    sleep_until(start + (bar + 4) * 2.4 + 0.25 + clock_offset(page))
    check('...and a bar held wins it back', page.evaluate('Object.keys(bsmashBand.parts).sort()') == ['bass', 'drums'])
    # A rhythm of their own: every tap on the "and".
    page.evaluate('bsmash.jam.lastCoach = -Infinity')
    for k in range(4):
        press_at(page, None, start + (bar + 5) * 2.4 + k * 0.6 + 0.3, index=k)
    check('Taps on the "and": a cool groove, but not what this song needs', 'cool groove' in guide(page), guide(page))


def test_beat_light(page):
    """The beat light in the middle of the jam: green on the beat, yellow to
    the left when early and to the right when late, red when off; and Tango
    coaching the time."""
    fresh(page)
    page.click('.game-card.red')
    page.wait_for_timeout(800)
    check('The beat light sits in the empty middle of the jam, dark until a tap',
          page.is_visible('#beat-light') and page.evaluate("document.getElementById('beat-light').dataset.state") == 'idle')
    light = "(() => { const l = document.getElementById('beat-light'); return [l.dataset.state, l.style.getPropertyValue('--miss')]; })()"
    start = page.evaluate('bsmashBand.start')
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 2
    for k in range(4):
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
    on = page.evaluate(light)
    check('Right on the beat: it fills green, dead centre', on[0] == 'on' and on[1] == '0.0%', on)
    check('...and Tango says what green means', 'Green means' in guide(page), guide(page))
    beat += 4
    press_at(page, None, start + beat * 0.6 + 0.04 - 0.115, index=0)
    early = page.evaluate(light)
    press_at(page, None, start + (beat + 1) * 0.6 + 0.04 + 0.115, index=1)
    late = page.evaluate(light)
    press_at(page, None, start + (beat + 2) * 0.6 + 0.04 + 0.2, index=2)
    off = page.evaluate(light)
    check('A bit early: yellow, and the fill lands LEFT of centre', early[0] == 'early' and early[1].startswith('-'), early)
    check('A bit late: yellow, to the right', late[0] == 'late' and not late[1].startswith('-') and late[1] != '0.0%', late)
    check('Way off: red at the edge, further out than a bit late',
          off[0] == 'way-late' and float(off[1][:-1]) > float(late[1][:-1]), off)
    page.wait_for_timeout(1000)
    check('No tap for a moment and the light goes dark', page.evaluate(light)[0] == 'idle')
    # Hold it green: the glow grows, and Tango says so.
    beat += 4
    for k in range(9):
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
    run = page.evaluate("[bsmash.jam.greenRun, document.getElementById('beat-light').style.getPropertyValue('--run')]")
    check('Holding it green: the glow grows with every green in a row', run[0] >= 8 and run[1] == '1.00', run)
    said = guide(page)
    check('...and Tango notices', any(w in said for w in ('Right in time', 'pulse', 'All green')), said)
    # Rushing: taps a little quicker than the band.
    page.evaluate('bsmash.jam.lastCoach = -Infinity')
    beat += 10
    t = start + beat * 0.6 + 0.04
    for k in range(6):
        press_at(page, None, t + k * 0.55, index=k % 4)
    said = guide(page)
    check('Faster than the band: Tango says slow down', 'too fast' in said or 'rushing' in said, said)
    # Dragging: a little slower.
    page.evaluate('bsmash.jam.lastCoach = -Infinity')
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 3
    for k in range(8):
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
    page.evaluate('bsmash.jam.lastCoach = -Infinity; bsmash.jam.praiseAt = 999')
    t = start + (beat + 8) * 0.6 + 0.04
    for k in range(6):
        press_at(page, None, t + k * 0.65, index=k % 4)
    said = guide(page)
    check('Slower than the band: Tango says speed up', 'dragging' in said or 'behind the band' in said, said)
    page.evaluate('bsmashJamMorph()')
    page.wait_for_timeout(300)
    check('Once the notes appear, the light is gone', page.is_hidden('#beat-light'))


def test_follow_me(page):
    """Missing the beat: Tango counts "1 2 3 4" in time until order is
    restored, says so; and if they fall apart and stop, she encourages."""
    fresh(page)
    page.click('.game-card.red')
    page.wait_for_timeout(800)
    page.evaluate("window.counted = []; const say = raudioSyllable;"
                  "raudioSyllable = (t, label, strong, beat) => { counted.push([t, label]); say(t, label, strong, beat); }; 0")
    start = page.evaluate('bsmashBand.start')
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 2
    for k in range(3):
        press_at(page, None, start + (beat + k) * 0.6 - 0.24, index=k)
    check('Missing the beat: Tango says "Follow me! 1, 2, 3, 4!"',
          'Follow me' in guide(page) and page.evaluate('bsmash.jam.follow !== null'), guide(page))
    page.wait_for_timeout(3200)
    counts = page.evaluate('counted.map(c => [Math.round((c[0] - bsmashBand.start) / 0.6 * 1000) / 1000, c[1]])')
    check('...and counts, in time: every count lands on a beat, 1 2 3 4 by its place in the bar',
          len(counts) >= 4 and all(c[0] == int(c[0]) and c[1] == str(int(c[0]) % 4 + 1) for c in counts), counts)
    shown = page.evaluate("[document.getElementById('beat-light').classList.contains('counting'),"
                          " document.querySelector('#beat-light .bsmash-light-count').textContent]")
    check('...with the number in the middle of the beat light', shown[0] and shown[1] in ('1', '2', '3', '4'), shown)
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 2
    for k in range(5):
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
    said = guide(page)
    check('Back on the beat: the counting stops, and Tango congratulates them',
          page.evaluate('bsmash.jam.follow === null') and ('back on the beat' in said or 'found it' in said), said)
    page.wait_for_timeout(1500)
    n = page.evaluate('counted.length')
    page.wait_for_timeout(1300)
    check('...and stays stopped', page.evaluate('counted.length') == n)
    # Fall apart, then stop.
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 2
    for k in range(3):
        press_at(page, None, start + (beat + k) * 0.6 + 0.3, index=k)
    page.wait_for_function('bsmash.jam.stopped', timeout=9000)
    page.wait_for_timeout(200)
    said = guide(page)
    check('They fall apart and stop: everyone struggles at the beginning, keep trying',
          'Everyone struggles' in said and page.is_visible('#beat-jam-nav'), said)
    check('...and the counting stops with the band', page.evaluate('bsmash.jam.follow === null'))


def test_one_bar_step(page):
    # The first star: the picture go earns it (Rob: "make sure the first star
    # always appears after a correct playing"), then the reveal.
    take = play_take(page)
    check('The first star starts from the picture', take is not None and page.evaluate("bsmash.take.go") == 'picture')
    check('A clean picture go: the bar glows', page.evaluate("document.getElementById('beat-reading').classList.contains('clean')"))
    page.wait_for_timeout(300)
    check('...and the first star lands at once, on the first clean playing', record(page)['streak'] == 1, record(page))
    page.wait_for_function("(document.querySelector('#view-beat .screen.active') || {}).id === 'beat-screen-player'", timeout=8000)
    check('After the first star, and not before, the name and age are asked', screen(page) == 'beat-screen-player')
    page.fill('#beat-name-input', 'Garnet')
    page.click('#beat-screen-player .btn-start')
    page.wait_for_timeout(200)
    check('An age is needed as well as a name', screen(page) == 'beat-screen-player')
    page.click('#beat-age-row .bsmash-age:nth-child(1)')
    page.click('#beat-screen-player .btn-start')
    page.wait_for_timeout(600)
    check('Back to the studio, and the first star kept for the new player',
          screen(page) == 'beat-screen-studio' and record(page)['streak'] == 1, record(page))
    page.wait_for_timeout(200)
    check('...then the picture morphs into notation', state(page)['phase'] == 'reveal', state(page)['phase'])
    take = play_take(page)
    check('...and the same bar is played again from the notation, for the second star',
          page.evaluate("bsmash.take.go") == 'notation' and page.evaluate("bsmash.take.flashPicture") is False)
    page.wait_for_timeout(500)
    check('Two stars', record(page)['streak'] == 2, record(page))
    check('The age is stored on the player', page.evaluate('bsmashPlayer().age') == '6-8')
    check('One picture only: squares, no choice to make (Rob: "just give them one interface of squares")',
          page.evaluate("!document.getElementById('beat-picture-choice')")
          and page.evaluate("[...document.querySelectorAll('#beat-reading .bsmash-block')].every(b => b.classList.contains('pic-blocks'))"))

    # A miss on the third star: the stars empty, the same bar is retaken.
    wait_for_take(page)
    bars_before = page.evaluate("bsmash.bars.map(b => b.join()).join('|')")
    play_take(page, skip=(0,))
    page.wait_for_timeout(300)
    check('A missed note: the verdict says so, and "Take two!"', 'Take two' in guide(page) and 'got away' in guide(page), guide(page))
    check('...and the missed note is the one marked most strongly',
          page.locator('#beat-reading .bsmash-under .bsmash-miss.named').count() == 1)
    check('...the row of stars empties', record(page)['streak'] == 0 and page.evaluate(
        "document.querySelectorAll('#beat-stars .bsmash-star.full').length") == 0)
    check('...and the wrong note is marked below the staff, not over it',
          page.locator('#beat-reading .bsmash-under .bsmash-miss').count() >= 1)
    wait_for_take(page)
    check('...then the SAME bar again, as practice', state(page)['scaffold'] == 'retake'
          and page.evaluate("bsmash.bars.map(b => b.join()).join('|')") == bars_before)
    play_take(page, rest_tap=True) if page.evaluate("bsmash.take.rests.length") else play_take(page, skip=(0,))
    page.wait_for_timeout(300)
    check('A tap in a rest is not clean either, and the verdict counts: "Take three!"',
          'Take three' in guide(page) and state(page)['scaffold'] == 'retake', guide(page))
    play_take(page)
    page.wait_for_timeout(600)
    check('A clean retake is the first star of a new row (Rob: the first star after the first correct playing)',
          record(page)['streak'] == 1, record(page))
    # The second star of a new row: the picture only during the count-in.
    take = wait_for_take(page)
    check('The second star reads from new bars in notation', state(page)['scaffold'] == 'star2' and state(page)['take']['go'] == 'notation')
    check('...with the picture shown during the count-in', page.evaluate("bsmash.showing") == 'picture')
    play_take(page)
    check('...which gave way to the notation before beat 1', page.evaluate("bsmash.showing") == 'notation')
    page.wait_for_timeout(500)
    check('Two stars again', record(page)['streak'] == 2, record(page))
    ok = play_until(page, "bsmashMusicianRecord('drums').step === 2", limit=12)
    check('Three clean takes in a row clear the one-bar step', ok, record(page))


def test_two_bar_step(page):
    page.wait_for_function("bsmash && bsmash.step === 2", timeout=15000)
    wait_for_take(page)
    check('The two-bar step reads two bars', page.evaluate('bsmash.specs.length') == 2)
    check('...on the four beat pads (the default, every step)', page.locator('#beat-pads .krpad').count() == 4)
    # Played on the keyboard: keys 1 2 3 4 are the four beat pads.
    ok = play_until(page, "bsmashMusicianRecord('drums').step === 3", limit=10, use_key='beats')
    check('Three clean two-bar takes, played on the keys 1 2 3 4, open four bars', ok, record(page))


def test_long_steps(page):
    """Rob, 2026-10-01: four bars and eight bars come "the normal way", three
    in a row each, no Record button; then the studio, 32 bars once through,
    with a transport, a control room, listening back and trying again."""
    page.wait_for_function("bsmash && bsmash.step === 3 && bsmash.take && !bsmash.take.done", timeout=20000)
    check('Four bars come the normal way: dice, count-in, straight into the take, no Record button',
          page.evaluate('bsmash.specs.length') == 4 and page.evaluate("bsmash.scaffold") == 'star1'
          and not page.is_visible('#beat-transport'), page.evaluate("bsmash.scaffold"))
    take = wait_for_take(page)
    bars = take['noteBars']
    lost = [0] + [i for i, b in enumerate(bars) if b >= bars[0] + 1][:1]
    play_take(page, skip=tuple(lost))
    page.wait_for_timeout(300)
    check('Four bars: lose a note AND the next beat 1, and it is take two (the comeback rule)',
          page.evaluate("bsmash.take.lostBar") and 'Take two' in guide(page), guide(page))
    wait_for_take(page)
    play_take(page, skip=(0,))
    page.wait_for_timeout(300)
    check('...one note lost, back in by the next beat 1: that passes, by the pass mark, and the first star lands',
          page.evaluate("bsmash.take.cameBack && !bsmash.take.lostBar") and state(page)['streak'] == 1, state(page))
    ok = play_until(page, "bsmashMusicianRecord('drums').step === 4", limit=8)
    check('Four bars, three in a row: on to eight bars', ok, record(page))

    # Eight bars: two in the row already, so one more passing take wins it.
    page.evaluate("const p = bsmashLoad(); p.settings.studioBars = 8; bsmashSave(p);"
                  "bsmashUpdateMusician('drums', { step: 4, streak: 2 }); startBeatMusician('drums', true, 4)")
    take = wait_for_take(page)
    check('Eight bars, the normal way too: straight into the take, notation, no Record button',
          len(take['noteBars']) and max(take['noteBars']) <= 7 and page.evaluate('bsmash.specs.length') == 8
          and not page.is_visible('#beat-transport'))
    play_take(page)
    page.wait_for_function("bsmash && bsmash.step === 5 && bsmash.phase === 'ready'", timeout=20000)
    check('Eight bars three in a row: into the studio', record(page)['step'] == 5
          and page.inner_text('#beat-step-label').strip().lower() == 'the studio', page.inner_text('#beat-step-label'))
    t = page.evaluate("""(() => { const b = id => document.getElementById(id);
        return { shown: !b('beat-transport').hidden, rec: !b('beat-transport-record').disabled,
                 play: !b('beat-transport-play').disabled, stop: !b('beat-transport-stop').disabled,
                 keep: !b('beat-transport-keep').hidden, dice: !b('beat-dice').hidden }; })()""")
    check('The studio has a transport: Record live; Listen and Stop not yet; no Keep; no dice',
          t == {'shown': True, 'rec': True, 'play': False, 'stop': False, 'keep': False, 'dice': False}, t)
    bars_before = page.evaluate("bsmash.bars.map(b => b.join()).join('|')")
    page.click('#beat-transport-record')
    page.wait_for_function("bsmash.take && !bsmash.take.done", timeout=8000)
    t = page.evaluate("[!document.getElementById('beat-transport-record').disabled, !document.getElementById('beat-transport-stop').disabled]")
    check('Recording: Stop is live, Record is not', t == [False, True], t)
    play_take(page, skip=tuple(range(200)))         # nothing played
    page.wait_for_timeout(400)
    c = page.evaluate("""(() => { const c = document.getElementById('beat-control');
        return { shown: !c.hidden, passed: c.classList.contains('passed'), score: c.querySelector('.bsmash-control-score').textContent,
                 keep: !document.getElementById('beat-transport-keep').hidden, play: !document.getElementById('beat-transport-play').disabled }; })()""")
    check('Under the pass mark: the control room says so, no Keep, and they can listen back',
          c['shown'] and not c['passed'] and '0%' in c['score'] and not c['keep'] and c['play']
          and 'pass mark' in guide(page), [c, guide(page)])
    page.click('#beat-transport-play')
    page.wait_for_function("bsmash.phase === 'playback'", timeout=5000)
    check('Listen: the take plays back, and Stop is live', not page.is_disabled('#beat-transport-stop'))
    page.click('#beat-transport-stop')
    page.wait_for_timeout(200)
    check('Stop ends the listen-back', state(page)['phase'] == 'verdict')
    take = record_take(page)
    page.wait_for_timeout(400)
    check('The same bars every take: the song is the song', page.evaluate("bsmash.bars.map(b => b.join()).join('|')") == bars_before)
    c = page.evaluate("""[document.getElementById('beat-control').classList.contains('passed'),
                          !document.getElementById('beat-transport-keep').hidden]""")
    check('At the pass mark: the control room glows, Keep appears', c == [True, True] and 'keeper' in guide(page), [c, guide(page)])
    page.click('#beat-transport-play')
    page.wait_for_function("bsmash.phase === 'playback'", timeout=5000)
    back = page.evaluate("""({ booked: bsmashQueue.filter(e => e.tag === 'playback').length,
        start: bsmash.playback.start, band: bsmashBand.start })""")
    check('Listen back: every tap they played, booked over the band, from the same place in the song',
          back['booked'] == len(take['notes']) and round((back['start'] - back['band']) / 2.4) % 4 == round((take['start'] - back['band']) / 2.4) % 4
          and 'Listen back' in guide(page), [back, guide(page)])
    page.click('#beat-transport-stop')
    page.wait_for_timeout(200)
    paging = page.evaluate("""(() => {
        const saved = bsmash.specs;
        bsmash.specs = bsmashRoll(bsmash.musician, 5, 0, null).concat(bsmashRoll(bsmash.musician, 5, 0, null)).slice(0, 16).map(bsmashSpecs);
        bsmashRenderReading();
        const reading = document.getElementById('beat-reading');
        const shown = () => bsmash.page.lines.map((l, i) => l.hidden ? null : [i, Number(l.style.order || 0)]).filter(Boolean);
        const out = { bars: bsmash.specs.length, lines: bsmash.page.lines.length, size: bsmash.page.size, h0: reading.offsetHeight };
        out.before = shown();
        bsmashTurnPage(1); out.turned = shown(); out.h1 = reading.offsetHeight;
        bsmashTurnPage(out.lines - 1); out.end = shown();
        bsmashOpenPage(0); out.review = shown().length;
        bsmash.specs = saved; bsmashRenderReading();
        return out; })()""")
    n, size = paging['lines'], paging['size']
    check('A long take turns its pages a line at a time, without moving the line being read',
          paging['bars'] == 16 and n > size
          and [i for i, _ in paging['before']] == list(range(size))
          and sorted(paging['turned']) == sorted([[i, i % size] for i in range(1, size + 1)])
          and [i for i, _ in paging['end']] == list(range(n - size, n))
          and paging['h0'] == paging['h1'] and paging['review'] == n, paging)
    page.click('#beat-transport-keep')
    page.wait_for_function("(document.querySelector('#view-beat .screen.active') || {}).id === 'beat-screen-picker'", timeout=6000)
    check('Keep it: the part is theirs to choose', screen(page) == 'beat-screen-picker')
    page.wait_for_timeout(200)


def test_picker(page):
    check('The musician is won at once: Tango\'s line, no buttons yet',
          'drummer' in guide(page, 'beat-picker-guide') and not page.is_visible('#beat-picker-cards'),
          guide(page, 'beat-picker-guide'))
    page.wait_for_selector('#beat-picker-cards .bsmash-style-card', timeout=8000)
    check('Three pictures, one per style', page.locator('#beat-picker-cards .bsmash-style-card').count() == 3)
    check('Keep is grey until a part has been heard', page.is_disabled('#beat-picker-keep'))
    page.click('#beat-picker-cards .bsmash-style-card:nth-child(3)')
    page.wait_for_timeout(300)
    check('Tapping a picture plays that part, in time with the band',
          page.evaluate("bsmashBand.parts.drums") == 'hop')
    check('...and Keep lights up', not page.is_disabled('#beat-picker-keep'))
    page.click('#beat-picker-cards .bsmash-style-card:nth-child(1)')
    page.click('#beat-picker-keep')
    page.wait_for_timeout(300)
    rec = record(page)
    check('Keep: Spicy drums locked in', rec['won'] and rec['part'] == 'spicy', rec)
    kept = rec.get('take') or {}
    notes = page.evaluate("bsmashMusicianRecord('drums').studioBars.flat().filter(k => !RSTOMP_VOCABULARY[k].isRest).length")
    check('...and the studio take is kept for My band: every press, its sound, its score',
          kept.get('bars') == 8 and len(kept.get('presses', [])) >= notes > 0 and kept.get('kind') == 'kick'
          and kept.get('score', 0) >= 85 and not rec.get('passedTake'), [notes, len(kept.get('presses', []))] + [kept.get(k) for k in ('bars', 'kind', 'score')])
    stats = rec.get('stats') or {}
    check('Every step\'s takes are counted for the report: one bar to the studio',
          all(str(n) in stats and stats[str(n)]['takes'] >= 1 for n in range(1, 6))
          and stats['5']['passed'] >= 1 and stats['1']['passed'] >= 3, {n: stats.get(n, {}).get('takes') for n in stats})
    check('...Tango says so', 'Spicy drums, locked in' in guide(page, 'beat-picker-guide'), guide(page, 'beat-picker-guide'))
    check('...and the drums channel lights on the desk',
          page.evaluate("document.querySelector('#beat-picker-desk .bsmash-channel').classList.contains('lit')"))
    page.wait_for_selector('#beat-picker-done', state='visible', timeout=6000)
    check('Playback: the band, loud', page.evaluate("bsmashBandBus.gain.value") > 0.8 or
          page.evaluate("bsmashBand.parts.drums") == 'spicy')
    check('...with the drums alone it is where the band starts, not "how much you\'ve built"',
          'drum part' in guide(page, 'beat-picker-guide'), guide(page, 'beat-picker-guide'))
    check('...and it leads straight on: "Next: Riff · Bass"', page.is_visible('#beat-picker-next')
          and page.inner_text('#beat-picker-next').strip().lower() == 'next: riff · bass', page.inner_text('#beat-picker-next'))
    page.click('#beat-picker-done')
    page.wait_for_timeout(500)
    check('Back on the pathway, Tango shows as won', page.evaluate(
        "document.querySelector('#beat-pathway-track [data-id=drums]').classList.contains('cleared')"))
    check('Riff is next, and open now Tango is won', not page.evaluate(
        "document.querySelector('#beat-pathway-track [data-id=bass]').disabled"))
    check('Five squares: the warm-up, the song, then Tango, Riff on bass, Riff on keys', page.evaluate(
        "[...document.querySelectorAll('#beat-pathway-track .pathway-node')].map(n => n.dataset.id).join()") == 'jam,song,drums,bass,keys')
    page.click('#beat-pathway-track [data-id=drums]')
    page.wait_for_timeout(200)
    check('Leaving the studio stops the band', page.evaluate('bsmashBand === null'))
    chips = page.evaluate("[...document.querySelectorAll('#beat-steps .bsmash-chip')].map(c => c.textContent)")
    check('Every step reached can be played again',
          chips == ['One bar', 'Two bars', 'Four bars', 'Eight bars', 'The studio', 'My band'], chips)
    page.click('#beat-steps .bsmash-chip:nth-child(1)')
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.mode === 'steps' && bsmash.take", timeout=10000)
    check('...One bar again, from an empty row of stars, with Tango still won',
          state(page)['step'] == 1 and state(page)['streak'] == 0 and record(page)['won'] and record(page)['step'] == 5)
    play_take(page)
    page.wait_for_timeout(300)
    play_take(page)
    page.wait_for_timeout(600)
    check('...its stars fill as usual, and nothing already won is touched',
          state(page)['streak'] == 2 and record(page)['won'] and record(page)['step'] == 5, (state(page), record(page)))
    page.click('#view-beat .btn-back')
    page.wait_for_timeout(400)
    page.click('#beat-player-chip')
    page.wait_for_timeout(300)
    check('"Playing as" lists every name, to switch or add one', screen(page) == 'beat-screen-player'
          and page.is_visible('#beat-name-input') and page.locator('#beat-player-list button').count() == 1)
    page.fill('#beat-name-input', 'Ruby')
    page.click('#beat-screen-player .btn-start')
    page.wait_for_timeout(200)
    check('A new name must choose its own age', screen(page) == 'beat-screen-player'
          and page.evaluate('bsmashPlayer().name') == 'Ruby' and not page.evaluate('bsmashPlayer().age'))
    page.click('#beat-age-row .bsmash-age:nth-child(2)')
    page.click('#beat-screen-player .btn-start')
    page.wait_for_timeout(400)
    check('...and starts Beat Smash from the pathway, with nothing of the last player\'s',
          screen(page) == 'beat-screen-pathway' and not record(page)['won'] and page.evaluate('bsmashPlayer().age') == '9-10')


def test_wrong_pad(page):
    """On the four beat pads the pad is the beat: pad 1 on beat 3 isn't
    clean, Tango says to follow the beats round, and the right pad lights."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "musicians:{drums:{step:1,streak:1,clean:4,won:false,part:null,plays:3}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-start')
    take = wait_for_take(page)
    page.evaluate("window.flashed = []; const f = bsmash.pads.flash; bsmash.pads.flash = (i, k, ms) => { flashed.push([i, k]); return f(i, k, ms); }; 0")
    play_take(page, wrong_pad=(0,))
    page.wait_for_timeout(300)
    first = page.evaluate("bsmash.take.notes[0].spec.slot")
    check('A note on the wrong pad, in time, is not clean', page.evaluate("bsmash.take.notes[0].wrongPad === true")
          and state(page)['streak'] == 0, state(page))
    check('...Tango says to follow the beats round', 'Follow the beats' in guide(page) or 'Each pad is a beat' in guide(page), guide(page))
    check('...and the pad for that beat lights up', [first, 'demo'] in page.evaluate('flashed'), page.evaluate('flashed'))
    page.evaluate("const p = bsmashLoad(); p.settings.padMode = 'one'; bsmashSave(p)")
    page.click('#view-beat .btn-back')
    page.wait_for_timeout(300)
    page.click('#beat-pathway-start')
    wait_for_take(page)
    check('The one big pad is still there as a setting', page.locator('#beat-pads .krpad').count() == 1)
    play_take(page, use_key=' ')
    page.wait_for_timeout(300)
    check('...and the Space bar plays it, any beat', page.evaluate("bsmash.take.notes.every(n => n.hit && !n.wrongPad)"))


def test_verdict_reasons(page):
    """Playtest 1, 4.1: the verdict names the real reason, the picture marks
    that note, and a press just before a note is that note early, not a tap
    in the rest beside it. With the teacher code on, the take in ms."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "musicians:{drums:{step:1,streak:1,clean:4,won:false,part:null,plays:3}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.phase === 'countin'", timeout=20000)
    page.wait_for_timeout(150)
    ring = page.evaluate("""(() => { const r = document.getElementById('beat-countin');
        const reading = document.getElementById('beat-reading').getBoundingClientRect();
        const box = r.getBoundingClientRect(), pads = document.getElementById('beat-pads').getBoundingClientRect();
        return { shown: !r.hidden, n: r.textContent, clear: box.top >= reading.bottom && box.bottom <= pads.top + 8,
                 pad: document.querySelectorAll('#beat-pads .krpad.countin').length }; })()""")
    check('The count-in: 1 2 3 4 in a red ring in the empty middle, clear of the music, the pad lit red',
          ring['shown'] and ring['n'] in '1234' and ring['clear'] and ring['pad'] == 1, ring)
    page.wait_for_function("bsmash.phase === 'take'", timeout=5000)
    check('...and it goes when the take starts', page.evaluate("document.getElementById('beat-countin').hidden"))
    wait_take_done(page)            # nothing played: take two comes round
    page.wait_for_timeout(300)
    play_take(page, shift={0: -0.26})
    page.wait_for_timeout(300)
    check('A note played a quarter of a beat early: the verdict says EARLY, not "hold" or "rest"',
          'early' in guide(page) and 'Take three' in guide(page)
          and page.evaluate("bsmash.take.notes[0].near && !bsmash.take.rests.some(r => r.tapped)"), guide(page))
    named = page.evaluate("[...document.querySelectorAll('#beat-reading .bsmash-miss.named')].map(m => m.getAttribute('data-why'))")
    check('...and the picture marks that note, saying "early"', named == ['early'], named)
    check('...no milliseconds for a child', page.evaluate("document.getElementById('beat-take-stats').hidden"))
    page.evaluate("localStorage.setItem('koolRiffsOpenAll', '1')")
    # 0.22 s late: past the window (0.215 s here) with the press lag, and
    # well short of half a beat, where the next note is just as near.
    play_take(page, shift={0: 0.22})
    page.wait_for_timeout(300)
    check('Late is late, and the takes count on: "Take four!"', 'late' in guide(page) and 'Take four' in guide(page), guide(page))
    stats = page.inner_text('#beat-take-stats') if page.is_visible('#beat-take-stats') else ''
    check('With the teacher code on, the take note by note in ms', 'Window' in stats and 'outside the window' in stats, stats)
    page.evaluate("localStorage.removeItem('koolRiffsOpenAll')")
    page.wait_for_timeout(2200)
    reasons = page.evaluate("""(() => {
        const saved = bsmash.take, phase = bsmash.phase, scaffold = bsmash.scaffold;
        bsmash.scaffold = 'star3';
        // q qr q q: notes on beats 1, 3, 4; a rest on beat 2.
        const run = times => {
            const take = { start: 100, end: 102.4, bars: 1, win: 0.2, strays: [], presses: [],
                comebackBars: new Set(), mustHit: new Set(), done: false,
                notes: [0, 2, 3].map(s => ({ t: 100 + s * 0.6, end: 100.6 + s * 0.6, bar: 0, index: s, spec: { slot: s, slots: 1 } })),
                rests: [{ t: 100.6, end: 101.2, bar: 0, index: 1, spec: { slot: 1, slots: 1 } }] };
            bsmash.take = take;
            times.forEach(t => bsmashPress({ pad: Math.max(0, Math.round((t - 100) / 0.6)) % 4, time: t, raw: t, touch: false, up: null }));
            return bsmashTakeIssues(take).map(i => i.reason).join() + (take.rests[0].tapped ? '+tapped' : '');
        };
        const out = {
            edge: run([100, 100.95, 101.8]),           // 0.25 before beat 3, inside beat 2's rest
            rest: run([100, 100.75, 101.2, 101.8]),    // the middle of the rest
            late: run([100, 101.45, 101.8]),           // beat 3, a quarter of a beat late
            extra: run([100, 100.1, 101.2, 101.8]),    // beat 1 twice
            first: run([99.74, 101.2, 101.8]),         // beat 1 early, in the count-in
            missed: run([100, 101.8]),
        };
        bsmash.take = saved; bsmash.phase = phase; bsmash.scaffold = scaffold;
        return out;
    })()""")
    check('A press in the last part of a rest, just before a note, is that note early: not a rest tap',
          reasons['edge'] == 'early', reasons)
    check('...one in the middle of the rest is a rest tap; late, one too many, missed: each named',
          reasons['rest'] == 'rest' and reasons['late'] == 'late' and reasons['extra'] == 'extra' and reasons['missed'] == 'missed', reasons)
    check('...and the first note played early, in the count-in, is early too', reasons['first'] == 'early', reasons)


def test_riff_bass(page):
    """Phase 2: Riff on bass. Half notes, held; his own voice; his part."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "musicians:{drums:{step:3,streak:0,clean:12,won:true,part:'spicy',plays:4}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    check('With the drums won, Riff is open on the pathway, and says hello',
          not page.evaluate("document.querySelector('#beat-pathway-track [data-id=bass]').disabled")
          and 'Riff here' in guide(page, 'beat-pathway-guide'), guide(page, 'beat-pathway-guide'))
    sounds = page.evaluate("[...document.querySelectorAll('#beat-settings .bsmash-setting')].map(r => r.textContent)")
    check('...and the sounds are not the student\'s to choose (Rob, playtest 2): no Drum or Bass sound row',
          not any('sound' in r.lower() for r in sounds), sounds)
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.mode === 'steps' && bsmash.bars", timeout=8000)
    check('Riff\'s one-bar step, opening on half notes on 1 and 3',
          page.evaluate("bsmash.musician.id") == 'bass' and page.evaluate("bsmash.bars[0].join(' ')") == 'half-note half-note')
    check('...Riff introduces himself: press, and HOLD', 'HOLD' in guide(page), guide(page))
    check('...over the drums the student won and the song\'s chords, and no bass yet',
          page.evaluate("Object.assign({}, bsmashBand.parts)") == {'drums': 'spicy', 'guide': 'guide:c-1-4-1-5'},
          page.evaluate("Object.assign({}, bsmashBand.parts)"))
    check('...and the pads play the bass', page.evaluate("bsmashSoundKind()") == 'bass-electric')
    take = wait_for_take(page)
    cells = page.evaluate("bsmash.layout[0].blocks.map(b => b.children.length)")
    check('A half note is two squares joined', cells == [2, 2], cells)
    # Let go of the first half note at once: it sounds short, and isn't clean.
    play_take(page, let_go=(0,))
    page.wait_for_timeout(200)
    filled = page.evaluate("bsmash.layout[0].blocks.map(b => [...b.children].map(c => c.classList.contains('filled')))")
    check('Let go too early: the block is only half filled', filled[0] == [True, False] and filled[1] == [True, True], filled)
    check('...and it\'s take two, in Riff\'s words', page.evaluate("bsmash.take.notes[0].short")
          and 'Hold those long notes' in guide(page), guide(page))
    play_take(page)
    page.wait_for_timeout(300)
    check('Held right through: a clean take, and the first star at once', state(page)['streak'] == 1, state(page))
    page.wait_for_function("bsmash.phase === 'reveal'", timeout=8000)
    check('...then Riff\'s reveal', 'read it' in guide(page), guide(page))
    play_take(page)
    page.wait_for_timeout(600)
    check('...then from the notation, held: the second star', state(page)['streak'] == 2, state(page))
    # The studio, and the part.
    # The studio (eight bars, to keep the test short): one take at the pass mark wins the part.
    page.evaluate("const p = bsmashLoad(); p.settings.studioBars = 8; bsmashSave(p);"
                  "bsmashUpdateMusician('bass', { step: 5, streak: 0 }); startBeatMusician('bass', false, 5)")
    page.wait_for_function("bsmash.phase === 'ready'", timeout=15000)
    halves = page.evaluate("bsmash.bars.some(bar => bar.indexOf('half-note') !== -1 || bar.indexOf('half-rest') !== -1)")
    bars = page.evaluate("bsmash.bars.map(b => b.join(' '))")
    page.click('#beat-transport-record')
    play_take(page)
    page.wait_for_selector('#beat-transport-keep', state='visible', timeout=6000)
    page.click('#beat-transport-keep')
    page.wait_for_function("(document.querySelector('#view-beat .screen.active') || {}).id === 'beat-screen-picker'", timeout=6000)
    check('The studio take lands: Riff says "That gives me a great idea!"',
          'great idea' in guide(page, 'beat-picker-guide'), [guide(page, 'beat-picker-guide'), bars, halves])
    page.wait_for_selector('#beat-picker-cards .bsmash-style-card', timeout=8000)
    check('Riff\'s picker: his title, three bass lines', page.inner_text('#beat-picker-title') == "Riff's bass"
          and page.locator('#beat-picker-cards .bsmash-style-card').count() == 3, page.inner_text('#beat-picker-title'))
    page.click('#beat-picker-cards .bsmash-style-card:nth-child(2)')
    page.wait_for_timeout(300)
    parts = page.evaluate("Object.assign({}, bsmashBand.parts)")
    check('Tapping one plays that bass line with the drums already won, over the song',
          parts == {'drums': 'spicy', 'bass': 'band:c-1-4-1-5:smooth', 'guide': 'guide:c-1-4-1-5'}, parts)
    check('...in Riff\'s words', 'Smooth' in guide(page, 'beat-picker-guide'), guide(page, 'beat-picker-guide'))
    page.click('#beat-picker-keep')
    page.wait_for_timeout(300)
    rec = record(page, 'bass')
    check('Keep: Smooth bass locked in, and the bass channel lights',
          rec['won'] and rec['part'] == 'smooth' and 'bass, locked in' in guide(page, 'beat-picker-guide')
          and page.evaluate("document.querySelectorAll('#beat-picker-desk .bsmash-channel.lit').length") == 2, rec)
    page.wait_for_selector('#beat-picker-done', state='visible', timeout=6000)
    check('Two parts: the whole band so far (in Riff\'s words), and next, the keys',
          'Listen to your band' in guide(page, 'beat-picker-guide') and page.inner_text('#beat-picker-next').strip().lower() == 'next: riff · keys',
          [guide(page, 'beat-picker-guide'), page.inner_text('#beat-picker-next')])
    page.click('#beat-picker-done')
    page.wait_for_timeout(500)
    check('Back on the pathway: Riff won on bass, and the keys open next',
          page.evaluate("document.querySelector('#beat-pathway-track [data-id=bass]').classList.contains('cleared')")
          and not page.evaluate("document.querySelector('#beat-pathway-track [data-id=keys]').disabled")
          and 'keys' in guide(page, 'beat-pathway-guide'), guide(page, 'beat-pathway-guide'))


def test_riff_keys(page):
    """Riff on keys: whole notes, held all four beats; then the full band."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "musicians:{drums:{step:3,streak:0,clean:12,won:true,part:'spicy',plays:4},"
                "bass:{step:3,streak:0,clean:12,won:true,part:'smooth',plays:4}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.mode === 'steps' && bsmash.bars", timeout=8000)
    check('Riff\'s keys step opens on the whole note',
          page.evaluate("bsmash.musician.id") == 'keys' and page.evaluate("bsmash.bars[0].join(' ')") == 'whole-note')
    check('...his intro: let it ring for all four beats', 'all four beats' in guide(page), guide(page))
    check('...over the drums and bass already won, on the Rhodes',
          page.evaluate("Object.assign({}, bsmashBand.parts)") == {'drums': 'spicy', 'bass': 'band:c-1-4-1-5:smooth', 'guide': 'guide:c-1-4-1-5'}
          and page.evaluate("bsmashSoundKind()") == 'rhodes', page.evaluate("Object.assign({}, bsmashBand.parts)"))
    wait_for_take(page)
    check('A whole note is four squares joined', page.evaluate("bsmash.layout[0].blocks[0].children.length") == 4)
    play_take(page)
    page.wait_for_timeout(300)
    check('Held all four beats: a clean take, and the first star', state(page)['streak'] == 1, state(page))
    page.wait_for_function("bsmash.phase === 'reveal'", timeout=8000)
    play_take(page)
    page.wait_for_timeout(600)
    check('...and from the notation, the second', state(page)['streak'] == 2, state(page))
    page.evaluate("const p = bsmashLoad(); p.settings.studioBars = 8; bsmashSave(p);"
                  "bsmashUpdateMusician('keys', { step: 5, streak: 0 }); startBeatMusician('keys', false, 5)")
    page.wait_for_function("bsmash.phase === 'ready'", timeout=15000)
    page.click('#beat-transport-record')
    play_take(page)
    page.wait_for_selector('#beat-transport-keep', state='visible', timeout=6000)
    page.click('#beat-transport-keep')
    page.wait_for_function("(document.querySelector('#view-beat .screen.active') || {}).id === 'beat-screen-picker'", timeout=6000)
    check('The studio take lands: Riff has an idea for the keys', 'idea for the keys' in guide(page, 'beat-picker-guide'),
          guide(page, 'beat-picker-guide'))
    page.wait_for_selector('#beat-picker-cards .bsmash-style-card', timeout=8000)
    page.click('#beat-picker-cards .bsmash-style-card:nth-child(3)')
    page.wait_for_timeout(300)
    page.click('#beat-picker-keep')
    page.wait_for_timeout(300)
    check('Keep: the full band, three channels lit',
          record(page, 'keys')['won'] and 'full band' in guide(page, 'beat-picker-guide')
          and page.evaluate("document.querySelectorAll('#beat-picker-desk .bsmash-channel.lit').length") == 3,
          guide(page, 'beat-picker-guide'))
    page.wait_for_selector('#beat-picker-done', state='visible', timeout=6000)
    check('The band is complete: the L plates are earned, and Next shows them',
          page.evaluate('!!bsmashLoad().permit') and page.inner_text('#beat-picker-next').strip().lower() == 'show my permit',
          page.inner_text('#beat-picker-next'))
    page.click('#beat-picker-next')
    page.wait_for_function("(document.querySelector('#view-beat .screen.active') || {}).id === 'beat-screen-permit'", timeout=6000)
    card = page.inner_text('#beat-permit-card')
    check('The Learner\'s Permit: L plates, their name, their band',
          'L' in card and 'Sam' in card and 'Drums: Spicy' in card and 'Bass: Smooth' in card and 'Keys: Hop' in card, card)
    check('...presented by Tango', 'Learner\'s Permit' in guide(page, 'beat-permit-guide'), guide(page, 'beat-permit-guide'))
    page.click('#beat-screen-permit .btn-secondary')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-track [data-id=keys]')
    page.wait_for_timeout(200)
    chips = page.evaluate("[...document.querySelectorAll('#beat-steps .bsmash-chip')].map(c => c.textContent)")
    check('Back on the pathway: the warm-up, the song and three musicians, no booth, and the Permit can be seen again',
          page.locator('#beat-pathway-track .pathway-node').count() == 5 and 'My Permit' in chips, chips)


def test_picker_leave(page):
    """Leaving the picker without Keep never loses the musician."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "musicians:{drums:{step:5,streak:0,clean:9,won:false,part:null,plays:1}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    check('A returning player lands on the pathway', screen(page) == 'beat-screen-pathway')
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=10000)
    page.evaluate("bsmashOpenPicker(false)")
    page.wait_for_selector('#beat-picker-cards .bsmash-style-card', timeout=6000)
    page.click('#beat-picker-cards .bsmash-style-card:nth-child(2)')
    page.click('#view-beat .btn-back')
    page.wait_for_timeout(300)
    rec = record(page)
    check('Leaving without Keep keeps the part last heard', rec['won'] and rec['part'] == 'smooth', rec)


def test_studio_layout(browser):
    """The studio, 32 bars: the transport on screen, and during the take the
    pad on screen and below the music, on a phone, a small phone and a
    Chromebook."""
    for size in ({'width': 390, 'height': 844}, {'width': 360, 'height': 640}, {'width': 1366, 'height': 657}):
        page = new_page(browser, size)
        fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                    "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                    "musicians:{drums:{step:5,streak:0,clean:20,won:false,part:null,plays:3}}}}}));")
        page.click('.game-card.red')
        page.wait_for_timeout(300)
        page.click('#beat-pathway-start')
        page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=15000)
        ready = page.evaluate("document.getElementById('beat-transport').getBoundingClientRect().bottom <= innerHeight")
        page.click('#beat-transport-record')
        page.wait_for_function("bsmash.take && !bsmash.take.done", timeout=8000)
        m = page.evaluate("""(() => { const pads = document.getElementById('beat-pads').getBoundingClientRect();
            const read = document.getElementById('beat-reading').getBoundingClientRect();
            return { bars: bsmash.specs.length, padsBottom: pads.bottom, padsTop: pads.top, readBottom: read.bottom, h: innerHeight,
                     wide: document.documentElement.scrollWidth > innerWidth }; })()""")
        name = '%dx%d, the studio (%d bars)' % (size['width'], size['height'], m['bars'])
        check(name + ': the transport is on screen', ready)
        check(name + ': during the take, the pad is on screen and below the music',
              m['bars'] == 32 and m['padsBottom'] <= m['h'] + 1 and m['padsTop'] >= m['readBottom'] and not m['wide'], m)
        page.close()


def test_layout(browser):
    """Eight bars and the one-bar step, on the four beat pads, on a phone, a
    small phone and a Chromebook."""
    for size in ({'width': 390, 'height': 844}, {'width': 360, 'height': 640}, {'width': 1366, 'height': 657}):
        for step in (4, 1):
            page = new_page(browser, size)
            fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                        "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                        "musicians:{drums:{step:%d,streak:0,clean:9,won:false,part:null,plays:1}}}}}));" % step)
            page.click('.game-card.red')
            page.wait_for_timeout(300)
            page.click('#beat-pathway-start')
            page.wait_for_function("bsmash && (bsmash.phase === 'ready' || bsmash.phase === 'wait')", timeout=10000)
            page.wait_for_timeout(300)
            m = page.evaluate("""(() => {
                const r = el => el.getBoundingClientRect();
                const pads = [...document.querySelectorAll('#beat-pads .krpad')].map(r);
                const papers = [...document.querySelectorAll('#beat-reading .bsmash-paper')].map(r);
                const record = document.getElementById('beat-transport-record');
                const above = papers.map(p => p.bottom).concat(record.offsetParent ? [r(record).bottom] : []);
                const buttons = [...document.querySelectorAll('#beat-screen-studio button')]
                    .filter(b => b.offsetParent !== null).map(b => r(b).height);
                return { pads: pads.length,
                         wide: document.documentElement.scrollWidth > window.innerWidth
                               || Math.max(...pads.map(p => p.right)) > window.innerWidth
                               || Math.max(...papers.map(p => p.right)) > window.innerWidth,
                         overlap: Math.max(...above) > Math.min(...pads.map(p => p.top)),
                         offscreen: Math.max(...pads.map(p => p.bottom)) > window.innerHeight + 1,
                         smallest: Math.round(Math.min(...buttons)) };
            })()""")
            name = '%dx%d, %s' % (size['width'], size['height'], 'four pads' if step == 1 else 'eight bars')
            check(name + ': nothing off the side of the screen', not m['wide'], m)
            check(name + ': the pads never cover the notation', not m['overlap'], m)
            check(name + ': the pads are on screen', not m['offscreen'], m)
            check(name + ': every button at least 56 px', m['smallest'] >= 56, m['smallest'])
            page.close()


def test_songs(page):
    """Rob's songs (content/songs.js): voicings as dictated, transposition,
    the pump rhythms and their anticipations, and a level that doesn't clip."""
    fresh(page)
    c = page.evaluate("BeatSmashBand.song('c-6dim').bars.map(b => [b.bass].concat(b.keys))")
    check('C as Rob dictated: C6 G A C E, the outside voices down (F# A C Eb), down again (F A C D), F dim over G',
          c == [[48, 67, 69, 72, 76], [51, 66, 69, 72, 75], [50, 65, 69, 72, 74], [43, 65, 68, 71, 74]], c)
    ab = page.evaluate("BeatSmashBand.song('ab-6dim').bars.map(b => [b.bass].concat(b.keys))")
    check('A flat is the same song down a major third', ab == [[n - 4 for n in bar] for bar in c], ab)
    names = page.evaluate("BeatSmashBand.song('ab-6dim').bars.map(b => b.chord)")
    check('...with its own chord names', names == ['A♭6', 'C♭°7', 'B♭m7', 'E♭7(♭9)'], names)
    pumps = page.evaluate("""KR.songs['c-6dim'].comp.pumps.map((r, i) => {
        const h = BeatSmashBand.songHits('c-6dim', 'pumps#' + i);
        return { total: h.reduce((a, x) => a + x.beats, 0),
                 early: h.filter(x => x.chord !== Math.floor(x.start / 4)).length,
                 grid: h.every(x => Math.abs(x.start * 4 - Math.round(x.start * 4)) < 1e-9) };
    })""")
    check('Every pump rhythm fills the four bars exactly, on the grid',
          all(p['total'] == 16 and p['grid'] for p in pumps), pumps)
    check('Most anticipate the next chord across a barline', sum(1 for p in pumps if p['early']) >= 4, pumps)
    hits = page.evaluate("BeatSmashBand.songHits('c-6dim', 'pumps#0').map(h => [h.start, h.chord])")
    check('A pump held over the barline plays the NEXT bar\'s chord (beat 4 +, into bar 2)',
          [3.5, 1] in hits and [1.5, 0] in hits, hits)
    picks = page.evaluate("""(() => {
        const seen = new Set(); let last = null, repeats = 0;
        for (let i = 0; i < 60; i++) {
            BeatSmashBand.songHits('c-6dim', 'pumps', last);
            const p = BeatSmashBand.lastPick(); if (p === last) repeats++; last = p; seen.add(p);
        }
        return { seen: seen.size, repeats };
    })()""")
    check('Loose: a different pump rhythm each time round, never the same twice running',
          picks['seen'] >= 5 and picks['repeats'] == 0, picks)
    whole = page.evaluate("BeatSmashBand.songHits('ab-6dim', 'whole').map(h => [h.start, h.chord])")
    check('Whole notes: one chord a bar', whole == [[0, 0], [4, 1], [8, 2], [12, 3]], whole)
    bass = page.evaluate("""Object.fromEntries(BeatSmashBand.BASS_STYLES.map(st =>
        [st, BeatSmashBand.bassLine('c-6dim', st).map(h => [h.start, h.beats, h.midi])]))""")
    check('The bass has its own styles: whole, halves, pump, walk, tumbao',
          sorted(bass.keys()) == ['halves', 'pump', 'tumbao', 'walk', 'whole'], list(bass.keys()))
    check('Halves: root on 1, the chord\'s own fifth on 3 (the diminished fifth, A, over E flat)',
          bass['halves'][:4] == [[0, 2, 48], [2, 2, 55], [4, 2, 51], [6, 2, 57]], bass['halves'][:4])
    check('Pump: the only pump a bass plays, dotted quarter and eighth',
          [h[1] for h in bass['pump']] == [1.5, 0.5] * 8, [h[1] for h in bass['pump']])
    walk = bass['walk']
    roots = [48, 51, 50, 43]
    steps = [(walk[4 * b + 3][2] - roots[(b + 1) % 4]) % 12 for b in range(4)]
    check('Walk: four quarters a bar, root on 1, a half step into the next root on 4',
          all(h[1] == 1 for h in walk) and [walk[4 * b][2] % 12 for b in range(4)] == [r % 12 for r in roots]
          and all(st in (1, 11) for st in steps), (walk, steps))
    check('...and it stays in the bass', all(36 <= h[2] <= 57 for h in walk), [h[2] for h in walk])
    tumbao = bass['tumbao']
    check('Tumbao: beat 1 silent, the and of 2, then 4 held over the barline with the next chord\'s root',
          all(h[0] % 4 in (1.5, 3) for h in tumbao) and all(h[0] + h[1] > (h[0] // 4 + 1) * 4 for h in tumbao if h[0] % 4 == 3)
          and tumbao[1][2] % 12 == 51 % 12, tumbao)
    # Two chords in a bar, and a song shorter than four bars.
    bb = page.evaluate("BeatSmashBand.song('bb-rhythm-changes')")
    check('Rob\'s B flat: ||: Bb6 G-7 | C-7 F7 :||, two beats each, round twice to fill four bars',
          [[c['start'], c['beats'], c['chord']] for c in bb['changes']]
          == [[2 * i, 2, n] for i, n in enumerate(['B♭6', 'G–7', 'C–7', 'F7'] * 2)]
          and [b['chord'] for b in bb['bars']] == ['B♭6 G–7', 'C–7 F7'] * 2, bb['changes'])
    check('...as voiced: the D on top held all the way through',
          [[c['bass']] + c['keys'] for c in bb['changes'][:4]]
          == [[46, 65, 67, 70, 74], [43, 65, 69, 70, 74], [48, 63, 67, 70, 74], [41, 63, 67, 69, 74]], bb['changes'][:4])
    dm = page.evaluate("BeatSmashBand.song('d-minor-two-five').changes.map(c => [c.start, c.beats, c.chord, c.bass].concat(c.keys))")
    check('Rob\'s D minor: Dm6 for a bar, then Em7b5 and A7alt two beats each, every voice by a half step or held',
          dm[:3] == [[0, 4, 'D–6', 50, 65, 69, 71, 74], [4, 2, 'E–7(♭5)', 52, 64, 67, 70, 74], [6, 2, 'A7alt', 45, 65, 67, 70, 73]], dm)
    rule = page.evaluate("""(() => {
        const bad = [];
        for (const id of Object.keys(KR.songs)) {
            const song = BeatSmashBand.song(id);
            const comps = ['whole'].concat(song.comp.pumps.map((r, i) => 'pumps#' + i));
            for (const comp of comps) for (const h of BeatSmashBand.songHits(id, comp)) {
                const c = song.changes[h.chord], end = h.start + h.beats;
                const early = c.start - h.start;
                if (early > 1 + 1e-9 || h.start >= c.start + c.beats - 1e-9 || end > c.start + c.beats + 1e-9)
                    bad.push([id, comp, h.start, h.beats, h.chord]);
            }
        }
        return bad;
    })()""")
    check('Every keys hit plays the chord under it, or the next one if struck in the beat before it - never over the wrong bass',
          rule == [], rule[:5])
    mid = page.evaluate("BeatSmashBand.songHits('bb-rhythm-changes', 'pumps#2').map(h => [h.start, h.beats, h.chord])")
    check('The anticipation works in the middle of a bar too: the pump on beat 2 held over beat 3 plays the G-7',
          [1, 1.5, 1] in mid, mid)
    split = page.evaluate("BeatSmashBand.songHits('bb-rhythm-changes', 'pumps#3').map(h => [h.start, h.beats, h.chord, !!h.restrike])")
    check('...and a long note struck well before a change is struck again at the change, with the new chord',
          split[:2] == [[0, 2, 0, False], [2, 1, 1, True]], split)
    whole = page.evaluate("BeatSmashBand.songHits('d-minor-two-five', 'whole').map(h => [h.start, h.beats, h.chord])")
    check('Whole notes: one chord struck for each chord, however long it lasts',
          whole == [[0, 4, 0], [4, 2, 1], [6, 2, 2], [8, 4, 3], [12, 2, 4], [14, 2, 5]], whole)
    walk2 = page.evaluate("""(() => { const s = BeatSmashBand.song('bb-rhythm-changes');
        return { changes: s.changes.map(c => c.bass), walk: BeatSmashBand.bassLine('bb-rhythm-changes', 'walk').map(h => [h.start, h.beats, h.midi]) }; })()""")
    w, roots = walk2['walk'], walk2['changes']
    check('A walk over two-beat chords: the root, then a half step into the next root',
          len(w) == 16 and all(w[2 * i][2] % 12 == roots[i] % 12 and (w[2 * i + 1][2] - roots[(i + 1) % 8]) % 12 in (1, 11)
                                for i in range(8)), w)
    tb = page.evaluate("BeatSmashBand.bassLine('bb-rhythm-changes', 'tumbao').map(h => [h.start, h.midi])")
    check('The fifth is a real fifth when the voicing leaves it out: the tumbao plays C for the F13',
          [5.5, 48] in tb, tb)
    peak = page.evaluate("""(async () => {
        const B = BeatSmashBand;
        let loudest = 0;
        for (const song of Object.keys(KR.songs)) for (const [i, comp] of ['whole'].concat(BeatSmashBand.song(song).comp.pumps.map((r, i) => 'pumps#' + i)).entries()) {
            const ctx = new OfflineAudioContext(1, 32000 * B.LOOP, 32000);
            const live = ctx.createGain(); live.gain.value = BSMASH_LIVE_SCALE; live.connect(ctx.destination);
            B.schedulePart(ctx, live, 'warmup', 'tango', 0);
            B.schedulePart(ctx, live, 'bass', 'song:' + song + ':' + B.BASS_STYLES[i % B.BASS_STYLES.length], 0);
            B.schedulePart(ctx, live, 'keys', 'song:' + song + ':' + comp, 0);
            const d = (await ctx.startRendering()).getChannelData(0);
            for (const x of d) loudest = Math.max(loudest, Math.abs(x));
        }
        return loudest;
    })()""")
    check('Every song, drums + bass + keys, stays clear of clipping', peak < 0.9, round(peak, 3))


def test_song_jam(page):
    """The warm-up jam over one of Rob's songs: whole notes, then his pump;
    the band sags when the beat is lost and stops when the student stops."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,settings:{jamSong:'c-2-5-1-6'},"
                "musicians:{drums:{step:1,streak:0,clean:0,won:false,part:null,plays:1}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    songs = page.evaluate("[...document.querySelectorAll('#beat-settings .bsmash-setting')].map(r => r.textContent)")
    check('The pathway offers a jam song', any('Jam song' in r and 'Night Owl' in r for r in songs), songs)
    menu = page.evaluate("[...document.querySelectorAll('#beat-settings .bsmash-setting')].filter(r => r.textContent.includes('Jam song'))"
                         ".map(r => [...r.querySelectorAll('.bsmash-chip')].map(c => c.textContent))[0]")
    check('The jam songs are the progressions, by their names: the C loops first, Rob\'s six off the menu',
          menu == ['Sunrise', 'Lemonade', 'Skate Park', 'Moonwalk', 'Night Owl', 'Bubblegum', 'Rollercoaster'], menu)
    page.click('#beat-pathway-track [data-id=jam]')
    page.click('#beat-pathway-start')
    page.wait_for_timeout(600)
    page.evaluate('[1, 1, 1, 2].forEach((bars, i) => { BSMASH_JAM_BUILD[i].bars = bars; })')
    offset = clock_offset(page)
    start = page.evaluate('bsmashBand.start')
    bar = int((page.evaluate('raudioCtx.currentTime') - start) / 2.4) + 1
    beat = bar * 4
    parts = {}
    for k in range(40):
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
        now = page.evaluate('Object.assign({}, bsmashBand.parts)')
        for instrument in ('bass', 'keys'):
            if instrument in now and instrument not in parts:
                parts[instrument] = now[instrument]
        if page.evaluate('bsmash.jam.full'):
            break
    beat += k + 1
    check('Over the jam song the bass joins in whole notes', parts.get('bass') == 'song:c-2-5-1-6:whole', parts)
    check('...then the keys, the song\'s voicings in whole notes', parts.get('keys') == 'song:c-2-5-1-6:whole', parts)
    full = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('...and a full meter brings his pumps on the keys and the song\'s groove on the bass',
          full.get('keys') == 'song:c-2-5-1-6:pumps' and full.get('bass') == 'song:c-2-5-1-6:groove', full)
    # Lose the beat: taps half a beat out.
    for k in range(4):
        press_at(page, None, start + (beat + k) * 0.6 + 0.34, index=k % 4)
    page.wait_for_timeout(600)
    sag = page.evaluate('[bsmash.jam.sag, bsmashSagFilter.frequency.value]')
    check('Losing the beat: the band sinks (muffled and quieter), cleanly, not in steps', sag[0] > 0.3 and sag[1] < 8000, sag)
    beat += 4
    for k in range(5):
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
    page.wait_for_timeout(900)
    back = page.evaluate('[bsmash.jam.sag, bsmashSagFilter.frequency.value]')
    check('...and pushing the beat back brings its power back', back[0] == 0 and back[1] > sag[1] * 4, back)
    # Stop tapping: after two bars the band stops, and the way on is there.
    page.wait_for_function('bsmash.jam.stopped', timeout=9000)
    page.wait_for_timeout(300)
    check('Stop playing and the band stops too', page.evaluate('bsmash.jam.stopped'))
    check('...Tango says so, and the menu is right there',
          'band stopped' in guide(page) and page.is_visible('#beat-jam-nav'), guide(page))
    page.click('#beat-jam-nav .btn-start')
    page.wait_for_timeout(300)
    check('"Keep jamming" brings the band back, in time', not page.evaluate('bsmash.jam.stopped')
          and page.is_hidden('#beat-jam-nav') and page.evaluate('bsmashBand !== null'))
    page.wait_for_function('bsmash.jam.stopped', timeout=9000)
    offset = clock_offset(page)
    now = page.evaluate('raudioCtx.currentTime')
    press_at(page, offset, now + 0.3, index=0)
    page.wait_for_timeout(200)
    check('...and so does just tapping a pad', not page.evaluate('bsmash.jam.stopped'))
    page.wait_for_function('bsmash.jam.stopped', timeout=9000)
    page.click('#beat-jam-nav .btn-secondary')
    page.wait_for_timeout(400)
    check('The menu button goes to the Beat Smash menu, and the band stops', screen(page) == 'beat-screen-pathway'
          and page.evaluate('bsmashBand === null'))


def test_jam_variations(page):
    """The jam keeps moving: every four times round with the beat held, the
    drums fill and the band turns to the song's next line of directions."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,settings:{jamSong:'bb-rhythm-changes'},"
                "musicians:{drums:{step:1,streak:0,clean:0,won:false,part:null,plays:1}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-track [data-id=jam]')
    page.click('#beat-pathway-start')
    page.wait_for_timeout(600)
    page.evaluate('[1, 1, 1, 2].forEach((bars, i) => { BSMASH_JAM_BUILD[i].bars = bars; })')
    lines = page.evaluate("bsmash.jam.variations")
    check('The song\'s own directions become the variations: drums, bass, keys, or out',
          lines[0] == {'parts': {'drums': 'smooth'}, 'say': None}
          and lines[1]['parts'] == {'bass': 'song:bb-rhythm-changes:pump', 'keys': 'song:bb-rhythm-changes:pumps#3'}
          and lines[2] == {'parts': {'drums': None}, 'say': 'beat.jam.drop'}, lines[:3])
    check('No dots until the groove is going', page.is_hidden('#beat-jam-coming'))
    start = page.evaluate('bsmashBand.start')
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 2
    k = 0
    while not page.evaluate('bsmash.jam.full') and k < 40:
        press_at(page, None, start + (beat + k) * 0.6 + 0.04, index=k % 4)
        k += 1
    beat += k
    check('The meter fills and the dots appear', page.is_visible('#beat-jam-coming'))
    # Three times round already held (rather than 30 seconds more of tapping
    # here): the fourth, played for real, brings the change.
    page.evaluate('bsmash.jam.rounds = BSMASH_JAM_VARIATION_EVERY - 1; bsmashJamComing()')
    lit = page.evaluate("document.querySelectorAll('#beat-jam-coming .lit').length")
    check('A dot for each time round with the beat held', lit == 3, lit)
    pending, landed, fill = None, None, None
    for n in range(40):
        press_at(page, None, start + (beat + n) * 0.6 + 0.04, index=n % 4)
        info = page.evaluate("""({ pending: bsmashBand.pending && bsmashBand.pending.at, parts: Object.assign({}, bsmashBand.parts),
                                    next: bsmashBand.next, said: document.querySelector('#beat-studio-guide .kr-guide-text').textContent })""")
        if info['pending'] and pending is None:
            pending = info['pending']
            fill = info['said']
            before = info['parts']
        if pending and info['parts'].get('drums') == 'smooth':
            landed = info
            break
    check('Four times round with the beat held: a fill, and the change is booked for the top of the loop',
          pending is not None and abs(((pending - start) / 9.6) - round((pending - start) / 9.6)) < 1e-6, [pending, start])
    check('...Tango says something is coming', fill and ('new' in fill or 'changing' in fill or 'beat' in fill), fill)
    check('...and the band changes there, just the instruments the line names',
          landed is not None and before.get('drums') == 'warmup' and landed['parts']['drums'] == 'smooth'
          and landed['parts']['bass'] == before['bass'] and landed['parts']['keys'] == before['keys'], [before, landed])
    check('...then the dots start again', page.evaluate("document.querySelectorAll('#beat-jam-coming .lit').length") == 0)
    # A time round with the band sagging, or too few taps, doesn't count.
    held = page.evaluate("""(() => {
        const jam = bsmash.jam, bar = 4 * 999 + 3, before = jam.rounds;
        jam.cycleTaps[999] = 12; jam.sag = 0.5; bsmashJamRound(bar);
        const sagging = jam.rounds - before;
        jam.sag = 0; jam.cycleTaps[999] = 3; bsmashJamRound(bar);
        const few = jam.rounds - before;
        jam.cycleTaps[999] = 9; bsmashJamRound(bar);
        return [sagging, few, jam.rounds - before];
    })()""")
    check('Only a time round with the beat held counts; a wobble loses nothing', held == [0, 0, 1], held)
    page.evaluate('bsmash.jam.rounds = 0; bsmash.jam.variation = 2; bsmashJamVariation(bsmashBand.start); bsmashBand.pending.apply()')
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('\'off\' drops an instrument out: with the drums out, the student is the drummer',
          'drums' not in parts and 'bass' in parts and 'keys' in parts, parts)
    page.click('#beat-jam-next')
    page.wait_for_timeout(500)
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('"Show me what I played": back to Tango alone, whatever the variations did',
          parts == {'drums': 'warmup'} and page.evaluate('bsmashBand.pending === null') and page.is_hidden('#beat-jam-coming'), parts)
    loops = page.evaluate("""(() => { const out = []; const ctx = new OfflineAudioContext(1, 32000 * 5, 32000);
        const live = ctx.createGain(); live.gain.value = BSMASH_LIVE_SCALE; live.connect(ctx.destination);
        BeatSmashBand.fill(ctx, live, 0); return ctx.startRendering().then(b => {
            const d = b.getChannelData(0); let peak = 0, early = 0;
            for (let i = 0; i < d.length; i++) { peak = Math.max(peak, Math.abs(d[i])); if (i < 32000 * 1.15) early = Math.max(early, Math.abs(d[i])); }
            return [peak, early]; }); })()""")
    check('The fill is silent for the first half of its bar, then builds, and stays clear of clipping',
          loops[1] < 0.001 and 0.2 < loops[0] < 0.9, loops)


def test_song_choice(page):
    """Rob, 2026-10-02: after the warm-up the student auditions the songs
    (plain piano chords over a click), holds one and slides it up into the
    Add box, and the whole band is built over it. A new song is a new band."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(500)
    nodes = page.evaluate("[...document.querySelectorAll('#beat-pathway-track .pathway-node')].map(n => n.dataset.id + (n.disabled ? '-' : '+')).join()")
    check('The pathway: warm-up, the song, then the musicians, locked until a song is chosen',
          nodes == 'jam+,song+,drums-,bass-,keys-' and page.evaluate('bsmashSelected') == 'song', nodes)
    page.click('#beat-pathway-start')
    page.wait_for_timeout(500)
    names = page.evaluate("[...document.querySelectorAll('#beat-song-cards .bsmash-song-card')].map(c => c.textContent)")
    check('Seven songs to choose from, by name, and a click running', len(names) == 7 and 'Sunrise' in names[0]
          and page.evaluate('JSON.stringify(bsmashBand.parts)') == '{"click":"click"}', names)
    page.click('.bsmash-song-card[data-song="c-2-5-1"]')
    page.wait_for_timeout(200)
    check('A tap plays that song in plain piano chords, and offers to add it',
          page.evaluate('bsmashBand.parts.guide') == 'guide:c-2-5-1' and page.is_visible('#beat-song-add')
          and 'moonwalk' in page.inner_text('#beat-song-add').lower(), page.evaluate('JSON.stringify(bsmashBand.parts)'))
    check('...and nothing is chosen by a tap', page.evaluate('bsmashLoad().song') is None)
    page.click('.bsmash-song-card[data-song="c-1-4-1-5"]')
    page.wait_for_timeout(200)
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('A song with an audition (Sunrise) plays its four-bar tune, a drum part and a bass line over the chords',
          parts == {'click': 'click', 'guide': 'guide:c-1-4-1-5', 'phrase': 'phrase:c-1-4-1-5', 'drums': 'smooth',
                    'bass': 'song:c-1-4-1-5:halves'}, parts)
    page.click('.bsmash-song-card[data-song="c-2-5-1"]')
    page.wait_for_timeout(200)
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('...and a song without one takes them away again', parts == {'click': 'click', 'guide': 'guide:c-2-5-1'}, parts)
    check('Tango says the songs are the shape of things to come, to finish off', 'shape of things to come' in guide(page, 'beat-song-guide'),
          guide(page, 'beat-song-guide'))
    # Hold Bubblegum, slide it up into the box.
    lit = drag_into(page, '.bsmash-song-card[data-song="c-1-6-2-5"]', '#beat-song-drop')
    check('Hold a song and the Add box appears; slide it up and drop it in: that is the song',
          lit and page.evaluate('bsmashLoad().song') == 'c-1-6-2-5' and 'Bubblegum' in guide(page, 'beat-song-guide'),
          [lit, page.evaluate('bsmashLoad().song')])
    page.wait_for_function("bsmash && bsmash.mode === 'steps'", timeout=8000)
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('...and straight into Tango\'s steps, over the song\'s chords', parts == {'drums': 'warmup', 'guide': 'guide:c-1-6-2-5'}, parts)
    chords = page.evaluate("[0, 1, 2, 3].map(b => bsmashChordAt(bsmashBand.start + b * BSMASH_BAR + 0.3).bass)")
    check('The pads play the song\'s chord for each bar: Cmaj9, Am7, Dm7, G7', chords == [36, 45, 38, 43], chords)
    # A band won over the song: its parts follow the song's chords.
    page.evaluate("""const p = bsmashLoad();
        p.musicians.drums = { step: 5, streak: 0, clean: 9, won: true, part: 'hop', plays: 3 };
        p.musicians.bass = { step: 5, streak: 0, clean: 9, won: true, part: 'spicy', plays: 3 };
        bsmashSave(p); startBeatMusician('keys', false, 1);""")
    page.wait_for_timeout(400)
    parts = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('The band won so far plays over the song: the bass follows its chords, the guide piano holds them',
          parts == {'drums': 'hop', 'bass': 'band:c-1-6-2-5:spicy', 'guide': 'guide:c-1-6-2-5'}, parts)
    # My songs: every song keeps its own band, and switching loses nothing.
    page.evaluate('showBeatPathway()')
    check('The song square shows the song chosen', 'Bubblegum' in page.inner_text('#beat-pathway-track [data-id=song]'))
    page.evaluate('showBeatSongs()')
    page.wait_for_timeout(300)
    check('Back at the songs: ours is marked, and Tango says every song started is kept',
          page.evaluate("document.querySelector('.bsmash-song-card.ours').dataset.song") == 'c-1-6-2-5'
          and 'kept' in guide(page, 'beat-song-guide'), guide(page, 'beat-song-guide'))
    check('...its card says how far its band has got',
          page.inner_text('.bsmash-song-card[data-song="c-1-6-2-5"] .bsmash-song-status') == 'Keys · One bar')
    page.click('.bsmash-song-card[data-song="c-1-4-5-1"]')
    page.click('#beat-song-add')
    page.wait_for_timeout(300)
    after = page.evaluate("""(() => { const p = bsmashLoad(); return { song: p.song, waiting: Object.keys(p.bands || {}),
        bass: p.bands['c-1-6-2-5'].musicians.bass.part, won: ['drums', 'bass', 'keys'].filter(id => p.musicians[id].won).length }; })()""")
    check('Another song, no questions asked: a new band from the beginning, and the old band waits with its song',
          after == {'song': 'c-1-4-5-1', 'waiting': ['c-1-6-2-5'], 'bass': 'spicy', 'won': 0}, after)
    page.wait_for_timeout(2800)
    check('...and straight on to the new band\'s drums', page.evaluate("bsmash && bsmash.musician.id") == 'drums'
          and page.evaluate("bsmash.song") == 'c-1-4-5-1')
    page.evaluate('showBeatSongs()')
    page.wait_for_timeout(300)
    page.click('.bsmash-song-card[data-song="c-1-6-2-5"]')
    page.click('#beat-song-add')
    page.wait_for_timeout(300)
    back = page.evaluate("""(() => { const p = bsmashLoad(); return { song: p.song, won: ['drums', 'bass', 'keys'].filter(id => p.musicians[id].won),
        waiting: Object.keys(p.bands || {}), newBand: p.bands['c-1-4-5-1'].musicians.drums.plays }; })()""")
    check('...and back to the first song: its band exactly where it was left, the new one waiting in turn',
          back == {'song': 'c-1-6-2-5', 'won': ['drums', 'bass'], 'waiting': ['c-1-4-5-1'], 'newBand': 1}, back)
    page.wait_for_timeout(2800)
    check('...carrying on with the musician it was up to', page.evaluate("bsmash && bsmash.musician.id") == 'keys')
    page.evaluate('showBeatSongs()')
    page.wait_for_timeout(300)
    page.click('.bsmash-song-card[data-song="c-1-4-5-1"]')
    page.click('#beat-song-add')
    page.wait_for_timeout(2800)
    # A part is added the same way: hold it, slide it up into the box.
    page.evaluate("startBeatMusician('drums', false, 5); bsmashOpenPicker(false)")
    page.wait_for_selector('#beat-picker-cards .bsmash-style-card', timeout=8000)
    page.click('#beat-picker-cards .bsmash-style-card:nth-child(3)')
    page.wait_for_timeout(200)
    check('In the part picker a tap still only plays a part', not record(page)['won']
          and page.evaluate('bsmashBand.parts.drums') == 'hop')
    lit = drag_into(page, '#beat-picker-cards .bsmash-style-card:nth-child(2)', '#beat-picker-drop')
    rec = record(page)
    check('...and holding one and sliding it up into the box adds it to the band',
          lit and rec['won'] and rec['part'] == 'smooth' and 'Smooth' in page.inner_text('#beat-picker-drop')
          and page.evaluate('bsmashBand.parts.drums') == 'smooth', [lit, rec])
    page.evaluate('showBeatPathway()')
    page.wait_for_timeout(200)


def test_playtest_two(page):
    """Rob's second playtest: takes start where the band's four-bar loop
    says, the squares come down at four bars, the kick, a press just
    before the barline plays the next chord, and the studio's Pause and its
    green playback line."""
    fresh(page, "localStorage.setItem('koolRiffsOpenAll','1');")
    page.click('.game-card.red')
    page.wait_for_timeout(500)
    check('With everything open, Beat Smash opens on the pathway, not the warm-up', screen(page) == 'beat-screen-pathway', screen(page))
    starts = {}
    for step in (1, 2, 3, 4):
        page.evaluate("startBeatMusician('drums', false, %d)" % step)
        page.wait_for_function("bsmash && bsmash.take && !bsmash.take.done", timeout=20000)
        starts[step] = page.evaluate("({ start: bsmash.take.startBar, count: bsmash.take.countInBar, go: bsmash.take.go,"
                                     " showing: bsmash.showing, scaffold: bsmash.scaffold })")
    check('Four and eight bars start at the top of the band\'s loop, counted in on its bar 4; two bars on bar 1 or 3',
          starts[3]['start'] % 4 == 0 and starts[4]['start'] % 4 == 0 and starts[3]['count'] % 4 == 3
          and starts[2]['start'] % 2 == 0, starts)
    check('From four bars the squares come down: the first star is read from the notation',
          starts[3]['scaffold'] == 'star1' and starts[3]['go'] == 'notation' and starts[3]['showing'] == 'notation'
          and starts[1]['go'] == 'picture', starts)
    page.wait_for_function("bsmash.take && bsmashNow() > bsmashBand.start + 0.05", timeout=5000)
    page.wait_for_timeout(700)
    guide_cells = page.evaluate("""(() => { const bar = Math.floor((bsmashNow() - bsmashBand.start) / BSMASH_BAR);
        return { bar: bar, count: bsmash.take.countInBar, shown: !document.getElementById('beat-loop').hidden,
                 cells: [...document.querySelectorAll('#beat-loop i')].map(i => i.className.trim()) }; })()""")
    now_cell = guide_cells['bar'] % 4
    check('The loop guide shows where the band is in its four bars, and which bar counts in',
          guide_cells['shown'] and 'now' in guide_cells['cells'][now_cell]
          and (guide_cells['bar'] > guide_cells['count'] or 'count' in guide_cells['cells'][guide_cells['count'] % 4]), guide_cells)
    check('Tango\'s part is a kick, not a pitch (Rob: the cowbell was out of key); the clave is the teacher\'s other choice',
          page.evaluate('bsmashSoundKind()') == 'kick' and page.evaluate("BSMASH_MUSICIANS[0].sounds.join()") == 'kick,clave')
    chords = page.evaluate("""[bsmashChordAt(bsmashBand.start + 4 * BSMASH_BAR - 0.1), bsmashChordAt(bsmashBand.start + 4 * BSMASH_BAR - 0.3),
                               bsmashChordAt(bsmashBand.start + 1 * BSMASH_BAR - 0.05)].map(c => c.bass)""")
    check('A press a fraction before the barline plays the next bar\'s chord (C), earlier its own (G); F for bar 2',
          chords == [36, 43, 41], chords)

    # The studio, eight bars: Pause, Resume, then listen back with the line.
    page.evaluate("const p = bsmashLoad(); p.settings.studioBars = 8; bsmashSave(p); startBeatMusician('drums', false, 5)")
    page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=20000)
    page.click('#beat-transport-record')
    take = wait_for_take(page)
    offset = clock_offset(page)
    early = [t for t in take['notes'] if t < take['start'] + 2 * 2.4]
    for t in early:
        press_at(page, offset, t + take['delay'], index=int(round((t - take['start']) / 0.6)) % 4)
    page.wait_for_timeout(100)
    shown = page.evaluate("['record', 'pause', 'play', 'keep'].map(id => !document.getElementById('beat-transport-' + id).hidden)")
    check('Recording: Pause is there; Record, Listen and Keep are not', shown == [False, True, False, False], shown)
    page.click('#beat-transport-pause')
    page.wait_for_timeout(300)
    paused = page.evaluate("""({ phase: bsmash.phase, bar: bsmash.take.pauseBar, loop: Math.round((bsmash.take.start - bsmashBand.start) / BSMASH_BAR) % 4,
                                 label: document.getElementById('beat-transport-pause').textContent })""")
    check('Pause: "right where I\'m at", and the button becomes Resume', paused['phase'] == 'paused' and 'Resume' in paused['label']
          and 'Paused' in guide(page), [paused, guide(page)])
    page.wait_for_timeout(1500)
    page.click('#beat-transport-pause')
    page.wait_for_timeout(200)
    resumed = page.evaluate("""({ phase: bsmash.phase, from: bsmash.take.from, playFrom: bsmash.take.playFrom, start: bsmash.take.start,
        loop: Math.round((bsmash.take.start - bsmashBand.start) / BSMASH_BAR) % 4,
        notes: bsmash.take.notes.filter(n => n.t >= bsmash.take.playFrom - 0.01).map(n => n.t), delay: bsmash.delay })""")
    check('Resume: from the top of the paused bar, still in its place in the loop',
          resumed['from'] == paused['bar'] * 4 and resumed['loop'] == paused['loop'] and resumed['phase'] in ('wait', 'go'), [paused, resumed])
    offset = clock_offset(page)
    for t in resumed['notes']:
        press_at(page, offset, t + resumed['delay'], index=int(round((t - resumed['start']) / 0.6)) % 4)
    wait_take_done(page, 30)
    page.wait_for_timeout(400)
    score = page.inner_text('#beat-control .bsmash-control-score')
    check('...and the take, paused and picked up again, is marked as one', score.startswith('100%'), score)
    page.click('#beat-transport-play')
    page.wait_for_timeout(300)
    first = page.evaluate("(() => { const l = [...document.querySelectorAll('#beat-reading .bsmash-playline')].find(l => !l.hidden); return l ? parseFloat(l.style.left) : null; })()")
    page.wait_for_function("bsmash.playback && bsmashHeardNow() > bsmash.playback.start + 1.5", timeout=15000)
    later = page.evaluate("(() => { const l = [...document.querySelectorAll('#beat-reading .bsmash-playline')].find(l => !l.hidden); return l ? parseFloat(l.style.left) : null; })()")
    check('Listen back: a green line waits at the start of the music, then moves through it with the sound',
          first is not None and later is not None and later > first + 20, [first, later])
    page.click('#beat-transport-stop')
    page.wait_for_timeout(200)
    check('...and Stop puts it away', page.evaluate("[...document.querySelectorAll('#beat-reading .bsmash-playline')].every(l => l.hidden)"))


def code(page, text):
    page.evaluate("launchGame('view-dashboard'); toggleCredits(true)")
    page.fill('#kr-code-input', text)
    page.click('#modal-credits .kr-code-btn')
    page.wait_for_timeout(200)
    return page.inner_text('#kr-code-result')


def test_my_band(page):
    """Rob, 2026-10-03: the band they won is theirs to play with (the mixer),
    with their own studio takes in it ("Me"), a report of every step for the
    teacher, and the band as an audio file to send them."""
    def take(bars, every, kind):
        return {'at': 1, 'score': 91, 'bars': bars, 'kind': kind, 'presses': [[b * 1.0, 0.8] for b in range(0, bars * 4, every)]}
    stats = {'takes': 5, 'passed': 3, 'notes': 20, 'right': 18, 'hits': 19, 'offMs': 900, 'leanMs': -300, 'best': 100,
             'early': 1, 'late': 0, 'missed': 1, 'rest': 0, 'extra': 0, 'short': 0, 'wrongPad': 0}
    progress = {'jamDone': True, 'firstStar': True, 'song': 'c-1-4-1-5', 'permit': {'at': 1, 'bars': 32},
                'beatTests': [{'at': 1, 'taps': 26, 'leanMs': -35, 'steadyMs': 42, 'onBeat': 92, 'delayMs': 0}],
                'musicians': {
                    'drums': {'step': 5, 'streak': 0, 'clean': 20, 'won': True, 'part': 'spicy', 'plays': 5,
                              'take': take(32, 1, 'kick'), 'stats': {'1': stats, '5': dict(stats, takes=2, passed=1, best=91)}},
                    'bass': {'step': 5, 'streak': 0, 'clean': 20, 'won': True, 'part': 'smooth', 'plays': 5, 'take': take(32, 2, 'bass-electric')},
                    'keys': {'step': 5, 'streak': 0, 'clean': 20, 'won': True, 'part': 'hop', 'plays': 5}}}
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Zed',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:%s}}));" % json.dumps(progress))
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-track [data-id=drums]')
    page.click('#beat-pathway-start')          # My band, the won musician's default
    page.wait_for_timeout(800)
    mixer = page.evaluate("Object.fromEntries([...document.querySelectorAll('.bsmash-mixer-row')].map(r => [r.dataset.id,"
                          " [...r.querySelectorAll('.bsmash-chip')].map(c => c.textContent + (c.classList.contains('on') ? '*' : '') + (c.disabled ? '-' : ''))]))")
    check('My band: a mixer row per musician, the part they won lit, and ME lit where there is a kept take',
          screen(page) == 'beat-screen-band' and mixer.get('drums') == ['ME*', 'Spicy*', 'Smooth', 'Hop', 'Off']
          and mixer.get('bass')[:3] == ['ME*', 'Spicy', 'Smooth*'] and mixer.get('keys')[0] == 'ME-', mixer)
    band = page.evaluate("({ parts: bsmashBand.parts, me: Object.keys(bsmashBand.me || {}).sort(),"
                         " booked: bsmashQueue.filter(e => e.tag === 'me:drums').length })")
    check('...the band plays every part won, with their own takes booked on top, in time',
          band['parts'].get('drums') == 'spicy' and band['parts'].get('bass') == 'band:c-1-4-1-5:smooth'
          and band['me'] == ['bass', 'drums'] and band['booked'] > 0, band)
    hits = page.evaluate("bsmashMeHits({ bars: 32, kind: 'kick', presses: [[0, 1], [15.9, 0.2], [16, 1], [127.95, 0.1]] }, 1)"
                         ".map(h => [h.beat, h.bar])")
    check('...a take loops four bars to a cycle, and a press just before a barline plays the next chord',
          [round(h[0], 2) for h in hits] == [0.0] and hits[0][1] == 0, hits)
    page.click('.bsmash-mixer-row[data-id=bass] .bsmash-chip.me')
    page.click('.bsmash-mixer-row[data-id=keys] .bsmash-chip:last-child')
    page.click('.bsmash-mixer-row[data-id=drums] .bsmash-chip:nth-child(3)')
    page.wait_for_timeout(300)
    band = page.evaluate("({ parts: bsmashBand.parts, me: Object.keys(bsmashBand.me || {}).sort(), mix: bsmashLoad().mix })")
    check('Swap a part, turn ME off, turn a channel off: the band changes in time, and with nothing on the keys the piano holds the chords',
          band['parts'].get('drums') == 'smooth' and 'keys' not in band['parts'] and band['parts'].get('guide') == 'guide:c-1-4-1-5'
          and band['me'] == ['drums'] and band['mix']['keys']['style'] == 'off', band)
    page.reload()
    page.wait_for_timeout(400)
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.evaluate("openBeatBand()")
    page.wait_for_timeout(400)
    check('...and the mix is still theirs next time', page.evaluate("bsmashBand.parts.drums") == 'smooth'
          and page.evaluate("Object.keys(bsmashBand.me || {}).join()") == 'drums')
    page.click('#beat-screen-band .btn-secondary >> nth=0')
    page.wait_for_timeout(300)
    report = page.inner_text('#beat-report')
    check('My report: nickname, song, beat test, and each musician\'s steps for the teacher',
          screen(page) == 'beat-screen-report' and 'Nickname: Zed' in report and 'Song: Sunrise' in report
          and 'Beat test: 92%' in report and 'One bar: 5 takes, 3 passed' in report and '90% of notes right' in report
          and 'a little early (16 ms)' in report and 'The studio: 2 takes, 1 passed' in report
          and 'Take in the band: 91% (32 bars)' in report, report)
    page.click('#beat-report-band')
    page.wait_for_timeout(300)
    check('Make my recording, then send it: two taps, because a share must come straight from a tap',
          page.text_content('#beat-band-share') == 'Make my recording')
    page.click('#beat-band-share')
    page.wait_for_function("bsmashShared", timeout=60000)
    made = page.evaluate("""(async () => {
        const f = bsmashShared.files, buf = await f[0].arrayBuffer(), v = new DataView(buf);
        let peak = 0; const n = (buf.byteLength - 44) / 2;
        for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(v.getInt16(44 + i * 2, true)));
        return { names: f.map(x => x.name), types: f.map(x => x.type), seconds: n / v.getUint32(24, true), peak: peak / 32768,
                 button: document.getElementById('beat-band-share').textContent, text: bsmashShared.text }; })()""")
    check('...the recording is the band and their takes, 32 bars as a WAV, with the report as a picture and as the message',
          made['types'] == ['audio/wav', 'image/png'] and made['names'][0].endswith('.wav') and 76 < made['seconds'] < 82
          and 0.85 < made['peak'] < 0.95 and made['button'] == 'Send to my teacher' and 'Nickname: Zed' in made['text']
          and 'teacher' in guide(page, 'beat-band-guide'), made)
    page.click('.bsmash-mixer-row[data-id=bass] .bsmash-chip.me')
    page.wait_for_timeout(200)
    check('...change the mix and it is made again', page.text_content('#beat-band-share') == 'Make my recording'
          and page.evaluate('bsmashShared') is None)
    # Re-record: back into the studio, beat the take in the band, keep it.
    page.evaluate("const p = bsmashLoad(); p.settings.studioBars = 8; bsmashSave(p); startBeatMusician('drums', false, 5)")
    page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=8000)
    check('Re-record: Tango names the score to beat', 'Can you beat it' in guide(page) and '91%' in guide(page), guide(page))
    check('...and only the band plays under it: the takes in My band stop', page.evaluate("!bsmashBand.me")
          and page.evaluate("bsmashQueue.filter(e => /^me:/.test(e.tag)).length") == 0)
    record_take(page)
    page.wait_for_function("bsmash.phase === 'verdict'", timeout=8000)
    page.click('#beat-transport-keep')
    page.wait_for_timeout(500)
    rec = record(page)
    check('...Keep it: the new take is the one in the band, and My band plays it',
          screen(page) == 'beat-screen-band' and rec['take']['bars'] == 8 and rec['take']['at'] > 1
          and page.evaluate("bsmashBand.me && bsmashBand.me.drums && bsmashBand.me.drums.bars") == 8, rec['take'].get('bars'))
    # A finished song, and on to the next one.
    check('My band leads on to another song', page.is_visible('#beat-band-another'))
    page.click('#beat-band-another')
    page.wait_for_timeout(400)
    check('...back at the song list, the finished song marked so',
          screen(page) == 'beat-screen-song'
          and page.inner_text('.bsmash-song-card[data-song="c-1-4-1-5"] .bsmash-song-status') == '★ Finished')
    page.evaluate('showBeatPathway()')
    page.wait_for_timeout(300)
    check('With the band complete the pathway points at the songs: Start reads "My songs"',
          page.evaluate('bsmashSelected') == 'song' and page.text_content('#beat-pathway-start') == 'My songs'
          and 'another song' in guide(page, 'beat-pathway-guide'), [page.evaluate('bsmashSelected'), page.text_content('#beat-pathway-start')])


def test_resume(page):
    """Rob, 2026-10-03: "I should be able to close the game and the game
    remembers how far I'm through." Mum calls, the tab closes, and the next
    sitting picks up on the same step, the same stars, the same studio bars."""
    players = "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
    fresh(page, players + "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "song:'c-1-4-1-5',settings:{studioBars:8},musicians:{drums:{step:5,streak:0,clean:20,won:true,part:'spicy',plays:5},"
                "bass:{step:3,streak:1,clean:9,won:false,part:null,plays:4}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(500)
    path = page.evaluate("""({ selected: bsmashSelected + '/' + bsmashSelectedStep,
        on: (document.querySelector('#beat-steps .bsmash-chip.on') || {}).textContent,
        start: document.getElementById('beat-pathway-start').textContent })""")
    check('Back after a break: the pathway opens on the step they were on, its stars on the chip, "Carry on"',
          path == {'selected': 'bass/3', 'on': 'Four bars ★☆☆', 'start': 'Carry on'}, path)
    check('...and the guide says where they are up to', 'Welcome back' in guide(page, 'beat-pathway-guide')
          and 'Four bars ★☆☆' in guide(page, 'beat-pathway-guide'), guide(page, 'beat-pathway-guide'))
    page.click('#beat-pathway-start')
    play_take(page)
    page.wait_for_timeout(2500)
    check('A star won is saved as it lands', record(page, 'bass')['streak'] == 2, record(page, 'bass'))
    page.reload()
    page.wait_for_timeout(400)
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.phase", timeout=5000)
    check('...and the next sitting starts on that step with those two stars', [state(page)['step'], state(page)['streak']] == [3, 2], state(page))

    # The studio: the same bars in the next sitting.
    page.evaluate("bsmashUpdateMusician('bass', { step: 5, streak: 0 }); startBeatMusician('bass', false, 5)")
    page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=8000)
    bars = page.evaluate("bsmash.bars.map(b => b.join()).join('|')")
    page.reload()
    page.wait_for_timeout(400)
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=8000)
    check('The studio\'s bars are the same in the next sitting: the song is the song',
          page.evaluate("bsmash.bars.map(b => b.join()).join('|')") == bars and len(bars.split('|')) == 8)
    record_take(page)
    page.wait_for_function("bsmash.phase === 'verdict'", timeout=8000)
    check('A studio take at the pass mark is saved before Keep is pressed', record(page, 'bass').get('studioPassed') is True, record(page, 'bass'))
    page.reload()
    page.wait_for_timeout(400)
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    check('Closed before Keep: the pathway says the take was a keeper, "Choose my part"',
          page.text_content('#beat-pathway-start') == 'Choose my part' and 'keeper' in guide(page, 'beat-pathway-guide'),
          [page.text_content('#beat-pathway-start'), guide(page, 'beat-pathway-guide')])
    page.click('#beat-pathway-start')
    page.wait_for_timeout(400)
    check('...and goes straight to choosing the part', screen(page) == 'beat-screen-picker', screen(page))
    page.wait_for_selector('#beat-picker-cards .bsmash-style-card', timeout=8000)
    page.click('#beat-picker-cards .bsmash-style-card')
    page.wait_for_timeout(300)
    page.evaluate("bsmashKeepPart(true)")
    check('Keeping the part clears it', record(page, 'bass')['won'] and not record(page, 'bass').get('studioPassed'), record(page, 'bass'))

    # Before any name is given: the warm-up and the song are kept on the device.
    fresh(page)
    page.evaluate("const p = bsmashLoad(); p.jamDone = true; p.song = 'c-1-4-1-5'; bsmashSave(p);")
    page.reload()
    page.wait_for_timeout(400)
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    check('A guest\'s warm-up and song survive the tab closing: back to the pathway, not the jam',
          screen(page) == 'beat-screen-pathway' and page.evaluate("bsmashSong()") == 'c-1-4-1-5', screen(page))
    adopted = page.evaluate("""(() => {
        localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:null}));
        chooseBeatPlayer('p1');
        return { guest: localStorage.getItem('koolRiffsBeatGuest'), song: bsmashSong(), jam: bsmashLoad().jamDone }; })()""")
    check('...and go with them to their name', adopted == {'guest': None, 'song': 'c-1-4-1-5', 'jam': True}, adopted)


def test_eighths_song(page):
    """Rob, 2026-10-05: Night Owl is Level 2, eighth notes first. No
    syncopation, an eighth rest only on the "and", and a whole note or rest
    bar about 5% of the time in 4, 8 and 32 bars. His examples first."""
    won = {'step': 5, 'streak': 0, 'clean': 20, 'won': True, 'part': 'spicy', 'plays': 5}
    players = "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Zed',age:'9-10'}],current:'p1'}));"
    fresh(page, players + "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "song:'c-1-4-1-5',musicians:{drums:%s}}}}));" % json.dumps(won))
    page.click('.game-card.red')
    page.wait_for_timeout(300)
    page.evaluate('showBeatSongs()')
    page.wait_for_timeout(300)
    owl = '.bsmash-song-card[data-song="c-2-5-1-6"]'
    check('Night Owl is Level 2, eighth notes, locked until a Level 1 band is finished',
          page.evaluate("document.querySelector('%s').disabled" % owl) and 'Level 2' in page.inner_text(owl)
          and 'Finish a Level 1 song first' in page.inner_text(owl), page.inner_text(owl))
    rules = page.evaluate("""(() => { const r = BSMASH_RHYTHMS.eighths, out = {}, m = BSMASH_MUSICIANS[0];
        const grid = rstompGridFor({ labels: r.labels, slot: r.slot, pool: Object.keys(RSTOMP_VOCABULARY) });
        const q = bsmashRhythmTable(r, m, 'quavers'), w = bsmashRhythmTable(r, m, 'wholes');
        const all = q.concat(w), figs = r.musicians.drums.figures.map(bsmashParseBar);
        const breaks = bar => bsmashSpecs(bar).some(s =>
            (s.isRest && s.slots < 1 && Number.isInteger(s.slot))             // an eighth rest on the beat
            || (!Number.isInteger(s.slot) && s.slot + s.slots > Math.ceil(s.slot))); // off the beat and past it
        const isWhole = bar => bar.length === 1 && bsmashBeatsOf(bar[0]) === 4;
        return { figures: Math.round(100 * q.filter(x => figs.some(f => bsmashSameBar(f, x))).length / q.length),
                 examples: ['8 8 q q q', 'q 8 8 q q', 'q q 8 8 q', 'q q q 8 8', '8 8 h q', 'q 8 8 h', 'q h 8 8']
                     .every(t => q.some(x => bsmashSameBar(x, bsmashParseBar(t)))),
                 wholes: Math.round(1000 * w.filter(isWhole).length / w.length) / 10,
                 eighthBars: w.filter(x => !isWhole(x)).every(bsmashHasQuaver),
                 broken: all.filter(breaks).map(b => b.join(' ')).slice(0, 3),
                 legal: all.every(x => rstompShapeIsLegal(x, 8, 0, grid)),
                 full: all.every(x => bsmashSpecs(x).reduce((a, s) => a + s.slots, 0) === 4),
                 restOnAnd: all.some(bar => bar.join(' ').includes('eighth-note eighth-rest')),
                 sameForAll: ['bass', 'keys'].every(id => r.musicians[id] === r.musicians.drums) }; })()""")
    check('Rob\'s seven examples are all there, and half of every 1 and 2-bar roll',
          rules['examples'] and 45 <= rules['figures'] <= 55, rules)
    check('...no eighth rest on the beat and no syncopation anywhere; an eighth rest on the "and" is',
          rules['broken'] == [] and rules['restOnAnd'], rules)
    check('...4, 8 and 32 bars: a whole note or whole rest bar about 5% of the time, every other bar with eighth notes',
          4 <= rules['wholes'] <= 6 and rules['eighthBars'], rules)
    check('...every bar legal and full, and the same rules for drums, bass and keys', rules['legal'] and rules['full'] and rules['sameForAll'], rules)
    page.evaluate("const p = bsmashLoad(); p.musicians.bass = %s; p.musicians.keys = %s; bsmashSave(p); showBeatSongs()" % (json.dumps(won), json.dumps(won)))
    page.wait_for_timeout(300)
    page.click(owl)
    page.wait_for_timeout(300)
    page.click('#beat-song-add')
    page.wait_for_function("bsmash && bsmash.mode === 'steps' && bsmash.take", timeout=10000)
    st = page.evaluate("({ bars: bsmash.bars.map(b => b.join(' ')), bpm: bsmashBand.bpm, guide: document.getElementById('beat-studio-guide').innerText })")
    check('Opened by a finished Level 1 band; into the drums at 80 bpm, one of Rob\'s first four examples, and Tango says what is new',
          st['bpm'] == 80 and st['bars'][0] in ['eighth-note eighth-note quarter-note quarter-note quarter-note',
                                                  'quarter-note eighth-note eighth-note quarter-note quarter-note',
                                                  'quarter-note quarter-note eighth-note eighth-note quarter-note',
                                                  'quarter-note quarter-note quarter-note eighth-note eighth-note']
          and 'Eighth notes' in st['guide'], st)
    play_take(page)
    page.wait_for_timeout(300)
    check('...played in time, two taps on the beat\'s pad, it is clean', page.evaluate("bsmash.phase === 'reveal' || bsmash.streak >= 1"), state(page))
    page.evaluate('showBeatPathway()')


def test_quaver_song(page):
    """Rob, 2026-10-04: one song becomes an eighth-note level. Skate Park:
    his figures, read on the quaver grid, a slower song. Level 3 since Night
    Owl took Level 2, so it opens once Night Owl's band is finished."""
    won = {'step': 5, 'streak': 0, 'clean': 20, 'won': True, 'part': 'spicy', 'plays': 5}
    players = "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Zed',age:'9-10'}],current:'p1'}));"
    fresh(page, players + "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "song:'c-1-4-1-5',musicians:{drums:%s}}}}));" % json.dumps(won))
    page.click('.game-card.red')
    page.wait_for_timeout(300)
    page.evaluate('showBeatSongs()')
    page.wait_for_timeout(300)
    card = '.bsmash-song-card[data-song="c-4-1-5-1"]'
    owl = '.bsmash-song-card[data-song="c-2-5-1-6"]'
    check('Skate Park is Level 3, off-beats: shown, named, and locked',
          page.evaluate("document.querySelector('%s').disabled" % card) and 'Level 3' in page.inner_text(card)
          and 'Finish a Level 2 song first' in page.inner_text(card), page.inner_text(card))
    page.evaluate("const p = bsmashLoad(); p.musicians.bass = %s; p.musicians.keys = %s; bsmashSave(p); showBeatSongs()" % (json.dumps(won), json.dumps(won)))
    page.wait_for_timeout(300)
    check('...a band finished on a Level 1 song opens Night Owl, Level 2, but not Skate Park yet',
          not page.evaluate("document.querySelector('%s').disabled" % owl) and page.evaluate("document.querySelector('%s').disabled" % card))
    page.evaluate("const p = bsmashLoad(); p.bands = { 'c-2-5-1-6': { musicians: { drums: %s, bass: %s, keys: %s }, mix: {} } }; bsmashSave(p); showBeatSongs()"
                  % (json.dumps(won), json.dumps(won), json.dumps(won)))
    page.wait_for_timeout(300)
    check('...and a band finished on Night Owl opens Skate Park', not page.evaluate("document.querySelector('%s').disabled" % card))
    tables = page.evaluate("""(() => { const r = BSMASH_RHYTHMS.quavers, out = {};
        for (const m of BSMASH_MUSICIANS) {
            const figs = r.musicians[m.id].figures.map(bsmashParseBar), q = bsmashRhythmTable(r, m, 'quavers'), b = bsmashRhythmTable(r, m, 'balanced');
            const grid = rstompGridFor({ labels: r.labels, slot: r.slot, pool: Object.keys(RSTOMP_VOCABULARY) });
            const all = q.concat(b);
            out[m.id] = { figures: Math.round(100 * q.filter(x => figs.some(f => bsmashSameBar(f, x))).length / q.length),
                          quaverBars: q.every(bsmashHasQuaver),
                          balanced: Math.round(100 * b.filter(bsmashHasQuaver).length / b.length),
                          firstSong: b.filter(x => !bsmashHasQuaver(x)).every(x => bsmashAllBars(m).some(y => bsmashSameBar(x, y))),
                          legal: all.every(x => rstompShapeIsLegal(x, 8, 0, grid)),
                          full: all.every(x => bsmashSpecs(x).reduce((a, s) => a + s.slots, 0) === 4) };
        }
        return out; })()""")
    check('Rob\'s figures are half of every 1, 2 and 4-bar roll, the rest all eighth-note bars',
          all(45 <= t['figures'] <= 55 and t['quaverBars'] for t in tables.values()), tables)
    check('...8 and 32 bars are balanced: half eighth-note bars, half the first song\'s quarters, halves and wholes',
          all(45 <= t['balanced'] <= 55 and t['firstSong'] for t in tables.values()), tables)
    check('...and every bar is legal by the engraving rules and fills its four beats',
          all(t['legal'] and t['full'] for t in tables.values()), tables)
    page.click(card)
    page.wait_for_timeout(400)
    check('Auditioning it: the band starts again at its tempo, slower', page.evaluate("[bsmashBand.bpm, BeatSmashBand.BPM]") == [80, 80])
    page.click('#beat-song-add')
    page.wait_for_function("bsmash && bsmash.mode === 'steps' && bsmash.take", timeout=10000)
    st = page.evaluate("""({ song: bsmash.song, bars: bsmash.bars.map(b => b.join(' ')), bpm: bsmashBand.bpm, beat: BSMASH_BEAT,
        win: bsmashWindow(), guide: document.getElementById('beat-studio-guide').innerText, pips: document.querySelectorAll('#beat-dice .bsmash-pip').length,
        squares: document.querySelectorAll('#beat-reading .bsmash-block').length })""")
    check('Into Tango\'s drums at 80 bpm: the first bar is his figure, and Tango says what is new',
          st['song'] == 'c-4-1-5-1' and st['bars'] == ['quarter-note quarter-note quarter-note eighth-note eighth-note']
          and st['bpm'] == 80 and abs(st['beat'] - 0.75) < 1e-9 and 'Eighth notes' in st['guide'], st)
    check('...a timing window of half an eighth note at most, and the picture a square per eighth', abs(st['win'] - 0.1875) < 1e-6
          and st['squares'] == 5, st)
    ok = play_until(page, "bsmash.streak >= 1 || bsmashMusicianRecord('drums').clean > 0", limit=3)
    check('...played in time on the beat pads (the "and" of 4 on pad 4), the take is clean', ok, state(page))
    page.wait_for_timeout(2400)
    page.evaluate("bsmashStopTimers(); bsmashUpdateMusician('drums', { clean: 1 }); bsmash.streak = 0; bsmashNewRoll()")
    page.wait_for_function("bsmash.take && !bsmash.take.done", timeout=10000)
    hat = page.evaluate("""({ bars: bsmash.bars.map(b => b.join(' ')), kind: bsmashPressKind(bsmash.take.start + 0.5 * BSMASH_BEAT),
        hatBars: bsmashHatBars() })""")
    check('The second rung is the off-beats, and they are played on the hi-hat',
          hat['bars'] == ['eighth-rest eighth-note eighth-rest eighth-note eighth-rest eighth-note eighth-rest eighth-note']
          and hat['kind'] == 'hat' and hat['hatBars'] == [0], hat)
    play_take(page)
    page.wait_for_timeout(300)
    check('...and played on the "and"s, it is clean', page.evaluate("bsmash.phase === 'reveal' || bsmash.streak >= 1"), [state(page), guide(page)])
    # Riff's bass figure, held where it should be.
    page.evaluate("startBeatMusician('bass', false, 1)")
    page.wait_for_function("bsmash.take && !bsmash.take.done", timeout=10000)
    bass = page.evaluate("bsmash.bars.map(b => b.join(' '))")
    play_take(page)
    page.wait_for_timeout(300)
    check('Riff\'s bass figure first, and played in time it is clean',
          bass == ['eighth-rest eighth-note eighth-note eighth-note eighth-rest eighth-note eighth-note eighth-note']
          and page.evaluate("bsmash.phase === 'reveal' || bsmash.streak >= 1"), [bass, state(page)])
    # The band finished at the slower tempo: My band and its recording are 80 bpm.
    page.evaluate('showBeatPathway()')
    take = {'at': 1, 'score': 90, 'bars': 32, 'kind': 'kick', 'hatBars': [1], 'presses': [[b * 0.5, 0.4] for b in range(0, 256, 3)]}
    page.evaluate("const p = bsmashLoad(); ['drums', 'bass', 'keys'].forEach(id => Object.assign(p.musicians[id], %s)); p.musicians.drums.take = %s; bsmashSave(p); openBeatBand()"
                  % (json.dumps(won), json.dumps(take)))
    page.wait_for_timeout(400)
    hits = page.evaluate("[...new Set(bsmashMeHits(bsmashLoad().musicians.drums.take, 0).map(h => h.bar + ':' + h.kind))].sort()")
    check('My band plays the eighth-note song at 80 bpm, the hi-hat bars of a kept take on the hi-hat',
          page.evaluate("bsmashBand.bpm") == 80 and hits == ['0:kick', '1:hat', '2:kick', '3:kick'], hits)
    seconds = page.evaluate("bsmashRenderBand().then(blob => (blob.size - 44) / 2 / 32000)")
    check('...and its recording is 32 bars at 80 bpm', 97 < seconds < 100, seconds)
    page.evaluate('showBeatPathway()')
    page.wait_for_timeout(200)
    page.evaluate("const p = bsmashLoad(); p.song = 'c-1-4-1-5'; bsmashSave(p); startBeatMusician('drums', false, 1)")
    page.wait_for_timeout(500)
    check('Back on a first-level song the band is 100 bpm again, on the crotchet grid',
          page.evaluate("[bsmashBand.bpm, BeatSmashBand.BPM, bsmashPerBeat()]") == [100, 100, 1])
    page.evaluate('showBeatPathway()')


def test_teacher_codes(page):
    fresh(page)
    said = code(page, 'koolopen')
    check('The OPEN code turns on every level, on this device', 'open' in said and page.evaluate('KR.openAll()'), said)
    page.evaluate("toggleCredits(false)")
    locked = page.evaluate("""(() => {
        const out = {};
        launchGame('view-game1'); out.staff = document.querySelectorAll('#g1-pathway-track .locked').length;
        launchGame('view-game2'); out.note = document.querySelectorAll('#g2-pathway-track .locked').length;
        launchGame('view-game3'); out.real = document.querySelectorAll('#g3-pathway-track .locked').length;
        launchGame('view-rhythm'); out.rhythm = document.querySelectorAll('#rhythm-pathway-track .locked').length;
        launchGame('view-rhythm-lab'); out.lab = document.querySelectorAll('#rstomp-pathway-track .locked').length;
        out.gate = document.getElementById('modal-value-gate').classList.contains('show');
        out.value = vsmashLoad().unlocked.length === VSMASH_FLOORS.length;
        return out;
    })()""")
    check('...every stage of every game is open, and Stomp Lab needs no License',
          locked == {'staff': 0, 'note': 0, 'real': 0, 'rhythm': 0, 'lab': 0, 'gate': False, 'value': True}, locked)
    page.evaluate("localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                  "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,beatTests:[{at:1,taps:26,leanMs:-35,steadyMs:42,onBeat:92,delayMs:0}],"
                  "musicians:{drums:{step:1,streak:0,clean:0,won:false,part:null,plays:1}}}}}));"
                  "launchGame('view-dashboard');")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    chips = page.evaluate("[...document.querySelectorAll('#beat-steps .bsmash-chip')].map(c => c.textContent)")
    check('...Beat Smash: every step open (the one being worked on with its stars)',
          chips == ['One bar ☆☆☆', 'Two bars', 'Four bars', 'Eight bars', 'The studio'], chips)
    closed = page.evaluate("[...document.querySelectorAll('#beat-pathway-track .pathway-node')].filter(n => n.disabled).length")
    check('...and every musician', closed == 0, closed)
    stats = page.inner_text('#beat-stats')
    check('...and the teacher sees the last beat test', '92% on the beat' in stats and '35 ms early' in stats, stats)
    said = code(page, 'KOOLOPEN')
    check('Typing it again turns it off', not page.evaluate('KR.openAll()'), said)
    check('A wrong code says so', 'not a code' in code(page, 'banana'))
    code(page, 'KoolReset')
    page.wait_for_timeout(1800)
    left = page.evaluate("Object.keys(localStorage).filter(k => k.indexOf('koolRiffs') === 0)")
    check('The RESET code takes every game on this device back to zero', left == [], left)
    page.evaluate('KR.speak = () => {}')
    page.click('.game-card.red')
    page.wait_for_timeout(600)
    check('...so Beat Smash starts from the warm-up again', screen(page) == 'beat-screen-studio'
          and page.evaluate("bsmash && bsmash.mode") == 'jam')
    # The same two things as buttons (Rob: "I can't remember the code").
    page.evaluate("bsmashStopAll(); launchGame('view-dashboard'); toggleCredits(true)")
    page.wait_for_timeout(300)
    page.click('.kr-code-buttons .kr-code-btn >> nth=1')
    check('The Open button opens every level', page.evaluate('KR.openAll()'), page.inner_text('#kr-code-result'))
    page.click('.kr-code-buttons .kr-code-btn >> nth=1')
    check('...and pressed again, closes them', not page.evaluate('KR.openAll()'))
    page.evaluate("localStorage.setItem('koolRiffsBeatDelay', '0.05')")
    page.once('dialog', lambda d: d.dismiss())
    page.click('.kr-code-buttons .kr-code-btn >> nth=0')
    page.wait_for_timeout(300)
    check('The Reset button asks first: "no" keeps everything', page.evaluate("localStorage.getItem('koolRiffsBeatDelay')") == '0.05')
    page.once('dialog', lambda d: d.accept())
    page.click('.kr-code-buttons .kr-code-btn >> nth=0')
    page.wait_for_timeout(1800)
    left = page.evaluate("Object.keys(localStorage).filter(k => k.indexOf('koolRiffs') === 0)")
    check('...and "yes" takes everything back to zero', left == [], left)


def test_dashboard(page):
    """Rob, 2026-10-05: the nickname at the very top, then every game in his
    order, its number in the coloured square, its pathway and its numbers."""
    fresh(page)
    cards = page.evaluate("""[...document.querySelectorAll('#home-games .game-card')].map(c => ({
        id: c.dataset.game, n: c.querySelector('.game-icon').textContent, title: c.querySelector('h2').textContent,
        dots: c.querySelectorAll('.home-dot').length, bar: !!c.querySelector('.home-bar'),
        stats: c.querySelector('.home-stats') && c.querySelector('.home-stats').textContent }))""")
    check('The dashboard lists the games in Rob\'s order, numbered 1 to 7 in the coloured square',
          [c['title'] for c in cards] == ['Beat Smash', 'Staff Smash', 'Value Smash', 'Note Smash', 'Real Smash', 'Rhythm Stomp', 'Rhythm Stomp Lab']
          and [c['n'] for c in cards] == [str(n) for n in range(1, 8)], cards)
    check('...each with its pathway (dots, or a bar for a long one) and a line of numbers',
          all((c['dots'] or c['bar']) and c['stats'] for c in cards) and cards[0]['dots'] == 5 and cards[1]['dots'] == 5, cards)
    check('...a fresh device: nothing played yet', all(c['stats'] == 'Not played yet' for c in cards), [c['stats'] for c in cards])
    top = page.evaluate("""(() => { const v = document.getElementById('view-dashboard');
        const first = [...v.children].find(e => e.offsetHeight > 0); return first && first.id; })()""")
    check('"What\'s your nickname?" is the very first thing on the dashboard', top == 'home-player'
          and 'nickname' in page.inner_text('#home-player').lower(), [top, page.inner_text('#home-player')])
    page.click('#home-player .home-player-go')
    check('...an empty nickname is refused', 'first' in page.inner_text('#home-player').lower()
          and page.evaluate("vsmashCurrentPlayer()") is None)
    page.fill('#home-player-input', 'Ziggy')
    page.press('#home-player-input', 'Enter')
    page.wait_for_timeout(200)
    check('...a nickname sets the player for the whole app', page.evaluate("vsmashCurrentPlayer() && vsmashCurrentPlayer().name") == 'Ziggy'
          and 'Playing as Ziggy' in page.inner_text('#home-player'), page.inner_text('#home-player'))
    # Some progress in several games, then back to the dashboard.
    page.evaluate("""(() => {
        const id = vsmashCurrentPlayer().id;
        localStorage.setItem('koolRiffsG1Progress', JSON.stringify({ unlockedStages: ['lines', 'spaces', 'mixed'],
            stageProgress: { lines: { cleared: true, bestScore: 41.6 }, spaces: { cleared: true, bestScore: 30 } }, totalPlays: 6 }));
        localStorage.setItem('koolRiffsValueProgress', JSON.stringify({ players: { [id]: { unlocked: ['v1-tree', 'v1-smash'],
            floors: { 'v1-tree': { cleared: true, plays: 2 }, 'v1-smash': { plays: 3 } }, license: false } } }));
        localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({ players: { [id]: { jamDone: true, song: 'c-1-6-2-5',
            musicians: { drums: { won: true, step: 5, plays: 4 }, bass: { step: 3, plays: 2 } } } } }));
        launchGame('view-dashboard');
    })()""")
    cards = page.evaluate("""Object.fromEntries([...document.querySelectorAll('#home-games .game-card')].map(c => [c.dataset.game, {
        dots: [...c.querySelectorAll('.home-dot')].map(d => d.classList[1]), stats: c.querySelector('.home-stats').textContent }]))""")
    check('Staff Smash shows two cleared, one open, two locked; its best and its plays',
          cards['staff']['dots'] == ['cleared', 'cleared', 'open', 'locked', 'locked']
          and cards['staff']['stats'] == '2 of 5 cleared · best 42 · 6 plays', cards['staff'])
    check('Value Smash shows its floors, for the player playing', cards['value']['dots'][:2] == ['cleared', 'open']
          and cards['value']['stats'].startswith('1 of'), cards['value'])
    check('Beat Smash shows its five squares and how far the band has got',
          cards['beat']['dots'] == ['cleared', 'cleared', 'cleared', 'open', 'locked']
          and cards['beat']['stats'].startswith('Bubblegum: '), cards['beat'])
    page.click('#home-player .home-player-change')
    page.fill('#home-player-input', 'Ruby')
    page.click('#home-player .home-player-go')
    page.wait_for_timeout(200)
    check('"Not you?" adds another: Ruby\'s Value Smash and Beat Smash are her own',
          page.evaluate("vsmashPlayers().list.length") == 2 and 'Playing as Ruby' in page.inner_text('#home-player')
          and page.evaluate("document.querySelector('#home-games [data-game=beat] .home-stats').textContent") == 'Not played yet')
    page.click('#home-player .home-player-change')
    page.click('#home-player .home-player-chip:has-text("Ziggy")')
    page.wait_for_timeout(200)
    check('...and a chip switches back to Ziggy', 'Playing as Ziggy' in page.inner_text('#home-player')
          and page.evaluate("document.querySelector('#home-games [data-game=beat] .home-stats').textContent") != 'Not played yet')
    page.click('#home-games [data-game=beat]')
    page.wait_for_timeout(400)
    check('...and a card still opens its game', page.evaluate("document.getElementById('view-beat').classList.contains('active')"))
    page.evaluate("bsmashStopAll(); launchGame('view-dashboard')")
    # A guest's Beat Smash warm-up goes with them to the nickname given here.
    fresh(page, "localStorage.setItem('koolRiffsBeatGuest', JSON.stringify({ jamDone: true }));")
    page.fill('#home-player-input', 'Kai')
    page.click('#home-player .home-player-go')
    page.wait_for_timeout(200)
    check('A guest\'s warm-up moves to the nickname given on the dashboard',
          page.evaluate("bsmashLoad().jamDone && !localStorage.getItem('koolRiffsBeatGuest')"))


def test_rest_of_app(page):
    fresh(page)
    page.click('.game-card.orange')
    page.wait_for_timeout(400)
    check('Value Smash still opens', page.evaluate("document.getElementById('view-value').classList.contains('active')"))
    missing = page.evaluate("[...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /\\[(beat|home)\\./.test(e.textContent)).length")
    check('No missing words on screen', missing == 0, missing)
    turns = page.evaluate("""(() => {
        const said = [];
        const say = KR.say; KR.say = id => said.push(id);
        KR.event('beat.take.clean'); KR.event('beat.take.clean'); KR.event('beat.take.clean');
        KR.event('beat.jam.start'); KR.event('beat.jam.start');
        KR.say = say; return said;
    })()""")
    check('Several lines on one event take turns; a single line is always that line',
          turns == ['beat.line.clean.1', 'beat.line.clean.2', 'beat.line.clean.1', 'beat.line.copy', 'beat.line.copy'], turns)
    # Every game shows a locked stage's name, dimmed and not pressable
    # (CLAUDE.md "Pathway screen pattern").
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true}}}));"
                "localStorage.setItem('koolRiffsRhythmLabProgress', JSON.stringify({unlockedStages:['1'], totalPlays:1}));")
    named = page.evaluate("""(() => {
        const out = {};
        const look = (name, enter, track) => { enter(); const nodes = [...document.querySelectorAll(track + ' .pathway-node.locked')];
            out[name] = nodes.length > 0 && nodes.every(n => n.disabled && n.querySelector('.pathway-node-label')
                && n.querySelector('.pathway-node-label').textContent.trim() && !n.querySelector('small')); };
        look('staff', () => launchGame('view-game1'), '#g1-pathway-track');
        look('note', () => launchGame('view-game2'), '#g2-pathway-track');
        look('real', () => launchGame('view-game3'), '#g3-pathway-track');
        look('rhythm', () => launchGame('view-rhythm'), '#rhythm-pathway-track');
        look('lab', () => enterRhythmLab(), '#rstomp-pathway-track');
        look('value', () => enterValueSmash(), '#value-pathway-track');
        look('beat', () => enterBeatSmash(), '#beat-pathway-track');
        return out;
    })()""")
    check('Every game shows a locked stage\'s name, dimmed, unpressable, with no score',
          all(named.values()) and len(named) == 7, named)


def main():
    server = serve()
    with sync_playwright() as p:
        browser = launch(p)
        page = new_page(browser)
        test_engraving(page)
        test_first_minute(page)
        test_one_bar_step(page)
        test_two_bar_step(page)
        test_long_steps(page)
        test_picker(page)
        test_picker_leave(page)
        test_wrong_pad(page)
        test_verdict_reasons(page)
        test_riff_bass(page)
        test_riff_keys(page)
        test_beat_light(page)
        test_follow_me(page)
        test_warmup_story(page)
        test_songs(page)
        test_song_jam(page)
        test_jam_variations(page)
        test_song_choice(page)
        test_playtest_two(page)
        test_resume(page)
        test_my_band(page)
        test_eighths_song(page)
        test_quaver_song(page)
        test_teacher_codes(page)
        test_dashboard(page)
        test_rest_of_app(page)
        page.close()
        test_layout(browser)
        test_studio_layout(browser)
        browser.close()
    server.shutdown()
    check('No script errors', not errors, errors[:3])
    failed = results.count(False)
    print('\n%d checks, %d failed' % (len(results), failed))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())

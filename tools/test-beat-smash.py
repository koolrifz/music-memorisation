#!/usr/bin/env python3
"""Browser tests for Beat Smash (Phase 1: the first minute and Tango).

    pip install playwright           (once; it drives your own Google Chrome)
    python tools/test-beat-smash.py

It serves the app from this folder, opens it in headless Chrome at phone
size, and PLAYS it by pressing the real pads with the mouse and the
keyboard, in time with the audio clock: the first minute, all three of
Tango's steps, a missed take, the big take's comeback rule, the part
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
    """Press pad `index` (or `key`) at ctx_time on the audio clock."""
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
                             " rests: bsmash.take.rests.map(r => [r.t, r.end]), delay: bsmash.delay }")
        if take:
            return take
        time.sleep(0.05)
    return None


def wait_take_done(page, timeout=15):
    page.wait_for_function('!bsmash || !bsmash.take || bsmash.take.done', timeout=timeout * 1000)


def play_take(page, skip=(), rest_tap=False, use_key=None):
    """Play the take that is coming: every note on time, except the note
    indexes in `skip`; with rest_tap, one tap in the first rest too."""
    take = wait_for_take(page)
    if not take:
        return None
    offset = clock_offset(page)
    pads = page.locator('#beat-pads .krpad').count()
    presses = [(t, i) for i, t in enumerate(take['notes']) if i not in skip]
    if rest_tap and take['rests']:
        r0, r1 = take['rests'][0]
        presses.append(((r0 + r1) / 2, -1))
    presses.sort()
    for t, i in presses:
        beat = int(round((t - take['start']) / 0.6)) % 4
        press_at(page, offset, t + take['delay'], index=beat if pads == 4 else 0, key=use_key)
    wait_take_done(page)
    return take


def play_until(page, predicate, limit=12, **kw):
    for _ in range(limit):
        if page.evaluate(predicate):
            return True
        if screen(page) == 'beat-screen-player':
            return True
        play_take(page, **kw)
        page.wait_for_timeout(300)
    return page.evaluate(predicate)


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
        bsmash = null;
        return { failed, lines, stomp: [rstompSlotsPerBar, rstompSlotValue] };
    })()""")
    check('Every Tango bar draws as notation, through Stomp Lab\'s own renderer', drawn['failed'] == 0, drawn)
    check('Four bars take two lines on a phone', drawn['lines'] == 2, drawn['lines'])
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
    # Off-beat taps: they sound, nothing lights, nothing fails.
    offset = clock_offset(page)
    start = page.evaluate('bsmashBand.start')
    now = page.evaluate('raudioCtx.currentTime')
    beat = int((now - start) / 0.6) + 2
    for k in range(3):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.3, index=k)
    check('Off-beat taps don\'t fill the meter', page.evaluate('bsmash.jam.meter') == 0, page.evaluate('bsmash.jam.meter'))
    # Back on the beat: a wobbly start doesn't stop the meter filling, and
    # four taps are no longer enough - the jam is the student's to keep.
    beat += 4
    for k in range(8):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.04, index=k % 4)
    page.wait_for_timeout(200)
    check('Back on the beat after a wobbly start: the meter fills, the pads stay pads',
          page.evaluate('bsmash.jam.meter') >= 3 and not page.evaluate('bsmash.jam.morphed')
          and page.is_hidden('#beat-jam-next'), page.evaluate('bsmash.jam.meter'))
    # Hold the beat, with a steady 40 ms of "device delay", until the meter is full.
    beat += 4
    for k in range(40):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.04, index=k % 4)
        if page.evaluate('bsmash.jam.full'):
            break
    page.wait_for_timeout(300)
    parts = page.evaluate('Object.keys(bsmashBand.parts).sort()')
    check('Holding the beat builds the band: the bass and keys join in', parts == ['bass', 'drums', 'keys'], parts)
    check('About 15 seconds of steady beat fills the meter, and "Show me what I played" appears',
          page.evaluate('bsmash.jam.full') and page.is_visible('#beat-jam-next'), page.evaluate('bsmash.jam.meter'))
    page.wait_for_timeout(1500)
    check('...and the jam carries on until they press it', not page.evaluate('bsmash.jam.morphed'))
    page.click('#beat-jam-next')
    page.wait_for_timeout(300)
    check('Show me: the pads turn into four quarter notes',
          page.evaluate('bsmash.jam.morphed') and page.locator('#beat-reading svg').count() == 1)
    check('...and Tango says so', "That's what you just played" in guide(page), guide(page))
    check('...and the band steps back to Tango alone', page.evaluate('Object.keys(bsmashBand.parts)') == ['drums'])
    delay = page.evaluate('bsmashDelay()')
    check('The device delay is measured and stored', 0.0 <= delay < 0.2, round(delay, 3))
    test = page.evaluate('bsmashLoad().beatTests[0]')
    check('The jam is a beat test: taps, lean, steadiness and % on the beat are kept',
          test and test['taps'] >= 20 and test['onBeat'] >= 80 and 0 <= test['leanMs'] < 200 and test['steadyMs'] < 80, test)
    page.wait_for_function("bsmash && bsmash.mode === 'steps'", timeout=10000)
    check('Then the first roll: Tango\'s one-bar step', state(page)['step'] == 1 and state(page)['scaffold'] == 'star1')


def test_one_bar_step(page):
    # The first star: the picture go, the reveal, then the notation go.
    take = play_take(page)
    check('The first star starts from the picture', take is not None and page.evaluate("bsmash.take.go") == 'picture')
    check('A clean picture go: the bar glows', page.evaluate("document.getElementById('beat-reading').classList.contains('clean')"))
    page.wait_for_timeout(200)
    check('...then the picture morphs into notation', state(page)['phase'] == 'reveal', state(page)['phase'])
    take = play_take(page)
    check('...and the same bar is played again from the notation', page.evaluate("bsmash.take.go") == 'notation')
    page.wait_for_timeout(500)
    check('The first star lands', record(page)['streak'] == 1, record(page))
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
    check('The age is stored on the player', page.evaluate('bsmashPlayer().age') == '6-8')
    check('The picture choice appears after the first star', page.evaluate("!document.getElementById('beat-picture-choice').hidden"))

    # The second star: the picture only during the count-in.
    take = wait_for_take(page)
    check('The second star reads from notation', state(page)['scaffold'] == 'star2' and state(page)['take']['go'] == 'notation')
    check('...with the picture shown during the count-in', page.evaluate("bsmash.showing") == 'picture')
    play_take(page)
    check('...which gave way to the notation before beat 1', page.evaluate("bsmash.showing") == 'notation')
    page.wait_for_timeout(500)
    check('Two stars', record(page)['streak'] == 2, record(page))

    # A miss on the third star: the stars empty, the same bar is retaken.
    wait_for_take(page)
    bars_before = page.evaluate("bsmash.bars.map(b => b.join()).join('|')")
    play_take(page, skip=(0,))
    page.wait_for_timeout(300)
    check('A missed note: "Take two!"', 'Take two' in guide(page), guide(page))
    check('...the row of stars empties', record(page)['streak'] == 0 and page.evaluate(
        "document.querySelectorAll('#beat-stars .bsmash-star.full').length") == 0)
    check('...and the wrong note is marked below the staff, not over it',
          page.locator('#beat-reading .bsmash-under .bsmash-miss').count() >= 1)
    wait_for_take(page)
    check('...then the SAME bar again, as practice', state(page)['scaffold'] == 'retake'
          and page.evaluate("bsmash.bars.map(b => b.join()).join('|')") == bars_before)
    play_take(page, rest_tap=True) if page.evaluate("bsmash.take.rests.length") else play_take(page, skip=(0,))
    page.wait_for_timeout(300)
    check('A tap in a rest is not clean either', 'Take two' in guide(page) and state(page)['scaffold'] == 'retake', guide(page))
    play_take(page)
    page.wait_for_timeout(1800)
    check('A clean retake earns no star; a new roll starts again at the first star',
          record(page)['streak'] == 0, record(page))
    ok = play_until(page, "bsmashMusicianRecord('drums').step === 2", limit=12)
    check('Three clean takes in a row clear the one-bar step', ok, record(page))


def test_two_bar_step(page):
    page.wait_for_function("bsmash && bsmash.step === 2", timeout=15000)
    wait_for_take(page)
    check('The two-bar step reads two bars', page.evaluate('bsmash.specs.length') == 2)
    check('...on one big pad (the default)', page.locator('#beat-pads .krpad').count() == 1)
    # Played on the keyboard: Space is the big pad.
    ok = play_until(page, "bsmashMusicianRecord('drums').step === 3", limit=10, use_key=' ')
    check('Three clean two-bar takes, played on the Space bar, open the big take', ok, record(page))


def test_big_take(page):
    page.wait_for_function("bsmash && bsmash.phase === 'ready'", timeout=15000)
    check('The big take waits: four bars, Record and New roll',
          page.evaluate('bsmash.specs.length') == 4 and page.is_visible('#beat-actions'))
    first = page.evaluate("bsmash.bars.map(b => b.join()).join('|')")
    page.click('#beat-actions .btn-secondary')
    page.wait_for_function("bsmash.phase === 'ready'", timeout=8000)
    check('New roll gives new bars', page.evaluate("bsmash.bars.map(b => b.join()).join('|')") != first)

    # Lose a note, and the first note of the next bar too: the bar is lost.
    page.click('#beat-actions .bsmash-record')
    take = wait_for_take(page)
    bars = take['noteBars']
    lost = [0] + [i for i, b in enumerate(bars) if b >= bars[0] + 1][:1]
    play_take(page, skip=tuple(lost))
    page.wait_for_timeout(300)
    check('Losing a note AND the next beat 1 loses the bar: "Take two!"', page.evaluate("bsmash.take.lostBar")
          and state(page)['phase'] in ('verdict', 'ready') and 'Take two' in guide(page), guide(page))
    page.wait_for_function("bsmash.phase === 'ready'", timeout=8000)

    # Lose one note, come back in on the next bar: that's a take.
    page.click('#beat-actions .bsmash-record')
    wait_for_take(page)
    play_take(page, skip=(0,))
    check('One note lost, back in by the next beat 1: the big take lands',
          page.evaluate("bsmash.take.cameBack && !bsmash.take.lostBar"), guide(page))
    page.wait_for_function("(document.querySelector('#view-beat .screen.active') || {}).id === 'beat-screen-picker'", timeout=4000)
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
    check('...Tango says so', 'Spicy drums, locked in' in guide(page, 'beat-picker-guide'), guide(page, 'beat-picker-guide'))
    check('...and the drums channel lights on the desk',
          page.evaluate("document.querySelector('#beat-picker-desk .bsmash-channel').classList.contains('lit')"))
    page.wait_for_selector('#beat-picker-done', state='visible', timeout=6000)
    check('Playback: the band, loud', page.evaluate("bsmashBandBus.gain.value") > 0.8 or
          page.evaluate("bsmashBand.parts.drums") == 'spicy')
    page.click('#beat-picker-done')
    page.wait_for_timeout(500)
    check('Back on the pathway, Tango shows as won', page.evaluate(
        "document.querySelector('#beat-pathway-track .pathway-node').classList.contains('cleared')"))
    check('Riff is next, and not built yet', page.evaluate(
        "document.querySelector('#beat-pathway-track .pathway-node:nth-child(2)').disabled"))
    check('Leaving the studio stops the band', page.evaluate('bsmashBand === null'))
    chips = page.evaluate("[...document.querySelectorAll('#beat-steps .bsmash-chip')].map(c => c.textContent)")
    check('Every step reached can be played again, the warm-up too', chips == ['Warm-up', 'One bar', 'Two bars', 'The big take', 'My band'], chips)
    page.click('#beat-steps .bsmash-chip:nth-child(2)')
    page.click('#beat-pathway-start')
    page.wait_for_function("bsmash && bsmash.mode === 'steps' && bsmash.take", timeout=10000)
    check('...One bar again, from an empty row of stars, with Tango still won',
          state(page)['step'] == 1 and state(page)['streak'] == 0 and record(page)['won'] and record(page)['step'] == 3)
    play_take(page)
    page.wait_for_timeout(300)
    play_take(page)
    page.wait_for_timeout(600)
    check('...its stars fill as usual, and nothing already won is touched',
          state(page)['streak'] == 1 and record(page)['won'] and record(page)['step'] == 3, (state(page), record(page)))
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


def test_picker_leave(page):
    """Leaving the picker without Keep never loses the musician."""
    fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam',age:'9-10'}],current:'p1'}));"
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,firstStar:true,"
                "musicians:{drums:{step:3,streak:0,clean:9,won:false,part:null,plays:1}}}}}));")
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


def test_layout(browser):
    """The big take (four bars, Record, one big pad) and the one-bar step
    (four beat pads) on a phone, a small phone and a Chromebook."""
    for size in ({'width': 390, 'height': 844}, {'width': 360, 'height': 640}, {'width': 1366, 'height': 657}):
        for step in (3, 1):
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
                const record = document.querySelector('#beat-actions .bsmash-record');
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
            name = '%dx%d, %s' % (size['width'], size['height'], 'four pads' if step == 1 else 'the big take')
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
    peak = page.evaluate("""(async () => {
        const B = BeatSmashBand;
        let loudest = 0;
        for (const song of Object.keys(KR.songs)) for (const comp of ['whole'].concat(BeatSmashBand.song(song).comp.pumps.map((r, i) => 'pumps#' + i))) {
            const ctx = new OfflineAudioContext(1, 32000 * B.LOOP, 32000);
            const live = ctx.createGain(); live.gain.value = BSMASH_LIVE_SCALE; live.connect(ctx.destination);
            B.schedulePart(ctx, live, 'warmup', 'tango', 0);
            B.schedulePart(ctx, live, 'bass', 'song:' + song + ':' + comp, 0);
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
                "localStorage.setItem('koolRiffsBeatProgress', JSON.stringify({players:{p1:{jamDone:true,settings:{jamSong:'ab-6dim'},"
                "musicians:{drums:{step:1,streak:0,clean:0,won:false,part:null,plays:1}}}}}));")
    page.click('.game-card.red')
    page.wait_for_timeout(400)
    songs = page.evaluate("[...document.querySelectorAll('#beat-settings .bsmash-setting')].map(r => r.textContent)")
    check('The pathway offers a jam song', any('Jam song' in r and 'A♭' in r for r in songs), songs)
    page.click('#beat-steps .bsmash-chip:nth-child(1)')
    page.click('#beat-pathway-start')
    page.wait_for_timeout(600)
    offset = clock_offset(page)
    start = page.evaluate('bsmashBand.start')
    beat = int((page.evaluate('raudioCtx.currentTime') - start) / 0.6) + 2
    parts = {}
    for k in range(40):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.04, index=k % 4)
        meter = page.evaluate('bsmash.jam.meter')
        if meter in (10, 18):
            parts[meter] = page.evaluate('Object.assign({}, bsmashBand.parts)')
        if page.evaluate('bsmash.jam.full'):
            break
    beat += k + 1
    check('Over Rob\'s song the bass joins in whole notes', parts.get(10, {}).get('bass') == 'song:ab-6dim:whole', parts)
    check('...then the keys, his voicings in whole notes', parts.get(18, {}).get('keys') == 'song:ab-6dim:whole', parts)
    full = page.evaluate('Object.assign({}, bsmashBand.parts)')
    check('...and a full meter brings his pumps, bass and keys together',
          full.get('keys') == 'song:ab-6dim:pumps' and full.get('bass') == 'song:ab-6dim:pumps', full)
    # Lose the beat: taps half a beat out.
    for k in range(4):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.34, index=k % 4)
    page.wait_for_timeout(600)
    sag = page.evaluate('[bsmash.jam.sag, bsmashSagFilter.frequency.value]')
    check('Losing the beat: the band sinks (muffled and quieter), cleanly, not in steps', sag[0] > 0.3 and sag[1] < 8000, sag)
    beat += 4
    for k in range(5):
        press_at(page, offset, start + (beat + k) * 0.6 + 0.04, index=k % 4)
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


def code(page, text):
    page.evaluate("launchGame('view-dashboard'); toggleCredits(true)")
    page.fill('#kr-code-input', text)
    page.click('#modal-credits .kr-code-btn')
    page.wait_for_timeout(200)
    return page.inner_text('#kr-code-result')


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
    check('...Beat Smash: every step open', chips == ['Warm-up', 'One bar', 'Two bars', 'The big take'], chips)
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


def main():
    server = serve()
    with sync_playwright() as p:
        browser = launch(p)
        page = new_page(browser)
        test_engraving(page)
        test_first_minute(page)
        test_one_bar_step(page)
        test_two_bar_step(page)
        test_big_take(page)
        test_picker(page)
        test_picker_leave(page)
        test_songs(page)
        test_song_jam(page)
        test_teacher_codes(page)
        test_rest_of_app(page)
        page.close()
        test_layout(browser)
        browser.close()
    server.shutdown()
    check('No script errors', not errors, errors[:3])
    failed = results.count(False)
    print('\n%d checks, %d failed' % (len(results), failed))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())

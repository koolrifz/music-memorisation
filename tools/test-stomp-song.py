#!/usr/bin/env python3
"""Browser test for Stomp the Beat, the song (stomp-song.js).

    pip install playwright           (once)
    python tools/test-stomp-song.py

Opens the song, rolls a 1-bar hurdle and taps it with synthetic pointer events
timed off the AUDIO clock and the beat map: pad -> KRPads -> tap list -> grade
-> result. Pure logic: node tools/test-stomp-song.js. Run tools/check-text.py too.
No network? Set KR_VEXFLOW to a local vexflow-min.js (3.0.9).
"""
import functools, http.server, os, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8794
VEXFLOW_CDN = 'https://cdn.jsdelivr.net/npm/vexflow@3.0.9/releases/vexflow-min.js'
results = []

def check(name, ok, detail=''):
    results.append(ok)
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  (' + str(detail) + ')') if detail != '' else ''))

# Tap each note of the planned take, `shift` seconds off, once the song is rolling.
TAP = """async ({shift, extra}) => {
    const ctx = rstompAudio();
    for (let i = 0; i < 200 && !(ssong.state === 'lead' || ssong.state === 'rec'); i++) await new Promise(r => setTimeout(r, 25));
    const pad = document.querySelector('#ssong-pad .krpad');
    const times = ssong.plan.onsets.map(o => o.t).concat(extra || []);
    times.forEach(t => {
        // The device delay is taken off every tap, so a tap meant to land on
        // the note is sent that much later, as a real player's would be.
        const wait = (ssong.punchClock + t + shift + ssong.delay.delay - ctx.currentTime) * 1000;
        if (wait < 0) return;
        setTimeout(() => {
            pad.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 9, bubbles: true}));
            pad.dispatchEvent(new PointerEvent('pointerup', {pointerId: 9, bubbles: true}));
        }, wait);
    });
    return times.length;
}"""

def main():
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width': 390, 'height': 800})
        page.on('pageerror', lambda e: errors.append(str(e)))
        local = os.environ.get('KR_VEXFLOW')
        if local:
            page.route(VEXFLOW_CDN, lambda route: route.fulfill(path=local, content_type='application/javascript'))
        page.route('**/fonts.googleapis.com/**', lambda route: route.abort())
        page.goto('http://127.0.0.1:%d/index.html' % PORT)
        page.evaluate("localStorage.setItem('koolRiffsOpenAll','1'); localStorage.removeItem('koolRiffsStompSong')")
        page.reload()
        page.evaluate("""() => { document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-beat').classList.add('active'); showBeatSongs(); }""")
        check('the song has a tile on the song chooser', page.is_visible('.ssong-tile'))
        page.click('.ssong-tile')
        page.wait_for_selector('#ssong-screen-menu.active', timeout=4000)
        text = page.inner_text('#ssong-menu-body')
        check('menu shows no raw ids', '[ssong' not in text and '[note' not in text, text[:80])
        low = text.lower()
        check('menu has free play and both rounds', 'free play' in low and 'round 1' in low and 'round 2' in low)
        check('five hurdles in round 1 plus the two records', page.locator('.ssong-chip').count() >= 6, page.locator('.ssong-chip').count())

        # the audio loads and decodes, and the mp3's length is the file's
        ok = page.evaluate("""async () => { await ssongLoadAssets(); const b = ssongBuffers[ssong.song.audio];
            return [b.duration, b.sampleRate]; }""")
        check('the song decodes (about 172 s)', 171 < ok[0] < 173.5, ok)

        # a 1-bar hurdle, played well
        page.click('.ssong-chip[data-round="crotchets"][data-hurdle="1"]')
        page.wait_for_selector('#ssong-screen-play.active', timeout=4000)
        check('the notation is drawn', page.locator('#ssong-reading svg').count() >= 1)
        check('no raw ids on the take screen', '[ssong' not in page.inner_text('#ssong-screen-play'))
        page.click('#ssong-go')
        page.wait_for_function("ssong.state === 'lead'", timeout=10000)
        vis = page.evaluate("""() => ['ssong-go','ssong-stop','ssong-guide','ssong-wait'].filter(id => document.getElementById(id).offsetParent !== null)""")
        check('while the lead plays: only Stop and the WAIT sign, no Roll tape', vis == ['ssong-stop', 'ssong-wait'], vis)
        page.evaluate("document.querySelector('#ssong-pad .krpad').dispatchEvent(new PointerEvent('pointerdown', {pointerId: 3, bubbles: true})); document.querySelector('#ssong-pad .krpad').dispatchEvent(new PointerEvent('pointerup', {pointerId: 3, bubbles: true}))")
        check('a tap before the count is not on the record', page.evaluate('ssong.taps.length') == 0)
        page.evaluate(TAP, {'shift': 0.02})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        g = page.evaluate('window.ssongLast')
        check('a good take passes', g['passed'] and g['grade']['hits'] == 4, (g['grade']['hits'], g['grade']['leanMs']))
        vis = page.evaluate("""() => ['ssong-go','ssong-stop','ssong-guide','ssong-wait'].filter(id => document.getElementById(id).offsetParent !== null)""")
        check('after the take: none of the rolling buttons, only the result', vis == [], vis)
        # the dots sit under the noteheads' centres
        gap = page.evaluate("""() => {
            const heads = [...document.querySelectorAll('#ssong-reading .vf-notehead')].map(h => { const r = h.getBoundingClientRect(); return r.left + r.width / 2; });
            const dots = [...document.querySelectorAll('#ssong-reading .ssong-dot')].map(d => { const r = d.getBoundingClientRect(); return r.left + r.width / 2; });
            if (heads.length !== dots.length || !heads.length) return [heads.length, dots.length];
            return Math.max(...heads.map((h, i) => Math.abs(h - dots[i])));
        }""")
        check('the dots are under the noteheads (within 2 px)', isinstance(gap, (int, float)) and gap <= 2, gap)
        check('and earns a star', page.evaluate("KRStompSong.hurdleState(ssong.progress, 'crotchets', '1').stars") == 1)
        page.reload()

        # a take with one note missed
        page.evaluate("""() => { document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-beat').classList.add('active'); showBeatSongs(); }""")
        page.click('.ssong-tile')
        page.click('.ssong-chip[data-round="crotchets"][data-hurdle="1"]')
        page.click('#ssong-go')
        page.evaluate("ssongPress = (orig => press => orig(press))(ssongPress); 0")
        page.evaluate(TAP, {'shift': 0.02, 'extra': [2.3]})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        g = page.evaluate('window.ssongLast')
        check('a stray tap spoils the take', not g['passed'] and not g['grade']['perfect'])

        # THE RUN: every step of the ladder plans and draws (the whole Stomp Lab engine)
        page.click('#view-beat .btn-back')
        page.wait_for_selector('#ssong-screen-menu.active', timeout=4000)
        check('the run: one question, how many playing, 1 by default',
              page.evaluate("document.querySelector('.ssong-player-chip.on').dataset.players") == '1')
        sweep = page.evaluate("""() => {
            ssongOpenRun(); ssongHalt(); ssong.mode = 'run';
            const bad = [];
            for (let i = 0; i < ssong.ladder.length; i++) {
                ssong.run.step = i;
                try { ssongPrepareRun(); } catch (e) { bad.push(i + ':' + e.message); continue; }
                const svg = document.querySelectorAll('#ssong-reading svg').length;
                if (!svg || !ssong.plan.onsets.length || ssong.layout.length !== ssong.plan.bars) bad.push(i + ':empty');
                if (ssong.plan.from + ssong.plan.bars > KRStompSong.totalBars(ssong.beats)) bad.push(i + ':spot');
            }
            ssong.run.step = 0; ssongPrepareRun();
            return [ssong.ladder.length, bad];
        }""")
        check('every ladder step plans and draws', not sweep[1] and sweep[0] > 50, sweep)
        check('no level name on the run screen', page.inner_text('#ssong-label').startswith('Take'), page.inner_text('#ssong-label'))
        check('no guide button in the run', page.evaluate("document.getElementById('ssong-guide').offsetParent === null"))
        page.click('#ssong-go')
        page.evaluate(TAP, {'shift': 0.02})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        check('a clean take moves the run on', page.evaluate('ssong.run.step') == 1 and page.evaluate('window.ssongLast.passed'))
        page.wait_for_function("ssong.state === 'lead' || ssong.state === 'rec'", timeout=8000)
        check('and the next take rolls on its own', page.evaluate('ssong.run.takes') == 1)
        page.evaluate(TAP, {'shift': 0.02, 'extra': [0.25]})   # a stray between beats
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        check('one player: a miss ends the run', page.evaluate('ssong.run.over'))
        txt = page.inner_text('#ssong-result')
        check('the end says Try Another One, with the on-beat / rushed / dragged split, and offers to go again',
              'Try Another One' in txt and page.locator('#ssong-result-split .ssong-split-chip').count() == 3
              and page.locator('#ssong-result-actions button').count() >= 2, txt)
        check('...and Tango says what went wrong (the stray, the timing being clean)',
              'extra tap' in page.inner_text('#ssong-play-guide').lower(), page.inner_text('#ssong-play-guide'))
        check('Try another one starts the same rung again', page.evaluate("""() => { const at = ssong.run.step;
            document.querySelector('#ssong-result-actions .btn-start').click(); const ok = ssong.run.step === at && !ssong.run.over; ssongHalt(); return ok; }"""))
        # a quaver level plays clean too
        page.evaluate("ssongOpenRun(); ssongHalt(); ssong.mode = 'run'; ssong.run.step = ssong.ladder.findIndex(s => s.levelId === '10'); ssongPrepareRun()")
        page.click('#ssong-go')
        page.evaluate(TAP, {'shift': 0.01})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        g = page.evaluate('window.ssongLast')
        check('a quaver level (B1) taken clean passes', g['passed'], (g['grade']['hits'], g['grade']['notes'], g['grade']['issues'][:2]))
        gap = page.evaluate("""() => {
            const heads = [...document.querySelectorAll('#ssong-reading .vf-notehead')].map(h => { const r = h.getBoundingClientRect(); return r.left + r.width / 2; });
            const dots = [...document.querySelectorAll('#ssong-reading .ssong-dot:not(.stray)')].map(d => { const r = d.getBoundingClientRect(); return r.left + r.width / 2; });
            if (!heads.length || !dots.length) return [heads.length, dots.length];
            return Math.max(...dots.map(d => Math.min(...heads.map(h => Math.abs(h - d)))));
        }""")
        check('quaver dots under their noteheads (within 2 px)', isinstance(gap, (int, float)) and gap <= 2, gap)
        page.evaluate("ssongCancelNext(); ssongHalt()")
        # the relay
        r = page.evaluate("""() => { ssong.settings.players = 2; ssongOpenRun(); ssongHalt(); ssong.mode = 'run';
            const g = KRStompSong.grade(ssong.plan, []); ssongEndTake(g); const out = KRStompSong.runTake(ssong.run, false);
            ssongShowRunResult(g, false, out); return [out.next, ssong.run.player, ssongEl('ssong-result-actions').innerText]; }""")
        check('two players: a miss hands over to Player 2', r[0] == 'turn' and r[1] == 1 and '2' in r[2], r)
        # After a record there is always a way on: silver -> gold -> round 2 -> the run.
        nxt = page.evaluate("""() => {
            const out = [], rs = ssong.song.rounds;
            const at = (ri, hi, sid) => { ssong.ri = ri; ssong.hi = hi; ssong.round = rs[ri];
                ssong.hurdle = rs[ri].hurdles[hi]; ssong.session = sid; return ssongNextStep().textId; };
            const r0 = rs[0].hurdles, last0 = r0.length - 1, rec = r0[last0];
            out.push(at(0, last0, rec.sessions[0].id));
            out.push(at(0, last0, rec.sessions[rec.sessions.length - 1].id));
            const r1 = rs[1].hurdles, last1 = r1.length - 1;
            out.push(at(1, last1, r1[last1].sessions[r1[last1].sessions.length - 1].id));
            return out; }""")
        check('after a record: next record, then next round, then the run',
              nxt == ['ssong.next.session', 'ssong.next.round', 'ssong.next.run'], nxt)
        page.evaluate("ssong.settings.players = 1; ssongSave(); ssongOpenHurdle(0, 0, null)")

        # Back goes to the menu, then to the chooser
        page.click('#view-beat .btn-back')
        check('back from a take goes to the song menu', page.is_visible('#ssong-screen-menu'))
        page.click('#view-beat .btn-back')
        check('back from the menu goes to the song chooser', page.is_visible('.ssong-tile'))

        # STOMP THE BEAT: SOUL, the quaver song (Rob, 2026-10-24)
        tiles = page.evaluate("[...document.querySelectorAll('.ssong-tile')].map(t => [t.dataset.stompSong, t.innerText])")
        check('three recorded songs on the chooser, in level order, each with its own name',
              len(tiles) == 3 and [t[0] for t in tiles] == ['stomp-the-beat', 'the-long-hold', 'stomp-the-beat-soul']
              and 'Soul' in tiles[2][1] and 'Level 3 · Splitting the Beat' in tiles[2][1] and 'Level 1' in tiles[0][1]
              and 'The Long Hold' in tiles[1][1] and 'Level 2 · The Held Beat' in tiles[1][1], tiles)
        page.click('.ssong-tile[data-stomp-song="stomp-the-beat-soul"]')
        page.wait_for_selector('#ssong-screen-menu.active', timeout=4000)
        check('its menu carries its own title', page.inner_text('#ssong-title') == 'Stomp the Beat: Soul', page.inner_text('#ssong-title'))
        text = page.inner_text('#ssong-menu-body')
        check('no hurdle rounds, even with the Open code: the run and free play',
              page.locator('.ssong-chip').count() == 0 and 'free play' in text.lower() and "let's go" in text.lower(), text[:120])
        ok = page.evaluate("""async () => { await ssongLoadAssets(); const b = ssongBuffers[ssong.song.audio];
            return [b.duration, b.sampleRate]; }""")
        check('the song decodes (about 216 s)', 215 < ok[0] < 218, ok)
        sweep = page.evaluate("""() => {
            ssongOpenRun(); ssongHalt(); ssong.mode = 'run';
            const bad = [], values = {};
            for (let i = 0; i < ssong.ladder.length; i++) {
                ssong.run.step = i;
                for (let rep = 0; rep < 12; rep++) {
                    try { ssongPrepareRun(); } catch (e) { bad.push(i + ':' + e.message); break; }
                    if (!document.querySelectorAll('#ssong-reading svg').length || !ssong.plan.onsets.length) bad.push(i + ':empty');
                    if (ssong.plan.from + ssong.plan.bars > KRStompSong.totalBars(ssong.beats)) bad.push(i + ':spot');
                    ssong.notation.specBars.forEach(bar => bar.forEach(sp => { values[sp.value] = 1; }));
                }
            }
            ssong.run.step = 0; ssongPrepareRun();
            return [ssong.ladder.map(s => s.levelId), bad, Object.keys(values).sort()];
        }""")
        check('the ladder: the warm-up on the beat, then Splitting the Beat: B1, B3, B4',
              sweep[0] == [None, None, '10', '10', '12', '12', '13', '13'], sweep[0])
        check('every step of it plans and draws', not sweep[1], sweep[1][:5])
        check('crotchets and quavers only: no minim or semibreve anywhere', not set(sweep[2]) & {'w', 'h', 'hd'}, sweep[2])
        # Up a level: the second warm-up take, clean, celebrates, then rolls into B1.
        page.evaluate("ssong.run.step = 1; ssongPrepareRun()")
        page.click('#ssong-go')
        page.evaluate(TAP, {'shift': 0.02})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        page.wait_for_selector('#kr-celebrate.show', timeout=3000)
        cel = page.inner_text('#kr-celebrate')
        check('a clean take that finishes a level: a celebration naming the next',
              'Level up' in cel and 'Next: Paired Quavers' in cel, cel)
        check('...Tango says so', 'level' in page.inner_text('#ssong-play-guide').lower(), page.inner_text('#ssong-play-guide'))
        check('...and the next take waits for it', page.evaluate('ssong.state') == 'result')
        page.wait_for_function("ssong.state === 'lead' || ssong.state === 'rec'", timeout=9000)
        check('...then up they go: the next take is B1, on the quaver grid, by itself',
              page.evaluate('ssong.step.levelId') == '10' and page.evaluate('ssong.notation.grid.slotsPerBar') == 8)
        page.evaluate("ssongCancelNext(); ssongHalt()")

        # THE LONG HOLD, Level 2 (Rob, 2026-10-26): snippets, each in its topic's section
        page.evaluate("""() => { ssongHalt(); document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-beat').classList.add('active'); showBeatSongs(); }""")
        page.click('.ssong-tile[data-stomp-song="the-long-hold"]')
        page.wait_for_selector('#ssong-screen-menu.active', timeout=4000)
        check('The Long Hold: its own title', page.inner_text('#ssong-title') == 'The Long Hold', page.inner_text('#ssong-title'))
        dec = page.evaluate("""async () => { await ssongLoadAssets(); const b = ssongBuffers[ssong.song.audio], c = b.getChannelData(0);
            const first = th => { for (let i = 0; i < c.length; i++) if (Math.abs(c[i]) > th) return i / b.sampleRate; return -1; };
            const k = Math.floor(100 * b.sampleRate); let at = k, m = 0;
            for (let i = k; i < k + b.sampleRate; i++) if (Math.abs(c[i]) > m) { m = Math.abs(c[i]); at = i; }
            return [b.duration, first(0.2), at / b.sampleRate]; }""")
        check('it decodes (about 218.8 s), in line with the WAV the map was built from (within 3 ms)',
              218 < dec[0] < 219.5 and abs(dec[1] - 1.1429) < 0.003 and abs(dec[2] - 100.0923) < 0.003, dec)
        sweep = page.evaluate("""() => {
            ssongOpenRun(); ssongHalt(); ssong.mode = 'run';
            const bad = [], used = {};
            for (let i = 0; i < ssong.ladder.length; i++) {
                ssong.run.step = i;
                const st = ssong.ladder[i], ranges = KRStompSong.runRanges(ssong.song, st.levelId);
                for (let rep = 0; rep < 6; rep++) {
                    try { ssongPrepareRun(); } catch (e) { bad.push(i + ':' + e.message); break; }
                    const p = ssong.plan;
                    if (!document.querySelectorAll('#ssong-reading svg').length || !p.onsets.length) bad.push(i + ':empty');
                    if (!ranges.some(r => p.from >= r.first && p.from + p.bars - 1 <= r.last)) bad.push(i + ':outside ' + p.from);
                    const sec = ssong.song.sections.find(s => p.from >= s.first && p.from <= s.last).id;
                    used[(st.levelId || 'warm')] = (used[(st.levelId || 'warm')] || []).concat(sec);
                }
            }
            ssong.run.step = 0; ssongPrepareRun();
            return [ssong.ladder.map(s => s.levelId), bad, used];
        }""")
        check('its ladder: the warm-up, then the album: half, whole, mixed, all three, strong and weak, ties, dotted half, ties across',
              sweep[0] == [None, None, '2', '2', '1', '1', '3', '3', '5', '5', '6', '6', '7', '7', '8', '8', '9', '9'], sweep[0])
        check('every take plans, draws and sits inside its sections', not sweep[1], sweep[1][:5])
        check('...the dotted half in the Dot section or the breakdown, ties across the barline in the bridge',
              set(sweep[2]['8']) <= {'dot', 'breakdown'} and set(sweep[2]['9']) == {'bridge'}, sweep[2])
        page.evaluate("ssong.run.step = ssong.ladder.findIndex(s => s.levelId === '8'); ssongPrepareRun()")
        page.click('#ssong-go')
        page.evaluate(TAP, {'shift': 0.02})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        g = page.evaluate('window.ssongLast')
        check('a dotted-half take, played well in the Dot section, passes', g['passed'] and g['grade']['hits'] == g['grade']['notes'],
              (g['grade']['hits'], g['grade']['notes'], g['plan']['from']))
        page.evaluate("ssongCancelNext(); ssongHalt()")

        # BEAT SMASH'S MENU, THE WARM-UP AND RECALIBRATE (Rob, 2026-10-24)
        page.evaluate("localStorage.clear()")
        page.reload()
        page.evaluate("KR.speak = () => {}; enterBeatSmash()")
        page.wait_for_selector('#beat-screen-pathway.active', timeout=4000)
        ids = page.evaluate("[...document.querySelectorAll('#beat-pathway-track .kr-track')].map(n => n.dataset.id + (n.disabled ? '-' : '+'))")
        check('the menu: the warm-up, Level 1 and Level 3 (locked), nothing else',
              ids == ['warm+', 'stomp-the-beat-', 'the-long-hold-', 'stomp-the-beat-soul-'], ids)
        menu = page.inner_text('#beat-screen-pathway')
        check('...named as Rob asked', 'Warm-up with Tango' in menu and 'Level 1 · Stomp the Beat' in menu and 'Level 2 · The Long Hold' in menu and 'Level 3 · Stomp the Beat' in menu, menu)
        hidden = page.evaluate("['beat-player-chip', 'beat-steps', 'beat-settings'].map(id => document.getElementById(id).offsetParent === null)")
        check('no name, no step chips, no instrument settings', hidden == [True, True, True], hidden)
        check('Re-time my taps is now Recalibrate my beat', page.inner_text('#beat-retune').lower() == 'recalibrate my beat', page.inner_text('#beat-retune'))
        page.click('#beat-pathway-start')
        page.wait_for_selector('#ssong-screen-warm.active', timeout=4000)
        cards = page.evaluate("[...document.querySelectorAll('.ssong-warm-card')].map(c => c.dataset.song + (c.classList.contains('locked') ? '-' : '+'))")
        check('the warm-up: Tango asks for a tune, Stomp the Beat first and open, the next locked',
              cards == ['stomp-the-beat+', 'the-long-hold-', 'stomp-the-beat-soul-'] and 'pick a tune' in page.inner_text('#ssong-warm-guide').lower(), cards)
        page.click('.ssong-warm-card[data-song="stomp-the-beat"]')
        page.wait_for_selector('#ssong-screen-play.active', timeout=4000)
        check('the drum room: Tango at her kit, and the round clock', page.is_visible('#ssong-kit') and page.is_visible('#ssong-timer'))
        WARM = """async ({shift, every}) => {
            const ctx = rstompAudio();
            for (let i = 0; i < 400 && ssong.state !== 'playing'; i++) await new Promise(r => setTimeout(r, 25));
            const pad = document.querySelector('#ssong-pad .krpad');
            const beats = ssong.beats.filter((b, k) => k >= 4 && b <= ssong.warmSeconds);
            beats.forEach((b, i) => { if (i % every) return;
                const wait = (ssong.freeStart + b + shift + ssong.delay.delay - ctx.currentTime) * 1000;
                if (wait < 0) return;
                setTimeout(() => { pad.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 9, bubbles: true}));
                    pad.dispatchEvent(new PointerEvent('pointerup', {pointerId: 9, bubbles: true})); }, wait); });
            return beats.length; }"""
        page.evaluate("KRStompSong.WARM_SECONDS = 10")       # a short round, to keep the test quick
        page.click('#ssong-go')
        page.evaluate(WARM, {'shift': -0.12, 'every': 1})
        page.wait_for_selector('#ssong-summary:not([hidden])', timeout=30000)
        w = page.evaluate('window.ssongLastWarm')
        check('a rushed round: Try Another One, 100% rushed, and Tango says slow down',
              not w['passed'] and w['rushedPct'] == 100 and 'Try Another One' in page.inner_text('#ssong-summary')
              and 'slow down' in page.inner_text('#ssong-play-guide').lower(), [w, page.inner_text('#ssong-play-guide')])
        check('...and the level is still shut', page.evaluate("ssongLevelOpen('stomp-the-beat')") is False)
        page.click('#ssong-summary-actions .btn-start')            # Another round
        page.click('#ssong-go')
        page.evaluate(WARM, {'shift': 0.01, 'every': 1})
        page.wait_for_selector('#ssong-summary:not([hidden])', timeout=30000)
        w = page.evaluate('window.ssongLastWarm')
        check("the beat kept: That's a Take, and the rest of the song opens",
              w['passed'] and "That's a Take" in page.inner_text('#ssong-summary') and page.evaluate("ssongLevelOpen('stomp-the-beat')"), w)
        page.wait_for_selector('#kr-celebrate.show', timeout=3000)
        page.click('#kr-celebrate')
        check('...with the way into Level 1 first', 'level 1' in page.inner_text('#ssong-summary-actions .btn-start').lower(), page.inner_text('#ssong-summary-actions'))
        page.click('#ssong-summary-actions .btn-start')
        page.wait_for_function("ssong && ssong.mode === 'run'", timeout=4000)
        check('...into the run, on the drum room screen', page.is_visible('#ssong-kit') and page.evaluate('ssong.run.step') == 0)
        page.evaluate("ssong.run.step = 3; ssongPrepareRun(); ssongSave()")
        page.click('#view-beat .btn-back')
        page.wait_for_selector('#beat-screen-pathway.active', timeout=4000)
        check('Back goes to the menu, which carries on where they were',
              page.text_content('#beat-pathway-start') == 'Carry on' and 'Welcome back' in page.inner_text('#beat-pathway-guide'),
              [page.text_content('#beat-pathway-start'), page.inner_text('#beat-pathway-guide')])
        page.click('#beat-pathway-start')
        page.wait_for_function("ssong && ssong.mode === 'run'", timeout=4000)
        check('...Carry on: the same level and the same mini level', page.evaluate('ssong.run.step') == 3, page.evaluate('ssong.run.step'))
        page.evaluate("ssongHalt()")
        page.reload()
        page.evaluate("KR.speak = () => {}; enterBeatSmash()")
        check('...and after the page is closed and opened again', page.text_content('#beat-pathway-start') == 'Carry on'
              and page.evaluate('ssongMenuSelected') == 'stomp-the-beat')
        page.click('#beat-pathway-track [data-id=warm]')
        check('the warm-up record carries on with the last tune', page.text_content('#beat-pathway-start') == 'Carry on')
        # Recalibrate my beat: the tap test sets the delay; fine tune moves it; reset forgets it.
        page.click('#beat-retune')
        check('Recalibrate opens a box of settings', page.is_visible('#beat-calibrate') and 'not measured' in page.inner_text('#beat-cal-now'))
        page.click('#beat-cal-test')
        page.evaluate("""() => { const ctx = rstompAudio(); const pad = document.querySelector('#beat-cal-pad .krpad');
            bsmashCal.clicks.forEach(c => { const wait = (c + 0.045 - ctx.currentTime) * 1000; setTimeout(() => {
                pad.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 7, bubbles: true}));
                pad.dispatchEvent(new PointerEvent('pointerup', {pointerId: 7, bubbles: true})); }, wait); }); }""")
        page.wait_for_function("window.bsmashLastCal", timeout=20000)
        cal = page.evaluate('window.bsmashLastCal')
        check('the tap test measures the delay from the click to the tap (45 ms)', cal['delay'] is not None and 0.03 < cal['delay'] < 0.07, cal)
        check('...and saves it for every game that grades taps', abs(page.evaluate('rstompRoundDelay().delay') - cal['delay']) < 0.002
              and 'Done' in page.inner_text('#beat-cal-status'))
        page.click('#beat-cal-later')
        check('fine tune adds 10 ms', abs(page.evaluate('rstompRoundDelay().delay') - cal['delay'] - 0.01) < 0.002)
        page.click('#beat-cal-reset')
        check('reset forgets it', 'not measured' in page.inner_text('#beat-cal-now'))
        page.click('#beat-cal-close')
        check('Done closes the box', not page.is_visible('#beat-calibrate'))
        check('no page errors', not errors, errors)
        browser.close()
    server.shutdown()
    print('%d/%d passed' % (sum(results), len(results)))
    raise SystemExit(0 if all(results) else 1)

main()

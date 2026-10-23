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
        check('the end says how far, and offers to go again', 'run' in txt.lower() and page.locator('#ssong-result-actions button').count() >= 2, txt)
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
        page.evaluate("ssong.settings.players = 1; ssongSave(); ssongOpenHurdle(0, 0, null)")

        # Back goes to the menu, then to the chooser
        page.click('#view-beat .btn-back')
        check('back from a take goes to the song menu', page.is_visible('#ssong-screen-menu'))
        page.click('#view-beat .btn-back')
        check('back from the menu goes to the song chooser', page.is_visible('.ssong-tile'))
        check('no page errors', not errors, errors)
        browser.close()
    server.shutdown()
    print('%d/%d passed' % (sum(results), len(results)))
    raise SystemExit(0 if all(results) else 1)

main()

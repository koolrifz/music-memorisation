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
        const wait = (ssong.punchClock + t + shift - ctx.currentTime) * 1000;
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
        page.evaluate(TAP, {'shift': 0.02})
        page.wait_for_selector('#ssong-result:not([hidden])', timeout=60000)
        g = page.evaluate('window.ssongLast')
        check('a good take passes', g['passed'] and g['grade']['hits'] == 4, (g['grade']['hits'], g['grade']['leanMs']))
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

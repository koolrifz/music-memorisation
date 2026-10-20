#!/usr/bin/env python3
"""Browser test for the stomp round (play the phrase back after counting it).

    pip install playwright           (once)
    python tools/test-stomp-round.py

Plays real rounds on Level 1 with synthetic pointer/keyboard events timed off the
AUDIO clock, so the whole path is exercised: pad -> KRPads -> matcher -> result.
Pure grading is tested separately: node tools/test-stomp-round.js
No network? Set KR_VEXFLOW to a local vexflow-min.js (3.0.9).
Run tools/check-text.py as well.
"""
import functools, http.server, os, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8793
VEXFLOW_CDN = 'https://cdn.jsdelivr.net/npm/vexflow@3.0.9/releases/vexflow-min.js'
results = []

def check(name, ok, detail=''):
    results.append(ok)
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  (' + str(detail) + ')') if detail != '' else ''))

# In the page: wait for the round's audio clock, then tap at the given offsets
# (seconds from slot 0), pad via pointer events or Space via the keyboard.
PLAY = """async ({offsets, key}) => {
    const ctx = rstompAudio();
    let clock = null;
    for (let i = 0; i < 100 && !(clock = rstompAudioClock()); i++) await new Promise(r => setTimeout(r, 50));
    if (!clock) return 'noclock';
    const pad = document.querySelector('#rstomp-round-pad .krpad');
    offsets.forEach(t => {
        const wait = (clock.slot0 + t - ctx.currentTime) * 1000;
        if (wait < 0) return;
        setTimeout(() => {
            if (key) { window.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
                       window.dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true})); }
            else { pad.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 7, bubbles: true}));
                   pad.dispatchEvent(new PointerEvent('pointerup', {pointerId: 7, bubbles: true})); }
        }, wait);
    });
    return 'ok';
}"""

def start_round(page):
    page.evaluate("""() => { rstompSelectedLevel = '1'; startRstompLevel(); rstompLocked = true; handleRstompSuccess(); }""")
    page.wait_for_selector('#rstomp-round:not([hidden])', timeout=4000)

def onset_times(page):
    return page.evaluate("""() => { const s = 60 / rstompBaseBpm() / rstompSlotsPerBeat;
        return KRStomp.deriveOnsets(rstompPhrase, s).map(o => o.t); }""")

def wait_result(page):
    page.wait_for_selector('#rstomp-round-result:not([hidden])', timeout=40000)
    return page.inner_text('#rstomp-round-score')

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
        local = os.environ.get('KR_VEXFLOW')      # no network: serve VexFlow 3.0.9 from a local copy
        if local:
            page.route(VEXFLOW_CDN, lambda route: route.fulfill(path=local, content_type='application/javascript'))
        page.route('**/fonts.googleapis.com/**', lambda route: route.abort())
        page.goto('http://127.0.0.1:%d/index.html' % PORT)
        page.evaluate("localStorage.setItem('koolRiffsOpenAll','1')")
        page.reload()
        page.evaluate("""() => { document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-rhythm-lab').classList.add('active'); }""")

        # 1. a perfect round
        start_round(page)
        check('round opens after a correct counting', not page.is_hidden('#rstomp-round'))
        check('counting controls hidden during the round',
              page.evaluate("document.getElementById('rstomp-controls-twobutton').style.display") == 'none')
        check('pad is on screen', page.is_visible('#rstomp-round-pad .krpad'))
        check('no raw ids on screen', '[stomp.round' not in page.inner_text('#rstomp-round'))
        offs = [t + 0.02 for t in onset_times(page)]
        check('tap script runs', page.evaluate(PLAY, {'offsets': offs, 'key': False}) == 'ok')
        score = wait_result(page)
        n = len(offs)
        check('perfect round: every bar clean', 'Every bar clean' in score, score)
        log = page.evaluate('window.rstompRoundLog')
        hits = [e for e in log if e['kind'] == 'hit']
        check('log has one hit per note with signed error, delay and its source',
              len(hits) == n and all(abs(e['error'] - 0.02) < 0.06 and 'delaySource' in e and e['bar'] is not None for e in hits),
              (len(hits), n))

        # 2. retry in place: nothing played -> no bars clean
        page.click('#rstomp-round-again')
        check('try again hides the result', page.is_hidden('#rstomp-round-result'))
        score = wait_result(page)
        none = page.evaluate("window.rstompRoundLog.filter(e => e.kind === 'hit').length")
        check('no taps: nothing hit, and the bars with notes are not clean', none == 0 and 'Every' not in score, score)

        # 3. Space plays the pad, and does not press the counting PLAY button behind it
        page.click('#rstomp-round-again')
        page.evaluate("window.__stamps = 0; const o = window.stampRstomp; window.stampRstomp = function () { window.__stamps++; window.__stack = new Error().stack; return o.apply(this, arguments); }; 0")
        offs = [t + 0.0 for t in onset_times(page)]
        page.evaluate(PLAY, {'offsets': offs, 'key': True})
        score = wait_result(page)
        check('Space taps the pad: perfect round', 'Every bar clean' in score, score)
        check('Space did not press the counting buttons', page.evaluate('window.__stamps') == 0, page.evaluate('window.__stack'))

        # 4. a stray in a hold faults a bar
        page.click('#rstomp-round-again')
        ts = onset_times(page)
        slot = page.evaluate("60 / rstompBaseBpm() / rstompSlotsPerBeat")
        used = set(round(t / slot) for t in ts)
        free = [s for s in range(0, 4 * 4) if s not in used]
        extra = [free[0] * slot] if free else []
        page.evaluate(PLAY, {'offsets': ts + extra, 'key': False})
        score = wait_result(page)
        check('a tap where nothing starts costs its bar' if extra else 'phrase had no free slot',
              (not extra) or 'of' in score and 'Every' not in score, score)

        # 4b. a wrong keypad answer in teacher mode shows what was written and what was expected, and logs it
        page.click('#rstomp-round-next')
        page.evaluate("rstompSelectedLevel = '17'; startRstompLevel(); rstompLocked = false; rstompKey('4'); rstompKey('4'); "
                      "for (let i = rstompWrittenBeats(); i < rstompPositions.length; i++) rstompKey('1'); submitRstompPhrase();")
        page.wait_for_selector('#rstomp-feedback:not([hidden])', timeout=3000)
        fb = page.inner_text('#rstomp-feedback')
        check('teacher mode shows You wrote / Expected on a wrong answer', 'You wrote:' in fb and 'Expected:' in fb, fb)
        check('the wrong answer is logged', page.evaluate("JSON.parse(localStorage.getItem('koolRiffsStompLog')).length") >= 1)
        page.evaluate("rstompSelectedLevel = '1'; startRstompLevel(); rstompLocked = true; handleRstompSuccess();")
        page.wait_for_selector('#rstomp-round:not([hidden])', timeout=4000)

        # 5. Next goes on to the next phrase with the counting controls back
        page.click('#rstomp-round-next')
        check('round closes', page.is_hidden('#rstomp-round'))
        check('counting controls back',
              page.evaluate("document.getElementById('rstomp-controls-twobutton').style.display") == '')
        check('a new phrase starts', page.evaluate('rstompCursor') == 0)
        # 6. Restart asks twice (a lone tap under Erase wiped Rob's counting)
        page.evaluate("rstompSelectedLevel = '17'; startRstompLevel(); rstompLocked = false; ['1','(','2'].forEach(rstompKey)")
        n = lambda: page.evaluate('rstompWriting.groups.length')
        page.click('#rstomp-scribe-restart-btn')
        check('one tap on Restart keeps the counting and asks again',
              n() == 2 and 'again' in page.inner_text('#rstomp-scribe-restart-btn'), n())
        page.click('#rstomp-scribe-restart-btn')
        check('the second tap restarts', n() == 0)
        page.evaluate("['1','(','2'].forEach(rstompKey)")
        page.click('#rstomp-scribe-restart-btn'); page.wait_for_timeout(3200)
        check('Restart disarms itself', n() == 2 and 'again' not in page.inner_text('#rstomp-scribe-restart-btn'))
        check('no script errors', not errors, errors)
        browser.close()
    server.shutdown()
    print('\n%d/%d passed' % (sum(results), len(results)))
    raise SystemExit(0 if all(results) else 1)

main()

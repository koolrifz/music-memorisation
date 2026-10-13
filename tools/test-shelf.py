#!/usr/bin/env python3
"""Browser test for the shared shelf (shelf.js), via Rhythm Stomp Lab.

    pip install playwright           (once)
    python tools/test-shelf.py [screenshot.png]

Phone size. Checks: albums show, only album 1 is open on a fresh device,
nothing is gold, later albums say "not yet", a locked track is disabled,
Start picks the open level, and with the OPEN code on every album opens.
Run tools/check-text.py as well.
"""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8792
results = []

def check(name, ok, detail=''):
    results.append(ok)
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  (' + str(detail) + ')') if detail != '' else ''))

def main():
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors = []
    shot = sys.argv[1] if len(sys.argv) > 1 else None
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 390, 'height': 800})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:%d/index.html' % PORT)
        # The Artistic License gate diverts a fresh device, so open the view directly.
        page.evaluate("""() => { document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-rhythm-lab').classList.add('active');
            renderRstompPathway(); switchScreenState('rhythm-lab','rhythm-lab-screen-pathway'); }""")
        page.wait_for_timeout(300)
        n = page.eval_on_selector_all('#rstomp-shelf .kr-sleeve', 'e => e.length')
        check('eight albums on the shelf', n == 8, n)
        check('nothing is gold on a fresh device', page.eval_on_selector_all('.kr-track.cleared, .kr-sleeve.complete', 'e => e.length') == 0)
        check('seven albums dimmed', page.eval_on_selector_all('.kr-sleeve.locked', 'e => e.length') == 7)
        check('first album selected', page.eval_on_selector_all('.kr-sleeve.selected', 'e => e.length') == 1)
        tracks = page.eval_on_selector_all('.kr-track', 'e => e.length')
        check('album 1 lists four tracks', tracks == 4, tracks)
        check('only track 1 is open', page.eval_on_selector_all('.kr-track:not(:disabled)', 'e => e.length') == 1)
        check('start button names the level', 'whole notes' in page.inner_text('#rstomp-pathway-start').lower().lower(), page.inner_text('#rstomp-pathway-start'))
        if shot: page.screenshot(path=shot)
        page.evaluate("localStorage.setItem('koolRiffsOpenAll','1'); renderRstompPathway()")
        check('OPEN opens every album', page.eval_on_selector_all('.kr-sleeve.locked', 'e => e.length') == 0)
        page.click('.kr-sleeve:nth-child(8)')
        check('teacher can jump to the last album', page.eval_on_selector_all('.kr-track:not(:disabled)', 'e => e.length') == 4)
        page.evaluate("""() => { const p = getRstompProgress(); localStorage.removeItem('koolRiffsOpenAll');
            localStorage.setItem('koolRiffsRhythmLabProgress', JSON.stringify({unlockedStages:['1','2','3','4'], stageProgress:{'1':{cleared:true},'2':{cleared:true},'3':{cleared:true},'4':{cleared:true}}, lastPosition:'4'})); renderRstompPathway(); }""")
        page.click('.kr-sleeve:nth-child(1)')
        check('cleared tracks are gold and the finished album is marked', page.eval_on_selector_all('.kr-track.cleared', 'e => e.length') == 4 and page.eval_on_selector_all('.kr-sleeve.complete', 'e => e.length') == 1)
        check('no script errors', not errors, errors)
        browser.close()
    server.shutdown()
    sys.exit(0 if all(results) else 1)

main()

#!/usr/bin/env python3
"""Browser test for the studio (studio.js).

    pip install playwright           (once)
    python tools/test-studio.py

Opens the app at phone size, goes into the studio and checks: Riff and Tango
light their own instruments, a locked one says "not yet", a lit one hops onto
the rug with its games, a game opens, and "back to the dashboard" from a game
returns to the studio. Also run tools/check-text.py.
"""
import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8791
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  (' + str(detail) + ')') if detail != '' else ''))


def active(page, view):
    return page.eval_on_selector('#' + view, "e => e.classList.contains('active')")


def main():
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 412, 'height': 738})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/*vexflow*', lambda r: r.abort())
        page.goto('http://127.0.0.1:%d/index.html' % PORT)
        page.evaluate("localStorage.clear()")
        page.reload()
        page.wait_for_timeout(400)
        check('dashboard is still the front door', active(page, 'view-dashboard'))
        page.click('.studio-entry')
        page.wait_for_timeout(400)
        check('studio opens from the dashboard', active(page, 'view-studio'))
        logo = page.eval_on_selector('.st-window-logo', "e => ({ shown: e.complete && e.naturalWidth > 0, box: e.getBoundingClientRect().width })")
        check('the control-room window carries the Kool Riffs logo', logo['shown'] and logo['box'] > 60, logo)
        page.click('.st-coach[aria-label=Riff]')
        page.wait_for_timeout(500)
        glow = page.eval_on_selector('.st-item[aria-label=Piano]', 'e => e.style.filter')
        dim = page.eval_on_selector('.st-item[aria-label="Drum kit"]', 'e => e.style.filter')
        check("Riff lights his piano", 'drop-shadow' in glow, glow)
        check("Riff dims Tango's drums", 'brightness(0.5)' in dim, dim)
        page.click('.st-item[aria-label*="Double bass"]')
        page.click('.st-item[aria-label*="Double bass"]')
        page.wait_for_timeout(300)
        said = page.eval_on_selector('.st-bubble .kr-guide-text', 'e => e.textContent')
        check('a shut instrument says not yet', said.startswith('Not yet'), said)
        page.click('.st-item[aria-label=Piano]')
        page.wait_for_timeout(800)
        tiles = page.eval_on_selector_all('.st-tile', 'ts => ts.map(t => t.textContent)')
        check('the piano shows Notation games', tiles == ['Staff Smash', 'Note Smash', 'Real Smash'], tiles)
        page.click('.st-tile:nth-child(1)')
        page.wait_for_timeout(400)
        check('Staff Smash opens', active(page, 'view-game1'))
        page.evaluate("launchGame('view-dashboard')")
        page.wait_for_timeout(300)
        check('back from a game returns to the studio', active(page, 'view-studio'))
        page.click('.st-gear')
        page.wait_for_timeout(300)
        check('the gear goes to the dashboard', active(page, 'view-dashboard'))
        page.evaluate("launchGame('view-game1')")
        page.evaluate("launchGame('view-dashboard')")
        check('with no studio visit, back is still the dashboard', active(page, 'view-dashboard'))
        # The wall: five pillar records, outlines until earned.
        page.evaluate("launchGame('view-studio')")
        page.wait_for_timeout(400)
        wall = page.eval_on_selector_all('.st-pillar', "bs => bs.map(b => [b.getAttribute('aria-label'), b.classList.contains('st-lit'), b.querySelector('.st-gold-fill').style.clipPath])")
        check('five pillar records on the wall', [w[0] for w in wall] == ['Notation', 'Value', 'Rhythm', 'Key Signatures', 'Intervals'], wall)
        check('none lit on a fresh device', not any(w[1] for w in wall), wall)
        page.click('.st-pillar[aria-label="Key Signatures"]')
        said = page.eval_on_selector('.st-toast', 'e => e.textContent')
        check('an unbuilt pillar says coming soon', 'coming soon' in said, said)
        page.evaluate("""(() => { const p = getG1PathwayProgress(); const ids = g1PathwayStages.map(s => s.id);
            ids.slice(0, 1).forEach(id => { p.stageProgress[id] = { cleared: true, bestScore: 5 }; });
            localStorage.setItem('koolRiffsG1Progress', JSON.stringify(p)); })()""")
        page.evaluate("launchGame('view-dashboard')"); page.evaluate("launchGame('view-studio')")
        page.wait_for_timeout(300)
        clip = page.eval_on_selector('.st-pillar[aria-label=Notation] .st-gold-fill', 'e => e.style.clipPath')
        check('a cleared level starts filling the Notation record', clip != 'inset(100% 0% 0% 0%)' and clip != 'inset(100% 0 0 0)', clip)
        page.evaluate("""(() => { ['Value','Notation','Rhythm'].forEach(()=>{}); })()""")
        page.screenshot(path='/tmp/wall.png')
        check('no script errors', not errors, errors)
        browser.close()
    server.shutdown()
    sys.exit(0 if all(results) else 1)


main()

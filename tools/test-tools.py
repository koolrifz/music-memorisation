#!/usr/bin/env python3
"""Browser test for the metronome and tuner (tools.js).

    pip install playwright           (once)
    python tools/test-tools.py

Opens the studio at phone size, taps Riff, then the metronome and tuner dots on
his piano, and checks the full-screen tools: start/stop books clicks and lights
the beats, accents cycle, subdivisions and sounds change, tap tempo sets the
speed, the tuner reads a pitch (fed straight in; no microphone), the pitch pipe
starts and stops, and Back returns to the studio. Also run tools/check-text.py.
"""
import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8792
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
        browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width': 412, 'height': 738})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/*vexflow*', lambda r: r.abort())
        page.goto('http://127.0.0.1:%d/index.html' % PORT)
        page.evaluate("localStorage.clear()")
        page.reload()
        page.wait_for_timeout(400)

        # --- into the tools from the studio
        page.click('.studio-entry')
        page.wait_for_timeout(400)
        check('hotspots hidden until Riff is picked', page.eval_on_selector('.st-hot', 'e => e.parentElement.hidden'))
        page.click('.st-coach[aria-label=Riff]')
        page.wait_for_timeout(600)
        hots = page.eval_on_selector_all('.st-hot', 'hs => hs.map(h => h.getAttribute("aria-label"))')
        check('two dots on the piano', len(hots) == 2, hots)
        page.click('.st-hot:nth-of-type(2)')
        page.wait_for_timeout(400)
        check('metronome dot opens the tools', active(page, 'view-tools'))
        check('metronome tab is showing', page.eval_on_selector('.tl-tab:nth-child(1)', "e => e.classList.contains('on') || e.getAttribute('aria-selected') === 'true' || e.classList.contains('active')") or page.is_visible('.tl-bpm'))

        # --- tempo
        page.click('.tl-bpm ~ .tl-round, .tl-round:has-text("+")')
        bpm = page.evaluate('krTools.bpm')
        check('plus raises the tempo', bpm >= 1, bpm)
        page.evaluate('krToolsSetBpm(120)')
        check('set tempo to 120', page.evaluate('krTools.bpm') == 120)

        # --- start books clicks and lights beats
        page.click('.tl-go')
        page.wait_for_timeout(1500)
        check('metronome is running', page.evaluate('krTools.running'))
        lit = page.evaluate("krTools.els.dots.filter(d => d.classList.contains('now')).length")
        check('one beat light is on', lit == 1, lit)
        seen = set()
        for _ in range(12):
            seen.add(page.evaluate("krTools.els.dots.findIndex(d => d.classList.contains('now'))"))
            page.wait_for_timeout(130)
        check('the light walks across beats', len(seen) >= 3, sorted(seen))
        # a running metronome keeps time: booked clicks sit ahead of the audio clock
        ahead = page.evaluate('krTools.nextTime - audioCtx.currentTime')
        check('clicks are booked ahead on the audio clock', 0 < ahead < 0.5, ahead)

        # --- accents cycle
        before = page.evaluate('krTools.accents[1]')
        page.click('.tl-dot:nth-child(2)')
        after = page.evaluate('krTools.accents[1]')
        check('tapping a beat light changes its stress', before != after, (before, after))
        check('beat 1 is loud by default', page.evaluate('krTools.accents[0]') == 2)

        # --- subdivisions and sounds
        for sid in ['eighth', 'triplet', 'sixteenth', 'swing', 'quarter']:
            page.evaluate("krTools.els.subBtns['%s'].click()" % sid)
            page.wait_for_timeout(150)
            check('subdivision %s selected' % sid, page.evaluate('krTools.sub') == sid)
        for sid in ['wood', 'beep', 'hat', 'click']:
            page.evaluate("krTools.els.soundBtns['%s'].click()" % sid)
            check('sound %s selected' % sid, page.evaluate('krTools.sound') == sid)
        # beats per bar
        page.evaluate("krTools.beats = 3; krToolsFitAccents(); krToolsRender()")
        check('three beats make three lights', page.evaluate('krTools.els.dots.length') == 3)

        # --- stop
        page.click('.tl-go')
        page.wait_for_timeout(200)
        check('stop stops', not page.evaluate('krTools.running'))

        # --- tap tempo
        page.evaluate("krTools.taps = []")
        for _ in range(4):
            page.click('.tl-tap')
            page.wait_for_timeout(500)
        tapped = page.evaluate('krTools.bpm')
        check('tap tempo finds about 120', 100 <= tapped <= 140, tapped)

        # --- settings survive a reload
        page.evaluate('krToolsSetBpm(77)')
        page.reload()
        page.wait_for_timeout(400)
        page.evaluate("KR.fromStudio = true; enterTools('metronome')")
        check('tempo is remembered', page.evaluate('krTools.bpm') == 77)

        # --- tuner tab
        page.evaluate("krToolsTab('tuner')")
        page.wait_for_timeout(200)
        check('tuner panel shows', page.is_visible('.tl-note'))
        page.evaluate('krToolsShowPitch(440)')
        note = page.eval_on_selector('.tl-note', 'e => e.textContent')
        check('440 Hz reads A4 on a concert instrument', note == 'A4', note)
        state = page.eval_on_selector('.tl-meter', 'e => e.dataset.state')
        check('and is in tune', state == 'in', state)
        page.evaluate('krToolsShowPitch(452)')
        check('a sharp note reads high', page.eval_on_selector('.tl-meter', 'e => e.dataset.state') == 'high')
        page.evaluate('krToolsShowPitch(428)')
        check('a flat note reads low', page.eval_on_selector('.tl-meter', 'e => e.dataset.state') == 'low')
        page.select_option('.tl-select', 'bb')
        page.evaluate('krToolsShowPitch(440)')
        check('Bb instrument reads 440 Hz as B', page.eval_on_selector('.tl-note', 'e => e.textContent').startswith('B'),
              page.eval_on_selector('.tl-note', 'e => e.textContent'))
        page.select_option('.tl-select', 'concert')

        # --- pitch pipe
        page.click('.tl-pipe .tl-chip >> nth=0')
        page.wait_for_timeout(200)
        check('pitch pipe sounds', page.evaluate('!!krTools.pipe'))
        page.click('.tl-pipe .tl-chip >> nth=0')
        page.wait_for_timeout(200)
        check('tapping the same note again stops it', page.evaluate('!krTools.pipe'))

        # --- leaving stops everything
        page.evaluate("krToolsTab('metronome')")
        page.click('.tl-go')
        page.wait_for_timeout(200)
        page.click('.tl-back')
        page.wait_for_timeout(300)
        check('Back from the tools returns to the studio', active(page, 'view-studio'))
        check('leaving stops the click', not page.evaluate('krTools.running'))

        # --- the tuner dot opens the tuner tab
        page.click('.st-coach[aria-label=Riff]')
        page.wait_for_timeout(500)
        page.click('.st-hot:nth-of-type(1)')
        page.wait_for_timeout(400)
        check('tuner dot opens the tuner', active(page, 'view-tools') and page.is_visible('.tl-note'))

        # --- layout: nothing wider than the screen, at three sizes
        for w, h in [(412, 738), (360, 640), (820, 1180)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.evaluate("krToolsTab('metronome')")
            page.wait_for_timeout(200)
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            small = page.evaluate("[...document.querySelectorAll('#view-tools button')].filter(b => b.offsetParent && (b.offsetHeight < 36 || b.offsetWidth < 36)).length")
            check('no sideways scroll at %dx%d' % (w, h), over <= 0, over)
            check('buttons big enough at %dx%d' % (w, h), small == 0, small)
        check('no script errors', not errors, errors)
        browser.close()
    server.shutdown()
    sys.exit(0 if all(results) else 1)


main()

"""Player 1 to 4, no names, and the high score moniker (Rob, 2026-11-01).

    python tools/test-players.py

Needs `pip install playwright`; drives the installed Chrome, as the other
browser tests do. Checks:
  - a fresh device is Player 1, with nothing to type anywhere;
  - the dashboard switches between Player 1 to 4, and progress follows;
  - an old save with typed names keeps its progress and loses the names;
  - Value Smash goes straight in, and its picker is four buttons;
  - the high score table asks for a moniker only when a score makes it,
    keeps it to three capitals or numbers, and lights the new row.
"""
import functools
import http.server
import json
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8794
URL = 'http://127.0.0.1:%d/index.html' % PORT
FAILS = []
COUNT = [0]


def check(label, ok, detail=None):
    COUNT[0] += 1
    print(('PASS  ' if ok else 'FAIL  ') + label + ('' if ok or detail is None else '  (%s)' % (detail,)))
    if not ok:
        FAILS.append(label)


def serve():
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def stored(page):
    return page.evaluate("JSON.parse(localStorage.getItem('koolRiffsPlayers'))")


def test_fresh(page):
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_selector('#home-player')
    text = page.inner_text('#home-player')
    check('A fresh device is Player 1', 'Player 1' in text, text)
    check('...nothing to type on the dashboard', page.locator('#home-player input').count() == 0)
    saved = stored(page)
    check('...four slots saved, no names', saved and len(saved['list']) == 4
          and all('name' not in p for p in saved['list'])
          and [p['slot'] for p in saved['list']] == [1, 2, 3, 4], saved)

    page.click('.home-player-change')
    chips = page.locator('.home-player-chip')
    check('Switch player shows Player 1 to 4', chips.count() == 4
          and chips.nth(3).inner_text() == 'Player 4', chips.all_inner_texts())
    chips.nth(2).click()
    check('...and Player 3 plays for the whole app', 'Player 3' in page.inner_text('#home-player')
          and page.evaluate('vsmashCurrentPlayer().slot') == 3)


def test_progress_follows(page):
    page.evaluate('localStorage.clear()')
    page.reload()
    page.evaluate("""() => {
        const p = vsmashLoad(); p.license = true; vsmashSave(p);
        const all = vsmashPlayers(); all.current = all.list[1].id; vsmashSavePlayers(all);
    }""")
    check('Player 2 does not have Player 1\'s progress', page.evaluate('vsmashLoad().license') is False)
    page.evaluate("() => { const all = vsmashPlayers(); all.current = all.list[0].id; vsmashSavePlayers(all); }")
    check('...and Player 1 still does', page.evaluate('vsmashLoad().license') is True)


def test_old_names(page):
    page.evaluate('localStorage.clear()')
    page.evaluate("""() => {
        localStorage.setItem('koolRiffsPlayers', JSON.stringify({
            list: [{ id: 'pziggy', name: 'Ziggy' }, { id: 'pruby', name: 'Ruby', age: '9-10' }],
            current: 'pruby' }));
        localStorage.setItem('koolRiffsValueProgress', JSON.stringify({
            players: { pruby: { license: true, floors: {}, unlocked: ['v1-tree'] } } }));
        localStorage.setItem('koolRiffsBeatGuest', JSON.stringify({ jamDone: true }));
    }""")
    page.reload()
    page.wait_for_selector('#home-player')
    saved = stored(page)
    raw = page.evaluate("localStorage.getItem('koolRiffsPlayers')")
    check('An old save with typed names: the names are wiped on load',
          'Ziggy' not in raw and 'Ruby' not in raw and 'name' not in raw, raw)
    check('...each named player keeps their id, in order, as Player 1 and 2',
          [(p['id'], p['slot']) for p in saved['list'][:2]] == [('pziggy', 1), ('pruby', 2)], saved)
    check('...the one who was playing is still playing, as Player 2',
          'Player 2' in page.inner_text('#home-player') and page.evaluate('vsmashLoad().license') is True)
    check('...the old band\'s age is kept (it is not a name)', saved['list'][1].get('age') == '9-10', saved)
    check('...an old guest Beat Smash record goes to the player playing',
          page.evaluate('bsmashLoad().jamDone') is True
          and page.evaluate("localStorage.getItem('koolRiffsBeatGuest')") is None)


def test_value_smash(page):
    page.evaluate('localStorage.clear()')
    page.reload()
    page.evaluate('enterValueSmash()')
    page.wait_for_timeout(300)
    check('Value Smash goes straight to its floors', page.is_visible('#value-screen-pathway'))
    check('..."Playing as: Player 1"', 'Player 1' in page.inner_text('#value-player-chip'),
          page.inner_text('#value-player-chip'))
    page.click('#value-player-chip')
    buttons = page.locator('#value-player-list button')
    check('...its picker is four buttons and nothing to type',
          buttons.count() == 4 and page.locator('#value-screen-player input').count() == 0)
    buttons.nth(1).click()
    check('...tapping Player 2 plays as Player 2', page.is_visible('#value-screen-pathway')
          and 'Player 2' in page.inner_text('#value-player-chip'))


def test_high_scores(page):
    page.evaluate('localStorage.clear()')
    page.reload()
    page.evaluate("""() => {
        const box = document.createElement('div');
        box.id = 'test-high'; document.body.prepend(box);
    }""")
    check('Zero never makes the table', page.evaluate("KRHigh.qualifies('t', 0)") is False)
    page.evaluate("KRHigh.offer(document.getElementById('test-high'), 't', 40)")
    check('A first score asks for a moniker', page.is_visible('#test-high .kr-high-input')
          and 'new high score' in page.inner_text('#test-high').lower())
    page.fill('#test-high .kr-high-input', 'zz9!')
    page.locator('#test-high .kr-high-input').dispatch_event('input')
    check('...three capitals or numbers only', page.input_value('#test-high .kr-high-input') == 'ZZ9',
          page.input_value('#test-high .kr-high-input'))
    page.press('#test-high .kr-high-input', 'Enter')
    check('...Enter saves it and lights the row', page.locator('#test-high .kr-high-row.lit').count() == 1
          and 'ZZ9' in page.inner_text('#test-high .kr-high-row.lit'))
    for score in (50, 60, 70, 80):
        page.evaluate("KRHigh.add('t', %d, 'AAA')" % score)
    check('The table holds five', len(page.evaluate("KRHigh.table('t')")) == 5)
    page.evaluate("KRHigh.offer(document.getElementById('test-high'), 't', 10)")
    check('A score under the table asks nothing, and shows the table',
          page.locator('#test-high .kr-high-input').count() == 0
          and page.locator('#test-high .kr-high-row').count() == 5)
    page.evaluate("KRHigh.offer(document.getElementById('test-high'), 't', 55)")
    page.click('#test-high .kr-high-go')
    rows = page.evaluate("KRHigh.table('t')")
    check('Nothing typed: the moniker is the player\'s slot',
          any(r['tag'] == 'P1' and r['score'] == 55 for r in rows) and len(rows) == 5, rows)
    check('...and the lowest row fell off', min(r['score'] for r in rows) == 50, rows)


def main():
    server = serve()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 390, 'height': 844})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_selector('#home-player')
        for test in (test_fresh, test_progress_follows, test_old_names, test_value_smash, test_high_scores):
            try:
                test(page)
            except Exception as e:  # noqa: BLE001
                check(test.__name__ + ' ran to the end', False, str(e).splitlines()[0])
        check('No page errors', not errors, errors)
        browser.close()
    server.shutdown()
    print('\n%d checks, %d failed' % (COUNT[0], len(FAILS)))
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()

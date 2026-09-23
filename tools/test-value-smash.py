#!/usr/bin/env python3
"""Browser tests for Value Smash, and a smoke test of the rest of the app.

    pip install playwright           (once; it drives your own Google Chrome,
                                      so no browser download is needed)
    python tools/test-value-smash.py

It serves the app from this folder, opens it in headless Chrome at phone
size, and plays it: the players, the Tree, Smash, the Sprint, the Artistic
License and the Stomp Lab gate, then checks every Value Smash screen's
layout on a phone, a small phone and a Chromebook. Each check prints PASS or
FAIL; the script exits non-zero if any fails. It takes about three minutes,
because the Tree and Smash really wait for their own playback and timers.

Also run tools/check-text.py - this file tests behaviour, that one words.
"""
import functools
import http.server
import json
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8790
URL = 'http://127.0.0.1:%d/index.html' % PORT
PHONE = {'width': 390, 'height': 844}

results = []
errors = []


def check(name, ok, detail=''):
    results.append(ok)
    print('%s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  (' + str(detail) + ')') if detail != '' else ''))


def serve():
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


# ---------- helpers ----------

PLAYER = "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Sam'}],current:'p1'}));"


def value_progress(**fields):
    base = {'floors': {}, 'unlocked': ['v1-tree']}
    base.update(fields)
    return "localStorage.setItem('koolRiffsValueProgress', JSON.stringify({players:{p1:%s}}));" % json.dumps(base)


def fresh(page, setup=''):
    """A clean device, optionally with some saved state, speech silenced."""
    page.evaluate('localStorage.clear();' + setup)
    page.reload()
    page.wait_for_timeout(500)
    page.evaluate('KR.speak = () => {}')


def screens(page):
    return page.evaluate("[...document.querySelectorAll('.view.active .screen.active')].map(s => s.id)")


def view(page):
    return page.evaluate("[...document.querySelectorAll('.view.active')].map(v => v.id).join()")


def guide(page):
    return page.inner_text('#value-game-guide')


def start_floor(page, index):
    page.click('.game-card.orange')
    page.wait_for_timeout(400)
    page.click('#value-pathway-track .pathway-node:nth-child(%d)' % index)
    page.click('#value-pathway-start')
    page.wait_for_timeout(500)


# The Tree
def tree(page):
    return page.evaluate("vsmashTree && { round: vsmashTree.round, busy: vsmashTree.busy, target: vsmashTreeTarget(),"
                         " values: vsmashTree.values, refusals: vsmashTree.refusals }")


def tree_tap(page, value):
    i = page.evaluate('vsmashTree.tray.indexOf(%s)' % json.dumps(value))
    page.click('.vsmash-tray button:nth-child(%d)' % (i + 1))


def tree_tap_right(page):
    page.wait_for_function('!vsmashTree || !vsmashTree.busy', timeout=15000)
    t = tree(page)
    if not t or t['target'] < 0:
        page.wait_for_timeout(200)
        return
    tree_tap(page, t['values'][t['target']])
    page.wait_for_timeout(60)


# Smash and the Sprint
def smash(page):
    return page.evaluate("vsmashSmash && { tier: vsmashSmash.tier, streak: vsmashSmash.streak, joker: vsmashSmash.joker,"
                         " isDud: vsmashSmash.isDud, wrong: vsmashSmash.wrong, score: vsmashSmash.score,"
                         " clock: vsmashSmash.clock, best: vsmashSmash.best, busy: vsmashSmash.busy }")


def smash_idle(page):
    page.wait_for_function('!vsmashSmash || !vsmashSmash.busy', timeout=20000)


def card(page, i):
    page.click('.vsmash-grid .vsmash-card:nth-child(%d)' % (i + 1))
    page.wait_for_timeout(30)


def targets(page):
    return page.evaluate('vsmashSmash.cards.map((c, i) => c.target ? i : -1).filter(i => i >= 0)')


def smash_clear(page):
    """Answer one screen correctly: smash every target, or pass a dud."""
    smash_idle(page)
    s = smash(page)
    if not s:
        return
    if s['isDud']:
        if s['tier'] == 0:
            page.click('#value-nothing')
        else:
            page.wait_for_function('!vsmashSmash || vsmashSmash.busy', timeout=20000)
        return
    for i in targets(page):
        card(page, i)


# ---------- the tests ----------

def test_older_games(page):
    print('\n== The rest of the app still opens')
    fresh(page, PLAYER + value_progress(license=True))
    games = [('view-game1', 'g1-pathway-start'), ('view-game2', 'g2-pathway-start'),
             ('view-game3', 'g3-pathway-start'), ('view-rhythm', 'rhythm-pathway-start'),
             ('view-rhythm-lab', 'rstomp-pathway-start')]
    for view_id, start in games:
        page.evaluate("launchGame('view-dashboard')")
        page.wait_for_timeout(200)
        page.click('#view-dashboard .game-card[onclick*="%s\'"]' % view_id)
        page.wait_for_timeout(500)
        node = page.query_selector('#%s .pathway-node.unlocked' % view_id)
        if node:
            node.click()
            page.wait_for_timeout(200)
        page.click('#' + start)
        page.wait_for_timeout(1000)
        check(view_id + ' opens and starts', len(screens(page)) > 0 and view(page) == view_id, screens(page))
    page.evaluate("launchGame('view-dashboard')")


def test_language(page):
    print('\n== Words come from the language files')
    fresh(page)
    check('a missing id shows itself', page.evaluate("KR.t('missing.thing')") == '[missing.thing]')
    check('both names by default', page.evaluate("KR.noteName('half-note')") == 'half note (minim)')
    check('plurals make their own brackets', page.evaluate("KR.noteName('half-rest', { many: true })") == 'half rests (minim rests)')
    names = page.evaluate("(() => { KR.setNames('us'); const a = KR.noteName('half-note');"
                          " KR.setNames('uk'); const b = KR.noteName('half-note'); KR.setNames('both'); return [a, b]; })()")
    check('US and UK settings', names == ['half note', 'minim'], names)
    check('no [missing] ids on the dashboard', not page.evaluate(r"/\[[a-z]+\.[^\]]+\]/.test(document.body.innerText)"))


def test_players(page):
    print('\n== Players and progress')
    fresh(page)
    page.click('.game-card.orange')
    page.wait_for_timeout(400)
    check('first visit asks for a name', screens(page) == ['value-screen-player'])
    page.fill('#value-name-input', '  Sam  ')
    page.press('#value-name-input', 'Enter')
    page.wait_for_timeout(400)
    check('a name opens the pathway', screens(page) == ['value-screen-pathway'])
    nodes = page.evaluate("[...document.querySelectorAll('#value-pathway-track .pathway-node')].map(n => n.className)")
    check('only the Tree is open', 'unlocked' in nodes[0] and all('locked' in n and 'unlocked' not in n for n in nodes[1:]), nodes)
    page.click('#value-player-chip')
    page.wait_for_timeout(300)
    page.fill('#value-name-input', 'Alex')
    page.click('#value-screen-player .btn-start')
    page.wait_for_timeout(300)
    page.evaluate("const p = vsmashLoad(); p.unlocked.push('v1-smash'); vsmashSave(p)")
    page.click('#value-player-chip')
    page.wait_for_timeout(300)
    page.fill('#value-name-input', 'sam')
    page.press('#value-name-input', 'Enter')
    page.wait_for_timeout(300)
    players = json.loads(page.evaluate("localStorage.getItem('koolRiffsPlayers')"))
    check('the same name twice is the same player', [p['name'] for p in players['list']] == ['Sam', 'Alex'])
    check("each player's progress is their own", page.evaluate('vsmashLoad().unlocked') == ['v1-tree'])
    page.evaluate("localStorage.setItem('koolRiffsPlayers', '{bad json'); localStorage.setItem('koolRiffsValueProgress', 'null')")
    page.reload()
    page.wait_for_timeout(500)
    page.click('.game-card.orange')
    page.wait_for_timeout(400)
    check('broken saved data asks for a name, not a crash', screens(page) == ['value-screen-player'])


def test_tree(page):
    print('\n== The Tree')
    fresh(page, PLAYER + value_progress())
    start_floor(page, 1)
    t = tree(page)
    check('round 1 gives the whole note and targets the half-note row', t['round'] == 0 and t['target'] == 1)
    tree_tap(page, 'quarter-note')
    page.wait_for_timeout(150)
    check('a wrong tile is refused, with the reason', 'only half a half note' in guide(page), guide(page))
    tree_tap(page, 'whole-note')
    page.wait_for_timeout(150)
    check('a longer tile gets its own reason', 'as long as 2 half notes' in guide(page), guide(page))
    while tree(page) and tree(page)['round'] == 0 and tree(page)['target'] >= 0:
        tree_tap_right(page)
    page.wait_for_timeout(6000)
    t = tree(page)
    check('two refusals: the round is built again', t['round'] == 0 and t['refusals'] == 0, t)
    for round_index in (0, 1):
        while tree(page) and tree(page)['round'] == round_index:
            tree_tap_right(page)
        page.wait_for_function('!vsmashTree || !vsmashTree.busy', timeout=15000)
        page.wait_for_timeout(2400)
    check('round 3 is the rest tree', tree(page)['values'][0] == 'whole-rest')
    tree_tap(page, 'half-note')
    page.wait_for_timeout(150)
    check('a note on a rest row is refused: sound is not silence', 'is a sound' in guide(page), guide(page))
    while tree(page):
        tree_tap_right(page)
    page.wait_for_timeout(1500)
    progress = page.evaluate('vsmashLoad()')
    check('clearing the Tree shows results', screens(page) == ['value-screen-results'])
    check('...records it cleared, with stars', progress['floors']['v1-tree'].get('cleared') and progress['floors']['v1-tree'].get('stars', 0) >= 1)
    check('...and opens Smash', 'v1-smash' in progress['unlocked'])
    check('the Tree button appears', not page.evaluate("document.getElementById('value-tree-btn').hidden"))
    page.click('#value-tree-btn')
    page.wait_for_timeout(300)
    check('the Tree card shows all six rows built',
          page.evaluate("document.querySelectorAll('#value-tree-card-rows .vsmash-tree-row').length") == 6)
    page.click('#modal-value-tree .btn-close')


def test_cards(page):
    print('\n== Smash cards are real notation')
    fresh(page)
    rules = page.evaluate("""[
        [['quarter-note','half-note','quarter-note'], true], [['quarter-note','half-note'], false],
        [['quarter-rest','half-rest'], false], [['half-rest','half-rest'], false],
        [['quarter-rest','quarter-rest','quarter-rest','quarter-rest'], false], [['half-note','half-rest'], true],
        [['quarter-note','whole-note'], false], [['whole-rest'], true],
    ].every(([units, ok]) => vsmashGroupIsReal(units) === ok)""")
    check('the engraving rules: half rest on 1 or 3, silence is one whole rest, q-h-q only', rules)
    audit = page.evaluate("""(() => { let bad = 0, n = 0;
        for (let tier = 0; tier < 4; tier++) for (const sprint of [false, true]) for (const q of vsmashTierQuestions(tier, sprint))
            for (let i = 0; i < 400; i++) { const isTarget = i % 2 === 0; const c = vsmashMakeCard(q, isTarget); n++;
                const total = c.units.reduce((s, u) => s + vsmashBeats(u), 0);
                if (!vsmashGroupIsReal(c.units) || total > 4 || total !== c.total || (total === q.total) !== isTarget) bad++; }
        return { n: n, bad: bad }; })()""")
    check('every generated card is real and adds up', audit['bad'] == 0, '%d cards' % audit['n'])


def test_smash(page):
    print('\n== Smash')
    fresh(page, PLAYER + value_progress(unlocked=['v1-tree', 'v1-smash'], floors={'v1-tree': {'cleared': True}}))
    start_floor(page, 2)
    s = smash(page)
    check('tier 1 has no clock and a Nothing here button', s['clock'] is None
          and not page.evaluate("document.getElementById('value-nothing').hidden"))

    def next_screen(dud):
        for _ in range(60):
            smash_idle(page)
            page.evaluate('vsmashSmash.joker = false; vsmashSmash.streak = 0; vsmashSmash.tier = 0')
            if smash(page)['isDud'] == dud:
                return
            smash_clear(page)

    next_screen(False)
    page.evaluate('vsmashSmash.streak = 2')
    card(page, page.evaluate('vsmashSmash.cards.findIndex(c => !c.target)'))
    check('a wrong tap costs no points', smash(page)['score'] == 0)
    for i in targets(page):
        card(page, i)
    smash_idle(page)
    check('tier 1: a screen with a wrong tap breaks the streak', smash(page)['streak'] == 0 and smash(page)['tier'] == 0)
    next_screen(False)
    wrong = smash(page)['wrong']
    page.click('#value-nothing')
    page.wait_for_timeout(100)
    check('Nothing here with targets present is a wrong tap', smash(page)['wrong'] == wrong + 1)
    next_screen(True)
    page.click('#value-nothing')
    page.wait_for_timeout(100)
    check('a dud answered right earns a joker', smash(page)['joker'])
    next_screen(True)
    card(page, 0)
    page.click('#value-nothing')
    page.wait_for_timeout(600)
    check('a dud after a wrong tap moves on without a joker', not smash(page)['joker'])

    page.evaluate('vsmashSmash.streak = 0')
    while smash(page) and smash(page)['tier'] == 0:
        smash_clear(page)
    smash_idle(page)
    s = smash(page)
    check('the clock starts at tier 2', s['tier'] == 1 and s['clock'] is not None and s['clock'] > 55, s['clock'])
    check('tier 2 has a flash timer and no Nothing button',
          page.evaluate("!document.getElementById('value-flash').hidden && document.getElementById('value-nothing').hidden"))
    page.evaluate('vsmashSmash.joker = false')
    while smash(page)['isDud']:
        smash_clear(page)
        smash_idle(page)
    page.evaluate('vsmashSmash.flash = 0.2')
    page.wait_for_timeout(600)
    check('a missed screen outlines what was missed', page.evaluate("document.querySelectorAll('.vsmash-card.missed').length") > 0)
    while smash(page):
        page.evaluate('vsmashSmash && (vsmashSmash.clock = 60)')
        smash_clear(page)
    page.wait_for_timeout(800)
    progress = page.evaluate('vsmashLoad()')
    check('clearing tier 4 clears Smash', progress['floors']['v1-smash'].get('cleared'))
    check('...records a score', progress['floors']['v1-smash'].get('bestScore', 0) > 0)
    check('...and opens the Sprint', 'v1-sprint' in progress['unlocked'])

    page.click('#value-screen-results .btn-start')
    page.wait_for_timeout(500)
    while smash(page) and smash(page)['tier'] == 0:
        smash_clear(page)
    smash_idle(page)
    clock = smash(page)['clock']
    page.click('#value-tree-btn')
    page.wait_for_timeout(1200)
    check('the Tree card pauses the clock', abs(smash(page)['clock'] - clock) < 0.3)
    page.click('#modal-value-tree .btn-close')
    page.evaluate('vsmashSmash.clock = 0.3')
    page.wait_for_timeout(1000)
    check("time running out ends the floor with Time's up", "Time's up" in page.inner_text('#value-results-body'))


def test_sprint_and_license(page):
    print('\n== The Stomp Lab gate')
    fresh(page)
    page.click('#view-dashboard .game-card[onclick*="view-rhythm-lab"]')
    page.wait_for_timeout(500)
    gate = "document.getElementById('modal-value-gate').classList.contains('show')"
    check('a fresh device is turned back by the gate', page.evaluate(gate) and view(page) == 'view-dashboard')
    page.click('#modal-value-gate .btn-start')
    page.wait_for_timeout(400)
    check("the gate's button opens Value Smash", view(page) == 'view-value')
    for label, setup in [('someone who has played Stomp Lab',
                          "localStorage.setItem('koolRiffsRhythmLabProgress', JSON.stringify({unlockedStages:['1'],stageProgress:{},totalPlays:1}));"),
                         ('someone with level 2 open',
                          "localStorage.setItem('koolRiffsRhythmLabProgress', JSON.stringify({unlockedStages:['1','2'],stageProgress:{},totalPlays:0}));"),
                         ('a player with the License', PLAYER + value_progress(license=True))]:
        fresh(page, setup)
        page.click('#view-dashboard .game-card[onclick*="view-rhythm-lab"]')
        page.wait_for_timeout(500)
        check('the gate lets through ' + label, not page.evaluate(gate) and view(page) == 'view-rhythm-lab')
    check('nothing is re-locked', page.evaluate('getRstompProgress().unlockedStages') == ['1'])

    print('\n== The Sprint and the Artistic License')
    fresh(page, PLAYER + value_progress(unlocked=['v1-tree', 'v1-smash', 'v1-sprint'],
                                        floors={'v1-tree': {'cleared': True}, 'v1-smash': {'cleared': True}}))
    page.evaluate("window.__ev = []; ['value.license.awarded', 'value.sprint.medal'].forEach(n => KR.on(n, () => __ev.push(n)))")
    start_floor(page, 3)
    s = smash(page)
    check('the Sprint starts at 6 cards with the clock running', s['tier'] == 1 and s['clock'] > 55)
    check('...with no duration bars', page.evaluate("getComputedStyle(document.querySelector('.vsmash-dur')).visibility") == 'hidden')
    medals = []
    while smash(page) and smash(page)['best'] < 3:
        page.evaluate('vsmashSmash.clock = 60')
        before = smash(page)['best']
        smash_clear(page)
        if smash(page) and smash(page)['best'] != before:
            medals.append(smash(page)['best'])
    smash_idle(page)
    check('medals come in order: Bronze, Silver, Gold', medals == [1, 2, 3], medals)
    check('after Gold the Sprint stays at 12 cards', smash(page)['tier'] == 3)
    page.evaluate('vsmashSmash.clock = 0.3')
    page.wait_for_timeout(1200)
    check('a medal clears the Sprint', page.evaluate("vsmashLoad().floors['v1-sprint'].cleared"))
    check('the License is awarded', page.evaluate('vsmashLoad().license'))
    check('with its ceremony', page.evaluate("document.getElementById('modal-value-license').classList.contains('show')"))
    check('and its events', page.evaluate('__ev') == ['value.sprint.medal', 'value.license.awarded'], page.evaluate('__ev'))
    page.click('#modal-value-license .btn-start')
    page.wait_for_timeout(500)
    check("the ceremony's button opens Stomp Lab", view(page) == 'view-rhythm-lab')

    page.evaluate('__ev = []; enterValueSmash()')
    page.wait_for_timeout(400)
    page.click('#value-pathway-track .pathway-node:nth-child(3)')
    page.click('#value-pathway-start')
    page.wait_for_timeout(500)
    while smash(page) and smash(page)['best'] < 1:
        page.evaluate('vsmashSmash.clock = 60')
        smash_clear(page)
    smash_idle(page)
    page.evaluate('vsmashSmash.clock = 0.3')
    page.wait_for_timeout(1200)
    check('a second medal brings no second ceremony', page.evaluate('__ev') == ['value.sprint.medal'])

    fresh(page, PLAYER + value_progress(unlocked=['v1-tree', 'v1-smash', 'v1-sprint']))
    start_floor(page, 3)
    page.evaluate('vsmashSmash.clock = 0.3')
    page.wait_for_timeout(1200)
    progress = page.evaluate('vsmashLoad()')
    check('no medal: not cleared, no License', not progress['floors'].get('v1-sprint', {}).get('cleared') and not progress['license'])


LAYOUT = """(() => {
  const visible = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const modal = document.querySelector('.modal-overlay.show');
  const scope = modal || document.querySelector('.view.active .screen.active');
  const nav = modal ? [] : [...document.querySelectorAll('.view.active .game-nav button, .view.active .vsmash-nav-right button')];
  const els = [...scope.querySelectorAll('*')].concat(nav).filter(visible);
  const controls = els.filter(el => el.tagName === 'BUTTON' || el.tagName === 'INPUT');
  return {
    wide: els.filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length
          + (document.documentElement.scrollWidth > innerWidth + 1 ? 1 : 0),
    small: controls.filter(el => el.getBoundingClientRect().height < 56).map(el => el.id || el.className),
    lowest: Math.max(0, ...controls.map(el => el.getBoundingClientRect().bottom)),
  };
})()"""


def test_layout(browser):
    print('\n== Layout on a phone, a small phone and a Chromebook')
    for size in [(390, 844), (360, 640), (1366, 657)]:
        page = browser.new_page(viewport={'width': size[0], 'height': size[1]})
        page.goto(URL)
        page.wait_for_timeout(400)
        fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Samantha-Jane'}],current:'p1'}));"
                    + value_progress(unlocked=['v1-tree', 'v1-smash', 'v1-sprint'], floors={'v1-tree': {'cleared': True}},
                                     tree={'built': ['whole-note', 'half-note', 'quarter-note', 'whole-rest', 'half-rest', 'quarter-rest']}))
        steps = [
            ('player', 'enterValueSmash(); showValuePlayers()'),
            ('pathway', 'showValuePathway()'),
            ('tree round 3', "vsmashSelectedFloor = 'v1-tree'; startSelectedValueFloor(); vsmashTree.round = 2; vsmashTreeRound(0)"),
            ('tree card', 'openValueTreeCard()'),
            ('smash tier 4', "closeValueTreeCard(); vsmashSelectedFloor = 'v1-smash'; startSelectedValueFloor();"
                             " vsmashSmash.tier = 3; vsmashSmash.clock = 60; loadValueSmashScreen()"),
            ('sprint', "vsmashSelectedFloor = 'v1-sprint'; startSelectedValueFloor(); vsmashSmash.best = 3;"
                       " vsmashSmash.joker = true; vsmashSmash.tier = 3; loadValueSmashScreen()"),
            ('license', "const s = vsmashSmash; vsmashSmash = null; vsmashStopTimers();"
                        " vsmashFloorCleared(s.floor, { seconds: 60, wrong: 0, score: 99, untimed: true, medal: 'gold', stars: 3 })"),
            ('results', 'closeValueLicense()'),
        ]
        problems = []
        for label, js in steps:
            page.evaluate(js)
            page.wait_for_timeout(350)
            a = page.evaluate(LAYOUT)
            if a['wide']:
                problems.append(label + ': runs off the side')
            if a['small']:
                problems.append(label + ': buttons under 56px ' + str(a['small']))
            if a['lowest'] > size[1] + 1:
                problems.append(label + ': a control below the fold')
        check('%dx%d: every screen fits, every button 56px or more' % size, not problems, '; '.join(problems))
        page.close()


def main():
    server = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport=PHONE)
        page.on('console', lambda m: m.type == 'error' and 'favicon' not in (m.location or {}).get('url', '')
                and errors.append(m.text))
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_timeout(500)
        for test in (test_older_games, test_language, test_players, test_tree, test_cards, test_smash,
                     test_sprint_and_license):
            try:
                test(page)
            except Exception as e:      # a test that crashes is a failed test, not the end of the run
                check(test.__name__ + ' ran to the end', False, e)
                page.goto(URL)
                page.wait_for_timeout(500)
        test_layout(browser)
        browser.close()
    server.shutdown()
    check('no console errors anywhere', not errors, errors[:3])
    failed = results.count(False)
    print('\n%d checks, %d failed' % (len(results), failed))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())

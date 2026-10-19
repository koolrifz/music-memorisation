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
    page.click('#value-pathway-track li:nth-child(%d) .kr-track' % index)
    page.click('#value-pathway-start')
    page.wait_for_timeout(500)


# The Tree
def tree(page):
    return page.evaluate("vsmashTree && { round: vsmashTree.round, busy: vsmashTree.busy, target: vsmashTreeTarget(),"
                         " values: vsmashTree.values, refusals: vsmashTree.refusals, misses: vsmashTree.misses,"
                         " picked: vsmashTree.picked, lengths: vsmashTree.rows.map(r => r.length) }")


def centre(box):
    return box['x'] + box['width'] / 2, box['y'] + box['height'] / 2


def tray_tile(page, value):
    return page.locator('.vsmash-tray .vsmash-tile[data-value="%s"]' % value)


def tree_row(page, row):
    return page.locator('#value-stage .vsmash-tree-row').nth(row)


def tree_drag(page, value, row, release=True):
    """What a student does: press a tile in the tray, drag it onto a row, let go."""
    x, y = centre(tray_tile(page, value).bounding_box())
    tx, ty = centre(tree_row(page, row).bounding_box())
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(tx, ty, steps=8)
    if release:
        page.mouse.up()
        page.wait_for_timeout(60)


def tree_tap_right(page):
    page.wait_for_function('!vsmashTree || !vsmashTree.busy', timeout=15000)
    t = tree(page)
    if not t or t['target'] < 0:
        page.wait_for_timeout(200)
        return
    tree_drag(page, t['values'][t['target']], t['target'])


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
        node = page.query_selector('#%s .kr-track.unlocked' % view_id)
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
    nodes = page.evaluate("[...document.querySelectorAll('#value-pathway-track .kr-track')].map(n => n.className)")
    check('only the Tree is open', 'unlocked' in nodes[0] and all('locked' in n and 'unlocked' not in n for n in nodes[1:]), nodes)
    page.click('#value-player-chip')
    page.wait_for_timeout(300)
    page.fill('#value-name-input', 'Alex')
    page.click('#value-screen-player .kr-btn-go')
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
    check('round 1 starts VACANT: nothing is given, the top row is the first with room',
          t['round'] == 0 and t['lengths'] == [0, 0, 0] and t['target'] == 0, t)
    check('no branches are drawn before anything is built',
          page.evaluate("document.querySelectorAll('#value-stage .vsmash-tree-lines line').length") == 0)
    check('the guide says to drag', 'drag' in guide(page).lower(), guide(page))
    check('the tray holds one tile of each value',
          page.evaluate("[...document.querySelectorAll('.vsmash-tray .vsmash-tile')].map(t => t.dataset.value).join()")
          == 'whole-note,half-note,quarter-note')
    check('nothing marks where a tile goes', page.evaluate("document.querySelectorAll('.vsmash-tree-row.over').length") == 0)

    # In the air: a ghost follows the pointer, the row under it lights, the tray tile dims.
    x, y = centre(tray_tile(page, 'half-note').bounding_box())
    tx, ty = centre(tree_row(page, 2).bounding_box())
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(tx, ty, steps=6)
    air = page.evaluate("({ ghosts: document.querySelectorAll('.vsmash-ghost').length,"
                        " over: [...document.querySelectorAll('#value-stage .vsmash-tree-row')].map(r => r.classList.contains('over')),"
                        " dim: document.querySelector('.vsmash-tray .vsmash-tile[data-value=\"half-note\"]').classList.contains('dragging') })")
    check('a dragged tile is a ghost; the row under it lights; its tray tile dims',
          air['ghosts'] == 1 and air['over'] == [False, False, True] and air['dim'], air)
    page.mouse.move(200, 800, steps=4)          # empty ground, below everything
    page.mouse.up()
    page.wait_for_timeout(350)
    t = tree(page)
    check('dropped on no row: the tile goes home and nothing is counted',
          page.evaluate("document.querySelectorAll('.vsmash-ghost').length") == 0
          and t['refusals'] == 0 and t['lengths'] == [0, 0, 0], t)

    tree_drag(page, 'quarter-note', 1)
    page.wait_for_timeout(150)
    check('a wrong tile is refused, with the reason', 'only half a half note' in guide(page), guide(page))
    page.wait_for_timeout(500)
    check('the red flash goes: no row or tile is left marked wrong',
          page.evaluate("document.querySelectorAll('.vsmash-tree-row.refused, .vsmash-tile.shake').length") == 0)
    tree_drag(page, 'whole-note', 1)
    page.wait_for_timeout(150)
    check('two wrong drops in a row: the guide names the tile and the row, and the tile pulses',
          'Stuck?' in guide(page) and 'top row' in guide(page) and 'whole note' in guide(page)
          and page.evaluate("document.querySelector('.vsmash-tray .vsmash-tile[data-value=\"whole-note\"]').classList.contains('hint')"),
          guide(page))
    tree_drag(page, 'whole-note', 0)
    page.wait_for_timeout(150)
    t = tree(page)
    check('one whole note fills the top row, and the row plays back',
          t['lengths'] == [1, 0, 0] and t['busy'] and t['misses'] == 0, t)
    check('the explanation is up while the row plays, so the hint is not left hanging',
          'Stuck?' not in guide(page) and 'fills the whole row' in guide(page), guide(page))
    page.wait_for_function('!vsmashTree.busy', timeout=15000)
    tree_drag(page, 'whole-note', 0)
    page.wait_for_timeout(150)
    t = tree(page)
    check('the right tile on a row already full says so, and costs nothing',
          'already full' in guide(page) and t['refusals'] == 2, (guide(page), t))
    tree_drag(page, 'half-note', 1)
    page.wait_for_timeout(150)
    t = tree(page)
    check('ONE drop puts down ONE tile: a half note is not doubled for the student',
          t['lengths'] == [1, 1, 0] and not t['busy'], t)
    check('...nothing plays until the row is full, and the guide says one is down',
          'One half note' in guide(page) and 'Drag the next' in guide(page), guide(page))
    check('...and the second half note is left for them to drag',
          page.evaluate("document.querySelectorAll('#value-stage .vsmash-tree-row')[1].children.length") == 1)
    tree_drag(page, 'half-note', 1)
    t = tree(page)
    check('the second drop completes the row', t['lengths'] == [1, 2, 0], t)
    check('a branch runs from the whole note to each half note, and no more',
          page.evaluate("document.querySelectorAll('#value-stage .vsmash-tree-lines line').length") == 2)
    check('notes are bare: no staff line, no card behind them',
          page.evaluate("document.querySelectorAll('#value-stage .vsmash-tree-row .vf-stave').length") == 0
          and page.evaluate("getComputedStyle(document.querySelector('#value-stage .vsmash-tree-row .vsmash-tile')).backgroundColor")
          == 'rgba(0, 0, 0, 0)')
    check('the filled row is explained', 'last as long as one whole note' in guide(page), guide(page))
    page.wait_for_function('!vsmashTree.busy', timeout=15000)
    tree_drag(page, 'whole-note', 2)
    page.wait_for_timeout(150)
    check('after a right drop the first miss is a reason again, and a longer tile gets its own',
          'as long as 4 quarter notes' in guide(page), guide(page))
    while tree(page) and tree(page)['round'] == 0 and tree(page)['target'] >= 0:
        tree_tap_right(page)
    page.wait_for_timeout(6000)
    t = tree(page)
    check('three refusals: the round is built again, from empty', t['round'] == 0 and t['refusals'] == 0
          and t['lengths'] == [0, 0, 0], t)
    for round_index in (0, 1):
        while tree(page) and tree(page)['round'] == round_index:
            tree_tap_right(page)
        page.wait_for_function('!vsmashTree || !vsmashTree.busy', timeout=15000)
        page.wait_for_timeout(2400)
    check('round 3 is the rest tree', tree(page)['values'][0] == 'whole-rest')

    # Under a fingertip the tile rides above the finger (touch events, made by hand).
    lift = page.evaluate("""() => {
        const tile = document.querySelector('.vsmash-tray .vsmash-tile[data-value="half-rest"]');
        const r = tile.getBoundingClientRect();
        const fire = (type, x, y) => tile.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch',
            clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        fire('pointerdown', x, y);
        fire('pointermove', x, y - 120);
        const g = document.querySelector('.vsmash-ghost').getBoundingClientRect();
        const gap = (y - 120) - (g.top + g.height / 2);
        fire('pointercancel', x, y - 120);
        return { gap: gap };
    }""")
    page.wait_for_timeout(350)
    check('a finger drags from below: the tile rides 56px above it', abs(lift['gap'] - 56) < 2, lift)

    tree_drag(page, 'half-note', 1)
    page.wait_for_timeout(150)
    check('a note on a rest row is refused: sound is not silence', 'is a sound' in guide(page), guide(page))
    # No dragging: tap a tile to pick it up, tap a row to put it down.
    tray_tile(page, 'half-rest').click()
    t = tree(page)
    check('a tap picks a tile up', t['picked'] == 'half-rest'
          and page.evaluate("document.querySelector('.vsmash-tray .vsmash-tile[data-value=\"half-rest\"]').classList.contains('picked')"), t)
    tree_row(page, 1).click()
    t = tree(page)
    check('...and a tap on its row puts down one tile', t['lengths'][1] == 1 and t['picked'] is None, t)
    # Keys: 6 picks up the sixth tile (the quarter rest), Z drops it on the bottom row.
    page.keyboard.press('6')
    check('a key picks a tile up', tree(page)['picked'] == 'quarter-rest', tree(page))
    page.keyboard.press('z')
    check('...and Q, A or Z drops it on the top, middle or bottom row', tree(page)['lengths'][2] == 1, tree(page))
    while tree(page):
        tree_tap_right(page)
    page.wait_for_timeout(1500)
    progress = page.evaluate('vsmashLoad()')
    check('clearing the Tree shows results', screens(page) == ['value-screen-results'])
    check('...records it cleared, with stars', progress['floors']['v1-tree'].get('cleared') and progress['floors']['v1-tree'].get('stars', 0) >= 1)
    check('...and opens Smash', 'v1-smash' in progress['unlocked'])
    check('clearing the Tree offers the next floor, the floors and the dashboard',
          page.evaluate("[...document.querySelectorAll('#value-results-actions button')].map(b => b.id).join()") == 'value-results-next,value-results-again,value-results-floors,value-results-home'
          and 'next: smash' in page.inner_text('#value-results-next').lower())
    check('Enter does what the green button does: starts Smash',
          (page.keyboard.press('Enter'), page.wait_for_timeout(500), page.evaluate("vsmashSmash && vsmashSmash.floor.id") == 'v1-smash')[2])
    page.evaluate("vsmashStopTimers(); vsmashSmash = null; showValuePathway()")
    check('the Tree button appears', not page.evaluate("document.getElementById('value-tree-btn').hidden"))
    page.click('#value-tree-btn')
    page.wait_for_timeout(300)
    check('the Tree card shows all six rows built',
          page.evaluate("document.querySelectorAll('#value-tree-card-rows .vsmash-tree-row').length") == 6)
    check('...and joined by branches, whole to halves to quarters, in each tree',
          page.evaluate("document.querySelectorAll('#value-tree-card-rows .vsmash-tree-lines line').length") == 12)
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

    check('a cleared floor offers the next one, the floors and the dashboard',
          page.evaluate("[...document.querySelectorAll('#value-results-actions button')].map(b => b.id).join()")
          == 'value-results-next,value-results-again,value-results-floors,value-results-home'
          and 'next: sprint' in page.inner_text('#value-results-next').lower())
    page.click('#value-results-again')
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
    page.click('#value-pathway-track li:nth-child(3) .kr-track')
    page.click('#value-pathway-start')
    page.wait_for_timeout(500)
    while smash(page) and smash(page)['best'] < 1:
        page.evaluate('vsmashSmash.clock = 60')
        smash_clear(page)
    smash_idle(page)
    page.evaluate('vsmashSmash.clock = 0.3')
    page.wait_for_timeout(1200)
    check('a second medal brings no second ceremony', page.evaluate('__ev') == ['value.sprint.medal'])
    check('after the Sprint: a celebration that suggests Stomp Lab, with the floors and the dashboard',
          page.evaluate("[...document.querySelectorAll('#value-results-actions button')].map(b => b.id).join()") == 'value-results-stomp,value-results-again,value-results-floors,value-results-home'
          and 'all of value smash' in page.inner_text('#value-results-body').lower(), page.inner_text('#value-results-body'))
    page.click('#value-results-home')
    page.wait_for_timeout(300)
    check('the dashboard button goes home', view(page) == 'view-dashboard', view(page))

    fresh(page, PLAYER + value_progress(unlocked=['v1-tree', 'v1-smash', 'v1-sprint']))
    start_floor(page, 3)
    page.evaluate('vsmashSmash.clock = 0.3')
    page.wait_for_timeout(1200)
    progress = page.evaluate('vsmashLoad()')
    check('a floor not cleared offers another go, the floors and the dashboard',
          page.evaluate("[...document.querySelectorAll('#value-results-actions button')].map(b => b.id).join()") == 'value-results-again,value-results-floors,value-results-home')
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
        if os.environ.get('KR_VEXFLOW'):
            page.route('**/vexflow*', lambda route: route.fulfill(path=os.environ['KR_VEXFLOW'], content_type='application/javascript'))
        page.goto(URL)
        page.wait_for_timeout(400)
        fresh(page, "localStorage.setItem('koolRiffsPlayers', JSON.stringify({list:[{id:'p1',name:'Samantha-Jane'}],current:'p1'}));"
                    + value_progress(unlocked=['v1-tree', 'v1-smash', 'v1-sprint'], floors={'v1-tree': {'cleared': True}},
                                     tree={'built': ['whole-note', 'half-note', 'quarter-note', 'whole-rest', 'half-rest', 'quarter-rest']}))
        steps = [
            ('player', 'enterValueSmash(); showValuePlayers()'),
            ('pathway', 'showValuePathway()'),
            ('tree round 3', "vsmashSelectedFloor = 'v1-tree'; startSelectedValueFloor(); vsmashTree.round = 2; vsmashTreeRound()"),
            ('tree card', 'openValueTreeCard()'),
            ('smash tier 4', "closeValueTreeCard(); vsmashSelectedFloor = 'v1-smash'; startSelectedValueFloor();"
                             " vsmashSmash.tier = 3; vsmashSmash.clock = 60; loadValueSmashScreen()"),
            ('sprint', "vsmashSelectedFloor = 'v1-sprint'; startSelectedValueFloor(); vsmashSmash.best = 3;"
                       " vsmashSmash.joker = true; vsmashSmash.tier = 3; loadValueSmashScreen()"),
            ('sprint, a beats question', "vsmashPickQuestion = () => vsmashTierQuestions(3, true).find(q => q.kind === 'beats');"
                                         " vsmashSmash.lastAnnounced = null; loadValueSmashScreen()"),
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


def test_announce(page):
    print('\n== The target is said before anything counts down')
    fresh(page, PLAYER + value_progress(unlocked=['v1-tree', 'v1-smash'], floors={'v1-tree': {'cleared': True}}))
    start_floor(page, 2)
    # Tier 2 asks "N beats" and has both clocks, so it shows everything at once.
    page.evaluate("vsmashSmash.tier = 1; vsmashSmash.clock = 60; vsmashSmash.lastAnnounced = null;"
                  " vsmashPickQuestion = () => vsmashTierQuestions(1, false)[1]; loadValueSmashScreen()")
    page.wait_for_timeout(150)
    s = page.evaluate("({ busy: vsmashSmash.busy, announcing: document.getElementById('value-screen-game').classList.contains('announcing'),"
                      " total: vsmashSmash.question.total })")
    check('a new target holds the screen while it is said', s['busy'] and s['announcing'], s)
    page.wait_for_timeout(350)
    held = page.evaluate("({ clock: vsmashSmash.clock, flash: vsmashSmash.flash, total: vsmashSmash.flashTotal,"
                         " taps: getComputedStyle(document.querySelector('.vsmash-stage')).pointerEvents })")
    check('neither clock runs while it is said, and the cards cannot be tapped',
          held['clock'] == 60 and held['flash'] == held['total'] and held['taps'] == 'none', held)
    page.wait_for_function("!vsmashSmash.busy", timeout=3000)
    check('the cards come back when the voice is done',
          not page.evaluate("document.getElementById('value-screen-game').classList.contains('announcing')"))
    page.wait_for_timeout(600)
    check('then the clock runs', page.evaluate('vsmashSmash.clock') < 60)

    shown = page.evaluate("({ row: !document.getElementById('value-targetrow').hidden,"
                          " n: document.getElementById('value-target-n').textContent,"
                          " dots: document.querySelectorAll('#value-target-dots .vsmash-target-dot').length,"
                          " total: vsmashSmash.question.total, words: document.getElementById('value-game-guide').innerText })")
    check('the target is a big number and that many dots', shown['row'] and shown['n'] == str(shown['total'])
          and shown['dots'] == shown['total'], shown)
    check('the line itself is short, with no "smash everything"', 'everything' not in shown['words'].lower()
          and len(shown['words'].split()) <= 3, shown['words'])

    page.evaluate("loadValueSmashScreen()")      # the same target again: shown, not said again
    page.wait_for_timeout(150)
    check('a repeated target does not hold the screen',
          not page.evaluate('vsmashSmash.busy') and not page.evaluate("document.getElementById('value-targetrow').hidden"))

    page.evaluate("vsmashSmash.tier = 2; vsmashSmash.lastAnnounced = null;"
                  " vsmashPickQuestion = () => vsmashTierQuestions(2, false)[0]; loadValueSmashScreen()")
    page.wait_for_timeout(150)
    check('a note-name question has no number to show', page.evaluate("document.getElementById('value-targetrow').hidden"))
    page.wait_for_function("!vsmashSmash.busy", timeout=3000)


def main():
    server = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport=PHONE)
        page.on('console', lambda m: m.type == 'error' and 'favicon' not in (m.location or {}).get('url', '')
                and errors.append(m.text))
        page.on('pageerror', lambda e: errors.append(str(e)))
        local = os.environ.get('KR_VEXFLOW')       # no network: answer the CDN from a local copy
        if local:
            page.route('**/vexflow*', lambda route: route.fulfill(path=local, content_type='application/javascript'))
        page.goto(URL)
        page.wait_for_timeout(500)
        for test in (test_older_games, test_language, test_players, test_tree, test_cards, test_smash,
                     test_announce, test_sprint_and_license):
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

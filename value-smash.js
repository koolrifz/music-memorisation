/* =========================================
   VALUE SMASH - the Value silo
   =========================================
   What each note is WORTH. The Rhythm silo assumes the student already
   knows this; Value Smash is where they learn it, and clearing it awards
   the Artistic License that opens Rhythm Stomp Lab.

   The spec is docs/value-smash-build-guide.md. The reasoning is in the
   private design brief, kool-riffs-docs/docs/value-smash-design-brief.md.

   NO WORDS IN THIS FILE. Every word on screen comes from lang/en-US.js
   through KR.t / KR.say / KR.noteName. tools/check-text.py checks it.
   ========================================= */

/* ---------- The floors ----------
   Floor IDs are PERMANENT: a future app-wide Level (a "bridge" across the
   silos) will list them by ID. Add floors; never rename one.
   A floor's name is the language id 'value.floor.<id>.name'.
   unlock: the floor that must be cleared first (null = open from the start).
   awards: what clearing it gives the player. */
const VSMASH_FLOORS = [
    { id: 'v1-tree',   part: 'v1', kind: 'tree',   unlock: null },
    { id: 'v1-smash',  part: 'v1', kind: 'smash',  unlock: 'v1-tree' },
    { id: 'v1-sprint', part: 'v1', kind: 'sprint', unlock: 'v1-smash', awards: 'license' },
];

/* ---------- Defaults Rob will tune ----------
   Build guide §5. All in one place so they're easy to find and change. */
const VSMASH_TREE_REFUSALS_ALLOWED = 1;      // a Tree round counts only with at most this many refused tiles
const VSMASH_TREE_BEAT_SECONDS = 0.5;        // snare timing when a finished Tree row plays back
const VSMASH_TREE_HINT_AFTER = 2;            // wrong drops in a row before the guide says which tile goes where
const VSMASH_LINE_FROM = 0.7;                // a branch leaves a note this far down its row (fraction of the row's height)
const VSMASH_LINE_TO = 4;                    // and reaches this far into the row below
const VSMASH_BARE_INK = '#f4efe2';            // notes drawn straight on the background (the Tree)
const VSMASH_TREE_DRAG_SLOP = 8;             // px a press must travel to count as a drag; less is a tap
const VSMASH_TREE_TOUCH_LIFT = 56;           // px a tile rides above a fingertip, so the finger doesn't hide it
const VSMASH_STAR_TIME = { tree: 60, smash: 120 };   // seconds to beat for the second star
const VSMASH_DUD_RATE = 0.15;                // share of Smash screens with nothing to smash
const VSMASH_GOLD_RATE = 1 / 12;             // share of Smash screens with a gold (triple) card
const VSMASH_CLOCK_SECONDS = 60;             // the Smash clock, which starts at tier 2
const VSMASH_SPRINT_SECONDS = 60;            // the Sprint's length
const VSMASH_WRONG_TAP_SECONDS = 2;          // what a wrong tap costs once the clock is running
const VSMASH_WATCH_SCREENS = 3;              // a missed target comes back more often for this many clears
const VSMASH_WATCH_CHANCE = 0.5;             // ...picked this often while it is on the watchlist
const VSMASH_ANNOUNCE_MIN_MS = 700;          // the target is held up at least this long, even with the sound off
const VSMASH_ANNOUNCE_MAX_MS = 1500;         // ...and never waited on longer than this

const VSMASH_PLAYERS_KEY = 'koolRiffsPlayers';
const VSMASH_PROGRESS_KEY = 'koolRiffsValueProgress';
const VSMASH_MAX_STARS = 3;

let vsmashSelectedFloor = null;
let vsmashTimers = [];       // every pending timeout, so leaving a floor stops it dead

function vsmashLater(fn, ms) {
    vsmashTimers.push(setTimeout(fn, ms));
}

function vsmashEvery(fn, ms) {
    vsmashTimers.push(setInterval(fn, ms));
}

function vsmashStopTimers() {
    vsmashTimers.forEach(id => { clearTimeout(id); clearInterval(id); });
    vsmashTimers = [];
    const screen = document.getElementById('value-screen-game');
    if (screen) screen.classList.remove('announcing');   // an announcement cut short must not leave the cards dimmed
}

/* ---------- Players ----------
   A list of names on this device, no passwords, no network - so that on a
   shared school iPad each student's progress is their own.
   Stored as { list: [{id, name}], current: id }.
   Only Value Smash uses players for now. */
function vsmashPlayers() {
    let players = null;
    try { players = JSON.parse(localStorage.getItem(VSMASH_PLAYERS_KEY)); } catch (e) {}
    if (!players || !Array.isArray(players.list)) players = { list: [], current: null };
    if (!players.list.some(p => p.id === players.current)) players.current = null;
    return players;
}

function vsmashSavePlayers(players) {
    try { localStorage.setItem(VSMASH_PLAYERS_KEY, JSON.stringify(players)); } catch (e) {}
}

function vsmashCurrentPlayer() {
    const players = vsmashPlayers();
    return players.list.find(p => p.id === players.current) || null;
}

/* ---------- Progress ----------
   THE ONLY TWO FUNCTIONS THAT TOUCH VALUE SMASH PROGRESS. Everything else
   reads and writes through these.
   Stored as { players: { [playerId]: {...} } }. vsmashLoad() returns the
   current player's record, with anything missing filled in:
     { floors: { [floorId]: { cleared, stars, bestScore, bestTime, plays } },
       unlocked: [floorId, ...], lastFloor, license, namesSetting } */
function vsmashBlankProgress() {
    return {
        floors: {},
        unlocked: (KR.openAll() ? VSMASH_FLOORS : VSMASH_FLOORS.filter(f => f.unlock === null)).map(f => f.id),
        lastFloor: null,
        license: false,
        namesSetting: 'both',
    };
}

function vsmashReadAll() {
    let all = null;
    try { all = JSON.parse(localStorage.getItem(VSMASH_PROGRESS_KEY)); } catch (e) {}
    if (!all || typeof all.players !== 'object' || all.players === null) all = { players: {} };
    return all;
}

function vsmashLoad() {
    const player = vsmashCurrentPlayer();
    const blank = vsmashBlankProgress();
    if (!player) return blank;
    const saved = vsmashReadAll().players[player.id] || {};
    const progress = Object.assign(blank, saved);
    progress.floors = progress.floors || {};
    // A floor with no unlock rule is always open, even in old saved data.
    if (!Array.isArray(progress.unlocked)) progress.unlocked = [];
    VSMASH_FLOORS.forEach(f => {
        if (f.unlock === null && !progress.unlocked.includes(f.id)) progress.unlocked.push(f.id);
    });
    // The teacher code (teacher-codes.js) opens every floor.
    if (KR.openAll()) progress.unlocked = VSMASH_FLOORS.map(f => f.id);
    return progress;
}

function vsmashSave(progress) {
    const player = vsmashCurrentPlayer();
    if (!player) return;
    const all = vsmashReadAll();
    all.players[player.id] = progress;
    try { localStorage.setItem(VSMASH_PROGRESS_KEY, JSON.stringify(all)); } catch (e) {}
}

/* ---------- Entering Value Smash ---------- */
function enterValueSmash() {
    vsmashStopTimers();
    launchGame('view-value');
    KR.event('value.open');
    if (vsmashCurrentPlayer()) showValuePathway();
    else showValuePlayers();
}

function handleValueBackButton() {
    vsmashStopTimers();
    const active = document.querySelector('#view-value .screen.active');
    const onPathway = active && active.id === 'value-screen-pathway';
    if (!onPathway && vsmashCurrentPlayer()) showValuePathway();
    else launchGame('view-dashboard');
}

/* ---------- The player picker ---------- */
function showValuePlayers() {
    const players = vsmashPlayers();
    switchScreenState('value', 'value-screen-player');

    const list = document.getElementById('value-player-list');
    list.innerHTML = '';
    players.list.forEach(p => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary vsmash-player-btn'; // text-ok
        if (p.id === players.current) button.classList.add('current');
        button.textContent = p.name;
        button.onclick = () => chooseValuePlayer(p.id);
        list.appendChild(button);
    });

    const input = document.getElementById('value-name-input');
    input.value = '';
    input.placeholder = KR.t('value.player.namePlaceholder');
    input.onkeydown = (e) => { if (e.key === 'Enter') addValuePlayer(); };

    const ask = players.list.length ? 'value.player.askSwitch' : 'value.player.askFirst';
    KR.say(ask, { box: document.getElementById('value-player-guide') });
}

function chooseValuePlayer(playerId) {
    const players = vsmashPlayers();
    if (!players.list.some(p => p.id === playerId)) return;
    players.current = playerId;
    vsmashSavePlayers(players);
    showValuePathway();
}

function addValuePlayer() {
    const input = document.getElementById('value-name-input');
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (!name) {
        KR.say('value.player.nameNeeded', { box: document.getElementById('value-player-guide') });
        input.focus();
        return;
    }
    const players = vsmashPlayers();
    // The same name twice is the same student coming back, not a new one.
    const existing = players.list.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return chooseValuePlayer(existing.id);
    const player = { id: 'p' + Date.now().toString(36), name: name };
    players.list.push(player);
    players.current = player.id;
    vsmashSavePlayers(players);
    showValuePathway();
}

/* ---------- The pathway ----------
   Follows the app's pathway pattern (CLAUDE.md "Pathway screen pattern"):
   every floor shows its number and name, a locked one dimmed;
   cleared = number + name + stars.
   Start appears only once a floor is selected. */
function vsmashFloorName(floorId) {
    return KR.t('value.floor.' + floorId + '.name');
}

function vsmashStars(count) {
    let stars = '';
    for (let i = 0; i < VSMASH_MAX_STARS; i++) {
        stars += KR.t(i < count ? 'value.star.full' : 'value.star.empty');
    }
    return stars;
}

function showValuePathway() {
    vsmashStopTimers();
    vsmashTree = null;
    vsmashSmash = null;
    const progress = vsmashLoad();
    KR.setNames(progress.namesSetting);
    renderValuePathway();
    switchScreenState('value', 'value-screen-pathway');
    vsmashRefreshTreeButton();
}

function renderValuePathway() {
    const progress = vsmashLoad();
    const player = vsmashCurrentPlayer();
    document.getElementById('value-player-chip').textContent =
        KR.t('value.player.playingAs', { name: player ? player.name : '' });

    const unlocked = new Set(progress.unlocked);
    let recommended = progress.lastFloor;
    if (!unlocked.has(recommended)) {
        recommended = VSMASH_FLOORS.filter(f => unlocked.has(f.id)).map(f => f.id).pop();
    }
    vsmashSelectedFloor = recommended;

    const track = document.getElementById('value-pathway-track');
    KR.shelf.render(track, {
        albums: [{ id: 'all', titleId: 'shelf.album.all', levelIds: VSMASH_FLOORS.map(floor => floor.id) }],
        levelName: vsmashFloorName,
        discLabel: id => String(VSMASH_FLOORS.findIndex(floor => floor.id === id) + 1),
        unlocked,
        records: progress.floors,
        current: recommended,
        note: id => (progress.floors[id] && progress.floors[id].cleared) ? vsmashStars(progress.floors[id].stars || 0) : '',
        onPick: id => selectValueFloor(id),
    });
    if (recommended) selectValueFloor(recommended, false);
}

function selectValueFloor(floorId, rerender = true) {
    const progress = vsmashLoad();
    if (!progress.unlocked.includes(floorId)) return;
    vsmashSelectedFloor = floorId;
    progress.lastFloor = floorId;
    vsmashSave(progress);
    if (rerender) renderValuePathway();
    const start = document.getElementById('value-pathway-start');
    start.disabled = false;
    start.textContent = KR.t('value.start', { floor: vsmashFloorName(floorId) });
}

/* ---------- Starting a floor ---------- */
function startSelectedValueFloor() {
    const floor = VSMASH_FLOORS.find(f => f.id === vsmashSelectedFloor);
    if (!floor) return;
    const progress = vsmashLoad();
    const record = progress.floors[floor.id] || {};
    record.plays = (record.plays || 0) + 1;
    progress.floors[floor.id] = record;
    vsmashSave(progress);

    vsmashStopTimers();
    vsmashTree = null;
    vsmashSmash = null;
    switchScreenState('value', 'value-screen-game');
    vsmashRefreshTreeButton();
    document.getElementById('value-floor-label').textContent = vsmashFloorName(floor.id);
    document.getElementById('value-stage').innerHTML = '';
    ['value-hud', 'value-targetrow', 'value-flash', 'value-nothing'].forEach(id => {
        document.getElementById(id).hidden = true;
    });
    KR.event('value.floor.start', { floor: floor.id });

    if (floor.kind === 'tree') return startValueTree(floor);
    if (floor.kind === 'smash' || floor.kind === 'sprint') return startValueSmash(floor);
    KR.say('value.floor.empty', { box: vsmashGuide() });
}

function vsmashGuide() {
    return document.getElementById('value-game-guide');
}

/* ---------- Floor cleared: stars, best time, what opens next ----------
   Stars (build guide §3.7), a ladder:
     1 star  - cleared;
     2 stars - cleared within the floor's target time (VSMASH_STAR_TIME);
     3 stars - within the target time AND with no wrong taps. */
function vsmashFloorCleared(floor, result) {
    const progress = vsmashLoad();
    const record = progress.floors[floor.id] || {};
    const target = VSMASH_STAR_TIME[floor.kind];
    const inTime = target == null || result.seconds <= target;
    // The Sprint brings its own stars, from its medal.
    const stars = result.stars || 1 + (inTime ? 1 : 0) + (inTime && result.wrong === 0 ? 1 : 0);

    record.cleared = true;
    record.stars = Math.max(record.stars || 0, stars);
    if (!result.untimed && (record.bestTime == null || result.seconds < record.bestTime)) record.bestTime = result.seconds;
    if (result.medal && (record.bestMedal || 0) < stars) record.bestMedal = stars;
    result.newBest = vsmashRecordScore(record, result.score);
    progress.floors[floor.id] = record;

    const opened = VSMASH_FLOORS.filter(f => f.unlock === floor.id && !progress.unlocked.includes(f.id));
    opened.forEach(f => progress.unlocked.push(f.id));
    if (opened.length) progress.lastFloor = opened[0].id;

    // The Artistic License is awarded once, ever.
    const licensed = floor.awards === 'license' && !progress.license;
    if (licensed) progress.license = true;
    vsmashSave(progress);

    KR.event('value.floor.cleared', { floor: floor.id, stars: stars });
    showValueResults(floor, stars, result, opened);
    if (licensed) {
        KR.event('value.license.awarded');
        vsmashLicenseCeremony();
    }
}

// A personal best, where the floor keeps a score. Returns true when it is new.
function vsmashRecordScore(record, score) {
    if (score == null) return false;
    if (record.bestScore != null && score <= record.bestScore) return false;
    record.bestScore = score;
    return true;
}

/* ---------- Where to go from a results screen ----------
   Rob, 2026-10-19: clearing a floor should offer the NEXT floor, not leave the
   student to climb back out to the floor list. Always on offer: the floors
   (the start of Value Smash) and the dashboard (home for the whole app). The
   one green button is what happens next, and Enter presses it (keyboard.js).
   Buttons are [{ id, words, vars, run, primary }]. */
function vsmashResultsActions(buttons) {
    const holder = document.getElementById('value-results-actions');
    holder.innerHTML = '';
    buttons.forEach(b => {
        const el = document.createElement('button');
        el.id = 'value-results-' + b.id;
        el.className = 'btn ' + (b.primary ? 'btn-start' : 'btn-secondary');
        el.textContent = KR.t(b.words, b.vars);
        el.onclick = b.run;
        holder.appendChild(el);
    });
}

function vsmashGoToFloor(floorId) {
    vsmashSelectedFloor = floorId;
    startSelectedValueFloor();
}

function vsmashGoToDashboard() {
    launchGame('view-dashboard');
}

// What follows a cleared floor: the floor it opened, or - after the last one -
// the way on to the next game.
function vsmashClearedActions(floor) {
    const next = VSMASH_FLOORS.find(f => f.unlock === floor.id);
    const again = { id: 'again', words: 'value.results.again', run: () => vsmashGoToFloor(floor.id) };
    const floors = { id: 'floors', words: 'value.floor.back', run: showValuePathway };
    const home = { id: 'home', words: 'value.results.dashboard', run: vsmashGoToDashboard };
    if (next) {
        return [{ id: 'next', words: 'value.results.next', vars: { floor: vsmashFloorName(next.id) },
            primary: true, run: () => vsmashGoToFloor(next.id) }, again, floors, home];
    }
    return [{ id: 'stomp', words: 'value.results.stomp', primary: true, run: () => launchGame('view-rhythm-lab') },
        again, floors, home];
}

// A floor not cleared: another go is the next step.
function vsmashRetryActions(floor) {
    return [{ id: 'again', words: 'value.results.again', primary: true, run: () => vsmashGoToFloor(floor.id) },
        { id: 'floors', words: 'value.floor.back', run: showValuePathway },
        { id: 'home', words: 'value.results.dashboard', run: vsmashGoToDashboard }];
}

function vsmashResultsBody() {
    vsmashStopTimers();
    switchScreenState('value', 'value-screen-results');
    vsmashRefreshTreeButton();
    const body = document.getElementById('value-results-body');
    body.innerHTML = '';
    return (className, words) => {
        const el = document.createElement('p');
        el.className = className;
        el.textContent = words;
        body.appendChild(el);
    };
}

function vsmashScoreLines(line, floorId, result) {
    if (result.score == null) return;
    line('vsmash-result-line', KR.t('value.results.score', { n: result.score }));
    const best = vsmashLoad().floors[floorId];
    if (result.newBest) line('vsmash-result-open', KR.t('value.results.newBest'));
    else if (best && best.bestScore != null) line('vsmash-result-line', KR.t('value.results.best', { n: best.bestScore }));
}

function showValueResults(floor, stars, result, opened) {
    const line = vsmashResultsBody();
    line('vsmash-result-title', KR.t('value.results.cleared', { floor: vsmashFloorName(floor.id) }));
    line('vsmash-result-stars', vsmashStars(stars));
    if (result.medal) line('vsmash-result-medal', KR.t('value.medal.' + result.medal));
    else line('vsmash-result-line', KR.t('value.results.time', { seconds: Math.round(result.seconds) }));
    vsmashScoreLines(line, floor.id, result);
    opened.forEach(f => line('vsmash-result-open', KR.t('value.results.opened', { floor: vsmashFloorName(f.id) })));
    if (!VSMASH_FLOORS.some(f => f.unlock === floor.id)) line('vsmash-result-open', KR.t('value.results.done'));
    vsmashResultsActions(vsmashClearedActions(floor));
    playSound('complete');
}

// The clock ran out before the floor was cleared. Nothing is lost.
function showValueTimeUp(result, floor) {
    const line = vsmashResultsBody();
    vsmashResultsActions(vsmashRetryActions(floor));
    line('vsmash-result-title', KR.t('value.results.timeUp'));
    line('vsmash-result-line', KR.t('value.results.reached', { cards: result.cards }));
    line('vsmash-result-line', KR.t('value.results.score', { n: result.score }));
    playSound('timeout');
}

/* ---------- Drawing notes ----------
   Real notation, drawn by VexFlow as SVG: a one-line staff, no clef, no time
   signature, stems up. A card is not a full bar, so the voice is SOFT.
   specs: [{ value: 'h', isRest: false }, ...] - the codes RSTOMP_VOCABULARY
   uses. Notes are laid out from the left, as music is written.
   Each distinct drawing is made once and kept as an SVG string, so a grid of
   cards doesn't call VexFlow for every card on every screen. */
const VSMASH_DRAW_HEIGHT = 130;   // VexFlow's canvas...
const VSMASH_CROP_TOP = 40;       // ...cropped to the band the music occupies -
const VSMASH_CROP_HEIGHT = 65;    // Stomp Lab's window, which clears ties and rests
const VSMASH_GLYPH_ROOM = 14;     // px kept free at the right for the last note or rest
const vsmashDrawCache = {};

// scale < 1 draws smaller notation that still fills `width`: VexFlow draws
// at width / scale and the SVG is shrunk to fit, so the staff line runs the
// whole way across. Used by the Tree on short screens.
// centre: true puts a single note or rest in the MIDDLE of the width instead
// of at the start of the bar. The Tree uses it: a tile there is one value
// standing alone in its box, so it should read as a diagram, not as the
// first note of a bar.
// bare: true draws the notation alone in light ink - no staff line - for the
// Tree, whose notes sit straight on the background (Rob, 2026-10-19: "I don't
// even need to see the line through the note or a pretend staff").
function vsmashDrawNotes(el, specs, width, scale, centre, bare) {
    scale = scale || 1;
    bare = !!bare;
    centre = !!centre && specs.length === 1;
    const shown = Math.max(40, Math.round(width));
    width = Math.round(shown / scale);
    const key = width + '|' + scale + '|' + (centre ? 'c|' : '') + (bare ? 'b|' : '') + specs.map(s => s.value + (s.isRest ? 'r' : '')).join(',');
    if (!(key in vsmashDrawCache)) {
        const VF = Vex.Flow;
        const scratch = document.createElement('div');
        const renderer = new VF.Renderer(scratch, VF.Renderer.Backends.SVG);
        renderer.resize(width, VSMASH_DRAW_HEIGHT);
        const context = renderer.getContext();
        const stave = new VF.Stave(0, 20, width);
        stave.setConfigForLines([
            { visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false }
        ]);
        stave.setBegBarType(VF.Barline.type.NONE);
        stave.setEndBarType(VF.Barline.type.NONE);
        stave.setStyle({ strokeStyle: '#000000' });
        stave.setContext(context);
        if (!bare) stave.draw();     // the voice still needs the stave to place its notes
        const notes = specs.map(spec => {
            const note = new VF.StaveNote({ clef: 'treble', keys: ['b/4'], stem_direction: 1,
                duration: spec.isRest ? spec.value + 'r' : spec.value });
            if (note.dots) note.addDotToAll();   // VexFlow won't draw the dot on its own
            return note;
        });
        const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
        voice.addTickables(notes);
        new VF.Formatter().joinVoices([voice]).format([voice], Math.max(10, width - 34));
        // Then put every note ON ITS BEAT, as Stomp Lab's staff does (CLAUDE.md
        // "Notes sit ON the slot grid"). VexFlow's own spacing squeezes a bar's
        // worth of notes into a card until rests touch noteheads. On the grid
        // the card reads as one bar of common time, and each note starts above
        // its own stretch of the duration bar.
        // The grid stops short of the right edge by one glyph's room, so a
        // note on beat 4 is never clipped by the card.
        const inset = notes.length ? notes[0].getAbsoluteX() : 0;
        const span = width - inset - VSMASH_GLYPH_ROOM;
        let beat = 0;
        notes.forEach((note, i) => {
            const tick = note.getTickContext();
            tick.setX(tick.getX() + (inset + beat / VSMASH_BAR_BEATS * span) - note.getAbsoluteX());
            beat += rstompSlotsFor(specs[i].value, 'q');
        });
        // The scratch div has to be in the page while it is drawn so the
        // browser can measure the ink; it is off-screen and removed again.
        if (centre) {
            scratch.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;';
            document.body.appendChild(scratch);
        }
        voice.draw(context, stave);
        const svg = scratch.querySelector('svg');
        if (centre) {
            // Measure what was actually drawn rather than trusting VexFlow's
            // own note positions: its numbers do not match the glyph's ink.
            // Centre the notehead (or the rest), not the whole note - a
            // stem is a hairline beside the head and would pull it off-centre.
            const group = svg.querySelector('.vf-stavenote');
            const head = svg.querySelector('.vf-stavenote .vf-notehead') || group;
            const box = head.getBBox();
            if (box.width > 0) {
                const dx = width / 2 - (box.x + box.width / 2);
                group.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' 0)');
            }
            scratch.remove();
        }
        svg.setAttribute('viewBox', '0 ' + VSMASH_CROP_TOP + ' ' + width + ' ' + VSMASH_CROP_HEIGHT);
        svg.setAttribute('width', shown);
        svg.setAttribute('height', Math.round(VSMASH_CROP_HEIGHT * scale));
        svg.style.width = shown + 'px';
        svg.style.height = Math.round(VSMASH_CROP_HEIGHT * scale) + 'px';
        vsmashDrawCache[key] = bare ? scratch.innerHTML.replace(/#000000|#000\b|black/gi, VSMASH_BARE_INK) : scratch.innerHTML;
    }
    el.innerHTML = vsmashDrawCache[key];
}

/* ---------- Note values ----------
   Values are the keys of RSTOMP_VOCABULARY ('whole-note', 'half-rest', ...),
   read from rhythm-stomp-lab.js, never copied. How long a value lasts comes
   from Stomp Lab's own arithmetic, rstompSlotsFor. Part V1 is common time,
   counted in quarter notes: a whole note is 4, a half note 2, a quarter 1. */
const VSMASH_BAR_BEATS = 4;

function vsmashSpec(valueId) {
    return RSTOMP_VOCABULARY[valueId];
}

function vsmashBeats(valueId) {
    return rstompSlotsFor(vsmashSpec(valueId).value, 'q');
}

/* =========================================
   FLOOR v1-tree: THE TREE (scaffolding, no clock)
   =========================================
   How the values relate, with no beat counting. Three rows of the same
   width, because each row lasts the same time: whole notes, half notes,
   quarter notes. A tile's width is its value - a half note is half a row.

   DRAG a tile from the tray onto a row. The tray holds ONE of each value, so
   nothing on screen says how many fit: drop the right value on its row and
   the row FILLS ITSELF - one half note in, two half notes appear - and the
   student finds the equivalence out instead of being told it. A row takes
   only its own value; the wrong one is refused - a clunk, a shake, the tile
   glides back, and the guide box says why. Wrong drops in a row
   (VSMASH_TREE_HINT_AFTER) and the guide points at the longest row still
   empty and the tile that belongs there, and that tile pulses.
   Rob, 2026-10-19: "expecting them to fill in a box by tapping the right
   notation forces them into some mistakes or misunderstandings... They don't
   know that there's four quarter notes and two half notes in one whole note
   sitting there. They just see one of each."
   The rows can be filled in any order: the student chooses the row, and the
   Tree never highlights where a tile goes (that would give the answer away).
   Dropped on no row, nothing happens and nothing is counted.
   The same move without dragging: tap a tile to pick it up, then tap a row
   (keyboard.js: 1-6 picks, Q A Z drops on the top, middle, bottom row).
   A full row plays back, one snare per note at 0.5 s a beat. (A rest row
   plays the brush: a snare on a silence would say the opposite of what the
   row means.)

   Every round starts VACANT and one drop puts down ONE tile (Rob,
   2026-10-19: "Don't do it for them... they have to build the whole tree").
   Notes are drawn bare, with branches joining each note to the two it is
   worth; a branch appears only when both ends are on the page.
   Round 1: the note tree.  Round 2: the same, tray shuffled.
   Round 3: the rest tree. The tray holds the notes as well, so a note
            offered to a rest row is refused - sound is not silence.
   A round counts only with at most VSMASH_TREE_REFUSALS_ALLOWED refusals;
   otherwise it is built again from empty.
   ========================================= */
const VSMASH_TREES = {
    notes: ['whole-note', 'half-note', 'quarter-note'],
    rests: ['whole-rest', 'half-rest', 'quarter-rest'],
};
// Every round starts VACANT: nothing is given. Rob, 2026-10-19: "I would
// prefer that there is nothing up there. It's vacant and they have to build
// the whole tree." Round 2 only shuffles the tray, so position can't be learnt.
const VSMASH_TREE_ROUNDS = [
    { tree: 'notes', shuffle: false },
    { tree: 'notes', shuffle: true },
    { tree: 'rests', shuffle: false },
];

let vsmashTree = null;   // the Tree floor in play, or null

function startValueTree(floor) {
    vsmashTree = { floor: floor, round: 0, started: Date.now(), wrong: 0 };
    vsmashTreeRound();
}

// Lay out one round: every row empty.
function vsmashTreeRound() {
    const round = VSMASH_TREE_ROUNDS[vsmashTree.round];
    const values = VSMASH_TREES[round.tree];
    vsmashTree.values = values;
    vsmashTree.rows = values.map(() => []);
    vsmashTree.refusals = 0;
    vsmashTree.misses = 0;       // wrong drops in a row; a right one starts it again
    vsmashTree.picked = null;    // a tile picked up by a tap or a key, waiting for a row
    vsmashTree.busy = false;
    vsmashTree.tray = round.tree === 'rests'
        ? ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest']
        : VSMASH_TREES.notes.slice();
    if (round.shuffle) vsmashTree.tray.sort(() => Math.random() - 0.5);

    document.getElementById('value-floor-label').textContent = KR.t('value.tree.header', {
        floor: vsmashFloorName(vsmashTree.floor.id),
        n: vsmashTree.round + 1, total: VSMASH_TREE_ROUNDS.length });
    renderValueTree();
    KR.say(round.tree === 'rests' ? 'value.tree.startRests' : 'value.tree.start', { box: vsmashGuide() });
}

function vsmashTreeRowBeats(row) {
    return row.reduce((sum, v) => sum + vsmashBeats(v), 0);
}

// The highest row that still has room, or -1 when the tree is full.
function vsmashTreeTarget() {
    return vsmashTree.rows.findIndex(row => vsmashTreeRowBeats(row) < VSMASH_BAR_BEATS);
}

// One tile: a box as wide as its value, with the note drawn inside it.
function vsmashTile(valueId, width, tag) {
    const tile = document.createElement(tag || 'div');
    tile.className = 'vsmash-tile' + (vsmashSpec(valueId).isRest ? ' rest' : '');
    tile.style.width = width + 'px';
    const notes = document.createElement('div');
    notes.className = 'vsmash-tile-notes';
    tile.appendChild(notes);
    vsmashDrawNotes(notes, [vsmashSpec(valueId)], width - 6, vsmashTreeScale(), true, true);
    return tile;
}

// On a short screen (a small phone, a Chromebook) the Tree draws its notes
// at 80% so round 3 fits without scrolling - see the matching rule in
// style.css. The tiles stay exactly as wide as their share of the row.
function vsmashTreeScale() {
    return window.matchMedia('(max-height: 740px)').matches ? 0.8 : 1;
}

function vsmashTileWidth(valueId, rowWidth) {
    return rowWidth * vsmashBeats(valueId) / VSMASH_BAR_BEATS;
}

function vsmashRowWidth(container) {
    return Math.floor(container.clientWidth) - 6;   // less the row's border
}

// The branches: one line from each note down to the two notes it is worth, so
// the tree grows as it is built. A line is drawn only when BOTH ends are on the
// page - the structure is never shown before the student has built it. Row r
// holds 2^r slots; slot k hangs from slot floor(k/2) of the row above.
function vsmashTreeLines(container, counts) {
    const rowEls = container.querySelectorAll('.vsmash-tree-row');
    const base = container.getBoundingClientRect();
    const NS = 'http://www.w3.org/2000/svg';   // text-ok: an XML namespace
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'vsmash-tree-lines');
    svg.setAttribute('width', base.width);
    svg.setAttribute('height', base.height);
    const slotX = (el, k, cap) => {
        const r = el.getBoundingClientRect();
        return r.left - base.left + 3 + (r.width - 6) * (k + 0.5) / cap;
    };
    for (let r = 1; r < rowEls.length; r++) {
        const upper = rowEls[r - 1].getBoundingClientRect(), lower = rowEls[r].getBoundingClientRect();
        for (let k = 0; k < counts[r]; k++) {
            const parent = k >> 1;
            if (parent >= counts[r - 1]) continue;
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', slotX(rowEls[r - 1], parent, 1 << (r - 1)));
            line.setAttribute('y1', upper.top - base.top + upper.height * VSMASH_LINE_FROM);
            line.setAttribute('x2', slotX(rowEls[r], k, 1 << r));
            line.setAttribute('y2', lower.top - base.top + VSMASH_LINE_TO);
            svg.appendChild(line);
        }
    }
    container.appendChild(svg);
}

// `fresh` is {row, at}: the one tile just dropped, which drops into place.
function renderValueTree(fresh) {
    vsmashTreeEndDrag();
    const stage = document.getElementById('value-stage');
    stage.innerHTML = '';
    const rowWidth = vsmashRowWidth(stage);

    const rows = document.createElement('div');
    rows.className = 'vsmash-tree-rows';
    vsmashTree.rows.forEach((row, index) => {
        const el = document.createElement('div');
        el.className = 'vsmash-tree-row';
        el.onclick = () => vsmashTreeRowTap(index);
        row.forEach((v, i) => {
            const tile = vsmashTile(v, vsmashTileWidth(v, rowWidth));
            if (fresh && fresh.row === index && fresh.at === i) tile.classList.add('fill');
            el.appendChild(tile);
        });
        rows.appendChild(el);
    });
    stage.appendChild(rows);
    vsmashTreeLines(rows, vsmashTree.rows.map(r => r.length));

    // The tray's tiles are the width they will take up in a row, less the
    // gap between them, so a half note and a half rest fit on one line.
    const tray = document.createElement('div');
    tray.className = 'vsmash-tray';
    vsmashTree.tray.forEach(v => {
        const tile = vsmashTile(v, vsmashTileWidth(v, rowWidth) - 8, 'button');
        tile.type = 'button';
        tile.dataset.value = v;
        if (vsmashTree.picked === v) tile.classList.add('picked');
        vsmashTreeBindTile(tile, v);
        tray.appendChild(tile);
    });
    stage.appendChild(tray);
}

/* ---------- Dragging a tile into a row ----------
   Pointer events, so one code path serves a finger, a mouse and a stylus. A
   press on a tray tile that travels VSMASH_TREE_DRAG_SLOP lifts a copy of the
   tile (the ghost) that follows the pointer; the row under the ghost's
   CENTRE is the one aimed at (a finger rides VSMASH_TREE_TOUCH_LIFT below
   the ghost, so it never hides the tile it is aiming). Let go over a row and
   that is the drop; let go anywhere else and the ghost glides home, free.
   A press that never travels is a tap, and a tap picks the tile up. */
let vsmashTreeDragging = null;   // { tile, valueId, id, x, y, lift, ghost, w, h }

function vsmashTreeBindTile(tile, valueId) {
    tile.addEventListener('contextmenu', e => e.preventDefault());
    tile.addEventListener('pointerdown', e => {
        if (!vsmashTree || vsmashTree.busy || vsmashTreeDragging) return;
        if (e.button !== undefined && e.button !== 0) return;
        vsmashTreeDragging = { tile: tile, valueId: valueId, id: e.pointerId, x: e.clientX, y: e.clientY,
            lift: e.pointerType === 'touch' ? VSMASH_TREE_TOUCH_LIFT : 0, ghost: null };
        try { tile.setPointerCapture(e.pointerId); } catch (err) {}
    });
    tile.addEventListener('pointermove', e => {
        const d = vsmashTreeDragging;
        if (!d || d.tile !== tile || d.id !== e.pointerId) return;
        if (!d.ghost) {
            if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < VSMASH_TREE_DRAG_SLOP) return;
            vsmashTreeLift(d);
        }
        e.preventDefault();
        vsmashTreeCarry(d, e.clientX, e.clientY);
    });
    tile.addEventListener('pointerup', e => vsmashTreeLetGo(e, tile, true));
    tile.addEventListener('pointercancel', e => vsmashTreeLetGo(e, tile, false));
    tile.addEventListener('lostpointercapture', e => vsmashTreeLetGo(e, tile, false));
    // A click with no pointer behind it is a key press on the focused tile (or
    // keyboard.js): it picks the tile up. A pointer's own click is ignored,
    // because its press and release were handled above.
    tile.addEventListener('click', e => { if (e.detail === 0) vsmashTreePick(valueId); });
}

function vsmashTreeLift(d) {
    const box = d.tile.getBoundingClientRect();
    const ghost = d.tile.cloneNode(true);
    ghost.classList.remove('picked', 'hint', 'shake');
    ghost.classList.add('vsmash-ghost');
    ghost.removeAttribute('data-value');     // only the real tile answers to its value
    ghost.tabIndex = -1;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = box.width + 'px';
    ghost.style.height = box.height + 'px';
    document.body.appendChild(ghost);
    d.ghost = ghost;
    d.w = box.width;
    d.h = box.height;
    d.tile.classList.add('dragging');
    vsmashTree.picked = null;
    vsmashTreeMarkPicked();
}

function vsmashTreeCarry(d, x, y) {
    const cx = x, cy = y - d.lift;
    d.ghost.style.transform = 'translate(' + (cx - d.w / 2) + 'px,' + (cy - d.h / 2) + 'px)';
    const at = vsmashTreeRowAt(cx, cy);
    document.querySelectorAll('#value-stage .vsmash-tree-row').forEach((el, i) => el.classList.toggle('over', i === at));
}

// The row under a point, or -1. A few px of slack either side, never enough
// to overlap the next row.
function vsmashTreeRowAt(x, y) {
    const rows = document.querySelectorAll('#value-stage .vsmash-tree-row');
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 3 && y <= r.bottom + 3) return i;
    }
    return -1;
}

function vsmashTreeLetGo(e, tile, released) {
    const d = vsmashTreeDragging;
    if (!d || d.tile !== tile || d.id !== e.pointerId) return;
    vsmashTreeDragging = null;
    try { tile.releasePointerCapture(d.id); } catch (err) {}
    document.querySelectorAll('.vsmash-tree-row.over').forEach(r => r.classList.remove('over'));
    if (!d.ghost) {                          // it never travelled: a tap picks the tile up
        if (released) vsmashTreePick(d.valueId);
        return;
    }
    tile.classList.remove('dragging');
    const at = released && vsmashTree ? vsmashTreeRowAt(e.clientX, e.clientY - d.lift) : -1;
    const result = at >= 0 ? vsmashTreeDrop(d.valueId, at, tile) : 'none';
    if (result === 'ok') d.ghost.remove();
    else vsmashTreeGoHome(d);
}

// A tile that found no home glides back to the tray, then is gone.
function vsmashTreeGoHome(d) {
    const ghost = d.ghost;
    const home = d.tile.isConnected ? d.tile.getBoundingClientRect() : null;
    if (!home) { ghost.remove(); return; }
    ghost.classList.add('home');
    ghost.style.transform = 'translate(' + home.left + 'px,' + home.top + 'px)';
    setTimeout(() => ghost.remove(), 220);
}

// Stop any press in progress and clear what it put on screen.
function vsmashTreeEndDrag() {
    const d = vsmashTreeDragging;
    vsmashTreeDragging = null;
    if (d) {
        try { d.tile.releasePointerCapture(d.id); } catch (err) {}
        d.tile.classList.remove('dragging');
    }
    document.querySelectorAll('.vsmash-ghost').forEach(g => g.remove());
    document.querySelectorAll('.vsmash-tree-row.over').forEach(r => r.classList.remove('over'));
}

// Tap or key: pick a tile up (again to put it down), then name its row.
function vsmashTreePick(valueId) {
    if (!vsmashTree || vsmashTree.busy) return;
    vsmashTree.picked = vsmashTree.picked === valueId ? null : valueId;
    vsmashTreeMarkPicked();
}

function vsmashTreeMarkPicked() {
    document.querySelectorAll('.vsmash-tray .vsmash-tile').forEach(t =>
        t.classList.toggle('picked', !!vsmashTree && t.dataset.value === vsmashTree.picked));
}

function vsmashTreeRowTap(index) {
    if (!vsmashTree || vsmashTree.busy || !vsmashTree.picked) return;
    const valueId = vsmashTree.picked;
    vsmashTree.picked = null;
    vsmashTreeMarkPicked();
    vsmashTreeDrop(valueId, index, document.querySelector('.vsmash-tray .vsmash-tile[data-value="' + valueId + '"]'));
}

// A tile is dropped on a row. Returns 'ok' (one tile added), 'refused' (wrong
// value), 'full' (right value, but that row is already done) or 'none'.
function vsmashTreeDrop(valueId, index, tile) {
    if (!vsmashTree || vsmashTree.busy) return 'none';
    const rowValue = vsmashTree.values[index];

    if (valueId === rowValue) {
        if (vsmashTreeRowBeats(vsmashTree.rows[index]) >= VSMASH_BAR_BEATS) {
            // Nothing wrong, nothing to add: say so, and cost nothing.
            KR.say('value.tree.full', { box: vsmashGuide(), vars: { rows: KR.noteName(rowValue, { many: true }) } });
            return 'full';
        }
        vsmashTree.misses = 0;
        // ONE tile per drop. The row is never filled for the student: the
        // second half note, or the other three quarters, are theirs to drag.
        vsmashTree.rows[index].push(valueId);
        vsmashTapSound(valueId);
        renderValueTree({ row: index, at: vsmashTree.rows[index].length - 1 });
        if (vsmashTreeRowBeats(vsmashTree.rows[index]) < VSMASH_BAR_BEATS) {
            KR.say('value.tree.placed', { box: vsmashGuide(), vars: { tile: KR.noteName(valueId) } });
            return 'ok';
        }
        // The explanation is on screen while the row plays, so a miss's line
        // or a hint is not left hanging there; it is SPOKEN after the playback.
        const line = vsmashTreeRowLine(index);
        KR.say(line.id, { box: vsmashGuide(), vars: line.vars, silent: true });
        vsmashTreeRowFull(index);
        return 'ok';
    }

    vsmashTree.refusals++;
    vsmashTree.wrong++;
    vsmashTree.misses++;
    playSound('wrong');
    const rowEl = document.querySelectorAll('#value-stage .vsmash-tree-row')[index];
    // The tile and the row flash red and shake, then go back to normal: a red
    // that stayed would say "this row is wrong", and it only refused THIS tile.
    [[tile, 'shake'], [rowEl, 'refused']].forEach(pair => {
        const el = pair[0];
        if (!el) return;
        clearTimeout(el.vsmashFlash);
        el.classList.remove(pair[1]);
        void el.offsetWidth;                 // restart the shake on a second miss
        el.classList.add(pair[1]);
        el.vsmashFlash = setTimeout(() => el.classList.remove(pair[1]), 450);
    });
    KR.event('value.tree.refuse', { tile: valueId, row: rowValue });
    if (vsmashTree.misses >= VSMASH_TREE_HINT_AFTER) {
        vsmashTreeHint();
    } else {
        const why = vsmashTreeRefusal(valueId, rowValue);
        KR.say(why.id, { box: vsmashGuide(), vars: why.vars });
    }
    return 'refused';
}

// Lost: say which tile goes in the longest row still empty, and why that one,
// and make that tile pulse. Rob: "take the whole note and drag it at the top
// cuz it is the largest note we have."
function vsmashTreeHint() {
    const at = vsmashTreeTarget();
    if (at < 0) return;
    const value = vsmashTree.values[at];
    KR.say('value.tree.hint.' + ['top', 'middle', 'bottom'][at], { box: vsmashGuide(), vars: { tile: KR.noteName(value) } });
    const home = vsmashTree.tray.indexOf(value);
    document.querySelectorAll('.vsmash-tray .vsmash-tile').forEach((t, i) => {
        t.classList.remove('hint');
        if (i === home) { t.classList.remove('shake'); t.classList.add('hint'); }
    });
}

// A note sounds as the snare; a rest as the brush (CLAUDE.md "The two
// buttons SOUND like what they mean").
function vsmashTapSound(valueId) {
    if (typeof rstompAudioTap === 'function') rstompAudioTap(vsmashSpec(valueId).isRest ? 'bracket' : 'play');
}

// Why a tile doesn't belong in a row, told as the relationship between the
// two - never in beats. The Tree teaches the values against each other.
function vsmashTreeRefusal(tileValue, rowValue) {
    const vars = {
        tile: KR.noteName(tileValue),
        row: KR.noteName(rowValue),
        rows: KR.noteName(rowValue, { many: true }),
    };
    const tileIsRest = vsmashSpec(tileValue).isRest;
    if (tileIsRest !== vsmashSpec(rowValue).isRest) {
        return { id: tileIsRest ? 'value.tree.refuse.silence' : 'value.tree.refuse.sound', vars: vars };
    }
    const ratio = vsmashBeats(tileValue) / vsmashBeats(rowValue);
    if (ratio > 1) { vars.n = ratio; return { id: 'value.tree.refuse.longer', vars: vars }; }
    return { id: ratio === 0.5 ? 'value.tree.refuse.half' : 'value.tree.refuse.quarter', vars: vars };
}

// A full row plays back: one sound per note, each lasting its value.
function vsmashTreeRowFull(index) {
    vsmashTree.busy = true;
    const row = vsmashTree.rows[index];
    const tiles = document.querySelectorAll('.vsmash-tree-row')[index].children;
        let at = 400;   // the drop's own sound dies away before the row plays back
    row.forEach((v, i) => {
        const length = vsmashBeats(v) * VSMASH_TREE_BEAT_SECONDS * 1000;
        vsmashLater(() => {
            vsmashTapSound(v);
            if (tiles[i]) tiles[i].classList.add('sounding');
        }, at);
        vsmashLater(() => { if (tiles[i]) tiles[i].classList.remove('sounding'); }, at + length - 40);
        at += length;
    });
    vsmashLater(() => {
        KR.event('value.tree.row', { row: vsmashTree.values[index] });
        vsmashTree.busy = false;
        if (vsmashTreeTarget() < 0) return vsmashTreeRoundDone();
        const line = vsmashTreeRowLine(index);
        KR.say(line.id, { box: vsmashGuide(), vars: line.vars });
        renderValueTree();
    }, at);
}

// What the guide says about a row that has just filled.
function vsmashTreeRowLine(index) {
    const top = vsmashTree.values[0];
    if (index === 0) return { id: 'value.tree.rowDoneTop', vars: { row: KR.noteName(top) } };
    return { id: 'value.tree.rowDone', vars: {
        n: vsmashTree.rows[index].length, rows: KR.noteName(vsmashTree.values[index], { many: true }),
        top: KR.noteName(top) } };
}

function vsmashTreeRoundDone() {
    renderValueTree();

    if (vsmashTree.refusals > VSMASH_TREE_REFUSALS_ALLOWED) {
        KR.say('value.tree.again', { box: vsmashGuide(), vars: { n: vsmashTree.refusals } });
        vsmashTree.busy = true;
        vsmashLater(() => {
            vsmashTreeRound();
        }, 2600);
        return;
    }

    // The rows of a counted round become part of the student's own tree.
    const progress = vsmashLoad();
    const built = (progress.tree && progress.tree.built) || [];
    vsmashTree.values.forEach(v => { if (!built.includes(v)) built.push(v); });
    progress.tree = { built: built };
    vsmashSave(progress);

    vsmashTree.round++;
    if (vsmashTree.round >= VSMASH_TREE_ROUNDS.length) {
        KR.event('value.tree.cleared');
        const seconds = (Date.now() - vsmashTree.started) / 1000;
        const floor = vsmashTree.floor, wrong = vsmashTree.wrong;
        vsmashTree = null;
        return vsmashFloorCleared(floor, { seconds: seconds, wrong: wrong });
    }
    KR.say('value.tree.roundDone', { box: vsmashGuide(), vars: { n: vsmashTree.round } });
    vsmashTree.busy = true;
    vsmashLater(() => vsmashTreeRound(), 2200);
}

// A phone turned sideways changes the width, so the tree or grid is redrawn.
window.addEventListener('resize', () => {
    if (!document.getElementById('value-screen-game').classList.contains('active')) return;
    if (vsmashTree) renderValueTree();
    if (vsmashSmash && vsmashSmash.cards) {
        const smashed = vsmashSmash.cards.map(c => c.smashed);
        renderValueSmashGrid();
        vsmashSmash.cards.forEach((c, i) => { if (smashed[i]) c.el.classList.add('smashed'); });
    }
});

/* ---------- The Tree as the help menu ----------
   Once the Tree floor is cleared, a Tree button sits on every Value Smash
   screen. It opens the student's OWN tree - only the rows they have built.
   (Later parts add their rows here, and beat labels once time signatures
   are taught.) */
function vsmashRefreshTreeButton() {
    const record = vsmashLoad().floors['v1-tree'];
    document.getElementById('value-tree-btn').hidden = !(record && record.cleared);
}

function openValueTreeCard() {
    const progress = vsmashLoad();
    const built = (progress.tree && progress.tree.built) || [];
    document.getElementById('modal-value-tree').classList.add('show');
    vsmashPaused = true;   // looking at help costs no time
    const holder = document.getElementById('value-tree-card-rows');
    holder.innerHTML = '';
    const rowWidth = vsmashRowWidth(holder);
    Object.keys(VSMASH_TREES).forEach(tree => {
        const rows = document.createElement('div');
        rows.className = 'vsmash-tree-rows';
        const counts = [];
        VSMASH_TREES[tree].forEach(v => {
            const row = document.createElement('div');
            row.className = 'vsmash-tree-row';
            const n = built.includes(v) ? VSMASH_BAR_BEATS / vsmashBeats(v) : 0;
            for (let i = 0; i < n; i++) row.appendChild(vsmashTile(v, vsmashTileWidth(v, rowWidth)));
            counts.push(n);
            rows.appendChild(row);
        });
        if (!counts.some(n => n)) return;
        holder.appendChild(rows);
        vsmashTreeLines(rows, counts);
    });
}

function closeValueTreeCard() {
    document.getElementById('modal-value-tree').classList.remove('show');
    vsmashPaused = false;
}

/* =========================================
   FLOOR v1-smash: SMASH (time attack)
   =========================================
   Note Smash's grid, verb and timer, with note values on the cards.
   Behaviour matched to loadG2Grid / handleG2Click / resolveG2Screen in
   script.js, not imported from them.

   - Tiers 3 -> 6 -> 9 -> 12 cards. Three cleared screens in a row moves up a
     tier; clearing tier 4 clears the floor.
   - Targets per screen, by tier: 1-2, 2-4, 2-3, 3-4.
   - Duds: about 15% of screens have nothing to smash, never two in a row.
     A dud handled correctly earns a JOKER - a spare life that saves the
     streak the next time it would break.
   - Tier 1 has NO CLOCK at all. A dud there is answered with the "Nothing
     here" button, and a wrong tap breaks the streak (there is no time for it
     to cost). From tier 2, each screen has Note Smash's flash timer,
     (cards / 3 + 2) s: a dud passes when it runs out untouched, and a target
     left unsmashed when it runs out is a miss. Rob's call, 2026-09-24.
   - The 60 s clock starts at tier 2. Clearing a screen adds (cards / 3 + 2) s;
     a wrong tap costs VSMASH_WRONG_TAP_SECONDS. Wrong taps never cost points.
   - Combo: each correct tap in a row on a screen raises the crack a step and
     scores one more point than the last. A wrong tap resets it.
   - Gold card: about 1 screen in 12, one target card is gold, triple points.
   - Watchlist: a target the student misses is asked more often for a while.
   ========================================= */
const VSMASH_TIERS = [3, 6, 9, 12];
const VSMASH_TARGET_BANDS = [[1, 2], [2, 4], [2, 3], [3, 4]];
const VSMASH_UNITS = ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest'];
const VSMASH_COMBO_STEPS = 8;       // the crack stops rising after this many

// What a tier asks, and what its cards may hold.
//   beats:  "N beats!"                            (tiers 1-2)
//   equals: "Smash everything that equals a ..."  (tiers 3-4)
// units: how many notes and rests a card may hold, [fewest, most].
// The Sprint asks every kind at every tier.
function vsmashTierQuestions(tier, sprint) {
    const beats = [1, 2, 4].map(n => ({ kind: 'beats', total: n, key: 'beats:' + n,
        units: tier === 0 ? [1, 1] : [1, 3] }));
    const equals = ['half-note', 'whole-note'].map(v => ({ kind: 'equals', note: v, total: vsmashBeats(v),
        key: 'equals:' + v, units: [1, 4] }));
    if (sprint) return beats.concat(equals);
    return tier <= 1 ? beats : equals;
}

/* ---------- Cards are real notation ----------
   A card is a short run of notes and rests, read as the start of a bar of
   common time. It has to be something a musician would write (CLAUDE.md,
   "Engraving rules for rests" and "BEAT 3 MUST ALWAYS BE VISIBLE"):
   - never longer than the bar;
   - a whole note or whole rest only from beat 1;
   - a half rest only from beat 1 or 3 - never across the middle;
   - a half note from beat 2 only as quarter / half / quarter, Rob's one
     named way to hide beat 3;
   - a bar-long run of silence is one whole rest, never smaller rests. */
function vsmashGroupIsReal(units) {
    let at = 0;
    for (let i = 0; i < units.length; i++) {
        const beats = vsmashBeats(units[i]);
        const rest = vsmashSpec(units[i]).isRest;
        if (beats === 4 && at !== 0) return false;
        if (beats === 2 && rest && at % 2 !== 0) return false;
        if (beats === 2 && !rest && at === 1
            && !(units[i - 1] === 'quarter-note' && units[i + 1] === 'quarter-note')) return false;
        at += beats;
    }
    if (at > VSMASH_BAR_BEATS) return false;
    const allRest = units.every(u => vsmashSpec(u).isRest);
    if (allRest && at === VSMASH_BAR_BEATS && units.length > 1) return false;
    return true;
}

function vsmashRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function vsmashRandomInt(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// Every card a musician could write, listed once: each run of 1-4 notes and
// rests that passes vsmashGroupIsReal. Picking from this list (size first,
// then a group of that size) gives groups a fair share of the cards. Random
// guessing would hand out single notes nearly every time, because a random
// run of three or four rarely fits in a bar.
let vsmashGroups = null;

function vsmashAllGroups() {
    if (vsmashGroups) return vsmashGroups;
    vsmashGroups = [];
    const grow = units => {
        if (units.length && vsmashGroupIsReal(units)) {
            vsmashGroups.push({ units: units, total: units.reduce((sum, u) => sum + vsmashBeats(u), 0) });
        }
        if (units.length < VSMASH_BAR_BEATS) VSMASH_UNITS.forEach(u => grow(units.concat(u)));
    };
    grow([]);
    return vsmashGroups;
}

// A card that is (or, for a distractor, is not) worth the question's total.
function vsmashMakeCard(question, isTarget) {
    const fits = vsmashAllGroups().filter(g => g.units.length >= question.units[0]
        && g.units.length <= question.units[1] && (g.total === question.total) === isTarget);
    const sizes = [...new Set(fits.map(g => g.units.length))];
    if (!sizes.length) return null;
    const size = vsmashRandom(sizes);
    const group = vsmashRandom(fits.filter(g => g.units.length === size));
    return { units: group.units.slice(), total: group.total, target: isTarget };
}

function vsmashShuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

let vsmashSmash = null;    // the Smash floor in play, or null
let vsmashPaused = false;  // true while the Tree help card is open

// The Smash floor and the Sprint share this engine. The Sprint starts at
// tier 2 with the clock running, asks everything, shows no duration bars,
// and never ends early: clearing tier 4 keeps it there, piling up points.
function startValueSmash(floor) {
    const sprint = floor.kind === 'sprint';
    vsmashSmash = {
        floor: floor, sprint: sprint, started: Date.now(),
        tier: sprint ? 1 : 0, streak: 0, joker: false, score: 0, wrong: 0,
        clock: sprint ? VSMASH_SPRINT_SECONDS : null,   // seconds left; Smash starts it at tier 2
        best: -1,               // Sprint: the highest tier cleared, which sets the medal
        watch: {},              // question key -> clears left on the watchlist
        lastDud: false, lastAnnounced: null,
    };
    document.getElementById('value-hud').hidden = false;
    vsmashPaused = false;
    let last = performance.now();
    vsmashEvery(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (!vsmashPaused) vsmashSmashTick(dt);
    }, 100);
    loadValueSmashScreen();
}

function vsmashPickQuestion() {
    const s = vsmashSmash;
    const questions = vsmashTierQuestions(s.tier, s.sprint);
    const watched = questions.filter(q => s.watch[q.key] > 0);
    if (watched.length && Math.random() < VSMASH_WATCH_CHANCE) return vsmashRandom(watched);
    return vsmashRandom(questions);
}

function vsmashQuestionWords(question) {
    if (question.kind === 'equals') return { id: 'value.smash.equals', vars: { note: KR.noteName(question.note) } };
    if (question.total === 1) return { id: 'value.smash.beats.one', vars: {} };
    return { id: 'value.smash.beats', vars: { n: question.total } };
}

function loadValueSmashScreen() {
    const s = vsmashSmash;
    const cardCount = VSMASH_TIERS[s.tier];
    const question = vsmashPickQuestion();
    const isDud = !s.lastDud && Math.random() < VSMASH_DUD_RATE;
    const band = VSMASH_TARGET_BANDS[s.tier];
    const targets = isDud ? 0 : Math.min(cardCount, vsmashRandomInt(band[0], band[1]));

    const cards = [];
    for (let i = 0; i < cardCount; i++) {
        cards.push(vsmashMakeCard(question, i < targets) || vsmashMakeCard(question, false));
    }
    vsmashShuffle(cards);
    if (targets > 0 && Math.random() < VSMASH_GOLD_RATE) cards.find(c => c.target).gold = true;

    Object.assign(s, { question: question, cards: cards, isDud: isDud,
        targets: cards.filter(c => c.target).length, found: 0, wrongHere: 0, combo: 0, busy: false });
    s.flashTotal = s.tier === 0 ? null : cardCount / 3 + 2;
    s.flash = s.flashTotal;

    // The target is SPOKEN only when it changes (Note Smash's re-announcing
    // is CLAUDE.md open item 4 - not to be copied). It is always SHOWN.
    const words = vsmashQuestionWords(question);
    const spoken = question.key !== s.lastAnnounced;
    KR.say(words.id, { box: vsmashGuide(), vars: words.vars, silent: !spoken });
    s.lastAnnounced = question.key;

    document.getElementById('value-floor-label').textContent = KR.t('value.smash.header', {
        floor: vsmashFloorName(s.floor.id), cards: cardCount });
    document.getElementById('value-flash').hidden = s.flashTotal === null;
    document.getElementById('value-nothing').hidden = s.tier !== 0;
    renderValueSmashGrid();
    vsmashUpdateHud();
    vsmashShowTarget(question);
    if (spoken) vsmashAnnounce();
}

// How many beats to smash, as a big number and that many dots, so the answer
// is a picture as well as a word. Shown for the whole screen. "Equals" screens
// name a note instead, so they have no number to show.
function vsmashShowTarget(question) {
    const row = document.getElementById('value-targetrow');
    row.hidden = question.kind !== 'beats';
    if (row.hidden) return;
    document.getElementById('value-target-n').textContent = KR.t('value.smash.target', { n: question.total });
    const dots = document.getElementById('value-target-dots');
    dots.textContent = '';
    for (let i = 0; i < question.total; i++) {
        const dot = document.createElement('span');
        dot.className = 'vsmash-target-dot';
        dots.appendChild(dot);
    }
}

// The coach says the target BEFORE anything counts down. Rob, 2026-10-18: the
// timer was half gone before the student knew how many beats to smash. While
// the line is spoken the cards are dimmed and untappable, the target is
// enlarged, and neither clock runs (the tick skips a busy screen). Held at
// least VSMASH_ANNOUNCE_MIN_MS so the number registers with the sound off,
// and never waited on longer than VSMASH_ANNOUNCE_MAX_MS. Only called when the
// line is spoken: a target that repeats is not announced again.
function vsmashAnnounce() {
    const s = vsmashSmash;
    const screen = document.getElementById('value-screen-game');
    s.busy = true;
    screen.classList.add('announcing');
    const started = performance.now();
    const token = s.announce = (s.announce || 0) + 1;   // a newer announcement takes over from an older one
    const check = () => {
        if (vsmashSmash !== s || s.announce !== token) return;
        const waited = performance.now() - started;
        if (waited < VSMASH_ANNOUNCE_MIN_MS || (KR.speaking() && waited < VSMASH_ANNOUNCE_MAX_MS)) {
            return vsmashLater(check, 50);
        }
        s.busy = false;
        screen.classList.remove('announcing');
    };
    vsmashLater(check, 50);
}

function renderValueSmashGrid() {
    const s = vsmashSmash;
    const stage = document.getElementById('value-stage');
    stage.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'vsmash-grid tier-' + (s.tier + 1) + (s.sprint ? ' no-bars' : ''); // text-ok
    stage.appendChild(grid);
    const gap = 8;
    const cardWidth = Math.floor((stage.clientWidth - 2 * gap) / 3);
    s.cards.forEach((card, index) => {
        const el = document.createElement('button');
        el.className = 'vsmash-card' + (card.gold ? ' gold' : '');
        const notes = document.createElement('div');
        notes.className = 'vsmash-card-notes';
        el.appendChild(notes);
        vsmashDrawNotes(notes, card.units.map(vsmashSpec), cardWidth - 8);
        // The duration bar: as long as the card lasts, a whole bar being the
        // full card. Tier 1 shows it, tier 2 fades it, tiers 3-4 take it away.
        const bar = document.createElement('div');
        bar.className = 'vsmash-dur';
        const fill = document.createElement('span');
        fill.style.width = (100 * card.total / VSMASH_BAR_BEATS) + '%';
        bar.appendChild(fill);
        el.appendChild(bar);
        el.onclick = () => tapValueSmashCard(index, el);
        card.el = el;
        grid.appendChild(el);
    });
}

function vsmashUpdateHud() {
    const s = vsmashSmash;
    document.getElementById('value-streak').innerHTML = [0, 1, 2]
        .map(i => '<span class="streak-dot' + (i < s.streak ? ' active' : '') + '"></span>').join(''); // text-ok
    document.getElementById('value-joker').hidden = !s.joker;
    const medal = document.getElementById('value-medal');
    medal.hidden = !VSMASH_MEDALS[s.best];
    if (VSMASH_MEDALS[s.best]) medal.textContent = KR.t('value.medal.' + VSMASH_MEDALS[s.best]);
    document.getElementById('value-combo').textContent = s.combo >= 2 ? KR.t('value.smash.combo', { n: s.combo }) : '';
    document.getElementById('value-score').textContent = KR.t('value.smash.score', { n: s.score });
    const clock = document.getElementById('value-clock');
    clock.hidden = s.clock === null;
    if (s.clock !== null) clock.textContent = KR.t('value.smash.clock', { n: Math.max(0, Math.ceil(s.clock)) });
    const fill = document.getElementById('value-flash-fill');
    if (s.flashTotal) fill.style.width = Math.max(0, 100 * s.flash / s.flashTotal) + '%';
}

function vsmashSmashTick(dt) {
    const s = vsmashSmash;
    if (!s || s.busy) return;
    if (s.clock !== null) {
        s.clock -= dt;
        if (s.clock <= 0) return vsmashSmashTimeUp();
    }
    if (s.flashTotal !== null) {
        s.flash -= dt;
        if (s.flash <= 0) return vsmashSmashFlashOut();
    }
    vsmashUpdateHud();
}

function vsmashAddTime(seconds) {
    const s = vsmashSmash;
    if (s.clock === null) return;
    s.clock = Math.max(0, s.clock + seconds);
    const clock = document.getElementById('value-clock');
    clock.classList.remove('gain', 'lose');
    void clock.offsetWidth;
    clock.classList.add(seconds > 0 ? 'gain' : 'lose');
}

function tapValueSmashCard(index, el) {
    const s = vsmashSmash;
    if (!s || s.busy) return;
    const card = s.cards[index];
    if (card.smashed) return;

    if (card.target) {
        card.smashed = true;
        s.found++;
        s.combo++;
        const points = s.combo * (card.gold ? 3 : 1);
        s.score += points;
        vsmashCrack(Math.min(s.combo - 1, VSMASH_COMBO_STEPS));
        vsmashShatter(el);
        KR.event('value.smash.correct', { points: points, combo: s.combo });
        if (card.gold) KR.event('value.smash.gold', { points: points });
        vsmashUpdateHud();
        if (s.found >= s.targets) {
            s.busy = true;
            vsmashLater(() => vsmashSmashResolve(true), 450);
        }
        return;
    }
    vsmashSmashWrong();
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// A wrong tap - on a card, or "Nothing here" when something was there.
function vsmashSmashWrong() {
    const s = vsmashSmash;
    playSound('wrong');
    s.wrong++;
    s.wrongHere++;
    s.combo = 0;
    s.watch[s.question.key] = VSMASH_WATCH_SCREENS;
    vsmashAddTime(-VSMASH_WRONG_TAP_SECONDS);
    KR.event('value.smash.wrong', { question: s.question.key });
    vsmashUpdateHud();
}

// Tier 1's answer to a dud screen. There is no clock to wait out.
function tapValueNothing() {
    const s = vsmashSmash;
    if (!s || s.busy) return;
    if (s.isDud) {
        if (s.wrongHere === 0) return vsmashSmashDud();
        // Right, but after a wrong tap: move on, and no joker for it.
        s.busy = true;
        s.lastDud = true;
        return vsmashLater(loadValueSmashScreen, 400);
    }
    const button = document.getElementById('value-nothing');
    button.classList.remove('shake');
    void button.offsetWidth;
    button.classList.add('shake');
    vsmashSmashWrong();
}

function vsmashSmashDud() {
    const s = vsmashSmash;
    s.busy = true;
    s.joker = true;
    s.lastDud = true;
    s.cards.forEach(c => c.el.classList.add('dud-right'));
    playSound('correct');
    vsmashAddTime(VSMASH_TIERS[s.tier] / 3 + 2);
    KR.event('value.smash.dud');
    KR.say('value.smash.dud', { box: vsmashGuide(), silent: true });
    vsmashUpdateHud();
    vsmashLater(loadValueSmashScreen, 900);
}

// The flash timer ran out (tier 2 and up).
function vsmashSmashFlashOut() {
    const s = vsmashSmash;
    if (s.isDud) {
        if (s.wrongHere === 0) return vsmashSmashDud();
        s.busy = true;
        s.lastDud = true;
        return vsmashLater(loadValueSmashScreen, 400);
    }
    vsmashSmashResolve(false);
}

// A screen ends: cleared (every target smashed) or missed (time ran out).
function vsmashSmashResolve(cleared) {
    const s = vsmashSmash;
    s.busy = true;
    s.lastDud = false;
    // Tier 1 has no clock, so a wrong tap there has nothing to cost but the
    // streak - otherwise tapping everything would clear it.
    const spoiled = !cleared || (s.tier === 0 && s.wrongHere > 0);

    if (spoiled) {
        if (!cleared) {
            s.watch[s.question.key] = VSMASH_WATCH_SCREENS;
            // Show them what they missed: every point is a teaching point.
            s.cards.forEach(c => { if (c.target && !c.smashed) c.el.classList.add('missed'); });
        }
        if (s.joker) {
            s.joker = false;
            KR.say('value.smash.jokerUsed', { box: vsmashGuide(), silent: true });
        } else {
            s.streak = 0;
            if (!cleared) KR.say('value.smash.missed', { box: vsmashGuide(), silent: true });
        }
        vsmashUpdateHud();
        return vsmashLater(loadValueSmashScreen, cleared ? 450 : 1400);
    }

    s.streak++;
    vsmashAddTime(VSMASH_TIERS[s.tier] / 3 + 2);
    if (s.watch[s.question.key]) s.watch[s.question.key]--;
    s.cards.forEach(c => c.el.classList.add('screen-clear'));
    vsmashUpdateHud();

    if (s.streak < 3) return vsmashLater(loadValueSmashScreen, 350);

    s.streak = 0;
    const top = s.tier === VSMASH_TIERS.length - 1;
    if (s.sprint) {
        // A medal for every tier cleared, as in Real Smash: tier 2 Bronze,
        // tier 3 Silver, tier 4 Gold. At the top the Sprint stays put.
        s.best = Math.max(s.best, s.tier);
        playSound('complete');
        vsmashUpdateHud();
        if (top) {
            KR.say('value.sprint.topTier', { box: vsmashGuide(), vars: { medal: KR.t('value.medal.gold') } });
            return vsmashLater(loadValueSmashScreen, 1600);
        }
    } else if (top) {
        return vsmashSmashCleared();
    }
    s.tier++;
    KR.event('value.smash.tierUp', { tier: s.tier + 1 });
    if (!s.sprint) playSound('complete');
    const startsClock = s.clock === null;
    if (startsClock) s.clock = VSMASH_CLOCK_SECONDS;
    const earned = s.sprint ? 'value.sprint.medalEarned' : startsClock ? 'value.smash.tierUpClock' : 'value.smash.tierUp';
    KR.say(earned, { box: vsmashGuide(), vars: { cards: VSMASH_TIERS[s.tier], seconds: VSMASH_CLOCK_SECONDS,
        medal: VSMASH_MEDALS[s.best] ? KR.t('value.medal.' + VSMASH_MEDALS[s.best]) : '' } });
    s.lastAnnounced = null;   // a new tier announces its first target aloud
    vsmashUpdateHud();
    vsmashLater(loadValueSmashScreen, 2200);
}

function vsmashSmashCleared() {
    const s = vsmashSmash;
    vsmashSmash = null;
    vsmashFloorCleared(s.floor, { seconds: (Date.now() - s.started) / 1000, wrong: s.wrong, score: s.score });
}

function vsmashSmashTimeUp() {
    const s = vsmashSmash;
    vsmashSmash = null;
    if (s.sprint) return vsmashSprintEnd(s);
    showValueTimeUp({ cards: VSMASH_TIERS[s.tier], score: s.score }, s.floor);
}

/* =========================================
   FLOOR v1-sprint: THE SPRINT and THE ARTISTIC LICENSE
   =========================================
   60 seconds of everything the Smash floor asks. The medal is the highest
   tier CLEARED, as in Real Smash - the Sprint starts at tier 2, so "reached"
   would hand out Bronze for turning up. Bronze or better clears the floor.
   Stars follow the medal: Bronze 1, Silver 2, Gold 3 - a fixed 60 s leaves
   no finishing time to beat.

   Clearing it the first time awards the ARTISTIC LICENSE, which opens
   Rhythm Stomp Lab (CLAUDE.md "SILOS AND BRIDGES"): a full-screen ceremony
   card, presented by Tango once her art exists.
   ========================================= */
const VSMASH_MEDALS = { 1: 'bronze', 2: 'silver', 3: 'gold' };   // tier index cleared -> medal

function vsmashSprintEnd(s) {
    const medal = VSMASH_MEDALS[s.best];
    const result = { seconds: VSMASH_SPRINT_SECONDS, wrong: s.wrong, score: s.score, untimed: true };
    if (medal) {
        KR.event('value.sprint.medal', { medal: medal });
        result.medal = medal;
        result.stars = s.best;
        return vsmashFloorCleared(s.floor, result);
    }
    // No medal: the score still counts as a personal best.
    const progress = vsmashLoad();
    const record = progress.floors[s.floor.id] || {};
    result.newBest = vsmashRecordScore(record, s.score);
    progress.floors[s.floor.id] = record;
    vsmashSave(progress);
    const line = vsmashResultsBody();
    line('vsmash-result-title', KR.t('value.results.timeUp'));
    vsmashResultsActions(vsmashRetryActions(s.floor));
    line('vsmash-result-line', KR.t('value.sprint.needBronze', { cards: VSMASH_TIERS[1] }));
    vsmashScoreLines(line, s.floor.id, result);
    playSound('timeout');
}

function vsmashLicenseCeremony() {
    const player = vsmashCurrentPlayer();
    document.getElementById('value-license-name').textContent =
        KR.t('value.license.holder', { name: player ? player.name : '' });
    document.getElementById('modal-value-license').classList.add('show');
    KR.say('value.license.say', { box: document.getElementById('value-license-guide'), speaker: 'tango' });
    playSound('complete');
}

function closeValueLicense() {
    document.getElementById('modal-value-license').classList.remove('show');
}

function openStompFromLicense() {
    closeValueLicense();
    launchGame('view-rhythm-lab');
}

/* ---------- The Stomp Lab gate ----------
   Called from the top of enterRhythmLab() in rhythm-stomp-lab.js - the only
   change to that file. Returns true when it has turned the student back.
   Only a student who has NEVER played Stomp Lab (no finished level, only
   level 1 open) and has no License is stopped. Anyone who has already
   played is never blocked, and nothing is ever re-locked. */
function vsmashGateStompLab() {
    const stomp = getRstompProgress();
    const unlocked = stomp.unlockedStages || ['1'];
    const neverPlayed = (stomp.totalPlays || 0) === 0 && unlocked.length === 1 && unlocked[0] === '1';
    if (!neverPlayed || vsmashLoad().license) return false;
    launchGame('view-dashboard');
    document.getElementById('modal-value-gate').classList.add('show');
    KR.say('value.license.needed', { box: document.getElementById('value-gate-guide'), speaker: 'tango' });
    return true;
}

function closeValueGate() {
    document.getElementById('modal-value-gate').classList.remove('show');
}

function openValueFromGate() {
    closeValueGate();
    enterValueSmash();
}

/* ---------- Feel ---------- */

// The snare crack from rhythm-audio.js (raudioTapSnare's own recipe), raised
// a whole tone per step of the combo.
function vsmashCrack(step) {
    if (typeof rstompAudio !== 'function') return;
    const ctx = rstompAudio();
    if (!ctx) return;
    const ratio = Math.pow(2, 2 * step / 12);
    const fire = () => {
        const when = raudioCtx.currentTime + 0.02;
        try {
            raudioNoise(when, 0.15, 0.90, 2200 * ratio, 0.7, 'rhythm');
            raudioNoise(when, 0.04, 0.70, 5200 * ratio, 0.5, 'rhythm');
            raudioTone(when, 205 * ratio, 0.055, 0.40, 'triangle', 'rhythm');
        } catch (e) { /* a missing sound must never block the game */ }
    };
    if (ctx.state === 'suspended') ctx.resume().then(fire).catch(fire);
    else fire();
}

// The card shatters INSIDE ITS OWN BOX (it clips its pieces), so the effect
// never covers a card still in play.
function vsmashShatter(el) {
    const notes = el.querySelector('.vsmash-card-notes');
    const pieces = [
        'polygon(0 0, 50% 0, 50% 50%, 0 60%)', 'polygon(50% 0, 100% 0, 100% 45%, 50% 50%)',
        'polygon(0 60%, 50% 50%, 45% 100%, 0 100%)', 'polygon(50% 50%, 100% 45%, 100% 100%, 45% 100%)',
    ];
    pieces.forEach((clip, i) => {
        const piece = document.createElement('div');
        piece.className = 'vsmash-shard shard-' + i; // text-ok
        piece.style.clipPath = clip;
        piece.innerHTML = notes.innerHTML;
        el.appendChild(piece);
    });
    el.classList.add('smashed');
    vsmashLater(() => el.querySelectorAll('.vsmash-shard').forEach(p => p.remove()), 500);
}

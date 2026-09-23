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
const VSMASH_STAR_TIME = { tree: 60, smash: 120 };   // seconds to beat for the second star

const VSMASH_PLAYERS_KEY = 'koolRiffsPlayers';
const VSMASH_PROGRESS_KEY = 'koolRiffsValueProgress';
const VSMASH_MAX_STARS = 3;

let vsmashSelectedFloor = null;
let vsmashTimers = [];       // every pending timeout, so leaving a floor stops it dead

function vsmashLater(fn, ms) {
    vsmashTimers.push(setTimeout(fn, ms));
}

function vsmashStopTimers() {
    vsmashTimers.forEach(clearTimeout);
    vsmashTimers = [];
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
        unlocked: VSMASH_FLOORS.filter(f => f.unlock === null).map(f => f.id),
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
   locked = icon only; unlocked = icon + name; cleared = icon + name + stars.
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
    track.innerHTML = '';
    VSMASH_FLOORS.forEach((floor, index) => {
        const isUnlocked = unlocked.has(floor.id);
        const record = progress.floors[floor.id];
        const node = document.createElement('button');
        node.className = 'pathway-node' + (isUnlocked ? ' unlocked' : ' locked')
            + (floor.id === recommended ? ' recommended' : '')
            + (record && record.cleared ? ' cleared' : '');
        node.disabled = !isUnlocked;

        const icon = document.createElement('span');
        icon.className = 'pathway-node-icon';
        icon.textContent = isUnlocked ? String(index + 1) : KR.t('value.floor.lockedIcon');
        node.appendChild(icon);
        if (isUnlocked) {
            const label = document.createElement('span');
            label.className = 'pathway-node-label';
            label.textContent = vsmashFloorName(floor.id);
            node.appendChild(label);
            if (record && record.cleared) {
                const stars = document.createElement('small');
                stars.className = 'vsmash-stars';
                stars.textContent = vsmashStars(record.stars || 0);
                node.appendChild(stars);
            }
            node.onclick = () => selectValueFloor(floor.id);
        }
        track.appendChild(node);
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
    switchScreenState('value', 'value-screen-game');
    vsmashRefreshTreeButton();
    document.getElementById('value-floor-label').textContent = vsmashFloorName(floor.id);
    document.getElementById('value-stage').innerHTML = '';
    KR.event('value.floor.start', { floor: floor.id });

    if (floor.kind === 'tree') return startValueTree(floor);
    // Smash and the Sprint arrive in later steps.
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
    const stars = 1 + (inTime ? 1 : 0) + (inTime && result.wrong === 0 ? 1 : 0);

    record.cleared = true;
    record.stars = Math.max(record.stars || 0, stars);
    if (record.bestTime == null || result.seconds < record.bestTime) record.bestTime = result.seconds;
    progress.floors[floor.id] = record;

    const opened = VSMASH_FLOORS.filter(f => f.unlock === floor.id && !progress.unlocked.includes(f.id));
    opened.forEach(f => progress.unlocked.push(f.id));
    if (opened.length) progress.lastFloor = opened[0].id;
    vsmashSave(progress);

    KR.event('value.floor.cleared', { floor: floor.id, stars: stars });
    showValueResults(floor, stars, result, opened);
}

function showValueResults(floor, stars, result, opened) {
    vsmashStopTimers();
    switchScreenState('value', 'value-screen-results');
    vsmashRefreshTreeButton();
    const body = document.getElementById('value-results-body');
    body.innerHTML = '';
    const line = (className, words) => {
        const el = document.createElement('p');
        el.className = className;
        el.textContent = words;
        body.appendChild(el);
    };
    line('vsmash-result-title', KR.t('value.results.cleared', { floor: vsmashFloorName(floor.id) }));
    line('vsmash-result-stars', vsmashStars(stars));
    line('vsmash-result-line', KR.t('value.results.time', { seconds: Math.round(result.seconds) }));
    opened.forEach(f => line('vsmash-result-open', KR.t('value.results.opened', { floor: vsmashFloorName(f.id) })));
    playSound('complete');
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
const vsmashDrawCache = {};

function vsmashDrawNotes(el, specs, width) {
    width = Math.max(40, Math.round(width));
    const key = width + '|' + specs.map(s => s.value + (s.isRest ? 'r' : '')).join(',');
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
        stave.setContext(context).draw();
        const notes = specs.map(spec => {
            const note = new VF.StaveNote({ clef: 'treble', keys: ['b/4'], stem_direction: 1,
                duration: spec.isRest ? spec.value + 'r' : spec.value });
            if (note.dots) note.addDotToAll();   // VexFlow won't draw the dot on its own
            return note;
        });
        const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
        voice.addTickables(notes);
        new VF.Formatter().joinVoices([voice]).format([voice], Math.max(10, width - 34));
        voice.draw(context, stave);
        const svg = scratch.querySelector('svg');
        svg.setAttribute('viewBox', '0 ' + VSMASH_CROP_TOP + ' ' + width + ' ' + VSMASH_CROP_HEIGHT);
        svg.setAttribute('width', width);
        svg.setAttribute('height', VSMASH_CROP_HEIGHT);
        svg.style.width = width + 'px';
        svg.style.height = VSMASH_CROP_HEIGHT + 'px';
        vsmashDrawCache[key] = scratch.innerHTML;
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

   Tap a tile in the tray and it goes into the HIGHEST ROW THAT STILL HAS
   ROOM. The right value drops in; the wrong one is refused - a clunk, a
   shake, and the guide box says why. A full row plays back, one snare per
   note at 0.5 s a beat. (A rest row plays the brush: a snare on a silence
   would say the opposite of what the row means.)

   Round 1: the whole note is given; build down.
   Round 2: the half or the quarter row is given; build up and down.
   Round 3: the rest tree. The tray holds the notes as well, so a note
            offered to a rest row is refused - sound is not silence.
   A round counts only with at most VSMASH_TREE_REFUSALS_ALLOWED refusals;
   otherwise it is built again from a new random start.
   ========================================= */
const VSMASH_TREES = {
    notes: ['whole-note', 'half-note', 'quarter-note'],
    rests: ['whole-rest', 'half-rest', 'quarter-rest'],
};
const VSMASH_TREE_ROUNDS = [
    { tree: 'notes', given: () => 0 },
    { tree: 'notes', given: () => 1 + Math.floor(Math.random() * 2) },
    { tree: 'rests', given: () => 0 },
];

let vsmashTree = null;   // the Tree floor in play, or null

function startValueTree(floor) {
    vsmashTree = { floor: floor, round: 0, started: Date.now(), wrong: 0 };
    vsmashTreeRound(VSMASH_TREE_ROUNDS[0].given());
}

// Lay out one round: `given` is the row that starts full.
function vsmashTreeRound(given) {
    const round = VSMASH_TREE_ROUNDS[vsmashTree.round];
    const values = VSMASH_TREES[round.tree];
    vsmashTree.values = values;
    vsmashTree.rows = values.map((v, i) => i === given
        ? Array(VSMASH_BAR_BEATS / vsmashBeats(v)).fill(v) : []);
    vsmashTree.refusals = 0;
    vsmashTree.busy = false;
    vsmashTree.tray = round.tree === 'rests'
        ? ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest']
        : VSMASH_TREES.notes.slice();

    document.getElementById('value-floor-label').textContent = KR.t('value.tree.header', {
        floor: vsmashFloorName(vsmashTree.floor.id),
        n: vsmashTree.round + 1, total: VSMASH_TREE_ROUNDS.length });
    renderValueTree();
    KR.say(round.tree === 'rests' ? 'value.tree.startRests' : 'value.tree.start',
        { box: vsmashGuide(), vars: { row: KR.noteName(values[given]) } });
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
    vsmashDrawNotes(notes, [vsmashSpec(valueId)], width - 6);
    return tile;
}

function vsmashTileWidth(valueId, rowWidth) {
    return rowWidth * vsmashBeats(valueId) / VSMASH_BAR_BEATS;
}

function vsmashRowWidth(container) {
    return Math.floor(container.clientWidth) - 6;   // less the row's border
}

function renderValueTree() {
    const stage = document.getElementById('value-stage');
    stage.innerHTML = '';
    const rowWidth = vsmashRowWidth(stage);
    const target = vsmashTreeTarget();

    const rows = document.createElement('div');
    rows.className = 'vsmash-tree-rows';
    vsmashTree.rows.forEach((row, index) => {
        const el = document.createElement('div');
        el.className = 'vsmash-tree-row' + (index === target ? ' target' : '');
        row.forEach(v => el.appendChild(vsmashTile(v, vsmashTileWidth(v, rowWidth))));
        rows.appendChild(el);
    });
    stage.appendChild(rows);

    // The tray's tiles are the width they will take up in a row, less the
    // gap between them, so a half note and a half rest fit on one line.
    const tray = document.createElement('div');
    tray.className = 'vsmash-tray';
    vsmashTree.tray.forEach(v => {
        const tile = vsmashTile(v, vsmashTileWidth(v, rowWidth) - 8, 'button');
        tile.onclick = () => tapValueTreeTile(v, tile);
        tray.appendChild(tile);
    });
    stage.appendChild(tray);
}

function tapValueTreeTile(valueId, tile) {
    if (!vsmashTree || vsmashTree.busy) return;
    const target = vsmashTreeTarget();
    if (target < 0) return;
    const rowValue = vsmashTree.values[target];

    if (valueId !== rowValue) {
        vsmashTree.refusals++;
        vsmashTree.wrong++;
        playSound('wrong');
        tile.classList.remove('shake');
        void tile.offsetWidth;            // restart the shake on a second tap
        tile.classList.add('shake');
        KR.event('value.tree.refuse', { tile: valueId, row: rowValue });
        const why = vsmashTreeRefusal(valueId, rowValue);
        KR.say(why.id, { box: vsmashGuide(), vars: why.vars });
        return;
    }

    vsmashTree.rows[target].push(valueId);
    vsmashTapSound(valueId);
    renderValueTree();
    const dropped = document.querySelectorAll('.vsmash-tree-row')[target].lastElementChild;
    if (dropped) dropped.classList.add('drop');
    if (vsmashTreeRowBeats(vsmashTree.rows[target]) === VSMASH_BAR_BEATS) vsmashTreeRowFull(target);
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
    let at = 400;   // let the last tap's own sound finish first
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
        const top = vsmashTree.values[0];
        if (index === 0) {
            KR.say('value.tree.rowDoneTop', { box: vsmashGuide(), vars: { row: KR.noteName(top) } });
        } else {
            KR.say('value.tree.rowDone', { box: vsmashGuide(), vars: {
                n: row.length, rows: KR.noteName(vsmashTree.values[index], { many: true }),
                top: KR.noteName(top) } });
        }
        renderValueTree();
    }, at);
}

function vsmashTreeRoundDone() {
    renderValueTree();

    if (vsmashTree.refusals > VSMASH_TREE_REFUSALS_ALLOWED) {
        KR.say('value.tree.again', { box: vsmashGuide(), vars: { n: vsmashTree.refusals } });
        vsmashTree.busy = true;
        vsmashLater(() => {
            const round = VSMASH_TREE_ROUNDS[vsmashTree.round];
            vsmashTreeRound(Math.floor(Math.random() * VSMASH_TREES[round.tree].length));
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
    vsmashLater(() => vsmashTreeRound(VSMASH_TREE_ROUNDS[vsmashTree.round].given()), 2200);
}

// A phone turned sideways changes the row width, so the tree is redrawn.
window.addEventListener('resize', () => {
    if (vsmashTree && document.getElementById('value-screen-game').classList.contains('active')) renderValueTree();
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
    const holder = document.getElementById('value-tree-card-rows');
    holder.innerHTML = '';
    const rowWidth = vsmashRowWidth(holder);
    Object.keys(VSMASH_TREES).forEach(tree => {
        VSMASH_TREES[tree].filter(v => built.includes(v)).forEach(v => {
            const row = document.createElement('div');
            row.className = 'vsmash-tree-row';
            for (let i = 0; i < VSMASH_BAR_BEATS / vsmashBeats(v); i++) {
                row.appendChild(vsmashTile(v, vsmashTileWidth(v, rowWidth)));
            }
            holder.appendChild(row);
        });
    });
}

function closeValueTreeCard() {
    document.getElementById('modal-value-tree').classList.remove('show');
}

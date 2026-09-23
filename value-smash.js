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

const VSMASH_PLAYERS_KEY = 'koolRiffsPlayers';
const VSMASH_PROGRESS_KEY = 'koolRiffsValueProgress';
const VSMASH_MAX_STARS = 3;

let vsmashSelectedFloor = null;

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
    launchGame('view-value');
    KR.event('value.open');
    if (vsmashCurrentPlayer()) showValuePathway();
    else showValuePlayers();
}

function handleValueBackButton() {
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
    const progress = vsmashLoad();
    KR.setNames(progress.namesSetting);
    renderValuePathway();
    switchScreenState('value', 'value-screen-pathway');
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

/* ---------- Starting a floor ----------
   Each kind of floor gets its own screen in a later step (the Tree, Smash,
   the Sprint). Until then a floor opens onto an empty stage. */
function startSelectedValueFloor() {
    const floor = VSMASH_FLOORS.find(f => f.id === vsmashSelectedFloor);
    if (!floor) return;
    const progress = vsmashLoad();
    const record = progress.floors[floor.id] || {};
    record.plays = (record.plays || 0) + 1;
    progress.floors[floor.id] = record;
    vsmashSave(progress);

    switchScreenState('value', 'value-screen-game');
    document.getElementById('value-floor-label').textContent = vsmashFloorName(floor.id);
    document.getElementById('value-stage').innerHTML = '';
    KR.event('value.floor.start', { floor: floor.id });
    KR.say('value.floor.empty', { box: document.getElementById('value-game-guide') });
}

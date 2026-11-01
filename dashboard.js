/* =========================================
   KOOL RIFFS - THE DASHBOARD
   =========================================
   Rob, 2026-10-05: "Move the 'What's your name' to the very top of the Kool
   Riffs game dashboard. Rework our dashboard so it shows their statistics
   and what pathways have been unlocked." In his order:

     1 Beat Smash · 2 Staff Smash · 3 Value Smash · 4 Note Smash ·
     5 Real Smash · 6 Rhythm Stomp · 7 Rhythm Stomp Lab

   with the number in the coloured square. Each card reads its game's own
   progress, through that game's own getter (never a copy of its storage),
   and shows its pathway as a row of dots (cleared, open, locked) and one
   line of numbers. A game with more stages than fit as dots shows a bar.

   The top of the dashboard says who is playing: Player 1 to 4, never a
   name (Rob, 2026-11-01: "Think of old video games like Pac-Man"). The same
   list Value Smash and Beat Smash use (vsmashPlayers). Nothing is typed.
   Loaded last, after every game, because it reads them all.
   ========================================= */

// The games, in Rob's order. onclick is the same call the old static cards
// made (the tests find the cards by it); progress() returns
// { stages: ['cleared' | 'open' | 'locked', ...], line: text }.
const KR_HOME_GAMES = [
    { id: 'beat', colour: 'red', onclick: 'enterBeatSmash()', progress: () => krHomeBeat() },
    { id: 'staff', colour: 'purple', onclick: "launchGame('view-game1')",
      progress: () => krHomeStages(getG1PathwayProgress(), g1PathwayStages.map(s => s.id)) },
    { id: 'value', colour: 'orange', onclick: 'enterValueSmash()', progress: () => krHomeValue() },
    { id: 'note', colour: 'blue', onclick: "launchGame('view-game2')",
      progress: () => krHomeStages(getG2PathwayProgress(), g2PathwayStages.map(s => s.id)) },
    { id: 'real', colour: 'green', onclick: "launchGame('view-game3')",
      progress: () => krHomeStages(getG3PathwayProgress(), g3PathwayStages.map(s => s.id)) },
    // Rhythm Stomp (id 'rhythm', view-rhythm, rhythm.js) is RETIRED, not deleted:
    // Rob, 2026-10-19, Rhythm Stomp Lab is the one counting game. To bring the card
    // back, restore: { id: 'rhythm', colour: 'gold', onclick: "launchGame('view-rhythm')",
    //   progress: () => krHomeStages(getRhythmProgress(), RHYTHM_LEVELS.map(l => l.id)) },
    { id: 'lab', colour: 'teal', onclick: "launchGame('view-rhythm-lab')",
      progress: () => krHomeStages(getRstompProgress(), RSTOMP_LEVELS.map(l => l.id)) },
];
const KR_HOME_MAX_DOTS = 10;       // more stages than this and the pathway is a bar

function krHomeMake(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
}

/* ---------- Each game's progress, read through its own getter ---------- */

// The pathway games (Staff, Note and Real Smash, Rhythm Stomp, Stomp Lab)
// all keep { unlockedStages, stageProgress: { id: { cleared, bestScore } },
// totalPlays }.
function krHomeStages(progress, ids) {
    const unlocked = new Set(progress.unlockedStages || []);
    const records = progress.stageProgress || {};
    const stages = ids.map(id => (records[id] && records[id].cleared) ? 'cleared' : unlocked.has(id) ? 'open' : 'locked');
    const best = Math.max(0, ...ids.map(id => (records[id] && records[id].bestScore) || 0));
    const plays = progress.totalPlays || 0;
    if (!plays) return { stages: stages, line: KR.t('home.stats.new') };
    const parts = [KR.t('home.stats.cleared', { cleared: stages.filter(s => s === 'cleared').length, total: ids.length })];
    if (best) parts.push(KR.t('home.stats.best', { score: Math.round(best) }));
    parts.push(KR.t('home.stats.plays', { plays: plays }));
    return { stages: stages, line: parts.join(KR.t('home.stats.join')) };
}

// Value Smash: its floors, for the player playing.
function krHomeValue() {
    const progress = vsmashLoad();
    const stages = VSMASH_FLOORS.map(f => (progress.floors[f.id] || {}).cleared ? 'cleared'
        : progress.unlocked.includes(f.id) ? 'open' : 'locked');
    const plays = VSMASH_FLOORS.reduce((a, f) => a + ((progress.floors[f.id] || {}).plays || 0), 0);
    if (!plays) return { stages: stages, line: KR.t('home.stats.new') };
    const parts = [KR.t('home.stats.cleared', { cleared: stages.filter(s => s === 'cleared').length, total: stages.length })];
    if (progress.license) parts.push(KR.t('home.stats.license'));
    parts.push(KR.t('home.stats.plays', { plays: plays }));
    return { stages: stages, line: parts.join(KR.t('home.stats.join')) };
}

// Beat Smash: its own pathway (the warm-up, the song, the three musicians of
// the band on), how far that band has got, and the songs finished.
function krHomeBeat() {
    const progress = bsmashLoad();
    const song = bsmashSongOf(progress);
    const won = id => progress.musicians[id].won;
    const stages = [progress.jamDone ? 'cleared' : 'open', song ? 'cleared' : (progress.jamDone || KR.openAll() ? 'open' : 'locked')]
        .concat(BSMASH_MUSICIANS.map((m, i) => won(m.id) ? 'cleared' : bsmashUnlocked(i, progress) ? 'open' : 'locked'));
    if (!progress.jamDone) return { stages: stages, line: KR.t('home.stats.new') };
    const bands = bsmashBands(progress);
    const finished = bsmashBandSongs().filter(id => bsmashBandFinished(id === song ? progress.musicians : (bands[id] || {}).musicians)).length;
    const parts = [];
    if (song) parts.push(KR.t('home.stats.beat.song', { song: bsmashSongName(song), status: bsmashBandStatus(progress.musicians) || KR.t('home.stats.beat.begin') }));
    if (finished) parts.push(KR.t('home.stats.beat.finished', { n: finished }));
    if (progress.permit) parts.push(KR.t('home.stats.beat.permit'));
    return { stages: stages, line: parts.length ? parts.join(KR.t('home.stats.join')) : KR.t('home.stats.beat.warmedUp') };
}

/* ---------- The dashboard ---------- */

function renderDashboard() {
    renderHomePlayer();
    const box = document.getElementById('home-games');
    if (!box) return;
    box.innerHTML = '';
    KR_HOME_GAMES.forEach((game, i) => {
        const card = krHomeMake('div', 'game-card ' + game.colour, box);
        card.dataset.game = game.id;
        card.setAttribute('onclick', game.onclick);
        // The number in the coloured square: the order Rob gave.
        krHomeMake('div', 'game-icon icon-' + game.colour, card).textContent = String(i + 1);
        const details = krHomeMake('div', 'game-details', card);
        krHomeMake('h2', null, details).textContent = KR.t('home.' + game.id + '.title');
        krHomeMake('p', null, details).textContent = KR.t('home.' + game.id + '.blurb');
        let progress = null;
        try { progress = game.progress(); } catch (e) { progress = null; }
        if (!progress) return;
        const row = krHomeMake('div', 'home-progress', details);
        if (progress.stages.length <= KR_HOME_MAX_DOTS) {
            const dots = krHomeMake('div', 'home-dots', row);
            progress.stages.forEach(state => krHomeMake('span', 'home-dot ' + state, dots));
        } else {
            const bar = krHomeMake('div', 'home-bar', row);
            const done = progress.stages.filter(s => s !== 'locked').length;
            krHomeMake('span', 'home-bar-fill', bar).style.width = Math.round(100 * done / progress.stages.length) + '%';
        }
        krHomeMake('small', 'home-stats', row).textContent = progress.line;
    });
}

/* ---------- Who is playing: the top of the dashboard ----------
   "Playing as Player 1", and a button to pass to Player 2, 3 or 4. */
let krHomeSwitching = false;

function renderHomePlayer() {
    const box = document.getElementById('home-player');
    if (!box || typeof vsmashPlayers !== 'function') return;
    const players = vsmashPlayers();
    const current = players.list.find(p => p.id === players.current);
    box.innerHTML = '';
    if (!krHomeSwitching) {
        const row = krHomeMake('div', 'home-player-row', box);
        krHomeMake('span', 'home-player-name', row).textContent = KR.t('home.player.playingAs', { name: current.name });
        const change = krHomeMake('button', 'home-player-change', row);
        change.type = 'button';
        change.textContent = KR.t('home.player.change');
        change.onclick = () => { krHomeSwitching = true; renderHomePlayer(); };
        return;
    }
    const guide = krHomeMake('div', 'kr-guide home-player-guide', box);
    krHomeMake('div', 'kr-guide-text', guide).textContent = KR.t('home.player.ask');
    const list = krHomeMake('div', 'home-player-list', box);
    players.list.forEach(p => {
        const chip = krHomeMake('button', 'home-player-chip', list);
        chip.type = 'button';
        chip.textContent = p.name;
        if (p.id === current.id) chip.classList.add('current');
        chip.onclick = () => krHomeChoose(p.id);
    });
}

// Set the player for the whole app.
function krHomeChoose(id) {
    const players = vsmashPlayers();
    if (!players.list.some(p => p.id === id)) return;
    players.current = id;
    vsmashSavePlayers(players);
    krHomeSwitching = false;
    renderDashboard();
}

document.addEventListener('DOMContentLoaded', renderDashboard);

/* =========================================
   STOMP THE BEAT, THE SONG - the screens and the sound
   =========================================
   A song played from its RECORDING, not from the synthesised band, with
   hurdles to pass: the student plays the drum part into the song, a bar, two,
   four, eight, then thirty-two (Rob, 2026-10-23). It lives in Beat Smash's
   room: its tile is on the song chooser, and its screens are screens of
   #view-beat. Nothing of Beat Smash's own band, steps or progress is touched.

   Files: stomp-song-core.js (the pure part: planning, grading, progress; tested
   in Node), content/stomp-songs.js (the song's sections and hurdles),
   content/<id>-beats.js (the beat map, generated from the audio), this file
   (screens, audio, the pad). Words are by ID (lang/en-US.js, "ssong.*").

   HOW A HURDLE PLAYS (Rob: "Don't drop out the band. Drop the guide track...
   Treat it like a recording studio"):
     1. The song is cued a few bars before the hurdle, the band playing as it
        did on the recording, and a GUIDE KICK on every beat (a softer, rounder
        kick than the student's) so the pulse is felt before it is asked for.
     2. At the punch-in the guide goes silent and REC lights. The student's taps
        are the drum part, each a bright kick, for the hurdle's bars.
     3. At the punch-out the guide comes back. Tapping past the double bar line
        spoils the take (it is read exactly as written: "stop at the double line").
   The GUIDE button: with it on, the guide plays the written rhythm in the gap
   as well (a hear-it-then-play-it helper). That take is practice: it is graded
   and explained, but does not count towards the three, or a record.

   The pad is one big pad. Timing is against the BEAT MAP, never a tempo: the
   recording speeds up from 111 to 118 bpm. A tap's time is the audio clock at
   the touch (the lag of the page taken back off) less the device's delay, as
   Stomp Lab's round and Beat Smash do (rstompRoundDelay, rstompRoundEventTime).
   ========================================= */
const SSONG_KEY = 'koolRiffsStompSong';
const SSONG_WINDOW = 0.15;           // seconds each side of a note (the matcher caps it at half the gap). Was 0.18: at 112 bpm that called two-thirds of every beat on time (Rob, 2026-10-24)
const SSONG_PRE_ROLL = 0.4;          // seconds between pressing Roll tape and the song sounding
const SSONG_PAGE_LINES_PHONE = 4;    // a long take shows this many lines at a time, then turns the page
const SSONG_PAGE_LINES_WIDE = 2;
const SSONG_SONG_GAIN = 0.95;
const SSONG_GUIDE_GAIN = 0.5;        // the guide: soft and round, under the band
const SSONG_STUDENT_GAIN = 1.0;      // the student's kick: bright, on top
const SSONG_END_FADE = 0.8;          // seconds: the song fades out at the end of a take, and when Stop is pressed
const SSONG_HEAD_HALF = 6;           // half a notehead, px: a beat is drawn at its notehead's centre
const SSONG_RUN_NEXT_MS = 2500;     // after a clean take in a run, the next one rolls on its own
const SSONG_LEVELUP_PAUSE_MS = 600;  // after the level-up celebration has gone, a breath before the next take
const SSONG_MAX_PLAYERS = 4;
const SSONG_CROTCHET_GRID = { slotsPerBar: 4, slotValue: 'q', slotsPerBeat: 1, beamSlots: 1 };
const SSONG_ANTICIPATE = 0.25;       // beats before the punch-in a tap is beat 1, early; sooner is too soon
const SSONG_KIT_FLASH_MS = 180;      // the kick drum's head lights this long on a stomp
// The songs on Beat Smash's menu, in order (Rob, 2026-10-24: "list on the menu
// only the new songs that we have mapped and are working"). The first is the
// warm-up's first tune.
const SSONG_MENU_SONGS = ['stomp-the-beat', 'the-long-hold', 'stomp-the-beat-soul'];

let ssong = null;                    // what the screen in front of the student is doing
const ssongBuffers = {};             // audio id -> AudioBuffer
const ssongLoading = {};             // audio id -> Promise

function ssongEl(id) { return document.getElementById(id); }

function ssongMake(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
}

/* ---------- progress: per device ---------- */

function ssongStorage() {
    try { return JSON.parse(localStorage.getItem(SSONG_KEY)) || {}; } catch (e) { return {}; }
}

function ssongLoadProgress(songId) {
    const all = ssongStorage();
    return Object.assign(KRStompSong.blankProgress(), all[songId]);
}

function ssongSave() {
    if (!ssong) return;
    const all = ssongStorage();
    all[ssong.id] = ssong.progress;
    all.settings = ssong.settings;
    try { localStorage.setItem(SSONG_KEY, JSON.stringify(all)); } catch (e) { /* no storage: it just isn't kept */ }
}

function ssongLoadSettings() {
    return Object.assign({ guide: false, freeGuide: true, players: 1 }, ssongStorage().settings);
}

// WHERE THE STUDENT WAS (Rob, 2026-10-24: "Carry On should remember where the
// player was the last time they were here. Return to the level and the mini
// level"). One place per device: { kind: 'warm' | 'run', song, step }, the
// run's step being the mini level (the ladder's rung: a level, two or four
// bars). Each song also keeps its own rung, progress.run.at, so picking that
// song on the menu carries on there too.
function ssongPlace() {
    const place = ssongStorage().place;
    return place && place.kind && (!place.song || KR.stompSongs[place.song]) ? place : null;
}

function ssongSavePlace(kind, song, step) {
    const all = ssongStorage();
    all.place = { kind: kind, song: song || null, step: step || 0, at: Date.now() };
    if (kind === 'warm' && song) all.warmSong = song;      // the warm-up's record carries on with the last tune
    try { localStorage.setItem(SSONG_KEY, JSON.stringify(all)); } catch (e) { /* no storage: it just isn't kept */ }
}

// A song's progress without opening it (the menu reads every song's).
function ssongProgressOf(id) { return ssongLoadProgress(id); }

// Has the warm-up's hurdle been passed on this tune? That opens the rest of
// the song: its level.
function ssongWarmPassed(id) {
    const w = ssongProgressOf(id).warm;
    return !!(w && w.passed);
}

// The songs on the menu that exist on this device, in order.
function ssongMenuSongs() {
    return SSONG_MENU_SONGS.filter(id => KR.stompSongs && KR.stompSongs[id] && KR.stompBeats && KR.stompBeats[id]);
}

// A song's level is open once its warm-up round is passed (the teacher's Open
// code opens every one).
function ssongLevelOpen(id) { return KR.openAll() || ssongWarmPassed(id); }

// A tune in the warm-up: the first always; each next once the one before has
// been warmed up (Rob: "start with the Level 1 song").
function ssongWarmOpen(id) {
    const list = ssongMenuSongs(), at = list.indexOf(id);
    return KR.openAll() || at <= 0 || ssongWarmPassed(list[at - 1]);
}

// The song set up in `ssong`, nothing playing, no screen chosen. `home` is
// where Back goes from its screens: 'song' (its own menu, the old way in from
// the song chooser) or 'beat' (Beat Smash's menu).
function ssongInit(id, home) {
    if (typeof bsmashStopAll === 'function') bsmashStopAll();
    ssongHalt();
    const song = KR.stompSongs && KR.stompSongs[id];
    const beats = KR.stompBeats && KR.stompBeats[id];
    if (!song || !beats) { ssong = null; return false; }
    ssong = {
        id: id, song: song, beats: beats, mode: 'menu', state: 'menu', home: home || 'song',
        progress: ssongLoadProgress(id), settings: ssongLoadSettings(),
        sources: [], pads: null, frame: 0, taps: [], delay: { delay: 0, source: 'none' },
    };
    if (ssongAudio()) ssongLoadAssets().catch(() => { /* shown when a take is rolled */ });
    return true;
}

/* ---------- the sounds ---------- */

function ssongAudio() { return typeof rstompAudio === 'function' ? rstompAudio() : null; }

function ssongFetchBuffer(audioId) {
    if (ssongBuffers[audioId]) return Promise.resolve(ssongBuffers[audioId]);
    if (ssongLoading[audioId]) return ssongLoading[audioId];
    const ctx = ssongAudio();
    const file = KR.audio && KR.audio[audioId];
    if (!ctx || !file) return Promise.reject(new Error('no audio')); // text-ok
    ssongLoading[audioId] = fetch(file)
        .then(r => { if (!r.ok) throw new Error('missing ' + file); return r.arrayBuffer(); })
        .then(data => new Promise((ok, no) => ctx.decodeAudioData(data, ok, no)))
        .then(buffer => (ssongBuffers[audioId] = buffer))
        .catch(err => { delete ssongLoading[audioId]; throw err; });
    return ssongLoading[audioId];
}

function ssongLoadAssets() {
    return Promise.all([ssongFetchBuffer(ssong.song.audio), ssongFetchBuffer(ssong.song.kick)]);
}

// One kick, booked on the audio clock. The guide is the same drum with the
// click filtered off and played quieter: round, under the band; the student's
// is the whole sample.
function ssongKick(when, guide) {
    const ctx = ssongAudio();
    const buffer = ssongBuffers[ssong.song.kick];
    if (!ctx || !buffer) return null;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = guide ? SSONG_GUIDE_GAIN : SSONG_STUDENT_GAIN;
    if (guide) {
        const round = ctx.createBiquadFilter();
        round.type = 'lowpass'; round.frequency.value = 170;
        src.connect(round); round.connect(gain);
        gain.connect(ssong.guideBus);
    } else {
        src.connect(gain); gain.connect(ctx.destination);
    }
    src.start(Math.max(when, ctx.currentTime));
    if (guide) ssong.sources.push(src);
    return src;
}

// The song itself from `cueAt` seconds into the file, fading in so a cue in the
// middle of a bar never clicks; and a guide bus every guide kick goes through.
function ssongStartSong(cueAt, startWhen, stopAfter) {
    const ctx = ssongAudio();
    const src = ctx.createBufferSource();
    src.buffer = ssongBuffers[ssong.song.audio];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startWhen);
    gain.gain.linearRampToValueAtTime(SSONG_SONG_GAIN, startWhen + 0.2);
    src.connect(gain); gain.connect(ctx.destination);
    src.start(startWhen, cueAt);
    ssong.songSource = src;
    ssong.songGain = gain;
    if (stopAfter != null) {
        // Fade out over half a second at the end, then stop.
        const end = startWhen + stopAfter;
        gain.gain.setValueAtTime(SSONG_SONG_GAIN, end - 0.5);
        gain.gain.linearRampToValueAtTime(0.0001, end);
        src.stop(end + 0.05);
    }
    ssong.guideBus = ctx.createGain();
    ssong.guideBus.gain.value = 1;
    ssong.guideBus.connect(ctx.destination);
}

// Stop the song, fading over `fade` seconds (Rob, 2026-10-23: "a quick fade
// at the end of every take... more listenable"). The guide kicks fade with it,
// and anything booked after the fade is stopped then.
function ssongStopSound(fade) {
    const ctx = ssongAudio();
    if (!ssong || !ctx) return;
    const now = ctx.currentTime;
    const end = now + Math.max(0.05, fade || 0);
    const fadeOut = g => {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0.0001, end);
    };
    try {
        if (ssong.songGain) fadeOut(ssong.songGain);
        if (ssong.guideBus) fadeOut(ssong.guideBus);
        if (ssong.songSource) ssong.songSource.stop(end + 0.02);
        (ssong.sources || []).forEach(s => { try { s.stop(end + 0.02); } catch (e) { /* not started yet */ } });
        const bus = ssong.guideBus;
        if (bus) setTimeout(() => { try { bus.disconnect(); } catch (e) { /* gone */ } }, (end - now) * 1000 + 100);
    } catch (e) { /* already stopped */ }
    ssong.songSource = null; ssong.songGain = null; ssong.guideBus = null; ssong.sources = [];
}

/* ---------- coming in and going out ---------- */

function showStompSong(id) {
    if (!ssongInit(id, 'song')) return;
    ssongEl('ssong-title').textContent = KR.t(ssong.song.title || 'ssong.title');
    switchScreenState('beat', 'ssong-screen-menu');
    ssongRenderMenu();
    ssongEvent('ssong.menu');
}

// Stop everything this song is doing: sounds, the frame loop, the pad.
function ssongHalt(fade) {
    if (!ssong) return;
    ssongCancelNext();
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssongStopSound(fade);
    if (ssong.pads) { ssong.pads.destroy(); ssong.pads = null; }
    ssong.state = 'menu';
    ssongKitFrame(null);
}

// The back button: from a take to the song's menu, from the menu to the song
// chooser. Returns true when it handled it.
// From Beat Smash's menu, Back goes back there: from the warm-up's play
// screen to its tune picker, from anything else to the menu.
function ssongHandleBack(active) {
    if (!active || active.id.indexOf('ssong-screen-') !== 0) return false;
    if (active.id === 'ssong-screen-warm') { ssongToBeatMenu(); return true; }
    if (ssong && ssong.home === 'beat' && active.id === 'ssong-screen-play') {
        if (ssong.mode === 'warm') ssongOpenWarmPick(); else ssongToBeatMenu();
        return true;
    }
    if (active.id === 'ssong-screen-play') { ssongToMenu(); return true; }
    ssongHalt();
    ssong = null;
    showBeatSongs();
    return true;
}

function ssongToBeatMenu() {
    ssongHalt();
    ssong = null;
    showBeatPathway();
}

function ssongToMenu() {
    if (ssong && ssong.home === 'beat') return ssongToBeatMenu();
    ssongHalt();
    ssong.mode = 'menu';
    switchScreenState('beat', 'ssong-screen-menu');
    ssongRenderMenu();
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden && ssong && ssong.state !== 'menu') ssongToMenu();
});

// EACH SONG IS A LEVEL (Rob, 2026-10-24): a song's `album` is a Stomp Lab
// album, and its place among the albums is the song's level number.
// { n, name } for the tile, or null for a song that is not a level.
// A song with no album may still name its level (Stomp the Beat, the crotchet
// song, is Level 1 on the menu but runs every level as the test bed).
function ssongLevelOf(song) {
    if (!song || typeof RSTOMP_ALBUMS === 'undefined') return null;
    const at = song.album ? RSTOMP_ALBUMS.findIndex(a => a.id === song.album) : (song.level ? song.level - 1 : -1);
    return at < 0 || !RSTOMP_ALBUMS[at] ? null : { n: at + 1, name: KR.t(RSTOMP_ALBUMS[at].titleId) };
}

function ssongEvent(name, vars) {
    if (typeof KR !== 'undefined' && KR.event) KR.event(name, vars);
}

/* ---------- the song's menu ---------- */

function ssongHurdleName(hurdle) { return KR.t('ssong.hurdle.' + hurdle.id); }

function ssongStars(n, needs) {
    let s = '';
    for (let i = 0; i < needs; i++) s += i < n ? '★' : '☆';
    return s;
}

function ssongRenderMenu() {
    const body = ssongEl('ssong-menu-body');
    body.innerHTML = '';
    const song = ssong.song, progress = ssong.progress;
    const open = KR.openAll();

    // THE RUN (Rob, 2026-10-23): one question, how many are playing (1 to
    // start), then go. The levels are hidden: the takes just keep coming.
    ssongMake('p', 'ssong-players-q', body).textContent = KR.t('ssong.run.players');
    const players = ssongMake('div', 'ssong-players', body);
    for (let n = 1; n <= SSONG_MAX_PLAYERS; n++) {
        const chip = ssongMake('button', 'ssong-player-chip', players);
        chip.type = 'button';
        chip.textContent = String(n);
        chip.dataset.players = String(n);
        chip.classList.toggle('on', ssong.settings.players === n);
        chip.onclick = () => { ssong.settings.players = n; ssongSave(); ssongRenderMenu(); };
    }
    const go = ssongMake('button', 'kr-btn kr-btn-go ssong-run-go', body); // text-ok
    go.type = 'button';
    go.textContent = KR.t('ssong.run.go');
    go.onclick = () => ssongOpenRun();
    if (progress.run && progress.run.best) ssongMake('p', 'ssong-sub', body).textContent = KR.t('ssong.run.best', { n: progress.run.best });

    const free = ssongMake('button', 'btn btn-secondary ssong-free', body); // text-ok
    free.type = 'button';
    free.textContent = KR.t('ssong.menu.free');
    free.onclick = () => ssongOpenFree();
    ssongMake('p', 'ssong-sub', body).textContent = KR.t('ssong.menu.free.sub');

    // The hurdles by name, and the records: the teacher's, with the Open code.
    // A song with no hurdle rounds is the run and free play alone.
    if (!open || !song.rounds.length) return;
    song.rounds.forEach((round, ri) => {
        const title = ssongMake('h2', 'ssong-round', body);
        title.textContent = round.rests
            ? KR.t('ssong.round.rests', { n: ri + 1, notes: KR.noteName('quarter-note', { many: true }), rests: KR.noteName('quarter-rest', { many: true }) })
            : KR.t('ssong.round.notes', { n: ri + 1, notes: KR.noteName('quarter-note', { many: true }) });
        const row = ssongMake('div', 'ssong-chips', body);
        round.hurdles.forEach((hurdle, hi) => {
            const unlocked = KRStompSong.hurdleOpen(progress, song, ri, hi, open);
            const st = KRStompSong.hurdleState(progress, round.id, hurdle.id);
            const entries = hurdle.record ? hurdle.sessions : [null];
            entries.forEach(session => {
                const chip = ssongMake('button', 'ssong-chip', row);
                chip.type = 'button';
                chip.dataset.round = round.id;
                chip.dataset.hurdle = hurdle.id + (session ? ':' + session.id : '');
                const name = ssongMake('span', 'ssong-chip-name', chip);
                name.textContent = session ? KR.t('ssong.session.' + session.id) : ssongHurdleName(hurdle);
                const sub = ssongMake('span', 'ssong-chip-sub', chip);
                if (!unlocked) { chip.classList.add('locked'); chip.disabled = true; sub.textContent = KR.t('ssong.locked'); return; }
                if (session) {
                    const earned = !!progress.records[round.id + ':' + session.id];
                    chip.classList.toggle('cleared', earned);
                    sub.textContent = earned ? KR.t('ssong.record.' + session.id) : KR.t('ssong.record.go');
                } else {
                    chip.classList.toggle('cleared', st.cleared);
                    sub.textContent = ssongStars(st.stars, KRStompSong.needed(st));
                }
                chip.onclick = () => ssongOpenHurdle(ri, hi, session ? session.id : null);
            });
        });
    });

    // The records pressed so far.
    const shelf = ssongMake('div', 'ssong-shelf', body);
    ssongMake('span', 'ssong-shelf-title', shelf).textContent = KR.t('ssong.records.title');
    song.rounds.forEach(round => ['silver', 'gold'].forEach(kind => {
        const earned = !!progress.records[round.id + ':' + kind];
        const disc = ssongMake('span', 'ssong-record ' + kind + (earned ? ' earned' : ''), shelf);
        disc.textContent = earned ? '●' : '○';
        disc.title = KR.t('ssong.record.' + kind);
        disc.setAttribute('aria-label', KR.t('ssong.record.' + kind) + (earned ? '' : ' ' + KR.t('ssong.record.go')));
    }));

    ssongGuideButton(ssongMake('button', 'btn btn-secondary ssong-guide-btn', body)); // text-ok
}

function ssongGuideButton(btn) {
    btn.type = 'button';
    const free = ssong.mode === 'free' || ssong.mode === 'warm';
    const on = free ? ssong.settings.freeGuide : ssong.settings.guide;
    btn.textContent = KR.t(free ? (on ? 'ssong.guide.free.on' : 'ssong.guide.free.off') : (on ? 'ssong.guide.on' : 'ssong.guide.off'));
    btn.classList.toggle('on', on);
    btn.onclick = () => {
        if (free) {
            ssong.settings.freeGuide = !ssong.settings.freeGuide;
            if (ssong.guideBus) ssong.guideBus.gain.value = ssong.settings.freeGuide ? 1 : 0;
        } else ssong.settings.guide = !ssong.settings.guide;
        ssongSave();
        if (ssong.mode === 'menu') ssongRenderMenu();
        else ssongGuideButton(btn);
        if (ssong.mode === 'hurdle' && ssong.state === 'ready') ssongEvent(ssong.settings.guide ? 'ssong.guide.on' : 'ssong.guide.off');
    };
}

/* ---------- a hurdle: choosing the bars, drawing them ---------- */

function ssongOpenHurdle(ri, hi, sessionId) {
    const song = ssong.song, round = song.rounds[ri], hurdle = round.hurdles[hi];
    ssongHalt();
    ssong.mode = 'hurdle'; ssong.ri = ri; ssong.hi = hi; ssong.round = round; ssong.hurdle = hurdle;
    ssong.session = sessionId;
    switchScreenState('beat', 'ssong-screen-play');
    ssongPrepareAttempt();
    ssongEvent(hurdle.record ? 'ssong.intro.record' : 'ssong.intro.hurdle', { bars: hurdle.bars });
}

// Choose where in the song and what to play, plan it, draw it.
function ssongPrepareAttempt() {
    if (ssong.mode === 'run') return ssongPrepareRun();
    const st = KRStompSong.hurdleState(ssong.progress, ssong.round.id, ssong.hurdle.id);
    const hurdle = ssong.hurdle;
    let from, pattern;
    if (hurdle.record) {
        from = hurdle.sessions.find(s => s.id === ssong.session).from;
        pattern = ssong.round.rests ? KRStompSong.recordingPattern(hurdle.bars) : KRStompSong.patternFor({ bars: hurdle.bars });
    } else {
        from = hurdle.spots[st.attempts % hurdle.spots.length];
        pattern = KRStompSong.patternFor({ bars: hurdle.bars, rests: ssong.round.rests, attempt: st.attempts });
    }
    ssong.plan = KRStompSong.plan(ssong.beats, { from: from, bars: hurdle.bars, pattern: pattern });
    ssong.notation = { specBars: pattern.map(ssongSpecs), grid: SSONG_CROTCHET_GRID };
    ssong.taps = [];
    ssong.result = null;
    ssongShowPlay('hurdle');
    ssongRenderReading();
    ssongSetState('ready');
}

// The play screen in its two uses: a hurdle (notation, stars) and free play.
function ssongShowPlay(mode) {
    const free = mode === 'free' || mode === 'warm';
    ssongEl('ssong-screen-play').dataset.mode = mode;
    ssongEl('ssong-reading').hidden = free;
    ssongEl('ssong-stars').hidden = free;
    ssongEl('ssong-result').hidden = true;
    ssongEl('ssong-summary').hidden = true;
    ssongEl('ssong-timer').hidden = mode !== 'warm';
    ssongTimer(0);
    ssongKitShow();
    const label = ssongEl('ssong-label');
    if (mode === 'warm') label.textContent = KR.t('ssong.warm.label', { song: KR.t(ssong.song.title || 'ssong.title') });
    else if (free) label.textContent = KR.t('ssong.free.label');
    else if (mode === 'run') label.textContent = ssongRunLabel();
    else label.textContent = ssong.hurdle.record
        ? KR.t('ssong.session.' + ssong.session)
        : ssongHurdleName(ssong.hurdle) + ' · ' + KR.t(ssong.round.rests ? 'ssong.round.short.rests' : 'ssong.round.short.notes');
    ssongRenderStars();
    ssongGuideButton(ssongEl('ssong-guide'));
    ssongEl('ssong-count').textContent = '';
    ssongEl('ssong-rec').classList.remove('recording', 'practice');
    ssongBuildPad();
}

function ssongRenderStars() {
    const box = ssongEl('ssong-stars');
    box.textContent = '';
    if (ssong.mode !== 'hurdle') return;
    const st = KRStompSong.hurdleState(ssong.progress, ssong.round.id, ssong.hurdle.id);
    box.textContent = ssong.hurdle.record ? '' : ssongStars(st.stars, KRStompSong.needed(st));
}

function ssongBuildPad() {
    if (ssong.pads) ssong.pads.destroy();
    ssong.pads = KRPads.create({
        container: ssongEl('ssong-pad'),
        count: 1,
        now: typeof rstompRoundEventTime === 'function' ? rstompRoundEventTime : (() => ssongAudio().currentTime),
        delay: () => ssong.delay.delay,
        label: () => KR.t('ssong.pad'),
        onPress: ssongPress,
    });
}

// Stomp Lab's grid is four globals that renderRstompStaff reads when it is
// called, so each call sets Stage A's grid and puts back what was there.
function ssongWithGrid(fn, grid) {
    const g = grid || (ssong && ssong.notation ? ssong.notation.grid : SSONG_CROTCHET_GRID);
    const saved = [rstompSlotsPerBar, rstompSlotValue, rstompSlotsPerBeat, rstompBeamSlots];
    rstompSlotsPerBar = g.slotsPerBar; rstompSlotValue = g.slotValue; rstompSlotsPerBeat = g.slotsPerBeat; rstompBeamSlots = g.beamSlots;
    try { return fn(); } finally { [rstompSlotsPerBar, rstompSlotValue, rstompSlotsPerBeat, rstompBeamSlots] = saved; }
}

function ssongSpecs(bar) {
    return bar.map((note, i) => ({
        key: note ? 'quarter-note' : 'quarter-rest', value: 'q', isRest: !note, slots: 1, slot: i, tied: false,
    }));
}

// The written bars, on white paper, with the final double bar line at the end
// of the last (Beat Smash's rule: you stop at the double line). A long take
// shows a page of lines at a time and turns the page.
function ssongRenderReading() {
    const reading = ssongEl('ssong-reading');
    reading.innerHTML = '';
    const p = ssong.plan;
    ssong.layout = [];
    const width = Math.max(240, reading.clientWidth || 340);
    const grid = ssong.notation.grid;
    const dense = grid.slotsPerBar > 4;                     // quavers and semiquavers want a bar to a line on a phone
    const perLine = Math.min(p.bars, width < 560 ? (dense ? 1 : 2) : (dense ? 2 : 4));
    const perBar = Math.min(dense ? 560 : 300, Math.floor((width - 16) / perLine));
    const lines = [];
    for (let first = 0; first < p.bars; first += perLine) {
        const lineBars = ssong.notation.specBars.slice(first, first + perLine);
        const line = ssongMake('div', 'bsmash-line', reading);
        lines.push(line);
        const marks = ssongMake('div', 'bsmash-marks', line);
        if (first > 0) ssongMake('span', 'bsmash-bar-number', marks).textContent = String(first + 1);
        const paper = ssongMake('div', 'bsmash-paper', line);
        const staff = ssongMake('div', 'bsmash-staff', paper);
        const under = ssongMake('div', 'bsmash-under', line);
        paper.style.width = (perBar * lineBars.length + 8) + 'px';
        marks.style.width = under.style.width = paper.style.width;
        const lastLine = first + perLine >= p.bars;
        const drawn = ssongWithGrid(() => renderRstompStaff(staff, lineBars, perBar, { finalBar: lastLine }));
        const playhead = ssongMake('div', 'ssong-playhead', paper);
        playhead.hidden = true;
        drawn.forEach((layout, i) => {
            // A beat's x is the CENTRE of its notehead: the grid's slot, plus
            // the inset every note is drawn at, plus half a notehead. The dots
            // and the playhead ride this, so they sit under the notes (Rob,
            // 2026-10-23: the dots were left of the crotchets).
            // A whole-bar rest hangs in the middle of the bar, so the inset is
            // read off the first glyph that sits on its own slot.
            const specs = lineBars[i];
            const own = specs.findIndex(sp => !sp.isRest);
            const inset = own >= 0 && layout.noteX[own] != null
                ? ssongWithGrid(() => layout.noteX[own] - layout.pulseX(specs[own].slot)) : 12;
            ssong.layout[first + i] = {
                x: beat => ssongWithGrid(() => layout.pulseX(beat * grid.slotsPerBeat)) + inset + SSONG_HEAD_HALF,
                // A note's own notehead, where there is one starting on that beat.
                head: beat => {
                    const k = specs.findIndex(sp => !sp.isRest && Math.abs(sp.slot - beat * grid.slotsPerBeat) < 1e-6);
                    return k >= 0 && layout.noteX[k] != null ? layout.noteX[k] + SSONG_HEAD_HALF : null;
                },
                paper, under, playhead, line, lineIndex: lines.length - 1,
            };
        });
    }
    const phoneLines = window.innerHeight < 700 ? 3 : SSONG_PAGE_LINES_PHONE;
    ssong.page = { lines: lines, perLine: perLine, size: Math.min(lines.length, width < 560 ? phoneLines : SSONG_PAGE_LINES_WIDE), at: -1 };
    ssongTurnPage(0);
}

function ssongTurnPage(lineIndex) {
    const page = ssong.page;
    if (!page || page.at === lineIndex) return;
    page.at = lineIndex;
    if (page.lines.length <= page.size) return;
    const first = Math.min(Math.floor(lineIndex / page.size) * page.size, page.lines.length - page.size);
    page.lines.forEach((line, i) => { line.hidden = i < first || i >= first + page.size; });
}

// x on a bar's paper at a fractional beat, interpolating between the notation's
// own slot positions so the playhead glides instead of jumping.
function ssongX(bar, beat) {
    return ssong.layout[bar].x(Math.max(0, Math.min(3.999, beat)));
}

/* ---------- rolling tape: one attempt ---------- */

function ssongSetState(state) {
    ssong.state = state;
    const go = ssongEl('ssong-go');
    const stop = ssongEl('ssong-stop');
    const warm = ssong.mode === 'warm';
    const free = ssong.mode === 'free' || warm;
    go.hidden = state !== 'ready';
    // Nothing but the pad while the tape rolls, nothing but the result's own
    // buttons after it (Rob: "there's not many choices").
    go.textContent = KR.t(warm ? 'ssong.warm.go' : free ? 'ssong.free.go' : 'ssong.go');
    stop.hidden = !(state === 'lead' || state === 'rec' || state === 'playing');
    stop.textContent = KR.t(free && !warm ? 'ssong.free.stop' : 'ssong.stop');
    if (state !== 'lead' && state !== 'rec' && state !== 'playing') ssongKitFrame(null);
    ssongEl('ssong-guide').hidden = ssong.mode === 'run' || !(state === 'ready' || (free && state === 'playing'));
    ssongShowWait(state === 'lead');
}

function ssongRoll() {
    if (!ssong || ssong.state !== 'ready') return;
    const ctx = ssongAudio();
    if (!ctx) return;
    ssongEl('ssong-go').disabled = true;
    const begin = () => {
        ssongEl('ssong-go').disabled = false;
        if (!ssong || ssong.state !== 'ready') return;
        if (ssong.mode === 'warm') ssongStartWarm();
        else if (ssong.mode === 'free') ssongStartFree(); else ssongStartAttempt();
    };
    ssongLoadAssets().then(begin).catch(() => {
        ssongEl('ssong-go').disabled = false;
        ssongEvent('ssong.noaudio');
    });
}

function ssongStartAttempt() {
    const ctx = ssongAudio();
    const p = ssong.plan, beats = ssong.beats;
    ssong.delay = typeof rstompRoundDelay === 'function' ? rstompRoundDelay() : { delay: 0, source: 'none' };
    ssong.taps = [];
    ssong.guided = ssong.mode !== 'run' && !!ssong.settings.guide;
    ssong.sources = [];
    // The song's clock on the audio clock: a time t in the file sounds at
    // clockOf(t). The hurdle's punch-in is the origin of every note and tap.
    const startWhen = ctx.currentTime + SSONG_PRE_ROLL;
    const clockOf = t => startWhen + (t - p.cueAt);
    ssong.clockOf = clockOf;
    ssong.punchClock = clockOf(p.punchAt);
    ssong.endClock = clockOf(p.endAt);
    // Over: a tap up to half a beat past the last bar still belongs to this
    // take (it spoils it); after the delay and a breath, the take is judged.
    ssong.judgeAt = ssong.endClock + KRStompSong.OVER_BEATS * p.beatSec + ssong.delay.delay + 0.2;
    ssongStartSong(p.cueAt, startWhen, (p.endAt - p.cueAt) + 2.2 * p.beatSec * 4 / 4 + 1.0);
    ssongEl('ssong-reading').classList.remove('clean');
    ssongEl('ssong-result').hidden = true;
    // The guide: every beat of the lead, the written rhythm in the gap when it
    // is on, and every beat of the bar after, so it is heard coming back in time.
    for (let k = p.cueBeat; k < p.punchBeat; k++) ssongKick(clockOf(KRStompSong.beatTime(beats, k)), true);
    if (ssong.guided) p.onsets.forEach(o => ssongKick(clockOf(p.punchAt + o.t), true));
    for (let k = p.endBeat; k < p.endBeat + 4; k++) ssongKick(clockOf(KRStompSong.beatTime(beats, k)), true);
    ssong.lastBeat = -1;
    ssong.toldWait = false;
    ssongEl('ssong-wait-sign').hidden = false;
    ssongEl('ssong-wait-dots').textContent = '●'.repeat(Math.max(1, (p.punchBeat - p.cueBeat) / 4 - 1));
    ssongSetState('lead');
    ssong.frame = requestAnimationFrame(ssongFrame);
}

// Every pad press: the student's kick at once, and (in a hurdle, once rolling)
// the tap goes on the record on the punch-in's clock.
function ssongPress(press) {
    const ctx = ssongAudio();
    if (!ssong || !ctx) return;
    if (ssong.state !== 'lead' && ssong.state !== 'rec' && ssong.state !== 'playing') {
        if (ssong.state === 'ready' && ssongBuffers[ssong.song.kick]) ssongKick(ctx.currentTime + 0.005, false);
        return;
    }
    const free = ssong.mode === 'free' || ssong.mode === 'warm';
    if (!free && ssong.state === 'lead' && ssongTooSoon(press)) return;
    ssongKick(ctx.currentTime + 0.003, false);
    if (free) {
        const t = press.time - ssong.freeStart;
        ssong.taps.push({ t: t });
        // Tango's kick drum lights: green on the beat, gold off it.
        const k = Math.round(KRStompSong.beatAt(ssong.beats, t));
        ssongKitHit(Math.abs(t - KRStompSong.beatTime(ssong.beats, k)) <= KRStompSong.ON_SEC);
        return;
    }
    const tap = { raw: press.raw - ssong.punchClock, delay: ssong.delay.delay, t: press.time - ssong.punchClock };
    ssong.taps.push(tap);
    if (ssong.state === 'rec') ssongKitHit(Math.abs(KRStompSong.tapErrors(ssong.plan, [tap])[0]) <= KRStompSong.ON_SEC);
}

// WAIT FOR THE COUNT (Rob, 2026-10-23, as in Beat Smash: "They get nervous...
// make it very clear it's to wait. We will count you in"). Until the count
// ends a tap does nothing to the take: no kick, the sign shakes, and the coach
// says so once a take. Within SSONG_ANTICIPATE of beat 1 it is beat 1, early.
function ssongTooSoon(press) {
    const p = ssong.plan;
    const beatPos = KRStompSong.beatAt(ssong.beats, p.punchAt + (press.time - ssong.punchClock)) - p.punchBeat;
    if (beatPos >= -SSONG_ANTICIPATE) return false;
    const wait = ssongEl('ssong-wait');
    wait.classList.remove('shake'); void wait.offsetWidth; wait.classList.add('shake');
    if (!ssong.toldWait) { ssong.toldWait = true; ssongEvent('ssong.wait'); }
    return true;
}

// The sign: up from Roll tape until the count starts, with a dot for each bar
// still to go; then the count itself, big and red, 1 2 3 4.
function ssongShowWait(on) {
    ssongEl('ssong-wait').hidden = !on;
    ssongEl('ssong-pad').classList.toggle('ssong-waiting', on);
    if (!on) ssongEl('ssong-count').textContent = '';
}

// What is HEARD now on the audio clock: less the output delay the browser reports.
function ssongHeard() {
    const ctx = ssongAudio();
    return ctx.currentTime - (ctx.outputLatency || 0);
}

function ssongFrame() {
    if (!ssong || (ssong.state !== 'lead' && ssong.state !== 'rec' && ssong.state !== 'playing')) return;
    const ctx = ssongAudio();
    ssong.frame = requestAnimationFrame(ssongFrame);
    if (ssong.mode === 'free' || ssong.mode === 'warm') return ssongFreeFrame();
    const p = ssong.plan;
    const heard = ssongHeard();
    const rel = heard - ssong.punchClock;                      // seconds from the punch-in, as heard
    const songBeat = KRStompSong.beatAt(ssong.beats, p.punchAt + rel);
    const beatPos = songBeat - p.punchBeat;                    // beats from the punch-in
    ssongKitFrame(songBeat);
    const rec = beatPos >= 0 && beatPos < p.bars * 4;
    const rect = ssongEl('ssong-rec');
    rect.classList.toggle('recording', rec);
    rect.classList.toggle('practice', rec && ssong.guided);
    if (rec && ssong.state === 'lead') ssongSetState('rec');
    // The count: the bar before the punch-in is counted out loud on the pad and
    // on screen, one two three four, red.
    const whole = Math.floor(beatPos);
    if (whole !== ssong.lastBeat) {
        ssong.lastBeat = whole;
        const count = ssongEl('ssong-count');
        const sign = ssongEl('ssong-wait-sign');
        const counting = whole >= -4 && whole < 0;
        count.textContent = counting ? String(whole + 5) : '';
        sign.hidden = counting;
        if (!counting && whole < 0) ssongEl('ssong-wait-dots').textContent = '●'.repeat(Math.max(1, Math.ceil(-whole / 4) - 1));
        if (ssong.pads && whole >= -((p.punchBeat - p.cueBeat)) && whole < p.bars * 4 && (whole < 0 || ssong.guided)) ssong.pads.glow(0, whole < 0 ? 'countin' : 'beat', 160);
    }
    // The playhead and the page.
    ssong.layout.forEach(l => { l.playhead.hidden = true; });
    if (rec) {
        const bar = Math.min(p.bars - 1, Math.floor(beatPos / 4));
        const l = ssong.layout[bar];
        ssongTurnPage(l.lineIndex);
        l.playhead.hidden = false;
        l.playhead.style.left = (ssongX(bar, beatPos - bar * 4) - 2) + 'px';
    }
    if (ctx.currentTime >= ssong.judgeAt) ssongJudge();
}

/* ---------- the verdict ---------- */

function ssongJudge() {
    if (ssong.state === 'result') return;
    if (ssong.mode === 'run') return ssongJudgeRun();
    const p = ssong.plan, hurdle = ssong.hurdle;
    const g = KRStompSong.grade(p, ssong.taps, { windowSec: SSONG_WINDOW });
    const passed = KRStompSong.passes(g, hurdle.pass);
    const applied = KRStompSong.applyAttempt(ssong.progress, ssong.round.id, hurdle,
        { passed: passed, guided: ssong.guided, pct: g.pct, session: ssong.session });
    ssongSave();
    window.ssongLast = { grade: g, passed: passed, applied: applied, plan: p, taps: ssong.taps.slice() };
    ssongLogTake(g, passed, ssong.round.id + ' ' + hurdle.id);
    ssongEndTake(g);
    ssongShowResult(g, passed, applied);
}

// TIMING, CHECKABLE (Rob, 2026-10-24: random taps passed a run take, and
// nothing on screen could say why). Under every result: if the saved tap
// delay looks like it was measured on another speaker, say so and where to
// re-time it; with the teacher's Open code, the delay used and where it came
// from, and how far each note was off.
function ssongTimingLines(g, add) {
    const d = ssong.delay || {};
    if (d.stale) add(KR.t('ssong.delay.stale'));
    if (!KR.openAll()) return;
    add(KR.t('ssong.debug.delay', { ms: Math.round((d.delay || 0) * 1000), source: d.source || 'none',
        out: d.out == null ? '?' : Math.round(d.out * 1000) }));
    const errs = g.log.filter(e => e.kind === 'hit').map(e => (e.error >= 0 ? '+' : '') + Math.round(e.error * 1000));
    add(KR.t('ssong.debug.taps', { taps: ssong.taps.length, notes: g.notes, errors: errs.join(' ') || '-' }));
}

// The last 10 graded takes, kept on the device for a teacher to look at
// (localStorage koolRiffsSongLog), as Stomp Lab keeps koolRiffsStompLog.
const SSONG_LOG_KEY = 'koolRiffsSongLog';
function ssongLogTake(g, passed, what) {
    try {
        const log = JSON.parse(localStorage.getItem(SSONG_LOG_KEY) || '[]');
        log.push({ at: Date.now(), song: ssong.id, what: what, passed: passed, notes: g.notes, hits: g.hits,
                   strays: g.strays, leanMs: g.leanMs, window: SSONG_WINDOW, delay: ssong.delay,
                   onsets: ssong.plan.onsets.map(o => Math.round(o.t * 1000)),
                   taps: ssong.taps.map(t => Math.round(t.t * 1000)) });
        localStorage.setItem(SSONG_LOG_KEY, JSON.stringify(log.slice(-10)));
    } catch (e) { /* no storage: nothing kept */ }
}

// The take is over: the song fades, the playhead goes, the marks go on.
function ssongEndTake(g) {
    ssongStopSound(SSONG_END_FADE);
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssong.layout.forEach(l => { l.playhead.hidden = true; });
    ssongEl('ssong-rec').classList.remove('recording', 'practice');
    ssongEl('ssong-count').textContent = '';
    ssong.state = 'result';
    ssongSetState('result');
    ssongMarkTake(g);
}

// Under the notation: a dot for every note (green played, gold a little off,
// red missed) and a red triangle for every tap that was not on a note.
function ssongMarkTake(g) {
    const p = ssong.plan;
    ssong.layout.forEach(l => { l.under.innerHTML = ''; });
    const hitErr = {};
    g.log.forEach(e => { if (e.kind === 'hit') hitErr[e.onset] = e.error; });
    p.onsets.forEach(o => {
        const l = ssong.layout[o.bar];
        const dot = ssongMake('span', 'ssong-dot', l.under);
        const head = ssong.layout[o.bar].head(o.beat);
        dot.style.left = ((head != null ? head : ssongX(o.bar, o.beat)) - 4) + 'px';
        if (o.id in hitErr) dot.classList.add(Math.abs(hitErr[o.id]) * 1000 > 60 ? 'off' : 'ok');
        else dot.classList.add('miss');
    });
    g.issues.filter(i => i.why !== 'missed').forEach(issue => {
        const bar = Math.min(p.bars - 1, issue.bar);
        const l = ssong.layout[bar];
        const beat = Math.max(0, Math.min(3.9, (issue.t - p.barStarts[bar]) / p.beatSec));
        const mark = ssongMake('span', 'ssong-dot stray', l.under); // text-ok
        mark.style.left = (ssongX(bar, issue.why === 'over' ? 3.9 : beat) - 4) + 'px';
    });
    if (g.perfect) ssongEl('ssong-reading').classList.add('clean');
    // On a long take, open the page at the first slip.
    if (g.first && ssong.page.lines.length > ssong.page.size) ssongTurnPage(ssong.layout[Math.min(p.bars - 1, g.first.bar)].lineIndex);
}

// Where a cleared hurdle leads (Rob, 2026-10-23: "I got a silver then a gold
// record. But I can't go any further"). In order: the record's next session
// (silver, then gold), the round's next hurdle, the next round's first hurdle,
// and past the last of them, the run, which climbs on through Stomp Lab.
function ssongNextStep() {
    const song = ssong.song, open = KR.openAll();
    const first = (ri, hi) => {
        const h = song.rounds[ri].hurdles[hi];
        return () => ssongOpenHurdle(ri, hi, h.record ? h.sessions[0].id : null);
    };
    if (ssong.hurdle.record && ssong.session) {
        const list = ssong.hurdle.sessions, at = list.findIndex(s => s.id === ssong.session);
        if (at >= 0 && list[at + 1]) {
            const ri = ssong.ri, hi = ssong.hi, id = list[at + 1].id;
            return { textId: 'ssong.next.session', fn: () => ssongOpenHurdle(ri, hi, id) };
        }
    }
    if (ssong.round.hurdles[ssong.hi + 1] && KRStompSong.hurdleOpen(ssong.progress, song, ssong.ri, ssong.hi + 1, open)) {
        return { textId: 'ssong.next', fn: first(ssong.ri, ssong.hi + 1) };
    }
    if (song.rounds[ssong.ri + 1] && KRStompSong.hurdleOpen(ssong.progress, song, ssong.ri + 1, 0, open)) {
        return { textId: 'ssong.next.round', fn: first(ssong.ri + 1, 0) };
    }
    return { textId: 'ssong.next.run', fn: () => ssongOpenRun() };
}

function ssongShowResult(g, passed, applied) {
    const box = ssongEl('ssong-result');
    box.hidden = false;
    const head = ssongEl('ssong-result-head');
    const lines = ssongEl('ssong-result-lines');
    lines.innerHTML = '';
    // "If successful say, That's a Take. If unsuccessful say, Try Another One"
    // (Rob, 2026-10-24), and the stomps on the beat, rushed and dragged.
    head.textContent = KR.t(ssong.guided ? 'ssong.result.practice' : passed ? 'ssong.take.yes' : 'ssong.take.no');
    const split = ssongTakeSplit(g);
    const add = text => { ssongMake('li', '', lines).textContent = text; };
    add(KR.t('ssong.result.score', { hits: g.hits, notes: g.notes }));
    if (g.first) add(KR.t('ssong.why.' + g.first.why, { bar: g.first.bar + 1 }));
    ssongTimingLines(g, add);
    if (ssong.guided) add(KR.t('ssong.result.guided'));
    else if (!ssong.hurdle.record) add(KR.t('ssong.result.stars', { n: applied.stars, needs: KRStompSong.needed(KRStompSong.hurdleState(ssong.progress, ssong.round.id, ssong.hurdle.id)) }));
    ssongRenderStars();

    // What to do next.
    const actions = ssongEl('ssong-result-actions');
    actions.innerHTML = '';
    const button = (cls, textId, fn) => {
        const b = ssongMake('button', 'btn ' + cls, actions);
        b.type = 'button'; b.textContent = KR.t(textId); b.onclick = fn; return b;
    };
    const next = applied.cleared ? ssongNextStep() : null;
    if (next) {
        button('btn-start', next.textId, next.fn);
        button('btn-secondary', 'ssong.again', () => ssongPrepareAttempt());
    } else {
        button(applied.cleared ? 'btn-secondary' : 'btn-start', 'ssong.again', () => ssongPrepareAttempt());
    }
    button('btn-secondary', 'ssong.menu', () => ssongToMenu());

    // The coach.
    if (applied.record) {
        KR.lastWords = '';
        ssongEvent('ssong.record.' + applied.record);
        KR.celebrate({ title: KR.t('ssong.record.' + applied.record), line: KR.lastWords || '', stars: 3 });
    }
    else if (ssong.guided) ssongEvent('ssong.take.guided');
    // A take that counts (keeper.js): first take, or 1, 2, 3 of the three a
    // miss costs; the one that clears the hurdle gets the celebration.
    else if (passed && KR.keeperKind(applied.wasOwed, applied.stars, applied.needed)) {
        KR.keeper(KR.keeperKind(applied.wasOwed, applied.stars, applied.needed), { say: ssongEvent });
    }
    else if (applied.newlyCleared) ssongEvent('ssong.cleared');
    else if (g.perfect) ssongEvent('ssong.take.clean');
    else if (!passed) ssongCoach(split, g);
    else ssongEvent('ssong.take.close');
    if (passed && !ssong.guided) playSound('correct'); else if (!ssong.guided) playSound('wrong');
}

/* ---------- free play ---------- */

function ssongOpenFree() {
    ssongHalt();
    ssong.mode = 'free';
    ssong.taps = [];
    switchScreenState('beat', 'ssong-screen-play');
    ssongShowPlay('free');
    ssongSetState('ready');
    ssongEvent('ssong.intro.free');
}

function ssongStartFree() {
    const ctx = ssongAudio();
    ssong.delay = typeof rstompRoundDelay === 'function' ? rstompRoundDelay() : { delay: 0, source: 'none' };
    ssong.sources = [];
    ssong.taps = [];
    const startWhen = ctx.currentTime + SSONG_PRE_ROLL;
    ssong.freeStart = startWhen;            // the file's own clock: time 0 sounds now
    ssongStartSong(0, startWhen, ssongBufferSeconds());
    ssong.guideBus.gain.value = ssong.settings.freeGuide ? 1 : 0;
    // Every beat of the song has its guide kick booked; the Guide button only
    // opens or closes the bus, so it can be switched while the song plays.
    ssong.beats.forEach(t => { if (t >= 0) ssongKick(startWhen + t, true); });   // a map can start before the file (The Long Hold's pickup)
    ssong.freeEnd = startWhen + ssongBufferSeconds();
    ssongEl('ssong-summary').hidden = true;
    ssong.lastBeat = -1;
    ssongSetState('playing');
    ssong.frame = requestAnimationFrame(ssongFrame);
}

function ssongBufferSeconds() {
    return ssongBuffers[ssong.song.audio].duration;
}

function ssongFreeFrame() {
    const ctx = ssongAudio();
    const heard = ssongHeard() - ssong.freeStart;
    const pos = KRStompSong.beatAt(ssong.beats, heard);
    const whole = Math.floor(pos);
    if (whole !== ssong.lastBeat) {
        ssong.lastBeat = whole;
        if (ssong.pads && ssong.settings.freeGuide && whole >= 0) ssong.pads.glow(0, 'beat', 140);
    }
    ssongKitFrame(heard >= 0 ? pos : null);
    if (ssong.mode === 'warm') ssongTimer(Math.max(0, heard) / ssong.warmSeconds);
    if (ctx.currentTime >= ssong.freeEnd) { if (ssong.mode === 'warm') ssongEndWarm(); else ssongEndFree(); }
}

function ssongEndFree() {
    if (!ssong || ssong.mode !== 'free' || ssong.state === 'result') return;
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssongStopSound(SSONG_END_FADE);
    ssong.state = 'result';
    ssongSetState('result');
    const taps = ssong.taps.map(x => ({ t: x.t }));
    const a = KRStompSong.analyseFree(ssong.beats, taps);
    ssong.progress.free.sessions++;
    ssong.progress.free.last = { taps: a.taps, onBeatPct: a.onBeatPct, leanMs: a.leanMs, at: Date.now() };
    ssongSave();
    window.ssongLastFree = a;
    const box = ssongEl('ssong-summary');
    box.hidden = false;
    const lines = ssongEl('ssong-summary-lines');
    lines.innerHTML = '';
    ssongEl('ssong-summary-split').innerHTML = '';
    ssongActions('ssong-summary-actions', [
        { cls: 'btn-start', textId: 'ssong.free.go', fn: () => ssongOpenFree() },
        { cls: 'btn-secondary', textId: 'ssong.menu', fn: () => ssongToMenu() },
    ]);
    const add = text => { ssongMake('li', '', lines).textContent = text; };
    ssongEl('ssong-summary-head').textContent = KR.t('ssong.free.title');
    add(KR.t('ssong.free.taps', { n: a.taps }));
    if (a.taps) {
        add(KR.t('ssong.free.onbeat', { pct: a.onBeatPct }));
        if (a.onBeat >= 2) add(a.leanMs <= -25 ? KR.t('ssong.free.early', { ms: Math.abs(a.leanMs) })
            : a.leanMs >= 25 ? KR.t('ssong.free.late', { ms: a.leanMs }) : KR.t('ssong.free.pocket'));
        if (a.longestRun >= 4) add(KR.t('ssong.free.run', { n: a.longestRun }));
        if (a.and >= 3) add(KR.t('ssong.free.and', { n: a.and }));
        if (a.sixteenth >= 3) add(KR.t('ssong.free.sixteenth', { n: a.sixteenth }));
    }
    ssongEl('ssong-summary-focus').textContent = KR.t('ssong.free.focus.' + a.focus);
    ssongEvent('ssong.free.done');
}

// "That's enough": the Stop button ends a take (nothing counted) or a free play
// session (judged as far as it got).
function ssongStopPressed() {
    if (!ssong) return;
    if (ssong.mode === 'free') { ssongEndFree(); return; }
    if (ssong.mode === 'warm') { ssongEndWarm(); return; }
    ssongHalt(SSONG_END_FADE);
    ssongPrepareAttempt();
}

/* =========================================
   THE RUN: one take at a time, the levels hidden, until a miss
   =========================================
   Rob, 2026-10-23: "progress through the levels if it's one take... hide the
   levels. Just keep them coming until they can't play them anymore. Then
   that's when they have to hop out." The ladder is the whole Stomp Lab engine:
   a warm-up on the beat, then every 4/4 level in order (content/stomp-songs.js
   run.levels), two bars and then four, each rhythm freshly generated by
   generateRstompPhrase and drawn by renderRstompStaff on that level's grid.
   One clean take moves on; four bars allow a slip (the step's pass).
   With more than one player it is the relay (ideas/pass-the-ipad.md): a miss
   passes the iPad and the next player takes the step that was missed; the
   run ends when every player has missed it in a row. Nobody wins.
   ========================================= */

// `startAt`: the rung to start on (Carry on, or "Try another one" after a
// miss: the same level and mini level). From the song's own menu, the bottom.
function ssongOpenRun(startAt) {
    ssongHalt();
    ssong.mode = 'run';
    ssong.ladder = KRStompSong.runLadder(ssong.song.run.levels);
    ssong.run = KRStompSong.newRun(ssong.settings.players);
    ssong.run.step = Math.max(0, Math.min((startAt | 0), ssong.ladder.length - 1));
    ssong.lastSpot = null;
    switchScreenState('beat', 'ssong-screen-play');
    ssongPrepareRun();
    ssongEvent(ssong.run.players > 1 ? 'ssong.run.intro.many' : 'ssong.run.intro', { n: ssong.run.players });
}

function ssongRunLabel() {
    const take = ssong.run.takes + 1;
    return ssong.run.players > 1
        ? KR.t('ssong.run.label.many', { player: ssong.run.player + 1, take: take })
        : KR.t('ssong.run.label', { take: take });
}

// The step's rhythm: plain crotchets for the warm-up, else a phrase from the
// step's Stomp Lab level, generated on that level's own grid.
function ssongRunNotation(step) {
    if (!step.levelId) {
        const pattern = KRStompSong.patternFor({ bars: step.bars });
        return { specBars: pattern.map(ssongSpecs), grid: SSONG_CROTCHET_GRID, pattern: pattern };
    }
    const base = RSTOMP_LEVELS.find(l => l.id === step.levelId);
    // The song may take values out of every level (content/stomp-songs.js,
    // run.leaveOut): the quaver song has no semibreves or minims.
    const leaveOut = (ssong.song.run && ssong.song.run.leaveOut) || [];
    const level = Object.assign({}, base, { bars: step.bars, pool: base.pool.filter(v => leaveOut.indexOf(v) < 0) },
        leaveOut.length ? { tieFromPool: true } : {});
    const g = rstompGridFor(level);
    const grid = { slotsPerBar: g.slotsPerBar, slotValue: g.slotValue, slotsPerBeat: g.slotsPerBeat, beamSlots: g.beamSlots || g.slotsPerBeat };
    // Stomp Lab's specs carry no slot of their own: number them in the bar,
    // so a note can be found by where it starts.
    const specBars = ssongWithGrid(() => generateRstompPhrase(level), grid).map(bar => {
        let at = 0;
        return bar.map(sp => { const out = Object.assign({}, sp, { slot: at }); at += sp.slots; return out; });
    });
    const slotBars = ssongWithGrid(() => rstompSpecsToPhrase(specBars), grid);
    return { specBars: specBars, grid: grid, slotBars: slotBars };
}

function ssongPrepareRun() {
    ssongCancelNext();
    const step = KRStompSong.runStep(ssong.ladder, ssong.run.step);
    ssong.step = step;
    if (ssong.home === 'beat') {
        ssong.progress.run = Object.assign({ best: 0, runs: 0 }, ssong.progress.run, { at: ssong.run.step });
        ssongSave();
        ssongSavePlace('run', ssong.id, ssong.run.step);
    }
    const spots = KRStompSong.runSpots(KRStompSong.totalBars(ssong.beats), step.bars, null,
        KRStompSong.runRanges(ssong.song, step.levelId));
    const from = KRStompSong.pickSpot(spots, ssong.lastSpot);
    ssong.lastSpot = from;
    const notation = ssongRunNotation(step);
    ssong.notation = notation;
    ssong.plan = notation.slotBars
        ? KRStompSong.plan(ssong.beats, { from: from, bars: step.bars, slotBars: notation.slotBars, slotsPerBeat: notation.grid.slotsPerBeat })
        : KRStompSong.plan(ssong.beats, { from: from, bars: step.bars, pattern: notation.pattern });
    ssong.taps = [];
    ssong.result = null;
    ssongShowPlay('run');
    ssongRenderReading();
    ssongSetState('ready');
}

function ssongJudgeRun() {
    const p = ssong.plan, step = ssong.step, run = ssong.run;
    const g = KRStompSong.grade(p, ssong.taps, { windowSec: SSONG_WINDOW });
    const passed = KRStompSong.passes(g, step.pass);
    const out = KRStompSong.runTake(run, passed);
    const progress = ssong.progress;
    progress.run = progress.run || { best: 0, runs: 0 };
    if (out.next === 'over') progress.run.runs++;
    progress.run.best = Math.max(progress.run.best || 0, run.cleared);
    // Where to carry on from: the rung after a clean take, the same rung after
    // a miss. The top of the ladder reached is the song's record turning gold.
    progress.run.at = Math.min(run.step, ssong.ladder.length - 1);
    if (run.step >= ssong.ladder.length - 1) progress.run.topped = true;
    ssongSave();
    if (ssong.home === 'beat') ssongSavePlace('run', ssong.id, progress.run.at);
    window.ssongLast = { grade: g, passed: passed, run: Object.assign({}, run), plan: p, step: step, taps: ssong.taps.slice() };
    ssongLogTake(g, passed, 'run ' + (step.levelId || 'warm-up') + ' x' + step.bars);
    ssongEndTake(g);
    ssongShowRunResult(g, passed, out);
}

function ssongShowRunResult(g, passed, out) {
    const run = ssong.run;
    const box = ssongEl('ssong-result');
    box.hidden = false;
    const lines = ssongEl('ssong-result-lines');
    lines.innerHTML = '';
    const add = text => { ssongMake('li', '', lines).textContent = text; };
    const actions = ssongEl('ssong-result-actions');
    actions.innerHTML = '';
    const button = (cls, text, fn) => {
        const b = ssongMake('button', 'btn ' + cls, actions);
        b.type = 'button'; b.textContent = text; b.onclick = () => { ssongCancelNext(); fn(); }; return b;
    };
    // That's a Take / Try Another One (Rob, 2026-10-24), the stomps on the
    // beat, rushed and dragged, and Tango saying what to work on. Short: the
    // old run summary (clean takes, best run, the why) is gone from the box.
    ssongEl('ssong-result-head').textContent = KR.t(passed ? 'ssong.take.yes' : 'ssong.take.no');
    const split = ssongTakeSplit(g);
    ssongTimingLines(g, add);
    if (out.next === 'same') {
        button('btn-start', KR.t('ssong.run.next'), ssongRunNext);
        playSound('correct');
        const up = KRStompSong.runLevelUp(ssong.ladder, ssong.step.index, run.step);
        if (up) { ssongLevelUp(up); return; }
        ssongEvent('ssong.run.pass');
        // Keep them coming: the next take rolls on its own.
        ssong.nextTimer = setTimeout(ssongRunNext, SSONG_RUN_NEXT_MS);
        return;
    }
    playSound('wrong');
    if (out.next === 'turn') {
        button('btn-start', KR.t('ssong.run.turn', { n: out.player + 1 }), ssongRunNext);
        ssongEvent('ssong.run.turn', { n: out.player + 1 });
        return;
    }
    // The run is over: another go at the same rung (the level and its mini
    // level), somewhere to learn the rhythm that stopped it (Rob: "we have
    // all these resources for counting and Stomp Lab"), or the menu.
    if (run.players > 1) {
        const best = run.furthest.indexOf(Math.max.apply(null, run.furthest));
        add(KR.t('ssong.run.furthest', { n: best + 1 }));
    }
    const at = run.step;
    button('btn-start', KR.t('ssong.again.same'), () => ssongOpenRun(at));
    if (ssong.step.levelId) button('btn-secondary', KR.t('ssong.run.learn'), () => ssongLearn(ssong.step.levelId));
    button('btn-secondary', KR.t(ssong.home === 'beat' ? 'ssong.toMenu' : 'ssong.menu'), () => ssongToMenu());
    ssongCoach(split, g);
}

/* ---------- how a take went: on the beat, rushed, dragged ----------
   Rob, 2026-10-24: "diagnose their issue, are they rushing? Present stats on
   percent on the beat, percent rushed, percent dragged. If rushing, slow down
   and relax into the beat. If dragging, push a bit faster. Feel the beat. If a
   mixture, they are close but keep listening and stomping. (Be more
   concise.)" The numbers go in three chips; what to do about them is Tango's
   one line. */
function ssongTakeSplit(g) {
    const split = KRStompSong.timingSplit(KRStompSong.tapErrors(ssong.plan, ssong.taps));
    ssongRenderSplit('ssong-result-split', split);
    window.ssongLastSplit = split;
    return split;
}

function ssongRenderSplit(boxId, split) {
    const box = ssongEl(boxId);
    box.innerHTML = '';
    if (!split || !split.taps) return;
    [['on', split.onPct], ['rushed', split.rushedPct], ['dragged', split.draggedPct]].forEach(([kind, pct]) => {
        const chip = ssongMake('span', 'ssong-split-chip ' + kind, box);
        ssongMake('b', '', chip).textContent = KR.t('ssong.split.pct', { pct: pct });
        ssongMake('span', '', chip).textContent = KR.t('ssong.split.' + kind);
        chip.dataset.kind = kind;
    });
}

// Tango's one line for a take that missed: the timing if that is what went
// wrong, else the first thing that did (a missed note, a tap on a rest).
function ssongCoach(split, g) {
    const d = split ? split.diagnosis : 'few';
    if (d !== 'steady') return ssongEvent('ssong.coach.' + d);
    if (g && g.first) return ssongEvent('ssong.coach.' + g.first.why, { bar: g.first.bar + 1 });
    ssongEvent('ssong.coach.mixed');
}

function ssongActions(boxId, list) {
    const box = ssongEl(boxId);
    box.innerHTML = '';
    list.forEach(a => {
        const b = ssongMake('button', 'btn ' + a.cls, box);
        b.type = 'button';
        b.textContent = a.text != null ? a.text : KR.t(a.textId, a.vars);
        b.onclick = a.fn;
    });
}

// UP A LEVEL (Rob, 2026-10-24: "if they get it right the first time they get
// to move up a level. And when they move up a level we let them know there's a
// little celebration and up they go"). The levels stay hidden until then: the
// celebration names the one they are going up to, Tango says so, and the next
// take rolls once the screen has gone (by itself, or at a tap).
function ssongLevelUp(up) {
    window.ssongLastLevelUp = up;
    ssongEvent('ssong.run.levelup');
    KR.celebrate({
        title: KR.t('ssong.run.levelup'),
        line: KR.t('ssong.run.levelup.next', { n: up.number, name: rstompLevelName(up.levelId) }),
        stars: 1,
        then: () => {
            if (!ssong || ssong.mode !== 'run' || ssong.state !== 'result' || ssong.nextTimer) return;
            ssong.nextTimer = setTimeout(ssongRunNext, SSONG_LEVELUP_PAUSE_MS);
        },
    });
}

function ssongRunNext() {
    ssongCancelNext();
    if (!ssong || ssong.mode !== 'run') return;
    ssongPrepareRun();
    ssongRoll();
}

function ssongCancelNext() {
    if (ssong && ssong.nextTimer) { clearTimeout(ssong.nextTimer); ssong.nextTimer = 0; }
}

// Over to Stomp Lab, on the level that stopped the run if it is open there.
function ssongLearn(levelId) {
    ssongHalt();
    ssong = null;
    launchGame('view-rhythm-lab');
    if (typeof selectRstompLevel === 'function') selectRstompLevel(levelId);
}

/* =========================================
   THE WARM-UP WITH TANGO: the drum room
   =========================================
   Rob, 2026-10-24: "In the Warm-up with Tango allow for the song to be played
   freely but focused on the beat... She asks you to pick a tune and we'll get
   started smashing the beat... They can have 30 second rounds of free play
   using the same 30 seconds of the tune but must pass a hurdle to start
   working on the rest of the tune as it's not yet complete."
   So: pick a tune (Stomp the Beat first), then rounds of the song's first 30
   seconds, count-in and all, stomping the beat. Every round is judged the same
   way (KRStompSong.warmRound): the beat kept on enough of the beats, and
   cleanly enough. Passing it once opens the song's level on the menu. Rounds
   can be played for as long as anyone likes after that.
   ========================================= */

function ssongOpenWarmPick() {
    if (typeof bsmashStopAll === 'function') bsmashStopAll();
    ssongHalt();
    ssong = null;
    switchScreenState('beat', 'ssong-screen-warm');
    const box = ssongEl('ssong-warm-cards');
    box.innerHTML = '';
    ssongMenuSongs().forEach(id => {
        const song = KR.stompSongs[id];
        const open = ssongWarmOpen(id);
        const card = ssongMake('button', 'bsmash-song-card ssong-warm-card' + (open ? '' : ' locked'), box); // text-ok: class names
        card.type = 'button';
        card.dataset.song = id;
        ssongMake('span', 'bsmash-song-icon', card).textContent = KR.t(song.icon || 'ssong.icon');
        ssongMake('span', 'bsmash-song-name', card).textContent = KR.t(song.title || 'ssong.title');
        const level = ssongLevelOf(song);
        if (level) ssongMake('small', 'bsmash-song-status', card).textContent = KR.t('beat.menu.level', { n: level.n, name: level.name });
        ssongMake('small', 'bsmash-song-status ssong-warm-state', card).textContent = // text-ok: class names
            KR.t(!open ? 'ssong.warm.card.locked' : ssongWarmPassed(id) ? 'ssong.warm.card.done' : 'ssong.warm.card.go');
        card.onclick = () => { if (open) ssongOpenWarm(id); else ssongEvent('ssong.warm.locked'); };
    });
    ssongEvent('ssong.warm.pick');
}

function ssongOpenWarm(id) {
    if (!ssongInit(id, 'beat')) return;
    ssong.mode = 'warm';
    ssong.taps = [];
    ssongSavePlace('warm', id, 0);
    switchScreenState('beat', 'ssong-screen-play');
    ssongShowPlay('warm');
    ssongSetState('ready');
    ssongEvent('ssong.warm.intro');
}

function ssongStartWarm() {
    const ctx = ssongAudio();
    ssong.delay = typeof rstompRoundDelay === 'function' ? rstompRoundDelay() : { delay: 0, source: 'none' };
    ssong.sources = [];
    ssong.taps = [];
    const secs = Math.min(KRStompSong.WARM_SECONDS, ssongBufferSeconds());
    ssong.warmSeconds = secs;
    const startWhen = ctx.currentTime + SSONG_PRE_ROLL;
    ssong.freeStart = startWhen;            // the file's own clock: time 0 sounds now
    ssongStartSong(0, startWhen, secs + 0.5);
    ssong.guideBus.gain.value = ssong.settings.freeGuide ? 1 : 0;
    ssong.beats.forEach(t => { if (t >= 0 && t <= secs) ssongKick(startWhen + t, true); });
    // A stomp just after the last beat is still judged, then the round ends.
    ssong.freeEnd = startWhen + secs + 0.35 + (ssong.delay.delay || 0);
    ssongEl('ssong-summary').hidden = true;
    ssong.lastBeat = -1;
    ssongSetState('playing');
    ssong.frame = requestAnimationFrame(ssongFrame);
}

function ssongEndWarm() {
    if (!ssong || ssong.mode !== 'warm' || ssong.state === 'result') return;
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssongStopSound(SSONG_END_FADE);
    ssong.state = 'result';
    ssongSetState('result');
    ssongTimer(1);
    const a = KRStompSong.warmRound(ssong.beats, ssong.taps, { seconds: ssong.warmSeconds || KRStompSong.WARM_SECONDS });
    const w = ssong.progress.warm = Object.assign({ rounds: 0, passed: false }, ssong.progress.warm);
    const opened = a.passed && !w.passed;
    w.rounds++;
    if (a.passed) w.passed = true;
    w.last = { taps: a.taps, onPct: a.onPct, rushedPct: a.rushedPct, draggedPct: a.draggedPct, coverPct: a.coverPct, passed: a.passed, at: Date.now() };
    ssongSave();
    window.ssongLastWarm = a;

    const box = ssongEl('ssong-summary');
    box.hidden = false;
    ssongEl('ssong-summary-head').textContent = KR.t(a.passed ? 'ssong.take.yes' : 'ssong.take.no');
    ssongRenderSplit('ssong-summary-split', a);
    const lines = ssongEl('ssong-summary-lines');
    lines.innerHTML = '';
    ssongMake('li', '', lines).textContent = KR.t('ssong.warm.kept', { kept: a.beatsKept, beats: a.beats });
    if (ssong.delay && ssong.delay.stale) ssongMake('li', '', lines).textContent = KR.t('ssong.delay.stale');
    ssongEl('ssong-summary-focus').textContent = '';
    const id = ssong.id;
    const level = ssongLevelOf(ssong.song);
    const toLevel = { cls: 'btn-start', textId: 'ssong.warm.toLevel',
        vars: { level: level ? KR.t('beat.menu.level', { n: level.n, name: KR.t(ssong.song.title) }) : KR.t(ssong.song.title) },
        fn: () => ssongStartLevel(id) };
    const again = { cls: a.passed ? 'btn-secondary' : 'btn-start', textId: 'ssong.warm.again', fn: () => ssongOpenWarm(id) };
    const pick = { cls: 'btn-secondary', textId: 'ssong.warm.pickAgain', fn: () => ssongOpenWarmPick() };
    ssongActions('ssong-summary-actions', ssongLevelOpen(id) ? [toLevel, again, pick] : [again, pick]);

    if (opened) {
        playSound('correct');
        KR.lastWords = '';
        ssongEvent('ssong.warm.open');
        KR.celebrate({ title: KR.t('ssong.take.yes'), line: KR.lastWords || '', stars: 1 });
    } else if (a.passed) {
        playSound('correct');
        ssongEvent('ssong.warm.pass');
    } else if (a.diagnosis === 'steady') ssongEvent('ssong.warm.sparse');
    else ssongEvent('ssong.coach.' + a.diagnosis);
}

// From the warm-up (or the menu) into a song's level, on the rung it was left.
function ssongStartLevel(id) {
    if (!ssongInit(id, 'beat')) return;
    const at = (ssong.progress.run && ssong.progress.run.at) || 0;
    switchScreenState('beat', 'ssong-screen-play');
    ssongOpenRun(at);
    ssongEvent(ssong.run.players > 1 ? 'ssong.run.intro.many' : 'ssong.run.intro', { n: ssong.run.players });
}

// How much of the round has gone, 0 to 1, and the seconds left.
function ssongTimer(frac) {
    const fill = ssongEl('ssong-timer-fill');
    if (!fill) return;
    const f = Math.max(0, Math.min(1, frac || 0));
    fill.style.width = (100 * (1 - f)) + '%';
    const secs = (ssong && ssong.warmSeconds) || KRStompSong.WARM_SECONDS;
    ssongEl('ssong-timer-left').textContent = KR.t('ssong.warm.left', { s: Math.ceil(secs * (1 - f)) });
}

/* =========================================
   THE DRUM ROOM: Tango at her kit, on every song screen
   =========================================
   Rob, 2026-10-24: "Can we wire in Tango to make it the drum room and have
   her playing away with what's on the screen?" Rob's three pictures (sticks
   up, halfway, down) are shown one at a time from the beat AS HEARD, read off
   the song's beat map, so she plays the recording's own drifting tempo:
   sticks down on the beat, up on the "and". Before the song and after it,
   halfway: where she talks from. Her kick drum's head lights with each stomp,
   green on the beat, gold off it (the beat light, as in the old warm-up). */
// The drum room's own Tango (ssong.kit.*, Rob's earlier Tango, 2026-10-24);
// the old warm-up's kit pictures (beat.kit.warmup.*) if those are missing.
function ssongKitSet() {
    const has = set => ['up', 'mid', 'down'].every(f => KR.art && KR.art[set + '.' + f]);
    if (has('ssong.kit')) return { art: 'ssong.kit', place: 'ssong.kit' };
    if (has('beat.kit.warmup')) return { art: 'beat.kit.warmup', place: 'beat.kit.warmup' };
    return null;
}

function ssongKitArtIn() { return !!ssongKitSet(); }

function ssongKitShow() {
    const kit = ssongEl('ssong-kit');
    if (!kit) return;
    const set = ssongKitSet();
    kit.hidden = !set;
    if (!set) return;
    kit.querySelectorAll('img[data-frame]').forEach(img => {
        const src = KR.art[set.art + '.' + img.dataset.frame];
        if (img.getAttribute('src') !== src) img.src = src;
    });
    const place = KR.artPlaces && KR.artPlaces[set.place];
    const head = ssongEl('ssong-kit-head');
    if (place) kit.style.aspectRatio = String(place.aspect);
    if (place && head) {
        head.style.left = (place.head.left * 100) + '%';
        head.style.top = (place.head.top * 100) + '%';
        head.style.width = (place.head.width * 100) + '%';
    }
    // The Kool Riffs badge on a blank kick drum head (the old kit has Rob's
    // logo painted on it already).
    const badge = ssongEl('ssong-kit-badge');
    if (badge) {
        badge.hidden = set.art !== 'ssong.kit' || !KR.art['logo.badge'];
        if (!badge.hidden && badge.getAttribute('src') !== KR.art['logo.badge']) badge.src = KR.art['logo.badge'];
        if (head && !badge.hidden) { badge.style.left = head.style.left; badge.style.top = head.style.top; badge.style.width = head.style.width; }
    }
    ssongKitFrame(null);
}

// beat: the song's beat position as heard (fractional), or null when nothing plays.
function ssongKitFrame(beat) {
    const kit = ssongEl('ssong-kit');
    if (!kit || kit.hidden) return;
    let frame = 'mid';
    if (beat != null && beat >= 0) {
        const f = beat - Math.floor(beat);
        frame = f < 1 / 6 ? 'down' : f < 0.4 ? 'mid' : f < 0.75 ? 'up' : 'mid';
    }
    if (kit.dataset.frame !== frame) kit.dataset.frame = frame;
}

function ssongKitHit(onBeat) {
    const head = ssongEl('ssong-kit-head');
    if (!head) return;
    head.classList.remove('on', 'off');
    void head.offsetWidth;
    head.classList.add(onBeat ? 'on' : 'off');
    clearTimeout(head.ssongTimer);
    head.ssongTimer = setTimeout(() => head.classList.remove('on', 'off'), SSONG_KIT_FLASH_MS);
}

/* =========================================
   BEAT SMASH'S MENU (Rob, 2026-10-24)
   =========================================
   "Let's keep Warm-up, then list on the menu only the new songs that we have
   mapped and are working: Warm up with Tango, Level 1 Stomp the Beat, Level 3
   Stomp the Beat." No name, no band's musicians, no step chips, no sound
   settings. Drawn on the pathway's shelf by renderBeatPathway()
   (beat-smash.js) when BSMASH_SONG_MENU is on. */
let ssongMenuSelected = null;

function ssongMenuName(id) {
    if (id === 'warm') return KR.t('beat.menu.warm');
    const song = KR.stompSongs[id];
    const level = ssongLevelOf(song);
    return level ? KR.t('beat.menu.level', { n: level.n, name: KR.t(song.title) }) : KR.t(song.title);
}

// Where a song's run is up to, in words: "Paired Quavers, 4 bars".
function ssongWhereName(id, step) {
    const song = KR.stompSongs[id];
    const ladder = KRStompSong.runLadder(song.run.levels);
    const st = KRStompSong.runStep(ladder, step || 0);
    const level = st.levelId && typeof rstompLevelName === 'function' ? rstompLevelName(st.levelId) : KR.t('beat.menu.where.beat');
    return KR.t('beat.menu.where', { level: level, bars: KR.t('ssong.hurdle.' + st.bars) });
}

// keep: a record was just picked, so keep it; else (coming to the menu) the
// record of the place they were last.
function ssongRenderBeatMenu(keep) {
    const songs = ssongMenuSongs();
    const ids = ['warm'].concat(songs);
    const open = new Set(['warm']);
    const records = { warm: { cleared: songs.length > 0 && ssongWarmPassed(songs[0]) } };
    songs.forEach(id => {
        if (ssongLevelOpen(id)) open.add(id);
        const run = ssongProgressOf(id).run;
        records[id] = { cleared: !!(run && run.topped) };
    });
    const place = ssongPlace();
    if (!keep || !ssongMenuSelected || !open.has(ssongMenuSelected)) {
        ssongMenuSelected = place && place.kind === 'run' && open.has(place.song) ? place.song : 'warm';
    }
    KR.shelf.render(document.getElementById('beat-pathway-track'), {
        albums: [{ id: 'songs', titleId: 'shelf.album.all', levelIds: ids }],
        levelName: ssongMenuName,
        discLabel: id => id === 'warm' ? KR.t('beat.menu.warm.icon') : KR.t(KR.stompSongs[id].icon || 'ssong.icon'),
        unlocked: open,
        records: records,
        current: ssongMenuSelected,
        onPick: id => { ssongMenuSelected = id; ssongRenderBeatMenu(true); },
    });
    document.querySelectorAll('#beat-pathway-track .kr-track').forEach(node =>
        node.classList.toggle('recommended', node.dataset.id === ssongMenuSelected));
    // Start, or Carry on where they were.
    const start = document.getElementById('beat-pathway-start');
    start.disabled = false;
    const carry = ssongMenuCarries(ssongMenuSelected);
    start.textContent = KR.t(carry ? 'beat.carryOn' : 'beat.start');
    // Tango: welcome back, and where they were; else what to do.
    const box = document.getElementById('beat-pathway-guide');
    const sel = ssongMenuSelected;
    if (carry && sel === 'warm') KR.say('beat.menu.back.warm', { box: box, speaker: 'tango', silent: true, vars: { song: KR.t(KR.stompSongs[ssongWarmSong()].title) } });
    else if (carry) KR.say('beat.menu.back.run', { box: box, speaker: 'tango', silent: true,
        vars: { song: ssongMenuName(sel), where: ssongWhereName(sel, (ssongProgressOf(sel).run || {}).at || 0) } });
    else KR.say('beat.menu.say', { box: box, speaker: 'tango', silent: true });
}

// Is there somewhere to carry on from on this record?
function ssongWarmSong() {
    const id = ssongStorage().warmSong;
    return id && KR.stompSongs[id] && ssongWarmOpen(id) ? id : null;
}

function ssongMenuCarries(id) {
    if (id === 'warm') return !!ssongWarmSong();
    const place = ssongPlace();
    const run = ssongProgressOf(id).run;
    return !!((run && run.at > 0) || (place && place.kind === 'run' && place.song === id));
}

function ssongStartFromMenu() {
    const id = ssongMenuSelected || 'warm';
    if (id === 'warm') return ssongWarmSong() ? ssongOpenWarm(ssongWarmSong()) : ssongOpenWarmPick();
    if (!ssongLevelOpen(id)) { KR.say('beat.menu.locked', { box: document.getElementById('beat-pathway-guide'), speaker: 'tango' }); return; }
    ssongStartLevel(id);
}

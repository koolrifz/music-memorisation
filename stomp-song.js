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
const SSONG_WINDOW = 0.18;           // seconds each side of a note (the matcher caps it at half the gap)
const SSONG_PRE_ROLL = 0.4;          // seconds between pressing Roll tape and the song sounding
const SSONG_PAGE_LINES_PHONE = 4;    // a long take shows this many lines at a time, then turns the page
const SSONG_PAGE_LINES_WIDE = 2;
const SSONG_SONG_GAIN = 0.95;
const SSONG_GUIDE_GAIN = 0.5;        // the guide: soft and round, under the band
const SSONG_STUDENT_GAIN = 1.0;      // the student's kick: bright, on top

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
    return Object.assign({ guide: false, freeGuide: true }, ssongStorage().settings);
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

function ssongStopSound() {
    const ctx = ssongAudio();
    if (!ssong || !ctx) return;
    const now = ctx.currentTime;
    try {
        if (ssong.songGain) {
            ssong.songGain.gain.cancelScheduledValues(now);
            ssong.songGain.gain.setValueAtTime(ssong.songGain.gain.value, now);
            ssong.songGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        }
        if (ssong.songSource) ssong.songSource.stop(now + 0.06);
        (ssong.sources || []).forEach(s => { try { s.stop(); } catch (e) { /* not started yet */ } });
        if (ssong.guideBus) ssong.guideBus.disconnect();
    } catch (e) { /* already stopped */ }
    ssong.songSource = null; ssong.songGain = null; ssong.guideBus = null; ssong.sources = [];
}

/* ---------- coming in and going out ---------- */

function showStompSong(id) {
    if (typeof bsmashStopAll === 'function') bsmashStopAll();
    ssongHalt();
    const song = KR.stompSongs && KR.stompSongs[id];
    const beats = KR.stompBeats && KR.stompBeats[id];
    if (!song || !beats) return;
    ssong = {
        id: id, song: song, beats: beats, mode: 'menu', state: 'menu',
        progress: ssongLoadProgress(id), settings: ssongLoadSettings(),
        sources: [], pads: null, frame: 0, taps: [], delay: { delay: 0, source: 'none' },
    };
    if (ssongAudio()) ssongLoadAssets().catch(() => { /* shown when a take is rolled */ });
    switchScreenState('beat', 'ssong-screen-menu');
    ssongRenderMenu();
    ssongEvent('ssong.menu');
}

// Stop everything this song is doing: sounds, the frame loop, the pad.
function ssongHalt() {
    if (!ssong) return;
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssongStopSound();
    if (ssong.pads) { ssong.pads.destroy(); ssong.pads = null; }
    ssong.state = 'menu';
}

// The back button: from a take to the song's menu, from the menu to the song
// chooser. Returns true when it handled it.
function ssongHandleBack(active) {
    if (!active || active.id.indexOf('ssong-screen-') !== 0) return false;
    if (active.id === 'ssong-screen-play') { ssongToMenu(); return true; }
    ssongHalt();
    ssong = null;
    showBeatSongs();
    return true;
}

function ssongToMenu() {
    ssongHalt();
    ssong.mode = 'menu';
    switchScreenState('beat', 'ssong-screen-menu');
    ssongRenderMenu();
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden && ssong && ssong.state !== 'menu') ssongToMenu();
});

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

    const free = ssongMake('button', 'kr-btn kr-btn-go ssong-free', body); // text-ok
    free.type = 'button';
    free.textContent = KR.t('ssong.menu.free');
    free.onclick = () => ssongOpenFree();
    ssongMake('p', 'ssong-sub', body).textContent = KR.t('ssong.menu.free.sub');

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
                    sub.textContent = ssongStars(st.stars, KRStompSong.NEEDS);
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
    const free = ssong.mode === 'free';
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
    ssong.taps = [];
    ssong.result = null;
    ssongShowPlay('hurdle');
    ssongRenderReading();
    ssongSetState('ready');
}

// The play screen in its two uses: a hurdle (notation, stars) and free play.
function ssongShowPlay(mode) {
    const free = mode === 'free';
    ssongEl('ssong-reading').hidden = free;
    ssongEl('ssong-stars').hidden = free;
    ssongEl('ssong-result').hidden = true;
    ssongEl('ssong-summary').hidden = true;
    const label = ssongEl('ssong-label');
    if (free) label.textContent = KR.t('ssong.free.label');
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
    box.textContent = ssong.hurdle.record ? '' : ssongStars(st.stars, KRStompSong.NEEDS);
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
function ssongWithGrid(fn) {
    const saved = [rstompSlotsPerBar, rstompSlotValue, rstompSlotsPerBeat, rstompBeamSlots];
    rstompSlotsPerBar = 4; rstompSlotValue = 'q'; rstompSlotsPerBeat = 1; rstompBeamSlots = 1;
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
    const perLine = Math.min(p.bars, width < 560 ? 2 : 4);
    const perBar = Math.min(300, Math.floor((width - 16) / perLine));
    const lines = [];
    for (let first = 0; first < p.bars; first += perLine) {
        const lineBars = p.pattern.slice(first, first + perLine);
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
        const drawn = ssongWithGrid(() => renderRstompStaff(staff, lineBars.map(ssongSpecs), perBar, { finalBar: lastLine }));
        const playhead = ssongMake('div', 'ssong-playhead', paper);
        playhead.hidden = true;
        drawn.forEach((layout, i) => {
            const mark = ssongMake('div', 'bsmash-mark', marks);
            mark.style.left = (4 + i * perBar) + 'px';
            ssong.layout[first + i] = {
                x: beat => ssongWithGrid(() => layout.pulseX(beat)),
                paper, under, playhead, line, lineIndex: lines.length - 1,
            };
        });
    }
    const phoneLines = window.innerHeight < 700 ? 3 : SSONG_PAGE_LINES_PHONE;
    ssong.page = { lines: lines, perLine: perLine, size: Math.min(lines.length, perLine === 2 ? phoneLines : SSONG_PAGE_LINES_WIDE), at: -1 };
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
    const lay = ssong.layout[bar];
    const b = Math.max(0, Math.min(3.999, beat));
    const k = Math.floor(b), f = b - k;
    const x0 = lay.x(k);
    const x1 = k < 3 ? lay.x(k + 1) : x0 + (x0 - lay.x(2));
    return x0 + f * (x1 - x0);
}

/* ---------- rolling tape: one attempt ---------- */

function ssongSetState(state) {
    ssong.state = state;
    const go = ssongEl('ssong-go');
    const stop = ssongEl('ssong-stop');
    const free = ssong.mode === 'free';
    go.hidden = state !== 'ready';
    go.textContent = KR.t(free ? 'ssong.free.go' : 'ssong.go');
    stop.hidden = !(state === 'lead' || state === 'rec' || state === 'playing');
    stop.textContent = KR.t(free ? 'ssong.free.stop' : 'ssong.stop');
    ssongEl('ssong-guide').hidden = state !== 'ready' && !free;
    ssongEl('ssong-reading').classList.toggle('briefing', state === 'ready' && false);
}

function ssongRoll() {
    if (!ssong || ssong.state !== 'ready') return;
    const ctx = ssongAudio();
    if (!ctx) return;
    ssongEl('ssong-go').disabled = true;
    const begin = () => {
        ssongEl('ssong-go').disabled = false;
        if (!ssong || ssong.state !== 'ready') return;
        if (ssong.mode === 'free') ssongStartFree(); else ssongStartAttempt();
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
    ssong.guided = !!ssong.settings.guide;
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
    ssongKick(ctx.currentTime + 0.003, false);
    if (ssong.mode === 'free') {
        ssong.taps.push({ t: press.time - ssong.freeStart });
        return;
    }
    ssong.taps.push({ raw: press.raw - ssong.punchClock, delay: ssong.delay.delay, t: press.time - ssong.punchClock });
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
    if (ssong.mode === 'free') return ssongFreeFrame();
    const p = ssong.plan;
    const heard = ssongHeard();
    const rel = heard - ssong.punchClock;                      // seconds from the punch-in, as heard
    const beatPos = KRStompSong.beatAt(ssong.beats, p.punchAt + rel) - p.punchBeat;   // beats from the punch-in
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
        if (whole >= -4 && whole < 0) count.textContent = String(whole + 5);
        else count.textContent = '';
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
    const p = ssong.plan, hurdle = ssong.hurdle;
    const g = KRStompSong.grade(p, ssong.taps, { windowSec: SSONG_WINDOW });
    const passed = KRStompSong.passes(g, hurdle.pass);
    const applied = KRStompSong.applyAttempt(ssong.progress, ssong.round.id, hurdle,
        { passed: passed, guided: ssong.guided, pct: g.pct, session: ssong.session });
    ssongSave();
    window.ssongLast = { grade: g, passed: passed, applied: applied, plan: p, taps: ssong.taps.slice() };
    ssongStopSound();
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssong.layout.forEach(l => { l.playhead.hidden = true; });
    ssongEl('ssong-rec').classList.remove('recording', 'practice');
    ssongEl('ssong-count').textContent = '';
    ssong.state = 'result';
    ssongSetState('result');
    ssongMarkTake(g);
    ssongShowResult(g, passed, applied);
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
        dot.style.left = (ssongX(o.bar, o.beat) - 4) + 'px';
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

function ssongShowResult(g, passed, applied) {
    const box = ssongEl('ssong-result');
    box.hidden = false;
    const head = ssongEl('ssong-result-head');
    const lines = ssongEl('ssong-result-lines');
    lines.innerHTML = '';
    let key = passed ? 'ssong.result.pass' : (g.pct < 0.5 ? 'ssong.result.cut' : 'ssong.result.close');
    if (ssong.guided) key = 'ssong.result.practice';
    head.textContent = KR.t(g.perfect && !ssong.guided ? 'ssong.result.clean' : key);
    const add = text => { ssongMake('li', '', lines).textContent = text; };
    add(KR.t('ssong.result.score', { hits: g.hits, notes: g.notes }));
    if (g.first) add(KR.t('ssong.why.' + g.first.why, { bar: g.first.bar + 1 }));
    if (g.hits >= 2) {
        if (g.leanMs <= -25) add(KR.t('ssong.result.early', { ms: Math.abs(g.leanMs) }));
        else if (g.leanMs >= 25) add(KR.t('ssong.result.late', { ms: g.leanMs }));
        else add(KR.t('ssong.result.pocket'));
    }
    if (ssong.guided) add(KR.t('ssong.result.guided'));
    else if (!ssong.hurdle.record) add(KR.t('ssong.result.stars', { n: applied.stars, needs: KRStompSong.NEEDS }));
    ssongRenderStars();

    // What to do next.
    const actions = ssongEl('ssong-result-actions');
    actions.innerHTML = '';
    const button = (cls, textId, fn) => {
        const b = ssongMake('button', 'btn ' + cls, actions);
        b.type = 'button'; b.textContent = KR.t(textId); b.onclick = fn; return b;
    };
    const nextIndex = ssong.hi + 1;
    const nextHurdle = ssong.round.hurdles[nextIndex];
    if (applied.cleared && nextHurdle && KRStompSong.hurdleOpen(ssong.progress, ssong.song, ssong.ri, nextIndex, KR.openAll())) {
        button('btn-start', 'ssong.next', () => ssongOpenHurdle(ssong.ri, nextIndex, nextHurdle.record ? nextHurdle.sessions[0].id : null));
        button('btn-secondary', 'ssong.again', () => ssongPrepareAttempt());
    } else {
        button(applied.cleared ? 'btn-secondary' : 'btn-start', 'ssong.again', () => ssongPrepareAttempt());
    }
    button('btn-secondary', 'ssong.menu', () => ssongToMenu());

    // The coach.
    if (applied.record) ssongEvent('ssong.record.' + applied.record);
    else if (applied.newlyCleared) ssongEvent('ssong.cleared');
    else if (ssong.guided) ssongEvent('ssong.take.guided');
    else if (g.perfect) ssongEvent('ssong.take.clean');
    else if (g.pct < 0.5) ssongEvent('ssong.take.cut');
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
    ssong.beats.forEach(t => ssongKick(startWhen + t, true));
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
    const pos = KRStompSong.beatAt(ssong.beats, ssongHeard() - ssong.freeStart);
    const whole = Math.floor(pos);
    if (whole !== ssong.lastBeat) {
        ssong.lastBeat = whole;
        if (ssong.pads && ssong.settings.freeGuide && whole >= 0) ssong.pads.glow(0, 'beat', 140);
    }
    if (ctx.currentTime >= ssong.freeEnd) ssongEndFree();
}

function ssongEndFree() {
    if (!ssong || ssong.mode !== 'free' || ssong.state === 'result') return;
    if (ssong.frame) cancelAnimationFrame(ssong.frame);
    ssong.frame = 0;
    ssongStopSound();
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
    ssongHalt();
    ssongPrepareAttempt();
}

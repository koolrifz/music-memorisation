/* =========================================
   BEAT SMASH - the first rhythm game
   =========================================
   Feel and read the beat, in a recording studio. The student wins three
   musicians one at a time by reading bars of real notation and playing them
   on the pads, in time, over the band. Phase 1 (this file today): the first
   minute, the pads, the delay calibration, and TANGO ON DRUMS end to end -
   the one-bar step, the two-bar step, the big four-bar take, the choice of
   three drum parts, and playback.

   The spec is the design brief, kool-riffs-docs/docs/beat-smash-design-brief.md.
   Section numbers below (§6, §11...) are that brief's.

   REUSED, NEVER COPIED (brief §18):
     - the vocabulary, the grid and the engraving rules: RSTOMP_VOCABULARY,
       rstompGridFor, buildRstompUnitShapes / rstompShapeIsLegal;
     - the notation renderer, renderRstompStaff (stems up, dots by hand, the
       crop window, notes ON the slot grid);
     - the one AudioContext, rstompAudio(), and its instruments: raudioClick
       for the count, raudioNoise / raudioTone for the dice and the star;
     - the placeholder band's voices, BeatSmashBand (beat-smash-band.js), for
       the student's pad sound and as a stand-in if a loop file won't load;
     - the pads, KRPads (beat-pads.js);
     - the players list, vsmashPlayers (value-smash.js): one list of names
       per device, shared by every game that keeps players.

   NO WORDS IN THIS FILE. Every word on screen comes from lang/en-US.js
   through KR.t / KR.say / KR.event. tools/check-text.py checks it.
   ========================================= */

/* ---------- The song (brief §8.1) ----------
   One song for the whole level: four bars of I - IV - I - V, 100 bpm,
   straight eighths. The loops are Garnet's files (placeholders for now),
   named by ID in content/audio.js. Every loop is started on the audio clock
   on a barline, so they stay locked to each other and to the grading. */
const BSMASH_SONG = {
    bpm: 100,
    beatsPerBar: 4,
    bars: 4,
    chords: ['I', 'IV', 'I', 'V'],
};
const BSMASH_BEAT = 60 / BSMASH_SONG.bpm;                 // 0.6 s
const BSMASH_BAR = BSMASH_BEAT * BSMASH_SONG.beatsPerBar; // 2.4 s
const BSMASH_LOOP = BSMASH_BAR * BSMASH_SONG.bars;        // 9.6 s
const BSMASH_STYLES = ['spicy', 'smooth', 'hop'];

function bsmashLoopId(instrument, style) {
    return 'beat.loop.' + instrument + '.' + style;
}

/* ---------- A bar, written the way Rob would read it ----------
   Space-separated note values: q = quarter note, qr = quarter rest, h / hr
   = half, w / wr = whole. 'q qr q q' is note, rest, note, note. */
const BSMASH_TOKENS = {
    q: 'quarter-note', qr: 'quarter-rest',
    h: 'half-note', hr: 'half-rest',
    w: 'whole-note', wr: 'whole-rest',
};

function bsmashParseBar(text) {
    return text.trim().split(/\s+/).map(token => BSMASH_TOKENS[token]);
}

/* ---------- The musicians, and what each one's dice can roll (brief §5) ----------
   A DICE TABLE IS DATA. Each step lists the bars its dice may land on;
   'all' means every legal bar of the musician's notes (the engraving rules
   decide which, through rstompShapeIsLegal - Tango's 'all' is 15 bars,
   never four quarter rests).

   Tango's one-bar step is a LADDER, climbed by clean takes (§5): every beat,
   the strong beats (1 and 3), the backbeat (2 and 4, the first bar that
   starts with silence), one rest anywhere, then the full map. "Beat 1 is the
   boss" is in every bar: it is heard and seen stronger (§6).
   The dice roll from the rung the student has reached, never beyond it. */
const BSMASH_MUSICIANS = [
    {
        id: 'drums', coach: 'tango', built: true,
        pool: ['quarter-note', 'quarter-rest'],
        sounds: ['kick', 'snare'],
        steps: {
            1: [['q q q q'], ['q qr q qr'], ['qr q qr q'], // text-ok: bars, not words
                ['qr q q q', 'q qr q q', 'q q qr q', 'q q q qr'], 'all'], // text-ok: bars, not words
            2: ['all'],
            3: ['all'],
        },
    },
    /* Riff on bass (§2, §5): half notes and half rests join the quarters,
       and the syncopation quarter · half · quarter. "The groove." His own
       one-bar ladder, climbed by clean takes like Tango's: the half note
       on 1 and 3 (the bass's own halves, and the re-strike on beat 3) ·
       a half and a half rest · halves among quarters · the syncopation ·
       all 36 legal bars. */
    {
        id: 'bass', coach: 'riff', built: true,
        pool: ['quarter-note', 'quarter-rest', 'half-note', 'half-rest'],
        sounds: ['bass-electric', 'bass-acoustic'],
        steps: {
            1: [['h h'], ['h hr', 'hr h'], // text-ok: bars, not words
                ['h q q', 'q q h', 'h q qr', 'q qr h', 'hr q q', 'q q hr'], // text-ok: bars, not words
                ['q h q', 'qr h q', 'q h qr'], 'all'], // text-ok: bars, not words
            2: ['all'],
            3: ['all'],
        },
    },
    { id: 'keys', coach: 'riff', built: false },    // Phase 2
    { id: 'booth', coach: 'tango', built: false },  // Phase 3
];

// How many bars each step reads (§3).
const BSMASH_STEP_BARS = { 1: 1, 2: 2, 3: 4 };

/* ---------- Defaults Rob will tune ----------
   All in one place. Ages are asked once, when the player is added (§12). */
const BSMASH_AGES = ['6-8', '9-10', '11+'];
const BSMASH_DEFAULT_AGE = '9-10';
const BSMASH_WINDOW_MS = { '6-8': 220, '9-10': 195, '11+': 170 };   // how far from the beat a tap still counts
const BSMASH_WINDOW_START_EXTRA_MS = 40;   // generous at first (§14)...
const BSMASH_WINDOW_TIGHTEN_MS = 5;        // ...and this much tighter per clean take, down to the age's window
const BSMASH_PASS_MARK = { '6-8': 0.80, '9-10': 0.85, '11+': 0.90 };  // the big take (§6)
const BSMASH_JAM_GOAL = 24;                // on-beat taps that fill the meter: about 15 seconds at 100 bpm
const BSMASH_JAM_WINDOW_MS = 150;          // the first minute can't fail; this decides when a pad lights and the meter fills
const BSMASH_JAM_DEMO_EVERY_BARS = 4;      // Tango shows the way again if the taps don't settle
// The band builds as the student holds the beat: at a third of the meter the
// bass joins, at two thirds the keys. A taste of the band they will win.
const BSMASH_JAM_LAYERS = [
    { at: 1 / 3, instrument: 'bass', style: 'smooth' },
    { at: 2 / 3, instrument: 'keys', style: 'smooth' },
];
// With one of Rob's songs (content/songs.js) the bass and keys join in whole
// notes; once the meter is full the keys switch to his pumps (a different
// pump rhythm each time round) and the bass to the song's own groove, its
// style (a walking line, a tumbao...). The longer the beat is held, the
// groovier it gets. {song} is the song's id.
const BSMASH_JAM_SONG_LAYERS = [
    { at: 1 / 3, instrument: 'bass', style: 'song:{song}:whole' },
    { at: 2 / 3, instrument: 'keys', style: 'song:{song}:whole' },
    { at: 1, instrument: 'keys', style: 'song:{song}:pumps' },
    { at: 1, instrument: 'bass', style: 'song:{song}:groove' },
];
// THE GROOVE KEEPS MOVING. Rob: "We play a four-bar loop four times; on the
// fifth time that sets up a variation of the band. And it keeps pumping away
// for another four bars until another variation happens." Once the meter is
// full, every BSMASH_JAM_VARIATION_EVERY times round the loop with the beat
// held, the drums play a fill and the band turns to the next line of a
// variations list at the top of the next time round. A line changes only the
// instruments it names; 'off' drops one out. Rob's songs carry their own list
// (`jam` in content/songs.js); these are for a song without one, and for the
// C loops. bass and keys name a song's bass styles and comps; for the C
// loops, a style.
const BSMASH_JAM_VARIATION_EVERY = 4;      // times round the loop, beat held, between variations
const BSMASH_JAM_STEADY_TAPS = 6;          // on-beat taps in the first three bars that make a time round count
const BSMASH_JAM_VARIATIONS = [
    { drums: 'smooth' },
    { drums: 'spicy', bass: 'spicy', keys: 'spicy' },
    { drums: 'off', say: 'beat.jam.drop' },
    { drums: 'hop', bass: 'hop', keys: 'hop' },
    { drums: 'smooth', bass: 'smooth', keys: 'smooth' },
    { drums: 'warmup' },
];
const BSMASH_JAM_SONG_VARIATIONS = [
    { drums: 'smooth' },
    { drums: 'spicy', bass: 'tumbao' },
    { drums: 'off', say: 'beat.jam.drop' },
    { drums: 'hop', bass: 'pump', keys: 'pumps' },
    { drums: 'warmup', bass: 'groove' },
];
// Parts played live by the synth (Rob's songs, and any loop whose file hasn't
// loaded) go through this. It is the factor tools/beat-smash-band/render.js
// scaled the loop files by, measured: 0.47 for every part. Without it a live
// part is twice as loud as the recorded ones, and a song clipped at 1.46.
const BSMASH_LIVE_SCALE = 0.47;
const BSMASH_SAG_OPEN_HZ = 18000;          // the band at full power...
const BSMASH_SAG_LOW_HZ = 450;             // ...and sunk, when the beat is lost
const BSMASH_SAG_AFTER = 2;                // taps off the beat in a row before the band starts to sag
/* THE BEAT LIGHT, in the empty middle of the jam. Rob: "I don't think their
   tap has the logic in it that says I'm making the music go. I think the
   first thing is: can I light this up green, because that makes the music
   go." One round light. Each tap fills it: right on the beat, it fills
   green, dead centre; a bit early, the fill lands yellow to the LEFT of
   centre (time runs left to right, as in the music); a bit late, to the
   right; way off, red at the edge. How far the fill misses the centre is how
   far the tap missed the beat. The longer the green is held, the brighter
   it glows. Yellow still counts for the meter; red is a tap off the beat.
   Measured against the student's OWN steady beat, as the meter is: a phone's
   sound delay and a steady lean can't be told apart, but a tap early or late
   against the beat they have been keeping can, and so can rushing. */
const BSMASH_LIGHT_GREEN_MS = { '6-8': 90, '9-10': 75, '11+': 60 };  // how close counts as green
const BSMASH_LIGHT_IDLE_MS = 900;          // no tap for this long and the light goes dark
// Tango coaches the time. Rob: "She should be saying you're a little bit too
// fast, slow down, or speed up, you're dragging." Rushing or dragging is the
// gap between taps, averaged over four: a beat this much short or long.
const BSMASH_TEMPO_SLACK = 0.06;
const BSMASH_COACH_EVERY_BARS = 2;         // Tango coaches no more often than this
const BSMASH_GREEN_PRAISE_AT = 8;          // greens in a row before Tango says so...
const BSMASH_GREEN_PRAISE_EVERY = 24;      // ...and again after this many more
/* FOLLOW ME. Rob, 2026-10-01: "When you're entering and you're missing the
   beat, Tango doesn't say boom boom boom boom. Tango says follow me, 1 2 3 4.
   And continues counting until order has been restored or they give up. She
   congratulates them on order restored... If they fall apart and quit, let
   her know everyone struggles at the beginning. The important thing is to
   keep trying." The count is in time: her counting voice (the app's pitched
   placeholder, one degree of the scale per beat, Rob's rule) on every beat,
   the number in the beat light, the pad for the beat flashing. */
const BSMASH_FOLLOW_RESTORED = 3;          // taps on the beat in a row that end the counting: the rule of three
const BSMASH_JAM_IDLE_BARS = 2;            // bars without a tap before the band stops and the menu appears
const BSMASH_BEAT_TESTS_KEPT = 20;         // beat tests remembered per player
const BSMASH_DELAY_MAX = 0.45;             // seconds; a measured delay beyond this is thrown out
const BSMASH_DELAY_MIN = -0.05;            // seconds; a student who plays a touch early leans below zero
const BSMASH_DELAY_BLUETOOTH = 0.2;        // seconds; above this, say so (§14)
const BSMASH_MORPH_FIRST_S = 6;            // picture into notation, the first time (§4: 5-10 s)
const BSMASH_MORPH_S = 1.5;                // ...and once the student has seen it
const BSMASH_BAND_QUIET = 0.35;            // the band under a scored take (§9)
const BSMASH_BAND_FULL = 1.0;              // the band after a success
const BSMASH_JAM_BAND = 0.55;              // Tango warming up, under the student's taps
const BSMASH_PICKER_INTRO_MS = 2000;       // the win is felt before any choice (§8.2 state 1)

const BSMASH_PROGRESS_KEY = 'koolRiffsBeatProgress';
const BSMASH_DELAY_KEY = 'koolRiffsBeatDelay';   // per device, not per player

/* =========================================
   TIMERS - everything pending, so leaving stops it dead
   ========================================= */
let bsmashTimers = [];

function bsmashLater(fn, ms) {
    bsmashTimers.push(setTimeout(fn, ms));
}

function bsmashStopTimers() {
    bsmashTimers.forEach(id => clearTimeout(id));
    bsmashTimers = [];
}

/* =========================================
   PLAYERS AND PROGRESS
   =========================================
   The players list is value-smash.js's (one list per device). Beat Smash
   adds an age to a player, asked once (§12).

   The first minute needs no name: nothing to read before the first win
   (§11). Until a player is chosen, progress lives in memory (the guest
   record) and is written to the player the moment one is added. */
let bsmashGuest = null;

function bsmashPlayer() {
    return (typeof vsmashCurrentPlayer === 'function') ? vsmashCurrentPlayer() : null;
}

function bsmashAge() {
    const player = bsmashPlayer();
    return (player && BSMASH_AGES.indexOf(player.age) !== -1) ? player.age : BSMASH_DEFAULT_AGE;
}

function bsmashBlankMusician() {
    return { step: 1, streak: 0, clean: 0, won: false, part: null, plays: 0 };
}

function bsmashBlankProgress() {
    return {
        jamDone: false,
        firstStar: false,
        seenMorph: false,
        musicians: {},
        settings: { padMode: 'auto', pictureHelp: 'mix', sound: { drums: 'kick', bass: 'bass-electric' }, jamSong: 'c' },
    };
}

function bsmashReadAll() {
    let all = null;
    try { all = JSON.parse(localStorage.getItem(BSMASH_PROGRESS_KEY)); } catch (e) {}
    if (!all || typeof all.players !== 'object' || all.players === null) all = { players: {} };
    return all;
}

// THE ONLY TWO FUNCTIONS THAT TOUCH BEAT SMASH PROGRESS.
function bsmashLoad() {
    const player = bsmashPlayer();
    const saved = player ? bsmashReadAll().players[player.id] : bsmashGuest;
    const blank = bsmashBlankProgress();
    const progress = Object.assign(blank, saved ? JSON.parse(JSON.stringify(saved)) : {});
    progress.settings = Object.assign(bsmashBlankProgress().settings, progress.settings);
    progress.settings.sound = Object.assign({ drums: 'kick', bass: 'bass-electric' }, progress.settings.sound);
    progress.musicians = progress.musicians || {};
    BSMASH_MUSICIANS.forEach(m => {
        progress.musicians[m.id] = Object.assign(bsmashBlankMusician(), progress.musicians[m.id]);
    });
    return progress;
}

function bsmashSave(progress) {
    const player = bsmashPlayer();
    if (!player) { bsmashGuest = JSON.parse(JSON.stringify(progress)); return; }
    const all = bsmashReadAll();
    all.players[player.id] = progress;
    try { localStorage.setItem(BSMASH_PROGRESS_KEY, JSON.stringify(all)); } catch (e) {}
}

function bsmashMusicianRecord(id) {
    return bsmashLoad().musicians[id];
}

function bsmashUpdateMusician(id, changes) {
    const progress = bsmashLoad();
    Object.assign(progress.musicians[id], changes);
    bsmashSave(progress);
    return progress.musicians[id];
}

/* ---------- The device's delay (§14) ----------
   Measured in the first minute, stored per device: the time from a beat
   leaving the audio clock to the student's tap on it. It covers the speaker,
   the touch screen and the headphones together, which is why it is measured
   rather than read from the browser. */
function bsmashDelay() {
    try {
        const saved = JSON.parse(localStorage.getItem(BSMASH_DELAY_KEY));
        if (saved && typeof saved.delay === 'number') return saved.delay;
    } catch (e) {}
    return 0;
}

function bsmashSaveDelay(delay) {
    try { localStorage.setItem(BSMASH_DELAY_KEY, JSON.stringify({ delay: delay, at: Date.now() })); } catch (e) {}
}

/* =========================================
   SOUND - the band, the pad, the count
   =========================================
   One AudioContext for the whole app (rstompAudio). Beat Smash adds its own
   two buses straight to the speakers: the BAND and the student's PAD. They
   bypass Stomp Lab's master on purpose: rstompAudioStop() fades that master,
   and a band that dipped every time something else stopped would lose the
   groove. The count (raudioClick) uses Stomp Lab's click bus, unchanged. */
let bsmashBandBus = null;
let bsmashPadBus = null;
let bsmashLiveBus = null;
let bsmashSagFilter = null;
let bsmashSagGain = null;
const bsmashBuffers = {};       // loop id -> AudioBuffer, 'loading' or 'failed'

function bsmashAudio() {
    const ctx = (typeof rstompAudio === 'function') ? rstompAudio() : null;
    if (!ctx) return null;
    if (!bsmashBandBus) {
        bsmashBandBus = ctx.createGain();
        bsmashBandBus.gain.value = BSMASH_JAM_BAND;
        // The sag (bsmashBandSag): a filter and a level after the band's own
        // level, so losing the beat can take the band's power away and
        // getting it back can return it, without touching the mix.
        bsmashSagFilter = ctx.createBiquadFilter();
        bsmashSagFilter.type = 'lowpass';
        bsmashSagFilter.frequency.value = BSMASH_SAG_OPEN_HZ;
        bsmashSagFilter.Q.value = 0.7;
        bsmashSagGain = ctx.createGain();
        bsmashBandBus.connect(bsmashSagFilter).connect(bsmashSagGain).connect(ctx.destination);
        bsmashLiveBus = ctx.createGain();
        bsmashLiveBus.gain.value = BSMASH_LIVE_SCALE;
        bsmashLiveBus.connect(bsmashBandBus);
        bsmashPadBus = ctx.createGain();
        bsmashPadBus.gain.value = 0.9;
        bsmashPadBus.connect(ctx.destination);
    }
    return ctx;
}

function bsmashNow() {
    return raudioCtx ? raudioCtx.currentTime : 0;
}

// When a tap REALLY happened, on the audio clock. The handler runs a little
// after the finger lands - more on a busy phone - so the event's own time
// stamp is used to take that lag back off. (Rob: "I really thought I was
// hitting on the beat.")
function bsmashEventTime(e) {
    const now = bsmashNow();
    if (!e || !e.timeStamp || typeof performance === 'undefined') return now;
    const lag = (performance.now() - e.timeStamp) / 1000;
    return lag > 0 && lag < 0.5 ? now - lag : now;
}

// What the student is HEARING now: the audio clock less the output delay
// the browser reports. Lights follow this, so they flash with the sound.
function bsmashHeardNow() {
    if (!raudioCtx) return 0;
    return raudioCtx.currentTime - (raudioCtx.outputLatency || 0);
}

function bsmashLoadLoop(id) {
    if (!id || bsmashBuffers[id]) return;
    const file = KR.audio && KR.audio[id];
    const ctx = bsmashAudio();
    if (!file || !ctx) { bsmashBuffers[id] = 'failed'; return; }
    bsmashBuffers[id] = 'loading';
    fetch(file)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(data => ctx.decodeAudioData(data))
        .then(buffer => { bsmashBuffers[id] = buffer; })
        .catch(() => { bsmashBuffers[id] = 'failed'; });
}

/* ---------- The band ----------
   bsmashBand.start is where bar 1 of the song begins on the audio clock.
   Every loop, every take and every chord is counted from it. A part is
   'warmup' (Tango warming up, before the drums are won) or a style.
   Each four-bar cycle is booked a little ahead as a new source at an exact
   time; a loop that hasn't loaded yet is synthesised by the placeholder band
   instead, so the music never waits for a download. */
let bsmashBand = null;          // { start, parts: {instrument: style}, next, sources: {instrument: [..]}, pending }
let bsmashTicker = null;
let bsmashQueue = [];           // [{ when, play, tag }] - sounds booked on the audio clock

function bsmashBandStart(parts) {
    const ctx = bsmashAudio();
    if (!ctx) return;
    if (!bsmashBand) {
        const start = ctx.currentTime + 0.15;
        bsmashBand = { start: start, next: start, parts: {}, sources: {} };
    }
    Object.keys(parts).forEach(instrument => bsmashBand.parts[instrument] = parts[instrument]);
    Object.keys(bsmashBand.parts).forEach(instrument =>
        bsmashLoadLoop(bsmashPartLoopId(instrument, bsmashBand.parts[instrument])));
    if (!bsmashTicker) bsmashTicker = setInterval(bsmashTick, 25);
}

// A part is 'warmup', a style ('spicy'...), or one of Rob's songs,
// 'song:<song>:<comp>' (content/songs.js), which is always played live.
function bsmashPartLoopId(instrument, style) {
    if (bsmashIsSongPart(style)) return null;
    return style === 'warmup' ? 'beat.loop.warmup' : bsmashLoopId(instrument, style);
}

function bsmashIsSongPart(style) {
    return typeof style === 'string' && style.indexOf('song:') === 0;
}

function bsmashBandStop() {
    if (bsmashTicker) { clearInterval(bsmashTicker); bsmashTicker = null; }
    bsmashBandSag(0, 0.05);
    if (bsmashBand) Object.keys(bsmashBand.sources).forEach(bsmashSilencePart);
    bsmashBand = null;
    bsmashQueue = [];
}

function bsmashSilencePart(instrument) {
    const now = bsmashNow();
    (bsmashBand.sources[instrument] || []).forEach(node => {
        try {
            node.gain.gain.cancelScheduledValues(now);
            node.gain.gain.setTargetAtTime(0.0001, now, 0.015);
            if (node.src) node.src.stop(now + 0.1);
            setTimeout(() => { try { node.gain.disconnect(); } catch (e) {} }, 400);
        } catch (e) {}
    });
    bsmashBand.sources[instrument] = [];
}

// One four-bar cycle of one part, starting at `when` (which may be a moment
// in the past: a recorded loop then starts part-way through, in time).
function bsmashPlayCycle(instrument, style, when) {
    const ctx = raudioCtx;
    const id = bsmashPartLoopId(instrument, style);
    const buffer = bsmashBuffers[id];
    const now = ctx.currentTime;
    const list = bsmashBand.sources[instrument] = bsmashBand.sources[instrument] || [];
    if (buffer && typeof buffer === 'object') {
        const gain = ctx.createGain();
        gain.connect(bsmashBandBus);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        const offset = Math.max(0, now + 0.02 - when);
        if (offset >= buffer.duration) return;
        src.start(Math.max(when, now + 0.02), offset);
        list.push({ src: src, gain: gain });
    } else if (bsmashIsSongPart(style)) {
        // Rob's songs are played note by note, so one can join part-way
        // through a cycle: every hit from now on is booked, none before.
        if (when + BSMASH_LOOP < now) return;
        const gain = BeatSmashBand.schedulePart(ctx, bsmashLiveBus, instrument, style, when, now + 0.03);
        list.push({ src: null, gain: gain });
    } else {
        // The placeholder synth books whole cycles only - a synthesised loop
        // can't start part-way through without firing every note it missed.
        if (when < now) return;
        const gain = BeatSmashBand.schedulePart(ctx, bsmashLiveBus,
            style === 'warmup' ? 'warmup' : instrument, style === 'warmup' ? 'tango' : style, when);
        list.push({ src: null, gain: gain });
    }
    // Keep only what can still be sounding.
    if (list.length > 4) list.splice(0, list.length - 4);
}

// Swap one part NOW, in time, as the part picker needs (§8.2).
function bsmashBandSetPart(instrument, style) {
    if (!bsmashBand) return bsmashBandStart({ [instrument]: style });
    bsmashSilencePart(instrument);
    bsmashBand.parts[instrument] = style;
    bsmashLoadLoop(bsmashPartLoopId(instrument, style));
    // The ticker may already have booked the next cycle a moment ahead; if
    // so, the one sounding now is the cycle before it. Replay both.
    const booked = bsmashBand.next - BSMASH_LOOP;
    if (booked > bsmashNow()) bsmashPlayCycle(instrument, style, booked - BSMASH_LOOP);
    bsmashPlayCycle(instrument, style, booked);
}

function bsmashBandRemovePart(instrument) {
    if (!bsmashBand || !(instrument in bsmashBand.parts)) return;
    bsmashSilencePart(instrument);
    delete bsmashBand.parts[instrument];
}

/* ---------- The sag: the band loses its power when the beat is lost ----------
   Rob: "If they tap really poorly out of time, the music slows down like a
   record slowing down, and then they start pushing the beat back in time...
   It's nice and clean and that's how they know." 0 is the full band; 1 is
   the band muffled and sunk, as if the power were running down. It moves
   smoothly both ways, never in steps, so it reads as music, not a glitch.
   (A real slow-down would bend the band's clock, which every beat and every
   take is counted from: parked, see CLAUDE.md.) */
function bsmashBandSag(amount, seconds) {
    if (!bsmashSagFilter) return;
    const now = bsmashNow();
    const a = Math.max(0, Math.min(1, amount));
    const hz = BSMASH_SAG_OPEN_HZ * Math.pow(BSMASH_SAG_LOW_HZ / BSMASH_SAG_OPEN_HZ, a);
    const time = (seconds || 0.6) / 3;
    bsmashSagFilter.frequency.cancelScheduledValues(now);
    bsmashSagFilter.frequency.setTargetAtTime(hz, now, time);
    bsmashSagGain.gain.cancelScheduledValues(now);
    bsmashSagGain.gain.setTargetAtTime(1 - 0.55 * a, now, time);
}

function bsmashBandLevel(level, seconds) {
    if (!bsmashBandBus) return;
    const now = bsmashNow();
    bsmashBandBus.gain.cancelScheduledValues(now);
    bsmashBandBus.gain.setTargetAtTime(level, now, (seconds || 0.3) / 3);
}

function bsmashTick() {
    if (!bsmashBand || !raudioCtx) return;
    const now = raudioCtx.currentTime;
    while (bsmashBand.next < now + 0.6) {
        const when = bsmashBand.next;
        const pending = bsmashBand.pending;
        if (pending && when >= pending.at - 1e-6) {
            bsmashBand.pending = null;
            pending.apply();
        }
        Object.keys(bsmashBand.parts).forEach(instrument =>
            bsmashPlayCycle(instrument, bsmashBand.parts[instrument], when));
        bsmashBand.next += BSMASH_LOOP;
    }
    while (bsmashQueue.length && bsmashQueue[0].when < now + 0.1) {
        const e = bsmashQueue.shift();
        try { e.play(Math.max(e.when, now)); } catch (err) { /* a dud sound must not stop the take */ }
    }
}

function bsmashAt(when, play, tag) {
    bsmashQueue.push({ when: when, play: play, tag: tag || null });
    bsmashQueue.sort((a, b) => a.when - b.when);
}

function bsmashCancel(tag) {
    bsmashQueue = bsmashQueue.filter(e => e.tag !== tag);
}

// The first barline at least `lead` seconds from now.
function bsmashNextBar(lead) {
    const earliest = bsmashNow() + (lead || 0);
    const bars = Math.ceil((earliest - bsmashBand.start) / BSMASH_BAR - 1e-6);
    return bsmashBand.start + Math.max(0, bars) * BSMASH_BAR;
}

// Which bar of the song is sounding at time t: its chord is the pad's chord.
function bsmashChordAt(t) {
    if (!bsmashBand) return 'I';
    const bar = Math.floor((t - bsmashBand.start) / BSMASH_BAR + 1e-6);
    return BSMASH_SONG.chords[((bar % BSMASH_SONG.bars) + BSMASH_SONG.bars) % BSMASH_SONG.bars];
}

/* ---------- The sound under the thumb (§7) ----------
   The student's own choice: kick or snare for Tango. It plays at once, on
   every press, in or out of time - honest, and rewarding on its own.
   Bass and keys (Phase 2) sustain while the pad is held. */
function bsmashPadSound(press, kind) {
    const ctx = bsmashAudio();
    if (!ctx) return;
    const fire = () => {
        const when = raudioCtx.currentTime + 0.02;   // 20 ms, not 5: see rstompAudioTap
        try { press.voice = BeatSmashBand.pad(raudioCtx, bsmashPadBus, when, kind, bsmashChordAt(when)); }
        catch (e) { /* a dud pad sound must never block the take */ }
    };
    if (ctx.state === 'suspended') ctx.resume().then(fire).catch(fire);
    else fire();
}

function bsmashPadRelease(press) {
    if (press.voice && raudioCtx) press.voice.release(raudioCtx.currentTime + 0.01);
}

// The count. Beat 1 is home base: its own, stronger click (§6); stronger
// again on the beat 1 the student is finding their way back to.
function bsmashClick(when, beatInBar, comeback) {
    raudioClick(when, beatInBar === 0);
    if (comeback) raudioTone(when, 1568, 0.09, 0.45, 'square', 'click');
}

function bsmashDiceSound() {
    const ctx = bsmashAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    for (let i = 0; i < 7; i++) raudioNoise(t + i * 0.1 + Math.random() * 0.04, 0.03, 0.35, 3000 + Math.random() * 2000, 2, 'rhythm');
    raudioTone(t + 0.8, 520, 0.06, 0.35, 'triangle', 'rhythm');
}

function bsmashStarSound() {
    const ctx = bsmashAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    [784, 988, 1175].forEach((hz, i) => raudioTone(t + i * 0.07, hz, 0.18, 0.3, 'triangle', 'rhythm'));
}

/* =========================================
   BARS: the dice, the specs, the engraving
   ========================================= */

// The musician's grid: common time on the crotchet grid, Stage A's grid.
function bsmashGrid(musician) {
    return rstompGridFor({ labels: RSTOMP_LABELS_BEAT, slot: 'q', pool: musician.pool });
}

// Every legal bar of the musician's notes, by the Rhythm pillar's own
// engraving rules. Tango's is 15 bars.
const bsmashAllBarsCache = {};
function bsmashAllBars(musician) {
    if (!bsmashAllBarsCache[musician.id]) {
        const grid = bsmashGrid(musician);
        bsmashAllBarsCache[musician.id] = buildRstompUnitShapes(grid, grid.slotsPerBar, 0);
    }
    return bsmashAllBarsCache[musician.id];
}

// The bars a step's dice can land on, at the rung the student has reached.
function bsmashDiceTable(musician, step, clean) {
    const rungs = musician.steps[step];
    const rung = rungs[Math.min(clean, rungs.length - 1)];
    if (rung === 'all') return bsmashAllBars(musician);
    return rung.map(bsmashParseBar);
}

function bsmashSameBar(a, b) {
    return !!a && !!b && a.join() === b.join();
}

// Roll: random to the child, controlled to the curriculum (§4). Each bar is
// a different bar from the one before it where the table allows.
function bsmashRoll(musician, step, clean, previous) {
    const table = bsmashDiceTable(musician, step, clean);
    const bars = [];
    let last = previous && previous.length ? previous[previous.length - 1] : null;
    for (let i = 0; i < BSMASH_STEP_BARS[step]; i++) {
        const fresh = table.filter(bar => !bsmashSameBar(bar, last));
        const from = fresh.length ? fresh : table;
        const bar = from[Math.floor(Math.random() * from.length)];
        bars.push(bar);
        last = bar;
    }
    return bars;
}

// One bar as the specs renderRstompStaff draws: { value, isRest, slots, tied },
// plus where each starts.
function bsmashSpecs(bar) {
    let slot = 0;
    return bar.map(key => {
        const entry = RSTOMP_VOCABULARY[key];
        const slots = rstompSlotsFor(entry.value, 'q');
        const spec = { key: key, value: entry.value, isRest: entry.isRest, slots: slots, slot: slot, tied: false };
        slot += slots;
        return spec;
    });
}

// renderRstompStaff reads Stomp Lab's grid from four globals. Beat Smash
// draws on Stage A's grid, so it sets them for the one call and puts back
// whatever Stomp Lab had. Reused, not copied.
function bsmashWithStompGrid(fn) {
    const saved = [rstompSlotsPerBar, rstompSlotValue, rstompSlotsPerBeat, rstompBeamSlots];
    rstompSlotsPerBar = 4; rstompSlotValue = 'q'; rstompSlotsPerBeat = 1; rstompBeamSlots = 1;
    try { return fn(); }
    finally { [rstompSlotsPerBar, rstompSlotValue, rstompSlotsPerBeat, rstompBeamSlots] = saved; }
}

/* =========================================
   THE READING LINE
   =========================================
   The notation on white paper, and the picture (the scaffold) laid out on
   the SAME slot grid, so a block sits exactly where its note will be and the
   morph from one to the other is a change of look, not a change of place.

   Phones: one and two bars fit on a line; four bars take two lines (§13).
   Above each line, a small mark at each barline: beat 1 is home base (§6).
   Below it, the verdict: the notes that went wrong are marked there. Nothing
   is ever drawn over the notation. */
const BSMASH_VALUE_CLASS = { q: 'quarter', h: 'half', w: 'whole' };
const BSMASH_BLOCK_MAX = 52;      // px: the largest a beat's square gets (the paper is 65 high)
const BSMASH_BLOCK_GAP = 8;       // px between neighbouring squares

function bsmashEl(id) {
    return document.getElementById(id);
}

function bsmashMake(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
}

function bsmashRenderReading() {
    const reading = bsmashEl('beat-reading');
    reading.innerHTML = '';
    reading.classList.remove('clean');
    bsmash.layout = [];
    const bars = bsmash.specs;
    if (!bars || !bars.length) return;
    const width = Math.max(240, reading.clientWidth || 340);
    const perLine = bars.length === 4 && width < 560 ? 2 : bars.length;
    const perBar = Math.min(300, Math.floor((width - 16) / perLine));
    for (let first = 0; first < bars.length; first += perLine) {
        const lineBars = bars.slice(first, first + perLine);
        const line = bsmashMake('div', 'bsmash-line', reading);
        const marks = bsmashMake('div', 'bsmash-marks', line);
        const paper = bsmashMake('div', 'bsmash-paper', line);
        const staff = bsmashMake('div', 'bsmash-staff', paper);
        const picture = bsmashMake('div', 'bsmash-picture', paper);
        const under = bsmashMake('div', 'bsmash-under', line);
        paper.style.width = (perBar * lineBars.length + 8) + 'px';
        marks.style.width = under.style.width = paper.style.width;
        const drawn = bsmashWithStompGrid(() => renderRstompStaff(staff, lineBars, perBar));
        drawn.forEach((layout, i) => {
            const barIndex = first + i;
            const left = 4 + i * perBar;
            const mark = bsmashMake('div', 'bsmash-mark', marks);
            mark.style.left = left + 'px';
            bsmash.layout[barIndex] = { layout: layout, picture: picture, under: under, mark: mark, left: left, width: perBar, specs: lineBars[i] };
            bsmashDrawPicture(barIndex);
        });
        const cursor = bsmashMake('div', 'bsmash-cursor', picture);
        cursor.hidden = true;
    }
}

/* WHICH PICTURE. Rob, 2026-10-01: "If we are pushing them to notation on
   the second playing and only reading on the third, then does it matter how
   they see the first playing? We can actually mix up the visual displaying.
   In the meantime, yes, put it all under a helping hand." So by default the
   picture MIXES: each new roll draws in a different style from the last, so
   no one picture becomes the way to play. "Need a hand?" opens the choice,
   and a student who picks one style keeps it until they pick "Mix it up". */
const BSMASH_PICTURES = ['blocks', 'counting', 'machine'];

function bsmashPictureKind() {
    const chosen = bsmashLoad().settings.pictureHelp;
    if (BSMASH_PICTURES.indexOf(chosen) !== -1) return chosen;
    return (bsmash && bsmash.mixPicture) || 'blocks';
}

// A different style from the last roll's, for "Mix it up".
function bsmashMixPicture() {
    const others = BSMASH_PICTURES.filter(kind => kind !== bsmash.mixPicture);
    bsmash.mixPicture = others[Math.floor(Math.random() * others.length)];
}

// The picture of one bar, in the style above (§12): blocks, counting, or a
// drum machine. Width shows length; solid or hollow shows sound or silence;
// colour only repeats the length.
function bsmashDrawPicture(barIndex) {
    const entry = bsmash.layout[barIndex];
    const kind = bsmashPictureKind();
    const x = entry.layout.pulseX;
    entry.blocks = [];
    entry.specs.forEach((spec, index) => {
        const valueClass = BSMASH_VALUE_CLASS[spec.value] || 'quarter';
        const block = bsmashMake('div', 'bsmash-block', entry.picture);
        block.classList.add('pic-' + kind, valueClass);
        if (spec.isRest) block.classList.add('rest');
        // Every beat is a SQUARE (Rob: "too much a rectangle. Make them
        // square"), centred in its slot, so a quarter is one square and a
        // half is two squares joined: width still shows length.
        const slotWidth = x(1) - x(0);
        const side = Math.min(BSMASH_BLOCK_MAX, Math.round(slotWidth) - BSMASH_BLOCK_GAP);
        const inset = (slotWidth - side) / 2;
        block.style.left = (x(spec.slot) + inset) + 'px';
        block.style.width = ((spec.slots - 1) * slotWidth + side) + 'px';
        block.style.height = side + 'px';
        block.style.top = Math.round((RSTOMP_STAFF_CROP_HEIGHT - side) / 2) + 'px';
        for (let k = 0; k < spec.slots; k++) {
            const cell = bsmashMake('span', 'bsmash-cell', block);
            // The cells split the block at the beats: the first and last
            // reach from the square's edge to the slot's edge.
            const edge = spec.slots === 1 ? side : (k === 0 || k === spec.slots - 1 ? (slotWidth + side) / 2 : slotWidth);
            cell.style.width = edge + 'px';
            if (kind === 'counting') cell.textContent = bsmashCountLabel(spec, k);
            if (kind === 'machine') cell.classList.add(spec.isRest ? 'off' : (k === 0 ? 'on' : 'held'));
        }
        entry.blocks[index] = block;
    });
}

// The counting, as the Rhythm pillar writes it: the onset digit outside the
// bracket, held and silent beats inside - 1 (2) 3 4.
function bsmashCountLabel(spec, k) {
    const n = String(spec.slot + k + 1);
    const last = k === spec.slots - 1;
    if (!spec.isRest && k === 0) return n;
    const open = spec.isRest ? k === 0 : k === 1;
    return (open ? '(' : '') + n + (last ? ')' : '');
}

// 'picture' or 'notation'. A morph is the same swap, slowed down (§4).
function bsmashShow(what, seconds) {
    const reading = bsmashEl('beat-reading');
    reading.style.setProperty('--morph', (seconds || 0.25) + 's');
    reading.classList.toggle('show-picture', what === 'picture');
    reading.classList.toggle('show-notation', what !== 'picture');
    bsmash.showing = what;
}

function bsmashPictureCursor(takeBeat) {
    document.querySelectorAll('#beat-reading .bsmash-cursor').forEach(c => { c.hidden = true; });
    if (takeBeat === null || bsmash.showing !== 'picture') return;
    const bar = Math.floor(takeBeat / 4);
    const entry = bsmash.layout[bar];
    if (!entry) return;
    const x = entry.layout.pulseX;
    const cursor = entry.picture.querySelector('.bsmash-cursor');
    const beat = takeBeat % 4;
    cursor.style.left = x(beat) + 'px';
    cursor.style.width = (x(beat + 1) - x(beat)) + 'px';
    cursor.hidden = false;
}

function bsmashMarkUnder(barIndex, slot, slots) {
    const entry = bsmash.layout[barIndex];
    if (!entry) return;
    const x = entry.layout.pulseX;
    const mark = bsmashMake('div', 'bsmash-miss', entry.under);
    mark.style.left = (x(slot) + 1) + 'px';
    mark.style.width = Math.max(10, x(slot + slots) - x(slot) - 4) + 'px';
}

/* ---------- The dice (§4) ----------
   One die per bar. A face shows four dots in a row - filled for a note,
   hollow for a rest - so each face IS a bar. They tumble, land, and the
   picture appears where they land. */
function bsmashDiceRoll(bars) {
    const row = bsmashEl('beat-dice');
    row.innerHTML = '';
    row.hidden = false;
    const dice = bars.map(() => {
        const die = bsmashMake('div', 'bsmash-die', row);
        die.classList.add('rolling');
        for (let i = 0; i < 4; i++) bsmashMake('span', 'bsmash-pip', die);
        return die;
    });
    let flips = 0;
    const flicker = setInterval(() => {
        dice.forEach(die => die.querySelectorAll('.bsmash-pip').forEach(pip =>
            pip.classList.toggle('on', Math.random() < 0.6)));
        if (++flips > 9) clearInterval(flicker);
    }, 80);
    bsmashTimers.push(flicker);
    bsmashDiceSound();
    bsmashLater(() => {
        clearInterval(flicker);
        dice.forEach((die, i) => {
            die.classList.remove('rolling');
            const pips = die.querySelectorAll('.bsmash-pip');
            bsmashSpecs(bars[i]).forEach(spec => {
                for (let k = 0; k < spec.slots; k++) pips[spec.slot + k].classList.toggle('on', !spec.isRest);
            });
        });
    }, 850);
}

function bsmashDiceHide() {
    const row = bsmashEl('beat-dice');
    row.hidden = true;
    row.innerHTML = '';
}

/* =========================================
   THE STUDIO
   =========================================
   bsmash is the studio in play:
     mode      'jam' (the first minute) or 'steps' (winning a musician)
     musician  an entry of BSMASH_MUSICIANS
     step      1, 2 or 3 (one bar, two bars, the big take)
     scaffold  'star1' | 'star2' | 'star3' (the fading picture, §3),
               'retake' (practice after a miss) or 'big'
     bars      the roll, as vocabulary keys; specs, the same as specs
     take      the take being recorded, or null
     phase     'roll' | 'countin' | 'take' | 'verdict' | 'reveal' | 'ready' | 'picker' */
let bsmash = null;

function enterBeatSmash() {
    launchGame('view-beat');
    bsmashAudio();          // inside the tap that opened the game: iOS needs that
    KR.event('beat.open');
    if (!bsmashLoad().jamDone) startBeatJam();
    else showBeatPathway();
}

function leaveBeatSmash() {
    bsmashStopAll();
    launchGame('view-dashboard');
}

function handleBeatBackButton() {
    const active = document.querySelector('#view-beat .screen.active');
    const onPathway = active && active.id === 'beat-screen-pathway';
    if (bsmash && bsmash.picker && !bsmash.picker.locked) bsmashKeepPart(true);
    if (onPathway) leaveBeatSmash();
    else showBeatPathway();
}

function bsmashStopAll() {
    bsmashStopTimers();
    if (bsmash) {
        if (bsmash.frame) cancelAnimationFrame(bsmash.frame);
        if (bsmash.pads) bsmash.pads.destroy();
    }
    bsmash = null;
    bsmashBandStop();
}

document.addEventListener('visibilitychange', () => {
    const view = bsmashEl('view-beat');
    if (document.hidden && bsmash && view && view.classList.contains('active')) showBeatPathway();
});

function bsmashOpenStudio() {
    switchScreenState('beat', 'beat-screen-studio');
    bsmashAudio();
    if (!bsmash.pads) {
        bsmash.pads = KRPads.create({
            container: bsmashEl('beat-pads'),
            count: bsmashPadCount(),
            now: bsmashEventTime,
            delay: () => (bsmash ? bsmash.delay : 0),
            label: (i, n) => n === 1 ? KR.t('beat.pad.big') : KR.t('beat.pad.beat', { n: i + 1 }),
            onPress: bsmashPress,
            onRelease: bsmashRelease,
        });
    }
    if (!bsmash.frame) bsmash.frame = requestAnimationFrame(bsmashFrame);
    bsmashRenderDesk('beat-desk');
    bsmashRenderPictureChoice();
}

// A game event. A line attached to it in content/dialogue.js is shown in the
// guide box of the screen in front of the student (KR.say finds the visible
// one) and spoken. The code says WHAT HAPPENED; the content decides who
// says what.
// Riff coaches his own steps: an event with lines of its own for the coach
// ('beat.take.clean.riff') is his; anything else is Tango's, as before.
function bsmashEvent(name, vars) {
    const coach = bsmash && bsmash.mode === 'steps' && bsmash.musician && bsmash.musician.coach;
    const own = coach && coach !== 'tango' && name + '.' + coach;
    const lines = (KR.dialogue && KR.dialogue.lines) || [];
    KR.event(own && lines.some(line => line.on === own) ? own : name, vars);
}

function bsmashPadCount() {
    if (!bsmash || bsmash.mode === 'jam') return 4;
    const mode = bsmashLoad().settings.padMode;
    if (mode === 'four') return 4;
    if (mode === 'one') return 1;
    return bsmash.step === 1 ? 4 : 1;
}

function bsmashSoundKind() {
    const settings = bsmashLoad().settings;
    const musician = (bsmash && bsmash.mode === 'steps' && bsmash.musician) || BSMASH_MUSICIANS[0];
    const kind = settings.sound[musician.id];
    return musician.sounds.indexOf(kind) !== -1 ? kind : musician.sounds[0];
}

function bsmashStarsShown(count) {
    const stars = bsmashEl('beat-stars');
    stars.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const star = bsmashMake('span', 'bsmash-star', stars);
        star.textContent = KR.t(i < count ? 'beat.star.full' : 'beat.star.empty');
        if (i < count) star.classList.add('full');
    }
}

function bsmashHeader() {
    const jam = bsmash.mode === 'jam';
    const stars = bsmashEl('beat-stars');
    const label = bsmashEl('beat-step-label');
    stars.hidden = jam || bsmash.step === 3;
    label.hidden = jam;
    if (!jam) {
        label.textContent = KR.t('beat.step.' + bsmash.step);
        bsmashStarsShown(bsmash.streak);
        bsmashRenderPictureChoice();
    }
}

function bsmashRenderDesk(id) {
    const desk = bsmashEl(id);
    if (!desk) return;
    desk.innerHTML = '';
    const progress = bsmashLoad();
    ['drums', 'bass', 'keys'].forEach(instrument => {
        const record = progress.musicians[instrument];
        const channel = bsmashMake('div', 'bsmash-channel', desk);
        channel.classList.toggle('lit', !!record.won);
        if (record.won) channel.classList.add('style-' + record.part);
        const name = bsmashMake('span', 'bsmash-channel-name', channel);
        name.textContent = KR.t('beat.channel.' + instrument);
        const style = bsmashMake('span', 'bsmash-channel-style', channel);
        style.textContent = record.won ? KR.t('beat.style.' + record.part) : '';
    });
}

// The picture is the student's choice, after their first star, and can be
// switched at any time (§12).
// "Need a hand?": one button, which opens the picture styles. Help, not a
// way of playing (the outside reviews, 2026-10-01, and Rob).
function bsmashRenderPictureChoice() {
    const row = bsmashEl('beat-picture-choice');
    const progress = bsmashLoad();
    // Never on the big take: it is read from notation only.
    row.hidden = !progress.firstStar || !bsmash || bsmash.mode !== 'steps' || bsmash.step === 3;
    row.innerHTML = '';
    const hand = bsmashMake('button', 'bsmash-chip bsmash-help', row); // text-ok: class names
    hand.type = 'button';
    hand.textContent = KR.t('beat.help.button');
    hand.classList.toggle('on', !!(bsmash && bsmash.helpOpen));
    hand.onclick = () => { bsmash.helpOpen = !bsmash.helpOpen; bsmashRenderPictureChoice(); };
    if (!bsmash || !bsmash.helpOpen) return;
    ['mix'].concat(BSMASH_PICTURES).forEach(kind => {
        const chip = bsmashMake('button', 'bsmash-chip', row);
        chip.type = 'button';
        chip.textContent = KR.t('beat.picture.' + kind);
        chip.classList.toggle('on', (progress.settings.pictureHelp || 'mix') === kind);
        chip.onclick = () => chooseBeatPicture(kind);
    });
}

function chooseBeatPicture(kind) {
    const progress = bsmashLoad();
    progress.settings.pictureHelp = kind;
    bsmashSave(progress);
    bsmashRenderPictureChoice();
    if (bsmash && bsmash.layout) {
        bsmash.layout.forEach((entry, i) => {
            entry.picture.querySelectorAll('.bsmash-block').forEach(b => b.remove());
            bsmashDrawPicture(i);
        });
    }
    bsmashRenderPathwaySettings();
}

/* ---------- The frame: lights follow the sound ----------
   Read every animation frame against the audio clock. The recording light
   pulses on every beat, strongest on beat 1 (§6); the pads glow in turn
   with the pulse - they show WHERE the beat is, not whether to play. There
   is NO cursor on the notation: the student keeps their own place. A cursor
   may move along the picture. */
function bsmashFrame() {
    if (!bsmash) return;
    bsmash.frame = requestAnimationFrame(bsmashFrame);
    if (!bsmashBand || !raudioCtx) return;
    const heard = bsmashHeardNow();
    if (heard >= bsmashBand.start) {
        const beat = Math.floor((heard - bsmashBand.start) / BSMASH_BEAT + 1e-6);
        if (beat !== bsmash.lastBeat) {
            bsmash.lastBeat = beat;
            bsmashOnBeat(beat);
        }
    }
    if (bsmash.take && !bsmash.take.done) bsmashTakeFrame();
}

function bsmashOnBeat(beat) {
    const inBar = ((beat % 4) + 4) % 4;
    const bar = Math.floor(beat / 4);
    const take = bsmash.take;
    const light = bsmashEl('beat-rec');
    let comeback = false;
    if (take && !take.done) {
        const takeBar = Math.floor((beat - take.firstBeat) / 4);
        comeback = inBar === 0 && take.comebackBars.has(takeBar);
        bsmash.layout.forEach((entry, i) => entry.mark.classList.toggle('strong', comeback && i === takeBar));
    }
    light.classList.remove('pulse', 'one', 'comeback');
    void light.offsetWidth;
    light.classList.add('pulse');
    if (inBar === 0) light.classList.add('one');
    if (comeback) light.classList.add('comeback');

    if (bsmash.mode === 'jam') return bsmashJamBeat(beat, bar, inBar);
    if (!take || take.done) return;
    const takeBeat = beat - take.firstBeat;
    if (takeBeat >= -4 && takeBeat < take.bars * 4) {
        bsmash.pads.glow(bsmash.pads.count === 1 ? 0 : inBar, inBar === 0 ? 'beat-one' : 'beat');
    }
    // The second star: the picture shows during the count-in, and the
    // notation replaces it before beat 1 (§3).
    if (take.flashPicture && takeBeat === -2) bsmashShow('notation', 0.3);
    if (take.go === 'picture') bsmashPictureCursor(takeBeat >= 0 && takeBeat < take.bars * 4 ? takeBeat : null);
    if (takeBeat === -4) bsmash.phase = 'countin';
    if (takeBeat === 0) { bsmash.phase = 'take'; bsmashEl('beat-rec').classList.add('recording'); }
}

/* =========================================
   THE FIRST MINUTE (§11): JAM WITH TANGO'S BEAT
   =========================================
   Tango is warming up: her groove is already playing. She hits the four
   pads in turn, boom boom boom boom, and says one thing: "Copy me!" Nothing
   to read, and nothing can fail - a tap off the beat still sounds, it just
   doesn't light.

   THEN IT'S THEIRS FOR AS LONG AS THEY LIKE. Rob, playing the first version,
   which turned the pads into notes after four taps: "I think I've been robbed
   of the fun of maintaining that beat and wanting everything around me to
   maintain that beat for as long as they're happy to maintain it." So a
   meter fills with every tap on the beat (and slips back one for a tap off
   it), the band builds with it - the bass joins, then the keys - and when it
   is full (about 15 seconds of steady beat) "Show me what I played" appears.
   The jam carries on until they press it. Notation arrives when the
   experience is ready to move on, not before.

   THE JAM IS ALSO THE BEAT TEST (§14, and Rob's "handicap"). Every tap is a
   tap to a known beat, so it measures the device's delay, and it measures
   the student: which way they lean, how steady they are, how many taps land.
   Those numbers are kept per player (bsmashRecordBeatTest). */
function startBeatJam() {
    bsmashStopAll();
    bsmash = {
        mode: 'jam',
        musician: BSMASH_MUSICIANS[0],
        delay: bsmashDelay(),
        lastBeat: null,
        jam: { offsets: [], meter: 0, inARow: 0, lastHitBeat: null, demoBars: new Set(),
               lastDemoBar: 0, layers: 0, full: false, morphed: false,
               layerList: bsmashJamLayers(), missesInRow: 0, sag: 0,
               taps: 0, lastTap: 0, stopped: false,
               song: bsmashJamSong(), variations: null, variation: 0,
               rounds: 0, cycleTaps: {},
               follow: null, greenRun: 0, praiseAt: BSMASH_GREEN_PRAISE_AT, sawGreen: false, lastCoach: -Infinity, lastTapRaw: null, gaps: [] },
    };
    bsmashOpenStudio();
    bsmashEl('beat-screen-studio').classList.add('jam');
    bsmashHeader();
    bsmashEl('beat-reading').innerHTML = '';
    bsmashEl('beat-actions').hidden = true;
    bsmashEl('beat-jam-next').hidden = true;
    bsmashEl('beat-jam-nav').hidden = true;
    bsmashEl('beat-jam-coming').hidden = true;
    bsmashEl('beat-light').hidden = false;
    bsmashEl('beat-light').dataset.state = 'idle';
    bsmashDiceHide();
    bsmashBandStart({ drums: 'warmup' });
    bsmash.jam.variations = bsmashJamVariations();
    bsmash.jam.layerList.forEach(layer => bsmashLoadLoop(bsmashPartLoopId(layer.instrument, layer.style)));
    bsmash.jam.variations.forEach(v => Object.keys(v.parts).forEach(instrument =>
        bsmashLoadLoop(bsmashPartLoopId(instrument, v.parts[instrument]))));
    bsmashBandLevel(BSMASH_JAM_BAND);
    bsmashJamMeter();
    bsmashJamDemo(1);
    bsmashEvent('beat.jam.start');
}

// The jam song's id, if the student (or Rob) chose one of Rob's songs.
function bsmashJamSong() {
    const song = bsmashLoad().settings.jamSong;
    const songs = (window.KR && KR.songs) || {};
    return songs[song] ? song : null;
}

// The layers the band builds with: the fixed loops, or one of Rob's songs.
function bsmashJamLayers() {
    const song = bsmashJamSong();
    if (!song) return BSMASH_JAM_LAYERS;
    return BSMASH_JAM_SONG_LAYERS.map(layer =>
        Object.assign({}, layer, { style: layer.style.replace('{song}', song) }));
}

// The variations, as parts the band can play: { parts: {instrument: style
// or null for 'off'}, say }. A song's own list if it has one.
function bsmashJamVariations() {
    const song = bsmash.jam.song;
    let list = BSMASH_JAM_VARIATIONS;
    if (song) {
        try { list = BeatSmashBand.song(song).jam || BSMASH_JAM_SONG_VARIATIONS; }
        catch (e) { list = BSMASH_JAM_SONG_VARIATIONS; }
    }
    return list.map(line => {
        const parts = {};
        ['drums', 'bass', 'keys'].forEach(instrument => {
            if (!(instrument in line)) return;
            const direction = line[instrument];
            if (direction === 'off') parts[instrument] = null;
            else if (song && instrument !== 'drums') parts[instrument] = 'song:' + song + ':' + direction;
            else parts[instrument] = direction;
        });
        return { parts: parts, say: line.say || null };
    });
}

// Once the groove is going: each time round the loop, at the top of its last
// bar, did the student hold the beat? Four of those and the drums fill in
// that bar, and the band turns a corner at the top of the next time round.
// Only the times round with the beat held count, and nothing is lost by a
// wobble: the dots stay where they were.
function bsmashJamRound(bar) {
    const jam = bsmash.jam;
    if (!jam.full) return;
    const round = Math.floor(bar / 4);
    const steady = !jam.stopped && jam.sag === 0 && (jam.cycleTaps[round] || 0) >= BSMASH_JAM_STEADY_TAPS;
    delete jam.cycleTaps[round - 1];
    if (!steady) return;
    jam.rounds++;
    if (jam.rounds >= BSMASH_JAM_VARIATION_EVERY) {
        jam.rounds = 0;
        bsmashJamVariation(bsmashBand.start + bar * BSMASH_BAR);
    }
    bsmashJamComing();
}

// The fill in the bar starting at barStart, and the next variation at the
// top of the bar after it.
function bsmashJamVariation(barStart) {
    const jam = bsmash.jam;
    const variation = jam.variations[jam.variation % jam.variations.length];
    jam.variation++;
    const at = barStart + BSMASH_BAR;
    const fill = BeatSmashBand.fill(raudioCtx, bsmashLiveBus, barStart);
    bsmashBand.sources.drums = (bsmashBand.sources.drums || []).concat([{ src: null, gain: fill }]);
    bsmashBand.pending = {
        at: at,
        apply: () => {
            Object.keys(variation.parts).forEach(instrument => {
                const style = variation.parts[instrument];
                if (style === null) delete bsmashBand.parts[instrument];
                else bsmashBand.parts[instrument] = style;
            });
            bsmashEl('beat-jam-coming').classList.add('turned');
            bsmashLater(() => bsmashEl('beat-jam-coming').classList.remove('turned'), 1200);
        },
    };
    bsmashEvent('beat.jam.variation');
    if (variation.say) bsmashLater(() => bsmashEvent(variation.say), Math.max(0, (at - bsmashNow()) * 1000));
}

// The dots under the meter: how close the next change of the band is.
function bsmashJamComing() {
    const jam = bsmash.jam;
    const box = bsmashEl('beat-jam-coming');
    box.hidden = !jam.full;
    [...box.children].forEach((dot, i) => dot.classList.toggle('lit', i < jam.rounds));
}

// Tango hits the four pads, one per beat, for one bar.
function bsmashJamDemo(bar) {
    const jam = bsmash.jam;
    jam.demoBars.add(bar);
    jam.lastDemoBar = bar;
    for (let i = 0; i < 4; i++) {
        const when = bsmashBand.start + bar * BSMASH_BAR + i * BSMASH_BEAT;
        bsmashAt(when, t => BeatSmashBand.pad(raudioCtx, bsmashPadBus, t, 'kick'), 'jam');
    }
}

function bsmashJamBeat(beat, bar, inBar) {
    const jam = bsmash.jam;
    if (jam.stopped || jam.morphed) return;
    // The student has stopped playing: so does the band.
    if (jam.taps && bsmashNow() - jam.lastTap > BSMASH_JAM_IDLE_BARS * BSMASH_BAR) return bsmashJamStop();
    if (inBar === 0 && ((bar % 4) + 4) % 4 === 3) bsmashJamRound(bar);
    const following = jam.follow && beat >= jam.follow.fromBeat;
    if (jam.demoBars.has(bar) || following) bsmash.pads.flash(inBar, 'demo', 320);
    else bsmash.pads.glow(inBar, inBar === 0 ? 'beat-one' : 'beat');
    bsmashJamCount(following ? inBar + 1 : null);
    // Tango's count is booked a beat ahead, so it lands ON the beat.
    if (jam.follow && beat + 1 >= jam.follow.fromBeat) {
        const next = beat + 1, n = ((next % 4) + 4) % 4;
        bsmashAt(bsmashBand.start + next * BSMASH_BEAT, t => raudioSyllable(t, String(n + 1), n === 0, n), 'jam');
    }
    // If the taps haven't settled, Tango counts them in.
    if (!jam.full && !jam.follow && inBar === 0 && bar - jam.lastDemoBar >= BSMASH_JAM_DEMO_EVERY_BARS && jam.inARow < 2) {
        jam.lastDemoBar = bar;
        bsmashJamFollow(bar + 1, true);
    }
}

// Tango starts counting from the top of bar `bar`: "Follow me! 1, 2, 3, 4."
function bsmashJamFollow(bar, say) {
    const jam = bsmash.jam;
    if (jam.follow) return;
    jam.follow = { fromBeat: bar * 4 };
    if (say) bsmashEvent('beat.jam.follow');
}

// Order restored: the counting stops and Tango says so.
function bsmashJamRestored() {
    const jam = bsmash.jam;
    jam.follow = null;
    bsmashCancel('jam');
    bsmashJamCount(null);
    jam.lastCoach = bsmashNow();
    bsmashEvent('beat.jam.restored');
}

// The number Tango is counting, in the middle of the beat light.
function bsmashJamCount(n) {
    const light = bsmashEl('beat-light');
    light.classList.toggle('counting', n !== null);
    light.querySelector('.bsmash-light-count').textContent = n === null ? '' : String(n);
}

function bsmashMedian(list) {
    const sorted = list.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// The delay from a set of taps to known beats: the median, then the mean of
// the taps near it, so a stray tap or two can't drag it (outliers out, §14).
function bsmashMeasureDelay(offsets) {
    const median = bsmashMedian(offsets);
    const near = offsets.filter(o => Math.abs(o - median) <= 0.08);
    const mean = near.reduce((a, b) => a + b, 0) / near.length;
    return Math.min(BSMASH_DELAY_MAX, Math.max(BSMASH_DELAY_MIN, mean));
}

function bsmashJamPress(p) {
    const jam = bsmash.jam;
    if (!bsmashBand || jam.morphed) return;
    jam.taps++;
    jam.lastTap = bsmashNow();
    if (jam.stopped) bsmashJamResume();
    // Each tap is placed against the beat nearest it by the delay this device
    // had BEFORE the jam - a fixed reference. Placing it by the running
    // estimate instead let a few early wild taps drag the estimate half a
    // beat off, after which every good tap was placed on the wrong beat and
    // could never pull it back.
    const beat = Math.round((p.raw - bsmash.delay - bsmashBand.start) / BSMASH_BEAT);
    const offset = p.raw - (bsmashBand.start + beat * BSMASH_BEAT);
    jam.offsets.push(offset);
    const estimate = jam.offsets.length >= 3
        ? Math.min(BSMASH_DELAY_MAX, Math.max(BSMASH_DELAY_MIN, bsmashMedian(jam.offsets.slice(-8))))
        : bsmash.delay;
    // On the beat means steady against the student's OWN lean: the device's
    // delay and a habit of playing a touch early are not the student's fault.
    const onBeat = Math.abs(offset - estimate) <= BSMASH_JAM_WINDOW_MS / 1000 && beat !== jam.lastHitBeat;
    const state = bsmashJamLight(offset - estimate, onBeat);
    // Tango coaches first: "you're rushing" says more than "find the beat".
    const coached = bsmashJamCoach(p.raw, offset - estimate, state);
    if (onBeat) {
        jam.inARow++;
        jam.missesInRow = 0;
        jam.lastHitBeat = beat;
        const round = Math.floor(beat / 16);
        jam.cycleTaps[round] = (jam.cycleTaps[round] || 0) + 1;
        jam.meter = Math.min(BSMASH_JAM_GOAL, jam.meter + 1);
        bsmash.pads.flash(p.pad, 'hit', 420);
        // Back on the beat: the band gets its power back, a step at a time.
        if (jam.sag > 0) { jam.sag = Math.max(0, jam.sag - 0.4); bsmashBandSag(jam.sag, 0.8); }
        if (jam.follow && jam.inARow >= BSMASH_FOLLOW_RESTORED) bsmashJamRestored();
    } else {
        jam.inARow = 0;
        jam.missesInRow++;
        jam.meter = Math.max(0, jam.meter - 1);
        // Losing the beat: the band sinks with it (bsmashBandSag).
        if (jam.missesInRow >= BSMASH_SAG_AFTER) {
            // Not on top of something she has only just said.
            const quiet = bsmashNow() - jam.lastCoach >= BSMASH_COACH_EVERY_BARS * BSMASH_BAR;
            if (jam.sag === 0) {
                // Lost: Tango counts them back in, from the next bar.
                const bar = Math.floor((bsmashNow() - bsmashBand.start) / BSMASH_BAR) + 1;
                bsmashJamFollow(bar, !coached && quiet);
                if (!coached && quiet) jam.lastCoach = bsmashNow();
            }
            jam.sag = Math.min(1, (jam.missesInRow - BSMASH_SAG_AFTER + 1) / 3);
            bsmashBandSag(jam.sag, 1.2);
        }
    }
    bsmashJamMeter();
}

// The beat light for one tap. d: seconds from the student's own beat, minus
// early. Returns the state: 'on', 'early', 'late', 'way-early', 'way-late'.
function bsmashJamLight(d, onBeat) {
    const jam = bsmash.jam;
    const green = BSMASH_LIGHT_GREEN_MS[bsmashAge()] / 1000;
    const window = BSMASH_JAM_WINDOW_MS / 1000;
    let state, miss = 0;
    if (onBeat && Math.abs(d) <= green) state = 'on';
    else {
        state = (onBeat ? '' : 'way-') + (d < 0 ? 'early' : 'late');
        // How far off centre the fill lands, as a share of the light's width:
        // a third at the edge of green, nearly all the way out at the edge of
        // the window and beyond.
        const past = Math.min(1, Math.max(0, (Math.abs(d) - green) / (window - green)));
        miss = Math.sign(d || 1) * (0.32 + 0.52 * past);
    }
    jam.greenRun = state === 'on' ? jam.greenRun + 1 : 0;
    const light = bsmashEl('beat-light');
    light.dataset.state = state;
    light.style.setProperty('--miss', (miss * 100).toFixed(1) + '%');
    light.style.setProperty('--run', Math.min(1, jam.greenRun / BSMASH_GREEN_PRAISE_AT).toFixed(2));
    light.classList.remove('hit');
    void light.offsetWidth;
    light.classList.add('hit');
    const taps = jam.taps;
    bsmashLater(() => { if (bsmash && bsmash.jam === jam && jam.taps === taps) light.dataset.state = 'idle'; },
        BSMASH_LIGHT_IDLE_MS);
    return state;
}

// Tango coaches the time: what the light means, the first time it goes
// green; rushing and dragging; and a word when the green has been held.
// Returns true if she said something.
function bsmashJamCoach(raw, d, state) {
    const jam = bsmash.jam;
    const gap = jam.lastTapRaw === null ? null : raw - jam.lastTapRaw;
    jam.lastTapRaw = raw;
    // Only gaps of about one beat say anything about the tempo; a pause or a
    // double tap starts the count again.
    if (gap !== null && gap > BSMASH_BEAT * 0.6 && gap < BSMASH_BEAT * 1.5) jam.gaps = jam.gaps.concat([gap]).slice(-4);
    else jam.gaps = [];
    const now = bsmashNow();
    const say = (event) => { jam.lastCoach = now; jam.gaps = []; bsmashEvent(event); return true; };
    if (state !== 'on') jam.praiseAt = BSMASH_GREEN_PRAISE_AT;
    if (now - jam.lastCoach < BSMASH_COACH_EVERY_BARS * BSMASH_BAR) return false;
    if (state === 'on' && !jam.sawGreen) { jam.sawGreen = true; return say('beat.jam.green'); }
    if (jam.gaps.length === 4) {
        const mean = jam.gaps.reduce((a, b) => a + b, 0) / 4;
        // The tempo AND this tap agree, so a wobble isn't called a rush.
        if (mean < BSMASH_BEAT * (1 - BSMASH_TEMPO_SLACK) && d < 0 && state !== 'on') return say('beat.jam.rushing');
        if (mean > BSMASH_BEAT * (1 + BSMASH_TEMPO_SLACK) && d > 0 && state !== 'on') return say('beat.jam.dragging');
    }
    if (jam.greenRun >= jam.praiseAt) {
        jam.praiseAt = jam.greenRun + BSMASH_GREEN_PRAISE_EVERY;
        return say('beat.jam.locked');
    }
    return false;
}

// Nobody tapping for two bars: the band powers down and stops, and the way
// on is right there. Rob: "When the game comes to a stop because the player
// has stopped engaging with the buttons, make sure they have navigation
// buttons easily available." The band's clock keeps running underneath, so
// a tap brings it straight back, in time.
function bsmashJamStop() {
    const jam = bsmash.jam;
    // Stopped while it was falling apart: everyone struggles at first.
    const struggling = !!jam.follow || jam.sag > 0;
    jam.stopped = true;
    jam.follow = null;
    bsmashCancel('jam');
    bsmashJamCount(null);
    bsmashBandSag(1, 1.5);
    bsmashBandLevel(0.0001, 2.4);
    bsmashEl('beat-jam-nav').hidden = false;
    bsmashEvent(struggling ? 'beat.jam.struggled' : 'beat.jam.stopped');
}

function bsmashJamResume() {
    const jam = bsmash.jam;
    jam.stopped = false;
    jam.sag = 0;
    bsmashBandSag(0, 0.3);
    bsmashEl('beat-jam-nav').hidden = true;
    bsmashJamMeter();
}

// "Keep jamming": the band comes back before the first tap.
function keepBeatJamming() {
    if (!bsmash || bsmash.mode !== 'jam' || !bsmash.jam.stopped) return;
    bsmash.jam.lastTap = bsmashNow();
    bsmashJamResume();
}

// The meter, and the band building with it.
function bsmashJamMeter() {
    const jam = bsmash.jam;
    const level = jam.meter / BSMASH_JAM_GOAL;
    bsmashEl('beat-jam-fill').style.width = Math.round(level * 100) + '%';
    bsmashEl('beat-pads').style.setProperty('--hype', level.toFixed(2));
    bsmashBandLevel(BSMASH_JAM_BAND + (BSMASH_BAND_FULL - BSMASH_JAM_BAND) * level, 0.6);
    const layers = jam.layerList;
    while (jam.layers < layers.length && level >= layers[jam.layers].at) {
        const layer = layers[jam.layers++];
        const joining = !(bsmashBand.parts && layer.instrument in bsmashBand.parts);
        bsmashBandSetPart(layer.instrument, layer.style);
        if (joining) bsmashEvent('beat.jam.layer.' + layer.instrument);
    }
    if (!jam.full && jam.meter >= BSMASH_JAM_GOAL) {
        jam.full = true;
        bsmashEl('beat-jam-next').hidden = false;
        bsmashJamComing();
        bsmashEvent('beat.jam.full');
    }
}

/* ---------- The beat test ----------
   Rob: "If you can get somebody for 15 seconds to tap this... we can see
   where this all sits on a chart. Then we can allow for their overall
   handicap." Kept per player, the last few, so the change over weeks shows:
     lean    ms  - the average tap against the beat, delay included:
                   the device's share and the student's own habit together
     steady  ms  - how far a typical tap strays from that average (the spread)
     onBeat  %   - taps within the jam's window of the student's own lean
   The lean and the spread are taken from the on-beat taps only.
   Recorded, not yet used to grade: see CLAUDE.md "The beat test". */
function bsmashBeatTestResult(offsets) {
    // The lean and the steadiness are measured on the taps that were on the
    // beat; the ones that weren't show up in onBeat instead of blurring both.
    const median = bsmashMedian(offsets);
    const kept = offsets.filter(o => Math.abs(o - median) <= BSMASH_JAM_WINDOW_MS / 1000);
    const mean = kept.reduce((a, b) => a + b, 0) / kept.length;
    const sd = Math.sqrt(kept.reduce((a, b) => a + (b - mean) * (b - mean), 0) / kept.length);
    const on = kept.length;
    return {
        at: Date.now(),
        taps: offsets.length,
        leanMs: Math.round(mean * 1000),
        steadyMs: Math.round(sd * 1000),
        onBeat: Math.round(100 * on / offsets.length),
        delayMs: Math.round(bsmashMeasureDelay(offsets) * 1000),
    };
}

function bsmashRecordBeatTest(result) {
    const progress = bsmashLoad();
    progress.beatTests = (progress.beatTests || []).concat([result]).slice(-BSMASH_BEAT_TESTS_KEPT);
    bsmashSave(progress);
}

// "Show me what I played": the jam's taps become the beat test and the
// delay, and the pads they just played turn into the notes they just played.
function showBeatJamNotes() {
    if (!bsmash || bsmash.mode !== 'jam' || !bsmash.jam.full || bsmash.jam.morphed) return;
    bsmashJamMorph();
}

function bsmashJamMorph() {
    const jam = bsmash.jam;
    jam.morphed = true;
    bsmashEl('beat-jam-next').hidden = true;
    bsmash.delay = bsmashMeasureDelay(jam.offsets);
    bsmashSaveDelay(bsmash.delay);
    bsmashRecordBeatTest(bsmashBeatTestResult(jam.offsets));
    jam.follow = null;
    bsmashCancel('jam');
    bsmashJamCount(null);
    // The band steps back to Tango alone: the rest of it is still to be won.
    bsmashBand.pending = null;
    ['bass', 'keys'].forEach(bsmashBandRemovePart);
    if (bsmashBand.parts.drums !== 'warmup') bsmashBandSetPart('drums', 'warmup');
    bsmashEl('beat-jam-coming').hidden = true;
    bsmashEl('beat-light').hidden = true;
    bsmashEl('beat-jam-nav').hidden = true;
    bsmashBandLevel(BSMASH_JAM_BAND);
    bsmash.bars = [bsmashParseBar('q q q q')]; // text-ok: a bar, not words
    bsmash.specs = bsmash.bars.map(bsmashSpecs);
    bsmashRenderReading();
    bsmash.layout[0].blocks.forEach(block => {
        block.classList.add('lit');
        [...block.children].forEach(cell => cell.classList.add('filled'));
    });
    bsmashShow('picture');
    bsmash.pads.elements.forEach((pad, i) => bsmash.pads.flash(i, 'hit', 900));
    bsmashLater(() => bsmashShow('notation', 2), 700);
    bsmashEvent('beat.jam.morph');
    if (bsmash.delay > BSMASH_DELAY_BLUETOOTH) bsmashLater(() => bsmashEvent('beat.delay.bluetooth'), 3200);
    const progress = bsmashLoad();
    progress.jamDone = true;
    bsmashSave(progress);
    bsmashLater(() => {
        if (progress.musicians.drums.won) showBeatPathway();
        else startBeatMusician('drums', true);
    }, bsmash.delay > BSMASH_DELAY_BLUETOOTH ? 8000 : 4500);
}

/* =========================================
   WINNING A MUSICIAN: the three steps (§3)
   ========================================= */
// step: which step to play. Leave it out to carry on from where the student
// is; name an earlier one to go back and play it again (Rob: "I'm locked out
// of being able to replay the previous level").
function startBeatMusician(id, keepBand, step) {
    const musician = BSMASH_MUSICIANS.find(m => m.id === id);
    if (!musician || !musician.built) return;
    const record = bsmashUpdateMusician(id, { plays: bsmashMusicianRecord(id).plays + 1 });
    if (!keepBand) bsmashStopAll();
    const pads = bsmash && bsmash.pads;
    const frame = bsmash && bsmash.frame;
    bsmashStopTimers();
    const playing = step || record.step;
    bsmash = {
        mode: 'steps', musician: musician, step: playing,
        streak: bsmashOnRecord(record, playing) ? record.streak : 0,
        delay: bsmashDelay(), lastBeat: null, pads: pads, frame: frame, take: null, bars: null,
    };
    bsmashOpenStudio();
    bsmashEl('beat-screen-studio').classList.remove('jam');
    bsmashEl('beat-jam-next').hidden = true;
    bsmashEl('beat-jam-nav').hidden = true;
    bsmashEl('beat-jam-coming').hidden = true;
    bsmashEl('beat-light').hidden = true;
    bsmashBandStart(bsmashBandSoFar(id));
    bsmashBandLevel(BSMASH_BAND_QUIET);
    bsmashNewRoll();
    if (record.plays === 1) bsmashEvent('beat.musician.intro.' + id);
}

// The band under a musician's takes: every part won so far, and Tango's
// warm-up until the drums are won. Not the musician being won: that part
// is still to be earned.
function bsmashBandSoFar(playing) {
    const progress = bsmashLoad();
    const parts = { drums: progress.musicians.drums.won ? progress.musicians.drums.part : 'warmup' };
    ['bass', 'keys'].forEach(id => {
        if (id !== playing && progress.musicians[id].won) parts[id] = progress.musicians[id].part;
    });
    return parts;
}

// Is this step the one the student is working on? Only then do its stars
// count towards the saved row. Going back to an earlier step is practice:
// its stars show and fill as usual, but nothing already won is touched.
function bsmashOnRecord(record, step) {
    return !record.won && step === record.step;
}

// The adaptive window (§14): generous at first, tightening as the student
// succeeds, never tighter than the age's own window.
function bsmashWindow() {
    const clean = bsmashMusicianRecord(bsmash.musician.id).clean;
    const extra = Math.max(0, BSMASH_WINDOW_START_EXTRA_MS - BSMASH_WINDOW_TIGHTEN_MS * clean);
    return (BSMASH_WINDOW_MS[bsmashAge()] + extra) / 1000;
}

function bsmashNewRoll() {
    const record = bsmashMusicianRecord(bsmash.musician.id);
    bsmash.scaffold = bsmash.step === 3 ? 'big' : ['star1', 'star2', 'star3'][bsmash.streak];
    bsmash.bars = bsmashRoll(bsmash.musician, bsmash.step, record.clean, bsmash.bars);
    bsmash.specs = bsmash.bars.map(bsmashSpecs);
    bsmashMixPicture();
    bsmash.take = null;
    bsmash.phase = 'roll';
    bsmash.pads.setCount(bsmashPadCount());
    bsmashHeader();
    bsmashEl('beat-actions').hidden = true;
    bsmashEl('beat-reading').innerHTML = '';
    bsmashDiceRoll(bsmash.bars);
    bsmashLater(() => {
        bsmashRenderReading();
        bsmashShow(bsmash.scaffold === 'star1' || bsmash.scaffold === 'star2' ? 'picture' : 'notation');
        bsmashLater(() => {
            bsmashDiceHide();
            if (bsmash.scaffold === 'big') return bsmashBigReady(true);
            bsmashScheduleTake(bsmash.scaffold === 'star1' ? 'picture' : 'notation');
        }, 500);
    }, 1000);
}

// The big take waits for the student: read it, then Record. A new roll
// whenever they like (§3).
function bsmashBigReady(fresh) {
    bsmash.phase = 'ready';
    bsmashEl('beat-actions').hidden = false;
    bsmashBandLevel(BSMASH_BAND_QUIET);
    // The part picker is one good take away: fetch its three loops now, so
    // tapping a picture plays at once instead of waiting for a download.
    BSMASH_STYLES.forEach(style => bsmashLoadLoop(bsmashLoopId(bsmash.musician.id, style)));
    if (fresh) bsmashEvent('beat.big.ready');
}

function recordBeatTake() {
    if (!bsmash || bsmash.phase !== 'ready') return;
    bsmashEl('beat-actions').hidden = true;
    bsmashRenderReading();
    bsmashShow('notation');
    bsmashScheduleTake('notation');
}

function rerollBeatTake() {
    if (!bsmash || bsmash.phase !== 'ready') return;
    bsmashNewRoll();
}

/* ---------- A take (§4) ----------
   It starts on a barline of the song, so it is locked to the band: one bar
   of count-in (Tango's count; beat 1 is home base), then the bars. Every
   note's time is known on the audio clock before it sounds; a press is
   judged against it with the device's delay taken off. */
function bsmashScheduleTake(go) {
    const countIn = bsmashNextBar(0.35);
    const start = countIn + BSMASH_BAR;
    const bars = bsmash.specs.length;
    const take = {
        go: go,
        flashPicture: bsmash.scaffold === 'star2' && go === 'notation',
        start: start,
        end: start + bars * BSMASH_BAR,
        bars: bars,
        firstBeat: Math.round((start - bsmashBand.start) / BSMASH_BEAT),
        win: bsmashWindow(),
        notes: [],
        rests: [],
        extra: 0,
        comebackBars: new Set(),
        mustHit: new Set(),
        cameBack: false,
        lostBar: false,
        done: false,
    };
    bsmash.specs.forEach((specs, bar) => specs.forEach((spec, index) => {
        const t = start + (bar * 4 + spec.slot) * BSMASH_BEAT;
        const item = { t: t, end: t + spec.slots * BSMASH_BEAT, bar: bar, index: index, spec: spec };
        (spec.isRest ? take.rests : take.notes).push(item);
    }));
    bsmashCancel('take');
    for (let beat = -4; beat < bars * 4; beat++) {
        const inBar = ((beat % 4) + 4) % 4;
        const takeBar = Math.floor(beat / 4);
        bsmashAt(start + beat * BSMASH_BEAT,
            t => bsmashClick(t, inBar, inBar === 0 && take.comebackBars.has(takeBar)), 'take');
    }
    bsmash.take = take;
    bsmash.phase = 'wait';
    bsmashBandLevel(BSMASH_BAND_QUIET);
    bsmashEl('beat-reading').classList.remove('clean');
}

function bsmashPress(p) {
    if (!bsmash) return;
    bsmashPadSound(p, bsmashSoundKind());
    if (bsmash.mode === 'jam') return bsmashJamPress(p);
    const take = bsmash.take;
    if (!take || take.done) return;
    const t = p.time;
    // Taps in the count-in, or after the last note, are free.
    if (t < take.start - take.win || t > take.end + take.win) return;
    let best = null;
    take.notes.forEach(note => {
        if (note.hit || note.missed || Math.abs(t - note.t) > take.win) return;
        if (!best || Math.abs(t - note.t) < Math.abs(t - best.t)) best = note;
    });
    if (best) {
        best.hit = true;
        best.press = p;
        p.note = best;
        if (take.mustHit.has(best)) take.cameBack = true;
        const block = bsmash.layout[best.bar] && bsmash.layout[best.bar].blocks[best.index];
        if (block && take.go === 'picture') {
            block.classList.add('lit');
            block.children[0].classList.add('filled');
        }
        return;
    }
    // Not a note: a tap in a rest, or a stray - too early, too late, or one
    // tap too many. Honest: it still sounded. Not clean.
    const rest = take.rests.find(r => t >= r.t && t < r.end);
    if (rest) {
        rest.tapped = true;
        const block = bsmash.layout[rest.bar] && bsmash.layout[rest.bar].blocks[rest.index];
        if (block) { block.classList.remove('shake'); void block.offsetWidth; block.classList.add('shake'); }
    }
    take.extra++;
    bsmashSlip(Math.floor((t - take.start) / BSMASH_BAR));
}

// A long note must be held to the middle of its last beat (§6). Lenient on
// touch, where a release is unreliable: to the start of its last beat.
function bsmashRelease(p) {
    if (!bsmash) return;
    bsmashPadRelease(p);
    const note = p.note;
    if (!note || note.spec.slots < 2) return;
    const need = note.t + (note.spec.slots - (p.touch ? 1 : 0.5)) * BSMASH_BEAT;
    if (p.up < need) note.short = true;
}

// After a slip in the big take, the student must be back in by the next
// beat 1 (§6). For that beat 1 only the light, the click and the mark get
// stronger, and Tango calls "Find one!". Losing a note is allowed; losing
// the bar isn't.
function bsmashSlip(bar) {
    const take = bsmash.take;
    if (!take || bsmash.scaffold !== 'big') return;
    const next = Math.max(0, bar) + 1;
    if (next >= take.bars || take.comebackBars.has(next)) return;
    take.comebackBars.add(next);
    const first = take.notes.find(n => n.bar >= next);
    if (first) take.mustHit.add(first);
    bsmashEvent('beat.take.findOne');
}

function bsmashTakeFrame() {
    const take = bsmash.take;
    const judged = bsmashNow() - bsmash.delay;
    // A long note fills beat by beat while it is held, so a note let go too
    // early is left only partly filled (§4.1). Picture goes only.
    if (take.go === 'picture') take.notes.forEach(note => {
        if (!note.hit || note.press.up !== null || note.spec.slots < 2) return;
        const block = bsmash.layout[note.bar] && bsmash.layout[note.bar].blocks[note.index];
        const beats = Math.min(note.spec.slots, Math.floor((judged - note.t) / BSMASH_BEAT) + 1);
        if (block) for (let k = 0; k < beats; k++) block.children[k].classList.add('filled');
    });
    take.notes.forEach(note => {
        if (note.hit || note.missed || judged <= note.t + take.win) return;
        note.missed = true;
        if (take.mustHit.has(note)) take.lostBar = true;
        bsmashSlip(note.bar);
    });
    if (judged > take.end + take.win + 0.05) {
        take.done = true;
        bsmashPictureCursor(null);
        bsmashEl('beat-rec').classList.remove('recording');
        bsmashVerdict();
    }
}

/* ---------- The verdict, in studio words (§4) ----------
   Never milliseconds, never "failed". Clean: the bar glows. Not clean: the
   notes that went wrong are marked under the staff. */
function bsmashVerdict() {
    const take = bsmash.take;
    bsmash.phase = 'verdict';
    const wrong = take.notes.filter(n => !n.hit || n.short);
    const restTaps = take.rests.filter(r => r.tapped);
    wrong.concat(restTaps).forEach(item => {
        bsmashMarkUnder(item.bar, item.spec.slot, item.spec.slots);
        const block = bsmash.layout[item.bar] && bsmash.layout[item.bar].blocks[item.index];
        if (block) block.classList.add('missed');
    });
    const clean = !wrong.length && !restTaps.length && !take.extra;
    if (bsmash.scaffold === 'big') {
        const hits = take.notes.length - wrong.length;
        const score = hits / Math.max(1, take.notes.length + take.extra);
        const passed = score >= BSMASH_PASS_MARK[bsmashAge()] && !take.lostBar;
        bsmash.lastScore = score;
        return passed ? bsmashBigPassed(take) : bsmashTakeTwo(true);
    }
    if (!clean) return bsmashTakeTwo(false);
    bsmashEl('beat-reading').classList.add('clean');
    bsmashBandLevel(BSMASH_BAND_FULL);
    // The first star's picture go: now the reveal, then the same bar from
    // the notation (§3, §4.1).
    if (bsmash.scaffold === 'star1' && take.go === 'picture') return bsmashReveal();
    bsmashEvent('beat.take.clean');
    if (bsmash.scaffold === 'retake') {
        bsmashLater(() => bsmashEvent('beat.retake.clean'), 1400);
        return bsmashLater(bsmashNewRoll, 2800);
    }
    bsmashStarLands();
}

function bsmashTakeTwo(big) {
    bsmashEvent(big ? 'beat.big.again' : 'beat.take.again');
    if (big) return bsmashLater(() => bsmashBigReady(false), 1600);
    // A miss empties the row of stars (§6). On the first star the stars were
    // already empty, so the same go simply runs again; after that it is
    // practice until it's clean, then a new roll starts again at the first star.
    if (bsmash.scaffold !== 'star1') {
        bsmash.streak = 0;
        if (bsmashOnRecord(bsmashMusicianRecord(bsmash.musician.id), bsmash.step)) {
            bsmashUpdateMusician(bsmash.musician.id, { streak: 0 });
        }
        bsmashHeader();
        bsmash.scaffold = 'retake';
    }
    const go = bsmash.take.go;
    bsmashLater(() => {
        bsmashRenderReading();
        bsmashShow(go === 'picture' ? 'picture' : 'notation');
        bsmashScheduleTake(go);
    }, 1800);
}

function bsmashReveal() {
    bsmash.phase = 'reveal';
    const progress = bsmashLoad();
    const seconds = progress.seenMorph ? BSMASH_MORPH_S : BSMASH_MORPH_FIRST_S;
    progress.seenMorph = true;
    bsmashSave(progress);
    bsmashEvent('beat.reveal');
    bsmashShow('notation', seconds);
    bsmashLater(() => {
        bsmashEl('beat-reading').classList.remove('clean');
        bsmashEl('beat-reading').querySelectorAll('.bsmash-block.lit').forEach(b => b.classList.remove('lit'));
        bsmashScheduleTake('notation');
    }, seconds * 1000 + 300);
}

function bsmashStarLands() {
    const id = bsmash.musician.id;
    const record = bsmashMusicianRecord(id);
    const clearedStep = bsmash.step;
    bsmash.streak++;
    const cleared = bsmash.streak >= 3;
    const changes = { clean: record.clean + 1 };
    if (bsmashOnRecord(record, clearedStep)) changes.streak = cleared ? 0 : bsmash.streak;
    // Clearing a step opens the next one - never closes one already open.
    if (cleared && !record.won && clearedStep + 1 > record.step) { changes.step = clearedStep + 1; changes.streak = 0; }
    bsmashUpdateMusician(id, changes);
    bsmashStarsShown(bsmash.streak);
    const stars = bsmashEl('beat-stars').querySelectorAll('.bsmash-star');
    if (stars[bsmash.streak - 1]) stars[bsmash.streak - 1].classList.add('pop');
    bsmashStarSound();
    const progress = bsmashLoad();
    const firstStar = !progress.firstStar;
    if (firstStar) {
        progress.firstStar = true;
        bsmashSave(progress);
    }
    if (cleared) {
        bsmashLater(() => bsmashEvent('beat.step.cleared.' + clearedStep), 1300);
        bsmash.step = clearedStep + 1;
        bsmash.streak = 0;
    }
    const next = () => {
        bsmashRenderPictureChoice();
        // The name and age are asked after the first win, never before (§11).
        const player = bsmashPlayer();
        if (firstStar && (!player || BSMASH_AGES.indexOf(player.age) === -1)) return showBeatPlayers(true);
        bsmashNewRoll();
    };
    bsmashLater(next, cleared ? 4200 : 2200);
}

function bsmashBigPassed(take) {
    bsmashEl('beat-reading').classList.add('clean');
    bsmashBandLevel(BSMASH_BAND_FULL);
    bsmashStarSound();
    const id = bsmash.musician.id;
    const record = bsmashMusicianRecord(id);
    bsmashUpdateMusician(id, { clean: record.clean + 1 });
    if (record.won) {
        // Already in the band: a good take, and back to the band.
        bsmashEvent('beat.take.clean');
        return bsmashLater(() => openBeatBand(), 2500);
    }
    bsmashLater(() => bsmashOpenPicker(take.cameBack), 900);
}

/* =========================================
   THE PART PICKER (§8.2)
   =========================================
   The emotional payoff: short, all reward, no reading or tapping. The band
   won so far keeps playing underneath the whole time (for the first
   musician, Tango's warm-up groove). Tap a picture to hear that part; Keep
   lights only once one has been heard. */
function bsmashOpenPicker(cameBack) {
    const musician = bsmash.musician;
    bsmash.phase = 'picker';
    bsmash.picker = { heard: [], choice: null, locked: false };
    switchScreenState('beat', 'beat-screen-picker');
    bsmashEl('beat-picker-title').textContent = KR.t('beat.picker.title.' + musician.id);
    bsmashRenderDesk('beat-picker-desk');
    const cards = bsmashEl('beat-picker-cards');
    cards.innerHTML = '';
    cards.hidden = true;
    bsmashEl('beat-picker-keep').hidden = true;
    bsmashEl('beat-picker-done').hidden = true;
    bsmashEl('beat-picker-desk').classList.add('dim');
    bsmashEvent('beat.part.won.' + musician.id);
    if (cameBack) bsmashLater(() => bsmashEvent('beat.take.comeback'), 2400);
    bsmashLater(() => {
        BSMASH_STYLES.forEach(style => {
            const card = bsmashMake('button', 'bsmash-style-card', cards);
            card.type = 'button';
            card.classList.add('style-' + style);
            card.setAttribute('data-style', style);
            bsmashStylePicture(card, musician.id, style);
            const name = bsmashMake('span', 'bsmash-style-name', card);
            name.textContent = KR.t('beat.style.' + style);
            card.onclick = () => auditionBeatPart(style);
        });
        cards.hidden = false;
        const keep = bsmashEl('beat-picker-keep');
        keep.hidden = false;
        keep.disabled = true;
        bsmashEvent('beat.picker.open');
    }, cameBack ? 4200 : BSMASH_PICKER_INTRO_MS);
}

// The musician in that style's look (§8): a picture from content/art.js once
// Rob's art exists; until then, the style's icon.
function bsmashStylePicture(parent, musicianId, style) {
    const art = (KR.art || {})['beat.' + musicianId + '.' + style];
    if (art) {
        const img = bsmashMake('img', 'bsmash-style-art', parent);
        img.src = art;
        img.alt = '';
    } else {
        const icon = bsmashMake('span', 'bsmash-style-icon', parent);
        icon.textContent = KR.t('beat.style.' + style + '.icon');
    }
}

function auditionBeatPart(style) {
    if (!bsmash || !bsmash.picker || bsmash.picker.locked) return;
    const picker = bsmash.picker;
    bsmashAudio();
    bsmashBandSetPart(bsmash.musician.id, style);
    bsmashBandLevel(BSMASH_BAND_FULL);
    picker.choice = style;
    if (picker.heard.indexOf(style) === -1) picker.heard.push(style);
    document.querySelectorAll('#beat-picker-cards .bsmash-style-card').forEach(card => {
        card.classList.toggle('on', card.getAttribute('data-style') === style);
        card.classList.toggle('heard', picker.heard.indexOf(card.getAttribute('data-style')) !== -1);
    });
    bsmashEl('beat-picker-keep').disabled = false;
    bsmashEvent('beat.picker.heard.' + style);
}

// Leaving without Keep never loses the musician: the part last heard is
// kept, or the first if none was (§8.2).
function bsmashKeepPart(quietly) {
    const picker = bsmash.picker;
    if (!picker || picker.locked) return;
    const style = picker.choice || BSMASH_STYLES[0];
    picker.locked = true;
    const id = bsmash.musician.id;
    bsmashUpdateMusician(id, { won: true, part: style, step: 3, streak: 0 });
    if (quietly) return;
    bsmashBandSetPart(id, style);
    bsmashBandLevel(BSMASH_BAND_FULL);
    bsmashRenderDesk('beat-picker-desk');
    bsmashEl('beat-picker-desk').classList.remove('dim');
    document.querySelectorAll('#beat-picker-cards .bsmash-style-card').forEach(card => {
        card.classList.toggle('chosen', card.getAttribute('data-style') === style);
        card.disabled = true;
    });
    bsmashEl('beat-picker-keep').hidden = true;
    bsmashEvent('beat.part.locked.' + id, { style: KR.t('beat.style.' + style) });
    bsmashLater(() => {
        bsmashEl('beat-picker-done').hidden = false;
        bsmashEvent('beat.playback');
    }, 3000);
}

function keepBeatPart() {
    if (bsmash && bsmash.picker && bsmash.picker.choice) bsmashKeepPart(false);
}

/* ---------- Playback: the band, loud (§8, step 5) ---------- */
function openBeatBand() {
    const progress = bsmashLoad();
    const parts = {};
    ['drums', 'bass', 'keys'].forEach(id => {
        if (progress.musicians[id].won) parts[id] = progress.musicians[id].part;
    });
    if (!Object.keys(parts).length) return;
    const keepBand = !!bsmashBand;
    if (!keepBand) bsmashStopAll();
    if (!bsmash) bsmash = { mode: 'band', musician: BSMASH_MUSICIANS[0], delay: bsmashDelay() };
    bsmashStopTimers();
    bsmash.picker = { heard: [], choice: null, locked: true };
    switchScreenState('beat', 'beat-screen-picker');
    bsmashEl('beat-picker-title').textContent = KR.t('beat.band.title');
    bsmashRenderDesk('beat-picker-desk');
    bsmashEl('beat-picker-desk').classList.remove('dim');
    const cards = bsmashEl('beat-picker-cards');
    cards.innerHTML = '';
    cards.hidden = false;
    Object.keys(parts).forEach(id => {
        const card = bsmashMake('button', 'bsmash-style-card', cards);
        card.type = 'button';
        card.classList.add('chosen', 'style-' + parts[id]);
        card.disabled = true;
        bsmashStylePicture(card, id, parts[id]);
        const name = bsmashMake('span', 'bsmash-style-name', card);
        name.textContent = KR.t('beat.channel.' + id);
    });
    bsmashEl('beat-picker-keep').hidden = true;
    bsmashEl('beat-picker-done').hidden = false;
    bsmashAudio();
    Object.keys(parts).forEach(id => {
        if (bsmashBand && bsmashBand.parts[id] !== parts[id]) bsmashBandSetPart(id, parts[id]);
    });
    bsmashBandStart(parts);
    bsmashBandLevel(BSMASH_BAND_FULL);
    bsmashEvent('beat.playback');
}

/* =========================================
   WHO IS PLAYING, AND HOW OLD (§12)
   =========================================
   Asked once, after the first star. The age sets the timing window and the
   big take's pass mark; the engine is the same for everyone. */
let bsmashChosenAge = null;
let bsmashPlayerThen = false;

// switching: from the "Playing as" chip - show every name, to switch or add.
function showBeatPlayers(backToStudio, switching) {
    bsmashPlayerThen = !!backToStudio;
    switchScreenState('beat', 'beat-screen-player');
    const players = vsmashPlayers();
    const current = bsmashPlayer();
    const needName = !current || !!switching;
    // Switching players asks afresh: a new name mustn't inherit the last one's age.
    bsmashChosenAge = !needName && BSMASH_AGES.indexOf(current.age) !== -1 ? current.age : null;
    bsmashEl('beat-name-part').hidden = !needName;
    const list = bsmashEl('beat-player-list');
    list.innerHTML = '';
    players.list.forEach(p => {
        const button = bsmashMake('button', 'btn btn-secondary vsmash-player-btn', list); // text-ok
        if (current && p.id === current.id) button.classList.add('current');
        button.textContent = p.name;
        button.onclick = () => chooseBeatPlayer(p.id);
    });
    const input = bsmashEl('beat-name-input');
    input.value = '';
    input.placeholder = KR.t('beat.player.namePlaceholder');
    input.onkeydown = (e) => { if (e.key === 'Enter') addBeatPlayer(); };
    bsmashRenderAges();
    KR.say(needName ? 'beat.player.ask' : 'beat.player.age', { box: bsmashEl('beat-player-guide'), speaker: 'tango' });
}

function bsmashRenderAges() {
    const row = bsmashEl('beat-age-row');
    row.innerHTML = '';
    BSMASH_AGES.forEach(age => {
        const chip = bsmashMake('button', 'bsmash-chip bsmash-age', row); // text-ok
        chip.type = 'button';
        chip.textContent = KR.t('beat.age.' + age);
        chip.classList.toggle('on', bsmashChosenAge === age);
        chip.onclick = () => { bsmashChosenAge = age; bsmashRenderAges(); };
    });
}

function chooseBeatPlayer(playerId) {
    const players = vsmashPlayers();
    if (!players.list.some(p => p.id === playerId)) return;
    const guest = bsmashLoad();
    players.current = playerId;
    vsmashSavePlayers(players);
    bsmashAdoptGuest(guest);
    const player = bsmashPlayer();
    if (BSMASH_AGES.indexOf(player.age) !== -1) return bsmashPlayerDone();
    showBeatPlayers(bsmashPlayerThen);
}

// A guest's first minute and first star go with them to their name - unless
// that name already has Beat Smash progress on this device.
function bsmashAdoptGuest(guest) {
    const player = bsmashPlayer();
    if (!player || !bsmashGuest) return;
    if (!bsmashReadAll().players[player.id]) bsmashSave(guest);
    bsmashGuest = null;
}

function addBeatPlayer() {
    const guide = bsmashEl('beat-player-guide');
    const input = bsmashEl('beat-name-input');
    const name = input.value.trim().replace(/\s+/g, ' ');
    let player = bsmashPlayer();
    if (!player && !name) {
        KR.say('beat.player.nameNeeded', { box: guide, speaker: 'tango' });
        input.focus();
        return;
    }
    if (name) {
        const guest = bsmashLoad();
        const players = vsmashPlayers();
        player = players.list.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!player) {
            player = { id: 'p' + Date.now().toString(36), name: name };
            players.list.push(player);
        }
        players.current = player.id;
        vsmashSavePlayers(players);
        bsmashAdoptGuest(guest);
        if (BSMASH_AGES.indexOf(player.age) !== -1 && !bsmashChosenAge) bsmashChosenAge = player.age;
    }
    if (!bsmashChosenAge) { KR.say('beat.player.age', { box: guide, speaker: 'tango' }); return; }
    const players = vsmashPlayers();
    const record = players.list.find(p => p.id === players.current);
    record.age = bsmashChosenAge;
    vsmashSavePlayers(players);
    bsmashPlayerDone();
}

function bsmashPlayerDone() {
    if (bsmashPlayerThen && bsmash && bsmash.mode === 'steps') {
        switchScreenState('beat', 'beat-screen-studio');
        return bsmashLater(bsmashNewRoll, 400);
    }
    showBeatPathway();
}

/* =========================================
   THE PATHWAY
   =========================================
   The app's pathway pattern: locked = icon only; unlocked = icon + name;
   won = icon + name + the part chosen. The musicians in order, then the
   booth. Start appears once a node is selected. */
let bsmashSelected = null;

function showBeatPathway() {
    bsmashStopAll();
    switchScreenState('beat', 'beat-screen-pathway');
    renderBeatPathway();
}

function bsmashUnlocked(index, progress) {
    const musician = BSMASH_MUSICIANS[index];
    if (!musician.built) return false;
    if (index === 0) return true;
    return !!progress.musicians[BSMASH_MUSICIANS[index - 1].id].won;
}

function renderBeatPathway() {
    const progress = bsmashLoad();
    const player = bsmashPlayer();
    const chip = bsmashEl('beat-player-chip');
    chip.hidden = !player;
    chip.textContent = player ? KR.t('beat.player.playingAs', { name: player.name }) : '';
    const track = bsmashEl('beat-pathway-track');
    track.innerHTML = '';
    bsmashSelected = null;
    BSMASH_MUSICIANS.forEach((musician, index) => {
        const open = bsmashUnlocked(index, progress);
        const record = progress.musicians[musician.id];
        const node = bsmashMake('button', 'pathway-node', track);
        node.classList.add(open ? 'unlocked' : 'locked');
        if (record.won) node.classList.add('cleared');
        node.disabled = !open;
        const icon = bsmashMake('span', 'pathway-node-icon', node);
        icon.textContent = open ? KR.t('beat.musician.' + musician.id + '.icon') : KR.t('beat.lockedIcon');
        if (open) {
            const label = bsmashMake('span', 'pathway-node-label', node);
            label.textContent = KR.t('beat.musician.' + musician.id);
            if (record.won) {
                const won = bsmashMake('small', null, node);
                won.textContent = KR.t('beat.style.' + record.part);
            }
            node.onclick = () => selectBeatMusician(musician.id);
            bsmashSelected = bsmashSelected || musician.id;
            if (!record.won) bsmashSelected = musician.id;
        }
    });
    selectBeatMusician(bsmashSelected);
    bsmashRenderStats();
    const won = id => progress.musicians[id].won;
    const say = won('bass') ? 'beat.soon.keys' : won('drums') ? 'beat.pathway.riff' : 'beat.pathway.say';
    KR.say(say, { box: bsmashEl('beat-pathway-guide'), silent: true, speaker: won('drums') ? 'riff' : 'tango' });
    bsmashRenderPathwaySettings();
}

function selectBeatMusician(id) {
    bsmashSelected = id;
    document.querySelectorAll('#beat-pathway-track .pathway-node').forEach((node, i) =>
        node.classList.toggle('recommended', BSMASH_MUSICIANS[i].id === id));
    const progress = bsmashLoad();
    const record = progress.musicians[id];
    if (!progress.jamDone) bsmashSelectedStep = 'jam';
    else if (record.won) bsmashSelectedStep = 'band';
    else bsmashSelectedStep = record.step;
    bsmashRenderSteps();
}

/* ---------- The steps, on the pathway ----------
   Every step the student has reached can be played again, the warm-up
   included: nothing opened is ever closed. With the teacher code on
   (teacher-codes.js) every step is open. */
let bsmashSelectedStep = null;

function bsmashStepChoices(id) {
    const progress = bsmashLoad();
    const record = progress.musicians[id];
    const reached = KR.openAll() || record.won ? 3 : record.step;
    const choices = ['jam'];
    for (let step = 1; step <= reached; step++) choices.push(step);
    if (record.won) choices.push('band');
    return choices;
}

function bsmashRenderSteps() {
    const row = bsmashEl('beat-steps');
    row.innerHTML = '';
    bsmashStepChoices(bsmashSelected).forEach(step => {
        const chip = bsmashMake('button', 'bsmash-chip bsmash-step-chip', row); // text-ok
        chip.type = 'button';
        chip.textContent = KR.t('beat.step.' + step);
        chip.classList.toggle('on', step === bsmashSelectedStep);
        chip.onclick = () => { bsmashSelectedStep = step; bsmashRenderSteps(); };
    });
    const start = bsmashEl('beat-pathway-start');
    start.disabled = false;
    start.textContent = KR.t(bsmashSelectedStep === 'band' ? 'beat.playBand' : 'beat.start');
}

function startSelectedBeat() {
    const id = bsmashSelected;
    if (!id) return;
    bsmashAudio();
    if (bsmashSelectedStep === 'band') return openBeatBand();
    if (bsmashSelectedStep === 'jam') return startBeatJam();
    startBeatMusician(id, false, bsmashSelectedStep);
}

// The beat test's numbers, for the teacher: shown only with the teacher
// code on. A child sees no milliseconds, ever.
function bsmashRenderStats() {
    const box = bsmashEl('beat-stats');
    const tests = bsmashLoad().beatTests || [];
    box.hidden = !KR.openAll() || !tests.length;
    if (box.hidden) return;
    const last = tests[tests.length - 1];
    box.textContent = KR.t(last.leanMs >= 0 ? 'beat.stats.late' : 'beat.stats.early', {
        onBeat: last.onBeat, taps: last.taps, lean: Math.abs(last.leanMs),
        steady: last.steadyMs, tests: tests.length,
    });
}

// Settings a tester can change (§7): the pad's sound, one pad or four, and
// the picture once the first star has been won.
function bsmashRenderPathwaySettings() {
    const box = bsmashEl('beat-settings');
    if (!box) return;
    const progress = bsmashLoad();
    box.innerHTML = '';
    const row = (titleId, options, current, choose) => {
        const line = bsmashMake('div', 'bsmash-setting', box);
        const title = bsmashMake('span', 'bsmash-setting-title', line);
        title.textContent = KR.t(titleId);
        options.forEach(option => {
            const chip = bsmashMake('button', 'bsmash-chip', line);
            chip.type = 'button';
            chip.textContent = KR.t(option.text);
            chip.classList.toggle('on', option.value === current);
            chip.onclick = () => { choose(option.value); bsmashRenderPathwaySettings(); };
        });
    };
    const save = fn => { const p = bsmashLoad(); fn(p.settings); bsmashSave(p); };
    // One sound row for each musician the student has reached.
    BSMASH_MUSICIANS.forEach((musician, index) => {
        if (!musician.sounds || !bsmashUnlocked(index, progress)) return;
        row('beat.settings.sound.' + musician.id, musician.sounds.map(v => ({ value: v, text: 'beat.sound.' + v })),
            progress.settings.sound[musician.id], v => save(s => { s.sound[musician.id] = v; }));
    });
    row('beat.settings.pads', ['auto', 'four', 'one'].map(v => ({ value: v, text: 'beat.padMode.' + v })),
        progress.settings.padMode, v => save(s => { s.padMode = v; }));
    // The warm-up jam's song: the band's own loops, or one of Rob's songs.
    const songs = (window.KR && KR.songs) || {};
    row('beat.settings.song', [{ value: 'c', text: 'song.c' }].concat(
        Object.keys(songs).map(id => ({ value: id, text: songs[id].name }))),
        progress.settings.jamSong || 'c', v => save(s => { s.jamSong = v; }));
    if (progress.firstStar) {
        row('beat.settings.picture', ['mix'].concat(BSMASH_PICTURES).map(v => ({ value: v, text: 'beat.picture.' + v })),
            progress.settings.pictureHelp || 'mix', v => save(s => { s.pictureHelp = v; }));
    }
}

function retuneBeatTiming() {
    bsmashAudio();
    startBeatJam();
}

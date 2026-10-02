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
        // Rob: "Get rid of the cowbell... it's actually a pitch... back to
        // the kick, if we can make that kick nice and juicy." The clave is
        // the teacher's to try (the sound rows are teacher-only).
        sounds: ['kick', 'clave'],
        steps: {
            1: [['q q q q'], ['q qr q qr'], ['qr q qr q'], // text-ok: bars, not words
                ['qr q q q', 'q qr q q', 'q q qr q', 'q q q qr'], 'all'], // text-ok: bars, not words
            2: ['all'],
            3: ['all'],
            4: ['all'],
            5: ['all'],
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
            4: ['all'],
            5: ['all'],
        },
    },
    /* Riff on keys (§2, §5): whole notes and whole rests join everything
       before. "Gliding on top: longer notes and sustain, like an organ."
       The pool gives the brief's 38 legal bars. "Riff's keys step mixes
       whole notes with halves, because one bar of whole notes alone has only
       two shapes" (§5), so the ladder runs: the whole note · whole and half
       notes · longer notes among quarters · all 38. */
    {
        id: 'keys', coach: 'riff', built: true,
        pool: ['quarter-note', 'quarter-rest', 'half-note', 'half-rest', 'whole-note', 'whole-rest'],
        sounds: ['rhodes', 'organ'],
        steps: {
            1: [['w'], ['w', 'h h', 'h hr', 'hr h'], // text-ok: bars, not words
                ['w', 'h q q', 'q q h', 'q h q', 'hr h', 'h qr q'], 'all'], // text-ok: bars, not words
            2: ['all'],
            3: ['all'],
            4: ['all'],
            5: ['all'],
        },
    },
];

/* THE STEPS. Rob, 2026-10-01: "we're building up to it from three times for
   one bar, three times for two bars, three times in a row for four bars,
   three times in a row for eight bars, and then the 32." Steps 1 to 4 all
   run the same way: dice, count-in, play, three in a row. Then the studio:
   32 bars once through, at the age's pass mark, with a transport bar.
   "If you can lay down 32 bars, you get to choose that instrument." */
const BSMASH_STEP_BARS = { 1: 1, 2: 2, 3: 4, 4: 8 };
const BSMASH_STUDIO_STEP = 5;
const BSMASH_STUDIO_BARS = [32, 16, 8];    // the studio take's length; the first is the default, the others a teacher's setting
const BSMASH_CLEAN_STEPS = 2;              // steps up to this one need every note right; longer ones need the age's pass mark

/* ---------- Defaults Rob will tune ----------
   All in one place. Ages are asked once, when the player is added (§12). */
const BSMASH_AGES = ['6-8', '9-10', '11+'];
const BSMASH_DEFAULT_AGE = '9-10';
const BSMASH_WINDOW_MS = { '6-8': 220, '9-10': 195, '11+': 170 };   // how far from the beat a tap still counts
const BSMASH_WINDOW_START_EXTRA_MS = 40;   // generous at first (§14)...
const BSMASH_WINDOW_TIGHTEN_MS = 5;        // ...and this much tighter per clean take, down to the age's window
const BSMASH_PASS_MARK = { '6-8': 0.80, '9-10': 0.85, '11+': 0.90 };  // the big take (§6)
// A press outside the window but within this much of a beat of a note still
// to be played is that note, EARLY or LATE, not a tap in the rest beside it
// (playtest 1, §4.1). The report said a third of a beat; the window is
// already about a third (195 ms at 9-10), so a third would change nothing.
const BSMASH_NEAR_BEAT = 0.5;
const BSMASH_JAM_WINDOW_MS = 150;          // the first minute can't fail; this decides when a pad lights and a tap counts
const BSMASH_JAM_DEMO_EVERY_BARS = 4;      // Tango shows the way again if the taps don't settle
/* THE BAND NEEDS A PULSE (Rob, playtest 2). "A little story that the band
   needs a pulse. Your job is to keep the pulse. And then, as we add another
   instrument... Hold the drums for a certain amount of time, then we will get
   the bass. If at any time you back off and stop playing, then you lose the
   instrument. You got to win it back." And: "What I really want to do is keep
   them going on this for one minute."
   So the warm-up starts with the student's pulse alone, and the band joins a
   player at a time, each after so many bars HELD (a bar with at least
   BSMASH_JAM_HELD_TAPS taps on the beat). A bar let go (no more than
   BSMASH_JAM_DROPPED_TAPS on the beat) loses the last one to join, and it
   has to be won back. The last step is the full groove; then "Show me what I
   played". 2 + 4 + 4 + 8 bars is 43 seconds held, about a minute as played.
   With one of the jam songs the bass and keys join in whole notes, and at
   the full groove the keys go to the pumps and the bass to the song's groove.
   {song} is the song's id. */
const BSMASH_JAM_BUILD = [
    { instrument: 'drums', bars: 2 },      // the pulse alone, then the drums join
    { instrument: 'bass', bars: 4 },
    { instrument: 'keys', bars: 4 },
    { instrument: null, bars: 8 },         // the whole band: then the groove is full
];
const BSMASH_JAM_HELD_TAPS = 3;            // taps on the beat in a bar that hold it
const BSMASH_JAM_DROPPED_TAPS = 1;         // this many or fewer and the bar is let go
const BSMASH_AND_WINDOW = 0.12;            // beats either side of the "and" (72 ms): a tap there is a groove of their own
const BSMASH_JAM_STYLES = { drums: 'warmup', bass: 'smooth', keys: 'smooth' };
const BSMASH_JAM_SONG_STYLES = { drums: 'warmup', bass: 'song:{song}:whole', keys: 'song:{song}:whole' };
const BSMASH_JAM_SONG_FULL = { keys: 'song:{song}:pumps', bass: 'song:{song}:groove' };
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
        settings: { padMode: 'four', sound: {}, jamSong: 'c', studioBars: BSMASH_STUDIO_BARS[0] },
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
    // Each musician's pad sound defaults to the first of theirs.
    const sounds = {};
    BSMASH_MUSICIANS.forEach(m => { if (m.sounds) sounds[m.id] = m.sounds[0]; });
    progress.settings.sound = Object.assign(sounds, progress.settings.sound);
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

// A part is 'warmup', a style ('spicy'...), or one played live (see
// bsmashIsSongPart), which has no loop file.
function bsmashPartLoopId(instrument, style) {
    if (bsmashIsSongPart(style)) return null;
    return style === 'warmup' ? 'beat.loop.warmup' : bsmashLoopId(instrument, style);
}

// A part played live, note by note, so it can join part-way through a cycle:
// one of Rob's songs ('song:'), a won part over the band's chosen song
// ('band:'), the chord guide ('guide:'), a song's audition tune ('phrase:'),
// or the metronome ('click').
function bsmashIsSongPart(style) {
    return typeof style === 'string' && (/^(song|band|guide|phrase):/.test(style) || style === 'click');
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

// Which bar of the song is sounding at time t: its chord is the pad's chord.
// A press a fraction before the barline is the next bar's note played early,
// so it ANTICIPATES the next chord (Rob, playtest 2: "If someone anticipates
// by a fraction before… we should know that it's anticipating the next
// chord"), the same rule the band's own keys follow.
const BSMASH_ANTICIPATE_BEATS = 0.25;      // the last quarter of a beat before a barline
function bsmashChordAt(t) {
    if (!bsmashBand) return 'I';
    const bar = Math.floor((t + BSMASH_ANTICIPATE_BEATS * BSMASH_BEAT - bsmashBand.start) / BSMASH_BAR + 1e-6);
    // Building a band: the chord of the song the student chose.
    if (bsmash && bsmash.song) return BeatSmashBand.chordOf(bsmash.song, bar);
    return BSMASH_SONG.chords[((bar % BSMASH_SONG.bars) + BSMASH_SONG.bars) % BSMASH_SONG.bars];
}

/* ---------- The sound under the thumb (§7) ----------
   A juicy kick for Tango's part (the cowbell was a pitch). It plays at once, on
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
// How many bars a take reads: the step's, or the studio's setting.
function bsmashBarCount(musician, step) {
    if (step !== BSMASH_STUDIO_STEP) return BSMASH_STEP_BARS[step];
    const chosen = bsmashLoad().settings.studioBars;
    return BSMASH_STUDIO_BARS.indexOf(chosen) !== -1 ? chosen : BSMASH_STUDIO_BARS[0];
}

function bsmashHasNote(bar) {
    return bar.some(key => !RSTOMP_VOCABULARY[key].isRest);
}

// Roll: random to the child, controlled to the curriculum (§4). Each bar is
// a different bar from the one before it where the table allows. A take
// always has something to play: a one-bar take is never a bar of silence.
// The studio leans towards the busier bars ("a little more involved", §10):
// a bar is as likely as it has notes and rests in it.
function bsmashRoll(musician, step, clean, previous) {
    let table = bsmashDiceTable(musician, step, clean);
    const count = bsmashBarCount(musician, step);
    if (count === 1) table = table.filter(bsmashHasNote);
    const weight = bar => step === BSMASH_STUDIO_STEP ? bar.length : 1;
    for (let attempt = 0; attempt < 20; attempt++) {
        const bars = [];
        let last = previous && previous.length ? previous[previous.length - 1] : null;
        for (let i = 0; i < count; i++) {
            const fresh = table.filter(bar => !bsmashSameBar(bar, last));
            const from = fresh.length ? fresh : table;
            const total = from.reduce((a, bar) => a + weight(bar), 0);
            let pick = Math.random() * total, bar = from[from.length - 1];
            for (const candidate of from) { pick -= weight(candidate); if (pick < 0) { bar = candidate; break; } }
            bars.push(bar);
            last = bar;
        }
        if (bars.some(bsmashHasNote)) return bars;
    }
    return [table.find(bsmashHasNote)];
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
    reading.classList.remove('clean', 'review');
    reading.style.maxHeight = '';
    reading.scrollTop = 0;
    bsmash.layout = [];
    const bars = bsmash.specs;
    if (!bars || !bars.length) return;
    const width = Math.max(240, reading.clientWidth || 340);
    const perLine = Math.min(bars.length, width < 560 ? 2 : 4);
    const perBar = Math.min(300, Math.floor((width - 16) / perLine));
    const lines = [];
    for (let first = 0; first < bars.length; first += perLine) {
        const lineBars = bars.slice(first, first + perLine);
        const line = bsmashMake('div', 'bsmash-line', reading);
        lines.push(line);
        const marks = bsmashMake('div', 'bsmash-marks', line);
        // The bar number at the start of every line after the first, as in
        // printed music: on a long take it says where you are.
        if (first > 0) bsmashMake('span', 'bsmash-bar-number', marks).textContent = String(first + 1);
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
        // The listen-back's play line (Rob, playtest 2): behind the ink, on the paper.
        const playline = bsmashMake('div', 'bsmash-playline', paper);
        playline.hidden = true;
        paper.insertBefore(playline, staff);
    }
    const phoneLines = window.innerHeight < BSMASH_SHORT_SCREEN ? BSMASH_PAGE_LINES_SHORT : BSMASH_PAGE_LINES_PHONE;
    bsmash.page = { lines: lines, perLine: perLine, size: Math.min(lines.length, perLine === 2 ? phoneLines : BSMASH_PAGE_LINES_WIDE), at: -1 };
    bsmashTurnPage(0);
}

/* A LONG TAKE TURNS ITS PAGES. Rob: "If we can make 12 or 16 bars I would be
   delighted. If we could make up to 32 bars I would be over the moon." The
   reading shows a page of lines (four on a phone, two lines of four bars on
   a wider screen: exactly what eight bars always took, so the pads stay on
   screen). Past that the page turns the way a musician turns a half page:
   the moment a line has been played, its row is filled with the next line
   still to come. Nothing moves under the line being read; after the last
   row, the next line is waiting at the top, with its bar number. */
const BSMASH_PAGE_LINES_PHONE = 4;
const BSMASH_PAGE_LINES_WIDE = 2;
// A short phone (a 360x640, say) has room for three lines once the studio's
// transport is on screen, so its page is three lines.
const BSMASH_SHORT_SCREEN = 700;           // px tall
const BSMASH_PAGE_LINES_SHORT = 3;

function bsmashTurnPage(current) {
    const page = bsmash.page;
    if (!page || page.at === current) return;
    if (current < page.at) page.lines.forEach(line => { line.hidden = false; });
    page.at = current;
    if (page.lines.length <= page.size) return;
    const first = Math.min(current, page.lines.length - page.size);
    page.lines.forEach((line, i) => {
        line.hidden = i < first || i >= first + page.size;
        line.style.order = i % page.size;
    });
}

// After a long take: every line, in order, scrolled to the first slip.
function bsmashOpenPage(firstBar) {
    const page = bsmash.page;
    if (!page || page.lines.length <= page.size) return;
    const reading = bsmashEl('beat-reading');
    const height = reading.offsetHeight;
    page.lines.forEach(line => { line.hidden = false; line.style.order = ''; });
    page.at = -1;
    reading.classList.add('review');
    reading.style.maxHeight = height + 'px';
    const line = page.lines[Math.floor((firstBar || 0) / page.perLine)];
    reading.scrollTop = line ? line.offsetTop - reading.offsetTop : 0;
}

/* ONE PICTURE: SQUARES. Rob, 2026-10-01, after playing it: "just give them
   one interface of squares. We don't need to give them different ways of
   representing the sound… the drum loop interface just doesn't do it for
   me." The Counting and Drum machine pictures, "Mix it up" and "Need a
   hand?" are gone; the picture is the squares, the scaffold that fades. */
// The picture of one bar (§12): squares. Width shows length; solid or
// hollow shows sound or silence; colour only repeats the length.
function bsmashDrawPicture(barIndex) {
    const entry = bsmash.layout[barIndex];
    const x = entry.layout.pulseX;
    entry.blocks = [];
    entry.specs.forEach((spec, index) => {
        const valueClass = BSMASH_VALUE_CLASS[spec.value] || 'quarter';
        const block = bsmashMake('div', 'bsmash-block', entry.picture);
        block.classList.add('pic-blocks', valueClass); // text-ok: class names
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
        }
        entry.blocks[index] = block;
    });
}

// 'picture' or 'notation'. A morph is the same swap, slowed down (§4).
function bsmashShow(what, seconds) {
    const reading = bsmashEl('beat-reading');
    reading.style.setProperty('--morph', (seconds || 0.25) + 's');
    reading.classList.toggle('show-picture', what === 'picture');
    reading.classList.toggle('show-notation', what !== 'picture');
    bsmash.showing = what;
}

/* THE COUNT-IN, made unmistakable. Rob, 2026-10-01: "I love how the music
   continues all the way through and we're talking over the top of it, so
   make sure it's very clear the count in… the vacant screen in the middle
   needs to pulse in red one, two, three, four, then the exercise starts. Or
   use the same method that we use when somebody gets off the beat."
   It IS that method, so no new metaphor: Tango's counting voice on the beat
   (booked on the audio clock in bsmashScheduleTake), the number in a ring,
   each beat's pad lighting as it is counted. Red, because red is the
   recording light: this is the count before REC. The ring sits in the empty
   space between the music and the pads, never over the notation; where a
   short screen has no room for it, the red pads carry the count alone. */
const BSMASH_COUNTIN_MAX = 140;     // px: the ring's largest size
const BSMASH_COUNTIN_MIN = 56;      // px: smaller than this, the pads count alone

function bsmashCountIn(n) {
    const ring = bsmashEl('beat-countin');
    if (n === null) { ring.hidden = true; return; }
    if (n === 1) bsmashPlaceCountIn(ring);
    if (!ring.sized) return;
    ring.hidden = false;
    ring.firstChild.textContent = String(n);
    ring.classList.remove('pulse');
    void ring.offsetWidth;
    ring.classList.add('pulse');
}

// Centre the ring in the gap above the pads, as large as the gap allows.
function bsmashPlaceCountIn(ring) {
    const reading = bsmashEl('beat-reading');
    const above = [reading, bsmashEl('beat-take-stats')].filter(el => el && !el.hidden && el.offsetHeight);
    const top = Math.max(...above.map(el => el.offsetTop + el.offsetHeight));
    const bottom = bsmashEl('beat-pads').offsetTop + 8;
    const size = Math.min(BSMASH_COUNTIN_MAX, bottom - top - 16);
    ring.sized = size >= BSMASH_COUNTIN_MIN;
    if (!ring.sized) return;
    ring.style.width = ring.style.height = size + 'px';
    ring.style.top = Math.round(top + (bottom - top - size) / 2) + 'px';
    ring.style.fontSize = Math.round(size * 0.55) + 'px';
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
    if (!entry) return null;
    const x = entry.layout.pulseX;
    const mark = bsmashMake('div', 'bsmash-miss', entry.under);
    mark.style.left = (x(slot) + 1) + 'px';
    mark.style.width = Math.max(10, x(slot + slots) - x(slot) - 4) + 'px';
    return mark;
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
     step      1 to 4 (one, two, four, eight bars), or 5, the studio
     scaffold  'star1' | 'star2' | 'star3' (the fading picture, §3),
               'retake' (practice after a miss) or 'studio'
     bars      the roll, as vocabulary keys; specs, the same as specs
     take      the take being recorded, or null
     phase     'roll' | 'countin' | 'take' | 'verdict' | 'reveal' | 'ready' | 'picker' */
let bsmash = null;

function enterBeatSmash() {
    launchGame('view-beat');
    bsmashAudio();          // inside the tap that opened the game: iOS needs that
    KR.event('beat.open');
    // The first time in is the warm-up; after that, and for a teacher with
    // everything open (who came to jump to a step), the pathway.
    if (!bsmashLoad().jamDone && !KR.openAll()) startBeatJam();
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
    bsmashEl('beat-countin').hidden = true;
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

// Four beat pads by default, every step (Rob, 2026-10-01: "the 1 2 3 4 is
// probably more what we are trying to drum in at this point in time"). The
// one big pad stays as a setting. The pad pressed must be the beat's.
function bsmashPadCount() {
    if (!bsmash || bsmash.mode === 'jam') return 4;
    return bsmashLoad().settings.padMode === 'one' ? 1 : 4;
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
    stars.hidden = jam || bsmash.step === BSMASH_STUDIO_STEP;   // the studio is one take, not three in a row
    label.hidden = jam;
    if (!jam) {
        label.textContent = KR.t('beat.step.' + bsmash.step);
        bsmashStarsShown(bsmash.streak);
        }
}

function bsmashRenderDesk(id) {
    const desk = bsmashEl(id);
    if (!desk) return;
    desk.innerHTML = '';
    const progress = bsmashLoad();
    // In the warm-up the desk is the story: who has joined the student's pulse.
    if (id === 'beat-desk' && bsmash && bsmash.mode === 'jam' && !bsmash.jam.morphed) {
        ['drums', 'bass', 'keys'].forEach(instrument => {
            const channel = bsmashMake('div', 'bsmash-channel', desk);
            channel.classList.toggle('lit', !!(bsmashBand && bsmashBand.parts && instrument in bsmashBand.parts));
            bsmashMake('span', 'bsmash-channel-name', channel).textContent = KR.t('beat.channel.' + instrument);
            bsmashMake('span', 'bsmash-channel-style', channel);
        });
        return;
    }
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
    if (bsmash.phase === 'playback') bsmashFollowPlayback();
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
    bsmashLoopGuide(bar);
    if (!take || take.done || take.paused) return;
    const takeBeat = beat - take.firstBeat;
    const pad = bsmash.pads.count === 1 ? 0 : inBar;
    const counting = takeBeat >= take.from - 4 && takeBeat < take.from;
    if (counting) bsmash.pads.flash(pad, 'countin', 380);
    else if (takeBeat >= take.from && takeBeat < take.bars * 4) bsmash.pads.glow(pad, inBar === 0 ? 'beat-one' : 'beat');
    bsmashCountIn(counting ? takeBeat - take.from + 5 : null);
    // The second star: the picture shows during the count-in, and the
    // notation replaces it before beat 1 (§3).
    if (take.flashPicture && takeBeat === -2) bsmashShow('notation', 0.3);
    if (take.go === 'picture') bsmashPictureCursor(takeBeat >= 0 && takeBeat < take.bars * 4 ? takeBeat : null);
    if (takeBeat >= 0 && takeBeat < take.bars * 4 && bsmash.page) bsmashTurnPage(Math.floor(takeBeat / 4 / bsmash.page.perLine));
    if (takeBeat === take.from - 4) { bsmash.phase = 'countin'; bsmashTransport(); }
    if (takeBeat === take.from) { bsmash.phase = 'take'; bsmashEl('beat-rec').classList.add('recording'); bsmashTransport(); }
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
        jam: { offsets: [], inARow: 0, lastHitBeat: null, demoBars: new Set(),
               lastDemoBar: 0, level: 0, held: 0, barTaps: {}, andTaps: [], lastGroove: -Infinity, full: false, morphed: false,
               styles: bsmashJamStyles(), missesInRow: 0, sag: 0,
               taps: 0, lastTap: 0, stopped: false,
               song: bsmashJamSong(), variations: null, variation: 0,
               rounds: 0, cycleTaps: {},
               follow: null, greenRun: 0, praiseAt: BSMASH_GREEN_PRAISE_AT, sawGreen: false, lastCoach: -Infinity, lastTapRaw: null, gaps: [] },
    };
    bsmashOpenStudio();
    bsmashEl('beat-screen-studio').classList.add('jam');
    bsmashEl('beat-screen-studio').classList.remove('long');
    bsmashHeader();
    bsmashEl('beat-reading').innerHTML = '';
    bsmashEl('beat-transport').hidden = true;
    bsmashEl('beat-loop').hidden = true;
    bsmashControlRoom(null);
    bsmashEl('beat-jam-next').hidden = true;
    bsmashEl('beat-jam-nav').hidden = true;
    bsmashEl('beat-jam-coming').hidden = true;
    bsmashEl('beat-light').hidden = false;
    bsmashEl('beat-light').dataset.state = 'idle';
    bsmashDiceHide();
    // The pulse alone: the band's clock runs, and nobody is playing yet.
    bsmashBandStart({});
    bsmash.jam.variations = bsmashJamVariations();
    Object.keys(bsmash.jam.styles).forEach(instrument => bsmashLoadLoop(bsmashPartLoopId(instrument, bsmash.jam.styles[instrument])));
    bsmash.jam.variations.forEach(v => Object.keys(v.parts).forEach(instrument =>
        bsmashLoadLoop(bsmashPartLoopId(instrument, v.parts[instrument]))));
    bsmashBandLevel(BSMASH_JAM_BAND);
    bsmashJamMeter();
    bsmashJamDemo(1);
    bsmashRenderDesk('beat-desk');
    bsmashEvent('beat.jam.start');
    bsmashLater(() => { if (bsmash && bsmash.mode === 'jam' && !bsmash.jam.taps) bsmashEvent('beat.jam.story'); }, 2600);
}

// The jam song's id, if the student (or Rob) chose one of Rob's songs.
function bsmashJamSong() {
    const song = bsmashLoad().settings.jamSong;
    const songs = (window.KR && KR.songs) || {};
    return songs[song] ? song : null;
}

// What each player joins the warm-up playing: the band's own loops, or the
// chosen jam song.
function bsmashJamStyles() {
    const song = bsmashJamSong();
    const styles = Object.assign({}, song ? BSMASH_JAM_SONG_STYLES : BSMASH_JAM_STYLES);
    Object.keys(styles).forEach(id => { styles[id] = styles[id].replace('{song}', song); });
    return styles;
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
        bsmashAt(when, t => BeatSmashBand.pad(raudioCtx, bsmashPadBus, t, bsmashSoundKind()), 'jam');
    }
}

function bsmashJamBeat(beat, bar, inBar) {
    const jam = bsmash.jam;
    if (jam.stopped || jam.morphed) return;
    // The student has stopped playing: so does the band.
    if (jam.taps && bsmashNow() - jam.lastTap > BSMASH_JAM_IDLE_BARS * BSMASH_BAR) return bsmashJamStop();
    if (inBar === 0) bsmashJamBar(bar - 1);
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
        // Her count always starts; her words wait if she has only just spoken.
        bsmashJamFollow(bar + 1, bsmashNow() - jam.lastCoach >= BSMASH_COACH_EVERY_BARS * BSMASH_BAR);
    }
}

// The bar just played: held, let go, or neither. Held bars bring the next
// player in; a bar let go loses the last one to join, to be won back. Once
// the groove is full nothing more is lost: the variations take over.
function bsmashJamBar(bar) {
    const jam = bsmash.jam;
    if (!jam.taps || jam.full || jam.stopped) return;
    const taps = jam.barTaps[bar] || 0;
    delete jam.barTaps[bar - 1];
    if (taps >= BSMASH_JAM_HELD_TAPS) {
        jam.held++;
        if (jam.held >= BSMASH_JAM_BUILD[jam.level].bars) bsmashJamJoin();
    } else if (taps <= BSMASH_JAM_DROPPED_TAPS && jam.level > 0) {
        bsmashJamLose();
    }
    bsmashJamMeter();
}

function bsmashJamJoin() {
    const jam = bsmash.jam;
    const step = BSMASH_JAM_BUILD[jam.level];
    jam.level++;
    jam.held = 0;
    if (step.instrument) {
        bsmashBandSetPart(step.instrument, jam.styles[step.instrument]);
        bsmashEvent('beat.jam.layer.' + step.instrument);
    } else {
        // The whole band, and the groove is full: the song's own grooves.
        jam.full = true;
        if (jam.song) Object.keys(BSMASH_JAM_SONG_FULL).forEach(id =>
            bsmashBandSetPart(id, BSMASH_JAM_SONG_FULL[id].replace('{song}', jam.song)));
        bsmashEl('beat-jam-next').hidden = false;
        bsmashJamComing();
        bsmashEvent('beat.jam.full');
    }
    bsmashRenderDesk('beat-desk');
}

function bsmashJamLose() {
    const jam = bsmash.jam;
    jam.level--;
    jam.held = 0;
    const instrument = BSMASH_JAM_BUILD[jam.level].instrument;
    bsmashBandRemovePart(instrument);
    bsmashRenderDesk('beat-desk');
    // Always said: losing a player IS the story, and outranks any coaching.
    jam.lastCoach = bsmashNow();
    bsmashEvent('beat.jam.lost.' + instrument);
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
        jam.andTaps = [];
        jam.lastHitBeat = beat;
        const round = Math.floor(beat / 16);
        jam.cycleTaps[round] = (jam.cycleTaps[round] || 0) + 1;
        const bar = Math.floor(beat / 4);
        jam.barTaps[bar] = (jam.barTaps[bar] || 0) + 1;
        bsmash.pads.flash(p.pad, 'hit', 420);
        // Back on the beat: the band gets its power back, a step at a time.
        if (jam.sag > 0) { jam.sag = Math.max(0, jam.sag - 0.4); bsmashBandSag(jam.sag, 0.8); }
        if (jam.follow && jam.inARow >= BSMASH_FOLLOW_RESTORED) bsmashJamRestored();
    } else {
        jam.inARow = 0;
        jam.missesInRow++;
        // Playing a rhythm of their own (taps on the "and"): Rob, playtest 2,
        // "That's a cool groove, but that's not what we need for this song."
        // A run of them is a groove, not a lost beat, so it is named as one
        // and outranks "Follow me!" (her count still starts, in time).
        // Measured from the device's own delay, the fixed reference: the
        // running estimate would follow a steady run of them off the beat.
        const between = Math.abs(((((offset - bsmash.delay) / BSMASH_BEAT) % 1) + 1) % 1 - 0.5) < BSMASH_AND_WINDOW;
        const now = bsmashNow();
        if (between) jam.andTaps = jam.andTaps.concat([now]).filter(t => now - t < 2 * BSMASH_BAR);
        const grooving = jam.andTaps.length >= 2;
        if (jam.andTaps.length >= 3 && !coached && now - jam.lastGroove >= BSMASH_COACH_EVERY_BARS * BSMASH_BAR) {
            jam.andTaps = [];
            jam.lastGroove = jam.lastCoach = now;
            bsmashEvent('beat.jam.groove');
        }
        // Losing the beat: the band sinks with it (bsmashBandSag).
        if (jam.missesInRow >= BSMASH_SAG_AFTER) {
            // Not on top of something she has only just said.
            const quiet = bsmashNow() - jam.lastCoach >= BSMASH_COACH_EVERY_BARS * BSMASH_BAR;
            if (jam.sag === 0) {
                // Lost: Tango counts them back in, from the next bar.
                const bar = Math.floor((bsmashNow() - bsmashBand.start) / BSMASH_BAR) + 1;
                const say = !coached && quiet && !grooving;
                bsmashJamFollow(bar, say);
                if (say) jam.lastCoach = bsmashNow();
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

// The meter: how far through the build, in bars held.
function bsmashJamProgress() {
    const jam = bsmash.jam;
    if (jam.full) return 1;
    const total = BSMASH_JAM_BUILD.reduce((a, step) => a + step.bars, 0);
    const done = BSMASH_JAM_BUILD.slice(0, jam.level).reduce((a, step) => a + step.bars, 0) + jam.held;
    return done / total;
}

function bsmashJamMeter() {
    const level = bsmashJamProgress();
    bsmashEl('beat-jam-fill').style.width = Math.round(level * 100) + '%';
    bsmashEl('beat-pads').style.setProperty('--hype', level.toFixed(2));
    bsmashBandLevel(BSMASH_JAM_BAND + (BSMASH_BAND_FULL - BSMASH_JAM_BAND) * level, 0.6);
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
        else if (!bsmashSongOf(bsmashLoad())) showBeatSongs();
        else startBeatMusician('drums', true);
    }, bsmash.delay > BSMASH_DELAY_BLUETOOTH ? 8000 : 4500);
}

/* =========================================
   THE SONG: CHOSEN ONCE, AND THE BAND IS BUILT ON IT
   =========================================
   Rob, 2026-10-02: "We should be able to audition each chord progression
   and select the progression they want to develop into a rhythm section.
   That means all of their 1, 2, 4 and 8 bars are backed by the chord
   progression... And their 32 bar is over that same chord progression."
   After the warm-up the student auditions the songs (KR.bandSongs in
   content/songs.js): plain piano chords over a click, no rhythm. A tap
   plays one. To choose it they HOLD it and slide it up into the Add box
   that appears above (Rob, after Balatro: "you click on it and hold it
   down, and then a box above appears, and it says add, so you just slide it
   up to the box and drop it in"). Once chosen, that is the song: "They
   don't get to change. They can start another one if they like." A new song
   is a new band, built from the beginning; the old band is kept in
   progress.songs, and the Learner's Permit, earned once, stays. */
const BSMASH_DEFAULT_SONG = 'c-1-4-1-5';   // the C loops' own I IV I V
const BSMASH_HOLD_MS = 220;                // how long a card is held before it lifts
const BSMASH_HOLD_SLOP = 12;               // px a finger may move and still be a tap

function bsmashBandSongs() {
    const songs = (window.KR && KR.songs) || {};
    return ((window.KR && KR.bandSongs) || []).filter(id => songs[id]);
}

// The song this band is built on, or null if none has been chosen. A band
// begun before songs could be chosen was built on the C loops, I IV I V, and
// keeps it; with the teacher's Open code that is the song until one is chosen.
function bsmashSongOf(progress) {
    if (progress.song) return progress.song;
    const begun = BSMASH_MUSICIANS.some(m => progress.musicians[m.id].won || progress.musicians[m.id].plays > 0);
    return begun || KR.openAll() ? BSMASH_DEFAULT_SONG : null;
}

function bsmashSong() {
    return bsmashSongOf(bsmashLoad());
}

// A won part's style ('spicy'...) as the band plays it: over the chosen
// song, live, for the bass and keys. Drums have no chords.
function bsmashBandPart(instrument, style, song) {
    if (song === undefined) song = bsmashSong();
    if (!song || instrument === 'drums' || style === 'warmup') return style;
    return 'band:' + song + ':' + style;
}

function showBeatSongs() {
    bsmashStopAll();
    bsmash = { mode: 'songs', musician: BSMASH_MUSICIANS[0], delay: bsmashDelay(), song: null, audition: null };
    switchScreenState('beat', 'beat-screen-song');
    bsmashAudio();
    bsmashRenderSongs();
    bsmashResetDrop('beat-song-drop');
    bsmashEl('beat-song-add').hidden = true;
    // The little metronome runs from the start; a song joins it in time.
    bsmashBandStart({ click: 'click' });
    bsmashBandLevel(BSMASH_BAND_FULL);
    bsmashEvent(bsmashLoad().song ? 'beat.songs.ours' : 'beat.songs.open', { song: bsmashSongName(bsmashLoad().song) });
}

function bsmashSongName(id) {
    return id ? KR.t('song.' + id) : '';
}

function bsmashRenderSongs() {
    const box = bsmashEl('beat-song-cards');
    box.innerHTML = '';
    const ours = bsmashLoad().song;
    bsmashBandSongs().forEach(id => {
        const card = bsmashMake('button', 'bsmash-song-card', box); // text-ok: class names
        card.type = 'button';
        card.dataset.song = id;
        card.classList.toggle('ours', id === ours);
        bsmashMake('span', 'bsmash-song-icon', card).textContent = KR.t('song.' + id + '.icon');
        bsmashMake('span', 'bsmash-song-name', card).textContent = bsmashSongName(id);
        // The chords, for the teacher only: the children are just listening.
        if (KR.openAll()) bsmashMake('small', 'bsmash-song-chords', card).textContent = KR.t('song.' + id + '.chords');
        bsmashDragToAdd(card, {
            drop: 'beat-song-drop',
            active: () => !!(bsmash && bsmash.mode === 'songs' && !bsmash.adding),
            lift: () => auditionBeatSong(id),         // what goes in the box is what was heard
            add: () => addBeatSong(id),
        });
        card.onclick = () => { if (!bsmashJustDropped(card)) auditionBeatSong(id); };
    });
}

function auditionBeatSong(id) {
    if (!bsmash || bsmash.mode !== 'songs') return;
    bsmashAudio();
    bsmash.audition = id;
    bsmashBandSetPart('guide', 'guide:' + id);
    // Rob's audition for the song, where he has written one: his four-bar
    // phrase, and a simple drum part and bass line under it.
    const audition = bsmashAuditionOf(id);
    const extras = { phrase: audition.phrase ? 'phrase:' + id : null,
                     drums: audition.drums || null,
                     bass: audition.bass ? 'song:' + id + ':' + audition.bass : null };
    Object.keys(extras).forEach(part => {
        if (extras[part]) { if (bsmashBand.parts[part] !== extras[part]) bsmashBandSetPart(part, extras[part]); }
        else bsmashBandRemovePart(part);
    });
    bsmashBandLevel(BSMASH_BAND_FULL);
    document.querySelectorAll('#beat-song-cards .bsmash-song-card').forEach(card =>
        card.classList.toggle('on', card.dataset.song === id));
    // For a keyboard, or a child who would rather press: an Add button too.
    const add = bsmashEl('beat-song-add');
    add.hidden = false;
    add.textContent = KR.t('beat.songs.add', { song: bsmashSongName(id) });
}

function bsmashAuditionOf(id) {
    try { return BeatSmashBand.song(id).audition || {}; }
    catch (e) { return {}; }
}

function addAuditionedBeatSong() {
    if (bsmash && bsmash.audition) addBeatSong(bsmash.audition);
}

/* HOLD, THEN SLIDE UP INTO THE ADD BOX: the song chooser and the part
   picker both add this way. A quick tap is a tap (it plays the card); a
   finger that moves before the hold is up is not a hold. Once lifted the
   card follows the finger, the box appears above (its space was kept, so
   nothing moves under the finger) and lights when the card is over it.
   opts: drop (the box's id), active() (may a card be lifted now?), lift()
   (it was lifted: play it), add() (it was dropped in the box). */
let bsmashDrag = null;

function bsmashDragToAdd(card, opts) {
    const drop = () => bsmashEl(opts.drop);
    card.addEventListener('pointerdown', e => {
        if (!opts.active() || (e.button !== undefined && e.button !== 0)) return;
        const drag = bsmashDrag = { card: card, x: e.clientX, y: e.clientY, lifted: false, dropped: false, pointer: e.pointerId };
        drag.timer = setTimeout(() => {
            if (bsmashDrag !== drag || !opts.active()) return;
            drag.lifted = true;
            card.classList.add('lifted');
            try { card.setPointerCapture(drag.pointer); } catch (err) {}
            drop().hidden = false;
            opts.lift();
        }, BSMASH_HOLD_MS);
    });
    card.addEventListener('pointermove', e => {
        const drag = bsmashDrag;
        if (!drag || drag.card !== card) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.lifted) {
            if (Math.hypot(dx, dy) > BSMASH_HOLD_SLOP) { clearTimeout(drag.timer); bsmashDrag = null; }
            return;
        }
        e.preventDefault();
        card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.08)';
        drop().classList.toggle('over', bsmashOverBox(drop(), e.clientX, e.clientY));
    });
    const end = e => {
        const drag = bsmashDrag;
        if (!drag || drag.card !== card) return;
        clearTimeout(drag.timer);
        if (!drag.lifted) { bsmashDrag = null; return; }
        const over = e.type === 'pointerup' && bsmashOverBox(drop(), e.clientX, e.clientY);
        drag.dropped = true;                       // the click that follows is not a tap
        card.classList.remove('lifted');
        card.style.transform = '';
        drop().classList.remove('over');
        try { card.releasePointerCapture(drag.pointer); } catch (err) {}
        setTimeout(() => { if (bsmashDrag === drag) bsmashDrag = null; }, 0);
        if (over) opts.add();
        else drop().hidden = true;
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
}

// Was this card just dropped (so its click is not a tap)?
function bsmashJustDropped(card) {
    return !!(bsmashDrag && bsmashDrag.card === card && bsmashDrag.dropped);
}

function bsmashResetDrop(id) {
    const drop = bsmashEl(id);
    drop.hidden = true;
    drop.classList.remove('added', 'over');
    drop.querySelector('.bsmash-song-drop-label').textContent = KR.t('beat.songs.drop');
}

function bsmashOverBox(box, x, y) {
    const r = box.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

// The song goes in. Choosing a different song once a band has been begun
// is a new band, so it asks first; the old band is kept.
function addBeatSong(id) {
    if (!bsmash || bsmash.mode !== 'songs' || bsmash.adding) return;
    const progress = bsmashLoad();
    const current = bsmashSongOf(progress);
    const begun = BSMASH_MUSICIANS.some(m => progress.musicians[m.id].won || progress.musicians[m.id].plays > 0);
    if (current && current !== id && begun && !window.confirm(KR.t('beat.songs.newConfirm', { song: bsmashSongName(current) }))) {
        bsmashEl('beat-song-drop').hidden = true;
        return;
    }
    if (current !== id && begun) {
        progress.songs = (progress.songs || []).concat([{ song: current, musicians: progress.musicians, at: Date.now() }]);
        progress.musicians = {};
    }
    progress.song = id;
    progress.songAt = progress.songAt || Date.now();
    bsmashSave(progress);
    bsmash.adding = true;
    const drop = bsmashEl('beat-song-drop');
    drop.hidden = false;
    drop.classList.add('added');
    drop.querySelector('.bsmash-song-drop-label').textContent = KR.t('song.' + id + '.icon') + ' ' + bsmashSongName(id);
    bsmashBandSetPart('guide', 'guide:' + id);
    bsmashEl('beat-song-add').hidden = true;
    document.querySelectorAll('#beat-song-cards .bsmash-song-card').forEach(card => {
        card.classList.toggle('ours', card.dataset.song === id);
        card.disabled = true;
    });
    bsmashEvent('beat.songs.added', { song: bsmashSongName(id) });
    // Straight on to the band: the next musician to win, over this song.
    bsmashLater(() => {
        const next = bsmashNextMusician();
        if (next) startBeatMusician(next.id, true);
        else showBeatPathway();
    }, 2600);
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
    // A band is built on a song: no song chosen yet, choose one first.
    if (!bsmashSong()) return showBeatSongs();
    const record = bsmashUpdateMusician(id, { plays: bsmashMusicianRecord(id).plays + 1 });
    if (!keepBand) bsmashStopAll();
    const pads = bsmash && bsmash.pads;
    const frame = bsmash && bsmash.frame;
    bsmashStopTimers();
    const playing = step || record.step;
    bsmash = {
        mode: 'steps', musician: musician, step: playing, song: bsmashSong(),
        streak: bsmashOnRecord(record, playing) ? record.streak : 0,
        delay: bsmashDelay(), lastBeat: null, pads: pads, frame: frame, take: null, bars: null,
    };
    bsmashOpenStudio();
    bsmashEl('beat-screen-studio').classList.remove('jam');
    bsmashEl('beat-jam-next').hidden = true;
    bsmashEl('beat-jam-nav').hidden = true;
    bsmashEl('beat-jam-coming').hidden = true;
    bsmashEl('beat-light').hidden = true;
    const soFar = bsmashBandSoFar(id);
    bsmashBandStart(soFar);
    // Anything else playing (the song chooser's click and audition) stops.
    if (bsmashBand) Object.keys(bsmashBand.parts).filter(part => !(part in soFar)).forEach(bsmashBandRemovePart);
    bsmashBandLevel(BSMASH_BAND_QUIET);
    bsmashNewRoll();
    if (record.plays === 1) bsmashEvent('beat.musician.intro.' + id);
}

// The band under a musician's takes: every part won so far, and Tango's
// warm-up until the drums are won. Not the musician being won: that part
// is still to be earned.
function bsmashBandSoFar(playing) {
    const progress = bsmashLoad();
    const song = bsmashSongOf(progress);
    const parts = { drums: progress.musicians.drums.won ? progress.musicians.drums.part : 'warmup' };
    ['bass', 'keys'].forEach(id => {
        if (id !== playing && progress.musicians[id].won) parts[id] = bsmashBandPart(id, progress.musicians[id].part, song);
    });
    // The song itself, as plain piano chords, whenever the keys aren't in
    // the band (not won yet, or the student is playing them): every take is
    // played over the chord progression the student chose.
    if (song && (!progress.musicians.keys.won || playing === 'keys')) parts.guide = 'guide:' + song;
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

// THE SQUARES COME DOWN AT FOUR BARS. Rob, playtest 2, on the eight-bar
// step: "There should be notation." The fading picture is how one and two
// bars are first read; by four bars the student has read every bar of that
// musician's from notation three times in a row, twice over, so from there
// every take is read from the music, as the studio's is.
const BSMASH_PICTURE_STEPS = 2;            // the steps (1 and 2 bars) that start from the squares
function bsmashPictureStep() {
    return bsmash.step <= BSMASH_PICTURE_STEPS;
}

function bsmashNewRoll() {
    const record = bsmashMusicianRecord(bsmash.musician.id);
    const studio = bsmash.step === BSMASH_STUDIO_STEP;
    bsmash.scaffold = studio ? 'studio' : ['star1', 'star2', 'star3'][bsmash.streak];
    bsmash.bars = bsmashRoll(bsmash.musician, bsmash.step, record.clean, bsmash.bars);
    bsmash.studioTake = null;
    // Eight bars and more: the lines sit closer, so the pads stay on screen.
    bsmashEl('beat-screen-studio').classList.toggle('long', bsmash.bars.length >= 8);
    bsmash.specs = bsmash.bars.map(bsmashSpecs);
    bsmash.take = null;
    bsmash.takeNo = 1;
    bsmashEl('beat-take-stats').hidden = true;
    bsmashEl('beat-countin').hidden = true;
    bsmash.phase = 'roll';
    bsmash.pads.setCount(bsmashPadCount());
    bsmashHeader();
    bsmashControlRoom(null);
    bsmashEl('beat-reading').innerHTML = '';
    // The studio has no dice: the song is the song.
    if (studio) {
        bsmashRenderReading();
        bsmashShow('notation');
        return bsmashStudioReady(true);
    }
    bsmashTransport();
    bsmashDiceRoll(bsmash.bars);
    const picture = bsmashPictureStep();
    bsmashLater(() => {
        bsmashRenderReading();
        bsmashShow(picture && (bsmash.scaffold === 'star1' || bsmash.scaffold === 'star2') ? 'picture' : 'notation');
        bsmashLater(() => {
            bsmashDiceHide();
            bsmashScheduleTake(picture && bsmash.scaffold === 'star1' ? 'picture' : 'notation');
        }, 500);
    }, 1000);
}

/* =========================================
   THE STUDIO: 32 BARS, ONCE THROUGH
   =========================================
   Rob, 2026-10-01: "That wins you a chance to get into the studio and lay
   down your own 32 bars. If you can lay down 32 bars, you get to choose that
   instrument… on the 32 bars, that one has a transport bar with record and
   play, pause, stop." And: "They can listen back and decide if they're
   happy, and then they can try it again."
   So the studio is the one place with a transport: Record, Listen, Stop,
   and Keep once a take reaches the age's pass mark. The control room says
   how it went. The same 32 bars every take: the song is the song. Stop
   abandons a take (nothing is marked) and stops a listen-back; a pause in
   the middle of a recording would be a take that never happened, so Stop is
   the honest version of it. */
function bsmashStudioReady(fresh) {
    bsmash.phase = 'ready';
    bsmashBandLevel(BSMASH_BAND_QUIET);
    // The part picker is one good take away: fetch its loops now, so tapping
    // a picture plays at once instead of waiting for a download.
    BSMASH_STYLES.forEach(style => bsmashLoadLoop(bsmashLoopId(bsmash.musician.id, style)));
    bsmashTransport();
    if (fresh) bsmashEvent('beat.studio.ready', { bars: bsmash.specs.length });
}

// Which buttons are live depends on what is happening.
function bsmashTransport() {
    const box = bsmashEl('beat-transport');
    const studio = !!bsmash && bsmash.mode === 'steps' && bsmash.scaffold === 'studio';
    box.hidden = !studio;
    if (!studio) return;
    const phase = bsmash.phase;
    const recording = phase === 'wait' || phase === 'countin' || phase === 'take';
    const paused = phase === 'paused';
    const busy = recording || paused || phase === 'playback';
    const last = bsmash.studioTake;
    const record = bsmashEl('beat-transport-record');
    record.hidden = recording || paused;
    record.disabled = busy;
    // Pause while recording; Resume picks the take up from the bar it was
    // paused in (Rob, playtest 2: "I don't want to back out, I just want to
    // pause, right where I'm at").
    const pause = bsmashEl('beat-transport-pause');
    pause.hidden = !(recording || paused);
    pause.textContent = KR.t(paused ? 'beat.transport.resume' : 'beat.transport.pause');
    const play = bsmashEl('beat-transport-play');
    play.hidden = recording || paused;
    play.disabled = busy || !last;
    bsmashEl('beat-transport-stop').disabled = !busy;
    const keep = bsmashEl('beat-transport-keep');
    keep.hidden = !(last && last.passed) || recording || paused;
    keep.disabled = busy;
    box.classList.toggle('recording', recording);
    box.classList.toggle('paused', paused);
    box.classList.toggle('playing', phase === 'playback');
}

// Pause: the take stops where it is. Everything already played stands; the
// bar it was paused in, and every bar after, is played again on Resume.
function pauseBeatTake() {
    if (!bsmash || bsmash.scaffold !== 'studio') return;
    if (bsmash.phase === 'paused') return resumeBeatTake();
    const take = bsmash.take;
    if (!take || take.done || take.paused) return;
    const judged = bsmashNow() - bsmash.delay;
    const bar = Math.max(take.from / 4, Math.min(take.bars - 1, Math.floor((judged - take.start) / BSMASH_BAR)));
    bsmashCancel('take');
    take.paused = true;
    take.pauseBar = bar;
    const from = take.start + bar * BSMASH_BAR;
    take.notes.forEach(note => {
        if (note.bar < bar) return;
        ['hit', 'missed', 'short', 'wrongPad'].forEach(k => { note[k] = false; });
        note.press = null; note.near = undefined; note.offset = undefined;
        take.mustHit.delete(note);
    });
    take.rests.forEach(rest => { if (rest.bar >= bar) rest.tapped = false; });
    take.strays = take.strays.filter(stray => stray.t < from);
    take.presses = take.presses.filter(p => p.time < from);
    [...take.comebackBars].forEach(b => { if (b >= bar) take.comebackBars.delete(b); });
    bsmash.phase = 'paused';
    bsmashEl('beat-rec').classList.remove('recording');
    bsmashCountIn(null);
    bsmashEvent('beat.studio.paused');
    bsmashTransport();
}

// Resume: counted back in at the same place in the band's loop, so every
// chord falls where it fell, and on from the bar it was paused in.
function resumeBeatTake() {
    const take = bsmash.take;
    if (!take || !take.paused) return;
    const bar = take.pauseBar;
    let at = Math.max(0, Math.ceil((bsmashNow() + 0.35 - bsmashBand.start) / BSMASH_BAR - 1e-6)) + 1;
    while (((at - (take.startBar + bar)) % 4 + 4) % 4) at++;
    take.startBar = at - bar;
    take.countInBar = at - 1;
    take.start = bsmashBand.start + take.startBar * BSMASH_BAR;
    take.end = take.start + take.bars * BSMASH_BAR;
    take.firstBeat = Math.round((take.start - bsmashBand.start) / BSMASH_BEAT);
    take.from = bar * 4;
    take.playFrom = take.start + bar * BSMASH_BAR;
    take.notes.concat(take.rests).forEach(item => {
        if (item.bar < bar) return;
        item.t = take.start + (item.bar * 4 + item.spec.slot) * BSMASH_BEAT;
        item.end = item.t + item.spec.slots * BSMASH_BEAT;
    });
    take.paused = false;
    bsmashBookTake(take);
    bsmash.phase = 'wait';
    if (bsmash.page) bsmashTurnPage(Math.floor(bar / bsmash.page.perLine));
    bsmashTransport();
}

function recordBeatTake() {
    if (!bsmash || bsmash.scaffold !== 'studio' || (bsmash.phase !== 'ready' && bsmash.phase !== 'verdict')) return;
    bsmashControlRoom(null);
    bsmashRenderReading();
    bsmashShow('notation');
    bsmashScheduleTake('notation');
    bsmashTransport();
}

function stopBeatTake() {
    if (!bsmash || bsmash.scaffold !== 'studio') return;
    if (bsmash.phase === 'playback') {
        bsmashCancel('playback');
        bsmash.playback = null;
        bsmash.phase = 'verdict';
        document.querySelectorAll('#beat-reading .bsmash-playline').forEach(el => { el.hidden = true; });
        return bsmashTransport();
    }
    const take = bsmash.take;
    if (!take || take.done) return;
    bsmashCancel('take');
    take.done = true;
    take.paused = false;
    bsmash.take = null;
    bsmashEl('beat-rec').classList.remove('recording');
    bsmashCountIn(null);
    bsmashRenderReading();
    bsmashShow('notation');
    bsmash.phase = bsmash.studioTake ? 'verdict' : 'ready';
    if (bsmash.studioTake) bsmashControlRoom(bsmash.studioTake);
    bsmashEvent('beat.studio.stopped');
    bsmashTransport();
}

function playBeatTake() {
    if (!bsmash || !bsmash.studioTake || bsmash.phase !== 'verdict') return;
    bsmashListenBack(bsmash.studioTake);
}

// Keep: the take is laid down, and the instrument is theirs to choose.
function keepBeatTake() {
    const take = bsmash && bsmash.studioTake;
    if (!take || !take.passed || bsmash.phase !== 'verdict') return;
    bsmashEl('beat-transport').hidden = true;
    bsmashControlRoom(null);
    if (bsmashMusicianRecord(bsmash.musician.id).won) return openBeatBand();
    bsmashOpenPicker(take.cameBack);
}

// The control room: how the take went, against the age's pass mark.
function bsmashControlRoom(take) {
    const box = bsmashEl('beat-control');
    box.hidden = !take;
    if (!take) return;
    const score = Math.round(take.score * 100);
    const mark = Math.round(BSMASH_PASS_MARK[bsmashAge()] * 100);
    box.classList.toggle('passed', take.passed);
    box.querySelector('.bsmash-control-fill').style.width = score + '%';
    box.querySelector('.bsmash-control-mark').style.left = mark + '%';
    box.querySelector('.bsmash-control-score').textContent = KR.t('beat.control.score', { score: score, mark: mark });
}

function bsmashStudioVerdict(take, score) {
    take.score = score;
    take.passed = score >= BSMASH_PASS_MARK[bsmashAge()];
    bsmash.studioTake = take;
    bsmash.lastScore = score;
    if (take.passed) {
        bsmashEl('beat-reading').classList.add('clean');
        bsmashBandLevel(BSMASH_BAND_FULL);
        bsmashStarSound();
        const record = bsmashMusicianRecord(bsmash.musician.id);
        bsmashUpdateMusician(bsmash.musician.id, { clean: record.clean + 1 });
    }
    bsmashControlRoom(take);
    const vars = { score: Math.round(score * 100), mark: Math.round(BSMASH_PASS_MARK[bsmashAge()] * 100) };
    bsmashEvent(take.passed ? 'beat.studio.passed' : 'beat.studio.again', vars);
    bsmashTransport();
}

/* ---------- A take (§4) ----------
   It starts on a barline of the song, so it is locked to the band: one bar
   of count-in (Tango's count; beat 1 is home base), then the bars. Every
   note's time is known on the audio clock before it sounds; a press is
   judged against it with the device's delay taken off. */
/* THE TAKE COMES IN AT THE TOP OF THE LOOP (Rob, playtest 2). "You're going
   to need to start the counting at the beginning of a four-bar cycle in the
   backing track… the fourth bar of the loop is the only place where the count
   can happen. This isn't necessary for one bar… the two bars start on either
   bar one or bar three. The preparation has to be there to guide them to the
   beginning of the four-bar loop… understanding four-bar phrases is very
   important in music." So four bars and more start on bar 1 of the band's
   loop, counted in on bar 4; two bars on bar 1 or 3; one bar on any bar. The
   loop guide in the header (#beat-loop) shows which bar of the loop is
   playing and where the count will come. */
function bsmashTakeStartBar(bars) {
    const align = bars >= 4 ? 4 : bars === 2 ? 2 : 1;
    // The first bar a count-in can still be booked on, a moment ahead.
    let countIn = Math.max(0, Math.ceil((bsmashNow() + 0.35 - bsmashBand.start) / BSMASH_BAR - 1e-6));
    while ((countIn + 1) % align) countIn++;
    return countIn + 1;
}

// The loop guide: four boxes, one per bar of the band's loop; the bar
// playing now, and the bar the count-in will come on.
function bsmashLoopGuide(bar) {
    const box = bsmashEl('beat-loop');
    box.hidden = !bsmash || bsmash.mode !== 'steps';
    if (box.hidden) return;
    const take = bsmash.take;
    const countBar = take && !take.done && !take.paused && bar <= take.countInBar ? take.countInBar : null;
    [...box.children].forEach((cell, i) => {
        cell.classList.toggle('now', i === ((bar % 4) + 4) % 4);
        cell.classList.toggle('count', countBar !== null && i === countBar % 4);
    });
}

function bsmashScheduleTake(go) {
    const bars = bsmash.specs.length;
    const startBar = bsmashTakeStartBar(bars);
    const start = bsmashBand.start + startBar * BSMASH_BAR;
    const take = {
        go: go,
        flashPicture: bsmash.scaffold === 'star2' && go === 'notation' && bsmashPictureStep(),
        start: start,
        end: start + bars * BSMASH_BAR,
        bars: bars,
        startBar: startBar,
        countInBar: startBar - 1,
        from: 0,                  // the beat of the take playing starts on: 0, or later after a pause
        playFrom: start,
        firstBeat: Math.round((start - bsmashBand.start) / BSMASH_BEAT),
        win: bsmashWindow(),
        notes: [],
        rests: [],
        strays: [],
        comebackBars: new Set(),
        mustHit: new Set(),
        presses: [],
        cameBack: false,
        lostBar: false,
        done: false,
    };
    bsmash.specs.forEach((specs, bar) => specs.forEach((spec, index) => {
        const t = start + (bar * 4 + spec.slot) * BSMASH_BEAT;
        const item = { t: t, end: t + spec.slots * BSMASH_BEAT, bar: bar, index: index, spec: spec };
        (spec.isRest ? take.rests : take.notes).push(item);
    }));
    bsmashBookTake(take);
    bsmash.take = take;
    bsmash.phase = 'wait';
    bsmashBandLevel(BSMASH_BAND_QUIET);
    bsmashEl('beat-reading').classList.remove('clean');
}

// The take's clicks, and Tango's count-in, from the beat it plays from.
function bsmashBookTake(take) {
    bsmashCancel('take');
    for (let beat = take.from - 4; beat < take.bars * 4; beat++) {
        const inBar = ((beat % 4) + 4) % 4;
        const takeBar = Math.floor(beat / 4);
        bsmashAt(take.start + beat * BSMASH_BEAT,
            t => bsmashClick(t, inBar, inBar === 0 && take.comebackBars.has(takeBar)), 'take');
        // Tango counts it in, in time: the same voice as "Follow me".
        if (beat < take.from) bsmashAt(take.start + beat * BSMASH_BEAT, t => raudioSyllable(t, String(inBar + 1), inBar === 0, inBar), 'take');
    }
}

function bsmashPress(p) {
    if (!bsmash) return;
    bsmashPadSound(p, bsmashSoundKind());
    if (bsmash.mode === 'jam') return bsmashJamPress(p);
    const take = bsmash.take;
    if (!take || take.done || take.paused) return;
    const t = p.time;
    // Taps in the count-in, or after the last note, are free; but a press
    // within half a beat of the first note is that note, early.
    if (t < take.playFrom - Math.max(take.win, BSMASH_NEAR_BEAT * BSMASH_BEAT) || t > take.end + take.win) return;
    take.presses.push(p);     // what the student played, for listening back
    let best = null;
    take.notes.forEach(note => {
        if (note.hit || note.missed || Math.abs(t - note.t) > take.win) return;
        if (!best || Math.abs(t - note.t) < Math.abs(t - best.t)) best = note;
    });
    if (best) {
        best.hit = true;
        best.press = p;
        best.offset = t - best.t;
        p.note = best;
        // On the four beat pads the pad IS the beat. Rob, 2026-10-01: "If you
        // press button number one at what should be beat number three, then
        // we need to call an alert to tell them to follow along the beats.
        // Get on the beat." It sounded, in time, but it isn't clean: the
        // right pad lights to show where that beat lives.
        if (bsmash.pads.count === 4 && p.pad !== best.spec.slot) {
            best.wrongPad = true;
            bsmash.pads.flash(best.spec.slot, 'demo', 500);
            if (!take.saidWrongPad) { take.saidWrongPad = true; bsmashEvent('beat.take.wrongPad'); }
        }
        if (take.mustHit.has(best)) take.cameBack = true;
        const block = bsmash.layout[best.bar] && bsmash.layout[best.bar].blocks[best.index];
        if (block && take.go === 'picture') {
            block.classList.add('lit');
            block.children[0].classList.add('filled');
        }
        return;
    }
    // Not a note. Honest: it still sounded, and the take isn't clean. Near
    // a note still to be played, it is that note, early or late: a press a
    // little before beat 3 is beat 3 played early, not a tap in beat 2's
    // rest (playtest 1, §4.1). Otherwise a tap in a rest, or one too many.
    const stray = { press: p, t: t, note: bsmashNearNote(take, t), rest: null };
    if (stray.note) {
        if (!stray.note.near) stray.note.near = stray;
    } else {
        stray.rest = take.rests.find(r => t >= r.t && t < r.end) || null;
        const block = stray.rest && bsmash.layout[stray.rest.bar] && bsmash.layout[stray.rest.bar].blocks[stray.rest.index];
        if (block) { block.classList.remove('shake'); void block.offsetWidth; block.classList.add('shake'); }
    }
    take.strays.push(stray);
    bsmashSlip(Math.floor((t - take.start) / BSMASH_BAR));
}

// The nearest note not yet played within half a beat of a press, or null.
function bsmashNearNote(take, t) {
    let near = null;
    take.notes.forEach(note => {
        if (note.hit || Math.abs(t - note.t) >= BSMASH_NEAR_BEAT * BSMASH_BEAT) return;
        if (!near || Math.abs(t - note.t) < Math.abs(t - near.t)) near = note;
    });
    return near;
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
    if (!take || bsmash.step <= BSMASH_CLEAN_STEPS) return;
    const next = Math.max(0, bar) + 1;
    if (next >= take.bars || take.comebackBars.has(next)) return;
    take.comebackBars.add(next);
    const first = take.notes.find(n => n.bar >= next);
    if (first) take.mustHit.add(first);
    bsmashEvent('beat.take.findOne');
}

function bsmashTakeFrame() {
    const take = bsmash.take;
    if (take.paused) return;
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
   Never milliseconds, never "failed". Clean: the bar glows. Not clean: what
   went wrong is marked under the staff, and the verdict NAMES THE REASON
   (playtest 1, §4.1). Riff's "Hold those long notes right through" used to
   be his line for every failed take, so a take lost to an early press
   blamed the holding. */
function bsmashVerdict() {
    const take = bsmash.take;
    bsmash.phase = 'verdict';
    const issues = bsmashTakeIssues(take);
    bsmashOpenPage(issues.length ? issues[0].place.bar : 0);
    issues.forEach((issue, i) => bsmashMarkIssue(issue, i === 0));
    bsmashTakeStats(take);
    const hits = take.notes.filter(n => n.hit && !n.short && !n.wrongPad).length;
    const score = hits / Math.max(1, take.notes.length + take.strays.length);
    // The studio: the pass mark, and the student decides what happens next.
    if (bsmash.scaffold === 'studio') return bsmashStudioVerdict(take, score);
    // One and two bars: every note right. Four and eight: the age's pass
    // mark, and back in by the next beat 1 after any slip (§6).
    const passed = bsmash.step <= BSMASH_CLEAN_STEPS ? !issues.length
        : score >= BSMASH_PASS_MARK[bsmashAge()] && !take.lostBar;
    if (!passed) return bsmashTakeTwo(issues);
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

/* Everything that went wrong in a take, in the order it happened. Each is
   one reason:
     wrongPad  played in time, on another beat's pad
     short     a long note let go too soon
     early     a note played before its window (within half a beat)
     late      a note played after its window (within half a beat)
     missed    a note not played at all
     rest      a tap in a rest
     extra     one tap too many (a second press for a note already played) */
function bsmashTakeIssues(take) {
    const issues = [];
    const at = (t, reason, item, place) => issues.push({ t: t, reason: reason, item: item, place: place || item });
    take.notes.forEach(note => {
        if (note.wrongPad) at(note.t, 'wrongPad', note);
        if (note.short) at(note.press.up, 'short', note);
        if (note.hit) return;
        if (note.near) at(note.near.t, note.near.t < note.t ? 'early' : 'late', note);
        else at(note.t, 'missed', note);
    });
    take.strays.forEach(stray => {
        if (stray.note && stray.note.near === stray && !stray.note.hit) return;   // the note's own early or late
        if (stray.rest) return at(stray.t, 'rest', stray.rest);
        at(stray.t, 'extra', stray.note, stray.note || bsmashBeatAt(take, stray.t));
    });
    return issues.sort((a, b) => a.t - b.t);
}

// The beat a press landed nearest, as a place to mark: { bar, slot, slots }.
function bsmashBeatAt(take, t) {
    const beats = Math.max(0, Math.min(take.bars * 4 - 1, Math.round((t - take.start) / BSMASH_BEAT)));
    return { bar: Math.floor(beats / 4), spec: { slot: beats % 4, slots: 1 } };
}

// The picture marks it: a bar under the staff, and the block outlined. The
// one the verdict names is marked more strongly, early or late said in a word.
function bsmashMarkIssue(issue, named) {
    const place = issue.place;
    const mark = bsmashMarkUnder(place.bar, place.spec.slot, place.spec.slots);
    const block = place.index !== undefined && bsmash.layout[place.bar] && bsmash.layout[place.bar].blocks[place.index];
    if (block) block.classList.add('missed');
    if (!named || !mark) return;
    mark.classList.add('named');
    if (block) block.classList.add('named');
    if (issue.reason === 'early' || issue.reason === 'late') {
        mark.setAttribute('data-why', KR.t('beat.light.' + issue.reason));
    }
}

// A failed take: say why, and which take is next. "If it's take three, you
// gotta say take three" (playtest 1, §4.2).
function bsmashTakeTwo(issues) {
    const reason = issues && issues.length ? issues[0].reason : 'missed';
    bsmash.takeNo = (bsmash.takeNo || 1) + 1;
    bsmashEvent('beat.take.why.' + reason, { take: bsmashTakeWords() });
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

// "Take three!", in words up to ten, then in figures.
function bsmashTakeWords() {
    const n = bsmash.takeNo;
    const number = KR.lookup('beat.number.' + n, KR.current) !== null ? KR.t('beat.number.' + n) : String(n);
    return KR.t('beat.take.number', { n: number });
}

/* The teacher's view (the teacher code on): each note of the last take in
   milliseconds, so the thresholds can be tuned from real play rather than
   guessed (playtest 1, §4.1). A child never sees it. */
function bsmashTakeStats(take) {
    const box = bsmashEl('beat-take-stats');
    if (!box) return;
    box.hidden = !KR.openAll();
    if (box.hidden) return;
    const ms = seconds => (seconds >= 0 ? '+' : '−') + Math.round(Math.abs(seconds) * 1000); // text-ok: a sign
    const place = (bar, slot) => (bar + 1) + '.' + (slot + 1);
    const lines = [KR.t('beat.stats.window', { win: Math.round(take.win * 1000) })];
    take.notes.forEach(note => {
        const vars = { at: place(note.bar, note.spec.slot) };
        if (note.hit) {
            vars.ms = ms(note.offset);
            if (note.press.up !== null && note.spec.slots > 1) {
                vars.held = ms(note.press.up - (note.t + note.spec.slots * BSMASH_BEAT));
                lines.push(KR.t(note.short ? 'beat.stats.short' : 'beat.stats.held', vars));
            } else lines.push(KR.t(note.wrongPad ? 'beat.stats.wrongPad' : 'beat.stats.hit', vars));
        } else if (note.near) {
            vars.ms = ms(note.near.t - note.t);
            lines.push(KR.t('beat.stats.near', vars));
        } else lines.push(KR.t('beat.stats.missed', vars));
    });
    take.strays.forEach(stray => {
        if (stray.note && stray.note.near === stray && !stray.note.hit) return;
        const beat = bsmashBeatAt(take, stray.t);
        const vars = { at: place(beat.bar, beat.spec.slot), ms: ms(stray.t - (take.start + (beat.bar * 4 + beat.spec.slot) * BSMASH_BEAT)) };
        lines.push(KR.t(stray.rest ? 'beat.stats.rest' : 'beat.stats.extra', vars));
    });
    box.textContent = lines.join(' · ');
}

function bsmashReveal() {
    bsmash.phase = 'reveal';
    const progress = bsmashLoad();
    const seconds = progress.seenMorph ? BSMASH_MORPH_S : BSMASH_MORPH_FIRST_S;
    progress.seenMorph = true;
    bsmashSave(progress);
    bsmashEvent('beat.reveal');
    bsmash.takeNo = 1;     // reading it from the music is a fresh go
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
            // The name and age are asked after the first win, never before (§11).
        const player = bsmashPlayer();
        if (firstStar && (!player || BSMASH_AGES.indexOf(player.age) === -1)) return showBeatPlayers(true);
        bsmashNewRoll();
    };
    bsmashLater(next, cleared ? 4200 : 2200);
}

// The take, played back over the band from the same place in the song, so
// every chord falls where it fell when it was played.
function bsmashListenBack(take) {
    if (!bsmashBand) return;
    bsmash.phase = 'playback';
    bsmashBandLevel(BSMASH_BAND_FULL);
    const takeBar = Math.round((take.start - bsmashBand.start) / BSMASH_BAR);
    let bar = Math.ceil((bsmashNow() + 0.6 - bsmashBand.start) / BSMASH_BAR);
    while (((bar - takeBar) % 4 + 4) % 4) bar++;
    const start = bsmashBand.start + bar * BSMASH_BAR;
    const kind = bsmashSoundKind();
    bsmashCancel('playback');
    take.presses.forEach(p => {
        const at = start + (p.time - take.start);
        const held = p.up !== null ? Math.max(0.08, p.up - p.time) : 0.15;
        bsmashAt(at, t => {
            try { BeatSmashBand.pad(raudioCtx, bsmashPadBus, t, kind, bsmashChordAt(t)).release(t + held); }
            catch (e) { /* a dud sound must not stop the playback */ }
        }, 'playback');
    });
    const playback = { start: start, end: start + take.bars * BSMASH_BAR, notes: take.presses.length, line: -1 };
    bsmash.playback = playback;
    bsmashEvent('beat.studio.listen');
    bsmashTransport();
    const wait = (start + take.bars * BSMASH_BAR - bsmashNow()) * 1000 + 900;
    bsmashLater(() => {
        if (!bsmash || bsmash.playback !== playback) return;
        bsmash.playback = null;
        bsmash.phase = 'verdict';
        document.querySelectorAll('#beat-reading .bsmash-playline').forEach(el => { el.hidden = true; });
        bsmashTransport();
    }, wait);
}

// While listening back, a green line moves through the music with the sound
// (Rob, playtest 2: "There should be a playback line… it's really hard to
// tell exactly when you start"), and the music scrolls a line at a time.
function bsmashFollowPlayback() {
    const playback = bsmash.playback, page = bsmash.page;
    if (!playback || !page) return;
    // Until the playback reaches its place in the loop, the line waits at
    // the start of the music, so they can see where it will begin.
    const beats = Math.max(0, (bsmashHeardNow() - playback.start) / BSMASH_BEAT);
    const bar = Math.floor(beats / 4);
    document.querySelectorAll('#beat-reading .bsmash-playline').forEach(el => { el.hidden = true; });
    const entry = bsmash.layout[bar];
    if (entry) {
        const playline = entry.picture.parentNode.querySelector('.bsmash-playline');
        playline.style.left = entry.layout.pulseX(beats - bar * 4) + 'px';
        playline.hidden = false;
    }
    const line = Math.max(0, Math.min(page.lines.length - 1, Math.floor(bar / page.perLine)));
    if (line === playback.line) return;
    playback.line = line;
    const reading = bsmashEl('beat-reading');
    const el = page.lines[line];
    if (el && reading.classList.contains('review')) reading.scrollTo({ top: el.offsetTop - reading.offsetTop, behavior: 'smooth' });
}

// The Learner's Permit: L plates, presented by Tango, with their band on it.
function bsmashShowPermit() {
    const progress = bsmashLoad();
    if (!progress.permit) return showBeatPathway();
    switchScreenState('beat', 'beat-screen-permit');
    const card = bsmashEl('beat-permit-card');
    card.innerHTML = '';
    const plate = bsmashMake('div', 'bsmash-plate', card);
    plate.textContent = KR.t('beat.permit.plate');
    const title = bsmashMake('h2', 'bsmash-permit-title', card);
    title.textContent = KR.t('beat.permit.title');
    const player = bsmashPlayer();
    const who = bsmashMake('div', 'bsmash-permit-name', card);
    who.textContent = player ? player.name : '';
    const band = bsmashMake('div', 'bsmash-permit-band', card);
    ['drums', 'bass', 'keys'].forEach(id => {
        const record = progress.musicians[id];
        if (!record.won) return;
        const row = bsmashMake('div', 'bsmash-permit-part style-' + record.part, band); // text-ok: class names
        row.textContent = KR.t('beat.permit.part', { part: KR.t('beat.channel.' + id), style: KR.t('beat.style.' + record.part) });
    });
    const when = bsmashMake('div', 'bsmash-permit-date', card);
    when.textContent = new Date(progress.permit.at).toLocaleDateString();
    bsmashEvent('beat.permit.awarded');
}

function showBeatPermit() {
    bsmashStopAll();
    bsmashShowPermit();
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
    bsmashEl('beat-picker-next').hidden = true;
    bsmashResetDrop('beat-picker-drop');
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
            bsmashDragToAdd(card, {
                drop: 'beat-picker-drop',
                active: () => !!(bsmash && bsmash.picker && !bsmash.picker.locked),
                lift: () => auditionBeatPart(style),
                add: () => { auditionBeatPart(style); bsmashKeepPart(false); },
            });
            card.onclick = () => { if (!bsmashJustDropped(card)) auditionBeatPart(style); };
        });
        cards.hidden = false;
        bsmashEl('beat-picker-drop').classList.remove('added');
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
    bsmashBandSetPart(bsmash.musician.id, bsmashBandPart(bsmash.musician.id, style));
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
    bsmashUpdateMusician(id, { won: true, part: style, step: BSMASH_STUDIO_STEP, streak: 0 });
    // The band is complete: the Learner's Permit (§15). It used to wait for
    // a booth of its own; now every musician ends in the studio, so the
    // third part laid down is the L plates.
    const progress = bsmashLoad();
    if (!progress.permit && BSMASH_MUSICIANS.every(m => progress.musicians[m.id].won)) {
        progress.permit = { at: Date.now(), bars: bsmashBarCount(bsmash.musician, BSMASH_STUDIO_STEP) };
        bsmashSave(progress);
    }
    if (quietly) return;
    bsmashBandSetPart(id, bsmashBandPart(id, style));
    // The keys won: they play the chords now, so the guide piano steps out.
    if (id === 'keys') bsmashBandRemovePart('guide');
    bsmashBandLevel(BSMASH_BAND_FULL);
    bsmashRenderDesk('beat-picker-desk');
    bsmashEl('beat-picker-desk').classList.remove('dim');
    document.querySelectorAll('#beat-picker-cards .bsmash-style-card').forEach(card => {
        card.classList.toggle('chosen', card.getAttribute('data-style') === style);
        card.disabled = true;
    });
    bsmashEl('beat-picker-keep').hidden = true;
    // The part in the box: added to the band.
    const drop = bsmashEl('beat-picker-drop');
    drop.hidden = false;
    drop.classList.add('added');
    drop.querySelector('.bsmash-song-drop-label').textContent = KR.t('beat.style.' + style + '.icon') + ' ' + KR.t('beat.style.' + style);
    bsmashEvent('beat.part.locked.' + id, { style: KR.t('beat.style.' + style) });
    bsmashLater(() => {
        bsmashEl('beat-picker-done').hidden = false;
        bsmashShowNext();
        bsmashPlayback();
    }, 3000);
}

// The band playing back. With only the drums it is not yet "how much you've
// built" (playtest 1, §3.2): it is where the band starts.
function bsmashPlayback() {
    const progress = bsmashLoad();
    const won = ['drums', 'bass', 'keys'].filter(id => progress.musicians[id].won).length;
    bsmashEvent(won === 1 ? 'beat.playback.first' : 'beat.playback');
}

// Who is next to be won: the first musician not won yet. Null once the band
// is complete.
function bsmashNextMusician() {
    const progress = bsmashLoad();
    return BSMASH_MUSICIANS.find(m => m.built && !progress.musicians[m.id].won) || null;
}

// Lead straight on (playtest 1, §3.2): "Next: Riff · Bass", not only back to
// the menu. The band keeps playing into the next musician's takes.
function bsmashShowNext() {
    const next = bsmashNextMusician();
    const button = bsmashEl('beat-picker-next');
    const permit = !next && !!bsmashLoad().permit;
    button.hidden = !next && !permit;
    if (next) button.textContent = KR.t('beat.button.next', { who: KR.t('beat.musician.' + next.id) });
    else if (permit) button.textContent = KR.t('beat.permit.show');
}

// Next: the next musician, or, with the band complete, the L plates.
function startNextBeatMusician() {
    const next = bsmashNextMusician();
    if (next) return startBeatMusician(next.id, true);
    if (bsmashLoad().permit) bsmashShowPermit();
}

function keepBeatPart() {
    if (bsmash && bsmash.picker && bsmash.picker.choice) bsmashKeepPart(false);
}

/* ---------- Playback: the band, loud (§8, step 5) ---------- */
function openBeatBand() {
    const progress = bsmashLoad();
    const song = bsmashSongOf(progress);
    const parts = {};
    ['drums', 'bass', 'keys'].forEach(id => {
        if (progress.musicians[id].won) parts[id] = bsmashBandPart(id, progress.musicians[id].part, song);
    });
    if (!Object.keys(parts).length) return;
    if (song && !progress.musicians.keys.won) parts.guide = 'guide:' + song;
    const keepBand = !!bsmashBand;
    if (!keepBand) bsmashStopAll();
    if (!bsmash) bsmash = { mode: 'band', musician: BSMASH_MUSICIANS[0], delay: bsmashDelay() };
    bsmash.song = song;
    bsmashStopTimers();
    bsmash.picker = { heard: [], choice: null, locked: true };
    switchScreenState('beat', 'beat-screen-picker');
    bsmashEl('beat-picker-title').textContent = KR.t('beat.band.title');
    bsmashRenderDesk('beat-picker-desk');
    bsmashEl('beat-picker-desk').classList.remove('dim');
    const cards = bsmashEl('beat-picker-cards');
    cards.innerHTML = '';
    cards.hidden = false;
    ['drums', 'bass', 'keys'].filter(id => progress.musicians[id].won).forEach(id => {
        const part = progress.musicians[id].part;
        const card = bsmashMake('button', 'bsmash-style-card', cards);
        card.type = 'button';
        card.classList.add('chosen', 'style-' + part);
        card.disabled = true;
        bsmashStylePicture(card, id, part);
        const name = bsmashMake('span', 'bsmash-style-name', card);
        name.textContent = KR.t('beat.channel.' + id);
    });
    bsmashEl('beat-picker-keep').hidden = true;
    bsmashEl('beat-picker-done').hidden = false;
    bsmashResetDrop('beat-picker-drop');
    bsmashShowNext();
    bsmashAudio();
    Object.keys(parts).forEach(id => {
        if (bsmashBand && bsmashBand.parts[id] !== parts[id]) bsmashBandSetPart(id, parts[id]);
    });
    bsmashBandStart(parts);
    bsmashBandLevel(BSMASH_BAND_FULL);
    bsmashPlayback();
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
   won = icon + name + the part chosen. The musicians in order. Start
   appears once a node is selected. */
let bsmashSelected = null;

function showBeatPathway() {
    bsmashStopAll();
    switchScreenState('beat', 'beat-screen-pathway');
    renderBeatPathway();
}

// Tango opens once the warm-up has been played (Rob, playtest 2: the warm-up
// is its own square, first on the left); each musician after once the one
// before is won.
function bsmashUnlocked(index, progress) {
    const musician = BSMASH_MUSICIANS[index];
    if (!musician.built) return false;
    if (KR.openAll()) return true;          // the teacher's Open code
    if (index === 0) return !!progress.jamDone && !!bsmashSongOf(progress);
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
    // The warm-up, first on the left: always open.
    const warm = bsmashMake('button', 'pathway-node unlocked', track); // text-ok: class names
    warm.dataset.id = 'jam';
    if (progress.jamDone) warm.classList.add('cleared');
    bsmashMake('span', 'pathway-node-icon', warm).textContent = KR.t('beat.warmup.icon');
    bsmashMake('span', 'pathway-node-label', warm).textContent = KR.t('beat.step.jam');
    warm.onclick = () => selectBeatMusician('jam');
    bsmashSelected = 'jam';
    // The song, second: chosen after the warm-up, and the band is built on it.
    const song = bsmashSongOf(progress);
    const songOpen = !!progress.jamDone || KR.openAll();
    const songNode = bsmashMake('button', 'pathway-node', track);
    songNode.dataset.id = 'song';
    songNode.classList.add(songOpen ? 'unlocked' : 'locked');
    if (song) songNode.classList.add('cleared');
    songNode.disabled = !songOpen;
    bsmashMake('span', 'pathway-node-icon', songNode).textContent = song ? KR.t('song.' + song + '.icon') : KR.t('beat.song.icon');
    bsmashMake('span', 'pathway-node-label', songNode).textContent = song ? bsmashSongName(song) : KR.t('beat.song.node');
    if (songOpen) {
        songNode.onclick = () => selectBeatMusician('song');
        if (!song) bsmashSelected = 'song';
    }
    BSMASH_MUSICIANS.forEach((musician, index) => {
        const open = bsmashUnlocked(index, progress);
        const record = progress.musicians[musician.id];
        const node = bsmashMake('button', 'pathway-node', track);
        node.dataset.id = musician.id;
        node.classList.add(open ? 'unlocked' : 'locked');
        if (record.won) node.classList.add('cleared');
        node.disabled = !open;
        const icon = bsmashMake('span', 'pathway-node-icon', node);
        icon.textContent = KR.t('beat.musician.' + musician.id + '.icon');
        // Locked musicians show who they are too, dimmed: the band still to win.
        const label = bsmashMake('span', 'pathway-node-label', node);
        label.textContent = KR.t('beat.musician.' + musician.id);
        if (open) {
            if (record.won) {
                const won = bsmashMake('small', null, node);
                won.textContent = KR.t('beat.style.' + record.part);
            }
            node.onclick = () => selectBeatMusician(musician.id);
            if (!record.won || bsmashSelected === 'jam') bsmashSelected = musician.id;
        }
    });
    selectBeatMusician(bsmashSelected);
    bsmashRenderStats();
    const won = id => progress.musicians[id].won;
    const say = progress.permit ? 'beat.pathway.permit'
        : won('bass') ? 'beat.pathway.keys' : won('drums') ? 'beat.pathway.riff' : 'beat.pathway.say';
    const riff = won('drums') && !won('keys');
    KR.say(say, { box: bsmashEl('beat-pathway-guide'), silent: true, speaker: riff ? 'riff' : 'tango' });
    bsmashRenderPathwaySettings();
}

function selectBeatMusician(id) {
    bsmashSelected = id;
    document.querySelectorAll('#beat-pathway-track .pathway-node').forEach(node =>
        node.classList.toggle('recommended', node.dataset.id === id));
    const progress = bsmashLoad();
    if (id === 'jam') bsmashSelectedStep = 'jam';
    else if (id === 'song') bsmashSelectedStep = 'song';
    else {
        const record = progress.musicians[id];
        bsmashSelectedStep = record.won ? 'band' : record.step;
    }
    bsmashRenderSteps();
}

/* ---------- The steps, on the pathway ----------
   Every step the student has reached can be played again, the warm-up
   included: nothing opened is ever closed. With the teacher code on
   (teacher-codes.js) every step is open. */
let bsmashSelectedStep = null;

function bsmashStepChoices(id) {
    if (id === 'jam') return ['jam'];
    if (id === 'song') return ['song'];
    const progress = bsmashLoad();
    const record = progress.musicians[id];
    const reached = KR.openAll() || record.won ? BSMASH_STUDIO_STEP : record.step;
    const choices = [];
    for (let step = 1; step <= reached; step++) choices.push(step);
    if (record.won) choices.push('band');
    // With the band complete, the Permit can be seen again from any of them.
    if (progress.permit) choices.push('permit');
    return choices;
}

function bsmashRenderSteps() {
    const row = bsmashEl('beat-steps');
    row.innerHTML = '';
    bsmashStepChoices(bsmashSelected).forEach(step => {
        const chip = bsmashMake('button', 'bsmash-chip bsmash-step-chip', row); // text-ok
        chip.type = 'button';
        chip.textContent = step === 'song' && bsmashSong() ? KR.t('beat.step.ourSong') : KR.t('beat.step.' + step);
        chip.classList.toggle('on', step === bsmashSelectedStep);
        chip.onclick = () => { bsmashSelectedStep = step; bsmashRenderSteps(); };
    });
    const start = bsmashEl('beat-pathway-start');
    start.disabled = false;
    start.textContent = KR.t(bsmashSelectedStep === 'band' ? 'beat.playBand'
        : bsmashSelectedStep === 'permit' ? 'beat.permit.show'
        : bsmashSelectedStep === 'song' ? 'beat.songs.button' : 'beat.start');
}

function startSelectedBeat() {
    const id = bsmashSelected;
    if (!id) return;
    bsmashAudio();
    if (bsmashSelectedStep === 'band') return openBeatBand();
    if (bsmashSelectedStep === 'jam') return startBeatJam();
    if (bsmashSelectedStep === 'song') return showBeatSongs();
    if (bsmashSelectedStep === 'permit') return showBeatPermit();
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
    // The sounds and the studio's length are Rob's to play with, not the
    // student's (playtest 2: "the user doesn't need to control any of that
    // stuff"): shown only with the teacher code on.
    const teacher = KR.openAll();
    BSMASH_MUSICIANS.forEach((musician, index) => {
        if (!teacher || !musician.sounds || musician.sounds.length < 2 || !bsmashUnlocked(index, progress)) return;
        row('beat.settings.sound.' + musician.id, musician.sounds.map(v => ({ value: v, text: 'beat.sound.' + v })),
            progress.settings.sound[musician.id], v => save(s => { s.sound[musician.id] = v; }));
    });
    // The studio take is 32 bars; a teacher can shorten it to try it out.
    if (teacher) {
        row('beat.settings.studio', BSMASH_STUDIO_BARS.map(v => ({ value: v, text: 'beat.studio.bars.' + v })),
            bsmashBarCount(BSMASH_MUSICIANS[0], BSMASH_STUDIO_STEP), v => save(s => { s.studioBars = v; }));
    }
    row('beat.settings.pads', ['four', 'one'].map(v => ({ value: v, text: 'beat.padMode.' + v })),
        progress.settings.padMode === 'one' ? 'one' : 'four', v => save(s => { s.padMode = v; }));
    // The warm-up jam's song: the band's own loops, or one of the jam songs
    // on the menu (KR.jamSongs in content/songs.js, in Rob's order).
    const songs = (window.KR && KR.songs) || {};
    const menu = ((window.KR && KR.jamSongs) || ['c']).filter(id => id === 'c' || songs[id]);
    const chosen = menu.indexOf(progress.settings.jamSong) >= 0 ? progress.settings.jamSong : 'c';
    row('beat.settings.song', menu.map(id => ({ value: id, text: id === 'c' ? 'song.c' : songs[id].name })),
        chosen, v => save(s => { s.jamSong = v; }));
}

function retuneBeatTiming() {
    bsmashAudio();
    startBeatJam();
}

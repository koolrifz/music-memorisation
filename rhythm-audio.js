/* =========================================================================
   RHYTHM AUDIO — one clock for everything that makes a sound in time

   WHY THIS FILE EXISTS. The metronome in script.js uses setInterval, which is
   fine for a click nobody is measuring but WILL DRIFT: browsers throttle
   timers, and over sixteen bars it wanders audibly. The moment a backing loop,
   a snare on the rhythm and a counting voice all have to line up, page time is
   not good enough. Everything here is scheduled against audioCtx.currentTime,
   which is the only clock that does not drift.

   The pattern is the standard lookahead scheduler: a coarse timer wakes up
   every TICK_MS and books anything falling due inside the next LOOKAHEAD
   window at an EXACT time. The timer may be late; the booking is not.

   THE COUNTING VOICE IS PLACEHOLDER. Rob's counting syllables - "1 2 3 4 5 6",
   "e + a", "trip o let" - are meant to be RECORDED IN HIS OWN VOICE, because
   browser speech synthesis cannot be scheduled: you ask it to speak and it
   starts approximately now, with latency that varies by device and voice. At
   90bpm a beat is 667ms and at the semiquaver grid a slot is 250ms, which is
   well inside that jitter. So the voice is sampled audio, and until those
   samples exist these are pitched blips carrying the right ACCENT and the
   right TIME. Swapping in the recordings is a file swap, not a rewrite:
   see rstompAudioLoadVoice().

   THE ACCENT MAP IS THE BRACKET, MADE AUDIBLE. Rob: "If we can say one then
   two three four softer." The onset digit sits outside the bracket and is
   struck; the bracketed beats are held. So "1 (2 3 4)" is LOUD soft soft soft,
   and the thing the student writes and the thing they hear become the same
   object. Nothing new has to be worked out for this - the counting engine
   already knows which slots are onsets, because that is what puts them
   outside the bracket.
   ========================================================================= */

const RAUDIO_TICK_MS = 25;        // how often the scheduler wakes
const RAUDIO_LOOKAHEAD = 0.12;    // seconds of music booked in advance

let raudioCtx = null;
let raudioMaster = null;
let raudioQueue = [];             // [{ when, play }] sorted by when
let raudioTimer = null;
let raudioVoice = null;           // sample bank, once recordings exist
let raudioOnStop = null;

// iOS will not start an AudioContext outside a user gesture, and will suspend
// one that was started too early - so this is called from the tap, not on load.
function rstompAudio() {
    if (!raudioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        raudioCtx = new Ctx();
        raudioMaster = raudioCtx.createGain();
        raudioMaster.gain.value = 0.9;
        raudioMaster.connect(raudioCtx.destination);
    }
    if (raudioCtx.state === 'suspended') raudioCtx.resume();
    return raudioCtx;
}

function rstompAudioRunning() {
    return !!raudioTimer;
}

/* ---------- the scheduler ---------- */

function rstompAudioStop() {
    if (raudioTimer) { clearInterval(raudioTimer); raudioTimer = null; }
    raudioQueue = [];
    if (raudioMaster && raudioCtx) {
        // a short fade rather than a hard cut, so stopping never clicks
        const now = raudioCtx.currentTime;
        raudioMaster.gain.cancelScheduledValues(now);
        raudioMaster.gain.setValueAtTime(raudioMaster.gain.value, now);
        raudioMaster.gain.linearRampToValueAtTime(0.0001, now + 0.03);
        raudioMaster.gain.setValueAtTime(0.9, now + 0.05);
    }
    const done = raudioOnStop; raudioOnStop = null;
    if (done) done();
}

function rstompAudioSchedule(events, onStop) {
    const ctx = rstompAudio();
    if (!ctx) return false;
    rstompAudioStop();
    raudioOnStop = onStop || null;
    const start = ctx.currentTime + 0.12;          // a beat of headroom to load
    raudioQueue = events.map(e => ({ when: start + e.at, play: e.play }))
                        .sort((a, b) => a.when - b.when);
    const endsAt = raudioQueue.length ? raudioQueue[raudioQueue.length - 1].when + 0.4 : start;
    raudioTimer = setInterval(() => {
        const now = ctx.currentTime;
        while (raudioQueue.length && raudioQueue[0].when < now + RAUDIO_LOOKAHEAD) {
            const e = raudioQueue.shift();
            try { e.play(Math.max(e.when, now)); } catch (err) { /* a dud note must not kill the phrase */ }
        }
        if (!raudioQueue.length && now > endsAt) rstompAudioStop();
    }, RAUDIO_TICK_MS);
    return true;
}

/* ---------- the instruments (placeholders where noted) ---------- */

function raudioTone(when, freq, dur, gain, type) {
    const ctx = raudioCtx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp).connect(raudioMaster);
    osc.start(when); osc.stop(when + dur + 0.02);
}

function raudioNoise(when, dur, gain, hz, q) {
    const ctx = raudioCtx;
    const frames = Math.ceil(ctx.sampleRate * (dur + 0.02));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = hz; filter.Q.value = q || 1;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter).connect(amp).connect(raudioMaster);
    src.start(when); src.stop(when + dur + 0.02);
}

// The rhythm itself, as a snare. Rob: "not a melody, but just a rhythm being
// played amongst a backing track."
function raudioSnare(when, accent) {
    raudioNoise(when, accent ? 0.16 : 0.11, accent ? 0.5 : 0.3, 1900, 0.8);
    raudioTone(when, accent ? 190 : 170, 0.05, accent ? 0.22 : 0.13, 'triangle');
}

function raudioKick(when)  { const t = raudioCtx;
    const osc = t.createOscillator(), amp = t.createGain();
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.11);
    amp.gain.setValueAtTime(0.7, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    osc.connect(amp).connect(raudioMaster); osc.start(when); osc.stop(when + 0.2); }
function raudioHat(when, open) { raudioNoise(when, open ? 0.13 : 0.035, 0.12, 8200, 1.2); }
function raudioClick(when, downbeat) {
    raudioTone(when, downbeat ? 1180 : 820, 0.035, downbeat ? 0.32 : 0.2, 'square');
}

/* ---------- the counting voice ---------- */

// The real bank: one short sample per syllable per accent, recorded rather
// than synthesised, because speech synthesis cannot be scheduled in time.
// Call this once the files exist and every count below plays them instead.
//   rstompAudioLoadVoice({ '1': {strong: ArrayBuffer, soft: ArrayBuffer}, ... })
async function rstompAudioLoadVoice(bank) {
    const ctx = rstompAudio();
    if (!ctx) return false;
    const out = {};
    for (const label of Object.keys(bank)) {
        out[label] = {};
        for (const level of Object.keys(bank[label])) {
            out[label][level] = await ctx.decodeAudioData(bank[label][level].slice(0));
        }
    }
    raudioVoice = out;
    return true;
}

// PLACEHOLDER VOICE. Pitch stands in for the syllable and loudness for the
// accent, so the accent map and the timing can both be heard and tested long
// before anyone records anything. Numbers get a square wave and the off-beat
// syllables a sine, so the beat structure is audible on its own.
const RAUDIO_PLACEHOLDER_PITCH = {
    '1': 523, '2': 587, '3': 659, '4': 698, '5': 784, '6': 880,
    'e': 392, '+': 440, 'a': 466,
    'trip': 523, 'o': 587, 'let': 659
};

function raudioSyllable(when, label, strong) {
    if (raudioVoice && raudioVoice[label]) {
        const buf = raudioVoice[label][strong ? 'strong' : 'soft'] || raudioVoice[label].soft;
        if (buf) {
            const src = raudioCtx.createBufferSource(); src.buffer = buf;
            const amp = raudioCtx.createGain();
            amp.gain.value = strong ? 1 : 0.55;
            src.connect(amp).connect(raudioMaster);
            src.start(when);
            return;
        }
    }
    const numeral = /^[0-9]/.test(label);
    raudioTone(when, RAUDIO_PLACEHOLDER_PITCH[label] || 440,
               strong ? 0.13 : 0.09, strong ? 0.34 : 0.12,
               numeral ? 'square' : 'sine');
}

/* ---------- turning a phrase into a schedule ---------- */

// The accent map, straight off the counting. A slot whose label sits OUTSIDE
// a bracket is an onset and is spoken strong; a bracketed slot is held or
// rested and is spoken soft. This is why the audio matches the page: both
// come from the same groups.
function rstompAudioAccentMap() {
    return rstompGroupsToSlotMarks(rstompTargetGroups()).map(mark => ({
        label: mark.slice(0, mark.length - 3),
        strong: mark[mark.length - 3] !== 'b'
    }));
}

// A plain two-bar drum loop, synthesised so it can sit at ANY tempo without
// the stretching artefacts a recorded loop would pick up. Recorded loops can
// replace it later - and because the performance round offers only three
// tempos, three renders of each loop would cover it with no stretching at all.
function raudioLoopEvents(bars, slotsPerBar, slotsPerBeat, slotSec, style) {
    const events = [];
    const beats = Math.round(slotsPerBar / slotsPerBeat);
    const beatSec = slotSec * slotsPerBeat;
    for (let bar = 0; bar < bars; bar++) {
        for (let beat = 0; beat < beats; beat++) {
            const at = (bar * beats + beat) * beatSec;
            const compound = slotsPerBeat === 3 || (beats === 6 && slotsPerBeat === 1);
            if (beat === 0 || (!compound && beats >= 4 && beat === Math.floor(beats / 2)))
                events.push({ at, play: t => raudioKick(t) });
            if (!compound && beats >= 4 && (beat === 1 || beat === beats - 1))
                events.push({ at, play: t => raudioSnare(t, false) });
            events.push({ at, play: t => raudioHat(t, false) });
            if (style !== 'sparse')
                events.push({ at: at + beatSec / 2, play: t => raudioHat(t, false) });
        }
    }
    return events;
}

/* ---------- the speaker button ---------- */

// Hear the phrase: the counting voice on every slot with the bracket's accent,
// a snare on every onset, a click on every beat, and a loop under it. Rob:
// "if we can play that rhythm in Rhythm Stomp, we should be able to hear it
// first as well." Listening costs nothing - his call: "if they want it to
// become a jukebox that's their business... the byproduct of having fun is
// learning."
function rstompAudioPlayPhrase(options) {
    const events = rstompAudioPhraseEvents(options);
    if (!events) return false;
    return rstompAudioSchedule(events, (options || {}).onStop);
}

// The phrase as a list of { at, play } - separate from playing it, so the same
// schedule can be rendered offline (for a preview file, or a test) as well as
// played live.
function rstompAudioPhraseEvents(options) {
    const opt = Object.assign({ bpm: 90, counting: true, snare: true,
                                click: true, loop: true, countIn: true }, options || {});
    if (!rstompPhrase.length) return null;
    const slotSec = 60 / opt.bpm / rstompSlotsPerBeat;
    const map = rstompAudioAccentMap();
    const bars = rstompPhrase.length;
    const events = [];

    // A count-in of one bar, so they arrive with the pulse already going.
    let offset = 0;
    if (opt.countIn) {
        const beats = Math.round(rstompSlotsPerBar / rstompSlotsPerBeat);
        for (let b = 0; b < beats; b++)
            events.push({ at: b * slotSec * rstompSlotsPerBeat,
                          play: t => raudioClick(t, b === 0) });
        offset = beats * slotSec * rstompSlotsPerBeat;
    }

    map.forEach((slot, index) => {
        const at = offset + index * slotSec;
        if (opt.counting) events.push({ at, play: t => raudioSyllable(t, slot.label, slot.strong) });
        if (opt.snare && slot.strong) events.push({ at, play: t => raudioSnare(t, index % rstompSlotsPerBar === 0) });
        if (opt.click && index % rstompSlotsPerBeat === 0)
            events.push({ at, play: t => raudioClick(t, index % rstompSlotsPerBar === 0) });
    });

    if (opt.loop)
        raudioLoopEvents(bars, rstompSlotsPerBar, rstompSlotsPerBeat, slotSec, opt.loopStyle)
            .forEach(e => events.push({ at: offset + e.at, play: e.play }));

    return events;
}

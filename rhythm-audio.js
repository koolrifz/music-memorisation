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

/* THE MIX. Rob, on the first render: "I am hearing a metronome and a drum
   beat... if there is a rhythm mixed in with that, then the drum beat has to
   go way more in the background. And any single rhythmic note should be at
   least 40% louder than anything else, so it sits on top comfortably."

   He was right and the numbers said so: the kick was at 0.7, the loudest
   thing in the piece - louder than the snare on the rhythm and twice the
   counting voice. The backing was playing over the lesson.

   So there are three buses and the whole mix is these three numbers. THE
   RHYTHM IS THE LESSON: the snare on the onsets and the counting voice both
   sit on the rhythm bus, and everything else is support. A test renders each
   bus alone and checks the ratio, so this cannot drift back. */
const RAUDIO_MIX = {
    rhythm: 1.00,     // the snare on the onsets, and the counting voice
    click: 0.55,      // the pulse underneath
    loop: 0.45        // the backing track - present, but clearly behind
};

let raudioCtx = null;
let raudioMaster = null;
let raudioBus = {};
let raudioQueue = [];             // [{ when, play }] sorted by when
let raudioTimer = null;
let raudioVoice = null;           // sample bank, once recordings exist
let raudioOnStop = null;

/* WHERE THE PHRASE SITS ON THE CLOCK, so the page can draw a playhead.

   Scheduling alone is not enough for that: the events know when they sound,
   but once booked they are gone from the queue, and the queue is emptied
   ahead of the sound anyway (that is what the lookahead IS). The only thing
   that always knows where the music has got to is ctx.currentTime measured
   against the moment slot 0 sounds - which is the schedule's start plus the
   count-in. Both numbers are kept here and nowhere else, so the playhead and
   the events cannot disagree about where the beat is. */
let raudioTiming = null;          // { start, offset, slotSec } while playing

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
        raudioBuildBuses();
    }
    if (raudioCtx.state === 'suspended') raudioCtx.resume();
    return raudioCtx;
}

function raudioBuildBuses() {
    raudioBus = {};
    Object.keys(RAUDIO_MIX).forEach(name => {
        const gain = raudioCtx.createGain();
        gain.gain.value = RAUDIO_MIX[name];
        gain.connect(raudioMaster);
        raudioBus[name] = gain;
    });
}

function raudioOut(bus) {
    return (raudioBus && raudioBus[bus]) || raudioMaster;
}

function rstompAudioRunning() {
    return !!raudioTimer;
}

/* ---------- the scheduler ---------- */

function rstompAudioStop() {
    if (raudioTimer) { clearInterval(raudioTimer); raudioTimer = null; }
    raudioQueue = [];
    raudioTiming = null;
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

function rstompAudioSchedule(events, onStop, timing) {
    const ctx = rstompAudio();
    if (!ctx) return false;
    rstompAudioStop();                             // clears raudioTiming, so set it after
    raudioOnStop = onStop || null;
    const start = ctx.currentTime + 0.12;          // a beat of headroom to load
    raudioTiming = timing ? Object.assign({ start }, timing) : null;
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

// Which slot the music is on right now, as a FRACTION of a slot so a playhead
// can glide rather than hop: 0 is the first slot of bar 1, 4.5 is halfway
// through slot 5. Negative during the count-in and past the end once the
// phrase has run out; null when nothing is playing. The caller decides what
// to do at the edges - this only reports the clock.
function rstompAudioPlayhead() {
    if (!raudioTimer || !raudioTiming || !raudioCtx) return null;
    return (raudioCtx.currentTime - raudioTiming.start - raudioTiming.offset) / raudioTiming.slotSec;
}

/* ---------- the instruments (placeholders where noted) ---------- */

function raudioTone(when, freq, dur, gain, type, bus) {
    const ctx = raudioCtx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp).connect(raudioOut(bus));
    osc.start(when); osc.stop(when + dur + 0.02);
}

function raudioNoise(when, dur, gain, hz, q, bus) {
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
    src.connect(filter).connect(amp).connect(raudioOut(bus));
    src.start(when); src.stop(when + dur + 0.02);
}

// The rhythm itself, as a snare. Rob: "not a melody, but just a rhythm being
// played amongst a backing track."
function raudioSnare(when, accent) {
    raudioNoise(when, accent ? 0.17 : 0.13, accent ? 0.62 : 0.46, 1900, 0.8, 'rhythm');
    raudioTone(when, accent ? 190 : 170, 0.05, accent ? 0.26 : 0.18, 'triangle', 'rhythm');
}

// The backing track. Its own quieter bus, and a softer kick besides - a
// backing track that competes with the rhythm is not a backing track.
function raudioKick(when)  { const t = raudioCtx;
    const osc = t.createOscillator(), amp = t.createGain();
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.11);
    amp.gain.setValueAtTime(0.5, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    osc.connect(amp).connect(raudioOut('loop')); osc.start(when); osc.stop(when + 0.18); }
function raudioLoopSnare(when) { raudioNoise(when, 0.1, 0.34, 1700, 0.8, 'loop'); }
function raudioHat(when, open) { raudioNoise(when, open ? 0.13 : 0.03, 0.1, 8200, 1.2, 'loop'); }
function raudioClick(when, downbeat) {
    raudioTone(when, downbeat ? 1180 : 820, 0.03, downbeat ? 0.3 : 0.2, 'square', 'click');
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

// PLACEHOLDER VOICE. Three things stand in for a recorded syllable, and each
// one carries a different piece of information:
//
//   PITCH     - WHICH BEAT you are in. Rob's rule: everything in beat 1 is the
//               tonic, everything in beat 2 the supertonic, beat 3 the
//               mediant, beat 4 the subdominant. A subdivision keeps its
//               beat's pitch, so the "and" of 3 sounds the mediant exactly
//               like the 3 it belongs to. In 4/4 that is a major tetrachord;
//               6/8 counted in six just runs on up the scale.
//   TIMBRE    - whether it is the beat itself (square) or a subdivision
//               (sine). The pitch no longer separates those, so the timbre
//               has to.
//   LOUDNESS  - the accent: struck notes are loud, held and rested ones soft.
//
// The pitch was keyed off the SYLLABLE before, which put `e + a` in a
// different register from the numbers and said nothing about where in the bar
// you were. Rob heard the tetrachord and named the rule; this is it.
const RAUDIO_DEGREE_HZ = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];

function raudioSyllable(when, label, strong, beat) {
    if (raudioVoice && raudioVoice[label]) {
        const buf = raudioVoice[label][strong ? 'strong' : 'soft'] || raudioVoice[label].soft;
        if (buf) {
            const src = raudioCtx.createBufferSource(); src.buffer = buf;
            const amp = raudioCtx.createGain();
            amp.gain.value = strong ? 1 : 0.5;
            src.connect(amp).connect(raudioOut('rhythm'));
            src.start(when);
            return;
        }
    }
    const numeral = /^[0-9]/.test(label);
    const degree = RAUDIO_DEGREE_HZ[Math.min(Math.max(beat || 0, 0), RAUDIO_DEGREE_HZ.length - 1)];
    raudioTone(when, degree,
               strong ? 0.15 : 0.1, strong ? 0.6 : 0.24,
               numeral ? 'square' : 'sine', 'rhythm');
}

/* ---------- turning a phrase into a schedule ---------- */

// The accent map, straight off the counting. A slot whose label sits OUTSIDE
// a bracket is an onset and is spoken strong; a bracketed slot is held or
// rested and is spoken soft. This is why the audio matches the page: both
// come from the same groups.
function rstompAudioAccentMap() {
    // Each mark is one LABEL, and a label no longer means a slot - a crotchet
    // at the quaver grid is counted `2` and lasts two slots. So each one
    // carries the slot it is written on, and the schedule times it from that.
    // Nothing is spoken on a slot that carries no label, which is the point:
    // you don't say "and" when nothing happens on it.
    return rstompGroupsToSlotMarks(rstompTargetGroups()).map((mark, index) => {
        const slot = rstompPositions[index] ? rstompPositions[index].absolute : index;
        return {
            label: mark.slice(0, mark.length - 3),
            strong: mark[mark.length - 3] !== 'b',
            slot,
            // Which beat of the bar this falls in - what the placeholder
            // voice's pitch is taken from. A subdivision reports its beat,
            // not its own position, so it sounds at that beat's degree.
            beat: Math.floor((slot % rstompSlotsPerBar) / rstompSlotsPerBeat)
        };
    });
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
                events.push({ at, play: t => raudioLoopSnare(t) });
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
    return rstompAudioSchedule(events, (options || {}).onStop, rstompAudioTiming(options));
}

// How long one slot lasts, and how much count-in sits before slot 0. The
// event list and the playhead both need these two numbers and they must not
// be derived twice - a playhead that computes its own count-in drifts a whole
// bar the first time a level changes meter.
function rstompAudioTiming(options) {
    const opt = Object.assign({ bpm: 90, countIn: true }, options || {});
    const slotSec = 60 / opt.bpm / rstompSlotsPerBeat;
    const beats = Math.round(rstompSlotsPerBar / rstompSlotsPerBeat);
    return { slotSec, offset: opt.countIn ? beats * slotSec * rstompSlotsPerBeat : 0 };
}

// The phrase as a list of { at, play } - separate from playing it, so the same
// schedule can be rendered offline (for a preview file, or a test) as well as
// played live.
function rstompAudioPhraseEvents(options) {
    const opt = Object.assign({ bpm: 90, counting: true, snare: true,
                                click: true, loop: true, countIn: true }, options || {});
    if (!rstompPhrase.length) return null;
    const { slotSec, offset } = rstompAudioTiming(opt);
    const map = rstompAudioAccentMap();
    const bars = rstompPhrase.length;
    const events = [];

    // A count-in of one bar, so they arrive with the pulse already going.
    if (opt.countIn) {
        const beats = Math.round(rstompSlotsPerBar / rstompSlotsPerBeat);
        for (let b = 0; b < beats; b++)
            events.push({ at: b * slotSec * rstompSlotsPerBeat,
                          play: t => raudioClick(t, b === 0) });
    }

    map.forEach(label => {
        const at = offset + label.slot * slotSec;
        if (opt.counting) events.push({ at, play: t => raudioSyllable(t, label.label, label.strong, label.beat) });
        if (opt.snare && label.strong) events.push({ at, play: t => raudioSnare(t, label.slot % rstompSlotsPerBar === 0) });
        if (opt.click && label.slot % rstompSlotsPerBeat === 0)
            events.push({ at, play: t => raudioClick(t, label.slot % rstompSlotsPerBar === 0) });
    });

    if (opt.loop)
        raudioLoopEvents(bars, rstompSlotsPerBar, rstompSlotsPerBeat, slotSec, opt.loopStyle)
            .forEach(e => events.push({ at: offset + e.at, play: e.play }));

    return events;
}

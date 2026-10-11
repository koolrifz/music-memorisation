/* =========================================
   KOOL RIFFS - METRONOME AND TUNER (full screen)
   =========================================
   Rob, 2026-10-11: tapping Riff's metronome or tuner in the studio opens a
   full screen with a proper metronome (beats in the bar, an accent you can
   set beat by beat, eighths, triplets, sixteenths, swing, a choice of
   sounds, tap tempo, a practice timer) and the tuner one tab away. Shaped
   by what practice apps such as Soundcorset offer, not copied from one.

   The metronome is booked ahead on the audio clock (the same method as
   Beat Smash's band), never setInterval, so it doesn't drift or stutter
   when the page is busy. The tuner reuses detectTunerPitch() from script.js.

   WORDS DO NOT GO IN THE CODE: every word is a lang/ id (tools.*).
   The dashboard's old Kool Beat / Kool Tuner cards are left as they were.
   ========================================= */

const KR_TOOLS_KEY = 'koolRiffsTools';
const KR_TOOLS_LOOKAHEAD = 0.12;      // seconds booked ahead
const KR_TOOLS_TICK_MS = 25;          // how often the booker wakes
const KR_TOOLS_BPM_MIN = 30;
const KR_TOOLS_BPM_MAX = 250;
const KR_TOOLS_BEATS_MAX = 12;
const KR_TOOLS_TAP_RESET_S = 2;       // a gap this long starts a new tap count
const KR_TOOLS_TAP_KEEP = 5;
const KR_TOOLS_A4_MIN = 415;
const KR_TOOLS_A4_MAX = 466;
const KR_TOOLS_VIBRATE_MS = 15;
const KR_TOOLS_IN_TUNE_CENTS = 10;
const KR_TOOLS_TUNER_EVERY = 3;       // read the pitch every Nth animation frame
const KR_TOOLS_SMOOTH = 5;            // readings kept for the median
const KR_TOOLS_SILENT_FRAMES = 12;    // frames with no pitch before the readout clears
const KR_TOOLS_ACCENT_GAIN = [0, 0.6, 0.95];   // silent, normal, loud
const KR_TOOLS_SUB_GAIN = 0.3;

// n clicks to a beat; mask says which of them sound (swing skips the middle triplet).
const KR_TOOLS_SUBS = [
    { id: 'quarter',   n: 1, mask: [1] },
    { id: 'eighth',    n: 2, mask: [1, 1] },
    { id: 'triplet',   n: 3, mask: [1, 1, 1] },
    { id: 'sixteenth', n: 4, mask: [1, 1, 1, 1] },
    { id: 'swing',     n: 3, mask: [1, 0, 1] },
];
const KR_TOOLS_SOUNDS = ['click', 'wood', 'beep', 'hat'];
// Semitones from concert to written pitch, as the old tuner had them.
const KR_TOOLS_INSTRUMENTS = { concert: 0, bb: 2, eb: -3, f: 7 };
const KR_TOOLS_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const krTools = {
    built: false, els: null, tab: 'metronome',
    // saved per device
    bpm: 90, beats: 4, accents: [2, 1, 1, 1], sub: 'quarter', sound: 'click', flash: false, vibrate: false,
    inst: 'concert', a4: 440,
    // running
    running: false, timer: 0, nextTime: 0, beatIdx: 0, subIdx: 0, queue: [], raf: 0, startedAt: 0, noise: null,
    taps: [],
    // tuner
    stream: null, source: null, analyser: null, frames: 0, readings: [], silent: 0,
    pipe: null,
};

function krToolsMake(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
}

function krToolsLoad() {
    try {
        const saved = JSON.parse(localStorage.getItem(KR_TOOLS_KEY) || '{}');
        ['bpm', 'beats', 'sub', 'sound', 'flash', 'vibrate', 'inst', 'a4'].forEach(k => { if (k in saved) krTools[k] = saved[k]; });
        if (Array.isArray(saved.accents)) krTools.accents = saved.accents;
    } catch (e) {}
    krTools.bpm = Math.min(KR_TOOLS_BPM_MAX, Math.max(KR_TOOLS_BPM_MIN, Math.round(Number(krTools.bpm) || 90)));
    krTools.beats = Math.min(KR_TOOLS_BEATS_MAX, Math.max(1, Math.round(Number(krTools.beats) || 4)));
    krToolsFitAccents();
}

function krToolsSave() {
    const keys = ['bpm', 'beats', 'accents', 'sub', 'sound', 'flash', 'vibrate', 'inst', 'a4'];
    const out = {};
    keys.forEach(k => { out[k] = krTools[k]; });
    try { localStorage.setItem(KR_TOOLS_KEY, JSON.stringify(out)); } catch (e) {}
}

// One accent level per beat: 2 loud, 1 normal, 0 silent. Beat 1 is loud by default.
function krToolsFitAccents() {
    const a = krTools.accents.slice(0, krTools.beats);
    while (a.length < krTools.beats) a.push(1);
    if (!a.length || a.every(v => v === undefined)) a[0] = 2;
    krTools.accents = a.map(v => (v === 0 || v === 1 || v === 2) ? v : 1);
}

function krToolsSub() {
    return KR_TOOLS_SUBS.find(s => s.id === krTools.sub) || KR_TOOLS_SUBS[0];
}

/* ---------- The sounds ---------- */
function krToolsNoise() {
    if (!krTools.noise) {
        const length = Math.floor(audioCtx.sampleRate * 0.1);
        const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        krTools.noise = buffer;
    }
    return krTools.noise;
}

function krToolsVoice(time, gainLevel, accent) {
    const ctx = audioCtx;
    const out = ctx.createGain();
    out.connect(ctx.destination);
    const sound = krTools.sound;
    let tone = null, length = 0.05;
    if (sound === 'hat') {
        const src = ctx.createBufferSource();
        src.buffer = krToolsNoise();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = accent ? 6000 : 8000;
        src.connect(filter);
        filter.connect(out);
        length = accent ? 0.07 : 0.04;
        out.gain.setValueAtTime(gainLevel, time);
        out.gain.exponentialRampToValueAtTime(0.001, time + length);
        src.start(time);
        src.stop(time + length + 0.01);
        return;
    }
    tone = ctx.createOscillator();
    if (sound === 'click') { tone.type = 'square'; tone.frequency.value = accent ? 2000 : 1400; length = 0.03; }
    else if (sound === 'wood') { tone.type = 'sine'; tone.frequency.value = accent ? 1000 : 700; length = 0.07; }
    else { tone.type = 'sine'; tone.frequency.value = accent ? 1320 : 880; length = 0.1; }   // beep
    tone.connect(out);
    out.gain.setValueAtTime(0.0001, time);
    out.gain.linearRampToValueAtTime(gainLevel * (sound === 'click' ? 0.5 : 1), time + 0.002);
    out.gain.exponentialRampToValueAtTime(0.001, time + length);
    tone.start(time);
    tone.stop(time + length + 0.01);
}

/* ---------- The metronome, booked ahead on the audio clock ---------- */
function krToolsBook() {
    const sub = krToolsSub();
    while (krTools.nextTime < audioCtx.currentTime + KR_TOOLS_LOOKAHEAD) {
        const beat = krTools.beatIdx, s = krTools.subIdx;
        const onBeat = s === 0;
        const level = onBeat ? krTools.accents[beat] : null;
        const sounds = sub.mask[s] && (!onBeat || level > 0);
        if (sounds) krToolsVoice(krTools.nextTime, onBeat ? KR_TOOLS_ACCENT_GAIN[level] : KR_TOOLS_SUB_GAIN, onBeat && level === 2);
        if (onBeat) krTools.queue.push({ time: krTools.nextTime, beat: beat });
        krTools.nextTime += 60 / krTools.bpm / sub.n;
        krTools.subIdx++;
        if (krTools.subIdx >= sub.n) { krTools.subIdx = 0; krTools.beatIdx = (krTools.beatIdx + 1) % krTools.beats; }
    }
}

function krToolsFrame() {
    if (!krTools.running) return;
    while (krTools.queue.length && krTools.queue[0].time <= audioCtx.currentTime) {
        const hit = krTools.queue.shift();
        krToolsLight(hit.beat);
        if (krTools.flash) krToolsFlash();
        if (krTools.vibrate && navigator.vibrate) navigator.vibrate(KR_TOOLS_VIBRATE_MS);
    }
    krToolsShowTimer();
    krTools.raf = requestAnimationFrame(krToolsFrame);
}

function krToolsLight(beat) {
    krTools.els.dots.forEach((d, i) => d.classList.toggle('now', i === beat));
}

function krToolsFlash() {
    const f = krTools.els.flashLayer;
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
}

function krToolsShowTimer() {
    const secs = krTools.running ? Math.floor(audioCtx.currentTime - krTools.startedAt) : 0;
    const text = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    krTools.els.timer.textContent = KR.t('tools.timer', { time: text });
}

function krToolsStart() {
    initAudio();
    if (krTools.running) return;
    krToolsFitAccents();
    krTools.running = true;
    krTools.beatIdx = 0;
    krTools.subIdx = 0;
    krTools.queue = [];
    krTools.nextTime = audioCtx.currentTime + 0.06;
    krTools.startedAt = krTools.nextTime;
    krToolsBook();
    krTools.timer = setInterval(krToolsBook, KR_TOOLS_TICK_MS);
    krTools.raf = requestAnimationFrame(krToolsFrame);
    krToolsRender();
}

function krToolsStop() {
    if (krTools.timer) clearInterval(krTools.timer);
    if (krTools.raf) cancelAnimationFrame(krTools.raf);
    krTools.timer = 0;
    krTools.raf = 0;
    krTools.running = false;
    krTools.queue = [];
    if (krTools.built) { krToolsLight(-1); krToolsRender(); }
}

function krToolsSetBpm(value) {
    krTools.bpm = Math.min(KR_TOOLS_BPM_MAX, Math.max(KR_TOOLS_BPM_MIN, Math.round(value)));
    krToolsSave();
    krToolsRender();
}

function krToolsTap() {
    const now = performance.now() / 1000;
    const last = krTools.taps[krTools.taps.length - 1];
    if (last !== undefined && now - last > KR_TOOLS_TAP_RESET_S) krTools.taps = [];
    krTools.taps.push(now);
    krTools.taps = krTools.taps.slice(-KR_TOOLS_TAP_KEEP);
    if (krTools.taps.length >= 2) {
        const gaps = [];
        for (let i = 1; i < krTools.taps.length; i++) gaps.push(krTools.taps[i] - krTools.taps[i - 1]);
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        krToolsSetBpm(60 / mean);
    }
}

/* ---------- The tuner ---------- */
// A frequency as the note the player would read, and how many cents off it is.
function krToolsNoteFor(frequency) {
    const shift = KR_TOOLS_INSTRUMENTS[krTools.inst] || 0;
    const midi = 69 + 12 * Math.log2(frequency / krTools.a4) + shift;
    const nearest = Math.round(midi);
    return {
        name: KR_TOOLS_NOTES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1),
        cents: Math.round((midi - nearest) * 100),
    };
}

function krToolsShowPitch(frequency) {
    const e = krTools.els;
    if (!frequency) {
        e.note.textContent = KR.t(krTools.stream ? 'tools.tuner.listening' : 'tools.tuner.ready');
        e.hz.textContent = '';
        e.marker.style.left = '50%';
        e.meter.dataset.state = '';
        return;
    }
    const note = krToolsNoteFor(frequency);
    e.note.textContent = note.name;
    e.hz.textContent = KR.t('tools.hz', { hz: frequency.toFixed(1) });
    e.marker.style.left = (50 + Math.max(-50, Math.min(50, note.cents))) + '%';
    const near = Math.abs(note.cents) <= KR_TOOLS_IN_TUNE_CENTS;
    e.meter.dataset.state = near ? 'in' : (note.cents < 0 ? 'low' : 'high');
    e.verdict.textContent = KR.t(near ? 'tools.tuner.intune' : (note.cents < 0 ? 'tools.tuner.low' : 'tools.tuner.high'));
}

function krToolsTunerFrame() {
    if (!krTools.analyser) return;
    krTools.frames++;
    if (krTools.frames % KR_TOOLS_TUNER_EVERY === 0) {
        const buffer = new Float32Array(krTools.analyser.fftSize);
        krTools.analyser.getFloatTimeDomainData(buffer);
        const frequency = detectTunerPitch(buffer, audioCtx.sampleRate);
        if (frequency) {
            krTools.silent = 0;
            krTools.readings.push(frequency);
            krTools.readings = krTools.readings.slice(-KR_TOOLS_SMOOTH);
            const sorted = krTools.readings.slice().sort((a, b) => a - b);
            krToolsShowPitch(sorted[Math.floor(sorted.length / 2)]);
        } else if (++krTools.silent > KR_TOOLS_SILENT_FRAMES) {
            krTools.readings = [];
            krToolsShowPitch(0);
        }
    }
    krTools.raf = requestAnimationFrame(krToolsTunerFrame);
}

async function krToolsTunerStart() {
    if (krTools.stream) { krToolsTunerStop(); return; }
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { krTools.els.verdict.textContent = KR.t('tools.tuner.nosupport'); return; }
    try {
        initAudio();
        krTools.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        krTools.source = audioCtx.createMediaStreamSource(krTools.stream);
        krTools.analyser = audioCtx.createAnalyser();
        krTools.analyser.fftSize = 2048;
        krTools.source.connect(krTools.analyser);
        krTools.readings = [];
        krTools.silent = 0;
        krToolsShowPitch(0);
        krTools.els.verdict.textContent = '';
        krTools.raf = requestAnimationFrame(krToolsTunerFrame);
    } catch (e) {
        krTools.els.verdict.textContent = KR.t('tools.tuner.nomic');
    }
    krToolsRender();
}

function krToolsTunerStop() {
    if (krTools.raf && krTools.tab === 'tuner') cancelAnimationFrame(krTools.raf);
    if (krTools.stream) krTools.stream.getTracks().forEach(t => t.stop());
    if (krTools.source) krTools.source.disconnect();
    krTools.stream = krTools.source = krTools.analyser = null;
    if (krTools.built) { krToolsShowPitch(0); krTools.els.verdict.textContent = ''; krToolsRender(); }
}

// The pitch pipe: tap a written note, hear it as concert pitch; tap again to stop.
function krToolsPipe(index) {
    initAudio();
    const was = krTools.pipe && krTools.pipe.index;
    krToolsPipeStop();
    if (was === index + 1) { krToolsRender(); return; }
    const shift = KR_TOOLS_INSTRUMENTS[krTools.inst] || 0;
    const concertMidi = 60 + index - shift;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = krTools.a4 * Math.pow(2, (concertMidi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    krTools.pipe = { osc: osc, gain: gain, index: index + 1 };
    krToolsRender();
}

function krToolsPipeStop() {
    if (!krTools.pipe) return;
    try {
        krTools.pipe.gain.gain.cancelScheduledValues(audioCtx.currentTime);
        krTools.pipe.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.03);
        krTools.pipe.osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
    krTools.pipe = null;
}

/* ---------- The screen ---------- */
function krToolsBuild() {
    const root = document.getElementById('tools-root');
    root.innerHTML = '';
    const e = { dots: [], subBtns: {}, soundBtns: {}, noteBtns: [] };
    krTools.els = e;

    e.flashLayer = krToolsMake('div', 'tl-flash', root);

    const head = krToolsMake('div', 'tl-head', root);
    const logo = krToolsMake('img', 'tl-logo', head);
    logo.alt = '';
    logo.src = (KR.art && KR.art['logo.badge']) || '';
    if (!logo.src) logo.hidden = true;
    const back = krToolsMake('button', 'tl-back', head);
    back.type = 'button';
    back.textContent = '‹ ' + KR.t('tools.back');
    back.setAttribute('aria-label', KR.t('tools.back.label'));
    back.onclick = () => launchGame('view-dashboard');
    const tabs = krToolsMake('div', 'tl-tabs', head);
    ['metronome', 'tuner'].forEach(name => {
        const b = krToolsMake('button', 'tl-tab', tabs);
        b.type = 'button';
        b.textContent = KR.t('tools.title.' + name);
        b.onclick = () => krToolsTab(name);
        e['tab_' + name] = b;
    });

    /* ----- metronome ----- */
    const m = krToolsMake('div', 'tl-panel', root);
    e.metro = m;
    const tempo = krToolsMake('div', 'tl-tempo', m);
    const less = krToolsMake('button', 'tl-round', tempo);
    less.type = 'button'; less.textContent = '−';
    less.setAttribute('aria-label', KR.t('tools.bpm.less'));
    less.onclick = () => krToolsSetBpm(krTools.bpm - 1);
    const big = krToolsMake('div', 'tl-bpm', tempo);
    e.bpm = krToolsMake('strong', null, big);
    krToolsMake('small', null, big).textContent = KR.t('tools.bpm');
    const more = krToolsMake('button', 'tl-round', tempo);
    more.type = 'button'; more.textContent = '+';
    more.setAttribute('aria-label', KR.t('tools.bpm.more'));
    more.onclick = () => krToolsSetBpm(krTools.bpm + 1);

    e.slider = krToolsMake('input', 'tl-slider', m);
    e.slider.type = 'range';
    e.slider.min = KR_TOOLS_BPM_MIN;
    e.slider.max = KR_TOOLS_BPM_MAX;
    e.slider.setAttribute('aria-label', KR.t('tools.bpm'));
    e.slider.oninput = () => krToolsSetBpm(Number(e.slider.value));

    e.lights = krToolsMake('div', 'tl-lights', m);
    krToolsMake('p', 'tl-hint', m).textContent = KR.t('tools.accent.hint');

    const go = krToolsMake('div', 'tl-row', m);
    e.go = krToolsMake('button', 'tl-go', go);
    e.go.type = 'button';
    e.go.onclick = () => (krTools.running ? krToolsStop() : krToolsStart());
    const tap = krToolsMake('button', 'tl-tap', go);
    tap.type = 'button';
    tap.textContent = KR.t('tools.tap');
    tap.onclick = krToolsTap;
    e.timer = krToolsMake('div', 'tl-timer', m);

    const beatsRow = krToolsMake('div', 'tl-set', m);
    krToolsMake('span', 'tl-label', beatsRow).textContent = KR.t('tools.beats');
    const bl = krToolsMake('button', 'tl-round small', beatsRow); // text-ok
    bl.type = 'button'; bl.textContent = '−';
    bl.setAttribute('aria-label', KR.t('tools.beats.less'));
    bl.onclick = () => { krTools.beats = Math.max(1, krTools.beats - 1); krToolsFitAccents(); krToolsSave(); krToolsRender(); };
    e.beats = krToolsMake('strong', 'tl-val', beatsRow);
    const bm = krToolsMake('button', 'tl-round small', beatsRow); // text-ok
    bm.type = 'button'; bm.textContent = '+';
    bm.setAttribute('aria-label', KR.t('tools.beats.more'));
    bm.onclick = () => { krTools.beats = Math.min(KR_TOOLS_BEATS_MAX, krTools.beats + 1); krToolsFitAccents(); krToolsSave(); krToolsRender(); };

    const subRow = krToolsMake('div', 'tl-set wrap', m); // text-ok
    krToolsMake('span', 'tl-label', subRow).textContent = KR.t('tools.sub');
    const subs = krToolsMake('div', 'tl-chips', subRow);
    KR_TOOLS_SUBS.forEach(s => {
        const b = krToolsMake('button', 'tl-chip', subs);
        b.type = 'button';
        b.textContent = KR.t('tools.sub.' + s.id);
        b.onclick = () => { krTools.sub = s.id; krToolsSave(); krToolsRender(); };
        e.subBtns[s.id] = b;
    });

    const soundRow = krToolsMake('div', 'tl-set wrap', m); // text-ok
    krToolsMake('span', 'tl-label', soundRow).textContent = KR.t('tools.sound');
    const sounds = krToolsMake('div', 'tl-chips', soundRow);
    KR_TOOLS_SOUNDS.forEach(id => {
        const b = krToolsMake('button', 'tl-chip', sounds);
        b.type = 'button';
        b.textContent = KR.t('tools.sound.' + id);
        b.onclick = () => { krTools.sound = id; krToolsSave(); krToolsRender(); if (krTools.running === false) { initAudio(); krToolsVoice(audioCtx.currentTime + 0.02, KR_TOOLS_ACCENT_GAIN[2], true); } };
        e.soundBtns[id] = b;
    });

    const extras = krToolsMake('div', 'tl-set wrap', m); // text-ok
    ['flash', 'vibrate'].forEach(id => {
        const b = krToolsMake('button', 'tl-chip', extras);
        b.type = 'button';
        b.textContent = KR.t('tools.' + id);
        b.onclick = () => { krTools[id] = !krTools[id]; krToolsSave(); krToolsRender(); };
        e['x_' + id] = b;
    });

    /* ----- tuner ----- */
    const t = krToolsMake('div', 'tl-panel', root);
    e.tuner = t;
    e.note = krToolsMake('div', 'tl-note', t);
    e.hz = krToolsMake('div', 'tl-hz', t);
    e.meter = krToolsMake('div', 'tl-meter', t);
    krToolsMake('span', 'tl-mid', e.meter);
    e.marker = krToolsMake('span', 'tl-marker', e.meter);
    e.verdict = krToolsMake('div', 'tl-verdict', t);
    e.verdict.setAttribute('aria-live', 'polite');
    e.tgo = krToolsMake('button', 'tl-go', t);
    e.tgo.type = 'button';
    e.tgo.onclick = krToolsTunerStart;

    const instRow = krToolsMake('div', 'tl-set', t);
    krToolsMake('label', 'tl-label', instRow).textContent = KR.t('tools.inst');
    e.inst = krToolsMake('select', 'tl-select', instRow);
    Object.keys(KR_TOOLS_INSTRUMENTS).forEach(id => {
        const o = krToolsMake('option', null, e.inst);
        o.value = id;
        o.textContent = KR.t('tools.inst.' + id);
    });
    e.inst.onchange = () => { krTools.inst = e.inst.value; krToolsSave(); krToolsPipeStop(); krToolsRender(); };

    const refRow = krToolsMake('div', 'tl-set', t);
    krToolsMake('span', 'tl-label', refRow).textContent = KR.t('tools.a4');
    const rl = krToolsMake('button', 'tl-round small', refRow); // text-ok
    rl.type = 'button'; rl.textContent = '−';
    rl.setAttribute('aria-label', KR.t('tools.a4.less'));
    rl.onclick = () => { krTools.a4 = Math.max(KR_TOOLS_A4_MIN, krTools.a4 - 1); krToolsSave(); krToolsRender(); };
    e.a4 = krToolsMake('strong', 'tl-val', refRow);
    const rm = krToolsMake('button', 'tl-round small', refRow); // text-ok
    rm.type = 'button'; rm.textContent = '+';
    rm.setAttribute('aria-label', KR.t('tools.a4.more'));
    rm.onclick = () => { krTools.a4 = Math.min(KR_TOOLS_A4_MAX, krTools.a4 + 1); krToolsSave(); krToolsRender(); };

    krToolsMake('p', 'tl-hint', t).textContent = KR.t('tools.pipe.help');
    const pipe = krToolsMake('div', 'tl-pipe', t);
    KR_TOOLS_NOTES.forEach((name, i) => {
        const b = krToolsMake('button', 'tl-chip', pipe);
        b.type = 'button';
        b.textContent = name;
        b.onclick = () => krToolsPipe(i);
        e.noteBtns.push(b);
    });
}

function krToolsRender() {
    const e = krTools.els;
    e.bpm.textContent = krTools.bpm;
    e.slider.value = krTools.bpm;
    e.beats.textContent = krTools.beats;
    e.go.textContent = KR.t(krTools.running ? 'tools.stop' : 'tools.start');
    e.go.classList.toggle('on', krTools.running);
    krToolsShowTimer();

    // one light per beat; tapping it cycles loud, soft, silent
    if (e.dots.length !== krTools.beats) {
        e.lights.innerHTML = '';
        e.dots = [];
        for (let i = 0; i < krTools.beats; i++) {
            const d = krToolsMake('button', 'tl-dot', e.lights);
            d.type = 'button';
            d.onclick = () => { krTools.accents[i] = (krTools.accents[i] + 2) % 3; krToolsSave(); krToolsRender(); };
            e.dots.push(d);
        }
    }
    e.dots.forEach((d, i) => {
        const level = krTools.accents[i];
        d.dataset.level = level;
        d.setAttribute('aria-label', KR.t('tools.beat.label', { n: i + 1, level: KR.t('tools.level.' + level) }));
    });

    Object.keys(e.subBtns).forEach(id => e.subBtns[id].classList.toggle('on', krTools.sub === id));
    Object.keys(e.soundBtns).forEach(id => e.soundBtns[id].classList.toggle('on', krTools.sound === id));
    e.x_flash.classList.toggle('on', krTools.flash);
    e.x_vibrate.classList.toggle('on', krTools.vibrate);
    e.x_vibrate.hidden = !navigator.vibrate;

    e.tgo.textContent = KR.t(krTools.stream ? 'tools.tuner.stop' : 'tools.tuner.start');
    e.tgo.classList.toggle('on', !!krTools.stream);
    e.inst.value = krTools.inst;
    e.a4.textContent = krTools.a4;
    e.noteBtns.forEach((b, i) => b.classList.toggle('on', !!krTools.pipe && krTools.pipe.index === i + 1));
}

function krToolsTab(name) {
    krTools.tab = name;
    if (name !== 'metronome') krToolsStop();
    if (name !== 'tuner') { krToolsTunerStop(); krToolsPipeStop(); }
    const e = krTools.els;
    e.metro.hidden = name !== 'metronome';
    e.tuner.hidden = name !== 'tuner';
    e.tab_metronome.classList.toggle('on', name === 'metronome');
    e.tab_tuner.classList.toggle('on', name === 'tuner');
    krToolsShowPitch(0);
    krToolsRender();
}

// Open the screen on one of its two tabs.
function enterTools(tab) {
    launchGame('view-tools');
    initAudio();
    if (!krTools.built) { krToolsLoad(); krToolsBuild(); krTools.built = true; }
    krToolsTab(tab === 'tuner' ? 'tuner' : 'metronome');
}

// Leaving the screen stops the click, the microphone and the pitch pipe.
(function () {
    const original = launchGame;
    launchGame = function (targetViewId) {
        if (targetViewId !== 'view-tools' && krTools.built) {
            krToolsStop();
            krToolsTunerStop();
            krToolsPipeStop();
        }
        original(targetViewId);
    };
})();

/* =========================================
   BEAT SMASH — PLACEHOLDER BAND
   =========================================
   Synthesised stand-ins for Garnet's loops, built to the loop spec in the
   Beat Smash design brief (§8.1):

     - one song: four bars of I – IV – I – V in C major, looping;
     - one tempo, 100 bpm, straight eighths (no swing);
     - three instruments (drums, bass, keys) x three styles
       (Spicy = Latin, Smooth = jazz, Hop = electronic dance),
       written so that any drum part fits any bass part fits any keys part;
     - the pad sounds: a juicy kick for the drums (the cowbell was a pitch,
       and so often out of key), and for the teacher to try, a clave, snare,
       electric or acoustic bass, suitcase Rhodes or organ.

   Pure Web Audio, no page needed: the same code plays live in the loop lab
   and renders the placeholder files in an OfflineAudioContext
   (tools/beat-smash-band/render.js). When Garnet's recordings arrive they
   replace the rendered files.

   The game (beat-smash.js) uses this file for two things only: the
   student's PAD SOUNDS, played live so a held note sustains until release,
   and a stand-in for any loop file that hasn't loaded yet.
   ========================================= */
(function (root) {
  'use strict';

  // THE TEMPO. 100 bpm, as the loop files were rendered; a song can ask for
  // another (Skate Park, the eighth-note song, is slower: content/songs.js
  // `bpm`). setTempo() changes it for everything booked from then on, so the
  // game sets it only while nothing is playing.
  let BPM = 100;
  let BEAT = 60 / BPM;            // 0.6 s
  let STEP = BEAT / 4;            // a semiquaver, 0.15 s
  let BAR = BEAT * 4;             // 2.4 s
  const BARS = 4;
  let LOOP = BAR * BARS;          // 9.6 s
  function setTempo(bpm) {
    BPM = bpm || 100;
    BEAT = 60 / BPM;
    STEP = BEAT / 4;
    BAR = BEAT * 4;
    LOOP = BAR * BARS;
  }

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // The song. Each bar carries its bass root and three voicings of its chord:
  // plain triads for the student's pads and the Latin part, rootless
  // extended chords for the jazz part, and bright high triads for dance.
  const I  = { bass: 36, plain: [55, 60, 64, 67], jazz: [52, 55, 59, 62], high: [60, 64, 67, 72] }; // C  · Cmaj9
  const IV = { bass: 41, plain: [57, 60, 65, 69], jazz: [57, 60, 64, 67], high: [60, 65, 69, 72] }; // F  · Fmaj9
  const V  = { bass: 43, plain: [55, 59, 62, 67], jazz: [53, 57, 59, 64], high: [59, 62, 67, 71] }; // G  · G13
  const SONG = [I, IV, I, V];
  const CHORD_BY_NAME = { I, IV, V };

  // ---------- shared noise ----------
  const noiseCache = new WeakMap();
  function noise(ctx) {
    let buf = noiseCache.get(ctx);
    if (buf) return buf;
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 12345;                                  // seeded, so renders repeat exactly
    for (let i = 0; i < d.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (s / 0x3fffffff) - 1;
    }
    noiseCache.set(ctx, buf);
    return buf;
  }

  // offset (optional): where in the noise to start. A fixed one makes every
  // hit the same sound, as a drum machine's sample is.
  function noiseBurst(ctx, out, t, dur, filterType, freq, q, peak, attack, offset) {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, offset === undefined ? (t * 7.13) % 1 * 0.5 : offset); src.stop(t + dur + 0.02);   // offset from t: repeatable
    return g;
  }

  function tone(ctx, out, t, type, f0, f1, sweep, dur, peak) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // A soft-clipping curve (tanh): adds the overtones that make a low drum
  // audible on a small speaker, without hard distortion.
  const SATURATE = (() => {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    return curve;
  })();

  // ---------- drums ----------
  const drum = {
    kick(ctx, out, t, v) {
      tone(ctx, out, t, 'sine', 150, 45, 0.12, 0.45, 0.95 * v);
      noiseBurst(ctx, out, t, 0.012, 'highpass', 3000, 0.7, 0.25 * v);
    },
    snare(ctx, out, t, v) {
      noiseBurst(ctx, out, t, 0.2, 'bandpass', 1800, 0.7, 0.55 * v);
      tone(ctx, out, t, 'triangle', 200, 170, 0.05, 0.12, 0.35 * v);
    },
    clap(ctx, out, t, v) {
      [0, 0.011, 0.022].forEach((d, i) =>
        noiseBurst(ctx, out, t + d, i === 2 ? 0.18 : 0.012, 'bandpass', 1300, 1.2, 0.6 * v));
    },
    hat(ctx, out, t, v, open) {
      noiseBurst(ctx, out, t, open ? 0.32 : 0.05, 'highpass', 7500, 0.7, 0.28 * v);
    },
    // The student's hi-hat pad (the eighth-note song's off-beats). A pad
    // sounds alone on a phone speaker, so it is built louder and a little
    // longer than the kit's hat, with a lower layer a phone can carry: the
    // lesson of Stomp Lab's tap snare.
    padHat(ctx, out, t, v) {
      noiseBurst(ctx, out, t, 0.09, 'highpass', 7000, 0.7, 0.5 * v);
      noiseBurst(ctx, out, t, 0.05, 'bandpass', 4200, 1.2, 0.3 * v);
    },
    shaker(ctx, out, t, v) {
      noiseBurst(ctx, out, t, 0.08, 'bandpass', 6500, 1.4, 0.22 * v, 0.012);
    },
    clave(ctx, out, t, v) {
      tone(ctx, out, t, 'sine', 2500, 2400, 0.02, 0.06, 0.4 * v);
    },
    rim(ctx, out, t, v) {
      tone(ctx, out, t, 'square', 1750, 1650, 0.02, 0.035, 0.18 * v);
      noiseBurst(ctx, out, t, 0.025, 'bandpass', 3200, 1, 0.3 * v);
    },
    conga(ctx, out, t, v, pitch) {
      tone(ctx, out, t, 'sine', pitch * 1.18, pitch, 0.025, 0.32, 0.55 * v);
    },
    ride(ctx, out, t, v) {
      // the classic drum-machine cymbal: inharmonic square waves, filtered
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 9000; bp.Q.value = 0.6;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      bp.connect(hp); hp.connect(g); g.connect(out);
      [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((f) => {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * 1.7;
        o.connect(bp); o.start(t); o.stop(t + 0.6);
      });
      tone(ctx, out, t, 'sine', 3150, 3150, 0, 0.35, 0.03 * v);   // the bell
    },
    // The student's own sound on the drums. Rob first asked for a cowbell
    // (playtest 2), then, having played it: "Get rid of the cowbell. It just
    // doesn't work. It's actually a pitch, so it's easily out of key... a
    // clave sound, or back to the kick, if we can make that kick nice and
    // juicy." A drum without a note in it: a body that drops from 130 to
    // 48 Hz for headphones, and, because a phone speaker plays almost nothing
    // below 150 Hz, a knock and a soft saturation that put the punch where a
    // phone can play it. Big enough to be heard as the student's own over the
    // band's kick.
    padKick(ctx, out, t, v) {
      const shape = ctx.createWaveShaper();
      shape.curve = SATURATE;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55 * v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      shape.connect(g); g.connect(out);
      const body = ctx.createOscillator(); body.type = 'sine';
      body.frequency.setValueAtTime(130, t);
      body.frequency.exponentialRampToValueAtTime(48, t + 0.16);
      const drive = ctx.createGain(); drive.gain.value = 1.8;
      body.connect(drive); drive.connect(shape);
      body.start(t); body.stop(t + 0.55);
      tone(ctx, out, t, 'triangle', 420, 140, 0.03, 0.06, 0.22 * v);            // the knock
      noiseBurst(ctx, out, t, 0.014, 'bandpass', 3200, 0.8, 0.18 * v);           // the beater
    },
    // The clave, for the teacher to try: short and high, over in 70 ms.
    padClave(ctx, out, t, v) {
      tone(ctx, out, t, 'sine', 2500, 2400, 0.02, 0.07, 0.55 * v);
      noiseBurst(ctx, out, t, 0.008, 'highpass', 4000, 0.7, 0.12 * v);
    },
    // THE WARM-UP'S GUIDE (Rob, after four classes of clarinets on an iPad:
    // "Let's just have a metronome. Just start with a tick... like a wooden
    // clave"). Wood, not a beep: a short pitched knock with a click on the
    // front, beat 1 a fifth higher. Built to be heard over a noisy room on a
    // tablet speaker, so it is loud on its own (0.6 peak, like Stomp Lab's
    // tap snare) and all of it sits above 900 Hz, where a small speaker plays.
    woodTick(ctx, out, t, v, accent) {
      const f = accent ? 2100 : 1400;
      tone(ctx, out, t, 'sine', f * 1.04, f, 0.012, 0.075, 0.26 * v);
      tone(ctx, out, t, 'triangle', f * 0.5, f * 0.48, 0.02, 0.05, 0.14 * v);
      noiseBurst(ctx, out, t, 0.008, 'highpass', 3500, 0.7, 0.14 * v);
    },
    // "Chick chick chick chick": the quavers, so the student can hear the
    // "and" between the beats. A swish (a short swell of air) with a bright
    // top, louder than the kit's shaker because it is on its own at first.
    // Every hit the same slice of noise, so it is as steady as a pulse should
    // be: left to the shared noise, one hit in sixteen came out three times
    // louder than the rest (0.68 against 0.2), an accent in the wrong place.
    guideShaker(ctx, out, t, v) {
      noiseBurst(ctx, out, t, 0.075, 'bandpass', 5200, 1.1, 0.48 * v, 0.012, 0.31);
      noiseBurst(ctx, out, t, 0.035, 'highpass', 8500, 0.7, 0.18 * v, undefined, 0.73);
    },
    crash(ctx, out, t, v) {
      noiseBurst(ctx, out, t, 1.0, 'highpass', 5200, 0.5, 0.3 * v, 0.004);
      noiseBurst(ctx, out, t, 0.5, 'bandpass', 3400, 0.8, 0.16 * v);
    },
  };

  // ---------- bass voices ----------
  // Each returns a handle whose release(t) ends the note, so the same voice
  // serves a fixed-length loop note and a pad held by the student.
  const bassVoice = {
    electric(ctx, out, t, midi, v) {
      const f = hz(midi);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(1400, t);
      lp.frequency.exponentialRampToValueAtTime(380, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.25);
      lp.connect(g); g.connect(out);
      const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = f;
      const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f;
      const subG = ctx.createGain(); subG.gain.value = 0.9;
      saw.connect(lp); sub.connect(subG); subG.connect(g);
      saw.start(t); sub.start(t);
      return { release(r) { g.gain.cancelScheduledValues(r); g.gain.setTargetAtTime(0.0001, r, 0.03); saw.stop(r + 0.3); sub.stop(r + 0.3); } };
    },
    acoustic(ctx, out, t, midi, v) {
      const f = hz(midi);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.7 * v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.6);      // an upright rings down
      g.gain.setTargetAtTime(0.12 * v, t + 0.6, 1.2);
      lp.connect(g); g.connect(out);
      const tri = ctx.createOscillator(); tri.type = 'triangle'; tri.frequency.value = f;
      const sin = ctx.createOscillator(); sin.type = 'sine'; sin.frequency.value = f * 2;
      const sinG = ctx.createGain(); sinG.gain.value = 0.25;
      tri.connect(lp); sin.connect(sinG); sinG.connect(lp);
      tri.start(t); sin.start(t);
      noiseBurst(ctx, out, t, 0.03, 'lowpass', 500, 0.7, 0.25 * v);   // the pluck's thump
      return { release(r) { g.gain.cancelScheduledValues(r); g.gain.setTargetAtTime(0.0001, r, 0.04); tri.stop(r + 0.3); sin.stop(r + 0.3); } };
    },
    synth(ctx, out, t, midi, v) {
      const f = hz(midi);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
      lp.frequency.setValueAtTime(2200, t);
      lp.frequency.exponentialRampToValueAtTime(300, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45 * v, t + 0.004);
      lp.connect(g); g.connect(out);
      const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = f; a.detune.value = -7;
      const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = f; b.detune.value = 7;
      const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = f / 2;
      const sG = ctx.createGain(); sG.gain.value = 0.8;
      a.connect(lp); b.connect(lp); s.connect(sG); sG.connect(g);
      [a, b, s].forEach((o) => o.start(t));
      return { release(r) { g.gain.cancelScheduledValues(r); g.gain.setTargetAtTime(0.0001, r, 0.02); [a, b, s].forEach((o) => o.stop(r + 0.2)); } };
    },
  };

  // ---------- keys voices ----------
  const keysVoice = {
    // Suitcase Rhodes: a 1:1 FM tine whose brightness decays, through the
    // suitcase's tremolo.
    rhodes(ctx, out, t, midis, v) {
      const trem = ctx.createGain(); trem.gain.value = 0.8;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6;
      const depth = ctx.createGain(); depth.gain.value = 0.2;
      lfo.connect(depth); depth.connect(trem.gain);
      trem.connect(out); lfo.start(t);
      const parts = [];
      midis.forEach((m) => {
        const f = hz(m);
        const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
        const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f;
        const idx = ctx.createGain();
        idx.gain.setValueAtTime(f * 1.4, t);
        idx.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.9);
        mod.connect(idx); idx.connect(car.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14 * v, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.07 * v, t + 1.0);
        g.gain.setTargetAtTime(0.03 * v, t + 1.0, 2.5);
        car.connect(g); g.connect(trem);
        car.start(t); mod.start(t);
        parts.push({ g, oscs: [car, mod] });
      });
      return { release(r) {
        parts.forEach((p) => { p.g.gain.cancelScheduledValues(r); p.g.gain.setTargetAtTime(0.0001, r, 0.08); p.oscs.forEach((o) => o.stop(r + 0.6)); });
        lfo.stop(r + 0.6);
      } };
    },
    // Drawbar organ: a stack of sine partials, a touch of key click and
    // a slow vibrato. It holds at full level for as long as the key is down.
    organ(ctx, out, t, midis, v) {
      const vib = ctx.createOscillator(); vib.frequency.value = 6.2;
      const vibDepth = ctx.createGain(); vibDepth.gain.value = 5;          // cents
      vib.connect(vibDepth); vib.start(t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03 * v, t + 0.012);
      g.connect(out);
      const oscs = [];
      midis.forEach((m) => {
        const f = hz(m);
        [[0.5, 0.5], [1, 1], [1.5, 0.45], [2, 0.55], [4, 0.2]].forEach(([mult, amp]) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult;
          vibDepth.connect(o.detune);
          const a = ctx.createGain(); a.gain.value = amp;
          o.connect(a); a.connect(g); o.start(t); oscs.push(o);
        });
      });
      noiseBurst(ctx, out, t, 0.01, 'bandpass', 2500, 1, 0.05 * v);       // key click
      return { release(r) {
        g.gain.cancelScheduledValues(r); g.gain.setTargetAtTime(0.0001, r, 0.02);
        oscs.forEach((o) => o.stop(r + 0.2)); vib.stop(r + 0.2);
      } };
    },
    // Dance-music pluck: three detuned saws through a snapping filter.
    pluck(ctx, out, t, midis, v) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
      lp.frequency.setValueAtTime(5000, t);
      lp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 * v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      lp.connect(g); g.connect(out);
      const oscs = [];
      midis.forEach((m) => [-9, 0, 9].forEach((d) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
        o.connect(lp); o.start(t); o.stop(t + 0.4); oscs.push(o);
      }));
      return { release() {} };
    },
    // Piano, for the chord guide: a bright strike that rings down, two
    // slightly detuned partials and an octave, no tremolo. Plain on purpose:
    // it is there to say which chord, not to be a part.
    piano(ctx, out, t, midis, v) {
      const parts = [];
      midis.forEach((m) => {
        const f = hz(m);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.045 * v, t + 0.5);
        g.gain.setTargetAtTime(0.012 * v, t + 0.5, 1.6);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(4000, f * 3), t + 0.8);
        lp.connect(g); g.connect(out);
        const oscs = [[1, 'triangle', -3, 1], [1, 'triangle', 3, 0.8], [2, 'sine', 0, 0.35]].map(([mult, type, detune, amp]) => {
          const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult; o.detune.value = detune;
          const a = ctx.createGain(); a.gain.value = amp;
          o.connect(a); a.connect(lp); o.start(t);
          return o;
        });
        parts.push({ g, oscs });
      });
      return { release(r) {
        parts.forEach((p) => { p.g.gain.cancelScheduledValues(r); p.g.gain.setTargetAtTime(0.0001, r, 0.12); p.oscs.forEach((o) => o.stop(r + 0.8)); });
      } };
    },
    // The tune in an audition: a soft, singing lead (a triangle with its
    // octave, a gentle swell, a slow vibrato that arrives late).
    lead(ctx, out, t, midi, v) {
      const f = hz(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.08 * v, t + 0.3);
      g.connect(out);
      const a = ctx.createOscillator(); a.type = 'triangle'; a.frequency.value = f;
      const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = f * 2;
      const bG = ctx.createGain(); bG.gain.value = 0.25;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(7, t + 0.45);          // cents, arriving late
      vib.connect(depth); depth.connect(a.detune); depth.connect(b.detune);
      a.connect(g); b.connect(bG); bG.connect(g);
      [a, b, vib].forEach((o) => o.start(t));
      return { release(r) { g.gain.cancelScheduledValues(r); g.gain.setTargetAtTime(0.0001, r, 0.05); [a, b, vib].forEach((o) => o.stop(r + 0.3)); } };
    },
    // Dance-music pad: soft saws, slow attack, ducked on every beat
    // (the "pumping" of a sidechained pad).
    pad(ctx, out, t, midis, v, dur) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      for (let k = 0; k < Math.round(dur / BEAT); k++) {
        const b = t + k * BEAT;
        g.gain.setValueAtTime(0.0001, b);
        g.gain.linearRampToValueAtTime(0.035 * v, b + BEAT * 0.55);
      }
      g.gain.setValueAtTime(0.035 * v, t + dur - 0.01);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      lp.connect(g); g.connect(out);
      midis.forEach((m) => [-12, 12].forEach((d) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
        o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
      }));
    },
  };

  // A part booked part-way through its cycle plays nothing before this time
  // (set by schedulePart for the length of one call): it joins in time,
  // from its next note, instead of firing every note it missed at once.
  let skipBefore = 0;

  function note(voice, ctx, out, t, pitch, dur, v) {
    if (t < skipBefore - 1e-6) return;
    const h = voice(ctx, out, t, pitch, v);
    h.release(t + dur);
  }

  // ---------- the nine parts ----------
  // Every pattern is in semiquaver steps (0–15) within a bar; the parts only
  // ever use straight eighths and sixteenths, so every style fits every other.
  const at = (t0, bar, step) => t0 + bar * BAR + step * STEP;

  // The loops' kit balance (playtest 1, §5.1). On a phone speaker the drum
  // loops came through as the kick and little else: Rob, choosing Tango's
  // part, "All we're getting is a kick drum." So in the loops the kick sits
  // back and the upper kit (hats, ride, rim, clap, shaker, clave, snare)
  // comes forward, until each style is told apart by what sits on top. The
  // student's own pad kick and the fill are untouched.
  const LOOP_KICK = 0.6, LOOP_UPPER = 2;
  const kit = {};
  Object.keys(drum).forEach((name) => {
    const scale = name === 'kick' ? LOOP_KICK : name === 'conga' ? 1 : LOOP_UPPER;
    kit[name] = (ctx, out, t, v, ...rest) => drum[name](ctx, out, t, v * scale, ...rest);
  });

  const PARTS = {
    drums: {
      // Latin: bossa kick, son clave (3-2), shaker, conga tumbao
      spicy(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [[0, 1], [6, 0.55], [8, 0.9], [14, 0.55]].forEach(([s, v]) => kit.kick(ctx, out, at(t0, b, s), v));
          (b % 2 === 0 ? [0, 6, 12] : [4, 8]).forEach((s) => kit.clave(ctx, out, at(t0, b, s), 1));
          for (let s = 0; s < 16; s += 2) kit.shaker(ctx, out, at(t0, b, s), s % 4 ? 1 : 0.6);
          kit.conga(ctx, out, at(t0, b, 4), 0.5, 330);
          kit.conga(ctx, out, at(t0, b, 12), 0.9, 196);
          kit.conga(ctx, out, at(t0, b, 14), 0.9, 262);
        }
      },
      // Jazz, played straight: ride cymbal, soft kick, cross-stick on 2 and 4
      smooth(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [[0, 0.7], [8, 0.5], [11, 0.35]].forEach(([s, v]) => kit.kick(ctx, out, at(t0, b, s), v));
          [4, 12].forEach((s) => kit.rim(ctx, out, at(t0, b, s), 0.9));
          for (let s = 0; s < 16; s += 2) kit.ride(ctx, out, at(t0, b, s), s % 4 ? 0.65 : 1);
          [4, 12].forEach((s) => kit.hat(ctx, out, at(t0, b, s), 0.35, false));
        }
      },
      // Dance: four on the floor, claps on 2 and 4, open hats on the "ands"
      hop(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [0, 4, 8, 12].forEach((s) => kit.kick(ctx, out, at(t0, b, s), 1));
          [4, 12].forEach((s) => kit.clap(ctx, out, at(t0, b, s), 0.9));
          [2, 6, 10, 14].forEach((s) => kit.hat(ctx, out, at(t0, b, s), 0.8, true));
          for (let s = 1; s < 16; s += 2) kit.hat(ctx, out, at(t0, b, s), 0.35, false);
          if (b === BARS - 1) [13, 14, 15].forEach((s) => kit.clap(ctx, out, at(t0, b, s), 0.5));
        }
      },
    },
    bass: {
      // Bossa: upright bass, root and fifth with the push on "2 and"
      spicy(ctx, out, t0, song = SONG) {
        for (let b = 0; b < BARS; b++) {
          const r = song[b].bass;
          [[0, 6, r], [6, 2, r + 7], [8, 6, r + 7], [14, 2, r + 12]]
            .forEach(([s, len, m]) => note(bassVoice.acoustic, ctx, out, at(t0, b, s), m, len * STEP * 0.95, 1));
        }
      },
      // Smooth jazz: electric bass, chord tones of the bar it is in. (It used
      // to step chromatically into the next root on the "and" of 4, which is
      // part of what Rob heard as the chords moving early.)
      smooth(ctx, out, t0, song = SONG) {
        for (let b = 0; b < BARS; b++) {
          const r = song[b].bass;
          [[0, 3, r], [3, 3, r + 12], [6, 4, r + 7], [10, 2, r + 9], [12, 2, r + 7], [14, 2, r + 4]]
            .forEach(([s, len, m]) => note(bassVoice.electric, ctx, out, at(t0, b, s), m, len * STEP * 0.9, 1));
        }
      },
      // Dance: synth bass pumping on the off-beats, an octave pop at the end
      hop(ctx, out, t0, song = SONG) {
        for (let b = 0; b < BARS; b++) {
          const r = song[b].bass;
          [[2, r], [6, r], [10, r], [14, r + 12]]
            .forEach(([s, m]) => note(bassVoice.synth, ctx, out, at(t0, b, s), m, 1.6 * STEP, 1));
        }
      },
    },
    keys: {
      // Latin montuno feel on a bright Rhodes. Every chord changes ON THE
      // BARLINE: Rob, playtest 2, heard the old anticipation (the next chord
      // on the "and" of 4) as the loop "moving at funny times" - "one bar on
      // the one, one bar on the four, one on the one, one on the five."
      spicy(ctx, out, t0, song = SONG) {
        for (let b = 0; b < BARS; b++) {
          const c = song[b].plain;
          [[2, 1], [6, 2], [10, 1], [12, 2], [14, 2]].forEach(([s, len]) =>
            note(keysVoice.rhodes, ctx, out, at(t0, b, s), c, len * STEP * 0.9, 0.9));
        }
      },
      // Smooth jazz: suitcase Rhodes, extended chords, laid out long, the
      // chord changing on the barline
      smooth(ctx, out, t0, song = SONG) {
        for (let b = 0; b < BARS; b++) {
          const c = song[b].jazz;
          note(keysVoice.rhodes, ctx, out, at(t0, b, 0), c, 6 * STEP, 0.85);
          note(keysVoice.rhodes, ctx, out, at(t0, b, 6), c, 7 * STEP, 0.7);
          note(keysVoice.rhodes, ctx, out, at(t0, b, 14), c, 2 * STEP, 0.75);
        }
      },
      // Dance: off-beat plucks over a pumping pad
      hop(ctx, out, t0, song = SONG) {
        for (let b = 0; b < BARS; b++) {
          const c = song[b].high;
          [2, 6, 10, 14].forEach((s) => note(keysVoice.pluck, ctx, out, at(t0, b, s), c, STEP, 1));
          if (at(t0, b, 0) >= skipBefore - 1e-6) keysVoice.pad(ctx, out, at(t0, b, 0), song[b].plain, 1, BAR);
        }
      },
    },
    // The first minute: Tango warming up. Plain and steady.
    warmup: {
      tango(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [0, 8].forEach((s) => kit.kick(ctx, out, at(t0, b, s), 1));
          [4, 12].forEach((s) => kit.snare(ctx, out, at(t0, b, s), 0.7));
          for (let s = 0; s < 16; s += 2) kit.hat(ctx, out, at(t0, b, s), s % 4 ? 0.5 : 0.8, false);
        }
      },
    },
  };

  // Mix levels. LEVEL balances the instruments; TRIM evens out a style that
  // sits quieter or louder than its neighbours. The render script reports
  // each loop's level so these can be checked by number as well as by ear.
  const LEVEL = { drums: 0.85, bass: 0.5, keys: 1.7, warmup: 0.85, guide: 1.5, click: 0.6, phrase: 1.6 };
  const TRIM = { 'drums-smooth': 1.7, 'keys-hop': 2.2 };
  // Rob's songs: a walking or half-note bass sustains under every keys hit,
  // so it sits a little lower than a loop's bass to leave the mix headroom.
  const SONG_TRIM = { bass: 0.8 };
  // A band part over a chosen song: the voicings sit higher than the loops',
  // and the busiest song (III7 VI7 ii V, hop) peaked at 0.97 untrimmed; this
  // brings every song and style back to the loops' headroom (measured: 0.87
  // at worst, against the C loops' 0.85).
  const BAND_TRIM = 0.85;

  // ---------- Rob's songs (content/songs.js) ----------
  // A song part is named 'song:<song id>:<comp name>', e.g.
  // 'song:ab-6dim:pump'. The keys play the song's voicings on the comp's
  // rhythm; the bass plays each bar's bass note on the same hits.
  const NOTE_STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const VALUE_BEATS = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };

  // 'Eb4' -> 63. Middle C is C4 (60).
  function noteMidi(name) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(String(name).trim());
    if (!m) throw new Error('Not a note: ' + name);
    return 12 * (Number(m[3]) + 1) + NOTE_STEPS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }

  // 'q. q. q. q. q q' -> [{ start, beats, rest }], repeated to fill the loop.
  function rhythmHits(text) {
    const one = String(text).trim().split(/\s+/).map((token) => {
      const m = /^(w|h|q|8|16)(\.)?(r)?$/.exec(token);
      if (!m) throw new Error('Not a rhythm value: ' + token);
      return { beats: VALUE_BEATS[m[1]] * (m[2] ? 1.5 : 1), rest: !!m[3] };
    });
    const total = BARS * 4;
    const cycle = one.reduce((a, h) => a + h.beats, 0);
    if (!(cycle > 0)) throw new Error('An empty rhythm');
    const hits = [];
    for (let start = 0, i = 0; start < total - 1e-9; i++) {
      const h = one[i % one.length];
      hits.push({ start, beats: Math.min(h.beats, total - start), rest: h.rest });
      start += h.beats;
    }
    return hits;
  }

  // Which chord a hit plays. A hit held across a chord change plays the NEW
  // chord if it starts within the beat before the change: that is the
  // anticipation (a pump on the "and" of 4 held over the barline). Starting
  // any earlier, it plays its own chord and the new one is struck again at
  // the change, so no chord ever sounds over the wrong bass.
  // compName may name one rhythm of a list, 'pumps#2'; a list named on its
  // own ('pumps') gives a different rhythm each time it is asked.
  // `chord` in each hit is an index into song.changes.
  function songHits(song, compName, lastPick) {
    const m = /^(.+?)(?:#(\d+))?$/.exec(compName);
    const comp = song.comp && song.comp[m[1]];
    if (!comp) throw new Error('No comp called ' + compName);
    let rhythm = comp;
    if (Array.isArray(comp)) {
      let pick = m[2] !== undefined ? Number(m[2]) : Math.floor(Math.random() * comp.length);
      // Loose, not repetitive: never the same rhythm twice running.
      if (m[2] === undefined && comp.length > 1 && pick === lastPick) pick = (pick + 1) % comp.length;
      if (!(pick in comp)) throw new Error('No rhythm ' + compName);
      rhythm = comp[pick];
      songHits.lastPick = pick;
    }
    const changes = song.changes;
    const at = (beat) => { let c = 0; while (c + 1 < changes.length && changes[c + 1].start <= beat + 1e-9) c++; return c; };
    const nextChange = (from, to) => changes.find((c) => c.start > from + 1e-9 && c.start < to - 1e-9);
    const hits = [];
    rhythmHits(rhythm).filter((h) => !h.rest).forEach((h) => {
      let start = h.start, restrike = false;
      const end = h.start + h.beats;
      while (start < end - 1e-9) {
        let chord = at(start);
        let change = nextChange(start, end);
        if (change && change.start - start <= 1 + 1e-9 && !restrike) {
          chord = changes.indexOf(change);          // the anticipation
          change = nextChange(change.start, end);
        }
        const stop = change ? change.start : end;
        hits.push({ start, beats: stop - start, rest: false, chord, restrike });
        start = stop; restrike = true;
      }
    });
    return hits;
  }

  // ---------- the audition: Rob's four-bar phrase ----------
  // A song's `audition` (content/songs.js) says what plays when a student
  // taps it: `phrase`, a four-bar tune in note values with a pitch after a
  // colon ('h:E5 q:G5 q:A5 | w:C6'; '|' is only for reading, 'qr' a rest),
  // and optionally `drums` (a loop style) and `bass` (a bass style).
  function phraseHits(text, shift, id) {
    let beat = 0;
    const hits = [];
    String(text).trim().split(/\s+/).filter((token) => token !== '|').forEach((token) => {
      const m = /^(w|h|q|8|16)(\.)?(r)?(?::(.+))?$/.exec(token);
      if (!m || (!m[3] && !m[4])) throw new Error('Not a note of ' + id + "'s phrase: " + token);
      const beats = VALUE_BEATS[m[1]] * (m[2] ? 1.5 : 1);
      if (!m[3]) hits.push({ start: beat, beats, midi: noteMidi(m[4]) + shift });
      beat += beats;
    });
    if (Math.abs(beat - BARS * 4) > 1e-9) throw new Error(id + "'s phrase is " + beat + ' beats, not ' + BARS * 4);
    return hits;
  }

  function auditionOf(audition, shift, id) {
    if (!audition) return null;
    return {
      phrase: audition.phrase ? phraseHits(audition.phrase, shift, id) : null,
      drums: audition.drums || null,
      bass: audition.bass || null,
    };
  }

  function phrasePart(ctx, out, songId, t0) {
    const audition = findSong(songId).audition;
    (audition && audition.phrase || []).forEach((h) =>
      note(keysVoice.lead, ctx, out, t0 + h.start * BEAT, h.midi, h.beats * BEAT * 0.94, 1));
  }

  // A song as the band plays it: every note a MIDI number, and its chords
  // laid out as `changes` over the four bars: [{ start, beats, chord, bass,
  // keys }], start and beats in beats from the top of the loop.
  // A bar is one chord, or a list of chords sharing the bar (evenly, unless
  // a chord says how many `beats` it takes). A song of one or two bars is
  // repeated to fill the four. A song written { like: 'c-6dim', transpose: -4 }
  // is that song moved by semitones.
  function findSong(id) {
    const songs = (root.KR && root.KR.songs) || {};
    const song = songs[id];
    if (!song) throw new Error('No song called ' + id);
    const base = song.like ? songs[song.like] : song;
    if (!base || base.like) throw new Error('A song can only be like a song written out: ' + id);
    const shift = song.like ? (song.transpose || 0) : 0;
    const written = base.bars;
    if (!written || BARS % written.length) throw new Error('A song is 1, 2 or 4 bars long: ' + id);
    let name = 0;
    const one = written.map((bar) => {
      const list = Array.isArray(bar) ? bar : [bar];
      const given = list.reduce((a, c) => a + (c.beats || 0), 0);
      const unsized = list.filter((c) => !c.beats).length;
      const each = unsized ? (4 - given) / unsized : 0;
      let beat = 0;
      const chords = list.map((c) => {
        const out = {
          start: beat, beats: c.beats || each,
          chord: (song.chords && song.chords[name]) || c.chord,
          bass: noteMidi(c.bass) + shift,
          keys: c.keys.map((k) => noteMidi(k) + shift),
        };
        name++; beat += out.beats;
        return out;
      });
      if (Math.abs(beat - 4) > 1e-9 || chords.some((c) => !(c.beats > 0))) throw new Error('A bar of ' + id + ' is not four beats');
      return chords;
    });
    const changes = [], bars = [];
    for (let b = 0; b < BARS; b++) {
      const chords = one[b % one.length].map((c) => Object.assign({}, c, { start: b * 4 + c.start }));
      chords.forEach((c) => changes.push(c));
      // For reading, and for a one-chord bar exactly as before: the bar's
      // chord names together, its first bass note and voicing.
      bars.push({ chord: chords.map((c) => c.chord).join(' '), bass: chords[0].bass, keys: chords[0].keys, chords });
    }
    return {
      id,
      comp: song.comp || base.comp,
      bass: song.bass || base.bass,
      drums: song.drums || base.drums,
      audition: auditionOf(song.audition || base.audition, shift, id),
      jam: song.jam || base.jam,
      bars, changes,
    };
  }

  // ---------- The bass: its own line, by STYLE ----------
  // Rob: "The only pump rhythm a bass plays is dotted quarter followed by
  // eighth. It mostly plays according to the style of music. The tumbao in
  // Cuban music. Half notes in traditional choro or bossa nova. Quarter notes
  // for walking in steps towards the next root note of the next chord."
  // So the bass does NOT follow the keys. Each style is a rule that makes a
  // line from the song's roots and the notes of each chord's voicing:
  //   whole   the root, held for the whole chord
  //   halves  root, then fifth halfway (choro, traditional bossa); a chord
  //           lasting two beats gets its root only
  //   pump    root dotted quarter, fifth on the "and"; fifth, root again
  //   walk    quarters: root, chord tones, then a half step into the next root
  //   tumbao  the Cuban anticipated bass: on the "and" of 2 the fifth of the
  //           chord coming next, on 4 the next chord's root, held over the
  //           barline. Beat 1 is silent.
  // "The fifth" is the chord's own: the perfect fifth if the voicing has it,
  // else its flat or sharp fifth (a diminished chord gets its diminished
  // fifth, an alt chord its flat 13), else the perfect fifth anyway (an F13
  // voiced without its C still has a C in the bass).
  const BASS_STYLES = ['whole', 'halves', 'pump', 'walk', 'tumbao'];
  const BASS_LOW = 36, BASS_HIGH = 57;     // C2 to A3: where the walking line may go

  function chordTones(bar) {
    const pcs = new Set(bar.keys.map((m) => ((m % 12) + 12) % 12));
    pcs.add(((bar.bass % 12) + 12) % 12);
    return pcs;
  }

  function fifthOf(bar) {
    const tones = chordTones(bar);
    const has = (m) => tones.has(((m % 12) + 12) % 12);
    for (const gap of [7, 6, 8]) if (has(bar.bass + gap)) return bar.bass + gap;
    return bar.bass + 7;
  }

  function nearestOctave(note, to) {
    return note + 12 * Math.round((to - note) / 12);
  }

  function inBassRange(m) {
    while (m > BASS_HIGH) m -= 12;
    while (m < BASS_LOW) m += 12;
    return m;
  }

  function bassLine(song, style) {
    const changes = song.changes, hits = [];
    const add = (start, beats, midi) => hits.push({ start, beats, midi });
    const after = (i) => changes[(i + 1) % changes.length];
    if (style === 'walk') {
      let prev = null;
      changes.forEach((c, i) => {
        const r = inBassRange(prev === null ? c.bass : nearestOctave(c.bass, prev));
        const tones = chordTones(c);
        const up = (from, gap) => { let m = from + gap; while (!tones.has(((m % 12) + 12) % 12)) m++; return m; };
        const down = (from, gap) => { let m = from - gap; while (!tones.has(((m % 12) + 12) % 12)) m--; return m; };
        const steps = Math.max(1, Math.round(c.beats));
        const line = [r];
        // chord tones climbing (or falling, if climbing leaves the bass)
        let goingUp = true;
        for (let k = 1; k < steps - 1; k++) {
          const from = line[line.length - 1];
          let m = goingUp ? up(from, k === 1 ? 3 : 2) : down(from, k === 1 ? 3 : 2);
          if (goingUp && m > BASS_HIGH) { goingUp = false; m = down(from, k === 1 ? 3 : 2); }
          line.push(m);
        }
        if (steps > 1) {
          const last = line[line.length - 1];
          const target = inBassRange(nearestOctave(after(i).bass, last));
          let approach = target > last ? target - 1 : target + 1;
          if (approach === last) approach = target > last ? target + 1 : target - 1;
          line.push(approach);
        }
        line.forEach((m, k) => add(c.start + k * (c.beats / steps), c.beats / steps, m));
        prev = line[line.length - 1];
      });
      return hits;
    }
    if (style === 'tumbao') {
      // Bar by bar: the "and" of 2 and beat 4 each look ahead to the chord
      // after the one sounding there.
      const chordAt = (beat) => { let k = 0; while (k + 1 < changes.length && changes[k + 1].start <= beat + 1e-9) k++; return k; };
      for (let b = 0; b < BARS; b++) {
        add(b * 4 + 1.5, 1.5, fifthOf(after(chordAt(b * 4 + 1.5))));
        add(b * 4 + 3, 2, after(chordAt(b * 4 + 3)).bass);
      }
      return hits;
    }
    changes.forEach((c) => {
      const r = c.bass, five = fifthOf(c), at = c.start;
      if (style === 'whole') add(at, c.beats, r);
      else if (style === 'halves') {
        if (c.beats >= 4) { add(at, c.beats / 2, r); add(at + c.beats / 2, c.beats / 2, five); }
        else add(at, c.beats, r);
      } else if (style === 'pump') {
        for (let k = 0; k + 2 <= c.beats + 1e-9; k += 2) {
          const [a, b] = (k / 2) % 2 ? [five, r] : [r, five];
          add(at + k, 1.5, a); add(at + k + 1.5, 0.5, b);
        }
      } else throw new Error('No bass style called ' + style);
    });
    return hits;
  }

  // A song's bass part by name: song.bass maps a name ('whole', 'groove') to a
  // style; a style's own name works too.
  function bassStyle(song, name) {
    const map = Object.assign({ whole: 'whole', groove: 'walk' }, song.bass);
    const style = map[name] || name;
    if (BASS_STYLES.indexOf(style) === -1) throw new Error('No bass style called ' + name);
    return style;
  }

  // from: skip any hit before this time, so a part can join mid-loop cleanly.
  // The keys' rhythm is picked once per song and cycle start, so a part
  // booked twice for the same cycle plays the same rhythm both times.
  const picks = {};
  function songPart(ctx, out, instrument, songId, compName, t0, from) {
    const song = findSong(songId);
    if (instrument === 'bass') {
      bassLine(song, bassStyle(song, compName)).forEach((h) => {
        const t = t0 + h.start * BEAT;
        if (from && t < from) return;
        note(bassVoice.electric, ctx, out, t, h.midi, h.beats * BEAT * 0.92, 1);
      });
      return;
    }
    const key = songId + '|' + compName + '|' + t0.toFixed(3);
    let hits;
    if (picks[key]) hits = picks[key];
    else {
      hits = songHits(song, compName, picks[songId + '|' + compName + '|last']);
      picks[songId + '|' + compName + '|last'] = songHits.lastPick;
      picks[key] = hits;
      const keys = Object.keys(picks);
      if (keys.length > 64) keys.slice(0, keys.length - 64).forEach((k) => { if (k.slice(-5) !== '|last') delete picks[k]; });
    }
    hits.forEach((h) => {
      const t = t0 + h.start * BEAT;
      if (from && t < from) return;
      const chord = song.changes[h.chord];
      const len = h.beats * BEAT;
      if (instrument === 'keys') note(keysVoice.rhodes, ctx, out, t, chord.keys, len * 0.95, h.beats >= 4 ? 0.85 : 0.9);
    });
  }

  // ---------- the band over a chosen song ----------
  // Beat Smash's band follows the song the student chose (Rob, 2026-10-02:
  // "all of their 1, 2, 4 and 8 bars are backed by the chord progression").
  // The won parts keep their style (spicy, smooth, hop) but take each bar's
  // chord from the song: the root for the bass, the song's own voicing for
  // the keys. 'band:<song>:<style>' names such a part.
  const bandCache = {};
  function bandChords(songId) {
    if (bandCache[songId]) return bandCache[songId];
    const song = findSong(songId);
    const chords = song.bars.map((bar) => {
      const root = 36 + (((bar.bass - 36) % 12) + 12) % 12;      // C2 to B2, where the loops' bass sits
      const low = bar.keys.map((m) => m - 12);
      return { bass: root, plain: low, jazz: low, high: bar.keys.slice() };
    });
    bandCache[songId] = chords;
    return chords;
  }

  // The chord guide: the song in plain piano chords, a whole note a chord,
  // the root in the left hand. It is what the song chooser auditions, and
  // what backs every take until the keys are won.
  function guidePart(ctx, out, songId, t0) {
    findSong(songId).changes.forEach((c) => {
      const left = 48 + (((c.bass - 48) % 12) + 12) % 12;          // C3 to B3
      note(keysVoice.piano, ctx, out, t0 + c.start * BEAT, [left].concat(c.keys), c.beats * BEAT * 0.97, 1);
    });
  }

  // A little metronome: one click a beat, beat 1 higher.
  function clickPart(ctx, out, t0) {
    for (let beat = 0; beat < BARS * 4; beat++) {
      const t = t0 + beat * BEAT;
      if (t < skipBefore - 1e-6) continue;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = beat % 4 ? 1046 : 1568;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(beat % 4 ? 0.22 : 0.3, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.06);
    }
  }

  // The warm-up's metronome: the wooden tick on every beat, beat 1 higher.
  function metronomePart(ctx, out, t0) {
    for (let beat = 0; beat < BARS * 4; beat++) {
      const t = t0 + beat * BEAT;
      if (t < skipBefore - 1e-6) continue;
      drum.woodTick(ctx, out, t, 1, beat % 4 === 0);
    }
  }

  // The warm-up's shaker: every quaver, the "and" a little stronger than the
  // beat (Rob: "use that offbeat of the quaver to guide you").
  function shakerPart(ctx, out, t0) {
    for (let e = 0; e < BARS * 8; e++) {
      const t = t0 + e * BEAT / 2;
      if (t < skipBefore - 1e-6) continue;
      drum.guideShaker(ctx, out, t, e % 2 ? 1 : 0.5);
    }
  }

  // from (optional): an audio time before which nothing is played, so a
  // part can join part-way through its cycle, in time.
  function schedulePart(ctx, dest, instrument, style, t0, from) {
    const g = ctx.createGain();
    const song = /^song:([^:]+):(.+)$/.exec(style);
    const band = /^band:([^:]+):(.+)$/.exec(style);
    const guide = /^guide:(.+)$/.exec(style);
    const phrase = /^phrase:(.+)$/.exec(style);
    g.gain.value = song ? LEVEL[instrument] * (SONG_TRIM[instrument] || 1)
      : band ? LEVEL[instrument] * (TRIM[instrument + '-' + band[2]] || 1) * BAND_TRIM
      : guide ? LEVEL.guide
      : phrase ? LEVEL.phrase
      : style === 'click' ? LEVEL.click
      : style === 'metronome' || style === 'shaker' ? 1
      : LEVEL[instrument] * (TRIM[instrument + '-' + style] || 1);
    g.connect(dest);
    skipBefore = from || 0;
    try {
      if (song) songPart(ctx, g, instrument, song[1], song[2], t0, from);
      else if (band) PARTS[instrument][band[2]](ctx, g, t0, bandChords(band[1]));
      else if (guide) guidePart(ctx, g, guide[1], t0);
      else if (phrase) phrasePart(ctx, g, phrase[1], t0);
      else if (style === 'click') clickPart(ctx, g, t0);
      else if (style === 'metronome') metronomePart(ctx, g, t0);
      else if (style === 'shaker') shakerPart(ctx, g, t0);
      else PARTS[instrument][style](ctx, g, t0);
    } finally {
      skipBefore = 0;
    }
    return g;
  }

  // ---------- the fill: the band is about to turn a corner ----------
  // In the bar starting at t0: the snare builds through beats 3 and 4, the
  // last beat in sixteenths, and a crash and a kick land on the next beat 1,
  // where the band changes. Returns the gain node, so it can be silenced.
  function fill(ctx, dest, t0) {
    const g = ctx.createGain();
    g.gain.value = LEVEL.drums;
    g.connect(dest);
    [[8, 0.45], [10, 0.55], [12, 0.65], [13, 0.7], [14, 0.8], [15, 0.9]]
      .forEach(([s, v]) => drum.snare(ctx, g, at(t0, 0, s), v));
    [8, 12].forEach((s) => drum.kick(ctx, g, at(t0, 0, s), 0.8));
    drum.kick(ctx, g, t0 + BAR, 1);
    drum.crash(ctx, g, t0 + BAR, 1);
    return g;
  }

  // ---------- the student's pad ----------
  // kind: 'kick' | 'clave' | 'snare' | 'bass-electric' | 'bass-acoustic' | 'rhodes' | 'organ'
  // chord: 'I' | 'IV' | 'V' (a bar of the C loops), or a chord of a chosen
  // song from chordOf() - { bass, plain }
  // Returns { release(t) }: drums ignore it; bass and keys sustain until it.
  function pad(ctx, dest, t, kind, chord) {
    const c = chord && typeof chord === 'object' ? chord : CHORD_BY_NAME[chord || 'I'];
    switch (kind) {
      case 'kick': drum.padKick(ctx, dest, t, 1); return { release() {} };
      case 'clave': drum.padClave(ctx, dest, t, 1); return { release() {} };
      case 'hat': drum.padHat(ctx, dest, t, 1); return { release() {} };
      case 'snare': drum.snare(ctx, dest, t, 1); return { release() {} };
      case 'bass-electric': return bassVoice.electric(ctx, dest, t, c.bass + 12, 1);
      case 'bass-acoustic': return bassVoice.acoustic(ctx, dest, t, c.bass + 12, 1);
      case 'rhodes': return keysVoice.rhodes(ctx, dest, t, c.plain, 1.2);
      case 'organ': return keysVoice.organ(ctx, dest, t, c.plain, 1.2);
      default: throw new Error('Unknown pad sound: ' + kind);
    }
  }

  root.BeatSmashBand = {
    get BPM() { return BPM; }, get BEAT() { return BEAT; }, get STEP() { return STEP; },
    get BAR() { return BAR; }, get LOOP() { return LOOP; }, BARS,
    setTempo,
    SONG_NAMES: ['I', 'IV', 'I', 'V'],
    INSTRUMENTS: ['drums', 'bass', 'keys'],
    STYLES: ['spicy', 'smooth', 'hop'],
    PAD_SOUNDS: ['kick', 'clave', 'hat', 'snare', 'bass-electric', 'bass-acoustic', 'rhodes', 'organ'],
    schedulePart,
    fill,
    pad,
    noteMidi,
    songHits: (songId, compName, lastPick) => songHits(findSong(songId), compName, lastPick),
    lastPick: () => songHits.lastPick,
    BASS_STYLES,
    bassLine: (songId, name) => bassLine(findSong(songId), bassStyle(findSong(songId), name)),
    song: findSong,
    chordOf: (songId, bar) => bandChords(songId)[((bar % BARS) + BARS) % BARS],
  };
})(typeof window !== 'undefined' ? window : globalThis);

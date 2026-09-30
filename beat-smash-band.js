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
     - the pad sounds the student chooses from: kick or snare, electric or
       acoustic bass, suitcase Rhodes or organ.

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

  const BPM = 100;
  const BEAT = 60 / BPM;          // 0.6 s
  const STEP = BEAT / 4;          // a semiquaver, 0.15 s
  const BAR = BEAT * 4;           // 2.4 s
  const BARS = 4;
  const LOOP = BAR * BARS;        // 9.6 s

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

  function noiseBurst(ctx, out, t, dur, filterType, freq, q, peak, attack) {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, (t * 7.13) % 1 * 0.5); src.stop(t + dur + 0.02);   // offset from t: repeatable
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

  function note(voice, ctx, out, t, pitch, dur, v) {
    const h = voice(ctx, out, t, pitch, v);
    h.release(t + dur);
  }

  // ---------- the nine parts ----------
  // Every pattern is in semiquaver steps (0–15) within a bar; the parts only
  // ever use straight eighths and sixteenths, so every style fits every other.
  const at = (t0, bar, step) => t0 + bar * BAR + step * STEP;
  const nextChord = (bar) => SONG[(bar + 1) % BARS];

  const PARTS = {
    drums: {
      // Latin: bossa kick, son clave (3-2), shaker, conga tumbao
      spicy(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [[0, 1], [6, 0.55], [8, 0.9], [14, 0.55]].forEach(([s, v]) => drum.kick(ctx, out, at(t0, b, s), v));
          (b % 2 === 0 ? [0, 6, 12] : [4, 8]).forEach((s) => drum.clave(ctx, out, at(t0, b, s), 1));
          for (let s = 0; s < 16; s += 2) drum.shaker(ctx, out, at(t0, b, s), s % 4 ? 1 : 0.6);
          drum.conga(ctx, out, at(t0, b, 4), 0.5, 330);
          drum.conga(ctx, out, at(t0, b, 12), 0.9, 196);
          drum.conga(ctx, out, at(t0, b, 14), 0.9, 262);
        }
      },
      // Jazz, played straight: ride cymbal, soft kick, cross-stick on 2 and 4
      smooth(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [[0, 0.7], [8, 0.5], [11, 0.35]].forEach(([s, v]) => drum.kick(ctx, out, at(t0, b, s), v));
          [4, 12].forEach((s) => drum.rim(ctx, out, at(t0, b, s), 0.9));
          for (let s = 0; s < 16; s += 2) drum.ride(ctx, out, at(t0, b, s), s % 4 ? 0.65 : 1);
          [4, 12].forEach((s) => drum.hat(ctx, out, at(t0, b, s), 0.35, false));
        }
      },
      // Dance: four on the floor, claps on 2 and 4, open hats on the "ands"
      hop(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [0, 4, 8, 12].forEach((s) => drum.kick(ctx, out, at(t0, b, s), 1));
          [4, 12].forEach((s) => drum.clap(ctx, out, at(t0, b, s), 0.9));
          [2, 6, 10, 14].forEach((s) => drum.hat(ctx, out, at(t0, b, s), 0.8, true));
          for (let s = 1; s < 16; s += 2) drum.hat(ctx, out, at(t0, b, s), 0.35, false);
          if (b === BARS - 1) [13, 14, 15].forEach((s) => drum.clap(ctx, out, at(t0, b, s), 0.5));
        }
      },
    },
    bass: {
      // Bossa: upright bass, root and fifth with the push on "2 and"
      spicy(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          const r = SONG[b].bass;
          [[0, 6, r], [6, 2, r + 7], [8, 6, r + 7], [14, 2, r + 12]]
            .forEach(([s, len, m]) => note(bassVoice.acoustic, ctx, out, at(t0, b, s), m, len * STEP * 0.95, 1));
        }
      },
      // Smooth jazz: electric bass, chord tones and a chromatic step into
      // the next bar's root
      smooth(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          const r = SONG[b].bass;
          const approach = nextChord(b).bass - 1;
          [[0, 3, r], [3, 3, r + 12], [6, 4, r + 7], [10, 2, r + 9], [12, 2, r + 7], [14, 2, approach]]
            .forEach(([s, len, m]) => note(bassVoice.electric, ctx, out, at(t0, b, s), m, len * STEP * 0.9, 1));
        }
      },
      // Dance: synth bass pumping on the off-beats, an octave pop at the end
      hop(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          const r = SONG[b].bass;
          [[2, r], [6, r], [10, r], [14, r + 12]]
            .forEach(([s, m]) => note(bassVoice.synth, ctx, out, at(t0, b, s), m, 1.6 * STEP, 1));
        }
      },
    },
    keys: {
      // Latin montuno feel on a bright Rhodes, anticipating the next chord
      spicy(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          const c = SONG[b].plain;
          [[2, 1], [6, 2], [10, 1], [12, 2]].forEach(([s, len]) =>
            note(keysVoice.rhodes, ctx, out, at(t0, b, s), c, len * STEP * 0.9, 0.9));
          note(keysVoice.rhodes, ctx, out, at(t0, b, 14), nextChord(b).plain, 2 * STEP * 0.9, 0.9);
        }
      },
      // Smooth jazz: suitcase Rhodes, extended chords, laid out long
      smooth(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          const c = SONG[b].jazz;
          note(keysVoice.rhodes, ctx, out, at(t0, b, 0), c, 6 * STEP, 0.85);
          note(keysVoice.rhodes, ctx, out, at(t0, b, 6), c, 7 * STEP, 0.7);
          note(keysVoice.rhodes, ctx, out, at(t0, b, 14), nextChord(b).jazz, 2 * STEP, 0.75);
        }
      },
      // Dance: off-beat plucks over a pumping pad
      hop(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          const c = SONG[b].high;
          [2, 6, 10, 14].forEach((s) => note(keysVoice.pluck, ctx, out, at(t0, b, s), c, STEP, 1));
          keysVoice.pad(ctx, out, at(t0, b, 0), SONG[b].plain, 1, BAR);
        }
      },
    },
    // The first minute: Tango warming up. Plain and steady.
    warmup: {
      tango(ctx, out, t0) {
        for (let b = 0; b < BARS; b++) {
          [0, 8].forEach((s) => drum.kick(ctx, out, at(t0, b, s), 1));
          [4, 12].forEach((s) => drum.snare(ctx, out, at(t0, b, s), 0.7));
          for (let s = 0; s < 16; s += 2) drum.hat(ctx, out, at(t0, b, s), s % 4 ? 0.5 : 0.8, false);
        }
      },
    },
  };

  // Mix levels. LEVEL balances the instruments; TRIM evens out a style that
  // sits quieter or louder than its neighbours. The render script reports
  // each loop's level so these can be checked by number as well as by ear.
  const LEVEL = { drums: 0.85, bass: 0.5, keys: 1.7, warmup: 0.85 };
  const TRIM = { 'drums-smooth': 1.7, 'keys-hop': 2.2 };
  // Rob's songs: a walking or half-note bass sustains under every keys hit,
  // so it sits a little lower than a loop's bass to leave the mix headroom.
  const SONG_TRIM = { bass: 0.8 };

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

  // Which bar's chord a hit plays: its own bar's, unless it is held across
  // the barline, in which case the NEXT bar's - the anticipation.
  // compName may name one rhythm of a list, 'pumps#2'; a list named on its
  // own ('pumps') gives a different rhythm each time it is asked.
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
    return rhythmHits(rhythm).filter((h) => !h.rest).map((h) => {
      const bar = Math.floor(h.start / 4 + 1e-9);
      const crosses = h.start + h.beats > (bar + 1) * 4 + 1e-9;
      return Object.assign({ chord: crosses ? (bar + 1) % BARS : bar }, h);
    });
  }

  // A song as the band plays it: every note a MIDI number. A song written
  // { like: 'c-6dim', transpose: -4 } is that song moved by semitones.
  function findSong(id) {
    const songs = (root.KR && root.KR.songs) || {};
    const song = songs[id];
    if (!song) throw new Error('No song called ' + id);
    const base = song.like ? songs[song.like] : song;
    if (!base || base.like) throw new Error('A song can only be like a song written out: ' + id);
    const shift = song.like ? (song.transpose || 0) : 0;
    return {
      id,
      comp: song.comp || base.comp,
      bass: song.bass || base.bass,
      bars: base.bars.map((bar, i) => ({
        chord: (song.chords && song.chords[i]) || bar.chord,
        bass: noteMidi(bar.bass) + shift,
        keys: bar.keys.map((k) => noteMidi(k) + shift),
      })),
    };
  }

  // ---------- The bass: its own line, by STYLE ----------
  // Rob: "The only pump rhythm a bass plays is dotted quarter followed by
  // eighth. It mostly plays according to the style of music. The tumbao in
  // Cuban music. Half notes in traditional choro or bossa nova. Quarter notes
  // for walking in steps towards the next root note of the next chord."
  // So the bass does NOT follow the keys. Each style is a rule that makes a
  // line from the song's roots and the notes of each bar's voicing:
  //   whole   the root, a whole note
  //   halves  root on 1, fifth on 3 (choro, traditional bossa)
  //   pump    root dotted quarter, fifth on the "and" of 2; fifth, root again
  //   walk    quarters: root, two chord tones, then a half step into the next root
  //   tumbao  the Cuban anticipated bass: on the "and" of 2 the next chord's
  //           fifth, on 4 its root, held over the barline. Beat 1 is silent.
  // "The fifth" is the chord's own: the voicing note nearest a perfect fifth
  // above the root, so a diminished chord gets its diminished fifth.
  const BASS_STYLES = ['whole', 'halves', 'pump', 'walk', 'tumbao'];
  const BASS_LOW = 36, BASS_HIGH = 57;     // C2 to A3: where the walking line may go

  function chordTones(bar) {
    const pcs = new Set(bar.keys.map((m) => ((m % 12) + 12) % 12));
    pcs.add(((bar.bass % 12) + 12) % 12);
    return pcs;
  }

  function nearestTone(tones, target) {
    for (let d = 0; d < 7; d++) {
      if (tones.has(((target - d) % 12 + 12) % 12)) return target - d;
      if (tones.has(((target + d) % 12 + 12) % 12)) return target + d;
    }
    return target;
  }

  function fifthOf(bar) {
    return nearestTone(chordTones(bar), bar.bass + 7);
  }

  function nearestOctave(note, to) {
    return note + 12 * Math.round((to - note) / 12);
  }

  function bassLine(song, style) {
    const bars = song.bars, hits = [];
    const add = (start, beats, midi) => hits.push({ start, beats, midi });
    if (style === 'walk') {
      let prev = null;
      bars.forEach((bar, b) => {
        let r = prev === null ? bar.bass : nearestOctave(bar.bass, prev);
        while (r > BASS_HIGH) r -= 12;
        while (r < BASS_LOW) r += 12;
        const tones = chordTones(bar);
        const up = (from, gap) => { let m = from + gap; while (!tones.has(((m % 12) + 12) % 12)) m++; return m; };
        const down = (from, gap) => { let m = from - gap; while (!tones.has(((m % 12) + 12) % 12)) m--; return m; };
        let two = up(r, 3), three = up(two, 2);
        if (three > BASS_HIGH) { two = down(r, 3); three = down(two, 2); }
        const next = bars[(b + 1) % bars.length];
        let target = nearestOctave(next.bass, three);
        while (target > BASS_HIGH) target -= 12;
        while (target < BASS_LOW) target += 12;
        let approach = target > three ? target - 1 : target + 1;
        if (approach === three) approach = target > three ? target + 1 : target - 1;
        [r, two, three, approach].forEach((m, k) => add(b * 4 + k, 1, m));
        prev = approach;
      });
      return hits;
    }
    bars.forEach((bar, b) => {
      const r = bar.bass, five = fifthOf(bar), next = bars[(b + 1) % bars.length];
      const at = b * 4;
      if (style === 'whole') add(at, 4, r);
      else if (style === 'halves') { add(at, 2, r); add(at + 2, 2, five); }
      else if (style === 'pump') { add(at, 1.5, r); add(at + 1.5, 0.5, five); add(at + 2, 1.5, five); add(at + 3.5, 0.5, r); }
      else if (style === 'tumbao') { add(at + 1.5, 1.5, fifthOf(next)); add(at + 3, 2, next.bass); }
      else throw new Error('No bass style called ' + style);
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
      const bar = song.bars[h.chord];
      const len = h.beats * BEAT;
      if (instrument === 'keys') note(keysVoice.rhodes, ctx, out, t, bar.keys, len * 0.95, h.beats >= 4 ? 0.85 : 0.9);
    });
  }

  // from (optional): an audio time before which nothing is played. Only
  // Rob's songs can use it; the fixed loops always start at their top.
  function schedulePart(ctx, dest, instrument, style, t0, from) {
    const g = ctx.createGain();
    const song = /^song:([^:]+):(.+)$/.exec(style);
    g.gain.value = LEVEL[instrument] * (song ? (SONG_TRIM[instrument] || 1) : (TRIM[instrument + '-' + style] || 1));
    g.connect(dest);
    if (song) songPart(ctx, g, instrument, song[1], song[2], t0, from);
    else PARTS[instrument][style](ctx, g, t0);
    return g;
  }

  // ---------- the student's pad ----------
  // kind: 'kick' | 'snare' | 'bass-electric' | 'bass-acoustic' | 'rhodes' | 'organ'
  // chord: 'I' | 'IV' | 'V' (the bar being played)
  // Returns { release(t) }: drums ignore it; bass and keys sustain until it.
  function pad(ctx, dest, t, kind, chord) {
    const c = CHORD_BY_NAME[chord || 'I'];
    switch (kind) {
      case 'kick': drum.kick(ctx, dest, t, 1); return { release() {} };
      case 'snare': drum.snare(ctx, dest, t, 1); return { release() {} };
      case 'bass-electric': return bassVoice.electric(ctx, dest, t, c.bass + 12, 1);
      case 'bass-acoustic': return bassVoice.acoustic(ctx, dest, t, c.bass + 12, 1);
      case 'rhodes': return keysVoice.rhodes(ctx, dest, t, c.plain, 1.2);
      case 'organ': return keysVoice.organ(ctx, dest, t, c.plain, 1.2);
      default: throw new Error('Unknown pad sound: ' + kind);
    }
  }

  root.BeatSmashBand = {
    BPM, BEAT, STEP, BAR, BARS, LOOP,
    SONG_NAMES: ['I', 'IV', 'I', 'V'],
    INSTRUMENTS: ['drums', 'bass', 'keys'],
    STYLES: ['spicy', 'smooth', 'hop'],
    PAD_SOUNDS: ['kick', 'snare', 'bass-electric', 'bass-acoustic', 'rhodes', 'organ'],
    schedulePart,
    pad,
    noteMidi,
    songHits: (songId, compName, lastPick) => songHits(findSong(songId), compName, lastPick),
    lastPick: () => songHits.lastPick,
    BASS_STYLES,
    bassLine: (songId, name) => bassLine(findSong(songId), bassStyle(findSong(songId), name)),
    song: findSong,
  };
})(typeof window !== 'undefined' ? window : globalThis);

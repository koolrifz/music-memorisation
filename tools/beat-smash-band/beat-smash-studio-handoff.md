# Beat Smash Studio — the placeholder band, for review

**2026-09-29.** A handoff for AI reviewers. It describes a small web page that
plays placeholder music for **Beat Smash**, a rhythm-reading game in the Kool
Riffs app, and asks for your critique. **The full page is at the end of this
file**: save that code block as `beat-smash-studio.html` and open it in Chrome
or Safari to hear it. It needs no server and no other files.

---

## 1. Context in a few lines

Kool Riffs is a browser app that teaches children (6–12, mostly wind and string
players) to read music. Beat Smash is its first rhythm game, set in a
**recording studio**. The student wins three musicians, one at a time, by
reading and tapping rhythms in real notation:

- **Tango** (a cat, the drummer) on **drums**;
- **Riff** (a Scottie dog) on **bass**;
- **Riff** again on **keys**.

After each musician is won, the student **chooses that musician's part** from
three ready-made loops, one in each style:

- **Spicy**: Latin (bossa nova, mambo);
- **Smooth**: jazz, played straight;
- **Hop**: electronic dance music.

The student may **mix and match** (for example Spicy drums, Smooth bass and Hop
keys), so every loop must fit every other: **27 possible bands**.

The real loops will be recorded by **Garnet**, a musician. Until they arrive,
this page and the files it renders are **synthesised placeholders**, built to
the same spec.

## 2. The spec every loop follows

| | |
|---|---|
| Song | four bars of **I – IV – I – V** in **C major**, looping seamlessly |
| Tempo | **100 bpm**, one tempo for every loop |
| Feel | **straight eighths, no swing**, so every style mixes with every other |
| Loops | 3 instruments × 3 styles = 9, plus a simple drum groove for the game's first minute |
| Test | all 27 drums + bass + keys combinations must sound good together |

Voicings: plain triads for the Latin part and the student's pads (C, F, G);
rootless extended chords for the jazz part (Cmaj9, Fmaj9, G13); bright high
triads for the dance part.

## 3. What the page does

- **Three channel rows** (Drums · Tango, Bass · Riff, Keys · Riff), each with
  Spicy, Smooth, Hop and Off. **Play the band** loops the chosen combination.
  A change made while playing lands at the start of the next loop.
- **An LCD strip** shows the four bars (I, IV, I, V), with a light for each
  beat and a recording light.
- **Tango warming up** plays the plain groove for the game's first minute:
  kick on 1 and 3, snare on 2 and 4, hi-hat eighths.
- **Your pad**: the student's own sound while winning each musician. They
  choose **kick or snare** (drums), **electric or acoustic bass**, or
  **suitcase Rhodes or organ** (keys). **Hold** the big pad (or the space bar):
  bass and keys **sustain for as long as it's held**. That's the game's core
  lesson, that a half note or whole note is a *held* sound. With the band
  playing, the pad plays the chord of the current bar.

## 4. The parts

| | Spicy (Latin) | Smooth (jazz, straight) | Hop (dance) |
|---|---|---|---|
| **Drums** | bossa kick (1, 2+, 3, 4+), 3-2 son clave, shaker eighths, conga tumbao (slap on 2, open tones on 4 and 4+) | ride cymbal eighths, soft kick, cross-stick on 2 and 4, hi-hat foot on 2 and 4 | four-on-the-floor kick, claps on 2 and 4, open hats on the "ands", closed sixteenths, a clap fill in bar 4 |
| **Bass** | upright: root, then the fifth pushed on 2+, octave on 4+ | electric: root, octave, fifth, sixth, fifth, then a chromatic step into the next bar's root | synth: root on the off-beats, octave pop on 4+ |
| **Keys** | bright Rhodes, montuno-style stabs, anticipating the next chord on 4+ | suitcase Rhodes, extended chords, long, anticipating the next chord | detuned-saw plucks on the off-beats over a sidechain-pumping pad |

## 5. How it was made

- **Pure Web Audio synthesis, no samples.** For example, the kick is a sine
  with a pitch sweep; the cymbal is six inharmonic square waves, filtered (the
  classic drum-machine method); the Rhodes is a 1:1 FM tine with a decaying
  index through a tremolo; the organ is stacked drawbar partials with a
  vibrato.
- **The same code renders the loop files** (mono WAV, 32 kHz, 16-bit) in an
  offline audio context. Each loop is rendered twice through and the second pass
  kept, so the tails of the loop's end are already sounding at its start, and it
  loops without a click.
- **Levels:** all 27 combinations were summed, and one common scale was applied
  so that the loudest combination (Spicy drums + Spicy bass + Hop keys) peaks
  at −1 dBFS. The individual loops peak around −3 to −14 dBFS.

**Checked by measurement** (the author can't listen):

- The bass fundamentals land on the right notes: C, F, C, G, at about 65, 87,
  65 and 98 Hz.
- The dance drums hit on the right sixteenths.
- Every loop's end joins its start without a jump.
- No combination distorts.
- The page runs with no script errors, and doesn't overflow a 390-px phone.

**Not checked:** whether it actually *sounds* good. That's what this review is
for.

## 6. Known limits

- These are synthesised stand-ins, not recordings. Expect "a clear demo", not
  "a record". The real loops will come from Garnet.
- The tempo is fixed at 100 bpm, because recorded loops can't be sped up in a
  browser without their pitch rising too.
- A style change waits for the next loop (up to 9.6 s), because each part is
  scheduled a whole loop at a time.
- The page loads its fonts from Google Fonts. Without a connection it falls
  back to system fonts and still works.

## 7. Questions for you

1. **Style by style:** is each part recognisably what it claims to be? Does the
   Spicy drum part read as bossa or mambo, the Smooth parts as (straight) smooth
   jazz, and the Hop parts as dance music? What would a musician in each style
   change first?
2. **Do all 27 combinations really work?** In particular: a four-on-the-floor
   kick under a bossa bass; an off-beat synth bass under a jazz ride; the jazz
   voicings (Cmaj9, Fmaj9, G13) against Latin triads. Which combinations clash,
   and how would you rewrite the parts so none do?
3. **Voicings and bass lines:** anything wrong or weak in the harmony or voice
   leading (the jazz part's G13 into Cmaj9, the chromatic approach notes, the
   anticipations on 4+)?
4. **Synthesis:** without samples, what would most improve the sound of the
   kick, clap, ride, upright bass, Rhodes or organ? Show code if you can.
5. **The student's pad:** does "hold the pad and the note rings until you let
   go" teach sustain well? Should the pad's sound follow the band's chord, as it
   does now, or stay on one note so the student hears only the rhythm?
6. **For children aged 6–12:** is 100 bpm a good tempo? Is anything here too
   busy for a child who is reading a rhythm over it?
7. **What's missing?**

---

## Appendix: the full page

Save everything between the fences as `beat-smash-studio.html` and open it in a
browser. Press **Play the band**.

````html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Beat Smash Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oxanium:wght@500;700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
  /* Layout: one MPC-style unit — an LCD strip on top, three channel rows
     like a mixing desk, a transport bar, then the student's pad. One dark
     look on purpose: it's hardware. */
  :root {
    color-scheme: dark;
    --chassis: #191b20;
    --panel: #22252c;
    --panel-hi: #2b2f37;
    --line: #363a43;
    --ink: #ebe8e1;
    --muted: #9b9ea6;
    --screen: #0e1315;
    --lcd: #f2b45c;
    --lcd-dim: #4a3a22;
    --rec: #ff5447;
    --spicy: #ec7a3f;
    --smooth: #56b4e9;
    --hop: #cc79a7;
    --font-display: "Oxanium", "Rajdhani", system-ui, sans-serif;
    --font-body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
    --radius: 10px;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--chassis); color: var(--ink); }
  body { margin: 0; font-family: var(--font-body); font-size: 15px; line-height: 1.5; padding-inline: 16px; padding-block: 20px 40px; }
  .unit { max-width: 720px; margin: 0 auto; display: grid; gap: 18px; }

  .brand { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
  .brand h1 { margin: 0; font-family: var(--font-display); font-weight: 700; font-size: 1.55rem; letter-spacing: 0.06em; text-transform: uppercase; }
  .brand .tag { font-family: var(--font-display); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--chassis); background: var(--lcd); padding: 2px 8px; border-radius: 4px; }
  .brand p { flex-basis: 100%; margin: 0; color: var(--muted); max-width: 62ch; }

  /* ---- LCD ---- */
  .display { background: var(--screen); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; display: grid; gap: 12px; box-shadow: inset 0 2px 10px rgba(0,0,0,.6); }
  .display-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--lcd); letter-spacing: 0.06em; }
  .rec { display: inline-flex; align-items: center; gap: 8px; }
  .rec i { width: 11px; height: 11px; border-radius: 50%; background: #3a2221; }
  .rec.on i { background: var(--rec); box-shadow: 0 0 10px var(--rec); }
  .readout { font-variant-numeric: tabular-nums; }
  .bars { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .bar { border: 1px solid #22302f; border-radius: 6px; padding: 8px 6px 8px; display: grid; gap: 8px; }
  .bar b { font-family: var(--font-mono); font-weight: 500; color: var(--lcd-dim); font-size: 0.95rem; text-align: center; }
  .bar.now b { color: var(--lcd); text-shadow: 0 0 8px rgba(242,180,92,.5); }
  .leds { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .leds span { height: 8px; border-radius: 2px; background: var(--lcd-dim); }
  .leds span.on { background: var(--lcd); box-shadow: 0 0 6px var(--lcd); }

  /* ---- mixer ---- */
  .mixer { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 6px 14px; }
  .channel { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding-block: 12px; border-bottom: 1px solid var(--line); }
  .channel:last-child { border-bottom: 0; }
  .ch-name { min-width: 118px; flex: 1 1 118px; }
  .ch-name strong { display: block; font-family: var(--font-display); letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.95rem; }
  .ch-name span { color: var(--muted); font-size: 0.82rem; }
  .styles { display: flex; flex-wrap: wrap; gap: 8px; }
  .hint { color: var(--muted); font-size: 0.82rem; margin: 2px 0 8px; }

  /* rubber buttons */
  .rubber { font: 600 0.9rem var(--font-body); color: var(--ink); background: radial-gradient(120% 120% at 50% 20%, var(--panel-hi), #1c1f25); border: 1px solid #3d424c; border-radius: 8px; padding: 9px 14px; min-height: 44px; cursor: pointer; box-shadow: 0 3px 0 #111318; transition: transform .06s, box-shadow .06s; touch-action: manipulation; }
  .rubber:active { transform: translateY(2px); box-shadow: 0 1px 0 #111318; }
  .rubber:focus-visible, .pad:focus-visible { outline: 2px solid var(--lcd); outline-offset: 2px; }
  .rubber[aria-pressed="true"] { color: var(--chassis); border-color: transparent; }
  .rubber.spicy[aria-pressed="true"] { background: var(--spicy); box-shadow: 0 3px 0 #8a4523, 0 0 16px rgba(236,122,63,.45); }
  .rubber.smooth[aria-pressed="true"] { background: var(--smooth); box-shadow: 0 3px 0 #2d6a8c, 0 0 16px rgba(86,180,233,.45); }
  .rubber.hop[aria-pressed="true"] { background: var(--hop); box-shadow: 0 3px 0 #7a4463, 0 0 16px rgba(204,121,167,.45); }
  .rubber.off[aria-pressed="true"], .rubber.sound[aria-pressed="true"] { background: var(--lcd); box-shadow: 0 3px 0 #8a6428; }
  .rubber.cued { outline: 2px dashed var(--lcd); outline-offset: 2px; }

  .transport { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .transport .combo { color: var(--muted); font-size: 0.88rem; flex: 1 1 200px; min-width: 0; }
  .transport .primary { font-family: var(--font-display); letter-spacing: 0.08em; text-transform: uppercase; }

  /* ---- the student's pad ---- */
  .pad-area { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; display: grid; gap: 12px; }
  .pad-area h2 { margin: 0; font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.06em; font-size: 1.05rem; }
  .sound-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .sound-group { display: grid; gap: 6px; }
  .sound-group span { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .sound-group div { display: flex; gap: 8px; flex-wrap: wrap; }
  .pad { height: 170px; width: 100%; border-radius: 14px; border: 1px solid #454a55; background: radial-gradient(90% 90% at 50% 35%, #3a3f49, #22252c); box-shadow: 0 6px 0 #0f1115, inset 0 -8px 18px rgba(0,0,0,.35); color: var(--muted); font: 600 1rem var(--font-display); letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; transition: transform .05s, box-shadow .05s, background .05s; }
  .pad.down { transform: translateY(4px); box-shadow: 0 2px 0 #0f1115, 0 0 34px rgba(242,180,92,.55), inset 0 0 30px rgba(242,180,92,.35); background: radial-gradient(90% 90% at 50% 35%, #6b5431, #2c2519); color: var(--lcd); }

  .notes { color: var(--muted); font-size: 0.85rem; display: grid; gap: 6px; }
  .notes p { margin: 0; max-width: 68ch; }
  code { font-family: var(--font-mono); font-size: 0.85em; color: var(--ink); }
  @media (prefers-reduced-motion: reduce) { .rubber, .pad { transition: none; } }
</style>
</head>
<body>
<main class="unit">
  <header class="brand">
    <h1>Beat Smash Studio</h1>
    <span class="tag">placeholder band</span>
    <p>Stand-ins for Garnet's loops, built to the loop spec: C major, four bars of I – IV – I – V, 100 bpm, straight eighths. Pick a part for each musician and every one of the 27 combinations plays together.</p>
  </header>

  <section class="display" aria-label="Song position">
    <div class="display-top">
      <span class="rec" id="rec"><i></i><span id="rec-label">STOPPED</span></span>
      <span class="readout" id="readout">BAR – · BEAT –</span>
    </div>
    <div class="bars" id="bars"></div>
  </section>

  <section class="mixer" aria-label="The band">
    <p class="hint">Changes while the band is playing land at the start of the next loop.</p>
    <div class="channel" data-inst="drums">
      <div class="ch-name"><strong>Drums</strong><span>Tango</span></div>
      <div class="styles" role="group" aria-label="Drums part"></div>
    </div>
    <div class="channel" data-inst="bass">
      <div class="ch-name"><strong>Bass</strong><span>Riff</span></div>
      <div class="styles" role="group" aria-label="Bass part"></div>
    </div>
    <div class="channel" data-inst="keys">
      <div class="ch-name"><strong>Keys</strong><span>Riff</span></div>
      <div class="styles" role="group" aria-label="Keys part"></div>
    </div>
  </section>

  <div class="transport">
    <button class="rubber primary" id="play" type="button">Play the band</button>
    <button class="rubber" id="warmup" type="button">Tango warming up</button>
    <span class="combo" id="combo"></span>
  </div>

  <section class="pad-area" aria-label="Your pad">
    <h2>Your pad</h2>
    <div class="sound-groups">
      <div class="sound-group"><span>Winning Tango</span><div>
        <button class="rubber sound" type="button" data-sound="kick">Kick</button>
        <button class="rubber sound" type="button" data-sound="snare">Snare</button></div></div>
      <div class="sound-group"><span>Winning Riff's bass</span><div>
        <button class="rubber sound" type="button" data-sound="bass-electric">Electric</button>
        <button class="rubber sound" type="button" data-sound="bass-acoustic">Acoustic</button></div></div>
      <div class="sound-group"><span>Winning Riff's keys</span><div>
        <button class="rubber sound" type="button" data-sound="rhodes">Rhodes</button>
        <button class="rubber sound" type="button" data-sound="organ">Organ</button></div></div>
    </div>
    <button class="pad" id="pad" type="button" aria-label="Pad: hold to play">Hold to play</button>
    <p class="hint">Bass and keys ring for as long as you hold. With the band playing, they follow the chord of the bar it's on; stopped, they play chord I. Space bar works too.</p>
  </section>

  <footer class="notes">
    <p>The rendered files are in <code>audio/beat-smash/</code> in the app repo, named as the spec asks (<code>beat-l1-drums-spicy.wav</code> and so on). This page plays the same code that rendered them.</p>
    <p>Spicy is Latin (bossa kick, son clave, congas, upright bass, montuno keys). Smooth is jazz played straight (ride, cross-stick, electric bass, suitcase Rhodes). Hop is dance (four on the floor, off-beat synth bass, plucks over a pumping pad).</p>
  </footer>
</main>

<script>
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
   replace the rendered files; nothing here is part of the game itself.
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

  function schedulePart(ctx, dest, instrument, style, t0) {
    const g = ctx.createGain();
    g.gain.value = LEVEL[instrument] * (TRIM[instrument + '-' + style] || 1);
    g.connect(dest);
    PARTS[instrument][style](ctx, g, t0);
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
  };
})(typeof window !== 'undefined' ? window : globalThis);

</script>
<script>
(function () {
  'use strict';
  const B = window.BeatSmashBand;
  const STYLE_LABEL = { spicy: 'Spicy', smooth: 'Smooth', hop: 'Hop', off: 'Off' };
  const sel = { drums: 'spicy', bass: 'smooth', keys: 'hop' };
  const cued = {};
  let padSound = 'rhodes';

  let ctx = null, master = null;
  let playing = false, mode = 'band', startTime = 0, nextLoop = 0, timer = null;
  let live = [];
  let held = null;

  // ---- build the mixer and the LCD ----
  document.querySelectorAll('.channel').forEach((row) => {
    const inst = row.dataset.inst;
    const box = row.querySelector('.styles');
    ['spicy', 'smooth', 'hop', 'off'].forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rubber ' + s; b.id = inst + '-' + s;
      b.textContent = STYLE_LABEL[s]; b.dataset.style = s;
      b.addEventListener('click', () => {
        sel[inst] = s;
        if (playing && mode === 'band') cued[inst] = true;
        render();
      });
      box.appendChild(b);
    });
  });
  const barsEl = document.getElementById('bars');
  B.SONG_NAMES.forEach((name) => {
    const d = document.createElement('div');
    d.className = 'bar';
    d.innerHTML = '<b>' + name + '</b><div class="leds"><span></span><span></span><span></span><span></span></div>';
    barsEl.appendChild(d);
  });

  // ---- audio ----
  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -8; comp.ratio.value = 3;
      master = ctx.createGain(); master.gain.value = 0.9;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function scheduleLoop(t) {
    const parts = mode === 'warmup'
      ? [['warmup', 'tango']]
      : B.INSTRUMENTS.filter((i) => sel[i] !== 'off').map((i) => [i, sel[i]]);
    parts.forEach(([i, s]) => live.push({ g: B.schedulePart(ctx, master, i, s, t), end: t + B.LOOP + 1.5 }));
    Object.keys(cued).forEach((k) => delete cued[k]);
    render();
  }
  function tick() {
    while (nextLoop < ctx.currentTime + 0.5) { scheduleLoop(nextLoop); nextLoop += B.LOOP; }
    live = live.filter((x) => { if (x.end < ctx.currentTime) { x.g.disconnect(); return false; } return true; });
  }
  function start(m) {
    ensureCtx();
    stop();
    mode = m; playing = true;
    startTime = ctx.currentTime + 0.12; nextLoop = startTime;
    tick(); timer = setInterval(tick, 100);
    render();
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (ctx) {
      const now = ctx.currentTime;
      live.forEach((x) => { x.g.gain.setTargetAtTime(0, now, 0.03); const g = x.g; setTimeout(() => g.disconnect(), 400); });
    }
    live = []; playing = false;
    Object.keys(cued).forEach((k) => delete cued[k]);
    render();
  }
  function position() {
    if (!playing || !ctx) return null;
    const p = ctx.currentTime - startTime;
    if (p < 0) return null;
    const inLoop = p % B.LOOP;
    const bar = Math.floor(inLoop / B.BAR);
    return { bar, beat: Math.floor((inLoop - bar * B.BAR) / B.BEAT) };
  }

  // ---- the pad ----
  const padEl = document.getElementById('pad');
  function press() {
    ensureCtx();
    if (held) return;
    const pos = position();
    const chord = pos ? B.SONG_NAMES[pos.bar] : 'I';
    held = B.pad(ctx, master, ctx.currentTime + 0.005, padSound, chord);
    padEl.classList.add('down');
  }
  function release() {
    if (!held) return;
    held.release(ctx.currentTime);
    held = null;
    padEl.classList.remove('down');
  }
  padEl.addEventListener('pointerdown', (e) => { e.preventDefault(); try { padEl.setPointerCapture(e.pointerId); } catch (_) {} press(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => padEl.addEventListener(ev, release));
  padEl.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target.closest && e.target.closest('button') && e.target !== padEl) return;
    e.preventDefault(); press();
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') release(); });
  document.querySelectorAll('[data-sound]').forEach((b) => b.addEventListener('click', () => { padSound = b.dataset.sound; render(); }));

  // ---- transport ----
  document.getElementById('play').addEventListener('click', () => (playing && mode === 'band') ? stop() : start('band'));
  document.getElementById('warmup').addEventListener('click', () => (playing && mode === 'warmup') ? stop() : start('warmup'));

  // ---- drawing ----
  function render() {
    document.querySelectorAll('.channel').forEach((row) => {
      const inst = row.dataset.inst;
      row.querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.style === sel[inst]));
        b.classList.toggle('cued', !!cued[inst] && b.dataset.style === sel[inst]);
      });
    });
    document.querySelectorAll('[data-sound]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sound === padSound)));
    document.getElementById('play').textContent = playing && mode === 'band' ? 'Stop' : 'Play the band';
    document.getElementById('warmup').textContent = playing && mode === 'warmup' ? 'Stop' : 'Tango warming up';
    const on = B.INSTRUMENTS.filter((i) => sel[i] !== 'off').map((i) => STYLE_LABEL[sel[i]] + ' ' + i);
    document.getElementById('combo').textContent = mode === 'warmup' && playing
      ? 'The first-minute groove: kick, snare and hats.'
      : (on.length ? on.join(' + ') : 'Every part is off.');
  }
  function frame() {
    const pos = position();
    document.getElementById('rec').classList.toggle('on', !!pos);
    document.getElementById('rec-label').textContent = pos ? (mode === 'warmup' ? 'WARM-UP' : 'PLAYBACK') : 'STOPPED';
    document.getElementById('readout').textContent = pos ? 'BAR ' + (pos.bar + 1) + ' · BEAT ' + (pos.beat + 1) : 'BAR – · BEAT –';
    barsEl.querySelectorAll('.bar').forEach((el, i) => {
      el.classList.toggle('now', !!pos && pos.bar === i);
      el.querySelectorAll('.leds span').forEach((led, j) => led.classList.toggle('on', !!pos && pos.bar === i && j <= pos.beat));
    });
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);
})();
</script>
</body>
</html>
````

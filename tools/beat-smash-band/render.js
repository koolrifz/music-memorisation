/* Renders the placeholder band (band.js) to the loop files named in the
   Beat Smash loop spec, in headless Chromium, and checks the mix.

     NODE_PATH=$(npm root -g) node tools/beat-smash-band/render.js

   Writes audio/beat-smash/*.wav: nine loops (3 instruments x 3 styles) and
   the warm-up groove, each exactly four bars at 100 bpm, mono, 16-bit.
   Each loop is rendered twice through and the SECOND pass is kept, so the
   tails of the end of the loop are already sounding at its start: the file
   loops without a click or a gap.

   Before writing, it sums every one of the 27 drums + bass + keys
   combinations and scales all nine loops by one common factor so the
   loudest combination peaks at -1 dBFS. Balance between the parts is set
   in band.js (LEVEL) and is never changed here. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SAMPLE_RATE = 32000;            // mono, 16-bit: small files, hats still bright
const HERE = __dirname;
const OUT = path.join(HERE, '..', '..', 'audio', 'beat-smash');
const TARGET_PEAK = Math.pow(10, -1 / 20);   // -1 dBFS

function wav(samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const peak = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
const db = (x) => (20 * Math.log10(x)).toFixed(1) + ' dB';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ path: path.join(HERE, 'band.js') });

  const render = (instrument, style) => page.evaluate(async ([instrument, style, sr]) => {
    const B = window.BeatSmashBand;
    const loopLen = Math.round(B.LOOP * sr);
    const ctx = new OfflineAudioContext(1, loopLen * 2, sr);
    B.schedulePart(ctx, ctx.destination, instrument, style, 0);
    B.schedulePart(ctx, ctx.destination, instrument, style, B.LOOP);
    const buf = await ctx.startRendering();
    const seg = buf.getChannelData(0).slice(loopLen, loopLen * 2);
    const bytes = new Uint8Array(seg.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, [instrument, style, SAMPLE_RATE]).then((b64) => {
    const buf = Buffer.from(b64, 'base64');
    return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  });

  const names = await page.evaluate(() => ({ i: BeatSmashBand.INSTRUMENTS, s: BeatSmashBand.STYLES }));
  const stems = {};
  for (const inst of names.i) for (const st of names.s) stems[`${inst}-${st}`] = await render(inst, st);
  const warmup = await render('warmup', 'tango');
  await browser.close();

  // The loudest of the 27 combinations sets one scale for everything.
  let loudest = 0, loudestName = '';
  for (const d of names.s) for (const b of names.s) for (const k of names.s) {
    const a = stems[`drums-${d}`], bb = stems[`bass-${b}`], c = stems[`keys-${k}`];
    let p = 0;
    for (let i = 0; i < a.length; i++) p = Math.max(p, Math.abs(a[i] + bb[i] + c[i]));
    if (p > loudest) { loudest = p; loudestName = `${d} drums + ${b} bass + ${k} keys`; }
  }
  const scale = TARGET_PEAK / loudest;
  console.log(`loudest combination: ${loudestName}, ${db(loudest)} before scaling; scale x${scale.toFixed(3)}`);

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, a) => {
    const scaled = a.map((v) => v * scale);
    fs.writeFileSync(path.join(OUT, name), wav(scaled, SAMPLE_RATE));
    const seam = Math.abs(scaled[scaled.length - 1] - scaled[0]);
    console.log(`${name.padEnd(28)} peak ${db(peak(scaled)).padStart(9)}  rms ${db(rms(scaled)).padStart(9)}  seam jump ${seam.toFixed(4)}`);
  };
  for (const key of Object.keys(stems)) write(`beat-l1-${key}.wav`, stems[key]);
  const wScale = Math.min(scale, TARGET_PEAK / peak(warmup));
  fs.writeFileSync(path.join(OUT, 'beat-l1-warmup.wav'), wav(warmup.map((v) => v * wScale), SAMPLE_RATE));
  console.log(`beat-l1-warmup.wav           peak ${db(peak(warmup) * wScale)}`);
})().catch((e) => { console.error(e); process.exit(1); });

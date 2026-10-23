#!/usr/bin/env node
// Tests for stomp-song-core.js (planning, grading, progress). Run: node tools/test-stomp-song.js
const assert = require('assert');
global.KRStomp = require('../stomp-round.js');
const K = require('../stomp-song-core.js');
global.window = global; global.KR = { stompBeats: {} };
require('../content/stomp-the-beat-beats.js');
const beats = KR.stompBeats['stomp-the-beat'];
let n = 0;
function t(name, fn) { try { fn(); n++; console.log('PASS  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n   ' + e.message); process.exitCode = 1; } }

// A song on a steady 120 bpm: beat k at k*0.5 s (bar 0 = count-in).
const steady = Array.from({ length: 400 }, (_, k) => k * 0.5);
const allBeats = bars => Array.from({ length: bars * 4 }, () => true);
function perfectTaps(p, jitter) {
    return p.onsets.map(o => ({ t: o.t + (jitter || 0), raw: o.t, delay: 0 }));
}

t('the real beat map is increasing and starts in the first second', () => {
    assert.ok(beats.length > 300 && beats[0] < 1);
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i] > beats[i - 1]);
});
t('plan: punch-in is at the first beat of bar `from`, lead is four bars', () => {
    const p = K.plan(steady, { from: 5, bars: 2, pattern: [[1,1,1,1],[1,1,1,1]] });
    assert.strictEqual(p.punchBeat, 20); assert.strictEqual(p.cueBeat, 4);
    assert.strictEqual(p.endBeat, 28);
    assert.strictEqual(p.onsets.length, 8);
    assert.ok(Math.abs(p.onsets[1].t - 0.5) < 1e-9);
});
t('a perfect take of every length passes', () => {
    [1, 2, 4, 8, 32].forEach(bars => {
        const p = K.plan(steady, { from: 5, bars, pattern: Array.from({ length: bars }, () => [1,1,1,1]) });
        const g = K.grade(p, perfectTaps(p));
        assert.ok(g.perfect, bars + ' bars'); assert.ok(K.passes(g, 1));
    });
});
t('a missing note fails a 1-bar hurdle but a 4-bar one with 0.85 passes the percentage', () => {
    const p = K.plan(steady, { from: 5, bars: 4, pattern: Array.from({ length: 4 }, () => [1,1,1,1]) });
    const taps = perfectTaps(p).slice(1);
    const g = K.grade(p, taps);
    assert.ok(!g.perfect); assert.ok(g.pct >= 0.85); assert.ok(K.passes(g, 0.85));
    const p1 = K.plan(steady, { from: 5, bars: 1, pattern: [[1,1,1,1]] });
    assert.ok(!K.passes(K.grade(p1, perfectTaps(p1).slice(1)), 1));
});
t('a tap on a rest is a mistake', () => {
    const p = K.plan(steady, { from: 5, bars: 1, pattern: [[1,0,1,1]] });
    const taps = [0, 0.5, 1, 1.5].map(x => ({ t: x, raw: x, delay: 0 }));
    const g = K.grade(p, taps);
    assert.ok(!g.perfect); assert.ok(g.issues.some(i => i.why === 'rest' || i.why === 'extra'));
});
t('a tap past the double bar line spoils the take', () => {
    const p = K.plan(steady, { from: 5, bars: 1, pattern: [[1,1,1,1]] });
    const taps = perfectTaps(p).concat([{ t: p.endRel + 0.1, raw: 0, delay: 0 }]);
    const g = K.grade(p, taps);
    assert.ok(!g.perfect); assert.ok(g.issues.some(i => i.why === 'over'));
});
t('lean: taps 40 ms late read as late', () => {
    const p = K.plan(steady, { from: 5, bars: 4, pattern: Array.from({ length: 4 }, () => [1,1,1,1]) });
    const g = K.grade(p, perfectTaps(p, 0.04));
    assert.ok(g.leanMs > 30 && g.leanMs < 50, g.leanMs);
});
t('the recording pattern is fixed, has rests, and is the right length', () => {
    const a = K.recordingPattern(32), b = K.recordingPattern(32);
    assert.deepStrictEqual(a, b); assert.strictEqual(a.length, 32);
    assert.ok(a.some(bar => bar.some(x => !x)));
});
t('progress: three clean takes clear a hurdle; a guided one does not count', () => {
    const song = { rounds: [{ id: 'r', hurdles: [{ id: '1', bars: 1 }] }] };
    const pr = K.blankProgress(), h = song.rounds[0].hurdles[0];
    K.applyAttempt(pr, 'r', h, { passed: true, guided: true, pct: 1 });
    assert.strictEqual(K.hurdleState(pr, 'r', '1').stars, 0);
    K.applyAttempt(pr, 'r', h, { passed: true, guided: false, pct: 1 });
    K.applyAttempt(pr, 'r', h, { passed: false, guided: false, pct: 0.2 });
    assert.strictEqual(K.hurdleState(pr, 'r', '1').stars, 0);
    for (let i = 0; i < 3; i++) K.applyAttempt(pr, 'r', h, { passed: true, guided: false, pct: 1 });
    assert.ok(K.hurdleState(pr, 'r', '1').cleared);
});
t('free play analysis: taps on the beat give a high on-beat share', () => {
    const taps = []; for (let k = 8; k < 40; k++) taps.push({ t: beats[k] + 0.01 });
    const a = K.analyseFree(beats, taps);
    assert.ok(a.onBeatPct >= 90, a.onBeatPct); assert.ok(a.longestRun >= 20);
});
console.log(n + ' passed');

#!/usr/bin/env node
// Tests for stomp-round.js (the pure grading). Run: node tools/test-stomp-round.js
const assert = require('assert');
const S = require('../stomp-round.js');
let n = 0;
function t(name, fn) { try { fn(); n++; console.log('PASS  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n   ' + e.message); process.exitCode = 1; } }
const approx = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || '') + ' ' + a + ' vs ' + b);

// 60 bpm quarters, 4/4: slot = 1 s.  Bar 1: play hold hold play ; bar 2: rest play hold hold
const phrase = [['play', 'hold', 'hold', 'play'], ['rest', 'play', 'hold', 'hold']];
const onsets = S.deriveOnsets(phrase, 1);
const opts = { bars: 2, barSec: 4, windowSec: 0.17 };
const tapAt = (time, delay) => ({ raw: time + (delay || 0), delay: delay || 0, t: time });

t('onsets are exactly the play slots', () => {
    assert.deepStrictEqual(onsets.map(o => o.id), ['b1s1', 'b1s4', 'b2s2']);
    assert.deepStrictEqual(onsets.map(o => o.t), [0, 3, 5]);
});
t('a perfect round: every bar clean', () => {
    const r = S.grade(onsets, [tapAt(0), tapAt(3.02), tapAt(4.95)], opts);
    assert.strictEqual(r.cleanBars, 2); assert.strictEqual(r.hits, 3);
    approx(r.log.find(e => e.onset === 'b1s4').error, 0.02, 'signed error');
});
t('a miss faults only its bar', () => {
    const r = S.grade(onsets, [tapAt(0), tapAt(3.0)], opts);
    assert.deepStrictEqual(r.clean, [true, false]); assert.strictEqual(r.misses, 1);
});
t('a tap in a hold or a rest is a stray and faults its bar', () => {
    const r = S.grade(onsets, [tapAt(0), tapAt(1.5), tapAt(3), tapAt(5)], opts);
    assert.deepStrictEqual(r.clean, [false, true]); assert.strictEqual(r.strays, 1);
    const r2 = S.grade(onsets, [tapAt(0), tapAt(3), tapAt(4.4), tapAt(5)], opts);   // the rest, bar 2
    assert.deepStrictEqual(r2.clean, [true, false]);
});
t('a tap outside the window is a stray AND leaves its note a miss', () => {
    const r = S.grade(onsets, [tapAt(0), tapAt(3.4), tapAt(5)], opts);
    assert.strictEqual(r.strays, 1); assert.strictEqual(r.misses, 1); assert.strictEqual(r.clean[0], false);
});
t('a double tap on one note: the second is a stray (the note is used up)', () => {
    const r = S.grade(onsets, [tapAt(0), tapAt(0.05), tapAt(3), tapAt(5)], opts);
    assert.strictEqual(r.hits, 3); assert.strictEqual(r.strays, 1); assert.strictEqual(r.clean[0], false);
});
t('count-in taps are ignored, not faulted', () => {
    const r = S.grade(onsets, [tapAt(-3), tapAt(-2), tapAt(-1), tapAt(0), tapAt(3), tapAt(5)], opts);
    assert.strictEqual(r.cleanBars, 2); assert.strictEqual(r.log.filter(e => e.kind === 'countin').length, 3);
});
t('windows are capped at half the gap: 16ths at 60 bpm are +/-125 ms, not +/-170', () => {
    const sixteenths = S.deriveOnsets([['play', 'play', 'play', 'play']], 0.25);
    const w = S.withWindows(sixteenths, 0.17);
    approx(w[1].before, 0.125); approx(w[1].after, 0.125);
    approx(w[0].before, 0.17, 'first onset keeps the full window before'); approx(w[3].after, 0.17, 'last keeps it after');
    // a tap 150 ms late for onset 1 is NOT onset 1 (it is past the cap): it is onset 2's, 100 ms early
    const m = S.createMatcher(sixteenths, { bars: 1, barSec: 1 });
    const e = m.tap(tapAt(0.25 + 0.15));
    assert.strictEqual(e.onset, 'b1s3'); approx(e.error, -0.10);
});
t('nearest unmatched onset wins, and each is used once', () => {
    const six = S.deriveOnsets([['play', 'play', 'play', 'play']], 0.25);
    const r = S.grade(six, [tapAt(0.02), tapAt(0.27), tapAt(0.49), tapAt(0.77)], { bars: 1, barSec: 1 });
    assert.strictEqual(r.hits, 4); assert.strictEqual(r.cleanBars, 1);
});
t('a miss is not called until its window has closed', () => {
    const m = S.createMatcher(onsets, opts);
    m.tap(tapAt(0));
    let r = m.result(3.1);                              // inside b1s4's window: not yet a miss
    assert.strictEqual(r.misses, 0); assert.strictEqual(r.complete, false);
    r = m.result(3.2);                                  // window closed (3.17)
    assert.strictEqual(r.misses, 1);
    approx(m.closesAt(), 5.17);
});
t('the log carries expected, raw, delay, signed error, bar and onset id', () => {
    const r = S.grade(onsets, [tapAt(0.03, 0.08), tapAt(3), tapAt(5)], opts);
    const e = r.log[0];
    assert.deepStrictEqual([e.kind, e.onset, e.bar, e.expected, e.delay], ['hit', 'b1s1', 0, 0, 0.08]);
    approx(e.raw, 0.11); approx(e.t, 0.03); approx(e.error, 0.03);
});
t('rhythm-agnostic: hand-authored onsets work without any phrase', () => {
    const clave = [0, 0.75, 1.5, 2.5, 3].map((t0, i) => ({ id: 'c' + i, bar: 0, t: t0 }));
    const r = S.grade(clave, clave.map(o => tapAt(o.t + 0.01)), { bars: 1, barSec: 4 });
    assert.strictEqual(r.hits, 5); assert.strictEqual(r.cleanBars, 1);
});
t('no taps at all: every bar with a note is faulted', () => {
    const r = S.grade(onsets, [], opts);
    assert.strictEqual(r.cleanBars, 0);
});
t('a bar of rests has nothing to miss: tapping nothing keeps it clean', () => {
    const r = S.grade(S.deriveOnsets([['rest', 'rest', 'rest', 'rest'], ['play', 'hold', 'hold', 'hold']], 1),
                      [tapAt(4)], opts);
    assert.deepStrictEqual(r.clean, [true, true]);
});
console.log('\n' + n + ' passed' + (process.exitCode ? ', some FAILED' : ''));

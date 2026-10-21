#!/usr/bin/env node
// Tests for staff-numbers.js (the Staff Numbers question deck).
// Run: node tools/test-staff-numbers.js
const assert = require('assert');
const N = require('../staff-numbers.js');
let n = 0;
function t(name, fn) { try { fn(); n++; console.log('PASS  ' + name); } catch (e) { console.log('FAIL  ' + name + '\n   ' + e.message); process.exitCode = 1; } }

const LABELS = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Space 1', 'Space 2', 'Space 3', 'Space 4'];
// A repeatable random source, so a failing run can be replayed.
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

t('there are nine questions and none learned at the start', () => {
    const d = N.create(LABELS, { rng: seeded(1) });
    assert.strictEqual(d.total, 9); assert.strictEqual(d.learned(), 0); assert.strictEqual(d.allDone(), false);
});

t('a perfect student is asked each question exactly once', () => {
    const d = N.create(LABELS, { rng: seeded(2) });
    const asked = [];
    while (!d.allDone()) { const q = d.pick(); asked.push(q); assert.strictEqual(d.answer(q, true), 'learned-first'); }
    assert.strictEqual(asked.length, 9);
    assert.deepStrictEqual([...asked].sort(), [...LABELS].sort());
});

t('right first time is learned with no rule of three', () => {
    const d = N.create(LABELS, { rng: seeded(3) });
    const q = d.pick(); d.answer(q, true);
    assert.strictEqual(d.snapshot().find(x => x.label === q).done, true);
    assert.strictEqual(d.snapshot().find(x => x.label === q).firstTry, true);
    assert.strictEqual(d.progress(q), null);
});

t('a miss makes the question owed, at zero of three', () => {
    const d = N.create(LABELS, { rng: seeded(4) });
    const q = d.pick();
    assert.strictEqual(d.answer(q, false), 'owed');
    assert.strictEqual(d.progress(q), 0);
    assert.strictEqual(d.learned(), 0);
});

t('an owed question needs three right answers, and they need not be in a row', () => {
    const d = N.create(LABELS, { rng: seeded(5) });
    const q = d.pick(); d.answer(q, false);
    let got = 0, safety = 0;
    while (!d.snapshot().find(x => x.label === q).done && safety++ < 200) {
        const next = d.pick();
        if (next === q) {
            const r = d.answer(q, true); got++;
            assert.strictEqual(r, got === 3 ? 'learned' : 'progress');
        } else d.answer(next, true);
    }
    assert.strictEqual(got, 3);
    assert.strictEqual(d.snapshot().find(x => x.label === q).firstTry, false);
});

t('a wrong answer on the way back puts the count back to zero', () => {
    const d = N.create(LABELS, { rng: seeded(6) });
    const q = d.pick(); d.answer(q, false);
    let safety = 0;
    const comeBack = () => { let nx; while ((nx = d.pick()) !== q && safety++ < 200) d.answer(nx, true); return nx; };
    comeBack(); d.answer(q, true); assert.strictEqual(d.progress(q), 1);
    comeBack(); d.answer(q, true); assert.strictEqual(d.progress(q), 2);
    comeBack(); assert.strictEqual(d.answer(q, false), 'owed');
    assert.strictEqual(d.progress(q), 0);
    assert.strictEqual(d.snapshot().find(x => x.label === q).misses, 2);
});

t('it circles back after one or two other questions, not at once', () => {
    for (let seed = 1; seed <= 60; seed++) {
        const d = N.create(LABELS, { rng: seeded(seed) });
        const q = d.pick(); d.answer(q, false);
        let between = 0, safety = 0;
        for (;;) {
            const nx = d.pick();
            if (nx === q) break;
            assert.ok(safety++ < 20, 'never came back');
            d.answer(nx, true); between++;
        }
        assert.ok(between >= 1 && between <= 2, 'seed ' + seed + ' came back after ' + between);
    }
});

t('the same question is never asked twice running while another is open', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const d = N.create(LABELS, { rng: seeded(seed) });
        const r = seeded(seed + 1000);
        let prev = null, steps = 0;
        while (!d.allDone() && steps++ < 400) {
            const q = d.pick();
            const open = d.snapshot().filter(x => !x.done).length;
            if (open > 1) assert.notStrictEqual(q, prev, 'seed ' + seed + ' repeated ' + q);
            d.answer(q, r() < 0.6);
            prev = q;
        }
        assert.ok(d.allDone(), 'seed ' + seed + ' did not finish');
    }
});

t('the last owed question may repeat, because nothing else is left', () => {
    const d = N.create(['Line 1'], { rng: seeded(7) });
    assert.strictEqual(d.pick(), 'Line 1'); d.answer('Line 1', false);
    assert.strictEqual(d.pick(), 'Line 1'); d.answer('Line 1', true);
    assert.strictEqual(d.pick(), 'Line 1'); d.answer('Line 1', true);
    assert.strictEqual(d.pick(), 'Line 1'); assert.strictEqual(d.answer('Line 1', true), 'learned');
    assert.strictEqual(d.allDone(), true); assert.strictEqual(d.pick(), null);
});

t('a student who misses a lot still meets all nine questions', () => {
    const d = N.create(LABELS, { rng: seeded(8) });
    const seen = new Set(); let steps = 0;
    while (!d.allDone() && steps++ < 400) { const q = d.pick(); seen.add(q); d.answer(q, seen.size % 2 === 0); }
    assert.strictEqual(seen.size, 9);
});

t('a very weak student still finishes, and every question ends learned', () => {
    const d = N.create(LABELS, { rng: seeded(9) });
    const r = seeded(99); let steps = 0;
    while (!d.allDone() && steps++ < 2000) { const q = d.pick(); d.answer(q, r() < 0.4); }
    assert.ok(d.allDone());
    assert.strictEqual(d.learned(), 9);
});

t('the watch list names only questions that were missed', () => {
    const d = N.create(LABELS, { rng: seeded(10) });
    const a = d.pick(); d.answer(a, true);
    const b = d.pick(); d.answer(b, false);
    const w = d.watch();
    assert.strictEqual(w.length, 1);
    assert.strictEqual(w[0].label, b); assert.strictEqual(w[0].misses, 1); assert.strictEqual(w[0].done, false);
});

t('answering a question already learned is ignored', () => {
    const d = N.create(LABELS, { rng: seeded(11) });
    const q = d.pick(); d.answer(q, true);
    assert.strictEqual(d.answer(q, false), null);
    assert.strictEqual(d.learned(), 1);
});

t('the grid grows as questions are learned: 3, 6, 9, 12 cards', () => {
    assert.deepStrictEqual([0, 2, 3, 4, 5, 6, 7, 8, 9].map(k => N.tierFor(k)), [0, 0, 1, 1, 2, 2, 3, 3, 3]);
});

console.log('\n' + n + ' passed' + (process.exitCode ? ', some FAILED' : ''));

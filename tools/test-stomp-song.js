#!/usr/bin/env node
// Tests for stomp-song-core.js (planning, grading, progress). Run: node tools/test-stomp-song.js
const assert = require('assert');
global.KRStomp = require('../stomp-round.js');
const K = require('../stomp-song-core.js');
global.window = global; global.KR = { stompBeats: {} };
require('../content/stomp-the-beat-beats.js');
require('../content/stomp-the-beat-soul-beats.js');
require('../content/stomp-songs.js');
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
t('progress: one clean take clears a hurdle; after a miss it takes three; a guided one does not count', () => {
    const song = { rounds: [{ id: 'r', hurdles: [{ id: '1', bars: 1 }, { id: '2', bars: 2 }] }] };
    const pr = K.blankProgress(), h = song.rounds[0].hurdles[1];
    K.applyAttempt(pr, 'r', h, { passed: true, guided: true, pct: 1 });
    assert.ok(!K.hurdleState(pr, 'r', '2').cleared);
    const r = K.applyAttempt(pr, 'r', h, { passed: true, guided: false, pct: 1 });
    assert.ok(r.cleared && K.hurdleState(pr, 'r', '2').cleared);
    assert.strictEqual(K.needed(K.hurdleState(pr, 'r', '2')), 1);
    // A row saved part way before the rule counts as owed.
    assert.strictEqual(K.needed({ stars: 1, cleared: false }), 3);
});
t('progress: after a miss, three clean takes clear a hurdle', () => {
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
t('plan takes Stomp Lab slot bars: quavers between the beats', () => {
    const p = K.plan(steady, { from: 5, bars: 1, slotsPerBeat: 2,
        slotBars: [['play', 'play', 'play', 'hold', 'rest', 'play', 'play', 'hold']] });
    assert.deepStrictEqual(p.onsets.map(o => o.beat), [0, 0.5, 1, 2.5, 3]);
    assert.ok(Math.abs(p.onsets[1].t - 0.25) < 1e-9);
    assert.strictEqual(p.restBeats.length, 1);
    assert.ok(K.grade(p, perfectTaps(p)).perfect);
});
t('the run ladder: warm-up, then each level at two bars and four', () => {
    const L = K.runLadder(['1', '2']);
    assert.deepStrictEqual(L.map(s => (s.levelId || '-') + s.bars), ['-1', '-2', '12', '14', '22', '24']);
    assert.strictEqual(L[0].pass, 1); assert.strictEqual(L[3].pass, 1);   // every step clean (2026-10-24)
    assert.strictEqual(K.runStep(L, 99), L[5]);
});
t('spots fit the song and are never the same twice running', () => {
    const spots = K.runSpots(80, 4);
    assert.ok(spots.every(b => b >= 5 && b + 4 <= 80 && (b - 1) % 2 === 0));
    for (let i = 0; i < 50; i++) assert.notStrictEqual(K.pickSpot(spots, 9), 9);
});
t('one player: a pass moves on, a miss ends the run', () => {
    const r = K.newRun(1);
    assert.strictEqual(K.runTake(r, true).next, 'same'); assert.strictEqual(r.step, 1);
    assert.strictEqual(K.runTake(r, false).next, 'over'); assert.ok(r.over); assert.strictEqual(r.cleared, 1);
});
t('three players: the relay, and the run ends when all three miss in a row', () => {
    const r = K.newRun(3);
    K.runTake(r, true);
    assert.deepStrictEqual(K.runTake(r, false), { next: 'turn', player: 1 });
    assert.strictEqual(r.step, 1);
    K.runTake(r, true); assert.strictEqual(r.step, 2); assert.strictEqual(r.player, 1);
    K.runTake(r, false); K.runTake(r, false);
    assert.ok(!r.over);
    assert.strictEqual(K.runTake(r, false).next, 'over');
    assert.deepStrictEqual(r.furthest, [1, 2, 0]);
});
t('up a level: out of the warm-up, then each new Stomp Lab level, never past the top', () => {
    const L = K.runLadder(['10', '12']);          // warm 1, warm 2, 10x2, 10x4, 12x2, 12x4
    assert.strictEqual(K.runLevelUp(L, 0, 1), null);
    assert.deepStrictEqual(K.runLevelUp(L, 1, 2), { levelId: '10', number: 1 });
    assert.strictEqual(K.runLevelUp(L, 2, 3), null);
    assert.deepStrictEqual(K.runLevelUp(L, 3, 4), { levelId: '12', number: 2 });
    assert.strictEqual(K.runLevelUp(L, 5, 6), null);
    assert.strictEqual(K.runLevelUp(L, 5, 5), null);
});
t('Stomp the Beat: Soul: its map, its 87 bars, and Level 3 (Splitting the Beat)', () => {
    const soul = KR.stompBeats['stomp-the-beat-soul'], song = KR.stompSongs['stomp-the-beat-soul'];
    assert.strictEqual(soul.length, 348);
    for (let k = 1; k < soul.length; k++) assert.ok(soul[k] > soul[k - 1]);
    assert.ok(Math.abs(soul[0] - 0.21) < 0.03, 'beat 0 is the spoken One');
    assert.strictEqual(K.totalBars(soul), 86);    // bar 86 is the pushed ending: never a take
    for (let b = 0; b < 86; b++) {
        const bpm = 240 / (K.beatTime(soul, 4 * b + 4) - K.beatTime(soul, 4 * b));
        assert.ok(bpm > 95.5 && bpm < 101, 'bar ' + b + ' at ' + bpm.toFixed(1));
    }
    song.sections.forEach((sec, i) => assert.strictEqual(sec.first, i ? song.sections[i - 1].last + 1 : 0));
    assert.strictEqual(song.sections[song.sections.length - 1].last, 86);
    assert.strictEqual(song.album, 'quavers', 'Level 3, Splitting the Beat');
    assert.deepStrictEqual(song.run.levels, ['10', '12', '13'], 'the album, less B2');
    assert.ok(song.run.leaveOut.indexOf('half-note') >= 0 && song.run.leaveOut.indexOf('whole-note') >= 0);
    assert.deepStrictEqual(song.rounds, []);
    const spots = K.runSpots(K.totalBars(soul), 4);
    assert.ok(spots[0] === 5 && spots.every(b => b + 4 <= 86));
});
t('on the beat / rushed / dragged: the split adds to 100 and names the pattern', () => {
    const a = K.timingSplit([0, 0.01, -0.2, -0.15, 0.02, -0.1]);
    assert.deepStrictEqual([a.onPct, a.rushedPct, a.draggedPct, a.diagnosis], [50, 50, 0, 'rushing']);
    const b = K.timingSplit([0.1, 0.12, 0.15, 0, 0]);
    assert.strictEqual(b.diagnosis, 'dragging');
    const c = K.timingSplit([-0.1, 0.1, 0, 0.2, -0.2]);
    assert.strictEqual(c.diagnosis, 'mixed');
    assert.strictEqual(K.timingSplit([0, 0.02, -0.03, 0.01, 0.1]).diagnosis, 'steady');
    assert.strictEqual(K.timingSplit([0.3]).diagnosis, 'few');
    [[0.1, -0.1, 0], [0, 0, 0, 0.2, 0.3, -0.3, 0.01]].forEach(e => {
        const s = K.timingSplit(e);
        assert.strictEqual(s.onPct + s.rushedPct + s.draggedPct, 100);
    });
});
t('a take\'s taps are set against the nearest written note', () => {
    const p = K.plan(steady, { from: 5, bars: 1, pattern: [[1, 0, 1, 1]] });
    const e = K.tapErrors(p, [{ t: -0.05 }, { t: 1.1 }, { t: 1.4 }]);
    assert.ok(Math.abs(e[0] + 0.05) < 1e-9 && Math.abs(e[1] - 0.1) < 1e-9 && Math.abs(e[2] + 0.1) < 1e-9);
});
t('the warm-up round: the beat kept passes; random, sparse or rushed stomping does not', () => {
    const inRound = beats.filter((b, k) => k >= 4 && b <= K.WARM_SECONDS - 0.05);
    assert.ok(inRound.length > 45 && inRound.length < 60, inRound.length + ' beats in 30 s');
    // Every beat, a little lean and wobble: passes.
    const good = inRound.map((b, i) => ({ t: b + 0.015 + (i % 3 - 1) * 0.02 }));
    const g = K.warmRound(beats, good);
    assert.ok(g.passed && g.coverPct === 100 && g.diagnosis === 'steady', JSON.stringify(g));
    // Count-in taps don't count.
    assert.strictEqual(K.warmRound(beats, [{ t: beats[1] }].concat(good)).taps, good.length);
    // Random stomping: never passes (1000 tries).
    let passes = 0;
    for (let i = 0; i < 1000; i++) {
        const r = K.rng(i + 1), taps = [];
        for (let j = 0; j < 60; j++) taps.push({ t: beats[4] + r() * (K.WARM_SECONDS - beats[4]) });
        if (K.warmRound(beats, taps).passed) passes++;
    }
    assert.strictEqual(passes, 0, passes + ' random rounds passed');
    // Only every other beat, but perfectly: not enough of the beat kept.
    const sparse = K.warmRound(beats, inRound.filter((b, i) => i % 2 === 0).map(b => ({ t: b })));
    assert.ok(!sparse.passed && sparse.diagnosis === 'steady');
    // Every beat, 120 ms early: rushing, and not passed.
    const rush = K.warmRound(beats, inRound.map(b => ({ t: b - 0.12 })));
    assert.ok(!rush.passed && rush.diagnosis === 'rushing' && rush.rushedPct === 100);
    // Every beat, 120 ms late: dragging.
    assert.strictEqual(K.warmRound(beats, inRound.map(b => ({ t: b + 0.12 }))).diagnosis, 'dragging');
});
console.log(n + ' passed');

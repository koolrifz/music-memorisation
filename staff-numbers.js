/* =========================================
   STAFF NUMBERS - the question deck (pure: no DOM, no audio)
   =========================================
   Staff Smash's last stage asks "which is line 3? which is space 2?" - nine
   orientation questions (five lines, four spaces). This file decides which
   question comes next and when a question is learned. It knows nothing about
   cards or timers; script.js asks it and tells it what happened. Loaded in the
   browser as the global KRStaffNumbers, and in Node (tools/test-staff-numbers.js)
   through module.exports.

   ROB'S RULE (2026-10-21), the way he runs it in a lesson:
   - There are NINE questions. Each is asked once.
   - Right the FIRST time: learned. No rule of three; there is no point
     punishing a student who plays the part perfectly.
   - Wrong (a wrong tap, or the time ran out): the question is OWED. It has to
     be answered right THREE times to be learned - "the three times in a row
     rule is a way to engage the brain with the correct answers".
   - The three do NOT have to be consecutive questions. The deck asks another
     question or two, then circles back. A right answer on the way back is
     one of three; a wrong one puts the count back to zero.
   - The student never sees the machinery. The history (what was missed, how
     often) is kept for the teacher.
   ========================================= */
(function (root) {
    'use strict';

    const REQUIRED = 3;                  // right answers an owed question needs
    const RETURN_GAP = [1, 2];           // other questions asked before an owed one comes back
    const TIER_AT = [0, 3, 5, 7];        // questions learned before the grid grows 3 -> 6 -> 9 -> 12 cards

    // The grid grows as questions are learned, so the screen gets fuller as
    // the student gets surer, the same shape the streak gave it before.
    function tierFor(learned, thresholds) {
        const at = thresholds || TIER_AT;
        let tier = 0;
        at.forEach((n, i) => { if (learned >= n) tier = i; });
        return tier;
    }

    function create(labels, options) {
        const opts = options || {};
        const rng = opts.rng || Math.random;
        const required = opts.required || REQUIRED;
        const gap = () => RETURN_GAP[Math.floor(rng() * RETURN_GAP.length)];
        const pickOne = list => list[Math.floor(rng() * list.length)];

        const questions = labels.map(label => ({
            label, asked: 0, misses: 0, owed: false, got: 0, done: false, dueIn: 0, firstTry: false,
        }));
        const byLabel = label => questions.find(q => q.label === label);
        let last = null;                 // the question answered most recently

        const pending = () => questions.filter(q => !q.done);
        const learned = () => questions.filter(q => q.done).length;

        // The next question to ask. Never the one just answered while there
        // is any other to ask: asking the same thing twice running was the
        // whole complaint. Order of preference: an owed question whose turn
        // has come, then one never asked, then whichever owed one is nearest.
        function pick() {
            const open = pending();
            if (!open.length) return null;
            const other = open.filter(q => q.label !== last);
            const pool = other.length ? other : open;

            const due = pool.filter(q => q.owed && q.dueIn <= 0);
            if (due.length) {
                const soonest = Math.min(...due.map(q => q.dueIn));
                return pickOne(due.filter(q => q.dueIn === soonest)).label;
            }
            const fresh = pool.filter(q => !q.owed && q.asked === 0);
            if (fresh.length) return pickOne(fresh).label;

            const nearest = Math.min(...pool.map(q => q.dueIn));
            return pickOne(pool.filter(q => q.dueIn === nearest)).label;
        }

        // Record an answer. `right` means right with no wrong tap and in time.
        // Returns what it did to the question: 'learned-first' (right first
        // time), 'learned' (the third right answer on the way back),
        // 'progress' (one more of the three) or 'owed' (wrong: now owed, or
        // back to zero).
        function answer(label, right) {
            const q = byLabel(label);
            if (!q || q.done) return null;
            q.asked++;
            let result;
            if (right) {
                if (!q.owed) {
                    q.done = true; q.firstTry = q.asked === 1;
                    result = 'learned-first';
                } else {
                    q.got++;
                    if (q.got >= required) { q.done = true; result = 'learned'; }
                    else { q.dueIn = gap(); result = 'progress'; }
                }
            } else {
                q.owed = true; q.got = 0; q.misses++; q.dueIn = gap();
                result = 'owed';
            }
            // Every other owed question is one question closer to its turn.
            questions.forEach(o => { if (o !== q && o.owed && !o.done && o.dueIn > 0) o.dueIn--; });
            last = label;
            return result;
        }

        // The teacher's watch list: every question that was ever missed, and
        // where each stands. Nothing here is shown to the student.
        function watch() {
            return questions.filter(q => q.misses > 0 || q.owed)
                .map(q => ({ label: q.label, misses: q.misses, got: q.got, required, done: q.done }));
        }

        return {
            pick, answer, watch, learned, required,
            total: questions.length,
            allDone: () => pending().length === 0,
            // How many of the three the student has this question for, or
            // null when it is not owed (a fresh question shows no dots).
            progress: label => { const q = byLabel(label); return q && q.owed && !q.done ? q.got : null; },
            snapshot: () => questions.map(q => ({ ...q })),
        };
    }

    const api = { REQUIRED, RETURN_GAP, TIER_AT, tierFor, create };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.KRStaffNumbers = api;
})(typeof window !== 'undefined' ? window : this);

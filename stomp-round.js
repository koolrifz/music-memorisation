/* =========================================
   STOMP ROUND - the pure part (no DOM, no audio)
   =========================================
   After a student counts a phrase correctly in Rhythm Stomp Lab they play it
   back by tapping. This file decides whether they did, and nothing else:
   it is given the notes that should sound and the taps that did, and it
   hands back a list of what happened and a count of clean bars.

   It is RHYTHM-AGNOSTIC on purpose. It knows "onsets": a time, an id and a
   bar. Where the onsets come from is not its business - a counted phrase
   (deriveOnsets), or a hand-authored cowbell / cascara / palito pattern that
   lists its own. Loaded in the browser as the global KRStomp, and in Node
   (tools/test-stomp-round.js) through module.exports.

   THE RULES (Rob's, and what the three reviewing LLMs added):
   - Times are SECONDS from the first slot of the phrase (slot 0 = 0). The
     caller does the audio-clock arithmetic; the device delay is taken off a tap
     by the caller and passed in so it can be LOGGED beside the raw time.
   - Each onset has a window on each side. It is the configured window, but
     never more than HALF THE GAP to the neighbouring onset on that side. At
     60 bpm sixteenths are 250 ms apart: a flat +/-170 ms would overlap its
     neighbours by 90 ms, so the cap is +/-125 ms there.
   - A tap is matched to the NEAREST UNMATCHED onset whose window it is in, and
     that onset is then used up. A tap that matches nothing is a STRAY.
   - A tap before the first onset's window while it is still the count-in is
     the count-in (tapping along with the clicks is natural), and is ignored.
   - A MISS is only called once the onset's window has closed.
   - A bar is CLEAN when it has no miss and no stray. The score is clean bars
     out of bars. Nothing adaptive, no age tables: v1 is deliberately plain.
   ========================================= */
(function (root) {
    'use strict';

    const DEFAULT_WINDOW_SEC = 0.170;       // each side, before the half-gap cap

    // Onsets from a counted phrase: bars, each a list of 'play' | 'hold' | 'rest'
    // slots (rstompPhrase). Only 'play' starts a sound, so a tied-into slot
    // ('hold') and a rest produce nothing - a tap there is a stray.
    function deriveOnsets(phrase, slotSec) {
        const onsets = [];
        phrase.forEach((bar, b) => {
            bar.forEach((mode, s) => {
                if (mode !== 'play') return;
                onsets.push({ id: 'b' + (b + 1) + 's' + (s + 1), bar: b, slot: b * bar.length + s,
                              t: (b * bar.length + s) * slotSec });
            });
        });
        return onsets;
    }

    // Each onset's window on each side, capped at half the gap to its neighbour.
    function withWindows(onsets, windowSec) {
        const w = windowSec == null ? DEFAULT_WINDOW_SEC : windowSec;
        const sorted = onsets.slice().sort((a, b) => a.t - b.t);
        return sorted.map((o, i) => {
            const prev = sorted[i - 1], next = sorted[i + 1];
            return Object.assign({}, o, {
                before: prev ? Math.min(w, (o.t - prev.t) / 2) : w,
                after:  next ? Math.min(w, (next.t - o.t) / 2) : w,
            });
        });
    }

    // The incremental matcher: feed taps in time order, ask at any moment.
    //   options: { bars, barSec, windowSec }
    function createMatcher(onsets, options) {
        const opt = Object.assign({ windowSec: DEFAULT_WINDOW_SEC }, options || {});
        const list = withWindows(onsets, opt.windowSec).map(o => Object.assign({ used: false }, o));
        const log = [];
        const barOf = t => {
            if (!opt.barSec) return 0;
            const b = Math.floor(t / opt.barSec);
            return Math.max(0, Math.min((opt.bars || 1) - 1, b));
        };
        const firstStart = list.length ? list[0].t - list[0].before : 0;

        // One tap: { raw, delay, t } where t is already on the phrase's own
        // clock with the delay taken off. Returns the log entry it made.
        function tap(p) {
            let best = null;
            list.forEach(o => {
                if (o.used) return;
                const err = p.t - o.t;
                const reach = err < 0 ? o.before : o.after;
                if (Math.abs(err) > reach) return;
                if (!best || Math.abs(err) < Math.abs(best.err)) best = { o, err };
            });
            if (best) {
                best.o.used = true;
                const e = { kind: 'hit', onset: best.o.id, bar: best.o.bar, expected: best.o.t,
                            raw: p.raw, delay: p.delay || 0, t: p.t, error: best.err };
                log.push(e); return e;
            }
            if (p.t < firstStart) {
                const e = { kind: 'countin', onset: null, bar: null, expected: null,
                            raw: p.raw, delay: p.delay || 0, t: p.t, error: null };
                log.push(e); return e;
            }
            const e = { kind: 'stray', onset: null, bar: barOf(p.t), expected: null,
                        raw: p.raw, delay: p.delay || 0, t: p.t, error: null };
            log.push(e); return e;
        }

        // The moment after which every onset's window has closed, so the round
        // can be judged. (A miss is never called before this for its onset.)
        function closesAt() {
            return list.reduce((m, o) => Math.max(m, o.t + o.after), 0);
        }

        // The result. `at` is the time on the phrase's clock; onsets whose
        // window is still open at `at` are not called missed yet.
        function result(at) {
            const now = at == null ? Infinity : at;
            const entries = log.slice();
            list.forEach(o => {
                if (o.used || o.t + o.after >= now) return;
                entries.push({ kind: 'miss', onset: o.id, bar: o.bar, expected: o.t,
                               raw: null, delay: null, t: null, error: null });
            });
            const bars = opt.bars || 1;
            const faults = new Array(bars).fill(0);
            entries.forEach(e => {
                if ((e.kind === 'miss' || e.kind === 'stray') && e.bar != null) faults[e.bar]++;
            });
            const open = list.some(o => !o.used && o.t + o.after >= now);
            return {
                log: entries,
                faults,
                clean: faults.map(n => n === 0),
                cleanBars: faults.filter(n => n === 0).length,
                bars,
                complete: !open,
                onsets: list.length,
                hits: entries.filter(e => e.kind === 'hit').length,
                misses: entries.filter(e => e.kind === 'miss').length,
                strays: entries.filter(e => e.kind === 'stray').length,
            };
        }

        return { tap, result, closesAt, windows: () => list.map(o => ({ id: o.id, t: o.t, before: o.before, after: o.after })) };
    }

    // The whole round at once: onsets and every tap in, result out.
    function grade(onsets, taps, options) {
        const m = createMatcher(onsets, options);
        taps.slice().sort((a, b) => a.t - b.t).forEach(m.tap);
        return m.result(Infinity);
    }

    const api = { DEFAULT_WINDOW_SEC, deriveOnsets, withWindows, createMatcher, grade };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.KRStomp = api;
})(typeof window !== 'undefined' ? window : this);

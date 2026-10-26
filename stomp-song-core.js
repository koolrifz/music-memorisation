/* =========================================
   STOMP THE BEAT, THE SONG - the pure part (no DOM, no audio)
   =========================================
   An audio-backed song (a real recording, not the synthesised band) is played
   from a BEAT MAP: beats[k] is the time, in seconds on the audio file's own
   clock, of beat k. Beat 0 is the first count-in "One", and a bar is four
   beats, so bar b starts at beat 4b (bar 0 is the count-in). The recording
   speeds up as it goes (Stomp the Beat runs 111 -> 118 bpm), which is why
   nothing here ever multiplies a tempo: every time is looked up.

   This file plans an attempt at a hurdle, grades it, summarises a free-play
   session and keeps the progress rules (the rule of three, the records). It is
   loaded in the browser as the global KRStompSong, and in Node
   (tools/test-stomp-song.js) through module.exports. The grading rules
   themselves are stomp-round.js's (KRStomp); this adds only what a recording
   with rests and a drifting tempo needs on top.

   THE SHAPE OF AN ATTEMPT (Rob, 2026-10-23: "Don't drop out the band. Drop the
   guide track... Treat it like a recording studio"):
     cue .......... the song is started LEAD_BARS before the hurdle, with the
                    guide kick on every beat, so the pulse is felt first
     punch-in ..... the guide goes silent and REC lights: the student's taps are
                    the drum part, for the hurdle's 1, 2, 4, 8 or 32 bars
     punch-out .... the guide comes back; a tap now, up to half a beat past the
                    double bar line, is OVER and spoils the take
   ========================================= */
(function (root) {
    'use strict';

    const BEATS_PER_BAR = 4;
    const LEAD_BARS = 4;                  // bars of song and guide before the punch-in
    const OVER_BEATS = 0.5;               // taps this far past the last bar are "over"
    const REST_TAP_ZONE = 0.5;            // a tap this many beats from a rest beat is a tap ON the rest
    const EARLY_LATE_MS = 60;             // a hit this far off is called early or late
    const NEEDS = 3;                      // the rule of three: clean takes in a row to clear a hurdle

    function stomp() {
        if (root.KRStomp) return root.KRStomp;
        if (typeof require === 'function') return require('./stomp-round.js');
        throw new Error('KRStomp (stomp-round.js) must be loaded first');
    }

    /* ---------- the beat map ---------- */

    // The time of beat k, which may be fractional and may lie outside the map
    // (the last interval is carried on).
    function beatTime(beats, k) {
        const n = beats.length;
        if (k <= 0) return beats[0] + k * (beats[1] - beats[0]);
        if (k >= n - 1) return beats[n - 1] + (k - (n - 1)) * (beats[n - 1] - beats[n - 2]);
        const i = Math.floor(k), f = k - i;
        return beats[i] + f * (beats[i + 1] - beats[i]);
    }

    // The beat position at time t (fractional): the inverse of beatTime.
    function beatAt(beats, t) {
        const n = beats.length;
        if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]);
        if (t >= beats[n - 1]) return n - 1 + (t - beats[n - 1]) / (beats[n - 1] - beats[n - 2]);
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (beats[mid] <= t) lo = mid; else hi = mid; }
        return lo + (t - beats[lo]) / (beats[lo + 1] - beats[lo]);
    }

    function totalBars(beats) {
        return Math.floor((beats.length - 1) / BEATS_PER_BAR);
    }

    /* ---------- patterns: a bar is four flags, true = a note, false = a rest ---------- */

    const ALL_NOTES = [true, true, true, true];

    // Every four-beat bar of crotchets and crotchet rests that has a note in it,
    // and (the engraving rule) never four rests. 15 shapes, 7 not starting on a
    // struck beat 1 (Stage A4's "full map").
    function allRestBars() {
        const bars = [];
        for (let m = 1; m < 16; m++) bars.push([0, 1, 2, 3].map(i => !!(m & (8 >> i))));
        return bars;
    }
    const REST_BARS = allRestBars();
    const restCount = bar => bar.filter(x => !x).length;
    const sameBar = (a, b) => !!a && !!b && a.every((x, i) => x === b[i]);

    // A small deterministic random, so the song's recording session is the same
    // every take ("the song is the song") and tests can see what it does.
    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // The bars of one attempt. Crotchets alone: every bar is four notes. With
    // rests: attempt 0 of a short hurdle has one rest per bar, attempt 1 up to
    // two, then anything; the long hurdles take any bar, never the same twice
    // running. `random` is Math.random in the game and a seeded one in tests.
    function patternFor(options) {
        const o = Object.assign({ bars: 1, rests: false, attempt: 0, random: Math.random }, options);
        const bars = [];
        if (!o.rests) {
            for (let i = 0; i < o.bars; i++) bars.push(ALL_NOTES.slice());
            return bars;
        }
        const limit = o.bars <= 2 ? (o.attempt === 0 ? 1 : o.attempt === 1 ? 2 : 3) : 3;
        const pool = REST_BARS.filter(b => restCount(b) <= limit && restCount(b) >= (o.bars <= 2 && o.attempt === 0 ? 1 : 0));
        for (let i = 0; i < o.bars; i++) {
            const fresh = pool.filter(b => !sameBar(b, bars[i - 1]));
            const from = fresh.length ? fresh : pool;
            bars.push(from[Math.floor(o.random() * from.length)].slice());
        }
        return bars;
    }

    // The recording session's 32 bars, written once. Eight four-bar phrases of
    // the shape A A B A, each a little different, so it reads as music and the
    // same every time. Seeded: the same song for everyone.
    function recordingPattern(bars, seed) {
        const r = rng(seed == null ? 20261023 : seed);
        const pick = limit => {
            const pool = REST_BARS.filter(b => restCount(b) <= limit);
            return pool[Math.floor(r() * pool.length)].slice();
        };
        const out = [];
        let a = pick(1), b = pick(2), last = null;
        while (out.length < bars) {
            [a, a, b, a].forEach(bar => { if (out.length < bars) out.push(bar.slice()); });
            last = b;
            do { a = pick(1); } while (sameBar(a, last));
            do { b = pick(2); } while (sameBar(a, b));
        }
        return out;
    }

    /* ---------- planning an attempt ---------- */

    // spec: { from (the bar the punch-in starts on), bars, pattern (list of
    // bars of four flags) }. Everything a player needs: where to cue the song,
    // when the punch-in is, the notes to play (times RELATIVE to the punch-in)
    // and where each bar starts.
    // spec.slotBars (optional): the bars as Stomp Lab's slot stream, each bar a
    // list of 'play' | 'hold' | 'rest', with spec.slotsPerBeat slots to a beat.
    // That is how a quaver or semiquaver rhythm from Stomp Lab's generator is
    // planned; a pattern of four flags a bar is the same thing at one slot a
    // beat. An onset may sit between beats: its time is read off the beat map
    // in proportion, so it follows the recording's own drift.
    function plan(beats, spec) {
        const from = spec.from, bars = spec.bars;
        const pattern = spec.slotBars ? null : (spec.pattern || patternFor({ bars: bars }));
        const slotBars = spec.slotBars || pattern.map(bar => bar.map(note => note ? 'play' : 'rest'));
        const spb = spec.slotsPerBeat || 1;
        const cueBar = Math.max(0, from - (spec.lead == null ? LEAD_BARS : spec.lead));
        const cueBeat = cueBar * BEATS_PER_BAR;
        const punchBeat = from * BEATS_PER_BAR;
        const endBeat = (from + bars) * BEATS_PER_BAR;
        const cueAt = beatTime(beats, cueBeat);
        const punchAt = beatTime(beats, punchBeat);
        const endAt = beatTime(beats, endBeat);
        const rel = k => beatTime(beats, punchBeat + k) - punchAt;
        const onsets = [], restBeats = [];
        slotBars.forEach((bar, b) => bar.forEach((slot, i) => {
            const beat = i / spb;
            const k = b * BEATS_PER_BAR + beat;
            if (slot === 'play') onsets.push({ id: 'b' + (b + 1) + 's' + (i + 1), bar: b, beat: beat, k: k, t: rel(k) });
            else if (slot === 'rest') restBeats.push({ bar: b, beat: beat, k: k, t: rel(k) });
        }));
        const barStarts = [];
        for (let b = 0; b <= bars; b++) barStarts.push(rel(b * BEATS_PER_BAR));
        return {
            from, bars, pattern, slotBars, slotsPerBeat: spb, cueBar, cueBeat, punchBeat, endBeat, cueAt, punchAt, endAt,
            onsets, restBeats, barStarts, endRel: endAt - punchAt,
            beatSec: (endAt - punchAt) / (bars * BEATS_PER_BAR),
        };
    }

    /* ---------- the run: one take at a time, until a miss ---------- */

    // Rob, 2026-10-23: "progress through the levels if it's one take... hide
    // the levels. Just keep them coming until they can't play them anymore.
    // Then that's when they have to hop out."
    //
    // The ladder: a warm-up on the beat (one bar, then two), then every Stomp
    // Lab level in its 4/4 order, two bars and then four. levelId null is
    // plain crotchets. Past the top the last step repeats with fresh rhythms,
    // so a run never runs out.
    function runLadder(levelIds) {
        const steps = [{ levelId: null, bars: 1 }, { levelId: null, bars: 2 }];
        levelIds.forEach(id => { steps.push({ levelId: id, bars: 2 }, { levelId: id, bars: 4 }); });
        // Every step clean, four bars too (Rob, 2026-10-24: four bars allowed a
        // missed note and two stray taps, which was more than "a slip").
        return steps.map((st, i) => Object.assign({ index: i, pass: 1 }, st));
    }

    function runStep(ladder, index) { return ladder[Math.min(index, ladder.length - 1)]; }

    // Does going from step `from` to step `to` take the run UP A LEVEL: out of
    // the warm-up, or on to the next Stomp Lab level? (Rob, 2026-10-24: "when
    // they move up a level we let them know there's a little celebration and up
    // they go.") Returns the new level's number in this song (1 = the first
    // after the warm-up) and its Stomp Lab id, or null. Past the top the last
    // step only repeats, which is not a new level.
    function runLevelUp(ladder, from, to) {
        if (to === from || to >= ladder.length) return null;
        const a = ladder[from], b = ladder[to];
        if (!a || !b || !b.levelId || a.levelId === b.levelId) return null;
        const ids = [];
        ladder.forEach(st => { if (st.levelId && ids.indexOf(st.levelId) < 0) ids.push(st.levelId); });
        return { levelId: b.levelId, number: ids.indexOf(b.levelId) + 1 };
    }

    // Where in the song a take may sit: the start of a two-bar phrase, with the
    // lead before it and the take's bars after it inside the song. Never the
    // same spot twice running.
    //
    // `ranges` ([{first, last}], bars) keeps a take INSIDE the sections that
    // sing about its topic (Rob, 2026-10-26, The Long Hold: "When we encounter
    // the specific topic like dotted minims we run this section of the song...
    // we can progress randomly through the tune without them hearing the full
    // version, just snippets"). A take sits wholly in one range. If no range
    // can hold it, every spot in the song is allowed, so a run never stalls.
    function runSpots(total, bars, lead, ranges) {
        const out = [];
        const first = Math.max(1, (lead == null ? LEAD_BARS : lead) + 1);
        for (let b = first; b + bars <= total; b++) if ((b - 1) % 2 === 0) out.push(b);
        if (!ranges || !ranges.length) return out;
        // A take of four bars or more starts on the section's own four-bar
        // phrase (bar 1 or 5 of it), as the band's phrases do; shorter ones
        // on any two-bar line inside it.
        const step = bars >= 4 ? 4 : 2;
        const inside = out.filter(b => ranges.some(r => b >= r.first && b + bars - 1 <= r.last && (b - r.first) % step === 0));
        return inside.length ? inside : out;
    }

    // The bar ranges a run step's takes may use: the song's run.where names
    // section ids per Stomp Lab level ('warm' for the warm-up on the beat).
    // Null when the song names none, so the whole song is open.
    function runRanges(song, levelId) {
        const where = song && song.run && song.run.where;
        const ids = where && where[levelId || 'warm'];
        if (!ids || !song.sections) return null;
        return song.sections.filter(s => ids.indexOf(s.id) >= 0).map(s => ({ first: s.first, last: s.last }));
    }

    function pickSpot(spots, last, random) {
        const pool = spots.length > 1 ? spots.filter(b => b !== last) : spots;
        return pool[Math.floor((random || Math.random)() * pool.length)];
    }

    // A run's state, and what one take does to it. One player: a miss ends the
    // run. More: the relay (Rob, 2026-10-23) - a miss passes the iPad, and the
    // next player takes the very step that was missed; the run ends when every
    // player has missed it in a row. Nobody wins: the band gets as far as it
    // gets.
    function newRun(players) {
        return { players: Math.max(1, players | 0), step: 0, player: 0, cleared: 0, takes: 0,
                 missStreak: 0, over: false, furthest: new Array(Math.max(1, players | 0)).fill(0) };
    }

    function runTake(run, passed) {
        run.takes++;
        if (passed) {
            run.cleared++;
            run.step++;
            run.missStreak = 0;
            run.furthest[run.player] = Math.max(run.furthest[run.player], run.step);
            return { next: 'same', player: run.player };
        }
        run.missStreak++;
        if (run.missStreak >= run.players) { run.over = true; return { next: 'over', player: run.player }; }
        run.player = (run.player + 1) % run.players;
        return { next: 'turn', player: run.player };
    }

    // Which bar (0-based, within the attempt) a time lies in, clamped.
    function barOf(p, t) {
        let b = 0;
        for (let i = 0; i < p.bars; i++) if (t >= p.barStarts[i]) b = i;
        return b;
    }

    /* ---------- grading ---------- */

    // taps: [{ t, raw, delay }], t on the attempt's clock (the punch-in is 0).
    // Returns a plain record of what happened, in the words the game uses.
    function grade(p, taps, options) {
        const o = Object.assign({ windowSec: 0.18 }, options);
        const K = stomp();
        const m = K.createMatcher(p.onsets.map(x => ({ id: x.id, bar: x.bar, t: x.t })),
            { bars: p.bars, barSec: p.endRel / p.bars, windowSec: o.windowSec });
        const ordered = taps.slice().sort((a, b) => a.t - b.t);
        ordered.forEach(tap => m.tap(tap));
        const r = m.result(Infinity);
        const beatSec = p.beatSec;
        const issues = [];
        const faults = new Array(p.bars).fill(0);
        const hitErrors = [];
        r.log.forEach(e => {
            if (e.kind === 'hit') { hitErrors.push(e.error); return; }
            if (e.kind === 'miss') { faults[e.bar]++; issues.push({ why: 'missed', bar: e.bar, t: e.expected }); return; }
            if (e.kind === 'stray' || e.kind === 'countin') {
                // The matcher calls a tap before the first note's window "the
                // count-in". Here the count-in is the lead, so only a tap well
                // before the punch-in is; one just before a rest-first bar's
                // first note is a tap on the rest.
                if (e.t < -o.windowSec) return;
                const t = e.t;
                const over = t > p.endRel;
                const onRest = p.restBeats.find(rb => Math.abs(t - rb.t) <= REST_TAP_ZONE * beatSec);
                if (over) {
                    if (t > p.endRel + OVER_BEATS * beatSec) return;      // long after the double line: not this take
                    issues.push({ why: 'over', bar: p.bars - 1, t });
                    faults[p.bars - 1]++;
                    return;
                }
                const bar = barOf(p, t);
                faults[bar]++;
                issues.push({ why: onRest ? 'rest' : 'extra', bar, t });
            }
        });
        issues.sort((a, b) => a.t - b.t);
        const notes = p.onsets.length;
        const hits = hitErrors.length;
        const mean = hitErrors.length ? hitErrors.reduce((a, b) => a + b, 0) / hitErrors.length : 0;
        const spread = hitErrors.length > 1
            ? Math.sqrt(hitErrors.reduce((a, b) => a + (b - mean) * (b - mean), 0) / hitErrors.length) : 0;
        const early = hitErrors.filter(x => x * 1000 < -EARLY_LATE_MS).length;
        const late = hitErrors.filter(x => x * 1000 > EARLY_LATE_MS).length;
        const strays = issues.filter(i => i.why !== 'missed').length;
        return {
            notes, hits, misses: notes - hits, strays,
            faults, clean: faults.map(n => n === 0), cleanBars: faults.filter(n => n === 0).length, bars: p.bars,
            pct: notes ? hits / notes : 1,
            leanMs: Math.round(mean * 1000), spreadMs: Math.round(spread * 1000), early, late,
            issues, first: issues[0] || null,
            perfect: issues.length === 0,
            log: r.log,
        };
    }

    // Does a graded attempt pass its hurdle? pass is the share of notes that must
    // be played: 1 means every note and nothing extra (one and two bars); lower
    // allows a slip or two, but a tap on a rest or past the double line is a
    // slip too, and only a few are forgiven.
    function passes(g, pass) {
        if (pass >= 1) return g.perfect;
        const forgiven = Math.max(1, Math.ceil(g.notes * (1 - pass)));
        const over = g.issues.some(i => i.why === 'over');
        return g.pct >= pass && g.strays <= forgiven && !over;
    }

    /* ---------- free play ---------- */

    // Every tap is placed against the beat map and sorted into what it was:
    // on a beat, on the "and" between beats, a sixteenth, or between. Nothing
    // is wrong in free play: a student trying quavers is told so.
    // taps: [{ t }] on the song's own clock.
    function analyseFree(beats, taps) {
        const out = { taps: taps.length, onBeat: 0, and: 0, sixteenth: 0, between: 0, leanMs: 0, spreadMs: 0, longestRun: 0 };
        if (!taps.length) return Object.assign(out, { onBeatPct: 0, focus: 'play' });
        const errors = [];
        const beatsHit = new Set();
        taps.forEach(tap => {
            const pos = beatAt(beats, tap.t);
            const nearest = Math.round(pos);
            const errSec = tap.t - beatTime(beats, nearest);
            const beatSec = beatTime(beats, nearest + 1) - beatTime(beats, nearest);
            const frac = pos - Math.floor(pos);
            if (Math.abs(errSec) <= 0.11) { out.onBeat++; errors.push(errSec); beatsHit.add(nearest); }
            else if (Math.abs(frac - 0.5) <= 0.14) out.and++;
            else if (Math.min(Math.abs(frac - 0.25), Math.abs(frac - 0.75)) <= 0.09) out.sixteenth++;
            else out.between++;
            void beatSec;
        });
        const mean = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
        out.leanMs = Math.round(mean * 1000);
        out.spreadMs = Math.round(Math.sqrt(errors.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, errors.length)) * 1000);
        // The longest run of neighbouring beats all landed.
        const sorted = Array.from(beatsHit).sort((a, b) => a - b);
        let run = 0, prev = null;
        sorted.forEach(k => { run = prev !== null && k === prev + 1 ? run + 1 : 1; out.longestRun = Math.max(out.longestRun, run); prev = k; });
        out.onBeatPct = Math.round(100 * out.onBeat / out.taps);
        // One thing to try next, never a verdict.
        if (out.taps < 8) out.focus = 'play';
        else if (out.onBeatPct < 60) out.focus = 'find';
        else if (out.leanMs <= -35) out.focus = 'early';
        else if (out.leanMs >= 35) out.focus = 'late';
        else if (out.and >= 4) out.focus = 'quavers';
        else out.focus = 'steady';
        return out;
    }

    /* ---------- on the beat, rushed, dragged (Rob, 2026-10-24) ----------
       "Present stats on percent on the beat, percent rushed, percent dragged."
       Every tap is set against the note (or beat) nearest it: within onSec it
       is ON the beat, sooner it RUSHED, later it DRAGGED. The three add up to
       100. The diagnosis is one word the screen turns into one short line:
         steady    ON_PASS or more of the taps on the beat
         rushing   otherwise, rushed is the main problem (at least RUSH_SHARE
                   of the taps, and twice as many as dragged)
         dragging  the same, the other way
         mixed     a bit of both: "close, keep listening and stomping"
         few       too few taps to say anything */
    const ON_SEC = 0.07;                  // a tap this close to its note is on the beat
    const RUSH_SHARE = 0.2;               // rushed (or dragged) this share of taps is a pattern, not a wobble
    const ON_PASS = 0.8;

    function timingSplit(errors, options) {
        const o = Object.assign({ onSec: ON_SEC }, options);
        const n = errors.length;
        let on = 0, rushed = 0, dragged = 0;
        errors.forEach(e => { if (Math.abs(e) <= o.onSec) on++; else if (e < 0) rushed++; else dragged++; });
        // Percentages that add up to 100: the biggest remainder takes the spare.
        const pct = [on, rushed, dragged].map(x => n ? 100 * x / n : 0);
        const whole = pct.map(Math.floor);
        let spare = n ? 100 - whole.reduce((a, b) => a + b, 0) : 0;
        pct.map((x, i) => [x - whole[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (spare > 0) { whole[i]++; spare--; } });
        let diagnosis;
        if (n < 3) diagnosis = 'few';
        else if (on >= ON_PASS * n) diagnosis = 'steady';
        else if (rushed >= RUSH_SHARE * n && rushed >= 2 * dragged) diagnosis = 'rushing';
        else if (dragged >= RUSH_SHARE * n && dragged >= 2 * rushed) diagnosis = 'dragging';
        else diagnosis = 'mixed';
        return { taps: n, on, rushed, dragged, onPct: whole[0], rushedPct: whole[1], draggedPct: whole[2], diagnosis };
    }

    // A take's taps, each against the nearest written note (seconds, signed:
    // negative is early). p is a plan; taps are on the punch-in's clock.
    function tapErrors(p, taps) {
        if (!p.onsets.length) return [];
        return taps.map(tap => {
            let best = null;
            p.onsets.forEach(o => { const e = tap.t - o.t; if (best === null || Math.abs(e) < Math.abs(best)) best = e; });
            return best;
        });
    }

    /* ---------- the warm-up round (Rob, 2026-10-24) ----------
       "30 second rounds of free play using the same 30 seconds of the tune but
       must pass a hurdle to start working on the rest of the tune." The round
       plays the song from its count-in for `seconds`; the student stomps the
       beat. Taps in the count-in bar are not counted. Every tap is set
       against the nearest beat. The hurdle is passed when the beat was kept
       (an on-beat stomp on at least WARM_COVER of the beats in the round) and
       kept cleanly (at least WARM_ON of the stomps on the beat), so a stream
       of random taps can't pass it and neither can a few careful ones. */
    const WARM_SECONDS = 30;
    const WARM_COVER = 0.75;
    const WARM_ON = 0.75;

    function warmRound(beats, taps, options) {
        const o = Object.assign({ seconds: WARM_SECONDS, firstBeat: BEATS_PER_BAR, onSec: ON_SEC, cover: WARM_COVER, on: WARM_ON }, options);
        // The beats in the round: from bar 1 to the last whole beat before the end.
        const inRound = [];
        for (let k = o.firstBeat; k < beats.length && beats[k] <= o.seconds - 0.05; k++) inRound.push(k);
        const start = beatTime(beats, o.firstBeat - 0.5);
        const counted = taps.filter(t => t.t >= start && t.t <= o.seconds);
        const errors = [], kept = new Set();
        counted.forEach(tap => {
            const k = Math.round(beatAt(beats, tap.t));
            const e = tap.t - beatTime(beats, k);
            errors.push(e);
            if (Math.abs(e) <= o.onSec) kept.add(k);
        });
        const split = timingSplit(errors, { onSec: o.onSec });
        const beatsKept = inRound.filter(k => kept.has(k)).length;
        const cover = inRound.length ? beatsKept / inRound.length : 0;
        const onShare = split.taps ? split.on / split.taps : 0;
        const passed = cover >= o.cover && onShare >= o.on;
        return Object.assign(split, { beats: inRound.length, beatsKept, coverPct: Math.round(100 * cover), passed });
    }

    /* ---------- progress: the rule of three and the records ---------- */

    // progress = { rounds: { <roundId>: { <hurdleId>: { stars, cleared, attempts, best } } },
    //              records: { silver, gold }, free: { sessions, last } }
    function blankProgress() {
        return { rounds: {}, records: {}, free: { sessions: 0, last: null } };
    }

    function hurdleState(progress, roundId, hurdleId) {
        const round = (progress.rounds[roundId] = progress.rounds[roundId] || {});
        return (round[hurdleId] = Object.assign({ stars: 0, cleared: false, attempts: 0, best: 0 }, round[hurdleId]));
    }

    // A take is graded; what does it do to the hurdle? A GUIDED take (the guide
    // played the written rhythm in the gap) is practice: it teaches, but it
    // does not count towards the three, and it never earns a record.
    // Every clean take is a star; a take that is not clean empties the row.
    function applyAttempt(progress, roundId, hurdle, outcome) {
        const st = hurdleState(progress, roundId, hurdle.id);
        st.attempts++;
        st.best = Math.max(st.best, Math.round(100 * (outcome.pct || 0)));
        const result = { stars: st.stars, cleared: false, newlyCleared: false, record: null, counted: !outcome.guided,
                         wasOwed: needed(st) === NEEDS, needed: needed(st) };
        if (outcome.guided) return result;
        if (!outcome.passed) { st.stars = 0; st.owed = true; result.stars = 0; return result; }
        if (hurdle.record) {
            // The recording session is one take. A pass is a record.
            const kind = outcome.session || 'silver';
            if (!progress.records[roundId + ':' + kind]) result.record = kind;
            progress.records[roundId + ':' + kind] = true;
            result.newlyCleared = !st.cleared;
            st.cleared = true; st.stars = NEEDS; result.stars = NEEDS; result.cleared = true;
            return result;
        }
        const need = needed(st);
        st.stars = Math.min(need, st.stars + 1);
        result.stars = st.stars;
        if (st.stars >= need) {
            result.newlyCleared = !st.cleared; st.cleared = true; result.cleared = true;
            st.owed = false;
        }
        return result;
    }

    // HOW MANY CLEAN TAKES A HURDLE NEEDS (Rob, 2026-10-24, the app-wide rule):
    // one, until a take is missed; then three in a row. A row begun before the
    // rule (stars saved part way, not cleared) counts as owed.
    function needed(st) {
        return (st.owed || (!st.cleared && st.stars > 0)) ? NEEDS : 1;
    }

    // Is a hurdle open? The first of Round 1 is; each next one opens when the
    // one before is cleared. Round 2 (rests) opens once a record is pressed in
    // Round 1. The teacher's Open code opens everything.
    function hurdleOpen(progress, song, roundIndex, hurdleIndex, openAll) {
        if (openAll) return true;
        const round = song.rounds[roundIndex];
        if (roundIndex > 0) {
            const before = song.rounds[roundIndex - 1];
            const pressed = Object.keys(progress.records).some(k => k.indexOf(before.id + ':') === 0);
            if (!pressed) return false;
        }
        if (hurdleIndex === 0) return true;
        const prev = round.hurdles[hurdleIndex - 1];
        return !!hurdleState(progress, round.id, prev.id).cleared;
    }

    const api = {
        BEATS_PER_BAR, LEAD_BARS, OVER_BEATS, NEEDS, REST_BARS, needed,
        beatTime, beatAt, totalBars, rng, patternFor, recordingPattern, plan, barOf,
        grade, passes, analyseFree, blankProgress, hurdleState, applyAttempt, hurdleOpen,
        runLadder, runStep, runLevelUp, runSpots, runRanges, pickSpot, newRun, runTake,
        ON_SEC, WARM_SECONDS, timingSplit, tapErrors, warmRound,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.KRStompSong = api;
})(typeof window !== 'undefined' ? window : globalThis);

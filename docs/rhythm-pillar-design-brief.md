# Kool Riffs — Rhythm Pillar: Consolidated Design Brief

## 0. What the uploaded file actually is

`index-old.html` is **not** rhythm-counting code. It's the note-**name** drill: VexFlow renders single pitches on a staff, "Level 2" varies note durations (w/h/q) purely as visual variety, and the answer boxes ask for the pitch letter (A–G) via the keypad — not for a beat count. There's nothing here to salvage for the counting interaction itself. What *is* reusable as scaffolding: the system-row/SVG layout, the per-box auto-advance input pattern, and the round timer — the same shapes you've used elsewhere in Kool Riffs.

## 1. Core teaching premise

Rhythm is usually taught as "how long does this note/rest last" — which forces a student to stare at the note they're currently playing while doing duration arithmetic, so they're always a beat behind. Your method instead teaches **when the next event starts**. A half note + two quarter notes isn't "hold 2 beats, then 1, then 1" — it's "an event starts on beat 1, the next on beat 3, the next on beat 4." Duration is a side effect of onset timing, not the thing being counted.

## 2. Notation convention

- Every beat in the bar gets a number button (1–4 in 4/4).
- **A beat where a new note starts** is entered as Play.
- **A beat that's being held over from a previous note's onset** is entered as Hold — rendered as a bracket around the contiguous held run.
- **A beat that's silent** is entered as Rest — also rendered bracketed, but a distinct mode from Hold (see §3 for why).
- Half note + two quarters: `1 (2) 3 4`
- Whole note: `1 (2 3 4)` — 2, 3, and 4 are one bracketed group, not three separate brackets.

**Resolved:** a whole rest renders as `(1 2 3 4)` — all four beats bracketed, unlike a whole note where beat 1 sits outside the bracket. This isn't an inconsistency after all: a note has a real onset-vs-sustain distinction because the sound is continuous, so Play and Hold need to be told apart. A rest has no sound to sustain, so every rested beat is functionally identical — there's no meaningful "onset of silence" to separate from "continuing silence." One uniform Rest state covers the whole span. See §3.

## 3. Interface mechanic (from the SMASH SPACES mockup)

The interaction is **mode + stamp**, not literal bracket-drawing:

- Three mode buttons — **Play**, **Hold**, and (needs adding to the mockup) **Rest** — work like a sticky toggle, staying active until changed.
- Four number buttons (1–4, generated from the time signature) are the "stamp and advance" targets: tapping a number records the *currently active mode* against that beat and auto-advances the cursor to the next beat, with a blinking highlight showing progress.
- Worked example — a whole note: tap **Play**, tap **1** (records beat 1 as an onset, cursor advances) → tap **Hold**, tap **2**, tap **3**, tap **4** (each records "held," cursor advances each time). The rendered result is `1 (2 3 4)` — but that bracket is a *display* of three consecutive Hold-stamps, never an object the student draws directly.
- This resolves the two open interface questions from earlier: the "bracket gesture" was never a separate control — it's just how a run of same-mode stamps renders — and the rest-notation question resolves the same way (§2): Rest gets its own explicit stamp per beat, same mechanical cost as Hold, with no onset/continuation split needed.
- Worth noting as a genuine pedagogical win, not just a mechanical detail: because Rest requires an explicit tap on every beat (same as Hold), a student can't go passive during a rest — they're forced to keep actively counting through silence, which is exactly your core premise (count the next onset, don't just wait it out).
- **New open item:** Hold and Rest both render as bracketed spans — worth a distinct visual treatment for each (colour, or a note-stem vs. rest-glyph inside the bracket) so a student reviewing their own entry, or you reviewing their work, can tell "sustained note" apart from "counted silence" at a glance.
- Screen economy: only the *active* bar's buttons need to be large/interactive; already-entered and not-yet-reached bars render as small, non-interactive notation — this is how four bars fit on a phone without shrinking the buttons themselves.
- **Button hierarchy (resolved):** mode buttons (Play/Hold/Rest) sit *above* the number buttons, with Undo docked front-and-center in that same top row. Reasoning: the cognitive order is always decide-mode-then-commit-position, so the physical layout should read top-to-bottom in that order. It also matches actual tap frequency — mode buttons are sticky and only get re-tapped when the mode changes (a handful of times per bar), while the number buttons get tapped once per beat (up to 16 times across a 4-bar phrase) — so the much-more-frequently-used numbers belong in the easiest thumb-reach zone at the very bottom, with the less-frequent mode/undo controls just above. **Note:** the SMASH SPACES mockup currently has this inverted (numbers on top, Play/Hold below) — that ordering needs to flip.
- **Undo, not undo+redo (resolved):** a single Undo control, standard circular-arrow icon, docked in the top row described above. No redo — once undone, the beat is simply blank again for re-stamping.
- Same rule-of-three mastery gate as the rest of the app.
- Orientation: see §5 item 3 (resolved).

## 3a. Performing round & scoring (from the latest walkthrough)

- **Trigger:** only a fully correct Counting submission (all 4 bars, no partial credit) unlocks Performing. A pop-up confirms — "your counting is correct, time to play" — the student taps to proceed, dismissing it.
- **Screen carries over:** the same 4 bars stay visible, with the student's correct counting still shown underneath — only the button row changes, from Play/Hold/Rest+Undo down to a single tap button.
- **Count-in:** 4 metronome clicks at a hard-coded (designer-set, not student-chosen) tempo, accented on beat 1, using the app's existing metronome sound. Ideal: a synced visual "1-2-3-4" alongside the clicks; if audio/visual sync proves technically difficult, an audio-only 4-click count-in is an acceptable fallback.
- **Terminology:** the correct musical term for a note's onset is "attack," but that word won't be used with primary-school students — internally it's still the same Play/onset concept, just untaught by that name.
- **Scoring:** both halves are pass/fail, no partial credit anywhere. Counting-correct = 4 points; Performing-correct (all 4 bars tapped within tolerance) = another 4 points. **The mastery streak is based on Counting alone** — Performing is a bonus/reward layer that never gates progression or resets the streak. A student who counts three phrases correctly in a row advances the level regardless of how the tapping went on any of them; a failed Performing attempt only costs that round's bonus points.
- **After a wrong Counting submission:** the wrong bar(s) get corrected on-screen (right answers untouched), no forced redo — the student moves on to a new phrase from the same pool. That incorrect pattern is meant to feed the pool/watchlist system (more repetition until it's mastered), though the exact watchlist mechanics are explicitly left open for later.

## 4. Level sequence — renumbered, with your "any new concept = own level" rule applied consistently

Applying that rule strictly to ties (not just note values) actually changes the count — ties turn out to be two separate new concepts, not one:

| # | Content | Performing buttons | Timing |
|---|---|---|---|
| 1 | Interface intro: whole notes + whole rests (only 2 possible patterns exist at this tier). | Play + Rest | Untimed |
| 2 | **Half notes + half rests, isolated** (no whole notes yet). | Play + Rest | Untimed |
| 3 | Whole + half notes/rests **mixed**, under the engraving rule: never tie two half notes in the same bar — write a whole note instead. | Play + Rest | Untimed |
| 4 | **Crotchets alone**, "no two quarter rests in a row" rule. | Play + Rest | **Timed starts here** |
| 5 | **Full mix** — whole, half, quarter notes/rests. | Play + Rest | Timed |
| 6 | **Within-bar ties, isolated** — half tied to quarter → dotted half, entirely inside one bar. | Play + Rest | Timed |
| 7 | Within-bar ties **mixed** with everything above. | Play + Rest | Timed |
| 8 | **Cross-barline ties, isolated** (new) — a note sustains *past* the end of one bar into the next, e.g. a whole note in bar 1 tied into a half note at the start of bar 2. | Play + Rest | Timed |
| 9 | Cross-barline ties **mixed** with everything above. | Play + Rest | Timed |

That lands on **9**, matching your original instinct better than my last count of 7 did. The reason: a within-bar tie and a cross-barline tie are genuinely different concepts for a student — one just makes a longer note inside a bar they already understand as a 4-beat container; the other requires realizing that container isn't actually a wall, a note can breathe through it. Your own rule says that gets its own isolate-then-mix pair, same as everything else. This also resolves something I'd flagged as deferred-to-later in item 10 below — cross-barline ties turn out to belong right here, not in some separate future syncopation unit.

**Interface implication, confirmed by your worked example — genuinely good news:** ties need zero new UI. Your walkthrough (whole note bar 1 → tie into bar 2 → new half note at beat 3) is just Play 1, Hold 2/3/4, Hold 1, Hold 2, Play 3, Hold 4 — an ordinary Hold-run that happens to keep going past a barline. The interface has no concept of "bar" at all when it comes to Hold; it only knows "was the previous beat also Hold/the same onset." So level 8's *content* is new, but its *mechanic* is identical to every level before it — nothing to build, just new patterns for the generator to produce.

**Two flags, both genuine:**
- The original score's rehearsal mark C might have been intended as its own level (see the earlier open item) — if so, this becomes 10 levels, not 9.
- Rest disappears from Performing at quavers, confirmed — but still open whether that also applies to Counting's stamp interface, or just Performing.

## 5. Gaps that need a decision before content generation can be written

1. ~~Rest bracket convention~~ — **resolved:** see §2/§3. Rest is its own uniform per-beat stamp, mechanically identical in cost to Hold, so a whole rest is legitimately `(1 2 3 4)` with no onset beat — there's no continuous sound to distinguish onset from continuation.
2. ~~Bracket input gesture~~ — **resolved:** mode buttons (Play/Hold/Rest) + number-button stamp-and-advance. See §3.
3. ~~Bar count & orientation~~ — **resolved:** one 4-bar phrase, one content generator, layout-only difference by orientation. Landscape renders 4 bars in a row; portrait wraps the *same* 4-bar phrase into a 2×2 grid (2 bars per row) rather than shrinking the round to 2 bars — this preserves the lookahead-scanning skill the 4-bar requirement exists for, in both orientations. A dismissible banner nudges toward landscape but never locks or forces rotation. Technical note: VexFlow draws to fixed-pixel SVG, so an orientation change needs an actual re-render pass (recompute bar width for the new column count, redraw), triggered via `window.matchMedia('(orientation: landscape)')` — not left to CSS reflow alone.
4. ~~Time-signature rotation order~~ — **resolved by the score:** all note-value levels (now renumbered 1–7, see §4) stay in 4/4; meter rotation (2/4, 3/4, 6/8) is a distinct later phase, not interleaved with note-value introduction.
5. **6/8 placement relative to quavers.** You've described the two 6/8 counting styles pedagogically but haven't slotted them into the level sequence relative to the quaver levels.
6. **Relationship to the existing rhythm brief.** You already have an older Gemini-era rhythm brief built around typing full counting syllables (numbers + e/&/a + bracket modifier) on a custom keypad, with Missing Link / Survival phases. This new number-button-plus-bracket concept is a different input mechanic. Worth deciding explicitly: does this replace that brief, or become an alternative response-mode alongside it (mirroring how Note Smash and Real Smash both drill the same content differently)?
7. **Consistency with the rest of the app.** No mention yet of a watchlist/spaced-repetition mechanic or the shared pathway/lock-unlock dashboard for this pillar — presumably it should inherit both, as the other three games do, but that's an assumption, not something you've stated.
8. **Timer/scoring numbers.** The rule-of-three mastery gate is confirmed, but per-card time, round length, and scoring values (all specified elsewhere in Kool Riffs) aren't yet set for Rhythm.
9. ~~No isolated half-notes-only round~~ — **resolved:** now level 2 in the renumbered §4 table, half-alone before the whole+half mix in level 3. The same isolate-then-mix logic was also applied to both tie types (levels 6–7 for within-bar, 8–9 for cross-barline).
10. **Incomplete engraving rule set — narrowed, but not closed.** The score's one explicit rule (never tie two half notes in the same bar — write a whole note instead) still needs company: tying two quarters together in a bar should collapse to a half note rather than generate as a tie, and a full bar of four quarter rests should presumably be written as a whole rest, not four separate quarter rests. Cross-barline ties are now scoped into levels 8–9 (§4), no longer a deferred "later" item — but the rules for *which* cross-barline ties are legal (e.g., how far can a note extend into the following bar before it should just be written as a new note instead) still need spelling out.
11. ~~Hold vs. Rest visual distinction~~ — **resolved:** Play=green, Hold=amber, Rest=blue (swapped from the mockup's red to avoid clashing with error-state red and to avoid a red/green colorblind-unsafe pair), each with a distinct icon too, and the color+icon persists on the stamped number and propagates into the bracket underneath.
12. ~~Correction/undo~~ — **resolved:** single Undo control (no redo), docked above the number buttons alongside the mode buttons. See §3 for placement reasoning.
13. ~~Feedback granularity and timing~~ — **resolved, cleanly, by the Submit button.** Entry isn't checked beat-by-beat at all — the student fills the whole 4-bar phrase (Undo available throughout), then Submit checks it as a whole. "Three attempts" now means three *submit* attempts on the same phrase, not three taps on one beat: wrong → correction shown on just the wrong bar(s) → try again, up to three times before... (see item 18 — what happens after 3 failed submits still isn't stated).
14. **Audio's role — still partially open.** Wrong-Counting-answer feedback is confirmed audio+visual (buzzer). Performing now clearly has audio (metronome count-in). Still unaddressed: does a *correct* Counting stamp make any sound, and does a correct phrase play back before the student moves to Performing?
15. ~~4-bar phrase variety~~ — **confirmed needed.** Exact rule still to pin down — my default proposal: no single bar-pattern may repeat more than twice across the 4 bars, and no bar may be an identical repeat of the one immediately before it. At Level 1 (only two possible patterns exist — whole note or whole rest) this is nearly always trivially satisfied; it starts to matter once the pool grows from Level 2 onward.
16. **Does a hint-assisted correct answer still count toward the 3-in-a-row streak?** Now sharpened by item 18 below rather than replaced by it.
17. ~~Where exactly does "untimed" end?~~ — **resolved by the renumbering in §4:** untimed covers levels 1–3 (whole alone, half alone, whole+half mix); timing starts at level 4 (crotchets), exactly matching your own rule.
18. **What happens after 3 failed Submit attempts on one phrase?** Presumably the correct answer is revealed, matching the earlier training-wheels pattern, but this isn't stated for the phrase-level Submit flow specifically. Sharpened by item 16 below: this is now the single rule the whole leveling system rests on, since Performing no longer factors into the streak at all.
19. ~~Streak semantics when only one half succeeds~~ — **resolved:** the mastery streak is Counting-only. A failed Performing attempt costs that round's bonus points but never resets or blocks the streak. See §3a.
20. **Timing-tolerance windows for Performing — now a box-grid, not a continuous line.** The latest mockup replaces "position on a line" with a literal grid: one box per beat across the full 4-bar phrase (16 boxes in 4/4), tiled edge-to-edge with no gaps, synced to the same shared clock as the metronome and cursor. Landing in the correct box = pass; landing in an adjacent box already tells you the direction of the error (earlier box = early, later box = late) with no separate continuous-delta tracking needed for that purpose — the box position *is* the feedback. **Still open:** the actual box width (i.e. how much of a beat's duration counts as "still that beat"), and whether it narrows at higher levels as you mentioned ("we might be a bit more precise later"). **New gap, not yet addressed by the box model:** (a) a spurious tap landing in a box where no onset was expected at all (during a Hold or Rest span) — does that count against the student, or get ignored? (b) a missed tap — an onset box with nothing in it — can't be caught by a tap event, so it needs an explicit after-the-fact check comparing expected onset boxes against actual taps once the phrase finishes.
21. ~~"Right beat, bad timing" vs. "wrong beat entirely"~~ — **resolved by the same split as item 20:** wrong-button-or-missed-entirely is a red, categorically-wrong event; correct-button-but-mistimed is shown by the triangle's position, not a different color. Exact tolerance thresholds for what counts as "still counts" vs. "too late to count" remain open.
22. **Two different "rule of three" mechanics still coexist at different scopes** — three Submit attempts on one phrase (item 18), and three successful *countings* in a row to advance a level (now Counting-only, per item 19). Worth naming these distinctly in the spec/code so they don't get conflated later.
23. **Is Performing mandatory or skippable after a correct Counting submission?** If it can be declined, nothing stops a student from grinding pure counting and never practicing execution — which quietly defeats the reason Performing exists. Worth deciding whether the attempt is compulsory even though its outcome doesn't gate anything.
24. **"More tapping than counting at high levels" needs disambiguating against the counting-gates-tapping principle.** Does this mean the counting-first gate eventually gets dropped at advanced levels, or just that advanced content is complex enough that tapping *feels* like the bigger challenge while the gate itself never goes away? These are different designs.
25. **Rhythm likely has more levels than the Notation/pitch pillar**, by your own estimate, given the larger combinatorial space. Worth linking to item 7 (shared pathway/dashboard) — does the cross-pillar progression UI need to handle pillars of different lengths?
26. **Post-Performing feedback is a content-authoring task, not just a UI one.** You want condition-specific coaching after a Performing round — two concrete examples now on record: "find beat one" as a general habit, and "consistently landing in the late box → push the tempo, get in earlier." That's the start of a bank of coaching messages tied to detected error patterns, not one generic pop-up — the box-grid's directional feedback (item 20) is exactly the signal that would trigger messages like the second example. The bank itself still needs writing.
28. **Cursor color — resolved away from a new hue.** Gold risked sitting too close to amber (Hold's color) and adding a fifth meaning to an already-deliberate palette. Recommendation: a plain, thicker vertical bar in black or grey — a shape distinction, not a color one, matching the Sibelius reference you cited and your own instinct not to overload color.
27. **A real, acknowledged gap you flagged yourself:** because the mastery streak is Counting-only, a student with genuinely poor rhythmic coordination could clear every level on paper while never actually improving at tapping. Since you're the one who'll notice this in a real classroom, worth considering a simple non-gating Performing-accuracy view (a trend over time, visible to you or a parent) — not blocking progress, just surfacing the kids who need real-instrument coaching that the app itself won't force.

## 9. Interface redesign — "Rhythm Stomp" (supersedes §2–§3)

**Status: brief only, nothing in this section is built yet.** Written after a working prototype of §2/§3's mode+stamp interface existed (`rhythm.js`, built through Level 9/quavers) and was judged too convoluted in practice — "select the stamp button, then select the beat" is two decisions where there should be one. §1 (core premise), §3a (Performing round), §4 (level sequence), and §7/§8 are unaffected and still stand. This section is the replacement spec for the Counting screen's interaction and notation display only.

### 9.0 Naming

The pillar is now **Rhythm Stomp** — the second brand verb, pairing with **Smash** for the Notation pillar (Staff Smash / Note Smash / Real Smash). "Rhythm" alone (dashboard card, pathway header) has been renamed to "Rhythm Stomp" in `index.html`/`rhythm.js` already; nothing else in the running app changed. `CLAUDE.md`'s naming-conventions section still only documents "Smash" and needs a follow-up line once this pillar's rebuild actually ships — not done as part of this brief.

### 9.1 The core fix: Hold and Rest collapse into one input state

Confirmed directly by Rob: a held beat and a rested beat render as the *identical* bracket, and — this is the part that changes the code, not just the display — **the student's answer collapses to match**. There is no longer a three-way Play/Hold/Rest choice. Every stampable container has exactly two possible answers:

- **Play** — a new attack starts here.
- **Bracket** (`( )`) — nothing new happens here, whatever the reason (still ringing from an earlier attack, or silence). The student is never asked to say *which*.

Rationale in Rob's own words: "what matters is the next event... that gives me the luxury to combine the two into one symbol." Pedagogically this is consistent with §1 — Hold and Rest were always graded as "you don't play here," the three-way split only existed to drive two different bracket colors (§5 item 11's now-superseded amber/blue scheme). Collapsing input to two states is *the* mechanism that removes the separate mode-select step: there's no mode to pre-arm anymore, each container just gets answered directly.

**Grading implication (resolved, follows directly):** the generator/pattern data (`RHYTHM_PATTERNS`) keeps producing Play/Hold/Rest internally — that data still encodes real musical meaning (engraving rules, note durations, the whole-rest-vs-whole-note asymmetry in §2 still holds internally). Only the *comparison* against the student's answer changes: a Bracket tap is correct whenever the expected value is Hold **or** Rest; a Play tap is correct only when the expected value is Play. Existing `rhythmExpectedModeAt`-style lookups need this collapse applied at the comparison step, not by changing what the generator produces.

### 9.2 Interaction model: containers, not mode+stamp

Keep the existing engine concept of a flat, ordered list of stampable positions per phrase (`rhythmPositions`/cursor — this part of the current `rhythm.js` architecture is sound and doesn't need to change). What changes is the surface:

- Only the **current** (cursor) container is ever live. Its answer controls — two buttons, **Play** and **( )** — sit in one fixed location on screen (not scattered per-beat like the old number row), so the student's eyes and thumb never have to travel to find the next control.
- **One tap commits the answer and auto-advances the cursor** — no separate stamp step, no pre-armed mode to remember. This directly kills the "convoluted" complaint.
- Already-answered containers are not editable individually; Undo (single-level, as in §3, still no redo) steps the cursor back one position and clears that container's answer.
- No decision made yet on the exact widget for the two-button control (fixed Play/`( )` pair vs. a single toggle-then-confirm) — treat the two-fixed-buttons version as the working default; open to revision once it's actually built and tapped on a phone.

### 9.3 Live counting display — the worksheet convention, confirmed against 5 uploaded worksheets

Rob supplied five worksheets (`1 - Counting Quavers`, `2 - Counting Syncopation`, `3 - Semiquaver Rhythms Intro`, `4 - Semiquaver Workout`, `Counting Eighth Note Rhythms - Full Score`) plus a rough phone mockup ("Level 7: Dotted Notes" — explicitly a proportions/real-estate sketch only, not a literal interaction spec: Rob's own words, "I'm just playing... I've got to figure out how the interactions work"). What the worksheets confirm, as primary source rather than inference:

- **Play renders as a bare token** — the beat number (`1`, `2`, `3`, `4`) or subdivision syllable (`+`, `e`, `a`).
- **A single held/rested beat renders as that token in brackets** — e.g. a plain half note in 2/4 is `1 (2)` (Worksheet 1, example 2).
- **A run of consecutive non-Play sub-beat positions merges into ONE bracket pair**, not one bracket per position — Worksheet 3 (Semiquaver Rhythms Intro) is explicit and exhaustive about this: `1 (e &) a`, not `1 (e) (&) a`, for a dotted-eighth-then-sixteenth pattern. This is a hard confirmed rule, not a guess.
- **Worksheet 4's own instruction to students is literally "use ( ) to show tied rhythms"** — direct textual confirmation this is how Rob already teaches the convention on paper; the app is digitizing an existing worksheet habit, not inventing a new one.
- Syllable system, confirmed by Worksheet 3 and already matching the current `rhythmSubdivisionLabel()` implementation in `rhythm.js` — no change needed here: beat number on the downbeat, `+` for the 2-way (quaver) split, `e`/`+`/`a` for the 4-way (semiquaver) split. Triplets use `+`/`a` for the 3-way split (Rob's chat description, "one and r," is almost certainly this same `+`/`a` pattern via a garbled transcription — flagged in §9.6 for an explicit yes/no rather than assumed silently).

**Open, not yet confirmed (see §9.6):** whether the same merge-into-one-bracket rule applies *across full beat numbers*, not just within a beat's own subdivisions — e.g. does a dotted half spanning beats 2–3 render `1 (2 3)` (one bracket) or `1 (2) (3)` (two)? Worksheet 1's only multi-beat example (`1 (2)`) is a single held beat, so it doesn't settle this. Recommendation: merge at every level, for visual and rule consistency with §9.3's sub-beat evidence — but this is a recommendation standing in for a confirmed answer, not itself confirmed.

The live counting row renders directly beneath the staff, positioned under the note(s) it describes, and reveals left-to-right as the student answers each container — never all at once, never requiring a glance backward. This is the direct interface expression of §1's "eyes forward, time-travellers not accountants" premise. Font: something with a handwritten/typewritten worksheet feel, distinct from the app's normal UI font, matching the worksheets' own aesthetic — exact typeface not chosen yet (§9.6).

### 9.4 Screen layout

- The staff itself is **display-only** — no finger ever touches it, since all input now happens through the fixed two-button control (§9.2), not per-note like the old number row. This means the staff can render considerably smaller than before, which is the direct answer to the "too crowded" note in the Working On Quavers commit — that crowding came from stacking mode buttons + number row + subdivision row all beneath a staff sized for finger contact; none of those rows exist in this design.
- Target: up to **4 bars** visible at once (matching §5 item 3's original reasoning — the lookahead-scanning skill needs more than one bar in view), with the answer control (Play/`( )` buttons) below, sized generously since it's now the only touch surface on the whole screen.
- Orientation/tie-safety: §5 item 3's resolved rule (portrait = 2×2 grid, landscape = single row of 4, no tie ever generated across whatever boundary is the live row-split point) is the carried-over default. **Worth re-validating, not just assuming, before building:** now that the staff is small and non-interactive, 4 bars may comfortably fit in a single portrait row too, which would remove the row-split/tie-safety problem entirely rather than just managing it. Prototype both before committing.

### 9.5 What's unchanged

§1 (core premise), §3a (Performing round and its scoring — Performing already uses a single tap button, untouched by this rebuild), §4 (level sequence), §7 (level-select grid), §8 (entrance screen) all still stand as written. The persistence shape (`koolRiffsRhythmProgress`, per CLAUDE.md's pattern) doesn't change — this is a front-end/interaction rebuild on a data model that mostly survives (see §9.1's grading note for the one real change).

### 9.6 Still open — for Rob before/during implementation

1. Does bracket-merging span full beat numbers, not just sub-beat positions (`1 (2 3)` vs `1 (2) (3)`)? Recommended: yes, merge everywhere. Not yet confirmed — see §9.3.
2. Exact typeface for the handwritten/typewritten counting row.
3. Portrait layout: re-validate whether 4 bars fit in one row now the staff is tiny, before defaulting to the carried-over 2×2/tie-safety rule.
4. Confirm the triplet syllable is `+`/`a` (matching the existing `rhythmSubdivisionLabel()` code and the semiquaver worksheet's pattern) — Rob's chat description of "one and r" is assumed to be the same thing via a speech-to-text garble, not independently confirmed.
5. Exact widget for the two-button control (fixed Play/`( )` pair, vs. cycle-then-confirm) — working default is the fixed pair; open to change once prototyped on a phone.

## 6. Recommended direction

Down to four real threads. **Generator logic** (10, 15): engraving rule set and variety rule — needed on paper before content generation is trustworthy. **Streak/scoring semantics** (18, 19, 22): what a "success" actually means now spans two rounds (Counting + Performing) and two different scopes of "three" — worth writing out as explicit rules once, since it's easy to conflate in code otherwise. **Performing's timing engine** (20, 21): tolerance windows and error-type handling are real engineering questions you've already flagged as unresolved yourself — probably worth a dedicated pass once there's a working Counting prototype to attach Performing to. **Prototype-and-feel** (14 remainder): correct-answer audio is the last purely open item and is easiest to decide by trying it.

## 7. Level-select grid (within Rhythm)

Same lock/unlock pattern as Notation. With 9 levels, that's a 3×3 grid rather than the 2×4 you floated (which fit 8) — worth confirming the final count from §4 before locking the grid shape in.

**New requirement (resolved):** locked tiles should work like a table of contents everywhere — both Rhythm and Notation — showing a heading and real information about what's behind them, not a blank mystery square, so a student can see the whole progression and what they're working toward.

## 8. App-level: the Cool Riffs entrance screen (new scope — not Rhythm-specific)

This is a different layer from everything above — a top-level screen for the whole app, sitting above all four pillars, not something that lives inside the Rhythm build. Worth keeping visibly separate when this gets handed off, so it doesn't get built as if it were part of Rhythm's own scope.

**What's been described:**
- All four pillars shown — Notation and Rhythm unlocked/playable, Key Signatures and Intervals visible but locked (not yet built). You suspect Rhythm will end up the hardest of the four, given how much more interaction it has than the others.
- Holds high scores.
- Can greet the student by name, implying some name-capture step exists somewhere before this screen is useful.
- Carries the metronome and tuner tools, same as they already appear on the individual Rhythm and Notation landing pages today — this is in addition to those, not a replacement.
- "Pillar" itself might not be the right word — you floated "element" as a more musical alternative while thinking out loud.

**New open items this raises:**
- High scores: per-pillar, a combined total across all four, or both?
- Name capture: is there an existing profile/identity mechanism anywhere in Kool Riffs already, or does this entrance screen introduce the first one?
- Should locked pillar tiles (Key Signatures, Intervals) get the same "heading + real information, not a blank square" treatment you just specified for locked *levels* within a pillar (§7) — consistent logic, but not yet stated for this layer.

**On naming:** a few other musical words that might fit better than "pillar," if you want options to react to rather than starting from a blank page — **Foundations**, **Fundamentals**, or **Staves** (a nice double meaning, since a stave is literally what music is written on, and it echoes "stay/support"). Worth sitting with rather than deciding on the spot.

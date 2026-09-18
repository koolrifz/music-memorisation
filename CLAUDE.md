# Kool Riffs — Project Reference

Read this before touching the code. It's the accumulated context from months of design work, kept up to date as the project evolves — treat it as the source of truth over any stale comment in the code itself.

## What this is
A browser-based music-education app (single HTML page, no build step) teaching primary/secondary students to read music at speed, deployed at koolrifz.github.io. Built by a career instrumental music teacher, not a developer — code quality and correctness matter, but so does keeping the file structure simple enough that he can read and reason about it himself.

**Files:** `index.html`, `script.js`, `style.css`, plus `rhythm.js` and `rhythm-stomp-lab.js` for the Rhythm pillar. Notation rendering uses VexFlow 3.0.9 via CDN.

## The three games + two tools
- **Staff Smash** (Game 1) — orientation drills: lines, spaces, mixed, staff numbers, then a Ledger Bonus Round. Uses a "SMASH grid" mechanic: a grid of mini-staves, tap the ones matching the announced target, density scales 3→6→9→12 cards as streaks build.
- **Note Smash** (Game 2) — same SMASH grid mechanic, now with real letter names instead of raw line/space discrimination.
- **Real Smash** (Game 3) — the graduation stage: 60-second sprints, full sight-reading, no hints, scored with medals and a personal best.
- **Kool Beat** — metronome (dashboard practice tool).
- **Kool Tuner** — mic-based tuner with an instrument-transposition selector (concert/Bb/Eb/F), dashboard practice tool.

## Rhythm Stomp Lab — TWO interfaces, deliberately. Don't delete either.
`rhythm-stomp-lab.js` teaches counting. There are two ways in, and **neither
supersedes the other** — but they now have different jobs:

1. **Two-button (Play / "Nothing New")** — the cursor walks the phrase a beat at
   a time and the student answers "does a new note start here?" A child who
   can't yet write numerals confidently can still play it, and it works
   beautifully in prompts. **Decided: this becomes the interactive tutorial /
   help area**, not a parallel game with its own level spiral. It is the way in
   — for preps and lower primary as their whole experience, and for everyone
   else as the thing that teaches the idea before the keypad asks them to write
   it. It is what currently ships as the game.
2. **Scribe keypad** — the student writes the counting out themselves on a
   keypad (`1 2 3 4`, `(`, `)`), supplying every numeral. Nothing is pre-placed,
   so it can't be solved without knowing what each note is worth. This is the
   precise version for students who can write, and the transferable skill: it's
   as close to writing counting under the notes by hand as a screen gets. **The
   level spiral lives here**, not in the two-button game.

The second was designed *after* the first and is more rigorous, which makes it
look like a replacement. It isn't. If you are tidying up, **do not remove the
two-button game on the grounds that the keypad replaces it** — that would delete
the only version young children can use, and the tutorial with it. Both can
carry the same bonus stomp round.

## Counting convention — THE BRACKET NEVER CROSSES A BARLINE
Read this before touching either interface. An earlier version of this file
said the opposite (that a tie should be one bracket spanning the barline).
**That was wrong and has been reversed** — the reversal is Rob's, and the
reason outranks the tidiness of drawing a tie as one object:

> The student has to know where beat 1 is without stopping to work it out. The
> counting is what teaches them that, so the counting has to delineate the bar.
> A bracket running through the barline bunches the phrase into one
> undifferentiated blob and hides the single most important landmark in it.
> Laying the mechanics out correctly is how the *feel* of the pulse gets built
> — so this layout is not cosmetic, it is the teaching.

A whole note tied to a whole note is `1 (2 3 4)` then `(1 2 3 4)` — **never**
`1 (2 3 4 1 2 3 4)`. A half tied across the barline is `3 (4)` then `(1 2)`.

The grouping unit is **one written note or rest**, which is also why a bracket
can't cross a barline: a written note can't either — that is what a tie is for.
Each note or rest on the staff gets exactly one group:

| On the staff | Counting |
|---|---|
| A struck note | onset digit outside, held beats bracketed — `1 (2 3 4)` |
| A note tied into (no onset to write) | every beat bracketed — `(1 2)` |
| A rest (no onset/sustain distinction) | every beat bracketed — `(1 2 3 4)` |

Two half notes tied *inside* one bar are two written notes, so two brackets:
`1 (2) (3 4)`, even though nothing is re-struck on beat 3.

Derive the groups from the note specs, not from the beat stream — that is what
makes the counting match the notation automatically. **Note boundaries are
explicit in the phrase model** (`rstompSpecBars`, a list of bars each holding
`{beats, isRest, tied}` per written note); the beat stream is derived from it,
never the other way round. Beats alone cannot tell a whole note from two tied
half notes.

### Rob's worked examples — the authority, all reproduced in code

| Written | Counting |
|---|---|
| Two quarters tied | `1 (2)` — *identical to a half note, and that is the point* |
| Quarter tied to half | `1 (2 3)` — identical to the dotted half it demonstrates |
| **Half tied to quarter** | `1 (2) (3)` — two brackets; a new written note starts on beat 3 |
| Two halves tied | `1 (2) (3 4)` |
| Whole note | `1 (2 3 4)` |
| Half rest + two quarter rests | `(1 2) (3) (4)` — adjacent rests never merge |
| Whole tied to whole | `1 (2 3 4)` · `(1 2 3 4)` |
| Half tied to whole | `3 (4)` · `(1 2 3 4)` |
| Whole tied to half | `1 (2 3 4)` · `(1 2)` |
| Quarter tied to quarter across a barline | `4` · `(1)` |

Two collisions are **deliberately accepted**: a quarter tied to a half reads
the same as a quarter plus a half rest, and a half note plus a whole rest reads
the same as a half tied to a whole. The notation above says which it is; the
counting says how it is counted, and it is counted the same way.

**Engraving rule:** a bar of 4/4 never holds four quarter rests — three at
most, so the real beat stays findable.

### How the counting is SET — settled, don't re-open these

**One bracket style for everything.** No font change, no italics, no visual
distinction between a hold bracket and a rest bracket. Rob's notation examples
show rest brackets in italic; that is a **Sibelius artefact** (lyric text won't
span a rest, so he used expression text, which is italic and he couldn't turn
it off), not a distinction. His words: *"keep everything exactly the same. Type
font, no italics, no change, no delineation between rests and holding."*

So the two collisions above stay collisions **on purpose** — nothing in the
counting will ever separate them, and nothing should try.

**There is one spacing system and it belongs to the engraving.** The counting
row is not typeset on its own and then aligned; it *inherits* the notation's
horizontal positions. Every number sits under the thing it counts because that
is where the thing it counts is. Rob: *"there aren't two different sets of
spacing... it's all the same."*

His handwritten `1(234)` is a constraint of writing by hand, not a spec — do
**not** force a note's counting into one tight run. The onset digit anchors to
its notehead; a hold bracket with no glyph of its own centres across the span
it covers, so the numbers breathe. That is what the app already does and it is
correct.

Full detail lives in the design brief §10.2a–§10.2b.

## Counting engine — the shape to build to
Settled, and written up in full in the private docs repo
(`kool-riffs-docs/docs/rhythm-pillar-design-brief.md`, §11–§12). The short
version, so nobody re-derives it from the code:

- A phrase is a **flat array of slots**, each `struck` | `hold` | `rest`. Note
  values are derived on the way out, for drawing only — the engine never needs
  to know what a dotted quaver is.
- **A level is defined by one array of counting labels.** Slots per bar is its
  length; the keypad is its distinct values.
  `1 2 3 4` / `1 + 2 + 3 + 4 +` / `1 e + a 2 e + a …` / `1 2 3 4 5 6` (6/8 in 6)
  / `1 + a 2 + a` (6/8 in 2).
- **6/8-in-6 and 6/8-in-2 are the same six-slot grid with different labels.**
  6/8 is taught as simple time first; in-2 is a later relabelling at speed.
- **`+`, never `&`.** The counting has to transfer to handwriting, and a
  handwritten `&` looks like a `+` anyway.
- **The bracket never crosses a barline** (see the convention section above) —
  the grouping unit is one written note or rest.
- **Note boundaries are explicit** — `rstompSpecBars` is the source of truth and
  the beat stream is derived from it. This is what makes within-bar ties and
  the long-hand device below expressible at all; beats alone can't tell a whole
  note from two tied half notes.
- **Long-hand spelling is a teaching device, not an engraving rule.** Two tied
  crotchets shown against a minim, a crotchet tied to a quaver shown against a
  dotted crotchet — same counting under both. Strictly one generation at a time
  (never four crotchets tied into a semibreve). It is sprinkled through existing
  levels, never given levels of its own.

## Level sequence — 21 levels, to sixteenth notes
Designed against the standard reading and drum methods so a student who opens a
band book finds themselves somewhere recognisable. Full table with what each
level teaches: design brief **§13**. Do not invent a level order from the code.

| Stage | Labels | Levels |
|---|---|---|
| **A — the beat** | `1 2 3 4` | quarters · halves · wholes · mixed · dotted half · barline ties |
| **B — the quaver** | `1 + 2 + 3 + 4 +` | paired 8ths · mixed · single 8th · dotted quarter · syncopa · mixed + ties |
| **C — 6/8** | `1 2 3 4 5 6` then `1 + a 2 + a` | in 6 · in 2 at speed |
| **D — the semiquaver** | `1 e + a …` | four 16ths · mixed · patterns 1–2 · dotted 8th+16th · reversed · syncopation · review |

Three things to know before touching `RSTOMP_LEVELS`:

- **It starts at the quarter note, not the whole note.** A bar of quarters is
  `1 2 3 4` with no brackets at all, so the student learns the keypad and the
  grid before meeting the bracket. A whole note is `1 (2 3 4)` — that put the
  hardest idea in the notation in bar one of level one.
- **The four levels that exist today become A3, A2, A4 and A6** — reordered,
  not rewritten. Seventeen levels do not exist yet.
- **Stage B is the centre of gravity**, six levels. That first subdivision of
  the beat is where the real work is; everything finer is the same skill at a
  smaller scale.

Anacrusis (after B3), accent (after B5) and Mystery Rhythms (from A4) are
slotted through existing levels rather than given levels of their own. The
anacrusis is the biggest content hole — every generated phrase currently starts
on beat 1, and a pick-up is the sharpest test of where beat 1 is.

## Naming conventions (don't drift from these)
The brand verb is **"Smash"** — every game name uses it (Staff Smash, Note Smash, Real Smash). Don't introduce a differently-themed name (e.g. "Quest", "Sprint" as a title) for a new mode without checking first — this was deliberately corrected once already (Real Smash was originally "NoteQuest").

## Core mechanics (apply consistently to any new content)
- **Rule of three:** three correct in a row confirms real mastery, not a lucky guess. Used everywhere as the advancement gate.
- **Duds:** a round with zero valid targets present is a fair, neutral pass — costs time, doesn't break or advance a streak. A correctly-handled dud also counts as a streak "joker."
- **Scoring:** only correct taps score points; wrong taps or missed targets cost time, never points. Score totals shown to the player are always whole numbers (decimals are fine internally for time bonuses).
- **Sequential unlocking:** each game's stage list is gated in order (e.g. Staff Smash: Lines → Spaces → Mixed → Staff Numbers → Ledger Bonus, with Ledger Bonus gated behind Staff Numbers clearing — this is intentional, not accidental).

## Persistence pattern (already implemented — follow this shape for anything new)
Each game keeps its own localStorage key (`koolRiffsG1Progress`, `koolRiffsG2Progress`, `koolRiffsG3Progress`) storing per-device unlocked stages, best score/time per stage, resume position, and total plays. This is real browser storage on a real deployed site — no sandbox restriction applies here. On relaunch, route to the pathway screen at the saved resume position, not back to the dashboard.

## Pathway screen pattern
Each game's entry point is a pathway screen (`g1-screen-pathway`, etc.) — a compact horizontal track of stage nodes (locked = icon only, no text; unlocked = icon + label; cleared = icon + label + best score badge). The Start button never appears on this screen itself, only after a stage is selected. This was a deliberate fix — don't regress to a screen where a game launches straight into "Start" with no visible pathway.

---

## Open items to fix now

### 1. HIGH PRIORITY — Game 3 Helpers popup SVG isn't rendering
The note-name-mnemonic helper modal (`helper-sheet-modal` in Game 3, mirrors the existing working `g2-helper-modal`) draws its staves via `renderHelperSheetGraphics()` in script.js. **The entire function body is wrapped in `try { ... } catch(e) {}` with an empty catch — this is swallowing whatever error is actually occurring, which is why the failure is hard to diagnose.**

First step, before attempting any fix: change the catch to `catch(e) { console.error('renderHelperSheetGraphics failed:', e); }`, reproduce (open Real Smash → tap Helpers), and read the actual console error. Do not guess at a fix without seeing the real error first.

One thing worth checking while in there: `renderHelperSheetGraphics()` determines the current clef via `document.getElementById('clef-select') || document.getElementById('g2-clef-select')`. The `clef-select` element lives in `g3-screen-setup`, a screen that's no longer shown in the normal flow (see item 3 below) — confirm this element still reliably exists and holds the right value when the Game 3 Helpers modal opens.

### 2. CONFIRMED BUG — Tuner's F-instrument transposition is wrong
In `updateTunerInstrument`, the transposition table is:
```js
const transposition = { concert: 0, bb: 2, eb: -3, f: -7 }[tunerInstrument] || 0;
```
Bb (+2) and Eb (-3, a valid mod-12-equivalent of the usual +9) are correct. **F is wrong** — an F instrument (e.g. French horn) sounds a perfect fifth below written pitch, so the written note is the concert pitch **+7 semitones**, not -7. As written, -7 produces a completely different letter name than the correct one (e.g. concert C should read as G for an F instrument; the current code will show F instead). Fix: change `f: -7` to `f: 7` (or the mod-12-equivalent `-5` if the intent was to bias toward a lower octave display — either works for a tuner that only cares about pitch class).

### 3. Game 3 dead code — leftover pre-pathway setup screen
`g3-screen-setup` (with `clef-select`, `level-select`, `mode-select` dropdowns) predates the pathway system and is now bypassed — `startSelectedG3Stage()` sets `level-select`/`mode-select` programmatically and launches straight into the game without the screen ever being shown. It's inert, not currently causing a visible bug, but worth removing as part of general cleanup: delete the screen and rewire `startSelectedG3Stage`/`startG3Game` to read stage config directly rather than through hidden form fields (matches how Games 1 and 2 already work).

### 4. Design fix — Game 2 repeats its target announcement unnecessarily
In `loadG2Grid()`, the target letter is re-displayed and re-spoken (`speakLetter(g2TargetNote)`) on every single screen redraw, even when the target hasn't changed from the previous screen. This should only announce (visually and audibly) when the target actually changes — if the same letter comes up again, refresh the grid silently.

### 5. Not yet built — share button needs an image, not just text/URL
`shareGameResult()` currently shares via the Web Share API with text + URL only, which is why email is often the only share target offered on a phone. Wants the result screen rendered to a canvas snapshot and shared as a file (`navigator.canShare({ files: [...] })` with feature detection and a fallback for browsers that don't support file sharing).

### 6. Not yet fleshed out — streak encouragement audio
Idea: audio encouragement at streak 1/2/3 within a density tier, matching Rob's in-person teaching cadence (encouraging early reps, playful tension on the final rep before advancement, celebration on success — see teaching philosophy note below). Content and exact trigger points aren't decided yet — check with Rob before implementing, this isn't ready to build from yet.

---

## Design philosophy (useful context, not a task list)
Rob's teaching background is built around rote memorization drilled to automaticity (flashcard-style, "rule of three" mastery checks) rather than repertoire-first instruction — he considers this the biggest gap in how music reading is currently taught, and it's the whole reason this app exists. When in doubt about how strict a mastery gate should be, or whether to add a hint/scaffold, the answer is usually "make them actually prove it" rather than "make it easier to pass." This app is explicitly not meant to feel like generic edutainment — the "Smash" branding and the strict all-or-nothing mastery checks are deliberate, not to be softened without asking.

## Pedagogy decisions

### Alto & Tenor clef: teach via Middle C, not a mnemonic
Unlike treble/bass (which keep their traditional mnemonics — EGBDF, FACE, etc. — because those are near-universally recognized), alto and tenor clef are taught through the C-clef's actual meaning: the curl points at Middle C. Alto = Middle C on the middle line. Tenor = the same clef shifted up one line, Middle C on the second line from the top. The Helper popup for these two clefs must:
1. Explain the clef via Middle C (see draft copy below), not a phrase mnemonic.
2. Visually highlight Middle C **on the staff itself** — this is a new highlight type, distinct from the existing ledger-note highlight, since Middle C sits on a staff line/space here, not above or below the staff.
3. Show one worked example (e.g. "D is one space up. B is one space down.") so the counting method is demonstrated, not just described.

Draft copy:
**Alto** — "It's All About Middle C" / See that curl in the middle of the alto clef? It's pointing straight at Middle C, sitting right on the middle line. Once you know that one spot, count the musical alphabet up or down from there.
**Tenor** — "Same Clef, One Line Higher" / Tenor clef is the exact same symbol as alto — just shifted up. Its curl now points at the second line from the top. That's still Middle C. Everything you learned counting from Middle C in alto works the same way here.

## Roadmap context
Currently scoped as three games (Notation pillar only) out of four eventual pillars: Notation (done/near-done), Rhythm, Key Signatures, Intervals — not yet started. Near-term goal is a clean prototype to hand to other developers or use for an app-store-style release; Game 3 structural cleanup (item 3 above) and the fixes above are the main blockers to calling the Notation pillar finished.

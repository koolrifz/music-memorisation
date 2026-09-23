# Kool Riffs — project knowledge

Everything a fresh Claude needs to reason about this project, in one file.
Drop this straight into a Claude Project's knowledge base.

- **Live app:** https://koolrifz.github.io/music-memorisation/
- **Repo:** https://github.com/koolrifz/music-memorisation
- **Generated:** 2026-09-23 — by `tools/build-project-knowledge.py`

**This file is generated.** Edit the sources in the repo and re-run the script;
do not edit this copy, the next run overwrites it.

**What this is not:** it is not the code. It is the accumulated design context —
the rules, the reversals and the reasoning behind them. To change code, work in
the repo, not from here.

**How to read the rules.** Many of them have been reversed at least once, by
Rob, after he played the thing on a phone and found the edge of his own rule.
Every reversal is recorded next to the rule it replaced, with his words and his
reasoning. That is deliberate: this is a history, not a contradiction. When two
statements conflict, **the one marked as the later reversal wins**, and the text
says which that is.

---


==============================================================================
# FILE: CLAUDE.md
*The main reference. Read this first - it is the source of truth over any comment in the code.*
==============================================================================

# Kool Riffs — Project Reference

Read this before touching the code. It's the accumulated context from months of design work, kept up to date as the project evolves — treat it as the source of truth over any stale comment in the code itself.

## What this is
A browser-based music-education app (single HTML page, no build step) teaching primary/secondary students to read music at speed, deployed at koolrifz.github.io. Built by a career instrumental music teacher, not a developer — code quality and correctness matter, but so does keeping the file structure simple enough that he can read and reason about it himself.

**Files:** `index.html`, `script.js`, `style.css`, plus `rhythm.js` and `rhythm-stomp-lab.js` for the Rhythm pillar. Notation rendering uses VexFlow 3.0.9 via CDN.

**WORDS DO NOT GO IN THE CODE.** Rob, 2026-09-23: *"I was disappointed to learn
that Staff Smash, Note Smash and Real Smash are all pretty much hard-coded. That
can't continue."* Every on-screen word, spoken line, sound and picture is to be
referenced by ID from language and content files (`lang/`, `content/`), not a
literal in the HTML or JS. **Not a CMS, not a database**: plain files Rob can
read. The plan, the migration order and the checks are in
`docs/language-files-plan.md`. Until a game is migrated its old literals stay,
but **no new on-screen text may be added as a literal anywhere.**

**THE ENGRAVING STANDARD OUTRANKS ROB'S OWN RULES.** Rob's ruling, and it
reframes most of this file: *"Most of my rules are actually the scaffolding
tricks and tips to gain the knowledge."* The standard is the notation; his
rules are the **scaffolding** — the bridging device from unawareness to
mastery. Scaffolding may break the standard, but only where the break *is* the
teaching, and only as a named exception recorded in `NOTATION_RULES.md`.

**`NOTATION_RULES.md` is mandatory reading before touching any beaming or
grouping code.** It holds the standard classical engraving conventions Rob
supplied as authority, and the engine's measured standing against them. Code
that violates them is a bug, not a style preference.

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
   help area**, not a parallel game with its own level spiral. **Built as a
   tutorial round:** a wrong tap is refused and explained on the spot — see
   "The two-button interface is a TUTORIAL ROUND". It is the way in
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

### The handover is at A5 — and the digits carry no information
**A1–A4 are played on the two-button interface, A5–D8 on the keypad.**

Measured at 400 phrases a level: **through Stage A the digit sequence never
varies.** It is always the level's labels in order — `1 2 3 4 1 2 3 4…` —
whatever the rhythm, because on the crotchet grid every slot is a beat and every
beat is counted. Only the bracket pattern changes, and it changes constantly (up
to 399 distinct patterns in 400 phrases). **Through Stage A the brackets are the
whole test.**

So *within Stage A* the two interfaces ask the identical question. "Does a new
note start here?" and "is this label inside a bracket or outside it?" are the
same question asked twice, and the keypad asks for more typing rather than more
knowledge. The handover sits at A5, inside that range, so this is the reasoning
that matters for it and it still holds.

**From B1 it stops being true**, and deliberately so. Once the beat divides, a
label is written on every beat and wherever an event starts (see "WHICH SLOTS
GET A LABEL"), so the digits move with the rhythm: **125** distinct digit
sequences in 400 phrases at L10, 189 at L13, **400 out of 400** at L24 and L28.
Stage C drops back to 1, because 6/8 counted in six makes every slot a beat
again. From Stage B the keypad genuinely tests more than the brackets — knowing
that a crotchet gets no "and" is exactly what the level is teaching.

The real difference is **recognition versus production**:

| | |
|---|---|
| **Two-button** | the cursor leads; the counting appears correctly in front of them. This is how the technique gets *given away*. |
| **Keypad** | the student leads; they track their own position and produce the whole string. Closest a screen gets to writing it by hand. |

**Why A5 and not B1.** Handing the keypad over at the quaver grid would land a
new interface, a new grid and a new key on one level — three new ideas at once.
A5 introduces no new notation, so it has the room, and the interface change
becomes its one new idea.

**Rejected for Stage A, with a measurement:** an intermediate tier where the
student types the digits and the app supplies the brackets is a **test of
nothing** *through Stage A*, because there the digits are positional. From
Stage B the digits carry real information, so the same tier would be a real
test. Still unbuilt — ask Rob before building it.

## WHICH SLOTS GET A LABEL — every beat, and every event
Read this together with the bracket convention below; the two of them *are*
the counting.

> **A label is written on every BEAT, and wherever a note or rest STARTS.
> Nothing is written on an off-beat slot that no event begins on.**

**This was reversed once, on Rob's call, after he tested Stage B on a phone.**
The app used to write a label on *every slot*, so a crotchet on beat 2 of a
quaver-grid bar came out `2 (+)`. It is `2`. You count the beat; you don't say
"and" when nothing happens on it.

Two things follow, and they are the whole reason for the change:

- **A note's counting doesn't change when the grid gets finer.** A minim is
  `1 (2)` on the crotchet grid, on the quaver grid and on the semiquaver grid
  alike. What a student learns in Stage A is still what they write in Stage D.
- **The typing collapses.** A quaver-grid bar goes from 8 labels to 6; the
  browser test that types a whole semiquaver phrase by clicking went from
  **50 taps to 20**. Stage D is playable on a phone because of this.

It also removes a collision: at the quaver grid `♩` and `♪𝄾` both used to read
`2 (+)`. They now read `2` and `2 (+)` — which is what makes B3 ("single quaver
+ quaver rest") worth a level at all.

**Rob's worked-examples table below is unaffected.** Every example in it sits on
the crotchet grid, where every slot *is* a beat and the two rules agree exactly.
That is why the difference stayed invisible until B1 — and why the A5 handover
argument, which is entirely inside Stage A, still stands.

`buildRstompPositions()` is the one place the rule lives; `rstompTargetGroups()`
applies the same test, and the audio times each label from the slot its position
carries. **Labels and slots are no longer one-to-one** — anything mapping
between them (grading, the caret, the counting row's x, the rewind) must go
through `rstompPositions`, never through `index * slotsPerBar` arithmetic.

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

**This is still what the app WRITES, everywhere. It is no longer what the app
ACCEPTS: a continuous run — of rests OR of a held note — may be chunked
straight through a barline.** See "A run of one kind may cross the barline"
below. Rob reversed this rule himself, in two steps, and knew both times that
he was doing it.

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
| Half rest + two quarter rests | `(1 2) (3) (4)` — what the app writes; `(1 2 3 4)` is **also accepted**, see below |
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

### A RUN OF "NOTHING NEW HAPPENS" MAY SHARE ONE BRACKET
Rob's revision of his own rule, made twice — for **rests** on Level 12 and for
**a note and its tied continuation** on Level 13:

> *"I have to break my rule. If there are consecutive rests of different value,
> they can be put under one large bracket. As long as they are notating which
> count is within the rest bracket, that's best."*

> *"Also accepted, because this is chunking the same concept."*

A run of rests is **one continuous silence**; a note and the notes tied into it
are **one continuous sound**. Either way nothing is re-struck anywhere inside
the run, so the student may show the written-note boundaries or chunk the whole
thing, and both are right. The counting's job is to name every count the run
covers — not to show where one written note or rest ends and the next begins.
The notation above already says that.

Rob's Level 13 bar — quaver rest, dotted crotchet tied to a quaver, quaver,
crotchet — is the case that extended it:

```
(1) + (2) (3) + 4     one bracket per written note, what the app reveals
(1) + (2 3) + 4       the sustain chunked through the tie
```

**SOUND AND SILENCE DO NOT MERGE WITH EACH OTHER.** A rest run and a hold run
side by side stay two brackets: a note's held beats and a rest are different
things, and only like joins like.

**A consequence worth knowing:** two tied minims may now be counted `1 (2 3 4)`
— exactly as a semibreve is. That *is* the equivalency the scaffold teaches, so
it is consistent, but it means the "more written notes, so more groups"
information in the worked-examples table is now optional rather than required.
The app still reveals the un-chunked form, so what is *taught* is unchanged.

**Every way of dividing a run is accepted.** For a bar of crotchet rest · two
quaver rests · crotchet rest · crotchet, all of these are correct:

```
(1) (2) (+) (3) 4     one bracket per written rest - what the app reveals
(1) (2 +) (3) 4       Rob's own, the two quaver rests merged
(1 2 + 3) 4           the whole run merged
```

This is **"accept either", not "merged only"** — Rob's call. The app still
writes and speaks one bracket per written note or rest, so nothing already
learned became wrong and Stage A's `(1 2) (3) (4)` still reads exactly as his
table says. The merging is a grading concession, not a change to what is
taught.

Four things it deliberately does **not** loosen, all still marked wrong:

- a rest left **unbracketed** anywhere in the run;
- a bracket left **hanging open** at the end of the run;
- a bracket drawn **across a barline** — *no longer wrong*, for a run of one
  kind; see below. It is still wrong for anything that is not a single
  continuous run, because an onset is a different kind;
- a rest merged into the **hold bracket of a note** beside it, or vice versa —
  only like joins like;
- an **onset digit swallowed into the bracket**. The onset sits outside, always;
  that is the rule everything else rests on.

### A RUN OF ONE KIND MAY CROSS THE BARLINE — Rob reversing his own rule
He made this call in two steps and knew both times what it cost. First for
**rests**:

> *"This would be a nice situation when you have rests that span over two bars
> continuously — they open bracket and the numbers and syllables under the rests
> are tracked, and even tracked across the barline… and it shouldn't be marked
> incorrect. This is a chunking one that should work either way. **It breaks a
> lot of rules but I really think it's an unnecessary one** — to make sure we
> don't get too pedantic. If they can see all seven beats of that rest then good
> luck to them."*

Then, asked whether a **held note** should follow:

> *"Yes. If somebody writes the counting over the barline and uses one open and
> closed set of brackets for a held note, I think we can assume they do not want
> to close that bracket and restart another one — they are continuing to mark a
> held note by keeping the bracket open whilst they have crossed the barline. So
> yes, I emphatically made that point as the opposite earlier on."*

So `(1 2 3 4 1 2 3)` across two bars of silence is accepted, and so is a tie
bracketed straight through. The reasoning is one reasoning for both: **a
continuous sound and a continuous silence do not stop at a barline the way a
written note does.** The barline rule exists so the counting delineates the bar
and beat 1 stays findable — and a student who has tracked a note or a rest
straight through has *demonstrably kept their place*, which is the thing the
rule was protecting.

`joins()` is now one test — **same kind** — and that is the whole rule.

- **What is TAUGHT is unchanged.** The app still reveals one bracket per written
  note or rest, stopping at every barline. This is a grading concession only and
  it does not touch `rstompTargetGroups()`.
- **SOUND AND SILENCE STILL DO NOT MERGE.** Only like joins like, and an onset
  is its own kind — so a bracket that swallows an onset, or that runs from a
  held note into the rest beside it, still fails. Verified after the change.
- **Open, and Rob's to decide once he has played more:** whether *early* levels
  should still enforce the barline to drill the rule, relaxing it later. *"Maybe
  at an earlier level I might reinforce the rule just for a little while… that's
  going to come with me playing the game a bit more."* The natural shape is a
  per-level flag read inside `joins()` — one line, not a second code path.

Implemented in `rstompNormaliseSustainRuns()`, applied to both the student's
marks and the target's before they are compared. `rstompLabelKinds()` labels
every counting position `onset` | `hold` | `rest`; inside a run of one kind, the
flags saying "a bracket opens here" and "a bracket closes here" are cleared on
both sides, so however the run was divided it compares equal. Everything listed
above survives because it is carried by a different flag, by the kind, or by the
run's own boundaries.

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
**not** force a note's counting into one tight run. **Every label is placed on
its own**, under the count it names: see "Each label is placed on its own" below.
An earlier version of this file said a bracket "centres across the span it
covers", which is what produced the lump Rob then asked to have spread out.

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
  **Built — this is how `rhythm-stomp-lab.js` works now.** Each level carries
  `labels` and `slot` (the note value one slot is worth), and
  `rstompGridFor(level)` derives slots-per-bar, the resolved vocabulary and the
  VexFlow meter from them. The label array defines the **grid**; which of its
  positions actually get written is the separate rule above ("WHICH SLOTS GET A
  LABEL"), and from Stage B those are not the same set. The four shipping levels are all on the crotchet
  grid; the quaver, 6/8 and semiquaver grids are tested but unused until
  Stage B is built.
- **6/8-in-6 and 6/8-in-2 are the same six-slot grid with different labels.**
  6/8 is taught as simple time first; in-2 is a later relabelling at speed.
- **`+`, never `&`.** The counting has to transfer to handwriting, and a
  handwritten `&` looks like a `+` anyway.
- **The bracket never crosses a barline** (see the convention section above) —
  the grouping unit is one written note or rest.
- **The vocabulary names note VALUES, not slot counts.** How many slots a
  crotchet covers depends on the level: one at Stage A, two once a slot is a
  quaver. `RSTOMP_VOCABULARY` names the written note; the slot count is
  resolved per level. A value that doesn't land on the grid (a dotted crotchet
  on a crotchet grid) is dropped, never rounded.
- **Note boundaries are explicit** — `rstompSpecBars` is the source of truth and
  the beat stream is derived from it. This is what makes within-bar ties and
  the long-hand device below expressible at all; beats alone can't tell a whole
  note from two tied half notes.
- **The equivalency scaffold ("the long way") is a rite of passage, and it
  comes down.** One written note spelled out as tied notes of the generation
  below, so the student sees the two are the same length. A minim is the short
  way; two tied crotchets are the long way. Rob: *"that is the point."*
  - A level **landing a new note value** spells that value out — *every* way it
    can be spelled — and once the student can see the equivalence the scaffold
    is withdrawn. Rob: *"As soon as they can see that, we don't have to show it
    to them anymore. They just need to pass that round. It's a level test of
    equivalency."* It is **not** a permanent 10% garnish through every level.
  - **The counting does not always match, and that is information.** Crotchet
    tied to minim reads `1 (2 3)`, exactly as the dotted minim it demonstrates.
    Minim tied to crotchet, and three tied crotchets, read `1 (2) (3)` — more
    written notes, so more groups. Both belong in the scaffold round: the first
    teaches that they are the same, the second teaches that the counting shows
    you which spelling you are looking at.
  - **One generation at a time, measured by VALUE not by count.** Pieces may be
    the target's own base value or the one immediately below. A dotted minim may
    be three tied crotchets (Rob's *"ludicrous mode"*); a semibreve may be two
    tied minims but **never four tied crotchets** — two generations down.
  - **It scales to every grid**, which is why it lives on the slot model rather
    than in a table. Two semiquavers make a quaver for the same reason two
    crotchets make a minim. Rob: *"All of this equivalency has to scale down
    into subdivision."*
  - Levels opt in with `spellOut` (which values to spell out) and
    `longhandChance`. At most one note per phrase, never a note already tied
    into. Parked: an **equivalency bonus round** where it goes deliberately
    silly and lots of things get tied together.

## The counting voice is PITCHED BY BEAT — Rob's rule
The placeholder voice sounds a scale degree, and the degree says **which beat
of the bar you are in**, not which syllable it is:

| Beat | Degree |
|---|---|
| everything in beat 1 | **tonic** |
| everything in beat 2 | **supertonic** |
| everything in beat 3 | **mediant** |
| everything in beat 4 | **subdominant** |

**A subdivision keeps its beat's pitch.** The "and" of 3 sounds the mediant,
exactly like the 3 it belongs to — so the ear is told where in the bar it is
before the counting is read. In 4/4 that is the major tetrachord Rob heard and
named; 6/8 counted in six simply runs on up the scale to the submediant.

The pitch used to be keyed off the SYLLABLE, which put `e + a` in a register of
their own and said nothing about position in the bar. Rob's rule replaces it.
`RAUDIO_DEGREE_HZ` holds the scale; the beat travels on the accent map, so the
audio and the page still come from the same groups.

Three things carry information in the placeholder, and they are deliberately
separate: **pitch** = which beat · **timbre** (square vs sine) = beat itself or
subdivision · **loudness** = struck vs held/rested.

**Open, for when the real voice lands:** a recorded syllable has its own pitch,
so playing recordings alone would throw this away. Either keep a pitched layer
under the voice or accept losing it — ask Rob.

## Level sequence — to sixteenth notes
Designed against the standard reading and drum methods so a student who opens a
band book finds themselves somewhere recognisable. Full table with what each
level teaches: design brief **§13**. Do not invent a level order from the code.

| Stage | Labels | Levels |
|---|---|---|
| **A — sustain and the bracket** | `1 2 3 4` | **BUILT, 9 levels** — see below |
| **B — the quaver** | `1 + 2 + 3 + 4 +` | **BUILT, 10 levels** — see below |
| **C — 6/8 simple** | `1 2 3 4 5 6` | **BUILT, 2 levels** — see below |
| **D — the semiquaver** | `1 e + a …` | four 16ths · mixed · patterns 1–2 · dotted 8th+16th · reversed · syncopation · review |

### Stage A — built, nine levels, brief §13.4
| # | Level | New idea |
|---|---|---|
| A1 | Whole notes and rests | The bar, the beat numbers, **the bracket**. Exactly two possible bars. |
| A2 | Half notes and rests | Two events in a bar |
| A3 | Whole and half mixed | Switching scale inside a bar |
| A4 | **Quarter notes and rests — the full map** | The beat itself, in every position. 15 bar shapes; **7 do not start on a struck beat 1** |
| A5 | Quarters, halves, wholes | Full crotchet vocabulary; long-hand sprinkled |
| A6 | **Syncopation** | Crotchet / minim / crotchet — `1 2 (3) 4`. The minim stays a minim: Rob's named exception to hiding beat 3 |
| A7 | **Ties inside the bar** | The long-hand drill; the level test of equivalency |
| A8 | Dotted half in normal notation | The shortcut A7 revealed; scaffold down |
| A9 | Ties across the barline | Any value crossing |

**It opens on whole notes, NOT the quarter note.** An earlier version of this
file said the opposite; brief §13.1 records that as a reversal, for two reasons:

- **The canon is percussion-shaped.** Drum and band methods open on the quarter
  note because for a drummer one strike per beat *is* the pulse. These are wind
  and string players, for whom four quarters is four separate attacks and a
  whole note is one sustained sound — which is both physically easier and what a
  beginner should be doing anyway.
- **A bar of whole notes and whole rests has exactly two shapes**, `1 (2 3 4)`
  and `(1 2 3 4)`. That is the most constrained place the bracket can be
  introduced, and the contrast teaches the rule everything rests on: the onset
  digit sits **outside** the bracket for a note and **inside** it for a rest.

Stage A runs to nine because it has three values to introduce before the stage
template (§13.3) can start. Every later stage repeats that six-step arc: the new
value isolated · mixed · ties inside the bar · the dotted form · syncopation ·
ties across the barline.

Anacrusis (after B3), accent (after B5) and Mystery Rhythms are slotted through
existing levels rather than given levels of their own. **The anacrusis is the
biggest content hole** — every generated phrase still starts on beat 1, and a
pick-up is the sharpest test of where beat 1 is.

### Stage B — built, ten levels, brief §13.6
**Ten, not six.** An earlier version of this table said six; §13.6 is the later
revision and carries Rob's own instruction — *"I think we need to develop a
whole series around that area and spend some time there."* Stage B is the
centre of gravity of the whole pillar.

| # | Level | New idea |
|---|---|---|
| B1 | Paired quavers | **The beat divides** |
| B2 | Quavers and longer notes | Divided beats among sustained ones |
| B3 | Single quaver + quaver rest | An odd number of quavers in a beat |
| B4 | Ties inside the bar | The long-hand drill, one generation down |
| B5 | **The Pump** | Dotted crotchet + quaver, on the downbeat |
| B6 | **The Pumps I** | The five positions that fit inside a bar |
| B7 | **The Pumps II** | The three that cross the barline |
| B8 | **Syncopation I** | Quaver / crotchet / quaver, every position |
| B9 | **Syncopation II** | The figure anywhere, pumps in the vocabulary |
| B10 | Review | Ties over every barline |

### Figure displacement is a MECHANIC, not four hand-built levels
A level names a figure and which positions to use; the generator walks it
through the grid and **splits any note that runs over a barline into a tie**.
The pumps split into B6/B7 for exactly that reason — five positions fit inside
a bar, three do not. **A new named figure costs one line of config.**

The pump is a dotted crotchet then a quaver: two onsets, always three quavers
apart. **Even positions are DOWN–up, odd positions are up–DOWN** — the gap
never changes, only whether each onset lands on a beat. Rob: *"in order to find
an upbeat, you have to know exactly where the downbeat is."*

### Phrase length is per level — keep the typing burden flat
Stage A is 4 bars (16 slots), Stage B is 2 bars (16 slots). Four bars of
semiquavers would be 64 slots, unreadable on a phone and brutal against an
all-or-nothing gate. Set `bars` on the level; brief §13.10 has the table.

### The tutorial's counting is TYPED OUT, one label per answer
It used to wait for a note's whole group to be answered before any of it
appeared, on the reasoning that half a group would put an unfinished bracket on
screen. On Level 1 that means a semibreve's `1 (2 3 4)` lands in one lump on the
fourth tap and nothing happens on the first three. Rob, playing it: *"counting
not being produced as typed; only when you get to beat 4 does it all show."*

`buildRstompCountingTokens()` now takes the answered **prefix**, so a group
still being built shows its opening bracket with no closing one:

```
tap 1  PLAY          1
tap 2  NOTHING NEW   1 (2
tap 3  NOTHING NEW   1 (2 3
tap 4  NOTHING NEW   1 (2 3 4)
```

That is exactly how the keypad already draws a bracket the student has opened
and not yet closed, so the two interfaces still agree on what an unfinished
group looks like.

### The two-button interface is a TUTORIAL ROUND — it refuses a wrong tap
Rob's instruction: *"let's make this a tutorial round. Alert them when they've
made a mistake and suggest the correct answer after repeated mistakes. Every
problem is an opportunity."*

`stampRstomp()` now checks the answer against `rstompExpectedAnswer()` **at the
tap** on non-scribe levels. A wrong tap is **refused** — not recorded, the
cursor does not move — so a student cannot walk four bars away from a mistake
made on beat 2, and the counting on screen never shows something they didn't
mean.

- **First miss on a count:** `walk-wrong` says only that it's wrong. Finding it
  yourself is the skill.
- **Second miss and every one after:** `walk-hint` names the button *and says
  why*, from the slot's own mode — `play` → "a new note starts on this count",
  `hold` → "the note before is still ringing through this count", `rest` →
  "this count is silent". Being stuck with no way forward teaches nothing.
  `rstompWalkHint()` is the one place that wording lives.

**It closes an open question.** The old worry was that a wrong "PLAY" on beat 3
of a semibreve still drew *inside* the bracket, because the grouping comes from
the written note and only the first beat's answer decides plain-vs-bracketed —
so the page showed something the student had not said. A refused tap is never
drawn, so the display and the answer can no longer disagree.

**There is no three-strike ladder here any more, and it isn't needed.** The
ladder on the keypad exists so the student can hunt for their own mistake — one
strike says how many bars are wrong, the next names them, the third reveals.
None of that applies once the mistake is caught and explained at the tap that
made it: there is nothing left to hunt for. `handleRstompFailure()` is gone;
`handleRstompWalkMisses()` replaces it.

**So the rule of three measures the only thing left to measure: three walks in
a row that needed NO correction.** `rstompWalkMisses` counts the wrong taps at
each position; a finished walk with any of them completes correctly (it had to)
but resets the streak. That is stricter than the old ladder on paper and has to
be — the in-the-moment help is the concession, and if the streak survived it too
the gate would confirm nothing. If Rob wants it softer, this is the one line to
change.

### "Hear it" moves a PLAYHEAD and scrolls the strip
Rob: *"when we click 'Hear it' the music cursor should follow along and the
notation should scroll if needed, particularly in portrait mode."* Measured on a
390px phone: a Level 4 phrase is **560px of music in a 376px window**, so
playback used to run four bars past a student looking at one and a half, with
nothing saying which sound belonged to which note. Connecting the sound to the
notation is the whole point of the button, and that was exactly what was
missing.

- **It is not the caret.** The caret is where the student is *writing* and must
  not move while they listen, so the playhead is its own element in its own
  colour (gold against the caret's teal) and sits behind the caret in the stack.
  Verified: listening leaves `rstompCursor` untouched.
- **The clock is the AUDIO clock.** `rstompAudioPlayhead()` returns the current
  slot as a fraction — `(ctx.currentTime - start - offset) / slotSec` — read
  every animation frame. Page time drifts against the sound inside a single
  phrase, which is the whole reason `rhythm-audio.js` exists, and a CSS
  transition on top of it would lag the sound, so the playhead has none.
- **`rstompAudioTiming()` is the one place the count-in and the slot length are
  derived.** The event list and the playhead both read it. A playhead that
  computed its own count-in would sit a whole bar out the first time a level
  changed meter.
- **It lands on the note by construction**, because it rides `pulseX` — the same
  slot grid the noteheads are moved onto (see "Notes sit ON the slot grid").
  Measured at L1/L4/L10/L15/L24: the playhead-to-notehead gap is the documented
  constant **12px inset**, on every onset of every level, and nothing more.
- **Scrolling anchors further left than the writing cursor does** (band 5%–60%,
  anchor 20%): someone reading along needs the bar *ahead* of the sound, not the
  one behind it. Stopping restores the view to the writing cursor, unless the
  student had scrolled away on purpose.

### The two buttons SOUND like what they mean — snare and brush
Rob, playing Level 4: *"When I press Play it would be nice to hear a sound like
a snare drum. And when it says Nothing New? Just a whisper, like a brush sound
from drums. Shhh. Swish."* Then the whole level, spoken as drums: *"Swish,
crack, crack, swish, swish, swish, crack."*

It is not decoration. **A crack is an onset and a swish is sustain**, which is
exactly the distinction the two buttons ask about — so the student hears the
answer they just gave in the same terms the notation uses, and the level starts
to sound like the thing it is teaching.

**They are NOT the phrase's snare at a different volume, and the first version's
mistake was assuming they could be.** The snare inside a phrase is mixed to sit
*in* a phrase, against a click and a backing loop. A button sounds alone, on a
phone speaker, and is over in a tenth of a second. The first cut reused the
phrase snare and set the brush at 0.16; measured output was **0.35 peak for the
crack and 0.12 for the swish, and Rob could not hear either** — *"I'm not
getting any sound for Play or Nothing New… if it's there maybe you got to turn
it up."* They were firing the whole time. A short noise burst reads far quieter
than a sustained tone at the same peak, because loudness is energy over time,
so peak-matching the existing `playSound` tones was never going to be enough.

Now `raudioTapSnare()` and `raudioBrush()`, built for the job: **0.60 and 0.30
peak**, roughly 2.4× louder, and still clear of clipping at **0.84 with a whole
phrase playing underneath**.

- The **crack** is body + a snap layer on top to cut through a phone speaker +
  just enough pitched thump to say "drum" rather than "click".
- The **swish** is air, not skin: no pitched body at all, a swell rather than an
  attack, and the band **opening upward** through the stroke (1500→4400Hz) —
  that movement is what makes it a brush dragged across the head instead of a
  quiet snare. Measured, the crack carries **16.5dB more energy below 400Hz**
  than the swish, which is the difference you actually hear.

`rstompAudioTap()` plays immediately rather than through the lookahead
scheduler, because a button is not music in time and must not disturb a phrase
that happens to be playing. Two things it has to get right: it books the sound
**20ms out, not 5** (a one-shot booked 5ms ahead can land in a quantum the audio
thread has already rendered, and is then simply missing), and if the context
reads `suspended` it **resumes and then fires** — a context created inside the
very tap that needs it can still be waking up on Android, and `resume()` is
asynchronous, so the first sound of the level was the one most at risk.

**Only a correct tap sounds.** A refused tap gets the wrong-answer tone, not a
drum — the drum is the reward for reading it right.

**THE KEYPAD CARRIES THE SAME TWO SOUNDS, and they cost no new rule.** Rob,
after hearing them work: *"It's so good that I would like it to continue through
the levels. The snare is on anything that is not within a bracket. Anything
within a bracket receives the brush sound. Don't make any noises on the bracket,
only on the things contained within it. Just having that audio reinforcement I
found very comforting."*

That mapping **is** the counting convention: the onset digit sits outside the
bracket, and everything bracketed is held or silent. So "which group did this
digit land in" already answers "crack or swish" — `rstompKey()` asks the group
*after* the press rather than reading `inside` before it, because a digit only
joins a bracket when there is an open bracketed group to join.

- **The brackets are silent.** They are punctuation, not counts. Erase too:
  taking something back is not a beat.
- **The sound follows what the STUDENT wrote, not what is correct** — the keypad
  never validates as you type, which is the whole point of it. Measured: type
  the right answer and the cracks and swishes land exactly where the music's own
  onsets and holds are (10 levels, 173 counts, zero mismatches). Write every
  label bare and it cracks all the way through against music that holds — so
  **the mistake becomes audible** before it is ever graded. That is the same
  principle as making an overlapping token visible: finding your own mistake is
  the skill.

### Restart, not sixteen undos
Rob, hunting a wrong bar on Level 7: *"In order to find them I need to undo… I
guess we have to back through the whole thing, one undo button at a time, or we
should just be able to start. There should be a button there: Restart."*

`restartRstompPhrase()` clears the counting and puts the cursor back on count 1.
It is on both interfaces — Undo and Restart side by side on the two-button row,
Restart under the keypad, which is where he hit it.

**It is the SAME phrase, not a new one**, and it is not a free pass: the attempt
ladder, the streak and the tutorial's miss count all stand. The phrase in front
of them is the one they got wrong; only the typing is thrown away.

### The strip's edge fade DRIFTED INTO THE MIDDLE OF THE MUSIC
Rob on Level 7: *"Something's overlaying the screen… there's a crotchet, a half
note tied to a crotchet, and the three four of that tie is very misty."*

It was not the tie, and it was not an edge effect either — **the first diagnosis
(that it only bleached the right-hand edge) was wrong, and his screenshot is
what disproved it.** The wash was sitting a third of the way across the strip,
nowhere near an edge.

`.rstomp-strip.scrollable::after` was a 24px white gradient to 0.95 opacity,
`position: absolute; right: 0`, meant to hug the visible right edge and say
"there is more music here". But an absolutely positioned child of a **scrolling
container is positioned against the padding box and then scrolls with the
content.** So the band is pinned to one point in the music — `clientWidth` from
the content's left edge — and as the student scrolls it *travels left across the
phrase*, bleaching whatever note it happens to be over. At scroll offset S it
appears at `clientWidth − S`. Rob was at count 13 of 16, so it had drifted onto
his tie; measured in the repro it landed on a tied crotchet, its stem, its tie
curve and its counting digit, all washed to grey with black notes either side.

So it was never "the last thing on screen fades" — **any note could be the misty
one, and which one changed as you scrolled.**

Now an inset `box-shadow` on the strip itself. It says the same thing and cannot
drift, because an inset shadow paints against the border box and does not scroll
with the content; and it darkens the white paper rather than washing the black
ink, so contrast goes **up** where the gradient sent it to nothing.

**The general rule, and this is the second instance: nothing decorative may sit
on top of the notation.** The music and the counting are the content; chrome
goes beside them or behind them, never over them. (The crop window that clipped
tie curves was the same lesson — and on a tie level, an invisible tie is the
whole level.)

### The guide box is GOLD, and Full view is live
Two of Rob's Level 6 notes, both about what the screen is telling him:

- *"Bar 1 — write the counting under the notes… I think it just needs to stand
  out a little bit more. Because it's got to be the guide. That's exactly what
  that rectangle is. It's there with you for the whole game."* It is now gold,
  matching the streak dots — the two things that speak to the student for the
  whole level read as one voice, and nothing else on the screen is gold.
- *"I don't know why Full score is darkened. Full score should be a button that
  looks like it's ready to be pressed, not one that's already been depressed."*
  It was grey-on-grey beside two live teal controls, so it read as disabled.
  Same pill as Hear it and Jump to cursor now.

### The keypad is the level's labels — never hardcode it
`renderRstompKeypad()` builds it from the level's label array: `1 2 3 4` at the
crotchet grid, `1 2 3 4 +` at the quaver grid, plus `e` and `a` at the
semiquaver grid. This was hardcoded to four digits and **made every Stage B
level unplayable by hand** — the student could see the `+` in the answer and
had no key to type it. Automated tests missed it because they called
`rstompKey()` directly; there is now a browser test that clicks real buttons.

### BEAT 3 MUST ALWAYS BE VISIBLE
Rob's engraving rule, and it is about READING, not tidiness: the middle of the
bar is the landmark the eye checks to know where it is, and a note sounding
through it hides the one place a reader looks.

> **A note may cross the middle of the bar only if it STARTS ON A MAIN BEAT.**

**This was tightened once and then reversed. The reversal is what stands.** A
middle version read "only if it starts the bar", which split a minim on beats
2–3 into two tied crotchets and respelled Level 6's figure with it. That was
wrong, and it came from reading Rob's later "whole notes and some
*non-syncopated* half notes" as excluding the beats-2–3 minim. His first
statement is the ruling and it is explicit:

> *"The only time beat 3 can be invisible would be when you have a crotchet
> followed by a half note followed by another crotchet."*

So **`♩ 𝄗 ♩` stands as written** — acceptable and preferable, and **not** to be
turned into `♩ ♩⌣♩ ♩`. Level 6's figure is a minim, and always was.

**MAIN beat, not counted beat.** In 6/8 counted in six the counting names every
quaver, so the counted beat is one slot and *every* note would "start on a beat"
— which would let a crotchet straddle the two dotted-crotchet beats, exactly
what NOTATION_RULES.md §3 forbids. The test is the **beam group**, which is the
felt beat at every grid: a crotchet in 4/4, a dotted crotchet in 6/8. (The
original version of this rule used the counted beat and would have missed 6/8.)

What still splits: a minim from the "and" of 1, a syncopated crotchet from the
"and" of 2, and in 6/8 a crotchet across the two main beats.

**The dotted minim, ruled on and needing no code.** Rob: *"A dotted minim can
start on beat 1 or beat 2. It cannot start on beat 3 or 4. Think about your
question in reverse: if you cannot place a note across the halfway point of a
bar, then how can a dotted half note exist?"* Both starts are on a main beat so
both stand; beats 3 and 4 are impossible anyway, because the bar ends first. The
midpoint rule is about notes that start **off** the main beat — never about a
value that legitimately spans the middle from one.

**The note is not thrown away, it is RE-SPELLED.** Rob: *"my rule would have
that tied across to an eighth."* `rstompShowBeatThree()` splits it at the middle
into tied notes, so the rhythm is untouched and the tie lands exactly on beat 3.
Where one value can't cover a piece, `rstompSpellSpan()` cuts again at the
coarsest metric boundary inside it — a note from the second semiquaver of beat 1
to beat 3 is a dotted quaver tied to a crotchet tied to a semiquaver, not one
impossible note.

Rob's own worked bar, the whole thing syncopated:

```
𝄾  ♩  ♪⌣♪  ♩  ♪        counted  (1) + (2) + (3) + (4) +
```

*"In the olden days they would have just written two crotchets on the upbeat.
But that is very difficult to read."*

**The counting follows for free.** A tie is a new written note, so beat 3 gets
its own bracket instead of being swallowed by the one before it.

**It self-limits to the grids it is for.** Where a slot *is* the main beat —
all of Stage A — every note starts on one, so the test never fires and Stage A
is untouched. Measured, ties per 150 phrases: **A1–A4 zero, A6 zero, A8 zero**;
A5 sits at 3% of bars, which is its long-hand scaffold alone. The rule bites at
the quaver and semiquaver grids, and in 6/8 across the two main beats — the
places a note can start off the main beat at all.

**A level only ever spells the split with values it has taught.**
`rstompLevelValueForSlots()` searches the level's own pool, not the whole value
ladder — and where the pool can't spell the two halves, `rstompCanShowTheMiddle()`
stops the generator producing that note at all rather than reaching for a value
the level hasn't met.

Verified: 0 of 16,000 bars on all 29 levels hide the middle, all 29 levels still
generate 150/150 phrases, and every bar still fills its grid.

### Beaming, stems and bar width
- Notes are beamed **by beat**, from each note's **actual position in the bar**.
  Four quavers in 4/4 are two beamed pairs, not one group of four. Standard
  engraving would *permit* beaming across beats 1–2 and 3–4 (Rob quoted the rule
  in full), but never across the midpoint — so beaming by beat is the stricter
  choice and satisfies it. It is kept because the beam is what makes the beat
  visible before the counting is read. **Open for Rob:** whether to relax it to
  half-bar beams.
- **Don't use `VF.Beam.generateBeams` for this.** It counts its groups from the
  start of each *run* of beamable notes rather than from the bar, so after a
  crotchet or a rest its counter restarts and the next two quavers get beamed
  wherever they happen to sit. Measured at **310 of 2,119 beams joining notes
  from different beats**, and 19 of 40 on the Pump level. A beam across beat 3
  hides the middle of the bar exactly as a note through it does, which is the
  rule above. `renderRstompStaff` now walks the specs and beams runs that share
  a beam group; a note straddling a group boundary is beamed to nothing and
  keeps its flag. Verified: 0 of 2,079.
- **Stems are forced up.** On a one-line rhythm staff VexFlow sends them down,
  which puts the beam in the same space as the counting row.
- Bar width is **per slot**, not per bar — a quaver-grid bar holds twice the
  events and needs twice the room.

### Notes sit ON the slot grid — VexFlow's own spacing is wrong here
VexFlow spaces notes proportionally by duration (a softmax curve). That is
right for engraved music and wrong for this staff, which is read against a
counting row that is an even grid and a caret that marks a SLOT. Left to
VexFlow the two disagree: measured across 30 phrases a level, the caret sat
up to **38px** from the notehead it was marking at Stage A, **49px** at the
quaver grid and **88px** at the semiquaver grid — more than three slots, so
the caret was pointing at the wrong note while the student wrote. This is
what "can't write the quaver counting accurately" turned out to be.
`renderRstompStaff` now formats as usual and then moves every note onto its
own slot (one uniform inset, so no notehead sits flush against a barline),
which makes `noteX` and `pulseX` agree by construction rather than by
nudging afterwards. Residual offset: a constant 12px on every level.

The justify width was wrong too — a flat `perBarWidth - 60`, about 28% short
of the stave's real note area, which bunched every bar's notes into its
left-hand two thirds and left a band of white space before each barline. It
is now the note area itself (`getNoteEndX() - getNoteStartX() - 10`).

### The counting row's alignment rule is "IS THERE A GLYPH ABOVE THIS TOKEN?"
Not "is it a bracket?" — the comment above `renderRstompCountingRow` has said
so all along, but the code asked `run.bracketed && !owner.isOnset`. So an
**unbracketed** digit written on a held slot fell through to rule 1 and was
drawn at the notehead of the note holding through it — **exactly on top of
that note's own onset digit, pixel for pixel** (measured: both at x 89.8 on
Level 10).

It cost a Stage B level. Writing a bare `3` on the held half of a crotchet
made the `3` vanish under the `2`, so every label after it was one position
out of step with what the student meant, and the level looked like it was
mis-tracking the grid. It is a real mistake and still marks wrong — it just
has to be **visible**, because finding your own mistake is the skill this
interface is built around. The test is now `!owner.isOnset` alone. Swept
every scribe level, 25 phrases each, correct answer and all-bare-labels
wrong answer: zero overlap anywhere.

**A CENTRED REST TAKES THE SAME RULE, and this was a second stack.** A
whole-bar rest in 6/8 hangs in the middle of the bar and belongs to every slot,
so no single slot has a glyph over it — but it had a branch of its own that drew
the token at the bar's centre. Right for the one run that *is* the whole bar;
wrong for every other, because they all landed on that same point. A student
writing six separate labels in a 6/8 whole-rest bar got **five of them stacked
on one pixel** (measured at x 517.5, C1 and C2). Anchoring the onset token at
`noteX` instead is no better — a centred rest's `noteX` *is* the bar centre, so
the token sits three slots away from the label it is. The span rule handles
both: for a run covering the whole bar it gives exactly the old centred
position, and for anything shorter it spreads across the slots written. Swept
all 25 scribe levels, correct answer and all-bare-labels wrong answer: zero
overlap anywhere.

**AND THE QUESTION IS ASKED PER LABEL, NOT PER GROUP.** Rob, seeing a rest
run's counting bunched into a huddle: *"Notes within the brackets under rests
should be distributed under the rest and not grouped together, as shown in both
the portrait mode and the full screen mode."*

A group was drawn as **one token** centred across its whole span, so a bar of a
crotchet then three crotchet rests put `(2 3 4)` in a single lump over the first
rest instead of a number over each one. Three rests, three glyphs, one huddle.

`rstompLabelAnchor()` now asks the same two questions of each label separately,
and the brackets are glued to the first and last label of the group rather than
being tokens of their own. **It needed no new rule** — the two rules were always
about a single count:

1. a glyph above this count → left-align to it (`noteX`);
2. no glyph → nothing to align to, so sit in the middle of the slot the count
   names, which is where *"the numbers need to breathe"* was always pointing.

A run of rests now takes rule 1 on **every** label, because every written rest
is its own glyph. A held note's tail still takes rule 2 and spreads across the
beats it holds instead of clumping at their midpoint. A centred whole-bar rest
has no glyph over any one count, so all its labels take rule 2 and spread across
the bar. Measured: the labels inside a bracket now sit **one slot apart**
(32.6px and 36.9px against a 33.8px slot), and the token-overlap sweep is still
zero on all 25 scribe levels, right answer and wrong.

It also collapsed the two render branches into one shared helper, so the
tutorial and the keypad can no longer drift apart on where a number goes.

**A crotchet at the quaver grid is `2 (+)`.** Onset outside, held slot
bracketed — the same rule as `1 (2 3 4)` for a semibreve, one generation
down. B1 is the first level where a crotchet stops being one slot, so it is
the first place this bites. Dropping the held slot would break one-key-
per-slot typing and make B3 (single quaver + quaver rest) unwritable.

### The staff's crop window has to clear the TIE, not the noteheads
The 130px VexFlow canvas is cropped back to the band the music occupies. That
crop used to be a fixed `-30px` against a 60px window — visible to canvas
y=90. But a tie curve reaches **y=93** and a crotchet rest **y=100.5**, so
ties rendered as clipped stubs and rests lost their tails. On **Level 7
("ties inside the bar") an invisible tie is the whole level**: the student
reads two separate crotchets, writes `1 2` where the answer is `1 (2)`, and
is told the bar is wrong with counting that looks right to them. The window
is now y=40 to y=105 (`RSTOMP_STAFF_CROP_TOP` / `_HEIGHT`), stated as
constants rather than measured per render so the strip's height never
changes under the student mid-phrase.

The grader itself was checked at the same time and is sound: 300 Level 7
phrases typed with the engine's own answer all graded clean, and every bar
shape the level generates reproduces Rob's worked-examples table.

### Audited against the standard grouping rules — 2/4, 3/4, 6/8
Rob supplied the full conventions (ABRSM/Trinity, classical engraving practice)
and asked how we stack up. Measured over 3,200 generated bars:

| Rule | Us |
|---|---|
| Never beam across a barline | structurally impossible — one voice per bar |
| Beams never cross a beat group | 0 of ~2,000 |
| Beam starts on a beat, unless preceded by a rest or dotted note | 0 faulty starts. Every off-beat start has its group's downbeat already taken by a rest or a held note, which the standard allows |
| 16ths grouped by the beat, max one beat per beam | 0 over-long beams |
| 6/8 beamed in two groups of three, never six, never pairs | 0 six-note beams; `beamSlots: 3` on C1/C2 |
| 3/4 never beamed 3+3 | would beam in pairs (`beamSlots` = the beat) — correct |
| 2/4 quavers in pairs; all four together is *permitted*, not required | we beam in pairs |
| 4/4 beams across beats 1–2 *permitted*, not required | we beam by beat — stricter, and satisfies it |

**One real fault, and it was in a meter we don't ship yet.** The midpoint rule
was keyed to "the half-bar is a metric level", which is true in 3/4 as well —
so three plain crotchets in 3/4 came out as `q 8 8~ q`. The middle of a 3/4 bar
falls in the **middle of beat 2** and is no landmark at all. `rstompMiddleOfBar()`
now requires the midpoint to be a **main beat** (a beam-group boundary) *and*
each half to hold **more than one beat**. That keeps 4/4 and 6/8 exactly as they
were, drops 3/4 (no half-bar landmark) and drops 2/4 (each half is a single
beat, so `♪ ♩ ♪` is how anyone would write it, and Rob's 2/4 section gives no
note-tying rule).

6/8 was checked the other way too: a crotchet straddling the two
dotted-crotchet beats **is** split, which is Rob's own 6/8 line — *"longer
undotted notes that cross a main beat are usually rewritten with ties."*

**Known and accepted:** the equivalency scaffold beams tied notes together
inside a beat (two tied quavers spelling a crotchet). Strict engraving would
just write the crotchet — the scaffold breaks that deliberately, to show the
long way. See "the equivalency scaffold".

### Stage C — built, two levels, brief §13.7
| # | Level | New idea |
|---|---|---|
| C1 | Six-eight counted in six | *Sometimes the quaver gets the beat* |
| C2 | Dotted crotchets and ties | Grouping in threes |

**Simple-time 6/8 comes before semiquavers**, with the quaver as the smallest
value — Rob's decision. It returns after them as **Stage E**, relabelled
`1 + a 2 + a` and counted in two at speed. Same six-slot grid, different labels.

### THE BEAT IS NOT ALWAYS THE BEAM GROUP
In 6/8 counted in six the counting names every quaver, so the beat is one slot
— but quavers are still **beamed in threes**, because the dotted-crotchet pulse
is what the eye reads. Every level before Stage C had the two identical, so
beaming was derived from the beat. Levels now declare `beamSlots`, and only
compound ones need to.

### A bar's METRIC LEVELS, and why they are not always powers of two
`rstompMetricLevels()` halves where it can and thirds where it cannot:

| Grid | Levels |
|---|---|
| 4/4, crotchet slots | 4 · 2 · 1 |
| 4/4, quaver slots | 8 · 4 · 2 · 1 |
| **6/8** | **6 · 3 · 1** — not 6·3·2·1 |
| semiquaver grid | 16 · 8 · 4 · 2 · 1 |

### Engraving rules for rests — notes are not bound by them
- **An all-rest bar is written as one whole rest**, never as smaller rests added
  up. This is what forbids two half rests filling a bar, and a bar of four
  quarter rests.
- **A rest never straddles a coarser metric boundary.** A half rest may cover
  beats 1–2 or 3–4, never 2–3. Stated against the bar's metric levels, not as
  "a multiple of its own length" — the two agree on every binary grid, but the
  old wording was **wrong in compound time**: it allowed a crotchet rest across
  quavers 3–4 of a 6/8 bar, straddling the two groups.
- **Notes are not restricted the same way, but they are not free either.**
  Within each half of the bar a note may sit where it likes — a minim across
  beats 1–2 or 3–4 needs no justification, and Rob confirmed a minim on beats
  3–4 stays a minim. But **nothing may hide the middle of the bar unless it
  starts on a main beat**: see "BEAT 3 MUST ALWAYS BE VISIBLE". A6's minim on
  beats 2–3 is the named exception and stands as written.
- **Two rests never share a beat** when one rest could say it. Three quaver
  rests in a row is not how anyone writes a bar — the two filling beat 4 are a
  crotchet rest. Rob, seeing it on Level 12: *"we would never see music written
  that way."* It was in **13.3% of L12's bars** and up to 15.5% at L17.
  Forced only where the combined rest would itself be legal, so two semiquaver
  rests straddling the middle of a beat stay as two (a quaver rest there would
  cross the half-beat), and scoped to **one beat, never wider** — crotchet
  rests on beats 3 and 4 stay two rests rather than collapsing into a half
  rest, which is what the worked example below needs. Stage A and Stage C are
  untouched: their slot *is* their beat, so two adjacent rests are never inside
  one. `rstompRestsMustCombine()`.
- Rests in a bar that also holds a note are **written** one bracket each —
  Rob's own `(1 2) (3) (4)` is a half rest followed by two quarter rests — but
  a merged bracket is equally correct, see "CONSECUTIVE RESTS MAY SHARE ONE
  BRACKET".

### One engraving rule was mislabelled — check before reusing it
The generator used to reject two **adjacent** half notes in a bar, citing the
design brief as engraving. The brief's rule is narrower: never **tie** two half
notes in a bar, write a whole note instead. Two separately struck half notes,
on beats 1 and 3, are ordinary notation and a different rhythm from a whole
note.

Behaviour is unchanged — the exclusion is now declared per level as
`avoidRepeats: ['half-note']` and treated as level design, not engraving — but
it is deliberately **not** generalised. The metric version of it ("two equal
notes where one longer note would do") would throw out a pair of quavers on
beat 1, which is most of Stage B.

**Open question for Rob:** on Level 2 this means a level called "Half Notes and
Rests" never shows two half notes in one bar — every bar is note+rest or
rest+note. Two shapes total. Intended, or a side effect worth removing?

### The shape walk must shuffle a LOCAL copy
`rstompPickUnitShape()` walks the bar trying the vocabulary in a random order.
It used to re-shuffle **one shared array** at every step, so a deeper call
reordered the array an outer loop was still iterating — units got skipped or
tried twice and the walk was not exhaustive. It failed to fill a bar about
**once in ten thousand** tries: rare enough to look like nothing, often enough
to fail a single assertion in an 8,700-shape test run. Tightening the rest
rules made dead ends more common and brought it out. Each call now shuffles its
own copy; 87,000 shapes across all 29 levels, no failures.

### VexFlow does not draw dots from the duration string — attach them by hand
`new VF.StaveNote({ duration: 'hd' })` gives the note the right **ticks** (the
bar fills, no error is raised) but renders **no dot** — a dotted minim comes out
looking exactly like a plain minim. `note.addDotToAll()` has to be called when
`note.dots` is set. This is done in `renderRstompStaff`; anywhere else that
builds a StaveNote from a dotted value needs the same line. Nothing shipping
used a dotted value, so this was silent until the equivalency scaffold rendered
one.

## A ROUND IS EITHER SCAFFOLDING OR AT STANDARD
Rob's governing distinction. It settles most arguments before they start:

> *"If it's a scaffolding round and a half note is tied to a quarter and there
> is a dotted half, well that's scaffolding. But in an at-standard round we use
> no scaffolding and only standards."*

- A **scaffolding round** may break the standard where the break *is* the
  teaching. A level opts in with `spellOut` / `longhandChance`. A7 is one.
- An **at-standard round** uses the standard and nothing else — no long way, no
  demonstration ties. A8 is one, and that is why it must stay tie-free.

"Is this notation correct?" is the wrong question on its own. Ask *which kind of
round is this*, then apply the standard or the scaffold.

## Every on-screen prompt has a NAME, and a level can override it
Rob's request, because the scaffolding changes level by level and the wording
has to change with it: *"Could we find every instance of that text box and give
it a name and then I can fill in alternate text? Then I could teach through the
rules for the level."*

`RSTOMP_PROMPTS` holds the defaults; `rstompPrompt(name, vars)` resolves a
level's own wording first and fills in `{braces}` at display time. A level
overrides any line by name:

```js
{ id: '7', ..., prompts: { 'write-bar': 'Bar {bar} — two tied crotchets ARE a
                                         minim. Count what you SEE.' } }
```

The names, and the variables each one can use:

| name | where it shows | variables |
|---|---|---|
| `write-bar` | the standing instruction while writing a bar | `{bar}` |
| `bracket-open` | while a bracket is open and unclosed | |
| `all-written` | every bar written, submit is live | `{bars}` |
| `revealed` | the answer is on screen after the third strike | |
| `walk-beat` | the two-button tutorial's per-beat question | `{bar}` `{label}` |
| `walk-done` | two-button, all beats answered | |
| `nailed` | the phrase graded clean | `{points}` |
| `miss-one` | first strike, exactly one bar wrong | |
| `miss-some` | first strike, several bars wrong | `{n}` |
| `name-one` | second strike, naming the one wrong bar | `{bar}` |
| `name-some` | second strike, naming the wrong bars | `{bars}` |
| `show-answer` | third strike, the answer revealed | |
| `walk-wrong` | two-button, first wrong tap on a count | |
| `walk-hint` | two-button, a repeat wrong tap on the same count | `{answer}` `{because}` |
| `walk-missed` | two-button, the walk finished but needed help | `{n}` |

**The defaults are placeholders and Rob will replace them. The names are the
contract** — don't rename one without updating any level that overrides it, and
don't add on-screen teaching copy as a bare string.

## Naming conventions (don't drift from these)
The brand verb is **"Smash"** — every game name uses it (Staff Smash, Note Smash, Real Smash, and "Value Smash", a working title). Don't introduce a differently-themed name (e.g. "Quest", "Sprint" as a title) for a new mode without checking first — this was deliberately corrected once already (Real Smash was originally "NoteQuest").

**Note names: US first, UK in brackets.** Rob, 2026-09-23: on screen it is "whole note (semibreve)", and a setting switches to US-only or UK-only. This lives in the language files (`en-US` / `en-GB`), never in code. The design notes in this file keep saying "crotchet" and "minim"; that is working shorthand, not on-screen copy.

**Bonus rounds are "Maestro" bonuses** (the equivalency bonus was once called "Ludicrous"; Rob: that's Tesla's).

## Core mechanics (apply consistently to any new content)
- **Rule of three:** three correct in a row confirms real mastery, not a lucky guess. Used everywhere as the advancement gate.
- **Duds:** a round with zero valid targets present is a fair, neutral pass — costs time, doesn't break or advance a streak. A correctly-handled dud also counts as a streak "joker."
- **Scoring:** only correct taps score points; wrong taps or missed targets cost time, never points. Score totals shown to the player are always whole numbers (decimals are fine internally for time bonuses).
- **Sequential unlocking:** each game's stage list is gated in order (e.g. Staff Smash: Lines → Spaces → Mixed → Staff Numbers → Ledger Bonus, with Ledger Bonus gated behind Staff Numbers clearing — this is intentional, not accidental).

## Persistence pattern (already implemented — follow this shape for anything new)
Each game keeps its own localStorage key (`koolRiffsG1Progress`, `koolRiffsG2Progress`, `koolRiffsG3Progress`) storing per-device unlocked stages, best score/time per stage, resume position, and total plays. This is real browser storage on a real deployed site — no sandbox restriction applies here. On relaunch, route to the pathway screen at the saved resume position, not back to the dashboard.

**Progress stays on the device** until networking is designed once, for the whole app (Rob: *"until we wrap this whole thing up in an umbrella"*). One addition Rob approved for shared school iPads and Chromebooks: a **local player picker**, a list of names on the device with no passwords and no network, so that each student's progress is their own. It arrives with Value Smash.

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

## FLAG THE PREREQUISITE LEAP
Rob's rule, after his son Garnet — who teaches students who *"do not want to
learn"* — played Rhythm Stomp Lab for a moment and said *"nah, what I need is a
step before this."* Note Smash had been a success with the same kids.

> *"Any time we've made a leap from one game to the next has assumed a certain
> amount of prerequisite logic and knowledge. Then we need to flag that and make
> sure we are moving incrementally."*

So when a new game or stage is added, the question is not only "is this the next
thing in the syllabus?" but **"what does this assume the student already
knows, and where did they get it?"** If the answer is "nowhere in the app", that
is a hole and it gets written down rather than stepped over.

**The one currently known: note-value equivalency, now DESIGNED as Value
Smash.** The Rhythm pillar assumes the student knows what each note is *worth*,
and nothing in the app teaches it yet. Rob approved the design on 2026-09-23;
the brief is `kool-riffs-docs/docs/value-smash-design-brief.md`, and the
original idea is `ideas/equivalency-note-tree.md`. Not built yet. The short
version is below, under "THE APP IS LEVELS ACROSS PILLARS".

`ideas/README.md` is how an idea like that gets built without disturbing work
already in flight: the idea file on main, the build on `idea/<name>`, a fresh
session per branch, and a merge bar that includes "played on a phone" and "its
CLAUDE.md section is written."

## THE APP IS LEVELS ACROSS PILLARS
Rob's structure, 2026-09-23. **It is bigger than any one game and is not built
yet.** Every new game is designed so that it slots into it.

- **Value is a pillar.** *"A music note does two things. It tells us the pitch…
  and it tells you its value. Then we combine it together to make rhythm."* The
  pillars are now **Notation (pitch) · Value · Rhythm · Key Signatures ·
  Intervals**, possibly more later (Rob's childhood flash cards also covered
  terminology).
- **Each pillar is a building, and each level inside it is a floor** (Stomp
  Lab's A1 is a floor). **An app-wide Level is a band of floors taken across
  every pillar**, so Level 1 is the introductory floors of all the pillars
  together. *"Don't make them start from a beginner in one pillar and force them
  to become an expert, then move to the next one."* Which floors make which
  Level is still to be worked out with Rob.
- **The Artistic License.** Clearing Value Smash's first part awards it, and it
  opens Rhythm Stomp Lab: *"You can't even get to Rhythm Stomp unless you can
  smash some note values."* Later Stomp Lab stages each open with the Value part
  they depend on. **Never re-lock a Stomp Lab level a student has already
  unlocked.**
- **Values first, time signatures last.** Every note value is given in common
  time from the first screen (*"it takes up the whole bar and it commonly
  receives four beats"*, as in Rubank), but the *meaning* of time signatures
  waits until all values and equivalencies are done. **Simple time (4/4, 2/4,
  3/4) and compound time (the 8 on the bottom) are taught separately**, simple
  first. The 2/4 against 6/8-in-two comparison comes when 6/8 speeds up (Stomp
  Lab's Stage E).
- **The note tree is the help menu**, and the student builds it themselves. Once
  a time signature is on screen, the tree labels each note with its beats in
  that signature.

### Riff and Tango: the coaches in the gold box
Rob's two characters, created in 1997; he owns them, and they will be redrawn.
**Riff** is a jazz Scottie dog (grey, red beret, green vest, white beard) with a
**hip, gruff** voice, and he handles **pitch**: the Notation games. **Tango** is
a cat who walks on two legs, with an **orange-red** spiky tuft and ponytail and
blue overalls. She is a drummer, with a **high, tight, squeaky** voice, and she
handles **rhythm**: Value Smash and Stomp Lab. *"Together rhythm and pitch make
melody, and that's music."*

- **Coaches, not a universe.** Rob: *"a baby bit of a backstory that allows them
  to keep coaching us through… teaching us to read music and encouraging us to
  try more and telling us what the rules to the games are… This is a
  memorising, glorified flashcards is what we're making."* No world map, no
  quest. The town map and the name "Jam City" are **parked**.
- **They speak in the gold guide box.** The gold box is already the voice that
  is *"there with you for the whole game"* (see "The guide box is GOLD"). It
  becomes their speech bubble in every game. The speaker's portrait sits
  **beside** the box, **never over the notation**. Lines can go back and forth
  between the two of them.
- **Build hooks, not content.** The game fires named events; the content files
  decide who says what (`docs/language-files-plan.md` §2.4). Every line has an
  ID and a speaker.
- **Voices.** Until Rob chooses synthesised voices, the browser's speech reads
  each line with a pitch and rate per speaker. After that, each line is
  generated once and saved as an audio file under its ID.

Reference art (1997 stills and Rob's Gemini "Old Riff" redraw) and the open
items are in the private docs: `kool-riffs-docs/docs/riff-and-tango.md`.

## ADDICTIVE BY DESIGN: the whole app
**This REVERSES the section that used to stand here** ("The constraint that
outranks engagement", which said time at the instrument outranks time in the
app and that no streak may punish a day away from the screen). The reversal is
Rob's, made on 2026-09-23 and applied to the whole app, not just one game:

> *"That has become my overarching mission… the whole Kool Riffs game. This is
> not about long-term companionship with the young musician. It's really to seed
> their initial learning with as much repetition as possible."*
>
> *"It's really a three-to-six-month game in the very first beginning learning
> stages. I don't want to
> minimise any opportunity for addictive gameplay."*

> *"The whole game isn't going to cost practice time. Let's not even put them in
> competition with each other. Let's just leave it completely separate, but yes,
> we can encourage them to practise."*

- **Streaks, daily challenges, stars, combos and collections are all allowed**,
  including a daily streak (with freezes) that resets.
- **"Go and play it on your instrument" lines are dialogue, never a condition.**
  *"Don't let the gameplay be the bargaining chip."* They live in the language
  files, Riff and Tango can say them, and they never lock, gate or reward
  anything.
- **Addictive never means easier.** Every hook still has to pass "only correct
  taps score", and the rule of three and the all-or-nothing gates are untouched.
  A hook that pays off guessing is a bug.

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
Pillars: Notation (three games, done/near-done), **Value** (Value Smash, designed, not built), Rhythm (Stomp Lab, in development), Key Signatures and Intervals (not started), organised into app-wide Levels (see "THE APP IS LEVELS ACROSS PILLARS"). Rob's aim, since his days at Melbourne Grammar: the addictive early-learning companion nobody has built, and the flash-card "level one" of every area of music reading. Near-term goal is a clean prototype to hand to other developers or use for an app-store-style release; Game 3 structural cleanup (item 3 above) and the fixes above are the main blockers to calling the Notation pillar finished.


==============================================================================
# FILE: NOTATION_RULES.md
*The standard engraving conventions as authority, plus the engine's measured standing against them.*
==============================================================================

# Notation Rules — beaming & grouping

**Authority, and how it sits against Rob's own rules.** These are the standard
Western classical engraving conventions (ABRSM/Trinity theory, professional
practice), supplied by Rob as mandatory for the notation engine. Where they meet
one of his own rules, **the standard wins** — in his words:

> *"If A8 is an 'at standard' and not a staged scaffolding, then we observe the
> new standard rules that supersede probably most of my rules. Most of my rules
> are actually the scaffolding tricks and tips to gain the knowledge."*

His rules are the **scaffolding**: the bridging device that gets a student from
unawareness to mastery. They are kept, and they are allowed to break the
standard — but only where that break is the teaching, and only as a **named
exception** recorded here. The standard is the notation; the scaffolding is the
route to reading it.

They are mandatory Read this before touching any beaming or grouping
code. Anything that produces beaming or rest placement violating them is a bug,
not a style preference.

> Never prioritise "looking pretty" or "simplest algorithm" over these rules.

Compliance is measured, not assumed: `notation-compliance.js` checks every rule
below against the real engine. Current standing is recorded at the end of this
file — keep it up to date when the engine changes.

---

## 1. Core principle
Beam and group notes and rests so the **main beats** of the time signature are
visually clear.

- **Simple time** — the beat unit is the undotted note matching the bottom
  number: a crotchet in 2/4, 3/4, 4/4.
- **Compound time** — the beat unit is the dotted note matching the bottom
  number × 3: a dotted crotchet in 6/8, 9/8, 12/8.

## 2. Universal rules
Apply to every time signature.

- Never beam across a barline.
- The first note of any beamed group must start on a beat (or on the start of a
  main compound beat), unless preceded by a rest or a dotted note that completes
  the previous beat.
- Do not mix beams and ties on the same notes.
- When a single note value would cross a beat boundary and hide a main beat,
  split it and use a tie.
- Sixteenth notes and smaller are grouped strictly inside the current beat (or
  main compound beat).
- Rests follow the same grouping logic as notes.

## 3. Per time signature

### 2/4 — simple duple
- Beat unit: crotchet.
- Quavers beam in **pairs** (preferred). A full bar of four **may** share one
  beam.
- Semiquavers: at most four per beam group.
- Never hide the midpoint between beats 1 and 2 with irregular grouping when the
  rhythm is complex.

### 3/4 — simple triple
- Beat unit: crotchet.
- Quavers may beam in pairs, across two beats (4+2 or 2+4), or **all six
  together** when the bar is continuous quavers.
- **Forbidden: never beam as two groups of three (3+3).** That belongs
  exclusively to 6/8.
- Semiquavers: at most four per beam group (one beat).

### 4/4 — simple quadruple
- Beat unit: crotchet.
- The bar has a **strong midpoint between beats 2 and 3**.
- Quavers may beam across beats 1–2 or 3–4 (up to the value of a minim).
  **Never across the midpoint.**
- A single note value straddling the midpoint must be **split and tied** so beat
  3 is visible. Exceptions only for whole notes and certain unambiguous half
  notes starting on beat 1.
- Semiquavers: at most four per beam group.

### 6/8 — compound duple
- Beat unit: dotted crotchet (three quavers). Exactly **two** main beats a bar.
- Quavers **must** beam as **two groups of three**. Never all six. Never three
  pairs of two.
- Semiquavers: at most six per main beat.
- Notes or rests crossing the midpoint between the two main beats must be split
  and tied so the second main beat stays clear.
- Prefer dotted values that equal one full main beat.

## 4. Rests
- **Simple time:** avoid dotted rests for full beats — build the beat from
  smaller rest values.
- **Compound time:** dotted rests for full main beats are preferred and correct.
- Never place a long rest that starts on a weak beat and hides a later strong
  beat.
- A whole-bar rest is **always a centred semibreve rest**, whatever the time
  signature (usual exceptions for very short or very long metres).

## 5. What the engine must do
1. Determine whether the metre is simple or compound.
2. Work out the beat unit and the position of every main beat in the bar.
3. Build beam groups that never cross a main-beat boundary, except where §3
   explicitly allows it.
4. Where a duration would cross a main-beat boundary, split it and insert a tie
   — unless it is one of the rare unambiguous full-bar or half-bar cases.
5. Expose configuration flags **only** for the rare legitimate exceptions
   ("allow continuous quaver beam in 3/4", "allow full-bar quaver beam in 2/4").
   Default behaviour is always the strict classical rules.
6. Tests must cover, at minimum: continuous quavers in 2/4, 3/4, 4/4 and 6/8;
   syncopation crossing the midpoint in 4/4 and 6/8; mixed quaver + semiquaver
   groups; rest groupings that would otherwise hide beats; and the forbidden
   3+3 in 3/4 and all-six / 2+2+2 in 6/8.

## 6. Priority when rules conflict
1. Main-beat visibility
2. Time-signature-specific prohibitions (3/4 vs 6/8; the 4/4 midpoint)
3. Conventional "full-bar continuous quavers" allowances
4. Aesthetic beam angle / stem direction

---

# Where Kool Riffs stands

Measured by `notation-compliance.js` — 20 rules, 4,800 generated bars plus
constructed cases. **18 pass, 2 accepted exceptions, 0 deviations, 0
failures.** No open questions.

Kool Riffs ships **4/4 only** (crotchet, quaver and semiquaver grids) and **6/8
counted in six**. 2/4 and 3/4 are not shipped; they are tested because the
label-array model makes adding a metre cheap, and the engine has to be right
before one is.

## Passing

| § | Rule | Result |
|---|---|---|
| 5.6.1 | continuous quavers 2/4 | beams `2+2` |
| 5.6.1 | continuous quavers 3/4 | beams `2+2+2` |
| 5.6.1 | continuous quavers 4/4 | beams `2+2+2+2` |
| 5.6.1 | continuous quavers 6/8 | beams `3+3` |
| 5.6.5 | 3/4 never beams 3+3 | never |
| 5.6.5 | 6/8 never beams all six | never |
| 5.6.5 | 6/8 never beams 2+2+2 | never |
| 5.6.2 | 4/4 note across the midpoint split and tied | `8 q 8 8~ q 8` |
| 5.6.2 | 6/8 note across the two main beats split and tied | `8 8 8 8~ 8 8` |
| 5.6.2 | 3/4 crotchet on beat 2 left alone | correct — 3/4 has no midpoint |
| 5.6.3 | quaver + two semis beam together inside the beat | 3-note beam |
| 5.6.3 | no beam group crosses a beat | 0 |
| 2 | beam starts on a beat, or its downbeat is taken | 0 loose starts |
| 3 | no note hides the midpoint unless it starts on a main beat | 0 of 4,800 bars |
| 4 | simple time never uses a dotted rest | 0 |
| 4 | no rest starts weak and hides a strong beat | 0 |
| 4 | whole-bar rest in simple time is a semibreve rest | correct |

## Accepted exceptions — ruled on by Rob

### A1. `♩ 𝄗 ♩` may hide beat 3 — ~400 bars of 4,800
§3 protects the midpoint of a 4/4 bar. One figure is exempt, by Rob's explicit
ruling:

> *"The only time beat 3 can be invisible would be when you have a crotchet
> followed by a half note followed by another crotchet."*

It is *"acceptable and preferable, and is not to be changed into quarter quarter
tied to quarter quarter."* The test is **starts on a main beat** — which admits
that figure and nothing else. A minim from the "and" of 1 and a syncopated
crotchet from the "and" of 2 still split and tie.

This was got wrong once. A later write-up listed the exceptions as "whole notes
and some *non-syncopated* half notes", which was read as excluding this minim;
the figure was split and Level 6 respelled. Reversed. **The ruling above wins.**

### A2. Beams and ties are mixed — ~600 beams over 4,800 bars
§2 says don't. We do, in exactly one place and on purpose: **the equivalency
scaffold** writes a crotchet the long way as two tied quavers, and they beam
together inside the beat. Strict engraving would simply write the crotchet.

**Rob's ruling: keep it.** *"The scaffolding we are building are my rules to
help a student get from a position of unawareness to one of mastery… the
bridging device designed to get them to read better. So I'm supporting keeping
them and using them as opportunities for teaching."*

The scaffold is the only source — midpoint splits are never beamed, because the
two halves fall in different beam groups. Any *new* mixing of beams and ties
that is not the scaffold is a bug.

## Resolved: Q1 — notes spanning a beat inside a half-bar
§2 says "when a single note value would cross a beat boundary and hide a main
beat, split it and tie". §3 then qualifies it per metre: in 4/4 only the
midpoint is protected, and a note "up to the value of a minim" may span two
beats inside a half-bar.

**Rob's ruling: §3 is operative.** *"A minim on beats 3–4 should stay a minim —
standard practice writes it that way."* So `𝄼 𝄗` is left as written, and a
minim on beats 1–2 likewise. ~1,770 of 4,800 bars use this, which is most of
Stage A.

## Also resolved

- **Stage A carries no engraving ties at all.** On the crotchet grid every note
  starts on a main beat, so the midpoint rule never fires. Measured ties per 150
  phrases: **A1–A4 zero, A6 zero, A8 zero.** A5 sits at 3% of bars, which is its
  long-hand scaffold alone. A8 is tie-free, as its design intends — the earlier
  note saying it carried ties in 15% of bars was written while the rule was
  wrongly narrowed, and no longer applies.
- **A6's figure is `q h q`,** counted `1 2 (3) 4`, in 300 of 300 phrases. It was
  briefly respelled as `q q q~ q` on the misreading above; reverted.
- **A whole bar of silence is a centred semibreve rest in 6/8** (Rob: *"the
  symbol is no longer acting as a literal four-beat rest; it simply means rest
  for the entire bar"*). The generator still stores the tick-correct value so
  the bar adds up; the renderer borrows the whole-rest glyph and centres it.
  In 4/4 the whole rest is an *ordinary* rest that happens to fill the bar, so
  it stays aligned on beat 1 — Rob's own distinction.

## A ROUND IS EITHER SCAFFOLDING OR AT STANDARD
Rob's governing distinction, and it settles most arguments before they start:

> *"If it's a scaffolding round and a half note is tied to a quarter and there
> is a dotted half, well that's scaffolding. But in an at-standard round we use
> no scaffolding and only standards."*

- A **scaffolding round** may break the standard where the break *is* the
  teaching — the equivalency scaffold writing a crotchet the long way, a minim
  spelled as two tied crotchets so the student can see they are the same length.
  A level opts in with `spellOut` / `longhandChance`.
- An **at-standard round** uses the standard and nothing else. No long way, no
  demonstration ties. A8 is one: the dotted minim written plainly.

So "is this notation correct?" is the wrong question on its own. The right one
is *which kind of round is this*, and then the standard or the scaffold applies.

## Resolved: the dotted minim
> *"A dotted minim can start on beat 1 or beat 2. It cannot start on beat 3 or
> 4. Think about your question in reverse: if you cannot place a note across the
> halfway point of a bar, then how can a dotted half note exist?"*

Decisive, and it needed no code — "starts on a main beat" already permits both,
and the bar's own length forbids the rest:

```
dotted minim on beats 1–3   hd q    stands
dotted minim on beats 2–4   q hd    stands
starting on beat 3 or 4             impossible - the bar ends first
dotted minim from the "and" of 1    SPLIT, as any off-beat crossing is
```

The reasoning generalises: the midpoint rule is about notes that *start off the
main beat*, never about a value that legitimately spans the middle from one.
- **A whole bar of silence is a centred semibreve rest in 6/8** (Rob: *"the
  symbol is no longer acting as a literal four-beat rest; it simply means rest
  for the entire bar"*). The generator still stores the tick-correct value so
  the bar adds up; the renderer borrows the whole-rest glyph and centres it.
  In 4/4 the whole rest is an *ordinary* rest that happens to fill the bar, so
  it stays aligned on beat 1 — Rob's own distinction.

## Not yet applicable
- 9/8 and 12/8 — `rstompMiddleOfBar()` already handles them correctly (12/8 has
  a half-bar landmark, 9/8 does not), but no level uses them.
- 6/8 with semiquavers (max six per main beat) — Stage E is not built.
- §5.5's configuration flags for the legitimate exceptions ("all six together in
  3/4", "all four together in 2/4") — not built, because neither metre ships.


==============================================================================
# FILE: ideas/README.md
*How to develop a new idea on a branch without disturbing work in flight.*
==============================================================================

# Ideas — how to build one without breaking what works

Rob: *"How do I add all of that in without polluting this conversation? … if I
have more ideas that I would like to build out and test and keep them
independent and only bring them into Main once they are worthy additions."*

This folder is the answer. The short version: **the repo is not what gets
polluted — the conversation is.** Git already keeps work apart; what needs a
rule is where thinking gets written down so it survives a session ending.

## The three separate things

| | Lives on | Why |
|---|---|---|
| **The idea** | a file in `ideas/`, on **main** | So it is findable from anywhere, by anyone, forever. Short, and in Rob's own words. |
| **The build** | a branch, `idea/<name>` | So a half-built thing can never reach the deployed site. |
| **The conversation** | its own session, started on that branch | So one line of work never has to carry another one's context. |

## Starting one

1. **Write the idea down first**, as `ideas/<name>.md` on main. One page: what
   it teaches, why the current app misses it, and what is *not* decided yet. It
   costs five minutes and it is what makes the idea survive a session ending.
2. **Branch:** `git checkout main && git pull && git checkout -b idea/<name>`.
3. **Start a NEW session on that branch.** This is the part that actually stops
   the pollution. A session carries its whole history; a new one starts with
   the repo, `CLAUDE.md` and the idea file, which is everything it needs.
4. Build it there. Screenshot it on a phone. Break it.

## Bringing it in

An idea earns `main` when **all** of these are true — not before:

- **It plays on Rob's phone.** Not "the tests pass" — played, in portrait.
- **The test suite is green** and the new thing has tests of its own.
- **`CLAUDE.md` has its section written**, including the decisions that were
  *rejected* and why. An idea merged without that becomes a mystery in a month.
- **Its hooks reward only correct answers.** The app is addictive by design
  (see "ADDICTIVE BY DESIGN" in `CLAUDE.md`), but a hook that pays off guessing
  or softens a gate is a bug.
- **Its words are in the language files**, not literals in the code (see
  `docs/language-files-plan.md`).

Until then the branch just sits there. A branch costs nothing. Half a good idea
merged into main costs a lot.

## Running two at once

Fine, and normal — one branch and one session each. The only rule is that they
both start from `main`, so neither inherits the other's half-finished work. If
two ideas turn out to need the same change, make that change on `main` first
and rebase both.


==============================================================================
# FILE: docs/language-files-plan.md
*How words, sounds and pictures move out of the code into language files.*
==============================================================================

# Plan: take the words out of the code

**Status:** plan approved in principle by Rob on 2026-09-23. Nothing is built yet.

Rob:

> *"I was disappointed to learn that Staff Smash, Note Smash and Real Smash are
> all pretty much hard-coded. That can't continue… The HTML with as little
> hard-coded text in it — mostly labels that we have a language file for… I want
> a whole list, everything catalogued, so I know every voice prompt. We give it
> an ID. I want to be able to hook into the music backing as well."*

He was also clear about what this is **not**:

> *"No, I don't want a content management system. I'm just saying I need to get
> some language files so they're not hard-coded into the HTML."*

So this plan does not involve a database, a server, an editor or a build step.
It moves words, sounds and pictures out of the code and into plain files that
Rob can read and edit, with every item having an ID.

---

## 1. Where things stand (measured 2026-09-23)

| Where | Hard-coded |
|---|---|
| `index.html` | about **286** pieces of visible text: titles, buttons, descriptions, modal copy, emoji |
| `script.js` (Staff, Note and Real Smash) | **111** places that write text straight onto the screen, plus 8 spoken lines |
| `rhythm.js` | 15 places that write text onto the screen |
| `rhythm-stomp-lab.js` | 23 places that write text onto the screen, **plus `RSTOMP_PROMPTS`**: a named table of prompts that levels can override |
| Stage lists | `g1PathwayStages`, `g2PathwayStages`, `g3PathwayStages`, `RHYTHM_LEVELS` and `RSTOMP_LEVELS` mix level data with display names |

`RSTOMP_PROMPTS` is the one place that is already done the right way: each
prompt has a name, and a level can reword any line without anyone touching the
code. **This plan applies that pattern to the whole app.**

---

## 2. The shape

```
lang/
  en-US.js        every word in the app, by ID — the base language
  en-GB.js        only the lines that differ (note names), by the same IDs
content/
  dialogue.js     Riff & Tango lines: which event, who says it, which text ID
  audio.js        every sound and backing track, by ID
  art.js          every picture and character pose, by ID
text.js           the small helper that looks things up (about 60 lines)
tools/
  check-text.py   finds missing IDs, unused IDs, and text still hard-coded
  build-text-catalogue.py   writes docs/text-catalogue.md: Rob's full list
```

### 2.1 Why `.js` files and not `.json`

The app has no build step. A `.json` file has to be loaded with `fetch()`, and
`fetch()` fails when `index.html` is opened straight from a folder on a
computer. A `.js` file loads with a plain `<script>` tag, which works
everywhere, including offline. The contents are still plain data, one entry per
line:

```js
KR.lang('en-US', {
  'home.staffSmash.title':    'Staff Smash',
  'home.staffSmash.blurb':    'Build instant staff orientation, one position at a time.',
  'value.tree.refuse':        'That row is {note}s. A {note} is half a {parent}.',
  'note.whole':               'whole note',
  'note.half':                'half note',
});
```

`en-GB.js` only lists what is different:

```js
KR.lang('en-GB', {
  'note.whole': 'semibreve',
  'note.half':  'minim',
});
```

### 2.2 The US/UK switch falls out of this for free

Rob's rule is to use American names first, with the UK name in brackets, and to
offer a switch. The note names are just two language files, and a setting picks
between them:

| Setting | Shows |
|---|---|
| **Both** (default for beginners) | whole note (semibreve) |
| US | whole note |
| UK | semibreve |

The same mechanism would carry a whole other language later, if one is ever
wanted.

### 2.3 How the code asks for words

- **HTML** carries an ID and no words:
  `<button data-text="home.staffSmash.title"></button>`. On load,
  `KR.applyText(document)` fills in every tagged element.
- **JS** asks for words by ID:
  `el.textContent = KR.t('g2.target', { note })`.
- **Speech** takes the same IDs: `speak(KR.t('g2.target.spoken', { note }))`.
  If a recorded voice file is listed for that ID in `audio.js`, it plays
  instead of the synthesised voice.
- **A missing ID shows the ID itself**, for example `[g2.target]`, instead of
  a blank. A missing line is then visible in testing, rather than being a
  silent gap on a student's phone.

### 2.4 Riff and Tango, and the music, hook in through events

The game code announces **what happened**. It does not decide what anyone says
or which music plays:

```js
KR.event('value.license.awarded');
```

`dialogue.js` decides what, if anything, happens then:

```js
{ on: 'value.license.awarded', speaker: 'tango', text: 'tango.license.1', pose: 'tango.cheer' },
```

**Where the lines appear: the gold guide box.** A dialogue line is shown in the
gold box, with the speaker's portrait (`art.js`) **beside** the box, never over
the notation. A line is spoken by:

- the recorded file for its ID, if `audio.js` lists one;
- otherwise the browser's speech, using the speaker's voice profile from
  `content/dialogue.js`: a lower pitch and slower rate for Riff (hip and gruff),
  a higher pitch and quicker rate for Tango (high, tight and squeaky).

The browser voices vary from device to device, so this fallback is only a
placeholder. The catalogue lists every line that still has no recorded file.

`audio.js` does the same for backing tracks and stingers. Rob can then write
the whole Riff and Tango narrative, change the music, or add a "go and play it
on your instrument" line, **without any code changing**. An event with nothing
attached does nothing.

### 2.5 Rob's catalogue

`tools/build-text-catalogue.py` writes `docs/text-catalogue.md`. It is one
table listing every ID with:

- its US text and its UK text;
- whether it is spoken;
- who says it;
- which file it is used in.

This is the "whole list, everything catalogued" Rob asked for. It is generated,
never edited by hand, so it cannot go stale.

---

## 3. The order: never break a working game

Each step is its own branch. Each one is played on Rob's phone before it merges.

| Step | What | Risk |
|---|---|---|
| **0** | `text.js`, empty `lang/` and `content/` files, `check-text.py`. Nothing visible changes. | none |
| **1** | **Rhythm Stomp Lab.** Move `RSTOMP_PROMPTS` and its level overrides into `en-US.js`. It is already named, so this proves the system on the part that needs the least change. | low |
| **2** | **The dashboard and home screen.** | low |
| **3** | **Staff Smash** | medium |
| **4** | **Note Smash.** Fix CLAUDE.md open item 4 (announcing the target on every redraw) in the same change, because the same lines are being touched. | medium |
| **5** | **Real Smash.** Fix CLAUDE.md open item 3 (the dead setup screen) in the same change. | medium |
| **6** | **Stage lists → `content/levels.js`.** Stage names and descriptions become IDs; the level data moves out of the game logic. | medium |
| **7** | **Riff and Tango and the music**, once Rob sends the material: fill `dialogue.js`, `art.js` and `audio.js`. | none: content only |

**Value Smash is written language-first from its first line.** It needs only
step 0, not the migration of the older games, so it never adds to the debt.

Before each merge, `check-text.py` must report:

- **no hard-coded text** in the files that step converted;
- **every ID used exists** in `en-US.js`;
- **`en-GB.js` contains no ID that `en-US.js` lacks.**

---

## 4. What this plan deliberately does not do

- **It does not restructure the game logic.** Rob also asked for things to be
  "more object-oriented". The duplicated grid code in Staff Smash and Note Smash
  (`g1*` and `g2*`) should one day become one shared Smash-grid module. That is
  a larger rewrite of working games, so it is a separate project, to start once
  the words are out. Doing both in one change would make any breakage
  impossible to trace.
- **It does not add a server, database or CMS.** Rob ruled this out. The files
  are the source.
- **It does not change how anything plays.** A converted game should be
  indistinguishable from before, word for word.

---

## 5. Also true once this lands

- There is no automated test suite in this repo yet. `check-text.py` would be
  the first check a change must pass, and it is where the Value Smash notation
  sweeps (brief §13) would live too.
- Every new on-screen line, anywhere in the app, is added as an ID. The
  `CLAUDE.md` rule in "Every on-screen prompt has a NAME" now applies app-wide,
  not only to Stomp Lab.


==============================================================================
# FILE: ideas/equivalency-note-tree.md
*The prerequisite hole: note-value equivalency. Designed as Value Smash, not built.*
==============================================================================

# The missing step: note-value equivalency

**Status: designed and approved by Rob (2026-09-23); not built.** The full design
brief is `kool-riffs-docs/docs/value-smash-design-brief.md` (revision 2). It
answers every open question below, and `CLAUDE.md` ("THE APP IS LEVELS ACROSS
PILLARS") has the short version.

Raised by Rob after Garnet played Rhythm Stomp Lab. Written down here so it
survives the conversation it came from — see `ideas/README.md` for how to take
it further.

## What happened

> *"My son Garnet was looking at Rhythm Stomp Lab last night but only played it
> for a moment because he said nah, what I need is a step before this."*

Garnet teaches at Emmanuel College, Point Cook — *"a lot of rough kids there and
he has kids that do not want to learn."* His constraint is the sharpest test the
app has:

> *"He doesn't want to tell these kids about music. They won't listen. They will
> play a game though."*

**Note Smash was a success with them. Rhythm Stomp Lab was not** — and the
reason he gave was not that it is too hard. It is that something comes before
it.

## What is missing

Knowing what each note is **worth**, and that the values convert into each
other:

> *"A whole note equals two half notes, a half note equals two quarter notes, a
> quarter note equals two eighth notes, and so on… Knowing how much each note is
> worth is extremely important, and should be drilled."*

The Rhythm pillar already *uses* equivalency — the long-hand scaffold in A7 and
B4 spells a value out as tied notes of the generation below, and `CLAUDE.md`
calls it *"a rite of passage."* But it is taught **inside** a counting game, to
a student who is already reading rhythm on a staff. Garnet's students are not
there yet. Equivalency currently has no game of its own.

## Rob's two sketches

**1. The note tree.** A semibreve at the top, two minims under it, four
crotchets under those, then eight quavers, then sixteen semiquavers. Built by
the student, not shown to them.

> *"A level one round of equivalency would be producing the note tree."*

**2. Equivalency on the SMASH grid.** Reuse the mechanic that already worked for
these kids:

> *"Maybe we could advance the Smash concept — smash all the cards where the
> notes equal two beats — and we could use the 3/6/9/12 density grid."*

That is Staff Smash's own mechanic (grid of cards, tap the ones matching the
announced target, density scales 3→6→9→12 as streaks build), with the target
being a **duration** instead of a note name. It needs no new interaction
vocabulary, and the branding verb is already right.

## The principle underneath it

This is the part that outlives the specific game:

> *"Any time we've made a leap from one game to the next has assumed a certain
> amount of prerequisite logic and knowledge. Then we need to flag that and make
> sure we are moving incrementally."*

Recorded in `CLAUDE.md` under "FLAG THE PREREQUISITE LEAP."

## Open, before anything is built

- **Where does it sit?** Its own pillar, a Game 4, or the front porch of the
  Rhythm pillar? Garnet's framing ("a step before this") suggests it is the
  entry to Rhythm, not a separate thing.
- **What is the target vocabulary?** "Equals two beats" is one kind of question;
  "equals a minim" is another, and "how many of these fit in that" is a third.
  All three are drillable; they are not the same skill.
- **Is the note tree a game or a reference?** Building it once is a level test.
  Building it every round is busywork. Rob's *"produce the note tree"* reads as
  the former.
- **Does it need a staff at all?** Probably not, and that may be the whole point
  — a value is a value before it is a position on a stave. That would also make
  it playable by a student who has never met a clef.
- **Where does the counting voice fit**, if at all?

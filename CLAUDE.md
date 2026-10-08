# Kool Riffs — Project Reference

Read this before touching the code. It's the accumulated context from months of design work, kept up to date as the project evolves — treat it as the source of truth over any stale comment in the code itself.

## What this is
A browser-based music-education app (single HTML page, no build step) teaching primary/secondary students to read music at speed, deployed at koolrifz.github.io. Built by a career instrumental music teacher, not a developer — code quality and correctness matter, but so does keeping the file structure simple enough that he can read and reason about it himself.

**Files:** `index.html`, `script.js`, `style.css`, plus `rhythm.js` and `rhythm-stomp-lab.js` for the Rhythm pillar, `value-smash.js` for the Value silo (being built on `idea/value-smash`), `beat-smash.js` + `beat-pads.js` + `beat-smash-band.js` for Beat Smash (see "BEAT SMASH"), `teacher-codes.js` (see "TEACHER CODES"), `dashboard.js` (see "THE DASHBOARD"), and `content/songs.js`, Rob's chord progressions for the band (see "ROB'S SONGS"). Notation rendering uses VexFlow 3.0.9 via CDN. Words, dialogue, pictures and recorded sounds live by ID in `lang/` and `content/`, looked up through `text.js` (`KR.t`, `KR.say`, `KR.event`), all loaded before `script.js`; `tools/check-text.py` checks them.

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

## THE DASHBOARD: who is playing, then every game's pathway
Rob, 2026-10-05: *"Move the 'What's your name' to the very top of the Kool
Riffs game dashboard. Rework our dashboard so it shows their statistics and
what pathways have been unlocked."* `dashboard.js`, loaded last because it
reads every game.

- **The order is Rob's, and the number in each coloured square is it:**
  1 Beat Smash · 2 Staff Smash · 3 Value Smash · 4 Note Smash · 5 Real Smash ·
  6 Rhythm Stomp · 7 Rhythm Stomp Lab. `KR_HOME_GAMES` is the list; the cards
  are built from it (`renderDashboard()`), so index.html holds only
  `#home-games`. Each card keeps its old `onclick`, which the tests find
  cards by. Titles and blurbs are `home.<id>.title/blurb`.
- **Each card shows its pathway**: a dot per stage (filled = cleared, ringed
  = open, grey = locked), or a bar when there are more than ten
  (`KR_HOME_MAX_DOTS`: Stomp Lab's 29), and one line of numbers (cleared,
  best, plays; Value Smash's License; Beat Smash's song, how far its band has
  got, songs finished, the Permit). **Read through each game's own getter**
  (`getG1PathwayProgress()`, `vsmashLoad()`, `bsmashLoad()`…), never a copy of
  its storage, so the teacher's Open code shows every stage open here too.
- **The nickname is at the very top** (`#home-player`): "What's your
  nickname?" with the names already on the device, or "Playing as Ziggy ·
  Not you?". It is the one players list Value Smash and Beat Smash already
  share, so choosing here chooses for the whole app, and a guest's Beat Smash
  warm-up moves to the nickname as it does when Beat Smash asks. It never
  blocks a game: Beat Smash still asks after the first star if nobody is set.
- **Re-drawn on every return** (`launchGame('view-dashboard')` calls
  `renderDashboard()`), so the numbers are always the latest.
- **Staff, Note and Real Smash, Rhythm Stomp and Stomp Lab keep progress per
  device**, not per player (only Value Smash and Beat Smash are per player
  yet): their cards are the same for every nickname until "Playing as" reaches
  every game.
- Rob will rework **Rhythm Stomp** later; its card is the old one, numbered.

## TEACHER CODES: reset everything, or open everything
Rob: *"I should have two codes: one to reset all of my levels of all the games
back to zero… and one that just allows me to jump into any level I want."*
Typed into the box on the **About Kool Riffs** screen, or pressed: the same
screen has **Reset** and **Open** buttons (Rob: *"I can't remember the
code"*); Reset asks first. `teacher-codes.js` holds the codes (`KR_CODES`,
change them there) and acts on this device only.
- **RESET** removes every `koolRiffs*` key: players, progress, settings, the
  tap delay. The first time into everything again.
- **OPEN** sets `koolRiffsOpenAll`. Every game's progress getter passes its
  stages through `KR.openStages()` (Value Smash and Beat Smash check
  `KR.openAll()` directly), so every stage is open wherever the game looks.
  Typing it again turns it off; stages played meanwhile stay open (nothing
  opened is ever closed). **A new game must route its unlocks through the
  same helper.**

## Pathway screen pattern
Each game's entry point is a pathway screen (`g1-screen-pathway`, etc.) — a compact horizontal track of stage nodes (locked = number + name, dimmed and unclickable; unlocked = number + name; cleared = number + name + best score badge). The Start button never appears on this screen itself, only after a stage is selected. This was a deliberate fix — don't regress to a screen where a game launches straight into "Start" with no visible pathway.

**Every game shows a locked stage's name.** It started in Rhythm Stomp Lab: Rob, stuck at Level 14 and unable to tell whether anything existed past it, read 29 icon-only locked nodes as "nothing built beyond here". It is now the rule everywhere (Rob, 2026-10-02, "general housekeeping across the whole range of games"): Staff, Note and Real Smash, the Rhythm screen, Value Smash, Stomp Lab and Beat Smash all show every stage's number (or icon) and name. A locked one is dimmed (`.pathway-node.locked`, opacity 0.6), can't be pressed, and never shows a score. A new game does the same.

---

## Open items to fix now

**Items 1–5 of this list are done** (checked 2026-10-06, in the code and in a
browser). What each was, so nobody goes looking for them again:

- **1. Real Smash's Helpers popup** draws in every clef. Its catch logs
  (`renderHelperSheetGraphics failed:`) and it reads the clef from
  `getClefPreference()`, not a hidden form field. **A bug was found while
  checking it, and fixed:** the Spaces row was blank in bass, alto and tenor,
  on Note Smash's helper too. Every mnemonic was split letter by letter, which
  only works for "FACE": "All Cows Eat Grass" gave 18 labels for 4 notes, and
  the aligner gives up on a mismatch. `helperMnemonicWords()` gives a word per
  note for a sentence and a letter per note for one word. And a sentence that
  would shrink below 10px on a phone ("Good Boys Deserve Fruit Always" needed
  7.6px) now **drops every other word a line** instead (`.staggered`), which
  also lets it stay bigger (12.9px).
- **2. The tuner's F transposition** is `f: 7`.
- **3. Real Smash's old setup screen** (`g3-screen-setup`) is gone.
- **4. A target is announced only when it changes**, in every game that
  speaks one: Note Smash (`g2LastAnnouncedNote`) and Staff Smash
  (`g1CurrentPromptLabel`). Real Smash speaks no target. The one deliberate
  repeat is Note Smash's resume from pause, as a reminder.
- **5. A Staff, Note or Real Smash result is shared as a picture** where the
  phone can share a file (`makeScoreCard()`: the game in its colour, the stage,
  the score, attempts and time left, the nickname playing). It is drawn with
  `toDataURL`, not `toBlob`, so the share sheet still opens from the tap.
  Without file sharing it falls back to the text share, as before.

**Still open, and a written decision:** the alto and tenor helpers still use
word mnemonics ("Fat Alley Cats Eat Garbage"). "Alto & Tenor clef: teach via
Middle C" below says they must not, and gives the copy. Not built yet: it
needs a Middle C highlight on the staff and the copy moved into `lang/`.

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
original idea is `ideas/equivalency-note-tree.md`. **Part V1 is built on
`idea/value-smash`** to `docs/value-smash-build-guide.md`; see "VALUE SMASH"
below. The short version of the structure is under "SILOS AND BRIDGES".

`ideas/README.md` is how an idea like that gets built without disturbing work
already in flight: the idea file on main, the build on `idea/<name>`, a fresh
session per branch, and a merge bar that includes "played on a phone" and "its
CLAUDE.md section is written."

## SILOS AND BRIDGES: the app's structure
Rob's structure, 2026-09-23. **Words: a *silo* is a body of knowledge (what
earlier notes call a pillar: Notation, Value, Rhythm…); a *Level* is a *bridge*
built between the silos.** **It is bigger than any one game and is not built
yet.** Every new game is designed so that it slots into it.

- **Value is a silo.** *"A music note does two things. It tells us the pitch…
  and it tells you its value. Then we combine it together to make rhythm."* The
  silos are now **Notation (pitch) · Value · Rhythm · Key Signatures ·
  Intervals**, possibly more later (Rob's childhood flash cards also covered
  terminology).
- **Each silo has its own floors** (Stomp Lab's A1 is a floor of the Rhythm
  silo). **An app-wide Level is a bridge across the silos**: a set of floors
  from every silo, taken together. Level 1 is the introductory floors of all
  the silos. *"Don't make them start from a beginner in one pillar and force them
  to become an expert, then move to the next one."* Which floors make which
  Level is still to be worked out with Rob.
- **The Artistic License.** Clearing Value Smash's first part awards it, and it
  opens Rhythm Stomp Lab: *"You can't even get to Rhythm Stomp unless you can
  smash some note values."* Later Stomp Lab stages each open with the Value part
  they depend on. **Never re-lock a Stomp Lab level a student has already
  unlocked.** **Built on `idea/value-smash`:** a medal in the V1 Sprint awards
  it (`license: true` in the player's `koolRiffsValueProgress`), and the one
  guarded line at the top of `enterRhythmLab()` calls `vsmashGateStompLab()`.
  It stops only a student with no License who has **never** played Stomp Lab
  (`totalPlays` 0 and only level 1 open). So on a fresh device Stomp Lab does
  not open: that is the gate, not a bug.
- **The Artistic License is being REDEFINED: direction only, not built.**
  Rob, 2026-09-29: the License is for *"clearing all four pillars… the summation
  of all of the very basic knowledge"*, with a **Learner's Permit** and
  probationary stages before it. Proposed ladder: L plates from Beat Smash
  (`ideas/beat-smash.md`), P plates from Value Smash V1 (today's "License" and
  Stomp Lab gate), and the Artistic License at the end of level one. Until that
  is designed, what V1 awards stays as built. Don't build a new gate against
  either meaning without asking Rob. **Since ruled (2026-09-29):** every pillar
  counts toward the Artistic License, and Beat Smash's L plates are needed to
  open Value Smash. How students climb a pillar and cross into the next is a
  proposal in `kool-riffs-docs/docs/levels-and-licences.md`, still awaiting
  Rob's answers.
- **Values first, time signatures last.** Every note value is given in common
  time from the first screen (*"it takes up the whole bar and it commonly
  receives four beats"*, as in Rubank), but the *meaning* of time signatures
  waits until all values and equivalencies are done. **Simple time (4/4, 2/4,
  3/4) and compound time (the 8 on the bottom) are taught separately**, simple
  first. The 2/4 against 6/8-in-two comparison comes when 6/8 speeds up (Stomp
  Lab's Stage E).
- **The big game that holds it all is not designed yet.** Rob, 2026-10-03:
  once it is, *"everything like the learner's permit will be named according
  to the overall game environment and not something just specific to
  itself."* His brainstorm (gold records on a wall, the charts: *"How many
  gold albums can you get?"*) is in `ideas/gold-records.md`. Don't name a new
  award until the metaphor is chosen.
- **The note tree is the help menu**, and the student builds it themselves. Once
  a time signature is on screen, the tree labels each note with its beats in
  that signature.

### Riff and Tango: the coaches in the gold box
Rob's two characters, created in 1997; he owns them, and they will be redrawn.
**Riff** is a jazz Scottie dog (grey, red beret, green vest, white beard; the
1997 sunglasses are gone) with a
**hip, gruff** voice, and he handles **pitch**: the Notation games. **Tango** is
an orange cat who walks on two legs, with a big **red mane** and a **blue
vest**. She is a drummer, with a **high, tight, squeaky** voice, and she
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

Reference art (Rob's 2026 Gemini redraws of both, the 1997 originals, and what
the pose images must look like: flat background, no watermark, one image per
pose) is in the private docs: `kool-riffs-docs/docs/riff-and-tango.md`.

## VALUE SMASH — Part V1 built (branch `idea/value-smash`)
The Value silo's first part, "The Big Three" (whole, half and quarter notes
and their rests, in common time), built to `docs/value-smash-build-guide.md`
Phases 0–1. The design is the brief's; this section records **what was built,
the calls made where the guide left room, and what was tried and dropped.**

**Files.** `value-smash.js` (everything), `text.js` + `lang/` + `content/`
(the words, Phase 0), `view-value` in `index.html`, a Value Smash block at the
end of `style.css`. The one change to another game is the gate line at the top
of `enterRhythmLab()`. Note values are **read** from `RSTOMP_VOCABULARY` and
their lengths from `rstompSlotsFor()`, never copied.

**Floors are data** (`VSMASH_FLOORS`, IDs permanent): **The Tree** → **Smash**
→ **Sprint**. Progress is per player, only through `vsmashLoad()` /
`vsmashSave()`. The tunable numbers are the constants at the top of the file.

**How each floor plays, and the calls made on it:**

- **The Tree** — three equal rows (each lasts the same time), tiles as wide as
  their value, a tile drops into the highest row with room or is refused with
  the reason told as a *relationship*, never in beats. A full row plays back at
  0.5 s a beat.
  - Round 3's tray holds the **notes as well as the rests**, so a note offered to
    a rest row is refused: sound is not silence.
  - A rest row plays back with the **brush**, not the snare: a snare on a
    silence says the opposite of what the row means (and matches Stomp Lab).
  - The Tree card (the help menu) shows every row of each round passed,
    *including the given row* — otherwise the whole rest, always given, would
    never appear.
- **Smash** — Note Smash's grid, matched not imported.
  - **Duds: Rob's call, 2026-09-24.** Tier 1 has no clock at all, so a dud there
    is answered with a **Nothing here** button; from tier 2 each screen has Note
    Smash's flash timer and a dud passes when it runs out untouched. A dud
    handled right earns a **joker** that saves the streak once.
  - A wrong tap costs **2 s** (`VSMASH_WRONG_TAP_SECONDS`) — the guide says wrong
    taps cost time; the older games actually charge none. On tier 1, with no
    clock, a wrong tap **breaks the streak** instead: otherwise tapping every
    card clears tier 1, and a hook that pays off guessing is a bug.
  - A dud earns a joker and time, **no points** (Note Smash gives one): only
    correct taps score.
  - The combo is per screen: taps score 1, 2, 3…; the crack climbs a whole tone
    a step. Gold card triple. Missed targets are outlined after a miss.
- **The Sprint** — the Smash engine in sprint mode: 60 s from tier 2, every
  question kind, no duration bars, stays at 12 cards after Gold.
  - **Medal = highest tier CLEARED**, as Real Smash does. "Reached" would give
    Bronze for pressing Start, because the Sprint starts at tier 2.
  - **Stars follow the medal** (Bronze 1, Silver 2, Gold 3): a fixed 60 s has
    no finishing time to beat. A no-medal run still records a personal best.
  - The first medal awards the **Artistic License**, with its ceremony, once.

**Cards are real notation, and drawn on the beat.** Every card is one of the
**55** runs of 1–4 notes and rests that pass `vsmashGroupIsReal()` (half rest
only from beat 1 or 3; a bar of silence is one whole rest; beat 3 hidden only by
quarter / half / quarter). Notes sit on an even **beat grid** across the card, as
Stomp Lab's staff does, so a card reads as a bar and each note starts over its
own stretch of the duration bar.

**Tried and dropped — don't bring these back:**

| Tried | Why it went |
|---|---|
| Random notes, kept if they fitted | ~72% of cards came out a single note, so "equals a half note" became "find the half notes". Now the size is picked first from the list of 55. |
| VexFlow's own spacing on cards | Rests ran into noteheads at card width. |
| A beat grid to the card's very edge | Beat 4's glyph was clipped. The grid stops `VSMASH_GLYPH_ROOM` short. |
| Shrinking the Tree's notation with CSS on short screens | The staff line stopped at 80% of the tile. The notation is *drawn* at 80% instead (`vsmashTreeScale()`). |
| Showing the License ceremony after a short delay | Leaving in that moment awarded the License with no ceremony, ever. It shows at once. |
| Waiting out a dud on tier 1 | There is no clock to wait out — hence the button. |

**Phone layout.** Every button is at least 56 px (Value Smash's nav buttons are
sized in its own CSS, so the other games are untouched). Measured: every screen
fits with nothing below the fold at **390×844, 360×640 and a 1366×657
Chromebook**; short screens (under 740 px tall) get a compact Tree. The 320-wide
phones and landscape scroll, as the rest of the app does.

**Tests.** `python tools/test-value-smash.py` (needs `pip install playwright`;
it drives the installed Chrome): 64 checks across every floor, the gate, the
older games and the layout. Run it with `tools/check-text.py` before every
commit.

**Open for Rob:**
- Everything in the §5 defaults table, plus the 2 s wrong-tap cost, the Sprint's
  medal-stars, and a joker being one only (no stacking).
- **No names setting on screen yet.** `KR.setNames()` works and each player
  stores `namesSetting`, but nothing lets a student change it.
- **No keyboard play.** Tab and Enter work (every tile and card is a button),
  but there are no shortcut keys for Chromebooks.
- **The brief's "near-miss" hook** ("1 beat over", "0.3 s off your best") is
  listed for phase 1 in the brief but not in the build guide; not built.

## BEAT SMASH — level one built end to end, on main
First on the dashboard (Rob: *"moved straight up to the very top of the menu"*).
The first rhythm game, and the step before Stomp Lab that Garnet asked for.
The spec is the private brief, `kool-riffs-docs/docs/beat-smash-design-brief.md`
(rev 7); section numbers below are its. **All of level one is built**: the
first minute, the pads, the delay calibration, Tango on drums, Riff on bass,
Riff on keys, each musician's studio take and the Learner's Permit. The build report for outside
reviewers is `docs/beat-smash-build-report.md`. The brief
says `idea/beat-smash`; this session could only push to the branch above.

**Files.** `beat-smash.js` (the game), `beat-pads.js` (the pads, written for
Stomp Lab's performance round to reuse), `beat-smash-band.js` (the placeholder
band synth, moved up from `tools/beat-smash-band/`: the game plays the
student's pad sounds live from it, and falls back on it if a loop file hasn't
loaded), `view-beat` in `index.html`, a Beat Smash block at the end of
`style.css`. Loops by ID in `content/audio.js`; words in `lang/en-US.js`
(`beat.*`); Tango's lines in `content/dialogue.js`. The dashboard card is red,
for the recording light.

**Reused, never copied:** the vocabulary, grid and engraving rules
(`rstompGridFor`, `buildRstompUnitShapes`), the notation renderer
(`renderRstompStaff`, called through `bsmashWithStompGrid()`, which sets Stomp
Lab's four grid globals for the one call and puts them back), the one
AudioContext and its instruments (`rstompAudio`, `raudioClick`), and Value
Smash's players list. Beat Smash adds an **age** to a player.

**How it runs.**
- **The song clock.** `bsmashBand.start` is bar 1 of the song on the audio
  clock. Loops are booked a cycle at a time as new sources at exact times;
  takes start on a barline of the song; the pad plays the chord of the bar
  under it. Everything is counted from that one number.
- **The band has its own buses to the speakers**, bypassing Stomp Lab's
  master, because `rstompAudioStop()` fades that master and the groove
  would dip whenever anything else stopped.
- **The first minute is a jam, and it is the student's for as long as they
  like.** Four big pads, Tango demos a bar on the cowbell, "Copy me!". It
  can't fail. **Reversed twice, both times on Rob's call after playing it.**
  The first version turned the pads into notes after four on-beat taps (*"I
  think I've been robbed of the fun of maintaining that beat"*); the second
  filled a meter in 24 taps with the band building under it.
- **THE WARM-UP'S GUIDE: hear the beat straight away** (Rob, 2026-10-08,
  after four classes of seven clarinets, grade 5 and 6, played it on an iPad
  in a line, handing it on: *"they loved it... they all wanted another turn"*;
  and *"they need to hear the beat straight away, way louder... Let's just
  have a metronome. Just start with a tick... like a wooden clave. And then
  we're going to add in the quavers... after maybe four bars. And then we can
  add the drums in... the experience first is to find the beat, feel what the
  quavers are, and then be able to count up to four."*). So the warm-up now
  opens:
  - **bar 0, a red count-in**: Tango's counting voice 1 2 3 4 in time, each
    beat's pad red, the number in a red ring in the middle
    (`bsmashJamCountIn()`; *"they should go red for the count in"*);
  - **a wooden tick on every beat from that count-in** (`metro`, the
    `metronome` part: `woodTick`, beat 1 a fifth higher). **0.50 peak, nearly
    3× the old click** (0.18). It was 0.80 first; the student's kick landing
    on the tick then clipped (1.17), so it came down to keep the worst case
    (tick + kick + shaker together) at 0.90;
  - **"follow the green", only to get started**: from bar 1 the beat's pad
    lights green for most of the beat, so the light walks 1, 2, 3, 4 across
    the pads with the tick (`.krpad.guide`). **It walks until the beat is
    established, which is when the drums join, and comes back whenever the
    beat has to be found again**: while Tango counts them back in, and while
    the band has stopped (`bsmashJamWalking()`). Rob, 2026-10-08: *"When the
    beat has been established, we don't need to keep walking the green
    buttons anymore. But just like when there's a recovery... they do that
    walk then as well... Once they're established, of course I don't want
    them relying on the green walk. That's only just to get started."* The
    rest of the time the beat's pad keeps **a pale green outline**, beat 1 a
    little stronger, the glow growing with the meter (*"I don't mind the
    silhouette... just paler. And just so to encourage them to remember that
    beat one... you don't use the beat one pad for the beat three"*);
  - **the shaker on the quavers from bar 5** (`BSMASH_JAM_SHAKER_BAR`, the
    `shaker` part: `guideShaker`), by time, never earned, the "and" stronger
    than the beat (0.26 against 0.13). Rob talks to the student over it:
    *"listen to the shaker in the background that goes tick tock... use that
    offbeat of the quaver to guide you."* Every hit is the **same slice of
    noise** (`noiseBurst`'s new `offset`): left to the shared noise, one hit
    in sixteen came out three times louder, an accent in the wrong place.
    Tango names it (`beat.jam.shaker`) unless she is mid-coaching;
  - **then the band is won as before**, but held bars only count once the
    shaker is in: the tick, the quavers, the drums. **The drums take the
    beat from the tick** (it steps out, the shaker drops to half,
    `BSMASH_GUIDE_UNDER_DRUMS`) **and give it back if they are lost**.
  - **The guide is the clock, not the band**: never earned or lost, on its own
    channel to the speakers (`bsmashGuideBus`), past the warm-up's quiet band
    level and the sag. **When the band stops, the tick, the shaker and the
    green walk carry on**, so the next student in line picks the beat up (Rob
    handed the iPad down a line: *"sometimes we'd lose the beat and have to
    start over. But it's great because you can just keep going"*).
  - "Copy me!" and the story wait for bar 1, so they don't land on the count.
  **Is it too much for grades 5 and 6?** Rob's question, with the research:
  `docs/beat-position-research.md`. Short answer: no, but it is a real skill
  (the beat and the rhythm held together, the place in the bar kept through
  the rests) that is still maturing at 10–12. Build it beat first, slower at
  first, and with games of its own: `ideas/rhythm-rudiments.md`. Zach's idea
  (letter names tapped in time) is `ideas/note-names-in-time.md`; call and
  response with Tango is Rob's next priority (`ideas/jam-with-tango.md`).
  **Still open from the classroom:** the noise of a class (Rob: *"I'll talk
  to you about that later"*); a slower tempo for the first reading steps and
  a faint walk in the first star's picture go (both proposals in the research
  note); and four bars feeling less fun than one or two. Rob is recording
  himself coaching a focus group, to write Tango's coaching from it.
- **THE BAND NEEDS A PULSE: the warm-up is a story** (playtest 2, 2026-10-02:
  *"A little story that the band needs a pulse. Your job is to keep the
  pulse… If at any time you back off and stop playing, then you lose the
  instrument. You got to win it back."*). It starts with **no band playing**,
  only the student and the guide's tick (`bsmashBandStart({ metro })`), and
  Tango tells the story if no tap comes. The band joins a player at a time, each after so many bars **held**
  (`BSMASH_JAM_BUILD`: drums after 2, bass after 4, keys after 4, then 8 for
  the full groove, about a minute as played). A bar is held with
  `BSMASH_JAM_HELD_TAPS` (3) taps on the beat; a bar with
  `BSMASH_JAM_DROPPED_TAPS` (1) or fewer **loses the last player to join**,
  who has to be won back (`bsmashJamBar`, `bsmashJamJoin`, `bsmashJamLose`).
  The meter is the bars held through the build, and the desk lights who is
  playing. Once the groove is full nothing more is lost (the variations take
  over), **"Show me what I played"** appears, and the jam carries on until it
  is pressed; then the band steps back to Tango alone and the pads become
  four quarter notes.
- **A groove of their own** (Rob: *"That's a cool groove, but that's not what
  we need for this song"*). Three taps on the "and" within two bars
  (`BSMASH_AND_WINDOW`, 0.12 of a beat either side) say so, and outrank
  "Follow me!" (her count still starts, in time). Measured from the device's
  delay, the fixed reference: the running estimate follows a steady run of
  off-beat taps and would never see them.
- **"Follow me, 1 2 3 4"** (Rob, 2026-10-01: *"Tango doesn't say boom boom
  boom boom. Tango says follow me, 1 2 3 4. And continues counting until order
  has been restored or they give up."*). When the beat is lost (the sag
  starts) or the taps haven't settled after four bars, Tango counts from the
  next bar, **in time**: her counting voice (`raudioSyllable`, the pitched
  placeholder, one scale degree per beat as in Stomp Lab) booked a beat ahead
  on the audio clock, the number in the middle of the beat light, the beat's
  pad flashing. The spoken line is only *"Follow me!"*: speech can't be
  booked on the audio clock, so spoken numbers drifted against the band
  (playtest 1, §2.1). The count is the in-time voice; recorded "one, two,
  three, four" will replace the pitched placeholder. Three taps on the beat in a row (`BSMASH_FOLLOW_RESTORED`, the
  rule of three) end it, and she congratulates them ("Order restored"). If
  they fall apart and stop, the stop line is hers: *"Everyone struggles at the
  beginning. The important thing is to keep trying. Come back when you're
  ready and give it another go."* The old "boom boom" re-demo and "Find the
  beat!" lines are gone; the first bar's "Copy me!" demo stays.
- **The jam is also the delay calibration and the BEAT TEST.** Every tap is a
  tap to a known beat. The delay (median, then the mean of taps within 80 ms of
  it) is stored per device (`koolRiffsBeatDelay`). The beat test is stored per
  player (`beatTests`, the last 20): **lean** (average ms off the beat, the
  device included), **steady** (the spread of the on-beat taps) and **onBeat**
  (% of taps within the jam's window of the student's own lean). Recorded, not
  yet used to grade: see "The beat test" below. With the teacher code on, the
  pathway shows the last one.
- **A calibration bug, fixed after Rob found the timing off on his phone.**
  Each jam tap was placed against the beat nearest the *running* estimate. A
  few wild taps at the start could drag that estimate half a beat off, after
  which every good tap was placed on the wrong beat and excluded, and it never
  recovered: a device calibrated half a beat out, and every take after it
  graded against the wrong beat. Taps are now placed against a **fixed**
  reference (the delay the device had before the jam), and the estimate can't
  run below −50 ms. Reproduced in the test (three off-beat taps first).
- **The band sags when the beat is lost, and stops when the student stops.**
  Rob: *"If they tap really poorly out of time… the music slows down like a
  record slowing down, and then they start pushing the beat back in time…
  It's nice and clean and that's how they know."* Two taps off the beat in a
  row and the band starts to sink (`bsmashBandSag()`: a low-pass filter and
  a level after the mix, gliding, never stepping); each tap back on the beat
  returns some of its power. Two bars with no taps and the band powers down
  and stops, Tango says so, and **Keep jamming / Beat Smash menu** appear
  (`#beat-jam-nav`); a tap on any pad brings it back, in time, because the
  band's clock never stopped. That stop screen is where Rob wants call and
  response offered.
  **Not a real slow-down, and why:** the band's clock is what every beat,
  every tap and every take is measured against, so bending its tempo means
  re-timing the loops live. Parked; the sag is the clean version of the idea.
- **The jam can be played over a jam song** (the "Jam song" setting; see
  "ROB'S SONGS" below). Then the bass joins in whole notes, the keys in
  whole notes, and a full meter switches both to his pumps, a different pump
  rhythm each time round: the longer the beat is held, the groovier it gets.
- **A tap's time comes from the event, not the handler.** `bsmashEventTime()`
  takes the lag between the touch and the code running (bigger on a busy
  phone) back off, using the event's own time stamp. Rob: *"I really thought
  I was hitting on the beat."*
- **The dice table is data** (`BSMASH_MUSICIANS[].steps`), bars written
  `'q qr q q'`. `'all'` = every legal bar by the engraving rules (Tango: 15).
  Tango's one-bar step is a **ladder climbed by clean takes**: every beat ·
  strong beats · backbeat · one rest anywhere · the full map. So the first
  three stars are always `q q q q`, `q 𝄽 q 𝄽`, `𝄽 q 𝄽 q`.
- **The picture's blocks are SQUARES**, one per beat, centred in the beat's
  slot (Rob, on his phone: *"too much a rectangle. Make them square"*). A
  half note is two squares joined, a whole note four, so width still shows
  length; the cells inside split exactly at the beats. The square's side is
  the slot width less a gap, at most 52 px (`BSMASH_BLOCK_MAX`).
- **One picture: the squares.** Rob, 2026-10-01: *"just give them one
  interface of squares. We don't need to give them different ways of
  representing the sound… the drum loop interface just doesn't do it for
  me."* This **reverses** "Need a hand?" and its mixed pictures (Blocks /
  Counting / Drum machine, `settings.pictureHelp`), which are gone. Counting
  went first (*"We don't know what brackets are"*): it arrives where it is
  taught, in Stomp Lab. Don't bring a second picture back.
- **The count-in is unmistakable** (Rob: *"make sure it's very clear the
  count in… the vacant screen in the middle needs to pulse in red one, two,
  three, four… or use the same method that we use when somebody gets off the
  beat"*). It **is** the follow-me method, so no new metaphor: Tango's
  counting voice in time (`raudioSyllable`, booked in `bsmashScheduleTake`),
  the number in a red ring in the empty space between the music and the pads
  (`#beat-countin`, `bsmashCountIn()`), and each beat's pad lit red
  (`countin`). Red because it is the recording light. The ring sizes itself
  to the gap and never sits over the notation; where there is no room (the
  studio on a 360×640 phone) the red pads count alone. It goes at beat 1.
- **The fading scaffold** is `bsmash.scaffold`: `star1` (picture, reveal,
  same bar from notation), `star2` (picture until two beats before beat 1),
  `star3` (notation only), `retake`, and `studio` for the 32 bars. The picture is laid out on the
  notation's own slot grid, so the morph is a change of look, not of place.
  **The squares come down at four bars** (Rob, playtest 2, on the eight-bar
  step: *"There should be notation."*): only steps 1–2
  (`BSMASH_PICTURE_STEPS`) start from the squares. From four bars every take
  is read from the notation; the stars still count three in a row.
- **Grading** is against the audio clock, the delay taken off each press.
  A press takes the nearest unplayed note in the window. One that misses the
  window but lands **within half a beat of a note still to be played is that
  note, early or late** (`BSMASH_NEAR_BEAT`), never a tap in the rest beside
  it: Rob's "it was highlighting the rest" was a press a little early for
  beat 3 landing in beat 2's rest. (The report said a third of a beat; the
  window is already about a third, so a third would have changed nothing.)
  Anything else is a rest tap or one tap too many. Steps 1–2 need a clean take.
- **The verdict names the reason** (playtest 1, §4.1). `bsmashTakeIssues()`
  lists what went wrong in time order, each one reason: `wrongPad`, `short`
  (let go too soon), `early`, `late`, `missed`, `rest`, `extra`. The first is
  said (`beat.take.why.<reason>`, Tango's or Riff's) and marked most strongly
  under the staff, "early" or "late" written under it. Riff's *"Hold those long
  notes right through"* is now his line for `short` only: it used to be his
  line for every failed take, which is what Rob heard as the holding being
  "intolerant". **Takes are counted**: "Take two", "Take three"… (§4.2),
  from 1 on each new roll and again after the reveal.
- **The teacher's view**: with the teacher code on, the last take note by
  note in ms under the reading (`#beat-take-stats`), so the window and the
  holding rule can be tuned from real play. A child never sees it.
- **Four and eight bars need the age's pass mark** (hits over notes plus
  extra taps) **and** the first note after any slip's barline played: that
  is "back in by the next beat 1". The studio needs the pass mark alone.
  The window starts 40 ms wide of the age's and tightens 5 ms per clean take.

- **The pathway is five squares**: **Warm-up** first (Rob, playtest 2), then
  the **Song** (see "THE SONG" below), then Tango · Drums, Riff · Bass, Riff ·
  Keys. The song square opens once the jam has been played, and the musicians
  once a song is chosen; with the teacher's Open code every square is open and
  Beat Smash opens on the pathway rather than in the jam.
- **Every step reached can be played again** (Rob: *"I'm locked out of being
  able to replay the previous level"*). Each musician shows a chip per step:
  One bar, Two bars, Four bars, Eight bars, The studio, and My band
  once won (and My Permit once the band is complete). Going back
  is practice: the stars fill as usual but the saved row (`streak`) belongs to
  the step the student is working on (`bsmashOnRecord()`), and clearing an
  earlier step never moves `step` backwards.
- **A sitting can end anywhere and the next picks up there** (Rob,
  2026-10-03: *"my mum has just come in the room and told me to go and take
  out the rubbish. I should be able to close the game and the game remembers
  how far I'm through… this song might take more than just one sitting"*).
  The step and every star were already saved the moment they landed; what
  was missing was the student being told, and three things that were lost:
  - **The pathway says where they're up to**: the step's chip carries its
    stars (`Four bars ★★☆`, `bsmashStepName()`), Start reads **Carry on**,
    and the guide box says *"Welcome back! You're up to…"*
    (`bsmashWhereUpTo()`: `new` / `carry` / `passed`).
  - **The studio's bars are kept** with the musician (`studioBars`,
    `bsmashStudioBars()`), so the 32 bars are the same song in the next
    sitting. Rolled again only if the teacher changes the studio's length;
    a new song resets them with the band.
  - **A studio take at the pass mark is saved before Keep** (`studioPassed`).
    Closed before choosing, the next sitting says the take was a keeper and
    Start (**Choose my part**) goes straight to the part picker. Keeping a
    part clears it.
  - **A guest's progress is on the device** (`koolRiffsBeatGuest`), not in
    memory: a warm-up and a song chosen before any name survive the tab
    closing, and move to the player when one is added. The teacher's Reset
    clears it with every other `koolRiffs*` key.

**Calls made where the brief left room (Rob to confirm):**
- **One die per bar**, its face the bar's four dots (§4). §4.1 says "four
  dice" for one bar; the two sentences disagree.
- **On the four beat pads, the pad IS the beat** (Rob, 2026-10-01,
  **reversing** an earlier call that any pad counted): *"If you press button
  number one at what should be beat number three, then we need to call an
  alert to tell them to follow along the beats. Get on the beat."* A note
  played in time on the wrong pad sounds, but isn't clean (`wrongPad`), the
  right pad lights, and the verdict says to follow the beats round instead of
  "Take two!". **Four pads are now the default on every step** (*"the 1 2 3 4
  is probably more what we are trying to drum in at this point in time"*);
  the one big pad is a setting. Keys `1 2 3 4` play the four pads, Space the
  one pad.
- **Tango's part is a juicy kick** (`drum.padKick`). It was a cowbell
  (playtest 2), **reversed by Rob after playing it**: *"Get rid of the
  cowbell. It just doesn't work. It's actually a pitch, so it's easily out of
  key or out of tune... a clave sound, or back to the kick, if we can make
  that kick nice and juicy."* A drum with no note in it: a body falling 130 to
  48 Hz, and, since a phone speaker plays almost nothing below 150 Hz, a knock
  and a soft saturation that put the punch where a phone can play it.
  Measured: 0.67 peak alone, 0.91 over the busiest band, and 1.4× the
  cowbell's energy above 150 Hz. The **clave** is the teacher's other choice.
  **The sound rows (and the studio length) are the teacher's only**
  (`KR.openAll()`): *"the user doesn't need these settings"*. Pads and the jam
  song stay for everyone.
- **A miss on the first star just repeats that go** (the stars were already
  empty), so the child still sees the bar in notation. From the second star
  a miss empties the row and the bar is retaken (§4).
- **EVERY CLEAN PLAYING EARNS A STAR** (Rob, 2026-10-05, on Riff's eight
  bars: *"I just completed my first one correctly and I look up and the star
  has not appeared… make sure the first star always appears after a correct
  playing… If it's waiting to the second correct answer before you get one
  star, then I think we've added on an extra layer of difficulty and too much
  time. And boredom."*). Two places held a star back, and both now land one:
  - **A clean retake** (the bar replayed after a miss) is the **first star of
    the new row**. It used to earn nothing and roll again, so the star came
    on the playing after.
  - **The first star's picture go** earns the first star, then the reveal,
    and the same bar read from the notation is the **second** star
    (`bsmashStarLands(bsmashReveal)`; the reveal take is `star2`). It used to
    wait for the notation go. If the name is asked after that first star, the
    reveal waits for it (`bsmash.afterName`).
  The rule of three is untouched: three clean playings in a row clear a step,
  and a miss still empties the row.
- **The name and age are asked after the first star**, never before (§11).
  Until then progress is the guest's, kept on the device, and moves to the
  player when added.
- **Every event with several lines takes turns** (`KR.event` in `text.js`,
  the §8.3 build note). An event with one line is unchanged, and tested.
- **Ages 6–8 / 9–10 / 11+**: windows 220 / 195 / 170 ms, pass marks 80 / 85 /
  90%. All the tunable numbers are the constants at the top of the file.

### Riff on bass (Phase 2, first half) — built 2026-10-01
Rob: *"Riff is coming to do the bass… I'll be guided by you."* The second
musician, won the same three steps as Tango, through the same engine. What is
his own:

- **The dice** (`BSMASH_MUSICIANS`, `id: 'bass'`): half notes and half rests
  join the quarters, and the syncopation `q h q` (§5). The pool gives the
  brief's **36** legal bars. His one-bar step is a ladder like Tango's,
  climbed by clean takes: `h h` (the bass's own halves, and the re-strike on
  beat 3) · a half and a half rest · halves among quarters · the syncopation ·
  all 36. Steps 2 and 3 roll from all 36.
- **Holding is the skill.** His pads play electric or acoustic bass (a
  "Bass sound" row on the pathway for the teacher), on the bar's root, and
  **sustain while held**. A half note let go before the middle of its second
  beat (the start of it, on touch) is short and the take isn't clean; this
  rule was always in `bsmashRelease()`, his steps are the first to use it. In
  the picture go a long note **fills beat by beat while it is held**
  (`bsmashTakeFrame()`), so one let go early is left half filled (§4.1).
- **He coaches his own steps.** `bsmashEvent()` plays `'<event>.riff'` when
  Riff's steps are on and that event has lines of his; everything else stays
  Tango's (she still counts in: she is the drummer). His intro the first time
  in: *"A half note lasts two beats: press, and HOLD it right through."* His
  lines are `beat.riff.*`, placeholders for Rob.
- **The band under his takes is the band won so far** (`bsmashBandSoFar()`):
  the student's drums part, never the bass being earned.
- **His picker** is Tango's, with his title, his words (*"That gives me a
  great idea!"*, brief §8) and the three bass loops; Keep lights the bass
  channel. The pathway then says the keys are coming.

### Riff on keys and the Learner's Permit — built 2026-10-01
Rob: *"Let's move on with Riff and the keys… build out this first section."*

- **Riff on keys** is one more musician entry: whole notes and whole rests
  join everything before, 38 legal bars (§5), Rhodes or organ, sustained
  while held. His one-bar ladder mixes whole notes with halves (§5's default:
  the whole note · whole and halves · longer notes among quarters · all 38).
  **A one-bar take is never a bar of silence** (`bsmashHasNote`): a whole-rest
  bar is in the pool, but a take with nothing to play teaches nothing.
- **The booth is gone** (Rob, 2026-10-01): every musician now ends in their
  own studio take (see "THE STEPS AND THE STUDIO" below), so a separate
  "your turn" at the end would repeat it. **The Learner's Permit** is
  awarded when the band is complete, the third part kept
  (`bsmashKeepPart`). The card (`bsmashShowPermit`, `#beat-screen-permit`)
  is as before: the L plate (black on yellow, as on a Victorian learner's
  car), their name, their band and the date, presented by Tango, saved as
  `progress.permit`. "Show my Permit" leads to it after the third part is
  kept, and a "My Permit" chip stays on the pathway.
- **Not built, ruled:** the L plates opening Value Smash (§15). It is one
  guarded line at the top of entering Value Smash, as Stomp Lab's gate is, but
  it closes a game Rob is still testing, so it waits for his word.

### THE STEPS AND THE STUDIO — Rob's ruling, 2026-10-01
> *"We're building up to it from three times for one bar, three times for two
> bars, three times in a row for four bars, three times in a row for eight
> bars, and then the 32… That wins you a chance to get into the studio and
> lay down your own 32 bars. If you can lay down 32 bars, you get to choose
> that instrument."*

This **reverses** the big take of the first build (four bars, read it, then
press Record) and the booth that followed the band. Rob, on the four-bar
Record button: *"I'm a bit disappointed when the four bars comes and now I
have to press record. I think it should just come the normal way."*

- **Steps 1–4 all run the same way** (`BSMASH_STEP_BARS`: 1, 2, 4, 8 bars):
  dice, the count-in, straight into the take, the fading picture, three in a
  row. One and two bars need every note right; four and eight need the age's
  pass mark **and** the comeback rule (back in by the next beat 1), the old
  big take's marking (`BSMASH_CLEAN_STEPS`). Eight bars use the closer lines
  (`#beat-screen-studio.long`).
- **Step 5 is the studio** (`BSMASH_STUDIO_STEP`): **32 bars once through**
  (`BSMASH_STUDIO_BARS`; 16 and 8 are a teacher's setting for trying it out),
  over the band so far, notation only, the same 32 bars every take (*"the
  song is the song"*), no dice. Graded by the age's **pass mark alone**: over
  32 bars one lost bar shouldn't sink a take, so the comeback rule coaches
  ("Find one!") but doesn't fail it.
  - **The transport** (`#beat-transport`, `bsmashTransport()`): **Record**,
    **Listen**, **Stop**, and **Keep it** once a take is at the pass mark.
    Rob asked for record, play, pause, stop *"or some sort of that hybrid"*:
    Stop ends a listen-back or abandons a take (nothing marked). A pause in
    the middle of a recording would be a take that never happened, so it
    isn't there.
  - **The control room** (`#beat-control`, `bsmashControlRoom()`): the take's
    score on a meter, the pass mark a line across it (*"Let them know how they
    go from the recording control room"*). Tango runs it whoever's part it is.
  - **Listen back** plays every press of the take in the student's sound,
    from the same bar of the song, and the music scrolls with it. Then they
    decide: keep it, or go again (*"They can listen back and decide if
    they're happy, and then they can try it again"*).
  - **Keep it** opens the part picker: the instrument is theirs to choose.
- **A long take turns its pages** (`bsmashTurnPage`): four lines on a phone
  (three under 700 px tall, `BSMASH_SHORT_SCREEN`, so the transport and the
  pads both fit), two on a wide screen. The moment a line has been played its
  row fills with the next line to come, a musician's half-page turn: nothing
  moves under the line being read, and every line after the first carries its
  bar number. After the take every line opens, scrolled to the first slip.
- So a student now reads at least **12 phrases of four bars and more, and a
  32-bar take, per musician** before choosing that musician's part.
- **The steps are spots to FIX UP** (Rob, playtest 2: Riff and Tango ask you
  to fix a few spots, then you play the whole part). Only the words: the
  intros and the step lines say "spot", the studio says "the whole part". The
  bars are rolled, as before; Rob: random is fine.
- **Takes sit on the band's four-bar loop** (Rob, playtest 2: *"four-bar
  phrases are so important"*). `bsmashTakeStartBar()`: four and eight bars
  start at the top of the loop, counted in on its bar 4; two bars start on
  bar 1 or 3; one bar anywhere. The waiting is bars of the groove, so it is
  never dead time. `#beat-loop` (`bsmashLoopGuide`) shows the four bars of
  the loop in the header: the one sounding, and the one that counts in.
- **A press just before the barline plays the next chord**
  (`BSMASH_ANTICIPATE_BEATS`, the last quarter of a beat): the anticipation
  Rob asked for, the same rule the band's keys follow.
- **Pause, in the studio** (Rob: *"I just want to pause, right where I'm
  at"*). `pauseBeatTake()`: everything from the top of the bar being played is
  forgotten and the band plays on; **Resume** (`resumeBeatTake()`) picks up
  from the top of that bar, counted in by the bar before, **in the same place
  in the loop**, and the take is marked as one. Record, Listen and Keep hide
  while recording or paused.
- **A green line follows the listen-back** (`.bsmash-playline`,
  `bsmashFollowPlayback`): it rides the notation's own slot grid, so it lands
  on the notes. Listen-back starts from the take's place in the loop, so it
  can wait up to a loop; the line waits at the start of the music meanwhile.
- **Next, proposed and NOT built:** Rob's own parts to choose from (cáscara,
  tumbao, montunos…), and building a song with its form:
  `docs/beat-smash-parts-proposal.md`. Song by song, each a tier up:
  `docs/beat-smash-songs-proposal.md`. Both need Rob's answers.

**Playtest 1 (Rob, 2026-10-01)** is written up in
`docs/beat-smash-playtest-1.md`: what he saw, the diagnosis checked against
the code, and the proposed changes, marked clear fix / question / Rob's call.
The biggest finding: Riff's *"Hold those long notes right through"* is his line
for **every** failed take (`beat.take.again.riff`), so takes that failed for
another reason (an early press landing in a rest, most likely) blamed the
holding. **The clear fixes (§6 item 1) are built**: the verdict names the
reason, a press just before a note is early (not a rest tap), the teacher's
ms view, numbered takes, "as long as you can", "Follow me!", the Counting
picture gone, "Next: Riff · Bass" after Keep (and a playback line for the
drums alone: *"That's your drum part. The band starts here."*), and the
drum balance. Still open from it: the jam to Rob's spec (§2.2), the
mentors' language (§3.2), REC with pause (§4.4), reggae (§5.2), the jam
songs (§5.3) and the reviewers' questions.

**The drum loops' balance** (playtest 1, §5.1, *"All we're getting is a kick
drum"*): measured, the upper kit (2–8 kHz) sat 14–20 dB under the kick's
low end. In the loops the kick now plays at 0.6 and the upper kit at 2×
(`LOOP_KICK`, `LOOP_UPPER` in `beat-smash-band.js`; the student's own pad
kick and the fill are untouched), which brings it 9–10 dB closer in every
style and lifts what a phone speaker plays (above 300 Hz) by about 4.5 dB.
The loop files were re-rendered with `render.js`.

**Not built yet:** "my bit";
Tango noticing "You didn't need the blocks!"; re-offering calibration when the
audio output changes (there is a **Re-time my taps** button instead); art
(the picker shows each style's icon until `KR.art['beat.drums.spicy']` etc.
exist). Sharing and swapping a part are built: see "MY BAND" below.

### THE SONG: chosen after the warm-up, and the band is built on it
Rob, 2026-10-02: *"We should be able to audition each chord progression and
select the progression they want to develop into a rhythm section. That means
all of their 1, 2, 4 and 8 bars are backed by the chord progression... And
their 32 bar is over that same chord progression."*

- **The order:** the warm-up (unchanged: *"We control that first minute and
  hook them in"*), then **the song**, then Tango, Riff on bass, Riff on keys.
  The pathway is five squares; the musicians wait for a song.
- **The song chooser** (`#beat-screen-song`, `showBeatSongs()`): the songs in
  `KR.bandSongs` (`content/songs.js`), each a card with a fun placeholder name
  and icon (`song.<id>`, `song.<id>.icon` in `lang/en-US.js`: Sunrise, Lemonade,
  Skate Park, Moonwalk, Night Owl, Bubblegum, Rollercoaster; Rob: *"just short
  little names... they're just going to listen to it"*). The Roman numerals
  show on the cards only with the teacher's Open code. A **tap auditions**:
  plain piano chords, a whole note each, the root in the left hand
  (`guide:<song>`), over a little click (`click`).
- **Each song's audition is Rob's to write** (*"a basic, interesting enough,
  four bar phrase, so that they can see potential in rhythm with it... maybe a
  little drum and bass part, but keep it really simple"*): `audition` in
  `content/songs.js`, a four-bar `phrase` in note values with pitches
  (`'q:E5 q:G5 h:A5 | ...'`, played on a soft lead, `phrase:<song>`), and
  optional `drums` and `bass`. Sunrise carries an example of Claude's to show
  the shape. Measured with all of it playing: 0.87. Nothing of the audition
  carries into the steps: `startBeatMusician` drops every part that isn't the
  band so far.
- **The framing** (Rob: *"we will tell the student that this is just the
  shape of things to come... we've got to finish these songs off. Help us
  finish these off so you can get into the studio"*): Tango says so on the
  song screen, and again when the song goes in the box.
- **Hold and slide up to add** (Rob, after Balatro: *"you click on it and hold
  it down, and then a box above appears, and it says add, so you just slide it
  up to the box and drop it in"*). A card held `BSMASH_HOLD_MS` lifts and
  follows the finger; the Add box appears above (its space is kept while
  hidden, so nothing moves under a finger); dropped in it, that is the song.
  An **Add <song>** button does the same for a keyboard or a child who would
  rather press. Then straight into the band's next musician. **The part
  picker adds the same way** (*"they're going to be able to add them as they
  win their parts"*): hold a part, slide it into its box, and it is in the
  band; Keep still works. One helper, `bsmashDragToAdd()`, does both.
- **MY SONGS: every song keeps its own band** (Rob, 2026-10-04: *"I want to
  make another song and go through the whole process again. 1, 2, 4, 8 and
  32 bars… I wouldn't care if they got halfway through and abandoned one song
  and then went back and started another. They can have a list of songs."*).
  This **replaces** "choosing another asks first, and the old band is kept":
  choosing a song now puts its band on exactly where it was left
  (`bsmashSwitchSong()`), a new song from the beginning, a song already begun
  carrying on with the musician and step it was up to. Nothing is lost by
  switching, so nothing is asked. The bands not playing wait in
  `progress.bands` (`{ song: { musicians, mix } }`; the old `progress.songs`
  list is read in by `bsmashBands()`). Each song card says how far its band
  has got (`★ Finished`, or `Bass · Four bars`: `bsmashBandStatus()`). The
  way back to the songs: **Make another song** on My band, and with a band
  complete the pathway selects the song square, so Start reads **My songs**.
  The Learner's Permit, earned once, stays. A band begun before songs existed
  keeps I IV I V (`BSMASH_DEFAULT_SONG`), which is what it was built on.
- **The band follows the song.** Bass and keys parts are played live over it:
  `'band:<song>:<style>'` (`beat-smash-band.js`), the same spicy / smooth /
  hop patterns taking each bar's root and the song's voicing
  (`bandChords()`). Drums are still the loop files: no chords. Until the keys
  are won (or while the student plays them) the **guide piano** holds the
  chords under every take, so the 1, 2, 4 and 8 bars and the studio's 32 are
  all over the song. The student's own bass and keys pads play the song's
  chord for the bar (`BeatSmashBand.chordOf`, anticipation included).
- **Levels, measured:** every song with every drum, bass and keys style peaks
  at 0.87 at worst (the C loops: 0.85), after `BAND_TRIM` (0.85) on the live
  band parts; the guide under drums and bass, 0.79; the audition, 0.65.
- **The warm-up's own jam-song setting is unchanged** (Rob: the first minute
  stays as it is). It now shows the same fun names.
- **Nothing is locked once a band is complete**: the warm-up, the song, and
  every musician's steps, studio, My band and Permit can all be played again
  (checked, after Rob felt *"locked out"*).
- **Next, from Rob:** he will write the voicings, the arrangement and the
  parts himself (*"I am a composer, so I might as well put myself to good
  use"*); the bass and keys styles are reused across songs until then. The
  song's form (AABA and the like) is still not shown.
- **Songs will prove their levels** (Rob: *"over time I can add more complex
  rhythms into these songs and they can be rated a little bit more
  challenging"*). Songs now carry a **level**: Level 1 is every song without
  one (whole, half and quarter notes); Night Owl is Level 2 (eighth notes,
  first steps) and Skate Park Level 3 (off-beats and the push). See "THE
  EIGHTH-NOTE SONGS" below.

### THE EIGHTH-NOTE SONGS: rhythm levels carried by songs
Rob, 2026-10-04: *"Let's use one of the songs we've made to become the
container for the beginning of eighth notes… This song will only be available
when they have created a song with whole notes, half notes and quarter notes…
If they can make 32 bars correctly, I think we've made a huge leap forward."*

**SONG LEVELS.** A song in `content/songs.js` may carry `rhythm` (the dice
it is read with, a key of `BSMASH_RHYTHMS`), `level` and `bpm`. A song of
Level 2 or more shows locked, named, with "🔒 Finish a Level N song first",
until a band is finished on a song of the level below (`bsmashSongOpen()`,
`bsmashSongLevel()`; the teacher's Open code opens them all). The card says
its level ("♪♪ Level 2 · Eighth notes").

**LEVEL 2: NIGHT OWL (`c-2-5-1-6`), EIGHTH NOTES FIRST** (Rob, 2026-10-05:
*"If Level 1 is the first song and covers w, h, q notes and rests, then level
2 would be adding in eighth notes. Rules for Night Owl (Level 2): no
syncopation, no er on the down beat, er only happen on the upbeat. Make sure
to include whole notes or rests 5% in Level 2's 4-bar and 8-bar and
32-bar."* His examples: `ee q q q`, `q ee q q`, `q q ee q`, `q q q ee`,
`ee h q`, `q ee h`, `q h ee`, *"not exhaustive… come up with as many
possibilities as you can"*).

- `BSMASH_RHYTHMS.eighths`, **the same rules for drums, bass and keys**
  (`BSMASH_EIGHTHS_PART`): they are the level's. Bars are built from beat
  cells that keep the downbeat, `q`, `qr`, `8 8`, `8 8r` (the eighth rest
  only on the "and"), with `h` on any beat it fits (`halfOnAnyBeat`: his own
  `q h ee` is Level 1's named exception, the minim on beats 2–3) and `hr`
  where the engraving rules allow. Nothing starts off a beat and lasts past
  it, so there is no syncopation; measured, no bar breaks either rule.
- **1 and 2 bars** (`'quavers'`): his seven examples are half the rolls, every
  other bar of the cells the rest. The one-bar ladder: his four `ee` + three
  quarters first, then the three with a half note, then all seven, then the mix.
- **4, 8 and 32 bars** (`'wholes'`): every eighth-note bar, and a whole-note or
  whole-rest bar in `wholeShare` (5%) of the rolls (measured 5.1%).
- 80 bpm, like Skate Park; the quaver window and early/late rules are the
  same. Each musician's first time in says what is new
  (`beat.eighths.intro.<id>`).
- **Skate Park became Level 3** because it is the harder one: the eighth rest
  ON the beat and the push are what Night Owl rules out. So it now opens once
  Night Owl's band is finished. One word to change (`level` in its song
  entry) if Rob wants it back beside Night Owl.

**LEVEL 3: SKATE PARK (`c-4-1-5-1`, IV I V I), OFF-BEATS AND THE PUSH**, the
first eighth-note song built (2026-10-04):

- `rhythm: 'quavers'`, `level: 3`, `bpm: 80` in `content/songs.js`.
- **Rob's figures** (`BSMASH_RHYTHMS.quavers`): Tango `q q q 8 8` on the kick
  and the off-beats `8r 8 8r 8 8r 8 8r 8` on the hi-hat; Riff's bass `8r 8 8 8
  8r 8 8 8`; Riff's keys `h 8 8 qr` and the syncopation `8 q 8` (as `8 q 8 h`
  and `h 8 q 8`). Each musician also has **cells**, the pieces a bar is built
  from (a beat: `q qr`, `8 8`, `8r 8`; two beats from beat 1 or 3: `h`, `hr`,
  `8 q 8`; the keys' `w`), and every bar they make passes the engraving rules.
- **Weighting** (Rob: *"in the 1, 2 and 4 bar figures, weight the notation
  heavier in favour of quavers. When we reach the eight bar and 32 bar…
  include the quarter notes, half notes and whole notes in amongst it so it's
  nice and evenly balanced"*). Steps 1–3 roll **'quavers'**: Rob's figures for
  half the rolls, every other eighth-note bar of the cells for the rest. Steps
  4–5 roll **'balanced'**: half the musician's own first-song bars, half
  eighth-note bars (measured: 50/50 for every musician). The one-bar ladder
  starts with each figure on its own. Weighting is by repetition in the table
  (`bsmashRhythmTable()`), so the roll is unchanged.
- **The hi-hat**: on Skate Park's drums a bar with no note on a beat is played
  on the hi-hat (`bsmashIsHatBar()`, `drum.padHat`, built loud enough for a
  phone like Stomp Lab's tap snare). The listen-back, the kept take
  (`hatBars`) and the recording all play it.
- **A slower song** (Rob's answer to "tighter window or slower song?"). The
  tempo is the song's: `BSMASH_BPM`/`BEAT`/`BAR`/`LOOP` are set by
  `bsmashSetTempo()` when a new band starts, from the song in play
  (`bsmashTempoSong()`: the one auditioned on the song screen, else the
  band's; the warm-up stays 100), and `BeatSmashBand.setTempo()` moves the
  synth with it. They change only while nothing is playing: auditioning,
  starting a musician or opening My band on a song at another tempo starts
  the band again. The loop files are 100 bpm, so at any other tempo every part
  is the synth's (`bsmashPartLoopId()`).
- **Timing on quavers**: at 80 bpm an eighth note is 0.375 s, so the window is
  capped at half an eighth either side (187 ms; `windowQuavers`), and a press
  is a note early or late within 0.375 of a beat (`nearBeat`), not half a beat.
  The pad is still the beat: an eighth on the "and" of 2 is pad 2.
- **Specs are in BEATS** everywhere in Beat Smash (`spec.slot`, `spec.slots`:
  an eighth is 0.5), so timing, pads and grading read the same on both grids;
  `bsmashGridSpecs()` turns them into the grid's slots for `renderRstompStaff`,
  and the picture is a square per grid slot (an eighth is one square, a quarter
  two). The dice show eight pips. A picture step on a phone puts one bar to a
  line, so the eighth-note squares have room.
- **A fix found on the way**: Stomp Lab's `pulseX` reads its grid globals when
  it is *called*, not when the staff was drawn, so Beat Smash's picture, cursor,
  marks and play line measured against whatever grid Stomp Lab had last. Every
  call now goes through `bsmashWithStompGrid` (`entry.slotX`, `entry.x`).
- Each musician's first time in says what is new (`beat.quavers.intro.<id>`).
- **The song test that used Night Owl** as an ordinary song now uses Bubblegum
  (Level 1): Night Owl is locked on a fresh device.

### MY BAND: the song they built, theirs to play with
Rob, 2026-10-03, after finishing his first band: *"Once you've earned a song,
you should be able to go and play with it."* And on sharing: *"It's my fun…
the way people put jibbitz on their Crocs. They're not going to share it, but
what they will do is send it off to their teacher, along with statistics. And
we can wrap that into a nice report."*

- **Their own playing is in the band.** A studio take at the pass mark is
  saved as `passedTake` (each press as `[beat in the take, beats held]`, its
  pad sound and score: `bsmashTakeData()`); **Keep it** makes it the
  musician's `take`. Until this, My band played only the style loops and the
  32 bars the student recorded were thrown away. A press's beat is fixed when
  it is pressed (`p.beat`), because a pause and resume moves `take.start`; the
  listen-back uses it too, which fixed a paused take playing back shifted.
- **Re-record to beat your score.** A won musician's studio is still open;
  Tango names the score to beat (`beat.studio.retake`), and Keep puts the new
  take straight into the band.
- **The mixer** (`#beat-screen-band`, `bsmashRenderMixer()`): per musician,
  **ME** (their take, on or off) and one of the musician's parts, or Off.
  Saved per player as `progress.mix`; a toy, nothing earned or lost. Every
  part Rob writes for a musician appears as a chip, so more parts mean more to
  play with. With nothing on the keys, the guide piano holds the chords.
- **Me plays on the band's clock** (`bsmashMeStart`, `bsmashBookMe`, booked
  each cycle by `bsmashTick`): the take loops four bars to a cycle, so every
  chord falls where it fell in the studio (a studio take always starts at the
  top of the loop), and a press just before a barline plays the next chord.
- **The numbers for the teacher** (Rob: *"gather their statistics over the one
  bar, the two bar, the four bar, the eight bar, and the 32 bar"*). Every take
  of every step, practice included, adds to that step's row in
  `record.stats[step]` (`bsmashRecordStats()`): takes and passes, notes right,
  every reason a note went wrong, ms off the beat and the lean, best score.
  **My report** (`#beat-screen-report`) shows them by musician and step, with
  the nickname, the song and the last beat test. One function
  (`bsmashReport()`) feeds the screen, the picture and the message, so they
  can't disagree.
- **The recording** (`bsmashRenderBand()`): the band as mixed and every kept
  take, rendered in an `OfflineAudioContext` with the game's own synth, as a
  mono WAV (32 kHz, about 5 MB for 32 bars), with the report as a PNG with the
  L plate (`bsmashReportImage()`). **Two taps, on purpose**: rendering takes a
  moment and a share must come straight from a tap, so **Make my recording**
  becomes **Send to my teacher** when it is ready. The phone's share sheet
  sends it; with none, the files are saved to the device. Changing the mix
  makes it again.
  **Each four-bar cycle is booked just before it plays** (`ctx.suspend`): the
  browser works through every sound booked for the whole render, sounding or
  not, so booking all 32 bars up front made the time grow with the square of
  the length. Measured: 80 s of band took 120 s to make, now 13 s.
- **Nicknames, not names** (Rob: *"don't worry about their names, because
  we're not really asking their names… their own nickname. I don't want to
  know who they are anyway."*). The player prompt asks for a nickname; the
  report says "Nickname:".
- **The big idea this points at** (gold records on a wall, the charts, every
  award renamed to fit one metaphor for the whole app) is written up in
  `ideas/gold-records.md`. Not built; not named yet.

### The beat test — what the numbers could do (proposal, not built)
Rob asked for a "handicap": *"They tap that beat for 15 seconds. If they're 95%
or 100% you know where they are. If they're sitting at 65% we have to make sure
we address that… you really just need to compete against yourself."* The jam
now records the numbers; nothing uses them yet. Proposed uses, for Rob to rule
on: the **lean** already sets the calibration; the **steadiness** could set
each student's own timing window (their spread plus a margin, never wider than
the youngest age's window, tightening as the spread shrinks); **onBeat** under
about 70% could send the student back to the jam before reading; and the
history, kept per player, is the chart of maturity over weeks. Children
tapping to a beat typically stray more the younger they are, which is the case
for measuring each child rather than assuming by age.

### ROB'S SONGS: chords, voicings and comping rhythms as data
Rob: *"If I can dictate the choice of piano/keys voicing then I can write my
Barry Harris rules into the backing track."* So a song is **data he writes**,
in `content/songs.js`, and the synthesised band plays it live (he likes the
synth sound: *"I think it's part of the generation"*). Per bar: a chord name
(for reading), a bass note (`'C3'`), and the Rhodes voicing, bottom up
(`['G4', 'A4', 'C5', 'E5']`), played exactly as written. `comp` names the
keys' rhythms in his own note values: `w h q 8 16`, `.` dotted, `r` rest,
repeated to fill four bars.

- **Written once, in C, then transposed:** `{ like: 'c-6dim', transpose: -4,
  chords: [...] }` is the same song a major third down, with its own chord
  names. A song can only be `like` a song written out in full.
- **The progression, as Rob corrected it (2026-09-30), in C:** C6 with G A C
  E on top (second inversion) · the outside voices down a semitone, F# A C Eb
  over Eb · down again, F A C D over D · the F becomes F diminished over G, F
  Ab B D, the flat nine. The inner A and C hold for three bars. **This
  replaces his first message's voicings**, which he called a draft.
- **The comping is PUMPS, and a list of them.** Rob: *"Just use the different
  pumps. They can be long, they can be short. They can be connected together,
  tied together… balance that against some downbeats. I'm interested to see
  how loose we can make it. But tight."* `KR_COMP_PUMPS` is six four-bar
  rhythms (long pumps, short pumps, pumps tied into 3+3+2, downbeats). A comp
  that is a list plays **a different one each time round**, never the same
  twice running; `'pumps#2'` names one. The 3-3-3-3-2-2 rhythm from his first
  message is gone: *"That was too big."*
- **The anticipation is a rule, not a setting:** a hit struck before a barline
  and held across it plays the NEXT bar's voicing. `BeatSmashBand.songHits()`
  is the one place it lives.
- **The bass plays its OWN line, by style — it never copies the keys.** Rob:
  *"The only pump rhythm a bass plays is dotted q, followed by eighth. It
  mostly plays according to the style of music. The tumbao in Cuban music.
  Half notes in traditional choro or bossa nova. Quarter notes for walking in
  steps towards the next root note of the next chord."* (An earlier version
  put the bass on every keys hit; that is what he corrected.) The styles are
  rules in `beat-smash-band.js` (`bassLine()`), made from each bar's root and
  its voicing's notes: `whole`, `halves` (root, fifth), `pump` (q. 8 only),
  `walk` (quarters, a half step into the next root, kept between C2 and A3),
  `tumbao` (beat 1 silent, the next chord's fifth on the and of 2, its root
  on 4 held over the barline). **"The fifth" is the chord's own**: the voicing
  note nearest a fifth above the root, so a diminished chord gets its
  diminished fifth. A song's `bass: { whole, groove }` names which style the
  jam plays; both 6-dim songs groove on `walk`, one word to change.
- A part is named `'song:<song>:<comp>'` and can join mid-loop from its next
  hit. Live parts go through `BSMASH_LIVE_SCALE` (0.47), the factor the loop
  files were rendered at; without it a song clipped at 1.46. A song's bass
  sits a little lower again (`SONG_TRIM`), because a walking line sustains
  under everything: the loudest song and style now peaks at 0.89.
- **Hear them in `tools/beat-smash-band/lab.html`**: pick the song, a keys
  rhythm (each pump rhythm on its own, too) and a bass style.
- **THE JAM SONG MENU is Roman numerals** (Rob, playtest 2: *"get rid of
  [the others] and bring back chord progressions… we'll just keep those
  Roman numerals, those jam songs. And then later we can give them names."*).
  `KR.jamSongs` in `content/songs.js` is the menu, in order: the C loops
  (I IV I V), then I IV V I, IV I V I, ii V I, ii V I vi, I vi ii V,
  III7 VI7 ii V, all in C, one chord a bar. **Every voicing is Claude's**,
  for Rob to replace. *"Five, five, one"* in the recording was taken to be
  ii V I. His six songs below are off the menu but kept; adding an id to the
  list puts one back.
- **The C loops change chord ON the barline.** Rob: *"It moves at funny
  times; it really needs to be one bar on the one, one bar on the four."* The
  Spicy and Smooth keys used to play the next chord on the "and" of 4, and
  the Smooth bass stepped into the next root there. Both stay in their own
  bar now, and the loop files were re-rendered.
- **Six songs of Rob's:** `c-6dim`, `c-6dim-tritone` (the last chord ♭II7(♭5)), both
  in A flat, `bb-rhythm-changes` (Rob's `||: Bb6 G- | C-7 F7 :||`) and
  `d-minor-two-five` (`Dm6 | Em7b5 A7alt`). **Open for Rob:** the ♭II7(♭5)
  voicing and every voicing in the last two are Claude's, since he gave
  chords only. B♭ holds a D on top throughout; D minor moves every voice by
  a half step or holds, so the alt chord falls back into Dm6.
- **Two chords in a bar, and short loops.** A bar is one chord or a list
  (split evenly, or by `beats`); a one- or two-bar song repeats to fill the
  four-bar cycle, so the song clock never changes. `findSong()` lays every
  song out as `changes` (`{start, beats, chord, bass, keys}`), and a hit's
  `chord` is an index into them. **The anticipation is now one rule for
  barlines and mid-bar changes alike:** a keys hit that crosses a change and
  starts within the beat before it plays the new chord; struck earlier, it
  is cut at the change and the new chord struck there. So no chord ever
  sounds over the wrong bass (tested across every song and comp). The bass
  styles fit themselves to the chord's length: a walk over two beats is the
  root and a half step into the next root; the tumbao's two notes each look
  ahead to the chord after the one sounding there.
- **"The fifth" is a real fifth first**: perfect if the voicing has it, else
  its ♭5 or ♯5/♭13 (the diminished and alt chords), else the perfect fifth
  anyway. The old "nearest voicing note" gave D for an F13 voiced without C.

### The beat light and Tango's time coaching (the jam)
Rob, 2026-10-01: *"I don't think that their tap has the logic in it that says
I'm making the music go. I think the first thing is can I light this up green
because that makes the music go."*

- **One round light in the empty middle of the jam** (`#beat-light`,
  `bsmashJamLight()`). Each tap fills it: **green, dead centre** = on the
  beat (within `BSMASH_LIGHT_GREEN_MS`: 90 / 75 / 60 ms by age); **yellow,
  landing left of centre** = a bit early, **right** = a bit late (time runs
  left to right, as in the music); **red at the edge** = off the beat. How far
  the fill misses the centre is how far the tap missed. Rob asked for "that
  same icon" to show early and late, so it is one icon, not three lights.
- **It fills the middle, and the pads sit right under it** (Rob, 2026-10-08:
  *"take that circle in the middle and open it right up... right in your face
  pulsing, pulsing, pulsing, and then those buttons aren't too far away from
  it... It should all be very intimate"*). In the jam the ring is the width
  less room for "early" and "late", 38% of the height, or 520 px, whichever is
  smallest: 507 px on an iPad (it was 120), about 240 on a phone; the light,
  the meter and the pads are one group, centred under the desk, about 20–30 px
  apart. When "Show me what I played" or the stop menu shows, it shrinks to
  28% of the height to make room (measured: nothing scrolls at 820×1180,
  390×844, 360×640 or 1366×657, with or without them).
- **THE POCKET: a heartbeat when it's spot on** (Rob: *"when they're really
  spot on... it throbs, like a heartbeat... not a single pulse, maybe two quick
  ones milliseconds apart, and that's letting them know that that's the
  pocket. That's the perfect"*). One more layer inside the green: a tap within
  `BSMASH_LIGHT_POCKET_MS` (25 ms) of the student's own steady beat makes the
  ring beat twice, lub-dub, about 150 ms apart, with a brighter flash
  (`.pocket`); any other green tap throbs once (`.hit`). 25 ms is the same for
  every age, against green's 60–90: tight enough to mean something, loose
  enough for a tablet's touch timing. Counted in `jam.pockets`.
- **Holding it green** makes it glow brighter (`--run`, eight greens to full).
  Yellow still fills the meter; red is a miss and two in a row sag the band.
  So "keep it green, keep the music going" is literally true.
- **It is measured against the student's own steady beat**, as the meter is.
  A phone's sound delay and a student's steady lean can't be told apart, so
  the light can't say "you always play 40 ms early"; it can say early or late
  against the beat they have been keeping, and it catches rushing.
- **Tango coaches the time** (`bsmashJamCoach()`): what green means the first
  time it lights; **rushing / dragging** when the average gap between four
  taps is 6% short or long (`BSMASH_TEMPO_SLACK`) *and* the tap agrees, so a
  wobble isn't called a rush; and a word once eight greens are held. Never
  more than once every two bars, and coaching outranks "Find the beat!".
  Rob's own words are the lines (`beat.line.rushing.*`, `.dragging.*`,
  `.locked.*`, `.pulse`), placeholders for him to rewrite.
- The light goes when the notes appear ("Show me what I played"). It is
  **not** used in the reading steps: nothing decorative sits near the
  notation, and the reading takes have their own marks.

### The jam keeps moving: variations every four times round
Rob: *"We play a four-bar loop four times; on the fifth time that sets up a
variation of the band. And it keeps pumping away for another four bars until
another variation happens."* And the aim: *"keep them tapping… to hear what's
coming up next."*

- Once the meter is full, each time round the loop is judged at the top of
  its last bar: **held** if the band isn't sagging or stopped and the first
  three bars had at least `BSMASH_JAM_STEADY_TAPS` (6) on-beat taps. Four
  held (`BSMASH_JAM_VARIATION_EVERY`) and the drums play a **fill** in that
  last bar (`BeatSmashBand.fill`: snare building through beats 3–4, crash and
  kick on the next 1), and the band turns to the next line of directions **at
  the top of the next time round**: `bsmashBand.pending`, applied by
  `bsmashTick` just before it books that cycle, so the change is clean on the
  barline and nothing already sounding is cut.
- **A wobble loses nothing:** a time round not held simply doesn't count.
  Four dots under the meter (`#beat-jam-coming`) show how close the next
  change is: that is the "what's coming up next".
- **The directions are the song's**: `jam` in `content/songs.js`, a list of
  lines naming `drums` / `bass` / `keys` (and `'off'`), plus an optional
  `say` event. A line changes only what it names. Songs without one, and the
  C loops, use `BSMASH_JAM_SONG_VARIATIONS` / `BSMASH_JAM_VARIATIONS`.
- **The drop**: a line with `drums: 'off'` takes the drums out and Tango says
  *"You're the drummer now!"* The band has only the student's beat to go on,
  which is the pulse held from the inside: Rob's students who *"read well but
  have no sense of rhythm"* are the reason it's in every list.
- "Show me what I played" clears anything pending and puts the band back to
  Tango alone, whatever the variations did.

### Parked from Rob's first play (2026-09-30)
- **The groove grows the longer it's held**: the variations above are the
  first of it. Still to come, when Rob writes them: the bass getting more
  complicated and richer voicings within a song (a per-variation comp or
  voicing set is the natural shape).
- **Songs unlocked through progress** (Rob asked, 2026-09-30): proposed, not
  built. See the chat answer recorded in `ideas/jam-with-tango.md`.
- **A true record slow-down** when the beat is lost (see the sag, above).
- **Jam with Tango: call and response**, no notation: Tango plays a figure
  (son clave, tresillo…), the student plays it back. A game of its own.
  `ideas/jam-with-tango.md`.
- **"Playing as" in every game.** The players list is shared already; the
  other games don't use it yet.

**Tests.** `python tools/test-beat-smash.py`: the engraving sweep, the count-in
(the red ring clear of the music, the pad lit, gone at beat 1), four and eight
bars the normal way (no Record, the comeback rule), the studio (the transport's
buttons at each moment, under and at the pass mark, the control room, listen
back and Stop, the same bars every take, Keep to the picker), the pages turning
over 16 bars, the Permit when the band is complete, the studio's 32 bars on
three screen sizes,
the verdict's reasons (early, late, rest, one too many, missed, the rest edge,
the first note early in the count-in), numbered takes, the teacher's ms view,
"Next" after Keep straight into the next musician,
the warm-up's guide (the red count-in with Tango counting and the red ring,
the tick from the first beat on its own channel, the green walking the pads
until the drums join, then the pale outline, and walking again when they are lost,
held bars winning nothing before the shaker, the shaker at bar 5, the drums
taking the beat from the tick and giving it back, the tick and the green
carrying on when the band stops), the jam (the band needs a pulse: the band joining bar by bar, a player lost
and won back, a groove of their own; a wobbly start, the beat test, the
sag, the stop and its menu, a jam over a jam song and the Roman-numeral
menu), playtest 2 (takes on the four-bar loop, the loop guide, notation from
four bars, the cowbell, anticipation, Pause and Resume in the studio, the
green playback line, Open going to the pathway, the kick), the song (the five
squares, auditioning, Rob's audition tune with its drums and bass, holding a
song and sliding it into the Add box, the band
and the pads over its chords, my songs (a new song a new band, the old band
waiting, back to it where it was left, the card's status, Make another song,
the pathway pointing at the songs when a band is complete), a
part added by the same drag), My band (the mixer, ME, a take looping on the
band's clock, the mix kept, the report, the recording as a WAV and a picture,
a re-record kept into the band, a real studio take kept and every step
counted), Night Owl at Level 2 (locked until a Level 1 band, Rob's seven
examples half of the short rolls, no eighth rest on the beat and no
syncopation anywhere, whole bars about 5% of the long rolls, every bar legal
and full, the same rules for every musician, played in time and clean),
Skate Park at Level 3 (locked until Night Owl's band is finished, Rob's figures
half of every short roll, the long rolls balanced, every bar legal and full,
80 bpm from the audition on, the window, his figures played in time and clean,
the hi-hat bars, My band and its recording at 80, and 100 again on a first
song), picking up after a break (the pathway's stars,
Carry on and welcome back; the same studio bars after a reload; a passed
take kept to choose; a guest's warm-up and song kept and adopted), his songs (voicings,
transposition, every pump rhythm, anticipation, variety, every bass style,
level, two chords in a bar, the anticipation rule across every song),
the jam's variations (the dots, the fill, the change on the barline, the drop),
the beat light (green, early left, late right, way off, the glow, the pocket's
double beat, big in the middle with the pads right under it) and Tango's
rushing / dragging coaching, "Follow me" counted in time until order is
restored (and the encouragement when they stop),
Riff on bass (his ladder, his voice, a half note let go early and held through,
the band won so far, his picker and part), Riff on keys (whole notes held
four beats, the full band), the wrong pad (not clean, the line, the right pad lit; one big pad and Space
as the setting), the square blocks, all
three steps **played on the real pads with the mouse and the Space bar in time
with the audio clock**, a missed take, a rest tap, the comeback rule both
ways, the picker, replaying a step, the teacher codes, and layout at 390×844,
360×640 and 1366×657. `KR_VEXFLOW` / `KR_CHROME` let it run with no network. Run it with
`tools/check-text.py` before every commit.

## ADDICTIVE BY DESIGN: the whole app
**This REVERSES the section that used to stand here** ("The constraint that
outranks engagement", which said time at the instrument outranks time in the
app and that no streak may punish a day away from the screen). The reversal is
Rob's, made on 2026-09-23 and applied to the whole app, not just one game:

> *"That has become my overarching mission… the whole Kool Riffs game. This is
> not about long-term companionship with the young musician. It's really to seed
> their initial learning with as much repetition as possible. I don't want to
> minimise any opportunity for addictive gameplay."*

> *"It's really a three-to-six-month game in the very first beginning learning
> stages."*

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

### REPETITION IS THE DOORWAY: don't design it away
Rob, 2026-09-30, answering reviewers (other AIs) who called parts of the app
repetitive and offered "more interesting gameplay" instead:

> *"This is not just gameplay. We have to make various engines that create
> engagement with repetition, and the repetition is the doorway that
> progresses you to the next point… Of course it has to be interesting
> gameplay. What you do is you make it interesting and the repetitive
> exercise fun."*

> *"Right now they need to hit that button 10,000 times. And you have to give
> them 100,000 reasons why."*

So a proposal that **replaces** the repetition with variety is answering the
wrong question. The job is to make the same action rewarding the ten
thousandth time: the band building, the groove getting groovier, a new song,
a new figure. The warm-up jam, where he *"just wanted to keep it going"*, is
the first thing in the app he felt that about.

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
Pillars: Notation (three games, done/near-done), **Value** (Value Smash, Part V1 built on `idea/value-smash`), Rhythm (Stomp Lab, in development), Key Signatures and Intervals (not started), organised into app-wide Levels (see "SILOS AND BRIDGES"). Rob's aim, since his days at Melbourne Grammar: the addictive early-learning companion nobody has built, and the flash-card "level one" of every area of music reading. Near-term goal is a clean prototype to hand to other developers or use for an app-store-style release; Game 3 structural cleanup (item 3 above) and the fixes above are the main blockers to calling the Notation pillar finished.

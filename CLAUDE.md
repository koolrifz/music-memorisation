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

### CONSECUTIVE RESTS MAY SHARE ONE BRACKET
Rob's revision of his own rule, made while playing Level 12: *"I have to break
my rule. If there are consecutive rests of different value, they can be put
under one large bracket. As long as they are notating which count is within the
rest bracket, that's best."*

A run of rests is **one continuous silence**. Nothing new happens anywhere
inside it, and the counting's job is to name every count the silence covers —
not to show where one written rest ends and the next begins. The notation above
already says that.

**Both forms are accepted, and so is any other way of dividing the run up.**
For a bar of crotchet rest · two quaver rests · crotchet rest · crotchet, all of
these are correct:

```
(1) (2) (+) (3) 4     one bracket per written rest - what the app reveals
(1) (2 +) (3) 4       Rob's own, the two quaver rests merged
(1 2 + 3) 4           the whole run merged
```

This is **"accept either", not "merged only"** — Rob's call. The app still
writes and speaks one bracket per written rest, so nothing already learned
became wrong and Stage A's `(1 2) (3) (4)` still reads exactly as his table
says. The merging is a grading concession, not a change to what is taught.

Four things it deliberately does **not** loosen, all still marked wrong:

- a rest left **unbracketed** anywhere in the run;
- a bracket left **hanging open** at the end of the run;
- a bracket drawn **across a barline** — the run stops at the barline, because
  the bracket never crosses one and that rule is the teaching;
- a rest merged into the **hold bracket of a note** beside it. A note's held
  beats and a rest are different things; only rest-to-rest merges.

Implemented in `rstompNormaliseRestRuns()`, applied to both the student's marks
and the target's before they are compared: inside a rest run the flags saying
"a bracket opens here" and "a bracket closes here" are cleared on both sides, so
however the run was divided it compares equal. Everything listed above survives
because it is carried by a different flag, or by the run boundaries themselves.

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
| A6 | **Syncopation** | Crotchet / minim / crotchet — `1 2 (3) 4` |
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

### The keypad is the level's labels — never hardcode it
`renderRstompKeypad()` builds it from the level's label array: `1 2 3 4` at the
crotchet grid, `1 2 3 4 +` at the quaver grid, plus `e` and `a` at the
semiquaver grid. This was hardcoded to four digits and **made every Stage B
level unplayable by hand** — the student could see the `+` in the answer and
had no key to type it. Automated tests missed it because they called
`rstompKey()` directly; there is now a browser test that clicks real buttons.

### Beaming, stems and bar width
- Notes are beamed **by beat**, using the beat length the grid derives from the
  label array. Four quavers in 4/4 are two beamed pairs, not one group of four.
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
- **Notes are deliberately not restricted this way.** A minim across beats 2 and
  3 is ordinary syncopation and is exactly the figure A6 is built on. *Silence
  has to show the beat; sound is allowed to hide it.*
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

### VexFlow does not draw dots from the duration string — attach them by hand
`new VF.StaveNote({ duration: 'hd' })` gives the note the right **ticks** (the
bar fills, no error is raised) but renders **no dot** — a dotted minim comes out
looking exactly like a plain minim. `note.addDotToAll()` has to be called when
`note.dots` is set. This is done in `renderRstompStaff`; anywhere else that
builds a StaveNote from a dotted value needs the same line. Nothing shipping
used a dotted value, so this was silent until the equivalency scaffold rendered
one.

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

## The constraint that outranks engagement
**Time at the instrument beats time in the app.** Rob: *"None of this makes any
difference unless they're practising their instrument… They shouldn't live their
life on the computer. They should live their life behind their instrument."*

This is the opposite of how apps are normally designed, so it needs stating
before someone optimises the wrong number:

- A short session that clears a level and ends is a **success**.
- **No streak mechanic may punish a day away from the screen** — that day may
  have been spent playing.
- "Now go and play this" prompts are a **feature**, not an off-ramp.
- If a change would raise engagement but lower practice time, **it loses.**

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

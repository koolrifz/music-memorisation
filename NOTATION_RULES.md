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
constructed cases. **18 pass, 1 accepted exception, 1 open question, 0
deviations, 0 failures.**

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
| 3 | no note hides the midpoint | 0 of 4,800 bars |
| 4 | simple time never uses a dotted rest | 0 |
| 4 | no rest starts weak and hides a strong beat | 0 |
| 4 | whole-bar rest in simple time is a semibreve rest | correct |

## Accepted exception — ruled on by Rob

### A1. Beams and ties are mixed — ~600 beams over 4,800 bars
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

## Open question

### Q1. Notes spanning a beat inside a half-bar — 1,451 of 4,800 bars
§2 says "when a single note value would cross a beat boundary and hide a main
beat, split it and tie". §3 then qualifies it per metre: in 4/4 only the
midpoint is protected, and a note "up to the value of a minim" may span two
beats inside a half-bar. We follow §3 — so a minim on beats 3–4 stands, and
`rh h` (half rest, half note) is left alone.

*Question:* is §3 the operative rule, or do you want notes restricted at
**every** beat? The second reading would rewrite a great deal of Stage A.

## Resolved

- **A8 carries ties in 15% of its bars, and that is correct.** A8 is *at
  standard*, not a staged scaffold, so the engraving rule governs: a minim on
  beats 2–3 is two tied crotchets. Rob's ruling. A8's own point — the dotted
  minim written plainly, with no `spellOut` — is untouched.
- **A6's figure is spelled `q q q~ q`.** Rhythm and counting unchanged
  (`1 2 (3) 4`, in 300 of 300 phrases); only the spelling moved.
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

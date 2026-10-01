# Beat Smash: build report for outside review

**Level one, built end to end. 1 October 2026.**

This report is for the AI reviewers (ChatGPT, Gemini, Grok) whom Rob, the
designer, will ask to assess the build. It covers four things:

- what has been built;
- the gameplay and teaching purpose of each piece;
- where each piece lives in the code;
- what has already been decided, so a review can start from where the
  project is now.

The last section lists the questions we most want answered.

- **Play it:** https://koolrifz.github.io/music-memorisation/ (Beat Smash is
  the red card at the top). Every level opens with the teacher code
  **KOOLOPEN**, typed on the *About Kool Riffs* screen. **KOOLRESET** starts
  everything from scratch.
- **Read it:** https://github.com/koolrifz/music-memorisation
- **Please play it with sound, on a phone if you can.** Most of what matters
  happens in time with the music. A reviewer who loads the page without
  audio sees four silent pads and none of the game. One reviewer in the last
  round did exactly that.

---

## 1. What Beat Smash is for

Kool Riffs is a browser app that teaches primary and secondary music students
to read music at speed. Its designer is a career instrumental teacher. Beat
Smash is the **first thing a student meets**. It comes before the games that
teach what a note is worth and how to write the counting.

It exists because of two observations:

1. **Garnet**, who teaches students who *"do not want to learn"*, tried the
   counting game with them and said: *"What I need is a step before this."*
2. **Rob**: *"I have so many students that can read well but have no sense of
   rhythm… They haven't spent enough time in the curiosity stage playing with
   the beat."*

So the game starts with the **experience of the beat** and arrives at
**notation** only when the experience is ready for it. Rob: *"That's how
notation should be introduced. When the experience feels like it needs to
move on."*

The player:

1. jams with Tango until they feel the pulse;
2. sees what they just played turned into notation;
3. reads rhythms on the pads to win three musicians:
   - **Tango** on drums (quarter notes);
   - **Riff** on bass (half notes);
   - **Riff** on keys (whole notes);
4. records their own part in the booth;
5. is awarded a **Learner's Permit**.

## 2. The rulings it is built on (please don't re-propose against these)

Each of these is Rob's ruling, made deliberately, and several reverse earlier
advice.

| Ruling | What it means for the build |
|---|---|
| **Experience before symbol** | The first minute has no notation at all. The notes appear only when the student presses "Show me what I played". |
| **Repetition is the doorway** | *"Right now they need to hit that button 10,000 times. And you have to give them 100,000 reasons why."* Proposals that **replace** repetition with variety answer the wrong question. The job is to make the same action rewarding the ten-thousandth time: the band building, the groove changing, a new song. |
| **Addictive by design, never easier** | Streaks, combos and collections are allowed. But only correct play scores, the "rule of three" gates (three clean takes in a row) stay, and a hook that pays off guessing is a bug. |
| **The jam is the student's for as long as they like** | The first version turned the pads into notes after four taps. Rob: *"I've been robbed of the fun of maintaining that beat."* It now carries on until the student chooses to move on. **Two reviewers proposed the four-tap version again in the last round. It was reversed on purpose.** |
| **Nothing moves across the notation** | No cursor ever runs over the notes, so the student must keep their own place. A cursor may run over the *picture* (the scaffold), never over the music. |
| **The engraving standard outranks the scaffolding** | Every bar obeys standard notation rules. Examples: a bar of silence is one whole rest, a half rest starts only on beat 1 or 3, and beat 3 is never hidden except by quarter · half · quarter. The game reuses the counting pillar's own engraving engine; it never builds bars of its own. |
| **No words in the code** | Every word on screen and every spoken line is looked up by ID in `lang/en-US.js` and `content/dialogue.js`. Rob writes them; most of today's lines are placeholders. `tools/check-text.py` enforces this. |
| **No accent pad** | The only action is tap, hold and release in time. Beat 1 is accented in sound and light instead. |

## 3. The journey, piece by piece

For each piece: **what it is**, **why it is there**, and **where it lives**.
All code is in `beat-smash.js` unless another file is named.

### 3.1 The first minute: the jam

| Piece | Why | Code |
|---|---|---|
| Tango's warm-up groove plays with four big pads. Tango shows the beat for one bar and says *"Copy me!"* | Instant, can't-fail play: the first touch already makes music | `startBeatJam`, `bsmashJamDemo` |
| **A meter fills** with every tap on the beat and slips back one for a tap off it | A visible goal: about 15 seconds of steady beat | `bsmashJamPress`, `bsmashJamMeter`, `BSMASH_JAM_GOAL` |
| **The band builds with the meter**: bass joins at a third, keys at two thirds | The tap makes the music grow. *Work → music*, from the first minute | `BSMASH_JAM_LAYERS` |
| **The beat light** (one round icon in the middle). Each tap fills it:<br>• green, dead centre = on the beat<br>• yellow, left of centre = early<br>• yellow, right of centre = late<br>• red at the edge = off<br>Holding green makes it glow brighter | Rob: *"I don't think their tap has the logic in it that says I'm making the music go. The first thing is: can I light this up green, because that makes the music go."* How far the fill misses the centre is how far the tap missed. Time runs left to right, as it does in the music | `bsmashJamLight`, `BSMASH_LIGHT_GREEN_MS` |
| **Tango coaches the time**: what green means; *"You're rushing"* or *"You're dragging"* | Coaching a real teacher gives. Rushing is measured from the gaps between taps (four in a row, 6% short), and the tap itself must agree, so a single wobble isn't called rushing. At most one line every two bars | `bsmashJamCoach` |
| **"Follow me, 1 2 3 4"**: when the beat is lost, Tango counts aloud in time until three taps land on the beat in a row, then says *"Order restored"* | Rob: *"Tango doesn't say boom boom boom boom. Tango says follow me, 1 2 3 4."* The count is booked on the audio clock a beat ahead, so it lands on the beat. Each beat has its own pitch (beat 1 the tonic, beat 2 the supertonic, and so on), the same rule the counting games use | `bsmashJamFollow`, `bsmashJamRestored` |
| **The band sags** when two taps in a row miss: it muffles and sinks, then returns as the beat returns | Rob: *"the music slows down like a record… that's how they know."* It is a filter and a volume dip, **not** a real tempo change, because every take is measured against the band's clock | `bsmashBandSag` |
| **The band stops when the student stops**: two bars with no taps. Two buttons appear, **Keep jamming** and **Beat Smash menu**. If they stopped while struggling, Tango says *"Everyone struggles at the beginning. The important thing is to keep trying."* | Rob asked for the menu, and the encouragement, at this point. A tap brings the band straight back in time, because its clock never stopped | `bsmashJamStop` |
| **Variations**: once the meter is full, every four times round the four-bar loop with the beat held, the drums play a fill and the band changes at the next barline. Four dots show what's coming | Rob: *"keep them tapping… to hear what's coming up next."* Repetition made rewarding. A time round where the beat wobbles doesn't count, but it doesn't lose the dots already earned | `bsmashJamRound`, `bsmashJamVariation`, `BeatSmashBand.fill` |
| **The drop**: one variation takes the drums out. *"You're the drummer now!"* | The pulse held from the inside, for the student who reads well but can't feel time | the `jam` lists in `content/songs.js` |
| **Rob's songs**: chord progressions as data he writes (voicings, comping rhythms, bass styles), with directions for each instrument | The groove gets groovier the longer the beat is held, and a new song is a new reason to keep tapping | `content/songs.js`, `beat-smash-band.js` (`findSong`, `songHits`, `bassLine`) |
| **"Show me what I played"**: the pads become four quarter notes | The notation arrives as a reveal of what they already did | `bsmashJamMorph` |

**The jam also measures the student.** Every tap is a tap to a known beat, so
the jam:

- calibrates the device's sound delay (stored per device);
- records a beat test per player: lean, steadiness, and % on the beat.

Nothing grades on the beat test yet. Proposed uses are in CLAUDE.md, "The
beat test".

### 3.2 Winning a musician: the same three steps for each

| Step | To pass |
|---|---|
| **One bar** | Three clean takes in a row, each a different bar |
| **Two bars** | Three clean takes in a row (the first barline to track) |
| **The big take** (four bars, notation only) | The age's pass mark (80 / 85 / 90%) **and** back in by the next beat 1 after any slip |

| Piece | Why | Code |
|---|---|---|
| **The dice**: each take is rolled, and the dice turn into the rhythm | Random to the child, controlled by the curriculum. The dice only land on bars of the current step. Each one-bar step is a **ladder climbed by clean takes**. Tango's runs: every beat → strong beats → backbeat → one rest → all 15 legal bars | `BSMASH_MUSICIANS[].steps`, `bsmashRoll` |
| **The fading scaffold**:<br>⭐ the picture, then the same bar from notation<br>⭐⭐ the picture only during the count-in<br>⭐⭐⭐ notation only | *I discovered it → I recognised it → I read it.* Stars 2 and 3 are real reading, not memory | `bsmash.scaffold`, `bsmashScheduleTake` |
| **The picture is help**, under one "Need a hand?" button. By default it **mixes styles** (blocks, counting, drum machine), a different one each roll | Rob: *"if we are pushing them to notation on the second playing… does it matter how they see the first? Put it all under a helping hand."* No single picture becomes the way to play | `bsmashPictureKind`, `bsmashMixPicture` |
| **Takes are studio takes**: *"That's a take!"*, *"Take two!"* A miss empties the row of stars, but never takes a musician already won | The studio framing turns a test into a session | `bsmashVerdict`, `bsmashTakeTwo` |
| **"Find one!"**: after a slip in the big take, the next beat 1 gets stronger in light, click and mark | Losing a note is allowed; losing the bar isn't. Getting back in is a skill in itself | `bsmashSlip` |
| **Every step reached can be replayed** | Rob: *"I'm locked out of being able to replay the previous level."* Replaying is practice and never moves progress backwards | `bsmashStepChoices`, `bsmashOnRecord` |
| **The pads**: four beat pads on every step, and **the pad is the beat**: a note played in time on the wrong pad isn't clean, the right pad lights, and the coach says to follow the beats round. One big pad is a setting. Keys `1`–`4`, or `Space` for the big pad | Rob: *"the 1 2 3 4 is what we are trying to drum in at this point."* The student's finger walks the bar | `beat-pads.js`, `bsmashPadCount`, `bsmashPress` |

### 3.3 The three musicians

| Musician | Reads | What's new to play | Code |
|---|---|---|---|
| **Tango, drums** | quarter notes and rests (15 bars) | the pulse | `BSMASH_MUSICIANS[0]` |
| **Riff, bass** | + half notes and rests, and quarter · half · quarter (36 bars) | **holding**: the bass sustains while the pad is held, and a half note let go early isn't clean. In the picture, a long note fills beat by beat while held, so letting go early leaves it half filled | `bsmashRelease`, `bsmashTakeFrame` |
| **Riff, keys** | + whole notes and rests (38 bars) | holding for a whole bar (Rhodes or organ) | `BSMASH_MUSICIANS[2]` |

- **Riff speaks for himself.** On his steps, every event that has a Riff
  version of the line plays his (`bsmashEvent`). Tango still counts in,
  because she's the drummer.
- **The band under a musician's takes is the band won so far**
  (`bsmashBandSoFar`), quietly. It never includes the part being earned.
- **Winning**: the big take lands and the musician is inspired by it (*"That
  gives me a great idea!"*). Three parts appear, one per style: **Spicy**
  (Latin), **Smooth** (jazz) and **Hop** (dance). The student hears each over
  the band and keeps one, and that channel lights on the mixing desk
  (`bsmashOpenPicker`, `bsmashKeepPart`).

### 3.4 The booth and the Learner's Permit

| Piece | Why | Code |
|---|---|---|
| **Eight bars** (four with a setting), notation only, over the whole band | The Permit asks *"Can you use what you've just learned?"*, never *"Can you guess something new?"*. No new rhythm: bars come from the same 38, weighted towards the busier ones | `bsmashRoll`, `BSMASH_BOOTH_BARS` |
| **Practice** takes: marked exactly like the real one, never counted. The REC light goes amber | *"They get to learn it first."* | `practiceBeatTake`, `bsmashBoothPracticed` |
| **Record**, then **listen back**: every press of the take is replayed in the student's own sound, over the band, from the same bar of the song | Rob: *"listen back and hear how they've played with the band."* Starting from the same bar keeps every chord where it fell | `bsmashListenBack` |
| **The Learner's Permit**: a card with L plates, their name, their band and the date, presented by Tango | The reward is their band and a licence to keep | `bsmashShowPermit` |

### 3.5 Timing (where most of the engineering went)

Children's taps on phones are noisy, and phones add sound delay. Every
judgement is made on the **audio clock**, never page time.

- **One song clock.** `bsmashBand.start` is bar 1 of the song. Loops,
  count-ins, takes, the coaching count and playback are all booked against it,
  a moment ahead, on the audio clock.
- **A tap's time comes from the touch event itself.** The lag before the code
  runs, which is bigger on a busy phone, is taken back off (`bsmashEventTime`).
- **Device delay is calibrated from the jam.** Each tap is placed against the
  beat using a **fixed** reference: the delay the device had before the jam.
  - This fixed a real bug Rob hit: a few wild early taps could drag a
    running estimate half a beat off for good.
  - The estimate is clamped to −50 ms … 450 ms.
- **The timing window depends on age** (220 / 195 / 170 ms). It starts 40 ms
  wider and tightens 5 ms per clean take.
- **Known limit, stated plainly:** a phone's delay and a child who always plays
  slightly early look identical to software. So the beat light and the
  rushing coaching judge each tap against the beat the child has been
  keeping, not against an absolute beat.

## 4. How it was checked

`python tools/test-beat-smash.py` runs **228 checks** in a real browser. It
**plays the game on the real pads, with the mouse and the Space bar, in time
with the audio clock**. Among them:

- **Notation:** every bar of every musician is drawn through the counting
  pillar's renderer and obeys the engraving rules.
- **The jam:**
  - the meter, the band building, a wobbly start;
  - the beat light (green, early left, late right, way off);
  - rushing and dragging coaching;
  - "Follow me" counted in time and stopping when order is restored;
  - the sag, the stop and its encouragement;
  - the variations: the fill, the change on the barline, the drop.
- **Rob's songs:** voicings, transposition, the "pushed chord" rule across
  every song, bass styles, and mix levels clear of clipping.
- **The musicians:**
  - every step of Tango's;
  - Riff's half note let go early (fails) and held through (passes);
  - the whole note held for four beats;
  - pickers and parts.
- **The booth:** practice that never counts, eight and four bars, listening
  back from the same bar, the Permit card.
- **Layout:** at 390×844, 360×640 and a 1366×657 Chromebook, including eight
  bars in the booth with the pad on screen for the whole take.

`python tools/check-text.py` checks that no on-screen words are in the code.

**What the tests cannot tell us:** whether it is fun, whether children
understand it, and how it feels under a thumb. It has been played by Rob on
his phone, and by no children yet.

## 5. What is placeholder, and what is not built

**Placeholder:**

- **Sound:** the band is synthesised, and the loops are rendered from the
  same synth. Garnet's recordings will replace them.
- **Voices:** the browser's speech reads Tango and Riff with a different pitch
  per character. Their lines are Rob's to rewrite.
- **Art:** the style cards show icons until Rob's character art exists.

**Not built:**

- the L plates opening the next game, Value Smash (ruled, but waiting for
  Rob's word);
- sharing the Permit card as an image;
- "my bit" (the student's clean rhythm played over the band when a musician
  is won);
- Tango noticing *"You didn't need the blocks!"*;
- a distinct "home" sound for "Find one!";
- the four pads collapsing into one big pad on screen;
- call and response with Tango: the next game, `ideas/jam-with-tango.md`.

## 6. What we'd like from you

Please **cite the file and function** for anything about the code, and say
whether you **verified it in the code or the live game, or are assuming**.
Then:

1. **Correctness.** Bugs in the timing and grading: `bsmashPress`,
   `bsmashRelease`, `bsmashVerdict`, `bsmashJamPress` and the delay
   calibration. Anything a child on a cheap Android phone would hit.
2. **The holding rule.** On touch, a half note counts as held if released
   any time after the start of its last beat (with a mouse, after the
   middle of it). Fair for 6–10-year-olds, or too strict or too loose?
3. **The jam's coaching.** Does the beat light, combined with "Follow me" and
   the rushing and dragging lines, risk talking too much? What would you cut
   or keep?
4. **The booth.** Eight bars weighted to busier bars, after a four-bar big take
   for each musician. Is that the right size of step up for a Permit?
5. **The three-star fade, and the dice ladders.** Is each ladder's order
   right, and is three clean takes in a row the right gate at this age?
6. **Engagement over hundreds of repetitions.** What would make the same tap
   rewarding the thousandth time, **without** replacing the repetition (see
   §2)?
7. **Anything that contradicts §2's rulings:** please flag it as a question
   for Rob, not a recommendation.

The full design brief is private, but everything it decided is summarised
here and in `CLAUDE.md` ("BEAT SMASH"), which is the developers' working
reference.

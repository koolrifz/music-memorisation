# Jam with Tango: call and response, no notation

**Status:** an idea, 2026-09-30. Nothing built. Rob raised it after playing
Beat Smash Phase 1 on his phone.

## In Rob's words

> *"There was a bit where we talked about call and response… If Tango's going
> to play quarter notes, why can't Tango play a 2-3 son clave or a 3-2 son
> clave and we have to tap that back? Why don't we let her direct us to reply
> to what she's done? Make that a whole game within itself. It's just call and
> response. Learn these rhythms. She can just go through a whole range of
> them."*

> *"It's got nothing to do with notation because now we're landing into the
> experience and we should. That's how notation should be introduced. When the
> experience feels like it needs to move on and you're ready to move on from
> the experience. Then you move on to something the next level up… You can't
> chunk something until you really know what all the steps are."*

> *"It's also aural training, but we're not asking them to notate it down…
> The object is just reproducing the sound."*

## What it teaches, and why the app misses it

Rhythm **by ear, before by eye**. Beat Smash asks a child to read from the
first minute; nothing lets them simply *own* a rhythm in their body first.
Call and response is how rhythm is taught in a band room and a drum circle:
the teacher plays, the class plays it back.

## A first shape (a proposal, for Rob to change)

- Tango plays a one-bar (later two-bar) figure over the groove; the student
  answers it in the next bar on the same pads. Call, answer, call, answer, with
  no stopping, so it feels like a jam and not a test.
- A library of named figures, easy to hard: four on the floor · the backbeat ·
  tresillo · son clave 3-2 and 2-3 · rumba clave · the Bo Diddley beat · a
  Charleston · the "we will rock you" stomp-stomp-clap. Each is **data**, one
  line, like Beat Smash's dice table.
- The rule of three: three clean answers in a row learns a figure and moves
  to the next. A miss just means Tango plays it again.
- Graded with the same pads and the same clock as Beat Smash, against the
  figure's onsets. Held notes can come later.
- **Only afterwards**, as a reward, "this is what it looks like": the figure in
  notation. Never before, and never tested here.

## Rob, second round (2026-09-30), after playing the longer jam

> *"I think they will love a Tango session playing rhythm games and you just
> keep encouraging them. Let's say Tango taps beat one, she skips beat two,
> and she taps three and four. They have to know how to tune into where beat
> one is… just keep them doing this as long as possible. There is no other
> way."*

> *"When the game comes to a stop because the player has stopped engaging
> with the buttons, make sure they have navigation buttons easily available.
> This is where they could have a chance to play call and response with
> Tango."* The stop and its buttons are built (the warm-up jam); the call and
> response button is the next thing that belongs there.

**The material Rob has ready**, to be turned into figures:

- **Clave:** son clave in both directions, 3-2 and 2-3.
- **Bells:** cowbell patterns, the mambo bell, the cha-cha bell.
- **Bongo:** the martillo.
- **Timbales and sticks:** palito patterns, cascara.
- **Keys and bass:** piano montunos, the bass tumbao ("so I can do a really
  cool mambo").
- **Further out:** batá, choro.
- **And today's music:** the same figures infused with electronic drum beats.
  *"I can't reproduce authentic guaguancó music, but I'm sure we could get our
  imaginations together and see what the limitations are and work backwards
  to what is realistic but engaging."*

**Why it matters, in his words:** *"Right now they need to hit that button
10,000 times. And you have to give them 100,000 reasons why."* (And: *"I'll
charge $0.99."*)

## Rob, third round (2026-09-30): songs to unlock, and the curiosity stage

> *"So the chord progressions can become our song list that they can unlock
> through progress?"*

> *"I have so many students that can read well but have no sense of rhythm…
> They haven't spent enough time in the curiosity stage playing with the
> beat."*

Built in answer: the jam's **variations** (every four times round with the
beat held, a fill and the band changes; one change is **the drop**, drums
out, the student is the drummer) and **two chords in a bar**, with his B♭
`I6 vi7 | ii7 V7` and D minor `i6 | iiø7 V7alt`. See CLAUDE.md, "The jam
keeps moving".

**Proposed, not built: songs as the reward for holding the beat.** A song
opens after a number of variations reached in the jam (say every three), in
Rob's order, so the list is a ladder: the C loops first, then the 6-dim
songs, then the two-fives. Nothing is gated behind a reading test: the jam
stays the curiosity stage, and what it pays is more music to play in. Unlocks
would go through `KR.openStages()`/`KR.openAll()` like every other game.
Waiting on Rob: the order, the number, and whether a song can also be won in
call and response.

## Not decided

1. **Where it sits.** Rob has placed one door already: the warm-up jam's stop
   screen. Is that the only way in, or does it also have its own card, or
   come before Beat Smash's reading steps?
2. **Does it earn anything** (stars, a figure collection, a musician), or is
   it pure play?
3. **The figures:** which, in what order, and at what tempo. The loops are
   100 bpm; son clave and tresillo sit naturally there.
4. **Straight or swung**: every Beat Smash loop is straight eighths, so the
   figures would be too, for now.
5. **The name.** "Jam with Tango" is the working title; the brand verb is
   "Smash" (see `CLAUDE.md` naming conventions).

Builds on: `beat-pads.js` (the pads), `beat-smash.js` (the song clock and the
grading), the placeholder band (`beat-smash-band.js`).

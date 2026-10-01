# Beat Smash workshop: is the first level too quick to its big win?

> **Ruled again, later on 1 October 2026:** every step comes the normal way, three in a row: one, two, four and eight bars. Each musician then ends in the studio, 32 bars once through at the pass mark, which wins the part. The booth is gone. See CLAUDE.md, "THE STEPS AND THE STUDIO".
>
> **Rob ruled, 1 October 2026: the rule of three.** The four-bar big take and
> the booth's eight bars are each won by **three passing takes in a row**
> (*"one time can be a fluke"*). That is close to Option A below. The booth
> can also read 12, 16 or 32 bars. The ten-track record was not chosen. What
> comes next, a song at a time, is in `docs/beat-smash-songs-proposal.md`.
> The rest of this document is kept as the question was put.

**A question for outside reviewers, 1 October 2026.**

Background, for anyone who hasn't seen the game:

- **Beat Smash** is the first game in Kool Riffs, a browser app that teaches
  young musicians to read rhythm.
- The build so far is described in `docs/beat-smash-build-report.md`, in this
  repository: https://github.com/koolrifz/music-memorisation
- **Play it** at https://koolrifz.github.io/music-memorisation/ (the red
  card). Type **KOOLOPEN** on the *About Kool Riffs* screen to open every
  level.

This document asks one design question. It gives the designer's concern in
his own words, the numbers as the game stands today, three options with rough
timings, and our recommendation. Then it lists what we want you to answer.

---

## 1. The concern, in Rob's words

Rob is the designer, a career instrumental music teacher. After playing
level one through to the end:

> *"When I finished my four-bar phrase with Riff, I actually wanted to go
> back in and do another one. We should be promoting this in some way to get
> them to want to do more and more four-bar phrases… It would seem to me we
> are getting to the end goal way too quick. They are only getting a basic
> understanding."*

> *"Ideally I would like them to do at least 10 different four-bar phrases,
> which earns them the next step towards being able to sit in the studio and
> record their own… By the time we get to the four bars, that's the first
> time they have to use four bars, and that's the end of the level. I'm
> wondering if they have to fill up some sort of Consistency icon, and when
> that is full they are allowed to do the final phrase, which should really
> be eight bars."*

Why it matters to him:

> *"This whole game of Kool Riffs is the way for students to do the horrible
> repetition stuff that they never want to do, and that teachers really don't
> take the time to reinforce either, especially when a child sees the teacher
> once a week."*

> *"In that classroom is a huge range of learning for music. On one end you've
> got the student who got it when they were six. Then you have kids that hate
> music and don't understand it and could care less."*

> *"Very soon we're going to be putting these kids into a band in real life.
> So they need a workplace to fail until they succeed. The failing has to be
> fun because it's necessary."*

On frustration, which he sees as a sign of effort, not of failure:

> *"The student who has no idea how to find the beat isn't necessarily
> frustrated. They quickly work out that they don't like it. The student
> that's getting frustrated is the student that's trying very hard and getting
> so close, but yet they're just not there. I often tell them in that moment:
> walk away for five minutes, come back, and guess what, you'll be able to do
> it. The brain gets overloaded when trying to chunk information… Not enough
> repetition. Not enough sleeping after the repetition."*

His question to you:

> *"Will it destroy the gameplay and the early learning stage for the
> youngsters if I hold them on four-bar phrases too long, and then ask for a
> final eight-bar phrase?"*

---

## 2. Level one as it stands

Level one has three musicians to win, then the booth. Each musician is won
the same way:

| Step | What | To pass | Minimum takes |
|---|---|---|---|
| One bar | 1 bar a take, from the musician's dice | three clean takes in a row (⭐⭐⭐), the picture fading out | 4 |
| Two bars | 2 bars a take | three clean takes in a row | 4 |
| **The big take** | **4 bars**, notation only | **one** take at the pass mark for the student's age (80 / 85 / 90%), and back in by the next beat 1 after any slip | **1** |

After that comes the **booth**: **8 bars**, over the full band, with practice
takes that never count. **One** passing take earns the **Learner's Permit**.

**So a student who passes first time plays only four four-bar phrases before
the final** (one per musician, plus the booth's eight). Rob's point is that
the four-bar phrase, the real musical unit, appears once per musician and is
over at once.

**A take, in time:** about 17 seconds for four bars at 100 bpm. That's the dice
roll, a one-bar count-in, the take itself (9.6 s) and the verdict. **A take
that passes takes about 35 seconds on average**, assuming roughly half fail at
first.

---

## 3. Three options

All three keep everything else as it is (the jam, the one-bar and two-bar
steps, the stars, the band growing). They differ only in how many four-bar
phrases come before the eight-bar final, and where those phrases sit.

### Option A: each musician's big take becomes "three takes in the can"

Each musician needs **three passing four-bar takes**, each a different roll,
instead of one. A meter of three slots fills, one per passing take. This is
the app's existing rule of three, applied to four bars.

- **Four-bar phrases before the final:** 9.
- **Added time:** about 3 minutes per musician.
- **For:** small change; the four-bar phrase is practised with each new note
  value (quarters, then halves, then wholes) while it is fresh.
- **Against:** fewer than Rob's ten; no single "consistency" moment before the
  booth.

### Option B: a session of ten before the booth ("Cut your first record")

Musicians are still won with one passing four-bar take, so the band builds
quickly. Once the band is complete, a **studio session** opens before the
booth:

- **ten passing four-bar takes**, each a different roll;
- over the full band, from everything learned;
- each one a **track on the student's first record**.

A ten-slot Consistency meter (a record with ten grooves, or a tape reel)
fills, one per passing take. When it is full, the booth opens, and the booth's
**eight bars is "the single"**.

- **Four-bar phrases before the final:** 13.
- **Added time:** about 6 minutes.
- **For:**
  - Rob's ten, exactly;
  - one clear consistency goal;
  - a story that makes repetition the point: a record has tracks;
  - every track is kept and can be listened back to, with the band, at any
    time. This uses the booth's existing playback of what the student played.
- **Against:** the ten come after all three musicians, so the quarter-note
  four-bar phrase gets little practice before halves and wholes arrive.

### Option C (our recommendation): both, with numbers to test

1. **Each musician needs three takes in the can** (Option A). Four bars become
   normal with each new note value.
2. **Then the record: ten tracks** (Option B).
3. **Then the eight-bar single** in the booth.

- **Four-bar phrases before the final:** about 19.
- **Added time:** about 11 minutes of four-bar takes.
- **Level one in total:** roughly 25–30 minutes for a student who passes
  easily, and 45–60 minutes for a typical child, **over two or three
  sittings**.

The app is meant to be *"a three-to-six-month game in the very first beginning
learning stages"*, so two or three sittings for its first level is not long.
Both numbers (three per musician, ten tracks) are settings, to be tuned by
playtesting.

**How the Consistency meter would behave, under Option C** (each point is a
question for you, below):

- A passing take fills one slot. A **clean** take (every note right) fills
  the slot and marks the track gold.
- **A failed take loses nothing.** Rob's *"workplace to fail until they
  succeed"*. The jam's meter does slip back on misses, and that remains an
  option here.
- **Three failed takes in a row:** Tango suggests a short break, as Rob does
  in lessons (*"walk away for five minutes"*). The meter waits. Coming back
  after a break gets a "fresh ears" welcome.
- **A strong student goes faster:** a clean first-time take fills two slots,
  so *"the student who got it when they were six"* isn't held back as long.
- **Failing is part of the fun:** a failed take is an **outtake**, and the
  record has a hidden "outtakes" side. That makes failing a collection rather
  than a loss.

---

## 4. What we'd like you to answer

Please answer each by number. Say what you'd do and why, and **what you would
measure in a playtest to find out**. Rob's rulings are in
`docs/beat-smash-build-report.md` §2. In particular:

- the jam stays open as long as the student likes;
- repetition is the point, so make it rewarding rather than replacing it;
- only correct play scores.

1. **The risk.** For students aged 6–13, including reluctant ones, does
   holding them on four-bar phrases for 10–20 repetitions before an eight-bar
   final risk losing them? Where do you think it tips, and for whom?
2. **A, B or C?** Or something else. Should the extra four-bar work sit **with
   each musician**, **before the booth**, or **both**?
3. **The meter's rules.** Should a failed take cost anything? Should passing
   takes need to be **in a row** (the app's rule of three), or simply add up?
   What does "consistency" honestly mean for a ten-year-old?
4. **The story.** Is "your first record, ten tracks, then the single" the
   right reason to do it ten times? What would make the **tenth** take as
   rewarding as the first, without replacing the repetition?
5. **Difficulty across the ten.** Should the ten tracks:
   - all draw from everything learned;
   - ramp from quarter-note bars to halves to wholes; or
   - lean on the bars this student finds hardest?
6. **Frustration and spacing.** Rob's *"walk away for five minutes"* and *"not
   enough sleeping after the repetition"*:
   - Is a suggested break after three failures in a row right?
   - Is there any place for a **sleep** step, such as the booth opening only
     on a later day, or would that lose more children than it helps?
7. **Fast and slow students in the same class.** Is "a clean take counts
   double" enough to keep the strongest moving? Is there anything for the
   student who can't yet find the beat, besides the jam (which they can
   return to at any time)?
8. **The final.** Is eight bars the right size for the Permit after this much
   four-bar work, or should eight-bar takes appear earlier, inside the record?
9. **Failing as fun.** Do outtakes, or something else, make a failed take
   enjoyable without rewarding carelessness? (A hook that pays off guessing is
   a bug.)

Please separate what you **know** (research, practice, your reading of the
code or the live game) from what you **suggest**. Where you disagree with
Rob's rulings, put it as a question for him rather than a recommendation.

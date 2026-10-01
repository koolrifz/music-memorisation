# Beat Smash: playtest 1, Rob plays level one

**1 October 2026.** Rob (the designer, a career instrumental teacher) played
level one on his phone and talked through it, from the warm-up jam to Riff on
keys. This report sets out:

- what he saw and said, in his words;
- what the code is actually doing, checked against the code;
- the change we propose for each point;
- whether each point is a **clear fix**, a **question for reviewers**, or
  **Rob's call**.

**Read with:**

- `docs/beat-smash-build-report.md`: what is built, and the rulings.
- `docs/beat-smash-workshop-pacing.md`: the open question about how many
  four-bar phrases come before the final.

Code: https://github.com/koolrifz/music-memorisation · Play:
https://koolrifz.github.io/music-memorisation/ (type **KOOLOPEN** on the About
screen to open every level).

---

## 1. What worked

> *"This is so fun!"* · *"I like where this goes. Excellent."* · *"Yeah, this
> is nice, good pace, good pace of the game."* · *"I like how you have to make
> a decision as to which pad to hit."* · *"I like how this works, the gameplay
> goes."* · *"That's a good playthrough. I love it. Really love it."*

These worked well, and should be kept:

- **The jam's beat light**, the number lighting the middle, and *"Green means
  right on the beat."*
- **The band joining as the beat is held.**
- **The four pads as the beat** (the pad you press must be the beat's own).
- **The picture → notation reveal** (*"That's what you played. Now read it."*).
- **Riff's voice.**

On why three musicians:

> *"Three things is really fantastic for the ears: rhythm, a bass line, and an
> accompaniment part. Even in symphony music, your ears can't really
> comprehend more than three main things happening at once."*

---

## 2. The jam

### 2.1 Tango's "1, 2, 3, 4" is not in time with the music (clear fix)

> *"Follow me, one, two, three, four, that she says needs to be synchronized
> with the music. And it's not."*

**Diagnosis.**

- The spoken line is *"Follow me! 1, 2, 3, 4!"*. It is read by the browser's
  speech synthesiser, which can't be scheduled in time, so the spoken numbers
  drift against the band.
- The in-time count underneath (`bsmashJamBeat`, booked on the audio clock)
  *is* on the beat. But it is a pitched tone, one note of the scale per beat,
  not a voice.

**Fix.**

- The spoken line becomes just *"Follow me!"*.
- The count itself stays on the audio clock.
- Tango's counting voice needs **recorded samples** of "one", "two",
  "three", "four", so the in-time count is spoken. The app already has a slot
  for a recorded counting bank (`rstompAudioLoadVoice`). It needs the
  recordings.

### 2.2 When the student stops: count first, then stop (Rob's spec)

> *"If I don't tap, it means I'm confused… As soon as there's been four
> [beats with] nothing tapped, immediately start highlighting the numbers in
> the middle… If they still don't tap, then we just stop… As soon as the music
> starts again and they're tapping, she just reinforces the one, two, three,
> four, until they can do it two times. And then she can back off with her
> counting, just like a teacher would."*

**Now:** two silent bars, then the band stops. Tango's counting starts only
when the beat is lost while tapping, and it ends after three on-beat taps in
a row.

**Proposed (to Rob's spec):**

1. **One bar with no tap** → Tango starts counting at once: numbers in the
   middle, her count in time.
2. **Another bar with no tap** → the band stops, with the encouragement line
   and the Keep jamming / Menu buttons.
3. **Tapping resumes** → she keeps counting until **two whole bars** are on
   the beat, then backs off.

### 2.3 Keep the numbers lighting up the middle (question)

> *"Keep the numbers lighting up the middle."* · *"Every time on that green
> box."*

**Proposed:** the beat light shows the current beat's number (1 2 3 4) on
every beat, in time, through the whole jam, not only while Tango is counting.
The green / early / late fill still lands on each tap.

**Question:** is a number on every beat plus a fill on every tap too much on
one icon for a six-year-old?

### 2.4 Words (clear fixes)

| Now | Rob |
|---|---|
| *"Keep it going as long as you like."* | *"Not as long as you like. **As long as you can.**"* |
| praise after 8 greens in a row, then only every 24 more | *"She should be saying come on, another one, keep it right there… in the pocket. More feedback."* More frequent, short praise while the green is held |
| the change is announced by the fill, one bar ahead | *"Let us know in advance something is coming up. It's like in music, coming up to the bridge: hold on, the band's changing."* Announce it when three of the four dots are lit, a whole time round ahead |

---

## 3. From the jam into the reading steps

### 3.1 "I can't hear the music. It's an exercise." (question)

> *"Let's hear the music. I can't hear the music. It's an exercise, because
> there's no band."*

**Diagnosis.** During Tango's takes the backing is her warm-up groove alone,
at 35% level (`BSMASH_BAND_QUIET`), so the student can hear their own timing.
With no bass or keys yet, it reads as a drill.

**Proposed: a scratch track.** Real studios record over a guide track. While
a musician is being won, a quiet guide band (bass and keys) plays under the
takes, and each part the student wins **replaces** its guide with their
chosen style.

**Question:** does a guide band blur the "the band is yours, you earned it"
reward? Or does it make the takes music instead of exercises?

### 3.2 "We're building a band": the mentors' language (clear fix, words are Rob's)

> *"Wait a second, we gotta tell them that we're building a band… We gotta get
> the drum part down… I need your help."* · *"Tango's drums language and
> Riff's bass language and Riff's keys language all have to be geared around
> that instrument and what their role is in the music."* · *"They're mentors,
> helping you to gain that part."*

**Proposed.** Each musician's steps open, and are coached, in terms of the
part:

- **Tango:** *"We're building a band, and it starts with the drums. Let's get
  the drum part down!"*
- **Riff on bass:** *"Let's get the bass line sorted so the groove works."*
- **Riff on keys:** the part that glides on top.

Two related fixes:

- The playback line after the drums (*"Look how much you've built"*) is wrong
  for one instrument.
- After a part is kept, the next step should **lead straight on** (*"Next:
  Riff on bass"*), not back to the menu.

### 3.3 Keep the beat light during the reading steps? (question)

> *"Keep the circle there. We got plenty of room."* · *"I still think we have
> room for a little error correction, like dragging… Is it right to have the
> beat pulse light, the green, and counting the beats out? Do we leave that
> somewhere, maybe smaller, but still constantly reinforced, because they have
> to do this ten thousand times?"*

**Now:** the light is jam-only. The reading steps rule that **nothing moves
across the notation**, and the student keeps their own place.

**Proposed:** a smaller beat light **beside or below** the pads (never over
the music) during takes. It would show each tap's timing, and possibly
rushing and dragging.

**Question:** does per-tap feedback during a reading take help, or does it
pull the eyes off the notation the take is testing?

---

## 4. The reading steps

### 4.1 "Hold those long notes" when the holding was fine (bug, clear fix)

> *"For some reason it's intolerant of the length, and I'm giving the note
> very good length… a half note on beat three, and I was coming off on beat
> one, and it was saying I wasn't holding it long enough. Sometimes it was
> highlighting the rest."*

**Diagnosis, checked in the code:**

- **The message was wrong, not the hold.** Riff's *"Hold those long notes
  right through, man. Take two."* is his line for **every** failed take, for
  any reason (`beat.take.again.riff`). On a touch screen a half note counts as
  held once released after the **start of its last beat** (`bsmashRelease`).
  So a half note on beat 3 held to the next beat 1 was not short. The take
  failed for another reason, and the line blamed the holding.
- **Why a rest lights up.** A press is first matched to the nearest note
  within the timing window (195 ms at age 9–10, starting 40 ms wider). A press
  that matches no note **and** falls inside a rest's beat counts as a tap in
  the rest (`bsmashPress`). The likely case: the press for beat 3 came a
  little more than 0.2 s early, which lands it inside beat 2's rest.
- **Holding into a rest is never marked wrong**, and **quarter notes have no
  length rule**. A quarter is a tap, as Rob expected.

**Fix:**

1. **Verdicts name the actual reason**, one line each:
   - a note let go early;
   - a note early or late;
   - a missed note;
   - a tap in a rest;
   - the wrong pad.

   The picture marks that note.
2. **Rests are forgiving at their edges.** A press within the last third of a
   beat before a note counts as an *early* press for that note, not a tap in
   the rest.
3. **A teacher view** (with the teacher code on): each take's note-by-note
   timing in milliseconds, so the thresholds can be tuned from real play
   rather than guessed.

### 4.2 "If it's take three, you gotta say take three" (clear fix)

The verdict says *"Take two"* every time. It should count:

> Take two · Take three · Take four · Take five…

### 4.3 Counting as a picture: remove it from Beat Smash (Rob's call, made)

> *"This is counting. I don't know if the counting is going to work here. We
> haven't introduced it."* · *"The counting doesn't work in this situation. We
> don't know what brackets are."* · *"Blocks is good enough… I think we're
> going to get rid of counting from this."*

**Fix:**

- **Blocks** and **Drum machine** only, mixed as now.
- Counting arrives where it is taught, in Rhythm Stomp Lab.

### 4.4 Record, and a pause (clear fix)

> *"There should be a pause button."* · *"The record button should be more
> prominent, at the top, because in a recording booth nothing is more
> important than the recording."* · *"The only way I can pause this right now
> is hit the back button."*

**Proposed:**

- The red **REC** becomes the main control at the top: tap it to record, tap
  it again to pause.
- A paused take is discarded, never graded.

---

## 5. The band

### 5.1 Balance: "All we're getting is a kick drum" (clear fix, to measure)

> *"All we're getting is a kick drum… the balance is off."*

When choosing Tango's part on a phone, the three drum styles sound like
kicks. On a phone speaker the hats, rims and claps are lost under the kick.

**Fix:** measure each drum loop's level in the 2–8 kHz band against its kick,
and lift the upper kit (or thin the kick) until the styles are told apart on
a phone speaker.

### 5.2 "Hop" becomes reggae (Rob's call)

> *"I've got a little problem with the Hop bass line. I think it should be
> more like a reggae bass line and not completely offbeats… and we can leave
> beat one out… then we can put the organ on the offbeats, and maybe a one
> drop drum line for the drums."*

**Proposed:** the third style becomes **reggae**:

- **Bass:** a roots line that leaves beat 1 out.
- **Keys:** the organ "skank" on the offbeats.
- **Drums:** the one drop (kick and rim on beat 3, beat 1 empty).

**Question for Rob:** the brief named the styles Spicy (Latin), Smooth (jazz)
and Hop (dance). Does Hop **become** reggae, with a new name, or does reggae
become a **fourth** style?

### 5.3 Jam songs: a menu of four-bar progressions (Rob's list)

> *"Why don't we have jam songs that are four bars each?"*

Rob's progressions, to be written as songs (`content/songs.js`). Where the
recording was unclear, it is marked "(check)".

| Progression | Notes |
|---|---|
| I · V · V · I | |
| IV · I · V · I, then a second half with I · vii (check) | |
| I · IV · V · IV | major and minor |
| I · vi · ii · V | |
| ii · V · I · vi | |

Each also comes in a **minor version** where it makes sense. They become the
**Jam song** menu, and in time the songs the student unlocks.

---

## 6. Proposed order of work

1. **Clear fixes:**
   - verdicts that name the real reason;
   - forgiving rest edges;
   - numbered takes;
   - "as long as you can";
   - *"Follow me!"* without spoken numbers;
   - the counting picture removed;
   - the next musician straight after a part is kept;
   - the drum balance.
2. **The jam to Rob's spec:**
   - count after one silent bar;
   - stop after a second;
   - back off after two good bars;
   - the change announced a time round ahead;
   - more praise.
3. **The mentors' language** for each part, from Rob.
4. **REC as the main control**, with pause.
5. **Reggae and the jam songs**, once Rob rules on 5.2.
6. **Pending reviewers:** the beat light in reading steps (3.3), the scratch
   track (3.1), numbers on every beat (2.3), and the pacing question (the
   workshop brief).

---

## 7. Questions for reviewers

Please answer by number. Cite file and function for anything about the code,
and say whether you **checked** it or are **assuming**.

1. **The beat light during reading takes (3.3).** Help or distraction? If
   kept, where on a phone screen, and what should it show?
2. **A scratch track under the takes (3.1).** More musical, or does it take
   away from earning the band?
3. **Numbers on every beat in the jam (2.3).** Too much on one icon?
4. **The idle rule (2.2):** count after one silent bar, stop after two, back
   off after two good bars. Right for 6–13-year-olds, or too quick?
5. **The holding and rest thresholds (4.1).**
   - On touch, release after the start of the last beat counts as held.
   - A press within the last third of a beat before a note counts as early,
     not a rest tap.

   Fair for children on phones? What would you measure?
6. **Feedback that names the reason (4.1):** which reasons, in what words,
   and how many at once after a take?
7. **REC as record-and-pause (4.4):** any risk for young children (pausing to
   dodge a bad take)?
8. **Anything here that contradicts the rulings** in the build report §2:
   please put it as a question for Rob.

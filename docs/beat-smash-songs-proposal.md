# Beat Smash: song by song (a proposal for Rob, not built)

**1 October 2026.** Rob, after playing level one through:

> *"When that's over that song is finished. And then you can play another
> song and build it up from the beginning. Each song you get to unlock or have
> access to is higher up in the tier."*

This is how it could work, with the four questions it needs answered before
any of it is built.

## What is already built

The parts this would reuse are already in the game:

- **One song, built up from the beginning.** First the jam. Then Tango on
  drums, Riff on bass and Riff on keys, each won one bar → two bars → four
  bars. Then the booth.
- **The rule of three.** Each step is won by three takes in a row (built
  today for the four-bar take and the booth).
- **Rob's songs, as data** (`content/songs.js`). There are six progressions
  so far. The jam can be played over any of them.
- **Long takes.** The booth reads 8, 12, 16 or 32 bars, turning its pages as
  it goes.

## The proposal

1. **A song is one run of level one**, over one of Rob's progressions:
   - the jam;
   - the three musicians, each over that song;
   - the booth.

   Three takes in a row in the booth **finishes the song**. That is a record,
   kept and playable in "My band".
2. **The next song unlocks**, and the band is **built again from the
   beginning**, over the new song: new parts to pick and a new record. The
   Learner's Permit stays: it is earned once.
3. **Each song is a tier up.** The proposal is that the **reading** goes up
   and the **rhythms stay level one's** until the Value and Rhythm pillars
   say otherwise:

   | Song | The booth reads | Tempo |
   |---|---|---|
   | 1 | 8 bars | 100 |
   | 2 | 12 bars | 100 |
   | 3 | 16 bars | 108 |
   | 4 | 32 bars | 108 |

   This is the "access to incredible sight-reading material" without new
   notation the student hasn't been taught. Quavers would arrive with Stomp
   Lab's Stage B, not here.
4. **A second song is quicker to rebuild.** A musician already won on an
   earlier song skips the one-bar step. Wins are still by the rule of three.

## Questions for Rob

1. **The order of the songs.** Which progressions, and in what order? The
   six in `content/songs.js` are:
   - C 6-dim;
   - C 6-dim with the tritone ending;
   - both of those in A♭;
   - B♭ rhythm changes;
   - D minor two-five.

   Playtest 1 §5.3 also listed jam progressions to add.
2. **What goes up a tier?** Each of these can go up with each new song:
   - the length of the booth;
   - the tempo;
   - the rhythms;
   - the band's parts (busier bass, richer voicings).

   Which ones should?
3. **Rebuilding.** Every step again for every song, or does a musician won
   once skip the one-bar step?
4. **The prize.** The L plates are earned at the end of song 1. Is there
   anything at the end of each later song, or at the end of the tier?

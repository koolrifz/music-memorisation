# Beat Smash: Rob's parts, and building a song (a proposal, not built)

**1 October 2026.** After the studio was built, Rob said:

> *"Once you achieve the drum part, there should be a choice of some pretty
> cool drum parts that I will write… a proper tumbao for the bass… I would
> like to be able to take the piano line for spicy and make montunos. Two
> downbeats and six upbeats. I would like the drums to be able to use the
> cascara pattern… They might even be able to choose from a variety of chord
> progressions. They can build their song. In order to build a song, we have
> to choose the form. And then we have to lay down the drums."*

> *"We can decide now whether one song has three bass parts to choose from,
> or if there's multiple bass parts for me to write… multiple drum parts with
> variations to add and multiple keyboard parts that have different pads,
> different rhythms, different sounds. And we let them assemble. They can
> audition and assemble."*

## What exists today

- The picker offers **three styles per instrument**: Spicy, Smooth and Hop.
  They are placeholders made by the synth (`beat-smash-band.js`, `PARTS`).
- **Rob's songs are data** (`content/songs.js`):
  - chords and voicings, bar by bar;
  - keys rhythms in his own note values;
  - bass lines made by rules (`whole`, `halves`, `pump`, `walk`, `tumbao`).

  The format for writing music as data is already there. Parts would extend
  it.
- **The studio take is 32 bars.** That is one time through a standard song
  form: AABA, four sections of eight bars.

## The proposal

1. **A new file, `content/parts.js`, holds every part Rob writes**, one entry
   per part. Each entry has:
   - a name;
   - its colour and character on the picker card;
   - the rhythm, written in Rob's own way.

   Parts **follow the song's chords**, the way the comping and the bass
   styles already do. So one cáscara or one montuno works over every song.
   A song can list the parts it suggests.
2. **How each instrument is written.** These are examples to correct, not
   final:

   **Drums: one line per voice, on a semiquaver grid**, one bar per
   `|`-separated group (`x` = hit, `.` = rest):
   ```js
   'cascara': { instrument: 'drums', name: 'Cáscara',
     shell: 'x.x.xx.x x.x.xx.x', // the cáscara on the shell
     kick:  '....x... ....x...',
     clave: '..x.x... x...x.x.' },
   ```

   **Bass: the rhythm in Rob's note values**, each note carrying its chord
   tone (`R` root, `5` fifth, `8` octave). The tumbao below sounds on the
   "and" of 2 and on beat 4:
   ```js
   'tumbao': { instrument: 'bass', name: 'Tumbao',
     rhythm: 'qr 8r 8:5 qr q:R~' },   // ~ ties into the next bar
   ```

   **Keys: the rhythm in Rob's note values.** The voicings come from the
   song, as they do now. The example is a two-bar montuno: two downbeats,
   six upbeats.
   ```js
   'montuno': { instrument: 'keys', name: 'Montuno',
     rhythm: '8 8r 8r 8 8r 8 8r 8 | 8 8r 8r 8 8r 8 8r 8',
     sound: 'piano' },
   ```
3. **Assembling.** After the 32 bars are laid down, the picker shows that
   instrument's parts as cards. The student taps a card to hear it over the
   band so far, then keeps one. **Variations** can be a second line on a
   part that the jam brings in each time round, as the jam's variations do
   now.
4. **Building a song** (later, once the parts exist). The student would:
   1. choose a **progression** (Rob's songs);
   2. choose a **form** (for example AABA, which is 32 bars);
   3. lay down the drums, then the bass, then the keys.

   The 32-bar studio take would then be the student's own song, once
   through.

## Questions for Rob

1. **How many parts per instrument?** I suggest **four** to start, written
   to work over any song, with each song able to suggest its favourites.
   Three is what the picker shows today; more than four starts to be a menu
   rather than a choice.
2. **The notation above.** Is it how you would like to write them? Anything
   you would write differently, such as accents or ghost notes on the
   drums?
3. **The form.** Should the 32-bar take be the song's form, with the
   sections labelled A, A, B, A on the music? Or is form a later step, once
   students choose their own progressions?
4. **Sounds.** Should a part name its own sound (piano vs Rhodes vs organ,
   congas vs kit)? Or does the student choose the sound separately, as the
   "Bass sound" setting does now?

/* =========================================
   KOOL RIFFS - SONGS FOR THE BAND, BY ID
   =========================================
   Rob writes these. Each song is a loop of four bars at 100 bpm (a song of
   one or two bars is played round until the four are full), played live by
   the synthesised band (beat-smash-band.js): Tango's warm-up drums, a bass
   and a suitcase Rhodes. Beat Smash's warm-up jam plays the songs listed in
   KR.jamSongs below (the "Jam song" setting), and
   tools/beat-smash-band/lab.html plays every one.

   FOR EACH BAR, one chord:
     chord  the chord's name, for reading only - nothing plays from it
     bass   the bass note, e.g. 'C3' (middle C is C4)
     keys   the Rhodes voicing, bottom note first, e.g. ['G4', 'A4', 'C5', 'E5']
            Every note is played exactly as written: this is where the
            voicing rules go.
   ...or TWO (or more) CHORDS IN THE BAR, as a list in square brackets:
     [ { chord: 'B♭6', bass: 'Bb2', keys: [...] },
       { chord: 'G–7', bass: 'G2',  keys: [...] } ]
   They share the bar evenly, two beats each. A chord can say how long it
   lasts instead: beats: 3 (then the others share what is left).

   IN ANOTHER KEY: write the song once, then
     { like: 'c-6dim', transpose: -4, chords: [...] }
   plays it a number of semitones up (+) or down (-). -4 is down a major
   third, C to A flat. `chords` gives the new chord names, for reading.

   comp: THE KEYS' RHYTHMS, by name. Written as note values one after another
   from beat 1 of bar 1, and repeated until the four bars are full:
     w  whole    h  half    q  quarter    8  eighth    16  sixteenth
     a '.' after a value makes it dotted:  q.  = dotted quarter
     an 'r' after a value makes it a rest: qr  = quarter rest
   A comp can be a LIST of rhythms: the band picks a different one each time
   round the loop, so it stays loose but locked to the beat.
   A chord struck in the beat before a chord change and held across it plays
   the NEXT chord: that is the anticipation. It happens by itself - write a
   value that crosses the change and the next chord arrives early. Struck any
   earlier, it plays its own chord and the new one is struck at the change.

   bass: THE BASS PART, by style - the bass does not copy the keys. Rob:
   "It mostly plays according to the style of music." Each bar's bass note
   is the root; the styles make a line from it:
     whole   the root, a whole note
     halves  root on 1, fifth on 3 (traditional choro, bossa nova)
     pump    dotted quarter + eighth, the only pump a bass plays: root, fifth
     walk    quarter notes, walking in steps to the next chord's root
     tumbao  the Cuban bass: the next chord's fifth on the "and" of 2, its
             root on 4 held over the barline, beat 1 silent
   `groove` is the one the jam plays once the meter is full. With two chords
   in a bar each style fits itself to two beats (a walk becomes root and the
   step into the next chord).

   jam: DIRECTIONS TO THE BAND, for the warm-up jam once the groove is going.
   Rob: "We play a four-bar loop four times; on the fifth time that sets up a
   variation of the band." Every four times round with the student holding
   the beat, the drums play a fill and the band changes to the next line of
   this list, then the next, and back to the top. A line only changes the
   instruments it names; the rest carry on:
     drums  'warmup' (Tango's own beat), 'spicy', 'smooth', 'hop', or 'off'
     bass   a bass style from the list above, 'groove', or 'off'
     keys   a comp by name ('whole', 'pumps', 'pumps#2'), or 'off'
     say    what Tango says as it lands: an event in content/dialogue.js
   'off' drops an instrument out. With the drums off, the student is the
   drummer: the band only has their beat to go on.
   A song with no jam list gets the band's own (BSMASH_JAM_SONG_VARIATIONS
   in beat-smash.js).
   ========================================= */
window.KR = window.KR || {};

/* Rob, 2026-09-30: "Just use the different pumps. They can be long, they can
   be short. They can be connected together, tied together, and made into
   other rhythms... And you can balance that against some downbeats. I'm
   interested to see how loose we can make it. But tight."
   The pump is a long note and a short one: dotted half + quarter (long),
   dotted quarter + eighth (the pump), dotted eighth + sixteenth (short).
   Each line is four bars; the band plays a different one each time round. */
const KR_COMP_PUMPS = [
    // pumps on 1 and 3, the second held over the barline; a long note answers
    'q. 8 q. q. h. q. 8 q. q. q h',
    // two pumps tied together (3 + 3 + 2), then pumped into the next chord
    'q. q. q q. q. q. q. h q. q. q',
    // a downbeat, a pump on the "and", the next chord early
    'q q. 8 q. q. h',
    // long pumps: dotted half and the next chord early, held
    'h. h h.',
    // short pumps, answered by downbeat halves
    '8. 16 8. 16 h q. 8 h',
    // two downbeats, then a pump that pushes into the next bar
    'q q q. q. q h',
];

/* THE JAM SONG MENU, in order. Rob, playtest 2 (2026-10-02): "Keep the first
   jam song... get rid of [the others]. And bring back chord progressions...
   So we'll just keep those Roman numerals, those jam songs. And then later we
   can give them names." 'c' is the band's own I IV I V loops; the rest are
   songs below. Rob's six from 2026-09-30 are off the menu but kept: the loop
   lab still plays them, and any of them can go back on by adding its id here. */
window.KR.jamSongs = [
    'c',
    'c-1-4-5-1',
    'c-4-1-5-1',
    'c-2-5-1',
    'c-2-5-1-6',
    'c-1-6-2-5',
    'c-3-6-2-5',
];

/* THE SONGS TO BUILD A BAND ON, in order. Rob, 2026-10-02: after the
   warm-up the student auditions these and picks one, and every take of the
   band (one bar to the studio's 32) is played over it. The names are fun
   placeholders (lang/en-US.js, 'song.<id>'), for children who are only
   listening: "Sunrise, anything." */
window.KR.bandSongs = [
    'c-1-4-1-5',
    'c-1-4-5-1',
    'c-4-1-5-1',
    'c-2-5-1',
    'c-2-5-1-6',
    'c-1-6-2-5',
    'c-3-6-2-5',
];

window.KR.songs = {

    /* ---------- The Roman-numeral jam songs (Rob, playtest 2) ----------
       All in C, one chord a bar, every chord changing ON the barline. Rob
       gave the numerals only; THE VOICINGS ARE CLAUDE'S, in his own manner
       (four notes in the Rhodes' middle, each voice moving by a step or
       holding), for him to replace:
         C6      G A C E  (his)          Fmaj7  F A C E
         G7      F G B D                 Dm7    F A C D  (his)
         Cmaj9   E G B D                 Am7    E G A C
         E7      E G# B D                A7     E G A C#
       "Five, five, one" in the recording is taken to be two-five-one (ii V
       I), the commonest of them all. Rob to confirm. */
    // The C loops' own progression, I IV I V, written out so a band can be
    // built on it like any other song.
    'c-1-4-1-5': {
        name: 'song.c-1-4-1-5',
        bars: [
            { chord: 'C6',    bass: 'C3', keys: ['G4', 'A4', 'C5', 'E5'] },
            { chord: 'Fmaj7', bass: 'F2', keys: ['F4', 'A4', 'C5', 'E5'] },
            { chord: 'C6',    bass: 'C3', keys: ['G4', 'A4', 'C5', 'E5'] },
            { chord: 'G7',    bass: 'G2', keys: ['F4', 'G4', 'B4', 'D5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'pump' },
    },
    'c-1-4-5-1': {
        name: 'song.c-1-4-5-1',
        bars: [
            { chord: 'C6',    bass: 'C3', keys: ['G4', 'A4', 'C5', 'E5'] },
            { chord: 'Fmaj7', bass: 'F2', keys: ['F4', 'A4', 'C5', 'E5'] },
            { chord: 'G7',    bass: 'G2', keys: ['F4', 'G4', 'B4', 'D5'] },
            { chord: 'C6',    bass: 'C3', keys: ['G4', 'A4', 'C5', 'E5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'pump' },
    },
    'c-4-1-5-1': {
        name: 'song.c-4-1-5-1',
        bars: [
            { chord: 'Fmaj7', bass: 'F2', keys: ['F4', 'A4', 'C5', 'E5'] },
            { chord: 'C6',    bass: 'C3', keys: ['G4', 'A4', 'C5', 'E5'] },
            { chord: 'G7',    bass: 'G2', keys: ['F4', 'G4', 'B4', 'D5'] },
            { chord: 'C6',    bass: 'C3', keys: ['G4', 'A4', 'C5', 'E5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'halves' },
    },
    'c-2-5-1': {
        name: 'song.c-2-5-1',
        bars: [
            { chord: 'Dm7',   bass: 'D3', keys: ['F4', 'A4', 'C5', 'D5'] },
            { chord: 'G7',    bass: 'G2', keys: ['F4', 'G4', 'B4', 'D5'] },
            { chord: 'Cmaj9', bass: 'C3', keys: ['E4', 'G4', 'B4', 'D5'] },
            { chord: 'C6',    bass: 'C3', keys: ['E4', 'G4', 'A4', 'C5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
    },
    'c-2-5-1-6': {
        name: 'song.c-2-5-1-6',
        bars: [
            { chord: 'Dm7',   bass: 'D3', keys: ['F4', 'A4', 'C5', 'D5'] },
            { chord: 'G7',    bass: 'G2', keys: ['F4', 'G4', 'B4', 'D5'] },
            { chord: 'Cmaj9', bass: 'C3', keys: ['E4', 'G4', 'B4', 'D5'] },
            { chord: 'Am7',   bass: 'A2', keys: ['E4', 'G4', 'A4', 'C5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
    },
    'c-1-6-2-5': {
        name: 'song.c-1-6-2-5',
        bars: [
            { chord: 'Cmaj9', bass: 'C3', keys: ['E4', 'G4', 'B4', 'D5'] },
            { chord: 'Am7',   bass: 'A2', keys: ['E4', 'G4', 'A4', 'C5'] },
            { chord: 'Dm7',   bass: 'D3', keys: ['F4', 'A4', 'C5', 'D5'] },
            { chord: 'G7',    bass: 'G2', keys: ['F4', 'G4', 'B4', 'D5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
    },
    // Rob: "three, six dominant, two minor, five dominant" - III7 VI7 ii7 V7.
    'c-3-6-2-5': {
        name: 'song.c-3-6-2-5',
        bars: [
            { chord: 'E7',  bass: 'E3', keys: ['E4', 'G#4', 'B4', 'D5'] },
            { chord: 'A7',  bass: 'A2', keys: ['E4', 'G4',  'A4', 'C#5'] },
            { chord: 'Dm7', bass: 'D3', keys: ['F4', 'A4',  'C5', 'D5'] },
            { chord: 'G7',  bass: 'G2', keys: ['F4', 'G4',  'B4', 'D5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
    },

    /* ---------- Rob's songs of 2026-09-30 (off the jam menu, kept) ---------- */

    /* Rob, 2026-09-30, in C: I6 - biii dim7 - ii7 - V7(b9), one bar each.
       Right hand C6 in second inversion (G A C E); the outside voices move
       down a semitone (F# A C Eb, the diminished), then down again (F A C D,
       D minor); then the F becomes F diminished over the G (F Ab B D), which
       gives the flat nine. The A and C hold through the first three chords. */
    'c-6dim': {
        name: 'song.c-6dim',
        bars: [
            { chord: 'C6',     bass: 'C3',  keys: ['G4',  'A4',  'C5', 'E5'] },
            { chord: 'E♭°7',   bass: 'Eb3', keys: ['F#4', 'A4',  'C5', 'Eb5'] },
            { chord: 'Dm7',    bass: 'D3',  keys: ['F4',  'A4',  'C5', 'D5'] },
            { chord: 'G7(♭9)', bass: 'G2',  keys: ['F4',  'Ab4', 'B4', 'D5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
    },

    /* The variation: the last chord a tritone substitute, bII7(b5).
       Rob gave no voicing for it; this one (F G B Db) is Claude's, moving
       from the D minor by half and whole steps like the others. Replace it. */
    'c-6dim-tritone': {
        name: 'song.c-6dim-tritone',
        bars: [
            { chord: 'C6',      bass: 'C3',  keys: ['G4',  'A4', 'C5', 'E5'] },
            { chord: 'E♭°7',    bass: 'Eb3', keys: ['F#4', 'A4', 'C5', 'Eb5'] },
            { chord: 'Dm7',     bass: 'D3',  keys: ['F4',  'A4', 'C5', 'D5'] },
            { chord: 'D♭7(♭5)', bass: 'Db3', keys: ['F4',  'G4', 'B4', 'Db5'] },
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
    },

    /* Rob, 2026-09-30: ||: Bb6 G- | C-7 F7 :||, which is I6 vi7 | ii7 V7.
       Two chords a bar, two bars round and round. The voicings are
       Claude's, since Rob gave the chords only: rootless, with the D on top
       held all the way through, each chord one or two notes away from the
       last (the G-7 comes out as G-9, the C-7 as C-9, the F7 as F13).
       Replace them with yours. */
    'bb-rhythm-changes': {
        name: 'song.bb-rhythm-changes',
        bars: [
            [
                { chord: 'B♭6', bass: 'Bb2', keys: ['F4',  'G4', 'Bb4', 'D5'] },
                { chord: 'G–7', bass: 'G2',  keys: ['F4',  'A4', 'Bb4', 'D5'] },
            ],
            [
                { chord: 'C–7', bass: 'C3',  keys: ['Eb4', 'G4', 'Bb4', 'D5'] },
                { chord: 'F7',  bass: 'F2',  keys: ['Eb4', 'G4', 'A4',  'D5'] },
            ],
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'walk' },
        jam: [
            { drums: 'smooth' },
            { keys: 'pumps#3', bass: 'pump' },
            { drums: 'off', say: 'beat.jam.drop' },
            { drums: 'smooth', bass: 'walk', keys: 'pumps' },
            { drums: 'hop', bass: 'halves' },
            { drums: 'spicy', bass: 'tumbao' },
            { drums: 'warmup', bass: 'walk' },
        ],
    },

    /* Rob, 2026-09-30: "a i ii7b5 V7alt in D: Dm6 | Em7b5 A7alt."
       The minor two-five: a bar of D minor, then half a bar each. The
       voicings are Claude's: every voice moves by a half step or holds, so
       the alt chord falls back into the D minor by itself -
       F A B D, then E G Bb D, then F G Bb C# (A7 with its flat 13, flat 7,
       flat 9 and third), then F A B D again. Replace them with yours. */
    'd-minor-two-five': {
        name: 'song.d-minor-two-five',
        bars: [
            { chord: 'D–6', bass: 'D3', keys: ['F4', 'A4', 'B4', 'D5'] },
            [
                { chord: 'E–7(♭5)', bass: 'E3', keys: ['E4', 'G4', 'Bb4', 'D5'] },
                { chord: 'A7alt',   bass: 'A2', keys: ['F4', 'G4', 'Bb4', 'C#5'] },
            ],
        ],
        comp: { whole: 'w', pumps: KR_COMP_PUMPS },
        bass: { whole: 'whole', groove: 'tumbao' },
        jam: [
            { drums: 'spicy' },
            { bass: 'halves', keys: 'pumps#4' },
            { drums: 'off', say: 'beat.jam.drop' },
            { drums: 'spicy', bass: 'tumbao', keys: 'pumps' },
            { drums: 'smooth', bass: 'walk' },
            { drums: 'hop', bass: 'pump' },
        ],
    },

    // The same two, down a major third in A flat.
    'ab-6dim': {
        name: 'song.ab-6dim',
        like: 'c-6dim', transpose: -4,
        chords: ['A♭6', 'C♭°7', 'B♭m7', 'E♭7(♭9)'],
    },
    'ab-6dim-tritone': {
        name: 'song.ab-6dim-tritone',
        like: 'c-6dim-tritone', transpose: -4,
        chords: ['A♭6', 'C♭°7', 'B♭m7', 'A7(♭5)'],
    },

};

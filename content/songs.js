/* =========================================
   KOOL RIFFS - SONGS FOR THE BAND, BY ID
   =========================================
   Rob writes these. Each song is a four-bar loop at 100 bpm, played live by
   the synthesised band (beat-smash-band.js): Tango's warm-up drums, a bass
   and a suitcase Rhodes. Beat Smash's warm-up jam can use any song here
   (the "Jam song" setting), and tools/beat-smash-band/lab.html plays them.

   FOR EACH BAR:
     chord  the chord's name, for reading only - nothing plays from it
     bass   the bass note, e.g. 'Ab2' (middle C is C4)
     keys   the Rhodes voicing, bottom note first, e.g. ['Eb4', 'G4', 'Bb4', 'C5']
            Every note is played exactly as written: this is where the
            voicing rules go.

   comp: THE KEYS' RHYTHMS, by name. Written as note values one after another
   from beat 1 of bar 1, and repeated until the four bars are full:
     w  whole    h  half    q  quarter    8  eighth    16  sixteenth
     a '.' after a value makes it dotted:  q.  = dotted quarter
     an 'r' after a value makes it a rest: qr  = quarter rest
   A chord struck before a barline and held across it plays the NEXT bar's
   voicing: that is the anticipation. 'q. q. q. q. q q' puts the third
   dotted quarter on beat 4, held over the barline, so it plays bar 2's
   chord early.

   The bass plays each bar's bass note on every keys hit, so the two push
   together.
   ========================================= */
window.KR = window.KR || {};
window.KR.songs = {

    /* Rob, 2026-09-30: Ab major, one bar each, I6 - biii dim7 - ii7 - V7,
       with the Barry Harris sixth-diminished voicings he dictated. The top C
       and the bottom Eb hold; the two middle voices move by half steps. */
    'ab-6dim': {
        name: 'song.ab-6dim',
        bars: [
            { chord: 'Ab6',   bass: 'Ab2', keys: ['Eb4', 'G4',  'Bb4', 'C5'] },
            { chord: 'Bdim7', bass: 'B2',  keys: ['D#4', 'F#4', 'A4',  'C5'] },
            { chord: 'Bbm7',  bass: 'Bb2', keys: ['Eb4', 'F4',  'Ab4', 'C5'] },
            // Rob wrote this voicing as "F7: Eb F# A C" and the chord as V7.
            // The bass plays Eb (V). If it should be F, change 'Eb2' to 'F2'.
            { chord: 'V7',    bass: 'Eb2', keys: ['Eb4', 'F#4', 'A4',  'C5'] },
        ],
        comp: {
            whole: 'w',
            // Rob's rhythm: dotted quarters on 1, the "and" of 2, 4 (held over
            // the barline: the anticipation) and the "and" of 1, then
            // quarters on 3 and 4. Two bars, played twice.
            pump: 'q. q. q. q. q q',
        },
    },

    /* The variation: the last chord a tritone substitute, bII7(b5).
       Rob gave no voicing for it; this one (Eb G A C#) is Claude's, chosen
       to move by half steps like the others. Replace it freely. */
    'ab-6dim-tritone': {
        name: 'song.ab-6dim-tritone',
        bars: [
            { chord: 'Ab6',     bass: 'Ab2', keys: ['Eb4', 'G4',  'Bb4', 'C5'] },
            { chord: 'Bdim7',   bass: 'B2',  keys: ['D#4', 'F#4', 'A4',  'C5'] },
            { chord: 'Bbm7',    bass: 'Bb2', keys: ['Eb4', 'F4',  'Ab4', 'C5'] },
            { chord: 'A7(b5)',  bass: 'A2',  keys: ['Eb4', 'G4',  'A4',  'C#5'] },
        ],
        comp: {
            whole: 'w',
            pump: 'q. q. q. q. q q',
        },
    },

};

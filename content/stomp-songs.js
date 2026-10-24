/* =========================================
   KOOL RIFFS - SONGS PLAYED FROM A RECORDING, BY ID
   =========================================
   Songs the band does not play: a real recording, followed by its beat map
   (content/<id>-beats.js, made from the audio by tools/build-stomp-chart.py).
   The game is Stomp the Beat's "hurdles": the student plays the drum part into
   the song, a few bars at a time (see stomp-song.js and CLAUDE.md).

   Bars are counted from the first count-in: bar 0 is the count-in, bar 1 the
   first bar of the intro. A hurdle's `from` is the bar the punch-in starts on.
   The sections are Rob's, from his own form (the Song Bank), checked against the
   audio: each starts where the band's energy changes.

   HURDLES. `bars` is how long the guide is silent. `spots` are the places in the
   song a one-, two-, four- or eight-bar hurdle is played, in turn (a hurdle
   never needs the same four bars every time). `pass` is the share of notes that
   must be played (1 = every one, and no tap on a rest). The recording session
   (`record: true`) is one take over 32 bars, in two sessions: the silver one
   plays Verse 1 to the second chorus; the gold one goes from Chorus 2 through
   both breakdowns, the band's full stop and the bridge, so the student must hold
   the beat when the band disappears.

   ROUNDS. Round 1 is crotchets only. Round 2 adds crotchet rests: the same
   hurdles, with a written rhythm the student reads (and the guide can play).
   A song may have none (rounds: []): then it is the run and free play alone.

   THE TILE. `title`, `tile` and `icon` are word IDs (lang/en-US.js): the
   song's name, the line under it on the song chooser, and its picture.

   EACH SONG IS A LEVEL (Rob, 2026-10-24: "we should follow the rhythm stomp
   lab levels... Each song is a level"). `album` names the Stomp Lab album the
   song is: Level 1 The Beat, 2 The Held Beat, 3 Splitting the Beat, 4
   The Pump, 5 Syncopation and Review (RSTOMP_ALBUMS, in order), and its tile
   says so. A song without one is not a level yet (Stomp the Beat, the crotchet
   song, also tests every level).

   THE RUN'S LEVELS. `run.levels` are Stomp Lab levels, in the order they are
   played: for a song that is a level, its album's. `run.leaveOut` takes note values out of every level's vocabulary for
   this song (Rob, 2026-10-24, the quaver song: "I don't want to do whole notes
   and half notes with this song"). A level whose new idea was one of them goes
   from the list rather than repeating the level before it.
   ========================================= */
KR.stompSongs = KR.stompSongs || {};
KR.stompSongs['stomp-the-beat'] = {
    title: 'ssong.title', tile: 'ssong.tile', icon: 'ssong.icon',
    audio: 'ssong.stomp-the-beat.audio',          // content/audio.js
    kick: 'ssong.kick',
    sections: [
        { id: 'countin',   first: 0,  last: 0 },
        { id: 'intro',     first: 1,  last: 4 },
        { id: 'verse1',    first: 5,  last: 12 },
        { id: 'pre',       first: 13, last: 14 },
        { id: 'chorus',    first: 15, last: 22 },
        { id: 'intro2',    first: 23, last: 26 },
        { id: 'verse2',    first: 27, last: 30 },
        { id: 'pre2',      first: 31, last: 33 },
        { id: 'chorus2',   first: 34, last: 41 },
        { id: 'breakdown', first: 42, last: 45 },
        { id: 'chorus3',   first: 46, last: 55 },     // the band stops for four beats in its last bar
        { id: 'claps',     first: 56, last: 59 },     // kick and handclaps only
        { id: 'bridge',    first: 60, last: 65 },
        { id: 'final',     first: 66, last: 73 },     // the band drops out for its first bars
        { id: 'ending',    first: 74, last: 81 },
    ],
    // The run (stomp-song.js, "THE RUN"): after a warm-up on the beat, every
    // 4/4 Stomp Lab level in its own order, two bars then four. 6/8 (20, 21)
    // is left out: the song is in four. So is level 0 (quarter notes alone):
    // the warm-up already is it.
    run: { levels: ['4', '2', '1', '3', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '22', '23', '24', '25', '26', '27', '28', '29'] },
    rounds: [
        { id: 'crotchets', rests: false, hurdles: [
            { id: '1',  bars: 1,  spots: [13, 27, 34], pass: 1 },
            { id: '2',  bars: 2,  spots: [13, 15, 27], pass: 1 },
            { id: '4',  bars: 4,  spots: [27, 15, 5],  pass: 0.85 },
            { id: '8',  bars: 8,  spots: [5, 15, 34],  pass: 0.85 },
            { id: '32', bars: 32, record: true, pass: 0.85, sessions: [
                { id: 'silver', from: 5 },
                { id: 'gold',   from: 34 },
            ] },
        ] },
        { id: 'rests', rests: true, hurdles: [
            { id: '1',  bars: 1,  spots: [13, 27, 34], pass: 1 },
            { id: '2',  bars: 2,  spots: [13, 15, 27], pass: 1 },
            { id: '4',  bars: 4,  spots: [27, 15, 5],  pass: 0.85 },
            { id: '8',  bars: 8,  spots: [5, 15, 34],  pass: 0.85 },
            { id: '32', bars: 32, record: true, pass: 0.85, sessions: [
                { id: 'silver', from: 5 },
                { id: 'gold',   from: 34 },
            ] },
        ] },
    ],
};

/* STOMP THE BEAT: SOUL. The older students' version of the same song: neo-soul,
   funk and gospel (Suno, 2026-10-24), and THE QUAVER SONG. Rob: "It's a perfect
   quaver tune... this song should start where the quavers start. Crotchets and
   quavers will be perfect for this... I don't want to do whole notes and half
   notes with this song... we'll do a deep dive into crotchets and quavers."

   About 97 bpm: Suno starts near the 100 asked for (the count-in), settles by the
   choir and eases down to 96.7 by the end, so the map, never a tempo. The intro
   has no drums, and the last hit is pushed onto the "and" of 4 in bar 86, so
   the map was built from a checked grid (tools/grids/stomp-the-beat-soul.json).
   The sections are Rob's own transcription (2026-10-24), checked against the
   audio: 87 bars, every change on the bar he marked.

   LEVEL 3, SPLITTING THE BEAT (Rob, later the same day: "That gospel stomp the
   beat needs to go at level 3 Splitting the beat"). The run: the warm-up on the
   beat, then that album's levels, B1, B3 and B4, with no semibreves or minims
   anywhere. B2 ("quavers and longer notes") is left out: without its longer
   notes it is B1 again. The pumps and syncopation (B5-B10) are Levels 4 and 5,
   songs of their own. No hurdle rounds yet. */
KR.stompSongs['stomp-the-beat-soul'] = {
    title: 'ssong.soul.title', tile: 'ssong.soul.tile', icon: 'ssong.soul.icon',
    album: 'quavers',                               // Level 3, Splitting the Beat
    audio: 'ssong.stomp-the-beat-soul.audio',
    kick: 'ssong.kick',
    sections: [
        { id: 'countin',   first: 0,  last: 0 },      // spoken, over a keys fill
        { id: 'intro',     first: 1,  last: 4 },      // keys, pad, horns: no drums
        { id: 'choir',     first: 5,  last: 8 },
        { id: 'verse1',    first: 9,  last: 16 },     // sparse
        { id: 'pre',       first: 17, last: 20 },
        { id: 'chorus',    first: 21, last: 28 },
        { id: 'intro2',    first: 29, last: 30 },     // the intro figure
        { id: 'verse2',    first: 31, last: 38 },     // hi-hats on clear quavers
        { id: 'pre2',      first: 39, last: 42 },
        { id: 'chorus2',   first: 43, last: 50 },
        { id: 'namegame',  first: 51, last: 58 },     // the band drops out: vocals and drums
        { id: 'breakdown', first: 59, last: 62 },     // kick, handclaps and choir
        { id: 'bridge',    first: 63, last: 70 },     // gospel choir, organ
        { id: 'adlibs',    first: 71, last: 74 },
        { id: 'final',     first: 75, last: 82 },     // full choir and horns
        { id: 'ending',    first: 83, last: 86 },     // kick on bars 83 and 85 only; the last hit on the "and" of 4
    ],
    run: {
        levels: ['10', '12', '13'],                  // the album's 10-13, less 11
        leaveOut: ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'dotted-half-note', 'dotted-half-rest'],
    },
    rounds: [],
};

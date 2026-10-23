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
   ========================================= */
KR.stompSongs = KR.stompSongs || {};
KR.stompSongs['stomp-the-beat'] = {
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
    // is left out: the song is in four.
    run: { levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '22', '23', '24', '25', '26', '27', '28', '29'] },
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

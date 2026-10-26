/* =========================================
   KOOL RIFFS - RECORDED SOUNDS, BY ID
   =========================================
   Line or sound ID -> audio file, e.g.
     'tango.license.1': 'audio/tango-license-1.mp3',
   When a line has a file here it is played instead of the browser's
   synthesised voice. Also the Beat Smash loops, by ID.
   ========================================= */
KR.audio = {
    /* ---------- Beat Smash: the band's loops (brief §8.1) ----------
       Garnet's loops, by ID. PLACEHOLDERS until his files arrive under the
       same names: see audio/beat-smash/README.md. */
    'beat.loop.warmup':       'audio/beat-smash/beat-l1-warmup.wav',
    'beat.loop.drums.spicy':  'audio/beat-smash/beat-l1-drums-spicy.wav',
    'beat.loop.drums.smooth': 'audio/beat-smash/beat-l1-drums-smooth.wav',
    'beat.loop.drums.hop':    'audio/beat-smash/beat-l1-drums-hop.wav',
    'beat.loop.bass.spicy':   'audio/beat-smash/beat-l1-bass-spicy.wav',
    'beat.loop.bass.smooth':  'audio/beat-smash/beat-l1-bass-smooth.wav',
    'beat.loop.bass.hop':     'audio/beat-smash/beat-l1-bass-hop.wav',
    'beat.loop.keys.spicy':   'audio/beat-smash/beat-l1-keys-spicy.wav',
    'beat.loop.keys.smooth':  'audio/beat-smash/beat-l1-keys-smooth.wav',
    'beat.loop.keys.hop':     'audio/beat-smash/beat-l1-keys-hop.wav',

    /* ---------- Stomp the Beat, played from its recording (stomp-song.js) ----------
       The song as Rob made it in Suno (the "Beat Stomp (Remastered)" file), and the
       student's kick: bright, with a beater click, so it cuts through the band's own. */
    'ssong.stomp-the-beat.audio': 'audio/stomp-the-beat/stomp-the-beat.mp3',
    'ssong.kick':             'audio/stomp-the-beat/student-kick.wav',
    // Stomp the Beat: Soul, the older students' version (neo-soul, funk and
    // gospel, Suno, 2026-10-24), the quaver song. 160 kb/s like the first.
    'ssong.stomp-the-beat-soul.audio': 'audio/stomp-the-beat-soul/stomp-the-beat-soul.mp3',
    'ssong.the-long-hold.audio':     'audio/the-long-hold/the-long-hold.mp3',
};

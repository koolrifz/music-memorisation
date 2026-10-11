/* =========================================
   KOOL RIFFS - PICTURES, BY ID
   =========================================
   Picture ID -> image file. Rob makes them (in Gemini, to the brief in
   kool-riffs-docs/docs/beat-smash-art-brief.md); they are cut out of their
   green screen and saved small in art/.

   A speaker or pose ID ('tango', 'tango.cheer') puts a portrait beside the
   gold box. None yet: until there is one, the portrait slot stays hidden.
   Beat Smash's pictures are below; with any of them missing, the game
   falls back to its own drawing (the kit) or shows no picture (a coach).
   ========================================= */
KR.art = {
    // Beat Smash's warm-up: Tango at the Kool Riffs kit, in three stick
    // positions. Her sticks come down on the beat and are up on the "and";
    // halfway while she talks.
    'beat.kit.warmup.up':   'art/tango-kit-up.webp',
    'beat.kit.warmup.mid':  'art/tango-kit-mid.webp',
    'beat.kit.warmup.down': 'art/tango-kit-down.webp',

    // The musician on screen during their steps (1 to 8 bars; not the
    // studio). A song can have its own: 'beat.coach.<musician>.<song>', e.g.
    // 'beat.coach.drums.c-1-4-1-5'. Until then every song uses these.
    'beat.coach.drums': 'art/tango-kit-mid.webp',
    'beat.coach.bass':  'art/riff-double-bass.webp',
    'beat.coach.keys':  'art/riff-keys.webp',

    // The studio (studio.js): the empty room, each instrument as its own
    // cut-out, the two coaches standing, and their heads for the gold box.
    // 'studio.head.<who>' is a POSE id, so it only shows beside the gold box
    // on lines that ask for it; a bare 'riff' or 'tango' would put a portrait
    // beside every game's box.
    'studio.room':        'art/studio/room.webp',
    'studio.piano':       'art/studio/piano.webp',
    'studio.drums':       'art/studio/drums.webp',
    'studio.congas':      'art/studio/congas.webp',
    'studio.bass':        'art/studio/bass.webp',
    'studio.ebass':       'art/studio/ebass.webp',
    'studio.vibes':       'art/studio/vibes.webp',
    'studio.speaker':     'art/studio/speaker.webp',
    'studio.goldrecord':  'art/studio/goldrecord.webp',
    'studio.tango':       'art/studio/tango-stand.webp',
    'studio.riff':        'art/studio/riff-sit.webp',
    'studio.head.tango':  'art/studio/head-tango.webp',
    'studio.head.riff':   'art/studio/head-riff.webp',

    // The Kool Riffs logo, three sizes (Rob's, 2026-10-11): the full one for
    // big spaces (the studio's control-room window), the badge for a circle
    // (Tango's kick drum head, headers), the mark for the smallest places.
    'logo.full':          'art/logo/full.webp',
    'logo.badge':         'art/logo/badge.webp',
    'logo.mark':          'art/logo/mark.webp',
};

/* Where things are in a picture, as fractions of its width and height.
   The warm-up's beat light is laid over the kick drum's front head, so the
   game needs to know where the head is in Tango's kit picture. */
KR.artPlaces = {
    'beat.kit.warmup': { aspect: 800 / 665, head: { left: 0.34, top: 0.5474, width: 0.34 } },
};

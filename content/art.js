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
};

/* Where things are in a picture, as fractions of its width and height.
   The warm-up's beat light is laid over the kick drum's front head, so the
   game needs to know where the head is in Tango's kit picture. */
KR.artPlaces = {
    'beat.kit.warmup': { aspect: 800 / 665, head: { left: 0.34, top: 0.5474, width: 0.34 } },
};

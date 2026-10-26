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
    // Beat Smash's warm-up: Tango at her kit, in three stick positions. Her
    // sticks come down on the beat and are up on the "and"; halfway while she
    // talks. Since 2026-10-24 this is Rob's earlier Tango (the lanky orange
    // one with the ponytail, the drum room's frames below), everywhere; the
    // cat Tango's pictures (art/tango-kit-*.webp) are no longer used.
    'beat.kit.warmup.up':   'art/tango-drums-up.webp',
    'beat.kit.warmup.mid':  'art/tango-drums-mid.webp',
    'beat.kit.warmup.down': 'art/tango-drums-down.webp',

    // The drum room (stomp-song.js, 2026-10-24): Rob's earlier Tango, the
    // lanky orange one with the ponytail, at a plain red kit. Four frames
    // made in Gemini by editing one base picture, so the kit is in exactly
    // the same place in every frame and only her arms move: sticks up (the
    // "and"), one up one down (in between), the hit (the beat), and no arms
    // (spare, for a puppet later). The kick drum's head is left blank: the
    // game puts the Kool Riffs badge on it.
    'ssong.kit.up':    'art/tango-drums-up.webp',
    'ssong.kit.mid':   'art/tango-drums-mid.webp',
    'ssong.kit.down':  'art/tango-drums-down.webp',
    'ssong.kit.base':  'art/tango-drums-base.webp',

    // The musician on screen during their steps (1 to 8 bars; not the
    // studio). A song can have its own: 'beat.coach.<musician>.<song>', e.g.
    // 'beat.coach.drums.c-1-4-1-5'. Until then every song uses these.
    'beat.coach.drums': 'art/tango-drums-mid.webp',
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

    // TANGO THE PUPPET (Rob, 2026-10-26): one body with her arms, faces and
    // hi-hat foot laid over it, each cut from one of Rob's Gemini frames by
    // difference against the clean base (every frame is an edit of that one
    // picture, so nothing but the changed part moves). tango-puppet.js plays
    // them; the three stick pictures above are the fallback.
    'tango.puppet.body': 'art/tango-puppet/body.webp',
    'tango.puppet.head.neutral': 'art/tango-puppet/head-neutral.webp',
    'tango.puppet.head.blink': 'art/tango-puppet/head-blink.webp',
    'tango.puppet.head.ah': 'art/tango-puppet/head-ah.webp',
    'tango.puppet.head.oo': 'art/tango-puppet/head-oo.webp',
    'tango.puppet.head.tilt': 'art/tango-puppet/head-tilt.webp',
    'tango.puppet.head.laugh': 'art/tango-puppet/head-laugh.webp',
    'tango.puppet.head.oops': 'art/tango-puppet/head-oops.webp',
    'tango.puppet.head.wink': 'art/tango-puppet/head-wink.webp',
    'tango.puppet.head.focus': 'art/tango-puppet/head-focus.webp',
    'tango.puppet.head.listen': 'art/tango-puppet/head-listen.webp',
    'tango.puppet.limb.L-up': 'art/tango-puppet/limb-L-up.webp',
    'tango.puppet.limb.L-mid': 'art/tango-puppet/limb-L-mid.webp',
    'tango.puppet.limb.L-crash': 'art/tango-puppet/limb-L-crash.webp',
    'tango.puppet.limb.L-tom': 'art/tango-puppet/limb-L-tom.webp',
    'tango.puppet.limb.R-up': 'art/tango-puppet/limb-R-up.webp',
    'tango.puppet.limb.R-mid': 'art/tango-puppet/limb-R-mid.webp',
    'tango.puppet.limb.R-snare': 'art/tango-puppet/limb-R-snare.webp',
    'tango.puppet.limb.R-hat': 'art/tango-puppet/limb-R-hat.webp',
    'tango.puppet.limb.cheer': 'art/tango-puppet/limb-cheer.webp',
    'tango.puppet.limb.point': 'art/tango-puppet/limb-point.webp',
    'tango.puppet.limb.foot-up': 'art/tango-puppet/limb-foot-up.webp',
    'tango.puppet.limb.foot-down': 'art/tango-puppet/limb-foot-down.webp',

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
    'beat.kit.warmup': { aspect: 800 / 670, head: { left: 0.3661, top: 0.6096, width: 0.2882 } },
    // The puppet's layers, as fractions of its 800 x 665 stage (x, y the top
    // left, w the width; each picture keeps its own shape), and the kick
    // drum's head measured on the body.
    'tango.puppet': { aspect: 800 / 665, head: { left: 0.3725, top: 0.6090, width: 0.2713 }, layers: {
        'body': { x: 0.0000, y: 0.0000, w: 1.0000 },
        'head.neutral': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.blink': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.ah': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.oo': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.tilt': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.laugh': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.oops': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.wink': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.focus': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'head.listen': { x: 0.3874, y: 0.0212, w: 0.3438 },
        'limb.L-up': { x: 0.3073, y: 0.0000, w: 0.1800 },
        'limb.L-mid': { x: 0.2156, y: 0.1620, w: 0.2838 },
        'limb.L-crash': { x: 0.2306, y: 0.1737, w: 0.2712 },
        'limb.L-tom': { x: 0.1594, y: 0.3632, w: 0.3287 },
        'limb.R-up': { x: 0.5792, y: 0.0657, w: 0.1388 },
        'limb.R-mid': { x: 0.5281, y: 0.1970, w: 0.3050 },
        'limb.R-snare': { x: 0.6302, y: 0.2817, w: 0.2062 },
        'limb.R-hat': { x: 0.6198, y: 0.3356, w: 0.2125 },
        'limb.cheer': { x: 0.3556, y: 0.0529, w: 0.3075 },
        'limb.point': { x: 0.2456, y: 0.2499, w: 0.6000 },
        'limb.foot-up': { x: 0.7147, y: 0.6788, w: 0.1875 },
        'limb.foot-down': { x: 0.6760, y: 0.4299, w: 0.2637 },
    } },
    // The drum room's kit: the kick drum's head, measured on the frames.
    'ssong.kit':       { aspect: 800 / 670, head: { left: 0.3661, top: 0.6096, width: 0.2882 } },
};

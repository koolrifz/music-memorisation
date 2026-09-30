/* =========================================
   KOOL RIFFS - WORDS, US ENGLISH (the base language)
   =========================================
   Every word the student sees or hears, by ID. Every ID used anywhere in
   the app must exist here; tools/check-text.py checks it.

   {braces} are filled in by the game, e.g. {note} becomes a note name.
   Change the words freely. Don't change an ID without changing the code
   that uses it.
   ========================================= */
KR.lang('en-US', {

    /* ---------- Note names ----------
       The ID after 'note.' is the note's name in rhythm-stomp-lab.js.
       en-GB.js gives the UK name for each. The "names" setting picks
       US, UK, or both - and 'note.both' is how both are shown. */
    'note.both':             '{us} ({uk})',
    'note.whole-note':       'whole note',
    'note.whole-note.many':  'whole notes',
    'note.half-note':        'half note',
    'note.half-note.many':   'half notes',
    'note.quarter-note':     'quarter note',
    'note.quarter-note.many': 'quarter notes',
    'note.whole-rest':       'whole rest',
    'note.whole-rest.many':  'whole rests',
    'note.half-rest':        'half rest',
    'note.half-rest.many':   'half rests',
    'note.quarter-rest':     'quarter rest',
    'note.quarter-rest.many': 'quarter rests',

    /* ---------- Dashboard: the Beat Smash card ---------- */
    'home.beat.icon':        '🥁',
    'home.beat.title':       'Beat Smash',
    'home.beat.blurb':       'Step into the studio. Play the beat, win a band.',

    /* ---------- Beat Smash: every screen ---------- */
    'beat.title':            'Beat Smash',
    'beat.back':             '⬅ Back',
    'beat.toDashboard':      'Back to Dashboard',
    'beat.rec':              '● REC',
    'beat.lockedIcon':       '•',
    'beat.star.full':        '★',
    'beat.star.empty':       '☆',
    'beat.pad.beat':         '{n}',
    'beat.pad.big':          '',

    /* ---------- Beat Smash: the pathway ---------- */
    'beat.start':            'Into the studio',
    'beat.playBand':         'Play my band',
    'beat.retune':           'Re-time my taps',
    'beat.pathway.say':      'Win your band, one musician at a time.',
    'beat.soon.riff':        'Riff is on his way. Bass and keys are coming soon!',
    'beat.musician.drums':        'Tango · Drums',
    'beat.musician.drums.icon':   '🥁',
    'beat.musician.bass':         'Riff · Bass',
    'beat.musician.bass.icon':    '🎸',
    'beat.musician.keys':         'Riff · Keys',
    'beat.musician.keys.icon':    '🎹',
    'beat.musician.booth':        'The booth',
    'beat.musician.booth.icon':   '🎙',
    'beat.settings.sound':   'Your sound',
    'beat.sound.kick':       'Kick',
    'beat.sound.snare':      'Snare',
    'beat.settings.pads':    'Pads',
    'beat.padMode.auto':     'Auto',
    'beat.padMode.four':     'Four',
    'beat.padMode.one':      'One big',
    'beat.settings.picture': 'Picture',
    'beat.settings.song':    'Jam song',
    /* Shown only with the teacher code on. {lean} {steady} are in ms. */
    'beat.stats.late':       'Last beat test: {onBeat}% on the beat in {taps} taps. Leans {lean} ms late (the device included), steady to ±{steady} ms. Tests kept: {tests}.',
    'beat.stats.early':      'Last beat test: {onBeat}% on the beat in {taps} taps. Leans {lean} ms early (the device included), steady to ±{steady} ms. Tests kept: {tests}.',

    /* ---------- Beat Smash: who is playing ---------- */
    'beat.player.ask':             "Who's playing? Tap your name, or type it. Then tap your age.",
    'beat.player.age':             'How old are you? Tap one.',
    'beat.player.nameNeeded':      'Type your name first.',
    'beat.player.namePlaceholder': 'Your name',
    'beat.player.add':             "Let's go",
    'beat.player.playingAs':       'Playing as: {name} ▾',
    'beat.age.6-8':                '6–8',
    'beat.age.9-10':               '9–10',
    'beat.age.11+':                '11+',

    /* ---------- Beat Smash: the studio ---------- */
    'beat.step.jam':         'Warm-up',
    'beat.step.band':        'My band',
    'beat.step.1':           'One bar',
    'beat.step.2':           'Two bars',
    'beat.step.3':           'The big take',
    'beat.jam.next':         'Show me what I played',
    'beat.jam.keepGoing':    'Keep jamming',
    'beat.jam.menu':         'Beat Smash menu',
    'beat.button.record':    '● Record',
    'beat.button.reroll':    '🎲 New roll',
    'beat.picture.blocks':   'Blocks',
    'beat.picture.counting': 'Counting',
    'beat.picture.machine':  'Drum machine',
    'beat.channel.drums':    'Drums',
    'beat.channel.bass':     'Bass',
    'beat.channel.keys':     'Keys',

    /* ---------- Beat Smash: the part picker (brief §8.3) ----------
       Buttons are never spoken. {style} is a style's name. */
    'beat.picker.title.drums': "Tango's drums",
    'beat.band.title':       'My band',
    'beat.button.keep':      'Keep',
    'beat.button.studio':    'Back to the studio',
    'beat.style.spicy':      'Spicy',
    'beat.style.smooth':     'Smooth',
    'beat.style.hop':        'Hop',
    'beat.style.spicy.icon': '🌶',
    'beat.style.smooth.icon': '🕶',
    'beat.style.hop.icon':   '🎧',

    /* ---------- Beat Smash: what Tango and Riff say ----------
       Attached to game events in content/dialogue.js. Placeholders:
       Rob will rewrite them. Stars are shown, never said. */
    'beat.line.copy':        'Copy me!',
    'beat.line.watch':       'Watch me. Boom, boom, boom, boom!',
    'beat.line.morph':       "That's what you just played!",
    'beat.line.layer.bass':  'Here comes the bass!',
    'beat.line.layer.keys':  'And the keys! Keep it going!',
    'beat.line.full':        "That's the groove! Keep it going as long as you like.",
    'beat.line.lost':        'Find the beat! Listen for the drums.',
    'beat.line.stopped':     'The band stopped when you did. Tap a pad to bring it back!',
    'beat.line.bluetooth':   'Bluetooth headphones are slow. Plug in, or play without them.',
    'beat.line.clean.1':     "That's a take!",
    'beat.line.clean.2':     "In the can!",
    'beat.line.again':       "Let's go again. Take two!",
    'beat.line.bigAgain':    'So close. Take two! Or roll a new one.',
    'beat.line.reveal':      "That's what you played. Now play it from the music.",
    'beat.line.retakeClean': "That's it! Now a new one.",
    'beat.line.step.1':      'Three in a row! Now two bars.',
    'beat.line.step.2':      'Three in a row! Now the big take: four bars, one take.',
    'beat.line.bigReady':    'Four bars. Read it, then hit Record. Roll a new one whenever you like.',
    'beat.line.findOne':     'Find one!',
    'beat.line.comeback':    'Back on the horse!',
    'beat.won.drums.1':      "That's a take! Your band needs a drummer!",
    'beat.picker.1':         'Which one feels right?',
    'beat.picker.2':         'Tap to listen. Keep the one you love.',
    'beat.picker.3':         'Spicy, Smooth or Hop?',
    'beat.heard.spicy.1':    'Spicy! Nice groove.',
    'beat.heard.smooth.1':   'Smooth… laid back.',
    'beat.heard.hop.1':      "Hop! That one's bouncy.",
    'beat.locked.drums.1':   '{style} drums, locked in. This is your band now.',
    'beat.line.playback':    "Listen to that. Look how much you've built.",


    /* ---------- The band's songs (content/songs.js) ---------- */
    'song.c':                'C: I IV I V',
    'song.c-6dim':           'C: I6 ♭iii°7 ii7 V7(♭9)',
    'song.c-6dim-tritone':   'C: I6 ♭iii°7 ii7 ♭II7(♭5)',
    'song.ab-6dim':          'A♭: I6 ♭iii°7 ii7 V7(♭9)',
    'song.ab-6dim-tritone':  'A♭: I6 ♭iii°7 ii7 ♭II7(♭5)',

    /* ---------- Teacher codes (teacher-codes.js) ---------- */
    'code.placeholder':      'Teacher code',
    'code.enter':            'Enter',
    'code.reset':            'Everything is back to zero on this device. Starting again…',
    'code.open':             'Every level in every game is open on this device. Type the code again to turn it off.',
    'code.closed':           'Turned off. Levels open as they are won again; anything already played stays open.',
    'code.unknown':          "That's not a code I know.",

    /* ---------- Dashboard: the Value Smash card ---------- */
    'home.value.icon':       '♩',
    'home.value.title':      'Value Smash',
    'home.value.blurb':      'How long does each note last? Smash the values.',

    /* ---------- Value Smash: every screen ---------- */
    'value.title':           'Value Smash',
    'value.back':            '⬅ Back',
    'value.toDashboard':     'Back to Dashboard',

    /* ---------- Value Smash: who is playing ---------- */
    'value.player.askFirst':        "Hi! What's your name?",
    'value.player.askSwitch':       "Who's playing? Tap your name, or type a new one.",
    'value.player.nameNeeded':      'Type your name first.',
    'value.player.namePlaceholder': 'Your name',
    'value.player.add':             "Let's go",
    'value.player.playingAs':       'Playing as: {name} ▾',

    /* ---------- Value Smash: the pathway ---------- */
    'value.subtitle':        'Pick a floor.',
    'value.choose':          'Choose your mission',
    'value.start':           'Start {floor}',
    'value.floor.lockedIcon': '•',
    'value.star.full':       '★',
    'value.star.empty':      '☆',
    'value.floor.v1-tree.name':   'The Tree',
    'value.floor.v1-smash.name':  'Smash',
    'value.floor.v1-sprint.name': 'Sprint',

    /* ---------- Value Smash: playing a floor ---------- */
    'value.floor.empty':     'This floor is still being built. Come back soon!',
    'value.floor.back':      'Back to the floors',

    /* ---------- Value Smash: The Tree ----------
       {row} {tile} {top}: a note name.  {rows}: its plural.  {n}: a number. */
    'value.tree.header':         '{floor} · Round {n} of {total}',
    'value.tree.start':          'The {row} row is done. Tap the tiles to fill the other rows.',
    'value.tree.startRests':     'Now the rests. The {row} row is done. Fill the other rows.',
    'value.tree.refuse.longer':  "That row is {rows}. A {tile} is as long as {n} {rows}. It won't fit.",
    'value.tree.refuse.half':    'That row is {rows}. A {tile} is only half a {row}.',
    'value.tree.refuse.quarter': 'That row is {rows}. A {tile} is only a quarter of a {row}.',
    'value.tree.refuse.sound':   'That row is {rows}: silence. A {tile} is a sound.',
    'value.tree.refuse.silence': 'That row is {rows}: sound. A {tile} is a silence.',
    'value.tree.rowDoneTop':     'Listen. One {row} fills the whole row.',
    'value.tree.rowDone':        'Listen. {n} {rows} last as long as one {top}.',
    'value.tree.roundDone':      'Round {n} done!',
    'value.tree.again':          "{n} tiles didn't fit that time. Let's build it again.",

    /* ---------- Value Smash: Smash ---------- */
    'value.beatKey':             'C · ♩ = 1 beat',
    'value.smash.header':        '{floor} · {cards} cards',
    'value.smash.beats.one':     'Smash everything worth 1 beat.',
    'value.smash.beats':         'Smash everything worth {n} beats.',
    'value.smash.equals':        'Smash everything that equals a {note}.',
    'value.smash.nothing':       'Nothing here',
    'value.smash.dud':           'Nothing to smash. Well spotted! That earns a joker.',
    'value.smash.jokerUsed':     'Your joker saved your streak.',
    'value.smash.missed':        'Missed some! The outlined cards were the ones.',
    'value.smash.tierUp':        'Tier up! {cards} cards now.',
    'value.smash.tierUpClock':   'Tier up! {cards} cards, and the clock starts now: {seconds} seconds.',
    'value.smash.score':         'Score {n}',
    'value.smash.combo':         'Combo ×{n}',
    'value.smash.clock':         '{n}s',
    'value.smash.joker':         '🃏 Joker',

    /* ---------- Value Smash: the Sprint ---------- */
    'value.medal.bronze':        '🥉 Bronze',
    'value.medal.silver':        '🥈 Silver',
    'value.medal.gold':          '🥇 Gold',
    'value.sprint.medalEarned':  '{medal}! Now {cards} cards.',
    'value.sprint.topTier':      '{medal}! Keep smashing for points.',
    'value.sprint.needBronze':   'Clear three screens in a row at {cards} cards to win Bronze.',

    /* ---------- Value Smash: the Artistic License ----------
       'value.license.say' and 'value.license.needed' are Tango's lines. */
    'value.license.badge':       '🎨',
    'value.license.title':       'Artistic License',
    'value.license.holder':      'Awarded to {name}',
    'value.license.body':        'You can smash whole, half and quarter notes and their rests. Rhythm Stomp Lab is open!',
    'value.license.say':         "You've earned your Artistic License! Rhythm Stomp Lab is open.",
    'value.license.go':          'Open Rhythm Stomp Lab',
    'value.license.later':       'Later',
    'value.license.needed':      'You need your Artistic License for Rhythm Stomp Lab. Win a medal in the Value Smash Sprint to earn it.',
    'value.license.openValue':   'Go to Value Smash',
    'value.license.notNow':      'Not now',

    /* ---------- Value Smash: the Tree help card ---------- */
    'value.tree.button':     '🌳 Tree',
    'value.tree.cardTitle':  'Your tree',
    'value.tree.close':      'Close',

    /* ---------- Value Smash: results ---------- */
    'value.results.title':   'Results',
    'value.results.cleared': '{floor} cleared!',
    'value.results.time':    'Time: {seconds} seconds',
    'value.results.opened':  '{floor} is open!',
    'value.results.score':   'Score: {n}',
    'value.results.best':    'Best: {n}',
    'value.results.newBest': 'New personal best!',
    'value.results.timeUp':  "Time's up!",
    'value.results.reached': 'You reached {cards} cards.',
    'value.results.again':   'Play again',

});

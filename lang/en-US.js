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

    /* ---------- Value Smash: the Tree help card ---------- */
    'value.tree.button':     '🌳 Tree',
    'value.tree.cardTitle':  'Your tree',
    'value.tree.close':      'Close',

    /* ---------- Value Smash: results ---------- */
    'value.results.title':   'Results',
    'value.results.cleared': '{floor} cleared!',
    'value.results.time':    'Time: {seconds} seconds',
    'value.results.opened':  '{floor} is open!',

});

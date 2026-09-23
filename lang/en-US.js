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
    'note.half-note':        'half note',
    'note.quarter-note':     'quarter note',
    'note.whole-rest':       'whole rest',
    'note.half-rest':        'half rest',
    'note.quarter-rest':     'quarter rest',

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

    /* ---------- Value Smash: results ---------- */
    'value.results.title':   'Results',

});

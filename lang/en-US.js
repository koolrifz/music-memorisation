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

});

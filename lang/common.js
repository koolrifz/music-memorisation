/* =========================================
   KOOL RIFFS - WORDS: SHARED BY EVERY GAME
   =========================================
   Change only the words between the backticks `like this`.
     - Apostrophes and quote marks are fine inside them.
     - {braces} are filled in by the game: {n} is a number, {note} a
       note name. You can move them or leave them out.
     - Leave the line in 'quotes' above the words alone - it is the ID
       the game looks the words up by - and keep the comma at the end.
     - Never type a backtick inside the words.
   How to edit from a phone, and what happens if a file breaks:
   lang/README.md
   ========================================= */
KR.lang('en-US', {

    /* ---------- Note names ----------
       The ID after 'note.' is the note's name in rhythm-stomp-lab.js.
       uk-english.js gives the UK name for each. The "names" setting picks
       US, UK, or both - and 'note.both' is how both are shown. */
    'note.both':
        `{us} ({uk})`,
    'note.whole-note':
        `whole note`,
    'note.whole-note.many':
        `whole notes`,
    'note.half-note':
        `half note`,
    'note.half-note.many':
        `half notes`,
    'note.quarter-note':
        `quarter note`,
    'note.quarter-note.many':
        `quarter notes`,
    'note.whole-rest':
        `whole rest`,
    'note.whole-rest.many':
        `whole rests`,
    'note.half-rest':
        `half rest`,
    'note.half-rest.many':
        `half rests`,
    'note.quarter-rest':
        `quarter rest`,
    'note.quarter-rest.many':
        `quarter rests`,

    /* ---------- Buttons every game uses ---------- */
    'common.back':
        `⬅ Back`,
    'common.toDashboard':
        `Back to Dashboard`,
    // A best score on a pathway node
    'common.points':
        `{n} pts`,

    /* ---------- Dashboard: the Value Smash card ---------- */
    'home.value.icon':
        `♩`,
    'home.value.title':
        `Value Smash`,
    'home.value.blurb':
        `How long does each note last? Smash the values.`,

});

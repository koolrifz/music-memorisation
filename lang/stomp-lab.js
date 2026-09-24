/* =========================================
   KOOL RIFFS - WORDS: RHYTHM STOMP LAB
   =========================================
   Change only the words between the backticks `like this`.
     - Apostrophes and quote marks are fine inside them.
     - {braces} are filled in by the game: {n} is a number, {bar} a bar
       number. You can move them or leave them out.
     - Leave the line in 'quotes' above the words alone - it is the ID
       the game looks the words up by - and keep the comma at the end.
     - Never type a backtick inside the words.
   How to edit from a phone, and what happens if a file breaks:
   lang/README.md
   ========================================= */
KR.lang('en-US', {

    /* ---------- The pathway ---------- */
    'stomp.title':
        `Rhythm Stomp Lab`,
    'stomp.subtitle':
        `New interface prototype — pick a level to test.`,
    'stomp.choose':
        `Choose your mission`,
    'stomp.start':
        `Start {level}`,

    /* ---------- The first screen of Level 1 ---------- */
    'stomp.intro.level':
        `Level 1 · Whole Notes and Rests`,
    'stomp.intro.lead':
        `Every bar gets 4 beats. For each beat, you'll answer one simple question:`,
    'stomp.intro.playMeans':
        `a new note starts here`,
    'stomp.intro.nothingNewMeans':
        `nothing new — still ringing, or silence`,
    'stomp.intro.howItWorks':
        `Tap one, and it's written under the music straight away. Fill all 4 bars, then check your answer. Three phrases right in a row and you've mastered the level.`,
    'stomp.intro.start':
        `Start Level 1`,

    /* ---------- Playing a level ---------- */
    'stomp.streak':
        `Streak:`,
    'stomp.progress.count':
        `Count {n} of {total}`,
    'stomp.progress.all':
        `All {total} counts in`,
    'stomp.jump':
        `Jump to cursor`,
    'stomp.hear':
        `Hear it`,
    'stomp.fullView':
        `Full view`,
    'stomp.submit':
        `Check My Answer`,
    'stomp.undo':
        `↺ Undo`,
    'stomp.restart':
        `⟲ Restart`,

    /* ---------- The two buttons (Levels 1 to 4) ----------
       The button names are also used in the hints, so a hint always names
       the button the way the button itself says it. */
    'stomp.button.play':
        `PLAY`,
    'stomp.button.playMeans':
        `a new note starts`,
    'stomp.button.nothingNew':
        `NOTHING NEW`,
    'stomp.button.nothingNewMeans':
        `held, or silent`,

    /* ---------- The reasons in a hint ----------
       After a second wrong tap on the same count, the hint says which
       button and why. These are the three whys, one for each thing a count
       can be. They fill {because} in 'stomp.prompt.walk-hint'. */
    'stomp.because.play':
        `a new note starts on this count.`,
    'stomp.because.rest':
        `this count is silent, nothing is sounding.`,
    'stomp.because.hold':
        `the note before is still ringing through this count.`,

    /* ---------- What the gold box says ----------
       Each of these can be reworded for one level only: copy the line,
       put the level's number in its ID, and change the words there. For
       Level 7's own 'write-bar':
           'stomp.level.7.prompt.write-bar':
               `Bar {bar} — two tied crotchets ARE a minim. Count what you see.`,
       Any level without its own line uses the one here. */
    // the standing instruction while writing a bar. {bar}
    'stomp.prompt.write-bar':
        `Bar {bar} — write the counting under the notes.`,
    // while a bracket is open and not yet closed
    'stomp.prompt.bracket-open':
        `Bracket open — count the beats it holds for, then close it.`,
    // every bar written, the answer can be checked. {bars}
    'stomp.prompt.all-written':
        `All {bars} bars written — check your answer below.`,
    // the answer is on screen after the third try
    'stomp.prompt.revealed':
        `Here's the counting.`,
    // two buttons: the question on each count. {bar} {label}
    'stomp.prompt.walk-beat':
        `Bar {bar} · Beat {label} — does a new note start here?`,
    // two buttons: every count answered
    'stomp.prompt.walk-done':
        `All filled in — check your answer below.`,
    // the phrase was right. {points}
    'stomp.prompt.nailed':
        `Nailed it! +{points}`,
    // first try wrong, exactly one bar wrong
    'stomp.prompt.miss-one':
        `One bar isn't right. Can you find it before you submit again?`,
    // first try wrong, several bars wrong. {n}
    'stomp.prompt.miss-some':
        `{n} bars aren't right. Can you find them?`,
    // second try wrong, naming the one wrong bar. {bar}
    'stomp.prompt.name-one':
        `Bar {bar} isn't right — read it again.`,
    // second try wrong, naming the wrong bars. {bars}
    'stomp.prompt.name-some':
        `Bars {bars} aren't right — read them again.`,
    // third try wrong, the answer is shown
    'stomp.prompt.show-answer':
        `Here's the counting — streak reset. New phrase next.`,
    // two buttons: the first wrong tap on a count
    'stomp.prompt.walk-wrong':
        `Not quite — look again at the note the cursor is on.`,
    // two buttons: another wrong tap on the same count. {answer} is the button's name, {because} is one of the three reasons below
    'stomp.prompt.walk-hint':
        `Look again — it's {answer}: {because}`,
    // two buttons: finished, but some taps needed putting right. {n}
    'stomp.prompt.walk-missed':
        `Good — but you needed {n} put right. Walk a clean one to build the streak.`,

    /* ---------- Level names ----------
       'name' is shown while playing; 'short' is on the pathway, the Start
       button and "... mastered!". The number is the level's ID and never
       changes, even if the levels are reordered. */
    'stomp.level.1.name':
        `Level 1: Whole Notes and Rests`,
    'stomp.level.1.short':
        `Whole Notes and Rests`,
    'stomp.level.2.name':
        `Level 2: Half Notes and Rests`,
    'stomp.level.2.short':
        `Half Notes and Rests`,
    'stomp.level.3.name':
        `Level 3: Whole and Half Notes Mixed`,
    'stomp.level.3.short':
        `Whole and Half Mixed`,
    'stomp.level.4.name':
        `Level 4: Quarter Notes and Rests`,
    'stomp.level.4.short':
        `Quarter Notes and Rests`,
    'stomp.level.5.name':
        `Level 5: Quarters, Halves and Wholes`,
    'stomp.level.5.short':
        `Quarters, Halves, Wholes`,
    'stomp.level.6.name':
        `Level 6: Syncopation`,
    'stomp.level.6.short':
        `Syncopation`,
    'stomp.level.7.name':
        `Level 7: Ties Inside the Bar`,
    'stomp.level.7.short':
        `Ties Inside the Bar`,
    'stomp.level.8.name':
        `Level 8: Dotted Half Notes`,
    'stomp.level.8.short':
        `Dotted Half Notes`,
    'stomp.level.9.name':
        `Level 9: Ties Across the Barline`,
    'stomp.level.9.short':
        `Ties Across the Barline`,
    'stomp.level.10.name':
        `Level 10: Paired Quavers`,
    'stomp.level.10.short':
        `Paired Quavers`,
    'stomp.level.11.name':
        `Level 11: Quavers and Longer Notes`,
    'stomp.level.11.short':
        `Quavers and Longer`,
    'stomp.level.12.name':
        `Level 12: Single Quavers and Quaver Rests`,
    'stomp.level.12.short':
        `Single Quavers`,
    'stomp.level.13.name':
        `Level 13: Ties Inside the Bar`,
    'stomp.level.13.short':
        `Ties Inside the Bar`,
    'stomp.level.14.name':
        `Level 14: The Pump`,
    'stomp.level.14.short':
        `The Pump`,
    'stomp.level.15.name':
        `Level 15: The Pumps Walk the Bar`,
    'stomp.level.15.short':
        `Pumps in the Bar`,
    'stomp.level.16.name':
        `Level 16: Pumps Across the Barline`,
    'stomp.level.16.short':
        `Pumps Across the Bar`,
    'stomp.level.17.name':
        `Level 17: Syncopation`,
    'stomp.level.17.short':
        `Syncopation`,
    'stomp.level.18.name':
        `Level 18: Syncopation and Pumps`,
    'stomp.level.18.short':
        `Syncopation + Pumps`,
    'stomp.level.19.name':
        `Level 19: Quaver Review`,
    'stomp.level.19.short':
        `Quaver Review`,
    'stomp.level.20.name':
        `Level 20: Six-Eight, Counted in Six`,
    'stomp.level.20.short':
        `Six-Eight in Six`,
    'stomp.level.21.name':
        `Level 21: Six-Eight, Dotted Crotchets and Ties`,
    'stomp.level.21.short':
        `Six-Eight Groups`,
    'stomp.level.22.name':
        `Level 22: Four Semiquavers`,
    'stomp.level.22.short':
        `Four Semiquavers`,
    'stomp.level.23.name':
        `Level 23: Semiquavers Mixed`,
    'stomp.level.23.short':
        `Semiquavers Mixed`,
    'stomp.level.24.name':
        `Level 24: Quaver and Two Semiquavers`,
    'stomp.level.24.short':
        `Quaver + Two Semis`,
    'stomp.level.25.name':
        `Level 25: Ties Inside the Bar`,
    'stomp.level.25.short':
        `Ties Inside the Bar`,
    'stomp.level.26.name':
        `Level 26: Dotted Quaver and Semiquaver`,
    'stomp.level.26.short':
        `Dotted Quaver + Semi`,
    'stomp.level.27.name':
        `Level 27: Semiquaver and Dotted Quaver`,
    'stomp.level.27.short':
        `Semi + Dotted Quaver`,
    'stomp.level.28.name':
        `Level 28: Semiquaver Syncopation`,
    'stomp.level.28.short':
        `Semiquaver Syncopation`,
    'stomp.level.29.name':
        `Level 29: Semiquaver Review`,
    'stomp.level.29.short':
        `Semiquaver Review`,

    /* ---------- Level mastered ---------- */
    'stomp.complete.kicker':
        `Level Mastered!`,
    'stomp.complete.title':
        `{level} mastered!`,
    'stomp.complete.body':
        `Three phrases counted correctly in a row.`,
    'stomp.complete.score':
        `score`,
    'stomp.complete.continue':
        `Continue`,

});

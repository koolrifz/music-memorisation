/* =========================================
   KOOL RIFFS - WORDS: VALUE SMASH
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

    /* ---------- Value Smash: every screen ---------- */
    'value.title':
        `Value Smash`,

    /* ---------- Value Smash: who is playing ---------- */
    'value.player.askFirst':
        `Hi! What's your name?`,
    'value.player.askSwitch':
        `Who's playing? Tap your name, or type a new one.`,
    'value.player.nameNeeded':
        `Type your name first.`,
    'value.player.namePlaceholder':
        `Your name`,
    'value.player.add':
        `Let's go`,
    'value.player.playingAs':
        `Playing as: {name} ▾`,

    /* ---------- Value Smash: the pathway ---------- */
    'value.subtitle':
        `Pick a floor.`,
    'value.choose':
        `Choose your mission`,
    'value.start':
        `Start {floor}`,
    'value.floor.lockedIcon':
        `•`,
    'value.star.full':
        `★`,
    'value.star.empty':
        `☆`,
    'value.floor.v1-tree.name':
        `The Tree`,
    'value.floor.v1-smash.name':
        `Smash`,
    'value.floor.v1-sprint.name':
        `Sprint`,

    /* ---------- Value Smash: playing a floor ---------- */
    'value.floor.empty':
        `This floor is still being built. Come back soon!`,
    'value.floor.back':
        `Back to the floors`,

    /* ---------- Value Smash: The Tree ----------
       {row} {tile} {top}: a note name.  {rows}: its plural.  {n}: a number. */
    'value.tree.header':
        `{floor} · Round {n} of {total}`,
    'value.tree.start':
        `The {row} row is done. Tap the tiles to fill the other rows.`,
    'value.tree.startRests':
        `Now the rests. The {row} row is done. Fill the other rows.`,
    'value.tree.refuse.longer':
        `That row is {rows}. A {tile} is as long as {n} {rows}. It won't fit.`,
    'value.tree.refuse.half':
        `That row is {rows}. A {tile} is only half a {row}.`,
    'value.tree.refuse.quarter':
        `That row is {rows}. A {tile} is only a quarter of a {row}.`,
    'value.tree.refuse.sound':
        `That row is {rows}: silence. A {tile} is a sound.`,
    'value.tree.refuse.silence':
        `That row is {rows}: sound. A {tile} is a silence.`,
    'value.tree.rowDoneTop':
        `Listen. One {row} fills the whole row.`,
    'value.tree.rowDone':
        `Listen. {n} {rows} last as long as one {top}.`,
    'value.tree.roundDone':
        `Round {n} done!`,
    'value.tree.again':
        `{n} tiles didn't fit that time. Let's build it again.`,

    /* ---------- Value Smash: Smash ---------- */
    'value.beatKey':
        `C · ♩ = 1 beat`,
    'value.smash.header':
        `{floor} · {cards} cards`,
    'value.smash.beats.one':
        `Smash everything worth 1 beat.`,
    'value.smash.beats':
        `Smash everything worth {n} beats.`,
    'value.smash.equals':
        `Smash everything that equals a {note}.`,
    'value.smash.nothing':
        `Nothing here`,
    'value.smash.dud':
        `Nothing to smash. Well spotted! That earns a joker.`,
    'value.smash.jokerUsed':
        `Your joker saved your streak.`,
    'value.smash.missed':
        `Missed some! The outlined cards were the ones.`,
    'value.smash.tierUp':
        `Tier up! {cards} cards now.`,
    'value.smash.tierUpClock':
        `Tier up! {cards} cards, and the clock starts now: {seconds} seconds.`,
    'value.smash.score':
        `Score {n}`,
    'value.smash.combo':
        `Combo ×{n}`,
    'value.smash.clock':
        `{n}s`,
    'value.smash.joker':
        `🃏 Joker`,

    /* ---------- Value Smash: the Sprint ---------- */
    'value.medal.bronze':
        `🥉 Bronze`,
    'value.medal.silver':
        `🥈 Silver`,
    'value.medal.gold':
        `🥇 Gold`,
    'value.sprint.medalEarned':
        `{medal}! Now {cards} cards.`,
    'value.sprint.topTier':
        `{medal}! Keep smashing for points.`,
    'value.sprint.needBronze':
        `Clear three screens in a row at {cards} cards to win Bronze.`,

    /* ---------- Value Smash: the Artistic License ----------
       'value.license.say' and 'value.license.needed' are Tango's lines. */
    'value.license.badge':
        `🎨`,
    'value.license.title':
        `Artistic License`,
    'value.license.holder':
        `Awarded to {name}`,
    'value.license.body':
        `You can smash whole, half and quarter notes and their rests. Rhythm Stomp Lab is open!`,
    'value.license.say':
        `You've earned your Artistic License! Rhythm Stomp Lab is open.`,
    'value.license.go':
        `Open Rhythm Stomp Lab`,
    'value.license.later':
        `Later`,
    'value.license.needed':
        `You need your Artistic License for Rhythm Stomp Lab. Win a medal in the Value Smash Sprint to earn it.`,
    'value.license.openValue':
        `Go to Value Smash`,
    'value.license.notNow':
        `Not now`,

    /* ---------- Value Smash: the Tree help card ---------- */
    'value.tree.button':
        `🌳 Tree`,
    'value.tree.cardTitle':
        `Your tree`,
    'value.tree.close':
        `Close`,

    /* ---------- Value Smash: results ---------- */
    'value.results.title':
        `Results`,
    'value.results.cleared':
        `{floor} cleared!`,
    'value.results.time':
        `Time: {seconds} seconds`,
    'value.results.opened':
        `{floor} is open!`,
    'value.results.score':
        `Score: {n}`,
    'value.results.best':
        `Best: {n}`,
    'value.results.newBest':
        `New personal best!`,
    'value.results.timeUp':
        `Time's up!`,
    'value.results.reached':
        `You reached {cards} cards.`,
    'value.results.again':
        `Play again`,

});

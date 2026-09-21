/* =========================================
   RHYTHM STOMP LAB — prototype of the new Counting interface
   (docs: koolrifz/kool-riffs-docs, rhythm-pillar-design-brief.md §9)

   This is a SEPARATE game from rhythm.js's "Rhythm Stomp" on purpose -
   nothing here touches rhythm.js. It exists to compare the old
   mode+stamp interface against the new two-state container model
   (Play vs a single "( )" bracket covering both Hold and Rest) on the
   same dashboard, side by side. Levels 1-4 so far (whole notes/rests,
   half notes/rests, the two mixed, ties across the barline - all
   untimed) - Level 1 doubles as a guided walkthrough, since it's the
   tutorial for this interaction model; every level after that launches
   straight into the game, matching the rest of the app.
   ========================================= */

/* =========================================================================
   THE SLOT GRID — what makes a level

   A level is defined by ONE ARRAY OF COUNTING LABELS (CLAUDE.md, "Counting
   engine"). The array's length is how many slots a bar holds; its distinct
   values are the keypad. Everything else about the level's grid falls out
   of it:

     ['1','2','3','4']                    4 slots, a slot is a crotchet
     ['1','+','2','+','3','+','4','+']    8 slots, a slot is a quaver
     ['1','e','+','a', ...]              16 slots, a slot is a semiquaver
     ['1','2','3','4','5','6']            6 slots, 6/8 counted in 6
     ['1','+','a','2','+','a']            6 slots, 6/8 counted in 2

   The last two are THE SAME SIX-SLOT GRID with different labels, which is
   exactly how 6/8 is taught: as simple time first, relabelled at speed later.
   ========================================================================= */

const RSTOMP_LABELS_BEAT = ['1', '2', '3', '4'];
const RSTOMP_LABELS_QUAVER = ['1', '+', '2', '+', '3', '+', '4', '+'];
const RSTOMP_LABELS_SEMIQUAVER = [
    '1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a'
];
const RSTOMP_LABELS_SIX_IN_SIX = ['1', '2', '3', '4', '5', '6'];
const RSTOMP_LABELS_SIX_IN_TWO = ['1', '+', 'a', '2', '+', 'a'];

// Note values, largest last, each one twice the one before it. This ladder is
// the only place the arithmetic of note values lives.
const RSTOMP_VALUE_LADDER = ['32', '16', '8', 'q', 'h', 'w'];

// How many slots a written note value covers, at a level whose slot is
// `slotValue`. Returns null when the value doesn't land on this level's grid -
// a dotted crotchet on a crotchet grid is 1.5 slots, which is not a thing the
// student can write, and the answer is to teach it on a quaver grid instead.
function rstompSlotsFor(value, slotValue) {
    const dotted = value.slice(-1) === 'd';
    const base = dotted ? value.slice(0, -1) : value;
    const steps = RSTOMP_VALUE_LADDER.indexOf(base) - RSTOMP_VALUE_LADDER.indexOf(slotValue);
    if (steps < 0) return null;
    const slots = Math.pow(2, steps) * (dotted ? 1.5 : 1);
    return Number.isInteger(slots) ? slots : null;
}

// The inverse: the single written note that lasts exactly `slots`, or null if
// no single note does and it has to be spelled as a tie. Used by the tie
// generator, which picks a length first and needs the notehead second.
function rstompValueForSlots(slots, slotValue) {
    return RSTOMP_VALUE_LADDER.reduce((found, base) => {
        if (found) return found;
        if (rstompSlotsFor(base, slotValue) === slots) return base;
        if (rstompSlotsFor(base + 'd', slotValue) === slots) return base + 'd';
        return null;
    }, null);
}

/* =========================================================================
   THE VOCABULARY
   One entry per written note or rest the generator can reach for. An entry
   names a NOTE VALUE, not a number of slots, because how many slots a
   crotchet covers depends on what a slot is at this level: one at Stage A,
   two once quavers arrive. The slot count is worked out per level.
   ========================================================================= */

// The values that carry a flag, and so can be beamed to a neighbour.
const RSTOMP_BEAMABLE = ['8', '8d', '16'];

const RSTOMP_VOCABULARY = {
    'whole-note': { value: 'w', isRest: false },
    'whole-rest': { value: 'w', isRest: true },
    'dotted-half-note': { value: 'hd', isRest: false },
    'dotted-half-rest': { value: 'hd', isRest: true },
    'half-note': { value: 'h', isRest: false },
    'half-rest': { value: 'h', isRest: true },
    'dotted-quarter-note': { value: 'qd', isRest: false },
    'dotted-quarter-rest': { value: 'qd', isRest: true },
    'quarter-note': { value: 'q', isRest: false },
    'quarter-rest': { value: 'q', isRest: true },
    'dotted-eighth-note': { value: '8d', isRest: false },
    'eighth-note': { value: '8', isRest: false },
    'eighth-rest': { value: '8', isRest: true },
    'sixteenth-note': { value: '16', isRest: false },
    'sixteenth-rest': { value: '16', isRest: true }
};

// Counting rounds are untimed at every level (the eventual Performing round
// is where timing pressure lives, per the design brief) - so no timing
// field exists here yet.
//
// STAGE A - sustain and the bracket. Labels "1 2 3 4", 4 bars.
// Built to design brief S13.4. DO NOT re-derive this order from the code or
// from a drum method: S13.1 records a reversal. The canon opens on the quarter
// note because it is percussion-shaped - one strike per beat IS the pulse for
// a drummer. These are wind and string players, for whom four quarters is four
// separate attacks and a whole note is one sustained sound, which is both
// easier and what a beginner should be doing anyway. And a bar of whole notes
// and whole rests has exactly two possible shapes:
//
//     1 (2 3 4)      a whole note
//     (1 2 3 4)      a whole rest
//
// which is the most constrained place the bracket can possibly be introduced,
// and the contrast teaches the one rule everything else rests on: the onset
// digit sits OUTSIDE the bracket for a note and INSIDE it for a rest.
//
// Every level after A3 follows the stage template (S13.3): the new value
// isolated, mixed, tied inside the bar, the dotted form revealed, syncopation,
// then ties across the barline. Stage A runs to nine because it has three
// values to introduce before that arc can start.
const RSTOMP_LEVELS = [
    /* A1-A4 ARE PLAYED ON THE TWO-BUTTON INTERFACE, A5 ONWARDS ON THE KEYPAD.
       Rob's call, and the reason is sharper than "easier first".

       THE DIGITS CARRY NO INFORMATION. Measured across all 29 levels, 400
       phrases each: the digit sequence NEVER varies. It is always the level's
       labels in order - "1 2 3 4 1 2 3 4..." - whatever the rhythm. Only the
       bracket pattern changes, and it changes constantly (up to 400 distinct
       patterns in 400 phrases). So the brackets are the whole test.

       Which means the two interfaces ask the IDENTICAL question. "Does a new
       note start here?" and "is this label inside a bracket or outside it?"
       are the same question asked twice. The keypad does not test more
       knowledge - it asks for more typing.

       The real difference is RECOGNITION versus PRODUCTION. The two-button
       cursor leads: it walks the phrase and the counting appears correctly in
       front of the student, which is how the technique gets given away. The
       keypad is led BY the student: they track their own position and produce
       the whole string, with nothing telling them where they are. That is much
       closer to writing counting under the notes by hand, which is the
       transferable skill.

       The handover is at A5 rather than at the quaver grid because B1 would
       land a new interface, a new grid and a new key all on one level - three
       new ideas at once. A5 introduces no new notation at all, so it has the
       room, and the interface change becomes ITS one new idea.

       A corollary worth recording: an intermediate tier where the student
       types digits and the app supplies the brackets would be a test of
       NOTHING, since the digits are positional. It was considered and
       rejected on the measurement above. */

    // A1. The two-button walkthrough - the tutorial for the whole idea, and a
    // complete experience on its own for a child who can't yet write numerals
    // (CLAUDE.md, "TWO interfaces").
    { id: '1', label: 'Level 1: Whole Notes and Rests', shortLabel: 'Whole Notes and Rests',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['whole-note', 'whole-rest'] },

    // A2. Two events in a bar - the first time anything happens twice.
    { id: '2', label: 'Level 2: Half Notes and Rests', shortLabel: 'Half Notes and Rests',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['half-note', 'half-rest'], avoidRepeats: ['half-note'] },

    // A3. Switching scale inside a bar.
    { id: '3', label: 'Level 3: Whole and Half Notes Mixed', shortLabel: 'Whole and Half Mixed',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'], avoidRepeats: ['half-note'] },

    // A4. THE QUARTER-NOTE MAP (brief S13.5). The beat itself, in every
    // position. Fifteen bar shapes - everything from four quarters down to one
    // quarter, that one quarter in each of the four places - with the all-rest
    // bar excluded by the engraving rule. SEVEN of the fifteen do not start on
    // a struck beat 1, which is the "find beat 1 with no note on it" drill and
    // the reason this level cannot be skipped. Quarters ALONE are trivial;
    // quarters with rests in every position are the fundamental reading
    // exercise.
    { id: '4', label: 'Level 4: Quarter Notes and Rests', shortLabel: 'Quarter Notes and Rests',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['quarter-note', 'quarter-rest'] },

    // A5. THE KEYPAD ARRIVES. No new notation - the whole crotchet vocabulary
    // is already known - so the level's one new idea is that the student now
    // writes the counting instead of answering it. A sprinkle of long-hand
    // starts here too, now that a minim has a spelling the student can read.
    { id: '5', label: 'Level 5: Quarters, Halves and Wholes', shortLabel: 'Quarters, Halves, Wholes',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest'],
      spellOut: ['h'], longhandChance: 0.15, scribe: true },

    // A6. THE DOUBLED SYNCOPATION (brief S13.5a). The classic syncopation
    // figure one generation up: crotchet / minim / crotchet, onsets on 1, 2
    // and 4, counted "1 2 (3) 4". Syncopation does NOT wait for quavers - it
    // arrives here, where the student already has the vocabulary, and it seeds
    // the anacrusis at the same time. Rob: "It really has to pop back in on
    // beat 4. Beat 4 opens the door. It opens the door to beat 1. It's a
    // pickup beat."
    { id: '6', label: 'Level 6: Syncopation', shortLabel: 'Syncopation',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['half-note', 'half-rest', 'quarter-note', 'quarter-rest'],
      featureShape: ['quarter-note', 'half-note', 'quarter-note'], scribe: true },

    // A7. THE LONG-HAND DRILL - the level test of equivalency. Ties sit here
    // rather than back at whole notes on Rob's correction: the quarter is the
    // unit everything is built from, so once quarters exist you can tie two
    // into a half, three into a dotted half, or a half to a quarter - every
    // long-hand device becomes available at once. Teaching the tie at whole
    // notes gives one trick; teaching it here gives the whole toolkit.
    // spellOutEvery, so the short way and the long way appear in the same line
    // to be read against each other. This is also where the dotted minim is
    // first seen, as the thing three tied crotchets add up to.
    { id: '7', label: 'Level 7: Ties Inside the Bar', shortLabel: 'Ties Inside the Bar',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['half-note', 'half-rest', 'dotted-half-note', 'quarter-note', 'quarter-rest'],
      spellOut: ['h', 'hd'], longhandChance: 0.5, spellOutEvery: true, scribe: true },

    // A8. The shortcut A7 revealed, now in ordinary use. The scaffold comes
    // down: no spellOut here, so the dotted minim is written as a dotted minim.
    { id: '8', label: 'Level 8: Dotted Half Notes', shortLabel: 'Dotted Half Notes',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['whole-note', 'whole-rest', 'dotted-half-note', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest'],
      scribe: true },

    // A9. Any value crossing the barline. tieLevel/tieChance: see
    // generateRstompPhraseWithTie. Every phrase carries a tie, using only
    // durations already taught, per Rob's "a tie is just how we make really
    // long notes" framing.
    { id: '9', label: 'Level 9: Ties Across the Barline', shortLabel: 'Ties Across the Barline',
      labels: RSTOMP_LABELS_BEAT, slot: 'q',
      pool: ['whole-note', 'whole-rest', 'dotted-half-note', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest'],
      tieLevel: true, tieChance: 1, scribe: true },

    /* ===================== STAGE B - the quaver =====================
       Labels "1 + 2 + 3 + 4 +", TWO bars (design brief S13.10: 2 bars of
       quavers is 16 slots, the same typing burden as 4 bars of crotchets).

       THE CENTRE OF GRAVITY OF THE WHOLE PILLAR, and ten levels on Rob's
       instruction: "I think we need to develop a whole series around that
       area and spend some time there." The first subdivision of the beat is
       where the real work is; everything finer is the same skill smaller.
       ================================================================= */

    // B1. The beat divides. Quavers against the crotchet they split - the
    // contrast is the lesson, so a level of quavers alone would teach less.
    { id: '10', label: 'Level 10: Paired Quavers', shortLabel: 'Paired Quavers',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['quarter-note', 'quarter-rest', 'eighth-note'],
      subdivideWholeBeats: true, scribe: true },

    // B2. Divided beats among sustained ones.
    { id: '11', label: 'Level 11: Quavers and Longer Notes', shortLabel: 'Quavers and Longer',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest',
             'quarter-note', 'quarter-rest', 'eighth-note'],
      subdivideWholeBeats: true, scribe: true },

    // B3. An odd number of quavers in a beat, and the off-beat rest - the
    // first time a beat is not either whole or evenly halved.
    { id: '12', label: 'Level 12: Single Quavers and Quaver Rests', shortLabel: 'Single Quavers',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'half-rest', 'quarter-note', 'quarter-rest',
             'eighth-note', 'eighth-rest'], scribe: true },

    // B4. Ties at this grid - the long-hand drill one generation down. Two
    // quavers tied make a crotchet; a quaver tied to a crotchet makes a
    // dotted crotchet, which is the figure B5 then uses in plain notation.
    { id: '13', label: 'Level 13: Ties Inside the Bar', shortLabel: 'Ties Inside the Bar',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'dotted-quarter-note', 'quarter-note', 'quarter-rest',
             'eighth-note', 'eighth-rest'],
      spellOut: ['q', 'qd'], longhandChance: 0.5, spellOutEvery: true, scribe: true },

    // B5. THE PUMP, introduced on the downbeat. Rob's named figure: a dotted
    // crotchet then a quaver, two onsets always three quavers apart. On beat 1
    // the quaver lands on the "+" of 2, ANTICIPATING beat 3 - that flip into
    // the second strong beat is the funk in it.
    { id: '14', label: 'Level 14: The Pump', shortLabel: 'The Pump',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest'],
      figure: { notes: [{ slots: 3 }, { slots: 1 }], positions: 'downbeat' }, scribe: true },

    // B6. THE PUMPS I - the five positions that fit inside a bar.
    { id: '15', label: 'Level 15: The Pumps Walk the Bar', shortLabel: 'Pumps in the Bar',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest'],
      figure: { notes: [{ slots: 3 }, { slots: 1 }], positions: 'in-bar' }, scribe: true },

    // B7. THE PUMPS II - the three that cross the barline, where the dotted
    // crotchet has to be written as a tie because a written note cannot cross
    // a barline either. Same rule as the counting bracket, and here it is the
    // lesson rather than an inconvenience.
    { id: '16', label: 'Level 16: Pumps Across the Barline', shortLabel: 'Pumps Across the Bar',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest'],
      figure: { notes: [{ slots: 3 }, { slots: 1 }], positions: 'crossing' }, scribe: true },

    // B8. SYNCOPATION I - quaver / crotchet / quaver, the A6 figure now at
    // quaver resolution, walked through every position it fits.
    { id: '17', label: 'Level 17: Syncopation', shortLabel: 'Syncopation',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest'],
      figure: { notes: [{ slots: 1 }, { slots: 2 }, { slots: 1 }], positions: 'in-bar' },
      scribe: true },

    // B9. SYNCOPATION II - the syncopation figure anywhere, including across
    // the barline, with the pumps already in the vocabulary.
    { id: '18', label: 'Level 18: Syncopation and Pumps', shortLabel: 'Syncopation + Pumps',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'dotted-quarter-note', 'quarter-note', 'quarter-rest',
             'eighth-note', 'eighth-rest'],
      figure: { notes: [{ slots: 1 }, { slots: 2 }, { slots: 1 }], positions: 'all' },
      scribe: true },

    // B10. Barline ties and review - everything Stage B has taught, with a
    // tie over every barline.
    { id: '19', label: 'Level 19: Quaver Review', shortLabel: 'Quaver Review',
      labels: RSTOMP_LABELS_QUAVER, slot: '8', bars: 2,
      pool: ['half-note', 'half-rest', 'dotted-quarter-note', 'quarter-note',
             'quarter-rest', 'eighth-note', 'eighth-rest'],
      tieLevel: true, tieChance: 1, scribe: true },

    /* ===================== STAGE C - 6/8 in simple time =====================
       Labels "1 2 3 4 5 6", FOUR bars (24 slots, brief S13.10).

       Rob's decision: SIMPLE-TIME 6/8 COMES BEFORE SEMIQUAVERS, with the
       quaver as the smallest value. 6/8 is taught as six beats in a bar first;
       it returns after the semiquaver as Stage E, relabelled "1 + a 2 + a" and
       counted in two at speed. The two are the same six-slot grid.

       Two things here are not true anywhere else in the pillar:

       THE BEAT IS NOT THE BEAM GROUP. The counting names every quaver, so the
       beat is one slot - but quavers are still beamed in THREES, because the
       dotted-crotchet pulse is what the eye reads. Every earlier level had the
       two the same, so `beamSlots` exists for this.

       THE BAR DIVIDES BY THREE. Its metric levels are 6-3-1, not 6-3-2-1, and
       that changes where a rest may sit: a crotchet rest may cover quavers 1-2
       or 2-3 of a group, but never 3-4, because that straddles the two groups.
       "A multiple of its own length" would have allowed exactly that, which is
       why the rule is stated against the bar's metric levels instead.
       ===================================================================== */

    // C1. Sometimes the quaver gets the beat.
    { id: '20', label: 'Level 20: Six-Eight, Counted in Six', shortLabel: 'Six-Eight in Six',
      labels: RSTOMP_LABELS_SIX_IN_SIX, slot: '8', bars: 4, beamSlots: 3,
      pool: ['dotted-half-rest', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest'],
      scribe: true },

    // C2. Grouping in threes: the dotted crotchet fills a whole group, and
    // ties join them.
    { id: '21', label: 'Level 21: Six-Eight, Dotted Crotchets and Ties', shortLabel: 'Six-Eight Groups',
      labels: RSTOMP_LABELS_SIX_IN_SIX, slot: '8', bars: 4, beamSlots: 3,
      pool: ['dotted-half-note', 'dotted-half-rest', 'dotted-quarter-note', 'dotted-quarter-rest',
             'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest'],
      tieLevel: true, tieChance: 1, scribe: true },

    /* ===================== STAGE D - the semiquaver =====================
       Labels "1 e + a 2 e + a 3 e + a 4 e + a", TWO bars = 32 slots.

       THE COUNTING HERE IS FULL GRID, and that is a decision worth stating
       because the design brief now holds two rules that disagree.

       Brief S13.12 settles the app's rule: every slot a note covers gets a
       label, the onset's outside the bracket and the rest inside. A crotchet
       at this grid is "1 (e + a)", exactly as a semibreve at the crotchet grid
       is "1 (2 3 4)". The whole scribe interface rests on it - one label per
       slot, graded per slot - and S13.10's phrase lengths are counted that way.

       Brief S17.1, derived later from Rob's own marked MusicXML, says a
       quaver ON the quaver grid takes ONE label: "we are already comfortable
       with how quavers move". Under that rule the same crotchet would be "1".

       These are not a contradiction, they are THE DENSITY DIAL (S16.0). Full
       grid is the beginner's density - the drill, where every slot is tracked.
       S17.1 is the competent reader's, the sparse marking an advanced player
       writes by hand. The app teaches the first. Nothing here should be
       "corrected" to S17.1 without deciding to change what the app is for.
       ===================================================================== */

    // D1. The Parent Rhythm. Four semiquavers, and beats kept whole - the beat
    // either divides evenly or stays intact, so nothing obscures the division
    // itself. Uneven beats are D3's job.
    { id: '22', label: 'Level 22: Four Semiquavers', shortLabel: 'Four Semiquavers',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'sixteenth-note'],
      subdivideWholeBeats: true, scribe: true },

    // D2. Mixed with everything above.
    { id: '23', label: 'Level 23: Semiquavers Mixed', shortLabel: 'Semiquavers Mixed',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['whole-note', 'half-note', 'half-rest', 'dotted-quarter-note', 'quarter-note',
             'quarter-rest', 'eighth-note', 'eighth-rest', 'sixteenth-note'],
      scribe: true },

    // D3. Worksheet patterns 1 and 2, taught as a pair because the pair is the
    // lesson: the same three notes with the quaver at either end.
    { id: '24', label: 'Level 24: Quaver and Two Semiquavers', shortLabel: 'Quaver + Two Semis',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest', 'sixteenth-note'],
      figure: [{ notes: [{ slots: 2 }, { slots: 1 }, { slots: 1 }], positions: 'in-bar' },
               { notes: [{ slots: 1 }, { slots: 1 }, { slots: 2 }], positions: 'in-bar' }],
      scribe: true },

    // D4. Ties at this grid - the long-hand drill one generation down again.
    // Two semiquavers tied make a quaver; a semiquaver tied to a quaver makes
    // a dotted quaver, which is the figure D5 then uses in plain notation.
    { id: '25', label: 'Level 25: Ties Inside the Bar', shortLabel: 'Ties Inside the Bar',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'dotted-eighth-note',
             'eighth-note', 'eighth-rest', 'sixteenth-note'],
      spellOut: ['8', '8d'], longhandChance: 0.5, spellOutEvery: true, scribe: true },

    // D5. Pattern 3 - dotted quaver then semiquaver. The pump's shape one
    // generation down: two onsets three slots apart, starting on the beat.
    { id: '26', label: 'Level 26: Dotted Quaver and Semiquaver', shortLabel: 'Dotted Quaver + Semi',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest', 'sixteenth-note'],
      figure: { notes: [{ slots: 3 }, { slots: 1 }], positions: 'in-bar' }, scribe: true },

    // D6. Pattern 4 - reversed, and harder, because it IS a syncopation: the
    // long note starts off the beat.
    { id: '27', label: 'Level 27: Semiquaver and Dotted Quaver', shortLabel: 'Semi + Dotted Quaver',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest', 'sixteenth-note'],
      figure: { notes: [{ slots: 1 }, { slots: 3 }], positions: 'in-bar' }, scribe: true },

    // D7. Pattern 5 - semiquaver, quaver, semiquaver, counted "1 e (+) a".
    // This is the figure Rob marked by hand in his MusicXML, and the only
    // place a quaver has to be opened up to show where the next semiquaver
    // falls (brief S17.1).
    { id: '28', label: 'Level 28: Semiquaver Syncopation', shortLabel: 'Semiquaver Syncopation',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'quarter-note', 'quarter-rest', 'eighth-note', 'eighth-rest', 'sixteenth-note'],
      figure: { notes: [{ slots: 1 }, { slots: 2 }, { slots: 1 }], positions: 'in-bar' }, scribe: true },

    // D8. Full review, with a tie over every barline.
    { id: '29', label: 'Level 29: Semiquaver Review', shortLabel: 'Semiquaver Review',
      labels: RSTOMP_LABELS_SEMIQUAVER, slot: '16', bars: 2,
      pool: ['half-note', 'half-rest', 'dotted-quarter-note', 'quarter-note', 'quarter-rest',
             'dotted-eighth-note', 'eighth-note', 'eighth-rest', 'sixteenth-note'],
      tieLevel: true, tieChance: 1, scribe: true }
];

// Default bars per phrase. Stages set their own so the TYPING BURDEN stays
// roughly constant (design brief S13.10): 4 bars of crotchets and 2 bars of
// quavers are both 16 slots. Four bars of semiquavers would be 64, which is
// unreadable on a phone and brutal against an all-or-nothing gate.
const RSTOMP_BARS_PER_PHRASE = 4;

// Everything the rest of the file needs to know about the active level's
// grid, derived from its label array in one place so no function has to
// reach back into RSTOMP_LEVELS to ask how long a bar is.
function rstompGridFor(level) {
    const labels = level.labels || RSTOMP_LABELS_BEAT;
    const slotValue = level.slot || 'q';
    return {
        labels,
        slotValue,
        slotsPerBar: labels.length,
        // How many slots make one BEAT, read off the label array itself: the
        // gap to the next numeral. "1 + 2 +" is 2 slots to a beat, "1 e + a"
        // is 4, "1 + a" (compound, in 2) is 3, "1 2 3 4" is 1. Nothing extra
        // to declare - the labels already say what the beat is.
        slotsPerBeat: (() => {
            const next = labels.findIndex((l, i) => i > 0 && /^[0-9]/.test(l));
            return next > 0 ? next : 1;
        })(),
        barsPerPhrase: level.bars || RSTOMP_BARS_PER_PHRASE,
        // The BEAM GROUP, which is not always the beat. In 6/8 counted in six
        // the beat is a quaver but quavers are still beamed in threes - the
        // dotted-crotchet pulse is what the eye reads even when the counting
        // names every quaver. Simple time has no such split, so this defaults
        // to the beat and only compound levels declare it.
        beamSlots: level.beamSlots || null,
        avoidRepeats: level.avoidRepeats || [],
        metricLevels: rstompMetricLevels(labels.length),
        subdivideWholeBeats: !!level.subdivideWholeBeats,
        // The vocabulary, resolved onto THIS level's grid. A value that
        // doesn't land on the grid is dropped rather than silently rounded.
        units: (level.pool || []).map(key => {
            const entry = RSTOMP_VOCABULARY[key];
            const slots = entry ? rstompSlotsFor(entry.value, slotValue) : null;
            return slots ? { key, value: entry.value, isRest: entry.isRest, slots } : null;
        }).filter(Boolean)
    };
}

// What VexFlow needs to know about how full a bar is. Total ticks is all a
// Voice actually cares about, so slots-per-bar over the slot's own
// denominator is always right: 4 crotchet slots reads as 4/4, 8 quaver slots
// as 8/8 (the same bar), 6 quaver slots as 6/8.
const RSTOMP_VALUE_DENOMINATOR = { w: 1, h: 2, q: 4, '8': 8, '16': 16, '32': 32 };

// The metric levels of a bar, coarsest first: the whole bar, then each way it
// divides. 4/4 on the crotchet grid is 4-2-1; 6/8 is 6-3-1. Halving where it
// can and thirding where it cannot is what makes compound time come out right.
function rstompMetricLevels(slotsPerBar) {
    const out = [];
    let n = slotsPerBar;
    while (n >= 1) {
        out.push(n);
        if (n === 1) break;
        if (n % 2 === 0) n /= 2;
        else if (n % 3 === 0) n /= 3;
        else break;
    }
    return out;
}

function rstompVoiceMeter() {
    return { num: rstompSlotsPerBar, den: RSTOMP_VALUE_DENOMINATOR[rstompSlotValue] };
}

/* =========================================================================
   THE EQUIVALENCY SCAFFOLD  ("the long way")

   One written note, spelled out as several tied notes, so the student sees
   that the two are the same length. A minim is the short way; two tied
   crotchets are the long way. Rob: "that is the point."

   IT IS SCAFFOLDING, AND IT COMES DOWN. This is not a permanent 10% garnish
   sprinkled through every level. A level that is LANDING a new note value
   spells that value out - every way it can be spelled - as a rite of passage.
   Once the student can see the equivalence, the scaffold is withdrawn and
   later levels show the plain note only. Rob: "As soon as they can see that,
   we don't have to show it to them anymore. They just need to pass that
   round. It's a level test of equivalency."

   It recurs at every subdivision, which is why it lives on the grid rather
   than in a table: two quavers make a crotchet at Stage B for exactly the
   reason two crotchets make a minim at Stage A, and two semiquavers make a
   quaver at Stage D. Rob: "All of this equivalency has to scale down into
   subdivision."

   ONE GENERATION AT A TIME. The pieces may be the target's own base value or
   the one immediately below it, never further. So a dotted minim may be
   spelled crotchet+minim, minim+crotchet, or - Rob's "ludicrous mode" -
   three tied crotchets. A semibreve may be two tied minims, but NEVER four
   tied crotchets: crotchets are two generations below a semibreve, and that
   is a different (and much worse) picture.

   The counting is NOT always identical, and that is information rather than a
   defect. Short-note-first spellings read identically to the plain note
   (crotchet tied to minim is "1 (2 3)", so is a dotted minim). The others
   do not, because they are more written notes and every written note gets its
   own group: two tied minims read "1 (2) (3 4)" where a semibreve reads
   "1 (2 3 4)". Both belong in the scaffold round - the first teaches that
   they are the same, the second teaches that the counting shows you which
   spelling you are looking at.
   ========================================================================= */

// The piece values allowed when spelling out `value`: its own base, and the
// one generation below. A dotted minim's base is the minim, so its pieces may
// be minims and crotchets.
function rstompSpellingPieces(value, slotValue) {
    const base = value.slice(-1) === 'd' ? value.slice(0, -1) : value;
    const index = RSTOMP_VALUE_LADDER.indexOf(base);
    return [RSTOMP_VALUE_LADDER[index], RSTOMP_VALUE_LADDER[index - 1]]
        .filter(Boolean)
        .map(piece => ({ value: piece, slots: rstompSlotsFor(piece, slotValue) }))
        .filter(piece => piece.slots);
}

// Every way to write `value` as two or more tied notes, one generation down.
// Order matters: crotchet+minim and minim+crotchet are different pictures and
// count differently, and Rob wants both when a dotted minim is being landed.
function rstompLonghandSpellings(value, slotValue) {
    const total = rstompSlotsFor(value, slotValue);
    const pieces = rstompSpellingPieces(value, slotValue);
    if (!total) return [];
    const out = [];
    (function build(remaining, run) {
        if (remaining === 0) { if (run.length > 1) out.push(run); return; }
        pieces.forEach(piece => {
            if (piece.slots <= remaining) build(remaining - piece.slots, [...run, piece]);
        });
    })(total, []);
    return out;
}

// Rewrite one spec as its long-hand spelling: the first piece is struck, every
// piece after it is tied into. Nothing else about the bar moves, because the
// total slot count is unchanged by construction.
function rstompSpellOutSpec(spec, spelling) {
    return spelling.map((piece, index) => ({
        slots: piece.slots,
        value: piece.value,
        isRest: false,
        tied: index > 0 ? true : spec.tied
    }));
}

// Apply the scaffold to a generated phrase, in place of one plain note. A
// level opts in with `spellOut` (which values it is landing) and
// `longhandChance`. At most one note per phrase is spelled out - the device
// is a pointed comparison, not a texture - and a note already tied into is
// never chosen, since spelling out a continuation teaches nothing.
function rstompApplyLonghand(bars, level, grid) {
    if (!level.spellOut || !level.spellOut.length) return bars;
    const chance = level.longhandChance != null ? level.longhandChance : 0;

    const candidates = [];
    bars.forEach((specs, barIndex) => specs.forEach((spec, specIndex) => {
        if (spec.isRest || spec.tied) return;
        if (level.spellOut.indexOf(spec.value) === -1) return;
        const spellings = rstompLonghandSpellings(spec.value, grid.slotValue);
        if (spellings.length) candidates.push({ barIndex, specIndex, spellings });
    }));
    if (!candidates.length) return bars;

    // Two modes, because a sprinkle and a drill want different things.
    //
    // SPRINKLE (the default): one note in the phrase, at `longhandChance`. The
    // device is a pointed comparison against the plain notation around it, so
    // more than one at a time blurs it.
    //
    // DRILL (`spellOutEvery`): each eligible note is rolled independently, so
    // one phrase carries several and the short way and the long way sit side
    // by side in the same line. This is what a level whose whole job is
    // equivalency needs - A7, where two tied crotchets and a plain minim have
    // to be readable against each other.
    const chosen = level.spellOutEvery
        ? candidates.filter(() => Math.random() < chance)
        : (Math.random() < chance ? [candidates[Math.floor(Math.random() * candidates.length)]] : []);

    // Right to left, so an earlier rewrite doesn't shift a later one's index.
    chosen.slice().sort((a, b) => b.barIndex - a.barIndex || b.specIndex - a.specIndex)
        .forEach(pick => {
            const spelling = pick.spellings[Math.floor(Math.random() * pick.spellings.length)];
            const specs = bars[pick.barIndex];
            bars[pick.barIndex] = [
                ...specs.slice(0, pick.specIndex),
                ...rstompSpellOutSpec(specs[pick.specIndex], spelling),
                ...specs.slice(pick.specIndex + 1)
            ];
        });
    return bars;
}

/* =========================================================================
   NOTE BOUNDARIES ARE EXPLICIT
   A phrase is a list of bars; a bar is a list of SPECS, one per written note
   or rest: { slots, value, isRest, tied }. `tied` means this note is tied
   into from the note before it - it is drawn, but never re-struck.

   Beats alone cannot carry this. Two half notes tied inside a bar and a
   single whole note have the identical slot stream (play/hold/hold/hold), and
   Rob's counting tells them apart: "1(2)(34)" against "1(234)". The same
   ambiguity blocks the long-hand spelling device in the design brief (two
   tied crotchets shown against a minim). Specs are the fix, and everything
   else - the slot stream, the counting, the notation - derives from them.
   ========================================================================= */

// Specs -> the per-slot stream the two-button interface answers against. A
// tied note's first slot is a Hold, not a Play: it is the same note still
// sounding, so nothing new starts there.
function rstompSpecsToSlots(specs) {
    const stream = [];
    specs.forEach(spec => {
        for (let k = 0; k < spec.slots; k++) {
            stream.push(spec.isRest ? 'rest' : (k === 0 && !spec.tied ? 'play' : 'hold'));
        }
    });
    return stream;
}

function rstompSpecsToPhrase(specBars) {
    return specBars.map(rstompSpecsToSlots);
}

let rstompSelectedLevel = '1';
let rstompSpecBars = [];        // SOURCE OF TRUTH: bars, each a list of {slots,value,isRest,tied}
let rstompPhrase = [];          // derived slot stream: bars, each slotsPerBar of 'play'/'hold'/'rest'
let rstompPositions = [];       // the counted positions: [{barIndex, slotIndex, absolute}]

// The active level's grid, set when a phrase is generated. Held here rather
// than looked up per call so that drawing, scoring and the counting row all
// read the same three numbers without reaching back into RSTOMP_LEVELS.
let rstompLabels = RSTOMP_LABELS_BEAT;
let rstompSlotsPerBar = RSTOMP_LABELS_BEAT.length;
let rstompSlotValue = 'q';
let rstompSlotsPerBeat = 1;
let rstompBeamSlots = 1;
let rstompEntries = [];         // parallel to rstompPositions: null, 'play', or 'bracket'
let rstompUndoStack = [];
let rstompCursor = 0;
let rstompAttempt = 1;
let rstompStreak = 0;
let rstompScore = 0;
let rstompLocked = false;

// Scribe state. rstompWriting is what the STUDENT has written; nothing in it
// is derived from the phrase, which is the whole point of this interface -
// see the scribe section below.
let rstompScribe = false;       // is this level played on the keypad?
let rstompWriting = null;       // { groups: [...], inside: bool }
let rstompRevealed = null;      // the correct groups, shown after the third strike
let rstompWrongBars = [];       // 1-based bar numbers to mark, when we're naming them

/* ---------- Persistence (same shape as the other games, per CLAUDE.md) ---------- */

function getRstompProgress() {
    const fallback = { unlockedStages: ['1'], stageProgress: {}, lastPosition: '1', totalPlays: 0 };
    try { return { ...fallback, ...JSON.parse(localStorage.getItem('koolRiffsRhythmLabProgress') || '{}') }; }
    catch (error) { return fallback; }
}

function saveRstompProgress(progress) {
    localStorage.setItem('koolRiffsRhythmLabProgress', JSON.stringify(progress));
}

function recordRstompResult(isOfficialMastery) {
    const progress = getRstompProgress();
    const stage = progress.stageProgress[rstompSelectedLevel] || { bestScore: 0, timesPlayed: 0, cleared: false };
    stage.timesPlayed++;
    stage.bestScore = Math.max(stage.bestScore || 0, Math.round(rstompScore));
    stage.cleared = stage.cleared || isOfficialMastery;
    progress.stageProgress[rstompSelectedLevel] = stage;
    progress.totalPlays = (progress.totalPlays || 0) + 1;
    const currentIndex = RSTOMP_LEVELS.findIndex(level => level.id === rstompSelectedLevel);
    const nextLevel = RSTOMP_LEVELS[currentIndex + 1];
    if (isOfficialMastery && nextLevel && !progress.unlockedStages.includes(nextLevel.id)) progress.unlockedStages.push(nextLevel.id);
    saveRstompProgress(progress);
}

/* ---------- Pathway screen ---------- */

function enterRhythmLab() {
    renderRstompPathway();
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-pathway');
}

function renderRstompPathway() {
    const progress = getRstompProgress();
    const unlocked = new Set(progress.unlockedStages || ['1']);
    const track = document.getElementById('rstomp-pathway-track');
    if (!track) return;
    track.innerHTML = '';
    let recommended = progress.lastPosition || '1';
    if (!unlocked.has(recommended)) recommended = [...unlocked][unlocked.size - 1];
    rstompSelectedLevel = recommended;
    RSTOMP_LEVELS.forEach((level, index) => {
        const isUnlocked = unlocked.has(level.id);
        const record = progress.stageProgress?.[level.id];
        const node = document.createElement('button');
        node.className = `pathway-node${isUnlocked ? ' unlocked' : ' locked'}${level.id === recommended ? ' recommended' : ''}${record?.cleared ? ' cleared' : ''}`;
        node.disabled = !isUnlocked;
        node.innerHTML = `<span class="pathway-node-icon">${isUnlocked ? index + 1 : '•'}</span>${isUnlocked ? `<span class="pathway-node-label">${level.shortLabel}</span>${record?.bestScore != null ? `<small>${Math.round(record.bestScore)} pts</small>` : ''}` : ''}`;
        if (isUnlocked) node.onclick = () => selectRstompLevel(level.id);
        track.appendChild(node);
    });
    selectRstompLevel(rstompSelectedLevel, false);
}

function selectRstompLevel(levelId, rerender = true) {
    const progress = getRstompProgress();
    if (!(progress.unlockedStages || []).includes(levelId)) return;
    rstompSelectedLevel = levelId;
    progress.lastPosition = levelId;
    saveRstompProgress(progress);
    if (rerender) renderRstompPathway();
    const startButton = document.getElementById('rstomp-pathway-start');
    if (startButton) {
        startButton.disabled = false;
        startButton.innerText = `Start ${RSTOMP_LEVELS.find(level => level.id === levelId).shortLabel}`;
    }
}

// Level 1 gets the guided walkthrough screen first, since that's the
// tutorial for the whole interaction model; every other level launches
// straight into the game, same as the rest of the app.
function startSelectedRstompLevel() {
    if (rstompSelectedLevel === '1') {
        switchScreenState('rhythm-lab', 'rhythm-lab-screen-intro');
    } else {
        startRstompLevel();
    }
}

function handleRstompBackButton() {
    const activeScreen = document.querySelector('#view-rhythm-lab .screen.active');
    if (activeScreen && (activeScreen.id === 'rhythm-lab-screen-game' || activeScreen.id === 'rhythm-lab-screen-intro')) {
        renderRstompPathway();
        switchScreenState('rhythm-lab', 'rhythm-lab-screen-pathway');
    } else {
        launchGame('view-dashboard');
    }
}

/* ---------- Phrase generator ---------- */

// Every way to concatenate a level's vocabulary units so their slot-lengths
// sum to exactly targetSlots - same approach as rhythm.js's
// buildRhythmUnitShapes, ported rather than shared since this file is
// deliberately independent of rhythm.js. Not hardcoded to a full bar: the
// tie generator below reuses this at shorter targets to fill the slots on
// either side of a tied note within a single bar.
//
// Three filters run over the results, and they are NOT the same kind of rule.
//
//  1. AN ALL-REST BAR IS ONE REST - engraving. A bar of nothing is written as
//     a whole rest, never as smaller rests added up. This is the rule that
//     kills two half rests filling a bar, and a bar of four quarter rests
//     (CLAUDE.md's "three at most, so the real beat stays findable"). It
//     replaces an older "no two adjacent rests anywhere" rule, which was too
//     strong: Rob's own "(1 2) (3) (4)" is a half rest followed by TWO quarter
//     rests, and level A4's map needs bars holding three adjacent quarter
//     rests. Rests in a bar that has any note in it do not merge.
//
//  2. A REST NEVER STRADDLES A COARSER METRIC BOUNDARY - engraving. A half
//     rest may cover beats 1-2 or 3-4 but never 2-3, because 2-3 straddles the
//     middle of the bar. Stated against the bar's metric levels rather than as
//     "a multiple of its own length", which is the same thing in simple time
//     but wrong in compound: in 6/8 a crotchet rest may sit on quavers 1-2 or
//     2-3 of a group but never across the 3/4 boundary between the groups,
//     and "a multiple of 2" would have allowed exactly that.
//     NOTES ARE NOT RESTRICTED THIS WAY, and the asymmetry is real: a minim
//     across beats 2 and 3 is ordinary syncopation, and it is the figure level
//     A6 is built on. Silence has to show the beat; sound may hide it.
//
//  3. subdivideWholeBeats - LEVEL DESIGN. When a level is introducing a
//     subdivision, the subdivided beats are kept WHOLE: a unit shorter than a
//     beat may only appear as a run of EQUAL units that exactly fills one
//     beat. So "paired quavers" really are paired, and "four semiquavers"
//     really are four - the beat either divides evenly or stays intact, and
//     nothing else is in the way of seeing that. Uneven beats are the next
//     level's job, every time.
//
//  4. avoidRepeats - LEVEL DESIGN, not engraving, and declared per level.
//     Listing a unit key stops two of them being generated back to back.
//     It used to be hardcoded as "never two half notes in a row" and described
//     as engraving, citing the design brief. The brief's rule is narrower:
//     never TIE two half notes in a bar - write a whole note instead. Two
//     SEPARATELY STRUCK half notes, on beats 1 and 3, are ordinary notation
//     and a different rhythm from a whole note. So it is a level-design choice
//     - it keeps A2's content out of A3's "mixed" bars - and it is declared on
//     the levels that want it rather than generalised, because the metric
//     version of it would wrongly throw out a pair of quavers on beat 1.
//
// `startSlot` is where this run of units begins INSIDE its bar, and it matters
// for rule 2. The tie generator fills the slots after a tied-in note, so its
// tail starts partway through the bar; validating those rests as though they
// began at beat 1 let a half rest land on beats 2-3.
function buildRstompUnitShapes(grid, targetSlots, startSlot) {
    const results = [];
    (function build(remainingSlots, shape) {
        if (remainingSlots === 0) { results.push(shape); return; }
        grid.units.forEach(unit => {
            if (unit.slots <= remainingSlots) build(remainingSlots - unit.slots, [...shape, unit.key]);
        });
    })(targetSlots, []);
    return results.filter(shape => rstompShapeIsLegal(shape, targetSlots, startSlot, grid));
}

// The filters above, applied to one finished shape.
// TWO RESTS NEVER SHARE A BEAT when one rest could say it. Three quaver rests
// in a row is not how anyone writes a bar - the two filling beat 4 are a
// crotchet rest. Rob, seeing it on Level 12: "we would never see music written
// that way."
//
// Forced only where the combined rest would itself be legal, which is what
// keeps it honest at the finer grids: two semiquaver rests straddling the
// middle of a beat can't become a quaver rest (that rest would cross the
// half-beat), so they stay as two. And it is scoped to ONE BEAT, never wider -
// crotchet rests on beats 3 and 4 stay two rests rather than collapsing into a
// half rest, which is what Rob's own worked example `(1 2) (3) (4)` needs.
// Stage A and Stage C are untouched for the same reason: their slot IS their
// beat, so two adjacent rests are never inside one.
function rstompRestsMustCombine(grid, slot, firstSlots, secondSlots) {
    const merged = firstSlots + secondSlots;
    if (Math.floor(slot / grid.slotsPerBeat) !== Math.floor((slot + merged - 1) / grid.slotsPerBeat)) return false;
    if (!grid.units.some(unit => unit.isRest && unit.slots === merged)) return false;
    return !grid.metricLevels.some(level =>
        level >= merged && Math.floor(slot / level) !== Math.floor((slot + merged - 1) / level));
}

function rstompShapeIsLegal(shape, targetSlots, startSlot, grid) {
    const unitOf = key => grid.units.find(unit => unit.key === key);
    const units = shape.map(unitOf);
    const isWholeBar = targetSlots === grid.slotsPerBar && !startSlot;
    if (isWholeBar && units.length > 1 && units.every(unit => unit.isRest)) return false;
    if (grid.subdivideWholeBeats && !rstompBeatsStayWhole(units, startSlot || 0, grid)) return false;
    let slot = startSlot || 0;
    for (let i = 0; i < units.length; i++) {
        // >= not >: a rest must align to the level of its OWN length too,
        // or a half rest lands on beats 2-3.
        if (units[i].isRest && grid.metricLevels.some(level =>
            level >= units[i].slots
            && Math.floor(slot / level) !== Math.floor((slot + units[i].slots - 1) / level)
        )) return false;
        if (i > 0 && shape[i] === shape[i - 1] && grid.avoidRepeats.indexOf(shape[i]) !== -1) return false;
        if (i > 0 && units[i].isRest && units[i - 1].isRest
            && rstompRestsMustCombine(grid, slot - units[i - 1].slots, units[i - 1].slots, units[i].slots)) return false;
        slot += units[i].slots;
    }
    return true;
}

/* -------------------------------------------------------------------------
   PICK a shape rather than enumerate every shape.

   buildRstompUnitShapes lists ALL the ways a run of slots can be filled, which
   is fine at the crotchet grid (a bar has 15 to 42 of them) and ruinous at the
   semiquaver grid, where one bar has over a HUNDRED THOUSAND. Built fresh for
   every phrase that was a second of work on a desktop and a visible freeze on
   a phone - for a list the generator then throws away after taking one entry.

   So generation walks the bar instead, trying the vocabulary in a random order
   and backtracking out of dead ends. One shape costs a walk of the bar rather
   than an enumeration of the bar's entire shape space, and the result is drawn
   from the same set. Enumeration is kept for the tests, which check the SET.
   ------------------------------------------------------------------------- */
function rstompPickUnitShape(grid, targetSlots, startSlot) {
    const unitOf = key => grid.units.find(unit => unit.key === key);
    const found = (function walk(remaining, slot, shape) {
        if (remaining === 0) {
            return rstompShapeIsLegal(shape, targetSlots, startSlot, grid) ? shape : null;
        }
        // Shuffle a LOCAL copy. One shared array, re-shuffled at every step,
        // was being reordered by deeper calls while an outer loop was still
        // iterating it - so units got skipped or tried twice and the walk was
        // not exhaustive. It failed to fill a bar roughly once in ten thousand
        // tries, rarely enough to look like nothing and often enough to fail a
        // 8700-shape test run. Tightening the rest rules made dead ends more
        // common and brought it out.
        const order = grid.units.slice();
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        for (const unit of order) {
            if (unit.slots > remaining) continue;
            if (unit.isRest && grid.metricLevels.some(level =>
                level >= unit.slots
                && Math.floor(slot / level) !== Math.floor((slot + unit.slots - 1) / level)
            )) continue;
            if (shape.length && unit.key === shape[shape.length - 1]
                && grid.avoidRepeats.indexOf(unit.key) !== -1) continue;
            const previous = shape.length ? unitOf(shape[shape.length - 1]) : null;
            if (previous && previous.isRest && unit.isRest
                && rstompRestsMustCombine(grid, slot - previous.slots, previous.slots, unit.slots)) continue;
            const got = walk(remaining - unit.slots, slot + unit.slots, [...shape, unit.key]);
            if (got) return got;
        }
        return null;
    })(targetSlots, startSlot || 0, []);
    return found;
}

// Every unit shorter than a beat must sit in a run of equal units that starts
// on a beat and exactly fills it.
function rstompBeatsStayWhole(units, startSlot, grid) {
    let slot = startSlot;
    for (let i = 0; i < units.length; i++) {
        if (units[i].slots >= grid.slotsPerBeat) {
            if (units[i].slots % grid.slotsPerBeat !== 0) return false;
            slot += units[i].slots;
            continue;
        }
        if (slot % grid.slotsPerBeat !== 0) return false;
        let filled = 0;
        while (i < units.length && filled < grid.slotsPerBeat) {
            if (units[i].slots !== units[i === 0 ? 0 : i].slots) return false;
            if (i > 0 && units[i].slots !== units[i - 1].slots && filled > 0) return false;
            filled += units[i].slots;
            if (filled < grid.slotsPerBeat) i++;
        }
        if (filled !== grid.slotsPerBeat) return false;
        slot += grid.slotsPerBeat;
    }
    return true;
}

function buildRstompBarShapes(grid) {
    return buildRstompUnitShapes(grid, grid.slotsPerBar, 0);
}

// BEAT 3 MUST ALWAYS BE VISIBLE. Rob's engraving rule, and it is a rule about
// READING, not tidiness: the middle of the bar is the landmark the eye needs,
// and a note sounding through it hides the one place a reader checks to know
// where they are.
//
// A note may cross the middle of the bar ONLY IF IT STARTS ON A BEAT. That one
// test carries the whole rule, including Rob's single exception - a minim on
// beats 2-3, the `1 2 (3) 4` figure Level 6 is built on, starts on a beat and
// so is allowed to cover beat 3. Everything he ruled out fails it: a minim
// from the "and" of 1, and a syncopated crotchet from the "and" of 2.
//
// The note is not thrown away, it is RE-SPELLED. Rob: "my rule would have that
// tied across to an eighth." So it is split at the middle into two tied notes
// and the rhythm is untouched - a minim from the "and" of 1 becomes a dotted
// crotchet tied to a quaver, with the tie landing exactly on beat 3. His own
// worked bar comes out
//
//     quaver rest . crotchet . quaver-tied-to-quaver . crotchet . quaver
//
// which is the whole bar syncopated with a clean break at the halfway line.
// The counting follows for free: a tie is a new written note, so beat 3 gets
// its own bracket instead of being swallowed by the one before it.
//
// It self-limits to the grids it is meant for. Where a slot IS a beat - all of
// Stage A, and 6/8 counted in six - every note starts on a beat, so the test
// never fires and nothing changes. It bites at the quaver and semiquaver
// grids, which is where a note can start off the beat at all.
function rstompValueForSlots(slots, slotValue) {
    const found = Object.keys(RSTOMP_VOCABULARY).map(key => RSTOMP_VOCABULARY[key])
        .find(entry => !entry.isRest && rstompSlotsFor(entry.value, slotValue) === slots);
    return found ? found.value : null;
}

// Spell a span as tied notes. One note where one value covers it; otherwise
// cut at the coarsest metric boundary inside the span and spell each side,
// which is how any span gets written: a note running from the second
// semiquaver of beat 1 to beat 3 is a dotted quaver tied to a crotchet tied to
// a semiquaver, not one impossible note.
function rstompSpellSpan(start, end, grid) {
    const value = rstompValueForSlots(end - start, grid.slotValue);
    if (value) return [{ slots: end - start, value }];
    for (const level of grid.metricLevels) {
        const cut = Math.ceil((start + 1) / level) * level;
        if (cut > start && cut < end) {
            const before = rstompSpellSpan(start, cut, grid);
            const after = rstompSpellSpan(cut, end, grid);
            if (before && after) return before.concat(after);
        }
    }
    return null;
}

function rstompShowBeatThree(bars, grid) {
    const middle = grid.slotsPerBar / 2;
    if (grid.metricLevels.indexOf(middle) === -1) return bars;
    return bars.map(specs => {
        const out = [];
        let slot = 0;
        specs.forEach(spec => {
            const end = slot + spec.slots;
            const hidesTheMiddle = !spec.isRest && slot < middle && end > middle
                                   && slot % grid.slotsPerBeat !== 0;
            const before = hidesTheMiddle ? rstompSpellSpan(slot, middle, grid) : null;
            const after = hidesTheMiddle ? rstompSpellSpan(middle, end, grid) : null;
            if (before && after) {
                before.concat(after).forEach((piece, index) => out.push(Object.assign({}, spec, {
                    slots: piece.slots, value: piece.value, tied: index === 0 ? spec.tied : true
                })));
            } else {
                out.push(spec);
            }
            slot = end;
        });
        return out;
    });
}

function generateRstompPhrase(level) {
    const grid = rstompGridFor(level);
    const bars = level.figure ? generateRstompPhraseWithFigure(level, grid)
               : level.tieLevel ? generateRstompPhraseWithTie(level, grid)
               : generateRstompPhraseNormal(level, grid);
    return rstompShowBeatThree(rstompApplyLonghand(bars, level, grid), grid);
}

// Variety rule (design brief §5 item 15): no bar shape repeats more than
// twice across the phrase, never identical to the bar immediately before it.
function generateRstompPhraseNormal(level, grid) {
    const used = {};
    const shapes = [];
    for (let i = 0; i < grid.barsPerPhrase; i++) {
        let shape = null;
        // Variety rule (design brief S5 item 15): no bar shape more than twice
        // across the phrase, never identical to the bar before it. A handful of
        // redraws is enough - and on a thin level where it is not, the phrase
        // is still legal, just less varied.
        for (let tries = 0; tries < 12; tries++) {
            const pick = rstompPickUnitShape(grid, grid.slotsPerBar, 0);
            if (!pick) break;
            const key = pick.join();
            shape = pick;
            if ((used[key] || 0) < 2 && key !== (shapes[i - 1] || []).join()) break;
        }
        if (!shape) shape = rstompPickUnitShape(grid, grid.slotsPerBar, 0) || [];
        used[shape.join()] = (used[shape.join()] || 0) + 1;
        shapes.push(shape);
    }
    const bars = shapes.map(shape => rstompShapeToSpecs(shape, grid));
    return rstompPlantFeatureShape(bars, level, grid);
}

// A level built AROUND one figure has to be sure the figure turns up. A6 is
// the case: crotchet / minim / crotchet, onsets on 1, 2 and 4, counted
// "1 2 (3) 4". It is four beats long, so exactly one position fits a 4/4 bar -
// every other placement would cross the barline, which is the lesson - and at
// that rarity a random draw would leave it out of whole phrases. So one bar is
// reserved for it, and the rest are drawn normally.
function rstompPlantFeatureShape(bars, level, grid) {
    if (!level.featureShape) return bars;
    const already = bars.some(specs => specs.length === level.featureShape.length
        && specs.every((spec, i) => {
            const unit = grid.units.find(entry => entry.key === level.featureShape[i]);
            return unit && spec.value === unit.value && spec.isRest === unit.isRest && !spec.tied;
        }));
    if (already) return bars;
    bars[Math.floor(Math.random() * bars.length)] = rstompShapeToSpecs(level.featureShape, grid);
    return bars;
}

// A shape is a list of vocabulary keys, which is already a list of written
// notes - the slot stream was only ever a flattening of it. Keeping the specs
// is what lets a tie inside a bar exist at all.
function rstompShapeToSpecs(shape, grid) {
    return shape.map(key => {
        const unit = grid.units.find(entry => entry.key === key);
        return { slots: unit.slots, value: unit.value, isRest: unit.isRest };
    });
}

/* =========================================================================
   FIGURE DISPLACEMENT — one mechanic, many levels

   Take a short rhythmic figure, walk it through every position in the grid,
   and have the student count each placement. That is ALL the pump levels and
   both syncopation levels (design brief S13.6b); adding a new named figure
   costs one line of config, not a new level design.

   THE PUMPS are Rob's name for a dotted crotchet followed by a quaver - two
   onsets, always exactly three quavers apart, "everywhere in music". Eight
   positions exist in 4/4 at the quaver grid; five sit inside a bar and three
   cross the barline, which is the split between B6 and B7.

   The pattern underneath, which is the whole teaching payload: EVEN POSITIONS
   ARE DOWN-UP, ODD POSITIONS ARE UP-DOWN. The gap between the onsets never
   changes; what changes is only whether each onset lands on a beat. Rob: "in
   order to find an upbeat, you have to know exactly where the downbeat is."

   A figure that crosses a barline is SPLIT INTO A TIE, because a written note
   cannot cross one. That is not a special case bolted on - it is the same rule
   that makes the counting bracket stop at the barline, and at B7 it is the
   lesson rather than an inconvenience.
   ========================================================================= */

// Fill one bar's free slots around whatever is already placed in it.
function rstompFillGaps(placed, barStart, grid) {
    const taken = new Array(grid.slotsPerBar).fill(false);
    placed.forEach(spec => {
        for (let k = 0; k < spec.slots; k++) taken[spec.start - barStart + k] = true;
    });
    const out = placed.slice();
    let slot = 0;
    while (slot < grid.slotsPerBar) {
        if (taken[slot]) { slot++; continue; }
        let end = slot;
        while (end < grid.slotsPerBar && !taken[end]) end++;
        const shape = rstompPickUnitShape(grid, end - slot, slot);
        if (!shape) return null;                      // this placement is unfillable
        let at = slot;
        rstompShapeToSpecs(shape, grid).forEach(spec => {
            out.push({ ...spec, start: barStart + at });
            at += spec.slots;
        });
        slot = end;
    }
    return out.sort((a, b) => a.start - b.start);
}

// Lay a figure's notes down from an absolute start slot, splitting any note
// that runs over a barline into two tied notes.
function rstompPlaceFigure(figure, at, grid) {
    const out = [];
    let slot = at;
    figure.forEach(part => {
        let left = part.slots;
        let tied = false;
        while (left > 0) {
            const room = grid.slotsPerBar - (slot % grid.slotsPerBar);
            const take = Math.min(left, room);
            const value = rstompValueForSlots(take, grid.slotValue);
            if (!value) return null;
            out.push({ slots: take, value, isRest: !!part.isRest, tied, start: slot });
            slot += take; left -= take; tied = true;
        }
    });
    return out.some(x => !x.value) ? null : out;
}

function rstompFigurePositions(level, grid) {
    const total = figureSlots(level.figure.notes);
    const span = grid.slotsPerBar * grid.barsPerPhrase;
    const want = level.figure.positions || 'all';
    const out = [];
    for (let at = 0; at + total <= span; at++) {
        const crosses = Math.floor(at / grid.slotsPerBar)
                     !== Math.floor((at + total - 1) / grid.slotsPerBar);
        if (want === 'downbeat' && (crosses || at % grid.slotsPerBar !== 0)) continue;
        if (want === 'in-bar' && crosses) continue;
        if (want === 'crossing' && !crosses) continue;
        out.push(at);
    }
    return out;
}

function figureSlots(notes) {
    return notes.reduce((n, part) => n + part.slots, 0);
}

// A level may name SEVERAL figures - D3 teaches "quaver + two semiquavers"
// and "two semiquavers + quaver" together, because the pair is the lesson.
function rstompFiguresOf(level) {
    return Array.isArray(level.figure) ? level.figure : [level.figure];
}

function generateRstompPhraseWithFigure(level, grid) {
    const choices = rstompFiguresOf(level);
    level = { ...level, figure: choices[Math.floor(Math.random() * choices.length)] };
    const positions = rstompFigurePositions(level, grid);
    // Try placements until one leaves a fillable bar. A figure sitting across
    // beat 4 can leave a single slot the level's vocabulary cannot fill.
    const order = positions.slice().sort(() => Math.random() - 0.5);
    for (const at of order) {
        const figure = rstompPlaceFigure(level.figure.notes, at, grid);
        if (!figure) continue;
        const bars = [];
        let good = true;
        for (let b = 0; b < grid.barsPerPhrase && good; b++) {
            const barStart = b * grid.slotsPerBar;
            const mine = figure.filter(x => x.start >= barStart && x.start < barStart + grid.slotsPerBar);
            const filled = rstompFillGaps(mine, barStart, grid);
            if (!filled) { good = false; break; }
            bars.push(filled.map(({ start, ...spec }) => spec));
        }
        if (good) return bars;
    }
    return generateRstompPhraseNormal(level, grid);
}

// A tied note can sit on ANY barline. It used to be restricted to the 0/1
// and 2/3 boundaries because the old 2-column grid put a row break at 1/2,
// and a tie curve has to be drawn inside one VexFlow canvas - impossible
// across a row break. The whole phrase now renders as one continuous strip
// on a single canvas (see renderRstompStaff), so that restriction is gone.
//
// r slots of the tied note sit at the end of the first bar (a Play plus
// r-1 Holds), s slots sit at the start of the second bar as pure Hold -
// no onset there, since it's the same note continuing, not a new attack.
// That leading Hold-with-no-Play is exactly how a fresh bar's own content
// is told apart from a tie continuation (every vocabulary unit starts with
// Play or Rest, never Hold). r/s are only ever picked from slot-counts that
// are writable as a single note AND leave the *rest* of their bar fillable
// by this level's vocabulary - a tie is two written notes, so both halves
// have to be notes that exist.
function generateRstompPhraseWithTie(level, grid) {
    const includesTie = Math.random() < (level.tieChance != null ? level.tieChance : 1);
    if (!includesTie) return generateRstompPhraseNormal(level, grid);

    const leadRuns = [];
    const tailRuns = [];
    for (let n = 1; n <= grid.slotsPerBar; n++) {
        // r-runs sit at the END of their bar, so their lead fills from slot 0;
        // s-runs sit at the START, so their tail begins at slot n.
        if (!rstompValueForSlots(n, grid.slotValue)) continue;
        if (rstompPickUnitShape(grid, grid.slotsPerBar - n, 0)) leadRuns.push(n);
        if (rstompPickUnitShape(grid, grid.slotsPerBar - n, n)) tailRuns.push(n);
    }
    const rsPairs = [];
    leadRuns.forEach(r => tailRuns.forEach(s => rsPairs.push([r, s])));
    const [r, s] = rsPairs[Math.floor(Math.random() * rsPairs.length)];

    const leadShape = rstompPickUnitShape(grid, grid.slotsPerBar - r, 0) || [];
    const tailShape = rstompPickUnitShape(grid, grid.slotsPerBar - s, s) || [];

    const tieValue = slots => rstompValueForSlots(slots, grid.slotValue);
    const barA = [...rstompShapeToSpecs(leadShape, grid), { slots: r, value: tieValue(r), isRest: false }];
    const barB = [{ slots: s, value: tieValue(s), isRest: false, tied: true }, ...rstompShapeToSpecs(tailShape, grid)];

    const spare = Math.max(0, grid.barsPerPhrase - 2);
    const pickNormalShape = previousShape => {
        for (let tries = 0; tries < 8; tries++) {
            const shape = rstompPickUnitShape(grid, grid.slotsPerBar, 0);
            if (shape && shape.join() !== (previousShape || []).join()) return shape;
        }
        return rstompPickUnitShape(grid, grid.slotsPerBar, 0) || [];
    };
    const normalBars = [];
    let previousShape = null;
    for (let i = 0; i < spare; i++) {
        previousShape = pickNormalShape(previousShape);
        normalBars.push(rstompShapeToSpecs(previousShape, grid));
    }

    // The tied pair occupies boundary/boundary+1; the remaining bars take
    // the untied ones in order.
    const boundary = Math.floor(Math.random() * (grid.barsPerPhrase - 1));
    const bars = [];
    let nextNormal = 0;
    for (let index = 0; index < grid.barsPerPhrase; index++) {
        if (index === boundary) bars.push(barA);
        else if (index === boundary + 1) bars.push(barB);
        else bars.push(normalBars[nextNormal++]);
    }
    return bars;
}

// One position per slot. How many slots a bar holds is the active level's
// label-array length, so this is the same function whether a slot is a
// crotchet, a quaver or a semiquaver - which is the point of the grid.
// WHICH SLOTS GET A LABEL WRITTEN UNDER THEM. This is the rule the whole
// pillar turns on, and it is NOT "every slot":
//
//   A label is written on every BEAT, and wherever a note or rest STARTS.
//   Nothing is written on an off-beat slot that no event begins on.
//
// So a crotchet on beat 2 of a quaver-grid bar is just `2` - you count the
// beat, you do not say "and" when nothing happens there. A minim is `1 (2)`
// whatever the grid, which is why the counting a student learns at Stage A
// still reads the same once the beat divides. Rob's decision; see CLAUDE.md,
// "The counting names every beat, and every event - nothing else".
//
// Every position carries its bar, its slot within that bar (what the caret
// and the counting row are placed from) and its absolute slot in the phrase.
function buildRstompPositions(specBars) {
    const positions = [];
    (specBars || []).forEach((specs, barIndex) => {
        let slotIndex = 0;
        specs.forEach(spec => {
            for (let k = 0; k < spec.slots; k++) {
                const slot = slotIndex + k;
                if (k === 0 || slot % rstompSlotsPerBeat === 0) {
                    positions.push({ barIndex, slotIndex: slot, absolute: barIndex * rstompSlotsPerBar + slot });
                }
            }
            slotIndex += spec.slots;
        });
    });
    return positions;
}

// Which counting position sits on an absolute slot, or -1 when that slot
// isn't counted. Phrases are at most a few dozen positions, so a scan is
// cheaper than keeping a map in step with them.
function rstompIndexOfSlot(absolute) {
    return rstompPositions.findIndex(position => position.absolute === absolute);
}

function rstompExpectedAnswer(position) {
    const mode = rstompPhrase[position.barIndex][position.slotIndex];
    return mode === 'play' ? 'play' : 'bracket';
}

/* =========================================================================
   THE SCRIBE KEYPAD
   The student writes the counting out themselves - every numeral, every
   bracket. Nothing is pre-placed and nothing is derived from the phrase, so
   it can't be solved without knowing what each note is worth. That's the
   difference from the two-button tutorial, which asks only "does a new note
   start here?" and does the grouping for them.
   ========================================================================= */

// The counting the student is meant to arrive at.
//
// THE BRACKET NEVER CROSSES A BARLINE. A note tied over one is written as two
// brackets - "1 (2 3 4)" then "(1 2 3 4)" for a whole tied to a whole, never
// "1 (2 3 4 1 2 3 4)". This is the opposite of what an earlier draft of this
// file said, and the reversal is Rob's, for a reason that outranks the tidiness
// of showing a tie as one object:
//
//   The student has to know where beat 1 is without stopping to work it out.
//   The counting is what teaches them, so the counting has to delineate the
//   bar. A bracket that runs through the barline bunches the phrase into one
//   undifferentiated blob and hides the single most important landmark in it.
//   Laying the mechanics out correctly is how the FEEL of the pulse gets built
//   - so the layout is not cosmetic, it is the teaching.
//
// The unit is therefore one WRITTEN note or rest, which is also why brackets
// can't cross a barline: a written note can't either. That is what a tie is
// for. Each spec on the staff gets exactly one group:
//
//   struck note   -> its onset digit outside, its held beats in a bracket
//                    (a whole note: "1 (2 3 4)")
//   tied-into note-> no onset to write, so every beat sits in the bracket
//                    (the second half of a tie: "(1 2)")
//   rest          -> no onset/sustain distinction to draw, so all bracketed
//                    ("(1 2 3 4)")
//
// Two half notes tied inside one bar are two written notes, so they are two
// brackets - "1 (2) (3 4)" - even though nothing is re-struck on beat 3.
// Reading the groups off the rendered specs rather than off the raw slot
// stream is what makes that fall out automatically: the counting matches the
// notation because it is derived from the same specs the notation is.
//
// Rob's worked examples, all of which fall out of the per-spec rule with no
// special cases (his own wording in quotes):
//
//   two quarters tied     1 (2)        "exactly the same thing as a half note"
//   quarter tied to half  1 (2 3)      "it would look just like a dotted minim"
//   half tied to quarter  1 (2) (3)    "two sets of brackets because we do need
//                                       to see that the new note" starts
//   two halves tied       1 (2) (3 4)
//   half rest + 2 q rests (1 2) (3) (4) "we would delineate each beat"
//
// Note the deliberate collisions: a quarter tied to a half and a quarter
// followed by a half rest both read "1 (2 3)". Rob is content with that -
// "that all makes sense, that is the reversible that I'm looking for" - since
// the notation above the counting says which it is.
function rstompTargetGroups() {
    const groups = [];
    rstompSpecBars.forEach(specs => {
        let beat = 0;
        specs.forEach(spec => {
            // Only the slots that are counted - every beat this note or rest
            // covers, plus its own onset (see buildRstompPositions). A note
            // that starts off the beat contributes its onset label; the
            // off-beat slots it merely holds through contribute nothing.
            const digits = [];
            for (let k = 0; k < spec.slots; k++) {
                if (k === 0 || (beat + k) % rstompSlotsPerBeat === 0) digits.push(rstompLabels[beat + k]);
            }
            if (!spec.isRest && !spec.tied) {
                // Struck: the onset digit is written plainly, the beats it
                // holds through bracketed. A note that covers no further
                // beat has nothing to bracket - a lone quaver is just `+`.
                groups.push({ bracketed: false, digits: [digits[0]] });
                if (digits.length > 1) groups.push({ bracketed: true, closed: true, kind: 'hold', digits: digits.slice(1) });
            } else {
                groups.push({ bracketed: true, closed: true, kind: spec.isRest ? 'rest' : 'hold', digits });
            }
            beat += spec.slots;
        });
    });
    return groups;
}

function rstompGroupText(group) {
    if (!group.bracketed) return group.digits.join(' ');
    return `(${group.digits.join(' ')}${group.closed ? ')' : ''}`;
}

// One descriptor per beat, so a bar can be marked right or wrong by comparing
// only the beats that belong to it - including whether a bracket opens or
// closes there, which is what a mishandled tie gets wrong. A bracket left
// hanging open never matches: an unclosed bracket isn't finished counting.
function rstompGroupsToSlotMarks(groups) {
    const marks = [];
    groups.forEach(group => {
        group.digits.forEach((digit, index) => {
            marks.push([
                digit,
                group.bracketed ? 'b' : '-',
                index === 0 ? 's' : '-',
                (index === group.digits.length - 1 && (!group.bracketed || group.closed)) ? 'e' : '-'
            ].join(''));
        });
    });
    return marks;
}

// Which labels belong to a REST, in the same order as rstompPositions - built
// by the same rule as rstompTargetGroups, so the two can't disagree.
function rstompLabelIsRest() {
    const flags = [];
    rstompSpecBars.forEach(specs => {
        let beat = 0;
        specs.forEach(spec => {
            for (let k = 0; k < spec.slots; k++) {
                if (k === 0 || (beat + k) % rstompSlotsPerBeat === 0) flags.push(Boolean(spec.isRest));
            }
            beat += spec.slots;
        });
    });
    return flags;
}

// CONSECUTIVE RESTS MAY SHARE ONE BRACKET. Rob's revision of his own rule: a
// run of rests is one continuous silence, so `(1) (2 +) (3)` and
// `(1) (2) (+) (3)` are both right, and so is any other way of dividing the
// run up. Nothing new happens anywhere inside it, and the counting's job is to
// name every count the silence covers - not to show where one written rest
// ends and the next begins. The notation above already says that.
//
// Both sides of the comparison are normalised the same way: inside a rest run,
// the flags that say "a bracket opens here" and "a bracket closes here" are
// cleared, so however the student divided the run it compares equal. What
// survives untouched is everything that still has to be right -
//
//   - every label in the run must be BRACKETED (an unbracketed one still fails)
//   - the run's FIRST label must open a bracket, and its LAST must close one,
//     so a bracket left hanging open is still wrong
//   - a run stops at the barline, so a bracket drawn across one still fails -
//     the bracket never crosses a barline, and that rule is the teaching
//   - a rest never merges with the hold bracket of a note beside it, because
//     the note's labels are not in the run
function rstompNormaliseRestRuns(marks) {
    const isRest = rstompLabelIsRest();
    return marks.map((mark, index) => {
        if (!isRest[index]) return mark;
        const bar = rstompPositions[index] ? rstompPositions[index].barIndex : -1;
        const sameBar = other => rstompPositions[other] && rstompPositions[other].barIndex === bar;
        const chars = mark.split('');
        if (index > 0 && isRest[index - 1] && sameBar(index - 1)) chars[chars.length - 2] = '-';
        if (isRest[index + 1] && sameBar(index + 1)) chars[chars.length - 1] = '-';
        return chars.join('');
    });
}

function rstompWrittenBeats() {
    return rstompWriting ? rstompWriting.groups.reduce((total, group) => total + group.digits.length, 0) : 0;
}

/* ---------- The keys ---------- */

function rstompPressDigit(digit) {
    const last = rstompWriting.groups[rstompWriting.groups.length - 1];
    if (rstompWriting.inside && last && last.bracketed) last.digits.push(digit);
    else rstompWriting.groups.push({ bracketed: false, digits: [digit] });
}

// "(" writes an open bracket and nothing else. A single key labelled "( )"
// claimed it had finished the job, which made the close key look redundant
// and made it easy to forget to close at all. An unclosed bracket is now
// visibly unclosed, and closing it is a real act - which is the habit being
// taught.
function rstompPressOpen() {
    if (rstompWriting.inside) return;
    rstompWriting.groups.push({ bracketed: true, closed: false, digits: [] });
    rstompWriting.inside = true;
}

function rstompPressClose() {
    if (!rstompWriting.inside) return;
    const last = rstompWriting.groups[rstompWriting.groups.length - 1];
    if (last && last.bracketed && !last.digits.length) rstompWriting.groups.pop();
    else if (last) last.closed = true;
    rstompWriting.inside = false;
}

function rstompPressErase() {
    const last = rstompWriting.groups[rstompWriting.groups.length - 1];
    if (!last) return;
    if (last.bracketed && last.closed) {
        last.closed = false;          // erasing the ")" puts you back inside it
        rstompWriting.inside = true;
        return;
    }
    if (last.digits.length) {
        last.digits.pop();
        if (last.bracketed) rstompWriting.inside = true;
        if (!last.digits.length && !last.bracketed) rstompWriting.groups.pop();
    } else {
        rstompWriting.groups.pop();
        rstompWriting.inside = false;
    }
}

// One entry point for every key, so each press re-renders and re-scrolls the
// same way. Writing resumes the follow, the way typing does in an editor.
function rstompKey(key) {
    if (rstompLocked || !rstompScribe || !rstompWriting) return;
    if (key === '(') rstompPressOpen();
    else if (key === ')') rstompPressClose();
    else if (key === 'erase') rstompPressErase();
    else {
        // Never let them write past the end of the phrase - there is no beat
        // there to count, and the overflow would only ever be marked wrong.
        if (rstompWrittenBeats() >= rstompPositions.length) return;
        rstompPressDigit(key);
    }
    rstompCursor = Math.min(rstompWrittenBeats(), rstompPositions.length);
    rstompFollowing = true;
    rstompRevealed = null;
    renderRstompBars();
    followRstompCursor();
    updateRstompPrompt();
    updateRstompButtonStates();
}

/* ---------- Grading ---------- */

// Compare beat by beat, then blame whole bars. Extra beats written past the
// end of the phrase land on the last bar rather than vanishing.
function rstompWrongBarsFor(writing) {
    const mine = rstompNormaliseRestRuns(rstompGroupsToSlotMarks(writing.groups));
    const theirs = rstompNormaliseRestRuns(rstompGroupsToSlotMarks(rstompTargetGroups()));
    const wrong = new Set();
    // One mark per LABEL, not per slot - a label's bar comes from the
    // position it was written on, since a bar no longer holds a fixed
    // number of labels (a bar of quavers holds eight, a bar of crotchets
    // four).
    for (let index = 0; index < theirs.length; index++) {
        if (mine[index] !== theirs[index]) wrong.add(rstompPositions[index].barIndex);
    }
    for (let extra = theirs.length; extra < mine.length; extra++) {
        wrong.add(rstompPhrase.length - 1);
    }
    return [...wrong].sort((a, b) => a - b);
}

// Rewind to the start of the first wrong bar. Everything after it goes too:
// a correct bar later in the phrase is only correct in the counting it
// currently sits in, and re-writing an earlier bar shifts every beat after
// it. Rebuilding from the first mistake is simpler to reason about than
// splicing, and it never leaves the student editing around an answer that no
// longer lines up.
function rstompRewindTo(barIndex) {
    const keepSlots = rstompPositions.filter(position => position.barIndex < barIndex).length;
    const rebuilt = { groups: [], inside: false };
    let used = 0;
    for (const group of rstompWriting.groups) {
        if (used + group.digits.length > keepSlots) break;
        rebuilt.groups.push(group);
        used += group.digits.length;
    }
    rstompWriting = rebuilt;
    rstompCursor = Math.min(rstompWrittenBeats(), rstompPositions.length);
}

/* ---------- Round lifecycle ---------- */

function startRstompLevel() {
    initAudio();
    rstompAttempt = 1;
    rstompStreak = 0;
    rstompScore = 0;
    rstompLocked = false;
    const level = RSTOMP_LEVELS.find(entry => entry.id === rstompSelectedLevel);
    rstompScribe = !!level.scribe;
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-game');
    ensureRstompStripListeners();
    applyRstompInterface();
    document.getElementById('rstomp-level-label').innerText = level.label;
    updateRstompStreakDots();
    startNewRstompPhrase();
}

function startNewRstompPhrase() {
    const level = RSTOMP_LEVELS.find(entry => entry.id === rstompSelectedLevel);
    const grid = rstompGridFor(level);
    rstompLabels = grid.labels;
    rstompSlotsPerBar = grid.slotsPerBar;
    rstompSlotValue = grid.slotValue;
    rstompSlotsPerBeat = grid.slotsPerBeat;
    rstompBeamSlots = grid.beamSlots || grid.slotsPerBeat;
    renderRstompKeypad();
    if (typeof rstompAudioStop === 'function') rstompAudioStop();
    rstompSpecBars = generateRstompPhrase(level);
    rstompPhrase = rstompSpecsToPhrase(rstompSpecBars);
    rstompPositions = buildRstompPositions(rstompSpecBars);
    rstompEntries = new Array(rstompPositions.length).fill(null);
    rstompWriting = { groups: [], inside: false };
    rstompRevealed = null;
    rstompWrongBars = [];
    rstompUndoStack = [];
    rstompCursor = 0;
    rstompFollowing = true;
    hideRstompFeedback();
    const strip = document.getElementById('rstomp-strip');
    if (strip) strip.scrollLeft = 0;
    renderRstompBars();
    updateRstompPrompt();
    updateRstompButtonStates();
}

// Which control block the level uses. Both live in the markup; only one is
// ever on screen. The two-button row is not a legacy path - it is the
// tutorial interface, and deleting it would take the only version a child who
// can't yet write numerals can play (see CLAUDE.md).
// The keypad IS the level's distinct labels, in the order they first appear.
// At the crotchet grid that is "1 2 3 4"; at the quaver grid it is
// "1 2 3 4 +"; the semiquaver grid adds "e" and "a", and 6/8 in 6 runs to 6.
// Hardcoding four digits made every Stage B level unplayable by hand - the
// student could see the "+" in the answer and had no key to type it.
/* ---------- Hear it ----------
   The phrase, played: the counting voice with the bracket's own accent, a
   snare on every onset, a click on the beat and a loop under it. Free and
   always available - Rob's call, and his reason: "if they want it to become a
   jukebox that's their business... the byproduct of having fun is learning."

   The tempo is the level's base, which is where the performance round's three
   bonus tiers will start from (base, +20, +40). */
const RSTOMP_BASE_BPM = { q: 90, '8': 80, '16': 60 };

function rstompBaseBpm() {
    return RSTOMP_BASE_BPM[rstompSlotValue] || 90;
}

function toggleRstompListen() {
    const button = document.getElementById('rstomp-listen-btn');
    const icon = document.getElementById('rstomp-listen-icon');
    const rest = () => {
        if (button) button.classList.remove('playing');
        if (icon) icon.innerHTML = '&#9654;';
    };
    if (typeof rstompAudioRunning === 'function' && rstompAudioRunning()) {
        rstompAudioStop(); rest(); return;
    }
    if (typeof rstompAudioPlayPhrase !== 'function') return;
    const started = rstompAudioPlayPhrase({ bpm: rstompBaseBpm(), onStop: rest });
    if (!started) return;
    if (button) button.classList.add('playing');
    if (icon) icon.innerHTML = '&#9632;';
}

function renderRstompKeypad() {
    const row = document.getElementById('rstomp-key-row-labels');
    if (!row) return;
    // Numerals first, in order, then the off-beat labels in the order they
    // fall inside a beat: "1 2 3 4 +" at the quaver grid, "1 2 3 4 e + a" at
    // the semiquaver grid. First-appearance order alone would sit the "+"
    // between 1 and 2, which reads as part of the count rather than a key.
    const seen = [];
    rstompLabels.forEach(label => { if (seen.indexOf(label) === -1) seen.push(label); });
    const numerals = seen.filter(l => /^[0-9]/.test(l));
    const offbeats = seen.filter(l => !/^[0-9]/.test(l))
        .sort((a, b) => rstompLabels.indexOf(a) - rstompLabels.indexOf(b));
    seen.length = 0;
    seen.push(...numerals, ...offbeats);
    row.innerHTML = '';
    seen.forEach(label => {
        const key = document.createElement('button');
        key.className = 'rstomp-key';
        key.dataset.digit = label;
        key.textContent = label;
        key.onclick = () => rstompKey(label);
        row.appendChild(key);
    });
}

function applyRstompInterface() {
    const twoButton = document.getElementById('rstomp-controls-twobutton');
    const keypad = document.getElementById('rstomp-controls-keypad');
    if (twoButton) twoButton.hidden = rstompScribe;
    if (keypad) keypad.hidden = !rstompScribe;
}

/* ---------- Two-state answer + cursor (design brief §9.1/§9.2) ---------- */

// One tap commits the answer AND advances the cursor - no separate
// mode-select-then-stamp step, which is the whole point of this rebuild.
function stampRstomp(answer) {
    if (rstompLocked || rstompCursor >= rstompPositions.length) return;
    rstompEntries[rstompCursor] = answer;
    rstompUndoStack.push(rstompCursor);
    rstompCursor++;
    rstompFollowing = true;   // answering resumes the follow, the way typing does in an editor
    renderRstompBars();
    followRstompCursor();
    updateRstompPrompt();
    updateRstompButtonStates();
}

function undoRstomp() {
    if (rstompLocked || rstompUndoStack.length === 0) return;
    const index = rstompUndoStack.pop();
    rstompEntries[index] = null;
    rstompCursor = index;
    rstompFollowing = true;
    renderRstompBars();
    followRstompCursor();
    updateRstompPrompt();
    updateRstompButtonStates();
}

// The walkthrough framing for Level 1: every single container gets its
// own plain-language question, not just a one-time intro screen. This is
// what "look to the next event, tell them what to do" means in the UI.
function updateRstompPrompt() {
    const el = document.getElementById('rstomp-prompt');
    if (!el) return;

    // PLACEHOLDER COPY. Rob is writing the real instructional wording - see
    // the design brief's note on §1 vs the walkthrough copy. Keep these
    // functional and short until then; do not polish them, they're going.
    if (rstompScribe) {
        if (rstompRevealed) { el.textContent = "Here's the counting."; return; }
        if (rstompWriting && rstompWriting.inside) { el.textContent = 'Bracket open — count the beats it holds for, then close it.'; return; }
        // Not "all four bars": Stage B phrases are two bars, and later stages
        // set their own length.
        if (rstompCursor >= rstompPositions.length) {
            el.textContent = `All ${rstompPhrase.length} bars written — check your answer below.`;
            return;
        }
        const bar = Math.floor(rstompCursor / rstompSlotsPerBar) + 1;
        el.textContent = `Bar ${bar} — write the counting under the notes.`;
        return;
    }

    if (rstompCursor >= rstompPositions.length) {
        el.textContent = "All filled in — check your answer below.";
        return;
    }
    const pos = rstompPositions[rstompCursor];
    el.textContent = `Bar ${pos.barIndex + 1} · Beat ${rstompLabels[pos.slotIndex]} — does a new note start here?`;
}

function updateRstompButtonStates() {
    const done = rstompCursor >= rstompPositions.length;

    if (rstompScribe) {
        const full = rstompWrittenBeats() >= rstompPositions.length;
        document.querySelectorAll('#rstomp-controls-keypad .rstomp-key[data-digit]').forEach(key => {
            key.disabled = rstompLocked || full;
        });
        const open = document.getElementById('rstomp-key-open');
        const close = document.getElementById('rstomp-key-close');
        const erase = document.getElementById('rstomp-key-erase');
        // The bracket keys mirror the state of the bracket itself: you can
        // only open one when none is open, and only close one that is.
        if (open) open.disabled = rstompLocked || full || rstompWriting.inside;
        if (close) close.disabled = rstompLocked || !rstompWriting.inside;
        if (erase) erase.disabled = rstompLocked || !rstompWriting.groups.length;
        // Submit is live as soon as every bar is accounted for, even
        // with a bracket left hanging open. Refusing to submit would hide
        // the mistake; marking it wrong is the honest answer.
        document.getElementById('rstomp-submit-button').disabled = rstompLocked || !full;
        return;
    }

    document.getElementById('rstomp-play-btn').disabled = rstompLocked || done;
    document.getElementById('rstomp-bracket-btn').disabled = rstompLocked || done;
    document.getElementById('rstomp-undo-btn').disabled = rstompLocked || rstompUndoStack.length === 0;
    document.getElementById('rstomp-submit-button').disabled = rstompLocked || !done;
}

/* ---------- Rendering: staff (display-only) + live counting row ---------- */

/* ---------- The strip: every bar on one continuous line ----------
   Bars are sized to fill the space available and only scroll when they
   can't: on a phone a 4-bar phrase runs off the edge and the strip follows
   the cursor as the student answers, while a tablet or desktop simply shows
   the whole phrase at once. Nothing about the phrase changes with width -
   only how much of it is on screen. */

// Below this the counting row stops being readable. Measured, not guessed:
// at 112 the worst-case bar ("1 (2) (3 4)" - a half note then a half rest,
// whose two glyphs sit close enough together to leave the middle bracket
// nowhere to go) still overlapped by ~7px even after the nudge-and-shrink
// pass had bottomed out at an 11px font. 126 clears it at 11px; 140 clears it
// at a comfortable 13px, which is what the counting row deserves now that
// writing it IS the game rather than a readout of two-button answers. The
// cost is scrolling sooner on a phone, which is exactly what the strip and
// the full view are for.
// Bar width is PER SLOT, not per bar. A bar of the quaver grid holds twice
// the events of a crotchet-grid bar and needs twice the room; at the old flat
// 140 the noteheads collided and the counting row underneath was unreadable.
// 35px a slot reproduces the widths Stage A was tuned at (4 slots -> 140).
const RSTOMP_MIN_SLOT_WIDTH = 35;
const RSTOMP_MAX_SLOT_WIDTH = 48;   // above this bars just look sparse on a big screen
const RSTOMP_MIN_BAR_WIDTH = 140;   // the floor a single bar is still legible at
const RSTOMP_CURSOR_ANCHOR = 0.3;   // where the cursor parks after a scroll; the rest is look-ahead

// The visible band of the 130px VexFlow canvas, in canvas coordinates. The
// stave sits at y=20; measured over 40 phrases on each of the 29 levels, the
// drawn content runs from y=42.6 (the top of a beamed group's beam) down to
// y=100.5 (the tail of a crotchet rest, the deepest thing on the staff - a
// tie curve reaches 93). Rounded out to a window with a little air either
// side, and stated as constants rather than measured per render so the
// strip's height never changes under the student mid-phrase.
const RSTOMP_STAFF_CROP_TOP = 40;
const RSTOMP_STAFF_CROP_HEIGHT = 65;

let rstompLayouts = [];
let rstompTotalWidth = 0;
let rstompFollowing = true;
let rstompProgrammaticScroll = false;
let rstompResizeTimer = null;
let rstompStripListenersReady = false;

function rstompBarWidth(barCount) {
    const strip = document.getElementById('rstomp-strip');
    const available = (strip ? strip.clientWidth : 360) - 12; // strip's own padding
    const min = RSTOMP_MIN_SLOT_WIDTH * rstompSlotsPerBar;
    const max = RSTOMP_MAX_SLOT_WIDTH * rstompSlotsPerBar;
    return Math.max(min, Math.min(max, available / barCount));
}

function renderRstompBars() {
    const staffHost = document.getElementById('rstomp-staff');
    const countingHost = document.getElementById('rstomp-counting');
    const inner = document.getElementById('rstomp-strip-inner');
    if (!staffHost || !countingHost || !inner || !rstompPhrase.length) return;

    const perBarWidth = rstompBarWidth(rstompPhrase.length);
    rstompTotalWidth = perBarWidth * rstompPhrase.length;
    inner.style.width = `${rstompTotalWidth}px`;

    rstompLayouts = renderRstompStaff(staffHost, rstompSpecBars, perBarWidth);
    renderRstompCountingRow(countingHost, rstompLayouts, perBarWidth, rstompTotalWidth);
    updateRstompCaret();
    updateRstompStripChrome();
}

// The caret marks the beat being answered - the one thing that has to stay
// findable when most of the phrase is off screen.
function updateRstompCaret() {
    const caret = document.getElementById('rstomp-caret');
    if (!caret) return;
    const done = rstompCursor >= rstompPositions.length;
    caret.hidden = done || rstompLocked;
    if (caret.hidden) return;
    const position = rstompPositions[rstompCursor];
    const layout = rstompLayouts[position.barIndex];
    if (!layout) return;
    caret.style.left = `${layout.pulseX(position.slotIndex) - 1.5}px`;
}

// Scroll-follows-cursor, the way an editor follows a caret: only move once
// the cursor drifts out of a comfortable band, so the strip settles in steps
// instead of creeping on every tap, and always leave more room ahead of the
// cursor than behind it - the student still needs to read forward.
function followRstompCursor() {
    const strip = document.getElementById('rstomp-strip');
    if (!strip || !rstompFollowing || rstompCursor >= rstompPositions.length) return;
    const visible = strip.clientWidth;
    if (rstompTotalWidth <= visible) return;
    const position = rstompPositions[rstompCursor];
    const layout = rstompLayouts[position.barIndex];
    if (!layout) return;

    const x = layout.pulseX(position.slotIndex);
    if (x >= strip.scrollLeft + visible * 0.12 && x <= strip.scrollLeft + visible * 0.62) return;

    const target = Math.max(0, Math.min(x - visible * RSTOMP_CURSOR_ANCHOR, rstompTotalWidth - visible));
    rstompProgrammaticScroll = true;
    strip.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => { rstompProgrammaticScroll = false; }, 450);
}

function updateRstompStripChrome() {
    const strip = document.getElementById('rstomp-strip');
    if (!strip) return;
    const scrollable = rstompTotalWidth - strip.clientWidth > 2;
    strip.classList.toggle('scrollable', scrollable);

    const progress = document.getElementById('rstomp-strip-progress');
    if (progress) {
        // "Counts", not "beats" - a label is not always a beat any more. A
        // quaver starting on the "+" gets a label and is not a beat, while
        // the off-beat half of a crotchet is neither.
        const total = rstompPositions.length;
        const written = rstompScribe ? rstompWrittenBeats() : rstompCursor;
        progress.textContent = written >= total
            ? `All ${total} counts in`
            : `Count ${written + 1} of ${total}`;
    }

    // Nothing to expand when the whole phrase is already on screen.
    const fullView = document.getElementById('rstomp-fullview-btn');
    if (fullView) fullView.hidden = !scrollable;

    const chip = document.getElementById('rstomp-jump-chip');
    if (chip) chip.hidden = rstompFollowing || !scrollable || rstompCursor >= rstompPositions.length;
}

function jumpRstompToCursor() {
    rstompFollowing = true;
    followRstompCursor();
    updateRstompStripChrome();
}

function ensureRstompStripListeners() {
    if (rstompStripListenersReady) return;
    const strip = document.getElementById('rstomp-strip');
    if (!strip) return;

    // A scroll the student started means they want to look around; stop
    // chasing them until they answer again (or tap the jump chip).
    strip.addEventListener('scroll', () => {
        if (rstompProgrammaticScroll || !rstompFollowing) return;
        rstompFollowing = false;
        updateRstompStripChrome();
    });

    window.addEventListener('resize', () => {
        clearTimeout(rstompResizeTimer);
        rstompResizeTimer = setTimeout(() => {
            const screen = document.getElementById('rhythm-lab-screen-game');
            if (!screen || !screen.classList.contains('active') || !rstompPhrase.length) return;
            renderRstompBars();
            followRstompCursor();
        }, 150);
    });

    rstompStripListenersReady = true;
}

/* ---------- Full view: the whole phrase, wrapped into systems ---------- */

function openRstompFullView() {
    const host = document.getElementById('rstomp-fullview-systems');
    const modal = document.getElementById('modal-rstomp-full-view');
    if (!host || !modal) return;
    host.innerHTML = '';
    modal.classList.add('show');

    // Measured after the modal is shown, so the widths are the real ones.
    // Systems have to divide the phrase EVENLY - 4 bars wrap as 2+2, never
    // 3+1. A last system holding one lonely bar is the ragged look this
    // whole layout exists to get rid of, so the largest divisor that fits
    // wins rather than simply the most bars that fit.
    const available = host.clientWidth;
    const capacity = Math.max(1, Math.floor(available / (RSTOMP_MIN_SLOT_WIDTH * rstompSlotsPerBar)));
    const barCount = rstompPhrase.length;
    let barsPerSystem = 1;
    for (let size = barCount; size >= 1; size--) {
        if (barCount % size === 0 && size <= capacity) { barsPerSystem = size; break; }
    }
    const perBarWidth = available / barsPerSystem;

    for (let start = 0; start < rstompSpecBars.length; start += barsPerSystem) {
        const slice = rstompSpecBars.slice(start, start + barsPerSystem);
        const system = document.createElement('div');
        system.className = 'rstomp-system';

        const staff = document.createElement('div');
        staff.className = 'rstomp-staff';
        const counting = document.createElement('div');
        counting.className = 'rstomp-counting';
        system.appendChild(staff);
        system.appendChild(counting);
        host.appendChild(system);

        const nextBar = rstompSpecBars[start + slice.length];
        const layouts = renderRstompStaff(staff, slice, perBarWidth, {
            tieIn: start > 0 && Boolean(slice[0][0] && slice[0][0].tied),
            tieOut: Boolean(nextBar && nextBar[0] && nextBar[0].tied)
        });
        renderRstompCountingRow(counting, layouts, perBarWidth, perBarWidth * slice.length, start);
    }
}

function closeRstompFullView() {
    const modal = document.getElementById('modal-rstomp-full-view');
    if (modal) modal.classList.remove('show');
}

// Reveals left-to-right only, never past the cursor (design brief §9.3 -
// "eyes forward", never a glance backward needed). Returns positioned
// tokens (not a flat string) so each one can be placed at the x of the
// beat it actually describes - directly under the note it refers to, per
// Rob's Rubank reference, not centered as one string under the whole bar.
//
// Grouping rule: ONE GROUP PER WRITTEN NOTE OR REST, which supersedes the
// older "merge any contiguous run of the same underlying event" rule. The two
// agree on everything the old rule was written for, and differ where it
// mattered: two notes tied inside a bar are two groups, and adjacent rests
// never merge - "we would delineate each beat" (Rob, on a half rest followed
// by two quarter rests: "(1 2) (3) (4)").
function buildRstompCountingTokens(barIndex) {
    const specs = rstompSpecBars[barIndex] || [];
    const tokens = [];
    let beat = 0;
    for (const spec of specs) {
        // Only this note's COUNTED positions - the beats it covers plus its
        // own onset. The tutorial runs on the crotchet grid, where that is
        // every slot, but it is stated the same way as everywhere else so
        // the two interfaces can never drift apart on what gets a label.
        const own = [];
        for (let k = 0; k < spec.slots; k++) {
            const index = rstompIndexOfSlot(barIndex * rstompSlotsPerBar + beat + k);
            if (index !== -1) own.push({ index, slot: beat + k });
        }
        // A note's counting only appears once every position it covers has
        // been answered - showing half a group would put a bracket on screen
        // the student hasn't finished building.
        if (!own.length || own.some(position => rstompEntries[position.index] == null)) break;

        const digits = own.map(position => rstompLabels[position.slot]);
        const lastSlot = own[own.length - 1].slot;
        // The student's own answer decides plain-vs-bracketed on the first
        // beat; the grouping comes from the written note. That keeps the row
        // honest to what they typed while still delineating the notation.
        if (rstompEntries[own[0].index] === 'play') {
            tokens.push({ text: digits[0], startBeat: own[0].slot, endBeat: own[0].slot, kind: 'play' });
            if (digits.length > 1) {
                tokens.push({ text: `(${digits.slice(1).join(' ')})`, startBeat: own[1].slot, endBeat: lastSlot, kind: 'hold' });
            }
        } else {
            tokens.push({ text: `(${digits.join(' ')})`, startBeat: own[0].slot, endBeat: lastSlot, kind: spec.isRest ? 'rest' : 'hold' });
        }
        beat += spec.slots;
    }
    return tokens;
}

// Alignment style guide (Rob's review of the live rendering, confirmed
// against the Rubank method reference):
//
// 1. A token with a real glyph above it (a Play, or any Rest shorter than
//    a full bar) LEFT-ALIGNS to that glyph's actual rendered position
//    (layout.noteX) - not centered on it. "A whole note's beat 1 left-
//    aligns with the note above it."
// 2. A Hold-continuation bracket (no glyph of its own - it's the tail of
//    a note that already has its own onset token) has nothing to left-
//    align to, so it CENTERS across the true, evenly-spaced beat-grid span
//    it covers (layout.pulseX) instead - "the numbers need to breathe",
//    landing naturally mid-span rather than crammed against the note that
//    started it (e.g. a whole note's "(2 3 4)" centers near beat 2.5,
//    matching Rob's own description of the right feel).
// The deciding question is therefore "is there a glyph above this token?",
// NOT "is it a bracket?" - and there is exactly one Hold that answers yes:
// the one opening a bar tied over from the previous one. That note IS
// re-drawn as a real notehead (it just isn't re-attacked), so its bracket
// takes rule 1 like any other token sitting under a glyph. Centering it
// pushed it a beat late - measured at 32px right of its own notehead on a
// desktop render, which reads as belonging to beat 2 rather than beat 1.
// A whole rest was expected to need the same treatment - real engraving
// convention often hangs it centered in the bar rather than at beat 1's
// true position - but measured directly (note.getAbsoluteX()) it renders
// at the same onset-style position a whole note does (21px in, matching
// exactly): this VexFlow setup never applies that centering unless
// setCenterAlignment() is explicitly called, which nothing here does. No
// exception needed - rule 1 already produces the correct position.
//
// layouts covers consecutive bars starting at barOffset - the whole phrase
// on the playing strip, or one system's worth in the full view. Every
// layout's noteX/pulseX already sits in the shared canvas's one coordinate
// space, so no per-bar offset is needed; they all drop into one container.
//
// Font size scales with the per-bar width, then shrinks further if the
// tokens still won't fit (see the placement pass below).
// What the student has written, as runs over ABSOLUTE beat slots. A correct
// bracket never crosses a barline (see rstompTargetGroups), but a student's
// can - writing one is a real mistake they're allowed to make and see marked
// - so runs are kept on absolute slots and the renderer handles a run whose
// end lands in a later bar rather than assuming it can't.
//
// Only the notation underneath decides alignment, which is why the same two
// rules apply here as to the tutorial's derived tokens: what matters is
// whether there is a glyph above the run's first beat, not what the student
// wrote above it.
function buildRstompScribeRuns() {
    const groups = rstompRevealed || (rstompWriting ? rstompWriting.groups : []);
    const wrong = new Set(rstompWrongBars.map(bar => bar - 1));
    const runs = [];
    let index = 0;
    groups.forEach(group => {
        // A bracket just opened has no digits yet but must still show - the
        // whole point of the key is that opening one is a visible act.
        if (!group.digits.length && !group.bracketed) return;
        // A label's x comes from the counting POSITION it was written on.
        // Labels and slots are no longer one-to-one - a crotchet at the
        // quaver grid takes one label and two slots - so the slot has to be
        // looked up rather than counted off.
        const span = Math.max(0, group.digits.length - 1);
        const last = Math.min(index + span, rstompPositions.length - 1);
        const start = rstompPositions[Math.min(index, rstompPositions.length - 1)];
        const end = rstompPositions[last];
        if (start && end) {
            runs.push({
                text: rstompGroupText(group),
                bracketed: group.bracketed,
                empty: group.digits.length === 0,
                startSlot: start.absolute,
                endSlot: end.absolute,
                wrong: wrong.has(start.barIndex) || wrong.has(end.barIndex)
            });
        }
        index += group.digits.length;
    });
    return runs;
}

function renderRstompCountingRow(container, layouts, perBarWidth, totalWidth, barOffset = 0) {
    container.innerHTML = '';
    container.style.width = `${totalWidth}px`;
    const els = [];
    const anchors = [];

    const add = (text, anchor, centered, wrong) => {
        const el = document.createElement('span');
        el.className = `rstomp-count-token${centered ? ' rstomp-count-token-centered' : ''}${wrong ? ' wrong' : ''}`;
        el.textContent = text;
        container.appendChild(el);
        els.push(el);
        anchors.push(anchor);
    };

    if (rstompScribe) {
        // Absolute slot -> the layout showing it, or null when that bar isn't
        // in this container (the full view renders one system at a time).
        const layoutFor = slot => layouts[Math.floor(slot / rstompSlotsPerBar) - barOffset] || null;
        buildRstompScribeRuns().forEach(run => {
            const startLayout = layoutFor(run.startSlot);
            if (!startLayout) return;
            const startBeat = run.startSlot % rstompSlotsPerBar;
            const owner = startLayout.beatOwner[startBeat];
            if (run.empty) {
                // Nothing written inside it yet, so there is no span to
                // centre across - park it on its own beat.
                add(run.text, startLayout.pulseX(startBeat), false, run.wrong);
            } else if (!owner.isOnset) {
                // No glyph above this slot, so there is nothing to left-align
                // to - centre across the span, whether or not the student
                // bracketed it. The `run.bracketed &&` that used to be part
                // of this test contradicted the rule stated above, and cost
                // Rob a Stage B level: an UNbracketed digit written on a
                // held slot fell through to rule 1 and was drawn at the
                // notehead of the note holding through it - i.e. exactly on
                // top of that note's own onset digit, pixel for pixel. The
                // student could no longer see what they had written, and
                // every label after it was one position out of step with
                // what they meant. Writing an unbracketed digit on a held
                // slot is a real mistake and still marks wrong; it just has
                // to be VISIBLE, because finding your own mistake is the
                // skill this interface is built around.
                const endLayout = layoutFor(run.endSlot) || layouts[layouts.length - 1];
                const endBeat = layoutFor(run.endSlot) ? (run.endSlot % rstompSlotsPerBar) + 1 : rstompSlotsPerBar;
                add(run.text, (startLayout.pulseX(startBeat) + endLayout.pulseX(endBeat)) / 2, true, run.wrong);
            } else {
                add(run.text, startLayout.noteX[owner.specIndex], false, run.wrong);
            }
        });
    } else {
        layouts.forEach((layout, position) => {
            buildRstompCountingTokens(barOffset + position).forEach(token => {
                const owner = layout.beatOwner[token.startBeat];
                if (token.kind === 'hold' && !owner.isOnset) {
                    add(token.text, (layout.pulseX(token.startBeat) + layout.pulseX(token.endBeat + 1)) / 2, true, false);
                } else {
                    add(token.text, layout.noteX[owner.specIndex], false, false);
                }
            });
        });
    }

    // Rule 2's "breathe at the true mid-span" position is an ideal, not a
    // guarantee - at narrow card widths (2-column portrait grid) it can
    // overlap a neighbouring onset token, confirmed by measurement (e.g.
    // "(2)" and the following "3" touching at ~170px card width). Onset
    // tokens (rule 1) are never moved - they're anchored to a real glyph.
    // Only a Hold token gets nudged, clamped into whatever free space
    // actually exists between its two fixed neighbours, measured from the
    // real rendered widths (offsetWidth) now that everything's in the DOM.
    // Runs across the WHOLE phrase, not per bar - a token near a barline can
    // collide with its neighbour on the other side of that barline too.
    // GAP is deliberately generous (not just enough to clear zero overlap
    // in one browser's font metrics) - a downloaded webfont like Patrick
    // Hand can render at measurably different widths across platforms
    // (desktop headless Chromium vs a phone's Chrome build), so a hairline
    // margin that only just clears in one environment can still collide
    // in another.
    const GAP = 8;
    const edgesOf = el => {
        const centered = el.classList.contains('rstomp-count-token-centered');
        const anchor = parseFloat(el.style.left);
        const width = el.offsetWidth;
        return centered ? [anchor - width / 2, anchor + width / 2] : [anchor, anchor + width];
    };

    // Place everything at one font size and report the worst overlap left
    // over. Nudging alone can't always win: where two fixed onsets sit close
    // together, the bracket squeezed between them has nowhere legal to go.
    const placeAt = fontSize => {
        container.style.fontSize = `${fontSize}px`;
        els.forEach((el, index) => { el.style.left = `${anchors[index]}px`; });
        els.forEach((el, index) => {
            if (!el.classList.contains('rstomp-count-token-centered')) return;
            const width = el.offsetWidth;
            let center = anchors[index];
            const prevRight = index > 0 ? edgesOf(els[index - 1])[1] : -Infinity;
            const nextLeft = index < els.length - 1 ? edgesOf(els[index + 1])[0] : Infinity;
            center = Math.max(center, prevRight + GAP + width / 2);
            center = Math.min(center, nextLeft - GAP - width / 2);
            el.style.left = `${center}px`;
        });
        let worst = 0;
        for (let index = 1; index < els.length; index++) {
            worst = Math.max(worst, edgesOf(els[index - 1])[1] - edgesOf(els[index])[0]);
        }
        return worst;
    };

    // When a dense bar genuinely can't fit its counting at the natural size,
    // shrink the row rather than let the numbers collide - and the shrinking
    // is itself the signal that this width is running out of room.
    let fontSize = Math.max(13, Math.min(24, perBarWidth * 0.09));
    while (fontSize > 10 && placeAt(fontSize) > 0.5) fontSize -= 1;
}

function renderRstompStaff(container, specBars, perBarWidth, options = {}) {
    container.innerHTML = '';
    const VF = Vex.Flow;
    const totalWidth = perBarWidth * specBars.length;
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(totalWidth, 130);
    const context = renderer.getContext();

    const rendered = specBars.map((specs, position) => {
        const isLastInGroup = position === specBars.length - 1;
        const x = 4 + position * perBarWidth;
        const stave = new VF.Stave(x, 20, perBarWidth - (isLastInGroup ? 8 : 0));
        stave.setConfigForLines([
            { visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false }
        ]);
        stave.setStyle({ strokeStyle: '#000000' });
        stave.setContext(context).draw();

        const notes = specs.map(spec => {
            // The written note value travels on the spec itself - no lookup
            // table, and no way for the drawn note and the counted slots to
            // disagree, since the generator set both from the same unit.
            const duration = spec.value;
            // Stems always UP on a one-line rhythm staff. Left to VexFlow the
            // notehead sits on the middle line and the stem is sent DOWN, which
            // on a stave with only that line visible puts the beam in the same
            // space as the counting row.
            const note = new VF.StaveNote({ clef: 'treble', keys: ['b/4'], stem_direction: 1,
                duration: spec.isRest ? `${duration}r` : duration });
            // VexFlow reads the "d" suffix for TICKS but does not draw the dot
            // from it - a dotted minim comes out looking exactly like a plain
            // minim, with the bar still filling correctly and no error raised.
            // The modifier has to be attached by hand. Silent until a dotted
            // value reaches a level, which is A5 (dotted minim) and all of
            // Stage B, so it is caught here rather than there.
            if (note.dots) note.addDotToAll();
            return note;
        });
        const meter = rstompVoiceMeter();
        const voice = new VF.Voice({ num_beats: meter.num, beat_value: meter.den }).addTickables(notes);
        // Beam by BEAT, from each note's ACTUAL POSITION IN THE BAR - four
        // quavers in 4/4 are two beamed pairs, not one group of four, and the
        // beam is what makes the beat visible before the counting is read.
        //
        // Built here rather than by VF.Beam.generateBeams, which counts its
        // groups from the start of each RUN of beamable notes instead of from
        // the bar: after a crotchet or a rest its counter restarts, and the
        // next two quavers get beamed wherever they happen to sit. Measured at
        // 310 of 2119 beams joining notes from different beats, and 19 of 40
        // on the Pump level. A beam across beat 3 hides the middle of the bar
        // exactly as a note sounding through it does, which is the rule
        // rstompShowBeatThree exists to keep.
        //
        // A note that straddles a group boundary is beamed to nothing and
        // keeps its flag - there is no group it belongs to.
        const groupOf = (start, slots) => {
            const first = Math.floor(start / rstompBeamSlots);
            return first === Math.floor((start + slots - 1) / rstompBeamSlots) ? first : null;
        };
        const beams = [];
        let run = [];
        let beamCursor = 0;
        const flushBeam = () => { if (run.length > 1) beams.push(new VF.Beam(run.map(item => item.note))); run = []; };
        specs.forEach((spec, index) => {
            const group = groupOf(beamCursor, spec.slots);
            const beamable = !spec.isRest && group !== null && RSTOMP_BEAMABLE.indexOf(spec.value) !== -1;
            if (!beamable || (run.length && run[run.length - 1].group !== group)) flushBeam();
            if (beamable) run.push({ note: notes[index], group });
            beamCursor += spec.slots;
        });
        flushBeam();
        // The ideal, evenly-spaced slot grid (where the level's labels fall).
        // Everything below - the formatting width, where each note is put,
        // and where the counting row anchors - is stated against it.
        const trueStartX = stave.getNoteStartX();
        const trueEndX = stave.getNoteEndX();
        const pulseX = slotFraction => trueStartX + (slotFraction / rstompSlotsPerBar) * (trueEndX - trueStartX);

        // Justify across the stave's REAL note area. The old flat
        // `perBarWidth - 60` was ~28% short of it, which left every bar's
        // notes bunched into its left-hand two thirds with a band of white
        // space before the barline - the first thing Rob saw on a phone.
        new VF.Formatter().joinVoices([voice]).format([voice], trueEndX - trueStartX - 10);

        // Then put every note ON its slot. VexFlow spaces proportionally by
        // duration (softmax), which is right for engraved music and wrong
        // here: this staff exists to be read against a counting row that is
        // an even grid, so a note that starts on beat 3 has to be at beat
        // 3's x, not at 44% of the bar. Placing them on the grid is what
        // makes "every number sits under the thing it counts" true by
        // construction rather than by nudging afterwards.
        // The inset is the first note's own natural offset from the stave's
        // note start - kept uniform so the spacing between slots stays
        // exactly even, and so no notehead sits flush against a barline.
        const inset = notes.length ? notes[0].getAbsoluteX() - trueStartX : 0;
        let slotCursor = 0;
        notes.forEach((note, index) => {
            const tickContext = note.getTickContext();
            tickContext.setX(tickContext.getX() + (pulseX(slotCursor) + inset) - note.getAbsoluteX());
            slotCursor += specs[index].slots;
        });

        voice.draw(context, stave);
        beams.forEach(beam => beam.setContext(context).draw());

        // Read back the rendered x of each note (getAbsoluteX) - the real
        // onset a Play token or a non-whole-bar Rest bracket left-aligns to
        // (see renderRstompCountingRow for the alignment rules this layout
        // serves). Since the placement pass above, this is the note's slot
        // position plus the uniform inset, so it agrees with pulseX by
        // construction. Still read back rather than recomputed, so the
        // counting can never disagree with what was actually drawn. Already
        // in the shared canvas's one coordinate space (position's own x
        // offset baked in), so a second bar's positions need no adjustment.
        const noteX = notes.map(note => note.getAbsoluteX());

        // Which spec (note/rest object) owns each beat, and whether that
        // beat is the spec's own onset (has a glyph) or a continuation
        // (doesn't) - a bar whose own beat 0 is 'hold' (a tie continuing
        // from the previous bar) still gets a real onset glyph and real
        // noteX here, same as any other spec; it just isn't a Play.
        const beatOwner = new Array(rstompSlotsPerBar);
        let cumulativeSlots = 0;
        specs.forEach((spec, index) => {
            for (let k = 0; k < spec.slots; k++) beatOwner[cumulativeSlots + k] = { specIndex: index, isOnset: k === 0 };
            cumulativeSlots += spec.slots;
        });

        return { specs, notes, noteX, pulseX, beatOwner };
    });

    // Ties INSIDE a bar: any spec marked tied is the same note continuing
    // from the one before it. This is what two half notes tied in one bar
    // needs, and it is drawn exactly like a tie over a barline - the only
    // difference is which two noteheads it joins.
    rendered.forEach(({ specs, notes }) => {
        specs.forEach((spec, index) => {
            if (!spec.tied || index === 0) return;
            new VF.StaveTie({ first_note: notes[index - 1], last_note: notes[index], first_indices: [0], last_indices: [0] }).setContext(context).draw();
        });
    });

    // Cross-barline tie. Now simply "the bar's first note is marked tied" -
    // no longer inferred from a leading Hold in the beat stream, which was
    // only ever a proxy for this. Every bar is on this one canvas, so the
    // curve can be drawn wherever it happens.
    for (let position = 1; position < specBars.length; position++) {
        if (!specBars[position][0] || !specBars[position][0].tied) continue;
        const previousNotes = rendered[position - 1].notes;
        const lastNote = previousNotes[previousNotes.length - 1];
        const firstNote = rendered[position].notes[0];
        if (lastNote && firstNote) {
            new VF.StaveTie({ first_note: lastNote, last_note: firstNote, first_indices: [0], last_indices: [0] }).setContext(context).draw();
        }
    }
    if (options.tieIn) {
        const firstNote = rendered[0].notes[0];
        if (firstNote) new VF.StaveTie({ last_note: firstNote, last_indices: [0] }).setContext(context).draw();
    }
    if (options.tieOut) {
        const lastBarNotes = rendered[rendered.length - 1].notes;
        const lastNote = lastBarNotes[lastBarNotes.length - 1];
        if (lastNote) new VF.StaveTie({ first_note: lastNote, first_indices: [0] }).setContext(context).draw();
    }

    // VexFlow draws on a 130px canvas of which the music only ever occupies
    // a band in the middle; the container crops back to that band. The crop
    // used to be -30px against a 60px window, i.e. visible down to y=90 -
    // but a tie curve reaches y=93 and a crotchet rest y=100.5, so ties came
    // out as clipped stubs and rests lost their tails, while 15px of empty
    // air was wasted above the beams. On Level 7, whose whole subject is
    // ties inside the bar, an invisible tie is the level: the student reads
    // two separate crotchets and writes "1 2" where the answer is "1 (2)".
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.marginTop = `${-RSTOMP_STAFF_CROP_TOP}px`;
        container.style.height = `${RSTOMP_STAFF_CROP_HEIGHT}px`;
    }

    return rendered.map(({ noteX, pulseX, beatOwner }) => ({ noteX, pulseX, beatOwner }));
}

/* ---------- Streak + feedback ---------- */

function updateRstompStreakDots() {
    const dots = [0, 1, 2].map(index =>
        `<span class="streak-dot${index < rstompStreak ? ' active' : ''}" aria-hidden="true"></span>`
    ).join('');
    document.getElementById('rstomp-streak-dots').innerHTML = dots;
}

function showRstompFeedback(kind, text) {
    const el = document.getElementById('rstomp-feedback');
    el.textContent = text;
    el.className = `rstomp-feedback ${kind}`;
    el.hidden = false;
}

function hideRstompFeedback() {
    const el = document.getElementById('rstomp-feedback');
    el.hidden = true;
}

/* ---------- Submit + grading ---------- */

function submitRstompPhrase() {
    if (rstompLocked) return;
    if (rstompScribe) {
        if (rstompWrittenBeats() < rstompPositions.length) return;
        rstompLocked = true;
        const wrongBars = rstompWrongBarsFor(rstompWriting);
        if (wrongBars.length === 0) handleRstompSuccess();
        else handleRstompScribeFailure(wrongBars);
        return;
    }
    if (rstompCursor < rstompPositions.length) return;
    rstompLocked = true;
    const wrongBarsSet = new Set();
    rstompPositions.forEach((position, index) => {
        if (rstompEntries[index] !== rstompExpectedAnswer(position)) wrongBarsSet.add(position.barIndex);
    });
    const wrongBars = [...wrongBarsSet].sort((a, b) => a - b);
    if (wrongBars.length === 0) handleRstompSuccess();
    else handleRstompFailure(wrongBars);
}

function handleRstompSuccess() {
    playSound('correct');
    rstompScore += 4;
    rstompStreak++;
    updateRstompStreakDots();
    showRstompFeedback('correct', 'Nailed it! +4');
    if (rstompStreak >= 3) {
        setTimeout(showRstompLevelComplete, 800);
    } else {
        setTimeout(() => { rstompAttempt = 1; rstompLocked = false; startNewRstompPhrase(); }, 1000);
    }
}

// Finding your own mistake is the skill, so the first strike says only HOW
// MANY bars are wrong - not which. The second names them and rewinds to the
// first one. The third shows the answer and resets the streak. Naming them
// immediately would turn a reading task into a "fix the highlighted box"
// task, which is the scaffolding this interface exists to remove.
function handleRstompScribeFailure(wrongBars) {
    playSound('wrong');
    const names = wrongBars.map(index => index + 1);

    if (rstompAttempt === 1) {
        rstompAttempt++;
        rstompWrongBars = [];
        showRstompFeedback('wrong', wrongBars.length === 1
            ? "One bar isn't right. Can you find it before you submit again?"
            : `${wrongBars.length} bars aren't right. Can you find them?`);
        renderRstompBars();
        setTimeout(() => { rstompLocked = false; updateRstompButtonStates(); }, 700);
        return;
    }

    if (rstompAttempt === 2) {
        rstompAttempt++;
        rstompWrongBars = names;
        showRstompFeedback('wrong', wrongBars.length > 1
            ? `Bars ${names.join(', ')} aren't right — read them again.`
            : `Bar ${names[0]} isn't right — read it again.`);
        renderRstompBars();
        setTimeout(() => {
            rstompRewindTo(wrongBars[0]);
            rstompWrongBars = [];
            rstompLocked = false;
            rstompFollowing = true;
            renderRstompBars();
            followRstompCursor();
            updateRstompPrompt();
            updateRstompButtonStates();
            hideRstompFeedback();
        }, 1800);
        return;
    }

    rstompRevealed = rstompTargetGroups();
    rstompWrongBars = [];
    rstompStreak = 0;
    updateRstompStreakDots();
    showRstompFeedback('wrong', "Here's the counting — streak reset. New phrase next.");
    renderRstompBars();
    updateRstompPrompt();
    setTimeout(() => { rstompAttempt = 1; rstompLocked = false; startNewRstompPhrase(); }, 3200);
}

// Same shape as rhythm.js: attempts 1-2 clear only the wrong bar(s) for
// re-entry, correct bars stay as-is; attempt 3 reveals the answer and
// resets the streak.
function handleRstompFailure(wrongBars) {
    playSound('wrong');
    if (rstompAttempt < 3) {
        rstompAttempt++;
        showRstompFeedback('wrong', `Bar${wrongBars.length > 1 ? 's' : ''} ${wrongBars.map(index => index + 1).join(', ')} - try again (attempt ${rstompAttempt} of 3).`);
        setTimeout(() => {
            const wrongSet = new Set(wrongBars);
            rstompPositions.forEach((position, index) => {
                if (wrongSet.has(position.barIndex)) rstompEntries[index] = null;
            });
            rstompUndoStack = rstompUndoStack.filter(index => !wrongSet.has(rstompPositions[index].barIndex));
            const nextNull = rstompEntries.findIndex(value => value === null);
            rstompCursor = nextNull === -1 ? rstompPositions.length : nextNull;
            rstompLocked = false;
            rstompFollowing = true;
            renderRstompBars();
            followRstompCursor();   // the cursor has jumped back to the first wrong bar; go with it
            updateRstompPrompt();
            updateRstompButtonStates();
            hideRstompFeedback();
        }, 1400);
    } else {
        showRstompFeedback('wrong', "Here's the correct answer - new phrase next.");
        const wrongSet = new Set(wrongBars);
        rstompPositions.forEach((position, index) => {
            if (wrongSet.has(position.barIndex)) rstompEntries[index] = rstompExpectedAnswer(position);
        });
        renderRstompBars();
        rstompStreak = 0;
        updateRstompStreakDots();
        setTimeout(() => { rstompAttempt = 1; rstompLocked = false; startNewRstompPhrase(); }, 2200);
    }
}

function showRstompLevelComplete() {
    recordRstompResult(true);
    const level = RSTOMP_LEVELS.find(entry => entry.id === rstompSelectedLevel);
    document.getElementById('rstomp-level-complete-title').innerText = `${level.shortLabel} mastered!`;
    document.getElementById('rstomp-level-complete-score').innerText = rstompScore;
    playSound('complete');
    document.getElementById('modal-rstomp-level-complete').classList.add('show');
}

function continueAfterRstompLevel() {
    document.getElementById('modal-rstomp-level-complete').classList.remove('show');
    rstompLocked = false;
    renderRstompPathway();
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-pathway');
}

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

const RSTOMP_VOCABULARY = {
    'whole-note': { value: 'w', isRest: false },
    'whole-rest': { value: 'w', isRest: true },
    'dotted-half-note': { value: 'hd', isRest: false },
    'half-note': { value: 'h', isRest: false },
    'half-rest': { value: 'h', isRest: true },
    'dotted-quarter-note': { value: 'qd', isRest: false },
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
// Level 3's pool, once the merge and rest-adjacency engraving rules both
// apply, only actually produces 4 valid bar shapes: a lone whole note, a
// lone whole rest, half-note+half-rest, and half-rest+half-note - by design,
// not a bug. It's genuinely a thin "mixed" level at this stage (testing
// whether a student can switch between whole-note-scale and half-note-scale
// thinking within one level, not new combinatorics) - the pool grows once
// quarter notes arrive at a future level.
//
// Every level carries `labels` and `slot`. The four that ship today are all
// on the crotchet grid, so they all take RSTOMP_LABELS_BEAT - the machinery
// for the finer grids is here and exercised by the tests, but no level uses
// it until Stage B is built (design brief §13).
const RSTOMP_LEVELS = [
    // Level 1 is the two-button walkthrough - the tutorial for the whole
    // idea, and a complete experience on its own for a child who can't yet
    // write numerals (CLAUDE.md, "TWO interfaces"). Every level after it
    // hands the student the keypad and asks them to write the counting
    // themselves, which is the transferable skill.
    { id: '1', label: 'Level 1: Whole Notes and Rests', shortLabel: 'Whole Notes and Rests', labels: RSTOMP_LABELS_BEAT, slot: 'q', pool: ['whole-note', 'whole-rest'] },
    { id: '2', label: 'Level 2: Half Notes and Rests', shortLabel: 'Half Notes and Rests', labels: RSTOMP_LABELS_BEAT, slot: 'q', pool: ['half-note', 'half-rest'], avoidRepeats: ['half-note'], scribe: true },
    { id: '3', label: 'Level 3: Whole and Half Notes Mixed', shortLabel: 'Whole and Half Mixed', labels: RSTOMP_LABELS_BEAT, slot: 'q', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'], avoidRepeats: ['half-note'], scribe: true },
    // tieLevel/tieChance: see generateRstompPhraseWithTie. Every phrase at
    // this level carries a tie (tieChance 1), matching the original design
    // brief's level 4 - ties are introduced right after whole/half, using
    // only durations already taught, per Rob's "a tie is just how we make
    // really long notes" framing.
    { id: '4', label: 'Level 4: Ties Across the Barline', shortLabel: 'Ties Across the Barline', labels: RSTOMP_LABELS_BEAT, slot: 'q', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'], avoidRepeats: ['half-note'], tieLevel: true, tieChance: 1, scribe: true }
];

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
        avoidRepeats: level.avoidRepeats || [],
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

function rstompVoiceMeter() {
    return { num: rstompSlotsPerBar, den: RSTOMP_VALUE_DENOMINATOR[rstompSlotValue] };
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
let rstompPositions = [];       // flat [{barIndex, slotIndex}] - one per slot in the phrase

// The active level's grid, set when a phrase is generated. Held here rather
// than looked up per call so that drawing, scoring and the counting row all
// read the same three numbers without reaching back into RSTOMP_LEVELS.
let rstompLabels = RSTOMP_LABELS_BEAT;
let rstompSlotsPerBar = RSTOMP_LABELS_BEAT.length;
let rstompSlotValue = 'q';
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
// Two filters run over the results, and they are NOT the same kind of rule:
//
//  1. ADJACENT RESTS - engraving, general. Two rests in a row collapse into
//     one longer rest; there is no onset to tell them apart. (This needs
//     revisiting when quarter rests arrive at Stage A: Rob's own
//     "(1 2) (3) (4)" example is a half rest followed by TWO quarter rests,
//     so the real rule is metric, not absolute. Nothing in the levels that
//     ship today can reach that case.)
//  2. avoidRepeats - LEVEL DESIGN, not engraving, and declared per level.
//     Listing a unit key stops two of them being generated back to back.
//
// Rule 2 used to be hardcoded as "never two half notes in a row" and
// described as engraving, citing the design brief. The brief's rule is
// narrower than that: "never TIE two half notes in the same bar - write a
// whole note instead." Two SEPARATELY STRUCK half notes, on beats 1 and 3,
// are ordinary notation and a different rhythm from a whole note. So this is
// a level-design choice - it keeps level 2's content out of level 3's
// "mixed" bars - and it is declared on the levels that want it rather than
// generalised, because the metric version of it ("two equal notes where one
// longer note would do") would wrongly throw out a pair of quavers on beat 1,
// which is most of Stage B. Flagged for Rob: on level 2 it means a level
// called "Half Notes and Rests" never shows two half notes in one bar.
function buildRstompUnitShapes(grid, targetSlots) {
    const results = [];
    (function build(remainingSlots, shape) {
        if (remainingSlots === 0) { results.push(shape); return; }
        grid.units.forEach(unit => {
            if (unit.slots <= remainingSlots) build(remainingSlots - unit.slots, [...shape, unit.key]);
        });
    })(targetSlots, []);

    const unitOf = key => grid.units.find(unit => unit.key === key);
    return results.filter(shape => {
        for (let i = 1; i < shape.length; i++) {
            const unit = unitOf(shape[i]);
            const previous = unitOf(shape[i - 1]);
            if (unit.isRest && previous.isRest) return false;
            if (shape[i] === shape[i - 1] && grid.avoidRepeats.indexOf(shape[i]) !== -1) return false;
        }
        return true;
    });
}

function buildRstompBarShapes(grid) {
    return buildRstompUnitShapes(grid, grid.slotsPerBar);
}

function generateRstompPhrase(level) {
    const grid = rstompGridFor(level);
    return level.tieLevel ? generateRstompPhraseWithTie(level, grid) : generateRstompPhraseNormal(level, grid);
}

// Variety rule (design brief §5 item 15): no bar shape repeats more than
// twice across the phrase, never identical to the bar immediately before it.
function generateRstompPhraseNormal(level, grid) {
    const shapes = buildRstompBarShapes(grid);
    const counts = new Array(shapes.length).fill(0);
    const chosenIndices = [];
    for (let i = 0; i < RSTOMP_BARS_PER_PHRASE; i++) {
        const allIndices = shapes.map((_, index) => index);
        let candidates = allIndices.filter(index => counts[index] < 2 && index !== chosenIndices[i - 1]);
        if (candidates.length === 0) candidates = allIndices.filter(index => index !== chosenIndices[i - 1]);
        if (candidates.length === 0) candidates = allIndices;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        chosenIndices.push(chosen);
        counts[chosen]++;
    }
    return chosenIndices.map(index => rstompShapeToSpecs(shapes[index], grid));
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

    const candidateRuns = [];
    for (let n = 1; n <= grid.slotsPerBar; n++) {
        if (rstompValueForSlots(n, grid.slotValue)
            && buildRstompUnitShapes(grid, grid.slotsPerBar - n).length > 0) candidateRuns.push(n);
    }
    const rsPairs = [];
    candidateRuns.forEach(r => candidateRuns.forEach(s => rsPairs.push([r, s])));
    const [r, s] = rsPairs[Math.floor(Math.random() * rsPairs.length)];

    const leadShapes = buildRstompUnitShapes(grid, grid.slotsPerBar - r);
    const tailShapes = buildRstompUnitShapes(grid, grid.slotsPerBar - s);
    const leadShape = leadShapes[Math.floor(Math.random() * leadShapes.length)];
    const tailShape = tailShapes[Math.floor(Math.random() * tailShapes.length)];

    const tieValue = slots => rstompValueForSlots(slots, grid.slotValue);
    const barA = [...rstompShapeToSpecs(leadShape, grid), { slots: r, value: tieValue(r), isRest: false }];
    const barB = [{ slots: s, value: tieValue(s), isRest: false, tied: true }, ...rstompShapeToSpecs(tailShape, grid)];

    const normalShapes = buildRstompBarShapes(grid);
    const pickNormalShape = previousShape => {
        const candidates = normalShapes.filter(shape => shape.join() !== (previousShape || []).join());
        const options = candidates.length ? candidates : normalShapes;
        return options[Math.floor(Math.random() * options.length)];
    };
    const normalShape1 = pickNormalShape(null);
    const normalShape2 = pickNormalShape(normalShape1);
    const normalBars = [rstompShapeToSpecs(normalShape1, grid), rstompShapeToSpecs(normalShape2, grid)];

    // The tied pair occupies boundary/boundary+1; the remaining bars take
    // the untied ones in order.
    const boundary = Math.floor(Math.random() * (RSTOMP_BARS_PER_PHRASE - 1));
    const bars = [];
    let nextNormal = 0;
    for (let index = 0; index < RSTOMP_BARS_PER_PHRASE; index++) {
        if (index === boundary) bars.push(barA);
        else if (index === boundary + 1) bars.push(barB);
        else bars.push(normalBars[nextNormal++]);
    }
    return bars;
}

// One position per slot. How many slots a bar holds is the active level's
// label-array length, so this is the same function whether a slot is a
// crotchet, a quaver or a semiquaver - which is the point of the grid.
function buildRstompPositions(phrase) {
    const positions = [];
    phrase.forEach((bar, barIndex) => {
        for (let slotIndex = 0; slotIndex < rstompSlotsPerBar; slotIndex++) positions.push({ barIndex, slotIndex });
    });
    return positions;
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
            const digits = [];
            for (let k = 0; k < spec.slots; k++) digits.push(rstompLabels[beat + k]);
            if (!spec.isRest && !spec.tied) {
                // Struck: the onset digit is written plainly, its held beats
                // bracketed. A one-beat note has no held beats, so no bracket.
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
    const mine = rstompGroupsToSlotMarks(writing.groups);
    const theirs = rstompGroupsToSlotMarks(rstompTargetGroups());
    const wrong = new Set();
    for (let slot = 0; slot < theirs.length; slot++) {
        if (mine[slot] !== theirs[slot]) wrong.add(Math.floor(slot / rstompSlotsPerBar));
    }
    for (let extra = theirs.length; extra < mine.length; extra++) {
        wrong.add(Math.min(rstompPhrase.length - 1, Math.floor(extra / rstompSlotsPerBar)));
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
    const keepSlots = barIndex * rstompSlotsPerBar;
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
    rstompSpecBars = generateRstompPhrase(level);
    rstompPhrase = rstompSpecsToPhrase(rstompSpecBars);
    rstompPositions = buildRstompPositions(rstompPhrase);
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
        if (rstompCursor >= rstompPositions.length) { el.textContent = 'All four bars written — check your answer below.'; return; }
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
        // Submit is live as soon as all four bars are accounted for, even
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
const RSTOMP_MIN_BAR_WIDTH = 140;
const RSTOMP_MAX_BAR_WIDTH = 190;   // above this bars just look sparse on a big screen
const RSTOMP_CURSOR_ANCHOR = 0.3;   // where the cursor parks after a scroll; the rest is look-ahead

let rstompLayouts = [];
let rstompTotalWidth = 0;
let rstompFollowing = true;
let rstompProgrammaticScroll = false;
let rstompResizeTimer = null;
let rstompStripListenersReady = false;

function rstompBarWidth(barCount) {
    const strip = document.getElementById('rstomp-strip');
    const available = (strip ? strip.clientWidth : 360) - 12; // strip's own padding
    return Math.max(RSTOMP_MIN_BAR_WIDTH, Math.min(RSTOMP_MAX_BAR_WIDTH, available / barCount));
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
        const total = rstompPositions.length;
        const written = rstompScribe ? rstompWrittenBeats() : rstompCursor;
        progress.textContent = written >= total
            ? `All ${total} beats in`
            : `Beat ${written + 1} of ${total}`;
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
    const capacity = Math.max(1, Math.floor(available / RSTOMP_MIN_BAR_WIDTH));
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
        // A note's counting only appears once every beat it covers has been
        // answered - showing half a group would put a bracket on screen the
        // student hasn't finished building.
        let answered = true;
        for (let k = 0; k < spec.slots; k++) {
            if (rstompEntries[barIndex * rstompSlotsPerBar + beat + k] == null) { answered = false; break; }
        }
        if (!answered) break;

        const digits = [];
        for (let k = 0; k < spec.slots; k++) digits.push(rstompLabels[beat + k]);
        // The student's own answer decides plain-vs-bracketed on the first
        // beat; the grouping comes from the written note. That keeps the row
        // honest to what they typed while still delineating the notation.
        if (rstompEntries[barIndex * rstompSlotsPerBar + beat] === 'play') {
            tokens.push({ text: digits[0], startBeat: beat, endBeat: beat, kind: 'play' });
            if (digits.length > 1) {
                tokens.push({ text: `(${digits.slice(1).join(' ')})`, startBeat: beat + 1, endBeat: beat + spec.slots - 1, kind: 'hold' });
            }
        } else {
            tokens.push({ text: `(${digits.join(' ')})`, startBeat: beat, endBeat: beat + spec.slots - 1, kind: spec.isRest ? 'rest' : 'hold' });
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
    let slot = 0;
    groups.forEach(group => {
        // A bracket just opened has no digits yet but must still show - the
        // whole point of the key is that opening one is a visible act.
        if (!group.digits.length && !group.bracketed) return;
        const span = Math.max(0, group.digits.length - 1);
        runs.push({
            text: rstompGroupText(group),
            bracketed: group.bracketed,
            empty: group.digits.length === 0,
            startSlot: slot,
            endSlot: slot + span,
            wrong: wrong.has(Math.floor(slot / rstompSlotsPerBar)) || wrong.has(Math.floor((slot + span) / rstompSlotsPerBar))
        });
        slot += group.digits.length;
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
            } else if (run.bracketed && !owner.isOnset) {
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
            return new VF.StaveNote({ clef: 'treble', keys: ['b/4'], duration: spec.isRest ? `${duration}r` : duration });
        });
        const meter = rstompVoiceMeter();
        const voice = new VF.Voice({ num_beats: meter.num, beat_value: meter.den }).addTickables(notes);
        new VF.Formatter().joinVoices([voice]).format([voice], perBarWidth - 60);
        voice.draw(context, stave);

        // Read back VexFlow's OWN rendered x for each note (getAbsoluteX) -
        // the real onset a Play token or a non-whole-bar Rest bracket
        // left-aligns to (see renderRstompCountingRow for the alignment
        // rules this layout serves). Already in the shared canvas's one
        // coordinate space (position's own x offset baked in), so a second
        // bar's positions need no further adjustment.
        const noteX = notes.map(note => note.getAbsoluteX());

        // The ideal, evenly-spaced slot grid (where the level's labels fall),
        // independent of where any glyph actually landed - this is what a
        // Hold-continuation bracket (no glyph of its own) centers across.
        const trueStartX = stave.getNoteStartX();
        const trueEndX = stave.getNoteEndX();
        const pulseX = slotFraction => trueStartX + (slotFraction / rstompSlotsPerBar) * (trueEndX - trueStartX);

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

    const svg = container.querySelector('svg');
    if (svg) svg.style.marginTop = '-30px';

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

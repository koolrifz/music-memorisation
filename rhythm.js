/* =========================================
   GAME 4: RHYTHM
   Counting round. Core premise (design brief §1): count *when the next
   note starts*, not "how long do I hold this." A beat is stamped as Play
   (a new onset), Hold (sustaining a previous onset), or Rest (silence -
   its own explicit stamp, no onset/continuation split since there's no
   sound to sustain).
   ========================================= */

const RHYTHM_PATTERNS = {
    'whole-note': ['play', 'hold', 'hold', 'hold'],
    'whole-rest': ['rest', 'rest', 'rest', 'rest'],
    'half-note': ['play', 'hold'],
    'half-rest': ['rest', 'rest'],
    'quarter-note': ['play'],
    'quarter-rest': ['rest'],
    // A half tied to a quarter, entirely inside one bar, engraves as a
    // single dotted half rather than two notes joined by a tie curve - the
    // student's input is unaffected either way: it's just an ordinary
    // 3-beat Hold-run (Play, Hold, Hold).
    'dotted-half-note': ['play', 'hold', 'hold'],
    'dotted-half-rest': ['rest', 'rest', 'rest'],
    // Quavers (eighth notes) are exactly one beat long, like a quarter -
    // but their single beat "slot" is an array of 2 sub-modes instead of
    // a plain string, matching how a subdivided beat is represented
    // everywhere else in this file (see buildRhythmPositions). Only the
    // combinations with two genuine attacks are offered: a beat split
    // Play+Hold would sound and count identically to an ordinary unsplit
    // quarter note, so it isn't a distinct pattern worth drilling.
    'two-quavers': [['play', 'play']],
    'quaver-rest-quaver': [['rest', 'play']],
    'quaver-quaver-rest': [['play', 'rest']]
};

// Each level's pool is whatever pattern keys are in play - the generator
// (buildRhythmBarShapes below) works out every way those patterns can be
// concatenated to fill a 4-beat bar, so a level can freely mix pattern
// lengths (e.g. Level 3 mixing 4-beat and 2-beat patterns) with no extra
// per-level bookkeeping. Counting rounds are untimed at every level - the
// bonus Performing round (after 3 correct Counting submissions) is where
// timing pressure lives instead.
//
// requireAnyOf (optional): for an "isolated" level introducing a new
// pattern that can't fill a bar by itself, the pool alone would also let
// the generator fall back to bars made entirely of the *other*, already-
// familiar pattern - technically valid, but pointless for a level whose
// whole point is drilling the new pattern. requireAnyOf rejects any bar
// shape that doesn't include at least one of the listed keys.
//
// maxAdjacentRestRun (optional, default 1): how many consecutive rest
// units are allowed before they must collapse into one longer rest (see
// the engraving-standards comment on buildRhythmUnitShapes below). Level 5
// deliberately raises this to 3, at Rob's request: with only quarter notes
// in play, he wants students to individually count up to three quarter
// rests in a row rather than have them silently reduce to a dotted-half
// rest - the level is specifically about *feeling* the beat through
// silence, one quarter at a time, sound or not. That's a one-level-only
// exception to normal engraving; every other level keeps the standard
// cap of 1.
//
// beatsPerBar (optional, default 4): how many beats fill one bar. Nothing
// sets this yet - every level so far is 4/4 - but the generator and
// renderer both read it rather than assuming 4, so a future 6/8-style
// level doesn't need this file rewritten, just a level entry with this
// field set.
//
// tieLevel / tieChance / tieTotal (optional): see generateRhythmPhraseWithTie.
const RHYTHM_LEVELS = [
    { id: '1', label: 'Level 1: Whole Notes and Rests', shortLabel: 'Whole Notes and Rests', pool: ['whole-note', 'whole-rest'] },
    { id: '2', label: 'Level 2: Half Notes and Rests', shortLabel: 'Half Notes and Rests', pool: ['half-note', 'half-rest'] },
    { id: '3', label: 'Level 3: Whole and Half Notes and Rests', shortLabel: 'Whole and Half Mixed', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'] },
    // Ties are introduced right after whole/half, before quarters even
    // exist - Rob's call: a tie is simply "how we make really long notes,"
    // so it belongs alongside the durations a student already knows, not
    // held back until every note value has been taught first. With only
    // whole/half in the pool, this naturally produces things like a half
    // tied to a half, or a whole tied to a half - already an 8-beat note
    // is possible if the dice land that way.
    { id: '4', label: 'Level 4: Ties Across the Barline', shortLabel: 'Ties Across the Barline', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'], tieLevel: true, tieChance: 1 },
    { id: '5', label: 'Level 5: Quarter Notes and Rests', shortLabel: 'Quarter Notes and Rests', pool: ['quarter-note', 'quarter-rest'], maxAdjacentRestRun: 3 },
    { id: '6', label: 'Level 6: Full Mix with Ties', shortLabel: 'Full Mix with Ties', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest'], tieLevel: true, tieChance: 0.5 },
    // "Exclusively" per Rob: every phrase here carries a tie (tieChance 1),
    // and tieTotal 3 constrains it to a quarter tied to a half (or half
    // tied to a quarter) - the tied-across-the-barline equivalent of a
    // dotted half. Intermingled with plain dotted-half/quarter bars in the
    // same phrase, so the same 3-beat duration shows up notated both ways
    // in quick succession - the whole point being to make it unmistakable
    // that a dotted half *is* a half plus a quarter, just spelled as one
    // notehead instead of two tied ones.
    { id: '7', label: 'Level 7: Dotted Half = Half + Quarter', shortLabel: 'Dotted Half = Half + Quarter', pool: ['dotted-half-note', 'dotted-half-rest', 'quarter-note', 'quarter-rest'], tieLevel: true, tieChance: 1, tieTotal: 3 },
    // Full mix of everything taught so far, with ties folded back in as
    // just one more occasional ingredient rather than the focus - Rob
    // wants a plain dotted half to still show up roughly 5x more often
    // than its tied equivalents (a dotted half tied to a quarter, or a
    // quarter tied to a half), so tieChance is deliberately low here.
    { id: '8', label: 'Level 8: Full Mix', shortLabel: 'Full Mix', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest', 'dotted-half-note', 'dotted-half-rest'], tieLevel: true, tieChance: 1 / 6 },
    // Quavers, isolated the same way every other new value has been:
    // against the simplest possible filler (quarter notes/rests, already
    // second nature by now), with requireAnyOf forcing every phrase to
    // actually contain at least one quaver pattern rather than letting the
    // generator fall back to an all-quarters bar.
    { id: '9', label: 'Level 9: Quavers (Eighth Notes)', shortLabel: 'Quavers', pool: ['quarter-note', 'quarter-rest', 'two-quavers', 'quaver-rest-quaver', 'quaver-quaver-rest'], requireAnyOf: ['two-quavers', 'quaver-rest-quaver', 'quaver-quaver-rest'] }
];

// Beats-in-a-run -> VexFlow duration string. 3 is a dotted half ('hd' -
// confirmed via a live VexFlow probe that 'hd'/'hdr' produce the correct
// 1.5x-half tick count; the more obvious-looking 'h.' is not valid VexFlow
// syntax). Cross-barline ties never need a run longer than 4: a tied note
// is always modeled as two ordinary notes, one on each side of the
// barline, connected by a drawn tie curve - never as one note object
// spanning more than a bar - so this map never needs an entry above 4.
// 0.5 (a single quaver) is the only fractional entry needed so far - a
// future triplet or semiquaver level will need 1/3 and 0.25 added here too.
const RHYTHM_DURATION_FOR_BEATS = { 0.5: '8', 1: 'q', 2: 'h', 3: 'hd', 4: 'w' };

let rhythmSelectedLevel = '1';
// 4 bars, each an array of beatsPerBar entries. A beat entry is either a
// plain mode string ('play'/'hold'/'rest' - undivided beat, the only kind
// any level generates today) or an array of mode strings (a beat split
// into that many equal sub-positions - not produced by any level yet, but
// every function below already reads either shape). See buildRhythmPositions.
let rhythmPhrase = [];
// Flat, in-order list of every stampable position in the current phrase -
// {barIndex, beatIndex, subIndex} per position, subIndex null for an
// undivided beat. rhythmEntries/rhythmCursor/rhythmUndoStack all index into
// this list rather than assuming a fixed beat count, so the same code
// handles a 4-beat bar of plain beats and a future bar mixing undivided
// and subdivided beats without special-casing.
let rhythmPositions = [];
let rhythmEntries = [];             // flat student entry array, parallel to rhythmPositions
let rhythmUndoStack = [];           // stack of stamped indices, for Undo
let rhythmCursor = 0;               // next unfilled index into rhythmPositions/rhythmEntries
let rhythmActiveMode = 'play';
let rhythmAttempt = 1;              // 1-3, submit attempts on the current phrase
let rhythmStreak = 0;               // consecutive correct Counting submissions
let rhythmScore = 0;
let rhythmLocked = false;           // true while a submit result is being shown
let rhythmRevealedBars = [];        // bars whose answer was auto-revealed after 3 fails

/* ---------- Persistence (same shape as the other three games) ---------- */

function getRhythmProgress() {
    const fallback = { unlockedStages: ['1'], stageProgress: {}, lastPosition: '1', totalPlays: 0 };
    try { return { ...fallback, ...JSON.parse(localStorage.getItem('koolRiffsRhythmProgress') || '{}') }; }
    catch (error) { return fallback; }
}

function saveRhythmProgress(progress) {
    localStorage.setItem('koolRiffsRhythmProgress', JSON.stringify(progress));
}

function recordRhythmLevelResult(isOfficialMastery) {
    const progress = getRhythmProgress();
    const stage = progress.stageProgress[rhythmSelectedLevel] || { bestScore: 0, bestTimeSec: null, timesPlayed: 0, cleared: false };
    stage.timesPlayed++;
    stage.lastPlayed = new Date().toISOString().slice(0, 10);
    stage.bestScore = Math.max(stage.bestScore || 0, Math.round(rhythmScore));
    stage.cleared = stage.cleared || isOfficialMastery;
    progress.stageProgress[rhythmSelectedLevel] = stage;
    progress.totalPlays = (progress.totalPlays || 0) + 1;
    const currentIndex = RHYTHM_LEVELS.findIndex(level => level.id === rhythmSelectedLevel);
    const nextLevel = RHYTHM_LEVELS[currentIndex + 1];
    if (isOfficialMastery && nextLevel && !progress.unlockedStages.includes(nextLevel.id)) progress.unlockedStages.push(nextLevel.id);
    saveRhythmProgress(progress);
}

/* ---------- Pathway screen ---------- */

function renderRhythmPathway() {
    const progress = getRhythmProgress();
    const unlocked = new Set(progress.unlockedStages || ['1']);
    const track = document.getElementById('rhythm-pathway-track');
    if (!track) return;
    track.innerHTML = '';
    let recommended = progress.lastPosition || '1';
    if (!unlocked.has(recommended)) recommended = [...unlocked][unlocked.size - 1];
    rhythmSelectedLevel = recommended;
    RHYTHM_LEVELS.forEach((level, index) => {
        const isUnlocked = unlocked.has(level.id);
        const record = progress.stageProgress?.[level.id];
        const node = document.createElement('button');
        node.className = `pathway-node${isUnlocked ? ' unlocked' : ' locked'}${level.id === recommended ? ' recommended' : ''}${record?.cleared ? ' cleared' : ''}`;
        node.disabled = !isUnlocked;
        node.innerHTML = `<span class="pathway-node-icon">${isUnlocked ? index + 1 : '•'}</span>${isUnlocked ? `<span class="pathway-node-label">${level.shortLabel}</span>${record?.bestScore != null ? `<small>${Math.round(record.bestScore)} pts</small>` : ''}` : ''}`;
        if (isUnlocked) node.onclick = () => selectRhythmLevel(level.id);
        track.appendChild(node);
    });
    selectRhythmLevel(rhythmSelectedLevel, false);
}

function selectRhythmLevel(levelId, rerender = true) {
    const progress = getRhythmProgress();
    if (!(progress.unlockedStages || []).includes(levelId)) return;
    rhythmSelectedLevel = levelId;
    progress.lastPosition = levelId;
    saveRhythmProgress(progress);
    if (rerender) renderRhythmPathway();
    const startButton = document.getElementById('rhythm-pathway-start');
    if (startButton) {
        startButton.disabled = false;
        startButton.innerText = `Start ${RHYTHM_LEVELS.find(level => level.id === levelId).shortLabel}`;
    }
}

function startSelectedRhythmLevel() {
    startRhythmLevel();
}

function handleRhythmBackButton() {
    const activeScreen = document.querySelector('#view-rhythm .screen.active');
    if (activeScreen && activeScreen.id === 'rhythm-screen-counting') {
        renderRhythmPathway();
        switchScreenState('rhythm', 'rhythm-screen-pathway');
    } else {
        launchGame('view-dashboard');
    }
}

/* ---------- Phrase generator ---------- */

// Builds every full-bar "shape" a level can produce: every way to
// concatenate the level's pool patterns so their beat-lengths sum to
// exactly 4 (a full bar). A pool mixing lengths - e.g. Level 3's whole
// (4-beat) and half (2-beat) patterns together - naturally yields both
// single-pattern and multi-pattern shapes with no extra bookkeeping.
//
// Two adjacent rest-units - of any lengths, not just matching ones - always
// collapse into one longer rest in real notation, since Rest has no onset
// marker to tell them apart. Generalized: it's the same engraving
// principle whether the two units happen to match, like quarter+quarter or
// half+half, or don't, like half+quarter once a level mixes lengths in one
// bar. A shape with just one unit (like the level's own whole-rest) has no
// adjacent pair to violate, so it's naturally unaffected. restRunCap lifts
// this for a specific level (see the maxAdjacentRestRun comment above
// RHYTHM_LEVELS) - default 1 means "no two rest units may ever sit next to
// each other," matching standard notation everywhere except that one
// deliberate exception.
//
// Every way to concatenate pool patterns so their beat-lengths sum to
// exactly targetBeats (not hardcoded to a full 4-beat bar - the cross-
// barline tie generator below reuses this at shorter targets to fill the
// beats on either side of a tied note within a single bar).
function buildRhythmUnitShapes(pool, targetBeats, restRunCap = 1) {
    const results = [];
    (function build(remainingBeats, shape) {
        if (remainingBeats === 0) { results.push(shape); return; }
        pool.forEach(key => {
            const length = RHYTHM_PATTERNS[key].length;
            if (length <= remainingBeats) build(remainingBeats - length, [...shape, key]);
        });
    })(targetBeats, []);
    const isRestPattern = key => RHYTHM_PATTERNS[key].every(mode => mode === 'rest');
    const exceedsRestRunCap = shape => {
        let run = 0;
        for (const key of shape) {
            run = isRestPattern(key) ? run + 1 : 0;
            if (run > restRunCap) return true;
        }
        return false;
    };
    return results.filter(shape => !exceedsRestRunCap(shape));
}

function buildRhythmBarShapes(level) {
    let shapes = buildRhythmUnitShapes(level.pool, level.beatsPerBar || 4, level.maxAdjacentRestRun || 1);
    if (level.requireAnyOf) shapes = shapes.filter(shape => shape.some(key => level.requireAnyOf.includes(key)));
    return shapes;
}

function generateRhythmPhrase(levelId) {
    const level = RHYTHM_LEVELS.find(entry => entry.id === levelId);
    return level.tieLevel ? generateRhythmPhraseWithTie(level) : generateRhythmPhraseNormal(level);
}

// Variety rule (design brief §5 item 15, proposed default): no bar shape
// repeats more than twice across the 4 bars, no bar identical to the one
// immediately before it.
function generateRhythmPhraseNormal(level) {
    const shapes = buildRhythmBarShapes(level);
    const counts = new Array(shapes.length).fill(0);
    const chosenIndices = [];
    for (let i = 0; i < 4; i++) {
        const allIndices = shapes.map((_, index) => index);
        let candidates = allIndices.filter(index => counts[index] < 2 && index !== chosenIndices[i - 1]);
        if (candidates.length === 0) candidates = allIndices.filter(index => index !== chosenIndices[i - 1]);
        if (candidates.length === 0) candidates = allIndices;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        chosenIndices.push(chosen);
        counts[chosen]++;
    }
    return chosenIndices.map(index => shapes[index].flatMap(key => RHYTHM_PATTERNS[key]));
}

// A tied note is split across the bar 0/1 or bar 2/3 boundary (never the
// bar 1/2 boundary - see the row-grouping comment above renderRhythmBars:
// portrait splits bars into [0,1] and [2,3] rows, so a tie can only ever
// be drawn within one of those pairs, never across them). r beats of the
// tied note sit at the end of the first bar (a Play plus r-1 Holds), s
// beats sit at the start of the second bar as pure Hold - no onset there,
// since it's the same note continuing, not a new attack. That leading
// Hold-with-no-Play is exactly how a fresh bar's content is told apart
// from a tie continuation elsewhere in this file (see the tie-drawing
// comment in renderRhythmRowStaff). The remaining beats in each bar
// (4-r and 4-s) are filled with ordinary pool content, same as any other
// bar - which also means r/s themselves have to be beat-counts the pool
// can actually fill the *rest* of the bar with (e.g. Level 4's whole/half
// pool can't leave a 1 or 3-beat remainder, since neither is buildable
// without a quarter in play - r/s are only ever picked from beat-counts
// that leave a buildable remainder). tieTotal (optional) further pins
// r+s to an exact combined duration - see the Level 7 comment above
// RHYTHM_LEVELS, which uses it to force specifically a quarter tied to a
// half (or half tied to a quarter).
function generateRhythmPhraseWithTie(level) {
    const includesTie = Math.random() < (level.tieChance != null ? level.tieChance : 1);
    if (!includesTie) return generateRhythmPhraseNormal(level);

    const pool = level.pool;
    const cap = level.maxAdjacentRestRun || 1;
    const beatsPerBar = level.beatsPerBar || 4;
    const candidateRuns = [];
    for (let n = 1; n <= beatsPerBar; n++) {
        if (buildRhythmUnitShapes(pool, beatsPerBar - n, cap).length > 0) candidateRuns.push(n);
    }
    const rsPairs = [];
    candidateRuns.forEach(r => candidateRuns.forEach(s => {
        if (!level.tieTotal || r + s === level.tieTotal) rsPairs.push([r, s]);
    }));
    const [r, s] = rsPairs[Math.floor(Math.random() * rsPairs.length)];

    const leadShapes = buildRhythmUnitShapes(pool, beatsPerBar - r, cap);
    const tailShapes = buildRhythmUnitShapes(pool, beatsPerBar - s, cap);
    const leadShape = leadShapes[Math.floor(Math.random() * leadShapes.length)];
    const tailShape = tailShapes[Math.floor(Math.random() * tailShapes.length)];

    const barA = [...leadShape.flatMap(key => RHYTHM_PATTERNS[key]), 'play', ...Array(r - 1).fill('hold')];
    const barB = [...Array(s).fill('hold'), ...tailShape.flatMap(key => RHYTHM_PATTERNS[key])];

    const tiedPairIndex = Math.random() < 0.5 ? 0 : 1;
    const normalShapes = buildRhythmBarShapes(level);
    const pickNormalShape = previousShape => {
        const candidates = normalShapes.filter(shape => shape.join() !== (previousShape || []).join());
        const options = candidates.length ? candidates : normalShapes;
        return options[Math.floor(Math.random() * options.length)];
    };
    const normalShape1 = pickNormalShape(null);
    const normalShape2 = pickNormalShape(normalShape1);
    const normalBar1 = normalShape1.flatMap(key => RHYTHM_PATTERNS[key]);
    const normalBar2 = normalShape2.flatMap(key => RHYTHM_PATTERNS[key]);

    return tiedPairIndex === 0 ? [barA, barB, normalBar1, normalBar2] : [normalBar1, normalBar2, barA, barB];
}

/* ---------- Beat positions (flattens phrase -> a stampable, indexable list) ---------- */

// Turns rhythmPhrase into the flat rhythmPositions list described above -
// one entry per stampable spot, in playback order. Called once per new
// phrase; everything else (stamping, undo, grading, the number row, the
// keyboard) reads this list instead of assuming a fixed beat count.
function buildRhythmPositions(phrase, beatsPerBar) {
    const positions = [];
    phrase.forEach((bar, barIndex) => {
        for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
            const beat = bar[beatIndex];
            if (Array.isArray(beat)) {
                beat.forEach((_, subIndex) => positions.push({ barIndex, beatIndex, subIndex }));
            } else {
                positions.push({ barIndex, beatIndex, subIndex: null });
            }
        }
    });
    return positions;
}

function rhythmExpectedModeAt(position) {
    const beat = rhythmPhrase[position.barIndex][position.beatIndex];
    return position.subIndex === null ? beat : beat[position.subIndex];
}

// Index into rhythmPositions/rhythmEntries for a given (bar, beat, sub) -
// -1 if no such position exists in the current phrase. subIndex must be
// null for an undivided beat, matching how buildRhythmPositions tagged it.
function rhythmPositionIndex(barIndex, beatIndex, subIndex) {
    return rhythmPositions.findIndex(position =>
        position.barIndex === barIndex && position.beatIndex === beatIndex && position.subIndex === subIndex);
}

// Rob's counting syllables (his own system, not a generic textbook one -
// see the rhythm-counting-syllables note): a beat's own number for its
// first sub-position, then "+" at 2-way (a plain "old-fashioned" plus
// sign, deliberately not "&" - easier to teach), "+ a" at 3-way
// (simple-time triplet / a compound beat's natural three-way split),
// "e + a" at 4-way (semiquavers). No level generates a 3-way or 4-way
// split yet - only the beatIndex-based first-position and 2-way "+" case
// is actually reachable today - but the labels are correct now rather
// than left as a guess for whenever triplets/semiquavers do arrive.
function rhythmSubdivisionLabel(beatIndex, subIndex, subCount) {
    if (subIndex === 0) return String(beatIndex + 1);
    if (subCount === 2) return '+';
    if (subCount === 3) return subIndex === 1 ? '+' : 'a';
    if (subCount === 4) return ['', 'e', '+', 'a'][subIndex];
    return '+';
}

// Inverse of rhythmSubdivisionLabel for the fixed "e / + / a" slot order -
// which sub-index (if any) a given slot maps to for a beat with this many
// sub-positions. null means that slot isn't used at this subdivision level
// (e.g. "e" is unused for a 2-way quaver split) and should stay reserved-
// but-invisible rather than removed, so the subdivision row's layout never
// reflows as different beats' subdivision levels come and go.
function rhythmSubdivisionSlotIndex(slotLabel, subCount) {
    if (subCount === 2) return slotLabel === '+' ? 1 : null;
    if (subCount === 3) return slotLabel === '+' ? 1 : slotLabel === 'a' ? 2 : null;
    if (subCount === 4) return slotLabel === 'e' ? 1 : slotLabel === '+' ? 2 : slotLabel === 'a' ? 3 : null;
    return null;
}

/* ---------- Round lifecycle ---------- */

function startRhythmLevel() {
    initAudio();
    rhythmAttempt = 1;
    rhythmStreak = 0;
    rhythmScore = 0;
    rhythmLocked = false;
    setupRhythmOrientationListener();
    setupRhythmKeyboardListener();
    switchScreenState('rhythm', 'rhythm-screen-counting');
    document.getElementById('rhythm-level-label').innerText = RHYTHM_LEVELS.find(level => level.id === rhythmSelectedLevel).label;
    setRhythmMode('play');
    updateRhythmStreakDots();
    startNewRhythmPhrase();
}

function startNewRhythmPhrase() {
    const level = RHYTHM_LEVELS.find(entry => entry.id === rhythmSelectedLevel);
    rhythmPhrase = generateRhythmPhrase(rhythmSelectedLevel);
    rhythmPositions = buildRhythmPositions(rhythmPhrase, level.beatsPerBar || 4);
    rhythmEntries = new Array(rhythmPositions.length).fill(null);
    rhythmUndoStack = [];
    rhythmCursor = 0;
    rhythmRevealedBars = [];
    hideRhythmFeedback();
    renderRhythmBars();
    updateRhythmNumberRow();
    updateRhythmSubmitButtonState();
}

/* ---------- Mode + stamp interaction (design brief §3) ---------- */

function setRhythmMode(mode) {
    if (rhythmLocked) return;
    rhythmActiveMode = mode;
    document.querySelectorAll('.rhythm-mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
}

function stampRhythmBeat() {
    if (rhythmLocked || rhythmCursor >= rhythmPositions.length) return;
    rhythmEntries[rhythmCursor] = rhythmActiveMode;
    rhythmUndoStack.push(rhythmCursor);
    recalcRhythmCursor();
    renderRhythmBars();
    updateRhythmNumberRow();
    updateRhythmSubmitButtonState();
}

function undoRhythmStamp() {
    if (rhythmLocked || rhythmUndoStack.length === 0) return;
    const index = rhythmUndoStack.pop();
    rhythmEntries[index] = null;
    recalcRhythmCursor();
    renderRhythmBars();
    updateRhythmNumberRow();
    updateRhythmSubmitButtonState();
}

function recalcRhythmCursor() {
    const nextNull = rhythmEntries.findIndex(value => value === null);
    rhythmCursor = nextNull === -1 ? rhythmPositions.length : nextNull;
}

function clearRhythmBars(barIndices) {
    const barSet = new Set(barIndices);
    const clearedIndices = new Set();
    rhythmPositions.forEach((position, index) => {
        if (!barSet.has(position.barIndex)) return;
        rhythmEntries[index] = null;
        clearedIndices.add(index);
    });
    rhythmUndoStack = rhythmUndoStack.filter(index => !clearedIndices.has(index));
    recalcRhythmCursor();
}

function updateRhythmSubmitButtonState() {
    document.getElementById('rhythm-submit-button').disabled = rhythmCursor < rhythmPositions.length;
}

// Renders the current bar's tap targets as two separate, fixed-shape rows
// rather than one row whose button count changes with subdivision (which
// used to crowd and wrap on a narrow phone - see design note below).
//
// Row 1 (#rhythm-number-row): always exactly beatsPerBar buttons, one per
// beat, in beat order - "the beats are always the beats." Tapping one
// stamps that beat's own first sub-position (its onset) - its only
// position, for an ordinary undivided beat.
//
// Row 2 (#rhythm-subdivision-row): always exactly 3 buttons in fixed
// "e / + / a" order (Rob's syllables - see rhythmSubdivisionLabel), for
// whichever beat currently owns the cursor. A slot this beat's own
// subdivision doesn't use (e.g. "e" for a 2-way quaver split) stays in
// place but invisible, at Rob's request, rather than grayed out or
// removed - removing it would make the row's width/position shift
// depending on which beat is active, and graying it out still crowds the
// row with dead controls that are never going to light up this level.
function updateRhythmNumberRow() {
    const row = document.getElementById('rhythm-number-row');
    const subRow = document.getElementById('rhythm-subdivision-row');
    row.innerHTML = '';
    const level = RHYTHM_LEVELS.find(entry => entry.id === rhythmSelectedLevel);
    const beatsPerBar = level.beatsPerBar || 4;
    const lastPosition = rhythmPositions[Math.min(rhythmCursor, rhythmPositions.length - 1)];
    const activeBar = lastPosition ? lastPosition.barIndex : 0;
    const activeBeatIndex = lastPosition ? lastPosition.beatIndex : 0;

    for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
        const beat = rhythmPhrase[activeBar]?.[beatIndex];
        const onsetPosIndex = rhythmPositionIndex(activeBar, beatIndex, Array.isArray(beat) ? 0 : null);
        const btn = document.createElement('button');
        btn.className = 'rhythm-number-btn';
        btn.innerText = beatIndex + 1;
        const entered = onsetPosIndex !== -1 ? rhythmEntries[onsetPosIndex] : null;
        if (entered) btn.classList.add(`filled-${entered}`);
        if (onsetPosIndex === rhythmCursor) {
            btn.classList.add('next');
            btn.onclick = stampRhythmBeat;
        } else {
            btn.disabled = true;
        }
        row.appendChild(btn);
    }

    if (!subRow) return;
    subRow.innerHTML = '';
    const activeBeat = rhythmPhrase[activeBar]?.[activeBeatIndex];
    const subCount = Array.isArray(activeBeat) ? activeBeat.length : 1;
    ['e', '+', 'a'].forEach(slotLabel => {
        const btn = document.createElement('button');
        btn.className = 'rhythm-subdivision-btn';
        btn.innerText = slotLabel;
        const subIndex = rhythmSubdivisionSlotIndex(slotLabel, subCount);
        if (subIndex === null) {
            btn.classList.add('unused');
            btn.disabled = true;
            subRow.appendChild(btn);
            return;
        }
        const posIndex = rhythmPositionIndex(activeBar, activeBeatIndex, subIndex);
        const entered = posIndex !== -1 ? rhythmEntries[posIndex] : null;
        if (entered) btn.classList.add(`filled-${entered}`);
        if (posIndex === rhythmCursor) {
            btn.classList.add('next');
            btn.onclick = stampRhythmBeat;
        } else {
            btn.disabled = true;
        }
        subRow.appendChild(btn);
    });
}

/* ---------- Rendering (beat-strip + VexFlow staff per row of bars) ---------- */

// Bars are grouped into "rows" that each share one VexFlow canvas - 1 row
// of 4 in landscape, 2 rows of 2 in portrait - so that a cross-barline tie
// (Level 8+) can be drawn as a real connecting curve between two adjacent
// bars' noteheads, which is only possible when both sides of the tie live
// in the same SVG. The bar-2/bar-3 boundary is deliberately never a tie
// point (see generateRhythmPhrase) specifically because portrait splits
// there into two separate rows/canvases - a tie can't be drawn across that
// split, and the generated content has to be identical in both
// orientations (design brief §5 item 3), so that boundary just never
// carries one.
function renderRhythmBars() {
    const container = document.getElementById('rhythm-bars-container');
    if (!container) return;
    container.innerHTML = '';
    const level = RHYTHM_LEVELS.find(entry => entry.id === rhythmSelectedLevel);
    const beatsPerBar = level.beatsPerBar || 4;
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    container.classList.toggle('portrait-layout', !isLandscape);
    const isComplete = rhythmCursor >= rhythmPositions.length;
    const activeBar = isComplete ? -1 : rhythmPositions[rhythmCursor].barIndex;
    const rows = isLandscape ? [[0, 1, 2, 3]] : [[0, 1], [2, 3]];

    rows.forEach(barIndices => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'rhythm-notation-row';

        const staffDiv = document.createElement('div');
        staffDiv.className = 'rhythm-row-staff';
        rowDiv.appendChild(staffDiv);

        const stripRow = document.createElement('div');
        stripRow.className = 'rhythm-beat-strip-row';
        barIndices.forEach(barIndex => {
            const stripDiv = document.createElement('div');
            stripDiv.className = `rhythm-beat-strip-group${barIndex === activeBar ? ' active' : ''}`;
            for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
                const beat = rhythmPhrase[barIndex][beatIndex];
                const subCount = Array.isArray(beat) ? beat.length : 1;
                const beatWrap = document.createElement('span');
                beatWrap.className = 'rhythm-beat-cell-wrap';
                for (let subIndex = 0; subIndex < subCount; subIndex++) {
                    const posIndex = rhythmPositionIndex(barIndex, beatIndex, subCount > 1 ? subIndex : null);
                    const cell = document.createElement('span');
                    cell.className = subCount > 1 ? 'rhythm-beat-cell rhythm-beat-cell-half' : 'rhythm-beat-cell';
                    const mode = rhythmEntries[posIndex];
                    if (mode) cell.classList.add(`filled-${mode}`);
                    if (rhythmRevealedBars.includes(barIndex)) cell.classList.add('reveal-answer');
                    cell.innerText = rhythmSubdivisionLabel(beatIndex, subIndex, subCount);
                    beatWrap.appendChild(cell);
                }
                stripDiv.appendChild(beatWrap);
            }
            stripRow.appendChild(stripDiv);
        });
        rowDiv.appendChild(stripRow);

        container.appendChild(rowDiv);
        // The staff always shows the generated phrase, not the student's
        // stamped answer - this is a sight-count exercise (read the printed
        // rhythm, correctly label each beat Play/Hold/Rest), not a hidden-
        // phrase dictation, so the notation must be visible from the moment
        // the phrase is generated. rhythmEntries only drives the beat-strip
        // colors above and the number-row buttons - never the notation.
        renderRhythmRowStaff(staffDiv, barIndices, activeBar, beatsPerBar);
    });
}

// Converts a bar's beat pattern into note/rest specs: a Play followed by
// N Holds is one sustained note of duration N+1; a contiguous Rest run is
// one rest of that duration (rests have no onset/continuation split - see
// design brief §2/§3).
//
// A subdivided beat (an array entry, e.g. two eighths) always contributes
// exactly one spec per sub-position, never merged with its neighbour -
// unlike a run of whole beats, two adjacent Plays within one beat are two
// separate onsets (e.g. "ti-ti"), not a sustain, so there's nothing to
// run-length-encode there. beamGroup tags every sub-position from the same
// beat with a shared key so the renderer can beam actual onsets together
// (see renderRhythmRowStaff) while leaving a lone eighth next to a rest to
// carry its own flag, same as normal engraving. A subdivided beat's own
// first sub-position is never 'hold' (see RHYTHM_PATTERNS), so it always
// starts a fresh spec rather than ever being absorbed into a preceding run.
function renderRhythmBeatsToNotes(entries) {
    const notes = [];
    let i = 0;
    while (i < entries.length) {
        const beat = entries[i];
        if (Array.isArray(beat)) {
            const beamGroup = `beat-${i}`;
            beat.forEach(mode => notes.push({ beats: 1 / beat.length, isRest: mode === 'rest', beamGroup }));
            i += 1;
            continue;
        }
        const mode = beat;
        const isRest = mode === 'rest';
        const continuesAs = isRest ? 'rest' : 'hold';
        let run = 1;
        while (i + run < entries.length && entries[i + run] === continuesAs) run++;
        notes.push({ beats: run, isRest, beamGroup: null });
        i += run;
    }
    return notes;
}

// Rhythm doesn't care about pitch - only when a note starts - so the staff
// is a single rhythm line with no clef, matching standard percussion/rhythm
// notation. Notes still carry an internal treble-clef position (keys:
// ['b/4']) so VexFlow's y-coordinate math is unchanged from a normal 5-line
// stave - setConfigForLines then hides every line except the one that
// position actually sits on, rather than using num_lines (which redraws a
// reduced stave but keeps the *full* 5-line coordinate space internally, so
// a note at 'b/4' - the middle line - ends up positioned below the visible
// canvas entirely). Nothing about the clef itself is ever drawn.
//
// All bars in barIndices share one VexFlow canvas/context (not one each) -
// required so a cross-barline tie can be drawn as a real curve from a
// notehead in one stave to a notehead in the next.
function renderRhythmRowStaff(container, barIndices, activeBarIndex, beatsPerBar) {
    container.innerHTML = '';
    const VF = Vex.Flow;
    const totalWidth = Math.max(120 * barIndices.length, container.clientWidth || (140 * barIndices.length));
    const barWidth = totalWidth / barIndices.length;
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(totalWidth, 180);
    const context = renderer.getContext();

    const barsRendered = barIndices.map((barIndex, position) => {
        const isLastInRow = position === barIndices.length - 1;
        const x = 4 + position * barWidth;
        const stave = new VF.Stave(x, 70, barWidth - (isLastInRow ? 8 : 0));
        stave.setConfigForLines([
            { visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false }
        ]);
        // The visible line defaults to VexFlow's mid-gray (#999) - force it
        // to real black for the printed-page look. Barlines are hardcoded
        // black by VexFlow already, independent of this.
        stave.setStyle({ strokeStyle: '#000000' });

        if (barIndex === activeBarIndex) {
            context.save();
            context.setFillStyle('rgba(255,200,0,0.14)');
            context.fillRect(x, 0, barWidth, 180);
            context.restore();
        }

        stave.setContext(context).draw();

        // Real notation reads black regardless of Play/Hold/Rest - color
        // only ever appears on the beat-strip and number-row buttons, which
        // show the student's own answer, not on the printed rhythm itself.
        const entries = rhythmPhrase[barIndex];
        const notesSpec = renderRhythmBeatsToNotes(entries);
        const staveNotes = notesSpec.map(spec => {
            const duration = RHYTHM_DURATION_FOR_BEATS[spec.beats];
            if (!duration) { console.warn(`Rhythm: no duration mapping for a ${spec.beats}-beat run yet (ties not built).`); return null; }
            const note = new VF.StaveNote({ clef: 'treble', keys: ['b/4'], duration: spec.isRest ? `${duration}r` : duration });
            // VexFlow's 'd' duration suffix (dotted half etc.) sizes the
            // note correctly for beat math but doesn't draw the dot glyph
            // on its own - confirmed via a live probe that addDotToAll()
            // is needed, or a dotted half renders visually identical to a
            // plain half.
            if (duration.includes('d')) note.addDotToAll();
            return note;
        }).filter(Boolean);
        if (staveNotes.length === notesSpec.length) {
            const voice = new VF.Voice({ num_beats: beatsPerBar, beat_value: 4 }).addTickables(staveNotes);
            new VF.Formatter().joinVoices([voice]).format([voice], Math.max(40, barWidth - 50));

            // VexFlow's own justify formatting has a confirmed bug (tested
            // directly against the library, not just our usage of it): in
            // a single unbeamed voice, a short note immediately followed
            // by a much longer one gets squashed together near the start
            // instead of spaced by duration, leaving the rest of the bar
            // blank. Overriding each note's tick-context X with our own
            // beats-cumulative proportional position - using the exact
            // same beat data that built these notes in the first place -
            // sidesteps it entirely and gives mathematically exact
            // proportional spacing in every case, not just the ones
            // VexFlow happened to get right on its own.
            // getNoteStartX()/getNoteEndX() are absolute canvas coordinates
            // (they already bake in this stave's own X offset), but
            // TickContext.setX() apparently expects a value relative to the
            // stave - confirmed via a live probe that using the absolute
            // value directly double-counts the stave's offset, which is
            // invisible with a single stave near canvas origin but throws
            // every bar after the first wildly off to the right once
            // multiple staves share a canvas at increasing X offsets.
            const startX = stave.getNoteStartX() - stave.getX();
            const endX = stave.getNoteEndX() - stave.getX();
            let cumulativeBeats = 0;
            staveNotes.forEach((note, index) => {
                note.getTickContext().setX(startX + (cumulativeBeats / beatsPerBar) * (endX - startX));
                cumulativeBeats += notesSpec[index].beats;
            });

            // Beam actual onsets from the same subdivided beat together
            // (e.g. two quavers) - a lone quaver next to a rest has nothing
            // to beam to and keeps its own flag, same as normal engraving.
            // VF.Beam has to be constructed before voice.draw() - the
            // constructor is what marks its notes as beamed so they skip
            // drawing their own individual flag - but drawn after, same as
            // the tie below.
            const beamGroups = {};
            notesSpec.forEach((spec, index) => {
                if (!spec.beamGroup || spec.isRest) return;
                (beamGroups[spec.beamGroup] = beamGroups[spec.beamGroup] || []).push(staveNotes[index]);
            });
            const beams = Object.values(beamGroups).filter(group => group.length > 1).map(group => new VF.Beam(group));

            voice.draw(context, stave);
            beams.forEach(beam => beam.setContext(context).draw());
        }
        return { barIndex, entries, staveNotes };
    });

    // Cross-barline ties (Level 8+): a fresh bar's own generated content
    // never opens on a Hold (every pool pattern starts with a Play or a
    // Rest - see RHYTHM_PATTERNS) - so a bar whose entries[0] is 'hold' can
    // only mean one thing: the note tied over from the previous bar in this
    // same row (see generateRhythmPhraseWithTie). Draw the actual curved
    // tie connecting that previous bar's last notehead to this bar's first
    // notehead - now possible because both bars share one context/canvas.
    barsRendered.forEach((bar, position) => {
        if (position === 0 || bar.entries[0] !== 'hold') return;
        const previous = barsRendered[position - 1];
        const lastNote = previous.staveNotes[previous.staveNotes.length - 1];
        const firstNote = bar.staveNotes[0];
        if (!lastNote || !firstNote) return;
        new VF.StaveTie({ first_note: lastNote, last_note: firstNote, first_indices: [0], last_indices: [0] }).setContext(context).draw();
    });

    // The stave math above is untouched 5-line positioning (so 'b/4' keeps
    // landing correctly) - only one line is drawn, but the canvas still
    // reserves room for the other four, plus headroom for stems/rests above
    // and below the line. Crop the display down to just that band via the
    // container's fixed height + overflow, so no vertical space goes to
    // waste on blank canvas that VexFlow doesn't draw into.
    const svg = container.querySelector('svg');
    if (svg) svg.style.marginTop = '-90px';
}

function setupRhythmOrientationListener() {
    if (window.__rhythmOrientationListenerAdded) return;
    window.__rhythmOrientationListenerAdded = true;
    window.matchMedia('(orientation: landscape)').addEventListener('change', () => {
        const countingScreen = document.getElementById('rhythm-screen-counting');
        if (countingScreen && countingScreen.classList.contains('active')) renderRhythmBars();
    });
}

// Keyboard controls for Chromebook/laptop play alongside touch: number
// keys stamp the current beat (matching the number already on screen) -
// including for the *second* tap of a subdivided beat, since the beat
// keeps the same digit for both its sub-positions and the cursor is what
// actually tracks which sub-position is next. Space always stamps
// whatever's next regardless of digit, doubling as a dedicated "&" key for
// a subdivided beat's later sub-positions (the thumb-button case). Z/X/C
// pick Play/Hold/Rest, Backspace undoes, Enter submits. Only live while
// the Counting screen is actually showing, so these keys don't leak into
// any other game.
function setupRhythmKeyboardListener() {
    if (window.__rhythmKeyboardListenerAdded) return;
    window.__rhythmKeyboardListenerAdded = true;
    window.addEventListener('keydown', (event) => {
        const countingScreen = document.getElementById('rhythm-screen-counting');
        if (!countingScreen || !countingScreen.classList.contains('active')) return;
        const key = event.key;
        if (key >= '1' && key <= '9') {
            if (rhythmCursor < rhythmPositions.length) {
                const expectedDigit = rhythmPositions[rhythmCursor].beatIndex + 1;
                if (Number(key) === expectedDigit) {
                    event.preventDefault();
                    stampRhythmBeat();
                }
            }
        } else if (key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            stampRhythmBeat();
        } else if (key === 'z' || key === 'Z') {
            setRhythmMode('play');
        } else if (key === 'x' || key === 'X') {
            setRhythmMode('hold');
        } else if (key === 'c' || key === 'C') {
            setRhythmMode('rest');
        } else if (key === 'Backspace') {
            event.preventDefault();
            undoRhythmStamp();
        } else if (key === 'Enter') {
            event.preventDefault();
            submitRhythmPhrase();
        }
    });
}

/* ---------- Streak + feedback ---------- */

function updateRhythmStreakDots() {
    const dots = [0, 1, 2].map(index =>
        `<span class="streak-dot${index < rhythmStreak ? ' active' : ''}" aria-hidden="true"></span>`
    ).join('');
    document.getElementById('rhythm-streak-dots').innerHTML = dots;
}

function showRhythmFeedback(kind, text) {
    const el = document.getElementById('rhythm-feedback');
    el.textContent = text;
    el.className = `rhythm-feedback ${kind}`;
    el.hidden = false;
}

function hideRhythmFeedback() {
    const el = document.getElementById('rhythm-feedback');
    el.hidden = true;
}

/* ---------- Submit + grading (design brief §3a) ---------- */

function submitRhythmPhrase() {
    if (rhythmLocked || rhythmCursor < rhythmPositions.length) return;
    rhythmLocked = true;
    const wrongBarsSet = new Set();
    rhythmPositions.forEach((position, index) => {
        if (rhythmEntries[index] !== rhythmExpectedModeAt(position)) wrongBarsSet.add(position.barIndex);
    });
    const wrongBars = [...wrongBarsSet].sort((a, b) => a - b);
    if (wrongBars.length === 0) handleRhythmSuccess();
    else handleRhythmFailure(wrongBars);
}

function handleRhythmSuccess() {
    playSound('correct');
    rhythmScore += 4;
    rhythmStreak++;
    updateRhythmStreakDots();
    showRhythmFeedback('correct', 'Nailed it! +4');
    if (rhythmStreak >= 3) {
        setTimeout(showRhythmLevelComplete, 800);
    } else {
        setTimeout(() => { rhythmAttempt = 1; rhythmLocked = false; startNewRhythmPhrase(); }, 1000);
    }
}

// Attempts 1-2: wrong bars are cleared for re-entry, correct bars stay as
// the student left them - "no forced redo" per §3a. Attempt 3: the correct
// answer is revealed on the wrong bars and the streak resets, since this
// phrase didn't end in a genuine correct Counting submission.
function handleRhythmFailure(wrongBars) {
    playSound('wrong');
    if (rhythmAttempt < 3) {
        rhythmAttempt++;
        showRhythmFeedback('wrong', `Bar${wrongBars.length > 1 ? 's' : ''} ${wrongBars.map(index => index + 1).join(', ')} - try again (attempt ${rhythmAttempt} of 3).`);
        setTimeout(() => {
            clearRhythmBars(wrongBars);
            renderRhythmBars();
            updateRhythmNumberRow();
            updateRhythmSubmitButtonState();
            hideRhythmFeedback();
            rhythmLocked = false;
        }, 1400);
    } else {
        showRhythmFeedback('wrong', "Here's the correct answer - new phrase next.");
        rhythmRevealedBars = wrongBars;
        const wrongBarSet = new Set(wrongBars);
        rhythmPositions.forEach((position, index) => {
            if (wrongBarSet.has(position.barIndex)) rhythmEntries[index] = rhythmExpectedModeAt(position);
        });
        renderRhythmBars();
        rhythmStreak = 0;
        updateRhythmStreakDots();
        setTimeout(() => { rhythmAttempt = 1; rhythmLocked = false; startNewRhythmPhrase(); }, 2200);
    }
}

function showRhythmLevelComplete() {
    recordRhythmLevelResult(true);
    const level = RHYTHM_LEVELS.find(entry => entry.id === rhythmSelectedLevel);
    document.getElementById('rhythm-level-complete-title').innerText = `${level.shortLabel} mastered!`;
    document.getElementById('rhythm-level-complete-score').innerText = rhythmScore;
    playSound('complete');
    document.getElementById('modal-rhythm-level-complete').classList.add('show');
}

function continueAfterRhythmLevel() {
    document.getElementById('modal-rhythm-level-complete').classList.remove('show');
    rhythmLocked = false;
    renderRhythmPathway();
    switchScreenState('rhythm', 'rhythm-screen-pathway');
}

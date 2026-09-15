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
    // single dotted half rather than two notes joined by a tie curve - see
    // design brief §4 level 6. The student's input is unaffected either
    // way: it's just an ordinary 3-beat Hold-run (Play, Hold, Hold).
    'dotted-half-note': ['play', 'hold', 'hold'],
    'dotted-half-rest': ['rest', 'rest', 'rest']
};

// Each level's pool is whatever pattern keys are in play - the generator
// (buildRhythmBarShapes below) works out every way those patterns can be
// concatenated to fill a 4-beat bar, so a level can freely mix pattern
// lengths (e.g. Level 3 mixing 4-beat and 2-beat patterns) with no extra
// per-level bookkeeping. See design brief §4's level table. Counting rounds
// are untimed at every level - the bonus Performing round (after 3 correct
// Counting submissions) is where timing pressure lives instead, so no
// level here carries a timer despite the original brief proposing one
// starting at Level 4.
//
// requireAnyOf (optional): for an "isolated" level introducing a new
// pattern that can't fill a bar by itself (e.g. a dotted half needs a
// quarter alongside it to reach 4 beats), the pool alone would also let
// the generator fall back to bars made entirely of the *other*, already-
// familiar pattern - technically valid, but pointless for a level whose
// whole point is drilling the new pattern. requireAnyOf rejects any bar
// shape that doesn't include at least one of the listed keys.
const RHYTHM_LEVELS = [
    { id: '1', label: 'Level 1: Whole Notes and Rests', shortLabel: 'Whole Notes and Rests', pool: ['whole-note', 'whole-rest'] },
    { id: '2', label: 'Level 2: Half Notes and Rests', shortLabel: 'Half Notes and Rests', pool: ['half-note', 'half-rest'] },
    { id: '3', label: 'Level 3: Whole and Half Notes and Rests', shortLabel: 'Whole and Half Mixed', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'] },
    { id: '4', label: 'Level 4: Quarter Notes and Rests', shortLabel: 'Quarter Notes and Rests', pool: ['quarter-note', 'quarter-rest'] },
    { id: '5', label: 'Level 5: Full Mix', shortLabel: 'Full Mix', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest'] },
    { id: '6', label: 'Level 6: Dotted Half Notes and Rests', shortLabel: 'Dotted Half Notes and Rests', pool: ['dotted-half-note', 'dotted-half-rest', 'quarter-note', 'quarter-rest'], requireAnyOf: ['dotted-half-note', 'dotted-half-rest'] },
    { id: '7', label: 'Level 7: Full Mix with Dotted Halves', shortLabel: 'Full Mix with Dotted Halves', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest', 'quarter-note', 'quarter-rest', 'dotted-half-note', 'dotted-half-rest'] }
];

// Beats-in-a-run -> VexFlow duration string. 3 is a dotted half ('hd' -
// confirmed via a live VexFlow probe that 'hd'/'hdr' produce the correct
// 1.5x-half tick count; the more obvious-looking 'h.' is not valid VexFlow
// syntax). Cross-barline ties (design brief levels 8-9) will need runs
// longer than 4, which this doesn't handle yet.
const RHYTHM_DURATION_FOR_BEATS = { 1: 'q', 2: 'h', 3: 'hd', 4: 'w' };

let rhythmSelectedLevel = '1';
let rhythmPhrase = [];              // 4 bars x 4 expected modes ('play'/'hold'/'rest')
let rhythmEntries = new Array(16).fill(null); // flat 16-beat student entry array
let rhythmUndoStack = [];           // stack of stamped indices, for Undo
let rhythmCursor = 0;               // next unfilled index, 0-16 (16 = phrase complete)
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
// marker to tell them apart (design brief's Level 4 "no two quarter rests
// in a row" rule, generalized: it's the same engraving principle whether
// the two units happen to match, like quarter+quarter or half+half, or
// don't, like half+quarter once Level 5 mixes lengths in one bar). A shape
// with just one unit (like the level's own whole-rest) has no adjacent
// pair to violate, so it's naturally unaffected.
function buildRhythmBarShapes(level) {
    const results = [];
    (function build(remainingBeats, shape) {
        if (remainingBeats === 0) { results.push(shape); return; }
        level.pool.forEach(key => {
            const length = RHYTHM_PATTERNS[key].length;
            if (length <= remainingBeats) build(remainingBeats - length, [...shape, key]);
        });
    })(4, []);
    const isRestPattern = key => RHYTHM_PATTERNS[key].every(mode => mode === 'rest');
    const hasAdjacentRests = shape => shape.some((key, index) => index > 0 && isRestPattern(key) && isRestPattern(shape[index - 1]));
    let shapes = results.filter(shape => !hasAdjacentRests(shape));
    if (level.requireAnyOf) shapes = shapes.filter(shape => shape.some(key => level.requireAnyOf.includes(key)));
    return shapes;
}

// Variety rule (design brief §5 item 15, proposed default): no bar shape
// repeats more than twice across the 4 bars, no bar identical to the one
// immediately before it.
function generateRhythmPhrase(levelId) {
    const level = RHYTHM_LEVELS.find(entry => entry.id === levelId);
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
    rhythmPhrase = generateRhythmPhrase(rhythmSelectedLevel);
    rhythmEntries = new Array(16).fill(null);
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
    if (rhythmLocked || rhythmCursor >= 16) return;
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
    rhythmCursor = nextNull === -1 ? 16 : nextNull;
}

function clearRhythmBars(barIndices) {
    const clearedIndices = new Set();
    barIndices.forEach(barIndex => {
        for (let beat = 0; beat < 4; beat++) {
            const index = barIndex * 4 + beat;
            rhythmEntries[index] = null;
            clearedIndices.add(index);
        }
    });
    rhythmUndoStack = rhythmUndoStack.filter(index => !clearedIndices.has(index));
    recalcRhythmCursor();
}

function updateRhythmSubmitButtonState() {
    document.getElementById('rhythm-submit-button').disabled = rhythmCursor < 16;
}

function updateRhythmNumberRow() {
    const row = document.getElementById('rhythm-number-row');
    row.innerHTML = '';
    const activeBar = Math.min(Math.floor(rhythmCursor / 4), 3);
    for (let beat = 0; beat < 4; beat++) {
        const index = activeBar * 4 + beat;
        const btn = document.createElement('button');
        btn.className = 'rhythm-number-btn';
        btn.innerText = beat + 1;
        const entered = rhythmEntries[index];
        if (entered) btn.classList.add(`filled-${entered}`);
        if (index === rhythmCursor) {
            btn.classList.add('next');
            btn.onclick = stampRhythmBeat;
        } else {
            btn.disabled = true;
        }
        row.appendChild(btn);
    }
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
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    container.classList.toggle('portrait-layout', !isLandscape);
    const activeBar = Math.floor(rhythmCursor / 4);
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
            stripDiv.className = `rhythm-beat-strip-group${barIndex === activeBar && rhythmCursor < 16 ? ' active' : ''}`;
            for (let beat = 0; beat < 4; beat++) {
                const index = barIndex * 4 + beat;
                const cell = document.createElement('span');
                cell.className = 'rhythm-beat-cell';
                const mode = rhythmEntries[index];
                if (mode) cell.classList.add(`filled-${mode}`);
                if (rhythmRevealedBars.includes(barIndex)) cell.classList.add('reveal-answer');
                cell.innerText = beat + 1;
                stripDiv.appendChild(cell);
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
        renderRhythmRowStaff(staffDiv, barIndices, activeBar);
    });
}

// Converts a bar's 4-beat pattern into note/rest specs: a Play followed by
// N Holds is one sustained note of duration N+1; a contiguous Rest run is
// one rest of that duration (rests have no onset/continuation split - see
// design brief §2/§3).
function renderRhythmBeatsToNotes(entries) {
    const notes = [];
    let i = 0;
    while (i < entries.length) {
        const mode = entries[i];
        const isRest = mode === 'rest';
        const continuesAs = isRest ? 'rest' : 'hold';
        let run = 1;
        while (i + run < entries.length && entries[i + run] === continuesAs) run++;
        notes.push({ beats: run, isRest });
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
function renderRhythmRowStaff(container, barIndices, activeBarIndex) {
    container.innerHTML = '';
    const VF = Vex.Flow;
    const totalWidth = Math.max(120 * barIndices.length, container.clientWidth || (140 * barIndices.length));
    const barWidth = totalWidth / barIndices.length;
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(totalWidth, 180);
    const context = renderer.getContext();

    barIndices.forEach((barIndex, position) => {
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
            const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(staveNotes);
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
                note.getTickContext().setX(startX + (cumulativeBeats / 4) * (endX - startX));
                cumulativeBeats += notesSpec[index].beats;
            });

            voice.draw(context, stave);
        }
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

// Keyboard controls for Chromebook/laptop play alongside touch: 1-2-3-4
// stamp the current beat (matching the number already on screen), Z/X/C
// pick Play/Hold/Rest, Backspace undoes, Enter submits. Only live while the
// Counting screen is actually showing, so these keys don't leak into any
// other game.
function setupRhythmKeyboardListener() {
    if (window.__rhythmKeyboardListenerAdded) return;
    window.__rhythmKeyboardListenerAdded = true;
    window.addEventListener('keydown', (event) => {
        const countingScreen = document.getElementById('rhythm-screen-counting');
        if (!countingScreen || !countingScreen.classList.contains('active')) return;
        const key = event.key;
        if (key >= '1' && key <= '4') {
            const expectedDigit = (rhythmCursor % 4) + 1;
            if (rhythmCursor < 16 && Number(key) === expectedDigit) {
                event.preventDefault();
                stampRhythmBeat();
            }
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
    if (rhythmLocked || rhythmCursor < 16) return;
    rhythmLocked = true;
    const wrongBars = [];
    for (let barIndex = 0; barIndex < 4; barIndex++) {
        const entered = rhythmEntries.slice(barIndex * 4, barIndex * 4 + 4);
        const correct = rhythmPhrase[barIndex].every((mode, beat) => entered[beat] === mode);
        if (!correct) wrongBars.push(barIndex);
    }
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
        wrongBars.forEach(barIndex => {
            for (let beat = 0; beat < 4; beat++) rhythmEntries[barIndex * 4 + beat] = rhythmPhrase[barIndex][beat];
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

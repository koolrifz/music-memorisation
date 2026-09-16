/* =========================================
   RHYTHM STOMP LAB — prototype of the new Counting interface
   (docs: koolrifz/kool-riffs-docs, rhythm-pillar-design-brief.md §9)

   This is a SEPARATE game from rhythm.js's "Rhythm Stomp" on purpose -
   nothing here touches rhythm.js. It exists to compare the old
   mode+stamp interface against the new two-state container model
   (Play vs a single "( )" bracket covering both Hold and Rest) on the
   same dashboard, side by side. Levels 1-2 so far (whole notes/rests,
   then half notes/rests, both untimed) - Level 1 doubles as a guided
   walkthrough, since it's the tutorial for this interaction model;
   every level after that launches straight into the game, matching the
   rest of the app.
   ========================================= */

const RSTOMP_PATTERNS = {
    'whole-note': ['play', 'hold', 'hold', 'hold'],
    'whole-rest': ['rest', 'rest', 'rest', 'rest'],
    'half-note': ['play', 'hold'],
    'half-rest': ['rest', 'rest']
};

// Counting rounds are untimed at every level (the eventual Performing round
// is where timing pressure lives, per the design brief) - so no timing
// field exists here yet.
// Level 3's pool, once the half-note-adjacency and rest-adjacency
// engraving rules both apply, only actually produces 4 valid bar shapes:
// a lone whole note, a lone whole rest, half-note+half-rest, and
// half-rest+half-note - by design, not a bug. It's genuinely a thin
// "mixed" level at this stage (testing whether a student can switch
// between whole-note-scale and half-note-scale thinking within one
// level, not new combinatorics) - the pool grows once quarter notes
// arrive at a future level.
const RSTOMP_LEVELS = [
    { id: '1', label: 'Level 1: Whole Notes and Rests', shortLabel: 'Whole Notes and Rests', pool: ['whole-note', 'whole-rest'] },
    { id: '2', label: 'Level 2: Half Notes and Rests', shortLabel: 'Half Notes and Rests', pool: ['half-note', 'half-rest'] },
    { id: '3', label: 'Level 3: Whole and Half Notes Mixed', shortLabel: 'Whole and Half Mixed', pool: ['whole-note', 'whole-rest', 'half-note', 'half-rest'] }
];

// Beats-in-a-run -> VexFlow duration string. Only what levels 1-2 actually
// need (a lone 4-beat note/rest, or two 2-beat ones) - no reason to bring
// in rhythm.js's fuller map (dotted values, quavers) before a level needs it.
const RSTOMP_DURATION_FOR_BEATS = { 1: 'q', 2: 'h', 4: 'w' };

let rstompSelectedLevel = '1';
let rstompPhrase = [];          // 4 bars, each a 4-entry array of 'play'/'hold'/'rest'
let rstompPositions = [];       // flat [{barIndex, beatIndex}] - 16 for a 4-bar phrase, level 1 has no subdivisions
let rstompEntries = [];         // parallel to rstompPositions: null, 'play', or 'bracket'
let rstompUndoStack = [];
let rstompCursor = 0;
let rstompAttempt = 1;
let rstompStreak = 0;
let rstompScore = 0;
let rstompLocked = false;

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

// Every way to concatenate a level's pool patterns so their beat-lengths
// sum to exactly 4 (a full bar) - same approach as rhythm.js's
// buildRhythmUnitShapes/buildRhythmBarShapes, ported rather than shared
// since this file is deliberately independent of rhythm.js. Two adjacent
// rest-units always collapse into one longer rest in real notation (no
// onset to tell them apart), so any shape with more than 1 rest-unit in a
// row is filtered out - standard engraving, not level-specific yet.
function buildRstompBarShapes(pool) {
    const results = [];
    (function build(remainingBeats, shape) {
        if (remainingBeats === 0) { results.push(shape); return; }
        pool.forEach(key => {
            const length = RSTOMP_PATTERNS[key].length;
            if (length <= remainingBeats) build(remainingBeats - length, [...shape, key]);
        });
    })(4, []);
    const isRestPattern = key => RSTOMP_PATTERNS[key].every(mode => mode === 'rest');
    return results.filter(shape => {
        let run = 0;
        for (let i = 0; i < shape.length; i++) {
            run = isRestPattern(shape[i]) ? run + 1 : 0;
            if (run > 1) return false;
            // Engraving rule (design brief §4, level 3): two half notes
            // adjacent in a bar should be written as one whole note instead
            // - never generate the redundant two-half-notes shape.
            if (shape[i] === 'half-note' && shape[i - 1] === 'half-note') return false;
        }
        return true;
    });
}

// Variety rule (design brief §5 item 15): no bar shape repeats more than
// twice across the 4 bars, never identical to the bar immediately before it.
function generateRstompPhrase(level) {
    const shapes = buildRstompBarShapes(level.pool);
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
    return chosenIndices.map(index => shapes[index].flatMap(key => RSTOMP_PATTERNS[key]));
}

// Levels 1-2 are both a flat 4x4 grid (4 bars, 4 undivided beats each, no
// subdivisions) - so a position's flat index is just barIndex*4+beatIndex.
// A future level with subdivided beats (quavers etc.) would need
// rhythm.js's more general position-lookup approach; not needed yet.
function buildRstompPositions(phrase) {
    const positions = [];
    phrase.forEach((bar, barIndex) => {
        for (let beatIndex = 0; beatIndex < 4; beatIndex++) positions.push({ barIndex, beatIndex });
    });
    return positions;
}

function rstompExpectedAnswer(position) {
    const mode = rstompPhrase[position.barIndex][position.beatIndex];
    return mode === 'play' ? 'play' : 'bracket';
}

/* ---------- Round lifecycle ---------- */

function startRstompLevel() {
    initAudio();
    rstompAttempt = 1;
    rstompStreak = 0;
    rstompScore = 0;
    rstompLocked = false;
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-game');
    document.getElementById('rstomp-level-label').innerText = RSTOMP_LEVELS.find(level => level.id === rstompSelectedLevel).label;
    updateRstompStreakDots();
    startNewRstompPhrase();
}

function startNewRstompPhrase() {
    const level = RSTOMP_LEVELS.find(entry => entry.id === rstompSelectedLevel);
    rstompPhrase = generateRstompPhrase(level);
    rstompPositions = buildRstompPositions(rstompPhrase);
    rstompEntries = new Array(rstompPositions.length).fill(null);
    rstompUndoStack = [];
    rstompCursor = 0;
    hideRstompFeedback();
    renderRstompBars();
    updateRstompPrompt();
    updateRstompButtonStates();
}

/* ---------- Two-state answer + cursor (design brief §9.1/§9.2) ---------- */

// One tap commits the answer AND advances the cursor - no separate
// mode-select-then-stamp step, which is the whole point of this rebuild.
function stampRstomp(answer) {
    if (rstompLocked || rstompCursor >= rstompPositions.length) return;
    rstompEntries[rstompCursor] = answer;
    rstompUndoStack.push(rstompCursor);
    rstompCursor++;
    renderRstompBars();
    updateRstompPrompt();
    updateRstompButtonStates();
}

function undoRstomp() {
    if (rstompLocked || rstompUndoStack.length === 0) return;
    const index = rstompUndoStack.pop();
    rstompEntries[index] = null;
    rstompCursor = index;
    renderRstompBars();
    updateRstompPrompt();
    updateRstompButtonStates();
}

// The walkthrough framing for Level 1: every single container gets its
// own plain-language question, not just a one-time intro screen. This is
// what "look to the next event, tell them what to do" means in the UI.
function updateRstompPrompt() {
    const el = document.getElementById('rstomp-prompt');
    if (!el) return;
    if (rstompCursor >= rstompPositions.length) {
        el.textContent = "All filled in — check your answer below.";
        return;
    }
    const pos = rstompPositions[rstompCursor];
    el.textContent = `Bar ${pos.barIndex + 1} · Beat ${pos.beatIndex + 1} — does a new note start here?`;
}

function updateRstompButtonStates() {
    const done = rstompCursor >= rstompPositions.length;
    document.getElementById('rstomp-play-btn').disabled = rstompLocked || done;
    document.getElementById('rstomp-bracket-btn').disabled = rstompLocked || done;
    document.getElementById('rstomp-undo-btn').disabled = rstompLocked || rstompUndoStack.length === 0;
    document.getElementById('rstomp-submit-button').disabled = rstompLocked || !done;
}

/* ---------- Rendering: staff (display-only) + live counting row ---------- */

function renderRstompBars() {
    const container = document.getElementById('rstomp-bars-container');
    if (!container) return;
    container.innerHTML = '';
    const activeBar = rstompCursor < rstompPositions.length ? rstompPositions[rstompCursor].barIndex : -1;
    rstompPhrase.forEach((bar, barIndex) => {
        const card = document.createElement('div');
        card.className = `rstomp-bar-card${barIndex === activeBar ? ' active' : ''}`;

        const staffDiv = document.createElement('div');
        staffDiv.className = 'rstomp-bar-staff';
        card.appendChild(staffDiv);

        const countingDiv = document.createElement('div');
        countingDiv.className = 'rstomp-bar-counting';
        card.appendChild(countingDiv);

        container.appendChild(card);
        const layout = renderRstompStaff(staffDiv, bar);
        renderRstompCountingRow(countingDiv, barIndex, layout);
    });
}

// Reveals left-to-right only, never past the cursor (design brief §9.3 -
// "eyes forward", never a glance backward needed). Returns positioned
// tokens (not a flat string) so each one can be placed at the x of the
// beat it actually describes - directly under the note it refers to, per
// Rob's Rubank reference, not centered as one string under the whole bar.
//
// Bracket-merge rule (corrected earlier - see that fix's commit): Hold and
// Rest share the same bracket SYMBOL, but a run only merges into one
// bracket when it's genuinely the same underlying event the whole way
// through - all Hold (one sustained note continuing) or all Rest (one
// continuous silence), never across the boundary between them, even though
// the student's own answer (which only knows Play vs Bracket) can't see
// that distinction - that's why this reads the true pattern (rstompPhrase).
function buildRstompCountingTokens(barIndex) {
    const tokens = [];
    let beatIndex = 0;
    while (beatIndex < 4) {
        const posIndex = barIndex * 4 + beatIndex;
        const answer = rstompEntries[posIndex];
        if (answer == null) break;
        if (answer === 'play') {
            tokens.push({ text: String(beatIndex + 1), startBeat: beatIndex, endBeat: beatIndex, kind: 'play' });
            beatIndex++;
            continue;
        }
        const trueMode = rstompPhrase[barIndex][beatIndex]; // 'hold' | 'rest'
        const labels = [String(beatIndex + 1)];
        let end = beatIndex;
        while (end + 1 < 4) {
            const nextAnswer = rstompEntries[barIndex * 4 + end + 1];
            if (nextAnswer !== 'bracket' || rstompPhrase[barIndex][end + 1] !== trueMode) break;
            end++;
            labels.push(String(end + 1));
        }
        tokens.push({ text: `(${labels.join(' ')})`, startBeat: beatIndex, endBeat: end, kind: trueMode });
        beatIndex = end + 1;
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
// A whole rest was expected to need the same treatment - real engraving
// convention often hangs it centered in the bar rather than at beat 1's
// true position - but measured directly (note.getAbsoluteX()) it renders
// at the same onset-style position a whole note does (21px in, matching
// exactly): this VexFlow setup never applies that centering unless
// setCenterAlignment() is explicitly called, which nothing here does. No
// exception needed - rule 1 already produces the correct position.
//
// Font size still scales with the card's actual width (2-column portrait
// grid can put a bar-card under 180px wide - a fixed size overlaps there).
function renderRstompCountingRow(container, barIndex, layout) {
    container.innerHTML = '';
    container.style.fontSize = `${Math.max(13, Math.min(24, layout.width * 0.09))}px`;
    const tokens = buildRstompCountingTokens(barIndex);
    const els = tokens.map(token => {
        const el = document.createElement('span');
        el.className = 'rstomp-count-token';
        el.textContent = token.text;
        if (token.kind === 'hold') {
            const x = (layout.pulseX(token.startBeat) + layout.pulseX(token.endBeat + 1)) / 2;
            el.style.left = `${x}px`;
            el.classList.add('rstomp-count-token-centered');
        } else {
            const specIndex = layout.beatOwner[token.startBeat].specIndex;
            el.style.left = `${layout.noteX[specIndex]}px`;
        }
        container.appendChild(el);
        return el;
    });

    // Rule 2's "breathe at the true mid-span" position is an ideal, not a
    // guarantee - at narrow card widths (2-column portrait grid) it can
    // overlap a neighbouring onset token, confirmed by measurement (e.g.
    // "(2)" and the following "3" touching at ~170px card width). Onset
    // tokens (rule 1) are never moved - they're anchored to a real glyph.
    // Only a Hold token gets nudged, clamped into whatever free space
    // actually exists between its two fixed neighbours, measured from the
    // real rendered widths (offsetWidth) now that everything's in the DOM.
    // GAP is deliberately generous (not just enough to clear zero overlap
    // in one browser's font metrics) - a downloaded webfont like Patrick
    // Hand can render at measurably different widths across platforms
    // (desktop headless Chromium vs a phone's Chrome build), so a hairline
    // 3px margin that only just clears in one environment can still
    // collide in another.
    const GAP = 8;
    const edgesOf = el => {
        const centered = el.classList.contains('rstomp-count-token-centered');
        const anchor = parseFloat(el.style.left);
        const width = el.offsetWidth;
        return centered ? [anchor - width / 2, anchor + width / 2] : [anchor, anchor + width];
    };
    els.forEach((el, index) => {
        if (!el.classList.contains('rstomp-count-token-centered')) return;
        const width = el.offsetWidth;
        let center = parseFloat(el.style.left);
        const prevRight = index > 0 ? edgesOf(els[index - 1])[1] : -Infinity;
        const nextLeft = index < els.length - 1 ? edgesOf(els[index + 1])[0] : Infinity;
        center = Math.max(center, prevRight + GAP + width / 2);
        center = Math.min(center, nextLeft - GAP - width / 2);
        el.style.left = `${center}px`;
    });
}

// A Play followed by N Holds is one sustained note of duration N+1; a
// contiguous Rest run is one rest of that duration - same run-length
// encoding as rhythm.js, just without its subdivision/tie/beaming
// machinery, which levels 1-2 don't need yet.
function rstompBeatsToNoteSpecs(entries) {
    const specs = [];
    let i = 0;
    while (i < entries.length) {
        const mode = entries[i];
        const isRest = mode === 'rest';
        const continuesAs = isRest ? 'rest' : 'hold';
        let run = 1;
        while (i + run < entries.length && entries[i + run] === continuesAs) run++;
        specs.push({ beats: run, isRest });
        i += run;
    }
    return specs;
}

function renderRstompStaff(container, bar) {
    container.innerHTML = '';
    const VF = Vex.Flow;
    const width = Math.max(150, container.clientWidth || 150);
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(width, 130);
    const context = renderer.getContext();

    const stave = new VF.Stave(4, 20, width - 8);
    stave.setConfigForLines([
        { visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false }
    ]);
    stave.setStyle({ strokeStyle: '#000000' });
    stave.setContext(context).draw();

    const specs = rstompBeatsToNoteSpecs(bar);
    const notes = specs.map(spec => {
        const duration = RSTOMP_DURATION_FOR_BEATS[spec.beats];
        return new VF.StaveNote({ clef: 'treble', keys: ['b/4'], duration: spec.isRest ? `${duration}r` : duration });
    });
    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(notes);
    new VF.Formatter().joinVoices([voice]).format([voice], width - 60);
    voice.draw(context, stave);

    const svg = container.querySelector('svg');
    if (svg) svg.style.marginTop = '-30px';

    // Read back VexFlow's OWN rendered x for each note (getAbsoluteX) -
    // the real onset a Play token or a non-whole-bar Rest bracket left-
    // aligns to (see renderRstompCountingRow for the alignment rules this
    // layout serves).
    const noteX = notes.map(note => note.getAbsoluteX());

    // The ideal, evenly-spaced beat grid (true beat 1/2/3/4 positions),
    // independent of where any glyph actually landed - this is what a
    // Hold-continuation bracket (no glyph of its own) centers across, and
    // what a whole rest's "1" anchors to instead of that glyph's own
    // (deliberately centered, per standard engraving) rendered position.
    const trueStartX = stave.getNoteStartX();
    const trueEndX = stave.getNoteEndX();
    const pulseX = beatFraction => trueStartX + (beatFraction / 4) * (trueEndX - trueStartX);

    // Which spec (note/rest object) owns each beat, and whether that beat
    // is the spec's own onset (has a glyph) or a continuation (doesn't).
    const beatOwner = new Array(4);
    let cumulativeBeats = 0;
    specs.forEach((spec, index) => {
        for (let k = 0; k < spec.beats; k++) beatOwner[cumulativeBeats + k] = { specIndex: index, isOnset: k === 0 };
        cumulativeBeats += spec.beats;
    });

    return { noteX, pulseX, beatOwner, width };
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
    if (rstompLocked || rstompCursor < rstompPositions.length) return;
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
            renderRstompBars();
            updateRstompPrompt();
            updateRstompButtonStates();
            hideRstompFeedback();
            rstompLocked = false;
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

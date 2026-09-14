/* =========================================
   GAME 4: RHYTHM
   Level 1 only: whole notes / whole rests, Counting round.
   Core premise (design brief §1): count *when the next note starts*, not
   "how long do I hold this." A beat is stamped as Play (a new onset), Hold
   (sustaining a previous onset), or Rest (silence - its own explicit stamp,
   no onset/continuation split since there's no sound to sustain).
   ========================================= */

const RHYTHM_PATTERNS = {
    'whole-note': ['play', 'hold', 'hold', 'hold'],
    'whole-rest': ['rest', 'rest', 'rest', 'rest']
};

const RHYTHM_LEVELS = [
    { id: '1', label: 'Level 1: Whole Notes', shortLabel: 'Whole Notes', pool: ['whole-note', 'whole-rest'] }
];

// Beats-in-a-run -> VexFlow duration string. Only 1/2/4 are reachable before
// ties are introduced (level 6+ in the design brief) - a 3-beat run needs a
// dotted-half duration, deliberately left unimplemented until that level is
// actually built, rather than guessing at VexFlow's dot-modifier API now.
const RHYTHM_DURATION_FOR_BEATS = { 1: 'q', 2: 'h', 4: 'w' };

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

// Variety rule (design brief §5 item 15, proposed default): no bar-pattern
// repeats more than twice across the 4 bars, no bar identical to the one
// immediately before it.
function generateRhythmPhrase(levelId) {
    const level = RHYTHM_LEVELS.find(entry => entry.id === levelId);
    const pool = level.pool;
    const chosenKeys = [];
    const counts = {};
    pool.forEach(key => { counts[key] = 0; });
    for (let i = 0; i < 4; i++) {
        let candidates = pool.filter(key => counts[key] < 2 && key !== chosenKeys[i - 1]);
        if (candidates.length === 0) candidates = pool.filter(key => key !== chosenKeys[i - 1]);
        if (candidates.length === 0) candidates = pool.slice();
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        chosenKeys.push(chosen);
        counts[chosen]++;
    }
    return chosenKeys.map(key => [...RHYTHM_PATTERNS[key]]);
}

/* ---------- Round lifecycle ---------- */

function startRhythmLevel() {
    initAudio();
    rhythmAttempt = 1;
    rhythmStreak = 0;
    rhythmScore = 0;
    rhythmLocked = false;
    setupRhythmOrientationListener();
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

/* ---------- Rendering (beat-strip + VexFlow staff per bar) ---------- */

function renderRhythmBars() {
    const container = document.getElementById('rhythm-bars-container');
    if (!container) return;
    container.innerHTML = '';
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    container.classList.toggle('portrait-layout', !isLandscape);
    const activeBar = Math.floor(rhythmCursor / 4);
    for (let barIndex = 0; barIndex < 4; barIndex++) {
        const barDiv = document.createElement('div');
        barDiv.className = `rhythm-bar${barIndex === activeBar && rhythmCursor < 16 ? ' active' : ''}`;

        const staffDiv = document.createElement('div');
        staffDiv.className = 'rhythm-bar-staff';
        barDiv.appendChild(staffDiv);

        const stripDiv = document.createElement('div');
        stripDiv.className = 'rhythm-beat-strip';
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
        barDiv.appendChild(stripDiv);

        container.appendChild(barDiv);
        renderRhythmBarStaff(staffDiv, rhythmEntries.slice(barIndex * 4, barIndex * 4 + 4));
    }
}

// Converts a complete 4-beat array into note/rest specs: a Play followed by
// N Holds is one sustained note of duration N+1; a contiguous Rest run is
// one rest of that duration (rests have no onset/continuation split - see
// design brief §2/§3). Returns null while the bar is still incomplete.
function renderRhythmBeatsToNotes(entries) {
    if (entries.some(beat => beat === null)) return null;
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

function renderRhythmBarStaff(container, entries) {
    container.innerHTML = '';
    const VF = Vex.Flow;
    const width = Math.max(120, container.clientWidth || 140);
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(width, 80);
    const context = renderer.getContext();
    const stave = new VF.Stave(4, 5, width - 8);
    stave.addClef('treble');
    stave.setContext(context).draw();

    const notesSpec = renderRhythmBeatsToNotes(entries);
    if (!notesSpec) return;
    const staveNotes = notesSpec.map(spec => {
        const duration = RHYTHM_DURATION_FOR_BEATS[spec.beats];
        if (!duration) { console.warn(`Rhythm: no duration mapping for a ${spec.beats}-beat run yet (ties not built).`); return null; }
        return new VF.StaveNote({ clef: 'treble', keys: ['b/4'], duration: spec.isRest ? `${duration}r` : duration });
    }).filter(Boolean);
    if (staveNotes.length !== notesSpec.length) return;
    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(staveNotes);
    new VF.Formatter().joinVoices([voice]).format([voice], Math.max(40, width - 50));
    voice.draw(context, stave);
}

function setupRhythmOrientationListener() {
    if (window.__rhythmOrientationListenerAdded) return;
    window.__rhythmOrientationListenerAdded = true;
    window.matchMedia('(orientation: landscape)').addEventListener('change', () => {
        const countingScreen = document.getElementById('rhythm-screen-counting');
        if (countingScreen && countingScreen.classList.contains('active')) renderRhythmBars();
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

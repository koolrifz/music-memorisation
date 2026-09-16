/* =========================================
   RHYTHM STOMP LAB — prototype of the new Counting interface
   (docs: koolrifz/kool-riffs-docs, rhythm-pillar-design-brief.md §9)

   This is a SEPARATE game from rhythm.js's "Rhythm Stomp" on purpose -
   nothing here touches rhythm.js. It exists to compare the old
   mode+stamp interface against the new two-state container model
   (Play vs a single "( )" bracket covering both Hold and Rest) on the
   same dashboard, side by side. Level 1 only for now (whole notes and
   whole rests, untimed) - deliberately built as a guided walkthrough,
   since Level 1 IS the tutorial for this interaction model.
   ========================================= */

const RSTOMP_PATTERNS = {
    'whole-note': ['play', 'hold', 'hold', 'hold'],
    'whole-rest': ['rest', 'rest', 'rest', 'rest']
};
const RSTOMP_POOL = ['whole-note', 'whole-rest'];

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
    const fallback = { stageProgress: {}, totalPlays: 0 };
    try { return { ...fallback, ...JSON.parse(localStorage.getItem('koolRiffsRhythmLabProgress') || '{}') }; }
    catch (error) { return fallback; }
}

function saveRstompProgress(progress) {
    localStorage.setItem('koolRiffsRhythmLabProgress', JSON.stringify(progress));
}

function recordRstompResult(isOfficialMastery) {
    const progress = getRstompProgress();
    const stage = progress.stageProgress['1'] || { bestScore: 0, timesPlayed: 0, cleared: false };
    stage.timesPlayed++;
    stage.bestScore = Math.max(stage.bestScore || 0, Math.round(rstompScore));
    stage.cleared = stage.cleared || isOfficialMastery;
    progress.stageProgress['1'] = stage;
    progress.totalPlays = (progress.totalPlays || 0) + 1;
    saveRstompProgress(progress);
}

/* ---------- Entry / navigation ---------- */

function enterRhythmLab() {
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-intro');
}

function handleRstompBackButton() {
    const activeScreen = document.querySelector('#view-rhythm-lab .screen.active');
    if (activeScreen && activeScreen.id === 'rhythm-lab-screen-game') {
        switchScreenState('rhythm-lab', 'rhythm-lab-screen-intro');
    } else {
        launchGame('view-dashboard');
    }
}

/* ---------- Phrase generator ---------- */

// Same variety rule as rhythm.js (design brief §5 item 15): no pattern
// repeats more than twice across the 4 bars, never identical to the bar
// immediately before it.
function generateRstompPhrase() {
    const counts = { 'whole-note': 0, 'whole-rest': 0 };
    const chosenKeys = [];
    for (let i = 0; i < 4; i++) {
        let candidates = RSTOMP_POOL.filter(key => counts[key] < 2 && key !== chosenKeys[i - 1]);
        if (candidates.length === 0) candidates = RSTOMP_POOL.filter(key => key !== chosenKeys[i - 1]);
        if (candidates.length === 0) candidates = RSTOMP_POOL;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        chosenKeys.push(chosen);
        counts[chosen]++;
    }
    return chosenKeys.map(key => [...RSTOMP_PATTERNS[key]]);
}

// Level 1 is a flat 4x4 grid (4 bars, 4 undivided beats each, no
// subdivisions) - so a position's flat index is just barIndex*4+beatIndex.
// Later levels with subdivided beats would need rhythm.js's more general
// position-lookup approach; not needed yet.
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

function startRstompLevel1() {
    initAudio();
    rstompAttempt = 1;
    rstompStreak = 0;
    rstompScore = 0;
    rstompLocked = false;
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-game');
    updateRstompStreakDots();
    startNewRstompPhrase();
}

function startNewRstompPhrase() {
    rstompPhrase = generateRstompPhrase();
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
        countingDiv.textContent = renderRstompCountingText(barIndex) || ' ';
        card.appendChild(countingDiv);

        container.appendChild(card);
        renderRstompStaff(staffDiv, bar);
    });
}

// Reveals left-to-right only, never past the cursor (design brief §9.3 -
// "eyes forward", never a glance backward needed). Consecutive Bracket
// answers merge into ONE bracket pair as they're entered, confirmed
// against Rob's worksheets and his own "one open, one close" framing -
// not one bracket per beat.
function renderRstompCountingText(barIndex) {
    let text = '';
    let bracketOpen = false;
    for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
        const posIndex = barIndex * 4 + beatIndex;
        const answer = rstompEntries[posIndex];
        if (answer == null) break;
        const label = String(beatIndex + 1);
        if (answer === 'play') {
            if (bracketOpen) { text += ')'; bracketOpen = false; }
            text += (text ? ' ' : '') + label;
        } else if (!bracketOpen) {
            text += (text ? ' ' : '') + '(' + label;
            bracketOpen = true;
        } else {
            text += ' ' + label;
        }
    }
    if (bracketOpen) text += ')';
    return text;
}

// Level 1 only ever has a whole note or a whole rest filling the bar, so
// this is deliberately not the general run-length note-building machinery
// rhythm.js needs for mixed durations - no reason to build that generality
// before a level actually needs it.
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

    const isRest = bar[0] === 'rest';
    const note = new VF.StaveNote({ clef: 'treble', keys: ['b/4'], duration: isRest ? 'wr' : 'w' });
    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables([note]);
    new VF.Formatter().joinVoices([voice]).format([voice], width - 60);
    voice.draw(context, stave);

    const svg = container.querySelector('svg');
    if (svg) svg.style.marginTop = '-30px';
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
    document.getElementById('rstomp-level-complete-score').innerText = rstompScore;
    playSound('complete');
    document.getElementById('modal-rstomp-level-complete').classList.add('show');
}

function continueAfterRstompLevel() {
    document.getElementById('modal-rstomp-level-complete').classList.remove('show');
    rstompLocked = false;
    switchScreenState('rhythm-lab', 'rhythm-lab-screen-intro');
}

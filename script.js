/* =========================================
   AUDIO & SPEECH ENGINE
   ========================================= */
let audioCtx = null;

function initAudio() {
    try { 
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
        if (audioCtx.state === 'suspended') audioCtx.resume(); 
    } catch (e) {}
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
}

function playSound(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => playSound(type)).catch(() => {});
        return;
    }
    try {
        const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); 
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        if (type === 'correct') { 
            osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.15); 
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); 
            osc.start(); osc.stop(audioCtx.currentTime + 0.3); 
        }
        else if (type === 'wrong') { 
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(140, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.2); 
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2); 
            osc.start(); osc.stop(audioCtx.currentTime + 0.2); 
        }
        else if (type === 'timeout') { 
            osc.type = 'square'; osc.frequency.setValueAtTime(200, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4); 
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); 
            osc.start(); osc.stop(audioCtx.currentTime + 0.4); 
        }
        else if (type === 'complete') { 
            osc.type = 'triangle'; osc.frequency.setValueAtTime(440, audioCtx.currentTime); osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.15); 
            osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.3); osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.45); 
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9); 
            osc.start(); osc.stop(audioCtx.currentTime + 0.9); 
        }
    } catch (e) {}
}

// Set true only while a round is actually active, false the instant a round
// ends, is paused, or is exited. speakLetter checks this before ever
// speaking, as a second line of defence alongside speechSynthesis.cancel() -
// on some mobile browsers, calling cancel() immediately after speak() can
// silently fail to interrupt the utterance, which is the likely cause of
// speech lingering after a round finishes. This flag stops a new utterance
// from ever starting once a round is over, regardless of whether cancel()
// took effect in time.
let speechRoundActive = false;

function speakLetter(text) {
    if (!speechRoundActive) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
            if (!speechRoundActive) return;
            let utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.19; // 15% slower than the previous rate
            
            let voices = window.speechSynthesis.getVoices();
            let preferredVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Premium')))) 
                                 || voices.find(v => v.lang === 'en-AU' || v.lang === 'en-GB');
            
            if (preferredVoice) utterance.voice = preferredVoice;
            window.speechSynthesis.speak(utterance);
        }, 80); // Small delay ensures browser audio queue is active post-transition
    }
}

/* =========================================
   GLOBAL DATA: NOTE CONFIGS
   ========================================= */
const NOTE_CONFIGS = {
    "treble": { clef: "treble", 
        staffLines: [["E","e/4"],["G","g/4"],["B","b/4"],["D","d/5"],["F","f/5"]], 
        staffSpaces: [["F","f/4"],["A","a/4"],["C","c/5"],["E","e/5"]],
        ledgerLines: [["C","c/4"],["A","a/3"],["F","f/3"],["A","a/5"],["C","c/6"],["E","e/6"]],
        ledgerSpaces: [["D","d/4"],["B","b/3"],["G","g/3"],["E","e/3"],["G","g/5"],["B","b/5"],["D","d/6"],["F","f/6"]]
    },
    "bass": { clef: "bass",   
        staffLines: [["G","g/2"],["B","b/2"],["D","d/3"],["F","f/3"],["A","a/3"]], 
        staffSpaces: [["A","a/2"],["C","c/3"],["E","e/3"],["G","g/3"]],
        ledgerLines: [["E","e/2"],["C","c/2"],["C","c/4"],["E","e/4"]],
        ledgerSpaces: [["F","f/2"],["D","d/2"],["B","b/1"],["B","b/3"],["D","d/4"],["F","f/4"]]
    },
    "alto": { clef: "alto",   
        staffLines: [["F","f/3"],["A","a/3"],["C","c/4"],["E","e/4"],["G","g/4"]], 
        staffSpaces: [["G","g/3"],["B","b/3"],["D","d/4"],["F","f/4"]],
        ledgerLines: [["D","d/3"],["B","b/2"],["B","b/4"],["D","d/5"]],
        ledgerSpaces: [["E","e/3"],["C","c/3"],["A","a/2"],["A","a/4"],["C","c/5"],["E","e/5"]]
    },
    "tenor": { clef: "tenor",  
        staffLines: [["D","d/3"],["F","f/3"],["A","a/3"],["C","c/4"],["E","e/4"]], 
        staffSpaces: [["E","e/3"],["G","g/3"],["B","b/3"],["D","d/4"]],
        ledgerLines: [["B","b/2"],["G","g/2"],["G","g/4"],["B","b/4"]],
        ledgerSpaces: [["C","c/3"],["A","a/2"],["F","f/2"],["F","f/4"],["A","a/4"],["C","c/5"]]
    }
};

/* =========================================
   SHARED SMASH-CARD RENDERER (Games 1 & 2)
   Renders one mini-staff note into a card, then measures what was actually
   drawn (notehead, ledger lines, stem - whatever VexFlow adds) and shifts it
   to be horizontally centred in the card. This replaces fixed, hand-tuned
   pixel offsets, which don't work correctly for every pitch/ledger-line
   combination and were the source of the centering/clipping bugs. Vertical
   position is left alone deliberately - it's meant to vary by pitch (that's
   the whole point of the game) - but the canvas is sized with enough
   headroom above and below the staff that up to 2 ledger lines each side
   never get clipped.
   ========================================= */
function renderSmashCard(containerEl, clefName, pitchKey, drawNote = true) {
    const VF = Vex.Flow;
    containerEl.innerHTML = '';
    
    const canvasWidth = 120;
    const canvasHeight = 110;

    const renderer = new VF.Renderer(containerEl, VF.Renderer.Backends.SVG);
    renderer.resize(canvasWidth, canvasHeight);
    const ctx = renderer.getContext();
    
    ctx.setFillStyle('#000000');
    ctx.setStrokeStyle('#000000');

    const svg = containerEl.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.overflow = 'visible';

    // Stave positioned precisely in the vertical middle of the card space
    const stave = new VF.Stave(10, 18, 100);
    stave.setBegBarType(VF.Barline.type.NONE);
    stave.setEndBarType(VF.Barline.type.NONE);
    
    if (drawNote && pitchKey) {
        stave.setNoteStartX(stave.getX() + (stave.getWidth() / 2) - 5);
        stave.setContext(ctx).draw();

        const note = new VF.StaveNote({ clef: clefName, keys: [pitchKey], duration: "w" });
        const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables([note]);
        
        new VF.Formatter().joinVoices([voice]).format([voice], 0);
        voice.draw(ctx, stave);
    } else {
        stave.setContext(ctx).draw();
    }
}

let personalBests = {
    game2: { round1: 0, round2: 0, round3: 0, round4: 0 },
    game3: { 'drill-lines': 0, 'drill-spaces': 0, 'drill-both': 0, 'speed': 0 }
};

/* =========================================
   GLOBAL PAUSE / RESUME / ROUTING
   ========================================= */
let g1Timer, g1FlashTimer, g2Timer, g2FlashTimer, gameTimer, breakOutTimer;
let g1BonusCountdownTimer;
let g1SecondsLeft = 30, g2SecondsLeft = 60, secondsLeft = 60;

function stopAllGames() {
    speechRoundActive = false;
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    if (g1Timer) clearInterval(g1Timer);
    if (g2Timer) clearInterval(g2Timer);
    if (gameTimer) clearInterval(gameTimer);
    
    if (g1FlashTimer) clearTimeout(g1FlashTimer);
    if (g2FlashTimer) clearTimeout(g2FlashTimer);
    if (breakOutTimer) clearTimeout(breakOutTimer);
    if (g1BonusCountdownTimer) clearInterval(g1BonusCountdownTimer);
}

function pauseCurrentGame(gameId) {
    stopAllGames();
    document.getElementById(`pause-overlay-${gameId}`).classList.add('active');
}

function resumeGame(gameId) {
    if (gameId === 'game1' || gameId === 'game2') speechRoundActive = true;
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    document.getElementById(`pause-overlay-${gameId}`).classList.remove('active');

    if (gameId === 'game1') {
        startG1Timer();
        startG1FlashTimer(); 
    } else if (gameId === 'game2') {
        startG2Timer();
        startG2FlashTimer();
        speakLetter(g2TargetNote); 
    } else if (gameId === 'game3') {
        start60SecondTimer();
        if (currentMode === 'speed') startFlashcardTimer(getTimeLimitForTier(currentTier));
    }
}

function handleBackButton(gameId) {
    const activeScreen = document.querySelector(`#view-${gameId} .screen.active`);
    const overlay = document.getElementById(`pause-overlay-${gameId}`);
    if (overlay) overlay.classList.remove('active');

    if (activeScreen && activeScreen.id.includes('screen-game')) {
        stopAllGames();
        let setupId = gameId === 'game1' ? 'g1-screen-pathway' : (gameId === 'game2' ? 'g2-screen-setup' : 'g3-screen-setup');
        switchScreenState(gameId, setupId);
    } else {
        stopAllGames();
        launchGame('view-dashboard');
    }
}

function launchGame(targetViewId) {
    initAudio();
    stopAllGames();
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(targetViewId).classList.add('active');
    
    if (targetViewId === 'view-dashboard') {
        switchScreenState('game1', 'g1-screen-setup');
        switchScreenState('game2', 'g2-screen-setup');
        switchScreenState('game3', 'g3-screen-setup');
    } else if (targetViewId === 'view-game1') {
        renderG1Pathway();
        switchScreenState('game1', 'g1-screen-pathway');
    }
}

function switchScreenState(gameId, screenId) {
    stopAllGames();
    document.querySelectorAll(`#view-${gameId} .screen`).forEach(el => {
        el.classList.remove('active');
        el.style.opacity = '0';
        el.style.display = 'none';
    });
    const target = document.getElementById(screenId);
    if(target) { 
        target.style.display = 'flex'; 
        setTimeout(() => { target.classList.add('active'); target.style.opacity = '1'; }, 10); 
    }
}

function toggleCredits(show) {
    const modal = document.getElementById('modal-credits');
    if (show) modal.classList.add('show'); else modal.classList.remove('show');
}

/* =========================================
   CLEF SIGNPOST UTILITY
   ========================================= */
function renderFloatingClef(containerId, clefName) {
    const VF = Vex.Flow;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    const clefWidth = 60;
    const clefHeight = 72;
    renderer.resize(clefWidth, clefHeight);
    const ctx = renderer.getContext(); 
    
    ctx.scale(0.9, 0.9);                 
    ctx.setFillStyle('#000000'); // Changed to black ink
    ctx.setStrokeStyle('#000000');
    
    const stave = new VF.Stave(8, 8, 38);  
    stave.setConfigForLines([
        {visible: false}, {visible: false}, {visible: false}, {visible: false}, {visible: false}
    ]);
    stave.setBegBarType(VF.Barline.type.NONE);
    stave.setEndBarType(VF.Barline.type.NONE);
    stave.options.left_bar = false;
    stave.options.right_bar = false;
    stave.addClef(clefName).setContext(ctx).draw();
}

/* =========================================
   GAME 1: LINE & SPACE SMASH (v2 Cumulative Reveal & Micro-Reward Redesign)
   ========================================= */
let g1Score = 0;
let g1TotalAttempts = 0;
let g1TierIndex = 0;
const g1Tiers = [3, 6, 9, 12]; // 1 row (3), 2 rows (6), 3 rows (9), 4 rows (12)
const g1Level2PhaseNames = ['Lines', 'Spaces', 'Mixed Line & Spaces', 'Mixed Staff Numbers'];
let g1Level = 'level2';
// Reserved for the future Game 2 ledger-naming stage; not used by the current Game 1 course.
let g1OrientationRoundIndex = 0;
let g1AnchoredPositions = [];
const g1OrientationRounds = [
    { label: 'Line 1', type: 'line', index: 0 },
    { label: 'Line 2', type: 'line', index: 1 },
    { label: 'Line 3', type: 'line', index: 2 },
    { label: 'Line 4', type: 'line', index: 3 },
    { label: 'Line 5', type: 'line', index: 4 },
    { label: 'Space 1', type: 'space', index: 0 },
    { label: 'Space 2', type: 'space', index: 1 },
    { label: 'Space 3', type: 'space', index: 2 },
    { label: 'Space 4', type: 'space', index: 3 },
    { label: 'Ledger Line 1 Below', type: 'ledger' },
    { label: 'Ledger Space 1 Below', type: 'ledger' },
    { label: 'Ledger Line 2 Below', type: 'ledger' },
    { label: 'Ledger Space 2 Below', type: 'ledger' },
    { label: 'Ledger Line 3 Below', type: 'ledger' },
    { label: 'Ledger Space 3 Below', type: 'ledger' },
    { label: 'Ledger Line 1 Above', type: 'ledger' },
    { label: 'Ledger Space 1 Above', type: 'ledger' },
    { label: 'Ledger Line 2 Above', type: 'ledger' },
    { label: 'Ledger Space 2 Above', type: 'ledger' },
    { label: 'Ledger Line 3 Above', type: 'ledger' },
    { label: 'Ledger Space 3 Above', type: 'ledger' }
];
let g1Streak = 0;
let g1DudStreak = 0;
let g1BonusDuds = 0;
let g1TargetsPresent = 0;
let g1TargetsFound = 0;
let g1WrongTapsThisScreen = 0;
let g1TargetType = ''; 
let g1IsTransitioning = false;
let g1CurrentPromptLabel = '';
let g1Level2Phase = 0;
let g1LastScreenWasDud = false;
let g1PendingStageAdvance = false;
let g1CarriedStageTime = 0;
let g1LastRolledTotal = 0;
let g1TierMin = 1;
let g1TierMax = 2;
let g1RoundStartedAt = 0;
let g1SelectedStage = 'lines';
let g1StageOnly = true;
let g1IsLedgerBonus = false;
let g1LedgerBonusRound = 0;
let g1LedgerBonusTarget = null;
let g1LedgerBonusClean = true;
const g1LedgerBonusProximity = [Infinity, 4, 2];
const g1PathwayStages = [
    { id: 'lines', label: 'Lines', phase: 0 },
    { id: 'spaces', label: 'Spaces', phase: 1 },
    { id: 'mixed', label: 'Mixed', phase: 2 },
    { id: 'numbers', label: 'Staff Numbers', phase: 3 },
    { id: 'ledger', label: 'Ledger Bonus', phase: null }
];

function getG1PathwayProgress() {
    const fallback = { unlockedStages: ['lines'], stageProgress: {}, lastPosition: 'lines', totalPlays: 0 };
    try { return { ...fallback, ...JSON.parse(localStorage.getItem('koolRiffsG1Progress') || '{}') }; }
    catch (error) { return fallback; }
}

function saveG1PathwayProgress(progress) {
    localStorage.setItem('koolRiffsG1Progress', JSON.stringify(progress));
}

function renderG1Pathway() {
    const progress = getG1PathwayProgress();
    const unlocked = new Set(progress.unlockedStages || ['lines']);
    const track = document.getElementById('g1-pathway-track');
    if (!track) return;
    track.innerHTML = '';
    let recommended = progress.lastPosition || 'lines';
    if (!unlocked.has(recommended)) recommended = [...unlocked][unlocked.size - 1];
    g1SelectedStage = recommended;
    g1PathwayStages.forEach(stage => {
        const isUnlocked = unlocked.has(stage.id);
        const record = progress.stageProgress?.[stage.id];
        const node = document.createElement('button');
        node.className = `pathway-node${isUnlocked ? ' unlocked' : ' locked'}${stage.id === recommended ? ' recommended' : ''}${record?.cleared ? ' cleared' : ''}`;
        node.disabled = !isUnlocked;
        node.innerHTML = `<span class="pathway-node-icon">${isUnlocked ? stage.phase === null ? '★' : stage.phase + 1 : '•'}</span>${isUnlocked ? `<span class="pathway-node-label">${stage.label}</span>${record?.bestScore != null ? `<small>${Math.round(record.bestScore)} pts</small>` : ''}` : ''}`;
        if (isUnlocked) node.onclick = () => selectG1Stage(stage.id);
        track.appendChild(node);
    });
    selectG1Stage(g1SelectedStage, false);
}

function selectG1Stage(stageId, rerender = true) {
    const progress = getG1PathwayProgress();
    if (!(progress.unlockedStages || []).includes(stageId)) return;
    g1SelectedStage = stageId;
    progress.lastPosition = stageId;
    saveG1PathwayProgress(progress);
    if (rerender) renderG1Pathway();
    const startButton = document.getElementById('g1-pathway-start');
    if (startButton) {
        startButton.disabled = false;
        startButton.innerText = stageId === 'ledger' ? 'Start Ledger Bonus' : `Start ${g1PathwayStages.find(stage => stage.id === stageId).label}`;
    }
}

function startSelectedG1Stage() {
    if (g1SelectedStage === 'ledger') startG1LedgerBonus();
    else { switchScreenState('game1', 'g1-screen-setup'); startG1Game(); }
}

function recordG1PathwayResult(isOfficialSmash) {
    const progress = getG1PathwayProgress();
    const stage = progress.stageProgress[g1SelectedStage] || { bestScore: 0, bestTimeSec: null, timesPlayed: 0, cleared: false };
    stage.timesPlayed++;
    stage.lastPlayed = new Date().toISOString().slice(0, 10);
    stage.bestScore = Math.max(stage.bestScore || 0, Math.round(g1Score));
    stage.cleared = stage.cleared || isOfficialSmash;
    progress.stageProgress[g1SelectedStage] = stage;
    progress.totalPlays = (progress.totalPlays || 0) + 1;
    if (isOfficialSmash && g1SelectedStage !== 'ledger') {
        const nextStage = g1PathwayStages[g1PathwayStages.findIndex(stageItem => stageItem.id === g1SelectedStage) + 1];
        if (nextStage && !progress.unlockedStages.includes(nextStage.id)) progress.unlockedStages.push(nextStage.id);
    }
    saveG1PathwayProgress(progress);
}

// Reserved for the future Game 2 ledger-naming stage; keep this position model available.
function getG1OrientationPositions(config) {
    const makePosition = (note, type, index, label, height) => ({
        note,
        type,
        index,
        label,
        height
    });
    const positions = [];
    config.staffLines.forEach((note, index) => positions.push(makePosition(note, 'line', index, `Line ${index + 1}`, index * 2 + 8)));
    config.staffSpaces.forEach((note, index) => positions.push(makePosition(note, 'space', index, `Space ${index + 1}`, index * 2 + 9)));
    const ledgerPositions = [
        ['space', 'E', 'e/3', 'Ledger Space 3 Below', 1], ['line', 'F', 'f/3', 'Ledger Line 3 Below', 2],
        ['space', 'G', 'g/3', 'Ledger Space 2 Below', 3], ['line', 'A', 'a/3', 'Ledger Line 2 Below', 4],
        ['space', 'B', 'b/3', 'Ledger Space 1 Below', 5], ['line', 'C', 'c/4', 'Ledger Line 1 Below', 6],
        ['line', 'A', 'a/5', 'Ledger Line 1 Above', 10], ['space', 'B', 'b/5', 'Ledger Space 1 Above', 11],
        ['line', 'C', 'c/6', 'Ledger Line 2 Above', 12], ['space', 'D', 'd/6', 'Ledger Space 2 Above', 13],
        ['line', 'E', 'e/6', 'Ledger Line 3 Above', 14], ['space', 'F', 'f/6', 'Ledger Space 3 Above', 15]
    ];
    ledgerPositions.forEach(([type, name, key, label, height], index) => {
        positions.push(makePosition([name, key], type, index, label, height));
    });
    return positions;
}

function getG1Level2LinePositions() {
    const config = NOTE_CONFIGS.treble;
    return config.staffLines.map((note, index) => ({ note, type: 'line', index, label: `Line ${index + 1}`, height: index * 2 + 8 }))
        .concat(config.staffSpaces.map((note, index) => ({ note, type: 'space', index, label: `Space ${index + 1}`, height: index * 2 + 9 })));
}

function getG1Level2PhasePositions(config) {
    const lines = config.staffLines.map((note, index) => ({ note, type: 'line', index, label: `Line ${index + 1}`, height: index * 2 + 8 }));
    const spaces = config.staffSpaces.map((note, index) => ({ note, type: 'space', index, label: `Space ${index + 1}`, height: index * 2 + 9 }));
    if (g1Level2Phase === 0) return lines;
    if (g1Level2Phase === 1) return spaces;
    return [...lines, ...spaces];
}

function getG1Level2StaffPositions(config) {
    const lines = config.staffLines.map((note, index) => ({ note, type: 'line', index, label: `Line ${index + 1}`, height: index * 2 + 8 }));
    const spaces = config.staffSpaces.map((note, index) => ({ note, type: 'space', index, label: `Space ${index + 1}`, height: index * 2 + 9 }));
    return [...lines, ...spaces];
}

function getG1OrientationRound() {
    return g1OrientationRounds[g1OrientationRoundIndex];
}

function chooseG1OrientationTarget(config) {
    const round = getG1OrientationRound();
    const positions = getG1OrientationPositions(config);
    return positions.find(position => position.label === round.label);
}

function getG1OrientationDistractors(target, positions) {
    return positions
        .filter(position => position.label !== target.label)
        .sort((a, b) => Math.abs(a.height - target.height) - Math.abs(b.height - target.height));
}

function getG1LedgerBonusPrompt(target) {
    const side = target.height < 8 ? 'below' : 'above';
    const ordinal = target.type === 'line' ? 'line' : 'space';
    const distance = Math.ceil(Math.abs(target.height - (side === 'above' ? 9 : 7)) / 2);
    return `${ordinal[0].toUpperCase()}${ordinal.slice(1)} ${side} ${distance} ledger ${ordinal}${distance === 1 ? '' : 's'} ${side} the staff`;
}

function getG1LedgerBonusPositions(config) {
    return getG1OrientationPositions(config).filter(position => position.type === 'ledger');
}

function startG1LedgerBonus() {
    initAudio();
    g1IsLedgerBonus = true;
    g1SelectedStage = 'ledger';
    g1Score = 0; g1TotalAttempts = 0; g1TierIndex = 3; g1Streak = 0; g1BonusDuds = 0;
    g1LedgerBonusRound = 0; g1LedgerBonusTarget = null; g1LedgerBonusClean = true;
    g1SecondsLeft = 30; g1IsTransitioning = true; g1PendingStageAdvance = false;
    updateG1TrackerUI();
    switchScreenState('game1', 'g1-screen-game');
    speechRoundActive = true;
    startG1Timer();
    beginG1LedgerBonusRound();
}

function beginG1LedgerBonusRound() {
    if (g1SecondsLeft <= 0) return;
    const positions = getG1LedgerBonusPositions(NOTE_CONFIGS.treble);
    g1LedgerBonusTarget = positions[Math.floor(Math.random() * positions.length)];
    const prompt = getG1LedgerBonusPrompt(g1LedgerBonusTarget);
    const modal = document.getElementById('modal-g1-ledger-bonus');
    document.getElementById('g1-ledger-bonus-round').innerText = `Ledger Bonus Round ${g1LedgerBonusRound + 1} of 3`;
    document.getElementById('g1-ledger-bonus-target').innerText = prompt;
    document.getElementById('g1-ledger-bonus-countdown').innerText = 'Ready';
    modal.classList.add('show');
    speakLetter(prompt);

    let countdown = 3;
    g1BonusCountdownTimer = setInterval(() => {
        countdown--;
        document.getElementById('g1-ledger-bonus-countdown').innerText = countdown > 0 ? countdown : 'Go!';
        if (countdown <= 0) {
            clearInterval(g1BonusCountdownTimer);
            g1BonusCountdownTimer = null;
            modal.classList.remove('show');
            g1IsTransitioning = false;
            document.getElementById('g1-target-instruction-display').innerText = 'LEDGER BONUS';
            loadG1Grid();
        }
    }, 700);
}

function startG1Game() {
    initAudio();
    g1IsLedgerBonus = false;
    g1Level = 'level2';
    g1Score = 0; g1TotalAttempts = 0; g1TierIndex = 0; g1OrientationRoundIndex = 0; g1AnchoredPositions = []; g1Streak = 0; g1DudStreak = 0; g1BonusDuds = 0;
    g1Level2Phase = g1PathwayStages.find(stage => stage.id === g1SelectedStage)?.phase ?? 0;
    g1SecondsLeft = 30; g1IsTransitioning = false; g1RoundStartedAt = 0; g1LastScreenWasDud = false; g1PendingStageAdvance = false; g1CarriedStageTime = 0;
    updateG1TrackerUI();
    
    switchScreenState('game1', 'g1-screen-game');
    initAudio();
    speechRoundActive = true;
    
    startG1Timer();
    loadG1Grid();
}

function updateG1TrackerUI() {
    const activeCardsCount = g1Tiers[g1TierIndex];
    const rowCount = activeCardsCount / 3;
    
        const streakDots = [0, 1, 2].map(index =>
            `<span class="streak-dot${index < g1Streak ? ' active' : ''}" aria-hidden="true"></span>`
        ).join('');

        const roundLabel = g1IsLedgerBonus
            ? `Ledger Bonus ${g1LedgerBonusRound + 1}/3 | Grid: 12`
            : g1Level === 'level2'
            ? `${g1Level2PhaseNames[g1Level2Phase]} | Grid: ${activeCardsCount}`
            : `Rows: ${rowCount}/4`;
        document.getElementById('g1-tier-tracker-text').innerHTML = `${roundLabel} <span class="streak-divider">|</span> Streak: <span class="streak-dots">${streakDots}</span>`;
    document.getElementById('g1-score-text').innerText = g1Score;
    document.getElementById('g1-attempts-text').innerText = `Attempts: ${g1TotalAttempts}`;
}

function startG1Timer() {
    if (g1Timer) clearInterval(g1Timer);
    document.getElementById('g1-timer-badge').innerText = `${g1SecondsLeft}s`;
    g1Timer = setInterval(() => {
        g1SecondsLeft--;
        document.getElementById('g1-timer-badge').innerText = `${g1SecondsLeft}s`;
        if (g1SecondsLeft <= 0) { clearInterval(g1Timer); finishG1Game(); }
    }, 1000);
}

function startG1FlashTimer() {
    if (g1FlashTimer) clearTimeout(g1FlashTimer);
    const flashFill = document.getElementById('g1-flash-timer-fill');
    const flashSeconds = g1Tiers[g1TierIndex] / 3 + 2;
    setTimeout(() => { flashFill.style.transition = `width ${flashSeconds}s linear`; flashFill.style.width = '0%'; }, 50);

    g1FlashTimer = setTimeout(() => {
        if (g1SecondsLeft > 0) {
            g1IsTransitioning = true;
            document.querySelectorAll('#g1-grid-container .smash-card').forEach(c => {
                if (c.closest('.g1-row') && !c.closest('.g1-row').classList.contains('locked')) {
                    c.classList.add('flash-red');
                }
            });
            setTimeout(() => { g1IsTransitioning = false; resolveG1Screen(false); }, 300);
        }
    }, flashSeconds * 1000);
}

function triggerG1TimeBonus(amount) {
    g1SecondsLeft += amount;
    document.getElementById('g1-timer-badge').innerText = `${g1SecondsLeft}s`;
    const badge = document.getElementById('g1-timer-badge');
    badge.classList.add('flash-green');
    setTimeout(() => badge.classList.remove('flash-green'), 400);
}

function awardG1RoundBonuses() {
    const cardsInPlay = g1Tiers[g1TierIndex];
    const elapsedSeconds = (performance.now() - g1RoundStartedAt) / 1000;
    const speedThreshold = cardsInPlay / 3 + 1;

    if (g1WrongTapsThisScreen === 0 && cardsInPlay <= 6) {
        triggerG1TimeBonus(cardsInPlay === 3 ? 0.5 : 0.75);
    }
    if (elapsedSeconds <= speedThreshold) {
        triggerG1TimeBonus(0.5);
    }
}

function awardG1TierBonus(completedCards) {
    const mainClockBonus = completedCards <= 6 ? 2 : 3;
    triggerG1TimeBonus(mainClockBonus);
}

function advanceG1Streak() {
    if (g1Level === 'level2') {
        if (g1Streak < 3) return false;
        g1Streak = 0;
        awardG1TierBonus(g1Tiers[g1TierIndex]);
        if (g1TierIndex < g1Tiers.length - 1) {
            g1TierIndex++;
            return false;
        }
        if (g1StageOnly) return true;
        if (g1Level2Phase < 3) {
            g1Level2Phase++;
            g1TierIndex = 0;
            showG1StageComplete();
            return false;
        }
        return true;
    }
    if (g1Streak < 3) return false;

    g1Streak = 0;
    awardG1TierBonus(g1Tiers[g1TierIndex]);
    if (g1TierIndex < g1Tiers.length - 1) {
        g1TierIndex++;
        return false;
    }
    if (g1Level === 'level2' && g1OrientationRoundIndex < g1OrientationRounds.length - 1) {
        g1TierIndex = 0;
        g1OrientationRoundIndex++;
        g1Streak = 0;
        g1SecondsLeft = 30;
        document.getElementById('g1-timer-badge').innerText = '30s';
        return false;
    }
    return true;
}

function markG1DudSuccess() {
    document.querySelectorAll('#g1-grid-container .g1-row:not(.locked) .smash-card').forEach(card => {
        card.classList.add('dud-correct');
    });
    playSound('correct');
    g1Score++;
    g1BonusDuds++;
    const dudTimeRefund = g1Tiers[g1TierIndex] / 3 + 2;
    triggerG1TimeBonus(dudTimeRefund + 0.5);
    g1Streak++;
    return advanceG1Streak();
}

function resolveG1Screen(cleared) {
    if (g1IsLedgerBonus) {
        resolveG1LedgerBonusScreen(cleared);
        return;
    }
    let oldTierIndex = g1TierIndex;
    let finished = false;
    if (cleared) {
        g1LastScreenWasDud = false;
        if (g1TargetsPresent > 0) {
            g1Streak++;
            triggerG1TimeBonus(0.5);
            awardG1RoundBonuses();
            finished = advanceG1Streak();
        } else {
            finished = markG1DudSuccess();
        }
    } else {
        let missed = g1TargetsPresent - g1TargetsFound;
        if (missed > 0 || g1TargetsPresent > 0) {
            g1Streak = 0; g1DudStreak = 0;
        } else if (g1TargetsPresent === 0 && g1WrongTapsThisScreen > 0) {
            g1DudStreak = 0;
        } else if (g1TargetsPresent === 0) {
            finished = markG1DudSuccess();
        }
    }
    updateG1TrackerUI();
    
    // Check if a row unlocked
    if (g1TierIndex > oldTierIndex) {
        playSound('complete');
    }

    if (finished) {
        finishG1Game(true);
        return;
    }
    if (g1PendingStageAdvance) return;
    
    setTimeout(loadG1Grid, 200);
}

function resolveG1LedgerBonusScreen(cleared) {
    if (cleared) {
        g1Streak++;
        triggerG1TimeBonus(0.5);
        awardG1RoundBonuses();
        if (g1Streak >= 3) {
            g1Streak = 0;
            awardG1TierBonus(12);
        }
    } else {
        g1Streak = 0;
        g1LedgerBonusClean = false;
    }
    updateG1TrackerUI();
    g1LedgerBonusRound++;
    if (g1LedgerBonusRound >= 3) {
        if (g1LedgerBonusClean) g1Score += 10;
        finishG1Game(true);
        return;
    }
    g1IsTransitioning = true;
    beginG1LedgerBonusRound();
}

function showG1StageComplete() {
    g1PendingStageAdvance = true;
    g1CarriedStageTime = Math.max(0, Math.floor(g1SecondsLeft));
    stopAllGames();
    g1IsTransitioning = true;
    const nextStage = g1Level2PhaseNames[g1Level2Phase];
    document.getElementById('g1-stage-complete-title').innerText = `${g1Level2PhaseNames[g1Level2Phase - 1]} smashed!`;
    document.getElementById('g1-stage-complete-next').innerText = `Next up: ${nextStage}`;
    document.getElementById('g1-stage-score').innerText = g1Score;
    document.getElementById('g1-stage-bonus').innerText = g1BonusDuds;
    document.getElementById('g1-stage-time').innerText = `${g1CarriedStageTime}s`;
    document.getElementById('modal-g1-stage-complete').classList.add('show');
    playSound('complete');
}

function continueG1Stage() {
    document.getElementById('modal-g1-stage-complete').classList.remove('show');
    g1PendingStageAdvance = false;
    g1IsTransitioning = false;
    g1SecondsLeft = 30 + g1CarriedStageTime;
    g1CarriedStageTime = 0;
    document.getElementById('g1-timer-badge').innerText = `${g1SecondsLeft}s`;
    initAudio();
    speechRoundActive = true;
    startG1Timer();
    loadG1Grid();
}

function loadG1Grid() {
    if (g1SecondsLeft <= 0) return;
    g1TotalAttempts++; g1WrongTapsThisScreen = 0;
    g1RoundStartedAt = performance.now();
    
    const VF = Vex.Flow;
    const container = document.getElementById('g1-grid-container'); 
    container.innerHTML = '';
    container.className = 'smash-grid-layout';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';

    const flashFill = document.getElementById('g1-flash-timer-fill');
    flashFill.style.transition = 'none'; flashFill.style.width = '100%';

    const activeCardsCount = g1Tiers[g1TierIndex];
    const activeRowsCount = activeCardsCount / 3;

    // Define density bands per tier:
    // 3 cards (1 row): min 1, max 2
    // 6 cards (2 rows): min 2, max 4
    // 9 cards (3 rows): min 2, max 3
    // 12 cards (4 rows): min 3, max 4
    if (activeCardsCount === 3) { g1TierMin = 1; g1TierMax = 2; }
    else if (activeCardsCount === 6) { g1TierMin = 2; g1TierMax = 4; }
    else if (activeCardsCount === 9) { g1TierMin = 2; g1TierMax = 3; }
    else { g1TierMin = 3; g1TierMax = 4; }

    const clefName = document.getElementById('g1-clef-select') ? document.getElementById('g1-clef-select').value : 'treble';
    const config = NOTE_CONFIGS[clefName];
    
    let poolLines = [...config.staffLines, ...config.ledgerLines];
    let poolSpaces = [...config.staffSpaces, ...config.ledgerSpaces];
    
    let targetPool;
    let distractorPool;
    let orientationTarget = null;
    let orientationTargets = [];
    let orientationDistractors = [];
    if (g1IsLedgerBonus) {
        const ledgerPositions = getG1LedgerBonusPositions(config);
        orientationTarget = g1LedgerBonusTarget;
        orientationTargets = [orientationTarget];
        const proximity = g1LedgerBonusProximity[g1LedgerBonusRound];
        orientationDistractors = getG1OrientationDistractors(orientationTarget, ledgerPositions)
            .filter(position => Math.abs(position.height - orientationTarget.height) <= proximity);
        if (orientationDistractors.length < 3) {
            orientationDistractors = getG1OrientationDistractors(orientationTarget, ledgerPositions);
        }
        orientationDistractors = orientationDistractors.concat(
            getG1OrientationDistractors(orientationTarget, ledgerPositions)
        ).filter((position, index, positions) =>
            positions.findIndex(candidate => candidate.label === position.label) === index
        );
        updateG1TrackerUI();
    } else if (g1Level === 'level2') {
        const orientationPositions = getG1Level2PhasePositions(config);
        const allStaffPositions = getG1Level2StaffPositions(config);
        const numberedPhase = g1Level2Phase === 3;
        const typePhase = g1Level2Phase < 3;
        let targetType = null;
        if (g1Level2Phase === 0) targetType = 'line';
        else if (g1Level2Phase === 1) targetType = 'space';
        else if (typePhase) targetType = Math.random() < 0.5 ? 'line' : 'space';

        const targetPool = targetType
            ? allStaffPositions.filter(position => position.type === targetType)
            : orientationPositions;
        orientationTarget = targetPool[Math.floor(Math.random() * targetPool.length)];
        orientationTargets = numberedPhase ? [orientationTarget] : targetPool;
        const distractorTargets = orientationTargets.length > 0 ? orientationTargets : [orientationTarget];
        orientationDistractors = distractorTargets.flatMap(target => getG1OrientationDistractors(target, allStaffPositions));
        orientationDistractors = orientationDistractors.filter((position, index, positions) =>
            positions.findIndex(candidate => candidate.label === position.label) === index
        );
        const targetLabels = new Set(orientationTargets.map(position => position.label));
        const randomFill = orientationPositions
            .filter(position => !targetLabels.has(position.label) && !orientationDistractors.some(candidate => candidate.label === position.label))
            .sort(() => Math.random() - 0.5);
        orientationDistractors.push(...randomFill);
        const prompt = numberedPhase ? `SMASH ${orientationTarget.label}` : `SMASH A ${targetType.toUpperCase()}`;
        g1CurrentPromptLabel = prompt;
        document.getElementById('g1-target-instruction-display').innerText = prompt.toUpperCase();
        speakLetter(numberedPhase ? orientationTarget.label : `a ${targetType}`);
        updateG1TrackerUI();
    } else {
        g1TargetType = Math.random() > 0.5 ? 'line' : 'space';
        document.getElementById('g1-target-instruction-display').innerText = `SMASH ${g1TargetType.toUpperCase()}S`;
        speakLetter(g1TargetType === 'line' ? 'lines' : 'spaces');
    }
    
    let isDud = !g1LastScreenWasDud && Math.random() < 0.15;
    g1LastScreenWasDud = isDud;
    
    // Row allocation algorithm per v2 brief:
    let totalBudget = 0;
    if (isDud) {
        g1LastRolledTotal = 0;
        g1TargetsPresent = 0;
    } else {
        g1LastRolledTotal = Math.random() < 0.5 ? g1TierMin : g1TierMax; 
        g1TargetsPresent = g1LastRolledTotal;
    }

    let rowTargets = [0, 0, 0, 0];
    if (!isDud && g1TargetsPresent > 0) {
        let activeRowIndices = [];
        for(let r=0; r<activeRowsCount; r++) activeRowIndices.push(r);
        
        activeRowIndices.sort(() => Math.random() - 0.5);
        
        let remaining = g1TargetsPresent;
        for (let i = 0; i < activeRowIndices.length; i++) {
            let rIdx = activeRowIndices[i];
            if (i === activeRowIndices.length - 1) {
                rowTargets[rIdx] = Math.min(2, remaining);
            } else {
                let maxPossible = Math.min(2, remaining);
                let assigned = Math.floor(Math.random() * (maxPossible + 1));
                rowTargets[rIdx] = assigned;
                remaining -= assigned;
            }
        }
        let safety = 0;
        while (remaining > 0 && safety < 10) {
            for (let rIdx of activeRowIndices) {
                if (rowTargets[rIdx] < 2 && remaining > 0) {
                    rowTargets[rIdx]++;
                    remaining--;
                }
            }
            safety++;
        }
        g1TargetsPresent = rowTargets.reduce((a, b) => a + b, 0);
        g1LastRolledTotal = g1TargetsPresent;
    }
    g1TargetsFound = 0;

    if (g1Level !== 'level2') {
        targetPool = g1TargetType === 'line' ? poolLines : poolSpaces;
        distractorPool = g1TargetType === 'line' ? poolSpaces : poolLines;
    }

    // Build all 4 rows (12 cards total) for cumulative reveal inside loadG1Grid
    for (let r = 0; r < 4; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'g1-row';
        
        const isRowActive = (r < activeRowsCount);
        
        if (!isRowActive) {
            rowEl.classList.add('locked');
        } else if (r === activeRowsCount - 1 && g1TierIndex > 0) {
            rowEl.classList.add('unlock-pulse');
        }

        let numTargetsInRow = rowTargets[r];
        let rowNotes = [];
        for (let i = 0; i < numTargetsInRow; i++) {
            const selectedTarget = g1Level === 'level2'
                ? orientationTargets[i % orientationTargets.length]
                : null;
            const targetNote = g1Level === 'level2' ? selectedTarget.note : targetPool[Math.floor(Math.random() * targetPool.length)];
            const targetLabel = g1Level === 'level2' ? selectedTarget.label : targetNote[0];
            rowNotes.push({ note: targetNote, label: targetLabel, isTarget: true });
        }
        let distractorIndex = 0;
        for (let i = numTargetsInRow; i < 3; i++) {
            let distractor;
            if (g1Level === 'level2') {
                distractor = orientationDistractors[distractorIndex % orientationDistractors.length];
                distractorIndex++;
                rowNotes.push({ note: distractor.note, label: distractor.label, isTarget: false });
            } else {
                distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)];
                rowNotes.push({ note: distractor, label: distractor[0], isTarget: false });
            }
        }
        rowNotes.sort(() => Math.random() - 0.5);

        rowNotes.forEach(item => {
            const card = document.createElement('div');
            card.className = 'smash-card small-card';
            
            if (isRowActive) {
                card.onclick = () => handleG1Click(card, item.isTarget, item.label);
            }
            
            const innerDiv = document.createElement('div');
            card.appendChild(innerDiv);
            rowEl.appendChild(card);
            
            renderSmashCard(innerDiv, clefName, item.note[1], isRowActive);
        });

        container.appendChild(rowEl);
    }

    startG1FlashTimer();
}

function handleG1Click(cardElement, isTarget, pitchName) {
    if (g1SecondsLeft <= 0 || g1IsTransitioning || cardElement.classList.contains('correct')) return;
    
    if (isTarget) {
        playSound('correct'); cardElement.classList.add('correct');
        g1Score += g1IsLedgerBonus ? 2 : 1; g1TargetsFound++; updateG1TrackerUI();
        
        if (g1TargetsFound >= g1TargetsPresent) {
            if (g1FlashTimer) clearTimeout(g1FlashTimer);
            g1IsTransitioning = true;
            setTimeout(() => { g1IsTransitioning = false; resolveG1Screen(true); }, 150);
        }
    } else {
        playSound('wrong'); g1WrongTapsThisScreen++;
        if (g1IsLedgerBonus) g1LedgerBonusClean = false;
        cardElement.classList.remove('incorrect'); void cardElement.offsetWidth; cardElement.classList.add('incorrect');
        setTimeout(() => cardElement.classList.remove('incorrect'), 300);
    }
}

function finishG1Game(isOfficialSmash = false) {
    stopAllGames();
    recordG1PathwayResult(isOfficialSmash);
    const summaryCard = document.getElementById('g1-summary-card');
    summaryCard.classList.toggle('g1-victory', isOfficialSmash);
    document.getElementById('g1-summary-title').innerText = isOfficialSmash ? '🏆 YOU SMASHED IT!' : '🎉 YOU SMASHED!';
    switchScreenState('game1', 'g1-screen-summary');
    if (isOfficialSmash) {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        playSound('complete');
        setTimeout(() => playSound('complete'), 450);
    }
    document.getElementById('g1-final-score').innerText = g1Score;
    if (g1Level === 'level2') {
        document.getElementById('g1-final-tier-label').innerText = 'Staff Numbering Progress';
        const pathwaySteps = [...document.querySelectorAll('#g1-pathway .g1-pathway-step')];
        pathwaySteps.forEach((step, index) => {
            step.classList.remove('completed', 'current', 'locked');
            if (isOfficialSmash || index < g1Level2Phase) step.classList.add('completed');
            else if (index === g1Level2Phase) step.classList.add('current');
            else step.classList.add('locked');
        });
        document.getElementById('g1-summary-progress-title').innerText = isOfficialSmash
            ? 'Staff Numbering pathway complete!'
            : `${g1Level2PhaseNames[g1Level2Phase]} is next to master`;
        document.getElementById('g1-final-tier').innerText = isOfficialSmash
            ? '4/4 stages complete'
            : `${g1Level2Phase}/4 stages complete`;
    } else {
        document.getElementById('g1-summary-progress-title').innerText = 'Your Smash progress';
        document.getElementById('g1-final-tier-label').innerText = 'Highest Grid Reached';
        document.getElementById('g1-final-tier').innerText = `${g1Tiers[g1TierIndex] / 3} Rows (${g1Tiers[g1TierIndex]} Cards)`;
    }
    document.getElementById('g1-final-bonus').innerText = g1BonusDuds;
}


/* =========================================
   GAME 2: NOTE NAME SMASH (Fixed Width Stave)
   ========================================= */
let g2Score = 0; let g2TotalAttempts = 0; let g2TierIndex = 0; const g2Tiers = [3, 6, 9, 12];
const g2PhaseNames = ['Lines', 'Spaces', 'Mixed Staff', 'Ledger Notes'];
let g2Phase = 0; let g2LastScreenWasDud = false; let g2PendingStageAdvance = false; let g2CarriedStageTime = 0;
let g2Streak = 0; let g2DudStreak = 0; let g2TargetsPresent = 0; let g2TargetsFound = 0; let g2WrongTapsThisScreen = 0;
let g2TargetNote = ''; let g2Watchlist = {}; let g2IsTransitioning = false; let g2RoundStartedAt = 0;

function toggleG2HelperModal() {
    const modal = document.getElementById('g2-helper-modal');
    if (!modal) return;
    const isOpening = !modal.classList.contains('show');
    if (isOpening) {
        stopAllGames();
        g2IsTransitioning = true;
        modal.classList.add('show');
        setTimeout(renderHelperSheetGraphics, 50);
    } else {
        modal.classList.remove('show');
        g2IsTransitioning = false;
        speechRoundActive = true;
        startG2Timer();
        startG2FlashTimer();
    }
}

function showG2Watchlist() {
    const modal = document.getElementById('modal-watchlist-g2');
    const list = document.getElementById('watchlist-display-list-g2');
    list.innerHTML = '';
    const items = Object.keys(g2Watchlist);
    if(items.length === 0) list.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">Watchlist is empty.</div>';
    else {
        items.forEach(note => {
            const badge = document.createElement('div'); badge.className = 'watchlist-item';
            badge.innerText = `${note} (${g2Watchlist[note]} left)`; list.appendChild(badge);
        });
    }
    modal.classList.add('show');
}
function hideG2Watchlist() { document.getElementById('modal-watchlist-g2').classList.remove('show'); }
function updateG2WatchlistBadge() { document.getElementById('g2-watchlist-count').innerText = Object.keys(g2Watchlist).length; }

function setupG2Helpers(round) {
    const helperModal = document.getElementById('g2-helper-modal');
    const linesCanvas = document.getElementById('g2-helper-lines-canvas');
    const spacesCanvas = document.getElementById('g2-helper-spaces-canvas');

    linesCanvas.style.display = 'none'; spacesCanvas.style.display = 'none';
    const helperToggle = document.getElementById('g2-helper-toggle');
    if(round === '1') { linesCanvas.style.display = 'block'; helperToggle.style.display = 'flex'; } 
    else if (round === '2') { spacesCanvas.style.display = 'block'; helperToggle.style.display = 'flex'; }
    else { helperToggle.style.display = 'none'; }
    helperModal.classList.remove('show');
    setTimeout(renderHelperSheetGraphics, 50);
}

function startG2Game() {
    initAudio();
    setupG2Helpers('1');

    g2Score = 0; g2TotalAttempts = 0; g2TierIndex = 0; g2Phase = 0; g2Streak = 0; g2DudStreak = 0;
    g2SecondsLeft = 60; g2Watchlist = {}; g2IsTransitioning = false; g2LastScreenWasDud = false; g2PendingStageAdvance = false; g2CarriedStageTime = 0;
    updateG2WatchlistBadge(); updateG2TrackerUI();
    
    switchScreenState('game2', 'g2-screen-game');
    speechRoundActive = true;
    
    const clefName = document.getElementById('g2-clef-select').value;
    renderFloatingClef('g2-clef-display', clefName);

    startG2Timer(); loadG2Grid();
}

function updateG2TrackerUI() {
    document.getElementById('g2-tier-tracker-text').innerText = `${g2PhaseNames[g2Phase]} | Grid: ${g2Tiers[g2TierIndex]} | Streak: ${g2Streak}/3`;
    document.getElementById('g2-score-text').innerText = g2Score;
    document.getElementById('g2-attempts-text').innerText = `Attempts: ${g2TotalAttempts}`;
}
        const streakDots = [0, 1, 2].map(index =>
            `<span class="streak-dot${index < g2Streak ? ' active' : ''}" aria-hidden="true"></span>`
        ).join('');
        document.getElementById('g2-tier-tracker-text').innerHTML += ` | Streak: <span class="streak-dots">${streakDots}</span>`;
function startG2Timer() {
    if (g2Timer) clearInterval(g2Timer);
    document.getElementById('g2-timer-badge').innerText = `${g2SecondsLeft}s`;
    g2Timer = setInterval(() => {
        g2SecondsLeft--;
        document.getElementById('g2-timer-badge').innerText = `${g2SecondsLeft}s`;
        if (g2SecondsLeft <= 0) { clearInterval(g2Timer); finishG2Game(false); }
    }, 1000);
}

function startG2FlashTimer() {
    if (g2FlashTimer) clearTimeout(g2FlashTimer);
    const flashFill = document.getElementById('g2-flash-timer-fill');
    const flashSeconds = g2Tiers[g2TierIndex] / 3 + 2;
    setTimeout(() => { flashFill.style.transition = `width ${flashSeconds}s linear`; flashFill.style.width = '0%'; }, 50);

    g2FlashTimer = setTimeout(() => {
        if (g2SecondsLeft > 0) {
            g2IsTransitioning = true;
            document.querySelectorAll('#g2-grid-container .smash-card').forEach(c => c.classList.add('flash-red'));
            setTimeout(() => { g2IsTransitioning = false; resolveG2Screen(false); }, 300);
        }
    }, flashSeconds * 1000);
}

function triggerG2TimeBonus(amount) {
    g2SecondsLeft += amount;
    document.getElementById('g2-timer-badge').innerText = `${g2SecondsLeft}s`;
    const badge = document.getElementById('g2-timer-badge');
    badge.classList.add('flash-green');
    setTimeout(() => badge.classList.remove('flash-green'), 400);
}

function awardG2ScreenBonuses() {
    const cardsInPlay = g2Tiers[g2TierIndex];
    if (g2WrongTapsThisScreen === 0 && cardsInPlay <= 6) triggerG2TimeBonus(cardsInPlay === 3 ? 0.5 : 0.75);
    if (g2RoundStartedAt && (performance.now() - g2RoundStartedAt) / 1000 <= cardsInPlay / 3 + 1) triggerG2TimeBonus(0.5);
}

function awardG2TierBonus() {
    triggerG2TimeBonus(g2Tiers[g2TierIndex] <= 6 ? 2 : 3);
}

function showG2StageComplete() {
    g2PendingStageAdvance = true;
    g2CarriedStageTime = Math.max(0, Math.floor(g2SecondsLeft));
    stopAllGames();
    g2IsTransitioning = true;
    document.getElementById('g2-stage-complete-title').innerText = `${g2PhaseNames[g2Phase]} smashed!`;
    document.getElementById('g2-stage-complete-next').innerText = `Next up: ${g2PhaseNames[g2Phase + 1]}`;
    document.getElementById('g2-stage-score').innerText = g2Score;
    document.getElementById('g2-stage-bonus').innerText = `${g2Tiers[g2TierIndex] <= 6 ? 2 : 3}s`;
    document.getElementById('g2-stage-time').innerText = `${g2CarriedStageTime}s`;
    document.getElementById('modal-g2-stage-complete').classList.add('show');
    playSound('complete');
}

function continueG2Stage() {
    document.getElementById('modal-g2-stage-complete').classList.remove('show');
    g2PendingStageAdvance = false; g2IsTransitioning = false;
    g2SecondsLeft = 60 + g2CarriedStageTime; g2CarriedStageTime = 0;
    g2TierIndex = 0; g2SecondsLeft = Math.max(g2SecondsLeft, 30);
    document.getElementById('g2-timer-badge').innerText = `${g2SecondsLeft}s`;
    setupG2Helpers(g2Phase === 0 ? '1' : g2Phase === 1 ? '2' : '3');
    initAudio(); speechRoundActive = true; updateG2TrackerUI(); startG2Timer(); loadG2Grid();
}

function resolveG2Screen(cleared) {
    if (cleared) {
        if (g2TargetsPresent > 0) {
            g2Streak++;
            awardG2ScreenBonuses();
            g2LastScreenWasDud = false;
            if (g2Watchlist[g2TargetNote]) {
                g2Watchlist[g2TargetNote]--;
                if(g2Watchlist[g2TargetNote] <= 0) delete g2Watchlist[g2TargetNote];
                updateG2WatchlistBadge();
            }
            if (g2Streak >= 3) {
                g2Streak = 0;
                awardG2TierBonus();
                if (g2TierIndex < g2Tiers.length - 1) g2TierIndex++;
                else if (g2Phase < g2PhaseNames.length - 1) { g2Phase++; g2TierIndex = 0; showG2StageComplete(); return; }
                else { finishG2Game(true); return; }
            }
        }
    } else {
        let missed = g2TargetsPresent - g2TargetsFound;
        if (missed > 0) {
            g2Streak = 0; g2LastScreenWasDud = false; g2Watchlist[g2TargetNote] = 3; updateG2WatchlistBadge(); g2DudStreak = 0;
        } else if (g2TargetsPresent === 0 && g2WrongTapsThisScreen === 0) {
            document.querySelectorAll('#g2-grid-container .smash-card').forEach(card => {
                card.classList.add('dud-correct', 'screen-complete');
            });
            playSound('correct');
            g2DudStreak++; g2Score++; triggerG2TimeBonus(g2Tiers[g2TierIndex] / 3 + 2); g2LastScreenWasDud = true;
        } else if (g2TargetsPresent === 0 && g2WrongTapsThisScreen > 0) {
            g2DudStreak = 0;
        }
    }
    updateG2TrackerUI(); if (!g2PendingStageAdvance) setTimeout(loadG2Grid, 350);
}

function loadG2Grid() {
    if (g2SecondsLeft <= 0) return;
    g2TotalAttempts++; g2WrongTapsThisScreen = 0;
    g2RoundStartedAt = performance.now();
    
    const VF = Vex.Flow;
    const container = document.getElementById('g2-grid-container'); container.innerHTML = '';
    const flashFill = document.getElementById('g2-flash-timer-fill');
    flashFill.style.transition = 'none'; flashFill.style.width = '100%';

    let cardCount = g2Tiers[g2TierIndex];
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';

    const clefName = document.getElementById('g2-clef-select').value;
    const config = NOTE_CONFIGS[clefName];
    
    let pool = [];
    if (g2Phase === 0) pool = [...config.staffLines];
    else if (g2Phase === 1) pool = [...config.staffSpaces];
    else if (g2Phase === 2) pool = [...config.staffLines, ...config.staffSpaces];
    else pool = [...config.staffLines, ...config.staffSpaces, ...config.ledgerLines, ...config.ledgerSpaces];
    
    const targetLetters = [...new Set(pool.map(n => n[0].toUpperCase()))];
    g2TargetNote = targetLetters[Math.floor(Math.random() * targetLetters.length)];
    
    document.getElementById('g2-target-note-display').innerText = `SMASH ${g2TargetNote}`;
    speakLetter(g2TargetNote);
    
    let isDud = !g2LastScreenWasDud && Math.random() < 0.15;
    g2TargetsPresent = isDud ? 0 : (cardCount === 3 ? 1 : cardCount === 6 ? 2 : cardCount === 9 ? (Math.floor(Math.random() * 2) + 2) : Math.floor(Math.random() * 2) + 3);
    if (g2TargetsPresent > cardCount) g2TargetsPresent = cardCount;
    g2TargetsFound = 0;
    
    let targetPool = pool.filter(n => n[0].toUpperCase() === g2TargetNote);
    let distractorPool = pool.filter(n => n[0].toUpperCase() !== g2TargetNote);
    if(targetPool.length === 0) { g2TargetsPresent = 0; isDud = true; }

    let gridNotes = [];
    for(let i=0; i<g2TargetsPresent; i++) gridNotes.push(targetPool[Math.floor(Math.random() * targetPool.length)]);
    for(let i=g2TargetsPresent; i<cardCount; i++) gridNotes.push(distractorPool[Math.floor(Math.random() * distractorPool.length)]);
    gridNotes.sort(() => Math.random() - 0.5);

    gridNotes.forEach((n) => {
        const card = document.createElement('div');
        card.className = 'smash-card small-card';
        card.onclick = () => handleG2Click(card, n[0].toUpperCase());
        
        const innerDiv = document.createElement('div'); card.appendChild(innerDiv); container.appendChild(card);
        renderSmashCard(innerDiv, config.clef, n[1]);
    });
    startG2FlashTimer();
}

function handleG2Click(cardElement, letter) {
    if (g2SecondsLeft <= 0 || g2IsTransitioning || cardElement.classList.contains('correct')) return;
    
    if (letter === g2TargetNote) {
        playSound('correct'); cardElement.classList.add('correct');
        g2Score++; g2TargetsFound++; updateG2TrackerUI();
        if (g2TargetsFound >= g2TargetsPresent) {
            if (g2FlashTimer) clearTimeout(g2FlashTimer);
            document.querySelectorAll('#g2-grid-container .smash-card').forEach(card => card.classList.add('screen-complete'));
            g2IsTransitioning = true;
            setTimeout(() => { g2IsTransitioning = false; resolveG2Screen(true); }, 350);
        }
    } else {
        playSound('wrong'); g2WrongTapsThisScreen++;
        g2Watchlist[g2TargetNote] = 3; updateG2WatchlistBadge();
        cardElement.classList.remove('incorrect'); void cardElement.offsetWidth; cardElement.classList.add('incorrect');
        setTimeout(() => cardElement.classList.remove('incorrect'), 300);
    }
}

function finishG2Game(isGraduation) {
    stopAllGames(); playSound('complete'); switchScreenState('game2', 'g2-screen-summary');
    const pbKey = 'round' + (g2Phase + 1);
    let isNewPb = false;
    if (g2Score > personalBests.game2[pbKey]) { personalBests.game2[pbKey] = g2Score; isNewPb = true; }
    
    document.getElementById('g2-final-score').innerText = g2Score;
    document.getElementById('g2-final-attempts').innerText = g2TotalAttempts;
    const pathwaySteps = [...document.querySelectorAll('#g2-pathway .g1-pathway-step')];
    pathwaySteps.forEach((step, index) => {
        step.classList.remove('completed', 'current', 'locked');
        if (isGraduation || index < g2Phase) step.classList.add('completed');
        else if (index === g2Phase) step.classList.add('current');
        else step.classList.add('locked');
    });
    document.getElementById('g2-summary-progress-title').innerText = isGraduation ? 'Note Name pathway complete!' : `${g2PhaseNames[g2Phase]} is next to master`;
    document.getElementById('g2-final-tier').innerText = isGraduation ? '4/4 stages complete' : `${g2Phase}/4 stages complete`;
    document.getElementById('g2-personal-best').innerText = `${personalBests.game2[pbKey]} ${isNewPb ? '(New PB! 🎉)' : ''}`;

    const title = document.getElementById('g2-summary-title');

    title.innerText = isGraduation ? '🏆 YOU SMASHED IT!' : '🎉 YOU SMASHED!';
}

/* =========================================
   GAME 3: NOTEQUEST 
   ========================================= */
let isPianoInput = true; let watchListQueue = []; let currentFlashcardPitch = null; let currentMode = 'drill-both';
let currentTier = 1; let currentStreak = 0; let highestTierCompleted = 0; let score = 0; let totalAttempts = 0; let correctAttempts = 0;
let currentExpectedNotes = []; let activeInputIndex = 0;

function getTimeLimitForTier(tier) { return tier + 1; }

function handleModeChange() {
    const mode = document.getElementById('mode-select').value;
    const speedOpt = document.getElementById('mode-select').options[3];
    if(mode === 'speed') speedOpt.text = "Speed Round: Lines & Spaces (Forced)";
    else speedOpt.text = "Speed Round: Progressive Sprint";
}

function toggleInputMethod() {
    isPianoInput = !isPianoInput;
    const piano = document.getElementById('piano-container'); const thumbs = document.getElementById('thumb-stacks-container'); const btn = document.getElementById('input-toggle-btn');
    if (isPianoInput) { piano.style.display = 'flex'; thumbs.style.display = 'none'; btn.innerText = '🔄 Switch to Thumb Stacks'; } 
    else { piano.style.display = 'none'; thumbs.style.display = 'flex'; btn.innerText = '🔄 Switch to Piano Keyboard'; }
}

function toggleG3HelperModal() {
    const modal = document.getElementById('helper-sheet-modal');
    if(modal) { modal.classList.toggle('show'); if(modal.classList.contains('show')) setTimeout(renderHelperSheetGraphics, 50); }
}

function applyBottomAnnotation(text) { const VF = Vex.Flow; const anno = new VF.Annotation(text); anno.setVerticalJustification(3); return anno; }

function renderHelperSheetGraphics() {
    try {
        const VF = Vex.Flow; const clefSelect = document.getElementById('clef-select') || document.getElementById('g2-clef-select');
        const currentClef = clefSelect ? clefSelect.value : 'treble';
        const config = NOTE_CONFIGS[currentClef];
        
        ['helper-lines-canvas', 'g2-helper-lines-canvas'].forEach(id => {
            const linesDiv = document.getElementById(id);
            if (linesDiv) {
                linesDiv.innerHTML = ''; const renLines = new VF.Renderer(linesDiv, VF.Renderer.Backends.SVG); renLines.resize(250, 100);
                const ctxLines = renLines.getContext(); ctxLines.scale(0.68, 0.68); 
                const stave1 = new VF.Stave(0, 5, 360).addClef(currentClef).setContext(ctxLines).draw();
                const lineNotes = config.staffLines.map(n => new VF.StaveNote({ clef: currentClef, keys: [n[1]], duration: 'q', stem_direction: 1 }).addAnnotation(0, applyBottomAnnotation(n[0])));
                VF.Formatter.FormatAndDraw(ctxLines, stave1, lineNotes);
                linesDiv.querySelectorAll('svg line, svg path').forEach(line => { line.setAttribute('stroke', '#000000'); line.setAttribute('stroke-width', '1.3'); });
            }
        });

        ['helper-spaces-canvas', 'g2-helper-spaces-canvas'].forEach(id => {
            const spacesDiv = document.getElementById(id);
            if (spacesDiv) {
                spacesDiv.innerHTML = ''; const renSpaces = new VF.Renderer(spacesDiv, VF.Renderer.Backends.SVG); renSpaces.resize(190, 100);
                const ctxSpaces = renSpaces.getContext(); ctxSpaces.scale(0.68, 0.68);
                const stave2 = new VF.Stave(0, 5, 275).addClef(currentClef).setContext(ctxSpaces).draw();
                const spaceNotes = config.staffSpaces.map(n => new VF.StaveNote({ clef: currentClef, keys: [n[1]], duration: 'q', stem_direction: 1 }).addAnnotation(0, applyBottomAnnotation(n[0])));
                VF.Formatter.FormatAndDraw(ctxSpaces, stave2, spaceNotes);
                spacesDiv.querySelectorAll('svg line, svg path').forEach(line => { line.setAttribute('stroke', '#000000'); line.setAttribute('stroke-width', '1.3'); });
            }
        });
    } catch(e) {}
}

function updateG3TrackerUI() {
    if(currentMode === 'speed') {
        document.getElementById('tier-tracker-text').innerText = `Tier ${currentTier}/4 | Streak: ${currentStreak}/3`;
        document.getElementById('flash-timer-bar').style.display = 'block';
    } else {
        document.getElementById('tier-tracker-text').innerText = `Drill Mode | Target: 30pts`;
        document.getElementById('flash-timer-bar').style.display = 'none';
    }
    document.getElementById('score-text').innerText = score;
}

function startG3Game() {
    initAudio(); score = 0; totalAttempts = 0; correctAttempts = 0; secondsLeft = 60; watchListQueue = [];
    currentTier = 1; currentStreak = 0; highestTierCompleted = 0;
    currentMode = document.getElementById('mode-select').value;
    updateG3TrackerUI();
    switchScreenState('game3', 'g3-screen-game'); start60SecondTimer(); loadNextCard();
}

function start60SecondTimer() {
    if (gameTimer) clearInterval(gameTimer);
    const fillBar = document.getElementById('progress-bar');
    if(fillBar) { fillBar.style.width = '100%'; fillBar.style.backgroundColor = 'var(--accent-green)'; }
    document.getElementById('g3-timer-badge').innerText = `${secondsLeft}s`;

    gameTimer = setInterval(() => {
        secondsLeft--;
        document.getElementById('g3-timer-badge').innerText = `${secondsLeft}s`;
        if(fillBar) fillBar.style.width = `${(secondsLeft / 60) * 100}%`;
        if (secondsLeft <= 20 && secondsLeft > 10) fillBar.style.backgroundColor = '#ffc800'; 
        else if (secondsLeft <= 10) fillBar.style.backgroundColor = 'var(--accent-red)'; 
        if (secondsLeft <= 0) { clearInterval(gameTimer); finishG3Round(); }
    }, 1000);
}

function loadNextCard() {
    if (secondsLeft <= 0) return;
    if (breakOutTimer) clearTimeout(breakOutTimer);
    document.getElementById('card-canvas-wrapper').classList.remove('timeout');
    
    if(currentMode === 'speed') {
        const flashFill = document.getElementById('flash-timer-fill');
        flashFill.style.transition = 'none'; flashFill.style.width = '100%';
    }
    
    try {
        const VF = Vex.Flow;
        const canvasContainer = document.getElementById('score-canvas'); canvasContainer.innerHTML = '';
        const inputsContainer = document.getElementById('inputs-container'); inputsContainer.innerHTML = '';
        
        const clefName = document.getElementById('clef-select').value;
        const config = NOTE_CONFIGS[clefName];
        const level = document.getElementById('level-select').value;
        
        let combinedPool = [];
        if (currentMode === 'speed') {
            combinedPool = [...config.staffLines, ...config.staffSpaces];
            if(level >= 2) combinedPool = combinedPool.concat([...config.ledgerLines, ...config.ledgerSpaces]);
        } else {
            if(currentMode === 'drill-lines' || currentMode === 'drill-both') {
                combinedPool = combinedPool.concat(config.staffLines); if(level >= 2) combinedPool = combinedPool.concat(config.ledgerLines);
            }
            if(currentMode === 'drill-spaces' || currentMode === 'drill-both') {
                combinedPool = combinedPool.concat(config.staffSpaces); if(level >= 2) combinedPool = combinedPool.concat(config.ledgerSpaces);
            }
        }

        const renderer = new VF.Renderer(canvasContainer, VF.Renderer.Backends.SVG);
        const rendererWidth = Math.min(320, Math.max(260, canvasContainer.clientWidth || 320));
        renderer.resize(rendererWidth, 145);
        const context = renderer.getContext();
        const staveWidth = Math.min(260, rendererWidth - 24);
        const staveX = (rendererWidth - staveWidth) / 2;
        const stave = new VF.Stave(staveX, 25, staveWidth); stave.addClef(config.clef);
        if(currentMode.includes('drill') || currentTier === 1) { 
            stave.setEndBarType(VF.Barline.type.NONE); stave.setBegBarType(VF.Barline.type.NONE); stave.options.left_bar = false; stave.options.right_bar = false; stave.setNoteStartX(115); 
        } else { stave.addTimeSignature("4/4"); }
        stave.setContext(context).draw();

        currentExpectedNotes = []; let staveNotes = []; let durations = []; let formatWidth = 165;
        if(currentMode.includes('drill')) { durations = ["w"]; formatWidth = 40; } 
        else {
            if (currentTier === 1) { durations = ["w"]; formatWidth = 40; } else if (currentTier === 2) { durations = ["h", "h"]; formatWidth = 100; }
            else if (currentTier === 3) { durations = ["h", "q", "q"]; formatWidth = 140; } else if (currentTier === 4) { durations = ["q", "q", "q", "q"]; formatWidth = 165; }
        }

        let lastPitchKey = null;
        for (let dur of durations) {
            let chosenNote;
            if (currentMode.includes('drill') && watchListQueue.length > 0 && Math.random() < 0.4) chosenNote = watchListQueue[0];
            else { let avail = combinedPool.filter(p => p[1] !== lastPitchKey); chosenNote = avail[Math.floor(Math.random() * avail.length)]; }
            lastPitchKey = chosenNote[1];
            if (durations.length === 1) currentFlashcardPitch = chosenNote[1];
            // 3. Add auto_stem: true so VexFlow handles standard stem directions
            staveNotes.push(new VF.StaveNote({ 
                clef: config.clef, 
                keys: [chosenNote[1]], 
                duration: dur, 
                auto_stem: true 
            })); 
            currentExpectedNotes.push(chosenNote[0]);
        }

        let voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(staveNotes);
        new VF.Formatter().joinVoices([voice]).format([voice], formatWidth);
        voice.draw(context, stave);

        currentExpectedNotes.forEach((_, idx) => {
            const cell = document.createElement('div'); cell.className = 'input-cell';
            const input = document.createElement('input'); input.type = 'text'; input.readOnly = true; input.id = `box-${idx}`;
            cell.appendChild(input); inputsContainer.appendChild(cell);
        });
        activeInputIndex = 0; setActiveBox(0);

        if(currentMode === 'speed') startFlashcardTimer(getTimeLimitForTier(currentTier));
    } catch (err) {}
}

function startFlashcardTimer(seconds) {
    const flashFill = document.getElementById('flash-timer-fill');
    setTimeout(() => { flashFill.style.transition = `width ${seconds}s linear`; flashFill.style.width = '0%'; }, 50);

    breakOutTimer = setTimeout(() => {
        if (secondsLeft > 0) {
            playSound('timeout'); document.getElementById('card-canvas-wrapper').classList.add('timeout'); currentStreak = 0; updateG3TrackerUI(); 
            currentExpectedNotes.forEach((val, idx) => {
                const box = document.getElementById(`box-${idx}`); if (box && !box.classList.contains('correct')) { box.value = val; box.style.color = 'var(--accent-red)'; }
            });
            setTimeout(loadNextCard, 800);
        }
    }, seconds * 1000);
}

function setActiveBox(idx) {
    document.querySelectorAll('.input-cell input').forEach(inp => inp.classList.remove('active-box'));
    const target = document.getElementById(`box-${idx}`); if (target) { activeInputIndex = idx; target.classList.add('active-box'); }
}

function handleKeypadInput(letter) {
    if (secondsLeft <= 0) return;
    const input = document.getElementById(`box-${activeInputIndex}`); if (!input) return;

    input.value = letter; const correctVal = currentExpectedNotes[activeInputIndex].toUpperCase(); totalAttempts++;

    if (letter === correctVal) {
        playSound('correct'); input.classList.remove('incorrect'); input.classList.add('correct'); correctAttempts++;
        if (currentMode.includes('drill') && watchListQueue.length > 0 && watchListQueue[0][1] === currentFlashcardPitch) watchListQueue.shift(); 
        
        if (activeInputIndex < currentExpectedNotes.length - 1) setActiveBox(activeInputIndex + 1); 
        else { 
            if (breakOutTimer) clearTimeout(breakOutTimer);
            score += currentTier; 
            if (currentMode === 'speed') {
                currentStreak++;
                if (currentStreak >= 3) { highestTierCompleted = Math.max(highestTierCompleted, currentTier); if (currentTier < 4) { currentTier++; currentStreak = 0; } else { currentStreak = 0; } }
            } else if (currentMode.includes('drill') && score >= 30 && (correctAttempts/totalAttempts >= 0.95)) {
                finishG3Round(true); return; 
            }
            updateG3TrackerUI(); setTimeout(loadNextCard, 200); 
        }
    } else {
        playSound('wrong');
        if (currentMode === 'speed') currentStreak = 0; 
        else { let existingErr = watchListQueue.find(e => e[1] === currentFlashcardPitch); if (!existingErr) watchListQueue.push([correctVal, currentFlashcardPitch]); }
        input.classList.remove('correct'); input.classList.remove('incorrect'); void input.offsetWidth; input.classList.add('incorrect');
        setTimeout(() => { input.value = ''; input.classList.remove('incorrect'); }, 300);
    }
}

function finishG3Round(isGraduation = false) {
    stopAllGames(); playSound('complete'); switchScreenState('game3', 'g3-screen-summary');
    
    let isNewPb = false;
    if (score > personalBests.game3[currentMode]) { personalBests.game3[currentMode] = score; isNewPb = true; }

    let accuracy = totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100);
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-accuracy').innerText = `${accuracy}%`;
    document.getElementById('g3-personal-best').innerText = `${personalBests.game3[currentMode]} ${isNewPb ? '(New PB! 🎉)' : ''}`;
    
    let medal = 'Keep Practising! 💪'; 
    const autoProgContainer = document.getElementById('g3-auto-progress-container');
    const title = document.getElementById('g3-summary-title');
    
    if (currentMode === 'speed') {
        document.getElementById('tier-result').style.display = 'block';
        document.getElementById('final-tier').innerText = highestTierCompleted;
        if (highestTierCompleted === 4) medal = 'Gold 🥇'; else if (highestTierCompleted === 3) medal = 'Silver 🥈'; else if (highestTierCompleted === 2) medal = 'Bronze 🥉'; 
        autoProgContainer.style.display = 'none';
        title.innerText = "Sprint Complete!";
    } else {
        document.getElementById('tier-result').style.display = 'none';
        if (isGraduation || (accuracy >= 95 && score >= 30)) {
            medal = 'Perfect Drill! 🌟';
            title.innerText = "You Crushed It! 🌟";
            if (currentMode !== 'drill-both') autoProgContainer.style.display = 'block';
        } else {
            title.innerText = "Round Complete!";
            autoProgContainer.style.display = 'none';
        }
    }
    
    document.getElementById('final-medal').innerText = medal;
}

function advanceG3Round() {
    const select = document.getElementById('mode-select');
    if (currentMode === 'drill-lines') select.value = 'drill-spaces';
    else if (currentMode === 'drill-spaces') select.value = 'drill-both';
    else if (currentMode === 'drill-both') select.value = 'speed';
    startG3Game();
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    if (!document.getElementById('g3-screen-game') || !document.getElementById('g3-screen-game').classList.contains('active')) return;
    
    if (['A','B','C','D','E','F','G'].includes(key)) {
        if (isPianoInput) { const pKey = document.getElementById(key === 'C' ? 'key-C1' : `key-${key}`); if (pKey) { pKey.classList.add('simulated-active'); setTimeout(() => pKey.classList.remove('simulated-active'), 100); } } 
        else { const cKey = document.getElementById(`btn-${key}`); if (cKey) { cKey.classList.add('simulated-active'); setTimeout(() => cKey.classList.remove('simulated-active'), 100); } }
        handleKeypadInput(key);
    }
});
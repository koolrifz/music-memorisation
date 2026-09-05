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
    if (!audioCtx || audioCtx.state === 'suspended') return;
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
        else if (type === 'bonus') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
            osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
            osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.32);
            gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.55);
            osc.start(); osc.stop(audioCtx.currentTime + 0.55);
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

function speakLetter(text, fast = false) {
    if (!speechRoundActive) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = fast ? 1.35 : 1.06;
        utterance.pitch = fast ? 1.1 : 1.0;
        
        let voices = window.speechSynthesis.getVoices();
        let preferredVoice = voices.find(v => (v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Premium')))) 
                             || voices.find(v => v.lang === 'en-AU' || v.lang === 'en-GB');
        
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
    }
}

/* =========================================
   GLOBAL DATA: NOTE CONFIGS
   ========================================= */
const NOTE_CONFIGS = {
    "treble": { clef: "treble", 
        staffLines: [["E","e/4"],["G","g/4"],["B","b/4"],["D","d/5"],["F","f/5"]], 
        staffSpaces: [["F","f/4"],["A","a/4"],["C","c/5"],["E","e/5"]],
        ledgerLines: [["C","c/4"],["A","a/3"],["A","a/5"],["C","c/6"],["E","e/6"]],
        ledgerSpaces: [["D","d/4"],["B","b/3"],["G","g/3"],["G","g/5"],["B","b/5"],["D","d/6"]]
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
function renderSmashCard(containerEl, clefName, pitchKey) {
    const VF = Vex.Flow;
    const canvasWidth = 160, canvasHeight = 150;

    const renderer = new VF.Renderer(containerEl, VF.Renderer.Backends.SVG);
    renderer.resize(canvasWidth, canvasHeight);
    const ctx = renderer.getContext();
    const svg = containerEl.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Stave vertically centred with generous margin both directions - the
    // 5 staff lines take up 40px; 55px above and 55px below leaves room for
    // 2 ledger lines (20px) plus notehead radius on either side without
    // clipping.
    const stave = new VF.Stave(10, 55, 140);
    stave.setContext(ctx).draw();

    const note = new VF.StaveNote({ clef: clefName, keys: [pitchKey], duration: "w" });
    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables([note]);
    new VF.Formatter().joinVoices([voice]).format([voice], 90);

    // Snapshot what's in the SVG before drawing the note, so anything new
    // added by voice.draw() - notehead, ledger lines, stem, whatever else -
    // can be grouped and measured together, regardless of VexFlow's
    // internal class names.
    const childrenBefore = new Set(Array.from(svg.children));
    voice.draw(ctx, stave);
    const newChildren = Array.from(svg.children).filter(el => !childrenBefore.has(el));

    if (newChildren.length > 0) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        newChildren.forEach(el => g.appendChild(el));
        svg.appendChild(g);

        const bbox = g.getBBox();
        const targetCenterX = canvasWidth / 2;
        const currentCenterX = bbox.x + bbox.width / 2;
        const offsetX = targetCenterX - currentCenterX;
        g.setAttribute('transform', `translate(${offsetX}, 0)`);
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
        let setupId = gameId === 'game1' ? 'g1-screen-setup' : (gameId === 'game2' ? 'g2-screen-setup' : 'g3-screen-setup');
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
    renderer.resize(52, 56);
    const ctx = renderer.getContext(); 
    
    ctx.scale(1.0, 1.0);
    ctx.setFillStyle('#ffffff'); 
    ctx.setStrokeStyle('#ffffff');
    
    const stave = new VF.Stave(2, -6, 46);
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
   GAME 1: LINE & SPACE SMASH
   Tiers: 3 → 6 → 9 → 12
   30s main clock, no duds, no repeated notes
   Rule of 3 → advance tier + +3s bonus
   ========================================= */
let g1Score = 0;
let g1TotalAttempts = 0;
let g1TierIndex = 0;
const g1Tiers = [3, 6, 9, 12];
let g1Streak = 0;
let g1TimeBonuses = 0;
let g1TargetsPresent = 0;
let g1TargetsFound = 0;
let g1WrongTapsThisScreen = 0;
let g1TargetType = ''; 
let g1Watchlist = {}; 
let g1IsTransitioning = false;

function getG1FlashDuration(cardCount) {
    if (cardCount <= 3) return 3;
    if (cardCount === 6) return 4;
    if (cardCount === 9) return 5;
    return 6; // 12
}

function getG1TargetDensity(cardCount) {
    if (cardCount === 3) return 1;
    if (cardCount === 6) return 2;
    if (cardCount === 9) return Math.random() < 0.5 ? 2 : 3;
    return Math.random() < 0.5 ? 3 : 4; // 12
}

function showG1Watchlist() {
    const modal = document.getElementById('modal-watchlist-g1');
    const list = document.getElementById('watchlist-display-list-g1');
    list.innerHTML = '';
    const items = Object.keys(g1Watchlist);
    if(items.length === 0) list.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">Watchlist is empty.</div>';
    else {
        items.forEach(note => {
            const badge = document.createElement('div'); badge.className = 'watchlist-item';
            badge.innerText = `${note} (${g1Watchlist[note]} left)`; list.appendChild(badge);
        });
    }
    modal.classList.add('show');
}
function hideG1Watchlist() { document.getElementById('modal-watchlist-g1').classList.remove('show'); }
function updateG1WatchlistBadge() { document.getElementById('g1-watchlist-count').innerText = Object.keys(g1Watchlist).length; }

function updateG1StreakDots() {
    const dots = document.querySelectorAll('#g1-streak-dots .g1-dot');
    dots.forEach((dot, i) => {
        if (i < g1Streak) dot.classList.add('filled');
        else dot.classList.remove('filled');
    });
}

function showG1BonusToast() {
    const toast = document.getElementById('g1-bonus-toast');
    if (!toast) return;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 900);
}

function startG1Game() {
    initAudio();
    speechRoundActive = true;
    g1Score = 0; g1TotalAttempts = 0; g1TierIndex = 0; g1Streak = 0; g1TimeBonuses = 0;
    g1SecondsLeft = 30; g1Watchlist = {}; g1IsTransitioning = false;
    updateG1WatchlistBadge(); updateG1TrackerUI();
    
    switchScreenState('game1', 'g1-screen-game');
    
    const clefName = document.getElementById('g1-clef-select') ? document.getElementById('g1-clef-select').value : 'treble';
    renderFloatingClef('g1-clef-display', clefName);

    startG1Timer();
    loadG1Grid();
}

function updateG1TrackerUI() {
    document.getElementById('g1-tier-tracker-text').innerText = `${g1Tiers[g1TierIndex]} Card Grid`;
    document.getElementById('g1-score-text').innerText = g1Score;
    document.getElementById('g1-attempts-text').innerText = `Attempts: ${g1TotalAttempts}`;
    updateG1StreakDots();
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
    const duration = getG1FlashDuration(g1Tiers[g1TierIndex]);
    const flashFill = document.getElementById('g1-flash-timer-fill');
    setTimeout(() => { 
        flashFill.style.transition = `width ${duration}s linear`; 
        flashFill.style.width = '0%'; 
    }, 50);

    g1FlashTimer = setTimeout(() => {
        if (g1SecondsLeft > 0) {
            g1IsTransitioning = true;
            document.querySelectorAll('#g1-grid-container .smash-card').forEach(c => c.classList.add('flash-red'));
            setTimeout(() => { g1IsTransitioning = false; resolveG1Screen(false); }, 300);
        }
    }, duration * 1000);
}

function resolveG1Screen(cleared) {
    if (cleared) {
        g1Streak++;
        if (g1Streak >= 3) {
            g1Streak = 0;
            // Award +3s time bonus and advance tier (if not already max)
            g1SecondsLeft += 3;
            g1TimeBonuses++;
            document.getElementById('g1-timer-badge').innerText = `${g1SecondsLeft}s`;
            playSound('bonus');
            showG1BonusToast();
            if (g1TierIndex < g1Tiers.length - 1) {
                g1TierIndex++;
            }
        }
    } else {
        // Missed targets or timed out → streak resets
        g1Streak = 0;
    }
    updateG1TrackerUI();
    setTimeout(loadG1Grid, 220);
}

function loadG1Grid() {
    if (g1SecondsLeft <= 0) return;
    g1TotalAttempts++; g1WrongTapsThisScreen = 0;
    
    const container = document.getElementById('g1-grid-container'); 
    container.innerHTML = '';
    const flashFill = document.getElementById('g1-flash-timer-fill');
    flashFill.style.transition = 'none'; 
    flashFill.style.width = '100%';

    let cardCount = g1Tiers[g1TierIndex];
    // Always 3-column layout once we are at 3+ cards
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';

    const clefName = document.getElementById('g1-clef-select') ? document.getElementById('g1-clef-select').value : 'treble';
    const config = NOTE_CONFIGS[clefName];
    
    // Staff + ledger notes
    let poolLines = [...config.staffLines, ...config.ledgerLines];
    let poolSpaces = [...config.staffSpaces, ...config.ledgerSpaces];
    
    g1TargetType = Math.random() > 0.5 ? 'line' : 'space';
    
    const instrEl = document.getElementById('g1-target-instruction-display');
    instrEl.innerText = `SMASH ${g1TargetType.toUpperCase()}S`;
    instrEl.className = 'g1-instruction ' + (g1TargetType === 'line' ? 'instr-lines' : 'instr-spaces');
    
    // Fast, short speech like stage-1 prototype
    speakLetter(g1TargetType === 'line' ? 'lines' : 'spaces', true);
    
    // No duds – always have at least one target
    g1TargetsPresent = getG1TargetDensity(cardCount);
    if (g1TargetsPresent > cardCount) g1TargetsPresent = cardCount;
    g1TargetsFound = 0;
    
    let targetPool = g1TargetType === 'line' ? poolLines : poolSpaces;
    let distractorPool = g1TargetType === 'line' ? poolSpaces : poolLines;

    // Build unique notes (no repeats within the grid)
    const usedKeys = new Set();
    let gridNotes = [];

    // Helper: pick a random unused note from a pool
    function pickUnique(pool) {
        const available = pool.filter(n => !usedKeys.has(n[1]));
        if (available.length === 0) return null;
        const chosen = available[Math.floor(Math.random() * available.length)];
        usedKeys.add(chosen[1]);
        return chosen;
    }

    for (let i = 0; i < g1TargetsPresent; i++) {
        const n = pickUnique(targetPool);
        if (n) gridNotes.push(n);
    }
    // Fill remaining with distractors
    while (gridNotes.length < cardCount) {
        const n = pickUnique(distractorPool);
        if (n) gridNotes.push(n);
        else break; // safety
    }
    // Shuffle
    gridNotes.sort(() => Math.random() - 0.5);

    gridNotes.forEach((n) => {
        const isTargetNote = (g1TargetType === 'line' && poolLines.some(p => p[1] === n[1])) 
                          || (g1TargetType === 'space' && poolSpaces.some(p => p[1] === n[1]));
        
        const card = document.createElement('div');
        card.className = 'smash-card ' + (cardCount <= 3 ? 'large-card' : 'small-card');
        card.onclick = () => handleG1Click(card, isTargetNote, n[0]);
        
        const innerDiv = document.createElement('div'); 
        card.appendChild(innerDiv); 
        container.appendChild(card);
        renderSmashCard(innerDiv, clefName, n[1]);
    });
    startG1FlashTimer();
}

function handleG1Click(cardElement, isTarget, pitchName) {
    if (g1SecondsLeft <= 0 || g1IsTransitioning || cardElement.classList.contains('correct')) return;
    
    if (isTarget) {
        playSound('correct'); 
        cardElement.classList.add('correct');
        g1Score++; 
        g1TargetsFound++; 
        updateG1TrackerUI();
        
        if (g1Watchlist[pitchName]) {
            g1Watchlist[pitchName]--;
            if (g1Watchlist[pitchName] <= 0) delete g1Watchlist[pitchName];
            updateG1WatchlistBadge();
        }

        if (g1TargetsFound >= g1TargetsPresent) {
            if (g1FlashTimer) clearTimeout(g1FlashTimer);
            g1IsTransitioning = true;
            setTimeout(() => { g1IsTransitioning = false; resolveG1Screen(true); }, 160);
        }
    } else {
        playSound('wrong'); 
        g1WrongTapsThisScreen++;
        g1Watchlist[pitchName] = 3; 
        updateG1WatchlistBadge();
        cardElement.classList.remove('incorrect'); 
        void cardElement.offsetWidth; 
        cardElement.classList.add('incorrect');
        setTimeout(() => cardElement.classList.remove('incorrect'), 300);
    }
}

function finishG1Game() {
    stopAllGames(); 
    playSound('complete'); 
    switchScreenState('game1', 'g1-screen-summary');
    document.getElementById('g1-final-score').innerText = g1Score;
    document.getElementById('g1-final-tier').innerText = g1Tiers[g1TierIndex];
    document.getElementById('g1-final-bonus').innerText = g1TimeBonuses;
}

/* =========================================
   GAME 2: NOTE NAME SMASH (Fixed Width Stave)
   ========================================= */
let g2Score = 0; let g2TotalAttempts = 0; let g2TierIndex = 0; const g2Tiers = [1, 2, 3, 6, 9, 12];
let g2Streak = 0; let g2DudStreak = 0; let g2TargetsPresent = 0; let g2TargetsFound = 0; let g2WrongTapsThisScreen = 0;
let g2TargetNote = ''; let g2Watchlist = {}; let g2IsTransitioning = false;

function toggleG2HelperModal() {
    const modal = document.getElementById('g2-helper-modal');
    if(modal) { modal.classList.toggle('show'); if(modal.classList.contains('show')) setTimeout(renderHelperSheetGraphics, 50); }
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
    if(round === '1') { helperModal.classList.add('show'); linesCanvas.style.display = 'block'; } 
    else if (round === '2') { helperModal.classList.add('show'); spacesCanvas.style.display = 'block'; } 
    else { helperModal.classList.remove('show'); }
    setTimeout(renderHelperSheetGraphics, 50);
}

function startG2Game() {
    initAudio();
    speechRoundActive = true;
    const round = document.getElementById('g2-round-select').value;
    setupG2Helpers(round);

    g2Score = 0; g2TotalAttempts = 0; g2TierIndex = 0; g2Streak = 0; g2DudStreak = 0;
    g2SecondsLeft = 60; g2Watchlist = {}; g2IsTransitioning = false;
    updateG2WatchlistBadge(); updateG2TrackerUI();
    
    switchScreenState('game2', 'g2-screen-game');
    
    const clefName = document.getElementById('g2-clef-select').value;
    renderFloatingClef('g2-clef-display', clefName);

    startG2Timer(); loadG2Grid();
}

function updateG2TrackerUI() {
    document.getElementById('g2-tier-tracker-text').innerText = `Grid: ${g2Tiers[g2TierIndex]} | Streak: ${g2Streak}/3`;
    document.getElementById('g2-score-text').innerText = g2Score;
    document.getElementById('g2-attempts-text').innerText = `Attempts: ${g2TotalAttempts}`;
}

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
    setTimeout(() => { flashFill.style.transition = `width 3s linear`; flashFill.style.width = '0%'; }, 50);

    g2FlashTimer = setTimeout(() => {
        if (g2SecondsLeft > 0) {
            g2IsTransitioning = true;
            document.querySelectorAll('#g2-grid-container .smash-card').forEach(c => c.classList.add('flash-red'));
            setTimeout(() => { g2IsTransitioning = false; resolveG2Screen(false); }, 300);
        }
    }, 3000);
}

function resolveG2Screen(cleared) {
    if (cleared) {
        if (g2TargetsPresent > 0) {
            g2Streak++;
            if (g2Watchlist[g2TargetNote]) {
                g2Watchlist[g2TargetNote]--;
                if(g2Watchlist[g2TargetNote] <= 0) delete g2Watchlist[g2TargetNote];
                updateG2WatchlistBadge();
            }
            if (g2Streak >= 3) {
                g2Streak = 0;
                if (g2TierIndex < g2Tiers.length - 1) g2TierIndex++;
                else { finishG2Game(true); return; } 
            }
        }
    } else {
        let missed = g2TargetsPresent - g2TargetsFound;
        if (missed > 0) {
            g2Streak = 0; g2Watchlist[g2TargetNote] = 3; updateG2WatchlistBadge(); g2DudStreak = 0;
        } else if (g2TargetsPresent === 0 && g2WrongTapsThisScreen === 0) {
            g2DudStreak++; if (g2DudStreak >= 3) { g2Score++; g2DudStreak = 0; }
        } else if (g2TargetsPresent === 0 && g2WrongTapsThisScreen > 0) {
            g2DudStreak = 0;
        }
    }
    updateG2TrackerUI(); setTimeout(loadG2Grid, 200);
}

function loadG2Grid() {
    if (g2SecondsLeft <= 0) return;
    g2TotalAttempts++; g2WrongTapsThisScreen = 0;
    
    const VF = Vex.Flow;
    const container = document.getElementById('g2-grid-container'); container.innerHTML = '';
    const flashFill = document.getElementById('g2-flash-timer-fill');
    flashFill.style.transition = 'none'; flashFill.style.width = '100%';

    let cardCount = g2Tiers[g2TierIndex];
    container.style.gridTemplateColumns = cardCount <= 2 ? '1fr' : 'repeat(3, 1fr)';

    const clefName = document.getElementById('g2-clef-select').value;
    const round = document.getElementById('g2-round-select').value;
    const config = NOTE_CONFIGS[clefName];
    
    let pool = [];
    if (round === '1') pool = [...config.staffLines];
    else if (round === '2') pool = [...config.staffSpaces];
    else if (round === '3') pool = [...config.staffLines, ...config.staffSpaces];
    else if (round === '4') {
        pool = [...config.staffLines, ...config.staffSpaces];
        if(Object.keys(g2Watchlist).length === 0) pool = pool.concat([...config.ledgerLines, ...config.ledgerSpaces]);
    }
    
    const targetLetters = [...new Set(pool.map(n => n[0].toUpperCase()))];
    g2TargetNote = targetLetters[Math.floor(Math.random() * targetLetters.length)];
    
    document.getElementById('g2-target-note-display').innerText = `FIND ${g2TargetNote}`;
    speakLetter(g2TargetNote);
    
    let isDud = Math.random() < 0.15;
    // Target density per grid size: 1->1, 2->1, 3->1, 6->2, 9->2-3, 12->3-4
    g2TargetsPresent = isDud ? 0 : (cardCount === 1 ? 1 : cardCount === 6 ? 2 : cardCount === 9 ? (Math.floor(Math.random() * 2) + 2) : cardCount === 12 ? (Math.floor(Math.random() * 2) + 3) : 1);
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
        card.className = 'smash-card ' + (cardCount <= 2 ? 'large-card' : 'small-card');
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
            g2IsTransitioning = true;
            setTimeout(() => { g2IsTransitioning = false; resolveG2Screen(true); }, 150);
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
    
    const currentRound = document.getElementById('g2-round-select').value;
    const pbKey = 'round' + currentRound;
    let isNewPb = false;
    if (g2Score > personalBests.game2[pbKey]) { personalBests.game2[pbKey] = g2Score; isNewPb = true; }
    
    document.getElementById('g2-final-score').innerText = g2Score;
    document.getElementById('g2-final-attempts').innerText = g2TotalAttempts;
    document.getElementById('g2-final-tier').innerText = g2Tiers[g2TierIndex];
    document.getElementById('g2-personal-best').innerText = `${personalBests.game2[pbKey]} ${isNewPb ? '(New PB! 🎉)' : ''}`;

    const autoProgContainer = document.getElementById('g2-auto-progress-container');
    const title = document.getElementById('g2-summary-title');

    if (isGraduation && currentRound < '4') {
        title.innerText = "You Crushed It! 🌟";
        autoProgContainer.style.display = 'block';
    } else {
        title.innerText = "Smash Complete!";
        autoProgContainer.style.display = 'none';
    }
}

function advanceG2Round() {
    const select = document.getElementById('g2-round-select');
    if (select.value < '4') { select.value = (parseInt(select.value) + 1).toString(); startG2Game(); }
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
        renderer.resize(320, 130); const context = renderer.getContext(); context.scale(1.3, 1.3);

        const stave = new VF.Stave(8, 35, 225); stave.addClef(config.clef);
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
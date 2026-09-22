/* =========================================
   AUDIO & SPEECH ENGINE
   ========================================= */
let audioCtx = null;
let metronomeTimer = null;
let metronomeBeat = 0;
let tunerStream = null;
let tunerSource = null;
let tunerAnalyser = null;
let tunerAnimationFrame = null;

function togglePracticeTool(toolName) {
    const card = document.getElementById(`${toolName}-tool-card`);
    if (!card) return;
    const isOpen = card.classList.toggle('is-open');
    if (!isOpen && toolName === 'beat') stopMetronome();
    if (!isOpen && toolName === 'tuner') stopTuner();
    const toggle = card.querySelector('.practice-tool-heading');
    if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function initAudio() {
    try { 
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
        if (audioCtx.state === 'suspended') audioCtx.resume(); 
    } catch (e) {}
}

function playMetronomeClick() {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = metronomeBeat === 0 ? 1100 : 760;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.07);
    oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.08);
    metronomeBeat = (metronomeBeat + 1) % 4;
}

function updateMetronomeBpm(value) {
    document.getElementById('metronome-bpm-value').innerText = value;
    if (metronomeTimer) {
        clearInterval(metronomeTimer);
        metronomeTimer = setInterval(playMetronomeClick, 60000 / Number(value));
    }
}

function toggleMetronome() {
    initAudio();
    const button = document.getElementById('metronome-toggle');
    if (metronomeTimer) {
        clearInterval(metronomeTimer); metronomeTimer = null;
        button.innerText = 'Start Beat';
        return;
    }
    metronomeBeat = 0;
    playMetronomeClick();
    const bpm = Number(document.getElementById('metronome-bpm').value);
    metronomeTimer = setInterval(playMetronomeClick, 60000 / bpm);
    button.innerText = 'Stop Beat';
}

function stopMetronome() {
    if (metronomeTimer) clearInterval(metronomeTimer);
    metronomeTimer = null;
    const button = document.getElementById('metronome-toggle');
    if (button) button.innerText = 'Start Beat';
}

function detectTunerPitch(buffer, sampleRate) {
    let energy = 0;
    for (let index = 0; index < buffer.length; index++) energy += buffer[index] * buffer[index];
    if (Math.sqrt(energy / buffer.length) < 0.012) return null;

    let bestOffset = -1;
    let bestCorrelation = 0;
    for (let offset = 24; offset < buffer.length / 2; offset++) {
        let correlation = 0;
        for (let index = 0; index < buffer.length / 2; index++) correlation += buffer[index] * buffer[index + offset];
        correlation /= buffer.length / 2;
        if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset; }
    }
    if (bestOffset < 0 || bestCorrelation < 0.01) return null;
    return sampleRate / bestOffset;
}

function updateTunerInstrument(instrument) {
    tunerInstrument = instrument;
    const labels = { concert: 'Concert pitch', bb: 'Bb instrument', eb: 'Eb instrument', f: 'F instrument' };
    const cents = document.getElementById('tuner-cents');
    if (cents && !tunerStream) cents.innerText = `${labels[instrument]} selected. Tap start, then play a note.`;
}

function updateTuner() {
    if (!tunerAnalyser) return;
    const buffer = new Float32Array(tunerAnalyser.fftSize);
    tunerAnalyser.getFloatTimeDomainData(buffer);
    const frequency = detectTunerPitch(buffer, audioCtx.sampleRate);
    if (frequency) {
        const transposition = { concert: 0, bb: 2, eb: -3, f: 7 }[tunerInstrument] || 0;
        const midi = 69 + 12 * Math.log2(frequency / 440) + transposition;
        const nearestMidi = Math.round(midi);
        const cents = Math.round((midi - nearestMidi) * 100);
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const note = `${noteNames[(nearestMidi + 120) % 12]}${Math.floor(nearestMidi / 12) - 1}`;
        const readout = document.querySelector('.tuner-readout');
        document.getElementById('tuner-note').innerText = note;
        document.getElementById('tuner-cents').innerText = Math.abs(cents) <= 35 ? 'In tune!' : cents < 0 ? 'A little low' : 'A little high';
        readout.className = `tuner-readout ${Math.abs(cents) <= 35 ? 'in-tune' : cents < 0 ? 'low' : 'high'}`;
    }
    tunerAnimationFrame = requestAnimationFrame(updateTuner);
}

async function toggleTuner() {
    const button = document.getElementById('tuner-toggle');
    if (tunerStream) { stopTuner(); return; }
    if (!navigator.mediaDevices?.getUserMedia) {
        document.getElementById('tuner-cents').innerText = 'Microphone access is not available here.';
        return;
    }
    try {
        initAudio();
        tunerStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tunerSource = audioCtx.createMediaStreamSource(tunerStream);
        tunerAnalyser = audioCtx.createAnalyser(); tunerAnalyser.fftSize = 2048;
        tunerSource.connect(tunerAnalyser);
        button.innerText = 'Stop Tuner';
        document.getElementById('tuner-note').innerText = 'Listening...';
        document.getElementById('tuner-cents').innerText = 'Play one clear note.';
        updateTuner();
    } catch (error) {
        document.getElementById('tuner-cents').innerText = 'Please allow microphone access to tune.';
    }
}

function stopTuner() {
    if (tunerAnimationFrame) cancelAnimationFrame(tunerAnimationFrame);
    if (tunerStream) tunerStream.getTracks().forEach(track => track.stop());
    if (tunerSource) tunerSource.disconnect();
    tunerStream = null; tunerSource = null; tunerAnalyser = null; tunerAnimationFrame = null;
    const button = document.getElementById('tuner-toggle');
    if (button) button.innerText = 'Start Tuner';
    const readout = document.querySelector('.tuner-readout');
    if (readout) readout.className = 'tuner-readout';
    const note = document.getElementById('tuner-note');
    const cents = document.getElementById('tuner-cents');
    if (note) note.innerText = 'Ready?';
    if (cents) cents.innerText = 'Tap start, then play a note.';
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
        else if (type === 'double-bonus') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(740, audioCtx.currentTime);
            osc.frequency.setValueAtTime(988, audioCtx.currentTime + 0.12);
            gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
            osc.start(); osc.stop(audioCtx.currentTime + 0.28);
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

// Clef choice is shared between Note Smash and Real Smash: pick it in either
// game's setup and it carries over as the default for both.
const AVAILABLE_CLEFS = [
    { id: 'treble', label: 'Treble', glyph: '𝄞' },
    { id: 'bass', label: 'Bass', glyph: '𝄢' }
];

function getClefPreference() {
    try { return localStorage.getItem('koolRiffsClefPreference') || 'treble'; }
    catch (error) { return 'treble'; }
}

function setClefPreference(clef) {
    try { localStorage.setItem('koolRiffsClefPreference', clef); } catch (error) {}
}

function syncClefPickerButtons() {
    const current = getClefPreference();
    document.querySelectorAll('.clef-picker-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.clef === current));
}

function selectClef(clef) {
    setClefPreference(clef);
    syncClefPickerButtons();
    renderG2Pathway();
    renderG3Pathway();
}

// Self-heals a pathway's unlocked-stages list against its own stage records:
// a save race between two completions can drop a stage from the saved
// unlocked list even though its progress record shows it was cleared (which
// is only possible once its predecessor unlocked it). Deriving "unlocked"
// from "cleared" here means a stage can never appear locked behind one the
// player has already finished.
function normalizeUnlockedStages(progress, stages) {
    const unlocked = new Set(progress.unlockedStages || [stages[0].id]);
    stages.forEach((stage, index) => {
        if (progress.stageProgress?.[stage.id]?.cleared) {
            unlocked.add(stage.id);
            if (stages[index + 1]) unlocked.add(stages[index + 1].id);
        }
    });
    return [...unlocked];
}

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

/* =========================================
   SHARED SMASH GRID ROUND ENGINE (Games 1 & 2)
   Not wired into either game yet - built ahead of the landscape/density-grid
   rework (Rob's new tier array is [4, 8, 12, 16], 4 columns, replacing the
   3-column [3, 6, 9, 12] grid) so both games can be rewritten against one
   shared piece instead of two more hand-rolled copies of the same algorithm.

   This generalizes what used to be loadG1Grid's own row-target-allocation
   logic (script.js, pre-landscape-rework version) - it decided how many of
   this round's targets land in each row, with two rules baked in as literal
   "3"s: a row could hold at most 2 targets (so at least 1 distractor always
   sits in it, since a row was exactly 3 cards), and the DOM build always
   filled every row to exactly 3 cards. Both are now `cols`-derived instead
   of hardcoded, so this works unchanged whether a row is 3 cards or 4 (or
   any other width a future skin wants).

   totalRows vs activeRows is deliberately still two different numbers, not
   one - that's the cumulative-reveal mechanic (see the "Row Locked States"
   section of style.css: unreached rows are still built and shown, just
   dimmed and locked), not a rows/cols implementation detail: totalRows is
   the full grid a stage ever shows (its hardest tier's row count),
   activeRows is how many of those rows are unlocked at the CURRENT tier.

   Pure data - no DOM, no VexFlow, no randomness the caller doesn't control
   the shape of. pickTarget(i)/pickDistractor(i) are supplied by the caller
   (Game 1's several selection modes - line/space, the level2 orientation
   phases, the ledger bonus - and Game 2's letter-name selection all differ
   here) and must each return a plain card-data object; isTarget is added
   by this function, not the caller.

   One thing fixed, not just ported, while generalizing this: the original
   row-allocation loop set the last active row's count without deducting it
   from `remaining` first, so the leftover-distribution pass afterwards
   could then push that row past what was actually rolled (confirmed by
   simulation - e.g. a 1-row / 3-card-wide round that rolled 1 target could
   silently end up showing 2). Verified against 4-col AND the current
   3-col shape by simulation (10k+ rounds, every row always exactly `cols`
   cards, `targetsPresent` in the result always matches what was requested
   whenever the grid has room for it, and degrades gracefully - capped, not
   stuck or overshot - when it doesn't).
   ========================================= */
// The new density-grid column count, replacing the old 3-column shape.
// Shared so both games land on the same number - Game 2 uses it now,
// Game 1 once its own rewrite lands.
const SMASH_GRID_COLS = 4;

function buildSmashGridRound({ totalRows, activeRows, cols, targetsPresent, pickTarget, pickDistractor }) {
    const maxTargetsPerRow = Math.max(1, cols - 1); // always leave room for >=1 distractor per row
    const rowTargetCounts = new Array(totalRows).fill(0);

    if (targetsPresent > 0 && activeRows > 0) {
        const activeRowIndices = [];
        for (let r = 0; r < activeRows; r++) activeRowIndices.push(r);
        activeRowIndices.sort(() => Math.random() - 0.5);

        let remaining = targetsPresent;
        activeRowIndices.forEach((rowIndex, i) => {
            const maxPossible = Math.min(maxTargetsPerRow, remaining);
            const assigned = (i === activeRowIndices.length - 1)
                ? maxPossible // the last row always mops up whatever's left, capped
                : Math.floor(Math.random() * (maxPossible + 1));
            rowTargetCounts[rowIndex] = assigned;
            remaining -= assigned;
        });
        let safety = 0;
        while (remaining > 0 && safety < 10) {
            for (const rowIndex of activeRowIndices) {
                if (rowTargetCounts[rowIndex] < maxTargetsPerRow && remaining > 0) {
                    rowTargetCounts[rowIndex]++;
                    remaining--;
                }
            }
            safety++;
        }
    }

    const rows = [];
    for (let r = 0; r < totalRows; r++) {
        const numTargetsInRow = rowTargetCounts[r];
        const cards = [];
        for (let i = 0; i < numTargetsInRow; i++) cards.push({ ...pickTarget(i), isTarget: true });
        for (let i = numTargetsInRow; i < cols; i++) cards.push({ ...pickDistractor(i - numTargetsInRow), isTarget: false });
        cards.sort(() => Math.random() - 0.5);
        rows.push({ index: r, isActive: r < activeRows, cards });
    }

    return {
        rows,
        targetsPresent: rowTargetCounts.reduce((sum, count) => sum + count, 0)
    };
}

/* =========================================
   SHARED GAME SHELL (Games 1, 2, 3)
   The back-nav (.game-nav) and HUD (.hud: pause + timer badge) used to be
   hand-duplicated once per game in index.html - three copies, byte-for-byte
   the same shape, differing only in which game id goes to
   handleBackButton()/pauseCurrentGame() and the timer badge's own id and
   starting text. renderGameShellChrome() builds that markup once instead,
   into the empty .game-nav/.hud containers index.html still has - and it
   emits the exact same ids the rest of this file already reads and writes
   (g1-timer-badge, g2-timer-badge, g3-timer-badge), so nothing downstream
   of this needed to change.

   renderSmashGameHeader() does the same for the .game-header row, but only
   for Games 1 & 2 - they share one real shape (score/streak on the left, a
   target display with its own flash timer in the centre, a right-hand slot
   that's empty for Game 1 and holds the helper/watchlist buttons for
   Game 2 - only the center column's flex weight, the target's color/size/
   id-suffix/starting text, and that right-hand slot actually differ).
   Game 3's header is a genuinely different shape (a progress bar, not a
   target display, and its ids aren't g3-prefixed like everything else -
   score-text, tier-tracker-text, progress-bar) and isn't part of the 4x4
   density-grid rework, so it stays static markup in index.html for now
   rather than being forced into this.

   Both are called once, for every game, right after this file loads (see
   the bottom of this file) - .view/.screen visibility is pure CSS
   (display/opacity), so every game's DOM already exists at page load
   whether or not that game is the one currently shown.
   ========================================= */
function renderGameShellChrome(gameId, prefix, { timerText }) {
    const nav = document.querySelector(`#view-${gameId} .game-nav`);
    if (nav) nav.innerHTML = `<button class="btn-back" onclick="handleBackButton('${gameId}')">⬅ Back</button>`;

    const hud = document.querySelector(`#view-${gameId} .hud`);
    if (hud) hud.innerHTML = `
        <button class="pause-btn" onclick="pauseCurrentGame('${gameId}')">🛑 Pause</button>
        <span class="timer-badge" id="${prefix}-timer-badge">${timerText}</span>
    `;
}

function renderSmashGameHeader(gameId, prefix, { targetIdSuffix, targetColor, targetFontSize, targetText, centerFlex, right }) {
    const header = document.querySelector(`#view-${gameId} .game-header`);
    if (!header) return;
    header.innerHTML = `
        <div class="score-counter" style="align-items: flex-start; flex: 1;">
            <div class="score-row">⭐ <span id="${prefix}-score-text">0</span></div>
            <div class="tier-tracker" id="${prefix}-tier-tracker-text">Grid: 1 | Streak: 0/3</div>
            <div class="tier-tracker" id="${prefix}-attempts-text">Attempts: 0</div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; flex: ${centerFlex};">
            <div style="color: ${targetColor}; font-weight: 900; font-size: ${targetFontSize}; text-transform: uppercase; margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);" id="${prefix}-${targetIdSuffix}">${targetText}</div>
            <div class="flash-timer" id="${prefix}-flash-timer-bar" style="display:block; width: 100%; max-width: 180px;"><div class="flash-timer-fill" id="${prefix}-flash-timer-fill"></div></div>
        </div>

        ${right}
    `;
}

function initSharedGameShells() {
    renderGameShellChrome('game1', 'g1', { timerText: '20s' });
    renderGameShellChrome('game2', 'g2', { timerText: '60s' });
    renderGameShellChrome('game3', 'g3', { timerText: '60s' });

    renderSmashGameHeader('game1', 'g1', {
        targetIdSuffix: 'target-instruction-display',
        targetColor: 'var(--accent-purple)',
        targetFontSize: '24px',
        targetText: 'SMASH LINES',
        centerFlex: 2,
        right: '<div style="flex: 1;"></div>'
    });
    renderSmashGameHeader('game2', 'g2', {
        targetIdSuffix: 'target-note-display',
        targetColor: 'var(--accent-gold)',
        targetFontSize: '28px',
        targetText: 'C',
        centerFlex: 1,
        right: `<div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end; flex: 1;">
            <button id="g2-helper-toggle" class="btn-helper-toggle" onclick="toggleG2HelperModal()">💡 Helpers</button>
            <button class="btn-helper-toggle" style="background:var(--accent-red); box-shadow:0 4px 0 var(--accent-red-shadow);" onclick="showG2Watchlist()">⚠️ <span id="g2-watchlist-count">0</span></button>
        </div>`
    });
}

let personalBests = {
    game2: { round1: 0, round2: 0, round3: 0, round4: 0 },
    game3: { 'drill-lines': 0, 'drill-spaces': 0, 'drill-both': 0, 'speed': 0 }
};

/* =========================================
   GLOBAL PAUSE / RESUME / ROUTING
   ========================================= */
let g1Timer, g1FlashTimer, g2Timer, g2FlashTimer, gameTimer, breakOutTimer;
let g2FlashDeadline = 0;
let g2PausedFlashRemainingMs = null;
let g3FlashDeadline = 0;
let g3PausedFlashRemainingMs = null;
let g1BonusCountdownTimer;
let g1SecondsLeft = 30, g2SecondsLeft = 60, secondsLeft = 60;

function stopAllGames() {
    stopMetronome();
    stopTuner();
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

    if (gameId === 'game2' && activeScreen && activeScreen.id === 'g2-screen-summary') {
        renderG2Pathway();
        switchScreenState('game2', 'g2-screen-pathway');
    } else if (gameId === 'game3' && activeScreen && activeScreen.id === 'g3-screen-summary') {
        renderG3Pathway();
        switchScreenState('game3', 'g3-screen-pathway');
    } else if (activeScreen && activeScreen.id.includes('screen-game')) {
        stopAllGames();
        let setupId = gameId === 'game1' ? 'g1-screen-pathway' : (gameId === 'game2' ? 'g2-screen-pathway' : 'g3-screen-pathway');
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
    } else if (targetViewId === 'view-game1') {
        renderG1Pathway();
        switchScreenState('game1', 'g1-screen-pathway');
    } else if (targetViewId === 'view-game2') {
        renderG2Pathway();
        switchScreenState('game2', 'g2-screen-pathway');
    } else if (targetViewId === 'view-game3') {
        renderG3Pathway();
        switchScreenState('game3', 'g3-screen-pathway');
    } else if (targetViewId === 'view-rhythm') {
        renderRhythmPathway();
        switchScreenState('rhythm', 'rhythm-screen-pathway');
    } else if (targetViewId === 'view-rhythm-lab') {
        enterRhythmLab();
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
    GAME 1: STAFF SMASH (v2 Cumulative Reveal & Micro-Reward Redesign)
   ========================================= */
// Moved onto the landscape/density-grid rework (step 6): 4 columns, tiers
// of [4, 8, 12, 16] instead of 3 columns / [3, 6, 9, 12] - see Game 2's
// own note (script.js, its GAME 2 section) for the shape of this change;
// Game 1 is the harder case because its round-generation was hardcoded to
// 3-wide rows directly in the algorithm (see buildSmashGridRound's doc
// comment), not just in the DOM/CSS, so this rewrite goes through the
// shared engine rather than just reparametrizing the old code in place.
let g1Score = 0;
let g1TotalAttempts = 0;
let g1TierIndex = 0;
const g1Tiers = [4, 8, 12, 16]; // 1 row (4), 2 rows (8), 3 rows (12), 4 rows (16)
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

function getG1OrientationDistractors(target, positions, proximity = Infinity, includeSameType = false) {
    return positions
    .filter(position => position.label !== target.label)
    .filter(position => includeSameType || position.type !== target.type)
    .filter(position => Math.abs(position.height - target.height) <= proximity)
        .sort((a, b) => Math.abs(a.height - target.height) - Math.abs(b.height - target.height));
}

function getG1LedgerBonusPrompt(target) {
    const side = target.height < 8 ? 'below' : 'above';
    const ordinal = target.type === 'line' ? 'line' : 'space';
    const distance = Math.ceil(Math.abs(target.height - (side === 'above' ? 9 : 7)) / 2);
    return `${ordinal[0].toUpperCase()}${ordinal.slice(1)} ${side} ${distance} ledger ${ordinal}${distance === 1 ? '' : 's'} ${side} the staff`;
}

function getG1LedgerBonusPositions(config) {
    return getG1OrientationPositions(config).filter(position => position.label.startsWith('Ledger'));
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
    g1CurrentPromptLabel = '';
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
    const rowCount = activeCardsCount / SMASH_GRID_COLS;

        const streakDots = [0, 1, 2].map(index =>
            `<span class="streak-dot${index < g1Streak ? ' active' : ''}" aria-hidden="true"></span>`
        ).join('');

        // Ledger Bonus always runs at the hardest tier (g1TierIndex is set to
        // 3 for its whole duration - see startG1LedgerBonus), so its card
        // count is always the top of g1Tiers, not a literal that would go
        // stale the next time that array's values change.
        const roundLabel = g1IsLedgerBonus
            ? `Ledger Bonus ${g1LedgerBonusRound + 1}/3 | Grid: ${g1Tiers[g1Tiers.length - 1]}`
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
    // Dividing by SMASH_GRID_COLS instead of the old literal 3 keeps this at
    // the exact same pacing across the tier switch (same fix as Game 2's
    // startG2FlashTimer - both give [4/4+2, 8/4+2, 12/4+2, 16/4+2] =
    // [3,4,5,6] seconds for tiers 0-3, identical to the old 3/3+2 ... 12/3+2).
    const flashSeconds = g1Tiers[g1TierIndex] / SMASH_GRID_COLS + 2;
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
    // Same "divide by the column count, not the literal 3" fix as
    // startG1FlashTimer - identical thresholds either way.
    const speedThreshold = cardsInPlay / SMASH_GRID_COLS + 1;

    // Indexed by tier now, not by comparing the card count to a literal
    // 3/6 - those stopped matching anything once the tiers became
    // [4,8,12,16]. Same bands as before: only the two smallest tiers get
    // this perfect-screen bonus, 0.5s on the smallest, 0.75s on the second.
    if (g1WrongTapsThisScreen === 0 && g1TierIndex <= 1) {
        triggerG1TimeBonus(g1TierIndex === 0 ? 0.5 : 0.75);
    }
    if (elapsedSeconds <= speedThreshold) {
        triggerG1TimeBonus(0.5);
    }
}

// Took a `completedCards` param before and compared it to a literal 6 - now
// just reads g1TierIndex directly, since every call site was really asking
// "is the tier we're on/just finished in the easier or harder half", which
// index answers without the caller needing to pass anything. First half
// (indices 0-1) gets 2s, second half (2-3) gets 3s - Ledger Bonus is
// always the hardest tier (g1TierIndex === 3 for its whole duration - see
// startG1LedgerBonus), so it always lands in the 3s half, same as its old
// hardcoded awardG1TierBonus(12) call always did.
function awardG1TierBonus() {
    const mainClockBonus = g1TierIndex < g1Tiers.length / 2 ? 2 : 3;
    triggerG1TimeBonus(mainClockBonus);
}

function advanceG1Streak() {
    if (g1Level === 'level2') {
        if (g1Streak < 3) return false;
        g1Streak = 0;
        awardG1TierBonus();
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
    awardG1TierBonus();
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
    const dudTimeRefund = g1Tiers[g1TierIndex] / SMASH_GRID_COLS + 2; // same identical-pacing fix as startG1FlashTimer
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
            awardG1TierBonus(); // g1TierIndex is 3 throughout Ledger Bonus - see startG1LedgerBonus
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
    const activeRowsCount = activeCardsCount / SMASH_GRID_COLS;

    // Define density bands per tier - indexed by TIER now, not by the
    // tier's card count (those literal 3/6/9/12 comparisons stopped
    // matching anything once the values became [4,8,12,16] - see
    // buildSmashGridRound's doc comment). Same bands as before:
    // tier 0 (1 row): min 1, max 2
    // tier 1 (2 rows): min 2, max 4
    // tier 2 (3 rows): min 2, max 3
    // tier 3 (4 rows): min 3, max 4
    if (g1TierIndex === 0) { g1TierMin = 1; g1TierMax = 2; }
    else if (g1TierIndex === 1) { g1TierMin = 2; g1TierMax = 4; }
    else if (g1TierIndex === 2) { g1TierMin = 2; g1TierMax = 3; }
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
        orientationDistractors = getG1OrientationDistractors(orientationTarget, ledgerPositions, proximity, true);
        if (orientationDistractors.length < 3) {
            orientationDistractors = getG1OrientationDistractors(orientationTarget, ledgerPositions, Infinity, true);
        }
        orientationDistractors = orientationDistractors.concat(
            getG1OrientationDistractors(orientationTarget, ledgerPositions, Infinity, true)
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
        const shouldSpeakPrompt = g1CurrentPromptLabel !== prompt;
        g1CurrentPromptLabel = prompt;
        const instructionDisplay = document.getElementById('g1-target-instruction-display');
        instructionDisplay.innerText = prompt.toUpperCase();
        instructionDisplay.style.color = numberedPhase ? 'var(--text-main)' : targetType === 'line' ? 'var(--accent-blue)' : 'var(--accent-gold)';
        // Mixed phase deliberately stays silent on the line/space instruction -
        // the whole point is training the player to scan the colour-coded text
        // instead of listening for it. A voice hint here would let them skip
        // that scanning skill.
        if (shouldSpeakPrompt && g1Level2Phase !== 2) speakLetter(numberedPhase ? orientationTarget.label : `a ${targetType}`);
        updateG1TrackerUI();
    } else {
        g1TargetType = Math.random() > 0.5 ? 'line' : 'space';
        const prompt = `SMASH ${g1TargetType.toUpperCase()}S`;
        const shouldSpeakPrompt = g1CurrentPromptLabel !== prompt;
        g1CurrentPromptLabel = prompt;
        document.getElementById('g1-target-instruction-display').innerText = prompt;
        if (shouldSpeakPrompt) speakLetter(g1TargetType === 'line' ? 'lines' : 'spaces');
    }
    
    let isDud = !g1LastScreenWasDud && Math.random() < 0.15;
    g1LastScreenWasDud = isDud;

    g1LastRolledTotal = isDud ? 0 : (Math.random() < 0.5 ? g1TierMin : g1TierMax);
    g1TargetsPresent = g1LastRolledTotal;
    g1TargetsFound = 0;

    if (g1Level !== 'level2') {
        targetPool = g1TargetType === 'line' ? poolLines : poolSpaces;
        distractorPool = g1TargetType === 'line' ? poolSpaces : poolLines;
    }

    // Built through the shared grid engine (see buildSmashGridRound) instead
    // of a hand-rolled row-allocation loop - that loop was the one piece of
    // Game 1 genuinely hardcoded to 3-wide rows (the "at most 2 targets, fill
    // to exactly 3" logic), unlike Game 2's, which was already just a flat
    // count. totalRows is always the hardest tier's row count (4, same as
    // before - 16/4 lands on the same number 12/3 did) for the cumulative-
    // reveal mechanic: every row up to totalRows is always built and shown,
    // locked/dimmed past activeRowsCount, never hidden outright.
    const totalRowsCount = g1Tiers[g1Tiers.length - 1] / SMASH_GRID_COLS;
    const round = buildSmashGridRound({
        totalRows: totalRowsCount,
        activeRows: activeRowsCount,
        cols: SMASH_GRID_COLS,
        targetsPresent: g1TargetsPresent,
        // i is the within-row index (0 at the start of every row, same as
        // the original hand-rolled loop's own per-row target/distractor
        // counters), so orientationTargets/orientationDistractors cycle the
        // same way they always did.
        pickTarget: i => {
            const selectedTarget = g1Level === 'level2' ? orientationTargets[i % orientationTargets.length] : null;
            const targetNote = g1Level === 'level2' ? selectedTarget.note : targetPool[Math.floor(Math.random() * targetPool.length)];
            const targetLabel = g1Level === 'level2' ? selectedTarget.label : targetNote[0];
            return { note: targetNote, label: targetLabel };
        },
        pickDistractor: i => {
            if (g1Level === 'level2') {
                const distractor = orientationDistractors[i % orientationDistractors.length];
                return { note: distractor.note, label: distractor.label };
            }
            const distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)];
            return { note: distractor, label: distractor[0] };
        },
    });
    g1TargetsPresent = round.targetsPresent;
    g1LastRolledTotal = g1TargetsPresent;

    round.rows.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'g1-row';

        if (!row.isActive) {
            rowEl.classList.add('locked');
        } else if (row.index === activeRowsCount - 1 && g1TierIndex > 0) {
            rowEl.classList.add('unlock-pulse');
        }

        row.cards.forEach(item => {
            const card = document.createElement('div');
            card.className = 'smash-card small-card';

            if (row.isActive) {
                card.onclick = () => handleG1Click(card, item.isTarget, item.label);
            }

            const innerDiv = document.createElement('div');
            card.appendChild(innerDiv);
            rowEl.appendChild(card);

            renderSmashCard(innerDiv, clefName, item.note[1], row.isActive);
        });

        container.appendChild(rowEl);
    });

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

async function shareGameResult(gameId) {
    const isGame1 = gameId === 'game1';
    const isGame2 = gameId === 'game2';
    const scoreValue = isGame1 ? g1Score : isGame2 ? g2Score : score;
    const attemptsValue = isGame1 ? g1TotalAttempts : isGame2 ? g2TotalAttempts : totalAttempts;
    const timeValue = isGame1 ? g1SecondsLeft : isGame2 ? g2SecondsLeft : secondsLeft;
    const gameName = isGame1 ? 'Staff Smash' : isGame2 ? 'Note Smash' : 'Real Smash';
    const achievement = isGame1 ? 'I smashed the staff' : isGame2 ? 'I smashed the notes' : 'I crushed a Real Smash round';
    const stage = isGame1
        ? (g1IsLedgerBonus ? 'Ledger Bonus' : g1Level2PhaseNames[g1Level2Phase])
        : isGame2 ? g2PhaseNames[g2Phase] : g3PathwayStages.find(stageItem => stageItem.id === g3SelectedStage)?.label || 'Real Smash';
    const shareText = `${achievement} in Kool Riffs ${gameName}!\nStage: ${stage}\nScore: ${Math.round(scoreValue)}\nAttempts: ${attemptsValue}\nTime remaining: ${Math.max(0, timeValue).toFixed(1)}s`;
    const shareData = { title: `Kool Riffs - ${gameName}`, text: shareText, url: window.location.href };
    const button = document.querySelector(`#${gameId}-screen-summary .btn-secondary[onclick*="shareGameResult"]`);

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareText);
            if (button) {
                const originalText = button.innerText;
                button.innerText = 'Score Copied!';
                setTimeout(() => { button.innerText = originalText; }, 1600);
            }
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            if (button) button.innerText = 'Score Copied!';
        }
    } catch (error) {
        if (error.name !== 'AbortError' && button) button.innerText = 'Share Unavailable';
    }
}

function finishG1Game(isOfficialSmash = false) {
    stopAllGames();
    recordG1PathwayResult(isOfficialSmash);
    const summaryCard = document.getElementById('g1-summary-card');
    const nextStageButton = document.getElementById('g1-next-stage-button');
    const selectedStageIndex = g1PathwayStages.findIndex(stage => stage.id === g1SelectedStage);
    const nextStage = g1PathwayStages[selectedStageIndex + 1];
    nextStageButton.style.display = 'none';
    summaryCard.classList.toggle('g1-victory', isOfficialSmash);
    document.getElementById('g1-summary-title').innerText = isOfficialSmash ? '🏆 You Smashed the Staff!' : '🎉 You Smashed the Staff!';
    switchScreenState('game1', 'g1-screen-summary');
    if (isOfficialSmash) {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        playSound('complete');
        setTimeout(() => playSound('complete'), 450);
    }
    document.getElementById('g1-final-score').innerText = g1Score;
    if (g1Level === 'level2') {
        document.getElementById('g1-final-tier-label').innerText = 'Staff Smash Progress';
        const pathwaySteps = [...document.querySelectorAll('#g1-pathway .g1-pathway-step')];
        pathwaySteps.forEach((step, index) => {
            step.classList.remove('completed', 'current', 'locked');
            if (isOfficialSmash || index < g1Level2Phase) step.classList.add('completed');
            else if (index === g1Level2Phase) step.classList.add('current');
            else step.classList.add('locked');
        });
        document.getElementById('g1-summary-progress-title').innerText = isOfficialSmash
            ? 'Staff Smash pathway complete!'
            : `${g1Level2PhaseNames[g1Level2Phase]} is next to master`;
        document.getElementById('g1-final-tier').innerText = isOfficialSmash
            ? '4/4 stages complete'
            : `${g1Level2Phase}/4 stages complete`;
    } else {
        document.getElementById('g1-summary-progress-title').innerText = 'Your Smash progress';
        document.getElementById('g1-final-tier-label').innerText = 'Highest Grid Reached';
        document.getElementById('g1-final-tier').innerText = `${g1Tiers[g1TierIndex] / SMASH_GRID_COLS} Rows (${g1Tiers[g1TierIndex]} Cards)`;
    }
    document.getElementById('g1-final-bonus').innerText = g1BonusDuds;
    if (isOfficialSmash && nextStage) {
        nextStageButton.innerText = `Next: Smash ${nextStage.label}!`;
        nextStageButton.style.display = 'block';
    }
}

function startNextG1Stage() {
    const currentIndex = g1PathwayStages.findIndex(stage => stage.id === g1SelectedStage);
    const nextStage = g1PathwayStages[currentIndex + 1];
    if (!nextStage) return;
    g1SelectedStage = nextStage.id;
    startSelectedG1Stage();
}


/* =========================================
    GAME 2: NOTE SMASH (Fixed Width Stave)
    First game moved onto the landscape/density-grid rework: 4 columns,
    tiers of [4, 8, 12, 16] instead of 3 columns / [3, 6, 9, 12]. Game 1
    stays on its old shape until its own rewrite (its row-allocation logic
    is hardcoded to 3-wide rows in a way Game 2's never was - see
    buildSmashGridRound's doc comment). Every place below that used to
    branch or compute a pacing value from the literal card-count values
    (3/6/9/12) now uses g2TierIndex instead, so the same behavior carries
    over unchanged to the new tier values - see each such spot's own note.
   ========================================= */
let g2Score = 0; let g2TotalAttempts = 0; let g2TierIndex = 0; const g2Tiers = [4, 8, 12, 16];
const g2PhaseNames = ['Lines', 'Spaces', 'Mixed Staff', 'Ledger Notes'];
let g2Phase = 0; let g2LastScreenWasDud = false; let g2PendingStageAdvance = false; let g2CarriedStageTime = 0;
let g2Streak = 0; let g2DudStreak = 0; let g2TargetsPresent = 0; let g2TargetsFound = 0; let g2WrongTapsThisScreen = 0;
let g2TargetNote = ''; let g2Watchlist = {}; let g2IsTransitioning = false; let g2RoundStartedAt = 0;
let g2LastAnnouncedNote = '';
let tunerInstrument = 'concert';
let g2DuplicateBonusEligible = false; let g2DuplicateBonusAwarded = false;
let g2SelectedStage = 'lines';
const g2PathwayStages = [
    { id: 'lines', label: 'Lines', phase: 0 },
    { id: 'spaces', label: 'Spaces', phase: 1 },
    { id: 'mixed', label: 'Mixed Staff', phase: 2 },
    { id: 'ledger', label: 'Ledger Notes', phase: 3 }
];

function loadAllG2Progress() {
    let all = {};
    try { all = JSON.parse(localStorage.getItem('koolRiffsG2Progress') || '{}'); } catch (error) { all = {}; }
    // Pre-clef-picker saves were one flat object (implicitly treble); migrate
    // that into treble's slot instead of discarding it.
    if (all && all.unlockedStages) all = { treble: all };
    return all || {};
}

function getG2PathwayProgress() {
    const fallback = { unlockedStages: ['lines'], stageProgress: {}, lastPosition: 'lines', totalPlays: 0 };
    const progress = { ...fallback, ...(loadAllG2Progress()[getClefPreference()] || {}) };
    progress.unlockedStages = normalizeUnlockedStages(progress, g2PathwayStages);
    return progress;
}

function saveG2PathwayProgress(progress) {
    const all = loadAllG2Progress();
    all[getClefPreference()] = progress;
    localStorage.setItem('koolRiffsG2Progress', JSON.stringify(all));
}

function renderG2Pathway() {
    syncClefPickerButtons();
    const progress = getG2PathwayProgress();
    const unlocked = new Set(progress.unlockedStages || ['lines']);
    const track = document.getElementById('g2-pathway-track');
    if (!track) return;
    const subtitle = document.getElementById('g2-pathway-subtitle');
    const handoff = document.getElementById('g2-pathway-handoff');
    const isGraduated = g2PathwayStages.every(stage => unlocked.has(stage.id));
    if (subtitle) subtitle.hidden = isGraduated;
    if (handoff) handoff.hidden = !isGraduated;
    track.innerHTML = '';
    let recommended = progress.lastPosition || 'lines';
    if (!unlocked.has(recommended)) recommended = [...unlocked][unlocked.size - 1];
    g2SelectedStage = recommended;
    g2PathwayStages.forEach(stage => {
        const isUnlocked = unlocked.has(stage.id);
        const record = progress.stageProgress?.[stage.id];
        const node = document.createElement('button');
        node.className = `pathway-node${isUnlocked ? ' unlocked' : ' locked'}${stage.id === recommended ? ' recommended' : ''}${record?.cleared ? ' cleared' : ''}`;
        node.disabled = !isUnlocked;
        node.innerHTML = `<span class="pathway-node-icon">${isUnlocked ? stage.phase + 1 : '•'}</span>${isUnlocked ? `<span class="pathway-node-label">${stage.label}</span>${record?.bestScore != null ? `<small>${Math.round(record.bestScore)} pts</small>` : ''}` : ''}`;
        if (isUnlocked) node.onclick = () => selectG2Stage(stage.id);
        track.appendChild(node);
    });
    selectG2Stage(g2SelectedStage, false);
}

function selectG2Stage(stageId, rerender = true) {
    const progress = getG2PathwayProgress();
    if (!(progress.unlockedStages || []).includes(stageId)) return;
    g2SelectedStage = stageId;
    progress.lastPosition = stageId;
    saveG2PathwayProgress(progress);
    if (rerender) renderG2Pathway();
    const startButton = document.getElementById('g2-pathway-start');
    if (startButton) {
        startButton.disabled = false;
        startButton.innerText = `Start ${g2PathwayStages.find(stage => stage.id === stageId).label}`;
    }
}

function startSelectedG2Stage() {
    startG2Game();
}

function recordG2StageResult(stageId, isOfficialSmash) {
    const progress = getG2PathwayProgress();
    const stage = progress.stageProgress[stageId] || { bestScore: 0, bestTimeSec: null, timesPlayed: 0, cleared: false };
    stage.timesPlayed++;
    stage.lastPlayed = new Date().toISOString().slice(0, 10);
    stage.bestScore = Math.max(stage.bestScore || 0, Math.round(g2Score));
    stage.cleared = stage.cleared || isOfficialSmash;
    progress.stageProgress[stageId] = stage;
    progress.totalPlays = (progress.totalPlays || 0) + 1;
    const nextStage = g2PathwayStages[g2PathwayStages.findIndex(item => item.id === stageId) + 1];
    if (isOfficialSmash && nextStage && !progress.unlockedStages.includes(nextStage.id)) progress.unlockedStages.push(nextStage.id);
    if (isOfficialSmash && g2Phase === g2PathwayStages.length - 1) {
        progress.unlockedStages = g2PathwayStages.map(stageItem => stageItem.id);
        g2PathwayStages.forEach(stageItem => {
            const completedStage = progress.stageProgress[stageItem.id] || { bestScore: 0, bestTimeSec: null, timesPlayed: 0, cleared: false };
            completedStage.cleared = true;
            progress.stageProgress[stageItem.id] = completedStage;
        });
    }
    saveG2PathwayProgress(progress);
}

function toggleG2HelperModal() {
    const modal = document.getElementById('g2-helper-modal');
    if (!modal) return;
    const isOpening = !modal.classList.contains('show');
    if (isOpening) {
        g2PausedFlashRemainingMs = g2FlashDeadline ? Math.max(0, g2FlashDeadline - performance.now()) : null;
        stopAllGames();
        g2IsTransitioning = true;
        modal.classList.add('show');
        setTimeout(renderHelperSheetGraphics, 50);
    } else {
        modal.classList.remove('show');
        g2IsTransitioning = false;
        speechRoundActive = true;
        startG2Timer();
        startG2FlashTimer(g2PausedFlashRemainingMs === null ? null : g2PausedFlashRemainingMs / 1000);
        g2PausedFlashRemainingMs = null;
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

    linesCanvas.style.display = 'block'; spacesCanvas.style.display = 'block';
    const helperToggle = document.getElementById('g2-helper-toggle');
    helperToggle.style.display = 'flex';
    helperModal.classList.remove('show');
    setTimeout(renderHelperSheetGraphics, 50);
}

function getG2LedgerFoundationPool(config) {
    const lineMidpoint = config.ledgerLines.length / 2;
    const spaceMidpoint = config.ledgerSpaces.length / 2;
    return [
        ...config.ledgerSpaces.slice(0, 2),
        ...config.ledgerSpaces.slice(spaceMidpoint, spaceMidpoint + 2),
        config.ledgerLines[0],
        config.ledgerLines[lineMidpoint]
    ];
}

function startG2Game() {
    initAudio();
    const selectedPhase = g2PathwayStages.find(stage => stage.id === g2SelectedStage)?.phase ?? 0;
    setupG2Helpers(selectedPhase === 0 ? '1' : selectedPhase === 1 ? '2' : '3');

    g2Score = 0; g2TotalAttempts = 0; g2TierIndex = 0; g2Phase = g2PathwayStages.find(stage => stage.id === g2SelectedStage)?.phase ?? 0; g2Streak = 0; g2DudStreak = 0;
    g2SecondsLeft = 60; g2Watchlist = {}; g2IsTransitioning = false; g2LastScreenWasDud = false; g2PendingStageAdvance = false; g2CarriedStageTime = 0;
    g2LastAnnouncedNote = '';
    updateG2WatchlistBadge(); updateG2TrackerUI();
    
    switchScreenState('game2', 'g2-screen-game');
    speechRoundActive = true;
    
    const clefName = getClefPreference();
    renderFloatingClef('g2-clef-display', clefName);

    startG2Timer(); loadG2Grid();
}

// Fixed while wiring in the shared game shell (script.js's "SHARED GAME
// SHELL" section): this function used to end at the innerText line below,
// and the streak-dots append that belongs in it (see updateG1TrackerUI's
// equivalent line) had gone missing from inside the function entirely -
// four dangling lines sat between this function and startG2Timer(),
// outside any function body, so they ran exactly ONCE, at page load,
// against whatever g2Streak was at that moment (0) and whatever static
// text index.html had for g2-tier-tracker-text at the time - never again
// on any later round. In the shipped app today that means Game 2's tier-
// tracker streak dots never actually update as you play, unlike Game 1's.
// Making the header markup itself only exist once the shared shell builds
// it (rather than being static in index.html from page load) surfaced
// this as a hard crash instead of a silent no-op, which is what caught it.
function updateG2TrackerUI() {
    const streakDots = [0, 1, 2].map(index =>
        `<span class="streak-dot${index < g2Streak ? ' active' : ''}" aria-hidden="true"></span>`
    ).join('');
    document.getElementById('g2-tier-tracker-text').innerHTML = `${g2PhaseNames[g2Phase]} | Grid: ${g2Tiers[g2TierIndex]} <span class="streak-divider">|</span> Streak: <span class="streak-dots">${streakDots}</span>`;
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

function startG2FlashTimer(remainingSeconds = null) {
    if (g2FlashTimer) clearTimeout(g2FlashTimer);
    const flashFill = document.getElementById('g2-flash-timer-fill');
    // Dividing by SMASH_GRID_COLS instead of the old literal 3 keeps this
    // at the exact same pacing across the tier switch - both give [3,4,5,6]
    // seconds for tiers 0-3 (3/3+2 = 4/4+2 = 3, 6/3+2 = 8/4+2 = 4, etc.).
    const flashSeconds = remainingSeconds === null ? g2Tiers[g2TierIndex] / SMASH_GRID_COLS + 2 : remainingSeconds;
    g2FlashDeadline = performance.now() + flashSeconds * 1000;
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
    // Indexed by tier now, not by comparing the card count to a literal 3/6 -
    // those literals were specific to the old [3,6,9,12] values and would
    // silently stop matching anything once the tiers became [4,8,12,16].
    // Same bands as before: only the two smallest tiers get this perfect-
    // screen bonus, 0.5s on the smallest, 0.75s on the second.
    if (g2WrongTapsThisScreen === 0 && g2TierIndex <= 1) triggerG2TimeBonus(g2TierIndex === 0 ? 0.5 : 0.75);
    // Same "divide by the column count, not the literal 3" fix as
    // startG2FlashTimer - identical thresholds [2,3,4,5]s either way.
    if (g2RoundStartedAt && (performance.now() - g2RoundStartedAt) / 1000 <= cardsInPlay / SMASH_GRID_COLS + 1) triggerG2TimeBonus(0.5);
}

function awardG2TierBonus() {
    // First half of the tier progression (indices 0-1) gets 2s, second half
    // (2-3) gets 3s - was `g2Tiers[g2TierIndex] <= 6`, which stopped meaning
    // anything once the tier values changed; index-based carries the same
    // split forward regardless of what the actual card counts are.
    triggerG2TimeBonus(g2TierIndex < g2Tiers.length / 2 ? 2 : 3);
}

function awardG2DuplicateNoteBonus() {
    if (!g2DuplicateBonusEligible || g2DuplicateBonusAwarded || g2WrongTapsThisScreen > 0) return;
    g2DuplicateBonusAwarded = true;
    g2Score++;
    triggerG2TimeBonus(1);
    playSound('double-bonus');
    const targetDisplay = document.getElementById('g2-target-note-display');
    targetDisplay.innerText = 'DOUBLE NOTE BONUS! +1';
    setTimeout(() => {
        if (targetDisplay) targetDisplay.innerText = `SMASH ${g2TargetNote}`;
    }, 900);
}

function showG2StageComplete() {
    g2PendingStageAdvance = true;
    g2CarriedStageTime = Math.max(0, Math.floor(g2SecondsLeft));
    stopAllGames();
    g2IsTransitioning = true;
    recordG2StageResult(g2PathwayStages[g2Phase].id, true);
    document.getElementById('g2-stage-complete-title').innerText = `${g2PhaseNames[g2Phase]} smashed!`;
    document.getElementById('g2-stage-complete-next').innerText = `Next up: ${g2PhaseNames[g2Phase + 1]}`;
    document.getElementById('g2-stage-score').innerText = g2Score;
    document.getElementById('g2-stage-bonus').innerText = `${g2TierIndex < g2Tiers.length / 2 ? 2 : 3}s`; // same split as awardG2TierBonus
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
            awardG2DuplicateNoteBonus();
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
            g2DudStreak++; g2Score++; triggerG2TimeBonus(g2Tiers[g2TierIndex] / SMASH_GRID_COLS + 2); g2LastScreenWasDud = true; // same identical-pacing fix as startG2FlashTimer
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
    container.style.gridTemplateColumns = `repeat(${SMASH_GRID_COLS}, 1fr)`;

    const clefName = getClefPreference();
    const config = NOTE_CONFIGS[clefName];
    
    let pool = [];
    if (g2Phase === 0) pool = [...config.staffLines];
    else if (g2Phase === 1) pool = [...config.staffSpaces];
    else if (g2Phase === 2) pool = [...config.staffLines, ...config.staffSpaces];
    else pool = [...config.staffLines, ...config.staffSpaces, ...getG2LedgerFoundationPool(config)];
    
    const targetLetters = [...new Set(pool.map(n => n[0].toUpperCase()))];
    g2TargetNote = targetLetters[Math.floor(Math.random() * targetLetters.length)];
    g2DuplicateBonusEligible = false;
    g2DuplicateBonusAwarded = false;
    
    document.getElementById('g2-target-note-display').innerText = `SMASH ${g2TargetNote}`;
    if (g2TargetNote !== g2LastAnnouncedNote) { speakLetter(g2TargetNote); g2LastAnnouncedNote = g2TargetNote; }
    
    let isDud = !g2LastScreenWasDud && Math.random() < 0.15;
    // Density band per tier - indexed by TIER, not by the tier's card
    // count (which no longer doubles as a stable identifier now that the
    // values are [4, 8, 12, 16] instead of [3, 6, 9, 12]). Same bands as
    // before: tier 0 always shows exactly 1 target, tier 1 exactly 2,
    // tier 2 randomly 2-3, tier 3 randomly 3-4.
    g2TargetsPresent = isDud ? 0
        : g2TierIndex === 0 ? 1
        : g2TierIndex === 1 ? 2
        : g2TierIndex === 2 ? (Math.floor(Math.random() * 2) + 2)
        : Math.floor(Math.random() * 2) + 3;
    if (g2TargetsPresent > cardCount) g2TargetsPresent = cardCount;
    g2TargetsFound = 0;

    let targetPool = pool.filter(n => n[0].toUpperCase() === g2TargetNote);
    let distractorPool = pool.filter(n => n[0].toUpperCase() !== g2TargetNote);
    if(targetPool.length === 0) { g2TargetsPresent = 0; isDud = true; }
    g2DuplicateBonusEligible = g2Phase >= 2 && g2TargetsPresent >= 2 && targetPool.length >= 2;

    // Built through the shared grid engine (see buildSmashGridRound) instead
    // of a flat shuffled list - Game 2 has no locked/ghost rows (unlike
    // Game 1's cumulative reveal), so totalRows === activeRows here: every
    // row this round shows is always "active".
    const shuffledTargetPool = [...targetPool].sort(() => Math.random() - 0.5);
    const activeRows = cardCount / SMASH_GRID_COLS;
    const round = buildSmashGridRound({
        totalRows: activeRows,
        activeRows,
        cols: SMASH_GRID_COLS,
        targetsPresent: g2TargetsPresent,
        pickTarget: i => ({ note: shuffledTargetPool[i % shuffledTargetPool.length] }),
        pickDistractor: () => ({ note: distractorPool[Math.floor(Math.random() * distractorPool.length)] }),
    });
    g2TargetsPresent = round.targetsPresent;

    round.rows.forEach(row => row.cards.forEach(item => {
        const card = document.createElement('div');
        card.className = 'smash-card small-card';
        card.onclick = () => handleG2Click(card, item.note[0].toUpperCase());

        const innerDiv = document.createElement('div'); card.appendChild(innerDiv); container.appendChild(card);
        renderSmashCard(innerDiv, config.clef, item.note[1]);
    }));
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
    recordG2StageResult(g2PathwayStages[g2Phase].id, isGraduation);
    const nextStageButton = document.getElementById('g2-next-stage-button');
    const nextStage = g2PathwayStages[g2Phase + 1];
    nextStageButton.style.display = 'none';
    const pbKey = 'round' + (g2Phase + 1);
    let isNewPb = false;
    if (g2Score > personalBests.game2[pbKey]) { personalBests.game2[pbKey] = g2Score; isNewPb = true; }
    
    document.getElementById('g2-final-score').innerText = g2Score;
    document.getElementById('g2-final-attempts').innerText = g2TotalAttempts;
    document.getElementById('g2-final-time').innerText = `${Math.max(0, g2SecondsLeft).toFixed(1)}s`;
    const pathwaySteps = [...document.querySelectorAll('#g2-pathway .g1-pathway-step')];
    pathwaySteps.forEach((step, index) => {
        step.classList.remove('completed', 'current', 'locked');
        if (isGraduation || index < g2Phase) step.classList.add('completed');
        else if (index === g2Phase) step.classList.add('current');
        else step.classList.add('locked');
    });
    const summaryProgress = document.getElementById('g2-summary-progress-title');
    summaryProgress.innerHTML = isGraduation
        ? '<span class="g2-summary-handoff-line">You Have Smashed All The Notes!</span><span class="g2-summary-handoff-line">Next Stop: Real Smash - The Ultimate Note Reading Sprint</span>'
        : `${g2PhaseNames[g2Phase]} is next to master`;
    document.getElementById('g2-final-tier').innerText = isGraduation ? '4/4 stages complete' : `${g2Phase}/4 stages complete`;
    document.getElementById('g2-personal-best').innerText = `${personalBests.game2[pbKey]} ${isNewPb ? '(New PB! 🎉)' : ''}`;

    const title = document.getElementById('g2-summary-title');

    title.innerText = isGraduation ? '🏆 You Smashed All The Notes!' : '🎉 You Smashed the Notes!';
    if (!isGraduation && nextStage) {
        nextStageButton.innerText = `Next: Smash ${nextStage.label}!`;
        nextStageButton.style.display = 'block';
    }
}

function startNextG2Stage() {
    const nextStage = g2PathwayStages[g2Phase + 1];
    if (!nextStage) return;
    g2SelectedStage = nextStage.id;
    startSelectedG2Stage();
}

/* =========================================
    GAME 3: REAL SMASH
   ========================================= */
let isPianoInput = true; let watchListQueue = []; let currentFlashcardPitch = null; let currentMode = 'drill-both';
let currentG3Level = '1';
let currentTier = 1; let currentStreak = 0; let highestTierCompleted = 0; let score = 0; let totalAttempts = 0; let correctAttempts = 0;
let currentExpectedNotes = []; let activeInputIndex = 0;
let g3SelectedStage = 'lines';
const g3PathwayStages = [
    { id: 'lines', label: 'Lines', mode: 'drill-lines', level: '1' },
    { id: 'spaces', label: 'Spaces', mode: 'drill-spaces', level: '1' },
    { id: 'mixed', label: 'Staff Mix', mode: 'drill-both', level: '1' },
    { id: 'ledger', label: 'Ledger Notes', mode: 'drill-both', level: '2' },
    { id: 'real-smash', label: 'Real Staff Smash', mode: 'speed', level: '2' }
];

function loadAllG3Progress() {
    let all = {};
    try { all = JSON.parse(localStorage.getItem('koolRiffsG3Progress') || '{}'); } catch (error) { all = {}; }
    // Pre-clef-picker saves were one flat object (implicitly treble); migrate
    // that into treble's slot instead of discarding it.
    if (all && all.unlockedStages) all = { treble: all };
    return all || {};
}

function getG3PathwayProgress() {
    const fallback = { unlockedStages: ['lines'], stageProgress: {}, lastPosition: 'lines', totalPlays: 0 };
    const progress = { ...fallback, ...(loadAllG3Progress()[getClefPreference()] || {}) };
    progress.unlockedStages = normalizeUnlockedStages(progress, g3PathwayStages);
    return progress;
}

function saveG3PathwayProgress(progress) {
    const all = loadAllG3Progress();
    all[getClefPreference()] = progress;
    localStorage.setItem('koolRiffsG3Progress', JSON.stringify(all));
}

function renderG3Pathway() {
    syncClefPickerButtons();
    const progress = getG3PathwayProgress();
    const unlocked = new Set(progress.unlockedStages || ['lines']);
    const track = document.getElementById('g3-pathway-track');
    if (!track) return;
    const subtitle = document.getElementById('g3-pathway-subtitle');
    if (subtitle) subtitle.innerText = g3PathwayStages.every(stage => unlocked.has(stage.id))
        ? 'Core note reading complete. Real Staff Smash is ready.'
        : 'Build note-reading confidence, one mission at a time.';
    track.innerHTML = '';
    let recommended = progress.lastPosition || 'lines';
    if (!unlocked.has(recommended)) recommended = [...unlocked][unlocked.size - 1];
    g3SelectedStage = recommended;
    g3PathwayStages.forEach((stage, index) => {
        const isUnlocked = unlocked.has(stage.id);
        const record = progress.stageProgress?.[stage.id];
        const node = document.createElement('button');
        node.className = `pathway-node${isUnlocked ? ' unlocked' : ' locked'}${stage.id === recommended ? ' recommended' : ''}${record?.cleared ? ' cleared' : ''}`;
        node.disabled = !isUnlocked;
        node.innerHTML = `<span class="pathway-node-icon">${isUnlocked ? index + 1 : '•'}</span>${isUnlocked ? `<span class="pathway-node-label">${stage.label}</span>${record?.bestScore != null ? `<small>${Math.round(record.bestScore)} pts</small>` : ''}` : ''}`;
        if (isUnlocked) node.onclick = () => selectG3Stage(stage.id);
        track.appendChild(node);
    });
    selectG3Stage(g3SelectedStage, false);
}

function selectG3Stage(stageId, rerender = true) {
    const progress = getG3PathwayProgress();
    if (!(progress.unlockedStages || []).includes(stageId)) return;
    g3SelectedStage = stageId;
    progress.lastPosition = stageId;
    saveG3PathwayProgress(progress);
    if (rerender) renderG3Pathway();
    const startButton = document.getElementById('g3-pathway-start');
    if (startButton) {
        startButton.disabled = false;
        startButton.innerText = `Start ${g3PathwayStages.find(stage => stage.id === stageId).label}`;
    }
}

function startSelectedG3Stage() {
    startG3Game();
}

function recordG3StageResult(isOfficialSmash) {
    const progress = getG3PathwayProgress();
    const stage = progress.stageProgress[g3SelectedStage] || { bestScore: 0, bestTimeSec: null, timesPlayed: 0, cleared: false };
    stage.timesPlayed++;
    stage.lastPlayed = new Date().toISOString().slice(0, 10);
    stage.bestScore = Math.max(stage.bestScore || 0, Math.round(score));
    stage.cleared = stage.cleared || isOfficialSmash;
    progress.stageProgress[g3SelectedStage] = stage;
    progress.totalPlays = (progress.totalPlays || 0) + 1;
    const nextStage = g3PathwayStages[g3PathwayStages.findIndex(item => item.id === g3SelectedStage) + 1];
    if (isOfficialSmash && nextStage && !progress.unlockedStages.includes(nextStage.id)) progress.unlockedStages.push(nextStage.id);
    saveG3PathwayProgress(progress);
}

function getTimeLimitForTier(tier) { return tier + 1; }

function toggleInputMethod() {
    isPianoInput = !isPianoInput;
    const piano = document.getElementById('piano-container'); const thumbs = document.getElementById('thumb-stacks-container'); const btn = document.getElementById('input-toggle-btn');
    if (isPianoInput) { piano.style.display = 'flex'; thumbs.style.display = 'none'; btn.innerText = '🔄 Switch to Thumb Stacks'; }
    else { piano.style.display = 'none'; thumbs.style.display = 'flex'; btn.innerText = '🔄 Switch to Piano Keyboard'; }
    scrollG3InputIntoView();
}

function toggleG3HelperModal() {
    const modal = document.getElementById('helper-sheet-modal');
    if (!modal) return;
    const isOpening = !modal.classList.contains('show');
    if (isOpening) {
        g3PausedFlashRemainingMs = g3FlashDeadline ? Math.max(0, g3FlashDeadline - performance.now()) : null;
        stopAllGames();
        modal.classList.add('show');
        setTimeout(renderHelperSheetGraphics, 50);
    } else {
        modal.classList.remove('show');
        if (secondsLeft > 0) start60SecondTimer();
        if (currentMode === 'speed') startFlashcardTimer(getTimeLimitForTier(currentTier), g3PausedFlashRemainingMs === null ? null : g3PausedFlashRemainingMs / 1000);
        g3PausedFlashRemainingMs = null;
    }
}

function applyBottomAnnotation(text) { const VF = Vex.Flow; const anno = new VF.Annotation(text); anno.setVerticalJustification(3); return anno; }

const helperMnemonics = {
    treble: { lines: 'Every Good Boy Does Fine', spaces: 'FACE' },
    bass: { lines: 'Good Boys Deserve Fruit Always', spaces: 'All Cows Eat Grass' },
    alto: { lines: 'Fat Alley Cats Eat Garbage', spaces: 'Great Big Dogs Fight' },
    tenor: { lines: 'Dogs Fight All Cats Elegantly', spaces: 'Every Good Boy Deserves' }
};

function getHelperLedgerNotes(config, side) {
    const lines = config.ledgerLines;
    const spaces = config.ledgerSpaces;
    const lineMidpoint = lines.length / 2;
    const spaceMidpoint = spaces.length / 2;
    return side === 'above'
        ? [spaces[spaceMidpoint], lines[lineMidpoint], spaces[spaceMidpoint + 1], lines[lineMidpoint + 1], spaces[spaceMidpoint + 2]]
        : [spaces[0], lines[0], spaces[1], lines[1], spaces[2]];
}

function addHelperLabels(canvas, notes, labels, placement) {
    const labelsRow = document.createElement('div');
    labelsRow.className = `helper-note-labels ${placement}`;
    labels.forEach(label => {
        const labelElement = document.createElement('span');
        if (label.length > 1 && placement === 'below') {
            labelElement.innerHTML = `<b>${label[0]}</b><span class="helper-label-rest">${label.slice(1)}</span>`;
        } else {
            labelElement.innerText = label;
            labelElement.classList.add('single-label');
        }
        labelsRow.appendChild(labelElement);
    });
    canvas.appendChild(labelsRow);
    return labelsRow;
}

function alignHelperLabelsToNotes(canvas, labelsRow) {
    const svg = canvas.querySelector('svg');
    const noteHeads = [...canvas.querySelectorAll('.vf-notehead')];
    if (!svg || noteHeads.length < labelsRow.children.length) return;
    const canvasRect = canvas.getBoundingClientRect();
    const relevantNoteHeads = labelsRow.classList.contains('below')
        ? noteHeads.slice(-labelsRow.children.length)
        : noteHeads.slice(0, labelsRow.children.length);
    [...labelsRow.children].forEach((label, index) => {
        const noteRect = relevantNoteHeads[index].getBoundingClientRect();
        const noteCenter = noteRect.left + noteRect.width / 2 - canvasRect.left;
        label.style.left = `${noteCenter}px`;
        label.style.transform = label.classList.contains('single-label') ? 'translateX(-50%)' : 'none';
    });
}

// Measures how much a label row's font-size must shrink so no label overlaps
// the next one (or runs past the canvas edge). Returns 1 when it already fits.
function measureRequiredLabelScale(canvas, labelsRow) {
    if (!labelsRow || !labelsRow.children.length) return 1;
    const canvasRect = canvas.getBoundingClientRect();
    const rects = [...labelsRow.children].map(span => span.getBoundingClientRect());
    let ratio = 1;
    rects.forEach((rect, index) => {
        const rightBound = index < rects.length - 1 ? rects[index + 1].left : canvasRect.right;
        const available = rightBound - rect.left;
        if (available > 0 && rect.width > available) ratio = Math.min(ratio, available / rect.width);
    });
    return ratio;
}

function applyLabelScale(labelsRow, ratio) {
    const baseSize = parseFloat(getComputedStyle(labelsRow).fontSize);
    labelsRow.style.fontSize = `${Math.max(10, baseSize * ratio * 0.94)}px`;
}

function renderHelperSheetGraphics() {
    try {
        const VF = Vex.Flow;
        const currentClef = getClefPreference();
        const config = NOTE_CONFIGS[currentClef];
        const ledgerLineMidpoint = config.ledgerLines.length / 2;
        const helperRows = [
            { ids: ['helper-lines-canvas', 'g2-helper-lines-canvas'], notes: config.staffLines, labels: helperMnemonics[currentClef].lines.split(' ') },
            { ids: ['helper-spaces-canvas', 'g2-helper-spaces-canvas'], notes: config.staffSpaces, labels: helperMnemonics[currentClef].spaces.split('') },
            { ids: ['helper-ledger-canvas', 'g2-helper-ledger-canvas'], ledger: true, notes: getHelperLedgerNotes(config, 'above'), belowNotes: getHelperLedgerNotes(config, 'below'), labels: getHelperLedgerNotes(config, 'above').map(note => note[0]), belowLabels: getHelperLedgerNotes(config, 'below').map(note => note[0]) }
        ];

        // Each helper sheet (Note Smash's vs. Real Smash's) gets one shared
        // shrink ratio across its three rows, so if the mnemonic sentence needs
        // to shrink to fit, every label on that sheet shrinks together rather
        // than ending up at mismatched sizes.
        const pendingByInstance = {};
        helperRows.forEach(row => row.ids.forEach(id => {
            if (!document.getElementById(id)) return;
            const instanceKey = id.startsWith('g2-') ? 'g2' : 'g3';
            pendingByInstance[instanceKey] = pendingByInstance[instanceKey] || { remaining: 0, entries: [] };
            pendingByInstance[instanceKey].remaining++;
        }));

        helperRows.forEach(row => row.ids.forEach(id => {
            const canvas = document.getElementById(id);
            if (!canvas) return;
            const instanceKey = id.startsWith('g2-') ? 'g2' : 'g3';
            canvas.innerHTML = '';
            const helperWidth = Math.max(260, canvas.clientWidth || 320);
            const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.SVG);
            renderer.resize(helperWidth, row.ledger ? 235 : 125);
            const context = renderer.getContext();
            const stave = new VF.Stave(10, row.ledger ? 92 : 32, helperWidth - 20).addClef(currentClef);
            stave.setBegBarType(VF.Barline.type.NONE);
            stave.options.left_bar = false;
            stave.setNoteStartX(stave.getX() + 68);
            stave.setContext(context).draw();
            const notes = row.notes.map(note => new VF.StaveNote({
                clef: currentClef,
                keys: [note[1]],
                duration: 'w',
                stem_direction: 1
            }));
            const voice = new VF.Voice({ num_beats: notes.length * 4, beat_value: 4 }).addTickables(notes);
            new VF.Formatter().joinVoices([voice]).format([voice], Math.max(120, helperWidth - 110));
            voice.draw(context, stave);
            const labelsRow = addHelperLabels(canvas, row.notes, row.labels, row.ledger ? 'above ledger' : 'below');
            let belowLabelsRow = null;
            if (row.ledger) {
                const belowNotes = row.belowNotes.map(note => new VF.StaveNote({ clef: currentClef, keys: [note[1]], duration: 'w', stem_direction: 1 }));
                const belowVoice = new VF.Voice({ num_beats: belowNotes.length * 4, beat_value: 4 }).addTickables(belowNotes);
                new VF.Formatter().joinVoices([belowVoice]).format([belowVoice], Math.max(120, helperWidth - 110));
                belowVoice.draw(context, stave);
                belowLabelsRow = addHelperLabels(canvas, row.belowNotes, row.belowLabels, 'below ledger');
            }
            requestAnimationFrame(() => {
                alignHelperLabelsToNotes(canvas, labelsRow);
                if (belowLabelsRow) alignHelperLabelsToNotes(canvas, belowLabelsRow);
                const bucket = pendingByInstance[instanceKey];
                bucket.entries.push({ canvas, labelsRow });
                if (belowLabelsRow) bucket.entries.push({ canvas, labelsRow: belowLabelsRow });
                bucket.remaining--;
                if (bucket.remaining === 0) {
                    const ratio = Math.min(1, ...bucket.entries.map(entry => measureRequiredLabelScale(entry.canvas, entry.labelsRow)));
                    if (ratio < 1) bucket.entries.forEach(entry => applyLabelScale(entry.labelsRow, ratio));
                }
            });
            canvas.querySelectorAll('svg line, svg path').forEach(line => { line.setAttribute('stroke', '#000000'); line.setAttribute('stroke-width', '1.3'); });
        }));
    } catch(e) { console.error('renderHelperSheetGraphics failed:', e); }
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
    const selectedStage = g3PathwayStages.find(stage => stage.id === g3SelectedStage);
    currentG3Level = selectedStage.level;
    currentMode = selectedStage.mode;
    updateG3TrackerUI();
    switchScreenState('game3', 'g3-screen-game'); start60SecondTimer(); loadNextCard();
    scrollG3InputIntoView();
}

// On a real phone in landscape, .g3-screen-game's stacked content (header,
// flashcard, toggle, answer boxes, piano) is comfortably taller than the
// viewport - the piano can land entirely below the fold with no visual hint
// that it's there. Bringing the active input control (piano or thumb
// stacks) into view once, at round start, means a student never has to
// discover on their own that they need to scroll to find their keys.
function scrollG3InputIntoView() {
    const activeInput = document.getElementById(isPianoInput ? 'piano-container' : 'thumb-stacks-container');
    if (activeInput) activeInput.scrollIntoView({ block: 'end', behavior: 'auto' });
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
        const labelsContainer = document.getElementById('g3-note-labels'); labelsContainer.innerHTML = '';

        const clefName = getClefPreference();
        const config = NOTE_CONFIGS[clefName];
        const level = currentG3Level;

        let combinedPool = [];
        if (currentMode === 'speed') {
            combinedPool = [...config.staffLines, ...config.staffSpaces];
            if(level >= 2) combinedPool = combinedPool.concat(getG2LedgerFoundationPool(config));
        } else {
            if(currentMode === 'drill-lines' || currentMode === 'drill-both') {
                combinedPool = combinedPool.concat(config.staffLines); if(level >= 2) combinedPool = combinedPool.concat(getG2LedgerFoundationPool(config).filter(note => config.ledgerLines.some(ledgerNote => ledgerNote[1] === note[1])));
            }
            if(currentMode === 'drill-spaces' || currentMode === 'drill-both') {
                combinedPool = combinedPool.concat(config.staffSpaces); if(level >= 2) combinedPool = combinedPool.concat(getG2LedgerFoundationPool(config).filter(note => config.ledgerSpaces.some(ledgerNote => ledgerNote[1] === note[1])));
            }
        }

        // Landscape pivot, step 8, then Rob's merged-card redesign: the card
        // is now the same width as the piano (880px, see .card-wrapper in
        // style.css), so the note area genuinely benefits from more than the
        // 320/260 this used to be capped at - a wide card with notes still
        // bunched at 420px would look exactly like the bug this was meant to
        // fix. VexFlow's renderer sets an INLINE width style matching
        // rendererWidth exactly, which wins over #score-canvas svg's own
        // (non-!important) max-width:100% CSS rule the same way it did for
        // the SMASH grid cards in steps 5-6 - so this JS number, not the
        // CSS, is what actually decides how big the card renders.
        const renderer = new VF.Renderer(canvasContainer, VF.Renderer.Backends.SVG);
        const rendererWidth = Math.min(900, Math.max(260, canvasContainer.clientWidth || 420));
        renderer.resize(rendererWidth, 145);
        const context = renderer.getContext();
        const staveWidth = Math.min(840, rendererWidth - 24);
        const staveX = (rendererWidth - staveWidth) / 2;
        const stave = new VF.Stave(staveX, 25, staveWidth); stave.addClef(config.clef);
        if(currentMode.includes('drill') || currentTier === 1) {
            stave.setEndBarType(VF.Barline.type.NONE); stave.setBegBarType(VF.Barline.type.NONE); stave.options.left_bar = false; stave.options.right_bar = false;
        } else { stave.addTimeSignature("4/4"); }
        stave.setContext(context).draw();

        currentExpectedNotes = []; let staveNotes = []; let durations = [];
        if(currentMode.includes('drill')) { durations = ["w"]; }
        else {
            if (currentTier === 1) { durations = ["w"]; } else if (currentTier === 2) { durations = ["h", "h"]; }
            else if (currentTier === 3) { durations = ["h", "q", "q"]; } else if (currentTier === 4) { durations = ["q", "q", "q", "q"]; }
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

        // Justify across the stave's REAL note area (mirrors
        // renderRstompStaff's own justify pass), then put every note ON an
        // even slot across that area rather than trusting VexFlow's own
        // proportional (duration-weighted) spacing for it - a single whole
        // note belongs in the middle of the staff, not wherever the clef
        // happens to leave it, and a mix of halves/quarters should still
        // read as evenly spaced. This is what lets the note-labels below
        // land directly under their own note instead of a note-shaped area
        // somewhere off to the left.
        const trueStartX = stave.getNoteStartX();
        const trueEndX = stave.getNoteEndX();
        let voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(staveNotes);
        new VF.Formatter().joinVoices([voice]).format([voice], trueEndX - trueStartX - 10);
        staveNotes.forEach((note, i) => {
            const slotX = trueStartX + ((i + 0.5) / staveNotes.length) * (trueEndX - trueStartX);
            const tickContext = note.getTickContext();
            tickContext.setX(tickContext.getX() + (slotX - note.getAbsoluteX()));
        });
        voice.draw(context, stave);

        // One label per note, positioned from the note's own real rendered
        // x (read back post-draw, the same way renderRstompStaff reads note
        // x back for its counting row) rather than laid out as a row of its
        // own - see the .g3-note-labels comment in style.css for why.
        const svgEl = canvasContainer.querySelector('svg');
        const svgRect = svgEl.getBoundingClientRect();
        const labelsRect = labelsContainer.getBoundingClientRect();
        staveNotes.forEach((note, idx) => {
            const label = document.createElement('div');
            label.className = 'g3-note-label'; label.id = `box-${idx}`;
            label.style.left = `${(svgRect.left - labelsRect.left) + note.getAbsoluteX()}px`;
            const inner = document.createElement('div');
            inner.className = 'g3-note-label-inner';
            label.appendChild(inner);
            labelsContainer.appendChild(label);
        });
        activeInputIndex = 0; setActiveBox(0);

        if(currentMode === 'speed') startFlashcardTimer(getTimeLimitForTier(currentTier));
    } catch (err) {}
}

function startFlashcardTimer(seconds, remainingSeconds = null) {
    const flashFill = document.getElementById('flash-timer-fill');
    const timerSeconds = remainingSeconds === null ? seconds : remainingSeconds;
    g3FlashDeadline = performance.now() + timerSeconds * 1000;
    setTimeout(() => { flashFill.style.transition = `width ${timerSeconds}s linear`; flashFill.style.width = '0%'; }, 50);

    breakOutTimer = setTimeout(() => {
        if (secondsLeft > 0) {
            playSound('timeout'); document.getElementById('card-canvas-wrapper').classList.add('timeout'); currentStreak = 0; updateG3TrackerUI(); 
            currentExpectedNotes.forEach((val, idx) => {
                const box = document.getElementById(`box-${idx}`); if (box && !box.classList.contains('correct')) { box.firstElementChild.textContent = val; box.firstElementChild.style.color = 'var(--accent-red)'; }
            });
            setTimeout(loadNextCard, 800);
        }
    }, seconds * 1000);
}

function setActiveBox(idx) {
    document.querySelectorAll('.g3-note-label').forEach(el => el.classList.remove('active-box'));
    const target = document.getElementById(`box-${idx}`); if (target) { activeInputIndex = idx; target.classList.add('active-box'); }
}

function handleKeypadInput(letter) {
    if (secondsLeft <= 0) return;
    const input = document.getElementById(`box-${activeInputIndex}`); if (!input) return;

    input.firstElementChild.textContent = letter; const correctVal = currentExpectedNotes[activeInputIndex].toUpperCase(); totalAttempts++;

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
        setTimeout(() => { input.firstElementChild.textContent = ''; input.classList.remove('incorrect'); }, 300);
    }
}

function finishG3Round(isGraduation = false) {
    stopAllGames(); playSound('complete'); switchScreenState('game3', 'g3-screen-summary');
    const bonusCleared = g3SelectedStage === 'real-smash' && highestTierCompleted === 4;
    recordG3StageResult(isGraduation || bonusCleared);
    
    let isNewPb = false;
    if (score > personalBests.game3[currentMode]) { personalBests.game3[currentMode] = score; isNewPb = true; }

    let accuracy = totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100);
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-accuracy').innerText = `${accuracy}%`;
    document.getElementById('g3-personal-best').innerText = `${personalBests.game3[currentMode]} ${isNewPb ? '(New PB! 🎉)' : ''}`;
    
    let medal = 'Keep Practising! 💪';
    const title = document.getElementById('g3-summary-title');
    const nextStageButton = document.getElementById('g3-next-stage-button');
    const selectedStageIndex = g3PathwayStages.findIndex(stage => stage.id === g3SelectedStage);
    const nextStage = g3PathwayStages[selectedStageIndex + 1];
    nextStageButton.style.display = 'none';

    if (currentMode === 'speed') {
        document.getElementById('tier-result').style.display = 'block';
        document.getElementById('final-tier').innerText = highestTierCompleted;
        if (highestTierCompleted === 4) medal = 'Gold 🥇'; else if (highestTierCompleted === 3) medal = 'Silver 🥈'; else if (highestTierCompleted === 2) medal = 'Bronze 🥉';
        title.innerText = g3SelectedStage === 'real-smash' ? 'You Smashed Real Staff! 🌟' : `You Crushed ${g3PathwayStages[selectedStageIndex].label}! 🌟`;
    } else {
        document.getElementById('tier-result').style.display = 'none';
        if (isGraduation || (accuracy >= 95 && score >= 30)) {
            medal = 'Perfect Drill! 🌟';
            title.innerText = `You Crushed ${g3PathwayStages[selectedStageIndex].label}! 🌟`;
            if (nextStage) {
                nextStageButton.innerText = `Next: Smash ${nextStage.label}!`;
                nextStageButton.style.display = 'block';
            }
        } else {
            title.innerText = "Round Complete!";
        }
    }
    
    document.getElementById('final-medal').innerText = medal;
}

function startNextG3Stage() {
    const currentIndex = g3PathwayStages.findIndex(stage => stage.id === g3SelectedStage);
    const nextStage = g3PathwayStages[currentIndex + 1];
    if (!nextStage) return;
    g3SelectedStage = nextStage.id;
    startSelectedG3Stage();
}


window.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    if (!document.getElementById('g3-screen-game') || !document.getElementById('g3-screen-game').classList.contains('active')) return;

    if (['A','B','C','D','E','F','G'].includes(key)) {
        if (isPianoInput) { const pKey = document.querySelector(`.white-key[data-note="${key}"]`); if (pKey) { pKey.classList.add('simulated-active'); setTimeout(() => pKey.classList.remove('simulated-active'), 100); } }
        else { const cKey = document.getElementById(`btn-${key}`); if (cKey) { cKey.classList.add('simulated-active'); setTimeout(() => cKey.classList.remove('simulated-active'), 100); } }
        handleKeypadInput(key);
    }
});

// script.js loads at the bottom of <body>, so every game's DOM already
// exists (just hidden via .view/.screen CSS) by the time this runs - see
// the "SHARED GAME SHELL" section above for why this is safe to do once,
// unconditionally, rather than lazily per game on first entry.
initSharedGameShells();
/* =========================================================================
   KEYBOARD: one place for the games that have no keys of their own
   -------------------------------------------------------------------------
   Rob, 2026-10-14: "map the games to the computer keyboard like we did with
   Real Smash... if there is not a computer keyboard mapped, create one."

   Already mapped, and left alone here:
     Real Smash      A-G (script.js), the note names
     Rhythm Stomp    1-9, Space, Z X C, Backspace, Enter (rhythm.js)
     Beat Smash      1 2 3 4 for the four pads, Space for the one big pad
                     (beat-pads.js)

   Mapped here, and each key PRESSES THE REAL BUTTON (.click()), so a key can
   never do something a tap can't, and no game's logic is copied:

     Staff, Note and Value Smash   the cards sit in a grid three across, so the
                                   keys sit the same way under the left hand:
                                        1 2 3
                                        Q W E
                                        A S D
                                        Z X C
                                   Row one of the keys is row one of the cards.
     Value Smash                   Space or N is "Nothing here". The Tree is
                                   dragged on a screen; on keys, 1 2 3 4 5 6 pick
                                   up a tile from the tray, left to right, and
                                   Q, A or Z drops it on the top, middle or
                                   bottom row.
     Rhythm Stomp Lab              Z or Space = PLAY, X = NOTHING NEW; the keypad
                                   takes its own labels (1-6, +, e, a, ( and ));
                                   Backspace undoes (or erases), R restarts,
                                   H hears it, Enter checks the answer.
     Metronome and tuner           Space starts and stops, Up and Down change the
                                   tempo (Shift: by 5), T taps the tempo, Esc goes back.
     Every game                    Esc or P pauses, and resumes. Enter or Space
                                   answers a message box (Continue) and on a
                                   results screen goes on to what is next (Value
                                   Smash too: its green button).

   The keys do nothing while a text box has the focus, so a nickname can still
   be typed. Nothing is drawn on the screen for them: there are no new words.
   ========================================================================= */
(function () {
    'use strict';   // text-ok: a JavaScript directive

    const GRID_KEYS = ['1', '2', '3', 'q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'];
    const TRAY_KEYS = ['1', '2', '3', '4', '5', '6'];
    const TREE_ROW_KEYS = ['q', 'a', 'z'];   // the Tree's top, middle and bottom row: the left of the keys, top to bottom

    function isActive(id) {
        const el = document.getElementById(id);
        return !!(el && el.classList.contains('active'));
    }
    function usable(el) { return !!(el && !el.disabled && !el.hidden && el.offsetParent !== null); }
    function press(el) { if (usable(el)) { el.click(); return true; } return false; }
    function first(selector, root) { return (root || document).querySelector(selector); }
    function visibleOf(selector, root) {
        return Array.from((root || document).querySelectorAll(selector)).find(usable) || null;
    }
    function typing(e) {
        const t = e.target;
        if (!t) return false;
        const tag = t.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    }

    /* ---------- Message boxes and results screens ---------- */

    // A message box (Stage Complete, Level Mastered...) is answered by Enter or
    // Space: its main button, which is always the first .btn-start in it.
    function answerModal(key) {
        if (key !== 'Enter' && key !== ' ') return false;
        const modal = Array.from(document.querySelectorAll('.modal-overlay.show')).pop();
        if (!modal) return false;
        return press(visibleOf('.btn-start', modal) || visibleOf('button', modal));
    }

    // A results screen goes on to what is next: the next stage, then the next
    // game, and failing both, another go.
    const RESULTS = [
        { screen: 'g1-screen-summary', picks: ['g1-next-stage-button', 'g1-next-game-button', null] },
        { screen: 'g2-screen-summary', picks: ['g2-next-stage-button', 'g2-next-game-button', null] },
        { screen: 'g3-screen-summary', picks: ['g3-next-stage-button', null] },
        { screen: 'value-screen-results', picks: [null] }   // Value Smash: the one green button
    ];
    function answerResults(key) {
        if (key !== 'Enter') return false;
        for (const r of RESULTS) {
            if (!isActive(r.screen)) continue;
            const screen = document.getElementById(r.screen);
            for (const id of r.picks) {
                const btn = id ? document.getElementById(id) : visibleOf('.btn-start', screen);
                if (press(btn)) return true;
            }
        }
        return false;
    }

    /* ---------- Pause, in the three games that have one ---------- */

    const PAUSABLE = [
        { id: 'game1', screen: 'g1-screen-game' },
        { id: 'game2', screen: 'g2-screen-game' },
        { id: 'game3', screen: 'g3-screen-game' }
    ];
    function overlayOpen(id) {
        const o = document.getElementById('pause-overlay-' + id);
        return !!(o && o.classList.contains('active'));
    }
    function pauseOrResume(key) {
        if (key !== 'Escape' && key !== 'p') return false;
        for (const g of PAUSABLE) {
            if (!isActive(g.screen)) continue;
            if (document.querySelector('.modal-overlay.show')) return false;
            if (overlayOpen(g.id)) { if (typeof resumeGame === 'function') resumeGame(g.id); }
            else if (typeof pauseCurrentGame === 'function') pauseCurrentGame(g.id);
            return true;
        }
        return false;
    }
    function resumeWithEnter(key) {
        if (key !== 'Enter' && key !== ' ') return false;
        for (const g of PAUSABLE) {
            if (isActive(g.screen) && overlayOpen(g.id) && typeof resumeGame === 'function') {
                resumeGame(g.id);
                return true;
            }
        }
        return false;
    }

    /* ---------- Staff Smash, Note Smash, Value Smash: the card grid ---------- */

    function gridPress(key, screenId, containerSel, cardSel, pausedId) {
        if (!isActive(screenId)) return false;
        if (pausedId && overlayOpen(pausedId)) return false;
        if (document.querySelector('.modal-overlay.show')) return false;
        const at = GRID_KEYS.indexOf(key);
        if (at < 0) return false;
        const cards = document.querySelectorAll(containerSel + ' ' + cardSel);
        const card = cards[at];
        if (!card) return false;
        card.click();
        return true;
    }

    /* ---------- Value Smash: the tray, and "Nothing here" ---------- */

    function valueKeys(key) {
        if (!isActive('value-screen-game')) return false;
        if (key === ' ' || key === 'n') return press(document.getElementById('value-nothing'));
        // The Tree: a tile is picked up from the tray, then dropped on a row.
        const tray = TRAY_KEYS.indexOf(key);
        if (tray >= 0) {
            const tile = document.querySelectorAll('.vsmash-tray .vsmash-tile')[tray];
            if (tile) { tile.click(); return true; }
        }
        const drop = TREE_ROW_KEYS.indexOf(key);
        if (drop >= 0) {
            const row = document.querySelectorAll('#value-stage .vsmash-tree-row')[drop];
            if (row) { row.click(); return true; }
        }
        return gridPress(key, 'value-screen-game', '.vsmash-grid', '.vsmash-card', null);
    }

    /* ---------- Rhythm Stomp Lab ---------- */

    function stompKeys(key) {
        if (!isActive('rhythm-lab-screen-game')) return false;
        if (document.querySelector('.modal-overlay.show')) return false;
        const twoButton = document.getElementById('rstomp-controls-twobutton');
        const keypad = document.getElementById('rstomp-controls-keypad');
        const onTwo = !!(twoButton && !twoButton.hidden);
        const onKeypad = !!(keypad && !keypad.hidden);

        if (onTwo && (key === 'z' || key === ' ')) return press(document.getElementById('rstomp-play-btn'));
        if (onTwo && key === 'x') return press(document.getElementById('rstomp-bracket-btn'));

        if (key === 'Backspace') {
            return press(document.getElementById(onKeypad ? 'rstomp-key-erase' : 'rstomp-undo-btn'));
        }
        if (key === 'r') {
            return press(document.getElementById(onKeypad ? 'rstomp-scribe-restart-btn' : 'rstomp-restart-btn'));
        }
        if (key === 'h') return press(document.getElementById('rstomp-listen-btn'));
        if (key === 'Enter') return press(document.getElementById('rstomp-submit-button'));

        if (onKeypad) {
            if (key === '(' || key === '[') return press(document.getElementById('rstomp-key-open'));
            if (key === ')' || key === ']') return press(document.getElementById('rstomp-key-close'));
            const label = key === '=' ? '+' : key;
            const btn = Array.from(keypad.querySelectorAll('.rstomp-key[data-digit]'))
                .find(b => b.dataset.digit === label);
            return press(btn);
        }
        return false;
    }

    /* ---------- The metronome and the tuner ---------- */

    function toolsKeys(e, key) {
        if (!isActive('view-tools')) return false;
        const view = document.getElementById('view-tools');
        if (key === 'Escape') return press(first('.tl-back', view));
        if (key === ' ') return press(visibleOf('.tl-go', view));
        if (key === 't') return press(visibleOf('.tl-tap', view));
        if ((key === 'ArrowUp' || key === 'ArrowDown') && typeof krToolsSetBpm === 'function'
                && typeof krTools === 'object' && visibleOf('.tl-bpm', view)) {
            krToolsSetBpm(krTools.bpm + (key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1));
            return true;
        }
        return false;
    }

    /* ---------- One listener ---------- */

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        // Real Smash's own listener (A-G) is separate and already installed;
        // this one stays out of its letters.
        const handled =
            answerModal(key) ||
            pauseOrResume(key) ||
            resumeWithEnter(key) ||
            answerResults(key) ||
            gridPress(key, 'g1-screen-game', '#g1-grid-container', '.smash-card', 'game1') ||
            gridPress(key, 'g2-screen-game', '#g2-grid-container', '.smash-card', 'game2') ||
            valueKeys(key) ||
            stompKeys(key) ||
            toolsKeys(e, key);
        if (handled) e.preventDefault();
    });
})();

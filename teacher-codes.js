/* =========================================
   KOOL RIFFS - TEACHER CODES
   =========================================
   Two codes for Rob, typed into the box on the "About Kool Riffs" screen.
   They act on THIS DEVICE only - there is no network.

     RESET  every game back to zero: players, progress, settings, the
            measured tap delay. The first time into everything again.
     OPEN   every level of every game open, to jump in anywhere. Type it
            again to turn it off. Levels played while it was on stay open
            (nothing opened is ever closed); RESET is the way back to zero.
            While it is on, Beat Smash's pathway also shows the last beat
            test's numbers.

   Change the codes here. Capitals don't matter.
   ========================================= */
const KR_CODES = {
    reset: 'KOOLRESET',
    openAll: 'KOOLOPEN',
};
const KR_OPEN_ALL_KEY = 'koolRiffsOpenAll';
const KR_STORAGE_PREFIX = 'koolRiffs';    // every key the app keeps starts with this

KR.openAll = function () {
    try { return localStorage.getItem(KR_OPEN_ALL_KEY) === '1'; } catch (e) { return false; }
};

// Each game's progress getter passes its stages through this, so with OPEN
// on, every stage is unlocked wherever the game looks.
KR.openStages = function (progress, ids) {
    if (KR.openAll()) progress.unlockedStages = ids.slice();
    return progress;
};

function enterTeacherCode() {
    const input = document.getElementById('kr-code-input');
    const result = document.getElementById('kr-code-result');
    const code = input.value.trim().toUpperCase();
    input.value = '';
    if (code === KR_CODES.reset) {
        try {
            Object.keys(localStorage)
                .filter(key => key.indexOf(KR_STORAGE_PREFIX) === 0)
                .forEach(key => localStorage.removeItem(key));
        } catch (e) {}
        result.textContent = KR.t('code.reset');
        setTimeout(() => location.reload(), 1200);
        return;
    }
    if (code === KR_CODES.openAll) {
        const on = !KR.openAll();
        try {
            if (on) localStorage.setItem(KR_OPEN_ALL_KEY, '1');
            else localStorage.removeItem(KR_OPEN_ALL_KEY);
        } catch (e) {}
        result.textContent = KR.t(on ? 'code.open' : 'code.closed');
        return;
    }
    result.textContent = KR.t('code.unknown');
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('kr-code-input');
    if (!input) return;
    input.placeholder = KR.t('code.placeholder');
    input.onkeydown = (e) => { if (e.key === 'Enter') enterTeacherCode(); };
});

/* THE KEEPER: what a clean take says, and the celebration when it clears.

   Rob, 2026-10-24: "When I perform at the first time correctly, that's when we
   have comments like it's in the can, you got it on the first take. That's a
   take. That's a keeper. You nailed it. Similar comments for successful 1st of
   3 attempts, 2 of 3 and the successful 3rd in a row. That should be a
   celebratory screen. They should be proud of their accomplishment."

   It sits on the app-wide rule (CLAUDE.md "Core mechanics"): a step not yet
   missed clears on one clean take; a missed one is OWED three in a row. So a
   clean take is one of four kinds:

     'first'    cleared first time, nothing missed     -> celebration
     'owed.1'   owed, the first of the three
     'owed.2'   owed, the second of the three
     'owed.3'   owed, the third in a row: cleared      -> celebration

   The lines are events in content/dialogue.js (keeper.first, keeper.owed.1 ...),
   so Rob writes and records them like any other line, and a coach can have
   their own (keeper.first.riff). The celebration screen shows a big title and
   the line just said, and goes by itself (or on a tap). */

const KR_KEEPER_SHOW_MS = 2600;    // how long the celebration stays up

// Which kind of clean take is this? null: an ordinary clean take that does not
// clear anything yet (the picture go on one and two bars in Beat Smash).
KR.keeperKind = function (owed, streakAfter, needed) {
    if (owed) return 'owed.' + Math.max(1, Math.min(3, streakAfter));
    return streakAfter >= needed ? 'first' : null;
};

KR.keeperCelebrates = function (kind) {
    return kind === 'first' || kind === 'owed.3';
};

// Say the line for this kind (through the game's own event function, so a
// coach's own lines are used), and celebrate it if it clears. Returns true
// when it celebrated. opts.say(eventName) speaks; opts.silent shows the
// screen without saying anything (a reminder is being said instead).
KR.keeper = function (kind, opts) {
    opts = opts || {};
    if (!kind) return false;
    const say = opts.say || (name => KR.event(name));
    let words = '';
    if (!opts.silent) {
        KR.lastWords = '';
        say('keeper.' + kind);
        words = KR.lastWords || '';
    }
    if (!KR.keeperCelebrates(kind)) return false;
    KR.celebrate({ title: KR.t(kind === 'first' ? 'keeper.big.first' : 'keeper.big.three'),
        line: words, stars: kind === 'first' ? 1 : 3, then: opts.then });
    return true;
};

// The celebration screen. Over everything, never in the way: it goes by itself
// after KR_KEEPER_SHOW_MS, or at a tap, and then calls opts.then.
KR.celebrate = function (opts) {
    opts = opts || {};
    let box = document.getElementById('kr-celebrate');
    if (!box) {
        box = document.createElement('div');
        box.id = 'kr-celebrate';
        box.className = 'kr-celebrate';
        box.setAttribute('role', 'status');
        box.innerHTML = '<div class="kr-celebrate-card"><div class="kr-celebrate-stars"></div>'
            + '<div class="kr-celebrate-title"></div><div class="kr-celebrate-line"></div></div>'
            + '<div class="kr-celebrate-confetti" aria-hidden="true"></div>';
        document.body.appendChild(box);
    }
    box.querySelector('.kr-celebrate-title').textContent = opts.title || '';
    box.querySelector('.kr-celebrate-line').textContent = opts.line || '';
    const stars = box.querySelector('.kr-celebrate-stars');
    stars.textContent = '';
    for (let i = 0; i < (opts.stars || 1); i++) {
        const star = document.createElement('span');
        star.textContent = KR.t('beat.star.full');
        star.style.animationDelay = (0.15 + i * 0.18) + 's';
        stars.appendChild(star);
    }
    const confetti = box.querySelector('.kr-celebrate-confetti');
    confetti.textContent = '';
    for (let i = 0; i < 28; i++) {
        const bit = document.createElement('i');
        bit.style.left = (Math.random() * 100) + '%';
        bit.style.animationDelay = (Math.random() * 0.6) + 's';
        bit.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
        bit.style.setProperty('--hue', String([45, 0, 160, 200, 30][i % 5]));
        confetti.appendChild(bit);
    }
    if (typeof playSound === 'function') { try { playSound('complete'); } catch (e) { /* no sound is fine */ } }
    clearTimeout(KR.celebrateTimer);
    const done = () => {
        clearTimeout(KR.celebrateTimer);
        box.classList.remove('show');
        box.onclick = null;
        const then = opts.then; opts.then = null;
        if (then) then();
    };
    box.onclick = done;
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    KR.celebrateTimer = setTimeout(done, opts.ms || KR_KEEPER_SHOW_MS);
};

/* =========================================
   KOOL RIFFS - THE STUDIO
   =========================================
   Rob's recording studio as the front door: two coaches standing at the
   front (Riff for pitch, Tango for rhythm). Tap one and the instruments
   they look after light up; tap a lit instrument and it hops onto the rug,
   with that area's games in a panel. Tap a game and it opens.

   Designed with Rob on the canvas, 2026-10-11; the approved prototype and
   the brief are in the private docs (studio-hub-brief.md). The room is a
   412 x 738 board scaled to fit the screen, so every position below is in
   board pixels (the room picture is 572 x 1024, K = 412 / 572).

   WORDS DO NOT GO IN THE CODE: every word is a lang/ id, every picture a
   content/art.js id, and who says what is in content/dialogue.js (the game
   says WHAT HAPPENED with KR.event).

   Nothing here gates a game. The dashboard shows every built game open, so
   the studio does too; an instrument is shut only because its area is not
   built yet (Key Signatures, Intervals). Ask Rob before adding a gate.

   The dashboard stays as it was and is one tap away (the gear). From the
   studio a game's "back to the dashboard" returns here instead.
   ========================================= */

const KR_STUDIO_IS_HOME = false;   // true: the studio is what opens first. Rob's call.
const KR_STUDIO_W = 412;
const KR_STUDIO_H = 738;
const KR_STUDIO_K = 412 / 572;
const KR_STUDIO_RUG = { x: 206, y: 508, maxW: 150, maxH: 112 };

/* ---------- The areas ----------
   who: the coach who looks after it. open: built. levels: what the panel
   shows, each a words id for its name and what tapping it does. */
const KR_STUDIO_AREAS = {
    piano:  { who: 'riff', open: true, levels: [
        { name: 'home.staff.title', go: () => launchGame('view-game1') },
        { name: 'home.note.title',  go: () => launchGame('view-game2') },
        { name: 'home.real.title',  go: () => launchGame('view-game3') },
    ] },
    drums:  { who: 'tango', open: true, levels: [
        { name: 'home.beat.title', go: () => enterBeatSmash() },
    ] },
    congas: { who: 'tango', open: true, levels: [
        { name: 'home.value.title',  go: () => enterValueSmash() },
        { name: 'home.rhythm.title', go: () => launchGame('view-rhythm') },
        { name: 'home.lab.title',    go: () => launchGame('view-rhythm-lab') },
    ] },
    bass:   { who: 'riff',  open: false, levels: [] },
    vibes:  { who: 'tango', open: false, levels: [] },
    ebass:  { who: 'riff',  open: false, levels: [] },
};

/* ---------- The furniture ----------
   l, t, w: left, top and width in ROOM pixels; nw x nh: the picture's own
   size, which gives the height. z: stacking, front instruments higher. */
const KR_STUDIO_ITEMS = [
    { id: 'gold1', art: 'studio.goldrecord', l: 91,  t: 238, w: 52,  nw: 113, nh: 132, z: 1 },
    { id: 'gold2', art: 'studio.goldrecord', l: 185, t: 238, w: 52,  nw: 113, nh: 132, z: 1 },
    { id: 'gold3', art: 'studio.goldrecord', l: 262, t: 238, w: 52,  nw: 113, nh: 132, z: 1 },
    { id: 'gold4', art: 'studio.goldrecord', l: 343, t: 238, w: 52,  nw: 113, nh: 132, z: 1 },
    { id: 'gold5', art: 'studio.goldrecord', l: 435, t: 238, w: 52,  nw: 113, nh: 132, z: 1 },
    { id: 'congas', art: 'studio.congas', l: 360, t: 490, w: 84,  nw: 143, nh: 176, z: 3 },
    { id: 'bass',   art: 'studio.bass',   l: 436, t: 372, w: 84,  nw: 106, nh: 267, z: 3 },
    { id: 'vibes',  art: 'studio.vibes',  l: 456, t: 548, w: 116, nw: 209, nh: 191, z: 3 },
    { id: 'ebass',  art: 'studio.ebass',  l: 442, t: 510, w: 52,  nw: 83,  nh: 244, z: 4 },
    { id: 'piano',  art: 'studio.piano',  l: 2,   t: 440, w: 150, nw: 186, nh: 255, z: 4 },
    { id: 'drums',  art: 'studio.drums',  l: 178, t: 500, w: 215, nw: 240, nh: 178, z: 5 },
];
const KR_STUDIO_SPEAKERS = [[52, 95, 68], [128, 105, 64], [382, 105, 64], [452, 92, 68]];
const KR_STUDIO_COACHES = {
    tango: { left: 8,   top: 506, w: 148, h: 230, bob: 'st-bob-t' },
    riff:  { left: 280, top: 565, w: 124, h: 165, bob: 'st-bob-r' },
};
const KR_STUDIO_GLOW = 'drop-shadow(0 0 10px rgba(255,214,120,.95)) brightness(1.08)'; // text-ok
const KR_STUDIO_DIM = 'brightness(.5) saturate(.55)';
const KR_STUDIO_SHAKE_MS = 600;
const KR_STUDIO_TOAST_MS = 1800;

let krStudio = null;   // { focus, sel, built, els, toastTimer }
KR.fromStudio = false; // true once the studio opened a game: "back" returns here

function krStudioMake(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
}

function krStudioArt(id) {
    return (KR.art && KR.art[id]) || '';
}

function krStudioHeight(item) {
    return item.w * item.nh / item.nw * KR_STUDIO_K;
}

function krStudioPlayerName() {
    try {
        if (typeof vsmashPlayers !== 'function') return '';
        const players = vsmashPlayers();
        const current = players.list.find(p => p.id === players.current);
        return current ? current.name : '';
    } catch (e) { return ''; }
}

/* ---------- Building the room, once ----------
   The elements are made once and only restyled afterwards, so the CSS
   transitions can carry an instrument onto the rug. */
function krStudioBuild() {
    const stage = document.getElementById('studio-stage');
    stage.innerHTML = '';
    const els = { items: {}, locks: {}, coaches: {} };

    const room = krStudioMake('img', 'st-room', stage);
    room.src = krStudioArt('studio.room');
    room.alt = '';

    krStudioMake('div', 'st-window', stage);
    krStudioMake('div', 'st-window-glass', stage);

    KR_STUDIO_SPEAKERS.forEach(d => {
        const wrap = krStudioMake('div', 'st-decor', stage);
        wrap.style.cssText = 'left:' + d[0] * KR_STUDIO_K + 'px;top:' + d[1] * KR_STUDIO_K + 'px;width:' + d[2] * KR_STUDIO_K + 'px;height:' + (d[2] * 151 / 113 * KR_STUDIO_K) + 'px';
        krStudioMake('img', null, wrap).src = krStudioArt('studio.speaker');
    });

    KR_STUDIO_ITEMS.forEach(item => {
        const area = KR_STUDIO_AREAS[item.id];
        const b = krStudioMake('button', 'st-item', stage);
        b.type = 'button';
        b.style.left = item.l * KR_STUDIO_K + 'px';
        b.style.top = item.t * KR_STUDIO_K + 'px';
        b.style.width = item.w * KR_STUDIO_K + 'px';
        b.style.height = krStudioHeight(item) + 'px';
        b.style.zIndex = item.z;
        const name = KR.t('studio.instrument.' + (area ? item.id : 'gold'));
        b.setAttribute('aria-label', area && !area.open ? KR.t('studio.locked', { name: name }) : name);
        const img = krStudioMake('img', null, b);
        img.src = krStudioArt(item.art);
        img.alt = '';
        b.onclick = () => krStudioPickItem(item);
        els.items[item.id] = b;
        if (area && !area.open) {
            const lock = krStudioMake('div', 'st-lock', stage);
            lock.style.left = (item.l * KR_STUDIO_K + item.w * KR_STUDIO_K / 2 - 15) + 'px';
            lock.style.top = (item.t * KR_STUDIO_K + krStudioHeight(item) / 2 - 15) + 'px';
            lock.hidden = true;
            lock.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="#d8cdf5"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#d8cdf5" stroke-width="1.8"/></svg>'; // text-ok
            els.locks[item.id] = lock;
        }
    });

    els.shade = krStudioMake('div', 'st-shade', stage);
    els.light = krStudioMake('div', 'st-light', stage);

    ['tango', 'riff'].forEach(who => {
        const c = KR_STUDIO_COACHES[who];
        const b = krStudioMake('button', 'st-coach', stage);
        b.type = 'button';
        b.style.cssText = 'left:' + c.left + 'px;top:' + c.top + 'px;width:' + c.w + 'px;height:' + c.h + 'px';
        b.setAttribute('aria-label', KR.t('studio.coach.' + who));
        const img = krStudioMake('img', null, b);
        img.src = krStudioArt('studio.' + who);
        img.alt = KR.t('studio.coach.' + who);
        b.onclick = () => krStudioPickCoach(who);
        els.coaches[who] = b;
    });

    els.mentor = krStudioMake('img', 'st-mentor', stage);
    els.mentor.hidden = true;

    // The two tools sit on Riff's piano: his metronome and his tuner.
    els.hots = krStudioMake('div', null, stage);
    els.hots.hidden = true;
    [['tuner', 12, 312], ['beat', 62, 300]].forEach(h => {
        const b = krStudioMake('button', 'st-hot', els.hots);
        b.type = 'button';
        b.style.left = h[1] + 'px';
        b.style.top = h[2] + 'px';
        b.setAttribute('aria-label', KR.t('studio.' + h[0] + '.label'));
        krStudioMake('span', 'st-pulse', b);
        b.onclick = () => krStudioTool(h[0]);
    });

    // The top strip: who is playing, help, and the way to the dashboard.
    els.top = krStudioMake('div', null, stage);
    els.hi = krStudioMake('div', 'st-hi', els.top);
    const help = krStudioMake('button', 'st-icon st-help', els.top); // text-ok
    help.type = 'button';
    help.textContent = '?';
    help.setAttribute('aria-label', KR.t('studio.help.label'));
    help.onclick = () => KR.event('studio.help');
    const gear = krStudioMake('button', 'st-icon st-gear', els.top); // text-ok
    gear.type = 'button';
    gear.setAttribute('aria-label', KR.t('studio.settings.label'));
    gear.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="#f6c94a" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" stroke="#f6c94a" stroke-width="2" stroke-linecap="round"/></svg>'; // text-ok
    gear.onclick = () => { KR.fromStudio = false; launchGame('view-dashboard'); };

    // The speech bubble: the gold guide box, so KR.say writes into it.
    els.bubble = krStudioMake('div', 'kr-guide st-bubble', stage); // text-ok
    els.bubble.setAttribute('aria-live', 'polite');
    els.portrait = krStudioMake('img', 'kr-guide-portrait st-portrait', els.bubble); // text-ok
    els.portrait.hidden = true;
    els.portrait.alt = '';
    krStudioMake('div', 'kr-guide-text', els.bubble);

    // The panel under an instrument on the rug: the area, its games, and
    // the coach's line (also a gold guide box).
    els.panel = krStudioMake('div', 'st-panel', stage);
    els.panel.hidden = true;
    const head = krStudioMake('div', 'st-panel-head', els.panel);
    const back = krStudioMake('button', 'st-btn', head);
    back.type = 'button';
    back.textContent = '‹ ' + KR.t('studio.back');
    back.setAttribute('aria-label', KR.t('studio.back.label'));
    back.onclick = () => { krStudio.sel = null; krStudioRender(); };
    els.area = krStudioMake('div', 'st-area', head);
    els.tiles = krStudioMake('div', 'st-tiles', els.panel);
    els.say = krStudioMake('div', 'kr-guide st-say', els.panel); // text-ok
    krStudioMake('div', 'kr-guide-text', els.say);

    els.toast = krStudioMake('div', 'st-toast', stage);
    els.toast.hidden = true;
    els.toast.setAttribute('role', 'status');

    krStudio.els = els;
    krStudio.built = true;
}

/* ---------- What the student does ---------- */
function krStudioToast(words) {
    const t = krStudio.els.toast;
    t.textContent = words;
    t.hidden = false;
    clearTimeout(krStudio.toastTimer);
    krStudio.toastTimer = setTimeout(() => { t.hidden = true; }, KR_STUDIO_TOAST_MS);
}

function krStudioPickCoach(who) {
    krStudio.focus = krStudio.focus === who ? null : who;
    krStudio.sel = null;
    krStudioRender();
    if (krStudio.focus) KR.event('studio.' + who + '.focus');
}

function krStudioPickItem(item) {
    const area = KR_STUDIO_AREAS[item.id];
    if (!area) { krStudioToast(KR.t('studio.records')); return; }
    if (krStudio.focus !== area.who) {
        krStudio.focus = area.who;
        krStudio.sel = null;
        krStudioRender();
        KR.event('studio.' + area.who + '.focus');
        return;
    }
    if (!area.open) {
        KR.event('studio.' + area.who + '.notyet');
        const b = krStudio.els.items[item.id];
        b.classList.remove('st-shake');
        void b.offsetWidth;
        b.classList.add('st-shake');
        setTimeout(() => b.classList.remove('st-shake'), KR_STUDIO_SHAKE_MS);
        return;
    }
    krStudio.sel = krStudio.sel === item.id ? null : item.id;
    krStudioRender();
    if (krStudio.sel) KR.event('studio.pick.' + item.id);
}

function krStudioTool(tool) {
    // Kool Beat and Kool Tuner live on the dashboard for now.
    KR.event('studio.' + tool);
}

/* ---------- Drawing the current state ---------- */
function krStudioRender() {
    const s = krStudio, els = s.els;
    const sel = s.sel, focus = s.focus;

    KR_STUDIO_ITEMS.forEach(item => {
        const area = KR_STUDIO_AREAS[item.id];
        const e = els.items[item.id];
        const w = item.w * KR_STUDIO_K, h = krStudioHeight(item);
        const l = item.l * KR_STUDIO_K, t = item.t * KR_STUDIO_K;
        let transform = 'none', z = item.z, filter = 'none';
        if (sel) {
            if (sel === item.id) {
                const scale = Math.min(KR_STUDIO_RUG.maxW / w, KR_STUDIO_RUG.maxH / h);
                transform = 'translate(' + (KR_STUDIO_RUG.x - (l + w / 2)) + 'px,' + (KR_STUDIO_RUG.y - (t + h / 2)) + 'px) scale(' + scale + ')';
                z = 20;
                filter = 'drop-shadow(0 0 14px rgba(255,214,120,.9))'; // text-ok
            } else if (area) {
                filter = 'brightness(.6) saturate(.6)';
            }
        } else if (focus && area) {
            filter = area.who === focus ? KR_STUDIO_GLOW : KR_STUDIO_DIM;
        }
        e.style.transform = transform;
        e.style.zIndex = z;
        e.style.filter = filter;
    });
    Object.keys(els.locks).forEach(id => {
        els.locks[id].hidden = !(focus && !sel && KR_STUDIO_AREAS[id].who === focus);
    });

    const hide = !!sel;
    ['tango', 'riff'].forEach(who => {
        const b = els.coaches[who], other = who === 'tango' ? 'riff' : 'tango';
        const mine = focus === who;
        b.style.opacity = hide ? 0 : 1;
        b.style.pointerEvents = hide ? 'none' : 'auto';
        b.style.transform = mine ? 'scale(1.07)' : 'none';
        b.style.filter = focus === other ? 'brightness(.7)' : (mine ? 'drop-shadow(0 0 12px rgba(255,214,120,.95))' : 'none'); // text-ok
        b.classList.toggle(KR_STUDIO_COACHES[who].bob, !mine);
    });

    els.shade.style.opacity = els.light.style.opacity = sel ? 1 : 0;

    const who = sel ? KR_STUDIO_AREAS[sel].who : null;
    els.mentor.hidden = !sel;
    if (who) {
        els.mentor.src = krStudioArt('studio.head.' + who);
        els.mentor.alt = KR.t('studio.on.carpet', { name: KR.t('studio.coach.' + who) });
    }
    els.hots.hidden = !(focus === 'riff' && !sel);
    els.top.hidden = false;
    els.bubble.hidden = !!sel;
    els.panel.hidden = !sel;
    if (!focus && !sel) {
        els.bubble.querySelector('.kr-guide-text').textContent = KR.t('studio.prompt');
        els.portrait.hidden = true;
    }

    if (sel) {
        const area = KR_STUDIO_AREAS[sel];
        els.area.textContent = KR.t('studio.area.' + sel);
        els.tiles.innerHTML = '';
        area.levels.forEach(level => {
            const b = krStudioMake('button', 'st-tile', els.tiles);
            b.type = 'button';
            b.textContent = KR.t(level.name);
            b.onclick = () => { KR.fromStudio = true; level.go(); };
        });
    }
}

/* ---------- Coming in and going out ---------- */
function krStudioFit() {
    const stage = document.getElementById('studio-stage');
    if (!stage) return;
    const wrap = stage.parentElement;
    const scale = Math.min(wrap.clientWidth / KR_STUDIO_W, wrap.clientHeight / KR_STUDIO_H);
    stage.style.transform = 'scale(' + (scale > 0 ? scale : 1) + ')';
}

function enterStudio() {
    KR.fromStudio = true;
    launchGame('view-studio');
}

function krStudioShow() {
    if (!krStudio) krStudio = { focus: null, sel: null, built: false, els: null, toastTimer: 0 };
    if (!krStudio.built) krStudioBuild();
    krStudio.focus = null;
    krStudio.sel = null;
    const name = krStudioPlayerName();
    krStudio.els.hi.textContent = name ? KR.t('studio.hi', { name: name }) : KR.t('studio.hi.guest');
    krStudioRender();
    krStudioFit();
}

// launchGame lives in script.js and knows nothing of the studio. Wrapping it
// here keeps that file as it was: the studio gets its own view, and a game
// opened from the studio returns here when it asks for the dashboard.
(function () {
    const original = launchGame;
    launchGame = function (targetViewId) {
        if (targetViewId === 'view-dashboard' && KR.fromStudio) targetViewId = 'view-studio';
        original(targetViewId);
        if (targetViewId === 'view-studio') krStudioShow();
    };
})();

window.addEventListener('resize', krStudioFit);
document.addEventListener('DOMContentLoaded', () => {
    if (KR_STUDIO_IS_HOME || location.hash === '#studio') enterStudio();
});

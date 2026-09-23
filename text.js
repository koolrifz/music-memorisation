/* =========================================
   KOOL RIFFS - TEXT, EVENTS AND SPEECH
   =========================================
   Every word the student sees or hears lives in lang/ by ID, never in the
   code. This file is the small helper that looks those words up.
   See docs/language-files-plan.md.

     KR.lang(code, table)        register a language table
     KR.t(id, vars)              the words for an id, {braces} filled from vars.
                                 A missing id comes back as "[id]", so the gap
                                 shows up in testing instead of a blank.
     KR.applyText(root)          fill every [data-text] element under root
     KR.noteName(valueId)        a note name, following the names setting
     KR.setNames(mode)           'both' | 'us' | 'uk', remembered on this device
     KR.on(eventName, fn)        listen for a game event
     KR.event(eventName, data)   announce a game event; a matching line in
                                 content/dialogue.js is shown and spoken
     KR.say(lineOrTextId, opts)  show a line in the guide box and speak it

   The game says WHAT HAPPENED (KR.event). The content files decide who, if
   anyone, says something about it. That is how Riff and Tango get written
   without the code changing.
   ========================================= */

const KR = window.KR || {};
window.KR = KR;

KR.tables = {};          // code -> { id: words }
KR.base = 'en-US';       // every id must exist here; checked by tools/check-text.py
KR.current = 'en-US';    // the language shown
KR.listeners = {};       // event name -> [fn, ...]

// Register a language table. A second call for the same code adds to it.
KR.lang = function (code, table) {
    KR.tables[code] = Object.assign(KR.tables[code] || {}, table);
};

// Look an id up in one language, falling back to the base language.
KR.lookup = function (id, code) {
    const own = KR.tables[code] || {};
    if (id in own) return own[id];
    const base = KR.tables[KR.base] || {};
    return (id in base) ? base[id] : null;
};

// The words for an id, with {name} placeholders filled from vars.
KR.t = function (id, vars) {
    const words = KR.lookup(id, KR.current);
    if (words === null) return '[' + id + ']';
    return KR.fill(words, vars);
};

KR.fill = function (words, vars) {
    if (!vars) return words;
    return words.replace(/\{(\w+)\}/g, (whole, name) => (name in vars) ? vars[name] : whole);
};

// Fill every element carrying data-text="some.id" under root.
KR.applyText = function (root) {
    (root || document).querySelectorAll('[data-text]').forEach(el => {
        el.textContent = KR.t(el.getAttribute('data-text'));
    });
};

/* ---------- Note names: US first, UK in brackets ----------
   valueId is a key of RSTOMP_VOCABULARY ('whole-note', 'half-rest', ...).
   Its words are the id 'note.' + valueId, in en-US and en-GB. */
KR.NAMES_KEY = 'koolRiffsNoteNames';
KR.names = 'both';
try {
    const saved = localStorage.getItem(KR.NAMES_KEY);
    if (saved === 'both' || saved === 'us' || saved === 'uk') KR.names = saved;
} catch (e) {}

KR.setNames = function (mode) {
    if (mode !== 'both' && mode !== 'us' && mode !== 'uk') return;
    KR.names = mode;
    try { localStorage.setItem(KR.NAMES_KEY, mode); } catch (e) {}
};

KR.noteName = function (valueId) {
    const id = 'note.' + valueId;
    const us = KR.lookup(id, 'en-US');
    const uk = KR.lookup(id, 'en-GB');
    if (us === null) return '[' + id + ']';
    if (KR.names === 'us') return us;
    if (KR.names === 'uk') return uk;
    if (uk === us) return us;
    return KR.fill(KR.t('note.both'), { us: us, uk: uk });
};

/* ---------- Events ---------- */
KR.on = function (eventName, fn) {
    (KR.listeners[eventName] = KR.listeners[eventName] || []).push(fn);
};

KR.event = function (eventName, data) {
    (KR.listeners[eventName] || []).forEach(fn => {
        try { fn(data); } catch (e) { console.error('KR.event listener failed:', eventName, e); }
    });
    const lines = (KR.dialogue && KR.dialogue.lines) || [];
    const line = lines.find(l => l.on === eventName);
    if (line) KR.say(line.text, { speaker: line.speaker, pose: line.pose, vars: data });
};

/* ---------- The guide box and speech ----------
   The guide box is the gold box that speaks to the student for the whole
   game (CLAUDE.md "The guide box is GOLD"). In the HTML it is:

     <div class="kr-guide">
       <img class="kr-guide-portrait" hidden alt="">
       <div class="kr-guide-text"></div>
     </div>

   KR.say writes into the guide box that is on screen, or into opts.box.
   The portrait stays hidden until content/art.js has a picture for the
   speaker. It sits BESIDE the box, never over the notation. */
KR.visibleGuide = function () {
    const boxes = document.querySelectorAll('.kr-guide');
    for (const box of boxes) if (box.offsetParent !== null) return box;
    return null;
};

KR.say = function (id, opts) {
    opts = opts || {};
    const words = KR.t(id, opts.vars);
    const box = opts.box || KR.visibleGuide();
    if (box) {
        const text = box.querySelector('.kr-guide-text') || box;
        text.textContent = words;
        const portrait = box.querySelector('.kr-guide-portrait');
        if (portrait) {
            const art = KR.art || {};
            const picture = art[opts.pose] || art[opts.speaker];
            if (picture) { portrait.src = picture; portrait.hidden = false; }
            else portrait.hidden = true;
        }
    }
    if (opts.silent) return;
    KR.speak(id, words, opts.speaker);
};

// A recorded file for this id if there is one, otherwise the browser's voice
// with the speaker's pitch and rate. Never throws: some devices have no voices.
KR.speak = function (id, words, speaker) {
    try {
        const file = KR.audio && KR.audio[id];
        if (file) {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            new Audio(file).play().catch(() => {});
            return;
        }
        if (!('speechSynthesis' in window)) return;
        const voices = (KR.dialogue && KR.dialogue.voices) || {};
        const voice = voices[speaker] || voices.narrator || {};
        const utterance = new SpeechSynthesisUtterance(words);
        if (voice.pitch) utterance.pitch = voice.pitch;
        if (voice.rate) utterance.rate = voice.rate;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch (e) {}
};

document.addEventListener('DOMContentLoaded', () => KR.applyText(document));

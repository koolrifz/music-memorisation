/* =========================================
   KOOL RIFFS - THE PADS
   =========================================
   One pad engine for every game that is played in time: Beat Smash now,
   Rhythm Stomp Lab's performance round later (Beat Smash brief §18). It knows
   nothing about rhythm or scoring. It builds the pads, and reports each press
   and each release as a time on the AUDIO clock, with the device's delay
   already taken off - so the game compares it straight with the time the
   note was scheduled.

     const pads = KRPads.create({
         container,           // the element the pads are built into
         count: 4,            // 4 beat pads, or 1 big pad
         now: () => seconds,  // the audio clock (AudioContext.currentTime)
         delay: () => seconds,// the device's measured delay, taken off every time
         label: i => text,    // optional: what pad i shows
         onPress(press),      // press = { pad, time, raw, touch }
         onRelease(press),    // the same object, with .up and .rawUp set
     });
     pads.setCount(1);  pads.glow(i, 'beat');  pads.flash(i, 'hit');  pads.destroy();

   PRESS, HOLD, RELEASE. A phone can't sense how hard a pad is hit, so every
   press is the same; what a pad CAN tell is when it went down and when it
   came up. That is the whole instrument: a half note is a press that is held.

   Keyboard: 1 2 3 4 are the four beat pads; Space is the big pad. Key-down is
   the press and key-up the release; key repeat is ignored, so holding a key
   is one long note, not a drum roll.

   NO WORDS IN THIS FILE: a pad's label comes from the game, by ID.
   ========================================= */
const KRPads = (function () {
    const KEYS_FOUR = ['1', '2', '3', '4'];
    const KEY_ONE = ' ';

    function create(options) {
        const o = Object.assign({ count: 4, now: () => 0, delay: () => 0 }, options);
        let pads = [];
        const held = {};          // pointerId or key -> the press it started
        let enabled = true;

        function time() {
            const raw = o.now();
            return { raw, time: raw - (o.delay() || 0) };
        }

        function press(index, holder, touch) {
            if (!enabled || index < 0 || index >= pads.length || held[holder]) return;
            const t = time();
            const p = { pad: index, time: t.time, raw: t.raw, touch: !!touch, up: null, rawUp: null };
            held[holder] = p;
            pads[index].classList.add('down');
            flash(index, 'burst');
            if (o.onPress) o.onPress(p);
        }

        function release(holder) {
            const p = held[holder];
            if (!p) return;
            delete held[holder];
            const t = time();
            p.up = t.time;
            p.rawUp = t.raw;
            const stillDown = Object.keys(held).some(k => held[k].pad === p.pad);
            if (!stillDown && pads[p.pad]) pads[p.pad].classList.remove('down');
            if (o.onRelease) o.onRelease(p);
        }

        function build() {
            o.container.innerHTML = '';
            o.container.classList.toggle('krpads-one', o.count === 1);
            o.container.classList.toggle('krpads-four', o.count !== 1);
            pads = [];
            for (let i = 0; i < o.count; i++) {
                const pad = document.createElement('button');
                pad.type = 'button';
                pad.className = 'krpad';
                pad.setAttribute('data-pad', i);
                if (o.label) {
                    const label = document.createElement('span');
                    label.className = 'krpad-label';
                    label.textContent = o.label(i, o.count);
                    pad.appendChild(label);
                }
                pad.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    try { pad.setPointerCapture(e.pointerId); } catch (err) {}
                    press(i, 'p' + e.pointerId, e.pointerType === 'touch');
                });
                const up = e => release('p' + e.pointerId);
                pad.addEventListener('pointerup', up);
                pad.addEventListener('pointercancel', up);
                pad.addEventListener('lostpointercapture', up);
                pad.addEventListener('contextmenu', e => e.preventDefault());
                o.container.appendChild(pad);
                pads.push(pad);
            }
        }

        function padForKey(key) {
            if (o.count === 1) return key === KEY_ONE ? 0 : -1;
            return KEYS_FOUR.indexOf(key);
        }

        function typing(e) {
            const tag = e.target && e.target.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA';
        }

        function onKeyDown(e) {
            if (typing(e) || !o.container.isConnected || o.container.offsetParent === null) return;
            const index = padForKey(e.key);
            if (index < 0) return;
            e.preventDefault();
            if (e.repeat) return;
            press(index, 'k' + e.key, false);
        }

        function onKeyUp(e) {
            if (padForKey(e.key) < 0) return;
            release('k' + e.key);
        }

        // A light on one pad for a moment: 'burst' on a press, 'hit' for a
        // press that landed, 'beat' for the pulse, 'demo' for Tango's own hits.
        function flash(index, kind, ms) {
            const pad = pads[index];
            if (!pad) return;
            pad.classList.remove(kind);
            void pad.offsetWidth;           // restart the animation
            pad.classList.add(kind);
            clearTimeout(pad['_t' + kind]);
            pad['_t' + kind] = setTimeout(() => pad.classList.remove(kind), ms || 220);
        }

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        build();

        return {
            get count() { return o.count; },
            get elements() { return pads.slice(); },
            setCount(n) { if (n === o.count) return; o.count = n; releaseAll(); build(); },
            setEnabled(on) { enabled = !!on; if (!on) releaseAll(); },
            flash,
            glow(index, kind, ms) { flash(index, kind || 'beat', ms || 180); },
            isDown() { return Object.keys(held).length > 0; },
            destroy() {
                releaseAll();
                window.removeEventListener('keydown', onKeyDown);
                window.removeEventListener('keyup', onKeyUp);
                o.container.innerHTML = '';
            },
        };

        function releaseAll() { Object.keys(held).forEach(release); }
    }

    return { create };
})();

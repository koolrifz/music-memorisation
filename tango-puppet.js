/* =========================================
   KOOL RIFFS - TANGO THE PUPPET
   =========================================
   Rob, 2026-10-26: "We've managed to produce 70+ images of Tango poses. How
   do we proceed to animate her?" ... "Perfect. Let's go."

   Every Gemini frame was an edit of one clean base picture, so the kit is in
   exactly the same place in all of them. Each part that changed (one arm, the
   hi-hat foot, the face) was cut out on its own and is laid over one body
   (content/art.js, 'tango.puppet.*'). So each part moves by itself: the left
   arm plays the crash on every quaver, the right arm the hi-hat on 1 and 3
   and the snare on 2 and 4 (with a wind-up before it), the foot closes the
   hi-hat on 2 and 4, and her face blinks, talks or reacts over the top.

   She plays from the beat AS HEARD, given by the caller every frame (the
   song's beat map), so she follows the recording's drift. With no beat she
   sits with her sticks halfway: where she talks from.

   KRPuppet.make(parent) -> null if the pictures are missing, else:
     .beat(b)          the beat position heard (fractional), or null
     .react(kind, ms)  laugh, oops, cheer, point, wink, focus, listen, tilt, tom
     .mood(face)       a face to hold (listen, focus), or null
   ========================================= */
var KRPuppet = (function () {
    const ID = 'tango.puppet';
    const FACES = ['neutral', 'blink', 'ah', 'oo', 'tilt', 'laugh', 'oops', 'wink', 'focus', 'listen'];
    // kind -> the face it shows, and the arms that replace both of hers.
    const REACT = {
        laugh:  { face: 'laugh' },
        oops:   { face: 'oops' },
        cheer:  { face: 'laugh', arms: 'cheer' },
        point:  { face: 'wink', arms: 'point' },
        wink:   { face: 'wink' },
        focus:  { face: 'focus' },
        listen: { face: 'listen' },
        tilt:   { face: 'tilt' },
        tom:    { face: 'focus', left: 'L-tom' },
    };
    const REACT_MS = 1600;
    const BLINK_MS = 130;

    function ready() {
        const place = KR.artPlaces && KR.artPlaces[ID];
        if (!place || !place.layers || !KR.art) return null;
        return Object.keys(place.layers).every(k => KR.art[ID + '.' + k]) ? place : null;
    }

    // The groove for one quaver position: which arm and foot pictures show.
    // pos counts quavers from the song's first beat; p is how far through
    // the quaver we are, so the hit shows for the first part of it.
    function groove(pos) {
        const step = Math.floor(pos), p = pos - step, s = ((step % 8) + 8) % 8;
        const L = p < 0.38 ? 'L-crash' : 'L-mid';
        let R = 'R-mid';
        if ((s === 2 || s === 6) && p < 0.4) R = 'R-snare';
        else if ((s === 0 || s === 4) && p < 0.4) R = 'R-hat';
        else if ((s === 1 || s === 5) && p > 0.45) R = 'R-up';
        const foot = (s === 2 || s === 6) && p < 0.6 ? 'foot-down' : 'foot-up';
        return { L, R, foot };
    }

    function make(parent) {
        const place = ready();
        if (!place || !parent) return null;
        const el = document.createElement('div');
        el.className = 'kr-puppet';
        const imgs = {};
        Object.keys(place.layers).forEach(k => {
            const at = place.layers[k];
            const img = document.createElement('img');
            img.alt = '';
            img.src = KR.art[ID + '.' + k];
            img.style.left = (at.x * 100) + '%';
            img.style.top = (at.y * 100) + '%';
            img.style.width = (at.w * 100) + '%';
            if (k !== 'body') img.hidden = true;
            el.appendChild(img);
            imgs[k] = img;
        });
        // The body first, then the faces, then the limbs: the order the
        // layers are listed in, which is the order they stack.
        parent.insertBefore(el, parent.firstChild);

        let beat = null, react = null, reactUntil = 0, held = null;
        let nextBlink = 0, blinkUntil = 0, mouth = 'neutral', mouthAt = 0;
        let shown = {}, raf = 0;

        function set(want) {
            Object.keys(imgs).forEach(k => {
                if (k === 'body') return;
                const on = !!want[k];
                if (shown[k] !== on) { imgs[k].hidden = !on; shown[k] = on; }
            });
        }

        function frame(now) {
            raf = 0;
            if (!el.isConnected) return;
            if (el.offsetParent !== null) {
                const g = beat != null && beat >= 0 ? groove(beat * 2) : { L: 'L-mid', R: 'R-mid', foot: 'foot-up' };
                if (!nextBlink) nextBlink = now + 1500 + Math.random() * 2500;
                if (now > nextBlink) { blinkUntil = now + BLINK_MS; nextBlink = now + 2200 + Math.random() * 3000; }
                const talking = KR.speaking && KR.speaking() && KR.lastSpeaker === 'tango';
                let face = held || 'neutral';
                if (talking) {
                    if (now > mouthAt) { mouth = ['ah', 'oo', 'neutral', 'ah'][Math.floor(Math.random() * 4)]; mouthAt = now + 90 + Math.random() * 90; }
                    face = mouth;
                } else if (now < blinkUntil && !held) face = 'blink';
                let arms = null;
                if (react && now < reactUntil) {
                    face = react.face;
                    arms = react.arms || null;
                    if (react.left) g.L = react.left;
                } else react = null;
                const want = { ['head.' + face]: true, ['limb.' + g.foot]: true };
                if (arms) want['limb.' + arms] = true;
                else { want['limb.' + g.L] = true; want['limb.' + g.R] = true; }
                set(want);
            }
            raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);

        return {
            el,
            beat(b) { beat = b; if (!raf) raf = requestAnimationFrame(frame); },
            react(kind, ms) {
                const r = REACT[kind];
                if (!r) return;
                react = r;
                reactUntil = performance.now() + (ms || REACT_MS);
                if (!raf) raf = requestAnimationFrame(frame);
            },
            mood(face) { held = FACES.indexOf(face) >= 0 ? face : null; },
            state() {
                return Object.keys(shown).filter(k => shown[k]);
            },
        };
    }

    return { make, ready, groove, REACT };
})();
if (typeof module !== 'undefined') module.exports = KRPuppet;

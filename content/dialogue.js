/* =========================================
   KOOL RIFFS - WHO SAYS WHAT, AND WHEN
   =========================================
   The games announce events (see docs/value-smash-build-guide.md §3.8).
   A line here attached to an event is shown in the gold guide box and
   spoken. An event with no line does nothing. An event with several lines
   says them in turn, one each time it happens.

   A line looks like:
     { on: 'value.license.awarded', speaker: 'tango',
       text: 'tango.license.1', pose: 'tango.cheer' },
   'text' is an ID in lang/en-US.js. 'pose' is an ID in content/art.js.

   voices: the placeholder synthesised voice for each speaker, used until a
   recorded file for the line is listed in content/audio.js.
     Riff  - hip and gruff:          lower and a little slower.
     Tango - high, tight, squeaky:   higher and quicker.
   ========================================= */
KR.dialogue = {
    voices: {
        riff:     { pitch: 0.7, rate: 0.95 },
        tango:    { pitch: 1.6, rate: 1.1 },
        narrator: {},
    },
    lines: [
        /* ---------- Beat Smash (beat-smash.js) ----------
           Tango coaches the drums. Where an event has several lines they
           take turns. */
        { on: 'beat.jam.start',        speaker: 'tango', text: 'beat.line.copy' },
        { on: 'beat.jam.again',        speaker: 'tango', text: 'beat.line.watch' },
        { on: 'beat.jam.morph',        speaker: 'tango', text: 'beat.line.morph' },
        { on: 'beat.delay.bluetooth',  speaker: 'tango', text: 'beat.line.bluetooth' },
        { on: 'beat.take.clean',       speaker: 'tango', text: 'beat.line.clean.1' },
        { on: 'beat.take.clean',       speaker: 'tango', text: 'beat.line.clean.2' },
        { on: 'beat.take.again',       speaker: 'tango', text: 'beat.line.again' },
        { on: 'beat.big.again',        speaker: 'tango', text: 'beat.line.bigAgain' },
        { on: 'beat.reveal',           speaker: 'tango', text: 'beat.line.reveal' },
        { on: 'beat.retake.clean',     speaker: 'tango', text: 'beat.line.retakeClean' },
        { on: 'beat.step.cleared.1',   speaker: 'tango', text: 'beat.line.step.1' },
        { on: 'beat.step.cleared.2',   speaker: 'tango', text: 'beat.line.step.2' },
        { on: 'beat.big.ready',        speaker: 'tango', text: 'beat.line.bigReady' },
        { on: 'beat.take.findOne',     speaker: 'tango', text: 'beat.line.findOne' },
        { on: 'beat.take.comeback',    speaker: 'tango', text: 'beat.line.comeback' },
        { on: 'beat.part.won.drums',   speaker: 'tango', text: 'beat.won.drums.1' },
        { on: 'beat.picker.open',      speaker: 'tango', text: 'beat.picker.1' },
        { on: 'beat.picker.open',      speaker: 'tango', text: 'beat.picker.2' },
        { on: 'beat.picker.open',      speaker: 'tango', text: 'beat.picker.3' },
        { on: 'beat.picker.heard.spicy',  speaker: 'tango', text: 'beat.heard.spicy.1' },
        { on: 'beat.picker.heard.smooth', speaker: 'tango', text: 'beat.heard.smooth.1' },
        { on: 'beat.picker.heard.hop',    speaker: 'tango', text: 'beat.heard.hop.1' },
        { on: 'beat.part.locked.drums', speaker: 'tango', text: 'beat.locked.drums.1' },
        { on: 'beat.playback',         speaker: 'tango', text: 'beat.line.playback' },
    ],
};

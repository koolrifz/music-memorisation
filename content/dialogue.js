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
        { on: 'beat.jam.green',        speaker: 'tango', text: 'beat.line.green' },
        { on: 'beat.jam.rushing',      speaker: 'tango', text: 'beat.line.rushing.1' },
        { on: 'beat.jam.rushing',      speaker: 'tango', text: 'beat.line.rushing.2' },
        { on: 'beat.jam.dragging',     speaker: 'tango', text: 'beat.line.dragging.1' },
        { on: 'beat.jam.dragging',     speaker: 'tango', text: 'beat.line.dragging.2' },
        { on: 'beat.jam.locked',       speaker: 'tango', text: 'beat.line.locked.1' },
        { on: 'beat.jam.locked',       speaker: 'tango', text: 'beat.line.locked.2' },
        { on: 'beat.jam.locked',       speaker: 'tango', text: 'beat.line.locked.3' },
        { on: 'beat.jam.follow',       speaker: 'tango', text: 'beat.line.follow' },
        { on: 'beat.jam.restored',     speaker: 'tango', text: 'beat.line.restored.1' },
        { on: 'beat.jam.restored',     speaker: 'tango', text: 'beat.line.restored.2' },
        { on: 'beat.jam.struggled',    speaker: 'tango', text: 'beat.line.struggled' },
        { on: 'beat.jam.story',        speaker: 'tango', text: 'beat.line.story' },
        { on: 'beat.songs.open',       speaker: 'tango', text: 'beat.line.songs.open' },
        { on: 'beat.songs.ours',       speaker: 'tango', text: 'beat.line.songs.ours' },
        { on: 'beat.songs.added',      speaker: 'tango', text: 'beat.line.songs.added' },
        { on: 'beat.jam.layer.drums',  speaker: 'tango', text: 'beat.line.layer.drums' },
        { on: 'beat.jam.layer.bass',   speaker: 'tango', text: 'beat.line.layer.bass' },
        { on: 'beat.jam.lost.drums',   speaker: 'tango', text: 'beat.line.lost.drums' },
        { on: 'beat.jam.lost.bass',    speaker: 'tango', text: 'beat.line.lost.bass' },
        { on: 'beat.jam.lost.keys',    speaker: 'tango', text: 'beat.line.lost.keys' },
        { on: 'beat.jam.groove',       speaker: 'tango', text: 'beat.line.groove' },
        { on: 'beat.jam.layer.keys',   speaker: 'tango', text: 'beat.line.layer.keys' },
        { on: 'beat.jam.full',         speaker: 'tango', text: 'beat.line.full' },
        { on: 'beat.jam.variation',    speaker: 'tango', text: 'beat.line.turn.1' },
        { on: 'beat.jam.variation',    speaker: 'tango', text: 'beat.line.turn.2' },
        { on: 'beat.jam.variation',    speaker: 'tango', text: 'beat.line.turn.3' },
        { on: 'beat.jam.drop',         speaker: 'tango', text: 'beat.line.drop' },
        { on: 'beat.jam.stopped',      speaker: 'tango', text: 'beat.line.stopped' },
        { on: 'beat.jam.morph',        speaker: 'tango', text: 'beat.line.morph' },
        { on: 'beat.delay.bluetooth',  speaker: 'tango', text: 'beat.line.bluetooth' },
        { on: 'beat.take.clean',       speaker: 'tango', text: 'beat.line.clean.1' },
        { on: 'beat.take.clean',       speaker: 'tango', text: 'beat.line.clean.2' },
        // A take that wasn't clean: one line per reason (playtest 1, §4.1).
        { on: 'beat.take.why.short',   speaker: 'tango', text: 'beat.line.why.short' },
        { on: 'beat.take.why.early',   speaker: 'tango', text: 'beat.line.why.early' },
        { on: 'beat.take.why.late',    speaker: 'tango', text: 'beat.line.why.late' },
        { on: 'beat.take.why.missed',  speaker: 'tango', text: 'beat.line.why.missed' },
        { on: 'beat.take.why.rest',    speaker: 'tango', text: 'beat.line.why.rest' },
        { on: 'beat.take.why.extra',   speaker: 'tango', text: 'beat.line.why.extra' },
        { on: 'beat.take.why.wrongPad', speaker: 'tango', text: 'beat.line.why.wrongPad' },
        { on: 'beat.reveal',           speaker: 'tango', text: 'beat.line.reveal' },
        { on: 'beat.retake.clean',     speaker: 'tango', text: 'beat.line.retakeClean' },
        { on: 'beat.musician.intro.drums', speaker: 'tango', text: 'beat.line.intro.drums' },
        { on: 'beat.step.cleared.1',   speaker: 'tango', text: 'beat.line.step.1' },
        { on: 'beat.step.cleared.2',   speaker: 'tango', text: 'beat.line.step.2' },
        { on: 'beat.step.cleared.3',   speaker: 'tango', text: 'beat.line.step.3' },
        { on: 'beat.step.cleared.4',   speaker: 'tango', text: 'beat.line.step.4' },
        { on: 'beat.take.findOne',     speaker: 'tango', text: 'beat.line.findOne' },
        { on: 'beat.take.wrongPad',    speaker: 'tango', text: 'beat.line.wrongPad.1' },
        { on: 'beat.take.wrongPad',    speaker: 'tango', text: 'beat.line.wrongPad.2' },
        { on: 'beat.take.wrongPad.riff', speaker: 'riff', text: 'beat.riff.wrongPad' },
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
        { on: 'beat.playback.first',   speaker: 'tango', text: 'beat.line.playback.first' },

        /* Riff coaches his own steps (beat-smash.js bsmashEvent): an event
           with '.riff' on the end is his version of Tango's. */
        { on: 'beat.musician.intro.bass',   speaker: 'riff', text: 'beat.riff.intro.bass' },
        { on: 'beat.part.won.bass',         speaker: 'riff', text: 'beat.won.bass.1' },
        { on: 'beat.part.locked.bass',      speaker: 'riff', text: 'beat.locked.bass.1' },
        { on: 'beat.picker.open.riff',      speaker: 'riff', text: 'beat.riff.picker.1' },
        { on: 'beat.picker.open.riff',      speaker: 'riff', text: 'beat.riff.picker.2' },
        { on: 'beat.picker.heard.spicy.riff',  speaker: 'riff', text: 'beat.riff.heard.spicy' },
        { on: 'beat.picker.heard.smooth.riff', speaker: 'riff', text: 'beat.riff.heard.smooth' },
        { on: 'beat.picker.heard.hop.riff',    speaker: 'riff', text: 'beat.riff.heard.hop' },
        { on: 'beat.take.clean.riff',       speaker: 'riff', text: 'beat.riff.clean.1' },
        { on: 'beat.take.clean.riff',       speaker: 'riff', text: 'beat.riff.clean.2' },
        { on: 'beat.take.why.short.riff',   speaker: 'riff', text: 'beat.riff.why.short' },
        { on: 'beat.take.why.early.riff',   speaker: 'riff', text: 'beat.riff.why.early' },
        { on: 'beat.take.why.late.riff',    speaker: 'riff', text: 'beat.riff.why.late' },
        { on: 'beat.take.why.missed.riff',  speaker: 'riff', text: 'beat.riff.why.missed' },
        { on: 'beat.take.why.rest.riff',    speaker: 'riff', text: 'beat.riff.why.rest' },
        { on: 'beat.take.why.extra.riff',   speaker: 'riff', text: 'beat.riff.why.extra' },
        { on: 'beat.take.why.wrongPad.riff', speaker: 'riff', text: 'beat.riff.why.wrongPad' },
        { on: 'beat.reveal.riff',           speaker: 'riff', text: 'beat.riff.reveal' },
        { on: 'beat.retake.clean.riff',     speaker: 'riff', text: 'beat.riff.retakeClean' },
        { on: 'beat.step.cleared.1.riff',   speaker: 'riff', text: 'beat.riff.step.1' },
        { on: 'beat.step.cleared.2.riff',   speaker: 'riff', text: 'beat.riff.step.2' },
        { on: 'beat.step.cleared.3.riff',   speaker: 'riff', text: 'beat.riff.step.3' },
        { on: 'beat.step.cleared.4.riff',   speaker: 'riff', text: 'beat.riff.step.4' },
        { on: 'beat.take.findOne.riff',     speaker: 'riff', text: 'beat.riff.findOne' },
        { on: 'beat.take.comeback.riff',    speaker: 'riff', text: 'beat.riff.comeback' },
        { on: 'beat.playback.riff',         speaker: 'riff', text: 'beat.riff.playback' },
        { on: 'beat.musician.intro.keys',   speaker: 'riff', text: 'beat.riff.intro.keys' },
        { on: 'beat.part.won.keys',         speaker: 'riff', text: 'beat.won.keys.1' },
        { on: 'beat.part.locked.keys',      speaker: 'riff', text: 'beat.locked.keys.1' },

        /* The Learner's Permit, when the band is complete: Tango. */
        // The studio: Tango runs the control room, whoever's part it is.
        { on: 'beat.studio.ready',          speaker: 'tango', text: 'beat.studio.ready' },
        { on: 'beat.studio.passed',         speaker: 'tango', text: 'beat.studio.passed' },
        { on: 'beat.studio.retake',         speaker: 'tango', text: 'beat.studio.retake' },
        { on: 'beat.eighths.intro.drums',   speaker: 'tango', text: 'beat.line.eighths.intro.drums' },
        { on: 'beat.eighths.intro.bass',    speaker: 'riff',  text: 'beat.line.eighths.intro.bass' },
        { on: 'beat.eighths.intro.keys',    speaker: 'riff',  text: 'beat.line.eighths.intro.keys' },
        { on: 'beat.quavers.intro.drums',   speaker: 'tango', text: 'beat.line.quavers.intro.drums' },
        { on: 'beat.quavers.intro.bass',    speaker: 'riff',  text: 'beat.line.quavers.intro.bass' },
        { on: 'beat.quavers.intro.keys',    speaker: 'riff',  text: 'beat.line.quavers.intro.keys' },
        { on: 'beat.share.ready',           speaker: 'tango', text: 'beat.line.share.ready' },
        { on: 'beat.share.saved',           speaker: 'tango', text: 'beat.line.share.saved' },
        { on: 'beat.share.failed',          speaker: 'tango', text: 'beat.line.share.failed' },
        { on: 'beat.studio.again',          speaker: 'tango', text: 'beat.studio.again' },
        { on: 'beat.studio.stopped',        speaker: 'tango', text: 'beat.studio.stopped' },
        { on: 'beat.studio.paused',         speaker: 'tango', text: 'beat.studio.paused' },
        { on: 'beat.studio.listen',         speaker: 'tango', text: 'beat.studio.listen' },
        { on: 'beat.permit.awarded',        speaker: 'tango', text: 'beat.permit.awarded' },
    ],
};

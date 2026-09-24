/* =========================================
   KOOL RIFFS - WHO SAYS WHAT, AND WHEN
   =========================================
   The games announce events (see docs/value-smash-build-guide.md §3.8).
   A line here attached to an event is shown in the gold guide box and
   spoken. An event with no line does nothing.

   A line looks like:
     { on: 'value.license.awarded', speaker: 'tango',
       text: 'tango.license.1', pose: 'tango.cheer' },
   'text' is an ID in a file in lang/. 'pose' is an ID in content/art.js.

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
    lines: [],
};

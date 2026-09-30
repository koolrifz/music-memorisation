# Beat Smash loops — PLACEHOLDERS

These ten files stand in for **Garnet's recordings** until they arrive. They are
built to the loop spec in the Beat Smash design brief (§8.1, private docs repo):

- one song: C major, four bars of **I – IV – I – V**, looping seamlessly;
- **100 bpm**, straight eighths, exactly four bars (9.6 s) each;
- three instruments x three styles, any drum loop + any bass loop + any keys
  loop playing together (all 27 combinations peak at or below −1 dBFS).

| File | Part |
|---|---|
| `beat-l1-drums-spicy.wav` | Tango, Latin: bossa kick, son clave, shaker, congas |
| `beat-l1-drums-smooth.wav` | Tango, jazz played straight: ride, cross-stick, soft kick |
| `beat-l1-drums-hop.wav` | Tango, dance: four on the floor, claps, open hats |
| `beat-l1-bass-spicy.wav` | Riff, upright bass: root and fifth, bossa push |
| `beat-l1-bass-smooth.wav` | Riff, electric bass: chord tones, chromatic approach |
| `beat-l1-bass-hop.wav` | Riff, synth bass: off-beat pump |
| `beat-l1-keys-spicy.wav` | Riff, bright Rhodes: montuno-style stabs |
| `beat-l1-keys-smooth.wav` | Riff, suitcase Rhodes: extended chords |
| `beat-l1-keys-hop.wav` | Riff, dance plucks over a pumping pad |
| `beat-l1-warmup.wav` | Tango warming up, for the first minute |

Mono, 16-bit, 32 kHz. **Synthesised, not recorded**: made by
`beat-smash-band.js` (in the app root, because the game plays its pad
sounds live), rendered by
`NODE_PATH=$(npm root -g) node tools/beat-smash-band/render.js`, and playable
live in `tools/beat-smash-band/lab.html`. The student's pad sounds (kick,
snare, electric and acoustic bass, suitcase Rhodes, organ) are in `beat-smash-band.js` as
live voices, so a held note sustains until release.

**Replacing them:** when Garnet's files arrive, give them these same names and
delete this README. Nothing else needs to change.

# The studio: the front door (idea, built on `idea/studio-hub`)

Rob, 2026-10-11, after weeks of brainstorming the studio with Claude: a cartoon recording studio as the home screen. Riff (pitch) and Tango (rhythm) stand at the front. Tap one and the instruments they look after light up; tap a lit instrument and it hops onto the rug, with that area's games in a panel; tap a game and it opens. Tap an instrument that isn't built yet and the coach says "Not yet".

## What it teaches / why
It turns the dashboard's list into the metaphor the whole app is heading for (see `ideas/gold-records.md`): the instruments are the silos, the gold records on the wall are the scores, and the two coaches are the guides.

## What is built
`studio.js`, `view-studio` in `index.html`, a block at the end of `style.css`, pictures in `art/studio/` (listed in `content/art.js`), words in `lang/` (`studio.*`), lines in `content/dialogue.js`, `tools/test-studio.py`. The dashboard has a button into it and stays the fallback; the gear in the studio goes to the dashboard; a game's "back to the dashboard" returns to the studio when it was opened from there.

## Not decided (Rob's)
- Which instrument holds which games. Now: piano = Staff/Note/Real Smash; drums = Beat Smash; congas = Value Smash, Rhythm Stomp, Stomp Lab; double bass (Key Signatures), vibraphone (Intervals) and electric bass shut because nothing is built.
- Whether the studio becomes the first screen (`KR_STUDIO_IS_HOME`, or open `index.html#studio`).
- Who says "Not yet" (Rob gave Riff's line; Tango's is a placeholder).
- Any gate between games. None is built: every built game is open, as on the dashboard.
- Kool Beat and Kool Tuner on Riff's piano (the two pulsing dots): they only talk for now.
- The in-game HUD and the coach in a circle of control-room glass while playing.
- Pictures still to make: a standing Riff, higher-resolution instruments, hands and mane for animation, expressions.

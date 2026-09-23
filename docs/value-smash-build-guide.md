# Value Smash: build guide, Phase 0 and Phase 1

**Who this is for:** whoever is building. That might be a Claude Code session,
GitHub Copilot in VS Code, or a human developer. It is written so that any of
them can work from it **without access to the private docs repo.**

**Where the full design lives:** `kool-riffs-docs/docs/value-smash-design-brief.md`
(private). This guide is the part of that brief needed to build the first
playable version, plus the technical decisions that go with it. If the two
disagree, **the brief wins**: stop and ask Rob.

**Before writing any code, read:**

1. `CLAUDE.md`, especially these sections: "WORDS DO NOT GO IN THE CODE",
   "SILOS AND BRIDGES", "Riff and Tango", "ADDICTIVE BY DESIGN", "Core
   mechanics", "Persistence pattern", "Pathway screen pattern", and "VexFlow does
   not draw dots".
2. `docs/language-files-plan.md` (the whole thing, which is short).
3. This guide.

---

## 0. The rules you must not break

These come from `CLAUDE.md`, and every one of them has been learned the hard
way:

1. **No on-screen words in the code.** Every word the student sees or hears
   comes from `lang/en-US.js` by ID, through `KR.t('some.id')`. The HTML
   carries `data-text="some.id"`, never the words. If you are about to type a
   sentence inside a `.js` or `.html` file, stop and put it in the language
   file instead.
2. **Don't break the working games.** Staff Smash, Note Smash, Real Smash, the
   old Rhythm game and Rhythm Stomp Lab must behave exactly as before. In this
   phase, the only change to existing code is the three small edits listed in
   §3.5 and §2.3. Don't "tidy up" `script.js` or `rhythm-stomp-lab.js`.
3. **No build step, no frameworks, no npm.** Plain HTML, CSS and JavaScript,
   loaded with `<script>` tags, as the rest of the app is. VexFlow 3.0.9 is
   already loaded from a CDN.
4. **Real notation only**, drawn with VexFlow as SVG, stems up. Dotted notes
   need `note.addDotToAll()`. Beam pairs of eighth notes by hand. Never use
   `VF.Beam.generateBeams`. (Phase 1 has no eighth notes, but keep this in
   mind.)
5. **Nothing decorative ever sits on top of the notation.** Effects, portraits
   and badges go beside the music or behind it, never over it.
6. **Only correct taps score.** Wrong taps cost time, never points. Totals shown
   on screen are whole numbers.
7. **Rule of three**: three correct in a row passes a tier.
8. **Phone first.** Test at 390 px wide in portrait. Buttons at least 56 px tall.

---

## 1. What Phase 0 and Phase 1 deliver

| | Delivers |
|---|---|
| **Phase 0** | The language-file foundation (`text.js`, `lang/`, `content/`) and a checker. **Nothing visible changes.** |
| **Phase 1** | Value Smash, Part V1 ("The Big Three": whole, half and quarter notes and their rests), with three floors: **Tree, Smash, Sprint**. Also a player picker, the Artistic License gate into Stomp Lab, stars, personal bests, combos and gold cards. |

**Not in this phase:** Merge, Bar Drop, parts V2–V6, the Maestro Bonus, Daily
Smash, streaks, the Note Deck, and Riff and Tango's art and dialogue. **But the
places for them are built now** (§2.3).

---

## 2. Phase 0: the foundation

Follow `docs/language-files-plan.md` §2. Concretely:

### 2.1 Files

```
text.js               the helper, described below
lang/en-US.js         KR.lang('en-US', { ...every word... })
lang/en-GB.js         KR.lang('en-GB', { ...only UK differences, e.g. note names... })
content/dialogue.js   KR.dialogue = { voices: {...}, lines: [] }
content/art.js        KR.art = { }          // pose id -> image path; empty for now
content/audio.js      KR.audio = { }        // line or sound id -> file path; empty for now
tools/check-text.py   the checker
```

In `index.html`, load them **before** `script.js`, in this order: `text.js`,
`lang/en-US.js`, `lang/en-GB.js`, then the `content/` files.

### 2.2 `text.js`: the whole API

Keep it small, commented and readable. Rob reads this code.

```js
KR.lang(code, table)        // register a language table
KR.t(id, vars)              // look up an id, fill {braces} from vars.
                            //   Missing id -> returns "[id]" so the gap is visible.
KR.applyText(root)          // fill every [data-text] element under root
KR.noteName(valueId)        // note names follow the names setting:
                            //   'both' -> "whole note (semibreve)"  (default)
                            //   'us'   -> "whole note"
                            //   'uk'   -> "semibreve"
KR.setNames(mode)           // 'both' | 'us' | 'uk', saved in localStorage
KR.on(eventName, fn)        // listen for a game event
KR.event(eventName, data)   // announce a game event. Also looks in
                            //   KR.dialogue.lines for a matching `on` and, if
                            //   found, shows it in the guide box (2.3).
KR.say(lineOrTextId, opts)  // show a line in the guide box and speak it
```

**Speech:**

- If `KR.audio[id]` exists, `KR.say` plays that audio file.
- Otherwise it uses `speechSynthesis`, with the speaker's profile from
  `KR.dialogue.voices`:
  - `riff`: pitch 0.7, rate 0.95;
  - `tango`: pitch 1.6, rate 1.1;
  - `narrator`: the default.
- Speech must never throw an error if the browser has no voices.

### 2.3 The three places for later work (build these now)

1. **The guide box.** Make one reusable guide box: a gold box with the same
   look as `.rstomp-prompt` in `style.css`, plus a **portrait slot to its
   left**. The slot stays hidden until `KR.art` has a picture for the speaker.
   `KR.say()` writes into it. Value Smash uses it for every instruction.
   **Don't** change Stomp Lab's own prompt box in this phase.
2. **Events.** Value Smash calls `KR.event()` at every moment a character might
   one day react to. The list is in §3.8. `content/dialogue.js` stays empty,
   so for now nothing extra happens.
3. **One place for progress.** All Value Smash progress is read and written
   through two functions, `vsmashLoad()` and `vsmashSave()`, and nowhere else
   (§3.2).

### 2.4 `tools/check-text.py`

It checks three things, and exits non-zero if any fail:

1. every `KR.t('…')`, `data-text="…"` and `KR.say('…')` ID used in
   `value-smash.js`, `text.js` and `index.html` exists in `lang/en-US.js`;
2. every ID in `lang/en-GB.js` also exists in `en-US.js`;
3. `value-smash.js` contains no quoted English sentences, found with a simple
   check: a string literal of two or more words with a space between letters.
   Allow an explicit `// text-ok` comment on the same line for rare
   exceptions, such as CSS class names.

**Done when:** the app loads exactly as before, with no console errors;
`KR.t('missing.thing')` returns `[missing.thing]`; and the checker passes.

---

## 3. Phase 1: Value Smash V1

### 3.1 Files and screens

- A new file, `value-smash.js`, loaded **after** `rhythm-audio.js` and
  `rhythm-stomp-lab.js` (it reuses their sound functions).
- A new view, `view-value`, following the pattern of `view-rhythm-lab` in
  `index.html`. It needs:
  - a pathway screen;
  - a game screen;
  - a results screen.
- A new card on the dashboard, placed **before** the Rhythm Stomp Lab card,
  with its title and blurb taken from the language file.

### 3.2 Players and progress

- **Player picker.** The first time a student opens Value Smash, they are asked
  for a name, typed in a box, with no password. After that, a small "Playing
  as: Sam ▾" control on the pathway screen lets them switch player or add a new
  one.
  - Stored in `localStorage` under the key `koolRiffsPlayers`, as
    `{ list: [{id, name}], current: id }`.
  - In this phase **only Value Smash** uses players. Don't change the other
    games.
- **Progress** is stored under the key `koolRiffsValueProgress`, as
  `{ players: { [playerId]: {...} } }`. Each player holds:

  ```js
  { floors: { [floorId]: { cleared, stars, bestScore, bestTime, plays } },
    unlocked: [floorId, ...], lastFloor, license: false, namesSetting: 'both' }
  ```

- Wrap every `localStorage` read and write in `try/catch`. On school
  Chromebooks storage can be wiped or blocked.

### 3.3 Floors are data

Define the floors as a data array at the top of `value-smash.js`. **Floor IDs
are permanent**, because a future app-wide Level (a "bridge") will list them.

```js
const VSMASH_FLOORS = [
  { id: 'v1-tree',   part: 'v1', kind: 'tree',   unlock: null },
  { id: 'v1-smash',  part: 'v1', kind: 'smash',  unlock: 'v1-tree' },
  { id: 'v1-sprint', part: 'v1', kind: 'sprint', unlock: 'v1-smash', awards: 'license' },
];
```

Display names come from the language file, as `value.floor.v1-tree.name` and so
on. The pathway screen follows the pathway pattern in `CLAUDE.md`:

- a **locked** floor shows only an icon;
- an **unlocked** floor shows an icon and its name;
- a **cleared** floor shows an icon, its name and its stars;
- **Start** appears only once a floor has been selected.

### 3.4 The beat key and note values

- Every question that mentions beats shows a small chip, **"C · ♩ = 1 beat"**,
  taken from the language file. Part V1 is always common time: a whole note is
  4 beats, a half note 2, a quarter note 1, and each rest the same as its note.
- Note values use the same codes as `RSTOMP_VOCABULARY` in
  `rhythm-stomp-lab.js`: `w`, `h`, `q` (plus `isRest`). **Don't copy
  `RSTOMP_VOCABULARY`: read it.**
- **Drawing notes on cards and tiles.** Write one small function,
  `vsmashDrawNotes(el, specs)`. It draws a short run of notes and rests with
  VexFlow:
  - SVG;
  - a one-line staff with no clef and no time signature;
  - stems up;
  - `Voice` in `SOFT` mode, because a card is not a full bar.

  **Cache each distinct drawing** as an SVG string and reuse it, so the grid
  doesn't call VexFlow for every card on every screen.

### 3.5 Floor v1-tree: The Tree (scaffolding, no clock)

**What it teaches:** how the values relate, without any beat counting.

**The screen:**

- A column of **3 rows, all the same width**, because each row lasts the same
  time: a whole-note row, a half-note row and a quarter-note row.
- Under the rows is a **tray** of tiles: whole, half and quarter (and the three
  rests, in round 3).
- **Each tile's width is proportional to its value.** A whole note is the full
  row, a half note is half of it, and a quarter note is a quarter of it.

**Play:**

- The student taps a tray tile. It goes into the **highest row that still has
  room**.
  - If the tile is the value that row holds, it drops in.
  - If it isn't, it is **refused**: a clunk sound, the tile shakes, and the
    guide box says why. For example, `value.tree.refuse` could read *"That row
    is {note}s. A {note} is half a {parent}."*, with the names coming from
    `KR.noteName`.
- When a row is full, it **plays back**: one `raudioTapSnare()` per note,
  0.5 s per beat. Then fire the event `value.tree.row`.
- **The three rounds:**
  1. The whole note is given; build down.
  2. A randomly chosen row is given (the halves or the quarters); build up and
     down.
  3. The rest tree (whole rest, half rests, quarter rests).
- **Passing:**
  - Complete all three rounds.
  - A round counts only if it was finished with **at most 1 refused tile**.
    Otherwise it is replayed with a new random start. *(This is a default for
    Rob to tune.)*
  - Fire `value.tree.cleared`.

**After it is cleared, the tree is the help menu.** Add a **Tree** button to
every Value Smash screen. It opens the student's own tree as a reference card,
showing only the rows they have built. Later, V5/V6 will add beat labels here.

### 3.6 Floor v1-smash: Smash

This copies the Note Smash mechanic. Read these functions in `script.js` before
writing:

- `loadG2Grid()`;
- `handleG2Click()`;
- `resolveG2Screen()`;
- `triggerG2TimeBonus()`;
- the watchlist functions.

Match their behaviour; don't import from them.

**Tiers, density, duds and the clock:**

- **Tiers:** 3 → 6 → 9 → 12 cards.
- **Targets per screen:** the same bands as Note Smash (1–2, 2–4, 2–3, 3–4).
- **Duds:** about 15% of screens have no correct cards. **Never two duds in a
  row.** A correctly handled dud counts as a joker.
- **Rule of three per tier:** three cleared screens in a row moves up a tier.
  Clearing tier 4 clears the floor.
- **The clock:** **no clock on tier 1.** It starts at tier 2, at 60 seconds.
  Clearing a screen gives a time bonus of `(cards / 3) + 2` seconds. A wrong
  tap costs time, not points.

**The duration bar:** a bar under each card, as long as the card lasts.

| Tier | Duration bar |
|---|---|
| 1 | shown in full |
| 2 | faint |
| 3–4 | gone |

**Targets:**

| Tier | Target type | Target | Cards contain |
|---|---|---|---|
| 1–2 | "Smash everything worth **N beats**" | N = 1, 2 or 4 | tier 1: single notes and rests; tier 2: also groups of 2–3 notes and rests |
| 3–4 | "Smash everything that **equals a** half note / whole note" | a card's total must equal it | groups of 1–4 notes and rests |

Groups must still be real notation, so no group may be longer than 4 beats.
The target is spoken **only when it changes** (Note Smash re-announces it every
time, which is a known bug not to copy).

**Feel:**

- A correct card plays `raudioTapSnare()` and shatters.
- **Combo:** each correct tap in a row raises the snare pitch one step and adds
  one to a multiplier for that screen. A wrong tap resets it.
- **Gold card:** about 1 screen in 12 has one target card drawn in gold, worth
  triple points.
- **Watchlist:** a value the student misses appears more often for the next few
  screens.

**Events to fire:**

- `value.smash.correct`
- `value.smash.wrong`
- `value.smash.tierUp`
- `value.floor.cleared`

### 3.7 Floor v1-sprint: Sprint and the Artistic License

- 60 seconds, starting at tier 2 density. **Every** kind of question from the
  Smash floor is mixed in, with no duration bars. Time bonuses work as in Smash.
- **Medals** go by the highest tier reached, as in Real Smash: tier 2 is
  Bronze, tier 3 Silver, tier 4 Gold. Record a personal best.
- **Stars (every floor):**
  - 1 star: cleared;
  - 2 stars: cleared within a target time (default 120 s for Smash, 60 s for
    the Tree);
  - 3 stars: cleared with no wrong taps.
- **Bronze or better awards the Artistic License**, once only:
  - set `license: true`;
  - show a full-screen ceremony card (words from the language file; Tango's
    portrait slot stays empty for now);
  - fire `value.license.awarded`.

**The Stomp Lab gate.** This is the only change to `rhythm-stomp-lab.js`. At
the top of `enterRhythmLab()`:

- If the current Value Smash player **has no license**, **and** Stomp Lab
  progress shows the student has never played (`totalPlays` is 0 and
  `unlockedStages` is just `['1']`):
  - show the Value Smash guide box message `value.license.needed`, with a
    button that opens Value Smash;
  - return, without entering Stomp Lab.
- **Anyone who has already played Stomp Lab is never blocked.** Never remove
  anything from `unlockedStages`.

### 3.8 Events Value Smash fires (the list the characters will use)

| Event | When it fires |
|---|---|
| `value.open` | Value Smash opens |
| `value.floor.start` | a floor starts |
| `value.floor.cleared` | a floor is cleared |
| `value.tree.row` | a tree row is completed |
| `value.tree.refuse` | a tree tile is refused |
| `value.tree.cleared` | the tree is cleared |
| `value.smash.correct` | a correct card is smashed |
| `value.smash.wrong` | a wrong card is tapped |
| `value.smash.dud` | a dud screen is handled correctly |
| `value.smash.tierUp` | the student moves up a tier |
| `value.smash.gold` | a gold card is smashed |
| `value.sprint.medal` | a Sprint ends with a medal (data: `{ medal }`) |
| `value.license.awarded` | the Artistic License is awarded |

### 3.9 Wording

Write placeholder text for every ID in `lang/en-US.js`, with IDs grouped and
commented by screen. **Rob will rewrite all of it**, so keep it short and
plain. Put note names in `en-GB.js` too:

- semibreve
- minim
- crotchet
- semibreve rest
- minim rest
- crotchet rest

---

## 4. How to work: one step at a time

Do these in order. **Commit after each step that works**, with a clear
message. Stop after each step so Rob can look.

1. Phase 0 (§2)
2. The Value Smash view, the pathway and the player picker (§3.1–3.3), with
   empty floors
3. The Tree (§3.5)
4. Smash (§3.6)
5. The Sprint, stars, medals, the license and the Stomp Lab gate (§3.7)
6. Polish on a phone: layout at 390 px, sounds, and the checker passing

**Before each commit:** the app still loads with no console errors, all five
existing games still open and play, and `python3 tools/check-text.py` passes.

---

## 5. Defaults Rob will tune (don't agonise over them)

| Setting | Default |
|---|---|
| Dud rate | 15% |
| Gold-card rate | 1 in 12 |
| Sprint length | 60 s |
| Star target times | 120 s for Smash, 60 s for the Tree |
| Refusals allowed per Tree round | 1 |
| Placeholder voice pitch and rate | Riff: pitch 0.7, rate 0.95. Tango: pitch 1.6, rate 1.1. |
| Snare timing in Tree playback | 0.5 s per beat |

Put these as named constants at the top of `value-smash.js`, so they are easy
to find.

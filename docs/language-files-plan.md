# Plan: take the words out of the code

**Status:** plan approved in principle by Rob on 2026-09-23. Step 0 and Value Smash are on `main`. **Step 1 (Rhythm Stomp Lab) is done**, together with the change below. The other games are not migrated yet.

**Changed 2026-09-24: one file per game, edited from a phone.** Rob works on
this mostly from his phone, away from a computer, so `lang/` is now one short
file per game (`common.js`, `value-smash.js`, `stomp-lab.js`, …, and
`uk-english.js` for the UK differences) rather than one `en-US.js`. Every line
is written ID-then-words, with the words in backticks so an apostrophe can't
break it. Every push to `main` runs `tools/check-text.py` (now including a
check that each file actually loads) and the site is published only if it
passes: `.github/workflows/check-and-publish.yml`. Rob's guide is
`lang/README.md`. Section 2's single-file layout below is superseded by this.

Rob:

> *"I was disappointed to learn that Staff Smash, Note Smash and Real Smash are
> all pretty much hard-coded. That can't continue… The HTML with as little
> hard-coded text in it — mostly labels that we have a language file for… I want
> a whole list, everything catalogued, so I know every voice prompt. We give it
> an ID. I want to be able to hook into the music backing as well."*

He was also clear about what this is **not**:

> *"No, I don't want a content management system. I'm just saying I need to get
> some language files so they're not hard-coded into the HTML."*

So this plan does not involve a database, a server, an editor or a build step.
It moves words, sounds and pictures out of the code and into plain files that
Rob can read and edit, with every item having an ID.

---

## 1. Where things stand (measured 2026-09-23)

| Where | Hard-coded |
|---|---|
| `index.html` | about **286** pieces of visible text: titles, buttons, descriptions, modal copy, emoji |
| `script.js` (Staff, Note and Real Smash) | **111** places that write text straight onto the screen, plus 8 spoken lines |
| `rhythm.js` | 15 places that write text onto the screen |
| `rhythm-stomp-lab.js` | 23 places that write text onto the screen, **plus `RSTOMP_PROMPTS`**: a named table of prompts that levels can override |
| Stage lists | `g1PathwayStages`, `g2PathwayStages`, `g3PathwayStages`, `RHYTHM_LEVELS` and `RSTOMP_LEVELS` mix level data with display names |

`RSTOMP_PROMPTS` is the one place that is already done the right way: each
prompt has a name, and a level can reword any line without anyone touching the
code. **This plan applies that pattern to the whole app.**

---

## 2. The shape

```
lang/            one file per game (see the status note at the top)
  common.js       note names, shared buttons, the dashboard
  value-smash.js  stomp-lab.js  ...  every word of one game, by ID
  uk-english.js   only the lines that differ (note names), by the same IDs
content/
  dialogue.js     Riff & Tango lines: which event, who says it, which text ID
  audio.js        every sound and backing track, by ID
  art.js          every picture and character pose, by ID
text.js           the small helper that looks things up (about 60 lines)
tools/
  check-text.py   finds missing IDs, unused IDs, and text still hard-coded
  build-text-catalogue.py   writes docs/text-catalogue.md: Rob's full list
```

### 2.1 Why `.js` files and not `.json`

The app has no build step. A `.json` file has to be loaded with `fetch()`, and
`fetch()` fails when `index.html` is opened straight from a folder on a
computer. A `.js` file loads with a plain `<script>` tag, which works
everywhere, including offline. The contents are still plain data, one entry per
line:

```js
KR.lang('en-US', {
  'home.staffSmash.title':    'Staff Smash',
  'home.staffSmash.blurb':    'Build instant staff orientation, one position at a time.',
  'value.tree.refuse':        'That row is {note}s. A {note} is half a {parent}.',
  'note.whole':               'whole note',
  'note.half':                'half note',
});
```

`en-GB.js` only lists what is different:

```js
KR.lang('en-GB', {
  'note.whole': 'semibreve',
  'note.half':  'minim',
});
```

### 2.2 The US/UK switch falls out of this for free

Rob's rule is to use American names first, with the UK name in brackets, and to
offer a switch. The note names are just two language files, and a setting picks
between them:

| Setting | Shows |
|---|---|
| **Both** (default for beginners) | whole note (semibreve) |
| US | whole note |
| UK | semibreve |

The same mechanism would carry a whole other language later, if one is ever
wanted.

### 2.3 How the code asks for words

- **HTML** carries an ID and no words:
  `<button data-text="home.staffSmash.title"></button>`. On load,
  `KR.applyText(document)` fills in every tagged element.
- **JS** asks for words by ID:
  `el.textContent = KR.t('g2.target', { note })`.
- **Speech** takes the same IDs: `speak(KR.t('g2.target.spoken', { note }))`.
  If a recorded voice file is listed for that ID in `audio.js`, it plays
  instead of the synthesised voice.
- **A missing ID shows the ID itself**, for example `[g2.target]`, instead of
  a blank. A missing line is then visible in testing, rather than being a
  silent gap on a student's phone.

### 2.4 Riff and Tango, and the music, hook in through events

The game code announces **what happened**. It does not decide what anyone says
or which music plays:

```js
KR.event('value.license.awarded');
```

`dialogue.js` decides what, if anything, happens then:

```js
{ on: 'value.license.awarded', speaker: 'tango', text: 'tango.license.1', pose: 'tango.cheer' },
```

**Where the lines appear: the gold guide box.** A dialogue line is shown in the
gold box, with the speaker's portrait (`art.js`) **beside** the box, never over
the notation. A line is spoken by:

- the recorded file for its ID, if `audio.js` lists one;
- otherwise the browser's speech, using the speaker's voice profile from
  `content/dialogue.js`: a lower pitch and slower rate for Riff (hip and gruff),
  a higher pitch and quicker rate for Tango (high, tight and squeaky).

The browser voices vary from device to device, so this fallback is only a
placeholder. The catalogue lists every line that still has no recorded file.

`audio.js` does the same for backing tracks and stingers. Rob can then write
the whole Riff and Tango narrative, change the music, or add a "go and play it
on your instrument" line, **without any code changing**. An event with nothing
attached does nothing.

### 2.5 Rob's catalogue

`tools/build-text-catalogue.py` writes `docs/text-catalogue.md`. It is one
table listing every ID with:

- its US text and its UK text;
- whether it is spoken;
- who says it;
- which file it is used in.

This is the "whole list, everything catalogued" Rob asked for. It is generated,
never edited by hand, so it cannot go stale.

---

## 3. The order: never break a working game

Each step is its own branch. Each one is played on Rob's phone before it merges.

| Step | What | Risk |
|---|---|---|
| **0** | `text.js`, empty `lang/` and `content/` files, `check-text.py`. Nothing visible changes. | none |
| **1** | **Rhythm Stomp Lab.** Move `RSTOMP_PROMPTS` and its level overrides into `en-US.js`. It is already named, so this proves the system on the part that needs the least change. | low |
| **2** | **The dashboard and home screen.** | low |
| **3** | **Staff Smash** | medium |
| **4** | **Note Smash.** Fix CLAUDE.md open item 4 (announcing the target on every redraw) in the same change, because the same lines are being touched. | medium |
| **5** | **Real Smash.** Fix CLAUDE.md open item 3 (the dead setup screen) in the same change. | medium |
| **6** | **Stage lists → `content/levels.js`.** Stage names and descriptions become IDs; the level data moves out of the game logic. | medium |
| **7** | **Riff and Tango and the music**, once Rob sends the material: fill `dialogue.js`, `art.js` and `audio.js`. | none: content only |

**Value Smash is written language-first from its first line.** It needs only
step 0, not the migration of the older games, so it never adds to the debt.

Before each merge, `check-text.py` must report:

- **no hard-coded text** in the files that step converted;
- **every ID used exists** in `en-US.js`;
- **`en-GB.js` contains no ID that `en-US.js` lacks.**

---

## 4. What this plan deliberately does not do

- **It does not restructure the game logic.** Rob also asked for things to be
  "more object-oriented". The duplicated grid code in Staff Smash and Note Smash
  (`g1*` and `g2*`) should one day become one shared Smash-grid module. That is
  a larger rewrite of working games, so it is a separate project, to start once
  the words are out. Doing both in one change would make any breakage
  impossible to trace.
- **It does not add a server, database or CMS.** Rob ruled this out. The files
  are the source.
- **It does not change how anything plays.** A converted game should be
  indistinguishable from before, word for word.

---

## 5. Also true once this lands

- There is no automated test suite in this repo yet. `check-text.py` would be
  the first check a change must pass, and it is where the Value Smash notation
  sweeps (brief §13) would live too.
- Every new on-screen line, anywhere in the app, is added as an ID. The
  `CLAUDE.md` rule in "Every on-screen prompt has a NAME" now applies app-wide,
  not only to Stomp Lab.

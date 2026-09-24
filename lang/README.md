# The words in Kool Riffs

Every word the games show or say lives in this folder, one file per game.
Change the words here and the game changes with them. No code needed.

| File | What's in it |
|---|---|
| `common.js` | Note names and anything shared by every game |
| `value-smash.js` | Value Smash |
| `uk-english.js` | Only what's different in the UK (minim, crotchet…) |

The other games are being moved in one at a time. Until a game has its own
file here, its words are still inside the code.

## Editing on your phone

1. Open this folder on github.com in your phone's browser. Bookmark it.
2. Tap a file, then tap the **pencil** (or the **⋯** menu, then **Edit file**).
3. Change the words. Tap **Commit changes…**, then **Commit changes** again.
4. The site updates in about a minute.

## What a line looks like

```js
    'value.smash.dud':
        `Nothing to smash. Well spotted! That earns a joker.`,
```

- **Change only what's between the backticks** `` ` ` ``.
- **Apostrophes and quote marks are fine** inside them: `Don't stop, "go" again!`
- **Never type a backtick** inside the words. It ends the sentence early.
- **Leave the ID alone** (the line in `'quotes'` above the words). It is how
  the game finds the sentence.
- **Keep the comma** at the end of the line.
- **`{braces}` are filled in by the game.** `{n}` is a number, `{note}` is a
  note name, `{name}` is the player's name. Move them anywhere in the sentence,
  or leave them out. A brace the game doesn't know stays on screen as typed.
- Lines between `/*` and `*/` are notes, not words in the game.

## If a save breaks something

Every save is checked before it goes live. If the check fails:

- **Students don't see it.** The site stays on the last good version.
- **GitHub emails you.** Open the email, then the failed "Check and publish"
  run. It names the file and line, like
  `lang/value-smash.js:185  SyntaxError: Unexpected string`.
  The mistake is on that line or the one just above: usually a missing comma
  or a backtick.
- Fix it the same way, with the pencil. The next save is checked again.

If you'd rather not hunt for it, tell Claude: *"The check failed on
value-smash.js, can you fix it?"*

## UK English

`uk-english.js` holds only the words that are different in the UK, using the
same IDs. Anything not listed there uses the US words. To change a line for UK
players only, copy its ID and words into `uk-english.js` and change them there.

## Spoken lines

Instructions in the gold box are read aloud, so changing the words changes
what is spoken. Riff and Tango's lines, and which game moment each belongs to,
go in `content/dialogue.js`; the words themselves still live here.

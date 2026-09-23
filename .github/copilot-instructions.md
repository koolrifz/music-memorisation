# Copilot instructions: Kool Riffs

GitHub Copilot reads this file automatically for chat in this repository.

**Kool Riffs** is a browser music-reading app built by Rob, a music teacher who
is not a developer. There is no build step. It is plain HTML, CSS and
JavaScript, and VexFlow 3.0.9 comes from a CDN.

## Always

- **`CLAUDE.md` is the source of truth** for this project. Read the sections
  relevant to your task before changing code. If a request conflicts with it,
  say so and ask. Don't guess.
- **When building Value Smash, follow `docs/value-smash-build-guide.md`,** one
  step at a time, and stop after each step.
- **No on-screen words in code.** Every word the student sees or hears comes
  from `lang/en-US.js` by ID (`KR.t('id')`, or `data-text="id"` in HTML). See
  `docs/language-files-plan.md`.
- **Don't change working games unless asked.** Staff Smash, Note Smash and Real
  Smash live in `script.js`; the old Rhythm game is `rhythm.js`; Rhythm Stomp
  Lab is `rhythm-stomp-lab.js` and `rhythm-audio.js`. Never "tidy up" or
  reformat these files.
- **Keep code simple, commented and readable**: Rob reads it. No frameworks, no
  npm, no bundlers, no TypeScript.
- **Notation must be real and correct.** Use VexFlow, as SVG, with stems up.
  Call `addDotToAll()` for dotted notes. Beam by hand; never use
  `VF.Beam.generateBeams`. Nothing decorative may ever be drawn over the
  notation.
- **Scoring:** only correct taps score. Wrong taps cost time, never points.
  Three correct in a row passes a tier.
- **Phone first.** It must work at 390 px wide in portrait, with tap targets at
  least 56 px tall.
- **Wrap `localStorage` in `try/catch`.**
- **Before saying a step is done:**
  - the page loads with no console errors;
  - the existing games still open;
  - `python3 tools/check-text.py` passes, once that script exists.
- **Small, reviewable changes.** Show what you changed and why.

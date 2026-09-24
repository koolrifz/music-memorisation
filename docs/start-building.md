# Start building Value Smash

This page is for Rob. It covers two ways to build: in **Claude Code** (a new
session) or in **VS Code with GitHub Copilot**. Both follow the same spec:
[`value-smash-build-guide.md`](value-smash-build-guide.md). You can switch
between them at any step, because every step ends with a commit.

---

## One thing first: where the new documents live

Everything written on 2026-09-23 is on the branch
`claude/equivalency-meter-design-defe20`, not on `main` yet. That includes:

- the updated `CLAUDE.md`;
- the build guide;
- the language-files plan;
- the Copilot instructions.

You can either:

- **Merge that branch into `main` first** (recommended). Then every tool and
  every new session sees the new documents automatically. Only documents
  changed, so the live site doesn't change. Or:
- **Start the build branch from it** (the steps below do this). It works, but
  `main` stays out of date until you merge.

---

## Option A: a new Claude Code session

Start a new session on the `koolrifz/music-memorisation` repository, and paste
this:

> We're starting the build of Value Smash, the note-value silo. The design is
> finished and approved. Don't redesign anything; build it.
>
> 1. Create a branch called `idea/value-smash` from
>    `claude/equivalency-meter-design-defe20` (that branch has the up-to-date
>    `CLAUDE.md` and docs), and do all the work there.
> 2. Read `CLAUDE.md` first, then `docs/language-files-plan.md`, then
>    `docs/value-smash-build-guide.md`. The build guide is the spec. The full
>    design brief is in the private repo `koolrifz/kool-riffs-docs` at
>    `docs/value-smash-design-brief.md`, if you need the reasoning behind
>    something.
> 3. Work through the build guide's §4 steps **in order, one at a time**. After
>    each step: check that the page loads with no console errors, that all
>    existing games still open, and that `tools/check-text.py` passes. Then
>    commit, push, and stop and tell me what to try on my phone before you go
>    on.
> 4. Start with step 1 (Phase 0) now.

---

## Option B: VS Code with GitHub Copilot

### B1. Set up (once)

1. **Install VS Code** from code.visualstudio.com. Sign in with your GitHub
   account (the account icon at the bottom left). Copilot needs a Copilot plan
   on that account.
2. **Install extensions** (the Extensions icon on the left):
   - **GitHub Copilot**, which brings Copilot Chat with it;
   - **Live Server** (by Ritwick Dey), to run the app on your computer and
     phone.
3. **Get the code.** Press `Ctrl+Shift+P` (on a Mac, `Cmd+Shift+P`), type
   **Git: Clone**, and choose `koolrifz/music-memorisation`. Pick a folder, then
   click **Open**.
4. **Make the build branch.** Click the branch name at the bottom left of the
   window, then:
   - choose **Create new branch from…**;
   - pick `origin/claude/equivalency-meter-design-defe20`;
   - name the new branch **`idea/value-smash`**.

   Or, in the terminal (**Terminal → New Terminal**):

   ```
   git fetch origin
   git checkout -b idea/value-smash origin/claude/equivalency-meter-design-defe20
   ```

5. **Open Copilot Chat:**
   - Windows: `Ctrl+Alt+I`
   - Mac: `Ctrl+Cmd+I`
   - or click the chat icon at the top.

   At the bottom of the chat box, set:
   - **Mode: Agent**, so it can create and edit files itself;
   - **Model:** the most capable one in the list. A Claude model is a good
     choice if it's offered, because this repo's notes were written for Claude.

Copilot reads `.github/copilot-instructions.md` automatically. That file tells
it the house rules and points it at `CLAUDE.md` and the build guide.

### B2. Build one step at a time: paste these prompts

Paste **one prompt, let it finish, then test and commit** (B3) before pasting
the next one. Short steps are much more reliable with Copilot than one huge
request.

**Step 1: the foundation**

> Read `CLAUDE.md` (the sections named at the top of the build guide),
> `docs/language-files-plan.md` and `docs/value-smash-build-guide.md`.
> Then do **step 1 only**, Phase 0, from §2 of the build guide: create
> `text.js`, `lang/en-US.js`, `lang/en-GB.js`, the three `content/` files and
> `tools/check-text.py`, and add the script tags to `index.html` in the order
> given. Nothing visible should change. Don't touch `script.js`,
> `rhythm.js`, `rhythm-stomp-lab.js` or `rhythm-audio.js`. When you've finished,
> list the files you made and how to check it works.

**Step 2: Value Smash's screens, players and pathway**

> Do **step 2** of `docs/value-smash-build-guide.md`, §3.1 to §3.3: a new
> `value-smash.js`, the `view-value` view, the dashboard card before Rhythm Stomp
> Lab, the player picker, progress saved only through `vsmashLoad()`/`vsmashSave()`,
> and the `VSMASH_FLOORS` data with a pathway screen. The floors can be empty
> for now. Every word comes from `lang/en-US.js`. Follow the pathway pattern in
> `CLAUDE.md`. Stop when it's done and tell me what to check.

**Step 3: The Tree**

> Do **step 3** of the build guide: floor `v1-tree`, exactly as described in
> §3.5, including the Tree button that reopens the finished tree as a help
> card. Draw the notes with VexFlow as the guide says, and reuse
> `raudioTapSnare()` from `rhythm-audio.js` for the playback. Fire the events
> listed in §3.8. Stop when it's done.

**Step 4: Smash**

> Do **step 4** of the build guide: floor `v1-smash`, as in §3.6. First read
> `loadG2Grid`, `handleG2Click`, `resolveG2Screen` and `triggerG2TimeBonus` in
> `script.js`, and match how Note Smash behaves, **without changing
> `script.js`**. Include the tiers, duds, the rule of three, no clock on tier 1,
> the duration bars that fade, combos, gold cards and the watchlist. Stop when
> it's done.

**Step 5: the Sprint and the Artistic License**

> Do **step 5** of the build guide, §3.7: floor `v1-sprint`, stars on every
> floor, medals and personal best, the Artistic License ceremony, and the Stomp
> Lab gate. The gate is the **only** change allowed in `rhythm-stomp-lab.js`,
> at the top of `enterRhythmLab()`, and it must never block anyone who has
> already played Stomp Lab. Stop when it's done.

**Step 6: phone polish**

> Do **step 6** of the build guide: check every Value Smash screen at 390 px
> wide in portrait, make tap targets at least 56 px tall, make sure nothing
> covers the notation, and make `python3 tools/check-text.py` pass. List
> anything you couldn't fix.

### B3. After each step: test, then commit

1. **Look at what changed.** Copilot shows each edited file with **Keep** and
   **Undo** buttons. Keep what looks right. If a whole step goes wrong, click
   **Undo** in the chat, or, in the **Source Control** panel, right-click the
   changes and choose **Discard**.
2. **Run it.** Right-click `index.html` and choose **Open with Live Server**.
   It opens in your browser at an address like `http://127.0.0.1:5500`.
   - **On your phone** (on the same Wi-Fi), go to `http://<your computer's
     IP>:5500`. On Windows, find the IP with `ipconfig` in the terminal. On a
     Mac, go to System Settings → Wi-Fi → Details.
   - Check that the old games still open, and that nothing new looks broken.
3. **Run the checker** (from step 1 on), in the terminal:

   ```
   python3 tools/check-text.py
   ```

   On Windows, use `python` instead of `python3`.
4. **Commit and push.** In the **Source Control** panel on the left:
   - type a short message, such as "Value Smash step 3: the Tree";
   - click **Commit**, then **Sync Changes**. The first time, it will say
     **Publish Branch**.

   Your work is then saved on GitHub, on `idea/value-smash`.

### B4. Rules that keep you safe

- **Never merge `idea/value-smash` into `main`** until you have played it on
  your phone. `main` is the live website.
- **One step per chat.** If Copilot starts changing files the step didn't
  mention, especially `script.js`, stop it and Undo.
- **If it writes words into the code** (sentences inside `.js` or `.html`),
  ask it: *"Move that text into the game's file in `lang/` and use `KR.t()`."* The checker
  catches most of these.
- **Copilot has usage limits too.** Agent mode with the stronger models uses up
  "premium requests". Short, one-step prompts make them go further.

---

## Coming back to Claude

Every step is committed on `idea/value-smash`. When you're back in Claude Code,
start a session and say:

> Continue the Value Smash build on branch `idea/value-smash`. Read `CLAUDE.md`
> and `docs/value-smash-build-guide.md`, check what's already done against §4,
> review the last steps' code for anything that breaks the guide's rules, then
> carry on with the next step.

That review is worth doing whichever tool built the step. It's the fastest way
to catch words in the code, a broken rule, or a change to a working game.

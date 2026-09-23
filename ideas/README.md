# Ideas — how to build one without breaking what works

Rob: *"How do I add all of that in without polluting this conversation? … if I
have more ideas that I would like to build out and test and keep them
independent and only bring them into Main once they are worthy additions."*

This folder is the answer. The short version: **the repo is not what gets
polluted — the conversation is.** Git already keeps work apart; what needs a
rule is where thinking gets written down so it survives a session ending.

## The three separate things

| | Lives on | Why |
|---|---|---|
| **The idea** | a file in `ideas/`, on **main** | So it is findable from anywhere, by anyone, forever. Short, and in Rob's own words. |
| **The build** | a branch, `idea/<name>` | So a half-built thing can never reach the deployed site. |
| **The conversation** | its own session, started on that branch | So one line of work never has to carry another one's context. |

## Starting one

1. **Write the idea down first**, as `ideas/<name>.md` on main. One page: what
   it teaches, why the current app misses it, and what is *not* decided yet. It
   costs five minutes and it is what makes the idea survive a session ending.
2. **Branch:** `git checkout main && git pull && git checkout -b idea/<name>`.
3. **Start a NEW session on that branch.** This is the part that actually stops
   the pollution. A session carries its whole history; a new one starts with
   the repo, `CLAUDE.md` and the idea file, which is everything it needs.
4. Build it there. Screenshot it on a phone. Break it.

## Bringing it in

An idea earns `main` when **all** of these are true — not before:

- **It plays on Rob's phone.** Not "the tests pass" — played, in portrait.
- **The test suite is green** and the new thing has tests of its own.
- **`CLAUDE.md` has its section written**, including the decisions that were
  *rejected* and why. An idea merged without that becomes a mystery in a month.
- **Its hooks reward only correct answers.** The app is addictive by design
  (see "ADDICTIVE BY DESIGN" in `CLAUDE.md`), but a hook that pays off guessing
  or softens a gate is a bug.
- **Its words are in the language files**, not literals in the code (see
  `docs/language-files-plan.md`).

Until then the branch just sits there. A branch costs nothing. Half a good idea
merged into main costs a lot.

## Running two at once

Fine, and normal — one branch and one session each. The only rule is that they
both start from `main`, so neither inherits the other's half-finished work. If
two ideas turn out to need the same change, make that change on `main` first
and rebase both.

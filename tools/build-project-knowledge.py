#!/usr/bin/env python3
"""Rebuild docs/project-knowledge.md from the design notes.

One file holding all the standing context, for pasting into a Claude Project's
knowledge base (a Project cannot read inside a zip, and uploading six files is
six chances to upload a stale one).

It is GENERATED. Edit CLAUDE.md, NOTATION_RULES.md or ideas/ and re-run:

    python3 tools/build-project-knowledge.py

Never edit docs/project-knowledge.md by hand - the next run overwrites it.
"""
import datetime
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'project-knowledge.md')

SOURCES = [
    ('CLAUDE.md',
     'The main reference. Read this first - it is the source of truth over any '
     'comment in the code.'),
    ('NOTATION_RULES.md',
     "The standard engraving conventions as authority, plus the engine's measured "
     'standing against them.'),
    ('ideas/README.md',
     'How to develop a new idea on a branch without disturbing work in flight.'),
    ('ideas/equivalency-note-tree.md',
     'The known prerequisite hole: note-value equivalency. Captured, not designed.'),
]

HEADER = """# Kool Riffs — project knowledge

Everything a fresh Claude needs to reason about this project, in one file.
Drop this straight into a Claude Project's knowledge base.

- **Live app:** https://koolrifz.github.io/music-memorisation/
- **Repo:** https://github.com/koolrifz/music-memorisation
- **Generated:** {date} — by `tools/build-project-knowledge.py`

**This file is generated.** Edit the sources in the repo and re-run the script;
do not edit this copy, the next run overwrites it.

**What this is not:** it is not the code. It is the accumulated design context —
the rules, the reversals and the reasoning behind them. To change code, work in
the repo, not from here.

**How to read the rules.** Many of them have been reversed at least once, by
Rob, after he played the thing on a phone and found the edge of his own rule.
Every reversal is recorded next to the rule it replaced, with his words and his
reasoning. That is deliberate: this is a history, not a contradiction. When two
statements conflict, **the one marked as the later reversal wins**, and the text
says which that is.

---
"""


def main():
    parts = [HEADER.format(date=datetime.date.today().isoformat())]
    for path, note in SOURCES:
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            continue
        with open(full) as handle:
            body = handle.read()
        parts.append('\n\n' + '=' * 78 + '\n')
        parts.append('# FILE: %s\n' % path)
        parts.append('*%s*\n' % note)
        parts.append('=' * 78 + '\n\n')
        parts.append(body)
    text = ''.join(parts)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as handle:
        handle.write(text)
    print('wrote %s (%d chars, %d sources)' % (
        os.path.relpath(OUT, ROOT), len(text), len(SOURCES)))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Check that the words stay out of the code.

    python3 tools/check-text.py        (on Windows: python tools/check-text.py)

Three checks. Exits non-zero if any fails:

  1. Every ID used through KR.t('...'), KR.say('...'), KR.noteName('...') or
     data-text="..." in the files listed in USES exists in lang/en-US.js.
  2. Every ID in lang/en-GB.js also exists in lang/en-US.js.
  3. The files listed in NO_WORDS contain no English sentence in quotes -
     a string with two words separated by a space. A line ending in the
     comment  // text-ok  is allowed through, for the rare real exception
     (a CSS class list, say).

See docs/language-files-plan.md and docs/value-smash-build-guide.md.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Files whose ID uses are checked (1). Add each game here as it is converted.
USES = ['value-smash.js', 'text.js', 'index.html']

# Files that may hold no hard-coded words at all (3).
NO_WORDS = ['value-smash.js']

LANG_BASE = 'lang/en-US.js'
LANG_OTHERS = ['lang/en-GB.js']

ID_USE = [
    re.compile(r"""KR\.(?:t|say)\(\s*['"]([^'"]+)['"]"""),
    re.compile(r"""data-text\s*=\s*['"]([^'"]+)['"]"""),
]
NOTE_NAME_USE = re.compile(r"""KR\.noteName\(\s*['"]([^'"]+)['"]""")
LANG_ENTRY = re.compile(r"""^\s*['"]([^'"]+)['"]\s*:""", re.MULTILINE)
TWO_WORDS = re.compile(r"[A-Za-z]\s+[A-Za-z]")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def exists(rel):
    return os.path.exists(os.path.join(ROOT, rel))


def strip_comments(text, html=False):
    """Blank out comments, keeping line numbers, so an example in a comment
    is not mistaken for real use. Quotes are respected, so the // in a URL
    inside a string is not a comment."""
    if html:
        return re.sub(r'<!--.*?-->', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)
    out, i, n, quote = [], 0, len(text), None
    while i < n:
        c = text[i]
        if quote:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
        elif c in '\'"`':
            quote = c
            out.append(c)
            i += 1
        elif text.startswith('//', i):
            end = text.find('\n', i)
            end = n if end == -1 else end
            out.append(' ' * (end - i))
            i = end
        elif text.startswith('/*', i):
            end = text.find('*/', i + 2)
            end = n if end == -1 else end + 2
            out.append(re.sub(r'[^\n]', ' ', text[i:end]))
            i = end
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def string_literals(line):
    """The quoted strings on one line of JavaScript."""
    return re.findall(r"""'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`""", line)


def lang_ids(rel):
    return set(LANG_ENTRY.findall(strip_comments(read(rel))))


def main():
    problems = []
    base = lang_ids(LANG_BASE)

    # 1. Every ID used exists in en-US.
    for rel in USES:
        if not exists(rel):
            print('  (skipped %s - not written yet)' % rel)
            continue
        text = strip_comments(read(rel), html=rel.endswith('.html'))
        for lineno, line in enumerate(text.splitlines(), 1):
            ids = [m for p in ID_USE for m in p.findall(line)]
            ids += ['note.' + m for m in NOTE_NAME_USE.findall(line)]
            for i in ids:
                if i not in base:
                    problems.append('%s:%d  ID not in %s: %s' % (rel, lineno, LANG_BASE, i))

    # 2. Every ID in the other languages exists in en-US.
    for rel in LANG_OTHERS:
        for i in sorted(lang_ids(rel) - base):
            problems.append('%s  ID not in %s: %s' % (rel, LANG_BASE, i))

    # 3. No sentences in the code.
    for rel in NO_WORDS:
        if not exists(rel):
            continue
        raw = read(rel).splitlines()
        text = strip_comments(read(rel)).splitlines()
        for lineno, (line, original) in enumerate(zip(text, raw), 1):
            if '// text-ok' in original:
                continue
            for groups in string_literals(line):
                s = next(g for g in groups if g is not None and g != '') if any(groups) else ''
                if TWO_WORDS.search(s):
                    problems.append('%s:%d  words in the code (move to lang/, or mark // text-ok): "%s"'
                                    % (rel, lineno, s))

    if problems:
        print('check-text: %d problem(s)' % len(problems))
        for p in problems:
            print('  ' + p)
        return 1
    print('check-text: OK (%d IDs in %s)' % (len(base), LANG_BASE))
    return 0


if __name__ == '__main__':
    sys.exit(main())

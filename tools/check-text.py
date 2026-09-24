#!/usr/bin/env python3
"""Check that the words stay out of the code.

    python3 tools/check-text.py        (on Windows: python tools/check-text.py)

The words live in lang/, one file per game. Each file is either US English
(KR.lang('en-US', ...), the base: every ID must be in one of these) or UK
English (KR.lang('en-GB', ...), only the differences).

Five checks. Exits non-zero if any fails:

  0. Every file in lang/ loads: no broken quote, missing comma or stray
     backtick, and every entry is words. Needs node; skipped without it.
     This is the check that matters most when a file was edited on a phone.
  1. Every ID used through KR.t('...'), KR.say('...'), KR.noteName('...') or
     data-text="..." in the files listed in USES is in a US file in lang/.
  2. Every ID in a UK file is also in a US file.
  3. No ID is written twice - in one file or across two. The second would
     silently win, and an edit to the first would seem to do nothing.
  4. The files listed in NO_WORDS contain no English sentence in quotes -
     a string with two words separated by a space. A line ending in the
     comment  // text-ok  is allowed through, for the rare real exception
     (a CSS class list, say).

See docs/language-files-plan.md and docs/value-smash-build-guide.md.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Files whose ID uses are checked (1). Add each game here as it is converted.
USES = ['value-smash.js', 'rhythm-stomp-lab.js', 'text.js', 'index.html']

# Files that may hold no hard-coded words at all (3).
NO_WORDS = ['value-smash.js', 'rhythm-stomp-lab.js']

LANG_DIR = 'lang'
LANG_BASE_CODE = 'en-US'
LANG_CODE = re.compile(r"""KR\.lang\(\s*['"]([^'"]+)['"]""")

# Only an ID written out whole: KR.t('a.b') or KR.t('a.b', vars). An ID
# built at run time (KR.t('value.floor.' + id)) can't be checked here.
ID_USE = [
    re.compile(r"""KR\.(?:t|say)\(\s*['"]([^'"]+)['"]\s*[,)]"""),
    re.compile(r"""data-text\s*=\s*['"]([^'"]+)['"]"""),
]
NOTE_NAME_USE = re.compile(r"""KR\.noteName\(\s*['"]([^'"]+)['"]\s*[,)]""")
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
    return LANG_ENTRY.findall(strip_comments(read(rel)))


def lang_files():
    """{code: [file, ...]} for every file in lang/."""
    files = {}
    for path in sorted(glob.glob(os.path.join(ROOT, LANG_DIR, '*.js'))):
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        m = LANG_CODE.search(strip_comments(read(rel)))
        files.setdefault(m.group(1) if m else '?', []).append(rel)
    return files


# Runs each lang file the way the browser does, with a stand-in KR.lang.
LOAD_CHECK = r"""
const fs = require('fs'), vm = require('vm');
const problems = [];
for (const rel of JSON.parse(process.argv[1])) {
    const KR = { lang(code, table) {
        if (!table || typeof table !== 'object') throw new Error('KR.lang needs a list of words');
        for (const [id, words] of Object.entries(table))
            if (typeof words !== 'string') problems.push(rel + '  ' + id + ' is not words in backticks');
    } };
    try {
        vm.runInNewContext(fs.readFileSync(rel, 'utf8'), { KR }, { filename: rel });
    } catch (e) {
        const where = (e.stack || '').split(String.fromCharCode(10))[0];
        problems.push(where + '  ' + e.name + ': ' + e.message);
    }
}
console.log(JSON.stringify(problems));
"""


def load_problems(rels):
    node = shutil.which('node')
    if not node:
        print('  (skipped the load check - node is not installed)')
        return []
    out = subprocess.run([node, '-e', LOAD_CHECK, json.dumps(rels)], cwd=ROOT,
                         capture_output=True, text=True)
    if out.returncode != 0:
        return ['load check could not run: ' + out.stderr.strip()]
    return ['%s  (this file will not load, so its words are missing)' % p
            for p in json.loads(out.stdout)]


def main():
    files = lang_files()
    base_files = files.get(LANG_BASE_CODE, [])
    other_files = [f for code, fs in files.items() if code != LANG_BASE_CODE for f in fs]

    # 0. Every lang file loads.
    problems = load_problems(base_files + other_files)

    # 3. No ID written twice.
    for code, fs in files.items():
        seen = {}
        for rel in fs:
            for i in lang_ids(rel):
                if i in seen:
                    problems.append('%s  %s is also in %s - keep one' % (rel, i, seen[i]))
                seen[i] = rel

    base = set(i for rel in base_files for i in lang_ids(rel))

    # 1. Every ID used exists in a US file.
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
                    problems.append('%s:%d  ID not in any US file in lang/: %s' % (rel, lineno, i))

    # 2. Every ID in the other languages exists in a US file.
    for rel in other_files:
        for i in sorted(set(lang_ids(rel)) - base):
            problems.append('%s  ID not in any US file in lang/: %s' % (rel, i))

    # 4. No sentences in the code.
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
    print('check-text: OK (%d IDs in %d files in lang/)' % (len(base), len(base_files + other_files)))
    return 0


if __name__ == '__main__':
    sys.exit(main())

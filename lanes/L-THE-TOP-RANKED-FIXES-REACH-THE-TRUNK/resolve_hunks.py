#!/usr/bin/env python3
"""Resolve conflict markers hunk by hunk, with an explicit choice per hunk.

Usage: resolve_hunks.py <file> <choice1> <choice2> ...
choice is 'ours' | 'theirs' | 'both'  (one per <<<<<<< hunk, in order)

Refuses to write unless the number of choices equals the number of hunks, and
refuses to leave any marker behind.  Prints what each hunk contributed.
"""
import sys

path, choices = sys.argv[1], sys.argv[2:]
lines = open(path, encoding='utf-8').read().split('\n')

out, i, hunk = [], 0, 0
while i < len(lines):
    if lines[i].startswith('<<<<<<<'):
        i += 1
        ours = []
        while not lines[i].startswith('======='):
            ours.append(lines[i]); i += 1
        i += 1
        theirs = []
        while not lines[i].startswith('>>>>>>>'):
            theirs.append(lines[i]); i += 1
        i += 1
        if hunk >= len(choices):
            sys.exit('more hunks than choices in %s' % path)
        c = choices[hunk]
        picked = {'ours': ours, 'theirs': theirs, 'both': ours + theirs}[c]
        print('hunk %d: %s (ours %d lines, theirs %d lines) -> kept %d lines'
              % (hunk + 1, c, len(ours), len(theirs), len(picked)))
        out.extend(picked)
        hunk += 1
    else:
        out.append(lines[i]); i += 1

if hunk != len(choices):
    sys.exit('%s: %d hunks but %d choices given' % (path, hunk, len(choices)))
text = '\n'.join(out)
for m in ('<<<<<<<', '=======', '>>>>>>>'):
    if any(l.startswith(m) for l in out):
        sys.exit('%s: marker %s survived' % (path, m))
open(path, 'w', encoding='utf-8').write(text)
print('%s: %d hunks resolved' % (path, hunk))

#!/usr/bin/env python3
"""Comment out named IStoreFeatureFlagEffectiveResolver AddScoped lines in Program.cs.

usage: mutate.py <program.cs> <impl-substring> [<impl-substring> ...]
Exits non-zero unless exactly one line matched per substring (a silent no-op
mutation is how a mutation receipt credits itself with a red it did not cause).
"""
import sys

path = sys.argv[1]
wanted = sys.argv[2:]
lines = open(path, encoding="utf-8").read().split("\n")

for w in wanted:
    hits = [i for i, l in enumerate(lines)
            if "IStoreFeatureFlagEffectiveResolver" in l
            and "AddScoped" in l
            and w in l
            and not l.lstrip().startswith("//")]
    if len(hits) != 1:
        sys.exit("expected exactly 1 live registration line for %r, found %d" % (w, len(hits)))
    i = hits[0]
    indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
    lines[i] = indent + "// MUTANT-REMOVED: " + lines[i].strip()
    print("removed Program.cs:%d  %s" % (i + 1, w))

open(path, "w", encoding="utf-8").write("\n".join(lines))

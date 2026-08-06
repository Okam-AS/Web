#!/usr/bin/env python3
"""Read-only merge simulation: for every lane that authored a divergent key, merge it
against the composition tip with git merge-file and report (a) conflicts and
(b) duplicate keys surviving into the merged object literal — the silent case.

Writes only into this lane's own directory. Touches no ref and no worktree.
"""
import json
import os
import re
import subprocess
import collections

R = "/Users/svendaneel/okam/Web-modules"
LD = f"{R}/lanes/L-TRANSLATIONS-COLLISION"
D = f"{LD}/mergesim"
os.makedirs(D, exist_ok=True)
PATHS = ["translations/no.ts", "translations/en.ts", "translations/de.ts"]
LINE = re.compile(r"^\s*([A-Za-z_$][\w$]*)\s*:\s*(.+?),?\s*$")
COMPOSE = "candidate/fe-compose-2026-08-05"


def g(*a):
    return subprocess.run(["git", "-C", R, *a], capture_output=True, text=True)


verdict = json.load(open(f"{LD}/verdict.json"))["verdict"]
lanes = set()
for p in PATHS:
    for k, x in verdict[p].items():
        if x["verdict"] == "DIVERGENT":
            for vv, bs in x["variants"].items():
                for b in bs:
                    if b not in ("BASELINE(e34977ac)", "WORKING-TREE"):
                        lanes.add(b)
lanes.discard(COMPOSE)

rows = []
for lane in sorted(lanes):
    mb = g("merge-base", COMPOSE, lane).stdout.strip()
    if not mb:
        continue
    for p in PATHS:
        ok = True
        for ref, name in ((mb, "base"), (COMPOSE, "ours"), (lane, "theirs")):
            r = g("cat-file", "-p", f"{ref}:{p}")
            if r.returncode != 0:
                ok = False
                break
            open(f"{D}/{name}.ts", "w").write(r.stdout)
        if not ok:
            continue
        r = subprocess.run(["git", "merge-file", "-p", "--diff3",
                            f"{D}/ours.ts", f"{D}/base.ts", f"{D}/theirs.ts"],
                           capture_output=True, text=True)
        seen = {}
        dups = collections.OrderedDict()
        inconf = False
        for l in r.stdout.split("\n"):
            if l.startswith("<<<<<<<"):
                inconf = True
                continue
            if l.startswith(">>>>>>>"):
                inconf = False
                continue
            if l.startswith("|||||||") or l.startswith("======="):
                continue
            if inconf:
                continue
            m = LINE.match(l)
            if not m:
                continue
            v = m.group(2).rstrip(",").strip()
            if v[:1] not in "'\"`":
                continue
            k = m.group(1)
            if k in seen:
                dups[k] = (seen[k], v)   # (first value, later value == the winner)
            seen[k] = v
        rows.append({"lane": lane, "path": p, "conflicts": r.returncode,
                     "dups": {k: list(v) for k, v in dups.items()}})

json.dump(rows, open(f"{LD}/mergesim.json", "w"), indent=1)
silent = [x for x in rows if x["dups"]]
print(f"lanes simulated: {len(lanes)}  file-merges: {len(rows)}")
print(f"merges that CONFLICT (loud): {sum(1 for x in rows if x['conflicts']>0)}")
print(f"merges that AUTO-MERGE with a duplicate key (SILENT): {len(silent)}")
for x in silent:
    print(f"\n  {x['lane']} -> {x['path']}  conflicts={x['conflicts']}")
    for k, (first, later) in x["dups"].items():
        print(f"     key {k}")
        print(f"       loses (earlier line): {first[:110]}")
        print(f"       WINS  (later line)  : {later[:110]}")

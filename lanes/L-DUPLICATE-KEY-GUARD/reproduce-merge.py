#!/usr/bin/env python3
"""Reproduce one of the nine silent-duplicate merge results from
lanes/L-TRANSLATIONS-COLLISION/mergesim.json, byte for byte, into this lane's
directory. Read-only against the repository: no ref is moved, no worktree is
touched, `git merge-file` runs on temp copies inside this lane directory only.

    ./reproduce-merge.py <lane-branch> <path> <out.ts>

Prints the assertions that make the reproduction falsifiable rather than
plausible: conflict-marker count, the duplicated keys and the line numbers of
each occurrence, and a control key that must appear exactly once.
"""
import collections
import os
import re
import subprocess
import sys

R = "/Users/svendaneel/okam/Web-modules"
LD = os.path.dirname(os.path.abspath(__file__))
COMPOSE = "candidate/fe-compose-2026-08-05"
LINE = re.compile(r"^\s*([A-Za-z_$][\w$]*)\s*:\s*(.+?),?\s*$")


def g(*a):
    return subprocess.run(["git", "-C", R, *a], capture_output=True, text=True)


def main():
    lane, path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    mb = g("merge-base", COMPOSE, lane).stdout.strip()
    assert mb, f"no merge-base between {COMPOSE} and {lane}"
    tmp = os.path.join(LD, ".merge-tmp")
    os.makedirs(tmp, exist_ok=True)
    for ref, name in ((mb, "base"), (COMPOSE, "ours"), (lane, "theirs")):
        r = g("cat-file", "-p", f"{ref}:{path}")
        assert r.returncode == 0, f"{path} missing at {ref}"
        open(os.path.join(tmp, name + ".ts"), "w").write(r.stdout)
    r = subprocess.run(
        ["git", "merge-file", "-p", "--diff3",
         os.path.join(tmp, "ours.ts"), os.path.join(tmp, "base.ts"),
         os.path.join(tmp, "theirs.ts")],
        capture_output=True, text=True)
    open(out, "w").write(r.stdout)

    lines = r.stdout.split("\n")
    markers = sum(1 for l in lines
                  if l.startswith(("<<<<<<<", "=======", ">>>>>>>", "|||||||")))
    where = collections.defaultdict(list)
    for i, l in enumerate(lines, 1):
        m = LINE.match(l)
        if m and m.group(2).rstrip(",").strip()[:1] in "'\"`":
            where[m.group(1)].append(i)
    dups = {k: v for k, v in where.items() if len(v) > 1}

    print(f"merge-base      : {mb[:12]}")
    print(f"ours   ({COMPOSE}) x theirs ({lane})")
    print(f"path            : {path}")
    print(f"wrote           : {out}  ({len(lines)} lines)")
    print(f"git merge-file rc (conflict count): {r.returncode}")
    print(f"conflict markers in output       : {markers}")
    print(f"duplicated keys                  : {len(dups)}")
    for k, v in sorted(dups.items()):
        print(f"  {k} at lines {v}   (JS keeps line {v[-1]})")
    ctrl = "mrgs_finalize_cta" if "mrgs_finalize_cta" in where else next(
        k for k in where if len(where[k]) == 1)
    print(f"control key {ctrl} occurrences   : {len(where[ctrl])}")
    for f in ("base.ts", "ours.ts", "theirs.ts"):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    return 0 if dups and markers == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

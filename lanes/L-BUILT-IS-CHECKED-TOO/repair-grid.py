#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Second pass: for each of the 290 unchecked pointers, the MINIMAL repair.

Reads census.json.  Asks, for every row the repaired checker would refuse,
where the artifact actually is — this repo, a worktree of it, a sibling repo,
git history, or nowhere — because that is what separates a one-line correction
from a lost run.  Reads only; writes only under this lane directory.
"""
import importlib.machinery
import importlib.util
import json
import os
import re
import subprocess
import sys

REPO = "/Users/svendaneel/okam/Web-modules"
OUT = os.path.join(REPO, "lanes/L-BUILT-IS-CHECKED-TOO")
PLAN_BIN = "/Users/svendaneel/.local/bin/plan"

spec = importlib.util.spec_from_loader(
    "pm", importlib.machinery.SourceFileLoader("pm", PLAN_BIN))
pm = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(pm)
p = pm.load(os.path.join(REPO, "docs", "plan"))
pm.parse(p)

rows = json.load(open(os.path.join(OUT, "census.json")))

wl = subprocess.run(["git", "-C", REPO, "worktree", "list", "--porcelain"],
                    capture_output=True, text=True).stdout
WORKTREES = [l.split(" ", 1)[1] for l in wl.splitlines()
             if l.startswith("worktree ")]
SIBLINGS = [d for d in
            (os.path.join("/Users/svendaneel/okam", x)
             for x in os.listdir("/Users/svendaneel/okam"))
            if os.path.isdir(d)]

TOKEN_RE = re.compile(r"[~./A-Za-z0-9_-]*/[~./A-Za-z0-9_,{}=+-]+")
BRACE_RE = re.compile(r"\{([^{}]*)\}")


def expand_braces(tok):
    """`lanes/L-X/{a.md,b.txt}` is shell brace syntax, not a path.  Nineteen
    pointers are written this way; refusing to expand them reports artifacts
    absent that are on disk.  Returns every concrete path the token means."""
    m = BRACE_RE.search(tok)
    if not m:
        return [tok]
    out = []
    for alt in m.group(1).split(","):
        out.extend(expand_braces(tok[:m.start()] + alt + tok[m.end():]))
    return out
# tokens that carry a `/` but are not paths — the tokeniser's false positives
NOT_A_PATH = re.compile(
    r"^(?:feature|lane|candidate|integration|origin|main|master|stage\d*)/|"
    r"^[A-Z]/[A-Z]$|^(?:and|or|the)/", re.I)


def in_repo(rel):
    return os.path.exists(os.path.join(REPO, rel))


# Every root a repo-relative pointer could plausibly have been written under.
# `docs/plan` is in here because six lanes wrote their artifact with a path
# relative to the plan directory rather than the repo root, and a search that
# omits it reports those artifacts LOST when they are on disk.  `git status
# --porcelain` hides them (docs/plan is ignored) and `find -maxdepth 4` from
# ~/okam cuts off one level above them — both first-shape searches were wrong.
PREFIXES = []
for _r in [REPO] + [w for w in WORKTREES if w != REPO] + SIBLINGS:
    PREFIXES.append((_r, os.path.basename(_r)))
    _dp = os.path.join(_r, "docs", "plan")
    if os.path.isdir(_dp):
        PREFIXES.append((_dp, os.path.basename(_r) + "/docs/plan"))


def where(rel):
    """Where does this repo-relative artifact actually live?"""
    if in_repo(rel):
        return "this checkout"
    for root, label in PREFIXES:
        if os.path.exists(os.path.join(root, rel)):
            if root == os.path.join(REPO, "docs", "plan"):
                return "THIS repo, under docs/plan/ (written cwd-relative)"
            return "a %s checkout (%s)" % (
                "worktree" if root in WORKTREES else "sibling", label)
    g = subprocess.run(["git", "-C", REPO, "log", "--all", "--oneline",
                        "--diff-filter=A", "--", rel],
                       capture_output=True, text=True).stdout.strip()
    if g:
        return "git history only (%s)" % g.splitlines()[0].split()[0]
    return "NOWHERE"


def classify(r):
    """(repair-class, note) — the cheapest thing that makes this measurable."""
    if r["admissible"]:
        return "R0 nothing — already admissible", ""
    ev = r["evidence"]
    # exit-side shapes, computed once
    ex_toks = r["exit_paths"]
    ex_dirs = [t for t in ex_toks
               if os.path.isdir(os.path.join(REPO, t.rstrip("/")))]
    ex_fake = [t for t in ex_toks if NOT_A_PATH.match(t)]

    if r["trim_admissible"]:
        return ("R1 trim the pointer to the artifact already inside it",
                "-> %s" % r["trim_token"])
    if r["category"] == "A-artifact-exists" or "does not exist" not in \
            r["reason"]:
        # artifact is there; the exit is what fails to name it
        if not ex_toks:
            return ("R2 exit: names no artifact at all — name one, then the "
                    "pointer stands", "")
        if ex_dirs:
            return ("R3 exit: names a directory — narrow it to the artifact",
                    "dir token %s" % ex_dirs[0])
        if ex_fake:
            return ("R4 exit's only path-shaped token is a branch or route, "
                    "not a file", "token %s" % ex_fake[0])
        return ("R5 exit names a DIFFERENT artifact than the evidence offers",
                "exit wants %s" % (ex_toks[0] if ex_toks else "?"))
    # the pointer does not resolve
    raw = [t.strip(" ,;·)(\"'`") for t in TOKEN_RE.findall(ev)]
    cands = []
    for t in raw:
        if t.startswith("http") or NOT_A_PATH.match(t):
            continue
        cands.extend(expand_braces(t))
    # a bare worktree directory named in the prose, with this lane's dir in it
    for t in list(cands) + re.findall(r"[~/][A-Za-z0-9_./~-]+", ev):
        d = os.path.expanduser(t)
        cand = os.path.join(d, "lanes", r["id"])
        if os.path.isdir(cand):
            cands.extend(os.path.join(cand, f) for f in os.listdir(cand))
    rels = [t for t in cands if not os.path.isabs(t) and not t.startswith("~")]
    for t in rels:
        w = where(t)
        if w != "NOWHERE":
            return ("R6 artifact is real but not in this checkout — bring it "
                    "here, then point at it", "%s -> %s" % (t, w))
    if any(os.path.isabs(t) and os.path.exists(t) for t in cands):
        t = next(t for t in cands if os.path.isabs(t) and os.path.exists(t))
        return ("R6 artifact is real but not in this checkout — bring it "
                "here, then point at it", "%s -> outside the repo root" % t)
    if not cands:
        return ("R7 the pointer names a commit or a branch, never a file — "
                "an artifact has to be written", "")
    return ("R8 the artifact the pointer names exists NOWHERE — re-record or "
            "re-run", "; ".join(cands[:2]))


grid, notes = {}, []
for r in rows:
    cls, note = classify(r)
    r["repair"], r["repair_note"] = cls, note
    grid.setdefault(cls, []).append(r["id"])
    notes.append(r)

with open(os.path.join(OUT, "repair-grid.json"), "w") as fh:
    json.dump(notes, fh, indent=1)

print("MINIMAL REPAIR for each of the %d unchecked pointers\n" % len(rows))
tot = 0
for k in sorted(grid):
    print("  %-72s %4d" % (k[:72], len(grid[k])))
    tot += len(grid[k])
print("  %-72s %4d" % ("TOTAL", tot))

print("\n--- the record-only half vs the missing-artifact half ---")
recordonly = sum(len(v) for k, v in grid.items()
                 if k[:2] in ("R0", "R1", "R2", "R3", "R4", "R5"))
elsewhere = sum(len(v) for k, v in grid.items() if k.startswith("R6"))
lost = sum(len(v) for k, v in grid.items() if k[:2] in ("R7", "R8"))
print("  the artifact is here, the RECORD is wrong        : %d" % recordonly)
print("  the artifact is real but not in this checkout    : %d" % elsewhere)
print("  no artifact exists to point at                   : %d" % lost)

print("\n--- R8, listed in full (nothing to point at) ---")
for r in notes:
    if r["repair"].startswith("R8"):
        print("  %-40s %s" % (r["id"], r["evidence"][:110]))
print("\n--- R7, listed in full (a commit, never a file) ---")
for r in notes:
    if r["repair"].startswith("R7"):
        print("  %-40s %s" % (r["id"], r["evidence"][:110]))

with open(os.path.join(OUT, "repair-grid.txt"), "w") as fh:
    for k in sorted(grid):
        fh.write("\n%s\n%s  (%d)\n%s\n" % ("=" * 78, k, len(grid[k]), "=" * 78))
        for r in notes:
            if r["repair"] == k:
                fh.write("  %-42s %s\n" % (r["id"], r["repair_note"][:120]))
                fh.write("      ev  : %s\n" % r["evidence"][:200])
                fh.write("      exit: %s\n" % r["exit"][:200])
print("\nwrote repair-grid.json / repair-grid.txt")

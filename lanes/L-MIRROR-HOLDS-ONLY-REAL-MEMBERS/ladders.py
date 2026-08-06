#!/usr/bin/env python3
"""Tier B: find frontend string-literal mirrors of backend enums.

Two shapes:
  (1) switch ladders:  case 'Member': ...
  (2) object maps:     { Member: x, ... } / { 'Member': x, ... }
Each candidate label-set is matched against the 177 backend enums by Jaccard overlap.
"""
import json
import re
import subprocess
import sys

D = "/Users/svendaneel/okam/Web-modules/lanes/L-MIRROR-HOLDS-ONLY-REAL-MEMBERS"
be = json.load(open(f"{D}/be.json"))
fe_core = json.load(open(f"{D}/fe-core.json"))

REPOS = [
    ("Web-modules", "/Users/svendaneel/okam/Web-modules", sys.argv[1]),
    ("core", "/Users/svendaneel/okam/Web-modules/core", "1bcab0b6"),
]


def sh(a, cwd):
    return subprocess.run(a, cwd=cwd, capture_output=True, text=True).stdout


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"(^|[^:])//[^\n]*", lambda m: m.group(1), src)
    return src


CASE = re.compile(r"\bcase\s+(?:['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]|[A-Za-z_][A-Za-z0-9_.]*\.([A-Za-z_][A-Za-z0-9_]*))\s*:")
SWITCH = re.compile(r"\bswitch\s*\(")

ladders = []
for repo_name, repo, ref in REPOS:
    paths = [p for p in sh(["git", "ls-tree", "-r", "--name-only", ref], repo).splitlines()
             if p.endswith((".js", ".ts", ".vue"))]
    for p in paths:
        src = sh(["git", "show", f"{ref}:{p}"], repo)
        if "switch" not in src:
            continue
        clean = strip_comments(src)
        for m in SWITCH.finditer(clean):
            # body = from the '{' after the switch head to its matching '}'
            i = clean.find("{", m.end())
            if i < 0:
                continue
            depth, j = 0, i
            while j < len(clean):
                if clean[j] == "{":
                    depth += 1
                elif clean[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            body = clean[i:j]
            labels = sorted({(a or b) for a, b in CASE.findall(body)})
            if len(labels) < 2:
                continue
            line = clean[:m.start()].count("\n") + 1
            ladders.append({"repo": repo_name, "ref": ref, "path": p, "line": line,
                            "labels": labels, "has_default": "default:" in body})

# match each ladder to the best backend enum
core_by_name = {e["name"]: e for e in fe_core}
out = []
for L in ladders:
    lset = frozenset(L["labels"])
    best, score = None, 0.0
    for e in be:
        bset = frozenset(m["name"] for m in e["members"])
        if not bset:
            continue
        s = len(lset & bset) / len(lset | bset)
        if s > score:
            best, score = e, s
    if score < 0.34:
        continue
    bset = frozenset(m["name"] for m in best["members"])
    out.append({**L, "be": best["name"], "be_path": best["path"], "score": round(score, 2),
                "short": sorted(bset - lset), "extra": sorted(lset - bset)})

out.sort(key=lambda r: (r["be"], r["path"]))
json.dump(out, open(f"{D}/ladders.json", "w"), indent=1)
for r in out:
    print(f"{r['be']:<26} <- {r['repo']}/{r['path']}:{r['line']} j={r['score']} "
          f"cases={len(r['labels'])} default={r['has_default']}")
    if r["extra"]:
        print(f"    EXTRA: {', '.join(r['extra'])}")
    if r["short"]:
        print(f"    short: {', '.join(r['short'])}")
print(f"\nladders scanned: {len(ladders)}  matched(j>=0.34): {len(out)}")

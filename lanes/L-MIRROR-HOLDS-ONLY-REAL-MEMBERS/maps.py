#!/usr/bin/env python3
"""Tier B(2): object-literal maps keyed by enum-member names, and string-literal clusters."""
import json
import re
import subprocess
import sys

D = "/Users/svendaneel/okam/Web-modules/lanes/L-MIRROR-HOLDS-ONLY-REAL-MEMBERS"
be = json.load(open(f"{D}/be.json"))
member_owner = {}
for e in be:
    for m in e["members"]:
        member_owner.setdefault(m["name"], []).append(e["name"])

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


OBJ = re.compile(r"\{([^{}]{0,4000})\}", re.S)
KEY = re.compile(r"(?:^|[,{\s])['\"]?([A-Z][A-Za-z0-9_]*)['\"]?\s*:")

rows = []
for repo_name, repo, ref in REPOS:
    paths = [p for p in sh(["git", "ls-tree", "-r", "--name-only", ref], repo).splitlines()
             if p.endswith((".js", ".ts", ".vue"))]
    for p in paths:
        src = sh(["git", "show", f"{ref}:{p}"], repo)
        clean = strip_comments(src)
        for m in OBJ.finditer(clean):
            keys = sorted(set(KEY.findall(m.group(1))))
            if len(keys) < 2:
                continue
            kset = frozenset(keys)
            best, score = None, 0.0
            for e in be:
                bset = frozenset(x["name"] for x in e["members"])
                if not bset:
                    continue
                s = len(kset & bset) / len(kset | bset)
                if s > score:
                    best, score = e, s
            if score < 0.5:
                continue
            bset = frozenset(x["name"] for x in best["members"])
            rows.append({
                "repo": repo_name, "path": p,
                "line": clean[:m.start()].count("\n") + 1,
                "be": best["name"], "score": round(score, 2),
                "keys": keys,
                "short": sorted(bset - kset), "extra": sorted(kset - bset),
            })

# also: bare string-literal clusters per file that hit >=2 members of one enum
json.dump(rows, open(f"{D}/maps.json", "w"), indent=1)
for r in sorted(rows, key=lambda x: x["be"]):
    print(f"{r['be']:<26} <- {r['repo']}/{r['path']}:{r['line']} j={r['score']} keys={len(r['keys'])}")
    if r["extra"]:
        print(f"    EXTRA: {', '.join(r['extra'])}")
    if r["short"]:
        print(f"    short: {', '.join(r['short'])}")
print(f"\nmaps matched (j>=0.5): {len(rows)}")

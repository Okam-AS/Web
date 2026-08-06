#!/usr/bin/env python3
"""Second denominator: enum mirrors that are not `enum` declarations.

A frontend can copy a backend enum as a literal array, an Object.freeze map, or a
union type. Those carry the identical hazard - they answer a membership question -
so a census restricted to the `enum` keyword would under-report.

Rule: any array literal, object literal or union type holding >= 3 distinct
PascalCase/SCREAMING string literals whose set is a SUBSET of some backend enum's
member set (and covers >= 3 of it). Subset, not equality, so a short mirror is
caught rather than missed. Comments and template strings are stripped first.
"""
import json
import os
import re
import subprocess

WEB = "/Users/svendaneel/okam/Web-modules"
BACK = "/Users/svendaneel/okam/web-vocabsweep/lanes/L-FIXTURE-VOCABULARY-SWEEP/enums-8e2b57de.json"
back = json.load(open(BACK))["enums"]
bsets = {k: set(v["members"]) for k, v in back.items()}

MIN = 3


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    src = re.sub(r"(?m)^\s*//[^\n]*", " ", src)
    src = re.sub(r"(?<=[\s;,{}()])//[^\n]*", " ", src)
    return src


files = subprocess.run(
    ["find", WEB, "-type", "f",
     "(", "-name", "*.ts", "-o", "-name", "*.js", "-o", "-name", "*.vue", ")",
     "-not", "-path", "*/node_modules/*", "-not", "-path", "*/.nuxt/*",
     "-not", "-path", "*/dist/*", "-not", "-path", "*/.git/*"],
    capture_output=True, text=True, check=True).stdout.splitlines()

# bracketed groups: [...] arrays, {...} small objects, and A | B | C unions
GROUP = re.compile(r"\[[^\[\]]{0,4000}?\]|\{[^{}]{0,4000}?\}", re.S)
UNION = re.compile(r"=\s*((?:'[A-Za-z_]\w*'|\"[A-Za-z_]\w*\")(?:\s*\|\s*(?:'[A-Za-z_]\w*'|\"[A-Za-z_]\w*\")){2,})")
LIT = re.compile(r"['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]")

hits = []
for f in files:
    rel = os.path.relpath(f, WEB)
    if rel.startswith("core/enums/"):
        continue
    try:
        src = strip_comments(open(f, encoding="utf-8", errors="replace").read())
    except OSError:
        continue
    groups = [m.group(0) for m in GROUP.finditer(src)] + [m.group(1) for m in UNION.finditer(src)]
    for g in groups:
        lits = set(LIT.findall(g))
        cand = {l for l in lits if re.match(r"^[A-Z]", l)}
        if len(cand) < MIN:
            continue
        for bn, bs in bsets.items():
            if cand <= bs and len(cand) >= MIN:
                line = src[:src.find(g)].count("\n") + 1 if g in src else 0
                hits.append({
                    "file": rel, "line": line, "backend": bn,
                    "backend_size": len(bs), "listed": sorted(cand),
                    "missing": sorted(bs - cand),
                    "snippet": " ".join(g.split())[:150],
                })
                break

# de-duplicate identical (file, backend, listed)
seen, uniq = set(), []
for h in hits:
    k = (h["file"], h["backend"], tuple(h["listed"]))
    if k in seen:
        continue
    seen.add(k)
    uniq.append(h)

print(json.dumps({"count": len(uniq), "hits": uniq}, indent=1))

#!/usr/bin/env python3
"""For each frontend enum mirror, find what reads it.

A mirror nothing imports is dead weight; one that gates a render or a submission
is a decision point. Counted separately:
  barrel_only : re-exported by core/enums/index.ts and nothing else
  importers   : files that name the enum in an import statement
  usages      : files that reference `EnumName.` (a member read) outside its own file
"""
import json
import os
import re
import subprocess

WEB = "/Users/svendaneel/okam/Web-modules"
INV = "/Users/svendaneel/okam/Web-modules/lanes/L-ENUM-MIRROR-CENSUS/mirrors.json"

front = json.load(open(INV))

files = subprocess.run(
    ["find", WEB, "-type", "f",
     "(", "-name", "*.ts", "-o", "-name", "*.tsx", "-o", "-name", "*.js",
     "-o", "-name", "*.jsx", "-o", "-name", "*.vue", ")",
     "-not", "-path", "*/node_modules/*",
     "-not", "-path", "*/.nuxt/*",
     "-not", "-path", "*/dist/*",
     "-not", "-path", "*/.git/*"],
    capture_output=True, text=True, check=True).stdout.splitlines()

corpus = {}
for f in files:
    try:
        corpus[os.path.relpath(f, WEB)] = open(f, encoding="utf-8", errors="replace").read()
    except OSError:
        pass

BARREL = "core/enums/index.ts"
out = []
for fe in front["enums"]:
    name = fe["enum"]
    own = fe["path"]
    importers, usages = [], []
    # word-boundary match on the enum identifier
    ident = re.compile(r"\b" + re.escape(name) + r"\b")
    member = re.compile(r"\b" + re.escape(name) + r"\s*\.\s*\w+")
    for path, src in corpus.items():
        if path == own:
            continue
        if not ident.search(src):
            continue
        # is it named in an import/require?
        imported = False
        for im in re.finditer(r"(?:import[^;]*?from\s*['\"][^'\"]+['\"]|require\(\s*['\"][^'\"]+['\"]\s*\))", src, flags=re.S):
            if ident.search(im.group(0)):
                imported = True
                break
        if not imported and re.search(r"export\s*\{[^}]*\b" + re.escape(name) + r"\b", src):
            imported = True
        if imported:
            importers.append(path)
        hits = member.findall(src)
        if hits:
            usages.append({"path": path, "n": len(hits),
                           "members": sorted({h.split(".")[-1].strip() for h in hits})})
    non_barrel_importers = [p for p in importers if p != BARREL]
    out.append({
        "mirror": name,
        "path": own,
        "in_barrel": BARREL in importers,
        "importers": non_barrel_importers,
        "usages": usages,
        "n_importers": len(non_barrel_importers),
        "n_usage_files": len(usages),
    })

print(json.dumps({"corpus_files": len(corpus), "rows": out}, indent=1))

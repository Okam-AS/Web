#!/usr/bin/env python3
"""Readers of each mirror, with comments and string literals removed first.

The naive pass counted two artefacts: a `journey.finding(...)` narrative string
containing "PaymentType.CompanyAccount", and a comment ending "...the order's
DeliveryType." whose following line began "vatContext", which `\\s*\\.\\s*\\w+`
spanned. Both are prose, neither is a runtime read.

Three reader classes are distinguished:
  value_reads : `EnumName.Member` in executable code  -> gates a render/submission
  type_refs   : `: EnumName` / `<EnumName>` annotation -> declares a wire field's domain
  prose_only  : appears solely in comments or strings
"""
import json
import os
import re
import subprocess

WEB = "/Users/svendaneel/okam/Web-modules"
INV = os.path.join(WEB, "lanes/L-ENUM-MIRROR-CENSUS/mirrors.json")
BARREL = "core/enums/index.ts"

front = json.load(open(INV))


def strip_code(src):
    """Remove block/line comments and string+template literals."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if two == "/*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            out.append(" ")
        elif two == "//":
            j = src.find("\n", i)
            i = n if j < 0 else j
            out.append(" ")
        elif c in "\"'`":
            q, j = c, i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    break
                j += 1
            i = j + 1
            out.append(" ")
        else:
            out.append(c)
            i += 1
    return "".join(out)


files = subprocess.run(
    ["find", WEB, "-type", "f",
     "(", "-name", "*.ts", "-o", "-name", "*.tsx", "-o", "-name", "*.js",
     "-o", "-name", "*.jsx", "-o", "-name", "*.vue", ")",
     "-not", "-path", "*/node_modules/*", "-not", "-path", "*/.nuxt/*",
     "-not", "-path", "*/dist/*", "-not", "-path", "*/.git/*"],
    capture_output=True, text=True, check=True).stdout.splitlines()

corpus = {}
for f in files:
    try:
        raw = open(f, encoding="utf-8", errors="replace").read()
    except OSError:
        continue
    corpus[os.path.relpath(f, WEB)] = (raw, strip_code(raw))

rows = []
for fe in front["enums"]:
    name, own = fe["enum"], fe["path"]
    ident = re.compile(r"\b" + re.escape(name) + r"\b")
    value = re.compile(r"\b" + re.escape(name) + r"[ \t]*\.[ \t]*(\w+)")
    typed = re.compile(r"(?::[ \t]*|<|\bas[ \t]+|\bimplements[ \t]+|\bextends[ \t]+)" +
                       re.escape(name) + r"\b")
    value_reads, type_refs, prose_only, importers = [], [], [], []
    for path, (raw, code) in corpus.items():
        if path == own:
            continue
        if not ident.search(raw):
            continue
        in_code = bool(ident.search(code))
        if not in_code:
            prose_only.append(path)
            continue
        for im in re.finditer(r"import[^;]*?from[^;]*?;|require\([^)]*\)", code, flags=re.S):
            if ident.search(im.group(0)):
                importers.append(path)
                break
        v = value.findall(code)
        if v:
            value_reads.append({"path": path, "n": len(v), "members": sorted(set(v))})
        if typed.search(code):
            type_refs.append(path)
    nb = [p for p in importers if p != BARREL]
    rows.append({
        "mirror": name, "path": own,
        "in_barrel": BARREL in importers,
        "importers": nb,
        "value_reads": value_reads,
        "type_refs": [p for p in type_refs if p != BARREL],
        "prose_only": prose_only,
        "n_value_files": len(value_reads),
        "n_type_files": len([p for p in type_refs if p != BARREL]),
    })

print(json.dumps({"corpus_files": len(corpus), "rows": rows}, indent=1))

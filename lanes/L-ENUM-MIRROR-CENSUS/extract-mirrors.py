#!/usr/bin/env python3
"""Extract every TypeScript `enum` declaration in the frontend.

Reads the working tree of the frontend repo (Web-modules @ feature/restaurant-modules)
and its populated `core` submodule. Strips // and /* */ comments first so prose naming
a removed member cannot manufacture a member that does not exist.
"""
import json
import os
import re
import subprocess

WEB = "/Users/svendaneel/okam/Web-modules"


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"//[^\n]*", "", src)
    return src


def parse_enums(path, src):
    src = strip_comments(src)
    out = []
    for m in re.finditer(r"\b(?:export\s+)?(?:declare\s+)?(?:const\s+)?enum\s+(\w+)\s*\{", src):
        name = m.group(1)
        depth = 1
        i = m.end()
        while i < len(src) and depth:
            if src[i] == "{":
                depth += 1
            elif src[i] == "}":
                depth -= 1
            i += 1
        body = src[m.end():i - 1]
        members = []
        for part in body.split(","):
            part = part.strip()
            if not part:
                continue
            mm = re.match(r"^([A-Za-z_$]\w*)\s*(?:=\s*(.*))?$", part, flags=re.S)
            if mm:
                raw = (mm.group(2) or "").strip()
                val = raw.strip('"\'') if raw else None
                members.append({"name": mm.group(1), "value": val})
        out.append({"enum": name, "path": path, "members": members})
    return out


# Sweep every text-ish source file, excluding node_modules and build output.
files = subprocess.run(
    ["find", WEB, "-type", "f",
     "(", "-name", "*.ts", "-o", "-name", "*.tsx", "-o", "-name", "*.js",
     "-o", "-name", "*.jsx", "-o", "-name", "*.vue", ")",
     "-not", "-path", "*/node_modules/*",
     "-not", "-path", "*/.nuxt/*",
     "-not", "-path", "*/dist/*",
     "-not", "-path", "*/.git/*"],
    capture_output=True, text=True, check=True).stdout.splitlines()

inventory = []
for f in files:
    try:
        src = open(f, encoding="utf-8", errors="replace").read()
    except OSError:
        continue
    if "enum" not in src:
        continue
    rel = os.path.relpath(f, WEB)
    inventory.extend(parse_enums(rel, src))

print(json.dumps({"scanned_files": len(files), "count": len(inventory),
                  "enums": inventory}, indent=1))

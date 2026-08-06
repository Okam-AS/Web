#!/usr/bin/env python3
"""Broad extraction: every backtick token containing '/' inside a built-unverified|verified block.
This reproduces the naive extraction so its false-positive rate can be measured, not assumed."""
import re, json
from collections import Counter
text = open("/Users/svendaneel/okam/Web-modules/docs/plan/plan.md", encoding="utf-8").read()
lines = text.split("\n")
blocks, cur = [], None
for i, ln in enumerate(lines):
    m = re.match(r'^### (Lane|Flag|Decision|Feature|Stage|Horizon) ([A-Z0-9-]+)', ln)
    if m:
        if cur: blocks.append(cur)
        cur = {"kind": m.group(1), "id": m.group(2), "body": []}
    elif cur: cur["body"].append(ln)
if cur: blocks.append(cur)
for b in blocks:
    b["state"] = next((re.match(r'^state:\s*(\S+)', l).group(1) for l in b["body"] if re.match(r'^state:\s*(\S+)', l)), None)
    b["text"] = "\n".join(b["body"])

tgt = [b for b in blocks if b["state"] in ("built-unverified","verified")]
tok = re.compile(r'`([^`\s]+)`')
raw = {}
for b in tgt:
    for m in tok.finditer(b["text"]):
        s = m.group(1)
        if "/" in s: raw.setdefault(s, set()).add(b["id"])
json.dump({k: sorted(v) for k,v in sorted(raw.items())}, open("data/broad-candidates.json","w"), indent=1)
print("target blocks (any kind):", len(tgt))
print("distinct backtick tokens containing '/':", len(raw))
ext = Counter()
for s in raw:
    m = re.search(r'\.(\w+)$', s)
    ext[m.group(1) if m else "(no ext)"] += 1
print("by trailing extension:", dict(ext.most_common(12)))

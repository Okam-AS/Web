#!/usr/bin/env python3
"""Parse docs/plan/plan.md into entity blocks; extract lane states and candidate branch strings.
Everything downstream is derived from this - no hand-typed branch list anywhere."""
import re, json, sys

PLAN = "/Users/svendaneel/okam/Web-modules/docs/plan/plan.md"
text = open(PLAN, encoding="utf-8").read()
lines = text.split("\n")

# Split into ### blocks
blocks = []
cur = None
for i, ln in enumerate(lines):
    m = re.match(r'^### (Lane|Flag|Decision|Feature|Stage|Horizon) ([A-Z0-9-]+)', ln)
    if m:
        if cur: blocks.append(cur)
        cur = {"kind": m.group(1), "id": m.group(2), "line": i+1, "body": []}
    elif cur:
        cur["body"].append(ln)
if cur: blocks.append(cur)

# state: is the first field line in a block
for b in blocks:
    b["state"] = None
    for ln in b["body"]:
        m = re.match(r'^state:\s*(\S+)', ln)
        if m: b["state"] = m.group(1); break
    b["text"] = "\n".join(b["body"])

lanes = [b for b in blocks if b["kind"] == "Lane"]
targets = [b for b in blocks if b["state"] in ("built-unverified", "verified")]
target_lanes = [b for b in lanes if b["state"] in ("built-unverified", "verified")]

# Candidate branch strings: backtick-quoted tokens with a branch-ish prefix, anywhere in the block.
PREFIXES = r'(?:lane|prep|integration|land|feature|fix|rebrand|epoch|wt)'
pat = re.compile(r'`([A-Za-z0-9._/-]+)`')
cands = {}   # branch string -> set of entity ids naming it
for b in blocks:
    if b["state"] not in ("built-unverified", "verified"): continue
    for m in pat.finditer(b["text"]):
        s = m.group(1)
        if re.match(r'^' + PREFIXES + r'/', s) or s in ("rebrand",):
            cands.setdefault(s, set()).add(b["id"])

out = {
  "n_blocks": len(blocks),
  "n_lanes": len(lanes),
  "n_target_any_kind": len(targets),
  "n_target_lanes": len(target_lanes),
  "state_counts": {},
  "candidates": {k: sorted(v) for k, v in sorted(cands.items())},
}
from collections import Counter
out["state_counts"] = dict(Counter(b["state"] for b in blocks if b["state"]))
out["lane_state_counts"] = dict(Counter(b["state"] for b in lanes if b["state"]))
json.dump(out, open("data/lane-extract.json","w"), indent=1)
print("blocks:", len(blocks), "lanes:", len(lanes))
print("built-unverified|verified  ALL kinds:", len(targets), " LANES only:", len(target_lanes))
print("lane state counts:", out["lane_state_counts"])
print("distinct candidate branch strings:", len(cands))

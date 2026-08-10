#!/usr/bin/env python3
"""The second parse — independent census of evidence lines in plan.md.

Method (deliberately unlike a block-shape matcher): a single state machine walks
EVERY line of the file exactly once and gives it exactly one verdict. Nothing is
anchored on a header shape; entity context is carried as state, so an evidence
field is found no matter what shape of block holds it — heading block, bullet
row, or no block at all. Total accounting is asserted twice:

  1. sum(all verdict classes) == total lines in file
  2. accepted + rejected == N candidates (every line containing 'evidence:')

Both counts are printed, positives AND negatives, per the sweep rule.
"""
import json
import re
import sys

SRC = "/Users/svendaneel/okam/Web-modules/docs/plan/plan.md"

HEAD2 = re.compile(r"^## (.+)$")
HEAD3 = re.compile(r"^### (\S+) (\S+)(?: — (.*))?$")
FENCE = re.compile(r"^```")
FIELD_EV = re.compile(r"^evidence:\s*(.*)$")
BULLET_ENTITY = re.compile(r"^- \[([A-Za-z])\] (L-[A-Z0-9-]+)\b(.*)$")
INLINE_EV = re.compile(r"· evidence:\s*(\S+)")
ANY_EV = re.compile(r"evidence:")

lines = open(SRC, encoding="utf-8").read().split("\n")
# split('\n') on a file ending in '\n' yields a trailing ''. Track honestly.
trailing_empty = 1 if lines and lines[-1] == "" else 0
if trailing_empty:
    lines = lines[:-1]

in_fence = False
section = "(preamble)"
block = None          # dict(kind, id, header_line) for current ### block
bullet = None         # dict(id, line) for current bullet entity row

verdicts = []         # one per line: (lineno, cls)
accepted = []         # evidence lines: dict with location + owner + value
rejected = []         # candidate lines containing 'evidence:' that are NOT evidence lines
class_counts = {}

for i, raw in enumerate(lines, start=1):
    cls = None
    if FENCE.match(raw):
        in_fence = not in_fence
        cls = "fence-marker"
    elif in_fence:
        cls = "fenced"
    else:
        m2 = HEAD2.match(raw)
        m3 = HEAD3.match(raw)
        if m2:
            section = m2.group(1).strip()
            block = None
            bullet = None
            cls = "section-heading"
        elif m3:
            block = {"kind": m3.group(1), "id": m3.group(2).strip("~"), "line": i}
            bullet = None
            cls = "block-heading"
        else:
            mb = BULLET_ENTITY.match(raw)
            mf = FIELD_EV.match(raw)
            if mf:
                cls = "evidence-field"
                accepted.append({
                    "line": i,
                    "shape": "field",
                    "section": section,
                    "owner_kind": block["kind"] if block else "(none)",
                    "owner_id": block["id"] if block else "(no-block)",
                    "owner_line": block["line"] if block else None,
                    "value": mf.group(1)[:200],
                })
            elif mb and INLINE_EV.search(raw):
                cls = "evidence-inline-bullet"
                accepted.append({
                    "line": i,
                    "shape": "inline-bullet",
                    "section": section,
                    "owner_kind": "Lane(bullet)",
                    "owner_id": mb.group(2),
                    "owner_line": i,
                    "value": INLINE_EV.search(raw).group(1)[:200],
                })
            elif mb:
                bullet = {"id": mb.group(2), "line": i}
                cls = "bullet-entity"
            elif ANY_EV.search(raw):
                cls = "evidence-mention-rejected"
                rejected.append({
                    "line": i,
                    "section": section,
                    "owner_kind": block["kind"] if block else "(none)",
                    "owner_id": block["id"] if block else "(no-block)",
                    "why": ("blockquote" if raw.lstrip().startswith(">")
                            else "numbered-list" if re.match(r"^\d+\.", raw)
                            else "prose"),
                    "text": raw.strip()[:160],
                })
            else:
                cls = "other"
    verdicts.append(cls)
    class_counts[cls] = class_counts.get(cls, 0) + 1

# fenced lines containing 'evidence:' are also candidates that were rejected
for i, raw in enumerate(lines, start=1):
    if verdicts[i - 1] in ("fenced", "fence-marker") and ANY_EV.search(raw):
        rejected.append({"line": i, "section": "?", "owner_kind": "(fence)",
                        "owner_id": "(fence)", "why": "inside-code-fence",
                        "text": raw.strip()[:160]})

# ---- total accounting ----
total = len(lines)
assert sum(class_counts.values()) == total, "line accounting broken"

candidates = sum(1 for raw in lines if ANY_EV.search(raw))
# accepted entries whose line contains 'evidence:' (all of them by construction)
acc_n, rej_n = len(accepted), len(rejected)
print(f"file lines walked : {total} (+{trailing_empty} trailing empty)")
print(f"class counts      : {json.dumps(class_counts, sort_keys=True)}")
print(f"candidates (lines containing 'evidence:') N = {candidates}")
print(f"ACCEPTED as evidence lines  = {acc_n}")
print(f"REJECTED candidates         = {rej_n}")
print(f"assert accepted + rejected == N : {acc_n} + {rej_n} == {candidates} "
      f"-> {acc_n + rej_n == candidates}")
assert acc_n + rej_n == candidates, "candidate accounting broken"

# ---- breakdowns ----
by_kind = {}
by_section = {}
for a in accepted:
    by_kind[a["owner_kind"]] = by_kind.get(a["owner_kind"], 0) + 1
    by_section[a["section"]] = by_section.get(a["section"], 0) + 1
print("\naccepted by owner kind :", json.dumps(by_kind, sort_keys=True))
print("accepted by section    :", json.dumps(by_section, sort_keys=True))

print("\nREJECTED, individually:")
for r in rejected:
    print(f"  line {r['line']:>5}  [{r['why']}] in {r['owner_kind']} "
          f"{r['owner_id']}: {r['text'][:110]}")

out = "/Users/svendaneel/okam/Web-modules/lanes/L-THE-DENOMINATOR-IS-PARSED-A-SECOND-TIME-BY-A-DIFFERENT-HAND/second-parse-census.json"
json.dump({"total_lines": total, "class_counts": class_counts,
           "candidates": candidates, "accepted": accepted, "rejected": rejected},
          open(out, "w"), indent=1)
print(f"\ncensus written: {out}")

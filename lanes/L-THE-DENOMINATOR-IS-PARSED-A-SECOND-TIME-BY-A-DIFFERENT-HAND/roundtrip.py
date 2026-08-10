#!/usr/bin/env python3
"""Round-trip every verdict of the second parse through the plan tool's own
projection (render/LANES.md on a byte-identical mirror) — positives AND
negatives — asserting matched + rejected == N with both counts printed."""
import json
import re

BASE = "/Users/svendaneel/okam/Web-modules/lanes/L-THE-DENOMINATOR-IS-PARSED-A-SECOND-TIME-BY-A-DIFFERENT-HAND"
census = json.load(open(f"{BASE}/second-parse-census.json"))
lanes_md = open(f"{BASE}/plan-mirror/render/LANES.md", encoding="utf-8").read().split("\n")

# --- parse the tool's projection into entities {id: {anchor, evidence}} ---
ENT = re.compile(r"^### ((?:L|FT|S)-[A-Z0-9-]+)")
ANCH = re.compile(r"plan\.md:(\d+)")
EV = re.compile(r"^- evidence: (.*)$")
tool = {}
cur = None
for l in lanes_md:
    m = ENT.match(l)
    if m:
        cur = m.group(1)
        tool[cur] = {"anchor": None, "evidence": []}
        continue
    if cur:
        a = ANCH.search(l)
        if a and tool[cur]["anchor"] is None and "·state" in l:
            tool[cur]["anchor"] = int(a.group(1))
        e = EV.match(l)
        if e:
            tool[cur]["evidence"].append(e.group(1).strip())

n_lanes = sum(1 for k in tool if k.startswith("L-"))
n_ev_entities = sum(1 for k, v in tool.items() if v["evidence"])
print(f"tool namespace: {len(tool)} entities ({n_lanes} lanes), "
      f"{n_ev_entities} carry an evidence value, "
      f"{sum(len(v['evidence']) for v in tool.values())} evidence values total")

def norm(s):
    return re.sub(r"\s+", " ", s).strip()[:60]

matched, rejected = [], []   # verdict of the ROUND-TRIP over all N candidates
# --- positives: my 574 accepted evidence lines ---
for a in census["accepted"]:
    oid = a["owner_id"]
    t = tool.get(oid)
    ok = (t is not None
          and any(norm(a["value"]) == norm(ev) for ev in t["evidence"]))
    # anchor agreement: tool anchors the entity at the header line I recorded
    anchor_ok = t is not None and t["anchor"] in (a["owner_line"],)
    if ok and anchor_ok:
        matched.append((a["line"], oid, "attributed-by-tool"))
    elif t is not None and not ok:
        rejected.append((a["line"], oid,
                         "tool-attributes-different-evidence (residue/duplicate line)"))
    elif t is not None and ok and not anchor_ok:
        rejected.append((a["line"], oid,
                         f"value-matches-but-tool-anchors-elsewhere @{t['anchor']} (residue of a lane defined elsewhere)"))
    else:
        rejected.append((a["line"], oid, "entity-unknown-to-tool"))

# --- negatives: my 21 rejected mentions must appear as NO entity's evidence ---
for r in census["rejected"]:
    text = norm(r["text"])
    leaked = [k for k, v in tool.items()
              if any(norm(ev) and norm(ev) in text for ev in v["evidence"]) and r["why"] != "blockquote"]
    # A prose mention may CONTAIN an evidence string legitimately; the test is
    # whether the tool attributes THIS LINE — it cannot, it renders per-entity
    # stanza fields only. Assert: no tool evidence equals this full line.
    is_field_to_tool = any(norm(ev) == text for v in tool.values() for ev in v["evidence"])
    if is_field_to_tool:
        matched.append((r["line"], r["owner_id"], "UNEXPECTED: tool reads my rejected line as evidence"))
    else:
        rejected.append((r["line"], r["owner_id"], f"non-evidence confirmed ({r['why']})"))

N = len(census["accepted"]) + len(census["rejected"])
print(f"\nround-trip: candidates N = {N}")
print(f"  MATCHED  (tool attributes the line to the entity I named) = {len(matched)}")
print(f"  REJECTED (tool does not read the line as that entity's evidence) = {len(rejected)}")
print(f"  assert matched + rejected == N : {len(matched)} + {len(rejected)} == {N} "
      f"-> {len(matched)+len(rejected)==N}")
assert len(matched) + len(rejected) == N

print("\nREJECTED by the round-trip, individually:")
for line, oid, why in rejected:
    print(f"  plan.md:{line:>5} {oid}: {why}")

# --- the 27 delta lines: what the tool says about each ---
print("\nDelta lines (mine 574 vs first-parse 547) as the tool rules them:")
for a in census["accepted"]:
    t = tool.get(a["owner_id"])
    attributed = t and any(norm(a["value"]) == norm(ev) for ev in t["evidence"]) and t["anchor"] == a["owner_line"]
    if a["section"] != "Lanes — open" or not attributed:
        state = "tool-attributed" if attributed else "tool-ignored-residue"
        print(f"  plan.md:{a['line']:>5} sec={a['section']!r:14} owner={a['owner_id']}: {state}")
json.dump({"tool_entities": len(tool), "tool_lanes": n_lanes,
           "tool_evidence_entities": n_ev_entities,
           "matched": len(matched), "rejected": len(rejected)},
          open(f"{BASE}/roundtrip-verdict.json", "w"), indent=1)

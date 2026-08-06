#!/usr/bin/env python3
"""Match each frontend enum mirror to the backend enum it copies.

Matching is by MEMBER SET, not by name. A name-keyed match produced confident
wrong answers in the fixture sweep. Name equality is reported as a separate
column so a disagreement between the two is visible rather than silently
resolved in favour of the name.
"""
import json

BACK = "/Users/svendaneel/okam/web-vocabsweep/lanes/L-FIXTURE-VOCABULARY-SWEEP/enums-8e2b57de.json"
FRONT = "/Users/svendaneel/okam/Web-modules/lanes/L-ENUM-MIRROR-CENSUS/mirrors.json"

back = json.load(open(BACK))
front = json.load(open(FRONT))

benums = {k: v["members"] for k, v in back["enums"].items()}
bpaths = {k: v["path"] for k, v in back["enums"].items()}

rows = []
for fe in front["enums"]:
    fm = [m["name"] for m in fe["members"]]
    fset = set(fm)
    scored = []
    for bn, bm in benums.items():
        bset = set(bm)
        inter = fset & bset
        if not inter:
            continue
        jac = len(inter) / len(fset | bset)
        scored.append({
            "backend": bn,
            "backend_path": bpaths[bn],
            "jaccard": round(jac, 4),
            "shared": len(inter),
            "backend_size": len(bset),
            "missing_from_mirror": sorted(bset - fset),
            "extra_in_mirror": sorted(fset - bset),
            "name_equal": bn == fe["enum"],
        })
    scored.sort(key=lambda r: (-r["jaccard"], -r["shared"]))
    rows.append({
        "mirror": fe["enum"],
        "path": fe["path"],
        "mirror_size": len(fm),
        "mirror_members": fm,
        "candidates": scored[:4],
    })

print(json.dumps({"rows": rows}, indent=1))

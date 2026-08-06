#!/usr/bin/env python3
"""Match each core (frontend) enum to a backend enum: by name first, then by member set."""
import json
import sys

D = "/Users/svendaneel/okam/Web-modules/lanes/L-MIRROR-HOLDS-ONLY-REAL-MEMBERS"
be = json.load(open(f"{D}/be.json"))
fe = json.load(open(f"{D}/fe-core.json"))

by_name = {e["name"]: e for e in be}
by_set = {}
for e in be:
    by_set.setdefault(frozenset(m["name"] for m in e["members"]), []).append(e)

rows = []
for f in sorted(fe, key=lambda x: x["name"]):
    fset = frozenset(m["name"] for m in f["members"])
    match, how = None, None
    if f["name"] in by_name:
        match, how = by_name[f["name"]], "name"
    else:
        cands = by_set.get(fset, [])
        if len(cands) == 1:
            match, how = cands[0], "set(unique)"
        elif len(cands) > 1:
            match, how = cands[0], f"set(TIE x{len(cands)}: {','.join(c['name'] for c in cands)})"
        else:
            # best overlap
            best, score = None, 0
            for e in be:
                bset = frozenset(m["name"] for m in e["members"])
                if not bset:
                    continue
                s = len(fset & bset) / len(fset | bset)
                if s > score:
                    best, score = e, s
            if score >= 0.5:
                match, how = best, f"overlap {score:.2f}"
            else:
                how = f"NO MATCH (best {best['name'] if best else '-'} {score:.2f})"
    bset = frozenset(m["name"] for m in match["members"]) if match else frozenset()
    rows.append(
        {
            "fe": f["name"],
            "fe_path": f["path"],
            "fe_count": len(f["members"]),
            "be": match["name"] if match else None,
            "be_path": match["path"] if match else None,
            "be_count": len(match["members"]) if match else 0,
            "how": how,
            "short": sorted(bset - fset),   # backend has, frontend lacks
            "extra": sorted(fset - bset),   # frontend has, backend cannot send
        }
    )

json.dump(rows, open(f"{D}/rows.json", "w"), indent=1)
for r in rows:
    flag = ""
    if r["extra"]:
        flag += " EXTRA=" + ",".join(r["extra"])
    if r["short"]:
        flag += " SHORT=" + ",".join(r["short"])
    print(f"{r['fe']:<32} -> {str(r['be']):<32} [{r['how']}] {r['fe_count']}/{r['be_count']}{flag}")
print()
print("mirrors:", sum(1 for r in rows if r["be"]), "of", len(rows))
print("with extras:", sum(1 for r in rows if r["extra"]))
print("with shorts:", sum(1 for r in rows if r["short"]))

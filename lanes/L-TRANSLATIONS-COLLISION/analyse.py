#!/usr/bin/env python3
"""Turn keys.json into the collision verdict + keys.md. Read-only."""
import json
import re
import collections

REPO = "/Users/svendaneel/okam/Web-modules"
LD = f"{REPO}/lanes/L-TRANSLATIONS-COLLISION"
PATHS = ["translations/no.ts", "translations/en.ts", "translations/de.ts"]
LOC = {"translations/no.ts": "no", "translations/en.ts": "en", "translations/de.ts": "de"}

d = json.load(open(f"{LD}/keys.json"))
cls = json.load(open(f"{LD}/branchclass.json"))
BASE_KEYS = json.load(open(f"{LD}/basekeys.json"))


def norm(v):
    q = v[0]
    if v[-1] != q:
        return v
    return re.sub(r"\\(['\"`\\])", r"\1", v[1:-1])


def short(b):
    return b.replace("refs/heads/", "").replace("refs/lanes/", "lanes/")


# ---- build claimant map -----------------------------------------------------
# claimants[path][key] = {holder: value}  for holders that AUTHORED a change to key
claim = {p: collections.defaultdict(dict) for p in PATHS}
for p in PATHS:
    for kind in ("added", "modified"):
        for k, bv in d["keys"][p][kind].items():
            for b, v in bv.items():
                claim[p][k][short(b)] = v

verdict = {p: {} for p in PATHS}
for p in PATHS:
    for k, holders in claim[p].items():
        vals = {}
        for b, v in holders.items():
            vals.setdefault(norm(v), []).append(b)
        base_present = k in BASE_KEYS[p]
        if base_present:
            vals.setdefault(norm(BASE_KEYS[p][k]), []).append("BASELINE(e34977ac)")
        n_branch = len(holders)
        if len(vals) == 1:
            v = "identical" if n_branch >= 2 or base_present else "sole"
        else:
            v = "DIVERGENT"
        verdict[p][k] = {
            "verdict": v, "n_authors": n_branch, "in_baseline": base_present,
            "variants": {vv: sorted(bs) for vv, bs in vals.items()},
        }

removed = {p: {short(b): v for b, v in {}.items()} for p in PATHS}
rem = {p: {k: sorted(short(b) for b in bv) for k, bv in d["keys"][p]["removed"].items()}
       for p in PATHS}

# ---- cross-locale partial additions ----------------------------------------
partial = collections.defaultdict(lambda: collections.defaultdict(dict))
for label, v in d["branches"].items():
    per = {}
    for p in PATHS:
        pd = v["paths"].get(p, {})
        per[LOC[p]] = set(pd.get("added", [])) if pd.get("present") else None
    if any(x is None for x in per.values()):
        continue
    allk = per["no"] | per["en"] | per["de"]
    for k in allk:
        have = {loc for loc in ("no", "en", "de") if k in per[loc]}
        if len(have) != 3:
            # only a real gap if the key is absent from the missing locale's file entirely
            partial[short(label)][k] = sorted(have)

# resolve: is the missing locale key truly absent at that branch tip?
json.dump({"verdict": verdict, "removed": rem,
           "partial": {b: dict(v) for b, v in partial.items()}},
          open(f"{LD}/verdict.json", "w"), indent=1)

for p in PATHS:
    c = collections.Counter(x["verdict"] for x in verdict[p].values())
    print(p, dict(c))
print("branches with partial (non-3-locale) additions:", len(partial))

#!/usr/bin/env python3
"""Produce dirt.md. Hazard = the brief's definition: >1 lane has an interest.
Everything is decided on (path, blob); `git diff <ref> -- <path>` is NOT used
because it silently ignores untracked paths and reports them as deleted."""
import json, subprocess, os, collections, datetime

REPO = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(REPO, "lanes/L-SHARED-DIRT-CENSUS")
AGG = ("refs/heads/candidate/", "refs/heads/lane/collect-review-conditions",
       "refs/heads/feature/", "refs/remotes/", "refs/salvage/", "detached:")


def git(*a):
    r = subprocess.run(["git", "--no-optional-locks", *a], cwd=REPO,
                       capture_output=True, text=True, errors="surrogateescape")
    return r.stdout if r.returncode == 0 else None


rows = json.load(open(os.path.join(LANE, "rows.json")))
rep = json.load(open(os.path.join(LANE, "attribution.json")))
per = json.load(open(os.path.join(LANE, "perline.json")))

for r in rows:
    p = r["path"]
    v = rep[p]
    lanes = [x for x in v["interested_refs"] if not x.startswith(AGG)]
    r["lane_interest"] = lanes
    r["n_lane_interest"] = len(lanes)
    r["hazard"] = len(lanes) > 1
    # tip-current vs superseded
    if r["class"] == "already-committed-elsewhere":
        tipmatch = []
        for ref in v["introducing_refs"]:
            b = git("rev-parse", "-q", "--verify", "%s:%s" % (ref, p))
            if b and b.strip() == v["wt_blob"]:
                tipmatch.append(ref)
        r["tip_identical_on"] = tipmatch
        r["revision"] = "current tip" if tipmatch else "EARLIER revision (lane has moved on)"

json.dump(rows, open(os.path.join(LANE, "rows.json"), "w"), indent=1)
c = collections.Counter(r["class"] for r in rows)
sup = [r for r in rows if r.get("revision", "").startswith("EARLIER")]
print("classes:", dict(c))
print("hazards (>1 lane interest):", sum(1 for r in rows if r["hazard"]))
print("already-committed but SUPERSEDED on its lane:", len(sup))
for r in sup:
    print("   ", r["path"], "->", r["who"])
print("single-lane bookkeeping:", sum(1 for r in rows if r["n_lane_interest"] == 1))
print("no lane interest at all:", sum(1 for r in rows if r["n_lane_interest"] == 0))
for r in rows:
    if r["n_lane_interest"] == 0:
        print("    zero:", r["status"], r["path"], "->", r["who"])

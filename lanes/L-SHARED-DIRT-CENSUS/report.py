#!/usr/bin/env python3
"""Final pass: rival-content detection + the classified table for dirt.md."""
import json, subprocess, os, collections

REPO = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(REPO, "lanes/L-SHARED-DIRT-CENSUS")
AGG = ("refs/heads/candidate/", "refs/heads/lane/collect-review-conditions",
       "refs/heads/feature/", "refs/remotes/", "refs/salvage/", "detached:")


def git(*a):
    r = subprocess.run(["git", "--no-optional-locks", *a], cwd=REPO,
                       capture_output=True, text=True, errors="surrogateescape")
    return r.stdout if r.returncode == 0 else None


rep = json.load(open(os.path.join(LANE, "attribution.json")))
per = json.load(open(os.path.join(LANE, "perline.json")))
BASE = git("rev-parse", "HEAD").strip()

# lane-dir attribution for paths that exist in no commit at all
LANEDIR = {
    "components/admin/workforce/WorkforceDeliveryGroup.vue": "L-WF-FAILURES-SURFACE",
    "components/admin/workforce/WorkforceDeliveryPanel.vue": "L-WF-FAILURES-SURFACE",
    "pages/admin/workforce-delivery.vue": "L-WF-FAILURES-SURFACE",
    "test/e2e/fixture/workforce-delivery.js": "L-WF-FAILURES-SURFACE",
    "test/e2e/journeys/workforce-delivery-failures.spec.js": "L-WF-FAILURES-SURFACE",
    "test/workforce-delivery-failures.test.js": "L-WF-FAILURES-SURFACE",
    "utils/workforce/delivery-failures.js": "L-WF-FAILURES-SURFACE",
    "test/e2e/fixture/workforce-punch.js": "L-WF-PUNCH-UI",
    "test/e2e/journeys/workforce-pos-punch.spec.js": "L-WF-PUNCH-UI",
    "test/workforce-pos-clock.test.js": "L-WF-PUNCH-UI",
    "utils/workforce/pos-clock-state.js": "L-WF-PUNCH-UI",
    "utils/workforce/pos-clock-client.js": "L-WF-PUNCH-UI",
    "components/admin/pos/ClockScreen.vue": "L-WF-PUNCH-UI",
    "scripts/worldstamp": "L-GUARD-W0",
    "world.config": "L-GUARD-W0",
    "scripts/drift-demo/demo.sh": "L-GUARD-DEMO",
}

rows = []
for p, v in sorted(rep.items()):
    head_blob = git("rev-parse", "-q", "--verify", "HEAD:%s" % p)
    head_blob = head_blob.strip() if head_blob else None

    # rival content: distinct tip blobs among non-aggregator interested refs
    tips = {}
    for r in v["interested_refs"]:
        if r.startswith(AGG):
            continue
        b = git("rev-parse", "-q", "--verify", "%s:%s" % (r, p))
        if b:
            tips[r] = b.strip()
    distinct = collections.defaultdict(list)
    for r, b in tips.items():
        if b != head_blob:
            distinct[b].append(r)

    # per-line owner groups (only for mixed modifications)
    pl = per.get(p)
    owners = set()
    if pl:
        for g in pl["owner_groups"]:
            for r in g["refs"]:
                if not r.startswith(AGG) and r != "(aggregator-only)":
                    owners.add(r)

    if v["class"] == "already-committed-elsewhere":
        cls = "already-committed-elsewhere"
        who = v["introducing_refs"]
    else:
        if pl and owners:
            cls = "live-lane-work"
            who = sorted(owners) + (["+%d orphan lines" % pl["orphan_lines"]]
                                    if pl["orphan_lines"] else [])
        elif p in LANEDIR:
            cls = "live-lane-work"
            who = ["lanes/%s (lane dir; NO branch)" % LANEDIR[p]]
        elif v["interested_refs"]:
            cls = "live-lane-work"
            who = [r for r in v["interested_refs"] if not r.startswith(AGG)] or \
                  v["interested_refs"]
        else:
            cls = "unattributed"
            who = []

    rows.append({
        "path": p, "status": v["status"], "class": cls, "who": who,
        "rival_variants": len(distinct),
        "rival_refs": {b[:8]: rs for b, rs in distinct.items()},
        "hazard": len(distinct) > 1 or len(owners) > 1,
        "blob_commit": v.get("blob_commit"),
        "n_revisions_seen": v["n_revisions_seen"],
        "orphan_lines": pl["orphan_lines"] if pl else None,
        "added_lines": v.get("added_lines"),
    })

json.dump(rows, open(os.path.join(LANE, "rows.json"), "w"), indent=1)
c = collections.Counter(r["class"] for r in rows)
print("classes:", dict(c))
print("hazards:", sum(1 for r in rows if r["hazard"]))
for r in rows:
    if r["hazard"]:
        print("  HZ %-58s variants=%d owners=%s" % (r["path"], r["rival_variants"],
                                                    r["who"][:4]))
print("\nunattributed:")
for r in rows:
    if r["class"] == "unattributed":
        print("  ", r["status"], r["path"])

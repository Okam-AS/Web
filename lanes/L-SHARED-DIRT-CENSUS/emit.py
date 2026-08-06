#!/usr/bin/env python3
"""Emit the classified table for dirt.md."""
import json, subprocess, os, collections

REPO = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(REPO, "lanes/L-SHARED-DIRT-CENSUS")
AGG = ("refs/heads/candidate/", "refs/heads/lane/collect-review-conditions",
       "refs/heads/feature/", "refs/remotes/", "refs/salvage/", "detached:")


def git(*a):
    r = subprocess.run(["git", "--no-optional-locks", *a], cwd=REPO,
                       capture_output=True, text=True, errors="surrogateescape")
    return r.stdout if r.returncode == 0 else None


def short(r):
    if r.startswith("refs/lanes/"):
        return r[len("refs/lanes/"):]
    if r.startswith("refs/heads/lane/"):
        return "lane/" + r[len("refs/heads/lane/"):]
    if r.startswith("refs/heads/"):
        return r[len("refs/heads/"):]
    return r


rows = json.load(open(os.path.join(LANE, "rows.json")))
rep = json.load(open(os.path.join(LANE, "attribution.json")))

# per-path: which lanes have advanced past the working blob (superseded-by)
for r in rows:
    p, v = r["path"], rep[r["path"]]
    ahead, rival = [], []
    if r["class"] == "already-committed-elsewhere":
        c = v["blob_commit"]
        for ref in r["lane_interest"]:
            b = git("rev-parse", "-q", "--verify", "%s:%s" % (ref, p))
            b = b.strip() if b else None
            if b == v["wt_blob"]:
                continue
            anc = subprocess.run(["git", "merge-base", "--is-ancestor", c, ref],
                                 cwd=REPO, capture_output=True).returncode == 0
            (ahead if anc else rival).append(ref)
    r["superseded_by"] = ahead
    r["rival_lanes"] = rival

json.dump(rows, open(os.path.join(LANE, "rows.json"), "w"), indent=1)

# The four force-added journey artifacts carry no lane's commit: they are the
# collateral of L-WF-ROLES-UI's regression re-run (ports 3028/4028, recorded at
# lanes/L-WF-ROLES-UI/NOTES.md:131 and :113; the artifact's own startedAtUtc is
# 2026-08-04T20:53Z on baseUrl 127.0.0.1:3028). Its branch did not commit them.
OVERRIDE = {p: ["refs/heads/lane/wf-roles-ui (re-ran the journey; did NOT commit the rewrite)"]
            for p in (
    "artifacts/journeys/workforce-invitation-onboarding.playwright.json",
    "artifacts/journeys/workforce-invitation-onboarding/fixture/01-the-roster-before-an-invitation.png",
    "artifacts/journeys/workforce-invitation-onboarding/fixture/02-the-invitation-code-shown-once.png",
    "artifacts/journeys/workforce-invitation-onboarding/fixture/07-the-roster-after-the-claim.png")}
for r in rows:
    if r["path"] in OVERRIDE:
        r["who"] = OVERRIDE[r["path"]]
json.dump(rows, open(os.path.join(LANE, "rows.json"), "w"), indent=1)

out = []
out.append("| path | st | class | lane branch | other lanes with an interest |")
out.append("|---|---|---|---|---|")
for r in sorted(rows, key=lambda x: (x["class"] != "already-committed-elsewhere", x["path"])):
    who = ", ".join("`%s`" % short(w) if w.startswith("refs/") else w for w in r["who"])
    others = [x for x in r["lane_interest"] if x not in r["who"]]
    o = ", ".join("`%s`" % short(x) for x in others) or "—"
    if r["superseded_by"]:
        o += " **(moved on: %s)**" % ", ".join(short(x) for x in r["superseded_by"])
    cls = {"already-committed-elsewhere": "committed-elsewhere",
           "live-lane-work": "live-lane-work"}[r["class"]]
    hz = " ⚠" if r["hazard"] else ""
    out.append("| `%s` | `%s` | %s%s | %s | %s |" % (r["path"], r["status"], cls, hz, who, o))
open(os.path.join(LANE, "table.md"), "w").write("\n".join(out) + "\n")

print("rows:", len(rows))
print("supersedes:", sum(1 for r in rows if r["superseded_by"]))
print("rivals:", sum(1 for r in rows if r["rival_lanes"]))
sup = [(r["path"], [short(x) for x in r["superseded_by"]]) for r in rows if r["superseded_by"]]
for p, s in sup[:40]:
    print("   ", p, "->", s)

#!/usr/bin/env python3
"""Second pass: (a) name the INTRODUCING ref for each exact blob match, and
(b) attribute the added lines of every non-matching modification to a lane by
content coverage, not by name."""
import json, subprocess, os, collections

REPO = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(REPO, "lanes/L-SHARED-DIRT-CENSUS")


def git(*a, ok=False):
    r = subprocess.run(["git", "--no-optional-locks", *a], cwd=REPO,
                       capture_output=True, text=True, errors="surrogateescape")
    if r.returncode and not ok:
        return ""
    return r.stdout


d = json.load(open(os.path.join(LANE, "census.json")))
P = d["paths"]
BASE = d["baseline"]

# ---- ref alias collapse: refs/lanes/L-X and refs/heads/lane/x at the same oid
oid_of = {}
for line in git("for-each-ref", "--format=%(objectname) %(refname)",
                "refs/heads", "refs/lanes", "refs/salvage", "refs/remotes").splitlines():
    o, r = line.split()
    oid_of[r] = o


def collapse(refs):
    """group refs by oid; prefer the refs/lanes/ name when both exist"""
    g = collections.defaultdict(list)
    for r in refs:
        g[oid_of.get(r, r)].append(r)
    out = []
    for o, rs in g.items():
        lanes = [r for r in rs if r.startswith("refs/lanes/")]
        out.append(lanes[0] if lanes else sorted(rs)[0])
    return sorted(out)


# ---- introducing ref: among refs containing C, the one where C is nearest the tip
dist_cache = {}


def introducing(commit, refs):
    best, bd = [], None
    for r in refs:
        k = (commit, r)
        if k not in dist_cache:
            o = git("rev-list", "--count", "%s..%s" % (commit, r))
            dist_cache[k] = int(o.strip() or 10 ** 9)
        dd = dist_cache[k]
        if bd is None or dd < bd:
            best, bd = [r], dd
        elif dd == bd:
            best.append(r)
    return collapse(best), bd


# ---- added-line coverage attribution for non-matching modifications
def added_lines(path):
    o = git("diff", "--no-color", "-U0", "--", path)
    out = []
    for ln in o.split("\n"):
        if ln.startswith("+") and not ln.startswith("+++"):
            s = ln[1:].strip()
            if len(s) > 3:
                out.append(s)
    return out


def coverage(ref, path, lines):
    body = git("show", "%s:%s" % (ref, path), ok=True)
    if not body:
        return None
    have = set(x.strip() for x in body.split("\n"))
    hit = sum(1 for l in lines if l in have)
    return hit, len(lines)


report = {}
for p, v in sorted(P.items()):
    rec = {"status": v["status"], "wt_blob": v["wt_blob"]}
    if v["exact_match_commits"]:
        c = v["exact_match_commits"][0]
        refs, dd = introducing(c, v["exact_match_refs"])
        rec["class"] = "already-committed-elsewhere"
        rec["blob_commit"] = c
        rec["introducing_refs"] = refs
        rec["commits_ahead_of_that_commit_on_that_ref"] = dd
        rec["all_containing_refs"] = collapse(v["exact_match_refs"])
    else:
        rec["class"] = "PENDING"
    rec["interested_refs"] = collapse(v["interested_refs"])
    rec["n_revisions_seen"] = v["n_revisions_seen"]
    report[p] = rec

# attribution pass for the PENDING ones
for p, rec in report.items():
    if rec["class"] != "PENDING":
        continue
    if rec["status"] == "??":
        rec["added_line_coverage"] = []
        continue
    lines = added_lines(p)
    rec["added_lines"] = len(lines)
    cov = []
    for r in rec["interested_refs"]:
        c = coverage(r, p, lines)
        if c and lines:
            cov.append({"ref": r, "hit": c[0], "of": c[1],
                        "pct": round(100.0 * c[0] / c[1], 1)})
    cov.sort(key=lambda x: -x["pct"])
    rec["added_line_coverage"] = cov[:8]

json.dump(report, open(os.path.join(LANE, "attribution.json"), "w"), indent=1)
print("wrote attribution.json")
for p, rec in sorted(report.items()):
    if rec["class"] == "PENDING":
        cov = rec.get("added_line_coverage", [])
        top = cov[0] if cov else None
        print("%s %-62s adds=%s top=%s" % (
            rec["status"], p, rec.get("added_lines", "-"),
            ("%s %s%%" % (top["ref"], top["pct"])) if top else "none"))

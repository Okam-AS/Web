#!/usr/bin/env python3
"""Third pass: for every modified path whose content matches no commit, attribute
each ADDED line to the set of refs whose own version of that path contains it.
Lines nobody has are genuinely uncommitted new work; a path whose added lines
split across >1 lane is a merge hazard."""
import json, subprocess, os, collections

REPO = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(REPO, "lanes/L-SHARED-DIRT-CENSUS")


def git(*a):
    r = subprocess.run(["git", "--no-optional-locks", *a], cwd=REPO,
                       capture_output=True, text=True, errors="surrogateescape")
    return r.stdout if r.returncode == 0 else ""


rep = json.load(open(os.path.join(LANE, "attribution.json")))
CAND = [p for p, v in rep.items()
        if v["class"] == "PENDING" and v["status"] == " M"
        and v.get("added_lines", 0) > 0]

# aggregator branches merge many lanes; report them separately so they do not
# drown out the lane that actually authored a line.
AGG = ("refs/heads/candidate/", "refs/heads/lane/collect-review-conditions",
       "refs/heads/feature/", "refs/remotes/")

out = {}
for p in sorted(CAND):
    diff = git("diff", "--no-color", "-U0", "--", p)
    adds = [l[1:].strip() for l in diff.split("\n")
            if l.startswith("+") and not l.startswith("+++") and len(l[1:].strip()) > 3]
    if not adds:
        continue
    refs = rep[p]["interested_refs"]
    have = {}
    for r in refs:
        body = git("show", "%s:%s" % (r, p))
        have[r] = set(x.strip() for x in body.split("\n")) if body else set()
    owners = collections.Counter()
    orphan = 0
    examples = collections.defaultdict(list)
    for l in adds:
        holders = tuple(sorted(r for r in refs if l in have[r] and not r.startswith(AGG)))
        if not holders:
            # fall back: aggregator-only lines still tell us the work is committed
            agg = tuple(sorted(r for r in refs if l in have[r]))
            if agg:
                owners[("(aggregator-only)",) + agg] += 1
            else:
                orphan += 1
                if len(examples["orphan"]) < 3:
                    examples["orphan"].append(l[:90])
            continue
        owners[holders] += 1
        if len(examples[holders]) < 2:
            examples[holders].append(l[:90])
    out[p] = {
        "added": len(adds),
        "orphan_lines": orphan,
        "owner_groups": [
            {"refs": list(k), "lines": v, "example": examples[k][:1]}
            for k, v in owners.most_common(10)],
        "orphan_examples": examples.get("orphan", []),
    }
    print("=" * 90)
    print("%s  (%d added lines, %d belong to no ref)" % (p, len(adds), orphan))
    for k, v in owners.most_common(8):
        print("   %4d  %s" % (v, " + ".join(x.rsplit('/', 1)[-1] for x in k)))
    for e in examples.get("orphan", []):
        print("   orphan e.g. %s" % e)

json.dump(out, open(os.path.join(LANE, "perline.json"), "w"), indent=1)

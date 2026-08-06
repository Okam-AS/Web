#!/usr/bin/env python3
"""Read-only census of uncommitted paths in the shared Web-modules checkout.

Runs ONLY plumbing/read commands. Never writes to the repo index or working tree.
Key is (path, blob), never path alone. Both refs/heads and refs/lanes are enumerated,
plus refs/salvage, refs/remotes, and every detached worktree HEAD.
"""
import json, subprocess, sys, os, collections

REPO = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(REPO, "lanes/L-SHARED-DIRT-CENSUS")


def git(*args, ok_fail=False):
    r = subprocess.run(["git", "--no-optional-locks", *args], cwd=REPO,
                       capture_output=True, text=True)
    if r.returncode != 0 and not ok_fail:
        raise SystemExit("git %s failed: %s" % (" ".join(args), r.stderr[:400]))
    return r.stdout


def git_b(*args):
    r = subprocess.run(["git", "--no-optional-locks", *args], cwd=REPO, capture_output=True)
    return r.stdout


# ---------------------------------------------------------------- roots
BASELINE = git("rev-parse", "HEAD").strip()

roots = {}   # commit-ish -> label
for ns in ("refs/heads", "refs/lanes", "refs/salvage", "refs/remotes"):
    for line in git("for-each-ref", "--format=%(refname) %(objectname)", ns).splitlines():
        rn, oid = line.split()
        roots[rn] = rn

# detached worktree HEADs
wt_head, wt_path, wt_det = None, None, False
detached = {}
for line in git("worktree", "list", "--porcelain").splitlines():
    if line.startswith("worktree "):
        wt_path = line.split(" ", 1)[1]
    elif line.startswith("HEAD "):
        wt_head = line.split()[1]
    elif line.startswith("detached"):
        detached[wt_head] = wt_path
known = set(git("for-each-ref", "--format=%(objectname)",
                "refs/heads", "refs/lanes", "refs/salvage", "refs/remotes").split())
extra_roots = {h: "detached:%s" % os.path.basename(p) for h, p in detached.items() if h not in known}
for h, lbl in extra_roots.items():
    roots[h] = lbl

ROOTLIST = list(roots.keys())

# ---------------------------------------------------------------- in-scope paths
raw = open(os.path.join(LANE, "status.z"), "rb").read().split(b"\0")
entries, i = [], 0
while i < len(raw):
    rec = raw[i]
    if not rec:
        i += 1
        continue
    xy, path = rec[:2].decode(), rec[3:].decode("utf-8", "surrogateescape")
    if "R" in xy or "C" in xy:
        i += 1
    entries.append((xy, path))
    i += 1

IN_SCOPE = [(xy, p) for xy, p in entries
            if not p.startswith("lanes/") and not p.startswith("docs/plan/")]
paths = [p for _, p in IN_SCOPE]
status_of = dict((p, xy) for xy, p in IN_SCOPE)
print("baseline HEAD:", BASELINE)
print("roots:", len(ROOTLIST), "(refs + %d uncovered detached worktree HEADs)" % len(extra_roots))
print("in-scope paths:", len(paths))

# ---------------------------------------------------------------- working blobs
wt_blob = {}
for p in paths:
    fp = os.path.join(REPO, p)
    if os.path.islink(fp) or not os.path.exists(fp):
        wt_blob[p] = None
        continue
    wt_blob[p] = git("hash-object", "--", p).strip()

# ---------------------------------------------------------------- history sweep
# ONE log PER PATH over every root. --name-only omits merge commits entirely, so a
# batched --name-only sweep silently loses every blob a merge resolution introduced;
# `git log --full-history -- <path>` lists merges too. --full-history is required:
# default simplification hid 20 of the 28 commits touching utils/price.js.
commit_paths = collections.defaultdict(set)   # commit -> set(path)
for p in paths:
    out = git("log", "--full-history", "--format=%H", *ROOTLIST, "--", p)
    for c in out.split():
        commit_paths[c].add(p)
print("commits touching in-scope paths:", len(commit_paths))

# ---------------------------------------------------------------- blob lookup
pairs = []
for c, ps in commit_paths.items():
    for p in ps:
        if p in status_of:
            pairs.append((c, p))
print("(commit,path) pairs to resolve:", len(pairs))

inp = "".join("%s:%s\n" % (c, p) for c, p in pairs)
r = subprocess.run(["git", "--no-optional-locks", "cat-file", "--batch-check"],
                   cwd=REPO, input=inp, capture_output=True, text=True)
blob_at = {}
for (c, p), line in zip(pairs, r.stdout.splitlines()):
    tok = line.split()
    if len(tok) >= 2 and tok[1] == "blob":
        blob_at[(c, p)] = tok[0]

# path -> blob -> [commits]
by_path = collections.defaultdict(lambda: collections.defaultdict(list))
for (c, p), b in blob_at.items():
    by_path[p][b].append(c)

# ---------------------------------------------------------------- ref containment
# For every commit that carries a matching blob we need the refs that contain it.
match_commits = set()
for p in paths:
    h = wt_blob.get(p)
    if h and h in by_path.get(p, {}):
        match_commits.update(by_path[p][h])

contains = {}
for c in sorted(match_commits):
    o = git("for-each-ref", "--format=%(refname)", "--contains", c,
            "refs/heads", "refs/lanes", "refs/salvage", "refs/remotes")
    refs = o.split()
    for h, lbl in extra_roots.items():
        rr = subprocess.run(["git", "merge-base", "--is-ancestor", c, h], cwd=REPO,
                            capture_output=True)
        if rr.returncode == 0:
            refs.append(lbl)
    contains[c] = refs

# ---------------------------------------------------------------- lane interest
# a root "claims" path P when it has a commit touching P that is NOT reachable from
# the checkout baseline.
base_commits = set(git("rev-list", BASELINE).split())
claims = collections.defaultdict(set)   # path -> set(root label)
for c, ps in commit_paths.items():
    if c in base_commits:
        continue
    for p in ps:
        if p in status_of:
            claims[p].add(c)

# resolve which roots contain each claiming commit (cache)
ccache = {}


def refs_containing(c):
    if c in ccache:
        return ccache[c]
    o = git("for-each-ref", "--format=%(refname)", "--contains", c,
            "refs/heads", "refs/lanes", "refs/salvage", "refs/remotes")
    refs = set(o.split())
    for h, lbl in extra_roots.items():
        rr = subprocess.run(["git", "merge-base", "--is-ancestor", c, h], cwd=REPO,
                            capture_output=True)
        if rr.returncode == 0:
            refs.add(lbl)
    ccache[c] = refs
    return refs


path_roots = {}
for p, cs in claims.items():
    s = set()
    for c in cs:
        s |= refs_containing(c)
    path_roots[p] = sorted(s)

result = {
    "baseline": BASELINE,
    "roots": len(ROOTLIST),
    "extra_roots": extra_roots,
    "paths": {},
}
for xy, p in IN_SCOPE:
    h = wt_blob.get(p)
    mc = by_path.get(p, {}).get(h, []) if h else []
    result["paths"][p] = {
        "status": xy,
        "wt_blob": h,
        "exact_match_commits": sorted(mc),
        "exact_match_refs": sorted(set(sum((contains.get(c, []) for c in mc), []))),
        "interested_refs": path_roots.get(p, []),
        "n_revisions_seen": len(by_path.get(p, {})),
    }

json.dump(result, open(os.path.join(LANE, "census.json"), "w"), indent=1)
print("wrote census.json")

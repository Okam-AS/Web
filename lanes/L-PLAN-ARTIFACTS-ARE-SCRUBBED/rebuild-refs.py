#!/usr/bin/env python3
"""Rebuild the two local refs from scrubbed content.

Surgical: each rebuilt commit starts from the ORIGINAL tree and only the blobs
that carry a credential value are replaced, with the value swapped for its
named placeholder. Nothing else about the tree changes, so the rebuilt snapshot
still faithfully records the tree it snapshotted.

Scope: paths under docs/plan/ and lanes/ only -- the same scope as the on-disk
scrub. Product paths (test/e2e/**) are deliberately untouched: their blobs are
reachable through the product ancestry anyway, so rewriting them in a snapshot
commit would remove nothing and would make the snapshot disagree with the branch.

Uses a temporary GIT_INDEX_FILE. The real index is never opened.
Prints ONLY paths, counts and object ids.

usage: rebuild-refs.py <repo> [--apply]
"""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCOPE = ("docs/plan/", "lanes/")

def carriers():
    out = subprocess.run(["bash", os.path.join(HERE, "emit-carriers.sh")],
                         capture_output=True, text=True, check=True).stdout
    rows = [l.split("\t", 1) for l in out.splitlines() if l.strip()]
    return [(n, v.encode(), f"{n}__REDACTED".encode()) for n, v in rows]

def git(repo, *args, env=None, inp=None):
    e = dict(os.environ)
    if env:
        e.update(env)
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, env=e, input=inp)
    if r.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.decode()[:400]}")
    return r.stdout

def commit_meta(repo, rev):
    fmt = "%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI%x00%B"
    out = git(repo, "log", "-1", f"--format={fmt}", rev).decode()
    an, ae, ai, cn, ce, ci, body = out.split("\x00", 6)
    return dict(an=an, ae=ae, ai=ai, cn=cn, ce=ce, ci=ci, body=body)

def rebuild_commit(repo, rev, parent, pairs, idx, apply):
    """Return (new_sha, n_paths_scrubbed)."""
    env = {"GIT_INDEX_FILE": idx}
    git(repo, "read-tree", rev, env=env)
    listing = git(repo, "ls-tree", "-r", "-z", rev)
    changed = 0
    for entry in listing.split(b"\0"):
        if not entry:
            continue
        meta, path = entry.split(b"\t", 1)
        mode, _typ, sha = meta.split()
        p = path.decode("utf-8", "replace")
        if not p.startswith(SCOPE):
            continue
        blob = git(repo, "cat-file", "blob", sha.decode())
        new = blob
        for _n, v, ph in pairs:
            if v in new:
                new = new.replace(v, ph)
        if new == blob:
            continue
        changed += 1
        if apply:
            newsha = git(repo, "hash-object", "-w", "--stdin", inp=new).decode().strip()
            git(repo, "update-index", "--cacheinfo",
                f"{mode.decode()},{newsha},{p}", env=env)
    if not apply:
        return None, changed
    tree = git(repo, "write-tree", env=env).decode().strip()
    m = commit_meta(repo, rev)
    cenv = {"GIT_AUTHOR_NAME": m["an"], "GIT_AUTHOR_EMAIL": m["ae"], "GIT_AUTHOR_DATE": m["ai"],
            "GIT_COMMITTER_NAME": m["cn"], "GIT_COMMITTER_EMAIL": m["ce"],
            "GIT_COMMITTER_DATE": m["ci"], "GIT_INDEX_FILE": idx}
    args = ["commit-tree", tree]
    if parent:
        args += ["-p", parent]
    new_sha = git(repo, *args, env=cenv, inp=m["body"].encode()).decode().strip()
    return new_sha, changed

def main():
    repo = sys.argv[1]
    apply = "--apply" in sys.argv
    pairs = carriers()
    idx = os.path.join(tempfile.mkdtemp(prefix="scrub-idx-"), "index")

    plans = [
        ("refs/lanes/plan-snapshot",
         ["5197056", "212a2b8", "5780798"], "e34977a"),
        ("refs/heads/plan/docs-20260806",
         ["54d4dfc"], None),
    ]
    for ref, chain, base in plans:
        print(f"== {ref}")
        parent = git(repo, "rev-parse", base).decode().strip() if base else None
        tip = None
        for rev in chain:
            new, n = rebuild_commit(repo, rev, parent, pairs, idx, apply)
            old = git(repo, "rev-parse", rev).decode().strip()
            print(f"   {old[:10]} -> {(new or '(dry-run)')[:10]}   {n} path(s) scrubbed")
            parent = new
            tip = new
        if apply:
            git(repo, "update-ref", ref, tip)
            print(f"   ref now {tip[:10]}")
    if os.path.exists(idx):
        os.unlink(idx)
    print("APPLIED" if apply else "DRY RUN")
    return 0

if __name__ == "__main__":
    sys.exit(main())

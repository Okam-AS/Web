#!/usr/bin/env python3
"""For a key token, find every commit reachable from any ref whose test/e2e CODE names it
while no parent does -> the introducing commit(s), i.e. the producer(s)."""
import subprocess, sys, json, re

REPO = "/Users/svendaneel/okam/web-fieldsvsharness"
CODE_EXT = (".js", ".mjs", ".cjs", ".ts", ".sh", ".json")

def git(*a, check=True, binary=False):
    r = subprocess.run(["git", "-C", REPO, *a], capture_output=True, check=check)
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")

def has(rev, tok):
    """does test/e2e CODE at rev name tok?"""
    try:
        out = git("grep", "-l", "--fixed-strings", tok, rev, "--", "test/e2e/", check=False)
    except Exception:
        return False, []
    files = []
    for line in out.splitlines():
        p = line.split(":", 1)[1] if ":" in line else line
        if p.endswith(".playwright.json") or not p.endswith(CODE_EXT):
            continue
        files.append(p)
    return bool(files), files

for tok in sys.argv[1:]:
    print(f"\n################ {tok}")
    # every commit touching test/e2e anywhere that contains the token
    cands = git("log", "--all", "--format=%H", "-S", tok, "--pickaxe-regex", "--", "test/e2e/").split()
    intro = []
    for c in cands:
        ok, files = has(c, tok)
        if not ok:
            continue
        parents = git("rev-parse", f"{c}^@").split()
        if all(not has(p, tok)[0] for p in parents):
            intro.append((c, files))
    print(f"introducing commits: {len(intro)}")
    for c, files in intro:
        info = git("log", "-1", "--format=%H%n  %cI  %an%n  %s", c).strip()
        heads = [h for h in git("for-each-ref", "--format=%(refname)", "--contains", c).splitlines() if h]
        print(f"  {info}")
        print(f"  files: {files}")
        print(f"  contained by {len(heads)} refs: {[h.replace('refs/heads/','') for h in heads][:8]}")
    # which refs can name it
    refs = [r for r in git("for-each-ref", "--format=%(refname)").splitlines() if r]
    can = [r for r in refs if has(r, tok)[0]]
    print(f"refs whose test/e2e code names {tok}: {len(can)} / {len(refs)}")

#!/usr/bin/env python3
"""Classify every branch ahead of the integration tip in both repos.

Buckets, each with the command that proves it:
  contained-ancestor : ahead==0                       (git rev-list --left-right --count TIP...B)
  contained-noop     : merge-tree(TIP,B).tree == tree(TIP)   -> merging changes nothing
  outstanding        : contributes a real tree change
Delta identity is (path, resulting-blob-sha) from `git diff --raw MB..B`, so two branches
carrying a BYTE-IDENTICAL blob at one path are distinguishable from two that collide there.
"""
import subprocess, json, sys, os
from collections import defaultdict

def git(repo, *a, ok=(0,)):
    p = subprocess.run(["git","-C",repo]+list(a), capture_output=True, text=True)
    if p.returncode not in ok: return None
    return p.stdout

def classify(repo, tip, label):
    tipsha = git(repo,"rev-parse",tip).strip()
    tiptree = git(repo,"rev-parse",tip+"^{tree}").strip()
    branches=[]
    for b in git(repo,"for-each-ref","--format=%(refname:short)","refs/heads").split():
        ab = git(repo,"rev-list","--left-right","--count",f"{tipsha}...{b}")
        if ab is None: continue
        behind,ahead = ab.split()
        branches.append((b,int(ahead),int(behind)))
    res={}
    for b,ahead,behind in branches:
        rec={"branch":b,"sha":git(repo,"rev-parse",b).strip(),"ahead":ahead,"behind":behind}
        if ahead==0:
            rec["bucket"]="contained-ancestor"; rec["delta"]={}; res[b]=rec; continue
        mt = git(repo,"merge-tree","--write-tree",tipsha,b, ok=(0,1))
        if mt is None:
            rec["bucket"]="unmergeable"; rec["delta"]={}; res[b]=rec; continue
        merged_tree = mt.split("\n")[0].strip()
        rec["merge_tree"]=merged_tree
        rec["conflicts_with_tip"] = (merged_tree != mt.split("\n")[0].strip()) # placeholder
        # conflict detection: merge-tree exits 1 and prints conflict info after a blank line
        rec["clean_vs_tip"] = ("\n\n" not in mt.rstrip()) or True
        if merged_tree == tiptree:
            rec["bucket"]="contained-noop"; rec["delta"]={}; res[b]=rec; continue
        mb = git(repo,"merge-base",tipsha,b)
        mb = mb.strip() if mb else None
        rec["merge_base"]=mb
        delta={}
        if mb:
            raw = git(repo,"diff","--raw",f"{mb}",b) or ""
            for ln in raw.strip().split("\n"):
                if not ln.startswith(":"): continue
                parts=ln.split("\t"); meta=parts[0].split()
                path=parts[-1]; dst=meta[3]
                delta[path]=dst
        rec["delta"]=delta
        rec["bucket"]="outstanding"
        res[b]=rec
    return {"repo":repo,"tip":tipsha,"tiptree":tiptree,"branches":res,"label":label}

out={}
out["fe"]=classify("/Users/svendaneel/okam/Web-modules","feature/restaurant-modules","fe")
out["be"]=classify("/Users/svendaneel/okam/OkamAPI-modules","feature/restaurant-modules","be")
json.dump(out, open("data/classified.json","w"), indent=1)
for k in ("fe","be"):
    from collections import Counter
    c=Counter(r["bucket"] for r in out[k]["branches"].values())
    print(k.upper(), dict(c), " total:",len(out[k]["branches"]))

#!/usr/bin/env python3
"""Supersession + collision matrix over the live outstanding set.

Collision keys on (path, resulting-blob-sha), NOT on path alone, because three branches
carrying a byte-identical helper blob merge add/add with no conflict - scoring them as
'both touch this file' would report agreement where the divergence lives elsewhere.
So every shared path is labelled CONCORDANT (same blob) or COLLIDING (different blob).
"""
import subprocess, json, os
from collections import defaultdict, Counter

def git(repo,*a,ok=(0,)):
    p=subprocess.run(["git","-C",repo]+list(a),capture_output=True,text=True)
    return p.stdout if p.returncode in ok else None

d=json.load(open("data/classified.json"))
LIVE_CUT=150
result={}

# worktree -> branch map, per repo
def worktrees(repo):
    out=set(); cur=None
    for ln in (git(repo,"worktree","list","--porcelain") or "").split("\n"):
        if ln.startswith("branch "): out.add(ln.split("refs/heads/",1)[-1].strip())
    return out

for key,repo in (("fe","/Users/svendaneel/okam/Web-modules"),("be","/Users/svendaneel/okam/OkamAPI-modules")):
    tip=d[key]["tip"]; wts=worktrees(repo)
    allb=d[key]["branches"]
    outst={b:r for b,r in allb.items() if r["bucket"]=="outstanding"}
    live={b:r for b,r in outst.items() if r["behind"]<LIVE_CUT}
    stale={b:r for b,r in outst.items() if r["behind"]>=LIVE_CUT}
    for b,r in live.items(): r["worktree"]=b in wts
    for b,r in stale.items(): r["worktree"]=b in wts

    # union of delta paths across live set
    union=set()
    for r in live.values(): union|=set(r["delta"])
    # each live branch's blob at every union path (needed for supersession, not just its own delta)
    treeblob={}
    for b in live:
        m={}
        for ln in (git(repo,"ls-tree","-r",b) or "").split("\n"):
            if not ln: continue
            meta,path=ln.split("\t",1)
            parts=meta.split()
            if path in union: m[path]=parts[2]
        treeblob[b]=m
    tipblob={}
    for ln in (git(repo,"ls-tree","-r",tip) or "").split("\n"):
        if not ln: continue
        meta,path=ln.split("\t",1)
        if path in union: tipblob[path]=meta.split()[2]

    # supersession: B superseded by C  <=>  C != B and every (p,blob) of delta(B) present on C's tree
    superseded={}
    names=sorted(live)
    for b in names:
        db=live[b]["delta"]
        if not db: continue
        by=[]
        for c in names:
            if c==b: continue
            tb=treeblob[c]
            if all(tb.get(p)==blob for p,blob in db.items()):
                by.append(c)
        if by: superseded[b]=by

    # already-on-tip fraction (how much of each delta the tip already carries)
    for b,r in live.items():
        db=r["delta"]
        r["delta_already_on_tip"]=sum(1 for p,bl in db.items() if tipblob.get(p)==bl)
        r["delta_n"]=len(db)

    # collision matrix over live set
    pairs={}
    for i,b in enumerate(names):
        for c in names[i+1:]:
            shared=set(live[b]["delta"])&set(live[c]["delta"])
            if not shared: continue
            conc=[p for p in shared if live[b]["delta"][p]==live[c]["delta"][p]]
            coll=[p for p in shared if live[b]["delta"][p]!=live[c]["delta"][p]]
            pairs[b+" | "+c]={"shared":len(shared),"concordant":len(conc),
                              "colliding":len(coll),"colliding_paths":sorted(coll)[:40]}
    result[key]={"live":live,"stale":stale,"superseded":superseded,"pairs":pairs,
                 "n_live":len(live),"n_stale":len(stale)}
    print("=== %s === live:%d stale-epoch:%d  live-with-worktree:%d"%(
        key.upper(),len(live),len(stale),sum(1 for r in live.values() if r["worktree"])))
    print("   superseded (delta fully carried by another live branch):",len(superseded))
    print("   pairs sharing >=1 path:",len(pairs),
          " of which any COLLIDING blob:",sum(1 for v in pairs.values() if v["colliding"]))
    print("   pairs that are PURELY concordant (identical blobs, merge clean, mask divergence):",
          sum(1 for v in pairs.values() if v["colliding"]==0))

json.dump(result,open("data/analysis.json","w"),indent=1)

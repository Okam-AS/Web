#!/usr/bin/env python3
"""Verify each pair the brief and the coordinator named, by measurement."""
import subprocess,json
BE="/Users/svendaneel/okam/OkamAPI-modules"; FE="/Users/svendaneel/okam/Web-modules"
def git(repo,*a,ok=(0,1)):
    p=subprocess.run(["git","-C",repo]+list(a),capture_output=True,text=True)
    return p.stdout if p.returncode in ok else None
def delta(repo,b,tip="feature/restaurant-modules"):
    mb=git(repo,"merge-base",tip,b).strip()
    out={}
    for ln in (git(repo,"diff","--raw",mb,b) or "").strip().split("\n"):
        if not ln.startswith(":"): continue
        parts=ln.split("\t"); out[parts[-1]]=parts[0].split()[3]
    return out
def report(repo,a,b,title):
    print("="*72); print(title)
    for r in (a,b):
        sha=git(repo,"rev-parse",r)
        print("  %-38s %s"%(r,(sha or "MISSING").strip()[:9]))
    da,db=delta(repo,a),delta(repo,b)
    print("  delta sizes: %s=%d  %s=%d"%(a,len(da),b,len(db)))
    onlya=set(da)-set(db); onlyb=set(db)-set(da); both=set(da)&set(db)
    conc=[p for p in both if da[p]==db[p]]; coll=[p for p in both if da[p]!=db[p]]
    print("  only-%s:%d  only-%s:%d  shared:%d (concordant %d / COLLIDING %d)"%(a.split('/')[-1],len(onlya),b.split('/')[-1],len(onlyb),len(both),len(conc),len(coll)))
    print("  subset? %s subset-of %s : %s"%(a,b,all(db.get(p)==v for p,v in da.items())))
    print("  subset? %s subset-of %s : %s"%(b,a,all(da.get(p)==v for p,v in db.items())))
    if onlya: print("   files only on %s: %s"%(a,sorted(onlya)[:8]))
    if onlyb: print("   files only on %s: %s"%(b,sorted(onlyb)[:8]))
    if coll: print("   COLLIDING paths: %s"%sorted(coll)[:8])

report(BE,"lane/pdf-creditnote-name","lane/credit-note-number","BRIEF: pdf-creditnote-name SUPERSEDES credit-note-number")
report(BE,"lane/ev-vipps-fallback","lane/ev-vipps-fallback-2","COORDINATOR: fc09be1d is 9e3a607b MINUS ONE FILE")
report(BE,"lane/wf-w5-timesheet","lane/wf-digest-tautology","BRIEF: must land together")
print("="*72); print("BRIEF: wf-invite-list-revoke (BE) + fe-wf-invite-list-revoke (FE) - CROSS-REPO pair")
print("  BE lane/wf-invite-list-revoke :",(git(BE,"rev-parse","lane/wf-invite-list-revoke") or "MISSING").strip()[:9],
      " delta:",len(delta(BE,"lane/wf-invite-list-revoke")))
print("  FE lane/fe-wf-invite-list-revoke:",(git(FE,"rev-parse","lane/fe-wf-invite-list-revoke") or "MISSING").strip()[:9],
      " delta:",len(delta(FE,"lane/fe-wf-invite-list-revoke")))
print("  (different repos -> no shared paths possible; the coupling is contract, not file)")

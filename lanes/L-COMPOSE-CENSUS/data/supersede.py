#!/usr/bin/env python3
"""Supersession via commit ancestry, computed linearly.
`git branch --contains X` lists every branch whose history includes X -> one call per branch."""
import subprocess,json
from collections import defaultdict
def git(repo,*a):
    p=subprocess.run(["git","-C",repo]+list(a),capture_output=True,text=True)
    return p.stdout if p.returncode==0 else ""
a=json.load(open("data/analysis.json"))
res={}
for key,repo in (("fe","/Users/svendaneel/okam/Web-modules"),("be","/Users/svendaneel/okam/OkamAPI-modules")):
    live=a[key]["live"]; names=sorted(live); liveset=set(names)
    sha={b:live[b]["sha"] for b in names}
    bysha=defaultdict(list)
    for b in names: bysha[sha[b]].append(b)
    sup={}
    for b in names:
        cont=[x.strip().lstrip('* ').strip() for x in git(repo,"branch","--contains",sha[b],
                "--format=%(refname:short)").split("\n") if x.strip()]
        others=sorted(set(cont)&liveset - set(bysha[sha[b]]))
        if others: sup[b]=others
    dup={s:v for s,v in bysha.items() if len(v)>1}
    roots=[b for b in names if b not in sup]
    seen=set(); uniq=[]
    for b in roots:
        if sha[b] in seen: continue
        seen.add(sha[b]); uniq.append(b)
    res[key]={"superseded_by_ancestry":sup,"alias_groups":dup,"mergeable_heads":uniq}
    print("=== %s === live:%d"%(key.upper(),len(names)))
    print("  SUPERSEDED by ancestry:",len(sup))
    for b,v in sorted(sup.items())[:40]:
        print("    %-42s  <= contained by: %s"%(b,", ".join(v)))
    print("  alias groups (one commit, several refs):",len(dup))
    for s,v in dup.items(): print("    %s : %s"%(s[:9],", ".join(sorted(v))))
    print("  --> MERGEABLE HEADS:",len(uniq))
json.dump(res,open("data/supersede.json","w"),indent=1)

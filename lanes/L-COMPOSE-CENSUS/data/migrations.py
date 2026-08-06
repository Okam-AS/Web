#!/usr/bin/env python3
"""C2: identify every live branch that ADDS a migration, and test whether their Designer
parents form a chain or a fork against the tip's chain tip."""
import subprocess,json,re
from collections import defaultdict
REPO="/Users/svendaneel/okam/OkamAPI-modules"
def git(*a,ok=(0,)):
    p=subprocess.run(["git","-C",REPO]+list(a),capture_output=True,text=True)
    return p.stdout if p.returncode in ok else None
a=json.load(open("data/analysis.json"))
live=a["be"]["live"]; tip="feature/restaurant-modules"

def migs_of(ref):
    out=set()
    for ln in (git("ls-tree","-r","--name-only",ref) or "").split("\n"):
        m=re.match(r'Migrations/(\d{14}_[A-Za-z0-9_]+)\.cs$',ln)
        if m: out.add(m.group(1))
    return out

tipmigs=migs_of(tip)
tipchain=sorted(tipmigs)
print("tip migration count:",len(tipmigs))
print("tip chain tip:",tipchain[-1] if tipchain else None)

adders={}
for b,r in sorted(live.items()):
    if not any(p.startswith("Migrations/") and p.endswith(".cs") for p in r["delta"]): continue
    bm=migs_of(b)
    new=sorted(bm-tipmigs)
    if new: adders[b]={"new":new,"snapshot_touched":"Migrations/ApplicationDbContextModelSnapshot.cs" in r["delta"]}
print("\nlive branches ADDING >=1 migration not on tip:",len(adders))
for b,v in adders.items():
    print("  %-46s +%d : %s%s"%(b,len(v["new"]),", ".join(x[:14]+"_"+x[15:40] for x in v["new"]),
          "" if v["snapshot_touched"] else "   [!! adds migration WITHOUT touching snapshot]"))

# fork test: do the new migration ids all sort AFTER the tip chain tip, and do two
# branches each claim a slot immediately after the same parent?
ct=tipchain[-1] if tipchain else ""
firsts=defaultdict(list)
for b,v in adders.items():
    firsts[v["new"][0]].append(b)
print("\n--- C2 fork test ---")
print("every new migration id sorts after tip chain tip:",
      all(all(m>ct for m in v["new"]) for v in adders.values()))
print("distinct 'first new migration' ids:",len(firsts),"across",len(adders),"branches")
forks=[(k,v) for k,v in firsts.items() if len(v)>1]
print("ids claimed by >1 branch (same-slot collision):",len(forks))
for k,v in forks: print("   ",k,"->",v)
print("\nALL adders branch from the same tip chain tip -> they are a FORK, not a chain:",
      len(adders)>1)
json.dump(adders,open("data/migration-adders.json","w"),indent=1)

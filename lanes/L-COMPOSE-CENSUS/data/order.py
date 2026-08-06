#!/usr/bin/env python3
"""Derive the proposed merge order. Hub files are DETECTED by degree, not typed."""
import json
from collections import defaultdict,Counter
an=json.load(open("data/analysis.json")); su=json.load(open("data/supersede.json"))
mig=json.load(open("data/migration-adders.json"))
EXCLUDE={"be":{
  "lane/margin-finalize-lag":"C2 FORK - adds 20260731203011_Margin_PeriodStatementFinalizedImmutable: the same "
    "logical migration the 14-branch stack carries as 20260801084923, and its id sorts BEFORE the tip chain tip "
    "20260731220005. Merging it inserts a migration mid-chain AND lands the table change twice. Rebuild onto the stack.",
  "lane/ev-vipps-fallback-2":"RULED AGAINST by L-EV-GUESTLINK-ONE-COMPOSER - it is ev-vipps-fallback minus "
    "Services/Events/EventsEmailNotificationDelivery.cs and it rewrites the CredentialCompositionSweepTests "
    "allowlist justification so the two-composer drift stays green. Land 9e3a607b instead."},
 "fe":{}}
HUBMIN=5
out={}
for key in ("fe","be"):
    live=an[key]["live"]
    heads=[h for h in su[key]["mergeable_heads"]]
    excl={h:r for h,r in EXCLUDE[key].items() if h in heads}
    heads=[h for h in heads if h not in excl]
    delta={h:live[h]["delta"] for h in heads}
    touch=Counter()
    for h in heads:
        for p in delta[h]: touch[p]+=1
    hubs=[p for p,n in touch.items() if n>=HUBMIN]
    deg=Counter(); collpairs={}
    for i,a in enumerate(heads):
        for b in heads[i+1:]:
            sh=set(delta[a])&set(delta[b])
            c=[p for p in sh if delta[a][p]!=delta[b][p]]
            if c:
                deg[a]+=1; deg[b]+=1
                collpairs[a+" | "+b]=sorted(c)
    migheads=[h for h in heads if h in mig]
    md={h:len(mig[h]["new"]) for h in migheads}
    nonmig=[h for h in heads if h not in migheads]
    hubheads=[h for h in nonmig if any(p in delta[h] for p in hubs)]
    indep=[h for h in nonmig if h not in hubheads and deg[h]==0]
    rest=[h for h in nonmig if h not in hubheads and h not in indep]
    out[key]={"excluded":excl,"hub_files":sorted(hubs,key=lambda p:-touch[p]),
      "hub_touch":{p:touch[p] for p in sorted(hubs,key=lambda p:-touch[p])},
      "T1_migration":sorted(migheads,key=lambda h:(-md[h],h)),"T1_depth":md,
      "T2_hub":sorted(hubheads,key=lambda h:(-deg[h],h)),
      "T3_rest":sorted(rest,key=lambda h:(-deg[h],h)),
      "T4_independent":sorted(indep),
      "degree":dict(deg),"n_heads":len(heads),"collision_pairs":len(collpairs)}
    print("=== %s === heads:%d excluded:%d  hub files(touched by >=%d heads):%d"%(
        key.upper(),len(heads),len(excl),HUBMIN,len(hubs)))
    for p in out[key]["hub_files"][:8]: print("     %3d heads  %s"%(touch[p],p))
    print("  T1 migration-serialised:%d  T2 hub:%d  T3 rest:%d  T4 independent:%d   colliding pairs:%d"%(
        len(migheads),len(hubheads),len(rest),len(indep),len(collpairs)))
json.dump(out,open("data/order.json","w"),indent=1)

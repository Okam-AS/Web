#!/usr/bin/env python3
import subprocess, json, collections
REPO="/Users/svendaneel/okam/web-fieldsvsharness"
OUT="/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/afvh"
PROD={"proxiedSubjectServed":["9d4399ac94ddd04a6a19163a07c6740fa310554b","097c3c9ec82356c292f5f90f5caebfb4ac284f09"],
      "proxiedSubjectSample":["9d4399ac94ddd04a6a19163a07c6740fa310554b","097c3c9ec82356c292f5f90f5caebfb4ac284f09"],
      "backendBuild":["533aea4c1da7d3d79160d4598d4a6a4732eadee1"],
      "canonicalHeldBy":["533aea4c1da7d3d79160d4598d4a6a4732eadee1"],
      "provisional":["533aea4c1da7d3d79160d4598d4a6a4732eadee1"]}
def git(*a,check=True):
    return subprocess.run(["git","-C",REPO,*a],capture_output=True,text=True,check=check).stdout
def anc(a,b): return subprocess.run(["git","-C",REPO,"merge-base","--is-ancestor",a,b]).returncode==0
c=json.load(open(f"{OUT}/census-final.json"))
mani={(m["path"],m["blob"]):m for m in c["manifest"]}

print("### ancestry violations (producer must NOT be reachable from the holding rev)")
bad=0
for uni in ("A","B"):
    for r in c[uni]:
        for p in PROD[r["key"]]:
            if anc(p,r["rev"]): print("  FP",uni,r); bad+=1
print(f"  violations: {bad}")

print("\n### scope tally")
paths={m["path"] for m in c["manifest"]}
print(f"  refs measured                       : {len(c['refs'])}")
print(f"  committed journey receipts (path,blob): {len(mani)}   distinct paths: {len(paths)}")
print(f"  named *.playwright.json             : {sum(1 for p,_ in mani if p.endswith('.playwright.json'))}")
print(f"  other .json, journey-shaped         : {sum(1 for p,_ in mani if not p.endswith('.playwright.json'))}")
hitA={(r['path'],r['blob']) for r in c['A']}; hitB={(r['path'],r['blob']) for r in c['B']}
print(f"  mismatching A / B / union / clean   : {len(hitA)} / {len(hitB)} / {len(hitA|hitB)} / {len(set(mani)-(hitA|hitB))}")

print("\n### within-commit discrimination")
for commit in ("fadc84a3f34cd185a14ca642bb9f4d21b6117bcc","337f9bf2b14987c4ffd302a5659db2b8b411aacd"):
    print(f"\n {commit[:8]} {git('log','-1','--format=%cI',commit).strip()}")
    for (p,b),m in sorted(mani.items()):
        if commit in m["introduced_by"]:
            keys=[r['key'] for r in c['B'] if r['rev']==commit and r['path']==p and r['blob']==b]
            print(f"   {'MISMATCH' if keys else 'clean   '} {p.split('/')[-1]:52s} {sorted(set(keys))}")

print("\n### final finding table")
rows=collections.defaultdict(lambda:{"A":set(),"B":set(),"k":set()})
for r in c['A']: rows[(r['path'],r['blob'])]["A"].add(r['rev']); rows[(r['path'],r['blob'])]["k"].add(r['key'])
for r in c['B']: rows[(r['path'],r['blob'])]["B"].add(r['rev']); rows[(r['path'],r['blob'])]["k"].add(r['key'])
for (p,b),d in sorted(rows.items()):
    m=mani[(p,b)]
    print(f"\n{p}  [{b[:8]}]")
    print(f"  keys       : {sorted(d['k'])}")
    print(f"  producers  : {[x[:7] for x in PROD[sorted(d['k'])[0]]]}")
    print(f"  sits on {len(m['refs'])} refs; cannot-emit on {len(d['A'])}: {sorted(x.replace('refs/heads/','').replace('refs/','') for x in d['A'])}")
    print(f"  introduced by: " + ", ".join(f"{x[:7]}@{git('log','-1','--format=%cI',x).strip()}" for x in m['introduced_by']))
    print(f"  of which cannot-emit: {sorted(x[:7] for x in d['B'])}")

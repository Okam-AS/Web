#!/usr/bin/env python3
"""Full census: every committed JOURNEY RECEIPT (any .json whose shape is a journey record),
checked against the harness key-surface at every rev that holds it and at every rev that
introduced it."""
import subprocess, json, collections, re, sys

REPO = "/Users/svendaneel/okam/web-fieldsvsharness"
OUT = "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/afvh"
CODE_EXT = (".js", ".mjs", ".cjs", ".ts", ".sh", ".json")
TOKEN = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")

def git(*a, binary=False, check=True):
    r = subprocess.run(["git", "-C", REPO, *a], capture_output=True, check=check)
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")

refs = [r for r in git("for-each-ref", "--format=%(refname)").split() if r]
open(f"{OUT}/refs-measured.txt", "w").write("\n".join(refs) + "\n")
print(f"refs measured: {len(refs)}", file=sys.stderr)

# ---- collect every committed journey receipt (shape-based, not name-based) ----
def is_receipt(d):
    return isinstance(d, dict) and "journey" in d and "steps" in d and "status" in d

pairs = collections.defaultdict(set)
seen = set()
for r in refs:
    for line in git("ls-tree", "-r", r).splitlines():
        meta, path = line.split("\t", 1)
        mode, ot, sha = meta.split()
        if ot != "blob" or not path.endswith(".json") or "node_modules" in path:
            continue
        k = (path, sha)
        if k in seen and k not in pairs:
            continue
        if k not in seen:
            seen.add(k)
            try:
                blob = git("cat-file", "blob", sha, binary=True)
            except subprocess.CalledProcessError:
                continue
            if len(blob) > 4_000_000:
                continue
            try:
                d = json.loads(blob.decode("utf-8", "replace"))
            except Exception:
                continue
            if not is_receipt(d):
                continue
        if k in pairs or (path, sha) in seen:
            pass
        pairs[k].add(r)
# drop non-receipts that slipped in
pairs = {k: v for k, v in pairs.items() if v}
receipts = {}
for (p, s) in list(pairs):
    d = json.loads(git("cat-file", "blob", s, binary=True).decode("utf-8", "replace"))
    if not is_receipt(d):
        del pairs[(p, s)]; continue
    receipts[(p, s)] = d
print(f"committed journey receipts (path,blob): {len(pairs)}  paths: {len({p for p,_ in pairs})}", file=sys.stderr)
byname = collections.Counter("playwright" if p.endswith(".playwright.json") else "other" for p, _ in pairs)
print(f"  by naming: {dict(byname)}", file=sys.stderr)
print(f"  placements: {sum(len(v) for v in pairs.values())}", file=sys.stderr)

# ---- introducing commits ----
def introducing(path, blob):
    out = git("log", "--all", "--format=%H", "--diff-filter=AM", "--", path, check=False).split()
    hits = []
    for c in out:
        if git("rev-parse", f"{c}:{path}", check=False).strip() != blob:
            continue
        parents = git("rev-parse", f"{c}^@", check=False).split()
        if not any(git("rev-parse", f"{p}:{path}", check=False).strip() == blob for p in parents):
            hits.append(c)
    return hits

# ---- harness token surface ----
tree_cache, e2e_cache = {}, {}
def e2e_tree(rev):
    if rev not in e2e_cache:
        e2e_cache[rev] = git("rev-parse", f"{rev}:test/e2e", check=False).strip() or None
    return e2e_cache[rev]
def tokens(tree):
    if tree in tree_cache: return tree_cache[tree]
    t = set()
    for line in git("ls-tree", "-r", tree).splitlines():
        meta, path = line.split("\t", 1)
        mode, ot, sha = meta.split()
        if ot != "blob" or not path.endswith(CODE_EXT): continue
        if path.endswith(".playwright.json"): continue
        blob = git("cat-file", "blob", sha, binary=True).decode("utf-8", "replace")
        if is_receipt_json(blob): continue          # a receipt never vouches for itself
        t.update(TOKEN.findall(blob))
    tree_cache[tree] = t
    return t
def is_receipt_json(txt):
    try: return is_receipt(json.loads(txt))
    except Exception: return False

def keys_of(o, acc=None):
    if acc is None: acc = set()
    if isinstance(o, dict):
        for k, v in o.items(): acc.add(k); keys_of(v, acc)
    elif isinstance(o, list):
        for v in o: keys_of(v, acc)
    return acc

rowsA, rowsB = [], []
manifest = []
for (p, s), rs in sorted(pairs.items()):
    ks = keys_of(receipts[(p, s)])
    intro = introducing(p, s)
    manifest.append({"path": p, "blob": s, "refs": sorted(rs), "introduced_by": intro, "nkeys": len(ks)})
    for r in sorted(rs):
        t = e2e_tree(r)
        if t is None: rowsA.append((r, p, s, "<no test/e2e at this rev>")); continue
        tk = tokens(t)
        for k in sorted(ks):
            if k not in tk: rowsA.append((r, p, s, k))
    for c in intro:
        t = e2e_tree(c)
        if t is None: rowsB.append((c, p, s, "<no test/e2e at this rev>")); continue
        tk = tokens(t)
        for k in sorted(ks):
            if k not in tk: rowsB.append((c, p, s, k))

json.dump({"refs": refs, "manifest": manifest,
           "A": [dict(zip(("rev","path","blob","key"), x)) for x in rowsA],
           "B": [dict(zip(("rev","path","blob","key"), x)) for x in rowsB]},
          open(f"{OUT}/census-final.json", "w"), indent=1)
print(f"A rows {len(rowsA)}  B rows {len(rowsB)}", file=sys.stderr)

for lab, rows in (("A sits-on", rowsA), ("B committed-into", rowsB)):
    agg = collections.defaultdict(set)
    for rv, p, b, k in rows: agg[(p, b, k)].add(rv)
    hit = {(p, b) for p, b, _ in agg}
    print(f"\n=== {lab}: {len(hit)} mismatching artifacts, {len(agg)} (artifact,key) rows ===")
    for (p, b, k), rvs in sorted(agg.items()):
        print(f"{b[:8]} {k:22s} {p}\n         @ {sorted(x.replace('refs/heads/','').replace('refs/','')[:44] for x in rvs)}")

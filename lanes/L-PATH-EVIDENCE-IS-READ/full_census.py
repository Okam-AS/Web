#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Full census: every recorded evidence pointer, resolved and READ.

Three questions per entity:
  (1) does the evidence resolve to a DIRECTORY (a prefix, not an artifact)?
  (2) does the artifact it resolves to record its OWN FAILURE?
  (3) was the exit satisfied by prefix rather than by naming the artifact?

Reads only.  Writes only under lanes/L-PATH-EVIDENCE-IS-READ/.
"""
import importlib.machinery
import importlib.util
import json
import os
import re
import sys

PLAN_BIN = "/Users/svendaneel/.local/bin/plan"
REPO = "/Users/svendaneel/okam/Web-modules"

spec = importlib.util.spec_from_loader(
    "pm", importlib.machinery.SourceFileLoader("pm", PLAN_BIN))
pm = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(pm)
p = pm.load(os.path.join(REPO, "docs", "plan"))
pm.parse(p)

# ---- path tokens inside a free-text evidence string ---------------------
TOKEN_RE = re.compile(r"[~./A-Za-z0-9_-]*/[~./A-Za-z0-9_,{}-]+")

FAILWORDS = re.compile(
    r"^\s*(?:[-*#>|]*\s*)?(?:\*\*)?"
    r"(status|verdict|result|outcome|overall)(?:\*\*)?\s*[:=]\s*"
    r"[`\"']?(?P<v>[A-Za-z-]+)", re.I | re.M)


def read_status(absp):
    """What does this artifact say about itself?  (verdict, detail)"""
    if os.path.isdir(absp):
        return "DIRECTORY", "a directory: it has no status of its own"
    if not os.path.exists(absp):
        return "MISSING", "path does not exist"
    try:
        raw = open(absp, "r", errors="replace").read()
    except Exception as ex:
        return "UNREADABLE", str(ex)
    if absp.endswith(".json"):
        try:
            d = json.loads(raw)
        except Exception as ex:
            return "UNREADABLE", "json: %s" % ex
        if isinstance(d, dict) and "status" in d:
            v = str(d["status"]).lower()
            steps = d.get("steps") or []
            nf = sum(1 for s in steps if isinstance(s, dict)
                     and str(s.get("status", "")).lower() != "passed")
            return ("FAIL" if v in ("failed", "fail", "error", "red")
                    else "PASS" if v in ("passed", "pass", "ok", "green")
                    else "OTHER:%s" % v,
                    "status=%s, %d steps, %d not-passed; journey=%s"
                    % (v, len(steps), nf, d.get("journey")))
        keys = list(d)[:8] if isinstance(d, dict) else type(d).__name__
        return "NO-STATUS-FIELD", "no `status` key; keys=%r" % (keys,)
    # text artifact
    hits = [(m.group(1).lower(), m.group("v").lower())
            for m in FAILWORDS.finditer(raw)]
    bad = [h for h in hits if h[1] in ("failed", "fail", "red", "error",
                                       "blocked", "aborted", "fail-spec",
                                       "refused", "no", "not")]
    first = raw.splitlines()[0][:90] if raw.splitlines() else ""
    if bad:
        return "TEXT-FAIL", "self-declared %r; first line: %s" % (bad[:3],
                                                                 first)
    if hits:
        return "TEXT-STATUS", "%r; first line: %s" % (hits[:3], first)
    return "TEXT-NO-STATUS", "%d bytes; first line: %s" % (len(raw), first)


rows = []
for e in p.entities.values():
    ev = (e.get("evidence", "") or "").strip()
    if not ev:
        continue
    ex = (e.get("exit", "") or "").strip()
    _, expaths = pm.exit_tokens(ex)
    rec = dict(id=e.id, type=e.type, state=e.state, title=e.title,
               evidence=ev, exit=ex, exit_paths=expaths, targets=[])
    if ev.startswith("fact:"):
        rec["kind"] = "fact"
        rows.append(rec)
        continue
    rec["kind"] = "path"
    # what the checker itself would resolve: the WHOLE evidence string
    whole = ev if os.path.isabs(ev) else os.path.join(p.repo_root, ev)
    rec["whole_exists"] = os.path.exists(whole)
    rec["whole_isdir"] = os.path.isdir(whole)
    if rec["whole_exists"]:
        v, d = read_status(whole)
        rec["whole_status"] = v
        rec["whole_detail"] = d
    else:
        rec["whole_status"] = "NOT-A-PATH"
        rec["whole_detail"] = "the recorded evidence string is prose"
    # every path-shaped token inside the string, resolved
    for t in TOKEN_RE.findall(ev):
        t = t.strip(" ,;·)(\"'`")
        if not t or t.startswith("http"):
            continue
        cands = []
        if t.startswith("~"):
            cands.append(os.path.expanduser(t))
        elif os.path.isabs(t):
            cands.append(t)
        else:
            cands.append(os.path.join(p.repo_root, t))
            cands.append(os.path.join(os.path.dirname(p.repo_root), t))
        hit = next((c for c in cands if os.path.exists(c)), None)
        if hit:
            v, d = read_status(hit)
            rec["targets"].append(dict(token=t, path=hit, status=v, detail=d))
        else:
            rec["targets"].append(dict(token=t, path=cands[0],
                                       status="MISSING", detail=""))
    # exit satisfaction shape
    rec["matched"] = [t for t in expaths
                      if ev.startswith(t) or t.startswith(ev)]
    rec["exact"] = any(ev == t for t in expaths)
    rec["prefix_only"] = bool(rec["matched"]) and not rec["exact"]
    rows.append(rec)

with open(os.path.join(REPO,
          "lanes/L-PATH-EVIDENCE-IS-READ/full_census.json"), "w") as fh:
    json.dump(rows, fh, indent=1)

path_rows = [r for r in rows if r["kind"] == "path"]
print("entities with evidence: %d  (fact: %d, path-shaped: %d)"
      % (len(rows), len(rows) - len(path_rows), len(path_rows)))

# ---- STATE 3 first: the artifact records its own failure ---------------
print("\n" + "=" * 78)
print("STATE 3 — the recorded artifact RECORDS ITS OWN FAILURE")
print("=" * 78)
n = 0
for r in path_rows:
    bad = [t for t in r["targets"]
           if t["status"] in ("FAIL", "TEXT-FAIL")]
    if r["whole_status"] in ("FAIL", "TEXT-FAIL"):
        bad = bad or [dict(token=r["evidence"], path="",
                           status=r["whole_status"], detail=r["whole_detail"])]
    if bad:
        n += 1
        print("\n%-34s %s" % (r["id"], r["state"]))
        print("  exit    : %s" % r["exit"][:200])
        print("  evidence: %s" % r["evidence"][:260])
        for b in bad:
            print("  -> %-70s %s" % (b["token"][:70], b["status"]))
            print("     %s" % b["detail"][:200])
print("\ncount: %d" % n)

# ---- STATE: evidence is a DIRECTORY ------------------------------------
print("\n" + "=" * 78)
print("evidence that resolves to a DIRECTORY (a prefix, not an artifact)")
print("=" * 78)
for r in path_rows:
    dirs = [t for t in r["targets"] if t["status"] == "DIRECTORY"]
    if r["whole_isdir"]:
        print("\n%-34s %-18s WHOLE STRING IS A DIRECTORY: %s"
              % (r["id"], r["state"], r["evidence"]))
        print("  exit: %s" % r["exit"][:200])
    elif dirs:
        print("\n%-34s %-18s %s" % (r["id"], r["state"], r["evidence"][:120]))
        for d in dirs:
            print("  -> dir token: %s" % d["token"])

# ---- STATE: prefix-only satisfaction -----------------------------------
print("\n" + "=" * 78)
print("exit satisfied by PREFIX, not by naming the artifact")
print("=" * 78)
for r in path_rows:
    if r["prefix_only"]:
        print("%-34s %-18s ev=%-58s tok=%r"
              % (r["id"], r["state"], r["evidence"][:58], r["matched"]))

# ---- missing / prose ----------------------------------------------------
print("\n" + "=" * 78)
print("evidence string that is NOT a path at all (prose) — never checkable")
print("=" * 78)
c = sum(1 for r in path_rows if not r["whole_exists"])
print("count: %d of %d" % (c, len(path_rows)))
byst = {}
for r in path_rows:
    if not r["whole_exists"]:
        byst.setdefault(r["state"], []).append(r["id"])
for s in byst:
    print("  %-20s %d" % (s, len(byst[s])))

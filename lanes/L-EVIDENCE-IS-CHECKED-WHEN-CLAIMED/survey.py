#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Blast-radius survey.  Loads the plan tool as a module (no verb invoked,
nothing mutated) and classifies every path-shaped evidence pointer by what the
artifact it names actually is, so the repair is written against the real
population rather than against the six rows the census sampled."""
import importlib.machinery
import importlib.util
import json
import os
import sys

PLAN = "/Users/svendaneel/.local/bin/plan"
ROOT = "/Users/svendaneel/okam/Web-modules"

spec = importlib.util.spec_from_loader(
    "pm", importlib.machinery.SourceFileLoader("pm", PLAN))
pm = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(pm)
p = pm.load(os.path.join(ROOT, "docs/plan"))
pm.parse(p)


def classify(ev):
    path = ev if os.path.isabs(ev) else os.path.join(p.repo_root, ev)
    if not os.path.exists(path):
        return "MISSING", None
    if os.path.isdir(path):
        return "DIRECTORY", None
    if path.endswith(".json"):
        try:
            d = json.load(open(path))
        except Exception as exc:
            return "JSON-UNPARSEABLE", str(exc)[:60]
        if not isinstance(d, dict):
            return "JSON-NOT-OBJECT", None
        for k in ("status", "result", "outcome", "verdict", "conclusion"):
            if k in d:
                return "JSON-STATUS", "%s=%r" % (k, d[k])
        return "JSON-NO-STATUS", ",".join(list(d.keys())[:6])
    return "OPAQUE(" + (os.path.splitext(path)[1] or "noext") + ")", None


rows = []
for eid, e in p.entities.items():
    ev = (e.get("evidence", "") or "").strip()
    if not ev or ev.startswith("fact:"):
        continue
    kind, detail = classify(ev)
    rows.append((e.state, kind, eid, ev, detail))

print("=== path-shaped evidence, by artifact class ===")
tally = {}
for st, kind, eid, ev, detail in rows:
    tally.setdefault((st, kind), []).append(eid)
for (st, kind), ids in sorted(tally.items()):
    print("%-18s %-18s %4d" % (st, kind, len(ids)))

print("\n=== verified rows only, in full ===")
for st, kind, eid, ev, detail in sorted(rows):
    if st != "verified":
        continue
    print("  %-28s %-16s %s" % (eid, kind, ev))
    if detail:
        print("  %-28s   -> %s" % ("", detail))

print("\n=== every distinct JSON status value in play ===")
vals = {}
for st, kind, eid, ev, detail in rows:
    if kind == "JSON-STATUS":
        vals.setdefault(detail, []).append(eid)
for v, ids in sorted(vals.items()):
    print("  %-40s %d  %s" % (v, len(ids), ", ".join(ids[:4])))

print("\n=== the two rows that must keep passing ===")
for eid in ("L-LIVE-WORLD-STAFF", "L-GROWTH-MAIL"):
    e = p.entities.get(eid)
    if e is None:
        print("  %s NOT IN PLAN" % eid)
        continue
    print("  %s  state=%s" % (eid, e.state))
    print("    exit:     %s" % (e.get("exit", "") or "").strip()[:400])
    print("    evidence: %s" % (e.get("evidence", "") or "").strip())
    print("    tokens:   %r" % (pm.exit_tokens(e.get("exit", "") or ""),))
    ok, why = pm.evidence_admissible(p, e.get("evidence", "") or "", ent=e)
    print("    TODAY:    %s %s" % ("ADMITTED" if ok else "refused", why))

print("\n=== the six Feature exits ===")
for tid in ("FT-WORKFORCE", "FT-MARGIN", "FT-EVENTS", "FT-MEALS",
            "FT-TRAINING", "FT-GROWTH"):
    e = p.entities[tid]
    print("  %-14s state=%-18s ev=%r" % (tid, e.state,
                                         (e.get("evidence", "") or "")))
    print("    exit:   %s" % (e.get("exit", "") or "").strip()[:300])
    print("    tokens: %r" % (pm.exit_tokens(e.get("exit", "") or "")[1],))

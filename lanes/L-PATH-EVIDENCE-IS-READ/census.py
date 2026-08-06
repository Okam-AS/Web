#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Census of path-shaped evidence: which recorded exits rest on a prefix,
and which artifacts record their own failure.

Reads plan.md with the plan tool's OWN parser so the census counts what the
instrument counts.  Changes nothing.
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
    "planmod", importlib.machinery.SourceFileLoader("planmod", PLAN_BIN))
planmod = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]          # keep the module from parsing our argv
spec.loader.exec_module(planmod)

p = planmod.load(os.path.join(REPO, "docs", "plan"))
planmod.parse(p)

rows = []
for e in p.entities.values():
    ev = (e.get("evidence", "") or "").strip()
    if not ev:
        continue
    rows.append(e)

print("entities with evidence: %d" % len(rows))
print("repo_root: %s" % p.repo_root)

# ---- split fact: vs path-shaped ----------------------------------------
facts_ev, path_ev = [], []
for e in rows:
    ev = e.get("evidence", "").strip()
    (facts_ev if ev.startswith("fact:") else path_ev).append(e)
print("  fact:-only evidence : %d" % len(facts_ev))
print("  path-shaped evidence: %d" % len(path_ev))

out = []
for e in path_ev:
    ev = e.get("evidence", "").strip()
    ex = e.get("exit", "") or ""
    facts, paths = planmod.exit_tokens(ex)
    # what the instrument would say
    ok_kind, why_kind = planmod._evidence_kind_ok(p, ev)
    ok_inst, why_inst = planmod.names_the_instrument(p, ev, e)
    matched = []
    for tok in paths:
        if ev.startswith(tok) or tok.startswith(ev):
            matched.append(tok)
    # exact vs prefix: exact means ev == tok for some token
    exact = any(ev == t for t in paths)
    absp = ev if os.path.isabs(ev) else os.path.join(p.repo_root, ev)
    out.append(dict(
        id=e.id, type=e.type, state=e.state, title=e.title,
        evidence=ev, exit=ex.strip(),
        exit_paths=paths, exit_facts=facts,
        matched_tokens=matched, exact_match=exact,
        kind_ok=ok_kind, kind_why=why_kind,
        inst_ok=ok_inst, inst_why=why_inst,
        ev_exists=os.path.exists(absp),
        ev_isdir=os.path.isdir(absp),
        abspath=absp,
    ))

with open(os.path.join(REPO, "lanes/L-PATH-EVIDENCE-IS-READ/census.json"),
          "w") as fh:
    json.dump(out, fh, indent=1)

by_state = {}
for r in out:
    by_state.setdefault(r["state"], []).append(r)
print("\npath-shaped evidence by state:")
for s in sorted(by_state, key=lambda k: str(k)):
    print("  %-20s %d" % (s, len(by_state[s])))

print("\n--- evidence that is a DIRECTORY on disk ---")
for r in out:
    if r["ev_isdir"]:
        print("  %-34s %-18s %s" % (r["id"], r["state"], r["evidence"]))

print("\n--- evidence NOT exactly naming any exit path token (prefix match) ---")
for r in out:
    if not r["exact_match"]:
        print("  %-34s %-18s ev=%r" % (r["id"], r["state"], r["evidence"][:90]))
        print("       exit paths: %r" % (r["exit_paths"][:6],))
        print("       matched   : %r" % (r["matched_tokens"],))

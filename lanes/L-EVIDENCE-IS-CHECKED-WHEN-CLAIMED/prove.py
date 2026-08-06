#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ask ONE build of the plan tool every question this lane must answer, and
print the answers as a stable JSON document so `before` and `after` diff.

    python3 prove.py <path-to-plan-build>  > before.json

Loads the tool as a module and invokes NO verb: only `evidence_admissible`,
the exact predicate `cmd_verify` calls.  Nothing is mutated.
"""
import importlib.machinery
import importlib.util
import json
import os
import sys

PLAN = sys.argv[1] if len(sys.argv) > 1 else "/Users/svendaneel/.local/bin/plan"
ROOT = "/Users/svendaneel/okam/Web-modules"

spec = importlib.util.spec_from_loader(
    "pm", importlib.machinery.SourceFileLoader("pm", PLAN))
pm = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(pm)
p = pm.load(os.path.join(ROOT, "docs/plan"))
pm.parse(p)

out = {"instrument": PLAN}

# ---------------------------------------------------------------- A. the six
# The six admissions the census listed (finding.md §0), asked of the six
# Feature exits exactly as `plan verify FT-X --evidence <row>` would.
ROWS = [
    "artifacts",
    "artifacts/",
    "artifacts/journeys/",
    "artifacts/journeys/modal-scroll-lock.playwright.json",
    "artifacts/journeys/growth-newsletter-send-gate.playwright.json",
    "artifacts/journeys/training-course-to-evidence.playwright.json",
]
FEATURES = ["FT-WORKFORCE", "FT-MARGIN", "FT-EVENTS", "FT-MEALS",
            "FT-TRAINING", "FT-GROWTH"]
six = {}
for row in ROWS:
    cells = {}
    for tid in FEATURES:
        ok, why = pm.evidence_admissible(p, row, ent=p.entities[tid])
        cells[tid] = {"admitted": bool(ok), "why": why}
    six[row] = cells
out["six_admissions"] = six

# ------------------------------------------------- B. the deliberate-red pair
# Neither is asked of an entity: the question is whether the *kind/status*
# half of the checker reds an artifact for containing the word `failed` when
# the failure is the run's SUBJECT, not its outcome.  Both files are the
# deliberate red halves of a guard proof and a mutation proof.
REDS = [
    "lanes/L-LIVE-WORLD-STAFF/live-world-run.txt",
    "lanes/L-JOURNEY-PROXY-BLINDSPOT/guard-proof.txt",
]
red = {}
for r in REDS:
    ok, why = pm._evidence_kind_ok(p, r)
    red[r] = {"admitted": bool(ok), "why": why}
# and the one that IS recorded against an entity, end to end
e = p.entities["L-JOURNEY-PROXY-BLINDSPOT"]
ok, why = pm.evidence_admissible(p, (e.get("evidence", "") or ""), ent=e)
red["L-JOURNEY-PROXY-BLINDSPOT (as recorded, end to end)"] = {
    "admitted": bool(ok), "why": why}
out["deliberate_red"] = red

# ------------------------------------------------------- C. the whole board
# Every entity whose recorded evidence is path-shaped, judged as recorded.
board = {}
for eid, ent in p.entities.items():
    ev = (ent.get("evidence", "") or "").strip()
    if not ev or ev.startswith("fact:"):
        continue
    ok, why = pm.evidence_admissible(p, ev, ent=ent)
    board[eid] = {"state": ent.state, "evidence": ev,
                  "admitted": bool(ok), "why": why}
out["board"] = board

# ------------------------------------------- D. the undecidable status-less row
g = p.entities["L-GROWTH-MAIL"]
ok, why = pm.evidence_admissible(
    p, "artifacts/journeys/growth-doi-postmark-sandbox.json", ent=g)
okk, whyk = pm._evidence_kind_ok(
    p, "artifacts/journeys/growth-doi-postmark-sandbox.json")
out["status_less"] = {"end_to_end": {"admitted": bool(ok), "why": why},
                      "kind_and_status_only": {"admitted": bool(okk),
                                               "why": whyk}}

json.dump(out, sys.stdout, indent=2, sort_keys=True, ensure_ascii=False)
sys.stdout.write("\n")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""What the live checker WOULD accept.  Calls the plan tool's own functions;
mutates nothing (no verb is invoked, only the predicates are asked)."""
import importlib.machinery
import importlib.util
import os
import sys

spec = importlib.util.spec_from_loader(
    "pm", importlib.machinery.SourceFileLoader(
        "pm", "/Users/svendaneel/.local/bin/plan"))
pm = importlib.util.module_from_spec(spec)
sys.argv = ["plan"]
spec.loader.exec_module(pm)
p = pm.load("/Users/svendaneel/okam/Web-modules/docs/plan")
pm.parse(p)

CANDIDATES = [
    "artifacts",
    "artifacts/",
    "artifacts/journeys/",
    "artifacts/journeys/modal-scroll-lock.playwright.json",
    "artifacts/journeys/growth-newsletter-send-gate.playwright.json",
    "artifacts/journeys/training-course-to-evidence.playwright.json",
]

TARGETS = ["FT-WORKFORCE", "FT-MARGIN", "FT-EVENTS", "FT-MEALS",
           "FT-TRAINING", "FT-GROWTH"]

print("Would `plan verify <FT> --evidence <X>` be admitted?")
print("(evidence_admissible = the exact predicate cmd_verify calls)\n")
hdr = "%-14s" % "" + "".join("%-14s" % c.split("/")[-1][:13]
                             for c in CANDIDATES)
print(hdr)
for tid in TARGETS:
    e = p.entities[tid]
    row = "%-14s" % tid
    for c in CANDIDATES:
        ok, why = pm.evidence_admissible(p, c, ent=e)
        row += "%-14s" % ("ADMITTED" if ok else "refused")
    print(row)

print("\nrefusal reasons, where any:")
for tid in TARGETS[:1]:
    e = p.entities[tid]
    for c in CANDIDATES:
        ok, why = pm.evidence_admissible(p, c, ent=e)
        print("  %-64s %s" % (c, "ADMITTED" if ok else "refused: " + why))

print("\nAnd what each of those artifacts says about itself:")
import json
for c in CANDIDATES:
    a = os.path.join(p.repo_root, c)
    if os.path.isdir(a):
        print("  %-64s DIRECTORY (%d entries)" % (c, len(os.listdir(a))))
    elif os.path.exists(a):
        d = json.load(open(a))
        print("  %-64s status: %s" % (c, d.get("status")))
    else:
        print("  %-64s does not exist" % c)

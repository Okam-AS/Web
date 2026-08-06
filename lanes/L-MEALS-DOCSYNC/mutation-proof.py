#!/usr/bin/env python3
"""Prove docsync-guard.py is not vacuous: reintroduce each false claim, watch it RED, restore, GREEN.

Four mutations, one per rule, each reintroducing the claim IN DIFFERENT WORDS from the sentence the
lane deleted -- because a guard keyed to one literal is defeated by a rewording, and that is exactly
the failure mode this proof exists to exclude.

A fifth mutation attacks the guard's OWN escape hatches: it strips the dated closure from the
freeze-frame ledger, which must make the preserved historical row start firing again.

Per item: MUTANT -> expect RED, RESTORE -> expect GREEN. Both recorded.
"""
import os
import shutil
import subprocess
import sys
import time

# The roots MUST be the ones the guard will scan, or the proof plants mutations in one tree and
# measures another -- which is exactly what happened on the first run after the guard gained
# overridable roots: M3 and M4 reported GREEN against a mutated file the guard could not see. A
# harness that can silently disagree with the thing it proves is worse than no harness.
BE = os.environ.get("DOCSYNC_BE", "/Users/svendaneel/okam/wt-mealsdocsync")
FE = os.environ.get("DOCSYNC_FE", "/Users/svendaneel/okam/Web-modules")
GUARD = "/Users/svendaneel/okam/Web-modules/lanes/L-MEALS-DOCSYNC/docsync-guard.py"

MUTATIONS = [
    dict(
        id="M1-OPTIONS-BOUND",
        path=os.path.join(BE, "Scripts/demo/RUNBOOK.md"),
        anchor="### What you cannot walk, and why it is not a seeding gap",
        inject="\nThe `Features:Meals` section is never bound in this build.\n",
        note="reworded: the deleted text said `Configure<MealsFeatureSettings>` is never called",
    ),
    dict(
        id="M2-AGREEMENT-CREATE",
        path=os.path.join(BE, "WebApi.Tests/Meals/MEALS-MEMBERSHIP-JOURNEY-MANIFEST.md"),
        anchor="## Authored here (new)",
        inject="\nNote: agreements have no create endpoint, so step 2 must stay a fixture.\n",
        note="reworded: the deleted text said 'no agreement-create endpoint in v1'",
    ),
    dict(
        id="M3-RESERVATION-TOKEN",
        path=os.path.join(FE, "utils/meals/meals-client.js"),
        anchor="import",
        inject="\n// The funding path is unusable: it needs a reservation token no cart in this estate sends.\n",
        note="planted in a DIFFERENT file from the two the lane corrected",
    ),
    dict(
        id="M4-INVITATION-CLAIM",
        path=os.path.join(FE, "components/admin/meals/MealsPeoplePanel.vue"),
        anchor="<script",
        inject="\n// Enrolment has no candidates: no client in the estate claims one.\n",
        note="planted in a DIFFERENT file from the one the lane corrected",
    ),
    dict(
        id="M5-CLOSURE-STRIPPED",
        path=os.path.join(BE, "docs/plans/replan/b-meals-completeness.md"),
        replace=("closed by", "superseded around"),
        note="strips the dated closure from the freeze-frame ledger; the preserved F3 row must fire",
    ),
]


def run_guard():
    env = dict(os.environ, DOCSYNC_BE=BE, DOCSYNC_FE=FE)
    p = subprocess.run([sys.executable, GUARD], capture_output=True, text=True, env=env)
    return p.returncode, p.stdout


def apply_mutation(m):
    shutil.copy2(m["path"], m["path"] + ".docsyncbak")
    with open(m["path"], "r", encoding="utf-8") as fh:
        text = fh.read()
    if "replace" in m:
        old, new = m["replace"]
        if old not in text:
            raise SystemExit("MUTATION %s could not apply: %r absent from %s" % (m["id"], old, m["path"]))
        text = text.replace(old, new)
    else:
        if m["anchor"] not in text:
            raise SystemExit("MUTATION %s could not apply: anchor absent from %s" % (m["id"], m["path"]))
        text = text.replace(m["anchor"], m["anchor"] + m["inject"], 1)
    with open(m["path"], "w", encoding="utf-8") as fh:
        fh.write(text)


def restore(m):
    shutil.move(m["path"] + ".docsyncbak", m["path"])
    # mtime hygiene: a restore that preserves an old timestamp has bitten this estate before.
    os.utime(m["path"], (time.time(), time.time()))


def main():
    rc, out = run_guard()
    print("=== BASELINE ===")
    print("    guard exit %d -> %s" % (rc, "GREEN" if rc == 0 else "RED"))
    if rc != 0:
        print(out)
        raise SystemExit("baseline is not green; nothing below would mean anything")

    failures = []
    for m in MUTATIONS:
        print()
        print("--- %s : %s" % (m["id"], os.path.relpath(m["path"], os.path.dirname(m["path"]) + "/..")))
        print("    %s" % m["note"])
        apply_mutation(m)
        rc_mut, out_mut = run_guard()
        hits = [l.strip() for l in out_mut.splitlines()
                if l.strip().startswith(("OPTIONS-BOUND", "AGREEMENT-CREATE",
                                         "RESERVATION-TOKEN", "INVITATION-CLAIM"))
                and ":" in l]
        print("    mutant   -> %s (exit %d)" % ("RED" if rc_mut else "GREEN", rc_mut))
        for h in hits:
            print("      caught: %s" % h)
        restore(m)
        rc_res, _ = run_guard()
        print("    restored -> %s (exit %d)" % ("RED" if rc_res else "GREEN", rc_res))
        if rc_mut == 0:
            failures.append(m["id"] + " DID NOT RED")
        if rc_res != 0:
            failures.append(m["id"] + " DID NOT RETURN TO GREEN")

    print()
    if failures:
        for f in failures:
            print("VACUOUS: " + f)
        return 1
    print("=== ALL %d MUTATIONS RED, ALL RESTORES GREEN ===" % len(MUTATIONS))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
NON-VACUITY PROOF for the two Workforce journey walks.

A walk that only ever goes green proves an exit code. Each mutation below breaks ONE thing the walk
claims to observe, and the walk must go red AT A NAMED STEP — the step number is recorded, not just
the failure, because "it went red" and "it went red where the claim lives" are different results.

The tree is restored and RE-VERIFIED GREEN between mutations, so a mutant that failed to apply, or a
restore that failed to restore, cannot be mistaken for a proof.

Run from the worktree root:  python3 mutation-proof.py
"""

import json
import os
import shutil
import subprocess
import sys

ROOT = "/Users/svendaneel/okam/wt-jwf"
LANE = "/Users/svendaneel/okam/Web-modules/lanes/L-JOURNEY-WORKFORCE"
ENV = dict(os.environ, E2E_WEB_PORT="3974", E2E_FIXTURE_PORT="4974")

FIXTURE = os.path.join(ROOT, "test/e2e/fixture/api-server.js")
ATTENDANCE_VIEW = os.path.join(ROOT, "utils/workforce-rates/attendance-view.js")


def run(spec):
    """Drive a real playwright child and read its EXIT STATUS, plus the artifact it filed."""
    proc = subprocess.run(
        ["npx", "playwright", "test", spec],
        cwd=ROOT, env=ENV, capture_output=True, text=True, timeout=900,
    )
    name = os.path.basename(spec).replace(".spec.js", "")
    artifact = os.path.join(ROOT, "artifacts/journeys", name + ".playwright.json")
    failed_step = None
    status = None
    try:
        with open(artifact) as fh:
            doc = json.load(fh)
        status = doc.get("status")
        for step in doc.get("steps", []):
            if step.get("status") == "failed":
                failed_step = "%d · %s" % (step["n"], step["name"])
                break
    except Exception as exc:  # noqa: BLE001
        failed_step = "<artifact unreadable: %s>" % exc
    return proc.returncode, status, failed_step


def patch(path, old, new):
    with open(path) as fh:
        body = fh.read()
    if old not in body:
        raise SystemExit("MUTATION DID NOT APPLY (anchor absent) in %s:\n%s" % (path, old[:120]))
    with open(path, "w") as fh:
        fh.write(body.replace(old, new, 1))


def snapshot(paths):
    return {p: open(p).read() for p in paths}


def restore(saved):
    for path, body in saved.items():
        with open(path, "w") as fh:
            fh.write(body)


# Each mutation: (label, file, anchor, replacement, spec, the step it must red at)
MUTATIONS = [
    (
        "M1 the inbox stops deriving from published revisions (its state before this lane)",
        FIXTURE,
        "return send(res, 200, { items: publicationsFor(caller.id) });",
        "return send(res, 200, { items: [] });",
        "test/e2e/journeys/workforce-week-run.spec.js",
        "the publication notice is on the worker's screen at all",
    ),
    (
        "M2 #44 claims every acknowledgement is a replay",
        FIXTURE,
        "      alreadyAcknowledged: already",
        "      alreadyAcknowledged: true",
        "test/e2e/journeys/workforce-week-run.spec.js",
        "the worker confirms, and the server records it",
    ),
    (
        "M3 acknowledging stops implying seen, so the notice would NOT vanish",
        FIXTURE,
        "    state.publicationReads[key] = true;\n    return send(res, 200, {\n      schedulePublicationId: publicationId,",
        "    return send(res, 200, {\n      schedulePublicationId: publicationId,",
        "test/e2e/journeys/workforce-week-run.spec.js",
        "...and the confirmation vanishes without a trace on screen",
    ),
]


def main():
    specs = ["test/e2e/journeys/workforce-week-run.spec.js"]
    if os.path.exists(os.path.join(ROOT, "test/e2e/journeys/workforce-punch-correction.spec.js")):
        specs.append("test/e2e/journeys/workforce-punch-correction.spec.js")
        MUTATIONS.extend(CORRECTION_MUTATIONS)

    saved = snapshot([FIXTURE, ATTENDANCE_VIEW])
    report = []

    for spec in specs:
        code, status, _ = run(spec)
        report.append("BASELINE %-46s exit=%d artifact=%s" % (os.path.basename(spec), code, status))
        if code != 0:
            report.append("  !! baseline is not green; every mutation below would be meaningless")

    for label, path, old, new, spec, expected_step in MUTATIONS:
        patch(path, old, new)
        code, status, failed_step = run(spec)
        held = code != 0 and expected_step in (failed_step or "")
        report.append(
            "%-4s %s\n     exit=%d artifact=%s\n     red at: %s\n     VERDICT: %s"
            % (label.split()[0], label[3:], code, status, failed_step,
               "HELD (red at the claim)" if held
               else ("RED, BUT NOT WHERE EXPECTED" if code != 0 else "!! DID NOT RED — the walk is vacuous here"))
        )
        restore(saved)
        code, status, _ = run(spec)
        report.append("     restored → exit=%d artifact=%s" % (code, status))
        if code != 0:
            report.append("     !! restore did not return the tree to green; later results are unsafe")

    text = "\n".join(report)
    print(text)
    with open(os.path.join(LANE, "mutation-proof.txt"), "w") as fh:
        fh.write(text + "\n")


# The two withholding points for the clock-session id, at DIFFERENT layers. The brief's mutation is
# the server one; the projector one is included because `toRow`/`toSession` allowlist fields by name,
# so the id can be dropped on the way in even when the server sent it, and only one of these two is
# the "read" in any given reading of the sentence.
CORRECTION_MUTATIONS = [
    (
        "M4 the SERVER withholds clockSessionId from rows[].sessions[]",
        FIXTURE,
        "          sessions: [{\n            clockSessionId: session.clockSessionId,",
        "          sessions: [{",
        "test/e2e/journeys/workforce-punch-correction.spec.js",
        "the punches behind the rows each name a clock session",
    ),
    (
        "M5 the CLIENT projector drops clockSessionId on the way in",
        ATTENDANCE_VIEW,
        "    clockSessionId: session.clockSessionId || null,",
        "    clockSessionId: null,",
        "test/e2e/journeys/workforce-punch-correction.spec.js",
        "the punches behind the rows each name a clock session",
    ),
]

if __name__ == "__main__":
    main()

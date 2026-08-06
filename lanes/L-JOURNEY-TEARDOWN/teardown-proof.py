# DOES THE TEARDOWN ITSELF LOWER THE LEVER -- WITHOUT THE LEASE HELPING?
#
# `kill-proof.py` proves the KILLED case, and in that case the lease does the work: the process runs
# no further line, so the fixture's socket-close is necessarily what lowered the flag. That leaves
# the ordinary case unproven, and the ordinary case is the one the exit criterion is mostly about --
# a walk that throws, times out or fails an assertion and never reaches its own last step.
#
# So this suppresses the LEASE and does not kill anything. Whatever lowers the lever here can only be
# the `journey` fixture's teardown, because nothing else is left.
#
#   ARM C   lease suppressed, run to its natural end   the teardown must lower the lever
#   ARM D   lease suppressed AND release suppressed    the control; the lever must stay up
#
# ARM D is what this tree did before this lane: a walk that ends -- however it ends -- with the
# module still switched on.
#
# The walk's own PASS/FAIL is not the subject and is reported but not asserted. A failing walk that
# gives the lever back is exactly the case being proven; requiring it to pass would be requiring the
# happy path again.

import json
import os
import subprocess
import sys
import time
import urllib.request

ROOT = "/Users/svendaneel/okam/wt-jteardown"
FIXTURE = "http://127.0.0.1:4973"
JOURNEY = "test/e2e/journeys/events-enquiry-to-settlement.spec.js"
JOURNEY_JS = os.path.join(ROOT, "test/e2e/support/journey.js")

ENV = dict(os.environ, E2E_WEB_PORT="3973", E2E_FIXTURE_PORT="4973",
           E2E_BASE_URL="http://127.0.0.1:3973")

LEASE_ON = "    if (meta.backend === 'fixture') { await recorder.levers.lease(); }"
LEASE_OFF = "    // PROOF: lease suppressed. if (meta.backend === 'fixture') { await recorder.levers.lease(); }"
REL_ON = "        leverReport = await recorder.levers.release();"
REL_OFF = "        leverReport = { cleared: [], failed: [] }; // PROOF: release suppressed"


def held():
    with urllib.request.urlopen(FIXTURE + "/__fixture/levers/held", timeout=5) as r:
        return json.loads(r.read().decode())


def reset():
    req = urllib.request.Request(FIXTURE + "/__fixture/reset", method="POST")
    with urllib.request.urlopen(req, timeout=5) as r:
        r.read()


def patch(lease, release):
    src = open(JOURNEY_JS, encoding="utf-8").read()
    src = src.replace(LEASE_OFF, LEASE_ON) if lease else src.replace(LEASE_ON, LEASE_OFF)
    src = src.replace(REL_OFF, REL_ON) if release else src.replace(REL_ON, REL_OFF)
    open(JOURNEY_JS, "w", encoding="utf-8").write(src)
    text = open(JOURNEY_JS, encoding="utf-8").read()
    assert (LEASE_ON in text) == lease, "lease patch did not apply"
    assert (REL_ON in text) == release, "release patch did not apply"


def run_arm(name, release_on, expect_lowered):
    print("=" * 78)
    print("ARM %s -- lease SUPPRESSED, teardown release %s" % (name, "ON" if release_on else "SUPPRESSED"))
    print("=" * 78)
    patch(lease=False, release=release_on)

    reset()
    baseline = set(held()["overrides"])
    print("  world reset. seeded overrides: %s" % sorted(baseline))

    started = time.time()
    proc = subprocess.run(["npx", "playwright", "test", JOURNEY, "--reporter=line"],
                          cwd=ROOT, env=ENV, capture_output=True, timeout=900)
    tail = proc.stdout.decode(errors="replace").strip().splitlines()
    walk = next((l for l in reversed(tail) if "passed" in l or "failed" in l), "?")
    print("  the walk ended in %ds: %s" % (time.time() - started, walk.strip()))

    after = held()
    raised_by_walk = set(after["overrides"]) - baseline
    seed_intact = baseline.issubset(set(after["overrides"]))
    print("  after the walk, the world holds: %s" % sorted(after["overrides"]))
    print("    left up beyond the seed: %s" % (sorted(raised_by_walk) or "nothing"))
    print("    the seeded override survived: %s" % seed_intact)

    lowered = not raised_by_walk
    ok = (lowered == expect_lowered) and seed_intact
    print("  verdict: %s -- levers %s, expected %s" % (
        "AS PREDICTED" if ok else "NOT AS PREDICTED",
        "LOWERED" if lowered else "STILL UP",
        "LOWERED" if expect_lowered else "STILL UP"))
    return {"arm": name, "ok": ok, "lowered": lowered, "walk": walk.strip(),
            "left_up": sorted(raised_by_walk), "seed_intact": seed_intact}


def main():
    original = open(JOURNEY_JS, encoding="utf-8").read()
    results = []
    try:
        results.append(run_arm("C", release_on=True, expect_lowered=True))
        results.append(run_arm("D", release_on=False, expect_lowered=False))
    finally:
        open(JOURNEY_JS, "w", encoding="utf-8").write(original)
        print("\n%s restored byte-for-byte: %s" % (
            os.path.basename(JOURNEY_JS),
            open(JOURNEY_JS, encoding="utf-8").read() == original))

    print("\n" + "=" * 78)
    for r in results:
        print("  ARM %s  %-14s walk=%-28s left-up=%s" % (
            r["arm"], "AS PREDICTED" if r["ok"] else "NOT AS PREDICTED",
            r["walk"][:28], r["left_up"] or "nothing"))
    both = all(r["ok"] for r in results)
    print("  OVERALL: %s" % ("PROVEN" if both else "NOT PROVEN"))
    print("=" * 78)
    return 0 if both else 1


if __name__ == "__main__":
    sys.exit(main())

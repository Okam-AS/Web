# DOES A RUN THAT IS KILLED MID-WALK LEAVE A FLAG LIT?
#
# The exit criterion of this lane cannot be shown by a walk that completes -- a walk that completes
# is the case the old final step already handled. So this kills one for real, with SIGKILL, at the
# moment the browser has a module switch up, and then asks the fixture what the world looks like.
#
# SIGKILL and not SIGTERM on purpose. SIGTERM can be caught, and a proof that only survives a
# catchable signal is a proof about an exit handler. SIGKILL runs nothing at all, which is the claim
# being tested: that the cleanup does not depend on this process executing another line.
#
# TWO ARMS, because "the lever came down" is not evidence unless something would have left it up.
#
#   ARM A   as shipped                       the lease is open; the kill must lower the lever
#   ARM B   the lease line commented out     the control; the kill must LEAVE THE LEVER UP
#
# Arm B is the defect this lane closes, reproduced. Without it, arm A is equally well explained by
# "the fixture never had the flag on in the first place", which is the comfortable wrong answer.
#
# WHAT THIS IS AND IS NOT. It is a real browser, a real dev server, a real fixture and a real
# SIGKILL. It is NOT a live run: the backend is `test/e2e/fixture/api-server.js`, not SQL Server, and
# a live world holds its overrides in a database no lease is held on. No artifact from this claims
# `live` and no live run is claimed anywhere. The live half of this lane's residue is stated in the
# return rather than proven here.

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.request

ROOT = "/Users/svendaneel/okam/wt-jteardown"
FIXTURE = "http://127.0.0.1:4973"
WEB_PORT = "3973"
JOURNEY = "test/e2e/journeys/events-enquiry-to-settlement.spec.js"
JOURNEY_JS = os.path.join(ROOT, "test/e2e/support/journey.js")

ENV = dict(
    os.environ,
    E2E_WEB_PORT=WEB_PORT,
    E2E_FIXTURE_PORT="4973",
    E2E_BASE_URL="http://127.0.0.1:" + WEB_PORT,
)

LEASE_LINE = "    if (meta.backend === 'fixture') { await recorder.levers.lease(); }"
LEASE_OFF = "    // ARM B CONTROL: lease suppressed. if (meta.backend === 'fixture') { await recorder.levers.lease(); }"


def get(path):
    with urllib.request.urlopen(FIXTURE + path, timeout=5) as r:
        return json.loads(r.read().decode())


def held():
    return get("/__fixture/levers/held")


def flags_raw():
    """What overrides the fixture is actually holding, straight from its own control surface."""
    return get("/__fixture/levers/held")


def reset():
    req = urllib.request.Request(FIXTURE + "/__fixture/reset", method="POST")
    with urllib.request.urlopen(req, timeout=5) as r:
        r.read()


def run_arm(name, expect_lowered):
    print("=" * 78)
    print("ARM %s -- the lease is %s" % (name, "OPEN (as shipped)" if expect_lowered else "SUPPRESSED (control)"))
    print("=" * 78)

    reset()
    # THE BASELINE IS NOT EMPTY. `freshState()` seeds one override of its own (`Events.Core` on the
    # guest venue), so "the world has overrides" is true before the walk starts. What matters is what
    # the WALK adds, and whether that is still there after the kill -- and, just as much, whether the
    # seeded one is still there, because a cleanup that gives back more than it took is its own bug.
    baseline = set(held()["overrides"])
    print("  world reset. seeded overrides (must SURVIVE the kill): %s" % sorted(baseline))

    proc = subprocess.Popen(
        ["npx", "playwright", "test", JOURNEY, "--reporter=line"],
        cwd=ROOT, env=ENV, start_new_session=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )

    # Wait until the browser has actually RAISED something the walk did not inherit. Killing before
    # that would prove nothing; killing at a fixed time would be a race that reads differently on a
    # slow laptop. Read from the WORLD, not from the lease -- see the fixture route's own comment.
    new_keys = set()
    deadline = time.time() + 240
    while time.time() < deadline:
        try:
            state = held()
        except Exception:
            state = {"overrides": []}
        grown = set(state["overrides"]) - baseline
        if grown:
            new_keys = grown
            break
        if proc.poll() is not None:
            print("  !! the run ended before it raised anything -- no kill was possible")
            print(proc.stdout.read().decode(errors="replace")[-2500:])
            return {"arm": name, "verdict": "INCONCLUSIVE", "raised": [], "after": []}
        time.sleep(0.25)

    if not new_keys:
        print("  !! timed out waiting for the walk to raise a lever")
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            pass
        return {"arm": name, "verdict": "INCONCLUSIVE", "raised": [], "after": []}

    pgid = os.getpgid(proc.pid)
    print("  the walk has RAISED (beyond the seed): %s" % sorted(new_keys))
    print("  ...SIGKILL to process group %d, mid-walk" % pgid)
    os.killpg(pgid, signal.SIGKILL)
    proc.wait()

    # The socket close travels to the fixture asynchronously. A short wait only: anything needing
    # seconds here is a timeout somewhere, not a socket close.
    time.sleep(1.5)
    after = held()
    still_up = sorted(set(after["overrides"]) & new_keys)
    seed_intact = baseline.issubset(set(after["overrides"]))
    print("  after the kill, the world holds: %s" % sorted(after["overrides"]))
    print("    of what the walk raised, still up: %s" % (still_up or "nothing"))
    print("    the seeded override survived:      %s" % seed_intact)

    lowered = not still_up
    ok = (lowered == expect_lowered) and seed_intact
    print("  verdict: %s -- levers %s, expected %s%s" % (
        "AS PREDICTED" if ok else "NOT AS PREDICTED",
        "LOWERED" if lowered else "STILL UP",
        "LOWERED" if expect_lowered else "STILL UP",
        "" if seed_intact else "; AND THE SEEDED OVERRIDE WAS DESTROYED"))
    return {"arm": name, "verdict": "AS PREDICTED" if ok else "NOT AS PREDICTED",
            "raised": sorted(new_keys), "after": still_up, "lowered": lowered,
            "seed_intact": seed_intact}


def set_lease(enabled):
    src = open(JOURNEY_JS, encoding="utf-8").read()
    if enabled:
        src = src.replace(LEASE_OFF, LEASE_LINE)
    else:
        src = src.replace(LEASE_LINE, LEASE_OFF)
    open(JOURNEY_JS, "w", encoding="utf-8").write(src)


def main():
    original = open(JOURNEY_JS, encoding="utf-8").read()
    results = []
    try:
        set_lease(True)
        results.append(run_arm("A", expect_lowered=True))

        set_lease(False)
        results.append(run_arm("B", expect_lowered=False))
    finally:
        # The file goes back byte for byte, whatever happened above.
        open(JOURNEY_JS, "w", encoding="utf-8").write(original)
        print("\n%s restored byte-for-byte: %s" % (
            os.path.basename(JOURNEY_JS),
            open(JOURNEY_JS, encoding="utf-8").read() == original))

    print("\n" + "=" * 78)
    for r in results:
        print("  ARM %s  %-16s raised=%s  still-up-after-kill=%s  seed-intact=%s" % (
            r["arm"], r["verdict"], r["raised"], r["after"] or "nothing",
            r.get("seed_intact")))
    both = all(r["verdict"] == "AS PREDICTED" for r in results)
    print("  OVERALL: %s" % ("PROVEN" if both else "NOT PROVEN"))
    print("=" * 78)
    return 0 if both else 1


if __name__ == "__main__":
    sys.exit(main())

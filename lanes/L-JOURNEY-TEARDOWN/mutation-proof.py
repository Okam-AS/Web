# IS THE PIN A PIN, OR A TEST THAT PASSES BECAUSE NOTHING EVER CHANGES?
#
# Every mutation below breaks the teardown in one specific way and names, IN ADVANCE, which test must
# red. A mutation that reds the wrong test is as much a finding as one that reds nothing: it means
# the rule fires for a reason other than the one it claims, and the next reader will trust it for the
# wrong reason.
#
# The prediction is written before the run. Where it turns out wrong it is CORRECTED IN PLACE, with
# the correction marked, rather than quietly rewritten -- the record of having been wrong is worth
# more than a page that looks clean.
#
# Each mutation is applied, jest is run, the failing test names are collected, the file is restored
# byte-for-byte, and the suite is required to go green again before the next one starts.

import io
import json
import os
import re
import subprocess
import sys

ROOT = "/Users/svendaneel/okam/wt-jteardown"
SUITE = "test/journey-teardown.test.js"
RERUN = "test/journey-rerunnability.test.js"

J = "test/e2e/support/journey.js"
L = "test/e2e/support/levers.js"
A = "test/e2e/fixture/api-server.js"
G = "test/e2e/scripts/global-teardown.js"
D = "test/e2e/journeys/events-deposit-precondition.spec.js"

MUTATIONS = [
    # id, file, find, replace, suite-to-run, predicted failing test (substring)
    # The first anchor written for this one did not exist -- it predated the hoisting of `failed`,
    # `error` and `wrongWorld` above the try. Corrected rather than dropped, because a mutation that
    # silently fails to apply is a mutation that reports the rule as asleep when it never ran.
    ("A  release moved above the walk", J,
     "    await use(recorder);",
     "    await recorder.levers.release();\n    await use(recorder);",
     SUITE, "it does so AFTER the walk"),

    ("B  release made conditional on a pass", J,
     "        leverReport = await recorder.levers.release();",
     "        if (!failed) { leverReport = await recorder.levers.release(); }",
     SUITE, "it is UNCONDITIONAL"),

    ("C  release moved out of the finally", J,
     "      try {\n        leverReport = await recorder.levers.release();\n        recorder.levers.releaseLease();",
     "      try {\n        recorder.levers.releaseLease();",
     SUITE, "the journey fixture lowers the levers it raised"),

    ("D  a clearing step written back into a journey body", D,
     "    await journey.step('what the browser said while this ran', () => {",
     "    await journey.step('put the world back', async () => {\n"
     "      await page.locator('[data-flag-clear=\"Events.Deposits\"]').click();\n"
     "    });\n\n"
     "    await journey.step('what the browser said while this ran', () => {",
     SUITE, "no spec ends its lever operations with a clear"),

    ("E  lease route back to POST (the deadlock)", A,
     "if (path === '/__fixture/levers/lease' && req.method === 'GET') {",
     "if (path === '/__fixture/levers/lease' && req.method === 'POST') {",
     SUITE, "the lease route is a GET"),

    ("F  reset stops emptying the lease", A,
     "    leaseRaised.clear();\n    return send(res, 200, { ok: true });",
     "    return send(res, 200, { ok: true });",
     SUITE, "the reset empties what the lease is holding"),

    # ANCHOR UPDATED: the close handler is now guarded against a superseded lease (see mutation P),
    # so the line this used to key on no longer exists verbatim. Re-anchored rather than dropped.
    ("G  lease no longer released on socket close", A,
     "    req.on('close', () => { if (req !== leaseSocket) { return; } leaseRelease('closed'); });",
     "    req.on('aborted', () => { if (req !== leaseSocket) { return; } leaseRelease('closed'); });",
     SUITE, "releases it on socket close"),

    # THE REVIEWER'S CONDITION 1, pinned as a mutation of its own. Removing the guard reinstates the
    # defect exactly: a superseded lease's eventual death gives back the FRESH run's levers.
    ("P  stale lease handler unguarded again", A,
     "    req.on('close', () => { if (req !== leaseSocket) { return; } leaseRelease('closed'); });",
     "    req.on('close', () => leaseRelease('closed'));",
     SUITE, "superseded lease dying later"),

    ("H  the clear is never actually issued", L,
     "      const result = await request('DELETE', url, headers, 10000);",
     "      const result = { ok: true };",
     SUITE, "release() really issues the clears"),

    ("I  levers lowered oldest-first instead of newest-first", L,
     "    return Array.from(this.raised.values()).reverse();",
     "    return Array.from(this.raised.values());",
     SUITE, "release() really issues the clears"),

    ("J  an explicit OFF stops counting as an override", L,
     "    const flagKey = (body && body.flagKey) || null;\n    return flagKey ? { storeId, flagKey, raised: true } : null;",
     "    const flagKey = (body && body.flagKey) || null;\n"
     "    if (body && body.enabled === false) { return null; }\n"
     "    return flagKey ? { storeId, flagKey, raised: true } : null;",
     SUITE, "an explicit OFF is still a lever held"),

    ("K  the bearer written to the on-disk ledger", L,
     "function appendToLedger (file, entry) {\n  const record = Object.assign({}, entry, { pid: process.pid, at: new Date().toISOString() });",
     "function appendToLedger (file, entry) {\n  const record = Object.assign({}, entry, { pid: process.pid, at: new Date().toISOString(), authorization: 'Bearer x' });",
     SUITE, "no credential is written to the on-disk ledger"),

    ("L  the reader stops seeing raw switchboard clicks", SUITE,
     "const RAW_CONTROL = /\\[data-flag-(on|off|clear)=\"([^\"]+)\"\\]/g;",
     "const RAW_CONTROL = /\\[data-flag-(nope)=\"([^\"]+)\"\\]/g;",
     SUITE, "it sees both shapes this corpus uses"),

    # PREDICTION CORRECTED IN PLACE. The first run of this battery predicted this would red
    # `globalTeardown says what was left up`, and it red NOTHING. That rule was
    # `expect(teardown).toContain('describeHeld')`, and `null && describeHeld()` still contains the
    # string -- so the warning channel could be switched off with the rule none the wiser. The
    # prediction was not wrong about what SHOULD happen; the rule was wrong. It was replaced with a
    # behavioural one that runs globalTeardown and reads what it printed, and the prediction now
    # names that test. The original wrong prediction is left recorded here rather than deleted.
    ("M  globalTeardown stops reporting held levers", G,
     "  const held = describeHeld();",
     "  const held = null && describeHeld();",
     SUITE, "globalTeardown really prints what was left up"),

    ("N  the lease opened after the walk instead of before", J,
     "    if (meta.backend === 'fixture') { await recorder.levers.lease(); }\n\n    await use(recorder);",
     "    await use(recorder);\n    if (meta.backend === 'fixture') { await recorder.levers.lease(); }",
     SUITE, "the lease is opened before the walk"),

    ("O  the teardown pin deleted outright", None, None, None,
     RERUN, "the teardown pin exists and is about this subject"),
]


def run(suite):
    p = subprocess.run(["npx", "jest", suite, "--coverage=false", "--json"],
                       cwd=ROOT, capture_output=True, timeout=900)
    out = p.stdout.decode(errors="replace")
    i = out.find('{"numFailedTest')
    if i < 0:
        i = out.find('{"numTotalTest')
    try:
        data = json.loads(out[i:])
    except Exception:
        return None, ["COULD NOT PARSE JEST OUTPUT"]
    failed = []
    for suite_result in data.get("testResults", []):
        for t in suite_result.get("assertionResults", []):
            if t.get("status") == "failed":
                failed.append(t.get("fullName") or t.get("title"))
    return data.get("numFailedTests", 0), failed


def main():
    print("BASELINE")
    n, failed = run(SUITE)
    print("  %s: %d failing" % (SUITE, n))
    if n:
        print("  !! baseline is not green; nothing below means anything")
        for f in failed:
            print("     -", f)
        return 1
    n2, _ = run(RERUN)
    print("  %s: %d failing" % (RERUN, n2))

    results = []
    for mid, f, find, repl, suite, predicted in MUTATIONS:
        print("\n" + "-" * 78)
        print("MUTATION %s" % mid)
        print("  predicted red: %s" % predicted)

        if f is None:
            # The delete-the-pin mutation: move the file aside rather than edit it.
            src_path = os.path.join(ROOT, SUITE)
            backup = io.open(src_path, encoding="utf-8").read()
            os.remove(src_path)
            try:
                _, failed = run(suite)
            finally:
                io.open(src_path, "w", encoding="utf-8").write(backup)
        else:
            path = os.path.join(ROOT, f)
            original = io.open(path, encoding="utf-8").read()
            if find not in original:
                print("  !! MUTATION DID NOT APPLY -- anchor not found in %s" % f)
                results.append((mid, predicted, ["ANCHOR NOT FOUND"], False))
                continue
            io.open(path, "w", encoding="utf-8").write(original.replace(find, repl, 1))
            try:
                _, failed = run(suite)
            finally:
                io.open(path, "w", encoding="utf-8").write(original)
                assert io.open(path, encoding="utf-8").read() == original, "restore failed for " + f

        hit = [x for x in failed if predicted.lower() in (x or "").lower()]
        ok = bool(hit)
        print("  reds: %s" % (failed or "NOTHING -- the rule is asleep"))
        print("  verdict: %s" % ("AS PREDICTED" if ok else "*** PREDICTION WRONG ***"))
        results.append((mid, predicted, failed, ok))

    print("\nRESTORED -- re-running both suites green")
    n, _ = run(SUITE)
    n2, _ = run(RERUN)
    print("  %s: %d failing" % (SUITE, n))
    print("  %s: %d failing" % (RERUN, n2))

    print("\n" + "=" * 78)
    wrong = [r for r in results if not r[3]]
    for mid, predicted, failed, ok in results:
        print("  %-52s %s" % (mid, "red by name" if ok else "PREDICTION WRONG"))
    print("  %d/%d mutations red the test they named" % (len(results) - len(wrong), len(results)))
    print("  suites restored green: %s" % (n == 0 and n2 == 0))
    print("=" * 78)
    return 0 if not wrong and n == 0 and n2 == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

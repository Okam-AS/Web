#!/usr/bin/env python3
"""Fixtures for trx_self_consistent — every shape the check must separate.

Each fixture is a minimal, synthetic trx written into ./fixtures/.  Nothing
here is copied out of a real artifact: no fixture token, no suite stdout, no
credential (C7).  Two of them are deliberate mirrors of the two real Failed
artifacts in this estate so the discrimination can be re-proved without
touching either worktree.

Run:  python3 trx_self_consistent.py --selftest
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")

HEAD = ('<?xml version="1.0" encoding="UTF-8"?>\n'
        '<TestRun id="00000000-0000-0000-0000-000000000000" name="fixture" '
        'xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">\n'
        '  <Times creation="2026-01-01T00:00:00.0+00:00" '
        'start="2026-01-01T00:00:00.0+00:00" finish="2026-01-01T00:01:00.0+00:00" />\n'
        '  <Results />\n')
TAIL = "</TestRun>\n"

COUNT_KEYS = ("total", "executed", "passed", "failed", "error", "timeout",
              "aborted", "inconclusive", "passedButRunAborted", "notRunnable",
              "notExecuted", "disconnected", "warning", "completed",
              "inProgress", "pending")


def trx(outcome, stdout="", runinfos=(), **counters):
    c = dict.fromkeys(COUNT_KEYS, 0)
    c.update(counters)
    attrs = " ".join('%s="%d"' % (k, c[k]) for k in COUNT_KEYS)
    body = [HEAD, '  <ResultSummary outcome="%s">\n' % outcome,
            "    <Counters %s />\n" % attrs]
    if stdout:
        body.append("    <Output>\n      <StdOut>%s</StdOut>\n    </Output>\n"
                    % stdout)
    for ri_outcome, text in runinfos:
        body.append('    <RunInfo computerName="fixture" outcome="%s" '
                    'timestamp="2026-01-01T00:00:30.0+00:00">\n'
                    "      <Text>%s</Text>\n    </RunInfo>\n"
                    % (ri_outcome, text))
    body.append("  </ResultSummary>\n")
    body.append(TAIL)
    return "".join(body)


ABORT_TEXT = ("The active test run was aborted. Reason: Test host process "
              "crashed : Unhandled exception. System.ObjectDisposedException")
FAIL_ECHO = "[xUnit.net 00:04:24.12] Fixture.Namespace.A_test_that_failed [FAIL]"
WARN_ECHO = "[xUnit.net 00:01:04.84] Fixture.Namespace.A_test_that_warned"

# (filename, expected verdict, why this case exists, content)
CASES = [
    ("abort-signature.trx", "REFUSE",
     "mirror of L-TRAIN-DISCLOSURE after.trx: Failed over a tally with no cause",
     trx("Failed", total=962, executed=960, passed=960,
         runinfos=[("Warning", WARN_ECHO), ("Error", ABORT_TEXT)])),

    ("abort-signature-no-runinfo.trx", "REFUSE",
     "the same contradiction with RunInfo stripped — the counters clause alone "
     "must still refuse it, so the check does not depend on the crash text",
     trx("Failed", total=962, executed=960, passed=960)),

    ("honest-red.trx", "RED",
     "mirror of L-COMPOSITION-ROOT-CHECK: Failed with failed=1, RunInfo Error "
     "echoing the [FAIL] line and no abort text — must NOT be refused",
     trx("Failed", total=4419, executed=4407, passed=4406, failed=1,
         runinfos=[("Warning", WARN_ECHO), ("Error", FAIL_ECHO)])),

    ("clean-pass.trx", "PASS",
     "the ordinary green receipt",
     trx("Completed", total=241, executed=241, passed=241)),

    ("clean-pass-with-skips.trx", "PASS",
     "total > executed because tests were skipped — green, and a rule keying "
     "on total==executed would have failed 23 of the 25 real receipts",
     trx("Completed", total=4372, executed=4360, passed=4360,
         runinfos=[("Warning", WARN_ECHO)] * 12)),

    ("green-over-failures.trx", "REFUSE",
     "the mirror contradiction: a clean verdict over a tally that is not clean",
     trx("Completed", total=100, executed=100, passed=98, failed=2)),

    ("abort-after-a-failure.trx", "REFUSE",
     "the case the outcome/counters comparison structurally cannot see: an "
     "abort that lands after a recorded failure, so outcome and tally agree. "
     "Only the RunInfo clause catches it.",
     trx("Failed", total=4419, executed=1200, passed=1199, failed=1,
         runinfos=[("Error", ABORT_TEXT)])),

    ("passed-but-run-aborted.trx", "REFUSE",
     "Completed while passedButRunAborted is set — the runner's own admission "
     "inside the counters",
     trx("Completed", total=500, executed=500, passed=500,
         passedButRunAborted=17)),

    ("abort-phrase-in-stdout-only.trx", "PASS",
     "a test that prints the abort phrase must not trip the RunInfo clause — "
     "the clause reads RunInfo Error/Aborted elements, never suite stdout",
     trx("Completed", total=10, executed=10, passed=10,
         stdout="a test wrote: " + ABORT_TEXT,
         runinfos=[("Warning", WARN_ECHO)])),

    ("runinfo-warning-only.trx", "PASS",
     "12 RunInfo elements and a clean run — proves RunInfo *presence* is not "
     "the signal (20 of the 25 real receipts carry RunInfo and are green)",
     trx("Completed", total=4411, executed=4399, passed=4399,
         runinfos=[("Warning", WARN_ECHO)] * 12)),

    ("counters-dont-add-up.trx", "REFUSE",
     "executed != passed+failed+error+timeout+inconclusive — a tally that "
     "contradicts itself before the outcome is even consulted",
     trx("Failed", total=120, executed=100, passed=100, failed=1)),

    ("long-stdout.trx", "REFUSE",
     "220 KB of run-level stdout inside ResultSummary forces the tail window "
     "to escalate past 64 KB; the contradiction must still be found",
     trx("Failed", total=962, executed=960, passed=960,
         stdout="x" * 220000,
         runinfos=[("Error", ABORT_TEXT)])),

    ("truncated.trx", "REFUSE",
     "a run killed before it wrote a ResultSummary is not evidence either",
     HEAD + "  <TestDefinitions />\n"),

    ("empty.trx", "REFUSE",
     "a zero-byte artifact",
     ""),
]


def run(judge):
    if not os.path.isdir(FIX):
        os.makedirs(FIX)
    bad = 0
    print("fixtures in %s\n" % FIX)
    for name, expect, why, content in CASES:
        path = os.path.join(FIX, name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        got = judge(path)["verdict"]
        ok = got == expect
        bad += 0 if ok else 1
        print("%-4s %-7s (expected %-7s) %s" % (
            "ok" if ok else "FAIL", got, expect, name))
        print("      %s" % why)
        if not ok:
            for r in judge(path)["reasons"]:
                print("      reason: %s" % r)
    print("\n%d fixtures, %d disagreed with the expected verdict" %
          (len(CASES), bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    from trx_self_consistent import judge
    sys.exit(run(judge))

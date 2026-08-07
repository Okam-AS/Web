#!/usr/bin/env python3
"""Judge a mutation sweep on what it EXECUTED, never on exit status alone.

The canonical runner records RED/STILL-GREEN from the suite command's exit code. That is not enough,
and this estate has now been bitten in both directions in one evening:

  false GREEN  several test paths passed as one argv -> the runner matched nothing, ran 0 tests,
               exited 0, and every mutation read as survived.
  false RED    a malformed anchor broke the source so it would not parse -> nothing loaded, exit was
               non-zero, and that read as a killed mutation. Six of six "red", two over zero tests.

So this script refuses to accept any sweep whose runs did not each execute the SAME NON-ZERO number
of tests as the baseline, and refuses any run that did not get as far as running tests at all
(BUILD = the mutant did not compile, which is the .NET equivalent of "the mutant does not parse";
STALE = --no-build would have measured the previous binary; ZERO = the filter matched nothing).

A mutation is only reported as killed if the suite ran the baseline count AND named at least one
failing test.
"""
import json
import re
import sys

log_path, results_path, expected_total = sys.argv[1], sys.argv[2], int(sys.argv[3])

lines = [l.strip() for l in open(log_path, encoding="utf-8") if l.strip()]
results = json.load(open(results_path, encoding="utf-8"))

problems = []
runs = []
for l in lines:
    if l.startswith(("BUILD", "STALE", "ZERO")):
        problems.append("a run never reached the tests: " + l)
        continue
    m = re.match(r"RUN total=(\d+) failed=(\d+) rc=(-?\d+) reddened=\[([^\]]*)\] filter=(.*)", l)
    if not m:
        problems.append("unparsable log line: " + l)
        continue
    runs.append({
        "total": int(m.group(1)),
        "failed": int(m.group(2)),
        "rc": int(m.group(3)),
        "names": [n for n in m.group(4).split(",") if n],
    })

if expected_total <= 0:
    problems.append("the baseline test count is %d - a sweep against zero tests proves nothing" % expected_total)

# runs[0] is the baseline invocation; the rest are one per mutation.
for i, r in enumerate(runs):
    if r["total"] != expected_total:
        problems.append("run %d executed %d tests, baseline is %d" % (i, r["total"], expected_total))

mutations = [r for r in results if r["outcome"] != "NOT-APPLIED"]
if len(runs) - 1 != len(mutations):
    problems.append("%d mutation runs reached the tests but the runner recorded %d mutations - "
                    "a mutation whose build failed is missing here and must not be read as killed"
                    % (len(runs) - 1, len(mutations)))

print("baseline test count : %d" % expected_total)
print("runs that reached the tests: %d (1 baseline + %d mutations)" % (len(runs), len(runs) - 1))
print()
for r, m in zip(runs[1:], results):
    killed = r["failed"] > 0 and r["total"] == expected_total
    print("%-6s %-14s failed=%d/%d  %s"
          % ("KILLED" if killed else "SURVIVED", m["name"], r["failed"], r["total"], ",".join(r["names"])))
    if not killed:
        problems.append("mutation survived: " + m["name"])

print()
if problems:
    print("NOT TRUSTWORTHY:")
    for p in problems:
        print("  - " + p)
    sys.exit(1)
print("every mutation executed the baseline count and named a failing test")

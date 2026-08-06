#!/usr/bin/env python3
"""Mutation proof for the signed trailing count.

Each mutant is applied to the PRODUCTION file, the suite is run, the mutant is restored and the
suite is run again. Every run reports the mtime of WebApi.dll -- the assembly the mutation moves --
because --no-build against a stale binary is exactly the trap this procedure is meant to close.
Nothing here uses --no-build; the mtime is read to prove the compile happened anyway.
"""

import os
import re
import subprocess
import sys
import time

WT = "/Users/svendaneel/okam/wt-xzprinted"
PROD = os.path.join(WT, "Services/Kassa/EscPosXZReportBuilder.cs")
ASSEMBLY = os.path.join(WT, "WebApi.Tests/bin/Debug/net8.0/WebApi.dll")
FILTER = "Database!=SqlServer&FullyQualifiedName~WebApi.Tests.Kassa"

# (name, what it removes, needle, replacement)
MUTANTS = [
    (
        "M1-revert-the-sign-allowance",
        "the named change itself: a trailing count must be all digits again",
        "var first = label[open + 1] == '-' ? open + 2 : open + 1;",
        "var first = open + 1;",
    ),
    (
        "M2-drop-the-at-least-one-digit-rule",
        "the guard that keeps '( )' and '(-)' from counting as a figure",
        "if (first >= label.Length - 1)\n            {\n                return null;\n            }",
        "if (false)\n            {\n                return null;\n            }",
    ),
    (
        "M3-protect-any-trailing-parenthesis",
        "the digit test, so 'Kort (Stripe)' would be protected as if it were a figure",
        "if (!char.IsDigit(label[i]))",
        "if (false)",
    ),
    (
        "M4-stop-excluding-the-count-from-the-cut",
        "the choke point: FitKeepingCount degraded to plain Fit",
        "var count = TrailingCount(label);\n            if (count == null || count.Length > width)",
        "var count = TrailingCount(label);\n            if (true)",
    ),
]


def toplevel():
    return subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], cwd=WT, capture_output=True, text=True
    ).stdout.strip()


def assembly_mtime():
    if not os.path.exists(ASSEMBLY):
        return "absent"
    return time.strftime("%H:%M:%S", time.localtime(os.path.getmtime(ASSEMBLY)))


def run_suite():
    # HARNESS FIX. The first pass read the failing test NAMES out of proc.stdout and reported "(none)"
    # under a mutant that had just failed 34 tests. dotnet test writes its "Failed!/Passed!" summary to
    # stdout but the per-test "[xUnit.net ...] <name> [FAIL]" lines to stderr, so the name list was
    # searching a stream that never contains them. Both streams are read now. The counts were never
    # wrong (they come from the summary line), but a harness that reports "no red tests" beside
    # "34 failing" is a harness that has to be fixed before its silence is worth anything.
    proc = subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj", "--filter", FILTER],
        cwd=WT,
        capture_output=True,
        text=True,
    )
    both = proc.stdout + "\n" + proc.stderr
    tail = [l for l in both.splitlines() if l.startswith(("Passed!", "Failed!"))]
    summary = tail[-1] if tail else "NO SUMMARY: " + both.splitlines()[-1][:120]
    failed = re.findall(r"Failed:\s+(\d+)", summary)
    names = sorted(set(re.findall(r"^\s+Failed\s+(\S.*?)\s+\[[^\]]+\]\s*$", both, re.M)))
    return summary, int(failed[0]) if failed else -1, names


def write(text):
    with open(PROD, "w") as handle:
        handle.write(text)
    # A copy that preserves the original timestamp gives the restored source an mtime older than the
    # existing output and MSBuild then skips the compile. Writing content advances it; touch anyway.
    os.utime(PROD, None)


def main():
    if toplevel() != WT:
        sys.exit("REFUSING: git toplevel is " + toplevel() + ", not " + WT)

    with open(PROD) as handle:
        original = handle.read()

    print("worktree      " + WT)
    print("production    " + os.path.relpath(PROD, WT))
    print("filter        " + FILTER)
    print()

    baseline, baseline_failed, _ = run_suite()
    print("BASELINE  WebApi.dll " + assembly_mtime() + "  " + baseline)
    if baseline_failed != 0:
        sys.exit("REFUSING: the baseline is not green, so no mutation result would mean anything.")

    only = sys.argv[1] if len(sys.argv) > 1 else None
    verdicts = []
    for name, removes, needle, replacement in MUTANTS:
        if only is not None and not name.startswith(only):
            continue
        print()
        print("=" * 100)
        print(name)
        print("  removes: " + removes)

        if original.count(needle) != 1:
            print("  REACHED THE FILE: NO -- the needle matched "
                  + str(original.count(needle)) + " times, not once")
            verdicts.append((name, "NOT-APPLIED", "-", "-"))
            continue

        write(original.replace(needle, replacement))
        with open(PROD) as handle:
            mutated = handle.read()
        print("  reached the file: yes (" + str(len(original) - len(mutated)) + " chars changed)")

        summary, failed, names = run_suite()
        print("  MUTANT    WebApi.dll " + assembly_mtime() + "  " + summary)
        for test in names:
            print("      red: " + test)
        if not names:
            print("      red: (none)")

        write(original)
        restored_summary, restored_failed, _ = run_suite()
        print("  RESTORED  WebApi.dll " + assembly_mtime() + "  " + restored_summary)

        verdict = "KILLED" if failed > 0 else "SURVIVED"
        if restored_failed != 0:
            verdict = "RESTORE-FAILED"
        print("  verdict: " + verdict)
        verdicts.append((name, verdict, failed, len(names)))

    print()
    print("=" * 100)
    for name, verdict, failed, distinct in verdicts:
        print(verdict.ljust(16) + name.ljust(46) + str(failed) + " failing, "
              + str(distinct) + " distinct tests")

    with open(PROD) as handle:
        if handle.read() != original:
            sys.exit("THE PRODUCTION FILE DID NOT COME BACK. Restore it by hand.")
    print()
    print("production file restored byte-for-byte")


main()

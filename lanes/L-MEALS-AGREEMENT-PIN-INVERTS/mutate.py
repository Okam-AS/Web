#!/usr/bin/env python3
"""Mutation driver for L-MEALS-AGREEMENT-PIN-INVERTS.

Per mutant: back up (cp), edit, touch, build+test, restore (cp), touch, re-run.
Never --no-build; never a container (Database!=SqlServer plus a positive class filter).
Python, not zsh: a zsh for-loop over an unquoted variable iterates once with the whole string.
"""
import shutil
import subprocess
import sys
import os
import re

REPO = "/Users/svendaneel/okam/OkamAPI-mealsagrpin"
FILTER = "FullyQualifiedName~MealsAgreementWriterTests&Database!=SqlServer"

MUTANTS = [
    {
        "id": "M1",
        "name": "the corridor refusal is not recorded (the stranding defect restored)",
        "file": "Services/Meals/MealsIdempotentMutation.cs",
        "old": "await receipts.RefuseAsync(companyId, scopeKey, idempotencyKey, refusal, ct);",
        "new": "await Task.Yield(); // MUTANT M1: the refusal is no longer recorded as the receipt's outcome",
    },
    {
        "id": "M2",
        "name": "the in-flight guard removed (a reserved key becomes runnable again)",
        "file": "Services/Meals/MealsCommandReceiptService.cs",
        "old": "                MealsReceiptDisposition.InProgress, companyId, scopeKey, idempotencyKey, requestHash,",
        "new": "                MealsReceiptDisposition.Proceed, companyId, scopeKey, idempotencyKey, requestHash,",
    },
    {
        "id": "M3",
        "name": "the recorded refusal loses its own detail (a generic refusal is replayed)",
        "file": "Services/Meals/MealsCommandReceiptService.cs",
        "old": "Detail = refusal.Message,",
        "new": 'Detail = "A Company Meals command was refused.", // MUTANT M3',
    },
]


def run_tests():
    proc = subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj", "--filter", FILTER],
        cwd=REPO, capture_output=True, text=True,
    )
    out = proc.stdout + proc.stderr
    summary = [l.strip() for l in out.splitlines()
               if l.startswith("Passed!") or l.startswith("Failed!") or "error CS" in l]
    failed = sorted(set(re.findall(r"Failed WebApi\.Tests\.Meals\.MealsAgreementWriterTests\.(\S+)", out)))
    return summary, failed


def report(tag, summary, failed):
    print("    " + tag + ":")
    for line in summary or ["(no summary line)"]:
        print("      " + line)
    for name in failed:
        print("      RED -> " + name)
    if not failed:
        print("      RED -> (none)")
    sys.stdout.flush()


print("=== BASELINE (unmutated) ===")
s, f = run_tests()
report("baseline", s, f)

for m in MUTANTS:
    path = os.path.join(REPO, m["file"])
    backup = path + ".pin-backup"
    print("")
    print("=== " + m["id"] + " : " + m["name"] + " ===")
    print("    file: " + m["file"])
    shutil.copy2(path, backup)
    src = open(path).read()
    assert src.count(m["old"]) == 1, m["id"] + ": anchor is not unique"
    open(path, "w").write(src.replace(m["old"], m["new"]))
    os.utime(path, None)
    s, f = run_tests()
    report("mutated", s, f)

    # cp, never mv: a restore that preserves the original mtime leaves the source OLDER than the
    # built output, MSBuild skips the compile and the next run silently measures the mutant.
    shutil.copy(backup, path)
    os.utime(path, None)
    os.remove(backup)
    assert open(path).read().count(m["old"]) == 1, m["id"] + ": restore failed"
    s, f = run_tests()
    report("restored", s, f)

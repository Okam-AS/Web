#!/usr/bin/env python3
"""Mutation proof for L-TRAIN-IDEMPOTENCY-REFUSAL.

One mutant at a time: remove exactly one recording/replay line, run the pinning class, expect RED;
restore from an in-memory copy (a plain write, so the mtime moves and MSBuild cannot call the assembly
up to date), run again, expect GREEN. Never --no-build. Container-free filter only.
"""
import re
import subprocess
import sys

ROOT = "/Users/svendaneel/okam/OkamAPI-trainidemref"
MUT = ROOT + "/Services/Training/TrainingMutation.cs"
IDEM = ROOT + "/Services/Training/TrainingIdempotency.cs"
FILTER = "Database!=SqlServer&FullyQualifiedName~TrainingIdempotencyRefusalTests"

MUTANTS = [
    ("M01", MUT, "the stage-refusal recording",
     "                await idempotency.RefuseAsync(scope, idempotencyKey, storeId, refusal, ct);\n                throw;",
     "                throw;"),
    ("M02", MUT, "the commit-time (onConcurrency) recording",
     "                if (mapped is TrainingProblemException refusal)\n                {\n                    await idempotency.RefuseAsync(scope, idempotencyKey, storeId, refusal, ct);\n                }\n\n                throw mapped;",
     "                throw mapped;"),
    ("M03", IDEM, "the Refused branch in Resolve (the replay read)",
     "            if (existing.Status == TrainingIdempotencyRecordStatus.Refused)\n            {\n                return new TrainingIdempotencyReservation(\n                    TrainingIdempotencyDisposition.Refused, existing, existing.ResponseSnapshotJson, existing.ResponseStatusCode);\n            }\n\n",
     ""),
    ("M04", MUT, "the Refused disposition arm in RunAsync (the rethrow)",
     "            if (reservation.Disposition == TrainingIdempotencyDisposition.Refused)\n            {\n                throw TrainingRecordedRefusal.Rehydrate(reservation.ReplayedResponsePayload);\n            }\n\n",
     ""),
    ("M05", IDEM, "the change-tracker clear before the refusal's own save",
     "            _context.ChangeTracker.Clear();\n\n",
     ""),
    ("M06", IDEM, "the already-recorded-outcome guard",
     "            if (record == null || record.Status != TrainingIdempotencyRecordStatus.InProgress)",
     "            if (record == null)"),
]


def run():
    p = subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj", "--filter", FILTER],
        cwd=ROOT, capture_output=True, text=True)
    out = p.stdout + p.stderr
    if "error CS" in out:
        return "BUILD-ERROR", [], out
    m = re.search(r"(Passed|Failed)!\s+-\s+Failed:\s+(\d+), Passed:\s+(\d+)", out)
    if not m:
        return "NO-SUMMARY", [], out
    failed = int(m.group(2))
    names = sorted(set(re.findall(r"\[xUnit\.net .*?\]\s+\S*?TrainingIdempotencyRefusalTests\.(\w+) \[FAIL\]", out)))
    msgs = sorted(set(re.findall(r"Expected: (training\.[\w-]+)\n\s*Actual:\s+(training\.[\w-]+)", out)))
    return ("RED" if failed else "GREEN"), names, msgs


log = []
for mid, path, what, anchor, replacement in MUTANTS:
    original = open(path).read()
    if original.count(anchor) != 1:
        print(f"{mid}: ANCHOR NOT UNIQUE ({original.count(anchor)}) in {path}", flush=True)
        sys.exit(1)

    open(path, "w").write(original.replace(anchor, replacement))
    verdict, names, msgs = run()
    print(f"{mid} MUTANT [{what}] -> {verdict}; failed={len(names)} {names}", flush=True)
    if msgs:
        print(f"      verbatim: {msgs[:3]}", flush=True)

    open(path, "w").write(original)
    back, _, _ = run()
    print(f"{mid} RESTORED -> {back}", flush=True)
    log.append((mid, what, verdict, len(names), names, msgs, back))

print("\n=== SUMMARY ===")
survivors = [r for r in log if r[2] != "RED"]
for mid, what, verdict, n, names, msgs, back in log:
    print(f"{mid} {verdict:6} reds={n:2} restored={back:6} | {what}")
print(f"\nsurvivors: {len(survivors)}")

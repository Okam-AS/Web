#!/usr/bin/env python3
"""Review-side mutation driver for the adoption review of 4bbf34a5.

Mutates and measures ONE tree: REPO. Prints the assembly path the runner reports so the
mutated tree and the measured tree are compared by the reader rather than assumed.
Restores with write+utime (never mv, never git stash) so MSBuild cannot skip the recompile.
"""
import os
import re
import subprocess
import sys
import time

REPO = "/Users/svendaneel/okam/OkamAPI-agrpinrev"
PROJ = "WebApi.Tests/WebApi.Tests.csproj"

RECEIPTS = "Services/Meals/MealsCommandReceiptService.cs"
ENVELOPE = "Services/Meals/MealsIdempotentMutation.cs"

# ---------------------------------------------------------------- mutations

REDECIDE_FROM = """                var refusal = RefusalOrNull(existing);
                if (refusal != null)
                {"""
REDECIDE_TO = """                var refusal = RefusalOrNull(existing);
                if (refusal != null)
                {
                    // MUTANT M-REDECIDE: the retry RE-DECIDES instead of replaying the recorded refusal.
                    // The key is reopened and the command runs again, reaching whatever verdict the world
                    // now gives. In a world that has NOT moved this is indistinguishable from a replay.
                    var reopened = await _context.MealsCommandReceipts
                        .FirstAsync(r => r.CommandReceiptId == existing.CommandReceiptId, ct);
                    reopened.CompletedAtUtc = null;
                    reopened.ResponseStatusCode = null;
                    reopened.ResponseSnapshotJson = null;
                    await _context.SaveChangesAsync(ct);
                    return new MealsCommandReceiptReservation(
                        MealsReceiptDisposition.Proceed, companyId, scopeKey, idempotencyKey, requestHash,
                        reopened.CommandReceiptId, null, null);
                }

                if (false)
                {"""

DETAIL_FROM = "                Detail = refusal.Message,"
DETAIL_TO = '                Detail = "A Company Meals command was refused.", // MUTANT M-DETAIL'

INFLIGHT_ENV_FROM = """            if (reservation.Disposition == MealsReceiptDisposition.InProgress)
            {
                throw MealsProblemException.IdempotencyInProgress();
            }"""
INFLIGHT_ENV_TO = """            // MUTANT M-INFLIGHT-ENV: the envelope stops refusing a genuinely in-flight duplicate."""

INFLIGHT_SVC_FROM = """            return new MealsCommandReceiptReservation(
                MealsReceiptDisposition.InProgress, companyId, scopeKey, idempotencyKey, requestHash,
                existing.CommandReceiptId, null, null);"""
INFLIGHT_SVC_TO = """            // MUTANT M-INFLIGHT-SVC: an in-flight duplicate is handed a fresh Proceed.
            return new MealsCommandReceiptReservation(
                MealsReceiptDisposition.Proceed, companyId, scopeKey, idempotencyKey, requestHash,
                existing.CommandReceiptId, null, null);"""

NORECORD_FROM = """                await receipts.RefuseAsync(companyId, scopeKey, idempotencyKey, refusal, ct);
                throw;"""
NORECORD_TO = """                // MUTANT M-NORECORD: the refusal is no longer recorded as the receipt's outcome.
                throw;"""

MUTANTS = {
    "M-REDECIDE": [(RECEIPTS, REDECIDE_FROM, REDECIDE_TO)],
    "M-DETAIL": [(RECEIPTS, DETAIL_FROM, DETAIL_TO)],
    "M-INFLIGHT-ENV": [(ENVELOPE, INFLIGHT_ENV_FROM, INFLIGHT_ENV_TO)],
    "M-INFLIGHT-SVC": [(RECEIPTS, INFLIGHT_SVC_FROM, INFLIGHT_SVC_TO)],
    "M-NORECORD": [(ENVELOPE, NORECORD_FROM, NORECORD_TO)],
}

# ---------------------------------------------------------------- machinery


def read(path):
    with open(os.path.join(REPO, path), "r", encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    full = os.path.join(REPO, path)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(text)
    now = time.time()
    os.utime(full, (now, now))


def run(test_filter):
    proc = subprocess.run(
        ["dotnet", "test", PROJ, "--filter", test_filter, "--nologo"],
        cwd=REPO, capture_output=True, text=True,
    )
    out = proc.stdout + proc.stderr
    assembly = ""
    for line in out.splitlines():
        if line.strip().startswith("Test run for "):
            assembly = line.strip()
    failed = sorted(set(re.findall(r"^\s*(?:Failed|X)\s+([A-Za-z0-9_.]+)", out, re.M)))
    summary = ""
    for line in out.splitlines():
        if "Failed:" in line and "Passed:" in line:
            summary = line.strip()
    if not summary:
        tail = out.strip().splitlines()
        summary = tail[-1] if tail else "(no output)"
    return summary, failed, assembly, out


def report(label, test_filter):
    print("=" * 78, flush=True)
    print(label, flush=True)
    summary, failed, assembly, out = run(test_filter)
    print(" ", assembly, flush=True)
    print(" ", summary, flush=True)
    print("  failed:", failed or "NONE", flush=True)
    for line in out.splitlines():
        s = line.strip()
        if s.startswith(("Expected:", "Actual:", "Assert.")):
            print("   |", s[:160], flush=True)
    return failed


def main():
    test_filter = sys.argv[1]
    names = sys.argv[2:] or list(MUTANTS)
    originals = {p: read(p) for p in (RECEIPTS, ENVELOPE)}

    report("BASELINE", test_filter)

    for name in names:
        ok = True
        for path, frm, to in MUTANTS[name]:
            src = originals[path]
            if src.count(frm) != 1:
                print(f"!! {name}: anchor in {path} matched {src.count(frm)} times - SKIPPED", flush=True)
                ok = False
                break
            write(path, src.replace(frm, to, 1))
        if ok:
            report("MUTANT " + name, test_filter)
        for path, text in originals.items():
            write(path, text)

    report("RESTORED", test_filter)


if __name__ == "__main__":
    main()

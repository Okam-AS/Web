#!/usr/bin/env python3
"""Mutation driver for L-ACCOUNTING-EXPORT-SILENT.

Alternates mutate(expect RED) -> restore(expect GREEN) per site, and stats the PRODUCTION
assembly (WebApi.dll) on every run: both mutants are production code, so a run whose
WebApi.dll mtime did not move measured a stale binary and its verdict is worthless.
Alternating red/green across consecutive runs is what rules out the two instrument traps at
once -- a wrong-tree mutation would never go red, a stale binary would never come back green.

Restore is by exact snapshot of the file bytes taken before the mutation, never a reverse
string replace: a mutation that DELETES a block has no anchor to put it back at.
"""
import subprocess, sys, os, datetime

TREE = "/Users/svendaneel/okam/wt-acctexport"
DLL = os.path.join(TREE, "bin/Debug/net8.0/WebApi.dll")
TESTDLL = os.path.join(TREE, "WebApi.Tests/bin/Debug/net8.0/WebApi.Tests.dll")
FILTER = "Database!=SqlServer&FullyQualifiedName~Maintenance"

MAINT = os.path.join(TREE, "Services/MaintenanceService.cs")
ORCH = os.path.join(TREE, "Services/Tripletex/AccountingExportOrchestrator.cs")

# --- mutation definitions: (file, find, replace-with) ----------------------------------------

M1_A_FROM = """            var exportStoreIds = await _accountingExportOrchestrator.GetStoreIdsWithExportEnabledAsync();
            result.StoresEligible = exportStoreIds.Count;
"""
M1_A_TO = """            var exportStoreIds = await _accountingExportOrchestrator.GetStoreIdsWithExportEnabledAsync();
            result.StoresEligible = exportStoreIds.Count;
            result.StoresExported = exportStoreIds.Count;
"""
M1_B_FROM = """                // Counted from what the export produced, never from the eligibility query. An empty
                // dailyResults is the silent case this exists for: nothing was there to export the day's
                // books, and no POS voucher that happened to post alongside may stand in for them.
                if (dailyResults.Count > 0 && dailyResults.All(r => r.Success) && posResults.All(r => r.Success))
                {
                    result.StoresExported++;
                }

"""

# The POS voucher path runs outside the providers collection, so dropping the "the daily export
# actually produced something" requirement lets a store's Z-report vouchers stand in for books that
# were never exported. This is the mutant that a merged result list would have hidden.
M4_FROM = """                if (dailyResults.Count > 0 && dailyResults.All(r => r.Success) && posResults.All(r => r.Success))"""
M4_TO = """                if (dailyResults.All(r => r.Success) && posResults.All(r => r.Success))"""

M2_FROM = """            if (sweepers.Count == 0)
            {
                _logger.LogError("[Maintenance] No capture sweeper is registered; no uncaptured order was swept.");
                result.Failures.Add("Ingen innkrevingssveip er registrert; ingen ordrer ble innkrevd.");
                return result;
            }

"""

M3_FROM = """            if (providers.Count == 0)
            {
                const string message = "Ingen regnskapseksportprovider er registrert; dagseksporten ble ikke kjørt.";
                _logger.LogError(
                    "No accounting export provider is registered; store {StoreId} was not exported for {Date:yyyy-MM-dd}",
                    storeId, date);
                await AlertAsync(AccountingExportTarget.None, storeId, date, message);
                results.Add(new AccountingExportResult
                {
                    Target = AccountingExportTarget.None,
                    Success = false,
                    Message = message
                });
                return results;
            }

"""

SITES = [
    # The defect exactly as it shipped: StoresExported is the eligibility count again, and nothing
    # counts what the export produced. StoresEligible is left correct so ONLY the exported number moves.
    ("M1-accounting-count-reports-eligible",
     [(MAINT, M1_A_FROM, M1_A_TO), (MAINT, M1_B_FROM, "")]),
    # An empty sweeper collection produces the clean result again.
    ("M2-capture-sweep-empty-is-clean", [(MAINT, M2_FROM, "")]),
    # An empty provider collection returns an empty result again, with nothing saying why.
    ("M3-orchestrator-empty-is-silent", [(ORCH, M3_FROM, "")]),
    # The POS half is allowed to stand in for a daily export that never ran.
    ("M4-pos-half-substitutes-for-daily", [(MAINT, M4_FROM, M4_TO)]),
]


def snapshot(paths):
    return {p: open(p, "rb").read() for p in paths}


def restore(snap):
    for p, data in snap.items():
        open(p, "wb").write(data)


def mutate(edits):
    for path, find, repl in edits:
        text = open(path, encoding="utf-8").read()
        n = text.count(find)
        if n != 1:
            raise SystemExit("EXPECTED 1 occurrence in %s, found %d -- aborting" % (path, n))
        open(path, "w", encoding="utf-8").write(text.replace(find, repl, 1))


def mtime(p):
    return (datetime.datetime.fromtimestamp(os.path.getmtime(p)).strftime("%H:%M:%S")
            if os.path.exists(p) else "ABSENT")


def run(label, expect):
    before = (mtime(DLL), mtime(TESTDLL))
    proc = subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj", "--filter", FILTER],
        cwd=TREE, capture_output=True, text=True)
    after = (mtime(DLL), mtime(TESTDLL))
    verdict = "GREEN" if proc.returncode == 0 else "RED"
    print("--- %s" % label)
    print("    WebApi.dll       %s -> %s   moved=%s" % (before[0], after[0], before[0] != after[0]))
    print("    WebApi.Tests.dll %s -> %s   moved=%s" % (before[1], after[1], before[1] != after[1]))
    for line in proc.stdout.splitlines():
        s = line.strip()
        if s.startswith(("Passed!", "Failed!", "Failed ", "Error ")):
            print("    %s" % s[:180])
    print("    verdict=%s expected=%s %s" % (
        verdict, expect, "OK" if verdict == expect else "*** INSTRUMENT FAILURE ***"))
    sys.stdout.flush()
    return verdict


if __name__ == "__main__":
    ok = True
    for site, edits in SITES:
        snap = snapshot(sorted({p for p, _, _ in edits}))
        mutate(edits)
        ok &= run("%s  MUTATED" % site, "RED") == "RED"
        restore(snap)
        ok &= run("%s  RESTORED" % site, "GREEN") == "GREEN"
    print("ALL FOUR-STATE CHECKS OK" if ok else "*** SOME CHECK FAILED ***")

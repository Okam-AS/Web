#!/usr/bin/env python3
"""One mutant at a time: remove ONE recording, rebuild, run its own test, restore, rebuild.

Never --no-build: every arm lets `dotnet test` compile, and the restore writes the file fresh
(then touches it) so MSBuild cannot call the assembly up to date and measure the previous binary.
The original is held in memory, NOT recovered with `git checkout` -- the lane's own changes to
these files are uncommitted, and a checkout would revert the fix along with the mutant.
"""
import os, re, subprocess

ROOT = "/Users/svendaneel/okam/OkamAPI-mealsidemref"
REFUSE = "                await _receipts.RefuseAsync(companyId, scopeKey, idempotencyKey, refusal, ct);\n"

MUTANTS = [
    ("M01-composition", "Services/Meals/MealsIdempotentMutation.cs",
     "                await receipts.RefuseAsync(companyId, scopeKey, idempotencyKey, refusal, ct);\n",
     "A_stateful_check_refusing_after_the_reservation_replays_its_refusal_on_the_same_key"),
    ("M02-company-update", "Services/Meals/MealsCompanyService.cs",
     "                var refusal = await BuildStaleCompanyRevisionAsync(companyId, request.ExpectedVersion, ct);\n" + REFUSE,
     "Company_update_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M03-company-archive", "Services/Meals/MealsCompanyService.cs",
     "                var refusal = await BuildStaleCompanyRevisionAsync(companyId, expectedVersion, ct);\n" + REFUSE,
     "Company_archive_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M04-membership-revoke", "Services/Meals/MealsMembershipService.cs",
     "                var refusal = await BuildStaleMembershipRevisionAsync(companyId, membershipId, request?.ExpectedVersion, ct);\n" + REFUSE,
     "Membership_revoke_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M05-invitation-revoke", "Services/Meals/MealsMembershipService.cs",
     "                var refusal = await BuildStaleInvitationRevisionAsync(companyId, invitationId, request?.ExpectedVersion, ct);\n" + REFUSE,
     "Invitation_revoke_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M06-invitation-claim", "Services/Meals/MealsMembershipService.cs",
     "                var refusal = MealsProblemException.InvitationNotClaimable((state ?? MealsInvitationState.Claimed).ToString());\n" + REFUSE,
     "Invitation_claim_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M07-program-members", "Services/Meals/MealsProgramService.cs",
     "                var refusal = await BuildStaleRevisionAsync(companyId, programId, request.ExpectedVersion, ct);\n" + REFUSE,
     "Program_members_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M08-reconciliation-resolve", "Services/Meals/MealsReconciliationService.cs",
     "                    MealsRevision.Encode(current?.ConcurrencyVersion), \"v1/meals/reconciliation/\" + exceptionId);\n" + REFUSE,
     "Reconciliation_resolve_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M09-statement-finalize", "Services/Meals/MealsStatementService.cs",
     "                    MealsRevision.Encode(current?.ConcurrencyVersion), \"v1/meals/statements/\" + statementId);\n" + REFUSE,
     "Statement_finalize_refused_at_the_commit_backstop_replays_that_refusal_on_the_same_key"),
    ("M10-discriminator-read", "Services/Meals/MealsCommandReceiptService.cs",
     "                    throw refusal;\n",
     "A_refused_command_is_recorded_as_a_completion_and_a_same_key_retry_replays_the_refusal"),
]


def run(test_name):
    out = subprocess.run(
        ["dotnet", "test", "WebApi.Tests/WebApi.Tests.csproj",
         "--filter", "FullyQualifiedName~%s&Database!=SqlServer" % test_name],
        cwd=ROOT, capture_output=True, text=True, timeout=1800)
    lines = [l for l in out.stdout.strip().split("\n") if l.strip()]
    tail = lines[-1] if lines else "(no output)"
    m = re.search(r"Failed:\s+(\d+),\s+Passed:\s+(\d+)", out.stdout)
    if not m:
        return "NO-RESULT", tail, out.stdout[-1500:]
    failed, passed = int(m.group(1)), int(m.group(2))
    if failed == 0 and passed > 0:
        return "GREEN", tail, ""
    reason = ""
    for line in out.stdout.split("\n"):
        s = line.strip()
        if s.startswith("Assert.") or s.startswith("Actual:") or s.startswith("Expected:"):
            reason += s + " | "
    return "RED", tail, reason[:400]


results = []
for name, path, anchor, test in MUTANTS:
    full = os.path.join(ROOT, path)
    original = open(full, encoding="utf-8").read()
    n = original.count(anchor)
    print("--- %s : %s" % (name, path), flush=True)
    if n != 1:
        print("    ANCHOR-MISS (found %d)" % n, flush=True)
        results.append((name, "ANCHOR-MISS", "-", ""))
        continue

    # Remove ONLY the recording line. The anchor carries the preceding line purely to make the
    # site unique within its file -- deleting that too would leave `throw refusal;` unbound and the
    # arm would measure a compile error instead of a behaviour.
    replacement = anchor.replace(REFUSE, "") if REFUSE in anchor else ""
    open(full, "w", encoding="utf-8").write(original.replace(anchor, replacement, 1))
    os.utime(full, None)
    v1, t1, why = run(test)
    print("    mutant   -> %-6s %s" % (v1, t1), flush=True)
    if why:
        print("    because  : %s" % why, flush=True)

    open(full, "w", encoding="utf-8").write(original)
    os.utime(full, None)
    v2, t2, _ = run(test)
    print("    restored -> %-6s %s" % (v2, t2), flush=True)
    results.append((name, v1, v2, why))

print("\n=== MATRIX ===", flush=True)
for r in results:
    print("%-28s mutant=%-10s restored=%s" % (r[0], r[1], r[2]), flush=True)
survivors = [r for r in results if r[1] != "RED"]
print("\nSURVIVORS (mutant stayed green or did not apply): %d" % len(survivors), flush=True)
for s in survivors:
    print("  %s" % (s,), flush=True)

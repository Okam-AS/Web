#!/usr/bin/env python3
"""Apply / restore the three production mutants for L-REPLAY-PINS-CLOSE.

Every mutant is the SAME defect class: a STATEFUL check moved in front of the reservation.
That is the refactor both compositions' own remarks invite, and it silently converts a
same-key retry from a REPLAY of the recorded refusal into a RE-DECIDE, because the first
call never reserved and so recorded nothing to replay.

All three edit production sources under Services/, so a correct application moves
WebApi.dll and never WebApi.Tests.dll.

usage: mutate.py apply <name> | restore <name> | check
       names: meals | wf | award | all
"""
import sys
import os

ROOT = "/Users/svendaneel/okam/wt-replaypins"

MUTANTS = {}

# ---- A-MEALS: MealsIdempotentMutation.CommitAsync -------------------------------------
MUTANTS["meals"] = (
    "Services/Meals/MealsIdempotentMutation.cs",
    [
        (
            """            var hash = MealsCommandReceiptService.ComputeRequestHash(JsonConvert.SerializeObject(canonicalRequest));
            var reservation = await receipts.ReserveAsync(companyId, scopeKey, idempotencyKey, hash, ct);""",
            """            var hash = MealsCommandReceiptService.ComputeRequestHash(JsonConvert.SerializeObject(canonicalRequest));

            // MUTANT A-MEALS: the stateful check hoisted IN FRONT of the reservation.
            if (onProceed != null)
            {
                await onProceed(ct);
            }

            var reservation = await receipts.ReserveAsync(companyId, scopeKey, idempotencyKey, hash, ct);""",
        ),
        (
            """                if (onProceed != null)
                {
                    await onProceed(ct);
                }

                var response = await stage();""",
            """                var response = await stage();""",
        ),
    ],
)

# ---- A-WF: WorkforceScheduleCommit.RunAsync ------------------------------------------
MUTANTS["wf"] = (
    "Services/Workforce/WorkforceScheduleCommit.cs",
    [
        (
            """            var reservation = await _idempotency.ReserveAsync(scope, idempotencyKey, actorReference, storeId, hash, ct);""",
            """            // MUTANT A-WF: the stateful check hoisted IN FRONT of the reservation.
            if (onProceed != null)
            {
                await onProceed(ct);
            }

            var reservation = await _idempotency.ReserveAsync(scope, idempotencyKey, actorReference, storeId, hash, ct);""",
        ),
        (
            """                if (onProceed != null)
                {
                    await onProceed(ct);
                }

                var response = await stage();""",
            """                var response = await stage();""",
        ),
    ],
)

# ---- A-AWARD: WorkforceShiftExchangeService.AwardAsync --------------------------------
# The one-award backstop's stateful check is the filtered unique index at COMMIT. The
# invited "fix" is to pre-check already-awarded in front of the reservation, which the
# census names explicitly: RevalidateAwardAsync never checks it, deliberately.
MUTANTS["award"] = (
    "Services/Workforce/WorkforceShiftExchangeService.cs",
    [
        (
            """            // Resolved by onProceed, which is where the award's stateful work now lives.
            var siblings = new List<WorkforceShiftExchangeRequest>();""",
            """            // MUTANT A-AWARD: the already-awarded check hoisted IN FRONT of the reservation,
            // where the filtered unique index's job is done pre-emptively instead.
            if (award && await _context.WorkforceShiftExchangeRequests.AsNoTracking()
                    .AnyAsync(r => r.StoreId == storeId
                                   && r.TargetShiftAssignmentId == row.TargetShiftAssignmentId
                                   && r.ShiftExchangeRequestId != shiftExchangeRequestId
                                   && r.Status == WorkforceShiftExchangeStatus.Awarded, ct))
            {
                throw WorkforceProblemException.AwardTaken(row.TargetShiftAssignmentId.ToString());
            }

            // Resolved by onProceed, which is where the award's stateful work now lives.
            var siblings = new List<WorkforceShiftExchangeRequest>();""",
        ),
    ],
)


def names(arg):
    return list(MUTANTS) if arg == "all" else [arg]


def run(action, name):
    path, pairs = MUTANTS[name]
    full = os.path.join(ROOT, path)
    src = open(full).read()
    for before, after in pairs:
        frm, to = (before, after) if action == "apply" else (after, before)
        n = src.count(frm)
        if n != 1:
            print("  FAIL %-6s %s : anchor found %d times (want 1)" % (name, path, n))
            return False
        src = src.replace(frm, to)
    open(full, "w").write(src)
    print("  ok   %-6s %s  %s" % (name, action, path))
    return True


def check():
    for name, (path, pairs) in MUTANTS.items():
        src = open(os.path.join(ROOT, path)).read()
        state = "MUTATED" if all(src.count(a) == 1 for _, a in pairs) else (
            "clean" if all(src.count(b) == 1 for b, _ in pairs) else "UNKNOWN")
        print("  %-6s %-8s %s" % (name, state, path))


if __name__ == "__main__":
    if sys.argv[1] == "check":
        check()
        sys.exit(0)
    ok = all(run(sys.argv[1], n) for n in names(sys.argv[2]))
    sys.exit(0 if ok else 1)

```
RETURN: L-CENSUS-FLOORS-DERIVED
brief: 88cda675
verdict: built
evidence: OkamAPI worktree /Users/svendaneel/okam/OkamAPI-censusfloors, branch lane/census-floors-derived @ 75dcc2ff, base feature/restaurant-modules @ 3579bbbc
log:
KnownFiles/KnownSiteFloor/KnownResolverFloor/KnownGuardFloor DELETED from ModuleActorStampPin.
New ProductionAssemblyActorSites walks WebApi IL for newobj of each stamped type and
places every one via the portable PDB line table. Comparison is EQUALITY both ways, not >=.
Independent directions: regex+brace scanner over .cs text vs compiler-emitted IL+documents.
Drift found live at the base: Training floor 10/4/4 vs tree 11 sites, 5 resolvers, 5 files
- Services/Training/TrainingEvidenceService.cs is an audit-stamping service the census never named.
RED 1 (asm has, text missed): target-typed `MealsAuditEntry probe = new()` ->
names MealsProgramService.cs:173 (MealsProgramService.<CreateProgramAsync>b__1) alone of 4 in file.
RED 2 (text has, asm lacks): same site behind #if MEALS_CENSUS_PHANTOM ->
"source walk found 4 (line 174,186,297,448), the assembly contains 3".
RED 3 (census entry removed): drop MealsAuditEntry from Meals.Stamps -> reds twice by name.
Each restored with cp/touch and REBUILT; WebApi.dll mtime checked to move before every run.
Container-free tier 4374 passed / 0 failed / 12 skipped. ev-dietary artifacts restored, not committed.
CONFLICTS ALL THREE LANES in ModuleActorStampPin.cs - not resolved, merges aborted. See below.
END RETURN
```

## Coordination - I did not pick a side

Trial-merged, inspected, aborted. All three now conflict **in git**, one hunk each,
where before they merged cleanly and left the floors stale:

- `lane/growth-audit-ledger` (bd3a840f)
- `lane/gr-dispatch-actor` (a1e2655f) - note this is **stacked on** growth-audit-ledger,
  not parallel to it; it already contains bd3a840f
- `lane/meals-release-actor` (249612ac)

Every conflict resolves mechanically and side-neutrally: keep their `Stamps` / `Coherence` /
`Writer` / `KnownFiles`-adjacent semantics, delete the four fields that no longer exist.
No decision of theirs is implicated - I did not choose between GrowthAudit's floor 5 and 6,
between GrowthAudit-as-sixth-pin and folding it in, or on Meals' `MealsActorKind`. The
per-module actor-kind enums are untouched and remain separate.

## Residual, stated rather than hidden

The old floors covered one thing incidentally that equality does not: dropping a declared
stamp narrows **both** readings together, so they agree. Three assertions replace that
deliberately - a module must declare at least one stamp, every declared stamp must be
constructed somewhere in the assembly, and the `*AuditEntry` family is now read from the
assembly type table instead of a `class ...AuditEntry` text match.

Not closed: a **non-`*AuditEntry`** stamp dropped from a module declaring more than one -
today only `Events` (`EventsPaymentReceipt` beside `EventsStateTransition`). Both readings
would narrow together and stay green. That is a `Stamps` declaration rather than a floor,
and closing it needs a derivation of which production types are ledger rows that this lane
does not have. The heuristics available (actor-property name, or actor-property + `ActorKind`)
would each be tuned to make today's tree pass, which is the shape this lane exists to remove.

## Note on granularity

Counted per FILE, not per line. The two readings agree on the line of all 22 sites in the
tree today, but a sequence point is attributed to the statement rather than to the `new`
token, so a multi-line construction could legitimately differ by one line and a per-line
comparison would red on a well-covered site. Lines are still used to **name** the offender.

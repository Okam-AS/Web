# L-WF-OPERATOR-UNIQUE — evidence

Branch `lane/wf-operator-unique`, worktree `~/okam/wt-wfopuniq`, based on
`integration/mig-stack-land @ 4b37f81b`. **Not pushed.** Read at the integration tip
`feature/restaurant-modules @ 8e2b57de`.

## The defect

`WorkforceStaffMember.OperatorId` decides whose pay a till punch becomes, and it carried no unique
index in the model **or** the chain. `WorkforceOperatorImportService` is per-operator idempotent only
through an in-memory `existingOperatorLink` read taken inside its reserve → stage → complete
composition. Two imports of one operator under **different** Idempotency-Keys are two reservations, so
the unique `(Scope, Key)` index never sees them as one act: both read "not linked", both insert.

D1 (`UX_WorkforceStaffMembers_ActiveEngagement`) does not cover it. The ordinary import target has no
`ApplicationUserId`, so each racer mints its **own** new `WorkforcePerson`, and two distinct person ids
never collide on `(WorkforcePersonId, LegalEmployerId)`.

## Why the base is the stack and not the integration tip

`feature/restaurant-modules`' 127 migrations are a **strict prefix** of `integration/mig-stack-land`'s
136 — 0 removed, 9 added — so the stack tip
(`20260803093235_Kassa_AccountingSummaryDayUniqueIndex`) **is** the post-merge chain tip. Parenting on
the integration tip would have put this migration and the stack's 9 at one parent, which is exactly the
C2 collision ("two migration files on one branch share a parent").

**No snapshot contention with `L-MIG-STACK-MERGE`.** Hand-authored, not `ef migrations add`:
`ApplicationDbContextModelSnapshot.cs` is untouched and the new Designer's `BuildTargetModel` is
byte-identical to its parent's (verified programmatically). The migration carries **no**
`OnModelCreating` counterpart — the same discipline D1 and the append-only triggers already use — which
is what keeps `HasPendingModelChanges()` clean.

## The guard

`20260806111500_Workforce_OperatorLinkUniqueness`

```
UX_WorkforceStaffMembers_OperatorLink
  (StoreId, OperatorId) UNIQUE
  WHERE [OperatorId] IS NOT NULL AND [IsActive] = 1
```

Both filter halves are load-bearing. `IS NOT NULL` because SQL Server treats NULLs as **equal** in a
unique index, so without it the second ordinary (unlinked) hire in any store would be refused.
`IsActive = 1` because the constraint is one *live* link — a dead engagement must not hold an operator
id hostage against a re-hire.

`IX_WorkforceStaffMembers_StoreId` is deliberately **not** dropped (unlike the prefix index MIG-21
removed): this index is filtered, so it cannot serve the plain store-scoped reads. It supersedes nothing.

## Service change (required, not incidental)

Without it the losing racer received a raw `DbUpdateException` — a 500 on a routine double-tap. Added
`WorkforceDbViolations.IsOperatorLinkViolation` plus a second catch arm in
`WorkforceOperatorImportService`, yielding `409 workforce.import-conflict` with
`conflictKind = operator-link-conflict`, `retryable`, `retryWithFreshKey`.

Matched by index **name only**, with no SQLite column fallback beneath it — deliberately. The index is
migration-only DDL, so SQLite's `EnsureCreated` never builds it and a SQLite branch would be a path no
test could execute.

## Tests — `WebApi.Tests/Workforce/OperatorLinkUniquenessSqlServerTests.cs` (5/5)

| Test | What it pins |
|---|---|
| `Two_concurrent_imports_of_one_operator_leave_exactly_one_live_link` | the money property, via the real service composition and a save gate at save 2 |
| `The_index_refuses_a_second_live_link_and_names_itself` | *which* constraint refuses, and that the name the mapper discriminates on is really in the provider message |
| `A_deactivated_link_does_not_hold_the_operator_hostage` | the `IsActive = 1` filter half |
| `Engagements_with_no_operator_link_do_not_collide` | the `IS NOT NULL` filter half |
| `The_chain_builds_the_operator_link_index_and_a_model_built_database_does_not` | the catalog assertion |

**Refused at the database, not by the pre-commit read**, and the two are asserted apart: a pre-check
refusal is a 200 carrying `AlreadyImported`; the index refusal is the typed 409. A test that only
counted rows would pass either way.

**The catalog assertion is built from the chain replayed from empty** — absent at the parent migration,
present after mine, with `is_unique = 1`, `has_filter = 1` and key order `StoreId,OperatorId`. Its
mirror runs on the *same container*: a second database built by `EnsureCreated` (model truth) does
**not** have the index. Same server, same provider, same `sys.*` views — the only difference is how the
schema was built.

## Mutation proof — 8 mutants, 9 runs (`mutations*.txt`, `mutant-*.txt`)

| Mutant | Arms red |
|---|---|
| M1 no index at all | race, name/refusal, catalog |
| M2 `unique: false` | race, name/refusal, catalog |
| M3 filter drops `IsActive = 1` | deactivated-hostage, catalog |
| M4 filter drops `IS NOT NULL` | no-collision, catalog |
| M5b index renamed (`_OpLink`) | race, name/refusal, catalog |
| M6 catch arm disabled | race |
| M7 key order swapped | catalog |
| M8 predicate always false | race, name/refusal |

**M5's first attempt was equivalent by accident, and is reported rather than hidden.** It renamed the
index to `..._OperatorLinkRenamed`, which *contains* `..._OperatorLink` as a prefix — so every
`IndexOf`/`Assert.Contains` check matched and only the catalog reddened. Re-run as **M5b** with a
non-superstring name (`..._OpLink`), it reds 3 arms. The guard held; the mutant was wrong.

**M7 is behaviourally equivalent.** Key order does not change what a unique index refuses, so the race
staying green is correct; only the catalog assertion pins the declared order. Not credited as a
behavioural kill.

**The two filter-half tests stay green under M1/M2 by design.** They assert that certain inserts
*succeed* — they exist to stop the index being too **strict**, and cannot detect an absent one. That is
their job, not a gap.

## Runs

- container-free baseline at clean `4b37f81b`: **4433 / 0 / 10** (`baseline-4b37f81b.txt`)
- container-free with changes: **4433 / 0 / 10** (`after-containerfree.txt`) — unchanged, as the 5 new
  tests are `Database=SqlServer` traited and correctly excluded from the fast tier
- new class on the SQL tier: **5 / 5** (`sqltier-run1.txt`)
- SQL-tier regression, Workforce collection + `RestaurantModulesMigrationRoundTripTests`:
  **141 / 141** (`sqlreg.txt`). The round trip exercises this migration's `Down()` — down to the last
  POS migration and back up — which is the code path that historically never ran.

## Containers

Started three across all runs (`2b06d0e1c75b`, `7eddef383f60`, `b95a69c2e77f`), all reaped. A foreign
mssql + ryuk pair belonging to the sibling lane was up at 12:35 and again at 13:16; **left untouched**.

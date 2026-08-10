# L-SUPERSEDE-RELEASE-IS-ATTRIBUTED — evidence

Branch `lane/supersede-release-attributed`, local only, never pushed.
Base: integration tip `feature/restaurant-modules` @ `8e2b57de`, with `lane/meals-requote-release`
(`d5483cb3`) merged in — a clean `ort` merge, no conflict. Read at the tip via `git show "<ref>:path"`
throughout; the shared checkout `/Users/svendaneel/okam/OkamAPI-modules` sits on `lane/meals-grace-pins`
and was never used as the source of a fact.

## The finding, confirmed before building

The brief holds exactly, and the fourth site is **`MealsQuoteService.ReleaseSupersededReservationAsync`**,
which `lane/meals-requote-release` adds. Verified by reading four refs rather than one working tree:

| Release site | Where | Attribution after the sibling merges |
| --- | --- | --- |
| `IMealsFundingAuthority.ReleaseAsync` | `MealsFundingAuthority` → `ReleaseResolvedReservationAsync` | actor pair required, `StampRelease` writes the row (`lane/meals-release-actor` @ `249612ac`) |
| `IMealsFundingAuthority.ReleaseByOrderIdAsync` | same shared helper | same |
| `IMealsFundingAuthority.ReleaseSupersededAsync` | same shared helper (tip @ `b9c95082`) | same helper ⇒ same stamp |
| **the re-quote supersede** | **`MealsQuoteService.cs`, inline, inside the quote's own transaction** | **none — it never calls the authority** |

The fourth site mutates the tracked reservation (`superseded.State = Released`) and issues its own raw
`UPDATE MealsBudgetGuards` decrement. It touches no member the sibling changed, so **there is no compile
collision**: after the merge the module reads as accounted for and one money-path write names nobody. Its
own doc comment already conceded the debt — *"When the reservation gains an explicit release-actor column,
this path must populate it with `userId`."*

## The route taken, and why the other was refused

**Route B: the site carries its own attribution and is named in the census.** It stamps a
`MealsAuditEntry` inside the same transaction as the release, in the **same event vocabulary the seam's
release uses** (`funding.reservation.released`, `cause` / `reasonCode` / `freedMinor` / `programId` /
`membershipId` / `periodKey`), so after the merge one query over `EventType` returns all four freed holds
rather than the three the seam happens to own. No compile coupling to the unmerged sibling.

**Route A — call `IMealsFundingAuthority.ReleaseSupersededAsync` — is not available, not merely
unattractive**, and both reasons were read off the code rather than assumed:

1. `ReleaseSupersededAsync` → `ReleaseResolvedReservationAsync` opens its **own** execution strategy and
   its own transaction (`MealsFundingAuthority.cs:408-412` at the tip). The re-quote release runs *inside*
   `CreateQuoteAsync`'s `strategy.ExecuteAsync` and an already-open `BeginTransactionAsync`
   (`MealsQuoteService.cs:209-228`), so the nested begin throws.
2. Its guard set is the wrong one: it decides on state alone — no expiry skip (an expired hold is the
   reconciliation sweep's candidate and must keep `MEALS_RESERVATION_EXPIRED`), no
   (Program, Membership, PeriodKey) match, and it answers `Denied*` where a re-quote owes a silent no-op.
   The caller would have to re-implement every guard in the method just to know when calling was safe.
   Ordering is also load-bearing — the release must land **before** the compare-and-increment — and a
   member that commits its own transaction cannot be sequenced inside that one.

**The enforcement point is the refusal above the stamp**, and it is `IsNullOrWhiteSpace`, not the
surface's `RequireResolvedCaller`, which uses `IsNullOrEmpty` — an all-whitespace id passes that gate and
would reach the ledger as a row a reader testing `ActorReference != null` counts as attributed.

**Named in the census:** `Services/Meals/MealsQuoteService.cs` added to `ModuleActorStamps.Meals.KnownFiles`
and `KnownSiteFloor` raised 14 → 15. The `KnownFiles` entry is a gate in the direction that matters — if
the stamp is deleted the file leaves the derived scope and the census reds (M1 below).

## Mutants — the attribution was dropped, not asserted

Fast tier only. Filter, container-free by construction (positive whitelist with trailing dots, plus the
explicit trait exclusion the brief requires):
`(FullyQualifiedName~WebApi.Tests.Modules.ModuleAuditActorCallSiteTests.|FullyQualifiedName~WebApi.Tests.Meals.MealsRequoteSupersedeAttributionTests.|FullyQualifiedName~WebApi.Tests.Meals.MealsRequoteSupersedeTests.)&Database!=SqlServer`

| State | Result | trx |
| --- | --- | --- |
| clean | 49/49 pass | `clean.trx` |
| **M1 — the whole `_audit.Append` block deleted** | **2 fail**: `A_superseded_hold_leaves_a_ledger_row_that_names_the_guest_who_freed_it` and `ModuleAuditActorCallSiteTests.The_derived_scope_still_sees_the_whole_population(Meals)` | `m1-attribution-dropped.trx` |
| **M2 — `ActorReference = "meals-system"`** | **2 fail**: the runtime pin, and `Every_module_audit_site_stamps_an_actor_that_cannot_be_blank(Meals)` | `m2-hardcoded-actor.trx` |
| **M3 — the `IsNullOrWhiteSpace` refusal removed** | **1 fail**: the census rule, verbatim *"`userId` is neither bound from a recognised provenance nor refused ahead of this stamp"* | `m3-refusal-removed.trx` |
| **M5 — `ActorReference = superseded.ApplicationUserId`** | **1 fail**: the census rule — *"`superseded` is bound from an unrecognised source"* | `m5-actor-off-the-row.trx` |
| restored (after M2, after M1) | 49/49 pass | `restore-after-m2.trx`, `restore-after-m1.trx` |

**M5 is the one to read carefully.** It is **value-equivalent at runtime** — the guard clause above it
asserts `superseded.ApplicationUserId == userId` ordinally, so the row would carry the identical string and
the runtime pin cannot see it. It reds only statically. That is the honest reading: M5 proves the census
rule covers what the pin cannot, **not** that the value would have been wrong.

**A mutant that would NOT red, stated rather than hidden:** deleting the `"Services/Meals/MealsQuoteService.cs"`
line from `KnownFiles` while leaving the stamp in place. `The_derived_scope_still_sees_the_whole_population`
asserts declared files are *found*, not that found files are *declared*, and the site floor is still met at
15. The declaration is load-bearing in the other direction only (M1).

**A red-then-green run that was invalid and was redone.** The first M2 run measured a stale binary: the
clean-source backups had been parked at `lanes/L-SUPERSEDE-RELEASE-IS-ATTRIBUTED/*.clean.cs`, inside
`WebApi.csproj`'s compile glob, so every build after them failed with `CS0101` while `-v q` and a
too-narrow grep hid it, and `--no-build` then ran the previous assembly. Backups moved out of the tree to
the session scratchpad as `.txt`; every mutant below was re-run with `WebApi.dll`'s mtime checked against
the source's after each build.

## Regression

`(FullyQualifiedName~WebApi.Tests.Meals.|FullyQualifiedName~WebApi.Tests.Modules.)&Database!=SqlServer`
— **515 passed, 0 failed, 3 skipped** (`final-clean.trx`). The three skips are pre-existing documented
gaps, not this lane's.

## Container discipline

**No SQL slot was granted and none was taken.** Zero tests named `*SqlServer*` appear in any trx here.
A `mcr.microsoft.com/mssql/server` container (`friendly_colden`, testcontainers session `9ad797d1`)
appeared at 08:37:12Z while the wide run was finishing; it was traced to **another lane** — a live
`dotnet test --filter FullyQualifiedName~EventsSettlementStaleRevisionSqlServerTests` in
`/Users/svendaneel/okam/wt-evstalerev` — and **left alone**. Its ryuk and the four long-dead containers
from other sessions were likewise not touched.

## Constraints

- **C1** — no append-only table is updated or deleted. One `MealsAuditEvent` is INSERTed through
  `MealsAuditWriter`, the module's declared sole writer; `MealsFundingReservations` is the mutable state
  machine and `MealsBudgetGuards` a rebuildable projection, exactly as the three existing release paths
  treat them.
- **C2** — **no migration authored.** No column, index or constraint is added; `MealsAuditEvent` already
  carries every field stamped.
- **C3** — reachable: the constructor dependency `IMealsAuditWriter` is already
  `AddScoped`-registered (`Program.cs:850`) and the release fires on the live
  `POST /v1/stores/{storeId}/meals/quotes` path a client already reaches with `SupersedesToken`.
- **C4** — the point of the lane. The fourth money-path write names the authenticated guest that caused it,
  refused ahead of the stamp rather than defaulted.
- **C5** — not claimed. This is a suite-tier lane; no acceptance is asserted from a green suite.
- **C7** — the supersede bearer token is never stamped: the row carries reservation ids, minor units and a
  reason code only, and the pin asserts `DoesNotContain(first.AuthorizationToken, ...)` over both the
  payload and the correlation id.

## The merged world, MEASURED rather than reasoned

The lane exists because the hazard is at a merge, so the merge was actually performed — on a throwaway
`trial/supersede-attrib-x-release-actor`, since deleted, **never landed and never pushed**. Merging
`lane/meals-release-actor` (`249612ac`) into this lane's commit conflicts in four files:
`MealsFundingAuthority.cs`, `MealsFundingTestKit.cs`, `ModuleActorStampPin.cs`,
`Wire/MealsFundedCheckoutWireTests.cs`. Three are additive unions; the fourth is the real one — the sibling
was written against a base with **no** `ReleaseSupersededAsync` and no `boundIsReleasable`, so its rewrite
of `ReleaseResolvedReservationAsync`'s signature collides with the tip's. Resolved mechanically **for
measurement only** (union the parameters, keep both in-transaction hunks, pass `MealsActorKind.User, userId`
from `ReleaseSupersededAsync`).

**Two things the merge then measured that no branch shows alone.**

1. **This lane's site reds in the merged world, and needs exactly one more line.** The sibling declares an
   `ActorCoherence` for **the whole Meals module**, and `JudgeUnderDiscriminator` rejects any stamp that
   names no `ActorKind`. Measured: `Services/Meals/MealsQuoteService.cs:785: the row names no ActorKind`
   (`merged-world-before-kind.trx`). Adding `ActorKind = MealsActorKind.User,` to the stamp clears it —
   re-measured, this site no longer appears (`merged-world-with-kind.trx`). **That one line is the whole
   merge instruction for this lane**, it cannot be written here (the enum does not exist on this base), and
   `MealsActorKind.User` is the only correct value: this path has no background, ambient or system route.
   `KnownSiteFloor` resolves to **17** (14 + the sibling's 2 + this lane's 1); `KnownFiles` merges cleanly
   because the two lanes add different entries.

2. **The merge leaves ONE offender that is nobody's to fix here, and it is an open owner flag.** With the
   sibling's coherence contract in force, the tip's OWN POS-tender stamp becomes an offender:
   `Services/Meals/MealsFundingAuthority.cs:251: the row names no ActorKind`. It cannot be closed by
   adding a line, because `MealsActorKind` is `{ User = 0, System = 1 }` and that stamp's actor is a till
   operator (`"pos-operator:7"`) — not an `ApplicationUser` id, so `User` misnames which population it
   belongs to, and `System` is both false and would force the reference to be exactly null, deleting the
   operator's name from the ledger. **This is measured confirmation of the open blocker
   `F-MEALS-FUNDING-AUTHORITY-COLLISION`**, whose `clears_when` already asks for *"an actor kind that has a
   correct value for a till operator"*. Owner's call; nothing was decided here.

# L-MEALS-REQUOTE-RELEASE — evidence

Base `de1e5c5e` (feature/restaurant-modules). Backend commit `81d9f5fe` on `lane/meals-requote-release`.
Client `lane/meals-requote-release` in ConsumerWeb + its Core submodule. Harness on `feature/restaurant-modules`
in Web-modules.

## The finding, verified before building

Confirmed, with one correction to the brief's file path. The client-side mitigation the brief cites as
`core/pinia/checkout.ts` lines 761-768 is in the SIBLING repo — `ConsumerWeb/core/pinia/checkout.ts`
(884 lines), `ensureFundableReservation` at 770. Web-modules' own `core/pinia/checkout.ts` is 533 lines
and contains no Meals code at all. Everything else in the brief held:

- `MealsQuoteService.CreateQuoteAsync` adds every quote's cap to `MealsBudgetGuards.ReservedMinor`
  (the compare-and-increment at line ~224) and nothing subtracts it on a re-quote.
- `IMealsFundingAuthority.ReleaseAsync` exists and already handles a `Reserved` (unbound) reservation,
  but `MealsFundingController` exposes companies / context / quotes / orders and no release route, so no
  client can reach it.
- The journey header's doubled `ALLOWANCE_MINOR = 50000` was the defect's signature.

## Where the fix went, and why

**The server, via a token the caller names.** Not the brief's "release the caller's prior reserved
reservation", and not the client alone.

The unconditional server-side form is REFUTED by measurement. At this endpoint a re-quote and a second
independent cart are the same request — same user, same store, a new hash, a new idempotency key — so
inferring the supersede breaks two deliberate money guarantees that already exist:

| Existing pin | What inference would do |
| --- | --- |
| `MealsReservationStateMachineTests.Quote_over_the_period_allowance_is_denied_and_the_guard_is_unchanged` (line 119): 15000 then 10000 against a 20000 allowance must be `MEALS_ALLOWANCE_EXCEEDED` | the second quote would succeed |
| `MealsFundingConcurrencyTests` (line 38): 20 concurrent same-user quotes, `expectedWinners = AllowanceMinor / cap` = 10 | all 20 would win, each freeing the last one's hold |

A third pin constrains the scope even after narrowing:
`MealsExpiryGraceReconciliationTests.Expired_reserved_but_unbound_quote_is_released_without_an_exception`
(line 90) mints its second quote **after** the first has expired and then asserts the sweep's
`ReleasedReserved == 1`. So the release must skip EXPIRED reservations — they are the sweep's candidates,
released under its own `MEALS_RESERVATION_EXPIRED` code. This is the sweep hazard the brief named, and it
is why the expiry check is in the guard clause rather than assumed away.

Client-only was rejected for the brief's own reason: it leaves every other client and every direct API
caller double-holding. The division that survives all three constraints is — the server owns the
release, the client owns *naming* what it supersedes, because only the client knows.

Shape: optional `CreateMealsQuoteRequest.SupersedesToken`, released inside the quote's existing
transaction, **before** the compare-and-increment, only when the token resolves to a reservation that is
`Reserved`, unexpired, owned by this caller, and on the same (Program, Membership, PeriodKey) guard row.
Every other case is a silent no-op — a re-quote must not fail because the hold it replaced had gone.

## Constraints

- **C1** — no UPDATE/DELETE against an append-only table. The release writes `MealsFundingReservations`
  (mutable state machine, not append-only) and decrements the `MealsBudgetGuards` projection, exactly as
  the two existing release paths do.
- **C2 / MIGRATION** — **no migration authored.** `MEALS_RELEASED_SUPERSEDED` is a value in the existing
  `ReleaseReasonCode` column (`HasMaxLength(64)`, ApplicationDbContext:3264; the code is 25 chars) and
  `SupersedesToken` is a request field, not a column. The contested chain was not touched and no THROW
  number was claimed.
- **C3** — reachable end to end: request field → existing `POST /v1/stores/{storeId}/meals/quotes`
  (`[FromBody]`, no controller change needed) → client sends it from `quoteCompanyAccount`.
- **C4** — the release names an actor **structurally rather than by a column**, which is the honest
  description: it fires only for a reservation whose own `ApplicationUserId` equals the authenticated
  caller `RequireResolvedCaller` already proved non-blank, AND only for a caller holding its
  authorization token. There is no background, ambient or system route into it — strictly more
  attribution than either existing release path, which core checkout reaches with no user at all.
  **Owed to `L-MEALS-RELEASE-ACTOR`:** when the explicit release-actor column lands, this path must
  populate it with `userId`. Named in the method's doc comment so it cannot be missed.
- **C5** — the journey is browser evidence against a fixture, not a person completing a journey. Not
  claimed as acceptance.
- **C7** — the supersede token is a bearer credential: never logged, never persisted (only its hash is
  compared), and deliberately excluded from the idempotency request hash so it never enters a persisted
  receipt's identity.

## Tiers run

All SQLite / fast tier. `four-way-sqlite.trx` — 51/51, container-free.

### Backend, non-vacuity (both directions)

| State | Result |
| --- | --- |
| clean | 51/51 pass |
| **mutant 1** — release neutered (`if (true) return;`) | **3 fail**: `A_requote_naming_the_reservation_it_replaces_holds_the_allowance_once`, `Two_requotes_naming_one_token_free_its_cap_exactly_once`, `Replaying_a_requote_key_reserves_and_releases_nothing_further` |
| **mutant 2** — release moved AFTER the compare-and-increment | **1 fail**: the money pin, refused `MEALS_ALLOWANCE_EXCEEDED` |
| restored | 51/51 pass |

Mutant 2 is the one worth keeping: it proves the *ordering* claim in the code comment is load-bearing and
not decoration. Both mutants were applied and restored by writing the file (fresh mtime) and neither run
used `--no-build`.

### Journey, non-vacuity (the instrument the exit criterion names)

`ALLOWANCE_MINOR` 50000 → **25000** in `meals-stale-token-requote.spec.js`. Run both ways at the SMALLER
allowance, which is the only thing that makes the shrink evidence:

| State | Result |
| --- | --- |
| with the fix | **passes** — confirmation at 206,80, remaining allowance short by the tipped cart only |
| **client mutant** — `supersedes = undefined` (client stops naming what it supersedes) | **FAILS** — `page.waitForURL(/\/confirmation/)` times out at spec line 97; the re-quote is refused `MEALS_ALLOWANCE_EXCEEDED` (25000 − 18800 = 6200 left, tipped cart 20680) and the guest never reaches confirmation |
| restored | passes; full consumer suite 6/6 |

### Four-way merge trial

`lane/meals-floor-pins`, `lane/meals-grace-pins`, `lane/meals-degenerate-two` all merged into this lane's
commit — **no textual conflict** (all three are test-only in files this lane does not touch; this lane's
production files are `MealsQuoteService.cs`, `MealsFundingModels.cs`, `MealsReasonCodes.cs`). All four
lanes' pins pass together: 51/51 container-free, and 59/59 including the SqlServer nested classes
(`four-way-merge.trx`).

**No production-file overlap with `L-MEALS-RELEASE-ACTOR` either.** The release is written inline in
`MealsQuoteService.cs` and deliberately does NOT add a `MealsReleaseCause` member or touch
`MealsFundingAuthority.ReleaseReasonFor`, so that lane's edits to `MealsFundingAuthority.cs` cannot
collide. A supersede never crosses the checkout seam, so it does not belong in the seam's cause
vocabulary anyway.

## Container discipline — a slot was taken that was not granted

The four-way merge run used the filter
`FullyQualifiedName~MealsExpiryGraceReconciliationTests|...`, and that substring also matches the NESTED
`MealsExpiryGraceReconciliationSqlServerTests` / `MealsFundingPathHardeningSqlServerTests` classes. A SQL
Server Testcontainer (`infallible_clarke`, session `120ba2a9`) plus its ryuk started at 19:49:37. Caught
at 19:50:32 and **removed immediately**; the other lane's `zen_pasteur` (session `dc42565a`, up 2 h) was
identified and left alone. The run was repeated container-free.

**Generalising the brief's warning:** `FullyQualifiedName!~SqlServer` is not container-free, and neither
is restricting to `WebApi.Tests.Meals`. Ten Meals classes call `CreateSqlServerAsync` without
`SqlServer` in the class name — `MealsCaptureLedgerTests`, `MealsFundingConcurrencyTests`,
`MealsGuardDriftDetectionTests`, `MealsHarnessSmokeTests`, `MealsProjectionCheckpointReplayTests`,
`MealsProjectionRebuildTests`, `MealsStatementActorAttributionTests`,
`MealsStatementJournalTruthOracleTests`, and others. The only container-free filter is a positive
whitelist with a **trailing dot** (`FullyQualifiedName~Meals.MealsRequoteSupersedeTests.`), which stops
the substring reaching a nested `...SqlServerTests` sibling.

**Consequence for one claim:** `MealsFundingConcurrencyTests` is SQL Server only and was NOT run. The
10-winner argument above is from reading its source (line 38, `expectedWinners = MealsWorld.AllowanceMinor / cap`),
not from a run. It is an argument for the design, not a measured result, and it is safe in the shipped
direction — those racers pass no `SupersedesToken`, so the release path is never entered.

## What this lane changed that it did not set out to change

`meals-stale-token-refused` **had to be repaired**: its premise was the defect. On the world's default
25000 allowance those clicks used to be refused because the guest's own pre-tip reservation held 18800 of
the budget — its `defect` finding says exactly that, and calls the fix "backend work ... NOT in this
lane". With the fix the re-quote succeeds and the journey's refusal disappears. It now seeds
`allowanceMinor=20000`, on which the tipped cart (20680) genuinely does not fit even after the release,
so what it measures is what it was built for — the refusal LANDING SITE, before an order exists to
cancel — and its `defect` finding is demoted to a closed `note`.

## Left open, deliberately

`clearCompanyAccountTender` drops the token client-side when a guest switches from the company account to
a card, so that reservation still strands until the 15-minute expiry. The supersede cannot reach it —
there is no next quote to name it, and still no release route for a client ABANDONING a tender rather
than replacing it. Costs the allowance once rather than twice, and only until the sweep runs. Recorded as
a `note` finding on the journey; not in this lane.

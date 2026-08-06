# L-WF-CORRECTION-PATH — detail

## Blocker re-verified before building (F-WF-NOCORRECTION still true at a273e013)

- `CorrectionActorReference` / `CorrectedAtUtc` are written at exactly two sites, both literal `null`:
  `WorkforcePersonnelListProjection.cs:116` (clock-in open) and `:132` (clock-out close, commented
  "a natural clock-out close is not a manager correction").
- `WorkforcePersonnelListController.cs` held two `[HttpGet]` actions and no write action of any kind.
- The only non-null correction row in the estate was the committed read fixture
  (`docs/api/fixtures/workforce/personnel-list.json` via `PersonnelListContractTests`) — a row the
  product could not produce. That is why the gap was invisible to a green suite.
- Columns already exist (`RestaurantModules_Initial`, `nvarchar(256)` + `datetime2`, both nullable),
  so NO migration was needed and none was authored.

## What was built

Backend (`lane/wf-correction-path` off `feature/restaurant-modules` @ `a273e013`, commit `305dbe79`):

- `POST /workforce/stores/{storeId}/personnel-list/entries/{entryId:guid}/corrections`
- `WorkforcePersonnelListCorrectionRequest`: `onSiteStartLocal`, `onSiteEndLocal?`,
  `utcOffsetMinutes?` — venue WALL-CLOCK, resolved server-side through `IStoreTimeZoneResolver` and
  `WorkforceScheduleSupport.ResolveInstant` (DST: spring gap refused, fall fold needs the offset).
- `IWorkforcePersonnelListService.CorrectEntryAsync` — capability `WorkforceManager`, opaque 404 for
  an entry the route store does not hold, `Idempotency-Key` required, audited
  `personnel-list.entry.correct` with SHAPE only (`adjustedField` / `participantCategory` /
  `supersededEntry`, all already allowlisted — the fail-closed allowlist was NOT widened).
- The append: a new entry with `SupersedesEntryId` = target, `CorrectionActorReference` =
  `caller.StaffMemberId.ToString()` (blank-proof by type), `CorrectedAtUtc` = injected clock.
  `LocalBusinessDate`, business identity and participant are copied from the target — the corrected
  row never moves off the day an inspector asked to see.

Frontend (`lane/fe-wf-correction-path` off `feature/restaurant-modules` @ `a1a1ec8`, commit `6a641bc`):

- `WorkforcePersonnelListService.CorrectPersonnelListEntry` (route-for-route; refuses a time carrying
  a `Z` or an offset rather than coercing it).
- `WorkforcePersonnelListSheet` gains an opt-in `correctable` prop + per-row `correct` emit; the
  control is hidden in `@media print` (chrome, not register) and `colspan` follows the column count.
- The page gains the correction form (prefilled from the sheet's already-resolved venue stamps),
  the "no departure recorded" choice, boundary refusals, re-read on success, form kept open on a
  server refusal. 14 new keys in `no.ts` / `en.ts` / `de.ts`, hand-edited, asserted present and
  non-empty in all three.

## Ordering decisions worth review

1. The supersession check runs in `onProceed` (AFTER the idempotency reservation), not before it.
   Correcting an entry is precisely what makes it superseded, so in front of the reservation a
   same-key retry of a correction that already SUCCEEDED would answer 409 instead of replaying.
   Nothing is staged when it throws — the guard never mutates a tracked entity and then refuses.
2. The refusal reuses `WorkforceErrorCodes.StaleRevision` rather than minting a new code. The codes
   are a pinned public contract; "the row you named is no longer current" is exactly §5.4's shape.

## The flag decision (Sven-visible)

The correction is behind NO stage flag, unlike every other Workforce write.
`WorkforceFeatureFlags.Withheld[PersonnelList]` was rewritten to say why: § 8-5-6 makes recording a
rettelse part of KEEPING the register, so a switch that paused corrections leaves a venue holding a
list it knows is wrong and may not fix. `workforce.clock` (which gates the neighbouring attendance
adjustment) is wrong for the same reason — pausing the till clock is when yesterday's window most
needs correcting. Consequence: `WorkforceFlagConsumptionTests`' "the two withheld keys gate nothing"
assertion stays true and no catalog/census change was needed. If Sven wants it gated, the honest
move is to un-withhold the flag AND extend `WorkforceFlagCensus.Mutations` with this route.

## One shared guard needed an allowlist entry

`RowversionAssertionProviderTests` flagged both new refusal tests: its scope is derived from the
vocabulary of staleness plus the word "revision". The personalliste entry carries NO rowversion at
all (app-assigned Guid key, no concurrency column — deliberately, so the INSERT emits no OUTPUT
clause and the retention-lock trigger permits it), and the "revision" refused on is the superseding
entry's Guid, which the test itself wrote. Two entries added to `Allowed` with that reason.

## Runs

- Backend container-free (`--filter "Database!=SqlServer"`): see `backend-containerfree-final.txt`.
  No SQL Server tier run — five foreign containers hold ~6.3 GiB of the VM; started none, killed none.
- Frontend `npx jest` under `TZ=Europe/Oslo`: `frontend-jest.txt`, 2491/2492. The single failure is
  `journey-artifact-store.test.js` asserting `/^Web-modules@.../` on the checkout DIRECTORY NAME, so
  it fails in any worktree not named `Web-modules`; it passes in the base checkout, unmodified.
- The 3 suites that "failed to run" on the first pass were the un-initialised `core` submodule in a
  fresh worktree, not a regression; `core` was copied in for the recorded run and removed afterwards.
- Mutation check (non-vacuity): `CorrectionActorReference = actor` -> `= target.CorrectionActorReference`,
  REBUILT (assembly mtime moved), 3 red — the two by-value service assertions and the wire one; the
  audit test stayed green, which is correct since the audit actor is a separate stamp. Reverted with a
  real write plus `touch`, rebuilt, 31/31 green.

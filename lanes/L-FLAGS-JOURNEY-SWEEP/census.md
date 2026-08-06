# Census — every browser journey on this branch, and the gate it walks

Twelve journeys across two Playwright configs. Every one is listed, including the clean ones: a sweep
that reports only its hits cannot be told apart from a sweep that missed some.

Gating established by reading the backend at `/Users/svendaneel/okam/OkamAPI-modules` (worktree HEAD
`lane/meals-grace-pins`; `feature/restaurant-modules` exists there but is not checked out — nothing
was switched).

## Admin config — `playwright.config.js`

| # | Journey | Surfaces walked | Gate on those routes | Verdict |
|---|---|---|---|---|
| 1 | `admin-refusal-worker` | `/admin` nav, `/admin/workforce-schedule` (bounced), `/admin/workforce-me` | `workforce.module` — but see below | **CLEAN** |
| 2 | `events-guest-proposal` | `/events/proposal/{token}` (public) | config `Events:Enabled` only, no per-store flag | **CLEAN** |
| 3 | `events-runsheet-print` | `/admin/events-pipeline` | `Events.Core` on all five reads; `Events.Settlement` on the settlement facet | **WAS HOLED — fixed** |
| 4 | `events-runsheet-onboarding` | `/admin/events-pipeline` | same | **WAS HOLED — fixed** |
| 5 | `workforce-schedule-publish` | `/admin/workforce-schedule` | `workforce.publication` on all four writes | **CLEAN** (fixed by `6b02462`) |
| 6 | `workforce-flag-lever` | `/admin/feature-flags` + schedule | the pattern itself | **CLEAN** |

## Consumer config — `playwright.consumer.config.js` (drives `../ConsumerWeb`)

| # | Journey | Surfaces walked | Gate on those routes | Verdict |
|---|---|---|---|---|
| 7 | `meals-funded-checkout` | `/checkout` | `Features:Meals:Module` + `:Ordering` (host config) | **WAS UNMODELLED — fixed** |
| 8 | `meals-funded-guard` | `/checkout` | same | **WAS UNMODELLED — fixed** |
| 9 | `meals-funded-over-allowance` | `/checkout` | same | **WAS UNMODELLED — fixed** |
| 10 | `meals-stale-token-refused` | `/checkout` | same | **WAS UNMODELLED — fixed** |
| 11 | `meals-stale-token-requote` | `/checkout` | same | **WAS UNMODELLED — fixed** |
| 12 | `meals-module-dark` | `/checkout` | same, stood up DOWN | **NEW — the standing mutation** |

## Modules with no journey at all

**Margin, Training, Growth.** All three are deny-closed and all three now have a lever on
`/admin/feature-flags`, but no browser journey walks any of their surfaces, so none of them can carry
the defect this lane hunts. That is a gap in journey coverage, not a gap in this sweep.

---

## The three journeys that turned out clean, and why

### 1 · `admin-refusal-worker` — clean, on a nuance worth writing down

`WorkforceMeController` carries no feature-flag gate. `workforce.selfservice` gates WRITES only
(`EnsureStageWriteEnabledAsync` in `WorkforceTimeOffService`, `WorkforceAvailabilityService`,
`WorkforceSelfService`) and this journey performs none. The `/me/*` READS filter by
`workforce.module` per store rather than refusing — `ModuleEnabledEngagementsAsync` drops a
module-off store's engagements and answers 200.

`GET /workforce/stores/{id}/context` IS gated on `workforce.module`, with a 403
`workforce.module-disabled`. But `WorkforceModuleGate.IsEnabledAsync` **grandfathers**: with no
override row it probes `WorkforceStaffMembers` for the store and answers true if any exist. Fixture
store 42 has two. So the store the journey walks is module-on without anybody flipping anything, and
no per-store switch would have refused a single step.

That same grandfather is why `workforce-schedule-publish` needed only `workforce.publication`: the
module flag was never the one refusing it.

### 2 · `events-guest-proposal` — clean, and it contradicts what the code says about itself

`IEventsModuleGate`'s own docstring says storeless public token routes have "their store-scoped
`Events.Core` refinement applied in the service once the token resolves the store".
`EventsProposalService` has no `IEventsModuleGate` dependency at all, and `GetPublicAsync`,
`AcceptAsync` and `DeclineAsync` perform no store check. The only gate on those three routes is
`EventsController`'s controller-wide action filter on `IsEnabled` — the deployment-wide `Events:Enabled`
config switch, which is not a per-store flag, has no row, appears in no `appsettings.json`, and no
lever on `/admin/feature-flags` can move.

So the journey has no switch of its own to turn on, and modelling one in the fixture would have
asserted a gate the product does not have. The fixture now says so in a comment instead.

The sibling public deposit page DOES apply the refinement (`EventsDepositService` calls
`IsStoreFlagEnabledAsync(..., Events.Core)`), so the asymmetry is real and is recorded as a backend
finding below — **accept and decline are state-changing writes reachable with `Events.Core` off.**

### 5, 6 · the two workforce journeys — clean, and one of them is the pattern

`workforce-schedule-publish` was the flagship finding and it was already closed by `6b02462`; this
lane re-verified the fixture really enforces `workforce.publication` on all four writes and leaves the
reads answering (§9.2 says READ-ONLY, not dark). `workforce-flag-lever` is the pattern the two Events
journeys now copy.

---

## What was actually holed

### Events — two journeys, every read refused on a real venue

`Events.Core` is deny-closed and gates the READS, which is the difference from Workforce. All five
reads the pipeline page fans out resolve through `IEventsModuleGate.IsStoreEnabledAsync`:

| Read | Guard | Flag |
|---|---|---|
| `GET /events/admin/{s}/events` | `EventsController.GuardStoreAsync` | `Events.Core` |
| `GET /events/admin/{s}/events/{id}` | same | `Events.Core` |
| `GET /events/admin/{s}/events/{id}/deposits` | `EventsDepositsController.AuthorizeStoreAsync` | `Events.Core` (NOT `Events.Deposits` — only the ISSUE needs that) |
| `GET /events/admin/{s}/events/{id}/run-sheet` | `EventsRunSheetController.GuardStoreAsync` | `Events.Core` |
| `GET /events/admin/{s}/events/{id}/settlement` | `EventsSettlementController.AuthorizeSettlementAsync` | `Events.Core` **AND** `Events.Settlement` |
| `GET /events/admin/{s}/notifications/health` | `EventsNotificationsController.AuthorizeStoreAsync` | `Events.Core` |

Both run-sheet journeys opened a populated pipeline against a fixture with no gate in it. On a real
venue there would have been no pipeline, no event, no run sheet and nothing to print.

**Fixed by:** the fixture now refuses every `/events/admin/**` read with 404 `EVENTS_DISABLED` unless
`Events.Core` resolves on for the route's store, and refuses the settlement facet additionally on
`Events.Settlement`. Both journeys now open on a dark venue, **assert the refusal**, then turn
`Events.Core` on by pressing the button on `/admin/feature-flags` — the product's only caller of
`PUT /stores/{id}/feature-flags`.

`Events.Settlement` is deliberately left DOWN. That is the ordinary posture of a venue running events
without the money machine, and it means the page now proves it renders the run sheet with one of its
four facet reads refused — a property nothing had walked.

### Meals — five journeys, and no lever anywhere

Every route the consumer journeys touch is gated by **host configuration**, not by a per-store flag:

- `GET /v1/meals/me/companies`, `GET /v1/meals/me/context` → `RequireVisible()` → `IsModuleEnabled`
- `POST /v1/stores/{id}/meals/quotes` → `RequireOrderingVisible()` → `IsOrderingEnabled`
- the funding bind inside `POST /carts/complete/{id}` → `MealsFundingAuthority` → `IsOrderingEnabled`

`MealsFeatureGate` binds `Features:Meals` through `IOptionsMonitor`, both keys default false, and
`IsOrderingEnabled` is `Module && Ordering` — the hierarchy is real and enforced in the gate.
`MealsQuoteService` has no `IMealsStoreFeatureFlags` dependency at all. The per-store `meals.module`
is honoured at exactly three store-addressable ADMIN routes, none of them on this path.

**So flipping `meals.module` on for a store does not enable that store's quotes or funded checkouts,
and flipping it off does not stop them.** The one lever the switchboard offers for Meals does not
reach the surface these journeys walk, and `meals.ordering` is withheld from the catalog outright.

**Fixed by:** the consumer fixture now models the `Features:Meals` gate (module + ordering, ANDed as
the real gate ANDs them), seeded ON as the deployment posture the five journeys claim, re-seedable
down via `POST /__fixture/reset?mealsModule=0&mealsOrdering=0`. Because no product surface can flip
it, the five journeys cannot "turn their own switch on" — so the mutation is made **permanent
instead**, as journey 12.

---

## The mutation proof

Four knockouts, each restored byte-for-byte afterwards. Scripts and logs in this directory.

| # | What was knocked out | What must red | Result |
|---|---|---|---|
| A | the journey's flip of `Events.Core` (fixture gate intact) | `events-runsheet-print` | **RED** at *open the confirmed event* — `.ev-pipeline__row` not found |
| B | the fixture's `Events.Core` gate (journey intact) | the dark-venue control | **RED** at *before any switch is flipped, the venue is dark* — `.ev-pipeline__notice` not found |
| C-A | the fixture's Meals module gate (journey intact) | `meals-module-dark` | **RED** at *the company payer strip is not offered at all* — expected 0, received 1 |
| C-B | the world stood up with `Features:Meals` dark | `meals-funded-checkout` | **RED** at *the company payer strip offers the company tab* |

A and C-B are the exit criterion asked literally: turn a gate off, the journey reds. B and C-A are the
other half, and the reason this lane did not reproduce the defect one level up: they prove the new
controls are not vacuous. Without B, "the venue is dark" would pass against a fixture with no gate at
all — which is precisely the world this sweep was sent to find.

---

## Findings handed on, not fixed here

1. **`Events.Core` does not gate the public proposal token routes** — `GET /events/proposals/{token}`,
   `POST .../accept`, `POST .../decline`. Accept and decline are state-changing writes. The sibling
   deposit page applies the refinement; these three do not, and `IEventsModuleGate`'s docstring claims
   they do. Backend-owned.
2. **The Meals catalog lever does not reach the consumer funded-checkout path** (see above). An
   operator flipping `meals.module` on `/admin/feature-flags` will believe they have enabled or
   disabled a venue's Company Meals and will be wrong in both directions. Backend/product-owned.
3. **The admin fixture's `effective` for `workforce.module` diverges from the real API.** The backend
   registers `WorkforceModuleFlagEffectiveResolver`, so `GET /stores/42/feature-flags` reports
   `workforce.module` effective **true** for a store with staff (the grandfather probe). The fixture
   models no resolver and reports false. Not changed here on purpose: `workforce-flag-lever` step 2 is
   named *"deny-closed"* and screenshots that board, and this lane must not rewrite the neighbouring
   lane's evidence. Whoever owns that journey should decide.
4. **`flip()` is now defined twice** — locally in `workforce-flag-lever.spec.js` and in the new shared
   `test/e2e/support/flags.js`. The flag-lever spec was left untouched deliberately (it landed hours
   ago and other lanes are in that neighbourhood); collapsing the two is a one-line follow-up.
5. **The consumer fixture answers `MEALS_MODULE_UNAVAILABLE` for two non-module cases** — an unknown
   `companyId` and a missing `quoteHash`. The real surface answers `MEALS_NOT_FOUND` for both
   (`MealsProblemException.FundingNotFound`). Pre-existing, untouched, and harmless to the journeys as
   written, but it is a code the client maps to its own copy.
6. **`test/e2e/` is not lint-clean at HEAD** — 30 eslint errors across the two consumer fixture files
   alone, all `object-property-newline` / `arrow-parens` style. The new files added here are clean;
   extending `consumer-world.js`'s existing multi-property export line adds 2 more of an identical
   violation that block already carries 12 of.

# Census — every browser journey at the world tip, and the gate it walks

Base: `feature/restaurant-modules` @ `e34977a`. **28 journeys**, all listed including the clean ones:
a sweep that reports only its hits cannot be told apart from a sweep that missed some.

Gating established by reading the backend at `/Users/svendaneel/okam/OkamAPI-modules`
(`lane/meals-grace-pins` @ `34c6c103`, 638 routes). Nothing there was checked out or changed.

## Why this sweep exists when `bb1bf0c` already did one

`bb1bf0c` ("Every gated journey turns its own switch on", 2026-08-01) closed exactly this shape — for
**the twelve journeys that existed on 2026-08-01**. The world tip carries **28**. Sixteen journeys
were written after the remedy, by lanes that did not have it in front of them, and two of them
re-acquired the defect it removed.

That is also why the blocker re-measure's `already-fixed` verdict was true and still incomplete: the
remedy is real, is at the world, and is dated two days before the ruling — and the exit criterion
says *every* gated surface *a journey* walks, which is a moving denominator.

## Admin config — `playwright.config.js` (22)

| # | Journey | Gate on the routes it walks | Lever | Verdict |
|---|---|---|---|---|
| 1 | `account-email-confirm` | `growth.module` on the test-send (`GrowthNewslettersController:141`) | yes | CLEAN — flips it |
| 2 | `admin-refusal-worker` | `workforce.module`, but `WorkforceModuleGate` grandfathers a store with staff rows | yes | CLEAN |
| 3 | `events-deposit-precondition` | walks `/admin/feature-flags` only — the board IS its subject | n/a | CLEAN |
| 4 | `events-enquiry-to-settlement` | `Events.Core`, `Events.Settlement` | yes | CLEAN — flips both, and off again |
| 5 | `events-guest-proposal` | public half: host `Events:Enabled` only; admin half `Events.Core` | partly | CLEAN |
| 6 | `events-runsheet-onboarding` | `Events.Core` on all five reads | yes | CLEAN — fixed by `bb1bf0c` |
| 7 | `events-runsheet-print` | same, `Events.Settlement` left down on purpose | yes | CLEAN — fixed by `bb1bf0c` |
| 8 | `growth-guest-consent` | `growth.module` on both guest routes | yes | CLEAN — flips it |
| 9 | `growth-newsletter-send-gate` | `growth.module` + `growth.dispatch` | yes | CLEAN — flips both |
| 10 | `growth-privacy-queue` | **none** — `GrowthConsentAdminController` carries no module gate, StoreAdmin auth only | n/a | CLEAN, and it proves it |
| 11 | `margin-recipe-to-margin` | `Margin.Module`, `Margin.Statements` | yes | CLEAN — flips both, and off again |
| 12 | `margin-statement-week` | `Margin.Module`, `Margin.Statements` | yes | CLEAN |
| 13 | `margin-supplier-to-plate` | `Margin.Module` (suppliers); `Margin.PriceImport` gates only `MarginPriceImportsController`'s six routes, which it never walks | yes | CLEAN |
| 14 | `margin-week-freeze` | `Margin.Module`, `Margin.Statements` | yes | CLEAN |
| 15 | **`meals-admin-setup`** | **`meals.module` per-store on THREE of its routes** | **yes** | **WAS HOLED — fixed here** |
| 16 | **`meals-guest-claim`** | **`Features:Meals:Module` host config on both invitee routes** | **no** | **WAS UNMODELLED — fixed here** |
| 17 | `modal-estate-scroll-lock` | `/admin/ongoing` → `GET /orders/ongoing`, no module gate | n/a | CLEAN |
| 18 | `modal-scroll-lock` | `/admin/lang` → `/culture`, no module gate (PowerUser role on writes) | n/a | CLEAN |
| 19 | `training-course-to-evidence` | `training.setup`, `training.assignments` | yes | CLEAN — flips both, and off again |
| 20 | `workforce-flag-lever` | the pattern itself | yes | CLEAN |
| 21 | `workforce-invitation-onboarding` | roster read `workforce.module` (grandfathered); invitation CREATE `workforce.setup`; public claim **ungated**; schedule half `workforce.publication` | yes | CLEAN — see note |
| 22 | `workforce-schedule-publish` | `workforce.publication` on all four writes | yes | CLEAN — fixed by `6b02462` |

## Consumer config — `playwright.consumer.config.js` (6)

All six were swept by `bb1bf0c` and are unchanged here: five `meals-funded-*` / `meals-stale-token-*`
walks against a modelled `Features:Meals` gate, plus `meals-module-dark`, the standing dark journey.
They drive the sibling `ConsumerWeb` checkout and this lane did not run them.

---

## What was actually holed

### `meals-admin-setup` — the flagship shape, and its own finding said the opposite

Three of the routes this walk drives are **store-addressable**, and all three resolve the per-store
`meals.module` override through `StoreBackedMealsFeatureFlags.IsModuleEnabledAsync`:

| Route | Guard | File:line |
|---|---|---|
| `GET /v1/stores/{s}/meals/companies` | `RequireStoreModuleAsync` | `MealsCompanyService.cs:382` → `:456` |
| `GET /v1/stores/{s}/meals/orders` | `RequireStoreModuleAsync` | `MealsReconciliationService.cs:76` → `:306` |
| `POST /v1/stores/{s}/meals/companies/{c}/agreements` | `RequireStoreVisibleAsync` | `MealsAgreementController.cs:50` → `MealsAgreementService.cs:239` |

`meals.module` is deny-closed, it is the module's ONE key in the per-store catalog, and
`/admin/feature-flags` moves it. So on a venue nobody had switched on, this walk's directory read was
refused, its orders read was refused, **and its corridor signing — a write, step three of five — was
refused.** All of it was green because `fixture/meals.js` modelled no gate at all.

**Worse than an omission:** the journey's own last step *recorded a finding* saying this surface is
gated by host config "with no operator lever", which is how the per-store gate stayed unmodelled for
four days after the sweep that existed to remove exactly this. The page is gated **twice**; the
finding now names both halves separately.

**Fixed by:** the fixture gates all three on the per-store flag, refusing with the module's opaque
`meals.not-found` — and the gate runs **before** the company lookup, because
`MealsAgreementController:50` says in as many words that anything answered ahead of it would tell a
prober the module is deployed here. The journey now opens on a dark venue, **asserts the refusal**,
and turns `meals.module` on by pressing the button on `/admin/feature-flags`.

### `meals-guest-claim` — the leverless half, never walked

`POST /v1/meals/invitations/session` and `POST /v1/meals/invitations/claim` both run
`RequireVisible()` → `IMealsFeatureGate.IsModuleEnabled` → `Features:Meals:Module`, **host config,
shipped `false`** (`appsettings.json:165`). `meals.module` has **zero** influence there:
`MealsMembershipService` does not hold `IMealsStoreFeatureFlags` at all.

So on a deployment as it ships, every step of that journey answers an opaque 404 and the page tells
every invited employee their code is not recognised. The journey could not have said so.

**Fixed by:** the fixture models the host gate (default on, so every existing journey is unchanged)
and `/__fixture/reset?mealsModule=0` stands it down — the same mechanism the consumer fixture uses.
Since nothing in the product can flip it, the mutation is **made permanent as a step**: the journey
now re-stands the deployment dark and pastes the code that succeeded thirty lines earlier, proving
the module-off branch produces the very refusal the page's copy claims it does. Nothing had ever
reached that branch.

## Clean, and worth writing down why

**`growth-privacy-queue` is clean on the backend's authority, not on its own say-so.** The queue's
controller carries no module gate — StoreAdmin resource auth and nothing else — and the journey
asserts `growth.module` reads "Av", was never overridden, and the queue answers in full anyway. If
that route ever grows a gate, the journey reds.

**`workforce-invitation-onboarding` is clean by two separate accidents**, and neither is a property
anybody chose for this journey. The roster read is gated on `workforce.module`, which
`WorkforceModuleGate:50-56` **grandfathers** for any store that already has a staff row — store 42
has two. The invitation CREATE is gated on `workforce.setup`, the **only default-TRUE flag in the
estate**. Change either and this journey silently starts walking a surface a real venue refuses.

## Recorded, not built

`fixture/workforce-timesheets.js`, `workforce-punch.js`, `workforce-publications.js` and
`workforce-delivery.js` model **no gate**, and `api-server.js` enforces exactly one flag
(`workforce.publication`, on the four schedule writes). No journey at this tip walks their routes, so
none of them can carry the defect today — but the timesheet APPROVE and EXPORT writes are gated on
`workforce.export`, which is **withheld from the catalog** and therefore has no lever. The moment a
journey for those lands from another lane it inherits the leverless shape, and the honest remedy will
be a standing dark step rather than a flip. That is a coverage gap in this sweep's successors, not a
gap in this sweep.

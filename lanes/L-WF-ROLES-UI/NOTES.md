# L-WF-ROLES-UI — lane detail

## Baseline (measured, not assumed)
- frontend `feature/restaurant-modules` @ `e34977ac` (Web-modules, shared checkout, 224 dirty files
  from concurrent lanes at the time I took it).
- backend checkout was on `lane/meals-grace-pins` @ `34c6c103`, NOT the integration branch — so every
  backend fact below was read with `git show feature/restaurant-modules:<path>` rather than off disk.

## The premise, verified before building (and one correction to the brief)

The brief says the write is "live on the wire and deliberately unbound in the client". Live on the
wire: **confirmed**. Deliberately unbound: **confirmed as a recorded decision, but the client method
was ABSENT, not present-and-unimported** — there is no `UpsertRoles`, `SetRoles` or any `PUT` to
`/roles` anywhere in the repo. The decision is recorded in prose at
`utils/workforce/roster-client.js:26-29`: "`PUT /roles` (#9) — creating and retiring the store's
job-role catalogue is **a screen of its own**."

The empty role axis is real and has **three** consumers, not the two the brief names:

| surface | call site | what a virgin store got |
|---|---|---|
| schedule shift editor | `pages/admin/workforce-schedule.vue:736`, `:873` | `roleOptions` → `[]`, select with one dead option |
| rates page (role scope) | `pages/admin/workforce-rates.vue:351` | no role to open a rate for |
| engagement panel | `components/admin/workforce/WorkforceEngagementPanel.vue:247` | prints "Butikken har ingen funksjoner definert" beside **no way to define one** |

## The endpoint, as it actually behaves

`PUT /workforce/stores/{storeId:int}/roles` — `Controllers/WorkforceStaffController.cs:218`,
service `Services/Workforce/WorkforceStaffService.cs:381`.

Four properties that shaped the page, each read out of the service rather than assumed:

1. **It is a MERGE, not a replace.** "Roles not present in the request are left untouched"
   (`Models/Workforce/WorkforceRoleModels.cs:18-23`). Its sibling one line below it in the same
   client — `AssignStaffRoles` (#11) — *is* a full replace. Both are `PUT`. The page therefore sends
   **one item per act**, never the catalogue.
2. **The update branch assigns `EffectiveToUtc` UNCONDITIONALLY** (`WorkforceStaffService.cs:410`),
   while `EffectiveFromUtc` is guarded by `if (item.EffectiveFromUtc.HasValue)`. So an edit that
   omitted `effectiveToUtc` would **silently un-retire** a retired role. `itemFor()` restates every
   field for exactly this reason, and `test/workforce-roles-page.test.js` pins it.
3. **No validation at all.** The service assigns the strings straight onto the entity — a blank name
   is stored, and an over-long one is a `DbUpdateException` rather than a message. The page enforces
   the DB's own widths (`Name`/`Station` 128, `Color` 32 — `Helpers/ApplicationDbContext.cs:2318`)
   and refuses a blank name client-side.
4. **Grant + gate.** Write is `WorkforceManager` **+ the `workforce.setup` flag**; the read (#8) is
   only `WorkforceScheduler` and is not gated. `workforce.setup` is **the only flag in the family
   whose default is TRUE** (`Services/Workforce/WorkforceFeatureFlags.cs:82`), so — unlike the
   schedule surface — a store that has never had a switch flipped can author roles. The page renders
   its refusal for the manager grant while still showing the list the read returns.

**C4.** The actor is resolved server-side and the client supplies none: `CurrentUserId()` →
`RequireWriteCapabilityAsync` → `caller.StaffMemberId`, stamped on the audit row as `ActorReference`
(`WorkforceStaffService.cs:432-441`) and used as the idempotency-commit actor. The writer *refuses* a
blank actor rather than defaulting (`WorkforceAuditWriter.cs:56-70`). Nothing here constructs one.

## C3 — the whole wire in one change

client method (`UpsertRoles`) + page (`pages/admin/workforce-roles.vue`) + route (Nuxt file route) +
**navigation entry** (`AdminPageHeader.vue`, Moduler group, between Bemanning and Satser) + the
repo's own pin (`admin-nav-access.test.js` `STORE_ADMIN_PATHS` and `MANAGER_MODULE_PATHS`).
`admin-nav-access.test.js` 28/28 including THE CONVERSE WALK — "every module page under `pages/admin/`
is offered by the sidebar" — which is the gate an unlinked page fails, and which I confirmed **reds**
when the nav entry is removed.

## How the store's virginity was established

The exit's last clause is the whole test, so it is evidenced three independent ways rather than
asserted:

1. **The store is new, not cleaned.** `world.VIRGIN_STORE_ID` (44, "Nyåpnet Filial") is a *second*
   venue added to the manager's `adminIn`. `seededRoleCatalogue()` gives it `[]` — an empty array,
   not an absent key, so "this store has no roles" stays a positive answer distinct from "the read
   failed". `STORE_ID` 42 keeps its seeded Barista/Kjøkken so no sibling journey moves.
2. **The screen says so before the write.** Step 4 asserts the page's *positive empty* element and
   `toHaveCount(0)` on the unknown element and on the rows; step 6 asserts the shift editor's role
   select offers **exactly** `['Uten funksjon']`.
3. **The network log says so.** Step 9 collects every request to a `/roles` path from the first
   navigation and asserts the whole run contains exactly one non-GET:
   `PUT /workforce/stores/44/roles`, with everything before it a GET. Recorded in the artifact as
   *"7 role reads, then exactly one write"*.

It is driven **by clicking** throughout: the store is changed through the header picker (not by
seeding `selectedAdminStore`), the roles page is reached by **clicking the sidebar link** (not
`goto`), and the role is typed into the form and submitted with the button.

## Falsification — the journey reds when the feature is broken

A green journey that cannot fail is not evidence. Three mutants, each applied, run, and reverted:

| mutant | expected | result |
|---|---|---|
| A — fixture `PUT /roles` never persists a create | create step reds | **RED** at the row read-back |
| B — virgin store pre-seeded with the roles | virginity step reds | **RED** at "THE DEFECT (1/2)" |
| C — nav entry removed (page exists, unlinked) | sidebar click reds | **RED** at `toHaveCount(1)`; `admin-nav-access` also reds, converse walk included |

## Defect found by the unit suite, and fixed

`nextSortOrder()` ran while `roles` was still `null` (the form is seeded in `init()` *before* the
catalogue read returns), so **a new role on a store that already had roles got `sortOrder` 1** and
collided with the first one instead of landing after the last. Re-seeded after the read, and only
while the form is untouched so a slow read cannot change a field under someone mid-type.

## Suites run
- `test/workforce-roles-page.test.js` — **15/15** (new). Asserts the REQUEST shape, which the browser
  journey cannot cheaply see: one item not the catalogue, absent `roleId` as the create discriminator,
  `effectiveFromUtc` never sent on an edit, and the un-retire trap.
- `test/admin-nav-access.test.js` — **28/28**, converse walk included.
- Full jest — **2910/2910 tests, 124 suites green**. The 5 failing *suites* are collection errors in
  **other lanes'** stray Playwright probes under `lanes/` (`L-JOURNEY-PORT-HARDCODED`,
  `L-TRAIN-PUBLISH-UNCLICKABLE`, `L-TRAIN-READONLY-VISIBLE`, `L-WF-PIVOT-DEFECTS`) — pre-existing,
  none mine. (My own snapshot copy caused a sixth until I renamed it `.orig`.)
- Journey `test/e2e/journeys/workforce-role-catalogue.spec.js` — **1/1**, 10 steps, 4 screenshots.
- Regression sweep of the workforce journeys: `workforce-invitation-onboarding` **green**,
  `workforce-role-catalogue` **green**. Two reds, **neither mine** — see below.

## Two pre-existing reds in the shared tree, and the proof they are not mine

- `workforce-schedule-publish` (`@live`) fails in **fixture** mode on the rule pack: it expects the
  live backend's 11 `WORKFORCE_RULE_PACK_NO` results and the fixture answers its 2 hardcoded ones
  (`api-server.js:1649`). Downstream of everything I touched, and nothing in my diff can add 9 rules.
  Its Barista step — which reads store 42's catalogue through my per-store rewrite — **passed**.
- `workforce-flag-lever` (`@live`) fails on `.ff-row` count **19 vs the expected 18**. A sibling lane
  has added a `workforce.export` row to `FEATURE_FLAG_CATALOG` in the working tree; `HEAD` has 18
  rows and no such row. **FINDING, not mine to fix:** the backend deliberately *withholds*
  `workforce.export` and `workforce.personnel-list` from the operator catalog
  (`WorkforceFeatureFlags.Withheld`) because their enforcement point "would be unlawful or absent" —
  so advertising `workforce.export` in the fixture models a catalog the real server does not serve,
  and it has broken `workforce-flag-lever` in the shared checkout.

## Ports, and the two live hazards
Bound my own: fixture **4028**, web **3028**. `[fixture] listening on http://127.0.0.1:4028` is in
every run log, which is the line that only appears when a **fresh** process binds — so
`reuseExistingServer` did not silently adopt the orphaned fixture on 4010 (PID 73160), which I left
running and untouched. No container was started; no `:595x` world was contacted.

## Committing out of a shared checkout
Every file I touched except the three new ones was **already dirty from concurrent lanes**
(`AdminPageHeader.vue`, `admin-nav-access.test.js`, `api-server.js`, all three `translations/*.ts`;
`world.js` acquired a sibling's edit *during* the lane). The commit is therefore **not** the working
tree: each shared file was rebuilt as **HEAD + my hunks only**, by grafting my blocks — taken verbatim
from the files the suites actually ran against — onto `git show HEAD:<path>`, then staged through a
private `GIT_INDEX_FILE`. The rebuilt `world.js` reports **18** catalog rows, i.e. the sibling's
`workforce.export` row is provably excluded. `HEAD`, the shared index and the working tree are
unchanged; nothing was pushed.

**Disclosure:** during mutation testing I restored `world.js`, `api-server.js` and
`AdminPageHeader.vue` from my own backups. If a sibling wrote to one of those three in that ~4-minute
window, that edit may have been reverted **in the working tree**. Nothing committed is affected (the
commit is built from HEAD, not from the tree), and the working tree still carries sibling content in
all three.

**Expect conflicts** in `AdminPageHeader.vue`, `admin-nav-access.test.js`, `api-server.js` and the
three translation files when this branch meets the other lanes'. All my changes in them are pure
additions at distinct anchors.

## Left alone deliberately
- **No rate field on the role form.** A role's rate is a different table
  (`WorkforceRoleRateVersions`) behind `WorkforceManager` **+** `WorkforcePayrollApprover`, authored
  on `/admin/workforce-rates`. A rate field here would either widen this page's grant to payroll or
  ship a control that 403s for the manager it is shown to.
- **No delete.** The backend binds none for any resource; retirement via `effectiveToUtc` is the only
  exit, and the page says so on screen.
- **C6:** no statute or § reference was introduced by this lane.

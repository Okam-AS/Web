# L-LIVE-WALK-MEALS — Meals is the module with the FEWEST wire defects and the MOST world it cannot get

**Read-only lane. No container started, no process started, NO PORT BOUND (4010 / 4971 / 4973 never
touched — all three held by foreign node fixtures for the whole session), nothing committed, no ref
moved, no file written outside this directory and my RETURN.** No journey was run, live or fixture, so
this lane claims no run and offers no artifact as evidence of one.

Frontend read at `/Users/svendaneel/okam/Web-modules` HEAD **`8ac6f63`** (`lane/focustrap-teardown`).
Backend read at `/Users/svendaneel/okam/OkamAPI-grdelrec` = **`8e2b57de`** = `feature/restaurant-modules`
tip, `git status --porcelain` = **0 paths** — so every citation below is that commit's content, and the
same pair all three sibling live-walk lanes read, so the four returns are comparable line for line.

---

## 0. The resource, stated first so it is not mistaken for the reason

`docs/plan/plan.md` sizes every `L-LIVE-WALK-*` lane `class: node`; my brief's `caps in force` is
`sql=2`; two `state: running` lanes are `class: sql`. **The SQL cap is full and I am not a holder**, and
my brief grants no slot. `test/e2e/scripts/live-world.sh:237-241` refuses to proceed unless a SQL
container is **already running** and explicitly forbids starting one ("a container somebody else
started is never ours to touch").

**Measured, not inferred.** `docker ps` shows one mssql — `gallant_margulis`, `Up 10 minutes`, alongside
`testcontainers-ryuk-29cdcd1e…`. It is a **Testcontainers-managed** container belonging to a running SQL
lane, with a ryuk reaper attached that will destroy it when its owner finishes: borrowing it would put a
live world on a database that can vanish mid-walk. The three named worlds a previous lane left
(`okam-lws-sql`, `okam-lws-staff-sql`, `zen_pasteur`) are all still **`Exited (0) 41 hours ago`**, and
starting one is starting a container.

`docker info` MemTotal **8217473024 B (7.65 GiB)**; `docker stats --no-stream` reads that single mssql at
**3.27 GiB**. So a second is ~6.5 GiB of 7.65 GiB and a third would not fit — which is consistent with
`live-world.sh`'s own "this host OOM-kills past about three". **I am nonetheless not offering memory as
the reason: the block is the slot grant.** Disk is not a factor (166 Gi free).

---

## 1. THE HEADLINE: check the master and the resolver first — and Meals is a FOURTH shape

The brief sent me to check two things before anything else. Both come back with an answer neither
sibling has.

### 1a. The master IS declared — and it is a family of four, not one boolean

`appsettings.json:162-168`:

```json
"Features": {
  "Meals": {
    "Module": false,
    "Ordering": false,
    "Projection": false,
    "Statements": false
  }
},
```

Declared with its shipped value, bound exactly once (`Program.cs:868` `AddMealsFeatureOptions()`, whose
own comment says removing that line "does not fail loudly" and would make every `meals.*` flag read
false past any appsettings value or `Features__Meals__Module` environment variable). This is **not**
Events' shape: Events' `Events:Enabled` is in neither settings file; Meals' section is in the shipped
`appsettings.json`. `appsettings.Development.json` has no `Features` section at all (its top-level keys
are `Mcp`, `MaintenanceSettings`, `Events`, `Logging`), so a live world under
`ASPNETCORE_ENVIRONMENT=Development` — what `live-world.sh:346` sets — reads all four as **false**.

### 1b. NO effective resolver exists for Meals, and by the platform's own written rule it needs one

Swept the whole backend tree, not just the composition root (Margin's lesson — its registration is one
call away from `Program.cs` and a grep of that file cannot see it):

* `grep -rn "IStoreFeatureFlagEffectiveResolver" --include="*.cs"` over the entire repo returns exactly
  **two production registrations** — `Program.cs:783` (Workforce) and
  `Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:35` (Margin).
* Exactly **two implementations exist**: `Services/Workforce/WorkforceModuleFlagEffectiveResolver.cs`
  and `Services/Margin/MarginModuleFlagEffectiveResolver.cs`. **There is no Meals one to register.**

Now the rule it breaks. `Services/Platform/FeatureFlags/IStoreFeatureFlagEffectiveResolver.cs:9-15`:

> The toggle API's own arithmetic is `override row ?? advertised default`, which is right for every flag
> whose gate does the same. **It is WRONG for a gate that resolves an absent row against something
> else** … Without this seam the endpoint would report `effective:false` for a store whose module is
> demonstrably serving requests, and the admin client — which decides whether to render the module from
> exactly this field — would hide a working module.

…and :19-21 names Margin's reason in the same words that describe Meals: *"its fallback is the `Margin`
config section rather than the advertised `false`."*

`Services/Meals/StoreBackedMealsFeatureFlags.cs:35-44`:

```csharp
var over = await _store.GetOverrideAsync(storeId, MealsFeatureFlags.Module, ct);
if (over.HasValue) { return over.Value; }
return _configGate.IsModuleEnabled;          // ← the fallback is CONFIG, not the advertised default
```

The advertised default is the compile-time constant `false` (`MealsFeatureFlags.cs:76`, surfaced through
`Describe()` at :98). The board computes `resolver ?? (overridden ? row.Enabled : descriptor.DefaultEnabled)`
(`Controllers/StoreFeatureFlagsController.cs:55-66`) and, with no Meals resolver, takes the second branch.

**Therefore, on any world where `Features__Meals__Module=true`:** a store with no override row has a
Meals surface that **serves**, and `GET /stores/{id}/feature-flags` reports `meals.module`
**`effective:false`**. This is Growth's defect run backwards — Growth's board says ON while the surface
is dark; **Meals' board says OFF while the surface is live** — and it lands on the same admin client
field. It is invisible today only because the shipped config is `false`, so the two happen to agree.

**And it is unavoidable for this walk.** Setting `Features__Meals__Module=true` is the only way to reach
a single route in §2, so **the first live Meals world is also the first world in which this divergence
is real.** Checking it was worth more than the capture, exactly as the brief said.

### 1c. Meals is NOT in Growth's position on the lever itself — it coalesces, like Margin

`StoreBackedMealsFeatureFlags` returns `override ?? config`, so an explicit row wins in both directions.
Compare `Services/Growth/StoreBackedGrowthFeatureFlags.cs:46-52`, which **ANDs** (*"Dark ⇒ no store row
can refine it on"*). So where an operator flip reaches at all, it works. The defect is the **board**, not
the lever.

---

## 2. THE WIRE THAT STOPS THE WALK: three of the four flags have NO OPERATOR LEVER, BY DESIGN

This is the finding my brief asked for, and it is sharper than either sibling's because it is
deliberate rather than accidental.

`Services/Meals/MealsFeatureFlags.cs:94-100` — Meals contributes **`meals.module` and nothing else** to
the operator catalog. `:56-72` records why the other three are **withheld**, in machine-readable form:

| flag | in catalog? | withheld because (verbatim, abridged) |
|---|---|---|
| `meals.module` | **yes** | — |
| `meals.ordering` | **no** | "Money path. It arms the checkout funding seam … §7's precondition — a company account may fund a checkout only once its billing terms are signed — is not something a generic per-store toggle can enforce." |
| `meals.projection` | **no** | "Money path. … flipping it per store mid-period would leave that store's journal partly projected and its allocations unreconcilable." |
| `meals.statements` | **no** | "Billing. … a statement issued to a company under a half-enabled module is a document that cannot be withdrawn." |

`MealsFeatureFlagCompositionTests.The_toggle_api_still_refuses_the_withheld_money_path_subflags` proves
`PUT /stores/{id}/feature-flags` answers **400** for all three.

And every one of the three is ANDed under the **host** master, not the per-store one
(`Services/Meals/MealsFeatureGate.cs:24-49`): `IsOrderingEnabled => Module && Ordering`, and the same for
Projection and Statements. `Module` there is `_settings.CurrentValue.Module` (:22) — **host config**, not
the store-backed flag.

### Joined to my walk, act by act

| act | guard | reads | lever? |
|---|---|---|---|
| claim a membership | `MealsMembershipService.RequireVisible()` :545-547 | `IMealsFeatureGate.IsModuleEnabled` → `Features:Meals:Module` | **none** — host config |
| a funded order | `MealsQuoteService.RequireOrderingVisible()` :69-75, `MealsFundingAuthority.cs:73,183,290,317,346` | `IsOrderingEnabled` = `Module && Ordering` | **none**, withheld |
| the month's allocations | `MealsProjectionWorker.cs:67`, `MealsJournalProjectionSource.cs:85` | `IsProjectionEnabled` = `Module && Projection` | **none**, withheld |
| a finalized statement line | `MealsStatementService.RequireVisible()` :642-651 | `IsStatementsEnabled` = `Module && Statements` | **none**, withheld |

The per-store `meals.module` lever reaches only the **venue-scoped** surfaces — `MealsAgreementService.cs:241`,
`MealsCompanyService.cs:382` (`RequireStoreModuleAsync`), `MealsReconciliationService.cs:76,132`. **Not one
act of my walk is behind it.**

`live-world.sh:336-339` sets **no module config masters** and says so: *"A journey that needs a module's
ROUTES to answer adds its switch here and says why."* So on a live world today the walk 404s at act one.

**The wire, named:** `Features__Meals__Module`, `Features__Meals__Ordering`, `Features__Meals__Projection`
and `Features__Meals__Statements` must all be `true` on the API launch line at `live-world.sh:346-349`.
Three of the four can be set **no other way** — no admin screen, no API, no per-store row.

### What the fixture hides, in its own words

`test/e2e/fixture/meals.js:240-244`:

> THE GATE. Every statement route resolves `IMealsFeatureGate` — BOTH `Features:Meals:Module` and
> `Features:Meals:Statements`, host configuration read through `IOptionsMonitor` — and … there is no
> override row for this fixture's `flagEffective` to consult and **no lever a journey could flip. These
> routes therefore always answer.**

The fixture is honest about it in prose and models it nowhere in behaviour. This is the estate's recorded
pattern for the fourth time (`L-FIXTURE-FLAG-STORE` censused the other three at `e34977a`; its repair,
`d1c4b26` on `lane/fixture-flag-store`, is **not an ancestor of `8ac6f63`** and so is not in my base).
`meals-admin-setup.spec.js:220-231` at my base already records the host-config half as a finding and says
in as many words *"this walk has no flip to make"*.

---

## 3. WHAT MEALS DOES **NOT** HAVE — checked, because two siblings were stopped by these

Three things that blocked Growth outright are all clear here, and each was checked rather than assumed.

1. **The invitation code is readable live.** This is Growth's absolute blocker (`ConfirmTokenHash` only,
   raw token exists solely inside a sent mail) and Meals is the opposite shape.
   `MealsInvitationTokenService.DeriveToken` is `HMAC-SHA256(secret, "invitation:" + invitationId)` —
   **derived, not random** — and `MealsMembershipService.cs:288-289` re-derives it after the idempotent
   commit and returns it on the create response (`model.Token = _tokens.DeriveToken(model.InvitationId)`),
   deliberately so a replay re-hands the same once-shown token. `Entities/Meals/MealsInvitation.cs:28`
   stores only `TokenHash`, and none is needed: the create response is a live read path. **No mail sink is
   required and no `__fixture` route is needed to obtain a code.**
2. **No phantom route.** `utils/meals/claim-client.js:47,75` posts `/v1/meals/invitations/session` and
   `/v1/meals/invitations/claim`; both resolve to real actions at `MealsMembershipController.cs:140,162`
   under the class-level `[Authorize]` at :25. Checked because a sibling fixture served a route no backend
   publishes.
3. **`MealsMembership.EmployeeReference` now exists** — migration `20260731215452_Meals_MembershipEmployeeReference`
   creates it on both `MealsInvitations` and `MealsMemberships`; it is captured at invite
   (`MealsMembershipService.cs:209`), **copied** at claim (:477, :506) and read into
   `MealsStatementLine.MemberDisplayRef` by `MealsStatementService.cs:394-396,513,535`. So the exit
   criterion's *"a finalized statement line naming that employee"* is producible — but
   **`meals-guest-claim.spec.js:246-250` is STALE**: its MIG-17 comment still asserts the column "does not
   exist" and that every claimant is "a bare identifier on every line of their employer's monthly bill,
   permanently". Its assertions (:252-253, `not.toBe('—')` and length > 0) do not depend on it, so this is
   a stale narrative rather than a red — but it is the load-bearing sentence of that step.

---

## 4. THE DIFFERENCE THE WALK CANNOT SURVIVE UNCHANGED: there is only ONE live sign-in

The exit-criterion journey signs in as **two different people** —
`meals-guest-claim.spec.js:106` `signIn(page, { phone: '90000001', code: 'AppSettings__DemoVerificationCode__REDACTED' })` (Ola Ansatt, the
stranger) and `:219` `signIn(page, { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED' })` (Marit, the invitee).
`test/e2e/fixture/world.js:21-22` declares both.

The application has **exactly two no-SMS sign-ins**, and both are single config values:
`Services/UserService.cs:631` `IsDemoPhoneNumber` ⇒ `AppSettings.DemoPhoneNumber` = `"+4799999999"`
(`appsettings.json:18-19`, code `AppSettings__DemoVerificationCode__REDACTED`), and `:634` `IsPowerUserPhoneNumber` ⇒
`AppSettings.AdminUserPhoneNumber`. For any other number `UserService.cs:540` calls
`_smsSender.ValidateNumberAsync` and then dispatches a real verification SMS. **`+4790000001` is a
fixture-only credential: on a live backend its code is unobtainable by any test.**

The only substitution that yields a second passwordless identity is pointing
`AppSettings__AdminUserPhoneNumber` at it — **which makes the "stranger" a PowerUser**, and the stranger's
lack of authority is the whole point of the step. (Fair to whoever picks this up: it is probably
*survivable* for this particular walk, because `MealsAuthorizationService` resolves company scope from
`MealsMembership` alone and never from StoreAdmin/PowerUser — `Program.cs:798-799` — and
`RequireIntendedContactAsync` compares contacts, not roles. I did not execute it, so I do not claim it.)

**And the contact itself has to change.** `MealsMembershipService.RequireIntendedContactAsync:600-620`
admits a claimant only on a **confirmed** phone matching `IntendedContactPhone` **or** a **confirmed**
email matching `IntendedContactEmail`. The live world has no email flow at all, so a live invitation must
be addressed to a **phone** — and the only phone that can ever be claimed is `+4799999999`. That collides
head-on with this journey's central assertion, `:191-194`, which scans the **whole rendered document** for
`WITHHELD = ['marit@example.test', 'marit', '99999999', 'Marit']` (`:44`). Live, `99999999` is the
credential the world is built on and is on screen in the sign-in modal — so the walk's one security
assertion would **red for a reason that is not a leak**.

**The honest live shape is a different walk**: one identity (`+4799999999`), two invitations — one
addressed to an unclaimable third phone to earn `meals.invitation-contact-mismatch` against a withheld
value that appears nowhere else, and one addressed to `+4799999999` to claim. That costs the
account-switch step, which `:221-225` says is *"the second half of the fix"* — the evidence that a stale
client would file the claim as the previous account. **Losing that is the difference the fixture was
hiding, and it is a walk amendment, not a repair.**

---

## 5. THE SECOND AND THIRD ACTS ARE IN A DIFFERENT APP

Meals has **nine** captures, more than any module: three admin specs under `test/e2e/journeys/` and
**six under `test/e2e/journeys/consumer/`** — `meals-funded-checkout`, `meals-funded-guard`,
`meals-funded-over-allowance`, `meals-module-dark`, `meals-stale-token-refused`,
`meals-stale-token-requote`.

`playwright.config.js:113-117` excludes that whole directory by path: *"`journeys/consumer/` drives a
DIFFERENT app — the sibling ConsumerWeb checkout"*. `test/e2e/scripts/consumer-dev-server.js:1-15` names
it: `../ConsumerWeb` (Nuxt 3, `feature/swiss`), started through its own checked-out `nuxi`, configured by
`VITE_APP_ENV` / `VITE_API_BASE_URL` **at bundle-compile time**, under `playwright.consumer.config.js`
(which does support live mode — `:30,71`, `grepInvert: /@fixture/`). The sibling checkout **exists** at
`/Users/svendaneel/okam/ConsumerWeb`.

So *"places a funded order"* is a **fourth process** (SQL + API + admin web + consumer web) and a **second
Playwright config**. A single live run cannot cover the walk end to end as one artifact; the honest live
form is two runs — admin (claim, statement) and consumer (funded order) — against **one** world, which is
exactly what `live-world-reset.sh` was built to make affordable.

---

## 6. What a follow-on lane needs, in order

1. A **SQL slot** (`class: sql`). This is now the **fourth** consecutive live-walk lane to return on it.
2. **Four switches in `live-world.sh` step 4** (`:346-349`): `Features__Meals__Module`,
   `Features__Meals__Ordering`, `Features__Meals__Projection`, `Features__Meals__Statements`. Unlike
   Margin, Meals cannot pull its own lever — §2. `L-LIVE-SEED-VIA-PRODUCT` owns that file.
3. **A ruling on §4** — a second no-SMS identity, or the one-identity/two-invitation amendment. Nothing
   downstream can be walked until this is decided, and it is the one item that changes the journey text.
4. **Seed through the product**: a company, a corridor agreement (needs the per-store `meals.module` row —
   this one *does* have a lever), a programme with an allowance, and an invitation carrying an
   `EmployeeReference` so the statement line names a person rather than a GUID.
5. **Re-tag** off `@fixture` — last, and separately for the two configs.
6. §1b (**the missing `MealsModuleFlagEffectiveResolver`**) and §3.3 (the stale MIG-17 comment) are
   **repairs, not prerequisites** — but §1b becomes true the moment step 2 is done, so a live world built
   before it is fixed will show an operator a board that says `meals.module: off` over a module that is
   serving.

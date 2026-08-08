# L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN — the walk

Actor `agent:L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN` · brief `f7034d29` · walked 2026-08-07
against the owner's live world (web `:3971`, API `:5971`, manager `99681931`). No server was started,
stopped or restarted; no container was touched; no row was seeded; no flag was written by `curl`.
**Every flag write in this file is a click on `/admin/feature-flags`.**

## What the world actually is (measured, not assumed)

| | |
|---|---|
| API process | PID 59199, `WebApi` from **`/Users/svendaneel/okam/wt-lwtwo-api`** @ **`118f92fb9`** (detached), binary built 2026-08-06 21:15 |
| Web process | PID 60586, `nuxt-ts` from **`/Users/svendaneel/okam/web-livewalk`** @ **`6f74f87`**, `API_BASE_URL=http://127.0.0.1:5971` |
| Store walked | id **1**, "Two Humans Kafé" |

The brief is right that the live API predates the trunk (`a1c1a6dff` is 29 commits past `118f92fb9`),
and one thing follows from it that changes how the board must be read: **only Workforce and Margin
register an `IStoreFeatureFlagEffectiveResolver` in this binary** (`Program.cs:795`,
`Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:35`). The Events, Growth and Meals
resolvers built by `L-FLAGS-EFFECTIVE-RESOLVERS` and `L-GROWTH-EFFECTIVE-RESOLVER` are on lanes that
have not landed, so they are not in this process.

**The live process was launched with host-config overrides**, which is the brief's whole point made
literal — the launch line is the lever:

```
Features__Meals__Module=true  Features__Meals__Ordering=true
Features__Meals__Projection=true  Features__Meals__Statements=true
Events__Enabled=true  Growth__Enabled=true
ASPNETCORE_ENVIRONMENT=Development  ASPNETCORE_URLS=http://127.0.0.1:5971
```

`Events__DispatchEnabled` is **not** among them, and no `Margin__*` is either — so in this world
`Events:DispatchEnabled` is `false` and `Margin:EnabledStoreIds` is `[]`.

## Starting state, and why the walk goes down before it goes up

All **19** catalog rows across all **6** modules were already `På` / `Faktisk: på` for store 1 when
the lane arrived, and every one of them had a working control. Reading a lit surface under an
already-on switch proves nothing, so each module is taken **down** from the switchboard first, its own
surface is read refusing, then it is brought back **up** from the same switchboard and read answering.
Each dark window is one module wide and closes before the next opens. **The world was left exactly as
found: 19/19 rows `På`, `Faktisk: på`** (`walk.json` → step `board:final`).

## The six walks

Statuses are the API responses the page itself provoked, captured off the network, not inferred.

| Module | switch clicked | surface | with the switch OFF | with the switch ON |
|---|---|---|---|---|
| **Workforce** | `workforce.module` | `/admin/workforce-roster` | `GET /workforce/stores/1/context` → **403**; page: *"Du har ikke bemanningstilgang i denne butikken."* | **200**; roster lists Astrid Vik, Ingrid Moen, Jonas Lie, Nora Berg with mandates, employee numbers and dates |
| **Margin** | `Margin.Module` | `/admin/margin-recipes` | `GET /margin/status?storeId=1` → **404**; page: *"Margin-modulen er ikke slått på for denne butikken."* | **200** ×4 (`status`, `ingredients`, `recipes`, `menu-margin`); page: *"19 råvarer i butikken"*, recipe form live |
| **Training** | `training.setup` | `/admin/training-courses` | all reads **200** (by design); the page's own **Modulstatus** panel reads *"Kurs og sertifikater: **Av**"* | same reads **200**; Modulstatus reads *"Kurs og sertifikater: **På**"* |
| **Events** | `Events.Core` | `/admin/events-pipeline` | `GET /events/admin/1/events` and `/notifications/health` → **404** ×2; page: *"Events er ikke slått på for dette utsalgsstedet, så det er ingenting å følge med på."* | **200** ×2; pipeline renders, guest-link panel reports its own queue |
| **Meals** | `meals.module` | `/admin/meals-companies` | `GET /v1/stores/1/meals/companies` → **404** | **200**; the company table renders with the store's agreements |
| **Growth** | `growth.module` | `/subscribe/1` (**public**) | `GET /v1/growth/stores/1/consent-text` → **404**; page: *"Ingen påmelding her — dette stedet tar ikke imot påmeldinger på denne siden."* | **200**; the double-opt-in signup form with its consent copy renders |

Artifacts: `walk.json` (26 steps, no error), `walk.log`, `shots/<Module>-{1-board-off,2-dark,3-board-on,4-lit}.png`.

### Two of those six need their nuance said out loud

**Training's read surface cannot go dark, and that is correct.** `TrainingModuleGate` keeps reads and
exports working for a visible store and refuses only writes (409 `training.flag-disabled-read-only`) —
the switchboard prints exactly this on the row. So what answers the flip is the module's **own**
Modulstatus panel, sourced from `GET /training/stores/1/context`, which is the module's gate and not
the flag board. The write refusal itself was not exercised: it needs a course to be created in the
owner's world while a seed-audit lane is reading it.

**Growth's lever does not act on the Growth admin screen, and a reader who checks it there would
wrongly call the lever inert.** `GrowthNewslettersController.ModuleIsLiveAsync` is applied only to
test-send and dispatch — the reads and authoring stay open on purpose so a dark store can still wind
down what it has. `growth.module`'s enforcement point is the **public guest capture**
(`GrowthSubscriptionsController.cs:61`, `GrowthConsentTextsController.cs:69`), which is why the walk
above uses `/subscribe/1`. Against `/admin/growth-newsletter` the flip produced no observable
difference at all (9 calls, all 200, both states) — recorded in the second run's log, and it is the
inverse of the trap the brief names.

## The board and the gate: where the switchboard tells the truth, measured

`MarginModuleGate` ANDs both stage flags under the per-store master
(`IsPriceImportEnabled => IsModuleEnabled(storeId) && …`), and Margin has a resolver. Taking
`Margin.Module` down from the screen and re-reading the board (`nesting.json`, `nesting.log`,
`shots/nesting-margin-master-down.png`):

```
Margin.Module       Av  ["Standard: av","Overstyrt for butikken","Faktisk: av"]
Margin.PriceImport  På  ["Standard: av","Overstyrt for butikken","Faktisk: av"]  + overruled warning
Margin.Statements   På  ["Standard: av","Overstyrt for butikken","Faktisk: av"]  + overruled warning
```

The warning it raises: *"Bryteren står på, men modulens port svarer likevel av. Noe annet holder
modulen nede — en hovedbryter eller en driftsbryter i serveroppsettet."* That is the board asking the
module's gate and reporting a stage flag as dark while its own row reads on — the resolver doing
exactly its job.

**The failure mode the brief predicts was not reproducible in this world, and that is a limit, not a
clearance.** For Events, Growth and Meals the board falls through
`StoreFeatureFlagsController.cs:65` (`overridden ? row.Enabled : descriptor.DefaultEnabled`) and
echoes the row. It would read `Faktisk: på` over a dark host switch — but `Events:Enabled` and
`Growth:Enabled` are both `true` in this process, so the echo happens to agree with the gate.
Falsifying it requires those switches off, which requires a restart the brief forbids. The page's own
top notice already carries the disclosure honestly: *"«faktisk: av» er til å stole på, mens «faktisk:
på» ikke er et løfte om at skrivingen går gjennom."*

## The switches an operator cannot reach, named

Each verified in the source of the running build, with what an operator does instead.

1. **`Growth:Enabled`** — `Services/Growth/StoreBackedGrowthFeatureFlags.cs:46-52`: *"a dark outer
   switch is never refined on"*. **This one should stay host-only.** It is the crypto-provisioning
   gate: with it on outside Development, startup fails fast unless `Growth:RootSecret` is provisioned,
   because deriving live Growth crypto from the JWT signing secret would let a routine JWT rotation
   sever GDPR §13.4 suppression retention. A per-store row that could open it would route live guest
   addresses through the dev fallback root. **Operator action:** deployment config + a provisioned
   root secret, then `growth.module` per store from the screen.
2. **`Events:Enabled`** — `Services/Events/EventsModuleGate.cs:84-88`, same two-layer shape, no crypto
   reason attached. **Operator action:** deployment config, then `Events.Core` per store.
3. **`Events:DispatchEnabled`** — host-only, **and it is off in this world**. No catalog entry, no row,
   no screen. Observed live on the pipeline with `Events.Core` on: *"Utsending er slått av, så ingen
   gjestelenke forlater huset. **Venter: 10.**"* Ten guest links are queued and nothing a person can
   click will release them. This is the one unreachable switch that visibly blocks a venue today.
4. **`Features:Meals:Ordering` / `:Projection` / `:Statements`** — `StoreBackedMealsFeatureFlags.cs:22-24`
   states it: only `meals.module` is per-store; the money-path sub-flags are not in the catalog and are
   not resolvable there. The Meals admin page discloses the consequence itself: *"Ingenting her gjør at
   en ansatt kan bestille … Å sette opp en ordning her gjør altså ikke lunsjen kjøpbar."*
5. **`Growth:MailProvider`** — host-only, ships `"Fake"`.

## Two claims in `L-WHERE-THE-PLAN-STILL-HAS-GAPS.md` that the walk contradicts

**Margin: "no operator lever … unreachable by any action short of editing a config file and
redeploying" is false.** `MarginModuleGate.Resolve` reads the per-store override **first** and falls
back to config only when there is no row (`Services/Margin/MarginModuleGate.cs:33-42`). Proven in the
live world, where `Margin:EnabledStoreIds` is `[]` and nothing overrides it: the module went dark and
came back lit from the switchboard alone, and `/margin/status` moved 404 → 200 across the click. The
table's "exit walkable today? **No.** Behind a config edit + restart" is wrong for Margin.

**Meals: the host gate is not the only door either.** `StoreBackedMealsFeatureFlags:36-43` gives the
per-store row precedence over the `Features:Meals:Module` config gate, so the Meals admin surfaces are
reachable from the screen. Only the three money sub-flags are genuinely host-only, which is finding 4
above and is narrower than "all four `Features:Meals` false" implies.

## One honesty defect found on the way

**Workforce is the only module whose refusal misnames its own cause.** With `workforce.module` off,
`GET /workforce/stores/1/context` answers **403** and `workforce-roster.vue:275-277` maps 403 to
`wfr_no_capability` — *"Du har ikke bemanningstilgang i denne butikken."* The operator who just turned
the module off for this store is told they personally lack access. Every other module names the module
("Margin-modulen er ikke slått på…", "Events er ikke slått på…"). Not fixed here: the fix is a
backend-shaped question about whether a module-off answers 403 or 404 on that route, and this lane
must not rebuild the API.

## Reproducing

```
node docs/plan/lanes/L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN/walk.js      # plan.json drives it
node docs/plan/lanes/L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN/nesting.js
```

Both drive the owner's live world and restore every flag they move. They start no server and open no
container. Artifacts are untracked in the owner's checkout — the same convention every sibling lane's
return and lane directory follows on this branch — and no commit was made on
`wip/session-2026-08-06-all-work`, whose branch and code were not touched. No worktree was created.

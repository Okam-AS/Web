# PROOF-BENCHMARKS re-triaged against trunk `6d5328004`

Lane: L-THE-BENCHMARK-TRIAGE-IS-RE-RUN-AGAINST-THE-TRUNK · brief 41d82eb6 · 2026-08-09
Document measured: `OkamAPI-modules/docs/plans/PROOF-BENCHMARKS.md` (72 512 bytes, 719 lines).
Trunk: `6d5328004` — **528 commits past the document's last stamped SHA (`f796f8a9`)**, so §3's cells and
even parts of §9's landed ledger describe a tree that no longer exists.

Method: every row read against source, never against the document. Every negative grep was
round-tripped with a positive control in the same namespace (counts printed per row below). The
uncommitted working-tree seam (competency evidence: `TrainingCompetencyEvidenceProjection.cs`,
`WorkforceCompetencyEvidenceFindings.cs`, `Program.cs`/`WorkforceScheduleValidationService.cs` edits)
was read as current state, per the brief. **No tier was run** — every "green" below means *the test
exists in the tree*, never *it was re-executed*. Nothing was fixed, built, or amended, including the
document. All paths below are in `/Users/svendaneel/okam/OkamAPI-modules/` unless prefixed `Web-modules/`.

A row's "recorded state" = its §3 cell as amended by §9 where §9 stamped it.

---

## 1 · FIRST — recorded-settled rows whose claim no longer holds (the holes)

These are the expensive kind: the document records them as decided/guarded, and the guard is not there.

### 1.1 EB2 — the money-safety invariant the row protected has been un-enforced ⚠️

Recorded: *"HUMAN-GATED BY DESIGN … `Events.Deposits`/`Events.Settlement` are deliberately withheld
from the generic toggle catalog … B is NOT 'add the flag to the catalog' — that deletes a money-safety
invariant"*; X-cell ALREADY-GREEN on *"catalog exposes only `Events.Core`"*.

Truth: the flags are now IN the generic catalog — `Services/Events/EventsFeatureFlags.cs:40`
(`Deposits`) and `:47` (`Settlement`), store-toggleable — and the file's own doc-comment concedes the
invariant is gone: `EventsFeatureFlags.cs:32` — *"**Still owed:** §9's money-path precondition … Enabling
this flag for a store that has never taken a live payment is currently possible and is a procedural
failure, not a technical one."* No dedicated enablement flow enforces the proven-merchant-config
precondition. The X-cell's pinned premise is also false (the gate test now covers Deposits/Settlement:
`WebApi.Tests/Events/EventsFeatureFlagGateTests.cs:40-42`). **A deposit can be switched on for a store
that has never processed a live order; the control the document says exists is procedural only.**

### 1.2 TR-B6 — six tables landed in the migration chain with zero reachable behaviour ⚠️

Recorded: *"VERIFIED NOT BUILT — none of the 6 tables … flags declared with nothing behind them. New
tables ⇒ SB-2."*

Truth, in the RF-1313 shape this estate has already paid for: the tables exist —
`Entities/Training/TrainingChecklistTemplate.cs`, `TrainingChecklistTemplateItem.cs`,
`TrainingChecklistRun.cs`, `TrainingChecklistItemResult.cs`, `TrainingDeviation.cs`,
`TrainingDeviationEvent.cs`, DbSets in `Helpers/ApplicationDbContext.cs`, migration
`Migrations/20260801113131_Training_W3_ChecklistsAndDeviations.cs` — and **no service, controller or
route touches any of them**: `grep -rln "ChecklistRun|ChecklistTemplate|TrainingDeviation"` over
`Services/` + `Controllers/` = 0 production hits (only `TrainingFeatureFlags.cs` constants; positive
control: the same grep finds Migrations + snapshot). `training.checklists`/`training.deviations`
(`Services/Training/TrainingFeatureFlags.cs:50,:53`) still gate nothing. Two consequences:
- **SB-2 collision trap**: a build lane sent at TR-B6's "new tables ⇒ SB-2" would author a second
  migration for tables the chain already carries.
- **C3-shaped hole**: schema and advertised flags with no capability behind them, invisible to any suite.

Related: OD-6 is no longer open — `docs/plans/IMPLEMENTATION-PLAN.md:319` records it **RULED
2026-07-29** (name stays "Training"; internkontroll wording banned until TR-B6 ships). §9's correction
*"OD-6 was never added … remains open"* is itself stale.

### 1.3 The §5 outbox seam law was not followed as written

Recorded (§5.4, binding): *"One platform lane owns the durable outbox + transport worker; Events and
Training consume the seam. Neither module builds a private one."*

Truth: per-module outboxes were built instead — `Entities/Events/EventsNotificationOutbox.cs` +
`Services/Events/PersistedEventsNotificationOutbox.cs` (bound `Program.cs:1151`) + dispatch hosted
service (`Program.cs:1161`); Workforce has its own `Entities/Workforce/WorkforceNotificationOutbox.cs`
+ `WorkforceNotificationDispatchHostedService` (`Program.cs:858`). Training reminders still have
nothing behind `training.reminders` (`TrainingFeatureFlags.cs:59,:76` — 0 non-flag "Reminder" hits in
`Services/Training/`). Whether the divergence was ruled is not recorded in this document; anyone
planning TR5 off §5 will plan against a seam that does not exist in that shape.

### 1.4 The refusing lane's own residue is wrong — a re-dispatch trap

L-THE-SAFE-BENCHMARK-ROWS-ARE-BUILT-WORKFORCE-AND-TRAINING's return names WB3 and TR-B4 as *"genuinely
open … both absent, verified."* **Both are committed on this trunk**:
- TR-B4: evidence route `Controllers/TrainingController.cs:383` (`[HttpGet("evidence")]`, "Endpoint 16:
  the internkontroll evidence read"), `Services/Training/TrainingEvidenceService.cs`,
  `WebApi.Tests/Training/TrainingEvidenceReadTests.cs` — commit `d52a8313c`, ancestor of trunk.
- WB3 boundary cases: `WebApi.Tests/Workforce/WorkforceRestBoundaryTests.cs:123-131` carries the
  11 h-exact inclusive-floor arm with the DST wall-clock reasoning (last touched `07e7140c4`).
A re-dispatch built on that return would waste two more lanes.

---

## 2 · Rows recorded NOT BUILT / VERIFIED-RED / BLOCKED whose subject is built (stale map → wasted lanes)

| Row | Recorded | Truth at trunk — the file:line that decided it |
|---|---|---|
| **GB1** | VERIFIED-RED, no production consent-text writer | `Services/Growth/GrowthConsentTextSeed.cs:52` seeded at startup `Program.cs:394-410`; the throw survives at `GrowthSubscriptionService.cs:66` guarding a seeded baseline (measured by the Growth/Margin lane; re-confirmed) |
| **GB2** | VERIFIED-RED, `List-Unsubscribe` zero hits | `Services/Growth/GrowthUnsubscribeHeaders.cs` (RFC 8058, `OneClickValue`); repo-wide 78 hits in 19 files; tests `GrowthUnsubscribeHeaderGoldenTests.cs`, `GrowthDispatchUnsubscribeHeaderTests.cs` |
| **GB3's 🔴 rider** | "MintLinkTokenAsync has zero production callers — unreachable in the field (GRW-3)" | `Services/Growth/GrowthDispatchService.cs:499` mints the token on the dispatch path; the standing gap is closed |
| **GB6** | "no `growth.*` family — per-store toggling impossible" | `growth.module`/`growth.dispatch` in catalog (`Services/Growth/GrowthFeatureFlags.cs:29,:38`, registered `Program.cs:784`). Partial: `growth.capture`/`preference_centre`/`newsletters` deliberately still absent (`GrowthFeatureFlags.cs:20-21`); anonymous surface is now 4 controllers (adds `GrowthConsentTextsController.cs:57`) |
| **WB1** | NOT BUILT — no effective-dated rates | `Entities/Workforce/WorkforceRateVersion.cs`, `WorkforceRoleRateVersion.cs`; `WorkforceRateResolver`/`WorkforceRateAuthoringService` registered `Program.cs:740,:745`; frontend `Web-modules/pages/admin/workforce-rates.vue` + `test/workforce-rates-client.test.js` |
| **WB5** | PARTIAL — endpoints 39-42 missing | Live: `Controllers/WorkforceMeController.cs:293,:312,:333,:361`; manager award `Controllers/WorkforceRequestsController.cs:92`; race proof `WebApi.Tests/Workforce/ShiftExchangeOneAwardRaceSqlServerTests.cs` (§9 records this; §3's cell never updated) |
| **MLB1** | NOT BUILT per-store; VERIFIED-RED 400 | `meals.*` family `Services/Meals/MealsFeatureFlags.cs:30-39`; `StoreBackedMealsFeatureFlags.cs`; registered `Program.cs:785` (§9 records it) |
| **MLB2** | `MealsAgreement` has no production writer | `Controllers/Meals/MealsAgreementController.cs` + `Services/Meals/MealsAgreementService.cs` + `WebApi.Tests/Meals/MealsAgreementWriterTests.cs` (§9 records it) |
| **MLB3** | BLOCKED BY SB-1 (T2/T4 seam does not compile) | SB-1 retired (§9); `CheckoutCompanyAccountGuardTests.cs`/`PaymentServiceCompanyAccountTests.cs` in tree; `DenyClosedMealsFundingAuthority.cs` + funding refs in `Services/PaymentService.cs`, `Services/CartService.cs` |
| **EB1** | outbox is a registered no-op | `PersistedEventsNotificationOutbox` bound `Program.cs:1151`; dispatcher hosted service `Program.cs:1161`; durable row `Entities/Events/EventsNotificationOutbox.cs` |
| **EB3** | VERIFIED-RED ×3 (EV-B1/B2/B3) | All three repaired in place, labelled: `Services/Events/EventsDepositService.cs:134` (EV-B1 intent-first), `:306` (EV-B2 ceiling consumed before provider), `EventsDepositCompletionSink.cs:242` (EV-B3); plus a new EV-B4 (`EventsDepositService.cs:294` — ceiling = provider-confirmed, never `AmountMinor`) |
| **EB4** | four independent "paid" predicates; money ruling open | Shared predicate exists: `Services/Events/EventsDepositPaid.cs`, consumed by service/sink/proposal/settlement; the partial-capture contradiction resolved via EV-B4's confirmed-minor ceiling |
| **EB5** | VERIFIED-RED — VAT never rolled up, settlement carries zero VAT fields | `Services/Events/EventsSettlementService.cs:727-804`: `EventsVatRollup`/`VatSummaryAsync` from POS fiscal truth (`GetFinalizedVatBreakdownAsync`) with typed withholding reasons. NOTE: built to a different design than the row prescribes (reads finalized fiscal truth; no VAT columns on `EventsSettlementLine`) — the row's B-shape is obsolete, not just its verdict |
| **EB6** | no local TTL sweep exists | `Services/Events/EventsExpirySweepHostedService.cs:45`, registered `Program.cs:1131` |
| **TR-B1** | VERIFIED-RED — `Passed = request.Passed`; fix human-gated | Fixed: `Services/Training/TrainingCompletionService.cs:202` — `Passed = TrainingGrading.IsPass(request.ScorePercent, version.PassThresholdPercent)`. §2.5's recommendation of record ("do not enable `training.assignments`") has lost its stated basis |
| **TR-B3** | VERIFIED-RED — UTC horizon; fix human-gated (epoch decision) | Fixed: `Services/Training/TrainingCertificateService.cs:47` (resolver injected), `:111-112` (`KassaBusinessDate.LocalDateOf`/`ExpiryHorizonDate` over store zone) |
| **TR-B4** | §3: "no read path at all" | Route + service + tests live (§1.4 above; `TrainingController.cs:383`); §9 recorded it, §3's cell never updated |
| **MB4 (F-cell)** | "Frontend still NOT BUILT (FE-MRG-9)" | `Web-modules/test/margin-menu-margin-panel.component.test.js` + margin admin pages exist |
| **§3 F-cell preconditions (all modules)** | "Web-modules has no module pages, two test files, core submodule UNINITIALIZED" | 23 module pages under `Web-modules/pages/admin/` (margin ×4, meals ×3, growth ×2+1, events, training ×2, workforce ×10), **139** test files under `Web-modules/test/`, core submodule initialized at `9626a561` |
| **SB-5's named gap** | "the remaining gap is the wire-level pin" | `WebApi.Tests/Wire/GrowthWebhookAuthWireTests.cs` exists |

### TR-B5 — moved **in the uncommitted working tree**, not at the trunk tip

At trunk: the recorded state half-holds — the inverted seam `IWorkforceCompetencyProjection` is still
registered (`Program.cs:857`) with zero production callers, explicitly allowlisted as **"RULING OWED"**
in `WebApi.Tests/Modules/ModuleReachabilitySweepTests.cs:121-132`. In the working tree: the
spec-direction seam now exists uncommitted — Training implements
`ITrainingCompetencyEvidenceProjection` (batched, `Services/Training/TrainingCompetencyEvidenceProjection.cs`),
Workforce consumes it warn-only inside schedule validation
(`Services/Workforce/WorkforceCompetencyEvidenceFindings.cs`, wired in the
`WorkforceScheduleValidationService.cs` diff, registered in the `Program.cs` diff). **Do not dispatch a
TR-B5 lane; it would collide with in-flight uncommitted work.**

---

## 3 · Rows whose recorded state HOLDS at the trunk

| Row | Recorded | Decided by (with positive/negative counts where a grep ruled) |
|---|---|---|
| **MB1** (remainder) | `DefaultYieldFactor` not built | negative: `DefaultYieldFactor` **0** hits repo-wide; positive control same namespace: `YieldFactor` 6 hits in `MarginRecipeService.cs`/`MarginRecipeCostCalculator.cs`; component (0,1] guard alive at `MarginRecipeService.cs:506` (was cited :497 — line drift only) |
| **MB2** | BUILT; §9-landed; memo added later | `MarginRecipeCostCalculator.cs:57,:146,:422-436` (rate-memo design in place); R2 DAG guard doc `MarginRecipeService.cs:24`; `WebApi.Tests/Margin/MarginRecipeDiamondCascadeTests.cs` present |
| **MB3** | BUILT; wire pin §9-landed | `MarginRecipeService.cs:261` `EditDraftAsync` (line unmoved) |
| **MB5** | NOT BUILT — the read is still unbuilt | negative: `price-impact|PriceImpact` **0** hits in `Controllers/`+`Services/`; positive control: `menu-margin` found at `Controllers/MarginMenuMarginController.cs:38`; `Services/Margin/MarginPriceResolver.cs` present to reuse (matches the Growth/Margin lane's measurement) |
| **WB2** | HUMAN-GATED — no loaded-cost oracle exists | worksheet still absent; the 7 repo hits for `feriepeng|arbeidsgiveravgift|LoadedCost|LoadingProfile` are all comments/exclusion-band names (`WorkforceRateResolver.cs:46` — "not modelled at all — that is WB2"; `WorkforceLabourBand.cs:61-62`). Caveat: the premise sentence "the only wage data is `WorkforceEmploymentTerm`" is stale (WB1 built), but the operative state holds |
| **WB3** | BUILT; §9-landed 5/5 | `WebApi.Tests/Workforce/WorkforceRestBoundaryTests.cs:123-131` (11 h-exact inclusive arm) — contra the refusing lane's return, see §1.4 |
| **WB4** | BUILT; §9-corrected premise | route `Controllers/WorkforcePersonnelListController.cs:51` (cited :43 — drift), `WebApi.Tests/Workforce/ScheduleTenantIsolationTests.cs` present; note a NEW `personnel-list/code-register` route at `:153` the document has never seen |
| **MLB4** | BUILT; oracle §9-landed; **one [SQL] run still owed** | `WebApi.Tests/Meals/MealsStatementJournalTruthOracleTests.cs` + `MealsStatementPeriodEpochTests.cs` present; the owed SQL-tier run is still owed (no tier run in this lane) |
| **MLB5** | ALREADY-GREEN model pin | `WebApi.Tests/Meals/MealsKredittsalgJournalTests.cs` — 10 hits of `11002|11001` literals |
| **GB4** | HUMAN-GATED — suppression permanence is coded, no un-suppression path | negative: `unsuppress|LiftSuppression` **0** hits in `Services/Growth/`; §13.4 permanence comments at `GrowthConsentService.cs:102,:190-192,:221-223,:248`. Ruling still open |
| **GB5** | HUMAN-GATED — erasure is channel-global | `Entities/Growth/GrowthContactPoint.cs` — `StoreId` **0** hits (the §9 structural pin's premise intact); the §9 two-scope refinement (`GrowthPreferenceService.cs` store-scoped unsubscribe vs `GrowthPrivacyRequestService.cs` global erasure) still describes the code. Ruling still open |
| **TR-B2** | NOT BUILT — no learner surface | negative: `training/me` **0** hits in `Controllers/`; positive control: Workforce me-routes exist (`WorkforceMeController.cs:293` et al.). All Training routes remain management-scoped |
| **SB-4/6/7/8** | pins/sweeps landed | `WebApi.Tests/Modules/` family (23 files incl. `ModuleReachabilitySweepTests`, `ModuleActorGuardBehaviourTests`, `ModuleFeatureFlagContractTests`, `ModuleGateOrderingTests`), `ScheduleTenantIsolationTests`, `ShiftExchangeTenantIsolationTests`, `MealsCommandReceiptIdempotencyTests` — presence verified, not executed |

---

## 4 · Undecidable in this lane (and why)

- **Every "green" claim** (§9 suite counts 2852→3025, per-lane greens): this lane ran no tier by
  order; presence-in-tree is verified above, execution is not. Undecidable ≠ doubted — just not
  re-observed.
- **SB-1's current 0/0 compile**: the working tree carries uncommitted WIP; a build here would measure
  the WIP, not the document, and no build was run.
- **SB-2 replay-from-empty**: the chain has grown many module migrations (`Training_W3_ChecklistsAndDeviations`,
  `Workforce_W5_Timesheets`, `Margin_WasteEntries`, `Growth_AuditLedger`, `Meals_CompanyReceivableAccount`,
  `Kassa_AccountingSummaryDayUniqueIndex`, …); replay needs Docker + a tier.
- **MLB4's owed [SQL] oracle run** — still owed, still undecidable without a container.

---

## 5 · Bottom line

- **26 of the document's recorded verdicts no longer describe the trunk** (§2 table + EB2/TR-B6/§5-outbox/
  OD-6 + TR-B5-in-flight); **14 hold** (§3 table); the execution-greens are undecidable without a tier.
- The two findings worth a human's morning: **EB2** (a deposit lever now reachable for stores with no
  proven merchant config — the invariant the document believes is enforced is procedural only) and
  **TR-B6** (six internkontroll tables live in the migration chain with zero reachable behaviour — the
  RF-1313 shape, plus an SB-2 collision trap for any lane sent to "build" them).
- **Nobody should dispatch build lanes off §3's cells or off the refusing lanes' residue lists** — both
  are stale in the direction that wastes lanes (GB1, GB2, WB1, WB5, MLB1-3, EB1, EB3-6, TR-B1, TR-B3,
  TR-B4, WB3 are all built), and the document's authors own the re-write.

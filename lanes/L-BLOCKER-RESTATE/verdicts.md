# L-BLOCKER-RESTATE — re-measure of the 47 open blocker flags

Measured 2026-08-03. Read-only. No file outside this directory and the RETURN was touched.

## World as measured (not inherited)

| thing | measured value |
|---|---|
| backend declared world | `feature/restaurant-modules` @ **3579bbbc, 2026-08-02** |
| frontend world | `Web-modules` @ 31fc45d on `feature/restaurant-modules` |
| backend checkout the probes read | on **`lane/meals-grace-pins`** — 4 behind, 1 ahead of the world |
| ConsumerWeb checkout | on **`feature/swiss`** |
| branches, total / unmerged | **259 / 162** |
| migrations at the world / on the stack | **255 / 273 files** = **nine migrations** past the world |
| lane states | 123 built-unverified, 15 verified, **0 accepted**, 95 open, 4 running (237) |

**The single largest fact in this sweep: `feature/restaurant-modules` has not moved since 2026-08-02.
Every clearing branch measured is UNMERGED into it.** So for any flag whose `clears_when` is read
against the declared world, a remedy that exists on a lane branch does not satisfy it.

## Arithmetic in the brief, verified

| claim | measured | verdict |
|---|---|---|
| "38 of 47 carry no re-measure" | **19** carry no dated re-measure marker; 28 carry one | WRONG |
| "of those, 9 have a clearing lane that has delivered" | **13** flags have a `cleared_by` lane at built-unverified or better | UNDERCOUNTED by 4 |
| the 9 annotated in place | exactly 9 carry the "Step one of the blocker re-measure" note | matches the annotation, not the population |

The four that a delivered clearing lane covers but the shortlist omits:
**F-EV-ACCEPT-UNGATED** (L-EV-ACCEPT-GATE), **F-EV-NO-GUEST-ORIGIN** (L-EV-GUEST-ORIGIN),
**F-JOURNEY-GUARD-DECORATIVE** (L-JOURNEY-GUARD-FAIL), **F-AI-REQUEST-BODY** (L-AI-MIDDLEWARE-DELETE).
They were excluded because they already carry a prose re-measure — but a prose note is not a verdict,
and three of them narrate a fix as *done*. Excluding a flag from the shortlist because someone already
wrote about it is the same error as ruling on it without measuring it.

## Verdicts — batch measured directly by this lane (13)

### F-MIG-CHAIN-STACKED — **partly-true**
- Clause A "no branch carries another lane's unmerged migration as its chain tail": **STILL TRUE at the
  world.** `lane/margin-waste` is an ancestor of `lane/wf-w5-timesheet`; both are UNMERGED into
  `feature/restaurant-modules`. Six such lanes measured (margin-waste, wf-w5-timesheet,
  wf-adjustment-ordinal, wf-export-duplicate, mig-company-receivable, acct-uidx) — all `onStack=YES`,
  all `onBranch=NO`.
- Clause B, the OR-escape "**or** the dependency is recorded where a migration author will see it":
  **SATISFIED.** `fact:be.mig.head` is now a live probe in the plan, and the body carries the ancestry
  correction. Nobody has read the OR — the flag is clearable on its own text today.
- The depth figure is right for once: **nine** migrations, measured as 18 files (273-255).
- The branch figure is wrong a **fifth** time: body says "152 of 249 branches unmerged"; measured
  **162 of 259**. Off by exactly ten in both terms — the ten branches created since. The flag predicted
  this about itself and then did it again.

### F-DETACHED-MIGRATIONS — **partly-true**
- Title clause "two migrations exist on no branch": **NOW FALSE.**
  `20260801084923_Margin_PeriodStatementFinalizedImmutable` and
  `20260801102621_Workforce_PublicationReceiptUniqueness` are both on `integration/mig-stack-land`.
- `clears_when` clause "the chain tip is reachable from feature/restaurant-modules": **STILL TRUE.**
  The tip `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` exists only on the stack, and
  `feature/restaurant-modules` IS an ancestor of the stack rather than the other way round.
- `lane/train-w3-schema` **still does not exist as a branch** — fourth independent confirmation.

### F-ACCT-DUP — **partly-true, and unclearable for a reason that is not its own**
- The remedy EXISTS: `Migrations/20260803093235_Kassa_AccountingSummaryDayUniqueIndex.cs`, on
  `lane/acct-uidx` (c606993a, 2026-08-03 12:13) and on `integration/mig-stack-land`.
- It is at **neither** `feature/restaurant-modules` **nor** the working tree of `../OkamAPI-modules`,
  which is what the probe `acct.uidx  schema  ../OkamAPI-modules/Migrations/*AccountingSummar*.cs`
  actually reads. Working tree: no match.
- So `clears_when: fact:acct.uidx is present` cannot go present until the migration stack lands.
  **F-ACCT-DUP is gated on F-MIG-CHAIN-STACKED / F-DETACHED-MIGRATIONS, and nothing records that.**

### F-PROBE-ROOT-WRONG-WORLD — **partly-true**
- Clause "every sibling checkout a probe reads is on the declared branch": **STILL TRUE as a defect.**
  Backend on `lane/meals-grace-pins` (4 behind, 1 ahead); ConsumerWeb on `feature/swiss`.
- Clause "**and** a mechanism says so without being asked": **SATISFIED.** `be.world`, `be.world.branch`,
  `be.world.behind`, `fe.world`, `cw.world` are live facts re-measured every refresh; `be.world` reads
  `False` right now, honestly.
- The 2026-08-03 ruling is `already-guarded`, which answers clause two only. Half the flag is unruled.
- First named victim: **F-ACCT-DUP above.**

### F-ACCEPTANCE-IS-THE-CHOKE — **still-true, and the numbers understate it in both directions**
- Body (2026-08-02): "111 lanes at built-unverified and exactly one is verified; 22 open lanes gated,
  18 waiting on already-built work."
- Measured today: **123 built-unverified, 15 verified, 23 gated, 19 waiting on already-built work.**
- The sharper shape the flag does not yet say: **verified went 1 -> 15, and `accepted` is still ZERO.**
  Walking is happening; acceptance is not following it. The choke has moved from the walk to the
  transition after the walk, which is a different ask of the owner.

### F-PROD-CORS-WILDCARD — **still-true, measured against the live host**
```
$ curl -i -X OPTIONS https://api.okam.no/ -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET'
HTTP/2 204
access-control-allow-methods: GET
access-control-allow-origin: *
```
Exactly what `clears_when` asks to be checked, and it fails. This is the hardest evidence in the sweep.

### F-AZURE-FUNCKEY — **still-true, and the body's own consolidation claim is false at the world**
- The live key `til3r2g9aZpBFpNFcNCpsVzSYQ/...` is committed at `feature/restaurant-modules` in **TWO**
  files: `Services/InvoiceService.cs:1250` and `Services/ReceiptService.cs:144`. Same on
  `integration/mig-stack-land` and `integration/confirm-family`.
- The body says the finding lane "consolidated it to exactly one place so rotation is a one-line
  change". The consolidation (`Services/OkamFunctionsDocumentRenderer.cs`) exists only on
  `lane/pdf-nullderef` and `lane/download-pdf-wire`, **both unmerged**. Rotation is a two-site change
  everywhere the key actually lives today.
- `clears_when` clause "never in a committed file" is measurably FALSE. The rotation clause is not
  measurable from the repo and remains the owner's.

### F-MEALS-NO-SQL-ON-REQUOTE — **still-true, now measured rather than argued**
- Four SQL-tier receipts exist in the whole estate, all on `integration/mig-stack-land`, all committed
  2026-08-01: `2eeff48f`, `23f6bbeb`, `1da15fb1`, `50b85657` (`artifacts/tests/*-sql-tier.trx`).
- `lane/meals-requote-release` is **NOT an ancestor of `integration/mig-stack-land`**. So none of the
  four ran on a re-quote-bearing tree.
- `lane/meals-supersede-sql` IS re-quote-bearing and carries **zero** sql-tier trx.
- `integration/confirm-family` carries **zero** sql-tier trx, confirming the confirm-family sentence.
- The four runs predate the 2026-08-03 ruling by two days and are the most likely thing to be misread
  as covering this. They do not.

### F-CONFIRM-MERGE-RECEIPT-TRAP — **partly-true, and the dangerous clause is CLOSED**
- Clause "both base receipts kept under distinct names": **SATISFIED.** On `integration/confirm-family`:
  `artifacts/tests/base-8704ff63-fast-tier-composition-root.trx` and `...-conat-retire.trx`.
- Clause "each lane's evidence file pointing at the run it actually produced": **SATISFIED.**
  `lanes/L-COMPOSITION-ROOT-CHECK/evidence.md:16` -> `-composition-root.trx`;
  `lanes/L-CONFIRM-CONAT-RETIRE/evidence.md:20` -> `-conat-retire.trx`.
- Clause "the confirm family is merged": **satisfied only in the weak sense** — the family is composed
  onto `integration/confirm-family`, which is itself 23 commits UNMERGED into the declared world.
- Carrying this as an undifferentiated blocker overstates it: the receipt trap that would have deleted a
  real measurement is shut and provable. What is left is a merge.

### F-UTLKVIT-PREDICATE-COLLISION — **partly-true; the closure note describes a tree that is not the world**
- The consolidated public type `KassaCreditSale.IsCreditSale` exists **only on
  `lane/utlkvit-replay-source`** (3a509b68, 2026-08-02 17:22), with call sites at
  `Services/Kassa/FinalizeService.cs:237,304`, `SaftCashRegisterExportService.MasterData.cs:112`,
  `SaftCashRegisterExportService.Transactions.cs:251`.
- The rival internal static **still exists on the sibling `lane/utlkvit-sale-row`** at
  `Services/Kassa/PosReceiptService.cs:149`. Both twins are live in the estate right now, on two
  branches, neither merged.
- At the declared world there is exactly ONE predicate — but it is the *original private one*
  (`SaftCashRegisterExportService.MasterData.cs:195`) with two call sites, not six.
- The body's "**Verified closed 2026-08-03 by count** — exactly one predicate, exactly six references"
  is true of the composing lane's worktree and **of no branch a reader can check out**.

### F-POS-TENDER-WIRE-REINTRODUCES-TWO — **still-true, verbatim**
- `lane/meals-pos-tender-wire` @ 32fd5a86 (2026-08-03 10:42), unrebased.
- `Services/Kassa/FinalizeService.cs:237` reads
  `var isCreditSale = payments != null && payments.Any(p => p.PaymentType.IsCompanyAccount());`
  — classifying off the **request payment list**, exactly as the flag says, and referencing no shared
  predicate. Its comment at line 235 still points at `SaftCashRegisterExportService.MasterData.IsCreditSale`.
- Refinement the flag does not have: that text is **byte-identical to the copy on
  `lane/utlkvit-sale-row`**. The tender-wire lane did not author a seventh definition; it carries the
  same pre-consolidation inline classification a sibling carries. The hazard is unchanged; the story is.

### F-EV-GUESTLINK-FORK — **already-fixed as to the hazard; condition untestable at the world**
- `git log --all --diff-filter=A -- 'Helpers/Events/*'` proves **`EventsGuestLinks.cs` (plural) was never
  committed on any branch.** Only the singular `Helpers/Events/EventsGuestLink.cs` exists, added by
  9e3a607b (2026-08-01), and it lives on exactly three sibling branches: `lane/ev-uri-relative`,
  `lane/ev-vipps-fallback`, `lane/ev-vipps-fallback-2`.
- At `feature/restaurant-modules` there are **zero** guest-link composers, so "exactly one exists in the
  tree" cannot be evaluated there at all.
- **Bookkeeping defect, and it is this lane's own failure mode:** the evidence that settles this flag —
  "**Averted 2026-08-03**…" and "**Left open deliberately.** The world satisfies the condition" — is
  filed at `docs/plan/plan.md:9077-9102`, **under `## Horizons`**, ~190 lines below the flag body. A
  reader of `### Flag F-EV-GUESTLINK-FORK` never sees it. That is exactly
  F-JOURNEY-GUARD-DECORATIVE's "a sentence I read past every time", made structural instead of human.
  A stray `**Ruled 2026-08-03 … wait-for-layout**` sits orphaned in the same place.

### F-WF-PUSH-SILENT — **still-true, and it carries another flag's ruling**
- `clears_when`: "a send to **a tag with no registration** is recorded as failed".
- The remedy lane `lane/wf-push-notify` (f5305ced, **2026-08-01, two days before the ruling**) maps
  exceptions to `Fail(...)` — but `Services/NotificationService.cs:115-122`
  (`SendConsumerNotificationOrThrowAsync`) simply calls `SendTemplateNotificationAsync` with
  `"userId:" + userId`. Azure Notification Hubs does **not** error when a tag matches zero
  registrations, so that case raises nothing and is recorded as `Ok()`.
- The only outcome pinned in `WorkforceNotificationTransportTests.cs:221` is
  `Assert.Equal("PushNotConfigured", row.LastError)` — an absent *hub credential*, not an absent
  *registration*. The named case is untested and undetectable as written.
- Residue of the known mislink: `cleared_by` was repointed to `L-WF-PUSH-SILENT`, but the ruling line
  still reads **`resolve-and-record-the-actor`** — L-GR-DISPATCH-ACTOR's ruling, answering a different
  property (actor, not outcome). The repoint was half-applied.

## Verdicts — harness / infra / money-route batch (8), spot-checked by this lane

### F-FIXTURE-NO-GATES — **already-fixed** (STALE BLOCKER)
Remedies `c1b4619` (2026-08-01 20:06) and `bb1bf0c` (2026-08-01 20:49), both ancestors of frontend HEAD.
**Ruled 2026-08-03 against a defect closed 2026-08-01.**
- Clause (a) fixture models the flag store: `test/e2e/fixture/world.js:230-249` carries an 18-flag
  catalog, **every one `defaultEnabled: false` except `workforce.setup`** — deny-closed exactly like the
  backend; `test/e2e/fixture/api-server.js:100` seeds `flags: {}` with **no pre-enabled overrides**, and
  the only writer is the PUT route at `:959`, i.e. the product.
- Clause (b) each journey turns its own switch on through the product:
  `test/e2e/support/flags.js:53 async function turnOn (page, flagKey)` drives `/admin/feature-flags`,
  clicks, and re-reads the badge from the write response. **11 of 19 journeys flip a switch; 2 more name
  a no-lever gate deliberately; the remaining 6 are 2 modal specs, the flag screen itself, and 3 walking
  surfaces the backend does not gate either.**
- **Coupling nothing records:** the fixture is faithful today *because* the backend leaves the Events
  public writes ungated (F-EV-ACCEPT-UNGATED). The moment that gate lands, the fixture is a release
  behind — which is F-FIXTURE-BEHIND-BACKEND, and no check exists to catch it.

### F-FIXTURE-BEHIND-BACKEND — **still-true**
No divergence check exists on any branch. `package.json` has six e2e scripts, none of them a parity or
divergence run. The one cross-repo tie is an explicit hand-copy (`test/growth-send-gate.test.js:36-38`),
which is the very shape the clause rejects.

### F-JOURNEY-GUARD-DECORATIVE — **already-fixed** (STALE BLOCKER, both halves)
- Re-throw `9a5900a` (2026-08-02 11:24), ancestor of HEAD: `test/e2e/support/journey.js:592`
  `if (wrongWorld) { throw new Error(error); }`, sited after the artifact write.
- Proof `31fc45d` (2026-08-03 14:19) IS HEAD: `test/e2e/scripts/guard-proof.js` spawns real Playwright
  children, reads exit status, and builds a pristine/mutant pair (`:276-277`) requiring the mutant to
  come back green — the historical defect reproduced on demand.
- Ruled 2026-08-03 against a re-throw that landed 2026-08-02.

### F-ARTIFACT-STORE-OVERWRITES — **partly-true**
- Clause (a) no displacement by a weaker run: **SATISFIED.** `test/e2e/support/artifact-store.js:40-56`
  ranks live>fixture, passed>failed, identified>unidentified; 12 named cases in
  `test/journey-artifact-store.test.js`, incl. `:63` and `:122`. Landed `533aea4` 2026-08-02.
- Clause (b) **every** artifact records which backend build answered it: **NOT SATISFIED.** Re-counted
  directly: **22 artifacts, 1 identified, 5 `backendBuild: null`, 16 with no such field. 3 are live and
  only 1 of those 3 is identified** (`workforce-flag-lever.playwright.json` →
  `wt-lwr-api@3579bbbc...`, naming the declared-world tip exactly). The mechanism works; the data is
  two live re-runs away.

### F-AI-REQUEST-BODY — **partly-true (merge, not build)**
- Still live at the declared world: `3579bbbc:Helpers/ApplicationInsightsLoggingMiddleware.cs:73`
  `requestTelemetry.Properties.Add(jsonBody, TruncateLongString(requestBodyString, 8190));`
- Deleted on `lane/ai-middleware-delete` (5b2e99c8, 2026-08-03 11:46) with a 396-line assembly-derived
  pin (`WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs`) that reds on a dormant reimplementation.
- The one flag in this batch whose remedy did NOT predate its ruling. Outstanding action is a merge.

### F-INVOICE-RETRY-ANONYMOUS — **still-true, and a confirmed duplicate**
`3579bbbc:Controllers/InvoicesController.cs:117 [HttpPost("RetrySendingExistingInvoices")]` with no
`[Authorize]`. Same controller, same `cleared_by: L-INVOICE-AUTHORIZE`, and its own body already records
the subsumption. Two names for one problem is a second thing to forget to close.

### F-INVOICE-ROUTES-ANONYMOUS — **still-true, and the file has not been touched since 2025-12-03**
Verified by reading the attribute list at `3579bbbc:Controllers/InvoicesController.cs`: no class-level
`[Authorize]`; authorized actions at `:84 :101 :133 :152 :172 :188`; **anonymous by omission at
`:34 :51 :68 :117 :204/:205` — exactly the FIVE the 2026-08-02 recount named.** No `FallbackPolicy` or
`DefaultPolicy` anywhere; `AddCustomAuthorization()` registers one named policy and no fallback.

### F-MRG-STATEMENT-UNATTRIBUTED — **still-true, no remedy on any branch**
`3579bbbc:Entities/Margin/MarginPeriodStatement.cs:29-89` and
`Entities/Margin/MarginPurchaseSpendEntry.cs:18-44` carry no actor/user column;
`git log --all -S 'CreatedByUserId' -- Entities/Margin/` returns no commits on any branch. The Margin
controller resolves no user. Clearing lane L-GR-DISPATCH-ACTOR is `open`.

## Verdicts — Workforce / statutory batch (9), spot-checked by this lane

### F-WF-NO-INVITE — **already-fixed AT THE DECLARED WORLD** (STALE BLOCKER, the cleanest one)
Verified directly: `pages/workforce/join.vue` and `utils/workforce-me/invitation-claim.js` (worker side)
and `utils/workforce/roster-client.js:138 POST .../invitations` (manager side) are all **tracked at
HEAD**. `artifacts/journeys/workforce-invitation-onboarding.playwright.json` is **committed**, 16 steps,
all passed, with the three required conjuncts read verbatim: *issue the invitation code -> code issued,
20 characters, shown once*; *claim the code -> claimed; grants on the receipt: WorkforceSelf*; *the
worker sees the shift the manager published -> first shift card 09:00-15:00*. It landed in the declared
world at `35440cf` **2026-08-03 10:41**, and the ruling `build-the-invite-surface` is dated 2026-08-03.
Caveat to carry: `"backend": "fixture"`. `clears_when` does not demand live, so the clause is literally
met — but this is the evidence class the estate spent the week learning to distrust.

### F-WF-CLOCK-UNLINKED — **partly-true**
Every conjunct of the capture exists and passes (`lanes/L-WF-OPLINK/artifacts/journeys/
wf-operator-import-clock.playwright.json`, steps 4/8/10 read verbatim). What is untrue is that it is
(a) **untracked** — `git ls-files lanes/L-WF-OPLINK` is empty, so the plan's `evidence:` line cites a
file on no branch; (b) not at the declared world (`lane/fe-wf-oplink`, unmerged); (c) `"backend":
"fixture"` at line 14 — **F-POS-CLOCK-NO-CLIENT's claim about it is verified true**.

### F-POS-CLOCK-NO-CLIENT — **partly-true; narrower than its own correction says**
Client confirmed on `lane/fe-wf-oplink`: `utils/workforce/pos-clock-client.js:63` POSTs
`/workforce/pos/clock-events`; `components/admin/pos/ClockScreen.vue:37 @click="punch(EV_IN)"`, wired
from `PosShell.vue:167`. Remedy `7c3a1e1` 2026-08-01 12:55 predates the flag body. Remaining truth is
**merge + commit the artifact + re-capture live**, not "merge plus one live re-capture" — and the
clock-state *read* half is weaker than the clause implies (`ClockScreen.vue:187` "there is no read for it").

### F-WF-TWO-ADMINS-TWO-ENGAGEMENTS — **partly-true: the code is done, the proof is the gap**
`lane/wf-bootstrap-one-engagement:Migrations/20260803124302_Workforce_BootstrapFirstEngagement.cs:20`
declares `UX_WorkforceStaffMembers_OneFirstEngagementPerStore` unique on `StoreId` filtered
`[IsFirstEngagement] = 1`, and `Helpers/ApplicationDbContext.cs:2586` declares the same — **so this is
NOT the F-ACCT-DUP model-only shape; checked specifically.** But `clears_when` wants the concurrent
refusal proven, and `BootstrapFirstEngagementRaceSqlServerTests` is a SQL-tier class that has never run.
Gated on F-SQL-HEADROOM, not on engineering.

### F-WF-NOCORRECTION — **still-true, no remedy on any branch in either repo**
`3579bbbc:Services/Workforce/WorkforcePersonnelListProjection.cs:116` and `:132` both pass
`correctionActor: null, correctedAtUtc: null`. A sweep of every backend branch for a non-null
`correctionActor:` returns zero. The alternative caveat clause is also unmet: the only such sentence in
the estate is `wfclock_no_correction` on two unmerged frontend branches, and it is on the **POS clock
screen, not the sheet**. The sheet's only caveat is about identification (`translations/no.ts:4784`).

### F-WF-BLIND-BIND — **still-true, no remedy on any branch**
`3579bbbc:Models/Workforce/WorkforceOperatorImportModels.cs:35` — the result contract carries
`OperatorId, Outcome, StaffMemberId, ConflictingStaffMemberId` and **no person-name field at all**. The
import service resolves a person and never returns it. No correction/unlink endpoint exists anywhere.

### F-UTLKVIT-SALE-ROW — **already-fixed pending merge; the ruling was accurate**
`lane/utlkvit-sale-row:Services/Kassa/PosReceiptService.cs:131` routes a credit sale to the delivery
document inside the shared builder the print/view/public paths all call; `:399` refuses the copy
(`ErrorMessages.ReceiptCopyNotAllowed`). Remedy 1854f594 **2026-08-02 17:44, predating the 2026-08-03
ruling `already-fixed-pending-merge` — which is therefore correct as recorded.** Nothing of the family
is at the world: `git grep UTLEVREC 3579bbbc` is empty.

### F-XZ-CREDIT-UNSPEC — **partly-true, and a whole lane is buried**
- "the entity has no fields" is **FALSE in the estate**: `lane/meals-xz-credit` (25586d86,
  **2026-08-01 16:00 — older than the declared-world tip itself**, UNMERGED) carries
  `Models/Kassa/XZReportModels.cs:53-54 CreditSalesCount / CreditSalesAmount` plus the credit-return
  pair and the service hook. Verified directly; the flag body appears not to know it exists.
- Its own X-report test complaint is also fixed there: `MealsXZCreditSaleTests.cs:57-58` asserts
  `SalesAmount == CashSalesAmount + CreditSalesAmount` **and** `SalesAmount != CashSalesAmount`.
- **Still true:** the delivery-receipt count/amount clause (zero hits on any branch), and the
  systembeskrivelse clause — the doc that claims the credit-sale specification "er skildra der" lives on
  `lane/utlkvit-sale-row` while the fields live on `lane/meals-xz-credit`, and the two lanes are not
  ancestors of each other. At the world the doc still says the function does not exist at all
  (`3579bbbc:docs/okam-kassa/compliance/RF-1313-systembeskrivelse.md:142`).

### F-PERSONALLISTE-PRINT — **partly-true, and the ruling names a fix that is not the one that exists**
- The PDF clause is met, on unmerged branches: `lane/print-host:artifacts/journeys/admin-print-host/
  01-personalliste-a4-portrait.pdf` (+ landscape and a before/after pair), `6e6acd0` 2026-08-01 15:13.
  `git ls-tree -r HEAD | grep '\.pdf$'` at the declared world returns nothing.
- The inert mechanism is still live at the declared world:
  `HEAD:pages/admin/workforce-personnel-list.vue:175 document.body.classList.add('wfpl-print-host')`.
- **The ruling `adopt-scoped-css` does not describe the landed fix.** `lane/print-host` kept the body
  class and moved it into vue-meta's own channel (`:372` "UNSCOPED, and every rule is guarded by the
  wfpl-print-host class"); only the sheet's own rules are scoped. Ruling and remedy disagree.

## Verdicts — Growth batch (8), spot-checked by this lane

### F-GR-FALSE-EVIDENCE — **already-fixed AT THE DECLARED WORLD** (already-known stale)
`6b4913b8` 2026-08-01 10:42 "An Art. 15/17 receipt can no longer record a delivery nobody made" is an
ancestor of 3579bbbc. `3579bbbc:Services/Growth/GrowthPrivacyRequestService.cs:293-299` — the delivered
state has one producer, downstream of both the `catch (GrowthMailSendException)` at `:283` and the
outcome check. Contract case present at the world:
`WebApi.Tests/Growth/GrowthPrivacyDeliveryEvidenceTests.cs:52-53` (`[InlineData(TransportFailure.Throws)]`)
and the erasure arm at `:85-86`. Remedy predates the ruling by two days. The flag body's account of this
commit checks out exactly on subject, ancestry and date.

### F-GR-UNCONFIRMED-EMAIL — **partly-true, and there is a live merge-order hazard**
Both clauses hold on `integration/confirm-family` (`:Services/Growth/GrowthNewsletterService.cs:519
|| !account.EmailConfirmed`; pin `GrowthTestSendBindingTests.cs:99`), neither at 3579bbbc. Remedy
a7697121 2026-08-02, one day before the ruling.
- **At the declared world it is WORSE than the flag says:** `git grep RequireOwnAccountAddress 3579bbbc`
  is empty and `Controllers/GrowthNewslettersController.cs:147` passes no user id at all — one request
  to any address, not two.
- **HAZARD:** `lane/growth-audit-ledger` (bd3a840f) is a *clean descendant* of 3579bbbc and carries the
  address-only binding **without** the confirmation flag (`:Services/Growth/GrowthNewsletterService.cs:538`).
  **Landing it before `integration/confirm-family` makes this flag literally true at the tip for the
  first time.** Merge order is load-bearing and nothing records it.

### F-CONFIRM-BRUTEFORCE — **partly-true (0 of 3 clauses at the world, 3 of 3 on the family)**
World: `3579bbbc:Services/UserService.cs:116 new Random().Next(100000, 999999)`;
`Controllers/UserController.cs:42-48` confirm-email with no limiter and no counter.
Family: `eeb1b8c4:Controllers/UserController.cs:48 TryConsumeConfirm(...)` **on the guess entry point**
(the condition the flag named); `Services/EmailConfirmationRateLimiter.cs:124 ConfirmPerAccountLimit = 10`;
`:60 InvalidateEmailConfirmationCodeAsync` closes the mint-forever half;
`Helpers/NumericConfirmationCode.cs:33 RandomNumberGenerator.GetInt32`. Remedy c96cd21e 2026-08-02.

### F-MEMCACHE-IN-TRYCATCH — **partly-true, and the defect is intact at the world**
`3579bbbc` has exactly one registration, `Helpers/ServiceCollectionExtensions.cs:58 services.AddMemoryCache()`
inside `AddMcpAuthentication`, called from `Program.cs:143` **inside the `try {` opened at `:142`**, after
`ValidateOpenIddictCertificates` which can throw. Fixed unconditionally at `eeb1b8c4:Program.cs:1015`;
the check `WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs:155` does not exist at 3579bbbc at all.
bfe57c3c's own message records the mutation, so clause (b) is genuinely mutation-proven.

### F-GR-HEALTH-DEAF — **partly-true; the remedy withholds, and predates the ruling by two days**
`c11e78a6` **2026-08-01 15:24**, ruling 2026-08-03. It genuinely nulls rather than zeros:
`Services/Growth/GrowthDeliveryHealthService.cs:117 BounceRate = ingestion.IsPossible ? Rate(...) :
(double?)null` and `:120 OutcomeRatesWithheld = ... new GrowthWithheldFigure { Code, Reason }`.
Still zero at the world: `3579bbbc:Models/Growth/GrowthDeliveryHealthModels.cs:27 public double BounceRate`.
**Not on `integration/confirm-family` or `lane/growth-audit-ledger` either — no other lane carries it in.**

### F-GR-NEWSLETTER-CROSS — **still-true, and the third clause is the merge clause**
Remedy 87600a1c 2026-08-01 is **test-only** (+439 lines, one file, no production change) and lives on
`lane/growth-newsletter-wire`. `clears_when` ends "at a tip that carries the proof" and no tip does.
**Severity nuance worth recording:** the production guard IS present at 3579bbbc
(`Controllers/GrowthNewslettersController.cs:68,81,101,121,141,161,181` all call `AuthorizeStoreAsync`).
There is no live cross-tenant hole at the world; what is missing is the proof that keeps it closed.

### F-GR-PROVIDER-ACCOUNT-UNGATED — **partly-true, and the pin does not do what clears_when asks**
Gate landed on `lane/growth-audit-ledger` bd3a840f **2026-08-03 14:17, hours AFTER the ruling** — the one
Growth flag whose remedy does not predate it. World is ungated:
`3579bbbc:Controllers/GrowthDeliveryHealthController.cs:69-77` (while the sibling `SetProviderPaused` at
`:96` does gate). **Clause two is not met:** no test at bd3a840f calls `UpsertProviderAccount` with an
absent or foreign store; the concealment fact at `GrowthProviderAccountAdminTests.cs:125` is the *pause*
action. The only thing that reds on gate removal is a source-text scan
(`ModuleGateOrderingTests.cs:144`) **defeated by deleting the gate line and the actor line together.**

### F-GR-DISPATCH-UNATTRIBUTED — **still-true, no remedy on any branch**
`Services/Growth/GrowthDispatchService.cs:55` is byte-identical at 3579bbbc, eeb1b8c4, bd3a840f,
87600a1c, c11e78a6 and 2a052800; the controller call passes no user id on any of them;
`git log --all -S'DispatchAsync(storeId, newsletterId, RequireUserId'` returns zero commits;
`Entities/Growth/GrowthDispatchRun.cs` has no actor column. **Even the audit-ledger lane leaves it out:**
`bd3a840f:Services/Growth/GrowthAuditEventTypes.cs` records five event types and dispatch is not one.

## Verdicts — Events / Meals batch (9), spot-checked by this lane

### F-EV-CALLBACK — **partly-true; the canonical shape, and now dated**
Remedy `99f56e63` **2026-07-31 22:41**, an ancestor of 3579bbbc — **two days before the 2026-08-03
ruling that dispatched a lane at it.** `3579bbbc:Services/Events/EventsDepositService.cs:557` consults
the rail and recovers rather than releasing. The other two clauses are TRUE BY DESIGN and confirmed:
`Controllers/VippsController.cs:110-112` returns `Ok()` off a `Task`-returning sink that cannot report
promotion; `pages/events/deposit/_token.vue:205-207` has no poll (its only timer is a spinner).

### F-EV-INQUIRY-UNGATED — **partly-true, and the worst-calibrated flag in the set**
Written as an open product decision "deliberately left for a ruling", credited to a lane that ran
2026-08-03. Measured: `lane/ev-inquiry-gate` **8ecb47df, 2026-08-01 20:28 — 43 hours earlier** — already
gates it (`Services/Events/EventsInquiryService.cs:52` -> `:300 IsStoreEnabledAsync`), with a
**required** gate (`:35 ?? throw new ArgumentNullException`), a 193-line test file, its own plan lane
entry (L-EV-INQUIRY-GATE, built-unverified) and a follow-up Fable security review. The decision the
flag asks for was already made and built.

### F-EV-ACCEPT-UNGATED — **partly-true (defect live at the world, complete remedy unmerged)**
`git grep IEventsModuleGate 3579bbbc -- Services/Events/EventsProposalService.cs` is empty. On
`lane/ev-accept-gate` 8eee00f7 the guard is called at `:405` and `:475`, both **before the status
switch**. Three paired refusal/success facts plus a composition-root wiring test.
**Merge collision nothing records:** this lane's gate is an **optional** ctor param
(`:39 IEventsModuleGate gate = null`) while the inquiry lane's is **required**. Two lanes, one
interface, two patterns, and both land into the same file family.

### F-EV-NO-GUEST-ORIGIN — **already-fixed: an OR clause is satisfied AT the declared world**
`clears_when` is "a committed configuration sets the guest origin **or** a recorded ruling says which
host serves those pages". The ruling exists at the declared world: `docs/plan/plan.md:7756 ruled:
api-subdomain 2026-08-03 by @sven`, `log.md:516` at 08:52Z, and the decision text explicitly binds
Events. The configuration half also exists on `lane/ev-guest-origin` (b0b501a5 12:59, four hours after
the ruling — correctly ordered). Nobody has read this OR either.

### F-MEALS-LEVER-INERT — **partly-true; neither branch of its OR is met, yet the work is done**
`3579bbbc:Services/Meals/MealsFeatureFlags.cs:30/96` — `meals.module` is **still catalogued, not
withheld**, and `Withheld` holds only Ordering/Projection/Statements. No consumer reach on any branch
(`git log --all -G"IMealsStoreFeatureFlags" -- MealsQuoteService.cs CartService.cs` = zero commits).
What shipped on `lane/meals-reachable-web` (f65595d) answers the flag's *corrected* finding — naming the
two kinds of withholding and disclosing the money-path flags as deployment config — not the written
condition. The old false copy is still live at frontend HEAD (`translations/en.ts:5030`).
**The clears_when should be rewritten rather than tracked as-is.**

### F-MEALS-EIGHTH-READ — **partly-true, and it describes a defect the world does not have**
Remedy `9fe599c6` **2026-08-02 11:21**, one day before the ruling:
`WebApi.Tests/Meals/MealsRequoteSupersedeTests.cs:50 HoldUninvolvedAsync`, used at four sites, plus a
refusal pin at `:144` that "reds by SUCCEEDING where it must refuse". **Neither the defect nor the fix
exists at 3579bbbc** — the re-quote feature itself is not an ancestor and the test file does not exist
there. Counting this against the declared world double-counts. SQLite only; no SQL tier
(which is F-MEALS-NO-SQL-ON-REQUOTE, and the two are the same gap seen twice).

### F-FLAGS-FALSE-GUARANTEE — **partly-true; clause 2 untouched on every ref**
Clause 1 (Meals registers an effective resolver) SATISFIED on `lane/flags-effective-resolvers`
(e45ec4c1, **2026-08-01, two days before the `merge-it` ruling**): `Program.cs:791,802,1078` +
`Services/Meals/MealsModuleFlagEffectiveResolver.cs:46` + a 176-line derived guard. At 3579bbbc
`git grep FlagEffectiveResolver -- Program.cs` returns **one line, Workforce only**, and the divergence
is live at `Services/Meals/StoreBackedMealsFeatureFlags.cs:43 return _configGate.IsModuleEnabled;`.
Clause 2 (scope the sentence) **never edited on any ref** — `git log --all -G"ff_effective_note"` returns
only the commit that introduced it. So the false sentence is live in three languages.

### F-ROLLBACK-LEAVES-TRACKED-STATE — **partly-true; the site is fixed, the generalisation is not**
Fixed on `lane/meals-release-actor` 249612ac by staging the audit row **before** the mutation
(`Services/Meals/MealsFundingAuthority.cs:262-267`, with the ordering documented as load-bearing).
The scope pin is the **second** consecutive throw on one DI scope in
`WebApi.Tests/Wire/MealsFundedCheckoutWireTests.cs` — the fresh-context assertion proves only the DB
rollback, which was already true. **The defect does not exist at 3579bbbc either** (`git grep
StampRelease 3579bbbc` = zero): the guard that threw is introduced and fixed inside the same lane.
The flag's own generalisation — "nothing sweeps for that shape" — is untouched everywhere.

### F-VIPPS-REDACT-OPEN — **partly-true, with one named clause FALSE**
- "an unmatched request redacts": SATISFIED on `lane/vipps-redact-404` (cb18cab4), and **wider than the
  clause** — the trigger keys on the empty route-value set, covering 404 **and 405**
  (`Helpers/CapabilityRouteTelemetryInitializer.cs:223,238`), and fails closed on the OUTPUT at `:243-245`.
- "**and an encoded route value** redacts": **FALSE CLAUSE.** Measured non-reproducible — the server
  percent-decodes into the path before routing, so the routed rule already matched
  (`CapabilityRouteTelemetryTests.cs:126-128`). It never named a live defect.
- Live at the world: `3579bbbc:Helpers/CapabilityRouteTelemetryInitializer.cs:151-158` has no unrouted
  branch and its "did it change?" test is the fail-open the flag names.

## The 47, one line each

| flag | verdict | remedy date vs ruling | where the remedy is |
|---|---|---|---|
| F-ACCEPTANCE-IS-THE-CHOKE | still-true | n/a | owner only; 0 lanes accepted |
| F-AZURE-FUNCKEY | still-true | n/a | key still committed x2 at the world |
| F-FIXTURE-BEHIND-BACKEND | still-true | none | no divergence check anywhere |
| F-GR-DISPATCH-UNATTRIBUTED | still-true | none | no branch |
| F-GR-NEWSLETTER-CROSS | still-true | 08-01 predates | lane/growth-newsletter-wire (merge clause unmet) |
| F-INVOICE-RETRY-ANONYMOUS | still-true (duplicate) | none | subsumed by F-INVOICE-ROUTES-ANONYMOUS |
| F-INVOICE-ROUTES-ANONYMOUS | still-true | none | file untouched since 2025-12-03 |
| F-MEALS-NO-SQL-ON-REQUOTE | still-true | n/a | 4 SQL runs exist, none re-quote-bearing |
| F-MRG-STATEMENT-UNATTRIBUTED | still-true | none | no branch |
| F-POS-TENDER-WIRE-REINTRODUCES-TWO | still-true | n/a | lane unrebased |
| F-PROD-CORS-WILDCARD | still-true | n/a | measured live on api.okam.no |
| F-WF-BLIND-BIND | still-true | none | no branch |
| F-WF-NOCORRECTION | still-true | none | no branch |
| F-WF-PUSH-SILENT | still-true | 08-01 predates | remedy cannot detect the named case |
| F-EV-NO-GUEST-ORIGIN | already-fixed | ruling 08:52 then config 12:59 | OR clause satisfied AT the world |
| F-FIXTURE-NO-GATES | already-fixed | **08-01 predates by 2 days** | at the world |
| F-GR-FALSE-EVIDENCE | already-fixed | **08-01 predates by 2 days** | at the world |
| F-JOURNEY-GUARD-DECORATIVE | already-fixed | **08-02 predates** | at the world |
| F-UTLKVIT-SALE-ROW | already-fixed pending merge | **08-02 predates** | lane/utlkvit-sale-row |
| F-WF-NO-INVITE | already-fixed | **landed 08-03 10:41, ruled same day** | at the world |
| F-ACCT-DUP | partly-true | 08-03 | lane/acct-uidx + stack; probe reads a foreign tree |
| F-AI-REQUEST-BODY | partly-true | same day | lane/ai-middleware-delete |
| F-ARTIFACT-STORE-OVERWRITES | partly-true | 08-02 predates | clause (a) at world, (b) 1 of 22 artifacts |
| F-CONFIRM-BRUTEFORCE | partly-true | **08-02 predates** | integration/confirm-family |
| F-CONFIRM-MERGE-RECEIPT-TRAP | partly-true | 08-03 | trap CLOSED, merge clause open |
| F-DETACHED-MIGRATIONS | partly-true | 08-03 | title clause now FALSE; tip still unreachable |
| F-EV-ACCEPT-UNGATED | partly-true | same day | lane/ev-accept-gate |
| F-EV-CALLBACK | partly-true | **07-31 predates by 2 days** | at the world; 2 clauses true by design |
| F-EV-GUESTLINK-FORK | partly-true | 08-03 | hazard averted; evidence misfiled under Horizons |
| F-EV-INQUIRY-UNGATED | partly-true | **08-01 predates by 2 days** | lane/ev-inquiry-gate; framing stale |
| F-FLAGS-FALSE-GUARANTEE | partly-true | **08-01 predates by 2 days** | clause 2 untouched everywhere |
| F-GR-HEALTH-DEAF | partly-true | **08-01 predates by 2 days** | lane/growth-health-honest only |
| F-GR-PROVIDER-ACCOUNT-UNGATED | partly-true | 08-03, AFTER the ruling | gate real, pin does not hold |
| F-GR-UNCONFIRMED-EMAIL | partly-true | **08-02 predates** | merge-order hazard, see above |
| F-MEALS-EIGHTH-READ | partly-true | **08-02 predates** | defect absent at the world |
| F-MEALS-LEVER-INERT | partly-true | same day | neither OR branch met; rewrite clears_when |
| F-MEMCACHE-IN-TRYCATCH | partly-true | **08-02 predates** | integration/confirm-family |
| F-MIG-CHAIN-STACKED | partly-true | 08-03 | OR-escape SATISFIED; branch count wrong a 5th time |
| F-PERSONALLISTE-PRINT | partly-true | **08-01 predates by 2 days** | ruling names a fix that is not the one built |
| F-POS-CLOCK-NO-CLIENT | partly-true | **08-01 predates** | client real, artifact untracked + fixture |
| F-PROBE-ROOT-WRONG-WORLD | partly-true | n/a | mechanism clause SATISFIED |
| F-ROLLBACK-LEAVES-TRACKED-STATE | partly-true | same day | defect absent at the world |
| F-UTLKVIT-PREDICATE-COLLISION | partly-true | **08-02 predates** | closure note describes no checkoutable tree |
| F-VIPPS-REDACT-OPEN | partly-true | same day | one named clause FALSE |
| F-WF-CLOCK-UNLINKED | partly-true | **08-01 predates by 2 days** | artifact untracked, fixture-backed |
| F-WF-TWO-ADMINS-TWO-ENGAGEMENTS | partly-true | n/a | code done, SQL proof never run |
| F-XZ-CREDIT-UNSPEC | partly-true | **08-01 predates by 2 days** | lane/meals-xz-credit, buried |

**Tally: 6 already-fixed, 14 still-true, 27 partly-true. 21 of 47 have a remedy dated BEFORE the ruling
written for them.**

## Follow-up work this lane proposes (analysis output, not dispatched)

1. **Rewrite two `clears_when` texts that cannot be satisfied as written**: F-MEALS-LEVER-INERT (neither
   branch of its OR matches the corrected finding) and F-VIPPS-REDACT-OPEN (drop the encoded-route
   clause, which was measured non-reproducible; keep the unrouted clause, widened to 404+405).
2. **Move F-EV-GUESTLINK-FORK's closure evidence out of `## Horizons` and under the flag**, and find out
   why `plan return` deposited three notes past the end of the Flags section.
3. **Record the merge order `integration/confirm-family` BEFORE `lane/growth-audit-ledger`** as a
   blocking constraint; the reverse order makes F-GR-UNCONFIRMED-EMAIL true at the tip for the first time.
4. **Record that F-ACCT-DUP cannot clear until the migration stack lands**, and either repoint the
   `acct.uidx` probe at a ref or fix the probe root (F-PROBE-ROOT-WRONG-WORLD clause one).
5. **Re-rule F-PERSONALLISTE-PRINT**: `adopt-scoped-css` does not describe the fix that exists on
   `lane/print-host`, which kept the body class and moved it into vue-meta's channel.
6. **Give F-GR-PROVIDER-ACCOUNT-UNGATED a behavioural pin**: no test calls the upsert with an absent or
   foreign store, and the source scan that notices gate removal is defeated by deleting two lines.
7. **Settle the `IEventsModuleGate` pattern before merging** `lane/ev-accept-gate` (optional ctor param)
   and `lane/ev-inquiry-gate` (required, `?? throw`).
8. **Close F-INVOICE-RETRY-ANONYMOUS as a duplicate** of F-INVOICE-ROUTES-ANONYMOUS.
9. **Retire F-MEALS-EIGHTH-READ and F-ROLLBACK-LEAVES-TRACKED-STATE from the count of blockers against
   the declared world** — both describe defects introduced and fixed inside unmerged feature work.

## What this lane did NOT do, stated plainly

**Step one is complete for all 47. Step two was not independently executed.**

Six flags look satisfied at the declared world and therefore earned step two:
F-GR-FALSE-EVIDENCE, F-FIXTURE-NO-GATES, F-JOURNEY-GUARD-DECORATIVE, F-WF-NO-INVITE,
F-EV-NO-GUEST-ORIGIN, F-EV-CALLBACK. For three of them a mutation already exists and is cited rather
than re-run:
- F-EV-CALLBACK: the callback lane ran it both ways (remove the provider consultation, 8 red; capture
  unconditionally, 2 red).
- F-GR-FALSE-EVIDENCE: swallowing the throw reds exactly the two throwing arms; dropping the outcome
  check reds four.
- F-JOURNEY-GUARD-DECORATIVE: `test/e2e/scripts/guard-proof.js` is a **re-runnable** mutation harness,
  which is stronger than a one-off — it spawns real Playwright children and requires the mutant to come
  back green.

For the remaining three (F-FIXTURE-NO-GATES, F-WF-NO-INVITE, F-EV-NO-GUEST-ORIGIN) a mutation means
driving browser journeys against a server. This lane declined to start one: the backend checkout is on
`lane/meals-grace-pins` with a live WebApi process it was told not to disturb, and five foreign
containers are up. **Those three are already-fixed on step-one evidence only.** A follow-up lane with a
world of its own should mutate them.

**One negative step-two result was obtained without running anything**, by reading what the pin
actually tests: **F-GR-PROVIDER-ACCOUNT-UNGATED's pin does not discriminate.** No test calls
`UpsertProviderAccount` with an absent or foreign store, and the source scan that notices gate removal
(`ModuleGateOrderingTests.cs:144`) goes green again if you delete the gate line and the actor line
together. That is a vacuous green, found by reading rather than by running.

Nothing was edited outside this directory and `docs/plan/returns/L-BLOCKER-RESTATE-1.md`. No container
was started, no migration authored, no branch checked out, nothing pushed.

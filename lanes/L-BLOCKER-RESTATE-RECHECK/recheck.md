# L-BLOCKER-RESTATE-RECHECK — every sustained verdict re-derived at the ref its document names

Read-only. Nothing outside this directory and this lane's RETURN was written. No branch checked out, no
container started, no flag cleared, no correction applied.

## The three outcomes, as the brief defines them

| outcome | meaning |
|---|---|
| **holds** | reproduces at the ref the document names AND at the current tip |
| **stale** | was true at its own ref, and has been overtaken since |
| **false** | was NOT true at its own ref — the only class that is an error |

## World, re-measured (not inherited from the document)

| thing | the document (2026-08-03) | measured now (2026-08-04/05) |
|---|---|---|
| backend declared ref | `feature/restaurant-modules` @ **3579bbbc**, 2026-08-02 10:44 | resolves; still the ref every verdict is measured at |
| backend branch tip **today** | "has not moved since 2026-08-02" | **8e2b57de, 2026-08-04 12:00 — 59 commits later** |
| frontend declared ref | `31fc45d` | resolves; ancestor of HEAD `e34977ac`, 13 commits behind |
| migrations at the ref / on the stack | 255 / 273 | **255 / 273 — unchanged** |
| branches total / unmerged | 259 / 162 | **331 / 197** |
| backend checkout the probes read | `lane/meals-grace-pins`, 4 behind 1 ahead | `lane/meals-grace-pins`, **63 behind, 1 ahead** |
| lanes built-unverified / verified / accepted | 123 / 15 / 0 | **226 / 58 / 0** |

**The document's single largest stated fact — "`feature/restaurant-modules` has not moved since
2026-08-02" — is the one thing about it that expired.** Fifteen lanes it measured as unmerged have since
landed. That is why *stale* is the dominant outcome below and *false* is rare: most of these verdicts were
right when written and were overtaken by the merges the document itself was arguing for.

## Instrument validation, run before any verdict was recorded

Fed one verdict expected to hold and one expected to fail; the instrument separated them.

- **Expected hold — F-INVOICE-ROUTES-ANONYMOUS.** At `3579bbbc:Controllers/InvoicesController.cs`: no
  class-level `[Authorize]`; authorized at `:84 :101 :133 :152 :172 :188`; anonymous by omission at
  `:34 :51 :68 :117 :204/:205` — **exactly the five the document named.** Reproduced verbatim.
- **Expected fail — F-MEALS-LEVER-INERT `:423-424`.** The document's own command returns zero; corrected
  and widened it returns 10 commits across 8 production files. Separated, and diagnosed below.

### A third instrument defect, found by tripping it mid-lane and worth more than either verdict

This shell is **zsh 5.9**, and zsh applies history modifiers to a bare `$VAR:path` argument:

```
T=8e2b57de
echo "$T:WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs"   ->  8e2b57deryPinTests.cs
echo "${T}:WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs" ->  8e2b57de:WebApi.Tests/Wire/...  (correct)
```

Git then reports the mangled path as absent. **This lane published no verdict on it, but it did produce
one false absence internally** — `RequestBodyTelemetryPinTests.cs` was read as missing at the tip when it
is present, 396 lines. Every negative produced under the bare form was re-run with a literal ref before
being recorded. It is the same family as the bare pathspec: *a command whose shape manufactures a free
zero, invisibly, while the sentence beside it claims something broader.* Any lane proving an absence in
this estate with `$REF:path` interpolation has an unreliable instrument. Use `${REF}:path` or a literal.

---

## Tally — 41 sustained verdicts, all 41 re-derived

| outcome | count | share |
|---|---|---|
| **holds** | **26** | 63% |
| **stale** | **13** | 32% |
| **false** | **2** | **5%** |

The document sustained 41 of its 47 verdicts (14 still-true + 27 partly-true); the other 6 it recorded as
already-fixed. **Two are errors.** The brief's premise — that this lane's error rate was the question — is
answered: it is 2 in 41, and one of the two verdicts named to this lane as confirmed-false turns out to be
stale rather than false (below). The middle case is indeed the common one, and the reason is structural:
the backend branch moved 59 commits after the document was written, so most of what it sustained was
overtaken by the very merges it was arguing for.

## FALSE — verdicts that were not true at their own ref (2)

Both were re-derived here independently rather than taken from the other lanes' reports.

### F-MEALS-LEVER-INERT `verdicts.md:423-424` — **false**

The sentence: *"No consumer reach on any branch (`git log --all -G"IMealsStoreFeatureFlags" -- MealsQuoteService.cs CartService.cs` = zero commits)."*

Re-derived at the document's own declared ref `3579bbbc`:

- `3579bbbc:Program.cs:788` — `services.AddScoped<...Meals.Interfaces.IMealsStoreFeatureFlags, ...Meals.StoreBackedMealsFeatureFlags>();` The interface is **DI-registered at the declared world.**
- Constructor-consumed at the declared world by **three** services: `Services/Meals/MealsAgreementService.cs`,
  `Services/Meals/MealsCompanyService.cs`, `Services/Meals/MealsReconciliationService.cs`.
- Unrestricted across all branches, excluding `lanes/`: **10 commits across 8 production files**
  (`Program.cs`, `Services/Meals/Interfaces/IMealsStoreFeatureFlags.cs`, `MealsAgreementService.cs`,
  `MealsCompanyService.cs`, `MealsModuleFlagEffectiveResolver.cs`, `MealsReconciliationService.cs`,
  `StoreBackedMealsFeatureFlags.cs`, `Services/Workforce/Interfaces/IWorkforceModuleGate.cs`).

**Where the defect actually is.** The bare pathspec makes the zero free, but it is not what makes the
verdict false: corrected to full paths the narrow search *still* returns zero, because the interface
genuinely never reached the quote/cart path. **The search was restricted to two files and the sentence was
written about every branch.** The narrow fact is true; the sentence is false. That gap is invisible unless
the command is read beside the claim.

*Correction, not applied:* the finding is "the Meals flag has no reach **on the quote/cart money path**",
not "no consumer reach on any branch". The rest of the verdict — `meals.module` catalogued rather than
withheld at `3579bbbc:Services/Meals/MealsFeatureFlags.cs:30`, `Withheld` holding only
Ordering/Projection/Statements — reproduces, at the ref and at the tip.

### F-ARTIFACT-STORE-OVERWRITES clause (b) — **false**

The sentence: *"Re-counted directly: **22 artifacts, 1 identified, 5 `backendBuild: null`, 16 with no such
field. 3 are live and only 1 of those 3 is identified**."*

Re-derived at the document's own declared ref `31fc45d`:

- `artifacts/journeys/*.playwright.json` **tracked at 31fc45d: 3** — all `"backend": "fixture"`, **zero
  identified**, one `backendBuild: null`, two with no such field.
- Widened to every `*.playwright.json` tracked anywhere in the tree at 31fc45d: **12** — 0 identified,
  2 null, 10 absent, 8 live.
- **No tracked set at any ref yields 22 / 1 / 5 / 16 / 3-live.** The named exemplar
  `workforce-flag-lever.playwright.json → wt-lwr-api@3579bbbc…` — the one artifact the verdict praises for
  naming the declared-world tip exactly — **is not tracked at any ref.** It exists only as a working-tree
  file.

**Where the defect is.** The census is a count of the **working tree**, including untracked files,
presented as a measurement of the declared world. It is the same scope error as F-MEALS-LEVER-INERT with
the scope widened instead of narrowed. The verdict's own framing — "the mechanism works; the data is two
live re-runs away" — rests on a data count that does not describe any ref.

Also false at its own ref: *"12 named cases in `test/journey-artifact-store.test.js`"* — there are **18**
at `31fc45d`, and 18 at `533aea4`, the commit the verdict names, so the number is wrong at every ref it
could have meant. Clause (a) itself **holds**: the ranking block is at `:40-56` at 31fc45d exactly as
cited, with `:63` and `:122` verbatim.

---

## The verdict this recheck was told was false, and is not — F-FIXTURE-BEHIND-BACKEND — **stale**

This is the finding that changes the answer to the question the lane was set.

The sentence at `verdicts.md:197-200`: *"No divergence check exists on any branch. `package.json` has six
e2e scripts, none of them a parity or divergence run."*

Re-derived **at the ref the document names, `31fc45d`**:

- `test/e2e/scripts/fixture-divergence.js` is **NOT tracked at 31fc45d.** The directory holds exactly six
  files, none of them a divergence check.
- `package.json` at 31fc45d declares **exactly six** e2e scripts — `test:e2e`, `:consumer`, `:headed`,
  `:ui`, `:install`, `:guard-proof`. **None** is a parity or divergence run.
- The divergence check is introduced by **`a62160e`, 2026-08-03 18:16:23**. Nothing on any branch predates
  it. The verdicts document's own mtime is **17:55** — the check landed **21 minutes after it was written.**

**Every clause reproduces at its own ref. The verdict was true when written.** At the tip `e34977ac` the
file is tracked and two of nine e2e scripts invoke it — which is what makes it *stale*, and stale is not an
error. The corrected reading (tracked file, nine scripts, two runners) is a measurement of the **tip**, and
the verdict is a measurement of `31fc45d`. They are not in conflict; they are eleven commits apart.

This is the brief's own rule applied to the brief: *a verdict measured at the wrong ref is not a false
verdict; it is an unread one.* **Of the two verdicts handed to this lane as confirmed-false, one is false
and one is stale.** The lane's error rate is half what it was reported to be.

---

## STALE — true at the ref, overtaken since (13)

`F-FIXTURE-BEHIND-BACKEND` is the thirteenth, documented in full above. The other twelve are backend; each
was verified to reproduce at `3579bbbc` first, then measured at `8e2b57de`.

| flag | at `3579bbbc` (reproduces) | at the tip `8e2b57de` |
|---|---|---|
| **F-INVOICE-ROUTES-ANONYMOUS** | no class-level `[Authorize]`; 5 anonymous actions | `:16 [Authorize]` class-level; **every** action authorized (`21510917`) |
| **F-INVOICE-RETRY-ANONYMOUS** | `:117 [HttpPost("RetrySendingExistingInvoices")]` bare | `:132 [Authorize(Roles = PowerUserRole)]` |
| **F-GR-DISPATCH-UNATTRIBUTED** | `DispatchAsync(int storeId, long newsletterId, CancellationToken)` — no actor | `:71 DispatchAsync(int storeId, long newsletterId, string userId, ...)`; audit ledger row `growth.newsletter.dispatch_requested` |
| **F-GR-UNCONFIRMED-EMAIL** | `RequireOwnAccountAddress` = **zero hits**; controller passes no user id | `GrowthNewsletterService.cs:558 RequireOwnAccountAddressAsync`, `:570 \|\| !account.EmailConfirmed` |
| **F-CONFIRM-BRUTEFORCE** | `UserService.cs:116 new Random().Next(100000, 999999)`; confirm entry unlimited | `UserController.cs:48 TryConsumeConfirm(...)`; `NumericConfirmationCode.cs:33 RandomNumberGenerator.GetInt32` |
| **F-MEMCACHE-IN-TRYCATCH** | one registration, `ServiceCollectionExtensions.cs:58`, inside the `try` | `Program.cs:1034 services.AddMemoryCache()` unconditional, with the comment naming the try/catch |
| **F-AI-REQUEST-BODY** | `ApplicationInsightsLoggingMiddleware.cs:73` adds the body to telemetry | middleware **deleted**; the 396-line `WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs` **is present** |
| **F-WF-PUSH-SILENT** | on its own named ref `lane/wf-push-notify` f5305ced: `SendConsumerNotificationOrThrowAsync` sends to `"userId:"+userId` with no registration check | `NotificationService.cs:124 HasConsumerPushRegistrationAsync`, **called** at `WorkforcePushNotificationDelivery.cs:98` — the named case is now detectable |
| **F-POS-TENDER-WIRE-REINTRODUCES-TWO** | on its named ref `lane/meals-pos-tender-wire` 32fd5a86: `var isCreditSale = payments != null && payments.Any(p => p.PaymentType.IsCompanyAccount());` | `FinalizeService.cs:237/:304` call the shared `KassaCreditSale.IsCreditSale` |
| **F-UTLKVIT-PREDICATE-COLLISION** | exactly ONE predicate, the original **private** `SaftCashRegisterExportService.MasterData.cs:195`, two call sites | `Services/Kassa/KassaCreditSale.cs:23`, **exactly six** call sites — the body's disputed "one predicate, six references" is now true at a ref a reader can check out |
| **F-UTLKVIT-SALE-ROW** | `git grep UTLEVREC 3579bbbc` empty | `Enums/Kassa/KassaEventType.cs:18 UTLEVREC` live |
| **F-EV-ACCEPT-UNGATED** | `IEventsModuleGate` absent from `EventsProposalService.cs` | gate at `:64`; `IEventsModuleGate` DI-registered `Program.cs:1094` |
| **F-AZURE-FUNCKEY** *(consolidation clause only)* | key in **two** files: `InvoiceService.cs:1250`, `ReceiptService.cs:144` | key in **one**: `OkamFunctionsDocumentRenderer.cs:28` — "rotation is a two-site change" is overtaken |

**F-AZURE-FUNCKEY's core clause is not stale.** `clears_when`'s "never in a committed file" is still
measurably false: the live key is committed at the tip. Only the two-site arithmetic expired. Rotation
remains the owner's, and is now genuinely the one-line change the body claimed.

**The merge-order hazard the document flagged did not fire.** It warned that landing
`lane/growth-audit-ledger` before `integration/confirm-family` would make F-GR-UNCONFIRMED-EMAIL true at
the tip for the first time. Both clauses hold at the tip; the order was safe.

---

## HOLDS — frontend (3), re-derived at `31fc45d` and at `e34977ac`

Nothing moved for any of these in 13 commits.

- **F-POS-CLOCK-NO-CLIENT** — all four cites exact on `lane/fe-wf-oplink`: `pos-clock-client.js:63` POSTs
  `/workforce/pos/clock-events`; `ClockScreen.vue:37 @click="punch(EV_IN)"`; `PosShell.vue:167` imports
  the service; `ClockScreen.vue:186-187` "there is no read for it". Remedy `7c3a1e1` 2026-08-01 12:55
  confirmed to the minute. The lane is **not an ancestor of either ref**, and `PosShell.vue` — the one file
  tracked at both — carries no `pos-clock` import at either. The verdict's own self-criticism (that it is
  narrower than its correction says) is itself correct.
- **F-WF-CLOCK-UNLINKED** — the `lanes/`-is-tracked trap was checked and **does not fire here**: `lanes/`
  is partly tracked at both refs (60 paths at 31fc45d, 125 at e34977ac), but `lanes/L-WF-OPLINK` is in
  neither. `git ls-tree -r <ref> -- lanes/L-WF-OPLINK` returns 0 paths at both. The artifact exists only in
  the working tree, and line 14 reads `"backend": "fixture"` verbatim.
- **F-PERSONALLISTE-PRINT** — all four clauses hold. `lane/print-host` @ `6e6acd0` 2026-08-01 15:13 carries
  **5** PDFs; **0** PDFs are tracked at 31fc45d or at e34977ac; the inert
  `workforce-personnel-list.vue:175 document.body.classList.add('wfpl-print-host')` is byte-identical at
  both refs; and `lane/print-host:372` does keep the body class ("UNSCOPED, and every rule is guarded by
  the `wfpl-print-host` class"), so the ruling `adopt-scoped-css` still does not describe the built fix.
  The lane did not land.

**F-MEALS-LEVER-INERT's frontend half also holds:** `translations/en.ts:5030 ff_withheld_note` is
byte-identical at both refs, and `lane/meals-reachable-web` (`f65595d`) has not landed. The false copy is
live. Only the "no consumer reach on any branch" sentence is false.

## HOLDS — reproduces at the ref and at the tip (17 backend)

### Money / statutory / security

- **F-PROD-CORS-WILDCARD** — re-measured live against `api.okam.no` at 2026-08-04 23:51 UTC. Byte-identical
  to the document: `HTTP/2 204`, `access-control-allow-origin: *` for `Origin: https://evil.example`.
  Still the hardest evidence in either sweep.
- **F-MRG-STATEMENT-UNATTRIBUTED** — `Entities/Margin/MarginPeriodStatement.cs` carries no actor column at
  `3579bbbc` **or** at the tip; `git log --all -S 'CreatedByUserId' -- 'Entities/Margin/'` returns nothing.
- **F-WF-BLIND-BIND** — `Models/Workforce/WorkforceOperatorImportModels.cs` result contract carries
  `OperatorId, Outcome, StaffMemberId, ConflictingStaffMemberId` and no person-name field, at both refs.
- **F-WF-NOCORRECTION** — `WorkforcePersonnelListProjection.cs:116` and `:132` still pass
  `correctionActor: null, correctedAtUtc: null` at the tip.
- **F-GR-HEALTH-DEAF** — `Models/Growth/GrowthDeliveryHealthModels.cs:27 public double BounceRate`
  (non-nullable) at **both** refs; `GrowthDeliveryHealthService.cs:103 BounceRate = Rate(...)`. Sharper
  than the document put it: **the whole Growth family landed at the tip and left this one out.**
- **F-GR-NEWSLETTER-CROSS** — production guard present at `3579bbbc` (`AuthorizeStoreAsync` at
  `:68 :81 :101 :121 :141 :161 :181`); remedy `87600a1c` is test-only (+439 lines, one file);
  `lane/growth-newsletter-wire` still not an ancestor of the tip. No live hole; the proof is still missing.
- **F-GR-PROVIDER-ACCOUNT-UNGATED** *(clause two)* — the gate landed, but the pin still does not
  discriminate: **every** `UpsertProviderAccount` call in `GrowthProviderAccountAdminTests.cs` passes
  `GrowthWorld.StoreId`; the only foreign/absent-store concealment case (`:124
  Pausing_conceals_a_foreign_or_absent_store_as_404`) exercises **SetProviderPaused**. The document's one
  negative step-two result survives the merge.
- **F-VIPPS-REDACT-OPEN** — no unrouted branch at `3579bbbc` **or** at the tip; `lane/vipps-redact-404`
  (`routed = routeValues.Count > 0`, fail-closed on the output via `Survives`) still unmerged. *Not
  re-derived:* the "encoded route value" clause the document measured non-reproducible — that needs a
  running server, which this lane did not start.

### Process / chain / evidence

- **F-ACCEPTANCE-IS-THE-CHOKE** — **accepted is still exactly ZERO**, against 226 built-unverified and 58
  verified. The document's sharpening (the choke moved from the walk to the transition after it) is
  confirmed and has widened: verified went 15 → 58, accepted 0 → 0.
- **F-MIG-CHAIN-STACKED** — all six named lanes still `onStack=YES onBranch=NO`; `lane/margin-waste` is
  still an ancestor of `lane/wf-w5-timesheet`; depth unchanged at **255 / 273**. The branch figure the flag
  keeps getting wrong is now wrong by more: body says 152/249, measured **197/331**.
- **F-DETACHED-MIGRATIONS** — the chain tip `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` is still
  on the stack only. **New and worse:** at `3579bbbc` the world *was* an ancestor of
  `integration/mig-stack-land`; at the tip it is **no longer** — the world and the stack have diverged, so
  landing the stack is now a merge, not a fast-forward. `lane/train-w3-schema` still does not exist —
  fifth confirmation.
- **F-ACCT-DUP** — `Migrations/*AccountingSummaryDayUniqueIndex*` is at neither `3579bbbc`, nor the tip,
  nor the working tree; it lives on `integration/mig-stack-land` + 4 lane branches. Still gated on the
  migration stack, and nothing records it.
- **F-PROBE-ROOT-WRONG-WORLD** — the backend checkout is still `lane/meals-grace-pins`, now **63 behind**
  rather than 4. The defect grew sixteenfold while the flag sat half-ruled.
- **F-CONFIRM-MERGE-RECEIPT-TRAP** — both base receipts still under distinct names on
  `integration/confirm-family`; the family is still **10 commits unmerged**. Trap closed, merge clause open.
- **F-MEALS-NO-SQL-ON-REQUOTE** — exactly **four** sql-tier receipts in the whole estate, all 2026-08-01
  (`2eeff48f`, `23f6bbeb`, `1da15fb1`, `50b85657`); `lane/meals-requote-release` is not an ancestor of the
  tip; **zero** sql-tier trx at the tip.
- **F-EV-GUESTLINK-FORK** *(bookkeeping clause)* — the closure evidence is **still** filed under
  `## Horizons` (plan.md:16929/16931/16949) while the flag body sits at plan.md:14970. The gap widened from
  ~190 lines to **~1,960**. The orphaned `wait-for-layout` ruling is still there too.
- **F-FLAGS-FALSE-GUARANTEE** — clause one: `git grep FlagEffectiveResolver -- Program.cs` returns **one
  line, Workforce only**, at `3579bbbc` (`:779`) **and** at the tip (`:783`);
  `StoreBackedMealsFeatureFlags.cs:43 return _configGate.IsModuleEnabled;` unchanged at both. Clause two:
  the false sentence is live in exactly three languages (`en.ts:5029`, `de.ts:5035`, `no.ts:5084`) at both
  frontend refs, and `en.ts` is identical at `c1b4619` and `e34977ac`. **The conclusion holds; the citation
  under it does not.** `git log --all -G"ff_effective_note"` returns **3** commits with `lanes/` excluded
  and **5** without, never the "only the commit that introduced it" the verdict claims — and it is wrong
  for the same reason as the other two: **the command carried no pathspec at all** while the sentence
  described a history.

### Defects that exist only inside unmerged feature work — the document's own point, confirmed

- **F-MEALS-EIGHTH-READ** — `WebApi.Tests/Meals/MealsRequoteSupersedeTests.cs` is absent at `3579bbbc`
  **and** at the tip; `HoldUninvolvedAsync` has zero hits at the tip. Neither defect nor fix is at the
  world; counting it against the world still double-counts.
- **F-ROLLBACK-LEAVES-TRACKED-STATE** — `StampRelease` has zero hits at `3579bbbc` **and** at the tip,
  even though `lane/meals-release` landed. Introduced and fixed inside one lane, as recorded.
- **F-EV-INQUIRY-UNGATED** — `lane/ev-inquiry-gate` **8ecb47df, 2026-08-01 20:28** confirmed, 43 hours
  before the ruling that called the decision open. Still unmerged at the tip.
- **F-EV-CALLBACK** — `99f56e63` confirmed an ancestor of `3579bbbc`; `EventsDepositService.cs` consults
  the rail and recovers; `VippsController.cs:110-112` returns `Ok()` off a `Task`-returning sink.
- **F-WF-TWO-ADMINS-TWO-ENGAGEMENTS** — on `lane/wf-bootstrap-one-engagement`, the migration
  (`20260803124302_Workforce_BootstrapFirstEngagement.cs:20`) **and** `ApplicationDbContext.cs:2586` both
  declare `UX_WorkforceStaffMembers_OneFirstEngagementPerStore` — confirmed **not** the F-ACCT-DUP
  model-only shape. Zero hits at the tip; the SQL-tier race class has still never run.
- **F-XZ-CREDIT-UNSPEC** — `lane/meals-xz-credit` @ 25586d86, 2026-08-01 16:00, older than the declared
  world tip itself; `Models/Kassa/XZReportModels.cs:53-54 CreditSalesCount / CreditSalesAmount` confirmed
  verbatim; **zero at the tip.** See the new C6 exposure below.

---

## One thing that got worse while nobody was measuring it — C6, live at the tip now

The document predicted this as a cross-lane risk and it has since **materialised**:

> the doc that claims the credit-sale specification "er skildra der" lives on `lane/utlkvit-sale-row`
> while the fields live on `lane/meals-xz-credit`, and the two lanes are not ancestors of each other.

The utlkvit family landed (`a273e013`). `lane/meals-xz-credit` did not. So at `8e2b57de`:

- `docs/okam-kassa/compliance/RF-1313-systembeskrivelse.md:155` now asserts
  *"Spesifikasjonen av kredittsal i § 2-8-2 andre ledd høyrer til X/Z-rapporten og **er skildra der**."*
- `CreditSalesCount` / `CreditSalesAmount` have **zero hits at the tip** — the X/Z report cannot produce
  the § 2-8-2 second-paragraph specification the systembeskrivelse says it produces.

That is the C6 shape verbatim: a statutory § reference printed where no code path in the same tree produces
the artifact the provision requires. Naming it, not clearing or applying anything. It is the same family as
the RF-1313 finding already on record, arrived at from the opposite direction.

Second, smaller: `EventsProposalService.cs:39` landed the **optional** gate ctor param
(`IEventsModuleGate gate = null`) with a `_gate != null &&` guard at `:64`. It resolves today only because
`Program.cs:1094` registers the gate; remove that registration and the guard passes silently rather than
failing closed. The pattern collision the document warned about did not happen — only one of the two lanes
landed — but the weaker of the two patterns is the one that landed.

---

## Ranking — what each verdict is holding up

The brief asks which verdicts are stopping work and which hold only the count. Measured directly:

```
47 flags named in verdicts.md  ->  47 of 47 appear in at least one `needs:` line in docs/plan/plan.md
                                    (comm -23 of the two sorted sets is empty)
```

**There is no flag in this set holding only the count.** Every one is wired into the dependency graph.
The densest are `F-MIG-CHAIN-STACKED` (3 `needs:` lines) and the two `needs:` lines that carry the
sustained blockers in bulk: `plan.md:363` (Meals — F-UTLKVIT-SALE-ROW, F-XZ-CREDIT-UNSPEC,
F-MEALS-EIGHTH-READ, F-MEALS-LEVER-INERT, F-MEALS-NO-SQL-ON-REQUOTE) and `plan.md:668` (journeys —
F-FIXTURE-NO-GATES, F-FIXTURE-BEHIND-BACKEND, F-JOURNEY-GUARD-DECORATIVE, F-ARTIFACT-STORE-OVERWRITES,
F-ACCEPTANCE-IS-THE-CHOKE, F-PROBE-ROOT-WRONG-WORLD).

That is itself the finding: **both false verdicts sit on those two lines**, so neither was cosmetic —
F-MEALS-LEVER-INERT gates the Meals line and F-ARTIFACT-STORE-OVERWRITES gates the journeys line. So does
the one wrongly reported as false. A wrong verdict in this document is never merely a wrong count.

**Highest-value corrections, ranked by what they unblock:**
1. **The 13 stale verdicts** — each is a blocker being sustained against a world that no longer exists.
   Re-ruling them against `8e2b57de` is one bulk clearing pass, not 13 investigations, and it is the
   largest single reduction available to the blocker count. Two of them —
   F-INVOICE-ROUTES-ANONYMOUS and F-INVOICE-RETRY-ANONYMOUS — are the duplicate pair the document already
   asked to be collapsed, and both are now answered at the tip by one commit.
2. **F-MEALS-LEVER-INERT and F-ARTIFACT-STORE-OVERWRITES clause (b)** — the two false verdicts, both
   gating lanes, both needing the sentence rewritten rather than the flag cleared.
3. **F-FIXTURE-BEHIND-BACKEND** — not a correction to the verdict, which was right; a correction to the
   *report* that called it false. Re-rule it stale, do not record it as an error against the lane.
4. **The new C6 exposure at the tip** — not in the document at all, and it is a statutory claim.

### Two more citation defects, in verdicts that otherwise hold

Neither changes an outcome, both would mislead the next reader:

- **F-JOURNEY-GUARD-DECORATIVE** (recorded already-fixed, so outside the sustained set): substance holds at
  `31fc45d` — `9a5900a` is an ancestor of both refs and `journey.js:592` reads
  `if (wrongWorld) { throw new Error(error); }` verbatim. But its line cites are stale at the tip
  (`:592`→`:704`; `guard-proof.js:276-277`→`:309-311`, now a **triple** not a pair), and its claim
  "`31fc45d` IS HEAD" is 13 commits out of date.
- **F-FIXTURE-NO-GATES** (also already-fixed, outside the sustained set): the 18-flag catalog claim is
  exact at `world.js:230-249` at both refs — 17 `defaultEnabled: false`, one true (`workforce.setup`).
  But **"11 of 19 journeys flip a switch" is false at its own ref**: there are **25** journey specs at
  31fc45d, 9 using `turnOn` and 10 using any flag helper. And its `api-server.js` cites are stale — at the
  tip `flags: {}` no longer exists (`:105 world.seededFlagOverrides()`) and the PUT writer moved
  `:959`→`:854`.

---

## What this lane did NOT reach, stated plainly

- **41 of 47 verdicts are sustained** (14 still-true + 27 partly-true); the other 6 the document itself
  recorded as already-fixed. **All 41 were re-derived — nothing in the sustained set was skipped.** The 6
  already-fixed were not the assignment; four were spot-checked in passing anyway (F-GR-FALSE-EVIDENCE:
  `6b4913b8` confirmed an ancestor of `3579bbbc`, `GrowthPrivacyDeliveryEvidenceTests.cs:52/:85` present;
  F-EV-NO-GUEST-ORIGIN: the configuration half landed at `9888178f` — `EventsSettings.cs` +
  `appsettings.json` + a 110-line wire test; F-JOURNEY-GUARD-DECORATIVE and F-FIXTURE-NO-GATES: see the
  citation defects above. **F-WF-NO-INVITE was not re-derived** — it is the sixth already-fixed one and
  the only member of the 47 this lane did not touch at all.)
- **F-VIPPS-REDACT-OPEN's "encoded route value" clause was not re-run.** The document measured it
  non-reproducible; confirming that needs a running server and this lane started nothing.
- **No step-two mutation was run** for any verdict, for the same reason the original lane gave.
- The tip figures here are `8e2b57de` (2026-08-04 12:00). Four lanes were running while this was measured;
  the tip may have moved again.

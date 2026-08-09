# Instrumentless exits

Per-lane rulings on the ninety-one built-unverified lanes whose exit named no instrument. Each batch
appends its own section; nothing above a heading is rewritten.

## Batch 6

Eleven lanes read one at a time — exit, RETURN, and the evidence that RETURN names. **5 amended, 6 declined.**
Only `exit:` lines inside `## Lanes` were touched; no lane body, no `state:` line, no `evidence:` line, no
decision, no flag. Backend trunk `6d5328004`, unmoved. Nothing built, no tier run, nothing pushed.

The decisive question was never "is there a file" — it was **whether the file the RETURN named establishes the
sentence the exit demands**. Five did. Six named something weaker, something adjacent, or nothing openable.

### Amended — 5, and `plan verify` accepted all 5

| lane | path appended | why the evidence establishes the exit |
|---|---|---|
| `L-WF-PUSH-SILENT` | `../OkamAPI-modules/WebApi.Tests/Workforce/WorkforceNotificationTransportTests.cs` | the evidence line named this file, and it is **on the trunk**, carrying both halves as named tests: `A_push_to_a_worker_with_no_registration_is_recorded_failed_not_sent` (a `[Theory]` whose two arms differ in one variable — registered → `Sent`/0 attempts, unregistered → `Failed`/`"NoPushRegistration"`/1 attempt) and `The_backlog_a_missing_push_credential_held_drains_when_the_credential_lands`. No `Database` trait anywhere in the file, so it is fast-tier as the exit requires. |
| `L-UTLKVIT-REPLAY-SOURCE` | `../OkamAPI-modules/WebApi.Tests/Kassa/DeliveryReceiptComplianceTests.cs` | the RETURN named "two pins in `DeliveryReceiptComplianceTests`"; both are on the trunk — `ReplayingACreditSaleWithADriftedPaymentList_StillHandsOverTheUtleveringskvittering` and its mirror `ReplayingACashSaleWithADriftedPaymentList_StillHandsOverTheSalesReceipt_AndJournalsNoDeliveryDocument`. Each replays with a drifted list and asserts the document the **appended entry** supports, including a `NotEqual` against the wrong kind. That is the exit's sentence, both directions. |
| `L-WF-DIGEST-TAUTOLOGY` | `lanes/L-WF-DIGEST-TAUTOLOGY/evidence.md` | the exit is two-part and the evidence records both: the replacement is `Assert.Equal(sent.PayloadSha256, Sha256Hex(file.FileContents))` — served bytes against the recorded digest — and the four-state table shows state 3 (fixed + one `0x20` appended to what `DownloadBatchAsync` serves) **RED at line 893** with the two diverging 64-hex digests printed. It carries the control that makes state 2's green meaningful (the real check elsewhere reddened on the same mutated binary), so "reds if they diverge" is measured rather than asserted. Tracked in the plan repo. |
| `L-CONFIRM-SERVER-HALVES` | `../OkamAPI-modules/lanes/L-CONFIRM-SERVER-HALVES/evidence.md` | the exit demands two halves "each pinned" and the file names a pin per half with its red-at-base reason: `A_send_the_mail_server_refuses_is_reported_to_the_caller` (`Assert.False` got `True`) and `A_malformed_address_is_refused_before_the_account_is_written_or_any_mail_leaves` (`MimeKit.ParseException`, not `AppException`), plus the two wire pins (500→400, `true`→`false`) and a four-mutation table where each mutation reds exactly its own pins. Tracked at the backend trunk. |
| `L-AN-INVOICE-LISTS-EACH-ORDER-ONCE` | `../OkamAPI-modules/lanes/L-AN-INVOICE-LISTS-EACH-ORDER-ONCE/evidence.md` | the exit's first half is the existing pin going green **because the code changed**: the file records `Failed 1, Passed 6, Total 7` at `b368d930e` and `Failed 0, Passed 9, Total 9` after, with the pin's assertion and fixture untouched and diffable to zero, plus a four-mutation sweep in which every run executed the baseline count of 9 and every run's `WebApi.dll` mtime moved. The second half — the tier "green apart from pins named in the return" — is in `backend-tier.txt` **beside it in the same tracked directory** (4958 passed / 1 failed / 10 skipped, the one failure `GiftcardBalanceTests.Passing_a_gift_card_on...`, shown pre-existing by reverting to the base and re-running, and named in the RETURN). |

**Verbatim, in the order run:**

```
$ plan verify L-WF-PUSH-SILENT --evidence ../OkamAPI-modules/WebApi.Tests/Workforce/WorkforceNotificationTransportTests.cs
L-WF-PUSH-SILENT built-unverified -> verified
EXIT=0

$ plan verify L-UTLKVIT-REPLAY-SOURCE --evidence ../OkamAPI-modules/WebApi.Tests/Kassa/DeliveryReceiptComplianceTests.cs
L-UTLKVIT-REPLAY-SOURCE built-unverified -> verified
EXIT=0

$ plan verify L-WF-DIGEST-TAUTOLOGY --evidence lanes/L-WF-DIGEST-TAUTOLOGY/evidence.md
L-WF-DIGEST-TAUTOLOGY built-unverified -> verified
EXIT=0

$ plan verify L-CONFIRM-SERVER-HALVES --evidence ../OkamAPI-modules/lanes/L-CONFIRM-SERVER-HALVES/evidence.md
L-CONFIRM-SERVER-HALVES built-unverified -> verified
EXIT=0

$ plan verify L-AN-INVOICE-LISTS-EACH-ORDER-ONCE --evidence ../OkamAPI-modules/lanes/L-AN-INVOICE-LISTS-EACH-ORDER-ONCE
plan: evidence inadmissible — ../OkamAPI-modules/lanes/L-AN-INVOICE-LISTS-EACH-ORDER-ONCE is a directory — a directory records no run and cannot be read; name the artifact inside it that does
EXIT=6

$ plan verify L-AN-INVOICE-LISTS-EACH-ORDER-ONCE --evidence ../OkamAPI-modules/lanes/L-AN-INVOICE-LISTS-EACH-ORDER-ONCE/evidence.md
L-AN-INVOICE-LISTS-EACH-ORDER-ONCE built-unverified -> verified
EXIT=0
```

**The refusal is worth carrying to the other batches: `plan verify` rejects a directory.** The invoice lane's
own `evidence:` line is `docs/plan/lanes/L-AN-INVOICE-LISTS-EACH-ORDER-ONCE` — a directory, and at a prefix
that does not resolve either. Any sibling amending an exit with a lane directory will take exit 6; name the
artifact inside it.

### Declined — 6, which is the number that matters

| lane | what the exit demands | what the named evidence actually proves |
|---|---|---|
| `L-MEALS-LEVER-WITHHOLD` | the Meals catalog entry is **withheld with a written reason**, pinned by a test that reds if it is re-advertised | **the opposite, deliberately.** `lanes/L-MEALS-LEVER-WITHHOLD/retitle-and-pin.md` opens with "The withholding is NOT applied: it reds 8 of 28 arms". The ruling moved to `retitle-and-pin` on 2026-08-05 and the lane body says so in the plan itself — *"The exit below asks for the opposite of what was ruled. Do not satisfy it."* The pin that exists holds a **title against its route-gate reach**, not a withholding. Amending here would be the exact failure this plan exists to prevent; the exit needs re-ruling, not a path. |
| `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK` | `MealsXZCreditSaleTests` present on `feature/restaurant-modules` and green with its count from a trx, tier green **at the composed tip** — *or* the branch recorded unlandable with the reason | **neither disjunct.** `git ls-tree -r HEAD` at `6d5328004` finds no `MealsXZCreditSale` anywhere, and nothing was ever composed (the RETURN says "Trunk untouched at `d30c1c4d4`, nothing merged"). The named file, `lanes/.../asserting-tests.txt`, lists **34 other** trunk tests (`EscPosXZCreditSaleTests`, `EscPosPaymentLabelTests`, `EscPosXZReportBuilderTests`, `CompanyAccountClassificationTests`) — a true and useful fact about the *capability*, and an adjacent one. The unlandability reason exists only as prose in the RETURN. The file is also **untracked** in the plan repo (`git ls-files --error-unmatch` → "did not match any file(s) known to git"). |
| `L-MIG-COMPANY-RECEIVABLE` | the account exists alongside its two siblings, **created by a migration on the chain tip** *and* **read by the export** | **one half, in each candidate file.** The named artifact, `Migrations/20260803090036_Meals_CompanyReceivableAccount.cs`, proves the column and its migration and says nothing about the export; the export half lives in `Services/Tripletex/TripletexPosService.cs:302` and `WebApi.Tests/Kassa/Cov_TripletexPosExportTests.cs`, which the evidence line does not name. No single path carries the sentence. The migration half is additionally attested rather than demonstrated — the RETURN states plainly "the migration is applied to NO database, so replay-from-empty and the up/down round trip are unmeasured", which is the C2 shape the estate has already been bitten by twice. |
| `L-WF-IDEMPOTENCY-REFUSAL-REST` | three sites record `Refused`, **pinned by a test per site that reds if the recording is removed**, and the SQL-tier race test asserts the `Refused` row | **the red-proof has no artifact.** The three `RefuseAsync` calls are on the trunk (`WorkforceInvitationService.cs:179,528`, `WorkforceOperatorImportService.cs:246`) and `WorkforceD1RaceSqlServerTests.cs` does assert `Assert.Equal("Refused", Assert.Single(completions).OutcomeState)` at both sites — so the **last** clause is openable. The "reds if the recording is removed" clause exists only as a sentence in the RETURN; no per-site pin is named, no mutation log was written, and the evidence line names a worktree and a SHA and nothing else. Naming the SQL file would close a four-clause exit on its fourth clause. |
| `L-GR-APPROVAL-STATE` | the detail read distinguishes never-approved from revoked-by-edit, **shown at the wire tier** | **substantively proven, in a place that dies.** `red-1-projection.txt`, `mutations.txt` and `fast-tier.txt` exist and are convincing — but only inside `/Users/svendaneel/okam/wt-gr-approval/lanes/L-GR-APPROVAL-STATE/`, an ephemeral worktree. Nothing reached the trunk: no `newsletter-detail-revoked.json` fixture, no wire test naming `Revoked`. `docs/plan/artifacts/evidence-off-the-worktrees.md` already ruled a worktree path inadmissible as a citation — "the whole defect being repaired; it resolves until someone tidies". **This is a rescue, not an amendment**: copy the three files to `docs/plan/evidence/L-GR-APPROVAL-STATE/` under the established convention, then the exit can name them. |
| `L-GR-POSTMARK-WEBHOOK` | a genuine Postmark delivery and bounce payload replayed against the webhook route lands a receipt and moves a delivery, **pinned by a wire test** | **no instrument at all.** The evidence line is four suite names and four counts — no path, no trx. `GrowthPostmarkWebhookWireTests.cs` exists only at `/Users/svendaneel/okam/wt-gr-postmark/WebApi.Tests/Wire/`; the trunk has only `GrowthPostmarkSandboxSmokeTests.cs` and the mail provider. Same rescue shape as the row above, with one extra caveat a reader should carry: the RETURN's own LIMIT says the genuine payloads are credentialled "with today's HMAC through the one `AuthenticatedAs` seam", because the real authentication is still an open ruling (`D-GROWTH-EVENTS`) — so the route is exercised, the credential is a stand-in. |

### Two things the batch is worth reading for beyond the count

**Four of these lanes had already landed on the trunk and nobody had noticed.** `WorkforceNotificationTransportTests.cs`,
the two drifted-replay pins, the three `RefuseAsync` sites and the `CompanyReceivableAccountNumber` migration
are all at `6d5328004` while their lanes still read `built-unverified` and their evidence lines still point at
local branches and worktrees. The instrument problem and the landing problem are not the same problem, and
solving the first surfaced the second — a lane can be un-verifiable and simultaneously already shipped.

**`L-WF-PUSH-SILENT`'s RETURN carries an amendment appended by `L-WF-PUSH-STILL-LIES`** saying the probe proves
a registration *record*, not a reachable device — an uninstalled app still answers the probe present. That is a
real and open exposure, and it does **not** contradict this exit, which asks only about a worker "whose device
holds no push registration". The verification above should not be read as closing the uninstalled case.

## Batch 0

Twelve lanes ruled one at a time. For each: its `exit:`, its RETURN under `docs/plan/returns/`, and the
evidence that RETURN names — then the one question, **does that evidence establish what the exit demands?**

**Amended 5 · Declined 7.** Only `exit:` lines inside `## Lanes` were edited; each amendment appends
`, recorded in <path>` and nothing else. No exit was softened, no `state:`, `evidence:`, decision or flag
was touched, and no lane outside this batch was read for edit.

### Amended — 5, and `plan verify` accepted all 5

| lane | path appended | `plan verify` said |
|---|---|---|
| `L-MEALS-RELEASE` | `../OkamAPI-modules/lanes/L-MEALS-RELEASE/evidence.md` | `L-MEALS-RELEASE built-unverified -> verified` (exit 0) |
| `L-PRICE-CROSSCURRENCY` | `lanes/L-PRICE-CROSSCURRENCY/mutation-proof.txt` | `L-PRICE-CROSSCURRENCY built-unverified -> verified` (exit 0) |
| `L-LIVE-WORLD-SEED` | `lanes/L-LIVE-WORLD-SEED/events-deposit-precondition.live.playwright.json` | `L-LIVE-WORLD-SEED built-unverified -> verified` (exit 0) |
| `L-CONFIRM-CONAT-RETIRE` | `../OkamAPI-modules/lanes/L-CONFIRM-CONAT-RETIRE/evidence.md` | `L-CONFIRM-CONAT-RETIRE built-unverified -> verified` (exit 0) |
| `L-INVOICE-AUTHORIZE` | `../OkamAPI-modules/lanes/L-INVOICE-AUTHORIZE/evidence.md` | `L-INVOICE-AUTHORIZE built-unverified -> verified` (exit 0) |

Why each one is a yes, clause by clause:

- **`L-MEALS-RELEASE`** — the exit's own trailing qualifier, *shown at the wire tier*, scopes what must be
  demonstrated, and `evidence.md` demonstrates exactly that. Clause 1 (a superseding client can release):
  `POST /v1/stores/{storeId}/meals/quotes/release` exists and is driven by `MealsQuoteReleaseWireTests`;
  `red-no-route.txt` records the pre-change 404 from the middleware pipeline, so the route's absence and
  presence were both measured. Clause 2 (a guest re-quoting twice is not refused by their own earlier
  attempt) is a named pin, `A_guest_who_supersedes_a_quote_is_not_refused_by_their_own_earlier_attempt`,
  and the file records it having already observed the defect — quote 30 000 → 200, re-quote → 409
  `MEALS_ALLOWANCE_EXCEEDED`. Three mutations, one pin each, each red for its own reason and restored.
  The concurrency gap the RETURN discloses (rowversion inert on SQLite) is real but the exit demands the
  wire tier, not a race.
- **`L-PRICE-CROSSCURRENCY`** — `mutation-proof.txt` closes the exit's second clause literally: M1 deletes
  the gate, 15 tests red, `VERDICT PIN FIRES`, restore byte-identical, AFTER green. The first clause is
  carried by the same file's M4 plus `census.txt`'s per-site table, which names each composition site and
  whether it `DEPENDS ON THE GATE`. The RETURN corrects the exit's population *upward* — six raw
  compositions, not five — which is a superset, so the five are covered rather than the demand reduced.
- **`L-LIVE-WORLD-SEED`** — the exit demands an artifact and the artifact exists. `backend: "live"`,
  `apiBaseUrl: http://127.0.0.1:5951`, `backendProbe {status: 200, body: "Healthy"}`, `backendServed: 12`
  with a sampled request list, on `events-deposit-precondition` — an *existing* journey, not one written to
  pass. The seeded-database half is the sibling receipt `live-world-run.txt` (127 migrations, 211 tables,
  25 append-only triggers, from EMPTY) in the same directory. Notably the label is itself falsifiable: the
  RETURN records that live mode is refused if the origin answers `/__fixture/health`, and that the guard
  now re-throws after writing the artifact — a hole the lane found by running it.
- **`L-CONFIRM-CONAT-RETIRE`** — both halves are named pins with mutations. Clause 1 (a shared-bucket
  refusal leaves the code alive): `A_stranger_behind_the_same_egress_cannot_retire_your_code`, which fills
  the shared bucket from sixty *other* accounts and asserts the victim's code survives fifteen refusals.
  Clause 2 (only an account-bucket refusal retires it): M1 drops the `AccountBudgetSpent` guard and that
  pin reds; retirement is narrowed rather than removed and is pinned in both directions. One nuance worth
  recording rather than hiding: the exit's *per-address* disjunct has no referent on the confirm path —
  `EmailConfirmationRateLimiter.cs:172,178` shows the confirm path has exactly two buckets,
  `email:guess:ip:` (shared) and `email:guess:user:` (account); the per-address bucket is on the *send*
  path. The exit is an `or`, and the disjunct that exists is the one proved.
- **`L-INVOICE-AUTHORIZE`** — a three-clause exit and `evidence.md` carries all three. (1) Every route
  requires a caller: `Every_invoices_route_demands_an_authenticated_caller`, asserting the endpoint set
  size is 12 *first* so it cannot go vacuous. (2) Reds if an attribute is removed: M1 (action attribute
  only) 2 red, M2 (also class-level) 5 red, restored green, with the production `WebApi.dll` mtime watched
  at each step. (3) The estate-wide count is recorded: 734 endpoints, 61 explicit `[AllowAnonymous]`,
  61 → 55 anonymous-by-omission, 612 → 618 authorized, with the residual 55 itemised.

### Declined — 7, which is the number that matters

Each of these has a RETURN that did real work. The decline is about the evidence not reaching the exit, not
about the lane's quality.

| lane | why declined |
|---|---|
| `L-WF-OPLINK` | **exit demands a browser walk, and the capture is fixture-backed.** The exit's subjects are a manager and an operator doing things on screen — C5 by design, and a file must not close it. Three further facts, any one sufficient: the capture reports `"backend": "fixture"`, and the same lane's RETURN records that it *extended that fixture* with the very routes the journey calls (endpoint 7, `GET /staff/{id}`, `GET /attendance`), so the world answering the journey was authored alongside it; the artifact is at `lanes/L-WF-OPLINK/artifacts/journeys/`, not the repo-root `artifacts/journeys/` the exit names; and the RETURN itself records that `page.clock` does not work on this register, so the journey waits out a real minute instead of driving the control. The 11/11 walk is genuine and the screenshots are there — it is a capture, not the acceptance the exit describes. |
| `L-WF-KODEOVERSIKT-UI` | **exit demands a button pressed on a page, and the evidence is worktree-only.** `lanes/L-WF-KODEOVERSIKT-UI/` does not exist in the plan repo; it exists solely under `/Users/svendaneel/okam/web-kodeui/`, an unpushed 4-commit worktree. Citing it would put an exit's proof at a location that dies with `git worktree prune` — the exact failure `citations-that-outlive-a-worktree.md` was raised for. The lane's own RETURN is explicit: *"C5 IS NOT MET AND I AM NOT CLAIMING IT."* |
| `L-EV-URI-RELATIVE` | **evidence proves less than the exit demands: one platform, not every platform.** `RUN.md` states its own scope in its header — *"Host: darwin (Unix). That is the whole point — the defect is platform-shaped and is invisible on Windows."* M1 (9 red) genuinely closes the exit's second clause, the falsifiability one. But *on every platform* is argued from the shape of the fix (it checks scheme, not absoluteness) and is nowhere measured; no Windows run and no platform-invariance pin exists. Two-part exit, one half shown. The RETURN's own FLAG 1 compounds it: only one guest-link path exists on this branch, so `DepositPagePrefix`/`ProposalPagePrefix` have no production caller here. |
| `L-EV-OUTBOX-GUID-SUBSTRING` | **the evidence does not resolve at the SHA the RETURN names.** Measured, not assumed: `git ls-tree -r 79f9dd7d -- .lane` is **empty** — the four cited files were never committed at the lane commit. They exist only at rescue commit `76e6c5242` on `wip/rescue-2026-08-06-wt-evoutboxguid`, reachable through the worktree `/Users/svendaneel/okam/wt-evoutboxguid`, whose gitdir is `OkamAPI/.git`, and that worktree's HEAD is no longer the lane branch. `OkamAPI-modules`' own on-disk `.lane/` holds a different lane's files entirely. The substance of the work looks sound (mutation reds 6/6, 40 consecutive green runs) — but the citation as written points at a commit that does not contain it. |
| `L-WF-PUSH-STILL-LIES` | **evidence absent, and the first clause has no instrument at all.** The evidence line names a branch SHA and three test *source files* on an unpushed lane branch; no artifact exists in either repo (`lanes/L-WF-PUSH-STILL-LIES` and `artifacts/lanes/L-WF-PUSH-STILL-LIES` both absent). Worse, clause 1 — *no code comment **or return** claims the uninstalled-device case is closed* — is a negative universal over the whole corpus of code comments and RETURNs, and no sweep is recorded anywhere. A three-part exit where one part is unmeasurable from what is named. |
| `L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN` | **evidence absent.** The evidence line is the bare directory `docs/plan/lanes/L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN`, and it does not exist. The RETURN closes with *"Worktree REMOVED and pruned"*, so the four pin arms it describes are not on disk to open. The exit also carries a second clause — *the frontend tier green at the tip* — whose tip is a branch that was never landed, and which this lane may not run. |
| `L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ` | **evidence proves the measurement, not the deliverable.** The exit's object is *a written finding*. The named evidence is two `.trx` files, `lanes/L-THE-EVENTS-DRAIN-STORE-COUNTER-IS-READ/{baseline.trx,mutation-a.trx}` — they are present, and they do establish the subordinate clauses (executed=9 in both, 9/0 then 4/5, so the kill is real and not a void run). But a trx states nothing: it names no bound and no mutation. The finding itself — `StoresWithheld = dueStores.Count - dispatchableStores.Count` at `EventsNotificationDrainService.cs:122`, bounded by fleet size, MUT-A replacing the subtraction with a constant 0 — exists only inside the RETURN's log and was never filed as the artifact the exit asks for. The remedy is a lane that writes that finding down, not an exit amended to accept a pair of trx. |

### Two notes for whoever reads this next

**The `.trx`-versus-finding shape is likely not unique to one lane.** Where an exit's object is a *written*
finding and the evidence line names only machine output, the finding usually exists — in the RETURN's log —
and was simply never filed. That is cheap to fix and should not be resolved by amendment.

**Evidence that lives only in a worktree is the dominant failure mode in this batch** — three of seven
declines (`L-WF-KODEOVERSIKT-UI`, `L-EV-OUTBOX-GUID-SUBSTRING`, `L-A-KILL-...`). In one of those the
worktree is already gone and in another it has been moved onto a rescue branch, which means the window to
copy these to durable paths is closing on its own, not waiting for a ruling.

## Batch 3

Eleven lanes read one at a time — the `exit:`, the RETURN under `docs/plan/returns/`, and the artefact that
RETURN actually names. **9 amended, 2 declined.** Only `exit:` lines inside `## Lanes` were edited; no lane
body, no `state:` line, no decision, no flag. Backend trunk `6d5328004`, unmoved. No build, no tier, no jest,
nothing pushed. The demo APIs on `:5091` and `:5941` were left running.

Nine of eleven is a high amend rate and it needs saying why rather than defending: this batch is unusually
weighted toward lanes that produced a **written mutation record** — a `detail.md` / `DETAIL.md` / `RUN.md` /
`bookkeeping.md` naming which mutation was applied, which assertion went red, and what the message said. That
document is the one artefact shape that can answer a `pinned-by-a-test-that-reds-if-X` exit. Six of the nine
are already tracked in this repo. Where a lane produced only a branch, a SHA and a suite count, it was
declined — that is the shape of both declines.

### Amended — 9, and `plan verify` accepted all 9

| lane | what the exit demanded | why the named evidence establishes it | appended |
|---|---|---|---|
| `L-WF-CONTACT-IMPORTED` | contact set through a product path, **pinned by a wire test that reds if the write is removed** | mutation ledger M1: the two `person.Contact* =` assignments deleted → **4 of 7 wire tests red**, and the record names that as the exit criterion itself; the subject is created by `POST /staff/pos-operator-import`, so *imported* is produced by the product, not seeded | `, recorded in lanes/L-WF-CONTACT-IMPORTED/DETAIL.md` |
| `L-WF-BLIND-BIND-NAME` | names the person in the existing-login case **and** a mis-mapped link undone through an audited path, **both at the wire tier** | both halves are at the wire tier, not only at the service tier: the naming pair `Wire Spare Register` beside `Wire Shared Register → Tore Toresen`, and the correction's audit `ActorReference` asserted **by value** against `AdminAStaffMemberId` and unequal to three other ids the row could have carried; blanking the resolved name reds exactly the two naming tests | `, recorded in lanes/L-WF-BLIND-BIND-NAME/detail.md` |
| `L-WF-LINK-DEADEND` | withdraw + re-import, **pinned by an import-deactivate-correct-reimport test that reds if the holder query goes back to requiring an active row** | that exact mutation is row 1 of the ledger — `put && s.IsActive back` → all 3 service-tier tests **plus** the wire dead-end test red (4/26); the pin runs the whole four-step sequence at the service tier and again over HTTP, and both doors are asserted shut first | `, recorded in lanes/L-WF-LINK-DEADEND/detail.md` |
| `L-CANONICAL-SLOT-SURVIVES-A-RERUN` | tracked file byte-identical **and** screenshots' paths unchanged, **shown by a before-and-after hash of every tracked artifact** | the file is literally that instrument: `git ls-files artifacts/ \| shasum -a 256` before and after one re-run, red at base (**5 of 16 changed**) and green after (**0 of 16**), with the orphaning path — which a picture diff cannot show — enumerated separately and ending 0 dangling / 0 orphaned | `, recorded in lanes/L-CANONICAL-SLOT-SURVIVES-A-RERUN/proof-hashes.txt` |
| `L-FE-JOURNEYS-MERGE` | the four lane-only journeys are on the integration branch **or** the plan says where they are | the record names all six specs the plan marks lane-only and where each now is; **checked independently rather than taken from the record** — `git ls-tree feature/restaurant-modules test/e2e/journeys/` holds all four (`meals-admin-setup`, `meals-guest-claim`, `margin-statement-week`, `growth-guest-consent`) plus the two that had landed at `174a550`, and `ddc27fa1` is on that branch | `, recorded in lanes/L-FE-JOURNEYS-MERGE/bookkeeping.md` |
| `L-THE-EIGHTY-TWO-MECHANICAL-REFUSALS-ARE-CLEARED` | every refused lane accepted **or** recorded with the reason, **with the count of each stated** | the artefact states all three outcome counts (**59 accepted / 23 refused-with-reason / 0 unrecoverable**, summing to the 82) and the per-class clearances (**37 prose / 15 directory / 7 git-ref**), names all 23 refusals individually, and gives one reason for them that is a C5 argument rather than a shrug | `, recorded in docs/plan/artifacts/eighty-two-mechanical-refusals.md` |
| `L-GROWTH-HEALTH-HONEST` | two-part: rates withheld when the provider cannot ingest, **AND** the Postmark server-token header redacted, both by fast-tier tests | **both halves are separately red-then-green**, which is what a two-part exit needs: pin 1 `Expected: (null) / Actual: 0`, pin 2 `must redact X-Postmark-Server-Token … Expected: True / Actual: False`. The guard inversion reds in **both directions** (hearing transports withholding, deaf ones reporting 0), so the pin cannot be satisfied by a one-way assertion | `, recorded in ../wt-growth-health/.lane/L-GROWTH-HEALTH-HONEST-detail.md` |
| `L-GROWTH-NEWSLETTER-WIRE` | create, edit, approve and detail each through **real routing** under an authorization matrix, wrong-store admin refused **identically** to an absent resource | each of the four has its own fact; routing is proven real by the 405 verb probes and by M5 (`newsletters → newsletter-drafts` reds all six); identity of refusal is asserted on **status and error code**, not status alone; and the gate-called-but-answer-discarded mutation leaves the rest of the tier at 4357/0 green while a real admin of one venue can approve another's newsletter | `, recorded in ../wt-gr-nlwire/.lane/L-GROWTH-NEWSLETTER-WIRE-detail.md` |
| `L-INVOICE-RETRY-RETIREMENT` | route run **twice**, invoice still selected on the second run, **shown by a test that reds when the pre-render stamp is restored** | the mutation table is exactly that: rollback removed → `the run retired an invoice it never mailed`, and with that assertion suspended **the second run returns 0 where 1 is asserted** — the two-run half measured, not asserted. A second mutation (stamp deleted entirely) closes the escape where the rollback is satisfied by never stamping | `, recorded in ../wt-invretire/artifacts/tests/f18ffeda58137e9d2b58e109466d380d0847364c/RUN.md` |

`plan verify <lane> --evidence <path>` was run immediately after each amendment. **All nine printed one line
and exited 0**, verbatim:

```
L-WF-CONTACT-IMPORTED built-unverified -> verified
L-WF-BLIND-BIND-NAME built-unverified -> verified
L-WF-LINK-DEADEND built-unverified -> verified
L-CANONICAL-SLOT-SURVIVES-A-RERUN built-unverified -> verified
L-FE-JOURNEYS-MERGE built-unverified -> verified
L-THE-EIGHTY-TWO-MECHANICAL-REFUSALS-ARE-CLEARED built-unverified -> verified
L-GROWTH-HEALTH-HONEST built-unverified -> verified
L-GROWTH-NEWSLETTER-WIRE built-unverified -> verified
L-INVOICE-RETRY-RETIREMENT built-unverified -> verified
```

### Declined — 2, and both are the same failure in different costumes

**`L-EV-VIPPS-FALLBACK` — the exit demands a live run and the RETURN says it did not happen.**
Exit: *a **live** test-MSN initiate for a deposit returns a redirect and, **after approval in Vipps**, the
guest lands back on the deposit page reading paid.* Its RETURN closes with the answer already written down:
*"NOT PROVEN, as the ruling accepts: nothing here reaches Vipps, and `Events:PublicBaseUrl` is unset in every
committed configuration on this branch, so the guest's approve-and-return leg is unverified."* What the
evidence does establish is genuinely strong and genuinely **adjacent** — that `merchantInfo.fallBack` survives
the serialization hop, measured by nulling the assignment and watching **exactly one test of 4392** red. That
is the field being on the wire, not a guest being on a page. The lane body agrees: *"Only a live harness run
decides this one."* Two independent grounds to refuse: the second clause is a **person completing a journey**
(**C5**), and the only file-shaped token in the evidence line is a test source, which C5 names outright.

**`L-GR-DEADLINE-STATUTE` — the instrument cannot see what the exit is about.**
Exit: *the working-day extension and the end-of-day expiry are either implemented or **named in the
obligation's own doc**, and **the timezone reading is recorded**.* The RETURN's only file is
`lanes/L-GR-DEADLINE-STATUTE/growth-scoped.trx` — a suite result, `<Counters total="437" passed="436"
failed="0">`. A `.trx` cannot show that a doc comment names a rule, and cannot record a timezone reading;
it shows that 436 tests passed. Verifying on it is **C5's `violated_when` word for word** ("only named
evidence is a `.trx`"). The work itself looks done — the RETURN describes all three named in
`GrowthPrivacyObligation`'s own doc with a worked example (31 Mar 01:30 Oslo → screen 1 May, venue-local
30 Apr) — but that text lives in a **source file on an unmerged branch**, and the evidence line never names
it. This lane needs its doc extracted to an artefact, not an exit amended. Note it was also declined by the
mechanical pass (`exits-that-name-their-file.md`); this decline is on different and stronger grounds.

### Two findings this pass produced, neither of which softens anything

**`plan verify` overwrote every `evidence:` line with the single path I passed** — for worktree paths as
well as committed ones, not only for the committed case a sibling measured. So for the nine amended lanes the
RETURN's original citation (branch, SHA, base, suite counts, baseline delta) is **no longer in `plan.md`** and
survives only in `docs/plan/returns/<LANE>-N.md`. Nothing was lost, but the plan is now a thinner record than
it was an hour ago, and a reader who wants the branch has to go to the RETURN.

**Three of the nine amendments cite a file that dies with its worktree**, and this is a debt, not a fix:

| lane | citation | durability |
|---|---|---|
| `L-GROWTH-HEALTH-HONEST` | `../wt-growth-health/.lane/L-GROWTH-HEALTH-HONEST-detail.md` | worktree-local, in no commit |
| `L-GROWTH-NEWSLETTER-WIRE` | `../wt-gr-nlwire/.lane/L-GROWTH-NEWSLETTER-WIRE-detail.md` | worktree-local, in no commit |
| `L-INVOICE-RETRY-RETIREMENT` | `../wt-invretire/artifacts/tests/f18ffeda…/RUN.md` | worktree-local, under an ignored `artifacts/` tree |

They were amended because **the question this lane asks is whether the evidence establishes the exit, and it
does** — declining them would have been inventing a durability criterion the brief does not carry, and
`evidence-off-the-worktrees.md` already ruled that recovery and admissibility are different jobs. But the
durable convention exists (`docs/plan/evidence/<LANE-ID>/<filename>`) and copying a file is outside this
lane's boundary, so this is handed on: **three files to copy out before anyone runs `git worktree prune`.**
All three branches and SHAs resolve today (`c11e78a6`, `87600a1c`, `f18ffeda`), all three unpushed, so a
fresh clone would not find them either.

### Method, and what it does not cover

For each lane: the `exit:` from `plan.md`, the RETURN, then the artefact **opened and read in full** — never
matched on filename. Three claims were checked against the world rather than taken from the record: the four
journey specs on `feature/restaurant-modules` and the reachability of `ddc27fa1`; that all eight cited backend
SHAs resolve in `OkamAPI-modules`; and that the two declined lanes' files are what they say they are. Each
`exit:` line was re-read by exact-string `grep` immediately before its edit and replaced by exact string
match, never by line number, because seven siblings were writing the same file throughout. Nothing outside the
eleven lanes in `batch3.json` was examined or touched. **No claim here rests on a suite passing**; the two
lanes whose only evidence was a suite passing are the two declines.

## Batch 1

Twelve lanes read one at a time — the `exit:`, the RETURN under `docs/plan/returns/`, and the evidence that
RETURN names, opened rather than inferred. **5 amended, 7 declined.** Only `exit:` lines inside `## Lanes`
were touched; no lane body, no `state:` line, no `evidence:` line, no decision, no flag. Backend trunk
`6d5328004`, unmoved. No build, no tier, no jest, nothing pushed; the demo APIs on :5091 and :5941 were left
alone.

The question answered per lane was **not** "does a file exist" but "does *that* file establish what the exit
demands". Three declines turn on the artifact proving something adjacent or weaker, two on a multi-part exit
whose named artifact shows one part, one on the artifact having no committed home, and one on the named
instrument having been **overwritten by a different lane's run**.

### Amended — 5

| lane | evidence named in the exit | `plan verify` said |
|---|---|---|
| `L-WF-W5-TIMESHEET` | `../OkamAPI-modules/WebApi.Tests/Workforce/WORKFORCE-JOURNEY-MANIFEST.md` **and** `../OkamAPI-modules/lanes/L-WF-W5-TIMESHEET/evidence.md` | `L-WF-W5-TIMESHEET built-unverified -> verified` (exit 0) |
| `L-CRYPTO-PIN-BYFORM` | `../OkamAPI-modules/lanes/L-CRYPTO-PIN-BYFORM/evidence.md` | `L-CRYPTO-PIN-BYFORM built-unverified -> verified` (exit 0) |
| `L-AI-MIDDLEWARE-DELETE` | `lanes/L-AI-MIDDLEWARE-DELETE/mutations.txt` | `L-AI-MIDDLEWARE-DELETE built-unverified -> verified` (exit 0) |
| `L-EF-INDEX-SHADOW-SWEEP` | `lanes/L-EF-INDEX-SHADOW-SWEEP/evidence.md` | `L-EF-INDEX-SHADOW-SWEEP built-unverified -> verified` (exit 0) |
| `L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE` | `docs/plan/artifacts/two-hundred-and-six-exits.md` | `L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE built-unverified -> verified` (exit 0) |

**`L-WF-W5-TIMESHEET`** — the only two-part exit in this batch where both halves are shown, and by two
different committed files, so the exit names both. Half one: the manifest on the backend trunk carries
`**WFJ-14** … **VERIFIED-GREEN** (lane L-WF-W5-TIMESHEET)` and `WFJ-15 (exports clause) … **VERIFIED-GREEN**
(lane L-WF-W5-TIMESHEET)`, and its header reads *14 journeys VERIFIED-GREEN, 1 BLOCKED-ON-GAP*. The RETURN
warned this would read 12 until the branch landed; it has landed — `Migrations/20260801174639_Workforce_W5_
Timesheets.cs`, `Controllers/WorkforceTimesheetsController.cs` and
`WebApi.Tests/Workforce/WorkforceTimesheetImmutabilitySqlServerTests.cs` are all tracked at trunk. Half two:
`evidence.md` records the SQL-Server scope run (26/26, also in `sql-tier.txt`) **and** the falsification —
`Dropping_the_export_batch_trigger_lets_the_same_write_through…` drops the trigger on the harness's own
throwaway catalog, asserts the identical UPDATE is then accepted and landed, re-creates it, and asserts the
refusal returns. That is what makes "refuses a further write" evidence rather than a green assertion.

**`L-CRYPTO-PIN-BYFORM`** — the exit's whole point is *every* non-cryptographic form, not one spelling.
`evidence.md` carries the matrix: eleven mutations one at a time (shared instance, literal ctor,
qualified+seeded, target-typed field, `Random` subclass, `Guid`, clock, a hand-rolled LCG touching no
external member, indirection through the lane's own helper, a call-site overwrite, a mint in a brand-new
class) — **all eleven red on the new pin, the retired string pin red on exactly one of them** — plus a
control row where a *different* cryptographic form stays 7/7 green, and two guard-on-guard mutations. That
is the exit's claim, quantified, not restated.

**`L-AI-MIDDLEWARE-DELETE`** — `mutations.txt` is a four-build record, not prose: STEP 1 the pin red against
the tree that still held the real type (that *is* "wired back as it stands"); STEP 3 the deletion of
`Helpers/ApplicationInsightsLoggingMiddleware.cs` and its `AddTransient`, pin green; STEP 4 two
differently-named stand-ins in the production assembly sharing no name, property or interface with the
deleted type, both red in one run; STEP 5 green after removal. It also records the honest negative — STEP 2
measured that a live-pipeline HTTP version of the same test is green in both worlds, and says why.

**`L-EF-INDEX-SHADOW-SWEEP`** — the exit asks for a census ("names **every** entity configuration…") and a
red on reintroduction. `evidence.md` closes the census with arithmetic rather than sampling: `CALLS=199
(named=9, unnamed=190) … DECLARED=349 (convention=151, non-convention=198) COLLISIONS=1 UNACCOUNTED=0`, so
the one-index deficit *is* the one live replacement and nothing is left over. Reintroduction is proven both
directions on the production model with the rebuilt `WebApi.dll` hash asserted changed at each mutation and
restoration proven byte-for-byte back to `ae307922fb0a379f`.

**`L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE`** — the exit demands *both* counts be stated, so it
anticipates a partial result and requires it be counted; the artifact states 206 candidates, **177 edited and
accepted by the tool, 0 still refused after an edit, 8 left as genuine disagreements, 21 left because the
artifact is committed nowhere**, names all 29 refusals individually with their reason, and records that a
diff against a pre-pass backup shows only `exit:` and `state:` lines changed. That is the instrument the exit
describes.

### Declined — 7

| lane | why the evidence does not establish the exit |
|---|---|
| `L-WF-DEMO-PRESENCE` | **the named instrument now holds a different lane's run** |
| `L-WF-VIOLATION-EXACT` | evidence names a branch and a SHA — no artifact at all |
| `L-PRICE-BYPASS-FIVE` | the committed artifact records the *complement* of the exit |
| `L-GR-CONFIRMED-EMAIL` | the artifact records a green tier and puts the red half outside its own number |
| `L-GR-CONFIRMED-PIN-FIX` | three-part exit; the artifact demonstrates one part and asserts two |
| `L-WF-WITHHELD-BOUND` | a script with no outcome plus six `.trx`, in a worktree only |
| `L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST` | three `.trx`, untracked, committed to no ref anywhere |

**`L-WF-DEMO-PRESENCE` — the one worth reading twice.** Its exit is *after the workforce demo seed, the
personnel-list read for the seeded week returns the four seeded windows rather than an empty sheet*, and its
recorded evidence names one openable file: `…/scratchpad/final-run.txt`, quoted in the evidence line as
printing `2026-07-20: Jonas Lie 08:02-16:04, Nora Berg 13:58-20:04`. **That file exists and contains none of
that.** Opened today it is twenty `PASS` lines about a Jest collection sweep — *the archived-name regex
matches a known archived name*, *live suite collects nothing under the excluded dir*, *over-exclusion canary
still collected: test/multi-lanes-rollout.test.js*. A sibling lane wrote its own run to the same shared
scratch path and the demo evidence is gone. The lane's work may well be sound — its RETURN is unusually
careful, with five named mutations and a declared regression — but there is now nothing to name, and naming
this file would attach a personnel-list claim to a Jest collection proof. This is the boundary rule *never a
shared scratch path* costing a lane its evidence, and it is the concrete argument for the rescue-to-durable-
path question the `citations-that-outlive-a-worktree` lane left open.

**`L-WF-VIOLATION-EXACT`** — the RETURN's evidence line is `/Users/svendaneel/okam/wt-wfviolexact @ cdb4c66c`
and nothing else: no `evidence.md`, no mutation log, no receipt. The red/green cycle (`unfixed 2F/2P → fixed
4P → re-mutated 2F/2P → restored 4P`) exists only as RETURN prose. The test itself,
`WebApi.Tests/Workforce/WorkforceConstraintViolationExactnessTests.cs`, *is* on the trunk — landed by
`L-VIOLATION-EXACT-LAND` — but a test source file shows that a test exists, not that it reds when the
mapping is loosened, and C5 names a test name as inadmissible. Nothing to append.

**`L-PRICE-BYPASS-FIVE`** — the one committed artifact, `lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md`, is
tracked in this repo and is genuinely good work, but its subject is *"everything else the census turned up"*:
~22 sites still coercing absence into a figure, an inverse-defect family, the six `−—` rows, and a
checked-and-safe list. It proves what was **not** fixed. The exit asks that the five bypass formatters each
be pinned over null, zero and a stated amount; the pins are cited only as a count (`39/39` in the plan,
`40/40` in the RETURN — the two disagree) against `refs/lanes/L-PRICE-BYPASS-FIVE`, a local git ref, which is
not a path and not openable by a stranger. Naming `remaining-sites.md` here would let a lane verify against
the list of what it did not do.

**`L-GR-CONFIRMED-EMAIL`** — two candidates and both fail. `artifacts/tests/a7697121-fast-tier.trx` matches
the source glob of the suite-kind probe `be.tests`, so the tool refuses it by construction and C5 bars it
besides. Its companion `artifacts/tests/a769712113160fecdaedf21458de1cbb145d0b30/RUN.md` *is* tracked at
trunk, but says of itself: *"The mutations are not in this number. A green tier cannot show that a pin would
fail if the code were wrong…recorded in the commit message."* The exit's operative clause is *pinned by a
test that reds if the confirmation requirement is removed*; the artifact records a green tier and relays the
red from a commit message on an unpushed branch. The artifact is honest; it is honest about not being this.

**`L-GR-CONFIRMED-PIN-FIX`** — the closest call in the batch. Its `RUN.md`
(`artifacts/tests/3cf288fb9b5465472dd0a50d50d949dbce8f4d19/RUN.md`, tracked at trunk) does carry a
first-person mutation table: delete `string.IsNullOrWhiteSpace(account.Email)` → **1 failed**, with the
`NullReferenceException` the clause exists to prevent, from `GrowthNewsletterService.cs:502`; delete
`account == null` → **1 failed**; restore both → 474 passed. That settles clause one. Clauses two and three —
*the dead seed parameter is used or removed* and *the shared-code rationale says something true* — appear
only as a half-sentence in a summary table (*"its dead seed parameter removed; its false shared-code
rationale replaced"*). Naming this artifact would let `plan verify` accept a three-part exit on a third of
it, which is the failure this pass exists to prevent. Left refused, with the note that clause one is
genuinely discharged and only two and three are owed.

**`L-WF-WITHHELD-BOUND`** — the exit's substance is met on inspection: `trx/` holds the exact four-state set
(`baseline`, `M1-supersede-cancel-removed`, `M1-…-restored`, `M2-withheld-age-out-removed`, `M2-…-restored`)
and `mutation_check.py` names both transitions by the literal source blocks it swaps out. But the record
*is* six `.trx` files — C5's `violated_when` is explicit that an item must not be moved to verified whose
only named evidence is a `.trx` — and `mutation_check.py` is a runner carrying no outcome of its own, with
`ROOT` hard-coded to `/Users/svendaneel/okam/wt-wfwithheld`. Nothing is at `../OkamAPI-modules/lanes/L-WF-
WITHHELD-BOUND/`; the files are committed only on `lane/wf-withheld-bound`, reachable only through that
worktree. This is the best rescue candidate in the batch: a short prose record beside those trx files, at a
durable path, would close it.

**`L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-REQUEST`** — `lanes/L-A-STORE-CANNOT-GRANT-ITSELF-A-CUSTOMERS-
REQUEST/{arms-clean.trx,arms-inverted.trx,tier.trx}` are on this disk in the plan repo but `git status`
reports the whole directory `??`, and `git log --all --diff-filter=A` over that path in the backend repo
returns nothing — they are committed to no ref in either repo. The RETURN's own numbers are the strongest in
the batch (`executed=2 passed=0 failed=2` inverted against `executed=2 passed=2 failed=0` clean, identical
executed counts, so a real kill and not the void-run signature), and the code landed on the trunk
(`28e60e6b8` is an ancestor of `6d5328004`) — but the receipts did not travel with it. Committed nowhere,
therefore openable by nobody.

### What this batch says about the ninety-one

The instrument was **present and sufficient** in 5 of 12. Of the 7 declines, only two are about the work
being unproven; the other five are about **where the proof was put**:

- one instrument was overwritten in shared scratch (`L-WF-DEMO-PRESENCE`) — irrecoverable;
- one lane's receipts were never committed at all (`L-A-STORE-…`) — still on disk, still rescuable today;
- one is committed but only inside a worktree (`L-WF-WITHHELD-BOUND`);
- one filed no artifact and rests on RETURN prose (`L-WF-VIOLATION-EXACT`);
- one filed an artifact about the opposite question (`L-PRICE-BYPASS-FIVE`).

Both Growth declines share a shape worth naming: **the receipt convention produces an excellent artifact for
the wrong claim.** A `RUN.md` proves a clean-checkout tier at a SHA; every one of these exits turns on a
*red*, and a red is by construction not in a green tier's number. The two `RUN.md`s handle this differently —
`a7697121` points at a commit message, `3cf288fb` writes the mutation table into the receipt — and only the
second is citable. **A mutation table in the receipt is the cheap fix**, and it is already the house style in
one of the two.

## Batch 7

Eleven lanes, read one at a time: exit, RETURN, and the evidence that RETURN names.
**Amended 2. Declined 9.** Only `exit:` lines inside `## Lanes` were touched; no lane body, no
`state:`, no `evidence:` line, no decision, no flag. Backend trunk `6d5328004`, unmoved. Nothing pushed.

### Amended — 2, and `plan verify` accepted both

| lane | appended | `plan verify` said |
|---|---|---|
| `L-MEALS-FOURWAY-TIER` | `, recorded in ../wt-meals-fourway-tier/lanes/L-MEALS-FOURWAY-TIER/f72c7a81-fourway-fast-tier.trx` | `L-MEALS-FOURWAY-TIER built-unverified -> verified` (exit 0) |
| `L-UTLKVIT-REPRINT-KIND` | `, recorded in lanes/L-UTLKVIT-REPRINT-KIND/mutation-red-8.txt` | `L-UTLKVIT-REPRINT-KIND built-unverified -> verified` (exit 0) |

**`L-MEALS-FOURWAY-TIER`** — the exit demands "the trx committed at that commit", and the trx *is* the
instrument. `git ls-tree 702d9481 -- lanes/` shows `f72c7a81-fourway-fast-tier.trx` committed at that
commit; the commit's graph shows it sits directly on the four-way merge `f72c7a81` of floor-pins,
degenerate-two, grace-pins and requote-release off `de1e5c5e`; and the file's own
`<Counters total="4378" executed="4366" passed="4366" failed="0" ...>` is the passing tier. All three
clauses land in the one file the exit asked for.

**`L-UTLKVIT-REPRINT-KIND`** — one file carries every clause. `mutation-red-8.txt` is the red set from
deleting the forward resolution in `BuildDocumentForAsync` — which is precisely "the kind taken from the
entry alone" — and it names, by test, the receipt endpoint
(`Viewing_the_id_the_register_handed_back_returns_the_handover_document`), the print endpoint
(`Reprinting_from_the_id_the_register_handed_back_puts_the_handover_document_on_paper`) and the model
field (`The_model_also_addresses_the_handover_document_by_its_own_id`), all red under that one mutation.
`pins-green.log` / `pins-restored.log` bracket it 11 green -> 8 red -> 11 green.

### Declined — 9, which is the number that matters

**`L-PRINT-HOST` — evidence proves less than "every".** The exit: *the personalliste and **every admin
document** print without the sidebar gutter, verified by a rendered PDF committed under
artifacts/journeys/*. Five PDFs are genuinely committed at `lane/print-host` `6e6acd0`
(`artifacts/journeys/admin-print-host/`, confirmed by `git ls-tree`), but the three after-PDFs cover
**two** documents: the personalliste (portrait + landscape) and the vaktplan. At that same commit
`git grep -l "@media print"` returns a **third** printable admin document — `pages/admin/brev.vue`,
which lays A4 `SalesLetter` pages out and hides the admin header/footer for print — and **no PDF of it
exists**. So the universal is carried by a central `AdminPage.vue` change plus a blast-radius argument,
not by the rendered PDF the exit names. The lane's own RETURN also leaves `/admin/workforce-schedule`
clipping its TIMER column on A4. Amending here would quietly reduce "every admin document" to "the two
we rendered", which is the rewrite this plan exists to prevent.

**`L-WF-BOOTSTRAP` — two-part exit, one half readable, the other's proof unrecorded.** Half two is
directly checkable and **holds**: at `9d1719df` `Scripts/demo/seed-workforce-demo.sh` has no
`INSERT INTO WorkforceStaffMembers` statement left (the two hits are past-tense prose in the header and
body; the surviving INSERTs are `Stores`, `StoreAdmins` and the clock-event demo). Half one — *a wire
test **proves** a fresh store's StoreAdmin obtains a WorkforceManager engagement over HTTP with no SQL* —
has `WebApi.Tests/Wire/WorkforceBootstrapWireTests.cs` in the tree and **no recorded run anywhere**: the
evidence line names a branch, two worktrees and two prose counts (4374/0/12 vs BASE 4369/0/12), with no
trx, log or summary committed. A test source file shows the pin exists, not that it passed. The
frontend arm the same line cites reports **1 failed**.

**`L-TRAIN-EVIDENCE-NAMES-COURSE` — two-part exit, only the wire half is recorded.** The named artifact
`../wt-trn-names/artifacts/tests/L-TRAIN-EVIDENCE-NAMES-COURSE/RUN.md` (+ `base.trx`, `after.trx`) is
backend-only: 232/232 at base `3579bbbc` -> 241/241, and it names the wire pin
`TrainingWireTests.A_completion_read_over_the_wire_names_its_course_and_the_version_actually_completed`
plus four restored mutations. The **component test** half is cited only as the frontend commit
`cff41c8` — which does add `test/training-components.test.js` (+67), so the pin exists — but no artifact
records it running, and the third citation
(`artifacts/journeys/training-course-to-evidence.playwright.json`) is a browser journey, not a component
test. No single path establishes both halves, so none was appended.

**`L-GR-TESTSEND-RECORD` — the RETURN names no instrument at all.** Evidence is
`lane/growth-audit-ledger@bd3a840f (worktree /Users/svendaneel/okam/wt-gr-ledger)` — a branch and a code
tree, nothing that records a run. The exit's falsifiability clause ("*a test that reds if the record is
dropped*") rests entirely on the RETURN's prose claim of ten red-on-removal mutations; `wt-gr-ledger`
has no `lanes/` directory and no committed red set. The one file on disk under this lane id,
`lanes/L-GR-TESTSEND-RECORD/DETAIL.md`, is **a prior *blocked* attempt** whose first line reads
"Verdict: **blocked**. ... Nothing was built" — citing it would be citing the opposite of the work.

**`L-COMPOSITION-ROOT-CHECK` — the named evidence contradicts the exit.** The exit demands the failure
leave "**every** limiter resolving and enforcing". The trx the RETURN names,
`artifacts/tests/lane-composition-root-fast-tier.trx`, reads `Failed: 1, Passed: 4406` and the failure is
`WebApi.Tests.Wire.CompositionRootLimiterWireTests.The_reservation_limiter_still_resolves_after_the_failure`
with `outcome="Failed"`. The RETURN declares it red on purpose and assigns the one-line fix to
`L-RESERVATION-LIMITER-MOVE`. Honest, and it means the exit is not met — one limiter still does not
resolve.

**`L-GR-DISPATCH-ACTOR` — one of three subjects.** The exit names three: *the newsletter dispatch, the
margin statement and its spend entries, and a push publication record*. `lanes/L-GR-DISPATCH-ACTOR/detail.md`
resolves and is thorough — five mutations, three principals, by-value assertions at the wire tier — and
covers **only the newsletter dispatch**. Nothing in it, or anywhere in the RETURN, touches a Margin
statement, its spend entries, or a push publication record.

**`L-EV-JOURNEY-TIMEBOMB` — the run recorded is not the run demanded.** The exit wants the journey to
find its own row "on a second consecutive **live** run".
`lanes/L-EV-JOURNEY-TIMEBOMB/consecutive-run-proof.txt` records four real browser runs and reproduces the
coin flip cleanly (ARM A pass/pass; ARM B, the constant-name control, pass then
`toHaveCount expected 1 received 2` at spec:304) — but against **this lane's own fixture and dev server**.
The RETURN states it plainly: "PROXY NOT LIVE: no live re-run claimed", and the spec still carries
`@fixture` and pins fixture store 42, so it is filtered out of live mode. The second clause (no future
date literal, pinned by a mutation) *is* fully shown in `mutation-proof.txt`, 15 red by name. Half the
exit, on the half that is C5-adjacent by design.

**`L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED` — both recorded arms are green.** Two of three
clauses land: `tier.trx` is `passed="5040" failed="0"` at the composed tip, and `after-arm-by-name.txt`
lists all 14 `EodServiceTests` Passed including
`GetSummary_ACompanyAccountSale_IsStatedApart_NotCountedAsTakings`. The third clause — "*shown by a test
that **reds** when CompanyAccount falls into the default bucket*" — is shown by nothing on disk.
`before-arm.trx` holds exactly one test, `PROBE_BEFORE_a_company_account_sale_is_counted_as_takings_under_Annet`,
and it **passed**: it asserts the defect at the pre-fix trunk rather than reddening the shipped pin. The
mutation the RETURN describes ("reds 2 of EodServiceTests' 14") has no artifact among the three files the
evidence line names. Compare `L-UTLKVIT-REPRINT-KIND` above, which is the same demand *with* the red set
on disk — that is the whole difference between the amend and this decline.

**`L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE` — the content holds; no single artifact carries it.** This
is the one decline where the substance is not in doubt, and it is worth stating exactly. The evidence
line names `docs/plan/lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE`, which **resolves nowhere** — the
lane's own log says `lanes/`, and the ten JSON files are committed at `lanes/...` on
`lane/meals-tests-proven-falsifiable` `05c160a` and readable at `../Web/lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE`.
Read there, all three clauses hold on measurement: `all-lines/all-offer/all-page.results.json` report
`neverReddened: []` over 29 + 37 + 49 = **115** tests; each carries a per-test `killedBy` map, which is
the "runner that records per-test coverage"; and the three `*.rederived.results.json` list the
previously-unproven tests **by name**, 11 + 3 + 18 = **32** exactly. It was amended and the amendment was
withdrawn, because `plan verify` refused the citation:

    plan: evidence inadmissible — ../Web/lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE is a directory
    — a directory records no run and cannot be read; name the artifact inside it that does

(exit 6). No file inside carries more than one clause for one of three specs, so any single-file
citation would name evidence proving a third of the exit. The exit line was restored to its original
text and the lane is still `built-unverified`. **What it needs is one written summary naming the three
zero-counts and the 32 — an artifact this lane may not create.**

### What this batch says about the family

The two amendments share a shape the nine declines do not: **one file, produced by the run, that names
the exit's own clauses back to it** — a trx whose Counters are the passing tier, a red set whose test
names are the endpoints and the field. Every decline fails on one of four things: a universal shown on a
sample (`L-PRINT-HOST`), a two-part exit with one half unmeasured (`L-WF-BOOTSTRAP`,
`L-TRAIN-EVIDENCE-NAMES-COURSE`, `L-EV-JOURNEY-TIMEBOMB`), a code tree offered where a measurement was
demanded (`L-GR-TESTSEND-RECORD`, `L-THE-END-OF-DAY-...`), or evidence that reads against its own exit
(`L-COMPOSITION-ROOT-CHECK`, `L-GR-DISPATCH-ACTOR`). Only `L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE`
fails on the instrument's shape rather than on the proof, and it is the one worth a ruling.

## Batch 4

Eleven lanes read one at a time — the `exit:`, the RETURN under `docs/plan/returns/`, and the evidence that
RETURN names, opened rather than reasoned about. **6 amended, 5 declined.** Only `exit:` lines inside
`## Lanes` were touched; no lane body, no `state:` line, no `evidence:` line, no decision, no flag. Backend
trunk `6d5328004`, unmoved. Nothing built, no tier run, no jest, nothing pushed; :5091 and :5941 left alone.

The question was never "is there a file". It was **whether the file the RETURN named carries the sentence the
exit demands, both halves of it**. Six did. Five named a branch and a suite count, a green `.trx`, or a path
that resolves nowhere.

### Amended — 6, and `plan verify` accepted all 6 on the first attempt

| lane | path appended | why the evidence establishes the exit |
|---|---|---|
| `L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN` | `docs/plan/artifacts/twenty-three-branches.md` | the exit's three clauses are each on the page: 2 accepted with the artifact named per lane (`lanes/L-PRICE-SHADOW-GUARD/DETAIL.md`, `guard-proof.txt`), 21 recorded as needing work under headings that **name what is missing** ("land the branch, then produce the artifact", "the branch it names is gone", "produce the document or wire capture its exit describes", "blocked on `D-RESTART-THE-WALK-WORLD-API`"), and a counts table `2 + 6 + 5 + 9 + 1 = 23`. "Accepted by plan verify" is recorded as the lane count moving `401 → 403`. Tracked in the plan repo. |
| `L-STATUTE-EVIDENCE-WORLD` | `../web-statute-world/lanes/L-STATUTE-EVIDENCE-WORLD/EVIDENCE.md` | **the first half was checked against the PDF itself, not against the claim.** `pdftotext -layout` on the committed `01-personalliste-with-coverage-caveat.pdf` prints four rows — Ola Ansatt, Kari Hansen, Marit Leder, Jonas Vikar — every «Tilknytning» cell reading `Ansatt`, every «Merknad» an em-dash, and the daglig leder deliberately present *as* «Ansatt», so the sheet demonstrates the limit its caveat declares instead of contradicting it. Second half: `mutation-log.txt` beside it records M1 (a `HiredIn` row back) **4 failed**, M2 (correction back) **4 failed**, M3 (hired-in orgnr back) **4 failed**, M5 (caveat deleted) 5, M6/M7 5 each, and the browser arm E1 redding `statute-honesty`. M4 is recorded twice — the first attempt passed and is kept in the log as a bad mutation, redone against a label the caveat does not name. |
| `L-WF-TIMESHEET-RACE` | `../wt-wftsrace/lanes/L-WF-TIMESHEET-RACE/evidence.md` | the exit names the mutation by its content and `mutations.txt` runs exactly it: **`M1 RED : REMOVE THE MAPPING: the catch that answers the loser never engages` — 1 failed / 5 passed, restored → 6 passed.** `evidence.md` carries the other half: the loser's `SaveChanges` threw a `DbUpdateException` nothing mapped, "a 500 with no code", now a 409 `timesheet-period-already-approved` read out of the body with the winner asserted beside it. The file also reports the two mutations that came back **GREEN** (M6 unreachable rethrow, M8 redundant exclusion) rather than hiding them, which is why the log is worth more than the pass count. |
| `L-FLAGS-IMPOSSIBLE-COMMENT` | `lanes/L-FLAGS-IMPOSSIBLE-COMMENT/notes.md` | the exit's first half is a claim about what the API can produce and `notes.md` proves it three times in backend source (`meals.module` → `Features:Meals`, `Margin.*` → the `Margin` section, `workforce.module` grandfathering a store with engagements — which `IStoreFeatureFlagEffectiveResolver`'s own interface doc states, so the sentence was already false when written). Second half: `mutation-proof.txt`, beside it in the same tracked directory, runs both ways the claim would be codified — `isOverruled` made symmetric, and `toRow` normalising `effective` down — each **1 failed / 14 passed on exactly the new test**, then RESTORED 15/15. **I read the comment itself out of `git show 89c2c1f -- utils/platform/flag-board.js` rather than taking the RETURN's word**: the doc block now enumerates both disagreements, marks one WARNED and one ROUTINE, and ends "So `state !== effective` is not the test, and must not become it." |
| `L-EV-ACCEPT-GATE` | `../OkamAPI-ev-acceptgate/WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs` | the falsifiability is **legible in the file, not asserted about it**: every refusal is paired with a success on the SAME token, in the SAME world, through the SAME call, and the two calls differ in exactly one variable — `storeFlagOn`. Remove the gate and the `Assert.ThrowsAsync<EventsProblemException>` in the dark arm fails. Both writes the exit names are covered (`Accept_refuses_..._then_succeeds_for_the_same_token_with_it_on`, `Decline_refuses_...`), plus the idempotent-replay branch. The refusal is pinned to the exact `EVENTS_PROPOSAL_NOT_FOUND` code, so a subject that was merely expired, superseded or mis-stated would fail this suite rather than satisfy it — the confounded-reason trap, designed against. |
| `L-WF-IDEMPOTENCY-REFUSAL` | `../OkamAPI-wfidemref/WebApi.Tests/Workforce/WorkforceIdempotencyTests.cs` | the exit's mutation is pinned by a **paired case rather than by prose**: `An_in_flight_duplicate_is_still_in_progress_and_only_the_recorded_refusal_moves_that_answer` asserts `InProgress` before `RefuseAsync` and the refusal's own code after it, so if the refusal stops being recorded as a completion the second assertion reds. The headline case `A_refused_write_is_recorded_as_a_completion_and_a_same_key_retry_replays_the_refusal` reads the **answer** rather than the status — the stable code, the 409's holder id, `retryable: false` — and `A_refusal_is_a_second_insert_carrying_the_refused_discriminator` shows the two-row shape (`Reserved` never rewritten, `Refused` on the completion key), which is what keeps C1 intact. |

**Verbatim, in the order run:**

```
$ plan verify L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN --evidence docs/plan/artifacts/twenty-three-branches.md
L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN built-unverified -> verified
EXIT_CODE=0

$ plan verify L-STATUTE-EVIDENCE-WORLD --evidence ../web-statute-world/lanes/L-STATUTE-EVIDENCE-WORLD/EVIDENCE.md
L-STATUTE-EVIDENCE-WORLD built-unverified -> verified
EXIT_CODE=0

$ plan verify L-WF-TIMESHEET-RACE --evidence ../wt-wftsrace/lanes/L-WF-TIMESHEET-RACE/evidence.md
L-WF-TIMESHEET-RACE built-unverified -> verified
EXIT_CODE=0

$ plan verify L-FLAGS-IMPOSSIBLE-COMMENT --evidence lanes/L-FLAGS-IMPOSSIBLE-COMMENT/notes.md
L-FLAGS-IMPOSSIBLE-COMMENT built-unverified -> verified
EXIT_CODE=0

$ plan verify L-EV-ACCEPT-GATE --evidence ../OkamAPI-ev-acceptgate/WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs
L-EV-ACCEPT-GATE built-unverified -> verified
EXIT_CODE=0

$ plan verify L-WF-IDEMPOTENCY-REFUSAL --evidence ../OkamAPI-wfidemref/WebApi.Tests/Workforce/WorkforceIdempotencyTests.cs
L-WF-IDEMPOTENCY-REFUSAL built-unverified -> verified
EXIT_CODE=0
```

No refusal, no exit 6. Every path was a file, never a directory — Batch 6's warning was read first and held.

### Declined — 5, which is the number that matters

| lane | what the exit demands | what the named evidence actually proves |
|---|---|---|
| `L-VIPPS-REDACT-404` | an unbound request **and** a percent-encoded route value both reach telemetry with the credential replaced, **shown by fast-tier theory cases** including a trailing-dot deposit link | **no instrument exists, and the lane's own RETURN retracts half the demand.** The evidence line is `worktree /Users/svendaneel/okam/wt-vippsredact, branch lane/vipps-redact-404, commit cb18cab4` — a branch and a SHA, no path. `git diff --stat 3579bbbc cb18cab4` is two files (`Helpers/CapabilityRouteTelemetryInitializer.cs`, `WebApi.Tests/Observability/CapabilityRouteTelemetryTests.cs`); no receipt, no mutation log, nothing under `artifacts/`. And the RETURN says **"H2 OVERSTATED"** — the server percent-decodes into `HttpRequest.Path` before routing, so the escaped form "matched anyway" and what was actually fixed there is a different hole (the unchanged-URL check was fail-open). The exit's second clause therefore describes behaviour that was never broken, which is a re-ruling, not a path. |
| `L-EV-INQUIRY-GATE` | the public enquiry POST answers the module refusal **and the enquiry page renders its refusal card** | **two branch SHAs and two suite counts, and the second half is a render.** `backend lane/ev-inquiry-gate 8ecb47df (174/174) · frontend lane/fe-ev-inquiry-gate f7695bc (94 suites / 2199 tests)` — no path on either side. I checked the frontend ref: `f7695bc` carries `lanes/L-CORE-ORE-LABEL/…` and nothing for this lane, so there is no capture to name. The RETURN's own last line says it: **"OWED: C5 human acceptance"**, and a card rendering is exactly the clause C5 says a suite count may not close. |
| `L-FLAGS-EFFECTIVE-RESOLVERS` | Events, Growth and Meals each report an effective value through their real gate, **pinned by a test that reds if the resolver is removed** | **a green `.trx` cannot show a red.** The only file the evidence names is `lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx` — a 6.1 MB record of 4376 passed / 0 failed. The three mutations the exit's second half needs (DI lines removed, `Handles ⇒ false`, resolver ignores the row) exist only as a sentence in the RETURN. C5 names a `.trx` as inadmissible in terms, and the RETURN concedes it: *"C5 NOT met: this is suite evidence."* **Independently re-measured, and it matters: `grep -c 01010112377` on that trx returns 2** — the checksum-valid fødselsnummer that `evidence-recovered-to-the-trunk.md` held for a ruling rather than move onto the trunk. That hold is correct and this decline does not disturb it. |
| `L-CONFIRM-POSTMERGE-PIN` | the absence assertion **reds on a realistic reordering mutation** or is gone, **and** the doc block above it no longer describes a state the tree left behind | **one half is in the commit, the other is prose.** `git show --stat 02c077cb` is a single file, `WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs`, +38/−10 — the doc-block half is diffable and real. Mutation A ("registration moved back inside `AddMcpAuthentication`", 2 red of 10) and Mutation B were run and written nowhere: no `mutations.txt`, no lane directory (`/Users/svendaneel/okam/wt-postmergepin/lanes/` holds three *other* lanes' directories and none for this one). A two-part exit closed on its diffable part would credit the pin's falsifiability to a commit that cannot show it. **Correction to a sibling for the record:** `twenty-three-branches.md` files this lane under "the branch it names is gone" — `lane/confirm-postmerge-pin` resolves today at `02c077cba65d6dd678e2de746fd55bf805e833f4` in `OkamAPI-modules`. The branch is fine; the receipt is what is missing. |
| `L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED` | four failure kinds each reach the page as a distinguishable localised reason, **shown by tests that red when the safe read is reverted**, and the frontend tier green at the tip | **the path resolves nowhere, and the real files are at a different prefix on an unmerged branch.** `docs/plan/lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED` does not exist in the working tree and is on no ref. The artifacts the RETURN describes are real but live at **`lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/{MUTATION-RECEIPT.md,mutation-receipt.json,TWO-REPO-LANDING.md,core-a6ae241.bundle,mutate.py}` on `lane/every-report-read-says-why` (`6670619d`)**, which is **not** an ancestor of the plan repo's HEAD. This is the `docs/plan/` prefix error a sibling already found in another census, plus a landing: naming a path that resolves nowhere is not something an amendment can fix, and inventing the corrected one would cite a file the checkout does not have. |

### Three things the batch is worth reading for beyond the count

**`plan verify` accepts a worktree path, and that is the gap this family has not closed.** Four of my six
amendments cite `../web-statute-world/…`, `../wt-wftsrace/…`, `../OkamAPI-ev-acceptgate/…`,
`../OkamAPI-wfidemref/…` — precisely the class `evidence-off-the-worktrees.md` ruled out on the grounds that it
"resolves until someone tidies". The tool checks resolvability, not durability, so it said `verified` six times
without noticing. **The mitigation, measured rather than hoped:** every one of those four files is *committed*
on a ref that resolves today — `2ee3fd76` (`lane/statute-evidence-world`, a branch of the plan repo itself),
`bc9c7e96`, `8eee00f7`, `a1d57208` — confirmed with `git cat-file -e <sha>:<path>` on each. So the bytes
survive a `git worktree prune`; only the citation dies. **The rescue owed** is a copy to
`docs/plan/evidence/<LANE-ID>/<filename>` under the established convention and a re-amendment to that path. I
did not make it: copying into `docs/plan/evidence/` is outside this lane's boundary, which permits `exit:`
lines, this artifact and my RETURN and nothing else.

**Two declines are one decision away from being amendable, and both are cheap.** `L-CONFIRM-POSTMERGE-PIN`
needs its two mutation runs written to a file — they were performed, with per-mutation counts, and only ever
spoken. `L-FLAGS-EFFECTIVE-RESOLVERS` needs the same three mutations recorded somewhere other than a `.trx`;
its trx is additionally under a live PII hold, so the answer there is a new receipt, never that file.
`L-VIPPS-REDACT-404` is not in that group: its exit's second clause asks for a fix to something the lane
proved was never broken, so it needs re-ruling before any evidence could satisfy it.

**A landing question rides along and should not be confused with this one.** `twenty-three-branches.md` files
`L-VIPPS-REDACT-404`, `L-STATUTE-EVIDENCE-WORLD` and `L-WF-IDEMPOTENCY-REFUSAL-REST` under "land the branch,
then produce the artifact". Nothing in this pass moved a branch or claimed one landed: `L-STATUTE-EVIDENCE-WORLD`
is now `verified` because its committed PDF and its mutation log establish its exit, **not** because the
capability is on a trunk. A verified exit and a landed branch are different facts and this artifact asserts only
the first.

## Batch 2

Twelve lanes read one at a time — exit, RETURN, and the evidence that RETURN names, opened rather than
taken on report. **7 amended, 5 declined.** Only `exit:` lines inside `## Lanes` were touched; no lane body,
no `evidence:` line, no decision, no flag (the `state:` moves are `plan verify`'s own, not edits). Backend
trunk `6d5328004`, unmoved. No build, no tier, no jest, nothing pushed; the demo APIs on `:5091` and `:5941`
were left alone.

The question asked of each was not "does a file exist" but **whether the thing the RETURN named establishes
the sentence the exit demands**. Seven did. Five named something adjacent, something weaker, or nothing a
tool can open — and in three of those five the *work* is plainly done; what is missing is a recorded
instrument, which is a different repair from a rewritten exit.

### Amended — 7, and `plan verify` accepted all 7

| lane | path appended | why the evidence establishes the exit |
|---|---|---|
| `L-PDF-NULLDEREF` | `lanes/L-PDF-NULLDEREF/red.txt` | tracked in this repo. It names **all six** call sites by `Controller.Action` + `file:line`, each with the real `NullReferenceException` frame taken from the host's own log with the fix mutated away, `Expected: BadGateway / Actual: InternalServerError` per theory case, and `47 passed / 0 failed` after restoring. Both halves of the exit — handled error on six sites, and a pin that reds when the null returns — are in the one file. It also records **two more** live routes the exit did not count; that is more than the exit demands, not less. |
| `L-ROUTE-GUARD-GAPS` | `../OkamAPI-modules/lanes/L-ROUTE-GUARD-GAPS/mutation-log.md` | tracked at the backend trunk. Half one is the eight-row table W1–W8, where `mottaker`, `kontonummer` and `navn` were each introduced **as a real route parameter** on `cancel/{giftcardId}/…` and reddened (1 failed / 49), with a near-miss per word staying green. Half two is the ignore-shape mutant run once per phone-bearing action: M-A `TransferGiftcard(…, null)` and M-B `SetPhoneNumber(null, …)` leave the guard class **69/69 green** while the wire suite reds 3 cases — which is exactly "ignored rather than merely deleted". |
| `L-WF-CORRECTION-PATH` | `../OkamAPI-modules/WebApi.Tests/Wire/WorkforceWireTests.cs` | on the trunk, named by the evidence line. `A_manager_corrects_a_personalliste_entry_and_the_register_records_who_and_when` drives `POST …/corrections` over the wire and asserts `correctionActorReference == WireHostFixture.AdminAStaffMemberId.ToString()` — by value, on the response body **and** on the appended row read back out of the database — plus `correctedAtUtc` non-null for the "and when". The production path is real: `Controllers/WorkforcePersonnelListController.cs:80` carries the route on the same trunk. |
| `L-GR-CONFIRM-STALE` | `../OkamAPI-modules/artifacts/tests/771c0fc0a6504971fb1cfdab5eed4ab878582ab5/RUN.md` | tracked at the backend trunk, and the only named instrument that carries the falsifiability half: its mutation table records **M1 — the `RequireAddressNotSuppressedAsync` call removed → all 4 pins red**. The scenario the exit names is driven literally, not asserted: `GrowthTestSendReachabilityTests.An_address_the_channel_has_since_recorded_as_undeliverable_cannot_authorise_a_test_send` advances the clock `TimeSpan.FromDays(365)`, asserts `EmailConfirmed` is still true, then kills the mailbox and takes the refusal. *Recorded rather than smoothed over:* the check is a re-read of dated evidence, not an age test, so a recycled mailbox that quietly **accepts** mail still authorises — the RUN.md says so itself. That case is not the one the exit names, which is why this is an amendment and not a softening. |
| `L-COMPROOT-PIN-OVERDETERMINED` | `../OkamAPI-modules/WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs` | on the trunk. The ordering claim is **entailed by the source, not promised by prose**: `An_empty_mcp_section_outside_development_throws_before_any_limiter_is_registered` asserts `DoesNotContain` for `IMemoryCache` and `IClientIdMetadataDocumentService`, and I checked at the trunk that `ServiceCollectionExtensions.cs` still calls `ValidateOpenIddictCertificates` at `:48` and registers those two at `:58`/`:59` **in that same method** — so moving the validation below the block makes them present and reds it. The new `A_successful_mcp_registration_registers_no_reservation_limiter` is fenced by two `Contains` lines so it cannot pass by early bail-out. *Named rather than hidden:* the mutation runs themselves were done in a throwaway worktree the RETURN says it removed, so no artifact records the red — the file establishes the exit by construction, which is why it is the path appended. |
| `L-GR-TESTSEND-RATELIMIT` | `../OkamAPI-modules/WebApi.Tests/Wire/ArbitraryAddressMailRateLimitWireTests.cs` | one file on the trunk carrying **both** halves the exit names: `The_test_send_route_stops_one_administrator_past_the_cap_and_serves_the_next` (drives to `GrowthPublicRateLimiter.TestSendPerActorLimit`, takes `429`, then shows a **different** actor still served, which no blanket refuser satisfies) and `The_confirmation_code_route_stops_mailing_one_address_past_its_cap` for the profile-email change. Removing either limiter turns an asserted `429` into a `200`, so "reds if either limiter is removed" is entailed. The lane's commit `c96cd21e0` is in the trunk's history for this file. *Why not the two `.trx` the evidence line leads with:* both are green tier runs and a green run cannot show a pin failing. |
| `L-CENSUS-FLOORS-DERIVED` | `../OkamAPI-modules/WebApi.Tests/Modules/ModuleActorStampPin.cs` | the RETURN named the worktree commit `75dcc2ff`; that commit is in the trunk's history (`75dcc2ff6`, landed by `d375f5479`), so the file is openable by a stranger. At the trunk it carries **no** `KnownFiles`, `KnownSiteFloor`, `KnownResolverFloor` or `KnownGuardFloor` — grep returns nothing for `Floor` or `KnownFiles` — and its own doc comment states the exit's second clause: *"Every one of them was a number somebody typed… each module's numbers sit in their own region of this file, so lanes editing different modules merge without git objecting… The count is now taken from the other end, so there is no number here for a merge to leave behind."* The derivation lives beside it in `ProductionAssemblyActorSites.cs`. |

**Verbatim, in the order run:**

```
$ plan verify L-PDF-NULLDEREF --evidence lanes/L-PDF-NULLDEREF/red.txt
L-PDF-NULLDEREF built-unverified -> verified
EXIT_CODE=0

$ plan verify L-ROUTE-GUARD-GAPS --evidence ../OkamAPI-modules/lanes/L-ROUTE-GUARD-GAPS/mutation-log.md
L-ROUTE-GUARD-GAPS built-unverified -> verified
EXIT_CODE=0

$ plan verify L-WF-CORRECTION-PATH --evidence ../OkamAPI-modules/WebApi.Tests/Wire/WorkforceWireTests.cs
L-WF-CORRECTION-PATH built-unverified -> verified
EXIT_CODE=0

$ plan verify L-GR-CONFIRM-STALE --evidence ../OkamAPI-modules/artifacts/tests/771c0fc0a6504971fb1cfdab5eed4ab878582ab5/RUN.md
L-GR-CONFIRM-STALE built-unverified -> verified
EXIT_CODE=0

$ plan verify L-COMPROOT-PIN-OVERDETERMINED --evidence ../OkamAPI-modules/WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs
L-COMPROOT-PIN-OVERDETERMINED built-unverified -> verified
EXIT_CODE=0

$ plan verify L-GR-TESTSEND-RATELIMIT --evidence ../OkamAPI-modules/WebApi.Tests/Wire/ArbitraryAddressMailRateLimitWireTests.cs
L-GR-TESTSEND-RATELIMIT built-unverified -> verified
EXIT_CODE=0

$ plan verify L-CENSUS-FLOORS-DERIVED --evidence ../OkamAPI-modules/WebApi.Tests/Modules/ModuleActorStampPin.cs
L-CENSUS-FLOORS-DERIVED built-unverified -> verified
EXIT_CODE=0
```

### Declined — 5, exits left exactly as they were

**`L-STATUTE-HONESTY` — the evidence proves a different window, and half the exit is in no capture at all.**
The exit wants the banner to name **a post-*issue*** dietary statement, and both captured under
`artifacts/journeys/`. Three separate misses, each read off the capture rather than inferred:

1. The capture's own step 9 reads *"an allergy written down after the sheet was **composed**"*, and the
   RETURN is explicit that this was deliberate — *"Composition, NOT issue: a statement made in the
   compose→issue window is still not on the paper, and my first test asserted the opposite and was wrong."*
   Amending here would mean recording a post-composition proof against a post-issue demand.
2. **The CSV appears in no capture.** The journey has ten steps; steps 3–6 are the sheet and the A4 print,
   7–10 the run sheet. The kodeoversikt CSV is rendered by the backend and pinned by a backend test in a
   *second* unpushed worktree (`../OkamAPI-statute` @ `485959ab`) — so "both captured under
   `artifacts/journeys/`" is false of the CSV however the first clause is read.
3. The capture's own `findings` block records a **live `defect`**: the false version sentence is still
   printed beside the new line, because `isStale` is the server's boolean. The banner therefore does not
   name the dietary statement as *its own* cause; it names it alongside a cause that did not fire.

Beside those, `artifacts/journeys/statute-honesty/` exists only in `../web-statute` (unpushed, `f01886a0`)
and nowhere in either trunk, and the run-sheet half was captured against `"backend": "fixture"`.

**`L-REVIEW-RESIDUALS` — two-part exit whose halves cannot both be true of any one tree.**
The provider half is genuinely done and is even **at the trunk** (`GrowthMailProviderContractTests.cs:451`
walks `typeof(IGrowthMailProvider).Assembly`). The re-zoning half is not: `WebApi.Tests/StoreMarket/
StoreMarketAnchorBehaviourTests.cs` **does not exist at the trunk**, and its proof lives untracked at
`../wt-resid-rezone/.lane/L-REVIEW-RESIDUALS-rezone.md`, in an ephemeral worktree, beside a `.trx`
(`4a9cbb9c`) that is at the trunk under no name. The RETURN says why in its own words: *"the two commits
cannot be merged as one lane. Each rides its own guard's branch"* — one on `lane/growth-health-honest`, the
other on `lane/wf-export-duplicate`. An exit reading "both shown by fast-tier tests" asserts one tree in
which both hold, and there is no such tree today. No single path can be appended without implying otherwise.

**`L-WF-ADJUST-ADDRESS` — the RETURN names no instrument, and the two halves sit in two unpushed worktrees.**
The evidence line is two bare SHAs: `OkamAPI-wfadjust f3887f9a + web-wf-adjust e9ba89e`. No artifact was
written, and neither repo has a `lanes/L-WF-ADJUST-ADDRESS/` directory. Opening the commits shows the work
is **done** — backend `f3887f9a1` *"The attendance grid names the punch a correction addresses"* adds
`WebApi.Tests/Wire/WorkforceAttendanceCorrectionWireTests.cs`, frontend `e9ba89e2` is titled *"The rates
page offers the punch correction it used to refuse to fake"* and touches `pages/admin/workforce-rates.vue` —
but the wire test carries only the read half and lives on an unpushed branch, while the rates-page half is a
second unpushed commit in a second repo with nothing recording it. There is no one openable path that
carries both halves, and appending the wire test alone would record half an exit as if it were the whole.
**This lane needs an artifact committed, not a rewritten exit.**

**`L-THE-EVIDENCE-A-STRANGER-CANNOT-REACH-IS-COMMITTED` — the exit is a universal with two buckets, and one
artifact is in neither.** `twenty-one-proofs-committed.md` states its own counts: committed and accepted
**20**, committed but still refused **0**, unrecoverable **0**, *left untouched by standing prohibition* **1**.
That fourth row is a third bucket the exit does not offer: `L-THE-LIVE-WORLD-RUNS-THE-BRANCH`'s artifact in
`web-livewalk` is neither committed-and-accepted nor recorded-as-unrecoverable-with-the-reason. The artifact
argues, correctly, that calling it unrecoverable would be wrong — which is exactly why the exit is unmet
rather than satisfiable by relabelling. Second and larger: the RETURN says *"Input was my own prior artifacts
and `lanes/L-WHY-469/`; tracked-ness was not re-derived"*, so **"every artifact named by a built-unverified
lane and currently committed nowhere" was never enumerated afresh** — twenty-one is an inherited list, not a
derived universe, and ninety-one lanes are in this plan's instrumentless cohort alone. The work is real and
valuable; the exit's universal is not what was shown.

**`L-LIVE-WORLD-SECOND-HUMAN` — the exit demands a live capture and the RETURN says there is none.**
Its own log: *"NO CAPTURE: this lane has no SQL slot, so no live world was stood up."* The evidence line is
four source citations on `feature/restaurant-modules 8e2b57de` — a **boundary analysis**, and a good one: two
no-SMS doors, path 3 read correctly as a lock-out, and the owner act named precisely
(`AppSettings__AdminUserPhoneNumber` set to a digit phone, because `ServiceCollectionExtensions.cs:182`
limits user names to `+0123456789` and the placeholder is a sentence). But the exit asks for
`live-world.sh` to provision two signed-in identities **and a run in which one publishes and the other
acknowledges**. That is a walk, and by **C5** a walk is never closed by a file. It also still needs an owner
act, so no file could close it even if a capture existed. Declined on both grounds, and the lane's real
output — the boundary plus the third wall it found (`ack #44` gates on `workforce.selfservice`, which
`DefaultOn` does not hold) — belongs where `F-LIVE-WORLD-ONE-HUMAN` can read it.

### What this batch says about the cohort

Where an exit could be recorded, the instrument was usually **already on the backend trunk** — five of the
seven amendments point at a file a stranger can open today, and two at a `lanes/…` artifact the lane wrote
deliberately. Where it could not, the pattern is uniform and is **not** that the work is missing: three of
the five declines are lanes whose code is built and whose proof sits in an unpushed worktree or a removed
one. The repair those need is a committed artifact, not a softer sentence. The two that are not of that
shape — a universal shown over an inherited list, and a walk with no walk — are the two that should stay
`built-unverified` on the merits.

## Batch 5

Eleven lanes, each read as three documents — the `exit:`, the RETURN under `docs/plan/returns/`, and the
evidence that RETURN names. **5 amended, 6 declined.** Only `exit:` lines inside `## Lanes` were touched: no
lane body, no `state:` line, no `evidence:` line, no decision, no flag, no `plan accept`. Backend trunk
`6d5328004`, unmoved. No build, no tier, no jest, nothing pushed, neither demo API touched.

**The rule this batch applied to the path.** Six of the eleven RETURNs name a `wt-*` or `OkamAPI-*` worktree.
Those resolve today and die on `git worktree prune` — the shape already measured at 153 `path-gone` refusals
in `why-verification-is-refused.md`. So a citation was written only where the artifact opens from the **plan
repo working tree** or from the **backend repo at trunk**, and the worktree copy was treated as a convenience
rather than the record. Where a lane's proof lives *only* inside a worktree on a branch that is not an
ancestor of the trunk, that is stated as the decline reason rather than papered over with a path that will
stop resolving.

### Amended — 5, and `plan verify` accepted all 5

| lane | path appended | why the evidence establishes the exit |
|---|---|---|
| `L-DOWNLOAD-PDF-WIRE` | `../OkamAPI-modules/WebApi.Tests/Wire/PdfDownloadWireTests.cs` | the exit names four documents; the file's `PdfDownloads()` theory data carries exactly those four rows — order receipt, giftcard receipt, invoice, and the wolt-drive delivery statistics PDF — and `A_cross_origin_browser_can_read_the_name_of_every_pdf_download` drives each over a real `HttpClient` with an `Origin` header, asserting `HttpStatusCode.OK`, the exact `Content-Disposition` filename, its CORS exposure, `application/pdf` and a non-empty body off one response. The exit's first arm is met outright, so its `or` never has to be exercised. On the trunk. |
| `L-UTLKVIT-SALE-ROW` | `../OkamAPI-modules/WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs` | all four halves are separate named facts addressed at `saleId`: `Viewing_the_credit_sale_row_returns_the_handover_document`, `Printing_..._puts_the_marked_handover_document_on_paper` (asserted on the ESC/POS bytes, not just the model), `The_public_page_behind_the_sms_link_shows_the_handover_document` (token minted by the real `SendReceiptSmsAsync`), and two copy refusals. A cash-sale positive control runs in the same world, so absence is measured where presence is demonstrable. On the trunk. |
| `L-WF-EXPORT-DUPLICATE` | `../OkamAPI-modules/lanes/L-WF-EXPORT-DUPLICATE/evidence.md` | the RETURN named this file inside `wt-wfexpdup`; commit `3a4442a7` **landed it into the backend repo** at the same relative path, so the citation outlives the worktree. It records the injection probe that reproduced Expected 1 / Actual 2 before any fix, and `TimesheetExportDuplicateRaceSqlServerTests` (also on the trunk) carries the exit's exact distinction: `Two_concurrent_full_exports_leave_exactly_one_succeeded_batch`, a `sys.indexes` assertion that the **migration chain** installed the index, and `With_the_index_dropped_the_same_race_writes_the_duplicate` — which is what makes "refused at the database rather than by a pre-commit read" a measured claim rather than a design note. |
| `L-TRAIN-READONLY-VISIBLE` | `lanes/L-TRAIN-READONLY-VISIBLE/shots/after-setup-row.png` | the exit asks what an operator *reading the row* can tell. The shot shows the rendered `training.setup` row with `Faktisk: av` beside the sentence *"Når denne står av, avvises skriving — lesing fortsetter"* — both halves of the exit in one line, above its own switch. `before-setup-row.png` is the same row with nothing. `after-assignments-row.png` carries the second row's own sentence, and `mutation-proof.txt` reds all nine ways the sentence could be wrong (M6 drops the store that does go dark, M7 stops saying the submit stays live). Cited as one file because a directory is not an instrument. |
| `L-MEALS-POS-TENDER-WIRE` | `../OkamAPI-modules/WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs` | the exit's whole point is *not inserting the receipt*, and the test drives `Settlement.AddAllocationAsync` then `Settlement.FinalizeAsync` and reads back what production wrote: the `OrderPayment`, a `SALREC` `JournalEntry`, and the two joined by `JournalEntryId`. `A_cash_tender_settles_in_the_same_world` is the presence control; two refusal arms bound it. Nothing seeded. On the trunk. |

`plan verify`, run after each amendment, verbatim:

```
L-DOWNLOAD-PDF-WIRE built-unverified -> verified
L-UTLKVIT-SALE-ROW built-unverified -> verified
L-WF-EXPORT-DUPLICATE built-unverified -> verified
L-TRAIN-READONLY-VISIBLE built-unverified -> verified
L-MEALS-POS-TENDER-WIRE built-unverified -> verified
```

All five exited 0. No `--override` was used and none was needed.

### Declined — 6, each for a different reason

| lane | what the exit demands | what the evidence proves instead |
|---|---|---|
| `L-GR-TESTSEND-GUARD` | **a wire test** proving a test-send to an arbitrary address is refused or attributed | `GrowthTestSendBindingTests` is on the trunk and the guard is real, but it is a **controller-invocation** test in `WebApi.Tests/Growth/`, not a wire test: `var refused = (ObjectResult)await owner.TestSend(...)` / `Assert.Equal(403, refused.StatusCode)` — no HTTP, no middleware, no policy. Its own docstring argues why that is *"the only way it is real at the wire"*, and the RETURN states the position outright: *"A 401 wire pin is undriveable, so I wrote none."* An argument for a lower tier is not the tier the exit named. **The exit must not be softened to "a test"** — that is the edit this plan exists to prevent. |
| `L-EV-GUEST-ORIGIN` | a committed configuration under the ruled domain **and** an initiate with no origin refusing, **both** at the wire tier | the RETURN says which half it kept, in its first line: *"WHICH HALF I KEPT, for merge order: the CONFIGURATION only."* `EventsGuestOriginConfigurationWireTests.cs` on the trunk holds exactly two tests — `The_committed_configuration_names_a_guest_origin_under_the_ruled_domain` and `The_running_host_binds_that_key_onto_the_property_the_module_reads`. Neither drives an initiate. The refusal half belongs to `lane/ev-vipps-fallback-2 @ fc09be1d`, a different lane's work. **Two-part exit, one half shown.** |
| `L-WF-CLOCK-WIRE` | four distinctions **and** a clock-state read, shown at the wire tier | the six tests exist and cover all four, but only at `f14c91ec`, which is **not an ancestor of the trunk**; `WebApi.Tests/Wire/WorkforcePosClockWireTests.cs` is absent from `6d5328004` and lives only in `wt-wfclockwire`. Worse for the citation: `git grep clock-state -- 'Controllers/*.cs'` at the trunk returns **nothing**, so the read the exit's fourth clause names is not in the estate at all. The `sessionState` half did land — as `WebApi.Tests/Workforce/PosClockOutStateWireTests.cs` via the sibling `L-CLOCKOUT-STATE-IS-NOT-OPEN`, whose own evidence file describes the wire this lane's branch would have produced. Citing the worktree would put `verified` on a route no trunk carries. |
| `L-EV-OUTBOX-FLAKE` | the assertion **in `EventsOutboxDeliveryTests`** cannot alias, pinned by a **seeded token** that reproduces the historical failure | the pin is real at `59a1d607`, which is **not an ancestor of the trunk**. The trunk's copy of the class the exit names by name carries a *different, weaker* fix: it excises the link (`var beyondTheLink = body.Replace(link, ...)`) but keeps a **random** `row.PublicToken` and the bare needles `Assert.DoesNotContain("250", beyondTheLink)`. No `AliasingToken`, no `PinPublicTokenAsync`, no digit inventory. So the exit's sentence is false of the class it names, the file has since diverged where the branch would have to merge, and the only copy holding the pin is `OkamAPI-evoutboxflake`. Evidence genuine, exit not established of the estate. |
| `L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR` | four reads surface their failure, shown by a test that reds when the surfacing is removed, **and** the frontend tier green at the tip | the evidence line names `docs/plan/lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR`, which **does not exist** — and would be refused as a directory even if it did. The real artifacts are `lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/{mutate.py,mutation-receipt.json}` plus `test/statistics-reads-surface-their-failure.test.js`, all on the **unmerged** branch `lane/a-failed-report-read-reaches-the-operator` (`6d43520`), not in this repo's working tree (HEAD `wip/session-2026-08-06-all-work` `b704d45e`) and not an ancestor of it. Nothing openable today; a landing lane, not a wording fix. |
| `L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK` | each of six is landed with the tier green at the composed tip **or recorded as unlandable with the reason, with the count of each stated** | the evidence is two SHA ranges and two suite counts. The landings are checkable — `d30c1c4d4` is an ancestor of `6d5328004` — but the exit's *other* arm asks for a **record**, and there is none: `lanes/L-SIXLAND/` exists and is **empty**, and no artifact names `wf-demo-presence` or its reason. The refusal, the reason and the 5-of-6 count exist only as prose inside the lane's own RETURN, which is the lane's account of itself, not the instrument its exit demanded. The "tier green at the composed tip" half rests on bare counts with no run artifact, which C5 refuses as a reason a capability is finished. |

### What this batch does not claim

The five amendments say that the named file establishes the exit's sentence and that `plan verify` accepted it.
They do **not** say the capability is reachable by an operator, and the C5 residue each RETURN recorded is left
standing: `L-MEALS-POS-TENDER-WIRE` has no "Bedriftskonto" tender button in the frontend (FE-MLS-8) and leaves
the kassasystemforskrifta § 2-8-2 credit-sale count open (BE-MLS-6); `L-UTLKVIT-SALE-ROW` says plainly that no
operator can create a credit sale at the till yet, so what it changes is which document comes out the day that
opens; `L-WF-EXPORT-DUPLICATE` has no timesheet UI to walk at all; and `L-TRAIN-READONLY-VISIBLE`'s own RETURN
ends *"no operator has read it yet"*. A verified exit and an accepted journey remain different facts.

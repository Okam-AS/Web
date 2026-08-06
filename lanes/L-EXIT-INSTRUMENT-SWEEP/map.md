# L-EXIT-INSTRUMENT-SWEEP — the instrument map

Read-only lane. Nothing outside this directory was edited. No container started, no migration
authored, nothing pushed. `plan` was loaded as a module and only `exit_tokens`,
`names_the_instrument`, `_evidence_kind_ok` and `provenance` were called — no state was mutated.

---

## 0. The count, re-measured with the tool's own tokenizer rather than mine

**88 confirmed, exactly.** Not by re-implementing the match — by importing
`/Users/svendaneel/.claude/skills/plan-hub/bin/plan` and calling `exit_tokens()` on the `exit:` of
every `built-unverified` lane. That is the same function `plan verify` calls, so this is the set the
tool itself cannot verify, not a set I inferred.

- 122 lanes at `built-unverified` (106 block-form + 16 `[B]` bullets under *Lanes — landed*)
- 14 exits yield a `fact:` token
- 20 exits yield a path token (19 of them the single token `artifacts/journeys/`)
- **88 yield neither** — the set below

My own hand-rolled pass said 89. The extra was `L-WF-BOOTSTRAP`, whose exit *does* name
`Scripts/demo/seed-workforce-demo.sh`. It is not in the 88 and it is not verifiable either, for a
different reason worth recording: `names_the_instrument` accepts a path token, but
`_evidence_kind_ok` then requires the evidence path to exist **relative to this repo's root**, and
`Scripts/demo/…` is a *backend* path. So its exit names an instrument that can never be reached from
where the tool stands. **One lane, one distinct failure mode: a correctly-named instrument in the
wrong repo.**

---

## 1. Four measurements that change what "give it an instrument" means

These were taken before any row below was written, because three of them invalidate the obvious
prescription.

### 1.1 `docs/plan/` is not in git. At all.

```
git ls-files docs/plan/  ->  0 files
git status --short docs/ ->  ?? docs/plan/
```

Not gitignored — never committed. **The plan, all 152 returns, and all 22 review documents exist only
in this working tree.** The 22 review lanes that were made verifiable this evening by naming
`docs/plan/reviews/*.md` are naming files that a fresh clone does not have. `plan verify` accepted
them because `_evidence_kind_ok` calls `os.path.exists`, which knows nothing about git.

That was the right call for those 22 — the document *is* the deliverable — but the durability claim
attached to it is wrong. **This is the same "dies with its worktree" hazard the brief warned about,
one level in and inside the repo rather than outside it.**

### 1.2 `artifacts/` is gitignored **by design**, and 19 of the 20 already-instrumented exits point into it

`.gitignore:98` is `artifacts/`, above a comment that says so deliberately: *"The FILES are a record
of a run, not source, so they are not committed."* Sixteen files under `artifacts/` are force-added;
the rest are not. `artifacts/journeys/workforce-flag-lever.playwright.json` — cited as evidence by
`L-FLAGS-NOTE-FALSIFIABLE` — is ignored and untracked.

So the 20 lanes whose exits say *captured under `artifacts/journeys/`* are already, by the tool's
rule, instrumented; and their instrument is a directory git is configured to discard. Not a defect to
fix in those exits — but it means **"name a journey capture" is not a durability upgrade over "name a
worktree file"**, and every row below that prescribes a capture says so.

### 1.3 The plan's only journey probe is inadmissible as evidence

```
journeys.browser   journey   artifacts/journeys/*.json   exists
```

`_evidence_kind_ok` refuses any `fact:` whose probe uses the `exists` extractor — *"a file being there
is not a claim about what it says"*. **So `fact:journeys.browser` can never verify anything.** The
same refusal kills `acct.uidx`, `wf.idreg` and `train.checklists`, all `exists`. And `be.tests`,
`fe.tests`, `fe.tests.failed` are `suite`-kind, refused by guard 1.

Of 34 declared probes, **7 are structurally inadmissible as verification** and several more read
`unconf` today. Any row below that prescribes a new probe therefore also prescribes its **extractor**,
because `exists` would be a probe that cannot fail.

### 1.4 The backend checkout the probes read is standing on a lane branch

```
../OkamAPI-modules  HEAD -> lane/meals-grace-pins @ 34c6c103
integration tip     feature/restaurant-modules @ 3579bbbc
```

Every `../OkamAPI-modules/…` probe currently reads a lane branch's tree. `fact:be.tests = 4351 passed
/ 0 failed` was extracted from `.trx` files sitting in that lane's `artifacts/tests/`. This is
`F-PROBE-ROOT-WRONG-WORLD` firing for real, and it is a precondition on **every backend row below**.

And the harder half, measured: of 14 files named by these lanes as their own deliverable,
**13 do not exist on `feature/restaurant-modules`**:

```
WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs          absent on integration
WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs       absent
WebApi.Tests/Wire/DownloadHeaderWireTests.cs               absent
Helpers/BrowserReadableHeaders.cs                          absent
WebApi.Tests/Wire/PdfDownloadWireTests.cs                  absent
WebApi.Tests/Wire/PdfRendererOutageWireTests.cs            absent
WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs  absent
WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs absent
WebApi.Tests/Growth/GrowthTestSendBindingTests.cs          absent
WebApi.Tests/Growth/GrowthTestSendReachabilityTests.cs     absent
WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs absent
WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs       absent
WebApi.Tests/Wire/MealsQuoteReleaseWireTests.cs            absent
Scripts/demo/demo-up.sh                                    present
```

**This is the finding under the finding.** For roughly two thirds of the 88, the exit is not the
binding obstacle — the merge is. A probe pointed at the right file today reads absent, and will keep
reading absent however well the sentence is written. **Writing these exits before landing the branches
buys nothing except a queue of probes that all say `unconf`.**

### 1.5 Evidence durability, re-measured against the brief's numbers

The brief reported 27 committed / 23 worktree / 12 commit-or-branch. Re-measured over the 88, with
"committed" meaning *in `git ls-files`* rather than *on disk*:

| bucket | count | note |
|---|---|---|
| evidence resolves to a **git-tracked** path in this repo | **8** | durable |
| resolves to a path **on disk but untracked** | 21 | evaporates on clone or `git clean` |
| points into a **session scratchpad** | 1 | `L-WF-DEMO-PRESENCE` -> `/private/tmp/claude-501/…/scratchpad/final-run.txt` |
| names a **foreign worktree** only | 40 | all 47 such paths exist today; 205 `wt-*` dirs are alive |
| resolves to **nothing** (sha, branch, or bare prose) | 18 | |

**The 27 was measuring `os.path.exists`, not git.** Only 8 of the 88 have evidence that would survive
a clone. That is the number the orchestrator should plan against.

The 8: `L-PRICE-NULL-ZERO`, `L-LIVE-WORLD-SEED`, `L-LIVE-WORLD-STAFF`, `L-LIVE-WORLD-RESTORE`,
`L-LIVE-SEED-VIA-PRODUCT`, `L-FE-WF-ONBOARD-WALK`, `L-JOURNEY-GUARD-FAIL`, `L-ARTIFACT-RANK-KEY`.

---

## 2. Stale exits — flagged separately, because a stale exit verifies against the wrong thing

Four were already known. **Four more found, plus one duplicate pair and one counter-example.**

| lane | the exit says | the lane's own return measured | 
|---|---|---|
| `L-GR-DISPATCH-ACTOR` | newsletter dispatch **+ margin statement + push record** | re-scoped to the newsletter alone (known) |
| `L-CONFIRM-FAMILY-MERGE` | the **five** true heads | six (known, `D-CONFIRM-SIXTH-HEAD` open) |
| `L-CORE-ORE-LABEL` | **every client** reading the shared price helper | ruling scoped it to consumers (known) |
| `L-ARTIFACT-RANK-KEY` | **every artifact** records which backend build answered it | 2 of 22 (known) |
| **`L-PDF-NULLDEREF`** | a handled error on **all six call sites** | *"the count was six of twelve, with two more one hop away… **Eight live routes, not six.** Both extra ones fixed and pinned"* |
| **`L-CLIENT-TRAILING-SLASH`** | **the confirm route** is posted in the same shape as its siblings | *"the brief was wrong on scale by a factor of thirteen… **thirteen paths end in a slash**… It fixed all thirteen"* |
| **`L-FE-JOURNEYS-MERGE`** | **the four** journeys the plan records as lane-only | *"The plan marks **six** walks lane-only, not four, and two of those had already landed… The remaining four matched the briefed number **by coincidence**"* |
| **`L-EV-REFUND-FAKE-ARG`** | the tests pass **at the branch tip** | the work is on `lane/ev-refund-fake-arg @ db9b39a1`, unmerged; and the title still says *"three SQL-tier failures"* where the return measured **one** |

`L-PDF-NULLDEREF` is the worst of the four new ones: an exit satisfied by six call sites would be
*passed* by a tree in which the two the lane actually found and fixed had been reverted.

**Duplicate claim on one deliverable — not staleness, but the same class of harm.**
`L-COMPROOT-PIN-OVERDETERMINED` and `L-CONFIRM-POSTMERGE-PIN` are two lanes whose evidence is **the
same commit `02c077cb` in the same worktree `wt-postmergepin`, touching the same one file
`WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs`**, and whose exits describe the same assertion
from two angles. One of the two should be retracted or explicitly declared the follow-on half;
verifying both against one commit counts one piece of work twice.

**The counter-example, recorded because it is the hygiene precedent to copy.** `L-MEALS-REACHABLE`
was re-scoped on 2026-08-03 when `D-MEALS-STATEMENT-LEVER` ruled `tell-the-truth`, and **its exit was
rewritten to match the ruling** — it now asks for the opposite of what it originally asked for, and
says so in its body. That is what the four above did not get.

---

## 3. The three cases, applied

Legend for the *instrument* column:

- **`PATH`** — case 1, the artifact **is** the deliverable: name this existing path in the exit.
- **`PROBE`** — case 2, the artifact is a **record about** the deliverable: the exit needs a probe
  that does not exist yet. Given as `key  kind  source  extractor`.
- **`NONE`** — case 3, no instrument can exist under this standard. Reason given.

Two rules applied throughout, both from the tool's own code rather than from taste:

1. A prescribed probe **never uses `exists`** (§1.3). Where the only honest extractor would be
   `exists`, the row is `NONE`.
2. Naming a pin file proves **the pin exists and names its case**, not that it is green. Guard 1
   makes suite counts inadmissible, so that is the ceiling the standard sets. Every `PROBE` row below
   is a presence-on-branch claim, and none of them should be written up as a behaviour claim.

### 3.1 Case 1 — the artifact IS the deliverable (14 lanes)

| lane | instrument to name in the exit | durable? |
|---|---|---|
| `L-LIVE-WORLD-SEED` | `PATH lanes/L-LIVE-WORLD-SEED/events-deposit-precondition.live.playwright.json` | tracked |
| `L-LIVE-WORLD-STAFF` | `PATH lanes/L-LIVE-WORLD-STAFF/workforce-schedule-publish.live.playwright.json` (+ `…flag-lever…`) | tracked |
| `L-LIVE-WORLD-RESTORE` | `PATH lanes/L-LIVE-WORLD-RESTORE/09-chain-three-journeys.txt` | tracked |
| `L-LIVE-SEED-VIA-PRODUCT` | `PATH test/e2e/scripts/live-world.sh` — the exit's own second branch is *"or the script says truthfully why they cannot be"*, so the script's text **is** the deliverable | tracked |
| `L-JOURNEY-GUARD-FAIL` | `PATH test/e2e/scripts/guard-proof.js` | tracked |
| `L-ARTIFACT-RANK-KEY` | `PATH lanes/L-ARTIFACT-RANK-KEY/mutants/mutation-report.txt` — **but fix the stale scope first** (§2) | tracked |
| `L-FIXTURE-DIVERGENCE` | `PATH test/e2e/scripts/fixture-divergence.js` — the check **is** the deliverable, not `receipts.txt` | tracked |
| `L-EV-ONBOARD-PRINT-BLEED` | `PATH artifacts/journeys/events-runsheet-onboarding/run-sheet-onboarding.pdf` — the exit already says *"measured on the produced PDF"*; this is that PDF | on disk, **gitignored** |
| `L-JOURNEY-EVIDENCE-SWEEP` | `PATH lanes/L-JOURNEY-EVIDENCE-SWEEP/verification-map.md` | on disk, **untracked** |
| `L-BLOCKER-RESTATE` | `PATH lanes/L-BLOCKER-RESTATE/verdicts.md` | on disk, **untracked** |
| `L-FLAGS-JOURNEY-SWEEP` | `PATH lanes/L-FLAGS-JOURNEY-SWEEP/census.md` — a sweep's census **is** its output; the twelve captures are the record about | on disk, **untracked** |
| `L-GR-DEADLINE-STATUTE` | `PATH` the obligation doc the lane amended. Exit reads *"named in the obligation's own doc, and the timezone reading is recorded"* — for that branch the doc is the deliverable. **The lane's return does not give the doc's path**; it must come from `lane/gr-deadline-statute @ f7abfd8e` | worktree |
| `L-STATUTE-EVIDENCE-WORLD` | `PATH artifacts/journeys/statute-honesty/01-personalliste-with-coverage-caveat.pdf` for the *"committed PDF shows only rows the product can produce"* half. The *"a test reds if…"* half is case 2 | worktree, then gitignored |
| `L-GUARD-W0` | `PATH lanes/L-GUARD-DEMO/demo-run.txt` — **note the lane-id/dir mismatch**: lane `L-GUARD-W0`, directory `lanes/L-GUARD-DEMO/`. Alternatively `fact:fe.world` + `fact:be.world` already exist and are `meta`-kind with `json:` extractors, i.e. admissible; they prove the worldstamp collector half but not the hook-channel half | on disk, **untracked** |

### 3.2 Case 2 — the artifact is a record ABOUT the deliverable (65 lanes)

**The shared shape.** For a backend lane the exit says *pinned by a test that reds if X is removed* or
*shown at the wire tier*, and the evidence is a `.trx`, an `evidence.md` or a mutation log. **A trx
existing does not prove a route refuses.** The instrument that shows the deliverable is a
`wire`- or `schema`-kind probe over the **merged production or pin source**, with a `contains:` or
`regex:` extractor naming the token the fix introduces. That is exactly the shape the plan already
uses for `meals.utlkvit`, `ev.dietary`, `growth.dispatch.hosted`.

**Every backend row below carries the same precondition**, and it is the real blocker: the lane must be
merged to `feature/restaurant-modules` **and** `../OkamAPI-modules` must be standing on that branch
(§1.4). Until both hold, the probe reads absent and the fact reads `unconf`, which `_evidence_kind_ok`
refuses.

#### Backend — the probe's source file is already named by the lane's own return (18)

| lane | probe to add |
|---|---|
| `L-AI-MIDDLEWARE-DELETE` | `ai.capture.pin  wire  ../OkamAPI-modules/WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs  contains:<the assertion name>` — the exit demands a **deletion**, and no extractor can read an absence, so the probe must read the **guard that forbids re-wiring**. This is the case the brief used as its example, and the answer is not the mutations log: it is this file. |
| `L-COMPOSITION-ROOT-CHECK` | `comproot.limiters  wire  ../OkamAPI-modules/WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs  contains:<the enforcement case name>` |
| `L-COMPROOT-PIN-OVERDETERMINED` | same file, same probe — **see the duplicate flag in §2** |
| `L-CONFIRM-POSTMERGE-PIN` | same file, same probe — **see the duplicate flag in §2** |
| `L-DOWNLOAD-HEADERS` | `download.headers  wire  ../OkamAPI-modules/Helpers/BrowserReadableHeaders.cs  contains:Content-Disposition` |
| `L-DOWNLOAD-PDF-WIRE` | `pdf.renderer.seam  wire  ../OkamAPI-modules/Services/Interfaces/IDocumentRenderer.cs  contains:<the seam member>` |
| `L-PDF-NULLDEREF` | `pdf.outage  wire  ../OkamAPI-modules/WebApi.Tests/Wire/PdfRendererOutageWireTests.cs  regex:` counting the call sites — **and the exit's "six" must become "eight" first** (§2) |
| `L-EV-ACCEPT-GATE` | `ev.accept.gate  wire  ../OkamAPI-modules/WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs  contains:<the refusal case>` |
| `L-EV-GUEST-ORIGIN` | `ev.guest.origin  wire  ../OkamAPI-modules/WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs  contains:<the refusal case>` — plus a second `meta` probe over the committed appsettings for the *"a committed configuration sets the origin"* half |
| `L-GR-TESTSEND-GUARD` / `L-GR-CONFIRMED-EMAIL` / `L-GR-CONFIRMED-PIN-FIX` | `gr.testsend.binding  wire  ../OkamAPI-modules/WebApi.Tests/Growth/GrowthTestSendBindingTests.cs  contains:<per-lane case name>` — three lanes, one file, so each needs a **different** `contains:` token or they become indistinguishable |
| `L-GR-CONFIRM-STALE` | `gr.testsend.reach  wire  ../OkamAPI-modules/WebApi.Tests/Growth/GrowthTestSendReachabilityTests.cs  contains:<the suppression case>` |
| `L-MEALS-POS-TENDER-WIRE` | `meals.pos.tender  wire  ../OkamAPI-modules/WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs  contains:<the settlement case>` |
| `L-UTLKVIT-SALE-ROW` | `utlkvit.salerow  wire  ../OkamAPI-modules/WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs  contains:<the copy-refusal case>` |
| `L-MEALS-RELEASE` | `meals.release.route  wire  ../OkamAPI-modules/WebApi.Tests/Wire/MealsQuoteReleaseWireTests.cs  contains:<the release case>` |
| `L-INVOICE-RETRY-RETIREMENT` | `invoice.retry  wire  ../OkamAPI-modules/Services/InvoiceService.cs  contains:<the restored-address token>` — **the only one whose source file is already on integration**, so this probe can be written and will read a real value the moment the fix lands |
| `L-MIG-COMPANY-RECEIVABLE` | `meals.credit.account  schema  ../OkamAPI-modules/Migrations/*Meals_CompanyReceivableAccount*.cs  contains:<the column name>` — `schema` + `contains:`, **not** `exists`, which is where `acct.uidx` went wrong |

#### Backend — the probe shape is the same, the source file must come from the commit (35)

These lanes' returns name a branch, a worktree and a test count but **no production or pin file**, so
the probe's source cannot be written from the plan. Each needs one line from its own commit before an
exit can be written. Listing them is the deliverable here; guessing their filenames would be exactly
the invention the brief forbids.

`L-WF-CLOCK-WIRE`, `L-WF-ADJUST-ADDRESS`, `L-WF-EXPORT-DUPLICATE`, `L-GROWTH-HEALTH-HONEST`,
`L-GROWTH-NEWSLETTER-WIRE`, `L-GR-APPROVAL-STATE`, `L-GR-POSTMARK-WEBHOOK`, `L-GR-TESTSEND-RATELIMIT`,
`L-GR-TESTSEND-RECORD`, `L-VIPPS-REDACT-404`, `L-EV-EXTDEP-GUARDS`, `L-EV-INQUIRY-GATE`,
`L-EV-URI-RELATIVE`, `L-EV-OUTBOX-GUID-SUBSTRING`, `L-MEALS-RELEASE-RACE`, `L-MEALS-FLOOR-PINS`,
`L-MEALS-GRACE-PINS`, `L-MEALS-SWEEP-GUARD`, `L-MEALS-DEGENERATE-TWO`, `L-MEALS-EIGHTH-PIN`,
`L-MEALS-REQUOTE-RELEASE`, `L-MEALS-QUOTE-RETRY`, `L-MEALS-REACHABLE`, `L-MRG-WASTE-500`,
`L-UTLKVIT-REPLAY-SOURCE`, `L-UTLKVIT-REPRINT-KIND`, `L-TRAIN-DISCLOSURE`, `L-REVIEW-RESIDUALS`,
`L-RESERVATION-LIMITER-MOVE`, `L-CONFIRM-SERVER-HALVES`, `L-CONFIRM-CONAT-RETIRE`,
`L-CRYPTO-PIN-BYFORM`, `L-FLAGS-EFFECTIVE-RESOLVERS`, `L-FLAGS-EXCUSE-BYFLAG`,
`L-GR-DISPATCH-ACTOR`

Three carry an extra note:

- `L-GR-DISPATCH-ACTOR` — **the flagship stale exit** (§2). It names three surfaces; the lane was
  re-scoped to the newsletter alone. Do not write a probe until the exit is cut back, or the probe
  will be written against two surfaces this lane was told not to touch.

- `L-CRYPTO-PIN-BYFORM` — the exit is *"reds against **every** non-cryptographic form"*. A
  `contains:` probe would reproduce the exact defect the lane exists to remove (a check that reads
  like a rule and is a string match). This one needs `regex:` with a negated character class, or it
  needs to stay uninstrumented rather than get a probe that repeats the bug.
- `L-FLAGS-EXCUSE-BYFLAG` — the exit is *"deleting **any** resolver registration reds the catalog
  guard"*. Universally quantified over a set that will grow; a `contains:` probe fixes the set at
  today's eight keys and goes stale silently. `regex:` over the excuse table's shape is the honest
  form.

#### Frontend — a tracked pin file already exists and should be named (9)

These are the cheapest wins in the whole set: the instrument exists, is **git-tracked**, and one exit
edit makes the lane verifiable today without waiting on any merge.

| lane | instrument |
|---|---|
| `L-PRICE-NULL-ZERO` | `PATH test/price-absence.test.js` — evidence already cites it; the exit does not |
| `L-CLIENT-TRAILING-SLASH` | `PATH test/core-request-path-shape.test.js` — **and the exit's "the confirm route" must become the derived corpus check over all 418 call sites** (§2) |
| `L-CORE-ORE-LABEL` | `PATH test/core-price-label.test.js` — **and "every client" must become the ruled consumer scope** (§2) |
| `L-ARTIFACT-PROVENANCE` | `PATH test/journey-artifact-store.test.js` (the ranking mechanism's pin) rather than `artifacts/journeys/runs/ledger.jsonl`, which is gitignored |
| `L-FLAGS-NOTE-FALSIFIABLE` | `PATH test/feature-flags-page.test.js` — verified to carry `describe('the standing honesty statement is on the screen…')` and `describe('every key this page prints exists in all three locales')`, which is exactly what the exit demands. Not the journey capture it currently cites |
| `L-GR-TESTSEND-ERRORCODE` | `PATH test/growth-newsletter-page.test.js` — verified to carry `describe('the copy itself — what the screen is allowed to assert')`, the home of the refusal sentence. **Not** `test/growth-send-gate.test.js`, which is the lawfulness gate |
| `L-GR-DEADLINE-COPY` | `PATH test/growth-privacy-queue.test.js` — verified to carry `describe("the article 12 deadline is the SERVER's answer")`, which is the claim the four stale sentences contradicted. The lane's return names `DETAIL.md` only, so confirm the locale guard was widened in this file at frontend `7a2c789` before naming it |
| `L-FLAGS-IMPOSSIBLE-COMMENT` | `PATH test/platform-flag-board.test.js` — verified to carry `describe('the setting and the gate are two different answers')` and `describe('when the two reads disagree')`, i.e. the states the removed comment called impossible |
| `L-TRAIN-EVIDENCE-NAMES-COURSE` | `PATH test/training-components.test.js` for the component half — verified to carry `describe('TrainingCompletionPanel — the ledger…')`. The wire half is backend and its source file is not in the return. Its current evidence, `artifacts/journeys/training-course-to-evidence.playwright.json`, is **gitignored**; the tracked `test/e2e/journeys/training-course-to-evidence.spec.js` is the durable form of the same claim |

**These nine were checked, not guessed.** Every file above was opened and its `describe` blocks read
against the exit's own words. **Two of my first-pass choices were wrong and the check caught both**:
`L-FLAGS-NOTE-FALSIFIABLE` is pinned in `feature-flags-page`, not `platform-flag-board`, and
`L-GR-TESTSEND-ERRORCODE` is pinned in `growth-newsletter-page`, not `growth-send-gate`. The apparent
collision I had written between the two flag lanes **does not exist** — they are two different files.
`L-ARTIFACT-PROVENANCE`'s file carries `describe('backend identity')` and
`describe('the record a run replaces with a worse one of its own backend')`, which is the exit
verbatim.

#### Bookkeeping and merge lanes — the deliverable is a git fact (5)

The plan already has the vocabulary for this and does not use it here: `be.world.branch`,
`be.mig.head`, `fe.world.branch` are `meta` probes with `json:` extractors over `artifacts/world/WORLD.json`.

| lane | instrument |
|---|---|
| `L-FE-JOURNEYS-MERGE` | `PATH test/e2e/journeys/<the ported specs>` — tracked, and the merge claim is exactly "these files are on this branch". **Fix "four" -> "six, of which four remained" first** (§2) |
| `L-FE-WF-ONBOARD-WALK` | `PATH test/e2e/journeys/workforce-invitation-onboarding.spec.js` — tracked. Its current evidence, `artifacts/journeys/…playwright.json`, is a *run record*; the spec being on the branch is the deliverable |
| `L-CONFIRM-FAMILY-MERGE` | `PROBE  confirm.family.head  meta  ../OkamAPI-modules/artifacts/world/WORLD.json  json:$.head` — **and the "five true heads" must be settled by `D-CONFIRM-SIXTH-HEAD` first** (§2) |
| `L-MEALS-FOURWAY-TIER` | `NONE` — see §3.3; the exit is a suite result and nothing else |
| `L-GR-WITHDRAW-ORIGIN` | `NONE` — see §3.3 |

### 3.3 Case 3 — no instrument can exist under this standard (9 lanes)

Each of these is a finding about how the lane was scoped, not a gap to fill.

| lane | why no instrument can exist |
|---|---|
| `L-MRG-WASTE` | Exit: *"the finalize trigger rolls back any post-freeze write **on a chain-built database**"*. Probes read committed source and artifacts and **never execute** — §5 of the tool forbids it, and the extractor vocabulary has no exec form. A database's runtime refusal is not readable. The `.trx` is `suite`-kind, refused by guard 1. **Nearest honest instrument: a `schema` probe over the trigger's migration, which proves the DDL is in the chain and says nothing about the rollback.** |
| `L-WF-W5-TIMESHEET` | Same, plus the first half is already available and unnamed: `fact:wf.journeys` is `journey`-kind with a `regex:` extractor and **is** admissible. The exit says *"read verified-green in the Workforce journey manifest"* — that is literally what `wf.journeys` extracts. **Name `fact:wf.journeys=14` for the first half; the second half ("a finalized batch refuses a further write on a chain-built database") has no instrument.** |
| `L-EV-REFUND-FAKE-ARG` | Exit is *"the tests pass on a chain-built database"* — a suite result, inadmissible by construction. Also stale (§2). |
| `L-MEALS-SUPERSEDE-SQL` | Exit is *"passes on SQL Server, including its detach-and-re-read path"* — a suite result at a tier no probe can reach. |
| `L-MEALS-FOURWAY-TIER` | Exit is *"the full fast tier passes… with the trx committed"*. **Guard 1 exists precisely to refuse this**: a green suite does not exit `built-unverified`. This lane cannot be verified as written and was never scoped to be. |
| `L-WF-DEMO-PRESENCE` | Exit is *"after the workforce demo seed, the personnel-list read returns the four seeded windows"* — the observation is a live HTTP read against a container-backed database. No probe executes. Its evidence additionally points into a **session scratchpad**, which is the least durable location used anywhere in this plan. |
| `L-EV-VIPPS-FALLBACK` | Exit: *"a live test-MSN initiate… and **after approval in Vipps**, the guest lands back on the deposit page reading paid"*. Requires a live merchant credential, a publicly reachable callback, and **a human tapping approve in a phone app**. No probe, and no fixture journey either — the lane's own body says *"It is faked in every test… Only a live harness run decides this one."* |
| `L-GR-WITHDRAW-ORIGIN` | Exit: *"a browser at the **deployed** preference-centre URL"*. The lane measured that the deployed preference centre answers **404 — the Growth guest surface is unshipped**. No instrument can exist until a deployment does, and that is `D-PREFCENTRE-DEPLOY`, not this lane. |
| `L-REACHSWEEP` | Exit's second half is *"every entry it names is either a Flag or a Decision **in this plan**"*. That is a cross-reference over `plan.md` itself — a `plan check` rule, not a probe over a source file. The first half is case 1 (name the sweep document). **The second half needs a tool amendment, not an exit rewrite.** |

---

## 4. What the orchestrator should do with this, in order

1. **Do not batch-write the 65 case-2 exits.** For 13 of them the probe's source is known and the
   file is not on the integration branch; for 31 the source is not even known. Landing the branches is
   the binding constraint (§1.4), and an exit written now names a probe that will read `unconf` for
   as long as the merge waits.
2. **Take the 7 tracked frontend pins first** (§3.2). Instrument exists, tracked, no merge needed,
   one line each. Three of them need their stale scope corrected in the same edit.
3. **Correct the 4 newly-found stale exits before verifying anything against them** (§2), and settle
   the `L-COMPROOT-PIN-OVERDETERMINED` / `L-CONFIRM-POSTMERGE-PIN` duplicate.
4. **Record the 9 case-3 lanes as unverifiable-as-scoped** rather than leaving them in a queue that
   implies a sentence would fix them. Six of the nine are "on a chain-built database" or "the tier
   passes", which is one decision, not six: **this plan has no admissible instrument for any
   database-runtime or suite-result claim, and guard 1 is deliberate about it.**
5. **`docs/plan/` being untracked (§1.1) is a bigger exposure than any row above** and belongs to
   nobody's lane. Every review verdict, every return and the plan itself are one `git clean` from
   gone.

---

## 5. Coverage

88 of 88 measured. 14 case 1, 65 case 2, 9 case 3. Zero left unmeasured.

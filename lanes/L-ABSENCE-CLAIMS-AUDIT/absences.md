# L-ABSENCE-CLAIMS-AUDIT — which recorded absences were ever shown to be detectable

Read-only audit. No file outside this directory was written, no branch switched, no container started,
no suite run.

## 0. The world I measured against, stated first because it changes answers

| | |
|---|---|
| Plan corpus | `/Users/svendaneel/okam/Web-modules/docs/plan/plan.md` (16,117 lines), `lanes/*/` (118 .md), `docs/plan/returns/` (283 .md) |
| Frontend tree | `Web-modules` @ `feature/restaurant-modules` (working checkout) |
| Backend tree | `OkamAPI-modules`, **checkout is on `lane/meals-grace-pins`, not the integration branch** |

**I never used the backend working tree.** Every backend measurement below is `git grep <pattern> <ref>`
against a named ref, so the lane checkout was neither read nor disturbed.

**The integration ref I measured is `8e2b57de` (2026-08-04 12:00), which is 59 commits AHEAD of
`3579bbbc` (2026-08-02) — the tip most lane evidence cites.** `git merge-base --is-ancestor 3579bbbc
feature/restaurant-modules` → true; `rev-list --count 3579bbbc..feature/restaurant-modules` → 59. This
distinction is load-bearing for reading the table below: a claim that is false at `8e2b57de` may have
been true when written and closed by a landing since. Where that is the case I say so, because
*"was wrong"* and *"has since been fixed"* are different findings and only one of them is a defect.

## 1. Method, and the four times my own detector lied to me

The brief's rule — *a search that returns nothing proves nothing until it has been shown to return
something when the thing is there* — is not decoration. **Four of my own searches returned a false zero
during this audit.** Each is recorded, because the rate is the finding: if a detector built by someone
actively looking for this failure mode fails four times, the ambient rate in claims written while doing
something else is not going to be lower.

1. Checking whether any migration creates a unique index on `AccountingSummaries`, I searched migrations
   for `IsUnique: true` and got **0 hits across every migration in the chain**. That reads as a
   spectacular finding. It is a bug in my search: EF migration scaffolding emits `unique: true`
   (lowercase, C# argument syntax), and `IsUnique()` is the *model* API. Corrected pattern: **115 hits.**
   Only then was the zero on `AccountingSummaries` worth anything.
2. Checking `WorkforceStaffController`, I searched `Controllers/Workforce/WorkforceStaffController.cs`
   and got nothing — the file is at `Controllers/WorkforceStaffController.cs` (no `Workforce/` segment).
   A path typo is indistinguishable from an absent controller unless you control it.
3. Checking the plan's `getPublicationHistory`, I got **zero hits repo-wide including no definition**.
   The method is `GetPublicationHistory`. **I had copied the identifier out of the claim I was auditing**,
   so my search inherited its typo and returned a zero that looked like confirmation (see C-6).
4. Checking whether any test pins the `wfr_access_no_list` copy, searching the *copy string* found zero
   tests; searching the *key* found the real one (see C-5).

**Three of those four false zeros would have produced a confident wrong finding, and two of them would
have wrongly confirmed the very claim under audit** — the worst direction for an auditor to fail in.
Every zero reported below therefore carries its positive control in the same row.

**Claim shapes were taken from a hand-read sample of ~300 candidate lines before any regex was written**,
per the brief's warning that a regex built before reading is itself an unvalidated absence. The shapes
found: *no caller / 0 callers / zero callers*, *the only caller*, *appears in exactly one place*,
*nothing else calls|constructs|releases*, *never called|registered|run|written|wired*, *no migration
creates it*, *exists on no branch*, *dead since Initial commit*, *written by no code path*, *exercised
nowhere*, *no controller answers it*, *has N call sites, ALL in tests*.

## 1.5 A defect in THIS audit, found by the sweep it dispatched

**§0 promises that every backend measurement uses `git grep` against a named ref. I made no such promise
for the frontend and did not keep it.** My frontend searches ran against the *working tree*, which is
dirty and carries untracked files from three concurrently running lanes. That is the same
worktree-for-ref substitution I had already written up as C-5, committed by the auditor.

**It produced exactly one wrong finding (C-6), and the delegated sweep caught it and refused to defer.**
All frontend evidence was then re-checked against `HEAD` (`e34977a`):

| file cited as evidence | at HEAD? | consequence |
|---|---|---|
| `pages/admin/workforce-publications.vue` | **NO — untracked, `lane/wf-pubhist` only** | **C-6 retracted** |
| `components/admin/pos/ClockScreen.vue` | **NO — untracked** | V-8 amended, conclusion strengthened |
| `components/admin/pos/PosShell.vue` | yes | V-8 stands |
| `test/workforce-roster-components.test.js` | yes | C-4 and C-5 stand |
| `components/admin/workforce/WorkforceEngagementPanel.vue` | yes | C-5 stands |
| `utils/workforce/schedule-client.js` | yes | — |
| `translations/{de,en,no}.ts` | yes | C-5 stands |

**Why this is reported rather than quietly fixed.** The finding of this lane is that absence claims fail
when nobody names the surface they were checked against. *A working tree is a surface, and it is the
wrong one on a machine running three lanes.* An audit that made that mistake and hid it would be
evidence against its own thesis. **One of thirteen findings did not survive contact with a second
checker — which is the argument for the second checker, not against the audit.**

## 2. Census — plan.md

| | count |
|---|---|
| Candidate lines matching the absence dictionary | 415 |
| …carrying a code identifier or concrete artifact (checkable at all) | 182 |
| …purely rhetorical (*nobody has walked it*, *a ruling nobody made*) — **not audited, not defects** | 43 |
| **Strict absence-of-code-artifact assertions** | **122** |
| — name a method within ±4 lines (searched what, across what, result) | 29 |
| — **name no method at all** | **93** |

**The 29/93 split is a proximity heuristic and it errs by over-crediting.** Its own control caught it:
it classified plan.md:828 as method-named when I had already proved by hand that that claim is both
unvalidated *and* refuted. So **93 is a floor, not an estimate** — the true unvalidated count is ≥93 of
122. I report the direction of the error rather than a false precision.

Reading, not the heuristic, produced everything in §3–§5.

## 2b. Findings at a glance

| id | claim | verdict | falsifying the… |
|---|---|---|---|
| **C-1** | `Configure<MealsFeatureSettings>` called nowhere ⇒ gate dead everywhere | **contradicted** | **explanation** (absence true, inference false) |
| **C-2** | "the only caller that sets `FallBack` is checkout" | **contradicted** | claim (2 of 3 call sites set it) |
| **C-3** | "a Meals switch that reaches nobody" | **contradicted** | claim (gates ≥4 admin routes) |
| **C-4** | "`WorkforceStaffController` binds issue and nothing else" | **contradicted as written / validated as meant** | phrasing (14 routes bound; invitation-scoped absence holds) |
| **C-5** | "`wfr_access_no_list` is DELETED in all 3 locales" | **contradicted** | claim (deletion is on a lane branch only) |
| ~~**C-6**~~ | "`getPublicationHistory` … with zero callers" | **RETRACTED → the claim HOLDS (now V-9)**; only the identifier casing was a real defect | *my* error, caught by the delegated sweep |
| **V-1** | `AccountingSummaries` unique index in model, in no migration | **validated** | — |
| **V-2** | `WorkforceInvitationState.Revoked` written by no code path | **validated** | — |
| **V-3** | `AllowCredentials` is never called anywhere | **validated** | — |
| **V-4** | offers-page helpers unreachable (4 deleted) | **validated — the standard** | — |
| **V-5** | `WoltMenuSyncBackgroundService` never registered in any commit | **validated** | — |
| **V-6** | `GrowthAuditEvents` indexes have no migration | **validated & understates** (whole table missing) | — |
| **V-7** | no controller answers the disclosures route | **validated** | — |
| **V-8** | POS shell is the only holder of an operator session | **validated — and the model to copy** | — |
| **V-9** | `GetPublicationHistory` has zero callers *on the integration branch* | **validated** (was my C-6) | — |

**Nine of the fourteen hold, after one retraction of my own (C-6 → V-9).** The plan's absence claims are
more often right than wrong, and the two highest-consequence ones (V-1, V-6) are both sound. **The
failures are not spread evenly — they concentrate in one mechanism**, named next, and V-8 is the same
document doing it right.

Findings from the delegated `lanes/` sweep are in §8 and are **not** folded into this table, because
they are reported on that agent's authority except where I re-ran the check myself.

## 3. CONTRADICTED — and the structural pattern behind them

The single most consequential finding is not any one claim. It is a **repair asymmetry**:

> **This plan corrects itself reliably in the machine-checked half and unreliably in the prose half.**
> Corrections are recorded — the culture is real and §4 documents it — but several are recorded in the
> Decisions/Flags region *thousands of lines away from the sentence they refute*, and the original
> sentence is left standing, unmarked, where a reader will meet it first.

### C-1 · The Meals gate — refuted in this document, still asserted twice, lane marked `verified`

**Claim** (`docs/plan/plan.md:828-830`, and repeated at `470-473`):
> "`Configure<MealsFeatureSettings>` is called nowhere, so the gate reads false in every deployment
> whatever configuration says: Meals is startable and not completable."

**Refutation already in the plan** at `docs/plan/plan.md:11463`: *"the first clause is true and the
conclusion is false."*

**Independently verified by me at `8e2b57de`:**

| step | result |
|---|---|
| positive control — `AddMealsFeatureOptions` is findable | **6 files** incl. `Program.cs` |
| `Configure<MealsFeatureSettings>` anywhere in `*.cs` | **0 hits — the absence itself is TRUE** |
| what actually binds it | `Helpers/Meals/MealsModuleServiceCollectionExtensions.cs:38-39` — `services.AddOptions<MealsFeatureSettings>().BindConfiguration(MealsFeatureFlags.ConfigSectionName)` |
| reached from | `Program.cs:868` — `services.AddMealsFeatureOptions();` |

**I am falsifying the EXPLANATION, not the claim.** `Configure<T>` genuinely is called nowhere. The
inference drawn from that absence — that the gate is dead in every deployment — is false, because a
second binding API does the job. Claim and explanation fail independently, and here exactly one failed.

**Why this is the worst of the set, three reasons:**
1. `L-MEALS-GATE` is **`state: verified`** while the only prose it offers as rationale is refuted.
2. The Feature block at `470-473` instructs the reader: *"Treat 'flip `Features:Meals:Module`' as a claim
   those two have to make true, not as a step a colleague could take today."* That is now known-false
   operational advice sitting in the Feature a pilot would be sold from.
3. **The instrument was already repaired and the prose was not.** `fact:meals.gate`'s probe at
   `plan.md:16069` now reads `contains:services.AddMealsFeatureOptions();` and the fact stamps
   `ok/present` — precisely the fix `11463` recommended. The machine half is correct; the human half
   still tells the reader Meals cannot be switched on.

**Later lane owes:** delete or amend the sentences at `plan.md:470-473` and `plan.md:828-830`. No code
change — the code is correct. This is a documentation defect with pilot-facing consequences.

### C-2 · "The only caller that sets it is checkout" — corrected 9,645 lines away

**Claim** (`docs/plan/plan.md:2329-2330`, lane `L-EV-VIPPS-FALLBACK`, `state: built-unverified`):
> "`EventsDepositPaymentPortAdapter.Initiate` sends **no `FallBack`**. The only caller that sets it is
> checkout."

**Correction already in the plan**, at `docs/plan/plan.md:11974`, under a *Decision* block:
> "**Corrected 2026-08-03: 'the only caller that sets a fallback is checkout' was one call site short.**
> Three production call sites reach the Vipps initiate and **two** set a fallback… Right about the
> destination, wrong about the count."

**Classification: CONTRADICTED, by the plan's own measurement.** This is the brief's canonical shape —
*a claim that something appears in exactly one place is refuted by finding two* — and here the second
was found. The correction is honest and specific. The defect is that **the refuted sentence at 2329
carries no marker**, so a reader arriving at the lane block gets the wrong count and no signal that a
correction exists 9,645 lines below.

**Later lane owes:** mark `plan.md:2329-2330` at its site. Note the lane is still `built-unverified`, so
this is a live brief an agent could be dispatched against.

### C-3 · "A Meals switch that reaches nobody" — premise refuted, still the lane's title

**Claim**: the lane *title* at `docs/plan/plan.md:5842` — "**the switchboard stops offering a Meals
switch that reaches nobody**", `state: open`.

**Refutation in the plan** at `13007`: *"the brief rules withhold-with-a-reason on the premise of 'a Meals
switch that reaches nobody', but meals.module gates four store-addressed admin routes across three
services — measured off the production assembly — so the standing ruling's predicate ('advertised but
does not gate') does not hold for it."* And at `12991`: *"**The brief's premise was false and it said so
precisely.**"*

**Classification: CONTRADICTED**, and notably contradicted *by a lane that returned `fail-spec` rather
than building against a false premise* — which is the system working.

**A residual numeric disagreement the plan has not settled.** Three passages give two different counts
for the same measurement:
- `plan.md:3316` and `plan.md:11738`, and the ruling text under the lane block: "read at **three** admin
  routes and **none** is on the consumer path"
- `plan.md:13007`: "gates **four** store-addressed admin routes across **three services** — measured off
  the production assembly"

My own probe at `8e2b57de` finds `meals.module` referenced across **seven** Meals controllers
(`MealsAgreement`, `MealsCompany`, `MealsFunding`, `MealsMembership`, `MealsProgram`,
`MealsReconciliation`, `MealsStatement`) plus `IMealsFeatureGate`, though most hits are doc comments
rather than gate resolutions, so **seven is an upper bound on controllers, not a route count** and I do
not claim it settles three-vs-four. **I am naming the disagreement, not resolving it** — resolving it
needs the production-assembly measurement `13007` describes, which is a suite-class job and outside a
read-only lane.

**Later lane owes:** one measurement, recorded once, replacing both counts. The "none on the consumer
path" half is consistent across all passages and is not in dispute.

### C-4 · "Binds issue and nothing else" — false as written, true as meant

**Claim** (`docs/plan/plan.md:10007-10009`):
> "`WorkforceStaffController` binds **issue and nothing else**. There is no list route and no revoke
> route, and **`WorkforceInvitationState.Revoked` is declared and written by no code path at all**."

**Measured at `8e2b57de`** (positive control: the file has 26 `Http`-matching lines, so the detector
fires):

`Controllers/WorkforceStaffController.cs` binds **fourteen** routes — `GET context`, `GET/POST staff`,
`GET/PATCH staff/{id}`, `POST staff/{id}/invitations`, `POST staff/pos-operator-import`, `GET/PUT roles`,
`GET/PUT staff/{id}/roles`, `GET/PUT staff/{id}/employment-terms`.

**Split verdict, and the split is the point:**
- *"binds issue and nothing else"* — **CONTRADICTED as literally written.** The controller binds
  fourteen routes. A reader auditing C3 reachability from this sentence would form a wrong model of the
  surface.
- *the invitation-scoped absence* — **VALIDATED.** Exactly one invitation route exists
  (`[HttpPost("staff/{staffMemberId:guid}/invitations")]`, line 156); there is no invitation list route
  and no revoke route. Read in context the author plainly meant *binds [invitation] issue and nothing
  else*, and that is true.

This is a **scoping failure, not a factual error** — worth separating from C-1 and C-2, which are
factual. **Later lane owes:** requalify the sentence ("binds one invitation route and no other
invitation route"). No code change.

**It has already propagated out of the plan and into the code.** `test/workforce-roster-components.test.js:412`
opens a test with the comment *"`WorkforceStaffController` binds issue and nothing else — no read of an
engagement's invitations, and no revoke verb, though `WorkforceInvitationState.Revoked` exists."* The
same sentence, verbatim, now justifies a live assertion. That is how an unqualified absence claim
outlives the document it was written in — which is the argument for fixing the phrasing rather than
shrugging at it.

### C-5 · A claimed **deletion** that is true on a lane branch and false on the integration branch

This is the highest-consequence contradiction, because the brief ranks absence claims behind deletions
above all others, and because the falsehood it leaves standing is **user-facing copy in three locales**.

**Claim**, in two places:
- `docs/plan/returns/L-FE-WF-INVITE-LIST-REVOKE-1.md:12` — *"`wfr_access_no_list` is DELETED in all 3
  locales, not reworded — a key whose name lies is the next…"*
- `docs/plan/plan.md:10136` — *"`wfr_access_no_list` was **deleted rather than reworded**"*

**Measured in `Web-modules`, HEAD = `feature/restaurant-modules` @ `e34977a` (2026-08-04 15:55):**

| step | result |
|---|---|
| the deletion commit | `e8d69fc` (2026-08-04 **22:21**) "Workforce: the roster panel stops saying the routes do not exist" — its diff shows `- wfr_access_no_list: …` |
| `git merge-base --is-ancestor e8d69fc HEAD` | **NO — not on the integration branch** |
| `git branch -a --contains e8d69fc` | **`lane/fe-wf-invite-list-revoke` only** |
| the key at HEAD | **present in all three** — `translations/{de,en,no}.ts` |
| the key in the working tree now | **present in all three** |

**Verdict: the claim is true of the lane branch and false of the integration branch.** I am falsifying
the *claim*, not its explanation — the deletion was really made, just not where the plan's sentence
implies. The commit is also **timestamped 6½ hours after the integration tip it is described against**,
which is why nothing merged it.

**Why it matters beyond bookkeeping.** `plan.md:10079` records that the copy is believed false — the
routes it denies were built. So on the integration branch, three locales still tell a manager *"the API
has no such routes… we cannot withdraw one"*, rendered live at
`components/admin/workforce/WorkforceEngagementPanel.vue:134` and pinned by
`test/workforce-roster-components.test.js:418`. **A green suite actively holds the falsehood in place.**

This is a fresh instance of the family the plan already names at `6716`, `8006` and `6909` (*"Four lanes
report `built` and none of their code is on the integration branch"*) — the new part is that here the
un-landed work is a **deletion**, so the plan reads as though a falsehood was removed when it was not.

**Two smaller corrections in the same passage**, both from `plan.md:10079`:
- *"three locales"* — **VALIDATED.** `de.ts:3131`, `en.ts:3128`, `no.ts:3184` all carry the key.
- *"**Two** frontend tests actively pin that"* — **I can find only one**, at
  `test/workforce-roster-components.test.js:418`. A repo-wide search excluding `node_modules`, `.nuxt`
  and `coverage` returns exactly one test reference. **Positive control:** searching for the copy string
  found *zero* tests while searching for the *key* found the real one — the same false-zero trap as §1,
  so I report one only after controlling the search. Stated as a count discrepancy, not a defect: a
  second pin may have existed when the sentence was written.

**Later lane owes:** land `e8d69fc` (or re-do the deletion on the integration branch). Until then the
locale copy is a live C6-adjacent falsehood in the product, not merely in the plan.

### C-6 · **RETRACTED — I was wrong, and I made the exact error this lane exists to find**

> **This entry originally classified `plan.md:8319` as CONTRADICTED-AS-STALE. That was my error. The
> claim HOLDS. The retraction is left in place rather than deleted, because a document about
> unvalidated absences that silently removed its own is worthless.**

**What I claimed:** that *"`getPublicationHistory` exists in the client with zero callers"* was stale
because I found a caller at `pages/admin/workforce-publications.vue:176`.

**How it was caught:** the delegated `lanes/` sweep refused my finding and argued the claim was correct
at its named baseline `e34977ac`, the caller being that lane's own unmerged deliverable. I checked
rather than deferred:

| step | result |
|---|---|
| `git cat-file -e HEAD:pages/admin/workforce-publications.vue` | **fails — the page is untracked** |
| `git status --porcelain` on it | `??` |
| branches containing it | **`lane/wf-pubhist` only** |
| `git grep GetPublicationHistory HEAD -- components/ pages/ utils/` | **one hit: the definition at `utils/workforce/schedule-client.js:122`. Zero callers.** |

**The claim is VALIDATED at the integration branch.** The surface exists on an unmerged lane branch, and
`plan.md:8319`'s open question — *missing surface or dead code* — is still genuinely open there.

**My mechanism was the one I had already written up as C-5.** §0 of this document promises that every
*backend* measurement uses `git grep` against a named ref. **I never made that promise for the frontend,
and I did not keep it** — I grepped the working tree, which is dirty and carries untracked work from three
concurrently running lanes. Every frontend finding was therefore re-verified against `HEAD` (see §1.5);
C-5, C-4's test-comment evidence and V-8 all survive, and this one did not.

**What survives from the original entry** is the smaller half, and it is still real: **the plan writes the
identifier as `getPublicationHistory` when the method is `GetPublicationHistory`** (capital G,
`utils/workforce/schedule-client.js:122`). A case-sensitive search for the plan's spelling returns zero
hits repo-wide **including no definition** — a false zero that reads exactly like confirmation.
`lanes/L-WF-FAILURES-SURFACE/evidence.md:30` repeats the same misspelling while saying *"I confirmed the
brief's reachability claim independently"*. **A confirmation that inherits the claim's typo confirms
nothing.** That remains the cleanest example in the corpus of why a positive control is not optional —
it just now has two victims instead of one, and I am the second.

**Later lane owes:** fix the casing at `plan.md:8319` and in `L-WF-FAILURES-SURFACE/evidence.md:30`.
Do **not** strike the open question — it is live.

<details><summary>Original (wrong) entry, retained</summary>

### ~~C-6 · "zero callers" — stale, not wrong, and misspelled in a way that hides it~~

`docs/plan/plan.md:8318-8320`: *"A second unreachable route found in passing, and not fixed:
`getPublicationHistory` exists in the client with **zero callers**. Same shape as the one this lane
closed, waiting for someone to decide whether it is a missing surface or dead code."*

**Two separate defects, and the first nearly cost me the second.**

1. **The identifier as written does not exist.** The method is `GetPublicationHistory` — capital G, at
   `utils/workforce/schedule-client.js:140`. A case-sensitive search for the plan's spelling returns
   **zero hits repo-wide, including no definition** — a false zero that reads exactly like confirmation
   of the claim. `lanes/L-WF-FAILURES-SURFACE/evidence.md:30` repeats the same lowercase spelling while
   saying *"I confirmed the brief's reachability claim independently"*. **A confirmation that inherits
   the claim's typo confirms nothing**, and this is the cleanest example in the corpus of why a
   positive control is not optional.
2. **The claim is now stale.** At `feature/restaurant-modules` @ `e34977a` the method has a real caller:
   `pages/admin/workforce-publications.vue:176`. Its sibling `GetRecipients` — the other half of the
   `L-WF-PUBHIST` exit at `plan.md:2270` (*"either a surface consumes the publication-history method and
   binds the recipients endpoint, or both are deleted"*) — is called at the same page, line 201. The
   surface was built; the exit's first disjunct was taken.

**Classification: CONTRADICTED-AS-STALE.** ~~Unlike C-1 through C-5 this claim was *true when written*.
The defect is that `plan.md:8319` still says *"waiting for someone to decide whether it is a missing
surface or dead code"* when a lane decided and built it~~ — **wrong; the past tense in
`test/admin-nav-access.test.js:117` and `workforce-publication-receipts.spec.js:6` describes the lane
branch, not the integration branch, and I read it as the tree's state.**

</details>

## 4. VALIDATED — reported as prominently as the failures

A census that does not separate checked-and-sound from never-checked is indistinguishable from silence.
**These held, and several are the highest-consequence claims in the document.**

### V-1 · `AccountingSummaries` has no unique index in the chain — HOLDS (highest consequence)

`docs/plan/plan.md:750`: *"The model declares a unique index on store and date; no migration in the chain
creates it."* This is `F-ACCT-DUP`, carried in user memory as a **live production defect**, and C2 rests
on it. **Independently verified at `8e2b57de`:**

| step | result |
|---|---|
| positive control — migrations do create unique indexes | **115** `unique: true` hits |
| model declares it | `Helpers/ApplicationDbContext.cs:691-693` — `HasIndex(a => new { a.StoreId, a.Date }).IsUnique()` |
| what the migration actually creates | `Migrations/20250531164643_CompanyInfo.cs:208-211` — `IX_AccountingSummaries_StoreId`, **column `StoreId` alone, not unique** |
| any unique index on that table in any migration | **none** |

**The claim is exactly right, including the subtle part** — an index *is* created on that table, so a
careless check would find one and wrongly clear the flag. The defect is that it is the wrong index and
not unique. `fact:acct.uidx` correctly stamps `unconf/unknown`.

### V-2 · `WorkforceInvitationState.Revoked` is written by no code path — HOLDS

Textbook positive control: the sibling members are assigned in production
(`Services/Workforce/WorkforceInvitationService.cs:139` writes `Pending`, `:316` writes `Claimed`), the
enum member is declared (`Enums/Workforce/WorkforceInvitationState.cs:18`, `Revoked = 3`), and
`WorkforceInvitationState.Revoked` has **zero references anywhere in the tree, tests included**. The
detector fires on siblings and returns zero on the target. *A state the schema knows and the product
cannot reach* is accurate.

### V-3 · `AllowCredentials` is never called anywhere — HOLDS

`docs/plan/plan.md:782`, offered as a **correction to a brief's stated mechanism**. Positive control:
`AddCors` is present in `Program.cs`. `AllowCredentials`: **0 hits** in `*.cs` at `8e2b57de`. The lane
was right to refuse the mechanism it was handed.

### V-4 · The offers-page deletion — the standard the rest are measured against

`lanes/L-OFFERS-PAGE-HUNDREDFOLD/evidence.md` (summarised in plan.md at `9796`). Before deleting four
helpers it checked, and *named*, seven surfaces: repo-wide grep by extension; the page's own template
(lines 1–435); computed properties; **dynamic dispatch** (`this[...]`, `$options.methods`,
`methods[...]`); importers; `git grep` over **every `refs/heads` + `refs/remotes`**; and `git log -S`
history (born dead at "Initial commit").

> **AMENDMENT — the method is still the standard; the deletion is not in the tree.** Prompted by the
> `returns/` sweep, I checked. **All four helpers are still at `HEAD`**, at the exact lines the lane
> named: `pages/admin/offers.vue:816, 830, 844, 858` (control: the file itself is at `HEAD`). The lane's
> reasoning was impeccable and its conclusion correct — the work simply never reached the integration
> branch, the same family as C-5. **This does not demote V-4**: the lane was asked to establish an
> absence and it did so better than anything else in the corpus. But *"four helpers were deleted"* is
> not true of the tree, and a document about unverified claims cannot repeat one. **Later lane owes:**
> land the deletion.

**Its best move is the one no other lane in this corpus makes: it reasoned about the *direction* of its
detector's known blind spot.** Vue 2 compiles templates inside `with(this)`, so a module-scope import can
be shadowed by a mixin method — a trap that *"makes something look unreferenced when it is reachable — it
cannot make something look reachable when it is not."* Having established that the trap cannot produce a
false *deletion*, it deleted. It then ran a positive control that executed the shipped method bodies
(7/7) and verified post-deletion by parsing the SFC. **That is what a validated absence looks like.**

### V-6 · `GrowthAuditEvents` has no migration — HOLDS, and **understates the defect**

`docs/plan/plan.md:7303`: *"`ApplicationDbContext` now gains two `HasIndex` calls for `GrowthAuditEvents`
with **no migration**…"* This entered §5 as unvalidated (U-1); I then ran the search, and it is
**validated — and the true state is worse than the sentence says.**

| step | result at `8e2b57de` |
|---|---|
| positive control — migrations do reference Growth tables | yes: `20260727221455_RestaurantModules_Initial.cs` + 4 more |
| positive control — the snapshot is populated and holds other Growth entities | **210** `ToTable(` entries; **21** `GrowthSegment`/`GrowthConsent` hits |
| the model config | `Helpers/ApplicationDbContext.cs:3563-3578`, `DbSet` at `:215` |
| the two `HasIndex` calls the claim names | `:3576` `{StoreId, OccurredAt}`, `:3577` `{AggregateType, AggregateId}` — **exactly two, as claimed** |
| `GrowthAudit` in any migration file | **0 hits** |
| `GrowthAuditEvent` in `ApplicationDbContextModelSnapshot.cs` | **0 hits** |

**The escalation.** The claim says the two indexes have no migration. What is actually true is that
**the `GrowthAuditEvents` table has no migration at all**, and the entity is absent from the model
snapshot — meaning no migration has ever been scaffolded since the entity was added. On a chain-built
database *the table does not exist*, so this is not a missing constraint (V-1's shape) but a missing
table. Two independent controls confirm the zero is real rather than a broken search.

**This corroborates a separate passage the plan never connected to it:** `plan.md:7313` — *"the growth
dispatch attribution is enforced on SQLite and **nowhere on SQL Server**"*. That is the same defect seen
from the other end: model-built SQLite test databases have the table, chain-built SQL Server does not.

**Later lane owes:** a migration author (C2 — one at a time) creates `GrowthAuditEvents` with both
indexes. Rank this beside `F-ACCT-DUP`, not below it.

### V-7 · No controller answers the training disclosures route — HOLDS

`docs/plan/plan.md:9974`: *"`utils/training/training-client.js:395` calls `GET
/training/stores/{storeId}/evidence/disclosures`, `pages/admin/training-courses.vue:526` and
`pages/admin/workforce-me.vue:364` both invoke it, and **no controller answers it** at `8e2b57de`."*

**Positive control:** evidence routes *are* findable — `Controllers/TrainingController.cs:383` binds
`[HttpGet("evidence")]`. **Result:** `disclosures` has **0 hits in `Controllers/`** and **0 hits in any
production `*.cs`** at `8e2b57de`. The claim holds, and it names its commit — which is more than most.

It sat in §5 only because it named no *search*; running the search confirms it. `F-TRAIN-DISCLOSURE-
UNREADABLE` (*"the access ledger is written and nobody can read it"*, `plan.md:15610`) rests on solid
ground.

### V-8 · The POS clock flag — **the counterexample to §3, and the model to copy**

`F-…-POS-CLOCK` (`docs/plan/plan.md:14373-14410`) makes the same class of claim as C-1 and C-2 —
*"nothing consumes the punch endpoint either"*, *"The till register screen does not exist in any repo"*,
*"a whole module surface with no caller"* — and handles it correctly at every step:

1. **It named its method when it made the claim:** *"A grep across both frontend repositories finds
   exactly one workforce client, the manager route, and that file explicitly documents that it does not
   bind the POS route."*
2. **It was corrected in place, at the claim, hours later** (`14385`): *"**Correction, 2026-08-03 — this
   flag is stale as world-description, hours after being raised.** A whole-set review found a POS clock
   caller on `lane/fe-wf-oplink`, unpushed."* — then states plainly *"So 'no client anywhere' is **no
   longer true**"*, and narrows what remains true rather than deleting the entry.
3. **It was updated again on 2026-08-04** when `L-WF-PUNCH-UI` built the screen, and **recorded rather
   than cleared**, because the work is on a lane branch and *"the clerk clears a flag only when the
   condition is actually met in the tree."* That is C-5's failure mode, anticipated and refused.
4. **It explains why the absence held**, which is the part that converts a grep into knowledge:
   `POST /workforce/pos/clock-events` needs a device JWT **plus** `X-Operator-Session`, and the POS
   shell *"is the only place in the app that holds one — so 'the till register screen does not exist in
   any repo' was true, and the surface had exactly one possible home."*

**I falsified point 4 and it holds — verified against `HEAD`, not the working tree** (see §1.5).
Positive control: `X-Operator-Session` is findable — six `core/services/*` attach it (`pos`,
`open-check`, `cash-drawer`, `operator`, `report`; `kitchen-service.ts:9` documents that it deliberately
does *not*). Those are plumbing reading a value *"set once by the caller after login"*. At `HEAD` every
production site that **sets** it is in one file: `components/admin/pos/PosShell.vue:322-326` (all five
services) and `:396` (session restore). Nothing else in `components/` or `pages/` sets it.

**Amendment.** My first pass also cited `ClockScreen.vue:184` taking the session from the shell — that
file is **untracked and not at `HEAD`**, so it is lane-branch evidence. Removing it *strengthens* the
finding rather than weakening it: at the integration branch `PosShell.vue` is the sole setter outright,
which is precisely why the flag can say the till surface *"had exactly one possible home"* — and it
confirms the flag's own statement that the screen is still unmerged.

**Why this matters for §3's finding.** C-1 and C-2 are not evidence of a careless culture — this flag,
in the same document, does everything they failed to do. **The difference is location:** corrections
written *at the claim* stayed correct; corrections written in a distant Decision block left the original
standing. That makes it a fixable process gap, not a discipline problem, and is why §7's standing check
is cheap.

### V-5 · `WoltMenuSyncBackgroundService` was never registered in any commit — HOLDS as method

`docs/plan/plan.md:907` and `13066`: *"`git log -S` across all refs finds no commit in history that ever
added a hosted-service registration"*, *"having verified across **all branches** that no commit has…"*.
**Names its surface (all refs) and its tool (`log -S`).** This is the right shape for a
history-exhaustive claim and it is what makes `D-WOLT`'s `leave-as-is` ruling safe: the plan can say
*nothing is exposed while this waits* at `13074` because the absence was established over history, not
over the working tree.

## 5. UNVALIDATED and LOAD-BEARING — named at file and line

These assert an absence with no named search surface, and something rests on each. Ranked by consequence.
None is shown to be false; the finding is that **none was ever shown to be detectable.**

*(U-1 was in this table when it was written; I then ran its search and it moved to §4 as **V-6**, validated
and understated. It is left out here rather than double-counted.)*

| # | file:line | claim (short) | load-bearing for |
|---|---|---|---|
| U-2 | `docs/plan/plan.md:7054`, `7264` | "index in `OnModelCreating` and in no migration is a constraint production does not have" | the general C2 rule; stated twice, verified at neither site |
| U-3 | `docs/plan/plan.md:7301` | a migration "held no migration slot… the dangerous direction of model/chain divergence" | chain integrity |
| ~~U-4~~ | `docs/plan/plan.md:9974` | *(moved to §4 as **V-7** — I ran its search; it holds)* | — |
| U-5 | `docs/plan/plan.md:4404` | "**The new seed parameter has zero callers**" | a C3 reachability finding |
| U-6 | `docs/plan/plan.md:8319` | a second surface "with **zero callers**… waiting for someone to decide whether it is a missing surface or dead code" | **a pending delete/keep ruling rests on an unverified zero** |
| U-7 | `docs/plan/plan.md:14299`, `14324` | "a whole module surface with no caller"; the POS shell "the only place in the app that holds one" | C3; an *only place* claim, cheap to falsify, never falsified |
| U-8 | `docs/plan/plan.md:1429` | "**nothing releases the superseded one** — the release method exists on the authority and no controller…" | a money-adjacent hold never released |
| U-9 | `docs/plan/plan.md:15036` | the settlement concurrency guard "is exercised nowhere" | C4-adjacent: the control stopping two operators overwriting a money document |

**U-9 is the best of the unvalidated set and deserves its own note**, because it shows the category is not
uniform. It names no *search*, but it names a **mechanism** — under SQLite the settlement revision is
`null` so the if-match guard goes lenient; under SQL Server it is a rowversion; *"the container-free tier
is the only tier that has run"*. It also states its own limit precisely: *"This is not a defect in the
guard; it is a guard nothing has ever pressed."* It is independently corroborated by the standing estate
fact that **no SQL tier has run against this family of commits**. I did not promote it to validated
because confirming it requires running the SQL tier, which this lane is forbidden to do — **so its status
is "unvalidated and probably true", which is a different thing from the bare assertions above it.**
| U-10 | `docs/plan/plan.md:3602` | "**There is no such thing — not on any branch, not…**" (audit event for test-send) | a Growth statutory surface; *no branch* asserted without a ref sweep |
| U-11 | `docs/plan/plan.md:1652` | "`Content-Disposition` was readable **nowhere**" | download/export correctness across six surfaces |
| ~~U-12~~ | `docs/plan/plan.md:10079` | *(resolved in **C-5** — "three locales" holds, "two tests" is one)* | — |
| U-13 | `docs/plan/plan.md:5748` | request-body middleware "**DI-registered but never added to the pipeline** — one line restores it" | **C7.** Justified a deletion (`L-AI-MIDDLEWARE-DELETE`) — see note below |

**Note on U-13, the one I probed.** At `8e2b57de` the magic number `8190` survives only in
`WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs`, and I found no production class carrying it. That is
consistent with **the deletion having landed and the pin remaining to red if it is wired back**, i.e. the
lane's work succeeded even though its plan entry still reads `built-unverified` against an unpushed
branch. I did not confirm the *original* "DI-registered but never in the pipeline" claim, because the
code it described is gone from the tip I can measure — **the claim is now unverifiable from here, which
is a different status from unvalidated**, and I flag it rather than guess.

## 5b. Coverage — what this audit did NOT check, stated so silence is not mistaken for a check

This lane's own exit asks for *every* absence claim in the plan **and in the committed lane evidence**.
That is two corpora and I did not cover them equally. **Refusing to imply otherwise is the whole subject
of this lane**, so the boundary is drawn explicitly:

| corpus | size | coverage |
|---|---|---|
| `docs/plan/plan.md` | 415 candidates → 122 strict claims | **read and classified by hand; 14 verified by direct measurement** |
| `lanes/*/` evidence | 118 .md, 494 candidate lines | **delegated sweep; see §8** |
| `docs/plan/returns/` | 283 .md, 403 candidate lines | **delegated sweep; see §8** |

**A caveat on the word "committed".** `docs/plan/` is entirely untracked and most of `lanes/` is
untracked (`git status` shows `?? docs/plan/`, `?? lanes/L-*`). I read "committed lane evidence" as
*landed in the lane directories* rather than *git-committed*, since the strict reading would exclude the
plan itself. The on-disk corpus is the superset and is what I audited.

## 6. UNVALIDATED, not load-bearing

The remaining ~80 strict claims in plan.md sit in narrative passages, `pro:`/`con:` tradeoff lines and
retrospectives, where an absence is context rather than a premise. Representative, all with no method:
`2049`, `2118`, `2227`, `2388`, `2536`, `2666`, `2987`, `3141`, `3176`, `3256`, `3474`, `3616`, `3823`,
`3994`, `4047`, `4189`, `4691`, `5145`, `5215`, `6118`, `6207`, `7457`, `7573`, `7903`, `8182`, `8229`,
`8281`, `8294`, `8541`, `9080`, `9094`, `9665`, `10098`, `10724`, `10799`, `11027`, `11444`, `11508`,
`12176`, `12410`, `12461`, `12696`, `13491`, `14086`, `14417`, `14735`, `15026`, `15163`, `15328`,
`15906`, `15981`, `16033`, `16037`.

**These are not defects and should not be treated as a backlog.** They are listed so the census is
complete and so nobody later mistakes this document's silence about them for a check.

## 7. What a later lane owes (no code changed here)

1. **`plan.md:470-473` and `828-830`** — remove/amend the refuted Meals-gate conclusion. Prose only; the
   code and the probe are already correct. *Highest priority: it is pilot-facing and the lane is marked
   `verified`.*
2. **`plan.md:2329-2330`** — mark the corrected `FallBack` call-site count at its site.
3. **`plan.md:5842`** — retitle the lane off the refuted "reaches nobody" premise; settle three-vs-four
   with one recorded measurement replacing `3316`, `11738` and `13007`.
4. **`plan.md:10007`** — requalify "binds issue and nothing else" to the invitation scope.
5. **`GrowthAuditEvents` (V-6) — the only item here that is a code defect, and it is a migration.** A
   migration author (C2: one at a time) creates the table and both indexes. Rank beside `F-ACCT-DUP`.
6. **`e8d69fc` (C-5)** — land the locale deletion, or re-do it on the integration branch. Until then
   three locales ship a statement the plan believes false, held in place by a passing test.
7. **`plan.md:8319` (C-6)** — strike the stale open question; correct `getPublicationHistory` →
   `GetPublicationHistory` there and in `lanes/L-WF-FAILURES-SURFACE/evidence.md:30`.

### A cheap standing check this audit suggests

Five of six contradictions share one mechanism: **a claim and its correction living far apart, with only
the correction updated.** A `plan`-level guard could catch most of it — when a Decision or Flag block
quotes a sentence in order to refute it, require the quoted site to carry a marker. C-1 and C-2 would
both have been caught the day they were corrected, and C-1 is currently `state: verified`.

## 8. Delegated sweeps — lanes/ and returns/

Two read-only sweeps were dispatched over the two evidence corpora this lane could not read by hand in
the time available, under the same rules used above (name the method; control every zero; separate
falsifying a claim from falsifying its explanation; rank by consequence).

**Both landed. Coverage: `lanes/` 118/118 files; `returns/` 282/282 files** (the returns corpus grew
280→282 mid-audit). Combined with §2, this closes the lane's exit across all three corpora.

**Attribution rule for this section:** items marked ✔ **I re-ran myself**; the rest stand on the
sweeping agent's authority, which I state rather than launder. Both agents re-ran every contradiction
themselves rather than inheriting a subagent's zero, and both reported their own false zeros.

### 8.1 Combined census

> **Read the middle column as a disclosure measure, not a correctness measure** — amended by
> `L-ABSENCE-AUDIT-CONDITIONS` after review. It counts claims that **name a surface they were checked
> against**. It does **not** mean the claim was shown true. The column was headed `validated` in the
> first version of this document, and that word was stronger than the thing measured; it is renamed
> here, and `unvalidated` is renamed with it, because the two are complements of one rule.
>
> **Where correctness actually was re-derived, first-hand, in this document:** the fourteen §2b findings
> (`V-1`–`V-9`, `C-1`–`C-5`, plus the retracted `C-6` → `V-9`), the two §8.4 calibration cases, and the
> four items marked ✔ in §8.2/§8.3/§8.7. Everything else in the two sweep rows is method-named, not
> shown true. The review put the re-derived population at **roughly 60 claims of ~1,440**; I have not
> recomputed that figure and do not restate it as mine.
>
> **The three rows are not one quantity.** Each was judged by a different agent under its own reading of
> the rule, with no shared calibration and no cross-checked sample, so the `total` row sums unlike
> things. Treat the totals as an order of magnitude, not a measurement.
>
> **This census rests on agent authority, and its rows cannot be inspected.** The per-claim lists behind
> `~700` and `~620`, and the 46 sweep-attributed contradictions, were never written to disk — this lane
> directory holds `absences.md` and nothing else. They could not be landed after the fact because the
> sweeping agents' working sets did not survive them. **A census whose rows cannot be inspected is a
> number, not a measurement**, and only the `plan.md` row is hand-checkable against this document.

| corpus | claims | method-named | no method named | contradicted |
|---|---|---|---|---|
| `plan.md` (§2, mine) | 122 strict | 29 method-named | ≥93 | 6 → **5 after my C-6 retraction** |
| `lanes/*/` | ~700 | ~150 | ~530 | 24 |
| `docs/plan/returns/` | ~620 | ~500 | ~95 | 22 |
| **total** | **~1,440** | **~680** | **~720** | **51** |

**Roughly half of all absence claims in this program name no surface they were checked against.** That
sentence is the honest reading of the table above, and it is the one to quote.

**The `lanes/` ~21% versus `returns/` ~80% gap is directionally real and quantitatively unsound.** Keep
the direction; do not quote the rates. *Amended after review — the first version called `returns/` the
"healthiest" corpus, and that word is withdrawn.*

- **The likeliest cause is structural, not cultural.** The RETURN protocol makes an `evidence:` line
  mandatory, so a return is *compelled* to name a surface where a lane working note is not. The gap
  measures a form requirement, not two populations of differing care.
- **Two different judging agents, no shared calibration.** Neither sampled the other's corpus, so the
  two rates are not on one scale.
- **Both claim counts exceed their own candidate pools** — ~700 against 494 and ~620 against 403 — and
  the review found the excess never reconciled. Something is being double-counted or the pool is
  mis-stated, and this document cannot say which.
- **Per-claim crediting structurally favours the short document.** A 15-line return that states its
  surface once is credited per claim; a long document that states its surface once at the top is not.
  **`absences.md` itself would classify largely unvalidated under its own rule** — §0 names its ref
  once, for everything below it.

### 8.2 The finding both sweeps and my own retraction converged on, independently

**Three agents, working separately, arrived at one mechanism: claims that grepped a *working tree* and
then generalised to "any repo" / "every branch" are the ones that broke; claims that grepped a *commit*
(`git grep <sha>`, `git ls-tree <sha>`, `git log --all -G`) reproduce exactly today.**

I include myself in that population. My C-6 failed for precisely this reason (§1.5), and I did not
discover it — the `lanes/` sweep refused my finding and I checked. **The convergence is the strongest
result of this lane**, because none of the three was told the others' conclusion.

Why the estate produces it: ✔ **the `Web-modules` checkout is 269 files dirty** with ~15 lanes'
uncommitted work, and 187 of 315 backend branches are unmerged. *"The tree"* denotes three different
things here — working tree, integration branch, and any-branch — and the word does not distinguish them.

### 8.3 Contradictions worth acting on (from the sweeps)

**A systemic instrument defect across three sweep lanes, all failing in the same direction** — path
existence checks reporting *"file does not exist"* for files that exist:
`L-JOURNEY-EVIDENCE-SWEEP/verification-map.md:366,378,414,444,450,718` (six rows, all six files present),
`L-EXIT-INSTRUMENT-SWEEP/map.md:90-108` ("13 of 14 do not exist" — all 14 present), and
`L-EXIT-INSTRUMENT-CENSUS/census.md:348,349`. Negative controls passed in every case, so the checks do
discriminate.

**DIAGNOSED — this paragraph's conclusion is now superseded** (amended by `L-ABSENCE-AUDIT-CONDITIONS`;
recorded on `F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT`). **The cause is decoration, and nothing
else.** At `~/.claude/skills/plan-hub/bin/plan`, `_evidence_kind_ok`, lines 8719–8721, the **entire
evidence string** is passed to `os.path.exists` — parentheticals, `· sha` annotations and multi-path
lists included:

```
path = ev if os.path.isabs(ev) else os.path.join(p.repo_root, ev)
if not os.path.exists(path):
    return False, "evidence path does not exist: %s" % ev
```

Reproduced directly: `lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md` **exists**; the same path followed by
`(commit 2a3a881 on feature/restaurant-modules, local)` reports **absent**. **Zero of the 89 denial rows
carries a bare path.**

**The refusals are protocol-correct, which inverts what this paragraph first said.** §2.4 requires
evidence to be a single existing repo path, so an annotated line genuinely is inadmissible. The
*"N exits lack admissible evidence"* figures — the 183-exit headline and the 65 case-2 exits among them
— are therefore **not inflated as admissibility counts**; they were misread as file-existence counts, by
the sweep's own message wording, by this audit quoting it, and by the clerk. **The message is the defect,
not the check.** *The sentence this document previously carried here — that every downstream
admissible-evidence figure is inflated by an unknown amount — is withdrawn as false.*

**Do not reach for the tracked-versus-untracked explanation.** It was published and then refuted: 7 of
the false rows are tracked and 19 are not, and decoration decides every one of them. That axis is a
correlation, not the cause.

Others, on the sweeps' authority. **Four of these were sampled for re-derivation after review and two of
them failed** — both sweep-attributed, and both failing in a mode §0 and §1 of this document legislate
against. *Amended by `L-ABSENCE-AUDIT-CONDITIONS`, which re-ran each check named below.*

**DEMOTED — not contradictions:**

- ~~`L-DOWNLOAD-HEADERS-1.md:7` claims its own brief does not exist while quoting that brief's embedded
  hash (the file is present, 7998 B).~~ **The claim was true when written.** The lane returned
  `2026-08-01T16:08Z` (`log.md:178`); `docs/plan/briefs/L-DOWNLOAD-HEADERS.md` was written at
  `2026-08-01 17:51`, **103 minutes later**. And the supporting inference is refuted by the return's own
  sentence: it says *"I worked from plan.md's lane entry plus the dispatch message"* and *"hash above
  computed read-only via `brief_hash_of`"* — so quoting the hash never implied the file existed. This is
  §0's own distinction (*"was wrong"* versus *"has since been created"*, §0 lines 20–22) applied against
  this audit, and it is the same shape as the census whose two "absent" files were written 10 and 74
  minutes after it ran.
- ~~`L-PRICE-BYPASS-FIVE:77` — *"occurs exactly once in the whole repo"* → five places — which justified
  a deletion: the deletion was right, the sentence was not.~~ **The sentence was right too.**
  `git grep -n calculateTotalRewards HEAD` returns **exactly one** hit,
  `components/molecules/CustomerInfoModal.vue:305` — its own definition, as claimed. The "five places"
  are five **prose mentions** in `lanes/` and `docs/plan/returns/`, every one a document *about* this
  deletion, and one of them is the audited sentence itself. **The absence search found itself** — the
  hazard recorded the same day as *"`lanes/` is now searchable, so root-wide `-S` searches match their
  own evidence."* Controlling the zero, which §1 requires, would have caught it.

**Sustained on re-derivation:** `L-MODAL-SEVEN`'s *"no such method or computed exists"* for
`deliveryTypeLabel` — the method is defined at `plugins/global-mixin.js:97` and has been since
`76be1dc` (*Initial commit*, 2025-09-28), so it was present at that lane's own ref and the sentence is
false as written. *(Its underlying observation may still be sound — a modal that will not mount in a
test where the global mixin is not installed — which is §8.4's claim-versus-explanation split again.)*

**CANDIDATES — carried forward, not established.** The remaining sweep-attributed contradictions in this
section, and the 46 in the census, are **candidates needing per-item re-derivation at the ref each claim
was written against**, not findings:

- `L-INVOICE-RETRY-RETIREMENT:8` *"`--contains` answers ONE branch"*. Today `git branch --contains
  2497ce9d` in `OkamAPI-modules` answers **37**, not the 36 this document reported, and the commit **is**
  an ancestor of the integration branch. But the commit is dated `2026-08-02 13:38 +0200` and the lane
  returned `2026-08-02T15:13Z` — **the drift from 36 to 37 is itself proof that branches accrued after
  the fact**, and a tip measurement cannot settle what `--contains` answered that afternoon.
- `L-JOURNEY-MARGIN/NOTES.md:94-102`, where the sweep **reversed its own earlier ruling** after two refs
  proved too few (`MarginWasteController.cs` exists on 14 branches). Not re-derived here.

**Two of four is the rate to carry, not the two items.** Both failures inflated the contradicted column,
and both would have been caught by the rules this document already states — which is an argument for
applying §1 to the sweeps' output, not for trusting the sweeps less than §2b.

### 8.4 The two calibration cases my brief named — both resolved, and they fail differently

- **`L-PRICE-SHADOW-GUARD-1.md:15` — the correction was right, and the defect still ships.** `priceLabel`
  is declared at line **591** exactly as claimed, and is *still declared at committed `HEAD`* (line 582).
  It is vacated only in the **uncommitted working tree**. So the original *"fixed the shadow outright"*
  was sincere-but-partial (coercion fixed, declaration left), the shadow-guard lane was correct to refuse
  it, **and the shadow is live on the integration branch today.**
- **`L-PRICE-CROSSCURRENCY-1.md:13` — EXPLANATION refuted, CLAIM upheld**, exactly as my brief described.
  `signedAmount` negates only inside the `minor < 0` arm and `null < 0` is `false`, so `-null` never
  happens; absence takes the else arm and reaches the gate by the *same* door as `amount`, not a second
  one (`utils/margin/money.js:56-60`). **The loss column really did print a zero; the stated reason was
  wrong.** Notably `test/price-crosscurrency.test.js:166-177` already carries the correction in prose —
  **the code was fixed and the return document never was**, which is §3's repair asymmetry again, in a
  third corpus.

### 8.5 Load-bearing unvalidated, from the sweeps

Highest consequence — each **justified an action**: `L-GROWTH-MAIL:19` (*"dead only while the fake was
hard-bound"*) justified **deleting two reachability parks** with no importer sweep, no `git log -S`, no
control; `L-WF-BOOTSTRAP:35` justified **dropping two feature flags from the seed**; `L-GR-DISPATCH-ACTOR:11`
and `L-GR-TESTSEND-GUARD:8-10` each justified **writing no test at all**; `L-UTLKVIT-FAMILY-LAND:17`
graded exposure *latent, not live* on an *"every branch"* claim with no sweep across a 315-branch repo;
`L-WF-EXPORT-DUPLICATE:14` asserts an index is *"in no migration"* with no chain scan named — **the same
shape as V-1, which I proved true, so this one is probably true and still unchecked.**

Four claims in `lanes/` about append-only triggers / `GuardAppendOnly` coverage (`MealsCommandReceipts`,
`WorkforceInvitations`, `MarginSupplierItemPrices`, `WorkforceStaffMembers`) **cannot be settled by grep
at all** — per the estate's own standing law, SQL Server evaluates FKs before AFTER triggers and triggers
are diff-invisible. They need a live `sys.triggers` diff at the SQL tier, which this lane was not
permitted to start. **They are unvalidated for a structural reason, not a careless one**, and each
carries a C1 clearance.

**ADDED after review, not corrected — this document never carried it.** `L-JEST-COLLECTS-LANES/evidence.md:83-84`
asserts that **29 superseded assertions silently rejoin the green count** as duplicates of the live test.
It is a population claim about what a green suite is counting, it names no per-assertion check, and it is
**unvalidated** here.

Two things about it must not be laundered. **First, it is being added, not corrected.** A status message
attributed this claim to `absences.md` as its largest unverified deletion-class claim; **that attribution
was never in this document.** `L-JEST-COLLECTS-LANES`'s only appearance below, in §8.6, is as a *validated
exemplar* — one of the lanes that plant the thing and show the detector fire before accepting a zero — and
that entry stands. **Second, it is not deletion-class.** Nothing was deleted: the lane's own evidence says
so twice (*"Nothing was deleted"* at `:103`, and at `:183-184` *"the files are present and not collected,
so it is the exclusion doing the work and not their absence"*). The consequence ceiling is **one
`testPathIgnorePatterns` entry in `jest.config.js`, reversible in one line** — which is why it is recorded
here rather than ranked beside the deletions above.

One the sweep verified as **true and worse than reported**: `L-EV-ACCEPT-GATE:15` — `POST /events/inquiries`
is ungated; `EventsController.cs:86` is `[AllowAnonymous]` behind only a rate limiter, and
`IEventsModuleGate` is injected at `:40`/`:48` with **zero call sites in the controller body** — a dead
gate dependency nobody had reported.

### 8.6 Validated exemplars from the sweeps — the techniques worth copying

- `L-WF-TIMEOFF-DECIDE-GATE:7` — *"0 of **246 local branches** carry the fix"*: **names the scan and its
  scope.** The gold standard for an *exists-on-no-branch* claim, and the antidote to §8.2.
- `L-COMPOSE-CENSUS:9-13` — filtered 315 refs down to 78 mergeable heads **before** counting; the
  sweeping agent's own naive 79-branch count is exactly the error it guards against.
- `L-EV-GUESTLINK-ONE-COMPOSER` — sweeps refs, **all 33 worktrees on disk**, both stashes, and
  `git fsck --lost-found` per dangling commit, then uses that last step to **catch a sibling's false
  "only one blob exists in the entire object database."**
- `L-COLLECTED-PATHS`, `L-LANES-OUT-OF-THE-ASSEMBLY`, `L-JEST-COLLECTS-LANES`, `L-STATUTE-EVIDENCE-WORLD`,
  `L-UTLKVIT-*` — **plant the thing and show the detector fire before accepting a zero.** One states the
  principle outright: *"absence is not exclusion."*
- `L-TRAIN-W3-SCHEMA`, `L-TRAIN-DISCLOSURE`, `L-WF-PUBHIST` — convert the absence into **an executable
  pin that reds when the absence ends.** The only form that cannot rot, and the answer to every stale
  claim in §3.
- `L-WF-TIMESHEET-RACE:16` and `L-WF-DIGEST-TAUTOLOGY:13` — **refused to let an absence justify a
  deletion, and said why.**
- `L-VIPPS-LOG`, `L-WF-CONTACT-PINS`, `L-HOSTED-SERVICE-FLOOR` — proved their own green guards
  **non-vacuous by reintroducing the leak.**

### 8.7 Estate hazards surfaced in passing — outside this lane, worth escalating

1. ✔ **`docs/plan/` has 0 tracked files and is NOT gitignored** (`git check-ignore` finds no rule;
   control: `docs/` has a tracked file). **The 16k-line plan, 282 returns and this audit are one
   `git clean -fd` from gone.** Highest-severity item in this document that is not about absence claims.
2. ✔ **Proven deletions never landed.** All four `calculateTotal*` are at `HEAD` (V-4 amendment), and
   the `priceLabel` shadow with them.
3. The `core` submodule is pinned at `1bcab0b6`, **contained by 0 remote refs** (control: 9 exist) — a
   fresh clone cannot resolve its own pin.
4. The `jest.config.js` lanes-exclusion fix is **working-tree only**; its commit is on 0 branches.
5. Live at `HEAD`: `wolt-menu.vue` binds `handleLoginSuccess` with 0 definitions, and `brev.vue` calls an
   undefined `loadOrders` (control: `products.vue` defines it at `:1125`).

### 8.8 Both sweeps reported their own false zeros — as did I

The `returns/` sweep hit two (zsh not word-splitting `$files`; BSD `xargs` lacking `-a`), the `lanes/`
sweep had two controls fail and **reversed one of its own rulings**, and I had four plus a retracted
finding. **That is eight-plus false zeros among three agents actively hunting this failure mode.** It is
the strongest available argument that the ~720 unvalidated claims in §8.1 are not a bookkeeping nicety:
the ambient error rate for people *not* looking for it will not be lower.


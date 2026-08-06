# Evidence — L-MEALS-DOCSYNC

brief `cd696c8e` · exit: *no comment or document in the Meals surface asserts a fact the branch has
falsified, and the knowledge check is clean*

## 0. Where this ran, and at what

| | |
|---|---|
| backend base | `feature/restaurant-modules` @ **`8e2b57de`** — the tip the brief named, **verified still the tip when measured** (`git log -1 feature/restaurant-modules` → `8e2b57de`, and `git branch --contains 8e2b57de` → `feature/restaurant-modules` only) |
| backend worktree | `/Users/svendaneel/okam/wt-mealsdocsync`, new branch `lane/meals-docsync`, commit **`f7b30b2d`** |
| frontend base | `Web-modules` `feature/restaurant-modules` @ **`3cd2570`** |
| frontend worktree | `/Users/svendaneel/okam/web-mealsdocsync`, new branch `lane/fe-meals-docsync`, commit **`7ac2f92`** |
| containers | **none started, none stopped, none touched.** Container-free tier only. |
| migrations | none authored. No schema touched. |
| shared refs | **none moved.** Both commits are on new lane branches. Nothing pushed. |

**The shared `Web-modules` checkout was left exactly as found.** Four files were edited there first,
then copied into the lane worktree and `git checkout --` reverted in the shared tree; the unrelated
dirt belonging to other lanes (`pages/preferences/communications.vue`,
`utils/growth/growth-guest-client.js`, `test/e2e/journeys/admin-refusal-worker.spec.js`,
`lanes/L-EV-JOURNEY-TIMEBOMB/*`) was never touched.

**Expected dirt, restored not committed:** a full container-free run dirtied
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` exactly as the brief predicted. Both restored with
`git checkout --`; neither is in `f7b30b2d`.

---

## 1. The machine half — verbatim

### Knowledge check

```
$ cd /Users/svendaneel/okam/modul && pnpm knowledge:check

> modul@ knowledge:check /Users/svendaneel/okam/modul
> node tools/knowledge-check.mjs

  · DOC-MAP: 38 referenced files checked, 0 missing
  · repos validated: 11/11

knowledge-check PASS — registry + DOC-MAP consistent.
```

`pnpm knowledge:check` lives in `frontend-mono` (`/Users/svendaneel/okam/modul`), not in either repo
this lane edits — it is the estate-wide registry/DOC-MAP validator, and it is the only thing in the
estate called "the knowledge check". It is **advisory by design** (its own header: *"not wired into CI
or the quality sweep, so it can never block a merge"*), so a PASS means the registry and DOC-MAP are
consistent — **it says nothing about Meals prose**. The Meals half is § 2 and § 3 below.

### Backend container-free tier (`lanes/L-MEALS-DOCSYNC/containerfree-run.txt`)

```
$ dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"
Passed!  - Failed:     0, Passed:  4638, Skipped:    12, Total:  4650, Duration: 5 m 57 s
```

The filter is the one the brief mandates (`Database!=SqlServer`), **not** `FullyQualifiedName!~SqlServer`.

### Frontend Meals suites

```
$ npx jest test/meals-admin-client.test.js test/meals-companies-page.test.js \
           test/meals-components.test.js test/meals-admin-view.test.js
Test Suites: 4 passed, 4 total
Tests:       86 passed, 86 total
```

---

## 2. The guard, and the difference merging this lane makes

`lanes/L-MEALS-DOCSYNC/docsync-guard.py`. Every rule has two halves resolved **at run time**:
`truth()` parses the source of record and answers *does this capability exist right now*; `claim()` is
a **family** of regexes, not one literal. A rule fires only when truth EXISTS and a claim matches. If
the code is reverted the truth goes false and the rule stops firing on its own — the guard cannot
outlive its subject. If a truth cannot be resolved at all the run FAILS rather than passing silently.

**Run A — the true integration tips** (`guard-A-tips-RED.txt`), backend read from a throwaway detached
worktree at `8e2b57de`, frontend at `3cd2570`:

```
=== FAIL ===   21 reasserted false claims across 7 files
```

**Run B — the lane worktrees** (`guard-B-lane-GREEN.txt`):

```
=== CLEAN ===  none
```

The delta between A and B **is** what this lane buys, stated as a machine result rather than a claim.

### Mutation proof (`mutation-proof.py` → `mutation-proof.txt`)

Five mutations. Four reintroduce a claim **in different words from the sentence the lane deleted**,
two of them **planted in files this lane never touched** — because a guard keyed to one literal is
defeated by a rewording, which is the failure the brief names explicitly. The fifth attacks the
guard's own escape hatch.

| mutation | where | mutant | restored |
|---|---|---|---|
| M1 OPTIONS-BOUND — *"section is never bound"* (deleted text said `Configure<…>` is never called) | `RUNBOOK.md` | **RED** | GREEN |
| M2 AGREEMENT-CREATE — *"agreements have no create endpoint"* | journey manifest | **RED** | GREEN |
| M3 RESERVATION-TOKEN | `utils/meals/meals-client.js` — **a file the lane did not edit** | **RED** | GREEN |
| M4 INVITATION-CLAIM | `MealsPeoplePanel.vue` — **a file the lane did not edit** | **RED** | GREEN |
| M5 strip the dated closure from the freeze-frame ledger | `b-meals-completeness.md` | **RED** (4 rows fire, incl. the preserved F3) | GREEN |

M5 is the one that matters most for this lane's discipline: the ledger's preserved rows are exempt
**only** because the file carries a dated closure naming a commit. Remove the closure and the rows
fire again — so the exemption is not a blanket escape hatch for "call it history and move on".

### The harness was wrong three times, and each was diagnosed rather than worked around

**(a) A pattern that could not match its own subject.** `Configure<MealsFeatureSettings>` is wrapped in
backticks in Markdown, so the OPTIONS-BOUND pattern matched the claim in `seed-meals-demo.sh` (no
backticks) and **silently missed the identical claim in `RUNBOOK.md` §0 and §9**. Found by reconciling
the guard's hits against the hand sweep — *not* by the guard. Fixed (`[`*\s]*` between identifier and
verb); run A went 19 → **21**. This is precisely the failure the brief warns about, produced by this
lane's own instrument, and it is the reason the hand sweep in § 5 exists alongside the guard rather than
being replaced by it.

**(b) A proof that measured a different tree from the one it mutated.** After the guard gained
overridable roots, `mutation-proof.py` still had `FE` hardcoded: it planted M3/M4 in the shared checkout
while the guard scanned the lane worktree, and both reported **GREEN against a mutated file** — a
false "non-vacuous" result. Fixed by making the proof read the same env roots and pass them through to
the guard. Re-run: all five RED, all five restores GREEN.

**(c) The truth predicate named the wrong file.**

`truth_client_sends_reservation_token()` first named

`ConsumerWeb/components/organisms/CheckoutMeals.vue` as the client half and answered **absent** against
a live, working checkout. That component is the payer *strip* — it chooses the tender and renders the
reserved cap; it never names the token. The file that puts the token on the wire is the **shared Core
submodule**: `core/services/cart-service.ts`, `Complete(storeId, reservationToken?)` →
`?reservationToken=` (Core `ef833ca`). Pointing the truth at the strip made the lane's own instrument
produce a false negative about a capability that exists. Fixed, and the diagnosis is recorded in the
predicate's docstring so the next reader does not repeat it. **This also corrected the lane's own
prose**: the first draft of the `meals-companies.vue` comment credited `CheckoutMeals.vue` with
carrying the token. It does not.

---

## 3. The corrections — each naming the commit that falsified the sentence

### Backend `f7b30b2d`

| # | file:line (at `8e2b57de`) | the falsified assertion | falsified by |
|---|---|---|---|
| 1 | `Scripts/demo/RUNBOOK.md:35-39` | funded half *"cannot be reached in any deployment — not by a flag, not by an environment variable"*; `Configure<MealsFeatureSettings>` never called | `d81f037b` + `bf650efd` |
| 2 | `Scripts/demo/RUNBOOK.md:485-489` | same, plus *"Setting `Features__Meals__Module=true` in the environment does nothing, because nothing reads the section"* | `d81f037b` + `bf650efd` |
| 3 | `Scripts/demo/RUNBOOK.md:507-509` | *"Binding `Features:Meals` is item 2 on Sven's open-decision list … It is not an agent's call."* | `d81f037b` (an agent bound it; **what stays Sven's is switching a money flag on**, and the corrected text says exactly that) |
| 4 | `Scripts/demo/RUNBOOK.md:625` | *"`Features:Meals` is unbound"* | same |
| 5 | `Scripts/demo/RUNBOOK.md:491-494`, `:641` | *"21 of the module's 23 endpoints"*, *"the 2 that answer"* | route count is now **30 (7 store-addressed, 23 company-scoped)** and the per-store lever lights **four** — pinned by `MealsOperatorLeverReachTests:58` and its docstring, not invented here |
| 6 | `Scripts/demo/seed-meals-demo.sh:7-15,17,37,182,208` | the same binding claim in five places, incl. the printed operator summary `Features:Meals UNBOUND` | `d81f037b` + `bf650efd` |
| 7 | `WebApi.Tests/Meals/MEALS-MEMBERSHIP-JOURNEY-MANIFEST.md:23` | *"agreements have no create endpoint in v1"* | `588061e7` — `MealsAgreementController`, `POST stores/{storeId}/meals/companies/{companyId}/agreements` |
| 8 | `WebApi.Tests/Meals/MealsPilotFullLoopJourneyTests.cs:83,254` | *"there is deliberately no agreement-create endpoint in v1"* | `588061e7` |

**The behaviour of the demo world did not change and was not claimed to.** `appsettings.json` ships all
four Meals flags `false`, so the seed's two `404` probes are still correct and the world is still dark.
What changed is the **reason**, and the reason is what an operator acts on: the old text told them no
environment variable could ever reach the gate. One can now.

**On #7/#8 I corrected the reason, not the fixture.** The journey still seeds the agreement row
directly; the comments now say that the corridor signature is therefore the one step of the pilot loop
this journey does *not* prove, which is a true and more useful statement than "no route exists".

### `docs/plans/replan/b-meals-completeness.md` — closed, not rewritten

This file declares itself in its own header: *"STATUS — VALID AS OF 2026-07-27. This is a freeze-frame
… its rows are deliberately left unedited."* It already carries a dated STATUS block listing what has
landed since. **Not one row was edited.** Three closures were appended to that block, dated
2026-08-04 and naming what closed them:

- **F1 / §2(a)** *"there is no configuration a customer or an operator can reach that makes any Meals
  endpoint answer"* → closed by `d81f037b` + `bf650efd`.
- **F3** *"the corridor agreement has no production write path"* → closed by `588061e7`.
- **§5** *"`GetMyCompanies` (backend route does not exist yet)"* → closed by `39f77db5`
  (`GET meals/me/companies`); `GET meals/me/context` also exists and carries `TimeZoneId`.

### Frontend `7ac2f92`

| # | file:line (at `3cd2570`) | the falsified assertion | falsified by |
|---|---|---|---|
| 9 | `pages/admin/meals-companies.vue:132-134` | *"a reservation token no cart in this estate sends and a company-account payer no client offers"* | Core `ef833ca` (`cart-service.ts` sends `?reservationToken=`), ConsumerWeb `ac264e5` (the `CompanyAccount` payer strip), `CartsController.Complete(storeId, reservationToken)`, walked by `8a08b36` |
| 10 | `test/e2e/journeys/meals-admin-setup.spec.js:63-65` | the same sentence, in the journey that asserts the banner | same |
| 11 | `utils/meals/admin-client.js:48-52` | enrolment left unbound because *"no client in the estate claims one"* | `a3f6100` — `pages/meals/join.vue` claims invitations |
| 12 | `components/admin/meals/MealsFundedOrders.vue:215` | *"there is no Meals context endpoint"* | `e4e9d760` — `GET meals/me/context` exists and its response carries `TimeZoneId` |

**#11 changed a decision into a gap, which is the point.** That bullet sat in a list headed *"routes
that exist and are deliberately not bound here, each a decision rather than an oversight"*. Its premise
is dead, so it is no longer a decision: with no surface to enrol anyone, a claimed member never becomes
quote-eligible and the funded journey stops there. The comment now says that.

**#12 is a true conclusion propped up by a false premise.** The surface should still render the
reader's zone — but not because no context endpoint exists. It exists and even carries the field; it is
**owner-scoped to an enrolled member**, which a venue admin reading this table is not. Only the premise
was replaced. No rendered string, selector or assertion changed.

---

## 4. What I found and deliberately did NOT change

### `IsDeterministicConstraintViolation` — left alone, as instructed, and it is correct

`Services/Meals/MealsDbViolations.cs:31-42` and `:74-87`. `IsUniqueViolation` refuses the bare SQLite
code 19 and `IsDeterministicConstraintViolation` **deliberately keeps it**; the comment at `:79-87`
spells out exactly why (19 covers NOT NULL/CHECK/FK too, and accepting it in the unique predicate turned
a programming error into a retryable "someone beat you"). The comment is true and is the only thing
making the asymmetry legible. Untouched.

### The key-stranding family — false at the tip, and already fixed by the commit that falsified it

The brief asked me to check whether `L-MEALS-IDEMPOTENCY-REFUSAL` had landed. **At `8e2b57de` it had
not**: `git merge-base --is-ancestor 569887a5 8e2b57de` passes (its *base*), but `54714dd6` is one
commit ahead on `lane/meals-idempotency-refusal` and is **not** an ancestor. The coordinator then
confirmed it returned `built`. So:

- `Services/Meals/MealsCommandReceiptService.cs:36` — *"only a stranded key. Cheap-validation-before-
  reserve keeps this to genuine races, never expected 4xx."* **Now false**, falsified by `54714dd6`.
  **I did not edit it, on purpose:** `git show 54714dd6 -- Services/Meals/MealsCommandReceiptService.cs`
  shows that commit **replaces this exact comment hunk** with a correct one. Editing it here would be
  duplicate work landing a guaranteed conflict on the identical hunk. It is corrected by its own
  falsifier; it needs that lane merged, not a second edit.
- Same for `Services/Meals/MealsProgramService.cs:498` — `54714dd6` deletes that line.
- **The enumeration the coordinator flagged is the `never expected 4xx` clause** at
  `MealsCommandReceiptService.cs:36`, and the one-active-corridor check is exactly the expected 4xx it
  excludes. Same commit, same hunk, same reasoning: not edited here.

### `MealsAgreementWriterTests` — the coordinator's item 1 is already closed

The coordinator asked me to name a test that *asserts* the defect under the comment *"the module's
documented stuck-reservation tradeoff"* and to say it needs its own lane. **It does not.**
`git show 54714dd6 -- WebApi.Tests/Meals/MealsAgreementWriterTests.cs` replaces that comment and
inverts the assertions in the same commit:

```
-        // ... The cost is
-        // the module's documented stuck-reservation tradeoff: the key is reserved but never completed
-        Assert.Null(stranded.CompletedAtUtc);
-        Assert.Equal(MealsProblemCodes.IdempotencyInProgress, retry.Code);
+        Assert.NotNull(receipt.CompletedAtUtc);
+        Assert.Equal(400, receipt.ResponseStatusCode);
+        Assert.Equal(MealsProblemCodes.Validation, retry.Code);
```

The instruction was written against that lane's pre-fix state. Reporting it as needing a new lane
would have been this program's fifth payment for text quoting an unmerged branch's state.

### `pages/meals/join.vue` — false, and also already fixed by an unmerged sibling

`join.vue:39-41` and `:317-320` assert *"`MealsMembership.EmployeeReference` does not exist"*. **False
at the backend tip**: migration `20260731215452_Meals_MembershipEmployeeReference` added the column,
`MealsMembershipService:477,506` copies invitation→membership at claim, and
`MealsStatementService:513` prefers it over the membership id. **Not edited**, for two reasons: (a)
`L-MEALS-CLAIM-RECEIPT` @ **`d833d19`** (`lane/fe-meals-claim-receipt`, **not** an ancestor of
`3cd2570`) already rewrites both blocks correctly (*"was MIG-17; the gap is now closed"*); (b) that page
still **renders** `claimed.membershipId`, so making the comment fully true requires the behaviour change
that lane carries — outside this lane's text-only boundary.

### A true statement written against a changed world — a decision record, not a defect

`MealsRouteGateReachabilityTests.cs:428,477` describes a binding that "compiles and is never called"
as the hazard the test guards. That is the hazard, still guarded, correctly stated in the present tense
about a *class* of defect rather than about this module's current state. Left as written.

### Files this lane touched that a live sibling also touches

Declared so the merge is a known quantity, not a surprise:

- **None.** `54714dd6` touches `MealsCommandReceiptService.cs`, `MealsProgramService.cs`,
  `MealsMembershipService.cs`, `MealsAgreementWriterTests.cs` and eight others — **this lane touched
  none of them.** `d833d19` touches `pages/meals/join.vue`, `utils/meals/admin-view.js`,
  `test/meals-claim-page.test.js` and the three translation files — **this lane touched none of them.**
  My four frontend files (`meals-companies.vue`, `admin-client.js`, `MealsFundedOrders.vue`,
  `meals-admin-setup.spec.js`) and five backend files are disjoint from both siblings.

---

## 5. What this sweep could see, and what it could not

**Could see.** `sweep.py` enumerated **213 backend files** (`Controllers|Entities|Enums|Helpers|Models|
Services|WebApi.Tests` under `Meals/`, plus `Scripts/demo/*` and the Meals plan docs) and **40 frontend
files** (`pages/meals`, `pages/admin/meals-*`, `components/admin/meals`, `utils/meals`, the Meals tests,
fixtures and journeys), and extracted **321 absence-shaped comment lines** — prose asserting a thing does
not exist / is not reachable / is never called, which is the only class that goes stale this way. All
321 are listed one per line in `sweep-raw.txt` and were read. The guard independently scans **255 files**
across both repos.

**Could NOT see, and no claim is made about it:**

- **`ConsumerWeb` and `Core`.** The funded checkout lives on `ConsumerWeb` `feature/swiss` @ `0abcb38`
  with `Core` @ `c0d70a4` — a different repo on a different branch, outside this lane's two repos. I
  read them to *ground* the reservation-token truth (and the guard reads them at run time), but I did
  **not** sweep their prose. **A false Meals comment in `ConsumerWeb` or `Core` would not have been
  found by this lane.**
- **Non-absence-shaped falsehoods.** The sweep keys on assertions of *absence*. A comment stating a
  wrong number, a wrong route name or a wrong ordering is not this shape and would be missed. #5 (the
  route counts) was caught only because I was already rewriting the paragraph around it — **not**
  because the instrument looks for it.
- **The four Meals surfaces with no UI at all** (statements, reconciliation queue, enrolment, capture).
  Their comments were read, but nothing here verifies claims about surfaces that do not exist.
- **Anything a person would see on screen.** Nothing was opened in a browser; no journey was run. Per
  C5 that is not acceptance of anything, and nothing here is offered as such.

- **Whatever the guard's regex families still cannot express.** Harness defect (a) above is proof that
  this set is not empty: a single pair of backticks hid two live claims from the instrument. The guard
  is a ratchet against *reintroduction*, not a proof of completeness. The completeness claim rests on
  the 321 hand-read lines, and a human read is fallible in ways a count cannot express.

**The honest scope of the exit claim:** *no absence-shaped assertion remains anywhere in the enumerated
Meals surface of these two repos that a commit on this branch has falsified* — machine-checked in both
directions (21 → 0), mutation-proved non-vacuous in five ways. It is **not** a claim that every Meals
sentence in the estate is true, and § 4 lists three sentences that are false right now and that this
lane deliberately did not touch.

---

## 6. Owed to other lanes

1. **`L-MEALS-IDEMPOTENCY-REFUSAL` (`54714dd6`) must merge** for the stranding comments in
   `MealsCommandReceiptService.cs:36` and `MealsProgramService.cs:498` to stop being false. They are
   false at `8e2b57de` today and this lane deliberately did not touch them.
2. **`L-MEALS-CLAIM-RECEIPT` (`d833d19`) must merge** for `pages/meals/join.vue`'s EmployeeReference
   assertion to stop being false. Same reasoning.
3. **`MealsProgramService.cs:32`** — *"Cheap validation … runs BEFORE the reservation, so an expected
   4xx never leaves a stuck reservation."* **This one was never true**, and no commit falsified it: the
   commit-time backstops in that same file refuse *after* the reservation, which is precisely what
   `54714dd6` adds `RefuseAsync` calls to fix. **Reported, not rewritten** — my brief requires every
   correction to name the commit that falsified the sentence, and there is none to name. `54714dd6`
   makes it true going forward.
4. **`docsync-guard.py` is lane-local.** It lives in `lanes/L-MEALS-DOCSYNC/` because that is where my
   writes belong. Making it a merge gate means moving it into a repo and wiring it to a suite — a lane
   of its own, not a thing to smuggle in here.

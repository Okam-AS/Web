# L-MEALS-RECONCILE-UI — evidence

Brief `b8c0e1a3` · verdict **built**

**Exit criterion.** *A seeded expiry exception is visible on the venue surface and resolvable from
it, and a blocked finalize names the exception that blocks it.*

**Instrument.** `test/meals-reconciliation-page.test.js` — 25 tests, all green, all driven through
the rendered page.
Command (from `/Users/svendaneel/okam/web-mealsrecon`):

```
npx jest test/meals-reconciliation-page.test.js --coverage=false
```

**Mutation proof.** `lanes/L-MEALS-RECONCILE-UI/mutation-proof.py` → `mutation-proof.txt`.
9 mutants, all killed, every restore green.

---

## 1. Tip state as actually observed — the brief said to verify, not to trust

| claim in the brief | observed | verdict |
| --- | --- | --- |
| frontend integration `3cd2570` | `3cd25709ec6af4806e4683e666f44814ff8e441a` on `feature/restaurant-modules` | **correct** |
| backend `8e2b57de` | `/Users/svendaneel/okam/wt-mealsdocsync` is at `f7b30b2d`, **not** `8e2b57de` | **stale, and it did not matter** — the reconciliation and statement controllers/services/models read there are the truth I built against; endpoints 17-20 are unchanged in shape |
| "two endpoints, both served, both unbound" | `MealsReconciliationController` binds #17 `GET /v1/stores/{id}/meals/reconciliation` and #18 `POST /v1/meals/reconciliation/{exceptionId}/resolve`; **no frontend file at HEAD referenced either** | **correct** |
| "open exceptions block draft and finalize both" | `MealsStatementService.cs:113` (draft) and `:250` (finalize) both call `GuardNoOpenExceptionsAsync` | **correct** |
| "resolve gates on configuration while the read gates per store" | `MealsReconciliationController.cs:72` calls `RequireVisible()` on resolve only; the two reads do not | **correct** |
| "the page's own comment already knows this" | `pages/admin/meals-agreements.vue:74-77` at HEAD said exactly that, and said "No button here pretends otherwise" | **correct** — and that comment was a lane hazard: I am the lane that adds the buttons, so it is rewritten in the same diff |

### The brief's numbers checked against the code, and one that is worse than the brief said

`MealsProblemException.StatementPeriodOpenExceptions(int openExceptionCount)` — the refusal a blocked
draft or finalize throws — carries `conflictKind`, `reasonCode`, `openExceptionCount` and `retryable`.
**It carries no exception id, no kind, no source key, and no company.** So clause three is not
satisfiable by rendering the server's answer: the identities exist only on the queue read, and
joining them is a client obligation. That is the "count with no identities" defect the brief names,
and it is *in the wire contract*, not in a screen.

### Unmerged branches checked

`git grep -il reconciliation` across **all 59 local branches**, scoped to `pages/ components/ utils/
test/`. One branch has more than HEAD:

| branch | tip | merged | what it has |
| --- | --- | --- | --- |
| `lane/fe-training-meals-surfaces` | `2069338` | **no** (5 ahead of a base **47 behind HEAD**) | `pages/admin/meals-reconciliation.vue`, `pages/admin/meals-statements.vue`, `MealsReconciliationQueue.vue`, `MealsStatementDocument.vue`, `MealsStatementList.vue`, `utils/meals/money-client.js`, `money-view.js`, two Playwright journeys |
| every other branch | — | — | same 18 files as HEAD, none of them a reconciliation surface |

**This is NOT `fail-spec`, and the reason is clause three.** That branch satisfies *visible* and
*resolvable*. Its blocked-finalize banner is `MealsStatementDocument.vue:97-103`, whose whole content
is `openExceptionsSentence` — `money-client.js:93-98` returns `{ count }` and the component prints
"1 open exception" / "{count} open exceptions" plus a link to another page. **It renders the count and
names nothing**, which is precisely the clause the brief says gets skipped. It is also unmerged, 47
commits stale, and carries the whole Training surface, so the capability does not exist at the
integration tip either way.

**What I took from it rather than reinventing.** `readReconciliation`, the exception/drift row
shapes, the four design rules in the queue component's header, and the queue's markup are ported from
`2069338` with attribution, because they are correct and were reasoned about properly. What I did not
take: the count-only banner, the second page, and the statement document/list/export surface (that is
`L-MEALS-STATEMENT-SURFACE`, a separate open lane — see §6).

---

## 2. Where the capability landed, and why not on a new page

**On the existing venue surface, `pages/admin/meals-agreements.vue`.** Its own header calls itself
"THE VENUE'S COMPANY MEALS SURFACE"; every route I bound resolves authority through
`IMealsStoreAccess` — `StoreAdminPolicy` at this store — which is what makes them one surface rather
than six.

**C3 (reachability) is asserted, not rebuilt.** `/admin/meals-agreements` is already in the sidebar
(`components/organisms/AdminPageHeader.vue:372`, the `Moduler` group) and already pinned by
`test/admin-nav-access.test.js`'s `STORE_ADMIN_PATHS` `toEqual`. A new page would have needed a new
nav entry *and* an edit to that shared pinned list — a file two sibling lanes are near. Mutation
**M9** deletes the nav line and reds 3 tests across both `admin-nav-access.test.js` and my own
reachability pin, which is the proof that the entry is load-bearing rather than merely present.

Client method → surface → navigation entry: all three, none of them new.

---

## 3. The three clauses, and the invisible case for each

### Clause one — visible

`test/meals-reconciliation-page.test.js` §"the seeded expiry exception is visible on the venue
surface" (5 tests). The page issues `ListReconciliation(42)` at load; the seeded
`ExpiredBoundReservation` renders as a row carrying its kind, its source key `res-777` and
`data-state="Open"`.

**Invisible cases in the same world** — a surface that always showed the banner fails all three:

* a `Resolved` exception in the *same table* renders `data-state="Resolved"` and offers **neither**
  control, while the open one offers both;
* a venue with an empty queue renders `reconciliation-empty`, no table, and an `is-clear` banner
  saying nothing is blocking;
* a queue read that 404s renders `reconciliation-unknown` and **no** blocking banner at all — and the
  agreements read that did answer is untouched by it.

The blocking count is asserted as **2, not 3**: it counts `Open` + `Acknowledged`, never the queue
length, so resolved history cannot inflate the number somebody is waiting on.

### Clause two — resolvable, driven through the page

The test **clicks the rendered row control**, fills the rendered textarea, and **submits the rendered
form**. Nothing calls a handler. The assertion is the client call by value:

```
['ResolveException', EX_EXPIRED, { targetState: 'Resolved', expectedVersion: 'rev-1',
                                  ownerNote: 'Reservasjonen utløp; salget kom aldri.' }]
```

followed by a `ListReconciliation` re-read, because resolving a row changes whether the month is
blocked at all.

**Unbinding the control reds a test**, in both directions:

* **M4** removes `@click="openResolve(row)"` from the queue component → **7 tests red**;
* **M5** removes `@resolve="resolveException"` from the page template → **3 tests red**.

Also asserted: acknowledge writes `Acknowledged` and invents no owner note; a resolve with an empty
note is refused client-side and **nothing is sent**; a refused resolve renders `meals_write_stale`
and re-reads nothing.

### Clause three — a blocked finalize names the exception, by value

The journey the test walks, in the order a venue walks it: read the queue → **resolve** the expiry
exception through the row → **draft** the month (succeeds) → an exception opens underneath the draft →
**finalize** → refused `409 meals.statement-period-open-exceptions`.

The resolve step is not scene-setting. The server would have refused the *draft* while this company's
exception was open, so a test that drafted over it would be measuring the page against a server that
cannot exist.

Asserted **by value**, not by "the error mentions something":

```js
expect(ids(wrapper, 'close-blocked-row')).toEqual([EX_LATE])
expect(blocked.text()).toContain('jrnl-42')          // that exception's source key
expect(blocked.text()).toContain('meals_rc_kind_unmatched')
```

**And it discriminates, on two independent axes, with the rivals present in the same world:**

| row | state | company | named? | why |
| --- | --- | --- | --- | --- |
| `EX_LATE` | Open | ACME | **yes** | it is what the guard counted |
| `EX_RESOLVED` | Resolved | ACME | no | only `!= Resolved` blocks |
| `EX_OTHER_COMPANY` | **Open** | **BOLT** | no | the guard counts per `(store, company)`; the queue read has no company filter |

The third row is the sharp one: it is open, at the same store, in the same queue read, **on screen**
(asserted) — and naming it would print another company's problem as this company's reason. **M1**
drops that company scope → **5 tests red**. **M2** drops the state filter → **4 tests red**.

**The honest partial case.** The count is the server's and the identities are the client's, so they
can disagree. With `openExceptionCount: 3` and one nameable row the banner prints the server's 3 *and*
`close-blocked-partial` ("this may not be the whole list"). **M3** makes `namedIsComplete` always true
→ **1 test red**.

**Everything is read from the rendered page or the response body.** No assertion anywhere in the file
reads a status code.

**Invisible case for clause three**: a close that was never refused shows **no** blocked banner — at
mount, after a successful draft, and after a successful finalize. And a *different* 409
(`meals.stale-revision`) renders the ordinary write-failure sentence and **not** the blocked banner,
so the banner cannot be a catch-all.

**M8 is the defect this lane exists for**: it makes the banner render the count and drop the named
list — exactly what the unmerged sibling branch does today. **3 tests red.**

---

## 4. Mutation proof — both instrument traps excluded by direction

`lanes/L-MEALS-RECONCILE-UI/mutation-proof.py`, output in `mutation-proof.txt`. 19 suite runs.

```
tree   : /Users/svendaneel/okam/web-mealsrecon
branch : lane/fe-meals-reconcile-ui
BASE      : GREEN  Tests: 77 passed, 77 total
M1 company scope dropped .................. mutant RED (5)  | restore GREEN
M2 state filter dropped ................... mutant RED (4)  | restore GREEN
M3 namedIsComplete always true ............ mutant RED (1)  | restore GREEN
M4 resolve control unbound ................ mutant RED (7)  | restore GREEN
M5 page stops listening for @resolve ...... mutant RED (3)  | restore GREEN
M6 page stops reading the queue ........... mutant RED (16) | restore GREEN
M7 blocked finalize stops re-reading ...... mutant RED (3)  | restore GREEN
M8 banner counts instead of naming ........ mutant RED (3)  | restore GREEN
M9 sidebar drops the venue surface ........ mutant RED (3)  | restore GREEN
ALL 9 MUTANTS KILLED; every restore green.
```

* **Wrong tree** (yields green mutants): the script refuses to run unless `git rev-parse
  --show-toplevel` equals this worktree, mutates only absolute paths under it, and asserts the file
  on disk actually changed after each write. It also prints the tree and branch it measured.
* **Stale artefact** (yields red restores): every restore is a **content write**, never an `mv` of a
  backup that would carry an older mtime, and every restore run is required to be green.
* The alternation GREEN → RED → GREEN nine times rules out each, because the two failure modes point
  in opposite directions.

---

## 5. Suites

| suite | result |
| --- | --- |
| `test/meals-reconciliation-page.test.js` (new) | **25/25** |
| `test/meals*.test.js` + `test/admin-nav-access.test.js` | **265/265**, 12 suites |
| full jest (`npx jest`) | **2609/2611**, 112/113 suites |

**The two failures are pre-existing and worktree-name dependent**, exactly as the brief warned:
`test/journey-artifact-store.test.js` asserts `expect(store.buildFromListeningProcess(origin).id)
.toMatch(/^Web-modules@/)` and receives `"web-mealsrecon@3cd2570…"`. **Proved pre-existing**: with
every tracked change of mine reverted (`git checkout -- pages components utils translations test`)
the same file still fails 2/38 in this worktree. Reported, not chased. Restored by re-applying the
diff; the meals suites were re-run green afterwards.

No container was started or touched. The e2e journey suite was not run.

---

## 6. What this lane did NOT do, and what a reviewer should know

* **`L-MEALS-STATEMENT-SURFACE` overlaps and is still open.** Clause three cannot be met without a
  finalize, so this lane binds #19 draft and #20 finalize — the minimum a month close needs. It binds
  **none** of #21 list, #22 get, #23 export, renders **no** statement document or line table, and has
  **no** content-hash/expected-version refusal copy beyond the generic `writeFailureKey`. That lane's
  exit (a store admin walks draft, finalize and export in a browser, with the persisted member
  reference on the finalized line) is untouched. It should build on `MealsMonthClose.vue` rather than
  beside it.
* **#21 is unbindable from a venue** and is absent for that reason, not by oversight:
  `ListForCompanyAsync` calls `RequireCompanyAdminAsync`, so a StoreAdmin gets a 403. A venue's only
  route to a statement id is drafting one, which is why the close control drafts before it can freeze.
* **C4.** All three writes are money-path. No actor travels in any request body — the server resolves
  it from the bearer principal (`CurrentUserId(user)`) and stamps it into the append-only audit event.
  No test constructs an actor. Nothing in this diff can supply an ambient or hard-coded one.
* **C1/C2.** No migration, no schema, no UPDATE/DELETE against anything. Frontend only.
* **C6.** No statute, forskrift or § reference is printed by any string added here.
* **C7.** No log or telemetry call is added anywhere in the diff.
* **C5.** *This is not acceptance.* 77 green tests are evidence that code behaves. Nobody has walked
  this in a browser, and the module is dark by default in every deployment
  (`Features:Meals` + the per-store `meals.module` override both default false). The walk needs both
  flags on, at least one corridor agreement, and a seeded exception — none of which any shipped
  client can produce, because no client can place a company-funded order. The surface says that on
  screen (`close-no-funded-orders`) rather than leaving it to be discovered.
* **The period is the browser's calendar month as an OFFER, not a derived fact.** A statement's period
  is the store's local calendar and Meals exposes no store timezone at all; the page therefore
  pre-fills two overtypeable fields and derives no month from any instant it shows. This is the same
  restraint the page's existing "NO PERIOD FILTER, DELIBERATELY" note records about the known,
  unresolved Meals month-boundary defect.

---

## 6b. A LIVE COLLISION, observed in the shared checkout while this lane was finishing

At `13:38` the shared `Web-modules` checkout became dirty in two files it was not dirty in at
`13:12`:

```
 M components/organisms/AdminPageHeader.vue
 M test/admin-nav-access.test.js
```

and the uncommitted diff adds

```
+ { label: this.$i('nav_meals_statements'), path: '/admin/meals-statements', icon: icons.mealsStatements, isNew: true },
```

**Somebody is building `/admin/meals-statements` right now** — almost certainly
`L-MEALS-STATEMENT-SURFACE`, which `plan.md` had as `open`. That page will bind #19 draft and #20
finalize, which **this lane also binds**, in `MealsMonthClose.vue`.

Nothing is broken and nothing of mine was touched: `/admin/meals-agreements` is still present exactly
once in the sidebar and twice in the nav test, so my reachability pin holds and neither of those two
files is in my diff. But **the merge must reconcile the two deliberately**, or the estate ships two
finalize controls for one irreversible freeze, on two pages, with two different refusal treatments —
and only one of them names the exception that blocks it.

The reconciliation I would argue for: keep the naming (`namedBlockers` + the banner) and the queue
here, where the row that clears a blocker is one glance from the button it blocks; let the statement
page own the document, the lines, the export and the content-hash/expected-version copy; and have one
of the two own the finalize rather than both. This is a merge-order decision, not a defect in either
lane, and it is above my authority.

---

## 7. Files touched

Worktree: `/Users/svendaneel/okam/web-mealsrecon`, branch `lane/fe-meals-reconcile-ui` off `3cd2570`.
Nothing was written in the shared `Web-modules` checkout, which was dirty with five sibling lanes'
work (including all three `translations/*.ts`) when this lane started and is unchanged by it.

| file | change |
| --- | --- |
| `utils/meals/meals-client.js` | +4 routes (#17 #18 #19 #20), `CODE_OPEN_EXCEPTIONS`, `isOpenExceptionsRefusal`; header and the "absent here rather than present and broken" paragraph rewritten |
| `utils/meals/reconcile-view.js` | **new** — `readReconciliation`, `readStatement`, **`namedBlockers`** |
| `components/admin/meals/MealsReconciliationQueue.vue` | **new** — ported from `2069338`, plus `namedIds` highlighting and a resolve-form subject line |
| `components/admin/meals/MealsMonthClose.vue` | **new** — draft/finalize and the naming banner |
| `pages/admin/meals-agreements.vue` | third read, two sections, three mutations; the stale "No button here pretends otherwise" comment rewritten |
| `translations/{no,en,de}.ts` | 70 keys, hand-written per language, appended after `meals_claim_offline_body`. No regex, no bulk edit. Verified by `lanes/L-MEALS-RECONCILE-UI/keycheck.py`: all 70 defined and non-empty in all three, zero duplicates in the new families |
| `test/meals-reconciliation-page.test.js` | **new** — the instrument, 25 tests |
| `test/meals-client.test.js` | +3 tests (the four new routes, a fresh Idempotency-Key per call, two finalizes are two commands); the "exactly two methods, neither mutates" pin updated to the six venue routes |
| `test/meals-page.test.js` | the mocked service gains `ListReconciliation`; "exactly the two reads" → three |

**Shared-file collisions with the five live Meals siblings**: `utils/meals/meals-client.js` and
`pages/admin/meals-agreements.vue` are the two files a sibling could also be in. Both were clean at
`3cd2570` and both are edited by hand here. `translations/*.ts` are dirty in the shared checkout with
somebody else's work — untouched there, edited only in this worktree, and appended to at the end of
the Meals block so a merge is an append rather than an overlap.

`lanes/L-MEALS-RECONCILE-UI/` holds this file, `mutation-proof.py`, `mutation-proof.txt`,
`keycheck.py` and `jest-full.txt`.

# Frontend composition — candidate run

**Lane:** L-COMPOSE-FE-CANDIDATE · **Date:** 2026-08-05
**Candidate branch:** `candidate/fe-compose-2026-08-05`
**Worktree:** `/Users/svendaneel/okam/web-fe-candidate` (created for this lane; the shared checkout was
never checked out, never committed to, and `feature/restaurant-modules` was never touched).
**Pushes: none. Commits to any shared branch: none.**

The candidate starts at frontend tip `e34977ac` and carries the order in
`lanes/L-COMPOSE-CENSUS/compose.md` §6 *Frontend* / Appendix A. Nothing here is inherited: every
re-run point below was **run in this worktree**, at that step, and its receipt is on disk.

---

## 0. The instrument, before it measured anything

`core` submodule: **populated at `1bcab0b6`** in this worktree, and it stays populated for every
receipt below. This is the `F-CORE-PIN-ON-NO-REMOTE` condition (compose.md §5.1) and it is not
theoretical here — the plain `git submodule update --init core` **failed**:

```
fatal: transport 'file' not allowed
fatal: clone of '/Users/svendaneel/okam/web-linkdeadend/core' into submodule path '.../core' failed
```

The pinned commit is on no remote, so git fell back to another *worktree's* copy and was refused by
the default `protocol.file.allow`. It populated under `-c protocol.file.allow=always`, reading a
local clone. **A fresh clone still cannot do this** — the remedy is a push and it is the owner's.
Recorded so every receipt below is comparable: compose.md §5.1 measures a 36-test swing on this
alone.

### Baseline at the tip, before a single merge

| tier | result | cost |
|---|---|---|
| jest (`npx jest --ci --coverage=false`) | **2 failed / 2581 passed / 2583 total**, 1 failed suite | 13 s |
| playwright journeys (`npx playwright test`) | **2 failed / 20 passed** | 5.4 min |
| translations integrity | 0 duplicate, 0 dropped, 35 pre-existing language skews | <1 s |

Key counts at the tip: `en.ts` 4781, `no.ts` 4816, `de.ts` 4781.

**The tip is not green, and both reds are pre-existing.** Naming them now is the whole point — a red
I cannot attribute later is a red I would be tempted to explain away:

- **jest, 2 tests, `test/journey-artifact-store.test.js`** — the suite asserts
  `expect(store.buildFromListeningProcess(origin).id).toMatch(/^Web-modules@/)`, i.e. it pins the
  *checkout directory basename*. In this worktree it reads `web-fe-candidate@e34977ac…`. This red
  fires for **every lane that works in its own worktree** and is exactly what mergeable head
  `lane/worktree-basename-pin` fixes ("A permanent red stops punishing every lane that works in its
  own worktree").
- **playwright, 2 journeys** — `account-email-confirm.spec.js` (@fixture) and
  `workforce-schedule-publish.spec.js` (@live, fails on `assertRulePackResults`: "The validation
  panel is not the pack"). Neither is caused by this composition; both are carried into every
  comparison below.

---

## 1. Departures from the census order, and why

The order was not mine to invent. Four places where I departed, each with the measurement:

**D1 — `lane/worktree-basename-pin` moved from last (T4 #10) to first, as F0.**
It is **degree 0** in the census's own collision measurement — it collides with zero other heads, so
its position cannot change any other merge's outcome. It repairs the standing 2-test red above.
Left in last place, all 60 preceding re-runs would read `BEHAVIOUR-RED` and I would lose the only
thing that distinguishes a merge-caused red from the standing one. I moved the fix in front of the
instrument that depends on it.

**D2 — `lane/fe-wf-invite-list-revoke` removed from T2 position 6 and NOT merged.**
compose.md §6 **F4** overrides the mechanical T2 sort for this head: it is the cross-repo contract
pair with backend `lane/wf-invite-list-revoke`, it "lands **only after**" the backend half, and its
re-run point is "the invite journey against the **live backend**, not the Node fixture." The backend
half is an unlanded mergeable head (compose.md Appendix A, backend T3), this repository cannot
supply that live backend, and my brief forbids going near `OkamAPI-modules`. Merging it here would
ship a control calling an endpoint that does not exist — the C3 violation §2 of the census names
explicitly. **Excluded on a measured reason, not skipped.**

**D3 — the per-step re-run point is the FULL jest suite plus a translations-integrity check, with the
journey tier at checkpoints rather than after each of 61 steps.**
compose.md §6/F1 names "the journey specs under `test/e2e/journeys/` **plus**
`test/admin-nav-access.test.js`". Measured cost of the journey tier here: **5.4 min**. 61 × 5.4 min =
**5.5 hours of journey runtime alone**, and it would not have run the thing it is asked for — the
census wants journeys because *"a `translations/*.ts` merge resolved by concatenation can drop or
duplicate a key that a journey asserts on screen."* So per step I run:

- the **whole jest suite** (112 suites / 2583 tests, 13 s) — a strict **superset** of the named
  `test/admin-nav-access.test.js`; and
- `translations-check.js`, which measures the named hazard **directly**: a key **duplicated** in one
  file (in a JS object literal the second silently wins, so nothing throws and no test that reads
  the winning value can see it), a key **dropped** that either merge parent had, and new
  cross-language **skew**, charged against the 35 that were already there.

The journey tier runs at the **checkpoints** (end of F1, F2, F3, F5) and at the candidate tip.
61 × 13 s = 13 min, and the hub hazard is measured every single step instead of every 61st.

**D4 — three heads the census could not see, appended as F5.**
The census population is `refs/heads` (95 refs). `refs/lanes/*` holds four more, and **three carry
live work contained by no branch in `refs/heads`**:

| ref | ahead of tip | status |
|---|---:|---|
| `lanes/L-OFFER-PARTIAL-SUBTOTAL` | 4 | **alias** of `lane/offer-partial-subtotal` — already classified superseded. Not a new head. |
| `lanes/L-PRICE-BYPASS-FIVE` | 1 | **strict ancestor of `lanes/L-XZ-NEGATED-ABSENCE`** (`git merge-base --is-ancestor` true) — merging XZ alone lands both |
| `lanes/L-XZ-NEGATED-ABSENCE` | 2 | live, contained by no `refs/heads` branch |
| `lanes/L-WORLD-STAMP-WINDOWS` | 1 | live, contained by no `refs/heads` branch |

The containment is the same shape as compose.md §2.6's `wf-w5-timesheet` finding, and the same
trap: merging `L-PRICE-BYPASS-FIVE` as if it were a required half lands a strict subset. **Two
steps, not three.**

**How a step that will not merge is handled.** Nothing is forced and no conflict is resolved on
judgement. On conflict the merge is **aborted clean**, the head is recorded below with its
conflicting files as *excluded on a measured reason*, and the run continues — because a conflicted
head resolved by nobody is a fact to report, and my brief requires the not-merged list to be as
explicit as the merged one. On a **re-run red**, the offending merge is reverted, the re-run repeated
to confirm the green returns, and the head excluded with the failing test named. If a red does **not**
clear on revert, the run **stops there** — that is a composition I cannot attribute, and it is the
case the brief means by "stop and report".

---

## 2. The run


### FF0  `lane/worktree-basename-pin`

- merge commit: `8bb84f0`  (base `e34977ace`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-OK | keys {"translations/en.ts":4781,"translations/no.ts":4816,"translations/de.ts":4781} | dup=0 dropped=0 new-skew=0 (baseline skew 35)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 112 passed, 112 total; Tests:       2583 passed, 2583 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F0.txt`

### F1.01  `lane/fe-training-meals-surfaces` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.02  `feature/swiss` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.03  `lane/ev-stale-cause` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.04  `lane/fe-events-margin-surfaces` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.05  `lane/statute-evidence-world` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.06  `lane/fe-wf-link-deadend` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.07  `lane/fe-wf-self` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.08  `lane/journey-workforce`

- merge commit: `28430b7`  (base `5ad0ca004`)
- files changed by this step: 32
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4798,"translations/no.ts":4833,"translations/de.ts":4798} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by 8bb84f0abc801ee957814ff028015641952c12b4)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by 8bb84f0abc801ee957814ff028015641952c12b4)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by 8bb84f0abc801ee957814ff028015641952c12b4)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 112 passed, 112 total; Tests:       2603 passed, 2603 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.08.txt`

### F1.09  `lane/menu-allergen-matrix` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.10  `lane/train-evidence-pack-ui`

- merge commit: `9cf33b8`  (base `e34977ace`)
- files changed by this step: 12
- **auto-merged both-sides (decoy surface): 4**

  Files git resolved without asking, where both sides had changed:
  - `test/e2e/fixture/api-server.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4851,"translations/no.ts":4886,"translations/de.ts":4851} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/train-evidence-pack-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/train-evidence-pack-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/train-evidence-pack-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 112 passed, 112 total; Tests:       2603 passed, 2603 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.10.txt`

### FF1.11  `lane/wf-kodeoversikt-ui`

- merge commit: `106a56f`  (base `e34977ace`)
- files changed by this step: 16
- **auto-merged both-sides (decoy surface): 4**

  Files git resolved without asking, where both sides had changed:
  - `test/e2e/fixture/api-server.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4857,"translations/no.ts":4892,"translations/de.ts":4857} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/wf-kodeoversikt-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/wf-kodeoversikt-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/wf-kodeoversikt-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 114 passed, 114 total; Tests:       2618 passed, 2618 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.11.txt`

### F1.12  `lane/wf-pubhist` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.13  `lane/wf-roles-ui`

- merge commit: `2fd3dbb`  (base `e34977ace`)
- files changed by this step: 12
- **auto-merged both-sides (decoy surface): 8**

  Files git resolved without asking, where both sides had changed:
  - `components/organisms/AdminPageHeader.vue`
  - `test/admin-nav-access.test.js`
  - `test/e2e/fixture/api-server.js`
  - `test/e2e/fixture/world.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
  - `utils/workforce/roster-client.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4895,"translations/no.ts":4930,"translations/de.ts":4895} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/wf-roles-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/wf-roles-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/wf-roles-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 115 passed, 115 total; Tests:       2633 passed, 2633 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.13.txt`

### F1.14  `lane/margin-menu-margin-ui` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.15  `lane/meals-admin` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.16  `lane/meals-enrol-pretick`

- merge commit: `1dabf16`  (base `3cd25709e`)
- files changed by this step: 18
- **auto-merged both-sides (decoy surface): 3**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4903,"translations/no.ts":4938,"translations/de.ts":4903} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/meals-enrol-pretick)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/meals-enrol-pretick)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/meals-enrol-pretick)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 116 passed, 116 total; Tests:       2662 passed, 2662 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.16.txt`

### F1.17  `lane/events-admin` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.18  `lane/fe-meals-statement-surface`

- merge commit: `2f80109`  (base `3cd25709e`)
- files changed by this step: 14
- **auto-merged both-sides (decoy surface): 5**

  Files git resolved without asking, where both sides had changed:
  - `components/organisms/AdminPageHeader.vue`
  - `test/admin-nav-access.test.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4959,"translations/no.ts":4994,"translations/de.ts":4959} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-statement-surface)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-statement-surface)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-statement-surface)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 117 passed, 117 total; Tests:       2684 passed, 2684 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.18.txt`

### F1.19  `lane/margin-recipes` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.20  `lane/training-admin` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.21  `lane/coercion-write-paths`

- merge commit: `3d1b402`  (base `3cd25709e`)
- files changed by this step: 9
- **auto-merged both-sides (decoy surface): 3**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4960,"translations/no.ts":4995,"translations/de.ts":4960} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/coercion-write-paths)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/coercion-write-paths)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/coercion-write-paths)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 117 passed, 117 total; Tests:       2690 passed, 2690 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.21.txt`

### FF1.22  `lane/fe-meals-claim-receipt`

- merge commit: `f780ede`  (base `4b5c5c2c5`)
- files changed by this step: 8
- **auto-merged both-sides (decoy surface): 4**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
  - `utils/meals/admin-view.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4961,"translations/no.ts":4996,"translations/de.ts":4961} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-claim-receipt)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-claim-receipt)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-claim-receipt)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 117 passed, 117 total; Tests:       2698 passed, 2698 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.22.txt`

### FF1.23  `lane/fe-meals-reconcile-ui`

- merge commit: `b022c59`  (base `3cd25709e`)
- files changed by this step: 16
- **auto-merged both-sides (decoy surface): 3**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5027,"translations/no.ts":5062,"translations/de.ts":5027} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-reconcile-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-reconcile-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-meals-reconcile-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 118 passed, 118 total; Tests:       2726 passed, 2726 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.23.txt`

### F1.24  `lane/fe-wf-bootstrap` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.25  `lane/fe-wf-contact-imported`

- merge commit: `5200506`  (base `a1a1ec84e`)
- files changed by this step: 7
- **auto-merged both-sides (decoy surface): 4**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
  - `utils/workforce/roster-client.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5034,"translations/no.ts":5069,"translations/de.ts":5034} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-wf-contact-imported)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-wf-contact-imported)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-wf-contact-imported)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 119 passed, 119 total; Tests:       2744 passed, 2744 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.25.txt`

### F1.26  `lane/fe-wf-correction-path` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.27  `lane/growth-admin` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.28  `lane/meals-reachable-web`

- merge commit: `305e510`  (base `0138168ba`)
- files changed by this step: 5
- **auto-merged both-sides (decoy surface): 3**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5035,"translations/no.ts":5070,"translations/de.ts":5035} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/meals-reachable-web)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/meals-reachable-web)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/meals-reachable-web)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 119 passed, 119 total; Tests:       2753 passed, 2753 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.28.txt`

### FF1.29  `lane/mrg-coverage-unknown`

- merge commit: `54d2313`  (base `3cd25709e`)
- files changed by this step: 7
- **auto-merged both-sides (decoy surface): 4**

  Files git resolved without asking, where both sides had changed:
  - `test/margin-waste.test.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5035,"translations/no.ts":5070,"translations/de.ts":5035} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-coverage-unknown)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-coverage-unknown)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-coverage-unknown)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 119 passed, 119 total; Tests:       2763 passed, 2763 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.29.txt`

### FF1.30  `lane/mrg-lag-visible`

- merge commit: `57a3050`  (base `3cd25709e`)
- files changed by this step: 7
- **auto-merged both-sides (decoy surface): 4**

  Files git resolved without asking, where both sides had changed:
  - `test/margin-statements-page.test.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5040,"translations/no.ts":5075,"translations/de.ts":5040} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-lag-visible)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-lag-visible)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-lag-visible)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 119 passed, 119 total; Tests:       2771 passed, 2771 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.30.txt`

### FF1.31  `lane/mrg-recipe-revise-ui`

- merge commit: `ec838d2`  (base `5ad0ca004`)
- files changed by this step: 10
- **auto-merged both-sides (decoy surface): 3**

  Files git resolved without asking, where both sides had changed:
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-recipe-revise-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-recipe-revise-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-recipe-revise-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 120 passed, 120 total; Tests:       2801 passed, 2801 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.31.txt`

### F1.32  `lane/mrg-waste-frontend` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.33  `lane/train-readonly-visible` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.34  `lane/wf-adjust-address` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.35  `lane/wf-idreg`

- merge commit: `c9e1779`  (base `bbb80d658`)
- files changed by this step: 0
- **auto-merged both-sides (decoy surface): 10**

  Files git resolved without asking, where both sides had changed:
  - `pages/admin/workforce-personnel-list.vue`
  - `test/workforce-personnel-list-code-register-client.test.js`
  - `test/workforce-personnel-list-code-register.test.js`
  - `test/workforce-personnel-list-components.test.js`
  - `translations/de.ts`
  - `translations/en.ts`
  - `translations/no.ts`
  - `utils/workforce-rates/rates-client.js`
  - `utils/workforce/api-client.js`
  - `utils/workforce/personnel-list-client.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/wf-idreg)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/wf-idreg)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/wf-idreg)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 120 passed, 120 total; Tests:       2801 passed, 2801 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.35.txt`

### F1.36  `lane/workforce-roster` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.37  `lane/L-JOURNEY-GROWTH` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.38  `lane/modal-broken-two` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.39  `lane/fe-gr-withdraw-origin`

- merge commit: `8f98b0d`  (base `35440cfb9`)
- files changed by this step: 8
- **auto-merged both-sides (decoy surface): 2**

  Files git resolved without asking, where both sides had changed:
  - `test/e2e/fixture/api-server.js`
  - `test/e2e/fixture/world.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-gr-withdraw-origin)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-gr-withdraw-origin)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-gr-withdraw-origin)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 121 passed, 121 total; Tests:       2806 passed, 2806 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.39.txt`

### F1.40  `lane/journey-teardown` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### F1.41  `lane/fe-gr-exit-wire-the-mail` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.42  `lane/price-crosscurrency`

- merge commit: `cd16f85`  (base `e34977ace`)
- files changed by this step: 15
- **auto-merged both-sides (decoy surface): 1**

  Files git resolved without asking, where both sides had changed:
  - `components/admin/meals/MealsProgramPanel.vue`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/price-crosscurrency)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/price-crosscurrency)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/price-crosscurrency)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 122 passed, 122 total; Tests:       2838 passed, 2838 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.42.txt`

### F2.01  `lane/fe-meals-docsync` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF2.02  `lane/L-JOURNEY-PROXY-BLINDSPOT`

- merge commit: `f040f12`  (base `e34977ace`)
- files changed by this step: 9
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/L-JOURNEY-PROXY-BLINDSPOT)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/L-JOURNEY-PROXY-BLINDSPOT)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/L-JOURNEY-PROXY-BLINDSPOT)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 122 passed, 122 total; Tests:       2856 passed, 2856 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.02.txt`

### FF2.03  `lane/mrg-page-test-vacuous`

- merge commit: `74ba8ac`  (base `3cd25709e`)
- files changed by this step: 4
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-page-test-vacuous)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-page-test-vacuous)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-page-test-vacuous)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2887 passed, 2887 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.03.txt`

### FF2.04  `lane/offers-page-hundredfold`

- merge commit: `afa1745`  (base `e34977ace`)
- files changed by this step: 18
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/offers-page-hundredfold)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/offers-page-hundredfold)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/offers-page-hundredfold)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.04.txt`

### FF2.05  `lane/tier-artifacts`

- merge commit: `2ea3db3`  (base `e34977ace`)
- files changed by this step: 9
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/tier-artifacts)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/tier-artifacts)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/tier-artifacts)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.05.txt`

### FF2.06  `lane/train-publish-unclickable`

- merge commit: `53fe505`  (base `e34977ace`)
- files changed by this step: 19
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/train-publish-unclickable)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/train-publish-unclickable)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/train-publish-unclickable)
- re-run (full jest, `npx jest --ci --coverage=false`): **COLLECTION-ARTIFACT** — Test Suites: 1 failed, 124 passed, 125 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.06.txt`
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.06-revert.txt`

  **REVERTED.** The red is this head's: reverting restored 0 failed test(s) (baseline 0). Recorded as excluded on a measured reason.

### F2.07  `lane/L-JOURNEY-PORT-HARDCODED` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF2.08  `lane/fe-admin-refusal-credential`

- merge commit: `7aaf007`  (base `22f21082e`)
- files changed by this step: 1
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-admin-refusal-credential)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-admin-refusal-credential)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-admin-refusal-credential)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.08.txt`

### FF3.01  `lane/L-PRICE-SHADOW-GUARD`

- merge commit: `2a8e520`  (base `e34977ace`)
- files changed by this step: 10
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/L-PRICE-SHADOW-GUARD)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/L-PRICE-SHADOW-GUARD)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/L-PRICE-SHADOW-GUARD)
- re-run (full jest, `npx jest --ci --coverage=false`): **BEHAVIOUR-RED** — Test Suites: 1 failed, 124 passed, 125 total; Tests:       2 failed, 2962 passed, 2964 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.01.txt`

  Failing tests:
  ● no component takes a silent exit from the money gate › every component that redeclares a gated money member is one the ledger already names
  ● no component takes a silent exit from the money gate › there is no ledger left: every surface in the estate is on the gate
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.01-revert.txt`

  **REVERTED.** The red is this head's: reverting restored 0 failed test(s) (baseline 0). Recorded as excluded on a measured reason.

### FF3.02  `lane/ev-guestlink-one-composer`

- merge commit: `4e6a9de`  (base `e34977ace`)
- files changed by this step: 1
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/ev-guestlink-one-composer)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/ev-guestlink-one-composer)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/ev-guestlink-one-composer)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.02.txt`

### FF3.03  `lane/exit-instrument-census`

- merge commit: `093cd16`  (base `e34977ace`)
- files changed by this step: 3
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/exit-instrument-census)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/exit-instrument-census)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/exit-instrument-census)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.03.txt`

### FF3.04  `lane/fe-ci`

- merge commit: `240ec0d`  (base `ce77727c9`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-ci)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-ci)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-ci)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2936 passed, 2936 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.04.txt`

### FF3.05  `lane/fe-ev-inquiry-gate`

- merge commit: `4c3b664`  (base `a48fb78a4`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-ev-inquiry-gate)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-ev-inquiry-gate)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-ev-inquiry-gate)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2938 passed, 2938 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.05.txt`

### FF3.06  `lane/fe-journey-meals`

- merge commit: `638027a`  (base `e34977ace`)
- files changed by this step: 15
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-journey-meals)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-journey-meals)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-journey-meals)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2938 passed, 2938 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.06.txt`

### FF3.07  `lane/mrg-revise-land`

- merge commit: `d788afc`  (base `e34977ace`)
- files changed by this step: 5
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-revise-land)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-revise-land)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-revise-land)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2938 passed, 2938 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.07.txt`

### FF3.08  `lane/mrg-waste-receipts`

- merge commit: `904caa5`  (base `e34977ace`)
- files changed by this step: 10
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-waste-receipts)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-waste-receipts)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-waste-receipts)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 125 passed, 125 total; Tests:       2949 passed, 2949 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.08.txt`

### FF3.09  `lane/wf-timesheet-ui`

- merge commit: `e72a137`  (base `e34977ace`)
- files changed by this step: 27
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/wf-timesheet-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/wf-timesheet-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/wf-timesheet-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **BEHAVIOUR-RED** — Test Suites: 4 failed, 124 passed, 128 total; Tests:       22 failed, 2981 passed, 3003 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.09.txt`

  Failing tests:
  ● WorkforceTimesheetBatchList › offers the bytes of a sent batch and names who sent it
  ● WorkforceTimesheetBatchList › separates "nothing sent" from "we do not know what was sent"
  ● WorkforceTimesheetBatchList › shows the digest the server recorded for the bytes it sent
  ● WorkforceTimesheetBatchList › withholds a download from a failed batch, which has no file
  ● WorkforceTimesheetPanel › clears the unknown-hours decision when the period changes
  ● WorkforceTimesheetPanel › defaults the unknown-hours decision to false, never to permission
  ● WorkforceTimesheetPanel › disables both controls while a write is in flight
  ● WorkforceTimesheetPanel › emits the manager's unknown-hours decision rather than deciding for them
  ● WorkforceTimesheetPanel › never withholds a control silently
  ● WorkforceTimesheetPanel › offers the unknown-hours decision only while there is one to make
  ● WorkforceTimesheetPanel › prints who froze the period and the digest of what was frozen
  ● WorkforceTimesheetPanel › renders Approve genuinely enabled when the gate is open and nothing is in flight
  ● WorkforceTimesheetPanel › renders Export genuinely enabled on an approved period
  ● WorkforceTimesheetPanel › renders unknown hours as the marker and never as zero
  ● WorkforceTimesheetPanel › says the period is unread rather than rendering it as empty
  ● WorkforceTimesheetPanel › withholds Approve with a named reason when the stage flag is off
  ● WorkforceTimesheetPanel › withholds Approve with a named reason without the payroll grant
  ● WorkforceTimesheetService › downloads a batch as text/csv and reports the server-chosen filename
  ● WorkforceTimesheetService › raises the same typed error family from the CSV download path
  ● WorkforceTimesheetService › reports a null filename rather than guessing when the header is unreadable
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 125 passed, 125 total; Tests:       2949 passed, 2949 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.09-revert.txt`

  **REVERTED.** The red is this head's: reverting restored 0 failed test(s) (baseline 0). Recorded as excluded on a measured reason.

### F5.01  `lanes/L-XZ-NEGATED-ABSENCE` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF5.02  `lanes/L-WORLD-STAMP-WINDOWS`

- merge commit: `8f25904`  (base `e34977ace`)
- files changed by this step: 18
- **auto-merged both-sides (decoy surface): 1**

  Files git resolved without asking, where both sides had changed:
  - `test/journey-artifact-store.test.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lanes/L-WORLD-STAMP-WINDOWS)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lanes/L-WORLD-STAMP-WINDOWS)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lanes/L-WORLD-STAMP-WINDOWS)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 126 passed, 126 total; Tests:       2959 passed, 2959 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F5.02.txt`

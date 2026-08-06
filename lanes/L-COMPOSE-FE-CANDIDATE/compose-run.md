# Frontend composition — candidate run

**Lane:** L-COMPOSE-FE-CANDIDATE · **Date:** 2026-08-05
**Candidate branch:** `candidate/fe-compose-2026-08-05` · **tip `9f7d8df`** (103 commits ahead of `e34977ac`)
**Worktree:** `/Users/svendaneel/okam/web-fe-candidate` (created for this lane).
**`feature/restaurant-modules` was never checked out, never committed to, never merged into.
Pushes: none. Commits to any shared branch: none. `OkamAPI-modules` was never touched.**

The candidate starts at frontend tip `e34977ac` and carries the order in
`lanes/L-COMPOSE-CENSUS/compose.md` §6 *Frontend* / Appendix A. Nothing is inherited: every re-run
below was **run in this worktree, at that step**, and its receipt is on disk under `receipts/`.

---

## 0. Headline

| | |
|---|---:|
| heads offered by the census (frontend mergeable) | 61 |
| — of those, held back by ruling before any attempt | 1 |
| heads added by me that the census could not see | 4 |
| **heads attempted** | **64** |
| **merged and kept** | **35** |
| **not merged — conflict, aborted clean** | **28** |
| **not merged — re-run red, reverted** | **1** |
| jest at candidate tip | **126 suites / 2959 tests, 0 failed** |
| **browser journeys at candidate tip** | **26 passed / 3 failed** (own fixture) — see §3c |
| translations at candidate tip | 0 duplicate keys, 0 new language skew |
| i18n reachability | **0 new gaps** vs the tip (33 pre-existing, unchanged) |

**The verdict is `blocked`, and §3c is why.** Jest is green at the tip; the **journey tier is not**,
and my brief's rule is that a re-run point which reds is where I stop. One journey that passed at the
tip now fails (`meals-admin-setup`, confirmed under matched conditions) and one that arrived with the
composition fails on arrival (`meals-statement-month`); a third is a pre-existing `@live` failure.

**§3c also corrects this document.** I first reported 8 journey failures. Five were artifacts of
Playwright silently reusing a **sibling lane's** fixture server on port 4010, including the § 8-5-6
`kodeoversikt` journey I wrongly flagged as a statutory gap — **that flag is withdrawn; it passes.**
The verdict is unchanged; the evidence behind it is smaller and now correct.

**The composition does not complete, and the reason is not the order.** 28 of 61 census heads will
not merge. I classified every one of them by re-testing it against the **pristine tip** with
`git merge-tree`, which separates two different problems that look identical in a merge log:

| | n | what it means |
|---|---:|---|
| **inherent (tip ↔ branch)** | **16** | conflicts against `e34977ac` itself, with no composition involved. **No ordering strategy fixes these.** They need rebasing onto the tip before any composition can carry them. |
| **order-induced** | **12** | merges cleanly into the pristine tip, conflicts only after earlier heads land. These are genuinely order-sensitive and a different sequence may land some of them. |

Per-branch classification: `conflict-classification.tsv`. Conflicting paths per step:
`conflicts.md`. **Nothing was resolved on judgement and no merge was forced** — every conflict was
`git merge --abort`ed and the head recorded.

compose.md §7 said the census "does not prove any merge is clean … whether git's three-way merge
succeeds is a different question and was deliberately not asked." **This run asks it.** The answer is
that 46% of the frontend heads do not merge, and that a majority of those (16/28) are broken against
the tip independently of anything the composition does.

---

## 1. The instrument had to be repaired twice before it measured anything

### 1.1 `core` — F-CORE-PIN-ON-NO-REMOTE, hit live

**Populated at `1bcab0b6` for every receipt below.** Plain init **failed**:

```
fatal: transport 'file' not allowed
fatal: clone of '/Users/svendaneel/okam/web-linkdeadend/core' into submodule path '.../core' failed
```

The pinned commit is on no remote, so git fell back to another *worktree's* copy and the default
`protocol.file.allow` refused it. It populated under `-c protocol.file.allow=always`, reading a local
clone. **A fresh clone still cannot do this**; the remedy is a push and it is the owner's. Recorded
because compose.md §5.1 measures a 36-test swing on this alone, so a receipt that does not state it
cannot be compared with one that does.

### 1.2 The collector — my own error, and what it cost

My first run measured the wrong suite for 62 steps. At session start I read `jest.config.js` from the
**shared dirty working tree**, saw the anchored `'<rootDir>/lanes/'` ignore, and took it as the tip's
truth. It is not: **`e34977ac` does not carry it.** The fix lives on `lane/jest-collects-lanes`
(`82127eb`, touching only `jest.config.js` + its evidence file), which is **not contained in the
tip**. That is precisely the "a branch's own green does not transfer" failure this program exists to
catch, committed by me, on the instrument itself. Run 1 is preserved unedited under
`run1-superseded/` rather than deleted — it is the measurement of what composing on a wrong collector
costs.

**One nuance the correction did not predict, measured here:** at the *pristine tip* the pattern
changes nothing — jest collects **112 paths with or without it, none under `lanes/`**. The
contamination is introduced **by the merges**, because each head brings its own `lanes/L-*/` evidence
directory. Measured on the finished candidate tree, same tree, both ways:

| | suites | tests |
|---|---:|---:|
| with `'<rootDir>/lanes/'` | 125 | **2930, 0 failed** |
| without it | 127 (1 failed) | **2959** |

The two extra collected paths are exactly:

- `lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` — an archived **copy** of a live
  test. It **runs and passes**, contributing **+29 assertions** to the green. 2959 − 2930 = **29**,
  reproducing the sibling's figure independently on my own tree.
- `lanes/L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js` — a Playwright probe, which fails to load outside
  a Playwright runner as "1 failed suite, 0 failed tests".

**That second one changed a verdict.** In run 1 I excluded `lane/train-publish-unclickable` as RED.
The red was **my collector, not its content** — the head brings a probe that only fails because the
tip collects it. With `lane/jest-collects-lanes` merged first, **that head merges green and is on the
candidate.** The correction recovered a head that run 1 had wrongly thrown away, and it is the exact
"failed suites with 0 failed tests" shape my brief warned about.

---

## 2. Departures from the census order, and why

**D1 — `lane/jest-collects-lanes` merged first (F0.1), ahead of the whole census order.**
Not in compose.md at all: the census is dated 2026-08-04 and this ref was cut after. It changes what
every subsequent re-run *collects*, so it cannot be sequenced by collision degree like content — an
instrument fix precedes the measurements that depend on it. §1.2 above is the measurement.

**D2 — `lane/worktree-basename-pin` moved from last (T4 #10) to second (F0.2).**
**Degree 0** in the census's own collision measurement — it collides with zero heads, so its position
cannot change any other merge's outcome. At the tip, `test/journey-artifact-store.test.js` asserts
`expect(store.buildFromListeningProcess(origin).id).toMatch(/^Web-modules@/)` — it pins the *checkout
directory basename*, so it reds 2 tests in **every worktree not literally named `Web-modules`**
(here: `web-fe-candidate@e34977ac…`). Left in last place, all 60 preceding re-runs read
`BEHAVIOUR-RED` and I lose the only thing separating a merge-caused red from the standing one. The
fix goes in front of the instrument that depends on it. Confirmed at F0.2: **2583/2583, first green.**

**D3 — `lane/fe-wf-invite-list-revoke` removed from T2 position 6 and NOT merged.**
compose.md §6 **F4** overrides the mechanical T2 sort: it is the cross-repo contract pair with backend
`lane/wf-invite-list-revoke`, "lands **only after**" the backend half, and its re-run point is "the
invite journey against the **live backend**, not the Node fixture." The backend half is an unlanded
mergeable head, this repo cannot supply that live backend, and I am forbidden `OkamAPI-modules`.
Merging it here ships a control calling an endpoint that does not exist — the **C3** violation the
census names explicitly. **Excluded on a measured reason.**

**D4 — per-step re-run is the FULL jest suite + a translations-integrity check; the journey tier runs
at checkpoints, not after each of 61 steps.**
compose.md §6/F1 names "the journey specs under `test/e2e/journeys/` **plus**
`test/admin-nav-access.test.js`". Measured journey cost **5.4 min** → 61 × 5.4 = **5.5 h of journey
runtime**, and it still would not measure the thing it is asked for. The census wants journeys because
*"a `translations/*.ts` merge resolved by concatenation can drop or duplicate a key that a journey
asserts on screen."* So per step I ran:

- the **whole jest suite** (13 s) — a strict **superset** of the named `test/admin-nav-access.test.js`; and
- `translations-check.js`, measuring the named hazard **directly**: a key **duplicated** in one file
  (in a JS object literal the second silently wins — nothing throws, and no test reading the winning
  value can see it), a key **dropped** that either merge parent had, and new cross-language **skew**
  charged against the 35 already present.

**D5 — four heads the census could not see.** Its population is `refs/heads` (95 refs); `refs/lanes/*`
holds four more, and `lane/jest-collects-lanes` / `lane/collected-paths` were cut after it was taken.
Each classified by my own measurement:

| ref | decision | measured reason |
|---|---|---|
| `lane/jest-collects-lanes` | **merged, first** | §1.2 — changes what every re-run collects |
| `lanes/L-XZ-NEGATED-ABSENCE` | **attempted** (F5.01) | live, contained by no `refs/heads` branch — conflicted, see §0 |
| `lanes/L-WORLD-STAMP-WINDOWS` | **merged** (F5.02) | live, contained by no `refs/heads` branch |
| `lane/collected-paths` | **merged** (F5.03) | verified myself: 13 files, all under `lanes/L-COLLECTED-PATHS/`, **zero tracked source**; inert once the anchored ignore is in |
| `lanes/L-PRICE-BYPASS-FIVE` | **excluded — contained** | **strict ancestor of `lanes/L-XZ-NEGATED-ABSENCE`**; merging XZ alone lands both. Same shape as compose.md §2.6's `wf-w5-timesheet` finding, and the same trap: merging it as a required half lands a strict subset |
| `lanes/L-OFFER-PARTIAL-SUBTOTAL` | **excluded — alias** | same commit `35e5cdd` as `lane/offer-partial-subtotal`, already classified superseded by `lane/offers-page-hundredfold`. One unit of work under two names, not two |

**How a failing step was handled.** Nothing forced, no conflict resolved on judgement. On conflict:
`git merge --abort`, head recorded with its conflicting paths, run continues — a conflicted head
resolved by nobody is a fact to report, and the brief requires the not-merged list to be as explicit
as the merged one. On a re-run red: revert the merge, **re-run to confirm the green returns**, exclude
the head with its failing tests named. Had a red *not* cleared on revert the run would have **stopped
there**; that did not occur.

---

## 3. What the per-step checks actually caught

**Duplicate keys: 0, across all 36 merges.** No merge concatenated a translations file into a
double-declared key.

**Dropped keys: one, and it is not merge damage.** `wfrt_att_no_correction_ui` left all three
language files at F1.08 (`lane/journey-workforce`) and stayed gone. Traced rather than assumed:

- merge-base `5ad0ca00` **has** the key; our side **has** it; **`lane/journey-workforce` does not** —
  the branch deleted it, and only its side touched `translations/*`, so git correctly took that side.
- **No reference to the key survives anywhere in the composed tree.** The lane removed the string and
  its callers together.

So the check fired 34 times on a **deliberate deletion**. Stated plainly because the distinction is
the whole point: `translations-check.js` **cannot** tell a key a lane deleted on purpose from a key a
merge lost — a human has to read it, and I did.

**That gap is why I added a second check.** `i18n-reachability.js` asserts the thing a person at the
screen would see: every literal `$i('key')` the composed **code** asks for exists in the composed
**translations**. A missing one renders blank or as a raw key and **no jest suite in this repo fails
on it.** Result:

| | keys in `en.ts` | source files | referenced-but-missing |
|---|---:|---:|---:|
| pristine tip `e34977ac` | 4781 | 405 | **33** |
| candidate tip `dc6560a` | 5054 | 420 | **33** |

The two sets are **identical** — `comm` reports zero difference. The composition added 273 keys to
each of the three languages and introduced **no new i18n gap**. The 33 are pre-existing debt at the
tip (`posset_*` in `GoodsGroupsTab.vue`, `nav_group_modules`, `index_specialDays*`), carried, not
caused. Its blind spot is stated rather than hidden: dynamic `$i(expr)` call sites are counted, never
guessed at.

**The decoy surface was recorded at every step.** For each merge I computed the files **both sides
changed since the merge-base that git resolved without asking** — that set, not the conflict list, is
what `F-THE-CONFLICT-IS-A-DECOY` says a human must read. **17 of 36 merges had a non-zero decoy
surface, the largest 10 files.** Each is listed inline in §4 below.

---

## 3a. The twin pair — an identical commit message over two divergent trees

Raised mid-run by the coordinator, verified here at every object before anything was touched. It is
the hazard my brief named — *"identical blobs merge add/add with nobody forced to notice"* — one level
up: **not identical blobs, an identical commit *message* over divergent trees.**

`c4a4fa44` and `8c6e91fa` carry the byte-identical subject *"Five legacy pages stop printing an
amount nobody stated as a real figure"*, are **three hours apart** (16:53 and 20:08 on 2026-08-04),
and **neither is an ancestor of the other**. They differ on exactly four files.

**My run had already found this defect from the other direction and did not know it.** The
`lane/L-PRICE-SHADOW-GUARD` red (§3b) named `pages/admin/kravia-invoice.vue:591` declaring
`priceLabel` in `methods`. That is the same defect, reported by the guard rather than by the
ancestry. Neither view alone identifies it; together they do.

**Why it matters.** In Vue 2 a component's own `methods` entry wins over the mixin's, so a local
`priceLabel` takes the whole surface **off the money gate** in `plugins/global-mixin.js` — every
figure on an invoice, **including the confirmation dialog an operator approves before one is
issued**. The candidate had landed twin A (via `lane/offers-page-hundredfold`), which **keeps** the
shadow and **omits** the test that forbids it, so the suite could not tell me.

**Feasibility, checked before acting.** Taking twin B's side is only honest if it discards nobody's
work. Measured by blob id: the candidate's `pages/admin/kravia-invoice.vue`,
`test/price-bypass-legacy.test.js` and `components/molecules/CustomerInfoModal.vue` were **byte-identical
to twin A**, and **no landed head modified them afterwards**. So this is a whole-blob swap, not a
hunk-level judgement on money code — which is the only reason I did it rather than stopping.

**What was taken, and on what basis** (commit `f1d177f`):

| file | taken from | basis |
|---|---|---|
| `pages/admin/kravia-invoice.vue` | twin B `c4a4fa44` | the coordinator's rule; renames the shadowing method to `invoiceAmountLabel` at all 12 call sites |
| `test/price-bypass-legacy.test.js` | twin B `c4a4fa44` | the coordinator's rule; restores *"the invoice page no longer declares anything called priceLabel"* |
| `components/molecules/CustomerInfoModal.vue` | twin B `c4a4fa44` | **ruled on content, not provenance**: it deletes `calculateTotalRewards`, which I verified has **no caller anywhere** in the candidate — dead money code (it converts øre to kroner and nothing invokes it) |
| `lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md` | twin B `c4a4fa44` | **ruled on content**: evidence-only markdown, absent from the candidate, additive, and it is the document naming the shadow sites |

`refs/lanes/L-XZ-NEGATED-ABSENCE` was **not** merged on top, as instructed — that would put both twins
in one history over these four files with only two of them conflicting.

### The falsifiable check, and a claim of mine it falsified

A reconciliation is a judgement until something independent confirms it, so I made a prediction: if
taking twin B's side really closes the shadow, then `lane/L-PRICE-SHADOW-GUARD` — reverted earlier as
RED — should now merge **green**. It does: **126 suites / 2959 tests / 0 failed.** The head is
recovered and is on the candidate. That is the 35th head, and the second one this run recovered from
a wrongly-attributed red.

**It also falsified something I had written.** In `f1d177f` I recorded that
`CustomerInfoModal.vue` *"still declares its own priceLabel (line 318, used at line 60) on BOTH
twins"*. **That is wrong.** Line 318 on twin B is a **comment** — *"There is deliberately no
`priceLabel` here"* — and line 60 is a legitimate **call** that now resolves to the gated mixin
member, which is the point of the fix. I had grepped `/priceLabel\s*\(/` and counted a comment and a
call as declarations. The correction is recorded on the branch itself as `9f7d8df` rather than
quietly dropped.

The evidence that settles it is not my grep but the guard: its scanner walks every
`methods`/`computed`/`props` block in the estate for depth-1 declarations of `priceLabel`,
`wholeAmount` or `fractionAmount`, and asserts `shadows == []` **and** `PINNED_SHADOWS == []` — both
empty, nothing excused. **Zero money-gate shadows remain on this candidate**, and
`F-INVOICE-PRICELABEL-STILL-SHADOWS` is closed on it.


---

## 3b. The two heads whose re-run redded — both attributed, one later recovered

Each was **reverted and the green re-confirmed by re-running**, so the red belongs to that head and to
nothing else. Neither is a composition artifact, and they fail for opposite reasons.

### `lane/L-PRICE-SHADOW-GUARD` — the guard was right, and §3a recovered it

**Outcome: this head is now ON the candidate**, green, after the twin-pair reconciliation in §3a. What
follows is what the red said before that, because the reasoning is what led to the fix.

2 failed tests. The guard asserts that no Vue component redeclares a gated money member, because **in
Vue 2 a `methods` entry overrides the gated mixin member of the same name** — the message it prints is
its own best summary:

> `pages/admin/kravia-invoice.vue:591` declares `priceLabel` in `methods`, which in Vue 2 overrides
> the gated mixin member of that name — **this surface would render money without the gate.**

I traced whether the composition caused this. It did not:

| ref | `priceLabel` occurrences in `pages/admin/kravia-invoice.vue` |
|---|---:|
| tip `e34977ac` | 11 |
| `lane/L-PRICE-SHADOW-GUARD` (guard only) | 11 |
| `lanes/L-PRICE-BYPASS-FIVE` / `lanes/L-XZ-NEGATED-ABSENCE` (the drain) | **2** |
| candidate tip | 12 |

**The shadow is live at the tip and live on the candidate.** The guard reds because it asserts a
*drained ledger*, and the branch that drains it — `lanes/L-XZ-NEGATED-ABSENCE` — is one of the 12
order-induced conflicts and never landed. So the head is not broken; it is **blocked behind a
conflicting head**, and it is reporting a money-rendering bypass that is still there.

**This dependency is invisible to the census.** The two branches were scored *independent, degree 0*,
so the order puts them in the parallelisable tier — yet one cannot land until the other has. Two
reasons the matrix could not see it: the dependency is **semantic, not textual** (the guard asserts a
property of files it does not itself modify), and `lanes/L-XZ-NEGATED-ABSENCE` was **not in the census
population at all**, because the population is `refs/heads` and it lives in `refs/lanes`. A blob-keyed
collision matrix is the right instrument for the question it answers, and this is a question it does
not answer.

### `lane/wf-timesheet-ui` — the branch never had a green to transfer

22 failed tests across 4 suites, every one of them the same shape:

```
missing translation key: wft_batches_title
```

Measured, not inferred:

- the branch's merge **decoy surface was 0** and the key counts did not move (5054/5089/5054), so the
  merge neither touched nor lost a translations file;
- **`lane/wf-timesheet-ui` does not modify `translations/` at all** — `git diff --name-only
  e34977ac lane/wf-timesheet-ui -- translations/` is empty;
- `wft_batches_title` exists **nowhere**: not at the tip, not on the branch, not on the candidate;
- its `WorkforceTimesheetBatchList.vue` references **12 distinct `wft_*` keys**, none of which any
  branch defines.

So this head ships a surface that asks for translation strings it never created. It is **red on its
own terms**: the composition did not break it and no merge order can fix it. This is the sharper form
of "a branch's own green does not transfer" — here the green never existed, and `test/admin-nav-access.test.js`
and the repo's own `test/translation-key-presence.test.js` both fell over with it.


---

## 3c. The journey tier — and a correction to my own evidence

**This section was wrong when first written and is corrected here.** I originally reported **8 failed /
21 passed** at the candidate tip. The true figure, measured against the candidate's **own** fixture, is
**3 failed / 26 passed**. What follows is the corrected finding and the mechanism that produced the
false one, because the mechanism affects every lane on this machine, not just mine.

### What went wrong

`playwright.config.js` starts two servers, and both carry:

```js
reuseExistingServer: !process.env.CI
```

I never set `CI`, so both are `true`. `fixtureServer` probes
`http://127.0.0.1:4010/__fixture/health` and, if anything answers, **reuses it instead of starting its
own**. A **sibling lane's** fixture server — pid 73160, cwd `/Users/svendaneel/okam/wt-jwf`, started
2026-08-04 16:03 and still running — was holding port 4010 for my entire session and answered that
probe with HTTP 200.

So every journey run I recorded drove **my** frontend (port 3010 was free, so the Nuxt dev server was
genuinely mine) against **a sibling's API fixture**, whose `api-server.js` is **368 lines divergent
from the composed one** (1627 vs 1967 lines). The composed fixture defines `kodeoversikt` endpoints
**6 times**; the one actually serving my journeys defined it **0 times**.

I found this only because a stray-process check after the run showed a foreign pid on my port. **It
would otherwise have shipped**, and it is the same lesson as my `jest.config.js` error earlier in this
run: I inherited an environment I had not verified.

### The corrected result

Re-run on isolated ports (`E2E_FIXTURE_PORT=4917 E2E_WEB_PORT=3917`), with the fixture confirmed by
pid and cwd to be the candidate's own, and **without touching the sibling's process**:

| | journeys | passed | failed |
|---|---|---:|---:|
| candidate tip, **foreign** fixture (what I first reported) | 29 | 21 | 8 |
| candidate tip, **own** fixture — the true figure | 29 | **26** | **3** |

**Five of the eight were artifacts** and pass with the correct fixture:
`growth-preference-withdrawal`, `training-evidence-document`, `workforce-kodeoversikt`,
`workforce-punch-correction`, `workforce-role-catalogue`.

**I withdraw the C6 flag.** I reported `workforce-kodeoversikt` — the § 8-5-6 statutory download — as
a failing statutory journey. **It passes.** It failed only because the foreign fixture served none of
the six `kodeoversikt` endpoints. Naming a statutory gap that does not exist is the same class of
error as asserting a control that does not exist, and it should not have gone out.

### The three that genuinely fail

- **`meals-admin-setup.spec.js` — a genuine regression, confirmed under matched conditions.** It
  **passes at the pristine tip** against the tip's own fixture (`1 passed (35.0s)`, receipt
  `receipts/tip-baseline-meals-admin-setup-ISOLATED.txt`) and **fails on the candidate** against the
  candidate's own fixture. Both sides measured the same way, so the composition caused it. Which of
  the 35 landed heads caused it is **still unattributed** — that needs a per-step journey bisect.
- **`meals-statement-month.spec.js` — arrived broken.** A new journey landing with the composition,
  failing against its own fixture. Its branch's green did not transfer.
- **`workforce-schedule-publish.spec.js` (@live) — pre-existing.** Failed at the tip too; it is tagged
  `@live` and wants a live backend that fixture mode cannot give it.

### What this does and does not change

**The verdict does not change.** A genuine regression plus a new journey arriving broken means the
candidate is still not fit to land, and stopping was still right. **The evidence behind the verdict is
much smaller than I claimed**, and one of my louder claims — the statutory one — was false.

**Nothing else in this document depends on the fixture.** The jest results, the 28/61 conflict
classification, the collector correction, the twin reconciliation and the translations/i18n checks are
all git- or jest-derived and are unaffected.

**A hazard for the whole program, not just this lane.** `reuseExistingServer: !process.env.CI` on a box
carrying ~80 worktrees means **any lane running journeys silently inherits whatever fixture already
holds port 4010**. Every journey receipt taken on this machine without a private
`E2E_FIXTURE_PORT` is suspect by the same mechanism, and a receipt cannot be compared with another
unless it states which fixture served it. The cheap fix is a per-lane fixture port; the honest interim
is for every journey receipt to record the serving fixture's pid and cwd, exactly as this one now does.


---

## 4. The run, step by step

### FF0.1  `lane/jest-collects-lanes`

- merge commit: `c14e69e`  (base `e34977ace`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-OK | keys {"translations/en.ts":4781,"translations/no.ts":4816,"translations/de.ts":4781} | dup=0 dropped=0 new-skew=0 (baseline skew 35)
- re-run (full jest, `npx jest --ci --coverage=false`): **BEHAVIOUR-RED** — Test Suites: 1 failed, 111 passed, 112 total; Tests:       2 failed, 2581 passed, 2583 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F0.1.txt`

  Failing tests:
  ● backend identity › asks whoever is holding the port what directory they are running from
  ● backend identity › the world stamp › names the checkout the world script recorded, not the one holding the port

### FF0.2  `lane/worktree-basename-pin`

- merge commit: `cc4084a`  (base `e34977ace`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-OK | keys {"translations/en.ts":4781,"translations/no.ts":4816,"translations/de.ts":4781} | dup=0 dropped=0 new-skew=0 (baseline skew 35)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 112 passed, 112 total; Tests:       2583 passed, 2583 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F0.2.txt`

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

- merge commit: `8859fd6`  (base `5ad0ca004`)
- files changed by this step: 32
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":4798,"translations/no.ts":4833,"translations/de.ts":4798} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by cc4084aba59d5a4bbba6cbe4aa2de33f079f9eb8)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by cc4084aba59d5a4bbba6cbe4aa2de33f079f9eb8)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by cc4084aba59d5a4bbba6cbe4aa2de33f079f9eb8)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 112 passed, 112 total; Tests:       2603 passed, 2603 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F1.08.txt`

### F1.09  `lane/menu-allergen-matrix` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF1.10  `lane/train-evidence-pack-ui`

- merge commit: `bba004e`  (base `e34977ace`)
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

- merge commit: `b3ccb93`  (base `e34977ace`)
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

- merge commit: `9bc40c6`  (base `e34977ace`)
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

- merge commit: `55b2dcd`  (base `3cd25709e`)
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

- merge commit: `01b8686`  (base `3cd25709e`)
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

- merge commit: `07e944e`  (base `3cd25709e`)
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

- merge commit: `eec2db6`  (base `4b5c5c2c5`)
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

- merge commit: `ec6ca4c`  (base `3cd25709e`)
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

- merge commit: `6fecf07`  (base `a1a1ec84e`)
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

- merge commit: `5d95b84`  (base `0138168ba`)
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

- merge commit: `37d8b57`  (base `3cd25709e`)
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

- merge commit: `28525fb`  (base `3cd25709e`)
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

- merge commit: `cdd0de5`  (base `5ad0ca004`)
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

- merge commit: `8341892`  (base `bbb80d658`)
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

- merge commit: `cb15284`  (base `35440cfb9`)
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

- merge commit: `e13dcf5`  (base `e34977ace`)
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

- merge commit: `658811b`  (base `e34977ace`)
- files changed by this step: 9
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/L-JOURNEY-PROXY-BLINDSPOT)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/L-JOURNEY-PROXY-BLINDSPOT)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/L-JOURNEY-PROXY-BLINDSPOT)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 122 passed, 122 total; Tests:       2856 passed, 2856 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.02.txt`

### FF2.03  `lane/mrg-page-test-vacuous`

- merge commit: `9ab018a`  (base `3cd25709e`)
- files changed by this step: 4
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-page-test-vacuous)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-page-test-vacuous)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-page-test-vacuous)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 122 passed, 122 total; Tests:       2858 passed, 2858 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.03.txt`

### FF2.04  `lane/offers-page-hundredfold`

- merge commit: `8e1febe`  (base `e34977ace`)
- files changed by this step: 18
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/offers-page-hundredfold)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/offers-page-hundredfold)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/offers-page-hundredfold)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.04.txt`

### FF2.05  `lane/tier-artifacts`

- merge commit: `a823a6f`  (base `e34977ace`)
- files changed by this step: 9
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/tier-artifacts)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/tier-artifacts)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/tier-artifacts)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.05.txt`

### FF2.06  `lane/train-publish-unclickable`

- merge commit: `36afade`  (base `e34977ace`)
- files changed by this step: 19
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/train-publish-unclickable)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/train-publish-unclickable)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/train-publish-unclickable)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.06.txt`

### F2.07  `lane/L-JOURNEY-PORT-HARDCODED` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF2.08  `lane/fe-admin-refusal-credential`

- merge commit: `c6f208e`  (base `22f21082e`)
- files changed by this step: 1
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-admin-refusal-credential)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-admin-refusal-credential)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-admin-refusal-credential)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F2.08.txt`

### FF3.01  `lane/L-PRICE-SHADOW-GUARD`

- merge commit: `227728d`  (base `e34977ace`)
- files changed by this step: 10
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/L-PRICE-SHADOW-GUARD)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/L-PRICE-SHADOW-GUARD)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/L-PRICE-SHADOW-GUARD)
- re-run (full jest, `npx jest --ci --coverage=false`): **BEHAVIOUR-RED** — Test Suites: 1 failed, 123 passed, 124 total; Tests:       2 failed, 2933 passed, 2935 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.01.txt`

  Failing tests:
  ● no component takes a silent exit from the money gate › every component that redeclares a gated money member is one the ledger already names
  ● no component takes a silent exit from the money gate › there is no ledger left: every surface in the estate is on the gate
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.01-revert.txt`

  **REVERTED.** The red is this head's: reverting restored 0 failed test(s) (baseline 0). Recorded as excluded on a measured reason.

### FF3.02  `lane/ev-guestlink-one-composer`

- merge commit: `ad7c125`  (base `e34977ace`)
- files changed by this step: 1
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/ev-guestlink-one-composer)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/ev-guestlink-one-composer)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/ev-guestlink-one-composer)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.02.txt`

### FF3.03  `lane/exit-instrument-census`

- merge commit: `cde320a`  (base `e34977ace`)
- files changed by this step: 3
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/exit-instrument-census)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/exit-instrument-census)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/exit-instrument-census)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.03.txt`

### FF3.04  `lane/fe-ci`

- merge commit: `408f4c8`  (base `ce77727c9`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-ci)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-ci)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-ci)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2907 passed, 2907 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.04.txt`

### FF3.05  `lane/fe-ev-inquiry-gate`

- merge commit: `1561c71`  (base `a48fb78a4`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-ev-inquiry-gate)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-ev-inquiry-gate)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-ev-inquiry-gate)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2909 passed, 2909 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.05.txt`

### FF3.06  `lane/fe-journey-meals`

- merge commit: `2df8ba0`  (base `e34977ace`)
- files changed by this step: 15
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/fe-journey-meals)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/fe-journey-meals)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/fe-journey-meals)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2909 passed, 2909 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.06.txt`

### FF3.07  `lane/mrg-revise-land`

- merge commit: `67108b8`  (base `e34977ace`)
- files changed by this step: 5
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-revise-land)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-revise-land)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-revise-land)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 123 passed, 123 total; Tests:       2909 passed, 2909 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.07.txt`

### FF3.08  `lane/mrg-waste-receipts`

- merge commit: `fa2ed54`  (base `e34977ace`)
- files changed by this step: 10
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/mrg-waste-receipts)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/mrg-waste-receipts)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/mrg-waste-receipts)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2920 passed, 2920 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.08.txt`

### FF3.09  `lane/wf-timesheet-ui`

- merge commit: `bf86add`  (base `e34977ace`)
- files changed by this step: 27
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/wf-timesheet-ui)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/wf-timesheet-ui)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/wf-timesheet-ui)
- re-run (full jest, `npx jest --ci --coverage=false`): **BEHAVIOUR-RED** — Test Suites: 4 failed, 123 passed, 127 total; Tests:       22 failed, 2952 passed, 2974 total
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
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 124 passed, 124 total; Tests:       2920 passed, 2920 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F3.09-revert.txt`

  **REVERTED.** The red is this head's: reverting restored 0 failed test(s) (baseline 0). Recorded as excluded on a measured reason.

### F5.01  `lanes/L-XZ-NEGATED-ABSENCE` — **NOT MERGED: conflict, aborted clean**

  Conflicting paths recorded in `conflicts.md`. Nothing was resolved.

### FF5.02  `lanes/L-WORLD-STAMP-WINDOWS`

- merge commit: `904afeb`  (base `e34977ace`)
- files changed by this step: 18
- **auto-merged both-sides (decoy surface): 1**

  Files git resolved without asking, where both sides had changed:
  - `test/journey-artifact-store.test.js`
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lanes/L-WORLD-STAMP-WINDOWS)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lanes/L-WORLD-STAMP-WINDOWS)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lanes/L-WORLD-STAMP-WINDOWS)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 125 passed, 125 total; Tests:       2930 passed, 2930 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F5.02.txt`

### FF5.03  `lane/collected-paths`

- merge commit: `dc6560a`  (base `e34977ace`)
- files changed by this step: 13
- **auto-merged both-sides (decoy surface): 0**
- translations integrity: TRANSLATIONS-DAMAGE | keys {"translations/en.ts":5054,"translations/no.ts":5089,"translations/de.ts":5054} | dup=0 dropped=3 new-skew=0 (baseline skew 35)
      DROPPED   translations/en.ts:wfrt_att_no_correction_ui (had by lane/collected-paths)
      DROPPED   translations/no.ts:wfrt_att_no_correction_ui (had by lane/collected-paths)
      DROPPED   translations/de.ts:wfrt_att_no_correction_ui (had by lane/collected-paths)
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 125 passed, 125 total; Tests:       2930 passed, 2930 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F5.03.txt`

---

## 5. Appendix — every head, and what happened to it

### Merged and kept (34)

- `lane/jest-collects-lanes`  (F0.1)
- `lane/worktree-basename-pin`  (F0.2)
- `lane/journey-workforce`  (F1.08)
- `lane/train-evidence-pack-ui`  (F1.10)
- `lane/wf-kodeoversikt-ui`  (F1.11)
- `lane/wf-roles-ui`  (F1.13)
- `lane/meals-enrol-pretick`  (F1.16)
- `lane/fe-meals-statement-surface`  (F1.18)
- `lane/coercion-write-paths`  (F1.21)
- `lane/fe-meals-claim-receipt`  (F1.22)
- `lane/fe-meals-reconcile-ui`  (F1.23)
- `lane/fe-wf-contact-imported`  (F1.25)
- `lane/meals-reachable-web`  (F1.28)
- `lane/mrg-coverage-unknown`  (F1.29)
- `lane/mrg-lag-visible`  (F1.30)
- `lane/mrg-recipe-revise-ui`  (F1.31)
- `lane/wf-idreg`  (F1.35)
- `lane/fe-gr-withdraw-origin`  (F1.39)
- `lane/price-crosscurrency`  (F1.42)
- `lane/L-JOURNEY-PROXY-BLINDSPOT`  (F2.02)
- `lane/mrg-page-test-vacuous`  (F2.03)
- `lane/offers-page-hundredfold`  (F2.04)
- `lane/tier-artifacts`  (F2.05)
- `lane/train-publish-unclickable`  (F2.06)
- `lane/fe-admin-refusal-credential`  (F2.08)
- `lane/ev-guestlink-one-composer`  (F3.02)
- `lane/exit-instrument-census`  (F3.03)
- `lane/fe-ci`  (F3.04)
- `lane/fe-ev-inquiry-gate`  (F3.05)
- `lane/fe-journey-meals`  (F3.06)
- `lane/mrg-revise-land`  (F3.07)
- `lane/mrg-waste-receipts`  (F3.08)
- `lanes/L-WORLD-STAMP-WINDOWS`  (F5.02)
- `lane/collected-paths`  (F5.03)

### Not merged — conflict, aborted clean (28)

| head | classification | conflicting paths |
|---|---|---:|
| `lane/fe-training-meals-surfaces` | INHERENT-tip-vs-branch | 23 |
| `feature/swiss` | INHERENT-tip-vs-branch | 10 |
| `lane/ev-stale-cause` | INHERENT-tip-vs-branch | 5 |
| `lane/fe-events-margin-surfaces` | INHERENT-tip-vs-branch | 8 |
| `lane/statute-evidence-world` | INHERENT-tip-vs-branch | 5 |
| `lane/fe-wf-link-deadend` | INHERENT-tip-vs-branch | 7 |
| `lane/fe-wf-self` | INHERENT-tip-vs-branch | 10 |
| `lane/menu-allergen-matrix` | INHERENT-tip-vs-branch | 5 |
| `lane/wf-pubhist` | ORDER-INDUCED | 0 |
| `lane/margin-menu-margin-ui` | INHERENT-tip-vs-branch | 2 |
| `lane/meals-admin` | INHERENT-tip-vs-branch | 7 |
| `lane/events-admin` | INHERENT-tip-vs-branch | 11 |
| `lane/margin-recipes` | INHERENT-tip-vs-branch | 11 |
| `lane/training-admin` | INHERENT-tip-vs-branch | 14 |
| `lane/fe-wf-bootstrap` | ORDER-INDUCED | 0 |
| `lane/fe-wf-correction-path` | ORDER-INDUCED | 0 |
| `lane/growth-admin` | INHERENT-tip-vs-branch | 13 |
| `lane/mrg-waste-frontend` | ORDER-INDUCED | 0 |
| `lane/train-readonly-visible` | ORDER-INDUCED | 0 |
| `lane/wf-adjust-address` | ORDER-INDUCED | 0 |
| `lane/workforce-roster` | INHERENT-tip-vs-branch | 10 |
| `lane/L-JOURNEY-GROWTH` | ORDER-INDUCED | 0 |
| `lane/modal-broken-two` | INHERENT-tip-vs-branch | 2 |
| `lane/journey-teardown` | ORDER-INDUCED | 0 |
| `lane/fe-gr-exit-wire-the-mail` | ORDER-INDUCED | 0 |
| `lane/fe-meals-docsync` | ORDER-INDUCED | 0 |
| `lane/L-JOURNEY-PORT-HARDCODED` | ORDER-INDUCED | 0 |
| `lanes/L-XZ-NEGATED-ABSENCE` | ORDER-INDUCED | 0 |

### Not merged — re-run red, merge reverted (2)

Both were **reverted and the green re-confirmed by re-running**, so each red is attributed to its own head and to nothing else.


### FF36  `lane/fe-meals-journey-locator`

- merge commit: `f40fdf3`  (base `2e3f39d14`)
- files changed by this step: 2
- **auto-merged both-sides (decoy surface): 1**

  Files git resolved without asking, where both sides had changed:
  - `components/admin/meals/MealsProgramPanel.vue`
- re-run (full jest, `npx jest --ci --coverage=false`): **GREEN** — Test Suites: 126 passed, 126 total; Tests:       2959 passed, 2959 total
  core submodule: **populated@1bcab0b**  ·  receipt: `lanes/L-COMPOSE-FE-CANDIDATE/receipts/step-F36.txt`

---

# RUN 4 — 2026-08-05, after D-REBASE-CONFLICTING-HEADS was ruled `land-the-clean-thirty-five-first`

Worktree `/Users/svendaneel/okam/web-fe-candidate`, branch `candidate/fe-compose-2026-08-05`.
`feature/restaurant-modules` re-read at `e34977a` after this run — **unmoved**. Branch has **no upstream**;
nothing was pushed. No container started; port 4010 was held by a **foreign** fixture (pid 73160) and was
not touched.

## 1. Baseline re-run, not inherited
`9f7d8df` -> **126 suites / 2959 tests / 0 failed**, core submodule **populated at `1bcab0b`** (11 entries).
Receipt: `receipts/r4-baseline-9f7d8df.txt`. This reproduces run 3's recorded figure exactly, which is the
only reason a later comparison means anything.

## 2. The gate item: the meals-admin-setup fix, landed on the candidate
`lane/fe-meals-journey-locator` is `lane/meals-enrol-pretick` + exactly one commit, `d320105`. Its parent
`2e3f39d` is already an ancestor of the candidate, so the merge contributes that commit and nothing else.

- **Step F36** -> merge `f40fdf3`, 2 files changed, **decoy surface 1**: `components/admin/meals/MealsProgramPanel.vue`.
- **Decoy read rather than trusted** (F-THE-CONFLICT-IS-A-DECOY): the file's blobs differ between the lane
  (`fcf396c..9e13f43`) and the candidate (`94a3d94..b41d79a`), so both sides had changed it. `git diff 9f7d8df HEAD`
  on that path returns **d320105's hunk and nothing else** — git resolved it correctly and moved nothing extra.
- Re-run F36: **126 / 2959 / 0**, core populated. Translations: **dup=0, dropped=0, new-skew=0**.

## 3. Journey re-run point — isolated, and the isolation proved rather than assumed
`E2E_FIXTURE_PORT=4436 E2E_WEB_PORT=3436`. The receipt carries the line
`[fixture] listening on http://127.0.0.1:4436`, which is what proves this run was **not** served by the
foreign fixture on 4010 — the defect that poisoned run 2's figures.

| ref | journeys | passed | failed |
|---|---:|---:|---:|
| `9f7d8df` (run 3) | 29 | 26 | 3 |
| `f40fdf3` (this run) | 29 | **27** | **2** |

**`meals-admin-setup` passes.** Its canonical artifact records `outcome: passed` over 13 steps
(`r4-walk-evidence/meals-admin-setup.playwright.json`). The one genuine regression that blocked run 3 is closed,
and it is the only journey that moved.

### The two survivors, each measured to be independent of the composition
- **`meals-statement-month`** — 404, not an assertion failure: the journey POSTs
  `/v1/stores/{id}/meals/statements/drafts`. **No ref in this repository serves it.** All 130 local refs were
  scanned; the meals route set in `test/e2e/fixture/api-server.js` is **identical** on the candidate and on the
  journey's own origin `lane/fe-meals-statement-surface`. The composition removed nothing — the journey cannot
  pass anywhere. *Not run at origin; the identical-route-set diff is the evidence, and it covers every ref
  rather than one.*
- **`workforce-schedule-publish` @live** — fails at the pristine tip too; plan.md records it as the tip's own
  single failure. Pre-existing.

## 4. The ruling's premise, tested — and it does not hold
`land-the-clean-thirty-five-first` was carried in part by: *"some of the sixteen may stop conflicting once the
tip carries the work they were written beside. It shrinks the problem before anyone resolves anything."*

All 28 unlanded heads were re-tested against the new tip `f40fdf3` with `git merge-tree --write-tree`
(non-destructive; nothing was merged). Full table: `r4-retest-at-new-tip.tsv`.

**0 of 28 became clean. The surface did not shrink; for 11 heads it grew.**

- The **16 INHERENT** heads are unchanged or worse — `fe-training-meals-surfaces` 23 -> 28 conflicted files,
  `fe-wf-self` 10 -> 13, `training-admin` 14 -> 16, `meals-admin` 7 -> 10.
- The **12 ORDER-INDUCED** heads each conflicted on **0** files against the pristine tip — every one of them
  merges cleanly onto `e34977ac` alone. Against the 36-head candidate they now conflict on **1 to 3** files each.
  **Landing the thirty-five is what cost them their clean merge.**

A counting correction I made before reporting: my first pass counted `git merge-tree`'s trailing informational
lines as conflicted files and inflated every figure (e.g. `L-JOURNEY-PORT-HARDCODED` as 3 where it is **1**).
The table above counts only the lines between the tree OID and the first blank line.

## 5. What was deliberately not done
No conflict was resolved and none was forced — the brief's instruction. The 28 remain exactly as they were.
Journey artifacts regenerated by the run were restored rather than committed, because
`artifacts/journeys/**` is the one path the ignore file force-adds and a sweeping `git add` there has already
replaced another lane's committed record once.

# L-SHARED-DIRT-CENSUS — whose work is sitting uncommitted in the shared checkout

**Nothing was changed.** No commit, no stash, no restore, no clean, no `git add`, no container, no
push. Every command was a read: `status --porcelain`, `hash-object`, `cat-file`, `log`, `rev-parse`,
`rev-list`, `for-each-ref`, `merge-base --is-ancestor`, `show`. `--no-optional-locks` was passed on
every invocation so that measuring this tree could not take a lock away from a lane writing in it.

**Measured, not asserted.** Repo state at the snapshot and at 03:02:08Z:

| | at 02:43:01Z | at 03:02:08Z | |
|---|---|---|---|
| `HEAD` | `e34977ac` | `e34977ac` | unchanged |
| `refs/heads` | 107 | **108** | **a lane branched — see below** |
| `refs/lanes` | 9 | 9 | unchanged |
| `refs/salvage` / `refs/remotes` | 8 / 8 | 8 / 8 | unchanged |
| stash entries | 1 | 1 | unchanged |
| in-scope dirty paths | 133 | 133 | unchanged |
| in-scope working **blobs** | — | 0 of 133 changed | unchanged |

The only writes this lane made anywhere are the files in `lanes/L-SHARED-DIRT-CENSUS/` and its
returns under `docs/plan/returns/`. **The 108th head is not one of them** — `lane/guard-repair-lands`
(`7030c00`, 2026-08-05 04:59 local, *"Both provers resolve their harness instead of listing it"*) was
created by another lane 16 minutes after the snapshot.

**This is the document disagreeing with the tree for a reason that is not a defect, and it is worth
reading rather than re-running.** That branch commits 5 in-scope paths: `package.json`,
`test/e2e/fixture/api-server.js`, `test/e2e/scripts/{build-provenance-proof,guard-proof}.js`,
`test/e2e/support/journey.js`. **No verdict below changes** — its blobs differ from the working tree
on all five, so the working content is still the content this census attributes, and all 133 working
blobs are byte-for-byte what they were at 02:43Z. **What changes is the hazard count on those five
rows**: each now has one more lane holding a committed interest than the table records, and
`test/e2e/support/journey.js` and `guard-proof.js` — attributed below to `lane/L-JOURNEY-PROXY-BLINDSPOT` —
now have a second claimant on the same harness code. Treat the ⚠ column as a floor, not a total.

## The snapshot, and the fact that it is a snapshot

| | |
|---|---|
| repo | `/Users/svendaneel/okam/Web-modules` |
| branch / baseline HEAD | `feature/restaurant-modules` @ `e34977acebd59b223584158c33451b6f1ffd82c1` |
| snapshot taken | **2026-08-05T02:43:01Z** (04:43:01+0200 local) |
| re-measured | **2026-08-05T02:54:16Z**, 11 minutes later |
| snapshot files | `lanes/L-SHARED-DIRT-CENSUS/status.z`, `status2.z` |

**Three lanes were writing to this tree while it was measured, and the two snapshots prove it.**
Between them `lanes/` grew by 24 files and `docs/plan/` by 3 (some of that growth is this lane's own
output). **In scope, nothing moved at all:** the same 133 paths, the same statuses, and — checked
blob by blob — the same 133 contents. So the map below is exact as of 02:43Z and was still exact at
02:54Z, but **any path here may have changed since**, and a later census that disagrees is not
thereby wrong. Re-derive before acting; do not act on this document at a newer tip without redoing it.

## Denominator: what is in scope, by what rule

At the snapshot, `git status --porcelain=v1 -uall` — *file-level*, untracked directories expanded —
reported **1,216 entries**: 78 tracked-modified, 1,138 untracked.

| bucket | entries | in scope? |
|---|---|---|
| `lanes/**` | 735 (733 untracked + 2 tracked-modified) | **excluded** |
| `docs/plan/**` | 348 | **excluded** |
| everything else | **133** (76 ` M` + 57 `??`) | **in scope — this is the denominator** |

The two tracked files inside the excluded buckets are `lanes/L-EV-JOURNEY-TIMEBOMB/mutation-proof.{py,txt}`
— some lanes commit their own lane directory, most do not.

**Both exclusions are deliberate and both are stated because otherwise the denominator is
unexplained.** `lanes/` and `docs/plan/` are the programme's own bookkeeping — 149 distinct lane
directories and the plan hub. Together they are **89% of the dirt**; including them would make the
census a count of its own paperwork, and they are preserved at `refs/lanes/plan-snapshot` regardless.
Neither is source, neither ships, and no merge hazard lives in either. **Nothing else is excluded** —
`artifacts/` is normally gitignored but four of its files are force-added and tracked, so they are
counted.

Note that the brief's "roughly 270 uncommitted files" is the **`-unormal`** count, which was **293**
at the snapshot: it collapses each untracked directory to one line, so it counts directories, not
files. 133 is the file-level count of real work outside the bookkeeping.

## Method — and why `path` alone would have lied twice

The key is **`(path, blob)`**, never `path`.

1. **Working blob:** `git hash-object -- <path>` for all 133 (no `.gitattributes` exists, so no filter
   can make the hash differ from the file).
2. **Every revision that path has ever had**, over **both ref namespaces and then some**:
   `refs/heads` (107), `refs/lanes` (9), `refs/salvage` (8), `refs/remotes` (8), **plus the 8 detached
   worktree HEADs that no ref points at** — 140 roots. There are 101 worktrees on this repo and 8 of
   them sit on commits reachable from nothing; a sweep of `refs/**` alone silently loses them.
3. **`(commit, path) → blob`** via one `git cat-file --batch-check` over 3,085 pairs. Match = the
   working content **is** that commit's content, byte for byte.
4. **Lane interest:** a ref *claims* a path when it has a commit **ahead of the baseline** touching it.
5. Where the content matched nothing, the **added lines were attributed individually** — each line
   checked against every interested ref's own copy of that file.

### Four instruments that produced a plausible wrong answer here before being corrected

- **`git log -- <path>` hid 20 of the 28 commits touching `utils/price.js`.** Default history
  simplification drops side-branch commits. **`--full-history` is mandatory** for this question.
- **`--name-only` omits merge commits entirely.** A batched `log --name-only` sweep saw 264 commits
  and 965 pairs; enumerating per path saw **335 commits and 3,085 pairs**. Every blob a merge
  resolution introduced was invisible to the first sweep, which returned a clean, wrong answer.
- **`git diff <ref> -- <path>` reports every untracked path as differing**, because diff consults the
  index and an untracked path has no index entry. This spot-check called `pages/admin/workforce-roles.vue`
  and `utils/workforce/timesheet.js` rival changes; their blobs are **identical to the lane tip**.
  57 of the 133 paths are untracked, so this instrument would have mis-scored 57 rows. **Only
  `hash-object` vs `rev-parse <ref>:<path>` is used below.**
- **zsh does not word-split an unquoted `$var`.** A `for pair in "a b"; set -- $pair` loop passed
  `"path ref"` as a single filename and git answered `no such file`. Loud, but it is the same family
  as the traps that are quiet.

## Calibration: `utils/price.js`, reproduced independently before trusting anything else

Working blob `4673f24c`; HEAD blob `33d7935a`; **+118 / −0**. Sweeping all 140 roots with
`--full-history`, exactly one commit carries `4673f24c` at that path: **`b150668b`**, which is the
**tip of `refs/lanes/L-XZ-NEGATED-ABSENCE`**. `git merge-base --is-ancestor b150668b
refs/lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED` → **true**, and that lane's tip blob is `a6327b76` — a
different, later revision.

So the working content is committed content, and it is simultaneously an **earlier revision** of what
`L-RECEIPT-DISCOUNT-ROW-DROPPED` now holds. **Classification: already-committed-elsewhere**, exactly as
the brief states, arrived at without reading the brief's answer into the method. A name-only check
would have seen 118 unexplained added lines and called it a rival change. Three further lanes
(`L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-XZ-RESIDUAL-SITES`) have also
moved past it. **Two commits in that file's history carry identical subject lines**
(`c4a4fa44` and `8c6e91fa`, "Five legacy pages stop printing an amount nobody stated as a real
figure") on divergent trees — the recorded trap, present in this very file.

## Result

| class | paths |
|---|---|
| **already-committed-elsewhere** | **99** |
| **live-lane-work** | **34** |
| **unattributed** | **0** |
| total | **133** |

**Every one of the 133 is attributed to a named lane.** Nothing is unattributed.

Of the 99 already-committed, all 99 are **byte-identical to a commit that exists right now**, and for
**4** of them the owning lane has since moved past that content:

| path | is the tip of | lanes that have moved on |
|---|---|---|
| `utils/price.js` | `L-XZ-NEGATED-ABSENCE` | `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-XZ-RESIDUAL-SITES` |
| `test/xz-negated-absence.test.js` | `L-XZ-NEGATED-ABSENCE` | same four |
| `components/shared/OfferDocument.vue` | `lane/price-cleanup-two` | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` |
| `test/price-absence.test.js` | `lane/price-cleanup-two` | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` |

## Merge hazards — paths dirty in more than one lane's interest

**66 of 133** are claimed by **more than one** lane ahead of the baseline. **49** are claimed by
exactly one lane (bookkeeping — safe to hand back to that lane). **18** are claimed by no branch at
all, because their lane never made one.

The worst, by number of lanes holding a committed interest ahead of the baseline (`variants` = how
many *distinct* revisions of that path exist across those lanes, so it is the count of genuinely
rival content):

| path | lanes | rival variants |
|---|---|---|
| `translations/no.ts` / `en.ts` / `de.ts` | **46** each | **43** each |
| `test/e2e/fixture/api-server.js` | 26 | 22 |
| `test/e2e/fixture/world.js` | 19 | 14 |
| `utils/workforce/roster-client.js` | 12 | 9 |
| `components/admin/margin/MarginCoveragePanel.vue` | 10 | 4 |
| `pages/admin/wolt-menu.vue` | 9 | 2 |
| `components/organisms/AdminPageHeader.vue` | 9 | 8 |

**These are the files where a wildcard `git add` takes siblings' work and a pathspec commit leaves it
behind.** Both directions are live in this tree today.

### The 15 files whose uncommitted content matches no commit anywhere

Their added lines were attributed line by line. `lines no ref has` is the genuinely new work; the rest
is a sibling lane's committed content sitting in the shared tree unrecorded.

| file | added | lines no ref has | how the added lines split across lanes |
|---|---|---|---|
| `artifacts/journeys/workforce-invitation-onboarding.playwright.json` | 51 | **51** | _none — every added line is new_ |
| `components/admin/pos/PosShell.vue` | 10 | **7** | 3×`fe-pos-clock+fe-wf-blind-bind-name+fe-wf-link-deadend +1 more` |
| `components/admin/pos/PosTopBar.vue` | 36 | **30** | 6×`fe-pos-clock+fe-wf-blind-bind-name+fe-wf-link-deadend +1 more` |
| `components/organisms/AdminPageHeader.vue` | 73 | **16** | 23×`wf-pubhist`<br>13×`wf-roles-ui`<br>10×`train-evidence-pack-ui+wf-pubhist`<br>9×`fe-meals-statement-surface+wf-pubhist`<br>1×`fe-training-meals-surfaces+train-evidence-pack-ui+wf-pubhist` |
| `pages/admin/workforce-schedule.vue` | 15 | **14** | _none — every added line is new_ |
| `pages/preferences/communications.vue` | 13 | **13** | _none — every added line is new_ |
| `test/admin-nav-access.test.js` | 44 | **6** | 16×`wf-pubhist`<br>12×`wf-roles-ui`<br>4×`fe-meals-statement-surface+wf-pubhist`<br>3×`train-evidence-pack-ui+wf-pubhist`<br>2×`fe-meals-statement-surface+fe-training-meals-surfaces+wf-pubhist` |
| `test/e2e/fixture/api-server.js` | 307 | **61** | 104×`wf-roles-ui`<br>74×`wf-pubhist`<br>26×`train-evidence-pack-ui+wf-pubhist`<br>14×`L-JOURNEY-GROWTH+train-evidence-pack-ui+wf-pubhist`<br>8×`L-JOURNEY-GROWTH+fe-gr-exit-wire-the-mail+fe-gr-withdraw-origin +8 more` |
| `test/e2e/fixture/world.js` | 101 | **26** | 66×`wf-roles-ui`<br>4×`fe-gr-withdraw-origin+fe-growth-prefcentre+fe-wf-invite-list-revoke +2 more`<br>2×`menu-allergen-matrix+wf-roles-ui`<br>2×`fe-gr-withdraw-origin+fe-growth-prefcentre+fe-journeys +8 more`<br>1×`ev-stale-cause+fe-gr-withdraw-origin+fe-growth-prefcentre +16 more` |
| `translations/de.ts` | 368 | **69** | 126×`wf-pubhist`<br>56×`fe-meals-statement-surface+wf-pubhist`<br>49×`train-evidence-pack-ui+wf-pubhist`<br>40×`wf-roles-ui`<br>15×`mrg-recipe-revise-ui+wf-pubhist` |
| `translations/en.ts` | 367 | **69** | 125×`wf-pubhist`<br>56×`fe-meals-statement-surface+wf-pubhist`<br>49×`train-evidence-pack-ui+wf-pubhist`<br>40×`wf-roles-ui`<br>15×`mrg-recipe-revise-ui+wf-pubhist` |
| `translations/no.ts` | 376 | **72** | 124×`wf-pubhist`<br>56×`fe-meals-statement-surface+wf-pubhist`<br>54×`train-evidence-pack-ui+wf-pubhist`<br>40×`wf-roles-ui`<br>15×`mrg-recipe-revise-ui+wf-pubhist` |
| `utils/growth/growth-guest-client.js` | 20 | **20** | _none — every added line is new_ |
| `utils/workforce-rates/rates-client.js` | 6 | **6** | _none — every added line is new_ |
| `utils/workforce/api-client.js` | 38 | **16** | 17×`wf-idreg+wf-kodeoversikt-ui`<br>5×`wf-idreg+wf-kodeoversikt-ui+workforce-roster` |

The `+69/+69/+72` orphan lines in the three translation files are one block — the `wft_*` timesheet
keys. **No branch anywhere carries `wft_page_title`**, verified against `lane/wf-timesheet-ui`,
`lane/wf-pubhist`, `lane/wf-roles-ui`, `candidate/fe-compose-2026-08-05` and HEAD.

## The single most important finding: L-WF-TIMESHEET-UI already wrote this map for its own files

`lane/wf-timesheet-ui` (`618efc8`) committed **only files wholly its own** and recorded its shared-file
hunks as data instead, at `lanes/L-WF-TIMESHEET-UI/shared-edits/` — six `*.worktree-diff` files, an
exact re-runnable `i18n-insert.js` + `i18n-run.js` for all 67 `wft_*` keys, and a README naming which
hunks are its own by token (`timesheet`, `workforceTimesheets`, `workforce.export`,
`TIMESHEET_WRITE_FLAG`, `WorkforcePayrollApprover`, `_requestFile`, `fileNameFrom`, `Timelister`,
`Arbeitszeiten`). It is the only lane in the tree that did this.

**The `.worktree-diff` files are NOT ownership claims and the README says so:** each is the *full*
`git diff -U6 HEAD` for that file as the shared tree stood, siblings' hunks included. Read as
ownership they would over-claim by 5.8× — `test/e2e/fixture/api-server.js` records 358 added lines of
which the line-level sweep attributes 104 to `wf-roles-ui` and 74 to `wf-pubhist`.

**They are exact.** Added-line counts recorded then vs. measured now: 73/73, 44/44, 358/358, 126/126,
6/6, 52/52 — **all six identical**. Those six shared files have not moved since 2026-08-04 23:12.

The README also records that a "HEAD + only my hunks" tree was **built and rejected on evidence**: at
`-U3` a sibling's nav entry three lines away merged into the same hunk and was silently carried into
the commit, and the reconstruction then offered a sidebar link to a page that did not exist in it.
**That is the pathspec-commit failure, caught, in this tree, two days ago.**

## Four lanes have uncommitted work and no branch at all

18 in-scope paths exist in **no commit on any of the 140 roots**. All 18 are attributable, from the
lane directories and the plan log, to lanes that never created a branch:

| lane (directory only) | in-scope paths | evidence |
|---|---|---|
| `lanes/L-WF-FAILURES-SURFACE` | 7 (`utils/workforce/delivery-failures.js`, `pages/admin/workforce-delivery.vue`, 2 components, 3 tests/fixtures) | `lanes/L-WF-FAILURES-SURFACE/evidence.md` |
| `lanes/L-WF-PUNCH-UI` | 6 (`utils/workforce/pos-clock-{client,state}.js`, `components/admin/pos/ClockScreen.vue`, 3 tests/fixtures) | `lanes/L-WF-PUNCH-UI/evidence.md` |
| `L-GUARD-W0` | 2 (`scripts/worldstamp`, `world.config`) | `docs/plan/log.md:461`, `docs/plan/returns/L-GUARD-W0-1.md:6` |
| `L-GUARD-DEMO` | 1 (`scripts/drift-demo/demo.sh`) | `docs/plan/returns/L-GUARD-DEMO-1.md:6` |

Two things follow.

**`scripts/drift-demo/demo.sh` is described in `docs/plan/plan.md:17371` as "finished, committed work".
It is committed nowhere.** Same for `scripts/worldstamp` and `world.config`, which `L-GUARD-W0`'s
return reports as built. A `git clean` in this checkout takes all four, and the plan would still say
they exist.

**`L-WF-PUNCH-UI`'s files collide with four branches that already committed their own
`ClockScreen.vue` / `pos-clock-client.js`** (`lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`,
`lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`) — different content at the same paths, one side of
which exists only in this working tree.

## The four tracked journey artifacts

`artifacts/journeys/workforce-invitation-onboarding.playwright.json` and three of its screenshots are
force-added (the `.gitignore` names them) and modified, and no lane's branch commits the rewrite.
They are collateral of **`lane/wf-roles-ui`'s regression sweep**: the artifact's own
`startedAtUtc` is `2026-08-04T20:53:29Z` on `baseUrl 127.0.0.1:3028`, and
`lanes/L-WF-ROLES-UI/NOTES.md:131` records "Bound my own: fixture **4028**, web **3028**" with
line 113 recording the `workforce-invitation-onboarding` re-run as green. Re-running a committed
journey rewrites a committed record; that lane committed its own artifacts but not this overwrite.

## Full classification — all 133 paths

`st` is the porcelain code (`??` untracked, ` M` tracked-modified). ⚠ marks a path claimed by more
than one lane. "lane branch" is the branch whose committed content the working content **is**
(committed-elsewhere) or whose live work it **is** (live-lane-work).

| path | st | class | lane branch | other lanes with an interest |
|---|---|---|---|---|
| `.gitignore` | ` M` | committed-elsewhere ⚠ | `refs/salvage/dangling-1890c9a3` | `lane/L-JOURNEY-GROWTH`, `lane/tier-artifacts` |
| `components/admin/events/EventsJourney.vue` | ` M` | committed-elsewhere ⚠ | `lane/price-crosscurrency` | `lane/ev-stale-cause`, `lane/events-admin`, `lane/fe-events-margin-surfaces`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-self`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `components/admin/margin/MarginCoveragePanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/mrg-coverage-unknown` | `lane/ev-stale-cause`, `lane/fe-events-margin-surfaces`, `lane/fe-journeys`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `components/admin/meals/MealsFundedOrders.vue` | ` M` | committed-elsewhere ⚠ | `lane/price-crosscurrency` | `lane/fe-meals-docsync`, `lane/meals-admin` |
| `components/admin/meals/MealsProgramPanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/price-crosscurrency` | `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui` |
| `components/admin/meals/MealsStatementLines.vue` | `??` | committed-elsewhere | `lane/fe-meals-statement-surface` | — |
| `components/admin/pos/XReportView.vue` | ` M` | committed-elsewhere ⚠ | `L-XZ-NEGATED-ABSENCE` | `lane/offers-page-hundredfold`, `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-OFFER-PARTIAL-SUBTOTAL`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-RESIDUAL-SITES` |
| `components/admin/training/TrainingAssignmentPanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/training/TrainingCertificatePanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/training/TrainingCompletionPanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/training/TrainingCourseList.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/training/TrainingDisclosurePanel.vue` | ` M` | committed-elsewhere | `lane/train-publish-unclickable` | — |
| `components/admin/training/TrainingEvidenceDocument.vue` | `??` | committed-elsewhere ⚠ | `lane/train-evidence-pack-ui` | `lane/fe-training-meals-surfaces` |
| `components/admin/training/TrainingHoldingsPanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/training/TrainingVersionPanel.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/training/_training-panel.scss` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/training-admin` |
| `components/admin/workforce-rates/WorkforceRateTimeline.vue` | ` M` | committed-elsewhere | `lane/price-crosscurrency` | — |
| `components/admin/workforce/WorkforcePublicationList.vue` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `components/admin/workforce/WorkforcePublicationReceiptGroup.vue` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `components/admin/workforce/WorkforcePublicationRecipients.vue` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `components/admin/workforce/WorkforceTimesheetBatchList.vue` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `components/admin/workforce/WorkforceTimesheetPanel.vue` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `components/admin/workforce/WorkforceWeekGrid.vue` | ` M` | committed-elsewhere | `lane/price-crosscurrency` | — |
| `components/molecules/CustomerInfoModal.vue` | ` M` | committed-elsewhere ⚠ | `lane/L-PRICE-SHADOW-GUARD` | `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `components/onboarding/OnboardingProductImages.vue` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` | `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `components/shared/OfferDocument.vue` | ` M` | committed-elsewhere ⚠ | `lane/price-cleanup-two` | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` **(moved on: lane/offers-page-hundredfold, L-OFFER-PARTIAL-SUBTOTAL)** |
| `jest.config.js` | ` M` | committed-elsewhere | `lane/jest-collects-lanes` | — |
| `package.json` | ` M` | committed-elsewhere ⚠ | `L-WORLD-STAMP-WINDOWS` | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/journey-teardown` |
| `pages/admin/feature-flags.vue` | ` M` | committed-elsewhere ⚠ | `lane/train-readonly-visible` | `lane/meals-reachable-web` |
| `pages/admin/kravia-invoice.vue` | ` M` | committed-elsewhere ⚠ | `candidate/fe-compose-2026-08-05`, `L-PRICE-BYPASS-FIVE` | `lane/offers-page-hundredfold`, `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-OFFER-PARTIAL-SUBTOTAL`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `pages/admin/margin-recipes.vue` | ` M` | committed-elsewhere ⚠ | `lane/mrg-recipe-revise-ui` | `lane/margin-menu-margin-ui`, `lane/margin-recipes` |
| `pages/admin/meals-statements.vue` | `??` | committed-elsewhere ⚠ | `lane/fe-meals-statement-surface` | `lane/fe-training-meals-surfaces` |
| `pages/admin/offers.vue` | ` M` | committed-elsewhere | `lane/offers-page-hundredfold` | — |
| `pages/admin/products.vue` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` | `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `pages/admin/reward-members.vue` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` | `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `pages/admin/settlements.vue` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` | `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `pages/admin/training-evidence.vue` | `??` | committed-elsewhere ⚠ | `lane/train-evidence-pack-ui` | `lane/fe-training-meals-surfaces` |
| `pages/admin/wolt-menu.vue` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` | `lane/modal-broken-two`, `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `pages/admin/workforce-publications.vue` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `pages/admin/workforce-roles.vue` | `??` | committed-elsewhere | `lane/wf-roles-ui` | — |
| `pages/admin/workforce-timesheets.vue` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `plugins/global-mixin.js` | ` M` | committed-elsewhere | `lane/price-crosscurrency` | — |
| `test/e2e/fixture/growth.js` | ` M` | committed-elsewhere ⚠ | `lane/L-JOURNEY-GROWTH` | `lane/fe-gr-exit-wire-the-mail`, `lane/fe-gr-withdraw-origin`, `lane/fe-growth-prefcentre`, `lane/fe-journeys`, `lane/fe-training-meals-surfaces` |
| `test/e2e/fixture/meals.js` | ` M` | committed-elsewhere ⚠ | `lane/fe-meals-statement-surface` | `lane/fe-journeys`, `lane/fe-meals-pretick-walked`, `lane/fe-training-meals-surfaces` |
| `test/e2e/fixture/training.js` | ` M` | committed-elsewhere ⚠ | `lane/train-evidence-pack-ui` | `lane/fe-journeys`, `lane/fe-training-meals-surfaces` |
| `test/e2e/fixture/workforce-publications.js` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `test/e2e/fixture/workforce-timesheets.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `test/e2e/journeys/admin-refusal-worker.spec.js` | ` M` | committed-elsewhere ⚠ | `lane/fe-admin-refusal-credential` | `lane/fe-journeys`, `lane/fe-training-meals-surfaces` |
| `test/e2e/journeys/growth-guest-lifecycle.spec.js` | `??` | committed-elsewhere | `refs/salvage/dangling-1890c9a3` | `lane/L-JOURNEY-GROWTH` |
| `test/e2e/journeys/growth-testsend-refusal.spec.js` | `??` | committed-elsewhere | `lane/L-JOURNEY-GROWTH`, `refs/salvage/dangling-1890c9a3` | — |
| `test/e2e/journeys/meals-statement-month.spec.js` | `??` | committed-elsewhere ⚠ | `lane/L-JOURNEY-PORT-HARDCODED` | `lane/fe-meals-statement-surface` |
| `test/e2e/journeys/training-course-to-evidence.spec.js` | ` M` | committed-elsewhere ⚠ | `lane/train-publish-unclickable` | `lane/fe-journeys`, `lane/fe-training-meals-surfaces` |
| `test/e2e/journeys/training-evidence-document.spec.js` | `??` | committed-elsewhere | `lane/train-evidence-pack-ui` | — |
| `test/e2e/journeys/workforce-publication-receipts.spec.js` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `test/e2e/journeys/workforce-role-catalogue.spec.js` | `??` | committed-elsewhere | `lane/wf-roles-ui` | — |
| `test/e2e/journeys/workforce-timesheet-export.spec.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `test/e2e/scripts/build-provenance-proof.js` | ` M` | committed-elsewhere | `L-WORLD-STAMP-WINDOWS` | — |
| `test/e2e/scripts/guard-proof.js` | ` M` | committed-elsewhere | `lane/L-JOURNEY-PROXY-BLINDSPOT` | — |
| `test/e2e/scripts/live-world-stamp-wiring-check.js` | `??` | committed-elsewhere | `L-WORLD-STAMP-WINDOWS` | — |
| `test/e2e/scripts/live-world.sh` | ` M` | committed-elsewhere ⚠ | `L-WORLD-STAMP-WINDOWS` | `lane/journey-teardown` |
| `test/e2e/support/artifact-store.js` | ` M` | committed-elsewhere | `L-WORLD-STAMP-WINDOWS` | — |
| `test/e2e/support/journey-assertions.js` | ` M` | committed-elsewhere | `refs/salvage/dangling-097c3c9e` | `lane/L-JOURNEY-PROXY-BLINDSPOT` |
| `test/e2e/support/journey.js` | ` M` | committed-elsewhere ⚠ | `lane/L-JOURNEY-PROXY-BLINDSPOT` | `lane/ev-journey-timebomb`, `lane/fe-journeys`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/journey-teardown` |
| `test/e2e/support/world-stamp.js` | ` M` | committed-elsewhere | `L-WORLD-STAMP-WINDOWS` | — |
| `test/feature-flags-page.test.js` | ` M` | committed-elsewhere ⚠ | `lane/train-readonly-visible` | `lane/meals-reachable-web` |
| `test/journey-artifact-store.test.js` | ` M` | committed-elsewhere ⚠ | `L-WORLD-STAMP-WINDOWS` | `lane/worktree-basename-pin` |
| `test/journey-assertions.test.js` | ` M` | committed-elsewhere | `lane/L-JOURNEY-PROXY-BLINDSPOT` | — |
| `test/margin-recipe-client.test.js` | ` M` | committed-elsewhere ⚠ | `lane/mrg-recipe-revise-ui` | `lane/margin-menu-margin-ui`, `lane/margin-recipes` |
| `test/margin-recipe-revise.test.js` | `??` | committed-elsewhere | `lane/mrg-recipe-revise-ui` | — |
| `test/margin-statements-page.test.js` | ` M` | committed-elsewhere ⚠ | `lane/mrg-coverage-unknown` | `lane/ev-stale-cause`, `lane/fe-events-margin-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/mrg-lag-visible`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `test/margin-waste.test.js` | ` M` | committed-elsewhere ⚠ | `lane/mrg-coverage-unknown` | `lane/coercion-write-paths`, `lane/ev-stale-cause`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `test/meals-statement-view.test.js` | `??` | committed-elsewhere | `lane/fe-meals-statement-surface` | — |
| `test/price-absence.test.js` | ` M` | committed-elsewhere ⚠ | `lane/price-cleanup-two` | `lane/offers-page-hundredfold`, `L-OFFER-PARTIAL-SUBTOTAL` **(moved on: lane/offers-page-hundredfold, L-OFFER-PARTIAL-SUBTOTAL)** |
| `test/price-bypass-legacy.test.js` | `??` | committed-elsewhere ⚠ | `candidate/fe-compose-2026-08-05`, `L-PRICE-BYPASS-FIVE` | `lane/offers-page-hundredfold`, `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-OFFER-PARTIAL-SUBTOTAL`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-NEGATED-ABSENCE`, `L-XZ-RESIDUAL-SITES` |
| `test/price-crosscurrency.test.js` | `??` | committed-elsewhere | `lane/price-crosscurrency` | — |
| `test/price-gate-shadow.test.js` | `??` | committed-elsewhere | `lane/L-PRICE-SHADOW-GUARD` | — |
| `test/workforce-publication-receipts.test.js` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `test/workforce-rates-timeline.test.js` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `lane/price-cleanup-two`, `L-OFFER-PARTIAL-SUBTOTAL` | — |
| `test/workforce-roles-page.test.js` | `??` | committed-elsewhere | `lane/wf-roles-ui` | — |
| `test/workforce-timesheet-client.test.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `test/workforce-timesheet-components.test.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `test/workforce-timesheet.test.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `test/world-stamp-windows.test.js` | `??` | committed-elsewhere | `L-WORLD-STAMP-WINDOWS` | — |
| `test/xz-negated-absence.test.js` | `??` | committed-elsewhere ⚠ | `L-XZ-NEGATED-ABSENCE` | `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-RESIDUAL-SITES` **(moved on: L-CHECK-DISCOUNT-SUM-COUPLED, L-CHECK-LINEAMOUNT-UNGATED-SUM, L-RECEIPT-DISCOUNT-ROW-DROPPED, L-XZ-RESIDUAL-SITES)** |
| `utils/cross-currency.js` | `??` | committed-elsewhere | `lane/price-crosscurrency` | — |
| `utils/margin/money.js` | ` M` | committed-elsewhere ⚠ | `lane/price-crosscurrency` | `lane/margin-menu-margin-ui` |
| `utils/margin/recipe-client.js` | ` M` | committed-elsewhere ⚠ | `lane/mrg-recipe-revise-ui` | `lane/margin-menu-margin-ui`, `lane/margin-recipes` |
| `utils/margin/statement-view.js` | ` M` | committed-elsewhere ⚠ | `lane/mrg-coverage-unknown` | `lane/ev-stale-cause`, `lane/fe-events-margin-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `utils/meals/statement-client.js` | `??` | committed-elsewhere | `lane/fe-meals-statement-surface` | — |
| `utils/meals/statement-view.js` | `??` | committed-elsewhere | `lane/fe-meals-statement-surface` | — |
| `utils/price.js` | ` M` | committed-elsewhere ⚠ | `L-XZ-NEGATED-ABSENCE` | `lane/offers-page-hundredfold`, `L-CHECK-DISCOUNT-SUM-COUPLED`, `L-CHECK-LINEAMOUNT-UNGATED-SUM`, `L-OFFER-PARTIAL-SUBTOTAL`, `L-PRICE-BYPASS-FIVE`, `L-RECEIPT-DISCOUNT-ROW-DROPPED`, `L-XZ-RESIDUAL-SITES` **(moved on: L-CHECK-DISCOUNT-SUM-COUPLED, L-CHECK-LINEAMOUNT-UNGATED-SUM, L-RECEIPT-DISCOUNT-ROW-DROPPED, L-XZ-RESIDUAL-SITES)** |
| `utils/training/evidence.js` | `??` | committed-elsewhere ⚠ | `lane/train-evidence-pack-ui` | `lane/fe-training-meals-surfaces` |
| `utils/training/training-client.js` | ` M` | committed-elsewhere ⚠ | `lane/train-evidence-pack-ui` | `lane/fe-training-meals-surfaces`, `lane/training-admin` |
| `utils/workforce-rates/rate-timeline.js` | ` M` | committed-elsewhere ⚠ | `lane/offers-page-hundredfold`, `lane/price-cleanup-two`, `L-OFFER-PARTIAL-SUBTOTAL` | — |
| `utils/workforce/publication-receipts.js` | `??` | committed-elsewhere | `lane/wf-pubhist` | — |
| `utils/workforce/roster-client.js` | ` M` | committed-elsewhere ⚠ | `lane/wf-roles-ui` | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-bootstrap`, `lane/fe-wf-contact-imported`, `lane/fe-wf-invite-list-revoke`, `lane/fe-wf-link-deadend`, `lane/fe-wf-onboard`, `lane/fe-wf-oplink`, `lane/fe-wf-self`, `lane/journey-workforce`, `lane/wf-adjust-address`, `lane/workforce-roster` |
| `utils/workforce/schedule-client.js` | ` M` | committed-elsewhere | `lane/wf-pubhist` | — |
| `utils/workforce/timesheet-client.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `utils/workforce/timesheet.js` | `??` | committed-elsewhere | `lane/wf-timesheet-ui` | — |
| `artifacts/journeys/workforce-invitation-onboarding.playwright.json` | ` M` | live-lane-work | `lane/wf-roles-ui (re-ran the journey; did NOT commit the rewrite)` | — |
| `artifacts/journeys/workforce-invitation-onboarding/fixture/01-the-roster-before-an-invitation.png` | ` M` | live-lane-work | `lane/wf-roles-ui (re-ran the journey; did NOT commit the rewrite)` | — |
| `artifacts/journeys/workforce-invitation-onboarding/fixture/02-the-invitation-code-shown-once.png` | ` M` | live-lane-work | `lane/wf-roles-ui (re-ran the journey; did NOT commit the rewrite)` | — |
| `artifacts/journeys/workforce-invitation-onboarding/fixture/07-the-roster-after-the-claim.png` | ` M` | live-lane-work | `lane/wf-roles-ui (re-ran the journey; did NOT commit the rewrite)` | — |
| `components/admin/pos/ClockScreen.vue` | `??` | live-lane-work ⚠ | lanes/L-WF-PUNCH-UI (lane dir; NO branch) | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `components/admin/pos/PosShell.vue` | ` M` | live-lane-work ⚠ | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, +7 orphan lines | — |
| `components/admin/pos/PosTopBar.vue` | ` M` | live-lane-work ⚠ | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, +30 orphan lines | — |
| `components/admin/workforce/WorkforceDeliveryGroup.vue` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `components/admin/workforce/WorkforceDeliveryPanel.vue` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `components/organisms/AdminPageHeader.vue` | ` M` | live-lane-work ⚠ | `lane/fe-meals-statement-surface`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`, `lane/wf-roles-ui`, +16 orphan lines | `lane/fe-wf-self`, `lane/menu-allergen-matrix`, `lane/workforce-roster` |
| `pages/admin/workforce-delivery.vue` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `pages/admin/workforce-schedule.vue` | ` M` | live-lane-work ⚠ | `lane/fe-wf-onboard`, `lane/fe-wf-self` | — |
| `pages/preferences/communications.vue` | ` M` | live-lane-work | `lane/fe-gr-withdraw-origin` | — |
| `scripts/drift-demo/demo.sh` | `??` | live-lane-work | lanes/L-GUARD-DEMO (lane dir; NO branch) | — |
| `scripts/worldstamp` | `??` | live-lane-work | lanes/L-GUARD-W0 (lane dir; NO branch) | — |
| `test/admin-nav-access.test.js` | ` M` | live-lane-work ⚠ | `lane/fe-meals-statement-surface`, `lane/fe-training-meals-surfaces`, `lane/train-evidence-pack-ui`, `lane/wf-pubhist`, `lane/wf-roles-ui`, +6 orphan lines | `lane/fe-wf-self`, `lane/menu-allergen-matrix` |
| `test/e2e/fixture/api-server.js` | ` M` | live-lane-work ⚠ | `lane/L-JOURNEY-GROWTH`, `lane/ev-stale-cause`, `lane/fe-events-margin-surfaces`, `lane/fe-gr-exit-wire-the-mail`, `lane/fe-gr-withdraw-origin`, `lane/fe-growth-prefcentre`, `lane/fe-journeys`, `lane/fe-pos-clock`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-invite-list-revoke`, `lane/fe-wf-link-deadend`, `lane/fe-wf-onboard`, `lane/fe-wf-oplink`, `lane/fe-wf-self`, `lane/journey-teardown`, `lane/journey-workforce`, `lane/menu-allergen-matrix`, `lane/modal-broken-two`, `lane/print-host`, `lane/statute-evidence-world`, `lane/statute-honesty`, `lane/train-evidence-pack-ui`, `lane/wf-kodeoversikt-ui`, `lane/wf-pubhist`, `lane/wf-roles-ui`, +61 orphan lines | — |
| `test/e2e/fixture/workforce-delivery.js` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `test/e2e/fixture/workforce-punch.js` | `??` | live-lane-work | lanes/L-WF-PUNCH-UI (lane dir; NO branch) | — |
| `test/e2e/fixture/world.js` | ` M` | live-lane-work ⚠ | `lane/ev-stale-cause`, `lane/fe-gr-withdraw-origin`, `lane/fe-growth-prefcentre`, `lane/fe-journeys`, `lane/fe-pos-clock`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-invite-list-revoke`, `lane/fe-wf-link-deadend`, `lane/fe-wf-onboard`, `lane/fe-wf-oplink`, `lane/fe-wf-self`, `lane/menu-allergen-matrix`, `lane/modal-broken-two`, `lane/print-host`, `lane/statute-evidence-world`, `lane/statute-honesty`, `lane/wf-kodeoversikt-ui`, `lane/wf-roles-ui`, +26 orphan lines | — |
| `test/e2e/journeys/workforce-delivery-failures.spec.js` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `test/e2e/journeys/workforce-pos-punch.spec.js` | `??` | live-lane-work | lanes/L-WF-PUNCH-UI (lane dir; NO branch) | — |
| `test/workforce-delivery-failures.test.js` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `test/workforce-pos-clock.test.js` | `??` | live-lane-work | lanes/L-WF-PUNCH-UI (lane dir; NO branch) | — |
| `translations/de.ts` | ` M` | live-lane-work ⚠ | `lane/fe-meals-statement-surface`, `lane/fe-training-meals-surfaces`, `lane/mrg-coverage-unknown`, `lane/mrg-recipe-revise-ui`, `lane/train-evidence-pack-ui`, `lane/train-readonly-visible`, `lane/wf-pubhist`, `lane/wf-roles-ui`, +69 orphan lines | `lane/coercion-write-paths`, `lane/ev-stale-cause`, `lane/events-admin`, `lane/fe-events-margin-surfaces`, `lane/fe-growth-suppressed-key`, `lane/fe-meals-claim-receipt`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/fe-meals-reconcile-ui`, `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-bootstrap`, `lane/fe-wf-contact-imported`, `lane/fe-wf-correction-path`, `lane/fe-wf-invite-list-revoke`, `lane/fe-wf-link-deadend`, `lane/fe-wf-onboard`, `lane/fe-wf-oplink`, `lane/fe-wf-self`, `lane/growth-admin`, `lane/journey-workforce`, `lane/margin-menu-margin-ui`, `lane/margin-recipes`, `lane/meals-admin`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui`, `lane/meals-reachable-web`, `lane/menu-allergen-matrix`, `lane/mrg-lag-visible`, `lane/mrg-waste-frontend`, `lane/statute-evidence-world`, `lane/statute-honesty`, `lane/training-admin`, `lane/wf-adjust-address`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`, `lane/workforce-roster`, `L-CHECK-LINEAMOUNT-UNGATED-SUM` |
| `translations/en.ts` | ` M` | live-lane-work ⚠ | `lane/fe-meals-statement-surface`, `lane/fe-training-meals-surfaces`, `lane/mrg-coverage-unknown`, `lane/mrg-recipe-revise-ui`, `lane/train-evidence-pack-ui`, `lane/train-readonly-visible`, `lane/wf-pubhist`, `lane/wf-roles-ui`, +69 orphan lines | `lane/coercion-write-paths`, `lane/ev-stale-cause`, `lane/events-admin`, `lane/fe-events-margin-surfaces`, `lane/fe-growth-suppressed-key`, `lane/fe-meals-claim-receipt`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/fe-meals-reconcile-ui`, `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-bootstrap`, `lane/fe-wf-contact-imported`, `lane/fe-wf-correction-path`, `lane/fe-wf-invite-list-revoke`, `lane/fe-wf-link-deadend`, `lane/fe-wf-onboard`, `lane/fe-wf-oplink`, `lane/fe-wf-self`, `lane/growth-admin`, `lane/journey-workforce`, `lane/margin-menu-margin-ui`, `lane/margin-recipes`, `lane/meals-admin`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui`, `lane/meals-reachable-web`, `lane/menu-allergen-matrix`, `lane/mrg-lag-visible`, `lane/mrg-waste-frontend`, `lane/statute-evidence-world`, `lane/statute-honesty`, `lane/training-admin`, `lane/wf-adjust-address`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`, `lane/workforce-roster`, `L-CHECK-LINEAMOUNT-UNGATED-SUM` |
| `translations/no.ts` | ` M` | live-lane-work ⚠ | `lane/fe-meals-statement-surface`, `lane/fe-pos-clock`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink`, `lane/mrg-coverage-unknown`, `lane/mrg-recipe-revise-ui`, `lane/train-evidence-pack-ui`, `lane/train-readonly-visible`, `lane/wf-pubhist`, `lane/wf-roles-ui`, +72 orphan lines | `lane/coercion-write-paths`, `lane/ev-stale-cause`, `lane/events-admin`, `lane/fe-events-margin-surfaces`, `lane/fe-growth-suppressed-key`, `lane/fe-meals-claim-receipt`, `lane/fe-meals-journey-locator`, `lane/fe-meals-pretick-walked`, `lane/fe-meals-reconcile-ui`, `lane/fe-wf-bootstrap`, `lane/fe-wf-contact-imported`, `lane/fe-wf-correction-path`, `lane/fe-wf-invite-list-revoke`, `lane/fe-wf-onboard`, `lane/fe-wf-self`, `lane/growth-admin`, `lane/journey-workforce`, `lane/margin-menu-margin-ui`, `lane/margin-recipes`, `lane/meals-admin`, `lane/meals-enrol-pretick`, `lane/meals-enrol-ui`, `lane/meals-reachable-web`, `lane/menu-allergen-matrix`, `lane/mrg-lag-visible`, `lane/mrg-waste-frontend`, `lane/statute-evidence-world`, `lane/statute-honesty`, `lane/training-admin`, `lane/wf-adjust-address`, `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`, `lane/workforce-roster`, `L-CHECK-LINEAMOUNT-UNGATED-SUM` |
| `utils/growth/growth-guest-client.js` | ` M` | live-lane-work | `lane/fe-gr-withdraw-origin` | — |
| `utils/workforce-rates/rates-client.js` | ` M` | live-lane-work ⚠ | `lane/wf-idreg`, `lane/wf-kodeoversikt-ui` | — |
| `utils/workforce/api-client.js` | ` M` | live-lane-work ⚠ | `lane/wf-idreg`, `lane/wf-kodeoversikt-ui`, `lane/workforce-roster`, +16 orphan lines | — |
| `utils/workforce/delivery-failures.js` | `??` | live-lane-work | lanes/L-WF-FAILURES-SURFACE (lane dir; NO branch) | — |
| `utils/workforce/pos-clock-client.js` | `??` | live-lane-work ⚠ | lanes/L-WF-PUNCH-UI (lane dir; NO branch) | `lane/fe-pos-clock`, `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `utils/workforce/pos-clock-state.js` | `??` | live-lane-work | lanes/L-WF-PUNCH-UI (lane dir; NO branch) | — |
| `world.config` | `??` | live-lane-work | lanes/L-GUARD-W0 (lane dir; NO branch) | — |

---

Generated by `census.py` → `attribute.py` → `perline.py` → `report.py` → `final.py` → `emit.py` in
this directory; intermediate data in `census.json`, `attribution.json`, `perline.json`, `rows.json`.
Re-runnable, read-only, and it re-derives the `utils/price.js` verdict from scratch each time.

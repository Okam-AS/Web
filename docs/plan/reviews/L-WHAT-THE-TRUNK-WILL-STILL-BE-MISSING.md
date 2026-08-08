# L-WHAT-THE-TRUNK-WILL-STILL-BE-MISSING — every local ref, checked against what the two landings carry

Actor: agent:L-WHAT-THE-TRUNK-WILL-STILL-BE-MISSING · brief 59a1aa6c · measured 2026-08-06 ~19:50–20:05 local · read-only in both repositories (no ref created, moved or deleted; no suite; no container touched).

## The denominator — what the two landings will merge

**Frontend** (`L-LAND-THE-FRONTEND-ON-THE-TRUNK`, running): during this measurement the landing **reached the trunk locally** — `feature/restaurant-modules` now equals `integration/fe-land-2026-08-06` @ `ff497c0` (19:45, unpushed). What it carries: the old trunk `e34977ace`, the owner-snapshot's **code half** (`11be859`, byte-identical to the code in `wip/session-2026-08-06-all-work` — the split leaves only `artifacts/`, `lanes/`, `docs/plan/`, `.claude/` behind, 2,297 files ≈1.75M lines of evidence), the three sign-in lanes (`loginmodal-mounted-once` + `login-modal-reports-a-failed-send` + `loginmodal-success-is-silent`), the AdminPage-emit and sign-out commits, a resume-test fix, a lane record — and the **`core` submodule pointer moved to `9626a56`** (verified via `ls-tree`). All frontend numbers below are measured against this landed tip.

**Backend** (`L-LAND-THE-BACKEND-ON-THE-TRUNK`, open — nothing has merged): named inputs are trunk `8e2b57de8` (unmoved since 2026-08-04 12:00), `integration/mig-stack-merge` `7f8945dc6` (+38), `lane/backend-patches-composed` `2ba9229fa` (+4, fourth evidence-only), `lane/growthaudit-migration` `93a52938e` (sits on the stack tip, composes with no rebase — sibling-verified), `lane/planned-minutes-honour-lineage` `589056dfb` (a `needs` of the landing). Its exit also says "**and every landed backend lane**" — those lanes are on **no landing input today**; the table below is that enumeration.

## Method

- **Reachability**: `git rev-list <ref> --not <denominator>` — the `unique` column. 0 = every commit already reachable.
- **Patch-equivalence**: `git patch-id --stable` of every unique non-merge commit, compared against the patch-ids of every non-merge commit the denominator carries since the June bases (FE 103, BE 392 ids) — the `patch-eq` column (`matched/nonmerge`). Catches rebased/re-committed content; **cannot** see content swallowed by one giant snapshot commit.
- **Tree-equality probe** (`tree-eq`, only for rows not carried): the files touched by the ref's unique commits, compared blob-for-blob at the ref tip vs the landing tree (FE: the landed trunk; BE: the patched tip `2ba9229fa`) — `n/m` = n of m files byte-identical. `m/m` means the landing tree already holds this ref's files exactly (content likely carried through the snapshot); `0/m` means none match. Blank = >400 files or not probed.
- **excl**: commits reachable from this ref and **no other local ref** — what disappears if only this ref is deleted.
- Content checks were done on **objects and trees at named revisions**, never as history greps (the measured `git grep`-at-a-revision trap in the brief).
- **The estate moved while being measured.** Observed mid-measurement: the FE landing merged to the trunk (`ff497c0`, 19:45), `lane/trigger-declarations-refreshed` committed its seven declarations (`58f5973`, 19:48), `lane/train-demo-seed-redo` was created (`2cc5487c3`, 19:41). The sweep was re-run after these; anything that moved after ~19:55 is outside this snapshot.

## Verdict vocabulary

| verdict | meaning |
|---|---|
| landing-input | a ref the landing lane names as an input |
| carried | every commit reachable from the denominator |
| carried-by-content | unique commits exist but each is patch-equivalent to carried content |
| carried-conditionally | reachable **only** through `lane/planned-minutes-honour-lineage`'s rescue ancestry — a cherry-pick landing of that lane strands it |
| awaits-landing | a completed (built-unverified/verified) lane's branch with unique work on **no landing input** — inside the landings' stated intent ("every landed lane") but nothing merged today carries it |
| in-flight-lane | a running lane's branch — not landed yet |
| open-lane | branch claimed by a lane still in state open |
| left-behind:no-ref-lane | work whose only copy is a worktree-agent ref no lane claims |
| left-behind:rescue | a wip/rescue snapshot no landing carries |
| excluded-by-design | one of the eleven `F-POS-TENDER-WIRE-REINTRODUCES-TWO` heads — must be retired unlanded or reduced first |
| superseded-composition / composition-artifact / process-artifact | compose candidates, family trees, record branches — plumbing, not lane work |
| historical | newest unique commit predates 2026-07-28 (stage0/W2/W3/swiss eras) |
| undetermined-stale / unclaimed | could **not** be classified — stated, not guessed |

## Summary

- Frontend (165 refs): landing-input 2, left-behind:no-ref-lane 10, awaits-landing 98, unclaimed 4, undetermined-stale 5, open-lane 3, left-behind:rescue 3, superseded-composition 1, process-artifact 1, carried-by-content 5, carried 31, historical 2
- Backend (389 refs): landing-input 5, in-flight-lane 1, awaits-landing 121, unclaimed 1, undetermined-stale 6, open-lane 5, left-behind:rescue 35, excluded-by-design 11, carried-conditionally 3, composition-artifact 1, process-artifact 2, carried-by-content 11, carried 134, historical 53

## The work that would be left behind — named

**A. On no ref a landing can see (only copies):**
1. **FE detached HEAD `bfa1992`** (worktree `wt-german-ids`): `L-GERMAN-IDENTIFIER-LABELS-2` returned **built** — five German identifier strings in `translations/de.ts`, a new `test/german-identifier-labels.test.js` (absent at the landed trunk), and the ReceiptModal optional-chaining rewrite. Needle `norwegisches Unternehmensregister`: **0 hits at the landed tip**. The only copy of a built lane's work is this detached HEAD.
2. **BE detached HEAD `66f19e23`** (worktree `wt-pendmodel`, today 17:08): `WebApi.Tests/Modules/ModelVersusChainDriftTests.cs`, 382 lines, parented **on the stack tip** `7f8945dc6`. On no ref, in no landing input.
3. **FE `worktree-agent-a1b2b1de4edcf769f` @ `94f06c7`** (today 17:44): Tripletex "a refused duplicate stops reading as a failure" — `pages/admin/tripletex.vue` + a 130-line test, parented on the pre-landing trunk tip. Only copy.
4. **FE `d7b5f3f`** (the same commit on 10 `worktree-agent-*` refs, 2026-08-04): Wolt Drive power-user setup page + Wolt-fee move; no plan lane claims it. Its backend counterpart `lane/wolt-sync-unregistered` is equally uncarried.

Cleared orphan candidates (checked, nothing lost): FE `cbb5a98` differs from `lane/jest-collects-lanes` only by 20 evidence lines; FE `7c91177` patch-carried; FE `17b5cc3` files present and newer at the tip; BE `ec5d0062b` patch-carried; BE `ddf41c61` superseded (its test file exists at the patched tip, services evolved past it).

**B. The big bucket — completed lanes on no landing input:** FE **98** and BE **121** `awaits-landing` refs (full list in the tables). The FE landing carried the snapshot code + three sign-in lanes and **nothing else**; the BE landing has not begun. If the landings stop at their named inputs, every one of these stays behind. The `tree-eq` probe splits them: **FE — 1 fully present at the landed tree (`lane/price-cleanup-two`, 4/4, likely via the snapshot), 62 with zero matching files (genuinely absent), 35 partial. BE — none fully present, 112 with zero matching files, 8 partial, 1 unprobed (`lane/compose-and-run-the-stack`, >400 files).**

**C. In flight, must not be forgotten:** `lane/trigger-declarations-refreshed` @ `58f5973` — the seven re-authored trigger declarations the backend landing's step 2 requires; committed during this measurement, on no landing input. And the `wt-pendmodel` test (A.2).

**D. Two-base hazards — a plain merge drags foreign snapshots:**
- `lane/planned-minutes-honour-lineage` (landing input #4): merge drags `e956337ed` (worktree rescue: `artifacts/world/WORLD.json` + `world.config`) and `5243c06a7` — **patch-identical** (patch-id `72bfbd51`) to composed patch `ea66353f9`, i.e. a duplicate application. Only `589056dfb` is new work; land it by cherry-pick/rebase onto the patched tip.
- `lane/train-demo-seed-redo` (running): same rescue-chain ancestry.
- FE `lane/mrg-coverage-panel-says-absent`, `lane/mrg-recipe-transitions-pinned`, `lane/mrg-waste-panel-says-absent`: based on superseded `candidate/fe-compose-2026-08-05` (37 merges) — own deltas are 4/2/2 commits.
- FE composed-base cluster (`ack-receipt-survives-reload`, `collect-review-conditions`, `duplicate-key-guard`, `duplicate-key-in-the-build`, `lint-runnable`, `lint-runs-on-something`, `lint-two-real-defects`, `wf-acknowledge-receipt-visible`): each carries a ~36-merge composed base that is not on the trunk; see `excl` for their own work.

**E. Conditionally carried — strandable by the fix to D:** `lane/meals-grace-pins`, `wip/rescue-2026-08-06-open-shifts-lineage`, `wip/rescue-2026-08-06-OkamAPI-modules` are reachable **only** through planned-minutes' ancestry. If planned-minutes lands as a cherry-pick (as D recommends), all three become unreachable — `meals-grace-pins`' three expiry-sweep pins would then need their own landing decision.

**F. Excluded by design (11 BE refs):** `feature/restaurant-control-stage0`, `prep/meals-w3-landing`, `lane/meals-w3-fiscal`, `lane/a1-store-country`, `lane/a2-growth-flake`, `lane/a3-tx-gate`, `lane/a5-events-w4`, `lane/a6-meals-minors`, `lane/b1-training-w3`, `lane/b2-wf-exchange`, `lane/b3-wf-timesheets` — `F-POS-TENDER-WIRE-REINTRODUCES-TWO` requires them retired unlanded or reduced to the shared predicate first.

**G. Rescue snapshots:** 35 BE + 3 FE `wip/rescue-*` refs, each holding exactly **one** exclusive snapshot commit (the large `unique` counts on some are inherited pre-fork base history, not new work). Verified patch-equivalent and therefore safe: BE `wt-claims`, `wt-mut`, `wt-supp`, `wt-wire2`; FE `wt-fe4`, `wt-fe5`. The rest are uncarried snapshots of dirty worktrees. The **evidence half** of `wip/session-2026-08-06-all-work` (≈2,297 files) stays behind by design.

**H. Measurement/record branches the backend landing brief leans on:** `lane/compose-and-run-the-stack` is the **only** tree carrying stack × confirm-family plus the SQL-tier run record (587 executed / 565 green / 22 reds, baseline-proved pre-existing). If only stack+patches merge, that record and the family composition stay behind. `integration/confirm-family`'s members are partly inside the stack already; `lane/gr-deadline-statute` and `lane/gr-postmark-webhook` are not.

## Frontend: every local ref in Web-modules (165)

| ref | tip | unique | excl | patch-eq | tree-eq | newest | lane (state) | verdict | note |
|---|---|---|---|---|---|---|---|---|---|
| `feature/restaurant-modules` | ff497c07e2 | 0 |  | n/a |  |  | L-MODAL-LAND (verified) | **landing-input** | The frontend trunk, unmoved since 2026-08-04. |
| `integration/fe-land-2026-08-06` | ff497c07e2 | 0 |  | n/a |  |  | — | **landing-input** | The frontend landing branch itself (L-LAND-THE-FRONTEND-ON-THE-TRUNK, running): trunk + the snapshot's code half + the three sign-in lanes + AdminPage-emit + sign-out fix; advanced to ff497c0 (lane record) during this measurement. |
| `worktree-agent-a0b63b4f563fc2786` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Wolt Drive power-user setup page + Wolt-fee move (d7b5f3f, 2026-08-04), parented on a feature/POS-era commit; exists on 10 worktree-agent refs and nowhere else; no plan lane claims it; neither landing will carry it. |
| `worktree-agent-a14e83ac504f04840` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f as worktree-agent-a0b63b4f... (Wolt Drive setup page). See that row. |
| `worktree-agent-a16e52498eec930b0` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `worktree-agent-a1b2b1de4edcf769f` | 94f06c7eb9 | 0 |  | n/a |  |  | — | **left-behind:no-ref-lane** | TODAY'S work (94f06c7, 17:44): 'A refused duplicate stops reading as a failure' - pages/admin/tripletex.vue + a new 130-line test, parented directly on the trunk tip; exists on this worktree-agent ref only; no lane branch carries it; neither landing will carry it. |
| `worktree-agent-a4f24200017efedac` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `worktree-agent-a65db45f6ddd4ab5b` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `worktree-agent-aaaf61b6e803d820e` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `worktree-agent-aacb5251c46cd2751` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `worktree-agent-ab18757354501b772` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `worktree-agent-ae17b03b712ecf944` | d7b5f3f26e | 1 | 0 | 0/1 |  | 2026-08-04 | — | **left-behind:no-ref-lane** | Same commit d7b5f3f (Wolt Drive setup page). |
| `lane/L-JOURNEY-GROWTH` | ef2d6be46e | 2 | 2 | 0/2 | 4/25 | 2026-08-04 | L-JOURNEY-GROWTH (built-unverified) | **awaits-landing** |  |
| `lane/L-JOURNEY-PORT-HARDCODED` | 4772c1316a | 1 | 1 | 0/1 | 1/16 | 2026-08-04 | L-JOURNEY-PORT-HARDCODED (built-unverified) | **awaits-landing** |  |
| `lane/L-JOURNEY-PROXY-BLINDSPOT` | 6646fa5870 | 2 | 0 | 0/2 | 3/9 | 2026-08-04 | L-JOURNEY-PROXY-BLINDSPOT (verified) | **awaits-landing** |  |
| `lane/L-PRICE-SHADOW-GUARD` | a3666858d6 | 2 | 0 | 0/2 | 2/10 | 2026-08-04 | L-PRICE-SHADOW-GUARD (built-unverified) | **awaits-landing** |  |
| `lane/ack-receipt-survives-reload` | ac6ed72168 | 108 | 3 | 0/72 | 56/309 | 2026-08-06 | L-ACK-RECEIPT-SURVIVES-A-RELOAD (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges that is NOT on any landing input; its exclusive commits are the lane's own work. A plain merge drags the whole composed base. |
| `lane/artifact-names-its-locale` | adde9364ee | 2 | 1 | 0/2 | 0/12 | 2026-08-05 | L-ARTIFACT-NAMES-ITS-LOCALE (built-unverified) | **awaits-landing** |  |
| `lane/artifact-names-its-module-tree` | c3024b8a8a | 3 | 3 | 0/3 | 1/9 | 2026-08-05 | L-ARTIFACT-NAMES-ITS-MODULE-TREE (built-unverified) | **awaits-landing** |  |
| `lane/canonical-slot-survives-a-rerun` | f00d0400bc | 1 | 1 | 0/1 | 3/18 | 2026-08-05 | L-CANONICAL-SLOT-SURVIVES-A-RERUN (built-unverified) | **awaits-landing** |  |
| `lane/check-discount-sum-coupled` | c8f26d5248 | 4 | 0 | 0/4 | 7/31 | 2026-08-05 | L-CHECK-DISCOUNT-SUM-COUPLED (built-unverified) | **awaits-landing** |  |
| `lane/check-lineamount-ungated-sum` | c32cda3cbc | 6 | 1 | 0/6 | 7/48 | 2026-08-05 | L-CHECK-LINEAMOUNT-UNGATED-SUM (built-unverified) | **awaits-landing** |  |
| `lane/clock-client-reads-the-wire` | 0c6bca501b | 6 | 6 | 0/6 | 20/33 | 2026-08-05 | L-CLOCK-CLIENT-READS-THE-WIRE (built-unverified) | **awaits-landing** |  |
| `lane/coercion-write-paths` | 4351f8f7eb | 1 | 0 | 0/1 | 0/9 | 2026-08-04 | L-COERCION-WRITE-PATHS (built-unverified) | **awaits-landing** |  |
| `lane/collapse-the-two-hook-sweeps` | 542ee15c7a | 3 | 1 | 0/3 | 0/24 | 2026-08-05 | L-COLLAPSE-THE-TWO-HOOK-SWEEPS (built-unverified) | **awaits-landing** |  |
| `lane/collect-review-conditions` | 808d509582 | 104 | 1 | 0/68 | 54/288 | 2026-08-05 | L-COLLECT-REVIEW-CONDITIONS (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/collected-paths` | 6f03b18748 | 1 | 0 | 0/1 | 0/13 | 2026-08-05 | L-COLLECTED-PATHS (built-unverified) | **awaits-landing** |  |
| `lane/consent-reason-vocabulary` | 038612f8e1 | 4 | 0 | 0/4 | 0/5 | 2026-08-05 | L-CONSENT-REASON-VOCABULARY (built-unverified) | **awaits-landing** |  |
| `lane/duplicate-key-guard` | cb2cee6f6a | 104 | 1 | 0/68 | 54/289 | 2026-08-05 | L-DUPLICATE-KEY-GUARD (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/duplicate-key-in-the-build` | b4300b4137 | 104 | 1 | 0/68 | 55/303 | 2026-08-05 | L-DUPLICATE-KEY-IN-THE-BUILD (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/ev-guestlink-one-composer` | 7f309951b3 | 1 | 0 | 0/1 | 0/1 | 2026-08-04 | L-EV-GUESTLINK-ONE-COMPOSER (built-unverified) | **awaits-landing** |  |
| `lane/ev-journey-timebomb` | b7a9f389bd | 1 | 0 | 0/1 | 0/12 | 2026-08-04 | L-EV-JOURNEY-TIMEBOMB (built-unverified) | **awaits-landing** |  |
| `lane/ev-stale-cause` | 818c48a909 | 5 | 2 | 0/4 | 0/34 | 2026-08-01 | L-EV-STALE-CAUSE (built-unverified) | **awaits-landing** |  |
| `lane/exit-instrument-census` | 778482bab8 | 1 | 0 | 0/1 | 0/3 | 2026-08-04 | L-EXIT-INSTRUMENT-CENSUS (built-unverified) | **awaits-landing** |  |
| `lane/fe-ci` | 36ce9ae0ee | 1 | 0 | 0/1 | 0/2 | 2026-07-31 | L-FE-CI (built-unverified) | **awaits-landing** |  |
| `lane/fe-ev-inquiry-gate` | f7695bcbfa | 1 | 0 | 0/1 | 0/2 | 2026-08-01 | L-EV-INQUIRY-GATE (built-unverified) | **awaits-landing** |  |
| `lane/fe-gr-exit-wire-the-mail` | 814f04d608 | 2 | 2 | 0/2 | 0/12 | 2026-08-04 | L-GR-EXIT-WIRE-THE-MAIL (built-unverified) | **awaits-landing** |  |
| `lane/fe-gr-withdraw-origin` | 80493321cb | 2 | 0 | 0/2 | 0/8 | 2026-08-03 | L-GR-WITHDRAW-ORIGIN (built-unverified) | **awaits-landing** |  |
| `lane/fe-growth-prefcentre` | 7a8b0d3a0f | 1 | 0 | 0/1 | 0/5 | 2026-08-03 | L-GR-WITHDRAW-ORIGIN (built-unverified) | **awaits-landing** |  |
| `lane/fe-growth-suppressed-key` | 775d45e2fe | 4 | 1 | 0/4 | 0/10 | 2026-08-05 | L-GROWTH-SUPPRESSED-ERROR-KEY (built-unverified) | **awaits-landing** |  |
| `lane/fe-journeys` | de0d66b947 | 3 | 0 | 0/3 | 3/22 | 2026-07-31 | L-FE-JOURNEYS-MERGE (built-unverified) | **awaits-landing** |  |
| `lane/fe-meals-claim-receipt` | d833d19714 | 1 | 0 | 0/1 | 0/8 | 2026-08-04 | L-MEALS-CLAIM-RECEIPT (built-unverified) | **awaits-landing** |  |
| `lane/fe-meals-docsync` | 7ac2f929b9 | 1 | 1 | 0/1 | 0/4 | 2026-08-04 | L-MEALS-DOCSYNC (built-unverified) | **awaits-landing** |  |
| `lane/fe-meals-journey-locator` | d320105f28 | 3 | 0 | 0/3 | 0/19 | 2026-08-05 | L-MEALS-ENROL-JOURNEY-LOCATOR (built-unverified) | **awaits-landing** |  |
| `lane/fe-meals-pretick-walked` | 9fbed8069a | 4 | 1 | 0/4 | 0/20 | 2026-08-05 | L-MEALS-MEMBERS-READ-LAND-CHECK (built-unverified) | **awaits-landing** |  |
| `lane/fe-meals-reconcile-ui` | e0729488ab | 2 | 0 | 0/2 | 0/16 | 2026-08-04 | L-MEALS-RECONCILE-UI (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-blind-bind-name` | c67df92a27 | 4 | 0 | 0/3 | 0/25 | 2026-08-04 | L-WF-BLIND-BIND-NAME (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-bootstrap` | 9264904d10 | 1 | 1 | 0/1 | 0/6 | 2026-08-03 | L-WF-BOOTSTRAP (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-contact-imported` | 3583b9f1b1 | 2 | 0 | 0/2 | 0/7 | 2026-08-04 | L-WF-CONTACT-IMPORTED (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-correction-path` | b4dd5282ac | 2 | 2 | 0/2 | 0/8 | 2026-08-04 | L-WF-CORRECTION-PATH (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-invite-list-revoke` | e8d69fc3ce | 1 | 1 | 0/1 | 0/23 | 2026-08-04 | L-WF-INVITE-LIST-REVOKE (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-link-deadend` | bed932e34e | 5 | 1 | 0/4 | 0/25 | 2026-08-04 | L-WF-LINK-DEADEND (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-onboard` | 9ec1100dbc | 1 | 0 | 0/1 | 10/19 | 2026-07-31 | L-FE-WF-ONBOARD-WALK (built-unverified) | **awaits-landing** |  |
| `lane/fe-wf-oplink` | 3e811b222d | 3 | 0 | 0/2 | 0/24 | 2026-08-01 | L-WF-OPLINK (built-unverified) | **awaits-landing** |  |
| `lane/fixture-divergence-receipt` | 0dbec34b36 | 1 | 1 | 0/1 | 0/1 | 2026-08-05 | L-FIXTURE-DIVERGENCE-RECEIPT (built-unverified) | **awaits-landing** |  |
| `lane/fixture-flag-store` | d1c4b26272 | 1 | 1 | 0/1 | 0/7 | 2026-08-05 | L-FIXTURE-FLAG-STORE (built-unverified) | **awaits-landing** |  |
| `lane/fixture-rendered-values` | 038612f8e1 | 4 | 0 | 0/4 | 0/5 | 2026-08-05 | L-FIXTURE-RENDERED-VALUES-FIX (built-unverified) | **awaits-landing** |  |
| `lane/fixture-suppressed-refusal` | 3d20451152 | 3 | 0 | 0/3 | 0/4 | 2026-08-05 | L-FIXTURE-SUPPRESSED-REFUSAL (built-unverified) | **awaits-landing** |  |
| `lane/fixture-titles-follow-the-flags` | ccb847de2e | 1 | 1 | 0/1 | 0/9 | 2026-08-05 | L-FIXTURE-TITLES-FOLLOW-THE-FLAGS (built-unverified) | **awaits-landing** |  |
| `lane/fixture-values-are-enum-members` | 1a88c244bb | 1 | 1 | 0/1 | 0/13 | 2026-08-05 | L-FIXTURE-VALUES-ARE-ENUM-MEMBERS (built-unverified) | **awaits-landing** |  |
| `lane/guard-repair-lands` | 7030c00122 | 1 | 0 | 0/1 | 0/9 | 2026-08-05 | L-GUARD-REPAIR-LANDS (built-unverified) | **awaits-landing** |  |
| `lane/jest-collects-lanes` | 82127eb196 | 1 | 0 | 0/1 | 1/2 | 2026-08-05 | L-JEST-COLLECTS-LANES (built-unverified) | **awaits-landing** |  |
| `lane/journey-teardown` | b8ba80302d | 4 | 3 | 0/3 | 0/24 | 2026-08-04 | L-JOURNEY-TEARDOWN (verified) | **awaits-landing** |  |
| `lane/journey-workforce` | eb8f41217d | 4 | 0 | 0/4 | 0/32 | 2026-08-04 | L-JOURNEY-WORKFORCE (built-unverified) | **awaits-landing** |  |
| `lane/lint-runnable` | 8ad3358e43 | 104 | 0 | 0/68 | 54/289 | 2026-08-05 | L-LINT-RUNNABLE (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/lint-runs-on-something` | f9a777f0b6 | 104 | 1 | 0/68 | 54/297 | 2026-08-05 | L-LINT-RUNS-ON-SOMETHING (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/lint-two-real-defects` | aec051a3ee | 105 | 1 | 0/69 | 56/291 | 2026-08-05 | L-LINT-TWO-REAL-DEFECTS (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/meals-enrol-pretick` | 2e3f39d144 | 2 | 0 | 0/2 | 0/18 | 2026-08-04 | L-MEALS-ENROL-PRETICK (built-unverified) | **awaits-landing** |  |
| `lane/meals-enrol-ui` | 802041a86a | 1 | 0 | 0/1 | 0/12 | 2026-08-04 | L-MEALS-ENROL-UI (built-unverified) | **awaits-landing** |  |
| `lane/meals-reachable-web` | f65595d61e | 1 | 0 | 0/1 | 0/5 | 2026-08-03 | L-MEALS-REACHABLE (built-unverified) | **awaits-landing** |  |
| `lane/menu-allergen-matrix` | f1b0d1a912 | 1 | 1 | 0/1 | 0/12 | 2026-08-01 | L-MENU-ALLERGEN-MATRIX (built-unverified) | **awaits-landing** |  |
| `lane/mixin-labels-translate` | 627e34ae5e | 3 | 2 | 0/3 | 0/9 | 2026-08-05 | L-MIXIN-LABELS-TRANSLATE (built-unverified) | **awaits-landing** |  |
| `lane/modal-broken-two` | 63489442c1 | 1 | 1 | 0/1 | 0/17 | 2026-08-01 | L-MODAL-BROKEN-TWO (built-unverified) | **awaits-landing** |  |
| `lane/modules-preflight-fails-loud` | eb9d52e2c2 | 3 | 3 | 0/3 | 0/3 | 2026-08-05 | L-MODULES-PREFLIGHT-FAILS-LOUD (built-unverified) | **awaits-landing** |  |
| `lane/mrg-coverage-panel-says-absent` | bbe3d358b5 | 109 | 2 | 0/72 | 57/298 | 2026-08-05 | L-MRG-COVERAGE-PANEL-SAYS-ABSENT (built-unverified) | **awaits-landing** | BASED on candidate/fe-compose-2026-08-05 (own delta 4 commits): a plain merge drags the whole superseded candidate; needs cherry-pick or rebase by the landing lane. |
| `lane/mrg-coverage-unknown` | 455702764a | 2 | 0 | 0/2 | 1/10 | 2026-08-04 | L-MRG-COVERAGE-UNKNOWN (built-unverified) | **awaits-landing** |  |
| `lane/mrg-lag-visible` | b2aa72e81c | 1 | 0 | 0/1 | 0/7 | 2026-08-04 | L-MEALS-PROJECTION-LAG-VISIBLE (built-unverified) | **awaits-landing** |  |
| `lane/mrg-page-test-vacuous` | 9312294a22 | 2 | 1 | 0/2 | 0/5 | 2026-08-05 | L-MRG-PAGE-TEST-VACUOUS (built-unverified) | **awaits-landing** |  |
| `lane/mrg-recipe-revise-ui` | c429d515d6 | 2 | 0 | 0/2 | 4/10 | 2026-08-04 | L-MRG-REVISE-LAND (verified) | **awaits-landing** |  |
| `lane/mrg-recipe-transitions-pinned` | 9cca3dca61 | 107 | 2 | 0/70 | 55/291 | 2026-08-05 | L-MRG-RECIPE-TRANSITIONS-PINNED (built-unverified) | **awaits-landing** | BASED on candidate/fe-compose-2026-08-05 (own delta 2 commits): a plain merge drags the whole superseded candidate; needs cherry-pick or rebase by the landing lane. |
| `lane/mrg-revise-land` | 4a4aa4a152 | 1 | 0 | 0/1 | 0/5 | 2026-08-04 | L-MRG-REVISE-LAND (verified) | **awaits-landing** |  |
| `lane/mrg-waste-frontend` | 804fe2385b | 1 | 1 | 0/1 | 0/10 | 2026-08-04 | L-MRG-WASTE-FRONTEND (built-unverified) | **awaits-landing** |  |
| `lane/mrg-waste-panel-says-absent` | 633e637c41 | 107 | 0 | 0/70 | 56/293 | 2026-08-05 | L-MRG-WASTE-PANEL-SAYS-ABSENT (built-unverified) | **awaits-landing** | BASED on candidate/fe-compose-2026-08-05 (own delta 2 commits): a plain merge drags the whole superseded candidate; needs cherry-pick or rebase by the landing lane. |
| `lane/mrg-waste-receipts` | 87702ef047 | 1 | 0 | 0/1 | 0/10 | 2026-08-04 | L-MRG-WASTE-RECEIPTS (built-unverified) | **awaits-landing** |  |
| `lane/norwegian-only-keys-translate` | a8177f848a | 1 | 1 | 0/1 | 0/8 | 2026-08-05 | L-NORWEGIAN-ONLY-KEYS-TRANSLATE (built-unverified) | **awaits-landing** |  |
| `lane/offer-partial-subtotal` | 35e5cdd683 | 4 | 0 | 0/3 | 6/14 | 2026-08-04 | L-OFFER-PARTIAL-SUBTOTAL (built-unverified) | **awaits-landing** |  |
| `lane/offers-page-hundredfold` | 021d19c374 | 5 | 0 | 0/4 | 7/18 | 2026-08-04 | L-OFFERS-PAGE-HUNDREDFOLD (built-unverified) | **awaits-landing** |  |
| `lane/payment-label-ukjent` | 4465d02194 | 1 | 0 | 0/1 | 0/5 | 2026-08-05 | L-PAYMENT-LABEL-UKJENT (built-unverified) | **awaits-landing** |  |
| `lane/price-cleanup-two` | e41cdff2f8 | 1 | 0 | 0/1 | 4/4 | 2026-08-04 | L-PRICE-CLEANUP-TWO (built-unverified) | **awaits-landing** |  |
| `lane/price-crosscurrency` | 6f59ba3fde | 2 | 0 | 0/2 | 9/15 | 2026-08-04 | L-PRICE-CROSSCURRENCY (built-unverified) | **awaits-landing** |  |
| `lane/print-host` | 6e6acd06e1 | 1 | 0 | 0/1 | 0/14 | 2026-08-01 | L-PRINT-HOST (built-unverified) | **awaits-landing** |  |
| `lane/provenance-excludes-lane-evidence` | 607f1385ad | 2 | 1 | 0/2 | 0/13 | 2026-08-05 | L-PROVENANCE-EXCLUDES-LANE-EVIDENCE (built-unverified) | **awaits-landing** |  |
| `lane/receipt-discount-row-dropped` | 7a72c02c0a | 5 | 0 | 0/5 | 7/39 | 2026-08-05 | L-RECEIPT-DISCOUNT-ROW-DROPPED (built-unverified) | **awaits-landing** |  |
| `lane/statute-evidence-world` | 2ee3fd76f4 | 4 | 1 | 0/3 | 0/33 | 2026-08-01 | L-STATUTE-EVIDENCE-WORLD (built-unverified) | **awaits-landing** |  |
| `lane/statute-honesty` | f01886a086 | 3 | 0 | 0/2 | 0/29 | 2026-08-01 | L-STATUTE-HONESTY (built-unverified) | **awaits-landing** |  |
| `lane/tier-artifacts` | b1a28728b7 | 12 | 2 | 0/12 | 0/10 | 2026-08-06 | L-TIER-ARTIFACTS (built-unverified) | **awaits-landing** |  |
| `lane/train-evidence-pack-ui` | af0a4a131c | 1 | 0 | 0/1 | 6/12 | 2026-08-04 | L-TRAIN-EVIDENCE-PACK-UI (built-unverified) | **awaits-landing** |  |
| `lane/train-publish-unclickable` | 28548f9603 | 1 | 0 | 0/1 | 9/19 | 2026-08-04 | L-TRAIN-PUBLISH-UNCLICKABLE (built-unverified) | **awaits-landing** |  |
| `lane/train-readonly-visible` | abef9aacd2 | 1 | 1 | 0/1 | 2/17 | 2026-08-04 | L-TRAIN-READONLY-VISIBLE (built-unverified) | **awaits-landing** |  |
| `lane/vat-keys-monolingual` | 686e3c5f7b | 1 | 1 | 0/1 | 0/3 | 2026-08-05 | L-VAT-KEYS-MONOLINGUAL (built-unverified) | **awaits-landing** |  |
| `lane/vue-jest-upgrade-measured` | d1e1c38eb2 | 1 | 1 | 0/1 | 0/23 | 2026-08-05 | L-VUE-JEST-UPGRADE-MEASURED (built-unverified) | **awaits-landing** |  |
| `lane/vue3-shape-guard` | cffede38b7 | 2 | 0 | 0/2 | 0/14 | 2026-08-05 | L-VUE3-SHAPE-GUARD (built-unverified) | **awaits-landing** |  |
| `lane/wf-acknowledge-receipt-visible` | 02c7356812 | 105 | 0 | 0/69 | 56/298 | 2026-08-05 | L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE (built-unverified) | **awaits-landing** | Carries a composed base of ~36 lane merges not on any landing input; see excl column for its own work. |
| `lane/wf-adjust-address` | e9ba89e225 | 1 | 1 | 0/1 | 0/11 | 2026-08-03 | L-WF-ADJUST-ADDRESS (built-unverified) | **awaits-landing** |  |
| `lane/wf-idreg` | a649e080fe | 1 | 0 | 0/1 | 0/10 | 2026-08-01 | L-WF-IDREG (built-unverified) | **awaits-landing** |  |
| `lane/wf-kodeoversikt-ui` | 19ad0015ed | 5 | 0 | 0/5 | 0/16 | 2026-08-04 | L-WF-KODEOVERSIKT-UI (built-unverified) | **awaits-landing** |  |
| `lane/wf-pubhist` | 2d86446b74 | 1 | 1 | 0/1 | 9/18 | 2026-08-04 | L-WF-PUBHIST (built-unverified) | **awaits-landing** |  |
| `lane/wf-roles-ui` | ff21e488ea | 1 | 0 | 0/1 | 4/12 | 2026-08-04 | L-WF-ROLES-UI (built-unverified) | **awaits-landing** |  |
| `lane/wf-timesheet-ui` | 618efc8875 | 1 | 1 | 0/1 | 9/27 | 2026-08-04 | L-WF-TIMESHEET-UI (built-unverified) | **awaits-landing** |  |
| `lane/worktree-basename-pin` | 0cea96acc8 | 2 | 0 | 0/2 | 0/2 | 2026-08-04 | L-WORKTREE-BASENAME-PIN (built-unverified) | **awaits-landing** |  |
| `lane/fe-admin-refusal-credential` | 478ced7306 | 1 | 0 | 0/1 | 0/1 | 2026-08-04 | — | **unclaimed** | excl=0: every commit here is also on other refs; nothing exclusive is lost if those land. |
| `lane/fe-events-margin-surfaces` | e8b58ec166 | 2 | 2 | 0/2 | 0/23 | 2026-08-01 | — | **unclaimed** |  |
| `lane/fe-training-meals-surfaces` | 20693381f8 | 5 | 2 | 0/4 | 3/43 | 2026-08-01 | — | **unclaimed** |  |
| `lane/fe-wf-self` | 5886ba3014 | 3 | 2 | 0/2 | 8/38 | 2026-08-01 | — | **unclaimed** |  |
| `lane/events-admin` | 6790589e3b | 1 | 1 | 0/1 | 1/12 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/growth-admin` | f866024ae5 | 1 | 1 | 0/1 | 3/16 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/margin-recipes` | c3974fdbbc | 1 | 1 | 0/1 | 2/13 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/meals-admin` | 7890f69185 | 1 | 1 | 0/1 | 5/13 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/workforce-roster` | 319ec2534d | 1 | 1 | 0/1 | 5/15 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/fe-journey-meals` | f6294ddd71 | 2 | 0 | 0/2 | 0/15 | 2026-08-04 | L-JOURNEY-MEALS (open) | **open-lane** |  |
| `lane/fe-meals-statement-surface` | 9215d3856f | 1 | 0 | 0/1 | 6/14 | 2026-08-04 | L-MEALS-STATEMENT-SURFACE (open) | **open-lane** |  |
| `lane/fe-pos-clock` | 7c3a1e1f2d | 1 | 0 | 0/1 | 0/15 | 2026-08-01 | L-WF-STATUTORY-LAND (open) | **open-lane** |  |
| `wip/rescue-2026-08-06-wt-meals-enrol-pretick` | f368317a5c | 3 | 1 | 0/3 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-meals-enrol-ui` | ec30a7fbc7 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-mrglagvis` | 2a5f1ab9af | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `candidate/fe-compose-2026-08-05` | f40fdf36cf | 105 | 0 | 0/68 |  | 2026-08-05 | L-FIX-BRANCH-MANIFEST (built-unverified) | **superseded-composition** | Prior compose candidate (37 lane merges). The landing restarted from the trunk; every lane it merged is still its own ref. Not itself intended to land. Three mrg lanes are BASED on it - merging any of them drags the whole candidate. |
| `plan/docs-20260806` | 6c4305ea02 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **process-artifact** | Plan-hub docs snapshot (plan-lives-in-git); not product code; no landing carries it and none should. |
| `lane/margin-menu-margin-ui` | 36600c1fec | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `lane/training-admin` | 4727090d0b | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `wip/rescue-2026-08-06-wt-fe4` | 1383190fb3 | 1 | 1 | 1/1 |  | 2026-08-06 | — | **carried-by-content** |  |
| `wip/rescue-2026-08-06-wt-fe5` | bcbef1a088 | 1 | 1 | 1/1 |  | 2026-08-06 | — | **carried-by-content** |  |
| `wip/session-2026-08-06-all-work` | 0c1e4f97cb | 2 | 2 | 0/2 |  | 2026-08-06 | L-LAND-THE-FRONTEND-ON-THE-TRUNK (built-unverified) | **carried-by-content** | Owner-tree rescue snapshot. Its code half is byte-identical to tmp/wip-code-only @ 11be859 on the landing branch (diff touches only artifacts/, lanes/, docs/plan/, .claude/ - 2,297 files, ~1.75M lines of evidence stay behind by design). Also pins core submodule @ 9626a56, which the landing must carry with it. |
| `lane/L-A-MENU-WITHOUT-PICTURES-STILL-SELLS` | ff497c07e2 | 0 |  | n/a |  |  | L-A-MENU-WITHOUT-PICTURES-STILL-SELLS (running) | **carried** |  |
| `lane/admin-journey-wait-diagnoses` | ac77d25798 | 0 |  | n/a |  |  | L-ADMIN-JOURNEY-WAIT-DIAGNOSES (built-unverified) | **carried** |  |
| `lane/admin-nav-links` | 1180891994 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-margin-client` | 6b11a649ae | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-events-guest` | 2eb1222257 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-growth-guest` | d6c0b12522 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-growth-honesty` | a70cf04da2 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-margin-statement` | c1f34c4f67 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-margin-supplier` | fecf96149e | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-meals-claim` | a3f61009bc | 0 |  | n/a |  |  | L-MEALS-CLAIM-RECEIPT (built-unverified) | **carried** |  |
| `lane/fe-meals-write` | 8bc4155d25 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-playwright` | d6c4f4f78a | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-training-fixes` | fcf5a3e4e0 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-wf-inbox` | 4e5ad7e6c2 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-wf-personnel` | 3374a58163 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fe-wf-supplement-basis` | e215db0005 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/focustrap-teardown` | 8ac6f63648 | 0 |  | n/a |  |  | L-FOCUSTRAP-TEARDOWN (built-unverified) | **carried** |  |
| `lane/live-walk-events` | 40b4884b70 | 0 |  | n/a |  |  | L-LIVE-WALK-EVENTS (open) | **carried** |  |
| `lane/login-modal-reports-a-failed-send` | 1a33ed73bb | 0 |  | n/a |  |  | L-LOGIN-MODAL-REPORTS-A-FAILED-SEND (built-unverified) | **carried** |  |
| `lane/loginmodal-mounted-once` | 0f882422db | 0 |  | n/a |  |  | L-LOGINMODAL-MOUNTED-ONCE (built-unverified) | **carried** |  |
| `lane/loginmodal-success-is-silent` | fbcc03ae59 | 0 |  | n/a |  |  | L-LOGINMODAL-SUCCESS-IS-SILENT (built-unverified) | **carried** |  |
| `lane/margin-waste-surface-is-honest` | 1d272f19f9 | 0 |  | n/a |  |  | L-MARGIN-WASTE-SURFACE-IS-HONEST (built-unverified) | **carried** |  |
| `lane/meals-enrolment-has-a-button` | 8ac6f63648 | 0 |  | n/a |  |  | L-MEALS-ENROLMENT-HAS-A-BUTTON (built-unverified) | **carried** | Same tip as lane/focustrap-teardown (8ac6f63). |
| `lane/modal-scrolllock` | 178c89510a | 0 |  | n/a |  |  | L-MODAL-SCROLLLOCK (verified) | **carried** |  |
| `lane/modal-seven` | 839d377f86 | 0 |  | n/a |  |  | L-MODAL-LAND (verified) | **carried** |  |
| `lane/store-market-ui` | 3efa5d9efe | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/wf-invite-surface` | e34977aceb | 0 |  | n/a |  |  | L-WF-INVITE-SURFACE (retracted) | **carried** | Tip equals the trunk tip - the branch carries nothing. |
| `main` | e7896bc630 | 0 |  | n/a |  |  | — | **carried** |  |
| `swiss` | d64c56ae55 | 0 |  | n/a |  |  | — | **carried** |  |
| `tmp/wip-code-only` | 11be859314 | 0 |  | n/a |  |  | — | **carried** | The code half of the owner-tree snapshot; already merged into integration/fe-land-2026-08-06. |
| `worktree-agent-a2127f65723afed15` | 8ac6f63648 | 0 |  | n/a |  |  | — | **carried** |  |
| `feature/POS` | 016f29b048 | 1 | 1 | 0/1 |  | 2026-07-29 | L-COMPOSE-CENSUS (built-unverified) | **historical** | POS-era base branch the program forked from. |
| `feature/swiss` | f271b12b62 | 24 | 24 | 0/24 |  | 2026-07-06 | — | **historical** | Swiss-era branch, June/July. |

## Backend: every local ref in OkamAPI-modules (389)

| ref | tip | unique | excl | patch-eq | tree-eq | newest | lane (state) | verdict | note |
|---|---|---|---|---|---|---|---|---|---|
| `feature/restaurant-modules` | 8e2b57de84 | 0 |  | n/a |  |  | L-MODAL-LAND (verified) | **landing-input** | The backend trunk @ 8e2b57de, unmoved since 2026-08-04 12:00. |
| `integration/mig-stack-merge` | 7f8945dc68 | 0 |  | n/a |  |  | L-MIG-STACK-MERGE (built-unverified) | **landing-input** | Landing input #1: the composed nine-migration stack, +38 over the trunk, the only tree a SQL tier has ever run near (the run record itself lives on lane/compose-and-run-the-stack). |
| `lane/backend-patches-composed` | 2ba9229fa7 | 0 |  | n/a |  |  | L-REVIEW-THE-BACKEND-PATCH-TREE (built-unverified) | **landing-input** | Landing input #2: three composed patches + the evidence-only triple-record commit on the stack tip. |
| `lane/growthaudit-migration` | 93a52938ec | 0 |  | n/a |  |  | L-GROWTHAUDIT-MIGRATION (built-unverified) | **landing-input** | Landing input #3: MIG-29 GrowthAuditEvents, based on the stack tip; sibling lane verified it composes with no rebase. |
| `lane/planned-minutes-honour-lineage` | 589056dfb3 | 0 |  | n/a |  |  | L-PLANNED-MINUTES-HONOUR-LINEAGE (built-unverified) | **landing-input** | Landing input #4 - NEEDS CARE. Branched from the rescue chain, not the stack: a plain merge drags e956337ed (world-config snapshot: artifacts/world/WORLD.json + world.config) and 5243c06a7 (patch-identical to composed patch ea66353f9 - same patch-id 72bfbd51 - so a duplicate application) onto the trunk. Only 589056dfb itself is new work; landing it means cherry-pick/rebase onto the patched tip, not a merge. |
| `lane/trigger-declarations-refreshed` | 58f597387f | 1 | 1 | 0/1 | 0/13 | 2026-08-06 | L-TRIGGER-DECLARATIONS-REFRESHED (running) | **in-flight-lane** | Running lane; committed the seven re-authored trigger declarations at 58f5973 (19:48, during this measurement). Not on any landing input yet - the trunk lands without the 32-trigger declaration set until this lane is merged. |
| `lane/accounting-export-silent` | a154ca19b5 | 1 | 1 | 0/1 | 0/8 | 2026-08-04 | L-ACCOUNTING-EXPORT-SILENT (built-unverified) | **awaits-landing** |  |
| `lane/ack-receipt-inbox-column` | 6dfbb74b4a | 1 | 1 | 0/1 | 0/3 | 2026-08-06 | L-ACK-RECEIPT-SURVIVES-A-RELOAD-FIX (built-unverified) | **awaits-landing** | Today's backend half of the worker-inbox acknowledgement family ('The worker's inbox reports the acknowledgement it already stores'); return files exist for the family; on no landing input. |
| `lane/census-derives-its-floor` | 7585fa3bb1 | 1 | 1 | 0/1 | 0/5 | 2026-08-06 | L-CENSUS-DERIVES-ITS-FLOOR (built-unverified) | **awaits-landing** |  |
| `lane/census-floors-derived` | 75dcc2ff60 | 1 | 1 | 0/1 | 0/3 | 2026-08-03 | L-CENSUS-FLOORS-DERIVED (built-unverified) | **awaits-landing** |  |
| `lane/clockout-state-is-not-open` | a74a6fd21f | 2 | 2 | 0/2 | 0/6 | 2026-08-05 | L-CLOCKOUT-STATE-IS-NOT-OPEN (built-unverified) | **awaits-landing** |  |
| `lane/compose-and-run-the-stack` | 38788369f4 | 14 | 4 | 0/7 | 0/20 | 2026-08-06 | L-COMPOSE-AND-RUN-THE-STACK (built-unverified) | **awaits-landing** | The only tree carrying stack x confirm-family plus the SQL-tier run records (587 executed / 565 green / 22 reds, with the baseline proof that all 22 pre-date the composition). The backend landing brief leans on exactly this measurement; if only stack+patches merge, these records and the family composition stay behind. |
| `lane/cors-credentialed-origin` | edbb7dead5 | 2 | 1 | 0/1 | 0/10 | 2026-08-04 | L-CORS-CREDENTIALED-ORIGIN (verified) | **awaits-landing** |  |
| `lane/cors-followups` | 17c12c2068 | 2 | 2 | 0/2 | 0/11 | 2026-08-04 | L-CORS-FOLLOWUPS (built-unverified) | **awaits-landing** |  |
| `lane/cors-narrow-the-default` | bed7cab34d | 2 | 2 | 0/1 | 0/6 | 2026-08-06 | L-CORS-NARROW-THE-DEFAULT (built-unverified) | **awaits-landing** |  |
| `lane/cors-narrow-the-default-integration` | aa29464de6 | 1 | 1 | 0/1 | 0/9 | 2026-08-06 | L-CORS-NARROW-THE-DEFAULT (built-unverified) | **awaits-landing** |  |
| `lane/credit-note-number` | 24c95aa943 | 1 | 1 | 0/1 | 0/2 | 2026-08-04 | L-CREDIT-NOTE-NUMBER (built-unverified) | **awaits-landing** |  |
| `lane/dated-test-output` | b10eb11cc0 | 1 | 1 | 0/1 | 0/7 | 2026-08-04 | L-DATED-TEST-OUTPUT (built-unverified) | **awaits-landing** |  |
| `lane/ef-index-shadow-sweep` | 08309e39b2 | 1 | 1 | 0/1 | 0/3 | 2026-08-03 | L-EF-INDEX-SHADOW-SWEEP (built-unverified) | **awaits-landing** |  |
| `lane/empref-natid` | 27de8b211a | 1 | 0 | 0/1 | 0/2 | 2026-08-05 | L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID (built-unverified) | **awaits-landing** |  |
| `lane/eod-credit-split` | f028c0a87b | 4 | 1 | 0/4 | 0/13 | 2026-08-04 | L-EOD-CREDIT-SPLIT (built-unverified) | **awaits-landing** |  |
| `lane/escpos-ladder-tender` | 9990b4bb7f | 1 | 1 | 0/1 | 0/4 | 2026-08-05 | L-ESCPOS-LADDER-NAMES-THE-TENDER (built-unverified) | **awaits-landing** |  |
| `lane/ev-accept-receipt` | 8ef3ce749f | 2 | 2 | 0/2 | 0/18 | 2026-08-01 | L-EV-ACCEPT-RECEIPT (built-unverified) | **awaits-landing** |  |
| `lane/ev-concurrency-stale-revision` | 93d2b4228f | 1 | 0 | 0/1 | 0/1 | 2026-08-06 | L-EV-CONCURRENCY-REFUSES-A-STALE-REVISION (built-unverified) | **awaits-landing** |  |
| `lane/ev-extdep` | 7e9c38bf33 | 2 | 0 | 0/2 | 1/23 | 2026-08-01 | L-EV-EXTDEP (built-unverified) | **awaits-landing** |  |
| `lane/ev-extdep-guards` | 0724753645 | 3 | 1 | 0/3 | 1/26 | 2026-08-01 | L-EV-EXTDEP-GUARDS (built-unverified) | **awaits-landing** |  |
| `lane/ev-inquiry-gate` | 8ecb47dfa5 | 1 | 1 | 0/1 | 0/11 | 2026-08-01 | L-EV-INQUIRY-GATE (built-unverified) | **awaits-landing** |  |
| `lane/ev-outbox-flake` | 59a1d6073c | 1 | 1 | 0/1 | 0/1 | 2026-08-04 | L-EV-OUTBOX-FLAKE (built-unverified) | **awaits-landing** |  |
| `lane/ev-outbox-guid-substring` | 79f9dd7d48 | 1 | 0 | 0/1 | 0/1 | 2026-08-03 | L-EV-OUTBOX-GUID-SUBSTRING (built-unverified) | **awaits-landing** |  |
| `lane/ev-refund-fake-arg` | db9b39a12e | 1 | 1 | 0/1 | 0/6 | 2026-08-02 | L-EV-REFUND-FAKE-ARG (built-unverified) | **awaits-landing** |  |
| `lane/ev-stale-cause` | e5de872d75 | 1 | 1 | 0/1 | 0/9 | 2026-08-01 | L-EV-STALE-CAUSE (built-unverified) | **awaits-landing** |  |
| `lane/ev-uri-relative` | 6a7bf75b61 | 1 | 1 | 0/1 | 0/9 | 2026-08-02 | L-EV-URI-RELATIVE (built-unverified) | **awaits-landing** |  |
| `lane/ev-vipps-fallback` | 9e3a607bb7 | 1 | 0 | 0/1 | 0/13 | 2026-08-01 | L-EV-VIPPS-FALLBACK (built-unverified) | **awaits-landing** |  |
| `lane/ev-vipps-fallback-2` | fc09be1d4b | 1 | 1 | 0/1 | 0/12 | 2026-08-03 | L-EV-VIPPS-FALLBACK (built-unverified) | **awaits-landing** |  |
| `lane/finalize-index-or-a-reason` | 5e53de83a7 | 1 | 1 | 0/1 | 0/6 | 2026-08-05 | L-FINALIZE-INDEX-OR-A-REASON (built-unverified) | **awaits-landing** |  |
| `lane/flags-effective-resolvers` | e45ec4c12f | 1 | 0 | 0/1 | 0/11 | 2026-08-01 | L-FLAGS-EFFECTIVE-RESOLVERS (built-unverified) | **awaits-landing** |  |
| `lane/flags-excuse-byflag` | 6ae0b8db5e | 2 | 1 | 0/2 | 0/13 | 2026-08-02 | L-FLAGS-EXCUSE-BYFLAG (built-unverified) | **awaits-landing** |  |
| `lane/flags-resolvers-cover-three` | 0f29a898e0 | 2 | 1 | 0/2 | 0/16 | 2026-08-06 | L-FLAGS-RESOLVERS-COVER-THREE (built-unverified) | **awaits-landing** |  |
| `lane/fragile-needles` | f2517d5dc0 | 1 | 1 | 0/1 | 0/3 | 2026-08-04 | L-FRAGILE-NEEDLES (built-unverified) | **awaits-landing** |  |
| `lane/gr-approval-state` | 3ea531f596 | 1 | 1 | 0/1 | 0/13 | 2026-08-01 | L-GR-APPROVAL-STATE (built-unverified) | **awaits-landing** |  |
| `lane/gr-deadline-onwire` | 3b42da1d00 | 1 | 0 | 0/1 | 0/1 | 2026-08-02 | L-GR-DEADLINE-ONWIRE (verified) | **awaits-landing** |  |
| `lane/gr-deadline-statute` | f7abfd8e9b | 2 | 0 | 0/2 | 0/2 | 2026-08-02 | L-GR-DEADLINE-STATUTE (built-unverified) | **awaits-landing** |  |
| `lane/gr-exit-wire-the-mail` | 54a8bb51bc | 2 | 2 | 0/2 | 0/11 | 2026-08-04 | L-GR-EXIT-WIRE-THE-MAIL (built-unverified) | **awaits-landing** |  |
| `lane/gr-newsletter-cross-land` | 2fc29f344b | 2 | 1 | 0/1 | 0/1 | 2026-08-05 | L-GR-NEWSLETTER-CROSS (built-unverified) | **awaits-landing** |  |
| `lane/gr-newsletter-cross-verify` | b521bdb52e | 2 | 1 | 0/1 | 0/1 | 2026-08-03 | L-GR-NEWSLETTER-CROSS (built-unverified) | **awaits-landing** |  |
| `lane/gr-postmark-webhook` | 5b895dc4f4 | 1 | 0 | 0/1 | 0/8 | 2026-08-01 | L-GR-POSTMARK-WEBHOOK (built-unverified) | **awaits-landing** |  |
| `lane/gr-withdraw-origin` | e0c2b02fdf | 2 | 1 | 0/2 | 0/12 | 2026-08-03 | L-GR-WITHDRAW-ORIGIN (built-unverified) | **awaits-landing** |  |
| `lane/growth-effective-resolver` | 107ca70efe | 1 | 0 | 0/1 | 0/15 | 2026-08-06 | L-GROWTH-EFFECTIVE-RESOLVER (built-unverified) | **awaits-landing** |  |
| `lane/growth-health-honest` | c11e78a6ae | 1 | 0 | 0/1 | 0/16 | 2026-08-01 | L-GROWTH-HEALTH-HONEST (built-unverified) | **awaits-landing** |  |
| `lane/growth-newsletter-wire` | 87600a1c61 | 1 | 0 | 0/1 | 0/1 | 2026-08-01 | L-GROWTH-NEWSLETTER-WIRE (built-unverified) | **awaits-landing** |  |
| `lane/growth-prefcentre` | 2a05280055 | 1 | 0 | 0/1 | 0/10 | 2026-08-03 | L-GR-WITHDRAW-ORIGIN (built-unverified) | **awaits-landing** |  |
| `lane/growth-sql-catch-typed` | c7912d49fc | 1 | 1 | 0/1 | 0/3 | 2026-08-05 | L-GROWTH-SQL-CATCH-TYPED (built-unverified) | **awaits-landing** |  |
| `lane/guestlink-one-composer` | f1900cff7e | 2 | 2 | 0/2 | 0/5 | 2026-08-06 | L-GUESTLINK-ONE-COMPOSER (built-unverified) | **awaits-landing** |  |
| `lane/hosted-service-floor` | 6dcc150302 | 2 | 0 | 0/2 | 0/6 | 2026-08-04 | L-HOSTED-SERVICE-FLOOR (built-unverified) | **awaits-landing** |  |
| `lane/lanes-out-of-assembly` | 2c1eebafb3 | 1 | 1 | 0/1 | 0/2 | 2026-08-04 | L-LANES-OUT-OF-THE-ASSEMBLY (built-unverified) | **awaits-landing** |  |
| `lane/margin-finalize-lag` | a6a1174b88 | 1 | 1 | 0/1 | 2/9 | 2026-07-31 | L-COMPOSE-CENSUS (built-unverified) | **awaits-landing** |  |
| `lane/margin-violation-anchor` | a2bfd11657 | 1 | 1 | 0/1 | 0/4 | 2026-08-04 | L-MARGIN-VIOLATION-ANCHOR (built-unverified) | **awaits-landing** |  |
| `lane/margin-waste-500` | 1ed372bd58 | 2 | 2 | 0/2 | 0/9 | 2026-08-02 | L-MRG-WASTE-500 (built-unverified) | **awaits-landing** |  |
| `lane/meals-agreement-pin-inverts` | 4bbf34a5e5 | 2 | 0 | 0/2 | 0/17 | 2026-08-04 | L-MEALS-AGREEMENT-PIN-INVERTS (built-unverified) | **awaits-landing** |  |
| `lane/meals-degenerate-two` | 4fff635d0a | 1 | 0 | 0/1 | 0/8 | 2026-08-01 | L-MEALS-DEGENERATE-TWO (built-unverified) | **awaits-landing** |  |
| `lane/meals-docsync` | f7b30b2d1f | 1 | 1 | 0/1 | 0/5 | 2026-08-04 | L-MEALS-DOCSYNC (built-unverified) | **awaits-landing** |  |
| `lane/meals-eighth-pin` | 9fe599c6c8 | 3 | 0 | 0/3 | 0/13 | 2026-08-02 | L-MEALS-EIGHTH-PIN (built-unverified) | **awaits-landing** |  |
| `lane/meals-eighth-read` | 1995fb7fb3 | 5 | 2 | 0/5 | 0/16 | 2026-08-05 | L-MEALS-EIGHTH-READ (built-unverified) | **awaits-landing** |  |
| `lane/meals-floor-pins` | 5a254d72a8 | 1 | 0 | 0/1 | 1/9 | 2026-08-01 | L-MEALS-FLOOR-PINS (built-unverified) | **awaits-landing** |  |
| `lane/meals-fourway-tier` | 702d9481ea | 9 | 0 | 0/5 | 1/28 | 2026-08-02 | L-MEALS-FOURWAY-TIER (built-unverified) | **awaits-landing** |  |
| `lane/meals-idempotency-refusal` | 54714dd6e3 | 1 | 0 | 0/1 | 0/16 | 2026-08-04 | L-MEALS-IDEMPOTENCY-REFUSAL (built-unverified) | **awaits-landing** |  |
| `lane/meals-lever-withhold` | 2d0eab5393 | 2 | 2 | 0/2 | 0/5 | 2026-08-05 | L-MEALS-LEVER-WITHHOLD (built-unverified) | **awaits-landing** |  |
| `lane/meals-members-read` | 086ac34f46 | 1 | 1 | 0/1 | 0/11 | 2026-08-04 | L-MEALS-MEMBERS-READ (built-unverified) | **awaits-landing** |  |
| `lane/meals-quote-retry` | 92d45967c0 | 13 | 2 | 0/8 | 1/48 | 2026-08-02 | L-MEALS-QUOTE-RETRY (built-unverified) | **awaits-landing** |  |
| `lane/meals-reachable` | 1b03e8e248 | 1 | 1 | 0/1 | 0/3 | 2026-08-01 | L-MEALS-REACHABLE (built-unverified) | **awaits-landing** |  |
| `lane/meals-reachable-api` | 02f27b9512 | 2 | 1 | 0/2 | 0/11 | 2026-08-03 | L-MEALS-REACHABLE (built-unverified) | **awaits-landing** |  |
| `lane/meals-release-actor` | 249612ac77 | 2 | 2 | 0/2 | 0/31 | 2026-08-03 | L-MEALS-RELEASE (built-unverified) | **awaits-landing** |  |
| `lane/meals-release-race` | f70a0254c3 | 1 | 1 | 0/1 | 1/7 | 2026-08-01 | L-MEALS-RELEASE-RACE (built-unverified) | **awaits-landing** |  |
| `lane/meals-requote-release` | d5483cb30b | 2 | 0 | 0/2 | 0/10 | 2026-08-01 | L-MEALS-REQUOTE-RELEASE (built-unverified) | **awaits-landing** |  |
| `lane/meals-supersede-sql` | 7dafec47ef | 10 | 0 | 0/6 | 1/35 | 2026-08-02 | L-MEALS-SUPERSEDE-SQL (built-unverified) | **awaits-landing** |  |
| `lane/meals-sweep-guard` | 4bddfc7de0 | 2 | 2 | 0/2 | 0/9 | 2026-08-02 | L-MEALS-SWEEP-GUARD (built-unverified) | **awaits-landing** |  |
| `lane/meals-xz-credit` | 25586d86bb | 1 | 1 | 0/1 | 0/8 | 2026-08-01 | L-MEALS-XZ-CREDIT (built-unverified) | **awaits-landing** |  |
| `lane/mrg-starter-150` | 8eeacae1f9 | 3 | 0 | 0/3 | 0/7 | 2026-08-05 | L-MRG-STARTER-150 (built-unverified) | **awaits-landing** |  |
| `lane/mrg-starter-150b` | 9a00da6e3c | 1 | 1 | 0/1 | 0/6 | 2026-08-03 | L-MRG-STARTER-150 (built-unverified) | **awaits-landing** |  |
| `lane/newsletter-dispatch-reports-its-cause` | 33a99ac479 | 1 | 1 | 0/1 | 0/3 | 2026-08-06 | L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE (built-unverified) | **awaits-landing** |  |
| `lane/paymenttype-defined-tender` | bd77cd6b0b | 1 | 1 | 0/1 | 0/2 | 2026-08-05 | L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED (built-unverified) | **awaits-landing** |  |
| `lane/pdf-creditnote-name` | 015c07ca24 | 2 | 2 | 0/2 | 0/2 | 2026-08-04 | L-PDF-CREDITNOTE-NAME (built-unverified) | **awaits-landing** |  |
| `lane/phone-in-path` | a60da359b0 | 2 | 0 | 0/2 | 0/14 | 2026-08-04 | L-PHONE-IN-PATH (built-unverified) | **awaits-landing** |  |
| `lane/pref-cookie-half` | b5a3b1a6be | 1 | 1 | 0/1 | 0/8 | 2026-08-06 | L-PREF-COOKIE-HALF (built-unverified) | **awaits-landing** |  |
| `lane/push-token-in-path` | 363d3f7fa7 | 2 | 2 | 0/2 | 0/13 | 2026-08-04 | L-PUSH-TOKEN-IN-PATH (built-unverified) | **awaits-landing** |  |
| `lane/replay-pins-close` | a6583a022f | 7 | 4 | 0/5 | 0/28 | 2026-08-04 | L-REPLAY-PINS-CLOSE (built-unverified) | **awaits-landing** |  |
| `lane/review-residuals-provider` | bd765c7d86 | 3 | 0 | 0/3 | 0/17 | 2026-08-02 | L-REVIEW-RESIDUALS (built-unverified) | **awaits-landing** |  |
| `lane/review-residuals-rezone` | 15a1d0b7c3 | 2 | 0 | 0/2 | 0/2 | 2026-08-02 | L-REVIEW-RESIDUALS (built-unverified) | **awaits-landing** |  |
| `lane/rollback-tracked-sweep` | 118297520d | 1 | 1 | 0/1 | 0/15 | 2026-08-03 | L-ROLLBACK-TRACKED-SWEEP (built-unverified) | **awaits-landing** |  |
| `lane/route-guard-gaps` | a5b9e28bab | 3 | 1 | 0/3 | 0/16 | 2026-08-04 | L-ROUTE-GUARD-GAPS (built-unverified) | **awaits-landing** |  |
| `lane/statute-honesty` | 485959ab8b | 1 | 1 | 0/1 | 0/2 | 2026-08-01 | L-STATUTE-HONESTY (built-unverified) | **awaits-landing** |  |
| `lane/supersede-release-attributed` | 42d170c476 | 5 | 0 | 0/4 | 0/25 | 2026-08-06 | L-SUPERSEDE-RELEASE-IS-ATTRIBUTED (built-unverified) | **awaits-landing** |  |
| `lane/telemetry-initializer-floor` | 78a59ed6cf | 1 | 0 | 0/1 | 0/5 | 2026-08-04 | L-TELEMETRY-INITIALIZER-FLOOR (built-unverified) | **awaits-landing** |  |
| `lane/train-disclosure` | 06b8b582c1 | 1 | 0 | 0/1 | 0/16 | 2026-08-02 | L-TRAIN-DISCLOSURE (built-unverified) | **awaits-landing** |  |
| `lane/train-idempotency-refusal` | 01cd5eeeca | 1 | 1 | 0/1 | 0/7 | 2026-08-04 | L-TRAIN-IDEMPOTENCY-REFUSAL (built-unverified) | **awaits-landing** |  |
| `lane/trn-evidence-names` | b560bc3ab5 | 2 | 2 | 0/2 | 0/10 | 2026-08-02 | L-TRAIN-EVIDENCE-NAMES-COURSE (built-unverified) | **awaits-landing** |  |
| `lane/utlkvit-reprint-kind` | 88b7307f8d | 1 | 1 | 0/1 | 0/3 | 2026-08-03 | L-UTLKVIT-REPRINT-KIND (built-unverified) | **awaits-landing** |  |
| `lane/vipps-redact-404` | cb18cab48f | 1 | 1 | 0/1 | 0/2 | 2026-08-03 | L-VIPPS-REDACT-404 (built-unverified) | **awaits-landing** |  |
| `lane/wf-adjust-address` | f3887f9a17 | 1 | 1 | 0/1 | 0/6 | 2026-08-03 | L-WF-ADJUST-ADDRESS (built-unverified) | **awaits-landing** |  |
| `lane/wf-blind-bind-name` | 3b593fef95 | 1 | 0 | 0/1 | 0/11 | 2026-08-04 | L-WF-BLIND-BIND-NAME (built-unverified) | **awaits-landing** |  |
| `lane/wf-bootstrap` | 9d1719dfd5 | 1 | 0 | 0/1 | 0/11 | 2026-08-03 | L-WF-BOOTSTRAP (built-unverified) | **awaits-landing** |  |
| `lane/wf-bootstrap-one-engagement` | 6fa2cbc33f | 3 | 2 | 0/2 | 0/20 | 2026-08-03 | L-WF-BOOTSTRAP (built-unverified) | **awaits-landing** |  |
| `lane/wf-clock-wire` | f14c91ec18 | 1 | 1 | 0/1 | 0/15 | 2026-08-03 | L-WF-CLOCK-WIRE (built-unverified) | **awaits-landing** |  |
| `lane/wf-contact-imported` | 0b28f60146 | 2 | 2 | 0/2 | 0/8 | 2026-08-04 | L-WF-CONTACT-IMPORTED (built-unverified) | **awaits-landing** |  |
| `lane/wf-correction-path` | 182fa43efc | 2 | 2 | 0/2 | 0/15 | 2026-08-04 | L-WF-CORRECTION-PATH (built-unverified) | **awaits-landing** |  |
| `lane/wf-demo-presence` | 8a9080c85b | 1 | 1 | 0/1 | 0/2 | 2026-08-01 | L-WF-DEMO-PRESENCE (built-unverified) | **awaits-landing** |  |
| `lane/wf-digest-tautology` | 4b911917b9 | 1 | 1 | 0/1 | 0/1 | 2026-08-04 | L-WF-DIGEST-TAUTOLOGY (built-unverified) | **awaits-landing** |  |
| `lane/wf-exchange-award-ungated` | 2661b752e4 | 1 | 1 | 0/1 | 0/3 | 2026-08-04 | L-WF-EXCHANGE-AWARD-UNGATED (built-unverified) | **awaits-landing** |  |
| `lane/wf-exchange-move` | a5ff40f287 | 1 | 1 | 0/1 | 0/8 | 2026-08-01 | L-WF-EXCHANGE-MOVE (built-unverified) | **awaits-landing** |  |
| `lane/wf-idempotency-refusal` | a1d572088f | 1 | 0 | 0/1 | 0/10 | 2026-08-04 | L-WF-IDEMPOTENCY-REFUSAL (built-unverified) | **awaits-landing** |  |
| `lane/wf-idempotency-refusal-rest` | 02684ecc15 | 2 | 1 | 0/2 | 0/19 | 2026-08-04 | L-WF-IDEMPOTENCY-REFUSAL-REST (built-unverified) | **awaits-landing** |  |
| `lane/wf-invite-list-revoke` | 68f2472c90 | 1 | 0 | 0/1 | 0/9 | 2026-08-04 | L-WF-INVITE-LIST-REVOKE (built-unverified) | **awaits-landing** |  |
| `lane/wf-lever-title` | 7404b69695 | 1 | 1 | 0/1 | 0/4 | 2026-08-05 | L-WF-LEVER-TITLE-NAMES-ITS-REACH (built-unverified) | **awaits-landing** |  |
| `lane/wf-link-deadend` | a3a526ae98 | 2 | 1 | 0/2 | 0/12 | 2026-08-04 | L-WF-LINK-DEADEND (built-unverified) | **awaits-landing** |  |
| `lane/wf-onboard-claim` | de0811f633 | 1 | 0 | 0/1 | 0/1 | 2026-08-04 | L-WF-ONBOARD (built-unverified) | **awaits-landing** | Same tip as lane/wf-onboard-demo-run. |
| `lane/wf-onboard-demo-run` | de0811f633 | 1 | 0 | 0/1 | 0/1 | 2026-08-04 | L-WF-ONBOARD-DEMO-RUN (built-unverified) | **awaits-landing** | Same tip as lane/wf-onboard-claim. |
| `lane/wf-operator-unique` | c67d092382 | 1 | 1 | 0/1 | 0/25 | 2026-08-06 | L-WF-OPERATOR-UNIQUE (built-unverified) | **awaits-landing** |  |
| `lane/wf-push-still-lies` | 100ae00011 | 1 | 1 | 0/1 | 0/15 | 2026-08-04 | L-WF-PUSH-STILL-LIES (built-unverified) | **awaits-landing** |  |
| `lane/wf-timeoff-decide-gate` | 1ee483c06f | 1 | 1 | 0/1 | 0/5 | 2026-08-04 | L-WF-TIMEOFF-DECIDE-GATE (built-unverified) | **awaits-landing** |  |
| `lane/wf-timesheet-race` | bc9c7e9699 | 2 | 2 | 0/2 | 0/10 | 2026-08-04 | L-WF-TIMESHEET-RACE (built-unverified) | **awaits-landing** |  |
| `lane/wf-timesheet-wire` | da452fe248 | 2 | 2 | 0/2 | 0/2 | 2026-08-04 | L-WF-TIMESHEET-WIRE (built-unverified) | **awaits-landing** |  |
| `lane/wf-withheld-bound` | 74405b34d0 | 1 | 0 | 0/1 | 0/5 | 2026-08-04 | L-WF-WITHHELD-BOUND (built-unverified) | **awaits-landing** |  |
| `lane/xz-credit-fields` | 9bdfc26739 | 1 | 0 | 0/1 | 0/8 | 2026-08-04 | L-XZ-CREDIT-FIELDS (built-unverified) | **awaits-landing** |  |
| `lane/xz-printed-defects` | 6c394057ef | 4 | 1 | 0/4 | 0/10 | 2026-08-04 | L-XZ-PRINTED-DEFECTS (built-unverified) | **awaits-landing** |  |
| `local/train-disclosure-land` | f4407595c1 | 2 | 0 | 0/1 | 0/16 | 2026-08-06 | L-TRAIN-DISCLOSURE-LAND (built-unverified) | **awaits-landing** | Local landing tree for the train-disclosure family. |
| `local/trainwire-abort-fix` | 94a9261536 | 2 | 1 | 0/2 | 0/16 | 2026-08-06 | L-TRAINWIRE-ABORT (built-unverified) | **awaits-landing** | Local fix branch for the trainwire abort. |
| `prep/growth-landing` | 846e840d81 | 281 | 5 | n/a |  | 2026-07-20 | L-GROWTH-LAND (built-unverified) | **awaits-landing** |  |
| `lane/wolt-sync-unregistered` | 3c7b28ee03 | 1 | 1 | 0/1 | 0/9 | 2026-08-04 | — | **unclaimed** |  |
| `lane/demo-workforce` | 7adee1172a | 3 | 3 | 0/3 | 0/4 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/events-outbox` | 8db70ff932 | 1 | 1 | 0/1 | 0/7 | 2026-07-30 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/isofix` | 1df46dcc92 | 1 | 1 | 0/1 | 1/9 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/meals-agreement-create` | cf88973afa | 1 | 1 | 0/1 | 5/9 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/trb2` | ce400f72c3 | 2 | 2 | 0/2 | 1/27 | 2026-07-30 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/wire-containment-fix` | 6d2a526f51 | 3 | 3 | 0/3 | 1/4 | 2026-07-29 | — | **undetermined-stale** | Not reachable and not patch-equivalent; late-July era, no current plan lane claims it; whether later landed work superseded it was not determined. |
| `lane/ev-seed-deposits` | caee6ae34d | 2 | 2 | 0/2 | 0/3 | 2026-08-03 | L-EV-SEED-DEPOSITS (open) | **open-lane** |  |
| `lane/margin-price-correction` | 6368427b49 | 2 | 0 | 0/2 | 0/3 | 2026-08-02 | L-MRG-PRICE-CORRECTION (open) | **open-lane** |  |
| `lane/mrg-price-correction-2` | 58a6351829 | 4 | 0 | 0/4 | 0/21 | 2026-08-03 | L-MRG-PRICE-CORRECTION (open) | **open-lane** |  |
| `lane/publish-outbox-shape` | 3bb9c039f8 | 1 | 0 | 0/1 | 0/1 | 2026-08-06 | L-PUBLISH-WRITES-ONE-OUTBOX-ROW (open) | **open-lane** |  |
| `lane/train-demo-seed-redo` | 2cc5487c3f | 1 | 1 | 0/1 | 0/1 | 2026-08-06 | L-TRAIN-DEMO-SEED-REDO (open) | **open-lane** | Running lane, branched from the rescue chain: its history carries 5243c06a7 and e956337ed (worktree rescue snapshots) - the SAME two-base hazard as lane/planned-minutes-honour-lineage. A plain merge drags the snapshots; a cherry-pick of its own commits avoids them. |
| `wip/rescue-2026-08-06-OkamAPI-agrpinrev` | 095b5f2b57 | 3 | 1 | 0/3 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-OkamAPI-events-verify` | e20331b48c | 257 | 1 | 0/243 |  | 2026-08-06 | — | **left-behind:rescue** | Rescue snapshot of a worktree on an old pre-fork base; only the tip snapshot commit is new work - the inherited base history accounts for the large count. |
| `wip/rescue-2026-08-06-OkamAPI-growth-w1-pin` | 34585f3b98 | 257 | 1 | 0/243 |  | 2026-08-06 | — | **left-behind:rescue** | Rescue snapshot on an old pre-fork base; only the tip snapshot commit is new. |
| `wip/rescue-2026-08-06-OkamAPI-hostedfloor` | d77f0358b7 | 3 | 1 | 0/3 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-OkamAPI-meals-w1` | 584c7879f6 | 257 | 1 | 0/243 |  | 2026-08-06 | — | **left-behind:rescue** | Rescue snapshot on an old pre-fork base; only the tip snapshot commit is new. |
| `wip/rescue-2026-08-06-OkamAPI-reslimiter` | 8fce45912a | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-OkamAPI-swiss-cartselection` | f68de9767f | 88 | 1 | 0/88 |  | 2026-08-06 | — | **left-behind:rescue** | Rescue snapshot on the feature/swiss base; only the tip snapshot commit is new. |
| `wip/rescue-2026-08-06-OkamAPI-traindemoseed` | eaf14d8656 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-OkamAPI-utc` | b3f1679c3a | 217 | 1 | 0/205 |  | 2026-08-06 | — | **left-behind:rescue** | Rescue snapshot on the rebrand/UTC base; only the tip snapshot commit is new. |
| `wip/rescue-2026-08-06-OkamAPI-w4` | d08442f6c6 | 257 | 1 | 0/243 |  | 2026-08-06 | — | **left-behind:rescue** | Rescue snapshot on an old pre-fork base; only the tip snapshot commit is new. |
| `wip/rescue-2026-08-06-wt-adminaudit` | 63415a62a2 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-aimw` | 11b8c8d723 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-composebase` | 3feefd0594 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-conatretire` | 6fb389c7fa | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-confirmfam` | 6f3af2fe9b | 11 | 1 | 0/6 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-empref-natid` | 1dfd5f0530 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-evoutboxguid` | 76e6c5242e | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-evstalerev` | 8f7a1c8457 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-evvippsfb` | 31a3cea5b9 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-gr-confirm-stale` | 043a1f5cc0 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-gr-nlwire` | 750feff153 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-growth-health` | b4f75a8861 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-growth-reach` | 47ffa2b6e1 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-mrg150fill` | a13f342aa9 | 4 | 1 | 0/4 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-mrgprice2` | c460302745 | 5 | 1 | 0/5 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-postmergepin` | e76a4cc6ee | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-pub-outbox` | 43db70225d | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-resid-provider` | 2ca754ac72 | 4 | 1 | 0/4 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-resid-rezone` | fc84c98331 | 3 | 1 | 0/3 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-supattr` | 070e13e606 | 6 | 1 | 0/5 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-teleminit` | 9a1609ad18 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-traindiscland` | d8dc7cb790 | 1 | 1 | 0/1 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-traindiscland-m` | 63632fe6f6 | 3 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-wfinvlist` | c089649eb4 | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `wip/rescue-2026-08-06-wt-wfwithheld` | 6dc149f94a | 2 | 1 | 0/2 |  | 2026-08-06 | — | **left-behind:rescue** |  |
| `feature/restaurant-control-stage0` | 903b70d141 | 387 | 7 | n/a |  | 2026-07-27 | L-COMPOSE-CENSUS (built-unverified) | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/a1-store-country` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/a2-growth-flake` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/a3-tx-gate` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/a5-events-w4` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/a6-meals-minors` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/b1-training-w3` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/b2-wf-exchange` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/b3-wf-timesheets` | e88af79642 | 380 | 0 | n/a |  | 2026-07-22 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/meals-w3-fiscal` | edb2fcf680 | 317 | 0 | n/a |  | 2026-07-21 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `prep/meals-w3-landing` | 2345f12c1f | 324 | 5 | n/a |  | 2026-07-21 | — | **excluded-by-design** | F-POS-TENDER-WIRE-REINTRODUCES-TWO: a plain merge silently re-adds the private credit-sale predicate (base 2431883d); flag says retire unlanded or reduce first. |
| `lane/meals-grace-pins` | 34c6c10317 | 0 |  | n/a |  |  | L-MEALS-POSREL-LAND (verified) | **carried-conditionally** | Reachable ONLY through lane/planned-minutes-honour-lineage's rescue ancestry (1 commits outside the other landing inputs); a cherry-pick landing of that lane leaves this ref behind. |
| `wip/rescue-2026-08-06-OkamAPI-modules` | e956337ede | 0 |  | n/a |  |  | — | **carried-conditionally** | Reachable ONLY through lane/planned-minutes-honour-lineage's rescue ancestry (2 commits outside the other landing inputs); a cherry-pick landing of that lane leaves this ref behind. |
| `wip/rescue-2026-08-06-open-shifts-lineage` | 5243c06a73 | 0 |  | n/a |  |  | L-BACKEND-PATCHES-ARE-APPLIED (built-unverified) | **carried-conditionally** | Reachable ONLY through lane/planned-minutes-honour-lineage's rescue ancestry (3 commits outside the other landing inputs); a cherry-pick landing of that lane leaves this ref behind. |
| `integration/confirm-family` | eeb1b8c47d | 10 | 0 | 0/5 |  | 2026-08-03 | L-CONFIRM-FAMILY-MERGE (built-unverified) | **composition-artifact** | Confirm-family composition. Members conat-retire, confirm-postmerge-pin, reservation-limiter-move are already inside the stack; lane/gr-deadline-statute and lane/gr-postmark-webhook are NOT - they remain separate landed lanes. Unique beyond those: two tier-record commits. |
| `lane/mig-stack-record` | a613f026ed | 1 | 1 | 0/1 |  | 2026-08-05 | L-MIG-STACK-RECORD (built-unverified) | **process-artifact** | A single record commit about the stack; measurement provenance, not product code. |
| `trial/meals-eighth-read-tipmerge` | a7d07559fa | 4 | 1 | 0/3 |  | 2026-08-05 | L-MEALS-EIGHTH-READ (built-unverified) | **process-artifact** | A throwaway trial merge kept as a ref; its lane's real work is lane/meals-eighth-read. |
| `land/meals-posrel-v1` | d776f9e7e7 | 2 | 2 | 0/0 |  | 2026-08-04 | — | **carried-by-content** | 2 merge / 0 empty commits not patch-checked. |
| `lane/authclean` | 909f95bcc3 | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `lane/cost-rollup` | 3d2c087cb8 | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `lane/events-settlement-reads` | 717082b20f | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `lane/menu-margin-read` | 0735c540d4 | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `lane/pinfix` | 03e603603d | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `lane/w0-businessdate` | e7c8d31791 | 1 | 1 | 1/1 |  | 2026-07-29 | — | **carried-by-content** |  |
| `wip/rescue-2026-08-06-wt-claims` | 4b9b2dcdae | 1 | 1 | 1/1 |  | 2026-08-06 | — | **carried-by-content** |  |
| `wip/rescue-2026-08-06-wt-mut` | 2ae04d701f | 1 | 1 | 1/1 |  | 2026-08-06 | — | **carried-by-content** |  |
| `wip/rescue-2026-08-06-wt-supp` | 6f04f37d30 | 1 | 1 | 1/1 |  | 2026-08-06 | — | **carried-by-content** |  |
| `wip/rescue-2026-08-06-wt-wire2` | 9a798b1522 | 1 | 1 | 1/1 |  | 2026-08-06 | — | **carried-by-content** |  |
| `integration/mig-stack-land` | 4b37f81bf3 | 0 |  | n/a |  |  | L-MIG-NUMBER-CLAIMS (built-unverified) | **carried** | Earlier stack-landing tree, fully reachable. |
| `land/meals-posrel` | b9c9508201 | 0 |  | n/a |  |  | L-MEALS-POSREL-LAND (verified) | **carried** |  |
| `lane/acct-uidx` | c606993aa8 | 0 |  | n/a |  |  | L-ACCT-UIDX (open) | **carried** |  |
| `lane/adminaudit` | 2f33b81cca | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/ai-middleware-delete` | 5b2e99c8fd | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/attend-round` | 21dbe64007 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/attribution-migrations` | d6e35955f4 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/composition-root-check` | bfe57c3c58 | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/confirm-conat-retire` | 6771ba9ad9 | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/confirm-postmerge-pin` | 02c077cba6 | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/confirm-server-halves` | 8704ff6399 | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/crypto-pin-byform` | cfb3b14ac1 | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/d01-epoch-cutover` | f897b2eb39 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/d1-race-verify` | 3e0551c136 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/demo5` | ec5ead1e5e | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/download-headers` | 9207f480ef | 0 |  | n/a |  |  | L-PDF-FAMILY-LAND (verified) | **carried** |  |
| `lane/download-pdf-wire` | a7b90cbd84 | 0 |  | n/a |  |  | L-PDF-FAMILY-LAND (verified) | **carried** |  |
| `lane/email-pii-redaction` | cef3325587 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/epoch-margin` | 5a5b3de8e8 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/epoch-meals` | 28e95cd9da | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/epoch-training` | e8f06833fb | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/ev-accept-gate` | 8eee00f71a | 0 |  | n/a |  |  | L-EV-FAMILY-LAND (verified) | **carried** |  |
| `lane/ev-capture` | 99f56e636a | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/ev-dietary` | 4e30cab1fc | 0 |  | n/a |  |  | L-EV-DIETARY (verified) | **carried** |  |
| `lane/ev-guest-origin` | b0b501a5a1 | 0 |  | n/a |  |  | L-EV-FAMILY-LAND (verified) | **carried** |  |
| `lane/ev-port-contract` | 1ec802c02a | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/ev-rails` | 6350975169 | 0 |  | n/a |  |  | L-BE-RECEIPT (built-unverified) | **carried** |  |
| `lane/ev-sweep` | a43b2815b0 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/ev-token` | fecd978001 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/ev-vat` | 94f948ec64 | 0 |  | n/a |  |  | L-BE-RECEIPT (built-unverified) | **carried** |  |
| `lane/evb4fix` | 2d244bf900 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-admin-reads` | 06754037ee | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-currency` | aa5edfb7b5 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-deadletter-surface` | b4ba9038a7 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-deposit-order-of-writes` | bf866c5deb | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-lineage-census` | 683b3b5e03 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-manual-actor` | 291410f537 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-next` | 22345c1e0b | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/events-settlement-409` | 3558178271 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/fkmask` | 027d69466b | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/flagguard` | 790ed8bc65 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/gr-confirm-stale` | 75e5168c7b | 0 |  | n/a |  |  | L-GR-CONFIRM-STALE (built-unverified) | **carried** |  |
| `lane/gr-confirmed-email` | 48950702df | 0 |  | n/a |  |  | L-GR-CONFIRMED-EMAIL (built-unverified) | **carried** |  |
| `lane/gr-delivery-record` | 8e2b57de84 | 0 |  | n/a |  |  | L-GR-DELIVERY-RECORD (retracted) | **carried** | Tip equals the trunk tip - the branch carries nothing. |
| `lane/gr-dispatch-actor` | a1e2655f32 | 0 |  | n/a |  |  | L-GR-DISPATCH-ACTOR (built-unverified) | **carried** |  |
| `lane/gr-testsend-guard` | 5719fc96e7 | 0 |  | n/a |  |  | L-GR-TESTSEND-GUARD (built-unverified) | **carried** |  |
| `lane/gr-testsend-ratelimit` | c96cd21e06 | 0 |  | n/a |  |  | L-GR-TESTSEND-RATELIMIT (built-unverified) | **carried** |  |
| `lane/growth-audit-ledger` | bd3a840f74 | 0 |  | n/a |  |  | L-GR-TESTSEND-RECORD (built-unverified) | **carried** |  |
| `lane/growth-consent-text` | 4c9674e283 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-mail-postmark` | af6ec9dc7c | 0 |  | n/a |  |  | L-GROWTH-MAIL (verified) | **carried** |  |
| `lane/growth-next` | eab5db62d0 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-privacy` | 7b819be37c | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-privacy-evidence` | 6b4913b898 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-reach` | 5bb449dca6 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-seed-idempotent` | ba8ef61678 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-shred-sweep` | a308bbe525 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-webhook-auth` | f8958fb0ec | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/growth-wire` | 71b3648a3d | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/invite-claim-refusal` | dae1b70f76 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/invoice-authorize` | d7ffdae9a3 | 0 |  | n/a |  |  | L-INVOICE-AUTHORIZE (built-unverified) | **carried** |  |
| `lane/invoice-retry-retirement` | 1a0c0cbbc0 | 0 |  | n/a |  |  | L-PDF-FAMILY-LAND (verified) | **carried** |  |
| `lane/kassa-journal-triggers` | 041b077ed9 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/live-world-seed` | 3579bbbc77 | 0 |  | n/a |  |  | L-LIVE-WORLD-SEED (built-unverified) | **carried** |  |
| `lane/margin-currency` | ba5f03d726 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-next` | 013b1699f4 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-product-link-guard` | c681d50132 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-reachability` | e2a0d94366 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-refusal-codes` | eb88aa816d | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-revision-split` | b27c296d2d | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-seed-collision` | 10114fb200 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/margin-waste` | afcfddbc59 | 0 |  | n/a |  |  | L-MARGIN-WASTE-SURFACE-IS-HONEST (built-unverified) | **carried** |  |
| `lane/margin-xcurrency` | 5a5b3de8e8 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-audit-choke` | 29d66c7699 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-fiscal-scoping` | e537bac9d2 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-gate` | bf650efdcd | 0 |  | n/a |  |  | L-MEALS-GATE (verified) | **carried** |  |
| `lane/meals-next` | 49056e6057 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-pos-tender-wire` | 32fd5a86b0 | 0 |  | n/a |  |  | L-MEALS-POSREL-LAND (verified) | **carried** |  |
| `lane/meals-race-tests` | 42ea687e55 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-reach` | 320f947334 | 0 |  | n/a |  |  | L-MEALS-REACHABLE (built-unverified) | **carried** |  |
| `lane/meals-release` | af53dc84da | 0 |  | n/a |  |  | L-MEALS-RELEASE-CLUSTER-REVIEW (verified) | **carried** |  |
| `lane/meals-reservation-wire` | 56b1493e33 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-statement-immutable` | 0384222e46 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/meals-utlkvit` | 1a03bc6c8f | 0 |  | n/a |  |  | L-MEALS-UTLKVIT (built-unverified) | **carried** |  |
| `lane/meals-violation-exact` | 13cd9f18bf | 0 |  | n/a |  |  | L-MEALS-VIOLATION-EXACT (built-unverified) | **carried** |  |
| `lane/mealscfg` | d81f037b16 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/mealsdrift` | f9613482f7 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/mig-company-receivable` | 32c56fa4c7 | 0 |  | n/a |  |  | L-MIG-COMPANY-RECEIVABLE (built-unverified) | **carried** |  |
| `lane/module-audit-pins` | a5fca63c10 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/money-path-attribution` | fff3af882a | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/pdf-nullderef` | 17198f14d5 | 0 |  | n/a |  |  | L-PDF-FAMILY-LAND (verified) | **carried** |  |
| `lane/pii-log-sweep` | a8c6a0f3cd | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/piiallow` | a114520d0b | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/pinfixes` | ac76711e4f | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/pinharden` | e4e9d760a2 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/plan-doc-corrections` | 61e189601f | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/poweruser-pin-realign` | 2e593d96d7 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/poweruser-seed-honesty` | beeb1a1aa6 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/reachsweep` | a2cdb423a1 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/reservation-limiter-move` | d9189fbdc6 | 0 |  | n/a |  |  | L-COMPROOT-FAMILY-LAND (verified) | **carried** |  |
| `lane/rule34` | 5f2e4c1821 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/rulepack-jurisdictions` | 537f302e2d | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/schedule-publication-immutable` | f31b2dfb0b | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/sqlserver-trait-hygiene` | bdf8f1f8d3 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/store-market-columns` | 5176427831 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/swallow` | 28e95cd9da | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/train-demo-seed` | 8e2b57de84 | 0 |  | n/a |  |  | L-TRAIN-DEMO-SEED-REDO (open) | **carried** | Tip equals the trunk tip - the branch carries nothing. |
| `lane/train-evidence-endpoint` | c5c15f1795 | 0 |  | n/a |  |  | L-TRAIN-EVID-LAND (built-unverified) | **carried** |  |
| `lane/train-evidence-pins` | 733cb36e49 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/trainflags` | 66d5bba8f5 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/training-cas-guard` | cad060da19 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/training-etag` | c76744dbc5 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/training-evidence-surface` | 387d727d3b | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/training-next` | 6e69b32bee | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/trainrev` | f257389423 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/trainwire` | e4494c8890 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/unsub-oneclick` | b2253a74c4 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/utlkvit-replay-source` | 3a509b6859 | 0 |  | n/a |  |  | L-UTLKVIT-REPLAY-SOURCE (built-unverified) | **carried** |  |
| `lane/utlkvit-sale-row` | 1854f5941e | 0 |  | n/a |  |  | L-UTLKVIT-SALE-ROW (built-unverified) | **carried** |  |
| `lane/verified-claims-audit` | 06754037ee | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/w3-labour-band` | ee0a450d7c | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/wf-adjustment-ordinal` | cff1c005c8 | 0 |  | n/a |  |  | L-WF-ADJUSTMENT-ORDINAL (open) | **carried** |  |
| `lane/wf-cost-stability` | bbac045ca5 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/wf-export-duplicate` | 3a4442a7a1 | 0 |  | n/a |  |  | L-WF-EXPORT-DUPLICATE (built-unverified) | **carried** |  |
| `lane/wf-gate` | 1cf3b25e79 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/wf-push-notify` | f5305ced42 | 0 |  | n/a |  |  | L-WF-PUSH-LAND (verified) | **carried** |  |
| `lane/wf-push-silent` | 991c21f642 | 0 |  | n/a |  |  | L-WF-PUSH-LAND (verified) | **carried** |  |
| `lane/wf-schedimm2` | c11764a904 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/wf-supplements` | d63b5f5cb3 | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/wf-violation-exact` | cdb4c66cdf | 0 |  | n/a |  |  | L-WF-VIOLATION-EXACT (built-unverified) | **carried** |  |
| `lane/wf-w5-timesheet` | 9e82b286e6 | 0 |  | n/a |  |  | L-WF-W5-TIMESHEET (built-unverified) | **carried** |  |
| `lane/wire-tier-rowversion` | 7dbac5118a | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/workforce-audit-actor` | 1b5068b24b | 0 |  | n/a |  |  | — | **carried** |  |
| `lane/workforce-next` | 264a6bfdaa | 0 |  | n/a |  |  | — | **carried** |  |
| `master` | 3b78262741 | 0 |  | n/a |  |  | — | **carried** |  |
| `feature/c5-push-prereqs` | e11fda60d6 | 219 | 3 | 0/207 |  | 2026-07-20 | — | **historical** |  |
| `feature/rebrand-ali-port` | 8ccc1ed73c | 221 | 7 | 0/209 |  | 2026-07-19 | — | **historical** |  |
| `feature/shift-scheduling` | d5fc03f70c | 234 | 20 | 0/220 |  | 2026-07-22 | — | **historical** | Docs-only branch on a stage0-era base. |
| `feature/swiss` | 597192efa5 | 87 | 0 | 0/87 |  | 2026-07-07 | — | **historical** |  |
| `feature/twint-swiss` | a64beb03f4 | 1 | 0 | 0/1 |  | 2026-06-22 | — | **historical** |  |
| `fix/dup-tableid-migration` | 60741b4e8c | 216 | 0 | 0/204 |  | 2026-07-20 | — | **historical** |  |
| `integration/be-cutover` | 1866006685 | 210 | 0 | 0/199 |  | 2026-07-19 | — | **historical** |  |
| `lane/events-w2-anchor` | d4ba0bdc4f | 266 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/events-w2-deposits` | 969cf6cbca | 268 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/events-w2-harness` | 583e971723 | 266 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/events-w2-proposals` | 652d64d476 | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/events-w3-anchor` | 7fb4e8b425 | 316 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/events-w3-consumer` | 6230daeb00 | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/events-w3-runsheets` | 3f83d5e49c | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/events-w3-settlement` | 7dc753a42e | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/growth-w2-anchor` | d1c6c8f10e | 266 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/growth-w2-endpoints` | b249225df2 | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/growth-w2-harness` | ab827095bb | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/growth-w2-provider` | 06b76e8c0f | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/growth-w3-anchor` | 6d99b485eb | 316 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/growth-w3-dispatch` | bab12bd895 | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/growth-w3-provider` | e5d29a3efe | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/growth-w3-security` | b08e06819e | 316 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/margin-d0` | 10098b8627 | 266 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/margin-s0` | de47607f3e | 265 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/margin-w2-harness` | 033e5a76b5 | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/margin-w2-import` | bfcb0a275e | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/margin-w2-prices` | e8452b3c5d | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/margin-w2-recipes` | d867499fbc | 267 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/margin-w3-anchor` | a68c2a6f18 | 316 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/margin-w3-journeys` | 605cf3b2f1 | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/margin-w3-projector` | fae8a08bf7 | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/margin-w3-statements` | ade1361b91 | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/meals-w1` | 5a0247b4a6 | 256 | 0 | 0/242 |  | 2026-07-20 | — | **historical** |  |
| `lane/meals-w2-anchor` | 336e801c43 | 265 | 0 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/meals-w2-funding` | 374620f9dd | 266 | 1 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/meals-w2-programs` | 3105cab823 | 267 | 2 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/meals-w2-tender` | 8466a972d8 | 266 | 1 | n/a |  | 2026-07-20 | — | **historical** |  |
| `lane/meals-w3-anchor` | d7e4363e71 | 316 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/meals-w3-projection` | f94b6a9511 | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/meals-w3-statements` | 98262aabaa | 317 | 0 | n/a |  | 2026-07-21 | — | **historical** |  |
| `lane/order-created-utc` | 7a463e9b41 | 216 | 0 | 0/204 |  | 2026-07-20 | — | **historical** |  |
| `lane/w4s-attendance` | 472742285b | 260 | 1 | 0/246 |  | 2026-07-20 | — | **historical** |  |
| `lane/w4s-clock` | d426340480 | 261 | 2 | 0/247 |  | 2026-07-20 | — | **historical** |  |
| `lane/w4s-personalliste` | 7da7e3d0d5 | 260 | 1 | 0/246 |  | 2026-07-20 | — | **historical** |  |
| `lane/w4s-pos` | 448f3adba1 | 260 | 1 | 0/246 |  | 2026-07-20 | — | **historical** |  |
| `lane/wf-personalliste-write` | 1c021dac3a | 316 | 1 | n/a |  | 2026-07-21 | — | **historical** |  |
| `prep/events-landing` | e3e13973c5 | 283 | 5 | n/a |  | 2026-07-20 | — | **historical** |  |
| `prep/events-w3-landing` | eda4343f35 | 325 | 6 | n/a |  | 2026-07-21 | — | **historical** |  |
| `prep/growth-w3-landing` | f7e9d9b041 | 324 | 5 | n/a |  | 2026-07-21 | — | **historical** |  |
| `prep/margin-landing` | 0f2cda3cf1 | 284 | 7 | n/a |  | 2026-07-20 | — | **historical** |  |
| `prep/margin-w3-landing` | 2d4f889ad3 | 324 | 5 | n/a |  | 2026-07-21 | — | **historical** |  |
| `rebrand` | f531c441ab | 215 | 0 | 0/203 |  | 2026-07-20 | — | **historical** |  |

## Core submodule (`Web-modules/core`) — 3 local refs

| ref | tip | verdict | note |
|---|---|---|---|
| `wip/session-2026-08-06-all-work` | 9626a561bb | **carried** | The full-replace guard snapshot. The landed FE trunk's gitlink is `9626a56` (verified `ls-tree`) — the pointer moved with the landing. |
| `lane/core-ore-label` | 1bcab0b6b3 | **carried** | Direct parent of `9626a56`; ancestor of the carried pointer. |
| `master` | 24774d0f4e | **historical** | 2026-07-10 base. |

## Detached worktree HEADs carrying commits on no ref (7 of 53 detached)

The other 46 detached worktree HEADs sit on commits reachable from local refs. These seven do not:

| repo | worktree | commit | disposition |
|---|---|---|---|
| FE | `scratchpad/wt-german-ids` | `bfa1992` | **LEFT BEHIND** — built lane L-GERMAN-IDENTIFIER-LABELS-2; content absent at the landed trunk (see A.1). |
| FE | `~/okam/web-jestlanes` | `cbb5a98` | Safe — differs from `lane/jest-collects-lanes` @ `82127eb` only by 20 lane-evidence lines. |
| FE | `~/okam/wt-author` | `7c91177` | Safe — patch-equivalent commit inside the landing set (2026-07-29 week-grid work). |
| FE | `~/okam/wt-rateui` | `17b5cc3` | Safe — all 19 touched files exist at the landed tip; only `WorkforceRateTimeline.vue` differs, and the tip's copy is newer (last touched by the snapshot code commit). |
| BE | `~/okam/OkamAPI-w2-fastfollow` | `ddf41c61` | Superseded — its overlap-invariant test file exists at the patched tip; the two services evolved past it (2026-07-20 era). |
| BE | `~/okam/wt-pendmodel` | `66f19e23` | **LEFT BEHIND** — today's 382-line `ModelVersusChainDriftTests.cs` parented on the stack tip; on no ref (see A.2). |
| BE | `~/okam/wt-w4c` | `ec5d0062` | Safe — patch-equivalent commit inside the landing set (2026-07-29 W4 work). |

## What this lane could not determine

- **Per-lane merge simulation was not run.** `tree-eq` is a file-level proxy: `m/m` is strong evidence content is already at the landing tree, `0/m` strong evidence it is absent, but partial rows (and lanes whose files the trunk later evolved) are not decided here.
- **undetermined-stale rows** (FE 5, BE 6): late-July branches — not reachable, not patch-equivalent, no current plan lane claims them; whether later landed work superseded them was not determined. FE: `lane/events-admin`, `lane/growth-admin`, `lane/margin-recipes`, `lane/meals-admin`, `lane/workforce-roster` (all 2026-07-29 scaffolds; two siblings of the same wave — `lane/margin-menu-margin-ui`, `lane/training-admin` — proved patch-carried, so supersession is plausible but unproven). BE: `lane/demo-workforce`, `lane/events-outbox`, `lane/isofix`, `lane/meals-agreement-create`, `lane/trb2`, `lane/wire-containment-fix`.
- **unclaimed rows** (FE 4, BE 1): carry unique commits, no current plan lane claims them (the plan's lane list is pruned over time, so "no lane" does not mean "no owner"): FE `lane/fe-admin-refusal-credential` (excl=0), `lane/fe-events-margin-surfaces`, `lane/fe-training-meals-surfaces`, `lane/fe-wf-self`; BE `lane/wolt-sync-unregistered` (return file `L-WOLT-SYNC-1` exists).
- **Remote state was not consulted** — the brief scopes this to local refs; nothing here says what origin holds.
- **The estate is live.** This table is a snapshot ending ~20:05; the FE landing, the trigger-declarations lane and the train-seed lane were all observed moving during measurement and will have moved again.

---

## Correction appended by the clerk, 2026-08-06 — not an edit to anything above

**Two rows in this table are wrong, and both were found by the lane this table sent to act on them
(`L-THE-ONLY-COPIES-REACH-A-REF`). The original text above is left exactly as its author wrote it.**

**`d7b5f3f` (Wolt Drive) — row at line 77 and entry A.4.** Classified here as
`left-behind:no-ref-lane`, "exists on 10 worktree-agent refs and nowhere else". It is in fact **the tip
of `origin/main`**: `git rev-parse origin/main` returns `d7b5f3f26e`, authored by asharghi and pushed to
the remote. **Twelve refs contain it**; the enumeration missed `refs/remotes/origin/main` and
`refs/prefcentre-exec/main`. Clerk re-ran `git rev-parse origin/main` and confirms `d7b5f3f26e`. **It was
never at risk.**

**`94f06c7` (Tripletex).** Listed as an only-copy-on-no-ref. The frontend landing carried it **while this
census was mid-flight**, which the census itself flagged as a possibility. Clerk confirms
`git merge-base --is-ancestor 94f06c7 feature/restaurant-modules` succeeds; it sits 21 commits below
`ff497c07`. **Also not at risk.**

**The two that were real have been preserved**, and neither was patch-carried:
`preserve/german-identifier-labels` → `bfa1992` (frontend, clerk-verified `bfa19920e8`) and
`preserve/model-versus-chain-drift-test` → `66f19e23` (backend, clerk-verified `66f19e2363`).

**One methodological finding worth more than the two corrections**, because it would have produced the
opposite answer: `git rev-list --objects --all` reports both blobs reachable, **because `--all` examines
other worktrees' detached HEADs by default**. Under `--single-worktree` with `for-each-ref` objectnames
enumerated explicitly, **neither was reachable from any named ref**. `bfa1992` was worse off than
recorded here — its sole holder was a detached HEAD inside a session scratchpad directory, which
disappears with the session and needs no `git gc` to be lost.

# L-READ-THE-TRUNK-AS-LANDED — the 22 commits at `ff497c0`, read by someone who did not merge them

Read-only review of `feature/restaurant-modules` `e34977a..ff497c0` (22 commits, `core 1bcab0b → 9626a56`).
Method: every conflicted merge recomputed mechanically (`git merge-tree --write-tree`) and the recorded
resolution diffed against the mechanical result and against **both sides**, not against the landing
account; the translation redo recomputed with `git merge-file`; every commit's diff read against its
message (the two never-before-committed changes and the rewritten test in full; `11be859`'s money,
client, nav, POS, price and config paths in full, its large panel bodies sampled). No suite was run
(read-only lane); suite figures below are the landing lane's claims, marked as such.

**Overall: the landing is sound. No content was lost in any of the ten unverified resolutions beyond
one trivially-redundant assertion line, no commit's contents contradict its message, both rules held,
and nothing load-bearing was classified as evidence. Ten findings, none blocking, listed at the end.**

## Structure (verified, not assumed)

- Strict fast-forward re-asserted: `git merge-base --is-ancestor e34977a ff497c0` true; tip = branch.
- **Zero deletions** in the whole range (`git diff --diff-filter=D` empty) — nothing was dropped anywhere.
- `core` moved `1bcab0b → 9626a56` by `11be859` alone.
- Of the six merges, **four are byte-identical to the mechanical merge** (`99865b3`, `9087794`,
  `88f700d`, `36ac94c`) — no human hand touched them at all. All human resolution lives in `44115a2`,
  `da7759a`, and the worktree-diff application inside `eef2450`.
- Conflict arithmetic reconciles exactly: `44115a2` 3 hunks (ongoing, kitchen, wolt-menu × 1),
  `da7759a` 7 hunks (MarginCoveragePanel 2, statement-view 1, margin-waste.test 1, translations 3),
  AdminPage application 1 → **eleven**, as the evidence says.

## Verdict per resolved conflict

| # | file | verdict |
|---|------|---------|
| 1 | `pages/admin/ongoing.vue` | **CLEAN.** Lane deleted the page modal and bound `loadOrders`; owner built `startLiveBoard` (adminStores + loadOrders + checkMobile + resize + `startAutoRefresh`). Resolution = modal removal + `@login-success="startLiveBoard"`. Verified `loadOrders` alone loses the 7s poll and `adminStores` — the evidence's justification is true, not just asserted. No dangling `showLogin`/`closeLoginModal` refs (one comment mention only). Nothing from either side lost. |
| 2 | `pages/admin/kitchen.vue` | **CLEAN.** Lane's `resumeAfterLogin` = isLoading+refresh+startAutoRefresh only; owner's `startLiveBoard` additionally has `startClock()` + `fullscreenchange` listener (res lines 154–160) — the whole `0:00` defect, exactly as claimed. Resolution binds `startLiveBoard`, deletes both stale handlers. No dangling refs. |
| 3 | `pages/admin/wolt-menu.vue` | **CLEAN.** Conflict = import block. `~/utils/price` kept (amountInputValue ×2, amountLabel ×3, isAmountStated ×2 — all used); LoginModal import dropped; lane's `handleLoginSuccess`/`reloadCurrentUser`/`$refs.adminPage.openLogin()` intact. Residual res-vs-owner diff is modal-removal only. |
| 4 | `components/organisms/AdminPage.vue` | **CLEAN.** Not a git merge — arose applying the uncommitted emit-lane diff (`eef2450`). `openLogin()` (mounted-once) and the emit lane's comment both sit above `closeLoginModal`; at the tip all four lanes compose with no overlapping lines: openLogin / redirect fix + helpers / logout watch + `SIGN_IN_PATH` / untouched `initAuth`. |
| 5 | `components/admin/margin/MarginCoveragePanel.vue` | **CLEAN.** Resolution == theirs **byte-identical**; full ours→theirs diff shows theirs strictly extends ours — ours' `v-if="wasteUnknown"` survives as `v-else-if` in the four-state chain, both comment blocks extended, nothing dropped. The superset claim is true. New `wasteAbsent` prop is reachable (`:waste-absent="wasteAbsent"`, `pages/admin/margin-statements.vue:214`) and `mrgs_waste_coverage_absent`/`_unknown` exist in all three translations. |
| 6 | `utils/margin/statement-view.js` | **CLEAN.** Resolution == theirs byte-identical; ours→theirs diff is comment rewording only ("the coverage endpoint" → "`MarginCoverageResponse`"), **zero code difference**. Both sides had independently made the same absent-is-null fix — which is why they conflicted. |
| 7 | `test/margin-waste.test.js` | **CLEAN with one nit (F1).** 28 tests, no duplicate names; every theirs assertion present; every ours assertion present **except one line**: `expect(summary.byReason).toEqual([])` from ours' present-zeros test. Trivially covered elsewhere (server-order test maps `byReason`; the waste-none render test feeds `byReason: []` through `readCoverage`). The evidence's "no assertion is lost" is off by exactly this line. Non-material. |
| 8–10 | `translations/{no,en,de}.ts` | **CLEAN — recomputed.** `git merge-file` (base `8ac6f63`, ours `0cbbd99`, theirs `1d272f1`) reproduces the landed `22bac8e` files **exactly modulo the stripped conflict markers**: one hunk per file, both sides kept in order. Tip counts no **5173** / en **5138** / de **5138**; **zero** keys from either side missing at the tip; **zero** duplicates. The 351-key `--theirs` loss demonstrably did not survive. (The evidence's own 5172/5137/5137 is off-by-one vs. both my count and the clerk's — counting method, non-material: F10.) |

## The two rules

- **Adjacency held**: first-parent chain runs `44115a2` (mounted-once merged) → `eef2450`
  (ADMINPAGE-EMITS) with nothing between. Precision the record does not state: **at `44115a2` itself
  the exposure exists** — pages' modals gone, shell still comparing `fullPath`, same-page sign-in a
  dead end. The window is one commit wide, was never pushed, and the recorded revert
  (`git branch -f feature/restaurant-modules e34977a`) removes both together; only a checkout pinned
  at exactly `44115a2` would ever show the frozen board (F8).
- **Category withheld — confirmed**: zero changed paths match `*categ*`; every `category` string in
  the landed diff is personnel/training/POS-entry vocabulary. Nothing touches `category.image` or any
  product-category surface.

## Verdict per landed commit

| commit | verdict |
|---|---|
| `8ac6f63` focustrap | **Matches; clean.** The component change is exactly the `unmounted`→`destroyed` hook rename; the estate-wide sweep test is a source census but guarded (`files.length > 100`), justified in-file, and paired with behavioural tests. |
| `11be859` owner's code slice | **Matches its message** (code-only slice, evidence excluded, core pointer). C3 clean — all 6 new pages linked in `AdminPageHeader` at the tip, all 15 new utils have production callers, the POS ClockScreen is wired incl. a z-index fix that keeps it reachable before a trading day opens. C6 clean — no added UI string names a statute/§ (the § 2-8-2 refs in XReportView are HTML comments; `posclk_list_title: 'Personalliste'` sits on the screen that renders that very list from endpoint 46). C7 **net positive** — removes a live `console.log(config)` in `pages/admin/dintero.vue` where the response carries `clientSecret`, and pins the absence. C4 clean — POS punch carries no client-side identity claim (device JWT + operator session, staff resolved server-side). Findings F4, F5, F9 below. |
| `1a33ed7` failed send | **Matches; clean.** `.then((sent))` reads the boolean; `SEND_FAILED` replaces the false «Feil telefonnummer». Premise tests drive the real services. F7: cites lane evidence that lives only on the owner's snapshot branch. |
| `fbcc03a` success is silent | **Matches; clean.** Success branch stops writing `JSON.stringify(response)` into the error slot; reset at top of `login()`. The leak class (the boolean `true`, one edit from a token) is measured in-lane, and the message honestly discloses its 2 environmental test reds. |
| `99865b3` merge | **Clean** — byte-identical to the mechanical merge. |
| `0f88242` mounted once | **Matches.** Eleven pages, removal complete (remaining `LoginModal` matches under `pages/admin/` are comments; `pages/{meals,workforce}/join.vue` are outside the admin shell and the claim). `brev.vue`'s phantom `this.loadOrders()` confirmed and fixed. **Residue F3**: `orders.vue` binds `@login-success="fetchOrders()"` and `statistics.vue` binds `loadStatistics` while their `mounted` also populates `adminStores`/`selectedStoreIds` — after an in-page sign-in those stay empty. Behaviour-preserving (the deleted per-page handlers were equally partial), but it is the same recovery-is-a-subset defect class fixed on ongoing/kitchen, still latent at `ff497c0`. |
| `44115a2` merge | **Conflicts 1–3 resolved correctly** (above). Exposure window F8 noted. |
| `eef2450` ADMINPAGE-EMITS *(no prior review)* | **Matches; sound.** Compares the redirect target's **path half** against `$route.path` (`split('#')[0].split('?')[0]`); array-valued redirect takes the first; empty/non-string → null; different page still `replace(rawRedirect())` with the target's query verbatim. 10-test file pins both branches, their mutual exclusion, and close-without-sign-in. **F2 (deliberate, test-pinned)**: a same-page target carrying its own query (`redirect=/admin/ongoing?storeId=1` while standing on `/admin/ongoing`) is now answered by the event alone — the target's query is discarded, never navigated to. Nothing working was lost (the old path was the silent self-replace), but the drop is by design and should be known. No open-redirect regression: absolute-URL targets compare and `replace` exactly as before. |
| `0cbbd99` logout *(no prior review)* | **Matches; sound.** Both buttons stop `window.location.href = '/'`; the shell's watch fires only on the truthy→falsy transition, raises the sign-in and `replace`s to bare `/admin` with the redundant-navigation rejection caught. Bare `SIGN_IN_PATH` is deliberate and consistent with `eef2450` (the `?redirect=` form never emits). The post-replace resume path holds: `pages/admin/index.vue` binds `@login-success` (tip line 2), and the fresh shell instance's `initAuth` raises the modal for a signed-out visitor on `/admin`. The `toString()` assertion in the test is structural but disclosed in-file, and sits beside behavioural tests that assert the destination whole (`destinations).toEqual(['/admin'])` — cannot pass by navigating nowhere). |
| `9044589` waste honesty | **Matches.** Withdraw-not-delete, four states, reader returns null, the blessing test flipped not deleted, `createStatement` loads both reads. Suite figure (23/458) is the lane's claim. |
| `8d8b37d` browser walk | **Matches** — lane evidence + 2 e2e journey specs, nothing else. |
| `1d272f1` RETURN | **Matches** — the one `docs/` path on the trunk, a sibling lane's own commit, disclosed in the landing record rather than removed. Confirmed the only docs/ path in the range. |
| `da7759a` merge | **Conflicts 5–10 resolved correctly** (above); the translation `--theirs` mistake was made here and is visible in the mechanical-vs-recorded delta, then corrected at `22bac8e`. F1 nit. |
| `40b4884` events walk | **Matches; clean.** `Events__Enabled=true` exactly where the prior comment pointed; both probes read-only; honestly discloses the probes have **never executed live** (no SQL slot). `support/venue.js` never logs or returns the bearer token. |
| `9087794` merge | **Clean** — mechanical. |
| `ac77d25` wait diagnoses | **Matches; clean code.** Diagnosis only on the failure path, 2s budget, original Playwright error preserved, outside-in cause order. **F6**: the comment at the OTP-boxes wait describes the pre-`1a33ed7` modal ("this step still passes and six boxes still render") and is **false at the tip**, where that fix landed two commits away. Behaviourally harmless — the dead-API case now times out there and the diagnosis correctly leads with the API fact — but the trunk carries a comment asserting a defect that no longer exists. |
| `88f700d` merge | **Clean** — mechanical. |
| `94f06c7` Tripletex | **Matches; clean.** Two files only; the 2×2 outcome mapping as described; tests bite both ways (contended refusal neither red nor "completed", real failure still red). |
| `36ac94c` merge | **Clean** — mechanical. |
| `22bac8e` translation redo | **Matches — recomputed byte-exact.** See conflicts 8–10. |
| `e4d4c20` resume-test rewrite | **Matches; faithful.** The diff is exactly: a named `AdminPageStub`, a `signInThroughShell` helper, **seven** call-site swaps from `vm.closeLoginModal(true)` to emitting `login-success` through the page's own template binding, and **one** assertion change (`showLogin` → "page mounts no LoginModal of its own") which the message itself discloses. No assertion deleted; the event-through-binding path is genuinely stronger (it sees a wrong or missing binding — precisely the two mutants). The mutant table is structurally corroborated without running the suite: kitchen's describe has 4 binding-dependent tests (= "binds nothing reds 4"), ongoing's has 3 that each distinguish `startLiveBoard` from bare `loadOrders` (= "binds loadOrders reds 3"). Read with the stated suspicion — the same agent rewrote test and code — and it survives: the rewrite touches no expected value, no timer arithmetic, no fixture. Nit: the now-dead `LoginModal: true` stub entries remain in the mounts — harmless config residue. |
| `ff497c0` landing record | **Matches** — the evidence file + 2 screenshots (both present). Record is accurate throughout except the named nits: F1 is a one-line counterexample to "no assertion is lost", the key counts are off by one (F10), and the `11be859` "carries" table undersells the slice (F9). Its split table reproduces exactly against baseline `e34977a` (2464 = 1698 lanes + 603 docs + 158 code + 4 artifacts + core). |

## The split — nothing load-bearing left behind, with two edges

- **No landed file imports, requires or reads `lanes/**` or `docs/**`** at runtime or test time; all 16
  files that mention `lanes/` do so in comments citing evidence. Jest excludes `<rootDir>/lanes/`
  (anchored, reasoned); Playwright's `testDir` is `test/e2e/journeys` only.
- **F4**: `scripts/drift-demo/demo.sh` hardcodes the owner's checkout path and a session-specific
  scratchpad as defaults and copies `docs/plan/plan.md`/`intent.md` — files **not in the `ff497c0`
  tree**. Committed code whose inputs stayed behind as evidence; works only on this machine while the
  snapshot branch's tree exists. Low severity (demo tooling), but it is the one true instance of the
  hazard this review was asked to look for.
- **F5**: the rewritten `.gitignore` claims five journey records are force-added under version
  control; only the four `workforce-invitation-onboarding*` paths landed — the two growth records
  (`growth-guest-lifecycle`, `growth-testsend-refusal`) are absent from the tree (and from the
  snapshot's diff). The spec files landed; the named artifact evidence did not. If a lane exit cites
  those artifacts, that evidence is not on the trunk.

## Findings (none blocking)

- **F1** `test/margin-waste.test.js` resolution drops one assertion line (`byReason` empty-equality on
  the zero block); evidence claimed none lost. Redundantly covered; non-material.
- **F2** `eef2450`: same-page redirect target's own query is discarded by design (event instead of
  navigation). Pinned by its test; recorded here so it is a decision, not a surprise.
- **F3** `orders.vue` / `statistics.vue`: `login-success` bound to a partial starter
  (`fetchOrders()` / `loadStatistics`); `adminStores`/`selectedStoreIds` stay empty after in-page
  sign-in. Latent at `ff497c0`; same class as the defect fixed on ongoing/kitchen. Candidate follow-up lane.
- **F4** `scripts/drift-demo/demo.sh` depends on left-behind snapshot files and a hardcoded machine path.
- **F5** `.gitignore` claims two growth journey records are committed; they are not on the trunk.
- **F6** `test/e2e/support/admin.js` comment describes a defect `1a33ed7` already fixed; false at tip.
- **F7** Commit messages / test headers (`1a33ed7`, others) cite `lanes/...` evidence files that live
  only on the owner's snapshot branch — the trunk points at evidence it does not carry. (The landing
  deliberately left `lanes/` behind; the pointers still resolve on the snapshot branch, which is kept.)
- **F8** The mounted-once exposure window is one commit wide at `44115a2` — real but never pushed;
  the tip and the recorded revert are both safe.
- **F9** The landing record's "carries" table for `11be859` is materially incomplete: the POS
  clock/punch surface, margin-recipes revise flow, the price-gate program, two growth journeys, and a
  dintero destructive-save fix (blank-form Save over live credentials — a real fix worth knowing
  about) all landed but are unlisted. Contents exceed the account; nothing contradicts it.
- **F10** Evidence's translation key counts (5172/5137/5137) are one below the measured tip counts
  (5173/5138/5138). Counting method; no key is missing from either side.

## What this review could not do

No suite, no browser, no container (read-only lane): the 144/3192 suite figure, the 3-journey
Playwright pass and the 2-polls-in-9-seconds browser measurement are the landing lane's evidence,
consistent with everything read here but not re-executed. Per C5, none of that is acceptance anyway —
acceptance remains the owner walking the journeys himself.

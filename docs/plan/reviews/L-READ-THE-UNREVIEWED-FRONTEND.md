# L-READ-THE-UNREVIEWED-FRONTEND — the 23 commits at `a63c30f`, read by someone who did not land them

Read-only review of `feature/restaurant-modules` `ff497c0..a63c30f` (23 commits: 10 first-parent —
7 merges, 2 lane records, 1 evidence commit — and 13 lane commits). Method follows
`L-READ-THE-TRUNK-AS-LANDED.md`: every merge recomputed mechanically (`git merge-tree --write-tree`)
and the recorded tree compared byte-for-byte; every merged file classified lane-take / trunk-kept /
mixed against base, lane tip and first parent; every resolved conflict diffed against **both sides**;
translation key sets extracted by evaluating all three dictionaries at every trunk commit; every
non-merge commit's diff read against its message. No suite was run (read-only lane); all suite
figures below are the landing lanes' claims, marked as such.

**Overall: the landing is sound. No content was lost anywhere in the range — the single vanished
translation key is a deliberate, test-pinned removal — every resolved conflict is correctly taken,
every merge message's claims reproduce under mechanical recomputation, no commit's contents
contradict its message, and no new test was found that cannot fail. Seven findings, none blocking;
the one worth a follow-up lane is G1.**

## Structure (verified, not assumed)

- `git merge-base --is-ancestor ff497c0 a63c30f` true; `feature/restaurant-modules` = `a63c30f`.
- **Zero deletions** in the net range diff (`git diff --diff-filter=D ff497c0 a63c30f` empty).
- **Six of the seven merges are byte-identical to the mechanical merge** (`993f185`, `cec420a`,
  `6f74f87`, `811818c`, `5826a2e`, `a63c30f`). All human merge resolution lives in `04a8f81`
  (3 conflicted files); one further hand resolution lives *inside* the cherry-pick `698383c`
  (`test/e2e/fixture/api-server.js`). Both verified below.
- Two merged lanes (`04a8f81`'s chain `c4a4fa4..c8f26d5`, `811818c`'s chain `4465d02..627e34a`)
  fork at `e34977a` — **before** the previously reviewed range — so they merged across the largest
  trunk delta. Where their files are absent from the merge payload it is because `11be859` (the
  owner's slice, read by the prior review) already carried **byte-identical** blobs: verified for
  `price-bypass-legacy.test.js`, `XReportView.vue`, `products.vue`, `settlements.vue`,
  `kravia-invoice.vue`, `reward-members.vue`, `OnboardingProductImages.vue` (lane blob == ff497c0
  blob == tip blob for all seven).
- Unlike the `ff497c0` landing, this range **commits `lanes/**` evidence onto the trunk** (~90
  files). Nothing under `lanes/` is imported, required or read by any landed production or test
  code path; it is inert evidence. A policy change from the prior wave, noted, not a defect.

## Verdict per resolved conflict

| # | where | file | verdict |
|---|------|------|---------|
| 1 | `04a8f81` | `pages/admin/wolt-menu.vue` | **CLEAN — resolved to the TRUNK, correctly.** Resolution == ours byte-identical. The lane (forked pre-modal-removal) would have restored `import LoginModal`; the trunk deleted that page's duplicate modal deliberately. Verified the lane's *real* work in this file — the `amountLabel`/`amountInputValue`/`isAmountStated` price fix, the blank-field guard in `updateItemPrice`, the `isAmountStated` snapshot — was **already on the trunk** via `11be859`, byte-identical, so taking ours lost nothing. Res-vs-theirs diff is modal-removal only. |
| 2 | `04a8f81` | `utils/price.js` | **CLEAN — resolved to the LANE, correctly.** Resolution == theirs byte-identical. Only two **comment** lines of ours are dropped (replaced by the longer nine-row doc); the only code delta is the *added* `isDeductionInPlay` export. Trunk's export set is a strict subset of the merged one, as the merge message claims. |
| 3 | `04a8f81` | `test/xz-negated-absence.test.js` (add/add) | **CLEAN — resolved to the LANE, correctly, and strictly stronger.** Ours' single-file `XReportView.vue` scan (which sliced at `indexOf('</template>')` — the vacuous-slice hazard) is dropped in favour of a directory-wide scan over `components/admin/pos/*.vue` that first proves its own reach: file count > 20, all four ex-offenders present, every file has a root `</template>`, and the scanned region demonstrably reaches the discount rows past nested template blocks. The dropped assertion is subsumed, not lost. |
| 4 | `698383c` (in-commit, cherry-pick of `e8d69fc`) | `test/e2e/fixture/api-server.js` | **CLEAN — resolved by content, as its message claims.** The only trunk lines absent at `698383c` are `invitations: {}` / `pendingByStaff: {}`, both **replaced by seeded versions** (`wfinv_seeded_lapsed_kari`), not lost. The trunk's #8/#9 role-catalogue block and the lane's #6b/#6c invitation routes are both whole at the result; the stale `world.ROLES` one-liner is gone because the trunk deleted it. |
| 5–7 | `811818c` | `translations/{no,en,de}.ts` (auto-merged, mixed) | **CLEAN — recomputed.** Trunk 5187/5152/5152 → 5196/5161/5161; the nine gains are exactly the label keys the message lists; no trunk key absent; the trunk's own `wholeAmount`/`fractionAmount` comment survives. The message's counts reproduce exactly. |
| 8 | `04a8f81` | `components/molecules/CustomerInfoModal.vue` (auto-merged, mixed) | **CLEAN.** Merge net effect == lane intent exactly: deletion of dead `calculateTotalRewards()` (zero callers at tip — grep confirms), with the trunk's own 7+/12− evolution elsewhere in the file preserved. The merge message's "silent resurrection" sweep names this file and is right. |
| 9 | `811818c` | `plugins/global-mixin.js`, `test/e2e/fixture/world.js` (auto-merged, mixed) | **CLEAN.** Both net effects == lane intent modulo pure positional offset from trunk-side additions; nothing the trunk added since `e34977a` is reverted. |
| 10 | `a63c30f` | `translations/{no,en,de}.ts` (auto-merged, mixed) | **CLEAN.** +1 key per locale (`trn_store_versions_unknown`), zero losses, zero value changes to shared keys. |

All other merged files in all seven merges classify as **lane-take on a file the trunk never
touched** — no resolution existed to get wrong.

## Translations — the known danger, measured

- Key counts at every trunk commit (no/en/de): `ff497c0` 5173/5138/5138 → `cec420a` 5187/5152/5152
  → `811818c` 5196/5161/5161 → `a63c30f` **5197/5162/5162**. Monotonic; no transient dip at any
  step; adjacent-step set-diffs run at every trunk pair.
- **Exactly one trunk key went missing across the range, and it is deliberate**:
  `wfr_access_no_list`, removed in all three locales by `698383c` (landed at `cec420a`) because its
  value claimed "the API has no such routes" and the same commit builds the client for exactly those
  routes. Zero remaining `$i('wfr_access_no_list')` callers at tip; the removal is **pinned by a
  test** (`workforce-roster-components.test.js`: `toBeUndefined()` in all three locales, plus a
  regex sweep of the whole `wfr_` namespace for the absence claim in all three languages).
- **+25 keys per locale, identical sets across locales**; zero duplicate keys (checked by raw-line
  vs parsed-key comparison); **zero value changes to any key shared between `ff497c0` and tip**.
  None of the 25 added values names a statute, forskrift or § (C6 scan clean).
- The 351-key class of loss demonstrably did not recur.

## Verdict per landed commit

### Wave 2 (lanes forked at `ff497c0`)

| commit | verdict |
|---|---|
| `894a3b9` orders/statistics resume | **Matches; clean.** Closes the prior review's F3 exactly: ONE starter method per page (`startOrdersView`/`startStatisticsView`), run by `mounted` and bound to `login-success`; `loadSettingsFromLocalStorage` deliberately outside the starter with the reason stated. The 491-line test drives sign-in as an **event through the shell stub** (a wrong or missing binding reds it), asserts product state and DOM with server-shaped fakes that filter by `storeIds`, includes a reachability proof against the real `AdminPage`, and a late-mount ≡ fresh-mount equivalence check. Bites. |
| `698383c` roster list/revoke | **Matches; clean.** The panel/client/comment inversion is honest: backend trunk (`OkamAPI` `feature/restaurant-modules`, read at `a1c1a6df`) really binds `GET .../invitations` and `POST .../invitations/{id}/revoke` (`WorkforceStaffController.cs:181,201`). null-is-unknown vs []-is-none carried through template, props and tests; `state` vs `isLive` distinction enforced at every layer; token never rendered (pinned by a test that *feeds* a token and asserts it does not reach the DOM). In-commit conflict = conflict #4 above, clean. Its own translation-conservation claims reproduce. |
| `ff74b10` journey evidence | **Matches.** Artifacts + regenerated onboarding record only (the stale step name/absence note its own parent had falsified). No production code. Honestly refuses the wrong-tree capture from the dirty worktree. |
| `894a3b9`→`993f185`, `698383c/ff74b10`→`cec420a`, `ba2016f`→`6f74f87` | **All three merges mechanical, byte-identical, payload = lane files the trunk never touched.** |
| `ba2016f` demo portability | **Matches; clean.** Fixes prior F4 (hardcoded `SRC=/Users/svendaneel/...` → repo-relative with `DRIFT_DEMO_SRC` override; scratchpad default → `$TMPDIR`; preflight names each absent input; skip ≠ verdict, exit 3 for ran-with-skips) **and** prior F5 (`.gitignore` no longer claims the two growth journey records are committed; says where they stopped and how to land them). Grep confirms no machine path remains. |
| `42a44de` second-wave record | **Matches.** Evidence only. Claims 145 suites / 3216 tests at `6f74f87` and pairwise-disjoint file sets — the disjointness is consistent with my classification (every wave-2 payload file is a trunk-untouched lane-take); the suite figure is the lane's claim. |

### Wave 3 (lanes forked at `e34977a`)

| commit | verdict |
|---|---|
| `c4a4fa4` five legacy pages | **Matches.** Every code blob it produced is byte-identical to what `11be859` had already landed at `ff497c0` (verified per file), so its content was effectively read by the prior review; nothing new reached the trunk from it beyond history. |
| `b150668` six report rows | **Matches.** Same situation: `XReportView.vue` and `price.js`/xz-test content superseded by later lane commits or already trunk-identical; what reached the trunk is via conflicts #2/#3, verified. |
| `799f05d` three POS discount rows | **Matches; clean.** Exactly the port it claims: `−{{ priceLabel }}` → `negatedPriceLabel` at `PosReceiptView`/`CheckLine`/`CheckPanel`, plus the widened no-allowlist scan. The message's own ruling on `CheckPanel.vue:293` (leave `g.discountAmount || 0`, flag the real site) is honest and is *reversed with cause* one commit later. |
| `c8f26d5` check discount sum+guard | **Matches; clean.** `statedSum` + `isDeductionInPlay` land together with the guard flip at both `v-if` sites and `SellScreen.onNegativeSale`; the message's three-worlds story is exactly what the diff does. `check-discount-sum.test.js` proves against the server's own arithmetic (`SUM(lineAmount) − finalAmount`), asserts the absent world renders the unknown mark and **no manufactured figure**, covers the one-absent-group-poisons-the-total case and the pay-button total in every world. Bites. |
| `04a8f81` merge | **Conflicts 1–3 + mixed file 8 resolved correctly** (above). Its long message — including the resurrection sweep and the "first two lanes already on the trunk by another route" account — reproduces under mechanical check. |
| `4465d02` payment map | **Matches; clean.** Ten-case Norwegian switch → 17-member key map + `orders_paymentUnknown` fallback; the POS cash/terminal defect story is real (the map covers `Cash`/`SurfboardTerminal`). All 30 keys the three maps + fallbacks reference exist in all three locales at tip (verified by evaluation, not grep). |
| `fff21f6` receipt floor inherited | **Matches — recomputed.** All three blob SHAs named in the message verify byte-exact against the commit (`548e426…`, `5e5ccd0…`, `2a1a23c…`). Honestly discloses it lands another lane's uncommitted floor verbatim. |
| `627e34a` Swiss receipt labels | **Matches; clean.** Delivery/status literal switches → key maps, populations read from the backend enums with the `GroupedHomeDelivery` non-member carried *and documented* rather than silently dropped (a behaviour decision explicitly not taken); `OrderCard` gains a `data-test` hook replacing a two-language regex selector; fixture gains `storeVAT`/`paymentType` so the journey can actually measure the receipt. The spec extension writes its expected German out as literals and separates asserted labels from recorded-only findings. |
| `811818c` merge | **Mechanical; mixed files 5–7, 9 verified** (above). Its key-count table matches my measurement digit for digit. |
| `b4f586a` two analysis findings | **Matches.** Two `finding.md` files, nothing else; the message's backend claims (blank payer line for six members; raw `CompanyAccount` on a Norwegian fiscal receipt) are consistent with the flags staying open. Evidence-only. |
| `0d6692d` wave-3 record | **Matches.** Evidence + the two checking tools. Claims 3543/3543 at its tip; consistent arithmetic with the clerk's 3216 baseline; lane's claim, not re-executed. |

### Final wave (lanes forked at `42a44de`)

| commit | verdict |
|---|---|
| `0719ec8` front door | **Matches; sound — with finding G1.** `initAuth` now withholds the door on a route it is leaving, restores it on a **rejected** navigation (and deliberately not when an old router returns `undefined` — reasoned in-file), keeps it on `SIGN_IN_PATH` and on redirect-carrying routes; the four pages (`overview`, `offers`, `kam`, `goods`) split "who are you" from "are you privileged" so a bare `push('/admin')` no longer eats the shell's in-flight `?redirect=`. The `wrapped.vue` exemption is a **regression this lane shipped, caught in a browser, and reverted** — disclosed with its evidence. The flipped assertion in `admin-page-auth.test.js` (`showLogin` `true`→`false` on a bouncing route) is the fix's own inversion, disclosed in-file. The new 8-test suite pins both rules plus an estate-wide source scan so a fifth page acquiring the pattern reds. |
| `89f4b73` training forms | **Matches; clean.** `assignable`/`recordable` re-derived from the **store's** flattened version set (`storeVersions`) instead of the expanded course; unknown vs empty separated (`versionsAreUnknown`, new `trn_store_versions_unknown` in all three locales); option labels gain the owning course title. All callers of the re-signatured helpers updated (grep at tip: page + tests only). The paired backend half is **already on the backend trunk** (`TrainingCourseSummary.Versions`), so the "land that first or both together" instruction is satisfied. The replaced test (`with no course selected neither panel is offered anything`) pinned the defect and is inverted by name, not silently deleted. |
| `5826a2e`, `a63c30f` merges | **Both mechanical, byte-identical; payloads are trunk-untouched lane-takes** plus the verified translation auto-merge (#10). The wave's "zero conflicts" claim is **true on this repo's two merges** — and my classification shows why it is unremarkable rather than suspicious: every payload file was untouched on the trunk side. |

## Tests that cannot fail — the hunt came back empty

Every new suite in the range was read against "would it red if its subject broke":

- `orders-and-statistics-resume-after-login.test.js` — event-through-binding, state/DOM assertions,
  server-shaped fakes; the assertion shape that let the defect through twice is explicitly avoided. Bites.
- `check-discount-sum.test.js` — server-arithmetic oracle, three worlds, negative controls
  (`not.toContain(MINUS_SIGN)`, `not.toContain('kr 30,00')`). Bites.
- `xz-residual-sites.test.js` — mounted at all three sites, stated-keeps-sign positive control
  beside every absence assertion, whole-surface `MINUS_SIGN + UNKNOWN_AMOUNT` pairing sweep. Bites.
- `xz-negated-absence.test.js` (widened) — guards its own vacuity three ways before asserting
  (non-empty dir, ex-offenders present, root-template reach past nested `</template>`). The prior
  estate defect — a scan whose haystack was empty — is precisely what its guard block exists to red on.
- `payment-type-label.test.js` / `order-label-dictionaries.test.js` — exact-set equality between map
  and enum, expected words as **literals** (never resolved through the map under test — the
  self-comparison trap is named and avoided in-file), mounted rendering per surface, real negative
  controls (de ≠ no, unknown fallback asserted). Bites. See G4 for the inherent cross-repo limit.
- `sign-in-door-is-on-the-page-that-keeps-it.test.js` — asserts the door's absence *and* presence
  per route class, the refused-navigation fallback, the sub-3.1-router non-fallback, and an
  estate-wide offender scan whose empty-result risk is bounded (a missed `mounted` hook skips a
  file, it cannot false-pass an existing offender — all four ex-offenders currently match its shape).
- `workforce-roster-{client,components}.test.js` additions — contract pins on URL/verb/headers and
  behavioral DOM assertions incl. a fed-token-never-rendered pin. Bites.
- Training test additions — defect-pinning tests inverted by name; unknown-vs-empty separated in
  assertions. Bites.
- E2e specs (`workforce-invitation-list-revoke.spec.js`, scroll-lock extension) — read only (no
  browser in this lane): 43 expects across meaningful steps incl. a stale-list race and the
  claimed-code 409; expected sentences written out as literals; a console-error gate with a named
  noise filter. Structurally sound; execution evidence is the lanes' own.

## Findings (none blocking)

- **G1 — the four front-door pages cannot resume from an in-page sign-in** (`overview`, `offers`,
  `kam`, `goods`). `0719ec8` makes a signed-out stand on them possible (a `?redirect=`-carrying URL
  skips the bounce — the exact reachability `894a3b9`'s own test proves for orders/statistics — and
  the refused-navigation fallback raises the door in place), but none of the four binds
  `@login-success`, so after an in-page sign-in the page's early-returned `mounted` never re-runs:
  no data, no filters — and the KAM/PowerUser **privilege bounce never executes** until a reload.
  This is the same recovery-is-absent class `894a3b9` fixed two merges earlier in this very range.
  Low reachability, behaviour-not-worse-than-before (the old code ate the redirect entirely), but it
  is a live latent gap. **Exact change**: bind the signed-in body of each page's `mounted` to
  `@login-success` as a single starter, the `startOrdersView` shape — or have the shell `replace` to
  the same route on login-success when the page binds nothing. Ten further pages mount the shell
  without a binding (`allergens`, `categories`, `category-editor`, `employees`, `payment`,
  `reward-members`, `settlements`, `terminals`, `wolt-calc`, `wolt-drive-invoice`) — pre-existing,
  not this range's doing, but the same sweep would close them.
- **G2 — `lanes/**` now lands on the trunk.** ~90 evidence files (screenshots, walk JSONs, suite
  transcripts) are now version-controlled on the trunk, reversing the `ff497c0` landing's deliberate
  split (whose prior-review finding F7 was that trunk pointers dangled). Consistency has flipped
  direction: fine either way, but it should be one policy, chosen on purpose.
- **G3 — suite figures are claims.** 3216 (`42a44de`), 3543 (`0d6692d` receipt), 3563 (brief, at
  tip) are landing-lane numbers; this lane ran nothing. Per C5 none of it is acceptance anyway —
  that remains the owner walking the journeys.
- **G4 — the enum populations are snapshots.** `payment-type-label.test.js` and
  `order-label-dictionaries.test.js` hardcode the backend member lists (with values, citing
  `8e2b57de`). A member the backend adds later reds nothing here — inherent to a cross-repo test and
  disclosed in-file; the maps' narrow fallbacks keep such a member *visible* on screen as
  unknown/not-set rather than mislabelled. Recorded so nobody mistakes the suite for a cross-repo
  contract check.
- **G5 — `ListInvitations` no-token test half-pins the fixture.** The client test asserts the
  response element carries no `token`/`tokenHash`, but the response is the test's own fake; the
  server-side property is the backend's to prove. The **panel** test is the real guard here (feeds a
  token, asserts it never reaches the DOM). Cosmetic.
- **G6 — `89f4b73` is wire-coupled to the backend half.** The frontend renders versions off the
  course list; a deployment where the backend trunk's `TrainingCourseSummary.Versions` has not
  shipped shows "unknown" on both write forms (the honest degraded state, not a crash). The pairing
  is satisfied on the backend trunk today; the deploy-ordering note in the commit message stands.
- **G7 — `894a3b9`'s two pages restore differently.** Orders restores the saved store selection from
  localStorage inside its starter; statistics selects all (each mirrors its own pre-existing
  `mounted`). Faithful preservation, not a defect — recorded so the asymmetry is known to be old.

## What this review could not do

No suite, no browser, no container. The Chromium probes (404/453/478/485 ms), the 4/4-vs-0/4 paired
walk, the journey artifacts and every suite count are the landing lanes' evidence — consistent with
everything read here, not re-executed. Backend routes were verified by reading
`/Users/svendaneel/okam/OkamAPI` at `feature/restaurant-modules` (`a1c1a6df`), read-only.

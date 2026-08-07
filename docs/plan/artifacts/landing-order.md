# Landing order — computed and proven by throwaway composition (2026-08-07)

Lane: L-THE-LANDING-ORDER-IS-COMPUTED-AND-PROVEN. Every merge below was performed on a detached
HEAD in a throwaway worktree (`Web-modules-wt/L-LANDING-ORDER`, removed after) with `core` pinned
per the composed tree; **no trunk moved** — `feature/restaurant-modules` stands at `d4c308e`
before and after. Tier = `npx jest --ci`, gated on `uptime` separately.

## Scope, and the premises re-verified

The cohort is the thirteen 2026-08-07 branches. Verified at the tips, not assumed: `aff616d` is
**not** an ancestor of `d4c308e`; `8d4d1b0` **contains** `aff616d`; `6d43520` **contains**
`6670619`, whose core gitlink is `a6ae241`. Two brief facts corrected by measurement: the
`artifacts/` ignore rule sits at `.gitignore:111` (not `:119` — same bare rule, the file moved
under the number), and core `a6ae241` is a **straight fast-forward from the trunk pin** `9626a561`
(a naive `merge-base --is-ancestor` in the main store reports failure only because the object is
absent there — see the two-repo section).

## The thirteen collapse to eight landable units

| unit (land this) | tip | base | subsumes | reported tier at tip | reconciled |
|---|---|---|---|---|---|
| `lane/mutation-runner-cannot-delete-work` | `c65b19c` | `d4c308e` | — | 169/4020/0 | **re-measured: exact** |
| `lane/register-stops-trusting-a-session-id` | `1c607fd` | `d4c308e` | — | 168/4011/0 | composed +4: exact |
| `lane/wolt-status-labels-translate` | `32518da` | `d4c308e` | — | 169/4063/0 | composed +56: exact |
| `lane/flag-corpus-remeasured` | `6026d35` | `d4c308e` | — | docs-only, no code | n/a |
| `lane/meals-events-screens-tested` | `5ed9664` | `7a378e4` | — | suites 29/49/37 green | composed +115 (see seam 1) |
| `lane/export-flag-unread` | `8d4d1b0` | `aff616d` | `lane/workforce-screens-tested` `aff616d` | 171/4045/0 | composed +106: exact — the deliberate red at `aff616d` is FIXED by this lane |
| `lane/a-module-off-names-the-module` | `2ce83f6` | `00d84d7` (trunk ancestor, older) | — | 165/3886/0 **against an old base — unreconcilable as reported** | **re-measured composed: +12, 0 new red** |
| `lane/a-failed-report-read-reaches-the-operator` | `6d43520` | `d4c308e` | `lane/every-report-read-says-why` `6670619`, which contains `lane/growth-poweruser-tested` `fddb06c` patch-exactly | 171/4103/0 | composed +96: exact; growth's 3 DEFECT arms turn green |
| `lane/guest-code-was-right` | `40ab62d` | `d4c308e` | `lane/offer-page-stops-telling-untruths` `52a93c5` **and** `c65b19c` (merged in) | 170/4044/0 | composed +24 (see seam 3) |

`fddb06c`, `aff616d`, `6670619`, `52a93c5` must NOT be landed separately — each is inside a unit
above; landing one after its container is a no-op at best and a same-file collision at worst
(`6670619` and `fddb06c` carry different versions of `test/growth-poweruser-page.test.js`).

## The composition, step by step, as measured

| step | merged | merge | tier after |
|---|---|---|---|
| base | `d4c308e` | — | 168 / 4007 / 0 |
| 1 | `c65b19c` | clean (ff) | 169 / 4020 / 0 |
| 2 | `1c607fd` | clean | 169 / 4024 / 0 |
| 3 | `32518da` | clean | 170 / 4080 / 0 |
| 4 | `6026d35` | clean (docs only) | unchanged |
| 5 | `5ed9664` | clean | 173 / 4195 / **1 red — SEAM 1** |
| 6 | `8d4d1b0` | clean | 178 / 4301 / 1 (same red) |
| 7 | `2ce83f6` | clean | 179 / 4313 / 1 (same red) |
| 8 | `6d43520` + core `a6ae241` | clean; gitlink `9626a56 → a6ae241` | 182 / 4409 / 1 (same red) |
| 9 | `40ab62d` | clean | 183 / 4433 / **10 red — SEAM 3 adds 9** |

Every git merge is clean — **all ten reds are semantic, invisible to git**, which is why this proof
ran tiers and not just merges.

## The three seams — two real (measured), one refuted (measured)

**SEAM 1 — the runner guard forbids the runner the meals branch carries. 1 red,
order-independent.** `c65b19c`'s tree-wide pin (`test/mutation-runner-restore.test.js`: *"no
mutation runner anywhere under docs/plan/lanes/ restores from git"*) reds on
`docs/plan/lanes/L-THE-LAST-UNTESTED-MEALS-AND-EVENTS-SCREENS/mutate.js`, which `5ed9664` commits
— the very `git checkout --` restorer already flagged today. Whichever of the two lands second
reds the tier. **Resolution: the in-flight runner-fix lane (or a seam commit converting that
runner to `test/support/mutate.js`'s restore) must land inside the same tranche as the second of
the pair.**

**SEAM 2 — refuted.** I predicted `2ce83f6` (module-off refusals, eight workforce pages, off an
older base) would collide with the workforce suites (`aff616d`/`8d4d1b0` assert refusal strings;
both edit `pages/admin/workforce-timesheets.vue`). Measured: merge clean, tier +12 with no new
red. No reconciliation needed. (Its return also names a **backend half** — non-SQL 4883/0/10 on an
OkamAPI branch this repo cannot see; the landing lane must locate and pair it, or land the
frontend knowingly ahead.)

**SEAM 3 — the offer fix reds nine arms of the meals suite. 9 red, named.** `40ab62d` (carrying
`52a93c5`) fixes the guest offer page; `5ed9664`'s `test/offer-code-guest-page.test.js` then reds:
all five `THE DEFECT:` pins (the convention working exactly as designed — the fixer must rewrite
them) plus four behaviour arms whose asserted rendering legitimately changed (*a send that failed
outright also leaves the guest on the first step*; *a wrong code is refused in place, and the guest
can correct it*; *an offer the server refuses puts up a page the guest can act on*; *a Swiss guest
whose offer will not load is told so in German*). **Resolution: a seam commit rewriting those nine
arms ships in the same tranche as `40ab62d`, per `D-HOW-A-KNOWN-DEFECT-IS-PINNED`.**

## The two-repo unit, and where `a6ae241` actually lives

`6d43520`/`6670619` require core `a6ae241` (parent exactly `9626a561`, the trunk pin). **That
commit exists nowhere on this machine except as
`lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/core-a6ae241.bundle` on branch `6670619`** — I swept
the main core store and all ~50 worktree module stores; zero hits. The bundle restore recipe
(`TWO-REPO-LANDING.md`, same directory) is **proven**: fetched into the throwaway worktree's core
store, checked out, and step 8's tier ran green on it. On any real push, core must go first —
`9626a561` before `a6ae241` — and note `9626a561` is itself absent from the Core remote
(pre-existing condition, recorded by that lane).

**Adjacent preservation warning:** core commits `4f31003` (`lane/ore-padding-operator-clients`)
and `1bcab0b` (`lane/tier-artifacts`, `lane/ack-receipt-survives-reload`) are ALSO absent from the
main core store and live only in ~50 worktree-local module stores — any broad worktree cleanup
destroys them. They should be bundled the way `a6ae241` was, before any tidy-up.

## The total order

Tranche boundaries exist for exactly two reasons: seam commits (1 and 3) and the two-repo push
order. Everything else is proven order-free by the clean composition above.

1. **T1 (proven green):** `c65b19c` → `1c607fd` → `32518da` → `6026d35`. Tier lands at 170/4080/0.
2. **T2:** `5ed9664` **with the SEAM-1 runner fix** in the same tranche. Green afterwards.
3. **T3 (proven, no seam):** `8d4d1b0` (retiring `aff616d`), then `2ce83f6` (backend pairing noted).
4. **T4 (two repos):** restore core `a6ae241` from the bundle → land `6d43520` (retiring
   `6670619` and `fddb06c`). Core precedes frontend on any push.
5. **T5:** `40ab62d` (retiring `52a93c5`) **with the SEAM-3 nine-arm rewrite** in the same tranche.

End state if followed: 183 suites / 4433 tests / 0 red (the ten measured reds are exactly the two
seams' and both are closed by their named commits).

## Arity sweep on the composed tree

Import-resolution: every named import from the six modules the composition changes
(`test/support/{fake-chart,mutate}.js`, `utils/request-failure.js`,
`utils/workforce/{context-refusal,pos-clock-state,timesheet}.js`) resolves — zero unresolved.
Signature-vs-call-site: 177 sites checked; 26 raw flags, **all 26 adjudicated false** — homonyms
in files that import none of the changed modules (`flagState`, `formatMinutes`, `restore` have
unrelated local namesakes in training/rates/e2e code), plus a nested-paren bug in my own counter
(recorded here so nobody trusts the raw flag count). The `GrowthMarketingFooter` failure class is
additionally excluded by the tiers themselves: every step's suite executed with only the two
attributed seams red.

## Out of scope, recorded

The four older 08-06 heads are not part of the dozen and need their own reconciliation:
`lane/L-A-MENU-WITHOUT-PICTURES-STILL-SELLS` `96f18de` (2/2 commits unlanded),
`lane/ore-padding-operator-clients` `c3695f1` (2/2, foreign core pin `4f31003`),
`lane/tier-artifacts` `b1a2872` (12/12, foreign core pin `1bcab0b`),
`lane/ack-receipt-survives-reload` `ac6ed72` (66/103, a 103-commit session line, foreign core pin
`1bcab0b`). None is in the order above.

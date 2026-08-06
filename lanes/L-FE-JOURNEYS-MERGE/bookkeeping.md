# What the plan says about lane-only walks, and what is true after ddc27fa

Verified against `lane/fe-journeys` (tip `de0d66b`), `feature/restaurant-modules`
(tip was `033d180`), and `docs/plan/plan.md` as of 2026-08-02.

## 1. The count is six, not four

The brief and `plan.md:4263-4270` say **four** walks are `driven · lane only` on
`lane/fe-journeys`. The plan itself marks **six**:

| plan.md | walkthrough | spec |
|---|---|---|
| 194 | a recipe becomes a margin | `margin-recipe-to-margin.spec.js` |
| 217 | a week reconciled and frozen | `margin-statement-week.spec.js` |
| 355 | standing a pilot up | `meals-admin-setup.spec.js` |
| 380 | an employee claims their code | `meals-guest-claim.spec.js` |
| 465 | a course becomes evidence | `training-course-to-evidence.spec.js` |
| 542 | a guest joins the newsletter | `growth-guest-consent.spec.js` |

`L-JOURNEY-COVERAGE-THREE` landed rows 194 and 465 at `174a550`. Its own return
also said "all four", so the undercount originated there and the brief inherited
it. The remaining four happened to equal the brief's number by coincidence, not
because the brief was right.

**After `ddc27fa` all six are on `feature/restaurant-modules`.** Rows 194 and 465
have said `lane only` since `174a550` and were already wrong before this lane ran.

## 2. A seventh walkthrough is still lane-only, on a different lane

`plan.md:121` — **getting a new hire signed in**, `lane/fe-wf-onboard`,
`test/e2e/journeys/workforce-invitation-onboarding.spec.js`. Not on
`feature/restaurant-modules` and not in this lane's scope. It needs its own pass.

## 3. `plan.md:258-260` asserts a fix that was not on this branch

> Driving found two different coverage figures answering to the same test hook …
> Fixed on `lane/fe-journeys`, so it is live at the branch tip today.

It was not. Both `MarginCoveragePanel.vue` and `MarginStatementFiguresPanel.vue`
still emitted `data-test="coverage-percent"` at `033d180`; the split landed here
as `coverage-window-percent` / `statement-coverage-percent`. True now.

## 4. `plan.md:424-429` is now out of date in the other direction

> The claim page does not work at the branch tip … Fixed on `lane/fe-journeys`
> and unmerged — so `L-MEALS-CLAIM` has landed over a capability that does not
> work on the branch it landed on.

Accurate when written. The fix is on this branch as of `ddc27fa`, proven by
mutation: reverting it reds `meals-guest-claim` on `authorization: ABSENT`.

## 5. Artifacts

`artifacts/` is gitignored on this branch and none of the four journeys leaves a
committed file behind. The modal lanes force-added theirs, so a suite run dirties
seven tracked files under `artifacts/journeys/modal-*`; that churn was reverted
rather than committed.

## What was ported vs merged, and why

Not merged. `lane/fe-journeys` is 3 commits ahead of a merge base 27 commits
behind this branch, and its versions of `support/journey.js` (-149 lines),
`playwright.config.js`, `fixture/margin.js`, `fixture/training.js`,
`margin-recipe-to-margin.spec.js` (-158) and `training-course-to-evidence.spec.js`
(-200) are all older than what is here. `git merge` would have offered to take
the harness guards, the resolved-flag fixtures and the coverage lane's rewrites
back out. The four specs, `fixture/meals.js`, `fixture/growth.js`, the world
constants and the `join.vue` fix were carried across by hand instead.

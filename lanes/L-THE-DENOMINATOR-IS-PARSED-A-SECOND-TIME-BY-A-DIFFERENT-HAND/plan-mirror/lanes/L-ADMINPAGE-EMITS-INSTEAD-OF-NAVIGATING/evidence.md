# L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING — evidence

## What was measured, and against what

Base: `8ac6f63` (`lane/focustrap-teardown`, the shared checkout's HEAD), in a private worktree
`/Users/svendaneel/okam/Web/.claude/worktrees/agent-a65db45f6ddd4ab5b`. **Not** the owner's working
tree: he carries ~394 uncommitted paths from other lanes, and this lane measured against the commit
plus exactly two borrowed files, named below.

Borrowed into the arms, unchanged, from the owner's checkout — the "per-page starter list repaired"
precondition the brief names, which `L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN` landed uncommitted:

- `pages/admin/ongoing.vue` (kept in `baseline/ongoing.kitchen.vue`)
- `utils/admin/ongoing-columns.js` (kept in `baseline/ongoing-columns.js`)

`core/` (an empty submodule in a fresh worktree) was copied from the owner's checkout so the project
compiles. Nothing was written into his tree except this lane's RETURN.

Ports: dev **3941** (mine), API **5971** (the owner's live backend, read-only client). Neither
`:3971` nor `:5971` was bound by me, and no container was started or stopped. Every stop was
`kill <pid>` with the pid resolved from `lsof -iTCP:3941`; `pkill -f` was never run — a lane earlier
today stopped the owner's dev server with exactly that pattern.

## The defect, reproduced before anything was changed

A person types the deep link `/admin/ongoing` signed out. `AdminPage.initAuth` replaces the URL with
`/admin?redirect=%2Fadmin%2Fongoing`. **That walk was never broken** (`arm-A0-stock`): the redirect
target is a different page, the shell navigates, the target mounts, its `mounted` starts the board —
2 `/orders/ongoing` calls.

The broken form is an admin page reached with a `redirect` query **pointing at itself**, which is
the URL the brief names and the one `initAuth:99` deliberately renders in place rather than bouncing:

`arm-A0-selfredirect-stock` — base `AdminPage.vue`, repaired `ongoing.vue`, fresh compiler:

- **2 sign-in modals stacked** (the shell's and the page's own), the shell's on top
- after the sign-in the URL **loses its query**: `/admin/ongoing`
- **`/orders/ongoing` requests: 0**, whole run
- **a sign-in modal still on screen, visible**, covering the board

`closeLoginModal` compared the redirect target to `$route.fullPath` — path *and* query, and the
query is where the target is written — so the strings could never match, and the shell answered a
sign-in performed ON the board by `replace`ing to the board. vue-router reuses the component for a
same-path route change: no second `mounted`, and `login-success` sat in the branch never taken.

## Every arm

Board reqs = `/orders/ongoing` calls in the whole run; nothing can call it before the login POST.
Two or more means the 7-second poll is running, not just a one-shot load. Full logs, screenshots,
request traces and verdicts in `arm-*/`.

```
arm                        entry                                              modals@  board  modals  page
                                                                              sign-in   reqs   after  errs
A0-selfredirect-stock      /admin/ongoing?redirect=%2Fadmin%2Fongoing               2      0       1     2
A0-stock                   /admin/ongoing                                           1      2       0     2
A1-mine-alone              /admin/ongoing?redirect=%2Fadmin%2Fongoing               2      0       1     1
A10-four-lane-merge        /admin/ongoing?redirect=%2Fadmin%2Fongoing               1      2       0     1
A2-composed-with-mine      /admin/ongoing?redirect=%2Fadmin%2Fongoing               1      2       0     1
A3-composed-without-mine   /admin/ongoing?redirect=%2Fadmin%2Fongoing               1      0       0     2
A4-deeplink-fixed          /admin/ongoing                                           1      2       0     2
A5-edge-redirect-is-admin  /admin?redirect=%2Fadmin                                 1      0       0     2
A6-mutant-fullpath         /admin/ongoing?redirect=%2Fadmin%2Fongoing               1      0       0     2
A7-target-carries-query    /admin/ongoing?redirect=%2Fadmin%2Fongoing%3FstoreId%3D1  1      2       0     1
A8-mutant-nosplit          /admin/ongoing?redirect=%2Fadmin%2Fongoing%3FstoreId%3D1  1      0       0     2
A9-final-green             /admin/ongoing?redirect=%2Fadmin%2Fongoing               1      2       0     1
P1-selfredirect            /admin/ongoing?redirect=%2Fadmin%2Fongoing               2      0       1     2
```

`P1` is the first probe, run without a compiler restart; `A0-selfredirect-stock` is the same walk
with one, and answers identically. Every other arm restarted the compiler and polled `/admin` for a
200 rather than sleeping — the harness fault a sibling caught in its own first attempt, where a
25-second sleep let the pre-mutation bundle serve a passing arm.

## The answer the brief asked for plainly: landing mine alone changes nothing a person can see

`arm-A1-mine-alone` is my fix on the repaired `ongoing.vue`, and it is **identical to the stock arm
on every visible measure**: 0 board requests, the page's own sign-in modal still mounted and still
covering the board. The shell now emits `login-success`, and `ongoing.vue` as it stands today binds
nothing to it, so the event lands nowhere.

The one difference is not visible: the URL keeps its query, and one of the two
`Navigation cancelled` page errors disappears, because the same-path `replace` that raced the
header's `storeId` sync is no longer issued.

Mine alone is not inert everywhere — 39 admin pages already bind `@login-success`, so for those the
emit is heard. But the only producer of a `redirect` query in the whole repo is `AdminPage.initAuth`
itself, and it always writes `/admin`, so the case my change unlocks on today's code is
`/admin?redirect=%2Fadmin` (`arm-A5`) plus any `?redirect=` URL that is typed, bookmarked or shared.
**The board's recovery needs all three lanes.**

## How the three compose

| | what it does | without it |
| --- | --- | --- |
| `L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN` (landed, uncommitted) | one starter list per page — poll, resize, `adminStores`, kitchen's fullscreen listener | the board loads once and never polls again; a stale snapshot that looks fine |
| `lane/loginmodal-mounted-once` @ `0f88242` (unmerged) | deletes the page's duplicate modal and binds `@login-success` on the shell | two modals stack; the one the visitor uses is not the one the page listens to |
| **this lane** | the shell emits instead of silently re-navigating to the page it is on | the emit never fires, so the binding above is never called |

Composed, in a browser: `arm-A2-composed-with-mine` / `arm-A9-final-green` (the shipped bytes) — one
modal, it closes, **2 `/orders/ongoing` calls at t and t+7s**, board on screen. `arm-A3` is the same
composition with my file reverted: **0 calls**, and now with no modal to explain why — a board that
is exposed and frozen, which reads worse than the defect it replaced. My change is load-bearing.

`0f88242` binds `@login-success="loadOrders"`; merged with the starter list it must bind
`@login-success="startLiveBoard"`. That merged file is `baseline/ongoing.composed.vue`, built here
only as the arms' world. **It is not part of this lane's diff** — the two siblings own those lines.

## The fourth lane, in the same file, today

`L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN` added a `watch` on `userIsLoggedIn` to `AdminPage.vue`
(unlanded, in worktree `agent-a2127f65723afed15`). **No conflict, textual or behavioural:**

- its `closeLoginModal` is byte-identical to the base — asserted by the merge script, which fails
  if it is not (`baseline/AdminPage.merged.vue` was produced by that assertion)
- the watcher fires on `true → false`; my branch runs on `false → true`. Different transitions.
- it deliberately targets **bare** `/admin` because `?redirect=` was the broken form. After my
  change that reason no longer holds, but its choice is still right: `/admin` is the one admin page
  that mounts no modal of its own, so nothing stacks there.
- 27/27 green on the merged file: my 11, its 7, and the shell's 9 (`admin-page-auth`).
- `arm-A10-four-lane-merge` — merged `AdminPage.vue` + its `AdminPageHeader`/`AdminPageFooter` +
  the composed `ongoing.vue`: 1 modal, **2 board requests**, board on screen. All four coexist.

## Kill-proof

Two mutants, each a one-line reversal of my change, each run in a browser with its own compiler:

- `A6-mutant-fullpath` — everything my diff added stays, the comparison alone goes back to
  `$route.fullPath`: **0 board requests**. The comparison is the fix, not the refactor around it.
- `A8-mutant-nosplit` — the comparison stays, `redirectTargetPath` stops stripping the target's own
  query, entered as `?redirect=/admin/ongoing?storeId=1`: **0 board requests**. `A7` is the same URL
  unmutated: **2**. The split is load-bearing, not defensive decoration.

## Suites

- `test/adminpage-redirect-target.test.js` (new, 11 tests). On the base file: **5 red, 6 green** —
  `red-proof.txt` names them. The 6 green-on-both are the deliberate controls, including the
  `replace` branch for a genuinely different page, which must not be lost to the fix.
- The 10 suites that import `AdminPage`: 217/217.
- Full jest: **2598 passed, 2 failed, 114 suites** (`full-jest.txt`). Both failures are
  `journey-artifact-store.test.js` asserting `/^Web-modules@/` on the checkout **directory name**;
  mine is a worktree called `agent-…`. The identical pair three sibling lanes reported. Zero
  references to this diff.
- ESLint, measured per file against its own base content: **46 problems before, 46 after** — no new
  error, no new warning. (The single pre-existing error is `no-useless-return` in `initAuth`, base
  and fixed alike.) The new test file is clean.

## Named, not taken

- **`pages/admin/index.vue:687` carries the same `fullPath` comparison** in its own
  `handleLoginSuccess`. It was unreachable before this change — the shell never emitted on a
  redirect URL. It is reachable now in exactly one shape, `/admin?redirect=%2Fadmin`, and `arm-A5`
  walks it: the dashboard renders, the query is cleaned by that very handler, no new console error.
  Left alone because it is a page and this estate has five double-lands on record; a sibling's file
  is a sibling's to fix.
- **The `?redirect=` query survives in the URL after the emit** (`/admin/ongoing?redirect=…&storeId=1`).
  Stripping it means a second `$router.replace` into a path that already has two navigations racing
  on this exact tick, and it would fire `index.vue`'s newly-reachable handler in an order I would
  then have to reason about. Left as it is, deliberately: on a reload the visitor is signed in, so
  the query only suppresses a bounce that would not happen anyway.
- **The `Navigation cancelled` page errors are pre-existing** and were present on the stock arms
  before this change. `AdminPageHeader` mounts for an anonymous visitor and its `mounted` appends
  `?storeId=`, racing whatever the sign-in does. My change removes one of the two racing navigations
  on the same-path case (2 errors → 1) and no `.catch` was added, so the arms compare like for like.
- **`pages/admin/kitchen.vue`** is the other page in the starter-list lane and has the same shape.
  Not walked here: the exit criterion counts the board's requests, and the board is `ongoing.vue`.

## Reproducing

```
lanes/L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING/arms.sh <label> <base|fixed|mutant-fullpath|mutant-nosplit|merged> <kitchen|composed> <entry-url>
```

`arms.sh` copies the named files out of `baseline/`, restarts the compiler, polls for readiness and
runs one walk. `utils/admin/ongoing-columns.js` must be restored from `baseline/` first — it is the
starter-list lane's file, not this one's, and was removed from the working tree so that `git status`
shows only what this lane owns.

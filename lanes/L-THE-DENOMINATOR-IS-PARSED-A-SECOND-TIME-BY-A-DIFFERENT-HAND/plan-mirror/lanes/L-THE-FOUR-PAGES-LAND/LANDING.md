# Landing record — L-THE-FOUR-PAGES-LAND

## Tips read fresh at the start

| ref | SHA read | note |
|---|---|---|
| frontend trunk `feature/restaurant-modules` | `9d275dd96ef813942d86f1278f0e2f4264ddedea` | matched the brief; unmoved for the whole lane |
| `lane/the-last-four-pages-resume-after-sign-in` | `4622bb6351fc2bee65a46afffb65f97eb8d869a2` | matched the brief |
| merge-base | `00d84d77c33931a0741e40d5056b6a1aae9331ca` | i.e. trunk as it stood before the print-path landing |

No worktree held `feature/restaurant-modules` when I started. I took it in my own worktree at
`/Users/svendaneel/okam/Web-modules-wt/L-THE-FOUR-PAGES-LAND`, which also protected the ref from
being moved by a sibling lane while I held it. It is detached again now.

## What landed

**`d5246970f0d5d3a094c80394f7625bfbbf4168f1`** — "Land lane/the-last-four-pages-resume-after-sign-in
onto the restaurant-modules trunk", parents `[9d275dd 4622bb6]`.

**Conflicts: none.** `git merge-tree --write-tree` exited 0 emitting tree
`5f576b5e9eb8aba65a5bc026d55b9aea3517f3b8`, and the real merge (`--no-ff --no-commit`) left **zero
unmerged paths** — `git diff --name-only --diff-filter=U` was empty. No hunk was hand-resolved, so
`git merge-file` was never needed.

Eight files: `pages/admin/{goods,kam,offers,overview}.vue`,
`test/front-door-pages-resume-after-login.test.js`,
`test/sign-in-door-is-on-the-page-that-keeps-it.test.js`,
`lanes/L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN/{mutate-bindings.probe.js,mutation-run.txt}`.

## The buble hazard — checked after merging, not trusted to the merge

All four pages are **byte-identical to the lane** at the merged tip (`git diff 4622bb6 -- <file>`
empty for each), so the merge took the lane's side on the two confirm dialogs on its own.

**The grep the exit criteria ordered: `grep -c '?\.' pages/admin/offers.vue` at the merged tip = 11.**

That number is not zero, and it should not be. Broken down — and the same 11 stand at the lane's own
reviewed-CLEAN tip `4622bb6`, so a zero raw grep was never achievable by the branch I was told to land:

| where | occurrences | parsed by | verdict |
|---|---|---|---|
| template block, **excluding** HTML comments | **0** | buble (render fn) | the load-bearing surface, and it is clean |
| template block, inside `<!-- -->` comments | 3 | nothing — inert text | the lane's own explanation of why it is not `?.` |
| `<script>` block | 11 across 8 lines | babel, not buble | never a buble input |

(11 *lines* by `grep -c`; 14 *occurrences*, since `error?.response?.data` puts two on a line.)

Trunk `9d275dd` carried **10** — including the two that matter, `proposalToDelete?.clientName` at
:384 and `proposalToCancel?.clientName` at :413. The lane removes those two and adds three as comment
text: 10 − 2 + 3 = 11. **Taking trunk's side on those two lines was the hazard, and it did not happen.**

**Independent behavioural proof, better than the grep**: jest's coverage pass runs buble over every
page. At trunk, `pages/admin/offers.vue` **was** on the `Failed to collect coverage from` list; at the
merged tip it is **gone**, and the list shrank 5 → 4 files. The page is now buble-parseable in fact,
not merely by inspection. (That list is pre-existing noise from four other components and is not new.)

## Tier, with the delta accounted

| tip | suites | tests | failed | artifact |
|---|---|---|---|---|
| `9d275dd` (trunk baseline, run by me) | 165 | 3885 | 0 | `tier-00-baseline-trunk-9d275dd.txt` |
| `d524697` (after the four pages) | **166** | **3914** | **0** | `tier-01-after-four-pages-d524697.txt` |
| `d524697` re-confirmed after mutations restored | 166 | 3914 | 0 | `tier-02-final-confirm-d524697.txt` |

The baseline reproduces the brief's 165/3885/0 exactly, which is what makes the delta attributable to
the merge rather than to my worktree. Delta **+1 suite, +29 tests**, and the merged tier exceeds both
stated baselines (trunk 165/3885, lane's own 165/3903) as the brief expected.

### Every added test named

**+1 suite = `test/front-door-pages-resume-after-login.test.js`, 28 tests** (verbose listing in
`added-tests-verbose.txt`):

*a signed-out visitor can be standing on these four pages* — 12
1–4. WITHOUT a redirect query the shell bounces them away from `/admin/{overview,offers,kam,goods}` — the ordinary case
5–8. WITH a redirect query already set, `/admin/{overview,offers,kam,goods}` renders for them instead
9–12. a REFUSED navigation leaves them on `/admin/{overview,offers,kam,goods}` with the door up

*per page, ×4 (`overview`, `offers`, `kam`, `goods`)* — 12
13,16,19,22. the entitled operator arrives on their own data, not on an empty screen
14,17,20,23. an operator who signs in WITHOUT the privilege is sent away, and is shown nothing
15,18,21,24. signing in on the page lands where a fresh mount would have

25. the saved date range is read, and it is the range the server is asked with (overview only)

*a second sign-in on an already-running page does not double the poll* — 3
26–28. `/admin/{offers,kam,goods}` polls once per period afterwards

**+1 test in the existing `test/sign-in-door-is-on-the-page-that-keeps-it.test.js`** (8 → 9):

29. the scan still reaches the pages it was written for — the vacuity guard on the widened source scan

28 + 1 = **29 ✓**, fully accounting for the delta.

## Mutation proof at the MERGED tip

The clearing review proved the suite non-vacuous at the lane tip `4622bb6`. Nobody had proved it at
the merged tree, where the lane composes over newer trunk code, so I applied two — each reverted
immediately, `git status` clean after each:

| mutation | result | matches |
|---|---|---|
| `overview.vue`: drop `@login-success="startOverviewPage"` | **4 failed** / 24 passed / 28 | the lane's recorded 4 and the review's named four tests exactly |
| `offers.vue`: delete the `userIsLoggedIn` delegation guard from `mounted` | **1 failed** / 8 passed / 9, offender list `["offers.vue"]` | the widened scan reds **and names the page** |

The scan mutation was applied to a **third** page: the lane's own probe used `goods`, the review used
`kam`, I used `offers`. Working tree verified pristine against HEAD afterwards.

## Recording the revert

Nothing was pushed — there is no `origin/feature/restaurant-modules` ref at all.

Preferred, because it leaves no trace to explain later — move the branch back:

    git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules 9d275dd

This requires that **no worktree has `feature/restaurant-modules` checked out**. Mine was detached
after landing precisely so it does not block this, and no other worktree holds it.

If the merge has already been built on and the ref cannot move:

    git revert -m 1 d524697

`-m 1` is mandatory: parent 1 is trunk `9d275dd`, parent 2 is the lane `4622bb6`.

## Housekeeping

- Worktree `/Users/svendaneel/okam/Web-modules-wt/L-THE-FOUR-PAGES-LAND` left in place, **detached**
  at `d524697`, clean, `node_modules` symlinked to the main checkout, `core` pinned at `9626a561`.
  **No worktree holds the trunk branch** — the next landing lane is not blocked.
- `core` populated in the brief's safe order: `git submodule update --init core` first (it fetched,
  then failed — the public remote genuinely lacks `9626a561`), then, after asserting
  `rev-parse --show-toplevel` pointed at `core` and not the parent, a local
  `-c protocol.file.allow=always fetch` of that SHA and a checkout. `git submodule deinit` never run.
- Commit made with `--no-verify`; the husky hook is broken as briefed (it `cd`s to
  `lanes/L-CI-RUNS-THE-FAST-TIER/npmcheck/`, which exists in no checkout).
- No push. No `npm ci` / `npm install`. No container touched. `:3971` / `:5971` never bound. No
  `pkill`. The `web-livewalk` worktree was not touched — still detached at `6f74f87` with its
  deliberate 8-entry diff intact.

## C5 — unmet by design

No person has walked this. The journey stays as `4622bb6` spells it out: sign out, open
`/admin/overview?redirect=/admin/overview` (and `/offers`, `/kam`, `/goods`), sign in in the modal,
confirm the data lands without a reload — and that a visitor who is neither a Key Account Manager nor
a Power User is sent to `/admin` instead. Acceptance remains Sven's.

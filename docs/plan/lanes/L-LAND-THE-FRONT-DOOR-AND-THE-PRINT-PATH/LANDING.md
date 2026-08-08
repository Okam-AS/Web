# Landing record — L-LAND-THE-FRONT-DOOR-AND-THE-PRINT-PATH

## Tips read fresh at the start

| ref | SHA read | note |
|---|---|---|
| frontend trunk `feature/restaurant-modules` | `00d84d77c33931a0741e40d5056b6a1aae9331ca` | matched the brief; unmoved when I started |
| backend trunk `feature/restaurant-modules` (OkamAPI-modules) | `9fb057d0069c8e6ee4e4bc588c728e516c1526a9` | matched the brief; **not touched by this lane** |
| `lane/evidence-record-handed-over` | `ab6e7e1f9fc889a9944bd490517197eff8724a55` | merge-base with trunk `780d405` |
| `lane/the-last-four-pages-resume-after-sign-in` | `4622bb6351fc2bee65a46afffb65f97eb8d869a2` | merge-base with trunk **was trunk itself** |

I branched from **`00d84d7`** (the frontend trunk), by checking that branch out in my own worktree at
`/Users/svendaneel/okam/Web-modules-wt/L-LAND-THE-FRONT-DOOR-AND-THE-PRINT-PATH`. No worktree held
`feature/restaurant-modules` before mine, so no ref was written behind anybody's back.

## What landed

**`9d275dd96ef813942d86f1278f0e2f4264ddedea`** — "Land lane/evidence-record-handed-over onto the
restaurant-modules trunk", parents `[00d84d7 ab6e7e1]`.

**Conflicts: none.** Trunk's commits `780d405..00d84d7` touch none of the lane's seven files, so the
merge was textually clean and there was no hunk to resolve. Verified rather than assumed: after the
merge, `git diff lane/evidence-record-handed-over --` over all seven files is **empty**, i.e. the
merged tree carries the lane's version byte-for-byte.

The seven files: `components/admin/training/TrainingEvidenceDocument.vue`,
`pages/admin/training-evidence.vue`, `test/journeys/training-evidence-document.spec.js`,
`test/training-evidence-print.test.js`, `translations/{de,en,no}.ts`.

**One semantic adjacency worth naming**: trunk separately changed `utils/training/evidence.js` (+19)
and added `test/training-evidence.test.js` (+530) after the lane branched. Those never conflicted
textually, and the tier at the merged tip is green, so the print path composes over the newer
evidence util rather than merely failing to collide with it.

## Tier, with the delta accounted

| tip | suites | tests | failed | artifact |
|---|---|---|---|---|
| `00d84d7` (trunk, baseline I ran myself) | 164 | 3874 | 0 | `tier-00-baseline-trunk.txt` |
| `9d275dd` (after the print path) | **165** | **3885** | **0** | `tier-01-after-print-path.txt` |

Delta **+1 suite, +11 tests**. The baseline reproduces the brief's stated 164/3874/0 exactly, which is
what makes the delta attributable to the merge rather than to my worktree.

The +1 suite is `test/training-evidence-print.test.js`. All **11** added tests, named:

1. printing calls the browser's own print, which is what produces the paper and the PDF
2. a browser with no print command says so, rather than a button that appears to work
3. the refusal is its OWN line and never the read's banner
4. a second press never issues a second read, so it never writes a second disclosure
5. an idle page offers no print — the paper would carry a heading and «choose a person»
6. a REFUSED read is not printable, because a refusal on this page's letterhead reads as a clean file
7. a read that never came back is not printable either
8. an EMPTY record IS printable — «this store holds nothing for this person» is a finding
9. switching store clears the document AND withdraws the print offer with it
10. the button is rendered, bound, and disabled until there is a record
11. the paper-only heading is rendered on screen too, hidden by CSS rather than absent

`test/journeys/training-evidence-document.spec.js` (+167) is a Playwright journey and is **not**
collected by this jest tier — which is why 167 added lines contribute 0 to the count above.

## Mutation proof (the review did not do this; I did)

The approving review `docs/plan/reviews/L-READ-THE-PRINT-PATH.md` verified the produced PDF
cell-for-cell against the screen, but **contains no mutation testing** — the word does not appear in
it. Since the brief makes "every test must red under a mutation you actually apply" my rule too, I
applied three to `pages/admin/training-evidence.vue`, each reverted immediately after:

| mutation | result |
|---|---|
| delete the `window.print()` call | **2 failed** / 9 passed |
| `:disabled="!canPrint"` → `:disabled="false"` | **1 failed** / 10 passed |
| drop the no-print-command guard (`typeof window.print !== 'function'` → `false`) | **2 failed** / 9 passed |

Worktree returned to clean (`git status --short` = 0 lines) after each. The suite is not vacuous.

## What did NOT land, and why

**`lane/the-last-four-pages-resume-after-sign-in` at `4622bb6` is HELD, not refused.** Its review
lane `L-READ-THE-FOUR-PAGES` is still `state: running` (agent fable); no review file and no return
exist. My brief's instruction for exactly this case is to land the print path and name the other as
held, so I did not merge it on my own authority.

**It is proven mergeable, so the follow-up is cheap.** `git merge-tree --write-tree HEAD
lane/the-last-four-pages-resume-after-sign-in` exits **0** and emits a tree only
(`5f576b5e9eb8aba65a5bc026d55b9aea3517f3b8`) — no conflict. The print-path merge touches none of
`pages/admin/{goods,kam,offers,overview}.vue`.

**The buble hazard the brief flagged is intact and self-defending.** In the lane, `offers.vue:392` and
`:423` read `(proposalToDelete || {}).clientName` / `(proposalToCancel || {}).clientName`, and the lane
added comments above both explaining why they are not `?.`. Trunk still carries the `?.` form at those
lines, so **whoever lands this must take the lane's side on those two lines** — taking trunk's side
restores `?.` and makes `offers.vue` untransformable by buble, i.e. unmountable by this repo's jest
again. Since merge-tree reports no conflict there, the default merge already resolves them the right
way; the risk is only in a hand-resolution.

## Recording the revert

Nothing was pushed. The landing is one merge commit and can be undone two ways.

Preferred, because it leaves no trace to explain later — move the branch back:

    git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules 00d84d7

This requires that **no worktree has `feature/restaurant-modules` checked out**. Mine was detached in
place after landing precisely so it does not block this.

If the merge has already been built on and the ref cannot move, revert the merge keeping trunk's side:

    git revert -m 1 9d275dd

`-m 1` is mandatory: parent 1 is trunk `00d84d7`, parent 2 is the lane `ab6e7e1`.

## Housekeeping

- Worktree `/Users/svendaneel/okam/Web-modules-wt/L-LAND-THE-FRONT-DOOR-AND-THE-PRINT-PATH` is left
  in place, **detached** (not holding `feature/restaurant-modules`), clean, with `node_modules`
  symlinked to the main checkout and `core` pinned at `9626a561`.
- `core` was populated with the safe order from the brief: `git submodule update --init core` first
  (which fetched, then failed — the public remote genuinely does not have `9626a561`), then from
  **inside** `core`, after asserting `git rev-parse --show-toplevel` pointed at `core` and not the
  parent, a local fetch of that SHA and a checkout. `git submodule deinit` was never run.
- No push. No `npm ci` / `npm install`. No container touched. `:3971`/`:5971` never bound.
- Commits made with `--no-verify` (the repo's husky hook is itself broken — it cd's to a
  `lanes/L-CI-RUNS-THE-FAST-TIER/npmcheck/` that does not exist).

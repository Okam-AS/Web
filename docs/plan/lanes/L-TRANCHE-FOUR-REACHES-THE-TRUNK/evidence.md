# L-TRANCHE-FOUR-REACHES-THE-TRUNK — evidence

Trunk **`bb22728` → `3807e90`**, tier **182 / 4414 / 0**, zero conflicts. Nothing pushed.
T5 confirmed still off the trunk.

## What changed, and to what — the submodule pin

This is the first tranche to move the gitlink, so it is stated exactly:

```
core   9626a561bb0442b0aed026be75b7f9419337ac6d   ->   a6ae24127b895e536cc600053f1cc25b1cc79f5f
```

**It moved as part of the merge, not by hand.** `6d43520`'s own tree already names `a6ae241`, and the
old pin is `a6ae241`'s parent, so git resolved the gitlink cleanly with no conflict and nothing to
adjudicate. The core working tree was then checked out to the same SHA so tree and pin agree; the
committed gitlink and `git -C core rev-parse HEAD` were both re-read afterwards and both read
`a6ae241`.

## The pin move is load-bearing, measured in both directions

The failure this tranche exists to avoid is a frontend commit whose gitlink still names `9626a561`
while the code expects `hasBackendMessage`. Both halves of that were measured rather than assumed:

| | occurrences of `hasBackendMessage` in `core/services/request-service.ts` |
|---|---|
| old pin `9626a561` | **0** |
| new pin `a6ae241` | **1** — `error.hasBackendMessage = Boolean(backendMessage)` at line 149 |

And the frontend genuinely reads it — `utils/request-failure.js` plus
`test/statistics-service-failure-reasons.test.js` and `test/statistics-reads-surface-their-failure.test.js`,
4 read sites. So landing the frontend half against the old pin would have produced a tree whose code
reads a field core never writes: green in jest only because the tests construct the error object
themselves, and wrong in a browser. **That is why this is one unit.**

## `6d43520` contains `6670619` — by blob identity, not by an empty diff

Ancestry is true, and the file-level check is richer than plain containment. Over every file `6670619`
changed against its base:

- **12 of 17 byte-identical** between `6670619` and `6d43520`, including the core gitlink itself
  (`a6ae24127b89` on both) and the `core-a6ae241.bundle`.
- **5 differ** — `pages/admin/poweruser-growth.vue`, `test/growth-poweruser-page.test.js`, and all three
  dictionaries — because `6d43520` supersedes them.

That is not a contradiction; it is the reason the landing plan says the inner tips must never be landed
separately. **Landing `6670619` or `fddb06c` after this one would collide on exactly those five files.**
Neither is on the trunk, asserted.

## The tier

`npx jest --ci`, exit 0, no `FAIL` line, no suite that failed to run, core checked out at `a6ae241`.

```
bb22728  before   179 suites / 4318 / 0
3807e90  after    182 suites / 4414 / 0
delta             +3 suites / +96 tests
```

**Every test accounted for**: the landing plan recorded `6d43520` as "composed +96: exact", and +96 is
what the composition measures against a trunk that has moved three tranches since that prediction. The
tier is fully green, so the growth lane's three `DEFECT` arms that this branch is expected to turn green
are green.

Dictionaries auto-merged with **no duplicate keys** in `no.ts`/`en.ts`/`de.ts`.

## Arity sweep — across the submodule boundary, which is the only version worth running here

This tranche's whole point is that the frontend reads a surface living in the other repository, so the
sweep covers both sides. Sweeping only `utils/` would have checked the half that cannot break.

```
modules swept : utils/request-failure.js
                core/services/request-service.ts
                core/services/statistics-service.ts
named imports : 8    -> all resolve
call sites    : 6    -> all match their signatures
raw flags     : 0
```

Plus the cross-repo property directly: `hasBackendMessage` is **set in 1 place in core** and **read in
4 places in the app**, so the field the app reads is the field core writes.

## ⚠ The local-only core blocker is now worse, and the push order must be kept

`F-THE-TRUNK-DEPENDS-ON-A-CORE-COMMIT-THAT-EXISTS-ONLY-ON-THIS-MACHINE` was already standing. **This
lane makes it worse, deliberately and correctly**, and the state is recorded here so the eventual push
cannot get it wrong. Measured after teardown:

| commit | on any remote branch? |
|---|---|
| `9626a561…` (previous pin) | **no** |
| `a6ae24127…` (new pin) | **no** |

So the trunk now depends on **two** chained core commits, neither of which exists on any remote. The
push order is not optional:

```
1. core   9626a561bb0442b0aed026be75b7f9419337ac6d      (must go first — it is a6ae241's parent)
2. core   a6ae24127b895e536cc600053f1cc25b1cc79f5f
3. Web-modules feature/restaurant-modules
```

Pushing the frontend first publishes a gitlink no clone on earth can resolve.

**Object durability, checked rather than assumed.** The brief warns that a submodule inside a linked
worktree keeps its objects under that worktree, so anything created there dies with `rm -rf`. **I
created no commit inside `core/`** — the reflog shows only a clone and two checkouts — and I fetched
`a6ae241` into the worktree's store from the *main* store, where the clerk had already restored it from
`lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/core-a6ae241.bundle`. **After teardown,
`git -C core cat-file -t a6ae241` in the main repository still answers `commit`**, so nothing was lost
and no new bundle was needed.

One operational note for the next lane to touch core: `git fetch <path> <sha>` **requires the full
40-character SHA**. The abbreviated form fails with *couldn't find remote ref a6ae24127b89*, which
reads like a missing object rather than a syntax problem.

## Teardown

`Web-modules-wt/L-T4-LAND` detached in place, then `rm -rf` plus `git worktree prune`. No worktree holds
`feature/restaurant-modules` — free for tranche five. `web-livewalk` untouched, no container started,
nothing pushed. `40ab62d` and `52a93c5` are still absent from the trunk.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules bb22728
```

Reverting the frontend ref restores the old gitlink with it; nothing in `core` needs undoing, because
this lane wrote nothing there.

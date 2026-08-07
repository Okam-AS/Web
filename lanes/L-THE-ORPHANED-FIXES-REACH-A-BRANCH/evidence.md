# L-THE-ORPHANED-FIXES-REACH-A-BRANCH — evidence

Four `refs/lanes/` refs were ruled against trunk `78ed84f`. Three were still needed and are now on the
trunk; the fourth had already landed by another route.

## The four rulings, each measured

| ref | at | ruling | how it was measured |
|---|---|---|---|
| `lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED` | `7a72c02` | **still needed → landed** | pin red at trunk, 8/21 |
| `lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM` | `c32cda3` | **still needed → landed** | pin red at trunk, 13/29 |
| `lanes/L-OFFER-PARTIAL-SUBTOTAL` | `35e5cdd` | **still needed → landed** | pin red at trunk, 5/23 |
| `lanes/L-WORLD-STAMP-WINDOWS` | `997936a` | **landed by another route** | see below |

Trunk `78ed84f` → three cherry-picks in stack order, ending at code tip **`af0e168`**, plus this
evidence directory on top of it. Nothing pushed.

### Why WORLD-STAMP is "landed by another route" and not "the code moved"

The brief required naming which. It is the former, and the naming is not a judgement call:
`test/e2e/support/world-stamp.js`, `test/e2e/scripts/live-world-stamp-wiring-check.js`,
`test/e2e/scripts/build-provenance-proof.js`, `test/world-stamp-windows.test.js` and the `package.json`
script entry are all **byte-identical** between `997936a` and the trunk. `git log` names the route:
`94fa256` *A live artifact names the checkout that built the world, not whoever holds the port*, an
ancestor of the trunk.

Three files differ, and the direction is what settles it — the trunk is **ahead**, not behind:

| file | lines only on trunk | lines only on the ref |
|---|---|---|
| `test/e2e/support/artifact-store.js` | 85 | 2 |
| `test/e2e/scripts/live-world.sh` | 84 | 4 |
| `test/journey-artifact-store.test.js` | 118 | 0 |

The six "only on the ref" lines are not lost work: they are the *older* form of things the trunk then
extended — `canTakeCanonical(incoming, standing, provisional)` gained a fourth parameter
`standingTracked` and is still exported at `artifact-store.js:457`, and `live-world.sh` lost a comment
block about module config masters. Merging this ref would move that file backwards. **Left alone.**

## Reproductions, written before each fix was landed

The brief required a reproduction rather than an argument, for each. Each ref's own test pin was applied
to the **unpatched trunk** and watched failing. None of the three had been fixed by another route, and
none had been made moot by movement in the code.

| fix | reproduction | red at trunk |
|---|---|---|
| receipt deduction row | `test/receipt-discount-row.test.js` @ `7a72c02` | **8 failed / 13 passed / 21** |
| check line-amount sum | `test/check-lineamount-sum.test.js` @ `c32cda3` | **13 failed / 16 passed / 29** |
| offer partial subtotal | `test/price-absence.test.js` @ `35e5cdd` | **5 failed / 18 passed / 23** |

Two details that keep these honest rather than decorative:

- **The check-lineamount pin imports `isAmountInPlay`, which the trunk did not export.** Applying the
  pin alone would have produced a module-level failure — a reproduction of a missing import, not of the
  money defect. So `utils/price.js` was applied with it. That change is **behaviour-preserving by
  construction**: `isAmountInPlay` is the pre-existing body of `isDeductionInPlay`, and
  `isDeductionInPlay` becomes a delegate. The suite's own three arms confirm it in the same run —
  *the deduction name answers identically on every shape*, *the change against `> 0` is exactly nine
  shapes*, and *a stated zero still positively says there is nothing here* were all **green** while the
  components were unpatched. The 13 reds are the components.
- **The greens are load-bearing.** In the receipt reproduction the shapes where `> 0` and the absence
  rule already agree (`Infinity`, `'Infinity'`, `true`, an object with a numeric `valueOf`) pass before
  the fix, because `Infinity > 0` is true. A pin that redded on all 21 would have been testing the fix's
  presence rather than the defect.

The money arm is red at trunk and named as such by the suite itself:
*THE FALSIFIER: the absent world and the zero world stop agreeing about money.*

## Conflicts

**None — zero conflicts of either kind, and this is a measurement, not an absence of looking.**

`git merge-file` was therefore never invoked; the brief's hunk-level rule had nothing to resolve. The
reason is that the trunk had not moved under any source file these three fixes touch:

```
trunk commits touching each file since c8f26d5 (the stack's base):
  PosReceiptView.vue  CheckLine.vue  CheckPanel.vue  SellScreen.vue  utils/price.js   0 each
  translations/{no,en,de}.ts                                                         18 each
trunk commits touching each file since b76cbbb (the offer fix's base):
  OfferDocument.vue, test/price-absence.test.js   1 commit (11be859), net diff EMPTY
```

The three dictionaries had moved 18 commits and were expected to conflict on context; git auto-merged
all three. `11be859` touches the offer files but leaves them byte-identical to `b76cbbb`, so that pick
applied clean too.

**The arity sweep found nothing this time, and was still worth running.** It is what caught a clean-but-
uncompilable tree on the previous landing, and a three-commit rebased stack that adds an export
(`isAmountInPlay`) and rewrites callers in four components is the shape where it recurs. Every symbol
imported from `~/utils/price` anywhere in the tree resolves to an export, and every call site of
`isAmountInPlay` / `isDeductionInPlay` / `statedSum` matches its signature. `pos_negative_sale_unpriceable`
landed in **all three** dictionaries with no duplicate key in any of them.

## Mutation proof — `mutation-proof.py`, `mutation-proof.txt`

Eight mutations, one per guard the three fixes introduce, **written into the source at this tip, run,
and restored from an asserted byte copy**. The three refs each carry their own mutation log, but those
were written against bases that no longer exist; after a rebase the only question worth answering is
whether each guard still has a test behind it *here*.

**8 of 8 red.** No survivors, so nothing falls under the brief's delete-it rule. M1 restores the exact
pre-fix guard and reds **8 failed / 13 passed / 21 total** — byte-identical to the pre-landing
reproduction, which is what makes the pin a reproduction of the defect rather than a restatement of the
fix.

## Tier at the tip

`npx jest --ci`, exit 0, no `FAIL` line, no suite that failed to run. `core` pinned to `9626a561` first.

```
78ed84f  baseline    166 suites / 3950 passed / 0
af0e168  three picks 168 suites / 4007 passed / 0   <- the code tip
                     168 suites / 4007 passed / 0   re-run with this evidence commit on top,
                                                    which touches lanes/ only and no code
```

**+2 suites, +57 tests, every one accounted for** — the two new counts measured at the tip, the two
pre-existing files measured at `78ed84f` in a throwaway worktree:

| suite | at `78ed84f` | at the tip | delta |
|---|---|---|---|
| `test/receipt-discount-row.test.js` | absent | 21 | **+21** (new suite) |
| `test/check-lineamount-sum.test.js` | absent | 29 | **+29** (new suite) |
| `test/price-absence.test.js` | 16 | 23 | **+7** |
| `test/xz-residual-sites.test.js` | 48 | 48 | **0** — the ref's 53/39 edit rewrites arms, adds none |

21 + 29 + 7 + 0 = 57.

## Worktrees

- `/Users/svendaneel/okam/Web-modules-wt/L-THE-ORPHANED-FIXES` — the landing worktree.
- `/Users/svendaneel/okam/Web-modules-wt/L-ORPH-BASE` — a throwaway at `78ed84f`, used only to count
  the two pre-existing suites at baseline, removed as soon as it had answered.

Both removed with `rm -rf` plus `git worktree prune`. `web-livewalk` untouched; `lanes/plan-snapshot` and
`lanes/preservation-snapshot-unreferenced-work` untouched; no container started; nothing pushed.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules 78ed84f
```

The three refs are unchanged and still reachable at `7a72c02`, `c32cda3` and `35e5cdd`.

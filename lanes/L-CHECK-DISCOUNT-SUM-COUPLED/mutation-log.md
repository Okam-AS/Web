# L-CHECK-DISCOUNT-SUM-COUPLED — a sum that manufactured a zero, and a guard that then hid the row

Baseline `refs/lanes/L-XZ-RESIDUAL-SITES` = `799f05d4`, parent `b150668b`. Worked in
`/Users/svendaneel/okam/web-check-discount-sum` on `lane/check-discount-sum-coupled`. `8c6e91fa` was
not read or merged.

## The premise, checked before it was acted on

The brief carried three claims from the sibling. Two survived, one did not.

**HELD — `CheckPanel.vue:293` (`totalDiscount`'s `|| 0`) really was unreachable.** Every write to
`g.discountAmount` in the tree was enumerated, not reasoned about: the seed `discountAmount: 0` and
the `+=`, both inside `groups`. The complete set of readers outside it is `SellScreen.vue:566`,
`CheckLine.vue:54/55/78` and `CheckPanel.vue:314`; none assigns. (`XReportView.vue:42` reads a
`g.discountAmount` too, but its `g` is a report goods-group off the wire, a different object.) So the
sibling's ruling was correct **for the code as it stood** — and it expired in the same edit that fixed
`groups`, exactly as the brief predicted. That reversal is now written where the old ruling was.

**HELD — line 266 is the real one.** `g.discountAmount += line.discountAmount || 0` takes `line`
straight off the wire.

**DID NOT HOLD — "the check shows a total that does not match its own lines."** Measured against the
backend rather than repeated:

```
OpenCheckModels.cs:145   NetLineAmount = LineAmount - DiscountAmount
OpenCheckService.cs:764  LineGross(item)   = GrossLineAmount() - DiscountAmount
OpenCheckService.cs:644  order.FinalAmount = order.Items.Sum(LineGross)
```

The rows render `netLineAmount`, which is **already net of the discount**, and `finalAmount` is the
sum of exactly those. So the lines add up to the total whether or not the discount row is shown —
there is no visible arithmetic mismatch to find, in any of the three worlds. `the rendered lines sum
to the rendered grand total` asserts it in all three. The harm is real but it is a different harm: a
deduction quietly understated, and then erased, on a document an operator answers for. The inherited
sentence is corrected in `CheckPanel.vue` rather than left standing.

## What was wrong

`groups` folds the wire lines into the rows the operator sees. The grouping key folds on the discount
REASON and deliberately **not** on the amount, because a fixed discount is split proportionally across
the member lines — so "one row, several members, one of them silent" is the ordinary shape of this
bug. `+= (line.discountAmount || 0)` added a silent member as a zero, and the row printed a
real-looking figure that was too small.

The guard is the other half. Making the sum honest gives `null`, `null > 0` is false, and the `v-if`
**deleted the discount row** while the server's `finalAmount` still carried the discount. Fixing the
sum alone moves the error rather than removing it: a wrong figure becomes a missing row, and a missing
discount row on a till reads as "no discount was given". That is why one lane owns both.

## The change

| file | what |
| --- | --- |
| `utils/price.js` | new `isDeductionInPlay` — true for a stated deduction **and** for an amount nobody stated, false only for one that states there was none |
| `components/admin/pos/CheckPanel.vue` | `groups` uses `statedSum`; `totalDiscount` uses `statedSum`; footer row renders on `showsDiscountTotal`; the expired ruling replaced by its reversal |
| `components/admin/pos/CheckLine.vue` | row **and** the discount button's `--set` highlight both render on one `showsDiscount` |
| `components/admin/pos/SellScreen.vue` | `onNegativeSale` branches on `isDeductionInPlay` |

`SellScreen` is money, not layout, and it is the reason the lane did not stop at the two display
sites. A group whose discount is unstated fails `> 0`, and the other branch builds the return at
`unitAmount * quantity` — **the listed price, not the discounted one the till actually took**. The
customer is handed back money the shop never received. This was already the behaviour for an absent
discount before this lane (the `|| 0` produced a `0`, which fails `> 0` the same way), so it is
pre-existing rather than introduced — but `null` now lands on that branch and it would have been
shipped unexamined. `g.lineAmount` is summed from `netLineAmount`, so the discounted branch refunds
what was charged whether the discount is stated or unknown.

## Three worlds, and what each renders

`node lanes/L-CHECK-DISCOUNT-SUM-COUPLED/sum-vs-guard-probe.js` (the sibling's probe carried forward
and extended; its file is left untouched). Two coffees, 50,00 each gross, 50,00 comped across the
pair, split 30,00 / 20,00 — uneven on purpose, so a wrong sum cannot pass as half of something.

| world | `+= (x\|\|0)` | rendered | `statedSum` | rendered | agrees with the server? |
| --- | --- | --- | --- | --- | --- |
| present | 5000 | `−kr 50,00` | 5000 | `−kr 50,00` | yes / yes |
| genuinely zero | 0 | (no row) | 0 | (no row) | yes / yes |
| absent | 3000 | `−kr 30,00` | `null` | `—` | **NO — 3000 ≠ 5000** / makes no claim |

The server's own number is `SUM(lineAmount) − finalAmount` = 5000, built from two fields the panel
never reads when it builds the row. That is what the assertions compare against, which is why
`the absent world states no discount figure that disagrees with the server` fails on a change that
only restores the row.

The predicate change is **exactly one column wide**, and part 3 of the probe prints it rather than
claiming it: nine shapes move, every one of them unstated, and no stated shape (`0`, `-5000`, `5000`,
`'50'`) moves at all. Dropping the `> 0` altogether would have put a `Rabatt kr 0,00` row on every
bill in the estate; `M8` is what stops that.

A side effect worth naming: `statedSum` refuses `Infinity`, `'Infinity'`, `true` and
`{valueOf:()=>5000}` at the reducer, where `+= (x || 0)` used to **absorb** three of them into a real
figure (`0 + true` was 1, `0 + {valueOf}` was 5000). The panel now takes the same four cases the other
two sites do.

## Evidence

- `sum-vs-guard-probe.js` — 19 shapes through both predicates, both reducers, and the money world.
- `test/check-discount-sum.test.js` — 24 tests, mounted DOM, three worlds, plus a two-GROUP case that
  is the only thing reaching `totalDiscount`'s own `statedSum`.
- `test/xz-residual-sites.test.js` — the sibling's pins split three ways on the two check surfaces
  (stated deduction / stated none / unstated); `PosReceiptView` untouched and keeping all six, so the
  file now records a real difference between a check and a receipt.
- `mutation-proof.txt` — **8 / 8 red**. Nothing in this change is carried by a green.

```
M1 reducer statedSum -> `|| 0`                    RED  10 failed
M2 footer sum statedSum -> `|| 0`                 RED  11 failed
M3 footer guard -> `totalDiscount > 0`            RED  11 failed
M4 line guard -> `group.discountAmount > 0`       RED   7 failed
M5 button highlight -> a second answer            RED   1 failed
M6 return branch -> `> 0` (refunds listed price)  RED   1 failed
M7 predicate loses its absence branch             RED  19 failed
M8 predicate loses its relational branch          RED  11 failed
```

## Suite

| | |
| --- | --- |
| baseline, before any edit (`baseline-suite.txt`) | 2727 passed / **2 failed** |
| after (`after-suite.txt`) | 2754 passed / **2 failed** |

The same two, both `test/journey-artifact-store.test.js` worktree-basename assertions
(`web-check-discount-sum@… ` against `/^Web-modules@/`). Established by running the suite on the
untouched baseline **before** the first edit, which is stronger than stashing after the fact.

## Residue, not fixed here

- `components/admin/pos/PosReceiptView.vue:56` keeps `line.discountAmount > 0` on a **wire** object,
  so an absent line discount still drops the row off a printed receipt. Out of this lane's scope, and
  it has no manufactured sum in front of it, but it is the same three worlds on a
  kassasystemforskrifta artifact.
- `CheckPanel.vue` `g.lineAmount += line.netLineAmount` has **no** coercion at all: an absent
  `netLineAmount` makes the group `NaN` and an absent one on the first line makes it `0`. `depositAmount`
  keeps `|| 0`. Both are the same manufactured-sum shape as the line this lane fixed, on the amounts
  the row and the deposit tag are rendered from.

## Environment

`core/` had to be initialised in the worktree (`git -c protocol.file.allow=always submodule update
--init core`); without it five suites, including all four money suites, fail to load and a full run
silently reports 2547 tests instead of 2729. `node_modules` is symlinked to the shared checkout.
Neither is committed.

Files touched were **clean at the baseline commit** — the ~270 dirty files in the shared checkout
include sibling edits to `components/admin/pos/PosShell.vue`, `PosTopBar.vue` and `XReportView.vue`,
none of which this lane touches.

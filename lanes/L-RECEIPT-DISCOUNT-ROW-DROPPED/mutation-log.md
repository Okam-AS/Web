# L-RECEIPT-DISCOUNT-ROW-DROPPED — a printed receipt that did not add up

Baseline `refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED` = `c8f26d5`, parent `799f05d4`. Worked in
`/Users/svendaneel/okam/web-receipt-discount-row` on `lane/receipt-discount-row-dropped`. `8c6e91fa`
was not fetched, read or merged.

## The inherited correction, checked before it was repeated

The brief carried one instruction above the others: the sibling lane corrected its own premise —
"the check shows a total that disagrees with its own lines" **does not hold**, because `CheckLine`
renders `netLineAmount`, which is already net, so the rows add up either way. **Check whether the
receipt shares that property before repeating the stronger claim.**

**It does not, and that inversion is the whole finding.** Measured against the backend rather than
reasoned about:

```
JournalLineFactory.cs:95-105   lineAmount    = unitGross * quantity
                               LineAmount    = lineAmount          <-- GROSS of the discount
                               DiscountAmount journalled BESIDE it
                               netLineAmount = lineAmount - discountAmount, NEVER journalled
FinalizeService.cs:150-160     netLineTotal  = SUM(LineAmount) - SUM(DiscountAmount)
                               grossAmount   = netLineTotal + roundingAmount
FinalizeService.cs:163-169     "a sale can never be journalled with a total that disagrees with its
                               own lines" — netLineTotal == order.FinalAmount, ENFORCED
PosReceiptService.cs:161       receipt.GrossAmount = entry.GrossAmount
```

`PosReceiptView` prints `line.lineAmount` per row and `receipt.grossAmount` as the grand total —
**gross rows above, net total below**. The deduction rows are the only thing on the page that
bridges them. The check has no such gap to bridge; the receipt's gap is the discount itself.

So the stronger claim is true here and **only** here, and this is not a cosmetic surface: what a
`v-if` drops off `PosReceiptView` is dropped off the kassasystemforskrifta artifact `print()` puts on
the bong roll, and off the public electronic receipt at `pages/kvittering/_id/_token.vue`.

## What was wrong

`PosReceiptView.vue:56` guarded the row on `line.discountAmount > 0`, a relational test answering
"no row" to a genuine zero **and** to a field that never arrived. The numbers are the backend's own,
asserted in this exact combination by `WebApi.Tests/Kassa/Cov_FinalizeVatTests.cs`
(`FinalizeMixedVatDiscountedCheck_SplitsVatPerRateOnDiscountedNet`): lines of 20000 and 10000, a
whole-order 20 % discount split proportionally to 4000 and 2000, `check.FinalAmount == 24000`,
`receipt.GrossAmount == 24000`, `RoundingAmount == 0`.

| world | printed lines | deduction rows | printed total | does the page reconcile? |
| --- | --- | --- | --- | --- |
| present | 30000 | −4000, −2000 | 24000 | yes |
| genuinely zero | 30000 | none | 30000 | yes |
| absent — **before** | 30000 | −4000 only | 24000 | **NO — 2000 unaccounted, unmarked** |
| absent — **after** | 30000 | −4000, `—` | 24000 | the residual 2000 is MARKED |

A whole-order discount split across lines is the ordinary case, which is why "one line went silent"
is the ordinary shape of this bug and not a contrived one.

## The change

| file | what |
| --- | --- |
| `components/admin/pos/PosReceiptView.vue` | the row renders on `showsDiscount(line)` → `isDeductionInPlay`; the comment records the receipt-vs-check arithmetic and the honest size |
| `test/receipt-discount-row.test.js` | new — 21 tests, mounted DOM, three worlds, reconciliation against the backend's numbers |
| `test/xz-residual-sites.test.js` | the receipt's pins split three ways like the two check surfaces; `GUARD_WITHHELD` deleted rather than kept unasserted |

`utils/price.js` is **unchanged** — `isDeductionInPlay` already existed and already answered
correctly. Nothing was added to it, and the receipt is now its third caller.

## Why an `exists()` test could not be the assertion

The brief warned it would pass on the old code, and on this surface it does — for a reason the check
does not have. With the discount split across two lines, the drink's row still renders under `> 0`,
so `wrapper.find('.receipt__line-discount').exists()` is `true` on the unfixed component while
20,00 is missing off the page. That is asserted in the test file itself
(`an exists() check on this page passes on the old guard too`) so the next reader cannot simplify
the suite back into a presence check.

The assertion that separates the two pages reads the figures **out of the rendered DOM** and adds
them up:

```
residual = Σ(printed line amounts) − Σ(printed deduction figures) − printed grand total
unaccounted-and-unmarked = residual, unless a row carries the unknown mark
```

`30000 − 4000 − 24000 = 2000`, which is exactly `FOOD_DISCOUNT`, the deduction the backend took on
the line that went silent — built from `lineAmount` and `grossAmount`, two fields the discount row is
not made of. And it is asserted to be marked **on the right line**: the row carrying the mark must be
the one whose `lineAmount` is 10000, so a fix that put a mark anywhere on the page would not pass.

## The falsification target: one column wide

`node lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED/receipt-vs-check-probe.js` (the sibling's probe carried
forward, parts 1/3/5 verbatim, part 6 added; both earlier probe files left untouched). Part 3 ran
`> 0` against the absence rule over all nineteen shapes:

```
shapes whose row changes: null, undefined, '', '   ', NaN, -Infinity, false, {}, []
stated shapes that changed answer: none
```

Nine shapes move, every one unstated, and no stated shape (`0`, `-5000`, `5000`, `'50'`) moves. The
column held. Part 6 is this lane's addition and prints the reconciliation table above.

## Mutation proof — 5 / 5 red

`python3 lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED/mutation-proof.py`, output in `mutation-proof.txt`.

```
M1 receipt row guard -> `> 0`                       RED  12 failed
M2 predicate loses its absence branch               RED  24 failed
M3 predicate loses its relational branch            RED   9 failed
M4 method answers off the raw field, not the rule   RED   2 failed
M5 label loses sign ownership -> `−{{ priceLabel }}` RED  18 failed
```

M5 is the reverse direction and is the reason it is in the list. `L-XZ-RESIDUAL-SITES` moved the
minus sign inside the label on this row while **no test could reach the change**, because the `> 0`
guard hid every absence before the label ran. This lane makes it reachable: an unstated deduction now
renders, so `−—` is a string the component can produce and `negatedAmountLabel` stops being covered
by a guard and starts being covered by an assertion.

**No dead branch.** `showsDiscount` has no branch of its own to delete — it is one call to a
predicate that already carries its own two branches, and M2/M3 delete those one at a time. That was
checked rather than assumed, after two siblings each shipped a dead branch in a first draft on this
code.

## Honest size — this is hardening, not an incident

`PosReceiptLineModel.DiscountAmount` is a non-nullable `int`, serialised by Newtonsoft with default
null/default handling (`Helpers/ServiceCollectionExtensions.cs:156-165` — no `NullValueHandling` and
no `DefaultValueHandling` set), so a well-formed response always states it. **No receipt printed off
this backend today is missing a row**, and the commit does not claim one. Three things make it worth
doing anyway:

1. **The consequence is the worst in the estate.** The other three sites lose a screen row an
   operator can refresh. This one loses a line off a document a bokføring inspector reads, and the
   document then fails to reconcile.
2. **One caller has no shape control at all.** `pages/kvittering/_id/_token.vue` assigns `res.data`
   from an unauthenticated `axios.get` straight into the prop — no model, no `readMinor`, no gate.
3. **Estate agreement.** `CheckLine` and `CheckPanel` already split these three worlds; the receipt
   was the last surface answering an unstated deduction differently from the rest of the POS.

The four shapes `L-XZ-RESIDUAL-SITES` found (`Infinity`, `'Infinity'`, `true`, `{valueOf}`) keep
rendering their row and keep printing the bare mark; the five this lane found now join them. The
`> 0` guard and the absence rule no longer disagree about any shape on this component, which is
asserted directly.

## The second absence gate the exit did not name — RULING: its own lane

The sibling reported `CheckPanel.vue:269` `g.lineAmount += line.netLineAmount` with **no absence
gate at all**. It is not fixed here, and the ruling is deliberate:

- **It is not on this surface.** It is in `CheckPanel.vue`, which this lane does not touch.
  `PosReceiptView` performs no arithmetic whatsoever — it renders wire fields directly and every one
  of them already passes through the gated `priceLabel` — so there is no second ungated sum on the
  receipt to pair it with.
- **Its harm is bigger than a row, and different.** `g.lineAmount` is not only displayed: it is what
  `SellScreen.onNegativeSale` refunds on the discounted branch. An absent `netLineAmount` on the
  first member makes the group `0` (`0 + null`) and on a later member makes it `NaN`. That is
  money-out and deserves its own money proof, not a footnote in a receipt lane.
- **Merge cost.** `CheckPanel.vue` was rewritten by the lane directly beneath this one and five lanes
  are live in this checkout. Two lanes on one file for a defect neither exit names is how the
  parallel-lane hazards get made.

`g.depositAmount += line.depositAmount || 0` on the line above is the same shape and belongs in the
same lane. Recommended lane: **`L-CHECK-LINEAMOUNT-UNGATED-SUM`**, `statedSum` at both reducers,
proved against the refund amount rather than the row.

## Suite

| | |
| --- | --- |
| baseline, before any edit (`baseline-suite.txt`) | 115 passed / **1 failed** suites — 2754 passed / **2 failed** |
| after (`after-suite.txt`) | 116 passed / **1 failed** suites — 2775 passed / **2 failed** |

The same two, both `test/journey-artifact-store.test.js` worktree-basename assertions
(`web-receipt-discount-row@…` against `/^Web-modules@/`). Established by running the full suite on
the untouched baseline **before the first edit**. +21 is the new file; the xz file swapped six
receipt pins for six.

## Environment

`core/` had to be initialised in the worktree
(`git -c protocol.file.allow=always submodule update --init core`); without it five suites, all four
money suites among them, fail to load and the run reports 2547 tests instead of 2729 and reads as
green. `node_modules` is symlinked to the shared checkout. Neither is committed.

`components/admin/pos/PosReceiptView.vue` and both test files were **clean at the baseline commit**.
The ~270 dirty files in the shared checkout include sibling edits to `PosShell.vue`, `PosTopBar.vue`,
`XReportView.vue` and an untracked `ClockScreen.vue` under `components/admin/pos/`; this lane touches
none of them.

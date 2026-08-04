# L-OFFER-PARTIAL-SUBTOTAL — mutation log

Brief `a02d8ad0`. Objective: a subtotal stops presenting a partial sum as a whole one.

## Baseline and base

Named baseline: `feature/restaurant-modules` at **`e34977ac`**.

Two siblings had already landed off that same commit, on disjoint files:

| commit | lane | touches |
|---|---|---|
| `e41cdff2` | L-PRICE-CLEANUP-TWO | `components/shared/OfferDocument.vue` (dead import), `test/price-absence.test.js` |
| `8c6e91fa` | L-PRICE-BYPASS-FIVE | `utils/price.js` (**adds `statedSum`**), `test/price-bypass-legacy.test.js`, 7 pages |

`8c6e91fa` is **not** an ancestor of `e41cdff2`; both branch from `e34977ac`. Neither touches the
other's files. Work branch `lane/offer-partial-subtotal` was cut at `e41cdff2` and `8c6e91fa` merged
into it at **`b76cbbb`** — merged rather than edited around, and `statedSum` is **used, not
re-implemented**.

`8c6e91fa` is reachable from `refs/lanes/L-PRICE-BYPASS-FIVE` (a custom ref namespace, which is why
`git branch --contains` reports nothing). It is not an orphaned `commit-tree`.

## The defect, measured

Mounted for real (`@vue/test-utils`, real global mixin), lines `[49900, null]`:

```
lines:    ["kr 499,00", "—"]
subtotal:  kr 499,00        <-- the whole sum, from half the lines
25% mva:   kr 124,75        <-- 25% OF THE PARTIAL SUM
Totalt:    kr 623,75
```

Two things the brief did not report, found by looking rather than reasoning:

1. **The one-time column has the identical defect.** Measured `kr 9 990,00` where a line was unstated.
   Never separately reported; it would have survived a fix to the monthly column alone.
2. **An absent `quantity` is a third way in.** The sum is `fee * quantity`, so `49900 * undefined` is
   `NaN`, which `|| 0` swallowed — and this one is nastier, because the cell shows the UNIT fee, so
   the line still reads `kr 499,00` while contributing nothing to the figure below it.

## The product decision, and why

Three defensible answers, which are **different promises to a reader**:

1. total the stated lines and mark the sum partial;
2. print the absence mark;
3. **refuse to total at all, and say why.**

**Chosen: (3).** Two reasons.

- The bold **"Totalt inkl. mva" is the figure a customer quotes and acts on.** There is no honest way
  to print a *number* there while a line is unpriced. Marking a bold figure "partial" in small type
  beside it is the weakest form of honesty available, and it is the one a skimming reader loses.
- **(1) does not stay in one place.** It cascades to the VAT and gross rows, in two columns — six
  spots that each have to carry the caveat, one of which will eventually lose it. Refusal collapses
  to a single rule that is either on or off for a whole column.

(2) is rejected only in that bare dashes read as a broken renderer; a reader who thinks the page is
broken reloads it instead of asking for the missing price. So (3) = (2) **plus** an explanatory note.
`hasUnstatedTotal` renders it only when a **rendered** column is refused — a permanent caveat is
noise nobody reads.

This matches the rule `statedSum` already states for this family: *"A partial sum presented as a
total is a worse lie than no total: the reader cannot tell which term is missing."* Had this document
chosen differently, the document and the shared helper would disagree.

**The zero survives.** `!0` is `true`, so `|| 0` could not be swapped for another falsiness test: an
included line deliberately priced at nothing is a claim somebody made, and its offer still totals.
Only `isAmountStated` separates the three worlds.

### Is an absent fee really "unstated" and not "free"? — traced, and it is NOT clean

This was checked rather than assumed, because refusing would be wrong if absence normally meant
"this hardware line has no monthly cost". The trace found that it sometimes **does** mean that:

- `pages/admin/goods.vue:111-127` gives a catalogue item independent `enableMonthlyFee` /
  `enableOnetimeFee` flags, and renders the price inputs only under the matching flag. A one-time-only
  product therefore has **no `maxMonthlyFee` at all**.
- `pages/admin/offers.vue:634-638` seeds the line from `offerItem.maxMonthlyFee` — `undefined` for
  such a product — and `:277` renders the fee input only when `item.enableMonthlyFee`, so that
  `undefined` is **unreachable and unstatable** by the operator.
- `:702-705` saves it uncoerced, and `JSON.stringify` **drops the key entirely** from the POST.

So the chain *one-time-only product → `undefined` → key omitted* is real, and on such a line absence
means "not applicable", not "nobody said". Two things stop that from making refusal the wrong call:

1. **`hasMonthlyFees` (`OfferDocument.vue:172`) hides the whole column** unless some line has a
   positive monthly fee. An all-hardware offer draws no MÅNEDLIG column and no monthly total, so
   refusal blanks nothing. **Only MIXED offers are affected** — one stated monthly fee plus one
   absent — which is exactly the measured render this lane was sent to fix.
2. **The line already says `—` for that hardware row today**, landed and pinned by
   L-PRICE-CLEANUP-TWO. Given a line that says *unknown*, a total that says `kr 499,00` is
   incoherent whatever the right upstream answer is. If a mixed offer *should* total `kr 499,00`,
   the fix is to make that line say `kr 0,00` — not to let the total silently assume zero.

Refusal is therefore kept: it makes the document internally consistent and makes an upstream gap
**visible** that was previously hidden behind a total that quietly guessed.

### ⚠ FLAG — consequence a person should rule on

On a **mixed** offer (a one-time-only hardware line beside a monthly software line) the monthly
total now renders `—` where it previously rendered a number that was arguably correct. The document
cannot tell "not applicable" from "not stated", because `enableMonthlyFee` lives on the **catalogue
item** and is never sent to the document with the line.

The upstream fix is one of: write an explicit `0` for a fee kind a product does not carry, or send
the applicability flags with the line so the document can tell the two apart. Both are outside this
lane. **Not decided here.**

Also **not determinable from this checkout**: the backend is external, so whether a POST that omits
`monthlyFee` returns `null` (absence preserved) or `0` (absence silently converted to a stated zero)
is unknown. If it returns `0`, absence never reaches the document from a normally-created offer and
the flag above is moot.

## Four states

| # | tests | code | result |
|---|---|---|---|
| 1 | pre-existing | `b76cbbb` (pre-fix) | **GREEN** 55/55 (`price-absence` + `price-bypass-legacy`) |
| 2 | + new | `b76cbbb` (pre-fix) | **RED** 5 failed / 23 — subtotal `kr 499,00`, VAT `kr 124,75`, one-time `kr 9 990,00`, note absent |
| 3 | + new | fixed | **GREEN** 62/62 |
| 4 | + new | fixed, then VAT/gross reverted to `total * 0.25` in template | **RED** — `Expected: not "kr 0,00"` |

State 4 is the deliberate mutation that proves the sibling-row claim instead of asserting it:
`null * 0.25` is `0`, so **fixing only the subtotal makes the VAT row print a confident `kr 0,00`** —
trading a partial sum for an outright false one. That is why the VAT and gross rows are computeds
through `scaledTotal` rather than arithmetic in the template. File restored from copy afterwards;
state 3 re-run green.

Runner (submodule `core/` is not checked out in a lane worktree, so it is mapped to the main
checkout rather than symlinked — a symlink at `core` makes `git status` fail):

```
npx jest test/price-absence.test.js test/price-bypass-legacy.test.js --coverage=false \
  --moduleNameMapper '{"^~/core/(.*)$":"/Users/svendaneel/okam/Web-modules/core/$1","^@/(.*)$":"<rootDir>/$1","^~/(.*)$":"<rootDir>/$1","^vue$":"vue/dist/vue.common.js"}'
```

## Lint

`eslint` reports 2 errors on `OfferDocument.vue` (`arrow-parens`, on the `hasMonthlyFees` /
`hasOnetimeFees` one-liners). **Pre-existing** — the same two errors are present on the committed
file at `HEAD`, at the same rule and the same two lines before my comment shifted them. Not
introduced here, and not fixed here.

## Finding, NOT fixed here — four dead totals in `pages/admin/offers.vue`

`calculateTotalMonthly` (`:816`), `calculateTotalOnetime` (`:830`), `calculateTotalMonthlyValue`
(`:844`), `calculateTotalOnetimeValue` (`:858`) all carry the same shape:

```js
if (item.monthlyFee) { return sum + (item.monthlyFee / 100) * item.quantity }
return sum
```

An unstated fee is skipped, so the sum is partial and presented as whole — the same defect, four
more times. They also look like a **100× understatement**: they divide by 100 into kroner and then
hand the result to `priceLabel`, which itself expects minor units.

**All four have zero call sites** (`grep` across `pages components test layouts store plugins utils`
finds only the definitions), so unlike the offer document this is **not user-visible** — it is a trap
for whoever wires them up. Left alone deliberately: different file, different shape (dead-code
removal), and not improvised into this diff. Worth its own lane.

## Files changed

- `components/shared/OfferDocument.vue`
- `test/price-absence.test.js`

Nothing else. Committed by pathspec; no `git add -A`.

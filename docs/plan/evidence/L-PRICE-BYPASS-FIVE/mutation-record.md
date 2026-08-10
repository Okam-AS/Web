# L-PRICE-BYPASS-FIVE — the forty pins, opened, run at the trunk, and falsified

**Reason shape: (1) missing write-up.** The pins existed; the only openable artifact
(`lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md`) was about *what was not fixed*, and the pins themselves
were cited as a bare count against a **mutable local git ref**. This file is the run, made today, at the
**frontend trunk**.

## The evidence line as the plan recorded it, preserved before `plan verify` overwrites it

```
evidence: refs/lanes/L-PRICE-BYPASS-FIVE = 8c6e91fa (parent e34977ac); 39/39 pins
```

**Two things in that line are now wrong, and both matter.**

1. **The ref has moved.** `refs/lanes/L-PRICE-BYPASS-FIVE` resolves today to **`c4a4fa4416df97b0645d579f3565fb80ecc4bd03`**,
   not `8c6e91fa`. **`8c6e91fa` is not an ancestor of `feature/restaurant-modules`** and not of the session
   branch — it survives only on `candidate/fe-compose-2026-08-05` and a scattering of unmerged lane branches,
   so it is reachable but it is **not in the estate's trunk**. `c4a4fa44` (the same subject line, plus the
   `priceLabel` → `invoiceAmountLabel` rename the lane body describes) **is an ancestor of
   `feature/restaurant-modules`**. So the recorded SHA points at a superseded commit and the citation form —
   a local, movable ref — is the reason nobody noticed.
2. **The count is 40, not 39.** The plan said `39/39`, the RETURN said `40/40`, and the prior pass flagged
   the disagreement without resolving it. Measured today: **`Tests: 40 passed, 40 total`**. The RETURN was
   right.

## Where it was run, and why not in place

Measured in a private detached worktree at **`feature/restaurant-modules` = `5296dca83d42a36afeca7e16f5fa2d2e0f5657b0`**,
never in `/Users/svendaneel/okam/Web-modules` itself. That was not caution for its own sake — the plan
repo's working tree is **behind the trunk on three of the nine files this lane touches**
(`utils/price.js`, `pages/admin/settlements.vue`, `pages/admin/wolt-menu.vue`), so a run in place would
have measured an older tree and reported it as the estate. The other six are byte-identical to the trunk.

`node_modules` and the tracked `core` gitlink were symlinked in from the main checkout so jest could
resolve `~/core/services` through `plugins/global-mixin.js`; every file under test came from the trunk
commit.

## The exit, clause by clause, against the suite's own structure

> **none of the five bypass formatters renders an absent amount as a zero, each pinned over null, zero and
> a stated amount**

The suite is organised as one describe block per formatter family, each carrying the same four arms. The
five formatters and where each is pinned:

| # | bypass formatter | describe block | delegation pin |
|---|---|---|---|
| 1 | `kravia-invoice` `invoiceAmountLabel` | *the invoice page and the settlements page (nb-NO currency)* | `kravia-invoice invoiceAmountLabel` |
| 2 | `settlements` `formatAmount` | *(same block — both are nb-NO)* | `settlements formatAmount` |
| 3 | `wolt-menu` `formatPrice` | *the Wolt menu page ("206.80 kr")* | (+ 4 further pins on the price **input**) |
| 4 | `reward-members` `formatBalance` | *the rewards page ("206,80 kr")* | `reward-members formatBalance` |
| 5 | `products` + `OnboardingProductImages` raw `/100` | *the product lists ("206.80 NOK")* | *neither product surface divides the raw field in its template any more* |

Each of those blocks carries **exactly the three worlds the exit names**, plus a fourth arm that stops the
absent case from being satisfied by a currency-bearing placeholder:

- `an amount that never arrived is withheld` — **null**
- `a genuine zero is still printed as a figure` — **zero**
- `a stated amount is unchanged, and the three worlds are three different strings` — **a stated amount**
- `the withheld mark carries no currency of its own`

The sixth family — the X report, where *the arithmetic runs before the gate* — has its own three blocks
(`the X report sums amounts without inventing one`, `the X report totals that were summed with || 0`,
`statedSum, the rule the report totals now use`). It is outside the exit's five and is measured anyway.

## The falsification

Two mutations of the shared rule in `utils/price.js`, each an exact string replace, each restored with
`git checkout --` leaving `git status --porcelain` at **0 modified**.

| state | result | what it proves |
|---|---|---|
| baseline | **40 passed / 40 total** | the pins are green at the trunk |
| **M1b** — `isAmountStated` forced to `return true`, i.e. the absence gate removed | **22 failed / 18 passed / 40 total** | the absence case is what holds the suite up |
| **M2** — `statedSum` coerces (`total += Number(amount) \|\| 0`) instead of propagating absence | **6 failed / 34 passed / 40 total** | the arithmetic-before-the-gate half is separately pinned |
| restored | **40 passed / 40 total** | byte-identical restoration |

**M1b reds the absence arm of all five formatters, and of no zero arm.** That is the exit's sentence in
both directions — the pins cannot be satisfied by a formatter that simply refuses everything:

```
the invoice page and the settlements page (nb-NO currency)
    ✕ an amount that never arrived is withheld
    ✕ the withheld mark carries no currency of its own
    ✓ a genuine zero is still printed as a figure
    ✕ a stated amount is unchanged, and the three worlds are three different strings
  the Wolt menu page ("206.80 kr")      ✕ / ✕ / ✓ / ✕
  the rewards page ("206,80 kr")        ✕ / ✕ / ✓ / ✕
  the product lists ("206.80 NOK")      ✕ / ✕ / ✓ / ✕
```

plus the three delegation pins (`kravia-invoice invoiceAmountLabel`, `settlements formatAmount`,
`reward-members formatBalance`) and the Wolt price-input pin.

**The message is the defect, verbatim** — the exit's words as an assertion failure:

```
● the rewards page ("206,80 kr") › an amount that never arrived is withheld
    expect(received).toBe(expected)
    Expected: "—"
    Received: "0,00 kr"
```

**M2's six reds are disjoint from the five formatters** and land entirely on the arithmetic:
*a VAT row whose basis and amount both failed to arrive does not print a total*, *one absent term is enough*,
*a payment mean whose amount did not arrive does not silently drop out of the total*, *the corrections total
is withheld when any of its four terms is missing*, *absence propagates through the arithmetic instead of
being erased by it*, *the dine-in cell sums through statedSum*. A gate cannot see a hole the `+` already
filled, and the suite pins that separately.

## An honest negative: the first mutation I applied reddened nothing, and why

**M1** deleted the first line of `isAmountStated`:

```js
if (amountMinor === null || amountMinor === undefined) { return false }
```

and **all 40 tests stayed green** (`M1-absence-gate-deleted.txt`). The count disproves the void-run
explanation — 40 executed, same as baseline. The real reason is that **the line is redundant**: with it
gone, `null` and `undefined` are neither `number` nor `string` and fall through to the function's trailing
`return false`. Proven directly rather than argued (`M1-was-inert-proof.txt`):

```
null -> false | undefined -> false | 0 -> true | 206.8 -> true
```

That is a fact about the code, not a hole in the suite — the guard is defensive duplication of the
fall-through — and M1b, which removes the gate for real, reds 22. It is recorded because a mutation that
reds nothing is exactly the shape this program treats as a warning, and the warning resolves to
"inert mutation", not to "unfalsifiable pins".

## What this does not close

**C5.** No person has looked at any of these five pages. The lane's own RETURN says it:
*"C5: no human acceptance yet."* Three of the surfaces (the two product lists and one other) **cannot be
mounted by this suite at all** — optional chaining in their templates — and are pinned **at the source**
instead, which the suite states openly in its own block name: *the three pages this suite cannot mount are
pinned at the source*. A source pin shows the call site was changed; it does not show the page renders.

**The merge hazard in the lane body still stands.** `components/molecules/CustomerInfoModal.vue` carried
another lane's uncommitted deletion at build time, so this lane's committed version of that file
deliberately does not byte-match the working tree and needs a real three-way merge — an ours/theirs pick
loses one of the two deletions.

**`lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md` remains the record of what was *not* fixed** — roughly 22
sites still coercing absence into a figure, an inverse-defect family and the `−—` rows. This file does not
supersede it; the two answer different questions.

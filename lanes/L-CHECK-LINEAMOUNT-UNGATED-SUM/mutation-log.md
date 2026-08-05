# L-CHECK-LINEAMOUNT-UNGATED-SUM — mutation log

Brief `f845f9c0`. Worktree `/Users/svendaneel/okam/web-check-lineamount`, detached at the baseline
`refs/lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED` = `7a72c02`. `8c6e91fa` was never read or merged.

## The exit criteria, answered

1. **The line sum distinguishes an absent amount from a zero** — `CheckPanel.vue`, `groups`:
   `g.lineAmount += line.netLineAmount` → `g.lineAmount = statedSum(g.lineAmount, line.netLineAmount)`.
2. **The deposit sum distinguishes an absent amount from a zero** — same reducer:
   `g.depositAmount += line.depositAmount || 0` → `statedSum(g.depositAmount, line.depositAmount)`.
3. **The refund differs between the absent and the zero world** — proved in
   `test/check-lineamount-sum.test.js`, test named `THE FALSIFIER`, and printed by
   `refund-vs-sum-probe.js` part 3.

## The finding: the two worlds agreed about money

Four worlds. In `present`, `absent` and `partial` the till took the same 50,00 (the server's
`finalAmount`, built from `LineAmount − DiscountAmount`, which the panel does not use to build a row);
in `zero` the bill was fully comped and the till took nothing. Only what the WIRE states differs.

```
world      till took   OLD lineAmount   NEW lineAmount   OLD deposit   NEW deposit
present    5000        5000             5000             1000          1000
zero       0           0                0                0             0
absent     5000        0                null             0             null
partial    5000        2000             null             500           null
```

`SellScreen.onNegativeSale` reads `g.lineAmount` as the return line's `unitAmount` whenever a
discount is in play, so that sum is not a label — it is the money handed back:

```
world      till took    OLD refund     NEW refund
present    kr 50,00     kr 50,00       kr 50,00
zero       kr 0,00      kr 0,00        kr 0,00
absent     kr 50,00     kr 0,00        refused: the amount is missing
partial    kr 50,00     kr 20,00       refused: the amount is missing

OLD   absent = kr 0,00    zero = kr 0,00    <-- THE SAME
NEW   absent = refused    zero = kr 0,00    <-- THEY DIFFER
```

`0 + null` is `0`, so the absent world arrived at the refund already disguised as a genuine zero: a
customer handed back nothing on a bill the till took 50,00 for, on a prefill indistinguishable from a
fully-comped one. `partial` is the more plausible shape — a perfectly readable kr 20,00 that is short
by 30,00, with nothing on the page saying which term is missing.

**Refusing is the only honest branch.** Passing the `null` on makes `ReturnBuilder` compute
`null * quantity` and settle a silent kr 0,00; falling back to `unitAmount * quantity` refunds the
LISTED price, which is the defect the sibling removed from the other branch of this same `if`. The
operator is not dead-ended: `DayFlow.vue:114` mounts the same `ReturnBuilder` un-prefilled, so the
§ 5-3-7 return is still available to be built by hand from amounts a person states.

## The premise, re-verified rather than inherited

**Every write to the two fields.** Both are written in exactly one place each — the `groups` reducer
in `CheckPanel.vue` (seeded `lineAmount: 0` / `depositAmount: 0`, then accumulated). Nothing else in
the repo assigns either field on a group.

**Every reader outside the reducer.**

| field | reader | verdict |
|---|---|---|
| `lineAmount` | `CheckLine.vue:16` `priceLabel(group.lineAmount)` | safe — `plugins/global-mixin.js:165` gates `priceLabel` on `isAmountStated`, so `null` renders `—` |
| `lineAmount` | `SellScreen.vue:580` `unitAmount: g.lineAmount` | **the defect** — money |
| `lineAmount` | `test/check-discount-sum.test.js:207` | unaffected; every world there states its net |
| `depositAmount` | `CheckLine.vue:24` tag `v-if="… > 0"` | **would have silently switched off** — see below |
| `depositAmount` | `CheckLine.vue:147` `showTags` | same guard, same fix |

**The ruling I did not inherit, and it expired exactly as the sibling predicted it would.** The
deposit tag was safe on `> 0` only because `|| 0` guaranteed a number. Gating the sum makes the row
`null`, `null > 0` is false, and the tag would have vanished from `partial` — a row that genuinely
has pant, showing the tag today. That is the sum's defect moved one screen down rather than removed,
the same coupling the discount lane found between its sum and its row. Fixed with the predicate, not
a second answer: `isDeductionInPlay` now delegates to a general `isAmountInPlay`, so pant — an
addition to the bill — is not gated by a function that calls itself a deduction. The rule is written
once; part 1 of the probe asserts the rename moved nothing.

**The correction the orchestrator passed on, checked before repeating either claim.** These sums feed
a CHECK, not a receipt. Check rows render `netLineAmount`, already net, so a check adds up whether a
row shows or not — the "total disagreeing with its own lines" claim is **not reachable here** and is
not made. The harm is the refund, not a mismatch.

## Mutation proof

`bash lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/mutation-proof.sh` — every mutation in a scratch export,
never in place. Full transcript in `mutation-proof.txt`.

```
=== A. new test vs UNPORTED baseline 7a72c02 ===   RED as required: 16 failed
=== B0. ported tree, unmutated ===                 GREEN: 29 passed
[M1 the line sum reverts to the ungated +=]                    RED — 9 failed
[M2 the deposit sum reverts to the || 0 coercion]              RED — 4 failed
[M3 THE SUM-ONLY FIX: both sums gated, refusal deleted]        RED — 6 failed
[M4 the deposit tag reverts to > 0 (the silent switch-off)]    RED — 2 failed
[M5 the refusal uses truthiness instead of the absence rule]   RED — 3 failed
[M6 the refusal inspects only the first row]                   RED — 1 failed
[M7 isAmountInPlay loses its absence arm (back to > 0)]        RED — 3 failed
[M8 isAmountInPlay renders for every stated amount]            RED — 3 failed
[M9 statedSum stops being sticky]                              RED — 13 failed
```

**M3 is the mutation the brief names** — both sums gated, the refund still built from them. It is
caught by `THE FALSIFIER` and three others. A test asserting only the sums passes on M3.

**M6 was GREEN on the first run and that is how the hole was found, not by arguing about it.** Every
world had a single row, so a refusal written `groups.slice(0, 1).filter(...)` was indistinguishable
from one that inspects all of them. Closed by `SECOND_ROW_SILENT`, a two-row bill whose *second* row
is the silent one; the test now also asserts the message names `Bolle` and not `Kaffe`.

## Suite

| run | tree | result |
|---|---|---|
| baseline, pre-outage | clean at `7a72c02` | 2775 passed / 2 failed / 2777, 117 suites |
| baseline, re-run post-outage | clean at `7a72c02` | 2775 passed / 2 failed / 2777, 117 suites |
| with this lane | | **2804 passed / 2 failed / 2806, 118 suites** |

2775 + 29 = 2804 and 117 + 1 = 118: the lane adds its own suite and regresses nothing. The two reds
are the pre-existing `journey-artifact-store` worktree-basename assertions — they require
`/^Web-modules@/` and this worktree is `web-check-lineamount`. Proved pre-existing by running the
untouched baseline tree twice, not by stashing.

**The submodule was initialised first** (`git -c protocol.file.allow=always submodule update --init
core`); 118 suites load, so none of the money suites is silently absent. Validated on a known
positive: the first attempted baseline run reported a `ts-jest not found` **Validation Error while
exiting 0** — the worktree had no `node_modules`. Symlinked to the shared checkout's, as the sibling
lanes do. A run counted by exit code alone would have recorded that as a pass.

## Dirty state found, and a merge hazard

My worktree was created fresh from the baseline ref and was clean before the first edit.

In the SHARED checkout `/Users/svendaneel/okam/Web-modules` (`feature/restaurant-modules`, `e34977a`)
these files were **already dirty before I started** and I did not touch that tree:

- `utils/price.js` — +118 lines, uncommitted. This is an **earlier revision of the X/Z lineage that
  is already committed on my baseline** (`statedSum`, `MINUS_SIGN`, `negatedAmountLabel` — its
  `negatedAmountLabel` doc is the short pre-`Nine rows` version). Same content by a different route,
  not a conflicting third change — but it is where my `isAmountInPlay` addition lands, so the merge
  must reconcile the two.
- `translations/{no,en,de}.ts` — ~380 uncommitted lines each, another lane's work. My change is one
  key per file (`pos_negative_sale_unpriceable`), anchored after `pos_negative_sale_done`.
- Also dirty in `components/admin/pos/`, none of them mine: `PosShell.vue`, `PosTopBar.vue`,
  `XReportView.vue`, and an untracked `ClockScreen.vue`.

None of `CheckPanel.vue`, `CheckLine.vue` or `SellScreen.vue` was dirty there.

## Files changed

```
components/admin/pos/CheckPanel.vue     the two sums
components/admin/pos/CheckLine.vue      deposit tag on the predicate + the unknown mark
components/admin/pos/SellScreen.vue     onNegativeSale refuses a row it cannot price
utils/price.js                          isAmountInPlay; isDeductionInPlay delegates to it
translations/{no,en,de}.ts              pos_negative_sale_unpriceable
test/check-lineamount-sum.test.js       29 tests
lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/   probe, probe output, mutation proof, transcript, this log
```

## Constraints

C1/C2 not engaged (no SQL, no migration, no append-only table). C3: the refusal's lever is the
existing shell-owned `notify`, and the un-prefilled `ReturnBuilder` in `DayFlow` keeps the return
reachable. C4: the change removes a money-path write rather than adding one; no actor resolution is
altered. C5: no item is claimed accepted — a suite is evidence for the mutation proof only, and the
journey still needs a person. C6: no statutory claim added; the § 5-3-7 reference in the log is
describing an existing flow, not printed by new UI. C7: nothing logged.

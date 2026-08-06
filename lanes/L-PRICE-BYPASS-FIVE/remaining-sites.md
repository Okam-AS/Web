# Money-absence sites still open after L-PRICE-BYPASS-FIVE

Baseline `e34977ac`. This lane fixed six sites (five legacy formatters + the X report's pre-gate
arithmetic). What follows is everything else the census turned up, split into **checked-and-safe**
and **still wrong**, because a census that does not separate those two is indistinguishable from
silence.

## A. Absent renders as a real amount — same family, NOT fixed

Roughly 22 sites still coerce absence into a figure. Highest-value first:

| Site | Expression | Absent renders as |
|---|---|---|
| `pages/admin/tripletex.vue:623` | `((ore \|\| 0) / 100).toLocaleString(...)` | `0,00 kr` |
| `pages/admin/tripletex.vue:627` | `(Number(value) \|\| 0).toLocaleString(...)` | `0,00 kr` |
| `pages/admin/tripletex.vue:374` | `reduce(sum + (Number(p.amount) \|\| 0), 0)` | posting total invented |
| `pages/admin/overview.vue:528,536` | `reduce(sum + (s.totalAmount \|\| 0), 0)` | estate turnover invented |
| `pages/admin/offers.vue:823,837,851,865` | `sum + (item.monthlyFee / 100) * qty` | `NaN` or silent 0 |
| `pages/admin/surfboard.vue:782,787` | `(testResult.amount / 100).toFixed(2)` | `0.00` / `NaN` |
| `pages/admin/wolt-calc.vue:148` | `netSubsidy ? … : "0"` | `0` (also eats a real zero) |
| `pages/admin/poweruser-growth.vue:229` | `getPointValue(...) / 100` | chart point at 0 |
| `pages/admin/statistics.vue` | several raw `/ 100` | `0.00` / `NaN` |
| `pages/admin/delivery.vue:405,505` | `parseInt(... \|\| 0)` | `0` |
| `pages/admin/import.vue:488,718` | `(newValue ?? 0) * 100` | writes a real 0 |
| POS components | `ReceiptModal`, `SellScreen`, `CheckPanel`, `DiscountModal`, `ReturnBuilder`, `CashPointsTab` | assorted |
| `components/organisms/Product.vue` | raw `/ 100` | `0.00` / `NaN` |
| `components/admin/VariantEditorModal.vue`, `ProductSelectorModal.vue` | raw `/ 100` | `0.00` / `NaN` |

## B. The INVERSE defect — a genuine zero renders as absent

These are wrong in the other direction and need a ruling, not a copy of this lane's fix. `!0` is
`true`, so each of these erases the case that must survive:

- `components/admin/pos/XReportView.vue:42` — `g.discountAmount ? priceLabel(g.discountAmount) : '—'`
- `components/admin/pos/XReportView.vue:48` — same shape on the totals row
- `components/admin/VariantEditorModal.vue` — same truthiness ternary

A goods group that genuinely gave no discount is a fact, and it currently prints as a fact nobody
recorded.

## C. `−—` : a minus sign attached to the unknown mark

Raised by the reviewer and **confirmed empirically**, not by reading: mounting `XReportView` with
`negativeSalesAmount: null` and `grandTotalReturns: null` renders

```
["pos_report_negative_sales (2)−—", "pos_report_return ()−—", "pos_report_return−—",
 "pos_report_negative_sales−—", "pos_report_errors−—"]
```

The sign is a literal in the template, outside the interpolation, so the gate cannot reach it:

- `XReportView.vue:51` negative sales
- `XReportView.vue:54` referenced returns
- `XReportView.vue:88` grand-total returns
- `XReportView.vue:94` grand-total negative sales
- `XReportView.vue:97` grand-total errors
- `XReportView.vue:178` per-operator returns (needs an operator row to appear; not in the probe above)

Six rows, not the two first reported. This is a **fiscal document**, so "minus unknown" is a claim
about a direction of money that was never stated. The fix is to move the sign inside the gate (a
`negatedAmountLabel`, or pass a sign flag to `priceLabel`) so absence renders as a bare `—`. Not
done here: it changes what five shipped rows print and wants its own review.

## D. Checked and ruled SAFE — already gated, no change needed

- `pages/admin/wolt-drive-invoice.vue` — `formatCurrency` gates before formatting
- `components/molecules/CustomerInfoModal.vue` — local `priceLabel` shadow being removed by the
  shadow-guard lane (see note E)
- `utils/margin/money.js` + all Margin panels — `unknownMark` throughout
- `utils/events/guest.js` `formatMoney`, `EventsJourney.vue`
- `components/admin/workforce-rates/WorkforceRateTimeline.vue`
- `components/admin/pos/CardTerminalStatus.vue` — pinned by `test/price-absence.test.js`

## E. Ownership note

`components/molecules/CustomerInfoModal.vue:305-314` holds a dead `calculateTotalRewards` carrying
the `(reward.balance || 0)` reduce pattern. Verified dead: the identifier occurs exactly once in the
whole repo — its own definition. It is queued for deletion, but the file currently carries the
shadow-guard lane's **uncommitted** removal of that component's local `priceLabel`, so committing
the path from this lane would sweep in another lane's unreviewed work. See the lane's reply to the
coordinator for how this was resolved.

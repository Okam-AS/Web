```
RETURN: L-OFFER-PARTIAL-SUBTOTAL
brief: a02d8ad0
verdict: built
evidence: lanes/L-OFFER-PARTIAL-SUBTOTAL/mutation-log.md (on lane/offer-partial-subtotal @ 35e5cdd)
log:
Baseline e34977ac; cut at e41cdff2, merged sibling 8c6e91fa -> b76cbbb. statedSum USED, not rebuilt.
Chose REFUSE-TO-TOTAL plus a note saying why, over marking a partial sum. Why: the bold
"Totalt inkl. mva" is what a customer quotes, so no number is honest there while a line is
unpriced; and marking-partial cascades to 6 spots, one of which loses it. Agrees with statedSum.
Beyond the report, by looking: the ONE-TIME column had the identical defect (kr 9 990,00), and
an absent QUANTITY is a third way in (49900*undefined = NaN, swallowed by || 0).
Mutation-proved the siblings: fixing only the subtotal makes VAT print kr 0,00, since null*0.25
is 0 — a partial sum traded for an outright false one. Hence the scaledTotal computeds.
4 states: 55/55 pre; 5 failed w/ new tests pre-fix; 62/62 post; revert-VAT red again.
Full suite 2622/2624; both reds are worktree artifacts — core-request-path-shape fails identically
at my PRE-FIX base, passes 8/8 in main checkout. 2 eslint errors pre-existing (arrow-parens).
FLAG: on a MIXED offer the monthly total now reads "—" — a one-time-only product's
enableMonthlyFee never reaches the document, so it cannot tell n/a from not-stated. Upstream call.
FINDING not fixed: pages/admin/offers.vue:816/830/844/858 repeat the shape, look 100x off, and
have ZERO call sites (dead, not user-visible) — own lane. Shared checkout never written.
END RETURN
```

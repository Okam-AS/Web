```
RETURN: L-JOURNEY-MARGIN
brief: 58f332be
verdict: built
evidence: artifacts/journeys/margin-week-freeze.playwright.json, artifacts/journeys/margin-supplier-to-plate.playwright.json, lanes/L-JOURNEY-MARGIN/NOTES.md
log: Base measured first in a clean checkout: recipe-to-margin + statement-week, 2 passed, 33.3s. Jest after: 110 suites / 2481 tests pass. All four margin walks green at the tip.
margin-week-freeze, 9 steps, passed, 58 fixture responses. It PRESSES the control instead of asserting it gone, because a page that had lost the spend editor entirely would satisfy every toHaveCount(0).
ARM 1: open week takes the spend save and the server's own actual moves kr 0,00 -> kr 14 000,00. A second page in the same context then finalises it, which leaves tab one stale with its editor still drawn - the only honest way a browser reaches a control the product means to remove.
ARM 2: same page, same button, PUT /inputs -> 400 uncoded, the server quoted whole, and the request is checked to have LEFT the browser so no client-side guard could pass the arm. Reload: 1 line, kr 14 000,00, the refused kr 9 000,00 nowhere. ARM 3: the correction takes the same amount. One variable.
margin-supplier-to-plate, 13 steps, passed, 112 responses, 5 shots. Ingredient authored by hand (a starter carries a price, which would make the whole chain unfalsifiable); article saved with no pack size and marked preferred; invoice price entered; recipe checked STILL unpriced; then one field fixed and kr 900,00 per 10 kg carton becomes batch kr 36,00, portion kr 4,50, plate kr 4,50, 15,00 pct. A price rise closes the old row at the seam and every figure follows.
Fixture gained the supplier half it never had - /margin/suppliers used to answer a constant list of two names with nothing behind it. Nine routes, verified route-for-route against OkamAPI-modules MarginSuppliersController, plus the resolver's three costability rules. Starter pricing unchanged, so recipe-to-margin is untouched.
REDS BY MUTATION, both recorded and reverted: freezing made to have no force -> ARM 2 red, no refusal element at all, the frozen week accepted the edit. Pack size defaulted to 1 -> supplier walk red, kr 360,00 where the page must withhold.
DEFECT FILED in the freeze artifact: the statement waste panel calls four routes no OkamAPI checkout here publishes (checked two that do carry the rest of Margin), and loadWaste swallows the 404 into "unknown" - so an absent feature reads as a failed read.
Two notes filed: a stale tab keeps offering a frozen week's controls (no push, no re-read on focus), and the preferred-article rule is only half driven - one article exists, so the suppress-a-complete-rival branch is unproven.
Observed, not fixed: test/e2e/fixture/margin.js carries no anchors, so fixture-divergence says nothing about Margin; its 22 findings are all pre-existing growth/meals. Default OKAM_API_REPO is on feature/swiss and has no Margin module.
No live run and no container started. Margin carries no @live tag, five foreign worlds are up and none is this lane's, so the honest label is fixture. Guard-proof re-run after the change: all 7 arms hold.
END RETURN
```

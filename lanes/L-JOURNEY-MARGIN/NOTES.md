# L-JOURNEY-MARGIN — lane notes

Brief 58f332be. Frontend `Web-modules`, branch `feature/restaurant-modules`.

## Base, measured in a clean checkout first

`base-clean-checkout.txt` — `margin-recipe-to-margin` + `margin-statement-week`, 2 passed (33.3s),
ports 3477/4477. Tracked tree clean at that point (only untracked `lanes/`, `docs/plan/`).
Jest after all changes: 110 suites / 2481 tests, all pass.

## What was built

Two journeys and the fixture surface one of them needed.

### `test/e2e/journeys/margin-week-freeze.spec.js`

9 steps. The freeze walk `margin-statement-week` does not do: it PRESSES the control instead of
asserting it is gone.

- ARM 1 — week Open, press "Lagre" on a spend line, the server's `actual` moves kr 0,00 -> kr 14 000,00.
- The week is finalized from a SECOND page in the same browser context, which leaves the first tab's
  model stale and its editor drawn. That is the only honest way a browser reaches a control the
  product intends to remove — a `fetch` from the spec would prove the fixture holds a rule, not that
  the product enforces one.
- ARM 2 — same page, same button, same endpoint: `PUT .../inputs` -> 400 uncoded, the page quotes the
  server verbatim. Asserted on the WHOLE sentence (see below), plus a check that the request LEFT the
  browser, so the arm cannot pass against a client-side guard.
- ARM 2b — reload: still 1 spend line, still kr 14 000,00. The refused kr 9 000,00 is nowhere. Only
  now is the absence of every mutating control asserted.
- ARM 3 — open the correction, press the same button with the same amount: accepted. One variable.

**Known-good red on a differing world.** Finalising bumps the rowversion, so the stale tab holds a
stale revision as well as a frozen statement, and which rule answers is an ORDERING the server
chooses. The fixture checks immutability first. A backend that checked `If-Match` first would answer
`margin.stale-revision`, the page would render `mrgs_err_stale`, and this walk would red on the
quoted sentence — correctly, and meaning the ordering differs, not that the week is editable. The
assertion is on the whole sentence for exactly that reason.

### `test/e2e/journeys/margin-supplier-to-plate.spec.js`

13 steps, 5 screenshots, 112 fixture responses.

ingredient -> supplier -> article -> price -> plate cost -> margin, and the middle goes wrong on
purpose: the article is saved without a pack size and marked preferred (both accepted by the server),
a price is entered against it, and the recipe is checked as STILL unpriced. Then one field is fixed
and kr 900,00 per 10 kg carton becomes kr 90,00/kg -> batch kr 36,00 -> portion kr 4,50 -> plate
kr 4,50 -> 15,00 % food cost. Last step raises the price to kr 1 080,00: the old row closes at the
instant the new one opens (seam asserted), and every figure follows to kr 43,20 / kr 5,40 / 18,00 %.

The ingredient is authored by hand rather than copied from the starter library. A starter carries a
price with it, which would make every assertion about the supplier chain unfalsifiable.

### `test/e2e/fixture/margin.js`

The supplier half of the module did not exist in the fixture: `GET /margin/suppliers` answered a
constant list of two names with no articles and no prices, so `/admin/margin-suppliers` could be
opened and nothing on it driven. Added, route-for-route with `MarginSuppliersController` (verified
against `~/okam/OkamAPI-modules/Controllers/MarginSuppliersController.cs`, which declares exactly
these nine and no `GET /margin/suppliers/{id}`):

    GET  POST /margin/suppliers
    PUT       /margin/suppliers/{id}                       (If-Match)
    POST      /margin/suppliers/{id}/archive               (If-Match, clears the contact person)
    GET  POST /margin/suppliers/{id}/items
    PUT       /margin/suppliers/{id}/items/{itemId}        (If-Match)
    GET  POST /margin/supplier-items/{id}/prices           (NO If-Match — append-only)
    GET       /margin/ingredients/{id}

Plus `resolvePricePerBaseUnit`, which reproduces the three `MarginPriceResolver` rules that decide
whether a plate cost exists (candidate must be Active + packSize>0 + factor>0; an incomplete
PREFERRED article un-prices the whole ingredient; only the open price row counts), and the two
seeded suppliers moved from a constant into state so the statement journey's spend attribution keeps
working while the supplier surface can add a third.

Starter ingredients keep their direct `pricePerBaseUnitMinor`; an ingredient with ANY article is
priced by the resolver and the seeded figure is ignored. Documented in the file header.

## Reds proven by mutation

| file | run | mutation | result |
|---|---|---|---|
| `freeze-red-mutation1-guard-removed.txt` | freeze | drop the `state === 'Finalized'` guard | RED at ARM 2 — but on `mrgs_err_stale`, because the rowversion guard catches it instead. Not the claimed semantic. |
| `freeze-red-mutation2-freeze-has-no-force.txt` | freeze | drop that guard AND the revision bump in `/finalize`, i.e. freezing has no force | RED at ARM 2, `element(s) not found` — no refusal was rendered because the frozen week ACCEPTED the edit. This is the mutation the exit criterion asks for. |
| `supplier-red-mutation-packsize-default.txt` | supplier | default a missing `packSize` to 1 in `isCostable` (the "helpful" one-liner `utils/margin/supplier-model.js` warns about) | RED at "still unpriced": `kr 360,00` where `—` was expected — kr 900,00 per carton read as kr 900,00 per kilo. |

Both mutations reverted; `git status` shows one modified tracked file (`test/e2e/fixture/margin.js`)
and two new specs. All four margin journeys green afterwards (`all-four-margin-green.txt`).

The first freeze mutation is kept because it is informative: it shows the two rules are BOTH in reach
of that request and that the walk reds under either, which is the caveat written into the spec header.

## Findings recorded in the artifacts

- **defect (freeze walk): the statement waste panel calls routes no backend publishes.**
  `GET /margin/waste` 404s. The fixture routes nothing under it — and neither does the product:
  `grep -r "margin/waste"` finds no controller in `OkamAPI-modules` (`lane/meals-grace-pins`) or
  `OkamAPI-restaurant-control` (`feature/restaurant-control-stage0`), both of which carry
  `MarginSuppliersController`, `MarginStatementsController` and the rest of the module.
  `utils/margin/waste-client.js` declares four routes; `MarginWastePanel` is composed into
  `/admin/margin-statements`. `loadWaste` swallows the failure and the panel renders "unknown",
  which is indistinguishable from a read that merely failed — so the surface looks live and is not.
  NOT verified against the branch this frontend actually deploys against; two checkouts, both missing it.
- **note (freeze walk): a stale tab keeps offering the edit controls of a week that has since been
  frozen.** No push channel, no re-read on focus. Nothing is lost (the server refuses and the page
  quotes it — ARM 2 proves that), but the venue meets a refusal where the design intends an absence.
- **note (supplier walk): the preferred-article rule is only half driven.** The article is preferred
  and is the ingredient's ONLY one, so what is proven is that an incomplete article does not cost —
  not that an incomplete preferred article suppresses a COMPLETE rival. That needs a second supplier
  selling the same ingredient; no journey builds one.

## Not done / observed

- **`test/e2e/fixture/margin.js` carries no `anchor` declarations at all**, so
  `npm run test:e2e:fixture-divergence` says nothing about Margin — the 22 divergences it reports are
  all pre-existing, in `growth-newsletter.js` and `meals.js`. The default `OKAM_API_REPO`
  (`~/okam/OkamAPI`) is on `feature/swiss` and has no Margin module, so anchoring against it would
  report every Margin route as missing. The new routes were checked by hand against
  `OkamAPI-modules` instead.
- No live run. Margin carries no `@live` tag, five foreign containers are up and none is this lane's,
  and the honest label for what ran is `fixture`.
- `test/journey-artifact-store.test.js` passes here (checkout is named `Web-modules`).

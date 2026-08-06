# L-CLIENT-TRAILING-SLASH — receipt

## The finding, verified before building

`core/services/user-service.ts:18` posted `PostRequest("/user/confirm-email/", { code })`.
`OkamAPI/Controllers/UserController.cs:37` declares `[HttpPost("confirm-email")]` — bare.
ASP.NET matches either spelling, so production never noticed; the e2e fixture answered 404 and the
account page reported failure against a backend that was fine.

## Where the brief was wrong

The brief said the confirm route carried a trailing slash "unlike every other route in that file".
It was not one route and not one file. A parse of every `RequestService` call site in the repo
(418 sites, all parsed) found **13** paths ending in `/`, five of them in `user-service.ts` itself:

| file | route |
|---|---|
| core/services/user-service.ts | `/user/confirm-email/` |
| core/services/user-service.ts | `/user/send-email-confirmation-code/` |
| core/services/user-service.ts | `/user/rewardcards/` |
| core/services/user-service.ts | `/user/address/` |
| core/services/user-service.ts | `/user/name/` |
| core/services/giftcard-service.ts | `/giftcard/validate/` |
| core/services/order-service.ts | `/orders/update/` |
| core/services/order-service.ts | `/orders/processing/` |
| core/services/payment-service.ts | `/payment/paymentMethods/` |
| core/services/store-service.ts | `/stores/removeemployee/` |
| core/services/stripe-service.ts | `/stripe/createPaymentIntent/` (x2) |
| core/services/vipps-service.ts | `/vipps/initiate/` |

Every one of the 13 is declared bare on the backend — checked against `OkamAPI/Controllers/`:
`UserController` (confirm-email, send-email-confirmation-code, rewardcards, address, name),
`GiftcardController` (validate), `OrdersController` (update, processing), `PaymentController`
(paymentMethods), `StoresController` (removeemployee), `StripeController` (createPaymentIntent),
`VippsController` (initiate). So the bare form is not a preference; it is what the server declares.

All 13 were fixed, not just the one, because a guard with twelve exceptions is not a guard.

## Consequence handled

`test/e2e/fixture/consumer-api-server.js:391` matched `'/payment/paymentMethods/'` exactly. The
consumer journeys drive `../ConsumerWeb`, which carries its OWN `core` and still posts the slashed
form, so that fixture is now slash-insensitive rather than re-pinned to the other spelling.

## The check

`test/core-request-path-shape.test.js`. No allowlist and no list of routes. It derives:

* which `RequestService` methods take a path — from `RequestService`'s own signatures, a public
  `*Request` whose first parameter is literally named `path`. `GetHeadRequest(fullPath)` excludes
  itself.
* the corpus — a string-and-comment-aware walk of every `.ts/.js/.vue` outside
  `node_modules/.nuxt/coverage/artifacts/lanes/docs/test/static`, with a paren scanner that lifts
  the first argument of every call site.
* the rule — a normalisation identity: one leading slash, no doubled slash, no trailing slash. A new
  route is covered because the walk finds it, not because anyone remembered to list it.

One remembered fact only: `notPathTaking` must equal exactly `['GetHeadRequest']`, which is what
makes a renamed `path` parameter red instead of quietly shrinking the corpus (mutation M5).

## Mutation proof — every assertion falsified

`scratchpad/mutation-runs.txt`. Eight mutations, each restored afterwards; final run 8/8 green.

| # | mutation | reds |
|---|---|---|
| M1 | the original defect put back (`"/user/confirm-email/"`) | A, pin |
| M2 | a new route added with a trailing slash | A |
| M3 | a new route with a doubled slash | A2 |
| M4 | a new route with no leading slash | A3 |
| M5 | `RequestService.GetRequest` renames its `path` parameter | 1 |
| M6 | the first-argument scanner returns nothing | 2, 3, 4, pin |
| M7 | the file walk no longer reaches `core/` | 2, 3, 4, pin |
| M8 | the confirm-email call renamed away | pin |

Every one of the eight tests reds under at least one mutation. None of them is an assertion that
cannot fail.

## Not built, deliberately

A cross-check that the fixture implements every route the client posts. It is feasible from exactly
this corpus — the extracted route literals are one half of the pair and `test/e2e/fixture/*.js` holds
the other half — but deciding what a missing fixture route MEANS (unimplemented, deliberately absent,
or exercised by no journey) is the wider-problem lane's judgement, not this one's. Noted in the
guard's header so the next reader finds the seam rather than the absence.

## Browser proof that the fix reached the WIRE, not just the source

The committed fixture matches both spellings, so a passing journey against it proves nothing about
which spelling the client writes. To make the journey discriminate, the fixture was TEMPORARILY
pinned to the bare path (`path ===` instead of `unslashed ===`) and an A/B/A run driven on ONE warm
dev server on ports 3037/4037 — one server for all three, so a cold Nuxt build could not be mistaken
for a product answer. `scratchpad/aba.txt`:

| probe | client | fixture | result |
|---|---|---|---|
| A | bare (committed) | pinned to bare | PASSED 8.0s |
| B | slashed (reverted by hand) | pinned to bare | FAILED — `.ae-page__panel--code` never appeared |
| A' | bare (restored) | pinned to bare | PASSED 5.2s |
| final | bare (committed) | committed, tolerant | PASSED 5.6s |

B is the defect reproduced end to end: the page reported failure while the fixture was answering
correctly for the path the controller declares. A and A' are the fix on the wire. The fixture pin was
reversed by exact string replacement, never by restoring a copy, and `git status` is clean for it.

COLD-START FLAKE, recorded because it wasted a run and will waste someone else's: on a COLD Nuxt dev
build this journey failed twice with identical code that passed warm (once at `page.goto` 30s, once
at the code panel). Every probe above was therefore run against one pre-warmed server. This is a
harness observation, not a product finding, and it is not this lane's to fix.

## Tiers

* `npx jest --coverage=false` — 104 suites / 2370 tests / 0 failed, at the commit.
* `npx playwright test test/e2e/journeys/account-email-confirm.spec.js` — 1 passed at the commit,
  ports 3037/4037, servers started and stopped by this lane. Nothing on 3952 was touched.

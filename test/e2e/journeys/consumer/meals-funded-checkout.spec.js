// A guest with a company membership puts lunch on the company tab.
//
// WHAT THIS IS EVIDENCE FOR. The backend has been able to fund an order since the Meals module
// shipped, and no client could ask it to: cart completion refuses a `CompanyAccount` tender without
// a `reservationToken`, no client bound the quote endpoint that mints one, and no frontend enum even
// had the tender. This journey drives the real ConsumerWeb checkout — the one a guest uses — through
// the whole path: the payer strip appears, the quote is minted with its idempotency key, the token
// travels to cart completion, and the company's budget is what pays.
//
// WHAT IT IS NOT EVIDENCE FOR. The app is pointed at test/e2e/fixture/consumer-api-server.js, not at
// the .NET API. The fixture holds the parts of the contract this journey is about — the idempotency
// precondition, the bind's order of checks, the cap — so the CLIENT's side is proven; the server's
// answers are asserted to be what the code says they are, not observed from it. Nobody has driven
// this against a live backend, and until somebody does, `backend: "fixture"` in the artifact is the
// honest reading.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, recordApiCalls } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();
const UNDER_TEST = underTest();

const stats = async (request) => (await request.get(FIXTURE + '/__fixture/stats')).json();

test(
  'a guest puts lunch on the company tab and the company budget pays for it',
  journeyDetails({
    journey: 'meals-funded-checkout',
    capabilities: ['meals.funding.quote', 'meals.funding.token.client', 'meals.tender.companyaccount', 'meals.order.funded'],
    surface: 'consumer',
    underTest: UNDER_TEST
  }),
  async ({ page, request, journey }) => {
    await cutExternalNetwork(page);
    const calls = recordApiCalls(page);
    await seedGuest(page);

    await journey.step('open the checkout as a signed-in guest with a cart', async () => {
      await page.goto('/checkout');
      await expect(page.getByTestId('checkout-submit')).toBeVisible();
      return 'cart total ' + world.CART_TOTAL_MINOR + ' minor (' + world.CURRENCY + ')';
    });

    await journey.step('the company payer strip offers the company tab', async () => {
      const option = page.getByTestId('meals-company-option');
      await expect(option).toBeVisible();
      await expect(option).toContainText('Nordane');
      const remaining = await page.getByTestId('meals-remaining').textContent();
      await journey.shot('payer strip offers the company tab');
      return 'strip reads: ' + (remaining || '').trim();
    });

    await journey.step('choose the company tab and a reservation is minted', async () => {
      await page.getByTestId('meals-company-option').click();
      await expect(page.getByTestId('meals-reserved')).toBeVisible();
      await expect(page.getByTestId('meals-covered')).toBeVisible();

      const quote = calls.filter((c) => c.url.indexOf('/meals/quotes') > -1);
      expect(quote.length, 'the client bound POST /v1/stores/{id}/meals/quotes').toBeGreaterThan(0);

      // The idempotency precondition is a CLIENT claim: the endpoint refuses a mutation without it.
      const key = quote[0].headers['idempotency-key'];
      expect(key, 'the quote carried an Idempotency-Key header').toBeTruthy();

      // And the quote hash is the pinned one, not something a call site invented.
      const sent = JSON.parse(quote[0].postData || '{}');
      expect(sent.currency).toBe(world.CURRENCY);
      expect(sent.cartTotalMinor).toBe(world.CART_TOTAL_MINOR);
      expect(String(sent.quoteHash)).toMatch(/^sha256:[0-9a-f]{64}$/);

      await journey.shot('company tab chosen, reservation held');
      return 'quoted ' + sent.cartTotalMinor + ' minor, hash ' + sent.quoteHash.slice(0, 20) + '…, key ' + key;
    });

    const submitted = await journey.step('place the order', async () => {
      await page.locator('[data-testid="checkout-submit"] button').click();
      await page.waitForURL(/\/confirmation/, { timeout: 30000 });
      // Wait for what the GUEST sees, not just for the URL: a route change is not a confirmation.
      await expect(page.getByTestId('confirmation-heading')).toBeVisible();
      await expect(page.getByTestId('order-total')).toHaveText('188,–');
      await expect(page.getByTestId('checkout-error')).toHaveCount(0);
      await journey.shot('order confirmed');

      const complete = calls.filter((c) => c.url.indexOf('/carts/complete/') > -1);
      expect(complete.length, 'the client completed the cart').toBe(1);
      // THE LANE'S WHOLE POINT: the token the quote returned travels to cart completion.
      const token = new URL(complete[0].url).searchParams.get('reservationToken');
      expect(token, 'cart completion carried the reservation token').toBeTruthy();
      return 'completed with a reservationToken of ' + String(token).length + ' characters';
    });

    await journey.step('the company budget is what paid', async () => {
      const after = await stats(request);
      const reservation = after.reservations[0];
      expect(after.reservations.length).toBe(1);
      expect(reservation.state, 'the reservation is bound to the order').toBe('Bound');
      expect(reservation.order, 'bound to the order that was just created').toBeTruthy();
      expect(reservation.cap).toBe(world.CART_TOTAL_MINOR);
      // The member's remaining company contribution went down by exactly the funded amount.
      expect(after.remainingAllowanceMinor).toBe(world.ALLOWANCE_MINOR - world.CART_TOTAL_MINOR);
      return 'reservation ' + reservation.id + ' Bound to ' + reservation.order +
        '; allowance ' + world.ALLOWANCE_MINOR + ' -> ' + after.remainingAllowanceMinor + ' minor';
    });

    journey.finding('note', 'v1 funds an order fully or not at all — there is no split tender',
      'The lane objective describes the company paying "its share" with the guest paying the remainder. ' +
      'The backend does not do that: MealsFundingAuthority.ValidateAndBindAsync denies with ' +
      'MEALS_OVER_RESERVED_CAP when the cart total exceeds the reservation cap, PaymentType.CompanyAccount ' +
      'is a single tender on the whole order, and no endpoint accepts a second tender for a remainder. ' +
      'This journey therefore proves a FULLY funded order. The over-allowance case is walked by ' +
      'meals-funded-over-allowance.spec.js, which shows the guest is told before they press pay.');

    journey.finding('note', 'the reservation token is never persisted by the client',
      'It is held in a closure inside the checkout store (core/pinia/checkout.ts), deliberately not a ' +
      'ref, because every ref there is mirrored into localStorage by persistenceService.watchAndStore. ' +
      'It is never logged. Completed: ' + submitted);
  }
);

// Strip the reservation token off the wire and the funded order must NOT stand.
//
// WHY THIS EXISTS. `meals-funded-checkout` shows a company-funded order completing. On its own that
// is compatible with a checkout where the token is decorative — where the order would have gone
// through anyway and the guard is not what is holding it up. This journey removes exactly one thing,
// the `reservationToken` query parameter, at the network layer, and asserts the order is refused
// with the stable reason and the reservation is left unbound. Same page, same clicks, one byte-level
// difference: that is what makes the green run mean something.
//
// The token is removed on the WIRE rather than by making the client misbehave, because the claim
// under test is the SERVER's ("a CompanyAccount tender without a valid reservation is refused"), and
// a client patched to send nothing would only be testing the patch.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, recordApiCalls } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();

test(
  'the same order without its reservation token is refused and nothing is funded',
  journeyDetails({
    journey: 'meals-funded-guard',
    capabilities: ['meals.funding.guard.untokened', 'meals.refusal.attribution'],
    surface: 'consumer',
    underTest: underTest()
  }),
  async ({ page, request, journey }) => {
    let strippedFrom = null;
    await cutExternalNetwork(page, (url) => {
      if (url.indexOf('/carts/complete/') === -1) { return null; }
      const parsed = new URL(url);
      if (!parsed.searchParams.has('reservationToken')) { return null; }
      parsed.searchParams.delete('reservationToken');
      strippedFrom = parsed.pathname;
      return parsed.toString();
    });
    const calls = recordApiCalls(page);
    await seedGuest(page);

    await journey.step('choose the company tab exactly as the funded journey does', async () => {
      await page.goto('/checkout');
      await page.getByTestId('meals-company-option').click();
      await expect(page.getByTestId('meals-reserved')).toBeVisible();
      const quoted = await (await request.get(FIXTURE + '/__fixture/stats')).json();
      expect(quoted.reservations.length, 'a reservation was minted').toBe(1);
      expect(quoted.reservations[0].state).toBe('Reserved');
      return 'reservation ' + quoted.reservations[0].id + ' Reserved for ' + quoted.reservations[0].cap + ' minor';
    });

    await journey.step('press pay with the token removed in flight', async () => {
      await page.locator('[data-testid="checkout-submit"] button').click();
      const error = page.getByTestId('checkout-error');
      await expect(error).toBeVisible();
      // The guest stays on checkout: no confirmation, no order to look at.
      expect(page.url()).toContain('/checkout');
      await journey.shot('the untokened order is refused');
      expect(strippedFrom, 'the token was actually stripped from a completion call').toBe('/carts/complete/' + world.STORE_ID);
      const complete = calls.filter((c) => c.url.indexOf('/carts/complete/') > -1);
      expect(complete.length).toBe(1);
      return 'refused on screen with: ' + (await error.textContent()).trim();
    });

    await journey.step('nothing was funded and nothing was left half-bound', async () => {
      const after = await (await request.get(FIXTURE + '/__fixture/stats')).json();
      expect(after.reservations.length).toBe(1);
      // Still Reserved, never Bound: the refused order took no allowance with it, and the guest can
      // try again. This is the state the backend's cancel-the-order branch is there to preserve.
      expect(after.reservations[0].state, 'the reservation was NOT bound').toBe('Reserved');
      expect(after.reservations[0].order).toBeFalsy();
      return 'reservation still Reserved; allowance ' + after.remainingAllowanceMinor + ' minor';
    });

    await journey.step('the cancelled order is not attributed to the store', async () => {
      const after = await (await request.get(FIXTURE + '/__fixture/stats')).json();
      const cancelled = after.orders.filter((o) => o.status === 'Canceled');
      expect(cancelled.length, 'the order the guard had to create is cancelled').toBe(1);
      // The store never saw this order — it was refused before it had a line item — so it must not
      // count as a store cancellation. `false` here is what CartService.PromoteToOrder now writes; it
      // wrote `true` until this lane, and that fed store-cancellation statistics.
      expect(cancelled[0].canceledByStore, 'the store cancelled nothing').toBe(false);
      const refusal = after.events.filter((e) => e.eventName === 'MealsFundingRefused');
      expect(refusal.length, 'and the real cause is recorded against the order').toBe(1);
      expect(refusal[0].orderId).toBe(cancelled[0].id);
      expect(refusal[0].eventValue).toBe('MEALS_RESERVATION_NOT_FOUND');
      return 'order ' + cancelled[0].id + ' cancelled, canceledByStore=false, cause ' + refusal[0].eventValue;
    });

    journey.finding('note', 'the attribution above is the fixture answering, and the backend is proven separately',
      'This journey can only show the contract the client and the fixture agree on. The BACKEND writing ' +
      'CanceledByStore = false plus an EventLog naming the MEALS_* reason against the order id is proven ' +
      'by WebApi.Tests/Meals/CheckoutCompanyAccountGuardTests and WebApi.Tests/Wire/' +
      'MealsFundedCheckoutWireTests, both red against the previous code and green against the new. ' +
      'Nobody has driven this path against a live .NET API.');

    journey.finding('note', 'the refusal reason reaches the guest as prose, not as a code',
      'The backend answers an AppException whose message IS the MEALS_* reason code ' +
      '(CartService.PromoteToOrder throws AppException(binding.ReasonCode)). Core maps the known ' +
      'codes to translated copy in checkout.ts (mealsRefusalText) and falls back to the generic ' +
      'completion error for anything unmapped, so a code added server-side degrades to a sentence a ' +
      'guest can read rather than surfacing "MEALS_RESERVATION_NOT_FOUND" on screen.');
  }
);

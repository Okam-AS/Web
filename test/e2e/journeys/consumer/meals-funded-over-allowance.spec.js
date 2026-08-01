// The cart costs more than the company can cover.
//
// WHY THIS IS A SEPARATE JOURNEY. The lane objective is written as "the company budget pays its
// share while the guest pays the remainder". The backend does not do that and cannot be made to from
// a client: `PaymentType.CompanyAccount` is a single tender on the whole order, the bind denies with
// MEALS_OVER_RESERVED_CAP whenever the cart total exceeds the reserved cap, and no endpoint accepts
// a second tender for a remainder. v1 funds an order FULLY or not at all.
//
// So the honest thing a client can do is refuse to mint a quote it knows will be denied and say why
// BEFORE the guest commits — rather than let them press pay and meet a reason code. This journey is
// the evidence that it does, and the record of the gap for whoever rules on split tender.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();

// The allowance the company has left. Deliberately below the cart total, and not by a rounding
// error: 50,- against a 188,- lunch is the shape of the real case (a budget nearly spent for the week).
const REMAINING_ALLOWANCE_MINOR = 5000;

test(
  'a cart above the company allowance is refused before the guest commits, not after',
  journeyDetails({
    journey: 'meals-funded-over-allowance',
    capabilities: ['meals.funding.overallowance.refusal'],
    surface: 'consumer',
    underTest: underTest()
  }),
  async ({ page, request, journey }) => {
    // The shared journey fixture already reset the world; this re-stands it with a smaller budget.
    await request.post(FIXTURE + '/__fixture/reset?allowanceMinor=' + REMAINING_ALLOWANCE_MINOR);

    await cutExternalNetwork(page);
    await seedGuest(page);

    await journey.step('open the checkout with a cart the company cannot fully cover', async () => {
      await page.goto('/checkout');
      await expect(page.getByTestId('meals-company-option')).toBeVisible();
      return 'cart ' + world.CART_TOTAL_MINOR + ' minor vs ' + REMAINING_ALLOWANCE_MINOR + ' minor left';
    });

    await journey.step('the shortfall is stated before anything is chosen', async () => {
      const notice = page.getByTestId('meals-exceeds');
      await expect(notice).toBeVisible();
      await journey.shot('the company cannot cover this cart');
      return (await notice.textContent()).trim();
    });

    await journey.step('choosing the company tab mints nothing and leaves the card tender in place', async () => {
      await page.getByTestId('meals-company-option').click();
      await expect(page.getByTestId('meals-reserved')).toHaveCount(0);

      const after = await (await request.get(FIXTURE + '/__fixture/stats')).json();
      expect(after.reservations.length, 'no reservation was minted').toBe(0);
      expect(after.remainingAllowanceMinor, 'the allowance was not touched').toBe(REMAINING_ALLOWANCE_MINOR);
      // The rails are still on screen, because paying personally is still the only way through.
      await expect(page.getByTestId('checkout-submit')).toBeVisible();
      return 'no reservation; allowance still ' + after.remainingAllowanceMinor + ' minor';
    });

    journey.finding('note', 'no split tender: the guest can only reduce the order or pay all of it',
      'The company covers ' + REMAINING_ALLOWANCE_MINOR + ' minor of a ' + world.CART_TOTAL_MINOR +
      ' minor cart and there is no way to take the rest from the guest, because the backend has one ' +
      'tender per order and denies a bind over the reserved cap. Whether v1 should offer a partial ' +
      'contribution is a product decision, not a client one — the endpoint that would carry it does ' +
      'not exist (POST /v1/stores/{storeId}/meals/quotes reserves a cap; POST /carts/complete takes ' +
      'one reservationToken and the cart carries one paymentType).');
  }
);

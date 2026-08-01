// The same clicks on a budget that genuinely cannot afford the tip: the guest is refused, and no order
// is created.
//
// WHY THIS IS THE IMPORTANT HALF. What matters about a refusal is where it lands. This one used to land
// after `CartService.PromoteToOrder` had saved the order row, which was then cancelled with
// `CanceledByStore = true`: a cancellation the store never caused, in the statistics somebody reads.
// Now the client refuses before anything is sent, so there is no order to cancel and no attribution
// to get wrong.
//
// WHY THE BUDGET IS SEEDED AND NOT INHERITED. On the world's default 250,- allowance these clicks no
// longer refuse at all: L-MEALS-REQUOTE-RELEASE made the re-quote hand back the reservation the tip
// superseded, so the 206,80 cart fits and the guest gets their lunch. That is the fix, and it deleted
// this journey's old premise — the refusal it used to walk was the guest being told their company could
// not afford a lunch it could, by their own previous attempt to buy it (the defect finding below, now
// closed). 200,- is a budget the tipped cart really does not fit, so what is left is an honest refusal:
// the last-step guard still refuses BEFORE the wire, which is the behaviour this journey exists for.
//
// The window is held open at the network layer rather than raced against the 400ms debounce — see
// meals-stale-token-requote for why a timing race would not be evidence.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, holdRequests, recordApiCalls } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();
const TIP_PERCENT = 10;
const TIPPED_TOTAL_MINOR = world.CART_TOTAL_MINOR + Math.round(world.CART_TOTAL_MINOR * TIP_PERCENT / 100);

// NOK 200,- per member per period. The untipped cart (188,-) fits; the tipped one (206,80) does not,
// even once the re-quote has given the untipped reservation back — so the refusal below is about the
// company's budget rather than about the guest's own superseded hold.
const ALLOWANCE_MINOR = 20000;

const stats = async (request) => (await request.get(FIXTURE + '/__fixture/stats')).json();

test(
  'a stale reservation is never sent, and the refusal happens before an order exists to cancel',
  journeyDetails({
    journey: 'meals-stale-token-refused',
    capabilities: ['meals.funding.staletoken.refusal'],
    surface: 'consumer',
    underTest: underTest()
  }),
  async ({ page, request, journey }) => {
    // The shared journey fixture already reset the world; this re-stands it on a budget the tipped cart
    // does not fit — see the header.
    await request.post(FIXTURE + '/__fixture/reset?allowanceMinor=' + ALLOWANCE_MINOR);
    await cutExternalNetwork(page);
    const calls = recordApiCalls(page);
    const completions = () => calls.filter((c) => c.url.indexOf('/carts/complete/') > -1);
    await seedGuest(page);

    await journey.step('choose the company tab on a budget the untipped cart fits', async () => {
      await page.goto('/checkout');
      await page.getByTestId('meals-company-option').click();
      await expect(page.getByTestId('meals-reserved')).toBeVisible();

      const held = await stats(request);
      expect(held.reservations[0].cap).toBe(world.CART_TOTAL_MINOR);
      return 'reserved ' + held.reservations[0].cap + ' of ' + ALLOWANCE_MINOR +
        ' minor; ' + held.remainingAllowanceMinor + ' minor left';
    });

    const gate = await holdRequests(page, (req) => req.method() === 'POST' && req.url().indexOf('/meals/quotes') > -1);

    await journey.step('add a tip and press pay before the re-quote can come back', async () => {
      await page.getByTestId('tip-' + TIP_PERCENT).click();
      await expect(page.locator('[data-testid="checkout-submit"] button')).toContainText('206,80');
      await gate.waitUntilHeld(1);
      await page.locator('[data-testid="checkout-submit"] button').click();
      await page.waitForTimeout(1500);
      expect(completions().length, 'the stale token never reached the wire').toBe(0);
      return 'cart ' + TIPPED_TOTAL_MINOR + ' minor over a ' + world.CART_TOTAL_MINOR + ' minor cap; 0 completions';
    });

    await journey.step('the guest is told, on the checkout page, and no order was created', async () => {
      gate.release();
      const error = page.getByTestId('checkout-error');
      await expect(error).toBeVisible();
      expect(page.url()).toContain('/checkout');
      await journey.shot('refused before an order existed');

      const after = await stats(request);
      expect(completions().length, 'still nothing sent to cart completion').toBe(0);
      expect(after.orders.length, 'no order row was created at all').toBe(0);
      expect(after.events.length, 'and so no funding refusal against an order').toBe(0);
      return 'refused with: ' + (await error.textContent()).trim();
    });

    await journey.step('paying personally is still available, and takes the tip with it', async () => {
      await page.getByTestId('meals-pay-myself').click();
      await expect(page.getByTestId('meals-reserved')).toHaveCount(0);
      return 'the card rail is reachable again without leaving checkout';
    });

    // 'note', not 'defect': closed, and this journey is where it was found.
    journey.finding('note', 'the refusal used to name an allowance the guest\'s own superseded reservation was holding',
      'On the world\'s default ' + world.ALLOWANCE_MINOR + ' minor budget these clicks used to be ' +
      'denied MEALS_ALLOWANCE_EXCEEDED, because the pre-tip reservation still held ' +
      world.CART_TOTAL_MINOR + ' minor and nothing gave it back — MealsFundingController had no release ' +
      'route, so IMealsFundingAuthority.ReleaseAsync was unreachable from any client and the hold stood ' +
      'until the 15-minute expiry. A guest who added a tip was told their company could not afford the ' +
      'lunch, by their own previous attempt to buy it: honest about the server\'s answer and wrong ' +
      'about the world. L-MEALS-REQUOTE-RELEASE closed it in MealsQuoteService.CreateQuoteAsync, which ' +
      'now releases the reservation an incoming quote names as superseded before it prices the new one. ' +
      'On the default budget the same clicks now end in a confirmation; this journey seeds ' +
      ALLOWANCE_MINOR + ' minor so that what it still measures is the refusal LANDING SITE, which is ' +
      'the thing it was built for.');

    journey.finding('note', 'the attribution this refusal used to produce',
      'Before this lane the same clicks reached cart completion with the pre-tip token, and ' +
      'CartService.PromoteToOrder saved the order, got MEALS_OVER_RESERVED_CAP from the bind, and ' +
      'cancelled the order with CanceledByStore = true — the store named as canceller of an order it ' +
      'never saw, feeding store-cancellation statistics. That branch now writes CanceledByStore = ' +
      'false and an EventLog row naming the MEALS_* reason against the order id, so a refusal that ' +
      'still reaches the bind (a race this client cannot see, or another client) is distinguishable ' +
      'in the data from a store that genuinely cancelled. The BACKEND half of that is proven by ' +
      'WebApi.Tests/Meals/CheckoutCompanyAccountGuardTests, not by this journey: what this journey ' +
      'shows is that the ordinary path no longer reaches the bind at all.');
  }
);

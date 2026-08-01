// The same clicks on an ordinary company allowance: the guest is refused, and no order is created.
//
// WHY THIS IS THE IMPORTANT HALF. meals-stale-token-requote needed a 500,- budget to buy a 206,80
// lunch, because nothing releases the reservation the tip superseded. On the allowance a real member
// has, the re-quote is REFUSED — and what matters then is where the refusal lands. It used to land
// after `CartService.PromoteToOrder` had saved the order row, which was then cancelled with
// `CanceledByStore = true`: a cancellation the store never caused, in the statistics somebody reads.
// Now the client refuses before anything is sent, so there is no order to cancel and no attribution
// to get wrong.
//
// The window is held open at the network layer rather than raced against the 400ms debounce — see
// meals-stale-token-requote for why a timing race would not be evidence.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, holdRequests, recordApiCalls } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();
const TIP_PERCENT = 10;
const TIPPED_TOTAL_MINOR = world.CART_TOTAL_MINOR + Math.round(world.CART_TOTAL_MINOR * TIP_PERCENT / 100);

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
    await cutExternalNetwork(page);
    const calls = recordApiCalls(page);
    const completions = () => calls.filter((c) => c.url.indexOf('/carts/complete/') > -1);
    await seedGuest(page);

    await journey.step('choose the company tab on an ordinary allowance', async () => {
      await page.goto('/checkout');
      await page.getByTestId('meals-company-option').click();
      await expect(page.getByTestId('meals-reserved')).toBeVisible();

      const held = await stats(request);
      expect(held.reservations[0].cap).toBe(world.CART_TOTAL_MINOR);
      return 'reserved ' + held.reservations[0].cap + ' of ' + world.ALLOWANCE_MINOR +
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

    journey.finding('defect', 'the refusal names the allowance, but the allowance is held by the guest\'s own superseded reservation',
      'The re-quote is denied MEALS_ALLOWANCE_EXCEEDED because the pre-tip reservation still holds ' +
      world.CART_TOTAL_MINOR + ' minor of the ' + world.ALLOWANCE_MINOR + ' minor budget and nothing ' +
      'gives it back: MealsFundingController has no release route, so IMealsFundingAuthority.ReleaseAsync ' +
      'is unreachable from any client and the hold stands until the 15-minute expiry. So a guest who ' +
      'adds a tip is told their company cannot afford the lunch, by their own previous attempt to buy ' +
      'it. The refusal is honest about the server\'s answer and wrong about the world. This is backend ' +
      'work (a release route, called when the client supersedes a reservation) and is NOT in this lane.');

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

// A guest adds a tip and presses pay before the re-quote has come back.
//
// THE DEFECT THIS EXISTS FOR. `core/pinia/checkout.ts` re-quotes when the cart changes under a held
// funding reservation, but that watcher is debounced by 400ms and its re-quote is a round trip. A
// guest who taps a tip and presses pay inside that window used to send the PREVIOUS cart's token —
// the exact last-step refusal the watcher exists to prevent — and the backend can only answer it
// AFTER `CartService.PromoteToOrder` has saved the order row, which it then cancelled with the store
// named as the canceller. Nothing server-side can catch it either: `ValidateAndBindAsync` compares
// `cartTotalMinor <= reservedCapMinor` and never looks at the quote hash, so the client is the only
// place this exists to be caught.
//
// HOW THE WINDOW IS MADE A FACT. The re-quote is held open at the network layer for the whole time
// the guest is pressing pay (`holdRequests`), rather than racing the same 400ms timer the code uses.
// A journey that raced it would pass whenever the assertion happened to run after the timer, which is
// how this estate has previously shipped a green debounce test over a live defect. With the gate shut
// the client provably has no fresh reservation, whatever its timers did.
//
// WHAT IT IS NOT EVIDENCE FOR. The app is pointed at test/e2e/fixture/consumer-api-server.js, not at
// the .NET API — `backend: "fixture"` in the artifact is the honest reading, exactly as in
// meals-funded-checkout.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, holdRequests, recordApiCalls } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();

// Two reservations have to fit side by side for this journey to reach a confirmation at all, because
// nothing releases the superseded one — see the defect finding at the end, and the sibling journey
// meals-stale-token-refused, which walks the same clicks against an ordinary allowance.
const ALLOWANCE_MINOR = 50000;
const TIP_PERCENT = 10;
const TIPPED_TOTAL_MINOR = world.CART_TOTAL_MINOR + Math.round(world.CART_TOTAL_MINOR * TIP_PERCENT / 100);

const stats = async (request) => (await request.get(FIXTURE + '/__fixture/stats')).json();

test(
  'a tip added a moment before pay is funded by a reservation minted for the tipped cart',
  journeyDetails({
    journey: 'meals-stale-token-requote',
    capabilities: ['meals.funding.requote.beforecomplete', 'meals.tender.companyaccount'],
    surface: 'consumer',
    underTest: underTest()
  }),
  async ({ page, request, journey }) => {
    await request.post(FIXTURE + '/__fixture/reset?allowanceMinor=' + ALLOWANCE_MINOR);
    await cutExternalNetwork(page);
    const calls = recordApiCalls(page);
    const quotes = () => calls.filter((c) => c.url.indexOf('/meals/quotes') > -1);
    const completions = () => calls.filter((c) => c.url.indexOf('/carts/complete/') > -1);
    await seedGuest(page);

    await journey.step('choose the company tab, and a reservation is minted for the untipped cart', async () => {
      await page.goto('/checkout');
      await page.getByTestId('meals-company-option').click();
      await expect(page.getByTestId('meals-reserved')).toBeVisible();

      const held = await stats(request);
      expect(held.reservations.length).toBe(1);
      expect(held.reservations[0].cap, 'the cap is the cart as it stands').toBe(world.CART_TOTAL_MINOR);
      return 'reserved ' + held.reservations[0].cap + ' minor of ' + ALLOWANCE_MINOR;
    });

    // From here the re-quote cannot come back until this journey says so.
    const gate = await holdRequests(page, (req) => req.method() === 'POST' && req.url().indexOf('/meals/quotes') > -1);

    await journey.step('add a tip: the cart is now worth more than the reservation covers', async () => {
      await page.getByTestId('tip-' + TIP_PERCENT).click();
      // The button carries the total, so this waits for the cart the guest is actually looking at
      // rather than for a timer. It is safe to wait here: the gate, not the clock, defines the window.
      await expect(page.locator('[data-testid="checkout-submit"] button')).toContainText('206,80');

      const during = await stats(request);
      expect(during.reservations.length, 'still exactly one reservation — the re-quote is held').toBe(1);
      expect(during.reservations[0].cap).toBe(world.CART_TOTAL_MINOR);
      await journey.shot('tipped cart over a reservation minted before the tip');
      return 'cart ' + world.CART_TOTAL_MINOR + ' -> ' + TIPPED_TOTAL_MINOR + ' minor, cap still ' + during.reservations[0].cap;
    });

    await journey.step('press pay while the re-quote is still in flight', async () => {
      await gate.waitUntilHeld(1);
      await page.locator('[data-testid="checkout-submit"] button').click();

      // THE ASSERTION THE OLD CLIENT FAILED. With no reservation that can fund this cart, nothing may
      // go to cart completion — the previous token would be refused over cap, after the order row was
      // already saved and cancelled. Long enough that a client which was going to send it, has.
      await page.waitForTimeout(1500);
      expect(completions().length, 'no completion left the client while it held only a stale reservation').toBe(0);
      expect(page.url()).toContain('/checkout');
      return 'held ' + gate.held + ' quote request(s); 0 completions in 1500ms';
    });

    const funded = await journey.step('let the re-quote through and the order goes out on the new one', async () => {
      gate.release();
      await page.waitForURL(/\/confirmation/, { timeout: 30000 });
      await expect(page.getByTestId('confirmation-heading')).toBeVisible();
      // A total with øre, printed as one. This line used to read '206,80,–' — the øre followed by the
      // notation that means there are none — and was asserted verbatim, malformation included, until
      // L-CORE-ORE-LABEL fixed it in Core. The whole-krone line items on this same page still read
      // '149,–' and '39,–', which is the other half of the fix and is asserted below.
      await expect(page.getByTestId('order-total')).toHaveText('206,80');
      await expect(page.getByText('149,–')).toBeVisible();
      await expect(page.getByText('39,–')).toBeVisible();
      await expect(page.getByTestId('checkout-error')).toHaveCount(0);
      await journey.shot('order confirmed at the tipped total');

      expect(quotes().length, 'exactly one re-quote, not one per caller').toBe(2);
      const requoted = JSON.parse(quotes()[1].postData || '{}');
      expect(requoted.cartTotalMinor, 'the re-quote priced the TIPPED cart').toBe(TIPPED_TOTAL_MINOR);
      expect(quotes()[1].headers['idempotency-key']).not.toBe(quotes()[0].headers['idempotency-key']);
      expect(completions().length).toBe(1);
      return 'completed after ' + quotes().length + ' quotes; the second priced ' + requoted.cartTotalMinor + ' minor';
    });

    await journey.step('the bound reservation is the one minted for the cart that was paid', async () => {
      const after = await stats(request);
      const bound = after.reservations.filter((r) => r.state === 'Bound');
      expect(bound.length).toBe(1);
      expect(bound[0].cap, 'bound against the tipped cart, not the pre-tip one').toBe(TIPPED_TOTAL_MINOR);
      expect(bound[0].boundTotal).toBe(TIPPED_TOTAL_MINOR);
      // And no order was created only to be cancelled: the refusal that used to happen at the bind
      // never got as far as an order row.
      expect(after.orders.filter((o) => o.status === 'Canceled').length, 'no cancelled order').toBe(0);
      expect(after.events.length, 'no funding refusal was recorded').toBe(0);
      return 'bound ' + bound[0].cap + ' minor to ' + bound[0].order + '; ' + funded;
    });

    await journey.step('the superseded reservation is still holding the allowance', async () => {
      const after = await stats(request);
      const stranded = after.reservations.filter((r) => r.state === 'Reserved');
      expect(stranded.length, 'the pre-tip reservation was never given back').toBe(1);
      expect(after.remainingAllowanceMinor)
        .toBe(ALLOWANCE_MINOR - world.CART_TOTAL_MINOR - TIPPED_TOTAL_MINOR);
      return 'one ' + stranded[0].cap + ' minor reservation stranded; allowance ' +
        ALLOWANCE_MINOR + ' -> ' + after.remainingAllowanceMinor + ' minor for a ' + TIPPED_TOTAL_MINOR + ' minor lunch';
    });

    journey.finding('defect', 'a superseded reservation is never released, and no endpoint can release it',
      'Every quote adds its cap to the member\'s MealsBudgetGuards.ReservedMinor (MealsQuoteService ' +
      'CreateQuoteAsync: "SET ReservedMinor = ReservedMinor + cap ... AND ReservedMinor + cap <= ' +
      'AllowanceMinor"), and the reservation only leaves that total by being bound and captured, by ' +
      'expiring after 15 minutes, or through IMealsFundingAuthority.ReleaseAsync — which no controller ' +
      'action reaches. MealsFundingController exposes companies, context, quotes and orders, and ' +
      'nothing else. So re-quoting costs the guest their allowance twice for one lunch: this journey ' +
      'needed ' + ALLOWANCE_MINOR + ' minor of budget to buy a ' + TIPPED_TOTAL_MINOR + ' minor meal. ' +
      'With an ordinary allowance the re-quote is refused outright — meals-stale-token-refused walks ' +
      'that. The fix is a release route the client calls when it supersedes a reservation; it is ' +
      'backend work and is NOT in this lane.');

    // 'note', not 'defect': the artifact's documented severities are defect|note, and this one is
    // closed. Left in the journey because this is where it was found and where it is now proven.
    journey.finding('note', 'a total with øre no longer prints as "206,80,–"',
      'core/helpers/tools.ts priceLabelTool appended the currency suffix unconditionally, and for NOK ' +
      'that suffix is ",–" — the notation that MEANS "and no øre" — so the moment a tip, a percentage ' +
      'discount or a Swiss price produced a fraction the total read "206,80,–". L-CORE-ORE-LABEL made ' +
      'the suffix and the fraction mutually exclusive in Core, and padded single-digit øre (4 øre used ' +
      'to print "0,–": the amount erased AND the claim wrong). This journey is the browser evidence: ' +
      'the run before the fix resolved <p data-testid="order-total">206,80,–</p>, and the total now ' +
      'reads "206,80" while the whole-krone lines on the same confirmation still read "149,–" and ' +
      '"39,–" — both halves of the rule in one screenshot. Landed in ConsumerWeb\'s Core pin and in ' +
      'Web-modules\' Core pin; ConsumerApp and AdminApp pin different Core commits and still carry it.');

    journey.finding('note', 'what the price helper still gets wrong, and why it was left alone',
      'Two malformations survive the øre fix and are pinned rather than changed in test/core-price-' +
      'label.test.js. A negative amount under one krone renders "-,50", because wholeAmountTool slices ' +
      'the string and "-50" has no whole part left — and OrderSummary.vue reaches that path directly ' +
      '(`priceLabel(item.amount * item.quantity * (item.negativeAmount ? -1 : 1), true)`), so a ' +
      'sub-krone discount line would show it. And a non-integer minor amount renders its float ' +
      'expansion grouped as digits ("6.,98"). Rounding or sign handling in the shared helper changes ' +
      'what every caller renders, which is a money change and needs its own lane.');

    journey.finding('note', 'the client only re-quotes when the held cap can no longer fund the cart',
      'A reservation is a cap, not a price, and the bind never compares the quote hash, so a cart ' +
      'that changed but still fits under the cap is funded by the reservation already held. Re-quoting ' +
      'it anyway would mint a second reservation against the same allowance for no gain — and, on an ' +
      'ordinary budget, would refuse a checkout that works today. So the pay-time gate asks whether ' +
      'the cart FITS, and only re-quotes when it does not.');
  }
);

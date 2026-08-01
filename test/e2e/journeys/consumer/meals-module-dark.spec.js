// JOURNEY — the deployment has Company Meals switched off, and the guest gets an ordinary checkout.
//
// ---- WHY THIS JOURNEY EXISTS ------------------------------------------------------------------
//
// Its five siblings all walk the funded checkout, and every route they touch is deny-closed:
// `GET /v1/meals/me/companies` and `GET /v1/meals/me/context` behind `Features:Meals:Module`,
// `POST /v1/stores/{id}/meals/quotes` and the funding bind inside `POST /carts/complete/{id}` behind
// `Features:Meals:Ordering` (which is `Module && Ordering`, so the money flag needs the module flag
// too). Until this landed, the consumer fixture modelled none of that — so all five were green
// against a world that could not produce the refusal, which is the same defect the workforce schedule
// journey had and the reason for the sweep this journey belongs to.
//
// ---- WHY IT IS A JOURNEY AND NOT A ONE-OFF MUTATION -------------------------------------------
//
// The siblings now DECLARE the gate as on, and a declaration nothing checks is worth nothing: delete
// the gate from the fixture tomorrow and all five stay green, exactly as they were. This journey is
// what makes that impossible. It stands the same world up with the switch DOWN and asserts the guest
// gets a different checkout — so the gate is falsifiable from inside the suite rather than by an
// experiment somebody ran once and wrote down.
//
// It cannot flip the switch through the product, and that is a property of the product rather than a
// gap here. `meals.ordering` is WITHHELD from the operator catalog on purpose — `MealsFeatureFlags.Withheld`
// records why: the §7 precondition that a company may fund a checkout only once its billing terms are
// signed is not something a per-store toggle can enforce. And `meals.module`, the module's one catalog
// entry, is read per-store at three ADMIN routes, none of them on this path. So `/admin/feature-flags`
// moves neither switch, no guest surface moves either, and the only honest way to reach a dark
// deployment is to stand the fixture up as one.
//
// ---- THE CONTROL THAT MAKES THE ABSENCE MEAN SOMETHING ----------------------------------------
//
// "No company tab" is trivially true of a checkout that failed to load, of a signed-out guest and of
// an empty cart. So the ordinary tender is asserted PRESENT in the same breath: the cart is priced,
// the pay control is on screen, and the guest can still buy their lunch. What is missing is the
// company, and only the company.
//
// The silence is the product's own decision, not an oversight: `loadMealsCompanies` swallows the 404
// deliberately, because the API answers "the module is dark" and "you belong to no company" with the
// same opaque code, and a guest who has never heard of Company Meals must not be shown an error about
// it. This journey is the only thing that has ever walked that branch.

const { test, expect, journeyDetails } = require('../../support/journey');
const { world, fixtureOrigin, underTest, seedGuest, cutExternalNetwork, recordApiCalls } = require('../../support/consumer-guest');

const FIXTURE = fixtureOrigin();

// The payer strip's own heading (`checkoutPage_mealsHeading`), in the locale the seeded guest runs in
// (`cultureCode: 'no'`). Named as the words a guest reads rather than as the key, so this reds when
// the strip appears on a dark deployment and not when somebody renames a translation.
const MEALS_HEADING = 'Bedriftskonto';

test(
  'a deployment with Company Meals switched off gives the guest an ordinary checkout, not an error',
  journeyDetails({
    journey: 'meals-module-dark',
    capabilities: [
      'meals.module.gate.dark-deployment',
      'meals.funding.absent-when-dark'
    ],
    surface: 'consumer',
    underTest: underTest()
  }),
  async ({ page, request, journey }) => {
    // The shared journey fixture reset the world with the gate UP; this re-stands it with the whole
    // `Features:Meals` section off — module and ordering together, which is how an unconfigured
    // deployment actually reads (both keys default false and the gate fails dark).
    const reset = await request.post(FIXTURE + '/__fixture/reset?mealsModule=0&mealsOrdering=0');
    const world0 = await reset.json();
    expect(world0.meals, 'the fixture stood up with the Meals gate down').toEqual({ module: false, ordering: false });

    await cutExternalNetwork(page);
    await seedGuest(page);
    const calls = recordApiCalls(page);

    await journey.step('open the checkout as the same signed-in guest with the same cart', async () => {
      await page.goto('/checkout');
      // THE CONTROL. The page is really there and really priced — so everything asserted absent below
      // is absent from a working checkout rather than from a page that did not load.
      await expect(page.getByTestId('checkout-submit')).toBeVisible({ timeout: 60000 });
      return 'checkout rendered with the ordinary tender offered';
    });

    await journey.step('the company payer strip is not offered at all', async () => {
      // Not "disabled", not "shown with a reason" — absent. `CheckoutMeals` renders nothing when the
      // company list is empty, and the list is empty because the entry read was refused.
      await expect(page.getByTestId('meals-company-option')).toHaveCount(0);
      await expect(page.getByTestId('meals-reserved')).toHaveCount(0);
      await expect(page.getByTestId('meals-exceeds')).toHaveCount(0);
      return 'no company option, no reservation strip, no shortfall notice';
    });

    await journey.step('and the guest is told nothing about a feature they do not have', async () => {
      // The deliberate silence. A visible error here would be the product telling a guest at an
      // unrelated venue that some Company Meals thing has failed — which is what the swallow in
      // `loadMealsCompanies` exists to prevent, and what nothing had ever checked in a browser.
      //
      // Asserted on the strip's own error slot AND on the heading a guest would read. The heading is
      // the discriminating one: `data-testid="meals-error"` sits INSIDE `v-if="companies.length"`, so
      // it is absent whenever the strip is, and on its own it would be satisfied by a strip that
      // rendered its heading and a spinner forever.
      await expect(page.getByTestId('meals-error')).toHaveCount(0);
      await expect(page.getByTestId('meals-ineligible')).toHaveCount(0);
      await expect(page.getByText(MEALS_HEADING, { exact: false })).toHaveCount(0);
      return 'no "' + MEALS_HEADING + '" heading, no error slot, no ineligibility notice';
    });

    await journey.shot('the ordinary checkout on a dark deployment');

    await journey.step('the app did ask, and was refused', async () => {
      // The other half of the claim. Absence on screen could also mean the client never called at
      // all — a page that had quietly dropped the entry read would look identical. This is the
      // difference: the read WAS made, and the fixture refused it.
      const asked = calls.filter(c => c.url.includes('/v1/meals/me/companies'));
      expect(asked.length, 'the entry read was attempted').toBeGreaterThan(0);

      // And nothing further was: a client that went on to quote against a refused module would be
      // minting money-path calls into a dark deployment.
      const quoted = calls.filter(c => c.url.includes('/meals/quotes'));
      expect(quoted.length, 'no quote was attempted').toBe(0);

      const stats = await (await request.get(FIXTURE + '/__fixture/stats')).json();
      expect(stats.reservations.length, 'no reservation was minted').toBe(0);
      expect(stats.remainingAllowanceMinor, 'the allowance was never touched').toBe(world.ALLOWANCE_MINOR);
      return asked.length + ' entry read(s) refused; 0 quotes; 0 reservations; allowance untouched';
    });

    journey.finding(
      'note',
      'the Meals gate is host configuration, so no operator surface can turn this venue on',
      'A venue in this state cannot be fixed from `/admin/feature-flags`. `Features:Meals:Module` and ' +
      '`Features:Meals:Ordering` are bound from host config through `IOptionsMonitor`, and only ' +
      '`meals.module` is in the per-store catalog at all — read at three store-addressable admin ' +
      'routes, none of which is on the consumer funded-checkout path. So flipping `meals.module` on ' +
      'for a store does NOT enable that store\'s quotes or funded checkouts, and flipping it off does ' +
      'not stop them. Whoever pilots Company Meals at a venue needs a deployment change, and the ' +
      'switchboard will show them a lever that does not reach this surface.'
    );
  }
);

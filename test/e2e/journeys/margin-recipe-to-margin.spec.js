// JOURNEY — a chef turns Margin on, enters a recipe, and finds out what the dish it becomes earns.
//
// Margin's whole chain in one sitting, and every step is a precondition of the next: the module's own
// switch, an ingredient master, a recipe, a costed version, a product link, an ACTIVE version, and
// only then a margin. Every one of those was `built-unverified` because the only evidence was
// component tests, and a component test mounts one branch at a time — it cannot observe that the
// states hand off to each other in a real page.
//
// ---- WHY IT STARTS AT A REFUSAL ---------------------------------------------------------------
//
// `Margin.Module` is deny-closed, so a chef opening `/admin/margin-recipes` at a store nobody has
// switched on is stopped BEFORE the first screen: `GET /margin/status` answers `flags.module: false`
// and the page draws its blocker. That is where this walk begins, and it begins there because an
// earlier draft of this journey did not: it ran against a fixture that answered `module: true`
// unconditionally, which is a store no venue is in. A sweep found six journeys green for exactly
// that reason — the fixture modelled no feature flags, so on a real store every step would have been
// refused and no journey could have noticed. The fixture now resolves both Margin flags out of the
// same per-store override store the operator switchboard writes, and this journey turns its own
// switch on through `/admin/feature-flags` rather than being handed a world with it already on.
//
// The mutation that proves it: with the flip step removed, the walk reds at the very next assertion,
// because the blocker is still on screen and there is no starter chip to click.
//
// ---- WHAT IT PROVES THAT A SUITE CANNOT -------------------------------------------------------
//
//   • THE MONEY IS THE SERVER'S, AND IT IS ASSERTED AS TEXT. 500 g of flour at kr 24,00/kg plus a
//     litre of milk at kr 18,00/l is kr 30,00 for the batch and kr 3,00 for one of ten portions, and
//     the journey asserts those strings — not "a number appeared". The page performs no arithmetic
//     at all (every figure is one field off the wire), so asserting the rendered string is asserting
//     that the right field reached the right cell through a real formatter.
//   • THE ORDER OF THE HONEST STATES. A recipe nobody sells reads "unsold". Linked but not yet
//     activated, the plate cost is a DASH and the page says why — the menu margin costs only the
//     version active at the read instant. Activated, the same row fills in. Those three renderings
//     are three different claims and the journey walks all three in sequence, which is the one thing
//     a mounted component cannot do.
//   • TWO REFUSALS, ONE LOCAL AND ONE FROM THE SERVER. A link row with no product is refused before
//     anything is sent; a link naming a product another recipe already claims is refused by the
//     single-active-link rule and rendered from the CODE, not the server's Guid-bearing prose.
//   • AND A THIRD GATE, ONE STAGE DOWN. `Margin.Statements` is a separate switch under the master, so
//     a venue costing plates has not thereby opened the weekly settlement. The walk goes to that page
//     and stops there, on a sentence that says which of the two switches is down — then turns it on
//     and watches the same page open.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip, flagRow } = require('../support/flags');

const MODULE_FLAG = 'Margin.Module';
const STATEMENTS_FLAG = 'Margin.Statements';

test(
  'A chef switches Margin on, costs a recipe, sells it as a dish, and meets the statements gate',
  journeyDetails({
    journey: 'margin-recipe-to-margin',
    surface: 'admin',
    capabilities: [
      'platform.feature-flags.write',
      'margin.module.gate',
      'margin.ingredients.author',
      'margin.recipe.author',
      'margin.recipe.cost-preview',
      'margin.recipe.version.activate',
      'margin.product-links.replace-set',
      'margin.menu-margin.read',
      'margin.statements.gate'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in, and be stopped before the first screen', async () => {
      await page.goto('/admin/margin-recipes');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/margin-recipes' });
      await expect(page.locator('.mrg-page__title')).toHaveText('Oppskrifter og kostpris');

      // THE FIRST STOP. `Margin.Module` is deny-closed and this store has never had it flipped, so
      // the module's self-report says so and the page refuses to draw a surface every other route
      // would 404. The sentence is asserted whole rather than by keyword: it is the one that
      // distinguishes "off for this store" from `mrg_status_unknown`, which is what the SAME element
      // would say if the status read had merely failed — so a blocker matched on "Margin" would pass
      // on the wrong one of the two.
      const blocker = page.locator('[data-test="blocker"]');
      await expect(blocker).toHaveText('Margin-modulen er ikke slått på for denne butikken.');
      // …and the surface behind it really is absent, not merely unstyled: the toolbar that carries
      // every write on this page is `v-if="!blocker"`. Asserting the refusal without this would pass
      // on a page that showed the sentence AND the forms.
      await expect(page.locator('.mrg-page__toolbar')).toHaveCount(0);
      return 'stopped by ' + MODULE_FLAG + ': "' + (await blocker.textContent()).trim() + '"';
    });

    await journey.shot('the chef is stopped by the module switch');

    await journey.step('turn Margin on from the operator switchboard', async () => {
      // THROUGH THE PRODUCT, not through the fixture. `PUT /stores/{id}/feature-flags` could be poked
      // with a `fetch` from this file and the walk would proceed — and it would prove the fixture can
      // hold a row, not that anybody at the venue can open the module. `/admin/feature-flags` is the
      // only caller of that route in the whole frontend, so pressing its button is what makes this a
      // capability rather than a curl.
      await turnOn(page, MODULE_FLAG);
      // The stage flag beside it is untouched and still reads off — which is the state the walk needs
      // to reach the second gate later, and a page that turned a whole module family on from one
      // press would have failed here.
      await expect(flagRow(page, STATEMENTS_FLAG).locator('.ff-row__badge')).toHaveText('Av');
      return MODULE_FLAG + ' on, ' + STATEMENTS_FLAG + ' still off';
    });

    await journey.step('the same page now opens', async () => {
      await page.goto('/admin/margin-recipes');
      await expect(page.locator('.mrg-page__title')).toHaveText('Oppskrifter og kostpris');
      // The blocker is GONE — the same element, the same page, the switch the only difference.
      await expect(page.locator('[data-test="blocker"]')).toHaveCount(0);
      await expect(page.locator('.mrg-page__toolbar')).toBeVisible();
      return 'gate open, on /admin/margin-recipes';
    });

    await journey.step('copy two ingredients out of the starter library', async () => {
      // An empty store cannot author anything, because a component can only reference an ingredient
      // that exists. The starter chips are the backend's own bootstrap for exactly that.
      const flour = page.getByRole('button', { name: '+ Hvetemel' });
      await expect(flour).toBeVisible();
      await flour.click();
      await page.getByRole('button', { name: '+ Melk' }).click();
      const note = page.locator('.mrg-card__note').filter({ hasText: 'råvarer i butikken' });
      await expect(note).toHaveText('2 råvarer i butikken.');
      return (await note.textContent()).trim();
    });

    await journey.shot('the ingredient master');

    await journey.step('author a recipe with two component lines', async () => {
      const field = label => page.locator('label.mrg-field').filter({ hasText: label });
      await field('Navn').locator('input').fill('Vaffelrøre');
      await field('Utbytte').locator('input').fill('4');
      await field('Enhet').locator('select').selectOption({ label: 'liter' });
      await field('Porsjoner').locator('input').fill('10');

      await page.getByRole('button', { name: '+ Legg til linje' }).click();
      await page.getByRole('button', { name: '+ Legg til linje' }).click();
      const rows = page.locator('.mrg-component');
      await expect(rows).toHaveCount(2);

      // Line one is flour by grams. The unit picker offers only the codes the backend converts
      // WITHOUT a venue-authored conversion — a code outside the ingredient's own family would
      // produce a line that silently does not price, so the list is narrow on purpose.
      await rows.nth(0).locator('select').first().selectOption({ label: 'Hvetemel' });
      await rows.nth(0).locator('.mrg-component__qty').fill('500');
      await rows.nth(0).locator('.mrg-component__unit').selectOption('g');

      await rows.nth(1).locator('select').first().selectOption({ label: 'Melk' });
      await rows.nth(1).locator('.mrg-component__qty').fill('1');
      await rows.nth(1).locator('.mrg-component__unit').selectOption('l');

      await page.getByRole('button', { name: 'Lagre og regn ut' }).click();
      await expect(page.locator('[data-test="batch-cost"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-test="failure"]')).toHaveCount(0);
      return '500 g Hvetemel + 1 l Melk, 4 liter / 10 porsjoner';
    });

    await journey.step('the plate cost is the backend\'s, to the øre', async () => {
      // ASSERTED AS THE READER SEES IT. `kr 30,00`, not 3000 — the whole chain from integer minor
      // units through the market's currency formatter is what is under test here, and a DOM check on
      // the raw number would pass on a page that had lost the formatter.
      await expect(page.locator('[data-test="batch-cost"]')).toHaveText('kr 30,00');
      await expect(page.locator('[data-test="portion-cost"]')).toHaveText('kr 3,00');

      // WHICH version was priced. The wire does not say directly — the backend previews the Active
      // version when there is one and falls back to the latest Draft — so a screen that did not say
      // this would show a draft's cost as if it were the menu's.
      await expect(page.locator('.mrg-cost__version')).toHaveText('Utkast v1');

      // The two lines, each rounded on its own. The column is deliberately NOT the total: the
      // backend rounds each line and the batch separately, and the page says so rather than letting
      // a reader infer it from a table that happens not to add up.
      const lines = await page.locator('[data-test="line-cost"]').allTextContents();
      expect(lines.map(t => t.trim())).toEqual(['kr 12,00', 'kr 18,00']);
      return 'batch kr 30,00 · per porsjon kr 3,00 · lines ' + lines.join(' + ');
    });

    await journey.step('nobody sells it yet, and the page says exactly that', async () => {
      // Named by the READ, not inferred from an empty table: a sellable recipe with no active
      // product link has a cost and no price, which is a fact about the venue's setup rather than an
      // unknown. `mm-absent` — "the read answered and yet no dish carries it" — would be a different
      // and much weaker claim.
      await expect(page.locator('[data-test="mm-unsold"]')).toBeVisible();
      await expect(page.locator('[data-test="mm-dish"]')).toHaveCount(0);
      return (await page.locator('[data-test="mm-unsold"]').textContent()).trim().slice(0, 60) + '…';
    });

    await journey.shot('costed, unsold');

    await journey.step('a link row with no product is refused before anything is sent', async () => {
      const before = journey.failedRequests.length;
      await page.locator('[data-test="link-add"]').click();
      await page.locator('[data-test="link-save"]').click();
      await expect(page.locator('[data-test="link-error"]')).toHaveText('En rad mangler produkt.');
      // Local refusal: nothing left the browser, so nothing could have been refused by the server.
      expect(journey.failedRequests.length).toBe(before);
      return 'refused locally: "En rad mangler produkt."';
    });

    await journey.step('a product another recipe already claims is refused by the server', async () => {
      // THE SINGLE-ACTIVE-LINK RULE. `Kaffe` is claimed by the seeded `Kaffebrygg`, the backend keeps
      // one active link per product with a filtered unique index, and its `detail` names the product
      // by raw Guid — which is why the page renders from the CODE and not from that prose.
      const picker = page.locator('[data-test="link-product"]').first();
      await picker.selectOption({ label: 'Kaffe (allerede koblet til Kaffebrygg)' });
      await page.locator('[data-test="link-quantity"]').first().fill('1');
      await page.locator('[data-test="link-save"]').click();

      const failure = page.locator('[data-test="failure"]');
      await expect(failure).toBeVisible();
      await expect(failure).toContainText('bare være aktivt koblet til én oppskrift');
      return (await failure.textContent()).trim();
    });

    await journey.step('link it to the dish it is actually sold as', async () => {
      await page.locator('[data-test="link-product"]').first().selectOption({ label: 'Vaffel med rømme' });
      await page.locator('[data-test="link-quantity"]').first().fill('1');
      await page.locator('[data-test="link-save"]').click();
      await expect(page.locator('[data-test="failure"]')).toHaveCount(0, { timeout: 15000 });
      await expect(page.locator('[data-test="mm-dish"]')).toHaveCount(1);
      return 'linked to Vaffel med rømme, 1 per solgt enhet';
    });

    await journey.step('linked but not activated: the margin is WITHHELD, and it says why', async () => {
      // The distinction this whole module exists for. The menu margin costs only the version ACTIVE
      // at the read instant, so a linked recipe whose only version is a draft has a price and no cost
      // side — and a dash is the correct answer, not a zero. A page that filled this in from the
      // draft's cost preview would be quoting a margin the till does not agree with.
      const rows = page.locator('[data-test="mm-row"]');
      await expect(rows).toHaveCount(2);
      const plates = (await page.locator('[data-test="mm-plate"]').allTextContents()).map(t => t.trim());
      const contributions = (await page.locator('[data-test="mm-contribution"]').allTextContents()).map(t => t.trim());
      expect(plates).toEqual(['—', '—']);
      expect(contributions).toEqual(['—', '—']);

      // …and every withheld row names its reason rather than leaving a reader to guess.
      const why = page.locator('[data-test="mm-withheld"]');
      await expect(why.first()).toContainText('ingen aktiv versjon');
      return (await why.first().textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.shot('linked, margin withheld');

    await journey.step('activate the draft', async () => {
      const activate = page.getByRole('button', { name: 'Aktiver utkastet' });
      await expect(activate).toBeVisible();
      await activate.click();
      // The badge flips because the detail was RE-READ: the cost preview switches from previewing a
      // draft to costing the Active version, which is a different document.
      await expect(page.locator('.mrg-cost__version')).toHaveText('Aktiv v1', { timeout: 15000 });
      await expect(page.locator('[data-test="failure"]')).toHaveCount(0);
      return 'version 1 is now Active';
    });

    await journey.step('the margin table fills in, per price basis', async () => {
      // ONE ROW PER BASIS, because servering and take-away carry different VAT and a food-cost
      // percentage without its basis is not a number. Every figure below is read from the wire; in
      // particular the contribution is NOT `net − plate` computed in the browser.
      const rows = page.locator('[data-test="mm-row"]');
      await expect(rows).toHaveCount(2);

      // The basis travels ON the row, so each is addressed by the fact it carries rather than by an
      // index — a reordered table would then fail loudly instead of comparing the wrong two figures.
      const takeaway = page.locator('[data-test="mm-row"][data-basis="Base"]');
      const table = page.locator('[data-test="mm-row"][data-basis="Table"]');

      await expect(takeaway.locator('[data-test="mm-net"]')).toContainText('kr 30,00');
      await expect(takeaway.locator('[data-test="mm-plate"]')).toHaveText('kr 3,00');
      await expect(takeaway.locator('[data-test="mm-contribution"]')).toHaveText('kr 27,00');
      await expect(takeaway.locator('[data-test="mm-food-cost"]')).toHaveText('10,00 %');

      await expect(table.locator('[data-test="mm-net"]')).toContainText('kr 40,00');
      await expect(table.locator('[data-test="mm-plate"]')).toHaveText('kr 3,00');
      await expect(table.locator('[data-test="mm-contribution"]')).toHaveText('kr 37,00');
      await expect(table.locator('[data-test="mm-food-cost"]')).toHaveText('7,50 %');

      // Nothing is withheld any more: the row that explained the absence is gone because the absence
      // is gone.
      await expect(page.locator('[data-test="mm-withheld"]')).toHaveCount(0);
      return 'Take-away kr 27,00 (10,00 %) · Servering kr 37,00 (7,50 %)';
    });

    await journey.shot('the margin table');

    await journey.step('a second recipe with the same name is refused', async () => {
      // The store's own uniqueness rule, rendered from `margin.recipe-name-conflict` rather than from
      // the server's English prose. A venue meets this by re-typing a name they already used, which
      // is exactly what happens here.
      const field = label => page.locator('label.mrg-field').filter({ hasText: label });
      await field('Navn').locator('input').fill('Vaffelrøre');
      await page.getByRole('button', { name: 'Lagre og regn ut' }).click();
      const failure = page.locator('[data-test="failure"]');
      await expect(failure).toHaveText('Butikken har allerede en oppskrift med dette navnet.');
      // The recipe on screen is untouched: a refused create must not disturb what was already read.
      await expect(page.locator('.mrg-cost__version')).toHaveText('Aktiv v1');
      return 'refused: recipe-name-conflict, screen unchanged';
    });

    // ---- THE SECOND GATE -------------------------------------------------------------------------
    await journey.step('the weekly settlement is behind its OWN switch, and stops the walk', async () => {
      await page.goto('/admin/margin-statements');
      await expect(page.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør');

      // THE SENTENCE IS THE POINT, and it is a different sentence from the one that stopped the walk
      // at the start. This page has three blockers on one element — module off, stage off, status
      // unknown — and only this one is true here. Written out rather than matched on "Margin",
      // because all three contain that word and any of them would satisfy a keyword match while
      // meaning something else entirely about the venue.
      const blocker = page.locator('[data-test="blocker"]');
      await expect(blocker).toHaveText(
        'Margin-modulen er på for denne butikken, men ukesoppgjør er ikke slått på ennå. ' +
        'Oppskrifter og tallerkenkost virker fortsatt.');
      // …and it says the true thing about the module master, which the previous steps just proved:
      // the recipe surface really does still work. A stage refusal that read like a module refusal
      // would send a chef to look for a switch that is already up.
      return 'stopped by ' + STATEMENTS_FLAG + ', with the master still on';
    });

    await journey.shot('the statements gate');

    await journey.step('turn the statements stage on, and the same page opens', async () => {
      await turnOn(page, STATEMENTS_FLAG);
      await page.goto('/admin/margin-statements');
      await expect(page.locator('.mrgs-page__title')).toHaveText('Ukentlig marginoppgjør');
      await expect(page.locator('[data-test="blocker"]')).toHaveCount(0);
      // The surface behind the blocker: a week can be opened, and the list says there is nothing yet
      // rather than failing to say anything. Both are `v-if`s the blocker was suppressing.
      await expect(page.getByRole('heading', { name: 'Åpne en uke' })).toBeVisible();
      await expect(page.locator('[data-test="periods-empty"]'))
        .toHaveText('Ingen oppgjør ennå. Åpne en uke nedenfor for å lage det første.');
      return 'settlement surface open, no statements yet';
    });

    await journey.step('and putting the stage switch back down closes it again', async () => {
      // THE MUTATION, RUN BY THE JOURNEY ITSELF. Everything above would be equally green against a
      // fixture that ignored feature flags entirely — which is the defect this walk exists to not
      // repeat — so the walk ends by proving the gate is load-bearing: the same page, the same
      // session, one switch moved, and the surface goes away again.
      await page.goto('/admin/feature-flags');
      await flip(page, 'off', STATEMENTS_FLAG);
      await page.goto('/admin/margin-statements');
      await expect(page.locator('[data-test="blocker"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Åpne en uke' })).toHaveCount(0);
      return 'switch down, surface gone — the gate is real';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would say the capability does not
      // work, which is false. A browser error during a working flow is a finding somebody has to
      // decide about, and they cannot decide about something nobody wrote down.
      //
      // SORTED, though, because a finding filed against the wrong surface is nearly as useless as no
      // finding. The router's «Navigation cancelled» pair is the ADMIN SHELL's login redirect racing
      // itself — `AdminPage` replaces to `/admin?redirect=…` and the store selection appends
      // `&storeId=` on top of it — and it appears identically in every signed-in journey in this
      // suite, including ones that touch nothing this page touches. Filing it as a defect here would
      // send somebody to read this page looking for it.
      //
      // The 400s are the two refusals this journey provoked on purpose — the taken product link
      // and the duplicate recipe name — and the 404s are the two module gates. All four are
      // asserted on screen above. Excluded BY THIS JOURNEY ONLY, and only because this journey is
      // the one that asks for them.
      const noise = /favicon|Download the Vue Devtools|status of 400|status of 404/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));

      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in growth-privacy-queue, '
          + 'workforce-flag-lever and workforce-schedule-publish. It is AdminPage\'s login redirect '
          + 'being superseded by the storeId append, not anything on this page. Recorded so it is '
          + 'not re-diagnosed from here.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the margin recipe journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);

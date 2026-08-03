// JOURNEY — a venue says where it buys butter, and a plate cost stops being unknown.
//
// This is the half of Margin the other two journeys stand on and neither of them walks.
// `margin-recipe-to-margin` copies two ingredients out of the bootstrap library, and those arrive
// with a price already attached — so it can cost a batter without ever describing a supplier. Every
// venue that is not using the starter list is in the other case, and it is the one the plan calls
// "reachable, undriven": `/admin/margin-suppliers` could be opened, and until this walk nothing on it
// had been driven by a browser at all.
//
// THE CHAIN, and each link is a precondition of the next rather than a screen in a wizard:
//
//   ingredient -> supplier -> article (pack size + conversion) -> price -> plate cost -> margin
//
// ---- WHY THE MIDDLE OF THIS WALK GOES WRONG ON PURPOSE ----------------------------------------
//
// `packSize` and `purchaseUnitToBaseFactor` are OPTIONAL on the wire. An article saved without one is
// accepted, listed, and can be given a price — and contributes nothing, because `MarginPriceResolver`
// drops it from the candidate set. And if that article is the PREFERRED one for its ingredient, the
// resolver does not fall through to a complete rival: the ingredient resolves to no price at all.
//
// So a venue can do everything the screen asks — create the supplier, create the article, enter the
// invoice price — and find the recipe still saying it has no prices. That is not a hypothetical
// failure mode; it is the single most likely way this feature is used wrongly, and the page has three
// separate warnings for it. This walk enters that state deliberately, checks that the recipe is still
// unpriced while in it, and then fixes exactly one field and watches the plate cost appear.
//
// A walk that filled the form in correctly the first time would have proven that a happy path works,
// and would have been unable to tell the difference between a resolver that enforces the rule and one
// that quietly costs from an article it should have ignored.
//
// ---- WHAT MAKES THE FIGURES CREDIBLE ----------------------------------------------------------
//
// kr 900,00 for a 10 kg carton is kr 90,00/kg; 400 g of it is kr 36,00 for the batch and kr 4,50 for
// one of eight portions; sold as a kr 30,00-net dish that is a 15,00 % food cost. NONE of that
// arithmetic happens in the browser — the page reads `totalCostMinor`, `perPortionCostMinor`,
// `plateCostMinor`, `contributionMinor` and `foodCostPercent` as separate fields off the wire — so
// asserting the rendered strings is asserting that the right field reached the right cell through a
// real currency formatter, on figures that moved because the supplier data moved.
//
// The last step raises the price and watches every one of them move again, which is the property a
// venue actually buys: not that a cost can be computed once, but that it tracks what things cost.
//
// ---- THE MUTATION THAT PROVES THE RED ---------------------------------------------------------
//
// Default a missing `packSize` to 1 in the fixture's `isCostable` — the "helpful" one-liner
// `utils/margin/supplier-model.js` warns about in its header, and the exact change a developer makes
// when an article "should obviously" be costable — and the walk reds at the step that checks the
// recipe is STILL unpriced after the price was entered: the incomplete article costs, and kr 900,00
// per carton is read as kr 900,00 per kilo. Run and recorded in `lanes/L-JOURNEY-MARGIN/`.
//
// ---- WHAT THIS WALK DOES NOT COVER ------------------------------------------------------------
//
// The PREFERRED-article rule is only half exercised. The article here is marked preferred and it is
// the ingredient's ONLY one, so what is proven is that an incomplete article does not cost — not that
// an incomplete PREFERRED article suppresses a complete RIVAL. That second half needs a second
// supplier selling the same ingredient, and no journey in this repo builds one. It is recorded as a
// finding rather than implied by the capability list.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

const MODULE_FLAG = 'Margin.Module';

const INGREDIENT = 'Smør';
const SUPPLIER = 'Vestland Meieri';
const ARTICLE = 'Smør 10 kg kartong';
const RECIPE = 'Hollandaise';

test(
  'A venue records a supplier, an article and a price, and a plate cost stops being unknown',
  journeyDetails({
    journey: 'margin-supplier-to-plate',
    surface: 'admin',
    capabilities: [
      'margin.module.gate',
      'margin.ingredients.author',
      'margin.suppliers.author',
      'margin.supplier-items.author',
      'margin.supplier-items.costability-rule',
      'margin.prices.effective-dated-append',
      'margin.recipe.cost-preview',
      'margin.menu-margin.read'
    ]
  }),
  async ({ page, journey }) => {
    // A card on the supplier screen, addressed by the heading it prints. Five sections share the same
    // class there, and three of them have a field called some form of "name" — so nothing below is
    // located by position.
    const card = title => page.locator('section.mrg-card')
      .filter({ has: page.locator('h2.mrg-card__title', { hasText: new RegExp('^\\s*' + title + '\\s*$') }) });

    // A labelled field INSIDE one of those cards, matched on the label element's whole text. Not
    // `filter({ hasText })` on the label: Playwright's substring match is case-insensitive, and the
    // pack-size field's hint contains the word "innkjøpsenheter", which would make a search for the
    // "Innkjøpsenhet" field ambiguous between two adjacent inputs.
    const field = (section, label) => section.locator('label.mrg-field')
      .filter({ has: page.locator('span.mrg-field__label', { hasText: new RegExp('^\\s*' + label + '\\s*$') }) });

    await journey.step('sign in, and find the supplier screen closed like the rest of the module', async () => {
      await page.goto('/admin/margin-suppliers');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/margin-suppliers' });
      await expect(page.locator('.mrg-page__title')).toHaveText('Leverandører og innkjøpspriser');

      // `Margin.Module` is a store allow-list and deny-closed, so this surface is dark for the same
      // reason the recipe surface is. Asserted whole rather than by keyword: the SAME element says
      // `mrg_status_unknown` when the status read merely failed, and a blocker matched on "Margin"
      // would pass on either.
      await expect(page.locator('[data-test="blocker"]'))
        .toHaveText('Margin-modulen er ikke slått på for denne butikken.');
      return 'stopped by ' + MODULE_FLAG;
    });

    await journey.step('turn the module on, and find a store with suppliers and no ingredients', async () => {
      await turnOn(page, MODULE_FLAG);
      await page.goto('/admin/margin-suppliers');
      await expect(page.locator('[data-test="blocker"]')).toHaveCount(0);

      // The two the venue's bookkeeping already knows about — a purchase-spend line on the weekly
      // settlement is attributed to one of these — and NOTHING to buy from them yet. That asymmetry
      // is the state this screen exists to resolve.
      await expect(page.locator('[data-test="ingredients-empty"]')).toBeVisible();
      await expect(page.locator('[data-test="items-no-supplier"]')).toBeVisible();
      await expect(page.locator('[data-test="price-no-item"]')).toBeVisible();
      const suppliers = card('Leverandører').locator('.mrg-list__item');
      await expect(suppliers).toHaveCount(2);
      return (await suppliers.count()) + ' suppliers, 0 ingredients, nothing priced';
    });

    await journey.shot('the supplier screen, empty');

    await journey.step('author the ingredient itself — NOT a starter, so it arrives unpriced', async () => {
      // Deliberately not one of the three bootstrap chips. A starter carries a price with it, which is
      // what lets `margin-recipe-to-margin` cost a recipe without a supplier — and would make every
      // assertion below about the supplier chain unfalsifiable, because the cost would appear whether
      // or not any of it worked.
      const ingredients = card('Råvarer');
      await field(ingredients, 'Navn').locator('input').fill(INGREDIENT);
      await field(ingredients, 'Grunnenhet').locator('select').selectOption({ label: 'kilo' });
      await ingredients.getByRole('button', { name: 'Opprett råvare' }).click();

      await expect(page.locator('[data-test="ingredients-empty"]')).toHaveCount(0, { timeout: 15000 });
      await expect(ingredients.locator('.mrg-list__name')).toHaveText(INGREDIENT);
      // The base unit is chosen ONCE and there is no field for it on the update request, so it is
      // immutable by construction. The page says so where a venue would otherwise look for it.
      await expect(page.locator('[data-test="ingredient-detail-base-unit"]')).toContainText('kilo');
      return INGREDIENT + ' mastered in kilo, with no price of any kind';
    });

    await journey.step('a recipe that uses it has no cost, and the page says why and where to go', async () => {
      await page.goto('/admin/margin-recipes');
      const recipeField = label => page.locator('label.mrg-field').filter({ hasText: label });
      await recipeField('Navn').locator('input').fill(RECIPE);
      await recipeField('Utbytte').locator('input').fill('2');
      await recipeField('Enhet').locator('select').selectOption({ label: 'liter' });
      await recipeField('Porsjoner').locator('input').fill('8');

      await page.getByRole('button', { name: '+ Legg til linje' }).click();
      const line = page.locator('.mrg-component').first();
      await line.locator('select').first().selectOption({ label: INGREDIENT });
      await line.locator('.mrg-component__qty').fill('400');
      await line.locator('.mrg-component__unit').selectOption('g');
      await page.getByRole('button', { name: 'Lagre og regn ut' }).click();

      // NOT kr 0,00. The wire really does say `totalCostMinor: 0` for a version where no line
      // resolved — a true lower bound derived from zero knowledge — and rendering it would tell a
      // venue this dish is free. A dash, and a sentence naming the count of unpriced lines.
      await expect(page.locator('[data-test="batch-cost"]')).toHaveText('—', { timeout: 15000 });
      await expect(page.locator('[data-test="portion-cost"]')).toHaveText('—');
      await expect(page.locator('[data-test="cost-notice"]'))
        .toContainText('Ingen av de 1 linjene har en pris, så kostprisen er ukjent — ikke null');

      // And the way out is an actual link rather than an instruction. This is the sentence that used
      // to tell a venue to add "a supplier item with a valid price" on a screen that did not exist.
      const fix = page.locator('[data-test="cost-fix-link"] a');
      await expect(fix).toHaveAttribute('href', '/admin/margin-suppliers');
      return 'batch and per-portion both withheld; the notice names 1 unpriced line and links to the supplier screen';
    });

    await journey.step('sell it as a dish and activate it — the margin is a floor, not a figure', async () => {
      await page.locator('[data-test="link-add"]').click();
      await page.locator('[data-test="link-product"]').first().selectOption({ label: 'Vaffel med rømme' });
      await page.locator('[data-test="link-quantity"]').first().fill('1');
      await page.locator('[data-test="link-save"]').click();
      await expect(page.locator('[data-test="failure"]')).toHaveCount(0, { timeout: 15000 });

      await page.getByRole('button', { name: 'Aktiver utkastet' }).click();
      await expect(page.locator('.mrg-cost__version')).toHaveText('Aktiv v1', { timeout: 15000 });

      // Everything about the SALES side is known and everything about the COST side is not, and the
      // page keeps them apart instead of averaging them into a margin. `floor` rather than `absent`:
      // there IS an active version, it just prices nothing, so "at least kr 0,00" is the honest
      // statement and the contribution stays a dash rather than becoming the whole net price.
      const base = page.locator('[data-test="mm-row"][data-basis="Base"]');
      await expect(base.locator('[data-test="mm-net"]')).toContainText('kr 30,00');
      await expect(base.locator('[data-test="mm-plate"]')).toHaveAttribute('data-plate-state', 'floor');
      await expect(base.locator('[data-test="mm-plate"]')).toHaveText('minst kr 0,00');
      await expect(base.locator('[data-test="mm-contribution"]')).toHaveText('—');
      await expect(base.locator('[data-test="mm-food-cost"]')).toHaveText('—');
      await expect(page.locator('[data-test="mm-withheld"]').first())
        .toContainText('Minst én linje mangler pris, så tallerkenkosten er bare en nedre grense');
      return 'sold at kr 30,00 net, plate cost a floor of kr 0,00, contribution and food cost withheld';
    });

    await journey.shot('a dish whose cost side is unknown');

    await journey.step('record the supplier, and note it can be created but not re-edited', async () => {
      await page.goto('/admin/margin-suppliers');
      const suppliers = card('Leverandører');
      await field(suppliers, 'Navn').locator('input').fill(SUPPLIER);
      await field(suppliers, 'Organisasjonsnummer').locator('input').fill('912345678');
      await suppliers.getByRole('button', { name: 'Opprett leverandør' }).click();

      await expect(suppliers.locator('.mrg-list__item')).toHaveCount(3, { timeout: 15000 });
      // The create response is the ONLY place a supplier's revision ever appears — the list carries
      // none and the module publishes no `GET /margin/suppliers/{id}` — so the edit and archive
      // controls exist for this session and vanish on reload. The page says so rather than offering
      // a button whose only answer would be `margin.revision-required`. Asserted here because it is
      // reachable only in this one moment, before the reload two steps down.
      await expect(page.locator('[data-test="supplier-no-revision"]')).toHaveCount(0);
      return SUPPLIER + ' created and selected; its revision held only until the next reload';
    });

    await journey.step('THE TRAP — an article with no pack size, marked preferred', async () => {
      // Everything a venue would think it needs, minus one optional field. The server accepts it, the
      // list shows it, a price can be entered against it, and it costs nothing — and because it is
      // PREFERRED it also stops any other supplier's article from costing this ingredient.
      const items = card('Leverandørvarer');
      await items.locator('select').first().selectOption({ label: INGREDIENT });
      await field(items, 'Varenavn').locator('input').fill(ARTICLE);
      await field(items, 'Artikkelnummer').locator('input').fill('SMR-10');
      await field(items, 'Innkjøpsenhet').locator('input').fill('kg');
      await field(items, 'Omregning til grunnenhet').locator('input').fill('1');
      // Pakningsstørrelse is left EMPTY. Blank is a legitimate value the server stores as null; it is
      // not a validation error, which is exactly what makes this state reachable in the wild.
      await items.locator('label.mrg-check').filter({ hasText: 'Foretrukket vare' }).locator('input').check();
      await items.getByRole('button', { name: 'Opprett leverandørvare' }).click();

      // THE FLAG IS ON THE ROW, not buried in the form: the row is where a venue looks when a recipe
      // says it has no prices.
      await expect(page.locator('[data-test="item-incomplete-flag"]')).toHaveText(
        'Mangler pakningsstørrelse, så prisen på denne varen brukes ikke til kostpris.', { timeout: 15000 });
      // …and the worse consequence is reported at PAGE level, because the damage is to the ingredient
      // rather than to the article being looked at.
      await expect(page.locator('[data-test="preferred-blocker"]')).toContainText(
        'Da får råvaren ingen pris i det hele tatt, heller ikke fra andre leverandører');
      return ARTICLE + ' saved without a pack size and marked preferred — accepted, and useless';
    });

    await journey.step('enter the invoice price anyway, exactly as a venue would', async () => {
      const prices = card('Prishistorikk');
      // Said next to the form that is about to add a price, which is the moment a venue believes the
      // problem is solved. The PREFERRED variant of the sentence, because that is the worse case.
      await expect(page.locator('[data-test="price-item-incomplete"]')).toContainText(
        'Da får råvaren ingen pris i det hele tatt — heller ikke fra andre leverandører');
      await expect(page.locator('[data-test="timeline-empty"]')).toBeVisible();

      await field(prices, 'Pris per pakning').locator('input').fill('900,00');
      await field(prices, 'Valuta').locator('input').fill('NOK');
      await field(prices, 'Gjelder fra').locator('input').fill('2026-07-01T08:00');
      await prices.getByRole('button', { name: 'Lagre prisen' }).click();

      await expect(page.locator('[data-test="timeline-amount"]')).toHaveText('kr 900,00', { timeout: 15000 });
      await expect(page.locator('[data-test="timeline-badge"]')).toHaveText('Gjelder nå');
      await expect(page.locator('[data-test="timeline-source"]')).toHaveText('Lagt inn manuelt');
      return 'kr 900,00 per carton recorded and in force — on an article that cannot cost';
    });

    await journey.shot('a price on an article that cannot cost');

    await journey.step('AND THE RECIPE IS STILL UNPRICED — which is the point of the rule', async () => {
      // The assertion the whole middle of this walk exists for. Everything the screen asked for has
      // been done and the plate cost has not moved, because the preferred article cannot cost and the
      // resolver refuses to fall through to anything else. A resolver that "helpfully" fell through
      // would make this step red, and would be producing plate costs the backend does not produce.
      await page.goto('/admin/margin-recipes');
      await page.locator('.mrg-list__item').filter({ hasText: RECIPE }).click();
      await expect(page.locator('[data-test="batch-cost"]')).toHaveText('—', { timeout: 15000 });
      await expect(page.locator('[data-test="cost-notice"]')).toContainText('Ingen av de 1 linjene har en pris');
      await expect(page.locator('[data-test="mm-row"][data-basis="Base"]').locator('[data-test="mm-plate"]'))
        .toHaveAttribute('data-plate-state', 'floor');

      journey.finding('note', 'the preferred-article rule is only half driven by this walk',
        'This step proves an INCOMPLETE article does not cost. It does not prove the harder half of ' +
        '`MarginPriceResolver`: that an incomplete PREFERRED article suppresses a COMPLETE rival, so ' +
        'an ingredient with two perfectly good priced suppliers resolves to no price at all. ' +
        '`utils/margin/supplier-model.js` calls that the case the file exists for, and ' +
        '`mrg_item_preferred_blocks` — which this walk does render — is the venue-facing warning for ' +
        'it. Driving it needs a second supplier selling the same ingredient; no journey in this repo ' +
        'builds one, so nothing here is evidence for that branch.');
      return 'supplier recorded, article recorded, price recorded — and the cost is still unknown';
    });

    await journey.step('fix ONE field, and the plate cost appears', async () => {
      await page.goto('/admin/margin-suppliers');
      await card('Leverandører').locator('.mrg-list__item').filter({ hasText: SUPPLIER }).click();
      // AFTER A RELOAD the supplier's own controls are gone and the page prints the reason — the
      // revision only ever arrives on a write response. The ARTICLE stays editable, because its list
      // rows each carry one. That asymmetry is the real controller's and this is where it bites.
      await expect(page.locator('[data-test="supplier-no-revision"]')).toBeVisible({ timeout: 15000 });

      const items = card('Leverandørvarer');
      await items.locator('.mrg-list__item').filter({ hasText: ARTICLE }).click();
      await expect(page.locator('[data-test="timeline-amount"]')).toHaveText('kr 900,00', { timeout: 15000 });

      await field(items, 'Pakningsstørrelse').locator('input').fill('10');
      await items.getByRole('button', { name: 'Lagre leverandørvaren' }).click();

      // Both warnings go, and they go because the fact behind them went — not because a form was
      // submitted. The row is re-read from the server after every item write.
      await expect(page.locator('[data-test="item-incomplete-flag"]')).toHaveCount(0, { timeout: 15000 });
      await expect(page.locator('[data-test="preferred-blocker"]')).toHaveCount(0);
      await expect(page.locator('[data-test="price-item-incomplete"]')).toHaveCount(0);
      return 'pack size 10 · kg · factor 1 — kr 900,00 per carton is now kr 90,00 per kilo';
    });

    await journey.step('the plate cost, and the margin, to the øre', async () => {
      await page.goto('/admin/margin-recipes');
      await page.locator('.mrg-list__item').filter({ hasText: RECIPE }).click();

      // ASSERTED AS THE READER SEES IT, and every figure is one field off the wire. 400 g of a
      // kr 90,00/kg butter is kr 36,00 for the batch and kr 4,50 for one of eight portions; the page
      // performs no arithmetic on money at all, so these strings are the whole chain from the
      // supplier's carton price through the resolver, the calculator and the currency formatter.
      await expect(page.locator('[data-test="batch-cost"]')).toHaveText('kr 36,00', { timeout: 15000 });
      await expect(page.locator('[data-test="portion-cost"]')).toHaveText('kr 4,50');
      await expect(page.locator('[data-test="cost-notice"]')).toHaveCount(0);
      await expect(page.locator('[data-test="cost-fix-link"]')).toHaveCount(0);

      // ONE ROW PER PRICE BASIS: eat-in and take-away carry different VAT, and a food-cost percentage
      // without its basis is not a number. The contribution is READ, never `net − plate` subtracted
      // here — the backend rounds the plate cost once after scaling it by the link quantity, and two
      // rounded figures subtracted in a browser can disagree with the till.
      const base = page.locator('[data-test="mm-row"][data-basis="Base"]');
      const table = page.locator('[data-test="mm-row"][data-basis="Table"]');
      await expect(base.locator('[data-test="mm-plate"]')).toHaveAttribute('data-plate-state', 'exact');
      await expect(base.locator('[data-test="mm-plate"]')).toHaveText('kr 4,50');
      await expect(base.locator('[data-test="mm-contribution"]')).toHaveText('kr 25,50');
      await expect(base.locator('[data-test="mm-food-cost"]')).toHaveText('15,00 %');
      await expect(table.locator('[data-test="mm-plate"]')).toHaveText('kr 4,50');
      await expect(table.locator('[data-test="mm-contribution"]')).toHaveText('kr 35,50');
      await expect(table.locator('[data-test="mm-food-cost"]')).toHaveText('11,25 %');
      await expect(page.locator('[data-test="mm-withheld"]')).toHaveCount(0);
      return 'batch kr 36,00 · portion kr 4,50 · take-away 15,00 % · servering 11,25 %';
    });

    await journey.shot('the plate cost, built from the supplier price');

    await journey.step('the supplier raises the price, and every figure follows it', async () => {
      // What a venue is actually buying: not that a cost can be computed once, but that it tracks
      // what things cost. And the price is not EDITED — the row in force is closed at the instant the
      // new one opens, and both stay, which is what makes a food-cost history readable at all.
      await page.goto('/admin/margin-suppliers');
      await card('Leverandører').locator('.mrg-list__item').filter({ hasText: SUPPLIER }).click();
      const items = card('Leverandørvarer');
      await items.locator('.mrg-list__item').filter({ hasText: ARTICLE }).click();

      const prices = card('Prishistorikk');
      await field(prices, 'Pris per pakning').locator('input').fill('1080,00');
      await field(prices, 'Valuta').locator('input').fill('NOK');
      await field(prices, 'Gjelder fra').locator('input').fill('2026-08-01T08:00');
      await prices.getByRole('button', { name: 'Lagre prisen' }).click();

      // TWO ROWS, newest first, and exactly one of them in force. The seam is the point: the old row
      // ended at precisely the instant the new one began, so there is never a moment with two prices
      // and never an ambiguous boundary.
      const amounts = page.locator('[data-test="timeline-amount"]');
      await expect(amounts).toHaveCount(2, { timeout: 15000 });
      expect((await amounts.allTextContents()).map(t => t.trim())).toEqual(['kr 1 080,00', 'kr 900,00']);
      const badges = page.locator('[data-test="timeline-badge"]');
      expect((await badges.allTextContents()).map(t => t.trim())).toEqual(['Gjelder nå', 'Avsluttet']);
      await expect(page.locator('[data-test="timeline-seam"]')).toContainText('den ble avsluttet i samme øyeblikk som den neste startet');
      await expect(page.locator('[data-test="timeline-multi-open"]')).toHaveCount(0);

      await page.goto('/admin/margin-recipes');
      await page.locator('.mrg-list__item').filter({ hasText: RECIPE }).click();
      await expect(page.locator('[data-test="batch-cost"]')).toHaveText('kr 43,20', { timeout: 15000 });
      await expect(page.locator('[data-test="portion-cost"]')).toHaveText('kr 5,40');
      const base = page.locator('[data-test="mm-row"][data-basis="Base"]');
      await expect(base.locator('[data-test="mm-plate"]')).toHaveText('kr 5,40');
      await expect(base.locator('[data-test="mm-contribution"]')).toHaveText('kr 24,60');
      await expect(base.locator('[data-test="mm-food-cost"]')).toHaveText('18,00 %');
      return 'kr 1 080,00 supersedes kr 900,00; plate kr 4,50 -> kr 5,40, food cost 15,00 % -> 18,00 %';
    });

    await journey.shot('the price rise, and what it did to the margin');

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED, except for the one thing that would mean the walk described a
      // different world: no request may have been refused. Every refusal on this chain is pre-empted
      // by the page or is a state the venue is supposed to be able to leave, so a 4xx here would mean
      // some step above succeeded for a reason nobody has looked at.
      expect(journey.failedRequests).toEqual([]);

      const noise = /favicon|Download the Vue Devtools/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text) && !shellRedirect.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the supplier-to-plate journey', error);
      }
      return journey.backendResponses + ' responses from the fixture, 0 refused, ' +
        errors.length + ' unexplained console error(s)';
    });
  }
);

// JOURNEY — a concierge stands a company meals pilot up, end to end.
//
// Company → corridor agreement → programme → policy version → invitation. Each step is a
// precondition of the next and the page enforces the order rather than letting somebody discover it:
// a programme hangs off an ACTIVE corridor (not off the store), a policy is issued against a
// programme, and the invitation is the only thing that produces a claimable token — one that reaches
// a person solely because a human relays it, since the module has no outbox at all.
//
// SELECTORS HERE RIDE ON CLASSES AND NORWEGIAN LABEL TEXT, because this surface carries no
// `data-test` attributes. That is recorded as a finding rather than worked around silently: it makes
// these selectors the most brittle in the suite, and a reworded label breaks a journey rather than a
// feature. Each field is looked up inside its own panel section so at least the ambiguity is local.
//
// TWO REFUSALS. One local — an invitation with neither contact channel — and one from the server: an
// invitation naming BOTH an email and a phone. The second is worth having because the contact is not
// a label: it is what the claim's `meals.invitation-contact-mismatch` check compares against, so
// "exactly one channel" is what makes the intended recipient identifiable at all.
//
// WHAT THIS PAGE STILL CANNOT DO is asserted too, because a screen that made a pilot look ready when
// nobody can order a lunch is the more expensive failure: the ordering banner is on screen from the
// first paint, and the policy panel says out loud that no route reads a policy version back.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');

// The national part of the PowerUser's number — the login modal prefixes +47 itself. Derived from
// the world rather than typed, so the two cannot drift apart silently.
const CONCIERGE = world.CONCIERGE_PHONE.replace(/^\+47/, '');

test(
  'A concierge creates a company, signs its corridor, runs a programme and issues an invitation',
  journeyDetails({
    journey: 'meals-admin-setup',
    surface: 'admin',
    capabilities: [
      'meals.company.create',
      'meals.agreement.sign',
      'meals.program.create',
      'meals.policy.version.issue',
      'meals.invitation.create'
    ]
  }),
  async ({ page, journey }) => {
    const field = (section, label) =>
      page.locator(section).locator('label.mls-label').filter({ hasText: label }).locator('input').first();

    await journey.step('sign in as the concierge', async () => {
      await page.goto('/admin/meals-companies');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: CONCIERGE, code: world.OTP, expectPath: '/admin/meals-companies' });
      await expect(page.locator('.meals-setup__title')).toHaveText('Bedriftskontoer');
      // The concierge forms exist only for a platform PowerUser: company authority resolves from an
      // active CompanyAdmin membership and never from the role that creates the company, so a store
      // admin is shown a stated refusal instead of a form nobody here can submit. Every OTHER
      // identity in this world is a store admin and is refused here — measured, not assumed: this
      // assertion failed against the manager's number before the PowerUser identity existed.
      await expect(page.locator('.meals-company form')).toBeVisible();
      return 'on /admin/meals-companies as ' + world.CONCIERGE_PHONE + ' (PowerUser)';
    });

    await journey.step('the step this surface CANNOT perform is stated at the top', async () => {
      // Standing a programme up does not make a lunch buyable: the employee funding path needs a
      // reservation token no cart in this estate sends, and sits behind its own `meals.ordering`
      // flag. Said once and at the top rather than discovered afterwards.
      await expect(page.locator('.mls-note').first()).toContainText('bestill');
      return (await page.locator('.mls-note').first().textContent()).replace(/\s+/g, ' ').trim().slice(0, 90) + '…';
    });

    await journey.step('create the buying company', async () => {
      await field('.meals-company', 'Organisasjonsnummer').fill('998877665');
      await field('.meals-company', 'Land (ISO)').fill('NO');
      await field('.meals-company', 'Juridisk navn').fill('Sogn Kafé Drift AS');
      await field('.meals-company', 'Visningsnavn').fill('Sogn Kafé');

      // THE FIELD THAT DECIDES WHO CAN RUN THE ACCOUNT AFTERWARDS. Naming somebody else creates a
      // company this operator can then read nothing of, so it defaults to self and the copy says why.
      const self = page.locator('.mls-check input[type="checkbox"]');
      if (!(await self.isChecked())) { await self.check(); }

      await page.getByRole('button', { name: 'Opprett bedrift' }).click();
      // The created company is held in SESSION state as well as selected: the venue directory cannot
      // see a company with no corridor yet, and the module has no route that lists company accounts.
      await expect(page.locator('.meals-corridor')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.mls-row.is-selected')).toContainText('Sogn Kafé');
      return 'Sogn Kafé Drift AS created and selected';
    });

    await journey.shot('a new company account');

    await journey.step('sign the corridor agreement at this venue', async () => {
      // THE CURRENCY IS NOT A FIELD. It is part of the corridor's identity `(company, store,
      // currency)` and derives from the venue's own market; a corridor signed in the wrong currency
      // cannot be edited, only ended and re-signed.
      await expect(page.locator('.meals-corridor')).toContainText('NOK');
      await field('.meals-corridor', 'Selgerens juridiske navn').fill('Okam AS');
      await field('.meals-corridor', 'Selgerens organisasjonsnummer').fill('923456789');
      await page.getByRole('button', { name: 'Signer avtalen' }).click();

      // The venue directory is the authority on which corridor a company has here, so the page
      // re-reads it rather than patching the signing response into the row. The corridor's own facts
      // list appears ABOVE the form once it exists, which is the assertion — waiting on the panel's
      // text rather than on an element count, because the form's own facts list shares the class.
      await expect(page.locator('.meals-corridor')).toContainText('Aktiv', { timeout: 15000 });
      await expect(page.locator('.meals-corridor .mls-facts').first()).toContainText('agr-');
      return 'corridor signed, currency NOK';
    });

    await journey.step('create a programme under it', async () => {
      // A programme carries no store: its store, currency and seller all resolve through the
      // agreement. Before the corridor existed this form was not even drawn.
      await field('.meals-programs', 'Navn på ordningen').fill('Lunsjordning 2026');
      await page.getByRole('button', { name: 'Opprett ordning' }).click();
      const rows = page.locator('.meals-programs .mls-row');
      await expect(rows).toHaveCount(1, { timeout: 15000 });
      await expect(rows.first()).toContainText('Lunsjordning 2026');
      // No policy yet, and the page says "Ingen" rather than a zero.
      await expect(rows.first()).toContainText('Ingen');
      return 'Lunsjordning 2026, no policy version yet';
    });

    await journey.step('issue its first immutable policy version', async () => {
      // NOT clicked: `createProgram` selects the programme it just created, so a click here would
      // TOGGLE THE SELECTION OFF (`selectProgram` is a toggle, so a venue can get back to "nothing
      // selected"). The page having already made the selection is the behaviour under test.
      await expect(page.locator('.meals-programs .mls-row.is-selected')).toHaveCount(1);

      // A limit named before somebody supersedes a policy they cannot see: the module exposes no
      // route that reads a policy version BACK. A programme carries its latest version NUMBER and
      // nothing else.
      await expect(page.locator('.meals-programs .mls-note--warn')).toContainText('leser');

      await field('.meals-programs', 'Beløpsgrense per periode').fill('120,00');
      await field('.meals-programs', 'Tidssone').fill('Europe/Oslo');
      await field('.meals-programs', 'Gjelder fra').fill('2026-08-03T09:00');
      await page.getByRole('button', { name: 'Publiser regelverket' }).click();

      await expect(page.locator('.meals-programs .mls-row').first()).toContainText('1', { timeout: 15000 });
      return 'policy version 1 issued in NOK';
    });

    await journey.shot('a programme with a policy');

    await journey.step('an invitation with no contact channel is refused locally', async () => {
      const before = journey.failedRequests.length;
      // The acknowledgement gate first: the button is disabled until the operator has confirmed they
      // understand that this membership will be named by a bare identifier on every future statement
      // line, permanently, and that it cannot be corrected afterwards (ledger entry MIG-17).
      await page.locator('.meals-people .mls-check input[type="checkbox"]').check();
      await page.getByRole('button', { name: 'Lag invitasjon' }).click();
      await expect(page.locator('.meals-people .mls-error')).toHaveText('E-post eller telefon må fylles ut.');
      expect(journey.failedRequests.length).toBe(before);
      return 'refused before anything was sent';
    });

    await journey.step('an invitation naming BOTH channels is refused by the server', async () => {
      // EXACTLY ONE channel, because the contact is not a label: it is what the claim's contact check
      // compares against, and it is what stops a forwarded token being a bearer credential.
      await field('.meals-people', 'E-post').fill('ny.ansatt@sogn.test');
      await field('.meals-people', 'Telefon').fill('+4790000002');
      await page.getByRole('button', { name: 'Lag invitasjon' }).click();
      // The sentence discharges the obligation every write failure on this surface carries: it says
      // whether anything was SAVED, because the caller is about to decide whether to retry.
      const failure = page.locator('.meals-people .mls-note--warn').filter({ hasText: 'Ingenting ble lagret' });
      await expect(failure.first()).toBeVisible({ timeout: 15000 });
      return (await failure.first().textContent()).replace(/\s+/g, ' ').trim().slice(0, 110);
    });

    await journey.step('issue the invitation, and receive the token exactly once', async () => {
      await field('.meals-people', 'Telefon').fill('');
      await page.getByRole('button', { name: 'Lag invitasjon' }).click();

      const token = page.locator('#meals-issued-token');
      await expect(token).toBeVisible({ timeout: 15000 });
      const value = await token.inputValue();
      expect(value.length).toBeGreaterThan(0);
      // NOTHING IS SENT. The module has no outbox, no SMS and no mail: the token is handed back on
      // this response and to nobody else, which is why the panel names the claim page's address
      // separately — the credential and the destination travel as two things.
      await expect(page.locator('.meals-people')).toContainText('/meals/join');
      return 'token issued: ' + value;
    });

    await journey.step('the invitation list can never show that token again', async () => {
      // Only the create response carries the plaintext; the server stores a hash and re-derives the
      // value from the invitation id, so there is no route that can produce it a second time.
      // "Jeg har gitt koden videre" — the dismissal is worded as the operator asserting they have
      // RELAYED it, because nothing else will: the module has no outbox, and once this card is gone
      // the plaintext exists nowhere.
      await page.getByRole('button', { name: 'Jeg har gitt koden videre' }).click();
      // `.first()`: the panel renders TWO tables — the invitations and the memberships — and the
      // claim is about the first. The membership table is the one that carries the bare identifier
      // MIG-17 is about, which is a different subject.
      const rows = page.locator('.meals-people .mls-table').first().locator('.mls-badge');
      await expect(rows.first()).toBeVisible({ timeout: 15000 });
      const listed = await page.locator('.meals-people .mls-table').first().textContent();
      expect(listed).toContain('ny.ansatt@sogn.test');
      expect(listed).not.toContain('mealsinv_');
      return 'the row names the contact and not the code';
    });

    await journey.shot('an issued invitation');

    await journey.step('this surface carries no test hooks, and that is a finding', () => {
      journey.finding('note', 'the Meals admin surface has no data-test attributes',
        'pages/admin/meals-companies.vue, pages/admin/meals-agreements.vue and every component under ' +
        'components/admin/meals/ carry zero `data-test` attributes, so this journey addresses its ' +
        'controls by CSS class and by Norwegian label text. Margin, Training, Events and the Growth ' +
        'guest pages all carry them. The consequence is not cosmetic: a reworded label here fails a ' +
        'journey that is meant to fail only when the product does.');
      return 'recorded';
    });

    await journey.step('the gate on this surface has NO lever, and the walk says so', () => {
      // Every other module journey in this suite turns its own switch on through
      // `/admin/feature-flags` and watches the surface open, because a walk against a gate the
      // fixture does not model is a walk no real venue could take. This one cannot, and the honest
      // thing is to name that rather than to flip the nearest togglable flag.
      //
      // The company-scoped routes behind this page resolve `Features:Meals` — HOST CONFIG, bound
      // through `IOptionsMonitor`, with no store dimension and no per-store route that can see or
      // move it. `meals.module` IS in the switchboard catalog, but it gates the venue-scoped reads
      // on a different page; an operator pressing it changes nothing here, in either direction.
      journey.finding('note', 'the Meals concierge surface is gated by host config with no operator lever',
        'The three company-scoped route families this walk drives resolve `Features:Meals` through ' +
        '`IOptionsMonitor`, so nothing in the product can open or close them and this journey cannot ' +
        'flip its own gate the way margin-recipe-to-margin, growth-guest-consent and the two ' +
        'workforce walks do. The permanent counterpart already exists on the consumer side as ' +
        '`journeys/consumer/meals-module-dark.spec.js`. `L-MEALS-REACHABLE` records the same gap ' +
        'from the backend and holds it open on a Sven ruling.');
      return 'recorded: Features:Meals is host config, so this walk has no flip to make';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED — the flow completed. The 400 is the both-channels invitation this
      // journey provoked on purpose and asserted on screen above.
      const noise = /favicon|Download the Vue Devtools|status of 400/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note', 'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in every other signed-in journey in ' +
          'this suite. It is AdminPage\'s login redirect being superseded by the storeId append, ' +
          'not anything on this page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the meals setup journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);

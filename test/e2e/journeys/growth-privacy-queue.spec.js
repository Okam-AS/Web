// JOURNEY — the venue sees a guest's erasure request and answers it.
//
// THE DEFECT THIS EXISTS TO CLOSE. `pages/preferences/communications.vue` files a guest's art. 15 or
// art. 17 request and then tells them, on screen, in `gr_guest_request_deadline`: «the venue has one
// month to answer you. That follows from GDPR article 12.» The row is written. And
// `GET /v1/growth/stores/{id}/privacy-requests` plus `POST .../resolution` — both served, both
// documented — had ZERO callers in this app. `utils/growth/growth-client.js` recorded the absence as
// deliberate. So the deadline was printed at a guest and counted by nobody, and there was no screen
// on which any member of staff could see that they had been asked, let alone answer. A statutory
// promise with no surface behind it is worse than a missing feature: it invites the inspection it
// cannot survive.
//
// WHAT THIS PROVES THAT NO UNIT TEST CAN:
//
//   • The queue is REACHABLE from the sidebar — clicked, not typed. Two module pages in this estate
//     have already shipped linked from nothing at all.
//   • It reads the real route with a real bearer through the real client. The fixture 401s a call
//     with no token and answers the Growth CONCEALMENT 404 — not a 403 — for a store the caller does
//     not administer.
//   • The overdue erasure is on screen, at the TOP, with the deadline counted. The server sends
//     newest-first, which buries it.
//   • Another store's request is NOT on screen. Seeded precisely so that «scoped to this store» has
//     something to be wrong about.
//   • Resolving it from the queue moves it, and the row then reports what the transport ACCEPTED
//     rather than claiming a delivery or a destruction the response does not carry.
//
// WHY THE GUEST HALF IS SEEDED AND NOT DRIVEN — see the long note in `fixture/world.js`. The
// preference centre's session is an HttpOnly cookie sent with `credentials: 'include'`, and the API
// answers `Access-Control-Allow-Origin: *`, so the browser blocks the filing call before it is made.
// That is a live deployment defect of the guest surface, not of this one, and teaching the fixture to
// echo the origin would model a backend that does not exist. The row is therefore seeded in the state
// a filing leaves it in, and the VENUE's half — the half that had no surface at all — is what the
// browser walks.
//
// NO SWITCH TO TURN ON, and that is checked rather than assumed. Every other gated journey in this
// folder flips its own flag first, because a surface walked without one is a surface a real store
// would refuse. This one does not, because `GrowthConsentAdminController` carries no module gate at
// all — unlike `GrowthNewslettersController`, which will not dispatch with `growth.module` off. The
// step below asserts that emptily-flagged state IS the state the queue answers in, so «no lever
// needed» is a finding this journey produces rather than a corner it cut.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const world = require('../fixture/world');

const OVERDUE = String(world.GROWTH_PRIVACY_OVERDUE_ID);
const FRESH = String(world.GROWTH_PRIVACY_FRESH_ID);
const CLOSED = String(world.GROWTH_PRIVACY_CLOSED_ID);
const FOREIGN = String(world.GROWTH_PRIVACY_FOREIGN_ID);

test(
  'a venue sees a guest\'s erasure request on its privacy queue and resolves it',
  journeyDetails({
    journey: 'growth-privacy-queue',
    surface: 'admin',
    capabilities: [
      'growth.privacy.queue.read',
      'growth.privacy.request.resolve'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in as the manager (99999999 / 123123)', async () => {
      // Landed on the switchboard rather than on `/admin/growth-newsletter`, which would be the more
      // obvious door into Growth. That page fans out three reads this fixture does not serve
      // (`consents/summary`, `newsletters`, `delivery-health`), and their 404s would arrive in THIS
      // journey's artifact as failed requests and console errors — a reader would have to work out
      // that the noise belongs to a neighbouring page before they could trust anything else in the
      // file. The privacy queue is then reached the way an operator reaches it: from the sidebar.
      await page.goto('/admin/feature-flags');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/feature-flags' });
      return 'landed on /admin/feature-flags';
    });

    // ---- REACHABILITY ----------------------------------------------------------------------------
    await journey.step('the privacy queue is reached from the SIDEBAR, not by typing a URL', async () => {
      // C3: a capability exists when it is reachable. Every other navigation in this file could be a
      // `page.goto`; this one may not be, because a queue nothing links to is this lane's own defect
      // restated one level up.
      // Not `exact`: the sidebar appends its «Nyhet» badge to the accessible name, so the link reads
      // "Personvern Nyhet". No other link in the shell contains the word.
      const link = page.getByRole('link', { name: 'Personvern' });
      await expect(link).toBeVisible({ timeout: 30000 });
      await link.click();
      await page.waitForURL(url => url.pathname === '/admin/growth-privacy', { timeout: 30000 });
      await expect(page.locator('.gp-page__title')).toHaveText('Personvernforespørsler');
      return 'clicked «Personvern» in the sidebar and landed on /admin/growth-privacy';
    });

    await journey.step('no module switch was flipped to get here, and none is needed', async () => {
      // The claim, made falsifiable: the switchboard is the product's only lever on the per-store
      // flags, and nothing has written one this run — so `growth.module` reads its deny-closed
      // default while the queue above is answering in full. If this route ever grows a module gate,
      // the queue goes dark and the assertion after it fails.
      await page.goto('/admin/feature-flags');
      const growthModule = page.locator('.ff-row', { has: page.locator('code', { hasText: 'growth.module' }) });
      await expect(growthModule.locator('.ff-row__badge')).toHaveText('Av');
      await expect(growthModule.locator('.ff-row__meta')).toHaveCount(0);

      await page.goto('/admin/growth-privacy');
      await expect(page.locator('.gp-page__blocker')).toHaveCount(0);
      await expect(page.locator('[data-test="read-failed"]')).toHaveCount(0);
      await expect(page.locator('[data-request="' + OVERDUE + '"]')).toBeVisible();
      return 'growth.module reads «Av», never overridden, and the queue answers anyway';
    });

    // ---- THE EXIT CRITERION, FIRST HALF: the venue can SEE it ------------------------------------
    await journey.step('the guest\'s overdue erasure is on screen, at the top of the queue', async () => {
      const rows = page.locator('[data-request]');
      await expect(rows).toHaveCount(2);
      // Most urgent FIRST. The fixture serves newest-first the way `ListAsync` does, so this order is
      // the page's own work; keeping the wire order would put the overdue erasure second.
      const order = await rows.evaluateAll(nodes => nodes.map(n => n.getAttribute('data-request')));
      expect(order).toEqual([OVERDUE, FRESH]);

      const overdue = page.locator('[data-request="' + OVERDUE + '"]');
      await expect(overdue).toContainText('Sletting (artikkel 17)');
      // The reference the guest was given. `gr_guest_request_reference` prints the same id at them,
      // so a guest who phones and quotes it can be matched to this row.
      await expect(overdue.locator('[data-test="reference"]')).toContainText('Referanse ' + OVERDUE);
      // The deadline, counted. This is the number the guest was promised and nothing on the wire
      // carries — it exists only because the page derives it.
      await expect(overdue.locator('[data-test="clock"]')).toContainText('Fristen gikk ut for');
      return 'request ' + OVERDUE + ' is first, art. 17, and past its one-month deadline';
    });

    await journey.step('the overdue banner counts it, and the closed request is filed separately', async () => {
      await expect(page.locator('[data-test="overdue-banner"]')).toBeVisible();
      await expect(page.locator('[data-resolved="' + CLOSED + '"]')).toBeVisible();
      // A resolved request offers no controls: the server is idempotent about it, but an affordance
      // that changes nothing invites the belief that something happened.
      await expect(page.locator('[data-resolved="' + CLOSED + '"] [data-test="fulfil-open"]')).toHaveCount(0);
      return 'one overdue counted; the closed request sits under «Avsluttede» with no controls';
    });

    await journey.step('ANOTHER STORE\'S request is not on this page', async () => {
      // The trap this is built against: a queue seeded with one store's requests passes whether or
      // not it is scoped. The world holds request 9900 for store 99; if the list route stopped
      // filtering, or the page asked about the wrong store, it would be here.
      const body = await page.locator('.gp-page').textContent();
      expect(body).not.toContain(FOREIGN);
      // POSITIVE CONTROL, so the absence above is not the absence of a page: this store's own ids
      // ARE in the same text.
      expect(body).toContain(OVERDUE);
      return 'request ' + FOREIGN + ' (store 99) is absent while ' + OVERDUE + ' (store 42) is present';
    });

    await journey.step('no guest address is anywhere on the page', async () => {
      // The list is masked by contract — an internal contact id, never an address. Asserted on the
      // rendered text rather than on the response, because the failure this guards is a page that
      // reconstructs or echoes one.
      const body = await page.locator('.gp-page').textContent();
      expect(body).not.toMatch(/@/);
      await expect(page.locator('[data-request="' + OVERDUE + '"]')).toContainText('Kontaktpunkt 5501');
      return 'contact rendered as «Kontaktpunkt 5501»; no address-shaped text on screen';
    });

    await journey.shot('the venue can finally see what it was asked');

    // ---- THE REFUSAL PRECONDITION ----------------------------------------------------------------
    await journey.step('a refusal with no reason is not offered', async () => {
      const reject = page.locator('[data-request="' + OVERDUE + '"] [data-test="reject"]');
      await expect(reject).toBeDisabled();
      // And the page says WHY, rather than leaving a dead control beside a blank field.
      await expect(page.locator('[data-request="' + OVERDUE + '"]')).toContainText('Et avslag må ha en begrunnelse');
      return 'the «Avslå» button is closed and the rule is on screen';
    });

    // ---- THE EXIT CRITERION, SECOND HALF: the venue can ANSWER it --------------------------------
    await journey.step('fulfilling is offered only behind the irreversibility warning', async () => {
      await page.locator('[data-request="' + OVERDUE + '"] [data-test="fulfil-open"]').click();
      const warning = page.locator('[data-request="' + OVERDUE + '"] [data-test="fulfil-warning"]');
      await expect(warning).toBeVisible();
      // The erasure warning, not the access one — and it says the thing the response cannot: that
      // the shred may have been deferred, so this screen will not claim a destruction.
      await expect(warning).toContainText('kan ikke angres');
      await expect(warning).toContainText('merkes for sletting');
      // Still nothing written: the confirmation is a step, not a label on the same click.
      await expect(page.locator('[data-request="' + OVERDUE + '"]')).toBeVisible();
      return 'the art. 17 warning is shown and nothing has been sent yet';
    });

    await journey.shot('what the venue is told before it destroys an address');

    await journey.step('confirming resolves the request through the real route', async () => {
      await page.locator('[data-request="' + OVERDUE + '"] [data-test="fulfil-confirm"]').click();
      await expect(page.locator('[data-test="toast"]')).toContainText(OVERDUE, { timeout: 15000 });

      // It has LEFT the open queue and appears under the closed one — read back from a fresh list,
      // not patched in place.
      await expect(page.locator('[data-request="' + OVERDUE + '"]')).toHaveCount(0);
      const closed = page.locator('[data-resolved="' + OVERDUE + '"]');
      await expect(closed).toBeVisible();
      await expect(closed).toContainText('Gjennomført');
      return 'request ' + OVERDUE + ' moved from «Ubesvarte» to «Avsluttede»';
    });

    await journey.step('and the row reports what the TRANSPORT said, not a delivery', async () => {
      const closed = page.locator('[data-resolved="' + OVERDUE + '"]');
      // «accepted by the mail provider; whether it arrived we do not know». The module is built on
      // not folding submission into delivery, and this is the sentence that holds the line on screen.
      await expect(closed).toContainText('tatt imot av e-postleverandøren');
      await expect(closed).toContainText('At den kom fram, vet vi ikke');
      // And it does NOT claim the address was destroyed — the wire item has no field that says so.
      const body = await page.locator('.gp-page').textContent();
      expect(body).not.toMatch(/adressen (er|ble) slettet/i);
      return 'submission reported; no delivery claim and no destruction claim';
    });

    await journey.step('the overdue banner is gone, because the overdue request is answered', async () => {
      await expect(page.locator('[data-test="overdue-banner"]')).toHaveCount(0);
      // The remaining request is still open and still counted down — the queue did not empty itself.
      await expect(page.locator('[data-request="' + FRESH + '"]')).toBeVisible();
      await expect(page.locator('[data-request="' + FRESH + '"] [data-test="clock"]')).toContainText('igjen');
      return 'no overdue rows; request ' + FRESH + ' still open with days left';
    });

    await journey.shot('answered, and the queue reads honestly afterwards');

    await journey.step('a second request can be REFUSED, with the reason recorded', async () => {
      const row = page.locator('[data-request="' + FRESH + '"]');
      await row.locator('[data-test="reason"]').fill('Vi finner ingen registrering som gjelder denne saken.');
      const reject = row.locator('[data-test="reject"]');
      await expect(reject).toBeEnabled();
      await reject.click();
      await expect(page.locator('[data-test="toast"]')).toContainText(FRESH, { timeout: 15000 });

      const closed = page.locator('[data-resolved="' + FRESH + '"]');
      await expect(closed).toBeVisible();
      await expect(closed).toContainText('Avslått');
      // A refusal owes the subject no export and no completion notice, so there is no notice receipt
      // — and the page says that rather than picking one of the three delivery states.
      await expect(closed).toContainText('Ingen kvittering for beskjed er registrert');
      return 'request ' + FRESH + ' refused; no notice receipt claimed';
    });

    await journey.step('the queue is now empty of open requests, and says so honestly', async () => {
      await expect(page.locator('[data-test="open-empty"]')).toBeVisible();
      // «no unanswered requests» — reached because the list ANSWERED and was empty, which is a
      // different fact from a read that failed. The failed-read sentence must not be on screen.
      await expect(page.locator('[data-test="read-failed"]')).toHaveCount(0);
      return 'the open queue reports an answered emptiness, not an unknown one';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would claim the capability does
      // not work, which is false. A browser error during a working flow is a finding somebody has to
      // decide about, and they cannot decide about something nobody wrote down.
      //
      // SORTED, though, because a finding filed against the wrong surface is nearly as useless as no
      // finding. The router's «Navigation cancelled» pair is the ADMIN SHELL's login redirect racing
      // itself — `AdminPage` replaces to `/admin?redirect=…` and the store selection appends
      // `&storeId=` on top of it — and it appears identically in `workforce-flag-lever` and
      // `workforce-schedule-publish`, which touch nothing this journey touches. Filing it as a defect
      // of the privacy queue would send somebody to read this page looking for it. Everything else is
      // this journey's own.
      const noise = /favicon|Download the Vue Devtools/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));

      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in workforce-flag-lever and ' +
          'workforce-schedule-publish. It is AdminPage\'s login redirect being superseded by the ' +
          'storeId append, not anything on /admin/growth-privacy. Recorded so it is not re-diagnosed ' +
          'from this page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the privacy-queue journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });

    await journey.step('the guest half of this journey is still unwalkable, and why', () => {
      // Filed as a NOTE rather than left in a commit message. The venue's side is now complete; the
      // guest's own filing call cannot be driven in a browser because `Program.cs` builds CORS with
      // `AllowAnyOrigin()` and the preference session rides an HttpOnly cookie sent with
      // `credentials: 'include'` — the browser blocks the pair. That is a real defect of the guest
      // surface, owned elsewhere, and it is the reason the row above is seeded.
      journey.finding('note',
        'the guest-side filing of a privacy request cannot be browser-driven',
        'GrowthPreferenceController endpoints 3/4/5/7 need credentialed CORS; the API answers ' +
        'Access-Control-Allow-Origin: * (Program.cs AllowAnyOrigin), so the browser refuses to attach ' +
        'the growth_pref_session cookie. The venue-side queue proven here is unaffected: it is bearer-' +
        'authenticated and same-client. The privacy request in this run was seeded in the state a ' +
        'guest filing leaves it in.');
      return 'recorded as a note';
    });
  }
);

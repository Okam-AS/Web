// JOURNEY — an operator drafts a newsletter, approves it, and walks the gate that decides whether it
// may be sent.
//
// The plan records this whole flow as `reachable · undriven` and names the two things on it worth
// showing a colleague: **the gate fails closed** — "we could not read consent" never renders as
// "consent is absent", and neither ever renders as "consent is granted" — and **the approval screen
// admits it is not informed**, because it cannot show the newsletter body and says so rather than
// implying the reviewer saw what they approved. Neither had been driven, because nothing in the
// fixture answered a single newsletter route.
//
// ---- WHY THE GATE IS THE SUBJECT AND THE SEND IS NOT -------------------------------------------
//
// Growth's stated exit is a GUEST journey — subscribe, receive a real double-opt-in mail from the
// ruled provider, confirm, withdraw — and it cannot be walked here, for a reason recorded in the plan
// rather than discovered: no mail leaves the process at all. The provider interface is bound to a
// deterministic fake in `Program.cs`, the transactional sender carries no SMTP dependency, and the
// signup is therefore never confirmed. So the reachable half is the OPERATOR's, and the honest end of
// it is the gate turning green — not a dispatch, which against this fixture would prove only that a
// fake accepted a POST.
//
// ---- WHAT THE GATE IS, AND WHY THAT MAKES IT A GOOD SUBJECT ------------------------------------
//
// Unlike every other module in this fixture, Growth's refusal is not a route's answer. The gate is
// computed IN THE BROWSER out of four independent reads — the consent summary, the audience snapshot,
// the newsletter's own approval, and the per-store flags read straight off
// `GET /stores/{id}/feature-flags`, the same route the operator switchboard writes. So the walk below
// watches a REASON LIST shrink as each precondition lands, and the list is asserted whole at three
// points rather than sampled: a reason silently disappearing is the exact defect that would let a
// send happen for a reason nobody checked.
//
// AND THE FLAGS ARE THE FIRST STOP. `growth.module` and `growth.dispatch` are both deny-closed, so an
// operator at a store nobody has switched on finds a fully rendered screen with a red gate — which is
// a far more dangerous shape than a blank page, and exactly the shape a fixture modelling no flags
// could never produce. The mutation at the end proves the switch is load-bearing: with the kill
// switch back down, the same ready gate closes again.
//
// ---- ONE THING THIS JOURNEY MAY NOT CLAIM ------------------------------------------------------
//
// A green flag here is NOT a promise that a send would succeed. `utils/platform/feature-flags-client.js`
// records that Growth registers no `IStoreFeatureFlagEffectiveResolver`, so `effective` is the plain
// `override ?? default` and cannot see the deployment-wide `Growth:Enabled` config switch that the
// real gate ANDs underneath it. `effective === false` means the send WILL be refused; `effective ===
// true` means it MAY still be. The page says so on screen in `growth_gate_ready_caveat`, and this
// journey asserts that sentence rather than quietly treating ready as done.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip } = require('../support/flags');
const world = require('../fixture/world');

const MODULE_FLAG = 'growth.module';
const DISPATCH_FLAG = 'growth.dispatch';

/** The manager's own account address. A test send may go nowhere else. */
const OWN_ADDRESS = world.USERS[world.MANAGER_PHONE].email;

const BLOCK = {
  noAudience: 'Ingen målgruppe er beregnet, så det finnes ingen bekreftet liste over hvem som kan motta dette.',
  noContent: 'Dette nyhetsbrevet har ikke lagret innhold.',
  notApproved: 'Denne versjonen er ikke godkjent av et menneske.',
  moduleOff: 'Nyhetsbrevmodulen er slått av for denne butikken (growth.module), så utsendingsruten ' +
    'svarer ikke i det hele tatt. En plattformansvarlig må slå den på.',
  dispatchOff: 'Nødbryteren for utsendelse er slått av for denne butikken (growth.dispatch). ' +
    'Ingenting blir opprettet og ingenting blir sendt før den slås på igjen.'
};

/**
 * Every reason the gate is currently giving, in the order it renders them — unknowns first, then
 * blocks.
 *
 * Read as a SET and compared whole, never sampled with `toContainText`. The gate's whole job is that
 * nothing gets past it unchecked, so "one of the reasons I expected is present" is the wrong
 * question; "these are exactly the reasons" is the right one, and it is the only form in which a
 * reason quietly vanishing shows up.
 */
/**
 * One of the three panels, addressed by its OWN heading.
 *
 * Not `filter({ hasText })`: that is a case-insensitive substring match over the whole subtree, and
 * «Godkjenning» matches the draft panel too — its hidden-body warning ends «…så godkjenner du noe du
 * faktisk har sett». Two panels then resolve, and an assertion scoped to "the approval panel" is
 * quietly reading the draft's. Matching on the `h2` is the only form of this that names one panel.
 */
function panel (page, heading) {
  return page.locator('.growth-page__panel')
    .filter({ has: page.locator('h2.growth-page__panel-title', { hasText: heading }) });
}

async function reasons (page) {
  const rows = await page.locator('.growth-gate__reason').allTextContents();
  // The mark (`?` / `×`) is a sibling span inside the same li, so it is stripped rather than matched.
  return rows.map(text => text.replace(/\s+/g, ' ').replace(/^[?×]\s*/, '').trim());
}

test(
  'An operator drafts and approves a newsletter, and the send gate opens only when both switches are up',
  journeyDetails({
    journey: 'growth-newsletter-send-gate',
    surface: 'admin',
    capabilities: [
      'platform.feature-flags.write',
      'growth.consent.standing.read',
      'growth.audience.snapshot',
      'growth.newsletter.author',
      'growth.newsletter.test-send',
      'growth.newsletter.approve',
      'growth.send-gate.fail-closed'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in and open the newsletter screen', async () => {
      await page.goto('/admin/growth-newsletter');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/growth-newsletter' });
      await expect(page.locator('.growth-page__title')).toHaveText('Nyhetsbrev');
      // The whole screen renders. Growth's newsletter READS are not gated on the module flag — only
      // dispatch and the test send are — so a venue that has never switched Growth on can still open
      // this, read its consent standing and draft. That is why the gate below matters so much: the
      // page looks entirely usable.
      await expect(page.locator('.growth-page__blocker')).toHaveCount(0);
      await expect(page.locator('.growth-standing__title')).toHaveText('Samtykkestatus');
      return 'on /admin/growth-newsletter, no blocker';
    });

    await journey.step('the consent standing is the SERVER\'s four figures, not a total', async () => {
      // Four separate populations, and the difference between them is the module's subject. A screen
      // that showed one number would be unable to say whether an address that cannot be mailed is
      // suppressed, withdrawn or merely unconfirmed — and those are three different legal facts.
      const labels = (await page.locator('.growth-standing__figure dt').allTextContents()).map(t => t.trim());
      expect(labels).toEqual(['Samtykket', 'Trukket tilbake', 'Sperret', 'Venter på bekreftelse']);
      const figures = (await page.locator('.growth-standing__figure dd').allTextContents()).map(t => t.trim());
      expect(figures).toEqual(['214', '18', '7', '5']);
      return 'samtykket 214 · trukket 18 · sperret 7 · venter 5';
    });

    await journey.step('there is no gate yet, and there is no draft form either', async () => {
      // A GATE ABOUT NOTHING IS NOT A GATE. Everything from the test send down — including the send
      // gate itself — is inside a `v-if="detail"`, so an operator who has not written anything is not
      // shown a verdict about it. Asserting the gate's absence here is what makes its arrival below
      // an event rather than a coincidence.
      await expect(page.locator('.growth-gate')).toHaveCount(0);
      // ...and the draft form is withheld too, on a stated precondition rather than a blank panel: a
      // newsletter is BOUND to the audience it will be sent to, so it cannot be written before that
      // audience exists as a snapshot with an id.
      await expect(page.locator('.growth-page__hint')).toHaveText(
        'Beregn en målgruppe først. Et nyhetsbrev er bundet til målgruppen det skal sendes til, ' +
        'så det kan ikke skrives før den finnes.');
      return 'no gate, no draft form; the audience is the stated precondition';
    });

    await journey.step('compute the audience — and it is NOT the consent total', async () => {
      await expect(page.locator('.growth-audience__unknown')).toBeVisible();
      await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
      await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });

      // 209 RECEIVE, NOT THE 214 WHO CONSENTED. The snapshot excludes the addresses suppressed or
      // unconfirmed at the instant it was taken, and printing the consent total where the audience
      // belongs would quote a bigger number than the one that will actually be mailed — in the
      // permissive direction, which is a lawful-basis error rather than a display bug.
      await expect(page.locator('.growth-audience__figure--primary dd')).toHaveText('209');
      await expect(page.locator('.growth-audience__hash')).toHaveText('a91c4f7e20b8');
      return '209 will receive, 5 excluded, watermark a91c4f7e20b8';
    });

    await journey.step('write the newsletter', async () => {
      const draft = panel(page, 'Nyhetsbrevet');
      await draft.locator('input[type="text"]').fill('Sommermenyen er her');
      await draft.locator('textarea').first().fill('Vi har satt opp ny meny for sommeren. Velkommen innom.');
      await draft.getByRole('button', { name: 'Opprett utkast' }).click();

      await expect(page.locator('.growth-page__toast--success')).toContainText('Lagret', { timeout: 15000 });
      await expect(draft.locator('.growth-page__version')).toHaveText('Versjon 1');
      return 'version 1 saved';
    });

    await journey.step('THE FIRST STOP: the gate arrives closed, and both switches are named', async () => {
      await expect(page.locator('.growth-gate__badge')).toHaveText('Stoppet');
      // ASSERTED WHOLE. Three reasons and no more. If a future change dropped, say, the dispatch
      // reason, a `toContainText` on the module one would still be green and the kill switch would
      // have gone unmentioned on the screen whose only job is to mention it.
      expect(await reasons(page)).toEqual([
        BLOCK.notApproved,
        BLOCK.moduleOff,
        BLOCK.dispatchOff
      ]);
      // ...and there is a control to be blocked. Asserting only the refusal would pass on a page that
      // had no send button at all, which is a different product.
      const send = page.getByRole('button', { name: 'Send nyhetsbrev' });
      await expect(send).toBeVisible();
      await expect(send).toBeDisabled();
      return '3 reasons, both flags among them; the send button is drawn and disabled';
    });

    await journey.shot('the gate, closed on three counts');

    await journey.step('the module switch also closes the TEST route, and the panel says so', async () => {
      // The same `ModuleIsLiveAsync` guard sits on the test send, so with `growth.module` down there
      // is no way to see the newsletter either. This is where a real operator meets the switch first,
      // long before the gate — and the field is disabled rather than left live to fail, because a
      // test to your own address is a cheap thing to have refused in advance.
      const test = panel(page, 'Send deg selv en test');
      await expect(test.locator('.growth-page__hint')).toHaveText(
        'Nyhetsbrevmodulen er slått av for denne butikken (growth.module), så testruten svarer ikke. ' +
        'En plattformansvarlig må slå den på.');
      await expect(test.locator('input[type="email"]')).toBeDisabled();
      await expect(test.getByRole('button', { name: 'Send test' })).toBeDisabled();
      return 'test route closed by ' + MODULE_FLAG + ', input disabled';
    });

    await journey.step('right after a save the approval is informed, and the panel does not warn', async () => {
      const approval = panel(page, 'Godkjenning');
      await expect(approval.locator('.growth-page__badge')).toHaveText('Ikke godkjent');
      // NO WARNING HERE, and the absence is the claim rather than an oversight. The boxes on screen
      // ARE the version that was just written, so this one reviewer really has seen what they are
      // about to approve. The warning below is keyed on exactly that difference, and asserting its
      // absence now is what stops the assertion after the reopen from being vacuous.
      await expect(approval.locator('.growth-page__warn-body')).toHaveCount(0);
      return 'no unseen-body warning: the boxes are the version being approved';
    });

    await journey.step('approve it — and now ONLY the two switches are left', async () => {
      const approval = panel(page, 'Godkjenning');
      await approval.getByRole('button', { name: 'Godkjenn denne versjonen' }).click();
      await expect(approval.locator('.growth-page__badge')).toHaveText('Godkjent', { timeout: 15000 });
      // The button is not left live beside a granted approval.
      await expect(approval.getByRole('button', { name: 'Godkjenn denne versjonen' })).toBeDisabled();

      // THE SHARP ONE. Every input an operator controls is now satisfied, so the reason list is
      // exactly the two rows nobody at this venue can move. A gate that had stopped reading the flags
      // would be READY here, and the whole send would happen on a store that refuses it.
      expect(await reasons(page)).toEqual([BLOCK.moduleOff, BLOCK.dispatchOff]);
      await expect(page.getByRole('button', { name: 'Send nyhetsbrev' })).toBeDisabled();
      return 'approval Live; the only reasons left are ' + MODULE_FLAG + ' and ' + DISPATCH_FLAG;
    });

    await journey.shot('approved, and held by the switches alone');

    await journey.step('turn both Growth switches on from the operator switchboard', async () => {
      // THROUGH THE PRODUCT. This is the same route the gate reads — `GET /stores/{id}/feature-flags`
      // — so the switchboard's write and the gate's read meet on one row, which is what makes the
      // lever real rather than a value this journey handed the page.
      await turnOn(page, MODULE_FLAG);
      await turnOn(page, DISPATCH_FLAG);
      return 'both ' + MODULE_FLAG + ' and ' + DISPATCH_FLAG + ' on for store ' + world.STORE_ID;
    });

    await journey.step('come back to the newsletter', async () => {
      await page.goto('/admin/growth-newsletter');
      // The audience and the open newsletter are session state rather than anything the page stores,
      // so an operator returning picks both up again. Walked rather than worked around: this IS the
      // return path, and the newsletter has to still be there for the walk to mean anything.
      await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
      await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });
      await page.locator('.growth-page__select').selectOption({ index: 1 });
      const approval = panel(page, 'Godkjenning');
      await expect(approval.locator('.growth-page__badge')).toHaveText('Godkjent', { timeout: 15000 });

      // AND NOW THE PANEL ADMITS IT IS NOT INFORMED — the claim the plan says is worth showing a
      // colleague, and it only becomes true here. The detail read carries the subject and a
      // fingerprint of the content and NOT the body, so anybody arriving at a newsletter they did not
      // just type is looking at an approval screen that cannot show them what it is asking about.
      // Rather than implying the reviewer saw it, the screen says so and names the route that does.
      await expect(approval.locator('.growth-page__warn-body')).toHaveText(
        'Denne skjermen kan ikke vise innholdet i den lagrede versjonen. Send deg selv en test først, ' +
        'så godkjenner du noe du faktisk har sett.');
      return 'newsletter 1 reopened, still approved — and the screen states it cannot show the body';
    });

    await journey.step('a test send may only go to your own address', async () => {
      // Reachable at last, because the module switch is up. The test route is otherwise a way to mail
      // an arbitrary stranger from the venue's sending domain, so the server refuses any address but
      // the caller's own. Provoked before the success, so "refused" cannot be confused with
      // "already sent".
      const test = panel(page, 'Send deg selv en test');
      await expect(test.locator('.growth-page__hint')).toHaveCount(0);
      await test.locator('input[type="email"]').fill('noen.andre@example.test');
      await test.getByRole('button', { name: 'Send test' }).click();
      await expect(page.locator('.growth-page__toast--error')).toContainText(
        'En testsending kan bare gå til e-postadressen på din egen konto', { timeout: 15000 });
      return 'refused: growth.test_address_not_own';
    });

    await journey.step('send yourself the test, and read what the answer actually is', async () => {
      const test = panel(page, 'Send deg selv en test');
      await test.locator('input[type="email"]').fill(OWN_ADDRESS);
      await test.getByRole('button', { name: 'Send test' }).click();
      const toast = page.locator('.growth-page__toast--success');
      // A SUBMISSION STATUS, AND THE SENTENCE SAYS SO. The provider answering "Sent" means it took
      // the handoff; nothing here knows whether anything arrived, and a screen that shortened this to
      // "sent" would be claiming a delivery on the strength of an acknowledgement.
      await expect(toast).toContainText('Leverandøren svarte: Sent', { timeout: 15000 });
      await expect(toast).toContainText('Det er en innsendingsstatus, ikke en leveringsbekreftelse');
      return (await toast.textContent()).replace(/\s+/g, ' ').trim();
    });

    // ---- THE EXIT --------------------------------------------------------------------------------
    await journey.step('the gate opens — with everything checked, and one thing it cannot check', async () => {
      await expect(page.locator('.growth-gate__badge')).toHaveText('Vilkårene er oppfylt');
      // NO reasons at all. The empty list is the assertion; a gate that had gone green while still
      // holding a reason would be the defect this screen exists to prevent.
      expect(await reasons(page)).toEqual([]);
      // The recipient count is the SNAPSHOT's, never the consent standing's — 209, the number that
      // will actually be mailed.
      await expect(page.locator('.growth-gate__recipients strong')).toHaveText('209');
      // And the mail path is named, with the note that says what it is and is not.
      await expect(page.locator('.growth-gate__mail-list li').first()).toContainText('postmark');
      await expect(page.locator('.growth-gate__mail-domain')).toHaveText('post.fixturekafe.test');

      await expect(page.getByRole('button', { name: 'Send nyhetsbrev' })).toBeEnabled();

      // THE CAVEAT IS ASSERTED, not glossed. Ready means "nothing we can see refuses this", and the
      // page is explicit that the deployment-wide switch is invisible from here. A screen that
      // dropped this sentence would be promising something no endpoint can support.
      await expect(page.locator('.growth-gate__note').filter({ hasText: 'Growth:Enabled' })).toHaveText(
        'Alt vi kan kontrollere herfra er i orden. Én ting kan vi ikke se: den installasjonsomfattende ' +
        'bryteren Growth:Enabled rapporteres ikke av noe endepunkt, så en utsendelse kan fortsatt bli ' +
        'avvist av den.');
      return 'gate READY, 209 recipients, send enabled — and the caveat on screen';
    });

    await journey.shot('the gate, open');

    await journey.step('THE WALK STOPS HERE, deliberately, and this is why', async () => {
      // Not pressing it is the honest end of this journey rather than an omission. Against this
      // fixture a dispatch would prove that a fake accepted a POST, and against the deployment it
      // would prove nothing either: the mail provider interface is bound to a deterministic fake in
      // `Program.cs` and the transactional sender carries no SMTP dependency at all, so no newsletter
      // leaves any process on this branch. The gate turning green is the last thing here that is
      // true about the product.
      journey.finding('note',
        'the operator walk ends at the gate: nothing downstream of it can be shown to work',
        'Pressed, `POST .../dispatch` would answer from a fixture, and on the deployment it would ' +
        'hand off to the deterministic fake `Program.cs` binds the mail provider to — the code\'s own ' +
        'comment is that the anonymous subscribe endpoint is provably incapable of sending real mail ' +
        'until the provider is promoted (F-GROWTH-FAKE-MAIL). So no guest ever receives the ' +
        'double-opt-in mail, /subscribe/confirm is unreachable by a real guest, and FT-GROWTH\'s ' +
        'stated exit — subscribe, confirm, withdraw at the deployed origins — names four steps of ' +
        'which the first is the only one a person can complete. What IS now shown is the operator ' +
        'half in full: consent standing, a snapshot audience, a draft, a test send, a human approval ' +
        'pinned to a version, and a gate that fails closed on every input it cannot read.');
      return 'stopped at the gate, by choice; the mail path is a fake below this line';
    });

    await journey.step('put the kill switch back down, and the same gate closes', async () => {
      // THE MUTATION. Everything above would be equally green against a page that had stopped reading
      // the flags entirely, so the walk ends by moving one row back and watching the ready gate go
      // red. Nothing else changed: same newsletter, same approval, same audience.
      await page.goto('/admin/feature-flags');
      await flip(page, 'off', DISPATCH_FLAG);
      await page.goto('/admin/growth-newsletter');

      // The audience and the newsletter have to be picked up again — they are session state, not
      // stored on the page — which is itself the operator's real return path.
      await page.getByRole('button', { name: 'Beregn målgruppe' }).click();
      await expect(page.locator('.growth-audience__unknown')).toHaveCount(0, { timeout: 15000 });
      await page.locator('.growth-page__select').selectOption({ index: 1 });
      await expect(panel(page, 'Godkjenning').locator('.growth-page__badge'))
        .toHaveText('Godkjent', { timeout: 15000 });

      // EXACTLY ONE reason, and it is the switch. Not "at least one" — the approval and the content
      // are still in place, so any other reason appearing here would mean the flip had disturbed
      // something it has no business touching.
      expect(await reasons(page)).toEqual([BLOCK.dispatchOff]);
      await expect(page.locator('.growth-gate__badge')).toHaveText('Stoppet');
      await expect(page.getByRole('button', { name: 'Send nyhetsbrev' })).toBeDisabled();
      return 'one reason, the kill switch; send disabled again — the gate is real';
    });

    await journey.shot('the kill switch, back down');

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
      // The 403 is the foreign test address this journey provoked on purpose and asserted on
      // screen. Excluded BY THIS JOURNEY ONLY. It was a 400 until the fixture's test-send guard was
      // brought level with `RequireOwnAccountAddressAsync`, which forbids rather than rejects.
      const noise = /favicon|Download the Vue Devtools|status of 403/i;
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
        journey.finding('defect', 'browser error during the newsletter send-gate journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);

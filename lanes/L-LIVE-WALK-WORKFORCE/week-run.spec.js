// JOURNEY — a manager runs a week, and a worker sees it and confirms it.
//
// ---- WHY THIS EXISTS WHEN TWO WORKFORCE JOURNEYS ALREADY PUBLISH A WEEK -----------------------
//
// `workforce-schedule-publish` proves the manager's half (draft → shift → validate → publish) and
// `workforce-invitation-onboarding` proves a claimed worker can SEE a published shift. Neither has
// ever walked the last two feet of the week, and they could not have:
//
//   • `GET /workforce/me/inbox` (#34) answered a flat `{ items: [] }` in every fixture run ever made,
//     whatever had been published. `WorkforcePublicationNotice.vue` is `v-if="items && items.length"`,
//     so the notice rendered NOTHING, and the acknowledge button had no browser-reachable caller.
//   • `POST /workforce/me/publications/{id}/acknowledgements` (#44) was unrouted, so a press would
//     have 404'd as `FIXTURE_UNROUTED` even if the button had been on screen.
//
// So `pages/admin/workforce-me.vue:751` (`acknowledge`) and `me-client.js:136` were code no caller
// could reach in this harness — the exact shape of defect C3 exists for, and invisible to the 91 Jest
// suites because a component test of the notice mounts an items array the fixture could never produce.
// The fixture now derives that inbox from the PUBLISHED revisions, the same way #33 already derived
// the worker's shifts, so the item on the worker's screen exists only because the manager published.
//
// ---- THE REFUSALS COME FIRST, DELIBERATELY ----------------------------------------------------
//
// A week that only ever goes green proves an exit code. Three refusals are provoked BEFORE their
// successes, and each is a thing a real venue hits on a real Monday:
//
//   R1  an anonymous visitor is bounced off the schedule and carries where they were going;
//   R2  the manager presses "Opprett utkast" with `workforce.publication` STILL OFF and is refused
//       read-only by the §9.2 kill switch. Both existing journeys flip that switch first, so the
//       refusal they exist downstream of has never been observed on screen by anything;
//   R3  the worker opens the manager's schedule page and is refused it.
//
// R2 is the one worth the most: `workforce.publication` is deny-closed and gates all four schedule
// writes, so EVERY venue meets this screen before it ever publishes anything, and until now the only
// evidence that it says something useful was a component test.
//
// ---- WHAT THIS WALK FOUND, AND WHAT IT NOW PINS -----------------------------------------------
//
// The first recorded run of this journey found that pressing "Bekreft mottatt" showed the worker
// NOTHING: the receipt was stored and the notice around it disappeared in the same tick. Two steps
// asserted that absence on purpose, so that repairing it would red this walk. It has been repaired,
// and those two steps now assert the receipt IS on screen and that the replay is reachable.
//
// A third step asserted a second absence: the receipt did not survive a REFRESH, because it lived
// only in page state. That has been repaired too — #34 now projects the recipient row's
// `AcknowledgedAtUtc` — and the step asserts the confirmation is still on screen afterwards.
//
// The mechanism and the reasoning are kept in place at each step rather than deleted — a journey that
// quietly stopped mentioning a defect would lose the record of what was once wrong.
//
// ---- WHAT THIS IS NOT -------------------------------------------------------------------------
//
// A browser record against the throwaway fixture, not acceptance (C5). Nobody has walked it by hand.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

const MANAGER = { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED' };
// `user-worker` / Ola Ansatt, seeded holding `staff-1` in `state.claims`, so this journey signs the
// worker in directly rather than re-walking the invitation claim that
// `workforce-invitation-onboarding` already owns. The shift below is staffed to Ola BY NAME for that
// reason: the worker's screen at the end must be a wire-through of this run's own publish.
const WORKER = { phone: '90000001', code: 'AppSettings__DemoVerificationCode__REDACTED' };

const PUBLICATION_FLAG = 'workforce.publication';

/**
 * Put the browser back to a signed-out state without restarting the context.
 *
 * Borrowed verbatim from `workforce-invitation-onboarding`, and load-bearing for the same reason: the
 * Vuex store persists itself to `localStorage` and restores synchronously on boot, so clearing that
 * key and reloading is what actually signs somebody out. Two accounts use one page here, and a
 * journey that skipped this would have the worker acknowledging under the MANAGER's bearer token —
 * which would make the receipt name the wrong person and is the one thing that must not silently work.
 */
async function signOut (page) {
  await page.goto('/');
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await page.context().clearCookies();
}

test(
  'A manager plans and publishes a week; the worker sees it and confirms it',
  journeyDetails({
    journey: 'workforce-week-run',
    surface: 'admin',
    capabilities: [
      'workforce.schedule.draft',
      'workforce.schedule.publish',
      'workforce.flag.read-only-refusal',
      'workforce.me.schedule',
      'workforce.me.inbox',
      'workforce.me.publication-acknowledge'
    ]
  }),
  async ({ page, journey }) => {
    // ---- the manager's half ---------------------------------------------------------------------

    await journey.step('R1 · an anonymous visitor is refused the schedule', async () => {
      await page.goto('/admin/workforce-schedule');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      // The destination is CARRIED rather than dropped, which is what makes the bounce a redirect
      // instead of a dead end.
      const redirect = new URL(page.url()).searchParams.get('redirect');
      expect(redirect).toContain('/admin/workforce-schedule');
      return 'bounced to /admin, redirect=' + redirect;
    });

    await journey.step('sign in as the manager (99999999)', async () => {
      await signIn(page, Object.assign({ expectPath: '/admin/workforce-schedule' }, MANAGER));
      await expect(page.locator('.wf-page__title')).toHaveText('Vaktplan', { timeout: 30000 });
      return 'landed on /admin/workforce-schedule';
    });

    // R2 — THE REFUSAL BEFORE THE SUCCESS.
    //
    // `workforce.publication` is deny-closed, so this is the state EVERY venue is in before anybody
    // turns it on. The two existing workforce journeys flip it as their first act, which means the
    // screen a manager actually meets first has never been looked at by anything but a unit test.
    await journey.step('R2 · creating the draft is refused while the switch is off', async () => {
      // The button is OFFERED — the page cannot know the answer without asking, and §9.2 gates the
      // WRITE, not the read. That it is offered and then refused is the honest shape; a page that
      // hid it would be guessing.
      const create = page.getByRole('button', { name: 'Opprett utkast' });
      await expect(create).toBeVisible({ timeout: 15000 });
      await create.click();

      const conflict = page.locator('.wf-page__conflict');
      await expect(conflict).toBeVisible({ timeout: 15000 });
      // The refusal NAMES THE SWITCH. A bare "something went wrong" would send a manager to support;
      // the flag key is what makes it self-service.
      await expect(conflict).toContainText('skrivebeskyttet');
      await expect(conflict).toContainText(PUBLICATION_FLAG);
      // ...and it links to the lever, rather than describing it.
      await expect(conflict.locator('a')).toHaveAttribute('href', '/admin/feature-flags');

      // The refusal did not half-succeed: no revision was created behind it.
      await expect(page.locator('.wf-page__badge')).toHaveText('Ingen plan');
      return (await conflict.textContent()).replace(/\s+/g, ' ').trim().slice(0, 130) + '…';
    });

    await journey.shot('the week refused while the switch is off');

    await journey.step('turn the publication switch on, through the operator page', async () => {
      // The lever a venue pulls, not a fixture backdoor — and the badge is re-read from the write
      // RESPONSE, so "På" is the server's answer rather than the click's.
      await turnOn(page, PUBLICATION_FLAG);
      return PUBLICATION_FLAG + ' now reads På for this store';
    });

    await journey.step('create the draft, now that it is allowed', async () => {
      await page.goto('/admin/workforce-schedule');
      await expect(page.locator('.wf-page__title')).toBeVisible({ timeout: 30000 });
      await page.getByRole('button', { name: 'Opprett utkast' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Utkast opprettet', { timeout: 15000 });
      await expect(page.locator('.wf-page__badge')).toHaveText('Utkast');
      // The conflict banner is GONE, not merely covered — the same page that refused now authors.
      await expect(page.locator('.wf-page__conflict')).toHaveCount(0);
      return (await page.locator('.wf-page__meta').first().textContent()).trim();
    });

    await journey.step('staff a shift to Ola Ansatt by name', async () => {
      // BY NAME, because the last three steps of this journey are about what OLA sees. A shift on
      // whichever row happened to be first would leave the worker's screen proving nothing about
      // this run's publish.
      const row = page.locator('.wf-grid__row', { hasText: 'Ola Ansatt' });
      await expect(row).toBeVisible({ timeout: 15000 });
      await row.locator('.wf-grid__add').first().click();

      const editor = page.locator('.wf-editor');
      await expect(editor).toBeVisible();
      await editor.locator('input[type="time"]').first().fill('07:00');
      await editor.locator('input[type="time"]').nth(1).fill('15:00');
      await editor.getByRole('button', { name: 'Lagre vakt' }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Vakten er lagt inn', { timeout: 15000 });

      const shift = page.locator('.wf-grid__shift').first();
      await expect(shift).toBeVisible();
      return 'Ola Ansatt 07:00–15:00, ' +
        (await shift.locator('.wf-grid__shift-time').textContent()).trim();
    });

    await journey.step('validate and publish the week', async () => {
      await page.getByRole('button', { name: 'Valider' }).click();
      await expect(page.locator('.wf-page__badge')).toHaveText('Validert', { timeout: 15000 });

      // `exact` matters: the view switcher's "Publisert" tab is also a button.
      await page.getByRole('button', { name: 'Publiser', exact: true }).click();
      await expect(page.locator('.wf-page__toast')).toContainText('Publisert til', { timeout: 15000 });
      const toast = (await page.locator('.wf-page__toast').textContent()).trim();
      await expect(page.locator('.wf-page__badge')).toHaveText('Publisert');
      // The recipient count in that toast is the SERVER's number, and it is the last thing the
      // manager is told about who this reached. See the finding at the end of this journey.
      return toast;
    });

    await journey.shot('the published week');

    // ---- the worker's half -----------------------------------------------------------------------

    await journey.step('R3 · the worker is refused the manager\'s schedule page', async () => {
      await signOut(page);
      await page.goto('/admin/workforce-schedule');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, WORKER);

      // Ola administers no store (`adminIn: []`, which is the POSITIVE answer "administers none"),
      // so the shell resolves ACCESS_WORKER and this page is not theirs. Asserted as "the authoring
      // surface is not on screen" rather than by URL alone, because a page that rendered the grid
      // and merely failed its writes would satisfy a URL check.
      await expect(page.locator('.wf-grid')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Opprett utkast' })).toHaveCount(0);
      return 'worker landed on ' + new URL(page.url()).pathname + ' without the authoring surface';
    });

    await journey.step('the worker sees the shift the manager just published', async () => {
      await page.goto('/admin/workforce-me');
      await expect(page.locator('.wfme__title')).toBeVisible({ timeout: 30000 });
      // NOT the "you hold no engagement" screen.
      await expect(page.locator('.wfme__blocker')).toHaveCount(0);

      const card = page.locator('.wfme__list li').first();
      await expect(card).toBeVisible({ timeout: 15000 });
      const text = (await card.textContent()).replace(/\s+/g, ' ').trim();
      // The wall clock the manager typed, arriving through `/workforce/me/schedule` — which the
      // fixture derives from PUBLISHED revisions only, so a draft could not have produced this.
      expect(text).toContain('07:00');
      return 'first shift card: ' + text.slice(0, 90);
    });

    await journey.step('the publication notice is on the worker\'s screen at all', async () => {
      // THE STEP THAT COULD NOT HAVE PASSED BEFORE THIS LANE. `unreadPublicationItems` comes from
      // `GET /workforce/me/inbox`, which answered `{ items: [] }` unconditionally, so this section
      // has been `v-if`'d out of existence in every fixture run ever recorded.
      const notice = page.locator('.wfme-pub');
      await expect(notice).toBeVisible({ timeout: 15000 });
      const items = notice.locator('.wfme-pub__item');
      await expect(items).toHaveCount(1);

      // The disclaimer is asserted rather than assumed: the backend is explicit that an
      // acknowledgement is informational and NOT legal acceptance of a roster, and the worker is
      // told that in the same breath as being asked to press the button.
      await expect(notice.locator('.wfme-pub__disclaimer')).toBeVisible();

      // Nothing claims "bekreftet" before anything was acknowledged. The row carries `isRead` and a
      // null `acknowledgedAtUtc`, and rendering the one from the other is the confusion
      // `inbox-filter.js` forbids.
      await expect(notice.locator('.wfme-pub__receipt')).toHaveCount(0);
      return '1 unread publication, disclaimer shown, no receipt yet';
    });

    await journey.shot('the worker sees the published week and is asked to confirm');

    await journey.step('the worker confirms, and the server records it', async () => {
      // The WIRE is the assertion here, not a rendered receipt — see the next step for why there is
      // no rendered receipt to assert. Watching the response is what makes this step evidence that
      // #44 was actually reached rather than that a button was clickable.
      const [response] = await Promise.all([
        page.waitForResponse(r =>
          /\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
          r.request().method() === 'POST', { timeout: 20000 }),
        page.locator('.wfme-pub__item .wfme-pub__btn:not(.wfme-pub__btn--ghost)').first().click()
      ]);

      expect(response.status()).toBe(200);
      const receipt = await response.json();
      // A FIRST acknowledgement, carrying the instant it happened. `alreadyAcknowledged: false` is
      // what distinguishes the act from the replay, and it is the server's word, not the page's.
      expect(receipt.alreadyAcknowledged).toBe(false);
      expect(receipt.occurredAtUtc).toBeTruthy();
      expect(receipt.schedulePublicationId).toBeTruthy();
      return 'POST …/acknowledgements → 200, occurredAtUtc ' + receipt.occurredAtUtc +
        ', alreadyAcknowledged=false';
    });

    // ---- THE DEFECT THIS WALK FOUND, NOW ASSERTED THE OTHER WAY ROUND ----------------------------
    //
    // WHAT THIS STEP USED TO PIN. On the run that recorded this journey, the worker pressed "Bekreft
    // mottatt" and the entire notice — heading, row, and the receipt line computed from the response
    // one tick earlier — DISAPPEARED, with no toast and nothing else anywhere on the page. This step
    // asserted that absence, deliberately, so that repairing it would red the walk and somebody would
    // have to change the claim on purpose. This is that change.
    //
    // THE MECHANISM, because it is worth keeping. `acknowledge()` stored the receipt in `ackReceipts`
    // and then reloaded the inbox; acknowledging implies seen, so the row came back `isRead: true`,
    // `unreadPublications()` dropped it, and the section was `v-if`'d away. The receipt line could
    // therefore only ever render for a row that was BOTH unread and acknowledged — a state the
    // product cannot produce, because the act that fills `receipts` is the act that makes the row
    // read. No template change could have fixed that; the repair is in what the page FEEDS the
    // notice (`publicationsForNotice`, utils/workforce-me/inbox-filter.js), which now keeps the
    // acknowledged row and the receipt with it.
    //
    // A component test could not have seen any of it. It hands the component `items` and `receipts`
    // as props and controls both, so it mounts the one combination the running product never
    // produced. That is why this lives in a journey, and why C5 asks for a walk rather than a suite.
    await journey.step('...and the receipt is on screen, naming when it happened', async () => {
      const notice = page.locator('.wfme-pub');
      await expect(notice).toBeVisible({ timeout: 15000 });

      const receipt = notice.locator('.wfme-pub__receipt');
      await expect(receipt).toHaveCount(1);
      await expect(receipt).toBeVisible();
      // The FIRST acknowledgement's wording, not the replay's, and carrying a clock — a receipt that
      // did not say when would not be a receipt.
      await expect(receipt).toContainText('Bekreftet mottatt');
      const receiptText = (await receipt.textContent()).replace(/\s+/g, ' ').trim();
      expect(receiptText).toMatch(/\d{2}:\d{2}/);

      // The row survives, and stops announcing itself as new: nothing here is unread any more, so
      // the heading names what happened and the "you have not opened this yet" lede is gone.
      await expect(notice.locator('.wfme-pub__item')).toHaveCount(1);
      await expect(notice.locator('.wfme-pub__title')).toHaveText('Vaktplanen er bekreftet');
      await expect(notice.locator('.wfme-pub__lede')).toHaveCount(0);
      // Still not called approval of the shifts — the disclaimer is on screen with the receipt.
      await expect(notice.locator('.wfme-pub__disclaimer')).toBeVisible();
      return 'receipt on screen: ' + receiptText;
    });

    await journey.shot('after confirming, the receipt is on screen');

    await journey.step('the idempotent replay is reachable, and says it is a replay', async () => {
      // #44 answers `alreadyAcknowledged: true` with the ORIGINAL instant, so a worker who presses
      // again on a flaky connection is told "allerede bekreftet 09:14" rather than handed a fresh
      // receipt for an act they performed once. `receiptLabel` has a string for it —
      // `wfme_pub_receipt_already` — and until the row stopped vanishing, neither the second press
      // nor that string had any caller a browser could reach.
      const acknowledge = page.locator('.wfme-pub__item .wfme-pub__btn:not(.wfme-pub__btn--ghost)');
      await expect(acknowledge).toHaveCount(1);

      const [response] = await Promise.all([
        page.waitForResponse(r =>
          /\/workforce\/me\/publications\/[^/]+\/acknowledgements$/.test(r.url()) &&
          r.request().method() === 'POST', { timeout: 20000 }),
        acknowledge.first().click()
      ]);
      expect(response.status()).toBe(200);
      const replay = await response.json();
      // The SERVER's word that this was the replay and not a second act.
      expect(replay.alreadyAcknowledged).toBe(true);
      await expect(page.locator('.wfme-pub__receipt')).toContainText('Allerede bekreftet');

      return 'replay reached #44 with alreadyAcknowledged=true';
    });

    // ---- THE SECOND DEFECT THIS WALK FOUND, ALSO NOW ASSERTED THE OTHER WAY ROUND ----------------
    //
    // WHAT THIS STEP USED TO PIN. `await expect(page.locator('.wfme-pub')).toHaveCount(0)` — the
    // whole notice was gone after a refresh, and the walk carried a `gap` finding saying an
    // acknowledgement could not be re-read. The receipt lived only in page state (`ackReceipts` /
    // `ackItems`), because nothing gave it back: `GET /workforce/me/inbox` carried `isRead` and no
    // acknowledgement field, and #44 has no GET sibling. A worker who confirmed on Monday and opened
    // the page on Tuesday had no way to see what they had confirmed, or when.
    //
    // THE REPAIR IS ONE COLUMN. The recipient row that #34 already loads per publication carries
    // `AcknowledgedAtUtc` alongside the `SeenAtUtc` the read was already taking; the projection now
    // carries it too, `publicationsForNotice` keeps a row the SERVER reports as acknowledged, and the
    // notice renders the receipt from the row when it holds none of its own. Nothing new is written:
    // the confirm has always written this column.
    //
    // WHAT IT IS NOT. This is UI state, not the worker's evidence copy. The append-only
    // `WorkforceSchedulePublicationReceipts` row — the one an inspector would be shown — is still
    // read back by no endpoint on any surface. See the step below.
    await journey.step('and the confirmation is still there after a refresh', async () => {
      await page.reload();
      await expect(page.locator('.wfme__title')).toBeVisible({ timeout: 30000 });

      const notice = page.locator('.wfme-pub');
      await expect(notice).toBeVisible({ timeout: 15000 });
      const receipt = notice.locator('.wfme-pub__receipt');
      await expect(receipt).toHaveCount(1);
      // The RELOAD's wording. There is no "new" to report on a read — every row that carries an
      // instant was confirmed on an earlier tick — so a page holding no receipt of its own says
      // "already", from the row's own column rather than from a response it watched arrive.
      await expect(receipt).toContainText('Allerede bekreftet');
      const receiptText = (await receipt.textContent()).replace(/\s+/g, ' ').trim();
      expect(receiptText).toMatch(/\d{2}:\d{2}/);

      // Still a confirmed week rather than a new one, and still not called an approval of the shifts.
      await expect(notice.locator('.wfme-pub__title')).toHaveText('Vaktplanen er bekreftet');
      await expect(notice.locator('.wfme-pub__lede')).toHaveCount(0);
      await expect(notice.locator('.wfme-pub__disclaimer')).toBeVisible();

      journey.finding(
        'gap',
        'the worker still has no evidence-grade copy of their acknowledgement',
        'What survives the reload is the recipient row\'s mutable `acknowledgedAtUtc`, which is UI ' +
        'state. The append-only `WorkforceSchedulePublicationReceipts` row — the artifact an ' +
        'inspector or a dispute would be shown — is written by one code path and read back by no ' +
        'endpoint on any surface, worker or manager. Reopening this needs a GET over the receipts ' +
        'table, which first needs its natural-key unique index (MIG-21) or a de-duplicating read.'
      );
      return 'after reload: ' + receiptText;
    });

    await journey.shot('the confirmation survives a reload');

    await journey.step('the shift itself is still there, so this is not a blank page', async () => {
      // The reloaded page is a real page, not a failed load: the roster the week was about is still
      // on screen and still says 07:00.
      const card = page.locator('.wfme__list li').first();
      await expect(card).toBeVisible({ timeout: 15000 });
      const text = (await card.textContent()).replace(/\s+/g, ' ').trim();
      expect(text).toContain('07:00');
      return 'shift card still shown: ' + text.slice(0, 70);
    });

    await journey.step('what the week could NOT tell anybody', () => {
      // RECORDED AS A FINDING, NOT ASSERTED — the flow completed, so failing here would claim the
      // capability is broken, which is false. But a manager who publishes a roster and needs to know
      // who has seen it has no way to find out: the frontend binds no recipient read at all. The
      // ONLY number they are ever shown is `recipientCount` in the publish toast, which is how many
      // people it was SENT to at the instant of publishing — not how many read or confirmed it. The
      // worker's acknowledgement therefore lands in a place nobody in this product can look at.
      journey.finding(
        'gap',
        'a manager cannot see who acknowledged a published week',
        'The worker acknowledgement (#44) is written and receipted on the worker\'s own screen, but ' +
        'no manager-facing read of publication recipients is bound in the frontend — ' +
        '`utils/workforce/schedule-client.js` binds `GetPublicationHistory` and no recipient list. ' +
        'The publish toast\'s `recipientCount` is a send-time count and is not evidence of receipt. ' +
        'A venue that must show it rostered someone cannot produce that from this UI.'
      );

      const noise = /favicon|Download the Vue Devtools/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      for (const error of errors) {
        journey.finding('defect', 'browser error during the week run', error);
      }
      return errors.length ? errors.length + ' browser errors recorded as findings' : 'no browser errors';
    });
  }
);

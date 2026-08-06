// JOURNEY — a person clocks in and out at the register, and appears on the personnel list.
//
// THE GAP THIS EXISTS TO CLOSE. `POST /workforce/pos/clock-events` has been registered, routed and
// reachable over HTTP for the whole of this module's life, and until this run NO SCREEN IN THE REPO
// CALLED IT. Attendance, variance and the personnel list all read a table that nothing could write
// from a screen: the backend's own demo says so out loud, refusing to stand the register up and
// inserting the two rows by raw SQL instead. So the register printed blank in the seeded world not
// because of a rendering bug but because the write did not exist — and every workforce capability
// that reads a punch was green in the suite while no human could produce one.
//
// A second absence had to close first: the fixture served NO POS endpoint at all — no cash point, no
// operator, no operator session — so `/admin/pos` could not be opened by a browser journey whatever
// the clock did. `fixture/workforce-punch.js` stands the register up.
//
// WHAT A GREEN RUN PROVES, beyond "the page renders":
//
//   • A person reaches the clock by CLICKING it in the register's own top bar. The endpoint needs a
//     device JWT and an `X-Operator-Session`; the POS shell is the only place in this app that holds
//     one, which is why the screen is here and could not have been an admin page.
//   • The store starts deny-closed. `workforce.clock` is off by default with no grandfather probe,
//     so the FIRST press is refused — and the refusal names the manual fallback rather than looking
//     broken. The journey then pulls the real lever on the operator switchboard, not a fixture flag.
//   • Clocking in puts the person on the personnel list with an open window, and clocking out puts
//     the END TIME on it. The end time is the thing the whole register exists to record.
//   • BOTH HALVES OF THE PAIR, AND THE REFUSALS. Clocking in twice is refused. Clocking out with
//     nothing open is NOT refused — it answers 200 with `sessionState: "Open"` — and the screen still
//     does not say "clocked in". An operator with no engagement is refused and told who can fix it.
//   • It is driven at 1280×800. A control that a neighbouring element covers is not clickable, and
//     Playwright's actionability check is what makes a click evidence rather than a function call.
//
// WHY THE RELOADS. After a successful punch the screen narrows to the one honest action, so the
// wrong button is not there to press — which is the product working. Reloading returns the register
// to the state it is genuinely in when a worker walks up to a till somebody else left: it knows
// nothing, offers both, and the SERVER is the authority. That is the only honest way to provoke
// these two refusals through the UI, and it is a real user path rather than a contrivance.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn } = require('../support/flags');

// The only platform PowerUser in this world, and the POS page is power-user gated.
const REGISTER_USER = { phone: '90000003', code: '123123' };

const CLOCK_FLAG = 'workforce.clock';

const LINKED_OPERATOR = 'Kari Nordmann';
const UNLINKED_OPERATOR = 'Ola Hansen';

/**
 * Enters a PIN on a POS numpad, digit by digit as a person does.
 *
 * By ROLE and exact accessible name rather than by class: the pad's key renders its label through a
 * `<template>`, so the element's raw text carries the template's newlines and a `/^1$/` against it
 * matches nothing. The accessible name is normalised and is also what a person actually reads.
 */
async function enterPin (scope, pin) {
  for (const digit of String(pin)) {
    await scope.getByRole('button', { name: digit, exact: true }).click();
  }
}

/** Signs the operator in on the register's own PIN pad. */
async function operatorLogin (page, name, pin) {
  const screen = page.locator('.op-login');
  await expect(screen).toBeVisible({ timeout: 30000 });
  await screen.locator('.op-login__operator', { hasText: name }).click();
  await enterPin(screen, pin);
  // The fourth digit submits; the top bar only renders once the shell holds a session.
  await expect(page.locator('.pos-topbar')).toBeVisible({ timeout: 30000 });
}

/** Opens the register and reaches the clock by pressing the top bar entry. */
async function openClock (page) {
  await page.locator('.pos-topbar__mode', { hasText: 'Stempling' }).click();
  await expect(page.locator('.posclk')).toBeVisible({ timeout: 15000 });
}

test(
  'A person clocks in and out at the register, and the personnel list carries both times',
  journeyDetails({
    journey: 'workforce-pos-punch',
    surface: 'admin',
    capabilities: [
      'workforce.pos.clock-in',
      'workforce.pos.clock-out',
      'workforce.pos.clock-refusal',
      'workforce.pos.personnel-list'
    ]
  }),
  async ({ page, journey }) => {
    // A real laptop, not a phone and not a 1920 desktop: a sibling lane found a control unclickable
    // at exactly this width because a table escaped its grid track and the neighbour won the hit test.
    await page.setViewportSize({ width: 1280, height: 800 });

    await journey.step('sign in and open the register', async () => {
      await page.goto('/admin/pos');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, Object.assign({ expectPath: '/admin/pos' }, REGISTER_USER));
      await expect(page.locator('.op-login')).toBeVisible({ timeout: 30000 });
      return 'the register booted to its operator sign-in';
    });

    await journey.step('the operator signs in on the PIN pad', async () => {
      await operatorLogin(page, LINKED_OPERATOR, '1234');
      return 'operator session held by the shell';
    });

    await journey.step('the clock is reachable from the register top bar', async () => {
      // The wire that makes this a capability rather than a component: a screen no navigation
      // surface links to is not reachable, whatever its tests say.
      const entry = page.locator('.pos-topbar__mode', { hasText: 'Stempling' });
      await expect(entry).toBeVisible();
      await openClock(page);
      return 'pressed Stempling in the top bar';
    });

    await journey.shot('the clock, before anything is punched');

    await journey.step('the register is empty, and both halves of the pair are offered', async () => {
      // Nothing is known about this person yet, so the screen does not pretend: both are live.
      await expect(page.locator('.posclk__btn--in')).toBeEnabled();
      await expect(page.locator('.posclk__btn--out')).toBeEnabled();
      await expect(page.locator('.posclk__list-state')).toContainText('Ingen stemplinger');
      return 'no punches yet; clock in and clock out both offered';
    });

    // ---- the deny-closed store -------------------------------------------------------------------

    await journey.step('the first press is refused: the store has not switched clocking on', async () => {
      await page.locator('.posclk__btn--in').click();
      const error = page.locator('.posclk__error');
      await expect(error).toBeVisible({ timeout: 15000 });
      const text = (await error.textContent()).trim();
      // Named fallback, not a dead end: the person is told to write the time down and tell a manager.
      expect(text).toContain('slått av');
      expect(text).toContain('Skriv ned tiden');
      // Nothing was recorded, so the register below is untouched.
      await expect(page.locator('.posclk__list-state')).toContainText('Ingen stemplinger');
      return text;
    });

    await journey.shot('the refusal a store meets out of the box');

    await journey.step('a manager pulls the real lever on the switchboard', async () => {
      // Through the page, not a fetch and not a fixture helper: `/admin/feature-flags` is the only
      // caller of that route in the product, so pressing its button is what makes the switch a
      // capability rather than a curl.
      await turnOn(page, CLOCK_FLAG);
      return CLOCK_FLAG + ' is now På for this store';
    });

    // ---- clocking in -----------------------------------------------------------------------------

    await journey.step('back at the register, the person clocks in', async () => {
      await page.goto('/admin/pos');
      await expect(page.locator('.pos-topbar')).toBeVisible({ timeout: 30000 });
      await openClock(page);

      await page.locator('.posclk__btn--in').click();
      await expect(page.locator('.posclk__notice')).toContainText('Stemplet inn', { timeout: 15000 });
      await expect(page.locator('.posclk__state')).toHaveText('Stemplet inn');
      return (await page.locator('.posclk__notice').textContent()).trim();
    });

    await journey.step('the punch is on the personnel list, with an open window', async () => {
      const row = page.locator('.posclk__row', { hasText: LINKED_OPERATOR });
      await expect(row).toBeVisible({ timeout: 15000 });
      // Present, so there is a start time and deliberately no end time yet.
      await expect(row.locator('.posclk__still-in')).toBeVisible();
      await expect(page.locator('.posclk__list-count')).toContainText('1');
      return (await row.textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.shot('clocked in, and on the personnel list');

    await journey.step('having clocked in, the wrong button is not there to press', async () => {
      await expect(page.locator('.posclk__btn--in')).toBeDisabled();
      await expect(page.locator('.posclk__btn--out')).toBeEnabled();
      return 'clock in disabled, clock out offered';
    });

    // ---- the refusal a reloaded till can still reach ---------------------------------------------

    await journey.step('clocking in twice is refused, and the screen learns the truth', async () => {
      // A till that was reloaded knows nothing and offers both; the server is the authority.
      await page.reload();
      await expect(page.locator('.pos-topbar')).toBeVisible({ timeout: 30000 });
      await openClock(page);
      await expect(page.locator('.posclk__btn--in')).toBeEnabled();

      await page.locator('.posclk__btn--in').click();
      const error = page.locator('.posclk__error');
      await expect(error).toBeVisible({ timeout: 15000 });
      const text = (await error.textContent()).trim();
      expect(text).toContain('allerede stemplet inn');
      // The refusal taught it the state it was missing, so the pair has narrowed again.
      await expect(page.locator('.posclk__state')).toHaveText('Stemplet inn');
      await expect(page.locator('.posclk__btn--in')).toBeDisabled();
      return text;
    });

    // ---- clocking out ----------------------------------------------------------------------------

    await journey.step('the person clocks out, and the window gets its end time', async () => {
      await page.locator('.posclk__btn--out').click();
      await expect(page.locator('.posclk__notice')).toContainText('Stemplet ut', { timeout: 15000 });
      await expect(page.locator('.posclk__state')).toHaveText('Stemplet ut');

      // The completed window STAYS on the day's register — a person who has left is still on it,
      // which is the whole point of recording an end time — and now carries both times.
      const row = page.locator('.posclk__row', { hasText: LINKED_OPERATOR });
      await expect(row).toBeVisible();
      await expect(row.locator('.posclk__still-in')).toHaveCount(0);
      const cells = await row.locator('.posclk__cell').allTextContents();
      const times = cells.map(c => c.trim()).filter(c => /^\d{2}:\d{2}$/.test(c));
      expect(times.length).toBe(2);
      await expect(page.locator('.posclk__list-count')).toContainText('0');
      return 'on site ' + times[0] + '–' + times[1];
    });

    await journey.shot('clocked out, with both times on the register');

    // ---- THE ONE THAT LOOKS LIKE SUCCESS ---------------------------------------------------------

    await journey.step('clocking out with nothing open never reads as clocked in', async () => {
      // The backend answers this 200, `accepted: true`, `clockSessionId: null` — and
      // `sessionState: "Open"`, because that field is derived from `closedUtc` alone and a fold that
      // moved nothing never set one. A register bound to `sessionState` would flip to "Stemplet inn"
      // at the exact moment somebody pressed Stemple ut, and the person would walk away believing
      // they had clocked out with no end time recorded anywhere.
      await page.reload();
      await expect(page.locator('.pos-topbar')).toBeVisible({ timeout: 30000 });
      await openClock(page);
      await expect(page.locator('.posclk__btn--out')).toBeEnabled();

      await page.locator('.posclk__btn--out').click();
      const notice = page.locator('.posclk__notice');
      await expect(notice).toBeVisible({ timeout: 15000 });
      const text = (await notice.textContent()).trim();
      expect(text).toContain('ingen åpen økt');

      // The assertion this whole lane turns on.
      await expect(page.locator('.posclk__state')).not.toHaveText('Stemplet inn');
      // Recorded, so not an error: the punch is on the append-only record either way.
      await expect(page.locator('.posclk__error')).toHaveCount(0);
      return text;
    });

    await journey.shot('a clock-out with nothing open, told honestly');

    // ---- a person with no engagement -------------------------------------------------------------

    await journey.step('an operator nobody linked is refused, and told who can fix it', async () => {
      // The operator login never clocks: the staff identity is reached only through a
      // manager-reviewed link, and an unlinked operator is a 403 however valid their session is.
      await page.locator('.pos-topbar__operator').click();
      const pad = page.locator('.pinpad');
      await expect(pad).toBeVisible({ timeout: 15000 });
      await pad.locator('.pinpad__operator', { hasText: UNLINKED_OPERATOR }).click();
      await enterPin(pad, '4321');
      await expect(page.locator('.pos-topbar__op-name')).toContainText(UNLINKED_OPERATOR, { timeout: 15000 });

      await openClock(page);
      await page.locator('.posclk__btn--in').click();
      const error = page.locator('.posclk__error');
      await expect(error).toBeVisible({ timeout: 15000 });
      const text = (await error.textContent()).trim();
      expect(text).toContain('ikke koblet til en ansatt');
      return text;
    });

    await journey.shot('an unlinked operator, refused');
  }
);

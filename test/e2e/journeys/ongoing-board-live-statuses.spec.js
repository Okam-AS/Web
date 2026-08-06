// JOURNEY — the venue's operating board, and the order it used to lose.
//
// `/admin/ongoing` is the screen a kitchen actually works from. It bucketed its three columns with
// three hand-written status lists — `Accepted`, `Processing`, and `['ReadyForPickup',
// 'ReadyForDriver', 'Served']` — and `OrderStatus` has nine members. Two of the seven a live order
// can hold, `DriverPickedUp` and `OpenCheck`, were in none of those lists.
//
// An order in either state was FETCHED by `GetAllOngoing()`, assigned to `this.orders`, and then
// rendered by nothing. Not in a column, not in a count badge, and — because `Fullfør` is a button on
// the card — not closable from this screen. `DriverPickedUp` is not an edge case: the app labels it
// "Sjåføren er på vei" and `/admin/orders` filters on it.
//
// WHY IT HAS TO RUN IN A BROWSER. The failure mode is SILENCE. Nothing threw, no request failed, no
// column looked wrong — the board simply drew fourteen cards for the sixteen orders that arrived, and
// nothing on the page said so. The unit suite
// (`test/ongoing-board-covers-every-live-status.test.js`) renders the same template in jsdom and is
// the assertion that reds on a regression; this journey is the other kind of evidence, and it exists
// because the estate's standard refuses a suite result as proof that a capability is REACHABLE. What
// is proven here that jsdom cannot prove: the real bundle resolves `~/utils/admin/ongoing-columns`
// through webpack, the real board draws the card, and a person looking at the screen can see it.
//
// THE ASSERTION IS PRESENCE, NEVER THE ABSENCE OF AN ERROR. Both counts below are read off the API
// response and off the DOM and compared. A journey that asserted "the page loaded" would have passed
// against the defect every single time.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

// ---- WHY THE TWO EXTRA ORDERS ARE INJECTED HERE AND NOT SEEDED IN THE FIXTURE ------------------
//
// `test/e2e/fixture/world.js` sends fourteen orders and every one of them is `Accepted`, which is
// why this world could never have caught the defect: a fixture that answers with one status can only
// prove the board handles that status. The obvious move — add two orders to the shared world — was
// tried, and it BROKE `modal-estate-scroll-lock.spec.js`: that journey scrolls the ongoing board to
// a fixed anchor and asserts the page is held there to within two pixels, and two more cards move
// the document under it (observed: held at 986 where 900 was expected). Its evidence is committed;
// perturbing it to prove something about a different page would be paying for this lane's proof with
// another lane's.
//
// So the extra orders are added at the WIRE, in this journey only. The fixture's own answer is
// fetched and the two are appended to it, so the fourteen are still the fixture's and no other
// journey sees anything change. The assertion below still compares what the browser RECEIVED against
// what it DREW, which is the whole claim.
const EXTRA_ORDERS = [
  // Out with a driver, still open, still has to be completed by somebody.
  {
    id: 'order-driver-picked-up',
    friendlyOrderId: '9015',
    status: 'DriverPickedUp',
    deliveryType: 'WoltDelivery',
    platform: 'Web',
    created: '2026-08-01T09:20:00.000Z',
    requestedCompletion: null,
    userFullName: 'Gjest på vei',
    userId: 'user-guest-driver',
    userIsMember: false,
    user: { id: 'user-guest-driver', phoneNumber: '+4790001015' },
    totalAmount: 263,
    items: [{ id: 'line-driver', name: 'Dagens rett', amount: 1, price: 263, comment: '' }]
  },
  // A check still open at the register.
  {
    id: 'order-open-check',
    friendlyOrderId: '9016',
    status: 'OpenCheck',
    deliveryType: 'TableDelivery',
    platform: 'Pos',
    created: '2026-08-01T09:21:00.000Z',
    requestedCompletion: null,
    userFullName: 'Bord 4',
    userId: 'user-guest-table',
    userIsMember: false,
    user: { id: 'user-guest-table', phoneNumber: '+4790001016' },
    totalAmount: 264,
    items: [{ id: 'line-table', name: 'Dagens rett', amount: 1, price: 264, comment: '' }]
  }
];

// The two statuses no column used to claim. Kept as data so the step reads as "these statuses
// reached the screen" rather than as two hand-checked cards.
const ONCE_INVISIBLE = [
  { friendlyOrderId: '9015', status: 'DriverPickedUp', column: 'Klar' },
  { friendlyOrderId: '9016', status: 'OpenCheck', column: 'Nye' }
];

// Every card on the board, with the column it is drawn in.
//
// `.order-status` holds a Material icon ligature and then the order number, and the ligature is real
// text in the DOM — reading `textContent` straight off it yields "shopping_bag1014". The icon span is
// stripped from a CLONE so the number can be compared with what the API sent.
const READ_BOARD = `(function () {
  return Array.from(document.querySelectorAll('.orders-column')).reduce(function (rows, column) {
    var heading = column.querySelector('.column-header h2');
    Array.from(column.querySelectorAll('.order-card')).forEach(function (card) {
      var badge = card.querySelector('.order-status');
      var number = '';
      if (badge) {
        var clone = badge.cloneNode(true);
        Array.from(clone.querySelectorAll('.material-icons')).forEach(function (icon) { icon.remove(); });
        number = clone.textContent.trim();
      }
      rows.push({
        column: heading ? heading.textContent.trim() : '',
        friendlyOrderId: number
      });
    });
    return rows;
  }, []);
})()`;

test(
  'Every live order the API returns is on the board, including the one out with a driver',
  journeyDetails({
    journey: 'ongoing-board-live-statuses',
    surface: 'admin',
    tag: ['@fixture'],
    capabilities: [
      'admin.ongoing.every-live-status-visible',
      'admin.ongoing.driver-picked-up-completable'
    ]
  }),
  async ({ page, journey }) => {
    let served = [];

    // The API's answer is captured from the wire rather than restated from the fixture, so the
    // comparison below is between what this build was SENT and what it DREW — which is the whole
    // claim. Restating the fixture's contents here would prove only that the fixture is what it is.
    page.on('response', async (response) => {
      if (!/\/orders\/ongoing(\?|$)/.test(new URL(response.url()).pathname + '')) { return; }
      try { served = await response.json(); } catch (e) { /* not JSON: leave the last good read */ }
    });

    await journey.step('sign in and land on the live orders board', async () => {
      // The fixture answers, and the two statuses it does not model are appended to its answer. See
      // the note above EXTRA_ORDERS for why this is at the wire and not in the shared world.
      await page.route('**/orders/ongoing', async (route) => {
        const response = await route.fetch();
        const fromFixture = await response.json();
        // The venue is taken from the fixture's own orders rather than named here, so this journey
        // carries no copy of the world's store id to go stale.
        const venue = fromFixture[0] || {};
        const added = EXTRA_ORDERS.map(order => Object.assign({
          storeId: venue.storeId,
          storeLegalName: venue.storeLegalName,
          currencyCode: venue.currencyCode
        }, order));
        await route.fulfill({ response, json: fromFixture.concat(added) });
      });

      await page.goto('/admin/ongoing');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/ongoing' });
      await page.waitForSelector('.order-card', { timeout: 30000 });
      await page.waitForTimeout(500);

      expect(Array.isArray(served)).toBe(true);
      expect(served.length).toBeGreaterThan(0);
      return 'on /admin/ongoing; /orders/ongoing answered with ' + served.length + ' live orders';
    });

    await journey.step('THE COUNT. Every order the API sent is drawn somewhere', async () => {
      const drawn = await page.evaluate(READ_BOARD);

      // The defect, stated as a number. Sixteen orders arrived and fifteen cards were drawn; the
      // missing one was in no column, so no count on the page was wrong and nobody could tell.
      const sent = served.map(order => String(order.friendlyOrderId)).sort();
      const shown = drawn.map(card => card.friendlyOrderId).sort();
      expect(shown).toEqual(sent);

      return served.length + ' orders sent, ' + drawn.length + ' cards drawn, same ids';
    });

    await journey.step('the two statuses that used to render nowhere are on screen', async () => {
      const drawn = await page.evaluate(READ_BOARD);
      const notes = [];

      for (const expected of ONCE_INVISIBLE) {
        const card = drawn.find(row => row.friendlyOrderId === expected.friendlyOrderId);
        expect(card, expected.status + ' (#' + expected.friendlyOrderId + ') is on the board').toBeTruthy();
        expect(card.column).toBe(expected.column);
        notes.push(expected.status + ' -> "' + card.column + '"');
      }
      return notes.join('; ');
    });

    // Visible is only half of it. The order out with a driver is still open, and the control that
    // closes it lives on the card — so a fix that put the card back without the button would have
    // left the venue exactly as stuck, just able to watch. The button is inside `.order-details`,
    // which the card renders only when it is expanded, so the card is opened the way a person opens
    // it: by pressing its header.
    await journey.step('the order out with a driver can be completed from this screen', async () => {
      const card = page.locator('.order-card').filter({ hasText: '9015' }).first();
      await expect(card).toBeVisible();
      await card.locator('.order-header').click();

      const complete = card.locator('.order-actions .btn-next');
      await expect(complete).toBeVisible();
      await expect(complete).toHaveText('Fullfør');

      // The open check, by contrast, deliberately offers no advance button: the register owns it
      // until it is accepted. Asserted so that "no button" stays a decision and not an oversight.
      const openCheck = page.locator('.order-card').filter({ hasText: '9016' }).first();
      await openCheck.locator('.order-header').click();
      await expect(openCheck.locator('.order-actions')).toBeVisible();
      await expect(openCheck.locator('.order-actions .btn-next')).toHaveCount(0);

      return '#9015 (DriverPickedUp) offers Fullfør; #9016 (OpenCheck) offers no advance button';
    });
  }
);

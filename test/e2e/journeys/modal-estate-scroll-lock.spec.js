// JOURNEY — two DIFFERENT modals are open, one closes, and the page is still locked.
//
// The sibling journey (`modal-scroll-lock.spec.js`) proved the SHARED modal, `atoms/Modal`, holds the
// page still. This one is about everything else, because most of the estate never went through that
// component:
//
//   • EIGHT modals set `document.body.style.overflow` directly, in `mounted`/`beforeDestroy` and in
//     their own `closeModal()`, and NOT ONE OF THEM COUNTED. Six of the eight live on this page over
//     one shared `currentOrder`; a seventh, `CustomerInfoModal`, is opened from INSIDE
//     `organisms/OrderModal`, which is the nesting that made the bug reachable by clicking rather
//     than by contrivance. Whichever modal closed last won, and the page behind whatever was still
//     open started scrolling.
//   • SEVENTEEN MORE full-screen overlay modals locked nothing at all.
//   • The marketing header's mobile drawer and the product editor wrote the same style from outside
//     any modal, and `PageHeader.closeMenu()` released it unconditionally.
//
// The review that raised this counted seven and looked only at the ones already writing the style. A
// census of the tree is what the numbers above come from, and it is in
// `test/modal-scroll-lock-estate.test.js` as a guard rather than as a claim.
//
// WHY THIS HAS TO RUN IN A BROWSER, twice over:
//
//   • `overflow: hidden` blocks a GESTURE and not a script. `window.scrollTo(0, 3000)` moves the page
//     straight through a working lock — it cost the first lane here a false positive — so every
//     movement assertion below is a real `page.mouse.wheel`, and the same gesture is asserted to MOVE
//     the page with no modal open, on the same page, in the same run. A journey that had accidentally
//     frozen the page would otherwise report success.
//   • jsdom has no vue-meta. The unit suite installs the real one and is honest as far as it goes,
//     but it cannot see a stylesheet, a computed style or a scroll position.
//
// WHY `/admin/ongoing`: it is the only admin surface that mounts six DIFFERENT modal components, and
// with the fixture's fourteen live orders it is three times the viewport. Both are required — a lock
// cannot be demonstrated on a page with nothing to scroll, and the defect cannot be demonstrated with
// two instances of one component.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

const RESTING_POSITION = 900;

// `window.scrollY` is not an integer; asking for 900 and reading 899 back is device-pixel rounding,
// not movement. Two pixels is far below the 600 a single wheel notch produces.
const SUB_PIXEL = 2;

function expectHeldAt (actual, anchor) {
  expect(Math.abs(actual - anchor)).toBeLessThanOrEqual(SUB_PIXEL);
}

/** A real wheel gesture over the middle of the viewport, and where the page ended up. */
async function wheelAndRead (page, delta) {
  await page.mouse.move(640, 350);
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(350);
  return page.evaluate(() => Math.round(window.scrollY));
}

function readBody (page) {
  return page.evaluate(() => ({
    overlays: document.querySelectorAll('.modal-overlay, .modal-backdrop, .modal-wrapper').length,
    bodyClass: document.body.getAttribute('class'),
    bodyOverflow: getComputedStyle(document.body).overflow,
    bodyInlineOverflow: document.body.style.overflow,
    scrollY: Math.round(window.scrollY),
    docScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight
  }));
}

// Walking the tree from the Nuxt root and matching on a data key, rather than `.__vue__` on a
// selector: Vue puts `__vue__` on a component's ROOT element, and this page's root element belongs to
// `AdminPage`, so nothing inside carries it.
const FIND_PAGE_VM = `(function () {
  var stack = [document.querySelector('#__nuxt').__vue__];
  while (stack.length) {
    var vm = stack.shift();
    if (vm && vm._data && 'showReceiptModal' in vm._data) { return vm; }
    if (vm && vm.$children) { stack = stack.concat(vm.$children); }
  }
  return null;
})()`;

const setFlags = assignments =>
  '(function () { var vm = ' + FIND_PAGE_VM + '; ' +
  Object.keys(assignments).map(key => 'vm.' + key + ' = ' + JSON.stringify(assignments[key]) + ';').join(' ') +
  ' })()';

test(
  'Two different modals hold the page, and closing one does not let go',
  journeyDetails({
    journey: 'modal-estate-scroll-lock',
    surface: 'admin',
    capabilities: ['ui.modal.scroll-lock']
  }),
  async ({ page, journey }) => {
    let anchor = RESTING_POSITION;

    await journey.step('sign in and land on the live orders board', async () => {
      await page.goto('/admin/ongoing');
      // Waited for, not assumed. Before the redirect settles the requested page is still mounted and
      // is showing a login modal of its OWN alongside `AdminPage`'s — see the note recorded at the
      // end of this journey. Signing in during that window drives an ambiguous screen.
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/ongoing' });
      await page.waitForSelector('.order-card:nth-child(10)', { timeout: 30000 });

      const landed = await readBody(page);
      expect(landed.bodyClass || '').not.toContain('noscroll');
      expect(landed.bodyOverflow).toBe('visible');
      expect(landed.docScrollHeight).toBeGreaterThan(landed.viewportHeight * 2);
      return 'on /admin/ongoing, ' + landed.docScrollHeight + 'px of board in a ' +
        landed.viewportHeight + 'px viewport; nothing locked';
    });

    await journey.step('with no modal open, a wheel moves the page — the control', async () => {
      await page.evaluate(y => window.scrollTo(0, y), RESTING_POSITION);
      await page.waitForTimeout(250);
      const moved = await wheelAndRead(page, 600);
      // Without this the journey could not tell a working lock from a page that cannot scroll at all.
      expect(moved).toBeGreaterThan(RESTING_POSITION + 100);
      return 'wheel 600 moved the page ' + RESTING_POSITION + ' -> ' + moved;
    });

    await journey.step('OPEN THE RECEIPT MODAL BY CLICKING IT, and the wheel stops working', async () => {
      // Through the product's own affordances, in order: expand a card, open its action drawer,
      // press Kvittering. This is the modal a person actually reaches, and it is one of the eight
      // that used to set the inline style.
      //
      // The drawer is opened BEFORE the page is put at its resting position, and the final press is
      // a DOM click rather than `locator.click()`. Both are about the instrument, not the product:
      // expanding a card changes the document's height and Playwright scrolls a target into view
      // before pressing it, so doing either after the anchor is set moves the page for reasons that
      // have nothing to do with the lock — and "the reader did not get teleported" is one of the
      // things being measured here.
      await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('.order-card .order-header'));
        headers[3].click();
      });
      await page.waitForTimeout(300);
      const card = page.locator('.order-card', { has: page.locator('.order-details') }).first();
      await card.locator('.btn-expand').click();
      await page.waitForSelector('.expanded-actions', { timeout: 10000 });

      await page.evaluate(y => window.scrollTo(0, y), RESTING_POSITION);
      await page.waitForTimeout(250);

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.expanded-actions .action-btn'));
        const receipt = buttons.find(b => /Kvittering|Receipt/i.test(b.textContent));
        receipt.click();
      });
      await page.waitForSelector('.modal-overlay, .modal-backdrop', { timeout: 10000 });
      await page.waitForTimeout(400);

      const open = await readBody(page);
      expect(open.bodyClass.split(' ')).toContain('noscroll');
      expect(open.bodyOverflow).toBe('hidden');
      // AND THE INLINE STYLE IS GONE. If this is still 'hidden' the old channel is back and the
      // class is decorative — the page would look locked and be locked for the wrong reason, which
      // is how this defect survived a review that called the two "non-interfering".
      expect(open.bodyInlineOverflow).toBe('');
      // The lock must not teleport the reader.
      expectHeldAt(open.scrollY, RESTING_POSITION);
      anchor = open.scrollY;

      expectHeldAt(await wheelAndRead(page, 600), anchor);
      expectHeldAt(await wheelAndRead(page, 3000), anchor);
      return 'body class "' + open.bodyClass + '", computed overflow ' + open.bodyOverflow +
        ', inline overflow "' + open.bodyInlineOverflow + '"; wheel 600 then 3000 left the page at ' +
        open.scrollY;
    });

    await journey.shot('receipt modal open, board behind held');

    await journey.step('A SECOND, DIFFERENT MODAL OPENS — the customer card', async () => {
      // Reached through the page's own flag rather than by clicking, for the reason the previous
      // journey names: no click path raises two of these at once, because the first one covers the
      // page. What is under test is what happens when they are BOTH MOUNTED, and they are.
      await page.evaluate(setFlags({ showCustomerModal: true }));
      await page.waitForTimeout(600);

      const both = await readBody(page);
      expect(both.overlays).toBe(2);
      expect(both.bodyClass.split(' ')).toContain('noscroll');
      expectHeldAt(await wheelAndRead(page, 3000), anchor);
      return 'two overlays on screen, body "' + both.bodyClass + '", page still at ' + both.scrollY;
    });

    await journey.step('CLOSE ONE OF THEM AND THE PAGE IS STILL LOCKED — the defect', async () => {
      // BEFORE THIS LANE: `CustomerInfoModal.closeModal()` set `document.body.style.overflow = ''`,
      // the receipt modal was still on screen, and the board behind both of them was free to scroll.
      // Nothing on screen changed, which is why nobody reported it.
      await page.evaluate(setFlags({ showCustomerModal: false }));
      await page.waitForTimeout(700);

      const one = await readBody(page);
      expect(one.overlays).toBe(1);
      expect(one.bodyClass.split(' ')).toContain('noscroll');
      expect(one.bodyOverflow).toBe('hidden');
      expect(one.bodyInlineOverflow).toBe('');
      expectHeldAt(await wheelAndRead(page, 3000), anchor);

      return 'closed one of two; body still "' + one.bodyClass + '" / ' + one.bodyOverflow +
        ', wheel 3000 left the page at ' + one.scrollY;
    });

    await journey.shot('one of two closed, board still held');

    await journey.step('a navigation with a modal still open does not release it', async () => {
      // The provocation that killed the class-based lock before it was declared: the layout's
      // `head()` reads `$route`, so a route change is a head update.
      await page.evaluate(() => {
        const app = document.querySelector('#__nuxt').__vue__;
        app.$router.replace({ path: '/admin/ongoing', query: { t: String(Date.now()) } });
      });
      await page.waitForTimeout(700);

      const after = await readBody(page);
      expect(after.overlays).toBe(1);
      expect(after.bodyClass.split(' ')).toContain('noscroll');
      expectHeldAt(await wheelAndRead(page, 3000), anchor);
      return 'after $router.replace the body is still "' + after.bodyClass + '" and the board has not moved';
    });

    await journey.step('closing the LAST one releases it, and the wheel works again', async () => {
      await page.evaluate(setFlags({ showReceiptModal: false, showCustomerModal: false }));
      await page.waitForTimeout(800);

      const released = await readBody(page);
      expect(released.overlays).toBe(0);
      expect(released.bodyClass || '').not.toContain('noscroll');
      expect(released.bodyOverflow).toBe('visible');
      // And the reader is where they left off rather than at the top.
      expectHeldAt(released.scrollY, anchor);

      const moved = await wheelAndRead(page, 600);
      expect(moved).toBeGreaterThan(anchor + 100);
      return 'lock released, board resumed at ' + released.scrollY + ' and wheeled to ' + moved;
    });

    await journey.shot('all modals closed, board free again');

    journey.finding(
      'note',
      'a signed-out visitor sees two login modals stacked until the redirect lands',
      'Asking for /admin/ongoing while signed out renders `.login-modal` TWICE for as long as the ' +
      'requested page is still mounted: components/organisms/AdminPage.vue opens one in `initAuth`, ' +
      'and pages/admin/ongoing.vue mounts its own `<LoginModal v-if="showLogin">` on the same ' +
      'condition in its own `mounted`. Ten admin pages carry that duplicate handling. Measured here ' +
      'as a strict-mode violation on `.login-modal` (2 elements) before `$router.replace` completes. ' +
      'Transient and pre-existing, unrelated to the scroll lock, not fixed by this lane.'
    );
  }
);

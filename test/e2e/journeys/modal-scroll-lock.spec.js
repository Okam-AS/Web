// JOURNEY — the page behind a modal does not move.
//
// The scroll lock behind EVERY modal in this application was dead, and no test could see it. The
// class that carries it (`.noscroll`) was added with `document.body.classList.add` in
// `Modal.vue#mounted`, and vue-meta owns `body.class`: `layouts/default.vue` declares `bodyAttrs`,
// and vue-meta's `updateAttribute` rebuilds that attribute from its own map and writes it whole. So
// the class survived until the next head update and not one moment longer — and the layout's
// `head()` reads `$route`, which makes a navigation one.
//
// That detail is why this has to be a browser journey and cannot be a unit test. jsdom has no
// vue-meta, so the imperative form PASSES in jsdom and fails everywhere else; a unit test asserting
// `document.body.classList.contains(...)` after mount could only ever be green while the product
// could only ever be broken. One such test already existed in this repo and was green for a year.
// (test/modal-scroll-lock.test.js is the honest version: it installs the real vue-meta.)
//
// WHAT THIS RUN MEASURES, and why each measurement is here:
//
//   • THE LOGIN MODAL, in the real redirect flow. `AdminPage.initAuth` opens the modal AND
//     `$router.replace`s to `/admin?redirect=…` — an open modal and a navigation, together, on every
//     admin URL a signed-out person asks for. That is the flow in which the lock was measured dead
//     (`class=""`, `overflow: visible`), so it is the flow that has to be measured alive.
//
//   • A REAL WHEEL, not `window.scrollTo`. This distinction cost a false positive during the fix:
//     `overflow: hidden` clips a scroll container and removes its scrolling UI, but the box remains
//     PROGRAMMATICALLY scrollable — `window.scrollTo(0, 3000)` moves the page straight through a
//     working lock. Only a user gesture is evidence. `page.mouse.wheel` is one; a script is not.
//
//   • BOTH DIRECTIONS. A lock that never lets go is not a lock, it is a bug with better manners. So
//     the same gesture is asserted to MOVE the page with no modal open, on the same page, in the
//     same run — otherwise a journey that had accidentally frozen the page would report success.
//
//   • TWO MODALS, ONE CLOSING. The classic failure of every reference-counted body-class lock. It is
//     reached here by setting the page's own two modal flags rather than by clicking, because no
//     click path on this page opens both at once — the mechanism under test (vue-meta's merge of
//     the live component tree) is real, only the route to the state is forced.
//
// WHY `/admin/lang`: it is the one fixture-reachable admin page that is BOTH taller than the
// viewport and opens a real `atoms/Modal`. An exit criterion of "the page behind does not scroll"
// cannot be proven on a page with nothing to scroll — and the login screen itself has nothing behind
// it at any viewport size, which is measured and recorded as a step below rather than assumed.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

const RESTING_POSITION = 1200;

// `window.scrollY` is not an integer. Asking the page to sit at 1200 and reading 1199 back is
// device-pixel rounding, not movement, and an exact comparison here fails for reasons that have
// nothing to do with the lock. Two pixels is far below the 600 a single wheel notch produces, so
// this loosens the instrument without loosening the claim.
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
    modalOpen: !!document.querySelector('.modal-wrapper'),
    bodyClass: document.body.getAttribute('class'),
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    scrollY: Math.round(window.scrollY),
    docScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight
  }));
}

// Finding the page component. `.container.__vue__` does NOT work: Vue puts `__vue__` on a component's
// ROOT element, and this page's root is `AdminPage`'s, so `.container` carries nothing. Walking the
// tree from the Nuxt root and matching on the data key is stable against that and against the
// re-render the navigation step causes.
const FIND_PAGE_VM = `(function () {
  var stack = [document.querySelector('#__nuxt').__vue__];
  while (stack.length) {
    var vm = stack.shift();
    if (vm && vm._data && 'showCantDeleteInfo' in vm._data) { return vm; }
    if (vm && vm.$children) { stack = stack.concat(vm.$children); }
  }
  return null;
})()`;

/** Opens the row editor the way a person does: the edit button on a row they can see. */
async function openRowEditor (page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('table tr td input.emoji-btn[type=button]'));
    const visible = buttons.find((b) => {
      const box = b.getBoundingClientRect();
      return box.top > 100 && box.top < 500;
    });
    visible.click();
  });
  await page.waitForSelector('.modal-wrapper', { timeout: 10000 });
  await page.waitForTimeout(600);
}

test(
  'A modal holds the page behind it still, and lets go when it closes',
  journeyDetails({
    journey: 'modal-scroll-lock',
    surface: 'admin',
    capabilities: ['ui.modal.scroll-lock']
  }),
  async ({ page, journey }) => {
    // Where the page is actually sitting, read back rather than assumed — see SUB_PIXEL.
    let anchor = RESTING_POSITION;

    await journey.step('ask for an admin page while signed out', async () => {
      await page.goto('/admin/lang');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await expect(page.locator('.login-modal')).toBeVisible({ timeout: 30000 });
      return 'redirected to ' + new URL(page.url()).search + ' with the login modal open';
    });

    await journey.step('THE LOGIN MODAL HOLDS THE LOCK, and keeps holding it across a head update', async () => {
      const onOpen = await readBody(page);
      expect(onOpen.bodyClass.split(' ')).toContain('noscroll');
      expect(onOpen.bodyOverflow).toBe('hidden');

      // The exact provocation that used to kill it. Before the fix this single call took the body
      // to `class=""` / `overflow: visible` with the modal still on screen.
      await page.evaluate(() => document.querySelector('#__nuxt').__vue__.$root.$meta().refresh());
      await page.waitForTimeout(250);

      const afterRefresh = await readBody(page);
      expect(afterRefresh.modalOpen).toBe(true);
      expect(afterRefresh.bodyClass.split(' ')).toContain('noscroll');
      expect(afterRefresh.bodyOverflow).toBe('hidden');

      // Recorded rather than asserted: on the login route the shell renders nothing behind the
      // modal, so there is no scroll to demonstrate HERE at any viewport size. The demonstration is
      // on the page this flow lands on, below. Stated so a reader does not mistake the absence of a
      // scroll assertion at this step for an oversight.
      return 'body class "' + afterRefresh.bodyClass + '", overflow ' + afterRefresh.bodyOverflow +
        '; nothing scrollable behind the login screen (doc ' + afterRefresh.docScrollHeight +
        'px vs viewport ' + afterRefresh.viewportHeight + 'px)';
    });

    await journey.shot('login modal, body locked');

    await journey.step('sign in and land on the page that was asked for', async () => {
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/lang' });
      await page.waitForSelector('table tr:nth-child(30)', { timeout: 30000 });
      const released = await readBody(page);
      // The lock lets go when the last modal closes.
      expect(released.bodyClass || '').not.toContain('noscroll');
      expect(released.bodyOverflow).toBe('visible');
      return 'on /admin/lang, ' + released.docScrollHeight + 'px of page in a ' +
        released.viewportHeight + 'px viewport; lock released';
    });

    await journey.step('with no modal open, a wheel moves the page — the control', async () => {
      await page.evaluate(y => window.scrollTo(0, y), RESTING_POSITION);
      await page.waitForTimeout(250);
      const moved = await wheelAndRead(page, 600);
      // Without this the journey could not tell a working lock from a page that cannot scroll at all.
      expect(moved).toBeGreaterThan(RESTING_POSITION + 100);
      return 'wheel 600 moved the page ' + RESTING_POSITION + ' -> ' + moved;
    });

    await journey.step('open a modal, and the wheel stops moving the page', async () => {
      await page.evaluate(y => window.scrollTo(0, y), RESTING_POSITION);
      await page.waitForTimeout(250);
      await openRowEditor(page);

      const open = await readBody(page);
      expect(open.bodyClass.split(' ')).toContain('noscroll');
      expect(open.bodyOverflow).toBe('hidden');
      // The lock must not teleport the reader: they were part-way down a long register when the
      // modal opened and that is where they still are.
      expectHeldAt(open.scrollY, RESTING_POSITION);
      anchor = open.scrollY;

      expectHeldAt(await wheelAndRead(page, 600), anchor);
      // Hard enough to reach the bottom of the page if anything were listening.
      expectHeldAt(await wheelAndRead(page, 3000), anchor);
      return 'body ' + open.bodyOverflow + '; wheel 600 then 3000 left the page at ' + open.scrollY;
    });

    await journey.shot('modal open, page behind held at 1200');

    await journey.step('a navigation with the modal still open does not release it', async () => {
      // This is the shape of the original defect, and the reason the login modal was the worst case:
      // an open modal plus a route change. Before the fix, the page behind scrolled to 3691 after
      // this step.
      await page.evaluate(() => {
        const app = document.querySelector('#__nuxt').__vue__;
        app.$router.replace({ path: '/admin/lang', query: { storeId: '42', t: String(Date.now()) } });
      });
      await page.waitForTimeout(700);

      const after = await readBody(page);
      expect(after.modalOpen).toBe(true);
      expect(after.bodyClass.split(' ')).toContain('noscroll');
      expectHeldAt(await wheelAndRead(page, 3000), anchor);
      return 'after $router.replace the body is still "' + after.bodyClass + '" and the page has not moved';
    });

    await journey.step('closing one of two open modals does not release the lock', async () => {
      // Forced through the page's own flags: `/admin/lang` has two independent modal booleans and no
      // click path that raises both. What is being tested is vue-meta's merge over the live tree,
      // and that is not simulated — two real `atoms/Modal` instances are mounted.
      await page.evaluate(FIND_PAGE_VM + '.showCantDeleteInfo = true');
      await page.waitForTimeout(600);
      const both = await page.evaluate(() => document.querySelectorAll('.modal-wrapper').length);
      expect(both).toBe(2);

      const withBoth = await readBody(page);
      expect(withBoth.bodyClass.split(' ')).toContain('noscroll');

      // Close ONE. The other is still open, so the lock must hold.
      await page.evaluate(FIND_PAGE_VM + '.showEditModal = false');
      await page.waitForTimeout(700);

      const withOne = await page.evaluate(() => document.querySelectorAll('.modal-wrapper').length);
      expect(withOne).toBe(1);
      const stillLocked = await readBody(page);
      expect(stillLocked.bodyClass.split(' ')).toContain('noscroll');
      expect(stillLocked.bodyOverflow).toBe('hidden');
      expectHeldAt(await wheelAndRead(page, 3000), anchor);

      return 'two modals -> closed one -> body still "' + stillLocked.bodyClass +
        '", page still at ' + stillLocked.scrollY;
    });

    await journey.step('closing the last one releases it, and the wheel works again', async () => {
      await page.evaluate('(function () { var vm = ' + FIND_PAGE_VM +
        '; vm.showCantDeleteInfo = false; vm.showEditModal = false; })()');
      await page.waitForTimeout(800);

      const released = await readBody(page);
      expect(released.modalOpen).toBe(false);
      expect(released.bodyClass || '').not.toContain('noscroll');
      expect(released.bodyOverflow).toBe('visible');
      // And the reader is where they left off, not at the top.
      expectHeldAt(released.scrollY, anchor);

      const moved = await wheelAndRead(page, 600);
      expect(moved).toBeGreaterThan(anchor + 100);
      return 'lock released, page resumed at ' + released.scrollY + ' and wheeled to ' + moved;
    });

    await journey.shot('all modals closed, page free again');

    journey.finding(
      'note',
      'EditLangRowModal does not act on the Modal close event',
      'components/organisms/EditLangRowModal.vue wraps atoms/Modal but binds no @close, so Escape ' +
      'runs Modal.close() and nothing happens — the modal can only be dismissed with Avbryt. ' +
      'Pre-existing, unrelated to the scroll lock, and not fixed by this lane; noticed while ' +
      'driving the journey.'
    );
  }
);

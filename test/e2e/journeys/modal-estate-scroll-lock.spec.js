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
//
// ---- AND THE RECEIPT IS READ IN THE LANGUAGE THE SWISS BUILD SHIPS ----------------------------
//
// This walk now runs at BOTH editions, and the second one is the only DOM-level guard on the
// RECEIPT in German. `nuxt.config.js` serves `locales: isCh ? ['de'] : ['en','no']`, so German is
// not a third language on the Norwegian product — it is the entire Swiss product, and the receipt is
// the document a bokføringsloven inspector reads.
//
// A sibling lane put the first such floor under `/admin/margin-statements`. It covers one of seven
// Tier-1 fiscal surfaces and reaches neither of the two German findings on record, BOTH of which are
// here. This is the surface.
//
// THE LOCATOR THIS STEP USED TO CARRY, AND WHY THE OBVIOUS READING OF IT IS WRONG:
//
//   `buttons.find(b => /Kvittering|Receipt/i.test(b.textContent))`
//
// reads as a two-language allowlist. `orderCard_receipt` is 'Quittung' at `de`, so the expectation is
// that `find` returns `undefined` at the Swiss edition and `receipt.click()` throws a TypeError
// inside `page.evaluate`. IT DOES NOT. That regex was RUN at `ch` in this lane, unchanged, and the
// walk passed — because `b.textContent` is not the label. The button is
//
//   <button class="action-btn"><span class="material-icons">receipt</span> {{ $i('orderCard_receipt') }}</button>
//
// and a Material Icons glyph is a LIGATURE: the icon's name is a real text node in the DOM. So
// `textContent` is "receipt Quittung", and `/Receipt/i` matches the ICON, in every language there
// will ever be. The step detail below records `oldRegexMatches` and `oldRegexMatchesLabelAlone`
// side by side from the live DOM, because the difference between those two booleans is the whole
// correction.
//
// The locator is still replaced, and the reason is now the sharper one: it matched for a reason that
// has nothing to do with what it says it matches. Rename the icon — `receipt_long` still matches,
// `description` does not — and the selector silently stops resolving in EVERY language at once, with
// a TypeError that names neither copy nor icons. A third alternative in the regex would not have
// helped either. `[data-test="order-action-receipt"]` is a hook that is not copy and not decoration.
// See `components/molecules/OrderCard.vue`.
//
// HOW THE LOCALE IS DRIVEN, and why it is not a dictionary handed to the spec. `OKAM_EDITION=ch` is
// the BUILD flag. It reaches the bundle the way a real Swiss build does — playwright inherits it,
// `test/e2e/scripts/dev-server.js` passes its whole environment to `nuxt-ts`, `nuxt.config.js` puts
// it in `env.EDITION`, `config/edition.js` reads it back in the browser, and `store/index.js:18`
// initialises `adminLocale` from `markets[EDITION].locale`. `plugins/i18n.js` resolves every `$i`
// against that. NOTHING BELOW SETS A LOCALE, seeds `localStorage`, or passes a message catalogue —
// and the browser context is fresh, so `store/index.js:93`'s persisted `adminLocale` is absent and
// the edition default is what the app resolves. A German render that came from this spec's fixture
// would prove something about the fixture.
//
// The expected sentences are WRITTEN OUT rather than looked up in `translations/`. A spec that
// resolved `receiptModal_title` from the dictionary would follow that dictionary wherever it went
// and could never red on a wrong word.
//
// WHAT IS ASSERTED AND WHAT IS ONLY RECORDED. The assertions below are the receipt's LABELS, which
// are correct German today. The three defects this walk found on the same surface are recorded as
// findings with the DOM quoted, and deliberately NOT asserted:
//
//   • `receiptModal_orgNumber` / `receiptModal_companyRegistry` name a German issuing authority over
//     a Norwegian organisasjonsnummer. They are being corrected on another branch, and a floor that
//     pinned today's literal would RED ON THE FIX — a floor must red when copy drifts and must not
//     fight a correction. What is asserted there is the org NUMBER, which the correction does not
//     move.
//   • `paymentTypeLabel`, `deliveryTypeLabel` and `orderStatusLabel` in `plugins/global-mixin.js`
//     return hardcoded Norwegian with no `$i` at all, so three of the receipt's six values read
//     'Ukjent' / 'Hent selv' / 'Forespurt' to a Swiss operator. Same reasoning: recorded, not pinned.
//
// A rendered-literal floor of this kind catches copy that DRIFTS. It would not have caught either
// org-number finding, because both are well-formed German that whoever wrote the assertion would
// have copied verbatim off the page. That bound is stated here rather than left to be discovered.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

// The edition the BUILD under test was compiled for. Read here only to choose which column of
// expected words to assert; it is never pushed into the app.
const EDITION = process.env.OKAM_EDITION === 'ch' ? 'ch' : 'no';

// The organisasjonsnummer `test/e2e/fixture/world.js` puts on every ongoing order. Locale-invariant
// on purpose: it is the value the label is printed OVER, and asserting it proves the statutory
// header rendered without pinning the wrong word beside it.
const ORG_NUMBER = '912345678';

const RECEIPT_COPY = {
  no: {
    locale: 'no',
    title: 'Kvittering',
    // In DOM order, and complete: the fixture order is SelfPickup with no table, no comment and a
    // payment type that is not Stripe, so exactly these six rows render. Asserting the whole list
    // rather than a keyword means a row that disappears is a failure too.
    detailLabels: ['Bestillingsnummer:', 'Kunde:', 'Betaling:', 'Leveringsmåte:', 'Bestilt:', 'Status:'],
    itemColumns: ['Vare', 'Ant.', 'Mva', 'Pris'],
    total: 'Totalt'
  },
  ch: {
    locale: 'de',
    title: 'Quittung',
    detailLabels: ['Bestellnummer:', 'Kunde:', 'Zahlung:', 'Liefermethode:', 'Bestellt:', 'Status:'],
    itemColumns: ['Artikel', 'Anz.', 'MwSt', 'Preis'],
    total: 'Gesamt'
  }
};

// TWO OF THE TWELVE ARE THE SAME WORD IN BOTH DICTIONARIES — `receiptModal_customer` is 'Kunde:' and
// `common_status` is 'Status' at `no` and at `de` alike. They are left in the list because the list
// is the receipt's whole label row and a partial list would stop guarding the rows it dropped, but
// they distinguish nothing about language and are not counted as German coverage. Ten of the twelve
// do differ, and the mutation arms use one of those.
const LOCALE_INVARIANT_LABELS = ['Kunde:', 'Status:'];

const t = RECEIPT_COPY[EDITION];

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
  'Two different modals hold the page, and closing one does not let go' +
    (EDITION === 'ch' ? ' — at the Swiss edition, with the receipt read in German' : ''),
  journeyDetails({
    // The two editions write SEPARATE artifacts. `journeyDetails()` has no locale or edition key and
    // nothing `JourneyRecorder.toJSON` emits names either, so one name would have let a German run
    // overwrite the Norwegian evidence in place and left a file no reader could attribute to a
    // build. Closed here for this journey only; the harness gap is general and still open.
    journey: EDITION === 'ch' ? 'modal-estate-scroll-lock-de' : 'modal-estate-scroll-lock',
    surface: 'admin',
    capabilities: EDITION === 'ch'
      ? ['ui.modal.scroll-lock', 'ui.receipt.copy.de']
      : ['ui.modal.scroll-lock']
  }),
  async ({ page, journey }) => {
    let anchor = RESTING_POSITION;
    let receiptButtonText = null;

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

      // BY HOOK, NOT BY LABEL. This used to be
      // `buttons.find(b => /Kvittering|Receipt/i.test(b.textContent))`, which meant the walk could
      // only ever be driven in the two languages that regex listed; at `ch` the button reads
      // 'Quittung', `find` returned undefined and `.click()` threw a TypeError inside this very
      // `page.evaluate`. `undefined` is not caught here either — a hook that stops resolving must
      // fail loudly rather than be worked around, and the assertion below is what says whether the
      // modal opened.
      // What the pre-lane regex was actually matching, captured before the click and reported in
      // this step's detail, because the answer is not what it looks like. See the header.
      receiptButtonText = await page.evaluate(() => {
        const btn = document.querySelector('.expanded-actions [data-test="order-action-receipt"]');
        return {
          textContent: JSON.stringify(btn.textContent),
          label: btn.querySelector('.material-icons').nextSibling.textContent.trim(),
          icon: btn.querySelector('.material-icons').textContent,
          oldRegexMatches: /Kvittering|Receipt/i.test(btn.textContent),
          oldRegexMatchesLabelAlone: /Kvittering|Receipt/i.test(
            btn.querySelector('.material-icons').nextSibling.textContent)
        };
      });

      await page.evaluate(() => {
        const receipt = document.querySelector('.expanded-actions [data-test="order-action-receipt"]');
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
        open.scrollY + '; receipt button ' + JSON.stringify(receiptButtonText);
    });

    await journey.step('READ THE RECEIPT IN THE LANGUAGE THIS BUILD SHIPS', async () => {
      // Exactly one overlay is on screen at this point — the previous step opened the receipt and
      // nothing else — so `.modal-backdrop` is unambiguous without reaching into the component.
      const receipt = page.locator('.modal-backdrop');
      await expect(receipt).toHaveCount(1);

      // NONE of these assertions scrolls: `toHaveText` reads, it does not act, so the anchor the
      // steps after this one are still measuring against is untouched. That is why this step sits
      // between two lock assertions rather than at the end.
      await expect(receipt.locator('.modal-header h2')).toHaveText(t.title);
      await expect(receipt.locator('.order-details .detail-row .label')).toHaveText(t.detailLabels);
      await expect(receipt.locator('.items-header > span')).toHaveText(t.itemColumns);
      await expect(receipt.locator('.total-section .total-label')).toHaveText(t.total);

      // The statutory header rendered, and the number reached it. The WORDS beside the number are
      // read off the DOM and reported below rather than asserted — see the header.
      const vat = receipt.locator('.store-vat');
      await expect(vat).toHaveCount(1);
      await expect(vat).toContainText(ORG_NUMBER);

      const rendered = await receipt.evaluate(node => ({
        orgLines: Array.from(node.querySelectorAll('.store-vat p')).map(p => p.textContent.trim()),
        values: Array.from(node.querySelectorAll('.order-details .detail-row')).map(row => ({
          label: row.querySelector('.label').textContent.trim(),
          value: row.querySelector('.value').textContent.trim()
        }))
      }));

      const guarded = t.detailLabels.concat(t.itemColumns, [t.title, t.total]);
      const distinguishing = guarded.filter(word => LOCALE_INVARIANT_LABELS.indexOf(word) === -1);

      if (EDITION === 'ch') {
        journey.finding(
          'defect',
          'the Swiss receipt prints its org number under a German issuing authority',
          'components/molecules/ReceiptModal.vue:39 renders `receiptModal_orgNumber` over ' +
          '`order.storeVAT`. At OKAM_EDITION=ch the two lines of the receipt\'s statutory header ' +
          'read exactly: ' + JSON.stringify(rendered.orgLines) + '. The number is a Norwegian ' +
          'organisasjonsnummer; "USt-IdNr." is a German VAT identification number and ' +
          '"Handelsregister" is the German commercial register, not Foretaksregisteret. Read off ' +
          'the DOM in this run, NOT asserted: the strings are being corrected on another branch and ' +
          'a floor that pinned them would red on the fix.'
        );
        journey.finding(
          'defect',
          'three receipt VALUES are hardcoded Norwegian at the Swiss edition',
          'plugins/global-mixin.js — `paymentTypeLabel` (:82), `deliveryTypeLabel` (:97) and ' +
          '`orderStatusLabel` (:134) are `switch` statements returning Norwegian string literals ' +
          'with no `$i` and no dictionary key, so no translation can reach them. The receipt\'s ' +
          'German labels therefore carry Norwegian values. Rendered in this run: ' +
          JSON.stringify(rendered.values) + '. Recorded rather than asserted, for the same reason ' +
          'as the finding above.'
        );
      }

      return EDITION + ': ' + guarded.length + ' receipt labels asserted (' + distinguishing.length +
        ' of them language-distinguishing), heading "' + t.title + '"; statutory header rendered as ' +
        JSON.stringify(rendered.orgLines);
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

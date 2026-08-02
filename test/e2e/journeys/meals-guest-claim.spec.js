// JOURNEY — an invited employee turns a code into a membership, and is refused three times first.
//
// THE REFUSALS ARE THE VALUABLE PART, and one of them is the reason this page is a security boundary
// rather than a form. `meals.invitation-contact-mismatch` is what stops a forwarded token being a
// bearer credential for whoever holds it — and the server "deliberately does NOT echo the intended
// contact", because a refusal naming the address would tell the holder exactly which account to go
// and acquire. That is unfalsifiable from a unit test: you cannot prove a page withholds something by
// mounting it. You have to be refused while holding somebody else's code and then read the whole
// rendered document, which is what this journey does.
//
// THIS JOURNEY COULD NOT RUN AT ALL UNTIL A ONE-LINE FIX. `pages/meals/join.vue` assigned its client
// in `created()`, which Vue runs before any `mounted()` — and the store is rehydrated from
// localStorage in the global mixin's `mounted()`. So the bearer-token snapshot was taken while
// `currentUser` was still null on EVERY load, both `[Authorize]` invitee routes 401'd, and an
// employee who had just signed in was told they were signed out. The client is a computed now, like
// every other page's. Step 5 below is the fix's evidence, deliberately symmetric with the evidence
// for the defect: the same request log, reading `present` where it read `ABSENT`.
//
// The reader is a shop assistant on a phone who has never seen this product, which is why every
// refusal is a HEADING plus a body that ends in something to do, and why the headings are the
// employee's vocabulary rather than the server's. Four are exercised:
//
//   an empty paste          local, before anything is sent
//   an unknown code         `meals.not-found` — and the copy names BOTH possibilities, because a
//                           token that maps to nothing and a module that is switched off are the same
//                           response with nothing on the wire to separate them
//   a spent code            `meals.invitation-not-claimable` with `currentState: Claimed` — three
//                           states, three different conversations, so the state is used
//   the wrong account       `meals.invitation-contact-mismatch`, withholding
//
// …and then the claim succeeds, as the person the code actually names — which also proves the second
// half of the same fix, since a stale client would have filed it as the previous account.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');

const GOOD = 'mealsinv_fixture_open'; // names marit@example.test — the manager
const USED = 'mealsinv_fixture_used'; // already claimed
const UNKNOWN = 'mealsinv_fixture_nonexistent';

// What the refusal must never say. The email is the invitation's own contact; the phone and the
// given name are the same person reachable by another route, and a refusal leaking either would be
// as useful to somebody holding a forwarded code as the address itself.
const WITHHELD = ['marit@example.test', 'marit', '99999999', 'Marit'];

test(
  'An employee is refused a stranger\'s invitation without being told whose it is, then claims their own',
  journeyDetails({
    journey: 'meals-guest-claim',
    surface: 'public',
    capabilities: [
      'meals.claim.paste-surface',
      'meals.claim.authentication-required',
      'meals.invitation.session',
      'meals.invitation.claim',
      'meals.invitation.refusal.unknown-code',
      'meals.invitation.refusal.already-used',
      'meals.invitation.refusal.contact-mismatch'
    ]
  }),
  async ({ page, journey }) => {
    // Every invitee call, with the header that decides whether it can succeed. Both routes sit behind
    // the controller's class-level `[Authorize]`, so a call with no bearer is a 401 — and the page
    // renders a 401 as "you are not signed in any more". This log is what told us the token was
    // missing, and it is what now tells us it is not.
    const inviteeCalls = [];
    page.on('request', (request) => {
      if (request.url().includes('/v1/meals/invitations/')) {
        inviteeCalls.push({
          route: request.url().replace(/^.*\/v1\/meals\//, ''),
          authorization: request.headers().authorization ? 'present' : 'ABSENT'
        });
      }
    });

    await journey.step('open the claim page with no code at all', async () => {
      await page.goto('/meals/join');
      // The paste field is the PRIMARY way in, not a fallback: the concierge screen copies a bare
      // code to the clipboard, so what reaches an employee is a string in a message.
      await expect(page.locator('[data-test="paste"]')).toBeVisible({ timeout: 30000 });
      return 'paste screen, no token';
    });

    await journey.step('an empty paste is refused locally', async () => {
      const before = journey.failedRequests.length;
      await page.getByRole('button', { name: 'Fortsett' }).click();
      await expect(page.locator('[data-test="paste-empty"]')).toBeVisible();
      expect(journey.failedRequests.length).toBe(before);
      return 'refused before anything was sent';
    });

    await journey.step('a code held by nobody signed in asks them to sign in', async () => {
      // Both invitee routes sit behind the controller's class-level `[Authorize]`, so there is no
      // anonymous preview to offer and the page does not pretend there is one. This is the platform's
      // rule being stated, not a choice the client made.
      await page.locator('[data-test="code-input"]').fill(UNKNOWN);
      await page.getByRole('button', { name: 'Fortsett' }).click();
      await expect(page.locator('[data-test="sign-in"]')).toBeVisible();
      await expect(page.locator('[data-test="preview"]')).toHaveCount(0);
      expect(inviteeCalls).toEqual([]);
      return 'sign-in required, and no invitee call was attempted without one';
    });

    await journey.step('sign in as somebody who was not invited', async () => {
      await page.locator('[data-test="sign-in-button"]').click();
      await signIn(page, { phone: '90000001', code: '123123' });
      return 'signed in as +4790000001 (Ola Ansatt)';
    });

    await journey.step('THE FIX — the sign-in now reaches the claim client', async () => {
      // The evidence, in the same shape as the evidence for the defect. Before the fix this log read
      // `ABSENT`, the server answered 401, and the page told a freshly signed-in employee they were
      // signed out. The page's client is a computed now, so the token is read at CALL time rather
      // than snapshotted in `created()` before the store exists.
      await expect(page.locator('[data-test="refusal"]')).toBeVisible({ timeout: 15000 });
      expect(inviteeCalls.length).toBeGreaterThan(0);
      const unauthenticated = inviteeCalls.filter(call => call.authorization === 'ABSENT');
      expect(unauthenticated).toEqual([]);
      // …and the refusal on screen is about the CODE, not about the session. That distinction is the
      // whole difference: a 401 renders as "Du er ikke logget inn lenger", which is what this page
      // said to every invited employee before the fix.
      await expect(page.locator('[data-test="refusal"]').locator('.mj-heading'))
        .not.toHaveText('Du er ikke logget inn lenger');
      return JSON.stringify(inviteeCalls);
    });

    await journey.step('the unknown code is refused, and names BOTH possibilities', async () => {
      const refusal = page.locator('[data-test="refusal"]');
      await expect(refusal.locator('.mj-heading')).toHaveText('Vi kjenner ikke igjen denne koden');
      // A token that maps to no invitation and a module that is switched off are the SAME response
      // (`meals.not-found` from `_authorization.NotFound()` and from `RequireVisible()`), with no
      // extension separating them. Asserting either one would be asserting something the wire does
      // not say — so the copy names both, and the journey checks that it does: it offers the missing
      // code, the spent code AND the module being off, and says in as many words that it cannot tell
      // which. A page that picked one would be inventing a fact the server refused to give it.
      await expect(refusal).toContainText('slått på hos oss');
      await expect(refusal).toContainText('Vi får ikke vite hvilken av delene det er');
      await expect(page.locator('[data-test="claim-button"]')).toHaveCount(0);
      return (await refusal.locator('.mj-heading').textContent()).trim();
    });

    await journey.shot('an unknown code');

    await journey.step('a code somebody has already used says so, not "no longer claimable"', async () => {
      await page.locator('[data-test="other-code-button"]').click();
      await page.locator('[data-test="code-input"]').fill(USED);
      await page.getByRole('button', { name: 'Fortsett' }).click();

      // The preview answers for an invitation in any state — the claim is where state is enforced —
      // so the employee can see WHAT they were refused about rather than only that they were.
      await expect(page.locator('[data-test="preview"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-test="claim-button"]').click();

      const refusal = page.locator('[data-test="refusal"]');
      await expect(refusal.locator('.mj-heading')).toHaveText('Koden er allerede brukt', { timeout: 15000 });
      // `currentState` is on the wire and is USED: Claimed, Revoked and Expired are three different
      // conversations, and collapsing them into "no longer claimable" would send somebody to ask for
      // a reissue when they are in fact already a member. The Claimed sentence carries exactly that
      // branch — "was it you, you are already in" — which the other two states do not.
      await expect(refusal).toContainText('Var det deg, er du med fra før');
      // Terminal for this code: no retry is offered, because pressing again cannot help.
      await expect(page.locator('[data-test="refusal-retry"]')).toHaveCount(0);
      return 'meals.invitation-not-claimable · currentState Claimed → "Koden er allerede brukt"';
    });

    await journey.step('THE ONE THAT MATTERS: refused for the right code and the wrong account', async () => {
      await page.locator('[data-test="other-code-button"]').click();
      await page.locator('[data-test="code-input"]').fill(GOOD);
      await page.getByRole('button', { name: 'Fortsett' }).click();
      await expect(page.locator('[data-test="preview"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-test="claim-button"]').click();

      const refusal = page.locator('[data-test="refusal"]');
      await expect(refusal.locator('.mj-heading'))
        .toHaveText('Invitasjonen hører til en annen konto', { timeout: 15000 });
      // It offers a way back rather than leaving them at a wall.
      await expect(page.locator('[data-test="switch-account"]')).toBeVisible();
      return 'meals.invitation-contact-mismatch, with a way to come back as somebody else';
    });

    await journey.step('AND IT DOES NOT SAY WHOSE INVITATION IT IS', async () => {
      // The security property, checked against the WHOLE rendered document rather than against the
      // refusal card. Two reasons it has to be the whole page: the platform's own `detail` is echoed
      // beside the sentence (`[data-test="refusal-detail"]`), so an unlucky server message could leak
      // the contact there; and the preview card is deliberately still on screen behind the refusal,
      // so a session projection that had grown a contact field would leak it there.
      //
      // Asserted on the rendered TEXT, not on the status code. A 403 with the right code and a body
      // naming the address would satisfy any check that stopped at the wire, and would still hand a
      // token thief the account they need.
      const rendered = await page.locator('body').textContent();
      for (const secret of WITHHELD) {
        expect(rendered, 'the refusal must not disclose "' + secret + '"').not.toContain(secret);
      }

      // The element that COULD have leaked it is on screen, so the check above is meaningful rather
      // than passing because there was nothing there to leak.
      await expect(page.locator('[data-test="refusal-detail"]')).toBeVisible();

      // …and it says that it is WITHHOLDING, rather than being vague by accident. A reader who is not
      // told the omission is deliberate concludes the page is broken and goes and asks somebody to
      // read the invitation out to them, which defeats the whole control.
      await expect(page.locator('[data-test="refusal"]')).toContainText('Vi sier ikke hvilken det er');
      return 'none of ' + JSON.stringify(WITHHELD) + ' appears anywhere in the rendered page';
    });

    await journey.shot('refused, and withholding');

    await journey.step('come back as the person the code actually names', async () => {
      // Signing out closes the modal (`wipeUser` emits close(false)), which drops the previous
      // account's preview and refusal — a refusal earned by one account must never be left on screen
      // next to another account's name.
      await page.locator('[data-test="switch-account"]').click();
      await page.locator('.login-modal__logged-in .btn--danger').click();
      await expect(page.locator('[data-test="sign-in"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-test="refusal"]')).toHaveCount(0);

      await page.locator('[data-test="sign-in-button"]').click();
      await signIn(page, { phone: '99999999', code: '123123' });

      // NO RELOAD, and that is the second half of the fix. With the client snapshotted in `created()`
      // this switch changed who the page NAMED and not who the server answered, so the claim below
      // would have been filed as the previous account — on a surface where a membership cannot be
      // un-claimed. The code itself survived without ever being stored: nothing navigated, so it is
      // simply still in component memory, never in `sessionStorage`, the Vuex store or the route.
      await expect(page.locator('[data-test="preview"]')).toBeVisible({ timeout: 15000 });
      return 'signed in as +4799999999; the held code survived and no reload was needed';
    });

    await journey.step('the invitation says what it can and names what it cannot', async () => {
      const preview = page.locator('[data-test="preview"]');
      await expect(preview.locator('.mj-title')).toHaveText('Du er invitert til Nordane AS');
      // `MealsInvitationSessionModel` carries a company name, a role and an expiry and NOTHING else —
      // no allowance, no venue, no inviter. A screen that quietly omitted those would read as "there
      // is no budget attached", so the gap is named on the page.
      await expect(page.locator('[data-test="unknowns"]')).toBeVisible();
      return (await preview.locator('.mj-facts').textContent()).replace(/\s+/g, ' ').trim();
    });

    await journey.step('claim it', async () => {
      await page.locator('[data-test="claim-button"]').click();
      const claimed = page.locator('[data-test="claimed"]');
      await expect(claimed).toBeVisible({ timeout: 15000 });
      await expect(claimed.locator('.mj-title')).toHaveText('Du er med i Nordane AS');

      // MIG-17, from the claimant's side. `MealsMembership.EmployeeReference` does not exist, so
      // `MealsStatementService` writes `MemberDisplayRef = MembershipId.ToString()` and this person is
      // a bare identifier on every line of their employer's monthly bill, permanently. It is shown
      // AFTER the claim and never before: before, it is an alarm they cannot act on; afterwards it is
      // the string they will have to quote if they ever query a line.
      const reference = (await claimed.locator('.mj-ref').textContent()).trim();
      expect(reference).not.toBe('—');
      expect(reference.length).toBeGreaterThan(0);

      // The claim CONSUMES the invitation, so the receipt must survive anything that happens after
      // it: there is no second chance at this screen and no route that can show it again.
      await expect(page.locator('[data-test="claim-button"]')).toHaveCount(0);
      await expect(page.locator('[data-test="refusal"]')).toHaveCount(0);

      // Every invitee call in the whole journey carried an identity. Restated at the end because the
      // failure this replaces was SILENT: the page rendered a plausible sentence, and the only place
      // the truth existed was the request log.
      const unauthenticated = inviteeCalls.filter(call => call.authorization === 'ABSENT');
      expect(unauthenticated).toEqual([]);
      return 'membership reference ' + reference + '; ' + inviteeCalls.length +
        ' invitee calls, all authenticated';
    });

    await journey.shot('the membership receipt');

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED — the flow completed. The 4xx statuses are the three refusals this
      // journey provoked on purpose and asserted on screen above. Counted and named, not re-filed
      // as news.
      const noise = /favicon|Download the Vue Devtools|status of (400|401|403|404|409)/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));
      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note', 'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here, during this page\'s own sign-in modal, and ' +
          'identically in every signed-in journey in this suite. It is AdminPage\'s login redirect ' +
          'being superseded by the storeId append, not anything on the claim page.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the meals claim journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);

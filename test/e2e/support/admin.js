// Signing in to the admin area the way a person does it.
//
// NOT by seeding `localStorage`. The Vuex store persists itself to `localStorage.state` and restores
// it synchronously, so a journey COULD write a user object there and skip the modal — and every
// admin journey would then pass on a build where the login modal is broken. The point of a browser
// journey is that the door is part of the route.
//
// The flow is: any `/admin/*` URL -> `AdminPage.initAuth` finds no user -> it opens `LoginModal` and
// `$router.replace('/admin?redirect=<where you were going>')` -> phone -> six-box OTP -> on success
// the modal's close handler replaces back to the redirect target. So a journey asks for the page it
// wants, signs in, and finds itself on that page; it never navigates twice.

const { expect } = require('@playwright/test');

const OTP_LENGTH = 6;

/**
 * @param page          Playwright page, already navigated to the admin URL the journey wants
 * @param phone         national part only — the modal prefixes +47 itself
 * @param code          the six-digit SMS code
 * @param expectPath    the path the journey expects to land on after the redirect dance
 */
async function signIn (page, { phone, code, expectPath }) {
  const modal = page.locator('.login-modal');
  await expect(modal).toBeVisible({ timeout: 30000 });

  // At the phone step there is exactly one tel input; the six OTP boxes are also `type=tel` and only
  // exist after the code has been requested, which is why this is scoped to the form step.
  const phoneField = modal.locator('.input-wrapper input[type="tel"]');
  await expect(phoneField).toBeVisible();
  await phoneField.fill(phone);

  await modal.getByRole('button', { name: /Send kode|Send|senden/i }).click();

  const boxes = modal.locator('.otp-input input');
  await expect(boxes).toHaveCount(OTP_LENGTH);

  // Filled box by box rather than pasted: `OtpInput.onValueChange` is what advances the focus and
  // emits `complete`, and it only runs on a per-input `input` event. A journey that set the value
  // some other way would be testing nothing about this component.
  const digits = String(code).split('');
  for (let i = 0; i < OTP_LENGTH; i++) {
    await boxes.nth(i).fill(digits[i]);
  }

  if (expectPath) {
    await page.waitForURL(url => url.pathname === expectPath, { timeout: 30000 });
  }
  await expect(modal).toHaveCount(0, { timeout: 15000 });
}

module.exports = { signIn };

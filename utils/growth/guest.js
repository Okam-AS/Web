// The guest side of Growth, as pure functions: what the anonymous `/v1/growth` routes answered,
// turned into the handful of sentences a member of the public may be shown. No Vue, no network.
//
// These four pages are CONSENT SURFACES. Everything here follows from that:
//
//   1. NOTHING IS CLAIMED THAT THE BACKEND DID NOT SAY. The subscribe endpoint answers 202 for every
//      well-formed request and deliberately never reveals whether the address existed, was pending or
//      was already verified — so the page after it may not say "we sent you an email" or "you are
//      already on the list". It says what was recorded and what has to happen next, and stops.
//      (It also cannot say mail was sent for a second reason: `IGrowthMailProvider` is bound to
//      `GrowthFakeMailProvider` in `Program.cs`, which performs no network I/O at all. Copy that
//      survives BOTH facts is copy that stays true when a real provider is promoted.)
//
//   2. THE SERVER'S STATE WINS OVER THE GUEST'S REQUEST. Asking to be re-subscribed from the
//      preference centre records a re-consent receipt but does NOT lift a suppression
//      (`GrowthPreferenceService.UpdatePreferenceAsync` says so explicitly). So the page renders the
//      state that came back, and when that state contradicts what was asked for it says which — a
//      toggle that springs back with no explanation is how a guest concludes the site is broken.
//
//   3. AN IRREVERSIBLE ACT IS DESCRIBED BEFORE IT IS OFFERED. Filing an erasure suppresses
//      immediately and cannot be withdrawn; the destruction itself is a separate, human, later step
//      the venue performs. Three different facts, and the page separates them rather than collapsing
//      them into "your data has been deleted".

import { guestLocale } from '~/utils/events/guest';

export { GUEST_LOCALES, guestLocale } from '~/utils/events/guest';

// ---- what the module can be asked to do ---------------------------------------------------------

/** `GrowthChannel`. Email is the only value in v1; SMS/push are never an extension of email consent. */
export const CHANNEL_EMAIL = 'Email';
/** `GrowthPurpose`. Newsletter is the only marketing purpose in v1. */
export const PURPOSE_NEWSLETTER = 'Newsletter';
/** `GrowthPrivacyRequestType`. GDPR art. 15. */
export const PRIVACY_ACCESS = 'Access';
/** `GrowthPrivacyRequestType`. GDPR art. 17. */
export const PRIVACY_ERASURE = 'Erasure';

/** The provenance label recorded on the capture (`GrowthSubscribeCommand.CaptureSource`). */
export const CAPTURE_SOURCE_WEB = 'web-signup';

// ---- how a read or a write can have gone --------------------------------------------------------

/** The call answered and its payload is in hand. */
export const GROWTH_HELD = 'held';
/**
 * 404 `growth.not_found`. Opaque BY DESIGN: the store has `growth.module` off, or does not exist, and
 * the backend refuses to say which. A page may therefore not tell the guest their link is wrong.
 */
export const GROWTH_UNAVAILABLE = 'unavailable';
/**
 * 410 `growth.token_invalid`. Also opaque: unknown, expired, already spent and wrong-kind all answer
 * the same, so the page must offer every one of those as a possible reason rather than pick one.
 */
export const GROWTH_TOKEN_DEAD = 'token-dead';
/** 401 `growth.session_invalid`. The preference session is missing, expired (30 min) or was rejected. */
export const GROWTH_SESSION_DEAD = 'session-dead';
/** The page was opened without the fragment that carries the token. */
export const GROWTH_NO_TOKEN = 'no-token';
/** Anything else, including no answer at all. Nothing is claimed. */
export const GROWTH_UNKNOWN = 'unknown';

/**
 * `(payload, error) -> { state, view, code, detail }` for any of the guest calls.
 *
 * `view` is null unless the call HELD a payload, so no caller can render a field off a refusal.
 */
export function readGrowth (payload, error) {
  if (error) {
    return { state: growthState(error), view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!payload || typeof payload !== 'object') {
    return { state: GROWTH_UNKNOWN, view: null, code: null, detail: null };
  }
  return { state: GROWTH_HELD, view: payload, code: null, detail: null };
}

/**
 * The refusal families the guest pages branch on. Keyed on the stable `growth.*` code, and on the
 * status only where the code is absent (a proxy or a gateway can answer with no envelope at all).
 */
export function growthState (error) {
  if (!error) { return GROWTH_UNKNOWN; }
  if (error.code === 'growth.not_found' || error.status === 404) { return GROWTH_UNAVAILABLE; }
  if (error.code === 'growth.token_invalid' || error.status === 410) { return GROWTH_TOKEN_DEAD; }
  if (error.code === 'growth.session_invalid' || error.status === 401) { return GROWTH_SESSION_DEAD; }
  return GROWTH_UNKNOWN;
}

/**
 * The sentence key for a refusal the guest is owed an explanation for.
 *
 * Every branch is a code the backend documents as a public contract. An unrecognised code resolves to
 * the neutral sentence and the page prints the server's own prose beside it — a guest who cannot act
 * is owed the reason, not only our paraphrase of it.
 */
export function growthRefusalKey (code) {
  switch (code) {
  case 'growth.address_required': return 'gr_guest_refused_address_required';
  case 'growth.consent_text_unknown': return 'gr_guest_refused_consent_text_unknown';
  case 'growth.not_found': return 'gr_guest_refused_not_found';
  case 'growth.token_invalid': return 'gr_guest_refused_token_invalid';
  case 'growth.session_invalid': return 'gr_guest_refused_session_invalid';
  case 'growth.scope_mismatch': return 'gr_guest_refused_scope_mismatch';
  case 'growth.body_required': return 'gr_guest_refused_body_required';
  default: return 'gr_guest_refused_unknown';
  }
}

// ---- the token in the address bar ---------------------------------------------------------------

/**
 * Reads the link token out of a URL.
 *
 * THE FRAGMENT IS THE CONTRACT. `GrowthPreferenceCentreLink` and the confirm mailer both build
 * `{base}#token=…`, deliberately: a browser reads its own fragment and never transmits it, so the
 * credential stays out of paths, query strings, `Referer` headers and every server log between here
 * and the API. `search` is accepted as a SECOND source for one narrow case — the RFC 8058 one-click
 * URI has to carry its token in the query (a mail client cannot read a fragment), so a guest who
 * pastes that URI into a browser has the token in `?token=`. The fragment wins when both are present.
 *
 * Pure: it takes the two strings rather than touching `window`, so the parsing is unit-testable and
 * the page keeps the one line that reads the browser.
 */
export function tokenFromUrl (hash, search) {
  return readTokenParam(hash) || readTokenParam(search) || null;
}

function readTokenParam (value) {
  if (typeof value !== 'string' || !value) { return null; }
  const body = value.replace(/^[#?]/, '');
  if (!body) { return null; }

  for (const pair of body.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 0) { continue; }
    if (pair.slice(0, eq) !== 'token') { continue; }
    const raw = pair.slice(eq + 1);
    if (!raw) { return null; }
    try {
      // `+` is a literal in a fragment and a space in a query; `decodeURIComponent` leaves it alone,
      // which is right for both, because the backend escapes with `Uri.EscapeDataString` (which
      // percent-encodes rather than plus-encodes).
      const decoded = decodeURIComponent(raw).trim();
      return decoded || null;
    } catch (e) {
      // A malformed percent-escape is a mangled link, not a token. Treated as absent so the page
      // says "the link did not survive the trip" rather than posting rubbish to the API.
      return null;
    }
  }
  return null;
}

// ---- what the preference state means ------------------------------------------------------------

/**
 * `GrowthPreferenceStateResponse` -> the one sentence that answers "will I get these emails?".
 *
 * The three flags are not independent and their PRECEDENCE is the product rule: suppression wins over
 * consent (spec §3 invariant 4), and an unverified contact is never an eligible recipient whatever
 * else is true. Reading them in any other order would show a guest "you are subscribed" while the
 * dispatcher would never send to them.
 */
export function standing (view) {
  if (!view || typeof view !== 'object') { return 'unknown'; }
  if (view.suppressed === true) { return 'suppressed'; }
  if (view.reachable !== true) { return 'unverified'; }
  if (view.consented === true) { return 'on'; }
  return 'off';
}

/** True only when the venue may actually send. The toggle reflects this, never `consented` alone. */
export function receiving (view) {
  return standing(view) === 'on';
}

/**
 * The explanation owed when a request to turn newsletters back ON did not take effect.
 *
 * `UpdatePreferenceAsync` records a re-consent receipt but never lifts a suppression: GB4 lifts a
 * withdrawal suppression only on a fresh double-opt-in confirm click from the mailbox itself, and a
 * tick in a form is exactly the stale-form evidence class that gate excludes. So the honest outcome
 * of "turn it back on" for a suppressed contact is: nothing changed, and here is what would.
 */
export function reconsentBlocked (wanted, view) {
  return wanted === true && standing(view) === 'suppressed';
}

// ---- the capture form ---------------------------------------------------------------------------

// Deliberately permissive: `something@something.something` with no spaces. The backend does not
// validate the address at all (it hashes and encrypts whatever arrives), so this check exists to stop
// a typo becoming a pending invite nobody can ever confirm — not to adjudicate RFC 5322. A stricter
// pattern here would reject real addresses the API would have accepted, which is the worse error on a
// signup form.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What is missing before a capture may be posted, as stable field names.
 *
 * The consent tick is in this list rather than merely disabling the button, because a capture without
 * it is not a lawful capture: GDPR art. 4(11) requires an unambiguous affirmative action, and the
 * consent-text version this form pins is the evidence of what that action agreed to.
 */
export function subscribeProblems (form) {
  const problems = [];
  const email = form && typeof form.email === 'string' ? form.email.trim() : '';
  if (!EMAIL.test(email)) { problems.push('email'); }
  if (!form || form.consented !== true) { problems.push('consent'); }
  return problems;
}

/** True when the served consent wording is in a language the page is not currently showing. */
export function consentLocaleDiffers (consentText, pageLocale) {
  const locale = consentText && typeof consentText.locale === 'string' ? consentText.locale : '';
  if (!locale) { return false; }
  return locale.slice(0, 2).toLowerCase() !== languageOf(pageLocale);
}

// `no` is the app's own tag for Norwegian; the consent register's locale is BCP-47 (`nb-NO`). Mapped
// here rather than at the call site so the one place that knows both vocabularies is this one.
function languageOf (pageLocale) {
  const locale = guestLocale(pageLocale);
  return locale === 'no' ? 'nb' : locale;
}

function codeOf (error) {
  return (error && error.code) || null;
}

function detailOf (error) {
  return (error && error.message) || null;
}

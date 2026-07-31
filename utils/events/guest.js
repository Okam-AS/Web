// The guest side of Events, as pure functions: what the anonymous `/events` routes answered, turned
// into the handful of sentences a member of the public may be shown. No Vue, no network.
//
// This surface is the only part of the Events module a CUSTOMER ever sees, and it is evidence: the
// acceptance receipt the backend writes is bound to the content this page displayed. Three rules
// follow, and everything below is one of them:
//
//   1. WHAT WAS SENT, NEVER A RECOMPUTATION. Every figure is the server's own integer minor units,
//      passed through and formatted. Nothing here adds, nets or derives an amount, for the same
//      reason `utils/events/journey.js` does not: the wire carries four independent money columns
//      and no rule for combining them, so a "total to pay" would be this page inventing a price.
//
//   2. THE SERVER DECIDES WHETHER THE GUEST MAY ACT. `isActionable` is computed by
//      `EventsProposalService.GetPublicAsync` from the version's status AND its expiry against the
//      server clock. It is read, never re-derived: a browser whose clock is a day fast would
//      otherwise hide a live offer, and one a day slow would show an accept button that cannot work.
//
//   3. AN OFFER THAT CANNOT BE ACCEPTED SAYS SO, AND SAYS WHICH. Superseded, expired, already
//      accepted and already declined are four different facts about a guest's booking, and the one
//      thing none of them may do is quietly render as a fifth: a page showing current numbers under
//      an old link, or a bare 404 for a link the venue really did send.

import { readMinor, readInstant } from '~/utils/events/journey';

// ---- how the read can have gone -----------------------------------------------------------------

/** The read answered and the proposal is in hand. */
export const GUEST_HELD = 'held';
/**
 * 404 `EVENTS_PROPOSAL_NOT_FOUND`. The token matches no SENT version: a mistyped or truncated link,
 * or a draft that was never sent. It is NOT "the offer was withdrawn" and must not read as one.
 */
export const GUEST_NOT_FOUND = 'not-found';
/**
 * 404 `EVENTS_DISABLED`. The module is dark, so the route refuses before it looks anything up. The
 * offer may well exist; this says nothing about it, and the guest is told to contact the venue
 * rather than that their link is wrong.
 */
export const GUEST_UNAVAILABLE = 'unavailable';
/** Anything else, including no answer at all. Nothing is claimed about the offer. */
export const GUEST_UNKNOWN = 'unknown';

/**
 * Reads `GET /events/proposals/{token}` into the four states above.
 *
 * `view` is null unless the read HELD one, so no caller can render a field off a refusal.
 */
export function readGuestProposal (payload, error) {
  if (error) {
    return { state: stateOfError(error), view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!payload || typeof payload !== 'object') {
    return { state: GUEST_UNKNOWN, view: null, code: null, detail: null };
  }
  return { state: GUEST_HELD, view: payload, code: null, detail: null };
}

/** The same four states for `GET /events/deposits/{token}`, whose refusals are the same family. */
export function readGuestDeposit (payload, error) {
  if (error) {
    const state = error.code === 'EVENTS_DEPOSIT_NOT_FOUND' ? GUEST_NOT_FOUND : stateOfError(error);
    return { state, view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!payload || typeof payload !== 'object') {
    return { state: GUEST_UNKNOWN, view: null, code: null, detail: null };
  }
  return { state: GUEST_HELD, view: payload, code: null, detail: null };
}

function stateOfError (error) {
  if (!error) { return GUEST_UNKNOWN; }
  if (error.code === 'EVENTS_DISABLED') { return GUEST_UNAVAILABLE; }
  if (error.code === 'EVENTS_PROPOSAL_NOT_FOUND' || error.code === 'EVENTS_NOT_FOUND') { return GUEST_NOT_FOUND; }
  return GUEST_UNKNOWN;
}

function codeOf (error) {
  return (error && error.code) || null;
}

function detailOf (error) {
  return (error && error.message) || null;
}

// ---- what the guest may do with the proposal ----------------------------------------------------

/** `isActionable` — the version is Sent and unexpired. The ONLY stance that offers accept/decline. */
export const STANCE_OPEN = 'open';
/** The guest already accepted this version. Their own act, reported back to them. */
export const STANCE_ACCEPTED = 'accepted';
/** The guest already declined it. */
export const STANCE_DECLINED = 'declined';
/** A newer version has since been sent, so this one no longer stands (EV-03). */
export const STANCE_SUPERSEDED = 'superseded';
/** The window to accept has passed, whether the sweep has stamped it yet or not. */
export const STANCE_EXPIRED = 'expired';
/** The server named a state this page has no sentence for. Nothing is offered and nothing is claimed. */
export const STANCE_UNKNOWN = 'unknown';

/**
 * The one gate on the accept and decline controls.
 *
 * `isActionable` decides ALONE whether anything may be offered; the status only decides which
 * sentence explains a closed offer. A `Sent` version that is not actionable is one whose expiry has
 * passed but whose sweep has not run yet — the server already treats it as closed
 * (`AcceptAsync` re-checks the clock and throws `EVENTS_PROPOSAL_EXPIRED`), so the page says expired
 * rather than showing a button that is guaranteed to be refused.
 */
export function proposalStance (view) {
  if (!view || typeof view !== 'object') { return STANCE_UNKNOWN; }
  if (view.isActionable === true) { return STANCE_OPEN; }

  switch (view.status) {
  case 'Accepted': return STANCE_ACCEPTED;
  case 'Declined': return STANCE_DECLINED;
  case 'Superseded': return STANCE_SUPERSEDED;
  case 'Expired': return STANCE_EXPIRED;
  case 'Sent': return STANCE_EXPIRED;
  default: return STANCE_UNKNOWN;
  }
}

/** True only for the one stance that may show an accept or a decline control. */
export function canAct (view) {
  return proposalStance(view) === STANCE_OPEN;
}

// ---- what the guest may do with the deposit -----------------------------------------------------

/** A provider redirect is in hand and the deposit is still collectable: the pay button is real. */
export const DEPOSIT_PAYABLE = 'payable';
/**
 * The deposit is on the Stripe embedded-form rail, which THIS page cannot complete: there is no
 * hosted Stripe page in the backend, and `EventsDepositPaymentPortAdapter.Initiate` cannot even
 * create a Stripe deposit on this branch (`EVENTS_PAYMENT_PROVIDER`). A form rendered here would be
 * a control that looks like payment and is not, so the guest is told to contact the venue instead.
 */
export const DEPOSIT_RAIL_UNSUPPORTED = 'rail-unsupported';
/** Paid, including a late payment the venue still has to resolve. Money has left the guest. */
export const DEPOSIT_PAID = 'paid';
/** Money has come back, in whole or in part. */
export const DEPOSIT_REFUNDED = 'refunded';
/** The venue kept the deposit under the terms of the cancellation. */
export const DEPOSIT_FORFEITED = 'forfeited';
/** The payment window closed before it was paid. */
export const DEPOSIT_EXPIRED = 'expired';
/** The attempt failed at the provider. */
export const DEPOSIT_FAILED = 'failed';
/** Collectable in principle, but the answer carried no way to pay. Nothing is offered. */
export const DEPOSIT_NO_AFFORDANCE = 'no-affordance';
/** A status this page has no sentence for. Shown verbatim, never mapped onto one of the above. */
export const DEPOSIT_UNKNOWN = 'unknown';

/**
 * The deposit page's stance, decided on the SETTLED facts before the collectable ones.
 *
 * Order matters and is the whole content of this function: a paid deposit whose link has since
 * expired is PAID, not expired, and telling a guest their paid deposit expired is the worst sentence
 * this page could produce. So terminal money facts are read first, the clock second, and only a
 * deposit that is genuinely still owed is offered a way to pay.
 */
export function depositStance (view) {
  if (!view || typeof view !== 'object') { return DEPOSIT_UNKNOWN; }

  switch (view.status) {
  case 'Paid':
  case 'LatePaid':
  case 'Quarantined':
    return DEPOSIT_PAID;
  case 'Refunded':
  case 'PartiallyRefunded':
    return DEPOSIT_REFUNDED;
  case 'Forfeited':
    return DEPOSIT_FORFEITED;
  case 'Failed':
    return DEPOSIT_FAILED;
  case 'Expired':
    return DEPOSIT_EXPIRED;
  }

  if (view.isExpired === true) { return DEPOSIT_EXPIRED; }

  if (view.providerRedirectUrl) { return DEPOSIT_PAYABLE; }
  if (view.stripeClientSecret) { return DEPOSIT_RAIL_UNSUPPORTED; }

  return view.status === 'Requested' || view.status === 'Pending'
    ? DEPOSIT_NO_AFFORDANCE
    : DEPOSIT_UNKNOWN;
}

/**
 * The provider link, and ONLY when the stance says it is live.
 *
 * Read through the stance rather than off the field, so a redirect the server left on a settled row
 * can never become a second payment button.
 */
export function depositPaymentUrl (view) {
  return depositStance(view) === DEPOSIT_PAYABLE ? view.providerRedirectUrl : null;
}

// ---- money --------------------------------------------------------------------------------------

/**
 * Integer minor units + the proposal's OWN currency code -> a string, or null.
 *
 * The currency is the one the version was priced in, never the market this website was built for:
 * printing "kr" over a CHF figure relabels money, and this page is read by the guest of a venue that
 * may not be in the reader's country at all.
 *
 * Null when the amount did not arrive as an integer (see `readMinor`) OR when no currency code did.
 * An amount with no denomination is not a price, and the page prints a dash and says why rather than
 * showing a bare number a guest would read in whatever currency they assume.
 */
export function formatMoney (minor, currencyCode, locale) {
  const value = readMinor(minor);
  const currency = normaliseCurrency(currencyCode);
  if (value === null || !currency) { return null; }

  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  } catch (e) {
    // An environment without the currency's data still owes the guest the figure and the code, so
    // the amount is printed with the ISO code beside it rather than swallowed.
    return (value / 100).toFixed(2) + ' ' + currency;
  }
}

/** A quantity as the venue entered it: whole counts stay whole, fractions keep what they carry. */
export function formatQuantity (value, locale) {
  if (typeof value !== 'number' || !isFinite(value)) { return null; }
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 3 }).format(value);
}

/**
 * A line's VAT rate as a percentage, or null.
 *
 * `VatRate` is a fraction (0.25) and it is venue-configured data, never an Okam tax determination.
 * It is shown as the rate the venue wrote and nothing is computed from it: the wire says nothing
 * about whether the line amounts include it, so a VAT AMOUNT here would be a tax claim this product
 * is not entitled to make.
 */
export function formatVatRate (rate, locale) {
  if (typeof rate !== 'number' || !isFinite(rate) || rate < 0) { return null; }
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(rate * 100);
}

function normaliseCurrency (code) {
  const raw = typeof code === 'string' ? code.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(raw) ? raw : null;
}

// `no` is not a BCP-47 region and Intl treats it as Norwegian, which is right; `nb-NO` is spelled out
// so number and date formats resolve to Bokmål rather than to the runtime's default.
const INTL_LOCALES = { no: 'nb-NO', en: 'en-GB', de: 'de-CH' };

export function intlLocale (locale) {
  return INTL_LOCALES[locale] || INTL_LOCALES.no;
}

// ---- time ---------------------------------------------------------------------------------------

/**
 * `eventDate` -> a long, written-out day in the guest's language.
 *
 * The date is SLICED, never converted: `EventsEvent.EventDate` is a date column holding a bare
 * midnight, so running it through any zone is how a party on the 15th is shown on the 14th. Formatted
 * in UTC against the parts, which is the same thing the admin journey does with the same value.
 */
export function formatEventDay (value, locale) {
  const key = typeof value === 'string' ? value.slice(0, 10) : '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) { return null; }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (isNaN(date.getTime())) { return null; }

  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(date);
}

/**
 * A `…AtUtc` instant IN THE READER'S OWN ZONE, with the zone named on it.
 *
 * This is the one place the guest surface deliberately parts company with the admin rule that an
 * instant is only ever placed in the venue's zone. The admin rule exists because a venue's business
 * data belongs to the venue's clock, and `EventsPublicProposalView` carries no `timeZoneId` anyway.
 * But the deadline for a GUEST to accept is a fact about the guest's own day, and withholding it
 * would leave the only time-critical number on the page blank. The zone is printed with it
 * (`timeZoneName`), so the reader can see which clock the deadline is on and is never left assuming.
 */
export function formatDeadline (value, locale) {
  const instant = readInstant(value);
  if (!instant) { return null; }

  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(instant);
}

/** True when a deadline exists and has passed by the reader's clock. Presentation only. */
export function deadlineHasPassed (value, now) {
  const instant = readInstant(value);
  if (!instant) { return false; }
  return instant.getTime() <= (now instanceof Date ? now.getTime() : Date.now());
}

// ---- what a refusal says to a guest -------------------------------------------------------------

/**
 * `EVENTS_*` -> the translation key for the sentence a GUEST gets.
 *
 * Keyed on the stable machine code, never on `detail`, which is English server prose. The prose is
 * still shown beneath the sentence (see `evg_refused_detail`): a guest who cannot accept is owed the
 * server's own reason, not only our paraphrase of it.
 */
const REFUSAL_KEYS = {
  EVENTS_PROPOSAL_SUPERSEDED: 'ev_guest_refused_superseded',
  EVENTS_PROPOSAL_EXPIRED: 'ev_guest_refused_expired',
  EVENTS_ALREADY_ACCEPTED: 'ev_guest_refused_already_accepted',
  EVENTS_PROPOSAL_NOT_FOUND: 'ev_guest_refused_not_found',
  EVENTS_DEPOSIT_NOT_FOUND: 'ev_guest_refused_not_found',
  EVENTS_DISABLED: 'ev_guest_refused_unavailable',
  EVENTS_STATE: 'ev_guest_refused_state',
  EVENTS_CONFLICT: 'ev_guest_refused_conflict',
  EVENTS_VALIDATION: 'ev_guest_refused_validation',
  RATE_LIMITED: 'ev_guest_refused_rate_limited'
};

export function refusalKey (code) {
  return REFUSAL_KEYS[code] || 'ev_guest_refused_other';
}

/** 429 from the inquiry limiter: not a problem+json body, so it never carries an `EVENTS_*` code. */
export const GUEST_RATE_LIMITED = 'RATE_LIMITED';

// ---- the guest's own input ----------------------------------------------------------------------

/**
 * The acceptance identity is EVIDENCE: `EventsProposalAcceptRequest` is written straight onto the
 * append-only acceptance receipt, and the backend validates neither field. So the check lives here,
 * and it blocks the submit rather than trimming or defaulting anything: a receipt naming nobody is
 * worth less than a receipt that was never written, and a name this page invented is worth less
 * still.
 *
 * The email test is deliberately shallow (something, an @, something with a dot). Anything stricter
 * rejects real addresses, and this is a record of who clicked, not a delivery attempt.
 */
export function acceptorProblems (form) {
  const problems = [];
  const name = String((form && form.acceptorName) || '').trim();
  const email = String((form && form.acceptorEmail) || '').trim();

  if (!name) { problems.push('acceptorName'); }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { problems.push('acceptorEmail'); }

  return problems;
}

/**
 * The enquiry form's own required fields, mirroring `EventsInquiryService.ValidateContact` plus its
 * guest-count guard. It narrows nothing the server accepts and widens nothing it refuses; the server
 * is still the one that decides, and its refusal is rendered when it disagrees.
 */
export function inquiryProblems (form) {
  const problems = [];
  const name = String((form && form.contactName) || '').trim();
  const email = String((form && form.contactEmail) || '').trim();
  const day = String((form && form.eventDate) || '').trim();
  const guests = form && form.guestCountPlanned;

  if (!name) { problems.push('contactName'); }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { problems.push('contactEmail'); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { problems.push('eventDate'); }
  if (!(typeof guests === 'number' && guests > 0)) { problems.push('guestCountPlanned'); }

  return problems;
}

/**
 * The guest's language: the one the URL put them in if this page has a copy of it, otherwise
 * Norwegian, which is the source language of this product and of every venue that runs it today.
 * Never the operator's stored `adminLocale`, which belongs to whoever last used this browser for
 * admin work and says nothing about the guest.
 */
export const GUEST_LOCALES = ['no', 'en', 'de'];

export function guestLocale (routeLocale) {
  return GUEST_LOCALES.includes(routeLocale) ? routeLocale : 'no';
}

// What the market card is allowed to SAY — the refusal classification, the copy key each refusal
// maps to, and the two option lists the form offers. Kept out of the component so the claim each
// sentence makes can be reviewed and tested in one place rather than read out of a template.
//
// THE DISTINCTION THIS FILE EXISTS FOR. The market surface has two families of refusal and they are
// not the same kind of event:
//
//   • 400 — the SHAPE is wrong. The operator sent values the platform cannot honour and can fix them
//     by sending different ones. This reads as a validation error, because it is one.
//   • 409 — the shape is fine and the store is OPERATING. `timezone-change-unsafe` and
//     `currency-change-unsafe` fire because the store already has business dates computed under one
//     clock, or money labelled in one currency, and neither is ever re-derived. Nothing the operator
//     types will make these pass. Rendering them as a red validation box would tell a venue owner to
//     go and correct a typo that does not exist, so they get their own kind, their own heading, and
//     copy that names what is already recorded.
//
// Nothing here re-implements a backend check. The form offers choices and mirrors refusals; every
// decision about what is acceptable is still made by `StoreMarketService`/`StoreMarketAuthority` on
// the server, and this page's own country→currency expectation is submitted as an ASSERTION so that
// a disagreement with the platform surfaces as `currency-not-authoritative` instead of being trusted.

import { isStoreMarketApiError } from '~/utils/store-market/market-client';

/** A 400: the values can be corrected and re-sent. */
export const REFUSAL_SHAPE = 'shape';
/** A 409: the store is operating and re-pointing it would split the meaning of existing rows. */
export const REFUSAL_OPERATING = 'operating';
/** 403 — not a store admin (the surface never leaks whether the store exists). */
export const REFUSAL_DENIED = 'denied';
/** 401 — the session is gone. */
export const REFUSAL_UNAUTHENTICATED = 'unauthenticated';
/** 404 with `store.market.store-not-found`. */
export const REFUSAL_MISSING = 'missing';
/** A typed refusal carrying a code this page has no sentence of its own for. */
export const REFUSAL_UNTYPED = 'untyped';
/** Not a refusal at all — the request never got an answer, so nothing was decided. */
export const REFUSAL_TRANSPORT = 'transport';

// code → the kind it is and the sentence it gets. Route-for-route with
// `Models/Store/StoreMarketUpdateResult.cs` → `StoreMarketProblemCodes`.
const REFUSALS = {
  'store.market.country-invalid': { kind: REFUSAL_SHAPE, key: 'sm_refuse_country_invalid' },
  'store.market.currency-underivable': { kind: REFUSAL_SHAPE, key: 'sm_refuse_currency_underivable' },
  'store.market.currency-not-authoritative': { kind: REFUSAL_SHAPE, key: 'sm_refuse_currency_not_authoritative' },
  'store.market.timezone-missing': { kind: REFUSAL_SHAPE, key: 'sm_refuse_timezone_missing' },
  'store.market.timezone-unresolvable': { kind: REFUSAL_SHAPE, key: 'sm_refuse_timezone_unresolvable' },
  'store.market.timezone-change-unsafe': { kind: REFUSAL_OPERATING, key: 'sm_refuse_timezone_change_unsafe' },
  'store.market.currency-change-unsafe': { kind: REFUSAL_OPERATING, key: 'sm_refuse_currency_change_unsafe' },
  'store.market.store-not-found': { kind: REFUSAL_MISSING, key: 'sm_refuse_store_not_found' }
};

const NOTHING = {};

/**
 * Classifies a failed market write into something the card can render honestly.
 *
 * `attempted` is what was sent (`{ country, timeZone, expectedCurrencyCode }`) and `state` is the
 * market the card will go on displaying — the UNCHANGED state the refusal itself carries, falling
 * back to the state already loaded. Both are needed because the two 409 sentences have to name
 * concrete values: the clock the store's stored dates were computed under, and the currency its
 * money is already labelled in. Neither is in the code, and neither is guessed.
 *
 * `platformDetail` is the server's own sentence, verbatim. It is shown BESIDE the page's sentence,
 * never instead of it — for `currency-not-authoritative` it holds the only copy of the currency the
 * platform actually derived, and for an unknown code it is the only thing there is to show.
 */
export function classifyRefusal (error, attempted, state) {
  // A raw network rejection never reached the platform, so no decision was made about the market.
  // Saying "refused" here would invent a verdict that does not exist.
  if (!isStoreMarketApiError(error)) {
    return { kind: REFUSAL_TRANSPORT, code: null, key: 'sm_refuse_transport', params: NOTHING, platformDetail: null };
  }

  const sent = attempted || NOTHING;
  const now = state || NOTHING;
  const detail = error.message || null;

  // 401/403 arrive with an empty body, so they carry no code to branch on — status is all there is.
  if (error.status === 401) {
    return { kind: REFUSAL_UNAUTHENTICATED, code: error.code, key: 'sm_refuse_unauthenticated', params: NOTHING, platformDetail: null };
  }
  if (error.status === 403) {
    return { kind: REFUSAL_DENIED, code: error.code, key: 'sm_refuse_denied', params: NOTHING, platformDetail: null };
  }

  const known = REFUSALS[error.code];
  if (!known) {
    return { kind: REFUSAL_UNTYPED, code: error.code, key: 'sm_refuse_untyped', params: NOTHING, platformDetail: detail };
  }

  return {
    kind: known.kind,
    code: error.code,
    key: refusalKey(error.code, known.key, sent),
    params: refusalParams(error.code, sent, now),
    platformDetail: detail
  };
}

// One backend code can still need two sentences when it covers two situations an operator
// experiences differently. `country-invalid` is answered both for a wrong code and for none at all —
// the backend renders "(none)" in its own message for exactly that reason — and quoting «» back at
// someone who simply had not chosen yet would be worse than saying so. Same refusal, same kind, the
// sentence that fits.
function refusalKey (code, fallbackKey, sent) {
  if (code === 'store.market.country-invalid' && !String(sent.country || '').trim()) {
    return 'sm_refuse_country_missing';
  }
  return fallbackKey;
}

function refusalParams (code, sent, now) {
  switch (code) {
  case 'store.market.country-invalid':
  case 'store.market.currency-underivable':
    return { country: sent.country };
  case 'store.market.currency-not-authoritative':
    return { country: sent.country, expected: sent.expectedCurrencyCode };
  case 'store.market.timezone-unresolvable':
    return { zone: sent.timeZone };
  case 'store.market.timezone-change-unsafe':
    // `currentIsFallback` is not interpolated into the sentence; it tells the card to append the
    // same "platform default" note the read view uses, so the operator learns that the clock their
    // history was computed under was never chosen for this venue either.
    return {
      current: now.effectiveTimeZone,
      currentIsFallback: now.timeZoneIsFallback === true,
      requested: sent.timeZone
    };
  case 'store.market.currency-change-unsafe':
    return { stored: now.currencyCode };
  default:
    return NOTHING;
  }
}

/**
 * The countries a store can be MOVED INTO from this card: the markets that have a working-time rule
 * pack seeded. Today that is Norway alone.
 *
 * This is not a style preference, it is the difference between a setting that works and one that
 * looks like it worked. `Store.Country` selects the jurisdiction whose rule pack Workforce resolves,
 * and a country with no seeded pack configures perfectly and then refuses every schedule from the
 * draft onward with `workforce.rule-pack-unresolved` — two screens away from this form, with nothing
 * connecting the two. So the list offers what can actually be published for, and the card says out
 * loud why the others are absent rather than letting a venue owner find out later.
 *
 * The backend is deliberately WIDER than this (it accepts any ISO 3166-1 alpha-2 country it can
 * derive a currency for) and stays that way: nothing here weakens or replaces that check. This is a
 * narrower OFFER, not a narrower rule.
 */
export const RULE_PACK_COUNTRIES = ['NO'];

/** Whether Workforce has a working-time rule pack for a country — see `RULE_PACK_COUNTRIES`. */
export function hasRulePack (country) {
  return !!country && RULE_PACK_COUNTRIES.includes(country);
}

/**
 * The facts about a market that change what the card renders.
 *
 * `blocksSchedulePublish` is why this card was built, and it has TWO causes that need different
 * sentences. With no country at all there is no jurisdiction; with a country whose rule pack is not
 * seeded there is a jurisdiction nobody has written rules for. Either way Workforce publish refuses
 * every week forever (`workforce.rule-pack-unresolved`), and a venue owner staring at that error has
 * no way to connect it to a column on the dashboard — so the card connects it.
 *
 * `usesPlatformDefaultZone` mirrors `TimeZoneIsFallback`: an unset zone is not inert — every business
 * date already comes out of the platform fallback, and an operator who cannot see that has no way to
 * know their venue's days are being cut in the wrong place.
 */
export function marketFacts (market) {
  const m = market || NOTHING;
  const countryHasRulePack = hasRulePack(m.country);
  return {
    hasCountry: !!m.country,
    hasCurrency: !!m.currencyCode,
    hasChosenZone: !!m.timeZone,
    usesPlatformDefaultZone: m.timeZoneIsFallback === true,
    isConfigured: m.isConfigured === true,
    countryHasRulePack,
    blocksSchedulePublish: !m.country || !countryHasRulePack
  };
}

/**
 * The countries the form offers: the platform's own market registry (`config/edition.js`), narrowed
 * to the markets a schedule can be published for (see `RULE_PACK_COUNTRIES`).
 *
 * The registry is the source rather than a fresh country list because it is already the single source
 * for what market this app is built for, and it carries the currency each market means — so the card
 * has an expectation to ASSERT without inventing a second country→currency derivation to compete with
 * `StoreMarketAuthority`.
 *
 * A store whose stored country is not in that offer keeps an option of its own, marked as such, so
 * the form can never silently propose to move it somewhere else — and its missing rule pack is
 * reported rather than hidden. That option asserts NO currency: the page holds no expectation for it,
 * and stating one it does not have would be a guess.
 */
export function countryOptions (markets, currentCountry) {
  const options = Object.keys(markets || NOTHING)
    .map(key => markets[key])
    .filter(entry => entry && entry.country && hasRulePack(entry.country))
    .map(entry => ({
      country: entry.country,
      expectedCurrencyCode: entry.currency || null,
      offered: true,
      hasRulePack: true
    }))
    .sort((left, right) => (left.country < right.country ? -1 : left.country > right.country ? 1 : 0));

  if (currentCountry && !options.some(option => option.country === currentCountry)) {
    options.unshift({
      country: currentCountry,
      expectedCurrencyCode: null,
      offered: false,
      hasRulePack: hasRulePack(currentCountry)
    });
  }

  return options;
}

/** The chosen option, or null — used to show the currency the choice implies before it is saved. */
export function optionFor (options, country) {
  return (options || []).find(option => option.country === country) || null;
}

/**
 * Time-zone suggestions, taken from the runtime's own IANA database rather than a hand-kept list —
 * the same database `TimeZoneInfo.FindSystemTimeZoneById` loads from on the server.
 *
 * They are SUGGESTIONS on a free-text field, not a closed set, for two reasons: the backend also
 * accepts Windows ids ("W. Europe Standard Time"), and a runtime without `Intl.supportedValuesOf`
 * would otherwise leave the operator with nothing to pick. Validation stays entirely on the server,
 * which is the only place that can answer whether a zone loads.
 */
export function zoneSuggestions (currentZone) {
  const supported = (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function')
    ? Intl.supportedValuesOf('timeZone')
    : [];

  const zones = supported.slice();
  if (currentZone && !zones.includes(currentZone)) {
    zones.unshift(currentZone);
  }
  return zones;
}

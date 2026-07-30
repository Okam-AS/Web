// The routes for a store's MARKET — `Store.Country`, the currency that market implies, and the time
// zone this venue's business dates are cut in (`Controllers/StoreMarketController.cs`).
//
// WHY IT IS NOT IN `core/services/store-service.ts`. That file is the estate's stated contract
// boundary for store settings, and a market write genuinely belongs beside `UpdateAddress` and
// `UpdateOpeningHours`. But `core/` is a git SUBMODULE (`.gitmodules` → Okam-AS/Core) and this repo
// carries no checkout of it — the existing component tests already record the consequence: "a git
// submodule this repo carries no checkout of, so it cannot be imported here". A method added there
// would have to be committed to a second repository and its pin moved, which is a separate change
// with its own review, and it would have left the owner unable to set a market in the meantime. So
// the route lives where every other restaurant-module route on this branch lives — `utils/<module>/`,
// on the one shared transport. Moving it into `store-service.ts` later changes the import in
// `StoreMarketCard.vue` and nothing else.
//
// WHY IT IS NOT `WorkforceApiError`. The market surface answers a refusal with its own envelope —
// `{ code, message, market }` — not RFC 9457 problem+json. `code` happens to line up, but the human
// sentence is on `message` where `WorkforceApiError` reads `detail` (so every refusal would render
// as "HTTP 400"), and `market` has no equivalent at all. `market` is the load-bearing field: a
// refusal returns the store's UNCHANGED state, which is what lets the card keep showing the truth
// after a failed save instead of the values the operator typed.

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';

/**
 * A typed market refusal.
 *
 * `code` is the stable `store.market.*` contract (`Models/Store/StoreMarketUpdateResult.cs`
 * → `StoreMarketProblemCodes`). Callers branch on `code` and `status`, never on `message`, which is
 * server prose — though `message` is shown to the operator as the platform's own words alongside the
 * page's sentence, because for three of the refusals it names a value the client does not hold (the
 * authoritative derived currency, and which history anchors exist).
 *
 * `market` is null rather than absent when the refusal predates a state — `store-not-found` carries
 * none — so a caller can never read "absent" as "the store has an empty market".
 */
export class StoreMarketApiError extends Error {
  constructor (status, body) {
    const envelope = body || {};
    super(envelope.message || ('HTTP ' + status));
    this.name = 'StoreMarketApiError';
    // `instanceof` against a subclassed Error does not survive an ES5 transpile, so callers
    // discriminate on this flag — the same transpile-proof rule the shared base documents.
    this.isStoreMarketApiError = true;
    this.status = status;
    this.code = envelope.code || null;
    this.market = envelope.market || null;
    this.body = body || null;
  }
}

/** True for a typed market refusal, transpile-proof (see the flag's comment). */
export function isStoreMarketApiError (error) {
  return !!(error && error.isStoreMarketApiError);
}

/**
 * The store-market client, route-for-route with `StoreMarketController`.
 *
 * It extends the shared workforce transport and replaces ONLY the thrown error type; nothing about
 * the request is re-implemented, so a change to auth or parsing still lands in one place.
 *
 * NO `Idempotency-Key`. The Workforce surface refuses a mutation without one; this controller reads
 * no such header, and the write is idempotent by construction instead — `StoreMarketService.Update`
 * accepts a repeat of the same market and deliberately writes no audit row for it. Sending a header
 * the server never reads would imply a contract that does not exist.
 */
export class StoreMarketService extends WorkforceClientBase {
  async _request (method, path, options) {
    try {
      return await super._request(method, path, options);
    } catch (error) {
      // The base throws its own type for any non-2xx; re-key it onto the market envelope. A raw
      // network rejection (offline, DNS) is NOT a typed refusal and propagates untouched, so a
      // caller can never mistake "the request never happened" for a decision the platform made.
      if (isWorkforceApiError(error)) {
        throw new StoreMarketApiError(error.status, error.problem);
      }
      throw error;
    }
  }

  /** The store's market, including the zone its business dates ACTUALLY resolve to today. */
  Get (storeId) {
    return this._request('GET', '/stores/' + storeId + '/market');
  }

  /**
   * Sets the store's market.
   *
   * THERE IS NO CURRENCY ARGUMENT, and that is the contract rather than an omission: under the
   * ratified market-authority law the market is the single source and `Store.CurrencyCode` DERIVES
   * from the country (`Helpers/StoreMarketAuthority.TryDeriveCurrency`). `expectedCurrencyCode` is
   * an ASSERTION the caller may state — a currency the market does not imply is refused loudly with
   * `store.market.currency-not-authoritative` rather than reconciled. That is the law's consistency
   * guard, and it is how this page's own market list is checked against the platform instead of
   * being trusted as a second authority.
   *
   * An absent or blank assertion is OMITTED from the body rather than sent as `null`: the backend
   * treats blank as "no assertion", and a caller that has no expectation should not appear to make
   * an empty one.
   */
  Update (storeId, market) {
    const requested = market || {};
    const body = { country: requested.country, timeZone: requested.timeZone };
    if (requested.expectedCurrencyCode) {
      body.expectedCurrencyCode = requested.expectedCurrencyCode;
    }
    return this._request('PUT', '/stores/' + storeId + '/market', { body });
  }
}

export default StoreMarketService;

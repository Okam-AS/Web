// The Company Meals STORE (venue) client — the two reads a restaurant admin needs to walk the one
// journey this surface proves: an agreement, and the orders funded against it.
//
// It is deliberately route-for-route with the backend and adds nothing. Endpoint numbers are the
// ones the backend's own XML docs use (Controllers/Meals/*.cs):
//
//   GET /v1/stores/{storeId}/meals/companies       #—   MealsCompanyController.ListForStore
//   GET /v1/stores/{storeId}/meals/orders          #16  MealsReconciliationController.ListStoreOrders
//
// WHY ONLY TWO HERE. These are the STORE-scoped reads, and they are all of them. The company-scoped
// surface — the company account, corridor signing, programmes, policy versions, invitations and
// memberships — is bound by `utils/meals/admin-client.js`, which is a separate file because it sits
// behind a separate gate (the module-wide `Features:Meals` config rather than the per-store
// `meals.module` override) and a separate authority (Okam concierge / company admin rather than
// StoreAdmin). The remaining families — funding, reconciliation and statements — are behind their
// own sub-flags and belong to surfaces that do not exist yet; a client method for a route no screen
// can exercise would be the "four client functions calling routes that never existed" defect the
// workforce lane already paid for.
//
// TRANSPORT IS SHARED, NOT COPIED. `WorkforceClientBase` is the repo's one HTTP layer: base URL,
// bearer header, JSON handling and the typed problem+json error. Nothing in it is workforce-specific
// — the name is historical — and `utils/workforce/api-client.js` exists precisely because two lanes
// each grew their own copy of it and the copies drifted. So this extends it rather than making a
// third copy, and the Meals-specific knowledge (which refusals mean what) lives in `refusalOf`
// below, where it can be tested without a network.

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';

/** The `meals.*` problem-code family. A code outside it did not come from this module. */
const MEALS_CODE_PREFIX = 'meals.';

// ---- Refusal kinds ------------------------------------------------------------------------------
//
// These are what the page renders sentences from. They are five DIFFERENT claims and are never
// collapsed, because collapsing them is how "we could not read this" becomes "this venue has no
// company agreements".

/**
 * 404 carrying a `meals.*` problem document. The module answered: it is deployed, its route is
 * bound, and it is declining to say anything about this store's Meals resources — either because
 * `meals.module` is off for this store or because there is nothing there.
 *
 * <b>This is the exact limit of Meals' darkness, and the UI must not claim more.</b> A wire test on
 * the backend (`MealsWireTests.PINNED_a_dark_route_is_already_distinguishable_from_a_path_that_is_
 * not_routed`) established that a dark Meals route answers `application/problem+json` while an
 * unrouted path answers 404 with an EMPTY body. So what Meals hides is which company/program exists,
 * not that the module is deployed — and the copy keyed on this constant says exactly that much.
 */
export const REFUSAL_DARK = 'dark';

/**
 * 404 with no `meals.*` code — an empty-bodied routing 404, or some other 404 that is not this
 * module's. The module did not answer, so nothing may be claimed about this store's agreements.
 */
export const REFUSAL_ABSENT = 'absent';

/** 403: the caller is not a StoreAdmin for this store (`MealsStoreAccess` → the platform policy). */
export const REFUSAL_FORBIDDEN = 'forbidden';

/** 401: no usable token. */
export const REFUSAL_UNAUTHENTICATED = 'unauthenticated';

/** Anything else — a 500, a network failure, a body that did not parse. The read did not answer. */
export const REFUSAL_UNKNOWN = 'unknown';

/**
 * Classifies a failed Meals read into one of the five kinds above.
 *
 * The 404 split keys on the problem CODE rather than on "was the body empty", and it requires the
 * `meals.` prefix rather than merely "some code was present". That is the strict direction: an
 * unrouted 404 has no code at all, and a 404 minted by anything other than this module has no
 * `meals.*` code either, so neither can be reported as "the Meals module answered". Only a document
 * this module demonstrably wrote earns `REFUSAL_DARK`.
 *
 * Returns null for a non-error, so callers can write `refusalOf(err) || null` without branching.
 */
export function refusalOf (error) {
  if (!error) { return null; }
  if (!isWorkforceApiError(error)) { return REFUSAL_UNKNOWN; }

  if (error.status === 401) { return REFUSAL_UNAUTHENTICATED; }
  if (error.status === 403) { return REFUSAL_FORBIDDEN; }
  if (error.status === 404) {
    const code = error.code;
    return (typeof code === 'string' && code.indexOf(MEALS_CODE_PREFIX) === 0)
      ? REFUSAL_DARK
      : REFUSAL_ABSENT;
  }
  return REFUSAL_UNKNOWN;
}

/**
 * The store-scoped Meals reads.
 *
 * Both are GETs and neither carries an `Idempotency-Key`; there is no mutation on THIS service, so
 * `_mutate` is deliberately never called here (`MealsAdminService` calls it for every one of its
 * writes). The one store-scoped Meals mutation that exists
 * (`POST /v1/meals/reconciliation/{exceptionId}/resolve`) gates on the module-wide config flag
 * rather than the per-store one, so it can be dark while these two reads answer — and resolving a
 * reconciliation exception is a different surface's job either way. It is absent here rather than
 * present and broken.
 */
export class MealsStoreService extends WorkforceClientBase {
  /**
   * The store's Company Meals directory: one row per buying company that has an AGREEMENT with this
   * store, carrying that agreement's id, status and currency plus the company's active-member count.
   *
   * This is the "agreement" half of the journey. It is a server-side projection over
   * `MealsAgreements` joined to `MealsCompanies`; a company whose agreement exists but whose company
   * row does not is skipped by the server, which is why an order can reference a company this list
   * does not contain (the view models that as an UNLISTED company rather than dropping the order).
   *
   * Answers 404 when `meals.module` is off FOR THIS STORE (the per-store override, not the
   * module-wide config flag), and 403 when the caller is not a StoreAdmin here.
   */
  ListCompanies (storeId) {
    return this._request('GET', '/v1/stores/' + storeId + '/meals/companies');
  }

  /**
   * #16: every order at this store attributed to a company account, across all buying companies.
   *
   * Takes NO company filter — the route has no query parameter, so the store's whole attributed set
   * comes back and the view groups it. It is NOT paged either; there is no cursor in the contract,
   * so nothing here pretends to page.
   *
   * Money on each row (`reservedCapMinor`, `boundCartTotalMinor`, `capturedMinor`) is minor units
   * computed server-side per order. `capturedMinor` is the NET of that reservation's allocations
   * (capture positive, reversal negative), already rounded once by the backend.
   */
  ListOrders (storeId) {
    return this._request('GET', '/v1/stores/' + storeId + '/meals/orders');
  }
}

export default MealsStoreService;

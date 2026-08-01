// The per-store module feature-flag API — the PLATFORM surface, shared by every module.
//
// WHY IT LIVES HERE AND NOT UNDER A MODULE. `StoreFeatureFlagsController` is one controller that
// owns the flags of all six modules: Workforce, Margin, Training, Events, Meals and Growth each
// contribute descriptors to one catalog, and one route reads and writes every store's overrides.
// The read half of it grew inside `utils/growth/growth-client.js` because Growth was the first
// caller that needed it; that file's own header says the class is "the ONE route this surface calls
// that is not under /v1/growth". Six modules deep, that is no longer a Growth detail, so the class
// moved here and Growth re-exports it. There is still exactly one definition of the route.
//
//   GET    /feature-flags/catalog                       StoreFeatureFlagsController.GetCatalog
//   GET    /stores/{storeId}/feature-flags              StoreFeatureFlagsController.GetForStore
//   PUT    /stores/{storeId}/feature-flags              StoreFeatureFlagsController.Set
//   DELETE /stores/{storeId}/feature-flags?flagKey=     StoreFeatureFlagsController.Clear
//
// AUTH IS NOT UNIFORM ACROSS THEM, and the difference is load-bearing for the caller. The catalog is
// readable by any authenticated caller; all three store-scoped actions are gated on
// `IStoreAdminAccess` and answer 403 — never 404 — for a caller who is not a StoreAdmin of the target
// store, deliberately, so a store's existence is never leaked by the shape of the refusal. A page
// therefore cannot read a 403 here as "no such store".
//
// DENY-CLOSED WRITES. `Set` and `Clear` both look the key up in the catalog first and answer
// 400 `{ message: "Unknown feature flag: …" }` for anything it does not carry, so an operator can
// never persist a typo'd or unconsumed flag. That is also why a flag a module DECLARES but withholds
// from the catalog is not merely un-togglable — it is unwritable, and it does not appear in either
// read. See `WorkforceFeatureFlags.Withheld` / `TrainingFeatureFlags.Withheld`: those flags gate
// nothing and can gate nothing, so the operator surface has nothing to show and nothing to send.
//
// NO `Idempotency-Key`. The Workforce surfaces refuse a mutation without one; this controller reads
// no such header, and both writes are idempotent by construction (an upsert of one row, and a delete
// that reports whether a row was there). Sending a header the server never reads would imply a
// contract that does not exist — the same rule `utils/growth/api-client.js` states for Growth.

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';

/**
 * A typed platform failure.
 *
 * The Workforce surfaces answer RFC 9457 problem+json (`code` + `conflictKind`) and Growth answers
 * its own `{ error: { code, message } }` envelope. This controller does NEITHER: it answers
 * `Forbid()` (403, no body at all) and `BadRequest(new { message })` (400, a bare `message`). Reading
 * such a body through `WorkforceApiError` yields `code: null` and a message of "HTTP 400" — the
 * server's own sentence, which is the only thing it says about WHY the write was refused, thrown
 * away silently. Hence a third small type that reads the shape this controller actually emits.
 *
 * `message` is server prose and may be reworded; callers branch on `status`, never on the text.
 */
export class PlatformApiError extends Error {
  constructor (status, body) {
    const payload = body || {};
    // `title`/`detail` are tolerated because ASP.NET's own problem-details middleware answers in that
    // shape for anything the controller did not handle itself (a 401 from the auth filter, a 500).
    super(payload.message || payload.detail || payload.title || ('HTTP ' + status));
    this.name = 'PlatformApiError';
    // `instanceof` against a subclassed Error does not survive an ES5 transpile, so callers
    // discriminate on this flag — the same transpile-proof rule the workforce base documents.
    this.isPlatformApiError = true;
    this.status = status;
    this.body = body || null;
  }
}

/** True for a typed platform failure, transpile-proof (see the flag's comment). */
export function isPlatformApiError (error) {
  return !!(error && error.isPlatformApiError);
}

/**
 * The shared platform request base. It extends the workforce transport (base URL, bearer header,
 * text-then-JSON parsing, the ok/!ok split) and replaces ONLY the thrown error type, so a future
 * change to auth or parsing still lands in one place.
 */
export class PlatformClientBase extends WorkforceClientBase {
  async _request (method, path, options) {
    try {
      return await super._request(method, path, options);
    } catch (error) {
      // The base throws its own type for any non-2xx; re-key it onto the platform shape. A raw
      // network rejection (offline, DNS) is NOT a typed failure and propagates untouched, so a
      // caller can never mistake "the request never happened" for a server refusal.
      if (isWorkforceApiError(error)) {
        throw new PlatformApiError(error.status, error.problem);
      }
      throw error;
    }
  }
}

/**
 * The operator's lever on the shared per-store flag store.
 *
 * WHAT `effective` DOES AND DOES NOT MEAN — read this before trusting a `true`:
 * `StoreFeatureFlagsController` resolves `effective` as "the override when present, otherwise the
 * module default", UNLESS the owning module registered an `IStoreFeatureFlagEffectiveResolver`.
 * Only Workforce and Margin register one (`Program.cs`, `MarginModuleServiceCollectionExtensions`).
 * Modules whose real gate ANDs the per-store row under a DEPLOYMENT-WIDE config switch — Growth's
 * `Growth:Enabled`, Events' `Events:Enabled` — have no resolver, and this read cannot see that
 * switch. So, for those modules:
 *
 *   effective === false  ⇒ the gate WILL refuse. Reliable, and a caller may act on it.
 *   effective === true   ⇒ the gate MAY still refuse, because the config switch is invisible here.
 *
 * The asymmetry is load-bearing: a caller may use a `false` to block, and must never use a `true` to
 * promise. (Backend follow-up: those modules declaring their own effective resolver would close it.)
 */
export class StoreFeatureFlagReader extends PlatformClientBase {
  /**
   * Every catalog flag, deployment-wide: `flagKey`, `module`, `title`, `defaultEnabled`. Carries NO
   * per-store state — it is the universe of writable keys, and any authenticated caller may read it.
   */
  GetCatalog () {
    return this._request('GET', '/feature-flags/catalog');
  }

  /**
   * Every catalog flag for one store, each with `flagKey`, `module`, `title`, `defaultEnabled`,
   * `isOverridden`, `overrideEnabled`, `effective`, `updatedByReference`, `updatedAtUtc`, `note`.
   *
   * The server iterates the SAME catalog as `GetCatalog`, so the two lists carry the same keys —
   * which is why a key in one and not the other is a real divergence and not a paging artefact.
   */
  GetStoreFlags (storeId) {
    return this._request('GET', '/stores/' + storeId + '/feature-flags');
  }

  /**
   * Upserts one store's override. `note` is free text the server stamps beside the actor it resolved
   * from the caller's own claims — the client never sends an actor, and must not, since a client-sent
   * one would be an unverified claim about who flipped a kill switch.
   *
   * The response is the flag's state AFTER the write, and its `effective` is NOT `enabled`: writing a
   * stage flag on does not make it effective if the module's gate ANDs it under a master that is off.
   * Callers adopt the returned row rather than assuming the value they sent.
   */
  SetStoreFlag (storeId, flagKey, enabled, note) {
    return this._request('PUT', '/stores/' + storeId + '/feature-flags', {
      body: { flagKey, enabled: !!enabled, note: note || null }
    });
  }

  /**
   * Clears one store's override, reverting the flag to its module default. Answers
   * `{ flagKey, cleared }` — `cleared:false` means there was no override to remove, which is a
   * different fact from "the flag is now off" and is reported as such.
   */
  ClearStoreFlag (storeId, flagKey) {
    return this._request(
      'DELETE',
      '/stores/' + storeId + '/feature-flags?flagKey=' + encodeURIComponent(flagKey));
  }
}

export default StoreFeatureFlagReader;

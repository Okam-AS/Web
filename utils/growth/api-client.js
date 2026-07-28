// The HTTP layer for the Growth admin surface.
//
// WHY IT IS NOT JUST `WorkforceClientBase`: the transport is identical and is reused wholesale
// (base URL, bearer header, text-then-JSON parsing, the ok/!ok split). The ERROR ENVELOPE is not.
// Every Workforce surface answers RFC 9457 problem+json with a top-level `code`; the Growth spec
// pins a different shape and says so explicitly (`Models/Growth/GrowthErrorEnvelope.cs`):
//
//     { "error": { "code": "growth.*", "message": "...", "traceId": "..." } }
//
// A `WorkforceApiError` reading `body.code` against that body yields `code: null` for EVERY Growth
// failure — silently, with no exception and no failing request. Rendering that keys on the code
// would then treat a 409 `growth.no_live_approval` as an unclassified error, i.e. it would stop
// distinguishing "you have not approved this yet" from "the server broke". That is precisely the
// silent-drift failure `api-client.js` was consolidated to end, so the envelope gets its own type
// and the transport stays shared.
//
// Route knowledge lives in `~/utils/growth/growth-client`, route-for-route with the controllers.

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';

/**
 * A typed Growth failure.
 *
 * `code` is the stable `growth.*` contract the backend documents as "a public contract the client
 * pins" (`GrowthApiException.Code`). Callers key on `code` and `status`, never on `message`, which
 * is server prose.
 *
 * The codes this surface actually branches on:
 *   growth.not_found        404  concealment — absent OR cross-tenant, deliberately the same answer
 *   growth.no_live_approval 409  dispatch attempted with no live approval
 *   growth.approval_stale   409  the approval no longer matches version + content hash + snapshot
 *   growth.stale_version    409  the edit was based on a superseded version
 *   growth.unattributed     401  the caller carries no resolvable identity, so a write that records
 *                                an author is refused rather than persisted with a null author
 *   growth.pii_capability_required 403  the consent timeline needs growth.contact_pii.read
 *
 * A field the response did not carry is null rather than undefined, so no caller has to tell
 * "absent" from "not applicable".
 */
export class GrowthApiError extends Error {
  constructor (status, body) {
    const envelope = (body && body.error) || {};
    super(envelope.message || ('HTTP ' + status));
    this.name = 'GrowthApiError';
    // `instanceof` against a subclassed Error does not survive an ES5 transpile, so callers
    // discriminate on this flag — the same transpile-proof rule the workforce base documents.
    this.isGrowthApiError = true;
    this.status = status;
    this.code = envelope.code || null;
    this.traceId = envelope.traceId || null;
    this.body = body || null;
  }
}

/** True for a typed Growth failure, transpile-proof (see the flag's comment). */
export function isGrowthApiError (error) {
  return !!(error && error.isGrowthApiError);
}

/**
 * The shared Growth request base.
 *
 * It extends the workforce transport and replaces ONLY the thrown error type. Nothing about the
 * request is re-implemented, so a future change to auth or parsing lands in one place.
 *
 * NO `Idempotency-Key`. The Workforce surface refuses a mutation without one; no Growth controller
 * reads the header (`Controllers/Growth*.cs` carry no `TryGetIdempotencyKey`), and Growth's
 * idempotency is structural instead — one dispatch run per approved version enforced by a unique
 * index, and a segment snapshot keyed on its source watermark. Sending a header the server never
 * reads would imply a contract that does not exist.
 */
export class GrowthClientBase extends WorkforceClientBase {
  async _request (method, path, options) {
    try {
      return await super._request(method, path, options);
    } catch (error) {
      // The base throws its own type for any non-2xx; re-key it onto the Growth envelope. A raw
      // network rejection (offline, DNS) is NOT a typed failure and propagates untouched, so a
      // caller can never mistake "the request never happened" for a server refusal.
      if (isWorkforceApiError(error)) {
        throw new GrowthApiError(error.status, error.problem);
      }
      throw error;
    }
  }

  /** A Growth mutation: a JSON body and no idempotency header (see the class comment). */
  _send (method, path, body) {
    return this._request(method, path, { body: body === undefined ? {} : body });
  }
}

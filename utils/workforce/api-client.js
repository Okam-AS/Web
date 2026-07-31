// The one HTTP layer every Workforce client sits on.
//
// WHY IT EXISTS: the manager week grid (`utils/workforce/schedule-client.js`) and the worker's own
// page (`utils/workforce-me/me-client.js`) were built in parallel lanes and each grew its own copy
// of the same three things — the problem+json error type, the `_request`/`_mutate` pair, and the
// transpile-proof discriminator flag. Two copies of a discriminator is the dangerous kind of
// duplication: the failure mode is silent (a conflict simply stops being recognised) and the two
// copies drift apart one field at a time. There is now exactly one.
//
// Everything here is route-agnostic. Route knowledge stays in the two service classes, which are
// deliberately route-for-route with the backend controllers.

import getEnv from '~/env';
import { newGuid } from '~/utils/guid';

/**
 * A typed workforce failure.
 *
 * Every Workforce surface answers RFC 9457 problem+json with a stable `code` and, for the §5.4
 * conflict family, a `conflictKind`. Callers key their rendering on those, never on the
 * human-readable `detail`, which is prose and may be localised or reworded.
 *
 * The named extensions are a union of what the two surfaces emit: `conflictingAssignmentId` is the
 * SAME-store overlap's named shift (the cross-store variant deliberately carries none), and
 * `aggregateId` is what the exchange/claim family returns. A field the response did not carry is
 * null rather than absent, so a caller never has to distinguish "missing" from "not applicable".
 * The whole body stays on `problem` regardless.
 */
export class WorkforceApiError extends Error {
  constructor (status, body) {
    const problem = body || {};
    super(problem.detail || problem.title || ('HTTP ' + status));
    this.name = 'WorkforceApiError';
    // `instanceof` against a subclassed Error does not survive an ES5 transpile of the class, so
    // callers discriminate on this flag instead. Getting that wrong fails silently — the typed
    // conflict simply stops being recognised — which is exactly the bug these surfaces must not
    // have, and exactly why there is now one flag rather than one per lane.
    this.isWorkforceApiError = true;
    this.status = status;
    this.code = problem.code || null;
    this.conflictKind = problem.conflictKind || null;
    this.conflictingAssignmentId = problem.conflictingAssignmentId || null;
    this.aggregateId = problem.aggregateId || null;
    this.retryable = problem.retryable === true;
    this.problem = problem;
  }
}

/** True for a typed workforce failure, transpile-proof (see the flag's comment). */
export function isWorkforceApiError (error) {
  return !!(error && error.isWorkforceApiError);
}

/**
 * The wire format for every UTC bound the Workforce surfaces take: `YYYY-MM-DDTHH:mm:ss`,
 * deliberately WITHOUT a `Z` or an offset.
 *
 * Both lanes arrived at this independently, for two different reasons that point the same way:
 *
 *  • `GET /schedules?from&to` binds plain `DateTime` parameters and compares them against UTC
 *    columns, so only the numeric value matters — but a trailing `Z` invites the query-string binder
 *    to convert into the server's own local time and shift the whole window by that offset.
 *  • The `/workforce/me` actions bind the parameter and then call
 *    `DateTime.SpecifyKind(value, DateTimeKind.Utc)`. `SpecifyKind` RELABELS without converting, so
 *    a value the binder had already converted to local time would be stamped "UTC" while holding
 *    local wall-clock — a silent, offset-sized window shift.
 *
 * A bare `YYYY-MM-DDTHH:mm:ss` is converted by nothing under any binder setting, arrives as the
 * exact instant meant, and is exactly what the relabel then means.
 */
export function toUtcRangeParam (instant) {
  return instant.toISOString().slice(0, 19);
}

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The wire guard on every VENUE CALENDAR DATE a Workforce surface takes: `yyyy-MM-dd` and nothing
 * else. Throws rather than coercing.
 *
 * A client that quietly turned a `Date` into a date string would be choosing the zone that
 * conversion happens in — which is the browser's — and the whole reason these parameters are civil
 * dates is that the STORE's zone is the only one entitled to make them. A page therefore never holds
 * a `Date` for such a value at all, and this is the check that keeps it honest.
 *
 * It sits in the shared HTTP layer rather than in one route file because THREE surfaces now take a
 * venue date on the wire — the hours export (`from`/`to`), the rate statement
 * (`effectiveFromLocalDate`) and the personalliste (`businessDate`) — and the second copy of a wire
 * rule is where the two start drifting. `utils/workforce-rates/rates-client.js` re-exports it so its
 * own callers are unchanged.
 */
export function assertBusinessDate (value, field) {
  if (typeof value !== 'string' || !LOCAL_DATE.test(value)) {
    throw new TypeError(field + ' must be the venue calendar date as yyyy-MM-dd, never a DateTime.');
  }
  return value;
}

/**
 * The shared request/mutate base. Subclasses add routes and nothing else.
 *
 * `initializer` is the Core initializer the pages already hold (`this._coreInitializer`); only its
 * `bearerToken` is read here.
 */
export class WorkforceClientBase {
  constructor (initializer) {
    this._initializer = initializer || {};
  }

  get _baseUrl () {
    return String(getEnv('API_BASE_URL') || '').replace(/\/+$/, '');
  }

  _headers (extra) {
    const headers = Object.assign({ Accept: 'application/json' }, extra || {});
    const token = this._initializer.bearerToken;
    if (token) { headers.Authorization = 'Bearer ' + token; }
    return headers;
  }

  async _request (method, path, options) {
    const opts = options || {};
    const headers = this._headers(opts.headers);
    if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; }

    const response = await fetch(this._baseUrl + path, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch (e) { payload = { detail: text }; }
    }

    if (!response.ok) { throw new WorkforceApiError(response.status, payload); }
    return payload;
  }

  /**
   * Every Workforce mutation carries an `Idempotency-Key`; the surface rejects one without it.
   *
   * `extraHeaders` carries the preconditions an individual route adds on top of that. TWO routes
   * need one today, and they arrived from two independent lanes that each reached for the same
   * shape: the schedule's batch assignment edit sends an `If-Match` carrying the draft checksum,
   * and the management surface's `PATCH /staff/{id}` sends an `If-Match` carrying the aggregate's
   * opaque revision (a plain 400 without it). One optional argument serves both — there is no
   * second mechanism, and no second `_mutate` in either client.
   *
   * It is threaded through here rather than assembled at the call site because the idempotency rule
   * is the thing this base exists to hold exactly once. A caller that built its own header bag would
   * be the start of the second copy this file's header warns about — which is how the two lanes'
   * duplicated discriminator drifted apart before this file existed.
   */
  _mutate (method, path, body, extraHeaders) {
    const headers = Object.assign({ 'Idempotency-Key': newGuid() }, extraHeaders || {});
    return this._request(method, path, { body, headers });
  }
}

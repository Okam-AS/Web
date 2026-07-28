// The one HTTP layer the Margin admin client sits on.
//
// It lives here rather than in `core/services` for the same reason the Workforce one does: Core is a
// git submodule this repo carries no checkout of, and there is no Core service for the Margin surface.
// Route knowledge stays out of this file entirely — see `~/utils/margin/recipe-client`, which is
// deliberately route-for-route with the backend controllers.
//
// WHY THIS IS A SECOND ERROR FAMILY RATHER THAN A REUSE OF `WorkforceApiError`.
//
// The instruction on this lane was to add no second family unless the module genuinely needs one, so
// here is the reasoning, in full, rather than a preference:
//
//  1. THE CONFLICT VOCABULARIES ARE DISJOINT. `WorkforceApiError` carries `conflictKind`,
//     `conflictingAssignmentId` and `aggregateId` — the §5.4 double-booking family. Margin emits none
//     of those. Margin's problem+json (`Helpers/Margin/MarginProblemDetails.cs`) carries `code` from
//     the `margin.*` family plus a `retryable` extension and nothing else. Reusing the workforce type
//     would give every margin failure three permanently-null fields and would give a reader the
//     impression that a margin 409 has a `conflictKind` to switch on. It does not.
//  2. THE MANDATORY MUTATION HEADER IS DIFFERENT, AND IT IS NOT COSMETIC. Every Workforce mutation
//     must carry an `Idempotency-Key` and the surface rejects one without it. Margin requires no such
//     key; what it requires on an aggregate mutation is `If-Match` with the resource's opaque
//     rowversion, and it 400s when that is absent (`MarginContractSupport.TryReadIfMatch`). A shared
//     `_mutate` would have to send both, and sending a stray `Idempotency-Key` to a surface with no
//     idempotency store is a header that looks like a guarantee and is not one.
//  3. A `catch (WorkforceApiError)` around a recipe save reads as a bug even when it is not.
//
// WHAT WOULD ACTUALLY CONVERGE THE TWO: the `_request` body below and the workforce one are the same
// twenty lines, and they should end up in a neutral `~/utils/api/problem-client` that both modules
// extend, with the two error subclasses keeping only their own extension fields. That refactor edits
// `utils/workforce/**`, which this lane does not own, so it is named here rather than done.

import getEnv from '~/env';

/**
 * A typed Margin failure.
 *
 * Every Margin endpoint answers RFC 9457 problem+json with a stable `code` — the `margin.*` family in
 * `Helpers/Margin/MarginErrorCodes.cs` (the cross-cutting 404/403/409) and
 * `Services/Margin/MarginRecipeProblems.cs` (the business-rule 400s). Callers key their rendering on
 * `code`, never on `detail`, which is server prose and may be reworded.
 *
 * `margin.not-found` deserves its own warning, and it is the reason this class exists at all rather
 * than a bare status check: a 404 on this surface is DELIBERATELY AMBIGUOUS. It means the recipe is
 * unknown, OR the store is out of the caller's scope, OR `Margin.Module` is switched off for the store
 * — one answer for all three, so existence is never disclosed. Nothing downstream may translate it
 * into "this store has no recipes".
 */
export class MarginApiError extends Error {
  constructor (status, body) {
    const problem = body || {};
    super(problem.detail || problem.title || ('HTTP ' + status));
    this.name = 'MarginApiError';
    // `instanceof` against a subclassed Error does not survive an ES5 transpile of the class, so
    // callers discriminate on this flag instead. The workforce lane learned this the expensive way:
    // getting it wrong fails SILENTLY — the typed error simply stops being recognised.
    this.isMarginApiError = true;
    this.status = status;
    this.code = problem.code || null;
    this.retryable = problem.retryable === true;
    this.problem = problem;
  }
}

/** True for a typed Margin failure, transpile-proof (see the flag's comment). */
export function isMarginApiError (error) {
  return !!(error && error.isMarginApiError);
}

/** The `margin.*` codes this surface renders on. Rendering keys on these, never on `detail`. */
export const MARGIN_NOT_FOUND = 'margin.not-found';
export const MARGIN_FORBIDDEN = 'margin.forbidden';
export const MARGIN_STALE_REVISION = 'margin.stale-revision';
export const MARGIN_RECIPE_NAME_CONFLICT = 'margin.recipe-name-conflict';
export const MARGIN_VERSION_INPUT_INVALID = 'margin.version-input-invalid';
export const MARGIN_COMPONENT_INVALID = 'margin.component-invalid';
export const MARGIN_TOO_MANY_COMPONENTS = 'margin.version-too-many-components';
export const MARGIN_RECIPE_CYCLE = 'margin.recipe-cycle';
export const MARGIN_RECIPE_DEPTH_EXCEEDED = 'margin.recipe-depth-exceeded';
export const MARGIN_VERSION_NOT_DRAFT = 'margin.version-not-draft';
export const MARGIN_NO_ACTIVE_VERSION = 'margin.no-active-version';

/**
 * Raised BEFORE any request when a mutation that needs a revision has none to send.
 *
 * The server strips the quotes off `If-Match` and then decodes the token, so an empty or invented
 * value is not refused at the door — it is decoded, compared against the row, and under a provider
 * with no rowversion (SQLite) it is accepted. Sending a placeholder would therefore be a real
 * concurrency guard silently downgraded to none, on the one class of write this module cares about.
 * The client refuses instead, and the surface says which version it could not act on.
 */
export class MarginMissingRevisionError extends Error {
  constructor () {
    super('This resource carries no revision token, so it cannot be mutated safely.');
    this.name = 'MarginMissingRevisionError';
    this.isMarginApiError = true;
    this.status = null;
    this.code = 'margin.client-missing-revision';
    this.retryable = false;
    this.problem = {};
  }
}

/**
 * The shared request/mutate base. Subclasses add routes and nothing else.
 *
 * `initializer` is the Core initializer the pages already hold (`this._coreInitializer`); only its
 * `bearerToken` is read here.
 */
export class MarginClientBase {
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

    if (!response.ok) { throw new MarginApiError(response.status, payload); }
    return payload;
  }

  /**
   * A plain mutation. NO `Idempotency-Key` — Margin has no idempotency store, and a header that
   * implies a replay guarantee the server does not make is worse than no header.
   */
  _mutate (method, path, body) {
    return this._request(method, path, { body });
  }

  /**
   * An AGGREGATE mutation: the resource's opaque rowversion travels in `If-Match`, and the server
   * rejects the request outright when it is absent (a plain 400) or stale (`margin.stale-revision`,
   * 409). Quoted per RFC 9110 §13.1.1; the server trims quotes either way.
   */
  // The guard REJECTS rather than throwing synchronously. A method that sometimes throws and
  // sometimes rejects is a trap: `service.Activate(…).catch(render)` would render the stale-revision
  // 409 and miss the missing-revision refusal entirely, silently.
  _mutateWithRevision (method, path, body, revision) {
    if (!revision) { return Promise.reject(new MarginMissingRevisionError()); }
    return this._request(method, path, { body, headers: { 'If-Match': '"' + revision + '"' } });
  }
}

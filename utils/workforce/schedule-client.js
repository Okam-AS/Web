// The Workforce schedule API client.
//
// It lives here rather than in `core/services` because Core is a git submodule this repo does not
// carry a checkout of, and there is no Core service for the workforce surface yet. It is deliberately
// route-for-route with the backend and adds nothing: every method below maps to a controller action
// that exists. Endpoint numbers are the ones the backend's own XML docs use.
//
//   GET  /workforce/stores/{storeId}/context                              #1   WorkforceStaffController
//   GET  /workforce/stores/{storeId}/staff                                #2   WorkforceStaffController
//   GET  /workforce/stores/{storeId}/schedules?from&to&view               #17  WorkforceSchedulesController
//   GET  /workforce/stores/{storeId}/requests?kind&state                  #23  WorkforceRequestsController
//   POST /workforce/stores/{storeId}/schedules/drafts                     #16  WorkforceSchedulesController
//   POST /workforce/stores/{storeId}/schedules/{revisionId}/validate      #19  WorkforceSchedulesController
//   POST /workforce/stores/{storeId}/schedules/{revisionId}/publish       #20  WorkforceSchedulesController
//   GET  /workforce/stores/{storeId}/schedules/publication-history        #21  WorkforceSchedulesController
//
// Every mutation carries an `Idempotency-Key`; the surface rejects one without it.

import getEnv from '~/env';
import { newGuid } from '~/utils/guid';

/**
 * A typed workforce failure. The surface answers RFC 9457 problem+json with a stable `code` and, for
 * the §5.4 conflict family, a `conflictKind`. The grid keys its rendering on those, never on the
 * human-readable detail.
 */
export class WorkforceApiError extends Error {
  constructor (status, body) {
    const problem = body || {};
    super(problem.detail || problem.title || ('HTTP ' + status));
    this.name = 'WorkforceApiError';
    // `instanceof` against a subclassed Error does not survive an ES5 transpile of the class, so
    // callers discriminate on this flag instead. Getting that wrong fails silently — the conflict
    // simply stops being recognised — which is exactly the bug this surface must not have.
    this.isWorkforceApiError = true;
    this.status = status;
    this.code = problem.code || null;
    this.conflictKind = problem.conflictKind || null;
    this.conflictingAssignmentId = problem.conflictingAssignmentId || null;
    this.retryable = problem.retryable === true;
    this.problem = problem;
  }
}

/** True for a typed workforce failure, transpile-proof (see the flag's comment). */
export function isWorkforceApiError (error) {
  return !!(error && error.isWorkforceApiError);
}

export class WorkforceScheduleService {
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

  _mutate (method, path, body) {
    return this._request(method, path, { body, headers: { 'Idempotency-Key': newGuid() } });
  }

  GetContext (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/context');
  }

  ListStaff (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/staff');
  }

  // `from`/`to` are the range params produced by `toRangeParam` (see week-range.js for why they
  // carry no zone designator). `view` is `draft` (default) or `published`.
  GetRange (storeId, from, to, view) {
    const query = '?from=' + encodeURIComponent(from) +
      '&to=' + encodeURIComponent(to) +
      '&view=' + encodeURIComponent(view || 'draft');
    return this._request('GET', '/workforce/stores/' + storeId + '/schedules' + query);
  }

  // `state=all` rather than the default in-flight inbox: an APPROVED time-off is decided, so the
  // default projection omits it — and an approved absence is exactly what the grid must show.
  ListRequests (storeId, kind, state) {
    const params = [];
    if (kind) { params.push('kind=' + encodeURIComponent(kind)); }
    if (state) { params.push('state=' + encodeURIComponent(state)); }
    const query = params.length ? '?' + params.join('&') : '';
    return this._request('GET', '/workforce/stores/' + storeId + '/requests' + query);
  }

  CreateDraft (storeId, request) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/schedules/drafts', request);
  }

  Validate (storeId, revisionId) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/schedules/' + revisionId + '/validate');
  }

  Publish (storeId, revisionId) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/schedules/' + revisionId + '/publish');
  }

  GetPublicationHistory (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/schedules/publication-history');
  }
}

export default WorkforceScheduleService;

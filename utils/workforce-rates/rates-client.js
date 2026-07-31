// The two PAYROLL-GATED Workforce surfaces: the rate timelines a shift is priced from, and the
// hours file that leaves for payroll.
//
// Route-for-route with the backend, adding nothing. File references are `WorkforceRatesController.cs`
// and `WorkforceAttendanceController.cs` in the OkamAPI repo.
//
//   GET /workforce/stores/{storeId}/staff/{staffMemberId}/rates      (WorkforceRatesController:46)
//   PUT /workforce/stores/{storeId}/staff/{staffMemberId}/rates      (:60)
//   GET /workforce/stores/{storeId}/roles/{roleId}/rates             (:89)
//   PUT /workforce/stores/{storeId}/roles/{roleId}/rates             (:102)
//   GET /workforce/stores/{storeId}/attendance/hours-export?from&to  (WorkforceAttendanceController:143)
//
// ROUTES THIS PAGE USES BUT DOES NOT BIND HERE, because another route-for-route client already owns
// the controller they belong to and a second binding is a second place for the contract to drift:
//   • `GET /context`, `GET /staff`, `GET /roles` — `WorkforceStaffController`, bound by
//     `utils/workforce/roster-client.js` (#1, #2, #8).
//   • `GET /attendance?from&to` — `WorkforceAttendanceController` #25, ALSO bound by the roster
//     client, which already sends the bare-instant wire format that read requires.
//
// THE TWO RANGES ON THIS PAGE ARE IN DIFFERENT UNITS AND MIXING THEM IS A 400. The attendance read
// (#25) takes UTC INSTANTS (`from`/`to` as bare `YYYY-MM-DDTHH:mm:ss`, bound as `DateTime` and
// relabelled Utc). The hours export takes the VENUE's CALENDAR DATES (`from`/`to` as `yyyy-MM-dd`,
// bound as strings and parsed with `DateOnly.TryParseExact`, INCLUSIVE at both ends). Sending an
// instant to the export is `ModuleProblem("Both 'from' and 'to' are required as local business
// dates in yyyy-MM-dd form.")`; sending a bare date to the attendance read parses as UTC midnight
// and silently answers for the wrong window. They are therefore bound in two different clients with
// two differently-shaped signatures, and `GetHoursExport` refuses anything that is not a plain date.

import { WorkforceClientBase, assertBusinessDate } from '~/utils/workforce/api-client';

// The `yyyy-MM-dd` wire guard moved to the shared HTTP layer when the personalliste became the third
// surface to take a venue calendar date on the wire. Re-exported here so this file's callers and its
// tests keep importing it from the client that first needed it.
export { assertBusinessDate };

export class WorkforceRatesService extends WorkforceClientBase {
  _engagementRatesPath (storeId, staffMemberId) {
    return '/workforce/stores/' + storeId + '/staff/' + staffMemberId + '/rates';
  }

  _roleRatesPath (storeId, roleId) {
    return '/workforce/stores/' + storeId + '/roles/' + roleId + '/rates';
  }

  /**
   * The engagement's whole rate timeline, NEWEST FIRST — including the closed rows.
   *
   * Requires `WorkforcePayrollApprover` ON TOP OF `WorkforceManager`, on the READ as much as the
   * write (`WorkforceRateAuthoringService.RequirePayrollAsync`). There is nothing to partially
   * withhold: strip the amount and a rate row has no content left, so the whole read is a 403.
   */
  GetEngagementRates (storeId, staffMemberId) {
    return this._request('GET', this._engagementRatesPath(storeId, staffMemberId));
  }

  /**
   * State the engagement's rate from a venue calendar date. PUT, AND PUT APPENDS.
   *
   * It is not an update: the server closes the row in force at the new instant and opens a new one,
   * and no path on that controller can change what an existing row paid. Restating a rate at an
   * instant that already carries one is `workforce.rate-version-exists` (409) naming the existing
   * id — never an overwrite.
   *
   * `request.effectiveFromLocalDate` MUST be the `yyyy-MM-dd` calendar date, not a `DateTime`: the
   * server resolves it through the STORE's zone, and a UTC-midnight conversion would price a real
   * window at a different rate. `assertRateRequest` refuses the datetime form here rather than
   * letting a binder pick an epoch nobody chose.
   */
  SetEngagementRate (storeId, staffMemberId, request) {
    return this._mutate('PUT', this._engagementRatesPath(storeId, staffMemberId), assertRateRequest(request));
  }

  /** The role default's timeline. Same gate, same shape, same append-only law as the engagement rung. */
  GetRoleRates (storeId, roleId) {
    return this._request('GET', this._roleRatesPath(storeId, roleId));
  }

  /** State the role default from a venue calendar date. Appends; see `SetEngagementRate`. */
  SetRoleRate (storeId, roleId, request) {
    return this._mutate('PUT', this._roleRatesPath(storeId, roleId), assertRateRequest(request));
  }

  /**
   * The payroll hours file (staff × business day × pay code) over an INCLUSIVE local business-date
   * range. Requires `WorkforcePayrollApprover`.
   *
   * Both bounds are the venue's `yyyy-MM-dd` calendar dates and nothing else — see this file's
   * header for why an instant here is a 400. Answers `text/csv`, not JSON, so it does not go through
   * `_request`; the failure path still raises the one shared `WorkforceApiError`.
   */
  GetHoursExport (storeId, fromBusinessDate, toBusinessDate) {
    const from = assertBusinessDate(fromBusinessDate, 'from');
    const to = assertBusinessDate(toBusinessDate, 'to');
    return this._requestCsv(
      '/workforce/stores/' + storeId + '/attendance/hours-export' +
      '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to)
    );
  }
}

/**
 * The wire guard on a rate statement: the effective date is a CALENDAR DATE STRING.
 *
 * This throws rather than coercing. A client that quietly turned a `Date` into a date string would
 * be choosing the zone that conversion happens in — which is the browser's — and the whole reason
 * this field is a string is that the STORE's zone is the only one entitled to make it. The page
 * therefore never holds a `Date` for this value at all, and this is the check that keeps it honest.
 */
export function assertRateRequest (request) {
  const body = request || {};
  assertBusinessDate(body.effectiveFromLocalDate, 'effectiveFromLocalDate');

  // Integer minor units per worked hour. A float would be an amount the schema cannot store and
  // the server would round somewhere the manager cannot see.
  if (typeof body.hourlyRateMinor !== 'number' || !Number.isInteger(body.hourlyRateMinor)) {
    throw new TypeError('hourlyRateMinor must be an integer number of minor units.');
  }

  return body;
}

export default WorkforceRatesService;

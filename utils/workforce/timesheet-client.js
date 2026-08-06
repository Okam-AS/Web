// The Workforce TIMESHEET surface — the payroll batch a manager freezes and sends.
//
// Route-for-route with `Controllers/WorkforceTimesheetsController.cs` in the OkamAPI repo (spec §5.1
// endpoints 27, 28, 29 plus the two reads that sit beside them), adding nothing:
//
//   GET  /workforce/stores/{storeId}/timesheets?from&to                            (#27, :46)
//   GET  /workforce/stores/{storeId}/timesheets/{periodId}                         (:79)
//   POST /workforce/stores/{storeId}/timesheets/{periodId}/approve                 (#28, :92)
//   POST /workforce/stores/{storeId}/timesheets/{periodId}/exports                 (#29, :121)
//   GET  /workforce/stores/{storeId}/timesheets/{periodId}/exports/{batchId}       (:146)
//
// ---- THREE THINGS ABOUT THIS SURFACE THAT ARE NOT LIKE ITS SIBLINGS ---------------------------
//
// 1. THERE IS NO CREATE. A period is not made; it is NAMED. Its id is a digest of
//    `(storeId, fromBusinessDate, toBusinessDate)`, so the list synthesises an `Open` row for any
//    range that has no frozen period yet and hands back the id a later approve would use. That is
//    the ONLY way a client learns a periodId, which is why `ApproveTimesheet` must send the range
//    BACK in the body even though the route already carries the id: the server re-derives the digest
//    and refuses a mismatch with `workforce.timesheet-period-id-mismatch` (409). A client that sent
//    a different range than the one it listed would be addressing a period nobody looked at.
//
// 2. A SECOND CLICK IS A SECOND ATTEMPT, AND THAT IS DELIBERATE. `_mutate` mints a fresh
//    `Idempotency-Key` per call. Sending the SAME key replays the stored 200; only a FRESH key
//    reaches the domain check and earns `workforce.timesheet-period-already-approved` (409). So the
//    refusal a manager sees when they press Approve twice is the real finalize-then-refuse chain and
//    not a client-side guard — and this client must never quietly reuse a key to soften it, because
//    that would convert a refusal into a silent success.
//
// 3. THE DIGEST IS IN THE BODY, NOT THE HEADER. The download answers `X-Okam-Content-Sha256`, and
//    the API does NOT list it in `Access-Control-Expose-Headers` (the controller says so in its own
//    remarks, and the helper that would fix it is on an unmerged lane). This app is cross-origin to
//    the API, so the browser CANNOT read that header — `fetch` hands back `null` for it. Callers
//    therefore take `payloadSha256` off the export batch MODEL, which carries it, and this client
//    does not pretend to read the header. A page that displayed a header it cannot see would print
//    an empty string as an integrity claim.

import { WorkforceClientBase, assertBusinessDate } from '~/utils/workforce/api-client';

/**
 * The one place a timesheet route is spelled. Everything below builds on it, so a route change is a
 * one-line change rather than five.
 */
function timesheetsPath (storeId) {
  return '/workforce/stores/' + storeId + '/timesheets';
}

export class WorkforceTimesheetService extends WorkforceClientBase {
  _periodPath (storeId, periodId) {
    return timesheetsPath(storeId) + '/' + encodeURIComponent(periodId);
  }

  /**
   * Every period touching an INCLUSIVE venue calendar-date range, plus whether this store may
   * currently export at all.
   *
   * Both bounds are the venue's `yyyy-MM-dd` and nothing else. The server binds them with
   * `DateOnly.TryParseExact` and answers a plain 400 for anything else; `assertBusinessDate` refuses
   * here instead, so a `Date` never reaches the wire carrying the BROWSER's zone as the venue's.
   *
   * UNGATED by `workforce.export` — §9.2's kill-switch law says a disabled stage goes READ-ONLY, not
   * dark. The response's own `exportEnabled` reports the stage, so the page disables its two buttons
   * from the server's answer rather than guessing at the flag.
   */
  ListTimesheets (storeId, fromBusinessDate, toBusinessDate) {
    const from = assertBusinessDate(fromBusinessDate, 'from');
    const to = assertBusinessDate(toBusinessDate, 'to');
    return this._request('GET', timesheetsPath(storeId) +
      '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
  }

  /**
   * One period with its lines and its export batches, newest batch last.
   *
   * This is the only read that populates `batches` — the approve response builds its detail inline
   * and leaves that list empty (`WorkforceTimesheetService.cs:266-271`), so a page that took the
   * approve answer as the whole truth would show a freshly approved period as having no batches
   * even after one had been sent. Callers re-read here after a write.
   */
  GetTimesheet (storeId, periodId) {
    return this._request('GET', this._periodPath(storeId, periodId));
  }

  /**
   * FREEZE the period. Requires `WorkforcePayrollApprover` AND the `workforce.export` stage flag.
   *
   * This is the act that turns hours into money somebody must later explain: the server stamps the
   * caller's own staff-member id into `WorkforceTimesheetPeriod.ApprovedByActorReference`, takes a
   * `snapshotSha256` over the frozen rows, and the row is thereafter immutable — an `AFTER UPDATE,
   * DELETE` trigger refuses to change it, and a correction leaves as a separate adjustment batch.
   *
   * `allowIncomplete` is the manager's explicit decision to freeze rows whose hours are UNKNOWN (an
   * open session, a missing punch). Without it the server refuses with
   * `workforce.timesheet-period-incomplete` naming the count. It defaults to false HERE as well as
   * on the server, so an omitted field can never mean "freeze the unknowns".
   */
  ApproveTimesheet (storeId, periodId, request) {
    return this._mutate('POST', this._periodPath(storeId, periodId) + '/approve',
      assertApproveRequest(request));
  }

  /**
   * SEND the approved snapshot through an export provider, and record what was sent.
   *
   * `providerKey` is optional; absent, the server resolves the ruled default (`okam-csv`, the neutral
   * CSV). An unknown key is `workforce.timesheet-export-provider-unknown` (409) which NAMES the keys
   * that are registered, so a caller never has to guess.
   *
   * Exporting an unapproved period is refused (`workforce.timesheet-period-not-approved`). Exporting
   * a second time with nothing changed is refused too
   * (`workforce.timesheet-nothing-to-reconcile`) — an exported period is never re-sent whole. When
   * something HAS changed the answer is an ADJUSTMENT batch carrying only the delta.
   */
  CreateTimesheetExport (storeId, periodId, request) {
    return this._mutate('POST', this._periodPath(storeId, periodId) + '/exports', request || {});
  }

  /**
   * The bytes a batch actually sent, served back verbatim.
   *
   * UNGATED, deliberately (§9.2 / journey WFJ-15): turning the export flag off stops NEW batches
   * while what has already been sent stays retrievable. An export batch nobody can download is a
   * database row, not a payroll file.
   *
   * Answers `text/csv`, so it goes through `_requestFile` rather than `_request`. The returned
   * `fileName` is the server's own (off `Content-Disposition`) or null — see this file's header on
   * why the digest is NOT read from the response header.
   */
  DownloadTimesheetExport (storeId, periodId, batchId) {
    return this._requestFile(
      this._periodPath(storeId, periodId) + '/exports/' + encodeURIComponent(batchId),
      'text/csv'
    );
  }
}

/**
 * The wire guard on an approval.
 *
 * Throws rather than coercing, for the reason the whole range is a string in the first place: the
 * period's id is a DIGEST of its store and its two dates, so a client that turned a `Date` into a
 * date string would be choosing the zone that conversion happens in — the browser's — and could
 * address a different period than the one the manager is looking at. The server would answer
 * `workforce.timesheet-period-id-mismatch` and the manager would read it as a broken page.
 *
 * `allowIncomplete` is normalised to a real boolean: `undefined` must mean false, and a truthy
 * string arriving from a form field must not silently become permission to freeze unknown hours.
 */
export function assertApproveRequest (request) {
  const body = request || {};
  const fromBusinessDate = assertBusinessDate(body.fromBusinessDate, 'fromBusinessDate');
  const toBusinessDate = assertBusinessDate(body.toBusinessDate, 'toBusinessDate');

  if (body.allowIncomplete !== undefined &&
      typeof body.allowIncomplete !== 'boolean') {
    throw new TypeError('allowIncomplete must be a boolean when present.');
  }

  return {
    fromBusinessDate,
    toBusinessDate,
    allowIncomplete: body.allowIncomplete === true
  };
}

export default WorkforceTimesheetService;

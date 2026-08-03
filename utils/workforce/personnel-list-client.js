// The statutory PERSONALLISTE — `bokføringsforskriften § 8-5-6`.
//
// Route-for-route with the backend, adding nothing. The file reference is
// `Controllers/WorkforcePersonnelListController.cs` in the OkamAPI repo.
//
//   GET  /workforce/stores/{storeId}/personnel-list?businessDate=                    (endpoint 30, :47)
//   POST /workforce/stores/{storeId}/personnel-list/entries/{entryId}/corrections    (:77)
//
// THE OTHER PERSONALLISTE ROUTE IS NOT BOUND HERE, deliberately.
// `GET /workforce/pos/personnel-list` (endpoint 46) is the on-venue read, and it authenticates a
// DEVICE JWT plus an `X-Operator-Session` header rather than a manager's bearer token
// (`WorkforcePosController.ResolveSessionAsync`). A browser signed in as a manager holds neither, so
// binding it here would be a method that can only ever answer 403. It is the register's own screen
// on the till, not this one.
//
// CAPABILITY. Endpoint 30 requires the `WorkforceManager` grant ON THE ENGAGEMENT
// (`WorkforcePersonnelListService.GetForManagerAsync` → `RequireCapabilityAsync`). Being a
// PowerUser or a StoreAdmin of the store is NOT enough and is answered 403 — platform administration
// is never read as a workforce capability (spec §3.1).
//
// NO FLAG GATES EITHER ROUTE. `workforce.personnel-list` is declared but withheld from the operator
// catalog and reads nothing (`WorkforceFeatureFlags.Withheld`): the read because a register already
// written must stay producible on inspection, and the correction because § 8-5-6 makes recording a
// rettelse part of keeping the register — a switch that paused it would leave a venue holding a list
// it knows is wrong and may not fix. So neither call needs to check a flag before it is offered.

import { WorkforceClientBase, assertBusinessDate } from '~/utils/workforce/api-client';

export class WorkforcePersonnelListService extends WorkforceClientBase {
  /**
   * The personalliste for ONE venue business day: every non-superseded on-site window of that day —
   * the people still on site AND the windows that already closed.
   *
   * `businessDate` is the venue's `yyyy-MM-dd` CALENDAR DATE, or null/undefined to let the SERVER
   * resolve the venue's today in the store's own zone. Omitting it is the honest default on first
   * load: the response echoes the `businessDate` it settled on, so the picker adopts the venue's
   * date rather than the browser's guess at it.
   *
   * WHY THE BARE DATE AND NOTHING ELSE. The parameter binds as `DateTime?` and the service compares
   * it against the `LocalBusinessDate` column after `.Date`. ASP.NET Core's `DateTimeModelBinder`
   * parses with `DateTimeStyles.AdjustToUniversal`, which converts a value that DENOTES a zone — so
   * `2026-07-30T00:00:00Z` or `…+02:00` is shifted before the `.Date` is taken, and near midnight
   * that silently answers for the neighbouring day. A string with no zone designator denotes
   * neither local nor UTC, so no conversion occurs at all and the date arrives as the date meant.
   * `assertBusinessDate` refuses anything else here rather than letting a binder pick an epoch
   * nobody chose.
   */
  GetPersonnelList (storeId, businessDate) {
    const query = businessDate === null || businessDate === undefined
      ? ''
      : '?businessDate=' + encodeURIComponent(assertBusinessDate(businessDate, 'businessDate'));
    return this._request('GET', '/workforce/stores/' + storeId + '/personnel-list' + query);
  }

  /**
   * Corrects ONE entry, and the register records who did it and when — § 8-5-6: "Dersom det foretas
   * rettelser i personallisten, skal det fremgå hvem som har foretatt rettelsen og tidspunkt for når
   * det er gjort."
   *
   * The correction is an APPEND, not an edit. The server writes a NEW entry that supersedes
   * `entryId` and stamps the calling manager's engagement and the instant onto it; the corrected row
   * stays exactly as it was. That is why this is a POST to a sub-collection rather than a PUT on the
   * entry — the entry is physically immutable, so a route shaped like an edit would be a route the
   * database refuses. Only the CURRENT entry can be corrected; naming one a later row already
   * replaced answers 409 `workforce.stale-revision`.
   *
   * `onSiteStartLocal` / `onSiteEndLocal` are the VENUE's wall clock (`yyyy-MM-ddTHH:mm:ss`), never
   * instants: the server owns the store's zone and converts, so this client never does zone
   * arithmetic on a statutory register. Pass `onSiteEndLocal` as null to record a window with no
   * departure. `utcOffsetMinutes` is required only for a wall time that occurs twice on a fall-back
   * day, which the server refuses rather than resolves by guess.
   */
  CorrectPersonnelListEntry (storeId, entryId, correction) {
    const input = correction || {};
    const body = {
      onSiteStartLocal: assertLocalWallTime(input.onSiteStartLocal, 'onSiteStartLocal'),
      onSiteEndLocal: input.onSiteEndLocal === null || input.onSiteEndLocal === undefined
        ? null
        : assertLocalWallTime(input.onSiteEndLocal, 'onSiteEndLocal'),
      utcOffsetMinutes: typeof input.utcOffsetMinutes === 'number' ? input.utcOffsetMinutes : null
    };

    return this._mutate(
      'POST',
      '/workforce/stores/' + storeId + '/personnel-list/entries/' + entryId + '/corrections',
      body);
  }
}

const LOCAL_WALL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

/**
 * The wire guard on a VENUE WALL-CLOCK time: `yyyy-MM-ddTHH:mm:ss`, and nothing else. Throws rather
 * than coercing.
 *
 * The `Z`/offset ban is the same one `assertBusinessDate` enforces one file over, for the same
 * reason and with sharper consequences here: a value that DENOTES a zone is converted by ASP.NET
 * Core's binder before the store's own zone is ever consulted, so a departure typed as 23:30 would
 * be written as a different hour — and on a personalliste that is a false statement about when
 * somebody left work, inside a row nothing can afterwards edit.
 */
function assertLocalWallTime (value, name) {
  if (typeof value !== 'string' || !LOCAL_WALL_TIME.test(value)) {
    throw new Error(
      name + ' must be a venue wall-clock time of the form yyyy-MM-ddTHH:mm:ss, with no Z and no offset.');
  }
  return value;
}

export default WorkforcePersonnelListService;

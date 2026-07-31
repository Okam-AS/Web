// The statutory PERSONALLISTE read — `bokføringsforskriften § 8-5-6`.
//
// Route-for-route with the backend, adding nothing. The file reference is
// `Controllers/WorkforcePersonnelListController.cs` in the OkamAPI repo.
//
//   GET /workforce/stores/{storeId}/personnel-list?businessDate=   (endpoint 30, :43)
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
// THE READ SURVIVES THE KILL-SWITCH. `workforce.personnel-list` can be switched off for writes; this
// read stays available, because a statutory register that was already written must remain producible
// on inspection.

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
}

export default WorkforcePersonnelListService;

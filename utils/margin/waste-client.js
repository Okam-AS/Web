// The Margin WASTE API client — what a kitchen threw away, why, and what it was worth.
//
// Route-for-route with `MarginWasteController` and adds nothing:
//
//   GET    /margin/waste?storeId&from&to        MarginWasteController #1
//   POST   /margin/waste?storeId                MarginWasteController #2
//   PUT    /margin/waste/{wasteEntryId}?storeId MarginWasteController #3 (If-Match)
//   DELETE /margin/waste/{wasteEntryId}?storeId MarginWasteController #4 (If-Match)
//
// SAME STAGE GATE AS THE STATEMENT SURFACE. Every route here sits behind `Margin.Module` AND
// `Margin.Statements`, and answers the same opaque 404 when either is off — waste is the weekly
// statement's explanation and freezes with it. There is deliberately no `Margin.Waste` flag: this
// estate has shipped advertised flags that gate nothing, and a fourth name with no operator lever
// would be one more.
//
// THE DATE IS A CALENDAR DATE, never an instant, for the reason `~/utils/margin/statement-client`
// spells out at length: `wasteDate` decides which statement WEEK an entry belongs to and therefore
// whether it is frozen, so one day of drift moves a loss between two weeks — and past a freeze.
// `assertBusinessDate` refuses anything that is not `yyyy-MM-dd` at the door rather than coercing.
//
// WHAT IS DELIBERATELY ABSENT: a bulk/replace-set write. Waste is recorded entry by entry as it
// happens, and a replace-set save (the shape the spend lines use) would silently delete every entry a
// partially-loaded editor never showed — over a table whose rows are somebody's record of a loss.

import { MarginClientBase } from '~/utils/margin/api-client';
import { assertBusinessDate } from '~/utils/margin/statement-client';

/** `?storeId=` is the authoritative tenant scope on every Margin route; body tenant ids are ignored. */
function scoped (path, storeId) {
  return path + (path.includes('?') ? '&' : '?') + 'storeId=' + encodeURIComponent(storeId);
}

/**
 * The wire body for one entry.
 *
 * `valueMinor` is sent as `null` rather than omitted when the venue states no amount: that is what
 * asks the server to value the entry from the ingredient's effective price at `wasteDate`, and an
 * omitted field would arrive as the same `null` only by accident of the serializer.
 */
function body (entry) {
  const input = entry || {};
  return {
    wasteDate: assertBusinessDate(input.wasteDate, 'wasteDate'),
    reason: input.reason,
    ingredientId: input.ingredientId || null,
    quantity: input.quantity === undefined || input.quantity === '' ? null : input.quantity,
    valueMinor: input.valueMinor === undefined ? null : input.valueMinor,
    description: input.description || null,
    note: input.note || null
  };
}

export class MarginWasteService extends MarginClientBase {
  /**
   * The store's waste entries in an inclusive calendar-date window, newest day first, WITH the
   * per-reason breakdown for the same window. One read answers both, so a panel can never show a list
   * and a total computed over different sets.
   */
  ListWaste (storeId, fromDate, toDate) {
    const from = assertBusinessDate(fromDate, 'from');
    const to = assertBusinessDate(toDate, 'to');
    return this._request('GET', scoped(
      '/margin/waste?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), storeId));
  }

  /**
   * Records one entry. No `If-Match`: there is no prior revision of a resource that does not exist yet,
   * and the controller routes this action through `Run` rather than `RunWithIfMatch`.
   *
   * Refused with `margin.waste-week-frozen` when the week's statement is already finalized — the
   * recording panel pre-empts that, and the server is authoritative either way.
   */
  RecordWaste (storeId, entry) {
    return this._mutate('POST', scoped('/margin/waste', storeId), body(entry));
  }

  /** Replaces one entry's content under its own revision. */
  UpdateWaste (storeId, wasteEntryId, entry, revision) {
    return this._mutateWithRevision('PUT', scoped(this._path(wasteEntryId), storeId), body(entry), revision);
  }

  /**
   * Removes a mis-keyed entry while its week is open. Answers 204 with no body, so callers get
   * `undefined` rather than a document.
   */
  DeleteWaste (storeId, wasteEntryId, revision) {
    // `undefined`, not `null`: the base client sends a body whenever one is not `undefined`, and a
    // literal `null` JSON body on a DELETE is a payload the route neither declares nor reads.
    return this._mutateWithRevision('DELETE', scoped(this._path(wasteEntryId), storeId), undefined, revision);
  }

  _path (wasteEntryId) {
    return '/margin/waste/' + encodeURIComponent(wasteEntryId);
  }
}

export default MarginWasteService;

// The two things EVERY Margin client needs and none of them owns alone: the store scope that goes on
// every route, and the module's own self-report.
//
// It sits between `MarginClientBase` (transport, no route knowledge) and the four surface clients
// (`recipe-client`, `supplier-client`, `ingredient-client`, `price-import-client`), so
// `GET /margin/status` is written once. Four copies of a one-line route would each have been correct
// and the module would have had four places to change when the flags grow a third stage.

import { MarginClientBase } from '~/utils/margin/api-client';

/** `?storeId=` is the authoritative tenant scope on every Margin route; body tenant ids are ignored. */
export function scoped (path, storeId) {
  return path + (path.includes('?') ? '&' : '?') + 'storeId=' + encodeURIComponent(storeId);
}

export class MarginModuleClient extends MarginClientBase {
  /**
   * The module's own self-report: the resolved `Margin.*` flag states, the active recipe count and
   * (once the projector has run) the sales-projection lag.
   *
   * Called FIRST by every Margin page and used only to tell "the module is off for this store" from
   * "the module is on and the read failed". Both answer 404 on every other route — the module is
   * uniformly invisible when off, by design — so without this read a page would have to guess which
   * one it was looking at.
   *
   * It is also the ONLY way to tell the two gates apart. `Margin.PriceImport` is a per-store STAGE
   * flag under the master, and the whole price-import surface answers the same opaque 404 when it is
   * off (`MarginPriceImportsController.EnsurePriceImportAccessibleAsync`) as when the master is off,
   * as when the batch does not exist. `flags.priceImport` is what lets the import page say which.
   */
  GetStatus (storeId) {
    return this._request('GET', scoped('/margin/status', storeId));
  }
}

export default MarginModuleClient;

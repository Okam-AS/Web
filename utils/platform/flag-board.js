// What the operator's flag board may claim, decided in one place away from the template.
//
// The page draws kill switches. Every sentence it prints is therefore a sentence somebody will act on
// during an incident, and the two failure modes that matter are opposite: telling an operator a flag
// is OFF when the read never answered (they go looking for a cause that is not there), and telling
// them a flag is ON when the module's gate will still refuse (they press the button and meet a 409
// they were promised they would not). Both are avoided by never turning an unknown into a value.

/** The store read has not answered yet, or failed. Nothing about this store's flags is known. */
export const BOARD_UNKNOWN = 'unknown';
/** The store read answered. Every row below carries a state the server stated. */
export const BOARD_READ = 'read';
/** The caller is not a StoreAdmin of this store (403). Not "no such store" — the API conceals that. */
export const BOARD_FORBIDDEN = 'forbidden';

/**
 * The two reads, folded into the rows the page draws.
 *
 * `catalog` is the deployment-wide universe of WRITABLE keys and `states` is this store's answer.
 * They are produced by one server-side catalog, so they normally carry the same keys. When they do
 * not, the difference is reported rather than reconciled:
 *
 *   • a key in the store read but not the catalog  -> `writable: false`. The PUT would be refused
 *     with 400 `Unknown feature flag`, so no toggle is offered for it. Offering a control that is
 *     certain to be refused is worse than offering none.
 *   • a key in the catalog but not the store read  -> a row with `state: null`. The flag exists and
 *     is writable; what this store has it set to is UNKNOWN, and the row says so instead of
 *     borrowing the catalog default and printing it as the store's answer.
 *
 * A failed catalog read is not fatal: the store read carries `module`, `title` and `defaultEnabled`
 * itself, so the board still draws. It is the WRITABILITY that becomes unknown, and `catalogRead`
 * says which of the two worlds the caller is in.
 */
export function buildBoard ({ catalog, states, forbidden }) {
  if (forbidden) {
    return { status: BOARD_FORBIDDEN, catalogRead: Array.isArray(catalog), modules: [], rows: [] };
  }

  const catalogRows = Array.isArray(catalog) ? catalog.filter(entry => entry && entry.flagKey) : null;
  const stateRows = Array.isArray(states) ? states.filter(row => row && row.flagKey) : null;

  if (!stateRows) {
    return { status: BOARD_UNKNOWN, catalogRead: !!catalogRows, modules: [], rows: [] };
  }

  const writable = {};
  const catalogOnly = {};
  if (catalogRows) {
    catalogRows.forEach((entry) => { writable[entry.flagKey] = entry; catalogOnly[entry.flagKey] = entry; });
  }
  stateRows.forEach((row) => { delete catalogOnly[row.flagKey]; });

  const rows = stateRows.map(row => toRow(row, catalogRows ? Object.prototype.hasOwnProperty.call(writable, row.flagKey) : null));

  Object.keys(catalogOnly).forEach((key) => {
    const entry = catalogOnly[key];
    rows.push({
      flagKey: key,
      module: entry.module || null,
      title: entry.title || null,
      defaultEnabled: entry.defaultEnabled === true,
      // The store read did not carry this key, so this store's state is unknown. NOT the default:
      // "the module ships this off" and "this store has it off" are different claims, and only the
      // second one is about the store the operator is looking at.
      state: null,
      isOverridden: null,
      overrideEnabled: null,
      effective: null,
      updatedByReference: null,
      updatedAtUtc: null,
      note: null,
      writable: true
    });
  });

  rows.sort((a, b) => {
    const module = String(a.module || '').localeCompare(String(b.module || ''));
    return module !== 0 ? module : String(a.flagKey).localeCompare(String(b.flagKey));
  });

  const modules = [];
  const byModule = {};
  rows.forEach((row) => {
    const key = row.module || '';
    if (!byModule[key]) { byModule[key] = { module: row.module || null, rows: [] }; modules.push(byModule[key]); }
    byModule[key].rows.push(row);
  });

  return { status: BOARD_READ, catalogRead: !!catalogRows, modules, rows };
}

/**
 * One flag as the server stated it.
 *
 * `state` is the SETTING — what this store's row says, or null when there is no row and the module
 * default stands in its place. `effective` is what the module's gate resolves, which is a different
 * question: a stage flag set on under a master that is off is `overrideEnabled: true` and
 * `effective: false`, and an operator who is shown only the first will keep flipping a switch that
 * changes nothing. Both are carried; the page prints both.
 */
function toRow (row, writable) {
  const overridden = row.isOverridden === true;
  return {
    flagKey: row.flagKey,
    module: row.module || null,
    title: row.title || null,
    defaultEnabled: row.defaultEnabled === true,
    // The setting in force for this store: the override when there is one, otherwise the default.
    state: overridden ? row.overrideEnabled === true : row.defaultEnabled === true,
    isOverridden: overridden,
    overrideEnabled: overridden ? row.overrideEnabled === true : null,
    // Never coerced. A response that omitted `effective` leaves it unknown rather than false — the
    // whole point of the honesty rule below is that a missing answer is not a negative one.
    effective: typeof row.effective === 'boolean' ? row.effective : null,
    updatedByReference: overridden ? (row.updatedByReference || null) : null,
    updatedAtUtc: overridden ? (row.updatedAtUtc || null) : null,
    note: overridden ? (row.note || null) : null,
    writable
  };
}

/**
 * Whether the setting and the module's own gate DISAGREE for a row — the case the operator has to be
 * told about, because it is the one where flipping this switch does nothing.
 *
 * Only asserted in the direction the API can prove. `state: true` with `effective: false` means
 * something else is holding the module down (a master flag, a deployment-wide config switch), and
 * the server said so. The reverse — `state:false, effective:true` — cannot happen through this API
 * and is not claimed.
 */
export function isOverruled (row) {
  return row.state === true && row.effective === false;
}

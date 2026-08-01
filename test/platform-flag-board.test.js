import { buildBoard, isOverruled, BOARD_READ, BOARD_UNKNOWN, BOARD_FORBIDDEN } from '~/utils/platform/flag-board'

// `GET /feature-flags/catalog` — `FeatureFlagCatalogEntry`, deployment-wide, no store state.
const CATALOG = [
  { flagKey: 'workforce.publication', module: 'Workforce', title: 'Schedule publication', defaultEnabled: false },
  { flagKey: 'Margin.Module', module: 'Margin', title: 'Module', defaultEnabled: false }
]

// `GET /stores/{id}/feature-flags` — `StoreFeatureFlagState`.
const state = over => Object.assign({
  flagKey: 'workforce.publication',
  module: 'Workforce',
  title: 'Schedule publication',
  defaultEnabled: false,
  isOverridden: false,
  overrideEnabled: false,
  effective: false,
  updatedByReference: null,
  updatedAtUtc: null,
  note: null
}, over || {})

const rowFor = (board, key) => board.rows.find(row => row.flagKey === key)

describe('what the board may claim about a store it has not heard from', () => {
  // The one that matters on an incident page. A store read that failed must not draw as a store
  // whose flags are all off — an operator would go looking for a cause that is not there.
  test('a store read that did not answer is UNKNOWN, never a store with every flag off', () => {
    const board = buildBoard({ catalog: CATALOG, states: null })
    expect(board.status).toBe(BOARD_UNKNOWN)
    expect(board.rows).toEqual([])
    expect(board.modules).toEqual([])
  })

  test('a 403 is its own status, not an unknown and not an empty store', () => {
    const board = buildBoard({ catalog: CATALOG, states: null, forbidden: true })
    expect(board.status).toBe(BOARD_FORBIDDEN)
    expect(board.rows).toEqual([])
  })

  test('a store that really answered with no flags is READ, and is not the unknown case', () => {
    const board = buildBoard({ catalog: [], states: [] })
    expect(board.status).toBe(BOARD_READ)
    expect(board.rows).toEqual([])
  })
})

describe('the setting and the gate are two different answers', () => {
  test('with no override the setting is the module default', () => {
    const board = buildBoard({ catalog: CATALOG, states: [state({ defaultEnabled: true, effective: true })] })
    const row = rowFor(board, 'workforce.publication')
    expect(row.state).toBe(true)
    expect(row.isOverridden).toBe(false)
    expect(row.overrideEnabled).toBeNull()
  })

  test('with an override the setting is the override, not the default', () => {
    const board = buildBoard({
      catalog: CATALOG,
      states: [state({ defaultEnabled: false, isOverridden: true, overrideEnabled: true, effective: true })]
    })
    const row = rowFor(board, 'workforce.publication')
    expect(row.state).toBe(true)
    expect(row.defaultEnabled).toBe(false)
    expect(row.overrideEnabled).toBe(true)
  })

  // The case an operator loses an hour to: they set the stage flag on, the module is still down,
  // and nothing on screen says the two answers disagree. The server reports it; the board keeps it.
  test('a setting of ON with an effective of OFF is reported as overruled', () => {
    const board = buildBoard({
      catalog: CATALOG,
      states: [state({ isOverridden: true, overrideEnabled: true, effective: false })]
    })
    const row = rowFor(board, 'workforce.publication')
    expect(row.state).toBe(true)
    expect(row.effective).toBe(false)
    expect(isOverruled(row)).toBe(true)
  })

  test('agreement is not overruled, in either direction', () => {
    const on = buildBoard({ catalog: CATALOG, states: [state({ isOverridden: true, overrideEnabled: true, effective: true })] })
    const off = buildBoard({ catalog: CATALOG, states: [state({ effective: false })] })
    expect(isOverruled(rowFor(on, 'workforce.publication'))).toBe(false)
    expect(isOverruled(rowFor(off, 'workforce.publication'))).toBe(false)
  })

  // A response that omitted `effective` says nothing about the gate. Coercing that to `false` would
  // manufacture the overruled warning above out of a missing field.
  test('a missing effective is unknown, not off, and never reads as overruled', () => {
    const board = buildBoard({
      catalog: CATALOG,
      states: [state({ isOverridden: true, overrideEnabled: true, effective: undefined })]
    })
    const row = rowFor(board, 'workforce.publication')
    expect(row.effective).toBeNull()
    expect(isOverruled(row)).toBe(false)
  })

  // The audit stamp belongs to the override. Showing "last changed by X" for a flag with no row
  // would attribute the module's compile-time default to a person.
  test('the audit stamp is withheld when there is no override to attribute', () => {
    const board = buildBoard({
      catalog: CATALOG,
      states: [state({ isOverridden: false, updatedByReference: 'user-9', updatedAtUtc: '2026-08-01T09:00:00Z', note: 'stale' })]
    })
    const row = rowFor(board, 'workforce.publication')
    expect(row.updatedByReference).toBeNull()
    expect(row.updatedAtUtc).toBeNull()
    expect(row.note).toBeNull()
  })
})

describe('when the two reads disagree', () => {
  // The PUT is deny-closed against the catalog: a key the catalog does not carry answers 400. So a
  // toggle for it would be an affordance guaranteed to be refused.
  test('a key the catalog does not carry is not writable', () => {
    const board = buildBoard({ catalog: CATALOG, states: [state({ flagKey: 'workforce.export', title: 'Export' })] })
    expect(rowFor(board, 'workforce.export').writable).toBe(false)
    expect(rowFor(board, 'Margin.Module').writable).toBe(true)
  })

  test('a key the store read did not carry is writable, and its state is unknown — not the default', () => {
    const board = buildBoard({ catalog: CATALOG, states: [state()] })
    const margin = rowFor(board, 'Margin.Module')
    expect(margin.writable).toBe(true)
    expect(margin.state).toBeNull()
    expect(margin.effective).toBeNull()
    // The catalog knows the module ships this off. That is not a claim about THIS store.
    expect(margin.defaultEnabled).toBe(false)
  })

  // A failed catalog read must not black out a page whose store read succeeded — the store read
  // carries module, title and default itself. What it costs is knowing which keys are writable.
  test('with no catalog the board still draws, and writability becomes unknown', () => {
    const board = buildBoard({ catalog: null, states: [state()] })
    expect(board.status).toBe(BOARD_READ)
    expect(board.catalogRead).toBe(false)
    expect(rowFor(board, 'workforce.publication').writable).toBeNull()
  })
})

describe('grouping', () => {
  test('rows are grouped by owning module and ordered inside it', () => {
    const board = buildBoard({
      catalog: CATALOG,
      states: [
        state({ flagKey: 'Margin.Module', module: 'Margin', title: 'Module' }),
        state({ flagKey: 'workforce.setup', module: 'Workforce', title: 'Setup' }),
        state()
      ]
    })
    expect(board.modules.map(g => g.module)).toEqual(['Margin', 'Workforce'])
    expect(board.modules[1].rows.map(r => r.flagKey)).toEqual(['workforce.publication', 'workforce.setup'])
  })

  test('rows the server returned without a module are still drawn, under no module', () => {
    const board = buildBoard({ catalog: null, states: [state({ module: null })] })
    expect(board.modules).toHaveLength(1)
    expect(board.modules[0].module).toBeNull()
    expect(board.modules[0].rows).toHaveLength(1)
  })
})

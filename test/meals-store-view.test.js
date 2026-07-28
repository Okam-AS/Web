import {
  buildStoreView,
  DATA_UNKNOWN,
  DATA_LOADED,
  CAPTURE_KNOWN,
  CAPTURE_NONE,
  CAPTURE_UNKNOWN
} from '~/utils/meals/store-view'
import { REFUSAL_DARK, REFUSAL_FORBIDDEN } from '~/utils/meals/meals-client'

const ACME = '11111111-1111-1111-1111-111111111111'
const BOLT = '22222222-2222-2222-2222-222222222222'
const GHOST = '33333333-3333-3333-3333-333333333333'

// The `GET /v1/stores/{id}/meals/companies` body is a bare ARRAY (the controller returns the
// service's List<T>); the orders body is an `{ orders: [...] }` envelope. Both shapes are as the
// backend emits them, camelCased by ASP.NET's Newtonsoft integration and with enums as NAMES
// (StringEnumConverter is registered in AddControllersWithSerializerSettings).
function agreement (over) {
  return Object.assign({
    companyId: ACME,
    legalName: 'Acme Industri AS',
    displayName: 'Acme',
    organizationNumber: '912345678',
    companyStatus: 'Active',
    agreementId: 'a-1',
    currency: 'NOK',
    agreementStatus: 'Active',
    activeMemberCount: 12
  }, over)
}

// `boundAtUtc` / `capturedAtUtc` are written EXACTLY as the wire writes them: bare, no `Z`. They are
// loaded straight off `datetime2` columns, so Newtonsoft emits no zone designator.
function order (over) {
  return Object.assign({
    orderId: 5001,
    storeId: 42,
    companyId: ACME,
    reservationId: 'r-1',
    reservationState: 'Captured',
    reservedCapMinor: 25000,
    boundCartTotalMinor: 18900,
    capturedMinor: 18900,
    currency: 'NOK',
    boundAtUtc: '2026-07-28T22:30:00',
    capturedAtUtc: '2026-07-28T22:41:12'
  }, over)
}

const view = over => buildStoreView(Object.assign({
  directory: [agreement()],
  orders: { orders: [order()] },
  selectedCompanyId: ACME
}, over))

describe('unknown is not empty — the distinction, with both halves present', () => {
  // The failure this guards is the one the brief names: a failed read rendering as "this company has
  // no agreements". Both halves are asserted in one test so neither can pass by accident.
  test('a directory that FAILED is unknown; a directory that answered with nothing is empty', () => {
    const failed = view({ directory: null, directoryRefusal: REFUSAL_DARK })
    expect(failed.agreements.state).toBe(DATA_UNKNOWN)
    expect(failed.agreements.isEmpty).toBe(false)
    expect(failed.agreements.refusal).toBe(REFUSAL_DARK)

    const answered = view({ directory: [] })
    expect(answered.agreements.state).toBe(DATA_LOADED)
    expect(answered.agreements.isEmpty).toBe(true)
    expect(answered.agreements.refusal).toBeNull()
  })

  test('the same distinction on the orders read, and it is independent of the directory', () => {
    // The agreements read fine; the orders read 403s. The venue still sees its agreements, and the
    // orders panel says nothing about them.
    const half = view({ orders: null, ordersRefusal: REFUSAL_FORBIDDEN })
    expect(half.agreements.state).toBe(DATA_LOADED)
    expect(half.agreements.rows).toHaveLength(1)
    expect(half.orders.state).toBe(DATA_UNKNOWN)
    expect(half.orders.isEmpty).toBe(false)

    const empty = view({ orders: { orders: [] } })
    expect(empty.orders.state).toBe(DATA_LOADED)
    expect(empty.orders.isEmpty).toBe(true)
  })

  test('an order count is NULL while orders are unknown, never 0', () => {
    const unknown = view({ orders: null, ordersRefusal: REFUSAL_FORBIDDEN })
    expect(unknown.agreements.rows[0].orderCount).toBeNull()

    // Positive control: once the read answers, a genuine zero IS a zero.
    const answered = view({ orders: { orders: [] } })
    expect(answered.agreements.rows[0].orderCount).toBe(0)
  })

  test('a body of the wrong shape is unknown, not an empty list', () => {
    expect(buildStoreView({ directory: { entries: [] } }).agreements.state).toBe(DATA_UNKNOWN)
    expect(buildStoreView({ orders: [] }).orders.state).toBe(DATA_UNKNOWN)
    expect(buildStoreView({}).agreements.state).toBe(DATA_UNKNOWN)
  })
})

describe('timestamps — parsed as the instants they are, never as browser-local', () => {
  // The defect that shipped and was fixed in b65501c. Under TZ=Europe/Oslo the two readings of the
  // same bare string are two hours apart in July, so the assertion has teeth rather than being a
  // tautology that would also pass in UTC.
  test('a bare wire stamp is read as UTC, and it is NOT what new Date() would have given', () => {
    const row = view().orders.rows[0]
    expect(row.boundAt.getTime()).toBe(Date.parse('2026-07-28T22:30:00Z'))

    const naive = new Date('2026-07-28T22:30:00')
    expect(naive.getTime()).not.toBe(row.boundAt.getTime())
    // Spelled out: this fixture actually exercises an offset. If the suite were ever run in UTC the
    // line above would silently stop proving anything, so the offset itself is asserted.
    expect(Math.abs(naive.getTime() - row.boundAt.getTime())).toBe(2 * 3600 * 1000)
  })

  test('an already-zoned stamp is not double-shifted', () => {
    const row = view({ orders: { orders: [order({ boundAtUtc: '2026-07-28T22:30:00Z' })] } }).orders.rows[0]
    expect(row.boundAt.getTime()).toBe(Date.parse('2026-07-28T22:30:00Z'))
  })

  test('a null capture stamp stays null rather than becoming an epoch', () => {
    const row = view({ orders: { orders: [order({ capturedAtUtc: null })] } }).orders.rows[0]
    expect(row.capturedAt).toBeNull()
  })
})

describe('captured money — the two meanings of zero are kept apart', () => {
  // The backend computes `capturedMinor` as `SUM(GrossMinor) ?? 0`, so the wire sends 0 for BOTH
  // "no allocation exists yet" and "captured, then reversed to nothing". Each fixture below varies
  // exactly the field that distinguishes them.
  test('no stamp AND zero is NOT captured; a stamp with zero is a real zero', () => {
    const notYet = view({
      orders: { orders: [order({ reservationState: 'Bound', capturedMinor: 0, capturedAtUtc: null })] }
    }).orders.rows[0]
    expect(notYet.captured.state).toBe(CAPTURE_NONE)

    const reversedToNothing = view({
      orders: { orders: [order({ capturedMinor: 0, capturedAtUtc: '2026-07-28T22:41:12' })] }
    }).orders.rows[0]
    expect(reversedToNothing.captured.state).toBe(CAPTURE_KNOWN)
    expect(reversedToNothing.captured.minor).toBe(0)
  })

  test('a non-zero sum with no stamp yet is still shown — a capture in flight is not an absence', () => {
    const inFlight = view({
      orders: { orders: [order({ capturedMinor: 18900, capturedAtUtc: null })] }
    }).orders.rows[0]
    expect(inFlight.captured.state).toBe(CAPTURE_KNOWN)
    expect(inFlight.captured.minor).toBe(18900)
  })

  test('a missing figure is UNKNOWN — a third state, not folded into either zero', () => {
    const absent = view({
      orders: { orders: [order({ capturedMinor: undefined, capturedAtUtc: null })] }
    }).orders.rows[0]
    expect(absent.captured.state).toBe(CAPTURE_UNKNOWN)
    expect(absent.captured.minor).toBeNull()

    // All three states are distinct values. If two ever collapsed, the assertions above could still
    // pass while the surface rendered them identically.
    expect(new Set([CAPTURE_KNOWN, CAPTURE_NONE, CAPTURE_UNKNOWN]).size).toBe(3)
  })
})

describe('money is integers, and nothing is derived from it', () => {
  test('a non-integer minor value is refused rather than rendered', () => {
    const rows = view({
      orders: { orders: [order({ reservedCapMinor: 250.5, boundCartTotalMinor: 18900 })] }
    }).orders.rows[0]
    expect(rows.reservedCap).toBeNull()
    // Positive control: the neighbouring integer field on the same row is untouched.
    expect(rows.boundTotal).toEqual({ minor: 18900, currency: 'NOK' })
  })

  test('a value past exact integer range is refused — a lost øre is a real defect', () => {
    const row = view({
      orders: { orders: [order({ boundCartTotalMinor: Number.MAX_SAFE_INTEGER + 2 })] }
    }).orders.rows[0]
    expect(row.boundTotal).toBeNull()
  })

  // THE MONEY LAW, stated as a shape assertion: the view exposes per-order amounts and no rollup of
  // any kind. If a totals field is ever added here, this fails before it can reach a screen.
  test('the view exposes NO total, on either read', () => {
    const built = view({
      orders: { orders: [order(), order({ orderId: 5002, reservationId: 'r-2', capturedMinor: 10000 })] }
    })
    const surfaced = JSON.stringify(built)
    expect(surfaced).not.toMatch(/total(Minor|Gross|Net|Captured)/i)
    expect(Object.keys(built.orders).sort()).toEqual(['isEmpty', 'refusal', 'rows', 'state', 'unlistedCompanyIds'])
    expect(Object.keys(built.agreements).sort()).toEqual(['isEmpty', 'refusal', 'rows', 'state'])
    // Positive control: the per-order figures the rollup would have been built from ARE present, so
    // this is not passing because the view produced nothing.
    expect(built.orders.rows.map(r => r.captured.minor)).toEqual([18900, 10000])
  })
})

describe('grouping by company — orders are attributed, never reassigned or dropped', () => {
  const twoCompanies = {
    directory: [agreement(), agreement({ companyId: BOLT, displayName: 'Bolt', agreementId: 'a-2', currency: 'CHF', activeMemberCount: 3 })],
    orders: {
      orders: [
        order(),
        order({ orderId: 5002, reservationId: 'r-2', companyId: BOLT, currency: 'CHF', capturedMinor: 4500 })
      ]
    }
  }

  test('only the selected company\'s orders are shown, and the counts follow the split', () => {
    const acme = buildStoreView(Object.assign({ selectedCompanyId: ACME }, twoCompanies))
    expect(acme.orders.rows.map(r => r.orderId)).toEqual([5001])
    expect(acme.agreements.rows.map(r => r.orderCount)).toEqual([1, 1])
    expect(acme.selected.label).toBe('Acme')

    const bolt = buildStoreView(Object.assign({ selectedCompanyId: BOLT }, twoCompanies))
    expect(bolt.orders.rows.map(r => r.orderId)).toEqual([5002])
    expect(bolt.orders.rows[0].captured.currency).toBe('CHF')
  })

  test('nothing selected shows no orders — never the whole store under one company\'s name', () => {
    const none = buildStoreView(Object.assign({ selectedCompanyId: null }, twoCompanies))
    expect(none.selected).toBeNull()
    expect(none.orders.rows).toEqual([])
    // ...and that is NOT the empty state, which would be a claim about the selected company.
    expect(none.orders.isEmpty).toBe(false)
  })

  // The backend's directory projection skips an agreement whose company row is missing, so an order
  // can name a company the venue cannot see. It is reported, not swallowed.
  test('an order for a company the directory does not list is surfaced as unlisted', () => {
    const built = buildStoreView({
      directory: [agreement()],
      orders: { orders: [order(), order({ orderId: 5003, reservationId: 'r-3', companyId: GHOST })] },
      selectedCompanyId: ACME
    })
    expect(built.orders.unlistedCompanyIds).toEqual([GHOST])
    // The listed company's own row is unaffected.
    expect(built.orders.rows.map(r => r.isUnlistedCompany)).toEqual([false])
  })

  test('while the directory is UNKNOWN nothing is called unlisted — there is no list to check', () => {
    const built = buildStoreView({
      directory: null,
      directoryRefusal: REFUSAL_DARK,
      orders: { orders: [order({ companyId: GHOST })] },
      selectedCompanyId: GHOST
    })
    expect(built.orders.unlistedCompanyIds).toEqual([])
    expect(built.orders.rows[0].isUnlistedCompany).toBe(false)
  })
})

describe('agreement rows copy what the server said and invent nothing', () => {
  test('the label falls back display -> legal, and the legal name repeats only when it differs', () => {
    const same = buildStoreView({ directory: [agreement({ displayName: 'Acme Industri AS' })] }).agreements.rows[0]
    expect(same.label).toBe('Acme Industri AS')
    expect(same.secondaryName).toBeNull()

    const differs = buildStoreView({ directory: [agreement()] }).agreements.rows[0]
    expect(differs.label).toBe('Acme')
    expect(differs.secondaryName).toBe('Acme Industri AS')

    const noDisplay = buildStoreView({ directory: [agreement({ displayName: null })] }).agreements.rows[0]
    expect(noDisplay.label).toBe('Acme Industri AS')
  })

  test('a company with no readable name gets a null label, not its id', () => {
    const row = buildStoreView({ directory: [agreement({ displayName: null, legalName: null })] }).agreements.rows[0]
    expect(row.label).toBeNull()
    expect(row.companyId).toBe(ACME)
  })

  test('an absent member count is null, not zero', () => {
    expect(buildStoreView({ directory: [agreement({ activeMemberCount: undefined })] }).agreements.rows[0].activeMemberCount)
      .toBeNull()
    // Positive control: a real zero survives as a zero.
    expect(buildStoreView({ directory: [agreement({ activeMemberCount: 0 })] }).agreements.rows[0].activeMemberCount)
      .toBe(0)
  })

  test('an unrecognised agreement status is passed through, never mapped onto Active', () => {
    const row = buildStoreView({ directory: [agreement({ agreementStatus: 'Suspended' })] }).agreements.rows[0]
    expect(row.agreementStatus).toBe('Suspended')
  })
})

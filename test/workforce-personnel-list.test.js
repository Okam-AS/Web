import { isWorkforceApiError } from '~/utils/workforce/api-client'
import { WorkforcePersonnelListService } from '~/utils/workforce/personnel-list-client'
import {
  SHEET_EMPTY,
  SHEET_READY,
  SHEET_UNKNOWN,
  STATUS_COMPLETED,
  STATUS_NO_DEPARTURE,
  STATUS_PRESENT,
  buildPersonnelSheet,
  formatOrganizationNumber
} from '~/utils/workforce/personnel-list'

// The shared base mints the Idempotency-Key from `crypto.getRandomValues`, which this jsdom
// environment does not expose. Pinned rather than shimmed so the header can be asserted BY VALUE —
// the same treatment workforce-api-client.test.js gives it. (`jest.mock` is hoisted above the
// imports at transform time, so declaring it here still registers before the client is loaded.)
jest.mock('~/utils/guid', () => ({ newGuid: () => 'test-idempotency-key' }))

// The statutory personalliste, from the wire to the sheet.
//
// The response fixture below is the backend's OWN committed wire fixture
// (`WebApi.Tests/Workforce/PersonnelListContractTests.cs` → `docs/api/fixtures/workforce/personnel-list.json`)
// rather than a shape invented here, so a contract drift on the server is a failure in this file
// instead of a surprise on a printed register.
//
// These tests resolve every instant through an EXPLICIT zone, so they do not depend on the ambient
// TZ — which is the property they exist to prove.

const wireResponse = over => Object.assign({
  storeId: 90001,
  businessDate: '2026-07-13T00:00:00',
  timeZoneId: 'Europe/Oslo',
  timeZoneIsFallback: false,
  asOfUtc: '2026-07-13T12:00:00Z',
  presentCount: 2,
  rows: [
    {
      personnelListEntryId: 'a1000000-0000-0000-0000-000000000001',
      participantId: 'b1000000-0000-0000-0000-000000000001',
      category: 'Employee',
      participantName: 'Kari Claimed',
      protectedIdentityCodeRef: 'wf-person:20000000-0000-0000-0000-000000000002',
      staffMemberId: '30000000-0000-0000-0000-000000000001',
      hiredInOrganizationNumber: null,
      businessName: 'Okam Pilot Servering AS',
      organizationNumber: '923456789',
      onSiteStartUtc: '2026-07-13T07:00:00',
      onSiteEndUtc: null,
      isPresent: true,
      supersedesEntryId: null,
      correctionActorReference: null,
      correctedAtUtc: null,
      retainUntilUtc: '2030-06-30T00:00:00'
    },
    {
      personnelListEntryId: 'a1000000-0000-0000-0000-000000000002',
      participantId: 'b1000000-0000-0000-0000-000000000002',
      category: 'Employee',
      participantName: 'Ingrid Invited',
      protectedIdentityCodeRef: 'wf-person:20000000-0000-0000-0000-000000000001',
      staffMemberId: '30000000-0000-0000-0000-000000000002',
      hiredInOrganizationNumber: null,
      businessName: 'Okam Pilot Servering AS',
      organizationNumber: '923456789',
      onSiteStartUtc: '2026-07-13T08:00:00',
      onSiteEndUtc: '2026-07-13T11:00:00',
      isPresent: false,
      supersedesEntryId: 'a1000000-0000-0000-0000-0000000000f2',
      correctionActorReference: null,
      correctedAtUtc: null,
      retainUntilUtc: '2030-06-30T00:00:00'
    },
    {
      personnelListEntryId: 'a1000000-0000-0000-0000-000000000003',
      participantId: 'b1000000-0000-0000-0000-000000000003',
      category: 'HiredIn',
      participantName: 'Hans HiredIn',
      protectedIdentityCodeRef: 'wf-hired:912345678-001',
      staffMemberId: null,
      hiredInOrganizationNumber: '912345678',
      businessName: 'Okam Pilot Servering AS',
      organizationNumber: '923456789',
      onSiteStartUtc: '2026-07-13T09:00:00',
      onSiteEndUtc: null,
      isPresent: true,
      supersedesEntryId: null,
      correctionActorReference: null,
      correctedAtUtc: null,
      retainUntilUtc: '2030-06-30T00:00:00'
    }
  ]
}, over)

const sheetOf = over => buildPersonnelSheet(wireResponse(over), { contextTimeZoneId: 'Europe/Oslo' })

describe('buildPersonnelSheet — a read that did not answer is not an empty venue', () => {
  test('no response at all is UNKNOWN, and claims nothing about the day', () => {
    const sheet = buildPersonnelSheet(null, { contextTimeZoneId: 'Europe/Oslo' })

    expect(sheet.state).toBe(SHEET_UNKNOWN)
    expect(sheet.rows).toEqual([])
    expect(sheet.businessDate).toBeNull()
    expect(sheet.businessIdentity).toBeNull()
    // Null, not zero: "we do not know how many were on site" and "nobody was" are different claims,
    // and a zero printed on a statutory register is the second one.
    expect(sheet.openWindowCount).toBeNull()
    expect(sheet.isToday).toBeNull()
  })

  test('a response with no rows is EMPTY — a positive answer, and it still carries the day', () => {
    const sheet = sheetOf({ rows: [], presentCount: 0 })

    expect(sheet.state).toBe(SHEET_EMPTY)
    expect(sheet.businessDate).toBe('2026-07-13')
    expect(sheet.timeZoneId).toBe('Europe/Oslo')
    expect(sheet.asOf).toEqual({ isoDate: '2026-07-13', time: '14:00', dayOffset: 0 })
    // The business identity is recorded ON THE ENTRIES. A day with none carries none, and this does
    // not go looking for one somewhere else — nothing was observed, so nothing is asserted.
    expect(sheet.businesses).toEqual([])
    expect(sheet.businessIdentity).toBeNull()
  })
})

describe('buildPersonnelSheet — the venue clock, never the browser\'s', () => {
  test('arrival and departure are rendered in the STORE zone', () => {
    const sheet = sheetOf()

    expect(sheet.state).toBe(SHEET_READY)
    // 07:00Z in July is 09:00 in Oslo (CEST). The wire value arrives BARE off a column load and is
    // still UTC; reading it as local would move the whole register by the viewer's offset.
    expect(sheet.rows[0].start.time).toBe('09:00')
    expect(sheet.rows[1].start.time).toBe('10:00')
    expect(sheet.rows[1].end.time).toBe('13:00')
  })

  test('the same response rendered in another zone moves every time together', () => {
    const oslo = buildPersonnelSheet(wireResponse(), { contextTimeZoneId: 'Europe/Oslo' })
    const reykjavik = buildPersonnelSheet(wireResponse({ timeZoneId: 'Atlantic/Reykjavik' }), {})

    expect(oslo.rows[0].start.time).toBe('09:00')
    expect(reykjavik.rows[0].start.time).toBe('07:00')
    expect(reykjavik.timeZoneId).toBe('Atlantic/Reykjavik')
  })

  test('the response zone wins over the page context zone, and is reported as the one used', () => {
    // The response's zone is the one the SERVER bucketed the entries into. Rendering the rows in a
    // different zone from the one the day was cut on is how a 23:30 arrival lands on the wrong sheet.
    const sheet = buildPersonnelSheet(wireResponse({ timeZoneId: 'Europe/Zurich' }), { contextTimeZoneId: 'Europe/Oslo' })
    expect(sheet.timeZoneId).toBe('Europe/Zurich')
  })

  test('a zone the engine cannot load is refused rather than thrown out of the render', () => {
    const sheet = buildPersonnelSheet(wireResponse({ timeZoneId: 'Mars/Olympus_Mons' }), {})

    expect(sheet.zoneUnusable).toBe(true)
    expect(sheet.state).toBe(SHEET_UNKNOWN)
    expect(sheet.rows).toEqual([])
  })

  test('an overnight window names the day its departure fell on', () => {
    // The backend keeps the OPENING day's business date on the closing entry, so a shift that ran
    // 22:30 → 02:10 legitimately ends on the next calendar day. A bare "02:10" beside "22:30" reads
    // as a shift that ran backwards.
    const sheet = sheetOf({
      rows: [Object.assign({}, wireResponse().rows[1], {
        onSiteStartUtc: '2026-07-13T20:30:00',
        onSiteEndUtc: '2026-07-14T00:10:00'
      })]
    })

    expect(sheet.rows[0].start).toEqual({ isoDate: '2026-07-13', time: '22:30', dayOffset: 0 })
    expect(sheet.rows[0].end).toEqual({ isoDate: '2026-07-14', time: '02:10', dayOffset: 1 })
  })
})

describe('buildPersonnelSheet — an open window means two different things', () => {
  test('on the venue\'s CURRENT day an open window is a person on site', () => {
    // The venue's today is taken from the server's own `asOfUtc`, resolved in the store zone — the
    // browser clock never enters it.
    const sheet = sheetOf()

    expect(sheet.isToday).toBe(true)
    expect(sheet.rows[0].status).toBe(STATUS_PRESENT)
    expect(sheet.rows[1].status).toBe(STATUS_COMPLETED)
    expect(sheet.rows[2].status).toBe(STATUS_PRESENT)
  })

  test('on a PAST day an open window is a missing departure, not a person standing there', () => {
    const sheet = sheetOf({ asOfUtc: '2026-08-01T09:00:00Z' })

    expect(sheet.isToday).toBe(false)
    expect(sheet.rows[0].status).toBe(STATUS_NO_DEPARTURE)
    expect(sheet.rows[2].status).toBe(STATUS_NO_DEPARTURE)
  })

  test('without the server\'s stamp the weaker claim is made, never the stronger one', () => {
    // Asserting somebody's whereabouts from a value we do not have would be the one claim on this
    // register that a person could be confronted with.
    const sheet = sheetOf({ asOfUtc: null })

    expect(sheet.isToday).toBeNull()
    expect(sheet.rows[0].status).toBe(STATUS_NO_DEPARTURE)
  })

  test('the day flips exactly on the venue\'s midnight, not on UTC\'s', () => {
    // 2026-07-13T22:30Z is already 14 July in Oslo, so a list for the 13th is no longer today.
    expect(sheetOf({ asOfUtc: '2026-07-13T22:30:00Z' }).isToday).toBe(false)
    expect(sheetOf({ asOfUtc: '2026-07-13T21:30:00Z' }).isToday).toBe(true)
  })
})

describe('buildPersonnelSheet — the statutory facts', () => {
  test('the business name and organisation number are read off the entries', () => {
    const sheet = sheetOf()

    expect(sheet.businessIdentity).toEqual({ name: 'Okam Pilot Servering AS', organizationNumber: '923456789' })
    expect(sheet.hasMixedBusinessIdentity).toBe(false)
  })

  test('entries under two different businesses refuse to answer with one', () => {
    const rows = wireResponse().rows
    rows[2] = Object.assign({}, rows[2], { businessName: 'Annen Drift AS', organizationNumber: '912345678' })
    const sheet = sheetOf({ rows })

    expect(sheet.hasMixedBusinessIdentity).toBe(true)
    expect(sheet.businessIdentity).toBeNull()
    expect(sheet.businesses).toEqual([
      { name: 'Okam Pilot Servering AS', organizationNumber: '923456789' },
      { name: 'Annen Drift AS', organizationNumber: '912345678' }
    ])
  })

  test('the identity code is passed through exactly as the register recorded it', () => {
    // It is not shortened, prettified or replaced. The code IS the identification the register
    // offers, and rewriting it here would mean the printed sheet and the stored row disagree.
    const sheet = sheetOf()

    expect(sheet.rows[0].identityCode).toBe('wf-person:20000000-0000-0000-0000-000000000002')
    expect(sheet.rows[2].identityCode).toBe('wf-hired:912345678-001')
  })

  test('a hired-in row carries the org number of the employer it is hired in from', () => {
    expect(sheetOf().rows[2].hiredInOrganizationNumber).toBe('912345678')
  })

  test('an unrecognised category is passed through, never folded into a known one', () => {
    // A wrong category on a statutory register is a false statement about someone's relationship to
    // the business.
    const sheet = sheetOf({ rows: [Object.assign({}, wireResponse().rows[0], { category: 'SomethingNew' })] })

    expect(sheet.rows[0].category).toBe('SomethingNew')
    expect(sheet.rows[0].categoryIsKnown).toBe(false)
    expect(sheetOf().rows[0].categoryIsKnown).toBe(true)
  })

  test('a correction carries who made it and when — § 8-5-6 asks for both', () => {
    const sheet = sheetOf({
      rows: [Object.assign({}, wireResponse().rows[1], {
        correctionActorReference: 'user:42',
        correctedAtUtc: '2026-07-13T15:20:00'
      })]
    })

    expect(sheet.rows[0].correction).toEqual({
      actor: 'user:42',
      at: { isoDate: '2026-07-13', time: '17:20', dayOffset: 0 }
    })
    expect(sheet.correctedCount).toBe(1)
  })

  test('an uncorrected row carries no correction object at all', () => {
    expect(sheetOf().rows[0].correction).toBeNull()
    expect(sheetOf().correctedCount).toBe(0)
  })

  test('the retention horizon is the furthest one on the day, as a civil date', () => {
    const rows = wireResponse().rows
    rows[0] = Object.assign({}, rows[0], { retainUntilUtc: '2031-06-30T00:00:00' })

    // Sliced off the raw value rather than converted through a zone: it is the backend's civil
    // "accounting-year end + 3 years 6 months", and a conversion could move it a day.
    expect(sheetOf({ rows }).retainUntil).toBe('2031-06-30')
  })
})

describe('buildPersonnelSheet — the server\'s figures are not recomputed', () => {
  test('the open-window count is the server\'s presentCount, even where a local count would differ', () => {
    // Deliberately inconsistent input. A second count made here that disagreed with the server's
    // would leave nobody able to say which one an inspector should believe — so there is one count,
    // and it is the server's.
    expect(sheetOf({ presentCount: 7 }).openWindowCount).toBe(7)
  })

  test('a response that carried no count reports none rather than a made-up zero', () => {
    expect(sheetOf({ presentCount: undefined }).openWindowCount).toBeNull()
  })

  test('the fallback-zone flag is carried through so the sheet can say the zone was not chosen', () => {
    expect(sheetOf({ timeZoneIsFallback: true }).timeZoneIsFallback).toBe(true)
    expect(sheetOf().timeZoneIsFallback).toBe(false)
  })
})

describe('formatOrganizationNumber', () => {
  test('nine digits are grouped the way a Norwegian organisation number is written', () => {
    expect(formatOrganizationNumber('923456789')).toBe('923 456 789')
    expect(formatOrganizationNumber(' 923456789 ')).toBe('923 456 789')
  })

  test('anything that is not nine digits is printed as recorded', () => {
    // A value that is not a Norwegian organisation number must not be dressed up as one on a
    // statutory sheet.
    expect(formatOrganizationNumber('CHE-123.456.789')).toBe('CHE-123.456.789')
    expect(formatOrganizationNumber('12345')).toBe('12345')
    expect(formatOrganizationNumber('')).toBeNull()
    expect(formatOrganizationNumber(null)).toBeNull()
  })
})

describe('WorkforcePersonnelListService — route-for-route with endpoint 30', () => {
  const originalFetch = global.fetch

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  const service = () => new WorkforcePersonnelListService({ bearerToken: 'tok-123' })

  afterEach(() => { global.fetch = originalFetch })

  test('omitting the date sends NO businessDate, so the server resolves the venue\'s today', () => {
    respondWith(200, wireResponse())
    service().GetPersonnelList(42)

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/personnel-list')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
    // A read: the surface demands an Idempotency-Key on mutations only.
    expect(init.headers['Idempotency-Key']).toBeUndefined()
  })

  test('a date leaves as a BARE calendar date, with no zone designator', () => {
    // The parameter binds as `DateTime?` under `DateTimeStyles.AdjustToUniversal`: a value that
    // denotes a zone is CONVERTED before `.Date` is taken, which near midnight answers for the
    // neighbouring day. A bare date denotes neither local nor UTC, so nothing converts it.
    respondWith(200, wireResponse())
    service().GetPersonnelList(42, '2026-07-13')

    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/personnel-list?businessDate=2026-07-13')
  })

  test('a Date, an instant or a half-typed date is REFUSED, not coerced', () => {
    respondWith(200, wireResponse())

    expect(() => service().GetPersonnelList(42, new Date('2026-07-13T00:00:00Z'))).toThrow(/yyyy-MM-dd/)
    expect(() => service().GetPersonnelList(42, '2026-07-13T00:00:00Z')).toThrow(/yyyy-MM-dd/)
    expect(() => service().GetPersonnelList(42, '2026-7-13')).toThrow(/yyyy-MM-dd/)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('a 403 becomes the one shared typed workforce failure', async () => {
    respondWith(403, { code: 'workforce.forbidden', detail: 'Missing WorkforceManager.' })

    await expect(service().GetPersonnelList(42, '2026-07-13')).rejects.toMatchObject({ status: 403 })
    await service().GetPersonnelList(42, '2026-07-13').catch((e) => {
      expect(isWorkforceApiError(e)).toBe(true)
      expect(e.code).toBe('workforce.forbidden')
    })
  })

  // ---- The § 8-5-6 correction ----------------------------------------------------------------

  test('a correction POSTs to the entry\'s corrections sub-collection, never a PUT on the entry', () => {
    // The shape is the append the backend performs: a NEW entry supersedes this one. The whole
    // family is physically append-only, so a route shaped like an edit would be one the database
    // refuses.
    respondWith(200, {})
    service().CorrectPersonnelListEntry(42, 'entry-1', {
      onSiteStartLocal: '2026-07-13T09:00:00',
      onSiteEndLocal: '2026-07-13T16:45:00'
    })

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/personnel-list/entries/entry-1/corrections')
    expect(init.method).toBe('POST')
    // A mutation, so the shared base attaches the key the endpoint demands — the correction is
    // otherwise retryable into a chain of superseding rows, which is a fork of the register.
    expect(init.headers['Idempotency-Key']).toBe('test-idempotency-key')
    expect(JSON.parse(init.body)).toEqual({
      onSiteStartLocal: '2026-07-13T09:00:00',
      onSiteEndLocal: '2026-07-13T16:45:00',
      utcOffsetMinutes: null
    })
  })

  test('a null departure is sent as null — a window with no recorded end is a real state', () => {
    respondWith(200, {})
    service().CorrectPersonnelListEntry(42, 'entry-1', {
      onSiteStartLocal: '2026-07-13T09:00:00',
      onSiteEndLocal: null
    })

    expect(JSON.parse(global.fetch.mock.calls[0][1].body).onSiteEndLocal).toBeNull()
  })

  test('a time carrying a zone is REFUSED before it can be written into an immutable row', () => {
    // A value that DENOTES a zone is converted by the model binder before the store's own zone is
    // consulted, so a departure typed as 23:30 would be recorded as another hour — a false statement
    // about when somebody left work, inside a row nothing can afterwards edit.
    respondWith(200, {})

    expect(() => service().CorrectPersonnelListEntry(42, 'entry-1', {
      onSiteStartLocal: '2026-07-13T09:00:00Z'
    })).toThrow(/yyyy-MM-ddTHH:mm:ss/)
    expect(() => service().CorrectPersonnelListEntry(42, 'entry-1', {
      onSiteStartLocal: '2026-07-13T09:00:00',
      onSiteEndLocal: '2026-07-13T16:45:00+02:00'
    })).toThrow(/yyyy-MM-ddTHH:mm:ss/)
    expect(() => service().CorrectPersonnelListEntry(42, 'entry-1', {
      onSiteStartLocal: '2026-07-13'
    })).toThrow(/yyyy-MM-ddTHH:mm:ss/)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('the stale-revision refusal arrives as the typed failure a caller can act on', async () => {
    // Correcting a row a later one already replaced. The caller keys on the CODE, never on the
    // prose, which is localised.
    respondWith(409, {
      code: 'workforce.stale-revision',
      conflictKind: 'stale-revision',
      detail: 'The submitted base revision is stale; the resource has since changed.'
    })

    // `rejects` FIRST, as the 403 test above does. A bare `.catch(fn)` on a promise that resolves
    // runs zero assertions and reports green, so the whole refusal could stop happening — the client
    // handing a 409 body back as a successful result — without this test noticing. The rejection is
    // the claim; the fields are the detail.
    await expect(service().CorrectPersonnelListEntry(42, 'entry-1', { onSiteStartLocal: '2026-07-13T09:00:00' }))
      .rejects.toMatchObject({ status: 409, code: 'workforce.stale-revision', conflictKind: 'stale-revision' })

    await service().CorrectPersonnelListEntry(42, 'entry-1', { onSiteStartLocal: '2026-07-13T09:00:00' })
      .catch((e) => {
        expect(isWorkforceApiError(e)).toBe(true)
      })
  })
})

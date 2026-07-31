import {
  readListing,
  readCourseDetail,
  readHoldings,
  flagState,
  zoneIdOf,
  zoneIsFallback,
  assignableVersions,
  recordableVersions,
  versionLabel,
  instantOf,
  civilDateOf,
  toApiDate,
  instantLabel,
  certificateRow,
  completionRow,
  assignmentRow,
  courseRow,
  personDirectory,
  roleDirectory,
  directoryMatch,
  isReferenceId,
  READ_UNKNOWN,
  READ_REFUSED,
  READ_ANSWERED
} from '~/utils/training/journey'
import { WorkforceApiError } from '~/utils/workforce/api-client'

const refusal = (status, code) => new WorkforceApiError(status, { code, detail: 'server prose' })

describe('readListing — unknown, refused and empty are three answers', () => {
  test('an answered list is answered, and an empty one is a real zero', () => {
    const empty = readListing({ storeId: 42, courses: [], asOfUtc: '2026-07-29T10:00:00Z' }, null, 'courses')
    expect(empty.state).toBe(READ_ANSWERED)
    expect(empty.rows).toEqual([])
  })

  test('a refused read carries no rows at all, so nothing downstream can call it empty', () => {
    const refused = readListing(null, refusal(404, 'training.not-found'), 'courses')
    expect(refused.state).toBe(READ_REFUSED)
    // THE POINT: not `[]`. A panel rendering `rows.length` cannot print "no courses" over this.
    expect(refused.rows).toBeNull()
    expect(refused.code).toBe('training.not-found')
  })

  test('a failure that is not this module\'s is UNKNOWN, not a refusal by Training', () => {
    expect(readListing(null, new Error('network down'), 'courses').state).toBe(READ_UNKNOWN)
    expect(readListing(null, refusal(502, null), 'courses').state).toBe(READ_UNKNOWN)
  })

  test('a 200 whose envelope carries no list is UNKNOWN, not empty', () => {
    // The backend's own model initialises every collection, so a missing one is a shape we do not
    // understand — which is a different claim from a store with nothing in it.
    expect(readListing({ storeId: 42 }, null, 'courses').state).toBe(READ_UNKNOWN)
    expect(readListing({ storeId: 42, courses: 'nope' }, null, 'courses').state).toBe(READ_UNKNOWN)
    expect(readListing(null, null, 'courses').state).toBe(READ_UNKNOWN)
  })

  test('THE DISTINCTION, varied: the same key answered vs refused vs unanswered gives three states', () => {
    const answered = readListing({ certificates: [] }, null, 'certificates')
    const refused = readListing(null, refusal(403, 'training.forbidden'), 'certificates')
    const unknown = readListing(null, new Error('x'), 'certificates')
    expect([answered.state, refused.state, unknown.state]).toEqual([READ_ANSWERED, READ_REFUSED, READ_UNKNOWN])
    expect(new Set([answered.state, refused.state, unknown.state]).size).toBe(3)
  })

  test('the server\'s own asOf comes through parsed, and is null when it did not', () => {
    expect(readListing({ courses: [], asOfUtc: '2026-07-29T10:00:00Z' }, null, 'courses').asOf.toISOString())
      .toBe('2026-07-29T10:00:00.000Z')
    expect(readListing({ courses: [] }, null, 'courses').asOf).toBeNull()
  })
})

describe('readCourseDetail and readHoldings — same three states', () => {
  test('a course detail answers with its versions', () => {
    const view = readCourseDetail({ courseId: 'c-1', versions: [{ versionNo: 1 }] }, null)
    expect(view.state).toBe(READ_ANSWERED)
    expect(view.versions).toHaveLength(1)
  })

  test('a refused course read holds no versions', () => {
    const view = readCourseDetail(null, refusal(404, 'training.not-found'))
    expect(view.state).toBe(READ_REFUSED)
    expect(view.versions).toBeNull()
  })

  test('an answered holdings document with nothing in it is a real "nothing is on record"', () => {
    const view = readHoldings({ personRef: 'p-1', heldCompetencyKeys: [], certificates: [], asOfUtc: '2026-07-29T10:00:00Z' }, null)
    expect(view.state).toBe(READ_ANSWERED)
    expect(view.keys).toEqual([])
    expect(view.certificates).toEqual([])
  })

  test('a refused holdings read holds neither, so absence cannot be read as a verdict', () => {
    const view = readHoldings(null, refusal(403, 'training.forbidden'))
    expect(view.state).toBe(READ_REFUSED)
    expect(view.keys).toBeNull()
    expect(view.certificates).toBeNull()
  })
})

describe('flagState — a flag is on, off, or unknown', () => {
  const context = { featureFlags: { 'training.setup': true, 'training.assignments': false } }

  test('the server\'s booleans come through as booleans', () => {
    expect(flagState(context, 'training.setup')).toBe(true)
    expect(flagState(context, 'training.assignments')).toBe(false)
  })

  test('a flag the server did not report is UNKNOWN, never off', () => {
    // Greying a control out on this would tell a venue their module is switched off on the strength
    // of a read that never answered.
    expect(flagState(context, 'training.reminders')).toBeNull()
    expect(flagState(null, 'training.setup')).toBeNull()
    expect(flagState({}, 'training.setup')).toBeNull()
    expect(flagState({ featureFlags: { 'training.setup': 'true' } }, 'training.setup')).toBeNull()
  })

  test('THE DISTINCTION, varied: on, off and unknown are three different values', () => {
    const states = [
      flagState(context, 'training.setup'),
      flagState(context, 'training.assignments'),
      flagState(context, 'training.checklists')
    ]
    expect(states).toEqual([true, false, null])
  })

  test('the zone is read from the server, and the fallback flag is only true when the server said so', () => {
    expect(zoneIdOf({ timeZone: { id: 'Europe/Oslo', isFallback: false } })).toBe('Europe/Oslo')
    expect(zoneIsFallback({ timeZone: { id: 'Europe/Oslo', isFallback: false } })).toBe(false)
    expect(zoneIsFallback({ timeZone: { id: 'Europe/Oslo', isFallback: true } })).toBe(true)
    expect(zoneIdOf(null)).toBeNull()
    expect(zoneIsFallback(null)).toBe(false)
  })
})

describe('assignable vs recordable versions — two genuinely different sets', () => {
  // One world holding all three states, so the two filters cannot both be satisfied by returning
  // everything or by returning nothing.
  const detail = {
    versions: [
      { courseVersionId: 'v-draft', versionNo: 3, state: 'Draft' },
      { courseVersionId: 'v-pub', versionNo: 2, state: 'Published' },
      { courseVersionId: 'v-ret', versionNo: 1, state: 'Retired' }
    ]
  }

  test('only a published version may be assigned', () => {
    expect(assignableVersions(detail).map(v => v.courseVersionId)).toEqual(['v-pub'])
  })

  test('a completion may be recorded against a published OR a retired version', () => {
    // A venue that withdraws a course must still be able to file the completions of the people who
    // took it: what a completion needs is a frozen content hash, and retiring does not unfreeze one.
    expect(recordableVersions(detail).map(v => v.courseVersionId)).toEqual(['v-pub', 'v-ret'])
  })

  test('THE DISTINCTION, varied: the retired version is in exactly one of the two sets', () => {
    const assignable = assignableVersions(detail).map(v => v.courseVersionId)
    const recordable = recordableVersions(detail).map(v => v.courseVersionId)
    expect(recordable).toContain('v-ret')
    expect(assignable).not.toContain('v-ret')
    expect(assignable).not.toEqual(recordable)
  })

  test('neither offers a draft, whose only outcome would be a 400', () => {
    expect(assignableVersions(detail).map(v => v.state)).not.toContain('Draft')
    expect(recordableVersions(detail).map(v => v.state)).not.toContain('Draft')
  })

  test('an unread course offers nothing rather than throwing', () => {
    expect(assignableVersions(null)).toEqual([])
    expect(recordableVersions({})).toEqual([])
  })

  test('the picker label carries the state, because that is what separates the two sets', () => {
    expect(versionLabel({ versionNo: 2, state: 'Published' })).toBe('v2 · Published')
    expect(versionLabel(null)).toBeNull()
  })
})

describe('instants — parsed off the wire, never with new Date()', () => {
  // The suite runs under TZ=Europe/Oslo, and these are designed to depend on that: the whole point
  // is that a bare stamp and a browser-local reading of it are DIFFERENT instants.
  const BARE = '2026-08-01T00:00:00'

  test('a bare column-loaded stamp is read as UTC', () => {
    expect(instantOf(BARE).toISOString()).toBe('2026-08-01T00:00:00.000Z')
  })

  test('CONTROL: the naive parse this rule exists to forbid produces a different instant', () => {
    // Without this the assertion above would pass on a UTC runner while proving nothing. Under
    // Europe/Oslo the naive reading lands two hours earlier — 31 July, on a record dated 1 August.
    expect(new Date(BARE).toISOString()).not.toBe(instantOf(BARE).toISOString())
    expect(new Date(BARE).toISOString()).toBe('2026-07-31T22:00:00.000Z')
  })

  test('a stamp that DOES carry a zone is not double-stamped', () => {
    expect(instantOf('2026-08-01T00:00:00Z').toISOString()).toBe('2026-08-01T00:00:00.000Z')
    expect(instantOf('2026-08-01T02:00:00+02:00').toISOString()).toBe('2026-08-01T00:00:00.000Z')
  })

  test('nothing parseable is null, which prints as a dash rather than as an epoch', () => {
    expect(instantOf(null)).toBeNull()
    expect(instantOf('')).toBeNull()
    expect(instantOf('not a date')).toBeNull()
  })

  test('an instant is rendered in the zone it is given, and in UTC when there is none', () => {
    const instant = instantOf('2026-08-01T00:00:00')
    expect(instantLabel(instant, 'en-GB', 'Europe/Oslo')).toContain('02:00')
    expect(instantLabel(instant, 'en-GB', null)).toContain('00:00')
    expect(instantLabel(null, 'en-GB', 'Europe/Oslo')).toBeNull()
  })
})

describe('civil dates — sliced, never converted', () => {
  const EXPIRY = '2026-08-01T00:00:00'

  test('the authored day comes back unchanged', () => {
    expect(civilDateOf(EXPIRY)).toBe('2026-08-01')
    expect(civilDateOf('2028-01-10T00:00:00')).toBe('2028-01-10')
  })

  test('CONTROL: running the same value through a zone moves the DAY, which is the failure avoided', () => {
    // A reader west of UTC converting the stored midnight sees the previous day. That is a
    // certificate expiring on the 1st shown as expiring on the 31st, on the record that exists to
    // prove it — and it is why this value is sliced rather than converted in either direction.
    const converted = instantLabel(instantOf(EXPIRY), 'en-CA', 'America/New_York')
    expect(converted).toContain('2026-07-31')
    expect(converted).not.toContain('2026-08-01')
    expect(civilDateOf(EXPIRY)).toBe('2026-08-01')
  })

  test('an absent date is null — which is a real fact (no expiry), not a zero', () => {
    expect(civilDateOf(null)).toBeNull()
    expect(civilDateOf('')).toBeNull()
  })
})

describe('toApiDate — the wire form a date input is sent as', () => {
  test('a civil date goes out bare, with no zone designator for a binder to convert', () => {
    expect(toApiDate('2026-08-01')).toBe('2026-08-01T00:00:00')
    expect(toApiDate('2026-08-01')).not.toMatch(/Z$/)
  })

  test('it round-trips: what is sent is what `civilDateOf` reads back', () => {
    expect(civilDateOf(toApiDate('2026-08-01'))).toBe('2026-08-01')
  })

  test('an empty or malformed input is null, which is how "no expiry" is sent', () => {
    expect(toApiDate('')).toBeNull()
    expect(toApiDate(null)).toBeNull()
    expect(toApiDate('01.08.2026')).toBeNull()
    expect(toApiDate('2026-08-01T00:00:00')).toBeNull()
  })
})

describe('rows — nulls are dashes, and a zero is a zero', () => {
  test('a 0% score survives as 0, not as a missing value', () => {
    // Truthiness here would print every failed attempt as a dash and quietly erase it from the
    // evidence. `scorePercent` is checked by type.
    expect(completionRow({ scorePercent: 0, passed: false }).scorePercent).toBe(0)
    expect(completionRow({ scorePercent: 0, passed: false }).passed).toBe(false)
  })

  test('a completion the server said nothing about carries nulls, not defaults', () => {
    const row = completionRow({})
    expect(row.scorePercent).toBeNull()
    expect(row.passed).toBeNull()
    expect(row.completed).toBeNull()
  })

  test('the score and the SERVER\'S verdict are carried side by side and never compared here', () => {
    // TR-B1 is settled: the server derives `passed` from the score against the frozen version's own
    // threshold. This row builder still refuses to recompute it — the threshold that graded a row is
    // the one inside ITS version, which this function does not hold.
    const row = completionRow({ scorePercent: 0, passed: true })
    expect(row.scorePercent).toBe(0)
    expect(row.passed).toBe(true)

    const inverse = completionRow({ scorePercent: 100, passed: false })
    expect(inverse.scorePercent).toBe(100)
    expect(inverse.passed).toBe(false)
  })

  test('a certificate with no expiry is flagged as such rather than looking like a missing date', () => {
    const noExpiry = certificateRow({ certificateId: 'c1', issueDateUtc: '2026-01-10T00:00:00', expiryDateUtc: null, status: 'Valid' })
    expect(noExpiry.expiryDate).toBeNull()
    expect(noExpiry.hasExpiry).toBe(false)

    const withExpiry = certificateRow({ certificateId: 'c2', expiryDateUtc: '2028-01-10T00:00:00', status: 'Valid' })
    expect(withExpiry.expiryDate).toBe('2028-01-10')
    expect(withExpiry.hasExpiry).toBe(true)
  })

  test('the derived status is passed through, and an absent one stays null', () => {
    expect(certificateRow({ status: 'Expiring' }).status).toBe('Expiring')
    expect(certificateRow({}).status).toBeNull()
  })

  test('an assignment shows the reference its OWN scope names', () => {
    const role = assignmentRow({ scope: 'Role', roleRef: 'r-1', personRef: null })
    const person = assignmentRow({ scope: 'Person', roleRef: null, personRef: 'p-1' })
    expect(role.reference).toBe('r-1')
    expect(person.reference).toBe('p-1')
    // A body carrying both is refused by the server, but if one ever arrived the scope decides.
    expect(assignmentRow({ scope: 'Role', roleRef: 'r-1', personRef: 'p-1' }).reference).toBe('r-1')
  })

  test('a due date is the authored day, sliced', () => {
    expect(assignmentRow({ dueDateUtc: '2026-09-01T00:00:00' }).dueDate).toBe('2026-09-01')
    expect(assignmentRow({}).dueDate).toBeNull()
  })

  test('a course row takes the server\'s own version count rather than counting anything', () => {
    expect(courseRow({ versionCount: 0, hasPublishedVersion: false }).versionCount).toBe(0)
    expect(courseRow({}).versionCount).toBeNull()
    expect(courseRow({ hasPublishedVersion: true }).hasPublishedVersion).toBe(true)
  })
})

describe('the reference directories — three states, and suggestions that are not the accepted set', () => {
  const PERSON_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const PERSON_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const ROLE_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  const staffRow = over => Object.assign({
    staffMemberId: 's-1', workforcePersonId: PERSON_A, displayName: 'Kari', isActive: true, capabilities: []
  }, over)

  test('THE DISTINCTION: refused, unknown and answered-empty are three different answers', () => {
    // A 403 is the ordinary outcome for a Training manager with no Workforce capability, and a
    // network failure says nothing at all. Neither is "this store engages nobody".
    expect(personDirectory(null, new WorkforceApiError(403, { code: 'workforce.forbidden' })).state).toBe('refused')
    expect(personDirectory(null, new WorkforceApiError(404, {})).state).toBe('refused')
    expect(personDirectory(null, new Error('network')).state).toBe('unknown')
    expect(personDirectory(null, new WorkforceApiError(500, {})).state).toBe('unknown')
    expect(personDirectory([], null)).toEqual({ state: 'answered', options: [] })
  })

  test('a body that is not a list is UNKNOWN, never an empty roster', () => {
    expect(personDirectory(null, null).state).toBe('unknown')
    expect(personDirectory({ staff: [] }, null).state).toBe('unknown')
    expect(roleDirectory(null, null).state).toBe('unknown')
  })

  test('two engagements of the SAME human are one suggestion, current if either is', () => {
    // `personRef` names the PERSON; `GET /staff` returns one row per engagement, and a rehire is two
    // rows for one human. Offering them twice would read as two people.
    const directory = personDirectory([
      staffRow({ staffMemberId: 's-1', isActive: false }),
      staffRow({ staffMemberId: 's-2', isActive: true }),
      staffRow({ staffMemberId: 's-3', workforcePersonId: PERSON_B, displayName: 'Ola', isActive: false })
    ], null)

    expect(directory.options).toEqual([
      { id: PERSON_A, label: 'Kari', ended: false },
      { id: PERSON_B, label: 'Ola', ended: true }
    ])
  })

  test('a person with no display name falls back to the id rather than rendering blank', () => {
    expect(personDirectory([staffRow({ displayName: null })], null).options[0].label).toBe(PERSON_A)
  })

  test('a retired role is MARKED rather than dropped, so assignments naming it still read', () => {
    const past = '2020-01-01T00:00:00'
    const directory = roleDirectory([
      { roleId: ROLE_A, name: 'Kokk', station: 'Kjøkken', sortOrder: 1, effectiveFromUtc: past, effectiveToUtc: null },
      { roleId: PERSON_B, name: 'Vakt', station: null, sortOrder: 2, effectiveFromUtc: past, effectiveToUtc: past }
    ], null, new Date('2026-07-30T00:00:00Z'))

    expect(directory.options).toEqual([
      { id: ROLE_A, label: 'Kokk · Kjøkken', ended: false },
      { id: PERSON_B, label: 'Vakt', ended: true }
    ])
  })

  test('a match is found case-insensitively and only in an ANSWERED directory', () => {
    const answered = personDirectory([staffRow()], null)
    expect(directoryMatch(answered, PERSON_A.toUpperCase()).label).toBe('Kari')
    expect(directoryMatch(answered, '  ' + PERSON_A + '  ').label).toBe('Kari')
    expect(directoryMatch(answered, PERSON_B)).toBeNull()
    expect(directoryMatch(answered, '')).toBeNull()
    // A refused directory can never produce a match, so nothing can print a name off one.
    expect(directoryMatch(personDirectory(null, new WorkforceApiError(403, {})), PERSON_A)).toBeNull()
  })

  test('a reference is a GUID or it is nothing the server could bind', () => {
    expect(isReferenceId(PERSON_A)).toBe(true)
    expect(isReferenceId(PERSON_A.toUpperCase())).toBe(true)
    expect(isReferenceId('  ' + PERSON_A + '  ')).toBe(true)
    expect(isReferenceId('role-9')).toBe(false)
    expect(isReferenceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa')).toBe(false)
    expect(isReferenceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaaa')).toBe(false)
    expect(isReferenceId('')).toBe(false)
    expect(isReferenceId(null)).toBe(false)
  })
})

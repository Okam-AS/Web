import {
  BLOCK_NONE,
  BLOCK_NOT_DECIDABLE,
  BLOCK_NO_REVISION,
  COLLISION_NONE,
  COLLISION_PUBLISHED,
  COLLISION_UNKNOWN,
  MAX_PROBE_WEEKS,
  OUTCOME_ALREADY_DECIDED,
  OUTCOME_AWARD_TAKEN,
  OUTCOME_ERROR,
  OUTCOME_FORBIDDEN,
  OUTCOME_GONE,
  OUTCOME_STALE,
  buildInboxGroups,
  classifyDecisionFailure,
  collisionProbeWeeks,
  decisionBlock,
  groupContests,
  liveCandidateCount,
  publishedCollision,
  requiresRefresh,
  stateParam,
  successorNeed,
  weeksForRequest
} from '~/utils/workforce/requests-inbox'

const OSLO = 'Europe/Oslo'
const ANNA = 'aaaa-1'
const BJORN = 'bbbb-2'

// BARE stamps, which is the shape the workforce surface actually puts on the wire: EF materialises
// column-loaded values as Unspecified and Newtonsoft writes no designator for that kind.
const timeOff = over => Object.assign({
  kind: 'time-off',
  requestId: 'r1',
  staffMemberId: ANNA,
  staffDisplayName: 'Anna Haugen',
  status: 'Submitted',
  state: 'submitted',
  isDecidable: true,
  startsUtc: '2026-08-03T00:00:00',
  endsUtc: '2026-08-04T21:59:00',
  localStartDate: '2026-08-03T00:00:00',
  localEndDate: '2026-08-04T00:00:00',
  createdAtUtc: '2026-07-20T09:00:00',
  revision: 'rev-1'
}, over)

const candidacy = over => Object.assign({
  kind: 'open-shift-request',
  requestId: 'c1',
  staffMemberId: ANNA,
  staffDisplayName: 'Anna Haugen',
  state: 'request-submitted',
  isDecidable: true,
  startsUtc: '2026-08-05T06:00:00',
  endsUtc: '2026-08-05T14:00:00',
  localStartDate: '2026-08-05T00:00:00',
  localEndDate: '2026-08-05T00:00:00',
  exchangeId: 'x1',
  exchangeKind: 'OpenShiftRequest',
  exchangeStatus: 'RequestSubmitted',
  targetShiftAssignmentId: 'shift-9',
  createdAtUtc: '2026-07-21T09:00:00',
  revision: 'rev-c1'
}, over)

describe('what a manager may act on', () => {
  test('a decidable row with a revision is decidable', () => {
    expect(decisionBlock(timeOff())).toBe(BLOCK_NONE)
  })

  // The token is null wherever the backend has no rowversion, and #24 refuses a decision without
  // If-Match with a plain 400 before it starts. A button that can only fail is worse than none.
  test('a decidable row without a revision is blocked, and says which reason', () => {
    expect(decisionBlock(timeOff({ revision: null }))).toBe(BLOCK_NO_REVISION)
  })

  test('an availability exception is informational, never decidable', () => {
    expect(decisionBlock({ kind: 'availability-exception', isDecidable: false, revision: null }))
      .toBe(BLOCK_NOT_DECIDABLE)
  })
})

describe('the one-award contest', () => {
  // The backend closes every live candidacy for the same TARGET, "including candidacies filed under a
  // different ExchangeId by the find-or-create race". Grouping on exchangeId would draw two contests
  // for one shift and let a manager think they were awarding two different things.
  test('candidacies group on the target shift, not on the exchange id', () => {
    const groups = groupContests([
      candidacy({ requestId: 'c1', exchangeId: 'x1' }),
      candidacy({ requestId: 'c2', exchangeId: 'x2', staffMemberId: BJORN, staffDisplayName: 'Bjørn Ek' })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].targetShiftAssignmentId).toBe('shift-9')
    expect(groups[0].items.map(i => i.requestId)).toEqual(['c1', 'c2'])
    expect(liveCandidateCount(groups[0])).toBe(2)
  })

  test('a candidacy with no target shift stays its own group rather than joining a null bucket', () => {
    const groups = groupContests([
      candidacy({ requestId: 'c1', targetShiftAssignmentId: null }),
      candidacy({ requestId: 'c2', targetShiftAssignmentId: null })
    ])
    expect(groups).toHaveLength(2)
  })

  test('a decided candidacy does not count towards what an award would close', () => {
    const groups = groupContests([
      candidacy({ requestId: 'c1' }),
      candidacy({ requestId: 'c2', isDecidable: false, state: 'not-awarded' })
    ])
    expect(liveCandidateCount(groups[0])).toBe(1)
  })

  test('the inbox orders groups by their earliest request, and marks the contested one', () => {
    const groups = buildInboxGroups([
      candidacy({ requestId: 'c2', createdAtUtc: '2026-07-25T09:00:00' }),
      timeOff({ requestId: 'r1', createdAtUtc: '2026-07-20T09:00:00' }),
      candidacy({ requestId: 'c1', createdAtUtc: '2026-07-21T09:00:00' })
    ])

    expect(groups.map(g => g.key)).toEqual(['request:r1', 'shift:shift-9'])
    expect(groups[1].isContest).toBe(true)
    expect(groups[0].isContest).toBe(false)
  })
})

describe('the published-week collision probe', () => {
  test('an open time-off request resolves to the ISO weeks it spans', () => {
    const weeks = weeksForRequest(timeOff(), OSLO)
    expect(weeks.map(w => w.key)).toEqual(['2026-08-03'])
  })

  // A range read resolves to ONE revision, so a multi-week span must be fetched week by week or the
  // answer silently covers only part of the leave.
  test('a leave across two weeks resolves to both of them', () => {
    const weeks = weeksForRequest(timeOff({
      startsUtc: '2026-08-06T00:00:00',
      endsUtc: '2026-08-11T21:59:00'
    }), OSLO)
    expect(weeks.map(w => w.key)).toEqual(['2026-08-03', '2026-08-10'])
  })

  test('a leave longer than the cap is not probed at all, rather than partly', () => {
    const weeks = weeksForRequest(timeOff({
      startsUtc: '2026-08-03T00:00:00',
      endsUtc: '2026-12-01T00:00:00'
    }), OSLO)
    expect(weeks).toEqual([])
    expect(MAX_PROBE_WEEKS).toBeGreaterThan(0)
  })

  test('nothing is probed without a zone, because a week cannot be placed', () => {
    expect(weeksForRequest(timeOff(), null)).toEqual([])
    expect(collisionProbeWeeks([timeOff()], null)).toEqual([])
  })

  test('weeks are deduplicated across requests, so a whole team asking for one week is one read', () => {
    const weeks = collisionProbeWeeks([
      timeOff({ requestId: 'r1', staffMemberId: ANNA }),
      timeOff({ requestId: 'r2', staffMemberId: BJORN }),
      candidacy()
    ], OSLO)
    expect(weeks.map(w => w.key)).toEqual(['2026-08-03'])
  })

  test('an overlapping published shift for the same person is a collision', () => {
    const weeks = {
      '2026-08-03': {
        assignments: [{
          shiftAssignmentId: 's1',
          staffMemberId: ANNA,
          state: 'Published',
          startsUtc: '2026-08-03T06:00:00',
          endsUtc: '2026-08-03T14:00:00'
        }]
      }
    }

    const result = publishedCollision(timeOff(), weeks, OSLO)
    expect(result.state).toBe(COLLISION_PUBLISHED)
    expect(result.shifts.map(s => s.shiftAssignmentId)).toEqual(['s1'])
  })

  test('a colleague\'s shift in the same week is not this person\'s collision', () => {
    const weeks = {
      '2026-08-03': {
        assignments: [{
          shiftAssignmentId: 's1',
          staffMemberId: BJORN,
          state: 'Published',
          startsUtc: '2026-08-03T06:00:00',
          endsUtc: '2026-08-03T14:00:00'
        }]
      }
    }
    expect(publishedCollision(timeOff(), weeks, OSLO).state).toBe(COLLISION_NONE)
  })

  test('a cancelled shift collides with nothing', () => {
    const weeks = {
      '2026-08-03': {
        assignments: [{
          shiftAssignmentId: 's1',
          staffMemberId: ANNA,
          state: 'Cancelled',
          startsUtc: '2026-08-03T06:00:00',
          endsUtc: '2026-08-03T14:00:00'
        }]
      }
    }
    expect(publishedCollision(timeOff(), weeks, OSLO).state).toBe(COLLISION_NONE)
  })

  // The whole reason the probe has three states. A failed week must never render as a clean answer.
  test('a week that failed to load is UNKNOWN for the whole request, not clear', () => {
    const spanning = timeOff({ startsUtc: '2026-08-06T00:00:00', endsUtc: '2026-08-11T21:59:00' })
    const weeks = { '2026-08-03': { assignments: [] }, '2026-08-10': null }
    expect(publishedCollision(spanning, weeks, OSLO).state).toBe(COLLISION_UNKNOWN)
  })

  test('an empty published week is a real answer: nothing collides', () => {
    expect(publishedCollision(timeOff(), { '2026-08-03': { assignments: [] } }, OSLO).state)
      .toBe(COLLISION_NONE)
  })

  test('the same shift returned by two week reads is counted once', () => {
    const spanning = timeOff({ startsUtc: '2026-08-06T00:00:00', endsUtc: '2026-08-11T21:59:00' })
    const shift = {
      shiftAssignmentId: 's1',
      staffMemberId: ANNA,
      state: 'Published',
      startsUtc: '2026-08-07T06:00:00',
      endsUtc: '2026-08-07T14:00:00'
    }
    const weeks = { '2026-08-03': { assignments: [shift] }, '2026-08-10': { assignments: [shift] } }
    expect(publishedCollision(spanning, weeks, OSLO).shifts).toHaveLength(1)
  })
})

describe('a refused decision is read on the code, never the prose', () => {
  const problem = (code, status = 409) => ({ code, status })

  // Two 409s, deliberately kept apart: one means the answer already exists, the other means the row
  // moved under a decision that is still open. They have different remedies.
  test('already-decided and stale-revision are different outcomes', () => {
    expect(classifyDecisionFailure(problem('workforce.request-not-decidable'))).toBe(OUTCOME_ALREADY_DECIDED)
    expect(classifyDecisionFailure(problem('workforce.stale-revision'))).toBe(OUTCOME_STALE)
  })

  test('the one-award backstop is its own outcome', () => {
    expect(classifyDecisionFailure(problem('workforce.award-taken'))).toBe(OUTCOME_AWARD_TAKEN)
  })

  test('an unknown 409 stays an error rather than being guessed at', () => {
    expect(classifyDecisionFailure(problem('workforce.something-new'))).toBe(OUTCOME_ERROR)
  })

  test('a stripped problem body still classifies the unambiguous statuses', () => {
    expect(classifyDecisionFailure({ status: 404 })).toBe(OUTCOME_GONE)
    expect(classifyDecisionFailure({ status: 403 })).toBe(OUTCOME_FORBIDDEN)
  })

  // Re-reading after a stale write is the manager's own act: an automatic refetch would re-base the
  // decision on a version they never saw and would clear the note they typed.
  test('a stale revision does NOT trigger an automatic re-read', () => {
    expect(requiresRefresh(OUTCOME_STALE)).toBe(false)
    expect(requiresRefresh(OUTCOME_ALREADY_DECIDED)).toBe(true)
    expect(requiresRefresh(OUTCOME_AWARD_TAKEN)).toBe(true)
  })
})

describe('a committed decision that a published schedule disagrees with', () => {
  // The endpoint never republishes. Reporting "approved" without this would let a manager read the
  // decision as handled while a rostered shift still stands.
  test('a time-off approval over a published shift reports the affected revision', () => {
    expect(successorNeed({ firstAffectedScheduleRevisionId: 'rev-77' }))
      .toEqual({ kind: 'time-off', revisionId: 'rev-77' })
  })

  test('an award over a published target reports that a successor is needed', () => {
    expect(successorNeed({ requiresSuccessorRevision: true, affectedScheduleRevisionId: 'rev-88' }))
      .toEqual({ kind: 'award', revisionId: 'rev-88' })
  })

  test('a decision that touched no publication reports nothing', () => {
    expect(successorNeed({ firstAffectedScheduleRevisionId: null })).toBeNull()
    expect(successorNeed({ requiresSuccessorRevision: false })).toBeNull()
    expect(successorNeed(null)).toBeNull()
  })
})

describe('the state filter', () => {
  // `in-flight` is the token the response echoes, not one the query accepts: the default projection
  // is the ABSENCE of the parameter.
  test('the default projection sends no state parameter', () => {
    expect(stateParam('in-flight')).toBeNull()
    expect(stateParam('all')).toBe('all')
  })
})

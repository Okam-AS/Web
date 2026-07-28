import {
  OUTCOME_ALREADY_REQUESTED,
  OUTCOME_AWARD_TAKEN,
  OUTCOME_ERROR,
  OUTCOME_FORBIDDEN,
  OUTCOME_GONE,
  OUTCOME_INVALID,
  OUTCOME_NOT_DECIDABLE,
  classifyClaimFailure,
  isNormalOutcome,
  outcomeMessageKey,
  requiresRefresh
} from '~/utils/workforce-me/claim-outcome'
import { WorkforceApiError } from '~/utils/workforce/api-client'

// The exact document the backend renders for a lost award: WorkforceProblemException.AwardTaken
// (Helpers/Workforce/WorkforceProblemException.cs:126) through WorkforceProblemDetails.From.
const awardTakenProblem = {
  type: 'https://okam.no/problems/workforce/award-taken',
  title: 'Conflict',
  status: 409,
  detail: 'The open assignment has already been awarded.',
  code: 'workforce.award-taken',
  conflictKind: 'award-taken',
  aggregateId: 'a0000000-0000-0000-0000-000000000001',
  retryable: false,
  traceId: '00-abc-def-01'
}

describe('losing an open shift is a normal outcome, not an error', () => {
  // Two workers can ask for the same open shift; a filtered unique index lets exactly one win and the
  // loser is told so with a typed 409. A worker who tapped a second too late did nothing wrong.
  test('a 409 award-taken classifies as award-taken', () => {
    const error = new WorkforceApiError(409, awardTakenProblem)
    expect(classifyClaimFailure(error)).toBe(OUTCOME_AWARD_TAKEN)
  })

  test('the lost award is a normal outcome, so the page must not use its error tone', () => {
    expect(isNormalOutcome(OUTCOME_AWARD_TAKEN)).toBe(true)
    expect(isNormalOutcome(OUTCOME_ERROR)).toBe(false)
  })

  test('a lost award never offers a retry — the answer cannot change', () => {
    const error = new WorkforceApiError(409, awardTakenProblem)
    expect(error.retryable).toBe(false)
    expect(isNormalOutcome(classifyClaimFailure(error))).toBe(true)
  })

  test('a lost award marks the list stale so the taken shift leaves the screen', () => {
    expect(requiresRefresh(OUTCOME_AWARD_TAKEN)).toBe(true)
  })

  test('the worker is told the shift is taken, not that something went wrong', () => {
    expect(outcomeMessageKey(OUTCOME_AWARD_TAKEN)).toBe('wfme_claim_award_taken')
    expect(outcomeMessageKey(OUTCOME_AWARD_TAKEN)).not.toBe(outcomeMessageKey(OUTCOME_ERROR))
  })

  test('the typed error carries the stable code and conflict kind off the wire', () => {
    const error = new WorkforceApiError(409, awardTakenProblem)
    expect(error.isWorkforceApiError).toBe(true)
    expect(error.status).toBe(409)
    expect(error.code).toBe('workforce.award-taken')
    expect(error.conflictKind).toBe('award-taken')
    expect(error.aggregateId).toBe('a0000000-0000-0000-0000-000000000001')
  })
})

describe('the other typed answers to asking for a shift', () => {
  const classify = (status, code) => classifyClaimFailure(new WorkforceApiError(status, { status, code }))

  test('already holding a candidacy is normal and final', () => {
    expect(classify(409, 'workforce.exchange-already-requested')).toBe(OUTCOME_ALREADY_REQUESTED)
    expect(isNormalOutcome(OUTCOME_ALREADY_REQUESTED)).toBe(true)
    expect(requiresRefresh(OUTCOME_ALREADY_REQUESTED)).toBe(true)
  })

  test('an exchange past a decidable state is normal and final', () => {
    expect(classify(409, 'workforce.request-not-decidable')).toBe(OUTCOME_NOT_DECIDABLE)
    expect(isNormalOutcome(OUTCOME_NOT_DECIDABLE)).toBe(true)
  })

  test('the opaque 404 means the shift is no longer open to this worker', () => {
    expect(classify(404, 'workforce.not-found')).toBe(OUTCOME_GONE)
    expect(requiresRefresh(OUTCOME_GONE)).toBe(true)
    // Gone is not "normal": nothing was accomplished and the list was wrong, so it is not phrased as
    // an answer to the question the worker asked.
    expect(isNormalOutcome(OUTCOME_GONE)).toBe(false)
  })

  test('a refused ask on its merits is invalid, not a lost race', () => {
    expect(classify(400, 'workforce.invalid-exchange')).toBe(OUTCOME_INVALID)
    expect(isNormalOutcome(OUTCOME_INVALID)).toBe(false)
  })

  test('a missing capability is forbidden', () => {
    expect(classify(403, 'workforce.forbidden')).toBe(OUTCOME_FORBIDDEN)
  })
})

describe('classification never guesses', () => {
  const classify409 = code => classifyClaimFailure(new WorkforceApiError(409, { status: 409, code }))

  test('an unrecognised 409 code stays an error rather than being read as a lost award', () => {
    // Swallowing an unknown conflict as "award-taken" would hide a real bug behind a friendly
    // sentence, and the worker would be told the shift was taken when it was not.
    expect(classify409('workforce.something-new')).toBe(OUTCOME_ERROR)
    expect(classify409('workforce.idempotency-payload-mismatch')).toBe(OUTCOME_ERROR)
  })

  test('a bare 409 with no problem body is an error, not a lost award', () => {
    expect(classifyClaimFailure(new WorkforceApiError(409, null))).toBe(OUTCOME_ERROR)
  })

  test('status is a fallback only where it is unambiguous', () => {
    expect(classifyClaimFailure(new WorkforceApiError(404, null))).toBe(OUTCOME_GONE)
    expect(classifyClaimFailure(new WorkforceApiError(403, null))).toBe(OUTCOME_FORBIDDEN)
    expect(classifyClaimFailure(new WorkforceApiError(500, null))).toBe(OUTCOME_ERROR)
  })

  test('a null or non-API error is an error', () => {
    expect(classifyClaimFailure(null)).toBe(OUTCOME_ERROR)
    expect(classifyClaimFailure(new Error('network down'))).toBe(OUTCOME_ERROR)
  })

  test('every outcome has its own sentence', () => {
    const outcomes = [
      OUTCOME_AWARD_TAKEN, OUTCOME_ALREADY_REQUESTED, OUTCOME_NOT_DECIDABLE,
      OUTCOME_GONE, OUTCOME_INVALID, OUTCOME_FORBIDDEN, OUTCOME_ERROR
    ]
    const keys = outcomes.map(outcomeMessageKey)
    expect(new Set(keys).size).toBe(outcomes.length)
  })
})

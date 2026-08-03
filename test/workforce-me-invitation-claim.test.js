import { WorkforceApiError } from '~/utils/workforce/api-client'
import {
  invitationRefusal,
  claimProblemDetail,
  isRetryable,
  CLAIM_ACTION_SIGN_IN,
  CLAIM_ACTION_RETRY,
  CLAIM_ACTION_RETRY_FRESH,
  CLAIM_ACTION_ASK_MANAGER,
  CLAIM_ACTION_OTHER_CODE
} from '~/utils/workforce-me/invitation-claim'

const problem = (status, body) => new WorkforceApiError(status, body)

describe('the invitation claim refusal is as opaque as the surface it reads', () => {
  test('every anti-oracle cause collapses to ONE answer', () => {
    // The backend answers invalid / expired / revoked / already-claimed / bound-to-another-login with
    // an identical 404 and no discriminating extension. This asserts the client keeps that property:
    // if a future author added a branch keyed on some extension, a page could start telling a token
    // holder facts about people they are not entitled to enumerate.
    const answers = [
      problem(404, { code: 'workforce.invitation-invalid', detail: 'The invitation could not be claimed.' }),
      problem(404, { code: 'workforce.invitation-invalid', detail: 'The invitation could not be claimed.', expired: true }),
      problem(404, { code: 'workforce.invitation-invalid', detail: 'The invitation could not be claimed.', state: 'Claimed' })
    ].map(invitationRefusal)

    expect(answers[0]).toEqual(answers[1])
    expect(answers[1]).toEqual(answers[2])
    expect(answers[0].action).toBe(CLAIM_ACTION_OTHER_CODE)
  })

  test('the opaque refusal prints no server detail beside it', () => {
    // The `detail` is a fixed English string carrying nothing the sentence does not already carry.
    // Printing it would imply the server said something specific about THIS code.
    const error = problem(404, { code: 'workforce.invitation-invalid', detail: 'The invitation could not be claimed.' })
    expect(claimProblemDetail(error)).toBeNull()
  })

  test('a person-attach refusal is final and points at a human, not a button', () => {
    const refusal = invitationRefusal(problem(409, {
      code: 'workforce.person-attach-refused',
      conflictKind: 'person-attach-refused',
      retryable: false
    }))

    expect(refusal.action).toBe(CLAIM_ACTION_ASK_MANAGER)
    // There is no merge, relink or person-recovery route anywhere in the module, so this must never
    // become a retry: a button that cannot succeed teaches a reader that buttons mean nothing.
    expect(isRetryable(refusal)).toBe(false)
  })

  test('a claim-link conflict is retryable but demands a FRESH key', () => {
    const refusal = invitationRefusal(problem(409, {
      code: 'workforce.claim-link-conflict',
      conflictKind: 'claim-link-conflict',
      retryable: true,
      retryWithFreshKey: true
    }))

    // Distinct from a plain RETRY: the reservation under the original key stays Reserved for ever,
    // so reusing it replays as in-progress and can never succeed. The two actions do genuinely
    // different things, which is why there are two.
    expect(refusal.action).toBe(CLAIM_ACTION_RETRY_FRESH)
    expect(refusal.action).not.toBe(CLAIM_ACTION_RETRY)
    expect(isRetryable(refusal)).toBe(true)
  })

  test('an in-progress key is the one case where pressing again with the SAME key is right', () => {
    const refusal = invitationRefusal(problem(409, { code: 'workforce.idempotency-in-progress' }))
    expect(refusal.action).toBe(CLAIM_ACTION_RETRY)
  })

  test('a lost connection is a retry, because the command may never have arrived', () => {
    const refusal = invitationRefusal(new TypeError('Failed to fetch'))
    expect(refusal.action).toBe(CLAIM_ACTION_RETRY)
    expect(claimProblemDetail(new TypeError('Failed to fetch'))).toBeNull()
  })

  test('a 401 asks for a sign-in rather than blaming the code', () => {
    expect(invitationRefusal(problem(401, {})).action).toBe(CLAIM_ACTION_SIGN_IN)
  })

  test('a 404 with no workforce code is NOT read as an invalid invitation', () => {
    // A routing miss, an old deployment, a proxy page. Nothing may be concluded about the invitation
    // from it — least of all that it is invalid, which would send a worker to argue with a manager
    // about a code that is fine.
    const refusal = invitationRefusal(problem(404, {}))
    expect(refusal.action).toBe(CLAIM_ACTION_RETRY)
    expect(refusal.heading).toBe('wfjoin_refuse_nomodule_title')
  })

  test('an unmodelled code does not silently become one of the modelled ones', () => {
    const refusal = invitationRefusal(problem(409, { code: 'workforce.some-future-conflict' }))
    expect(refusal.heading).toBe('wfjoin_refuse_offline_title')
    // Its detail IS worth showing: unlike the opaque 404, this is the server saying something the
    // page has no sentence for.
    expect(claimProblemDetail(problem(409, {
      code: 'workforce.some-future-conflict',
      detail: 'Something specific happened.'
    }))).toBe('Something specific happened.')
  })

  test('no error at all is no refusal', () => {
    expect(invitationRefusal(null)).toBeNull()
    expect(isRetryable(null)).toBe(false)
  })
})

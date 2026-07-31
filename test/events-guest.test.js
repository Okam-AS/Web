import {
  GUEST_HELD,
  GUEST_NOT_FOUND,
  GUEST_UNAVAILABLE,
  GUEST_UNKNOWN,
  STANCE_OPEN,
  STANCE_ACCEPTED,
  STANCE_DECLINED,
  STANCE_SUPERSEDED,
  STANCE_EXPIRED,
  STANCE_UNKNOWN,
  DEPOSIT_PAYABLE,
  DEPOSIT_RAIL_UNSUPPORTED,
  DEPOSIT_PAID,
  DEPOSIT_REFUNDED,
  DEPOSIT_FORFEITED,
  DEPOSIT_EXPIRED,
  DEPOSIT_FAILED,
  DEPOSIT_NO_AFFORDANCE,
  DEPOSIT_UNKNOWN,
  readGuestProposal,
  readGuestDeposit,
  proposalStance,
  canAct,
  depositStance,
  depositPaymentUrl,
  formatMoney,
  formatQuantity,
  formatVatRate,
  formatEventDay,
  formatDeadline,
  deadlineHasPassed,
  acceptorProblems,
  inquiryProblems,
  refusalKey,
  guestLocale
} from '~/utils/events/guest'
import translations from '~/translations'

const refusal = (status, code) => ({ status, code, message: 'server prose' })

describe('a guest read tells four answers apart', () => {
  test('a body is held', () => {
    const read = readGuestProposal({ token: 't', status: 'Sent' }, null)
    expect(read.state).toBe(GUEST_HELD)
    expect(read.view.status).toBe('Sent')
  })

  test('a 200 that is not an object is unknown, never an empty offer', () => {
    expect(readGuestProposal('nope', null).state).toBe(GUEST_UNKNOWN)
    expect(readGuestProposal(null, null).view).toBeNull()
  })

  test('EVENTS_PROPOSAL_NOT_FOUND is the guest\'s own link problem', () => {
    expect(readGuestProposal(null, refusal(404, 'EVENTS_PROPOSAL_NOT_FOUND')).state).toBe(GUEST_NOT_FOUND)
  })

  // The distinction that matters: a dark module says nothing about whether the offer exists, so it
  // must never render as "we cannot find your offer".
  test('EVENTS_DISABLED is unavailable, not not-found', () => {
    const read = readGuestProposal(null, refusal(404, 'EVENTS_DISABLED'))
    expect(read.state).toBe(GUEST_UNAVAILABLE)
    expect(read.state).not.toBe(GUEST_NOT_FOUND)
  })

  test('anything else is unknown, and keeps the server prose', () => {
    const read = readGuestProposal(null, refusal(500, null))
    expect(read.state).toBe(GUEST_UNKNOWN)
    expect(read.detail).toBe('server prose')
  })

  test('the deposit read maps its own not-found code', () => {
    expect(readGuestDeposit(null, refusal(404, 'EVENTS_DEPOSIT_NOT_FOUND')).state).toBe(GUEST_NOT_FOUND)
    expect(readGuestDeposit({ status: 'Paid' }, null).state).toBe(GUEST_HELD)
  })
})

describe('only the server decides whether a guest may answer', () => {
  test('isActionable true is the one stance that offers the controls', () => {
    const view = { status: 'Sent', isActionable: true }
    expect(proposalStance(view)).toBe(STANCE_OPEN)
    expect(canAct(view)).toBe(true)
  })

  // EV-03: an old token must say which thing happened, and must not offer a control.
  test('superseded says superseded and offers nothing', () => {
    const view = { status: 'Superseded', isActionable: false }
    expect(proposalStance(view)).toBe(STANCE_SUPERSEDED)
    expect(canAct(view)).toBe(false)
  })

  test('expired, accepted and declined are each their own stance', () => {
    expect(proposalStance({ status: 'Expired', isActionable: false })).toBe(STANCE_EXPIRED)
    expect(proposalStance({ status: 'Accepted', isActionable: false })).toBe(STANCE_ACCEPTED)
    expect(proposalStance({ status: 'Declined', isActionable: false })).toBe(STANCE_DECLINED)
  })

  /**
   * The sweep has not run yet: the version is still stamped `Sent` while its expiry has passed, and
   * the server has already decided by answering `isActionable: false`. Offering an accept button
   * here would be a control the server is certain to refuse with EVENTS_PROPOSAL_EXPIRED.
   */
  test('a Sent version the server says is not actionable is expired, not open', () => {
    const view = { status: 'Sent', isActionable: false }
    expect(proposalStance(view)).toBe(STANCE_EXPIRED)
    expect(canAct(view)).toBe(false)
  })

  test('a status this page does not know offers nothing and claims nothing', () => {
    expect(proposalStance({ status: 'Marinating', isActionable: false })).toBe(STANCE_UNKNOWN)
    expect(canAct({ status: 'Marinating', isActionable: false })).toBe(false)
    expect(canAct(null)).toBe(false)
  })

  // `isActionable` is read, never re-derived. A truthy status with the flag false stays closed.
  test('the status never overrules the flag', () => {
    expect(canAct({ status: 'Sent' })).toBe(false)
    expect(canAct({ status: 'Sent', isActionable: 'yes' })).toBe(false)
  })
})

describe('the deposit stance reads settled money before the clock', () => {
  test('a paid deposit whose link has since expired is paid', () => {
    expect(depositStance({ status: 'Paid', isExpired: true })).toBe(DEPOSIT_PAID)
  })

  test('a late payment and a quarantined one are both money that arrived', () => {
    expect(depositStance({ status: 'LatePaid' })).toBe(DEPOSIT_PAID)
    expect(depositStance({ status: 'Quarantined' })).toBe(DEPOSIT_PAID)
  })

  test('refunded, forfeited and failed are three different sentences', () => {
    expect(depositStance({ status: 'Refunded' })).toBe(DEPOSIT_REFUNDED)
    expect(depositStance({ status: 'PartiallyRefunded' })).toBe(DEPOSIT_REFUNDED)
    expect(depositStance({ status: 'Forfeited' })).toBe(DEPOSIT_FORFEITED)
    expect(depositStance({ status: 'Failed' })).toBe(DEPOSIT_FAILED)
  })

  test('an unpaid deposit with a provider link can be paid', () => {
    const view = { status: 'Requested', providerRedirectUrl: 'https://vipps.example/pay' }
    expect(depositStance(view)).toBe(DEPOSIT_PAYABLE)
    expect(depositPaymentUrl(view)).toBe('https://vipps.example/pay')
  })

  test('an expired link is not payable even when a redirect is still on the row', () => {
    const view = { status: 'Requested', isExpired: true, providerRedirectUrl: 'https://vipps.example/pay' }
    expect(depositStance(view)).toBe(DEPOSIT_EXPIRED)
    expect(depositPaymentUrl(view)).toBeNull()
  })

  // No Stripe form is rendered anywhere: there is no hosted Stripe page in the backend and a Stripe
  // deposit cannot even be created on this branch, so a form here would look like payment and not be.
  test('a Stripe client secret is a rail this page cannot complete', () => {
    const view = { status: 'Requested', stripeClientSecret: 'pi_123_secret' }
    expect(depositStance(view)).toBe(DEPOSIT_RAIL_UNSUPPORTED)
    expect(depositPaymentUrl(view)).toBeNull()
  })

  test('an unpaid deposit with no affordance says so rather than showing a dead button', () => {
    expect(depositStance({ status: 'Pending' })).toBe(DEPOSIT_NO_AFFORDANCE)
    expect(depositStance({})).toBe(DEPOSIT_UNKNOWN)
    expect(depositStance(null)).toBe(DEPOSIT_UNKNOWN)
  })
})

describe('money is the offer\'s own, and is never guessed', () => {
  test('minor units are formatted in the currency the version carries', () => {
    const text = formatMoney(125050, 'NOK', 'no')
    expect(text).toContain('1')
    expect(text).toContain('250')
    expect(text).toMatch(/kr|NOK/)
  })

  test('a Swiss offer is not relabelled into the market this site was built for', () => {
    expect(formatMoney(5000, 'CHF', 'de')).toMatch(/CHF/)
    expect(formatMoney(5000, 'CHF', 'de')).not.toMatch(/kr/)
  })

  // A number with no denomination is not a price. The page prints a dash and says why.
  test('an amount with no currency is withheld', () => {
    expect(formatMoney(5000, null, 'no')).toBeNull()
    expect(formatMoney(5000, 'kroner', 'no')).toBeNull()
    expect(formatMoney(5000, '', 'no')).toBeNull()
  })

  test('an amount that did not arrive as an integer is withheld', () => {
    expect(formatMoney(50.5, 'NOK', 'no')).toBeNull()
    expect(formatMoney(null, 'NOK', 'no')).toBeNull()
    expect(formatMoney(undefined, 'NOK', 'no')).toBeNull()
  })

  test('zero is an amount, not an absence', () => {
    expect(formatMoney(0, 'NOK', 'no')).not.toBeNull()
  })

  test('a VAT rate is shown as the venue wrote it, and nothing is computed from it', () => {
    expect(formatVatRate(0.25, 'no')).toBe('25')
    expect(formatVatRate(0.155, 'no')).toBe('15,5')
    expect(formatVatRate(null, 'no')).toBeNull()
    expect(formatVatRate(-1, 'no')).toBeNull()
  })

  test('a quantity keeps what it carries', () => {
    expect(formatQuantity(40, 'no')).toBe('40')
    expect(formatQuantity(null, 'no')).toBeNull()
  })
})

describe('a date is a date and an instant is an instant', () => {
  // Sliced, never converted: a party on the 15th shown on the 14th is the failure that ends trust.
  test('the event day is read off the parts, in no time zone at all', () => {
    const day = formatEventDay('2026-08-15T00:00:00', 'no')
    expect(day).toContain('15')
    expect(day).toContain('2026')
  })

  test('a malformed day is withheld', () => {
    expect(formatEventDay('not a date', 'no')).toBeNull()
    expect(formatEventDay(null, 'no')).toBeNull()
  })

  // The deadline is the guest's own fact, so it is placed in the reader's zone WITH the zone named.
  test('a bare stamp is read as the UTC it is, and carries its zone', () => {
    const text = formatDeadline('2026-08-01T10:00:00', 'en')
    expect(text).toContain('2026')
    expect(text).toMatch(/GMT|UTC|[A-Z]{2,5}/)
  })

  test('an absent deadline is null rather than a date', () => {
    expect(formatDeadline(null, 'no')).toBeNull()
  })

  test('a passed deadline is recognised against a given clock', () => {
    expect(deadlineHasPassed('2026-08-01T10:00:00', new Date('2026-08-02T00:00:00Z'))).toBe(true)
    expect(deadlineHasPassed('2026-08-01T10:00:00', new Date('2026-07-01T00:00:00Z'))).toBe(false)
    expect(deadlineHasPassed(null, new Date())).toBe(false)
  })
})

describe('the guest\'s own input is checked here, because the server does not check it', () => {
  test('an acceptance needs a name and something email-shaped', () => {
    expect(acceptorProblems({ acceptorName: 'Kari', acceptorEmail: 'kari@example.no' })).toEqual([])
    expect(acceptorProblems({ acceptorName: '  ', acceptorEmail: 'kari@example.no' })).toEqual(['acceptorName'])
    expect(acceptorProblems({ acceptorName: 'Kari', acceptorEmail: 'kari' })).toEqual(['acceptorEmail'])
    expect(acceptorProblems({})).toEqual(['acceptorName', 'acceptorEmail'])
  })

  test('an enquiry needs a contact, a real day and a positive guest count', () => {
    const good = {
      contactName: 'Kari',
      contactEmail: 'kari@example.no',
      eventDate: '2026-08-15',
      guestCountPlanned: 40
    }
    expect(inquiryProblems(good)).toEqual([])
    expect(inquiryProblems(Object.assign({}, good, { guestCountPlanned: 0 }))).toEqual(['guestCountPlanned'])
    expect(inquiryProblems(Object.assign({}, good, { eventDate: '' }))).toEqual(['eventDate'])
    expect(inquiryProblems(Object.assign({}, good, { contactEmail: 'kari@' }))).toEqual(['contactEmail'])
  })
})

describe('a refusal is rendered off the code, never off the prose', () => {
  test('every code this surface meets has its own sentence', () => {
    const codes = [
      'EVENTS_PROPOSAL_SUPERSEDED',
      'EVENTS_PROPOSAL_EXPIRED',
      'EVENTS_ALREADY_ACCEPTED',
      'EVENTS_PROPOSAL_NOT_FOUND',
      'EVENTS_DISABLED',
      'EVENTS_STATE',
      'EVENTS_CONFLICT',
      'EVENTS_VALIDATION',
      'RATE_LIMITED'
    ]
    const said = codes.map(code => translations.no[refusalKey(code)])
    for (const sentence of said) { expect(typeof sentence).toBe('string') }
    // The two a guest actually meets must not be the same sentence.
    expect(translations.no[refusalKey('EVENTS_PROPOSAL_SUPERSEDED')])
      .not.toBe(translations.no[refusalKey('EVENTS_PROPOSAL_EXPIRED')])
  })

  test('an unknown code falls back rather than inventing a reason', () => {
    expect(refusalKey('EVENTS_SOMETHING_NEW')).toBe('ev_guest_refused_other')
    expect(refusalKey(null)).toBe('ev_guest_refused_other')
  })
})

describe('the guest\'s language is theirs', () => {
  test('a language this page has copy for is kept', () => {
    expect(guestLocale('en')).toBe('en')
    expect(guestLocale('de')).toBe('de')
  })

  test('anything else is Norwegian, and never a stored admin preference', () => {
    expect(guestLocale('fr')).toBe('no')
    expect(guestLocale(undefined)).toBe('no')
  })
})

describe('the guest copy exists in all three languages and reads like a venue wrote it', () => {
  const keys = Object.keys(translations.no).filter(k => k.indexOf('ev_guest_') === 0)

  test('the block is the size this surface needs', () => {
    expect(keys.length).toBeGreaterThan(90)
  })

  test('no key is missing from en or de, and none is empty', () => {
    for (const key of keys) {
      for (const locale of ['no', 'en', 'de']) {
        expect(typeof translations[locale][key]).toBe('string')
        expect(translations[locale][key].length).toBeGreaterThan(0)
      }
    }
  })

  test('neither dictionary carries a guest key the Norwegian one lacks', () => {
    for (const locale of ['en', 'de']) {
      const extra = Object.keys(translations[locale])
        .filter(k => k.indexOf('ev_guest_') === 0 && !keys.includes(k))
      expect(extra).toEqual([])
    }
  })

  // The four sentences whose whole job is to be different from one another: a guest reading the
  // wrong one is told their booking is in a state it is not in.
  test('the closed-offer sentences are all distinct in all three languages', () => {
    const distinguishing = [
      'ev_guest_stance_superseded_body',
      'ev_guest_stance_expired_body',
      'ev_guest_stance_accepted_body',
      'ev_guest_stance_declined_body'
    ]
    for (const locale of ['no', 'en', 'de']) {
      const said = distinguishing.map(k => translations[locale][k])
      expect(new Set(said).size).toBe(distinguishing.length)
    }
  })

  // The guest surface is customer-facing copy, so it keeps the house voice rules the admin dictionary
  // predates: no em-dashes, and no system vocabulary a member of the public has no use for.
  test('no guest string carries an em-dash or leaks system vocabulary', () => {
    const banned = /token|EVENTS_|null|undefined|API/
    for (const key of keys) {
      for (const locale of ['no', 'en', 'de']) {
        const value = translations[locale][key]
        expect(value.indexOf('—')).toBe(-1)
        expect(value).not.toMatch(banned)
      }
    }
  })
})

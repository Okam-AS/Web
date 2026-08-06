// The one judgement the delivery report makes: which tier a row belongs to.
//
// These are unit assertions and are NOT the evidence that the capability exists — that is
// `test/e2e/journeys/workforce-delivery-failures.spec.js`, which drives a browser. What they are
// good for is the part a browser walks slowly: the boundaries, the wrong-shaped inputs, and the
// difference between "nothing outstanding" and "we could not find out".

const {
  summarise,
  decorate,
  tierOf,
  isTerminal,
  reasonKeyFor,
  DELIVERY_UNKNOWN,
  TIER_STORE,
  TIER_WORKER
} = require('../utils/workforce/delivery-failures');

const ROSTER = [
  { staffMemberId: 'staff-1', displayName: 'Ola Ansatt' },
  { staffMemberId: 'staff-2', displayName: 'Kari Hansen' }
];

const withheld = {
  notificationOutboxId: 'o-1',
  staffMemberId: 'staff-1',
  channel: 'Push',
  status: 'Withheld',
  targetLabel: '[redacted]',
  attemptCount: 0,
  maxAttempts: 5,
  lastError: 'PushNotConfigured',
  deadLetteredAtUtc: null,
  createdAtUtc: '2026-08-04T10:00:00'
};

const deadLettered = {
  notificationOutboxId: 'o-2',
  staffMemberId: 'staff-2',
  channel: 'Push',
  status: 'DeadLettered',
  targetLabel: '[none]',
  attemptCount: 5,
  maxAttempts: 5,
  lastError: 'NoPushRegistration',
  deadLetteredAtUtc: '2026-08-04T11:00:00',
  createdAtUtc: '2026-08-04T09:00:00'
};

const retrying = Object.assign({}, deadLettered, {
  notificationOutboxId: 'o-3',
  status: 'Failed',
  attemptCount: 1,
  deadLetteredAtUtc: null,
  lastError: 'SmsRejectedByGateway',
  channel: 'Sms'
});

describe('the tier judgement', () => {
  test('a withheld row is the STORE tier and a failed one is the WORKER tier', () => {
    expect(tierOf('Withheld')).toBe(TIER_STORE);
    expect(tierOf('Failed')).toBe(TIER_WORKER);
    expect(tierOf('DeadLettered')).toBe(TIER_WORKER);
  });

  test('the wire casing does not decide the tier', () => {
    // The API sends `StringEnumConverter` output today. A row that arrived differently cased must
    // still be tiered rather than silently becoming unrecognised.
    expect(tierOf('withheld')).toBe(TIER_STORE);
    expect(tierOf('DEADLETTERED')).toBe(TIER_WORKER);
  });

  test('an unknown status joins NEITHER tier', () => {
    // The important half. Defaulting an unrecognised status into the worker tier would let a future
    // backend state inherit "this worker was never told"; defaulting it into the store tier would
    // let a real failure read as waiting. It gets its own bucket instead.
    expect(tierOf('Quarantined')).toBeNull();
    expect(tierOf(undefined)).toBeNull();
    expect(tierOf(6)).toBeNull();
  });

  test('only a dead-lettered row is terminal', () => {
    expect(isTerminal(deadLettered)).toBe(true);
    expect(isTerminal(retrying)).toBe(false);
    expect(isTerminal(withheld)).toBe(false);
  });
});

describe('summarise', () => {
  test('splits the three groups and never reports a combined total', () => {
    const s = summarise([withheld, deadLettered, retrying], ROSTER);

    expect(s.known).toBe(true);
    expect(s.waiting.map(r => r.id)).toEqual(['o-1']);
    expect(s.gaveUp.map(r => r.id)).toEqual(['o-2']);
    expect(s.retrying.map(r => r.id)).toEqual(['o-3']);
    expect(s.unrecognised).toEqual([]);
    // The absence is the assertion: a `total` would be the first thing a screen rendered, and the
    // whole point is that these three numbers are not addable.
    expect(s.total).toBeUndefined();
  });

  test('a read that could not run is NOT an empty store', () => {
    const failed = summarise(DELIVERY_UNKNOWN, ROSTER);
    const clean = summarise([], ROSTER);

    expect(failed.known).toBe(false);
    expect(failed.clean).toBe(false);
    expect(clean.known).toBe(true);
    expect(clean.clean).toBe(true);
    // If these two ever collapse into the same shape, a store whose report failed to load starts
    // reading as a store with nothing wrong — the exact false all-clear this surface exists to end.
    expect(failed.clean).not.toBe(clean.clean);
  });

  test('null and undefined are unknown, not empty', () => {
    expect(summarise(null, ROSTER).known).toBe(false);
    expect(summarise(undefined, ROSTER).known).toBe(false);
  });

  test('an unrecognised status is kept and counted, not dropped', () => {
    const odd = Object.assign({}, withheld, { notificationOutboxId: 'o-9', status: 'Quarantined' });
    const s = summarise([odd], ROSTER);

    expect(s.unrecognised.map(r => r.id)).toEqual(['o-9']);
    expect(s.waiting).toEqual([]);
    expect(s.retrying).toEqual([]);
    expect(s.gaveUp).toEqual([]);
    // Dropping it would be the worst option available: the row exists, something is undelivered,
    // and the operator would be shown a shorter list with no sign anything was hidden.
    expect(s.clean).toBe(false);
  });
});

describe('what a row is allowed to say', () => {
  test('known reason codes resolve to a sentence, unknown ones do not', () => {
    expect(reasonKeyFor('PushNotConfigured')).toBe('wf_delivery_reason_push_not_configured');
    expect(reasonKeyFor('nopushregistration')).toBe('wf_delivery_reason_no_push_registration');
    expect(reasonKeyFor('SmsRejectedByGateway')).toBe('wf_delivery_reason_sms_rejected');
    // An exception label is an open set and must fall through to the verbatim path.
    expect(reasonKeyFor('SmtpException')).toBeNull();
    expect(reasonKeyFor(null)).toBeNull();
  });

  test('the roster names a row when it can, and says nothing false when it cannot', () => {
    expect(decorate(withheld, ROSTER).staffLabel).toBe('Ola Ansatt');
    // Null, so the component can say "a recipient the roster cannot name". A placeholder string
    // here would read as a worker actually called that.
    expect(decorate(withheld, []).staffLabel).toBeNull();
    expect(decorate(withheld, null).staffLabel).toBeNull();
  });

  test('the presence label is carried through and no address field is invented', () => {
    const row = decorate(deadLettered, ROSTER);
    expect(row.targetLabel).toBe('[none]');
    // Nothing on a decorated row may hold a real address: the model never sends one, and this
    // surface must not grow a field that would display it if it ever did.
    expect(Object.keys(row)).not.toContain('targetReference');
    expect(JSON.stringify(row)).not.toMatch(/@|\+\d{6}/);
  });

  test('a row with missing numbers reports unknown rather than zero', () => {
    // `attemptCount: 0` is a real and meaningful value (it is what a withheld row carries), so a
    // missing one must not arrive as 0 — that would claim the row had a budget and had spent none.
    const row = decorate({ notificationOutboxId: 'o-x', status: 'Failed' }, ROSTER);
    expect(row.attemptCount).toBeNull();
    expect(row.maxAttempts).toBeNull();
    expect(decorate(withheld, ROSTER).attemptCount).toBe(0);
  });
});

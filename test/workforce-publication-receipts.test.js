// The judgements the publication-receipts surface makes: who attested what, which publications have
// been replaced, and the two fields the history read cannot be trusted to carry.
//
// These are unit assertions and are NOT the evidence that the capability exists — that is
// `test/e2e/journeys/workforce-publication-receipts.spec.js`, which drives a browser. What they are
// good for is the part a browser walks slowly: the strongest-wins ordering, a `Delivered` send that
// is not a receipt, a zero that is a missing projection rather than a measurement, and the
// difference between "nobody has confirmed" and "we could not find out".

const {
  listPublications,
  summariseRecipients,
  decoratePublication,
  decorateRecipient,
  attestationOf,
  supersededIds,
  isKnownDeliveryState,
  RECEIPTS_UNKNOWN,
  ATTEST_CONFIRMED,
  ATTEST_OPENED,
  ATTEST_BY_HAND,
  ATTEST_NONE
} = require('../utils/workforce/publication-receipts');

const recipient = (over) => Object.assign({
  publicationRecipientId: 'r-1',
  schedulePublicationId: 'p-1',
  staffMemberId: 'staff-1',
  staffDisplayName: 'Ola Ansatt',
  claimedByApplicationUserId: 'user-1',
  channel: 'Inbox',
  deliveryState: 'Delivered',
  seenAtUtc: null,
  acknowledgedAtUtc: null,
  manuallyDeliveredAtUtc: null,
  createdAtUtc: '2026-08-04T10:00:00'
}, over || {});

const publication = (over) => Object.assign({
  schedulePublicationId: 'p-1',
  scheduleRevisionId: 'rev-1',
  storeId: 42,
  publicationNumber: 1,
  supersedesPublicationId: null,
  contentHash: 'hash-1',
  publishedByActorReference: 'user:manager-7',
  publishedAtUtc: '2026-08-04T09:00:00',
  rangeStartUtc: '2026-08-10T00:00:00',
  rangeEndUtc: '2026-08-17T00:00:00',
  recipientCount: 3,
  // What endpoint 21 actually serialises for these two: a null and a default zero.
  noticeLeadDays: 0,
  cost: null
}, over || {});

describe('attestationOf — the one judgement', () => {
  test('an acknowledged row is worker-confirmed', () => {
    expect(attestationOf(recipient({ acknowledgedAtUtc: '2026-08-04T11:00:00' }))).toBe(ATTEST_CONFIRMED);
  });

  test('seen without acknowledgement is opened, not confirmed', () => {
    expect(attestationOf(recipient({ seenAtUtc: '2026-08-04T11:00:00' }))).toBe(ATTEST_OPENED);
  });

  test('a manual delivery with no worker act is manager-recorded, not confirmed', () => {
    expect(attestationOf(recipient({ manuallyDeliveredAtUtc: '2026-08-04T11:00:00' }))).toBe(ATTEST_BY_HAND);
  });

  test('a send every transport accepted is NOT a receipt', () => {
    // The whole surface turns on this one: `Delivered` is the outbox's word, not the worker's.
    expect(attestationOf(recipient({ deliveryState: 'Delivered' }))).toBe(ATTEST_NONE);
    expect(attestationOf(recipient({ deliveryState: 'ManuallyDelivered' }))).toBe(ATTEST_NONE);
  });

  test('the worker-attested fact wins over the manager note on the same row', () => {
    const both = recipient({
      acknowledgedAtUtc: '2026-08-04T11:00:00',
      manuallyDeliveredAtUtc: '2026-08-04T10:30:00'
    });
    expect(attestationOf(both)).toBe(ATTEST_CONFIRMED);
  });

  test('acknowledging implies seen, and still reads as confirmed', () => {
    const both = recipient({ seenAtUtc: '2026-08-04T11:00:00', acknowledgedAtUtc: '2026-08-04T11:00:00' });
    expect(attestationOf(both)).toBe(ATTEST_CONFIRMED);
  });

  test('a missing or malformed row is no receipt rather than a throw', () => {
    expect(attestationOf(null)).toBe(ATTEST_NONE);
    expect(attestationOf({})).toBe(ATTEST_NONE);
  });
});

describe('summariseRecipients — buckets that never merge', () => {
  const rows = [
    recipient({ publicationRecipientId: 'r-1', acknowledgedAtUtc: '2026-08-04T11:00:00' }),
    recipient({ publicationRecipientId: 'r-2', seenAtUtc: '2026-08-04T11:00:00' }),
    recipient({ publicationRecipientId: 'r-3', manuallyDeliveredAtUtc: '2026-08-04T11:00:00' }),
    recipient({ publicationRecipientId: 'r-4' })
  ];

  test('each attestation lands in its own bucket', () => {
    const s = summariseRecipients(rows, 4);
    expect(s.confirmed.map(r => r.id)).toEqual(['r-1']);
    expect(s.opened.map(r => r.id)).toEqual(['r-2']);
    expect(s.byHand.map(r => r.id)).toEqual(['r-3']);
    expect(s.noReceipt.map(r => r.id)).toEqual(['r-4']);
  });

  test('there is no combined "reached" figure to misread', () => {
    const s = summariseRecipients(rows, 4);
    expect(s.reached).toBeUndefined();
    expect(s.delivered).toBeUndefined();
    expect(s.total).toBeUndefined();
  });

  test('a failed read is not an empty roster', () => {
    const unknown = summariseRecipients(RECEIPTS_UNKNOWN, 4);
    const answered = summariseRecipients([], 0);
    expect(unknown.known).toBe(false);
    expect(answered.known).toBe(true);
    expect(answered.empty).toBe(true);
    // Both have no rows. Only one of them is allowed to say so on screen.
    expect(unknown.empty).toBe(false);
  });

  test('an unknown read still carries the count the history gave, and no listed count', () => {
    const s = summariseRecipients(RECEIPTS_UNKNOWN, 4);
    expect(s.addressed).toBe(4);
    expect(s.listed).toBeNull();
    expect(s.shortBy).toBeNull();
  });

  test('a roster shorter than the publication addressed names the gap', () => {
    // The recipients query inner-joins staff member and person; a recipient whose staff member is
    // gone drops out silently. The count the publish wrote is the witness that it did.
    const s = summariseRecipients(rows.slice(0, 3), 4);
    expect(s.listed).toBe(3);
    expect(s.addressed).toBe(4);
    expect(s.shortBy).toBe(1);
  });

  test('a roster longer than the count is a contradiction, not a negative gap', () => {
    const s = summariseRecipients(rows, 2);
    expect(s.shortBy).toBe(0);
    expect(s.listed).toBe(4);
    expect(s.addressed).toBe(2);
  });

  test('with no count to compare against, no gap is asserted', () => {
    const s = summariseRecipients(rows, null);
    expect(s.addressed).toBeNull();
    expect(s.shortBy).toBeNull();
  });
});

describe('decorateRecipient', () => {
  test('an unnamed worker is null, never a placeholder name', () => {
    expect(decorateRecipient(recipient({ staffDisplayName: null })).staffLabel).toBeNull();
  });

  test('an unclaimed worker is flagged — they had no screen to confirm from', () => {
    expect(decorateRecipient(recipient({ claimedByApplicationUserId: null })).claimed).toBe(false);
    expect(decorateRecipient(recipient()).claimed).toBe(true);
  });

  test('an unrecognised delivery state is carried and flagged, not defaulted', () => {
    const row = decorateRecipient(recipient({ deliveryState: 'Teleported' }));
    expect(row.deliveryState).toBe('Teleported');
    expect(row.deliveryStateKnown).toBe(false);
    expect(row.attestation).toBe(ATTEST_NONE);
  });

  test('known delivery states are recognised case-insensitively', () => {
    expect(isKnownDeliveryState('Pending')).toBe(true);
    expect(isKnownDeliveryState('manuallydelivered')).toBe(true);
    expect(isKnownDeliveryState('')).toBe(false);
    expect(isKnownDeliveryState(null)).toBe(false);
  });
});

describe('supersededIds — derived across the list, not read off a row', () => {
  test('a publication another one replaces is superseded', () => {
    const list = [
      publication({ schedulePublicationId: 'p-2', publicationNumber: 2, supersedesPublicationId: 'p-1' }),
      publication({ schedulePublicationId: 'p-1', publicationNumber: 1 })
    ];
    const ids = supersededIds(list);
    expect(ids['p-1']).toBe(true);
    expect(ids['p-2']).toBeUndefined();
  });

  test('listPublications marks the replaced one and leaves the successor current', () => {
    const list = [
      publication({ schedulePublicationId: 'p-2', publicationNumber: 2, supersedesPublicationId: 'p-1' }),
      publication({ schedulePublicationId: 'p-1', publicationNumber: 1 })
    ];
    const rows = listPublications(list).rows;
    expect(rows[0].id).toBe('p-2');
    expect(rows[0].superseded).toBe(false);
    expect(rows[1].id).toBe('p-1');
    expect(rows[1].superseded).toBe(true);
  });

  test('the server order is preserved rather than re-sorted', () => {
    // Published-desc then revision-desc then number-desc is a guarantee the backend makes so a
    // same-tick republish still puts the successor first. Re-sorting here would discard it.
    const sameTick = [
      publication({ schedulePublicationId: 'p-3', publicationNumber: 3, supersedesPublicationId: 'p-2' }),
      publication({ schedulePublicationId: 'p-2', publicationNumber: 2, supersedesPublicationId: 'p-1' }),
      publication({ schedulePublicationId: 'p-1', publicationNumber: 1 })
    ];
    expect(listPublications(sameTick).rows.map(r => r.id)).toEqual(['p-3', 'p-2', 'p-1']);
  });

  test('a failed history read is not a store that has never published', () => {
    expect(listPublications(RECEIPTS_UNKNOWN).known).toBe(false);
    expect(listPublications(RECEIPTS_UNKNOWN).empty).toBe(false);
    expect(listPublications([]).known).toBe(true);
    expect(listPublications([]).empty).toBe(true);
  });
});

describe('the two fields endpoint 21 does not project', () => {
  // The absence is the assertion, and absent beats present-and-null: a `noticeLeadDays: null` key
  // would be rendered by somebody as a measured absence, and a `cost: null` as a free schedule.
  test('a history row carries no notice lead at all, because its zero is a default', () => {
    expect(Object.keys(decoratePublication(publication({ noticeLeadDays: 0 }), {})))
      .not.toContain('noticeLeadDays');
    // Even a plausible-looking number is dropped: the history projection does not set the field, so
    // anything arriving there is not a measurement this read can vouch for.
    expect(Object.keys(decoratePublication(publication({ noticeLeadDays: 14 }), {})))
      .not.toContain('noticeLeadDays');
  });

  test('cost is never surfaced from the history list', () => {
    expect(Object.keys(decoratePublication(publication({ cost: { plannedMinor: 999 } }), {})))
      .not.toContain('cost');
  });

  test('the decorated row offers nothing a surface does not read', () => {
    // This lane exists because two capabilities were advertised and reached by nobody. A row that
    // carries fields no caller reads is the same defect one size down, so the shape is pinned.
    expect(Object.keys(decoratePublication(publication(), {})).sort()).toEqual([
      'addressed', 'id', 'number', 'publishedAtUtc', 'publishedBy',
      'rangeEndUtc', 'rangeStartUtc', 'superseded'
    ]);
  });
});

describe('decoratePublication', () => {
  test('the actor that caused the publication is carried verbatim', () => {
    expect(decoratePublication(publication(), {}).publishedBy).toBe('user:manager-7');
    expect(decoratePublication(publication({ publishedByActorReference: null }), {}).publishedBy).toBeNull();
  });

  test('the addressed count is the history row count, and null when absent', () => {
    expect(decoratePublication(publication({ recipientCount: 3 }), {}).addressed).toBe(3);
    expect(decoratePublication(publication({ recipientCount: null }), {}).addressed).toBeNull();
  });
});

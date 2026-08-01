// The world the fixture API answers from. Data only — no HTTP, no state machine.
//
// WHY A FIXTURE AND NOT THE REAL BACKEND. These journeys have to be runnable on a laptop with
// nothing else started, or they will not be run, and an instrument nobody runs is not evidence. The
// real API also cannot be driven honestly here: the schedule journey PUBLISHES a week, which on a
// shared test database is a write somebody else has to live with, and the events journey needs a
// proposal token that exists nowhere but in the database that minted it.
//
// WHAT THE FIXTURE IS THEREFORE ALLOWED TO BE. It answers the routes the CLIENTS call, in the shapes
// the CLIENTS read, and it enforces the preconditions the clients claim to send — the
// `Idempotency-Key` on every workforce mutation and the `If-Match` draft checksum on the batch edit
// are both checked, and a mismatch is refused with the same typed problem+json the real surface
// emits. That is the point: a fixture that accepts anything proves the page can render, and a
// fixture that holds the contract proves the page is WIRED. It is not a backend model and does not
// try to be — it holds no rules about overlapping shifts, wage rates or capabilities beyond the ones
// these three journeys read.
//
// PHONE NUMBERS AND CODES are the demo credentials the project already uses (99999999 / 123123).
// They are not secrets and they authenticate nothing outside this process.

const MANAGER_PHONE = '+4799999999';
const WORKER_PHONE = '+4790000001';
const OTP = '123123';

const STORE_ID = 42;
const STORE_NAME = 'Fixture Kafé';
const TIME_ZONE = 'Europe/Oslo';
const CURRENCY = 'NOK';

// The two identities the journeys sign in as. `token` is what the app puts in the Authorization
// header for every later call, so it is also this fixture's session key.
const USERS = {
  [MANAGER_PHONE]: {
    id: 'user-manager',
    token: 'fixture-token-manager',
    phoneNumber: MANAGER_PHONE,
    firstName: 'Marit',
    lastName: 'Leder',
    email: 'marit@example.test',
    emailConfirmed: true,
    isPowerUser: false,
    isKeyAccountManager: false,
    favoriteProductIds: [],
    // Non-empty: this is exactly what AdminPage.initAuth tests before it bounces to /registrer.
    adminIn: [{ id: STORE_ID, name: STORE_NAME, address: 'Storgata 1, 0155 Oslo' }]
  },
  [WORKER_PHONE]: {
    id: 'user-worker',
    token: 'fixture-token-worker',
    phoneNumber: WORKER_PHONE,
    firstName: 'Ola',
    lastName: 'Ansatt',
    email: 'ola@example.test',
    emailConfirmed: true,
    isPowerUser: false,
    isKeyAccountManager: false,
    favoriteProductIds: [],
    // EMPTY, and empty on purpose. `[]` is the positive answer "administers no store" that
    // utils/admin/nav-access.js resolves to ACCESS_WORKER — the refusal journey's whole subject.
    // `undefined` would be ACCESS_UNKNOWN, which deliberately renders the admin nav, so a fixture
    // that omitted the field would prove the opposite of what the journey claims.
    adminIn: []
  }
};

const STAFF = [
  { staffMemberId: 'staff-1', displayName: 'Ola Ansatt', isActive: true, employmentNumber: '101' },
  { staffMemberId: 'staff-2', displayName: 'Kari Hansen', isActive: true, employmentNumber: '102' }
];

const ROLES = [
  { roleId: 'role-bar', name: 'Barista', sortOrder: 1, station: 'Bar', color: '#1bb776' },
  { roleId: 'role-kitchen', name: 'Kjøkken', sortOrder: 2, station: 'Kjøkken', color: '#f59e0b' }
];

// ---- the statutory personalliste (bokføringsforskriften § 8-5-6) --------------------------------
//
// The register a labour inspector is handed. It is built RELATIVE TO NOW rather than pinned to a
// fixed date, for one reason: `buildPersonnelSheet` separates "on site now" from "no departure was
// ever recorded" by comparing the sheet's business day against the server's `asOfUtc`, and a fixture
// frozen on some past date would only ever produce the second reading. A print journey that never
// rendered an open window would be printing a document the venue does not have on the day it matters.
//
// Four rows, each one a § 8-5-6 field that has to survive onto paper:
//   1. a completed window            — arrival AND departure
//   2. an open window on today       — `wfpl_status_present`
//   3. a corrected entry             — "hvem som har foretatt rettelsen og tidspunkt"
//   4. a hired-in person             — the other organisation number the paragraph asks for
//
// ONE business identity across all four, deliberately: with two, the sheet header refuses to name a
// single bokføringspliktig and prints `wfpl_business_mixed` instead. That is correct behaviour and a
// different document; this one is the ordinary case.

const BUSINESS_NAME = 'Fixture Kafé AS';
const ORGANIZATION_NUMBER = '923456789';
const HIRED_IN_ORGANIZATION_NUMBER = '998877665';

/** The venue's civil date, in the store's own zone, for a given instant. */
function venueDate (ms) {
  // `en-CA` formats as `yyyy-MM-dd`, which is the shape the wire and the page both read.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(ms));
}

/** `hh:mm` on the venue's business day, as a UTC instant the wire carries. */
function atVenueHour (businessDate, hour, minute) {
  // Two passes settle the zone offset (and DST) the same way `localToUtc` in the server does.
  const naive = Date.parse(businessDate + 'T' + String(hour).padStart(2, '0') + ':' +
    String(minute).padStart(2, '0') + ':00Z');
  let ms = naive;
  for (let i = 0; i < 2; i++) {
    const shown = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(new Date(ms)).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const asUtc = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day),
      Number(shown.hour) % 24, Number(shown.minute), Number(shown.second));
    ms = naive - (asUtc - ms);
  }
  return new Date(ms).toISOString().slice(0, 19) + 'Z';
}

/**
 * The endpoint-30 body for one business day.
 *
 * `businessDate` null means "the venue's today, as the SERVER resolves it" — which is exactly what
 * the page sends on first load, and the echo is what populates its date picker.
 */
function personnelList (storeId, businessDate) {
  const now = Date.now();
  const day = businessDate || venueDate(now);
  const asOfUtc = new Date(now).toISOString().slice(0, 19) + 'Z';
  const isToday = day === venueDate(now);

  // Retention: accounting-year end + 3 years and 6 months, as the backend stamps it.
  const retainUntilUtc = (Number(day.slice(0, 4)) + 4) + '-06-30T00:00:00Z';

  const common = {
    businessName: BUSINESS_NAME,
    organizationNumber: ORGANIZATION_NUMBER,
    retainUntilUtc
  };

  const rows = [
    Object.assign({
      personnelListEntryId: 'ple-1',
      participantName: 'Ola Ansatt',
      protectedIdentityCodeRef: 'wf-person:9f2c41a0-5d18-4a7b-9c31-6e0b2f7d84aa',
      category: 'Employee',
      hiredInOrganizationNumber: null,
      onSiteStartUtc: atVenueHour(day, 7, 55),
      onSiteEndUtc: atVenueHour(day, 15, 2),
      correctionActorReference: null,
      correctedAtUtc: null
    }, common),
    Object.assign({
      personnelListEntryId: 'ple-2',
      participantName: 'Kari Hansen',
      protectedIdentityCodeRef: 'wf-person:1b70d55c-88ee-4f03-a1d6-3c95e2481077',
      category: 'Employee',
      hiredInOrganizationNumber: null,
      onSiteStartUtc: atVenueHour(day, 10, 30),
      // OPEN. On today this reads "til stede"; on a past day it reads "ingen avgang registrert".
      onSiteEndUtc: null,
      correctionActorReference: null,
      correctedAtUtc: null
    }, common),
    Object.assign({
      personnelListEntryId: 'ple-3',
      participantName: 'Marit Leder',
      protectedIdentityCodeRef: 'wf-person:4d3a9e11-2c6f-4b88-8f52-70ab1d9c6e34',
      category: 'WorkingOwnerManager',
      hiredInOrganizationNumber: null,
      onSiteStartUtc: atVenueHour(day, 6, 40),
      onSiteEndUtc: atVenueHour(day, 14, 15),
      // § 8-5-6: a correction must name who made it and when.
      correctionActorReference: 'Marit Leder (daglig leder)',
      correctedAtUtc: atVenueHour(day, 16, 5)
    }, common),
    Object.assign({
      personnelListEntryId: 'ple-4',
      participantName: 'Jonas Vikar',
      protectedIdentityCodeRef: 'wf-person:c07f6b23-9a41-4d70-b5e8-25f1a83c9d60',
      category: 'HiredIn',
      hiredInOrganizationNumber: HIRED_IN_ORGANIZATION_NUMBER,
      onSiteStartUtc: atVenueHour(day, 11, 0),
      onSiteEndUtc: atVenueHour(day, 18, 45),
      correctionActorReference: null,
      correctedAtUtc: null
    }, common)
  ];

  return {
    storeId: Number(storeId),
    businessDate: day,
    timeZoneId: TIME_ZONE,
    timeZoneIsFallback: false,
    asOfUtc,
    // The SERVER's own count of open windows — the page passes it through and never recounts.
    presentCount: isToday ? rows.filter(row => !row.onSiteEndUtc).length : 0,
    rows
  };
}

// ---- Events: the guest surface -----------------------------------------------------------------
//
// Two tokens, and the second one is the point of having two. `EventsProposalService.GetPublicAsync`
// answers a SUPERSEDED version with its own content and `isActionable:false` rather than a 404, so
// the guest sees exactly what they were sent and is told it no longer stands. The refusal journey
// reads that token and asserts the accept form is absent — which only means anything if the offer
// itself is still on the page, which is why both are modelled.

const OPEN_PROPOSAL_TOKEN = 'fixture-proposal-open';
const SUPERSEDED_PROPOSAL_TOKEN = 'fixture-proposal-superseded';

function proposalBase () {
  return {
    eventTitle: 'Julebord for Nordane AS',
    eventDate: '2026-12-12',
    guestCountPlanned: 40,
    currencyCode: CURRENCY,
    isAmendment: false,
    lines: [
      { lineNo: 1, kind: 'Package', description: 'Julebordmeny', quantity: 40, unitPriceMinor: 89500, amountMinor: 3580000, vatRate: 0.25 },
      { lineNo: 2, kind: 'AddOn', description: 'Velkomstdrink', quantity: 40, unitPriceMinor: 12500, amountMinor: 500000, vatRate: 0.25 },
      { lineNo: 3, kind: 'RoomFee', description: 'Leie av selskapslokale', quantity: 1, unitPriceMinor: 400000, amountMinor: 400000, vatRate: 0.25 }
    ],
    totalMinor: 4480000,
    roomFeeMinor: 400000,
    minimumSpendMinor: 3000000,
    depositRequiredMinor: 1000000,
    termsText: 'Avbestilling senere enn 14 dager før arrangementet faktureres i sin helhet.\nDepositum refunderes ikke ved avbestilling.'
  };
}

const PROPOSALS = {
  [OPEN_PROPOSAL_TOKEN]: Object.assign(proposalBase(), {
    versionNo: 2,
    status: 'Sent',
    isActionable: true,
    expiresAtUtc: '2026-11-30T22:59:59Z',
    contentHash: 'b7d3f1a29c4e5806'
  }),
  [SUPERSEDED_PROPOSAL_TOKEN]: Object.assign(proposalBase(), {
    versionNo: 1,
    status: 'Superseded',
    // The server's own gate. The page reads it and never re-derives it from the status and a clock.
    isActionable: false,
    expiresAtUtc: '2026-11-20T22:59:59Z',
    contentHash: 'a10cc4419e2b7735',
    // An older, cheaper offer — so the journey can tell the superseded page apart from the live one
    // by what it shows, not only by what it withholds.
    totalMinor: 4180000,
    depositRequiredMinor: 800000
  })
};

module.exports = {
  MANAGER_PHONE,
  WORKER_PHONE,
  OTP,
  STORE_ID,
  STORE_NAME,
  TIME_ZONE,
  CURRENCY,
  USERS,
  STAFF,
  ROLES,
  OPEN_PROPOSAL_TOKEN,
  SUPERSEDED_PROPOSAL_TOKEN,
  PROPOSALS,
  BUSINESS_NAME,
  ORGANIZATION_NUMBER,
  HIRED_IN_ORGANIZATION_NUMBER,
  personnelList
};

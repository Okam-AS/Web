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

// ---- the shared per-store feature-flag catalog --------------------------------------------------
//
// `GET /feature-flags/catalog` — the ADVERTISED set, transcribed key-for-key and default-for-default
// from the six modules' `Describe()` methods. Not invented: the flag keys are a contract the operator
// screen writes back verbatim, so a made-up key here would prove the page can render a list rather
// than that it can move a real switch.
//
//   Workforce   WorkforceFeatureFlags.Declared minus Withheld
//   Training    TrainingFeatureFlags.Declared minus Withheld
//   Margin      Helpers/Margin/MarginFeatureFlags.Describe()
//   Events      Services/Events/EventsFeatureFlags.Describe()
//   Meals       Services/Meals/MealsFeatureFlags.Describe()
//   Growth      Services/Growth/GrowthFeatureFlags.Describe()
//
// DENY-CLOSED, with ONE exception that is deliberate on the backend's side and reproduced here:
// `workforce.setup` ships ON, because setup is the stage a store is in the moment the module becomes
// visible to it, and nothing behind it is reachable until `workforce.module` opens — which is itself
// deny-closed. Copying the exception matters: a fixture with everything off would make the page's
// "default: on" branch unreachable and therefore unproven.
//
// WHAT IS DELIBERATELY ABSENT. Seven declared flags are WITHHELD from the catalog by their own
// modules — `workforce.personnel-list`, `workforce.export`, and five `training.*` — each because its
// enforcement point would be unlawful (gating the personalliste an inspector may demand) or does not
// exist (a W5 batch that is not built). The controller refuses to write any key the catalog does not
// carry, so a withheld flag is not merely un-togglable, it is invisible: there is no wire field for
// "withheld" and nothing for a client to render. Their absence here is the accurate model.
const FEATURE_FLAG_CATALOG = [
  { flagKey: 'Events.Core', module: 'Events', title: 'Core (inquiries/proposals)', defaultEnabled: false },
  { flagKey: 'Events.Deposits', module: 'Events', title: 'Deposit money path', defaultEnabled: false },
  { flagKey: 'Events.Settlement', module: 'Events', title: 'Settlement machine', defaultEnabled: false },
  { flagKey: 'Margin.Module', module: 'Margin', title: 'Module master', defaultEnabled: false },
  { flagKey: 'Margin.PriceImport', module: 'Margin', title: 'Price import (CSV)', defaultEnabled: false },
  { flagKey: 'Margin.Statements', module: 'Margin', title: 'Statements', defaultEnabled: false },
  { flagKey: 'growth.module', module: 'Growth', title: 'Module (guest capture)', defaultEnabled: false },
  { flagKey: 'growth.dispatch', module: 'Growth', title: 'Live newsletter dispatch (kill switch)', defaultEnabled: false },
  { flagKey: 'meals.module', module: 'Meals', title: 'Module (store surfaces)', defaultEnabled: false },
  { flagKey: 'training.assignments', module: 'Training', title: 'Assignments', defaultEnabled: false },
  { flagKey: 'training.setup', module: 'Training', title: 'Setup (courses/certificates)', defaultEnabled: false },
  { flagKey: 'workforce.clock', module: 'Workforce', title: 'POS clock write', defaultEnabled: false },
  { flagKey: 'workforce.dispatch', module: 'Workforce', title: 'Dispatch', defaultEnabled: false },
  { flagKey: 'workforce.exchange', module: 'Workforce', title: 'Shift exchange', defaultEnabled: false },
  { flagKey: 'workforce.module', module: 'Workforce', title: 'Module (store surfaces)', defaultEnabled: false },
  { flagKey: 'workforce.publication', module: 'Workforce', title: 'Schedule publication', defaultEnabled: false },
  { flagKey: 'workforce.selfservice', module: 'Workforce', title: 'Self-service', defaultEnabled: false },
  { flagKey: 'workforce.setup', module: 'Workforce', title: 'Setup', defaultEnabled: true }
];

/**
 * The stage flag every schedule WRITE is gated on.
 *
 * All four of them — `CreateDraftAsync`, `BatchAssignmentsAsync`, `ValidateAsync` and `PublishAsync`
 * — pass `WorkforceFeatureFlags.Publication` to `RequireWriteCapabilityAsync`, so this one key
 * decides whether the whole authoring surface is writable. Named once here rather than spelled at
 * each of the four fixture routes, which is how the four would drift apart.
 */
const SCHEDULE_WRITE_FLAG = 'workforce.publication';

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

// ---- Events: the ADMIN surface -----------------------------------------------------------------
//
// One event, read out the way `/events/admin/{store}/events/{id}` and its four sibling reads answer.
// It is modelled for the run-sheet print journey, and that journey needs the page to hold two things
// AT THE SAME TIME:
//
//   • a recorded dietary requirement, which is what the printed sheet must carry, and
//   • a live guest bearer link — a proposal address AND a deposit address — which the pipeline page
//     shows on screen on purpose (email dispatch is dark by default, so a member of staff copies the
//     link out of here) and which must NOT be on the paper the kitchen gets.
//
// A world with only the first would let an inert print stylesheet pass: there would be nothing to
// leak, so "no token on the sheet" would be true of a page that had no token anywhere. The token is
// therefore part of the fixture's job, not decoration.

const ADMIN_EVENT_ID = 7001;

// Distinctive on purpose. The journey asserts this exact sentence reaches the paper, so a sheet that
// printed some other event's requirement, or a placeholder, fails rather than passes.
const DIETARY_STATEMENT =
  'To gjester har cøliaki. Én gjest har alvorlig nøtteallergi — ingen nøtter på noen tallerken.';

// The bearer the printed sheet must not carry. Its VALUE is never written into a journey artifact;
// the journey asserts its absence by looking for it, not by echoing it.
const ADMIN_DEPOSIT_TOKEN = 'fixture-deposit-bearer-9f3c1d';

const ADMIN_EVENT_ROW = {
  id: ADMIN_EVENT_ID,
  publicId: 'e1000000-0000-0000-0000-000000000001',
  status: 'Confirmed',
  title: 'Julebord for Nordane AS',
  eventDate: '2026-12-12T00:00:00',
  guestCountPlanned: 40,
  contactName: 'Kari Nordmann',
  acceptedProposalVersionNo: 2,
  createdAtUtc: '2026-10-01T09:00:00'
};

const ADMIN_EVENT_DETAIL = {
  id: ADMIN_EVENT_ID,
  publicId: ADMIN_EVENT_ROW.publicId,
  status: 'Confirmed',
  title: 'Julebord for Nordane AS',
  eventDate: '2026-12-12T00:00:00',
  startTime: '18:00:00',
  endTime: '23:30:00',
  guestCountPlanned: 40,
  contactName: 'Kari Nordmann',
  contactEmail: 'kari@nordane.test',
  contactPhone: '+4791000001',
  companyName: 'Nordane AS',
  source: 'Manual',
  timeZoneId: TIME_ZONE,
  createdAtUtc: '2026-10-01T09:00:00',
  // The recorded requirement, with the stamp that says when the venue was told.
  dietary: { statement: DIETARY_STATEMENT, statedAtUtc: '2026-11-02T13:20:00' },
  versions: [
    {
      versionNo: 2,
      status: 'Accepted',
      currencyCode: CURRENCY,
      totalMinor: 4480000,
      sentAtUtc: '2026-10-05T10:00:00',
      // The proposal address the admin copies out. On screen, deliberately; not on the sheet.
      publicToken: OPEN_PROPOSAL_TOKEN,
      lines: [
        { lineNo: 1, kind: 'Package', description: 'Julebordmeny', quantity: 40, unitPriceMinor: 89500, amountMinor: 3580000 },
        { lineNo: 2, kind: 'AddOn', description: 'Velkomstdrink', quantity: 40, unitPriceMinor: 12500, amountMinor: 500000 }
      ]
    }
  ],
  transitions: [
    { createdAtUtc: '2026-10-01T09:00:00', action: 'Create', fromStatus: null, toStatus: 'Inquiry', actorKind: 'Staff', reasonCode: null },
    { createdAtUtc: '2026-10-05T10:00:00', action: 'SendProposal', fromStatus: 'Proposing', toStatus: 'ProposalSent', actorKind: 'Staff', reasonCode: null },
    { createdAtUtc: '2026-10-09T18:12:00', action: 'Accept', fromStatus: 'ProposalSent', toStatus: 'Accepted', actorKind: 'Guest', reasonCode: null }
  ]
};

const ADMIN_DEPOSITS = [
  {
    id: 5501,
    status: 'Paid',
    paymentType: 'Card',
    amountMinor: 1000000,
    refundedMinor: 0,
    currencyCode: CURRENCY,
    paidAtUtc: '2026-10-10T11:04:00',
    expiresAtUtc: '2026-10-17T21:59:59',
    // The deposit address. The one that must never reach the pass.
    publicToken: ADMIN_DEPOSIT_TOKEN,
    receipts: [
      { kind: 'Capture', providerReference: 'dintero-cap-77120', amountMinor: 1000000, createdAtUtc: '2026-10-10T11:04:00' }
    ]
  }
];

// The sheet itself. `EventsRunSheetComposer` embeds the dietary requirement as an item, which is the
// mechanism the module's exit rests on — so the fixture carries it as an item AND the detail carries
// it as the recorded statement, exactly as a real read answers.
const ADMIN_RUN_SHEET = {
  versionNo: 3,
  status: 'Issued',
  generatedFromProposalVersionNo: 2,
  issuedByUserId: 'user-manager',
  issuedAtUtc: '2026-11-02T14:00:00',
  isStale: false,
  items: [
    { section: 'Dietary', timeLabel: null, body: DIETARY_STATEMENT, quantityLabel: null },
    { section: 'Timeline', timeLabel: '17:00', body: 'Rigging av selskapslokalet', quantityLabel: null },
    { section: 'Timeline', timeLabel: '18:00', body: 'Velkomstdrink serveres i baren', quantityLabel: '40 stk' },
    { section: 'Kitchen', timeLabel: '19:00', body: 'Julebordmeny, hovedrett ut samlet', quantityLabel: '40 kuvert' }
  ]
};

// No statement has been opened yet — a 200 whose `settlement` is null, which the client reads as an
// answered absence rather than as a failed read.
const ADMIN_SETTLEMENT = { settlement: null, revision: null };

const ADMIN_NOTIFICATION_HEALTH = {
  dispatchEnabled: false,
  queuedCount: 2,
  deadLetteredCount: 0,
  deadLettered: []
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
  FEATURE_FLAG_CATALOG,
  SCHEDULE_WRITE_FLAG,
  OPEN_PROPOSAL_TOKEN,
  SUPERSEDED_PROPOSAL_TOKEN,
  PROPOSALS,
  ADMIN_EVENT_ID,
  ADMIN_DEPOSIT_TOKEN,
  DIETARY_STATEMENT,
  ADMIN_EVENT_ROW,
  ADMIN_EVENT_DETAIL,
  ADMIN_DEPOSITS,
  ADMIN_RUN_SHEET,
  ADMIN_SETTLEMENT,
  ADMIN_NOTIFICATION_HEALTH
};

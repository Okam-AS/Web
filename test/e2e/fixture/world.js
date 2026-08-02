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
// The administrator who signed up BY PHONE and therefore has no email address at all. She is the
// whole subject of the account-email journey: the newsletter test-send binds to the acting
// administrator's own account address and requires it CONFIRMED, so she is refused by a screen she
// otherwise administers, and until an admin surface could confirm an address her only ways out were
// the consumer app or curl. A third identity rather than a flip of the manager's, because the
// manager's confirmed address is what `growth-newsletter-send-gate` test-sends to.
const PHONE_SIGNUP_ADMIN_PHONE = '+4790000002';
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
  },
  [PHONE_SIGNUP_ADMIN_PHONE]: {
    id: 'user-phone-admin',
    token: 'fixture-token-phone-admin',
    phoneNumber: PHONE_SIGNUP_ADMIN_PHONE,
    firstName: 'Kari',
    lastName: 'Telefon',
    // NULL, and null on purpose — this is what signing up with a phone number leaves behind, and it
    // is the state `RequireOwnAccountAddressAsync` refuses first. `''` would be indistinguishable on
    // screen but is a different thing in the account row, and the page's three-state status reads
    // the row.
    email: null,
    emailConfirmed: false,
    isPowerUser: false,
    isKeyAccountManager: false,
    favoriteProductIds: [],
    // A FULL STORE ADMIN. The refusal this journey walks is not about authority — she administers
    // the same store the manager does and may draft, approve and dispatch. It is about whether the
    // platform can prove one mailbox is hers.
    adminIn: [{ id: STORE_ID, name: STORE_NAME, address: 'Storgata 1, 0155 Oslo' }]
  }
};

// `workforcePersonId` is NOT decoration and is not the same id as `staffMemberId`. Training's
// `personRef` names the PERSON — a completion is filed against a human being, not against one of
// their engagements, which is the whole reason the two ids are different — and the Training
// completion write binds it to a `Guid`. A reference the fixture cannot resolve to one of these is
// refused exactly as `TrainingPersonBinding.RequireKnownPersonAsync` refuses it. Both are real GUIDs
// because every `*Ref` binds to a `Guid` server-side and the forms refuse anything else before
// sending, so a made-up string would never leave the browser and would prove nothing.
const STAFF = [
  {
    staffMemberId: 'staff-1',
    workforcePersonId: '0f7d2c1a-8b64-4f2e-9c31-1a5d6e7f8091',
    displayName: 'Ola Ansatt',
    isActive: true,
    employmentNumber: '101'
  },
  {
    staffMemberId: 'staff-2',
    workforcePersonId: '3b91e40c-27af-4d5b-8e12-6c4f90ab7d23',
    displayName: 'Kari Hansen',
    isActive: true,
    employmentNumber: '102'
  }
];

/** A well-formed person reference that names nobody. The completion refusal's subject. */
const UNKNOWN_PERSON_REF = '11111111-2222-3333-4444-555555555555';

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

/**
 * The stage flag every Events ADMIN route is gated on — reads included.
 *
 * `EventsController.GuardStoreAsync`, `EventsRunSheetController.GuardStoreAsync`,
 * `EventsNotificationsController.AuthorizeStoreAsync` and `EventsDepositsController.AuthorizeStoreAsync`
 * all call `IEventsModuleGate.IsStoreEnabledAsync`, which is `Events.Core` for the route's store. So
 * this one key decides whether the pipeline page can see ANYTHING — unlike `workforce.publication`,
 * which leaves the reads answering and stops only the writes. Named once here for the same reason
 * the workforce one is: five fixture routes enforce it and they must not drift apart.
 */
const EVENTS_CORE_FLAG = 'Events.Core';

/**
 * The money flag the SETTLEMENT read additionally sits behind.
 *
 * `EventsSettlementController.AuthorizeSettlementAsync` requires `Events.Settlement` on top of
 * `Events.Core`, and it gates the GET as well as every mutation — deliberately, so a venue that has
 * not opened the settlement machine cannot read a half-built statement. It is modelled because the
 * pipeline page fans four facet reads out at once and one of them answering `EVENTS_DISABLED` is the
 * NORMAL state of a pilot venue: Core on, money paths still closed. A fixture that answered a
 * settlement document to every store would never let that state be walked.
 */
const EVENTS_SETTLEMENT_FLAG = 'Events.Settlement';

// ---- Events: the guest surface -----------------------------------------------------------------
//
// NOT GATED PER STORE, and that is the backend's shape rather than an omission here. The three public
// proposal routes (`EventsController.GetProposal/AcceptProposal/DeclineProposal`) are `[AllowAnonymous]`
// and carry only the controller-wide action filter on `IEventsModuleGate.IsEnabled` — the
// deployment-wide `Events:Enabled` CONFIG switch, which is not a per-store flag, has no row, and no
// lever on `/admin/feature-flags` can move it. `EventsProposalService` takes no gate at all: it has no
// `IEventsModuleGate` dependency, and `GetPublicAsync` performs no store refinement. So a guest
// journey has no switch of its own to turn on, and modelling one here would assert a gate the product
// does not have.
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

// ---- Growth: the venue's privacy queue ----------------------------------------------------------
//
// The rows a guest's own rights journey leaves behind. `GrowthPrivacyRequests` is written by
// `POST /v1/growth/preference-session/privacy-requests` — the button on
// `pages/preferences/communications.vue`, which then tells the guest, verbatim, that «the venue has
// one month to answer you. That follows from GDPR article 12.»
//
// WHY THE FILING IS SEEDED AND NOT DRIVEN. The guest half of that journey cannot be walked in a
// browser against this fixture, and the obstacle is a real deployment defect rather than a gap here:
// the preference session is an HttpOnly cookie, so endpoints 4/5/7 are sent `credentials: 'include'`
// — and a browser refuses to attach credentials to a response carrying
// `Access-Control-Allow-Origin: *`, which is what `Program.cs` builds and what `send()` below
// reproduces. Teaching this fixture to echo the origin would model a backend that does not exist and
// would make a page that only works here pass. So the row is seeded in the state the guest's filing
// leaves it in, and the venue's half — the half with no surface at all until now — is what the
// browser drives.
//
// NOT LITERAL DATES, because the whole subject is a countdown. A hard-coded `receivedAt` would be
// overdue by a different number of days every day the suite runs and eventually stop being a
// countdown at all. Computed from the clock at reset so «past the one-month deadline» and «filed
// this week» stay true facts about the world rather than about the calendar.
const GROWTH_PRIVACY_OVERDUE_ID = 9101;
const GROWTH_PRIVACY_FRESH_ID = 9102;
const GROWTH_PRIVACY_CLOSED_ID = 9100;

// The row belonging to a store this caller does not administer. It exists so that «only this store's
// requests are shown» is a claim with something to be wrong about: a list route that stopped
// filtering by store would surface it, and a single-store fixture could never notice.
const GROWTH_PRIVACY_FOREIGN_STORE_ID = 99;
const GROWTH_PRIVACY_FOREIGN_ID = 9900;

function daysAgo (days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

function growthPrivacyRequests () {
  return [
    {
      storeId: STORE_ID,
      requestId: GROWTH_PRIVACY_FRESH_ID,
      contactPointId: 5502,
      requestType: 'Access',
      state: 'Received',
      receivedAt: daysAgo(3),
      resolvedAt: null,
      noticeDelivery: null
    },
    {
      // THE SUBJECT OF THE JOURNEY: an art. 17 erasure filed 41 days ago, so the one-month deadline
      // the guest was shown has already run out. Seeded SECOND on purpose, and after a request that
      // is three days old, so that a list served in seed order would bury the one about to run out
      // of month — the fixture has to sort by deadline to put it first, exactly as `ListAsync` does.
      storeId: STORE_ID,
      requestId: GROWTH_PRIVACY_OVERDUE_ID,
      contactPointId: 5501,
      requestType: 'Erasure',
      state: 'Received',
      receivedAt: daysAgo(41),
      resolvedAt: null,
      noticeDelivery: null
    },
    {
      storeId: STORE_ID,
      requestId: GROWTH_PRIVACY_CLOSED_ID,
      contactPointId: 5500,
      requestType: 'Access',
      state: 'Fulfilled',
      receivedAt: daysAgo(70),
      resolvedAt: daysAgo(68),
      // What the TRANSPORT reported, never a delivery. There is deliberately no `Delivered` member
      // in the enum this models.
      noticeDelivery: 'SubmittedToTransport'
    },
    {
      storeId: GROWTH_PRIVACY_FOREIGN_STORE_ID,
      requestId: GROWTH_PRIVACY_FOREIGN_ID,
      contactPointId: 7700,
      requestType: 'Erasure',
      state: 'Received',
      receivedAt: daysAgo(50),
      resolvedAt: null,
      noticeDelivery: null
    }
  ];
}

// ---- Margin: the ingredient master, the catalog, and the week ----------------------------------
//
// THE NUMBERS ARE CHOSEN SO A JOURNEY CAN ASSERT THEM AS TEXT. A browser walk that only checks "some
// money appeared" cannot tell a plate cost from a menu price, so every figure below divides cleanly
// through the whole chain: 500 g of flour at kr 24,00/kg plus 1 litre of milk at kr 18,00/l is
// kr 30,00 for the batch and kr 3,00 for one of ten portions, and a take-away price of kr 34,50 at
// 15 % VAT is exactly kr 30,00 net, which makes the food-cost ratio exactly 10,00 %. None of that is
// arithmetic the PAGE performs — every one of those figures is computed in `fixture/margin.js` and
// read off one field on the wire — but a journey asserting `kr 3,00` is asserting the field it meant.

/**
 * The starter library `GET /margin/ingredients` offers a store that has none. Copying one is an
 * ordinary create, which is how an empty store reaches its first costed recipe.
 *
 * `pricePerBaseUnitMinor` is NOT on the wire — the real surface resolves a price through supplier
 * items and their effective-price windows. It lives here because the cost preview is computed on
 * read and this fixture has to compute one; the shape the client sees is the preview, never this.
 */
const MARGIN_STARTERS = [
  { name: 'Hvetemel', baseUnit: 'Kilogram', notes: 'Siktet', pricePerBaseUnitMinor: 2400 },
  { name: 'Melk', baseUnit: 'Liter', notes: 'Helmelk', pricePerBaseUnitMinor: 1800 },
  { name: 'Kardemomme', baseUnit: 'Gram', notes: 'Malt', pricePerBaseUnitMinor: 12 }
];

/**
 * The store's product catalog, as the menu-margin read reports it — ONE ROW PER PRICE BASIS, because
 * a dish has one plate cost and up to three prices at up to three VAT rates.
 *
 * `Kaffe` is already claimed by the seeded `Kaffebrygg` recipe. That is deliberate: the backend
 * allows at most one ACTIVE link per product, so a second recipe pointing at it is refused
 * `margin.product-link-invalid` — a refusal no unit test can reach.
 */
const MARGIN_PRODUCTS = [
  {
    productId: 'prod-vaffel',
    productName: 'Vaffel med rømme',
    goodsGroupName: 'Mat',
    bases: [
      { priceBasis: 'Base', grossPriceMinor: 3450, vatPercent: 15, netPriceMinor: 3000 },
      { priceBasis: 'Table', grossPriceMinor: 5000, vatPercent: 25, netPriceMinor: 4000 }
    ]
  },
  {
    productId: 'prod-kaffe',
    productName: 'Kaffe',
    goodsGroupName: 'Drikke',
    bases: [
      { priceBasis: 'Base', grossPriceMinor: 4000, vatPercent: 25, netPriceMinor: 3200 }
    ]
  }
];

/** The store's suppliers. Read only, so a spend line's attribution has a name. */
const MARGIN_SUPPLIERS = [
  { supplierId: 'sup-1', name: 'Bergen Storkjøkken AS' },
  { supplierId: 'sup-2', name: 'Nordane Kaffe' }
];

/**
 * The week the statement surface reconciles. Every figure is the SERVER's — the page adds nothing up
 * — and they are chosen to make the ratios exact: 1 200 000 / 4 000 000 = 30,00 % theoretical.
 */
const MARGIN_WEEK = {
  netFoodSalesMinor: 4000000,
  theoreticalIngredientCostMinor: 1200000,
  coveredNetSalesMinor: 3600000,
  uncoveredNetSalesMinor: 400000,
  projectionWatermark: 918273,
  // A Monday, and the Sunday six days later. The page refuses to send a non-Monday and offers the
  // Monday of the picked week as a one-click suggestion.
  weekStart: '2026-07-20',
  weekEnd: '2026-07-26',
  // Deliberately NOT a Monday.
  weekMidweek: '2026-07-22'
};

// ---- CULTURES: a long page to put BEHIND a modal -----------------------------------------------
//
// `/admin/lang` renders one table row per translation key, and it is the only admin surface reachable
// from this fixture that is TALLER THAN THE VIEWPORT while also opening a real `atoms/Modal`. That
// combination is what the scroll-lock journey needs: a modal whose exit criterion is "the page behind
// it does not scroll" cannot be proven on a page that had nothing to scroll.
//
// The keys are generated rather than copied out of `translations/no.ts`. Copying them would couple a
// browser journey to a dictionary that changes weekly, and 60 synthetic rows make the page ~3x the
// viewport, which is all the journey needs. NOTHING here claims to be the real dictionary.
const CULTURE_KEYS = Array.from({ length: 60 }, (_, i) => 'fixture_key_' + String(i + 1).padStart(2, '0'));

function translationsFor (prefix) {
  return CULTURE_KEYS.reduce((acc, key) => {
    acc[key] = prefix + ' ' + key;
    return acc;
  }, {});
}

const CULTURES = [
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', translations: translationsFor('Tekst') },
  { code: 'en', name: 'English', nativeName: 'English', translations: translationsFor('Text') }
];

// ---- ONGOING ORDERS: the one page that hosts six different modals ------------------------------
//
// `/admin/ongoing` renders a card per live order and mounts SIX modal components over one shared
// `currentOrder` — OrderProcessing, Receipt, TransferOrder, ChangeDeliveryType, SmsDriver and
// CustomerInfo. That is what the estate scroll-lock journey needs and `/admin/lang` cannot give it:
// the previous journey could only ever open two instances of the SAME component, and the defect
// being closed here is what happens when two DIFFERENT modals, each with its own idea of when to
// release the body, are open at once.
//
// Enough of them to make the "new" column taller than the viewport, for the same reason the culture
// keys exist: "the page behind does not scroll" cannot be proven on a page with nothing to scroll.
// The shape is the one `components/molecules/OrderCard.vue` reads, not a copy of the API's model.
const ONGOING_ORDER_COUNT = 14;

const ONGOING_ORDERS = Array.from({ length: ONGOING_ORDER_COUNT }, (_, i) => ({
  id: 'order-' + (i + 1),
  friendlyOrderId: String(1000 + i + 1),
  storeId: STORE_ID,
  storeLegalName: STORE_NAME,
  status: 'Accepted',
  deliveryType: 'SelfPickup',
  platform: 'Web',
  created: new Date(Date.UTC(2026, 7, 1, 9, i)).toISOString(),
  requestedCompletion: null,
  userFullName: 'Gjest ' + (i + 1),
  userId: 'user-guest-' + (i + 1),
  userIsMember: false,
  user: { id: 'user-guest-' + (i + 1), phoneNumber: '+479000' + String(1000 + i) },
  totalAmount: 249 + i,
  currencyCode: CURRENCY,
  items: [
    { id: 'line-' + (i + 1), name: 'Dagens rett', amount: 1, price: 249 + i, comment: '' }
  ]
}));

module.exports = {
  ONGOING_ORDERS,
  MANAGER_PHONE,
  WORKER_PHONE,
  PHONE_SIGNUP_ADMIN_PHONE,
  OTP,
  CULTURES,
  STORE_ID,
  STORE_NAME,
  TIME_ZONE,
  CURRENCY,
  USERS,
  STAFF,
  UNKNOWN_PERSON_REF,
  ROLES,
  MARGIN_STARTERS,
  MARGIN_PRODUCTS,
  MARGIN_SUPPLIERS,
  MARGIN_WEEK,
  FEATURE_FLAG_CATALOG,
  SCHEDULE_WRITE_FLAG,
  EVENTS_CORE_FLAG,
  EVENTS_SETTLEMENT_FLAG,
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
  ADMIN_NOTIFICATION_HEALTH,
  GROWTH_PRIVACY_OVERDUE_ID,
  GROWTH_PRIVACY_FRESH_ID,
  GROWTH_PRIVACY_CLOSED_ID,
  GROWTH_PRIVACY_FOREIGN_STORE_ID,
  GROWTH_PRIVACY_FOREIGN_ID,
  growthPrivacyRequests
};

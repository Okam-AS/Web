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
  OTP,
  CULTURES,
  STORE_ID,
  STORE_NAME,
  TIME_ZONE,
  CURRENCY,
  USERS,
  STAFF,
  ROLES,
  OPEN_PROPOSAL_TOKEN,
  SUPERSEDED_PROPOSAL_TOKEN,
  PROPOSALS
};

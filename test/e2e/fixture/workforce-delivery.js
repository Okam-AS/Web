// THE WORKFORCE NOTIFICATION OUTBOX, as much of it as the delivery report's contract needs.
//
// Publishing a week does not deliver it. It ENQUEUES one command per channel per recipient, and a
// dispatcher later attempts each one. The publish response's `recipientCount` is the size of that
// enqueue; what became of the commands is a different read, and the whole point of the surface this
// fixture stands behind is that the two are not the same number.
//
// Kept out of `world.js` and out of `api-server.js` deliberately: it is a per-family slice like
// `margin.js` and `meals.js`, and the two files it would otherwise grow into are the ones every
// other lane is also editing.
//
// ---- WHAT IS MODELLED FROM THE BACKEND, AND WHY EACH PIECE IS HERE ----------------------------
//
// 1. THE CHANNEL PLAN (`WorkforceNotificationChannelPlan.Plan`). The in-app inbox always, plus ONE
//    external tier: Push when the person has claimed a login, else Email when there is an address,
//    else SMS when there is a number. Reproduced because it decides WHICH adapter judges a recipient
//    and therefore which reason code the report shows — a fixture that put everyone on push would
//    make two of the three reason paths unreachable.
//
// 2. THE ADAPTERS' OUTCOMES. Only the PUSH adapter can WITHHOLD, and only for one reason: the
//    store's hub credential is absent. Every other adapter can only succeed or fail. That asymmetry
//    is not incidental — it is why a single store cannot show `Withheld` and `NoPushRegistration` at
//    the same moment, and why the seeded row below exists.
//
// 3. THE ATTEMPT BUDGET. A withheld row costs NO attempt and carries no dead-letter stamp; a failed
//    one spends attempts until the cap and then gets one. That difference is the machine-readable
//    half of the distinction the report renders, so it is reproduced exactly rather than approximated.
//
// ---- WHAT IS NOT MODELLED ---------------------------------------------------------------------
//
// There is no dispatcher loop, no backoff clock and no leasing. The commands are resolved at enqueue
// time, because this fixture exists to answer the REPORT's contract, not to be a queue. A journey
// that needed to watch a row climb its attempts would need a real backend, and would be an @live one.

'use strict';

// ---- the store's transport preconditions -------------------------------------------------------
//
// The fixture store has NO push credential. That is the honest default rather than a scenario: hub
// credentials are environment configuration and are deliberately absent from every repository in
// this estate, so a store standing up against a local API genuinely has none. It is also the state
// the whole `Withheld` enum value was added for.
const STORE_PUSH_CONFIGURED = false;

// ---- who can be reached how --------------------------------------------------------------------
//
// Keyed by `staffMemberId`, matching `world.STAFF`. It lives here rather than on those records so the
// roster's wire shape — which several other journeys assert — is untouched by this lane.
//
// It follows the world's own facts and does not invent any: `staff-1` is the one `Claimed` person
// (the worker identity the other journeys sign in as), and the two `Invited` ones have never claimed
// a login, so the channel plan cannot route push to them. That is a channel that DOES NOT APPLY, not
// a failure — the backend is explicit about the difference and so is this.
const CONTACTS = {
  'staff-1': { login: 'user-worker', email: null, phone: null },
  'staff-2': { login: null, email: 'kari@example.test', phone: null },
  'staff-3': { login: null, email: null, phone: '+4790000009' }
};

// Addresses this fixture's mail transport rejects, and numbers its SMS gateway rejects. Both produce
// a WORKER-tier failure: an attempt was made against a configured transport and this named person
// was not reached.
const BOUNCING_EMAIL = 'kari@example.test';
const REJECTING_SMS = '+4790000009';

const MAX_ATTEMPTS = 5;

/** `WorkforceNotificationChannelPlan.Plan` — the inbox always, plus at most one external tier. */
function planFor (staffMemberId) {
  const contact = CONTACTS[staffMemberId] || { login: null, email: null, phone: null };
  const routes = [{ channel: 'InApp', target: contact.login || staffMemberId }];

  if (contact.login) {
    routes.push({ channel: 'Push', target: contact.login });
  } else if (contact.email) {
    routes.push({ channel: 'Email', target: contact.email });
  } else if (contact.phone) {
    routes.push({ channel: 'Sms', target: contact.phone });
  }

  return routes;
}

/**
 * What the adapter for `route.channel` answers. Returns null when the command is delivered and
 * therefore never appears on the report.
 *
 * The reason strings are the backend's REDACTED codes, copied verbatim: `PushNotConfigured` and
 * `NoPushRegistration` from `WorkforcePushNotificationDelivery`, `SmsRejectedByGateway` from
 * `WorkforceSmsNotificationDelivery`, and for the mail failure an exception TYPE, which is what
 * `SensitiveDataRedactor.ExceptionLabel` yields. Provider prose never reaches this field on either
 * side, because a Notification Hubs message quotes the tag expression and, on an auth failure, the
 * SAS credential.
 */
function outcomeFor (route) {
  if (route.channel === 'Push') {
    if (!STORE_PUSH_CONFIGURED) {
      // WITHHELD. Nothing was attempted, no attempt was spent, and the row waits rather than dying.
      return { status: 'Withheld', lastError: 'PushNotConfigured', attempts: 0, terminal: false };
    }
    return null;
  }

  if (route.channel === 'Email' && route.target === BOUNCING_EMAIL) {
    // A permanent rejection: it spends the whole budget and dead-letters. `SmtpException` is an
    // exception label rather than one of the named codes ON PURPOSE — it is how the report's
    // "a code this build cannot explain" path gets walked by a real journey instead of a unit test.
    return { status: 'DeadLettered', lastError: 'SmtpException', attempts: MAX_ATTEMPTS, terminal: true };
  }

  if (route.channel === 'Sms' && route.target === REJECTING_SMS) {
    // Still retrying: one attempt spent, four left, next attempt scheduled.
    return { status: 'Failed', lastError: 'SmsRejectedByGateway', attempts: 1, terminal: false };
  }

  return null;
}

function iso (date) {
  // The wire format the backend's `DateTime` fields use on this model: no zone designator.
  return date.toISOString().replace(/\.\d+Z$/, '');
}

function fresh () {
  const now = new Date();
  return {
    seq: 0,
    // ONE ROW FROM BEFORE THIS SESSION, and it is here to make a point the live world cannot make in
    // a single publish: `Withheld` and `NoPushRegistration` are both PUSH outcomes and are mutually
    // exclusive at any one moment, because the first depends on the store's credential being absent
    // and the second on it being present. A store that has had its credential rotated has both — the
    // dead letter from the publication before the rotation, and today's withheld backlog waiting for
    // the replacement. Without this row the report's most important worker-tier reason could not be
    // reached from a browser at all.
    outbox: [{
      notificationOutboxId: 'outbox-seed-1',
      storeId: null, // filled in on first enqueue; the store id is not known until a journey signs in
      schedulePublicationId: 'publication-previous',
      staffMemberId: 'staff-1',
      channel: 'Push',
      status: 'DeadLettered',
      targetLabel: '[redacted]',
      attemptCount: MAX_ATTEMPTS,
      maxAttempts: MAX_ATTEMPTS,
      nextAttemptUtc: iso(now),
      lastError: 'NoPushRegistration',
      deadLetteredAtUtc: iso(new Date(now.getTime() - 86400000)),
      createdAtUtc: iso(new Date(now.getTime() - 90000000))
    }]
  };
}

/**
 * Enqueue one publication's commands and resolve each immediately. Returns how many RECIPIENTS were
 * enqueued — which is what the publish response reports, and deliberately not how many arrived.
 */
function enqueueForPublication (state, options) {
  const storeId = options.storeId;
  const publicationId = options.publicationId;
  const recipients = options.recipients || [];
  const now = new Date();

  // The seeded row belongs to whichever store the journey is actually driving.
  state.outbox.forEach((row) => { if (row.storeId === null) { row.storeId = storeId; } });

  recipients.forEach((staffMemberId) => {
    planFor(staffMemberId).forEach((route) => {
      const outcome = outcomeFor(route);
      if (!outcome) { return; }

      state.seq += 1;
      state.outbox.push({
        notificationOutboxId: 'outbox-' + state.seq,
        storeId,
        schedulePublicationId: publicationId,
        staffMemberId,
        channel: route.channel,
        status: outcome.status,
        // PRESENCE, never the address. `[none]` is the backend saying it holds no delivery address
        // at all for this recipient; anything else is `[redacted]`.
        targetLabel: route.target ? '[redacted]' : '[none]',
        attemptCount: outcome.attempts,
        maxAttempts: MAX_ATTEMPTS,
        nextAttemptUtc: iso(new Date(now.getTime() + 300000)),
        lastError: outcome.lastError,
        deadLetteredAtUtc: outcome.terminal ? iso(now) : null,
        createdAtUtc: iso(now)
      });
    });
  });

  return recipients.length;
}

/**
 * `GET /workforce/stores/{storeId}/schedules/notification-failures`.
 *
 * Only the three statuses the backend selects, ordered dead-lettered-then-created descending, both
 * copied from `WorkforceSchedulePublishService.GetNotificationFailuresAsync`. `Sent` and `Pending`
 * rows are not failures and are not here.
 */
function failures (state, storeId) {
  return state.outbox
    .filter(row => String(row.storeId) === String(storeId))
    .filter(row => row.status === 'Failed' || row.status === 'DeadLettered' || row.status === 'Withheld')
    .slice()
    .sort((a, b) => {
      const dead = String(b.deadLetteredAtUtc || '').localeCompare(String(a.deadLetteredAtUtc || ''));
      return dead !== 0 ? dead : String(b.createdAtUtc).localeCompare(String(a.createdAtUtc));
    });
}

module.exports = { fresh, enqueueForPublication, failures, MAX_ATTEMPTS };

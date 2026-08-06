// READING THE STORE'S UNDELIVERED NOTIFICATIONS.
//
// `GET /workforce/stores/{id}/schedules/notification-failures` is the only truthful account of what a
// publication actually reached. The publish response's `recipientCount` is how many outbox rows were
// ENQUEUED; this is what became of them. Everything here is pure — no HTTP, no Vue — so the one
// judgement it makes can be tested without a browser.
//
// ---- THE ONE JUDGEMENT: TWO TIERS, NEVER ONE BUCKET -------------------------------------------
//
// The backend went to deliberate lengths to keep two situations apart, and the whole value of this
// surface is that it does not put them back together:
//
//   STORE TIER — `Withheld`. The store's push credential has not landed yet. The adapter attempted
//     NOTHING (`IsConsumerPushConfigured` is false), so no attempt was spent and the backlog is
//     still there when the credential arrives. A store on its first day is in this state. It is
//     WAITING, and it is not broken.
//
//   WORKER TIER — `Failed` / `DeadLettered`. An attempt was made against a configured hub and this
//     named worker was not reached: no device registered (`NoPushRegistration`), or no push address
//     at all (`NoPushTarget`), or the transport threw. An attempt WAS spent, and no retry can invent
//     a device. This worker was never told, and somebody has to tell them by hand.
//
// A surface with one bucket labelled "failed" teaches the wrong lesson on the day it matters: on day
// one it cries wolf about a credential nobody has installed yet, and later it buries the one worker
// who genuinely never got their shifts under a pile of rows nobody can act on. `tierOf` is the
// function that refuses to do that, and `summarise` never returns a single total.
//
// ---- WHAT THIS MODULE WILL NOT DO -------------------------------------------------------------
//
// It never invents a reason. `lastError` is a REDACTED code the backend chose precisely so that a
// Notification Hubs message — which quotes the tag expression, and on an auth failure the SAS
// credential — never reaches an operator screen or a log. Known codes get a sentence; an unknown one
// is shown verbatim and labelled unrecognised, because a reason we cannot explain is still evidence
// and guessing at it would be worse than the code.
//
// It never renders an address. The model carries `targetLabel` (a PRESENCE label, "[redacted]" or
// "[none]"), never the phone number or e-mail, and nothing here reaches for one.

/** The read has not answered yet, or answered with a failure. NOT the same as "nothing undelivered". */
export const DELIVERY_UNKNOWN = 'delivery_unknown';

/** The store has met no precondition to fail: its push credential has not landed. Waiting, not broken. */
export const TIER_STORE = 'store';

/** An attempt was spent against a configured hub and this named worker was not reached. */
export const TIER_WORKER = 'worker';

/**
 * `WorkforceNotificationOutboxStatus` as it arrives on the wire — STRINGS, because the API
 * serialises every enum through `StringEnumConverter`. The read is case-insensitive anyway: a
 * serializer change to numbers would make every row unrecognised rather than silently mis-tiered,
 * which is the failure direction this surface can survive.
 */
const STATUS_WITHHELD = 'withheld';
const STATUS_FAILED = 'failed';
const STATUS_DEADLETTERED = 'deadlettered';

/**
 * Status -> tier. The single place the distinction lives.
 *
 * An unrecognised status is deliberately NOT defaulted into either tier: it becomes `null`, and
 * `summarise` files it under `unrecognised` where it is shown and counted separately. Defaulting it
 * to the worker tier would let a future status quietly inherit "this worker was never told", and
 * defaulting it to the store tier would let a real failure read as waiting.
 */
export function tierOf (status) {
  switch (String(status || '').toLowerCase()) {
    case STATUS_WITHHELD: return TIER_STORE;
    case STATUS_FAILED:
    case STATUS_DEADLETTERED: return TIER_WORKER;
    default: return null;
  }
}

/** True once the attempt budget is spent: no further automatic retry will happen. */
export function isTerminal (row) {
  return String((row && row.status) || '').toLowerCase() === STATUS_DEADLETTERED;
}

/**
 * The redacted reason codes this surface can explain, mapped to translation keys.
 *
 * Transcribed from the four transport adapters — every literal any of them passes to `Fail(...)` or
 * `Withhold(...)`. `PushNotConfigured` is the only WITHHOLD in the estate today: the push adapter is
 * the only one with a store-level precondition to be missing.
 *
 * Adapters also fail with an exception TYPE (`SensitiveDataRedactor.ExceptionLabel`), which is an
 * open set and deliberately NOT enumerated here. Those land on the unrecognised path and are shown
 * verbatim — see the module header for why that is better than a guess.
 */
const REASON_KEYS = {
  // WorkforcePushNotificationDelivery
  pushnotconfigured: 'wf_delivery_reason_push_not_configured',
  nopushregistration: 'wf_delivery_reason_no_push_registration',
  nopushtarget: 'wf_delivery_reason_no_push_target',
  // WorkforceSmsNotificationDelivery
  nosmstarget: 'wf_delivery_reason_no_sms_target',
  smsrejectedbygateway: 'wf_delivery_reason_sms_rejected',
  // WorkforceEmailNotificationDelivery
  noemailtarget: 'wf_delivery_reason_no_email_target'
};

/**
 * The translation key explaining `lastError`, or null when the code is not one we can explain.
 *
 * A null answer is a contract with the caller: show the raw code and say it is unrecognised. It is
 * never a licence to show nothing, because the reason is the entire point of the row.
 */
export function reasonKeyFor (lastError) {
  const code = String(lastError || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(REASON_KEYS, code) ? REASON_KEYS[code] : null;
}

/** `staffMemberId` -> display name, from whatever roster the page already loaded. */
function nameFrom (roster, staffMemberId) {
  if (!staffMemberId || !Array.isArray(roster)) { return null; }
  const hit = roster.find(s => s && s.staffMemberId === staffMemberId);
  return (hit && (hit.displayName || hit.name)) || null;
}

/**
 * One wire row -> one row this surface can render.
 *
 * `staffLabel` is null rather than a placeholder when the roster cannot name the worker: the page
 * says "an unnamed recipient" in that case, which is honest, where "Unknown" invites the reader to
 * believe the backend sent a worker called Unknown.
 */
export function decorate (row, roster) {
  const source = row || {};
  return {
    id: source.notificationOutboxId || null,
    publicationId: source.schedulePublicationId || null,
    staffMemberId: source.staffMemberId || null,
    staffLabel: nameFrom(roster, source.staffMemberId),
    channel: source.channel || null,
    status: source.status || null,
    tier: tierOf(source.status),
    terminal: isTerminal(source),
    // Presence, never an address. Carried through untouched so the page can say "we hold no address
    // for this worker" when the backend says `[none]`.
    targetLabel: source.targetLabel || null,
    attemptCount: typeof source.attemptCount === 'number' ? source.attemptCount : null,
    maxAttempts: typeof source.maxAttempts === 'number' ? source.maxAttempts : null,
    nextAttemptUtc: source.nextAttemptUtc || null,
    lastError: source.lastError || null,
    reasonKey: reasonKeyFor(source.lastError),
    deadLetteredAtUtc: source.deadLetteredAtUtc || null,
    createdAtUtc: source.createdAtUtc || null
  };
}

/**
 * The whole read, in the shape the panel renders.
 *
 * `rows` is what the client answered, or `DELIVERY_UNKNOWN` when the read failed. Those are
 * different answers and this returns different structures for them — a read that could not run must
 * never produce the same empty list as a store with nothing undelivered, which is the exact lie this
 * whole surface exists to stop telling.
 *
 * There is deliberately NO `total`. The counts are per bucket, so no caller can render "3 failures"
 * over a store that has one unreached worker and two rows waiting on a credential.
 */
export function summarise (rows, roster) {
  if (rows === DELIVERY_UNKNOWN || rows === null || rows === undefined) {
    return { known: false, waiting: [], retrying: [], gaveUp: [], unrecognised: [], clean: false };
  }

  const list = (Array.isArray(rows) ? rows : []).map(row => decorate(row, roster));

  return {
    known: true,
    // Store tier: no attempt spent, nothing broken, and the backlog survives until the credential lands.
    waiting: list.filter(r => r.tier === TIER_STORE),
    // Worker tier, still retrying: an attempt was spent and more remain.
    retrying: list.filter(r => r.tier === TIER_WORKER && !r.terminal),
    // Worker tier, budget spent: this one needs a person to deliver it by hand.
    gaveUp: list.filter(r => r.tier === TIER_WORKER && r.terminal),
    // A status this build does not know. Shown, counted, never folded into a tier.
    unrecognised: list.filter(r => r.tier === null),
    // Answered, and there is nothing outstanding. Only ever true for a read that actually ran.
    clean: list.length === 0
  };
}

export default { summarise, decorate, tierOf, isTerminal, reasonKeyFor, DELIVERY_UNKNOWN, TIER_STORE, TIER_WORKER };

// The Events journey model: the pure function between what the `/events` admin API returned and what
// the page draws. No Vue, no network — so every rule below is testable on its own.
//
// THE LAW THIS FILE EXISTS TO KEEP, in the same spirit as `utils/workforce/week-grid.js`: UNKNOWN IS
// NOT EMPTY AND NEITHER IS ZERO. An Events surface has three ways to know nothing, and a venue reads
// them as three different sentences:
//
//   unknown        — the read failed or has not answered. Nothing may be claimed.
//   disabled       — the server answered 404 EVENTS_DISABLED. The module is dark for this venue.
//                    That is a configuration fact, not "this venue has no enquiries".
//   forbidden      — 403. The caller is not an admin of this store. Also not "no enquiries".
//
// Only a read that ANSWERED produces rows, and an answered read holding no rows is a true empty.
//
// There used to be a fourth, `no-read-endpoint`: the backend exposed no route that could answer, so
// the deposit and the settlement could be neither confirmed nor denied. Both routes landed in
// `86cb4d25` and the state went with them. It is recorded here because deleting it was the point:
// a state that outlives its cause does not decay into a harmless leftover — it keeps a surface built
// on the answer to the last mutation, which is a copy of the truth and not the truth.
//
// MONEY IS READ, NEVER COMPUTED. Nothing in this file adds two amounts together. Where the backend
// exposes a figure it is passed through as the integer minor units it already is; where it does not,
// `null` comes out and the surface prints a dash. The figures deliberately NOT produced here are
// listed at the bottom.

import { businessDateKey, parseApiInstant, zonedMidnightToUtc } from '~/utils/workforce/week-range';
import { toUtcRangeParam } from '~/utils/workforce/api-client';

// ---- how a read can have failed ---------------------------------------------------------------

/** The read has not answered, or failed in a way that says nothing about the data. */
export const READ_UNKNOWN = 'unknown';
/** 404 `EVENTS_DISABLED` — the module is not enabled for this venue (config, or the store's `Events.Core`). */
export const READ_DISABLED = 'disabled';
/** 403 — the signed-in person is not an admin of this store. */
export const READ_FORBIDDEN = 'forbidden';
/** The read answered. Rows may legitimately be zero, and zero then means zero. */
export const READ_ANSWERED = 'answered';

/**
 * Reads a list response into the four-state axis above.
 *
 * `rows` is null unless the read ANSWERED — a caller that renders `rows.length` therefore cannot
 * accidentally print "0 enquiries" over a refusal, because there is no array to take a length of.
 */
export function readListing (payload, error) {
  if (error) {
    return { state: stateOfError(error), rows: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!Array.isArray(payload)) {
    // A 200 that is not a list is not an empty list. The server's own shape is `List<...>`; anything
    // else means the read did not answer the question that was asked.
    return { state: READ_UNKNOWN, rows: null, code: null, detail: null };
  }
  return { state: READ_ANSWERED, rows: payload, code: null, detail: null };
}

/**
 * The same four-state axis for a single-object read (the event detail).
 *
 * Separate from `readListing` on purpose: the two answer with different shapes, and one function
 * returning `rows` for one caller and `view` for another is how a caller ends up reading the field
 * that is always undefined and calling it empty.
 */
export function readDetail (payload, error) {
  if (error) {
    return { state: stateOfError(error), view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!payload || typeof payload !== 'object') {
    return { state: READ_UNKNOWN, view: null, code: null, detail: null };
  }
  return { state: READ_ANSWERED, view: payload, code: null, detail: null };
}

function stateOfError (error) {
  if (error && error.code === 'EVENTS_DISABLED') { return READ_DISABLED; }
  if (error && error.status === 403) { return READ_FORBIDDEN; }
  return READ_UNKNOWN;
}

function codeOf (error) {
  return (error && error.code) || null;
}

function detailOf (error) {
  return (error && error.message) || null;
}

// ---- the three readable facets ----------------------------------------------------------------
//
// The deposit, the settlement and the run sheet each have an idempotent admin GET, and each says
// "there is none" in a different dialect: the run sheet 404s with its own code, the settlement
// answers 200 with a null field, and the deposits answer an empty list. Three readers rather than one
// because the differences are on the WIRE — a single reader would have to guess which dialect it was
// looking at, and guessing wrong turns an absence into an unknown or, far worse, the reverse.

/** A read ANSWERED and there is one; its projection is in hand. */
export const FACET_HELD = 'held';
/** 404 `EVENTS_DISABLED` from the facet's own gate (the settlement machine's `Events.Settlement` flag). */
export const FACET_GATED = 'gated';
/** A call was made and refused for some other reason, or none has been made yet. Nothing is claimed. */
export const FACET_UNKNOWN = 'unknown';
/** The read ANSWERED and there is genuinely none. An established absence, never an assumed one. */
export const FACET_NONE = 'none';

/**
 * The settlement read (`GET .../settlement` → `EventsSettlementReadView`).
 *
 * Its absence dialect is a 200 whose `settlement` field is null, which the server documents as "none
 * exists, never unknown" — so it is `none` and not `unknown`. A 200 that is not that shape at all IS
 * unknown: the read did not answer the question asked, and an unrecognised body must never be read as
 * an empty settlement.
 *
 * 404 `EVENTS_DISABLED` is `gated` and says nothing about whether a settlement exists — the flag
 * gates the read and the writes together, so a gated store cannot even be asked.
 */
export function readSettlement (payload, error) {
  if (error) {
    if (error.code === 'EVENTS_DISABLED') {
      return { state: FACET_GATED, view: null, code: error.code, detail: detailOf(error) };
    }
    return { state: FACET_UNKNOWN, view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!payload || typeof payload !== 'object') {
    return { state: FACET_UNKNOWN, view: null, code: null, detail: null };
  }
  return payload.settlement
    ? { state: FACET_HELD, view: payload.settlement, code: null, detail: null }
    : { state: FACET_NONE, view: null, code: null, detail: null };
}

/**
 * The deposit read (`GET .../deposits` → a LIST).
 *
 * A list, not a view, and it is kept as one: an event accumulates deposits across a
 * cancel-and-reissue, and the server returns the whole history rather than naming a current one.
 * Collapsing it to `rows[0]` here would pick by position — which is how a cancelled deposit ends up
 * being shown as the live one.
 *
 * `[]` is `none`: the read answered and this event has never had a deposit. Anything that is not an
 * array is `unknown`, for the same reason as above.
 */
export function readDeposits (payload, error) {
  if (error) {
    if (error.code === 'EVENTS_DISABLED') {
      return { state: FACET_GATED, rows: null, code: error.code, detail: detailOf(error) };
    }
    return { state: FACET_UNKNOWN, rows: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!Array.isArray(payload)) {
    return { state: FACET_UNKNOWN, rows: null, code: null, detail: null };
  }
  return payload.length
    ? { state: FACET_HELD, rows: payload, code: null, detail: null }
    : { state: FACET_NONE, rows: [], code: null, detail: null };
}

/**
 * The run sheet, whose absence dialect is a code: `EVENTS_RUNSHEET_NOT_FOUND` is a real answer
 * meaning there is no sheet yet. Not-yet-asked stays `unknown`, asked-and-none is `none`, and they
 * are two sentences.
 */
export function readRunSheet (view, error) {
  if (error) {
    if (error.code === 'EVENTS_RUNSHEET_NOT_FOUND') {
      return { state: FACET_NONE, view: null, code: error.code, detail: detailOf(error) };
    }
    if (error.code === 'EVENTS_DISABLED') {
      return { state: FACET_GATED, view: null, code: error.code, detail: detailOf(error) };
    }
    return { state: FACET_UNKNOWN, view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (view) { return { state: FACET_HELD, view, code: null, detail: null }; }
  return { state: FACET_UNKNOWN, view: null, code: null, detail: null };
}

/**
 * The store's guest-notification health (`GET .../notifications/health`).
 *
 * The envelope is the answer, not the list inside it: an empty `deadLettered` means "every guest was
 * reached" with `dispatchEnabled` true and "nothing has been delivered at all" with it false, and a
 * surface that rendered "0 problems" for the second would assert the exact falsehood the read exists
 * to prevent. So there is no `none` state here — an answered read is HELD whatever it contains, and
 * the panel reads the envelope.
 */
export function readNotificationHealth (payload, error) {
  if (error) {
    if (error.code === 'EVENTS_DISABLED') {
      return { state: FACET_GATED, view: null, code: error.code, detail: detailOf(error) };
    }
    return { state: FACET_UNKNOWN, view: null, code: codeOf(error), detail: detailOf(error) };
  }
  if (!payload || typeof payload !== 'object' || typeof payload.dispatchEnabled !== 'boolean') {
    return { state: FACET_UNKNOWN, view: null, code: null, detail: null };
  }
  return { state: FACET_HELD, view: payload, code: null, detail: null };
}

// ---- which deposit an action applies to --------------------------------------------------------
//
// Chosen by STATUS off the read, never by position in the list and never from the EVENT's own
// lifecycle status, which moves independently of the deposit's. Both lists mirror a server guard
// exactly (`EventsDepositService.CancelAsync` / `RefundAsync`); they narrow nothing and widen
// nothing, so the server's refusal is still the one that decides.

/** `CancelAsync` accepts an UNPAID request only. */
export const CANCELLABLE_DEPOSIT_STATUSES = ['Requested', 'Pending'];

/**
 * `RefundAsync` accepts a paid or partially-refunded deposit, and a `Quarantined` one — the
 * late-payment row whose whole purpose is to be resolved by hand.
 */
export const REFUNDABLE_DEPOSIT_STATUSES = ['Paid', 'PartiallyRefunded', 'Quarantined'];

/**
 * The one deposit an action applies to, or null.
 *
 * Null when the read has not answered: with no rows there is no deposit to name, and an id may not be
 * guessed from the event. Null too when more than one row matches — the server's invariant is one
 * active deposit at a time, so two would mean the invariant broke, and picking one of them would hide
 * that rather than surface it.
 */
export function actionableDeposit (rows, statuses) {
  if (!Array.isArray(rows)) { return null; }
  const matches = rows.filter(row => row && statuses.includes(row.status));
  return matches.length === 1 ? matches[0] : null;
}

// ---- the lifecycle ----------------------------------------------------------------------------

/**
 * `EventStatus` in the order the spec's T1–T13 walk it. This is a LABELLING order for the rail — it is
 * NOT a copy of the transition table, and nothing here decides what is legal. Legality is the server's
 * answer: an illegal action comes back 409 `EVENTS_STATE` carrying `currentStatus` and
 * `permittedActions`, and that is what the surface shows. A client-side copy of `EventsStateMachine`
 * would drift, and it would drift silently.
 */
export const PHASE_SEQUENCE = [
  'Inquiry',
  'Proposing',
  'ProposalSent',
  'Accepted',
  'DepositPending',
  'Confirmed',
  'InService',
  'Settling',
  'Settled'
];

/** The two terminal states that leave the rail rather than advance along it. */
export const OFF_RAMPS = ['Lost', 'Cancelled'];

/** The server named a status this surface knows. */
export const STATUS_REPORTED = 'reported';
/** The server reported NO status. Not `Inquiry`, not the first phase — nothing. */
export const STATUS_ABSENT = 'absent';
/** The server named a status this surface does not know. Shown verbatim, never mapped to a phase. */
export const STATUS_UNRECOGNISED = 'unrecognised';

/**
 * Reads the event's own reported status.
 *
 * The status is READ, never inferred. There are several fields on the detail that correlate with it —
 * `acceptedProposalVersionNo`, the newest version's own status, the last transition's `toStatus` — and
 * every one of them is a plausible-looking way to get the lifecycle wrong, because each can be true of
 * an event whose status has since moved. Only `detail.status` is consulted.
 */
export function readEventStatus (status) {
  if (typeof status !== 'string' || !status) {
    return { state: STATUS_ABSENT, status: null, index: null, isOffRamp: false };
  }
  if (OFF_RAMPS.includes(status)) {
    return { state: STATUS_REPORTED, status, index: null, isOffRamp: true };
  }
  const index = PHASE_SEQUENCE.indexOf(status);
  if (index < 0) {
    return { state: STATUS_UNRECOGNISED, status, index: null, isOffRamp: false };
  }
  return { state: STATUS_REPORTED, status, index, isOffRamp: false };
}

/**
 * The rail: one node per phase, each marked done / current / ahead against the REPORTED status.
 *
 * An absent, unrecognised or off-ramp status marks every node `ahead` and leaves `current` null —
 * the rail refuses to guess where an event sits rather than lighting up a phase it cannot justify.
 */
export function buildPhaseRail (status) {
  const read = readEventStatus(status);
  return PHASE_SEQUENCE.map((phase, index) => ({
    phase,
    state: read.index === null
      ? 'ahead'
      : index < read.index ? 'done' : index === read.index ? 'current' : 'ahead'
  }));
}

// ---- who did it -------------------------------------------------------------------------------

/** No author is recorded on the row. Renders as a dash, never as a name and never as an empty string. */
export const AUTHOR_NONE = 'none';
/** An opaque `AspNetUsers` id. It is a REFERENCE, not a name — the API exposes no display name. */
export const AUTHOR_REFERENCE = 'reference';

/**
 * Reads an author column (`settlement.closedByUserId`, `runSheet.issuedByUserId`).
 *
 * Rows written before the claim defect fixed in `a69edf41` carry a NULL author while their action
 * genuinely happened, so an absent author is an ordinary, expected value here — not a defect to hide.
 * It renders as "no author recorded", never as "Unknown user", which would assert a user record that
 * does not exist, and never as an empty string, which would look like a rendering bug.
 *
 * A present value is an opaque identity id. The surface labels it as a reference rather than printing
 * it as though it were a person's name; there is no endpoint on this branch that resolves it.
 */
export function readAuthor (userId) {
  const reference = typeof userId === 'string' ? userId.trim() : '';
  return reference
    ? { state: AUTHOR_REFERENCE, reference }
    : { state: AUTHOR_NONE, reference: null };
}

// ---- deposit rails ----------------------------------------------------------------------------

/**
 * The payment rails that can carry an Events deposit END TO END on this branch. Exactly one: Vipps.
 *
 * Both halves were checked, because a rail that can be started but never completes is worse than one
 * that is absent:
 *
 *  • CREATION — `EventsDepositPaymentPortAdapter.Initiate` composes `IVippsService.Initiate`, which
 *    takes a bare amount and writes no `PaymentTransaction`. For Stripe and for the Dintero online
 *    methods it throws `EVENTS_PAYMENT_PROVIDER`: neither provider service has a transaction-free
 *    creation entrypoint, and wiring one is escalated out of that lane. So those two cannot even
 *    issue.
 *  • COMPLETION — `IEventsDepositCompletionSink.OnProviderOutcome` has exactly one caller outside the
 *    module, `Controllers/VippsController.cs`. Nothing in the Stripe or Dintero pipelines dispatches
 *    to it, so no completion on those rails could promote a deposit (T9) even if one could be created.
 *
 * Offering the operator a provider that fails at one end or the other would be the surface implying
 * both work. It offers Vipps, and says why the others are absent.
 */
export const DEPOSIT_RAIL_VIPPS = 'Vipps';
export const DEPOSIT_RAILS_WIRED = [DEPOSIT_RAIL_VIPPS];

/** The rails present in the module's own enum but not carried end to end here. Named, not hidden. */
export const DEPOSIT_RAILS_UNWIRED = ['Stripe', 'Dintero'];

// ---- money ------------------------------------------------------------------------------------

/**
 * One `long …Minor` off the wire, or null.
 *
 * Integer minor units only. A non-integer is not rounded and not truncated — it comes back null and
 * prints as a dash, because a money field that did not arrive as an integer is a field whose value is
 * not known, and a wrong amount is worse than a missing one. `null` in, `null` out: an unpaid deposit's
 * `paidAtUtc` is absent, not zero, and so are the amounts that go with it.
 */
export function readMinor (value) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

/**
 * Operator-typed money → integer minor units, or null.
 *
 * String arithmetic, never floating point (`8.11 * 100` is `810.9999…`). The whole part and the
 * fraction are parsed as separate integers and combined, so every representable input is exact.
 * Anything that is not a plain amount with at most two decimals is REFUSED rather than coerced: a
 * caller gets null and must show the field as unfilled, not send a number the operator did not type.
 */
export function parseMinorUnits (text) {
  const raw = String(text === null || text === undefined ? '' : text).trim().replace(/\s/g, '');
  if (!raw) { return null; }

  const match = /^(-)?(\d+)(?:[.,](\d{1,2}))?$/.exec(raw);
  if (!match) { return null; }

  const whole = Number(match[2]);
  const fraction = Number((match[3] || '') + '00'.slice((match[3] || '').length));
  if (!Number.isSafeInteger(whole)) { return null; }

  const minor = whole * 100 + fraction;
  if (!Number.isSafeInteger(minor)) { return null; }
  return match[1] ? -minor : minor;
}

// ---- time -------------------------------------------------------------------------------------

/**
 * `event.eventDate` → its `YYYY-MM-DD` day key.
 *
 * An event is a DATED thing, and its date is a date: `EventsEvent.EventDate` is assigned
 * `request.EventDate.Date` and stored in a date-typed column, so it arrives as a bare midnight. It is
 * sliced, never converted. Running it through a timezone — in either direction — is how a party on the
 * 15th is shown on the 14th, and an event on the wrong day is the failure that ends trust in a module
 * like this one.
 *
 * `parseApiInstant` is for the `…AtUtc` columns, which really are instants; it is not for this.
 */
export function eventDateKey (value) {
  return businessDateKey(value);
}

/**
 * A `TimeSpan` off the wire (`"18:30:00"`) → `"18:30"`.
 *
 * `startTime`/`endTime` are clock times WITHIN the event's own day, not instants: they carry no date
 * and no zone, so there is nothing to convert and `new Date` must never see them. A value that is not
 * a plain same-day clock time — a multi-day `TimeSpan` such as `"1.02:00:00"`, or anything unparsed —
 * returns null and prints as a dash, rather than being shown as `02:00` on a day it does not fall on.
 */
export function clockLabel (value) {
  if (typeof value !== 'string') { return null; }
  const match = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) { return null; }
  const hour = Number(match[1]);
  if (hour > 23) { return null; }
  return (hour < 10 ? '0' + hour : String(hour)) + ':' + match[2];
}

/** A `…AtUtc` stamp → a `Date`, or null. Bare stamps are UTC; see `parseApiInstant`. */
export function readInstant (value) {
  return parseApiInstant(value);
}

/**
 * A proposal expiry the operator picked as a DAY → the wire value for `expiresAtUtc`.
 *
 * The operator picks a date; the offer expires at the start of that day AT THE VENUE, and the label
 * beside the field says so. The conversion goes through `zonedMidnightToUtc`, which re-reads the zone
 * offset at the corrected instant, so a date on a DST-change weekend still lands on real local
 * midnight — an hour's drift here shortens or extends the guest's window to accept.
 *
 * THE BROWSER'S ZONE IS NEVER USED. `new Date('2026-08-15T00:00')` would mean midnight wherever the
 * laptop happens to be, which for a venue in Oslo and staff on holiday elsewhere is a different
 * instant. Without the venue's own zone this returns null and the field is sent unset.
 *
 * The result is the repo's bare `YYYY-MM-DDTHH:mm:ss` wire form (`toUtcRangeParam`): it denotes UTC and
 * is converted by nothing on the way in.
 */
export function proposalExpiryParam (timeZoneId, dayKey) {
  if (!timeZoneId || typeof dayKey !== 'string') { return null; }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
  if (!match) { return null; }
  const instant = zonedMidnightToUtc(timeZoneId, Number(match[1]), Number(match[2]), Number(match[3]));
  return isNaN(instant.getTime()) ? null : toUtcRangeParam(instant);
}

// ---- the figures this file deliberately does not produce --------------------------------------
//
// Each of these is one line of arithmetic away, and each would be this surface inventing money.
//
//  • BALANCE DUE on a settlement. `EventsSettlementService.RecomputeTotal` sums the line MAGNITUDES —
//    a `DepositApplied` line and an `Invoice` line both count positive — and the service's own comment
//    says the net is "a presentation concern". It is not, because the wire expresses no sign
//    convention: there is no field saying which kinds subtract. `statementTotalMinor` is shown as the
//    server's figure and nothing is netted off it.
//
//  • OUTSTANDING ON A DEPOSIT (`amountMinor − refundedMinor`). The backend computes exactly this
//    internally, in `CancelAsync`, and does not expose it. Both operands are on `EventsDepositView`,
//    which is what makes it tempting. The two figures are shown side by side instead.
//
//  • A PROPOSAL'S "REAL" TOTAL. `totalMinor` is the sum of the LINE amounts only —
//    `EventsProposalDraftBuilder.TotalMinor` — while `roomFeeMinor`, `minimumSpendMinor` and
//    `depositRequiredMinor` are independent columns beside it. Adding the room fee to the total would
//    double-count it whenever the draft also carries a `RoomFee` line, which is the ordinary case.
//    Four figures, four labels, no arithmetic.
//
//  • ANY PIPELINE ROLL-UP. `EventsEventListItemView` carries no money at all, so the list shows none.

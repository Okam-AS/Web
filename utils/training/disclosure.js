// Reading the disclosure log (#17) into something a screen can render, and nothing more.
//
// WHAT THIS DELIBERATELY DOES NOT DO. It does not resolve an actor reference to a name. The server
// hands over the id its append-only ledger stores, on the stated ground that turning it into a
// colleague's name is a disclosure ABOUT THE READER that nobody authorised — so joining it against
// a roster here would put back exactly what the backend refused, one layer up and with no audit row
// to show for it. A screen may say WHO in the sense of "the same person twice" and "that was you";
// it may not say WHO in the sense of a name.
//
// THE COUNTS ARE PARSED, NOT RE-DERIVED. `payloadSnapshotJson` is the ledger's own allowlisted
// delta, verbatim. Reading two integers out of it is not a second telling of the fact; recomputing
// them from anything else would be.

import { READ_ANSWERED, READ_UNKNOWN, instantOf, stateOfError, trainingCodeOf } from '~/utils/training/journey';

/** The two events that can appear in this log. Anything else came from a newer server. */
export const DISCLOSURE_EVIDENCE_READ = 'evidence.read';
export const DISCLOSURE_LOG_READ = 'disclosure-log.read';

/**
 * The same three-state read the rest of the Training surface uses.
 *
 * An ANSWERED-and-empty log is a real fact — "nobody has looked at this record in this store" — and
 * is not the same screen as a refused or unanswered read. A 403 here means the caller is neither
 * the subject nor the store's admin; it never means the log is empty, and no caller may render it
 * that way.
 */
export function readDisclosures (payload, error) {
  if (error) {
    return {
      state: stateOfError(error),
      entries: null,
      readAsSubject: false,
      personRef: null,
      code: trainingCodeOf(error),
      asOf: null
    };
  }
  if (!payload || !Array.isArray(payload.disclosures)) {
    return { state: READ_UNKNOWN, entries: null, readAsSubject: false, personRef: null, code: null, asOf: null };
  }
  return {
    state: READ_ANSWERED,
    entries: payload.disclosures.map(disclosureRow),
    readAsSubject: payload.readAsSubject === true,
    personRef: payload.personRef || null,
    code: null,
    asOf: instantOf(payload.asOfUtc)
  };
}

/**
 * One ledger entry, rendered.
 *
 * `counts` is null for an entry whose payload could not be parsed rather than `{}`: an unreadable
 * snapshot and a snapshot that said zero are different claims, and only one of them may be printed
 * as a number.
 */
export function disclosureRow (entry) {
  const row = entry || {};
  return {
    eventType: row.eventType || null,
    actorReference: row.actorReference || null,
    actorIsSubject: row.actorIsSubject === true,
    occurredAt: instantOf(row.occurredAtUtc),
    counts: parseCounts(row.payloadSnapshotJson),
    payloadSnapshotJson: row.payloadSnapshotJson || null
  };
}

/**
 * How many distinct people appear in a log — the number a person actually wants from a screen that
 * cannot name any of them. Entries with no actor are excluded rather than counted as one unknown
 * reader, which would report a reader that may not exist.
 */
export function distinctReaders (entries) {
  const seen = [];
  (entries || []).forEach((entry) => {
    const actor = entry && entry.actorReference;
    if (actor && !seen.includes(actor)) { seen.push(actor); }
  });
  return seen.length;
}

function parseCounts (snapshot) {
  if (!snapshot) { return null; }
  let parsed;
  try {
    parsed = JSON.parse(snapshot);
  } catch (error) {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') { return null; }
  return {
    completions: intOrNull(parsed.disclosedCompletions),
    certificates: intOrNull(parsed.disclosedCertificates),
    disclosures: intOrNull(parsed.disclosedDisclosures)
  };
}

// The ledger stores every delta value as a STRING (the semantic-delta contract is field -> string),
// so a numeric zero and a missing key both have to survive the round trip distinctly.
function intOrNull (value) {
  if (value === null || value === undefined || value === '') { return null; }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

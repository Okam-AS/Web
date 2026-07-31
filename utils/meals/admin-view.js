// The view model behind the Company Meals SETUP surface: four company-scoped reads plus the venue's
// own directory in, one shape out.
//
// It is pure — no fetching, no Vue, no formatting — so every distinction it draws is unit-testable
// without a network and without a DOM. The page owns WHEN to read; this owns WHAT the answers mean.
//
// THE THREE-STATE RULE is `utils/meals/store-view.js`'s, imported rather than restated:
//
//   unknown — the read did not answer. Nothing may be said about what the company has.
//   loaded  — the read answered. Its row count is then a FACT, zero included.
//   ...and a loaded-but-empty list is a positive claim ("this company has invited nobody"), which is
//      why it is never the fallback for a failure.
//
// THERE IS NO "LIST COMPANIES" ENDPOINT, and that shapes the whole page. The module exposes exactly
// two ways to reach a company account: the venue's own directory (`GET /v1/stores/{id}/meals/
// companies` — only companies that already have an agreement AT THIS STORE) and a read by id. So the
// picker is the directory plus whatever this browser session has just created, and a company created
// in an earlier session with no agreement yet is reachable only by its id. That gap is the page's to
// state, not to paper over.

import { DATA_LOADED, DATA_UNKNOWN } from '~/utils/meals/store-view';

export { DATA_LOADED, DATA_UNKNOWN };

/** Bit 0 = Monday … bit 6 = Sunday, matching `MealsPolicyVersion.EligibleWeekdaysMask` (0..127). */
export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const MINUTES_IN_DAY = 1440;
const CLOCK = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

function text (value) {
  return typeof value === 'string' && value.length ? value : null;
}

function count (value) {
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * One selectable company account.
 *
 * `source` is either a directory entry (`MealsCompanyDirectoryEntry` — carries the corridor) or a
 * company projection (`MealsCompanyModel` — carries no corridor at all, because a company that has
 * just been created has none). The two are merged into one row shape so the picker does not have to
 * know which read a company came from, and `hasCorridorHere` records the difference rather than
 * hiding it: a company with no agreement at this store cannot yet carry a programme.
 */
function companyOption (source) {
  const s = source || {};
  const displayName = text(s.displayName);
  const legalName = text(s.legalName);
  return {
    companyId: text(s.companyId),
    label: displayName || legalName,
    secondaryName: displayName && legalName && displayName !== legalName ? legalName : null,
    organizationNumber: text(s.organizationNumber),
    // The directory calls it `companyStatus`; the company projection calls it `status`. Both are
    // read rather than one being assumed, so neither read silently produces a blank badge.
    companyStatus: text(s.companyStatus) || text(s.status),
    agreementId: text(s.agreementId),
    agreementStatus: text(s.agreementStatus),
    currency: text(s.currency),
    activeMemberCount: count(s.activeMemberCount),
    hasCorridorHere: !!text(s.agreementId)
  };
}

/**
 * One programme, with the two facts a policy version needs: the corridor currency it MUST be issued
 * in, and the version number it must claim to supersede.
 *
 * `expectedCurrentVersion` is `currentPolicyVersion ?? 0` — the contract's own convention for "this
 * programme has no policy yet" (`CreateMealsPolicyVersionRequest.ExpectedCurrentVersion`). It is
 * derived here rather than at the form so the one place that decides it is testable.
 */
function programRow (source) {
  const s = source || {};
  const currentPolicyVersion = Number.isSafeInteger(s.currentPolicyVersion) ? s.currentPolicyVersion : null;
  return {
    programId: text(s.programId),
    agreementId: text(s.agreementId),
    storeId: Number.isSafeInteger(s.storeId) ? s.storeId : null,
    currency: text(s.currency),
    name: text(s.name),
    status: text(s.status),
    currentPolicyVersion,
    expectedCurrentVersion: currentPolicyVersion === null ? 0 : currentPolicyVersion,
    enrolledMemberCount: count(s.enrolledMemberCount),
    revision: text(s.revision)
  };
}

/**
 * One invitation. The token is NEVER here: only the create response carries it, once
 * (`MealsInvitationCreatedModel.Token`), and no read can produce it again.
 *
 * `expiresAtUtc` is copied as the raw wire string rather than parsed into a `Date`. Meals serialises
 * `datetime2` columns bare — no `Z`, no offset — so `new Date(iso)` reads them as browser-local wall
 * clock, which is the defect `utils/meals/store-view.js` documents. The component that renders this
 * puts it through `parseApiInstant`, the one parser that handles the bare form.
 */
function invitationRow (source) {
  const s = source || {};
  return {
    invitationId: text(s.invitationId),
    intendedContactEmail: text(s.intendedContactEmail),
    intendedContactPhone: text(s.intendedContactPhone),
    intendedRole: text(s.intendedRole),
    state: text(s.state),
    expiresAtUtc: text(s.expiresAtUtc),
    revision: text(s.revision),
    // Only a Pending invitation can be revoked; a Claimed one is refused by the server because its
    // membership already exists. Computed here so no component decides it a second time.
    isRevocable: text(s.state) === 'Pending'
  };
}

/**
 * One membership.
 *
 * `applicationUserId` is the whole of the identity this module holds — it owns no identity display
 * and resolves no names (spec §7). That is not a rendering inconvenience: `MealsStatementService`
 * writes `MemberDisplayRef = MembershipId.ToString()` onto every statement line, so the bare
 * identifier is what an accountant reconciling a company's monthly bill actually sees. Ledger entry
 * MIG-17 is the fix and it has not landed; see `MealsPeoplePanel.vue` for what the screen owes
 * somebody about to issue an invitation.
 */
function memberRow (source) {
  const s = source || {};
  return {
    membershipId: text(s.membershipId),
    applicationUserId: text(s.applicationUserId),
    role: text(s.role),
    state: text(s.state),
    claimedFromInvitationId: text(s.claimedFromInvitationId),
    revision: text(s.revision)
  };
}

/** A read that answered with a bare array, or UNKNOWN. Never an empty list standing in for a failure. */
function listSection (payload, refusal, project) {
  const answered = Array.isArray(payload);
  return {
    state: answered ? DATA_LOADED : DATA_UNKNOWN,
    refusal: refusal || null,
    rows: answered ? payload.map(project) : [],
    isEmpty: answered && payload.length === 0
  };
}

/**
 * The concierge's Meals view.
 *
 * The reads are independent and fail independently: a programmes read that 403s must not turn a
 * company whose invitations were read successfully into a company with no invitations.
 *
 * @param {Array|null}  input.directory        the store directory body, or null
 * @param {string|null} input.directoryRefusal a `REFUSAL_*`, or null
 * @param {Array}       input.sessionCompanies companies created in this browser session
 * @param {object|null} input.company          the selected company's own projection, or null
 * @param {string|null} input.companyRefusal   a `REFUSAL_*`, or null
 * @param {Array|null}  input.programs         the programmes body, or null
 * @param {Array|null}  input.invitations      the invitations body, or null
 * @param {Array|null}  input.members          the memberships body, or null
 * @param {string|null} input.selectedCompanyId
 */
export function buildAdminView (input) {
  const src = input || {};

  const directoryAnswered = Array.isArray(src.directory);
  const fromDirectory = directoryAnswered ? src.directory.map(companyOption) : [];

  // Session-created companies are merged in rather than appended blindly: signing a corridor for one
  // of them makes it appear in the NEXT directory read too, and a company listed twice in a picker
  // is a picker nobody trusts. The directory wins on the overlap because it is the server's answer;
  // the session entry is only ever a stand-in for a company the directory cannot yet know about.
  const inDirectory = new Set(fromDirectory.map(row => row.companyId).filter(Boolean));
  const known = new Set(inDirectory);
  const fromSession = (src.sessionCompanies || [])
    .map(companyOption)
    .filter(row => row.companyId && !known.has(row.companyId));
  fromSession.forEach(row => known.add(row.companyId));

  const selectedCompanyId = text(src.selectedCompanyId);

  // A company opened by its identifier is in neither list until it has a corridor here, and without
  // this it would select nothing — which is the whole recovery path the picker's id field exists for.
  // Its own read is the authority, so it is admitted the moment that read answers.
  //
  // Only for the company that is actually SELECTED: the read belongs to that selection, and a body
  // carrying some other id is a server the client should not be quietly adding a row for.
  const readCompanyId = src.company ? text(src.company.companyId) : null;
  const fromRead = readCompanyId && readCompanyId === selectedCompanyId && !known.has(readCompanyId)
    ? [companyOption(src.company)]
    : [];

  const options = fromDirectory.concat(fromSession, fromRead);
  const selected = options.find(row => row.companyId === selectedCompanyId) || null;

  return {
    companies: {
      // UNKNOWN only when the directory did not answer AND this session has created nothing: a
      // company created a moment ago is a fact regardless of what the directory did.
      state: directoryAnswered || fromSession.length ? DATA_LOADED : DATA_UNKNOWN,
      refusal: src.directoryRefusal || null,
      rows: options.map(row => Object.assign({}, row, { isSelected: !!selectedCompanyId && row.companyId === selectedCompanyId })),
      isEmpty: directoryAnswered && options.length === 0,
      // The offered companies the venue directory does NOT contain — created a moment ago, or opened
      // by identifier. Surfaced rather than blended in: they are the rows that disappear from this
      // picker on reload, because the directory is the only list there is.
      //
      // Computed only when the directory ANSWERED. While it is unknown, "not in the directory" is
      // not something anybody can say.
      unconfirmedCompanyIds: directoryAnswered
        ? options.filter(row => row.companyId && !inDirectory.has(row.companyId)).map(row => row.companyId)
        : []
    },
    selected,
    company: {
      state: src.company ? DATA_LOADED : DATA_UNKNOWN,
      refusal: src.companyRefusal || null,
      row: src.company ? companyDetail(src.company) : null
    },
    programs: listSection(src.programs, src.programsRefusal, programRow),
    invitations: listSection(src.invitations, src.invitationsRefusal, invitationRow),
    members: listSection(src.members, src.membersRefusal, memberRow)
  };
}

/**
 * The selected company as the edit form needs it — including `revision`, which is not decoration:
 * the update route compares and swaps against it, and a client that does not hold one it actually
 * read has no business submitting an edit.
 */
function companyDetail (source) {
  const s = source || {};
  return {
    companyId: text(s.companyId),
    organizationNumber: text(s.organizationNumber),
    countryCode: text(s.countryCode),
    legalName: text(s.legalName),
    displayName: text(s.displayName),
    billingContactName: text(s.billingContactName),
    billingContactEmail: text(s.billingContactEmail),
    billingContactPhone: text(s.billingContactPhone),
    status: text(s.status),
    revision: text(s.revision)
  };
}

// ---- Policy window helpers -----------------------------------------------------------------------
//
// A policy version states WHEN its allowance may be spent, as a weekday bitmask plus a
// minutes-from-midnight window evaluated in an IANA zone. None of that is a shape a form can hold,
// so the conversions live here where they can be proved rather than inside a component.

/** `[true,…]` in Monday-first order → the 0..127 bitmask the wire takes. */
export function weekdayMaskFrom (flags) {
  const source = flags || {};
  return WEEKDAY_KEYS.reduce((mask, key, index) => (source[key] ? mask | (1 << index) : mask), 0);
}

/** The 0..127 bitmask → `{ mon: true, … }`. Bits above Sunday are ignored rather than invented into a day. */
export function weekdayFlagsFrom (mask) {
  const value = Number.isSafeInteger(mask) ? mask : 0;
  return WEEKDAY_KEYS.reduce((flags, key, index) => {
    flags[key] = (value & (1 << index)) !== 0;
    return flags;
  }, {});
}

/**
 * `HH:MM` → minutes from midnight, or null.
 *
 * `<input type="time">` yields `HH:MM` (and `HH:MM:SS` where a step is set), so both are accepted
 * and the seconds are dropped — the wire field is whole minutes and there is nowhere to put them.
 * Anything else is null rather than a guess: a null is refused by the caller with a sentence, where
 * a silently-zero window would be a policy nobody stated.
 */
export function minutesFromClock (value) {
  const match = CLOCK.exec(String(value === null || value === undefined ? '' : value).trim());
  if (!match) { return null; }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) { return null; }
  return (hours * 60) + minutes;
}

/**
 * Minutes from midnight → `HH:MM`.
 *
 * 1440 is a legal END of a window (the server's bound is `LocalWindowEndMinutes <= 1440`) and is the
 * end of the day, not 00:00 of the next one. `<input type="time">` cannot hold it, so it renders as
 * `24:00` for display and the form keeps the number rather than round-tripping through the input.
 */
export function clockFromMinutes (value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MINUTES_IN_DAY) { return null; }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

export default buildAdminView;

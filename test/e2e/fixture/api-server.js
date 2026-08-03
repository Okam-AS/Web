// The throwaway backend the browser journeys run against.
//
// Node's `http` and nothing else — no dependency, no build step, no container. It is started by
// Playwright's `webServer` (see playwright.config.js) and the Nuxt dev server is pointed at it with
// `API_BASE_URL`, which is the ONE knob both HTTP stacks in this app read: the core services go
// through `core/helpers/configuration.ts` -> `getEnv('API_BASE_URL')`, and the workforce/events
// clients go through `utils/workforce/api-client.js` -> the same. So one origin answers everything.
//
// IT HOLDS THE CONTRACT, NOT JUST THE SHAPES. Three preconditions are enforced rather than ignored,
// because each is a claim the client code makes that no unit test can check:
//
//   • `Idempotency-Key` on every workforce mutation. Missing -> 400. The header is added by
//     `WorkforceClientBase._mutate`; if a future refactor built a header bag at a call site instead,
//     these journeys go red.
//   • `If-Match` on the batch assignment edit, compared against the CURRENT draft checksum.
//     Mismatch -> 409 `workforce.stale-revision`, the same typed problem+json the real surface
//     emits, so the page's stale-write branch is reachable from here.
//   • `Authorization: Bearer <token>` on everything except the anonymous Events routes and login.
//     Missing or unknown -> 401. That is what makes the "public journey needs no auth" claim
//     falsifiable: if the guest page ever started attaching an admin token, the fixture would not
//     refuse it, but the recorded request log in the artifact would show the header.
//
// WHAT IT DOES NOT DO: it is not a model of the backend. It holds no shift-overlap rule, no wage
// engine, no capability matrix beyond the two strings the schedule page reads. Anything a journey
// wants to be true it must seed here explicitly.

const http = require('http');
const { URL } = require('url');
const world = require('./world');
// One file per module family, for the same reason the clients are one file per controller: the two
// can be diffed by eye. Each exports `fresh()` — its slice of the reset state — and `route(ctx)`,
// which returns true when it answered and false when the path was not its business.
const marginFixture = require('./margin');
const trainingFixture = require('./training');
const mealsFixture = require('./meals');
const growthNewsletterFixture = require('./growth-newsletter');
// The Growth GUEST half, kept apart from the operator half above because the two sit on opposite
// sides of the auth wall: `growth-newsletter.js` is a StoreAdmin surface, and every route in
// `growth.js` is anonymous by contract. See where each is dispatched below.
const growthGuestFixture = require('./growth');

const PORT = Number(process.env.E2E_FIXTURE_PORT || 4010);

// ---- store-local wall clock <-> UTC ------------------------------------------------------------
//
// The batch edit sends `localStart`/`localEnd` as store-local `YYYY-MM-DDTHH:mm:ss`, and the range
// read answers `startsUtc` + `startOffsetMinutes`. Converting between them is the one piece of real
// behaviour this fixture has to get right: `utils/workforce/week-grid.js` recomputes the wall clock
// from exactly that pair, so an offset invented here would show the manager a different time than
// the one they typed — and the journey would catch it, which is why it is done properly.

function zoneOffsetMinutesAt (zone, ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(new Date(ms)).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  );
  return (asUtc - ms) / 60000;
}

/** Store-local `YYYY-MM-DDTHH:mm:ss` -> `{ startsUtc, offsetMinutes }`. Two passes settle DST. */
function localToUtc (zone, localStamp) {
  const naive = Date.parse(localStamp + 'Z');
  let ms = naive;
  for (let i = 0; i < 2; i++) {
    ms = naive - zoneOffsetMinutesAt(zone, ms) * 60000;
  }
  return { utc: new Date(ms).toISOString().slice(0, 19), offsetMinutes: zoneOffsetMinutesAt(zone, ms) };
}

const nowUtc = () => new Date().toISOString().slice(0, 19) + 'Z';

// ---- mutable state -----------------------------------------------------------------------------

function freshState () {
  return {
    // key: `${storeId}|${rangeStartUtc}` -> one revision. The real surface resolves a range to a
    // single revision, so one per week window is the same relationship.
    revisions: {},
    // Every proposal token's answer, cloned from the world so an accept in one journey cannot be
    // seen by another.
    proposals: JSON.parse(JSON.stringify(world.PROPOSALS)),
    acceptances: {},
    // The shared per-store feature-flag OVERRIDE store: `${storeId}|${flagKey}` -> one row. Empty on
    // purpose. Every module flag is deny-closed by default, and a fixture that started with them on
    // would hide the one fact this whole surface exists for — that a store which has not had a
    // switch flipped cannot write through the module it gates.
    flags: {},
    // The venue's privacy queue, cloned from the world so a resolution in one journey cannot be seen
    // by another. Mutable: `POST .../resolution` rewrites the row's state, resolvedAt and notice
    // receipt in place, which is what makes the queue a queue rather than a table.
    privacyRequests: world.growthPrivacyRequests(),
    // THE MUTABLE HALF OF AN ACCOUNT: `userId -> { email, emailConfirmed }`, empty until something
    // writes one, and overlaid on the world's user by `userForToken`.
    //
    // It lives in `state` rather than on `world.USERS` because the world is a module-level constant
    // — a confirmation written into it would survive `/__fixture/reset` and every later journey
    // would start from an account a previous journey had confirmed. That is the exact shape of flake
    // that reads as a product defect: the second run of the suite passes a step the first run earned.
    accounts: {},
    // What the confirmation mails WOULD have been, if anything in this process sent mail. A journey
    // reads its own code from here the way a person reads it from their inbox — see
    // `/__fixture/confirmation-code` below for why it is not simply asserted.
    confirmationMails: [],
    seq: 0,
    requests: [],
    // ---- the invitation surface ---------------------------------------------------------------
    //
    // `token -> { invitationId, staffMemberId, storeId, expiresAtUtc, state }`, keyed by the RAW
    // token because that is the only handle a claimant has. The real service stores a SHA-256 hash
    // and compares in constant time; hashing here would prove nothing about the CLIENT, which never
    // sees the hash — what must be enforced is the shape of the contract, not the cryptography.
    invitations: {},
    // One PENDING invitation per engagement, mirroring the filtered unique index: a reissue
    // supersedes in place and the previous raw token dies immediately. Without this the fixture
    // would accept an old token after a reissue and the page's "the previous code stops working"
    // sentence would be untested prose.
    pendingByStaff: {},
    // `userId -> [staffMemberId]`. The claim's whole effect. Seeded so the OTHER journeys keep the
    // world they were written against, and so the onboarding journey's account starts with nothing.
    claims: { 'user-worker': ['staff-1'] },
    // Idempotency outcomes, per (scope, key). The claim is scoped PER USER in the real service
    // (`wf.invitation.claim.{userId}`), so one caller's key can never alias another's — modelled
    // here because the join page's whole retry story rests on a replay returning the same answer.
    idempotency: {},
    // How many requests this fixture has answered since the last reset. Read by the journey fixture
    // as a WRONG-WORLD GUARD: `reuseExistingServer` will happily adopt a dev server somebody else
    // started, and if that one was pointed at the real API every journey would run green against
    // production data while claiming to be a fixture run. A journey that produced no traffic here
    // was not talking to this fixture, and that is a failure rather than a fast pass.
    served: 0,

    // Each module family owns its own slice, so a journey in one cannot see another's writes and a
    // reset cannot half-clear anything.
    margin: marginFixture.fresh(),
    training: trainingFixture.fresh(),
    meals: mealsFixture.fresh(),
    growthNewsletter: growthNewsletterFixture.fresh(),
    growth: growthGuestFixture.fresh()
  };
}

let state = freshState();

function nextId (prefix) {
  state.seq += 1;
  return prefix + '-' + state.seq;
}

// ---- responses ---------------------------------------------------------------------------------

function send (res, status, body, extraHeaders) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    // Deliberately NOT exposing ETag: the real API's CORS policy does not, which is precisely why
    // `WorkforceScheduleService` reads the checksum off the response BODY. Withholding it here keeps
    // that constraint real instead of letting a future client start reading the header and pass.
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Idempotency-Key, If-Match, ClientPlatform, Language, ClientAppVersion, ClientFeatures, SelectedTheme',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Cache-Control': 'no-store'
  }, extraHeaders || {}));
  res.end(payload);
}

/**
 * A non-JSON body, for the one route that has one.
 *
 * `GET /margin/statements/{id}/export` answers `text/csv`; served as JSON it would download a quoted
 * string and the page's own `Content-Type` check would be the thing under test rather than the export.
 */
function sendText (res, status, text, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

/** RFC 9457 problem+json in the shape `WorkforceApiError` / `EventsApiError` parse. */
function problem (res, status, code, detail, extra) {
  send(res, status, Object.assign({
    type: 'https://okam.test/problems/' + code,
    title: code,
    status,
    code,
    detail
  }, extra || {}));
}

/**
 * The single refusal every Events gate collapses to.
 *
 * 404 and not 403, and the same 404 for all three `Events.*` flags: `EventsProblemException.Disabled()`
 * carries `EVENTS_DISABLED` and NOTHING that says which switch is down, so a client cannot tell "the
 * module is off for this store" from "the settlement flag is off" from "no such store". That is the
 * opposite of the workforce refusal, which names its flag on a `flag` extension — and it is why an
 * Events journey cannot render "pull this lever" the way the schedule page can. Reproduced faithfully
 * rather than improved, because a fixture that added the key would make a page that reads it pass here
 * and fail against the real API.
 */
function eventsDisabled (res) {
  return problem(res, 404, 'EVENTS_DISABLED', 'Events is not enabled for this store.');
}

/**
 * The Growth error envelope, which is NOT problem+json.
 *
 * `Models/Growth/GrowthErrorEnvelope.cs` pins `{ "error": { code, message, traceId } }` while every
 * Workforce and Events surface answers RFC 9457 with a top-level `code`. `GrowthApiError` reads
 * `body.error.code`, so a fixture that reused `problem()` here would hand the page `code: null` for
 * every Growth refusal — and the page keys its sentences on the code, so all of them would collapse
 * into the generic one. The two envelopes are modelled separately for the same reason the client has
 * two error types.
 *
 * `Referrer-Policy: no-referrer` rides along because `ApplySensitiveResponseHeaders` stamps it on
 * every Growth response that reflects consent state, refusals included.
 */
function growthError (res, status, code, message) {
  send(res, status, {
    error: { code, message, traceId: 'fixture-' + Date.now() }
  }, { 'Referrer-Policy': 'no-referrer' });
}

/** A Growth 200, with the sensitive-response headers the real surface stamps. */
function growthOk (res, body) {
  send(res, 200, body, { 'Referrer-Policy': 'no-referrer' });
}

/**
 * The concealment refusal every Growth admin route collapses to.
 *
 * 404 and never 403, and the SAME 404 for a store that does not exist and one the caller does not
 * administer — `GrowthControllerBase.ResolveStoreAdminAsync` returns false for both and every action
 * answers `GrowthApiException.NotFound()`. That is the opposite of the feature-flag controller
 * beside it, which answers 403; reproducing the difference matters because the privacy page's
 * blocker branch is written against the 404 and would never be reached if this said 403.
 */
function growthNotFound (res) {
  return growthError(res, 404, 'growth.not_found', 'Not found.');
}

/**
 * The art. 12 deadline the real endpoint answers with — `GrowthPrivacyObligation.DueAt`, one CALENDAR
 * month from receipt clamped to the last day of the target month (Reg. 1182/71 art. 3(2)(c)).
 *
 * Reproduced here because this fixture stands in for the server and the page no longer works this out
 * for itself; a fixture that omitted `dueAt` would darken the whole deadline column and the journey
 * would be asserting against a response the real endpoint does not send. It is NOT a second copy of
 * product logic — nothing outside this fake reads it.
 */
function privacyDueAt (receivedAt) {
  const received = new Date(receivedAt);
  const month = received.getUTCMonth();
  const due = new Date(Date.UTC(
    received.getUTCFullYear(), month + 1, received.getUTCDate(),
    received.getUTCHours(), received.getUTCMinutes(), received.getUTCSeconds(), received.getUTCMilliseconds()
  ));
  if (due.getUTCMonth() !== (month + 1) % 12) { due.setUTCDate(0); }
  return due.toISOString();
}

/** Is the request still owed an answer? The two non-terminal `GrowthPrivacyRequestState` members. */
function privacyIsOpen (row) {
  return row.state === 'Received' || row.state === 'InProgress';
}

/**
 * Endpoint 21's projection (`GrowthPrivacyRequestResponse`), without the fixture's own `storeId`
 * bookkeeping field.
 */
function privacyRequestItem (row) {
  return {
    requestId: row.requestId,
    // MASKED — the internal contact id and never an address (spec §3 invariant 11). There is no
    // address anywhere in this fixture's privacy world, so a page that started printing one would
    // have had to invent it.
    contactPointId: row.contactPointId,
    requestType: row.requestType,
    state: row.state,
    receivedAt: row.receivedAt,
    resolvedAt: row.resolvedAt,
    noticeDelivery: row.noticeDelivery
  };
}

/**
 * Endpoint 20's projection (`GrowthPrivacyRequestListItem`).
 *
 * It is the LIST item and only the list item that carries `dueAt`: the deadline is what the venue's
 * queue is ordered and drawn by, and endpoint 21's response is a different DTO that does not answer
 * with one. Serving it from both would let a page come to depend on a field the real resolution
 * route does not send.
 */
function privacyItem (row) {
  return Object.assign(privacyRequestItem(row), { dueAt: privacyDueAt(row.receivedAt) });
}

// ---- workforce documents -----------------------------------------------------------------------

function costFor (revision) {
  const priced = revision.assignments.filter(a => a.staffMemberId);
  const open = revision.assignments.filter(a => !a.staffMemberId);

  const byDay = {};
  for (const assignment of revision.assignments) {
    const key = assignment.localBusinessDate;
    if (!byDay[key]) { byDay[key] = []; }
    byDay[key].push(assignment);
  }

  // A flat 250,00 kr per staffed shift. It is a number, not an estimate of anything — the journeys
  // assert that a figure appears and that its currency is the store's, never its value.
  const shiftMinor = 25000;

  return {
    costComplete: true,
    totalMinor: priced.length * shiftMinor,
    currency: world.CURRENCY,
    incompleteCode: null,
    incompleteDetail: null,
    pricedShiftCount: priced.length,
    unpricedShiftCount: 0,
    openShiftCount: open.length,
    openShiftMinutes: 0,
    basis: { basis: 'base-rate', supplementsIncluded: false },
    days: Object.keys(byDay).map(dayKey => ({
      localBusinessDate: dayKey,
      costComplete: true,
      totalMinor: byDay[dayKey].filter(a => a.staffMemberId).length * shiftMinor,
      currency: world.CURRENCY,
      pricedShiftCount: byDay[dayKey].filter(a => a.staffMemberId).length,
      unpricedShiftCount: 0,
      openShiftCount: byDay[dayKey].filter(a => !a.staffMemberId).length,
      openShiftMinutes: 0,
      shifts: byDay[dayKey].map(a => ({
        shiftAssignmentId: a.shiftAssignmentId,
        isOpenShift: !a.staffMemberId,
        costComplete: !!a.staffMemberId,
        totalMinor: a.staffMemberId ? shiftMinor : null,
        currency: world.CURRENCY,
        refusalCode: null,
        refusalDetail: null
      }))
    }))
  };
}

function rangeDocument (revision, view) {
  // No revision resolves for this window+view. NOT an empty week: `resolveDataState` reads the
  // missing `scheduleRevisionId` as "no plan", which is the state that offers "Lag utkast".
  if (!revision || (view === 'published' && revision.publicationNumber === null)) {
    return {
      scheduleRevisionId: null,
      eTag: 'no-revision',
      state: null,
      view,
      revisionNumber: null,
      publicationNumber: null,
      timeZoneId: world.TIME_ZONE,
      asOfUtc: nowUtc(),
      assignments: [],
      cost: null
    };
  }

  return {
    scheduleRevisionId: revision.scheduleRevisionId,
    // The wire name is `eTag` (Newtonsoft camel-cases `ETag` to it). Spelled the way the server
    // spells it so `readETag`'s primary branch is the one under test.
    eTag: revision.eTag,
    state: revision.state,
    view,
    revisionNumber: revision.revisionNumber,
    publicationNumber: revision.publicationNumber,
    timeZoneId: world.TIME_ZONE,
    asOfUtc: nowUtc(),
    assignments: revision.assignments.slice(),
    cost: costFor(revision)
  };
}

// ---- the shared per-store feature-flag store ---------------------------------------------------
//
// Three routes on ONE controller that owns the flags of all six modules. The fixture holds the two
// rules that make the surface what it is, because both are claims the operator screen relies on:
//
//   • DENY-CLOSED WRITES. `Set` and `Clear` look the key up in the catalog first and answer 400
//     `{ message: "Unknown feature flag: …" }` for anything it does not carry. That is what makes a
//     WITHHELD flag unwritable as well as un-togglable.
//   • CONCEALMENT. Every store-scoped action answers 403 — never 404 — for a caller who is not a
//     StoreAdmin of the target store, so the API never leaks whether the store exists. The page has
//     one sentence for both meanings, and this is what keeps it honest.
//
// WHAT IT DOES NOT MODEL: `IStoreFeatureFlagEffectiveResolver`. Two modules register one (Workforce
// for `workforce.module`, Margin for its family) so that `effective` reflects a data probe or a
// config master rather than the advertised default. No flag these journeys touch has a resolver, so
// `effective` here is the plain `override ?? default` the controller falls back to. A fixture that
// invented resolver behaviour would be asserting our guess about the backend, not the backend.

function flagDescriptor (flagKey) {
  return world.FEATURE_FLAG_CATALOG.find(entry => entry.flagKey === flagKey) || null;
}

function flagRow (storeId, flagKey) {
  return state.flags[storeId + '|' + flagKey] || null;
}

/** The value the module's gate resolves: the override when there is one, otherwise the default. */
function flagEffective (storeId, flagKey) {
  const row = flagRow(storeId, flagKey);
  if (row) { return row.enabled; }
  const descriptor = flagDescriptor(flagKey);
  return !!(descriptor && descriptor.defaultEnabled);
}

/** One flag as `StoreFeatureFlagState` — the shape `GET`/`PUT` both answer in. */
function flagState (storeId, descriptor) {
  const row = flagRow(storeId, descriptor.flagKey);
  return {
    flagKey: descriptor.flagKey,
    module: descriptor.module,
    title: descriptor.title,
    defaultEnabled: descriptor.defaultEnabled,
    isOverridden: !!row,
    overrideEnabled: !!row && row.enabled,
    effective: flagEffective(storeId, descriptor.flagKey),
    updatedByReference: row ? row.updatedByReference : null,
    updatedAtUtc: row ? row.updatedAtUtc : null,
    note: row ? row.note : null
  };
}

function bumpETag (revision) {
  revision.eTag = 'etag-' + revision.scheduleRevisionId + '-' + (++revision.version);
}

function applyBatch (revision, items) {
  for (const item of items || []) {
    if (item.delete) {
      revision.assignments = revision.assignments.filter(a => a.shiftAssignmentId !== item.shiftAssignmentId);
      continue;
    }

    const start = localToUtc(world.TIME_ZONE, item.localStart);
    const end = localToUtc(world.TIME_ZONE, item.localEnd);
    const role = world.ROLES.find(r => r.roleId === item.roleId) || null;
    const staff = world.STAFF.find(s => s.staffMemberId === item.staffMemberId) || null;

    const assignment = {
      shiftAssignmentId: item.shiftAssignmentId || nextId('shift'),
      // The BUSINESS date is the date part of the local START — an overnight shift belongs to the
      // evening it began. The grid buckets on this and never re-derives it from `startsUtc`.
      localBusinessDate: String(item.localStart).slice(0, 10),
      startsUtc: start.utc,
      endsUtc: end.utc,
      startOffsetMinutes: start.offsetMinutes,
      endOffsetMinutes: end.offsetMinutes,
      staffMemberId: item.staffMemberId || null,
      staffDisplayName: staff ? staff.displayName : null,
      roleId: item.roleId || null,
      roleName: role ? role.name : null,
      isOpenShift: !item.staffMemberId,
      paidBreakMinutes: item.paidBreakMinutes || 0,
      unpaidBreakMinutes: item.unpaidBreakMinutes || 0,
      note: item.note || null,
      state: 'Planned'
    };

    const existing = revision.assignments.findIndex(a => a.shiftAssignmentId === assignment.shiftAssignmentId);
    if (existing >= 0) { revision.assignments[existing] = assignment; } else { revision.assignments.push(assignment); }
  }

  // An edit sends a Validated revision back to Draft — the rule the page mirrors by dropping the
  // validation receipt and closing the publish button.
  if (revision.state === 'Validated') { revision.state = 'Draft'; }
  bumpETag(revision);
}

// ---- request plumbing --------------------------------------------------------------------------

function readBody (req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) { return resolve(null); }
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({ _unparsed: raw }); }
    });
  });
}

function bearer (req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * The caller behind a bearer token, with anything a journey has since written to their account
 * overlaid on top.
 *
 * The overlay is the whole reason this is not a plain lookup. `world.USERS` describes the account as
 * it was CREATED; `state.accounts` describes what confirming an address did to it. Every reader of a
 * caller — `GET /user`, and the Growth test-send guard through `ctx.caller` — has to see the same
 * merged answer, or the page would report an address as confirmed while the guard still refused it.
 */
function userForToken (token) {
  const user = Object.values(world.USERS).find(u => u.token === token) || null;
  if (!user) { return null; }
  const overlay = state.accounts[user.id];
  return overlay ? Object.assign({}, user, overlay) : user;
}

/** The user payload `GET /user` answers: everything except the token, which the app re-stamps. */
function userPayload (user) {
  const copy = Object.assign({}, user);
  delete copy.token;
  return copy;
}

// ---- routing -----------------------------------------------------------------------------------

/**
 * What a module fixture is handed. Everything it needs and no access to this file's internals.
 *
 * `flagEffective` is on it DELIBERATELY and is the reason these modules can be honest about their
 * gates: the per-store override store lives here, is written by the operator switchboard's `PUT`, and
 * is the same map `flagState` reports. A module that resolved its own flags would be answering about
 * a world the switchboard cannot move, which is precisely the defect that made six journeys green
 * against stores no venue is.
 */
function context (req, res, url, path, body, caller) {
  return {
    req,
    res,
    url,
    path,
    method: req.method,
    body,
    caller,
    state,
    flagEffective,
    send: (status, payload, headers) => send(res, status, payload, headers),
    sendText: (status, text, contentType) => sendText(res, status, text, contentType),
    problem: (status, code, detail, extra) => problem(res, status, code, detail, extra)
  };
}

const WORKFORCE_STORE = /^\/workforce\/stores\/([^/]+)(\/.*)?$/;

async function route (req, res, url) {
  const path = url.pathname;
  // The same path with any trailing slash removed, for the routes whose CLIENT sends one. Kept as a
  // second name rather than applied to `path` itself, so every existing route keeps matching the
  // exact string it always matched and this cannot quietly widen forty of them.
  const unslashed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const body = (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')
    ? await readBody(req)
    : null;

  // ---- the fixture's own control surface -------------------------------------------------------
  if (path === '/__fixture/reset' && req.method === 'POST') {
    state = freshState();
    return send(res, 200, { ok: true });
  }
  if (path === '/__fixture/health') {
    return send(res, 200, { ok: true, port: PORT });
  }
  if (path === '/__fixture/stats') {
    return send(res, 200, { served: state.served });
  }
  // THE JOURNEY'S MAILBOX, and the reason it is a control-surface route rather than an assertion.
  //
  // A confirmation code arrives by mail. There is no mail here, so the journey has to read the code
  // from somewhere — but it must read it as a RECIPIENT does, not derive it. So this answers what
  // was ordered for one address and nothing else: the journey learns the six digits it would have
  // read in its inbox and learns nothing about whether the code is correct, which is the fact the
  // product is supposed to establish.
  //
  // It is on the `/__fixture` control surface, which means it is NOT counted in `served` and is not
  // routed for any caller — a journey fetches it from Node, never through the browser, so the code
  // never enters page state, never appears in `backendSample`, and cannot reach the artifact (C7).
  if (path === '/__fixture/confirmation-code') {
    const forAddress = (url.searchParams.get('address') || '').trim().toLowerCase();
    const mails = state.confirmationMails.filter(m => m.to === forAddress);
    const latest = mails.length ? mails[mails.length - 1] : null;
    return send(res, 200, { code: latest ? latest.code : null, ordered: mails.length });
  }

  state.served += 1;

  // ---- auth ------------------------------------------------------------------------------------
  if (path === '/user/sendverificationtoken' && req.method === 'POST') {
    // `RequestService.TryParseResponse` accepts status 200 only, and the modal reads the body as a
    // boolean. Anything else silently strands the login on the phone step.
    return send(res, 200, true);
  }

  if (path === '/user/login' && req.method === 'POST') {
    const user = world.USERS[(body && body.phoneNumber) || ''];
    if (!user || !body || body.token !== world.OTP) {
      return problem(res, 401, 'AUTH_INVALID_CODE', 'Wrong phone number or code.');
    }
    return send(res, 200, user);
  }

  if (path === '/user' && req.method === 'GET') {
    const user = userForToken(bearer(req));
    if (!user) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }
    return send(res, 200, userPayload(user));
  }

  // ---- the account's own address, and the confirmation of it -----------------------------------
  //
  // Modelled on `UserService.SendEmailConfirmationCodeAsync` / `ConfirmEmailAsync`, because these two
  // routes are what makes the Growth test-send refusal a door rather than a wall. Both answer a bare
  // boolean: `RequestService.TryParseResponse` accepts status 200 only and `core/services/user-service`
  // reads the body as a boolean, so any other shape strands the page silently.
  // MATCHED WITH AND WITHOUT THE TRAILING SLASH, which is not pedantry. `core/services/user-service.ts`
  // used to post `/user/send-email-confirmation-code/` and `/user/confirm-email/` — both WITH one,
  // against a `UserController` that declares them bare — while ASP.NET's attribute routing matches
  // either form, so the real API never noticed. This fixture could tell the difference: matching only
  // the bare path answered 404 to the shipped client, and the page then reported "we could not order
  // a code" against a backend that was fine. Found by the browser journey; no mocked-service unit
  // test can see it, because every such test stubs the service and never reads the string it posts.
  //
  // The client now writes both paths bare, and `test/core-request-path-shape.test.js` reds if any
  // request path in `core/services` diverges from that shape again — it was not one route but
  // THIRTEEN, across seven services. The tolerance below stays anyway: a fixture pinned to one
  // spelling of a route the framework spells two ways is a fixture that can fail a working client.
  if (unslashed === '/user/send-email-confirmation-code' && req.method === 'POST') {
    const user = userForToken(bearer(req));
    if (!user) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }
    const address = String((body && body.email) || '').trim();
    if (!address) {
      // The real service treats an empty address as "clear the address", and answers true.
      state.accounts[user.id] = { email: null, emailConfirmed: false };
      return send(res, 200, true);
    }
    // SETTING THE ADDRESS UN-CONFIRMS IT, exactly as the service does. Without this an account could
    // be pointed at a new mailbox while keeping a confirmation earned by the old one — which is the
    // whole thing the Growth guard leans on.
    const code = String(100000 + (state.confirmationMails.length * 7919) % 899999);
    state.accounts[user.id] = { email: address, emailConfirmed: false };
    state.confirmationMails.push({ to: address.toLowerCase(), code });
    // The real send is fire-and-forget: the service hands the mail to a task it does not await and
    // answers true whether or not the provider ever accepts it. Answering true here without having
    // proved any delivery is the same contract, which is what the page's «the code has been ordered»
    // wording is written against.
    return send(res, 200, true);
  }

  if (unslashed === '/user/confirm-email' && req.method === 'POST') {
    const user = userForToken(bearer(req));
    if (!user) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }
    const submitted = String((body && body.code) || '').trim();
    const address = user.email;
    const mails = state.confirmationMails.filter(m => m.to === String(address || '').toLowerCase());
    const outstanding = mails.length ? mails[mails.length - 1] : null;
    if (!outstanding || !submitted || submitted !== outstanding.code) {
      // FALSE, AND THE CODE SURVIVES. `ConfirmEmailAsync` clears `EmailConfirmationCode` only on
      // success — a wrong guess costs the guesser nothing, there is no attempt counter and no
      // lockout on this path. That is modelled rather than hidden, because a fixture that expired
      // the code on a wrong guess would let a screen claim a protection the product does not have.
      return send(res, 200, false);
    }
    state.accounts[user.id] = { email: address, emailConfirmed: true };
    return send(res, 200, true);
  }

  // `CultureService.GetAll`. Serves `/admin/lang`, which the scroll-lock journey uses because it is
  // the one fixture-reachable admin page that is both taller than the viewport and opens a real
  // `atoms/Modal` — see world.CULTURES.
  if (path === '/culture' && req.method === 'GET') {
    if (!userForToken(bearer(req))) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }
    return send(res, 200, world.CULTURES);
  }

  // ---- Events: anonymous. NO token is required and none is looked at. --------------------------
  const proposalRead = /^\/events\/proposals\/([^/]+)$/.exec(path);
  if (proposalRead && req.method === 'GET') {
    const token = decodeURIComponent(proposalRead[1]);
    const proposal = state.proposals[token];
    if (!proposal) {
      return problem(res, 404, 'EVENTS_PROPOSAL_NOT_FOUND', 'No sent version matches this link.');
    }
    return send(res, 200, proposal);
  }

  const proposalAccept = /^\/events\/proposals\/([^/]+)\/accept$/.exec(path);
  if (proposalAccept && req.method === 'POST') {
    const token = decodeURIComponent(proposalAccept[1]);
    const proposal = state.proposals[token];
    if (!proposal) {
      return problem(res, 404, 'EVENTS_PROPOSAL_NOT_FOUND', 'No sent version matches this link.');
    }
    if (!proposal.isActionable) {
      const code = proposal.status === 'Superseded' ? 'EVENTS_PROPOSAL_SUPERSEDED' : 'EVENTS_PROPOSAL_EXPIRED';
      return problem(res, 409, code, 'This version can no longer be accepted.');
    }
    if (state.acceptances[token]) {
      // The server replays rather than writing a second receipt (EventsWriteGuards.BuildReplay).
      return send(res, 200, state.acceptances[token]);
    }

    const receipt = {
      acceptedVersionNo: proposal.versionNo,
      acceptedAtUtc: nowUtc(),
      // Re-verified against the content the guest was shown. Echoed so the page can print it.
      proposalContentHash: proposal.contentHash,
      acceptorName: (body && body.acceptorName) || null,
      acceptorEmail: (body && body.acceptorEmail) || null
    };
    state.acceptances[token] = receipt;
    proposal.status = 'Accepted';
    proposal.isActionable = false;
    return send(res, 200, receipt);
  }

  const proposalDecline = /^\/events\/proposals\/([^/]+)\/decline$/.exec(path);
  if (proposalDecline && req.method === 'POST') {
    const token = decodeURIComponent(proposalDecline[1]);
    const proposal = state.proposals[token];
    if (!proposal) {
      return problem(res, 404, 'EVENTS_PROPOSAL_NOT_FOUND', 'No sent version matches this link.');
    }
    proposal.status = 'Declined';
    proposal.isActionable = false;
    return send(res, 200, { declinedVersionNo: proposal.versionNo, declinedAtUtc: nowUtc() });
  }

  // ---- Growth's guest surface: anonymous, and matched ABOVE the wall on purpose ----------------
  //
  // `GrowthGuestService` is constructed with an empty initializer so it CANNOT attach a bearer — a
  // venue's own staff open these links too, and a page that quietly rode their admin token would
  // answer differently for them than for the guest it was built for. Matching these routes below the
  // wall would 401 the guest and hide that property behind an auth failure. The fixture cannot prove
  // the negative for the page, so the journey reads the request headers itself.
  if (growthGuestFixture.route(context(req, res, url, path, body, null))) { return; }

  // ---- everything below is authenticated -------------------------------------------------------
  const caller = userForToken(bearer(req));
  if (!caller) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }

  // The mandatory mutation header, and WHICH surfaces demand it is itself the contract. Workforce and
  // Training both refuse a mutation without an `Idempotency-Key`
  // (`TrainingControllerBase.TryGetIdempotencyKey`). MARGIN DOES NOT, and is deliberately absent from
  // this list: it has no idempotency store, and a fixture demanding a header the server never reads
  // would make the correct client look broken — the same mistake as accepting anything, in the other
  // direction. What Margin requires instead is `If-Match`, which `fixture/margin.js` checks itself.
  if (req.method !== 'GET' && !req.headers['idempotency-key'] && path.startsWith('/workforce/')) {
    return problem(res, 400, 'workforce.idempotency-key-required',
      'Every workforce mutation must carry an Idempotency-Key.');
  }
  if (req.method !== 'GET' && !req.headers['idempotency-key'] && path.startsWith('/training/')) {
    // NO `code`, and that asymmetry is the real surface's. Training answers the missing header
    // through `ModuleProblem`, which emits a detail and a traceId and nothing else — which is why
    // `training-courses.vue` says out loud that this refusal «lands on the unknown sentence». A
    // fixture that helpfully added `training.idempotency-key-required` would let a page ship a
    // sentence keyed on a code the server never sends.
    return send(res, 400, {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Every Training mutation must carry an Idempotency-Key.',
      traceId: 'fixture-trace'
    });
  }
  // Meals demands the header on its mutations like Workforce and Training do, with ONE exemption
  // that is contract rather than convenience: `POST /v1/meals/invitations/session` is a POST only
  // because the invitation token must travel in a body rather than in a URL that lands in a proxy
  // log. It reads and writes nothing, so the server does not require a key for it, and a fixture
  // that demanded one would make the correct client look broken on the first screen of the claim.
  const MEALS_MUTATION = /^\/v1\/(meals\/|stores\/[^/]+\/meals\/)/;
  const MEALS_IDEMPOTENCY_EXEMPT = /^\/v1\/meals\/invitations\/session$/;
  if (req.method !== 'GET' && !req.headers['idempotency-key'] &&
      MEALS_MUTATION.test(path) && !MEALS_IDEMPOTENCY_EXEMPT.test(path)) {
    return problem(res, 400, 'meals.idempotency-key-required',
      'Every Meals mutation must carry an Idempotency-Key.');
  }

  // ---- the module families ---------------------------------------------------------------------
  //
  // Placed AFTER the auth wall and the header guard because every route in both is authenticated and
  // store-scoped, and BEFORE the store reads below so that a `/margin/...` path is never mistaken for
  // one. Each returns true when it answered.
  const moduleCtx = context(req, res, url, path, body, caller);
  if (marginFixture.route(moduleCtx)) { return; }
  if (trainingFixture.route(moduleCtx)) { return; }
  if (mealsFixture.route(moduleCtx)) { return; }
  if (growthNewsletterFixture.route(moduleCtx)) { return; }

  // ---- Events: the ADMIN reads the pipeline page issues -----------------------------------------
  //
  // GET only. The run-sheet print journey opens an event and prints what is already there; it writes
  // nothing, so this fixture answers the five reads `selectEvent` fans out and no mutation. A POST or
  // PUT to any of these falls through to the 404 below rather than being quietly accepted, which is
  // the honest answer for a contract this fixture does not hold.
  const eventsAdmin = /^\/events\/admin\/([^/]+)(\/.*)?$/.exec(path);
  if (eventsAdmin && req.method === 'GET') {
    const eventsStoreId = eventsAdmin[1];
    const rest = eventsAdmin[2] || '';

    // THE Events.Core STORE GATE, and it covers the READS — which is the whole difference between
    // this module and Workforce. Every store-scoped Events route resolves through
    // `IEventsModuleGate.IsStoreEnabledAsync` (`EventsController.GuardStoreAsync`,
    // `EventsRunSheetController.GuardStoreAsync`, both `AuthorizeStoreAsync` helpers), and
    // `Events.Core` is deny-closed. §9's rule for Events is INVISIBLE, not read-only: a store that
    // has not been switched on sees no pipeline, no event, no run sheet and no notification health.
    //
    // Enforced here once, before the routing below, because a fixture that gated only some of the
    // five reads would let the pipeline page ship half-lit — and because until this landed both
    // run-sheet journeys were green against a world in which every one of these reads would have
    // answered 404 on a real venue.
    if (!flagEffective(eventsStoreId, world.EVENTS_CORE_FLAG)) {
      return eventsDisabled(res);
    }

    if (rest === '/events') {
      // The page sends `status`/`from`/`to` as filters. The journey uses none of them, and a fixture
      // that silently ignored a filter it was sent would let a broken query string pass — so an
      // unsupported filter answers an empty list rather than the row.
      const status = url.searchParams.get('status');
      const rows = (status && status !== world.ADMIN_EVENT_ROW.status) ? [] : [world.ADMIN_EVENT_ROW];
      return send(res, 200, rows);
    }

    if (rest === '/notifications/health') {
      return send(res, 200, world.ADMIN_NOTIFICATION_HEALTH);
    }

    const one = /^\/events\/([^/]+)(\/.*)?$/.exec(rest);
    if (one) {
      if (String(one[1]) !== String(world.ADMIN_EVENT_ID)) {
        return problem(res, 404, 'EVENTS_NOT_FOUND', 'No event with that id in this fixture.');
      }
      const facet = one[2] || '';
      if (facet === '') { return send(res, 200, world.ADMIN_EVENT_DETAIL); }
      // Core is enough for the deposit READ: only the deposit ISSUE passes `requireDepositsFlag`, so
      // `Events.Deposits` gates minting a new obligation and never reading an existing one. Copied
      // deliberately — a fixture that also gated the read would hide a guest's paid deposit behind a
      // switch, which is the case `EventsDepositsController` says out loud it must not do.
      if (facet === '/deposits') { return send(res, 200, world.ADMIN_DEPOSITS); }
      if (facet === '/run-sheet') { return send(res, 200, world.ADMIN_RUN_SHEET); }
      if (facet === '/settlement') {
        // The one facet with a second gate. `Events.Settlement` is deny-closed and gates the GET, so
        // "Core on, settlement closed" — the ordinary state of a venue running events without the
        // money machine — answers `EVENTS_DISABLED` here rather than a document.
        if (!flagEffective(eventsStoreId, world.EVENTS_SETTLEMENT_FLAG)) { return eventsDisabled(res); }
        return send(res, 200, world.ADMIN_SETTLEMENT);
      }
    }
  }

  // ---- the store the admin landing page reads --------------------------------------------------
  //
  // Neither of these is on a journey's critical path: they are what `/admin` itself fetches while
  // the login redirect is in flight. They are answered anyway, because an unrouted 404 lands in the
  // artifact's `failedRequests` and would read as a product defect rather than as a gap in this
  // fixture — and a noisy artifact is one nobody reads.
  const storeRead = /^\/stores\/(\d+)$/.exec(path);
  if (storeRead && req.method === 'GET') {
    return send(res, 200, {
      id: Number(storeRead[1]),
      name: world.STORE_NAME,
      currencyCode: world.CURRENCY,
      countryCode: 'NO',
      statusMessage: '',
      openingHours: [],
      address: { fullAddress: 'Storgata 1', zipCode: '0155', city: 'Oslo' }
    });
  }
  // ---- the ongoing-orders board ----------------------------------------------------------------
  //
  // `OrderService.GetAllOngoing()` — the one call `/admin/ongoing` makes, and the reason that page is
  // reachable from this fixture at all. It is READ-ONLY here: the journey that uses it opens and
  // closes modals and never advances an order, so there is no state machine to model and pretending
  // otherwise would be a fixture claiming rules it does not hold.
  if (path === '/orders/ongoing' && req.method === 'GET') {
    return send(res, 200, world.ONGOING_ORDERS);
  }

  // What `CustomerInfoModal` fetches on mount. Answered rather than left to 404 for the reason the
  // store reads above are: an unrouted request lands in the artifact's `failedRequests` and reads as
  // a product defect, and a noisy artifact is one nobody reads.
  const userForStore = /^\/user\/(\d+)\/([^/]+)$/.exec(path);
  if (userForStore && req.method === 'GET') {
    const guest = world.ONGOING_ORDERS.find(order => order.userId === userForStore[2]);
    return send(res, 200, {
      id: userForStore[2],
      firstName: guest ? guest.userFullName.split(' ')[0] : 'Ukjent',
      lastName: guest ? guest.userFullName.split(' ').slice(1).join(' ') : '',
      phoneNumber: guest ? guest.user.phoneNumber : '',
      email: 'gjest@example.test',
      data: [
        { key: 'Kunde siden', value: '2025-03-04' },
        { key: 'Sist bestilt', value: '2026-07-31' },
        { key: 'Antall bestillinger', value: '7' }
      ]
    });
  }
  const rewardCards = /^\/rewards\/members\/(\d+)\/([^/]+)$/.exec(path);
  if (rewardCards && req.method === 'GET') {
    return send(res, 200, []);
  }

  const specialHours = /^\/stores\/(\d+)\/specialopeninghours$/.exec(path);
  if (specialHours && req.method === 'GET') {
    return send(res, 200, []);
  }
  // ---- the shared feature-flag surface ---------------------------------------------------------
  //
  // The catalog admits ANY authenticated caller — it carries no store and no state, only the set of
  // keys the write side will accept.
  if (path === '/feature-flags/catalog' && req.method === 'GET') {
    return send(res, 200, world.FEATURE_FLAG_CATALOG.map(entry => ({
      flagKey: entry.flagKey,
      module: entry.module,
      title: entry.title,
      defaultEnabled: entry.defaultEnabled
    })));
  }

  const storeFlags = /^\/stores\/(\d+)\/feature-flags$/.exec(path);
  if (storeFlags) {
    const flagStoreId = storeFlags[1];
    // 403 and never 404, for a non-admin AND for a store that does not exist: the API answers the
    // same refusal to both so that neither can be told apart from the other.
    if (!(caller.adminIn || []).some(s => String(s.id) === String(flagStoreId))) {
      return problem(res, 403, 'FORBIDDEN', 'Not a store admin of this store.');
    }

    if (req.method === 'GET') {
      return send(res, 200, world.FEATURE_FLAG_CATALOG.map(entry => flagState(flagStoreId, entry)));
    }

    if (req.method === 'PUT') {
      const flagKey = body && body.flagKey;
      if (!flagKey) { return send(res, 400, { message: 'flagKey is required' }); }
      const descriptor = flagDescriptor(flagKey);
      // Deny-closed. A key the catalog does not carry — a typo, or a flag its own module withheld
      // because it can gate nothing — is refused rather than persisted as an unconsumed row.
      if (!descriptor) { return send(res, 400, { message: 'Unknown feature flag: ' + flagKey }); }

      state.flags[flagStoreId + '|' + flagKey] = {
        enabled: body.enabled === true,
        // Resolved from the CALLER's own identity. The client sends no actor and must not: a
        // client-supplied one would be an unverified claim about who flipped a kill switch.
        updatedByReference: caller.id,
        updatedAtUtc: nowUtc() + 'Z',
        note: body.note || null
      };
      return send(res, 200, flagState(flagStoreId, descriptor));
    }

    if (req.method === 'DELETE') {
      const flagKey = url.searchParams.get('flagKey');
      if (!flagKey) { return send(res, 400, { message: 'flagKey is required' }); }
      if (!flagDescriptor(flagKey)) { return send(res, 400, { message: 'Unknown feature flag: ' + flagKey }); }
      const key = flagStoreId + '|' + flagKey;
      const removed = Object.prototype.hasOwnProperty.call(state.flags, key);
      delete state.flags[key];
      // `{ flagKey, cleared }` and NOT the resulting state — which is why the client re-reads.
      return send(res, 200, { flagKey, cleared: removed });
    }
  }

  // ---- Growth: the venue's privacy queue (spec §5 endpoints 20 and 21) --------------------------
  //
  // NO MODULE GATE, and that is the controller's actual shape rather than an omission here.
  // `GrowthNewslettersController` checks `ModuleIsLiveAsync` before it will dispatch or test-send;
  // `GrowthConsentAdminController` checks nothing but StoreAdmin. A venue that has never switched
  // Growth on can still be asked to erase somebody's data, and art. 12 does not stop applying
  // because marketing is off — so a fixture that gated these behind `growth.module` would model an
  // obligation that can be switched off, which is the opposite of the one that exists.
  const privacyList = /^\/v1\/growth\/stores\/(\d+)\/privacy-requests$/.exec(path);
  if (privacyList && req.method === 'GET') {
    const privacyStoreId = privacyList[1];
    if (!(caller.adminIn || []).some(s => String(s.id) === String(privacyStoreId))) {
      return growthNotFound(res);
    }
    // FILTERED BY STORE, which is the whole tenancy boundary on this route (`ListAsync` is
    // `Where(p => p.StoreId == storeId)`). The world deliberately holds a request belonging to
    // another store so that removing this filter is a change something can catch.
    //
    // ORDERED BY OBLIGATION, the way `ListAsync` orders it: everything still owing an answer first
    // and soonest deadline first, then the settled ones newest-received first. The page renders this
    // order rather than choosing one, so the fixture has to serve the real one — sending the rows
    // in an arbitrary order here would let a journey pass against a list no server produces.
    const scoped = state.privacyRequests.filter(row => String(row.storeId) === String(privacyStoreId));
    const byDeadline = (a, b) =>
      (Date.parse(privacyDueAt(a.receivedAt)) - Date.parse(privacyDueAt(b.receivedAt))) || (a.requestId - b.requestId);
    const newestFirst = (a, b) =>
      (Date.parse(b.receivedAt) - Date.parse(a.receivedAt)) || (b.requestId - a.requestId);
    const rows = scoped.filter(privacyIsOpen).slice().sort(byDeadline)
      .concat(scoped.filter(row => !privacyIsOpen(row)).slice().sort(newestFirst));
    return growthOk(res, { storeId: Number(privacyStoreId), requests: rows.map(privacyItem) });
  }

  const privacyResolve = /^\/v1\/growth\/stores\/(\d+)\/privacy-requests\/(\d+)\/resolution$/.exec(path);
  if (privacyResolve && req.method === 'POST') {
    const privacyStoreId = privacyResolve[1];
    const requestId = Number(privacyResolve[2]);

    // The store gate runs BEFORE the body check, exactly as the controller documents: reversed, a
    // caller could tell a real store from an absent one by sending no body, because the 400 is a
    // shape the opaque 404 exists to withhold.
    if (!(caller.adminIn || []).some(s => String(s.id) === String(privacyStoreId))) {
      return growthNotFound(res);
    }
    if (!body) {
      return growthError(res, 400, 'growth.body_required', 'A request body is required.');
    }

    const row = state.privacyRequests
      .find(r => r.requestId === requestId && String(r.storeId) === String(privacyStoreId));
    // Concealment again: a request that does not exist and one belonging to another store are the
    // same answer.
    if (!row) { return growthNotFound(res); }

    // Idempotent: an already-terminal request answers its canonical row WITHOUT re-executing the
    // irreversible §13 steps. Checked before the outcome is validated, the way the service does it.
    if (row.state === 'Fulfilled' || row.state === 'RejectedWithReason') {
      return growthOk(res, privacyRequestItem(row));
    }

    if (body.outcome !== 'Fulfilled' && body.outcome !== 'RejectedWithReason') {
      return growthError(res, 400, 'growth.invalid_resolution',
        'The resolution outcome must be Fulfilled or RejectedWithReason.');
    }

    if (body.outcome === 'RejectedWithReason') {
      if (!String(body.reason || '').trim()) {
        return growthError(res, 400, 'growth.reason_required',
          'A reason is required to reject a privacy request.');
      }
      row.state = 'RejectedWithReason';
      row.resolvedAt = nowUtc() + 'Z';
      // `ForRejected` writes no notice field, so `NoticeDeliveryOf` reads null. A rejection owes the
      // subject no art. 15 export and no erasure completion notice, and recording one of the three
      // delivery states here would be inventing a receipt.
      row.noticeDelivery = null;
      return growthOk(res, privacyRequestItem(row));
    }

    // Fulfilled. The notice to the subject goes out BEFORE anything irreversible happens, and what
    // is recorded is what the TRANSPORT reported — submission, never delivery.
    row.state = 'Fulfilled';
    row.resolvedAt = nowUtc() + 'Z';
    row.noticeDelivery = 'SubmittedToTransport';
    // NOTHING here records whether the address was destroyed or the shred deferred, because the wire
    // item has no field for it. A fixture that added one would let a page ship that claims a
    // destruction the real response cannot support.
    return growthOk(res, privacyRequestItem(row));
  }

  const storeMarket = /^\/stores\/(\d+)\/market$/.exec(path);
  if (storeMarket && req.method === 'GET') {
    return send(res, 200, {
      storeId: Number(storeMarket[1]),
      country: 'NO',
      currencyCode: world.CURRENCY,
      timeZone: world.TIME_ZONE,
      effectiveTimeZone: world.TIME_ZONE,
      countryHasRulePack: true
    });
  }

  // ---- the worker's own surface ----------------------------------------------------------------
  //
  // #32. The route that makes every other route on this surface reachable by a human: nothing else
  // in the module ever sets a person's `ApplicationUserId`.
  if (path === '/workforce/me/invitations/claim' && req.method === 'POST') {
    const key = req.headers['idempotency-key'];
    // PER-USER scope, exactly as the service does it. A shared namespace would let two callers'
    // identical keys collide, and a claim links the CALLER's own login — that would be a correctness
    // bug rather than a replay.
    const scope = 'claim|' + caller.id + '|' + key;
    if (state.idempotency[scope]) {
      // The replay. This is the branch the join page's stable-key retry depends on: pressing again
      // after a lost response must return the engagement rather than refuse it as already-claimed.
      return send(res, 200, state.idempotency[scope]);
    }

    const raw = String((body && body.token) || '').trim();
    const invitation = state.invitations[raw];
    const now = Date.now();
    // THE ANTI-ORACLE. Unknown, expired, superseded, already-claimed and bound-to-another-login all
    // answer the same opaque 404 with no discriminating extension, because the real surface does —
    // and the page's copy names all five precisely because it cannot be told which.
    if (!invitation || invitation.state !== 'Pending' || Date.parse(invitation.expiresAtUtc) <= now) {
      return problem(res, 404, 'workforce.invitation-invalid', 'The invitation could not be claimed.');
    }

    invitation.state = 'Claimed';
    delete state.pendingByStaff[invitation.staffMemberId];
    const staff = world.STAFF.find(s => s.staffMemberId === invitation.staffMemberId) || null;
    if (!state.claims[caller.id]) { state.claims[caller.id] = []; }
    if (!state.claims[caller.id].includes(invitation.staffMemberId)) {
      state.claims[caller.id].push(invitation.staffMemberId);
    }

    const outcome = {
      staffMemberId: invitation.staffMemberId,
      storeId: invitation.storeId,
      workforcePersonId: (staff && staff.workforcePersonId) || ('person-' + invitation.staffMemberId),
      personState: 'Claimed',
      // The engagement's PRE-EXISTING grants. A claim never widens them, so this is read off the
      // roster rather than invented at claim time.
      capabilities: (staff && staff.capabilities) || ['WorkforceSelf']
    };
    state.idempotency[scope] = outcome;
    return send(res, 200, outcome);
  }

  // #31. The wire name is `capabilityGrants` — a [Flags] enum rendered by StringEnumConverter, so a
  // single grant is `"WorkforceSelf"` and several are comma-separated. It is NOT `capabilities`:
  // `utils/workforce-me/memberships.js` reads `capabilityGrants` and an engagement whose grants it
  // cannot see reads as un-capable, which renders the worker page as "you have no engagement". The
  // fixture answered the wrong field name until the onboarding journey opened the page and looked.
  if (path === '/workforce/me/staff-memberships' && req.method === 'GET') {
    const mine = state.claims[caller.id] || [];
    return send(res, 200, mine.map((staffMemberId) => {
      const staff = world.STAFF.find(s => s.staffMemberId === staffMemberId) || null;
      return {
        staffMemberId,
        storeId: world.STORE_ID,
        workforcePersonId: (staff && staff.workforcePersonId) || ('person-' + staffMemberId),
        displayName: staff ? staff.displayName : null,
        isActive: true,
        capabilityGrants: 'WorkforceSelf',
        legalEmployerId: 'employer-1',
        activeFromUtc: '2026-01-01T00:00:00',
        activeToUtc: null,
        roleNames: []
      };
    }));
  }

  // #33. Derived from the PUBLISHED revisions rather than hard-coded, so "the worker sees what the
  // manager published" is a wire-through this fixture actually proves. A draft is never disclosed
  // here, which is the rule the real surface enforces and the reason the journey has to publish.
  if (path === '/workforce/me/schedule' && req.method === 'GET') {
    const mine = state.claims[caller.id] || [];
    const items = [];
    for (const key of Object.keys(state.revisions)) {
      const revision = state.revisions[key];
      if (revision.state !== 'Published') { continue; }
      for (const assignment of revision.assignments) {
        if (!assignment.staffMemberId || !mine.includes(assignment.staffMemberId)) { continue; }
        items.push(Object.assign({}, assignment, {
          storeId: world.STORE_ID,
          timeZoneId: world.TIME_ZONE,
          publicationId: 'pub-' + revision.scheduleRevisionId,
          publicationNumber: revision.publicationNumber,
          publishedAtUtc: nowUtc()
        }));
      }
    }
    return send(res, 200, { asOfUtc: nowUtc(), items });
  }

  if (path === '/workforce/me/inbox' && req.method === 'GET') {
    return send(res, 200, { items: [] });
  }

  // #39. Answered because the worker page fans out one of these PER membership as soon as it has
  // any — an unrouted 404 would land in the artifact's `failedRequests` and read as a product
  // defect rather than as a gap in this fixture.
  const openAssignments = /^\/workforce\/me\/staff-memberships\/([^/]+)\/open-assignments$/.exec(path);
  if (openAssignments && req.method === 'GET') {
    return send(res, 200, { items: [] });
  }

  // ---- the manager's store surface -------------------------------------------------------------
  const store = WORKFORCE_STORE.exec(path);
  if (store) {
    const storeId = store[1];
    const rest = store[2] || '';

    // A store the caller does not administer is refused with the status the page turns into
    // "Du har ikke bemanningstilgang" rather than a generic failure.
    const administers = (caller.adminIn || []).some(s => String(s.id) === String(storeId));
    // #1 admits any capability grant, so the worker may read the context of a store they work at —
    // that is how `/admin/workforce-me` resolves the zone for its date forms.
    //
    // Derived from the CLAIMS this fixture has recorded rather than from one hardcoded user id. It
    // used to name `user-worker` literally, which meant a worker who had just claimed an invitation
    // was refused the zone read with a 403 — the worker page then withheld its date pickers from a
    // person who genuinely works there. Nothing asserted it; it showed up as a red line in the
    // journey's own request log, which is what that log is for.
    const worksHere = (state.claims[caller.id] || []).length > 0 &&
      String(storeId) === String(world.STORE_ID);

    if (rest === '/context' && req.method === 'GET') {
      if (!administers && !worksHere) {
        return problem(res, 403, 'workforce.forbidden', 'No workforce capability at this store.');
      }
      return send(res, 200, {
        storeId: Number(storeId),
        timeZone: { id: world.TIME_ZONE },
        capabilities: administers
          ? ['WorkforceScheduler', 'WorkforceManager']
          : ['WorkforceSelf']
      });
    }

    if (!administers) {
      return problem(res, 403, 'workforce.forbidden', 'No workforce capability at this store.');
    }

    // THE §9.2 KILL SWITCH. All four schedule writes — create draft, batch edit, validate, publish —
    // pass `WorkforceFeatureFlags.Publication` to `RequireWriteCapabilityAsync`, and
    // `WorkforceModuleGate.EnsureStageWriteEnabledAsync` refuses a disabled one with
    // `FlagDisabledReadOnly(flag)`. Enforced here, once, for all four, because a fixture that gated
    // only publish would let a page ship that offers a draft button the real API refuses.
    //
    // READS ARE NEVER GATED, and that is the rule rather than an omission: §9.2 says the surface goes
    // READ-ONLY, so the week, the roster and the exports keep answering while the switch is down.
    // A fixture that darkened the reads too would prove a product this one is not.
    if (req.method !== 'GET' && /^\/schedules(\/|$)/.test(rest) &&
        !flagEffective(storeId, world.SCHEDULE_WRITE_FLAG)) {
      return problem(res, 409, 'workforce.flag-disabled-read-only',
        'The workforce feature is disabled for this store; the surface is read-only.', {
          conflictKind: 'flag-disabled-read-only',
          // The key is what makes the refusal actionable: the family has eight stage flags, and a
          // client told only "a workforce feature is disabled" cannot name the lever to pull.
          flag: world.SCHEDULE_WRITE_FLAG,
          retryable: false
        });
    }

    if (rest === '/staff' && req.method === 'GET') {
      // `personState` follows the claims this fixture has actually recorded, so the roster's access
      // panel flips from "no login attached" to "a login is attached" because a claim HAPPENED —
      // not because a constant said so. Without this the journey's last manager-side assertion
      // would be asserting the seed.
      const claimed = new Set(Object.keys(state.claims).reduce((all, u) => all.concat(state.claims[u]), []));
      return send(res, 200, world.STAFF.map(s => Object.assign({}, s, {
        personState: claimed.has(s.staffMemberId) ? 'Claimed' : 'Invited'
      })));
    }

    const staffDetail = /^\/staff\/([^/]+)$/.exec(rest);
    if (staffDetail && req.method === 'GET') {
      const staff = world.STAFF.find(s => s.staffMemberId === staffDetail[1]);
      if (!staff) { return problem(res, 404, 'workforce.not-found', 'No such engagement.'); }
      const claimed = Object.keys(state.claims).some(u => state.claims[u].includes(staff.staffMemberId));
      return send(res, 200, Object.assign({}, staff, {
        storeId: Number(storeId),
        workforcePersonId: staff.workforcePersonId || ('person-' + staff.staffMemberId),
        contactEmail: null,
        contactPhone: null,
        personState: claimed ? 'Claimed' : 'Invited',
        legalEmployerId: 'employer-1',
        capabilities: staff.capabilities || ['WorkforceSelf'],
        activeFromUtc: '2026-01-01T00:00:00',
        activeToUtc: null,
        // The opaque If-Match token. Present, because SQLite's null-revision case is a different
        // branch and this journey is not about it.
        revision: 'rev-' + staff.staffMemberId,
        createdAtUtc: '2026-01-01T00:00:00'
      }));
    }

    const staffRoles = /^\/staff\/([^/]+)\/roles$/.exec(rest);
    if (staffRoles && req.method === 'GET') { return send(res, 200, []); }

    const staffTerms = /^\/staff\/([^/]+)\/employment-terms$/.exec(rest);
    if (staffTerms && req.method === 'GET') { return send(res, 200, []); }

    if (rest === '/attendance' && req.method === 'GET') {
      return send(res, 200, { rows: [], days: [] });
    }

    // #6. Issue or REISSUE the engagement's one-use claim token.
    //
    // Two properties of the real service are modelled because the UI makes claims about both:
    //   • The RAW token rides the response EXACTLY ONCE. The fixture keeps only the mapping it needs
    //     to honour a later claim, and never answers the token again on any read — there is no read.
    //   • A reissue SUPERSEDES IN PLACE: the previous raw token is deleted here, so a journey that
    //     reissued and then claimed the OLD code would get the opaque 404, which is exactly what the
    //     panel's "the previous code stops working" sentence promises.
    const issueInvitation = /^\/staff\/([^/]+)\/invitations$/.exec(rest);
    if (issueInvitation && req.method === 'POST') {
      const staffMemberId = issueInvitation[1];
      if (!world.STAFF.some(s => s.staffMemberId === staffMemberId)) {
        return problem(res, 404, 'workforce.not-found', 'No such engagement.');
      }

      const superseded = state.pendingByStaff[staffMemberId];
      if (superseded && state.invitations[superseded]) {
        state.invitations[superseded].state = 'Superseded';
        delete state.invitations[superseded];
      }

      const hours = (body && Number(body.expiresInHours)) || 14 * 24;
      const token = 'wfinv_' + nextId('tok') + '_' + Math.random().toString(36).slice(2, 10);
      const invitation = {
        invitationId: nextId('inv'),
        storeId: Number(storeId),
        staffMemberId,
        state: 'Pending',
        expiresAtUtc: new Date(Date.now() + hours * 3600000).toISOString().slice(0, 19),
        createdAtUtc: nowUtc()
      };
      state.invitations[token] = invitation;
      state.pendingByStaff[staffMemberId] = token;

      return send(res, 200, {
        invitationId: invitation.invitationId,
        storeId: invitation.storeId,
        staffMemberId: invitation.staffMemberId,
        token,
        expiresAtUtc: invitation.expiresAtUtc,
        createdAtUtc: invitation.createdAtUtc
      });
    }

    if (rest === '/roles' && req.method === 'GET') { return send(res, 200, world.ROLES); }
    if (rest === '/requests' && req.method === 'GET') { return send(res, 200, { items: state.requests }); }

    if (rest === '/schedules' && req.method === 'GET') {
      const from = url.searchParams.get('from');
      const view = url.searchParams.get('view') || 'draft';
      return send(res, 200, rangeDocument(state.revisions[storeId + '|' + from], view));
    }

    if (rest === '/schedules/external-commitments' && req.method === 'GET') {
      // `timeZoneId` is mandatory: without it `placeExternalCommitments` reads the whole overlay as
      // unknown, and the grid would print "the cross-store check did not answer" on a clean week.
      return send(res, 200, { items: [], timeZoneId: world.TIME_ZONE });
    }

    if (rest === '/schedules/drafts' && req.method === 'POST') {
      const key = storeId + '|' + (body && body.rangeStartUtc);
      if (state.revisions[key]) {
        return problem(res, 409, 'workforce.revision-exists', 'A revision already covers this range.', {
          conflictKind: 'assignment-invalid'
        });
      }
      const revision = {
        scheduleRevisionId: nextId('rev'),
        state: 'Draft',
        revisionNumber: 1,
        publicationNumber: null,
        assignments: [],
        version: 0,
        eTag: ''
      };
      bumpETag(revision);
      state.revisions[key] = revision;
      return send(res, 200, {
        scheduleRevisionId: revision.scheduleRevisionId,
        eTag: revision.eTag,
        state: revision.state,
        revisionNumber: revision.revisionNumber,
        copiedAssignmentCount: 0
      });
    }

    const revisionRoute = /^\/schedules\/([^/]+)\/(assignments:batch|validate|publish)$/.exec(rest);
    if (revisionRoute) {
      const revisionId = revisionRoute[1];
      const verb = revisionRoute[2];
      const key = Object.keys(state.revisions)
        .find(k => k.startsWith(storeId + '|') && state.revisions[k].scheduleRevisionId === revisionId);
      const revision = key ? state.revisions[key] : null;
      if (!revision) {
        return problem(res, 404, 'workforce.revision-not-found', 'No such revision.');
      }

      if (verb === 'assignments:batch' && req.method === 'PUT') {
        if (revision.state === 'Published') {
          return problem(res, 409, 'workforce.revision-not-editable', 'A published revision is terminal.', {
            conflictKind: 'revision-not-editable'
          });
        }
        // The precondition, compared. Quotes are trimmed the way the real surface trims them, so
        // both the RFC 9110 form the client sends and a bare token are accepted.
        const ifMatch = String(req.headers['if-match'] || '').replace(/^"|"$/g, '');
        if (!ifMatch) {
          return problem(res, 428, 'workforce.precondition-required', 'If-Match is required.');
        }
        if (ifMatch !== revision.eTag) {
          return problem(res, 409, 'workforce.stale-revision',
            'The draft has changed since it was read.', {
              conflictKind: 'stale-revision',
              eTag: revision.eTag
            });
        }
        applyBatch(revision, body && body.assignments);
        return send(res, 200, rangeDocument(revision, 'draft'));
      }

      if (verb === 'validate' && req.method === 'POST') {
        revision.state = 'Validated';
        bumpETag(revision);
        return send(res, 200, {
          scheduleRevisionId: revision.scheduleRevisionId,
          isValid: true,
          validatedAtUtc: nowUtc(),
          ruleResults: [
            { ruleId: 'workforce.rest-period', result: 'pass', remediation: null },
            { ruleId: 'workforce.weekly-hours', result: 'pass', remediation: null }
          ]
        });
      }

      if (verb === 'publish' && req.method === 'POST') {
        if (revision.state !== 'Validated') {
          return problem(res, 409, 'workforce.revision-not-validated',
            'Validate the revision before publishing it.', { conflictKind: 'assignment-invalid' });
        }
        revision.state = 'Published';
        revision.publicationNumber = 1;
        bumpETag(revision);
        const recipients = new Set(revision.assignments.map(a => a.staffMemberId).filter(Boolean));
        return send(res, 200, {
          publicationNumber: 1,
          publishedAtUtc: nowUtc(),
          recipientCount: recipients.size
        });
      }
    }
  }

  return problem(res, 404, 'FIXTURE_UNROUTED', req.method + ' ' + path + ' is not in the fixture.');
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { return send(res, 204, undefined); }
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  route(req, res, url).catch((error) => {
    // A fixture that 500s silently is worse than no fixture: the page would render an honest
    // "unknown" and the journey would fail somewhere else entirely.
    process.stderr.write('[fixture] ' + req.method + ' ' + url.pathname + ' -> ' + error.stack + '\n');
    problem(res, 500, 'FIXTURE_ERROR', String(error && error.message));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write('[fixture] listening on http://127.0.0.1:' + PORT + '\n');
});

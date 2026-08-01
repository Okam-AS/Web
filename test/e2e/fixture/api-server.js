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
    seq: 0,
    requests: [],
    // How many requests this fixture has answered since the last reset. Read by the journey fixture
    // as a WRONG-WORLD GUARD: `reuseExistingServer` will happily adopt a dev server somebody else
    // started, and if that one was pointed at the real API every journey would run green against
    // production data while claiming to be a fixture run. A journey that produced no traffic here
    // was not talking to this fixture, and that is a failure rather than a fast pass.
    served: 0
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

function userForToken (token) {
  return Object.values(world.USERS).find(u => u.token === token) || null;
}

/** The user payload `GET /user` answers: everything except the token, which the app re-stamps. */
function userPayload (user) {
  const copy = Object.assign({}, user);
  delete copy.token;
  return copy;
}

// ---- routing -----------------------------------------------------------------------------------

const WORKFORCE_STORE = /^\/workforce\/stores\/([^/]+)(\/.*)?$/;

async function route (req, res, url) {
  const path = url.pathname;
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

  // ---- everything below is authenticated -------------------------------------------------------
  const caller = userForToken(bearer(req));
  if (!caller) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }

  if (req.method !== 'GET' && path.startsWith('/workforce/') && !req.headers['idempotency-key']) {
    return problem(res, 400, 'workforce.idempotency-key-required',
      'Every workforce mutation must carry an Idempotency-Key.');
  }

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
  if (path === '/workforce/me/staff-memberships' && req.method === 'GET') {
    return send(res, 200, caller.id === 'user-worker'
      ? [{
        staffMemberId: 'staff-1',
        storeId: world.STORE_ID,
        storeName: world.STORE_NAME,
        capabilities: ['WorkforceSelf'],
        isActive: true
      }]
      : []);
  }
  if (path === '/workforce/me/schedule' && req.method === 'GET') {
    return send(res, 200, { items: [], timeZoneId: world.TIME_ZONE });
  }
  if (path === '/workforce/me/inbox' && req.method === 'GET') {
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
    const worksHere = caller.id === 'user-worker' && String(storeId) === String(world.STORE_ID);

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

    if (rest === '/staff' && req.method === 'GET') { return send(res, 200, world.STAFF); }
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

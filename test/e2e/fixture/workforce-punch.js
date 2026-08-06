// THE REGISTER, and the clock that runs on it.
//
// Two things live here, and the first one is the surprise:
//
//  1. THE POS STARTUP PATH. Before this file, the fixture served ZERO POS endpoints — no cash point,
//     no operator, no operator session, no trading day, no catalog, no board. So `/admin/pos` could
//     not be reached by a browser journey at all, and no amount of clock fidelity would have changed
//     that. Standing the register up is the precondition for proving anything on it.
//
//  2. THE CLOCK STATE MACHINE (`POST /workforce/pos/clock-events`, `GET /workforce/pos/personnel-list`).
//
// ---- WHY THE CLOCK IS MODELLED RATHER THAN STUBBED --------------------------------------------
//
// The whole point of the journey this fixture serves is the ASYMMETRY between the two halves of the
// pair, and a stub that answered 200 to everything would prove the opposite of what needs proving.
// Reproduced exactly, from `WorkforceClockProjection` / `WorkforcePosController` at 8e2b57de:
//
//   • CLOCK IN with a session already open -> 409 `workforce.open-session-exists`. A filtered unique
//     index (`WHERE [ClosedUtc] IS NULL`) rejects it at commit; the raw punch is already durable.
//
//   • CLOCK OUT with NO open session -> **200**, `accepted: true`, `clockSessionId: null`, and
//     `sessionState: "Open"`. Not a typo and not a shortcut: `PosClockEventResponse.From` derives
//     `SessionState = ClosedUtc.HasValue ? Closed : Open`, and a fold that touched nothing has no
//     `ClosedUtc`. This is the single most misleading answer on the surface, it is what the screen's
//     state module exists to survive, and a fixture that "helpfully" answered 409 here would let the
//     bug back in while the journey stayed green.
//
//   • The punch is retained either way — raw truth is accepted, never rejected (§3.4). Only the
//     personalliste PRESENCE is conditional, and only a fold that moved a session raises one.
//
// ---- WHAT IS NOT MODELLED ---------------------------------------------------------------------
//
// No DST resolution, no break bracketing, no cross-engagement second employer, no adjustment path.
// Each is a real branch of the surface and none is reachable from this screen, so modelling them
// would be inventing behaviour rather than reproducing it.

'use strict';

const STORE_ID = 42;
const CASH_POINT_ID = 7;

// The operator standing at the till, and whether a manager has linked them to an engagement.
// `linked: false` is the out-of-the-box state for a real store and the reason endpoint 45 answers
// 403 far more often than it answers anything else.
const OPERATORS = [
  { operatorId: 501, name: 'Kari Nordmann', pin: '1234', linked: true, staffMemberId: '30000000-0000-0000-0000-000000000001' },
  { operatorId: 502, name: 'Ola Hansen', pin: '4321', linked: false, staffMemberId: null }
];

function fresh () {
  return {
    // NO LOCAL FLAG. `workforce.clock` is resolved through the fixture's SHARED per-store override
    // store (`flagEffective`) — the same map the operator switchboard's `PUT` writes and
    // `/admin/feature-flags` renders. A boolean of its own here would be a world the switchboard
    // cannot move, which is exactly the defect that made six journeys green against stores no venue
    // is. The flag is deny-closed by default (`defaultEnabled: false`, no grandfather probe), so out
    // of the box every punch is a 409 and the journey has to pull the real lever to get past it.
    sessions: {},
    // The canonical folded sessions, keyed by staff member. At most one open per person — the
    // filtered unique index, as a Map.
    open: {},
    // The personalliste: one entry per on-site window, open and completed alike. Append-only here
    // exactly as it is in the database — a clock-out SUPERSEDES an open entry by writing a new one
    // rather than editing it, so nothing in this file ever mutates a recorded window (C1).
    entries: [],
    punches: [],
    seq: 0
  };
}

function operatorById (id) {
  return OPERATORS.find(o => String(o.operatorId) === String(id)) || null;
}

function sessionFrom (req, state) {
  const id = req.headers['x-operator-session'];
  return id ? (state.sessions[id] || null) : null;
}

// The register's business day, in the venue's zone. Every entry carries it, and the read filters on it.
function businessDate (now) {
  return now.toISOString().slice(0, 10);
}

/**
 * The privacy-safe wire shape of endpoint 46 (§13.4): a name, a category, a protected code reference
 * and the on-site window. Never a raw national identifier — no field here can carry one.
 */
function toWire (state, now) {
  const today = businessDate(now);
  // A superseded entry is gone from the read; the entry that superseded it carries the window.
  const superseded = {};
  state.entries.forEach((e) => { if (e.supersedesEntryId) { superseded[e.supersedesEntryId] = true; } });
  const live = state.entries.filter(e => e.localBusinessDate === today && !superseded[e.entryId]);
  return {
    storeId: STORE_ID,
    asOfUtc: now.toISOString(),
    businessDate: today + 'T00:00:00',
    timeZoneId: 'Europe/Oslo',
    businessName: 'Okam Pilot Servering AS',
    organizationNumber: '923456789',
    presentCount: live.filter(e => !e.onSiteEndUtc).length,
    entries: live.map(e => ({
      participantName: e.participantName,
      protectedIdentityCodeRef: e.protectedIdentityCodeRef,
      category: e.category,
      hiredInOrganizationNumber: null,
      onSiteStartUtc: e.onSiteStartUtc,
      onSiteEndUtc: e.onSiteEndUtc,
      isPresent: !e.onSiteEndUtc,
      localBusinessDate: e.localBusinessDate,
      correctionActorReference: null,
      correctedAtUtc: null
    }))
  };
}

/**
 * Handles every route this lane needs. Returns true when it answered, false to fall through to the
 * rest of the fixture — so `api-server.js` gains one delegation rather than two hundred lines.
 */
function handle (ctx) {
  const { path, method, req, res, state, send, problem, body, flagEffective } = ctx;
  const now = new Date();

  // ---- POS startup ---------------------------------------------------------------------------

  if (path === '/CashPoint' && method === 'GET') {
    send(res, 200, [{
      cashPointId: CASH_POINT_ID,
      storeId: STORE_ID,
      name: 'Kasse 1',
      isActive: true,
      allowFastOperatorSwitch: false
    }]);
    return true;
  }

  if (path === '/Operator' && method === 'GET') {
    // `displayName`, not `name` — `OperatorModel` names it that and the login screen reads it.
    send(res, 200, OPERATORS.map(o => ({
      operatorId: o.operatorId,
      storeId: STORE_ID,
      displayName: o.name,
      isActive: true,
      hasPin: true,
      isLockedOut: false,
      applicationUserId: null
    })));
    return true;
  }

  if (path === '/Operator/login' && method === 'POST') {
    const op = operatorById(body && body.operatorId);
    if (!op || !body || String(body.pin) !== op.pin) {
      // The register maps this English constant to the operator's language; it is a platform
      // message, not problem+json.
      send(res, 400, { message: 'Invalid PIN' });
      return true;
    }
    const sessionId = 'opsess-' + (++state.workforcePunch.seq);
    const session = {
      operatorSessionId: sessionId,
      operatorId: op.operatorId,
      operatorName: op.name,
      storeId: STORE_ID,
      cashPointId: CASH_POINT_ID,
      startedAt: now.toISOString(),
      pinVerified: true
    };
    state.workforcePunch.sessions[sessionId] = session;
    send(res, 200, session);
    return true;
  }

  // Handing the till to the next person. A switch ENDS the outgoing session and mints a new one, so
  // the clock that follows is attributed to whoever is now standing there — the reason the screen
  // reads its operator from the shell on every call rather than caching a staff identity.
  if (path === '/Operator/switch' && method === 'POST') {
    const outgoing = sessionFrom(req, state.workforcePunch);
    const op = operatorById(body && body.operatorId);
    if (!op || !body || String(body.pin) !== op.pin) {
      send(res, 400, { message: 'Invalid PIN' });
      return true;
    }
    if (outgoing) { delete state.workforcePunch.sessions[outgoing.operatorSessionId]; }
    const sessionId = 'opsess-' + (++state.workforcePunch.seq);
    const session = {
      operatorSessionId: sessionId,
      operatorId: op.operatorId,
      operatorName: op.name,
      storeId: STORE_ID,
      cashPointId: CASH_POINT_ID,
      startedAt: now.toISOString(),
      pinVerified: true
    };
    state.workforcePunch.sessions[sessionId] = session;
    send(res, 200, session);
    return true;
  }

  if (path === '/Operator/session' && method === 'GET') {
    const session = sessionFrom(req, state.workforcePunch);
    if (!session) {
      send(res, 401, { message: 'Operator session is invalid or has ended' });
      return true;
    }
    send(res, 200, session);
    return true;
  }

  if (path === '/Operator/logout' && method === 'POST') {
    const session = sessionFrom(req, state.workforcePunch);
    if (session) { delete state.workforcePunch.sessions[session.operatorSessionId]; }
    send(res, 200, true);
    return true;
  }

  // The trading day, the catalog and the board. Served as EMPTY rather than left to 404, so the
  // register boots into a real "no day open yet" state — which is exactly the state a person
  // arriving for work is in when they clock in, and is the state this journey needs.
  if (/^\/cashdrawer\/[^/]+\/current$/.test(path) && method === 'GET') {
    send(res, 200, null);
    return true;
  }
  if (/^\/pos\/catalog\//.test(path) && method === 'GET') {
    send(res, 200, []);
    return true;
  }
  if (/^\/pos\/board-status\//.test(path) && method === 'GET') {
    send(res, 200, { storeId: STORE_ID, tables: [], parkedChecks: [] });
    return true;
  }

  // ---- Endpoint 45: the punch ------------------------------------------------------------------

  if (path === '/workforce/pos/clock-events' && method === 'POST') {
    const wf = state.workforcePunch;

    // Guard order is the controller's own: session, then link, then module, then flag, then ingest.
    // Nothing is consumed before a refusal.
    const session = sessionFrom(req, wf);
    if (!session) {
      // NOT problem+json: OperatorSessionExceptionMiddleware answers a plain message with no code,
      // which is why the screen matches this one on status.
      send(res, 401, { message: 'Operator session is invalid or has ended' });
      return true;
    }

    if (!body || !body.clientEventId) {
      problem(res, 400, 'workforce.invalid-request', 'A clientEventId is required for a clock event.');
      return true;
    }

    const op = operatorById(session.operatorId);
    if (!op || !op.linked) {
      problem(res, 403, 'workforce.pos-operator-not-linked',
        'This POS operator is not linked to a workforce staff member; clocking requires an explicit, manager-reviewed link.',
        { conflictKind: 'pos-operator-not-linked', retryable: false });
      return true;
    }

    // The module gate carries a GRANDFATHER PROBE the clock flag does not: with no explicit override,
    // a store that already has any engagement passes (`WorkforceModuleGate`). This world has linked
    // staff, so it passes — modelled rather than hardcoded true, because the asymmetry between the
    // two gates is why a real store meets the clock's 409 and never the module's 403.
    const hasEngagements = OPERATORS.some(o => o.linked);
    if (!flagEffective(STORE_ID, 'workforce.module') && !hasEngagements) {
      problem(res, 403, 'workforce.module-disabled', 'The Workforce module is not enabled for this store.');
      return true;
    }

    if (!flagEffective(STORE_ID, 'workforce.clock')) {
      problem(res, 409, 'workforce.flag-disabled-read-only',
        'Workforce clocking is disabled for this store; the clock surface is read-only. Use the manual time-capture procedure.',
        { conflictKind: 'flag-disabled-read-only', flag: 'workforce.clock', manualContinuation: true, retryable: false });
      return true;
    }

    // The natural dedupe key. A retry re-sending the same clientEventId replays the same answer
    // rather than appending a second punch.
    const seen = wf.punches.find(p => p.clientEventId === body.clientEventId);
    if (seen) { send(res, 200, seen.response); return true; }

    const eventUtc = now.toISOString();
    const openSession = wf.open[op.staffMemberId] || null;
    let response;

    if (body.eventType === 'ClockIn') {
      if (openSession) {
        // The filtered unique index rejects the second open session at commit. The raw punch is
        // durable; only the session rolled back — so this is a refusal, not a silent no-op.
        problem(res, 409, 'workforce.open-session-exists',
          'An open clock session already exists for this person and legal employer.',
          { conflictKind: 'open-session-exists', retryable: false });
        return true;
      }
      const sessionId = 'clocksess-' + (++wf.seq);
      const entryId = 'entry-' + wf.seq;
      wf.open[op.staffMemberId] = { clockSessionId: sessionId, openedUtc: eventUtc, entryId };
      wf.entries.push({
        entryId,
        supersedesEntryId: null,
        participantName: op.name,
        protectedIdentityCodeRef: 'wf-person:' + op.staffMemberId,
        category: 'Ansatt',
        onSiteStartUtc: eventUtc,
        onSiteEndUtc: null,
        localBusinessDate: businessDate(now)
      });
      response = {
        storeId: STORE_ID,
        staffMemberId: op.staffMemberId,
        clockSessionId: sessionId,
        sessionState: 'Open',
        eventType: 'ClockIn',
        openedUtc: eventUtc,
        closedUtc: null,
        serverReceivedUtc: eventUtc,
        verificationMethod: 'dev-accept',
        accepted: true
      };
    } else if (body.eventType === 'ClockOut') {
      if (!openSession) {
        // THE ONE THAT LOOKS LIKE SUCCESS. 200, accepted, and `sessionState: "Open"` — because the
        // state is derived from `closedUtc`, which a fold that touched nothing never set. No
        // presence is raised, so the register below stays exactly as it was.
        response = {
          storeId: STORE_ID,
          staffMemberId: op.staffMemberId,
          clockSessionId: null,
          sessionState: 'Open',
          eventType: 'ClockOut',
          openedUtc: null,
          closedUtc: null,
          serverReceivedUtc: eventUtc,
          verificationMethod: 'dev-accept',
          accepted: true
        };
      } else {
        // A clock-out APPENDS the completed window and supersedes the open one. The original entry
        // is left untouched on the record — it is not edited and not removed (C1).
        const closedEntryId = 'entry-' + (++wf.seq);
        const original = wf.entries.find(e => e.entryId === openSession.entryId);
        wf.entries.push({
          entryId: closedEntryId,
          supersedesEntryId: openSession.entryId,
          participantName: op.name,
          protectedIdentityCodeRef: 'wf-person:' + op.staffMemberId,
          category: 'Ansatt',
          onSiteStartUtc: openSession.openedUtc,
          onSiteEndUtc: eventUtc,
          // The completed window keeps the business day it STARTED on, so an overnight shift does
          // not jump to the next day's register.
          localBusinessDate: original ? original.localBusinessDate : businessDate(now)
        });
        delete wf.open[op.staffMemberId];
        response = {
          storeId: STORE_ID,
          staffMemberId: op.staffMemberId,
          clockSessionId: openSession.clockSessionId,
          sessionState: 'Closed',
          eventType: 'ClockOut',
          openedUtc: openSession.openedUtc,
          closedUtc: eventUtc,
          serverReceivedUtc: eventUtc,
          verificationMethod: 'dev-accept',
          accepted: true
        };
      }
    } else {
      problem(res, 400, 'workforce.invalid-request', 'Unsupported clock event type for this fixture.');
      return true;
    }

    wf.punches.push({ clientEventId: body.clientEventId, response });
    send(res, 200, response);
    return true;
  }

  // ---- Endpoint 46: the on-venue register ------------------------------------------------------

  if (path === '/workforce/pos/personnel-list' && method === 'GET') {
    const wf = state.workforcePunch;
    const session = sessionFrom(req, wf);
    if (!session) {
      send(res, 401, { message: 'Operator session is invalid or has ended' });
      return true;
    }
    // The READ survives both the kill-switch and the module gate: a register that was already
    // written must stay producible even while the clock is switched off.
    send(res, 200, toWire(wf, now));
    return true;
  }

  return false;
}

// There is deliberately no `setClockEnabled` here. The only way to switch this store's clock on is
// the operator switchboard, through `/admin/feature-flags` — a helper that reached into the state
// would prove the fixture can hold a row, not that anyone can pull the lever.
module.exports = { fresh, handle, STORE_ID, CASH_POINT_ID, OPERATORS };

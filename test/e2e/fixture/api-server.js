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

  // ---- everything below is authenticated -------------------------------------------------------
  const caller = userForToken(bearer(req));
  if (!caller) { return problem(res, 401, 'AUTH_REQUIRED', 'No bearer token.'); }

  if (req.method !== 'GET' && path.startsWith('/workforce/') && !req.headers['idempotency-key']) {
    return problem(res, 400, 'workforce.idempotency-key-required',
      'Every workforce mutation must carry an Idempotency-Key.');
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

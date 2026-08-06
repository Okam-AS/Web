// THE TIMESHEET BATCH — the payroll artifact a manager freezes and sends, as much of it as the
// screen's contract needs.
//
// Kept out of `world.js` and out of `api-server.js` deliberately: it is a per-family slice like
// `margin.js` and `workforce-delivery.js`, and those two files are the ones every other lane is also
// editing.
//
// ---- WHAT IS MODELLED FROM THE BACKEND, AND WHY EACH PIECE IS HERE -----------------------------
//
// 1. THE PERIOD HAS NO CREATE, AND ITS ID IS A DIGEST. `WorkforceTimesheetService` derives the id
//    from `(storeId, fromBusinessDate, toBusinessDate)` and the list SYNTHESISES an `Open` row for a
//    range that has no frozen period yet, at index 0. Reproduced exactly, because it is the only way
//    a client ever learns a periodId — a fixture that handed out ids from a counter would let a page
//    ship that could never address a real period. It is also why approve sends the range back in the
//    body: the server re-derives the digest and refuses a mismatch.
//
// 2. THE ACTOR IS THE CALLER'S STAFF MEMBER, RESOLVED, NEVER AMBIENT. The real service does
//    `var caller = await _authorization.RequireWriteCapabilityAsync(userId, ...)` and then
//    `var actor = caller.StaffMemberId.ToString()`, and `AppendExportAudit` THROWS on a blank one
//    ("A timesheet export audit event requires a resolved actor."). So this fixture resolves the
//    actor from the bearer token the request actually carried, and `requireActor` below throws if it
//    cannot. Hard-coding a system actor here would make the C4 property unfalsifiable on the one
//    surface that exists to record who turned hours into money.
//
// 3. FINALIZE-THEN-REFUSE, AND THE KEY DECIDES WHICH. A repeat with the SAME `Idempotency-Key`
//    replays the stored response (200). Only a FRESH key reaches the domain check and earns the
//    409. That asymmetry is the whole reason a manager who presses Approve twice sees a refusal
//    while a retried network call does not, and a fixture that refused on the key alone would prove
//    a product this one is not.
//
// 4. THE THREE READS ARE UNGATED. §9.2's kill-switch law: turning `workforce.export` off stops NEW
//    batches while the list, the period and the already-sent bytes keep answering. The list reports
//    `exportEnabled` so the page disables its buttons from the server's answer instead of guessing.
//
// 5. THE NEUTRAL CSV IS RENDERED BYTE-FOR-BYTE. Preamble order, `hours-only` basis, `wageMath=none`,
//    LF endings, no BOM, the SCREAMING_SNAKE cell vocabulary, and an EMPTY cell for unknown minutes
//    rather than `0`. A journey that downloaded a plausible-looking CSV would prove the button
//    works and nothing about the file an accountant receives.
//
// ---- WHAT IS NOT MODELLED ----------------------------------------------------------------------
//
// There is no shift/session engine. The backend derives lines from published shifts and clocked
// sessions; this seeds the RESULT, because the surface's contract is about what happens to a period
// once its lines exist. The same choice `workforce-delivery.js` makes about the dispatcher loop.
// There are also no SQL immutability triggers — those are a database guarantee (throw 50070–50073),
// they surface as a 500 rather than problem+json, and no browser can reach them. The refusal a UI
// can actually provoke is the service-layer one, and that is what is here.

'use strict';

const crypto = require('crypto');
const world = require('./world');

/** `WorkforceNeutralCsvTimesheetExportProvider.Key`. The default when a request names none. */
const DEFAULT_PROVIDER_KEY = 'okam-csv';
const PROVIDER_DISPLAY_NAME = 'Okam neutral CSV';

/** Every provider key registered on the backend. Named in the `provider-unknown` refusal. */
const AVAILABLE_PROVIDER_KEYS = [DEFAULT_PROVIDER_KEY];

/** `WorkforceHoursExportService.MaxRangeDays`, which the timesheet list applies too. */
const MAX_RANGE_DAYS = 62;

/**
 * The MANAGER's own staff-member row.
 *
 * The real `RequireWriteCapabilityAsync` answers with the caller's `WorkforceStaffMember`, so an
 * approver necessarily HAS one — a manager without a staff row is refused before the write, not
 * given a placeholder. `world.STAFF` describes the three workers; the manager is a fourth person on
 * that roster whom no other journey reads, so the id lives here rather than widening a shape several
 * journeys assert on.
 */
const MANAGER_STAFF_MEMBER_ID = '8a2f6b10-4c7d-4e93-b5a1-0d3e8f7c2b46';

/** Which signed-in user is which staff member. Keyed by `world.USERS[...].id`. */
const STAFF_MEMBER_BY_USER = {
  'user-manager': MANAGER_STAFF_MEMBER_ID,
  'user-worker': world.STAFF[0].staffMemberId
};

// ---- business dates ----------------------------------------------------------------------------

/** The venue's own civil date for an instant — the zone the whole surface is denominated in. */
function businessDateIn (date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: world.TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
  return parts;
}

function addDays (isoDate, days) {
  const at = new Date(isoDate + 'T12:00:00Z');
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

function dayCount (from, to) {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86400000) + 1;
}

/**
 * THE SEEDED FORTNIGHT — the fourteen venue days ending YESTERDAY.
 *
 * Relative to the clock rather than a hardcoded month, because a fixed past range would drift out of
 * whatever window the page offers and the journey would end up asserting against an empty period for
 * a reason that has nothing to do with the product. Ending yesterday rather than today keeps every
 * seeded day CLOSED — a period that included today would legitimately carry an open session, and
 * "today is still running" would be indistinguishable from the missing-punch row that is seeded on
 * purpose below.
 */
function seededRange (now) {
  const today = businessDateIn(now || new Date());
  const to = addDays(today, -1);
  return { from: addDays(to, -13), to };
}

// ---- the period id -----------------------------------------------------------------------------

/**
 * The digest the backend derives a period id from.
 *
 * Shape matters more than the algorithm: it must be a GUID, it must be STABLE for a given store and
 * range, and two different ranges must not collide — those are the three properties the id-mismatch
 * refusal depends on. Rendered as a v5-shaped GUID from a SHA-1 over the same three inputs the
 * server uses.
 */
function periodIdFor (storeId, from, to) {
  const hash = crypto.createHash('sha1')
    .update('okam.workforce.timesheet.period|' + storeId + '|' + from + '|' + to)
    .digest('hex');
  return hash.slice(0, 8) + '-' + hash.slice(8, 12) + '-5' + hash.slice(13, 16) + '-' +
    ((parseInt(hash.slice(16, 18), 16) & 0x3F | 0x80).toString(16)) + hash.slice(18, 20) + '-' +
    hash.slice(20, 32);
}

// ---- the seeded lines --------------------------------------------------------------------------

/**
 * One venue fortnight of attendance, as the rows a timesheet freezes.
 *
 * THREE PROPERTIES ARE SEEDED ON PURPOSE, and each one makes a refusal or a decision reachable:
 *
 *   • an UNPAID BREAK row, so `paid=false` and the `UNPAID_BREAK` pay code appear in the CSV. A file
 *     that only ever carried ordinary paid hours would not prove the vocabulary.
 *   • a MISSING PUNCH row with `minutes: null`, which is what makes the period INCOMPLETE. Without
 *     it `allowIncomplete` is dead weight, the `timesheet-period-incomplete` refusal is unreachable,
 *     and the empty-cell rule in the CSV is never exercised.
 *   • a line whose `plannedMinutes` and `minutes` DIFFER, because a timesheet that always matched
 *     the plan would make the whole surface pointless.
 */
function seedLines (range) {
  const lines = [];
  let ordinal = 0;

  const push = (staff, businessDate, payCode, paid, minutes, plannedMinutes, status) => {
    lines.push({
      staffMemberId: staff.staffMemberId,
      employmentNumber: staff.employmentNumber,
      displayName: staff.displayName,
      businessDate,
      payCode,
      paid,
      minutes,
      plannedMinutes,
      status,
      approvedAdjustments: 0,
      ordinal: ordinal++
    });
  };

  // Ola works the first Monday and the second; Kari one shift with an unpaid break; Nina's second
  // day is the missing punch.
  const d = n => addDays(range.from, n);

  push(world.STAFF[0], d(0), 'Ordinary', true, 450, 480, 'Complete');
  push(world.STAFF[0], d(1), 'Ordinary', true, 480, 480, 'Complete');
  push(world.STAFF[0], d(7), 'Ordinary', true, 465, 480, 'Complete');

  push(world.STAFF[1], d(2), 'Ordinary', true, 390, 360, 'Complete');
  push(world.STAFF[1], d(2), 'UnpaidBreak', false, 30, 30, 'Complete');
  push(world.STAFF[1], d(8), 'Ordinary', true, 360, 360, 'Complete');

  push(world.STAFF[2], d(3), 'Ordinary', true, 300, 300, 'Complete');
  // The row whose hours nobody can state. `minutes: null`, never 0 — the difference between "worked
  // no time" and "we do not know what this person worked" is the whole reason the column is nullable.
  push(world.STAFF[2], d(9), 'Ordinary', true, null, 300, 'MissingPunch');

  return lines;
}

function fresh () {
  const range = seededRange(new Date());
  return {
    range,
    lines: seedLines(range),
    /** Frozen periods by periodId. A period exists here only ONCE APPROVED. */
    periods: {},
    /** Export + adjustment batches, append-only, in creation order. */
    batches: [],
    /** Idempotency reservations by `storeId|periodId|route|key` → the stored response. */
    reservations: {}
  };
}

// ---- projections -------------------------------------------------------------------------------

function linesIn (state, from, to) {
  return state.lines.filter(l => l.businessDate >= from && l.businessDate <= to);
}

function paidMinutesOf (lines) {
  return lines.reduce((sum, l) => sum + (l.paid && typeof l.minutes === 'number' ? l.minutes : 0), 0);
}

function unpaidBreakMinutesOf (lines) {
  return lines.reduce((sum, l) =>
    sum + (l.payCode === 'UnpaidBreak' && typeof l.minutes === 'number' ? l.minutes : 0), 0);
}

function incompleteOf (lines) {
  return lines.filter(l => l.status !== 'Complete').length;
}

/**
 * `snapshotSha256` — a digest over the FROZEN ROWS, not over the CSV.
 *
 * The backend is explicit that these are two different things: the snapshot digest identifies what
 * was approved, `payloadSha256` identifies what was sent. Rendering one from the other would make
 * them agree by construction and destroy the only cross-check the surface has.
 */
function snapshotDigest (storeId, from, to, lines) {
  const canonical = ['okam.workforce.timesheet.v1', storeId, from, to]
    .concat(lines.map(l => [
      l.staffMemberId, l.businessDate, l.payCode, l.paid,
      l.minutes === null || l.minutes === undefined ? '' : l.minutes,
      l.status
    ].join(':')))
    .join('|');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** `Status` is a READ PROJECTION and is never persisted: `Exported` iff a succeeded batch exists. */
function statusOf (state, periodId) {
  const frozen = state.periods[periodId];
  if (!frozen) { return 'Open'; }
  return succeededBatches(state, periodId).length > 0 ? 'Exported' : 'Approved';
}

function batchesFor (state, periodId) {
  return state.batches.filter(b => b.timesheetPeriodId === periodId);
}

function succeededBatches (state, periodId) {
  return batchesFor(state, periodId).filter(b => b.outcome === 'Succeeded' && !b.isAdjustment);
}

function summaryOf (state, storeId, from, to) {
  const periodId = periodIdFor(storeId, from, to);
  const frozen = state.periods[periodId];
  const lines = frozen ? frozen.lines : linesIn(state, from, to);
  const batches = batchesFor(state, periodId);

  return {
    timesheetPeriodId: periodId,
    fromBusinessDate: from,
    toBusinessDate: to,
    status: statusOf(state, periodId),
    lineCount: lines.length,
    complete: incompleteOf(lines) === 0,
    incompleteRowCount: incompleteOf(lines),
    paidMinutes: paidMinutesOf(lines),
    unpaidBreakMinutes: unpaidBreakMinutesOf(lines),
    // Null while Open — the three fields a freeze creates. A fixture that filled them in early would
    // let a page ship that prints an approver's name on a period nobody has approved.
    approvedByActorReference: frozen ? frozen.approvedByActorReference : null,
    approvedAtUtc: frozen ? frozen.approvedAtUtc : null,
    snapshotSha256: frozen ? frozen.snapshotSha256 : null,
    succeededExportCount: batches.filter(b => b.outcome === 'Succeeded' && !b.isAdjustment).length,
    failedExportCount: batches.filter(b => b.outcome === 'Failed').length,
    adjustmentBatchCount: batches.filter(b => b.isAdjustment).length
  };
}

function batchModel (batch) {
  return {
    batchId: batch.batchId,
    timesheetPeriodId: batch.timesheetPeriodId,
    providerKey: batch.providerKey,
    batchKey: batch.batchKey,
    outcome: batch.outcome,
    failureReason: batch.failureReason || null,
    payloadSha256: batch.payloadSha256 || null,
    contentType: batch.contentType || null,
    fileName: batch.fileName || null,
    lineCount: batch.lineCount,
    requestedByActorReference: batch.requestedByActorReference,
    createdAtUtc: batch.createdAtUtc,
    isAdjustment: !!batch.isAdjustment,
    addedLineCount: batch.addedLineCount || 0,
    changedLineCount: batch.changedLineCount || 0,
    removedLineCount: batch.removedLineCount || 0
  };
}

function lineModel (line) {
  return {
    staffMemberId: line.staffMemberId,
    employmentNumber: line.employmentNumber,
    displayName: line.displayName,
    businessDate: line.businessDate,
    payCode: line.payCode,
    paid: line.paid,
    minutes: line.minutes === undefined ? null : line.minutes,
    plannedMinutes: line.plannedMinutes === undefined ? null : line.plannedMinutes,
    status: line.status,
    approvedAdjustments: line.approvedAdjustments || 0,
    ordinal: line.ordinal
  };
}

// ---- the neutral CSV ---------------------------------------------------------------------------

const PAY_CODE_CELL = { Ordinary: 'ORDINARY', UnpaidBreak: 'UNPAID_BREAK' };
const STATUS_CELL = {
  Complete: 'COMPLETE',
  OpenSession: 'OPEN_SESSION',
  MissingPunch: 'MISSING_PUNCH',
  UnsupportedAdjustment: 'UNSUPPORTED_ADJUSTMENT',
  InconsistentTimes: 'INCONSISTENT_TIMES'
};

/** RFC 4180: quote only when the value carries a delimiter, a quote or a newline. */
function field (value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

/** An unknown minute count is an EMPTY cell, never `0`. The same rule the model holds. */
function minutesCell (minutes) {
  return minutes === null || minutes === undefined ? '' : String(minutes);
}

/**
 * `WorkforceNeutralCsvTimesheetExportProvider.RenderAsync`, byte for byte.
 *
 * NO timestamp and NO random id in the preamble, deliberately: two renderings of one snapshot must
 * be byte-identical, which is what makes `payloadSha256` a property of the DATA rather than of the
 * moment somebody pressed the button.
 */
function renderCsv (options) {
  const o = options;
  const head = [
    '# okam-workforce-timesheet' + (o.isAdjustment ? '-adjustment' : ''),
    '# version=1',
    '# storeId=' + o.storeId,
    '# periodId=' + o.periodId,
    '# timeZoneId=' + world.TIME_ZONE,
    '# fromBusinessDate=' + o.from,
    '# toBusinessDate=' + o.to,
    '# basis=hours-only',
    '# wageMath=none',
    '# approvedByActorReference=' + o.approvedByActorReference,
    '# approvedAtUtc=' + o.approvedAtUtc,
    '# snapshotSha256=' + o.snapshotSha256,
    '# rowCount=' + o.lines.length,
    '# complete=' + (o.complete ? 'true' : 'false'),
    '# incompleteRowCount=' + o.incompleteRowCount
  ];
  if (o.isAdjustment) { head.push('# supersedesExportBatchId=' + o.supersedesExportBatchId); }

  const columns = ['staffMemberId', 'employmentNumber', 'displayName', 'businessDate', 'payCode',
    'paid', 'minutes', 'plannedMinutes', 'status', 'approvedAdjustments'];
  if (o.isAdjustment) { columns.push('change', 'previousMinutes'); }

  const rows = o.lines.map((l) => {
    const cells = [
      field(l.staffMemberId), field(l.employmentNumber), field(l.displayName),
      field(l.businessDate), PAY_CODE_CELL[l.payCode] || l.payCode,
      l.paid ? 'true' : 'false', minutesCell(l.minutes), minutesCell(l.plannedMinutes),
      STATUS_CELL[l.status] || l.status, String(l.approvedAdjustments || 0)
    ];
    if (o.isAdjustment) { cells.push(l.change || 'UNCHANGED', minutesCell(l.previousMinutes)); }
    return cells.join(',');
  });

  // LF endings and a trailing newline; UTF-8 with NO BOM.
  return head.concat([columns.join(',')]).concat(rows).join('\n') + '\n';
}

// ---- the actor -----------------------------------------------------------------------------------

/**
 * The caller's own staff-member id, or a throw.
 *
 * This is `caller.StaffMemberId.ToString()` in the real service, and the throw is
 * `AppendExportAudit`'s. It refuses rather than defaulting BECAUSE the value it produces is what a
 * payroll row is later explained by: a fixture that substituted a system actor would let a page ship
 * that writes money-bearing rows attributed to nobody, and no test could see it.
 */
function requireActor (caller) {
  const actor = caller && STAFF_MEMBER_BY_USER[caller.id];
  if (!actor) {
    throw new Error('A timesheet write requires a resolved actor; this caller has no staff member.');
  }
  return actor;
}

// ---- routes --------------------------------------------------------------------------------------

/**
 * The five timesheet routes. Returns true when it handled the request.
 *
 * `ctx` carries what the server already resolved: `{ res, req, method, rest, body, storeId, caller,
 * state, exportEnabled, send, problem, sendFile, idempotencyKey }`.
 */
function route (ctx) {
  // `caller`, `problem` and `sendFile` are reached through `ctx` at their own call sites rather than
  // destructured here — only the four this function itself dispatches on are lifted out.
  const { rest, method, send, state, storeId } = ctx;

  // ---- #27 list -------------------------------------------------------------------------------
  if (rest === '/timesheets' && method === 'GET') {
    const from = ctx.query.from;
    const to = ctx.query.to;
    if (!isBusinessDate(from) || !isBusinessDate(to)) {
      return moduleProblem(ctx, '\'from\' and \'to\' must be ISO business dates (yyyy-MM-dd).');
    }
    if (to < from) {
      return moduleProblem(ctx, '\'to\' must not precede \'from\'.');
    }
    if (dayCount(from, to) > MAX_RANGE_DAYS) {
      return moduleProblem(ctx,
        'The requested range exceeds the maximum window of ' + MAX_RANGE_DAYS + ' days.');
    }

    // The SYNTHESISED row for the requested range goes at index 0 — it is the period the manager
    // asked about, and it carries the id a later approve would use. Every OTHER frozen period that
    // overlaps the window follows it.
    const asked = summaryOf(state, storeId, from, to);
    const others = Object.keys(state.periods)
      .filter(id => id !== asked.timesheetPeriodId)
      .map(id => state.periods[id])
      .filter(p => p.fromBusinessDate <= to && p.toBusinessDate >= from)
      .map(p => summaryOf(state, storeId, p.fromBusinessDate, p.toBusinessDate));

    return send(ctx.res, 200, {
      storeId: Number(storeId),
      timeZoneId: world.TIME_ZONE,
      fromBusinessDate: from,
      toBusinessDate: to,
      exportEnabled: ctx.exportEnabled,
      periods: [asked].concat(others)
    });
  }

  const periodRoute = /^\/timesheets\/([^/]+)$/.exec(rest || '');
  if (periodRoute && method === 'GET') {
    return send(ctx.res, 200, detailOf(state, storeId, periodRoute[1]));
  }

  // ---- #28 approve ----------------------------------------------------------------------------
  const approveRoute = /^\/timesheets\/([^/]+)\/approve$/.exec(rest || '');
  if (approveRoute && method === 'POST') {
    return approve(ctx, approveRoute[1]);
  }

  // ---- #29 export -----------------------------------------------------------------------------
  const exportRoute = /^\/timesheets\/([^/]+)\/exports$/.exec(rest || '');
  if (exportRoute && method === 'POST') {
    return createExport(ctx, exportRoute[1]);
  }

  // ---- the download ---------------------------------------------------------------------------
  const downloadRoute = /^\/timesheets\/([^/]+)\/exports\/([^/]+)$/.exec(rest || '');
  if (downloadRoute && method === 'GET') {
    return download(ctx, downloadRoute[1], downloadRoute[2]);
  }

  return false;
}

function isBusinessDate (value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** A plain module 400 — no problem `code`, matching `ModuleControllerBase.ModuleProblem`. */
function moduleProblem (ctx, detail) {
  return ctx.send(ctx.res, 400, {
    type: 'https://httpstatuses.io/400', title: 'Bad Request', status: 400, detail
  });
}

function detailOf (state, storeId, periodId) {
  const frozen = state.periods[periodId];
  const from = frozen ? frozen.fromBusinessDate : null;
  const to = frozen ? frozen.toBusinessDate : null;
  const lines = frozen ? frozen.lines : [];

  return {
    period: frozen
      ? summaryOf(state, storeId, from, to)
      : {
        timesheetPeriodId: periodId,
        status: 'Open',
        lineCount: 0,
        complete: true,
        incompleteRowCount: 0,
        paidMinutes: 0,
        unpaidBreakMinutes: 0,
        approvedByActorReference: null,
        approvedAtUtc: null,
        snapshotSha256: null,
        succeededExportCount: 0,
        failedExportCount: 0,
        adjustmentBatchCount: 0,
        fromBusinessDate: null,
        toBusinessDate: null
      },
    timeZoneId: world.TIME_ZONE,
    lines: lines.map(lineModel),
    batches: batchesFor(state, periodId)
      .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc))
      .map(batchModel)
  };
}

/**
 * The idempotency reservation.
 *
 * Same key → the STORED response replays, and the domain check is never reached. That is the whole
 * asymmetry described in this file's header, so it is enforced before anything else.
 */
function replay (ctx, scope) {
  const key = scope + '|' + ctx.idempotencyKey;
  return Object.prototype.hasOwnProperty.call(ctx.state.reservations, key)
    ? ctx.state.reservations[key]
    : null;
}

function reserve (ctx, scope, response) {
  ctx.state.reservations[scope + '|' + ctx.idempotencyKey] = response;
  return response;
}

function approve (ctx, periodId) {
  const { state, storeId, send, res } = ctx;
  const body = ctx.body || {};

  const stored = replay(ctx, storeId + '|' + periodId + '|approve');
  if (stored) { return send(res, 200, stored); }

  if (!isBusinessDate(body.fromBusinessDate) || !isBusinessDate(body.toBusinessDate)) {
    return moduleProblem(ctx, '\'from\' and \'to\' must be ISO business dates (yyyy-MM-dd).');
  }

  // The id is a DIGEST of the range; addressing a period by an id that names a different one is a
  // refusal, not a redirect.
  if (periodIdFor(storeId, body.fromBusinessDate, body.toBusinessDate) !== periodId) {
    return wfProblem(ctx, 409, 'workforce.timesheet-period-id-mismatch',
      'The period id does not identify the business-date range in the request. A period\'s id is ' +
      'derived from its store and its range, so it cannot be addressed by an id that names a ' +
      'different one.');
  }

  if (state.periods[periodId]) {
    return wfProblem(ctx, 409, 'workforce.timesheet-period-already-approved',
      'This period was already approved and frozen. An approved period is immutable and is never ' +
      'reopened; a later correction leaves as an adjustment batch.',
      { approvedAtUtc: state.periods[periodId].approvedAtUtc });
  }

  const lines = linesIn(state, body.fromBusinessDate, body.toBusinessDate);
  if (!lines.length) {
    return wfProblem(ctx, 409, 'workforce.timesheet-period-empty',
      'No published shift and no clocked session falls inside this range, so there is nothing to ' +
      'approve. Freezing an empty period would put a payroll artifact on the record asserting that ' +
      'nobody worked.');
  }

  const incomplete = incompleteOf(lines);
  if (incomplete > 0 && body.allowIncomplete !== true) {
    return wfProblem(ctx, 409, 'workforce.timesheet-period-incomplete',
      'This period carries ' + incomplete + ' row(s) whose hours are unknown — an open session, a ' +
      'missing punch, or a correction that could not be applied. Fix them, or approve again with ' +
      'allowIncomplete to freeze the unknowns on the record.',
      { incompleteRowCount: incomplete });
  }

  // THE FREEZE. The actor is resolved from the caller and refuses rather than defaulting.
  const actor = requireActor(ctx.caller);
  const frozenLines = lines.map(l => Object.assign({}, l));

  state.periods[periodId] = {
    timesheetPeriodId: periodId,
    fromBusinessDate: body.fromBusinessDate,
    toBusinessDate: body.toBusinessDate,
    lines: frozenLines,
    approvedByActorReference: actor,
    approvedAtUtc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    snapshotSha256: snapshotDigest(storeId, body.fromBusinessDate, body.toBusinessDate, frozenLines)
  };

  // The real approve response builds its detail inline and never populates `batches`. Reproduced,
  // so a page that took this as the whole truth would be caught here rather than against the API.
  const response = {
    period: summaryOf(state, storeId, body.fromBusinessDate, body.toBusinessDate),
    timeZoneId: world.TIME_ZONE,
    lines: frozenLines.map(lineModel),
    batches: []
  };

  return send(res, 200, reserve(ctx, storeId + '|' + periodId + '|approve', response));
}

function createExport (ctx, periodId) {
  const { state, storeId, send, res } = ctx;
  const body = ctx.body || {};

  const stored = replay(ctx, storeId + '|' + periodId + '|export');
  if (stored) { return send(res, 200, stored); }

  const frozen = state.periods[periodId];
  if (!frozen) {
    return wfProblem(ctx, 409, 'workforce.timesheet-period-not-approved',
      'This period has not been approved, so there is no immutable snapshot to export. Approve it ' +
      'first (endpoint 28).');
  }

  const providerKey = body.providerKey || DEFAULT_PROVIDER_KEY;
  if (!AVAILABLE_PROVIDER_KEYS.includes(providerKey)) {
    return wfProblem(ctx, 409, 'workforce.timesheet-export-provider-unknown',
      'No export provider is registered under that key.',
      { requestedProviderKey: providerKey, availableProviderKeys: AVAILABLE_PROVIDER_KEYS });
  }

  const already = succeededBatches(state, periodId);
  if (already.length > 0) {
    // An exported period is NEVER re-sent whole. The only thing a second export can produce is an
    // adjustment carrying a delta — and with an immutable snapshot there is no delta to find.
    return wfProblem(ctx, 409, 'workforce.timesheet-nothing-to-reconcile',
      'This period has already been exported and nothing has changed since, so there is no ' +
      'adjustment to send. An exported period is never re-sent whole.');
  }

  const actor = requireActor(ctx.caller);
  const content = renderCsv({
    storeId,
    periodId,
    from: frozen.fromBusinessDate,
    to: frozen.toBusinessDate,
    approvedByActorReference: frozen.approvedByActorReference,
    approvedAtUtc: frozen.approvedAtUtc,
    snapshotSha256: frozen.snapshotSha256,
    complete: incompleteOf(frozen.lines) === 0,
    incompleteRowCount: incompleteOf(frozen.lines),
    lines: frozen.lines,
    isAdjustment: false
  });

  const batch = {
    batchId: crypto.randomUUID(),
    timesheetPeriodId: periodId,
    providerKey,
    batchKey: ctx.idempotencyKey,
    outcome: 'Succeeded',
    payloadSha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
    contentType: 'text/csv; charset=utf-8',
    fileName: 'okam-timesheet-' + storeId + '-' + frozen.fromBusinessDate + '-' +
      frozen.toBusinessDate + '.csv',
    lineCount: frozen.lines.length,
    requestedByActorReference: actor,
    createdAtUtc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    isAdjustment: false,
    content
  };

  state.batches.push(batch);
  return send(res, 200, reserve(ctx, storeId + '|' + periodId + '|export', batchModel(batch)));
}

/**
 * The bytes, verbatim.
 *
 * UNGATED — no `exportEnabled` check, deliberately. §9.2 says the surface goes read-only, and an
 * export batch nobody can retrieve is a database row rather than a payroll file.
 *
 * NOTE the response deliberately carries NO `Access-Control-Expose-Headers`, so a cross-origin
 * browser cannot read `X-Okam-Content-Sha256`. That matches the real API (the controller says so in
 * its own remarks) and is why the page reads `payloadSha256` off the batch model instead.
 */
function download (ctx, periodId, batchId) {
  const batch = ctx.state.batches.find(b =>
    b.batchId === batchId && b.timesheetPeriodId === periodId);

  if (!batch) {
    return wfProblem(ctx, 404, 'workforce.timesheet-export-batch-not-found',
      'This period has no such export batch.');
  }
  if (batch.outcome !== 'Succeeded') {
    return wfProblem(ctx, 409, 'workforce.timesheet-export-failed',
      'The export provider refused this batch. The attempt is recorded and its key is spent; retry ' +
      'with a fresh Idempotency-Key once the cause is fixed.',
      { providerKey: batch.providerKey, reason: batch.failureReason });
  }

  return ctx.sendFile(ctx.res, 200, batch.content, batch.contentType, batch.fileName, {
    'X-Okam-Content-Sha256': batch.payloadSha256
  });
}

/** RFC 9457 in the shape `WorkforceApiError` parses, with the workforce `type` base. */
function wfProblem (ctx, status, code, detail, extra) {
  return ctx.send(ctx.res, status, Object.assign({
    type: 'https://okam.no/problems/workforce/' + code.replace(/^workforce\./, ''),
    title: status === 409 ? 'Conflict' : 'Error',
    status,
    code,
    conflictKind: code.replace(/^workforce\./, ''),
    retryable: false,
    detail
  }, extra || {}));
}

module.exports = {
  fresh,
  route,
  periodIdFor,
  seededRange,
  renderCsv,
  DEFAULT_PROVIDER_KEY,
  PROVIDER_DISPLAY_NAME,
  MANAGER_STAFF_MEMBER_ID,
  MAX_RANGE_DAYS
};

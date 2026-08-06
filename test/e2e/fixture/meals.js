// The Company Meals half of the fixture backend: the concierge/company write surface, and the two
// invitee routes an invited employee calls.
//
// THE INVITEE ROUTES ARE THE POINT OF THIS FILE. Meals' admin surface is ordinary CRUD; its claim
// page is a security boundary, and the refusals it has to produce are things no unit test can
// observe. Three of them are modelled exactly:
//
//   • `meals.not-found` — a token that maps to no invitation and a module that is switched off are
//     THE SAME RESPONSE. There is no extension separating them (`_authorization.NotFound()` and
//     `RequireVisible()` both emit it), so the fixture emits one answer for both and the page names
//     both possibilities rather than asserting either.
//   • `meals.invitation-not-claimable` — carries `currentState`, because Claimed / Revoked / Expired
//     are three different conversations for the employee and collapsing them would send somebody to
//     ask for a reissue when they are already a member.
//   • `meals.invitation-contact-mismatch` — 403, AND THE PROBLEM DOCUMENT DELIBERATELY DOES NOT ECHO
//     THE INTENDED CONTACT. That is the server's own rule and the reason the refusal exists at all:
//     the contact check is what stops a forwarded token being a bearer credential for whoever holds
//     it, and a refusal naming the address would tell the holder exactly which account to acquire.
//
// ALL THREE ARE HELD HERE AND NONE IS CURRENTLY REACHABLE THROUGH THE UI. `pages/meals/join.vue`
// sends no bearer token on any load (see the finding in `journeys/meals-guest-claim.spec.js`), so
// both invitee routes answer 401 before any of the refusals above can fire. They are modelled anyway
// rather than deferred: the fixture is what the journey will use the day that one line is fixed, and
// deleting the contract because the client cannot currently reach it is how a contract stops being
// checked.
//
// THE SESSION ROUTE ANSWERS FOR AN INVITATION IN ANY STATE. That is this fixture's reading rather
// than a transcription: `MealsInvitationSessionModel` is a preview of what the token NAMES, and the
// claim path is where state and contact are enforced (`meals.invitation-not-claimable` and
// `meals.invitation-contact-mismatch` are both claim-time codes in `refusal-copy.js`). If the real
// service turns out to refuse the session too, the journey's later steps move up a screen and its
// assertions about the refusal copy are unaffected — but the reading is stated here rather than
// buried, because a fixture that silently guessed would be the wrong kind of evidence.
//
// BOTH INVITEE ROUTES ARE AUTHENTICATED. `MealsMembershipController` carries a class-level
// `[Authorize]` and neither action opts out, so the PREVIEW needs a bearer token exactly as the claim
// does. The fixture refuses an anonymous call, which is what makes the page's "sign in first" screen
// an honest statement of the platform's rule rather than a choice the client made.

const crypto = require('crypto');
const world = require('./world');

function stamp (offsetMs) {
  return new Date(Date.now() + (offsetMs || 0)).toISOString().slice(0, 19) + 'Z';
}

// ---- the statement world (endpoints #19–#23) ----------------------------------------------------
//
// WHY THESE EXACT VALUES. The one thing `pages/admin/meals-statements.vue` has to be proved to do is
// PRINT THE STORED MEMBER REFERENCE rather than reconstruct a plausible one, and an assertion can
// only show that if the stored value is unreachable by any other route through the payload. So every
// identifier a line carries is deliberately drawn from a different alphabet:
//
//   statementLineId  stl-…      allocationId  alc-…      orderId  ord-…      receipt  K-2026-…
//   memberDisplayRef ANS-2287   (line A)   /   4b050000-0000-0000-0000-000000000002   (line B)
//
// Line A's reference is a company payroll code that equals NOTHING else on the wire. Line B's is the
// bare membership id, which is what the bill really says when the invitation carried no employee
// reference (`MealsStatementService.MemberDisplayRef` falls back to it, and the row is frozen that
// way for good). A page that printed "the id it already had" fails A; one that printed a constant or
// a prefix fails B. Both are asserted BY VALUE.
//
// The membership ids are the ones L-MEALS-EMPREF's SQL tier used, and `ANS-2287` is the reference its
// finalized line carried, so the fixture and the proven backend behaviour name the same strings.
const STATEMENT_MEMBER_WITH_REF = '4b050000-0000-0000-0000-000000000001';
const STATEMENT_MEMBER_BARE = '4b050000-0000-0000-0000-000000000002';
const STATEMENT_EMPLOYEE_REF = 'ANS-2287';
const STATEMENT_PERIOD_YEAR = 2026;
const STATEMENT_PERIOD_MONTH = 6;

/** The corridor the seeded company already has here, so a statement has something to be drafted against. */
const STATEMENT_AGREEMENT_ID = 'agr-fixture-corridor';

function freshAllocations () {
  return [
    {
      allocationId: 'alc-2026-06-0001',
      membershipId: STATEMENT_MEMBER_WITH_REF,
      orderId: 'ord-2026-06-0117',
      sourceReceiptNumber: 'K-2026-000117',
      kind: 'Capture',
      grossMinor: 18900,
      netMinor: 17182,
      vatMinor: 1718,
      orderOccurredAtUtc: '2026-06-04T11:12:04Z'
    },
    {
      allocationId: 'alc-2026-06-0002',
      membershipId: STATEMENT_MEMBER_BARE,
      orderId: 'ord-2026-06-0140',
      sourceReceiptNumber: 'K-2026-000140',
      kind: 'Capture',
      grossMinor: 14500,
      netMinor: 13182,
      vatMinor: 1318,
      orderOccurredAtUtc: '2026-06-11T11:41:55Z'
    }
  ];
}

function fresh () {
  return {
    seq: 0,
    // The company the venue directory already knows about, plus everything created during a journey.
    companies: {
      [world.MEALS_COMPANY_ID]: {
        companyId: world.MEALS_COMPANY_ID,
        legalName: 'Nordane Holding AS',
        displayName: world.MEALS_COMPANY_NAME,
        organizationNumber: '912345678',
        countryCode: 'NO',
        status: 'Active',
        billingContactName: 'Regnskap',
        billingContactEmail: 'faktura@nordane.test',
        billingContactPhone: null,
        revision: 'mrev-1'
      }
    },
    // The seeded company already has an ACTIVE corridor here. Without one the venue directory reports
    // it with no `currency`, and the statement page — correctly — will not offer a company it cannot
    // name a currency for, because the currency is part of the corridor's identity and is what the
    // draft is keyed on. This adds no ROW to any list; the company was always in the directory.
    agreements: {
      [STATEMENT_AGREEMENT_ID]: {
        agreementId: STATEMENT_AGREEMENT_ID,
        companyId: world.MEALS_COMPANY_ID,
        storeId: String(world.STORE_ID),
        currency: world.CURRENCY,
        status: 'Active',
        effectiveFromUtc: '2026-01-01T00:00:00Z',
        sellerLegalName: 'Okam AS',
        revision: 'arev-' + STATEMENT_AGREEMENT_ID
      }
    },
    programs: {},
    invitations: JSON.parse(JSON.stringify(world.MEALS_INVITATIONS)),
    members: [
      // The two people the June statement bills. `employeeReference` is present on ONE of them, which
      // is the whole point — see the block comment above the constants.
      {
        membershipId: STATEMENT_MEMBER_WITH_REF,
        companyId: world.MEALS_COMPANY_ID,
        applicationUserId: 'usr-meals-fixture-a',
        employeeReference: STATEMENT_EMPLOYEE_REF,
        role: 'Employee',
        state: 'Revoked',
        claimedFromInvitationId: null,
        revision: 'mmrev-a'
      },
      {
        membershipId: STATEMENT_MEMBER_BARE,
        companyId: world.MEALS_COMPANY_ID,
        applicationUserId: 'usr-meals-fixture-b',
        employeeReference: null,
        role: 'Employee',
        state: 'Active',
        claimedFromInvitationId: null,
        revision: 'mmrev-b'
      }
    ],
    // What a draft materialises from. In the product these are funded-order allocations written by
    // the POS capture path; nothing an admin screen can create, which is why they are seeded.
    statementAllocations: freshAllocations(),
    statementRuns: {},
    // Bumped on every write to a run row, exactly as a SQL Server rowversion is: re-drafting rewrites
    // the run and its lines, so the revision moves even when the figures did not.
    statementRevSeq: 0,
    // Which company each invitation belongs to. Seeded invitations belong to the seeded company.
    invitationCompany: Object.keys(world.MEALS_INVITATIONS)
      .reduce((acc, token) => { acc[token] = world.MEALS_COMPANY_ID; return acc; }, {})
  };
}

function nextId (state, prefix) {
  state.seq += 1;
  return prefix + '-' + state.seq;
}

function companyModel (company) {
  return {
    companyId: company.companyId,
    legalName: company.legalName,
    displayName: company.displayName,
    organizationNumber: company.organizationNumber,
    countryCode: company.countryCode,
    status: company.status,
    billingContactName: company.billingContactName,
    billingContactEmail: company.billingContactEmail,
    billingContactPhone: company.billingContactPhone,
    revision: company.revision
  };
}

/** `MealsCompanyDirectoryEntry` — the venue's own view, and the ONLY read that carries the corridor. */
function directoryEntry (state, company) {
  const agreement = Object.keys(state.agreements)
    .map(id => state.agreements[id])
    .find(a => a.companyId === company.companyId && a.storeId === String(world.STORE_ID)) || null;
  return {
    companyId: company.companyId,
    displayName: company.displayName,
    legalName: company.legalName,
    organizationNumber: company.organizationNumber,
    companyStatus: company.status,
    agreementId: agreement ? agreement.agreementId : null,
    agreementStatus: agreement ? agreement.status : null,
    currency: agreement ? agreement.currency : null,
    activeMemberCount: state.members.filter(m => m.companyId === company.companyId && m.state === 'Active').length
  };
}

// `_token` is taken and ignored on purpose: it makes every call site read as "(token, invitation)"
// and therefore makes it obvious that the plaintext is IN SCOPE here and still not put on the wire.
function invitationModel (_token, invitation) {
  return {
    invitationId: invitation.invitationId,
    intendedContactEmail: invitation.contactEmail,
    intendedContactPhone: invitation.contactPhone,
    intendedRole: invitation.intendedRole,
    state: invitation.state,
    // BARE, no `Z`: Meals serialises `datetime2` columns without one, and the client's
    // `parseApiInstant` is what reads it as UTC rather than as browser-local wall clock.
    expiresAtUtc: String(invitation.expiresAtUtc).replace('Z', ''),
    revision: 'irev-' + invitation.invitationId,
    // Never on a read. Only the create response carries the plaintext, once — the server stores a
    // hash, so there is no route that can show it again.
    token: undefined
  };
}

function tokenFor (state, invitationId) {
  return Object.keys(state.invitations).find(t => state.invitations[t].invitationId === invitationId) || null;
}

// ---- statements ---------------------------------------------------------------------------------
//
// `Controllers/Meals/MealsStatementController.cs` #19–#23, modelled as far as this fixture honestly
// can. WHAT IS NOT MODELLED, named rather than left to be discovered:
//
//   • THE GATE. Every statement route resolves `IMealsFeatureGate` — BOTH `Features:Meals:Module`
//     and `Features:Meals:Statements`, host configuration read through `IOptionsMonitor` — and
//     `MealsFeatureFlags` withholds `meals.statements` from the per-store catalog on purpose, so
//     there is no override row for this fixture's `flagEffective` to consult and no lever a journey
//     could flip. These routes therefore always answer. A dark module's `meals.not-found` is
//     modelled below only for an unknown statement id, which is the same answer by design.
//   • THE AUTHORITY SPLIT. Draft and finalize are `RequireStoreAdminAsync`; the LIST is
//     `RequireCompanyAdminAsync` and refuses a store admin with `meals.forbidden`. The list refusal
//     IS modelled (it is a real thing the page is built around) but the store-admin check on draft
//     and finalize is not — the api-server's auth wall admits any signed-in caller, and every
//     identity in this world administers the seeded store anyway.
//   • REDRAFTING A FINALIZED PERIOD. The server's behaviour there is a correction path this surface
//     does not bind; the fixture refuses it as `meals.validation` rather than inventing a revision
//     chain nothing in this repo reads.
//
// DELIBERATELY NOT ANCHORED to the backend. `test/e2e/scripts/fixture-divergence.js` compares an
// ANCHORED route's refusals against the API's, and a route this fixture does not anchor is not its
// claim. Anchoring these five would widen that guard's claim set in the same change that introduces
// them, which is the wrong order: the anchors belong to a lane that can point the check at a real
// checkout and settle every exemption listed above. (The annotation tokens themselves are omitted
// rather than quoted here, because `test/fixture-refusal-divergence.test.js` reads them wherever
// they appear and a token in prose is a token the parser cannot place.)

function periodTag (year, month) {
  return String(year) + '-' + (month < 10 ? '0' + month : String(month));
}

/**
 * The content hash, over the lines and nothing else. Deterministic, so a re-draft that materialises
 * the same rows produces the same hash — which is what makes the REVISION, and not the hash, the
 * thing that moves on an idempotent re-draft.
 */
function contentHashOf (lines) {
  const canonical = lines.map(l => [
    l.allocationId, l.kind, l.memberDisplayRef, l.grossMinor, l.netMinor, l.vatMinor, l.orderOccurredAtUtc
  ].join('|')).join('\n');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** An opaque base64 revision, the shape a SQL Server rowversion arrives in. */
function nextRevision (state) {
  state.statementRevSeq += 1;
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(state.statementRevSeq, 4);
  return buffer.toString('base64');
}

/**
 * THE RULE THIS WHOLE LANE IS ABOUT. The member reference is resolved from the membership AT DRAFT
 * TIME and copied onto the line; the fallback is the membership's own id, and once the run is
 * finalized neither can be changed. `MealsStatementService.MemberDisplayRef` is this, exactly.
 */
function memberDisplayRefFor (state, membershipId) {
  const membership = state.members.find(m => m.membershipId === membershipId) || null;
  const reference = membership && membership.employeeReference;
  return (typeof reference === 'string' && reference.trim() !== '') ? reference.trim() : membershipId;
}

function materialiseLines (state, allocations) {
  return allocations
    // The server's own deterministic order: occurrence, then allocation id.
    .slice()
    .sort((a, b) => (a.orderOccurredAtUtc + a.allocationId).localeCompare(b.orderOccurredAtUtc + b.allocationId))
    .map((a, index) => ({
      statementLineId: 'stl-' + a.allocationId.replace(/^alc-/, ''),
      allocationId: a.allocationId,
      kind: a.kind,
      orderId: a.orderId,
      sourceReceiptNumber: a.sourceReceiptNumber,
      // READ FROM THE MEMBERSHIP AT THIS INSTANT, then frozen on the row.
      memberDisplayRef: memberDisplayRefFor(state, a.membershipId),
      grossMinor: a.grossMinor,
      netMinor: a.netMinor,
      vatMinor: a.vatMinor,
      vatLines: [{ vatPercent: 10, basisMinor: a.netMinor, vatMinor: a.vatMinor }],
      currency: world.CURRENCY,
      orderOccurredAtUtc: a.orderOccurredAtUtc,
      linkedFinalizedStatementRunId: null,
      _ordinal: index
    }));
}

function summaryOf (run) {
  return {
    statementRunId: run.statementRunId,
    companyId: run.companyId,
    storeId: run.storeId,
    currency: run.currency,
    periodYear: run.periodYear,
    periodMonth: run.periodMonth,
    status: run.status,
    lineCount: run.lines.length,
    totalGrossMinor: run.lines.reduce((sum, l) => sum + l.grossMinor, 0),
    totalNetMinor: run.lines.reduce((sum, l) => sum + l.netMinor, 0),
    totalVatMinor: run.lines.reduce((sum, l) => sum + l.vatMinor, 0),
    contentHash: run.contentHash,
    revision: run.revision,
    finalizedAtUtc: run.finalizedAtUtc,
    createdAtUtc: run.createdAtUtc
  };
}

/** `MealsStatementDetailModel` — the summary and its lines, which is what #19, #20 and #22 return. */
function detailOf (run) {
  return {
    summary: summaryOf(run),
    lines: run.lines.map((l) => {
      const line = Object.assign({}, l);
      delete line._ordinal;
      return line;
    })
  };
}

function csvOf (run) {
  const summary = summaryOf(run);
  const major = minor => (minor / 100).toFixed(2);
  const head = [
    '# okam-meals-statement',
    '# statementRunId=' + summary.statementRunId,
    '# buyerCompanyId=' + summary.companyId,
    '# storeId=' + summary.storeId,
    '# currency=' + summary.currency,
    '# period=' + periodTag(summary.periodYear, summary.periodMonth),
    '# status=' + summary.status,
    '# lineCount=' + summary.lineCount,
    '# totalGross=' + major(summary.totalGrossMinor),
    '# totalNet=' + major(summary.totalNetMinor),
    '# totalVat=' + major(summary.totalVatMinor),
    '# contentHash=' + summary.contentHash
  ];
  const header = 'allocationId,orderId,receiptNumber,occurredAtUtc,memberDisplayRef,kind,gross,net,vat,currency,vatBreakdown,linkedFinalizedStatementRunId';
  const rows = run.lines.map(l => [
    l.allocationId,
    l.orderId,
    l.sourceReceiptNumber,
    l.orderOccurredAtUtc,
    // Column five, and the reason this file exists. Exactly the stored value; never re-derived.
    l.memberDisplayRef,
    l.kind,
    major(l.grossMinor),
    major(l.netMinor),
    major(l.vatMinor),
    l.currency,
    l.vatLines.map(v => v.vatPercent + ':' + major(v.basisMinor) + ':' + major(v.vatMinor)).join(';'),
    l.linkedFinalizedStatementRunId === null ? '' : l.linkedFinalizedStatementRunId
  ].join(','));
  // LF, no BOM, as the export service writes it.
  return head.concat([header]).concat(rows).join('\n') + '\n';
}

function route (ctx) {
  const { method, body, caller } = ctx;
  const state = ctx.state.meals;
  const path = ctx.path;

  // ---- the venue directory (store-scoped, per-store `meals.module` flag) -------------------------
  const directory = /^\/v1\/stores\/([^/]+)\/meals\/companies$/.exec(path);
  if (directory && method === 'GET') {
    ctx.send(200, Object.keys(state.companies).map(id => directoryEntry(state, state.companies[id])));
    return true;
  }

  const orders = /^\/v1\/stores\/([^/]+)\/meals\/orders$/.exec(path);
  if (orders && method === 'GET') {
    ctx.send(200, []);
    return true;
  }

  // ---- the corridor agreement — store-addressable, so the store is in the PATH and the request
  //      model has no `storeId` at all: a cross-store write is unrepresentable, not merely refused.
  const sign = /^\/v1\/stores\/([^/]+)\/meals\/companies\/([^/]+)\/agreements$/.exec(path);
  if (sign && method === 'POST') {
    const storeId = decodeURIComponent(sign[1]);
    const companyId = decodeURIComponent(sign[2]);
    if (!state.companies[companyId]) { return refuse(ctx, 404, 'meals.not-found', 'No such company.'); }
    // ONE ACTIVE CORRIDOR per (company, store, currency). A second signing is refused; superseding is
    // End-then-sign, and there is no update route.
    const existing = Object.keys(state.agreements)
      .map(id => state.agreements[id])
      .find(a => a.companyId === companyId && a.storeId === storeId && a.status === 'Active');
    if (existing) {
      return refuse(ctx, 400, 'meals.validation', 'An active agreement already exists for this company, store and currency.');
    }
    const agreementId = nextId(state, 'agr');
    state.agreements[agreementId] = {
      agreementId,
      companyId,
      storeId,
      currency: world.CURRENCY,
      status: 'Active',
      // Resolved INSIDE the idempotency envelope server-side, which is why the client omits it: a
      // retry replays instead of hashing a fresh clock reading into a different command.
      effectiveFromUtc: stamp(),
      sellerLegalName: (body && body.sellerLegalName) || null,
      revision: 'arev-' + agreementId
    };
    ctx.send(200, state.agreements[agreementId]);
    return true;
  }

  // ---- the invitee's two routes -----------------------------------------------------------------
  //
  // Anchored to the backend they stand in for, so `npm run test:e2e:fixture-divergence` can compare
  // what these two answer against `MealsMembershipController` rather than a reader doing it by eye.
  // The refusals Meals can give here and this fixture cannot are declared below with their reasons.
  //
  // @backend-unmodelled 403 meals.forbidden — the module gate and the company-admin gate are answered
  //   by the api-server auth wall before a request reaches this file, so no handler here can produce
  //   the module's own 403; a caller with no bearer is refused `AUTH_REQUIRED` upstream.
  // @backend-unmodelled 404 MEALS_NOT_FOUND — the legacy uppercase wire code survives on the module's
  //   opaque not-found; this fixture answers the current `meals.not-found` spelling only, which is
  //   what the client reads.
  // @backend-unmodelled 409 meals.invitation-expired — an invitation here carries an `expiresAtUtc`
  //   the pages render, but nothing in the fixture advances a clock past it, so a modelled refusal
  //   would be a branch no journey could ever reach.
  // @backend-unmodelled 400 meals.validation — the session route validates its token shape server
  //   side; this fixture treats an unknown token as absent, which is the same 404 the backend gives
  //   for a well-formed token nobody issued.
  // @backend-unmodelled 409 meals.invitation-not-claimable — answered by the claim route below; the
  //   session route reaches it too because the backend previews a claimable invitation only, and
  //   this fixture's session preview does not re-check the state its claim route checks.
  //
  // @backend POST /v1/meals/invitations/session
  if (path === '/v1/meals/invitations/session' && method === 'POST') {
    const token = (body && body.token) || '';
    const invitation = state.invitations[token];
    if (!invitation) {
      // The same answer as a module that is switched off. Nothing may split them.
      return refuse(ctx, 404, 'meals.not-found', 'No invitation matches this code.');
    }
    const company = state.companies[state.invitationCompany[token]] || null;
    ctx.send(200, {
      sessionToken: 'sess-' + invitation.invitationId,
      expiresAtUtc: stamp(10 * 60 * 1000),
      companyId: company ? company.companyId : null,
      // The WHOLE projection: no allowance, no venue, no inviter. A page rendering this cannot show
      // those and the claim screen says so in as many words rather than leaving the gap to be read
      // as "there is no budget attached".
      companyDisplayName: company ? company.displayName : null,
      intendedRole: invitation.intendedRole
    });
    return true;
  }

  // @backend POST /v1/meals/invitations/claim
  if (path === '/v1/meals/invitations/claim' && method === 'POST') {
    const token = (body && body.token) || '';
    if (!token) { return refuse(ctx, 400, 'meals.validation', 'The request carried no token.'); }
    const invitation = state.invitations[token];
    if (!invitation) { return refuse(ctx, 404, 'meals.not-found', 'No invitation matches this code.'); }

    if (invitation.state !== 'Pending') {
      // The state travels WITH the refusal: Claimed, Revoked and Expired are three different
      // conversations and the copy branches on it.
      return refuse(ctx, 409, 'meals.invitation-not-claimable',
        'This invitation can no longer be claimed.', { currentState: invitation.state });
    }

    const contact = String(invitation.contactEmail || '').toLowerCase();
    const callerEmail = String((caller && caller.email) || '').toLowerCase();
    const callerPhone = String((caller && caller.phoneNumber) || '');
    const matches = (contact && contact === callerEmail) ||
      (invitation.contactPhone && invitation.contactPhone === callerPhone);
    if (!matches) {
      // 403, AND THE DOCUMENT NAMES NOBODY. `MealsProblemCodes.InvitationContactMismatch`
      // "deliberately does NOT echo the intended contact" — a forwarded token in the wrong hands
      // would otherwise be told exactly which account to go and acquire.
      return refuse(ctx, 403, 'meals.invitation-contact-mismatch',
        'This invitation was issued to a different contact.');
    }

    if (state.members.some(m => m.applicationUserId === caller.id && m.companyId === state.invitationCompany[token])) {
      return refuse(ctx, 409, 'meals.already-member', 'This account is already a member of the company.');
    }

    invitation.state = 'Claimed';
    const membership = {
      membershipId: nextId(state, 'mem'),
      companyId: state.invitationCompany[token],
      applicationUserId: caller.id,
      role: invitation.intendedRole,
      state: 'Active',
      claimedFromInvitationId: invitation.invitationId,
      revision: 'mmrev-1'
    };
    state.members.push(membership);
    ctx.send(200, membership);
    return true;
  }

  // ---- the company-scoped surface ---------------------------------------------------------------
  if (path === '/v1/meals/companies' && method === 'POST') {
    const companyId = nextId(state, 'comp');
    state.companies[companyId] = {
      companyId,
      legalName: (body && body.legalName) || '',
      displayName: (body && body.displayName) || (body && body.legalName) || '',
      organizationNumber: (body && body.organizationNumber) || '',
      countryCode: (body && body.countryCode) || 'NO',
      status: 'Active',
      billingContactName: (body && body.billingContactName) || null,
      billingContactEmail: (body && body.billingContactEmail) || null,
      billingContactPhone: (body && body.billingContactPhone) || null,
      revision: 'mrev-' + companyId
    };
    // A company is created TOGETHER WITH its first active CompanyAdmin membership — the only
    // bootstrap path, since every other route resolves authority from one and never from PowerUser.
    state.members.push({
      membershipId: nextId(state, 'mem'),
      companyId,
      applicationUserId: (body && body.adminApplicationUserId) || (caller && caller.id),
      role: 'CompanyAdmin',
      state: 'Active',
      claimedFromInvitationId: null,
      revision: 'mmrev-1'
    });
    ctx.send(200, companyModel(state.companies[companyId]));
    return true;
  }

  const companyRoute = /^\/v1\/meals\/companies\/([^/]+)(\/.*)?$/.exec(path);
  if (companyRoute) {
    const companyId = decodeURIComponent(companyRoute[1]);
    const rest = companyRoute[2] || '';
    const company = state.companies[companyId] || null;
    if (!company) { return refuse(ctx, 404, 'meals.not-found', 'No such company.'); }

    if (!rest && method === 'GET') { ctx.send(200, companyModel(company)); return true; }

    if (!rest && method === 'POST') {
      if ((body && body.expectedVersion) && body.expectedVersion !== company.revision) {
        return refuse(ctx, 409, 'meals.stale-revision', 'The company has changed since it was read.');
      }
      company.displayName = (body && body.displayName) || company.displayName;
      company.billingContactName = body && 'billingContactName' in body ? body.billingContactName : company.billingContactName;
      company.billingContactEmail = body && 'billingContactEmail' in body ? body.billingContactEmail : company.billingContactEmail;
      company.revision = company.revision + 'x';
      ctx.send(200, companyModel(company));
      return true;
    }

    if (rest === '/programs' && method === 'GET') {
      ctx.send(200, Object.keys(state.programs)
        .map(id => state.programs[id])
        .filter(p => p.companyId === companyId));
      return true;
    }

    if (rest === '/programs' && method === 'POST') {
      const agreement = state.agreements[(body && body.agreementId) || ''] || null;
      // An agreement that is not this company's is an OPAQUE 404; one that is not Active is a
      // validation 400. The programme itself carries no store — store, currency and seller all
      // resolve through the agreement.
      if (!agreement || agreement.companyId !== companyId) {
        return refuse(ctx, 404, 'meals.not-found', 'No such agreement.');
      }
      if (agreement.status !== 'Active') {
        return refuse(ctx, 400, 'meals.validation', 'The agreement is not active.');
      }
      const programId = nextId(state, 'prog');
      state.programs[programId] = {
        programId,
        companyId,
        agreementId: agreement.agreementId,
        storeId: Number(agreement.storeId),
        currency: agreement.currency,
        name: (body && body.name) || '',
        status: 'Active',
        currentPolicyVersion: null,
        enrolledMemberCount: 0,
        revision: 'prev-' + programId
      };
      ctx.send(200, state.programs[programId]);
      return true;
    }

    if (rest === '/invitations' && method === 'GET') {
      ctx.send(200, Object.keys(state.invitations)
        .filter(t => state.invitationCompany[t] === companyId)
        .map(t => invitationModel(t, state.invitations[t])));
      return true;
    }

    if (rest === '/invitations' && method === 'POST') {
      // `intendedContact*`, spelled the way `CreateMealsInvitationRequest` spells it. Accepting a
      // shorter alias here would let the page send the wrong field name and still pass.
      const email = ((body && body.intendedContactEmail) || '').trim();
      const phone = ((body && body.intendedContactPhone) || '').trim();
      // EXACTLY ONE contact channel, so the intended recipient is identifiable — and it is more than
      // a label: it is what the claim's contact check compares against.
      if ((!email && !phone) || (email && phone)) {
        return refuse(ctx, 400, 'meals.validation', 'Exactly one contact channel is required.');
      }
      const invitationId = nextId(state, 'inv');
      const token = 'mealsinv_' + invitationId;
      state.invitations[token] = {
        invitationId,
        contactEmail: email || null,
        contactPhone: phone || null,
        intendedRole: (body && body.intendedRole) || 'Employee',
        state: 'Pending',
        expiresAtUtc: stamp(Number((body && body.expiresInDays) || 14) * 24 * 3600 * 1000)
      };
      state.invitationCompany[token] = companyId;
      // The plaintext token is handed back HERE AND TO NOBODY ELSE. The module has no outbox, no SMS
      // and no mail — an invitation reaches a person only because a human relays it.
      ctx.send(200, Object.assign(invitationModel(token, state.invitations[token]), { token }));
      return true;
    }

    const revokeRoute = /^\/invitations\/([^/]+)\/revoke$/.exec(rest);
    if (revokeRoute && method === 'POST') {
      const invitationId = decodeURIComponent(revokeRoute[1]);
      const token = tokenFor(state, invitationId);
      const invitation = token ? state.invitations[token] : null;
      if (!invitation) { return refuse(ctx, 404, 'meals.not-found', 'No such invitation.'); }
      if (invitation.state === 'Claimed') {
        return refuse(ctx, 409, 'meals.invitation-not-claimable',
          'A claimed invitation cannot be revoked; its membership already exists.',
          { currentState: invitation.state });
      }
      invitation.state = 'Revoked';
      ctx.send(200, invitationModel(token, invitation));
      return true;
    }

    // #21. `RequireCompanyAdminAsync` — the BUYER's read. Authority is an active CompanyAdmin
    // membership and nothing else, so the venue's own store admin is refused here even though the
    // same person may draft and export. Modelled because that refusal is what the page renders a
    // sentence from; an empty list would be a different, false claim.
    if (rest === '/statements' && method === 'GET') {
      const isCompanyAdmin = state.members.some(m =>
        m.companyId === companyId && m.role === 'CompanyAdmin' && m.state === 'Active' &&
        caller && m.applicationUserId === caller.id);
      if (!isCompanyAdmin) {
        return refuse(ctx, 403, 'meals.forbidden', 'A company administrator membership is required.');
      }
      ctx.send(200, {
        statements: Object.keys(state.statementRuns)
          .map(id => state.statementRuns[id])
          .filter(r => r.companyId === companyId)
          .map(summaryOf)
      });
      return true;
    }

    if (rest === '/members' && method === 'GET') {
      ctx.send(200, state.members.filter(m => m.companyId === companyId));
      return true;
    }
  }

  const policyRoute = /^\/v1\/meals\/programs\/([^/]+)\/policies$/.exec(path);
  if (policyRoute && method === 'POST') {
    const program = state.programs[decodeURIComponent(policyRoute[1])] || null;
    if (!program) { return refuse(ctx, 404, 'meals.not-found', 'No such programme.'); }
    const expected = (body && body.expectedCurrentVersion);
    const current = program.currentPolicyVersion === null ? 0 : program.currentPolicyVersion;
    if (expected !== current) {
      // Two admins never silently clobber each other: a policy change is always a NEW immutable
      // version and there is no edit route.
      return refuse(ctx, 409, 'meals.stale-policy-version',
        'The programme has moved on since this form was opened.');
    }
    if ((body && body.currency) && body.currency !== program.currency) {
      return refuse(ctx, 409, 'meals.currency-mismatch', 'A policy must be issued in the corridor currency.');
    }
    program.currentPolicyVersion = current + 1;
    ctx.send(200, {
      programId: program.programId,
      version: program.currentPolicyVersion,
      currency: program.currency,
      status: 'Active'
    });
    return true;
  }

  // ---- statements #19-#23 ------------------------------------------------------------------------
  //
  // #19 and #20 are modelled although `utils/meals/statement-client.js` binds neither: the month
  // close is `components/admin/meals/MealsMonthClose.vue`'s, and a harness that could not produce a
  // FINALIZED run could not put the frozen line under a browser at all. `meals-statement-month`
  // drives these two through the API context and says so in its own artifact, step by step, rather
  // than letting a reader assume a control performed them.

  const draftRoute = /^\/v1\/stores\/([^/]+)\/meals\/statements\/drafts$/.exec(path);
  if (draftRoute && method === 'POST') {
    const storeId = decodeURIComponent(draftRoute[1]);
    const companyId = (body && body.companyId) || '';
    const year = body && body.periodYear;
    const month = body && body.periodMonth;
    if (!state.companies[companyId]) { return refuse(ctx, 404, 'meals.not-found', 'No such company.'); }
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return refuse(ctx, 400, 'meals.validation', 'A period year and month are required.');
    }
    const agreement = Object.keys(state.agreements)
      .map(id => state.agreements[id])
      .find(a => a.companyId === companyId && a.storeId === String(storeId) && a.status === 'Active') || null;
    if (!agreement) { return refuse(ctx, 404, 'meals.not-found', 'No active agreement for this company here.'); }
    if ((body && body.currency) && body.currency !== agreement.currency) {
      return refuse(ctx, 400, 'meals.validation', 'The currency must be the corridor currency.');
    }

    const key = [storeId, companyId, agreement.currency, periodTag(year, month)].join('|');
    const existing = Object.keys(state.statementRuns)
      .map(id => state.statementRuns[id])
      .find(r => r.periodKey === key) || null;
    if (existing && existing.status === 'Finalized') {
      // The correction path for a finalized period is not a route this repo binds; refused rather
      // than invented. Declared in the block comment above `periodTag`.
      return refuse(ctx, 400, 'meals.validation', 'This period is already finalized.');
    }

    // Only this company's allocations, and only this period's. `orderOccurredAtUtc` is the period's
    // own clock; the module exposes no store timezone, so the fixture compares the UTC month exactly
    // as the tag does and takes no position on the boundary defect the product still carries.
    const allocations = state.statementAllocations
      .filter(a => String(a.orderOccurredAtUtc).slice(0, 7) === periodTag(year, month));
    const lines = materialiseLines(state, allocations);
    const run = existing || {
      statementRunId: 'stmt-' + periodTag(year, month) + '-' + companyId,
      companyId,
      storeId: String(storeId),
      currency: agreement.currency,
      periodYear: year,
      periodMonth: month,
      periodKey: key,
      status: 'Draft',
      finalizedAtUtc: null,
      createdAtUtc: stamp()
    };
    run.lines = lines;
    run.contentHash = contentHashOf(lines);
    // The run row was rewritten, so its rowversion moves — even when the figures did not.
    run.revision = nextRevision(state);
    state.statementRuns[run.statementRunId] = run;
    ctx.send(200, detailOf(run));
    return true;
  }

  const finalizeRoute = /^\/v1\/meals\/statements\/([^/]+)\/finalize$/.exec(path);
  if (finalizeRoute && method === 'POST') {
    const run = state.statementRuns[decodeURIComponent(finalizeRoute[1])] || null;
    if (!run) { return refuse(ctx, 404, 'meals.not-found', 'No such statement.'); }
    if (run.status === 'Finalized') {
      return refuse(ctx, 409, 'meals.stale-revision', 'The submitted expected version is stale; the resource has since changed.', {
        conflictKind: 'stale-revision',
        aggregateId: run.statementRunId,
        submittedRevision: (body && body.expectedVersion) || null,
        currentRevision: run.revision,
        retryable: true,
        latestResourceRef: 'v1/meals/statements/' + run.statementRunId
      });
    }
    const expectedHash = body && body.expectedContentHash;
    if (expectedHash && expectedHash !== run.contentHash) {
      return refuse(ctx, 409, 'meals.statement-content-changed',
        'The statement draft has changed since it was read; re-draft and re-read the content hash before finalizing.', {
          conflictKind: 'statement-content-changed',
          expectedContentHash: expectedHash,
          currentContentHash: run.contentHash,
          retryable: true
        });
    }
    const expectedVersion = body && body.expectedVersion;
    if (expectedVersion && expectedVersion !== run.revision) {
      return refuse(ctx, 409, 'meals.stale-revision', 'The submitted expected version is stale; the resource has since changed.', {
        conflictKind: 'stale-revision',
        aggregateId: run.statementRunId,
        submittedRevision: expectedVersion,
        currentRevision: run.revision,
        retryable: true,
        latestResourceRef: 'v1/meals/statements/' + run.statementRunId
      });
    }
    // FINALIZE DOES NOT RE-MATERIALISE THE LINES and does not recompute the hash: it freezes what the
    // last draft produced. That is what makes the member reference on a finalized line the one that
    // was resolved at DRAFT time, and it is the property this whole surface exists to show.
    run.status = 'Finalized';
    run.finalizedAtUtc = stamp();
    run.revision = nextRevision(state);
    ctx.send(200, detailOf(run));
    return true;
  }

  const statementRoute = /^\/v1\/meals\/statements\/([^/]+)$/.exec(path);
  if (statementRoute && method === 'GET') {
    const run = state.statementRuns[decodeURIComponent(statementRoute[1])] || null;
    // A dark module and an absent statement are ONE answer. Nothing may split them.
    if (!run) { return refuse(ctx, 404, 'meals.not-found', 'The requested Company Meals resource was not found.'); }
    ctx.send(200, detailOf(run));
    return true;
  }

  const exportRoute = /^\/v1\/meals\/statements\/([^/]+)\/export$/.exec(path);
  if (exportRoute && method === 'GET') {
    const run = state.statementRuns[decodeURIComponent(exportRoute[1])] || null;
    if (!run) { return refuse(ctx, 404, 'meals.not-found', 'The requested Company Meals resource was not found.'); }
    const format = (ctx.url.searchParams.get('format') || 'csv').trim().toLowerCase();
    if (format !== 'csv') {
      return refuse(ctx, 400, 'meals.export-format-unsupported', 'Only csv is supported.');
    }
    const fileName = 'meals-statement-' + periodTag(run.periodYear, run.periodMonth) + '-' +
      String(run.statementRunId).replace(/-/g, '') + '.csv';
    // Written through `ctx.res` rather than `ctx.sendText`, which takes no extra headers: this route
    // carries two the client reads, and `Access-Control-Expose-Headers` is what makes them readable
    // at all from a cross-origin admin. Withholding it would make the page's "we named this file
    // ourselves" fallback untestable — which is exactly the branch that must not be a guess.
    ctx.res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + fileName + '"',
      'X-Meals-Content-Hash': run.contentHash,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Meals-Content-Hash',
      'Cache-Control': 'no-store'
    });
    ctx.res.end(csvOf(run));
    return true;
  }

  return false;
}

function refuse (ctx, status, code, detail, extra) {
  ctx.problem(status, code, detail, extra);
  return true;
}

module.exports = {
  fresh,
  route,
  // Exported so `journeys/meals-statement-month.spec.js` asserts against the SAME strings this file
  // seeds, rather than re-typing them. A journey that typed its own copy would go green against a
  // fixture that had since changed underneath it — which is the whole class of defect the world
  // module exists to prevent.
  STATEMENT_MEMBER_WITH_REF,
  STATEMENT_MEMBER_BARE,
  STATEMENT_EMPLOYEE_REF,
  STATEMENT_PERIOD_YEAR,
  STATEMENT_PERIOD_MONTH
};

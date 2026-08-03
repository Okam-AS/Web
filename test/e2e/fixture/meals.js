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

const world = require('./world');

function stamp (offsetMs) {
  return new Date(Date.now() + (offsetMs || 0)).toISOString().slice(0, 19) + 'Z';
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
    agreements: {},
    programs: {},
    invitations: JSON.parse(JSON.stringify(world.MEALS_INVITATIONS)),
    members: [],
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

  return false;
}

function refuse (ctx, status, code, detail, extra) {
  ctx.problem(status, code, detail, extra);
  return true;
}

module.exports = { fresh, route };

// The Growth OPERATOR half of the fixture backend — the newsletter send flow.
//
// `/admin/growth-newsletter` runs draft -> test send -> approval -> gate -> dispatch, and until now
// nothing in this fixture answered a single one of its routes. The plan records the whole flow as
// `reachable · undriven` and says the two things worth showing a colleague are on it: **the gate
// fails closed** — "we could not read consent" never renders as "consent is absent", and neither ever
// renders as "consent is granted" — and **the approval screen admits it is not informed**, because it
// cannot show the newsletter body and says so rather than implying the reviewer saw what they
// approved. Neither is checkable without a backend to drive it.
//
// ---- WHAT MAKES THIS FILE DIFFERENT FROM THE OTHER TWO -----------------------------------------
//
//   1. A DIFFERENT ERROR ENVELOPE. Growth does not use RFC 9457: `GrowthErrorEnvelope` pins
//      `{ "error": { code, message, traceId } }`, and `GrowthApiError` reads `body.error.code`. A
//      problem+json body here would hand the page `code: null` for every refusal — silently, with no
//      exception — and the page keys every sentence on the code, so all of them would collapse into
//      the generic one.
//   2. THE GATE IS NOT A ROUTE. Every other module in this fixture decides its own gate and answers a
//      refusal. Growth's send gate is computed IN THE BROWSER, by `utils/growth/send-gate.js`, out of
//      four independent reads — the consent summary, the audience snapshot, the newsletter's own
//      approval, and the per-store flags read straight off `GET /stores/{id}/feature-flags`. So this
//      file's job is to answer those reads honestly and let the page reach its own conclusion. The
//      flags come from the SHARED override store the operator switchboard writes, which is what makes
//      `growth.module` and `growth.dispatch` real levers here rather than decoration.
//   3. NO EFFECTIVE-FLAG RESOLVER, AND THAT ASYMMETRY IS LOAD-BEARING.
//      `utils/platform/feature-flags-client.js` records that only Workforce and Margin register an
//      `IStoreFeatureFlagEffectiveResolver`; Growth's real gate ANDs the per-store row under the
//      deployment-wide `Growth:Enabled` config switch, which this read cannot see. So
//      `effective === false` means the gate WILL refuse, and `effective === true` means it MAY still
//      refuse. `send-gate.js` honours exactly that — only an explicit `false` blocks, a `true` is
//      never treated as a promise — and this fixture must not model a resolver it does not have.
//
// WHAT IT DOES NOT DO: send anything. `Program.cs` binds the mail provider to a deterministic fake
// and the transactional sender carries no SMTP dependency at all, so no newsletter leaves any process
// on this branch. `providers` below therefore reports the account a venue has been given, never an
// engine that would deliver — which is precisely what the page's own note says it is reporting.
//
// ---- WHAT KEEPS THIS FILE LEVEL WITH THE BACKEND ----------------------------------------------
//
// Each handler below is annotated with the backend route it stands in for, and
// `npm run test:e2e:fixture-divergence` compares the (status, code) pairs this file can answer
// against the ones that controller can. It exists because this very handler was found a release
// behind: the test-send guard checked address equality but not the confirmation flag, and answered
// `400 growth.test_address_not_own` where the API answers `403`. A journey against that would have
// walked a world that never refused anything.
//
// The refusals `GrowthNewslettersController` can give that this file deliberately does not are
// declared here, with the reason each one has no counterpart. Forgetting to declare one makes the
// check RED, never green, and a declaration the backend has dropped is reported as stale.
//
// @backend-unmodelled 401 growth.unattributed — `RequireUserId()` refuses a token carrying no
//   resolvable identity. Every bearer in this fixture's world maps to a user, and `api-server.js`
//   answers `AUTH_REQUIRED` before a request reaches this file, so the state has no counterpart.
// @backend-unmodelled 409 growth.preference_centre_unconfigured — a deployment-configuration probe
//   over `PreferenceCentreBaseUrl`. This fixture has no deployment configuration to be absent.
// @backend-unmodelled 409 growth.unsubscribe_unconfigured — the same probe over the one-click
//   unsubscribe base URL, and absent here for the same reason.
// @backend-unmodelled 409 growth.provider_paused — the dispatch preflight refuses when any provider
//   account is paused. `PROVIDERS` below carries that flag and the delivery-health read reports it,
//   but nothing in this fixture can pause an account, so the refusal would be unreachable.
// @backend-unmodelled 409 growth.approval_stale — on DISPATCH (the approval route models it). The
//   backend detects an approval whose content hash or snapshot drifted WITHIN one version; here a
//   version id changes on every edit and an edit supersedes the approval, so that state cannot exist.

const CONSENT_SUMMARY = {
  consentedContacts: 214,
  withdrawnContacts: 18,
  suppressedContacts: 7,
  pendingInvites: 5,
  // The reasons a suppressed address is suppressed. Rendered as a breakdown, so it has to be a map
  // rather than a count — a page that printed the total twice would look identical with a number.
  suppressionsByReason: { HardBounce: 4, SpamComplaint: 2, ManualSuppression: 1 }
};

/**
 * What a computed audience answers.
 *
 * `includedCount` is deliberately NOT `consentedContacts`: the snapshot is taken at an instant and
 * excludes the addresses that are suppressed or pending at that instant, so a page that showed the
 * consent total where the audience belongs would be quoting a bigger number than the one that will
 * actually be mailed. Two different figures make that mistake visible.
 */
const AUDIENCE = {
  includedCount: 209,
  excludedCount: 5,
  watermarkHash: 'a91c4f7e20b8',
  exclusionReasonBreakdown: { Suppressed: 4, PendingConfirmation: 1 }
};

/** The provider account the venue has been given. `paused` is what the send gate reads. */
const PROVIDERS = [
  { providerKey: 'postmark', sendingDomain: 'post.fixturekafe.test', paused: false }
];

const MODULE_FLAG = 'growth.module';
const DISPATCH_FLAG = 'growth.dispatch';

function fresh () {
  return { seq: 0, newsletters: {}, snapshots: {} };
}

function stamp () {
  return new Date().toISOString().slice(0, 19) + 'Z';
}

/** The Growth envelope. NOT problem+json — see the header. */
function growthError (ctx, status, code, message) {
  ctx.send(status, { error: { code, message, traceId: 'fixture-trace' } },
    { 'Referrer-Policy': 'no-referrer' });
  return true;
}

/** A Growth 200, with the sensitive-response header `ApplySensitiveResponseHeaders` stamps. */
function growthOk (ctx, body) {
  ctx.send(200, body, { 'Referrer-Policy': 'no-referrer' });
  return true;
}

/**
 * The concealment refusal every Growth admin route collapses to.
 *
 * 404 and never 403, and the SAME 404 for a store that does not exist and one the caller does not
 * administer — `GrowthControllerBase.ResolveStoreAdminAsync` returns false for both.
 */
function growthNotFound (ctx) {
  return growthError(ctx, 404, 'growth.not_found', 'Not found.');
}

/**
 * A content hash over the saved version. Deterministic and cheap — it is a JOIN KEY, not a security
 * property: the approval pins it so that approving one version and dispatching another is a state
 * the page can detect rather than a race nobody can see.
 */
function contentHash (subject, contentJson) {
  // The separator is written as an ESCAPE, not as the character itself. A raw NUL in the source makes
  // git classify this whole file as binary — `Bin 0 -> 17516 bytes`, no diff, nothing for a reviewer
  // to read — which is how it shipped the first time. A NUL is still the right separator, because it
  // is the one byte neither a subject nor a body can contain, so `('ab', 'c')` cannot collide with
  // `('a', 'bc')`.
  const source = String(subject) + '\u0000' + String(contentJson);
  let a = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    a = ((a ^ source.charCodeAt(i)) >>> 0) * 0x01000193 >>> 0;
  }
  return ('00000000' + a.toString(16)).slice(-8) + ('00000000' + (source.length * 2654435761 >>> 0).toString(16)).slice(-8);
}

function snapshotDocument (snapshot) {
  return {
    snapshotId: snapshot.snapshotId,
    includedCount: snapshot.includedCount,
    excludedCount: snapshot.excludedCount,
    watermarkHash: snapshot.watermarkHash,
    computedAt: snapshot.computedAt,
    exclusionReasonBreakdown: snapshot.exclusionReasonBreakdown
  };
}

/**
 * The newsletter detail document, and the one shape most likely to break the page silently.
 *
 * `boundSnapshot.snapshotId` is dereferenced WITHOUT A GUARD by the approve handler, and
 * `currentVersion` is dereferenced without one in three places. Omitting either would throw a
 * `TypeError` in the browser — which is not a `GrowthApiError`, so the page would render its generic
 * «noe gikk galt» and a reader would conclude the server refused when in fact the shape was wrong.
 *
 * THE BODY IS NOT RETURNED, and that is the real contract rather than an economy here: the read
 * carries the subject and a fingerprint of the content and nothing else, which is exactly why the
 * approval panel says on screen that it cannot show the reviewer what they are approving.
 */
function newsletterDocument (newsletter) {
  return {
    id: newsletter.id,
    state: newsletter.state,
    currentVersion: {
      versionId: newsletter.version.versionId,
      versionNo: newsletter.version.versionNo,
      subject: newsletter.version.subject,
      contentHash: newsletter.version.contentHash
    },
    boundSnapshot: snapshotDocument(newsletter.snapshot),
    approval: newsletter.approval,
    run: newsletter.run
  };
}

const NO_APPROVAL = {
  state: 'None',
  newsletterVersionId: null,
  approvalId: null,
  approvedAt: null,
  invalidatedAt: null
};

function route (ctx) {
  const { method, body } = ctx;
  const state = ctx.state.growthNewsletter;

  const match = /^\/v1\/growth\/stores\/(\d+)(\/.*)?$/.exec(ctx.path);
  if (!match) { return false; }
  const storeId = match[1];
  const rest = match[2] || '';

  // Only the newsletter family belongs to this file. The privacy queue is answered in
  // `api-server.js` and has deliberately different gate rules, so an unclaimed `/v1/growth/...` path
  // is handed back rather than swallowed.
  const MINE = /^\/(consents\/summary|delivery-health|newsletters|segments)/;
  if (!MINE.test(rest)) { return false; }

  // StoreAdmin, and nothing else. NOT gated on `growth.module`: `GrowthNewslettersController` checks
  // `ModuleIsLiveAsync` before it will DISPATCH or TEST-SEND, and before nothing else — so a venue
  // that has never switched Growth on can still open the screen, read its consent standing and draft
  // a newsletter. Gating the reads here would hide the state this journey exists to walk: a fully
  // rendered operator surface whose send gate is closed.
  //
  // @backend-preamble
  if (!(ctx.caller.adminIn || []).some(s => String(s.id) === String(storeId))) {
    return growthNotFound(ctx);
  }

  // @backend GET /v1/growth/stores/{storeId}/consents/summary
  if (rest === '/consents/summary' && method === 'GET') {
    return growthOk(ctx, CONSENT_SUMMARY);
  }

  // @backend GET /v1/growth/stores/{storeId}/delivery-health
  if (rest === '/delivery-health' && method === 'GET') {
    // READ BY THE GATE, AND MANDATORY FOR IT TO EVER OPEN. `readMailPath` treats an unanswered read
    // as UNKNOWN, and the gate blocks on unknown exactly as it blocks on absent — "we could not check
    // this" is never rendered as "this is fine". A fixture that omitted this route would leave the
    // send button permanently disabled and the cause invisible.
    return growthOk(ctx, { providers: PROVIDERS });
  }

  // @backend POST /v1/growth/stores/{storeId}/segments/{segmentKey}/snapshots
  if (rest === '/segments/newsletter-subscribers/snapshots' && method === 'POST') {
    state.seq += 1;
    const snapshot = Object.assign({}, AUDIENCE, {
      snapshotId: 'snap-' + state.seq,
      computedAt: stamp()
    });
    state.snapshots[snapshot.snapshotId] = snapshot;
    return growthOk(ctx, snapshotDocument(snapshot));
  }

  // @backend GET /v1/growth/stores/{storeId}/newsletters
  if (rest === '/newsletters' && method === 'GET') {
    return growthOk(ctx, {
      items: Object.keys(state.newsletters).map((id) => {
        const n = state.newsletters[id];
        return { id: n.id, state: n.state, currentVersionNo: n.version.versionNo };
      })
    });
  }

  // @backend POST /v1/growth/stores/{storeId}/newsletters
  if (rest === '/newsletters' && method === 'POST') {
    const subject = ((body && body.subject) || '').trim();
    if (!subject) { return growthError(ctx, 400, 'growth.subject_required', 'A subject is required.'); }
    const content = ((body && body.contentJson) || '').trim();
    if (!content) { return growthError(ctx, 400, 'growth.content_required', 'Content is required.'); }
    const snapshot = state.snapshots[(body && body.segmentSnapshotId) || ''];
    if (!snapshot) { return growthNotFound(ctx); }

    state.seq += 1;
    const newsletter = {
      id: state.seq,
      state: 'Draft',
      version: {
        versionId: 'ver-' + state.seq + '-1',
        versionNo: 1,
        subject,
        contentHash: contentHash(subject, content)
      },
      snapshot,
      approval: NO_APPROVAL,
      run: null
    };
    state.newsletters[newsletter.id] = newsletter;
    return growthOk(ctx, newsletterDocument(newsletter));
  }

  const one = /^\/newsletters\/(\d+)(\/.*)?$/.exec(rest);
  if (one) {
    const newsletter = state.newsletters[Number(one[1])] || null;
    const tail = one[2] || '';
    // @backend-preamble /v1/growth/stores/{storeId}/newsletters/{newsletterId}
    if (!newsletter) { return growthNotFound(ctx); }

    // @backend GET /v1/growth/stores/{storeId}/newsletters/{newsletterId}
    if (!tail && method === 'GET') {
      return growthOk(ctx, newsletterDocument(newsletter));
    }

    // @backend PUT /v1/growth/stores/{storeId}/newsletters/{newsletterId}
    if (!tail && method === 'PUT') {
      // EDITING STOPS WHEN DISPATCH BEGINS, and the divergence check is how this arrived: the fixture
      // let a Dispatched newsletter be edited into a new version while `EditDraftAsync` refuses
      // anything that is not Draft or Approved. A screen could have been walked doing something the
      // API would have refused, which is the same lie as a refusal that never fires.
      if (newsletter.state !== 'Draft' && newsletter.state !== 'Approved') {
        return growthError(ctx, 409, 'growth.newsletter_not_editable',
          'This newsletter can no longer be edited (it has entered dispatch).');
      }
      // Optimistic concurrency by version NUMBER rather than an ETag, which is this surface's own
      // shape: a save built on a version somebody has already superseded is `growth.stale_version`.
      if ((body && body.baseVersionNo) !== newsletter.version.versionNo) {
        return growthError(ctx, 409, 'growth.stale_version', 'A newer version exists.');
      }
      const subject = ((body && body.subject) || '').trim();
      if (!subject) { return growthError(ctx, 400, 'growth.subject_required', 'A subject is required.'); }
      const content = ((body && body.contentJson) || '').trim();
      if (!content) { return growthError(ctx, 400, 'growth.content_required', 'Content is required.'); }

      newsletter.version = {
        versionId: 'ver-' + newsletter.id + '-' + (newsletter.version.versionNo + 1),
        versionNo: newsletter.version.versionNo + 1,
        subject,
        contentHash: contentHash(subject, content)
      };
      // A NEW VERSION INVALIDATES THE APPROVAL rather than carrying it forward. That is the whole
      // point of pinning the approval to a version id: an approval that survived an edit would mean
      // a human approved text nobody had read.
      if (newsletter.approval.state === 'Live') {
        newsletter.approval = Object.assign({}, newsletter.approval, {
          state: 'Superseded', invalidatedAt: stamp()
        });
      }
      return growthOk(ctx, newsletterDocument(newsletter));
    }

    // @backend POST /v1/growth/stores/{storeId}/newsletters/{newsletterId}/test-sends
    if (tail === '/test-sends' && method === 'POST') {
      // ONE OF THE TWO ROUTES `ModuleIsLiveAsync` GUARDS. With `growth.module` down the test route
      // does not answer at all, which is what the page's own hint says will happen.
      if (!ctx.flagEffective(storeId, MODULE_FLAG)) { return growthNotFound(ctx); }
      const address = ((body && body.testAddress) || '').trim();
      if (!address) {
        return growthError(ctx, 400, 'growth.test_address_required', 'A test address is required.');
      }
      // A test send may go ONLY to the caller's own account address, AND that address must be
      // CONFIRMED. The refusal exists because the test route is otherwise a way to mail an arbitrary
      // stranger from the venue's sending domain with no consent record behind it — a working route
      // around markedsføringsloven § 15, which asks for the recipient's prior consent and which a
      // test-send has no recipient it can name.
      //
      // FOUR REASONS, ONE ANSWER, mirroring `GrowthNewsletterService.RequireOwnAccountAddressAsync`:
      // no account, an unconfirmed address, no address at all, or an address that is not the typed
      // one all collapse into the same static 403 carrying NO address. The message is deliberately
      // address-free — an error envelope is a response body and a log line waiting to happen, and the
      // address is both personal data and the exact value being abused.
      //
      // THE CONFIRMATION CLAUSE IS THE POINT. Without it an account could hold an address it merely
      // ASSERTS, which proves nothing about who reads that mailbox; the whole guard would rest on a
      // string somebody typed into their own profile.
      const confirmedOwnAddress = !!ctx.caller &&
        ctx.caller.emailConfirmed === true &&
        !!String(ctx.caller.email || '').trim();
      if (!confirmedOwnAddress ||
        address.toLowerCase() !== String(ctx.caller.email || '').trim().toLowerCase()) {
        return growthError(ctx, 403, 'growth.test_address_not_own',
          'A test-send may only be addressed to the signed-in administrator\'s own account address.');
      }
      // `status` IS A SUBMISSION STATUS AND NOT A DELIVERY. The page prints it and says so in the
      // same sentence, because the provider answering "Sent" means it accepted the handoff.
      return growthOk(ctx, { status: 'Sent' });
    }

    // @backend POST /v1/growth/stores/{storeId}/newsletters/{newsletterId}/approval
    if (tail === '/approval' && method === 'POST') {
      if (newsletter.run) {
        return growthError(ctx, 409, 'growth.newsletter_not_approvable',
          'This newsletter has begun sending and can no longer be approved.');
      }
      // The approval names the version AND its hash AND the audience it was granted over. All three
      // are re-checked, because an approval that matched on any two of them could still be an
      // approval of different text or a different list.
      if ((body && body.newsletterVersionId) !== newsletter.version.versionId ||
          (body && body.contentHash) !== newsletter.version.contentHash) {
        return growthError(ctx, 409, 'growth.approval_stale',
          'The approval does not match the current version.');
      }
      if ((body && body.segmentSnapshotId) !== newsletter.snapshot.snapshotId) {
        return growthError(ctx, 409, 'growth.approval_stale',
          'The approval does not match the bound audience.');
      }
      newsletter.approval = {
        state: 'Live',
        newsletterVersionId: newsletter.version.versionId,
        // Resolved from the CALLER, never from the body: an approval is the record of which human
        // took responsibility, and a client-supplied actor would be an unverified claim about that.
        approvalId: 'appr-' + newsletter.id + '-' + newsletter.version.versionNo,
        approvedByReference: ctx.caller.id,
        approvedAt: stamp(),
        invalidatedAt: null
      };
      newsletter.state = 'Approved';
      // THE PAGE DISCARDS THIS BODY and immediately re-reads the newsletter, so what matters is the
      // state above rather than what is answered here.
      return growthOk(ctx, newsletter.approval);
    }

    // @backend POST /v1/growth/stores/{storeId}/newsletters/{newsletterId}/dispatch
    if (tail === '/dispatch' && method === 'POST') {
      // THE OTHER ROUTE `ModuleIsLiveAsync` GUARDS, and the kill switch on top of it. Both refuse
      // BEFORE anything is created — «ingenting ble opprettet og ingenting ble sendt» is the page's
      // sentence for each, and it is only true if the refusal happens here rather than after a run
      // row exists.
      if (!ctx.flagEffective(storeId, MODULE_FLAG)) { return growthNotFound(ctx); }
      if (!ctx.flagEffective(storeId, DISPATCH_FLAG)) {
        return growthError(ctx, 409, 'growth.dispatch_disabled',
          'The dispatch kill switch is off for this store.');
      }
      if (newsletter.approval.state !== 'Live' ||
          newsletter.approval.newsletterVersionId !== newsletter.version.versionId) {
        return growthError(ctx, 409, 'growth.no_live_approval',
          'This newsletter has no live approval for its current version.');
      }
      newsletter.state = 'Dispatched';
      newsletter.run = {
        state: 'InProgress',
        dispatchRunId: 'run-' + newsletter.id,
        finalEligibleCount: newsletter.snapshot.includedCount,
        suppressedAtDispatchCount: 0,
        providerAcceptedCount: newsletter.snapshot.includedCount,
        // NULL, NOT ZERO. Nothing has reported back yet, and a zero here would be a claim that
        // nothing was delivered rather than that nothing is known.
        deliveredCount: null,
        failedCount: null,
        ambiguousCount: null,
        openedCount: null,
        openRate: null,
        startedAt: stamp(),
        completedAt: null
      };
      return growthOk(ctx, { dispatchRunId: newsletter.run.dispatchRunId });
    }
  }

  return false;
}

module.exports = { fresh, route };

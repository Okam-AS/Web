// The Company Meals CONCIERGE + COMPANY-ADMIN client — the write half of the module.
//
// `utils/meals/meals-client.js` binds the two STORE-scoped reads a venue needs. This binds the
// COMPANY-scoped surface a concierge needs to set a pilot up in the first place: create the buying
// company, sign the corridor agreement, run programmes and policy versions, and invite people.
//
// Route-for-route with the backend, adding nothing. Endpoint numbers are the backend's own
// (`Controllers/Meals/*.cs`):
//
//   POST /v1/meals/companies                                              MealsCompanyController:35
//   GET  /v1/meals/companies/{companyId}                              #1  MealsCompanyController:62
//   POST /v1/meals/companies/{companyId}                                  MealsCompanyController:77
//   POST /v1/stores/{storeId}/meals/companies/{companyId}/agreements      MealsAgreementController:42
//   GET  /v1/meals/companies/{companyId}/members                      #2  MealsMembershipController:39
//   GET  /v1/meals/companies/{companyId}/invitations                  #3  MealsMembershipController:76
//   POST /v1/meals/companies/{companyId}/invitations                  #4  MealsMembershipController:91
//   POST /v1/meals/companies/{companyId}/invitations/{id}/revoke      #5  MealsMembershipController:118
//   GET  /v1/meals/companies/{companyId}/programs                     #9  MealsProgramController:45
//   POST /v1/meals/companies/{companyId}/programs                     #10 MealsProgramController:60
//   POST /v1/meals/programs/{programId}/policies                      #11 MealsProgramController:87
//
// TWO GATES, NOT ONE — and they are independent, which is the thing a reader of this module gets
// wrong first. The store-scoped routes in `meals-client.js` resolve `meals.module` through
// `IMealsStoreFeatureFlags`, which consults the per-store feature-flag override. Everything in THIS
// file except the agreement signing resolves it through `IMealsFeatureGate`, which reads the
// module-wide `Features:Meals` configuration section. So the venue page can work while every route
// here answers 404, and the reverse. The refusal copy keys on scope for exactly that reason.
//
// (The agreement route is the exception and deliberately so: the corridor's store is part of its
// identity, so it is store-addressable and takes the PER-STORE flag — `MealsAgreementService`'s own
// header says the module-wide gate would have made it unreachable rather than merely dark.)
//
// THE CONFIG GATE IS NOW BOUND. `pages/admin/meals-agreements.vue` records that nothing called
// `Configure<MealsFeatureSettings>`, so `IOptionsMonitor<T>` handed back a default-constructed
// instance and every route here answered 404 in every deployment whatever the config said. That is
// fixed: `Program.cs` calls `services.AddMealsFeatureOptions()` and
// `Helpers/Meals/MealsModuleServiceCollectionExtensions.cs` binds the section. Binding enables
// nothing — every flag still defaults to false — but `Features__Meals__Module=true` now reaches the
// gate, which is what makes this surface bindable at all.
//
// ROUTES THAT EXIST AND ARE DELIBERATELY NOT BOUND HERE, each a decision rather than an oversight:
//   • `POST /companies/{id}/archive` — Active → Archived has NO inverse route. There is no
//     un-archive, so this needs a confirmation flow of its own rather than a button beside an edit
//     form, and archiving is not part of standing a pilot up.
//   • `POST /companies/{id}/members/{id}/revoke` — same shape, plus a last-admin guard the server
//     enforces (`meals.validation`). Ending someone's membership is a lifecycle decision, and a
//     revoked membership cannot be restored; a reissued invitation makes a NEW membership.
//   • `POST /programs/{id}/members` (#12) — enrolment. It takes the DESIRED enrolled set, so
//     anything left out is removed; and today it has no candidates, because a membership only
//     exists once somebody claims an invitation and no client in the estate claims one. It is
//     absent here rather than present with an empty list to choose from.
//   • `POST /invitations/session` (#7) and `POST /invitations/claim` (#8) — the invitee's own
//     surface, not an admin one. They are member-authed and belong to a consumer client.
//   • The funding (#13–15), reconciliation (#16–18) and statement (#19–23) families — quotes,
//     exception resolution and monthly billing. Separate surfaces with separate flags
//     (`meals.ordering`, `meals.statements`), and none of them is part of setting a company up.
//
// TRANSPORT IS SHARED, NOT COPIED — `WorkforceClientBase` is the repo's one HTTP layer (base URL,
// bearer, JSON, the typed problem+json error, and the `Idempotency-Key` every mutation here
// requires). The Meals-specific knowledge — which refusal means what — stays in `refusalOf` /
// `writeFailureKey`, where it is testable without a network.

import { WorkforceClientBase } from '~/utils/workforce/api-client';

/**
 * The company-scoped Meals admin surface.
 *
 * EVERY MUTATION GOES THROUGH `_mutate`, which mints a fresh `Idempotency-Key` per call. That is
 * the contract: `MealsControllerBase.TryGetIdempotencyKey` refuses a mutation without one with a
 * plain module 400. A fresh key per call means a user pressing a button twice performs the action
 * twice — the key deduplicates a RETRY of one command, not two presses — so every panel that calls
 * one of these disables its button while the call is in flight.
 */
export class MealsAdminService extends WorkforceClientBase {
  _companyPath (companyId) {
    return '/v1/meals/companies/' + encodeURIComponent(companyId);
  }

  // ---- Company account --------------------------------------------------------------------------

  /**
   * Create a buying company — Okam concierge (platform PowerUser) only, and it creates the company
   * TOGETHER WITH its first active `CompanyAdmin` membership.
   *
   * `adminApplicationUserId` is therefore load-bearing rather than a detail: it is the only
   * bootstrap path to a company admin (invitations require one to already exist), and every other
   * route in this file resolves authority from an active `CompanyAdmin` membership and from nothing
   * else — never from PowerUser. A concierge who names somebody else here can create the company and
   * then read none of it.
   *
   * The company id is DERIVED from the idempotency key (SHA-256 of `meals.company.create:<key>`),
   * so a replayed create returns the same company rather than a second one.
   */
  CreateCompany (request) {
    return this._mutate('POST', '/v1/meals/companies', request);
  }

  /** #1: the company account. Requires an active `CompanyAdmin` membership — a non-member is 403. */
  GetCompany (companyId) {
    return this._request('GET', this._companyPath(companyId));
  }

  /**
   * Update the company's descriptive fields: display name and billing contact, and those only.
   *
   * The registration identity (organisation number, country) and the status are NOT editable on this
   * route — the server ignores neither, it simply has no field for them. `expectedVersion` is the
   * opaque revision from a prior read; a mismatch is a `meals.stale-revision` 409 rather than a
   * silent overwrite, so the caller must hold a revision it actually read.
   */
  UpdateCompany (companyId, request) {
    return this._mutate('POST', this._companyPath(companyId), request);
  }

  // ---- Corridor agreement -----------------------------------------------------------------------

  /**
   * Sign the `(company, store, currency)` corridor this venue's whole Meals surface hangs off.
   * Concierge (PowerUser) only: the agreement carries the SELLER's legal entity and the agreed price
   * terms, which are Okam-side commercial facts a buyer's admin must not be able to mint.
   *
   * THE STORE IS IN THE PATH, NOT THE BODY, and the request model has no `storeId` at all — one
   * place the corridor's store can come from, so a cross-store write is unrepresentable rather than
   * merely refused.
   *
   * `effectiveFromUtc` is omitted deliberately (see `MealsAgreementSignPanel`): the server resolves
   * the signing instant INSIDE the idempotency envelope, so a retry replays instead of hashing a
   * fresh clock reading into a different command.
   *
   * ONE ACTIVE CORRIDOR per `(company, store, currency)`: a second signing is refused as a
   * `meals.validation` 400, and superseding one is Ended-then-sign — there is no update route.
   */
  SignAgreement (storeId, companyId, request) {
    return this._mutate(
      'POST',
      '/v1/stores/' + encodeURIComponent(storeId) + '/meals/companies/' + encodeURIComponent(companyId) + '/agreements',
      request);
  }

  // ---- Programmes and policy versions -----------------------------------------------------------

  /** #9: the company's programmes, each carrying the corridor it funds through and its latest policy version. */
  ListPrograms (companyId) {
    return this._request('GET', this._companyPath(companyId) + '/programs');
  }

  /**
   * #10: create a programme under an ACTIVE corridor agreement of the same company.
   *
   * The programme carries no store: its store, currency and seller all resolve through
   * `agreementId`. An agreement that is not this company's is an opaque 404; one that is not Active
   * is a `meals.validation` 400.
   */
  CreateProgram (companyId, request) {
    return this._mutate('POST', this._companyPath(companyId) + '/programs', request);
  }

  /**
   * #11: issue the programme's next IMMUTABLE policy version. A policy change is always a new
   * version — there is no edit route, and none is coming.
   *
   * `expectedCurrentVersion` is the version number the caller believes is currently latest, and 0
   * when the programme has none. A mismatch is `meals.stale-policy-version` (409), so two admins
   * never silently clobber each other. `currency` must equal the corridor agreement's currency;
   * anything else is `meals.currency-mismatch`, and the stored value is the agreement's either way.
   */
  CreatePolicyVersion (programId, request) {
    return this._mutate('POST', '/v1/meals/programs/' + encodeURIComponent(programId) + '/policies', request);
  }

  // ---- People -----------------------------------------------------------------------------------

  /**
   * #2: the company's memberships — active and revoked alike.
   *
   * A member is identified by the seam VALUE (`applicationUserId`) and nothing else. The module owns
   * no identity display and this read resolves no names, which is the fact behind the statement-line
   * gap the invitation panel warns about.
   */
  ListMembers (companyId) {
    return this._request('GET', this._companyPath(companyId) + '/members');
  }

  /**
   * #3: the company's invitations.
   *
   * IT NEVER CARRIES THE TOKEN. Only the create response does, once — the server stores a hash and
   * re-derives the plaintext from the invitation id, so there is no route that can show it again.
   */
  ListInvitations (companyId) {
    return this._request('GET', this._companyPath(companyId) + '/invitations');
  }

  /**
   * #4: create a single-use invitation, and receive the plaintext claim token in the response.
   *
   * NOTHING IS SENT. The module has no outbox, no SMS and no mail: the token is handed back on this
   * response and to nobody else, so an invitation reaches a person only because a human relays it.
   * The panel that calls this says so; see `MealsPeoplePanel.vue`.
   *
   * Exactly one contact channel is required (email or phone) so the intended recipient is
   * identifiable — and it is more than a label: a claim by an account that is not the named contact
   * is refused (`meals.invitation-contact-mismatch`), which is what stops a forwarded token being a
   * bearer credential for whoever holds it.
   */
  CreateInvitation (companyId, request) {
    return this._mutate('POST', this._companyPath(companyId) + '/invitations', request);
  }

  /**
   * #5: revoke a PENDING invitation — the mitigation when a relayed token goes somewhere it should
   * not have. Already-revoked is an idempotent no-op; a CLAIMED one is refused
   * (`meals.invitation-not-claimable`), because its membership already exists and revoking the
   * invitation would not undo that.
   *
   * A reissue is a NEW invitation with a NEW token; there is no un-revoke.
   */
  RevokeInvitation (companyId, invitationId, request) {
    return this._mutate(
      'POST',
      this._companyPath(companyId) + '/invitations/' + encodeURIComponent(invitationId) + '/revoke',
      request);
  }
}

export default MealsAdminService;

// The Company Meals INVITEE client — the two routes an invited employee calls, and no others.
//
//   POST /v1/meals/invitations/session   #7  MealsMembershipController:140
//   POST /v1/meals/invitations/claim     #8  MealsMembershipController:162
//
// WHY THIS IS ITS OWN FILE. `utils/meals/admin-client.js` names these two and deliberately leaves
// them out: "the invitee's own surface, not an admin one. They are member-authed and belong to a
// consumer client." That reasoning still holds — the two routes here resolve NO company-admin
// authority and take no company id — so they are bound beside it rather than inside it. Everything
// else in the module (store reads, concierge/company writes) keeps its own file.
//
// BOTH ROUTES ARE AUTHENTICATED. `MealsMembershipController` carries a class-level `[Authorize]` and
// neither action opts out, so the PREVIEW needs a bearer token exactly as the claim does. An invited
// employee therefore cannot see what they were invited to before signing in — that is the platform's
// rule, not a choice this client makes, and the page says so in as many words rather than
// pretending an anonymous preview exists.
//
// TRANSPORT IS SHARED, NOT COPIED — `WorkforceClientBase` is the repo's one HTTP layer (base URL,
// bearer, JSON, the typed problem+json error, `Idempotency-Key`). The Meals-specific knowledge —
// which refusal means what — stays in `utils/meals/refusal-copy.js`.

import { WorkforceClientBase } from '~/utils/workforce/api-client';

/**
 * The invitee's two calls.
 *
 * Neither takes a company id: the invitation token IS the addressing, and the server resolves the
 * company from it. That is also why nothing here is scoped by store — the claim path consults the
 * module-wide `Features:Meals` gate and has no per-store dimension at all.
 */
export class MealsClaimService extends WorkforceClientBase {
  /**
   * #7: exchange a raw invitation token for a short-lived preview.
   *
   * Returns `MealsInvitationSessionModel` — `sessionToken`, `expiresAtUtc`, `companyId`,
   * `companyDisplayName`, `intendedRole`. That is the WHOLE projection: there is no allowance, no
   * venue, and no inviter on it, so a page rendering this response cannot show those and must not
   * imply it knows them.
   *
   * NOT a mutation and carries no `Idempotency-Key`: the session is stateless (a signed
   * `invitationId|expiry` envelope, no row is written), and the controller does not ask for a key.
   * The token rides the BODY rather than a path or query segment — the "fragment → redacted body"
   * rule `CreateMealsInvitationSessionRequest` states — so the credential never reaches an access
   * log, a `Referer` header or a browser history entry.
   */
  CreateSession (token) {
    return this._request('POST', '/v1/meals/invitations/session', { body: { token } });
  }

  /**
   * #8: claim the invitation — atomically consumes it and creates one active membership for the
   * signed-in caller. Returns `MealsMemberModel`.
   *
   * THE KEY IS THE CALLER'S, NOT A FRESH ONE, and that is the whole point of the argument.
   * `_mutate` mints a new `Idempotency-Key` per call, which is right for an admin pressing a button
   * twice — two presses are two commands. It is wrong here: the caller has exactly ONE command to
   * issue in their whole visit, and the failure this route actually meets is a phone losing signal
   * mid-request, where the client cannot tell whether the membership was created. A key held stable
   * across retries of that one command turns the ambiguous case into a replay that returns the
   * stored membership, instead of a second attempt that is refused as `invitation-not-claimable`
   * against the caller's own first success.
   *
   * `extraHeaders` overriding the minted key is the base class's existing seam (`Object.assign`
   * puts the caller's value last), so this passes through `_mutate` rather than assembling a header
   * bag of its own — which that file's header explicitly warns against.
   *
   * The RAW token is sent rather than the session token. Both are accepted (`ResolveClaimInvitation`
   * prefers `sessionToken` when present), but the session expires in ten minutes and the raw token
   * does not; a person who reads the page slowly before pressing the button would otherwise be
   * refused with an opaque 404 for having taken their time. The session's TTL protects a credential
   * that has crossed a boundary — here it has crossed none, because the page holds the raw token in
   * memory for the whole visit either way.
   */
  Claim (token, idempotencyKey) {
    return this._mutate('POST', '/v1/meals/invitations/claim', { token }, { 'Idempotency-Key': idempotencyKey });
  }
}

export default MealsClaimService;

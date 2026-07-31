// The Events GUEST API client — the five anonymous routes, and nothing else.
//
// It is separate from `~/utils/events/events-client` on purpose, and the separation is a security
// posture rather than a filing preference:
//
//   • NO BEARER TOKEN IS EVER SENT. The base class attaches one when its initializer carries one,
//     and this client is constructed with no initializer at all, so it cannot. A venue's own staff
//     open these links too (that is how a token is handed over today), and a page that quietly
//     rode their admin token would answer differently for them than for the guest it was built for
//     — the one difference this surface must never have.
//   • The routes are `[AllowAnonymous]` on `EventsController` and `EventsDepositsController`. Every
//     method below maps to one of them; a method with no anonymous action does not belong here.
//
// The HTTP layer is `WorkforceClientBase`, reused rather than copied for the same reason
// `events-client` reuses it: it is route-agnostic and owns base URL + problem+json parsing once. The
// error TYPE is the Events one, so a guest page keys on the same `EVENTS_*` codes the admin does.
//
// NO `Idempotency-Key`, matching the admin client: the Events surface has no such filter and no
// `*_IDEMPOTENCY_*` code, so sending the header would advertise a contract the module does not have.
// Accept and decline are idempotent at the SERVER instead — a second accept on the same token
// replays the recorded acceptance rather than writing a second one (`EventsWriteGuards.BuildReplay`).

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';
import { EventsApiError } from '~/utils/events/events-client';
import { GUEST_RATE_LIMITED } from '~/utils/events/guest';

export class EventsGuestService extends WorkforceClientBase {
  constructor () {
    // Explicitly empty: see the header. There is no initializer argument to pass one in by mistake.
    super({});
  }

  async _guest (method, path, options) {
    try {
      return await this._request(method, path, options);
    } catch (e) {
      if (isWorkforceApiError(e)) {
        // The inquiry limiter answers 429 with `{ message }` and NOT problem+json, so it carries no
        // `code` at all. It is given one here — the single place that knows the shape — because a
        // page that had to test `status === 429` beside every code test would eventually forget to.
        if (e.status === 429) {
          return Promise.reject(new EventsApiError(429, Object.assign(
            {}, e.problem, { code: GUEST_RATE_LIMITED, detail: (e.problem && e.problem.message) || e.message })));
        }
        throw new EventsApiError(e.status, e.problem);
      }
      throw e;
    }
  }

  /**
   * GET /events/proposals/{token} — the offer exactly as it was sent.
   *
   * THE SAME BYTES EVERY TIME (EV-02). The server reads the stored version row and never recomputes
   * it: a version is immutable from `Sent`, its `contentHash` is settled at send, and acceptance
   * re-verifies that hash. So a reload shows what the guest saw before, which is what makes the
   * acceptance receipt evidence rather than a claim.
   *
   * A superseded or expired version still ANSWERS here, carrying its status and `isActionable:
   * false`, rather than 404ing — that is what lets the page say which of the two happened. Only a
   * token matching no sent version at all is `EVENTS_PROPOSAL_NOT_FOUND`.
   */
  GetProposal (token) {
    return this._guest('GET', '/events/proposals/' + encodeURIComponent(token));
  }

  /**
   * POST /events/proposals/{token}/accept — T5, or the acceptance of an amendment.
   *
   * The body is `{ acceptorName, acceptorEmail }` and both are recorded verbatim on the append-only
   * acceptance receipt together with the proposal's content hash, the server clock, and the IP and
   * user-agent the REQUEST carried (never anything the body claims about them).
   */
  AcceptProposal (token, request) {
    return this._guest('POST', '/events/proposals/' + encodeURIComponent(token) + '/accept', { body: request });
  }

  /** POST /events/proposals/{token}/decline — T6. The body carries only the guest's optional note. */
  DeclineProposal (token, request) {
    return this._guest('POST', '/events/proposals/' + encodeURIComponent(token) + '/decline', { body: request });
  }

  /**
   * GET /events/deposits/{token} — the deposit page.
   *
   * Carries the deposit facts and NO event or contact detail by design, so the page it feeds can
   * name an amount and a status and cannot name a person. Exactly one payment affordance is
   * populated per rail, and both are null once the deposit is no longer collectable.
   */
  GetDeposit (token) {
    return this._guest('GET', '/events/deposits/' + encodeURIComponent(token));
  }

  /**
   * POST /events/inquiries — the public enquiry (T1).
   *
   * `storeId` rides the BODY here (this is the one public route that is not tokenised, so there is
   * nothing else to carry it). Rate-limited per IP on top of the global limiter; a refusal comes
   * back as 429 with `GUEST_RATE_LIMITED` (see `_guest`), which is a "try later", not a "your form
   * was wrong", and the page says so.
   */
  CreateInquiry (request) {
    return this._guest('POST', '/events/inquiries', { body: request });
  }
}

export default EventsGuestService;

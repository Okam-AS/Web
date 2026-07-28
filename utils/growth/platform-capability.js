// Platform capabilities the Growth API does not report, and the one place they are stated.
//
// A capability here is a property of the DEPLOYMENT rather than of a store or a newsletter, so no
// endpoint returns it and no read can discover it. Keeping it in one named module — instead of
// inlining a boolean at the gate — is what makes it reviewable, greppable, and a one-line change the
// day the platform can answer for itself.

import { UNSUBSCRIBE_ABSENT } from '~/utils/growth/send-gate';

/**
 * Whether a dispatched newsletter can carry a working RFC 8058 one-click unsubscribe.
 *
 * CURRENT VALUE: absent. This is not a guess, a placeholder, or a conservative default — it is the
 * backend's own recorded position at the commit this surface was built against, from four
 * independent pins in `OkamAPI-modules`:
 *
 *  1. `Services/Growth/GrowthUnsubscribeHeaders.cs` — the composer's own summary opens with "This
 *     does not make unsubscribe ship, and it has no production caller." A grep confirms it: every
 *     reference outside its own declaration is in `WebApi.Tests/`.
 *  2. `IGrowthPreferenceService.MintLinkTokenAsync` has ZERO production call sites — only its
 *     declaration and its implementation. No guest can be issued the per-recipient token the
 *     one-click URI must carry, so the URI cannot identify anybody.
 *  3. `WebApi.Tests/Wire/WireContractPinsTests.A_form_encoded_one_click_unsubscribe_is_rejected_at_415_before_the_action_runs`
 *     — `POST /v1/growth/unsubscribe` binds `[FromBody]` JSON while RFC 8058 §3.1 fixes the body to
 *     the form-encoded literal `List-Unsubscribe=One-Click`. The composition root registers JSON
 *     input formatters only, so a conforming mail client is rejected at model binding with 415 and
 *     the action never runs. That pin is titled PINNED, NOT FIXED.
 *  4. `GrowthDispatchService.ProcessClaimedDeliveryAsync` builds its `GrowthMailSubmission` without
 *     setting `Headers`, which defaults to empty — so a dispatched newsletter today carries neither
 *     `List-Unsubscribe` nor `List-Unsubscribe-Post`.
 *
 * The estate states the consequence itself, in `docs/plans/PROOF-BENCHMARKS.md`: "marketing consent
 * is not optional (markedsføringsloven § 15; RFC 8058 requires a working `List-Unsubscribe-Post`
 * target), so **Growth must not send a single newsletter until a production path mints that
 * token**." This constant is that sentence, enforced.
 *
 * TO FLIP IT: when a production path mints the token, composes the header pair, and the one-click
 * endpoint accepts the form-encoded body, change this to `UNSUBSCRIBE_PRESENT` — or, better, replace
 * it with a value read off the API once the platform can report it. Do not flip it because the send
 * button is inconvenient.
 */
export const UNSUBSCRIBE_MECHANISM = UNSUBSCRIBE_ABSENT;

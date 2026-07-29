// Platform capabilities the Growth API does not report, and the one place they are stated.
//
// A capability here is a property of the DEPLOYMENT rather than of a store or a newsletter, so no
// endpoint returns it and no read can discover it. Keeping it in one named module — instead of
// inlining a boolean at the gate — is what makes it reviewable, greppable, and a one-line change the
// day the platform can answer for itself.

import { UNSUBSCRIBE_PRESENT } from '~/utils/growth/send-gate';

/**
 * Whether a dispatched newsletter can carry a working RFC 8058 one-click unsubscribe.
 *
 * CURRENT VALUE: present, as of backend `4e2e3147`. It was `absent`, and the four conditions this
 * docstring named as the price of flipping it were each verified satisfied — in the backend source,
 * not from a report:
 *
 *  1. `GrowthUnsubscribeHeaders` had no production caller. The pair is now composed by
 *     `GrowthOneClickUnsubscribeLink.BuildHeaders` and attached at `GrowthDispatchService.cs:350`,
 *     BEFORE the irreversible `Submitting` transition — so a failure to mint leaves the delivery
 *     re-claimable and un-sent rather than sent bare.
 *  2. The mint had zero production call sites. `GrowthDispatchService.cs:325` now mints a
 *     per-recipient token for every delivery, as a SEPARATE CAPABILITY from the preference link
 *     token: a one-click URI sits in cleartext in the recipient's mailbox, and a preference session
 *     can file an erasure, so one credential doing both jobs would make every delivered newsletter
 *     an erasure credential.
 *  3. The 415 is gone, and the pin proving it was INVERTED rather than deleted — reverting the action
 *     to a JSON-only body brings the 415 back and turns it red. An input formatter reads both the
 *     form-encoded and multipart media types and verifies the body is the RFC's fixed literal; the
 *     token binds `[FromQuery]`, the only place RFC 8058 leaves for it.
 *  4. `Headers` is set on the submission (see 1).
 *
 * The estate states the consequence itself, in `docs/plans/PROOF-BENCHMARKS.md`: "marketing consent
 * is not optional (markedsføringsloven § 15; RFC 8058 requires a working `List-Unsubscribe-Post`
 * target), so **Growth must not send a single newsletter until a production path mints that
 * token**." That path exists now, so this constant stops enforcing the refusal.
 *
 * WHAT THIS CONSTANT STILL DOES NOT KNOW. It asserts the deployment's CODE can carry a one-click
 * unsubscribe. It cannot see whether `Growth:PublicApiBaseUrl` is configured in the environment this
 * browser is talking to — no endpoint reports it. That is deliberately safe rather than an
 * oversight: the backend has no default for it and refuses to create a dispatch run at all when it
 * is missing, with an https requirement per RFC 8058 §3.1. So a misconfigured deployment fails
 * CLOSED at the API, not silently at the mail server. This surface would show that refusal as a
 * failed dispatch rather than as a pre-emptive block, which is the correct division: the client must
 * not guess at deployment configuration it cannot read.
 *
 * Still the right shape: replace this with a value read off the API the day the platform can report
 * it. Do not flip it back and forth because a button is inconvenient.
 */
export const UNSUBSCRIBE_MECHANISM = UNSUBSCRIBE_PRESENT;

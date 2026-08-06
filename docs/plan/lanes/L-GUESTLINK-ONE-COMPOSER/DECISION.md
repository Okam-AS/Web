# Which behaviour survives, and the receipts

## The fork, restated from what was read rather than from the record

On `lane/ev-vipps-fallback-2` (`fc09be1d`) the Vipps adapter calls
`Helpers/Events/EventsGuestLink.cs`, which validates the **scheme** and throws `UriFormatException`. On the
baseline (`8e2b57de`) the outbox mail path composed the same address inline at
`EventsEmailNotificationDelivery.cs:145` and reported the label `PublicBaseUrlMalformed`. Both halves of
*"one throws, the other returns a fault enum"* are exact; it describes **helper versus inline**, and the two
shapes disagree about a **relative origin**.

That disagreement is not stylistic. The inline shape was

    new Uri(origin + "/events/" + segment + "/" + token, UriKind.Absolute)

and on **Unix — the platform the API is deployed on — that constructor does not reject a relative origin.**
It succeeds as `file:///events/…`. So the inline path's `PublicBaseUrlMalformed` branch was **unreachable for
the likeliest misconfiguration**, and the guest would have been mailed a link to a local file path. The same
value throws on Windows, so no developer machine ever saw it. `Events:PublicBaseUrl` is unset in every
committed configuration, so the first time anybody sets it is the first time this fires.

`PublicBaseUrlMalformed` is a **string label**, not a C# enum — it is persisted to
`EventsNotificationOutbox.LastError` and read by operators. The flag's wording holds; the type does not.

## The decision: the composer throws, the fault label stays at the mail path's boundary

Stated in the test's own summary so it is read where it is enforced, not only here.

**Why the throw wins.** A composer is asked *what is the address*. For an origin that is not an absolute
http(s) origin there is no answer, and every non-throwing shape — empty string, null, a degraded relative
URL, a fault code — is a value a caller can proceed on without inspecting. The Vipps adapter is exactly the
caller that must not: a Vipps order is money held on a guest's card and cannot be un-made, so a return value
it forgets to check is how a payment completes carrying a broken return link. A fault enum in the composer
would have served the mail path and silently failed the money path.

**Why the other caller's need is still met.** The outbox drain must not die on one bad row.
`DeliverCoreAsync` catches `UriFormatException` at its own boundary and returns the same retryable
`PublicBaseUrlMalformed` label it always returned — **the observable delivery contract is unchanged**, which
the positive-control and label tests both pin. What moved is only *the decision of what a valid origin is*.
Neither behaviour was deleted; one of them stopped being duplicated.

This is not a fresh ruling. It is the ruling `lane/ev-uri-relative` already made, re-derived from the two
callers' needs and then found to agree — which is the outcome the flag's lesson predicts when a lane looks
before it writes.

## What this lane did *not* write

Nothing in the composer or the mail path is new code. `EventsGuestLink.cs`, the mail path's use of it,
`EventsGuestLinkOriginTests.cs` and the `CredentialCompositionSweepTests` re-key are carried
**byte-identical** from `lane/ev-uri-relative @6a7bf75b` (`agent:L-EV-URI-RELATIVE`) and verified file by
file, not assumed. Six copies of that helper already existed across three branches and three worktrees, all
`sha 97110b7c61e6`. Writing a seventh under a new name is precisely the failure this lane exists to close —
this is the fourth recorded instance of two commits making one fix, after `F-MEALS-CORS-DOUBLE-LAND` and
`F-FLAGS-FALSE-GUARANTEE`.

The sibling lane's receipts (`artifacts/lanes/L-EV-URI-RELATIVE/`, 28k lines of trx) were **dropped** from
the carry: they are that lane's evidence for that lane's tree, and duplicating them would make two branches
claim the same receipt.

## What this lane *did* write: `EventsGuestLinkSoleComposerTests`

The exit asks for a test that reds **when the outbox mail path stops reading the helper**. That is a claim
about the source, and `EventsGuestLinkOriginTests` cannot make it — it pins behaviour, so it reds on a
re-inline only *because the shape that shipped was wrong on Unix*. Re-inline a **correct** copy and every
behavioural assertion stays green while the estate is back to two composers that agree today and drift
tomorrow. Measured, not argued — see M2 below.

Three rules, plus the two guards this estate's other sweeps carry:

1. `The_guest_page_address_is_composed_in_exactly_one_production_file` — the guest page path shape appears in
   exactly one production file. Bounded so it cannot swallow the module's own API route, which differs from
   the guest page by one letter (`deposits` vs `deposit/`).
2. `The_outbox_mail_path_composes_through_the_composer` — the named mutant, pinned directly and on any
   platform.
3. `Every_production_caller_of_the_composer_is_named_here` — the tree-wide search kept alive as an assertion.
   Both directions: an undeclared caller reds, and so does a stale declaration.
4. `The_rule_can_fail` — 10 synthetic cases, including three that guard the comment stripper, because every
   doc comment in this module quotes the address it documents.
5. `The_sweep_reaches_the_files_it_claims_to_sweep` — a floor, so a moved folder cannot turn the rules into a
   green no-op.

## Receipts

Host `darwin` (Unix — the point). No SQL container held or touched; a foreign `mssql` container was running
throughout and was left alone. Filter for the mutant runs:

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter \
      'Database!=SqlServer&(FullyQualifiedName~EventsGuestLinkSoleComposerTests|FullyQualifiedName~EventsGuestLinkOriginTests|FullyQualifiedName~EventsOutboxDeliveryTests|FullyQualifiedName~CredentialCompositionSweepTests)'

| run | mutation | result | what it proves |
| --- | --- | --- | --- |
| green | none | **80 passed / 0 failed** | the fixed state |
| **M1** | the mail path composes inline again — *the exact shipped shape*, i.e. "stops reading the helper" | **6 failed / 74 passed** | the exit criterion. 3 structural rules red, plus 3 behavioural cases (`/events`, `/`, `file://`) that come back `Delivered == true` |
| **M2** | the mail path composes inline again, but **correctly** — same validation, same address, second place | **3 failed / 77 passed** | why the structural pin is not redundant. **Every** assertion in `EventsGuestLinkOriginTests` stays green; only the three source rules red. A behavioural pin alone would let the fork silently re-form |

M2's failure names the file and line it found:

    A guest page URL is composed outside Helpers/Events/EventsGuestLink.cs. …
      Services/Events/EventsEmailNotificationDelivery.cs:149: var candidate = _settings.PublicBaseUrl.TrimEnd('/') + "/events/" + segment + "/"

Both mutants were applied to the working tree and restored; the restore was verified against `HEAD` (`git
diff` empty) before the tier run.

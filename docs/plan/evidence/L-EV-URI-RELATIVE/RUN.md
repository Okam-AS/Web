# L-EV-URI-RELATIVE — the mutation receipts behind `EventsGuestLinkOriginTests`

These are lane receipts, deliberately **not** in `artifacts/tests/`. That directory holds tier numbers
produced from a clean checkout of one SHA; every run below was produced from this lane's *working tree*
during a mutate → measure → restore loop, which is exactly the thing that directory's own rule excludes.
They are kept because the numbers they carry are about a test's ability to FAIL, not about a tier.

Host: darwin (Unix). That is the whole point — the defect is platform-shaped and is invisible on Windows.

## The defect, measured rather than asserted

The shipped composition was `new Uri(origin + path, UriKind.Absolute)`. On this host, with a relative
`Events:PublicBaseUrl`, that constructor **throws nothing**:

    "/events" + "/events/deposit/{token}"   ->  file:///events/events/deposit/{token}   (scheme = file)
    "//guest.example.test/events/deposit/x" ->  file://guest.example.test/events/deposit/x

So `PublicBaseUrlMalformed` was unreachable for a scheme-less origin — the likeliest typo — and the outbox
would have mailed the guest a link to a local file path.

## Runs

Filter for the three mutant runs (the container-free tier, trait-based, plus the four affected classes):

    dotnet test WebApi.Tests/WebApi.Tests.csproj \
      --filter 'Database!=SqlServer&(FullyQualifiedName~EventsGuestLinkOriginTests|FullyQualifiedName~EventsOutboxDeliveryTests|FullyQualifiedName~CredentialCompositionSweepTests|FullyQualifiedName~EventsDeadLetterSurfaceTests)'

| file | mutation | result | what it proves |
| --- | --- | --- | --- |
| `m1-mutant.trx` | the absolute-http check deleted from `EventsGuestLink.PagePrefix`, leaving *literally the shipped code* | 9 failed / 70 passed | the exit criterion. `/events`, `/` and `file://` come back **`Delivered == true`** on the mail path — the guest is sent the file link — and the composer theory reds on six origins |
| `m2-mutant.trx` | the malformed branch quotes the composed address back in `LastError` and logs it | 7 failed / 72 passed | C7 on the operator-facing label |
| `m2b-mutant.trx` | label left clean, only the **log** call carries the link | 2 failed / 77 passed | C7 on the log sink *independently*. M2 short-circuited on the label assertion, so without this run the `Assert.All(log.Entries, …)` half was never shown to be able to fail. The repo's own `CredentialCompositionSweepTests` static sweep reds here too |
| `fast-tier-clean.trx` | none — restored | **4379 passed / 0 failed / 12 skipped** (4391 total), 10:10:09→10:16:11 | nothing else in the container-free tier moved |

No SQL Server container was started by any of these; this lane held no container slot. A SQL container was
observed running on the host throughout, owned by a concurrent lane's test process, and was not touched.

`fast-tier-clean.trx` was run from the working tree that became this lane's commit, with no edit between
the run and the commit. It is not a clean-checkout receipt and no row was added to
`artifacts/tests/README.md` for it.

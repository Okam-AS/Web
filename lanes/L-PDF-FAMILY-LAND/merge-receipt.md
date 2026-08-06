# L-PDF-FAMILY-LAND - merge receipt

brief 91e6d9e8 - 2026-08-04 - OkamAPI (backend). Local only. Nothing pushed. No migration authored.

## Where the work was done

Worktree `/Users/svendaneel/okam/wt-pdffamily`, created by me with
`git worktree add --detach 4685fb01`. `/Users/svendaneel/okam/OkamAPI-modules` was NEVER entered -
not read, not written; it is on a lane branch and hosts a live WebApi process.
`feature/restaurant-modules` was checked out in NO worktree at the time of the landing
(`git worktree list | grep restaurant-modules` returned nothing), so moving the ref left no other
worktree holding a stale index.

`git status --porcelain` was asserted EMPTY before each build - before the baseline build and again
before the merge build. The wire tier dirties two tracked files,
`artifacts/journeys/ev-dietary/run-sheet.json` and `.md`; both were restored with `git checkout --`
after each run and neither was committed. The one commit was made by pathspec
(`git add artifacts/tests/README.md` over an already-staged merge); `git add -A` was never used.

## Ancestry - measured myself at the tips I actually saw, not taken from the brief

    git merge-base --is-ancestor
      lane/download-headers  (9207f480) -> lane/download-pdf-wire  (a7b90cbd)   YES
      lane/download-pdf-wire (a7b90cbd) -> lane/pdf-nullderef      (17198f14)   YES
      lane/pdf-nullderef     (17198f14) -> lane/invoice-retry-retirement
                                                                  (1a0c0cbb)   YES

    commits ahead of feature/restaurant-modules (4685fb01):
      lane/download-headers          +1        lane/pdf-nullderef              +4
      lane/download-pdf-wire         +2        lane/invoice-retry-retirement   +6

    NONE of the four was already an ancestor of the target. Checked before merging, because a
    sibling lane found today that the target had absorbed two of its own members.

The brief's ancestry claim held exactly. Two of the four tips had MOVED since the brief was written
(`lane/pdf-nullderef` 2497ce9d -> 17198f14, `lane/invoice-retry-retirement` f18ffeda -> 1a0c0cbb -
each a receipt commit on top), which is why the tips above are the ones I resolved rather than the
ones the returns name. Merging the tip lands all four; no member was merged separately.

The four absent files were RE-CHECKED at `4685fb01` rather than trusted from the brief. All four
still absent:

    git cat-file -e feature/restaurant-modules:Helpers/BrowserReadableHeaders.cs             ABSENT
    ...:WebApi.Tests/Wire/DownloadHeaderWireTests.cs                                         ABSENT
    ...:WebApi.Tests/Wire/PdfDownloadWireTests.cs                                            ABSENT
    ...:WebApi.Tests/Wire/PdfRendererOutageWireTests.cs                                      ABSENT

## What was merged

    5df07afa  merge 4685fb01 + lane/invoice-retry-retirement (1a0c0cbb)   1 conflict   <- LANDED

`git log -1 --format=%P` = `4685fb01 1a0c0cbb`, a true two-parent merge. One merge, four lanes: the
other three ride in as ancestors of the tip. Verified ON THE BRANCH afterwards - all four
`--is-ancestor feature/restaurant-modules` = YES.

`feature/restaurant-modules` is at `5df07afa`. Local only, nothing pushed; there is no
`origin/feature/restaurant-modules`.

## The tip did NOT move under this lane, and the CAS was still used

`4685fb01` when the lane started, `4685fb01` when the baseline finished, `4685fb01` when the merge
was made, and `4685fb01` re-read immediately before the swap. The ref was moved with a
compare-and-swap naming the value I expected:

    git update-ref refs/heads/feature/restaurant-modules 5df07afa... 4685fb01...

It succeeded on the first attempt. `git branch -f` was never used and no reset was ever run against
this ref. Had the CAS refused, the plan was to re-merge forward onto the new tip and re-measure from
scratch - the same recovery two sibling lanes performed today.

## Conflict count: 1, in artifacts/tests, none in source

Trial-merged FIRST with `git merge-tree --write-tree --name-only`, before creating a worktree or
touching anything: exactly one conflicting path, `artifacts/tests/README.md`. The real merge
reproduced that precisely - `Auto-merging Program.cs`, `Auto-merging WireTestDoubles.cs`,
`CONFLICT (content): artifacts/tests/README.md`, and nothing else.

1. `artifacts/tests/README.md` - THE RECEIPT TRAP, for the sixth merge lane running. Both sides
   append rows to one table and paragraphs to one prose block. Resolved as a UNION, never to a side:
   all FIFTEEN rows the target carried (`8c8a243d`, `6f26ad2b`, `ffb29e4e`, `baa5e38a`, `f8b3a30f`,
   `99855b1d`, `a7697121`, `bb82b3a0`, `0659666f`, `base-bfe57c3c`, `lane-reservation-limiter-move`,
   `base-6771ba9a`, `lane-crypto-pin-byform`, `3cf288fb`, `771c0fc0`) survive, and so do both rows
   this stack brings (`2497ce9d`, `f18ffeda`) - 17 rows counted in the resolved file. Every prose
   paragraph from both sides survives. One edit beyond the union, and it is a correction rather than
   an addition: the `2497ce9d` paragraph said "not comparable to `99855b1d` above it", which was true
   on the lane and false the moment the union put six other lanes' rows between them, so it now names
   the rows it means and keeps the same comparable base (4373 / 0 / 12 at `a7b90cbd`). A pointer to
   this receipt was added so the landing's own numbers are findable. No measurement was deleted.

No source file conflicted. The two source files both sides touched auto-merged, and BOTH were read
rather than trusted (see below).

## Auto-merged does not mean correct - the two shared source files, read

`Program.cs`. Target's change and the stack's change are in disjoint regions, which is exactly the
shape that merges cleanly and then misbehaves. The merged file carries BOTH sides:

    target  line ~193  AddTransient<ApplicationInsightsLoggingMiddleware> DELETED - still deleted;
                       `git grep "class ApplicationInsightsLoggingMiddleware"` = 0 hits at the merge
    target  1019-1040  IGrowthAuditWriter/ReadService, AddMemoryCache, IEmailConfirmationRateLimiter,
                       IReservationRateLimiter - all present
    stack   102        WithExposedHeaders(BrowserReadableHeaders.All)  - present, and the ONLY
                       `WithExposedHeaders` change; the MCP one at 110 is untouched
    stack   303        app.UseMiddleware<DocumentRenderExceptionMiddleware>()  - present, once
    stack   551        AddScoped<IDocumentRenderer, OkamFunctionsDocumentRenderer>()  - present, once

`WebApi.Tests/Wire/WireTestDoubles.cs`. Both sides edit `RecordingEmailService`, in different
methods. The merged class was read method by method and carries both behaviours: the stack's
`_invoicesAttached` queue and its `InvoicesAttached` accessor with the recording loop inside
`BuildInvoiceMessage`, AND the target's `FailConfirmationCodeSend` property with its early
`Task.FromException` return inside `SendConfirmationCode`. Neither was flattened by the other. The
stack's `RecordingDocumentRenderer` and `RenderedDocument` arrived whole at the end of the file.

Interface/test-double check, which is the shape that broke a clean merge today: the stack adds an
interface (`IDocumentRenderer`, two members) and its own double in the same commit, and the target
adds no member to any interface the stack's doubles implement. The only interface both sides live
under is `IEmailService`, whose declaration neither side touches. The build is the proof, and it
was run before any tier.

## The merge commit was BUILT before anything was measured

    git status --porcelain  -> empty
    dotnet build WebApi.Tests/WebApi.Tests.csproj   ->  exit 0, 0 Error(s)

`--no-build` appears ZERO times in every log in `work/` (baseline build, merge build, both tier
runs). Assembly freshness at the merge commit: newest tracked `.cs` 1785802403, `WebApi.dll`
1785802503, `WebApi.Tests.dll` 1785802516 - both assemblies newer than every tracked source.

## Tier - a baseline I measured myself, and a re-run AT the merge commit

Both runs in the same worktree, same command, no `--no-build`:

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"

Never `FullyQualifiedName!~SqlServer`.

    BASELINE  clean 4685fb01   Failed 0, Passed 4529, Skipped 12, Total 4541   6 m 01 s  exit 0
    MERGED    5df07afa         Failed 0, Passed 4571, Skipped 12, Total 4583   5 m 53 s  exit 0

    DELTA: +42 total, +42 passing, 0 failed, skipped unchanged at 12.

The baseline was measured at the clean tip in THIS worktree, not inherited from the brief and not
taken from a sibling's receipt. No per-lane green was inherited: each of the four lanes was green
alone, which is exactly what a merge can break.

NO UNREPRODUCIBLE RED TO NAME. The baseline run had zero failures (`outcome="Passed"` 4529,
`outcome="NotExecuted"` 12, no `Failed`), so there was no flake to capture. The known
`EventsOutboxDeliveryTests.The_message_carries_the_link_and_no_other_guest_data` flake did not
recur in either run.

## The discovered-test-set diff - 0 removed / 42 added, not a net +42

Test names extracted from the `testName=` attributes of both `.trx` files, sorted, and compared as
SETS rather than as counts. A net +42 that is really +45-3 looks identical to this one; it is not.

    baseline set  4541 names   work/baseline-tests.txt
    merged set    4583 names   work/merged-tests.txt
    comm -23  (in baseline, absent from merged)  ->  0 names   work/removed-tests.txt (empty)
    comm -13  (in merged, absent from baseline)  ->  42 names  work/added-tests.txt

All 42 belong to the five test files this stack adds, plus the one pin it adds to an existing file
(`WireContainmentTests.The_substituted_pdf_renderer_cannot_become_the_production_path`). Nothing
outside this stack appeared, and nothing at all disappeared.

The SKIP LIST is identical name-for-name between the two runs (`diff` of the two 12-name lists is
empty). Nothing went quiet.

## Union arithmetic - my own count of [Fact]/[Theory] under WebApi.Tests

    merge base de1e5c5e   4207
    target     4685fb01   4349        merge = 4349 + (4229 - 4207) = 4371
    stack tip  1a0c0cbb   4229
    merge      5df07afa   4371        <- exact. No pin lost, none duplicated.

+22 attributes, +42 test cases: the difference is Theory expansion, and the added list accounts for
it exactly. Five of the 22 are `[Theory]` and expand to 5 + 4 + 4 + 6 + 6 = 25 cases; the other 17
are `[Fact]` and expand to one each. 17 + 25 = 42.

Added cases by class, counted from `work/added-tests.txt`:

    DocumentRendererFailureTests    10      PdfDownloadWireTests             6
    DownloadHeaderWireTests          8      PdfRendererOutageWireTests      16
    MealsDownloadHeaderWireTests     1      WireContainmentTests             1

## Nothing was silently reverted

The 17 files only this stack changed are BYTE-IDENTICAL to `1a0c0cbb` in the merged tree, checked by
comparing blob ids rather than by reading diffs: `MealsStatementController.cs`,
`BrowserReadableHeaders.cs`, `DocumentRenderException.cs`, `DocumentRenderExceptionMiddleware.cs`,
`IDocumentRenderer.cs`, `InvoiceService.cs`, `OkamFunctionsDocumentRenderer.cs`,
`OkamPayoutService.cs`, `ReceiptService.cs`, `RendererTransport.cs`,
`DocumentRendererFailureTests.cs`, `DownloadHeaderWireTests.cs`,
`MealsDownloadHeaderWireTests.cs`, `PdfDownloadWireTests.cs`, `PdfRendererOutageWireTests.cs`,
`WireContainmentTests.cs`, `WireHost.cs`.

`git diff --name-status 4685fb01 5df07afa` lists 24 paths and ZERO deletions - the merge takes
nothing off the target.

## The seven hazards, each checked by name

1. DOUBLE-LANDED CORS POLICY - not present, and this family is the one that could have caused it.
   `AddCors` 1, `UseCors` 1, `AddPolicy` 9, `WithOrigins` 1 - identical counts at the target, at the
   stack tip and at the merge. The default policy's `WithExposedHeaders` exists exactly ONCE
   (`Program.cs:102`) and reads `BrowserReadableHeaders.All`; the MCP policy's own
   `WithExposedHeaders("Mcp-Session-Id")` at :110 is untouched. The target still carried
   `WithExposedHeaders("ETag")` before the merge, so this stack is the only side that changed it -
   no second landing of the same fix.
2. FORKED GUEST LINK - not present. Zero hits for `GuestLink`, `BuildGuestLink` or a public-link
   builder on either side; this family touches no guest surface.
3. PREDICATE COLLISION - checked, and the live risk was on the target's side rather than the
   stack's. The target lands `RequestBodyTelemetryPinTests`, whose scope is DERIVED - it sweeps every
   concrete middleware and telemetry participant in the application assembly - and this stack adds a
   new middleware, `DocumentRenderExceptionMiddleware`, in the convention shape that sweep matches.
   So the merge puts a type the target's predicate had never seen in front of it. Read before the
   run: `Construct` builds convention middleware from `(RequestDelegate)` plus the container, and
   `Assert.Fail`s BY NAME on anything it cannot build, so an incompatible constructor would have
   been a named red rather than a silent skip. The middleware constructs, runs, writes nothing to
   telemetry, and the sweep is green at the merge commit. Registration side: `IDocumentRenderer` is
   registered exactly once and `UseMiddleware<DocumentRenderExceptionMiddleware>` appears exactly
   once in the whole merged tree - not double-registered, not reverted. The target's
   `CompositionRootLimiterWireTests` asserts a NAMED list of limiters resolves rather than an
   exhaustive registration census, so an added registration cannot collide with it.
4. RECEIPT TRAP - it DID arise, and it is the single conflict above. Resolved by union, never by
   side. Every row and every paragraph from both forks survives; one stale cross-reference corrected.
5. CENSUS FLOORS GONE STALE - checked ahead of the run and then proved by the run. The stack's own
   census, `DownloadHeaderWireTests.Every_controller_that_serves_a_file_names_it_and_is_accounted_for`,
   asserts SET EQUALITY over the controllers that serve files, so a download the target added would
   have turned it red. The target's `Controllers/` tree was scanned before merging and yields exactly
   the ten names the census knows (`GiftcardController`, `InvoicesController`,
   `MarginPriceImportsController`, `MarginStatementsController`, `MealsStatementController`,
   `OrdersController`, `SaftController`, `StatisticsController`, `WorkforceAttendanceController`,
   `WorkforcePersonnelListController`) - no drift, and it is green at the merge. The target's own
   floors are all lower bounds on derived scopes (`ModuleFlagCensus` >= 200 files,
   `ModuleReachabilitySweepTests` > 800 files / > 100 registrations, `PiiLogSweepTests` >= 780 log
   calls, `CredentialCompositionSweepTests` >= 20000 statements); this stack only adds files, calls
   and registrations, and every one of those sweeps ran green against the MERGED text of
   `Program.cs`, which both sides changed.
6. REGISTRABLE-DOMAIN HELPER LANDING TWICE - not present. `RegistrableDomain` has 2 hits at the
   target and 0 on the stack, both inside one target test file
   (`EventsGuestOriginConfigurationWireTests`, a private local method); the count is unchanged at the
   merge. Zero hits for `PublicSuffix` or `EffectiveTld` anywhere.
   Family-specific twin of the same hazard, since `BrowserReadableHeaders.cs` is exactly the kind of
   file two lanes invent independently: the target tree carries NO browser-readable-header,
   exposed-header or content-disposition helper of its own (`git ls-tree` and `git grep` both empty),
   so this file lands once. Each type this merge adds is declared in exactly one file
   (`BrowserReadableHeaders`, `DocumentRenderException`, `DocumentRenderExceptionMiddleware`,
   `IDocumentRenderer`, `OkamFunctionsDocumentRenderer`, `RecordingDocumentRenderer`,
   `RenderedDocument`).
7. A CLEAN MERGE THAT DOES NOT COMPILE - the merge WAS built, before any tier, from a clean tree:
   exit 0, 0 errors. The construction seams were read as well as compiled, above.

## The four returns were read before merging

`L-DOWNLOAD-HEADERS-1`, `L-DOWNLOAD-PDF-WIRE-1`, `L-PDF-NULLDEREF-1` and
`L-INVOICE-RETRY-RETIREMENT-1`, all four in full. Three things in them bear on this merge and are
recorded rather than acted on, because none is mine to change:

- A LIVE Azure Functions host key is committed in `OkamFunctionsDocumentRenderer` and now lands on
  the integration branch. L-DOWNLOAD-PDF-WIRE named it, deliberately did not redact it, and left
  ROTATION as the owner's action; L-PDF-NULLDEREF kept it out of its own commit by reflecting it at
  runtime. The key is unchanged by this merge and the rotation is still owed.
- `POST /invoices/RetrySendingExistingInvoices` carries no `[Authorize]` and iterates every unsent
  invoice in the database; `InvoicesController` has no class-level `[Authorize]` either
  (F-INVOICE-ROUTES-ANONYMOUS). Confirmed by two of the four lanes, not touched by any of them and
  not touched here.
- A credit note downloads under the number of the invoice it CREDITS, so two credit notes on one
  invoice collide on one filename. Pinned as it behaves; the name is what an operator files, so it
  is its owner's call.

## Money path - C4, and why this merge is not a `blocked`

Invoices are a money path, and this stack changes `InvoiceService`, `OkamPayoutService` and
`ReceiptService`. No conflict landed on any of them: the three files are lane-only, byte-identical to
`1a0c0cbb` in the merged tree, and the target does not touch them at all. No retry or settlement
write was merged into, and no actor was made ambiguous - the only actor-bearing change in the stack
(the invoice retry's address rollback) arrives whole from one side. There was nothing to guess, so
there was nothing to stop for.

## Constraints

C1 no append-only mutation. C2 NO MIGRATION AUTHORED - `git diff 4685fb01 5df07afa -- Migrations/`
is empty. C3 by construction: the stack's port, middleware, registration and existing routes arrive
in one change, and the four previously-unreachable files are now on the branch. C4 above. C6 no
statutory claim added. C7 the one log call this merge lands carries a status code and a function
name only; the target's `PiiLogSweepTests` and `CredentialCompositionSweepTests` both ran against
the merged tree and are green.

## Containers

NONE started, stopped, inspected or killed. The same five foreign containers were up before and
after (`okam-lvsp-sql`, `okam-lwr-sql`, `okam-lws-staff-sql`, `okam-lws-sql`, `zen_pasteur`). The
SQL tier was NOT run; the container-free tier is the whole of what is measured here, and no SQL tier
has run against this merge.

## Exit criterion

Checked against the BRANCH with `git ls-tree -r --name-only feature/restaurant-modules`, not against
a worktree:

    Helpers/BrowserReadableHeaders.cs                    PRESENT
    WebApi.Tests/Wire/DownloadHeaderWireTests.cs         PRESENT
    WebApi.Tests/Wire/PdfDownloadWireTests.cs            PRESENT
    WebApi.Tests/Wire/PdfRendererOutageWireTests.cs      PRESENT

All four were absent before this lane. Four lanes had reported `built` against files no caller on the
integration branch could reach; that is now closed, and with it the last four of the twelve files
this program started with.

## What this is not

C5 is NOT met. Nobody has walked anything and no UI was opened. A green suite is evidence that code
behaves; it is not evidence that a capability exists, and it is never acceptance.

## Evidence in this directory

    work/baseline-4685fb01.trx     the baseline run, whole
    work/merged-5df07afa.trx       the merge-commit run, whole
    work/baseline-tests.txt        4541 discovered names, sorted
    work/merged-tests.txt          4583 discovered names, sorted
    work/removed-tests.txt         EMPTY - 0 tests removed
    work/added-tests.txt           the 42 added, by name
    work/baseline-skips.txt        the 12 skips, identical to
    work/merged-skips.txt          the 12 skips at the merge
    work/{baseline,merged}-build.log   both builds, tails
    work/{baseline,merged}-test.log    both tier runs, tails

`wt-pdffamily` was removed and pruned after the evidence above was copied out and the branch was
confirmed at `5df07afa` (`git worktree remove --force` over an asserted-clean tree, then
`git worktree prune`). The merge commit is reachable from `feature/restaurant-modules`, so nothing
depended on the worktree surviving.

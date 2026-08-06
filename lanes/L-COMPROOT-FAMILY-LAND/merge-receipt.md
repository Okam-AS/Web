# L-COMPROOT-FAMILY-LAND - merge receipt

brief acf4f7aa - 2026-08-04 - OkamAPI (backend). Local only. Nothing pushed. No migration authored.

## Where the work was done

Worktree `/Users/svendaneel/okam/wt-comprootfam`, created by me with `git worktree add --detach`
at `a273e013`. `/Users/svendaneel/okam/OkamAPI-modules` (lane/meals-grace-pins, live WebApi process)
was never entered. `/Users/svendaneel/okam/wt-land-utlkvit`, which holds the
`feature/restaurant-modules` checkout, was read with `git status` once and never written to.

`git status --porcelain` was asserted EMPTY before each build. The wire tier dirties two tracked
files, `artifacts/journeys/ev-dietary/run-sheet.json` and `.md`; both were restored with
`git checkout --`, never committed. Every commit was made by pathspec; `git add -A` was never used.

The branch ref was safe to move: `git worktree list` shows `feature/restaurant-modules` checked out
in NO worktree at the time of the landing (`wt-land-utlkvit` and `OkamAPI-evfamily` are both detached),
so no other worktree was left holding a stale index.

## Ancestry - measured, not inherited from the brief

    git merge-base --is-ancestor 8704ff63 <each>     lane/confirm-server-halves is an ancestor of
      lane/composition-root-check       YES            all five other family members. Merging it
      lane/reservation-limiter-move     YES            separately would have replayed the same five
      lane/confirm-postmerge-pin        YES            commits and manufactured a false conflict.
      lane/confirm-conat-retire         YES
      lane/crypto-pin-byform            YES
      lane/ai-middleware-delete         NO           <- the independent branch, as briefed

    chain A  bfe57c3c -> d9189fbd -> 02c077cb        both --is-ancestor checks YES
    chain B  6771ba9a -> cfb3b14a                    --is-ancestor YES
    git merge-base 02c077cb cfb3b14a = 8704ff63      the two tips fork at exactly that commit

    +N against the merge base with the target (de1e5c5e):
      confirm-server-halves +5    confirm-postmerge-pin +8    crypto-pin-byform +8
    ai-middleware-delete: +1 off 3579bbbc.

All of this matches the brief exactly, so the two disputed returns are reconciled rather than in
conflict: L-CONFIRM-POSTMERGE-PIN's "BRIEF CORRECTION - lane/confirm-conat-retire is a SIBLING"
was a correction to ITS brief, and it is what this brief already says. Both returns were read.

## What was merged, in order

    26c8f380  merge a273e013 + lane/confirm-postmerge-pin (02c077cb)   1 conflict
    8a8ea758  merge 26c8f380 + lane/crypto-pin-byform    (cfb3b14a)    2 conflicts
    eca0791a  merge 8a8ea758 + lane/ai-middleware-delete (5b2e99c8)    0 conflicts
    3b4b14d5  merge 9888178f + eca0791a                                0 conflicts
    35696d6b  merge b9c95082 + 3b4b14d5                                1 conflict   <- LANDED

Each is a true two-parent merge; `git log --format=%P` confirms the parents above. Three tips, not
six branches: the other three lanes ride in as ancestors.

`feature/restaurant-modules` is at `35696d6b`. Local only, nothing pushed.

## The branch moved under this lane TWICE, and the CAS caught it both times

`feature/restaurant-modules` was at `a273e013` when this lane started and the whole family was
composed over it as `eca0791a`. Then, while the tier ran:

    a273e013 -> 9888178f   L-EV-FAMILY-LAND: lane/ev-accept-gate, lane/ev-guest-origin
    9888178f -> b9c95082   lane/meals-pos-tender-wire, lane/meals-release

Each landing was attempted with a compare-and-swap naming the value this lane expected:

    git update-ref refs/heads/feature/restaurant-modules <new> <expected>

The first REFUSED, naming `9888178f` as the value it actually found. Before the second, the tip was
re-read and found to be `b9c95082`, so no swap was attempted against a value known to be stale.
Nothing was ever forced and no sibling commit was discarded. Both times the composition was merged
FORWARD onto the new tip: `a273e013` is an ancestor of `9888178f`, `9888178f` of `b9c95082`, and
`git merge-base eca0791a 9888178f = a273e013`.

The forward merges cost almost nothing because the families are disjoint. Onto `9888178f`: `comm -12`
over both name lists is EMPTY, zero conflicts. Onto `b9c95082`: the only shared path in the whole
tree is `artifacts/tests/README.md` - the receipt trap for a third time - and no code file conflicted.

The tier was re-run at each composition and finally at the LANDED commit. Nothing was inherited.

## Conflict count: 4, all in artifacts/tests, none in source

Trial-merged first with `git merge-tree --write-tree` before touching anything - a273e013 x 02c077cb
= 1 conflict, x cfb3b14a = 1 conflict, x 5b2e99c8 = 0. The real merges reproduced that.

1. `artifacts/tests/README.md` (merge 1) - RECEIPT TRAP. Resolved as a UNION: `a7697121` from the
   shared ancestor, `bb82b3a0` from the target and L-RESERVATION-LIMITER-MOVE's pair all keep their
   rows. Nothing resolved to a side. One edit beyond the union: the last row's SHA column read
   `this commit`, true on `lane/confirm-postmerge-pin` and false the moment a merge carried it, so
   the SHA it actually ran against - `d9189fbd`, verified with `git log --diff-filter=A` - is
   written out.
2. `artifacts/tests/README.md` (merge 2) - same trap again. Union again; both crypto-pin rows kept,
   and the surrounding prose re-pointed because "the two rows above" stopped being true once the two
   tables were joined.
3. `artifacts/tests/base-8704ff63-fast-tier.trx` (merge 2) - ADD/ADD. L-COMPOSITION-ROOT-CHECK ran
   the base at 13:55:30 and L-CONFIRM-CONAT-RETIRE ran it again at 13:57:43 on 2026-08-02, and the
   two branches carried byte-different files at one path. Same run of the same commit: both report
   `total=4410 executed=4398 passed=4398 failed=0`, and the 52k-line diff is run ids, GUIDs and
   timestamps. Kept blob `51e97fa2` (the one the README prose names); blob `10a733ea` is named in
   the README with its id and stays readable at
   `cfb3b14a:artifacts/tests/base-8704ff63-fast-tier.trx`. No measurement was deleted.

4. `artifacts/tests/README.md` (the landing merge onto `b9c95082`) - the trap a third time, against
   the Meals family this time. Union again: all THIRTEEN rows survive (`8c8a243d`, `6f26ad2b`,
   `ffb29e4e`, `baa5e38a`, `f8b3a30f`, `99855b1d`, `a7697121`, `bb82b3a0`, `0659666f`, and the four
   this family brings) and so does every prose paragraph from both sides.

No source file conflicted, in any of the five merges. Past their fork point the two tips touch no
`.cs` file in common; the only overlapping paths are the ones above, and the only path this family
and the Meals family both touch is that README.

## Tier - re-run AT the merge commit, and a baseline I measured myself

Both runs in the same worktree, same command, no `--no-build` anywhere:

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"

Never `FullyQualifiedName!~SqlServer`.

    BASELINE  clean a273e013   Failed 0, Passed 4387, Skipped 12, Total 4399   6 m 55 s  exit 0
    COMPOSED  eca0791a         Failed 0, Passed 4447, Skipped 12, Total 4459   6 m 18 s  exit 0
    FORWARD   3b4b14d5         Failed 0, Passed 4454, Skipped 12, Total 4466   5 m 39 s  exit 0
    LANDED    35696d6b         Failed 0, Passed 4466, Skipped 12, Total 4478   5 m 05 s  exit 0

    DELTA of this family over its own baseline:  +60 tests, +60 passing, 0 failed,
    skipped unchanged at 12. The skip LIST is identical to the baseline's, name for name -
    nothing went quiet.

The arithmetic closes against numbers this lane did not produce: a273e013 = 4399 (mine), the sibling
lane measured 9888178f = 4406 independently, 4406 + 60 = 4466, which is what 3b4b14d5 actually
returned. The +60 cases come from +57 `[Fact]`/`[Theory]` attributes because Theories expand.

No per-lane green was inherited. Each lane in this family was green alone; that is exactly what a
merge can break, which is why every number above was produced from a commit this lane composed.

Assembly freshness watched at each run, since `--no-build` over a stale binary is how a merge can
appear green against code that never compiled. At 3b4b14d5: newest tracked `.cs` 1785798670,
`WebApi.dll` 1785798704, `WebApi.Tests.dll` 1785798712. At the LANDED commit 35696d6b: newest tracked
`.cs` 1785799152, `WebApi.dll` 1785799288, `WebApi.Tests.dll` 1785799296. Both assemblies newer than
every tracked source in both runs. `--no-build` appears zero times in any run log.

Delta at the landed commit: 4478 - 4418 = +60 over `b9c95082`, the same +60 this family contributed
over `a273e013`. The skip list at 35696d6b is name-for-name identical to the baseline's.

The known flake did NOT recur: `EventsOutboxDeliveryTests.The_message_carries_the_link_and_no_other_
guest_data`, which L-CRYPTO-PIN-BYFORM recorded failing once on a `DoesNotContain("250", ...)` that
aliased onto a random `PublicToken`, passed in all four runs here.

## Union arithmetic - my own count of [Fact]/[Theory] under WebApi.Tests

    de1e5c5e 4199   a273e013 4227      merge 1 = 4227 + (4247 - 4199) = 4275
    8704ff63 4238   02c077cb 4247      merge 2 = 4275 + (4246 - 4238) = 4283
    3579bbbc 4206   cfb3b14a 4246      merge 3 = 4283 + (4207 - 4206) = 4284
                    5b2e99c8 4207
                    eca0791a 4284      <- exact. No pin lost, none duplicated.

    9888178f 4234   3b4b14d5 4291      4234 + 57 = 4291
    b9c95082 4246   35696d6b 4303      4246 + 57 = 4303

57 is exactly the family's attribute delta over a273e013 (4284 - 4227), and it survives BOTH forward
merges unchanged. Each forward merge added this family and nothing else - it did not pick up, drop or
duplicate a pin belonging to the Events or Meals families it was merged past.

## The six hazards, each checked by name

1. DOUBLE-LANDED CORS POLICY - not present. No family member touches `AddCors`, `UseCors`,
   `AddPolicy` or `WithOrigins`. Counts identical at a273e013 and eca0791a (AddCors 1, UseCors 1,
   AddPolicy 9).
2. FORKED GUEST LINK - not present. No guest-link or public-link builder is defined or edited on any
   family member; zero hits at both a273e013 and eca0791a.
3. PREDICATE COLLISION - THE LIVE RISK, and it resolved correctly. `IReservationRateLimiter`'s
   registration is at `Helpers/ServiceCollectionExtensions.cs:60` on the target, on
   `lane/crypto-pin-byform` and on `lane/ai-middleware-delete`, and only `lane/confirm-postmerge-pin`
   moves it to `Program.cs`. Git applied the deletion and the addition; the merged tree has it
   exactly ONCE, at `Program.cs:1028`, and nowhere else. Not double-registered, not reverted.
   The vacuous assertion `02c077cb` deleted is NOT resurrected: `git grep DoesNotContain(services`
   at eca0791a returns three lines - `IMemoryCache` and `IOAuthSmsRateLimiter` in the throwing test
   (both ordering facts, both still able to fail) and `IReservationRateLimiter` at line 285, which
   is the new placement pin fenced by two `Contains` lines inside a call that SUCCEEDS. No other
   branch carries `CompositionRootLimiterWireTests.cs` at all, so there was nothing to resurrect it
   from.
4. RECEIPT TRAP - it DID arise, twice, and both are in the conflict list above. Resolved by union,
   never by side. Every row and every prose paragraph from both forks survives.
5. CENSUS FLOORS GONE STALE - the tier at the merge commit is the check, and it is reported above.
   `WebApi.Tests/Modules/ModuleFlagCensus.cs`, `TrainingFlagCensus.cs`, the reachability sweeps and
   the source-scanning tests that read `Program.cs` as text (`PiiLogSweepTests`,
   `CredentialCompositionSweepTests`, `MealsFeatureSettingsBindingTests`,
   `PowerUserBypassMechanismTests`, `ModuleFeatureFlagContractTests`) all ran; `Program.cs` changed
   on both sides of this merge, so they were exercised against the merged text, not a lane's.
6. REGISTRABLE-DOMAIN HELPER LANDING TWICE - not present. Zero hits for `RegistrableDomain`,
   `PublicSuffix` or `EffectiveTld` at a273e013 and at eca0791a.

Additionally, no type lands twice: every public type declared by a file the merge adds was counted
across the whole merged tree and none appears in more than one file.

The two disputed returns were read before any merge, as the brief required.
`L-COMPROOT-PIN-OVERDETERMINED` returned "ALREADY LANDED BY THE SIBLING L-CONFIRM-POSTMERGE-PIN" and
wrote nothing, and `L-CONFIRM-POSTMERGE-PIN` returned a brief correction calling
`lane/confirm-conat-retire` a SIBLING. Both are consistent with what git says and with THIS brief:
the correction was to a different brief, and this one already models the family as two tips forking
at `lane/confirm-server-halves`. There was no disagreement left to resolve, and `--is-ancestor`
confirmed every claim rather than taking either return on trust.

## Startup wiring - the reason ai-middleware-delete was merged here

The composition-root pins and the middleware deletion do not disagree. Zero conflicts, and the two
edits are at opposite ends of `Program.cs`: `AddTransient<ApplicationInsightsLoggingMiddleware>` is
deleted at line ~193, `AddSingleton<IReservationRateLimiter>` arrives at line 1028. The merged
`Program.cs` is exactly `02c077cb`'s minus that one line, and exactly `5b2e99c8`'s plus 18 - the
union, with nothing dropped. No reference to the deleted middleware survives outside the doc comment
on `RequestBodyTelemetryPinTests` that explains why the pin exists.
`CapabilityRouteTelemetryInitializer`, which the merged CLAUDE.md now names, does exist
(`Helpers/CapabilityRouteTelemetryInitializer.cs`).

Neither side was silently reverted: the six files only `lane/crypto-pin-byform` changed are
byte-identical to `cfb3b14a` in the merged tree, and `CompositionRootLimiterWireTests.cs` and
`ServiceCollectionExtensions.cs` are byte-identical to `02c077cb`.

## Exit criterion

Both files are present on `feature/restaurant-modules`, checked with `git ls-tree -r --name-only`
against the BRANCH rather than against a worktree:

    WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs     <- lane/confirm-postmerge-pin
    WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs        <- lane/ai-middleware-delete

Before this lane, neither was on the branch, and three lanes reported `built` against files no caller
on the integration branch could reach. That is now closed.

The branch is at `35696d6b`, local, unpushed. There is no `origin/feature/restaurant-modules`.

Verified on the branch, not on a worktree:

    all six family lanes are ancestors of feature/restaurant-modules
      lane/confirm-server-halves      8704ff63   YES
      lane/composition-root-check     bfe57c3c   YES
      lane/reservation-limiter-move   d9189fbd   YES
      lane/confirm-postmerge-pin      02c077cb   YES
      lane/confirm-conat-retire       6771ba9a   YES
      lane/crypto-pin-byform          cfb3b14a   YES
    and so is lane/ai-middleware-delete 5b2e99c8 YES

    git grep AddSingleton<...IReservationRateLimiter>  ->  Program.cs:1028, one hit, whole tree
    git grep class ApplicationInsightsLoggingMiddleware ->  no hit outside artifacts/
    git diff b9c95082 35696d6b -- Migrations/           ->  empty. No migration authored.

## Containers

NONE started, stopped, inspected or killed. The same five foreign SQL containers were up before and
after (`okam-lvsp-sql`, `okam-lwr-sql`, `okam-lws-staff-sql`, `okam-lws-sql`, `zen_pasteur`). The
SQL tier was not run and NO SQL TIER HAS EVER RUN AGAINST ANY COMMIT OF THIS FAMILY, this merge
included.

## What this is not

C5 is NOT met. Nobody has walked anything and no UI was opened. A green suite is evidence that code
behaves; it is not evidence that a capability exists, and it is never acceptance.

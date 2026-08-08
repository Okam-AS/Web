# Backend suite run — `72cf3e0a34b278514bb6872c8803a52384a80000`

The first run of the confirm family **composed**. Every other number in this family is per-lane:
each of the five heads measured itself against its own base, and no two of them had ever been in
one tree before this commit.

## Provenance

| | |
| --- | --- |
| SHA | `72cf3e0a34b278514bb6872c8803a52384a80000` |
| branch | `integration/confirm-family` (integration branch, NOT `feature/restaurant-modules`) |
| commit | `Merge lane/gr-postmark-webhook (5b895dc4) into the confirm family` — the fifth and last merge |
| working tree | clean `git worktree` at `wt-confirmfam`, created for this merge; `git status --porcelain` empty before the build |
| SDK | 8.0.110 (pinned by `global.json`, resolved and checked in this worktree) |
| host | macOS, Darwin 25.5.0 |
| artifact | `../merge-72cf3e0a-fast-tier.trx` |

## What is in this tree

Base `de1e5c5e`, then the five true heads in the order the Fable review named:

```
de1e5c5e --ff--> 75e5168c   lane/gr-confirm-stale
         + d9189fbd         lane/reservation-limiter-move   (README.md conflict, unioned)
         + 6771ba9a         lane/confirm-conat-retire       (base trx add/add, BOTH renamed)
         + f7abfd8e         lane/gr-deadline-statute        (clean)
         + 5b895dc4         lane/gr-postmark-webhook        (clean)
```

All five verified contained in `HEAD` by `git merge-base --is-ancestor`, not by reading the log.

## Command

```sh
git worktree add -b integration/confirm-family ../wt-confirmfam de1e5c5e
# five merges, above
git status --porcelain                                          # empty — asserted BEFORE the build
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug          # 0 errors, 679 warnings
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" \
  --logger "trx;LogFileName=merge-72cf3e0a-fast-tier.trx"
```

The build was a **full compile into an empty `bin/`** — the worktree was created for this merge — so
the `--no-build` trap in `CLAUDE.md` cannot apply. Before the tier was trusted, `find -name '*.cs'
-newer WebApi.Tests/bin/Debug/net8.0/WebApi.Tests.dll` was run over the tree excluding `bin/` and
`obj/`: **no source file was newer than the assembly**, and both `WebApi.Tests.dll` and the
`WebApi.dll` it loads carry the same build timestamp.

## Result

From the `.trx` `<Counters>`, which is the authority for what ran:

```
total="4487" executed="4475" passed="4475" failed="0" error="0" timeout="0" aborted="0"
```

Process exit code `0`; 5 m 17 s of test time. This is the first time the composed tree has been
either compiled or run.

When the tier finished the only dirty paths were `artifacts/journeys/ev-dietary/run-sheet.{json,md}`,
which `EventsDietaryRunSheetWireTests` regenerates with the run date, plus the untracked
`TestResults/` — the same churn the receipts below this one record. Both were reverted, not committed.

## What this run does NOT cover

- **The SQL tier has never run against any commit in this family, including this one.** Five foreign
  SQL containers were up throughout holding roughly 6.13 GiB of a 7.65 GiB VM; this run started no
  container and touched none of theirs. `docker ps` was captured before and after and is identical.
  Every `Database=SqlServer` test in this tree is unmeasured at every commit in the family.
- The composed tree still contains one assertion that **cannot fail**:
  `CompositionRootLimiterWireTests` / `CompositionRootRegistrationOrderTests`, the
  `IReservationRateLimiter` absence line. `d9189fbd` moved that registration out of
  `AddMcpAuthentication` entirely, so the line is now true for a second reason. The 12 skipped tests
  are unchanged from the lanes' own runs and are not related to it.

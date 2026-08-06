# Merge receipt - L-MEALS-POSREL-LAND

Repo: OkamAPI (backend). Branch: `feature/restaurant-modules`. Merge is LOCAL ONLY - nothing pushed,
no remote ref touched, no migration authored, no container started, stopped or inspected.

Worktree: `/Users/svendaneel/okam/wt-mealsposrel` (created by this lane, detached, mine alone).
`/Users/svendaneel/okam/OkamAPI-modules` (`lane/meals-grace-pins`, live WebApi process) was NEVER
entered, checked out, reset, stashed or merged in.

## What merged

Neither lane contained the other and neither was an ancestor of the integration tip, so both were
merged, as two real two-parent merges:

| merge commit | merges | parents |
| --- | --- | --- |
| `21f79514` | `lane/meals-pos-tender-wire` (`32fd5a86`) | `9888178f`, `32fd5a86` |
| `b9c95082` | `lane/meals-release` (`af53dc84`) | `21f79514`, `af53dc84` |

`git merge-base --is-ancestor` before merging, all four directions:

- pos-tender is NOT an ancestor of release; release is NOT an ancestor of pos-tender
- merge-base(FRM, pos-tender) = `1a03bc6c`; merge-base(FRM, release) = `24dec838`;
  merge-base(pos-tender, release) = `24dec838`

Exit criterion, verified on the branch itself with `git ls-tree -r --name-only feature/restaurant-modules`:

- `WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs` - PRESENT
- `WebApi.Tests/Wire/MealsQuoteReleaseWireTests.cs` - PRESENT

Both were absent at `a273e013`. 32 files changed by this landing; no `Migrations/` path, no `Program.cs`.

## Conflict count

**One textual conflict**, in both merges combined: `artifacts/tests/README.md`.

The four Meals files both lanes changed - `Services/Meals/Interfaces/IMealsFundingAuthority.cs`,
`Services/Meals/MealsFundingAuthority.cs`, `Services/Meals/DenyClosedMealsFundingAuthority.cs`,
`WebApi.Tests/Meals/MealsFundingTestKit.cs` - auto-merged with no conflict. Every hunk of that
composition was read against BOTH parents before it was accepted (`git diff <parent> -- <file>` in
each direction), not trusted because git was quiet.

## THE MERGE-ONLY BUILD BREAK - the thing no single lane could see

`git merge` reported success and the result **did not compile**:

```
WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs(138,53): error CS0535:
'MealsPoisonedModuleGraph.ThrowingFundingAuthority' does not implement interface member
'IMealsFundingAuthority.AuthorizePointOfSaleTenderAsync(int, int, long, string, string, CancellationToken)'
```

`lane/meals-release` introduced a brand-new `IMealsFundingAuthority` implementation - the
`ThrowingFundingAuthority` test double - against an interface with four members. `lane/meals-pos-tender-wire`
added a fifth member against a graph that had no such double. Textually disjoint, so no conflict; both
lanes green alone. This is exactly the "both were green alone; that is what a merge breaks" case, and it
is why the tier was re-run at the merge commit instead of either lane's number being inherited.

Fixed in the merge that caused it, by giving the double the fifth member with the same `throw Entered()`
body as its four siblings. It is a test double whose entire contract is that entering any seam member
from a poisoned graph is the failure: it writes nothing, decides nothing, and no production file was
touched to resolve it. Not a money-path resolution and not a guess - the compiler named the member and
the class has four identical siblings.

Evidence: `tier-merge.summary.txt` (the failing build), `tier-merge2.summary.txt` (green after the fix).

## Tier numbers - baseline measured by this lane, in this worktree, at each clean base

Container-free tier only: `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`.
Never `FullyQualifiedName!~SqlServer`. No `--no-build` on any measured run. No SQL tier: no container was
started, and the five foreign SQL containers on this host were the same set before and after.

**The integration branch moved under this lane mid-flight**, so the merge was measured twice, against two
bases, and both deltas are identical:

| base | base tier | merge commit | merge tier | delta |
| --- | --- | --- | --- | --- |
| `a273e013` | 4387 P / 0 F / 12 S / 4399 T | `d776f9e7` | 4399 P / 0 F / 12 S / 4411 T | **+12 P, +12 T, 0 F, S unchanged** |
| `9888178f` | 4394 P / 0 F / 12 S / 4406 T | `b9c95082` | 4406 P / 0 F / 12 S / 4418 T | **+12 P, +12 T, 0 F, S unchanged** |

All four runs exit 0. `git diff a273e013 d776f9e7` and `git diff 9888178f b9c95082` are byte-identical,
so re-merging onto the newer base changed nothing this lane authored.

+12 is exactly the union of what the two lanes claimed and nothing more: 4 from
`MealsPosCreditTenderReachabilityTests` + 7 from `MealsQuoteReleaseWireTests` + 1 deny-closed seam
contract in `MealsSeamContractTests`. No pin was lost in the merge and none was duplicated.

Targeted confirmation of the two files the exit criterion names, at the merge commit:
`Passed! - Failed: 0, Passed: 11, Skipped: 0, Total: 11` (4 + 7).

**Assembly freshness checked on every measured run** (the `--no-build` stale-green trap): at each run the
`WebApi.dll` and `WebApi.Tests.dll` mtimes were newer than the newest tracked `.cs`. At the merge run that
matters most, `MealsPoisonedModuleGraph.cs` was `1785798552` and `WebApi.Tests.dll` `1785798617` - the
binary measured contains the fix.

**Worktree asserted clean before every build**, and the wire tier dirties two tracked files every time -
`artifacts/journeys/ev-dietary/run-sheet.json` and `.md`, another lane's evidence. Restored with
`git checkout --` after each run, never committed over. Every commit was by pathspec; no `git add -A`.

## The six merge hazards, by name

| hazard | verdict |
| --- | --- |
| **predicate collision** | **CHECKED AND CLEAR.** `Services/Kassa/KassaCreditSale.cs:25` remains the single `IsCreditSale` definition the utlkvit family composed six call sites onto, and `lane/meals-pos-tender-wire` adds NO second predicate. Its branch keys on `request.PaymentType.IsCompanyAccount()` at the allocation - the same `Helpers/PaymentTypeExtensions.cs:128` helper `KassaCreditSale` itself uses - so the company part is what makes the EXISTING predicate true downstream rather than a rival answer to the same question. `FinalizeService.cs` and `PosReceiptService.cs` are not in either lane's diff and not in this landing's 32 files. |
| **receipt trap** | **AROSE, AND WAS THE ONLY CONFLICT.** Both lanes appended a row to the run table in `artifacts/tests/README.md` at the same position. Resolving to either side silently deletes the other's measurement. Kept BOTH rows - `bb82b3a0` (4369) from the branch and `0659666f` (4359) from the lane - which is the directory's own written rule ("Do not overwrite an existing row - a superseded run is still the honest record"). Neither `.trx` was touched; `0659666f-fast-tier.trx` and its `RUN.md` landed intact. |
| double-landed CORS policy | CLEAR. No `Program.cs`, no `Startup`, no CORS file in the landing. The only `cors` strings in the diff are inside the committed `0659666f-fast-tier.trx` test-result XML (two `WireContractPinsTests` result rows), not code. |
| forked guest link | CLEAR. No guest-link file, type or string in the 32-file diff. |
| census floors gone stale | CLEAR AND CONSISTENT. `lane/meals-release` moved the Meals route census 29 (6, 23) to 30 (7, 23) and corrected the "twenty-five"/"twenty-nine" prose in five files. `lane/meals-pos-tender-wire` adds NO route, NO flag and NO operator lever - it reuses `POST pos/settlement/{id}/allocation`, which already carries `PaymentType` in its body - so it moves no census. Both lanes' floors hold at the merge: `MealsOperatorLeverReachTests`, `MealsGateDeploymentReachTests`, `MealsRouteGateReachabilityTests`, `MealsFeatureFlagCompositionTests` and the module actor/call-site pins are all inside the 0-failed tier at `b9c95082`. |
| registrable-domain helper landing twice | CLEAR. No `RegistrableDomain`/public-suffix helper in either diff, and a repo-wide grep finds no second definition. |

## C4 - money path

No conflict landed on a tender, funding, release or statement write, and no actor was made ambiguous, so
this lane did not have to stop. The two lanes' money-path members are disjoint on one interface
(`AuthorizePointOfSaleTenderAsync` vs `ReleaseSupersededAsync`); the only shared production code they
both edit is the class-level doc comment and the member list. `MealsFundingAuthority`'s
`ReleaseResolvedReservationAsync` gained the release lane's `boundIsReleasable` gate with the pos-tender
lane's audit-writer dependency alongside it, both intact and both proven by the tier. The one file this
lane edited itself is a test double that performs no write.

## Not done, and not this lane's to do

- **No SQL tier has run against either lane or against this merge.** The brief forbids starting a
  container. Unproven on SQL Server: the Meals audit AFTER trigger over the new POS tender audit row, and
  the CONCURRENT double release (`MealsFundingReservation.ConcurrencyVersion` is `IsRowVersion()`, inert
  on SQLite).
- **C5: this is not acceptance.** 4406 green is evidence that code behaves. Nobody has walked either
  journey. The till's "Bedriftskonto" tender button lives in the frontend repo (FE-MLS-8) and no client
  calls the release route yet.
- BE-MLS-6 (kassasystemforskrifta 2-8-2 credit-sale count/amount on the Z report) remains open and is
  now reachable exposure rather than dormant, as `L-MEALS-POS-TENDER-WIRE-1` recorded.

## Ref hygiene - and one thing the next lander should know

`feature/restaurant-modules` is a SHARED local ref and it moved under this lane twice.

1. This lane moved it `a273e013` -> `d776f9e7` with a guarded `git update-ref <new> <old>`.
2. Seconds later another lander **overwrote that with `9888178f`** (reflog: `branch: Reset to 9888178f`),
   discarding `d776f9e7` without merging it. Nothing was lost - the merge was held on a local branch -
   but an unguarded `git branch -f` on this ref silently drops whoever landed last.
3. The merge was redone onto `9888178f` (the events landing is disjoint from this one: zero overlapping
   files) and re-measured from scratch, then moved with a guarded `update-ref` again.

At the time of writing `feature/restaurant-modules` is `35696d6b` (the composition-root family landed on
top), `git merge-base --is-ancestor` confirms both `21f79514` and `b9c95082` are ancestors of it, both
exit-criterion files are on the tip, and the poisoned-graph fix survived.

`/Users/svendaneel/okam/wt-land-utlkvit` has `feature/restaurant-modules` checked out and goes stale
whenever the ref is moved from elsewhere. It was verified clean and idle (no process) and then
`git reset --hard` to the branch, twice - nothing uncommitted existed there to lose. **Anyone moving this
ref should use `git update-ref <new> <old>`, never `git branch -f`.**

Local refs created by this lane, for recovery: `land/meals-posrel` = `b9c95082` (landed),
`land/meals-posrel-v1` = `d776f9e7` (the clobbered first merge, same content on the older base).

## Evidence files

- `tier-baseline-a273e013.summary.txt` - baseline at `a273e013`
- `tier-merge.summary.txt` - the merge-only CS0535 build break
- `tier-merge2.summary.txt` - merge tier at `d776f9e7` after the fix
- `tier-base2.summary.txt` - baseline at `9888178f`
- `tier-merge3.summary.txt` - merge tier at `b9c95082` (the landed commit)

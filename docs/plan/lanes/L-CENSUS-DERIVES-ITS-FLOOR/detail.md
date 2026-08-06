# L-CENSUS-DERIVES-ITS-FLOOR — detail

brief `ccbb4e49` · actor `agent:L-CENSUS-DERIVES-ITS-FLOOR`

## Where the work is

| | |
|---|---|
| repo | `/Users/svendaneel/okam/OkamAPI` (the census is backend code, not `Web-modules`) |
| worktree | `/Users/svendaneel/okam/OkamAPI-censusderive` |
| branch | `lane/census-derives-its-floor` |
| base | `feature/restaurant-modules` @ `8e2b57de` — **verified**, this is the branch tip, and `8e2b57de` does not resolve in `Web-modules` where the brief was read |
| pushed | no. committed | no (working tree, 3 modified + 2 new) |

## What the tree actually holds, measured twice

Two derivations that share no code agree exactly: `ActorStampCensus.Derive` (C# — the estate's own
`ActorStampSource` regex/brace machinery) and `derive-groundtruth.py` (a hand-rolled character scanner plus
plain regexes, written for this lane and never linked to the C#).

| module | files | sites | resolvers | guards | old `KnownSiteFloor` | old `KnownResolverFloor` | old `KnownFiles` |
|---|---|---|---|---|---|---|---|
| Meals | 7 | 15 | 4 | 0 | 14 | 4 | 6 |
| Training | 5 | 11 | 5 | 0 | 10 | 4 | 4 |
| Events | 2 | 2 | 0 | 0 | 2 | 0 | 2 |
| Margin | 1 | 1 | 0 | 0 | 1 | 0 | 1 |
| Growth | 1 | 4 | 0 | 1 | 4 | 0 | 1 |
| GrowthAudit | 5 | 6 | 0 | 1 | 6 | 0 | 5 |

**Two audit-stamping services were in no census, not one.** The flag records Training; Meals has the same
defect at the same tip:

- `Services/Training/TrainingEvidenceService.cs:274` — `new TrainingAuditEntry` (+1 site, +1 resolver)
- `Services/Meals/MealsFundingAuthority.cs:251` — `new MealsAuditEntry` (+1 site)

`MealsFundingAuthority` is the more serious of the two: its own comment says the row is *"the only artefact
this write leaves that can name who made the company liable"* — a C4 money-path attribution. Meals claimed
fourteen sites over six files against fifteen over seven.

## Why nothing reddened

`The_derived_scope_still_sees_the_whole_population` asserted `sites >= KnownSiteFloor`,
`resolvers >= KnownResolverFloor`, `guards >= KnownGuardFloor`, and `Assert.Contains` for each
`KnownFiles` entry. Both comparison shapes are one-directional:

- **an added site cannot fail either.** A bigger number satisfies `>=`; a superset satisfies `Contains`.
  So a whole new stamping service is admitted in silence — which is exactly how both files arrived.
- **and once the tree is ahead of the floor, the slack absorbs a removal.** Training at 11 against a floor
  of 10 could lose a site and stay green, and every judgement about that site would disappear with it.
  That is the failure the floor was put there to prevent, produced by the floor.

## The instrument

`WebApi.Tests/Modules/ActorStampCensus.cs` (new) derives the population from the tree — every file that
constructs a declared stamp or declares one of the module's actor resolvers/guards, with counts — and
renders it to `WebApi.Tests/Modules/actor-stamp-census.txt` (new, committed). The census is **generated,
never typed**: `ActorStampCensus.Render` writes it, a `sha256` over the rows refuses a hand edit, and the
only way to change it is `ACTOR_STAMP_CENSUS_WRITE=1`, which rewrites the file and then **fails the run** so
a regeneration can never be mistaken for a pass.

`ModuleAuditActorCallSiteTests.The_census_names_exactly_the_population_the_tree_holds` re-derives on every
run and compares by **equality in both directions**, so an added row, a removed row and a changed count are
each a named failure. `Every_declared_stamp_is_constructed_somewhere_in_the_tree` closes the vacuity two
equal empty sets cannot see.

Four fields are deleted from `ModuleActorStampPin`: `KnownFiles`, `KnownSiteFloor`, `KnownResolverFloor`,
`KnownGuardFloor`. Keeping them beside a working census would leave the failed instrument shipping.
`GuardDeclarations` moved from the test class to `ActorStampSource` beside `ResolverDeclarations`, and the
scope enumeration (`SitesOf` / `FilesInScope` / `FilesMentioningStamp`) moved to `ActorStampCensus` so the
census and the rule read one population rather than two — a census that enumerated the tree its own way
could certify a set the rule never judges.

Line numbers are deliberately **not** in the artifact: they would churn it on every unrelated edit above a
site, training a reader to regenerate without looking. They are derived fresh to name an offender.

## Runs — red and green, on the same tree

Every run is `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter
"FullyQualifiedName~ModuleAuditActorCallSiteTests"`. The derivation reads **source**, not the assembly, so
`--no-build` is sound here; each source mutation was nonetheless compiled (`0 Error(s)`) before its run so
no proof rests on text that would not build.

| file | tree | instrument | result |
|---|---|---|---|
| `run-1-green.txt` | base | new | **39 passed / 0 failed** |
| `run-2-red-site-deleted.txt` | `TrainingEvidenceService`'s site deleted | new | **RED** — names `Training  Services/Training/TrainingEvidenceService.cs  sites=1 resolvers=1 guards=0` as a row the census holds and the tree no longer does |
| `run-3-red-count-dropped.txt` | one of `TrainingCourseService`'s five sites renamed away | new | **RED** — `sites=5` expected, `sites=4` derived, and it prints the four surviving lines (157, 234, 290, 340) |
| `run-4-red-site-added.txt` | `+ Services/Training/TrainingRefresherService.cs`, a fifth Training service that stamps | new | **RED** — names the file and `line 30 (new TrainingAuditEntry)` |
| `run-5-OLD-instrument-green-on-same-mutation.txt` | **the same tree as run-4** | base `8e2b57de` census | **38 passed / 0 failed** |
| `run-6-OLD-instrument-green-on-deleted-site.txt` | `TrainingEvidenceService`'s site deleted (11 → 10 = the floor) | base `8e2b57de` census | **38 passed / 0 failed** |
| `run-7-red-census-hand-edited.txt` | base, artifact edited by hand (`sites=1` → `sites=9`) | new | **RED** on the digest |
| `run-8-green-restored.txt` | base, everything restored | new | **39 passed / 0 failed** |
| `run-9-fast-tier.txt` | base | new | container-free tier, `--filter "Database!=SqlServer"` |

**Runs 4/5 and 2/6 are the point.** Not "the new test is red somewhere" but: on one identical tree the old
census reports `Passed! 38/38` while the new one names the offending file. Both directions of the defect
are shown that way — a stamping service that arrives, and a stamping site that leaves.

Production tree restored and verified: `git diff --stat 8e2b57de -- Services/` is empty.

## C3 — what invokes this, stated plainly

The census is an xUnit test in `WebApi.Tests`, so it runs in the same `dotnet test
WebApi.Tests/WebApi.Tests.csproj` every lane runs by hand and in the fast tier every lane reports. There is
no per-lane opt-in and nothing to wire.

**In CI it does not gate this branch.** `.github/workflows/azure-webapps-dotnet-core.yml` is the repository's
only workflow; it runs `dotnet test WebApi.Tests/WebApi.Tests.csproj` at line 69, but its trigger is
`push: branches: [ "master", "test" ]` plus `workflow_dispatch` — no pull-request trigger and not
`feature/restaurant-modules`. So on this branch the census runs only where somebody runs it, exactly like
every other test here. This is the state `F-GUARD-PROOF-NOT-IN-CI` records, and this lane does not change
it; it is a property of the workflow, not of the instrument.

## Residuals, stated rather than hidden

1. **A blind regeneration still blesses drift.** The digest refuses a hand edit; it cannot refuse
   `ACTOR_STAMP_CENSUS_WRITE=1` run by someone who does not read the diff. The write path fails its own run
   and says so, and the change lands in a committed file a reviewer sees — that is the whole mitigation.
   The complement that needs no blessing is `L-CENSUS-FLOORS-DERIVED`'s assembly reading (below).
2. **A resolver or guard that moves to a file mentioning no stamped type leaves the census silently.** The
   scope is "files mentioning the stamp type", so such a file is out of scope for the count as well as for
   the rule. This is inherited unchanged from the floors — not a regression, but not closed either.
3. **Counts, not identities.** Two sites swapped between two files within one module would keep both rows
   only if the counts happened to match; they do not here, but the census cannot see *which* construction
   moved, only how many each file holds.

## Relation to L-CENSUS-FLOORS-DERIVED — complementary, and both are needed

That lane (`built-unverified`, worktree `/Users/svendaneel/okam/OkamAPI-censusfloors`, branch
`lane/census-floors-derived` @ `75dcc2ff`, base `feature/restaurant-modules` @ `3579bbbc`) built the other
half: a walk of the compiled `WebApi` assembly's IL for `newobj` of each stamped type, placed through the
portable PDB line table, compared with the text walk by equality per file.

Neither arm subsumes the other, and the gap in each is the other's strength:

- The **assembly arm** needs no hand-maintained data at all, so it can never be blessed — but its own return
  records that *"dropping a declared stamp narrows both readings together, so they agree"*. A **deleted**
  site is invisible to it once the assembly is rebuilt, and it names no file, so it cannot satisfy this
  lane's exit criteria.
- The **artifact arm** (this lane) catches additions and deletions and *names* every stamping file — which
  is what the flag asks for — but its expectation can be regenerated.

They will conflict in git: both delete the same four `ModuleActorStampPin` fields and both rewrite
`The_derived_scope_still_sees_the_whole_population`. The resolution is additive rather than a choice —
take the field deletion once, and keep **both** replacement tests, since they assert different things. That
lane's base is three landed lanes behind this one (Meals' floor moved 4→14, `GrowthAudit` became a sixth
pin), so it needs rebasing onto `8e2b57de` regardless.

## Files

- `WebApi.Tests/Modules/ActorStampCensus.cs` — new, the derivation and the artifact format
- `WebApi.Tests/Modules/actor-stamp-census.txt` — new, generated, committed
- `WebApi.Tests/Modules/ModuleAuditActorCallSiteTests.cs` — floor check replaced by the equality census
- `WebApi.Tests/Modules/ModuleActorStampPin.cs` — four coverage fields deleted
- `WebApi.Tests/Modules/ActorStampSource.cs` — `GuardDeclarations` moved here

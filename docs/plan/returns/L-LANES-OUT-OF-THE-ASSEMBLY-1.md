```
RETURN: L-LANES-OUT-OF-THE-ASSEMBLY
brief: 745472e0
verdict: built
evidence: lanes/L-LANES-OUT-OF-THE-ASSEMBLY/mutation-log.md
log:
Base 8e2b57de (feature/restaurant-modules), own worktree wt-lanesexcl, commit 2c1eebaf.
Premise re-read from git at the tip, not a working copy: removes covered only
WebApi.Tests/**, "lanes" absent. Holds - not fail-spec.
Two routes, not one. Compile: a .cs under lanes/ enters WebApi.dll. Content:
Sdk.Web globs **/*.json with CopyToOutputDirectory, so a parked .json reaches
bin/ and publish without ever compiling. Under lanes/, before -> after:
Compile 1->0, Content 1->0, None 23->0, EmbeddedResource 0->0.
Proved by planting. BrokenPlant.cs reds the build (CS1026, CS1002) without the
exclusion, inert with it: same bytes, one csproj edit between. A .json plant was
seen reaching bin/Debug/net8.0/lanes/ on a GREEN build - what the three
non-Compile removes buy. States A-D logged; plants removed, tree clean.
State D forced --no-incremental: plain build was up-to-date in 1.07s, which is
indistinguishable from the stale-build trap CLAUDE.md warns about.
FINDING, not changed: root lanes/ misses WebApi.Tests.csproj, but
WebApi.Tests/lanes/ would compile. Absent, not the convention, test asm never ships.
END RETURN
```

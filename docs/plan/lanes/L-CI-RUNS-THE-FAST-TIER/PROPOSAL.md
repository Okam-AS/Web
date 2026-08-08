# L-CI-RUNS-THE-FAST-TIER — a suite runs on the branch the work is on

Brief `66d64799`. Actor `agent:L-CI-RUNS-THE-FAST-TIER`. Measured 2026-08-06.

Nothing was pushed. No workflow file was placed in any repository. No container was started, stopped
or entered — the container-free tier's own log contains **zero** occurrences of `testcontainer`,
`docker` or `1433`. The owner's live world (web :3971, API :5971, `okam-lwtwo-sql`,
`okam-lwtwo-redis`) was not touched, and no process was killed.

---

## 1. What gates this branch today: nothing, confirmed by reading both repositories

**Backend, `Okam-AS/OkamAPI`.** One workflow, `.github/workflows/azure-webapps-dotnet-core.yml`:

```yaml
on:
  push:
    branches: [ "master", "test" ]
  workflow_dispatch:
```

No `pull_request:`. `feature/restaurant-modules` matches neither branch, so no push, no pull request
and no merge on this programme's branch has ever run a suite. Two further defects in it, both
relevant to anything built on top of it:

- its test step is `dotnet test WebApi.Tests/WebApi.Tests.csproj --configuration Release` with **no
  trait filter**, so on the day it does run it attempts the 558 SqlServer-trait tests as well;
- it asks `setup-dotnet` for `dotnet-version: "8"`, while `global.json` pins **`8.0.110`** with no
  `rollForward`. The default `latestPatch` accepts 8.0.1xx and refuses the 8.0.4xx that `"8"`
  installs. The correct form is `global-json-file: global.json`, which reads the pin.

**Frontend, `Okam-AS/Web`.** Two workflows: `claude.yml` (the assistant bot, on comments) and
`nuxtjs.yml` (build + deploy to Pages, `push: branches: ["main"]`). Nothing runs Jest.
`L-FE-CI` wrote a `test` job on `lane/fe-ci` @ `36ce9ae`; that branch is on no tip, and the lane is
`built-unverified`.

**And the plan's own two suite facts are reading fossils.** `fe.tests` = 2127 is extracted from
`artifacts/tests/frontend/jest.json`, mtime **2026-07-31 20:22**. `be.tests` = 4351 passed globs
`../OkamAPI-modules/artifacts/tests/*.trx`, newest mtime **2026-08-01 13:49**. Both carry a
`2026-08-06T15:52Z ok` stamp, because the probe re-reads the file and the file has not moved. The
frontend suite is **3116 tests today**, not 2127. A job that writes those artifacts on every push is
what makes the two numbers describe a run instead of an archaeology.

Also worth stating, because it is the shape this plan keeps finding: the fact that would clear
`F-FE-CI-UNGATED` is `fe.ci`, a **wire** probe — `.github/workflows/nuxtjs.yml contains:npm test`.
It reads the file. A workflow file containing that string satisfies it whether or not a single run
has ever happened.

---

## 2. The measurement, on this host, with the caveats it needs

### 2.1 Backend container-free tier — the number to quote

Measured in a private copy of `~/okam/wt-violexactland` (a checkout detached at
`feature/restaurant-modules` tip **`8e2b57de`**), rsynced into this lane's own directory so that no
sibling's worktree was written to. Commands exactly as CI would issue them:

```
dotnet restore WebApi.Tests/WebApi.Tests.csproj
dotnet build   WebApi.Tests/WebApi.Tests.csproj --no-restore
dotnet test    WebApi.Tests/WebApi.Tests.csproj --no-build --filter "Database!=SqlServer"
```

```
Passed!  - Failed:     0, Passed:  4638, Skipped:    12, Total:  4650, Duration: 5 m 57 s
```

| leg | warm tree | cold build (obj/bin deleted) |
| --- | --- | --- |
| restore | 1 s | 1 s |
| build | 22 s | **35 s** |
| test | **360 s (6 m 00 s wall, 5 m 57 s reported)** | — |
| total | 383 s = **6 m 23 s** | — |

**Three honest caveats.**

1. The NuGet package cache was warm and was deliberately **not** emptied: `~/.nuget` is shared with
   every checkout on this host and is not this lane's to destroy. So the restore leg is the one
   number here that stays an estimate for a cold runner — call it 20–60 s from `actions/cache`.
2. This is an M-series host. A GitHub-hosted `ubuntu-latest` runner is slower per core, so the
   sensible planning figure is **10–15 minutes end to end**, not 6.
3. `8e2b57de` is 38 commits behind `integration/mig-stack-merge`. The lane that measured the
   drift check recorded **4703 passed / 0 failed / 10 skipped in 6 m** there — same order, more
   tests, same wall clock. The tier does not get slower as it grows; it is dominated by fixture
   setup, not by test count.

### 2.2 Frontend Jest tier — cheaper than anyone assumed

Measured in a private copy of the plan-hub checkout, with a `node_modules` this lane installed for
itself (see §5.3) rather than the symlink roughly 124 worktrees share:

```
Test Suites: 136 passed, 136 total
Tests:       3116 passed, 3116 total
Time:        14.908 s          (18 s wall including startup)
```

**This is the owner's working tree, not the committed tree.** See §5.1 — it matters by 11 failures.

### 2.3 SQL tier — not measured here, deliberately

No slot, and one lane's SQL containers were up throughout. The estate's own record is **587 tests,
~55 minutes**. §6 says what wiring it would take.

---

## 3. The proposal

Two files, neither pushed:

| file | repository | what it does |
| --- | --- | --- |
| `proposed/okamapi/.github/workflows/ci-fast-tier.yml` | `Okam-AS/OkamAPI` | **new.** Runs `--filter "Database!=SqlServer"` on push to `feature/**`, `lane/**`, `integration/**`, `master`, `test`, and on **every pull request**. |
| `proposed/web/.github/workflows/nuxtjs.yml` | `Okam-AS/Web` | **amends `lane/fe-ci` @ 36ce9ae**, which is the only version of this file that runs Jest at all. |
| `proposed/okamapi/.github/workflows/sql-tier.yml.recommendation` | — | recommendation only, suffixed so GitHub will not load it. |

The backend job also needs `Scripts/ci/trx_self_consistent.py` — a vendored copy of
`docs/plan/lanes/L-ABORTED-TRX-CANNOT-BE-EVIDENCE/trx_self_consistent.py` (435 lines, standard
library only, read-only). It is not duplicated into this lane's directory; the source of truth is
that path.

### The design decisions worth arguing about

**`pull_request:` is the clause that matters, more than the push triggers.** A required status check
reads the pull-request event. A branch-filtered push trigger does not describe a pull request from a
fork or from a branch whose name nobody predicted.

**`--filter "Database!=SqlServer"`, never `FullyQualifiedName!~SqlServer`.** The second form
circulates in this estate and is a different filter: it matches test *names*, admits trait-gated
tests whose names lack the word, and a job running it will take a container slot nobody granted.
`clears_when` on the flag that records this asks for exactly the `Database!=SqlServer` form.

**A floor on the collected count, in both jobs.** This is the step that makes the rest mean
anything, and it is the direct lesson of this week. A run that collects fewer tests than it should
does not report an error — it reports a **smaller green**:

- an unpopulated `core` submodule drops **five frontend suites and 182 tests**, measured, and the
  run still exits 0;
- Jest's default `testMatch` collects `lanes/` working files and archived `*.OLD.test.js` copies,
  which moves the count the other way;
- a filter typo can collect zero and exit 0.

Floors: backend `executed >= 4300` (measured 4650 here, 4713 at the merge tip); frontend
`suites >= 125 && tests >= 2900` (measured 136 / 3116). Both are ratchets — raised when the tier
grows, never lowered without a line saying which tests left.

**`if: always()` on the artifact upload and both checks.** A gate that only keeps artifacts from its
green runs is a gate nobody can argue with afterwards.

**The trx lands at `artifacts/tests/<sha>-fast-tier.trx`**, which is where `fact:be.tests` already
globs. That is deliberate: the fact stops being a fossil the first time the job runs.

---

## 4. The two ride-alongs

### 4.1 The model-versus-snapshot drift test — free, ~5 s, and NOT YET ON ANY BRANCH

Six tests, ~5 seconds, no container, no database round-trip (every context is built on
`Server=127.0.0.1,1;…;Connect Timeout=1` and carries an interceptor that throws on
`ConnectionOpening`, with each test asserting the attempt counter is 0). It reds **today** on
`integration/mig-stack-merge`, naming three real operations: `CreateTable GrowthAuditEvents` and its
two indexes — MIG-29, a table in the model and in no migration.

It needs **no workflow support at all**: it is an ordinary container-free test, so the job above
runs it the moment it lands. **But it has not landed.** It exists as
`docs/plan/lanes/L-PENDING-MODEL-CHANGES-ON-THE-FAST-TIER/ModelVersusChainDriftTests.cs.pending` and
as a commit on a detached HEAD in `~/okam/wt-pendmodel` that no ref reaches. Wiring CI does not put
it on the branch; somebody has to.

**Its blind spot, stated because a reader will otherwise assume a guarantee it does not give.**
`HasPendingModelChanges()` diffs the model against `ApplicationDbContextModelSnapshot`, **never
against the migrations' operations**. The `AccountingSummaries` unique index — the live double-post
— was in the snapshot the whole time, because `ef migrations add` regenerated the snapshot and
arrived with an empty `Up`. So the check is a **tripwire at the moment of introduction** that goes
quiet again at the next unrelated snapshot regeneration, not a chain audit. It would have caught
`GrowthAuditEvents`. It would not have caught `AccountingSummaries`. `F-PENDING-MODEL-CHECK-HAS-A-
BLIND-SPOT` is that correction, and the instrument without the blind spot — model against
operations — does not exist yet.

### 4.2 The aborted-trx refusal — wired as a step, exit codes chosen on purpose

`python3 Scripts/ci/trx_self_consistent.py artifacts/tests/*.trx`, `if: always()`.

- exit **1 = REFUSE** — `ResultSummary/@outcome` contradicts `Counters/@failed`, or `RunInfo` names
  the run's own abort. Inadmissible as evidence of anything.
- exit **2 = RED** — non-green and internally consistent. Reported, **never refused**: refusing it
  would punish the only lane in this estate that declared its own failure
  (`L-COMPOSITION-ROOT-CHECK`, `outcome="Failed"` with `failed=1`, disclosed in both its evidence
  line and its body).
- exit **0** — clean.

That asymmetry is the whole point. A pure presence check passes both artifacts; this one separates
the silent receipt from the declared one.

### 4.3 Both guard steps were RUN, in both directions, not asserted

A workflow file is checked by nothing until it is pushed, so a YAML or heredoc mistake in one reads
as "the gate is broken" on the day somebody first trusts it. `validate.py` parses both files, and
`bash -n`s / `compile()`s every `run:` fragment in them: **12 fragments, all clean, `pull_request`
present in both.**

`prove-guards.sh` then points the two checks at real artifacts (`measure/guards.log`):

| input | verdict | exit |
| --- | --- | --- |
| the check's own 10-case selftest | 10/10 as expected | 0 |
| `99855b1d-fast-tier.trx` (a real green receipt) | PASS | 0 |
| `long-stdout.trx` — `Failed` over `failed=0`, 962 of ~4400 rows, RunInfo *"the active test run was aborted"* | **REFUSE** | 1 |
| `honest-red.trx` — `Failed` with `failed=1`, declared | **RED, not refused** | 2 |
| `green-over-failures.trx` — `Completed` over `failed=2` | REFUSE | 1 |
| `runinfo-warning-only.trx`, `abort-phrase-in-stdout-only.trx` | PASS | 0 |
| floor guard on the green receipt, `FLOOR=4300` | `executed=4351` — above | 0 |
| floor guard on the same receipt, `FLOOR=99999` | **fires, naming the shortfall** | 1 |

The last row is the one that matters: the floor is not an instrument that cannot fail.

---

## 5. The known reds, and what the proposal does about each

### 5.1 `journey-artifact-store` — the red is real, and the fix is sitting uncommitted

The brief says this suite asserts the checkout directory is literally named `Web-modules`, so it
reds in every worktree including CI's. **Measured, and the answer is more specific than that.**

The owner's checkout has already been fixed: it derives the name,
`const SELF = path.basename(path.resolve(__dirname, '..'))`, with a written argument for why
deriving it is not circular. **That fix is in no commit.** Two independent checkouts of this
repository — including `~/okam/Web-modules-wt/L-LIVE-WALK-WORKFORCE`, which is at the very commit
the owner's branch tip names — still carry `expect(build.id).toMatch(/^Web-modules@…/)` at line 295.

Run in a directory named `fe`, one suite, both forms of the file:

| form | result |
| --- | --- |
| committed (what `actions/checkout` gets) | **11 failed / 27 passed / 38 total — suite RED, exit 1** |
| owner's working tree | 44 passed / 44 total, exit 0 |

So CI reds on day one, by eleven, and the denominator moves by six as well. **The remedy is to
commit that file in the same change as the workflow** — the work is finished and unlanded, which is
`F-SHIPPED-BRANCH-IS-NOT-WHAT-THE-CHECKOUT-SHOWS` with a price attached.

The `path: Web-modules` stopgap is written into the proposed file **commented out**. It would make
CI green by giving CI the directory name the assertion wants, and in exchange CI becomes the one
place that can never catch the assertion being wrong.

### 5.2 The `core` submodule — a blocker no workflow can work around

Three suites (five, on the 2026-08-05 measurement) need it. On this host it is initialised with
`git -c protocol.file.allow=always submodule update --init core`; on a runner it is
`actions/checkout` with `submodules: true`, which `lane/fe-ci` already sets.

**That will not work.** `F-CORE-PIN-ON-NO-REMOTE`: the branch pins `core` at `1bcab0b6`, and
`git branch -r --contains 1bcab0b6` inside the submodule returns nothing — the only ref containing
it is the local, unpushed `lane/core-ore-label`. A runner clones from the remote and cannot check
that commit out. Everyone is fine today only because the object sits in one worktree's submodule
gitdir, one `git gc` from unrecoverable.

The proposal adds an explicit **"the core submodule is populated"** step so the failure names its
cause instead of arriving as five fewer suites, and states plainly: **the frontend job must not be
made a required check until that flag is cleared, which is Sven's act** — push
`lane/core-ore-label`, or repin to a commit already on the remote.

### 5.3 `npm ci` — measured, and it is NOT the blocker the flag records

`F-NPM-INSTALL-CANNOT-SUCCEED` (severity blocker) says `npm install` and `npm ci` fail
repository-wide on an unresolvable edge-channel dependency. The obvious candidate is
`"@nuxt/cli-edge": "*"`, pinned in the lock to `cli-edge-2.17.2-28177940.14bb6c2.tgz`.

Re-measured for this proposal, in a directory holding **only** `package.json` and
`package-lock.json` — no worktree's `node_modules` read, written or deleted, and npm's prefix
resolution stops at that directory's own manifest:

| probe | result |
| --- | --- |
| `HEAD` on the pinned `@nuxt/cli-edge` tarball | **HTTP 200** |
| `npm ci --dry-run` | **exit 0**, 2611 packages |
| `npm install --dry-run` (re-resolves the ranges) | **exit 0**, 2611 packages |
| `npm ci` for real | **exit 0**, 2611 packages, **12 s** |

**So the answer to "how is CI supposed to install dependencies given that" is: with `npm ci`, which
works.** The 12-second install then ran 136 suites and 3116 tests green.

The hazard on this host is real and is a **different** hazard, and the two have been conflated:
`node_modules` in the shared checkout is a real directory that roughly 124 worktrees symlink into,
so `npm ci` **anywhere in a checkout** deletes it out from under all of them. A GitHub runner has no
such sharing. The rule "never run `npm ci`/`npm install` here" stands unchanged; the claim that it
*cannot succeed* did not reproduce today, and `F-NPM-INSTALL-CANNOT-SUCCEED` should be re-ruled on
this measurement rather than left standing as a blocker against wiring CI.

I did not attempt to establish what the flag's author hit — an edge-channel range can resolve
differently on different days, and saying "it works now" is the honest limit of what one run shows.

---

## 6. The SQL tier: what it would take, and why it is left as a recommendation

Full text in `proposed/okamapi/.github/workflows/sql-tier.yml.recommendation`. In short:

- **Time.** 587 tests, ~55 minutes recorded, slower on a runner (a ~1.5 GB image pull on a cold
  machine, plus a database per collection). A required check that costs an hour is one somebody
  marks non-required in week two — worse than no check, because branch protection then *looks*
  gated.
- **Memory.** `mssql/server:2022` refuses under 2 GB; this estate has measured OOM-137 at 2–3
  concurrent instances on a 7.7 GB host. Concurrency must be **1**, `cancel-in-progress: false`.
- **Filter.** `--filter "Database=SqlServer"`, the exact inverse. The name-matching form must not be
  used here either.
- **A floor**, for the same reason the fast tier has one.
- **Shape that survives:** nightly on the integration ref plus `workflow_dispatch`, uploading its
  trx, reported — never a required check on a pull request.

It is worth scheduling rather than dropping, because it is the only tier that sees the live `sys.*`
catalogues, trigger behaviour and error 334 — and because of the finding in §7.4.

---

## 7. What a gate on this branch would have caught this week — and what it would not

Five findings were named. **It catches one outright, the nightly SQL recommendation catches a
second, and it misses three.** The reason it misses them is the same each time, and it is worth
saying rather than hiding: **a gate re-runs assertions; it does not improve them.**

### 7.1 The receipt citing tests its own artifact did not hold — **CAUGHT, twice over**

`F-TRAIN-DISCLOSURE-EVIDENCE-IS-AN-ABORT`. `L-TRAIN-DISCLOSURE` claimed 14 tests; its cited
`after.trx` holds 3. The artifact reads `ResultSummary outcome="Failed"` against `Counters
failed="0"` — 962 rows of roughly 4,400, 87 seconds, `RunInfo` naming an `ObjectDisposedException`
inside `Xunit.Sdk.AllException.get_Message`: an `Assert.All` whose own failure formatting threw.
**The tier aborted because of the defect the lane introduced, and the aborted artifact became the
proof the work was sound.**

That crash is a container-free crash. A job on that commit would have run the same host, crashed the
same way, and gone **red** — with nobody deciding whether to run it and no artifact left lying
around for a lane to cite. And the trx step in §4.2 **refuses that exact artifact** by name, so even
a stale citation of it fails the gate.

The honest limit: CI cannot stop a person citing an old artifact in a plan line. It removes the
condition that let the artifact exist unexamined.

### 7.2 The census that agreed with itself — **MISSED**

`L-CENSUS-DERIVES-ITS-FLOOR`: the audit census compared a hand-maintained floor against a
hand-maintained list, and missed two stamping sites. **Both sides came from the same source, so any
number of runs agree.** Running it on every push produces the same agreement more often. The remedy
was derivation over the tree, and that is a change to the instrument, not to its schedule.

### 7.3 The lineage constant green because of the bug — **MISSED, and structurally so**

The `HasPendingModelChanges` assertion exists in **15 lineage suites, every one of them
`[Trait("Database","SqlServer")]`** behind a live fixture. On the tier every lane actually runs, the
assertion count before this week was **zero**. A container-free gate cannot see a SQL-trait test —
that is what the trait means. This is the argument for §4.1 (give the cheap half a home on the cheap
tier) and for §6 (schedule the expensive half), not an argument this gate answers.

### 7.4 The assertion that read 1 for five days — **MISSED by the fast tier, CAUGHT by the nightly**

`F-PUBLISH-DOUBLE-OUTBOX`. `f5305ced` swapped a hard-coded command for a two-channel plan on
2026-08-01 and updated four fast-tier assertions; its own commit message records *"SQL tier not
run."* The `Database=SqlServer` count line was unreachable from every routine run and **read 1 for
five days**, surfacing only when somebody finally ran the tier by hand.

The proposed fast-tier gate does not run that assertion — by construction. **The nightly SQL
recommendation would have said so on day one**, which is the single strongest argument in this
document for scheduling it rather than dropping it.

### 7.5 The waste panel reporting a failure it never sent — **MISSED**

`F-WASTE-PANEL-REPORTED-A-FAILURE-IT-NEVER-ATTEMPTED`. `createStatement` read coverage alone while
drawing both panels, so *"we could not fetch the waste"* was printed about a request that was never
sent; `readWasteSummary` manufactured the zeros with `longOrNull(x) || 0`. **A test asserting that
an absent block reads as `entryCount: 0` was passing.** A gate runs passing tests more often. It was
found by a browser walk recording `NO REQUEST WAS MADE`, and C5 is the rule that says so: acceptance
is a person completing the journey.

### 7.6 What it catches that nothing else currently does

Not on the brief's list, and measured here:

- **The two stale facts.** `fe.tests` reading a 6-day-old jest.json as today's number; `be.tests`
  reading a 5-day-old trx. Both become live the first time the job runs.
- **The 11 day-one failures in §5.1** — a real red that the owner's checkout cannot show anybody,
  because the fix is in the working tree and not in the commit.
- **Every future instance of 7.1's shape**, not just the one that has already happened.

---

## 8. What is owed, and by whom

Nothing here is mergeable by an agent. In order:

1. **Sven** — push `lane/core-ore-label` (or repin `core`), clearing `F-CORE-PIN-ON-NO-REMOTE`.
   Until then the frontend job's checkout step cannot succeed on a runner.
2. **Sven** — commit the derived-basename `test/journey-artifact-store.test.js` that is sitting in
   the working tree, or accept 11 red on the first run.
3. **Sven** — push both workflow files. Pushing CI config is an owner act; the brief forbids it here.
4. **A migration author** — land MIG-29, at which point the drift test's parked list is deleted in
   the same change (that is its ratchet).
5. **Somebody** — put `ModelVersusChainDriftTests.cs` on a branch. It is on a detached HEAD that no
   ref reaches.
6. **Re-rule `F-NPM-INSTALL-CANNOT-SUCCEED`** against §5.3.

## 9. The exit criterion this lane cannot meet, said plainly

The plan's exit is: *a workflow runs the container-free tier on this branch and on pull requests
into it, shown by a run whose log names the tier and its counts.* A GitHub Actions run requires the
workflow to be on a ref at the remote, and the brief forbids pushing one — correctly, since pushing
CI config is an owner act. **So the last clause of the exit is not satisfiable by this lane**, and
the item stays `built-unverified` until item 3 above happens. What is delivered is what the brief
commissioned: the diff, the measurement, and the analysis.

---

## Files in this lane directory

| path | what |
| --- | --- |
| `proposed/okamapi/.github/workflows/ci-fast-tier.yml` | the backend gate |
| `proposed/okamapi/.github/workflows/sql-tier.yml.recommendation` | the SQL tier, costed, not wired |
| `proposed/web/.github/workflows/nuxtjs.yml` | the frontend gate, amending `lane/fe-ci` |
| `measure/test.log`, `measure/t0..t3` | the container-free run and its timings |
| `measure/cold-build.log`, `measure/cb0..cb2` | the cold-build leg |
| `measure/fe-jest.log`, `measure/fe-t0..fe-t1` | the Jest run and its timing |
| `measure/fe-basename-committed.log` | the 11 day-one failures |
| `measure/fe-basename-owner.log` | the same suite with the uncommitted fix |
| `npmcheck/ci-real.log`, `ci-dryrun.log`, `install-dryrun.log` | the npm measurements |
| `measure/guards.log` | both guard steps run in both directions |
| `validate.py`, `prove-guards.sh`, `floor.py` | the workflow parse check and the guard proofs |
| `measure-containerfree.sh`, `cold-build.sh`, `fe-measure.sh`, `fe-basename-probe.sh`, `npmcheck/run.sh`, `npmcheck/real.sh` | every command above, re-runnable |
| `fe/` | the private frontend copy the Jest measurement ran in |

`api/` (the private backend copy, 600 MB) and `fe/node_modules` (this lane's own install, ~1 GB)
were deleted after the measurements. Both are rebuilt by the scripts above; the estate is under disk
pressure and neither is evidence.

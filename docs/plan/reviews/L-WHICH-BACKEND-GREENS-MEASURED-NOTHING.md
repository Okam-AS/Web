# L-WHICH-BACKEND-GREENS-MEASURED-NOTHING — every recorded backend green, checked for having run at all

brief `24bcb206` · actor `agent:L-WHICH-BACKEND-GREENS-MEASURED-NOTHING` · 2026-08-07 · read-only; no
suite was run, no container touched, nothing edited but this file and the return.

## Verdict first

**No recorded backend green rests on the no-op. Zero evidence files classify as measured-nothing.**
The root-form `dotnet test` was executed exactly once in the recorded history of this program —
by `L-THE-TESTED-WORK-REACHES-THE-TRUNK`, as its *first* backend tier attempt — and that lane caught
it itself (196-byte log, no counts), re-ran from `WebApi.Tests/`, and recorded only the real number.
Every other backend green in the record carries the `Failed/Passed/Skipped/Total` line, and in almost
every case an archived log or trx whose `Test run for …/WebApi.Tests/bin/…/WebApi.Tests.dll` header
proves which project actually executed.

What the record **does** still carry is the *citation habit* the flag names: at least ten evidence
files quote the bare `dotnet test --filter "Database!=SqlServer"` with no project path. Executed
literally at either backend repo root that command measures nothing — **both**
`/Users/svendaneel/okam/OkamAPI` and `/Users/svendaneel/okam/OkamAPI-modules` have a root
`WebApi.csproj` (not a test project) and **no `.sln`** (verified by directory listing today). A no-op
cannot print counts, so every quoted count in those files came from a `WebApi.Tests` cwd or an explicit
project argument that the citation elides. They are mis-quotations of real runs, not no-op greens.
The flag's `clears_when` ("no evidence file cites a bare dotnet test at the repository root") is
therefore **not yet met**, even though no green is unsupported. The circulation source is the briefs
themselves: plan.md:8349 — *"Every brief in this program says `dotnet test --filter
"Database!=SqlServer"`"* — bare form, no project.

## The one no-op execution, and where its green went

`L-THE-TESTED-WORK-REACHES-THE-TRUNK` (returned 2026-08-07T11:11Z, the return that raised
`F-A-BACKEND-TIER-COMMAND-IN-CIRCULATION-MEASURES-NOTHING`):

> "HAZARD: `dotnet test` at the OkamAPI-modules root exits 0 having run no test - no .sln,
> WebApi.csproj is not a test project. It must be run from WebApi.Tests."
> — returns/L-THE-TESTED-WORK-REACHES-THE-TRUNK-1.md:18

Its landing detail says the first backend "tier" *was* that no-op, caught "only because the log had no
counts". The green it then recorded — **4880 passed / 0 failed / 10 skipped / 4890 total** at
`9fb057d00` — is from the re-run: command "`dotnet test --filter "Database!=SqlServer"` run **from
`WebApi.Tests/`**", archived at `<scratchpad>/landtrunk/out/be-after-docs.log`, whose tail reads
`Passed! - Failed: 0, Passed: 4880, Skipped: 10, Total: 4890, Duration: 5 m 54 s` and whose header
names `…/landtrunk/OkamAPI-modules/WebApi.Tests/WebApi.Tests.csproj`. It matches the clerk's own
independent run at `9fb057d00` (4880/0/10) exactly. **No claim anywhere rests on the no-op run; its
output was never quoted.**

## The clerk's two flagged files, adjudicated

**1. `docs/plan/lanes/L-EVERYTHING-REACHES-THE-BRANCH/landing-evidence.md` — ran-and-counted; the
command as quoted is the hazard form.** Line 111 quotes `dotnet test --no-build --filter
"Database!=SqlServer"` — genuinely bare. But the green it cites (4832/0/10/4842, 6 m 19 s) is real:
the archived `tier-backend-nonsql.txt` beside it (3.7 MB — a no-op log is 196 bytes) opens with
`Test run for /Users/svendaneel/okam/OkamAPI-modules-wt/L-EVERYTHING/WebApi.Tests/bin/Debug/net8.0/WebApi.Tests.dll`
and ends `Passed! - Failed: 0, Passed: 4832, Skipped: 10, Total: 4842`. The SQL tier beside it
(`tier-backend-sql.txt`, `Failed! - Failed: 1, Passed: 694, Total: 695, Duration: 32 m 5 s`) and the
jest log (150 suites / 3563 / 0) are likewise archived. Independently verified before this lane by
`reviews/L-READ-THE-UNREVIEWED-BACKEND.md` §8, which recomputed the 4736→4752→4759→4832 chain and read
the archived log. 4832 is also on the clerk's known-good progression. **The only defect is the
citation: it names a command that, run where it is written, measures nothing.**

**2. `docs/plan/lanes/L-CENSUS-DERIVES-ITS-FLOOR/detail.md` — ran-and-counted; the clerk's grep hit is
a line-wrap false positive.** Every command in the file carries the project:
`dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter …` (the sentence at detail.md:103
breaks the line after "`dotnet test`", which is what a one-line grep sees as a bare invocation).
Runs 1–8 are archived with counts (39/0, 38/0, and the red runs naming files). Run 9, the fast tier,
is the only row whose **markdown** carries no number — but the archived `run-9-fast-tier.txt` in the
same directory ends `Passed! - Failed: 0, Passed: 4639, Skipped: 12, Total: 4651, Duration: 7 m 4 s`
and its header quotes the project-form command. **Second look, as the count is off the clerk's
progression:** 4639/12-skipped is the *other count family* (below) — the lane ran in repo
`/Users/svendaneel/okam/OkamAPI` (worktree `OkamAPI-censusderive`) at its lane tip `7585fa3b` off
`8e2b57de`, where the tree genuinely held ~4651 fast-tier tests on 2026-08-06. Not carried over; it
matches its Aug-6 siblings (4638–4658 passed, 12 skipped) and matches no OkamAPI-modules baseline it
could have been copied from.

## The two count families — why numbers off the progression are still real

The clerk's known-good progression (4703, 4728, 4736, 4738, 4742, 4752, 4759, 4832, 4861, 4880) is the
**10-skipped** family measured on `/Users/svendaneel/okam/OkamAPI-modules` trees (and the composed
integration stack: 4703/0/10/4713 at `7f8945dc6`). A second, older family — **12 skipped**, passed
counts 4351→4664 rising through Aug 1–6 — was measured on `/Users/svendaneel/okam/OkamAPI` trees and
their worktrees (`wt-growth-health`, `OkamAPI-flagscover`, `wt-trainwire-abort`, `OkamAPI-censusderive`
…). The families never cite each other's numbers; within each, deltas are accounted test-by-test in
the very files that quote them (e.g. FLAGS-RESOLVERS +20 by name-set diff of two committed trx;
WF-IDEMPOTENCY 4402 vs its own 4394 baseline). The 12-vs-10 split is consistent with the two
`[SkippableFact]` env-gated smokes (`GrowthPostmarkSandboxSmokeTests`, `SurfboardCashSplitSmokeTests`)
standing down in the 12-skip runs, and the totals differ because the trees differ. No second look
turned a carried-over number into a finding.

**Carried-over-number checks performed:** the twin **4633/0/12** in `L-WF-VIOLATION-EXACT-1` and
`L-MARGIN-VIOLATION-ANCHOR-1` reconciles by arithmetic, not copying — both lanes added exactly 4 facts
to the same base `569887a5` (= 4629, per `L-CREDIT-NOTE-NUMBER-1`'s own measurement), and the two runs
have different durations (8 m 15 s vs 6 m 23 s). The identical baseline/exit pair **4703/0/10** in
`L-PUBLISH-WRITES-ONE-OUTBOX-ROW` is explained in the file (the defect's test is SQL-only, the fix adds
no fast-tier tests) and both runs are archived with distinct durations (7 m 33 s / 7 m 6 s) and the
`wt-pub-outbox` dll path; `L-GROWTHAUDIT-MIGRATION`'s 4703 has its own `fast-tier.log` (5 m 50 s).

## Classification — every evidence file citing a backend tier result

Legend: **RC** = ran-and-counted (counts quoted in the citation or archived beside it). **RC/bare** =
ran-and-counted, but the quoted command is the bare root form the flag bans. No file classifies as
measured-nothing.

### docs/plan/lanes/

| file | command as quoted | counts | class |
|---|---|---|---|
| L-EVERYTHING-REACHES-THE-BRANCH/landing-evidence.md | `dotnet test --no-build --filter "Database!=SqlServer"` | 4832/0/10/4842 (log archived) · SQL 694/1/695 (log archived) | **RC/bare** |
| L-CENSUS-DERIVES-ITS-FLOOR/detail.md | `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter "FullyQualifiedName~…"` (runs 1–8), same project form for run 9 per its log header | 39/0 · 38/0 · reds by name · run-9 4639/0/12/4651 (log archived; count absent from the md) | **RC** |
| L-FLAGS-RESOLVERS-COVER-THREE/evidence.md | `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"` | 4638/0/12 → 4658/0/12, both trx committed, +20 by name-set diff | **RC** |
| L-GROWTH-TELLS-THE-OPERATOR-WHAT-ACTUALLY-FAILED/mutation-log.md | `--filter Database!=SqlServer` (whole fast tier row) | 4742/0/10/4752, 9 m 54 s, delta +6 accounted | **RC** (no full-tier log in the lane dir; scoped `arms-green.txt` 6/6 archived) |
| L-GROWTHAUDIT-MIGRATION/detail.md + sql-tier-result.md | `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database=SqlServer"` (SQL); fast tier | SQL 565f→593/1/594 (log + trx archived, diffed test-by-test) · fast 4703/0/10 (log archived) | **RC** |
| L-GUESTLINK-ONE-COMPOSER/DECISION.md + RUN.md | `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter 'Database!=SqlServer&(FQN~…)'` | 80/0 · M1 6F/74P · M2 3F/77P | **RC** (scoped, cited as scoped) |
| L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE/suites.md (+mutation-log.md) | `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter 'Database!=SqlServer'` | 4638/0/12/4650 → 4640/0/12/4652, both `Passed!` lines quoted verbatim | **RC** |
| L-PENDING-MODEL-CHANGES-ON-THE-FAST-TIER/NOTES.md | fast tier | 4703/0/10/4713 → 4709/0/10/4719; trx committed in lane dir | **RC** |
| L-PREF-COOKIE-HALF/evidence.md | full `dotnet build` + test per run | 4638/0/12/4650 → 4641/0/12/4653; logs archived | **RC** |
| L-PUBLISH-WRITES-ONE-OUTBOX-ROW/FINDING.md | `dotnet test WebApi.Tests/WebApi.Tests.csproj -c Debug --filter "Database!=SqlServer"` | 4703/0/10 ×2; summaries archived with dll path | **RC** |
| L-THE-DOCUMENTS-AND-CART-TESTS-FINISH/mutation-ledger.md | full `dotnet test`, never `--no-build` | backend scoped 19/19 (SQLite, cited as scoped) | **RC** |
| L-THE-TWO-DOCUMENTS-AND-THE-CART-GET-TESTS/DETAIL.md | `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug --filter "Database!=SqlServer" --collect:…` | inherits §4.2/§5.2 of the coverage review with both caveats restated | **RC** |
| L-TRAIN-DISCLOSURE-LAND/suite.md + owner-step.md + tier-*.txt | `dotnet test WebApi.Tests/WebApi.Tests.csproj -c Debug --filter "Database!=SqlServer"` | baseline 4638/0/12/4650; merged 4100/0/12 **then `Test Run Aborted`** — disclosed as an abort, ruled "functionally unlandable" | **RC** (abort disclosed, never cited as a pass) |
| L-TRAINWIRE-ABORT/tier.md + finding.md + artifacts/ | project form + filters | aborted 3155/0/10 and 15/26 cited **as reproductions of the abort**; completing 4381/0/12/4393; trx archived | **RC** |
| L-TRX-CONTAINS-WHAT-IT-CLAIMS/*.md | (audit) | per-receipt counts for 25 cited trx | **RC** (meta-audit) |
| L-ABORTED-TRX-CANNOT-BE-EVIDENCE/*.md | (audit) | refused 1 of 25 cited receipts; estate sweep 3,112 trx, 6 REFUSE = 3 artifacts, all named | **RC** (meta-audit) |

### docs/plan/reviews/

| file | citation | class |
|---|---|---|
| L-COVERAGE-MEASURED-PER-MODULE.md | project-form command block; 4831/1/10 of 4842 under coverage, `TESTEXIT=1` disclosed as red-by-construction | **RC** |
| L-READ-THE-UNREVIEWED-BACKEND.md | verified the 4832 chain against the archived log (`Passed! 0/4832/10/4842`) and a lane's committed 4753/0/10 | **RC** |
| L-READ-THE-INSTRUMENT-AND-THE-UPSERT.md | 4836/0/10 read from the committed `lane-fast-tier.summary.txt`, explicitly "not independently re-run" | **RC** (inherited receipt, named as such) |
| L-READ-THE-BACKEND-TRUNK-AS-LANDED.md | fast-tier receipts at each link "evidence-only, matches" | **RC** (meta) |
| L-THE-FLAG-BACKLOG-IS-A-WORK-LIST.md | "tier completes at the disclosure merge 4650/0/12" | **RC** |
| L-CONFIRM-CHAIN, L-GR-CONFIRMED, L-MEALS-RELEASE-CLUSTER, L-MEALS-SWEEP, L-MONEYPATH-PAIR, L-MRG(-WASTE), L-UTLKVIT, L-WF-W5, L-WHAT-THE-TRUNK-WILL-STILL-BE-MISSING | name the SQL tier as **not run / unwitnessed** — honest gaps, no green cited | n/a (no green) |

### Web-modules/lanes/ (the root evidence tree, 274 lanes / 701 md)

47 files cite backend counts; **all 47 are RC** (each quotes its `Passed!`/N-passed line; sampled files
carry logs or trx beside them). Files quoting the **bare form** with real counts adjacent —
**RC/bare**, the flag's residue:

- L-WF-BLIND-BIND-NAME/detail.md (4369→4392, 12 sk) · L-WF-EXCHANGE-AWARD-UNGATED/EVIDENCE.md
  (whole tier 4389/0/12, 9 m 7 s) · L-GR-DISPATCH-ACTOR/detail.md (4434/0/12 vs 4423/0/12) ·
  L-WF-INVITE-LIST-REVOKE/evidence.md (4652/0/12/4664) · L-EF-INDEX-SHADOW-SWEEP/evidence.md
  (4450/0/10) · L-XZ-CREDIT-FIELDS/evidence.md · L-ESCPOS-LADDER-NAMES-THE-TENDER/finding.md ·
  L-EV-CALLBACK-SWEEP/MEASUREMENT.md (scoped 28/0) · L-CORS-LAND-FOLLOWUPS/evidence.md (scoped 42/0)

Two count-less "tier green" phrasings found and ruled: `L-GR-NEWSLETTER-CROSS/restatement.md` — "the
fast tier stays green with the guard's effect removed" is a **blindness finding** (the green-under-
mutation originally measured at 4357 with the probe file excluded, re-verified 15/15 scoped), not a
tier-pass claim; `L-MIG-STACK-MERGE/growth29.md` — "the full container-free tier is green" carries
**(4422/0/12)** in the same sentence. Both **RC**.

### returns/ + log.md + plan.md (where conclusions were recorded)

Every backend green in every return carries its counts (spot list: EVERYTHING 4832/0/10; TESTED-WORK
4880/0/10/4890; CLOCKOUT-2 re-measured 4645 and 4638 both sides; GROWTH-HEALTH 4360; NEWSLETTER-WIRE
4363; WF-BOOTSTRAP 4374 vs 4369; WF-IDEMPOTENCY 4402 vs 4394; MEALS-RELEASE 4359 vs 4351;
MEALS-POS-TENDER 4370 vs 4366; CREDIT-NOTE 4597→4629; WF/MARGIN-VIOLATION 4633; GROWTHAUDIT SQL
593/1/594; WF-EXPORT-DUPLICATE SQL 136/0). log.md records the clerk's own tip measurements
(`a9837ca92` 4861/0/10; `9fb057d00` 4880/0/10 via the landing lane) with counts. plan.md evidence
lines that quote the bare command (1342, 1776, 2122) all carry counts in the same line — **RC/bare**.
`fact:be.tests` is suite-kind and refused by the tool (unverifiable by design), and its ambiguity is
already flagged as `F-BE-TESTS-AMBIGUOUS`.

## Lanes whose conclusions rest on a no-op green

**None.** The one no-op execution never produced a recorded number. The two nearest cases, ruled:

1. **L-THE-TESTED-WORK-REACHES-THE-TRUNK — harmless.** Its first tier attempt was the no-op; it said
   so, re-ran from the project path, and its recorded conclusion (backend trunk lands at `9fb057d00`
   with 4880/0/10/4890, +19 = `CartValidateGateTests` exactly) is supported by an archived log and by
   the clerk's independent re-run. Nothing to retract.
2. **L-TRAIN-DISCLOSURE — the one recorded backend green that measured materially less than the record
   implied, already caught by the record itself.** Not the root no-op: its `after.trx` ran 962 of a
   ~4,400-test tree, host crashed, `outcome="Failed"` over `passed=960 failed=0` — and was cited as a
   pass with no non-green fact (UNDISCLOSED, per L-ABORTED-TRX-CANNOT-BE-EVIDENCE). The lane was
   accepted on a receipt that contained only one of its own three wire tests; the test that aborts the
   tier and the test that contradicts it were both absent. **Not harmless when accepted** — the
   acceptance certified two tests that could not both be true. **Harmless now**: L-TRAINWIRE-ABORT
   fixed the crash and the contradiction, the tier completes at the disclosure merge (4650/0/12), and
   the refused receipt is bounded at one artifact by the estate-wide trx sweep (6 REFUSE = the cited
   one ×4 copies + the fix lane's two deliberate before-reproductions).

## The frontend habit, checked as instructed

No current-era evidence cites a suite count near 137. The sub-150 counts in the record (131 → 133 →
135 → 136 on 2026-08-06 14:21–16:40) predate the suite's growth and form a monotone, per-landing
accounted progression (145 → 149 on Aug 6 evening; 150 → 152 → 153 → 154 → 157 → 159 → 163 → 164
through Aug 7, each delta itemized in the citing record). The empty-`core` trap is known to the record
and was actively defended against where it mattered: L-EVERYTHING pinned `core` at `9626a561` before
believing any count and wrote "**150 suites RESOLVED**… Had it fired, ~135 suites would have resolved
while jest still exited 0". No frontend green in the record is the 135-resolved shape.

## What remains for the flag (named, not done — this lane edits nothing)

`F-A-BACKEND-TIER-COMMAND-IN-CIRCULATION-MEASURES-NOTHING` clears when every recorded green names its
project **and no evidence file cites the bare root form**. The second clause is not met by the record
as it stands. The bare-form citations to amend (or to rule forward-only): 
`docs/plan/lanes/L-EVERYTHING-REACHES-THE-BRANCH/landing-evidence.md:111`; plan.md evidence lines
1342/1776/2122; returns L-CREDIT-NOTE-NUMBER-1:18, L-WF-VIOLATION-EXACT-1:16, L-CLOCKOUT-STATE-IS-NOT-
OPEN-2:10, L-GROWTH-HEALTH-HONEST-1/2:4, L-GROWTH-NEWSLETTER-WIRE-1:4, L-WF-BOOTSTRAP-1:5; root-lane
files listed under RC/bare above; and the briefs' own standard sentence (plan.md:8349) — the actual
command in circulation — which should read `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter
"Database!=SqlServer"` or state the `WebApi.Tests/` cwd. Owner: @sven per the flag.

# RED-THEN-GREEN — one mutation per site, each redding its own test and only its own

Produced by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shape: **a green where a red was demanded.** The three `RefuseAsync` calls and the SQL-tier
assertions were already on the trunk and readable; the exit's *"pinned by a test per site that reds if the
recording is removed"* existed only as a sentence in the lane's RETURN. **A green tier is evidence of a
tree, not of a pin.** So the reds were produced, one site at a time.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    /Users/svendaneel/okam/OkamAPI-wfrefusalrest @ 02684ecc (branch lane/wf-idempotency-refusal-rest,
    base a1d57208 = the sibling lane; 0 Workforce files drifted between 9888178f and the tip, so it
    merges clean)

## How it was run

- Tree: `/Users/svendaneel/okam/OkamAPI-wfrefusalrest`, branch `lane/wf-idempotency-refusal-rest`,
  `02684ecc15c77c653a3f2ca5b30c50d890ad9d2d`. Clean before and after (`git status --porcelain` empty).
- Command, from `WebApi.Tests/` (the repo root exits 0 having run **zero** tests):

      dotnet test --filter "Database!=SqlServer&(FullyQualifiedName~WorkforceInvitationTests|FullyQualifiedName~WorkforceOperatorImportTests)" \
                  --logger "trx;LogFileName=<name>.trx" --results-directory <this directory>/runs

- **Never `--no-build`.** Every arm rebuilt; `WebApi.dll`'s mtime moved on every one
  (17:42 baseline → 17:43:0x M1 → 17:43:53 M2 → 17:44:35 M3 → 17:45:11 restored), so no arm read a stale
  binary. No container was started; the SQL-tier class is excluded by the trait filter.
- Mutation and restore are a two-line script (`apply` / `restore`) that asserts the token it is replacing
  is present before it writes, so a silent no-op restore is impossible.

## The four runs

| arm | mutation | total | **executed** | passed | failed | trx |
|---|---|---|---|---|---|---|
| baseline | none | 38 | **38** | 38 | 0 | `runs/baseline.trx` |
| **M1** | `WorkforceOperatorImportService.cs:246` — the `RefuseAsync` call commented out | 38 | **38** | 37 | **1** | `runs/mut-import.trx` |
| **M2** | `WorkforceInvitationService.cs:178` (issue backstop) — same | 38 | **38** | 37 | **1** | `runs/mut-issue.trx` |
| **M3** | `WorkforceInvitationService.cs:401` (claim backstop) — same | 38 | **38** | 37 | **1** | `runs/mut-claim.trx` |
| restored | none | 38 | **38** | 38 | 0 | `runs/restored-green.trx` |

**The executed count is 38 in all five runs.** That is what makes each of these a kill rather than a void
run — a mutation that "reds nothing" is indistinguishable from a run that executed nothing until the count
disproves it.

## Which assertion went red, and what the message said

Each mutation reds **exactly one** test — its own site — and leaves the other two green. Read from the trx,
not from the console:

**M1 — import backstop**

    WebApi.Tests.Workforce.WorkforceOperatorImportTests.An_import_refused_by_the_D1_race_backstop_replays_its_refusal_to_a_retry_of_the_SAME_key
    Assert.Equal() Failure
    Expected: workforce.import-conflict
    Actual:   workforce.idempotency-in-progress

**M2 — invitation issue backstop**

    WebApi.Tests.Workforce.WorkforceInvitationTests.An_issue_refused_at_the_commit_replays_its_refusal_to_a_retry_of_the_SAME_key
    Assert.Equal() Failure
    Expected: workforce.invitation-issue-conflict
    Actual:   workforce.idempotency-in-progress

**M3 — invitation claim backstop**

    WebApi.Tests.Workforce.WorkforceInvitationTests.A_claim_refused_at_the_commit_replays_its_refusal_to_a_retry_of_the_SAME_key
    Assert.Equal() Failure
    Expected: workforce.claim-link-conflict
    Actual:   workforce.idempotency-in-progress

**Why the message matters more than the count here.** In-progress is a 409 too. If these tests read the
status code, all three would pass under every mutant and the pin would be theatre. They read the **code out
of the response body**, so the failure text is literally the defect the lane repaired: an unrecorded
refusal leaves the key answering `workforce.idempotency-in-progress` forever, because `ExpiresAtUtc` is
advisory and nothing purges. Each mutant reproduces that sentence exactly once.

## The fourth clause — the SQL-tier race test

Read at trunk `6d5328004` with `git show 6d5328004:WebApi.Tests/Workforce/WorkforceD1RaceSqlServerTests.cs`
(the lane landed; the file is on the trunk, not only on the branch). The class carries
`[Trait("Database", "SqlServer")]` at line 38, and **both** race sites assert the Refused row rather than
no row:

    105:        Assert.Equal("Refused", Assert.Single(completions).OutcomeState);
    106:        Assert.Empty(completions.Where(r => r.OutcomeState == "Completed"));
    …
    207:        Assert.Equal("Refused", Assert.Single(completions).OutcomeState);
    208:        Assert.Empty(completions.Where(r => r.OutcomeState == "Completed"));

in `Two_connections_creating_the_same_active_engagement_race_exactly_one_wins` (line 48) and
`An_attach_losing_the_D1_slot_at_the_commit_is_the_retryable_409_not_a_500` (line 110).

**This clause is shown as a source fact, not as a run.** No SQL slot was granted to this lane and no
container was started, so those two tests were **not executed** — they are among the trait-excluded set.
The exit's wording ("*asserts* the Refused row rather than no row") is a claim about what the test asserts,
and that is what is demonstrated above. A reader who needs the assertion *observed* rather than *read*
still owes a SQL-tier run.

## Also on the trunk, for the reader who wants the three sites themselves

    git show 6d5328004:Services/Workforce/WorkforceInvitationService.cs   | grep -n RefuseAsync  → 179, 528
    git show 6d5328004:Services/Workforce/WorkforceOperatorImportService.cs | grep -n RefuseAsync → 246

(The line numbers differ from the branch's 178/401/246 because the trunk carries later edits to those
files; the calls are the same three.)

## What this record does not claim

- Not C5. Nothing here is an operator completing a journey; it is a falsifiability proof of three pins.
- The two modules the lane's RETURN flagged as carrying the **same shape, live and controller-reachable** —
  Meals (`Services/Meals/MealsCommandReceiptService.cs`, defect documented as accepted at :32-37) and
  Training (`Services/Training/TrainingIdempotency.cs`, proportionally worse) — are untouched and still
  open. They were not re-measured by this pass.

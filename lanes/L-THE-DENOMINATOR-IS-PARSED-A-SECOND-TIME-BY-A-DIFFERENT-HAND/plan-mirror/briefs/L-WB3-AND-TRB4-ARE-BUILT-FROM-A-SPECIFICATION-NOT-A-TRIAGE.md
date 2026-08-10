<!-- GENERATED brief 55560b44 for L-WB3-AND-TRB4-ARE-BUILT-FROM-A-SPECIFICATION-NOT-A-TRIAGE · intent 7c84435b072ff7fe · 2026-08-09T10:43Z -->
# Brief — L-WB3-AND-TRB4-ARE-BUILT-FROM-A-SPECIFICATION-NOT-A-TRIAGE

export PLAN_ACTOR=agent:L-WB3-AND-TRB4-ARE-BUILT-FROM-A-SPECIFICATION-NOT-A-TRIAGE

## Objective
the two rows that survived the re-check

**Two lanes refused to work down `PROOF-BENCHMARKS.md` tonight and between them re-checked thirteen rows.
Six had already moved.** The two that survived are specified here — **build them; do not re-triage them.**
The specification below is a sibling's measurement of the current trunk, not the stale document.

**WB3 — boundary and DST cases on `WorkforceRuleEvaluator.DailyRest`.** The rule at `:115-157` computes
`gap = (StartsUtc - prev.EndsUtc).TotalHours` and `pass = worst >= thresholdHours`. **Unit arms on a green
evaluator; no host boot.**
- threshold 11h, two shifts with an **exactly 11h** UTC gap → `Pass`/`info`; a **10h59m** gap →
  `Warn`/`advice`.
- an **across-midnight** gap (ends 23:30Z, next starts 09:30Z = 10h) → `Warn` at threshold 11.
- a **23-hour DST day** fed as the UTC elapsed it truly is — 11 *local* hours across spring-forward is
  **10 actual hours** → `Warn`. **This arm pins that the rule measures actual rest, not wall-clock**, and
  it is the one worth the lane.
- **redding mutation, named**: change `worst.Value >= thresholdHours.Value` to `>` at
  `WorkforceRuleEvaluator.cs:152`; the exactly-11h arm flips `Pass` to `Warn` and reds.

**TR-B4 — a read-only evidence pack.** `GET training/stores/{storeId}/evidence?personRef=` returning, per
person: validated `PersonRef` plus the Workforce display name through the caller-identity seam;
completions carrying `courseId`, title, `versionNo`, `ContentHash`, `PassThresholdPercent`,
`ScorePercent`, `Passed`, `Source`, recordedBy and recordedAt **store-local**; certificates; and the
`TrainingAuditEvents` chain for those rows **with a chain-verification result**.
- **Commit a golden fixture of the pack.**
- **redding mutation, named**: extend `TrainingAppendOnlyGuardTests` so a **tampered audit row** is caught
  by the chain-verification result — mutate the verifier to accept a broken chain and the pin reds.

**Inspector acceptance is a later human sign-off and is NOT claimable here.** C6 is in force: the pack may
name a statute only where this change produces the artifact that provision requires.

**Do not touch TR-B1, TR-B3, WB4 or WB5.** All four moved: TR-B1 and TR-B3's defects are **both fixed by
`e8f06833f`** — grading derives `Passed` server-side at `TrainingCompletionService.cs:202`, and cert
expiry routes through the zone resolver; WB4's opaque-404 pin is present **4 of 4** in
`ScheduleTenantIsolationTests`; WB5's endpoints **39-42 are live** at `WorkforceMeController.cs:293-361`.
**A red pin of a defect that is gone cannot red.**

**The host is the real gate, not the work.** A sibling specified these rather than building them because
load sat near 66 and **shipping an unexecuted assertion would break the rule this program has enforced all
night.** Hold that line: **gate on `uptime` below 13 and re-read it before each run.** If it never clears,
**return `blocked` with the readings** rather than a claim.

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert by name from a `--logger trx` and carry the executed count**; a
mutation that reds nothing means your run executed nothing until a count disproves it. **Assert
`WebApi.dll`'s mtime MOVES.** **Restore `run-sheet.json` and `run-sheet.md`; never `git add -A`.** **`git
branch -f` refuses because the trunk is checked out** — `--ff-only` after re-reading the ref in the same
command. **A demo API runs on :5091 and is Sven's world — do not stop it.** Never `pkill`. **Do not push.**
Backend trunk is **`6d5328004`**.

## Exit criteria
docs/plan/artifacts/wb3-and-trb4-built.md records both rows built with each arm named from a trx with an executed count, each redding under its named applied-and-restored mutation, and the non-SQL tier green at the composed tip

## Constraints in force
- C1: Append-only tables are never backfilled, repaired in place, or purged.
  holds_because: The journal projections, deposit receipts, statement lines, consent receipts and personnel records are the evidence a bokføring, Skatteetaten or Datatilsynet inspector reads. A row that changed after the fact is worth nothing to them, and the deny-triggers already on those tables are the only thing that makes the claim checkable instead of a promise. Written now because the estate has already shipped one defect of exactly this shape — an RF-1313 systembeskrivelse asserting database triggers that no migration in the chain creates.
  violated_when: a diff contains an UPDATE or DELETE statement — in a migration, a script, or raw SQL — against a table carrying an append-only deny-trigger or the GuardAppendOnly guard; or an EF entity mapped to one of those tables is mutated and saved outside its documented append path.
- C2: One migration author at a time, and the chain is the truth, not the model.
  holds_because: Two lanes generating EF migrations against one DbContext produce two snapshots that each claim to be the model, and the chain then replays in an order neither author tested — the failure surfaces on a fresh database and never on the author's. The estate has been bitten twice already: a chain that cannot replay from empty because two migrations both add Orders.TableId, and AccountingSummaries, whose unique index exists in the model and in every model-built test database but in no migration.
  violated_when: a diff adds a migration whose Designer snapshot's parent id is not the current chain tip, or two migration files on one branch share a parent; or a diff adds an index, unique constraint or check constraint in OnModelCreating without a migration in the same diff creating it.
- C3: A capability exists only when it is reachable; service, DI registration, route and navigation entry land in the same change.
  holds_because: On 2026-07-29 four of five module journeys stopped at a missing wire while the suite was green — a service with no controller, a feature flag with no lever and no bound Configure<>, a seed with no production caller, a page nothing linked to. A green suite cannot see code that no caller can reach, so reachability has to be a property the diff carries rather than a property the tests are asked for afterwards.
  violated_when: a diff adds a service or handler that no controller action and no DI registration references; or adds a page under pages/ that no navigation surface links to; or adds a feature flag with no operator lever; and the same diff does not close the gap.
- C4: Every money-path write names the actor that caused it.
  holds_because: A deposit, a capture, a refund, a settlement line, a funded order and a payroll-bearing hour are all rows somebody will later have to explain. If a webhook, a background job and an operator can each write the same row under different — or absent — actor identity, the audit trail names nobody and the kroner cannot be traced back to a decision. Events has already had to re-prove its attribution twice against a world a prior lane had changed underneath it.
  violated_when: a money-path write (deposit, capture, refund, settlement or statement line, funded order, timesheet cost) is reachable from a code path that carries no resolved actor, or a test constructs one with a null, ambient or hard-coded system actor.
- C5: Acceptance is a person completing the journey, never a suite reporting green.
  holds_because: Standing law (Sven, 2026-07-28) — drive each feature to the end, then open the UI so he walks it himself; his acceptance is the gate. The estate has repeatedly shipped green suites over unreachable features, so a suite result is evidence that code behaves, never evidence that a capability exists. This branch has no browser-level test framework at all, which makes the rule load-bearing rather than decorative.
  violated_when: an item is moved to verified or accepted whose only named evidence is a .trx, a junit file, a suite-kind fact, or a test name; or a status message offers a suite count as the reason a capability is finished.
- C6: A statutory claim is printed only where the document it claims can be produced.
  holds_because: The product names Norwegian law on screen — personalliste under bokføringsforskriften § 8-5-6, kassasystemforskrifta, internkontroll. Each of those names promises an artifact an inspector may demand on the day, and an unbacked claim is worse than a missing feature because it invites the inspection it cannot survive. On 2026-07-30 the internkontroll claim was taken back off the UI for exactly this reason; the personalliste's identity-code substitution is the same shape and is still open.
  violated_when: a UI string, export or generated document names a Norwegian statute, forskrift or § reference while no code path in the same change produces the artifact that provision requires, and no Flag in this plan records the gap.
- C7: Secrets and credentials never reach a log sink.
  holds_because: Application Insights retains what is written to it, so a credential logged at any level is a credential published to everyone with portal access and to history nobody can edit afterwards. The estate has paid this twice — the Wolt callback signing secret and a live refresh token, both at Information level — and both times the rotation, not the code fix, was the expensive part.
  violated_when: a diff adds a log or telemetry call whose message template or argument list carries a token, secret, key, signature or password-bearing property, at any level including Error.

## Resources
class: node · pts: 1 · workdir: ../OkamAPI-modules
caps in force: sql=2 suite=8 node=12 analysis=12 global=24

## Boundaries
You may not run `plan accept` or `plan decide`.
You may not edit docs/plan/** except your RETURN.
If the brief contradicts reality, stop and return verdict fail-spec — do not improvise.
All writes under your lane directory or your own worktree. Never a shared scratch path.
At most 2 children; your entire subtree runs at most 1 test suite at a time.
Never start a container unless your brief grants the slot; never touch containers you did not create.
If a resource is busy, return `blocked` immediately; never spin-wait.
Return a ≤15-line summary plus evidence pointers; full detail goes in your lane directory.
## Return protocol
Write this block to docs/plan/returns/L-WB3-AND-TRB4-ARE-BUILT-FROM-A-SPECIFICATION-NOT-A-TRIAGE-<n>.md and hand it back:

```
RETURN: L-WB3-AND-TRB4-ARE-BUILT-FROM-A-SPECIFICATION-NOT-A-TRIAGE
brief: 55560b44
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

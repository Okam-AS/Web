<!-- GENERATED brief c33e34b6 for L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED · intent 7c84435b072ff7fe · 2026-08-08T13:48Z -->
# Brief — L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED

export PLAN_ACTOR=agent:L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED

## Objective
a statutory report claims receipts it never received

**An X/Z report is a statutory document, and this one overstates what the venue took.** Company-account
receivables — money **invoiced**, not received — are counted inside **`Sum mottatt`**. A venue reconciling
its day against the till reads a figure that includes sales nobody has paid yet.

**A fix exists at `lane/xz-printed-defects` @ `6c394057e` — and a verification pass measured it INCOMPLETE.
Do not land it as it stands.**

**The defect reproduces at the trunk `1c71ae951`**, verified before the branch was trusted:
`EscPosXZReportBuilder.cs:98` takes **every** `PaymentMeansTotal` with no exclusion, `:102-104` prints them
all under **`MOTTATT BETALING`**, and `:114` sums the same unfiltered list into **`Sum mottatt`**.

**But that branch filters at the PRINTER** — `allMeans.Where(p => !p.PaymentType.IsCompanyAccount())` —
**and the receivable enters upstream of every printer.** `XZReportService.cs:703-721` builds `paymentMeans`
from every `entry.PaymentLines` with no exclusion, **so the model itself carries it**, and **four emitters
read that model**:

| emitter | repaired by `6c394057e`? |
|---|---|
| `EscPosXZReportBuilder.cs` — the printed roll | **yes, only this one** |
| `SaftCashRegisterExportService.Transactions.cs:49,90` — the SAF-T export | no |
| `TripletexPosService.cs:114` — the accounting push | no |
| `XZReportService.cs` — the builder, where it enters | no |

**Landing it alone makes the same day reconcile differently depending on which artifact an inspector
reads.** For a statutory document, **two artifacts disagreeing is worse than one being wrong.**

**Fix at the model, not the printer** — either exclude where `paymentMeans` is built, or make the split a
property of the model every emitter reads. **Then show each of the four emitters agreeing.**

**MEASURED SINCE: only THREE emitters were ever wrong to check, and one of the four was already right.**
`TripletexPosService` books `CompanyAccount` to a **receivables account** and **must** iterate every medium,
because a double-entry voucher that filtered the company line would leave the revenue credit with no
matching debit. **Verified correct as-is — do not change it.** The exit criterion is therefore short by
**one** emitter, `SaftCashRegisterExportService`, and that one is **blocked on
`D-DOES-A-SAFT-PAYMENT-ELEMENT-ADMIT-A-CREDIT-MEDIUM`**, not on work.

**One half of that branch is right and should be kept**: it adds an **unconditional
kontantsalg/kredittsalg split** under § 2-8-2, so the report **distinguishes** rather than silently
excluding — which is the C6 answer, and it means a venue seeing a smaller `Sum mottatt` is told what the
credit sales were rather than assuming the till is broken.

**This is C6 territory: a statutory claim needs a producible document.** So the exit is not merely that the
total changes — **it is that a report can be produced showing the corrected figure.** Say whether the
report distinguishes received from invoiced, or merely excludes the latter; a venue that sees a smaller
number with no explanation will assume the till is wrong.

**Check the sibling emitters.** This estate has twice found a fix landing on one emitter while an adjacent
one kept the defect — the ESC/POS roll, the emailed PDF and the X/Z summary have historically drifted.
**Name which emitters you checked.**

**Verify the defect still reproduces at the backend trunk `1c71ae951` BEFORE trusting the branch.** Three
lanes in this program were dispatched at defects already fixed, because a report was trusted over the tip.
The ranking lane read this one from its **diff against its own merge-base** — that establishes what the
branch *changes*, not that the defect is *still live*. **Reproduce it, then decide whether the branch is
still the right fix.**

**If the branch is stale but the defect is live, say so and fix it properly rather than forcing an old
patch onto a moved trunk.** If the defect is already fixed, return `fail-spec` — that is a good outcome and
costs an hour, not a day.

**Every change must red under a mutation you apply and restore.** Use the canonical runner; it reports
`INVALID-RUN` for a spawn failure or a zero-test run in either exit direction, so a kill certificate
requires a test to have run. **Put the restore in a `finally` AND an `atexit` hook** — a foreground script
killed between write and restore left a mutant on disk in this program, and it was caught by reading the
file rather than trusting an exit code.

**Traps.** The backend tier runs **from `WebApi.Tests/`** with `--filter "Database!=SqlServer"` — at the
repo root `dotnet test` exits 0 having run **zero** tests. **Check every tier log for an abort line above
the summary.** **A stale build can fake a result** — restore bytes, bump mtime, assert `WebApi.dll`'s mtime
MOVES. **The non-SQL tier rewrites TWO tracked artifacts** — `run-sheet.json` **and** `run-sheet.md`;
restore both, never `git add -A`. **An empty `git diff` proves nothing** — two absent files also diff to
zero; use **blob identity**. **In zsh write `${ref}:path`.** **Two silent ignore rules** — a bare
`artifacts/` and a bare `*.log`; check with `git check-ignore -v`. **A worktree holding the branch turns any
commit made in it into a trunk move** — detach. **Check every branch you touch against the open decisions
before merging and say that you did.** Teardown `rm -rf` + `git worktree prune`. **Gate on `uptime` as a
separate check you stop on — hold below 13.** Never `pkill`, never touch `okam-lwtwo-*`. **Do not push.**

## Exit criteria
no X or Z report includes a receivable in its received total, shown by a test that reds when a company-account sale is counted as received, with the non-SQL tier green at the composed tip

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
caps in force: sql=2 suite=4 node=6 analysis=6 global=12

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
Write this block to docs/plan/returns/L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED-<n>.md and hand it back:

```
RETURN: L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED
brief: c33e34b6
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

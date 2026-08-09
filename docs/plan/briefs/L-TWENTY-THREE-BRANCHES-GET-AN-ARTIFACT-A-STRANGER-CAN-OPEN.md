<!-- GENERATED brief b4d793d2 for L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN · intent 7c84435b072ff7fe · 2026-08-08T16:24Z -->
# Brief — L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN

export PLAN_ACTOR=agent:L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN

## Objective
a green suite is real proof of the wrong kind

**These twenty-three are not a recording defect and must not be treated like one.** Three passes have taken
`verified` from 57 to 401 by fixing how proof was *recorded*. This class is different: **their proof is a
worktree, a branch and a green suite.** A sibling lane refused them rather than rounding them into its
total, and it was right — **C5 forbids verifying on "a `.trx`, a junit file, a suite-kind fact, or a test
name."**

Their `evidence:` reads like this, and there is **no artifact path in it to extract** — the only
file-shaped tokens are test sources:

> `OkamAPI worktree /Users/…/wt-utlkvit, branch lane/meals-utlkvit @ 1a03bc6c (local, not pushed) · SQL TIER WebApi.Tests/Meals/MealsDeliveryReceiptSqlServerTests.cs (3/3 green) · …`

**All twenty-three are named in `docs/plan/artifacts/eighty-two-mechanical-refusals.md`. Read that first
and do not re-derive the class.**

**What is missing is an artifact, and you must produce it rather than point at something that already
exists.** For each lane, the question is: **what could a stranger open that shows this capability is real?**
A committed run record, a rendered document, a captured wire exchange, a schema dump — the tool admits
**wire, schema, journey, artifact and meta**. A green suite proves the code behaves; **it does not show a
person the thing the lane exists to enable**, which is the objective's whole bar.

**Take them in order of what a person would meet.** Several are Meals and statutory surfaces — a delivery
receipt, an X/Z credit field — where **the document IS the artifact** and producing it is both the evidence
and the point. Start there. **Do not attempt all twenty-three if that means producing thin artifacts for
each**; a smaller number of real ones beats twenty-three that technically pass.

**Say plainly which you could not do and why.** A lane needing a browser capture is blocked on
`D-RESTART-THE-WALK-WORLD-API` and should be named as such, not attempted. **The honest count is the
deliverable** — this program has three passes' worth of evidence that naming what you refused is what makes
the accepted ones worth having.

**Never `--override` and never `plan accept`.** Producing an artifact that does not show the capability, to
make the tool say yes, is the exact failure C5 exists to prevent.

**Traps.** **Two silent ignore rules** — a bare `artifacts/` and a bare `*.log`. **A sibling found a lane
that verified against a journey capture the `artifacts/` rule was keeping uncommitted** — the tool accepts
on *existence*, so it would have passed while resting on a file no stranger could fetch. **Check every
artifact with `git check-ignore -v` before the add and `git ls-files --error-unmatch` after.** **Scan every
file for secrets before committing** — a pattern's silence is not a clearance; read it. **Take a backup of
`plan.md` first** so your diff is provable, and edit only `evidence:` and `exit:` lines. **Do not touch
`web-livewalk`.** **In zsh write `${ref}:path`.** **Gate on `uptime` — hold below 13.** **Do not push.**

## Exit criteria
each of the twenty-three lanes whose only recorded proof is a branch and a green suite either carries an artifact a stranger can open and is accepted by plan verify, or is recorded as needing work with what is missing named, with the count of each stated

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
class: node · pts: 1 · workdir: .
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
Write this block to docs/plan/returns/L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN-<n>.md and hand it back:

```
RETURN: L-TWENTY-THREE-BRANCHES-GET-AN-ARTIFACT-A-STRANGER-CAN-OPEN
brief: b4d793d2
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

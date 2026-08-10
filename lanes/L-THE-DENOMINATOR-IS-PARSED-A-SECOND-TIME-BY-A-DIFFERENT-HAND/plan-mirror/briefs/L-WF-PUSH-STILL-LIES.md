<!-- GENERATED brief 2dffcbf4 for L-WF-PUSH-STILL-LIES · intent 7c84435b072ff7fe · 2026-08-04T01:37Z -->
# Brief — L-WF-PUSH-STILL-LIES

export PLAN_ACTOR=agent:L-WF-PUSH-STILL-LIES

## Objective
the delivery record stops claiming more than it knows

**A Fable review of the landed push work found that the defect those lanes existed to remove is still
reachable on two paths, both live on the integration branch. Neither is a regression — the lanes made
things strictly more honest — but "the manager believed the shift was announced" is still true.**

**1. The probe proves a record, not a device.** Azure Notification Hubs does not remove a registration at
uninstall; it prunes lazily, on PNS feedback after a send or at expiry. So a worker who uninstalled
yesterday, a reinstall that left a dead handle, and a phone with notifications OS-disabled **all answer
the probe present** — the hub accepts the send and the row goes `Sent`.

The fix removed the *never-registered* arm of the lie and kept the *registered-but-unreachable* arm. That
is real progress. **The defect is that the code claims otherwise:** the adapter's own comments say the
uninstalled-worker case is closed. `NotificationService.cs:133` already names the counterexample — *"a
stale one per reinstall"* — without drawing the conclusion.

**By this plan's own standard a narrowed lie recorded is fine and a narrowed lie claimed as solved is
not.** Change the comments and the return; the next rung (per-send PNS outcome telemetry) is a different
lane.

**2. The recipient is flipped to `Delivered` regardless of the push outcome**, on the first pass, in the
in-app inbox write. The tests say this out loud and designate the outbox row as the only honest record —
and the only surface carrying that record, `GET .../schedules/notification-failures`, **has no frontend
caller at all.** The honest record exists; no operator's screen renders it. C3: a capability exists only
when it is reachable.

**3. C4 is named but not asserted.** The publish stamps `PublishedByActorReference` and an audit row, and
**no test asserts the `schedule.publish` audit actor by value** — the ledger test asserts action names and
counts only. The module already has the pattern for `clock.ingest`; copy it.

Also fold in: the operator endpoint is only ever reached by **direct controller-action invocation**, so an
attribute-routing failure would not red; and two comments now misdescribe `Withheld` as a *failure* with a
retryable code, which it is not.

## Exit criteria
no code comment or return claims the uninstalled-device case is closed, the recipient is not flipped to Delivered on a push that was never confirmed, and the publish audit actor is asserted by value

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
class: suite · pts: 2 · workdir: lanes/L-WF-PUSH-STILL-LIES/
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
Write this block to docs/plan/returns/L-WF-PUSH-STILL-LIES-<n>.md and hand it back:

```
RETURN: L-WF-PUSH-STILL-LIES
brief: 2dffcbf4
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

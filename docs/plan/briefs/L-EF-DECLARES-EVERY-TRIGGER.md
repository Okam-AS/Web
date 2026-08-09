<!-- GENERATED brief 5525f60e for L-EF-DECLARES-EVERY-TRIGGER · intent 7c84435b072ff7fe · 2026-08-06T15:48Z -->
# Brief — L-EF-DECLARES-EVERY-TRIGGER

export PLAN_ACTOR=agent:L-EF-DECLARES-EVERY-TRIGGER

## Objective
no EF write dies because the model forgot a trigger

**Read `F-EF-NEVER-DECLARES-A-TRIGGER` first.** 25 triggers, zero declarations, proven fatal on
`TrainingCourseVersions` by three HTTP 500s from a live endpoint.

**Derive the list; do not copy the one in the flag.** Sweep `Migrations/**` for every `CREATE TRIGGER` and pair
each with the table it sits on — that pairing is the deliverable, and a list typed from prose is the shape this
estate keeps getting wrong.

**Then establish which are actually exposed.** A table EF only ever INSERTs into is unaffected, because error
334 is about `OUTPUT` on UPDATE and DELETE. **Say which of the 25 are live hazards and which are latent**, and
how you told the difference — an append-only table today can grow an update tomorrow, so latent still gets the
declaration.

**The proof has to go through EF, not through raw SQL.** That is precisely the gap: the existing immutability
suites drive the triggers with raw statements or reason about them in comments, and **the EF path was never run
against SQL Server with the triggers applied**. Your arm must issue a real EF update on each exposed table and
show it succeed where it fails today.

**You hold a SQL slot.** Re-measure headroom before starting a container, and **cap `max server memory` inside
your own container** — keyed on your Testcontainers session id, never by name, never by elimination. Two capped
lanes coexist where two uncapped ones do not.

**No migration is needed** — this is a model declaration, not a schema change. If you find one is needed, stop
and say so: another lane holds the migration slot.

**Do not disable a trigger to make anything pass.** A seeder considered exactly that and rejected it, correctly:
it would switch off an immutability guard in a world the owner is using and hide a shipping blocker behind a
green demo.

## Exit criteria
every table carrying a chain-created trigger is declared with HasTrigger, and a SQL-tier arm updates one row on each such table without error 334, with the trx committed under the lane directory

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
class: sql · pts: 2 · workdir: ../OkamAPI-modules
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
Write this block to docs/plan/returns/L-EF-DECLARES-EVERY-TRIGGER-<n>.md and hand it back:

```
RETURN: L-EF-DECLARES-EVERY-TRIGGER
brief: 5525f60e
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

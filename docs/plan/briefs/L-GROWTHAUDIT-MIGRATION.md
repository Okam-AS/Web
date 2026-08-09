<!-- GENERATED brief 23b9c005 for L-GROWTHAUDIT-MIGRATION · intent 7c84435b072ff7fe · 2026-08-06T13:14Z -->
# Brief — L-GROWTHAUDIT-MIGRATION

export PLAN_ACTOR=agent:L-GROWTHAUDIT-MIGRATION

## Objective
the growth audit table exists on a chain-built database

**This stopped being an inference on 2026-08-06.** The first SQL-tier run at any SHA carrying the integration
branch's last five days measured **565 passed / 22 failed / 587**, and **21 of the 22 trace to
`GrowthAuditEvents` living in the model and in no migration** — 15 lineage reds (including the stack-arrived
`TrainingW3MigrationLineageTests`) plus 6 Growth dispatch-path reds. *(Corrected on review 2026-08-06: the
original report said 20, having counted TrainingW3 both inside its fifteen and again as the separate
twenty-second, and undercounted the dispatch reds by one. The two errors cancelled.)* The remedy was already specified by
`L-GROWTHAUDIT-TABLE-ABSENT`; nobody had authored the migration.

**None of the 22 are merge-induced.** All 19 failing classes were re-run at `8e2b57de` alone and produced an
identical failing set, 21 of 21 — the 22nd class does not exist there. That control is committed.

**This is the `AccountingSummaries` shape, which is a live production defect**: declared in `OnModelCreating`,
present in every model-built test database, absent from every deployed schema — so a tier is green against a
constraint production does not have. Here the whole **table** is missing, not only an index.

**You hold the migration-author slot; C2 binds you.** Take the chain tip as your parent, never the model — the
tip's last migration id is `20260803093235`. MIG-28 is **contested by two branches that each authored a file**
(`lane/wf-bootstrap-one-engagement` @ `6fa2cbc3` and `lane/finalize-index-or-a-reason` @ `5e53de83`), so the
merged ledger's "reserved for it and for nothing else" is incomplete; MIG-29 is Growth's re-parented
reservation; the next free migration number is **30**.

**THROW numbers, corrected on review 2026-08-06 — I had this wrong in both directions.** `50019` is
**ledger-reserved for MIG-14's publication-receipts trigger**, so handing it out invites a collision, and
`50074` is **reserved for MIG-29's own trigger** — this lane's — so "50075+" strands the very number this work
is meant to use, contradicting `F-MIG-LEDGER-THROW-NUMBER-WRONG`. `50018` and `50051` really are spent.
**Table and indexes alone need no THROW number; a trigger takes `50074`.**

**Rule the scope rather than assuming it.** The merged ledger says the trigger is the reason the MIG-29 entry
exists and must be authored **exactly once**. Either include it here, or split the entry — a later trigger-only
migration would put two migrations on one ledger entry, which is the failure the renumbering rule prevents.

**Fold `L-GROWTH-AUDIT-INDEX` into this.** Creating the table and its two indexes is one migration, and that
lane cannot run anyway — it needs a lane that will never be accepted.

**Do not repair the two non-GrowthAudit reds here.** They are separate findings with their own flags.

## Exit criteria
a migration creates GrowthAuditEvents and its two indexes, and the SQL tier at the composed stack drops from 22 failures to 1 (the outbox double-write), shown by a trx and a system-catalog read committed under the lane directory

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
class: sql · pts: 2 · workdir: lanes/L-GROWTHAUDIT-MIGRATION/
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
Write this block to docs/plan/returns/L-GROWTHAUDIT-MIGRATION-<n>.md and hand it back:

```
RETURN: L-GROWTHAUDIT-MIGRATION
brief: 23b9c005
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

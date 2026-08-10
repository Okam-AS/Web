# Intent — restaurant-modules

## Objective

Six modules — Workforce, Margin, Events, Meals, Training and Growth — stop being code on
`feature/restaurant-modules` and become the things a Norwegian restaurant runs its week on. When this
plan is dead, at one pilot venue: a manager plans and publishes a week and can hand an inspector a
personalliste; a chef enters a recipe, opens a costed margin week, freezes it and corrects it; a host
takes a private booking from a public enquiry through a paid deposit to a settled statement; a
concierge runs one company's lunch accounts to a monthly statement an accountant accepts; a worker
completes a course that becomes evidence somebody holds; and a guest who consented — only a guest who
consented — receives a newsletter and can take themselves back out of it. Each of those is walked from
a browser by a person, not asserted by a test; each is named in an artifact a stranger can open; each
statutory claim the product prints is backed by a document we can actually produce; and every money
path names the actor that caused it. The branch is merged, each flag is either cleared or defended in
writing, and nobody has to ask which of the six modules is real.

## Constraints

- C1: Append-only tables are never backfilled, repaired in place, or purged.
  holds_because: The journal projections, deposit receipts, statement lines, consent receipts and
    personnel records are the evidence a bokføring, Skatteetaten or Datatilsynet inspector reads. A row
    that changed after the fact is worth nothing to them, and the deny-triggers already on those tables
    are the only thing that makes the claim checkable instead of a promise. Written now because the
    estate has already shipped one defect of exactly this shape — an RF-1313 systembeskrivelse
    asserting database triggers that no migration in the chain creates.
  violated_when: a diff contains an UPDATE or DELETE statement — in a migration, a script, or raw SQL —
    against a table carrying an append-only deny-trigger or the GuardAppendOnly guard; or an EF entity
    mapped to one of those tables is mutated and saved outside its documented append path.

- C2: One migration author at a time, and the chain is the truth, not the model.
  holds_because: Two lanes generating EF migrations against one DbContext produce two snapshots that
    each claim to be the model, and the chain then replays in an order neither author tested — the
    failure surfaces on a fresh database and never on the author's. The estate has been bitten twice
    already: a chain that cannot replay from empty because two migrations both add Orders.TableId, and
    AccountingSummaries, whose unique index exists in the model and in every model-built test database
    but in no migration.
  violated_when: a diff adds a migration whose Designer snapshot's parent id is not the current chain
    tip, or two migration files on one branch share a parent; or a diff adds an index, unique
    constraint or check constraint in OnModelCreating without a migration in the same diff creating it.

- C3: A capability exists only when it is reachable; service, DI registration, route and navigation entry land in the same change.
  holds_because: On 2026-07-29 four of five module journeys stopped at a missing wire while the suite
    was green — a service with no controller, a feature flag with no lever and no bound Configure<>, a
    seed with no production caller, a page nothing linked to. A green suite cannot see code that no
    caller can reach, so reachability has to be a property the diff carries rather than a property the
    tests are asked for afterwards.
  violated_when: a diff adds a service or handler that no controller action and no DI registration
    references; or adds a page under pages/ that no navigation surface links to; or adds a feature flag
    with no operator lever; and the same diff does not close the gap.

- C4: Every money-path write names the actor that caused it.
  holds_because: A deposit, a capture, a refund, a settlement line, a funded order and a payroll-bearing
    hour are all rows somebody will later have to explain. If a webhook, a background job and an
    operator can each write the same row under different — or absent — actor identity, the audit trail
    names nobody and the kroner cannot be traced back to a decision. Events has already had to re-prove
    its attribution twice against a world a prior lane had changed underneath it.
  violated_when: a money-path write (deposit, capture, refund, settlement or statement line, funded
    order, timesheet cost) is reachable from a code path that carries no resolved actor, or a test
    constructs one with a null, ambient or hard-coded system actor.

- C5: Acceptance is a person completing the journey, never a suite reporting green.
  holds_because: Standing law (Sven, 2026-07-28) — drive each feature to the end, then open the UI so
    he walks it himself; his acceptance is the gate. The estate has repeatedly shipped green suites over
    unreachable features, so a suite result is evidence that code behaves, never evidence that a
    capability exists. This branch has no browser-level test framework at all, which makes the rule
    load-bearing rather than decorative.
  violated_when: an item is moved to verified or accepted whose only named evidence is a .trx, a junit
    file, a suite-kind fact, or a test name; or a status message offers a suite count as the reason a
    capability is finished.

- C6: A statutory claim is printed only where the document it claims can be produced.
  holds_because: The product names Norwegian law on screen — personalliste under bokføringsforskriften
    § 8-5-6, kassasystemforskrifta, internkontroll. Each of those names promises an artifact an
    inspector may demand on the day, and an unbacked claim is worse than a missing feature because it
    invites the inspection it cannot survive. On 2026-07-30 the internkontroll claim was taken back off
    the UI for exactly this reason; the personalliste's identity-code substitution is the same shape and
    is still open.
  violated_when: a UI string, export or generated document names a Norwegian statute, forskrift or §
    reference while no code path in the same change produces the artifact that provision requires, and
    no Flag in this plan records the gap.

- C7: Secrets and credentials never reach a log sink.
  holds_because: Application Insights retains what is written to it, so a credential logged at any level
    is a credential published to everyone with portal access and to history nobody can edit afterwards.
    The estate has paid this twice — the Wolt callback signing secret and a live refresh token, both at
    Information level — and both times the rotation, not the code fix, was the expensive part.
  violated_when: a diff adds a log or telemetry call whose message template or argument list carries a
    token, secret, key, signature or password-bearing property, at any level including Error.

## Rejected alternatives

- R1: Wave-gating the programme — finish a wave, then start the next — rejected because the estate has
  measured the decay: concurrency collapses from six lanes to one at every wave boundary, not because
  anyone forgets to refill but because the refill lives in an operator's attention and attention is
  event-driven. Phase boundaries are Stages whose readiness is recomputed instead.
  reopen_when: two lanes landing in parallel corrupt shared state that no declared lock covers, or host
  contention makes parallel lanes measurably slower than serial ones.

- R2: Building the six modules strictly serially, each gated on the previous module's pilot evidence
  (PD2/PD3 of docs/plans/modules/00-program-design.md in the backend repo) — rejected by Sven on
  2026-07-20: there is no customer yet whose evidence a serial gate could consume, so the gate only
  postpones the day there is one. All six build in parallel; only the migration author and the SQL
  container slots serialise.
  reopen_when: a pilot venue signs and its scope names fewer than six modules, or Sven-hours rather
  than agent-hours become the binding constraint.

- R3: Trusting the model-built SQLite tier and deferring the SQL Server tier — rejected because the
  disagreement between the tiers is itself the defect class. A model-built database declares every index
  OnModelCreating names, including the AccountingSummaries unique index that no migration creates, so
  the fast tier can only ever agree with the model and never with the database a customer would get.
  reopen_when: the migration chain is certified equal to the model by a committed diff of live sys.*
  catalogues, at which point the difference has somewhere else to show up.

- R4: Adding the Meals employee reference later by backfilling memberships claimed without one —
  rejected because C1 forbids it and the rows are guarded: a membership cannot acquire the value after
  its claim, and statement lines that referenced it freeze on finalization. The column has to exist
  before the pilot's first invitation is sent, or those memberships are permanently unreferenced.
  reopen_when: a ruling both lifts the append-only guard on the membership table and names the receipt
  that would record the backfill.

## Amendments

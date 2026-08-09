<!-- GENERATED brief 05c05fae for L-THE-FLAG-BACKLOG-IS-A-WORK-LIST · intent 7c84435b072ff7fe · 2026-08-06T19:40Z -->
# Brief — L-THE-FLAG-BACKLOG-IS-A-WORK-LIST

export PLAN_ACTOR=agent:L-THE-FLAG-BACKLOG-IS-A-WORK-LIST

## Objective
the hundred-odd open flags are sorted into what an agent can close and what only Sven can

**This backlog is a proven seam and it is being mined by hand.** The plan carries **131 blockers and 167
warnings**, and **137 of them have an empty `cleared_by`** — nothing in the plan is scheduled to close
them.

**The evidence it is worth mining: four were picked near-arbitrarily today and all four were real.** Four
øre printing as zero on an operator screen; a server accepting an event proposal from nobody; a test that
red in every worktree but the canonical one; eleven branches that silently re-add a deleted credit-sale
predicate. **Picking by hand does not scale and picks badly** — this lane replaces the picking with a
list.

**Three buckets, and the third is the one nobody expects.**
- **agent-closable** — the work is engineering and needs no ruling.
- **sven-only** — it needs a judgement, a rotation, a threshold, or a legal call. **Say which**, because
  "ask Sven" is not a category.
- **already-satisfied-but-unclearable** — the world has moved and the flag is stale. At least one is
  known: `F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND` has overwhelming evidence (**7 adversarial checkouts, 7
  greens, 2 falsifications**) but its `clears_when` names no `fact:` key, so the tool refuses to clear it
  and wants an owner override. **Find the others** — a stale flag costs attention every time it is read.

**One trap that will cost you if you skip it.** `F-AZURE-FUNCKEY` looks like an urgent blocker — a live
Azure Functions host key committed, and a red test that prints it. **Sven ruled it on 2026-08-04: "this
is fine disregard"**, and the flag body itself says no lane should spend time on it. **Read each flag
body to the end before classifying it**; several carry rulings, corrections, or retractions below the
`clears_when` line.

**Rank the agent-closable ones by what a person would notice**, not by severity as recorded — severity in
this plan was assigned at raise time and has drifted. A money figure rendered wrong on a screen an
operator reads outranks a test-infrastructure wart, whatever the labels say.

**Read-only.** No commit, no suite, no container, no `pkill`. Never touch `okam-lwtwo-sql` or
`okam-lwtwo-redis`, never bind **:3971** or **:5971**. **Rule and name. Do not edit any file** other than
your review and return — in particular, **do not clear or raise a single flag.**

## Exit criteria
every open Flag is classified agent-closable, sven-only, or already-satisfied-but-unclearable, with the reason per flag, and the agent-closable ones ranked by what a person would notice, in a file under docs/plan/reviews/

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
class: analysis · pts: 0.5 · workdir: .
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
Write this block to docs/plan/returns/L-THE-FLAG-BACKLOG-IS-A-WORK-LIST-<n>.md and hand it back:

```
RETURN: L-THE-FLAG-BACKLOG-IS-A-WORK-LIST
brief: 05c05fae
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

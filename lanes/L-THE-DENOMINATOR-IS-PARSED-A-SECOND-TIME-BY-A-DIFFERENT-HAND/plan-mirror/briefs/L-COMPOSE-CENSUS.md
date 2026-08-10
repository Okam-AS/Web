<!-- GENERATED brief 2feb399b for L-COMPOSE-CENSUS · intent 7c84435b072ff7fe · 2026-08-04T21:22Z -->
# Brief — L-COMPOSE-CENSUS

export PLAN_ACTOR=agent:L-COMPOSE-CENSUS

## Objective
the composition surface is measured before anything is merged

**Sven has directed composition: bring all the work onto our own branch in both repositories, prove it
there, and merge it nowhere else.** This lane is the measurement that makes that safe. **It merges
nothing.**

**Two things are already settled and must not be re-litigated.** `feature/POS` is **fully contained in
both repositories** — frontend 0 ahead with ours 105 ahead; backend `origin/feature/POS` 0 ahead, ours 411
ahead, merge-base **is** the POS tip, **0 files differing.** There is nothing to bring across, and a merge
attempt there would be motion without change.

**The raw counts are misleading and that is the first thing to fix.** 74 frontend and 187 backend branches
are *ahead* of the integration tips, but that set includes old parallel stacks — `feature/restaurant-control-stage0`
at 387 ahead, and nine `a1`–`b3` lanes at 380 each. **249 plan lanes are `built-unverified` or `verified`
and name ~117 distinct branch strings between them**, some of which are false positives from evidence prose
(`.md` and `.trx` paths). **Resolve the strings to real refs; do not trust the extraction.**

**Classify every candidate into exactly one bucket, with the command that proves it:** **contained**
(already an ancestor of the tip — merge is a no-op), **superseded** (its content lands via another branch;
name which), **outstanding** (real work not yet on the tip), or **not-a-branch**.

**Then the part that decides the order: the collision matrix.** For every pair of outstanding branches,
which files both touch. **Tonight proved three separate ways this goes wrong silently, and all three must
shape the order you propose:**
- **A lane commit can carry hunks its author never wrote** — the shared checkout went 204 → 246 dirty
  files in one evening.
- **The conflict is a decoy.** A rebase's damage landed in the file that **auto-merged**, not the one that
  conflicted, and would have broken every download filename.
- **A branch's recorded green may come from a tree nobody ran** — the private-index recipe can build one.

**So the deliverable is an order plus a re-run point, not just an order.** For each proposed step, say what
must be re-run **after** it and why — because a branch's own green does not transfer.

**Name the branches that must land together.** At least three pairs exist: `lane/wf-w5-timesheet` with
`lane/wf-digest-tautology` (`4b911917`), `lane/wf-invite-list-revoke` with `lane/fe-wf-invite-list-revoke`,
and `lane/pdf-creditnote-name` which **supersedes** `lane/credit-note-number`. **Merging either half of a
pair alone is the failure mode.**

**Flag anything that cannot be composed at all**, and say why. `F-CORE-PIN-ON-NO-REMOTE` means a fresh
clone cannot build this branch today — **note it in your order, do not try to fix it**; it needs a push and
that is the owner's.

**Merge nothing. Push nothing. Check out nothing in a shared checkout.** Your output is a document and a
script.

## Exit criteria
every branch carrying live lane work in both repositories is classified as contained, superseded or outstanding, with its file-collision surface and a proposed merge order derived by a committed script, recorded in lanes/L-COMPOSE-CENSUS/compose.md

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
class: analysis · pts: 2 · workdir: lanes/L-COMPOSE-CENSUS/
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
Write this block to docs/plan/returns/L-COMPOSE-CENSUS-<n>.md and hand it back:

```
RETURN: L-COMPOSE-CENSUS
brief: 2feb399b
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

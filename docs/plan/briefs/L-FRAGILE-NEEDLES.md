<!-- GENERATED brief f3cb2bd1 for L-FRAGILE-NEEDLES · intent 7c84435b072ff7fe · 2026-08-04T12:02Z -->
# Brief — L-FRAGILE-NEEDLES

export PLAN_ACTOR=agent:L-FRAGILE-NEEDLES

## Objective
three assertions that pass only because their haystack is empty today

**A fourth site, found by `L-ROW-FIT-GOODS-GROUPS` and different in kind: a comment that cites an example
its own code cannot produce.** The choke-point fit guard justifies itself with `"Kort (Stripe)"` and
`"Vipps (Dintero)"` as labels that must still shorten as prose — **but those never reach the row builder in
that form**, because the payment label always has a rendered count appended first. **The guard is right;
its stated reason is not an example the builder can make.** That is a comment asserting a fact the code
falsifies, which this program has now removed from four other places — and it is worth the same treatment:
cite an example the code can actually produce, or say the guard is for a label that does not exist yet.

**Not aliasing — the mirror of it, and `L-ALIASING-NEEDLE-SWEEP` flagged these as comment-worthy rather
than fixing them. They are worth a small lane because each is one field away from permanent red.**

`GrowthErasureRefCountTests.cs:130` searches for **`"8"` — a single character.** It passes only because
the deferred erasure receipt writes a null destroyer and a null timestamp, so the haystack **holds no
digits at all.** Add one count or one timestamp and it is red forever, for a reason having nothing to do
with what it asserts.

The same shape covers the **one-to-two character `StoreId` needles** in the two tenant sweeps.

**These are the inverse of the aliasing family.** Those fail at random because the haystack contains
something; these pass reliably because it contains nothing — **and both are assertions whose truth rests
on a property nobody declared.** The remedy is the same: excise the haystack, or pin the emptiness the
assertion depends on so that changing it fails loudly and locally rather than mysteriously and later.

The sweep also found **a new form nobody had matched: the needle itself being the random part** — a
six-digit generated code searched in a log line, quantified at 1 in 1.51M. Safe, and on the record with
its number, which is the standard this census set.

## Exit criteria
no absence assertion depends on a field being unpopulated, each of the three named sites either excises its haystack or pins the emptiness it relies on, recorded in lanes/L-FRAGILE-NEEDLES/mutation-log.md

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
class: suite · pts: 1 · workdir: lanes/L-FRAGILE-NEEDLES/
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
Write this block to docs/plan/returns/L-FRAGILE-NEEDLES-<n>.md and hand it back:

```
RETURN: L-FRAGILE-NEEDLES
brief: f3cb2bd1
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

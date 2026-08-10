<!-- GENERATED brief 1e008b13 for L-READ-THE-TEST-WRITING-LANES · intent 7c84435b072ff7fe · 2026-08-07T10:35Z -->
# Brief — L-READ-THE-TEST-WRITING-LANES

export PLAN_ACTOR=agent:L-READ-THE-TEST-WRITING-LANES

## Objective
sixty-five mutation claims are checked by someone who applied none of them

**Two lanes wrote tests and proved them by mutation, and mutation evidence is the one kind that is
trivial to fake by accident.** A mutation weaker than the defect it claims to catch reds for the wrong
reason and reads as proof. **Nobody has checked either.**

**`preserve/till-money-tests` at `7aaee5b`** — six POS suites, 149 tests, **45 mutations applied, 44
killed**. Evidence at `docs/plan/lanes/L-THE-TILL-TESTS-ARE-RUN-AND-TRUE/mutation-log.md`.
**`lane/the-two-documents-and-the-cart-get-tests`** — frontend `4541e98`, backend `6859bdaa6`, **20
mutations, 19 red**. Evidence at
`docs/plan/lanes/L-THE-DOCUMENTS-AND-CART-TESTS-FINISH/mutation-ledger.md`.

**Both lanes reported a survivor and reasoned about it, which is the behaviour to check hardest — not to
trust.**
- The till lane kept a `seatBuckets` sort test whose mutation changed nothing, arguing `Object.keys`
  orders integer-like keys ascending by language guarantee, and that a reversed comparator reds it
  anyway. **Verify both halves of that argument.**
- The documents lane found a `parseInt` arm claiming to pin a base-10 radix that ES5 made inert.
  **Check whether its retitled replacement actually pins the parse**, or whether it now measures
  something equally free.

**Re-apply a sample rather than reading the ledgers.** Pick the mutations whose claims carry the most
weight — the ones named as catching **a blank payer line, a return priced off a listed price, a stale
reason on a zero-difference Z, the last split payer's øre**, and the two vacuity repairs (**defect B**'s
`if (id != null)` and **defect C**'s deleted duplicate parser). **Apply each, watch it red, restore.** A
ledger row you did not reproduce is a claim, not a receipt.

**The claim most worth falsifying**: the documents lane says the `statement-client` copy of
`fileNameFrom` was **character-identical** to the exported one and that deleting it made two mutations
bite that could not before. **Check both** — that a shared parser is genuinely now on the path, and that
the two mutations are not simply new tests dressed as recovered coverage.

**Read-only.** No commit, merge, rebase, push or branch move. **You may run the suites you are checking
and apply mutations you restore**, because the exit depends on it — nothing else. No container, no
`pkill`. Never touch `okam-lwtwo-sql` / `okam-lwtwo-redis`, never bind **:3971**/**:5971**, never
`npm ci`/`npm install`.

**The `core` submodule cannot be initialised normally**: from inside the worktree's `core`,
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
then checkout that SHA. **Without it 15 suites fail to RESOLVE while jest exits 0.**

**Rule and name the exact change. Do not edit any file** other than your review and return. A clean
reading is a legitimate outcome and the likeliest one.

## Exit criteria
a verdict on the mutation evidence of both test-writing lanes, naming any mutation that would not actually red, any test that passes for a reason other than the one claimed, and any surviving vacuity, in a file under docs/plan/reviews/

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
Write this block to docs/plan/returns/L-READ-THE-TEST-WRITING-LANES-<n>.md and hand it back:

```
RETURN: L-READ-THE-TEST-WRITING-LANES
brief: 1e008b13
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

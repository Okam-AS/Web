<!-- GENERATED brief 4870b5a1 for L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING · intent 7c84435b072ff7fe · 2026-08-07T17:13Z -->
# Brief — L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING

export PLAN_ACTOR=agent:L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING

## Objective
a tool in a lane directory reverts uncommitted edits to HEAD

**A tool the estate is copying from lane to lane destroys the work it is meant to be testing.**
`docs/plan/lanes/L-THE-LAST-UNTESTED-MEALS-AND-EVENTS-SCREENS/mutate.js` restores a mutated file with
**`git checkout -- <file>`**. That reverts to **HEAD**, which is correct only while the file is unmodified.
**Run against uncommitted work — which is every lane mid-flight — it deletes the lane's own edits.**

**It has already fired once.** It did exactly this to `plugins/global-mixin.js`. Nothing was lost, because
that runner's own **verify-after-restore** assertion caught the mismatch and halted — **the guard saved it,
not the restore**. The lane re-applied by hand and wrote its own buffer-based replacement.

**The reason this is a blocker rather than a note: the broken copy is still sitting where the next lane
will find it.** Three lanes this evening copied a sibling's mutation runner as their starting point. The
next one to copy this file gets a tool that silently reverts its work at the first restore, and the only
thing standing between that and lost work is an assertion the copier might strip as noise.

**Do three things.**
1. **Sweep**: grep every `mutate*` script under `docs/plan/lanes/` for `git checkout`, `git restore` and
   `git stash`, and **list every one you find** — the report is half the deliverable, because nobody knows
   how many copies exist.
2. **Replace, do not patch.** The correct implementation reads the original into memory, writes the
   mutation, then restores **from that buffer** and asserts the bytes match. `lane/eleven-wolt-statuses…`
   @ `32518da` carries a working one — **read it rather than writing a third variant.**
3. **Keep the verify-after-restore assertion in every copy**, and say in your return why it must never be
   removed: it is the only reason this defect cost nothing.

**One boundary.** Lane directories are other lanes' evidence. **You may replace a broken tool, but do not
edit any lane's findings, logs or results**, and say exactly which files you touched.

**A test that proves the runner survives its own hazard is the exit criterion, not the sweep.** Write one
that mutates a file with uncommitted changes and asserts those changes are still present afterwards.
**It must red against the `git checkout` implementation** — that is what makes it a pin rather than a
description.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. Pin
with `git submodule update --init core`, then **from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA. Trunk **`d4c308e`** = **168 suites / 4007 / 0**. **Check `uptime` and hold if the
1-minute average is above 14 — a lane ran its tier at 28 tonight and said so.** Teardown `rm -rf` +
`git worktree prune`; `--no-verify` is load-bearing. **Do not touch `web-livewalk`.** Never `pkill`, never
`npm ci`/`npm install`, never bind **:3971**/**:5971**, never touch `okam-lwtwo-*`. **Do not push.**

## Exit criteria
no mutation runner under docs/plan/lanes/ restores a mutated file with git checkout, shown by a grep across every mutate script in the tree and by a runner that provably survives being run against uncommitted work

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
Write this block to docs/plan/returns/L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING-<n>.md and hand it back:

```
RETURN: L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING
brief: 4870b5a1
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

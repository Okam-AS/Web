<!-- GENERATED brief 8134dc65 for L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID · intent 7c84435b072ff7fe · 2026-08-07T16:55Z -->
# Brief — L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID

export PLAN_ACTOR=agent:L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID

## Objective
a worker with two employers is told she is clocked in on the one that folded nothing

**The wire is already honest; the client is not.** `utils/workforce/pos-clock-state.js` keys on
**`clockSessionId` presence alone** — the rule the backend's own documentation calls **wrong in the same
direction** as the defect it just fixed.

**The failing case is a worker with two employers.** A cross-engagement clock-in answers
**`AttendanceException`** while **carrying the OTHER employer's OPEN session id**. So `clockSessionId` is
truthy and `closedUtc` is null, `stateFromClockEvent` returns **`SESSION_OPEN`**, and `nextState`'s
exception guard never fires. **The register reports her clocked in on an engagement that folded nothing.**

**This is not inference.** The backend pinned the trap under the name
`A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open`.
**Read that test first** — it is the specification for this lane, written by the people who fixed the other
half.

**Two things to fix, and the second is why the first was possible.**
1. The rule itself: the client must consult the outcome the wire now carries, not the presence of an id.
2. **The header comment of that same file still quotes `SessionState = result.ClosedUtc.HasValue ? Closed : Open`
   as current backend behaviour.** It is false, and it is the documented cause of a lane being dispatched at
   a defect that had already been fixed. **Correct it in the same commit.**

**A reachability question you must answer rather than assume (C3).** The previous lane measured that
**nothing in the frontend reads `sessionState` at all**, so the backend's corrected third state reaches no
client today. **Say whether your fix makes it reachable, or whether the register still cannot see the
distinction — and if the latter, name what else is needed.** A fix that no caller reaches is the failure
mode this estate has paid for most often.

**Every change must red under a mutation you actually apply and restore.** The obvious one is restoring the
null-id rule; write it, watch it red, revert it, and report the count.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. Pin
with `git submodule update --init core`, then **from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA — the plain clone genuinely lacks it. Trunk **`78ed84f`** = **166 / 3950 / 0**.
Teardown `rm -rf` + `git worktree prune`; `--no-verify` is load-bearing. **Do not touch `web-livewalk`.**
Never `pkill`, never `npm ci`/`npm install`, never bind **:3971**/**:5971**, never touch `okam-lwtwo-*`.
**Do not push.**

## Exit criteria
a cross-engagement clock-in that returns AttendanceException while carrying another employer's open session id no longer computes SESSION_OPEN, shown by a test that reds when the null-id rule is restored, and the frontend tier is green at the tip

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
Write this block to docs/plan/returns/L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID-<n>.md and hand it back:

```
RETURN: L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID
brief: 8134dc65
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

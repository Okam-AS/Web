<!-- GENERATED brief 0a5e614a for L-THE-THREE-SURVIVORS-ARE-KILLED · intent 7c84435b072ff7fe · 2026-08-07T17:53Z -->
# Brief — L-THE-THREE-SURVIVORS-ARE-KILLED

export PLAN_ACTOR=agent:L-THE-THREE-SURVIVORS-ARE-KILLED

## Objective
mutations excused as equivalent that an audit separated

**An independent audit attacked three survivors excused as equivalent mutants and separated all three.**
These are real holes in tests the estate is about to trust.

1. **Growth, `getPointValue`'s `??` → `||`.** The audit separates them on **`{orderCount: 0, OrderCount: 7}`**
   — `??` answers `0`, `||` answers `7`. The equivalence rested on a **single-casing assumption nothing
   enforces**. Branch `lane/growth-poweruser-tested` @ `fddb06c`.
2. **Workforce `P17`.** Proven separable by an **executable probe**: a vanish-then-return renders the stale
   roster with no fresh read. The probe **passes unmutated and reds under P17**. Branch
   `lane/workforce-screens-tested` @ `aff616d`.
3. **Workforce `D06`.** Same shape: the panel keeps the old answer up while loading, so **the in-flight
   half of D06's own comment is untested**. A hanging-read probe passes unmutated and reds under D06.

**The probes already exist in the audit's review** at `docs/plan/reviews/L-READ-WHETHER-THE-NEW-TESTS-CAN-ACTUALLY-FAIL.md`.
**Read them before writing your own** — reproducing a probe someone else proved is cheaper than deriving it,
and if you cannot reproduce one, that is the finding.

**`M01` is genuinely equivalent and is NOT yours.** The audit checked it: `load()`'s first-line gate
re-tests the same predicate, `init` is `load`'s only caller, and `M19` removes both copies cleanly and reds.
**Leave it, and say you left it.**

**Two bookkeeping wrinkles the audit found, worth fixing while you are in these files**: the Workforce
return's "71 mutations" undercounts its own committed **95** entries, and **`P18-v1` reds via a test title
its `expect` string no longer names**.

**Verify the premise at the tip before editing, and say so.** Briefs this session asserted four things the
trunk had overtaken — three defect claims and one test-surface claim. If a brief names a test, suite or
coverage figure, check it exists at the ref you are on.

**The mutation instrument fails in BOTH directions and you must defeat both.** Zero tests plus exit 0 reads
as a killed mutation (false green); zero tests plus a parse failure reads as a killed mutation too (false
red). **Assert every run executed the baseline test count**, treat any `reddened (0)` as untrustworthy, and
brace-check each mutant before running it. The canonical runner is `test/support/mutate.js` on
**`lane/mutation-runner-cannot-delete-work` @ `c65b19c`** — merge that branch rather than copying the file.
**Never restore with `git checkout -- <file>`**; it reverts to HEAD and deletes uncommitted work.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. Pin
with `git submodule update --init core`, then **from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA — that commit is on **no remote branch**. **Bundle any commit you make inside
`core/` before teardown**: a submodule in a linked worktree keeps its objects under that worktree.
**Anything under `docs/plan/artifacts/` is gitignored** by a bare `artifacts/` rule (`.gitignore:119` at the
trunk); force-add and verify with `git ls-files --error-unmatch`. Trunk **`d4c308e`** = **168 / 4007 / 0**.
Teardown `rm -rf` + `git worktree prune`; `--no-verify` is load-bearing. **Do not touch `web-livewalk`.**
**Gate on `uptime` as a separate check you stop on — hold below 13.** Never `pkill`, never `npm ci`/`npm
install`, never bind **:3971**/**:5971**, never touch `okam-lwtwo-*`. **Do not push.**

## Exit criteria
each of the three named survivors is killed by a new assertion, shown by that mutation redding where it previously survived, and the tier green at each branch tip

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
Write this block to docs/plan/returns/L-THE-THREE-SURVIVORS-ARE-KILLED-<n>.md and hand it back:

```
RETURN: L-THE-THREE-SURVIVORS-ARE-KILLED
brief: 0a5e614a
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

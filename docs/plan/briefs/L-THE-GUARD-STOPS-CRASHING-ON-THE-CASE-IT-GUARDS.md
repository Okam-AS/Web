<!-- GENERATED brief 5d5f2a39 for L-THE-GUARD-STOPS-CRASHING-ON-THE-CASE-IT-GUARDS · intent 7c84435b072ff7fe · 2026-08-07T10:18Z -->
# Brief — L-THE-GUARD-STOPS-CRASHING-ON-THE-CASE-IT-GUARDS

export PLAN_ACTOR=agent:L-THE-GUARD-STOPS-CRASHING-ON-THE-CASE-IT-GUARDS

## Objective
one line makes four unmountable components testable

**A guard tests for a case and then crashes on exactly that case.** `utils/guid.js:5` reads
`typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'`; when that is false,
**line 9 calls `crypto.getRandomValues(bytes)` unguarded**. The guard's only `crypto`-absent branch is
the one line 9 cannot survive. **The clerk read the file and confirms it.**

**What it costs today, measured rather than argued.** `ReturnBuilder` and `RefundModal` — **the till's two
money-out surfaces** — throw `ReferenceError: crypto is not defined` out of `data()`, **before any
assertion runs**. A sibling lane proved it in three environments: absent throws; present-without-
`randomUUID` returns a well-formed v4; full webcrypto takes the fast path. **The arithmetic is fine. The
guard is the defect.**

**It is not a live production defect and you should not overstate it** — browsers define `window.crypto`
and the target prerenders on Node 24. It is a **test-infrastructure** defect, and it is why the two
surfaces that hand money back have never been mountable.

**Decide the fallback shape on evidence and say why.** These GUIDs are **client-generated idempotency
keys** for POS cash returns, so randomness quality is not cosmetic. A `Math.random` path, a thrown
explicit error, and a Node `require('crypto')` path are three different products. **Read the eight call
sites across POS, Workforce and Meals before choosing** — and if the honest answer is that no safe
fallback exists and the right fix is to fail loudly with a clear message, **that is a legitimate outcome**
and better than weak keys on a money path.

**Prefer fixing the source over patching the harness.** A sibling deliberately did **not** add a jest
`setupFiles` entry, because that touches a config shared by **159 suites** while the trunk was moving —
the right call. **If guarding line 9 makes the components mountable on its own, the shared config never
needs touching.** Establish that first; only if it does not, say what remains.

**Four more components are named as unmountable for the same reason** — `DayFlow`, `ClockScreen`, and the
two `join.vue` pages. **Check them after your fix** and report which now mount.

**Trunk is `780d405`** (tier **153 suites / 3594 / 0**). The rescued POS suites sit on
`preserve/till-money-tests` at **`7aaee5b`** (tier 159/3743/0) — **read them, do not modify them**; a
sibling lane owns that branch.

**The `core` submodule cannot be initialised normally**: `git submodule update --init` fails on
`transport 'file' not allowed`, then `not our ref`. From inside the worktree's `core`:
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
then checkout that SHA. **Without it 15 suites fail to RESOLVE while jest exits 0.**

Never bind **:3971**/**:5971**, never touch the `okam-lwtwo-*` containers, never `pkill`, never `npm
ci`/`npm install`. Commit with `--no-verify`. **Do not push.**

## Exit criteria
newGuid returns a well-formed v4 with no crypto global present, shown by a test that reds against the current line, and the components that could not mount are shown to mount or the remaining reason is named

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
Write this block to docs/plan/returns/L-THE-GUARD-STOPS-CRASHING-ON-THE-CASE-IT-GUARDS-<n>.md and hand it back:

```
RETURN: L-THE-GUARD-STOPS-CRASHING-ON-THE-CASE-IT-GUARDS
brief: 5d5f2a39
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

<!-- GENERATED brief e78ec33c for L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS · intent 7c84435b072ff7fe · 2026-08-06T19:09Z -->
# Brief — L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS

export PLAN_ACTOR=agent:L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS

## Objective
the work finished after the two landings reaches the trunks it was built for

**Both trunks landed and are stable: frontend `feature/restaurant-modules` at `ff497c0`, backend at
`118f92fb9` (48 commits, clerk-verified — invariant holds, 33 `HasTrigger`, chain tip
`Growth_AuditLedger`, no duplicate migration ids).** Six lanes finished *after* those landings and their
work is sitting on branches. This wave lands it.

**Frontend, both fast-forward onto `ff497c0` as of 20:13 — re-check before you rely on that:**
- `lane/every-starter-resumes` **`894a3b9`** — orders.vue and statistics.vue resume after in-page
  sign-in. Full suite green on the branch: **145 suites, 3203 tests**.
- `lane/wf-invite-pair-fe` **`698383c`** — **144/144 suites, 3205/3205** (trunk was 3192).
- `lane/L-THE-DEMO-RUNS-ON-A-MACHINE-THAT-IS-NOT-THIS-ONE` **`ba2016f`**.

**Backend, both authored on the OLD trunk `8e2b57de8` and therefore needing a rebase you must do
deliberately:**
- `lane/wf-invite-pair-be` **`13e8a6213`** — its author had it clean onto `726906fe5`, which is **no
  longer the tip**.
- `lane/an-acceptance-names-somebody` **`86142430c`** — fast tier **4640 passed / 0 failed / 12 skipped**
  at its own base.

**One pairing rule is not negotiable and was already ruled.** `L-WFR-ACCESS-STRING-TRUTH` requires the
invite frontend and backend to **land together or not at all**: backend alone leaves a screen denying a
capability that answers; frontend alone gives a list with nothing behind it. **If you cannot land both,
land neither and say so.**

**Do not land the preservation branches.** `preserve/german-identifier-labels` and
`preserve/model-versus-chain-drift-test` exist to stop two commits being garbage-collected. **They are
not integration candidates** and landing them is a separate decision nobody has made.

**Two clients are outside this estate's authority and are not yours**: `Okam-AS/Web` and
`Okam-AS/AdminApp` carry `lane/ore-padding-operator-clients`. Name them as still-outstanding; do not
attempt to merge or push either.

**Resolve every conflict at hunk level with `git merge-file`, never by side, and report each one.** The
last wave's invite-pair merge hit exactly this: `--theirs` on `test/e2e/fixture/api-server.js` would have
restored a stale `world.ROLES` stub the trunk had just replaced with the real role catalogue, **and no
test would have caught it, because the fixture is the test double.**

**Verify at the tips, not per merge.** One frontend jest run, one backend build plus the non-SQL tier,
and the SQL tier if your slot allows — **account for every failure against the recorded baselines**:
frontend 3192 at `ff497c0`; backend non-SQL **4736 passed / 0 failed / 10 skipped**, SQL **694/1**, that
one red being the known `SchedulePublishSqlServerTests` outbox count (expected 1, actual 2) which is
gated on a ruling and is **not** yours to fix.

**Do not push.** Landing on the trunks is authorised; publishing is not. Record the revert for each trunk
in your evidence.

Cap `max server memory` in any container you start, keyed on your own Testcontainers session id. **Never
stop, restart or exec into `okam-lwtwo-sql` or `okam-lwtwo-redis`** — they hold the owner's seeded world.
Never bind **:3971** or **:5971**. Never `pkill`. Commit with `--no-verify`. `npm ci`/`npm install` are
banned repo-wide.

## Exit criteria
every named branch is either merged onto its trunk or refused with the reason, and both trunks build with their tiers recorded at the new tips

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
class: sql · pts: 2 · workdir: .
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
Write this block to docs/plan/returns/L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS-<n>.md and hand it back:

```
RETURN: L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS
brief: e78ec33c
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

<!-- GENERATED brief 0833e179 for L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF · intent 7c84435b072ff7fe · 2026-08-08T23:42Z -->
# Brief — L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF

export PLAN_ACTOR=agent:L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF

## Objective
one named infra step short of a measurement

**A lane built the expensive half and stopped one infrastructure step short — deliberately.** It drove the
**real** OpenIddict flow: a public client seeded via `IOpenIddictApplicationManager`, the demo-code login
(`+4799999999`/`123123`) to a real cookie, a consent POST with `decision=accept`, and the app persisted an
**issued, encrypted authorization code** — `SignInResult` → ad-hoc authorization → `INSERT INTO
OpenIddictTokens`. **Nothing in the ~5100-test suite had ever reached that.**

**Then the consent response blocked silently.** `/oauth/token` was never reached (grep count 0), no
exception, the worker idle with **no CPU-time growth**. Cause by elimination, each step ruled out by
evidence rather than by guess: not the OAuth flow (login, consent and code issuance all succeeded), not the
certificate (**the code was encrypted before the hang**), not the lane's own logic.

**What remains is the WireHost's single kept-open `DataSource=:memory:` SQLite connection**, shared by
every request and store; OpenIddict issues a further DB operation after the code insert and SQLite
serializes it into a silent block.

**The fix is named and was deliberately not applied**: a **shared-cache in-memory SQLite plus a keepalive
connection, overridden in the fixture's own `ConfigureTestServices`** — **no `WireHost` edit.** That
restraint is the point: `WireHost` is shared by the whole suite, and a lane that edits it to unblock itself
changes ~5100 tests to measure one bit.

**Start from the preserved harness, do not rebuild it**:
`lanes/L-THE-WIREHOST-CAN-MINT-AN-OPENIDDICT-PRINCIPAL/McpOpenIddictPrincipalWireTests.cs.harness`, with a
test-only `IStartupFilter` probe that reads the validated principal via `AuthenticateAsync`. Read
`evidence.md` beside it first.

**Already settled, do not re-derive**: the demo bypass does **not** change the principal's shape — token
claims come from `AddUserClaimsAsync` reading the user and OpenIddict, not from the login method, so a real
login yields the same shape.

**The one bit is still unmeasured and must stay that way until it executes.** Does validation expose the
name claim as short `"name"` or map it to long-URI `ClaimTypes.Name`? **Assert it, then mutate the mapping
and watch the arm red.** The predecessor wrote the assertion and its self-proof mutation and **refused to
report them because they never ran** — do not inherit that claim, execute it.

**If the connection change does not unblock it, abort and name the next step.** Two lanes have now stopped
honestly on this question and each left the next one better placed. **A third honest abort beats a first
false green.**

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert by name from a `--logger trx` and carry the executed count.** **Assert
`WebApi.dll`'s mtime MOVES.** **A silent block looks like a slow tier** — check worker CPU-time growth
before concluding either. **Stop your own hung PIDs with a targeted `kill`; never `pkill`**, and never a
process you did not start. **Gate on `uptime` — hold below 13.** **Restore `run-sheet.json` and
`run-sheet.md`; never `git add -A`.** **The trunk is checked out, so `git branch -f` refuses** —
fast-forward with `--ff-only` after re-reading the ref in the same command. **Do not push.** Backend trunk
is **`28e60e6b8`**.

## Exit criteria
the preserved OpenIddict harness reaches /oauth/token and asserts which name-claim shape reaches the endpoint, red under a mutation of the claim mapping, named from a trx with an executed-test count

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
class: node · pts: 1 · workdir: ../OkamAPI-modules
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
Write this block to docs/plan/returns/L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF-<n>.md and hand it back:

```
RETURN: L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF
brief: 0833e179
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

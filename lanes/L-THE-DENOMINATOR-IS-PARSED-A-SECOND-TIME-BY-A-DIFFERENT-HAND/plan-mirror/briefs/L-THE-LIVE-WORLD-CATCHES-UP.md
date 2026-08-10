<!-- GENERATED brief 558d27c8 for L-THE-LIVE-WORLD-CATCHES-UP · intent 7c84435b072ff7fe · 2026-08-07T15:22Z -->
# Brief — L-THE-LIVE-WORLD-CATCHES-UP

export PLAN_ACTOR=agent:L-THE-LIVE-WORLD-CATCHES-UP

## Objective
the world the owner walks stops being fifty commits behind

**This is the blocker under every other C5 debt in the plan.** The API on **:5971** is a compiled binary
from **`118f92fb9`** — the trunk is now `81d06c10a`, roughly **fifty commits ahead**. A sibling lane
measured this rather than assumed it: the Events flag literal appears **0 times** in the running build's
source, **1** on the branch, with a control reading **1 in both**.

**So nothing landed today can be shown to a person.** The dispatch lever, the newsletter refusal, the
`If-Match` discovery, the four sign-in pages, the acknowledgement receipt, the `crypto` guard — all
`built-unverified`, and all unwalkable against that binary.

**Rebuild both, then walk one thing.** The one to walk is the **Events dispatch lever**, because its
proof is the sharpest available: with the fleet key off a pass delivers nothing and the queue holds; you
write the store row from the switchboard; the next pass delivers and the queue drains. **Ten guest links
are queued in that world already.**

**You are granted the API and the web server, and only those.** `okam-lwtwo-sql` and `okam-lwtwo-redis`
hold the seeded world — **never stop, restart or exec into them**, and never `pkill`; resolve every kill
from your own pid or port.

**Rebuild the API with the module master flags set.** The world needed `Events__Enabled`,
`Growth__Enabled` and all four `Features__Meals__*`. **The connection string must be rebuilt from
`test/e2e/scripts/live-world.sh:174` and never captured from the environment** — a word-split on
`User Id=sa` took the API down for two minutes.

**Expect pending migrations** and apply them forward only over TCP, never by `docker exec`. A previous
rebuild applied ten; say how many you applied and what the last one was.

**Two other lanes have left deliberate uncommitted diffs in `web-livewalk`** so the owner can walk them.
**Preserve them** — a blanket `git checkout --` there destroys another lane's work.

**Read both tips late and record the exact SHAs you built from.** A landing lane may move them while you
work; if it does, say so plainly rather than implying the world is current.

**Traps this estate has paid for — none of them is hypothetical.**
**The backend tier command in the briefs is a no-op**: `dotnet test` at the `OkamAPI-modules` **root**
exits 0 having run zero tests. Run it **from `WebApi.Tests/`** with `--filter "Database!=SqlServer"` —
unfiltered it starts a Testcontainers SQL Server **per module fixture**.
**Check every tier log for an abort line above the summary**, and compare the total against the known
suite size. One run today printed `Passed! … 1017` **after** `Test host process crashed`.
**A `core` submodule failure does not look like one** on the frontend tier: suites fail with **zero tests
red**, all module-resolution, which reads as a broken branch. Pin it first —
`git submodule update --init core`, **then from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA. **Never `git submodule deinit`** — it strips the url from the shared config and
deregisters `core` for the owner. **Never `git -C core <cmd>` on an empty placeholder** — git walks up
and runs against the **parent**, which replaced one lane's entire worktree with core's tree.
`git worktree remove` refuses a Web-modules worktree because of the submodule; teardown is `rm -rf` plus
`git worktree prune` after verifying clean. The husky hook is broken, so `--no-verify` is load-bearing.
Never `pkill`, never `npm ci`/`npm install`. **Do not push.**

## Exit criteria
the API and web serving the live world are built from the current trunk tips, and one lever landed today is turned on from a screen and shown to change that module's own surface, with the walk recorded

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
Write this block to docs/plan/returns/L-THE-LIVE-WORLD-CATCHES-UP-<n>.md and hand it back:

```
RETURN: L-THE-LIVE-WORLD-CATCHES-UP
brief: 558d27c8
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

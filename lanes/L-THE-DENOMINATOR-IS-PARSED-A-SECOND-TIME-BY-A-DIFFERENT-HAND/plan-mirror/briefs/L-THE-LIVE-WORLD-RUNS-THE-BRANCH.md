<!-- GENERATED brief ffce4677 for L-THE-LIVE-WORLD-RUNS-THE-BRANCH · intent 7c84435b072ff7fe · 2026-08-06T19:09Z -->
# Brief — L-THE-LIVE-WORLD-RUNS-THE-BRANCH

export PLAN_ACTOR=agent:L-THE-LIVE-WORLD-RUNS-THE-BRANCH

## Objective
the world the owner walks is built from the trunk, not from a two-day-old binary

**This is the C5 evidence for the whole merge, and it is the only kind that counts.** Two landings will
put the work on the trunk. Nothing about that proves a person can use it, and this estate has shipped
green suites over unreachable features often enough that the rule is load-bearing rather than
decorative.

**The running world is stale in a way that has already cost a lane.** The API on **:5971** is a compiled
binary from `wt-lwtwo-api` at **8e2b57de8** — the 2026-08-04 trunk. It declares no EF trigger, so
`POST /training/stores/1/courses/{id}/versions/1/publish` answers **500** with SQL Server error **334**,
and **0 of 5 courses in store 1 carry a published version**. Publish gates assignments and completions,
which is why Training demo data is empty and why a seeding lane blocked on it.

**Port 3971 has no listener** — measured, not inferred. The owner's web dev server is not running.

**You are granted the API and the web server, and only those.** Rebuild and restart the API on :5971 and
start the web on :3971. **The containers are not yours**: `okam-lwtwo-sql` and `okam-lwtwo-redis` are up
and hold the seeded world — never stop, restart or exec into them, and never `pkill` or kill by pattern.
Resolve every kill from your own pid or from the port. `npm ci` and `npm install` are banned repo-wide:
they fail and delete a `node_modules` shared by ~124 worktrees.

**Rebuild the API with the module master flags set.** The world needed `Events__Enabled`,
`Growth__Enabled` and all four `Features__Meals__*`; without them no module master is set at all. The
connection string must be rebuilt from `test/e2e/scripts/live-world.sh:174` and **not** captured from the
environment — a word-split on `User Id=sa` took the API down for two minutes today.

**Walk it, do not assert it.** Manager `99681931`/`849666`, worker `99999999`/`123123`. Playwright is
available. One journey per module, and **record what you saw, including anything that did not work** —
a walk that finds a defect is a better result than a walk that finds none.

## Exit criteria
the API and web serving the live world are built from feature/restaurant-modules at its post-landing tip, a course version publishes without a 500, and a person walks one journey per module in a browser with the walk recorded

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
Write this block to docs/plan/returns/L-THE-LIVE-WORLD-RUNS-THE-BRANCH-<n>.md and hand it back:

```
RETURN: L-THE-LIVE-WORLD-RUNS-THE-BRANCH
brief: ffce4677
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

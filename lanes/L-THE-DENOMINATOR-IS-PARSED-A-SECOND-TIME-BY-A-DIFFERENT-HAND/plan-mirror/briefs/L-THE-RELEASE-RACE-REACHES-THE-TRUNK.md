<!-- GENERATED brief a8149c79 for L-THE-RELEASE-RACE-REACHES-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-08T15:29Z -->
# Brief — L-THE-RELEASE-RACE-REACHES-THE-TRUNK

export PLAN_ACTOR=agent:L-THE-RELEASE-RACE-REACHES-THE-TRUNK

## Objective
the last ranked defect lands, composed and proven

**Built, mutation-proven and unlanded at `lane/release-race-composed` @ `f935c8ae7`**, tier
**5001 / 0 / 11** at its own tip, composed on `668590cbe`. The trunk has since moved to **`5c46187f3`**,
which **touches none of its files**, so it recomposes cleanly — **verify that rather than trusting it.**

**What it fixes, and it is not the 500.** When two callers race to release the same Meals allocation, the
unwind's own exception replaced the original, so the bare `throw;` never ran and `CartsController` — which
catches only `AppException` — turned it into a 500. **The loser was told about the cleanup instead of about
their order.**

**The release seam is not a public route**, so the loser is never told about the release at all: they are
told **why their order failed**, and the release trouble goes to the log where it belongs.

**Inside the seam a race loser resolves to `AlreadyReleased` — success-shaped, not a refusal.** A release's
goal is *"this allocation is not held"*, so a rival achieving it means the goal is **met**, nothing is owed
and nothing should be retried. **"You may not do this at all" is a different word** — `DeniedCaptured`
(journal truth won) or `DeniedNotFound`. **Preserve that distinction**; the vocabulary already existed and
the fix routes into it rather than inventing a new outcome.

**One residue is deliberate and must survive**: after three exhausted attempts it **still throws**, because
at that point none of the three outcomes is true. That is a database that will not settle, not a race loss,
and both callers contain it.

**THE BRANCH WAS STALE IN BOTH HALVES AND A FILE CHECKOUT SILENTLY REVERTED TRUNK WORK.** It was built on
`de1e5c5e9`; the trunk gained `AuthorizePointOfSaleTenderAsync` and `ReleaseSupersededAsync` in
`32fd5a86b`. Staging with `git checkout <branch> -- <files>` took the branch's copies **wholesale** and
undid that till-settlement work — **a checkout is not a merge, and nothing about the command says so.**
The composed branch already resolves this correctly: **both conflicts wanted BOTH sides**, the trunk's
`ReleaseSupersededAsync` plus the branch's comment, and the branch's `Captured` gate plus the trunk's
`Bound` gate. **Confirm both survive your merge.**

**The branch also carried the tier's own `run-sheet.json` and `run-sheet.md` churn**, resolved to the
trunk's copies. **That churn is not part of the fix — confirm neither lands.**

**Use the atomic guard**: re-read the trunk **in the same command as the `git branch -f`** and refuse unless
it still equals your merge base. **Assert your tests by name from a `--logger trx`** — expect **+4 arms**
(3 race, 1 payment) against a 5008 baseline.

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"`; the repo root exits 0 having
run **zero** tests. **Assert `WebApi.dll`'s mtime MOVES.** **Create the worktree with `--detach`.** **Check
every branch against the open decisions before merging and say that you did.** **The canonical runner now
works inside this repo** — it anchors on the nearest `.git`. **In zsh write `${ref}:path`.** Teardown
`rm -rf` + `git worktree prune`. **Gate on `uptime` — hold below 13.** Never `pkill`. **Do not push.**

## Exit criteria
lane/release-race-composed f935c8ae7 is merged onto feature/restaurant-modules with the non-SQL tier green at the composed tip and every test accounted for, and nothing beyond it touched

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
Write this block to docs/plan/returns/L-THE-RELEASE-RACE-REACHES-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-THE-RELEASE-RACE-REACHES-THE-TRUNK
brief: a8149c79
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

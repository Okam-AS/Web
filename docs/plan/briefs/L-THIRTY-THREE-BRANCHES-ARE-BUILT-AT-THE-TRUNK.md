<!-- GENERATED brief 814bed55 for L-THIRTY-THREE-BRANCHES-ARE-BUILT-AT-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-09T00:13Z -->
# Brief — L-THIRTY-THREE-BRANCHES-ARE-BUILT-AT-THE-TRUNK

export PLAN_ACTOR=agent:L-THIRTY-THREE-BRANCHES-ARE-BUILT-AT-THE-TRUNK

## Objective
the one test that decides them, and it is a build

**A lane classified 47 local-only branches and left 33 `undecidable` — deliberately, and it named the one
test that would settle them.** A refusing diff is **the same observation** whether the trunk already holds
the change or has merely moved around it, so `git cherry` and diff-apply are not silent by disagreement;
they are **silent in the same way.**

**The deciding test is whether the branch compiles at the trunk.** Three lanes tonight found branches that
do not — **one because a method signature had gained an argument, which is exactly the shape a stale-but-
WANTED branch has and a superseded one does not.** That distinction is the lane.

**It was left undone for an honest reason, not an unwilling one**: 33 builds at one to two minutes each on
a host that spent the night above its own gate. **The cost is 33 builds — a measurement somebody can
schedule, not a judgement somebody must make.** The host is quiet now.

**Take the list from `docs/plan/artifacts/branches-still-wanted.md`** (`7b19eb3e`). **Do not re-derive the
classification** — the 13 wanted and the 1 superseded are settled; **only the 33 are yours.**

**Build, do not test.** A compile is the whole instrument here and a tier is thirty times the cost. **Say
what a build costs in wall-clock so the next reader can plan the same work.**

**Read the failure, do not just record it.** A branch that fails to build is not automatically superseded —
**say which kind of failure it is**: a signature that gained an argument (the world moved, the work is
probably still wanted), a symbol that no longer exists at all (probably superseded), a namespace or file
that moved (clerical). **A count of red branches decides nothing; the reason does.**

**Do not fix a single branch.** Not a rename, not a using, not a signature. **A branch you repair is a
branch you can no longer classify** — the failure IS the measurement.

**Carry the revert warning forward.** The single `superseded` verdict rests on `git cherry` matching by
patch-id, which **still reports a patch upstream after it was reverted** — so a branch could be the only
copy of a change the trunk no longer holds. **Run `git log --all --grep=revert` and say what you found**,
because that is the one error in this family that throws work away.

**Traps.** **Build each branch in its own detached worktree** — never check one out over another lane's
work. **Serialize the builds; do not fan out** — this host stalled for two hours on a stampede, and
`uptime` must be re-read **below 13 before each build**, not once at the start. **Never `pkill`; stop only
PIDs you started.** **Never `git add -A`** — a build dirties tracked artifacts. **Do not create, delete,
move or push any ref.** **Do not move the trunk.** Backend trunk is **`6d5328004`**.

## Exit criteria
docs/plan/artifacts/branches-built-at-the-trunk.md records, for each of the 33 undecidable branches, whether it compiles at the trunk and what the failure was, and reclassifies each as superseded or wanted with that evidence

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
class: suite · pts: 2 · workdir: ../OkamAPI-modules
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
Write this block to docs/plan/returns/L-THIRTY-THREE-BRANCHES-ARE-BUILT-AT-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-THIRTY-THREE-BRANCHES-ARE-BUILT-AT-THE-TRUNK
brief: 814bed55
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

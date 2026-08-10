<!-- GENERATED brief fec8605c for L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION · intent 7c84435b072ff7fe · 2026-08-09T15:32Z -->
# Brief — L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION

export PLAN_ACTOR=agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION

## Objective
the honest remainder, after citation was solved

**A fanout over ninety-one lanes amended forty-four exits and declined forty-seven. This lane is the
forty-seven.** They are not a citation problem — that one is solved. **Each is missing a real thing**, and
the eight declines-by-reason already recorded name which:

- **no artifact exists** — the run happened and nobody wrote it down;
- **the artifact records a GREEN run where the exit demands a RED** — the receipt convention writes a
  clean-checkout tier, while the exit turns on a mutation redding;
- **the evidence proves LESS than the exit claims** — *"on every platform"* argued from a fix's shape, with
  the run's own header reading `Host: darwin (Unix)`;
- **the evidence proves the OPPOSITE** — one lane's cited trx reads `Failed: 1` on the very assertion the
  exit says holds;
- **the exit names something not in the estate** — a `clock-state` route that exists on no branch;
- **only one half of a two-part exit is shown.**

**Read `docs/plan/artifacts/instrumentless-exits.md` first.** Your lanes' declines are recorded there with
the reason each failed, measured by an agent that read the evidence. **Do not re-derive that. Act on it.**

**What to produce depends on the reason, and you must say which you hit**:
1. **Missing write-up** → run the thing and **write the record**: which mutation, which assertion went red,
   what the message said, restored green. Then cite it.
2. **Green where a red is demanded** → **produce the red.** Apply the mutation, capture the failing run,
   restore, capture green. **A green tier is not evidence of a pin; it is evidence of a tree.**
3. **Proves less** → either **measure the missing case** or **decline again and say the exit overclaims** —
   the second is a finding, not a failure.
4. **Proves the opposite, or names what does not exist** → **do not build toward the exit.** Record it for
   an owner ruling: the exit is wrong, and this program has already learned that an exit rewritten to fit
   its evidence proves nothing.
5. **Half of a two-part exit** → produce the missing half, or name exactly which clause is unshown.

**Every artifact you write goes to `docs/plan/evidence/<LANE-ID>/`** — the durable convention. **Never a
worktree path**: nine verified lanes had to be rescued from `wt-*` today, and a citation that dies on
`git worktree prune` is not evidence a stranger can open. **`docs/plan/artifacts/` and `docs/plan/evidence/`
are both swallowed by a bare `artifacts/` ignore rule** — force-add and confirm with `git ls-files
--error-unmatch`, or your work is one `git clean` from gone.

**`plan verify` OVERWRITES the evidence line with the single path you pass**, destroying the branch, SHA and
counts the original agent recorded. **Copy the existing `evidence:` line into your artifact before you
verify**, so the detail survives somewhere a reader can reach.

**Run `plan verify` after every close and record its exact words.** **The count you cannot close is the
deliverable** — a batch that closes all eight is indistinguishable from one that read nothing.

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert by name from a `--logger trx` and carry the executed count**; a mutation
that reds nothing means your run executed nothing until a count disproves it. **Assert `WebApi.dll`'s mtime
MOVES** — a restore that preserves mtime makes `--no-build` measure the mutant. **Gate on `uptime` — hold
below 30.** **Restore `run-sheet.json` and `run-sheet.md`; never `git add -A`.** **Never name a shell
variable `path`.** **`plan.md` is written by siblings — re-read the exact `exit:` line immediately before
changing it and match by exact string.** Never `pkill`. **Do not move any trunk. Do not push.** Demo APIs on
**:5091** and **:5941** are Sven's — **do not stop either.** Backend trunk is **`6d5328004`**.

## Exit criteria
docs/plan/artifacts/forty-seven-remainder.md records, per lane in the assigned batch, whether the missing thing was produced — a committed artifact, a red-then-green mutation record, or a written finding — with plan verify's exact words for each, and states the count closed, the count that needs an owner ruling, and the count that cannot be closed without work outside this lane

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
caps in force: sql=2 suite=8 node=12 analysis=12 global=24

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
Write this block to docs/plan/returns/L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION-<n>.md and hand it back:

```
RETURN: L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION
brief: fec8605c
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

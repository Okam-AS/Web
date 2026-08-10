<!-- GENERATED brief 41d90ed1 for L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED · intent 7c84435b072ff7fe · 2026-08-07T07:54Z -->
# Brief — L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED

export PLAN_ACTOR=agent:L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED

## Objective
what of the unlanded work is real, and in what order it should land

**Measured at the landed pair, and larger than anyone has said out loud: 313 `lane/*` branches are not
ancestors of their trunk** — **111** frontend against `a63c30f`, **202** backend against `a1c1a6dff`.
Four landing waves carried twelve named branches. The rest has never been sorted.

**Most of it is almost certainly dead, and proving that is as valuable as finding the live ones.** A
prior census found **62 frontend and 112 backend** completed-lane refs whose files matched nothing in
the landing tree. **A row that says "absent, and here is the check" retires a branch permanently**; a row
that says "might be something" retires nothing.

**One is already known to be real and is the reason this lane exists.** `lane/wf-kodeoversikt-ui` at
`f4c355b` carries **four commits** and is not on the trunk — the § 8-5-6 identity-code register button,
whose absence the plan-gap reading named as Workforce's single largest gap. **If one survived four
landing waves unnoticed, others will have.**

**Four buckets, and each needs a different check:**
1. **carries-unlanded-product-work** — commits whose content is on no other ref. `git cherry` plus a
   tree probe, not a branch-name guess.
2. **patch-carried** — the change is already on the trunk under a different commit. `git patch-id` is
   the cheap answer and it retires the branch honestly.
3. **superseded** — a later lane replaced it. Say which, by ref.
4. **pre-fork-must-not-land** — anything based at `2431883d`. These **re-add a deleted credit-sale
   predicate auto-merged with no conflict marker**, buried in 313–420 conflicted files. **Never land
   these**; the earlier count was eleven and it should be re-derived, not inherited.

**Two traps, both measured, both of which have already produced a wrong answer here.**
`git grep` at a revision searches the tree at that revision, **not the object set** — a search returned
zero hits across revisions where a byte-scan of reachable objects found **133**. And
`git rev-list --objects --all` reports blobs reachable **because `--all` reads other worktrees' detached
HEADs**; under `--single-worktree` two commits turned out to be on no named ref at all.

**A prior census exists and is stale in a specific, documented way.** Read
`docs/plan/reviews/L-WHAT-THE-TRUNK-WILL-STILL-BE-MISSING.md` for method — but note its clerk-appended
correction: it misclassified the **tip of `origin/main`** as unreachable work. **Re-derive; do not
inherit its rows.**

**Order the live ones by what a person would notice**, not by commit count. The ranked flag review is the
model: a guest seeing an empty shop outranks a test-infrastructure wart whatever the line counts say.

**Read-only in both repositories.** No commit, merge, rebase, push, and **especially no branch deletion**
— a wrong classification that deletes a ref is unrecoverable, and this lane's whole output is a
classification. No suite, no container, no `pkill`. Never touch `okam-lwtwo-sql` or `okam-lwtwo-redis`,
never bind **:3971** or **:5971**.

**Rule and name. Do not edit any file** other than your review and return.

## Exit criteria
every lane/* branch not an ancestor of its trunk is classified carries-unlanded-product-work, patch-carried, superseded, or pre-fork-must-not-land — with the evidence per row, and the carries-real-work rows ordered by what a person would notice

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
class: analysis · pts: 0.5 · workdir: .
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
Write this block to docs/plan/returns/L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED-<n>.md and hand it back:

```
RETURN: L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED
brief: 41d90ed1
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

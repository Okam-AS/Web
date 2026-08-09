<!-- GENERATED brief 9bdea94d for L-TRANCHE-FIVE-REACHES-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-08T08:55Z -->
# Brief — L-TRANCHE-FIVE-REACHES-THE-TRUNK

export PLAN_ACTOR=agent:L-TRANCHE-FIVE-REACHES-THE-TRUNK

## Objective
the last tranche, and the only one that must rewrite tests to land

**This is the last tranche and the only one carrying a seam that cannot be merged away.**
`docs/plan/artifacts/landing-order.md` gives **T5 = `40ab62d` plus a pin rewrite**. Trunk is **`3807e90`**
at **182 suites / 4414 / 0**, with the `core` pin at `a6ae241`.

**The seam, measured: `40ab62d` reds nine named arms of the meals offer suite.** Five are `THE DEFECT:`
pins and **four are behaviour arms**. **The five going red is the convention working exactly as designed** —
they assert today's broken behaviour and are meant to red the day it is fixed, and `40ab62d` is that day.
**Do not delete them. Convert each to assert the corrected behaviour**, and say which you converted.

**The four behaviour arms are the ones to think about.** They are not defect pins, so a red there means the
guest-offer fix changed something those arms were asserting. **For each, decide whether the arm was wrong or
the fix is** — and if any arm turns out to be right, that is a defect in `40ab62d`, not a rewrite job.
**Say so and hold rather than rewriting an assertion to match code you have not justified.**

**`40ab62d` contains `52a93c5` and `c65b19c`** — proved by the landing plan. **`c65b19c` is already on the
trunk** via tranche one, and it is the **131-line defective runner**; the trunk now carries the **413-line**
fixed one from `316f22a`. **The merge must not regress `test/support/mutate.js` or
`test/mutation-runner-restore.test.js`.** **Assert both landed blobs are byte-identical to `316f22a`'s
afterwards** — that is this tranche's sharpest failure mode, and it will not show up as a conflict.

**Verify containment by blob identity, never by an empty `git diff`** — two absent files also diff to zero.
**In zsh write `${ref}:path`**, since `"$ref:path"` applies the `:t` tail modifier even inside double quotes
and silently reports every ref as absent.

**Measure, do not infer.** Every tranche so far predicted its endpoint by arithmetic, and measuring is what
confirmed the assumption rather than the number — most sharply in tranche three, where two branches
demonstrably shared a file and only measurement established the composition.

**Resolve every conflict at hunk level with `git merge-file`, never by side, and report each one.** **Run an
arity sweep on the final tree.** **Detach your worktree in place afterwards.**

**When this lands the landing plan is complete — say so, and name anything the plan listed that did NOT
land**, so the next reader is not left inferring it from silence.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. The
pin is now **`a6ae241`**, not `9626a561`. Pin with `git submodule update --init core`, then **from inside
`core`** fetch from `/Users/svendaneel/okam/Web-modules/core` using the **full 40-character SHA** —
the abbreviated form fails with *"couldn't find remote ref"*, which reads like a missing object rather than
a syntax error. **Neither core pin is on any remote branch; do not push either repo.** **Two silent ignore
rules** — a bare `artifacts/` and a bare `*.log`; check evidence with `git check-ignore -v`. Teardown
`rm -rf` + `git worktree prune`; `--no-verify` is load-bearing. **Do not touch `web-livewalk`.** **Gate on
`uptime` as a separate check you stop on — hold below 13.** Never `pkill`, never `npm ci`/`npm install`,
never bind **:3971**/**:5971**, never touch `okam-lwtwo-*`. **Do not push.**

## Exit criteria
40ab62d is merged onto feature/restaurant-modules together with a rewrite of the nine meals arms it reds, each rewritten arm asserting the corrected behaviour rather than being deleted, and the tier green at the composed tip

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
Write this block to docs/plan/returns/L-TRANCHE-FIVE-REACHES-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-TRANCHE-FIVE-REACHES-THE-TRUNK
brief: 9bdea94d
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

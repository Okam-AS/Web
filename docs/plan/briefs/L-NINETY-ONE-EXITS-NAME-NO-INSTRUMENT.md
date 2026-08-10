<!-- GENERATED brief d11b467a for L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT · intent 7c84435b072ff7fe · 2026-08-09T11:54Z -->
# Brief — L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT

export PLAN_ACTOR=agent:L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT

## Objective
the root cause, ruled one lane at a time

**Ninety-one built-unverified lanes have an exit that names NO instrument** — no path, no `fact:`, nothing
a tool can open. They did the work and filed a RETURN with evidence; **the exit simply never said what
would prove it.** No ruling fixes that, because there is nothing to rule on: an exit that never named its
instrument cannot be corrected by deciding where a file lives.

**This is per-lane judgement and it is the whole job.** For each lane in your batch, read three things:
its **exit**, its **RETURN** under `docs/plan/returns/`, and the **evidence that RETURN names**. Then
answer one question in one sentence: **does that evidence actually establish what the exit demands?**

**Amend ONLY where the answer is yes**, by appending `, recorded in <path>` to the exit — **never by
softening what the exit demands.** If the evidence proves something adjacent, weaker, or merely related,
**decline it.** An exit rewritten until its evidence fits is the failure this entire plan exists to
prevent, and it is available to you in one command.

**The count you DECLINE is the deliverable.** A pass that amends all twelve is indistinguishable from a
pass that read nothing. Say why each decline failed — evidence absent, evidence proves less, exit demands
a person, exit is two-part and only one half is shown.

**Run `plan verify <lane> --evidence <path>` after every amendment and record what it said**, verbatim.
An amendment you did not test is the same unproven claim in a new place. **A path resolves relative to the
plan repo**, so a backend file needs `../OkamAPI-modules/` in front of it — confirm by running the verb,
not by reasoning about it.

**Where an exit demands a browser walk or a person, decline it and say so.** Those are C5 by design and
must never be closed by a file.

**Boundaries.** You may edit **`exit:` lines inside `## Lanes` in `plan.md`, and your artifact, and your
RETURN. Nothing else** — no lane bodies, no `state:` lines, no decisions, no flags, no `evidence:` lines.
**Never `plan accept`.**

**Your batch is the JSON file named in your dispatch.** It carries the lane id, its exit and its recorded
evidence for each. **Do not touch a lane outside your batch** — seven siblings are editing the same file,
and a stray edit is how one lane's work lands in another's diff.

**Traps.** **`plan.md` is being written by siblings while you work** — re-read the exact `exit:` line
immediately before you change it, and change it by exact string match, never by line number. **Never
`git add -A`.** **Never name a shell variable `path`** — zsh ties it to `PATH`. **Do not run a build, a
tier or jest. Do not move any trunk. Do not push.** A demo API runs on **:5091** and another on **:5941**;
both are Sven's — **do not stop either.** Backend trunk is **`6d5328004`**.

## Exit criteria
docs/plan/artifacts/instrumentless-exits.md records, per lane in the assigned batch, whether its recorded evidence genuinely satisfies its exit — with the exit amended to name that evidence where it does and left untouched where it does not — and states the count amended, the count declined, and what plan verify said for each amendment

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
Write this block to docs/plan/returns/L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT-<n>.md and hand it back:

```
RETURN: L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT
brief: d11b467a
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

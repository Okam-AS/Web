<!-- GENERATED brief 56b78a95 for L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY · intent 7c84435b072ff7fe · 2026-08-09T09:46Z -->
# Brief — L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY

export PLAN_ACTOR=agent:L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY

## Objective
Sven said fix it, and the ruling turned out not to be needed

**Sven asked for this to be addressed and fixed. Reading both implementations removed the ruling it was
waiting on.** `PROOF-BENCHMARKS.md` §2.3 calls the seam inverted; **it is not.** The two services answer
**different questions**:

- **`WorkforceCompetencyProjection`** joins `WorkforceStaffMembers` → `WorkforceStaffRoles` →
  `WorkforceRoles`: **what roles and skills is this person ASSIGNED.** Roster data.
- **`TrainingCompetencyService`** reads `TrainingCompletions` where `Passed`, joined to `TrainingCourses`
  where `CompetencyKey` is non-empty, plus held certificates: **what has this person EARNED, on what
  evidence.**

**Assignment and evidence do not compete.** So **no registered Workforce type has to change and the §5
serialization protocol is not engaged.** Do not alter `IWorkforceCompetencyProjection`.

**Build the seam firing, warn-only.** At schedule validation, for the shifts in the revision, resolve each
assigned person's held Training competency keys and produce a finding. **Warn-only is the posture WB3
already ships** — it blocks nothing, and a differentiator that blocks a publish on its first outing is a
differentiator nobody keeps switched on.

**THE HONEST LIMIT, and you must carry it into the finding's wording**: `WorkforceRole` has **no
required-competency field** — `Name`, `Station`, `Color`, `SortOrder`, effectivity, and nothing else. So
**nothing can yet say "this role requires food hygiene."** `WorkforceShiftAssignment` **does** carry
`RoleId`, so the anchor exists; the requirement does not.

**Therefore do NOT invent the requirement.** Not by convention on `Role.Name`, not by parsing
`Station`, not by reusing `WorkforceStaffRole.Skills` — that is a per-person free string, which is
assignment again, not a requirement. **A convention invented here becomes the schema by accident**, and
this estate has already shipped one claim of a control that did not exist.

**What to build instead is the half that is real**: the roster can state, per staffed shift, **what
competency evidence the assigned person holds** — and flag **the absence of any evidence** where the
person holds none at all. That is a true finding, it needs no requirement declaration, and it is the read
the screen needs first.

**Batch it.** One lookup per validation run, not one per assignment — the spec's batched shape, and the
only shape a schedule screen can afford. **Say what your batch costs** for a week of shifts.

**THERE IS A THIRD CASE AND IT WAS MEASURED, NOT GUESSED: `WorkforceShiftAssignment.RoleId` is
`Guid?` — nullable.** So a staffed shift may carry **no role at all**, and the finding has three
outcomes, not two: **holds evidence**, **holds none**, and **no role to check against.**

**Do not collapse the third into the second.** *Holds none* says this person earned nothing for this
role. *No role* says **nobody asked the question.** Sven will meet both and they read differently on a
screen — reporting an unasked question as a failed one is the overclaim this lane exists to avoid.

**Say plainly in your return what a person will and will not see**, because Sven is about to walk this.
An overclaimed finding is worse here than a missing one.

**Every arm must red.** Mutate the lookup — make it return nothing, then make it return evidence for the
wrong person — and watch the arm red each time, restore, watch it green. **Name each mutation in words.**
A mutation that reds nothing means your run executed nothing until a trx count disproves it.

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert by name from a `--logger trx` and carry the executed count.** **Assert
`WebApi.dll`'s mtime MOVES.** **Gate on `uptime` — hold below 13.** **Restore `run-sheet.json` and
`run-sheet.md`; never `git add -A`.** **`git branch -f` refuses because the trunk is checked out** —
`--ff-only` after re-reading the ref in the same command. **A demo API runs on :5091 — do not stop it.**
Never `pkill`. **Do not push.** Backend trunk is **`6d5328004`**.

## Exit criteria
a schedule validation run produces a warn-only finding naming a staffed shift whose person holds no Training competency evidence, red under an applied-and-restored mutation of the lookup, named from a trx with an executed count and the non-SQL tier green at the composed tip

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
Write this block to docs/plan/returns/L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY-<n>.md and hand it back:

```
RETURN: L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY
brief: 56b78a95
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

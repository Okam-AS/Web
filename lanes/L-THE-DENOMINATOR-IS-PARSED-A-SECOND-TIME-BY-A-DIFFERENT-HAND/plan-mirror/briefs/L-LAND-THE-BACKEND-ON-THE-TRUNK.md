<!-- GENERATED brief 14d7b7c0 for L-LAND-THE-BACKEND-ON-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-06T17:58Z -->
# Brief — L-LAND-THE-BACKEND-ON-THE-TRUNK

export PLAN_ACTOR=agent:L-LAND-THE-BACKEND-ON-THE-TRUNK

## Objective
today's backend work reaches feature/restaurant-modules

**Why this lane no longer carries a `needs:` line, recorded so nobody restores it by reflex.** The clerk
added four `needs:` today to make the two pre-merge readings precede the merge. That sequencing was right
and it was achieved — but `needs:` is the wrong instrument for it, because a lane target is satisfied
**only when `accepted`**, and `accepted` is owner-only. No lane in this plan is accepted. The four
additions made this lane permanently unready rather than merely ordered.

**Every one of the five has since returned `built` and merged, and their substance is what the gate was
for**: the three backend patches were read and ruled **land-as-is** with no change required;
`lane/growthaudit-migration` was read and **composes**, parent id equal to tip id; the planned-minutes fix
landed with a red-then-green on four readers; and the trigger declarations landed with the SQL tier
restored **38F/64P to 0F/102P**. The ordering the clerk wanted has happened. Removing the line records
that, and does not dispatch past anything.


**The owner lifted the no-merge hold on 2026-08-06.** Until then every lane stopped at its own branch by
standing instruction, which is why the trunk has not moved since **2026-08-04 12:00** while roughly twenty
lanes and `integration/mig-stack-merge` (**+38 commits**) queued behind it.

**Order is not free. Each of these is measured, not cautionary.**

1. **`integration/mig-stack-merge` first** — it carries the migration stack and the only SQL tier ever run on
   this estate. Its own composition resolved a receipts file **by content**; do not re-resolve by side.
2. **Then the trigger declarations**, because *anything* updating one of the 25 trigger-bearing tables fails
   with error 334 without them — including work in the other patches.
3. **Then the rest**, each verified at the tip it lands on.

**Keep the eleven pre-fork heads out.** Branches based at `2431883d` **silently re-add a deleted credit-sale
predicate on a plain merge**, auto-merged with no conflict marker, because their base predates the predicate so
the tip's deletion has nothing to apply to. Measured over all 215 outstanding landings: 111 clean, 104 conflict,
**11 results hold two definitions**. They are named in `F-POS-TENDER-WIRE-REINTRODUCES-TWO`. **Do not land any
of them here.**

**Two more still-open numbers to respect**: `MIG-28` is contested by two branches that each authored a file, and
the next free migration number is **30**. If a merge produces two migrations sharing a parent, **stop** — that
is C2 and it has bitten this estate twice.

**Verify at the tip, not per merge.** One build, the non-SQL tier, and a SQL tier if a slot is free — and
**account for every failure**, because the composed stack's own run left exactly one known red (the outbox
count) whose lane is gated on a ruling.

**Do not push.** Landing on the trunk is authorised; publishing it is not.

## Exit criteria
feature/restaurant-modules carries the composed stack and every landed backend lane, it builds, and the non-SQL and SQL tiers at the new tip are recorded with every failure accounted for

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
class: sql · pts: 2 · workdir: ../OkamAPI-modules
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
Write this block to docs/plan/returns/L-LAND-THE-BACKEND-ON-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-LAND-THE-BACKEND-ON-THE-TRUNK
brief: 14d7b7c0
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

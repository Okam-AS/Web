<!-- GENERATED brief 587d82e5 for L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-06T21:10Z -->
# Brief — L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK

export PLAN_ACTOR=agent:L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK

## Objective
the money-and-document defects whose fixes already exist stop being one landing away

**The flag triage ranked 310 open flags by what a person would notice, and the finding underneath the
ranking is that the bottleneck is not building.** Five of the top twenty are **one landing away, not one
build away** — the work is finished, committed, and reaches no branch anybody reads.

**All five are confirmed `built-unverified` with evidence on disk.** Verify each before merging it; do
not take this list on faith.

| Flag, by rank | Lane holding the fix | What a person sees today |
|---|---|---|
| 2 · `F-NEGATIVE-SALE-REFUNDS-THE-LISTED-PRICE` | `L-CHECK-DISCOUNT-SUM-COUPLED` | **money leaves the till that never entered it** — an unstated discount builds the return at the listed price |
| 3 · `F-MIXIN-LABELS-CANNOT-TRANSLATE` | `L-MIXIN-LABELS-TRANSLATE` | three receipt labels are `switch` statements returning hardcoded Norwegian with **no lookup at all**, so no translation can reach them in any language |
| 4 · `F-RECEIPT-BLANK-PAYER-LINE` | `L-RECEIPT-PAYER-LINE-LOCATE` | five payment types print a **blank where the payer belongs** |
| 5 · `F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM` | `L-ESCPOS-COMPANYACCOUNT-LABEL` | a Norwegian fiscal receipt prints the raw enum **`CompanyAccount`** |
| 6 · `F-CLOCKOUT-ANSWERS-OPEN` | `L-CLOCKOUT-STATE-IS-NOT-OPEN` | a clock-out with no open session answers `sessionState: "Open"`, so the register **flips to "clocked in" the moment a worker presses Stemple ut** |

**One of these is only half fixed and the flag says so**: `F-CLOCKOUT-ANSWERS-OPEN` records that **only
the client side is fixed** — the wire still derives the field from `closedUtc` alone, so an absent session
and an open one stay indistinguishable. **Landing the client half alone leaves the server still lying.**
Check it, and if the server half is genuinely absent, **land what exists and say plainly what remains**
rather than letting the flag look closed.

**One is recorded as attributed-and-unverified and must be located before it is trusted.**
`F-RECEIPT-BLANK-PAYER-LINE` names a file that **does not exist on the tip** — there is no
`Services/Kassa/ReceiptService.cs`; the receipt code lives in `PosReceiptService.cs`. The finding may be
exactly right, but the path does not resolve. **Locate the site yourself before merging anything that
claims to fix it.**

**Order and safety are the same as the earlier waves and are not optional.** Resolve every conflict at
**hunk level with `git merge-file`, never by side** — `git checkout --theirs` dropped 351 translation
keys during today's frontend landing, and these lanes touch translation and receipt files, which is
exactly where that happens. Report each conflict.

**Keep the eleven pre-fork heads out.** Nothing based at `2431883d` lands here: their merges re-add a
deleted credit-sale predicate **auto-merged with no conflict marker**, hidden inside 313–420 conflicted
files. The invariant to re-run at your own final tip is
`git grep -lE 'bool +IsCreditSale *\(' -- '*.cs'` naming **only** `Services/Kassa/KassaCreditSale.cs`.

**Verify at the tips, not per merge**, against the recorded baselines: frontend **3192** tests at
`ff497c0`; backend non-SQL **4736 passed / 0 failed / 10 skipped**; SQL **694/1**, the one red being
`SchedulePublishSqlServerTests` outbox count (expected 1, actual 2), **gated on a ruling and not yours to
fix**.

**A second landing wave may still be running and may have moved both trunks.** Read both tips fresh, name
what you branched from, and if a trunk moves under you, say so rather than forcing.

**Do not push.** Record the revert for each trunk in your evidence. Cap `max server memory` in any
container you start, keyed on your own Testcontainers session id. **Never stop, restart or exec into
`okam-lwtwo-sql` or `okam-lwtwo-redis`** — they hold the owner's seeded world, and three lanes have been
walking it. **Never bind :3971 or :5971**, never `pkill`, never `npm ci`/`npm install`. Commit with
`--no-verify`.

## Exit criteria
each of the five named lanes is merged onto its trunk or refused with the reason, and both trunks build with their tiers recorded and every failure accounted for against the recorded baselines

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
class: sql · pts: 2 · workdir: .
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
Write this block to docs/plan/returns/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK
brief: 587d82e5
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

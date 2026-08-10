<!-- GENERATED brief 84c98e3d for L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-07T17:02Z -->
# Brief — L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK

export PLAN_ACTOR=agent:L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK

## Objective
three money fixes landed tonight and nobody but their lander has read them

**These are on the shared trunk, which makes this the most consequential unreviewed work in the plan.**
`feature/restaurant-modules` moved **`78ed84f` → `d4c308e`** by three cherry-picks — `d35d9dd` (a receipt
dropping a discount row), `29fe003` (two check sums handing back an invented refund), `af0e168` (an offer
subtotal presenting a partial sum as a whole one). Tier at the tip: **168 suites / 4007 / 0**.

**The lander's central claim is the one to attack, because it is the one that makes the pins worth having.**
It says each ref's pin, applied to the **unpatched** trunk, **reproduced the defect** — receipt 8/21 red,
check 13/29 red, offer 5/23 red — and that the **greens are load-bearing**: the receipt pin passes on
`Infinity`, `'Infinity'`, `true` and a numeric `valueOf` before the fix, because `Infinity > 0`. **A pin
redding on all 21 would be testing the fix, not the defect.** **Re-run that reproduction yourself** on a
tree with the components reverted, and say whether the red/green split is what they claim.

**One judgement call was made mid-lane and it is the thing most likely to be wrong.** The check pin imports
`isAmountInPlay`, which the trunk did not export, so **`utils/price.js` was applied alongside it**. The
lander argues this is behaviour-preserving *by construction* — `isAmountInPlay` is the pre-existing body of
`isDeductionInPlay`, which becomes a delegate — and that the suite's three equivalence arms stayed green
while the components were still unpatched. **Verify both halves of that argument.** If the delegate is not
exactly equivalent, the 13 reds are not attributable to the components alone and the whole reproduction
argument weakens.

**Check the dictionaries, because they were the one place conflict was predicted and none occurred.**
`pos_negative_sale_unpriceable` is claimed to have landed in `no.ts`, `en.ts` and `de.ts` **with no
duplicate key in any of the three**, across dictionaries that had moved 18 commits. **Grep each yourself**,
and check the German and English strings are real translations rather than the Norwegian copied across.

**Two claims of absence to test, since absence is what this estate keeps being wrong about.** The lander
reports **zero conflicts of either kind**, so `git merge-file` was never invoked — and separately that the
**arity sweep came back clean**. That sweep exists because a clean merge produced an uncompilable tree
earlier today. **Run it again yourself on the final tip**; a three-commit rebased stack that adds an export
and rewrites callers in four components is exactly where it recurs.

**Read-only.** No commit, merge, rebase, push or branch move. **You may run the tier and apply mutations you
restore.** **Rule and name the exact change. Do not edit any file** other than your review and return. A
clean reading is a legitimate outcome. Write to `docs/plan/reviews/L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK.md`.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. Pin
with `git submodule update --init core`, then **from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA — the plain clone genuinely lacks it. Teardown `rm -rf` + `git worktree prune`;
`--no-verify` is load-bearing. **Do not touch `web-livewalk`.** Never `pkill`, never `npm ci`/`npm install`,
never bind **:3971**/**:5971**, never touch `okam-lwtwo-*`. **Check `uptime` before any full tier — the
ceiling is 21 and it was 25 when this was authored.** **Do not push.**

## Exit criteria
a verdict on the three cherry-picks between 78ed84f and d4c308e, naming any pin that restates the fix rather than reproducing the defect, any behaviour the price.js delegate rename changed, and whether the three dictionaries carry the new key exactly once

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
Write this block to docs/plan/returns/L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK
brief: 84c98e3d
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

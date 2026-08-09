<!-- GENERATED brief f7635cb7 for L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER · intent 7c84435b072ff7fe · 2026-08-07T10:35Z -->
# Brief — L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER

export PLAN_ACTOR=agent:L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER

## Objective
the page stops promising a document it cannot produce

**C6 in its plainest form: the screen promises a record and the product cannot hand it over.**
`trn_ev_page_intro` tells a manager the record is *"slik den kan legges fram ved tilsyn"* — as it can be
presented at an inspection — and **no export of any kind exists**: no PDF, no CSV, no download
attribute, **not even a `@media print` block**. The backend serves one JSON action. A manager asked for
it on the day can show an inspector a browser tab.

**The comparison that makes this indefensible is inside this estate.** The **personalliste** — a
genuinely statutory surface — **has a print stylesheet**. The evidence page makes a comparable promise
with nothing behind it.

**It names no statute, and that restraint is deliberate — do not undo it.** `internkontroll` is banned
from the UI at `translations/no.ts:4744` until TR8/TR-B6 ships. **Adding a statute reference here would
be the exact defect this estate took off the UI on 2026-07-30.** The promise to fix is the *presentable
record*, not a legal citation.

**Two honest routes and you should pick on evidence, not ambition.** A print stylesheet is small,
matches the personalliste's precedent, and is defensible on the day. A generated file is stronger and
larger. **If the smaller one genuinely satisfies the promise, take it and say why** — this is C3-shaped
work (renderer, route, control) and a half-built export is worse than a good print view.

**Withdrawing the promise is a legitimate outcome.** If the record cannot be made presentable in this
lane, **change the sentence to what the page can actually do** and say so. A screen that overstates is
the defect; either end of the fix closes it.

**Prove it by producing the artifact.** Open the page as a person, obtain the thing, and record what came
out. A test asserting a button exists does not close this.

**Trunk is `780d405`** (tier **153 suites / 3594 / 0**). The world is the owner's: web **:3971**, API
**:5971**, manager `99681931`/`849666`. **Do not restart either server** — if the export needs a rebuild
to be visible, say so and return `blocked`. Never touch `okam-lwtwo-sql` or `okam-lwtwo-redis`, never
`pkill`, never `npm ci`/`npm install`. Commit with `--no-verify`. **Do not push.**

## Exit criteria
a person opens the training evidence page and obtains the record as a file or a printed document, shown in a browser, or the page's promise is withdrawn to match what it can actually do

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
Write this block to docs/plan/returns/L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER-<n>.md and hand it back:

```
RETURN: L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER
brief: f7635cb7
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

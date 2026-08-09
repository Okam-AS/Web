<!-- GENERATED brief ff0f38a0 for L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG · intent 7c84435b072ff7fe · 2026-08-07T17:35Z -->
# Brief — L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG

export PLAN_ACTOR=agent:L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG

## Objective
the last two untruths on the offer page

**Two defects remain on the guest-facing offer page, and one of them accuses the guest.**

**The worse one.** An offer whose `clientPhoneNumber` is absent throws a `TypeError` — and the lane that
found it measured where: **inside `acceptOffer`, before the guard**, so the page **still tells her the CODE
was wrong**. She typed it correctly. The product blames her for a field the venue never filled in, and she
has no way to know otherwise.

**The other.** A failed SMS send shows the guest **the raw English exception text thrown by core**, in
place of the localised sentence sitting beside it.

**Branch on top of `lane/offer-page-stops-telling-untruths` @ `52a93c5`**, not the trunk — it holds the
fourteen tests and the `data-test` markers this page previously lacked entirely, and say so.

**Follow the rule that lane established rather than inventing a second one.** The backend collapses **six
causes into one untyped `Error`** (expired, withdrawn, registered, accepted-over-an-hour-ago, unknown, plus
500s and network failures), so **the page must not guess a cause it cannot know.** Say what the guest can
do next; do not assert why it failed.

**A near-miss to inherit, not rediscover:** two of that lane's tests first passed for the **wrong** reason,
because `_offerProposalService` is a **computed on the global mixin** and `mocks` cannot override a
computed — the real service ran. **Assert your mock was actually used.**

**Marker-shaped assertions are near-tautologies on a page whose markers you added.** That lane's 404 test
asserted only that `[data-test="offer-load-failed"]` existed, which survived putting the expiry copy back
inside that element. **Assert the words.**

**Verify the premise at the tip before editing, and say so.** Four briefs this evening asserted something
the trunk had overtaken — three defect claims and one **test-surface** claim. If a brief names a test,
suite or coverage figure, check it exists at the ref you are on, not on a branch.

**Every change must red under a mutation you apply and restore.** Use `test/support/mutate.js` from
`lane/no-mutation-runner-can-delete` — **not** a copy from a lane directory. Two lane copies restored with
`git checkout -- <file>`, which reverts to HEAD and **deletes uncommitted work**, and one passed several
test paths as a single argv so **jest ran 0 tests, exited 0 and certified every mutation as green**. Assert
your baseline runs a non-zero test count and that each mutation run executes the same number.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. Pin
with `git submodule update --init core`, then **from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA — that commit is on **no remote branch**. **Bundle any commit you make inside
`core/` before teardown**: a submodule in a linked worktree keeps its objects under that worktree.
**`mocks` cannot override a computed** — services reached through the global mixin run for real under test,
which has already made two tests pass for the wrong reason. Trunk **`d4c308e`** = **168 / 4007 / 0**.
Teardown `rm -rf` + `git worktree prune`; `--no-verify` is load-bearing. **Do not touch `web-livewalk`.**
**Gate on `uptime` separately — hold below 13.** Never `npm ci`/`npm install`, never bind **:3971**/**:5971**.
**Do not push.**

## Exit criteria
an offer with no clientPhoneNumber and a failed SMS send each render a sentence written for a reader rather than an exception or a wrong accusation, shown by tests that red when each is reverted, and the frontend tier green at the tip

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
Write this block to docs/plan/returns/L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG-<n>.md and hand it back:

```
RETURN: L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG
brief: ff0f38a0
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

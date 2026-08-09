<!-- GENERATED brief 5fbbd40b for L-READ-TRANCHE-ONE · intent 7c84435b072ff7fe · 2026-08-07T18:22Z -->
# Brief — L-READ-TRANCHE-ONE

export PLAN_ACTOR=agent:L-READ-TRANCHE-ONE

## Objective
four branches about to reach the trunk, none read by anyone but their authors

**A proven landing order exists and tranche one is the next thing to touch the trunk.** Four branches:

| branch | at | what it changes |
|---|---|---|
| `lane/mutation-runner-cannot-delete-work` | `c65b19c` | the canonical mutation runner + its pin |
| `lane/register-stops-trusting-a-session-id` | `1c607fd` | what a till tells a worker with two employers |
| `lane/eleven-wolt-statuses…` | `32518da` | eleven labels that reached a Swiss screen in Norwegian |
| `lane/flag-corpus-remeasured` | `6026d35` | a census artifact and three adjudication packets |

**The runner is the one to read hardest, because everything else in this program now depends on it.**
It has been changed at least twice since it was written, and **three separate instrument defects were
found tonight**: restoring with `git checkout --` (reverts to HEAD, deletes uncommitted work), several test
paths passed as one argv (**0 tests, exit 0, every mutation certified green**), and a malformed anchor
(**0 tests, non-zero exit, every mutation certified red**). **Check the current version defeats all three**,
and that its own pin reds against each.

**Then attack the two behaviour changes on their own terms.**
- The register fix must still distinguish a cross-engagement clock-in that carries **another employer's**
  open session id. **Its author kept a no-id guard the corrected wire no longer needs** and argued it is
  load-bearing because client and API deploy independently — **check that argument and the mutation said to
  prove it** (removing the guard reds a *pre-existing* test whose fixture is the old server's body).
- The Wolt labels lane **read the backend write path rather than the enum** and concluded only ten of
  fifteen `WoltStatus` members can reach the column, so five deliberately get no word. **Verify that
  allowlist yourself** — if it is wrong in either direction, either an operator sees a raw enum or sees an
  invented German word for a state the API cannot send.

**The census is an artifact, not code — judge it differently.** It stopped at **7 of 384** and said so.
**Check that its three calibration verdicts are right** and that nothing in it asserts a verdict it did not
measure. A census that overclaims is worse than one that stops early.

**Finally, compose them in the plan's order and run the tier.** The landing plan records step tiers
**4007 → 4020 → 4024 → 4080** across this tranche — the endpoint is **170 / 4080 / 0**, and an earlier
transcription of this brief stopped at 4024, omitting the 56 tests and one suite `32518da` adds.
**If your numbers differ, say so** — several lanes reported
against bases that moved under them.

**Read-only.** No commit, merge to a trunk, rebase, push or branch move. You may compose in a throwaway
worktree and apply mutations you restore. **Rule and name the exact change. Do not edit any file** other
than your review and return. Write to `docs/plan/reviews/L-READ-TRANCHE-ONE.md`.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. Pin
with `git submodule update --init core`, then **from inside `core`**
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d`
and check out that SHA — that commit is on **no remote branch**. **The mutation instrument fails in both
directions**: zero tests + exit 0 is a false green, zero tests + a parse failure is a false red, and the
canonical runner **cannot judge a .NET suite at all** (its counter reads jest markers xunit never emits).
**Two silent ignore rules**: a bare `artifacts/` and a bare `*.log`. Check evidence with
`git check-ignore -v` before calling it committed. Teardown `rm -rf` + `git worktree prune`; `--no-verify`
is load-bearing. **Do not touch `web-livewalk`.** **Gate on `uptime` as a separate check you stop on — hold
below 13.** Never `pkill`, never `npm ci`/`npm install`, never bind **:3971**/**:5971**, never touch
`okam-lwtwo-*`. **Do not push.**

## Exit criteria
a verdict on the four tranche-one branches naming any change that does not do what its return claims, any test that cannot red, and whether they compose in the order the landing plan gives

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
Write this block to docs/plan/returns/L-READ-TRANCHE-ONE-<n>.md and hand it back:

```
RETURN: L-READ-TRANCHE-ONE
brief: 5fbbd40b
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

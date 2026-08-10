<!-- GENERATED brief 5554fe18 for L-EVERYTHING-REACHES-THE-BRANCH · intent 7c84435b072ff7fe · 2026-08-06T22:41Z -->
# Brief — L-EVERYTHING-REACHES-THE-BRANCH

export PLAN_ACTOR=agent:L-EVERYTHING-REACHES-THE-BRANCH

## Objective
the final landing, after which no lane work sits off the trunk

**The owner asked for the work merged and on the branch, both repositories, and this is the last wave.**
Every agent has returned. **Nothing new is being authored.** After this lands, the handoff is written
against what is actually on the trunk.

**Backend — trunk `dc0fa8508`. Counts measured at dispatch; re-read each before merging.**

| Branch | Tip | Ahead | Carries |
|---|---|---|---|
| `lane/printed-receipt-names-tender` | `bcc8bd179` | +3 | the tender table for both emitters; **already carries `lane/escpos-ladder-tender` `9990b4bb7` beneath it — do not merge that one separately** |
| `lane/a-refusal-stops-naming-the-person` | `760ab26b6` | +2 | the Meals refusal stops leaking the invitee's contact details |
| `lane/a-login-token-expires` | `b17e0dd62` | +1 | the hundred-year token becomes 30 days; SMS door metered |
| `lane/an-error-body-no-token` | `4fb9f1905` | +1 | no 500 body echoes the caller's bearer |
| `lane/a-worker-is-not-blocked-by-her-superseded-self` | `f35eb4bb8` | +1 | an award stops refusing on a dead revision's row |
| `lane/margin-setup-day` | `e0ccd1036` | +1 | effective dates resolve at end of business day, not midnight |
| `lane/poweruser-is-a-fact` | `b170a9e45` | +1 | login projects the role instead of an unwritten column |
| `lane/growth-tells-the-operator-what-actually-failed` | **`d74c2c87b`** | — | the typed Growth catches |
| `lane/the-training-screen-stops-contradicting-the-data-behind-it-be` | `3478c8b40` | — | the completions wire model |

**Frontend — trunk `0d6692d`.**

| Branch | Tip | Ahead | Carries |
|---|---|---|---|
| `lane/the-sign-in-front-door-is-honest` | `0719ec8` | +1 | deep links survive sign-in; no door on a route the shell is leaving |
| `lane/the-training-screen-stops-contradicting-the-data-behind-it` | `89f4b73` | +1 | the assignment picker reads the store, not the selection |

**Four rules that are measured, not cautionary.**

1. **The Training pair lands on both sides or neither.** Backend first — the frontend half reads `versions`
   off the course list. Landing one alone reproduces the defect in the other direction.
2. **`lane/growth-sql-catch-typed` `c7912d49f` and `lane/newsletter-dispatch-reports-its-cause` `33a99ac47`
   must NOT land.** Three branches carry that one fix and **only `d74c2c87b` applies to the current
   trunk.** Retire the other two unlanded; say that you did.
3. **Keep the pre-fork heads out.** Anything based at `2431883d` — the 380- and 387-commit branches —
   re-adds a deleted credit-sale predicate **auto-merged with no conflict marker**, buried in 313–420
   conflicted files. Re-run the invariant at your own final tip:
   `git grep -lE 'bool +IsCreditSale *\(' -- '*.cs'` must name **only** `Services/Kassa/KassaCreditSale.cs`.
4. **Resolve every conflict at hunk level with `git merge-file`, never by side, and report each one.**
   By-side resolution has destroyed content four times here. Today's third wave resolved `wolt-menu.vue`
   **to the trunk** — the lane restored an import the trunk had deliberately deleted — so the correct side
   is not always the lane's.

**Baselines to account against**: frontend jest **149 suites / 3543 tests / 0 failed**; backend non-SQL
**4759 / 0 / 10** at `dc0fa8508`, and the lanes above report **+44**, **+5**, **+2**, **+3**, **+1**,
**+5** against their own bases — expect roughly that, and **name any test you cannot account for**.

**The SQL tier is the one thing this estate has not managed all day** — three attempts, every one killed
by host pressure, so **roughly half of it has never run at any of today's tips**. The host is quiet now.
**Attempt one uninterrupted run.** If it dies again, **report it as unmeasured, never as green** — that
honesty is worth more than the number.

**Two harness traps that have each cost a wave a wrong number.** A fresh worktree leaves the `core`
submodule empty, so **15 jest suites fail to RESOLVE while jest still exits 0** — pin `core` at
`9626a561` before believing any frontend count. And a test run dirties
`artifacts/journeys/ev-dietary/run-sheet.*`; it has swept into a commit via `git add -A` once already, so
**do not use `git add -A`**.

**Do not push.** Record the revert for each trunk. Cap `max server memory` in any container you start,
keyed on your own Testcontainers session id. **Never stop, restart or exec into `okam-lwtwo-sql` or
`okam-lwtwo-redis`** — they hold the owner's live world, which is serving on **:5971** and **:3971**.
Never bind those ports, never `pkill`, never `npm ci`/`npm install`. Commit with `--no-verify`.

## Exit criteria
every branch named below is merged onto its trunk or refused with the reason, both trunks build, the frontend jest and backend non-SQL tiers are recorded at the new tips with every failure accounted for, and one uninterrupted backend SQL tier is attempted and its outcome reported honestly

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
Write this block to docs/plan/returns/L-EVERYTHING-REACHES-THE-BRANCH-<n>.md and hand it back:

```
RETURN: L-EVERYTHING-REACHES-THE-BRANCH
brief: 5554fe18
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

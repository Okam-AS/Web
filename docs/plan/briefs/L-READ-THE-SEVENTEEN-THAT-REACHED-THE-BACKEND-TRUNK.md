<!-- GENERATED brief 75042f10 for L-READ-THE-SEVENTEEN-THAT-REACHED-THE-BACKEND-TRUNK · intent 7c84435b072ff7fe · 2026-08-09T11:07Z -->
# Brief — L-READ-THE-SEVENTEEN-THAT-REACHED-THE-BACKEND-TRUNK

export PLAN_ACTOR=agent:L-READ-THE-SEVENTEEN-THAT-REACHED-THE-BACKEND-TRUNK

## Objective
four behaviour changes and nine evidence commits, unreviewed

**Seventeen commits reached the backend trunk since the last bounded review ended at `d30c1c4d4`, and
none has been read by anyone who did not write it.** The standing law is that every landed lane gets a
dedicated reviewer with fresh context before it is trusted. **These four changed behaviour:**

- **`bcfe0d893`** — the end-of-day close counts only money that arrived. **Money path.** `IsReceived`
  delegates rather than restates; credit returns net against `CreditTotal` rather than takings.
- **`e640608e5`** — a phone number stops travelling in a URL path; the gift-card transfer route is
  recomposed **around the ownership guard that landed the same day.**
- **`ada218783`** — a device push token stops travelling in a URL path, on **two** controllers.
- **`28e60e6b8`** — who cancelled an order is pinned, at a site that decides by **inequality** and
  therefore fails **open**.

**The remaining thirteen are evidence recoveries and lane commits.** Read them for one thing only:
**whether anything other than evidence rode along.** A recovery commit that touches a `.cs` file is not a
recovery.

**Reproduce, do not read.** The tier is claimed at **5108/0/11** at `28e60e6b8` — run it at
**`6d5328004`** and say whether it reproduces, **and whether the skip count is still 11.** A skip count
that moves is how a red becomes a green without anyone deciding to skip it.

**The four claims most worth falsifying, because each was made by the lane that wanted it true:**
1. the credential routes' **falsifiability clause** — putting the phone back into
   `transfer/{giftcardId}/{newReceiverPhoneNumber}` and the handle back into `registrationid/{handle}`
   **reds 4**. Re-run it.
2. the cancellation arms — **2 executed, 2 failed** under inversion, **executed count unchanged**.
   Unchanged execution is what makes it a kill rather than a void run; check that, not just the failure.
3. **`IsReceived` delegating rather than restating** — a restatement that happens to agree today is the
   defect the fix was for.
4. the gift-card recomposition **not weakening the guard** — its three properties mask one another, and
   **mutating the caller resolution alone survives**, which is a known open gap, not a regression. **Say
   whether it is still exactly that and no worse.**

**Bound your verdict explicitly.** The last review's most useful line was that it did **not** read a tip the
trunk had since moved to. **Name the range you read and refuse the rest.**

**Say what you did not read.** A verdict silent about its own coverage is worth less than a narrow one that
states it.

**Do not fix anything.** Rule and name the exact change; **edit no file.** If a landing is wrong, that is a
lane, and the reviewer who writes the fix is no longer the reviewer.

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert by name from a `--logger trx` and carry the executed count.** **Assert
`WebApi.dll`'s mtime MOVES.** **An empty `git diff` proves nothing: two absent files also diff to zero.**
**Gate on `uptime` — hold below 30, re-read before each run.** **Restore `run-sheet.json` and
`run-sheet.md`; never `git add -A`.** Never `pkill`. **Do not move any trunk. Do not push.**

## Exit criteria
docs/plan/reviews/L-READ-THE-SEVENTEEN-THAT-REACHED-THE-BACKEND-TRUNK.md gives a verdict on d30c1c4d4..6d5328004, naming any landing whose measurement does not reproduce and any behaviour a merge changed that its lane did not claim

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
class: analysis · pts: 0.5 · workdir: ../OkamAPI-modules
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
Write this block to docs/plan/returns/L-READ-THE-SEVENTEEN-THAT-REACHED-THE-BACKEND-TRUNK-<n>.md and hand it back:

```
RETURN: L-READ-THE-SEVENTEEN-THAT-REACHED-THE-BACKEND-TRUNK
brief: 75042f10
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

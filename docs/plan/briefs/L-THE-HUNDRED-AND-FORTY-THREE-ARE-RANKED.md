<!-- GENERATED brief a1971cde for L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED · intent 7c84435b072ff7fe · 2026-08-08T09:52Z -->
# Brief — L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED

export PLAN_ACTOR=agent:L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED

## Objective
a classified count is not yet a work list

**A census turned an unusable aggregate into three classes; this turns one class into a work list.** The
artifact on `lane/backend-landing-order` @ `392a2fd` records **7 superseded / 143 carrying an
un-upstreamed change / 62 unmeasurable** across the backend's unlanded branches, by `git cherry` patch
identity. **The 143 is the live one and nobody has looked inside any of them.**

**Rank by what a person would notice, not by severity recorded at authoring time.** The flag census
established that those two come apart — a guest opening a shop to an empty menu outranked every recorded
blocker about migrations and instruments. **Do the same here.** A branch fixing money, a statutory
document, or a screen a guest reaches outranks a branch improving a test harness, whatever its own commit
message claims.

**Read the diff, not the branch name.** Names in this estate are aspirational and several have already
proved stale — three lanes this program were dispatched at defects that were already fixed, because a flag
body was trusted over the tip.

**Say for each what settled it.** A row without a named instrument — the file and line, the test, the
grep — is `unreadable`, which is a legitimate class and must be **counted** rather than guessed past. The
flag census stopped at 7 of 384 rather than emit machine-generated verdicts, and that refusal is why its
seven rows are usable.

**Two things you can lean on rather than re-derive.** The `git cherry` classification is sound and was
validated against a discarded instrument (blob equality put all 217 branches in one bucket, measuring
nothing). And the trunk has moved: backend is now **`7d0450a4b`** with the money tranche landed, so some of
the 143 may have been superseded **since the census ran** — **re-check the class of anything you rank
highly** rather than inheriting it.

**Do not propose a landing order and do not land anything.** A previous census correctly separated "what
exists" from "what to do about it", and the second question is worth its own lane once this one names the
candidates.

**Write to `docs/plan/artifacts/backend-un-upstreamed-ranked.md`, force-added** past the bare `artifacts/`
rule and verified with `git ls-files --error-unmatch`. **Read-only on product code**: no commit to a trunk,
no merge, no rebase, no push, no branch move.

**Traps.** The backend tier runs **from `WebApi.Tests/`** with `--filter "Database!=SqlServer"` — at the
repo root `dotnet test` exits 0 having run **zero** tests. **The non-SQL tier rewrites TWO tracked
artifacts** — `run-sheet.json` **and** `run-sheet.md`; restore both, never `git add -A`. **An empty
`git diff` proves nothing** — two absent files also diff to zero; use **blob identity**. **In zsh write
`${ref}:path`**, since `"$ref:path"` applies the `:t` tail modifier even inside double quotes. **Two silent
ignore rules** — a bare `artifacts/` and a bare `*.log`; check with `git check-ignore -v`. Teardown
`rm -rf` + `git worktree prune`. **A worktree holding a branch turns any commit made in it into a trunk
move** — compose on a detached HEAD. **Gate on `uptime` as a separate check you stop on — hold below 13.**
Never `pkill`, never touch `okam-lwtwo-*`, never bind **:3971**/**:5971**. **Do not push.**

## Exit criteria
the 143 backend branches carrying an un-upstreamed change are ranked into what a person would notice, in a committed artifact naming for each the defect or capability it carries and the instrument that settled it, with an explicit count of any that could not be read

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
Write this block to docs/plan/returns/L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED-<n>.md and hand it back:

```
RETURN: L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED
brief: a1971cde
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

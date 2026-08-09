<!-- GENERATED brief f8b658f8 for L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-08T14:22Z -->
# Brief — L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK

export PLAN_ACTOR=agent:L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK

## Objective
the tool every lane is told to use can finally enter the backend

**Every backend mutation pass in this program was hand-rolled because the canonical runner could not enter
the backend repo.** `test/support/mutate.js` anchored by walking up to a `package.json` and threw without
one — and there is **none anywhere above the backend test projects**. The vstest dialect added specifically
to judge .NET suites was unreachable in the only repo where .NET suites live.

**The fix is built and proven at `lane/runner-finds-its-root` @ `10ace1a`**, one commit off trunk
**`9d88101`**, tier **183 suites / 4449 / 0** at its own tip, **5 of 5 mutations red**.

**What it anchors on, and why that is the hard part.** The nearest ancestor holding a **`.git` entry**,
accepting the **file** form as well as the directory — every worktree in this estate is the file form, so a
directory-only test would have re-thrown. `package.json` stays as a **second** marker checked after `.git`,
so a JS project that is not a repository still works.

**It cannot walk out of the repository, and that property must survive your merge.** The search only ever
moves **up** from the script, so every candidate is an ancestor by construction — never a computed path that
might not contain it, which is exactly what the historical `../`-counting produced when a copy at another
depth resolved paths **outside the repo**. There is **no default**: reaching the filesystem root throws.
**If your merge reintroduces a fallback, the old defect is back.**

**Two arms exist because the first real .NET run found a defect in the new dialect.** ASP.NET logs
*"Failed to determine the https port for redirect."* at host startup, and the vstest name pattern read it as
**the name of a failed test** — so a clean baseline reported one red. Counts were right so the verdict
survived, but **a phantom name present in one run and absent in another is how a false RED or a masked kill
is made.** The pattern now requires vstest's own shape — one unbroken token then a bracketed duration — with
**both directions pinned**. Confirm both arms survive.

**Do not reintroduce the containment assertion.** Its author wrote one, then **measured** that reverting to
`../`-counting reds three arms **with it and the same three without**, and deleted it. An assertion no input
can reach is decoration, and this file's subject is claims that cannot fail.

**Use the guard that worked today, not the one the clerk wrote**: **re-read the trunk at the instant of the
move and refuse unless it still equals your merge base**, with the check and the `git branch -f` in a single
command so the window is milliseconds. Reading at lane start is what let two lanes clobber each other while
both were correct when they read.

**Run the tier at the composed tip and account for every test** — the branch adds **no new suite file** and
takes the pin suite from 23 to 27 arms, so expect `+4` and say what you measure.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**; the
pin is **`a6ae241`** and `git fetch <path> <sha>` needs the **full 40-character SHA**. **Two silent ignore
rules** — a bare `artifacts/` and a bare `*.log`; check with `git check-ignore -v`. **Create the worktree
with `git worktree add --detach`.** Teardown `rm -rf` + `git worktree prune`; `--no-verify` is load-bearing.
**Do not touch `web-livewalk`.** **Check every branch against the open decisions before merging and say that
you did.** **Gate on `uptime` as a separate check you stop on — hold below 13.** Never `pkill`, never
`npm ci`/`npm install`, never bind **:3971**/**:5971**. **Do not push.**

## Exit criteria
lane/runner-finds-its-root 10ace1a is merged onto feature/restaurant-modules with the frontend tier green at the composed tip and every test accounted for, and nothing beyond it touched

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
Write this block to docs/plan/returns/L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-THE-RUNNER-ANCHOR-REACHES-THE-TRUNK
brief: f8b658f8
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

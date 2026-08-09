<!-- GENERATED brief c9794899 for L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK · intent 7c84435b072ff7fe · 2026-08-08T08:58Z -->
# Brief — L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK

export PLAN_ACTOR=agent:L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK

## Objective
three tranches landed on the shared branch and none has been read

**This is the most consequential unreviewed work in the plan, because it is already on the shared branch.**
`feature/restaurant-modules` moved **`c6c04c7` → `ee82e40` → `bb22728` → `3807e90`** in three tranches, each
landed by the same agent, **none read by anyone else**. Tier at the tip: **182 suites / 4414 / 0**.

| tranche | merged | trunk after | tier |
|---|---|---|---|
| T2 | `316f22a` (fixed mutation runner) | `c6c04c7` | 173 / 4200 / 0 |
| T3 | `8d4d1b0` then `2ce83f6` | `bb22728` | 179 / 4318 / 0 |
| T4 | core `a6ae241` + `6d43520` | `3807e90` | 182 / 4414 / 0 |

**Attack the claim each landing rests on, which is the same claim three times.** Each predicted its endpoint
by arithmetic resting on an **assumption of disjoint file sets**, then measured and found agreement. **The
agreement is not the evidence — the measurement is**, and only where the sets genuinely overlap does it
prove anything. **T3 is the one where it matters**: `8d4d1b0` and `2ce83f6` demonstrably **share
`pages/admin/workforce-timesheets.vue`**, git auto-merged it with no conflict, and the landing lane claims
it read the merged file and found **both intents surviving in their own regions** — `2ce83f6`'s refusal
routing through `contextRefusalKey`, and `8d4d1b0`'s `exportEnabled` still returning `null` when unread with
the template gating on `=== false`. **Read that file yourself. A merge that took either side wholesale
would have destroyed one silently, and a green tier would not have said so.**

**T4 moved the submodule pin and no other tranche has.** `core` `9626a561` → `a6ae241`. The lane argues the
move is **load-bearing**, measured both directions: `hasBackendMessage` appears **0** times in
`core/services/request-service.ts` at the old pin and **1** at the new, and the app reads it in **4** places
— so the frontend half against the old pin would read a field core never writes, **green in jest because
those tests construct the error object themselves, and wrong in a browser.** **Verify that count and that
claim.** Also confirm the committed gitlink and `git -C core rev-parse HEAD` agree at `a6ae241`.

**Check the deliberate red actually went green by code.** `aff616d` carried one deliberate failing test and
`8d4d1b0` is meant to turn it green **by changing the page, not the assertion**. The lane proved this by
`numstat` — **59 added / 0 removed** in `test/workforce-timesheets-page.test.js`. **Reproduce that**, since
zero deletions is the whole argument.

**One thing was knowingly led and you should rule on whether that was right.** `2ce83f6`'s backend half
(`8357c8a33`) is **not** on the backend trunk. The lane checked `WorkforceErrorCodes.cs:56` itself and found
`workforce.module-disabled` already there and documented on `IWorkforceModuleGate`, concluding the contract
landed long ago and the unlanded half is **a demo seed script and its test, no production code** — so the
only consequence is **demo-world divergence**. **Verify that, because if any production code rides in that
branch the trunk is promising something the backend does not deliver.**

**Read-only.** No commit, merge, rebase, push or branch move. You may compose in a throwaway worktree and
apply mutations you restore. **Rule and name the exact change. Do not edit any file** other than your review
and return. A clean reading is a legitimate outcome. Write to
`docs/plan/reviews/L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK.md`.

**Traps.** **A `core` submodule failure does not look like one**: suites fail with **zero tests red**. **The
pin is `a6ae241`, not `9626a561`**, and `git fetch <path> <sha>` needs the **full 40-character SHA** — the
abbreviated form fails with *"couldn't find remote ref"*, which reads like a missing object rather than a
syntax error. **Neither core pin is on any remote branch; do not push either repo.** **An empty `git diff`
proves nothing** — two absent files also diff to zero; use **blob identity**. **In zsh write `${ref}:path`**,
not `"$ref:path"`, which applies the `:t` tail modifier even inside double quotes. **Two silent ignore
rules** — a bare `artifacts/` and a bare `*.log`; check with `git check-ignore -v`. Teardown `rm -rf` +
`git worktree prune`. **Do not touch `web-livewalk`.** **Gate on `uptime` as a separate check you stop on —
hold below 13.** Never `pkill`, never `npm ci`/`npm install`, never bind **:3971**/**:5971**. **Do not push.**

## Exit criteria
a verdict on the trunk from c6c04c7 to 3807e90, naming any landing whose composed tier does not reproduce, any intent a merge silently destroyed, and whether the submodule pin move is sound

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
Write this block to docs/plan/returns/L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK-<n>.md and hand it back:

```
RETURN: L-READ-THE-THREE-TRANCHES-ON-THE-TRUNK
brief: c9794899
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

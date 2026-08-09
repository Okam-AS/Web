<!-- GENERATED brief cdb4f07b for L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED · intent 7c84435b072ff7fe · 2026-08-08T21:27Z -->
# Brief — L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED

export PLAN_ACTOR=agent:L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED

## Objective
the same defect one surface over, and this one is live

**The X/Z report was fixed today. The end-of-day close has the identical defect and nobody has touched it.**
`EodService` buckets `PaymentType.CompanyAccount` into its **`default` arm**, so **the close counts a credit
sale the register never received as takings and prints it under "Annet"**. `EodSummaryModel` carries
`CashTotal`, `CardTotal`, `OtherTotal` — and **no credit bucket**.

**Reachability was closed by measurement, not inferred**, so this is live rather than theoretical:
`PosSettlementService:445` writes the `CompanyAccount` `OrderPayment` → `FinalizeService:224` copies it into
a `JournalPaymentLine` → `EodService.ProjectPaymentTotalsAsync` sums it into `other`.

**Write it against the rule that already exists.** The trunk carries `PaymentMeansTotal.IsReceived`,
computed from `PaymentType`, landed as the X/Z fix — **one rule every reader shares**. Use it. **Do not
introduce a second definition of what "received" means**; a duplicate rule is how the X/Z and the close came
to disagree in the first place.

**Follow the X/Z's answer on presentation unless you can say why not.** That fix **distinguishes rather
than excludes** — company-account totals leave the received total and are stated under their own heading —
because a venue whose takings merely shrank would conclude the till is wrong. **Say what the close prints
and why**, and whether a zero-credit close states the zero or omits the section. **That second question is
live and unruled**: an unlandable sibling branch argued *"an absent section is not a statement"* while the
trunk argues *"its absence means there were none"*, and both wrote their reasoning in comments. **If your
change forces that question, name it and do not settle it by fiat.**

**Do not replay `lane/eod-credit-split`.** It is one of three branches that touch the files the X/Z split
landed into, and `git cherry` calls it live because its patch is not upstream — **true and misleading**.
A sibling proved the related branch **cannot even compile** at the trunk. **Recompose against the trunk or
write it fresh; either is fine, replaying is not.**

**Reproduce before you fix.** Show the close counting a company-account sale as takings, then show it not.
**The before arm is the evidence that this was live**, and this program has been burned four times by
premises that had moved.

**If it lands, use the atomic guard**: re-read the trunk **in the same command** as the `git branch -f`.
**Worktree with `--detach`.**

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert your tests BY NAME from a `--logger trx`** — a console log names only
failed and skipped tests, and a sibling nearly reported five tests absent because its extraction filtered on
a file's **first** class name while they lived in a second class in the same file. **Assert `WebApi.dll`'s
mtime MOVES.** **The tier rewrites TWO tracked artifacts** — `run-sheet.json` and `run-sheet.md`. **Check
every branch against the open decisions before merging and say that you did** —
`D-MEALS-CREDIT-ACCOUNT` gates a Tripletex receivable **column and its migration**, not this presentation,
so read it before assuming either way. **In zsh write `${ref}:path`.** **Gate on `uptime` — hold below 13.**
Never `pkill`. **Do not push.**

## Exit criteria
no end-of-day close counts a company-account sale as received, shown by a test that reds when CompanyAccount falls into the default bucket, with the non-SQL tier green at the composed tip

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
class: node · pts: 1 · workdir: ../OkamAPI-modules
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
Write this block to docs/plan/returns/L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED-<n>.md and hand it back:

```
RETURN: L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED
brief: cdb4f07b
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

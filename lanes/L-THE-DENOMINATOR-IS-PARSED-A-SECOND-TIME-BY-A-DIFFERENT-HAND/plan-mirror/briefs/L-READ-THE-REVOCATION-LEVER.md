<!-- GENERATED brief 6683a83d for L-READ-THE-REVOCATION-LEVER · intent 7c84435b072ff7fe · 2026-08-07T16:34Z -->
# Brief — L-READ-THE-REVOCATION-LEVER

export PLAN_ACTOR=agent:L-READ-THE-REVOCATION-LEVER

## Objective
a security check was switched off and someone else has to agree it was the right one

**This lane weakened a certificate check to unblock mail, and that is a trade worth a second reader.**
`lane/mail-revocation-lever` @ **`69e6ca8af`** off backend trunk `81d06c10a`. It is the fix for all
fourteen `IEmailService` callers, so if it is wrong it is wrong everywhere at once.

**The load-bearing claim is a language detail, and language details are where this fails.** The lane
says `AppSettings:SmtpCheckCertificateRevocation` is a **`bool?`** where **unset means true**, and that
a plain `bool` would have read `false` from a missing key and **silently disabled revocation checking
estate-wide with no diff to review**. That reasoning is correct in the abstract. **Prove it holds through
the actual binding path this codebase uses** — `IConfiguration` binding, `Configure<>`, options
validation, whatever it really is. **Three cases the claim must survive**: the key **absent**; the key
present but an **empty string**; the key present as the string `"false"` in a different casing. If any
of those lands on `false` when the author expects `true`, that is the finding.

**Then ask what was relaxed besides revocation.** The lane asserts **no `ServerCertificateValidationCallback`
is added on any path in any environment**, and offers the absence as proof. **Grep for it yourself
across the whole backend, not just the diff** — the strength of that claim is exactly its scope, and
scope claims are the easiest to overstate.

**Name the consequence in plain words, because nobody has.** With the switch on, **what happens if the
provider's certificate is genuinely revoked?** The lane's own evidence says the chain's only fault is
`RevocationStatusUnknown` — a host that cannot *reach* the revocation endpoint. **A host that cannot ask
and a certificate that has been withdrawn are indistinguishable once the check is off.** Say whether the
resulting exposure is acceptable and for whom, or say it is not.

**Check the refactor did not change behaviour it was not meant to.** `MailKitSmtpTransport` was moved
**out of `EmailService` into its own file**. Compare old and new for timeout, disposal, authentication
order, and `Connect` overload — **a move is where a silently dropped `using` hides**.

**`appsettings.json` was edited, so check C7 before anything else.** This estate has **live credentials
committed in `appsettings.json` already** — a JWT signing key at line 12 is a known open finding.
**Confirm this diff adds no secret, and that the new Warning-level log line announcing a relaxed
handshake prints no host, credential or connection string.**

**Two flags it narrowed rather than closed — check the narrowing is honest.**
`F-EVERY-MAIL-DIES-AT-A-REVOCATION-CHECK-THIS-HOST-CANNOT-COMPLETE` still needs the key set **plus a
process restart** on each host; `F-A-SUCCESSFUL-SEND-PRINTS-NOTHING` is confirmed at
`appsettings.json:196-202`. **Neither should be clearable by this branch alone. Say so if you agree.**

**Production was explicitly not measured, and the lane says so — do not treat that as a gap to fill.**
It named a no-deploy read: App Insights for `EmailService.cs:197` carrying `SslHandshakeException`
with *"after 0 sent"*. **Judge whether that query would actually distinguish this defect from an
unrelated TLS failure**, since that is what someone will run tomorrow.

**Read-only.** No commit, merge, rebase, push or branch move. **You may run the lane's suite and its
probe, and apply mutations you restore.** **Rule and name the exact change. Do not edit any file** other
than your review and return. A clean reading is a legitimate outcome.

**Traps this estate has paid for.** The backend tier must run **from `WebApi.Tests/`** with
`--filter "Database!=SqlServer"` — at the repo root `dotnet test` exits 0 having run **zero** tests, and
unfiltered it starts a container per module fixture. **Check every tier log for an abort line above the
summary.** Trunk baseline is **4937 / 0 / 10**; the lane claims **4943 / 0 / 10**. **A stale build can
fake a mutation result** — the lane defeated that with `cp` + `touch`; do the same. Teardown is `rm -rf`
plus `git worktree prune`; `--no-verify` is load-bearing. Never `pkill`, never touch the `okam-lwtwo-*`
containers, never bind **:3971**/**:5971**. **Do not push.**

## Exit criteria
a verdict on lane/mail-revocation-lever 69e6ca8af, naming whether unset truly binds to true through the real configuration path, whether anything other than revocation was relaxed, and what a revoked provider certificate would now do

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
Write this block to docs/plan/returns/L-READ-THE-REVOCATION-LEVER-<n>.md and hand it back:

```
RETURN: L-READ-THE-REVOCATION-LEVER
brief: 6683a83d
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

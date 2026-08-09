<!-- GENERATED brief 914196bc for L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH · intent 7c84435b072ff7fe · 2026-08-08T21:32Z -->
# Brief — L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH

export PLAN_ACTOR=agent:L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH

## Objective
redaction cannot reach a URL, and two of them carry a customer's identity

**A URL is seen by every reverse proxy, load balancer and access log between the caller and the process,
and sink-level redaction never reaches it — because no log statement is involved.** Two routes carry a
credential there.

1. **A customer's phone number in a URL path.** A fix exists unlanded at `lane/phone-in-path`
   @ `a60da359b`.
2. **An APNS/FCM device token — a push credential — in a URL path**, recorded as the request name. A fix
   exists unlanded at `lane/push-token-in-path` @ `363d3f7fa`.

**The objective names Datatilsynet explicitly**, and a phone number is personal data that this product is
scattering into infrastructure it does not own. **These were ranked first and second of six by a census that
read the diffs**, above defects touching money.

**Reproduce both at the trunk before trusting either branch.** Five lanes today were dispatched at premises
that had moved; one found two of three suites already landed when a brief said all three were absent.
**`git cherry` calls a branch live when its patch is not upstream — true and misleading if the ground moved.**

**`lane/phone-in-path` and `lane/route-guard-gaps` were measured byte-identical on their product diff**, so
they are one change carried twice. **Do not land both.** And both **rewrite `TransferGiftcard`** — the
method that received the ownership guard, the shared `GiftcardNotFound` refusal and the caller-resolution
today. **Recompose against the trunk; a replay would undo that.** If the recomposed result touches the
authorization guard at all, **stop and say so** — that guard's three properties each mask the others and
breaking one silently reopens an id oracle.

**Say where the credential goes instead, and why that is better rather than merely different.** A body, a
header and a claim are not equivalent: a body is not logged by default but is still readable by a proxy
terminating TLS; a claim binds the value to the caller rather than to the request. **Name the choice.**

**One thing to check that neither branch may have**: whether the value is *also* still reaching a log by
another route. Closing the URL while a log statement still prints it moves the exposure rather than ending
it — **grep for the field name across log sites and say what you found.**

**Land them one at a time.** Two backend landings ran concurrently today and clobbered each other; one merge
ended up reachable from no ref. **Use the atomic guard**: re-read the trunk **in the same command** as the
`git branch -f` and refuse unless it still equals your merge base. **Worktree with `--detach`.**

**Traps.** Tier from **`WebApi.Tests/`** with `--filter "Database!=SqlServer"` — the repo root exits 0
having run **zero** tests. **Assert your tests by NAME from a `--logger trx`.** **Assert `WebApi.dll`'s
mtime MOVES.** **The tier rewrites TWO tracked artifacts** — `run-sheet.json` and `run-sheet.md`; restore
both, never `git add -A`. **Scan any evidence you commit for secrets and read it rather than trusting a
pattern's silence** — this lane is about credentials, so an artifact quoting a real token would be the
defect in a new place. **Check every branch against the open decisions before merging and say that you
did.** **In zsh write `${ref}:path`.** **Gate on `uptime` — hold below 13.** Never `pkill`. **Do not push.**

---

**MEASURED 2026-08-08 by the first attempt, which stopped where it was told. Do not re-derive any of this.**

**Both defects reproduce at the trunk `d30c1c4d4`.** `GiftcardController.cs:245` is
`[HttpPost("transfer/{giftcardId}/{newReceiverPhoneNumber}")]`. **And the push credential is in the path on
TWO controllers, not one** — `ConsumerNotificationController.cs:31` and `StoreNotificationController.cs:54`,
both `HttpGet {handle}`. **Anyone fixing "the" route fixes half of it.**

**`lane/phone-in-path` conflicts with the gift-card ownership guard that landed today, and the conflict is
the guard itself.** The branch calls the **two-argument** `TransferGiftcard(giftcardId, phone)` — no caller,
no ownership check — so **taking it whole would delete the guard.** It **fails the build rather than
compiling**, because `callerUserId` was *appended* rather than inserted at the estate's actor-second
position: two adjacent strings would otherwise have swapped silently.

**The recomposition, written out and not yet done:**

> keep `[HttpPost("transfer/{giftcardId}")]` with `[FromBody] GiftcardTransferModel` from the branch; keep
> the `ActorClaims` resolution and the shared `GiftcardNotFound` refusal from the trunk; call
> `TransferGiftcard(giftcardId, model?.NewReceiverPhoneNumber, callerUserId)`.

**That touches the guard's call site, so it needs its own tier and a mutation pass over the CALLER
RESOLUTION specifically** — not only a combined mutation. The guard's three properties mask one another, as
two survivors and a combined mutation showed, so **a resolution that looks right is exactly what reopens an
id oracle quietly.**

**Where the credential goes, settled with a reason rather than a preference: the BODY, on asymmetric
recording rather than secrecy.** A proxy terminating TLS can read a body, so a body is **not confidential** —
but a URL is **recorded** by every proxy, load balancer and access log as a matter of routine, with no log
statement involved, which is why redaction cannot reach it. A claim would bind a value to the caller and be
stronger for identity, **but the receiver's phone number is not the caller's identity**, so a claim cannot
carry it.

**No other route to a log was found, and the check is stated as non-exhaustive**: no log statement names the
phone field or the push handle; the gift-card sites are generic `LogWarning(ex, ex.Message)` and would carry
a value only if an exception message embedded one.

## Exit criteria
no route carries a phone number or a device token in its path, shown by tests that red when either is placed there, with the non-SQL tier green at the composed tip

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
Write this block to docs/plan/returns/L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH-<n>.md and hand it back:

```
RETURN: L-NO-CREDENTIAL-TRAVELS-IN-A-URL-PATH
brief: 914196bc
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

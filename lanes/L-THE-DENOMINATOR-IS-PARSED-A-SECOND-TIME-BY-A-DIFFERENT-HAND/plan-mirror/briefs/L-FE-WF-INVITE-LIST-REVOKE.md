<!-- GENERATED brief 2e402df7 for L-FE-WF-INVITE-LIST-REVOKE · intent 7c84435b072ff7fe · 2026-08-04T20:34Z -->
# Brief — L-FE-WF-INVITE-LIST-REVOKE

export PLAN_ACTOR=agent:L-FE-WF-INVITE-LIST-REVOKE

## Objective
the roster panel stops saying the routes do not exist

**Filed by `L-WF-INVITE-LIST-REVOKE`, which built the backend and then found the frontend half carries a
statement its own commit makes false.** The panel binds **issue only**, and its on-screen copy — in **three
locales** — says literally *"the API has no such routes"*. **Two frontend tests actively pin that
sentence.** So the moment the backend lands, the product asserts on screen something that is no longer true,
and a test guards the falsehood.

**That is why this is urgent rather than cosmetic**: it is the same shape this program has removed four
times today — a screen naming a control's absence, or a comment asserting a control, that the code
contradicts. Here the direction is reversed and the effect is the same.

**The lane did not wire it, and stopping was correct.** `translations/{en,no,de}.ts` and
`test/e2e/fixture/api-server.js` were held dirty by another lane in a shared checkout carrying **204
uncommitted files**; editing them would have corrupted that lane's work or guaranteed a four-file conflict.
**Never bulk-edit those three translation files** — a conflict resolved that way once shipped the app with
no client bundle. Add keys surgically as pure additions, built against the committed blob.

**Invert the two pinning tests rather than deleting them.** A test asserting a defect is worth keeping in
inverted form — four such were found this session — so they should end up asserting the routes *do* exist.

**Two backend behaviours the surface must not flatten**, both established by the lane that built them:

- **A stored `Pending` does not mean live.** `Expired` is written by no code path; expiry is a **read-time
  `ExpiresAtUtc` comparison**, so a code that lapsed a month ago still reads `Pending` in the row. **A list
  that reports the stored state would tell a manager a dead code is live** — the question answered
  backwards while looking correct. Use the derived `isLive`, computed by the same comparison the claim path
  makes.
- **Revoking an already-claimed code is a 409, not a success.** A manager revokes because the code went to
  the wrong person; a 200 there would say *safe* at the exact moment they are not.

**Do not make the refusal informative.** A revoked code must stay indistinguishable from an invalid one —
the backend keeps that **structurally**, by never adding a revoked branch to the claim path, and the pin
compares status, title, detail, type **and the full extension member list** so a later "better error
message" cannot slip a discriminating field in beside a matching code.

**C7: never render or log a token.** A manager needs to know *that* a code is live and to whom it went,
never what it is.



**Built at `e8d69fc` — and its RETURN cannot be merged, because the placeholder defect cost this one an
author.** The return was refused for a single line, `needs: -`. When the clerk went to ask the lane to
delete it, **the agent's transcript was gone and it could not be resumed.**

**The work itself is safe and verified**: `lane/fe-wf-invite-list-revoke` resolves to `e8d69fc`,
*"Workforce: the roster panel stops saying the routes do not exist"*. Nothing is lost. What is missing is
the plan's record of it.

**The clerk did not hand-edit the return, and will not.** A RETURN is the audit chain; editing one to make
it merge is the failure the rule exists to prevent, and the rule does not stop applying because the author
became unreachable. **So the lane stays `running` and this note is the honest record until Sven rules
whether the clerk should accept it.**

**This is the concrete cost of `F-NEEDS-PLACEHOLDER-REFUSES-A-GOOD-RETURN`**, and the fourth instance was
already the one that defeated the prose fix — this lane's brief carried an **explicit warning** about that
exact trap and it was filled anyway. Now it has also produced an unrecordable lane.

**What was actually built, so the record is not only about the refusal.** The panel lists outstanding
invitation codes and withdraws one. **Both pinning tests were inverted rather than deleted**, and the unit
test is scoped to the `wfr_*` namespace **because a copy edit that missed one locale would otherwise
pass**. `wfr_access_no_list` was **deleted rather than reworded** — a key whose name lies is the next
lane's trap.

**The defect it found is the one only a render could show.** Run 1 **passed** while the screen said two
incompatible things — a refusal band reading *"somebody signed in with this code"* directly above a panel
still reading *"no login is attached yet"*. **Every assertion passed.**

**Merge dependency:** this branch needs `lane/wf-invite-list-revoke @ 68f2472c` to land first, or the
frontend calls two routes no deployed API serves.

## Exit criteria
a manager lists live invitations and revokes one from the roster panel, and no locale still claims the API has no such routes, driven through the page by a browser journey recorded in lanes/L-FE-WF-INVITE-LIST-REVOKE/evidence.md

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
class: node · pts: 1 · workdir: lanes/L-FE-WF-INVITE-LIST-REVOKE/
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
Write this block to docs/plan/returns/L-FE-WF-INVITE-LIST-REVOKE-<n>.md and hand it back:

```
RETURN: L-FE-WF-INVITE-LIST-REVOKE
brief: 2e402df7
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

<!-- GENERATED brief 993881c3 for L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE · intent 7c84435b072ff7fe · 2026-08-08T16:03Z -->
# Brief — L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE

export PLAN_ACTOR=agent:L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE

## Objective
the proof is on disk and the exit never mentions it

**This is the single cheapest half of the verification backlog and it is a wording defect, not missing
work.** A measurement pass ran `plan verify` against all 469 built-unverified lanes and found **221 refused
as exit-not-met — of which 206 say only that the exit criterion does not name the evidence, and the artifact
is present on disk for all 206.** The proof exists. The exit never mentions the file that discharges it.

**Read `docs/plan/artifacts/why-verification-is-refused.md` first**; it carries the per-lane verdicts and
the raw tool output under `lanes/L-WHY-469/`. **Do not re-derive the classification** — it cost a full lane
and the tool's own words are recorded.

**The act is one line per lane, and the discipline is that the exit must name the artifact that ALREADY
proves it — never the other way round.** You are not choosing new evidence, weakening a criterion, or
describing what a lane wishes it had shown. **If an exit and its artifact genuinely disagree, that lane is
NOT in this class — leave it refused and count it.** The whole value of this pass is that it changes
wording where the evidence was always sufficient.

**Run `plan verify` after each edit and let the tool decide.** A lane you edit that the tool still refuses
is a finding, not a failure — **report the count it accepts and the count it still refuses**, and name any
lane whose refusal reason *changed* rather than clearing, because that means the edit moved the problem
rather than solving it.

**Two things you may not do.** **Never `--override`** — an override here would convert a measurable backlog
into a claimed one, which is the exact failure this program has spent the day avoiding. **Never
`plan accept`**; it is owner-only and the tool refuses you. **Do not touch the 86 genuinely-destroyed
lanes** — those need work redone and are somebody else's problem.

**Why this matters beyond the number.** The objective requires every capability be *"named in an artifact a
stranger can open"*. For these 206 the artifact exists and a stranger could open it — **the plan simply
does not say so**, which means the estate has been under-reporting its own evidence. Fixing that is not
bookkeeping; it is making a true claim checkable.

**Traps.** `plan verify` exits **6** on inadmissible evidence — that is information, not an error. Edit
**only** the `exit:` line of a lane block; **L3 forbids rephrasing or compressing anyone's prose**, and the
body around it is authored text. **In zsh write `${ref}:path`.** **Two silent ignore rules** — a bare
`artifacts/` and a bare `*.log`. Do not touch `web-livewalk`. **Gate on `uptime` — hold below 13.**
**Do not push.**

## Exit criteria
every lane whose exit criterion does not name its own on-disk artifact has that artifact named in the exit, shown by plan verify accepting the lane against its recorded evidence, with the count accepted and the count still refused both stated

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
Write this block to docs/plan/returns/L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE-<n>.md and hand it back:

```
RETURN: L-TWO-HUNDRED-AND-SIX-EXITS-NAME-THEIR-OWN-EVIDENCE
brief: 993881c3
verdict: built | fail-spec | blocked | aborted
evidence: <path or fact:key>        # required for built
spec_gap: <brief sentence, contradicted by what observation>  # required for fail-spec
needs: +<ID>                        # required for blocked
reason: <what stopped>              # required for aborted
log: <≤15 lines>
END RETURN
```

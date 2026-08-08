# L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO — the lever, and why it is not the one that must stay host-only

Actor `agent:L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO` · brief `a78245b2` · 2026-08-07

Branched from backend trunk **`9fb057d00`** (`lane/events-dispatch-store-lever-redo`, worktree
`/Users/svendaneel/okam/wt-evdisp-redo`) and frontend trunk **`00d84d7`**
(`lane/events-dispatch-store-lever-redo-fe`, worktree `/Users/svendaneel/okam/web-evdisp-redo`).
Both tips read fresh at start. No server started, stopped or restarted; no `okam-lwtwo-*` container
touched; nothing pushed.

---

## 1. The question the brief poses, answered

**`Events:DispatchEnabled` does not have a `Growth:Enabled`-shaped reason, and the lever is the work.**

`Growth:Enabled`'s reason is mechanical and specific: **the switch arms a startup fail-fast.** Outside
Development the host refuses to boot unless `Growth:RootSecret` is provisioned, because deriving live
Growth crypto from the JWT signing secret would let a routine JWT rotation sever GDPR §13.4 suppression
retention. A per-store row cannot re-run a check that only runs at startup — the process is already past
it — so a row that could open Growth would route live guest addresses over the dev fallback root.

`Events:DispatchEnabled` arms **no check of any kind**. Measured at trunk, it is read in exactly one
place: `EventsNotificationDrainService.DrainPendingAsync`, inside the poll loop, at the moment of each
pass. There is no startup validation, no provisioning precondition, and nothing whose safety depends on
the value having been fixed before boot.

Three further facts decide it:

1. **Its own settings doc names the model, and the model is per-store.** `EventsSettings.DispatchEnabled`
   says it mirrors "Workforce's `workforce.dispatch` flag". `workforce.dispatch` is a **catalogue flag**
   (`WorkforceFeatureFlags.Declared`: `new FeatureFlagDescriptor(Dispatch, "Workforce", "Dispatch", false)`)
   with an operator lever and **no config key above it at all**. Events built the host half of a
   comparison whose other half was already per-store.
2. **The estate has ratified store-row-over-config twice.** `MarginModuleGate.Resolve` is
   `override ?? configDefault`; `StoreBackedMealsFeatureFlags` gives the row precedence over the
   `Features:Meals` gate. Both are the corrections the predecessor walk recorded in
   `L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN/evidence.md`.
3. **The per-store switch is strictly NARROWER than the one it joins.** `Events:DispatchEnabled` is
   process-wide: setting it releases every store's queue at once. `Events.Dispatch` releases one store's,
   and the write is gated by `IStoreAdminAccess` (a StoreAdmin of that store, or a PowerUser).

### The one argument that had to be weighed and rejected on its own terms

A predecessor draft of this lane (uncommitted, `/Users/svendaneel/okam/wt-events-dispatch`) kept the flag
ANDed **under** the host key, on the reasoning that `Events:DispatchEnabled` is "the only thing separating
a deployment permitted to mail guest addresses from one that is not", since Events delivers over the
platform `IEmailService` (MailKit SMTP) and has no fake transport the way Growth has
`Growth:MailProvider = "Fake"`.

That reasoning is **refuted by the same codebase**: the platform SMTP transport is already reachable from
paths carrying no such host gate (order and end-of-day receipts, invoices, Workforce dispatch). What
decides whether a deployment may mail is `AppSettings.SmtpHost` / `SmtpFromPassword`, not this key. A
staging host that must not mail must not hold the SMTP credential — `Events:DispatchEnabled` never
provided that property and removing it as the sole switch takes nothing away.

It is also **self-defeating for this lane**: under that design the ten queued links still wait on the
launch-line variable, which is the objective restated as a failure.

**Where the concern does belong** is a disclosure at the click, which is the estate's own mechanism for
exactly this (`FLAG_PRECONDITIONS`, already carrying `Events.Deposits`). Section 3 below.

---

## 2. What was built

### Backend (`lane/events-dispatch-store-lever-redo`, 2 commits off `9fb057d00`)

| | |
|---|---|
| `EventsFeatureFlags.Dispatch` | `"Events.Dispatch"`, advertised deny-closed in `Describe()` — so it is in the shared catalogue, drawn on `/admin/feature-flags`, and admitted by `PUT /stores/{id}/feature-flags` |
| `StoreBackedEventsFeatureFlagStore` | for this one key, an absent row falls back to the fleet `Events:DispatchEnabled` instead of hard `false`. Core/Deposits/Settlement stay deny-closed — they decide whether a store may CREATE obligations, and no fleet value may grant that |
| `EventsNotificationDrainService` | the global early-return on the config key is **gone**; the switch is resolved per store through `IEventsModuleGate` |
| `EventsNotificationHealthService` | `DispatchEnabled` answers for **the store** through the same gate call, not the fleet config key |
| `EventsDispatchFlagEffectiveResolver` | registered `IStoreFeatureFlagEffectiveResolver`; calls the gate rather than recomputing, so it cannot drift from what the queue obeys |

**One decision function, three callers.** The drain, the health read and the resolver all call
`IEventsModuleGate.IsStoreFlagEnabledAsync(storeId, Events.Dispatch)`. Effective value is
`Events:Enabled AND (row ?? Events:DispatchEnabled)`. A dark module is still never refined on.

**The resolver matters because `StoreFeatureFlagsController.cs:65` would be wrong in both directions**
for this key: `overridden ? row.Enabled : descriptor.DefaultEnabled` reports OFF for a store with no row
on a promoted fleet whose links are in fact going out, and ON for a store whose row is set while
`Events:Enabled` holds the module dark.

**A defect introduced and then removed inside this lane.** The first cut filtered a batch already taken —
the shape `WorkforceNotificationDispatcher` has. Rows sort by `(NextAttemptUtc, CreatedAtUtc)`, so a
switched-OFF store with an older backlog fills every page and the store that just switched itself ON
watches nothing happen, forever. That is this lane's own complaint reintroduced one layer down. It is now
two queries: a `DISTINCT` over the due predicate says which stores have anything waiting, the gate is
asked once per store, and the batch is drawn **only** from stores that may dispatch. The due predicate is
written once and shared so the two sets cannot drift.

### Frontend (`lane/events-dispatch-store-lever-redo-fe`, 1 commit off `00d84d7`)

The switchboard is catalogue-driven, so **the catalogue entry is the lever** — no page code names the
flag and the row draws itself with a working control. `/admin/feature-flags` is already in the admin nav
(`AdminPageHeader.vue:378`). What was added is the two things a person cannot recover from the switch
itself, in the two maps this page already keeps for that purpose, in `no`/`en`/`de`:

- `ff_precondition_events_dispatch` — every link is a bearer credential for an unauthenticated page;
  switching on releases the **whole accumulated queue**, not only what comes next; a sent message cannot
  be recalled; it goes over whatever mail account the deployment configured.
- `ff_off_events_dispatch` — off **holds**, it does not discard: staff keep issuing links, nothing is
  spent, failed or deleted, and the queue grows behind the switch.

---

## 3. Evidence

### Backend — the queue draining is the proof

`WebApi.Tests/Events/EventsDispatchStoreLeverTests.cs`, **9 tests**, every world driven through the
production composition: rows enqueued by the real proposal service, the flag written through
`FeatureFlagStore.SetAsync` (the call `PUT /stores/{id}/feature-flags` makes), the decision read through
`StoreBackedEventsFeatureFlagStore` behind `EventsModuleGate`.

1. `A_stores_own_switch_drains_its_queue_while_the_fleet_default_is_off` — **the exit condition as an
   assertion.** Fleet default off; a pass delivers nothing and the row stays queued. Write the store row.
   Next pass: `Delivered: 1`, the mail recorder has the message, `QueuedCount` 1 → 0, status `Sent`.
2. `A_withheld_pass_leaves_the_row_exactly_as_found` — five withheld passes (five *is* the attempt budget)
   leave status, attempts, next-attempt, `LastError`, `DeadLetteredAtUtc` and both lease columns
   unchanged, then the row still delivers.
3. `One_stores_switch_does_not_release_another_stores_queue`
4. `A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on`
5. `A_promoted_fleet_keeps_dispatching_and_a_store_can_still_switch_itself_off`
6. `A_dark_module_is_never_refined_on_by_a_dispatch_row`
7. `The_pipelines_dispatch_read_answers_for_the_store_not_the_fleet`
8. `The_effective_resolver_reports_the_gate_rather_than_the_row`
9. `The_flag_is_advertised_deny_closed_in_the_shared_catalogue`

**Mutation checks — every one applied to the real file, built, run, reverted.**

| mutant | killed |
|---|---|
| M1 drain does not consult the per-store gate | 5 of 9 |
| M2 config fallback goes deny-closed | 2 (promoted-fleet, resolver) |
| M3 resolver returns the row instead of the gate | 1 (resolver) |
| M4 health reports the fleet default | 1 mine + `EventsDeadLetterSurfaceTests.With_dispatch_off_…` |
| M5 filter after the batch (the Workforce shape) | 2 (starvation, isolation) |

### Frontend

`test/feature-flags-page.test.js` **46 → 56**. Mutant: both map entries removed → 3 tests red
(`both disclosures render…`, `…survive a store read that never mentioned the flag`,
`no other flag row carries…`); restored → 56/56.

---

## 4. The limit, measured rather than asserted

**No walk against the owner's live world can show this lever, and the reason is a fact about the running
process, not an opinion.**

- The API listening on `:5971` is PID **59199**, cwd `/Users/svendaneel/okam/wt-lwtwo-api`, whose `HEAD`
  is **`118f92fb9`** — binary built 2026-08-06 21:15. `118f92fb9` is an ancestor of trunk `9fb057d00`
  by **47 commits**.
- At `118f92fb9` the flag-key literal `"Events.Dispatch"` occurs **0** times in `*.cs`; on this lane's
  branch it occurs **1**. Control, same probe form: `"Events.Settlement"` occurs **1** in both — so the
  probe finds things and the zero is a real absence.

The catalogue that process serves therefore cannot contain the row, and the drain it runs cannot consult
it. The brief forbids restarting the server, so **C5 acceptance is owed and not claimed here**: what is
shown is that the capability exists, is reachable and drains the queue; what a person still has to do is
walk it against a build that contains it.

Two instrument corrections made on the way, recorded because both are the trap the brief names:

- `strings <dll> | grep -x "Events.Dispatch"` returned **0 for every flag including ones that certainly
  exist** — .NET stores metadata strings as UTF-16, so the ASCII haystack was empty. The probe was
  replaced with the git one above, which carries its own control.
- `git grep -c "Events.Dispatch"` at `118f92fb9` returned 4 files: `.` is a wildcard and it was matching
  `Events.DispatchEnabled` in a comment. The exact-literal form `-F '"Events.Dispatch"'` is what is
  quoted above.

The browser was held by another lane throughout; per the brief's busy-resource rule it was not contended
for, and no flag was written in the owner's world.

---

### Tiers

**Backend non-SQL, at the branch tip:** `Passed: 4889, Failed: 0, Skipped: 10, Total: 4899` (6 m 3 s),
run as `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter "Database!=SqlServer"`. The
brief's baseline is 4880 / 0 / 10 and this lane adds exactly the 9 tests named above — 4880 + 9 = 4889,
with the skip count unmoved.

**Frontend, at the branch tip:** `Test Suites: 164 passed, 164 total · Tests: 3884 passed, 3884 total`.
The brief's baseline is 164 / 3874 and this lane adds exactly the 10 cases named above (4 `test` +
2 `test.each` over three locales) — 3874 + 10 = 3884, suite count unmoved.

**The `core` submodule bites the frontend tier and it does not look like a test failure.** A first run in
the fresh worktree reported *27 suites failed, 137 passed, 3043 tests passed, 0 failed* — every failure a
`createNoMappedModuleFoundError` at module resolution, because `core` was an empty placeholder and 27
suites import through it. Zero tests actually ran red. It was resolved by the brief's own order:
`git submodule update --init core` (which clones but cannot reach the pinned SHA on the remote —
`upload-pack: not our ref`), then, **from inside `core` after confirming it holds a `.git`**,
`git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core 9626a561…` and check that
SHA out. `git rev-parse --show-toplevel` was asserted to be the `core` path before anything ran, so the
walks-up-to-the-parent trap could not fire. No `git submodule deinit` at any point.

## 5. Two notes for whoever runs a tier next

**The non-SQL tier filter is `--filter "Database!=SqlServer"`.** The brief says the root `dotnet test`
command in circulation is a no-op, which is right — but it does not say what the *non-SQL* tier actually
is, and an unfiltered `dotnet test WebApi.Tests/WebApi.Tests.csproj` starts a Testcontainers SQL Server
per module fixture. The trait was read off a concurrent lane's own command line rather than guessed. With
it, no container starts at all.

**The host was heavily contended for this lane's whole test window.** A concurrent lane held the browser
throughout (so the live walk was not attempted — the brief's busy-resource rule) and was running **three
simultaneous `dotnet test` processes**, against a machine the estate's own note puts at ~2–3 concurrent
Testcontainers SQL maximum. One unfiltered full-tier attempt of mine was started and then stopped through
`TaskStop` rather than left to fight for a SQL slot; no foreign process or container was ever signalled.

## 6. Constraints

- **C1** no `UPDATE`/`DELETE` against an append-only table; the change makes the drain touch strictly
  fewer outbox rows.
- **C2** no migration; the lever writes an existing `StoreFeatureFlags` row.
- **C3** catalogue entry → screen row → `PUT` route → nav entry → DI-registered resolver → drain consumer,
  all in this change.
- **C4** not a money-path write; the flag write carries `CallerReference()` through the existing controller.
- **C5** owed, stated in §4 rather than claimed.
- **C6** no statute named in any string added.
- **C7** `git diff 9fb057d00 -- '*.cs' | grep '^+.*_logger\.'` is **empty** — no log or telemetry call
  added anywhere. The single touched log argument was a bool and remains a bool. No address, token or key
  is in the diff.

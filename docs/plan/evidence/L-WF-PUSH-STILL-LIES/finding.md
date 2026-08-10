# L-WF-PUSH-STILL-LIES — the negative universal, swept; and the tree it is true of

**Exit (three clauses):** *no code comment or return claims the uninstalled-device case is closed, the
recipient is not flipped to `Delivered` on a push that was never confirmed, and the publish audit actor is
asserted by value.*

**Reason shape hit: (1) no artifact exists — plus a finding the decline did not have.** Batch 0 declined
this lane because *"no artifact exists in either repo"* and because clause 1 is *"a negative universal over
the whole corpus of code comments and RETURNs, and no sweep is recorded anywhere."* **The sweep is
recorded here.** It has an outcome the exit did not anticipate: **clause 1 is true of the lane's branch and
FALSE of the estate**, because the branch never landed.

**The `evidence:` line, preserved:**
`OkamAPI lane/wf-push-still-lies 100ae000 (base feature/restaurant-modules 569887a5, unmoved);
WebApi.Tests/Workforce/WorkforceNotificationTransportTests.cs,
WebApi.Tests/Workforce/ScheduleAuditLedgerTests.cs, WebApi.Tests/Wire/WorkforceWireTests.cs`

Ancestry, measured: `569887a5` **is** an ancestor of trunk `6d5328004`; `100ae0001` **is not**. One commit,
15 files, +329/−41.

## Clause 1 — the sweep, both corpora

### The RETURN corpus: **clean**

`grep -ril "uninstall" docs/plan/returns/` over **634** RETURN files returns **4**, and none of them claims
the case is closed — two disclaim it in terms:

| file | what it says |
|---|---|
| `L-WF-PUSH-SILENT-1.md:25-30` | *"…so an uninstalled app, a reinstall that left a dead handle, and a phone with … Nothing in this lane's work should be read as closing the uninstalled case."* |
| `L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT-7.md:18` | *"my verification must not be read as closing the uninstalled-app case."* |
| `L-WF-PUSH-STILL-LIES-1.md:9` | *"No comment claims the case closed."* |
| `L-GUARD-W0-1.md:20` | unrelated — *"A guard that can brick a session gets uninstalled."* |

Note how that half was discharged: this lane **amended another lane's RETURN**
(`L-WF-PUSH-SILENT-1.md`) rather than leaving the claim standing. The corpus half of clause 1 holds.

### The code corpus: **holds on `100ae0001`, fails on `6d5328004`**

`git grep -i uninstall -- '*.cs'` at each ref:

**Trunk `6d5328004` — three hits, and two of them are the claim the exit forbids:**

```
Services/Workforce/WorkforcePushNotificationDelivery.cs:24-28
  "And the truthful send is still not enough, which is why the registration is PROBED first.
   Notification Hubs accepts a send whose tag matches no registration: the worker who uninstalled the app
   produces exactly the same 'no exception' as the worker whose phone buzzed. Without the probe this
   adapter reported Sent, the dispatcher flipped the recipient to Delivered, and the manager
   read that the shift had been announced to somebody who was never told."

Services/Workforce/WorkforcePushNotificationDelivery.cs:100-104
  "Fail instead of sending, because a send nothing received is not a delivery and must never become one
   — the worker uninstalled the app, or has a login but has not opened it."
```

Both read the probe as covering the uninstalled worker. **It does not**: the hub prunes registrations
lazily, on PNS feedback after a send or at expiry, so an uninstalled app still answers the probe present
and the row still records `Sent`. The trunk's own `NotificationService.cs:133` names the counterexample —
*"a stale one per reinstall"* — without drawing the conclusion.

**Branch `100ae0001` — five hits, and every one states the limit rather than the closure**, e.g.
`INotificationService.cs:43-47`: *"A true answer is NOT evidence of a reachable device, and no caller may
treat it as one… This narrows the never-registered case and leaves the registered-but-unreachable one
open; only per-send PNS outcome telemetry can close it."*

## Clauses 2 and 3 — built on the branch, unshown as a run, absent from the estate

**Clause 2** is a real code change, not a comment: `WorkforceNotificationDispatcher.FlipRecipientAsync`
gains `|| recipient.Channel != row.Channel`, so **only the recipient's own channel may move its delivery
state**. The doc it adds says what the defect was: *"the in-app command cannot fail — it succeeded on the
first pass and flipped every recipient to `Delivered`, so a push that dead-lettered five attempts later
left the row reading delivered to a phone that was never reached."* That guard is **not** at the trunk.

**Clause 3** is met on the branch by a test that did not exist before —
`ScheduleAuditLedgerTests.The_publish_audit_row_and_the_publication_stamp_both_name_the_manager_who_published`,
which asserts `ActorReference` **by value** for `schedule.publish`, `schedule.draft.create` and
`schedule.validate`, with two genuinely different actors (`Assert.NotEqual(manager, scheduler)` first) and
the `PublishedByActorReference` stamp on the publication row and on the read model. At the trunk,
`git grep ActorReference -- WebApi.Tests/Workforce/ScheduleAuditLedgerTests.cs` returns **nothing**: the
file asserts action names and counts only (`Assert.Contains("schedule.publish", actions)` at `:43`,
`Assert.Equal(1, actions.Count(...))` at `:47`). So clause 3 is unmet at the trunk and met on the branch —
**as a test source. No run of it is recorded anywhere**, and C5 is explicit that a test source shows a
test exists, not that it passes or that it reds when the assertion is removed. This batch did not build the
backend to produce that run; it holds one point, class `node`, and a red-then-green cycle on the branch is
a suite lane's work.

## Verdict

**Not closable, and the reason is a landing rather than a citation.** All three clauses are satisfied on
`lane/wf-push-still-lies @ 100ae0001`; clause 1 is **demonstrably false of trunk `6d5328004`**, where the
two comments above still tell a reader the uninstalled-worker case is handled. A negative universal is
naturally read over the estate, and the estate still carries the claim. What this lane needs, in order:

1. land `100ae0001` (base `569887a5` is already an ancestor of the trunk, so the merge is small);
2. a recorded run of `ScheduleAuditLedgerTests` and `WorkforceNotificationTransportTests` at the composed
   tip, with the clause-2 guard and the clause-3 assertion each mutated once and restored;
3. re-run this sweep at the new trunk — `git grep -i uninstall -- '*.cs'` should return the branch's five
   limit-stating hits and none of the trunk's two claiming ones.

**Open exposure this does not fix, carried from the lane body:** the honest record —
`GET .../schedules/notification-failures` — still has no frontend caller, so no operator's screen renders
it (C3).

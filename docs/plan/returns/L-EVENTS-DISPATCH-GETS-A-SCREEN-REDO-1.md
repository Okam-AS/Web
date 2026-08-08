RETURN: L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO
brief: a78245b2
verdict: built
evidence: docs/plan/lanes/L-EVENTS-DISPATCH-GETS-A-SCREEN-REDO/evidence.md
log:
Not the host-only case. Growth:Enabled arms a STARTUP fail-fast no runtime row can re-run; Events:DispatchEnabled arms no check at all — it was read only inside the drain loop, per pass.
Its own settings doc names workforce.dispatch as its model, and that IS a per-store catalogue flag with no config key above it. Margin and Meals already ratify store-row-over-config.
The predecessor draft's SMTP reason refutes itself: receipts, invoices and Workforce already reach the same IEmailService ungated. SmtpHost is a deployment's mail permission, not this key.
So the lever was the work. Events.Dispatch: catalogue entry, store-row-over-fleet-key fallback, drain asked per store, health read per store, and an effective-resolver registered in Program.cs.
Effective = Events:Enabled AND (row ?? Events:DispatchEnabled). Drain, health read and resolver all call ONE gate method, so the switchboard cannot report a state the queue disagrees with.
EventsDispatchStoreLeverTests 9/9, every world through the production composition: real proposal service enqueues, FeatureFlagStore.SetAsync writes the row, StoreBacked gate decides.
Headline: fleet key off, a pass delivers nothing, queued 1. Write the store row. Next pass Delivered 1, recorder holds the mail, queued 0, status Sent. The queue draining, not a flag reading on.
Withheld leaves the row byte-identical across five passes (five IS the attempt budget), then it still delivers. Off holds the backlog; it never spends, fails or discards it.
Repaired a defect I introduced: filtering after the batch (the Workforce shape) lets a dark store's older backlog starve a switched-on store forever. Two queries now; switch resolved before the batch.
Mutants M1-M5, each applied to the real file, rebuilt, run, reverted: 5/2/1/2/2 kills. M4 also re-proved the pre-existing EventsDeadLetterSurfaceTests dispatch-off assertion non-vacuous.
Frontend: the switchboard is catalogue-driven, so the catalogue entry IS the lever, and /admin/feature-flags is already in the admin nav that events-pipeline renders. No new routing.
Added only the two row disclosures in no/en/de: ON releases the WHOLE queued backlog of bearer-credential links and cannot be recalled; OFF holds rather than discards. feature-flags-page 46 to 56.
C5 OWED, not claimed. Live API is PID 59199 built from 118f92fb9, 47 commits behind trunk: "Events.Dispatch" appears 0 times there, 1 on my branch, control "Events.Settlement" 1 in both.
Two instruments corrected mid-lane: strings on a .NET dll read 0 for flags that exist (UTF-16 metadata), and git grep "Events.Dispatch" matched Events.DispatchEnabled in a comment.
Backend non-SQL tier 4889/0/10 via --filter Database!=SqlServer (baseline 4880 + my 9, skips unmoved). Frontend 164 suites / 3884 / 0 (baseline 3874 + my 10). Both worktrees clean, nothing pushed.
END RETURN

RETURN: L-THE-EXPIRY-SWEEP-GETS-AN-ARM-THAT-CAN-FAIL
brief: 2b474aaa
verdict: fail-spec
spec_gap: The brief asserts the expiry-sweep site reds under no mutation; at bcfe0d893 the canonical falsifying mutation reds the existing first arm (Failed 1 / Passed 1, both arms named in the trx).
log: The before-state does not reproduce, and the brief's own ordering is what caught it: apply the mutation FIRST, and it redded an existing arm instead of nothing.
The mutation, in words: the age-out condition (notice parsed, RangeEndUtc present, RangeEndUtc <= now) was made never-true, so a withheld row whose week has ended is re-withheld forever.
Measured at bcfe0d893, filtered to WorkforceNotificationBacklogBoundTests, 2 tests executed, trx-named: Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires FAILED.
The control arm (A_withheld_command_whose_week_is_still_ahead_is_kept_and_still_re_polled) passed under the same mutation — the red is the age-out's, for the right reason.
The existing first arm DOES reach the site: it asserts WithheldExpired=1, DeadLettered status and timestamp, the verbatim WithheldWeekEnded reason, the operator surface row, and no re-poll 30 days on.
The premise did not move under anyone: the test file and the dispatcher are both unchanged since 74405b34, the original wf-withheld-bound commit. The premise was wrong at birth, not overtaken.
Likely origin of the false finding: "reds NOTHING" is the void-run false-survivor signature (zero tests, exit 0, read as a survivor), the failure mode tranche one demonstrated on the pre-fix runner.
My own second read repeated the error by citing the landing lane's measurement instead of re-running the mutation; the citation chain was two readers deep with zero independent runs until this lane.
No third arm was added: the named change would duplicate assertions the suite already carries, and an arm that cannot add a new red is exactly the unproven-claim shape this lane exists to refuse.
Third Withheld site duty: named, not fixed — EventsNotificationDrainService.cs:122 computes StoresWithheld, a store-level counter with its own (unexamined) bound story; a separate lane's question.
Mutation restored byte-equal and asserted; worktree OkamAPI-expiryarm removed and pruned; trunk untouched at bcfe0d893; no commit, no branch move, nothing pushed.
Suggested close for the flag this lane rode on: the expiry sweep is mutation-covered as of this measurement; the plan record should cite this run rather than the void one.
END RETURN

# L-EV-CALLBACK-SWEEP - measurement

Base: OkamAPI feature/restaurant-modules @ 3579bbbc (the stated integration tip).
Worktree: /Users/svendaneel/okam/wt-evcbsweep, branch lane/ev-callback-sweep, ZERO commits.
Did NOT use /Users/svendaneel/okam/OkamAPI-modules (on lane/meals-grace-pins, hosts a live WebApi).
No container started. No migration. Checkout clean before and after; artifacts/journeys/ev-dietary
never touched.

## Finding: the defect was already fixed, two days before it was ruled on

The ruling `sweep-captures-not-releases` is dated 2026-08-03. The remedy it names landed
2026-07-31 and is an ancestor of the tip:

    99f56e63  2026-07-31 22:41  Collect the deposit a guest approved instead of releasing it
                                when the callback is lost                       (lane/ev-capture)
    b77d15b0  2026-08-01 10:27  Drop the two provider states the Vipps rail cannot report from
                                the lost-callback theory
    a43b2815  2026-07-3x        Expire Events deposits, and release the guest's hold before
                                declaring one dead                              (lane/ev-sweep)

`git merge-base --is-ancestor` = YES for all three against 3579bbbc.

`EventsDepositService.ExpireOneAsync` reads provider truth before it acts, and on
`EventsDepositProviderState.Authorized` replays the missing delivery into
`IEventsDepositCompletionSink` instead of releasing. The exit criterion's test already exists:

    WebApi.Tests/Events/EventsDepositLostCallbackTests
      .One_lost_callback_costs_neither_the_money_nor_the_booking

and its XML doc records the pre-fix red it was written against:
`deposit=Expired event=Accepted captures=0 cancels=1 released=1 expired=1 refusedCollected=0`.

## Baseline

    dotnet test --filter "Database!=SqlServer&(FullyQualifiedName~EventsDepositLostCallbackTests
      |FullyQualifiedName~EventsDepositExpirySweepTests
      |FullyQualifiedName~EventsExpirySweepHostedServiceTests)"

    Passed! - Failed: 0, Passed: 28, Skipped: 0, Total: 28

## The green is real: a two-direction mutation matrix

The brief asked for the sweep to be shown to DISCRIMINATE rather than to have had a default
flipped. Rather than add a same-world paired test, the same property is established by mutating
the production guard in BOTH directions over the existing suite. A suite satisfiable by either
flipped default would stay green under one of them.

`WebApi.dll` mtime was recorded before and after every run and moved every time, so no result
below was measured against a stale assembly (the CLAUDE.md `--no-build` trap).

### Mutation A - remove the provider consultation

`if (truth.ProviderState == Authorized)` -> `if (false && ...)`, i.e. the sweep never consults
the rail for recovery and falls through to release+expire. This restores the original defect.

    Failed: 8, Passed: 20   (mutation-A-no-provider-consultation.txt)

Red includes the headline `One_lost_callback_costs_neither_the_money_nor_the_booking`, plus
`A_tick_collects_a_deposit_the_guest_approved_whose_completion_callback_was_lost`,
`A_rail_that_drops_out_mid_recovery_defers_rather_than_destroying_the_hold`,
`A_sweep_with_no_completion_sink_wired_refuses_rather_than_releasing_the_hold`.

Green throughout: `A_deposit_the_rail_does_not_call_authorized_is_never_captured` (both rows) -
correctly unaffected, that path does not use the branch.

### Mutation B - capture unconditionally

`if (truth.ProviderState == Authorized)` -> `if (true || ...)`, i.e. every overdue deposit is
run through recovery regardless of what the rail says.

    Failed: 2, Passed: 26   (mutation-B-capture-unconditionally.txt)

    A_tick_expires_an_overdue_deposit_request_through_the_real_deposit_service
    A_failing_proposal_pass_does_not_starve_the_deposit_pass_of_its_tick
      both: Assert.Equal() Expected: Expired  Actual: Requested

So a sweep that captures everything stops expiring lapsed deposits and is caught.

### The one honest asymmetry, reported rather than papered over

Mutation B produces NO unauthorized capture, so nothing reds on captured money. That is not a
hole in the money property - it is defence in depth. `EventsDepositCompletionSink` independently
refuses to capture a deposit the rail does not call `Authorized`, so removing the sweep's own
guard cannot charge a guest who never approved. The consequence for coverage is precise and
worth recording: **the sweep's own capture-only-on-Authorized guard is not independently pinned;
it is covered only through the sink's.** The money property holds under both mutations.

## The flag's other two premises are still TRUE, by design

- `EventsDepositService.GetPublicPageAsync` contains no `_port.` call - the guest page still
  never polls and never consults the provider.
- `VippsController.Callback` still `return Ok()`s around the sink call - the callback still ACKs
  regardless of whether promotion happened.

Under the ruling `sweep-captures-not-releases` those two are the accepted design: the sweep is
the compensating control that retries. The flag BODY should be corrected rather than left
implying all three clauses are open.

## Note for whoever clears the flag

`F-EV-CALLBACK`'s `clears_when` names no fact key, so it will hit the same tool refusal that
kept `F-GR-DELIVERY-RECORD` open as bookkeeping.

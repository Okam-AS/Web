# F-EV-CALLBACK — the correction, measured at the named ref

Ruled `correct-the-flag-in-three-parts` (D-SPEC-L-EV-CALLBACK-SWEEP, 2026-08-05, @sven).
This lane re-measured **at the ref the ruling names** and found the same thing the ruling was
made on. Nothing here is code: the deliverable is the record.

Ref: **OkamAPI-modules `8e2b57de`** = `feature/restaurant-modules` tip,
2026-08-04 11:58 +0200, "L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing".
Every fact below was read with `git show 8e2b57de:<path>` — the checkout at
`/Users/svendaneel/okam/OkamAPI-modules` sits on `lane/meals-grace-pins` and its working tree was
neither read nor touched.

## 1. The sweep clause is SATISFIED — verified at 8e2b57de, not inherited

`git merge-base --is-ancestor` against **8e2b57de** is YES for all three:

    99f56e63  2026-07-31 22:41  Collect the deposit a guest approved instead of releasing it
                                when the callback is lost
    b77d15b0  2026-08-01 10:27  Drop the two provider states the Vipps rail cannot report from
                                the lost-callback theory
    a43b2815                    Expire Events deposits, and release the guest's hold before
                                declaring one dead

`EventsDepositService.ExpireOneAsync` (line 539 at this ref) reads provider truth **before** it
resolves anything — `ReadProviderTruthAsync` → `RefuseIfMoneyMoved` → and only then, on
`EventsDepositProviderState.Authorized`, `RecoverLostCompletionAsync`, which replays the missing
delivery into `IEventsDepositCompletionSink` rather than releasing. Release is reached **only**
when the rail refuses to collect, and only after the row and provider state are re-read.

Measured, not read (fresh worktree at 8e2b57de, full compile, `WebApi.dll` mtime 2026-08-05T10:31:48):

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer&(
      FullyQualifiedName~EventsDepositLostCallbackTests
      |FullyQualifiedName~EventsDepositExpirySweepTests
      |FullyQualifiedName~EventsExpirySweepHostedServiceTests)"

    Passed! - Failed: 0, Passed: 28, Skipped: 0, Total: 28      (tip-8e2b57de-suite.txt)

and the exit criterion's own test, named and passing:

    WebApi.Tests.Events.EventsDepositLostCallbackTests
      .One_lost_callback_costs_neither_the_money_nor_the_booking          Passed [177 ms]

Its XML doc carries the pre-fix red it was written against —
`deposit=Expired event=Accepted captures=0 cancels=1 released=1 expired=1 refusedCollected=0` —
so the "red before the fix" the exit criterion asks for is on the record, dated before the ruling
that dispatched this lane.

**Why the earlier mutation matrix still holds at this ref.** Every deposit file is byte-identical
between `3579bbbc` (where L-EV-CALLBACK-SWEEP-1 mutated the guard both ways) and `8e2b57de` —
`git rev-parse <ref>:<path>` gives the same blob for `EventsDepositService.cs`,
`EventsDepositCompletionSink.cs`, `EventsDepositPaymentPortAdapter.cs`, `VippsController.cs`,
`EventsDepositLostCallbackTests.cs`, `EventsDepositExpirySweepTests.cs` and
`FakeEventsDepositPaymentPort.cs`. The only Events change across those two refs is
`EventsProposalService.cs` + a new proposal write-gate test. The matrix was **not re-run** here;
that is stated as inheritance, not as a measurement of this ref.

## 2 and 3. The two survivors are TRUE, and true BY DESIGN

Both still hold at 8e2b57de, exactly as the flag says:

- `EventsDepositService.GetPublicPageAsync` (line 347) contains no `_port.` call — **the guest
  deposit page never polls and never consults the provider.**
- `VippsController.Callback` hands a deposit order to `_eventsDepositSink.OnProviderOutcome(...)`
  and then `return Ok();` unconditionally — **the callback ACKs 200 whether or not promotion
  happened**, so Vipps does not redeliver.

Under the ruling these are not two open defects. **The sweep is the retry.** A page that polls and
a callback that NACKs would be two more instruments doing what the sweep already does on provider
truth. The flag must therefore be corrected rather than cleared: cleared it reads as three defects
gone, left as it stands it reads as three defects open, and **only one of the three was ever a
defect — and that one was fixed on 2026-07-31, two days before the ruling that sent a lane at it.**

## What the flag says today, and why it is wrong

Its title — *"one lost deposit callback releases the guest's authorized hold"* — is the single most
misleading line, because the release is exactly what no longer happens. Severity `blocker` prices it
as live money exposure. Two further places in the record inherit that reading:

- `plan.md` **FT-EVENTS `needs:`** lists `F-EV-CALLBACK`, so the feature is gated on a flag that
  names no live defect. This is the concrete mis-pricing the ruling was made to stop.
- `plan.md` **FT-EVENTS body**, under *Where Events stops*: "`F-EV-CALLBACK` is the reason that gap
  matters rather than merely being untested: one lost callback releases the guest's authorized hold
  and no instrument retries." **Both halves are false at the tip.** The undriven-deposit gap is
  real and worth keeping — its reason is now that nothing has walked it in a browser, not that a
  hold is destroyed.

## Ready to apply — the flag block, corrected in three parts

State and severity are the owner's and are marked as owed rather than assumed. The body below is
the hand-written shape the ruling's `con:` says the flag vocabulary cannot express:

    ### Flag F-EV-CALLBACK — the lost deposit callback, corrected in three parts
    state: open
    severity: info
    owner: @sven
    clears_when: the owner accepts this correction; the defect half is already proven closed at
      feature/restaurant-modules 8e2b57de by EventsDepositLostCallbackTests
    cleared_by: L-EV-CALLBACK-SWEEP

    Raised 2026-07-30 in three clauses. **One was a defect and is fixed; two are true by design.**

    **1 — the sweep releases the guest's approved hold: FIXED, and fixed before this flag was ruled
    on.** `ExpireOneAsync` asks the rail what it holds before resolving anything, and an authorized
    deposit is COLLECTED by replaying the lost delivery into the completion sink — released only if
    the rail then refuses to collect. Landed 99f56e63 on 2026-07-31, an ancestor of the tip;
    re-verified at 8e2b57de with 28/28 green and the headline test
    `One_lost_callback_costs_neither_the_money_nor_the_booking` passing, whose doc records the
    pre-fix red. A lane at 3579bbbc mutated the guard in BOTH directions over the same byte-identical
    files: remove the provider consultation and 8 red including the headline, capture unconditionally
    and 2 red because lapsed deposits stop expiring. Neither flipped default survives.

    **2 — the guest deposit page never polls. TRUE, by design.**
    **3 — the Vipps callback ACKs 200 whether or not promotion happened. TRUE, by design.**
    Under the 2026-08-03 ruling `sweep-captures-not-releases` these are the accepted shape, because
    **the sweep is the retry**: one instrument recovers a lost delivery, on provider truth, and a
    polling page or a NACKing callback would only duplicate it. They are recorded here so the flag
    is not later cleared as if all three had been defects, nor left as if all three were open.

    **One asymmetry, not smoothed over.** The unconditional-capture mutation produces no
    unauthorized capture, because `EventsDepositCompletionSink` independently refuses to capture a
    deposit the rail does not call `Authorized`. Defence in depth — and it means **the sweep's own
    capture-only-on-Authorized guard is pinned only through the sink's.** That is the one piece of
    real coverage debt this flag leaves behind.

And the two inherited sentences, corrected:

- FT-EVENTS `needs:` — drop `F-EV-CALLBACK`; it no longer names anything a person must fix.
- FT-EVENTS body — replace with: "The deposit has not been driven end to end. `F-EV-CALLBACK` no
  longer holds it: a lost callback is recovered by the expiry sweep on provider truth. What is
  missing is a browser walk, not an instrument."

## What was NOT measured, and why

- **No SQL container slot in this brief.** The `Database=SqlServer` tier for these paths —
  `EventsConcurrencyTests` / `EventsDepositLifecycleTests`, which is where the deposit rowversion,
  the append-only receipt trigger and the filtered single-active index are actually proven — was not
  run and is not claimed. The 28 above are the SQLite fast tier only. Nothing here was measured
  another way and reported as if it were the SQL tier.
- **The mutation matrix was not re-run** at 8e2b57de. It is inherited on byte-identity (above).
- **No browser walk.** Under C5 nothing in this file is acceptance of FT-EVENTS; it is a record
  correction, and the deposit journey remains undriven.

## Constraint notes

- **C1** — no UPDATE, DELETE or backfill of anything. This lane wrote no code, no migration, no SQL.
- **C4** — checked rather than assumed, because the recovery path moves a guest's money on a clock:
  the sweep's receipts go through `AppendSystemReceipt` → `EventsPaymentLedger.Record(...,
  EventsActorKind.System, actorUserId: null)`, and the sink's T9/T10 transitions and receipts do the
  same. `EventsPaymentLedger` throws `EventsProblemException.Unattributed()` on an Admin receipt
  naming nobody and `ArgumentException` on a non-Admin kind carrying an actor, so the background
  clock cannot borrow a person's identity and a staff act cannot hide as the system.
- **C2, C3, C6, C7** — not engaged; no migration, no new capability, no statutory string, no logging.

## Reproducing the run

    cd /Users/svendaneel/okam/OkamAPI-modules
    git worktree add -b <yours> /tmp/evcb 8e2b57de
    cd /tmp/evcb && dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer&(\
      FullyQualifiedName~EventsDepositLostCallbackTests|\
      FullyQualifiedName~EventsDepositExpirySweepTests|\
      FullyQualifiedName~EventsExpirySweepHostedServiceTests)"

The worktree this lane used (`OkamAPI-evcbrecord`, branch `lane/ev-callback-record`) carried zero
commits and was removed after the run. No container was started; no container was touched.

# L-EV-SEED-DEPOSITS — evidence

Backend change: `lane/ev-seed-deposits` **caee6ae3** (seed 7a6d9798 + wire proof caee6ae3), worktree
`/Users/svendaneel/okam/wt-evseeddep`, rebased onto `feature/restaurant-modules` **3579bbbc**. Local
only, not pushed.

**Pass 2 re-measurement (2026-08-03).** Nothing in §1–§4 below has decayed. Four commits landed on
the base since pass 1 and none touches `Scripts/demo/`, `Services/Events/` or
`Controllers/EventsDepositsController.cs`; `EventsFeatureFlags.Describe()` still advertises
`Events.Deposits` and `EventsDepositsController.Issue` still passes `requireDepositsFlag: true`, so
the defect the lane fixes was still live on HEAD when this pass began. What pass 2 adds is §6.

## 1. The brief's citations, checked one by one

| Claim | Verdict | Where |
| --- | --- | --- |
| seed:34-35 flips `Events.Core` and `Events.Settlement` | TRUE | `Scripts/demo/seed-events-demo.sh` |
| seed:36-37 asserts Deposits "gates NOTHING … withheld from the shared catalog" | TRUE, and false as written | same |
| `35581782` landed it 2026-07-30 14:07 | TRUE | `Events: carry the settlement revision…` |
| `df808624` 19:27 put `Events.Deposits` in the catalog | TRUE | `Services/Events/EventsFeatureFlags.cs:62` (`Describe()`) |
| …and made the ISSUE route gate on it, deny-closed | TRUE | `Controllers/EventsDepositsController.cs:116` (`requireDepositsFlag: true`), `:186-190` |
| seed:134 mislabels the refusal as a credential failure | TRUE | the `else` arm accepted every non-200 |
| `Events:Enabled` is config-only, in no committed appsettings | TRUE | `Scripts/demo/demo-up.sh:131` exports it |

The flag has a real operator lever, so adding it to the seed works: `Program.cs:758` adds
`EventsFeatureFlags.Describe()` to the shared catalog, `StoreBackedEventsFeatureFlagStore` derives its
toggleable set from that same `Describe()`, and `Program.cs:1056` registers the store-backed
implementation. `demo_flag` drives `PUT /stores/{id}/feature-flags`, which is deny-closed on the
catalog — a withheld key would have been refused there rather than silently persisted.

**So the brief is correct. The seed did not provision the flag, and the refusal was mislabelled.**

## 2. What the brief did not know, and what it changes

`RecordFailedInitiationAsync` (`Services/Events/EventsDepositService.cs`) marks the deposit `Failed`
and runs **T10**, and `EventsStateMachine.cs:71` defines T10 as `DepositPending → Accepted`. So on a
machine with no usable Vipps credential the event does **not** rest in `DepositPending`:

1. transaction one commits the `Requested` deposit + T7 + the `Initiated` receipt → `DepositPending`
2. `_port.Initiate` throws
3. `RecordFailedInitiationAsync` → deposit `Failed`, T10 → back to `Accepted` (screen label *Godtatt*)

The seed header (`:20`) and `RUNBOOK.md` (`:345`) both claimed *"one event sits in DepositPending with
a REQUESTED deposit"*. That claim has **never** been true on a laptop — not before `df808624` either,
because the same provider failure and the same T10 applied then. Both are corrected.

## 3. Why the exit criterion's "answers 200" cannot be met

Three independent facts, none of them changeable from a seed script:

- `appsettings.json` `VippsSettings.ClientId` / `ClientSecret` / `OcpApimSubscriptionKey` are the
  literal string `"Set in Azure. For development, set in User Secrets"`, and `BaseUrl` is the **live**
  `https://api.vipps.no`. `VippsService.Authorize` therefore cannot mint a token, and
  `ParseResponse` throws `AppException`.
- `Program.cs:1076` registers `EventsDepositPaymentPortAdapter` unconditionally. The only fake is
  `WebApi.Tests/Events/EventsFakePaymentPort.cs` — test-project only. There is no environment- or
  config-conditional substitution anywhere in the composition root.
- The adapter's `Initiate` has exactly one non-throwing rail (Vipps). Stripe and Dintero throw
  `EventsProblemException.PaymentProvider` outright, so no alternative `paymentType` reaches 200.

Adding the flag moves the failure from the **gate** to the **provider**. It cannot move it to 200.

## 4. The check is falsifiable — proof

`check-discriminates.sh` extracts the deposit-stage block **verbatim by line range** from the seed
(so a regression in the seed is a regression in the proof) and drives it against stubbed
`(POST code, POST body, deposit-list JSON)` triples. Recorded output in `RUNS.md`.

- against `lane/ev-seed-deposits`: **7 passed, 0 failed**
- against the pre-lane seed `de1e5c5e`: **2 passed, 3 failed** — and the three failures are the defect
  verbatim, including `NOTE deposit issue REFUSED (404) -- expected without live Vipps credentials:`
  over an `EVENTS_DISABLED` body.

The two scenarios that must die and did not before are the module refusal and a refusal that never
reached the provider. The discriminator is the deposit row, not the status code, because the intent is
committed before the provider is touched — so a row exists **iff** the request cleared the flag gate.

## 5. The row appears, and does not appear — measured, not argued

`§4` proved the seed's *decision* is falsifiable against invented triples. It did not prove the
premise those triples encode: that a deposit ROW is actually written when the flag is present. An
absence assertion in a world that cannot produce presence is worth nothing, and the one test that
already drove this route (`EventsWireTests
.Issuing_a_deposit_needs_its_own_flag_while_in_flight_deposits_stay_reachable_on_core`) is exactly
that shape — its flag-on arm runs against a **Confirmed** event, where T7 is illegal, so the state
machine refuses before `EventsDepositService` is reached and no write can happen in it.

`EventsWireTests.A_deposit_row_and_its_receipt_are_committed_only_when_the_store_holds_the_deposits_flag`
(commit **caee6ae3**) closes that. It drives the seed's own two calls — `POST …/deposits` with
`{"paymentType":"Vipps"}` and `GET …/deposits` — over the **real** ASP.NET Core pipeline against the
**real** composition root (`WireHost` boots `Program.Main` over `TestServer`), on one **Accepted**
event whose accepted version requires a deposit, with the store's `Events.Deposits` row as the single
variable. Both arms run in one method against the same event, so presence and absence are the same
world. Measured outcomes and the red-then-green mutation are recorded in `RUNS.md`.

Three things that follow, none of them assumable:

- **The row is the discriminator.** Flag absent → 404 `EVENTS_DISABLED`, zero rows. Flag present →
  500 and **one** row (`Failed`, 40000 minor) carrying an `Initiated` receipt written before the port
  was touched, plus the `Failed` receipt and T10 back to `Accepted`. Neither arm is a 200.
- **The seed's arm ordering is safe.** The seed asks `jq` for `.code` and compares it to
  `EVENTS_DISABLED`; the provider fault answers `text/plain` with no `code` at all, because the rail
  throws past `EventsDepositsController` (which catches `EventsProblemException` alone). Pinned in the
  test rather than assumed, and it is why `check-discriminates.sh` scenario 6 uses an unparseable body.
- **The write names its actor.** The `Initiated` receipt carries `ActorKind.Admin` /
  `ActorUserId = wire-admin-a`; `EventsPaymentLedger.Record` refuses an Admin receipt that names
  nobody, so an unattributed caller is a 401 with no row.

`IVippsService` is quarantined in this host, so what is shown is that the intent is committed **before**
the rail is touched — not that the rail works. The provider leg stays unproven either way.

## 6. Not done

**The seed itself has still never executed.** A fresh stack needs a SQL Server container; five foreign
containers hold ~6.2 GiB of the Docker VM's 7.65 and host swap is at 17.5/18.4 GiB, so starting one
would risk OOM-killing another lane's world. Per the lane's hard constraint no container was started
and none was touched. What remains is one run of `Scripts/demo/demo-up.sh` (or
`API_BASE=… ./seed-events-demo.sh` against an existing demo world) to confirm the seed runs clean
end to end; every claim it makes about the deposit stage is proven above at the tier that can run
without one.

```
RETURN: L-EV-OUTBOX-FLAKE
brief: 2b41f09d
verdict: built
evidence: OkamAPI lane/ev-outbox-flake 59a1d607 (base 5df07afa, worktree /Users/svendaneel/okam/OkamAPI-evoutboxflake)
log:
Base measured: feature/restaurant-modules = 5df07afa, unmoved. Defect still live.
Only aliasing pair in Events tests; grep found no second instance.
Fix 1 - token pinned to 2502000a-2500-2000-2500-250020002500, which CONTAINS
  "250" and "2000". Worst case, not a safe one: the historical failure now
  reproduces on demand instead of once in ~200 runs.
Fix 2 - absence is measured on the body with the link excised. The alias dies
  structurally: the haystack no longer holds anything random.
Fix 3 - the two bare needles replaced by a digit inventory of the body beyond
  the link (only "8", from UTF-8). Strictly stronger: covers 250/2000 in EVERY
  rendering incl. "2 000,00" which "2000" misses, plus event date, guest count,
  room fee. Weak-needle question in the brief answered: yes, it was weak.
Mutation proof, host dotnet 8.0.110, never --no-build:
  M1 needles back on whole body -> RED "Found: 250 ... proposal/2502000a-..."
  M2a leak row.EventId into body -> RED inventory ["8","5"]; old needles blind.
  M2b leak recipient address     -> RED "Found: kari@example.test"
  restored -> GREEN 15/15 (Database!=SqlServer, EventsOutbox*). Prod file clean.
END RETURN
```

## Detail

**Base.** `feature/restaurant-modules` = `5df07afa` at read and unmoved; the ref was
not touched. Work done in a private worktree
`/Users/svendaneel/okam/OkamAPI-evoutboxflake` on new branch `lane/ev-outbox-flake`,
checkout asserted clean before building. `OkamAPI-modules` was not used. No
container started, no migration authored, nothing pushed.

**The mechanism, confirmed rather than assumed.** The mail body is composed by
`Services/Events/EventsEmailNotificationDelivery.ComposeHtml` from a fixed
template plus one variable value, the `PublicToken`:

```
<!DOCTYPE html><html lang="no"><head><meta charset="UTF-8"></head><body><p>Hei,</p>
<p>Du har faatt et tilbud ...</p><p><a href="https://guest.example.test/events/proposal/{token}">
Se tilbudet</a></p>...
```

The token is a `Guid` in `D` format: 32 hex characters in 5 dash-separated groups.
`"250"` fits inside a group at 22 positions, so P(alias) = 22/16^3 = 0.54%;
`"2000"` at 17 positions = 0.026%. About 1 run in 180 fails on the fixture. That
matches "a lane hit it at a clean baseline and could not reproduce it".

**Why the pinned token looks wrong on purpose.** A token chosen to avoid the
needles would have silenced the symptom and proved nothing. The pin is
`2502000a-2500-2000-2500-250020002500` -- legal hex, and it contains both needles
several times over. Restoring the old assertion form against it reproduces the
historical failure deterministically (mutant M1 above), so the regression case is
kept in the file rather than in a lane's memory.

**Why the bare needle was the wrong assertion even when it did not alias.**
Answering the brief's point 3: `DoesNotContain("2000", body)` does not match
`2 000,00`, which is how a Norwegian money leak would actually render, and does
not cover the room fee (300,00), the line unit price (1 250,00), the guest count
(20) or the event date (5 December 2026) at all. The replacement asserts the
inventory of digit runs in the message outside the link is exactly `["8"]` -- the
charset declaration's, and nothing else. That is the direct encoding of the claim
the production docstring already makes ("no amount, no guest name, no event date,
no dietary or contact detail, and no second token"), and mutant M2a shows the old
needles were blind to a leak the new form catches.

**Pinning mechanism.** `PinPublicTokenAsync` rewrites the token on the queued
outbox row and on the proposal version it was issued for, through
`harness.Context` -- the same context the drain reads. A write from a second
context would have left the drain looking at the tracked instance and the pin
would have missed silently. Neither `EventsNotificationOutbox` nor
`EventsProposalVersion` is in `GuardAppendOnly` and neither carries an
append-only trigger in the migration chain (checked both), so C1 is not engaged;
the three guarded Events tables are AcceptanceReceipts, StateTransitions and
PaymentReceipts.

**What was NOT done.** No retry, no `[Retry]`, no loosened assertion, no other
suite re-run. `EventsOutboxDispatchTests` is `[Trait("Database","SqlServer")]`
and was correctly excluded by the container-free tier.

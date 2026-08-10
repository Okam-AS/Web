# The Events outbox backlog has no ceiling — and what that actually costs

Read-only measurement at `OkamAPI-modules` `feature/restaurant-modules`. Nothing was edited and no tier was
run. The brief names the trunk `ada218783`; it is `28e60e6b8`, moved by two landings since.

## What bounds the withheld backlog: nothing, and three near-bounds that do not

A store whose `Events.Dispatch` flag is off is skipped before the batch is drawn, and its rows are left
exactly as found (`EventsNotificationDrainService.cs:132-134`). Three mechanisms look like they might cap
that and none does:

| mechanism | why it does not bound a withheld store |
|---|---|
| `MaxAttempts` per row (`:204`) | It fires on *attempts*. A withheld row is never selected, so `AttemptCount` never increments and the cap is never approached. |
| Retry backoff (30 s base, 3600 s cap) | Reschedules a row; it never removes one. |
| Enqueue idempotency on `LogicalDedupeKey` | This **is** a real bound, but on duplicates only — it stops the same proposal version or deposit token being enqueued twice. It does not stop new ones accruing. |

There is no expiry, no max age and no cutoff anywhere in the Events outbox. **The only thing that bounds the
backlog is the venue's own booking activity.**

## The number

Rows are not created per day, per guest or per state change. Exactly two call sites enqueue
(`EventsNotificationDispatcher.cs:41` and `:61`), and each is idempotent on a key that fixes its
granularity:

- **one row per (event, proposal version sent)** — `events.proposal-link:{eventId}:{versionNo}`, so a
  re-send of the same version adds nothing and a *revision* adds one
- **one row per (event, deposit request issued)** — `events.deposit-link:{eventId}:{token}`, one per issued
  request

So `rows/day = proposal versions sent + deposit requests issued`. Taking **3 rows per booking** (an initial
proposal, one revision, one deposit request) — stated as an assumption because no measured venue volume
exists in this estate, and the arithmetic is exposed so a real number can be substituted:

| bookings/week | rows/week | rows accrued over 30 days |
|---:|---:|---:|
| 5 | 15 | ~65 |
| 20 | 60 | ~260 |
| 50 | 150 | ~650 |

**A month of withholding at a busy venue is roughly 650 rows.** That is the number the retention choice
should be judged on.

## What one drain does with it — the operator question

The hosted service polls every **15 seconds** (`EventsNotificationDispatchHostedService.cs:29`) and passes
**batch size 100** (`:30`), which overrides the service's own `DefaultBatchSize` of 50. The batch is drawn
across all dispatchable stores, ordered `NextAttemptUtc` then `CreatedAtUtc` — oldest first.

So the clearing rate is **100 rows per 15 s = 400/minute ≈ 24,000/hour**, and:

| backlog | drains to clear | wall-clock |
|---:|---:|---|
| 65 | 1 | one poll |
| 260 | 3 | ~45 s |
| 650 | 7 | ~1 min 45 s |

**The operator answer is that the retention choice is defensible on volume.** A store switched on after a
month drains in under two minutes at any plausible booking rate. It is not a bomb; it is a queue.

The one operator-visible cost is that the batch is shared: for those seconds a large backlog occupies slots
a neighbouring store's rows would have used. That is bounded by the same arithmetic — seconds, not hours —
and the design already refuses the worse version of it, below.

## What the guest receives — a different question with a different answer

**A month of withholding does not give one guest a month of notifications.** `TargetReference` is the
event's own `ContactEmail`, and rows are per (event, proposal version) and (event, deposit token), so a
guest receives the notifications for *their own booking* — typically two to four — never the venue's traffic.
The burst is bounded by that guest's own activity, not by the withheld duration.

What they do get is those messages **up to a month late, in one burst**, and nothing in
`EventsNotificationDrainService.DeliverOneAsync` or `EventsEmailNotificationDelivery` checks the age of a
row or whether the thing it links to is still current.

**Mitigated, and worth stating precisely so nobody fixes the wrong end:** the tokenised proposal page
refuses a superseded version — `EventsProposalService.cs:415` throws `ProposalSuperseded()`. A month-old
link therefore lands on a refusal rather than on a stale price. **The guest cost is confusion, not money.**

## Why the workforce bound does not transfer

A sibling lane bounded the workforce notification backlog a store with no push credential builds. The shapes
rhyme; the rationales do not, and copying it here would be wrong for two reasons.

1. **The workforce notification expires by nature; this one does not.** That bound retires a withheld row
   once *the week it publishes has ended* — a schedule notification for a past week is meaningless, so
   discarding it loses nothing. A proposal link is not meaningless a month later; it is the thing the guest
   is waiting for, and the Events code says so explicitly: switching the store on should deliver the backlog
   rather than find it spent.
2. **The accrual driver differs.** Workforce publications recur weekly whether or not anyone acts, so its
   backlog grows on a clock. Events rows are created only when a venue sends a proposal or issues a deposit
   request, so its backlog grows on human action and stops when the venue stops.

`EventsNotificationDrainService.cs:99-105` already records the asymmetry from the other side: it notes that
`WorkforceNotificationDispatcher` has the starve-a-neighbour shape and that its limit is real, and states
that it is deliberately not inherited here.

## The ordering property, and it already has an arm

The store switch is resolved **before** the batch is taken, not after. Filtering an already-drawn batch
would let one switched-off store with a large backlog fill every pass and starve a switched-on neighbour —
the operator flips their store on and watches nothing happen.

The brief asks whether that property has an arm. **It does:**
`EventsDispatchStoreLeverTests.A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on`, one of
nine in that suite, all green. A sibling lane measured that inverting the counter this suite reads reds five
of those nine.

## Whether any arm reds when a ceiling is broken

**No, and there is nothing for one to red against:** no ceiling exists, so there is no threshold a test
could cross. The falsifiable properties in this area are the ones that *are* covered — the withheld row is
left untouched (`A_withheld_pass_leaves_the_row_exactly_as_found`) and the neighbour is not starved. If a
ceiling is ever introduced, the arm it needs is the one this section cannot currently be written about.

## What this measurement does not cover

No tier was run and nothing was executed: the rates above are read from constants
(`PollInterval = 15 s`, `BatchSize = 100`, `DefaultBatchSize = 50`) and from the two enqueue call sites, not
from a timed run. The 3-rows-per-booking figure is an assumption, labelled as one. Email delivery latency at
the transport is not modelled — the clearing rate is the rate rows leave the outbox, not the rate messages
arrive. Whether any venue has ever run with `Events.Dispatch` off for a month is unknown to this lane.

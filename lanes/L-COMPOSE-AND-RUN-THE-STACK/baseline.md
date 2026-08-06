# The baseline, measured by this lane rather than inherited

The brief's rule: *report the pass / fail / skip triple against a baseline **you** measured yourself on the
same base, not a number from another lane's report.* Both tiers were therefore run at the composition's
first parent `24cd4ead` as well, in a **separate clean worktree** (`/Users/svendaneel/okam/wt-composebase`,
detached, built from nothing), on the same host, by this lane, with `--no-build` against an assembly
compiled from that clean tree.

## The four runs

| run | SHA | tier | total / passed / failed / skipped | wall clock | trx |
| --- | --- | --- | --- | --- | --- |
| `14a98816` | `24cd4ead` | **SQL** | **587 / 565 / 22 / 0** | 15:11:54 → 15:51:21 (38 m 53 s) | `base-24cd4ead-sql-tier.trx` |
| `c35f79b2` | `7ac6f2b2` | **SQL** | **587 / 565 / 22 / 0** | 14:15:11 → 15:11:06 (55 m 15 s) | `compose-7ac6f2b2-sql-tier.trx` |
| `e994d8a6` | `24cd4ead` | fast | 4713 / 4703 / 0 / 10 | 15:51:53 → 15:59:29 (7 m 28 s) | `base-24cd4ead-fast-tier.trx` |
| `58feb36c` | `7ac6f2b2` | fast | 4762 / 4752 / 0 / 10 | 14:05:37 → 14:13:50 (8 m 6 s) | `compose-7ac6f2b2-fast-tier.trx` |

All four `.trx` are committed in the OkamAPI tree under
`lanes/L-COMPOSE-AND-RUN-THE-STACK/` on `lane/compose-and-run-the-stack`.

The 16-minute spread between the two SQL runs is host contention, not a difference in work: a foreign lane
held a second `mssql` container through part of the first one. The test set is identical, so the durations
are not comparable and neither is evidence about anything.

## The delta, test by test

Compared **set-against-set on test names between the `.trx` files**, never inferred from the counts —
because `565 / 22` appearing twice is not by itself evidence that the same twenty-two failed.

### SQL tier

```
discovered-name sets: A=587  B=587  shared=587
ADDED   in B: 0
REMOVED in B: 0
OUTCOME CHANGED: 0
```

**The same twenty-two tests fail at the parent and at the composition, test for test.** Every one of the 22
is pre-existing at the migration-stack tip. The composition introduces no red and loses no test. The full
list of 22, in three causes, is in `sql-tier.md`.

### Fast tier

```
discovered-name sets: A=4713  B=4762  shared=4713
ADDED   in B: 49   (all outcome Passed)
REMOVED in B: 0
OUTCOME CHANGED: 0
```

The 49, by class:

| class | tests |
| --- | --- |
| `Growth.GrowthPostmarkEventReaderTests` | 38 |
| `Wire.GrowthPostmarkWebhookWireTests` | 8 |
| `Growth.GrowthPrivacyDeadlineTests` | 3 |

That is the confirm family's whole contribution, and nothing else moved.

## The two instruments agree

The `--list-tests` discovery diff, taken **before either run**, predicted `+49 / −0` overall and `0 / 0` for
the SQL tier. The executed runs delivered exactly `+49 / −0` overall with all 49 passing, and exactly
`0 / 0 / 0` for the SQL tier. A static prediction and a dynamic measurement agreeing is a stronger claim
than either alone, and it is what makes the attribution safe to rely on.

## Why the baseline was worth 39 minutes of the slot

Not ceremony. The composition changes one production file that a SQL-tier class exercises —
`Services/Growth/GrowthWebhookIngestionService.cs`, reached by
`Growth.GrowthWebhookIngestionSqlServerTests`. Discovery alone could not have told me whether that change
broke it; only running both sides could. It passed 2/2 at both SHAs.

Without this run, the honest statement would have been "22 reds, probably pre-existing". It is now
"22 reds, the same 22, proven".

---

## A cross-lane control that neither lane planned

`integration/mig-stack-merge` advanced from `24cd4ead` to `7f8945dc` while this lane's SQL run was going.
The added commit is **receipts only** — nothing under `Migrations/`, `Entities/`, `ModelBuilders/` or
`Helpers/ApplicationDbContext.cs` — so the composition needed no rebuild and its measurements still hold.
It has been merged in (`38788369`) so the composition sits on the tip that exists, and the tree still
builds with 0 errors.

What that commit contains is the useful part: **L-MIG-STACK-MERGE measured `24cd4ead` too**, from the
other direction, without either lane seeing the other's numbers.

| | L-MIG-STACK-MERGE | L-COMPOSE-AND-RUN-THE-STACK |
| --- | --- | --- |
| SQL run id | `40154b1c` (13:16:39 → 14:08:39) | `14a98816` (15:11:54 → 15:51:21) |
| **SQL total / passed / failed / skipped** | **587 / 565 / 22 / 0** | **587 / 565 / 22 / 0** |
| fast run id | `3b1efc45` | `e994d8a6` |
| **fast total / passed / failed / skipped** | **4713 / 4703 / 0 / 10** | **4713 / 4703 / 0 / 10** |

Four independent runs, identical counters, and the same three causes reached separately. This also
explains the contention: their SQL run **is** the foreign container that held the slot from 13:16 to 14:08,
which is exactly the window in which this lane measured 1.98 and 1.79 GiB of free pages and would have
returned `blocked`.

Their receipt adds one thing this lane could not produce: the nineteen failing classes re-run at
`feature/restaurant-modules` **alone** give 21 failed of 245, the same set test for test. So the reds
predate the migration stack as well as this composition — they belong to the integration branch.

**One divergence, recorded rather than smoothed.** This lane buckets the 22 as **15 / 6 / 1** by reading
the `<Message>` values out of its own `.trx`; theirs reads the dispatch bucket as 5. The totals agree at 22,
the failing test names agree exactly, and the causes agree. The per-test list is in the `.trx` files, which
is the authority.

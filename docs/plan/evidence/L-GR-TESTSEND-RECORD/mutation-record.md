# L-GR-TESTSEND-RECORD — the red-on-removal set, and the one clause it does not reach

Reason shape hit: **(1) the run happened and nobody wrote it down.** `instrumentless-exits.md` Batch 6:
*"the RETURN names no instrument at all … the falsifiability clause rests entirely on the RETURN's prose
claim of ten red-on-removal mutations; `wt-gr-ledger` has no `lanes/` directory and no committed red set.
The one file on disk under this lane id … is a prior **blocked** attempt."* **This file is the red set.**

## The evidence line as it stood before `plan verify` overwrote it

```
evidence: lane/growth-audit-ledger@bd3a840f (worktree /Users/svendaneel/okam/wt-gr-ledger)
```

## Where it was run — and a landing fact the census did not have

`bd3a840f74acc48adae0f0e461b1d33c695cc471` **is an ancestor of the backend trunk**
`6d5328004b831b3ec99424b73c4d05e1d6077dc8` (`git merge-base --is-ancestor` → 0). The ledger, the writer,
the allowlist and the three suites are **on the trunk**; this lane is one of the family
`instrumentless-exits.md` noticed — un-verifiable and simultaneously already shipped. Everything below was
therefore run at the trunk in a detached worktree, not in `wt-gr-ledger`. No trunk moved, nothing pushed,
no container started, no SQL slot used.

Runner every row: `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter
"FullyQualifiedName~GrowthAudit&Database!=SqlServer" --logger trx`, preceded by
`dotnet build WebApi.Tests/WebApi.Tests.csproj` with `WebApi.dll`'s mtime asserted moved every time.

## The runs

| # | state | `WebApi.dll` mtime | executed | result |
|---|---|---|---|---|
| 0 | trunk, unmutated | `17:47:0x` | 36 | **Passed — 0 failed / 36 passed** |
| 1 | **M1** the record dropped | `17:47:55` | 36 | **Failed — 3 failed / 33 passed** |
| 2 | **M2** ambient actor | `17:49:15` | 36 | **Failed — 3 failed / 33 passed** |
| 3 | **M3** newsletter dropped | `17:50:01` | 36 | **Failed — 1 failed / 35 passed** |
| 4 | **M4** the time dropped | `17:50:53` | 36 | **Passed — 0 failed / 36 passed** ← the finding |
| 4b | **M4**, widened to all Growth | same build | **607** | **Passed — 0 failed / 603 passed / 4 skipped** |
| 5 | all restored | `17:52:41` | 36 | **Passed — 0 failed / 36 passed** |

## M1 — the record dropped, which is the exit's own clause

`Services/Growth/GrowthNewsletterService.cs`: the whole `_audit.Append(new GrowthAuditEntry { … })` block
removed from `TestSendAsync`, leaving the `SaveChangesAsync` and the provider submission untouched — the
service as it behaved before this lane. **3 red of 36, by name:**

```
Failed GrowthAuditLedgerTests.A_test_send_records_the_admin_who_sent_it_and_a_refused_one_records_nothing
  The collection was expected to contain a single element, but it was empty.   (line 71)
Failed GrowthAuditLedgerTests.Two_admins_test_sending_produce_two_rows_naming_each_of_them
  Assert.Equal() Failure  Expected: 2  Actual: 0
Failed GrowthAuditLedgerTests.A_test_send_the_provider_throws_on_is_still_recorded
  The collection was expected to contain a single element, but it was empty.   (line 142)
```

The third is the ordering pin: the row must be durable **before** the irreversible submit, so a provider
that throws still leaves the attempt named.

## M2 — an ambient actor instead of the caller

`ActorReference = userId` → `ActorReference = "system"`. **3 red**, and the messages are the reason this is
a C4 pin rather than a populated column:

```
Expected: growth-iso-admin-a          Actual: system
Expected: ["growth-iso-admin-a", "growth-iso-admin-b···   Actual: ["system", "system"]
```

Two admins, byte-identical requests but for the caller, two different answers — which no ambient,
hard-coded or approver-derived actor can produce.

## M3 — the newsletter the send was about, dropped

`["newsletterId"] = newsletter.Id…` removed from the semantic delta. **1 red:**

```
Failed GrowthAuditLedgerTests.A_test_send_records_the_admin_who_sent_it_and_a_refused_one_records_nothing
  System.Collections.Generic.KeyNotFoundException : The given key 'newsletterId' was not present in the dictionary.  (line 82)
```

## M4 — the time, and it reds nothing

`Services/Growth/GrowthAuditWriter.cs`: `OccurredAt = _timeProvider.GetUtcNow()` → `OccurredAt = default`.
Every audit row in the estate is then stamped `0001-01-01T00:00:00+00:00`.

**36 tests executed, 0 failed.** Widened to `FullyQualifiedName~Growth` on the same mutant build:
**607 executed, 603 passed, 4 skipped, 0 failed.**

The counts are the disproof of "a mutation that reds nothing means the run executed nothing": the same 36
reddened under M1, M2 and M3 on the same filter, and 603 Growth tests ran here.

**So the exit's three facts are not equally pinned.** *Its actor* and *its newsletter* are pinned by value
and go red when removed. *Its time* is **written and never asserted** — no test in the GrowthAudit suites,
and none in Growth at all, distinguishes a correctly stamped ledger from one stamped at
`DateTimeOffset.MinValue`. The exit says "recorded with its actor, its newsletter and its time, pinned by
a test that reds if the record is dropped": the *record-dropped* clause is met (M1), and two of the three
named facts are individually falsifiable. The third is a column, not a pin.

**Recorded, not repaired.** Writing the missing assertion would be building toward the exit inside the
lane that is measuring it. What an owner should decide is whether "its time" needs its own pin — the
cheapest form is one `Assert.Equal(harness.Clock.GetUtcNow(), recorded.OccurredAt)` in
`A_test_send_records_the_admin_who_sent_it…`, which the injectable clock already makes possible.

## Restore

Both files written back: `git status --porcelain` → 0 files, `git diff | wc -c` → **0 bytes**, run 5 green
on a rebuilt assembly whose mtime moved.

## What this record does not claim

Not the SQL tier: `GrowthAuditLedgerAppendOnlySqlServerTests` is excluded by `Database!=SqlServer` and no
container was started, so the append-only guard is measured at **layer 1 only** — as the RETURN already
said, the SQL Server `AFTER UPDATE,DELETE` trigger does not exist and MIG-22 is specified, not authored.
Not C5: no operator has read a Growth audit row on a screen.

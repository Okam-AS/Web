# L-MIG-STACK-MERGE — the stack merged, and the four things only the merge could see

**Refs, named rather than read off a working directory.** The shared `OkamAPI-modules` checkout sits on
`lane/meals-grace-pins` and the world doctor calls that a mismatch, so every fact below was read with
`git show "${ref}:path"` — braced, because the unbraced form applies a history modifier and has caught four
lanes. Integration branch `feature/restaurant-modules` @ `8e2b57de`. Stack `integration/mig-stack-land` @
`4b37f81b`. Merge base `3579bbbc`. Work on `integration/mig-stack-merge` in a dedicated worktree at
`/Users/svendaneel/okam/wt-migstackmerge`; every run from a throwaway detached worktree at the SHA,
`/Users/svendaneel/okam/wt-msm-receipt`. Nothing pushed, `feature/restaurant-modules` unmoved.

## 1. There was no fast-forward, and the block's scope claim was wrong

```
git rev-list --left-right --count feature/restaurant-modules...integration/mig-stack-land
59      34
merge-base --is-ancestor, both directions: NEITHER
```

145 files on the stack side against the merge base, **19 in `Migrations/` and 126 outside it** — Workforce
timesheets (13 services, 13 tests), Margin waste, Training entities and enums, Tripletex, accounting
summaries, two new controllers, `Program.cs`, `ApplicationDbContext`. The narrow claim holds and was
checked: **no Meals services on the stack side**, only a Meals-named migration. Full census in
`merge-scope.txt`.

## 2. The merge — `7e7c0a3e`

Two files could not be resolved by the machine.

**`artifacts/tests/README.md` — union, never a side.** 19 rows on one side, 17 on the other, `bb82b3a0`
common: **29 rows out, the exact set union**, verified by `comm` in both directions (`rows.*`). Taking either
side would have deleted true receipts including every SQL-tier run that exists anywhere. The stack's rows
are inserted at the chronological position of the SHA they measure and **neither side's existing order was
disturbed**, because that file's paragraphs are assertions *about* order ("which is why its count sits below
the row before it"). Every paragraph from both sides survives.

**`docs/plans/PENDING-MIGRATIONS-LEDGER.md` — 582 lines against 1127.** The chain's copy taken whole; the
integration side's one new entry folded in, renumbered.

## 3. The number and the file were two different collisions

**MIG-22 was claimed twice**, each author blind to the other: `Growth_AuditLedger` (`bd3a840f`, integration,
2026-08-03) and `Margin_PeriodStatementFinalizedImmutable` (`d6b0630f`, chain, **landed** as
`20260801084923`). The landed migration keeps the number, on this plan's own rule that a file is a claim and
a ledger entry is a reservation. **Growth moves to MIG-29, not to the next free 28.**

**MIG-28 is reserved**, and that is the whole reason `lanes/L-FINALIZE-INDEX-OR-A-REASON/` had to be read
before resolving anything. That lane named MIG-28 and **deliberately wrote nothing into the ledger**,
because the copy it could see lacked MIG-23..27 and writing there would have manufactured this conflict. It
left the edit for the merge. Handing MIG-28 to Growth as "the next free number" was the trap, and it was
avoided by reading the lane rather than the ledger.

**The duplicate FILE is a separate problem.** `Margin_PeriodStatementFinalizedImmutable` exists as
`20260731203011` on `lane/margin-finalize-lag` (`a6a1174b`) and as `20260801084923` on the chain — same
name, same DDL, two ids, **no `IF OBJECT_ID` guard**, so the second `Up()` fails hard on a fresh database.
Ruled `keep-23f6bbeb`: keep the chain's, drop the forked one. `a6a1174b` is an ancestor of **neither** side,
so the merge excludes it by construction — which is exactly why it is written into the ledger, because
construction is not what stops the next person merging that branch.

*(The decision's option text cites `23f6bbeb`/`20260801102621` as the duplicated pair. Measured, that pair
is MIG-21's `Workforce_PublicationReceiptUniqueness`, which is not duplicated; the duplicated pair is the
Margin one. The plan already records this as a known wrong citation, and it resolves the same way.)*

Verified in the merged tree: **136 migrations, no duplicate id, no duplicate name, exactly one
`FinalizedImmutable`, every migration paired with its Designer**, and `20260731203011` absent.

**Re-parented:** the Growth ledger entry 22 → 29, plus the two live pointers into the ledger that the
renumber would otherwise have left stale (`ApplicationDbContext.GuardAppendOnly`'s comment and
`GrowthAuditWriterTests`' summary) — the last renumber left four such headers behind on merged lane tips.
The third pointer, in `lanes/L-GROWTH-FAMILY-LAND/merge-receipt.md`, is **deliberately not edited**: a
receipt is evidence about its own SHA, and the estate's rule is to record the now-false claim rather than
reach into another lane's receipt. The MIG-28 reservation names the new parent the finalize migration's
Designer must be **regenerated** against — `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` — plus the
two things that travel with it (the `GrowthAuditEvents` fold-in to strip, and `lane/ef-index-shadow-sweep`'s
self-re-deriving `Parked` entry that reds the day that fix lands).

## 4. Replayed from empty, and the model checked against the chain rather than trusted

`has-pending-model-changes` at the merge commit reports **changes pending**. That is not a merge defect and
it was not left as a sentence: a probe migration was generated and read, and its `Up()` is **exactly**
`CreateTable GrowthAuditEvents` plus its two indexes — **nothing else**. `bd3a840f` put that entity into
`OnModelCreating` with no migration, on the integration side, before this merge existed. So the merge
introduces **no new model-vs-chain drift**, and the whole delta is MIG-29's debt, which owes a trigger a
generator cannot produce and is therefore recorded rather than folded in. The probe was generated in a
throwaway worktree that was destroyed; `probe-up.txt` is the reading.

## 5. Four defects, and three of them exist only at the join

**(a) A download-serving controller nobody was driving.** The fast tier at `7e7c0a3e` failed
`DownloadHeaderWireTests.Every_controller_that_serves_a_file_names_it_and_is_accounted_for`. That census
suite is **integration-only**; `WorkforceTimesheetsController` is **stack-only**. Neither branch could see
the other. Its export-batch route passed the "is the file named" half and failed the census half, and there
is **no wire test anywhere at that commit** touching the route — so its `Content-Disposition` had never been
seen by anything. Closed by driving it: a real 200 through the real route, asserting the filename and the
`Access-Control-Expose-Headers` off the same response. Actor references seeded **by value** (approving
engagement, requesting admin) because a timesheet cost is a money-path row (C4), and the seeded digest is
computed from the seeded bytes rather than pinned.

**(b) A comment the merge made false.** The same action sets `X-Okam-Content-Sha256` and explained that a
browser cannot read it because `BrowserReadableHeaders` "is on an unmerged lane". That lane is
integration-side and merged here, so the sentence is false at the merge commit. The fact replacing it is
worse than it implied: the header is **absent** from `BrowserReadableHeaders.All` while the sibling Meals
integrity digest `X-Meals-Content-Hash` is **present** — two integrity digests treated differently with no
stated reason. **Not fixed**: exposing a header changes the CORS policy surface, which is a judgement and
not a merge conflict. The one-line change is named in the comment and in the return.

**(c) The flake that fires on merges.** `EventsOutboxDeliveryTests.The_message_carries_the_link_and_no_other_guest_data`
asserts `DoesNotContain("250", body)` against a body carrying a random-GUID link; the token drawn here was
`1c52e7b9-…-ed2250a71e24`. Pre-existing (**byte-identical to `feature/restaurant-modules`**, untouched by
every link) and proven non-deterministic rather than argued: **15/15 on re-run against the same binary, no
rebuild between**. It failed the seven-link landing too, which named the fix and left it. Made here: the
absence assertions run against the body **with the link removed**, since the line above already pins the
link present. Proven still able to red **by mutating the product, not the test** — injecting
`Depositum 250 kr` into the mail body fails it 14/15 — and the restore verified **by content** (`strings` on
the built assembly) rather than by timestamp, because a restore that preserves an old mtime is precisely how
a mutation check ends up measuring the mutant it thinks it reverted.

**(d) Inherited, stated, not fixed:** the `GrowthAuditEvents` drift of §4.

## 6. What was checked instead of trusted

- `Program.cs` auto-merged: `IWorkforceTimesheetService` and `ITimesheetExportProvider` registered **exactly
  once each**; the only multi-registrations are three `IEnumerable` fan-ins **byte-identical** to the
  integration side.
- `ApplicationDbContext` auto-merged: no duplicate `DbSet`, no duplicate index name.
- `IMarginWasteService` reaches a controller through `AddMarginModule()`, called once from `Program.cs` (C3).
- The build at the merge commit is **0 errors** — which is itself the proof that the 126 non-migration files
  merged coherently, and not a claim about them.

## 7. Runs

Every run from a **clean checkout of one commit** in a detached worktree, never `--no-build`, with no source
newer than the assembly asserted before recording.

| SHA | tier | result |
| --- | --- | --- |
| `7e7c0a3e` (merge) | fast `Database!=SqlServer` | 4701 / **1** / 10 — the census red of §5(a) |
| `346fd4f0` | fast `Database!=SqlServer` | 4702 / **1** / 10 — the flake of §5(c) |
| `24cd4ead` | fast `Database!=SqlServer` | **4703 / 0 / 10** |
| `24cd4ead` | **SQL `Database=SqlServer`** | **565 / 22 / 587**, 51 m 25 s |
| `8e2b57de` (INT, control) | **SQL**, the 19 failing classes | **224 / 21 / 245** |

Branch tip `7f8945dc` (the receipts commit). `feature/restaurant-modules` **unmoved at `8e2b57de`**; my
branch is **0 behind / 38 ahead**, a strict descendant, so the landing is a fast-forward the owner can take.
Nothing pushed — neither ref exists on `origin`.

Containers: started only by my own test processes, two at a time at most, reaped by their own ryuk. One
foreign container ran throughout the later runs and was not touched; `containers-before.txt` records the
state before I started.

## 8. The SQL tier's 22 reds are the integration branch's, and that is measured

**This is the first execution of the SQL tier at any SHA carrying what `feature/restaurant-modules` has
landed since 2026-08-01.** The previous run at any SHA was `50b85657`, on the chain side, five days ago. So
the merge did not create these; it made them visible.

Proven rather than argued: all nineteen failing classes were re-run **at `8e2b57de` alone**, and the failing
set is **identical test for test** — 21 of 21. Nothing fails at my tip that passes on the integration
branch. The twenty-second, `TrainingW3MigrationLineageTests`, has no baseline because that class does not
exist on the integration branch; it arrives with the stack and observes the same single cause.

**Cause 1, 20 of 22 — `GrowthAuditEvents` (MIG-29).** 15 are `HasPendingModelChanges()`. The other **5 are
a live product defect**: on a chain-built database the table is absent, so the audit write inside
`GrowthDispatchService.CreateOrGetRunAsync` throws, and that method's `catch (DbUpdateException)` — written
for the single case of a competing request winning the unique `NewsletterVersionId` — **catches every
`DbUpdateException`**, so a missing table is misdiagnosed as a lost race and the recovery path reads a run
that never committed. **Newsletter dispatch fails on any database built from the chain**, which is every
real one. The fast and wire tiers cannot see it: they build from the model with `EnsureCreated()`, where the
table exists. Two independent fixes — author MIG-29, and narrow that catch.

**Cause 2, 1 of 22 — one publish, two outbox rows.**
`SchedulePublishSqlServerTests.Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically`
finds 2 `WorkforceNotificationOutbox` rows where it expects 1, while the publication, recipient and inbox
assertions above it all pass — so the fan-out is right and the notification is duplicated. The only writer,
the test, the fixture and the seeded world are byte-identical to `feature/restaurant-modules`; the stack
touches none of them.

**Neither is fixed here.** Both are the integration branch's, and a merge lane that quietly repaired them
would have hidden the fact that five days of work went unmeasured.

# L-MRG-WASTE — full detail

Companion to `docs/plan/returns/L-MRG-WASTE-2.md` (the final RETURN; `-1.md` is the superseded `blocked` one).

## Where the chain tip actually was, and what I branched from

**Branched from `3993f797`** (worktree `wt-trainw3`, detached — the branch name the brief gave,
`lane/train-w3-schema`, does not exist), on a new branch `lane/margin-waste` in worktree
`/Users/svendaneel/okam/wt-mrgwaste`.

Established, not assumed:

- `git merge-base --is-ancestor 3993f797 feature/restaurant-modules` → **NOT an ancestor**. Eleven commits
  live only there, including the two migrations the brief warned about.
- `Migrations/` at `feature/restaurant-modules` ends at `20260731220005_Workforce_IdentityCodeRegisterIssues`.
  At `3993f797` it ends at `20260801113131_Training_W3_ChecklistsAndDeviations`, with
  `20260801084923_Margin_PeriodStatementFinalizedImmutable` and
  `20260801102621_Workforce_PublicationReceiptUniqueness` in between. Branching from the feature branch
  would have forked the chain a **third** way.
- My Designer's parent is therefore `20260801113131`. Verified by diffing the two Designer files with the
  class identity normalised: **79 additions, 0 removals** — my table and nothing else.
- `dotnet ef migrations has-pending-model-changes` → *"No changes have been made to the model since the last
  migration."*

I did **not** merge `feature/restaurant-modules` (now `24dec838`). Its delta from the point already merged
into the chain tip touches `Entities/`, `Enums/` and `Helpers/ApplicationDbContext.cs` only as a
**comment-only** change to `GrowthPrivacyRequest` plus two new Growth enums that no entity maps, so my
Designer stays valid across that merge, and staying off it keeps my tier delta attributable to the 557/557
baseline.

## The ledger number

**MIG-23**, checked against the whole ledger rather than taken from the brief. MIG-1…MIG-22 are all claimed
(21 and 22 were both taken on 2026-08-01 and the numbering had already been corrected once); 23 was free.
THROW **50062** re-verified as unclaimed across every `CREATE TRIGGER` in the chain — Margin's block holds
50060 (sales facts) and 50061 (statement freeze).

## The research claim, verified before building on it

The brief asked me to verify that the coverage panel already itemises uncovered buckets, so waste is
additive rather than a rework. **True.** `components/admin/margin/MarginCoveragePanel.vue` already renders
three itemised sections (uncovered top-sellers, broken links, price freshness) off
`MarginCoverageResponse`. Waste is a fourth section and a fourth response field; nothing was restructured.

## The spec conflict I found, which the brief did not name

`docs/plans/modules/50-food-margin-spec.md` §2 **explicitly defers "Reason-coded waste events" to M3**, in a
row that also carries stock locations, the movement ledger, valuation policy and count sheets.

What landed is one part of that row's first clause and nothing else:

- **Landed:** a dated, reason-coded record, valued by the operator or from the same effective supplier price
  the theoretical cost already uses, reported as an additive bucket on the coverage read.
- **Still M3:** stock locations, movement ledger, valuation policy, count sheets, finished-product sold-out
  reconciliation, and **ledger-derived actual-versus-theoretical** — v1 still uses the purchase-spend proxy.
- **No statement figure moves**, pinned on both tiers.

That distinction is why it was buildable now: it narrows the gap **without asking a venue to count**, which
is what every remaining M3 item requires. It is still a departure from a binding document, so I amended the
spec to record it (endpoint table 37 → 41, a §2 departure note, the UI row) rather than leaving a document
that describes a module the code no longer is. **Sven's ratification is owed.** Rolling it back is a
`Down()` and a panel.

## What was built

### Backend (`lane/margin-waste`, 6 commits)

| | |
| --- | --- |
| `Entities/Margin/MarginWasteEntry.cs` | `(StoreId, WasteDate)`, closed reason vocabulary, optional intra-Margin ingredient FK + quantity in its base unit, nullable `ValueMinor` + `ValuationSource`, actor, rowversion |
| `Enums/Margin/MarginWasteReason.cs` | Spoilage, Preparation, Breakage, StaffMeal, CustomerReturn, Complimentary, Other |
| `Enums/Margin/MarginWasteValuationSource.cs` | Unvalued / Stated / PriceBook |
| `Migrations/20260801132512_Margin_WasteEntries.cs` | MIG-23 + `TR_MarginWasteEntries_FrozenWeekImmutable` (THROW 50062) |
| `Services/Margin/MarginWasteService.cs` | list / summarise / create / update / delete, valuation, refusals |
| `Controllers/MarginWasteController.cs` | 4 routes behind `Margin.Module` AND `Margin.Statements` |
| `Helpers/ApplicationDbContext.cs` | DbSet, model config, `MarginWasteFreezeTrigger`, `GuardWasteEntryFrozenWeekImmutable` |
| `Services/Margin/MarginCoverageService.cs` | the additive waste bucket on `GET margin/coverage` |
| `Helpers/StoreMarketHistory.cs` + `Services/StoreMarketService.cs` | waste joins the money anchors, and is actually probed |

### Frontend (`feature/restaurant-modules` in `Web-modules`, 1 commit `7b99f2a`)

`MarginWastePanel.vue` (list + record form + per-row delete), the coverage panel's waste section,
`utils/margin/waste-client.js`, `utils/margin/waste-reasons.js`, `readWasteSummary`/`readWasteEntries`,
the page wiring, and 3 × ~35 i18n keys (no/en/de).

## The three design calls worth arguing with

1. **The table hangs off `(StoreId, WasteDate)`, not off a statement id.** Waste is recorded days before
   anyone opens the week, and a week carries several statement REVISIONS — an entry owned by a statement id
   would either belong to the superseded revision or have to be copied forward, and copying an operator's
   record of a loss is the rewrite this estate forbids everywhere else.
2. **`WasteDate` is `date`, not `datetime2`.** The trigger asks whether an entry's day falls inside a
   finalized Mon–Sun period with a `BETWEEN`; against `datetime2`, a row stamped 12:00 on the period's last
   day is greater than a `PeriodEnd` of midnight, so **the final day of every frozen week would stay
   writable** while the trigger read present and enabled. MIG-13's `BusinessDate` trap in its other form.
   Asserted as a type in the lineage suite and the round trip, and exercised by a refusal test on the last
   day itself.
3. **No unique index, deliberately.** A kitchen throws out tomatoes twice on a Tuesday, so uniqueness here
   would be a silent de-duplicator of real losses. The read index is asserted `is_unique = 0` — the mirror
   image of how the estate's uniqueness guards are asserted, and the reason the brief's filtered-index trap
   does not apply to this lane.

## The defect I found in my own guard, and how

Reading the layer-1 guard back before the tier run: `FinalizedStatementPeriods` consulted the change tracker
in **both** directions, so a tracked non-finalized statement could REMOVE a period the database read had
found. A week's revisions share `(StoreId, PeriodStart, PeriodEnd)`, so **an Open correction revision
cancelled its own finalized predecessor's freeze** — and the trigger, which asks only whether ANY covering
statement is Finalized, would still have refused. The operator would have met a raw 50062 on SQL Server
where layer 1 had already waved the write through, and would have been permitted it outright on every other
provider. Fixed (the tracker can only ADD), pinned by
`An_open_correction_revision_does_not_unfreeze_the_week_it_corrects`, and falsified: restoring the old
branch fails that test and nothing else.

The estate's own meta-tests caught a second one: `MarginStatementRefusalCodeTests` invokes every refusal
factory reflectively with default arguments, and `WasteReasonUnknown(null)` threw `ArgumentNullException`
from `string.Join`. Null-tolerant now, like `SpendCurrencyMixed`.

## Falsification, not assertion

| guard | falsified how | result |
| --- | --- | --- |
| `TR_MarginWasteEntries_FrozenWeekImmutable` | `Dropping_the_trigger_lets_the_frozen_week_be_rewritten` drops it on the harness's own throwaway catalog, repeats the identical INSERT, re-creates it | refused → **ACCEPTED** → refused |
| `GuardWasteEntryFrozenWeekImmutable` | both `GuardWasteEntryFrozenWeekImmutable()` call sites replaced with a comment, rebuilt, re-run | 7 fast-tier tests red; restored with `cp` + `touch` and a confirmed rebuild (assembly mtime moved) → green |
| the coverage wiring | `Waste = await _waste.SummariseAsync(...)` deleted from the response | the exit-criterion test red |
| the tenant predicate | `e.StoreId == storeId` dropped from the waste read | `The_waste_list_shows_one_stores_losses_only` red, and only that one |
| the tracker branch | old two-direction branch restored | `An_open_correction_revision_...` red, and only that one |

Every SQL-tier refusal is additionally paired with an **open-week control** performing the identical
statement, and the DELETE proof asserts from `sys.foreign_keys` that nothing references the table before
issuing it — SQL Server evaluates FK constraints before an AFTER trigger, so a refusal by a reference check
would certify the foreign key and pass with the trigger dropped.

## RESOLVED — the SQL tier ran, 568/568

The owner authorised a Docker recovery and an infrastructure agent carried it out. Both tiers then ran at
one SHA (`50b85657`) on a healthy host: **SQL 568/568/0 skipped**, fast 4342/0/9, 11 added and 0 removed on
the SQL tier, every outcome read individually from the `.trx`. Receipt:
`artifacts/tests/50b85657/RUN.md`. The chain tip was re-checked before anything was applied and had not
moved. Nothing unexpected came back and the migration needed no change.

**Correction to my own count:** I reported ten trigger tests owed; there are **eleven** — the class also
carries the error-334 regression on the ordinary write path.

The history below is kept because the killed first attempt earned its keep: it found a real defect before
the VM died.

## What went wrong the first time, and what it caught

Started twice at this branch.

**Run 1**, at the superseded `f905362b`, executed ~15 minutes and produced exactly ONE genuine failure:
`MarginW2MigrationLineageTests.All_four_recipe_w2_tables_are_created` — the SECOND exact-full-Margin-set
assertion in the suite, and the one the fast tier cannot see. Real finding, fixed in `13217cfd`.

**Run 2**, at `13217cfd`, died 7 minutes in with every remaining test reporting
`A transport-level error has occurred… Connection was terminated` — the container being killed, not a code
regression. The VM's own console log gives the cause:

```
EXT4-fs error (device vda1): ext4_journal_check_start:84: comm dockerd: Detected aborted journal
EXT4-fs (vda1): I/O error while writing superblock
EXT4-fs (vda1): Remounting filesystem read-only
```

**Corrected an hour later, because it changes the remedy.** `Docker.raw` has NOT grown since the VM died —
it is byte-for-byte its size at `16:39`, and the VM has been down since. Yet the host kept losing space with
this lane idle: **30 GiB free at 17:03, 9.4 GiB at 17:25, 15 GiB a minute later**, oscillating as other
lanes build and test. The working set is the estate itself — `~/okam` **122 GB**, `/private/var/folders`
**34 GB**, `~/Library/Application Support` **28 GB**, `/private/tmp` **23 GB** on a 926 GB volume at
**99 %**.

Docker's image is therefore a symptom, and the obvious remedy is the wrong one: purging Docker data
reclaims ~66 GB once and this host fills again. **It cannot reliably run a Testcontainers SQL tier until the
estate's working set is reclaimed** — an owner decision, since the documented sweep disrupts every lane
mid-build and `mac-disk-pressure` warns that a naive `-name bin` sweep also guts `node_modules` binaries.

Recovery attempted and abandoned: Docker Desktop quit and restarted, then the wedged VM process
force-stopped and restarted, with **zero containers running** (`docker info` → `running=0`). Nothing
belonging to any lane was killed or removed, and `docker ps -a` had already stopped listing the eight
pre-existing stopped containers **before** any restart was issued — that loss belongs to the filesystem
abort. The VM did not come back.

**Consequence: MIG-23 is proven at layer 1 only.** Still owed, and named test-by-test in
`artifacts/tests/13217cfd/RUN.md`: the ten `MarginWasteFrozenWeekSqlServerTests` (THROW 50062 on raw
insert/update/delete/cross-week move, each against an open-week control; the last-day boundary the `date`
column exists for; the no-incoming-FK assertion; the drop-the-trigger falsification; the error-334
regression), the empty → rollback → re-apply round trip, and the two lineage exact-set assertions.

## Not done, and owed

- **Sven's ratification of the §2 departure.** The spec is amended to say what landed and what did not; the
  scope call is his.
- **Nobody has walked the UI.** The panel, the form and the freeze behaviour are proven by 22 frontend tests
  and 27 backend ones. That is evidence the code behaves; it is not acceptance (C5).
- **The migration is applied to no database by this lane.** Deployment is the owner's, as everywhere in
  `docs/plans/PENDING-MIGRATIONS-LEDGER.md`. Every proof is against throwaway Testcontainers catalogs.
- **`ValuationSource` is written and read but never filtered on.** The list surfaces it; no read groups by
  it. That is a data-reachability question a call-graph sweep cannot see, and it is deliberate for now.

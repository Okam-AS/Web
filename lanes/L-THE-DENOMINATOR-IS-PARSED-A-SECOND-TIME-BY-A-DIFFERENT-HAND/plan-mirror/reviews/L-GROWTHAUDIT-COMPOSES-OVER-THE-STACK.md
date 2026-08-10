# Review — does `lane/growthaudit-migration` compose over the stack?

Lane: L-GROWTHAUDIT-COMPOSES-OVER-THE-STACK · brief fa1078fd · 2026-08-06
Repo read: `/Users/svendaneel/okam/OkamAPI-modules` (read-only; no checkout, no build, no container — a reading, not a run).

## Verdict

**COMPOSES.** `lane/growthaudit-migration` (tip `93a52938e`) replays over the composed stack without a
duplicate-object failure and without a parent mismatch. The parent it declares and the id at the stack tip
are the **same migration**: `20260803093235_Kassa_AccountingSummaryDayUniqueIndex`. No rebase is needed.

Scope of the verdict: everything a reading of the chain and the Designer snapshots can establish. The
replay-from-empty run itself was not executed — no SQL slot was granted. The lane's own commit message
reports a chain-built SQL-tier run (593/1/594); that is the author's claim, cited here as context, not as
this review's evidence.

## The two tips, and which one the id was read from

- `integration/mig-stack-merge` = `7f8945dc6` ("Record both tiers at the merge tip…").
- `lane/backend-patches-composed` = `2ba9229fa`, **four** commits ahead of `7f8945dc6` (the clerk's note
  says three): the three landed backend patches `d8c98c200` (Meals company-return credit), `f3817eed9`
  (Tripletex claim window), `ea66353f9` (Workforce superseded-publication exclusion), plus `2ba9229fa`
  itself, which is evidence-only (`artifacts/tests/**`, `lanes/**` — no code).
- **The stack-tip migration id below was read from `lane/backend-patches-composed` (`2ba9229fa`)**, the
  ref carrying today's landed patches. It is identical at `integration/mig-stack-merge`, because
  `git diff 7f8945dc6 2ba9229fa -- Migrations/ Helpers/ApplicationDbContext.cs Entities/` is **empty**:
  none of the four commits touches a migration, the snapshot, the DbContext or an entity.

## Question 1 — which parent id does the lane migration declare?

The lane adds exactly one migration, `20260806125642_Growth_AuditLedger` (`[Migration]` attribute in its
`Designer.cs`). Its parent — the migration immediately preceding it in the chain on the lane branch,
verified by `git ls-tree 93a52938e Migrations/` sorted order, not by trusting the commit message — is:

    20260803093235_Kassa_AccountingSummaryDayUniqueIndex

The lane branch is based exactly on `7f8945dc6` (`git merge-base lane/growthaudit-migration
lane/backend-patches-composed` = `7f8945dc6`), i.e. it was authored against the composed stack's own base.

## Question 2 — what id is at the composed stack tip?

At `lane/backend-patches-composed` (`2ba9229fa`), the last migration in `Migrations/` by timestamp is:

    20260803093235_Kassa_AccountingSummaryDayUniqueIndex

**Parent id == tip id.** The new migration's timestamp `20260806125642` sorts strictly after every
migration on the stack, so it appends at the end of the chain with no interleave.

## Question 3 — does any migration on the stack already create an object this one creates?

Checked by grep over `Migrations/**` at `2ba9229fa` — all clean:

| Object | Collision at composed tip? |
|---|---|
| Table `GrowthAuditEvents` | none — no migration mentions the name (grep rc=1) |
| `IX_GrowthAuditEvents_AggregateType_AggregateId` | none |
| `IX_GrowthAuditEvents_StoreId_OccurredAt` | none |
| Trigger `TR_GrowthAuditEvents_AppendOnly` | none |
| `THROW 50074` | unclaimed — the stack's highest is `50070–50073` (`20260801174639_Workforce_W5_Timesheets.cs`), so 50074 is the first free number, as the migration body states |

## Question 4 — does its snapshot carry anything besides the one table?

No. Verified three ways on the file bodies (from `#pragma warning disable 612, 618` to EOF, so the
class/attribute header noise is excluded):

1. **Designer vs lane snapshot**: `20260806125642_Growth_AuditLedger.Designer.cs` body is
   **byte-identical** to the lane's `ApplicationDbContextModelSnapshot.cs` body (`diff` clean).
2. **Lane snapshot vs base snapshot** (`7f8945dc6`): exactly **one hunk**, `2410a2411,2458` — 48 inserted
   lines, zero deletions, zero modifications: the `WebApi.Entities.Growth.GrowthAuditEvent` entity block
   (PK `Id`, `ActorKind` nvarchar(16) NOT NULL, the value-scoped nullable `StoreId`, the two non-unique
   indexes). Entity count 427 → 428. `ProductVersion` unchanged (8.0.26) — inside the single hunk there is
   nothing else, so `ef migrations add` folded in no unrelated drift.
3. **Migration body vs model**: the `CreateTable`/`CreateIndex` calls match the pre-existing
   `OnModelCreating` mapping at the base (`Helpers/ApplicationDbContext.cs` ~3959–3974) column-for-column
   and index-for-index. The lane's edits to `Entities/Growth/GrowthAuditEvent.cs` and
   `Helpers/ApplicationDbContext.cs` are **comment-only** (retiring the "layer 2 does not exist yet"
   caveats) — no mapping change, so no C2 index-without-migration exposure is introduced.

Since Entities/DbContext are identical at both tips and the lane's snapshot equals model + this one
entity, `HasPendingModelChanges()` answers **false** after the lane lands on either tip. There is also no
file-level merge conflict to resolve: the composed stack never touches
`Migrations/ApplicationDbContextModelSnapshot.cs` after the common base.

## Constraint notes

- **C2**: satisfied — one new migration, parent = current chain tip, no shared parent, snapshot single-purpose.
  This lane is the *closure* of the pre-existing C2 violation (entity + indexes in `OnModelCreating`, no
  migration — the `AccountingSummaries` shape).
- **C1**: the migration adds an AFTER UPDATE, DELETE deny-trigger on a new table; `Down()` drops trigger
  then table. No UPDATE/DELETE against any existing append-only table. No backfill (table is new).
- **C7**: nothing logged; no log calls in the diff.

## What was NOT verified (honest limits)

- No fresh-database replay was run (no SQL slot). The reading rules out the two failure classes named in
  the exit criteria — duplicate object and parent mismatch — and snapshot drift; it cannot substitute for
  the eventual chain replay the landing itself must carry.
- Other in-flight lanes were not swept for competing unmerged migrations; the verdict is against the
  composed stack as it stands at `2ba9229fa`.

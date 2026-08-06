# L-MIG-NUMBER-CLAIMS — every pending migration number, and the branch claiming it

**Derived 2026-08-05 from the branches of `/Users/svendaneel/okam/OkamAPI-modules`.** Neither ledger copy was
used to decide who claims a number. Both copies were opened only to learn the *format* of a header line and to
read the prose of entries that have no migration behind them; every attribution below comes from a migration
file in a tree, an introducing commit found with `--diff-filter=A`, and an ancestry test.

Baseline `INT = feature/restaurant-modules @ 8e2b57de` (tip, last moved 2026-08-04T12:00:29).
Stack tip `6fa2cbc3 = lane/wf-bootstrap-one-engagement`.

---

## 0. Denominator — what was checked, so the collision list is not "the ones somebody noticed"

| measured | count |
| --- | --- |
| refs enumerated, backend `refs/heads` | **317** |
| refs enumerated, backend `refs/lanes` | **0** (the namespace does not exist in this repo) |
| refs enumerated, frontend `Web-modules` `refs/heads` / `refs/lanes` | **102 / 7** |
| ref × migration-file rows scanned | **33,108** |
| distinct migration files across all refs and all eras | **181** |
| distinct migration files in the pending epoch (id ≥ `20260730`) | **19** |
| refs carrying a copy of `docs/plans/PENDING-MIGRATIONS-LEDGER.md` | **184** of 317 |
| distinct ledger blobs among them | **28** |
| **MIG numbers checked** | **28** (MIG-1 … MIG-28) |
| **numbers with more than one claimant** | **5** (MIG-12, 19, 20, 21, 22) |

No number above MIG-28 and no gap below it exists on any ref: the 28 are contiguous.

**Frontend is empty of this problem, confirmed rather than assumed.** Across all 109 frontend refs (both
namespaces) there is no `PENDING-MIGRATIONS-LEDGER.md` and no `Migrations/` directory at all. A sweep run
there returns a clean world for the reason the brief names.

### Instrument validation, before any count

The brief named one known positive. It was reproduced first:

```
git show feature/restaurant-modules:docs/plans/PENDING-MIGRATIONS-LEDGER.md | grep '^### MIG-22 '
  => ### MIG-22 `Growth_AuditLedger` — the table Growth's whole audit ledger is written into
git show lane/wf-bootstrap-one-engagement:docs/plans/PENDING-MIGRATIONS-LEDGER.md | grep '^### MIG-22 '
  => ### MIG-22 `Margin_PeriodStatementFinalizedImmutable` — ✅ LANDED as `20260801084923`
```

The instrument answers positively on the known positive. `${REF}:path` was braced everywhere; a bare
`$REF:path` in zsh applies a history modifier and reports the file absent.

The collision set was then **derived a second, independent way** — on whole normalised header lines with
status decoration stripped, rather than on the parsed backticked name, so that an entry with no backticks
(MIG-6, 14, 15, 17) could not hide a collision behind an empty string. Both derivations returned the same
five numbers.

---

## 1. What counts as a claim

Three distinct things get conflated by the word, and separating them is what makes the list actionable:

- **Backed claim** — a migration file exists on a branch, and its introducing commit allocated the number in
  the same commit. This is a claim.
- **Reservation** — a ledger entry allocates a number to work that has no migration file anywhere. Legitimate:
  this is a *pending* ledger, and most of its entries are specifications awaiting an author. It becomes a
  defect only when a reservation and a migration hold the same number.
- **Unnumbered migration** — a migration file exists and no ledger entry names it. Two of these exist.

---

## 2. The list — all 28 numbers

`refs` = number of refs carrying the migration file. `INT` = present on `feature/restaurant-modules @ 8e2b57de`.

| # | subject | migration file | introduced by | refs | INT | kind |
| --- | --- | --- | --- | --- | --- | --- |
| MIG-1 | `Events_PaymentReceiptActor` | `20260730143214_…` | `d6e35955` | 175 | yes | backed |
| MIG-2 | `Events_SettlementLineActor` | `20260730143345_…` | `d6e35955` | 175 | yes | backed |
| MIG-3 | `Events_SettlementReconciledBy` | — | declined at `e4d43aad` | 0 | — | retired, not a debt |
| MIG-4 | `Margin_PriceImportApprovedBy` | `20260730143446_…` | `d6e35955` | 175 | yes | backed |
| MIG-5 | `Growth_NewsletterVersionAuthor` | `20260730143532_…` | `d6e35955` | 175 | yes | backed |
| MIG-6 | Kassa journal append-only triggers | — | — | 0 | — | reservation |
| MIG-7 | `AccountingSummaries` unique index | `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` | `c606993a` | 5 | **no** | backed, off INT |
| MIG-8 | `ZReport` credit-sale columns § 2-8-2 t/v | — | — | 0 | — | reservation |
| MIG-9 | `GrowthConsentTextVersion` trigger | `20260730150953_Growth_ConsentTextVersionAppendOnly` | `d6e35955` | 175 | yes | backed |
| MIG-10 | Meals `TradingDay` column | — | — | 0 | — | reservation |
| MIG-11 | `TheoreticalIngredientCostMinor` → `long?` | — | — | 0 | — | reservation (conditional) |
| MIG-12 | `Training_W2_Onboarding` | — | — | 0 | — | reservation · **collision, resolved** |
| MIG-13 | `Training_W3_ChecklistsAndDeviations` | `20260801113131_…` | `8c479d99` | 14 | **no** | backed, off INT |
| MIG-14 | Workforce schedule evidence-receipt triggers | — | — | 0 | — | reservation (was MIG-12) |
| MIG-15 | Growth retention vs deny-triggers | — | — | 0 | — | reservation, BLOCKED (was MIG-12) |
| MIG-16 | `Events_VenueSettings` | — | — | 0 | — | reservation (was MIG-12) |
| MIG-17 | Meals member reference | `20260731215452_Meals_MembershipEmployeeReference` | `241e042e` | 146 | **yes** | **backed and unrecorded — see §4** |
| MIG-18 | `MealsGuardDriftObservation` | — | — | 0 | — | reservation (conditional) |
| MIG-19 | `Events_LineVatRate` | — | — | 0 | — | reservation · **collision, live** |
| MIG-20 | `Events_DietaryRequirements` | `20260731210732_…` | `9acf4523` | 146 | yes | backed · **collision, live** |
| MIG-21 | `WorkforceSchedulePublicationReceipts` uniqueness | `20260801102621_Workforce_PublicationReceiptUniqueness` | `23f6bbeb` | 14 | **no** | backed · **collision, live, two files** |
| MIG-22 | `Margin_PeriodStatementFinalizedImmutable` | `20260801084923_…` | `d6b0630f` | 14 | **no** | backed · **collision, live** |
| MIG-23 | `Margin_WasteEntries` | `20260801132512_…` | `034ec87a` | 14 | **no** | backed, off INT |
| MIG-24 | `Workforce_W5_Timesheets` | `20260801174639_…` | `bae24028` | 12 | **no** | backed, off INT |
| MIG-25 | `Workforce_TimesheetExportSingleSucceeded` | `20260802103646_…` | `3a4442a7` | 9 | **no** | backed, off INT |
| MIG-26 | `Workforce_TimesheetAdjustmentOrdinal` | `20260802151208_…` | `cff1c005` | 7 | **no** | backed, off INT |
| MIG-27 | `Meals_CompanyReceivableAccount` | `20260803090036_…` | `32c56fa4` | 6 | **no** | backed, off INT |
| MIG-28 | `Workforce_BootstrapFirstEngagement` | `20260803124302_…` | `6fa2cbc3` | 1 | **no** | backed, off INT |
| — | **no number at all** | `20260731220005_Workforce_IdentityCodeRegisterIssues` | `a04f51ca` | 146 | yes | **unnumbered — see §4** |

The 14 refs carrying MIG-21/22/23 are the stacked set: `integration/mig-stack-land`, `lane/acct-uidx`,
`lane/ef-index-shadow-sweep`, `lane/margin-waste`, `lane/margin-waste-500`, `lane/mig-company-receivable`,
`lane/review-residuals-rezone`, `lane/wf-adjustment-ordinal`, `lane/wf-bootstrap-one-engagement`,
`lane/wf-digest-tautology`, `lane/wf-export-duplicate`, `lane/wf-timesheet-race`, `lane/wf-timesheet-wire`,
`lane/wf-w5-timesheet`. That set is `L-MIG-STACK-RECORD`'s and is not re-derived here.

---

## 3. The five collisions

### MIG-22 — a migration and a reservation, both live, and the reservation is the one on INT

| claimant | what | where | migration file |
| --- | --- | --- | --- |
| `d6b0630f` 2026-08-01T10:52 | `Margin_PeriodStatementFinalizedImmutable` | 14 stacked refs, **not on INT** | `20260801084923_…` |
| `bd3a840f` 2026-08-03T14:17 | `Growth_AuditLedger` | **on INT** and 37 lanes cut from it | **none** |

`git show --stat bd3a840f` adds 28 files — entity, writer, allowlist, controller, DI, tests, and 58 ledger
lines — and **no migration file**. Its own commit message says so: *"THE MIGRATION IS NOT AUTHORED — another
lane holds the slot and the chain is eight past the integration branch. Specified as MIG-22 in the pending
ledger."* So under the brief's own definition this is **a reservation colliding with a backed claim**, not two
migrations claiming one number. The distinction matters to the remedy: MIG-22 can be freed by renumbering a
ledger entry alone, with no migration file to regenerate and no Designer snapshot to re-parent.

It is also, separately, a live C2 exposure: `bd3a840f` adds `DbSet<GrowthAuditEvent>` and a
`GrowthBuilder` configuration carrying two indexes to `Helpers/ApplicationDbContext.cs` with no migration in
the same diff. That is the `AccountingSummaries` shape exactly — model-built test databases have the table,
the migration chain does not.

### MIG-21 — the only place two real migration files claim one number

| claimant | what | where | migration file |
| --- | --- | --- | --- |
| `a6a1174b` 2026-07-31T22:43 | `Margin_PeriodStatementFinalizedImmutable` | `lane/margin-finalize-lag` **only** | `20260731203011_…` |
| `23f6bbeb` 2026-08-01T12:35 | `WorkforceSchedulePublicationReceipts` uniqueness | 14 stacked refs | `20260801102621_…` |

Neither is an ancestor of the other (`--is-ancestor` non-zero both directions). This is the strongest form of
the defect and it is the one the ledger cannot see from either copy: `lane/margin-finalize-lag`'s MIG-21
header exists on exactly **1 of 184** refs.

**And it is the same DDL twice.** `diff` between the two files returns **only an 8-line explanatory comment**:
identical `CREATE TRIGGER [dbo].[TR_MarginPeriodStatements_FinalizedImmutable]`, identical `THROW 50060` and
`THROW 50061` bodies. The `Up()` carries **no `IF OBJECT_ID` guard and no `DROP TRIGGER IF EXISTS`**, so
landing both branches does not "apply the schema change twice" harmlessly — the second `Up()` fails hard on
`CREATE TRIGGER` against an object that already exists, on a fresh database, after the first has committed.
`d6b0630f`'s own comment states the cause: `20260731203011` was generated off Designer parent
`20260730150953_Growth_ConsentTextVersionAppendOnly`, the same parent as
`20260731210732_Events_DietaryRequirements` — two migrations on one parent, C2's exact violation clause.

`a6a1174b` is therefore **superseded but not withdrawn**: it is still a branch tip, still the only carrier of
its file, and nothing on it records that `d6b0630f` replaced it.

### MIG-19 and MIG-20 — `lane/trb2`, a stalled WIP nobody renumbered

`lane/trb2 @ ce400f72` (2026-07-30T22:28, commit message *"WIP (host overload stall, unverified)"*) is **not
an ancestor of INT** and carries **no migration file** — its diff against INT contains no `Migrations/` entry
at all. Its ledger allocates:

- **MIG-19** `Training_CertificateReviewState` — against INT's `Events_LineVatRate` (also unbacked)
- **MIG-20** (conditional on **D-Q1**) `Training_CompletionAnswerDigest` — against INT's
  `Events_DietaryRequirements`, which **is** backed by `20260731210732` and merged

Both are reservation-vs-reservation or reservation-vs-backed. Cheap to fix while the branch is dormant;
the MIG-20 side is the one that bites, because INT's holder of that number is already in the chain.

### MIG-12 — a five-way collision that already happened, and was caught

Historical, and included because it is the precedent the estate is repeating. On 2026-07-30 five different
subjects held MIG-12 across five refs:

| ref | subject |
| --- | --- |
| base ledger (`a2976577`) | `Training_W2_Onboarding` |
| `lane/wf-schedimm2 @ c11764a9` | Workforce schedule evidence-receipt triggers |
| `lane/growth-next @ eab5db62` | Growth retention vs deny-triggers |
| `lane/meals-next @ 5a2e33e1` | Meals member reference |
| `lane/events-next @ 22345c1e` | `Events_VenueSettings` |

All four lane tips are ancestors of INT (`--is-ancestor` exit 0 for each), and the collision was resolved
serially at merge time inside 35 minutes: `df8dc478` *"Renumber the Workforce receipt triggers MIG-12 ->
MIG-14"*, then `8ad36798` (→ MIG-15), `f038f805` (→ MIG-16), `e8e6ef17` (→ MIG-17). **The four stale MIG-12
headers still sit on those four branch tips**, which is why the number appears five ways in a branch sweep
and once on INT.

The lesson the estate did not carry forward: renumbering worked in July because the four lanes merged the
same evening. MIG-21 and MIG-22 have been divergent for four and two days respectively.

---

## 4. Entries with no migration, and migrations with no entry — two different findings

### 4a. A backed migration whose entry still says it was never built — and it has the pilot deadline

`20260731215452_Meals_MembershipEmployeeReference` (`241e042e`, 2026-08-01T00:20) is **on INT and 146 refs**.
It adds exactly `MealsMemberships.EmployeeReference` and `MealsInvitations.EmployeeReference`,
`nvarchar` nullable, no FK, no index — column-for-column what MIG-17 specifies.

MIG-17 in **both** ledger copies still reads:

> `### MIG-17 Meals member reference — **has a DEADLINE, not just a priority**`
> … *"⚠️ This must land before the pilot's first invitation is sent … Of everything in this ledger, this is
> the only entry whose cost rises the day the pilot starts rather than the day the squash runs."*

Measured: the string `Meals_MembershipEmployeeReference` appears **0 times in INT's copy and 0 times in the
stack's copy**, and the id `20260731215452` appears in **0 of the 28 distinct ledger blobs**. `241e042e`
touched no ledger file. So the one entry carrying a hard external deadline has been satisfied for four days
and both copies still show it outstanding. This is the inverse of a missed deadline and is worth as much: it
is a number that will be renumbered, escalated, or re-authored by someone reading a document that is wrong.

### 4b. A migration on INT holding no number at all

`20260731220005_Workforce_IdentityCodeRegisterIssues` (`a04f51ca`, 2026-08-01T09:20, *"Produce the
kodeoversikt the personalliste's § 8-5-6 claim rests on"*) is on INT and 146 refs. It has **no MIG entry in
any copy**. The stack copy names its id three times, but only as *the chain tip a later migration was parented
on* — never as an entry. INT's copy does not mention it at all.

Neither `241e042e` nor `a04f51ca` has a branch tip within 25 commits, so — as with the stack's links 1–3 —
the authoring lane is not recoverable from git and is not guessed here.

### 4c. Reservations with no migration anywhere — confirmed by content, not by filename

MIG-6, 8, 10, 11, 12, 14, 15, 16, 18, 19 and the Growth half of MIG-22 have no migration file. Verified twice:
no filename match across the 181 files on all refs, and no content match for `TradingDay`, `VenueSettings`,
`LineVatRate`, `GuardDriftObservation`, `WorkforceScheduleEvidenceReceipt`, `CreditSales`, `KassaJournal` or
`GrowthAuditEvents` inside any of the 38 pending-epoch migration blobs. `lane/kassa-journal-triggers @
041b077e`, whose name promises MIG-6, carries **no migration file** — `comm -13` against INT's `Migrations`
tree is empty. That is the RF-1313 shape restated from the branches.

---

## 5. Correction to a fact the brief carried in

**The brief states that `integration/mig-stack-land @ 4b37f81b` "collects links 1 to 9 with the integration
branch as an ancestor, so it extends rather than forks." Measured now, that is false.**

```
git merge-base --is-ancestor feature/restaurant-modules 4b37f81b   => exit 1   (NOT an ancestor)
git merge-base --is-ancestor 8e2b57de 4b37f81b                     => exit 1   (same, by sha)
git rev-list --count 4b37f81b..8e2b57de                            => 59       (INT-only commits)
git rev-list --count 8e2b57de..4b37f81b                            => 34       (stack-only commits)
```

Re-derived a second way rather than trusted: `git cat-file -e 4b37f81b:Services/Growth/GrowthAuditWriter.cs`
fails — `bd3a840f` is not in the stack, which is why INT cannot be its ancestor. The same holds for the stack
tip `6fa2cbc3` (59 INT-only commits).

This is not a stale-ref artefact. INT last moved at **2026-08-04T12:00:29** (`git reflog show --date=iso`),
about fourteen hours *before* `lanes/L-MIG-STACK-RECORD/stack.md` was written, so the claim was measurable and
wrong at its own stated baseline. The consequence is the reason it matters here: the merge-base is
`3579bbbc` (2026-08-02), and everything INT gained after it — **including `bd3a840f`, the second MIG-22
claimant** — is on the far side. Landing the stack is a hand merge across a 739-line ledger divergence with a
number collision inside it, not a fast-forward.

---

## 6. Same shape, older chain — named, and scoped out

Four further migrations exist under **one name at two different ids**, the `margin-finalize-lag` hazard
exactly:

| name | ids | where |
| --- | --- | --- |
| `Events_W3_Settlement` | `20260720214531` / `20260721114533` | 5 July lane refs / 9 `feature/restaurant-control-stage0` refs |
| `Growth_W2_NewsletterDispatch` | `20260720213851` / `20260721112606` | same split |
| `Margin_W3_ProjectionStatements` | `20260720214955` / `20260721095521` | same split |
| `MealsW3_StatementsProjection` | `20260720214423` / `20260721104240` | same split |

None is on INT, all belong to the pre-fork July `20260630…–20260721…` chain `L-MIG-STACK-RECORD` scoped out,
and none carries a MIG number. Listed so the next sweep does not rediscover them as new. No migration **id**
collides anywhere: all 181 ids are distinct.

---

## 7. What this lane did not do

No number was renumbered. Neither ledger copy was edited. No migration was authored. No branch was created,
committed to, or pushed. No container was started. Everything above was resolved by object
(`git show <sha>:<path>`, `git ls-tree <sha>`), never through the backend working tree, which has
`lane/meals-grace-pins` checked out and is 63 commits behind INT.

The remedy is coupled to `F-MIG-CHAIN-STACKED` and is Sven's. The two live money-adjacent items a remedy has
to decide are MIG-21 (two files, one un-guarded `CREATE TRIGGER`) and MIG-17 (satisfied, still marked
outstanding, deadline attached).

# L-LEDGER-BUILD-STATE-RECONCILE — the ledger's built column against the branches

**Derived 2026-08-05 from the objects of `/Users/svendaneel/okam/OkamAPI-modules`.** Every built/not-built
verdict below comes from `git ls-tree`/`git show` against a named ref, never from the backend working tree
(which has `lane/meals-grace-pins` out, 63 commits behind INT) and never from one ledger copy checking the
other. The ledger copies were read only to learn what each entry *claims*; whether the claim is true was
decided against migration files.

Baseline `INT = feature/restaurant-modules @ 8e2b57de`.
Stack tip `STACK = 6fa2cbc3 = lane/wf-bootstrap-one-engagement`.

---

## 0. Denominator

| measured | count |
| --- | --- |
| ledger copies checked | **2** — blobs `91de8393` (INT) and `6a402d2d` (STACK) |
| divergence between the two copies | **819 changed lines** (`diff`, `^[<>]`) |
| **entries checked, INT copy** | **22** (MIG-1 … MIG-22) |
| **entries checked, STACK copy** | **28** (MIG-1 … MIG-28) |
| **entry-instances checked in total** | **50**, covering 28 distinct numbers |
| migration files on INT (all eras) | **254** (`.cs` + `.Designer.cs`); **127** non-Designer |
| **migrations on INT in the pending epoch (id ≥ `20260730`)** | **8** |
| refs enumerated, `refs/heads` | **317** · `refs/lanes` **0** · remotes 15 · tags 7 |
| **disagreements found** | **12 entry-instances** (2 in the INT copy, 10 in the STACK copy) + 1 migration with no entry in either |

**Instrument validated on a known positive and a known negative before any negative was reported.**
The census's known positive reproduced exactly (`MIG-22` resolves to `Growth_AuditLedger` on INT and to
`Margin_PeriodStatementFinalizedImmutable` on STACK). `${REF}:path` was braced throughout.

> **One instrument fault was caught and corrected mid-run, and it is the ninth failure mode restated.** A
> first sweep for pending-epoch migrations used `Migrations/2026(07[3-9]|08)[0-9]{2}[0-9]{6}_` and returned
> **zero files on INT** — a clean, plausible, well-formed lie. The pattern demands 15 digits; migration ids
> are 14. It was caught only because the census's known positive (`20260730143214`) was re-run against it and
> scored absent. Every count in this document was re-derived with a literal string comparison instead.

The 8 pending-epoch migrations on INT, in full — this is the entire INT-side truth every verdict is against:

| id | name | ledger number |
| --- | --- | --- |
| `20260730143214` | `Events_PaymentReceiptActor` | MIG-1 |
| `20260730143345` | `Events_SettlementLineActor` | MIG-2 |
| `20260730143446` | `Margin_PriceImportApprovedBy` | MIG-4 |
| `20260730143532` | `Growth_NewsletterVersionAuthor` | MIG-5 |
| `20260730150953` | `Growth_ConsentTextVersionAppendOnly` | MIG-9 |
| `20260731210732` | `Events_DietaryRequirements` | MIG-20 |
| `20260731215452` | `Meals_MembershipEmployeeReference` | **MIG-17 — entry says not built** |
| `20260731220005` | `Workforce_IdentityCodeRegisterIssues` | **none — no entry in either copy** |

---

## 1. The disagreements, by direction

The brief named three directions. The check found all three, plus a fourth the exit criterion forces
(*entry marked built whose migration is not on INT*), which is the largest class.

### Direction A — built, and marked not built. One number, both copies, and it is the deadline one.

| | |
| --- | --- |
| **number** | **MIG-17 — Meals member reference** |
| **migration** | **`20260731215452_Meals_MembershipEmployeeReference`** |
| **branch** | **`feature/restaurant-modules` (INT)**, and 146 of 317 heads |
| **ledger copies affected** | **both** — INT copy L232, STACK copy L375 |
| **direction** | built on INT since 2026-08-01, marked outstanding in both copies |

Verified by object, not by name. The migration's `Up()` adds exactly `MealsMemberships.EmployeeReference` and
`MealsInvitations.EmployeeReference`, nullable, **no FK, no index** — column-for-column the entry's spec.

Neither copy can see it: `Meals_MembershipEmployeeReference` → **0 hits in both**; `20260731215452` → **0 hits
in both**. Positive control on the same instrument: `20260731210732` (MIG-20, correctly recorded) → **1 hit in
INT, 2 in STACK**. So the absence is the document's, not the grep's.

Both copies still print the deadline in the present tense: *"⚠️ This must land before the pilot's first
invitation is sent … the only entry whose cost rises the day the pilot starts rather than the day the squash
runs."* **That condition was satisfied four days ago.** This is the one finding with a person waiting on it.

> **Rider — it was built narrower than specified, and only reading the object shows it.** Both copies specify
> *"Two columns, both `nvarchar(128) NULL`"* (INT L237, STACK L380). The landed migration declares
> **`nvarchar(64)`, `maxLength: 64`** on both columns. The value is supplied by the buying company and is
> copied onto the membership at claim, immutable afterwards by `TR_MealsStatementLines_FinalizedImmutable`
> (THROW 50043) once a statement finalizes — so a company reference longer than 64 characters is a truncation
> that cannot be repaired later, by the entry's own irreversibility argument. Marking MIG-17 "built" without
> naming the width would close the entry on a spec that was not met. **Not ruled on here** — flagged because
> a reconciliation that says only "done" hides it.

### Direction B — present on INT, holding no number, invisible to both copies.

| | |
| --- | --- |
| **migration** | **`20260731220005_Workforce_IdentityCodeRegisterIssues`** |
| **branch** | **`feature/restaurant-modules` (INT)**, and 146 of 317 heads |
| **ledger copies affected** | **both** — no entry in either |
| **direction** | on the branch, absent from the document |

INT copy: **0 hits** on the name and **0** on the id. STACK copy: 3 name hits / 2 id hits, but **never as an
entry** — both occurrences name it only as *the chain tip a later migration was parented on* (STACK L475,
L810). No MIG number anywhere.

**This one is not inert, and that is the finding.** The migration installs
`TR_WorkforceIdentityCodeRegisterIssues_RetentionLock` with **`THROW 50018`**. A full `THROW 500nn` census
across all 127 non-Designer migration files on INT confirms 50018 is consumed on INT by this file and no
other.

**MIG-14 in the INT copy (L291) still reads: *"50018/50019 are the next free numbers in the Workforce block
(50010-50017 are taken)"*.** That is false **on the branch that copy lives on**. An author who follows the INT
copy allocates an error number already installed on INT. The INT copy cannot correct itself because the
migration that consumed 50018 holds no number for it to point at — *present and unnumbered* producing a
concrete wrong instruction, exactly the failure mode the brief predicts.

**The STACK copy already fixed this and the fix has not reached INT.** STACK L434-436 carries a ⚠ note:
*"50018 was consumed the next day by `Workforce_IdentityCodeRegisterIssues`, and MIG-24 then found the whole
Workforce block exhausted and took a fresh 50070-50073. 50019 is the last free number."* The correction lives
only on the forked side.

### Direction C — entry marked built, migration not on INT. Ten entries, STACK copy only.

Each is truthful about its own branch and false about the integration branch. **None arrives by
fast-forward** (§3).

| number | migration id | on INT | branches carrying it |
| --- | --- | --- | --- |
| MIG-7 `AccountingSummaries` unique index | `20260803093235` | **no** | `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`, `lane/wf-bootstrap-one-engagement`, `lane/wf-timesheet-race` (5) |
| MIG-13 `Training_W3_ChecklistsAndDeviations` | `20260801113131` | **no** | the 14 stacked refs |
| MIG-21 `WorkforceSchedulePublicationReceipts` uniqueness | `20260801102621` | **no** | the 14 stacked refs |
| MIG-22 `Margin_PeriodStatementFinalizedImmutable` | `20260801084923` | **no** | the 14 stacked refs |
| MIG-23 `Margin_WasteEntries` | `20260801132512` | **no** | the 14 stacked refs |
| MIG-24 `Workforce_W5_Timesheets` | `20260801174639` | **no** | 12 refs |
| MIG-25 `Workforce_TimesheetExportSingleSucceeded` | `20260802103646` | **no** | 9 refs |
| MIG-26 `Workforce_TimesheetAdjustmentOrdinal` | `20260802151208` | **no** | 7 refs |
| MIG-27 `Meals_CompanyReceivableAccount` | `20260803090036` | **no** | 6 refs |
| MIG-28 `Workforce_BootstrapFirstEngagement` | `20260803124302` | **no** | **`lane/wf-bootstrap-one-engagement` only (1 ref)** |

The 14 stacked refs: `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`,
`lane/margin-waste`, `lane/margin-waste-500`, `lane/mig-company-receivable`, `lane/review-residuals-rezone`,
`lane/wf-adjustment-ordinal`, `lane/wf-bootstrap-one-engagement`, `lane/wf-digest-tautology`,
`lane/wf-export-duplicate`, `lane/wf-timesheet-race`, `lane/wf-timesheet-wire`, `lane/wf-w5-timesheet`.

**The INT copy is correct about all ten** — it marks MIG-7, 13, 21 and 22 not built, which is true on INT, and
does not carry MIG-23-28 at all. The two copies are each right about their own branch and wrong about the
other; neither is right about both. **This is why reading one to check the other reproduces the blind spot.**

### Direction D — entries with no migration behind them. Reservations, not defects.

MIG-6, 8, 10, 11, 12, 14, 15, 16, 18, 19 in **both** copies, plus MIG-22-as-`Growth_AuditLedger` in the **INT
copy only**, have no migration on INT and (per the census) none anywhere. MIG-3 is declined and retired.

**Confirmed by content against INT's whole 127-file migration tree, not by filename** — a reservation could
otherwise be silently satisfied by an older migration:

`ReconciledByUserId` 0 · `TR_JournalEntries` 0 · `CreditSales` 0 · `DeliveryReceipt` 0 · `TradingDay` 0 ·
`Checklist` 0 · `TR_WorkforceScheduleValidationReceipts_AppendOnly` 0 ·
`TR_WorkforceSchedulePublicationReceipts_AppendOnly` 0 · `GrowthRetention` 0 · `VenueSettings` 0 ·
`GuardDriftObservation` 0 · `LineVatRate` 0 · `GrowthAuditEvent` 0.
Positive controls on the same sweep: `EmployeeReference` 6 · `DietaryRequirements` 9 ·
`WorkforceSchedulePublicationReceipts` 9.

Four hits needed resolving before they could be called, and two were near-misses worth recording:

- **MIG-11** — `TheoreticalIngredientCostMinor` exists on INT as **`bigint, nullable: false`**. Still
  non-nullable, so the `long` → `long?` change is genuinely unbuilt. Both copies agree.
- **MIG-12** — the single `Onboarding` hit is an unrelated `OnboardingStatus nvarchar(max)` column, not the
  four Training tables. Both copies agree.
- **MIG-7** — INT **does** carry a `CreateIndex` on `AccountingSummaries`: `IX_AccountingSummaries_StoreId`,
  **not unique**, `StoreId` only. The INT entry's wording *"The chain contains **no `CreateIndex` on
  `AccountingSummaries` at all**"* is therefore **literally false on INT**, while its substance — no unique
  index on the accounting day, so the `DbUpdateException` backstop is dead code — **holds**. A future sweep
  grepping the entry's own words will contradict it and reach the wrong conclusion. Precision defect, not a
  status disagreement.
- **MIG-21** — INT carries a **unique** index named
  `IX_WorkforceSchedulePublicationRecipients_SchedulePublicationId_StaffMemberId`. That is
  **Recipients**, a different table from **Receipts**. The two indexes on `…PublicationReceipts` on INT are
  both non-unique. The entry's *"does not exist"* is correct on INT; the near-identical name is a trap for
  the next reader.

---

## 2. Full per-entry result — all 50 instances

`built?` = does a migration satisfying the entry exist on INT. ✓ = copy agrees with INT, ✗ = disagrees,
`–` = number absent from that copy.

| # | subject | on INT | INT copy claim | | STACK copy claim | |
| --- | --- | --- | --- | :-: | --- | :-: |
| 1 | `Events_PaymentReceiptActor` | yes | authored (§A) | ✓ | authored (§A) | ✓ |
| 2 | `Events_SettlementLineActor` | yes | authored (§A) | ✓ | authored (§A) | ✓ |
| 3 | `Events_SettlementReconciledBy` | no | declined | ✓ | declined | ✓ |
| 4 | `Margin_PriceImportApprovedBy` | yes | authored (§A) | ✓ | authored (§A) | ✓ |
| 5 | `Growth_NewsletterVersionAuthor` | yes | authored (§A) | ✓ | authored (§A) | ✓ |
| 6 | Kassa journal triggers | no | prose only | ✓ | prose only | ✓ |
| 7 | `AccountingSummaries` unique index | **no** | not built | ✓ | **✅ AUTHORED `20260803093235`** | **✗** |
| 8 | `ZReport` credit-sale columns | no | not built | ✓ | not built | ✓ |
| 9 | `GrowthConsentTextVersion` trigger | yes | authored (§A) | ✓ | authored (§A) | ✓ |
| 10 | Meals `TradingDay` | no | not built | ✓ | not built | ✓ |
| 11 | `TheoreticalIngredientCostMinor` → `long?` | no | conditional, unauthored | ✓ | conditional, unauthored | ✓ |
| 12 | `Training_W2_Onboarding` | no | **"4 tables, not built"** | ✓ | **"4 tables, not built"** | ✓ |
| 13 | `Training_W3_ChecklistsAndDeviations` | **no** | "6 tables, not built" | ✓ | **✅ LANDED `20260801113131`** | **✗** |
| 14 | Workforce schedule receipt triggers | no | owed — **but 50018 note stale** | ✓* | owed, numbers corrected | ✓ |
| 15 | Growth retention vs deny-triggers | no | BLOCKED | ✓ | BLOCKED | ✓ |
| 16 | `Events_VenueSettings` | no | not to be authored yet | ✓ | not to be authored yet | ✓ |
| **17** | **Meals member reference** | **YES `20260731215452`** | **outstanding, DEADLINE** | **✗** | **outstanding, DEADLINE** | **✗** |
| 18 | `MealsGuardDriftObservation` | no | conditional | ✓ | conditional | ✓ |
| 19 | `Events_LineVatRate` | no | reservation | ✓ | reservation | ✓ |
| 20 | `Events_DietaryRequirements` | yes | ✅ landed `20260731210732` | ✓ | ✅ landed `20260731210732` | ✓ |
| 21 | `…PublicationReceipts` uniqueness | **no** | "does not exist" | ✓ | **✅ LANDED `20260801102621`** | **✗** |
| 22 | *(subject differs by copy)* | **no** | `Growth_AuditLedger`, reservation | ✓ | **✅ LANDED `20260801084923`** | **✗** |
| 23 | `Margin_WasteEntries` | **no** | *absent* | – | **✅ LANDED `20260801132512`** | **✗** |
| 24 | `Workforce_W5_Timesheets` | **no** | *absent* | – | **✅ LANDED `20260801174639`** | **✗** |
| 25 | `Workforce_TimesheetExportSingleSucceeded` | **no** | *absent* | – | **✅ LANDED `20260802103646`** | **✗** |
| 26 | `Workforce_TimesheetAdjustmentOrdinal` | **no** | *absent* | – | **✅ LANDED `20260802151208`** | **✗** |
| 27 | `Meals_CompanyReceivableAccount` | **no** | *absent* | – | **✅ LANDED `20260803090036`** | **✗** |
| 28 | `Workforce_BootstrapFirstEngagement` | **no** | *absent* | – | **AUTHORED `20260803124302`** | **✗** |
| — | `Workforce_IdentityCodeRegisterIssues` | **YES `20260731220005`** | **no entry** | **✗** | **no entry** | **✗** |

`✓*` = status correct, prescription stale (§1 Direction B).

**MIG-22 is the only number whose *subject* differs between the two copies** — `Growth_AuditLedger` on INT,
`Margin_PeriodStatementFinalizedImmutable` on STACK. The collision is visible as a plain copy-vs-copy
divergence and needs no ancestry test to see. MIG-21 shares a subject across copies but not a status.

**Six numbers (MIG-23 … MIG-28) exist only in the STACK copy.** A reader on INT allocating "the next free
number" reads 22 as the ceiling and picks 23 — a number already held by a landed `Margin_WasteEntries` on
14 refs. The INT copy's ceiling is six numbers low, which is the MIG-12 five-way clash set up to happen again.

---

## 3. Why "not on INT" is not the same as "arriving shortly"

Re-derived independently rather than carried in from the census:

```
git merge-base --is-ancestor feature/restaurant-modules integration/mig-stack-land  => exit 1
git merge-base --is-ancestor integration/mig-stack-land feature/restaurant-modules  => exit 1
git rev-list --count integration/mig-stack-land..feature/restaurant-modules         => 59
git rev-list --count feature/restaurant-modules..integration/mig-stack-land         => 34
git merge-base feature/restaurant-modules integration/mig-stack-land                => 3579bbbc
```

`integration/mig-stack-land` **forks** INT; it does not extend it. So the ten Direction-C entries do not
become true on INT by a fast-forward — landing them is a hand merge across an 819-line ledger divergence
containing the MIG-22 subject conflict. This is the coupling to `D-INTEGRATION-FASTFORWARD`, and it is why
the ten are reported as disagreements rather than as "already fine".

---

## 4. Residue a future census will trip over — named, not touched

Four stale `MIG-12` headers still sit on merged lane tips, from the five-way collision renumbered serially on
2026-07-30 (`df8dc478` → MIG-14, `8ad36798` → MIG-15, `f038f805` → MIG-16, `e8e6ef17` → MIG-17). All four
lane tips are ancestors of INT; the headers are harmless where they are and are exactly what a branch sweep
re-reports as a live five-way clash. Carried forward from `L-MIG-NUMBER-CLAIMS` §3, not re-derived.

Note the last of those renumbers, `e8e6ef17` → **MIG-17**: the number whose migration then landed and was
never recorded. The renumber and the build-state miss are the same entry.

---

## 5. What this lane did not do

Neither ledger copy was edited. Nothing was renumbered. No migration was authored. No branch was created,
committed to or pushed. No container was started. No suite was run. The remedy for §1 Direction C is coupled
to `D-INTEGRATION-FASTFORWARD` and the remedy for MIG-21/MIG-22 to the collision ruling — both Sven's.

The single item with a person waiting on it is **MIG-17**: satisfied on INT since 2026-08-01 by
`20260731215452`, still printing a pilot deadline in both copies, and built at `nvarchar(64)` against a
specified `nvarchar(128)`.

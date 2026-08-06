# L-LEDGER-NUMBERS-ARE-FREE — every number the ledger declares free, checked against the branch

Read-only census. Nothing renumbered, no migration authored, no ledger edited, no commit, no push, no
container, no suite. Everything below was resolved **by object** with `git show "${ref}:path"` / `git cat-file`;
the shared checkout (`lane/meals-grace-pins`, `34c6c103`) was never read.

## 0. The three copies, and which branch each is

| name | ref | commit | ledger blob | MIG entries | migrations |
| --- | --- | --- | --- | --- | --- |
| **INT** | `feature/restaurant-modules` | `8e2b57de` | `91de8393` (582 lines) | MIG-1..22 | 128 (8 pending-epoch) |
| **STACK** | `integration/mig-stack-land` | `4b37f81b` | `50a98d75` (1127 lines) | MIG-1..27 | 137 (17 pending-epoch) |
| **MERGE** *(in flight)* | `integration/mig-stack-merge` | `24cd4ead` (2026-08-06 13:15) | `a96faee3` (1270 lines) | MIG-1..29 | 137 |

`8e2b57de` is the tip authors read (the plan calls it "the integration tip"; the branch name is
`feature/restaurant-modules`, not `integration/*` — recorded at `docs/plan/plan.md:8241`).

Topology, re-derived rather than taken from any document:

- INT ⟂ STACK: **neither is an ancestor of the other**, merge-base `3579bbbc`, 59 INT-only / 34 STACK-only commits.
- **INT's migration files are a strict prefix of STACK's** — 0 INT files absent from STACK, 9 STACK-only files
  (`20260801084923` … `20260803093235`). The sibling fact holds.
- INT **is** an ancestor of MERGE (0 INT-only commits, 37 MERGE-only); STACK is an ancestor of MERGE.
  MERGE's migration file set is identical to STACK's — the hand merge is a **ledger** merge, not new DDL.

The census instrument is the migration files themselves (`THROW 5\d{4}` extracted from every non-Designer
migration at each ref), never the ledger. Estate-wide control sweep: 332 local heads → 31 distinct
`Migrations` trees, grepped once each. Evidence: `throws-*.txt`, `migs-*.txt` in this directory.

## 1. THROW numbers — what each copy declares free, and what the branch says

| number | INT copy says | STACK copy says | consumed by a migration on INT? | on the STACK/MERGE chain? |
| --- | --- | --- | --- | --- |
| 50001–50006 | free, reserved for Kassa (`:84`) | free, reserved for Kassa (`:84`) | **no** | **no** |
| **50018** | **"next free"** (`:291`) **and prescribed in the trigger body** (`:283`) | body still prescribes it (`:426`); prose correction at `:434` | **YES — `20260731220005_Workforce_IdentityCodeRegisterIssues.cs:62`** | yes (same file) |
| 50019 | "next free" (`:291`), body `:285` | "the last free number in the Workforce block" (`:436`) | no | no — **both copies correct** |
| **50051** | **"reserved for this table and is free"** (`:162-164`) | **same sentence verbatim at `:305`, inside an entry headed ✅ LANDED**; corrected at `:263` | no (free at INT) | **YES — `20260801113131_Training_W3_ChecklistsAndDeviations.cs`** |
| 50074 | "free … highest claimed on any branch is 50073" (`:536`) | **the number, and the entry reserving it, are absent from this copy entirely** | no | no — free on all 31 trees |

Ceiling check, estate-wide: the deny-trigger band's true maximum is **50073**
(`20260801174639_Workforce_W5_Timesheets.cs`). Both copies' "50073 is the highest anywhere" is **true** — but
it is not observable from INT, whose own maximum is 50060; the six numbers 50061–50073 exist only on the
STACK side. `51000` is the separate family the ledger names, on `feature/c5-push-prereqs` and
`lane/order-created-utc` only.

Note on 50001–50006, which is a near-miss and not a defect: those six numbers are **already implemented with
exactly the reserved semantics** in `20260719083149_M0_LineageCertified.cs` on the abandoned stage0 epoch
(`feature/restaurant-control-stage0` + 11 lanes). That commit is an ancestor of neither INT nor STACK, so the
reservation is intact — and MIG-6 has a working reference implementation nobody points at.

### 1a. The 50018 defect is not fixed on any branch, in any copy

The flag says "the stack copy already carries the fix". It carries a **note**, not a fix. All three copies
still hand an author this exact copy-pasteable DDL:

```
THROW 50018, 'WorkforceScheduleValidationReceipts is append-only: UPDATE and DELETE are not permitted (re-validating writes a NEW receipt).', 1;
```

at INT `:283`, STACK `:426`, MERGE `:459` — while `20260731220005_Workforce_IdentityCodeRegisterIssues.cs:62`
already owns 50018 for `TR_WorkforceIdentityCodeRegisterIssues_RetentionLock` **on all three refs**. The STACK
and MERGE correction sits eight lines *below* the block it annotates and does not rewrite it. An author who
copies the specification — which is what a specification is for — writes a duplicate error number, and the
first symptom is a runtime `THROW` whose message names the wrong table on a statutory personalliste lock.

The consuming migration's own comment (`:17`) is also wrong about the band: it says "next in the Workforce
50013-50017 block" when 50010–50017 are taken.

## 2. MIG numbers — what each copy declares free, and what the branch says

| number | INT copy | STACK copy | truth on the branches |
| --- | --- | --- | --- |
| **MIG-23** = INT's **next free** (its ceiling is 22) | absent | `Margin_WasteEntries` ✅ LANDED | **taken** — `20260801132512` is on STACK and MERGE |
| MIG-24 / 25 / 26 / 27 | absent | all ✅ LANDED | taken — `20260801174639`, `20260802103646`, `20260802151208`, `20260803090036` |
| **MIG-22** | `Growth_AuditLedger` (no migration on any of the 31 trees) | `Margin_PeriodStatementFinalizedImmutable` ✅ LANDED `20260801084923` | double-claimed, one subject per copy; MERGE resolves it — Margin keeps 22, Growth moves to **MIG-29** |
| **MIG-28** | absent | **"MIG-28 is therefore still free"** (`:105`) | **not free — see §3** |
| MIG-29 | absent | absent | claimed in MERGE only (`Growth_AuditLedger`, THROW 50074) |
| MIG-30 = MERGE's next free | — | — | free |

## 3. NEW: MIG-28 has two authored migration files and three incompatible ledger states

The brief pointed at `lanes/L-FINALIZE-INDEX-OR-A-REASON/` before concluding anything about MIG-28. Read; it
is right about its own half and it does not know the other half exists.

1. `lane/wf-bootstrap-one-engagement` @ **`6fa2cbc3`** (2026-08-03 17:04) — migration
   `20260803124302_Workforce_BootstrapFirstEngagement.cs` **authored**, and its ledger copy (blob `6a402d2d`)
   heads it `### MIG-28 … AUTHORED as 20260803124302`. That commit is `integration/mig-stack-land` **+ 1**, and
   it is an ancestor of **neither** `mig-stack-land` nor `mig-stack-merge`. Its own note says the number was
   "verified free before authoring … grepped across the ledger on every local branch".
2. `lane/finalize-index-or-a-reason` @ **`5e53de83`** — migration `20260805160524_Kassa_FinalizeLookupIndex.cs`
   **authored**, ledger deliberately **not** edited (correctly: the copy it could see lacked MIG-23..27).
3. STACK's ledger (`50a98d75:105`) says MIG-28 is **still free** — written by L-ACCT-UIDX at `c606993a`
   (2026-08-03 12:13), five hours *before* claimant 1 took it, and never updated since.
4. MERGE's ledger (`a96faee3:1135`) reserves MIG-28 for claimant 2 **"and for nothing else"**, and never
   mentions claimant 1. `Bootstrap` appears zero times in both the STACK and the MERGE copy.

MERGE's own tie-break rule — *"a migration file on a branch is a claim and a ledger entry is a reservation, and
only one of these two has a file"* (`a96faee3:1165`) — **cannot decide MIG-28: both claimants have a file.**
This is the MIG-22 collision reproduced one number up, on the branch that exists to resolve MIG-22. Neither
claimant carries a THROW number, so the collision is a ledger/number collision only, not a DDL one.

## 4. Correction to the flag's "six low"

`F-INT-LEDGER-CEILING-SIX-LOW` says MIG-23..28 exist only in the stack copy. Measured today:

- against the **stack tip** `integration/mig-stack-land` (`50a98d75`): **five** entries exist only there
  (MIG-23..27). MIG-28 is not an entry there — it is explicitly declared *free*.
- the six came from blob **`6a402d2d`**, which is **`lane/wf-bootstrap-one-engagement`**, i.e. the stack tip
  plus one unmerged commit — not the stack tip. That lane's copy is the only one with a MIG-28 *entry*.
- against the **in-flight merge copy** (`a96faee3`, MIG-1..29) the INT copy is **seven** low.

The flag's substance is unchanged and its severity is understated: an author on INT reading INT's copy still
picks MIG-23, which is landed on the other side, and the number that the correction branch itself gets wrong
is 28.

## 5. The correction each copy owes

**INT copy** — `docs/plans/PENDING-MIGRATIONS-LEDGER.md` at `8e2b57de` (blob `91de8393`):

1. `:283` and `:291` — 50018 is spent. The MIG-14 pair needs **50019** plus one number from a fresh block
   (50070–50073 is W5's, 50074 is Growth's reservation, so **50075+**). Delete "50018/50019 are the next free
   numbers"; rewrite the trigger body, not only the prose.
2. `:162-164` — delete "50051 … is free"; MIG-13 is LANDED as `20260801113131` and consumed it.
3. Raise the ceiling: add MIG-23..27 (all landed) and MIG-28 (contested, §3). Its next-free is 23 and 23–27 are gone.
4. Renumber its MIG-22 (`Growth_AuditLedger`) to **MIG-29** — the Margin file is the one with a migration.
5. `:536` — the 50073 ceiling claim is true but unverifiable from this branch (INT's own max is 50060); carry
   the band map the STACK copy has at `:84-87`.

**STACK copy** — at `4b37f81b` (blob `50a98d75`):

1. `:426` — rewrite the trigger DDL to stop prescribing 50018; the note at `:434` does not reach the block.
2. `:305` — delete "50051 is reserved for this table and is free" from an entry now headed ✅ LANDED.
3. `:105` — "MIG-28 is therefore still free" is false; two authored files claim it (§3).
4. It carries **no** `Growth_AuditLedger` entry, so 50074 is reserved nowhere a stack author can see and
   MIG-22's other claimant is invisible from this side. Restore the entry (as MIG-29).

**MERGE copy** — at `24cd4ead` (blob `a96faee3`), in flight, read 2026-08-06 ~13:40; treat as a moving target:

1. Already fixes owed items INT-3, INT-4 and STACK-4 (MIG-23..27 present, Growth→MIG-29 with 50074, the
   MIG-22 double-claim ruled).
2. Still carries the 50018 trigger body at `:459` (INT-1 / STACK-1) and the stale "50051 … is free" at `:338`
   inside an entry headed ✅ LANDED at `:279` (INT-2 / STACK-2).
3. `:1135` reserves MIG-28 exclusively for `Kassa_FinalizeLookupIndex` and does not know
   `lane/wf-bootstrap-one-engagement` @ `6fa2cbc3` holds an authored `20260803124302` numbered MIG-28. This is
   the one item that a merge, and not a person, would silently get wrong.

## 6. Numbers that are genuinely free, so the next author has an answer

- **THROW: 50019** (Workforce block, last one), then **50075** and up. 50074 is Growth's, spoken for in the
  INT and MERGE copies and invisible in STACK. 50001–50006 stay Kassa's.
- **MIG: 30 and up** after the merge lands. **28 is not free** and **29 is Growth's**.

## 7. Boundaries honoured

C1 no UPDATE/DELETE anywhere; nothing was written outside this directory. C2 not engaged — no migration
authored, nothing renumbered, and the deliberate reason is in the brief: a sibling holds the SQL slot for the
stack merge and another has an unlanded hand-authored migration on the stack chain. C3–C7 untouched by a
read-only census. C5: this finding's evidence is git objects and migration bodies, not a suite count; there is
no UI and nothing for Sven to walk.

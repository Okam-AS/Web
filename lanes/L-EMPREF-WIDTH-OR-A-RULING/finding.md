# L-EMPREF-WIDTH-OR-A-RULING — what the 64-wide employee reference actually truncates

**Class: analysis. No migration authored, no file in either repo changed, no container started or touched,
no suite run.** Everything below was read at the integration tip with `git show "${ref}:path"`, braced —
`ref=feature/restaurant-modules` @ **`8e2b57de`** — and cross-read at the migration stack
`integration/mig-stack-land` @ **`4b37f81b`**. The `OkamAPI-modules` checkout sits on `lane/meals-grace-pins`
@ `34c6c103`; nothing here was read from its working directory. The frontend was read from the
`Web-modules` working tree, which is on the plan root and clean of this file's subject.

---

## The answer, first

**Nothing truncates. Zero values. On any path, at either width.**

The column cannot be reached by an over-long value, because the value is refused **65 characters before the
database sees it**, by the same helper that refuses a fødselsnummer, and the refusal is a 400 with a message
naming the limit — not a silent clip.

```
Services/Meals/MealsEmployeeReference.cs
    public const int MaxLength = 64;
    ...
    var trimmed = value.Trim();
    if (trimmed.Length > MaxLength)
    {
        throw MealsProblemException.Validation($"{fieldName} must be at most {MaxLength} characters.");
    }
```

It is already pinned by an arm whose name is the finding:

```
WebApi.Tests/Meals/MealsEmployeeReferenceTests.cs:44
    A_reference_longer_than_the_column_is_refused_rather_than_silently_truncated
WebApi.Tests/Meals/MealsEmployeeReferenceTests.cs:52
    A_reference_exactly_at_the_column_width_is_accepted
```

Both arms are written against `MealsEmployeeReference.MaxLength`, not against a literal `64`.

**So `F-MIG17-WIDTH-HALF-THE-SPEC`'s premise — "truncated and unrepairable" — is not true at the tip and not
true on the stack.** The built width does not produce a truncation. What it produces is a **refusal band**:
a company whose own reference is 65–128 characters long is told it cannot issue the invitation. That is a
different defect, of a different severity, and it is loud rather than permanent.

**Recommendation: rule the narrower width acceptable, with the four risks in §6 recorded.** A widening
closes no truncation, because there is none to close.

---

## 1. Every door into the column, and both of them normalize

Two write paths exist in the whole backend. There is no third — no bulk import, no seed, no demo script,
no admin edit, no raw SQL.

| # | Entry point | Service | Normalizes? |
|---|---|---|---|
| 1 | `POST` company create → founding admin's bootstrap membership (`Controllers/Meals/MealsCompanyController.cs:36`) | `Services/Meals/MealsCompanyService.cs:117` | **yes** — `MealsEmployeeReference.Normalize(request.AdminEmployeeReference, ...)` |
| 2 | `POST` invitation create (`Controllers/Meals/MealsMembershipController.cs:92`) | `Services/Meals/MealsMembershipService.cs:209` | **yes** — `MealsEmployeeReference.Normalize(request.EmployeeReference, ...)` |

The **claim** path (`MealsMembershipService.cs:477,506`) copies `invitation.EmployeeReference` onto the
membership verbatim. It needs no bound of its own: its source is a column already bounded at 64 by door 2.

`Services/Meals/MealsStatementService.cs:394-396` reads the memberships' references into a dictionary; nothing
looks a membership up *by* this value, and `MealsStatementService.cs:513` composes nothing — it returns either
the reference or `membershipId.ToString()`. No concatenation, no prefixing, no padding anywhere in the chain.

**The UI cannot produce an over-long value either.** `components/admin/meals/MealsPeoplePanel.vue:122-126`
carries `maxlength="64"` on the one input, so the browser stops at 64 and the server arm is the second gate,
not the first. Neither `en.ts:4069`, `no.ts:4125` nor `de.ts:4074` states a number, so the frontend has
exactly one place that hard-codes the width.

## 2. The longest value the product can produce — measured, not assumed

The sibling `L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID` (`lanes/…/mutation-log.md`, committed `27de8b21` on
`lane/empref-natid`, **not on the tip**) narrowed the accepted set by exactly one format and deliberately left
every unnamed one accepted, each pinned by its own arm. That is the denominator. Measured against it:

| what can reach the column | longest form | chars |
|---|---|---|
| Norwegian fødselsnummer / D-nummer | `31129945616` | 11 — **refused** (both mod-11 digits) |
| German Sozialversicherungsnummer | `65170839J003` | 12 — **refused** by `27de8b21`, still accepted at the tip |
| Swedish personnummer (deliberately accepted) | `19850101-1236` | 13 |
| Danish CPR-nummer (deliberately accepted) | `010185-1234` | 11 |
| Swiss AHV-Nummer (deliberately accepted; named next) | `756.1234.5678.97` | 16 |
| payroll number / cost-centre code / initials — the field's stated domain | `ANS-2287` | ≤ 20 in every example in the tree |
| **the fallback the product itself writes when none was supplied** | `4b050000-0000-0000-0000-000000000002` | **36** |

**The longest value the product generates on its own is 36 characters** — the membership GUID fallback at
`MealsStatementService.cs:513`. **The longest value it will accept from a company is exactly 64.** Every
identity format in the accepted set, including the ones the sibling deliberately left in, is **≤ 16**. The
built width has 48 characters of headroom over the longest thing the product writes and 4× over the longest
identity number it takes.

## 3. The frozen line is fine, and it is not the table anyone would widen

The frozen destination is `MealsStatementLines.MemberDisplayRef`, created **`nvarchar(256)`** by
`Migrations/20260727221455_RestaurantModules_Initial.cs:330` and mapped at
`Helpers/ApplicationDbContext.cs:3406`. `MealsCreditAdjustments.MemberDisplayRef` is the same 256
(`:1737`, `:3425`). A 64-wide source copied into a 256-wide frozen column **cannot truncate on arrival**, and
the helper's own doc comment already says so.

**The trigger is on the wrong table for this flag.** The four Meals triggers created by the initial migration
are `TR_MealsAuditEvents_AppendOnly`, `TR_MealsCreditAdjustments_AppendOnly`,
`TR_MealsFundingAllocations_AppendOnly`, `TR_MealsStatementLines_FinalizedImmutable`. **Neither
`MealsMemberships` nor `MealsInvitations` carries a trigger or a `GuardAppendOnly` branch** — which
`L-MEALS-EMPREF` proved by experiment (a raw `UPDATE` on a membership row succeeds; the same statement on a
finalized line is rolled back with `THROW 50043`). So the columns a widening would touch are **mutable**, and
the widening is not a change to an append-only table at all.

## 4. Where the `128` comes from — and it is not the spec

Both ledger copies do say it, identically:

```
docs/plans/PENDING-MIGRATIONS-LEDGER.md  (tip :237, stack :380)
    Two columns, both `nvarchar(128) NULL`, no FK, no index (they are display values, never a key)
```

**But the ledger is the migration author's proposed shape, not a requirement it derives from anything.** The
spec clause the entry cites — `docs/plans/modules/20-company-meals-spec.md:325`, §13.3 — says the CSV carries
a *"member display name"* per line and **names no width**. The `128` is the ledger's own number, written
before the field's domain was ruled. `D-MEALS-EMPREF` (@sven, 2026-07-31) then ruled the value is the
**company's own reference**, *"never lifted from identity"* — a payroll number, not a person's name. The
domain the `128` was sized for is not the domain that was built.

**Model and chain agree with each other at 64** — `Helpers/ApplicationDbContext.cs:3107,3131`, the migration's
`maxLength: 64`, and both snapshot entries (`ApplicationDbContextModelSnapshot.cs`, `nvarchar(64)` on tip and
on stack). So this is a **document-vs-code** divergence, not a C2 model-vs-chain one. Only the ledger is out
of step, and only with itself.

## 5. The one thing that IS genuinely out of family

Not 128 — **256.** The estate's house width for every name-or-reference display column is 256, sixty-odd
times over: `LegalName`, `DisplayName`, `BillingContactName`, `InviterReference` (256, on the *same
invitation row*), `SellerLegalName`, `ParticipantDisplayName`, and every `*ActorReference`. The nearest
sibling concept in another module — Workforce's `ProtectedIdentityCodeRef`, an employee-identifying reference
— is **256** (`ApplicationDbContext.cs:2970`). And the column this value is copied into is 256.

`EmployeeReference` at 64 is the odd one out **against the estate, not merely against the ledger**. That is
worth recording in the ruling. It is still not a reason to migrate, because §2 shows the headroom is real.

## 6. Risks to record with the ruling

1. **The bound is a C# invariant, not a schema one.** The only thing between an over-long value and the
   column is `MealsEmployeeReference.Normalize`. A third write path added without it would meet the database
   directly. **I could not measure what happens then** — whether SQL Server errors or the value is clipped by
   parameter size — because that needs a SQL tier and **this lane has no slot**. It is unreachable today; it
   is not structurally prevented.
2. **The length refusal is pinned at the helper, not at either endpoint.** The sibling pinned the *identity*
   refusal at both `Normalize` call sites; the *length* refusal has no endpoint arm
   (`git grep "must be at most" -- WebApi.Tests` returns only the unit arm). Reachability rides on the
   sibling's arms rather than its own.
3. **The refusal band is real, if narrow.** A company reference of 65–128 characters is refused where the
   ledger's shape would have accepted it. Nothing in the tree produces one, and the field's stated domain
   makes one implausible — but it is a refusal an operator will read as a product defect, not as a rule.
4. **The ledger stays wrong until someone corrects it in both copies**, and the stack copy is on the forked
   side of the merge `D-INTEGRATION-FASTFORWARD` now turns on. This is the same shape as
   `F-THROW-50018-ALREADY-SPENT` and `F-INT-LEDGER-CEILING-SIX-LOW`: **a third fact this document is wrong
   about.** The cheap close for this flag is to correct `128` → `64` in both ledger copies with the reason,
   which is a doc edit and needs no migration slot.

## 7. What a widening would cost, if ruled anyway

**Shape.** One migration, `AlterColumn<string>` × 2, `nvarchar(64)` → `nvarchar(128)` (or 256), staying
nullable. In SQL Server this is a **metadata-only** change — no table rewrite, no data scan — precisely
because the columns carry nothing that would force one, which the SQL tier already proves:
`MealsEmployeeReferenceSqlServerTests.The_employee_reference_carries_no_index_and_no_constraint`. It touches
neither trigger-bearing table, so **C1 is not engaged** — it is DDL, not a repair.

**The `Down()` becomes lossy, and that is the sharpest cost.** Today the narrowing direction is safe because
no value over 64 can exist. After a widening, values of 65–128 can exist and can already have been copied
onto a frozen `MealsStatementLine`. A `Down()` that narrows the column back would then destroy data whose copy
is immutable — **the widening manufactures the C1 hazard the flag says already exists.**

**The chain cost is the expensive part, and it is timing, not code.**

- The tip's chain tail is `20260731220005_Workforce_IdentityCodeRegisterIssues` (**127** migrations).
- The stack's is `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` (**136**), the tip's set being a
  strict prefix.
- **`D-INTEGRATION-FASTFORWARD` was ruled `author-a-merge-lane` on 2026-08-06** — a genuine merge, *"it
  serialises behind one author, and the duplicate-migration collision lives inside it"*. **That author holds
  the slot now.**
- C2 requires the new Designer snapshot's parent to be the **post-merge** chain tip. Authored today against
  `20260731220005`, it is parented nine migrations behind the truth and is wrong the moment the merge lands.

**It also collides on the shared anchor.** An EF-generated `AlterColumn` rewrites
`ApplicationDbContextModelSnapshot.cs` — the file every migration lane contends for. `L-WF-OPERATOR-UNIQUE`
avoided this by hand-authoring its migration and leaving the snapshot untouched; a widening cannot, because
the snapshot's `HasMaxLength(64)` / `HasColumnType("nvarchar(64)")` pairs are exactly what must change.

**Seven places move in lockstep, or the widening closes nothing** (the failure mode the brief names):

1. `Helpers/ApplicationDbContext.cs:3107` and `:3131` (+ the `:3130` comment naming "the same 64 bound")
2. `Services/Meals/MealsEmployeeReference.cs` — `MaxLength`, and its doc comment claiming it "matches the
   column width"
3. `Migrations/ApplicationDbContextModelSnapshot.cs` — two entries, two lines each
4. the new migration's own Designer snapshot
5. `WebApi.Tests/Meals/MealsEmployeeReferenceSqlServerTests.cs:67` — **hard-codes `Assert.Equal(128, …)`**,
   i.e. 64 characters in bytes, plus the byte-vs-character comment above it
6. `components/admin/meals/MealsPeoplePanel.vue:122-126` — `maxlength="64"`, or the browser keeps the old
   bound and the server change is invisible
7. `Models/Meals/MealsMembershipModels.cs` — `CreateMealsInvitationRequest`'s doc comment, *"Optional, ≤ 64
   characters"*

`MealsEmployeeReferenceTests` needs **no** change — both length arms read `MealsEmployeeReference.MaxLength`.
No translation string changes: none of `en`/`no`/`de` states a number.

**Total: one serialised migration slot behind a merge in flight, one contended snapshot, seven hard-coded
sites, a `Down()` that becomes destructive — to close a truncation that does not occur.**

## 8. Reopen conditions for the ruling

- a company supplies a reference the product refuses for **length** (65–128) — the refusal band becoming real
  rather than theoretical;
- a third write path to `EmployeeReference` is added that does not route through
  `MealsEmployeeReference.Normalize`, which converts risk 1 from unreachable to live;
- the field's ruled domain changes from *company reference* back to *member display name* (§13.3's words),
  which is what the ledger's 128 was sized for and what `D-MEALS-EMPREF` ruled against;
- the estate standardises this class at 256 and this column is brought into family as part of that, rather
  than as its own migration.

---

## Read-refs used

| ref | sha | why |
|---|---|---|
| `feature/restaurant-modules` | `8e2b57de` | integration tip — all code/spec/ledger reads |
| `integration/mig-stack-land` | `4b37f81b` | migration stack — confirmed width unchanged, chain tail |
| `lane/empref-natid` | `27de8b21` | sibling's committed refusal — the narrowed denominator |
| `lane/meals-grace-pins` | `34c6c103` | the checkout's branch — **read from, never** |

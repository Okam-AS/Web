# L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED — what an out-of-range PaymentType prints on the RETREC payer line

> **PASS 2 (2026-08-05).** The ruling `guard-where-the-value-enters` asked for the guard itself. It is
> built and proved red-then-green — see **Part 6** at the end of this file. Parts 1–5 below are the
> pass-1 analysis, unchanged, and are what Part 6's placement decision rests on.

**Class: analysis (pass 1).** Nothing in the backend repo was edited, committed, pushed or run against a database.
No container, no SQL, no migration. Everything written lives under
`lanes/L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED/` plus my RETURN.

## Verdict up front

**The mechanism is real. The stated reachability is not.**

The brief (and the sibling finding it inherited the claim from) says `FinalizeService.cs:501` and `:637`
copy `request.PaymentType` **"straight off the client DTO"**. Traced at the tip, that is wrong in the
one word that carries it: `FinalizeReturnRequest` and `FinalizeUnreferencedReturnRequest` are
**never model-bound**. They are internal service DTOs, constructed by exactly four production callers,
and **every one of those four supplies a server-derived value** — two hard-code `PaymentType.Cash`,
two pass a terminal transaction's own type, which was itself assigned from a compile-time constant.

So: an out-of-range integer **prints the bare decimal number** if it ever gets there (proved below, with
bytes), and **no HTTP request at this tip can get it there**. I report both halves rather than the one
that makes the better headline.

## The ref, named before anything is claimed

```
ref:  feature/restaurant-modules @ 8e2b57de8442a389a9b5f8025312c9750614c85e
      (2026-08-04 12:00:29 +0200, "L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing")
repo: /Users/svendaneel/okam/OkamAPI-modules
```

`git rev-parse feature/restaurant-modules` resolves to `8e2b57de`, and
`git merge-base --is-ancestor 8e2b57de feature/restaurant-modules` succeeds. Same ref the sibling
measured. **The working directory was not read** — the checkout sits on `lane/meals-grace-pins`, which
answers a question nobody asked. Every line below came out of `git show 8e2b57de:<path>`.

---

## Part 1 — What actually prints. Run, not argued.

`lanes/L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED/_proof/` is a standalone console program carrying
`PaymentType`, `PaymentLabel`, `Row`, `Fit`, `Money` and `Line` **copied verbatim** from
`8e2b57de:Enums/PaymentType.cs` and `8e2b57de:Services/Kassa/EscPosReceiptBuilder.cs`, plus the app's
own binder configuration from `Helpers/ServiceCollectionExtensions.cs:168-172`. `dotnet run` output
(the complete verbatim run is at `_proof/output.txt`; it was executed twice, byte-identical both times,
so nothing below is transcribed from recollection):

```
=== A. Does the enum carry [Flags]? ===
  [Flags] on PaymentType: False

=== C. What an UNDEFINED (out-of-range) value prints on the payer line ===
  int=999    ToString()="999"        printed=|999                       125,00|
      bytes: 39 39 39 20 20 ... 20 31 32 35 2C 30 30 0A
  int=7      ToString()="7"          printed=|7                         125,00|
  int=-1     ToString()="-1"         printed=|-1                        125,00|
  int=121    ToString()="121"        printed=|121                       125,00|
  int=2147483647                     printed=|2147483647                125,00|
```

**The answer to the exit criterion, exactly:** a `JournalPaymentLine.PaymentType` of 999 renders the
payer line as the three ASCII bytes `39 39 39` ("999"), then 23 spaces (`20`), then `31 32 35 2C 30 30`
("125,00") and the `0A` terminator — 33 bytes in a 32-column row. The receipt reads

```
999                       125,00
```

No exception, no blank, no fallback label: `Enum.ToString()` on an undefined value of a non-`[Flags]`
enum returns the decimal form, `PaymentLabel`'s `default:` arm returns it unchanged, `Row` left-aligns
it, and `Line` writes it to the job. `Clean` does not touch it (digits are not control characters).
Confirmed absent: `[Flags]`, which would have made 999 decompose instead.

The number is worse than the sibling's `CompanyAccount` in one specific way. `CompanyAccount` is at
least a token a reader can look up. `999` on a § 2-8-7 utleveringskvittering names no tender at all,
and it is **indistinguishable from an amount** in a column that otherwise holds only Norwegian words.

## Part 2 — The validation that exists. Named before concluding anything.

The brief required me to say what validation exists before concluding none does. Four layers were
checked; two of them do real work.

| Layer | Verdict |
|---|---|
| `[Required]` / `[EnumDataType]` / `[Range]` on any `PaymentType` property | **None anywhere.** Grep over every `Models/**` DTO returns zero attributes on a PaymentType property. |
| Model binding (Newtonsoft + `StringEnumConverter`) | **Does not validate membership.** Proved, section E below. |
| `Enum.IsDefined` upstream | **Exists in the estate — nine call sites — but none of them is on `PaymentType`.** |
| A settlement path that rejects unknown tenders | **Yes. This is the guard that actually holds.** |

### E. The binder accepts out-of-range integers (proved, same run)

`Helpers/ServiceCollectionExtensions.cs:155-174` configures `AddNewtonsoftJson` with
`StringEnumConverter` and nothing else — no `AllowIntegerValues = false`.

```
{"Amount":12500,"PaymentType":999}       -> bound as int=999 ToString()="999"
{"Amount":12500,"PaymentType":7}         -> bound as int=7   ToString()="7"
{"Amount":12500,"PaymentType":"999"}     -> bound as int=999 ToString()="999"
{"Amount":12500,"PaymentType":"Bogus"}   -> REJECTED: JsonSerializationException
{"Amount":12500,"PaymentType":120}       -> bound as int=120 ToString()="CompanyAccount"
```

So the binder rejects an unknown **name** and accepts any **number**, including a numeric string.
`Program.cs:199` customizes only the *response shape* for an already-invalid ModelState; an
out-of-range enum never makes ModelState invalid, so it is not a gate.

### The estate already knows this hazard — on the same document, for a different field

`8e2b57de:Helpers/PosReasonLabels.cs:30-37`, verbatim:

```csharp
// Whether the type is a real, defined classification (not the None sentinel and not an
// out-of-range value). Newtonsoft's StringEnumConverter binds unknown integers to the enum
// without error, so the Enum.IsDefined check is what keeps a hand-crafted reasonType from
// slipping past a "reason required" gate and journalling a null label.
public static bool IsValid(PosReasonType type)
{
    return type != PosReasonType.None && System.Enum.IsDefined(typeof(PosReasonType), type);
}
```

`ReturnDocumentation.ReasonType` **is** client-bound (`CashRefundRequest`, `UnreferencedCashReturnRequest`)
and **is** membership-guarded, on the very RETREC whose payer line this lane is about. `PaymentType`
on that same document is not — it simply never needed to be, because it is not client-bound.

## Part 3 — The reachability trace, caller by caller

There are **exactly three** `new JournalPaymentLine` sites in production code, all in `FinalizeService.cs`:
`:222`, `:501`, `:637`. Nothing else writes a payment line. Downstream of all three the path is
guard-free and unfiltered — `PosReceiptService.cs:314-322` projects `p.PaymentType` onto
`model.Payments`, and `EscPosReceiptBuilder.cs:155-158` loops it into `PaymentLabel`. So the whole
question is what can reach those three constructors.

### `:501` — referenced return (FinalizeReturnAsync). Two callers.

- **`Controllers/PosController.cs:712`** — `PaymentType = PaymentType.Cash`. A **literal**. The
  client-bound DTO on that route (`CashRefundRequest`) has **no PaymentType property at all**.
- **`Services/Kassa/TerminalPaymentOrchestrator.cs:1312`** (`CreateReturnAsync`) — `PaymentType = tx.PaymentType`.

### `:637` — unreferenced return (FinalizeUnreferencedReturnAsync). Two callers.

- **`Controllers/PosController.cs:779`** — `PaymentType = PaymentType.Cash`. Again a literal;
  `UnreferencedCashReturnRequest` carries no PaymentType.
- **`Services/Kassa/TerminalPaymentOrchestrator.cs:1147`** (`ConfirmPendingRefundAsync`) — `tx.PaymentType`.

### Where `tx.PaymentType` comes from

`TerminalPaymentOrchestrator.cs:714`: `PaymentType = provider.TerminalPaymentType`, where the provider
comes from `_providerResolver.ForCashPointAsync(cashPointId)` — resolved from **cash-point configuration**,
not from anything posted. `TerminalPaymentType` is a compile-time constant per implementation:
`DinteroTerminalService.Provider.cs:17` → `DinteroTerminal`; `SurfboardTerminalService.cs:62` →
`SurfboardTerminal`. The other creators (`DinteroTerminalService.Initiate.cs:73,228`,
`SurfboardTerminalService.cs:104,281`) likewise assign literals.

A transaction created by the **online** rails (Stripe / Vipps / Dintero web) cannot reach the RETREC
path either: `RefundAsync` calls `RequireCashPoint(tx)` (`:1391`, throws without a CashPointId), requires
`tx.JournalEntryId` (`:505`) and `tx.ProviderTransactionReference` (`:510`), and then
`TerminalPaymentProviderResolver.cs:26-35` throws `"No terminal payment provider is registered for {paymentType}"`
for anything that is not one of the two terminal constants.

### `:222` — the SALREC line, for completeness. Two callers, both closed.

- `FinalizeCardSaleAsync` → `:68` guards **only** `NotSet` ("A card finalize requires the provider
  payment type"), so an out-of-range value **would** pass it. Its sole production caller is
  `TerminalPaymentOrchestrator.cs:1093`, passing `tx.PaymentType` (`:1100`) — a constant. **Latent, not live.**
- `FinalizeSettlementAsync` → sole caller `PosSettlementService.cs:703`, projecting allocations from
  persisted `OrderPayment` rows (`:693`). Those rows are minted **only** by the allocation whitelist:
  `:294` Cash → literal `PaymentType.Cash`; `:351` `IsTerminalPayment()` (DinteroTerminal/SurfboardTerminal
  only, `Helpers/PaymentTypeExtensions.cs:80-83`); `:392` `IsCompanyAccount()` → literal
  `PaymentType.CompanyAccount`; **`:452-455` `else throw new AppException("Unsupported payment type for a settlement allocation.")`**.

`SettlementAllocationRequest` (`Models/Kassa/SettlementModels.cs:18-22`) **is** the one client-bound DTO
on the kassa money path that carries a `PaymentType`. Posting `999` to it binds successfully (section E)
and is then rejected at `:454` before any row exists. **That is the guard that makes the objective hold today** —
a whitelist, not a membership check, which is why it also happens to be the more robust of the two shapes.

## Part 4 — What an out-of-range value would do beyond the print

The brief asked for the journal and settlement consequences, not only the paper.

- **The journal, and C1.** `Helpers/ApplicationDbContext.cs:855-857` maps `JournalPaymentLine.PaymentType`
  through `EnumToStringConverter<PaymentType>`, so the column would receive the literal string `"999"`.
  Round-trip proved in the same run (section F): `999 → "999" → 999`. `JournalPaymentLine` is append-only
  (`ApplicationDbContext.cs:1367` lists it in the guard set), so such a row would be **permanent and
  unrepairable by construction** — the reason this is worth a guard at all even while unreachable.
  The same converter is on `Order`, `Cart` and `PaymentTransaction` (`:294`, `:370`, `:378`).
- **Settlement.** Unreachable — `:454` throws first, so no `OrderPayment`, no drawer movement, no capture.
- **The X/Z report.** `XZReportService.cs:719` groups by `paymentLine.PaymentType` into a
  `PaymentMeansTotal`, and `EscPosXZReportBuilder.cs:341-354` carries a **byte-identical copy** of the
  same four-arm ladder with the same `default: return paymentType.ToString()`. A `999` line would print
  `999` as a tender-total row on the daily fiscal summary too.
- **SAF-T.** `SaftCashRegisterExportService.MasterData.cs` maps known members to predefined codes; an
  unmapped value falls to the residual. Not traced further — outside this lane and not load-bearing for
  the verdict.

## Part 5 — The design call, framed rather than settled

The owner has to choose **where**, and the three candidates are genuinely different, not cosmetic:

1. **At the DTO** (`SettlementAllocationRequest` and any future client-bound carrier) — an
   `Enum.IsDefined` check, matching the `PosReasonLabels.IsValid` precedent already on this document.
   Rejects earliest and gives the client a clean 400. Guards only the DTOs someone remembers to annotate,
   which is exactly how `PaymentType` came to be the one unguarded enum on the RETREC.
2. **At the service** (`FinalizeService` :222/:501/:637, or a shared `RequireDefinedTender`) — one choke
   point covering all three journal writers regardless of caller, and the closest thing to a real
   invariant on the append-only row. Fails later, after the money may already have moved at the terminal.
3. **At the builder** (`EscPosReceiptBuilder.PaymentLabel`'s `default:`) — cannot prevent the bad journal
   row, only the bad paper. But it is the arm that will silently swallow the **next** enum member added,
   exactly as it swallowed `CompanyAccount`; a stable Norwegian residual there fails loudly-in-Norwegian
   instead of quietly-in-digits. Note this would need doing **twice** — `EscPosXZReportBuilder.cs:341` is
   a copy, not a call, and the two files share no code.

My own read, offered as input and not as a decision: (2) is the one that makes the append-only row
honest, (3) is the one that makes the *next* member safe, and they are complementary rather than
alternatives. (1) alone would repeat the failure mode it is meant to fix.

**Priority, stated plainly so nobody over-reads this lane:** at `8e2b57de` this is a **latent hardening
item, not a live exposure**. No request reaching this tip can put a number on a fiscal line. What makes
it worth doing anyway is that the only thing standing between an unvalidated int and a permanent
append-only journal row is a `default:` in one caller (`FinalizeCardSaleAsync:68` already lets everything
but `NotSet` through) — and the sibling's `CompanyAccount` defect is the proof that this codebase does
add enum members without revisiting the arms that consume them.

## Constraints

- **C1 engaged and reported** (Part 4): an out-of-range value would land permanently on an append-only
  `JournalPaymentLine`. Nothing was backfilled, repaired or purged by this lane — no writes at all.
- C2 not engaged — no migration, no model change.
- C3 not engaged — no capability added.
- C4 not engaged — no money-path write.
- **C6 engaged and reported**: the payer line sits on the § 2-8-7 utleveringskvittering / RETREC. The
  artifact is produced and the claim is backed; the finding is about the *content* of a line, and at this
  tip the number cannot reach it. No new statutory claim was printed.
- C7 not engaged — no log or telemetry call added; no secret read or written.

---

# Part 6 — The guard, built (pass 2, ruling `guard-where-the-value-enters`)

## Where it went, and why not where the brief's title suggested

One private helper on the writer, called at the four points where a `PaymentType` becomes — or becomes
part of — a `JournalPaymentLine`:

```
Services/Kassa/FinalizeService.cs
  :68   FinalizeCardSaleAsync        widened: was NotSet-only, now the same defined-member test
  :220  FinalizeSaleCoreAsync        the SALREC payment-line loop  (was :222 before the helper landed)
  :523  FinalizeReturnAsync          the referenced RETREC line    (was :501)
  :659  FinalizeUnreferencedReturn   the open RETREC line          (was :637)
  :318  RequireDefinedTender         the shared check itself
```

**Deliberately NOT on `FinalizeReturnRequest` / `FinalizeUnreferencedReturnRequest`.** Pass 1 enumerated
every `[FromBody]` type in the app (250) and neither of those two is among them: they are internal
service DTOs, so no model binder ever runs `[Required]`/`[EnumDataType]` over them. An attribute there
would be an advertised control that gates nothing — the shape this estate has now shipped three times in
two days (RF-1313's absent journal triggers, `AccountingSummaries`' model-only unique index, the
advertised-but-ungating Training/Workforce flags). The writer is the one place every caller must pass
through, so the invariant holds regardless of which caller is correct this week.

The helper mirrors `Helpers/PosReasonLabels.IsValid` — `!= sentinel && Enum.IsDefined(...)` — which
already guards the *reason* field on this very RETREC. Same document, same hazard, same shape.

Rejecting `NotSet` as well as out-of-range is a real widening beyond "membership", and it is safe:
across the whole tree, **every** construction of `SettlementPaymentAllocation`,
`FinalizeReturnRequest` and `FinalizeUnreferencedReturnRequest` — production and test — assigns
`PaymentType` explicitly, and none assigns `NotSet` (enumerated by script over all 40 sites; zero
omissions). A sentinel names no tender, so it has no business on a fiscal payment line either.

## Proved red, then green — because a guard never shown to reject matches nothing

`WebApi.Tests/Kassa/FinalizeDefinedTenderTests.cs`, 7 cases, run on `PosHarness` (in-memory SQLite —
**no container was started**).

**Before the guard: 6 failed, 1 passed** (`_guard/red-before-guard.txt`). Five of the six failed with
`Assert.Throws() Failure / Actual: (No exception was thrown)` — i.e. `(PaymentType)999` was *journalled*
on the card sale, on a single-tender settlement, on a mixed settlement, on the referenced RETREC and on
the unreferenced RETREC. The sixth was the NotSet regression pin reading the old, narrower message
(`Not found: requires the payment type / In value: A card finalize requires the provider payment type.`).
The one that passed before and after is the positive control.

**After the guard: 7 passed** (`_guard/green-after-guard.txt`).

**No regression:** the whole non-SQL suite on top of the guard is `Failed: 0, Passed: 4645, Skipped: 12,
Total: 4657` (`_guard/suite-nonsql-after-guard.txt`). The `--no-build` run measured the guarded binary —
`WebApi.dll` (11:24:13) is newer than the edited `FinalizeService.cs` (11:23:44), checked because the
repo's own CLAUDE.md records an hour lost to exactly that stale-assembly trap.

The positive control is the part that keeps this from being a membership test in name only:
`CompanyAccount` (120) is a defined member sitting *outside* any contiguous range of its neighbours
(110 Cash, 200 Stripe). A range check would refuse it; `Enum.IsDefined` admits it and the credit sale
still journals its tender by name. So the guard is narrower than "reject everything" and wider than
"reject one value".

Each rejection case also asserts the journal is **empty** afterwards — a guard that threw after the row
existed would not close C1 at all.

## What I could not measure, stated rather than substituted

- **The SQL tier did not run.** I had no SQL container slot, so the 88 `[Trait("Database","SqlServer")]`
  tests were excluded by filter. I did not approximate them with the SQLite harness and call it the same
  thing. Nothing in this change touches the model, a migration, an index or a constraint, so I expect no
  SQL-tier interaction — but *expect* is the correct word and the tier is unmeasured.
- **No browser walk.** Under C5 that is what acceptance would need; this lane produced none.
- **The guard is on the writer, not on the table.** Test code that builds a `JournalPaymentLine` by hand
  (16 files do) still bypasses it, and so would any future production writer that did not call
  `FinalizeService`. A DB-level check constraint would close that, but it is a migration — C2 territory,
  one author at a time, and not this lane's.

## Constraints, pass 2

- **C1 honoured.** No UPDATE, no DELETE, no backfill, no purge. The change is purely preventive: it stops
  a row that could never be repaired from being written in the first place, which is the only lawful way
  to fix an append-only defect.
- **C2 not engaged** — no migration, no `OnModelCreating` change, no index or constraint. The enum column
  is untouched.
- **C3 not engaged** — no new capability, service, route or flag. The guard sits inside a service that is
  already fully wired and already reached by four production callers.
- **C4 not engaged** — no new money-path write; actor attribution on the existing writes is unchanged.
- **C6 not engaged** — no statutory claim added or removed. § 2-8-7 is named only in a code comment
  explaining which document the payer line belongs to.
- **C7 not engaged** — no log or telemetry call added. The exception message carries the rejected integer
  and nothing else; no token, key or secret is read or written.

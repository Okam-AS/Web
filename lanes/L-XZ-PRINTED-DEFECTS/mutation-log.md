# L-XZ-PRINTED-DEFECTS — mutation log

Lane: L-XZ-PRINTED-DEFECTS · brief 7a1d4658 · PLAN_ACTOR=agent:L-XZ-PRINTED-DEFECTS

## Base and ancestry

| | |
|---|---|
| worktree | `/Users/svendaneel/okam/wt-xzprinted` (created by this lane) |
| branch | `lane/xz-printed-defects` — local, never pushed |
| base commit | **`9bdfc267`** = `lane/xz-credit-fields` tip, the `L-XZ-CREDIT-FIELDS` build |
| its base | `569887a5` |
| my commit | **`ca2570ac`** — local, never pushed, tree clean afterwards |

**My commit is a DESCENDANT of `9bdfc267`, not of `569887a5`.** Verified with
`git merge-base --is-ancestor` in both directions: `9bdfc267` and `569887a5` are both ancestors of my
HEAD. A merge that takes only `569887a5` drops the nine report fields, the single credit predicate
(`KassaCreditSale.CreditPortionOf`) **and** this lane's rendering fix — that has already happened once
on this surface, so the whole chain must land as one tip.

`integration/mig-stack-land` was **not** chosen: it is diverged, not behind (merge-base `3579bbbc`,
54 ahead / 34 behind), so it is not a base this work can sit on.

No shared ref moved. `/Users/svendaneel/okam/OkamAPI-modules` never entered. Nothing pushed.
No migration authored — `ZReport` still has no columns for these figures and none were added.
The single credit predicate was used, not duplicated: this lane touched neither `KassaCreditSale` nor
`CreditPortionOf`, and wrote no second answer to "which lines are credit" or "how much of one".

---

## What was actually found

The three defects were reported as *fixed* in `L-XZ-CREDIT-FIELDS`'s return. Two of them are.
**Defect 1 was still live**, and the pins here found it before the fix did.

`L-XZ-CREDIT-FIELDS` addressed defect 1 by *shrinking the label until it fitted one world* —
`Utleveringskvitteringer` → `Utleveringskvitt.`, measured against a **single-digit count beside a
ten-character amount**, which lands on exactly 21 characters in a 21-character space. Its guard test
(`No_kredittsalg_figure_is_truncated_off_the_paper`) asserts no ellipsis anywhere on the paper, but
builds its world with `DeliveryReceiptCount = 1`. **Every count of ten or more re-truncates**, and the
count is at the *end* of the label, so the count is what `Fit` cuts:

```
count 12,   999 999,99   ->   'Utleveringskvitt. (1… 999 999,99'     count reads as 1
count 127,  999 999,99   ->   'Utleveringskvitt. (1… 999 999,99'     count reads as 1
count 1234, 1 234 567,89 ->   'Utleveringskvitt. … 1 234 567,89'     count absent
count 118,  888 888,88   ->   'herav kredittsalg (1… 888 888,88'     count reads as 1
```

This is the worse half of the original defect, not the better one. The reported symptom was a count
stated **nowhere**; what survived states a count that is **wrong and plausible** — twelve delivery
receipts printed as one, on a document an inspector reads as the record. A missing figure invites a
question; a confident wrong figure does not.

The pins here reproduce it on the rendered document at counts of one, two, three and four digits, which
is why they red where the existing single-digit guard is green. Both files' assertions now hold.

### The fix — the figures never degrade, the prose may

Fixed at the choke point rather than per call site, because a label sized to fit one world only moves
the count at which the next one breaks. `Row` no longer truncates a trailing `(digits)` group: the
count is excluded from what may be shortened, so the **descriptive words** give way instead.

```
BEFORE  'Utleveringskvitt. (1… 999 999,99'      AFTER  'Utleveringskvit… (12) 999 999,99'
BEFORE  'Utleveringskvitt. (1… 999 999,99'      AFTER  'Utleveringskvi… (127) 999 999,99'
BEFORE  'Utleveringskvitt. … 1 234 567,89'      AFTER  'Utleverings… (1234) 1 234 567,89'
BEFORE  'herav kredittsalg (1… 888 888,88'      AFTER  'herav kreditts… (118) 888 888,88'
```

`TrailingCount` accepts only an all-digit group preceded by a space, so a label that legitimately ends
in parentheses — `Kort (Stripe)`, `Vipps (Dintero)` — is still shortened as prose. One change, every
count-bearing row on the document, including the goods-group and per-operator lines.

**Naming was not widened and no § reference was added.** The label stays `Utleveringskvitt.`; the only
change to its line is a comment that no longer claims the abbreviation is what protects the count.
C6 holds: these are the kassasystemforskrifta document itself, and nothing here asserts a control that
does not exist.

Defects 2 and 3 were already fixed on the base. They are now pinned **by value and by placement**
rather than by absence, which is what the exit asks for and what the previous assertions did not give:

- **Defect 2** — the sweep on the base asserts `DoesNotContain("Ukjent kode")`, which is satisfied by
  any wrong Norwegian string and by any wrong English one. The pin here asserts each label **by value**
  against an explicit map, with coverage derived from `Enum.GetValues`, so a tender added to
  `PaymentType` without a Norwegian name fails the build instead of reaching paper. Vipps / Dintero /
  Stripe / Surfboard read the same in both languages as a recorded decision, not as ToString() leaking.
- **Defect 3** — the receivable is 345,67 against 350,00 received, a value shared with no other figure
  on the document and close enough to the right answer that neither the absorbed total (695,67) nor the
  receivable alone (345,67) can be reached by coincidence. The pin asserts the total **and** the
  placement: `Bedriftskonto` and `345,67` absent from `MOTTATT BETALING`, present under `KREDITTSALG`
  with `Faktureres, ikke mottatt` — money owed is still stated, just not as money received.

---

## The pins

`WebApi.Tests/Kassa/XZPrintedStatutoryFigureTests.cs` — 16 tests, all on the **rendered** document.

Every assertion decodes the ESC/POS byte stream and reads the paper. `Lines()` strips the inline style
and alignment commands first, so what is asserted is what an inspector sees. A model-level assertion
would have passed on all three defects, which is why nothing here reads `XReportModel`.

Rows are located **by the amount they carry, scoped to a section** — never by their label, because the
label is exactly what these pins allow to shorten; matching on it would make them unfalsifiable at the
widths that matter. Every amount in each world is unique within its section, and `LineInSection`
asserts that uniqueness rather than assuming it.

| Test | Pins |
|---|---|
| `The_printed_x_states_the_delivery_receipt_count_at_every_width` (5 cases) | defect 1, X |
| `The_printed_z_states_the_delivery_receipt_count_at_every_width` (5 cases) | defect 1, Z |
| `No_statutory_count_on_the_printed_report_is_cut_short` | defect 1, the whole class of count rows |
| `A_count_is_never_what_a_narrow_line_gives_up` | defect 1, the trade stated: prose shortens, figures do not |
| `Every_declared_tender_prints_its_norwegian_name_and_not_its_identifier` | defect 2, by value |
| `The_refusal_the_sweep_relies_on_is_reachable` | defect 2, keeps the sweep non-vacuous |
| `No_declared_tender_falls_through_to_the_unknown_refusal` | defect 2 |
| `The_received_sum_excludes_the_receivable_and_still_states_it` | defect 3, total and placement |

Counts are read back with the **last** parenthesised integer on the line, so `Kort (Stripe) (1)` is
read correctly rather than as Stripe.

---

## Mutation states — 4 mutations, 8 states, none survived

Applied by rewriting the source file (mtime moves), full build every time, **never `--no-build`**.
Scope: the 16 pins. Recompilation confirmed by a changed `WebApi.dll` mtime on every state, so no
result was measured against a stale binary. Driven from `mutate.py` in the lane scratchpad, in Python.

| # | Reintroduced defect | State | Result | Recompiled |
|---|---|---|---|---|
| M1 | defect 1 — `FitKeepingCount` → `Fit` in `Row` | MUTANT | **RED** 8 failed / 8 passed | yes |
| M1 | | RESTORED | GREEN 0 / 16 | yes |
| M2 | defect 2 — `default:` → `return paymentType.ToString();` | MUTANT | **RED** 1 failed / 15 passed | yes |
| M2 | | RESTORED | GREEN 0 / 16 | yes |
| M2b | defect 2, the reported symptom — M2 plus the `CompanyAccount` case deleted, so a Norwegian Z prints `CompanyAccount` | MUTANT | **RED** 3 failed / 13 passed | yes |
| M2b | | RESTORED | GREEN 0 / 16 | yes |
| M3 | defect 3 — `payments` stops excluding the company account, so `Sum mottatt` absorbs the receivable | MUTANT | **RED** 1 failed / 15 passed | yes |
| M3 | | RESTORED | GREEN 0 / 16 | yes |

Named reds:

- **M1** → `The_printed_x_states_..._at_every_width` (counts 12, 127, 1234),
  `The_printed_z_states_..._at_every_width` (counts 12, 127, 1234),
  `No_statutory_count_on_the_printed_report_is_cut_short`,
  `A_count_is_never_what_a_narrow_line_gives_up`.
  Failure text is the defect itself, quoted off the paper:
  `The printed line for 999 999,99 in KREDITTSALG states no count: "Utleveringskvitt. (1… 999 999,99"`.
  The single-digit cases stay green under M1 — which is precisely why the existing single-digit guard
  did not catch this.
- **M2** → `The_refusal_the_sweep_relies_on_is_reachable`. M2 alone leaves every *declared* tender
  named, so only the undeclared-code branch exposes the fallback; that test exists for this reason and
  is what makes the by-value sweep non-vacuous.
- **M2b** → `Every_declared_tender_prints_its_norwegian_name_and_not_its_identifier`
  (`CompanyAccount printed "CompanyAccount", expected "Bedriftskonto"` — the reported symptom, verbatim),
  `The_refusal_the_sweep_relies_on_is_reachable`, and
  `The_received_sum_excludes_the_receivable_and_still_states_it` (its placement assertion looks for
  `Bedriftskonto` under `KREDITTSALG`, which the mutant renames).
- **M3** → `The_received_sum_excludes_the_receivable_and_still_states_it`
  (`Sum mottatt` 695,67 instead of 350,00, and `Bedriftskonto` back inside `MOTTATT BETALING`).

**No mutant survived its first pass**, so the sibling's fix-the-world-not-the-assertion remedy was not
needed here and nothing was weakened to make a mutation red.

### One process failure, and it was in my harness, not in what it proves

M2b's first RESTORE and M3 both reported `NO-RESULT`. Diagnosed the harness before touching anything
it measures: M2b's second pair was a **deletion** (`find` → `""`), and reversing it made the driver run
`text.replace("", case_text, 1)`, which in Python inserts at **position 0** — it prepended the
`CompanyAccount` case to the top of the file, so the next two builds did not compile and reported no
test result at all. The source was repaired by hand back to the intended state (`git diff` re-checked:
45 insertions / 4 deletions, only this lane's change, the `CompanyAccount` case back in its original
position after `PayInStore`), the driver was changed so a deletion pair carries **surrounding context**
instead of an empty anchor, and it now refuses an empty anchor outright. M2b and M3 were then re-run
from scratch, both red, both restored green. The rows above are the re-run.

`exit=144` on one full-suite invocation **did not reproduce**: it came from piping `dotnet test` into
`tail`, not from the suite. Re-run redirected to a file, exit 0.

---

## Suite

Container-free tier only, `--filter "Database!=SqlServer"` — never `FullyQualifiedName!~SqlServer`.

| Run | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| base `9bdfc267` (measured by `L-XZ-CREDIT-FIELDS`) | 4641 → 4656 | 4644 | 0 | 12 |
| this lane | **4672** | **4660** | **0** | **12** |

Delta is exactly the 16 new tests. Neighbouring rendered-document work re-run on its own as well —
`Kassa` + `Meals` + `EscPos`, container-free: **1274 passed / 0 failed / 3 skipped**. The base's own
`No_kredittsalg_figure_is_truncated_off_the_paper`, `EscPosXZReportBuilderTests`,
`Triage_escpos_ControlByteInjectionTests`, `CopyReceiptPrintDocumentTests` and
`MealsPosCreditTenderReportTests` are all still green under the changed `Row`.

**ZERO containers started and none touched.** `docker ps` was captured before and after the full run and
is identical: `okam-lvsp-sql`, `okam-lwr-sql`, `okam-lws-sql`, `okam-lws-staff-sql`, `zen_pasteur` —
all foreign, all left alone.

## Tree hygiene

The full run dirties `artifacts/journeys/ev-dietary/run-sheet.{json,md}` with fresh timestamps
(`EventsDietaryRunSheetWireTests`) — the base's behaviour, reported independently by
`L-XZ-CREDIT-FIELDS` and by `L-MEALS-XZ-CREDIT` on 2026-08-01. **Restored, not committed.**

Committed by pathspec: `Services/Kassa/EscPosXZReportBuilder.cs` and
`WebApi.Tests/Kassa/XZPrintedStatutoryFigureTests.cs` only.

`Services/OkamFunctionsDocumentRenderer.cs` was not opened, printed, copied or committed.

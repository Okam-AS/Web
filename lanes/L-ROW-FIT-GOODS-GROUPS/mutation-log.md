# L-ROW-FIT-GOODS-GROUPS - mutation log

The fit rule's count-bearing rows, pinned across widths instead of measured at one. Every claim below
was watched RED against a deliberate mutation and watched GREEN again after restore, and the one
mutant that SURVIVED is reported with the reason rather than left out.

**The lesson this lane institutionalises: a fix measured against one world is a fix for one world.**
The delivery-receipt count was reported fixed and was not. The repair shrank the label
(`Utleveringskvitteringer` to `Utleveringskvitt.`) against a single world - a one-digit count beside a
ten-character amount, landing on exactly the 21 columns available - and **its guard test built that
same world.** Every count of ten or more re-truncated.

## Where

| | value |
|---|---|
| branch | `lane/xz-printed-defects` |
| worktree | `/Users/svendaneel/okam/wt-xzprinted` |
| base | `ca2570ac` |
| commit | `9cbe2b93` |
| ancestry | descendant of `9bdfc267` **and** `569887a5` **and** `ca2570ac`, all verified with `git merge-base --is-ancestor` |

Container-free tier only (`--filter "Database!=SqlServer"`). No container was started, none was
touched. No migration authored. No shared ref moved. Nothing pushed. One file added, no production
file changed:

- `WebApi.Tests/Kassa/XZPrintedRowFitSweepTests.cs`

`artifacts/journeys/ev-dietary/run-sheet.{json,md}` were dirtied by the full-tier run as the brief
predicted, and restored to their baseline hashes (`9051c6eb…`, `ae90f37f…`), not committed.

## Baselines (before any edit)

| run | result |
|---|---|
| `XZPrintedStatutoryFigureTests` + `EscPosXZReportBuilderTests` + `XZCreditAndDeliveryReportTests` | 32/32 pass |
| whole container-free tier, after the new file landed | **4715 passed, 0 failed, 12 skipped**, 6 m 37 s |
| `XZPrintedRowFitSweepTests` | 55/55 pass |

---

## What is pinned

`EscPosXZReportBuilder.Row` fits a label beside its amount inside 32 columns and cuts the label's TAIL
when it does not fit. Every count-bearing label is composed as `<prose> " (" <digits> ")"`, so **the
count is the part at the cut edge** - on all 24 such rows, the goods-group and per-operator lines
included, not only the delivery row the defect was reported on. The repair excludes a trailing
all-digit group from what may be shortened.

The sweep is **five amount widths x five count widths = 25 worlds**, and all **29 count-bearing rows**
are read off the rendered ESC/POS document in each:

| amount base | printed | field width | columns left for the label |
|---|---|---|---|
| `100` | `1,26` | 4 | 27 - the reference; Row cuts nothing here |
| `100 000` | `1 000,26` | 8 | 23 |
| `99 000 000` | `990 000,26` | 10 | 21 - **the one world the original fix was sized to** |
| `120 000 000` | `1 200 000,26` | 12 | 19 |
| `9 900 000 000` | `99 000 000,26` | 13 | 18 |

Count widths swept: **1, 2, 3, 4 and 6 digits.** Six is in because "four or more" is not a width.

Three properties the brief demanded, and how each is met:

- **Located by amount, never by label.** `LineInSection` matches on `" " + printedAmount` at end of
  line inside the section, and asserts EXACTLY ONE match. Every amount is `base + <field index>`, so
  all 29 are distinct inside their section at every base, derived totals (`Sum mottatt`,
  `Sum korreksjoner`) included - checked exhaustively before the test was written. Requiring the
  leading space is what stops `1 234,56` being found inside `91 234,56` and stops a negative row being
  found by its positive figure.
- **Digits asserted by value.** `ReadCount` returns the last `"("` followed by digits, closing paren
  OPTIONAL, and the assertion demands found + closed + equal. A truncated `(1…` is therefore reported
  as *"states the count of 25 as 2, cut off mid-figure"* rather than as "no match" - the failure
  message states the defect the way a reader meets it.
- **The sweep reaches widths where the label must give way** - measured OBSERVATIONALLY.

### The non-vacuity trap this lane walked into first

The first draft classified "the label gave way" as *the line contains an ellipsis*. That is **wrong**,
and the suite said so immediately: `A_label_short_enough_to_fit_is_not_shortened_at_all` failed at the
4-character amount with

```
["Varme retter og sup… (2)    1,01", "Kristoffer Vestbøst… (7)    1,24"]
```

The builder trims the goods-group and operator names to 20 columns **itself, before any amount is
known** (`Fit(group.Name, 20)`, `Fit(op.OperatorName, 20)`). Those two rows carry an ellipsis in every
world, including worlds where `Row` does nothing. Counting them would have inflated the non-vacuity
floor by 50 renders that prove nothing.

The pin now identifies `Row`'s cut by **comparing the label against the same label beside a
four-character amount**: shorter here than there means `Row` took the characters. No layout is
recomputed - the assertion never re-derives the arithmetic it is judging.

On that honest measure the sweep cuts **196 labels**, spread as:

| by count width | 1d 22 · 2d 30 · 3d 36 · 4d 48 · 6d 60 |
|---|---|
| **by amount width** | 8ch 23 · 10ch 42 · 12ch 61 · 13ch 70 (4ch is the reference) |
| **by section** | OMSETNING 88 · KORREKSJONER 36 · KREDITTSALG 30 · MOTTATT BETALING 22 · PER BETJENT 20 |

`The_sweep_reaches_widths_where_the_label_must_give_way` holds the sweep to a floor of 150, to at
least one cut at EVERY count width, to at least one at every amount width above the reference, and to
at least 5 sections - then asserts the count survived on **every one of the 196**.

**KONTANTBEVEGELSER is the one section that never appears**, honestly: `Innbetalt` and `Utbetalt` are
short enough to hold a six-digit count beside the widest amount in the sweep. Stated in the test.

---

## M1 - the choke point reverted (the mutation the exit criterion names)

`Services/Kassa/EscPosXZReportBuilder.cs`, in `Row`: `FitKeepingCount(left, available)` back to
`Fit(left, available)`. A trailing digit group becomes shortenable again - **the exact state the
sibling shipped.**

| state | `XZPrintedRowFitSweepTests` |
|---|---|
| MUTATED | **RED - 46 failed / 9 passed of 55** |
| RESTORED | **GREEN 55/55** |

Six distinct test methods red: both theories, `The_sweep_reaches_widths_where_the_label_must_give_way`,
`A_goods_group_name_gives_way_before_its_quantity`, `An_operator_name_gives_way_before_the_sale_count`,
`A_parenthesised_word_inside_a_label_is_still_cut_as_prose`.

**The nine survivors are the finding.** Every one of them is a world where `Row` cuts nothing:

```
At_the_reference_width_row_cuts_nothing_which_is_why_it_cannot_be_the_only_world
..._x_keeps_its_digits(amountWidth: "4ch", countDigits: 1 | 2 | 3 | 4)
..._z_keeps_its_digits(amountWidth: "4ch", countDigits: 1 | 2 | 3 | 4)
```

A pin built at a single narrow width would have gone green against this mutant in its entirety. That
is the whole lesson, mechanised.

The 10ch x 2-digit failure message reproduces the reported defect verbatim - **the count restated as a
different, entirely plausible number**:

```
Amount width 10ch, 2-digit counts: 7 of 29 count-bearing rows lost their figure.
  OMSETNING 990 000,01 states no count at all: "Varme retter og sup…… 990 000,01"
  OMSETNING 990 000,02 states the count of 12 as "1", cut off mid-figure: "Alkoholfri drikke (1… 990 000,02"
  OMSETNING 990 000,05 states the count of 15 as "1", cut off mid-figure: "herav kontantsalg (1… 990 000,05"
  OMSETNING 990 000,06 states the count of 16 as "1", cut off mid-figure: "herav kredittsalg (1… 990 000,06"
  MOTTATT BETALING 990 000,11 states the count of 21 as "2", cut off mid-figure: "Vipps (Surfboard) (2… 990 000,11"
  KREDITTSALG 990 000,15 states the count of 25 as "2", cut off mid-figure: "Utleveringskvitt. (2… 990 000,15"
  PER BETJENT 990 000,24 states no count at all: "Kristoffer Vestbøst…… 990 000,24"
```

Note the goods-group and per-operator rows in that list. Those are the lines the brief named as
carrying the same latent exposure, and they are exposed here at a TWO-digit count and a ten-character
amount - the ordinary end of a trading day, not an extreme.

## M2 - the digit test inverted

`TrailingCount`: `if (!char.IsDigit(...)) return null;` to `if (char.IsDigit(...)) return null;`.
Figures become shortenable, prose becomes protected.

| state | result |
|---|---|
| MUTATED | **RED - 46 failed / 9 passed of 55** |
| RESTORED | **GREEN 55/55** |

Same nine survivors, same reason.

## M3 - "a fix for one world", in miniature

`FitKeepingCount`: `if (count == null || count.Length > width)` to
`… || count.Length > 5`. The count is protected **only when it is one or two digits** - the shape of
the original defect exactly, and the shape a pin sampled at one count width cannot see.

| state | result |
|---|---|
| MUTATED | **RED - 30 failed / 25 passed of 55** |
| RESTORED | **GREEN 55/55** |

Broken out by count width (10 theory cases per width, X and Z together):

| count width | passed | failed |
|---|---|---|
| 1 digit | 10 | **0** |
| 2 digits | 10 | **0** |
| 3 digits | 2 | **8** |
| 4 digits | 2 | **8** |
| 6 digits | 0 | **10** |

**This is the decisive row of the log.** The rule holds perfectly at one and two digits and collapses
from three up. The two stragglers passing at 3d and 4d are the 4ch reference width, where nothing is
cut. A guard test that picked any single count width at or below two digits - which is what a Norwegian
trading day mostly looks like - would have shipped this. Sweeping is the only thing that catches it.

## M4 - the digit test DELETED - **SURVIVOR, reported**

`TrailingCount`: the whole `for` loop enforcing all-digits removed, so ANY trailing parenthesised
group is protected, prose included.

| state | `XZPrintedRowFitSweepTests` + `XZPrintedStatutoryFigureTests` + `EscPosXZReportBuilderTests` |
|---|---|
| MUTATED | **GREEN 75/75 - the mutant survives** |
| RESTORED | **GREEN 75/75** |

**Why, established rather than assumed.** `why-m4-survives.py` parses every `Row(` invocation in the
builder and classifies its left argument by the only thing the digit test reads - the shape of the
trailing parenthesised group. All 45 call sites:

| shape | count |
|---|---|
| no trailing `)` at all - `TrailingCount` returns null on its first guard | 21 |
| ends with `" (" + <long>.ToString(InvariantCulture) + ")"` | 24 |
| **anything else - where the digit test would be load-bearing** | **0** |

So the digit test can only ever see digits, and can only ever return true. It has **no reachable
difference through this builder.** Demonstrated on the rendered rule:

```
  Utleveringskvitt. (1234)   pristine |Utleverings… (1234) 1 234 567,89|
                             M4       |Utleverings… (1234) 1 234 567,89|   SAME
  Vipps (Surfboard) (1234)   pristine |Vipps (Surf… (1234) 1 234 567,89|
                             M4       |Vipps (Surf… (1234) 1 234 567,89|   SAME
  Utleveringskvitt. (-12)    pristine |Utleveringskvitt. … 1 234 567,89|
                             M4       |Utleveringsk… (-12) 1 234 567,89|   DIFFERS
```

The only world in which the two builds differ is a **negative count**, where `ToString` emits a leading
`-` and the group stops qualifying. Every count on `XReportModel` is a non-negative journal tally, so
that world is not reachable from the projection.

**Not killed, deliberately.** Killing it would need either a reflection-tier pin on a private helper -
against this file's whole premise, which is that every pin reads the rendered document, because a
model-level assertion is what let all three of these defects through - or a test blessing the printed
form of a negative count, which would invent a specification for a shape the projection cannot produce.
Neither is in this lane's scope.

**What this survivor actually means:** the digit test is correct and costs nothing, but it guards a
FUTURE label, not a present one. The comment beside it justifies itself with `"Kort (Stripe)"` and
`"Vipps (Dintero)"` - and those labels never reach `Row` in that form, because `PaymentLabel`'s result
always has `" (" + count + ")"` appended before `Row` sees it. The guard is right; its stated example
is not one the builder can currently produce. Worth a reviewer's eye, not a code change from this lane.

---

## The two rows the brief named

Pinned individually as well as in the sweep, each proving `Row` cut the name by comparing against the
reference width rather than by trusting the ellipsis:

- `A_goods_group_name_gives_way_before_its_quantity` - name `"Varme retter og supper"` (22 chars,
  trimmed to 20 by the builder, then cut again by `Row`), 4-digit quantity, 13-character amount. The
  quantity is asserted by value off the paper.
- `An_operator_name_gives_way_before_the_sale_count` - `"Kristoffer Vestbøstad"`, same shape.
- `A_parenthesised_word_inside_a_label_is_still_cut_as_prose` - `"Vipps (Surfboard) (n)"`: the rail
  name is cut (`Surfboard)` gone from the line) and the count survives. Nothing trims this label before
  `Row` sees it, so the cut is `Row`'s own.

Both the X and the Z document are swept; the Z run additionally asserts `Z-RAPPORT #77` is on the paper,
so a Z that silently rendered as an X could not pass.

## C6

These are kassasystemforskrifta artifacts. **No statutory naming was widened and no section reference
was added.** The test file names no `§` and no forskrift; it refers to the count and the amount as
figures the document states. No production string changed.

## Files

| path | what |
|---|---|
| `WebApi.Tests/Kassa/XZPrintedRowFitSweepTests.cs` | the pin (added, committed at `9cbe2b93`) |
| `lanes/L-ROW-FIT-GOODS-GROUPS/mutate.py` | apply/restore harness; asserts one occurrence before writing and byte-identity on restore |
| `lanes/L-ROW-FIT-GOODS-GROUPS/why-m4-survives.py` | the `Row` call-site census behind the M4 survivor report |
| `lanes/L-ROW-FIT-GOODS-GROUPS/{m1,m2,m3}.trx` | the mutation runs |
| `lanes/L-ROW-FIT-GOODS-GROUPS/fulltier.log` | 4715/0/12 |

Every restore was a full file write from a saved pristine copy, sha-verified (`29599224cda2`), so no
mutation run could be measured against a stale assembly. `--no-build` was never used.

## Failures that did not reproduce

None. Every red above reproduced on demand and cleared on restore.

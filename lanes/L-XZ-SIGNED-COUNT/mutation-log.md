# L-XZ-SIGNED-COUNT — mutation log

Lane: L-XZ-SIGNED-COUNT · brief f3206535 · actor `agent:L-XZ-SIGNED-COUNT`
Repo: OkamAPI · worktree `/Users/svendaneel/okam/wt-xzprinted` · branch `lane/xz-printed-defects`

## Base and ancestry — verified, not taken on the brief's word

Tip as I found it: `9cbe2b93` ("test(kassa): the fit rule is pinned across widths, not measured at
one"). Worktree clean at start.

`git merge-base --is-ancestor <c> 9cbe2b93`, each run:

| commit     | ancestor of my base? | what it carries                                  |
|------------|----------------------|--------------------------------------------------|
| `9bdfc267` | YES                  | the nine report fields, kredittsalg + utlevering  |
| `569887a5` | YES                  | the push-delivery landing                        |
| `ca2570ac` | YES                  | the fit fix (`FitKeepingCount` / `TrailingCount`) |

So **my commit is a descendant of all three**, and of the sweep at `9cbe2b93` on top of them.

My commit: **`6c394057`** on `lane/xz-printed-defects`, parent `9cbe2b93`, two files by pathspec
(`Services/Kassa/EscPosXZReportBuilder.cs`, `WebApi.Tests/Kassa/XZPrintedRowFitSweepTests.cs`),
111 insertions / 15 deletions. Re-verified after committing: `9bdfc267`, `569887a5`, `ca2570ac` and
`9cbe2b93` are all ancestors of `6c394057`. Working tree clean afterwards.

`integration/mig-stack-land` = `4b37f81b`, and `merge-base --is-ancestor` says it is **NOT** an
ancestor of `9cbe2b93` — diverged, exactly as the brief warned. Not used, not touched.

No shared ref moved. No migration authored. No container started. Nothing pushed.

## The defect, as the code has it

`XZReportService.AddGoodsGroups` (line 1026) is called with `sign` `1` at line 823 and **`-1` at line
846**, and accumulates `group.Quantity += sign * line.Quantity` (line 1042). Every other count on the
printed document accumulates `+= 1` — I enumerated all 26 such sites in that file (lines 798, 807, 812,
818, 827, 836, 841, 849, 853, 857, 861, 864, 865, 869, 874, 880, 883, 888, 896, 902, 986, 995, 1002,
1011, 1066, 1073) and none is signed. **The goods-group net quantity is the one count on this paper
that can go below nought**, so the commit's claim that one change covered every count-bearing row is
false in exactly this regime.

`EscPosXZReportBuilder.TrailingCount` (338-359 at base) required an **all-digit** trailing group.
`'-'` is not a digit, so the goods-group row failed the test and `Fit` shortened the whole label,
count included, as prose.

## Reproduced against the real builder, before any fix

Run: `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter
"Database!=SqlServer&FullyQualifiedName~XZPrintedRowFitSweepTests"` — **Failed: 33, Passed: 26 of 59.**

The new pin's own four worlds at that point, quoted from the failure messages (the paper, verbatim):

```
OMSETNING -1 234,00:     expected the count -12,   the paper reads no count
                         "Sesongens smaksmeny (… -1 234,00"
OMSETNING -123,00:       expected the count -123,  the paper reads -1 (cut off mid-figure)
                         "Sesongens smaksmeny (-1… -123,00"
OMSETNING -99 000 000,27: expected the count -1234, the paper reads no count
                         "Sesongens smaksm… -99 000 000,27"
OMSETNING -1 234,00:     expected the count -5,    the paper reads no count
                         "Sesongens smaksmeny (… -1 234,00"
```

The reviewer's first printed line reproduces character-for-character.

**One drift from the brief, recorded rather than smoothed over.** The brief says that at a 19-character
name, quantity −123 and amount −123,00 the paper reads `(-12…`. It reads **`(-1…`** — −123 restated as
−1, not as −12. The `(-12…` form is real but one column wider: it is what amount **−12,00** prints
(available 25, label 26, cut to `…` after 24 characters). Both worlds are now in the theory, so the
form the reviewer quoted is on the record at the width that actually produces it. Same defect, same
class of wrong-and-plausible restatement; only the illustration's width was off by one, so this is a
drift, not a fail-spec.

## The change

`Services/Kassa/EscPosXZReportBuilder.cs`, `TrailingCount`: one optional `'-'` is allowed at
`open + 1` before digits are required, and the at-least-one-digit rule is kept by moving the
empty-group guard behind the sign:

```csharp
var first = label[open + 1] == '-' ? open + 2 : open + 1;
if (first >= label.Length - 1)
{
    return null;
}
```

`open + 1` is always a valid index because the label's last character is `)` and `open` is the last
`(`. `" ()"` and `" (-)"` both still return null. Nothing else in the file changed.

`WebApi.Tests/Kassa/XZPrintedRowFitSweepTests.cs`:

- **The sign is in the sweep, not only in the rule.** A fourth goods group, `"Sesongens meny"` with
  quantity `-Count(27)` and amount `-Amount(27)`, now rides **every one of the 25 cells** — 30
  count-bearing rows per world instead of 29. The name is 14 characters: short enough that the
  builder's own 20-column trim never touches it (so any shortening is Row's own) and that the
  reference width still cuts nothing even at a six-digit count, long enough that every wider amount
  cuts it.
- `ReadCount` reads an optional minus, so a truncated `"(-12…"` is reported **as −12 against the count
  it replaced** instead of as "no match" — the same reason the closing paren was already optional.
- `A_negative_goods_group_quantity_keeps_its_sign_and_its_digits`, a five-world theory. Each world
  asserts the label was cut **observationally** (shorter than the same label beside a five-character
  amount — an ellipsis is not evidence, since the goods-group name can be trimmed before Row ever sees
  it), that the line is 32 columns, that the count reads back **with its sign and all its digits**, and
  that **no ellipsis follows the last `(`**.
- Rows are located **by amount within their section, never by label**, using the file's existing
  `LineInSection` — the negative amounts carry their minus into the search key, so a signed row cannot
  be found by its positive figure.

## Green after the change

`--filter "Database!=SqlServer&FullyQualifiedName~XZPrintedRowFitSweepTests"` — **Passed: 60, Failed: 0.**

`WebApi.dll` mtime moved `13:59:57 → 14:20:16` across that build, so the production assembly the change
lives in was recompiled. No `--no-build` was used anywhere in this lane.

## Mutations

Driver: `lanes/L-XZ-SIGNED-COUNT/mutation-proof.py`, raw output in `mutation-proof.out`. It refuses to
run unless `git rev-parse --show-toplevel` is my worktree, refuses on a non-green baseline, asserts each
needle matched exactly once before claiming the mutant reached the file, restores by **writing content**
(never a timestamp-preserving copy) and `utime`s the file, reports the `WebApi.dll` mtime on every run,
and fails loudly if the production file does not come back byte-for-byte. Suite per run:
`--filter "Database!=SqlServer&FullyQualifiedName~WebApi.Tests.Kassa"`.

Baseline: **913 passed, 0 failed** across the whole Kassa namespace.

| mutant | what it removes | mutant run | verdict |
|--------|-----------------|-----------|---------|
| M1 revert the sign allowance | the named change: a trailing count must be all digits again | **34 failed / 913** | **KILLED** |
| M2 drop the at-least-one-digit rule | the guard keeping `"()"` / `"(-)"` from counting as a figure | 0 failed | SURVIVED |
| M3 protect any trailing parenthesis | the digit test, so `"Kort (Stripe)"` would be protected | 0 failed | SURVIVED |
| M4 stop excluding the count from the cut | the choke point: `FitKeepingCount` degraded to plain `Fit` | **59 failed / 913** | **KILLED** |

Every restore returned **913/913 green**, and the production file came back byte-for-byte. `WebApi.dll`
moved on all nine runs (14:20:16 → 14:24:47 → 14:27:35 → 14:30:13 → 14:32:46 → 14:35:15 → 14:37:43 →
14:40:15 → 14:43:04), so no result was read off a stale assembly.

### M1 in detail — revert red, restore green, both recorded

`mutation-proof-m1.out`. Baseline 913/913 → mutant **34 failed** → restore **913/913**, verdict KILLED.
The 34 are **34 distinct tests**, and the shape of that list is the whole point of this lane:

- **5** are the new dedicated theory, one per world.
- **28** are the sweep itself — 14 cells of the printed **X** and the same 14 of the printed **Z**, at
  every amount width above the reference and at every count width (`8ch`×6-digit; `10ch`×3,4,6;
  `12ch`×1,2,3,4,6; `13ch`×1,2,3,4,6).
- **1** is `The_sweep_reaches_widths_where_the_label_must_give_way`, the non-vacuity floor.

**The sign is in the sweep, not only in the rule.** A pin covering the new rule's happy case alone would
have shown 5 red tests; it shows 34, and 28 of them are cells that existed before this lane and were
blind to a signed count because the sweep only ever built positive ones. That is the third-repair
pattern the exit criteria was written against, closed at the level of the instrument.

### The two survivors — reported, and reachability-limited rather than untested

Both are pre-existing predicates from `ca2570ac`; neither was introduced or weakened here. Neither can be
killed **through the builder's public surface**, and I checked that by enumerating call sites rather than
assuming it: all 45 `Row(` calls in `EscPosXZReportBuilder.cs` (lines 58-240). Every label that contains a
`(` is composed as `<prose> " (" <numeric field>.ToString() ")"`, so:

- **M2** needs a label ending `"()"` or `"(-)"`. The count is always appended last and a `long` never
  renders empty, so no `Build` input reaches the guard.
- **M3** needs a label whose **last** parenthesised group is non-digit. `"Vipps (Surfboard) (1234)"` has
  prose in parens, but it is not the trailing group — the count is. `LastIndexOf('(')` therefore always
  lands on the count, and the digit test never decides anything for a real report.

So `A_parenthesised_word_inside_a_label_is_still_cut_as_prose` genuinely pins that prose gives way, but it
cannot kill M3, because the label it builds has digits in its trailing group either way. Both predicates
are **defensive against inputs `Build` cannot produce**. I have not invented an unreachable pin to turn
them green — that would be a test asserting a private method's shape rather than the document's. Recorded
as a limit of what this file can falsify.

## Scope of the rule

`grep` for `TrailingCount` / `FitKeepingCount` across `Services` and `WebApi.Tests` returns only
`EscPosXZReportBuilder.cs`. `EscPosReceiptBuilder` has a plain `Fit` and no count protection at all — a
different document, not touched here. So the fit rule lives in exactly one place and this change completes
it for the printed X and Z.

## Constraints

- **C6** — Kassasystemforskrifta artifact. **No statutory naming widened and no § reference added.** The
  existing `§ 2-8-2` mention on `FitKeepingCount` is untouched; my new comment says "statutory count"
  generically, a claim I verified against all 26 `+= 1` sites rather than asserted.
- **C2** — no migration authored; the slot stays held.
- No container started; container-free tier only (`Database!=SqlServer`), never `FullyQualifiedName!~SqlServer`.
- Never pushed, no shared ref moved, no production touched.
- `artifacts/journeys/ev-dietary/run-sheet.{json,md}` never dirtied — no full run was made, only filtered
  ones; `git status` shows exactly the two intended files.


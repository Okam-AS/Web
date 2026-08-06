# L-XZ-NEGATED-ABSENCE — mutation log

Lane: L-XZ-NEGATED-ABSENCE · brief `3881dcd4` · actor `agent:L-XZ-NEGATED-ABSENCE`
Repo: `/Users/svendaneel/okam/Web-modules` (`feature/restaurant-modules`), shared checkout.

Everything below was produced by running `mutation-proof.sh` and by mounting the component. Nothing
is asserted from reading the source — which is the point of this lane, since the defect is a
character that source-level reading is structurally unable to see.

---

## 1. Base and ancestry — measured, not taken on the brief's word

Tip as I found it: **`e34977ac`** ("The corrections stop asserting what the repository cannot show"),
261 files dirty from concurrent lanes.

The brief names the finding lane's commit as `c4a4fa44`. Checked rather than assumed:

| fact | result |
|---|---|
| `c4a4fa44` ancestor of `e34977ac`? | **NO** — it is a sibling, parented on `e34977a` |
| ref carrying it | `refs/lanes/L-PRICE-BYPASS-FIVE` |
| working tree vs `c4a4fa44` on `utils/price.js` | **identical** (empty diff) |
| working tree vs `c4a4fa44` on `XReportView.vue` | **identical** (empty diff) |

There are **two** commits with the identical message *"Five legacy pages stop printing an amount
nobody stated as a real figure"* — `8c6e91fa` and `c4a4fa44` — both parented on `e34977a`, and
**neither is an ancestor of the other**. `8c6e91fa` is the one a different sibling
(`L-OFFER-PARTIAL-SUBTOTAL`) merged; `c4a4fa44` is the fuller one and is what this checkout carries.
They are **byte-identical on both files I touch**, so this work composes with whichever lands.

**My base is `c4a4fa44`, not the branch tip.** That is the honest base: my change builds directly on
`isAmountStated`/`UNKNOWN_AMOUNT`, and the working-tree content of both files I edit already equals
that commit. A tree cut from `e34977ac` instead would be one nobody has run.

My commit is the tip of **`refs/lanes/L-XZ-NEGATED-ABSENCE`**, parent **`c4a4fa44`**, built through a
private `GIT_INDEX_FILE` (`read-tree c4a4fa44` → my pathspecs → `write-tree` → `commit-tree` →
`update-ref`). No `checkout -b`, no shared ref moved, nothing pushed, no container.

The SHA is deliberately **not** written here: this file is inside the commit, so naming the hash
changes the hash. Two earlier attempts (`d4ff73db`, then `189af7e5`) each invalidated their own
recorded SHA. The resolved hash is in `docs/plan/returns/L-XZ-NEGATED-ABSENCE-1.md`, which sits
outside the tree; `git rev-parse refs/lanes/L-XZ-NEGATED-ABSENCE` is the authority.

**One honest gap in that tree.** The suite was run against the WORKING TREE, which additionally
carries a sibling's uncommitted edit to `plugins/global-mixin.js` (17 insertions / 3 deletions). I
read that diff: it is **comment-only**, on `wholeAmount`/`fractionAmount`, and does not touch
`priceLabel` — the one method my fix calls. So the committed tree and the tested tree differ only in
prose. `core/` is a git **submodule**, so `core/helpers/tools.ts` is outside this repo's index either
way.

---

## 2. The count — six, and the brief was right

The orchestrator asked me to distrust the count. Measured repo-wide for a U+2212 immediately
preceding an interpolation (`−{{`):

**Six in `XReportView.vue`** — lines `51`, `54`, `88`, `94`, `97`, `178`. Every line number in the
brief is correct.

**Three more of the same construction live outside this lane's exit criterion**, and I did not touch
them:

| file:line | expression | surface |
|---|---|---|
| `components/admin/pos/PosReceiptView.vue:57` | `−{{ priceLabel(line.discountAmount) }}` | the sales receipt |
| `components/admin/pos/CheckLine.vue:55` | `−{{ priceLabel(group.discountAmount) }}` | live check |
| `components/admin/pos/CheckPanel.vue:118` | `−{{ priceLabel(totalDiscount) }}` | live check |

`PosReceiptView` is itself a kassasystemforskrifta artifact, so that one is a real sibling defect and
is recorded as this lane's `spec_gap`. `negatedAmountLabel` is written so those three are a two-line
change each; I left them alone rather than widen into surfaces other lanes may hold dirty.

---

## 3. The defect, reproduced verbatim

Mounted at `c4a4fa44` with every deduction amount absent and the counts stated (real global mixin,
real formatter, nothing mocked but `$i` and `$store`):

```
"pos_report_negative_sales (2)−—"      <-- the finding lane's string, reproduced exactly
"pos_report_return (1)−—"
"pos_report_return−—"
"pos_report_negative_sales−—"
"pos_report_errors−—"
"· pos_report_return (2)−—"
"pos_report_total_negative_sales (2)—"  <-- already correct, no sign
"pos_report_total_return (1)—"          <-- already correct, no sign
```

The last two are why the count is six and not eight: the RETURER section prints the same buckets
**unsigned**, and was never broken. After the fix, all eight read `…—`.

**Why no existing gate could reach it.** The sign is a template literal *outside* the interpolation.
Every absence rule in the estate — `isAmountStated`, the `priceLabel` gate on the global mixin,
`statedSum` — runs *inside* it. A gate cannot refuse a character never passed to it. That is also why
the fix is a label that owns the sign, and not a fifth guard.

---

## 4. The fix

`negatedAmountLabel(amountMinor, formatAmount)` in `utils/price.js`, beside `statedSum` and
`isAmountStated` — the file that already answers this question, so no second answer was authored.
`XReportView` exposes it as `negatedPriceLabel` exactly the way it already exposes `statedSum`, which
keeps the blast radius at one component (only one test in the repo mounts it).

**Four worlds, resolved once from the negated value:**

| input | renders | why |
|---|---|---|
| `5000` (magnitude) | `−kr 50,00` | the sign MUST still print — deleting the literal turns every deduction into a positive |
| `0` | `kr 0,00` | zero is a figure somebody stated; `−kr 0,00` is not smaller, only stranger |
| `-5000` | `kr 50,00` | the negation of a negative is positive; a literal would compose `−kr -50,00` |
| absent | `—` | no sign at all — "we do not know" has no direction |

**The formatter is only ever handed a magnitude, and that is load-bearing.** Core's `priceLabel`
splits minor units with `slice(0,-2)`/`slice(-2)`, so it renders negatives as garbage — verified by
hand:

```
 -4  ->  kr 0,-4
-50  ->  kr -,50
```

Negating the value and letting the formatter print the sign is correct arithmetic handed to a
formatter that cannot render it. That design is mutation **M5** below, and it fails.

---

## 5. Mutation proof — `mutation-proof.sh`, transcript in `mutation-proof.txt`

58 tests. Control green; **every** mutation red.

| # | mutation | result |
|---|---|---|
| M0 | the fix as written (control) | **58 passed** |
| M1 | the original defect, restored verbatim from `c4a4fa44` | **44 failed** |
| M2 | the tempting wrong fix — delete the literal, keep `priceLabel` | **13 failed** |
| M3 | sign owned by the label but absence not gated | **20 failed** |
| M4 | truthiness guard instead of `isAmountStated` | **14 failed** |
| M5 | negate the value, let the formatter print the sign | **9 failed** |
| M6 | sign printed unconditionally | **14 failed** |
| M7 | sign dropped unconditionally | **9 failed** |

M2 is the one that matters most: it is the fix a hurried author would write, it makes `−—` go away,
and it silently turns six deductions on a fiscal document into positives. It is red because the
stated-amount world is pinned **first** at every one of the six rows.

### The mutation proof corrected my own fix

The first draft carried an explicit `if (negated === 0) { return formatAmount(0) }`. Deleting that
branch **passed all 58 tests** — not a gap in the test, but proof the branch was **dead**: negating
zero gives `-0`, and `-0 < 0` is `false`, so zero already took the unsigned path. It is removed, and
M6 was rewritten into a mutation that genuinely changes zero's rendering. Had I not run the proof I
would have shipped a dead branch and called the suite evidence.

---

## 6. Test design

`test/xz-negated-absence.test.js` — 58 tests, all **mounted**.

- Rows are addressed by **section heading, then label**. Three rows print `pos_report_return` and two
  print `pos_report_negative_sales`, so "the row containing the key" would assert against the wrong
  row and pass while the row under test stayed broken. (The sibling file warns about the column
  version of this trap; this is the row version.)
- Nothing mocks `priceLabel`. A mocked formatter would re-describe the fix instead of testing it.
- A **structural sweep** asserts that with every amount absent, no `<span>` anywhere on the report
  contains U+2212 followed by the unknown mark. That is the exit criterion literally, and it is what
  would catch a seventh row or one added next month.
- A source-level assertion that `−{{` no longer appears is included but is **explicitly marked
  non-load-bearing** — it is a tripwire at the place the literal would be rewritten, not evidence.

Regression: **179 tests / 6 suites pass** across every file importing `utils/price` or mounting the
component (`chf-format`, `price-absence`, `price-crosscurrency`, `price-gate-shadow`,
`price-bypass-legacy`, and this one). The sibling's own `XReportView` mount test is among them.

---

## 7. Constraints

C1, C2, C4, C7 not engaged (no SQL, no migration, no write path, no logging). C3 not engaged — no new
service; the helper is reached from the template that ships. **C6 honoured**: no statutory naming was
widened and no § reference was added or moved. The existing `§ 2-8-2` comments were left exactly as
found; this change alters only how an absent figure renders on a document that already exists.

**C5**: this lane's evidence is a mutation-proved mount and a verbatim before/after capture — not a
suite-green claim. The rendered rows above are the artifact. A person still has to look at an X
report for acceptance; nothing here is marked accepted.

# L-XZ-RESIDUAL-SITES — the three fiscal surfaces the negated-absence fix did not reach

Baseline `b150668b` on `refs/lanes/L-XZ-NEGATED-ABSENCE`. Parent `c4a4fa44` (L-PRICE-BYPASS-FIVE).
Nothing here was rebased and `8c6e91fa` was never merged, fetched or read.

---

## 1. What was actually wrong, stated no larger than it is

`L-XZ-NEGATED-ABSENCE` fixed six X/Z report rows that wrote their minus sign as a template literal
OUTSIDE the interpolation — `−{{ priceLabel(x) }}` — where every absence rule in this repo is
structurally unable to see it. Three surfaces wrote the same construction and were left:

| file | line | row |
|---|---|---|
| `components/admin/pos/PosReceiptView.vue` | 57 | the per-line discount on a printed receipt |
| `components/admin/pos/CheckLine.vue` | 55 | the per-line discount on an open check row |
| `components/admin/pos/CheckPanel.vue` | 118 | the discount total in the check footer |

The review that approved the X/Z fix checked all three and found each behind a `v-if="… > 0"`, and
concluded `−—` is unreachable at all three today. **That is very nearly right, and the correction
matters enough to have changed this lane's proof.**

`x > 0` is a RELATIONAL test. `isAmountStated(x)` is the absence rule. They do not agree. Ran both
predicates over nineteen value shapes (`lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js`, output
below) rather than reasoning about them — which is the step that produced the "unreachable" reading.
FOUR shapes pass the guard while the rule refuses them, and every one reaches the label:

```
shape                   guard `> 0`   isAmountStated   the label prints
Infinity                true          false            THE UNKNOWN MARK   <-- unstated, renders
'Infinity'              true          false            THE UNKNOWN MARK   <-- unstated, renders
true                    true          false            THE UNKNOWN MARK   <-- unstated, renders
{valueOf:()=>5000}      true          false            THE UNKNOWN MARK   <-- unstated, renders
5000                    true          true             a figure
'50'                    true          true             a figure
0 / -0 / -1 / -5000     false         true             (row hidden by the guard)
null / undefined        false         false            (row hidden by the guard)
'' / '   ' / NaN        false         false            (row hidden by the guard)
-Infinity / false       false         false            (row hidden by the guard)
{} / []                 false         false            (row hidden by the guard)
```

So before this lane, `PosReceiptView` really did render `Personalrabatt −—` for all four, in real
mounted DOM with the guard untouched. That is recorded verbatim in `mutation-proof.txt` §A — it is
not an argument, it is the string the unported component produced.

**And the honest size of it.** `Infinity` has a real provenance — `JSON.parse('1e400')` IS `Infinity`,
so a number literal past double range on the wire produces one with nobody writing it — but a
well-formed .NET `long` cannot get there, and a boolean or an object in a `long …Amount` field is a
contract violation upstream, not a discount. **No realistic backend payload puts `−—` on a receipt
today.** This lane is hardening. It is written up as hardening, the tests are named for the guard
rather than for a defect, and the commit does not claim an incident.

What makes it worth doing anyway: the residual safety is *incidental*. Nobody wrote `> 0` as an
absence gate, no comment marks it load-bearing, and at `CheckLine` it guards a field the component's
own parent constructs. The moment anyone relaxes one of the three to tell "no discount" apart from
"discount unknown", all four worlds become renderable in that same edit — and the surface where that
lands first is `PosReceiptView`, which is itself the kassasystemforskrifta artifact `print()` puts on
the bong roll. It was ported first for that reason.

---

## 2. The ruling on `CheckPanel.vue:293` — kept, and NOT for the reason the brief anticipated

```js
totalDiscount () {
  return this.groups.reduce((sum, g) => sum + (g.discountAmount || 0), 0);
}
```

The brief framed this as: on a live check "no group discount" is plausibly a semantic zero rather
than an absence, which would make the coercion correct — decide it.

**Neither answer is right, because the premise is wrong. `g` is not a wire object.** `groups`, thirty
lines above, BUILDS it:

```js
map[key] = { …, discountAmount: 0, … }      // line 255 — seeded as a genuine zero
…
g.discountAmount += line.discountAmount || 0 // line 266 — only ever += a number
```

By construction `g.discountAmount` is always a finite number. The `|| 0` at 293 **cannot be reached
by an absence**. There is no hole for `statedSum` to preserve, and this is not the manufactured-sum
shape at all — it is a redundant coercion over a locally-constructed number.

**RULING: the coercion at 293 stays.** Not because a zero discount is semantically a zero (it is, but
that is not what decides it) — because the value it guards is guaranteed by the six lines above it
and by nothing else. Replacing it with `statedSum` would apply the X/Z answer to a shape that does
not have the X/Z problem. Removing it would read as a claim that the field is guaranteed somewhere
more durable than a reducer in the same file. Left as-is, with the reasoning written into the file so
the next reader does not re-litigate it.

**The second half of the ruling, which is the part worth keeping.** The coercion that IS the
manufactured-sum shape is one screen up, at **line 266**, where `line` is the wire object. A member
line whose `discountAmount` never arrived is added as `0`, so a discounted group silently UNDERSTATES
its discount and `totalDiscount` inherits that understatement — the exact failure `statedSum` was
written for, one layer below where the brief was looking.

**It is deliberately not fixed here, and the reason is not scope.** Turning 266 into `statedSum` is
not a free correction. `g.discountAmount` would become `null`, `null > 0` is false, and the guards at
`CheckLine.vue:54` and `CheckPanel.vue:113` would then delete the discount row ENTIRELY — while the
backend's `check.finalAmount` still reflects the discount. The operator would be looking at a bill
whose total is lower than its lines with nothing on screen saying why. Trading an understated figure
for a vanished one is not obviously the better honesty, and choosing between them is a display-
semantics decision about what a POS should show when part of a discount is unknown. **Flagged, not
taken.** A lane that takes it must move the guard and the sum together.

---

## 3. The tripwire, and the trap that would have made it fake

`test/xz-negated-absence.test.js`'s source scan was pinned to `XReportView.vue`. It now walks every
`.vue` under `components/admin/pos/`, **with no allowlist** — which is possible only because the three
residual sites were ported FIRST. Widening it before the port would have forced one, and an allowlist
is how a tripwire stops being a tripwire: the next surface to write `−{{` gets added to it in the same
commit that ships the defect.

**The trap.** The original scan sliced the file at `source.indexOf('</template>')`. A Vue SFC's root
template is full of `<template v-if>` blocks that close early, and **18 of the 39 POS components have
more than one closing tag**. In both files this lane ported, the site sits past the first:

```
CheckLine.vue    first </template> line 28   discount row line 55
CheckPanel.vue   first </template> line 90   discount row line 118
```

A straight port of the existing scan would have read the first 28 lines of `CheckLine.vue`, found
nothing, passed, and been reported as coverage. `lastIndexOf` is the root close. Mutation **M7**
flips it back and the guard test reds — that is what makes the guard non-decorative.

Two further ways a source scan silently stops asserting, both closed: an empty or renamed directory
(**M8**, caught by the file-count assertion), and a filter that quietly narrows back to one file
(**M9**, same assertion).

One branch was NOT shipped. `rootTemplateOf` first carried `if (close === -1) throw`. No file in the
directory can reach it, so nothing reds if it is deleted — dead by the standing rule. It was replaced
with a test that asserts every scanned file HAS a root close, which real data does exercise.

---

## 4. Evidence

`mutation-proof.sh` runs entirely inside `$SCRATCH/xz-residual-mut`. The sibling lane's proof mutated
the shared working tree with a trap-restore while other lanes were running in it; it restored
cleanly, and this does not rely on that twice. Nothing under `/Users/svendaneel/okam/` is written by
the proof except the copied result file.

**§A — the new tests against the UNPORTED baseline `b150668b`: 24 failed.** Not an argument that the
port matters; the transcript contains what the unported receipt row rendered:

```
Received string:        "Personalrabatt −—"
```

**§B0 — the ported tree: 106 passed** (61 in the widened X/Z file, 45 in the new one).

**§B — nine mutations, all RED, each recorded with the assertion that caught it:**

| | mutation | caught by |
|---|---|---|
| M1 | receipt row reverts to the literal sign | 6 assertions incl. the whole-document sweep |
| M2 | check line reverts to the literal sign | 6, incl. the panel's whole-tree sweep |
| M3 | check panel total reverts to the literal sign | 3, incl. the widened source scan |
| M4 | **the tempting wrong fix** — delete the sign, keep the formatter | `a stated discount still prints its sign` |
| M5 | the sign re-owned by the caller (`MINUS_SIGN + this.priceLabel(x)`) | 8 |
| M6 | the formatter handed the negated value, not the magnitude | `a stated discount total still prints its sign` |
| M7 | scan slices at the FIRST closing tag | `the scanned region reaches the discount rows…` |
| M8 | scan points at a directory that does not exist | 4 |
| M9 | scan narrows back to `XReportView.vue` | the file-count assertion |

M4 is the one that matters most. Deleting the literal is the obvious way to be rid of `−—` and it
turns a discount into a surcharge on a printed receipt; it must never be the green path.

Each mutation is compared byte-for-byte against the unmutated export before its run — a mutation that
failed to apply is reported as vacuous rather than counted as caught.

**Full suite: `2727 passed, 2 failed` across 115 suites.** Both failures are in `test/journey-artifact-store.test.js`
and are worktree-basename assertions (`Expected /^Web-modules@/`, received
`web-xz-residual@b150668b…`). Proved pre-existing by stashing this lane's entire change and re-running
the suite: identical `2 failed, 36 passed`. That file imports nothing this lane touches, and the
condition belongs to `lane/worktree-basename-pin`.

**The formatter claim, verified rather than inherited.** Core's `priceLabelTool` splits minor units
with `slice(0, -2)` / `slice(-2)`, so `(-4).toString().slice(0,-2)` is `''` → `"0"` and `slice(-2)` is
`"-4"`: it renders **-4 as `kr 0,-4`** and **-50 as `kr -,50`**. Confirmed by running the helper, not
by reading the sibling's commit message. This is why the label takes the magnitude and prepends the
sign itself, and M6 exists to keep it that way.

---

## 5. Files

```
components/admin/pos/PosReceiptView.vue   ported first (the fiscal artifact)
components/admin/pos/CheckLine.vue        ported
components/admin/pos/CheckPanel.vue       ported + the 293 ruling written into the file
utils/price.js                            the docstring now names all nine rows, and says why the
                                          list is exhaustive (the scan enforces it)
test/xz-negated-absence.test.js           source scan widened to components/admin/pos/*.vue
test/xz-residual-sites.test.js            45 mounted assertions across the three sites
lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js   the guard-vs-rule table, runnable
```

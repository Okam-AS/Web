# L-COERCION-WRITE-PATHS — mutation log and coercion census

Branch `lane/coercion-write-paths`, worktree `/Users/svendaneel/okam/web-coercwrite`, parent `3cd2570`.

The carried-forward question was whether any `|| 0` feeds a **write** rather than a **render**. It does,
but not in the shape the question expected, and the difference is the finding.

---

## 1. The thesis, corrected by what was actually there

The brief's distinction holds — a coerced zero on a write changes what is sent — but **on the margin
write paths the null-vs-zero axis was already correct almost everywhere.** Every write-side site that
guards a blank field does it with `=== ''` or `=== undefined`, never with falsiness, and
`MarginSpendPanel.vue:381` even says why in a comment: *"A blank field is null — 'not entered' — and NOT
zero. Zero opening stock is a claim that the larder was empty on Monday."*

The axis that was broken is the **third** world, and it collapses in the same direction:

> `Number('abc')` is `NaN`, and `JSON.stringify({ quantity: NaN })` is `{"quantity":null}`.

So a typo did not become a zero. It became an **absence** — and on this field an absence is not neutral,
it is the documented request to *value the entry from the ingredient's effective price*. A venue that
mistyped a waste quantity recorded a loss against the week's food cost that the server was then asked to
price and could not, and nothing on the screen or the wire distinguished it from a venue that
deliberately stated no quantity.

**Three worlds, not two — but the missing third was `invalid`, not `zero`.** The coercion is invisible at
the call site for the same reason the family flag already gives: it happens inside the serializer.

---

## 2. What was fixed

| # | site | class | before | after |
|---|---|---|---|---|
| W1 | `components/admin/margin/MarginWastePanel.vue:329-350` | **write** | `Number(q)` unguarded → `NaN` emitted | refuses with `mrgs_waste_err_quantity`; `''`→`null`, `'0'`→`0` unchanged |
| W2 | `utils/margin/waste-client.js:33-57` (`optionalQuantity`) | **write** | `NaN` passed the `undefined`/`''` guards → serialized as `null` | `TypeError` at the door; `null`/`''`→`null`, `0`→`0` |

W2 is guarded at the client and not only at the panel because the serializer is where the information is
lost, and `waste-client.js` already states that law for `wasteDate` (`assertBusinessDate` "refuses
anything that is not `yyyy-MM-dd` at the door rather than coercing"). This applies the file's own rule
to the field beside it rather than inventing one.

Dictionary: **one hand-added line each** to `translations/no.ts`, `en.ts`, `de.ts`
(`mrgs_waste_err_quantity`), placed next to its `mrgs_waste_quantity` sibling. No bulk edit, no regex.

Reachability (C3): the field is `type="text"` — `inputmode="decimal"` is a keyboard hint, not
validation — so a typo is typeable; `canRecord` only tested that the string was non-empty. The refusal
renders through the panel's existing `[data-test="waste-error"]` surface, which the `value` field beside
it has used all along. Nothing new needed a route, a flag or a DI registration.

---

## 3. Mutation proof

`python3 lanes/L-COERCION-WRITE-PATHS/mutation-proof.py` → **exit 0**. Transcript in
`mutation-proof.txt`. All four states recorded for every mutant.

| mutant | mutated | restored | dies on |
|---|---|---|---|
| A — panel refusal removed | **RED 1** | GREEN | *a quantity that is not a number is REFUSED* |
| B — client door removed | **RED 1** | GREEN | *refused AT THE DOOR* |
| C0 — panel blank-test → truthiness | **GREEN (survived)** | GREEN | — *equivalent, expected* |
| C — falsy collapse on the parsed number | **RED 1** | GREEN | *a genuinely ZERO quantity travels as 0* |
| D — client blank-test → truthiness | **RED 2** | GREEN | *a stated ZERO reaches the wire as 0* |

Instrument audited in both directions: not every mutant green (so the tree is being rebuilt and the
suite reaches the lines), not every restore red (so the build is not stale). Baseline green is asserted
before anything is believed, and each mutant must go red **on its own named test**, not merely go red.

### 3a. The survivor, and why it is reported rather than hidden

**C0 survived, and it is not a hole in the suite — it is an equivalent mutant.** Rewriting the panel's
`quantity !== ''` as a truthiness test changes nothing, because the value there is
`String(this.draft.quantity).trim()` — a **string**, whose only falsy value is `''`. `'0'` is truthy.
Verified rather than argued:

```
panel domain (string):  q = "0"  q !== '' => true   truthy(q) => true    EQUIVALENT = true
client domain (number): r = 0    r !== '' => true   truthy(r) => false   EQUIVALENT = false
```

That yields a refinement to the standing rule, which is the part worth keeping:

> **The falsiness trap is a property of the value's TYPE, not of the idiom.**
> `!0` is `true` but `!'0'` is `false`. On a numeric field a truthiness guard silently swallows a stated
> zero (mutant D, which dies on two tests). On a string-typed form field it cannot.

A reviewer applying *"use `=== null`, never falsiness"* mechanically to a string form field is enforcing
nothing, and would read C0's survival as a missing test and then write a test that can never fail. C0 is
kept in the table and **asserted to survive**, so that if anyone later changes the panel to guard the
parsed number instead of the raw string, the equivalence argument breaks and the harness says so.

C is the mutant that carries the panel's real risk: a falsy collapse applied *after* the string has
become a number, which is where a plausible bad fix would put it. It dies.

---

## 4. The census — every numeric coercion in the margin surface, classified

Scope: `utils/margin/**`, `components/admin/margin/**`, `pages/admin/margin-*.vue`.
Sites ruled **safe are listed with their reason**, not omitted; a census that does not separate
checked-and-safe from not-checked is indistinguishable from silence.

### 4a. Write-side — the lane's mandate

| site | null | zero | invalid | verdict |
|---|---|---|---|---|
| `MarginWastePanel.vue:345` quantity | `null` | `0` | **refused** | **FIXED (W1)** |
| `waste-client.js` `optionalQuantity` | `null` | `0` | **throws** | **FIXED (W2)** |
| `waste-client.js:70` `valueMinor` | `null` survives | `0` | passthrough | safe — explicit `=== undefined`, so a caller's `null` is preserved as the "price it for me" signal |
| `MarginSupplierItemPanel.vue:314` `optionalNumber` | `null` | `false`→form error | `false`→form error | safe — genuinely three-valued; a typo cannot be saved as "no pack size" |
| `MarginSupplierItemPanel.vue:280,282` | — | — | — | safe — guarded at `:273` |
| `MarginProductLinkPanel.vue:187` `quantityPerSoldUnit` | refused | refused | refused | safe — `validate():176` requires `> 0`, and `Number(null)`/`Number('')`/`Number('abc')` all fail it |
| `MarginIngredientPanel.vue:329` `factorToBase` | refused | refused | refused | safe — guarded at `:324` |
| `MarginSpendPanel.vue:381-382` opening/closing stock | `null` | `0` | refused | safe — **exemplary**; `=== ''` not falsiness, and `validate():358-362` refuses a bad parse first |
| `MarginSpendPanel.vue:375` `amountMinor` | — | `0` | refused | safe — `validate():367` runs first |
| `MarginProductLinkPanel.vue:138` form seed → write | `''` | `'0'` | — | safe — guarded `=== null` |
| `MarginSpendPanel.vue:285,290,291` form seed → write | `''` | `'0,00'` | — | safe — guarded `=== null`; a null stock seeds an **empty box**, not `0,00`, so the round-trip cannot invent a claim that the larder was empty |
| `statement-client.js:198` `minorOrNull` | `null` | `0` | **silently `null`** | **HAZARD, unreachable today** — see 4d |
| `statement-client.js:194` `amountMinor` | passthrough | passthrough | passthrough | **HAZARD, unreachable today** — see 4d |
| `pages/admin/margin-recipes.vue:828-833, 994-1003` | — | — | — | **not assessable — sibling-owned**, see §5 |

### 4b. Render-side — classification only (family `F-COERCION-MAKES-A-ZERO`)

| site | shape | verdict |
|---|---|---|
| `statement-view.js:321-329` (six `longOrNull(x) \|\| 0`) | `null`→`0` | **owned and fixed by `L-MRG-COVERAGE-UNKNOWN`** on `lane/mrg-coverage-unknown`; still present at `3cd2570` because that branch is unmerged. Not re-fixed here. |
| `MarginIngredientPanel.vue:146` `number(conversion.factorToBase)` | `format(null)`→`"0"` | **UNGUARDED — a new, unrecorded instance of the family.** The only unguarded call site of either shared formatter. Renders *"1 pack = 0 grams"* for a factor the server withheld. `conversion` comes straight off the wire with no `numberOrNull` read model in between, unlike every other panel. **Reported, not fixed** — render-side is classification-only under this brief. |
| `money.js:72,80` `ratio`/`number` | `format(null)`→`"0"`, `format(undefined)`→`"NaN"` | unguarded at the mixin boundary; every call site guards `=== null` **except** `MarginIngredientPanel.vue:146` above |
| `money.js:55` `signedAmount` | `null < 0` is `false` → `amount(null)` | unguarded at the boundary; all call sites guard |
| `margin-statements.vue:753` `formatRatio` | same as `ratio` | safe — sole call site `:743` guards `=== null` |
| `MarginMenuMarginPanel.vue:75` `v-if="row.depositMinor"` | truthiness on a `numberOrNull` field | a pant of exactly `0` and an **unknown** pant are both hidden. `:71` four lines above does it correctly (`vatPercent !== null`). Hiding is the safe direction, so this is a conflation, not a false figure. |
| `MarginCoveragePanel.vue:153` `v-if="…unvaluedEntryCount"` | truthiness on a `longOrNull` field | suppresses the *"this total is a FLOOR"* caveat when the count is `null` — the one direction `statement-view.js:312-330` argues against. `:143` immediately above uses `=== 0` correctly. **File is dirty in the shared checkout** (§5). |
| `margin-recipes.vue:1058-1060` `activeProductLinkCount` | truthiness on a `numberOrNull` field | **worst render-side hit**: `0` and `null` both render the positive claim *"unlinked"* — an unknown becomes an assertion. **Sibling-owned** (§5). |
| `margin-recipes.vue:1057` `draftVersionCount` | truthiness | `null` and `0` both suppress the badge; silent omission, milder. **Sibling-owned.** |
| `margin-recipes.vue:223` `activatable.versionNumber` | raw interpolation | unguarded; a `null` would print as `null`. **Sibling-owned.** |
| `supplier-model.js:85` `positiveOrNull` | `0`→`null` | a wire value of exactly `0` is reported as *"this field is missing"*. Deliberate per the file header, but it is a `> 0` guard swallowing a stated zero. |
| `MarginStatementFiguresPanel.vue:272` `revisionNumber - 1` | `undefined - 1`→`"NaN"` | safe in practice — guarded `=== null`, and the model always sets the field via `longOrNull` |
| `MarginWastePanel.vue:64` `v-if="unvaluedCount"` | truthiness | safe — `.filter().length`, never null; `0` hiding the notice is correct |
| `MarginSpendPanel.vue:395` `minorToText` | `Math.abs(null)`→`'0,00'` | safe — both call sites guard `=== null` (see 4a) |

### 4c. Selection-side — a third class the brief did not name

Two sites are neither render nor write: they choose **which record is authoritative**, and the choice
then feeds both.

| site | shape | verdict |
|---|---|---|
| `cost-preview.js:257` `activatableDraft` | `(d.versionNumber \|\| 0)` | ranks drafts to pick the one **activation mutates**. A `null` version sorts as `0` and can lose to a real `0`. Unreachable today (`versionNumber` is a required int on the wire), but a coerced value here misroutes a write rather than misreporting a figure — worse than either class the brief names. |
| `margin-statements.vue:393` `canCorrect` | `(b.revisionNumber \|\| 0)` | ranks revisions to gate the Correct affordance. Same shape, render consequence. |

Neither is fixed: both are latent, and changing ranking behaviour is a product decision, not a coercion
repair.

### 4d. Ruled safe by construction

- `money-input.js:55` and `spend-amount.js:86` — `Number(digits)` where `digits` is an already-validated
  pure-digit string. Both files carry long comments on why they do **not** use `Number(text) * 100`.
- `statement-client.js:58` `assertBusinessDate` — throws on anything that is not `yyyy-MM-dd`; never coerces.
- No `+value` unary coercion, no `x * 1`, no `.toFixed`, no `.toLocaleString`, and no `= 0` default
  parameter or destructuring default anywhere in scope. Every numeric-ish Vue prop in the module
  defaults to `null`, not `0` — checked across all 12 panels.
- No numeric value ever reaches a query string; every `encodeURIComponent` in scope carries a GUID or a
  business date.

**The two hazards in 4a**, stated precisely rather than as findings: `minorOrNull` turns a non-integer
into `null`, which on `SetInputs` **clears** the opening/closing stock estimate — a field that drives
food cost. Its own comment argues for refusing a float ("the server would round somewhere nobody can
see"), but the code silently clears instead, which is a different invisible outcome. It is **not
reachable today**: the sole production caller, `MarginSpendPanel.save()`, validates both stock fields at
`:358-362` and can only pass an integer or `null`. Left unchanged deliberately — hardening it would be a
behaviour change with no reachable defect behind it, and a green suite cannot prove a future caller.
The same reasoning covers the `amountMinor` passthrough at `:194`.

---

## 5. Files a sibling holds — reported, not untangled

The shared checkout `/Users/svendaneel/okam/Web-modules` carries other lanes' uncommitted work. Three
files with sites in this census are dirty there:

- `pages/admin/margin-recipes.vue` (**+415 lines**) — carries the sibling's own trim-loss finding
  (`yieldFactorOrNull`, `Number(null)` is `0` "which the server REFUSES"), which is the sharper form the
  brief cites. Its truthiness hits at `:1057-1060` are **classified above but not fixed**.
- `utils/margin/recipe-client.js` (+65), `utils/margin/statement-view.js` (+38),
  `components/admin/margin/MarginCoveragePanel.vue` (+30).

Nothing in the shared checkout was reverted, stashed, restored or cleaned. All work here was done on a
**pristine `3cd2570` worktree**; the dictionary lines were re-applied by hand rather than lifted from a
stranger's edit. Line numbers in §4 for those four files are read against the working tree where the
census required it and are marked sibling-owned; every fixed site is at `3cd2570`.

---

## 6. Suites

- `test/margin-waste.test.js` — 28/28 (22 at baseline, **+6** written here: four panel worlds, two wire).
- All 21 margin suites — **439/439**, run on the committed tree.
- No container, no SQL, no migration, no journey suite, no ref moved, nothing pushed.

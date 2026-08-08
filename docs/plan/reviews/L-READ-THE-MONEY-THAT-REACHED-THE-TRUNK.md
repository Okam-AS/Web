# Review — the three money fixes that reached the trunk, read by a second reader

Under review: `feature/restaurant-modules` `78ed84f` → `d4c308e` — cherry-picks `d35d9dd` (receipt),
`29fe003` (check), `af0e168` (offer), plus the evidence commit `d4c308e` (lanes/ only, no code).
Reviewer: agent:L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK · 2026-08-07 · read-only; two detached
worktrees (`Web-modules-wt/L-READ-THE-MONEY` at `d4c308e`, `Web-modules-wt/L-READ-THE-MONEY-BASE`
at `78ed84f`), both removed after the run. `core` pinned to `9626a561` in both, matching the
gitlink both commits record.

## Verdict

**APPROVE.** Every empirical claim in the lander's evidence reproduced exactly under my own hands:
all three pins reproduce the defect on unpatched components with the *precise* red/green split
claimed — none restates the fix; the `isAmountInPlay` delegate is exactly equivalent by byte-level
construction *and* by its three equivalence arms staying green while the components were still
unpatched; the arity sweep on the final tip is clean; the dictionary key is present exactly once in
each of the three dictionaries, in three genuine translations. Two bookkeeping wrinkles named in §6,
neither material.

## 1. The pins reproduce the defect — re-run, not re-argued

Method: worktree at `d4c308e`, the five fixed components reverted to their `78ed84f` bytes
(`PosReceiptView.vue`, `CheckLine.vue`, `CheckPanel.vue`, `SellScreen.vue`, `OfferDocument.vue`),
everything else — pins, `utils/price.js`, dictionaries — left at the tip. Suites run one at a time.

| pin | claimed red at trunk | measured by me | match |
|---|---|---|---|
| `test/receipt-discount-row.test.js` | 8 / 13 / 21 | **8 failed / 13 passed / 21** | exact |
| `test/check-lineamount-sum.test.js` | 13 / 16 / 29 | **13 failed / 16 passed / 29** | exact |
| `test/price-absence.test.js` | 5 / 18 / 23 | **5 failed / 18 passed / 23** | exact |

**The greens are load-bearing, verified by name.** In the receipt run the four shapes the old
`line.discountAmount > 0` guard *admitted* — `Infinity`, `'Infinity'`, `true`, an object with a
numeric `valueOf` — all **passed** on the unpatched component (because `Infinity > 0` is true),
while the five it *dropped* — `null`, `undefined`, `''`, `'   '`, `NaN` — all failed, along with the
two ore-reconciliation arms and the all-shapes arm. A pin that redded on all 21 would be testing the
fix's presence; this one tests the defect. Same property in the offer run: the five reds are
exactly the five new refusal arms; the zero-fee and all-stated-fees arms passed on the old
component. **No pin restates the fix.**

## 2. The `isAmountInPlay` delegate — both halves verified

**Half one, textual.** Trunk `78ed84f`'s `isDeductionInPlay` body is
`if (!isAmountStated(amountMinor)) { return true } return Number(amountMinor) > 0` — and the tip's
`isAmountInPlay` body (`utils/price.js:156-159`) is byte-identical to it, with `isDeductionInPlay`
(`:184-186`) a pure one-line delegate. `isAmountStated` is untouched in the range; `statedSum`
pre-exists at trunk (from `c8f26d5`). The whole `utils/price.js` diff is +20/−3, all of it this
pair. Exactly equivalent — same statements, same helper, function hoisting makes order irrelevant.

**Half two, empirical.** In my reproduction run — new `price.js`, *unpatched* components — the
suite's three equivalence arms (*the deduction name answers identically on every shape*, *the change
against `> 0` is exactly nine shapes, every one of them unstated*, *a stated zero still positively
says there is nothing here*) were all **green** while 13 component arms were red. The 13 reds are
attributable to the components alone. The reproduction argument survives.

## 3. The dictionaries

`pos_negative_sale_unpriceable` appears **exactly once** in each of `translations/no.ts` (line 2133),
`en.ts` (1897), `de.ts` (1898); a full duplicate-key scan of all three files (5224/5189/5189
top-level keys) finds **no duplicate key anywhere**. The three strings are real translations, not
the Norwegian copied across: EN *"Cannot return the whole bill: the amount is missing on {names}.
Build the return by hand under Day."*, DE *"Die gesamte Rechnung kann nicht zurückgegeben werden:
Der Betrag fehlt bei {names}. Erstellen Sie die Rückgabe manuell unter Tag."* — the same `{names}`
placeholder in all three, and the DE/EN screen references match the product's own names for the Day
screen (`pos_mode_day`: 'Day'/'Tag'). The pick's added line is character-identical to the ref's
added line in all three files. Consumer wired in the same pick: `SellScreen.vue:578` (C3 closed in
the same diff).

## 4. The two claims of absence — both re-measured, both hold

**Zero conflicts.** Reproduced the lander's measurement independently: trunk commits touching each
picked source file in `c8f26d5..78ed84f` — `PosReceiptView.vue`, `CheckLine.vue`, `CheckPanel.vue`,
`SellScreen.vue`, `utils/price.js`: **0 each**; the three dictionaries: **18 each** (auto-merged;
the added line identical between pick and ref, above). Offer base `b76cbbb..78ed84f`: exactly one
commit (`11be859`) touches the offer files and its net diff against `b76cbbb` is **empty**. Strongest
form: **every one of the ten picked files is byte-identical between its source ref and the tip** —
there was nothing for `git merge-file` to resolve, and no hand resolution is present.

**The arity sweep, re-run on the final tip** with my own script: all 23 import statements from
`utils/price` across the tree resolve every imported name to an export; 59 call sites of
`isAmountInPlay` / `isDeductionInPlay` / `statedSum` checked; the single flag —
`statedSum()` with zero args at `test/price-bypass-legacy.test.js:169` — is a deliberate,
pre-existing empty-sum arm (*"nothing to add is zero"*) of a variadic function, in a file no pick
touched. **Clean.**

## 5. Tiers, measured by me

| where | claimed | measured |
|---|---|---|
| tip `d4c308e` (code tip `af0e168`) | 168 suites / 4007 / 0 | **168 / 4007 / 0**, exit 0, no FAIL line |
| baseline `78ed84f` | 166 / 3950 / 0 | **166 / 3950 / 0**, exit 0 |

Delta accounting corroborated statically: `test/price-absence.test.js` has 16 arms at `78ed84f` and
23 at the tip (+7); the two new suites carry 21 and 29; 21+29+7+0 = 57 = 4007−3950.

## 6. Two wrinkles, named, neither material

- `lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/frontend-tier.txt` says "final tip `dc96d45`"; the
  landed evidence commit is `d4c308e`. A commit cannot contain its own hash — the tier was run with
  a pre-final version of the evidence commit on top of the same code tip `af0e168`. The code the
  tier measured is the code that landed; my own tier run at `d4c308e` settles it regardless.
- The lander's `mutation-proof.py` restores with `git checkout --` — the same primitive behind the
  defect found today in `L-THE-LAST-UNTESTED-MEALS-AND-EVENTS-SCREENS/mutate.js`. It does **not**
  share the defect: the mutated sources were committed at HEAD in the landing worktree, the
  original is read into memory before mutation, and line 116 asserts the restored bytes equal that
  copy — a mismatch would have crashed the run. My tier at the tip independently proves the sources
  are unmutated now.

## 7. Constraints

C1/C2: frontend-only, no migrations, no SQL — not in play. C3: the new dictionary key and its
caller land in the same pick; no orphan capability. C4: the check fix *removes* a money write (a
return built from an invented amount) and adds none; the refusal path only notifies. C5: this is a
review verdict on suite and code evidence, not an acceptance; nothing is moved to accepted here.
C6: the § 5-3-7 reference is in a code comment, not UI; the new UI strings name no statute. C7: no
log or telemetry call added; the refusal notification carries product names only.

## Worktrees and hygiene

`Web-modules-wt/L-READ-THE-MONEY` (detached `d4c308e`) and `Web-modules-wt/L-READ-THE-MONEY-BASE`
(detached `78ed84f`), node_modules symlinked from the main checkout per estate pattern, `core`
pinned to `9626a561` via the file-protocol fetch in both. Component reverts restored from
`d4c308e`; my temporary `review-arity-sweep.js` lived only in the worktree. Both worktrees removed
with `rm -rf` + `git worktree prune` (no core commits of mine existed — the coordinator's submodule
warning noted). No commit, merge, rebase, push or branch move; `web-livewalk` and all containers
untouched; nothing bound.

# Fable review — L-PRICE-NULL-ZERO (2026-08-01)

Read-only review of commit `a48fb78` on `feature/restaurant-modules`. No file was edited. The three money
suites were re-run directly: 33/33 green.

## Verdict — sound-with-conditions

The landed change is correct, well-placed and honestly documented: the gate sits at the one seam this repo
controls, both exclusions are verified right, the new tests are falsifiable in both directions, and the POS
prop-default change affects no existing caller. **The conditions are about the lane's record, not its code.**

The claim that the mixin's `priceLabel` is *the one money label every screen renders through* is **false**.
`pages/admin/kravia-invoice.vue:582-584` defines a local `priceLabel` that **shadows** the gated mixin method
— Vue 2 component methods beat mixin methods — and coerces with `|| 0`. Four more legacy pages format money
through their own absence-coerces-to-zero helpers the sweep never named. None are regressions of this lane,
but they are **exactly the defect this lane exists to kill, still alive on five admin pages.**

## Defects and risks

1. **The mixin gate is silently shadowed on the invoice page** (`kravia-invoice.vue:582-584`). An absent
   invoice amount prints as kr 0,00. Beyond that page this is a **structural hazard for the chosen seam**:
   any future component defining its own `priceLabel` silently opts out of the gate, with no lint and no test
   to catch it.
2. **Absence→zero live in four more bypass formatters** — same defect class, different helpers, all
   pre-existing.
3. **The cross-currency composition exists in SIX places, not five** — the five components plus
   `utils/margin/money.js:34-39`, whose cross-currency arm composes whole and fraction with no internal
   absence check. Every current caller guards first, but the hole is one unguarded future caller away from
   reopening, **in a mixin shared by every Margin panel.**
4. `utils/workforce-rates/rate-timeline.js:79` admits `NaN` (typeof NaN is 'number') while the consumer only
   guards `=== null`. Theoretical today — JSON cannot carry NaN — but weaker than the `isFinite` reader used
   elsewhere in the same module.
5. `components/shared/OfferDocument.vue:150` imports `priceLabel` from core and never registers it, so the
   template resolves to the **gated** mixin method. Harmless but actively misleading: it reads as an ungated
   bypass and is not one.
6. `components/molecules/CustomerInfoModal.vue:332-340` — a second local shadow. It *does* guard absence, but
   returns an ASCII hyphen rather than the estate's em dash: a second, unexplained absence mark.

## Places absence can still print as a real amount

`kravia-invoice.vue:583` (null → kr 0,00 on an invoice) · `settlements.vue:380-382` (absence and genuine zero
produce the identical string) · `wolt-menu.vue:1166-1168` (absence deliberately mapped to '0 kr') ·
`reward-members.vue:122-124` (an absent balance printed as a zero balance) · `products.vue:164,170` and
`OnboardingProductImages.vue:94` (raw division; null → "0.00 NOK", undefined → "NaN") ·
`XReportView.vue:77` (**arithmetic before the gate**: `null + null === 0` → "kr 0") · plus the six
cross-currency arms, currently unreachable because every caller guards, each verified individually.

**The lane's claim that no fixture-reachable admin surface can honestly produce an absent amount is consistent
with this sweep** — every module surface resolves absence into a state before the formatter.

## Assertions that could pass against broken code

**None found that cannot fail — this part of the lane is genuinely well-built.**

The absence-assertion trap is avoided: the tests assert stated amounts **through the same call path** as
absent ones, with exact strings, and the mounted component uses the *real* installed mixin. One test is
self-referential — the mark is imported from the module under test, so a drifting constant would drift on
both sides — but it is rescued twice: an assertion that the absent and zero renders differ kills the
drift-to-zero case, and a second file pins the mark to the literal character code. The `not.toBe` assertions
would be weak alone and are everywhere paired with exact-string pins.

The mutation ledger is internally consistent with the test structure — which failures each mutation produces
matches exactly which assertions read which path — and its baseline count matches the files. Mutations could
not be re-executed, since that requires editing files.

One honest gap, not a trap: the Swiss branch is unit-asserted but never DOM-asserted, because the market mixin
is not installed in the test mount. Not rated blocking.

Also checked for leftover assert-the-defect tests at other layers: none, and one sibling suite already pins
the opposite.

## POS default change (0 → null)

**One component, two sites**, both binding the prop explicitly; one is data-initialised to zero and set before
its step is entered, the other is the check total driving the screen. **No caller relies on the old default.**
The omitted-prop path exists today only in the new test — the change is pure defence for future callers, and
the right one. Vue 2 accepts null for a non-required typed prop, so no runtime warning is introduced.

## What could not be determined

- Full-suite and browser-journey claims — not re-run. The three money suites were: 33/33.
- Mutation runs — not re-executed; judged by consistency, which holds.
- Wire reachability of the five bypass holes — not traced; legacy surfaces either way.
- The "54 money-rendering files" figure — the count here is 52. Trivial, not load-bearing.

# L-PRICE-NULL-ZERO — detail

## The brief was right, and here is the coercion

`utils/price.js`, as shipped:

```js
export function formatChf (amountMinor) {
  const minor = Number(amountMinor) || 0
```

`Number(null)` is `0` — the same coercion L-WF-OPLINK found in `normalizeOperatorId`, which made every
unlinked engagement read as bound to operator #0. Here it made every absent amount read as a price.

It was not an oversight anybody had missed: `test/chf-format.test.js` pinned it as correct —

```js
test('handles null and undefined gracefully', () => {
  expect(formatChf(null)).toBe('CHF 0.00')
```

The Norwegian branch does the same thing from the other side. `core/helpers/tools.ts`:

```js
const wholeAmountTool = (amount) => { if (!amount) { return "0" } ... }
const fractionAmountTool = (amount) => { if (!amount) { return "00" } ... }
```

so `priceLabel(null)` is `"kr 0,00"` — character for character what `priceLabel(0)` is.

Measured, not assumed: `before-after.txt` is both branches answering the same six questions before and
after, produced by running the shipped code twice with the gates put back in between.

## Where the fix went, and why not into core

`core/` is a git submodule pinned by four other checkouts on three branches. L-CORE-ORE-LABEL returned
**blocked** on `+D-CORE-PIN` for exactly this reason. So the gate is in this repo, in front of both
formatters:

- `utils/price.js` — `UNKNOWN_AMOUNT` and `isAmountStated`, and `formatChf` gated on it.
- `plugins/global-mixin.js` — `priceLabel` gated before it dispatches to either branch. This is the one
  money label every screen in this app renders through, so all 54 files that call it inherit the rule.
- `components/admin/pos/CardTerminalStatus.vue` — `amount` prop default `0` → `null`. The default was
  the same lie one layer up: a check whose total had not arrived was announced to the operator as kr 0
  in the place the charged amount goes, while a customer's card was in the reader.

`wholeAmount` / `fractionAmount` on the mixin are deliberately NOT gated. They are digit helpers, and
`pages/admin/delivery.vue:684` seeds the two halves of a money INPUT from them — answering "—" there
would type a dash into a field the operator then saves.

## Why this rule and not `readMinor`'s

`utils/events/journey.js` `readMinor` already encodes the estate's rule for WIRE money: integer minor
units or null. It is stricter than what can go in front of the shared formatter —
`components/shared/OfferDocument.vue` renders `priceLabel(totalOnetimeFee * 0.25)`, and a fee with øre
makes that a genuine float (kr 12,34 → 308.5). Gating on integers would have blanked out the VAT line
of every offer. Both comments cross-reference the other so the seam is visible; mutation M5 in
`mutation-proof.txt` is that decision made falsifiable.

## Evidence

- `before-after.txt` — the shipped formatter, before and after, six values × two markets.
- `mutation-proof.txt` — six mutations, each red in exactly the tests that should notice. Includes M4
  (a genuine zero withheld) and M5/M6 (the gate over-reaching), so the pins fail in BOTH directions and
  not only on absence.
- `test/price-absence.test.js` — 15 tests. Pins the rule on the SHIPPED mixin method in both markets,
  and reads it back off a real component's DOM (`CardTerminalStatus` mounted with the real global mixin
  installed) rather than off a helper's return value.
- Jest 94 suites / 2197 tests green. Admin browser journeys 3/3 green, client bundle compiled — which
  is what proves the added named export in a Nuxt plugin did not break the build.

## What this lane did NOT do

- **No browser screenshot of the new dash on an admin screen.** No fixture-reachable admin surface can
  honestly produce an absent amount today: `/admin/workforce-schedule`, `/admin/events` and the Margin
  panels all resolve absence into a state (`COST_REFUSED`, `CAPTURE_NONE`, `readMinor`) before they
  reach the formatter. Producing one would have meant writing a world the backend cannot produce —
  a manufactured presence, which is worse than no picture.
- **The cross-currency composition** (`wholeAmount + ',' + fractionAmount + ' ' + code`) in five module
  mixins still renders an absent amount as `0,00 SEK`. It fires only when the wire currency differs
  from the market's, and every one of those five call sites refuses absence before composing — so it is
  currently unreachable, not fixed. Closing it means editing five module components, three of which
  belong to lanes in flight.
- **Sum accumulators** (`(p.amount || 0)` inside a `reduce`) were swept and left alone. A missing addend
  contributing zero to a total is a different claim from an absent total, and it is arithmetic rather
  than display.
- **Core's float rendering** (`priceLabel(308.5)` → `kr 308`, the half-øre silently dropped) is
  L-CORE-ORE-LABEL's pinned open defect. This lane only refuses to hide it behind a dash.

# L-PRICE-CLEANUP-TWO — two misleading money reads

Base measured by this lane: `e34977ac` (`feature/restaurant-modules`, matched the brief).
Commit: `e41cdff2` at `refs/heads/lane/price-cleanup-two`. Shared branch tip left at `e34977ac`.

Built with `GIT_INDEX_FILE` pointed at a scratch index (`read-tree HEAD` → `add -- <4 paths>` →
`write-tree` → `commit-tree` → `update-ref`). The shared index was never staged and the worktree
was never reverted, stashed or cleaned. Reachability verified after `update-ref`:
`git rev-list --all | grep -c e41cdff2` = 1, and `merge-base --is-ancestor` confirms it is NOT on
the shared branch.

## What a user could see: nothing, at either site

Both sites are exactly what the brief said — traps for the next reader. Stated separately below,
because "checked and safe" and "not checked" have to be distinguishable.

## Site 1 — `components/shared/OfferDocument.vue`

The file imported `priceLabel` from `~/core/helpers/tools` (core's RAW, ungated formatter) and never
registered it in `methods` or `computed`. This is Nuxt 2 / Vue 2.6 (`package.json`: `nuxt ^2.14.11`,
`vue ^2.6.14`), where a template compiles to a render function wrapped in `with(this)`. Identifiers
in `{{ … }}` resolve against the component INSTANCE, so a module-scope import is invisible to the
template. The import bound nothing.

Consequence: every `priceLabel` in that template — eight call sites, including the three totals rows
— has always resolved to the GATED method on the global mixin (`plugins/global-mixin.js:164`), which
refuses an unstated amount via `isAmountStated` and returns `—`. The document read as a deliberate
bypass of the absence gate and was not one.

Independent corroboration that the import was dead, found after the diagnosis rather than as its
basis: eslint against `HEAD:components/shared/OfferDocument.vue` already reported
`'priceLabel' is defined but never used` twice (once per rule: `no-unused-vars` and
`@typescript-eslint/no-unused-vars`). Removing the import removes those two errors and introduces
none. The two remaining `arrow-parens` errors in that file are pre-existing at HEAD and untouched.

Removing the import alone would have left the next reader to re-derive the same wrong conclusion, so
the import is replaced by a comment naming what actually resolves and why.

Reachability of the COMPONENT (distinct from reachability of the defect): it is wired and live —
`pages/offer/_code.vue` (public route `/offer/:code`) and `pages/admin/offers.vue` both register and
render it. So the component is reachable; the ungated bypass never was.

## Site 2 — `utils/workforce-rates/rate-timeline.js:79`

`typeof row.hourlyRateMinor === 'number' ? … : null` admits `NaN`, `Infinity` and `-Infinity`,
because `typeof NaN` is `'number'`. Now `Number.isFinite(row.hourlyRateMinor) ? … : null`, matching
`wholeOrNull` in `utils/workforce-rates/attendance-view.js:113` beside it.

Why unreachable today: the only producer is `GET .../rates`, and `JSON.parse` cannot yield a `NaN`
from standard JSON — the server sends an integer or `null`.

What it would have cost had one arrived: the sole consumer is `amountLabel` in
`components/admin/workforce-rates/WorkforceRateTimeline.vue:267`, which guards `=== null` only. A
`NaN` past that guard takes the CROSS-CURRENCY branch, composed from `wholeAmount`/`fractionAmount`
— deliberately ungated (see the comment at `plugins/global-mixin.js:171`) because
`pages/admin/delivery.vue` seeds a money INPUT from them. Both answer `"0"`/`"00"` to anything falsy,
so the cell would have printed `0,00 SEK`: an hour of work priced at nothing. The same-currency
branch would have printed `—`, because the mixin's gate does catch `NaN` — so the harm was confined
to the cross-currency path.

On the idiom: `isFinite` is right here because the value's DOMAIN is numeric, not because falsiness
is a general hazard. `Number.isFinite` (not the global `isFinite`) is used deliberately: the global
one coerces, so `isFinite('23550')` is `true` and a string would reach a formatter. The pin asserts
the string case for exactly that reason.

## Pins, and their falsification

Three worlds at both sites — present, genuinely zero, and absent-or-non-finite. A pin covering only
"bad" and "good" misses the case that must survive; `!0` is `true`, so a truthiness guard would eat
the genuine zero.

`test/workforce-rates-timeline.test.js` — "a non-finite amount is absence, and a genuine zero is not":
23550 → 23550; 0 → 0 (asserted `not.toBeNull()`); `[null, undefined, NaN, Infinity, -Infinity]` → null;
`'23550'` → null. Zero cannot arrive from this server today (`workforce.rate-not-positive` refuses a
non-positive rate) — asserted anyway, because the guard must be the kind that would carry a zero, not
the kind that is right by accident.

`test/price-absence.test.js` — "the offer document, in a real DOM": mounts the component with the
REAL global mixin (importing the plugin runs `Vue.mixin`), one table, three line items →
`['kr 499,00', 'kr 0,00', '—']`, plus `new Set(cells).size === 3` so the three worlds cannot collapse
into two. A second test refuses a reintroduced import, anchored to an `import` STATEMENT rather than
the bare path, so rewording the prose comment cannot break it; the file is read via `__dirname`, not
the checkout basename, so it holds in a lane worktree.

Falsification (a pin that passes against the old code is worth nothing):

| pin | mutation | result |
|---|---|---|
| timeline three worlds | restored `typeof … === 'number'` | RED, 1 failed / 17 passed |
| offer three worlds | added `methods: { priceLabel }` with core's raw import — the natural wrong fix a reader makes after seeing that import | RED: expected `—`, received `kr 0,00` |
| offer structural | re-added the bare import | RED |

Every mutation was reverted from a byte copy and the suites re-run green afterwards.

## Suites

`TZ=Europe/Oslo npx jest test/workforce-rates test/price-absence test/core-price-label` →
9 suites, 207/207 passed. No container started. The full frontend suite was not run; the two
pre-existing reds the orchestrator named were therefore neither hit nor chased.

## Found, grounded, and NOT fixed — out of this brief's scope

`OfferDocument.vue`'s totals manufacture a zero for an absent fee:

    return sum + (item.monthlyFee * item.quantity || 0);

`undefined * 1` is `NaN` and `NaN || 0` is `0`, so an unstated fee is silently summed as nothing.
Measured on a real mount (throwaway probe, removed afterwards — no residue):

    lines = ["kr 499,00", "—"]   subtotal = "kr 499,00"

The line admits it does not know the fee; the subtotal beneath it presents a partial sum as a total,
and a customer reading the offer cannot tell which term is missing. This is precisely the class
`statedSum` in `utils/price.js` exists to refuse and that `test/price-bypass-legacy.test.js` is the
pin home for. It is user-visible and it is a real defect — but my exit criteria are the dead import
and the rate reader, so it is reported rather than improvised into this diff. It needs its own lane.

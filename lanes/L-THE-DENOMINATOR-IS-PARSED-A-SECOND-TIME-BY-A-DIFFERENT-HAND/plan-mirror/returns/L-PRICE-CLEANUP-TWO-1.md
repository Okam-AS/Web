```
RETURN: L-PRICE-CLEANUP-TWO
brief: b71c21dc
verdict: built
evidence: lanes/L-PRICE-CLEANUP-TWO/notes.md
log:
Base e34977ac (self-measured). Commit e41cdff2 = refs/heads/lane/price-cleanup-two; branch tip unmoved.
Built via a scratch GIT_INDEX_FILE: shared index never staged, nothing reverted. Reachability verified.
NEITHER CHANGE IS USER-VISIBLE. Both sites were traps for the next reader, not live defects.
OfferDocument: Vue 2 compiles templates with `with(this)`, so the module-scope import bound nothing;
priceLabel there has ALWAYS been the gated mixin method. Removing it changes no render.
Corroborated independently: eslint at HEAD already errored "priceLabel is defined but never used" x2.
Comment added naming what resolves, so the next reader does not re-derive the same wrong conclusion.
rate-timeline: `typeof NaN` is 'number'; now Number.isFinite, matching wholeOrNull in attendance-view.
Unreachable today: JSON.parse cannot yield NaN and the server sends an integer or null.
Had one arrived: amountLabel guards `=== null`, so it reaches the cross-currency branch whose ungated
wholeAmount/fractionAmount answer "0"/"00" - 0,00 SEK for an hour of work nobody priced.
Both pins FALSIFIED: restored typeof -> red; registering core's raw helper -> "kr 0,00" vs the em dash.
Three worlds each (present / genuine zero / absent-or-non-finite); the numeric-string case pinned too.
207/207 across 9 related suites. No container, no push, no migration, no shared ref moved.
OUT OF SCOPE, found+grounded: OfferDocument totals use `(fee*qty || 0)` - line prints "-", subtotal lies.
END RETURN
```

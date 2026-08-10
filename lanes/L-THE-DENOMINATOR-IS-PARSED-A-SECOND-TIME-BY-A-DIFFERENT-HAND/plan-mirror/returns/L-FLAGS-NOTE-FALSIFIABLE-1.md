```
RETURN: L-FLAGS-NOTE-FALSIFIABLE
brief: cc37f5b9
verdict: built
evidence: 7c9f172 · artifacts/journeys/workforce-flag-lever.playwright.json
log:
Both brief claims verified true before building; neither was already falsifiable.
feature-flags-page.test.js:304 asserted toBeTruthy() on 3 strings, never mounted the page.
workforce-flag-lever.spec.js:62 read rows.count() into returned prose, never asserted it.
Note test replaced: 3 locale CONTENT tests (obligation-by-obligation, "relied on" bound to
  OFF and "not a promise" bound to ON as adjacent text) + 4 DOM tests (renders / above the
  first row / stated once and never on a row / survives a failed store read). Wording NOT
  touched - left for L-FLAGS-EFFECTIVE-RESOLVERS, which may make the claim true.
Journey: full 18-key set asserted in render order, TRANSCRIBED not derived from world.js
  (an expectation computed from the served fixture shrinks with it and proves nothing).
10 mutations, each red alone: no/en/de each swapped on<->off -> only that locale's test;
  NO invisible-switch clause dropped -> named the broken obligation; note deleted -> all
  4 DOM tests; moved below rows -> position only; on every row -> "once" only; hidden on
  failed read -> survival only; catalog cut to 1 flag/module -> count (6 vs 18) with all
  six module titles STILL green; one key renamed at count 18 -> key set only.
Green: jest 100/2316, journey on ports 3131/4131, core/ intact. Only my 2 files committed.
END RETURN
```

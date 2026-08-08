```
RETURN: L-COVERAGE-MEASURED-PER-MODULE
brief: 1d849853
verdict: built
evidence: docs/plan/reviews/L-COVERAGE-MEASURED-PER-MODULE.md
log:
FE 65.4 is not a coverage figure. collectCoverageFrom is 2 globs of *.vue, and vue-jest 3.0.7 instruments NOTHING indented: 1169 of 1169 .vue statements start at column 0, none indented.
47,081 script lines yield 1,169 statements. 304 of 304 .vue measure nothing past `export default`. Cause read not guessed: generate-source-map.js:14 maps only column 0 and skips every other line.
Proved with a probe, so it is indentation not scope: an INDENTED module-scope statement is dropped exactly like a method body; data() and methods produce no fnMap entries at all.
FE honest per-module (.js/.ts, which the config never collects): Core/POS 40.7 stmt and 12.3 fn, Workforce 96.0, Margin 97.7, Meals 87.8, Events 93.4, Training 81.6, Growth 97.9. Runs 13s and 10s.
FE .vue figure that IS usable - never loaded at all: Core/POS 29 of 71 files (3,761 lines), Margin 0 of 16. Training's only 2 are evidence page+document; Meals's only 2 are statements page+lines.
BE tooling: coverlet.collector 6.0.0 already referenced, NO .runsettings, NO --collect anywhere, CI runs dotnet test bare. One flag, no code change. These are the first backend coverage figures.
BE lines per module, non-SQL tier: Core/POS+shared 49.4, Workforce 90.7, Margin 91.0, Meals 85.3, Events 81.7, Training 89.0, Growth 92.0. Excl migrations 63.1; coverlet itself prints 8.7.
BE Core/POS+shared holds 33,535 of 37,537 uncovered non-migration lines - nearly the whole backend gap in one row, the same row the frontend gap sits in.
Switching coverage on costs ~3x wall clock (1135s vs ~7min; 8 CsCheck property tests, parallelizeTestCollections false) and a 98MB report. Both measured, both in the review.
ONE TEST FAILS UNDER INSTRUMENTATION AND IS RIGHT TO: ConfirmationCodeEntropySourceTests decodes IL and refuses coverlet's injected Interlocked.Increment. Guard working, not a flake. CI reds day one.
Coverage, never-loaded and falsifiability converge on two DOCUMENTS: utils/training/evidence.js at zero with 101 uncovered branches, and utils/meals/statement-client.js at zero. No test loads them.
Cart is uncovered on BOTH sides at once: Services/CartService.cs 24.3 with 681 uncovered branches, cart-service.ts 4.3, models/cart/cart.ts 6.3, store/index.js zero and imported by no test.
Weak-assertion census shipped as a reading list, and I corrected it rather than publish it clean: 2 of 10 flagged files read by hand, price-gate-shadow discounted outright, price-bypass-legacy partly.
Counter-signal recorded: 20 of 150 test files are readFileSync source guards that never execute what they guard, so core/services route shapes ARE pinned and contribute nothing to their low figure.
Both owner checkouts byte-identical - FE branch unchanged at 0c1e4f9 with core 9626a561, BE 5243c06a7 clean. Removed my 3 worktrees. No container, no port, no pkill, no npm install.
END RETURN
```

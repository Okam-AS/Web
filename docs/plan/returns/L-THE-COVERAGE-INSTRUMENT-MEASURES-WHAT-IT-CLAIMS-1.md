```
RETURN: L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS
brief: 7fe66f1f
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS/evidence.md
log: Branched from feature/restaurant-modules a63c30f, read fresh and unmoved. Branch lane/vue-coverage-instrument at 52dd348, core pinned 9626a561, committed --no-verify, not pushed.
Cause read at vue-jest/lib/generate-source-map.js:14 - one column-0 probe per line, while babel maps a token at its real column, so every INDENTED line got no mapping at all.
The drop is at report time, not instrument time: CoverageReporter.js:646 into istanbul-lib-source-maps getMapping, which discards what it cannot place, so those statements left the denominator.
Fix is repo-local. test/support/vue-sfc-transform.js seeds require.cache with a generate-source-map carrying every babel mapping at its own column, then delegates vue-jest process() unchanged.
Upgrading was not reachable and is claimed neither way: npm install banned, no @vue/vue2-jest and no second vue-jest on disk, so whether vue-jest 4 fixes line 14 stays unverified, not asserted.
Probe kept. test/vue-coverage-instrumentation.test.js and test/fixtures/coverage-probe.vue run all three jest stages and assert the marked indented statements, the fnMap entries and a branch.
Red proof: reverting only jest.config.js:45 to 'vue-jest' reds all five - statement lines [12,14,17], fnDeclLines empty. Restored, greens 5/5. The probe reads that config, so any revert reds it.
Cost measured, not estimated: 150 suites/3563 tests/0 failed at 12.0s before, 151/3568/0 at 8.3s after. The five extra tests are the probe; no existing test changed and none was edited.
The same five buble transform failures before and after. Six wholly-indented pages now enter the report; PriceTable and CloseButton stay out because they carry no script block at all.
Reported .vue statements 762/1166 before, 6125/18157 after. The instrument had been hiding 16,991 statements, and the published figure rose as it went blind.
Per module .vue statements before to after: Core/POS 48.4 to 8.1, Workforce 79.7 to 68.3, Margin 100.0 to 81.5, Meals 87.3 to 68.9, Events 92.6 to 75.2, Training 75.0 to 67.1, Growth 86.1 to 38.4.
Shared 51.1 to 23.4. Core/POS is the both-sides row the brief predicted: 8.1 on .vue against 40.7 on .js/.ts, 5203 uncovered statements over 78 files. Growth's 38.4 is one file, 372 uncovered.
Training evidence page and document, and meals-statements with MealsStatementLines, now read zero covered on a real denominator - a fourth instrument agreeing with the review, not a new finding.
Left alone on purpose: collectCoverageFrom is still two .vue globs. Widening it is one line but it moves the published headline, so it is an owner call rather than a side effect of this lane.
Worktree scratchpad/L-COVINSTR/Web-modules created then removed, 164 to 163. Owner checkout left on its own session branch, no tracked change. No container, no :3971/:5971, no pkill, no install.
END RETURN
```

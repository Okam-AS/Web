```
RETURN: L-LINT-RUNS-ON-SOMETHING
brief: 29a71d18
verdict: built
evidence: lanes/L-LINT-RUNS-ON-SOMETHING/evidence.md
log:
Base 9f7d8df; commit f9a777f parent 9f7d8df on lane/lint-runs-on-something, worktree web-lintruns. Not pushed. All 4 halves re-confirmed at 9f7d8df; eslint healthy v7.32.0, 251 rules, 207 error.
Built `lint:translations`, invoked from INSIDE the jest suite. Chain: npm test -> jest -> test/translations-lint.test.js -> npm run lint:translations -> eslint. No rule enabled, no severity raised.
EXIT CRITERION: quoting an existing dictionary key in place type-checks, behaves identically, passes 120 of 127 suites and 2817 of 2818 tests - and reds only here, on quote-props, already error.
DRIFT 1, not fail-spec (brief's literal claim held): a duplicate key is NOT invisible - ts-jest already reds TS1117 on NINE unrelated suites, naming no rule. Gate makes that one no-dupe-keys line.
Mutations, all 4 assertions kill: delete script 3 red / duplicate key 1 red / no-dupe-keys off 2 red / .eslintignore hiding translations 3 red / revert 4 green. The last is the non-vacuity floor.
Regression: full npm test on the committed tree 2818/2818, 121 suites. DRIFT 2: uninitialised core reds SIX suites not three (4 lack core in the name). Pre-existing. Scope: tree = 649 errors.
No CI step: nothing runs a suite in CI, and one I cannot show firing is the shape this lane ends. Hooks are husky v4 in the SHARED common dir, from another repo - untouchable. Nothing pushed.
END RETURN
```

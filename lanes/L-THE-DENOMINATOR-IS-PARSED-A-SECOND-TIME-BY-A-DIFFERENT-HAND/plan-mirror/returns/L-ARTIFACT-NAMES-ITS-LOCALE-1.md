```
RETURN: L-ARTIFACT-NAMES-ITS-LOCALE
brief: eefef801
verdict: built
evidence: lanes/L-ARTIFACT-NAMES-ITS-LOCALE/run.md
spec_gap: brief says 65 committed receipts; I measure 18 on feature/restaurant-modules, 29 on the compose candidate, 41 distinct paths across all local branches - none carries an edition field.
log:
Committed adde936 on lane/artifact-names-its-locale, parent 7030c00, worktree /Users/svendaneel/okam/web-artloc.
New test/e2e/support/edition.js; journey.js records+guards; artifact-store.js keys on it; 3 tests in journey-artifact-store.test.js.
EXIT CRITERION: modal-scroll-lock walked at no and ch in ONE tree, both PASS, spec UNCHANGED (it asserts no copy at all).
runs/modal-scroll-lock.fixture.playwright.json = declared no/market no/locale no; runs/...fixture-ch... = declared ch/market ch/locale de/html de-CH.
Distinguishable by NAME (key, screenshot folder, ledger columns) and by CONTENT; the ch run declines canonical and names the holder.
Both halves: the NAME carries the declared edition (beginRun files a provisional under it before the browser opens), the CONTENT what the app resolved.
market/locale/i18nLocale come from page.evaluate on the running app; declared is env and labelled an input. judgeEdition compares market vs declared only.
No edition->language table in the harness: that fact lives once in config/edition.js, and a duplicate of it is how both harness copiers rotted.
B1 FALSIFICATION: dev-server pinned to the no bundle while OKAM_EDITION=ch -> 8/8 steps PASSED, rc=1 on the contradiction, artifact says market no.
B2: same world, judgeEdition neutered -> green again, artifact STILL says declared ch / market no. Red was the guard; the record is independent of it.
Mutations asserted landed by grep, reverted with git checkout --, porcelain 0 after each, HEAD still adde936.
Re-measured MYSELF at adde936 clean: guard-proof 10/10 EXIT=0, build-provenance 5/5 EXIT=0, printing web-artloc@adde936 with no +dirty.
Its copied-support table lists SIX files incl edition.js - the 7030c00 loader absorbed a new require, neither prover touched; jest 39/2 vs 36/2 baseline, eslint no new errors.
NOTHING RENAMED: absent edition reads as default, default gets no segment, legacy keys byte-identical. A later lane must backfill as declared:null, not "no".
END RETURN
```

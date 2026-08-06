```
RETURN: L-MARGIN-VIOLATION-ANCHOR
brief: 1928bd54
verdict: built
evidence: lanes/L-MARGIN-VIOLATION-ANCHOR/mutation-log.md
log:
BASE 569887a5 (siblings' base); defect LIVE there AND at integration/mig-stack-land 4b37f81b, sites drifted
  to :68/:700. Those two branches DIVERGED (merge-base 3579bbbc, +54/+34). Commit a2bfd116, refs unmoved.
FIX MarginRecipeSupport.IsUniqueViolation: unanchored Contains("UNIQUE") -> SQLite extended 2067/1555 +
  anchored "UNIQUE constraint failed", else false. MarginPriceImportService FOLDS onto it, "duplicate" gone.
SQL SERVER ARM verified INDEPENDENTLY for Margin, untouched: 2601/2627 only, rejects 547/515/RAISERROR.
LATENT NOT LIVE: swept all 659 named constraints, none holds "unique"/"dup" - that IS the condition; the
  string arm is reached on SQLite only, the provider the entire fast suite runs on.
PIN MarginConstraintViolationExactnessTests: 4 facts, both directions PER SITE, outcome by value
  (margin.recipe-name-conflict / db-fault:275 / replayed BatchId), never a status code.
HONESTY: recipe clash needs NO test SQL - CreateAsync compares the raw name and stores the trimmed one, so
  "Pizza " walks past its own pre-check into the real index. Check refusals add a real named CHECK by DDL:
  only the NAME is the test's; 19, 275 and the wording are SQLite's, asserted. C1 INSERT-only, C4 by value.
SIX STATES 4P -> M1 2F/2P -> 4P -> M2 (site2 only) 1F/3P -> PRISTINE BASELINE 2F/2P -> 4P, full build each,
  never --no-build, NO MUTANT SURVIVED. TIER 4633P/0F/12S 6m23s, no container. WF cdb4c66c + Meals 13cd9f18
  unmerged here - all THREE must land.
END RETURN
```

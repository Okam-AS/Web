```
RETURN: L-MRG-REVISE-LAND
brief: c6e6758d
verdict: built
evidence: lanes/L-MRG-REVISE-LAND/evidence.md
log:
lane/mrg-recipe-revise-ui = 2 commits on 5ad0ca0. 0c483de: the brief's 7 paths (page, client,
both tests, lane dir), 1694 insertions. c429d51: translations/{no,en,de}.ts, 16 lines each,
nothing else. At the tip: 51/51 named suites, 463/463 test/margin, 491/491 with admin-nav.
I EXTENDED THE BRIEF, reversibly. To restore its exact boundary:
  git update-ref refs/heads/lane/mrg-recipe-revise-ui 0c483de
Measured, not assumed: the 36KB test reads the tables at lines 824-835, so at 0c483de the suite
is 49/51 with exactly those two red - the exit's second half is unreachable without them.
Choke respected, not relaxed: built against 5ad0ca0's COMMITTED file via a temporary index,
never the dirty tree; pure additions, zero committed lines deleted, exactly the 14 mrg_revise_*
keys the lane's evidence claims, no sibling key swept.
LEFT BEHIND for their owners: 60 lines per locale (mrgs_waste_coverage_unknown + nav_meals/
mlst_*) and statement-view.js, MarginCoveragePanel.vue, AdminPageHeader.vue,
admin-nav-access.test.js - dirty, but not claimed by the lane's evidence.
Shared checkout unmoved, 7 blobs byte-identical, every sibling diff intact. Re-measurement,
463-vs-473, staged census files, constraints, full proof: lanes/L-MRG-REVISE-LAND/evidence.md
END RETURN
```

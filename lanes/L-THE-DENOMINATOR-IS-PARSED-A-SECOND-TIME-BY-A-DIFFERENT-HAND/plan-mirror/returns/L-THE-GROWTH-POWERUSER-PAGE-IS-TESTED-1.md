RETURN: L-THE-GROWTH-POWERUSER-PAGE-IS-TESTED
brief: 7444375e
verdict: built
evidence: docs/plan/lanes/L-THE-GROWTH-POWERUSER-PAGE-IS-TESTED
log:
Branch lane/growth-poweruser-tested at fddb06c, off trunk 7a378e4 (trunk moved past the briefed 6b98839, which is its ancestor). Not merged, not pushed.
test/growth-poweruser-page.test.js: 41 arms on pages/admin/poweruser-growth.vue. The commit changes no production file.
Coverage of that file, collectCoverageFrom scoped to it, jest config untouched: statements 0/372 -> 312/372; branches 0/195 -> 131/195; functions 0/93 -> 87/93; lines 0/316 -> 282/316.
Mutation receipt: 38 green arms, EVERY one watched go red under a mutation written into the page and reverted. 44 mutations, 0 survivors, page verified byte-identical after.
Driver + receipt at lanes/L-THE-GROWTH-POWERUSER-PAGE-IS-TESTED/ (jest already ignores lanes/). It aborts on a search string it cannot find, so a no-op mutation cannot read as a passing test.
One mutation killed nothing: getPointValue's `??` -> `||`. Recorded as an EQUIVALENT MUTANT, not a hole — the chain ends in 0, so both spellings agree for any single-casing payload.
The mutation run exposed 3 weak assertions, all rewritten: the 24px drag rule was untestable at 6 months (added a 61-month world); "1 500" contains "500"; a self-comparing metric round-trip.
DEFECT, left failing, 3 arms: F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED on this page's read path. Driven through the REAL StatisticsService over an axios-shaped transport.
401 "Sesjonen din er utlopt", 403 "Du har ikke tilgang...", 500 "Noe gikk galt i rapportmotoren" ALL reach the poweruser as "Request failed with status code NNN". The backend reason is discarded.
statusCode is undefined on all four (incl. offline), so the page cannot tell them apart. GetPlatformGrowth uses the unsafe GetRequest, calling neither SafeGetRequest nor BuildError.
Second finding: the service's own 'Failed to get platform growth' needs a RESOLVED non-2xx, which axios never gives — a dead line. Same pattern in the other 4 reads in that file.
Full tier at lane tip: 167 suites, 3980 tests, 3977 pass, 3 fail — the 3 are the defect arms. 3977 = the 3939 baseline + my 38 green, so no pre-existing test regressed.
TENSION: exit criteria want a green tier; the brief says twice to leave a found defect failing. I followed the brief. Dropping one describe block greens the tier if preferred.
Traps: core pinned to 9626a561 via the local-fetch remedy (the plain clone genuinely lacked the SHA). node_modules symlinked to the main checkout, as sibling worktrees do; no install run.
Worktree /Users/svendaneel/okam/web-gpu created and REMOVED, git worktree prune run. web-livewalk untouched, no containers, no pkill, no :3971/:5971, no push.
END RETURN

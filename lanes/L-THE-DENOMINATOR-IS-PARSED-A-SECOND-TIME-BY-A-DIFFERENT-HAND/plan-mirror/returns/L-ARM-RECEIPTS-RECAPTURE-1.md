```
RETURN: L-ARM-RECEIPTS-RECAPTURE
brief: 4dbd2b9b
verdict: fail-spec
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-ARM-RECEIPTS-RECAPTURE/recaptured.md
spec_gap: journey.js:657 resolves servingFixture only when backend=="fixture"; all ten arm-N receipts are backend=="live" by arm assertion, so "each carrying servingFixture resolved to this run's own fixture" is unmeetable at 7030c00 without editing the journey.js sha both provers testify to.
log: All ten re-captured at 7030c00 from clean worktree web-armrecapture; porcelain 0 before and after every run.
Both provers re-measured by me, not inherited: guard-proof 10/10 EXIT=0, build-provenance 5/5 EXIT=0 twice.
Both print journey.js 6dd043e1..., equal to git show 7030c00:test/e2e/support/journey.js | shasum -a 256.
Build id printed web-armrecapture@7030c00122e026f077bdb1bfecee1c916ca72d67 with NO +dirty.
My first pass DID print +dirty: two untracked run logs written inside the worktree were enough. Discarded, output moved out, re-run. The instrument caught its own operator.
Ten of ten differ from their originals; two differences are substantive.
(1) Both arm-3 originals named a build nobody can check out: Web-modules@22f2108...+dirty (row 18) and Web-modules@e34977a...+dirty (row 39) - captured from the shared main checkout, dirty. Now clean and checkoutable.
(2) Rows 37-41 carry proxiedSubjectServed/proxiedSubjectSample, which exist in journey.js at NONE of 7030c00, e34977a, 997936a, 94fa256. Sole producer is 9d4399a on lane/L-JOURNEY-PROXY-BLINDSPOT, not an ancestor of 7030c00. Those receipts were captured by a harness that is not on the ref they were committed to - the first direct evidence of what the dead guard let through.
Probe substance reproduced exactly: status, backend, surface, capabilities, findings, error, backendServed, backendSubjectServed, foreignSubjectServed all identical in all ten pairs. Only provenance moved.
servingFixture measured identitySource "none" on all ten, with the live-backend reason journey.js states; not worked around. See spec_gap.
Skipped and named: meals-statement-month (irreversible finalize, third decline), 6 live-world captures (no container slot), 12 whose specs live only on lane branches (a merge, not a copy).
Originals read from where they live: rows 16-20 from 7030c00, rows 37-41 from 997936a which is NOT its ancestor.
Nothing written to the census paths; re-captures under lanes/L-ARM-RECEIPTS-RECAPTURE/recaptured/. No push, no shared branch, no container.
Port 4010 never bound (73160 observed holding it, left alone); all ports ephemeral listen(0); CI=1 throughout.
END RETURN
```

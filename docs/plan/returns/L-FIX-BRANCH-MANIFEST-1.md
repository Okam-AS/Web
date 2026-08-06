RETURN: L-FIX-BRANCH-MANIFEST
brief: 1cfcf0da
verdict: built
evidence: lanes/L-FIX-BRANCH-MANIFEST/manifest.md
spec_gap: The exit criteria assume a four-way containment answer, but feature/restaurant-modules is a strict ancestor of candidate/fe-compose-2026-08-05, so "in modules only" is empty on the frontend by construction.
log:
Denominator 433 refs, all classified: frontend 116 (107 heads + 9 lanes), backend 317 heads.
Frontend: 22 in both anchors, 41 candidate-only, 0 modules-only, 53 in neither.
Of those 53: 3 alias duplicates, feature/swiss, plan-snapshot (documents), 3 content-already-applied, 45 real unlanded fixes.
jest-collects-lanes, worktree-basename-pin, collected-paths, L-WORLD-STAMP-WINDOWS, L-OFFER-PARTIAL-SUBTOTAL are all IN the candidate, confirming both recorded errors.
Money chain is six deep, one head: c4a4fa44 to b150668b to 799f05d4 to c8f26d52 to 7a72c02c to c32cda3c. Merging c32cda3c lands all six.
c4a4fa44 is the inverse trap: commit absent, 10 of 11 files already in the candidate via hand reconciliation f1d177f. It does NOT reintroduce the priceLabel shadow; trial-merged and verified.
Trial merge candidate+c32cda3c CONFLICTS on XReportView.vue and utils/price.js, both money-path. 19 of 25 heads trial-merged conflict; only 775d45e2, 618efc88, 808d5095, 0dbec34b are clean.
Seven more frontend chains mapped (print-host has two heads; fe-pos-clock is four deep under bed932e3).
Backend: 96 both, 33 modules-only, 7 mig-stack-land-only, 181 neither, of which 44 distinct commits are 08-04+. The other 136 predate this night and are listed but not described.
integration/mig-stack-land is a FORK, not a superset: 34 ahead, 59 behind, carrying seven migrations modules lacks. C2 is open either way, and lane/mig-stack-record only records it.
Pair 1 workforce invite, both halves out; quiet half is the FRONTEND (backend alone = unreferenced routes, screen unchanged, stale "no such routes" copy).
Pair 2 meals members-read: frontend IS in the candidate, backend 086ac34f is not. Traced, not assumed - the panel maps the missing GET to DATA_UNKNOWN and WITHHOLDS the enrol control, so it is loud and safe.
THIRD PAIR: Growth consent withdrawal. fe-gr-withdraw-origin + fe-growth-prefcentre are in the candidate; backend gr-withdraw-origin/growth-prefcentre are not. Backend is the quiet half - a credentialed-CORS preflight refusal with no status, no server log and no rendered refusal, on a consent path, and no test reds either way.
DUPLICATE HAZARD on that pair: the CORS fix exists twice (2a052800 and its rebase 3c71b323, distinct patch-ids). Take lane/cors-followups; merging it plus gr-withdraw-origin lands the policy twice.
Read only throughout. Nothing merged, landed, pushed or checked out; no containers.
END RETURN

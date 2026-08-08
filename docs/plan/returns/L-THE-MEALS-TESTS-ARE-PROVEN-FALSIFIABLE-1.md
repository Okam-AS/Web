RETURN: L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE
brief: 813ead5e
verdict: built
evidence: docs/plan/lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE
log:
Branch lane/meals-tests-proven-falsifiable @ 05c160a, off lane/meals-events-screens-tested (5ed9664), with lane/mutation-runner-cannot-delete-work MERGED, not copied. Core pinned 9626a561.
PREMISE VERIFIED AT THE TIP FIRST: 29 + 49 + 37 = 115 tests, all green, and exactly 5 THE DEFECT pins under one describe. Every figure in the brief held.
INSTRUMENT: mutate.js keeps its buffer restore and byte assert, and gains a baseline that ABORTS on zero tests, jest --json, NEWLY-red-name for RED, INVALID/SHORT-RUN, and a delimiter veto.
It now emits a PER-TEST KILL MAP. "Every mutation was killed" and "every test can fail" are different claims; only the second is evidence, and only the map can carry it.
Two self-tests changed on purpose. One asserted a crash yields RED — the defect, not the contract; it asserts INVALID now, restore assertions untouched. The other read results as a bare array.
The merged sweep guard caught the meals lane's own runner restoring with git checkout --. Deleted, superseded by the canonical one — the only docs/plan edit I kept.
Re-derived independently before touching anything: 70/71 mutations red, and 11 + 18 + 3 = 32 of 115 tests never red. The audit's figures reproduce exactly, now on an instrument that could have known.
ALL 32 ARE KILLED AND NONE WAS DELETED OR REWRITTEN. The audit's prediction was right: they were reachable by mutating what the original 71 never touched.
statement-view.js carried most — the period's zero padding, the read-not-derived member reference, intOrNull, the refusal branches, the server's own totals and signature.
Combined: lines 29/29 tests reddened, page 49/49, offer 37/37. Zero never-reddened. 101 of 102 mutations red across 3 specs.
The single survivor is the one sound equivalence the audit verified, left exactly as found and not re-litigated. The five THE DEFECT pins stayed green and were neither converted nor counted.
CORRECTION I OWE: three mutations I aimed at statement-client.js killed nothing, and I first read that as a coverage gap. It was a mis-aimed spec — the page suite mocks the service.
Re-aimed at test/meals-statement-client.test.js (21 tests, real service over a stubbed fetch) all three red. The client's rules are falsifiable; my spec was pointed at the wrong suite.
Full tier at the lane tip: 172 suites, 4135 tests, 0 failures; the sweep reports exactly one mutation runner in the tree. Trunk d4c308e was 168/4007.
Prior lane's three results.json restored after my runs rewrote them; my re-derivation kept under lanes/. Worktree REMOVED and pruned. No push, no install, no containers.
END RETURN

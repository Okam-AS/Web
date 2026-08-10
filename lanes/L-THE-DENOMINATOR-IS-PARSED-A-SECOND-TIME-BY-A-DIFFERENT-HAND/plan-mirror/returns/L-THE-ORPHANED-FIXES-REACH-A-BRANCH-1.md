RETURN: L-THE-ORPHANED-FIXES-REACH-A-BRANCH
brief: 2350c8fd
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md
log:
Trunk 78ed84f -> d4c308e. Three cherry-picks in stack order (d35d9dd receipt, 29fe003 check sums, af0e168 offer) plus a lane evidence commit. Nothing pushed. Tier 168 suites / 4007 / 0, exit 0.
ALL THREE STILL REPRODUCED on the trunk, measured not argued: each ref's own pin applied to the unpatched trunk and watched failing -- receipt 8/21 red, check 13/29 red, offer 5/23 red.
The greens are load-bearing: the receipt pin passes on Infinity, 'Infinity', true and a numeric valueOf before the fix, since Infinity > 0. A pin redding on all 21 would test the fix, not the defect.
The check pin imports isAmountInPlay, absent from trunk, so price.js came with it or the red would be a missing import. It is a delegate rename; the suite's three equivalence arms stayed green.
L-WORLD-STAMP-WINDOWS ruled LANDED BY ANOTHER ROUTE, not code-moved: world-stamp.js, the wiring check, build-provenance-proof.js, the windows test and package.json are byte-identical; git log names 94fa256.
Its three differing files have the TRUNK AHEAD by 85, 84 and 118 lines. canTakeCanonical gained a fourth parameter there. Merging it would move those files backwards, so it was left alone.
ZERO CONFLICTS of either kind, so git merge-file was never invoked -- reported because the brief mandated hunk-level resolution and there was nothing to resolve.
Measured why: the trunk had touched none of PosReceiptView, CheckLine, CheckPanel, SellScreen or price.js since c8f26d5. The dictionaries had moved 18 commits and git auto-merged all three anyway.
11be859 touches OfferDocument.vue and price-absence.test.js but leaves both byte-identical to b76cbbb, so that pick applied clean too.
ARITY SWEEP CLEAN, and still worth running: a rebased stack adding an export and rewriting callers in four components is where the uncompilable-clean-merge recurs. Every import and call site resolves.
pos_negative_sale_unpriceable landed in no.ts, en.ts and de.ts, with no duplicate key in any of the three.
MUTATION 8 of 8 RED, written into the source at THIS tip, run, and restored from an asserted byte copy. No survivors, so nothing falls under the delete-it rule.
Re-run here rather than inherited: each ref carries a mutation log written against a base that no longer exists, which proves nothing about a rebased tree.
M1 restores the exact pre-fix guard and reds 8 failed / 13 passed / 21 -- byte-identical to the pre-landing reproduction, so the pin reproduces the defect rather than restating the fix.
+2 suites +57 tests accounted: 21 receipt-discount-row (new), 29 check-lineamount-sum (new), +7 price-absence (16->23), 0 xz-residual-sites (48->48, the ref rewrites arms and adds none).
END RETURN

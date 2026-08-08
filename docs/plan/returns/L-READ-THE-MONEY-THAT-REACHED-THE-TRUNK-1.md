RETURN: L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK
brief: 84c98e3d
verdict: built
evidence: docs/plan/reviews/L-READ-THE-MONEY-THAT-REACHED-THE-TRUNK.md
log: APPROVE 78ed84f..d4c308e; no pin restates the fix; the delegate is exactly equivalent; the arity sweep is clean; the dictionaries carry the key exactly once each.
Reproduction re-run with the five components reverted to 78ed84f bytes: receipt 8 failed/13 passed/21, check 13/16/29, offer 5/18/23 — every split matches the lander's claim exactly.
Receipt greens load-bearing by name: Infinity, 'Infinity', true and the numeric-valueOf shapes pass on the unpatched component; the five dropped shapes red. The pin tests the defect.
Delegate half 1: isAmountInPlay body byte-identical to trunk's isDeductionInPlay, which becomes a pure delegate; the whole price.js diff is that pair; isAmountStated untouched.
Delegate half 2: the three equivalence arms were green in my run while the components were unpatched, so the 13 check reds are attributable to the components alone.
Arity sweep re-run on the tip: 23 import statements from utils/price all resolve, 59 call sites checked; the sole flag is a deliberate pre-existing statedSum() empty-sum arm. Clean.
pos_negative_sale_unpriceable once each at no.ts:2133, en.ts:1897, de.ts:1898; full duplicate-key scan of all three files finds none; EN/DE are genuine translations, DE matches pos_mode_day 'Tag'.
Zero conflicts re-measured: 0 trunk commits under the five source files since c8f26d5, 18 per dictionary, 11be859 net-empty on the offer files; all ten picked files byte-identical ref vs tip.
Tiers measured by me: tip 168 suites/4007/0 and baseline 166/3950/0, both exit 0, no FAIL line; the +57 delta fully accounted (21+29+7+0; price-absence 16 to 23 statically).
Checkout-restore caution checked: mutation-proof.py uses git checkout -- but reads a byte copy first and asserts the restored bytes equal it, against committed sources; not the defective pattern.
Wrinkle named: frontend-tier.txt says final tip dc96d45 while the landed evidence commit is d4c308e — a pre-final hash of the same code tip af0e168; my own tier at d4c308e settles it.
core pinned to 9626a561 in both worktrees via the file-protocol fetch, matching both commits' own gitlink; both worktrees removed and pruned; branch untouched at d4c308e; nothing pushed.
END RETURN

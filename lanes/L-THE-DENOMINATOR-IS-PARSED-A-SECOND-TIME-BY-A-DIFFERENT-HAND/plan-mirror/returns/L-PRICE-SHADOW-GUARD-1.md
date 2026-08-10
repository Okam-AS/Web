```
RETURN: L-PRICE-SHADOW-GUARD
brief: 62bb35d0
verdict: built
evidence: lanes/L-PRICE-SHADOW-GUARD/ (state-A..E.txt, plant-proof.sh) + test/price-gate-shadow.test.js
log:
Guard = test/price-gate-shadow.test.js (19 tests). Planting proof, 5 states, all re-run 18:27 after the kill:
A clean GREEN; B plant a component declaring priceLabel RED (names its file:line); C remove it GREEN;
D a ledger entry whose shadow is gone RED as stale; E restored GREEN. Both failure directions, not one.
Definition vs call: blank all but <script> (removes every template call), mask comments/strings/regex
offset-preserving, brace-walk methods/computed/props, keep only DEPTH-1 keys — a call sits at depth>=2 and
is never a key; the mixin is excluded by location, plugins/ is unscanned. 303 .vue / 3859 keys, the 2
briefed shadows exactly, 0 false positives; its own control caught a quoted-key hole in it, since fixed.
Invoice page PINNED, not fixed, and NOT already gone: the working tree is byte-identical to 8c6e91fa and
both still declare priceLabel at line 591 — that lane's own new comment says so. It fixed the coercion and
delegates to shared nokAmountLabel, but the page still stands off the seam. Not double-fixed.
CustomerInfoModal RESOLVED by deleting its method: kept the em dash UNKNOWN_AMOUNT (the estate mark used by
margin/workforce/growth), so its ASCII "-" is gone and "206,80 kr" became "kr 206,80"; 4 mounted-DOM tests.
Full jest 2754 passed / 0 test failures; only failing SUITE is another lane's playwright spec under lanes/.
journey-artifact-store PASSED for me: I ran in the SHARED checkout /Users/svendaneel/okam/Web-modules, and
its line 295 pins /^Web-modules@/ — so it reds on checkout basename, not on being a worktree.
END RETURN
```

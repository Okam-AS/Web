```
RETURN: L-WORKTREE-BASENAME-PIN
brief: b958f1c1
verdict: built
evidence: lanes/L-WORKTREE-BASENAME-PIN/evidence.md
spec_gap: the brief counted only the reds; the same literal had also silently disarmed a PASSING assertion at :347 and still ranks checkout discovery at test/e2e/support/core-checkout.js:74-75, so the pin cost three checks and not two
reason: nothing stopped; exit criterion met and the converse proven
log:
baseline e34977ac; own worktree /Users/svendaneel/okam/web-wtbasename created at it, branch lane/worktree-basename-pin
both facts the brief asked to be CHECKED are CONFIRMED, no drift: :457 is still the line, and the sibling's second failure at :295 is real - unmodified baseline gave 2 failed / 36 passed / 38 total in the lane worktree
what the id is FOR: buildFromCheckout (artifact-store.js:190) composes `<checkout name>@<sha>[+dirty]` to say WHICH TREE produced an artifact, by NAME not absolute path so the record stays readable when pasted into a review
so the defect is pinning the answer, not recording it; the literal was replaced by a derived SELF = path.basename(path.resolve(__dirname,'..')) in the four assertions that spelled it, provenance untouched
not circular: the code under test learns the checkout from lsof's cwd for whoever holds the port, an entirely different source from __dirname
THIRD instance found, silent rather than red: :347 `not.toContain('Web-modules@')` is trivially true in a tree not named that, so it asserted NOTHING in every lane worktree - vacuous in exactly the trees where lanes run; now derived and asserting everywhere
exit run, committed tree, worktree basename `web-wtbasename`: 38/38 passed
converse, shared checkout basename `Web-modules`: 38/38 passed - the fix did not swap which directory fails
both arms of `(\+dirty)?` came from real runs: the tree was dirty for the working-copy run and clean for the landed-commit run
mutation proof that the assertions still bite: dropping the checkout name from the id reds 3 tests, swapping the name for the absolute path reds 2; source restored clean, suite green after
ADJACENT, NOT FIXED, wants a ruling: core-checkout.js:74-75 ranks a directory named `Web-modules` ahead of all others when locating `core`, INCLUDING ahead of the lane's own worktree - a lane that edits core can be silently served the shared checkout's copy; fails nothing, same class as the port-4010 adoption, and changing a discovery preference touches every lane at once
commits 3dd8fa3 and 0cea96a on refs/heads/lane/worktree-basename-pin, parent e34977ac, test file + evidence only
shared checkout HEAD, branch and index byte-identical before and after both commits; both files I touched were CLEAN, so no sibling's edits rode along
no port bound, no container; the three `4010` references in the file are inert string literals fed to key computation, so the foreign PID holding 4010 was never contacted; not pushed
END RETURN
```

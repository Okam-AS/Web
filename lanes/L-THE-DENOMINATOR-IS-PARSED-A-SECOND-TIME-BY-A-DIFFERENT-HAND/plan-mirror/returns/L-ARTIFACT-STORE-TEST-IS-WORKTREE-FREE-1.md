```
RETURN: L-ARTIFACT-STORE-TEST-IS-WORKTREE-FREE
brief: f98b42c1
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-ARTIFACT-STORE-TEST-IS-WORKTREE-FREE/evidence.md
log: At trunk ff497c0, journey-artifact-store passes 44/44 in a worktree named wt-lane-tree AND 44/44 in one named Web-modules. The fix removed the dependency, it did not swap which tree passes.
The fix under test is test/journey-artifact-store.test.js:40 — const SELF = path.basename(path.resolve(__dirname, '..')) — replacing a literal 'Web-modules'.
Five further adversarial checkouts, all 44/44: spaces in both parent and basename; nested under a parent named Web-modules; run through a symlink whose basename differs from the real directory.
Also a tree named alpha, colliding with the name the suite's own helper checkouts use, and a symlink named Web-modules standing over a real tree named target-tree. Seven runs, seven greens.
The symlinks pass for a reason rather than by luck: node resolves __dirname through realpath and lsof reports the process cwd as a real path, so the assertion and the code under test agree.
alpha cannot collide either: checkout('alpha') is mkdtemp('world-alpha-XXXXXX') and returns that basename, so helper build ids read world-alpha-XXXXXX@<sha>, never a bare alpha.
Falsified M1: restoring const SELF = 'Web-modules' in the non-canonical tree reds 2 of 44, reproducing the flag exactly with nothing about the store changed.
Falsified M2: keeping the derivation but aiming it one directory too high reds the same 2. The assertions bind to the checkout the process runs out of; deriving is not circular.
The two reds are the positives at lines 434 and 601. The negatives at 486 and 602 went vacuous under the old literal in any lane tree, and now assert something in every tree.
One Web-modules literal remains, at test/e2e/support/core-checkout.js:74-75. It is a sort tie-break for choosing a sibling core, never an assertion, and jest.config.js excludes test/e2e/.
Nothing broke it, so there is no finding against the store. F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND clears on this evidence; the ruling is @sven's.
Seven worktrees created and all seven removed: wt-lane-tree, canonical/Web-modules, 'has space/web tree', Web-modules/inner, real/target-tree, alpha, plus the two symlink paths.
Estate worktree count returned 164 -> 158, the scratch parent was deleted and git worktree prune ran.
No container, no docker, :3971 and :5971 never bound, no kill issued, no npm install — node_modules symlinked into each tree.
The owner's checkout never changed branch or tracked content; nothing committed and nothing pushed.
END RETURN
```

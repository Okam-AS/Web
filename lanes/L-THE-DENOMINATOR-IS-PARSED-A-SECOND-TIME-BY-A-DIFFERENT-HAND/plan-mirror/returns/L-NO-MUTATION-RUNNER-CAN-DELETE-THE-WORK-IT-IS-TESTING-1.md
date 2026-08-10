RETURN: L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING
brief: 4870b5a1
verdict: built
evidence: docs/plan/lanes/L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING/sweep.txt
log:
THE SWEEP FOUND TWO BROKEN COPIES, NOT ONE. The second is L-FLAGS-RESOLVERS-COVER-THREE/mutations.sh:20, a git-checkout restore in shell that nobody had looked at. Both are fixed.
It calls restore seven times around five dotnet-test mutations. The full inventory of all six mutation scripts, broken and clean, is in sweep.txt.
Already correct: L-ELEVEN-WOLT/mutate.js, L-THE-TILL-TESTS/mutate.py. Not restore paths: L-FLAGS/mutate.py applies only; L-PROBE-DIR/pinbench.sh moves a scratch worktree between refs by design.
Canonical runner now at test/support/mutate.js — one address that is not somebody's evidence directory, because copying between lane dirs is precisely how this spread.
Three deltas from the 32518da version: the header no longer claims a git restore, the repo root walks up to package.json instead of counting ../, and the suite command is overridable.
The middle one is a second latent defect: the old runner counted four levels from itself, so a copy at another depth resolved paths against the wrong directory, outside the repo.
THE PIN is test/mutation-runner-restore.test.js, 13 cases. It BUILDS the broken implementation from the shipped one by swapping the restore body, so both are measured against one program.
It reds against the git-checkout implementation, proven not claimed: I mutated the shipped runner back and ran it. 6 of 6 red, including stripping the verify assertion.
The runner mutated its own restore and put itself back, the hazard in miniature. Under the old code that run would have left the mutant: an untracked file has nothing at HEAD to check out.
WHY THE VERIFY MUST NEVER GO: it is the only reason this cost nothing. The restore was wrong and silent; the byte-compare noticed and halted before a second mutation ran.
A wrong restore leaves nothing to find later — the work is gone and the run looks normal — so the guard is not redundancy over a correct restore, it is the detector for when it is not.
Its sweep arm polices every mutation script in the tree, canonical included, so it cannot pass vacuously in CI and the next broken copy fails a test rather than biting someone.
TOUCHED, exactly: on my branch test/support/mutate.js, test/mutation-runner-restore.test.js, my lane dir. In place, untracked in the main repo: the two broken tools. No findings, logs or results.
The MEALS copy became a shim that searches upward for the canonical and exits 2 with one clear line when the branch lacks it, rather than a module-resolution stack.
Tier 169 / 4020 / 0, from 168 / 4007 / 0. Load gate honoured separately: held at 18.66, ran at 9.77. Left alone but flagged: L-THE-TILL-TESTS/mutate.py restores from a buffer with no byte-compare.
END RETURN

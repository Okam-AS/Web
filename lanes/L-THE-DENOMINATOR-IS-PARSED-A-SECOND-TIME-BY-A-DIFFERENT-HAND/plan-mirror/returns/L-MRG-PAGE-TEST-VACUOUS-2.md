```
RETURN: L-MRG-PAGE-TEST-VACUOUS
brief: dfaab489
verdict: built
evidence: lanes/L-MRG-PAGE-TEST-VACUOUS/mutation-log.md
log:
Split taken: the committed suite is kept under an exit naming what it pins, and the transitions go to a successor whose precondition is a commit rather than a hope.
Reproduced at 8ac314c rather than trusted: the four unbind mutations red 11/3/10/2 on their own arms, OLD blind at 0 in all four, 31/31 restored. Identical to the prior run.
NARROWED EXIT MET: unbinding selectRecipe, createRecipe, activate or saveLinks reds >=1 test on its own arm; a bound-but-disabled activate reds too. Exact text in successor-exit.md.
Why "any" was dropped: a census unbinds the page's other four controls. addComponent reds (1); refresh, copyStarter, removeComponent leave it 31/31 GREEN. Five of eight pinned, not any.
TRAP, measured and narrower than I was handed: it FIRES - all 3 reds say `button "mrg_activate" is disabled`.
But DELETING it reds the same 3, because the call-list assertions already notice nothing was sent. It improves the sentence; it is not the detection. The log now says that instead.
SUCCESSOR EXIT written; precondition is commit 0c483de on lane/mrg-recipe-revise-ui (tip c429d51): unbind newDraft, saveDraft, addDraftComponent, removeDraftComponent, retire.
None of those five names appears in the pinned suite today, so the successor starts from five known-unpinned transitions rather than from a survey.
CORRECTION TO THE HANDOFF: lane/mrg-revise-land does NOT contain 0c483de - is-ancestor false at tip 4a4aa4a. A successor based on the landing lane would find none of the five.
Use candidate/fe-compose-2026-08-05 (f40fdf3): it carries both halves byte-identical, and the pinned suite runs 31/31 against the sibling page unmodified - the successor adds arms, repairs nothing.
Two harness defects fixed: scratch was a fixed /tmp path SHARED by every worktree, so two lanes would restore each other's page backup over the wrong tree; and it APPENDED to the log.
It now regenerates the log whole, stamps the last commit to touch each input instead of HEAD, and is byte-stable across reruns (ran twice, diffed, identical).
Landed on lane/mrg-page-test-vacuous @ 9312294, own lane branch, unpushed, committed by explicit pathspec. Worktree clean, page restored, suite 31/31.
END RETURN
```

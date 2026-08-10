RETURN: L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG
brief: ff0f38a0
verdict: built
evidence: docs/plan/lanes/L-A-GUEST-WHOSE-CODE-WAS-RIGHT-IS-NOT-TOLD-IT-WAS-WRONG/FINDING.md
log:
Both premises confirmed at 52a93c5, and one is worse than described: the same null dereference is in sendVerification too, one step EARLIER than acceptOffer.
So she never reached the accusation. Pressing Bekreft threw first and printed the TypeError's own text at her. One missing field, both flagged defects, before she types anything.
Fixed by prevention rather than wording. clientPhoneNumber is on the proposal already loaded, so the absence is knowable BEFORE she acts, unlike every other failure on this page.
It now says so up front, prints the order number it asks her to quote, and does not offer a button that could only ever fail. Both methods guard too, so the TypeError is impossible.
errorWrongCode rewritten under the previous lane rule: core collapses a wrong code, a 500 and a dead connection into one untyped Error, so naming the code was a guess.
It now says the code was not accepted, suggests checking it, and gives a next step without asserting why. The English exception goes to console.error and the localised sentence renders instead.
INSTRUMENT FINDING: the runner first reported 6/6 RED, but two printed reddened (0) — the same shape a zero-test run prints. Running one by hand gave Test Suites 1 failed, Tests 0 total.
The mutation was malformed, not the code: its anchor swallowed an opening try, the file would not parse, jest loaded nothing, and the non-zero exit read as a red. Nothing was tested.
That is the coordinator's warning from the other side: theirs was 0 tests and exit 0, a false GREEN; this was 0 tests and exit non-zero, a false RED. Same defect, judging a suite by exit status alone.
Anchors repaired to the guard alone, with a brace-balance check on each mutant before running. 6/6 RED with named failures 1,1,2,1,5,1, and a separate pass asserted every run executed 24 of 24.
Every restore hash-verified against the buffer; git checkout was never used. The canonical runner came from lane/mutation-runner-cannot-delete-work @ c65b19c, merged for provenance, not copied.
Naming note: the brief and your message call it lane/no-mutation-runner-can-delete, which does not resolve. The real ref is lane/mutation-runner-cannot-delete-work.
Both inherited findings carried: mountPage records stub calls and a test asserts GetByCode was reached, and every new assertion checks rendered words rather than a data-test marker.
Also asserted: no service call at all on the no-phone path, and the converse, that an offer WITH a number still gets Bekreft, so the fix cannot be never offering acceptance again.
Tier 170 suites / 4044 / 0, exit 0, zero FAIL lines. Lint 0 errors. Load gate read 14.33 before the tier, over 13, so it was not started; 9.43 on the next read. Not pushed; worktree removed.
END RETURN

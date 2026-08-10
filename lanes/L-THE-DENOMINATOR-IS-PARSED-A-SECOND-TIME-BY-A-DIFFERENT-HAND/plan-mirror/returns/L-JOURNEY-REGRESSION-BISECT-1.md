RETURN: L-JOURNEY-REGRESSION-BISECT
brief: 9d8c4629
verdict: built
evidence: lanes/L-JOURNEY-REGRESSION-BISECT/bisect.md
spec_gap: none
reason: bisect complete; boundary proved on both sides and reproduced
log:
Culprit: 55b2dcd "Merge branch 'lane/meals-enrol-pretick'" (compose step F1.16, index 7 of 35).
Last passing commit 9bc40c6 (lane/wf-roles-ui, index 6) PASS; first failing 55b2dcd FAIL.
Both endpoints re-measured here, not inherited: e34977ac PASS (34.4s), 9f7d8df FAIL. Both agree.
Six journey runs plus two reproductions; both boundary sides run twice, both reproduced.
Last passing journey step: "create a programme under it"; first failing: "issue its first
immutable policy version", assertion at spec line 131.
Cause: strict mode violation. locator('.meals-programs .mls-note--warn') resolved to 4 elements,
not 1. F1.16 adds an enrolment panel inside .meals-programs carrying three more such paragraphs.
The spec never changed: blob 24078760 at tip, branch tip and candidate. Only the product moved.
NOT a merge interaction: lane/meals-enrol-pretick fails this journey UNMERGED at its own tip
2e3f39d, same 4-element shape, with the spec present and identical. No rebase or reorder avoids
it; the head carries it on its own terms. Input to D-REBASE-CONFLICTING-HEADS. Nothing fixed here.
Harness guards: CI=1 (never reuse servers; port 4010 is held by a foreign api-server), own ports
3777/4777, core pre-populated, .nuxt cleared per step, shared node_modules/.cache untouched.
Every step was PASS or FAIL-ASSERT; no harness-shape failure. Own worktree, detached, no pushes.
END RETURN

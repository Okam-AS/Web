```
RETURN: L-MEALS-PRETICK-NEVER-WALKED
brief: 9d0c02b8
verdict: built
evidence: lanes/L-MEALS-PRETICK-NEVER-WALKED/mutation-log.md
spec_gap: none in the brief - but GET 12R is ABSENT from feature/restaurant-modules, so the withheld arm is a shipped backend and the merge order is now a Flag.
reason: complete - both arms green on the final tree, three mutations killed, 11 runs zero harness-shape failures.
log:
Fix 9fbed80 on lane/fe-meals-pretick-walked off d320105. Fixture now serves 12 AND 12R: 12 replaces
the WHOLE set, so serving it without 12R is what left the branch dark. Shapes read BY OBJECT from
refs/heads/lane/meals-members-read, never from a working tree.
BRANCH-CHANGE PROVED, not the walk's greenness: enrol-unread/enrol-unread-refusal render iff the read
failed (v-else-if on enrolledUnknown), so the answered arm asserts toHaveCount(0) on both. The
decisive step deselects+reselects the programme, unmounting the v-if - so every box after it was
built by resetEnrolSelection from the read alone, which a post-write check could not have shown.
BOTH ARMS KEPT, both are real backends: feature/restaurant-modules has [HttpPost] members, NO
[HttpGet], no ListProgramMembersAsync; 12R exists only on lane/meals-members-read (unmerged). Only
the GET moves between arms. The arm is DECLARED via E2E_MEALS_PROGRAM_MEMBERS_READ, not discovered
from DOM, or it is green under both; the artifact drops meals.program.members.set when withheld.
M1 read stops answering, arm unchanged: RED :207 toHaveCount 0 got 1. M2 count kept, ticks never set:
RED :253 toBeChecked AFTER passing 'Pameldt na: 1'. M3 read answers, withheld arm: RED :266. Restored.
FLAG for merge order: the pretick lane deleted the 'no route reads this back' note, so landed without
lane/meals-members-read the control is permanently withheld and the default arm reds. Also green: eslint, fixture-divergence --prove 7/7, 5 meals Jest suites 130 tests. No push, 4010 untouched.
END RETURN
```

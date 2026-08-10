```
RETURN: L-WFR-ACCESS-STRING-TRUTH
brief: d6702335
verdict: built
evidence: lanes/L-WFR-ACCESS-STRING-TRUTH/verdict.md
spec_gap: the copy is true of what ships; the real gap is that the capability was built on two lanes and neither landed, so this is a landing problem, not a copy problem
reason: exit criterion met by ruling the string TRUE against a named API surface; no file changed
log:
RULING: wfr_access_no_list is TRUE of what ships. Copy stays, both pins stay, nothing edited.
Surface named: refs/heads/feature/restaurant-modules @ 8e2b57de, read BY OBJECT (working tree has
lane/meals-grace-pins out, 63 behind). All ten workforce controllers enumerated, route attributes
read not word-matched: manager side POST staff/{id}/invitations (issue) and nothing else, consumer
side POST workforce/me/invitations/claim. No GET list, no revoke verb, anywhere.
Positive control PASSED before reporting the zero: same search finds the known issue route, and also
finds Meals list/create/revoke — Company Meals, which does not answer a wfr_ question.
Not a C3 gap: IWorkforceInvitationService declares exactly IssueAsync + ClaimAsync; Revoked=3 is in
the enum and one comment, written by no code path. Supersede clause verified true at
WorkforceInvitationService.cs:117-125 (reissue overwrites TokenHash on the single Pending row).
BOTH pins found, the 2nd only by searching the prose: onboarding.spec.js:349 is a journey.finding
note carrying no key and cannot red a run; unit pin at roster-components.test.js:412.
LANDING PROBLEM, --is-ancestor checked not assumed: backend 68f2472c and frontend e8d69fc sit
EXACTLY on their tips, neither an ancestor — clean fast-forwards that must land TOGETHER (backend
alone leaves the string stale, frontend alone binds 404s). Either landing makes this sentence false.
END RETURN
```

```
RETURN: L-MEALS-MEMBERS-READ
brief: ed574fa0
verdict: built
evidence: lanes/L-MEALS-MEMBERS-READ/mutation-log.md
log:
BRIEF TRUE IN BOTH HALVES at 8e2b57de; one drift: the reason block sits at 475-483, not 426. Neither half
exists on ANY ref (-S: the route, ProgramMembersAsync, NotEnrolled), so not fail-spec.
Base feature/restaurant-modules 8e2b57de, worktree wt-mealsmembers, lane/meals-members-read 086ac34f. Never
pushed, no shared ref moved, no container, no migration, mig-stack-land not used.
H1 GET /v1/meals/programs/{id}/members -> the existing MealsProgramMembersModel; Enrolled rows only (a Removed
row re-ticked is somebody an admin took out) + the revision endpoint 12 CASes on.
H2 MEALS_NOT_ENROLLED; chain Revoked -> !enrolled -> !window, the two old answers byte-identical.
Company-scoped on purpose (its store is on the agreement = the query a dark surface must not run), so
MealsOperatorLeverReachTests 30 (7,23) -> 31 (7,24), and it joins MealsProgramDarkModuleTests.EveryEndpoint.
FOUR STATES + 2 baselines, one filter: GREEN/RED/GREEN/RED/GREEN/GREEN, WebApi.dll mtime advancing on exactly
the 4 source-changing steps - excluding wrong-tree and stale-binary together. That audit caught 2 faults in
my OWN instrument, both recorded. Full tier 4647/0/12; ev-dietary sheets restored, not committed.
TOUCHED: Controllers/Meals/MealsProgramController.cs; Services/Meals/{MealsProgramService,MealsQuoteService,
MealsReasonCodes,Interfaces/IMealsProgramService}.cs; WebApi.Tests/Meals/{MealsEnrolmentReadbackTests[new],
MealsOperatorLeverReachTests,MealsProgramDarkModuleTests}.cs. FOLLOW-UP: enrol-ui can drop its no-read note.
END RETURN
```

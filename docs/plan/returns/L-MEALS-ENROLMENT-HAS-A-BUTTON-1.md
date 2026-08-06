```
RETURN: L-MEALS-ENROLMENT-HAS-A-BUTTON
brief: 3fe77c9e
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-a0b63b4f563fc2786/artifacts/journeys/meals-admin-setup/fixture/03-a-programme-somebody-is-enrolled-in.png
log:
Enrolment editor lands on the programme panel of /admin/meals-companies, where the demo plan put it; that page already carries a nav entry, so C3 closes inside this diff.
Browser proof: journey meals-admin-setup, extended, drives company -> corridor -> programme -> policy -> ENROL through the real UI. Screenshot shows PAAMELDTE = 1 from the server's own re-read.
Ports mine alone: web 3942, fixture 4942. Owner's :3971/:5971 and okam-lwtwo-sql/redis untouched; no pkill of any kind; core/ copied read-only from Web-modules and returned empty by teardown.
Client: MealsAdminService.SetProgramMembers -> POST /v1/meals/programs/{id}/members, program-scoped, CAS on the programme revision (not endpoint 11's integer). Pinned method set now twelve.
The hard part is not the button. The write takes the DESIRED set (omission = removal) and NO route reads that set back: memberships carry no enrolment state, the programme carries a count only.
So buildEnrolmentView admits two knowable states - serverCount === 0, or the set this session's own write returned - and warns in every other one that it knows how many, not who.
enrolmentChange returns removes: null (never []) when the set is unknown, since "nobody is at risk" is the one claim the wire cannot support. Page holds enrolledByProgram, cleared per company.
A revoked membership is listed, untickable, and dropped before the wire; meals.membership-revoked gained its own sentence in refusal-copy rather than falling through to "something went wrong".
Fixture models the route for its replace semantics, advancing the programme revision per set. Divergence vs OkamAPI 8e2b57de: 1 finding, pre-existing and Growth's, none on this route.
Suites: 273 pass over the 10 meals suites + fixture-divergence + admin-nav-access. Repo-wide 2579/2581; both reds are this worktree not being named Web-modules, plus 3 suites needing core/.
NOT MET: the company tab at the funded checkout. That surface is ConsumerWeb's and is built there already - CheckoutMeals.vue binds /me/companies, /me/context and quotes, so the plan's par.7 is stale.
What blocks the loop is a world, not code: the API at :5971 has all four Features:Meals flags false in its appsettings, and flipping the owner's live config was forbidden to this lane.
To close it: one API with Features:Meals:{Module,Ordering} true, enrol through this editor, then open ConsumerWeb /checkout as that member. Nothing further needs building on the admin side.
Backlog, ordered, NOT built here: 1) month close, MealsMonthClose.vue on /admin/meals-agreements, statement draft #19 + finalize #20 with the open-exception 409 rendered as a count.
2) reconciliation tab beside it, queue #17 + resolve #18 with the owner note; then membership revoke on the people panel, founding-admin employeeReference on the create form, company archive.
END RETURN
```

Hub copy could not be written: this lane runs worktree-isolated and the harness refuses writes to
`/Users/svendaneel/okam/Web-modules/docs/plan/returns/`. The identical text is handed back in the
lane's final message; copy it to the hub path verbatim.

Branch: `lane/meals-enrolment-has-a-button` @ `8ac6f63` + 15 modified files (worktree
`/Users/svendaneel/okam/Web/.claude/worktrees/agent-a0b63b4f563fc2786`, uncommitted, no push).

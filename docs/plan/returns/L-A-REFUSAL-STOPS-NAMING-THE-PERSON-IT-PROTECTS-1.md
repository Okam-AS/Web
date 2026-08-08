```
RETURN: L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS
brief: 0e04a195
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-refusalid/.lane/L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS-detail.md
log:
New wire fact WebApi.Tests/Wire/MealsRefusalIdentityWireTests.cs: company, invitation and claim over HTTP, asserting the RESPONSE BODY of the 403 rather than any rendered text.
Branch lane/a-refusal-stops-naming-the-person @ 760ab26b6, worktree ~/okam/OkamAPI-refusalid, off feature/restaurant-modules a14084874. Trunk has since landed to dc0fa8508, no overlap. Not pushed.
Non-SQL tier 4753 passed / 0 failed / 10 skipped against the 4752/0/10 baseline: delta +1, exactly the one added fact.
Anti-vacuity first: 403, application/problem+json and code meals.invitation-contact-mismatch are asserted before the leak check, so a green means the contact guard ran and then withheld.
Four markers over the raw body: the invitee's email, its local part alone, their number as digits only, and the buying company's payroll reference for them.
RED: the factory mutated to echo those invitation fields. All four limbs fired in one run; the failure landed on the leak assertion with the status and code assertions above it still passing.
GREEN after git checkout plus touch plus rebuild, assembly mtime later than source mtime -- the --no-build staleness trap CLAUDE.md warns reverses exactly this procedure.
The assertion prints LABELS and never values: a control against publishing somebody's address has no business printing one to prove the point.
THE FLAG IS WRONG ON ONE POINT. Under the mutation the whole tier reds TWO tests, not none: MealsInvitationIntendedContactTests.The_refusal_does_not_tell... is pre-existing at trunk (022c5324f).
That one catches the email limb only, at the object tier, and it accepted ANY 403 -- vacuous the moment the claim refuses earlier. Tightened to pin the code; the only edit to an existing file.
So the true statement is narrower than the flag's: nothing read the wire, and nothing covered the phone or payroll-reference limbs.
SIBLING SWEEP, none found. Meals' 22 extension keys plus Workforce, Events, Margin and Training are opaque ids, states, hashes and counts; no contact detail reaches any extension.
Workforce's invitation surface is stricter than Meals': invalid, expired, revoked and claimed all collapse to one opaque 404 carrying no extensions. Growth has no extension bag at all.
One interpolated Detail across the six modules, EventsSettingsService.cs:89, and its value is an event-space name -- a room, not a person.
No container and no migration; the wire tier is in-memory SQLite. Both arms are provider-raised; the only constructed input is the seeded world, declared in the fixture's own summary.
END RETURN
```

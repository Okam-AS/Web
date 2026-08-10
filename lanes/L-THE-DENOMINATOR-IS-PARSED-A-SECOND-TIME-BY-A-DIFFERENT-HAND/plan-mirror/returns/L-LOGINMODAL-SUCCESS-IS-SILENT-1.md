```
RETURN: L-LOGINMODAL-SUCCESS-IS-SILENT
brief: 7d8d933d
verdict: built
evidence: /Users/svendaneel/okam/web-loginsuccess/lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/kill-proof.txt
log:
C7 ANSWERED, NOT A CREDENTIAL: AdminUserService.Login (plugins/admin-core-services.js:50-54) collapses the User to a boolean first, so the assigned string was "true".
The token is real one layer down: core UserService.Login resolves keys id, phoneNumber, email, emailConfirmed, firstName, lastName, isPowerUser, adminIn, token. No values read or printed.
LoginAdmin in that same adapter file already returns the user object, so the line sat one call-site edit from serializing the 36500-day non-revocable token into an alert box.
BRIEF PREMISE CORRECTED: nobody was ever shown it. user.token hides the form once SetCurrentUser lands, and all 15 mount sites unmount the modal on the close the success path emits.
Four browser arms, ports 3897 dev and 4897 API with nothing bound (every call fulfilled by page.route, nothing left the laptop), compiler restarted per arm, readiness polled not slept.
stock/success: served chunk carries JSON.stringify(response)=true and error-slot sightings []. stock/wrongcode: the same observer catches "Feil kode", so that [] is a real negative.
The arms' own barrier caught two harness faults that each gave a confident wrong answer: a Playwright route-order shadow, and a bundle check that was reading my own comment.
FIX: drop the assignment and add this.errorMessage = "" at the top of login(), matching getCode directly above it. 25 lines in one file, mostly comment.
Deleting the line alone would have been wrong: login() carried no reset, so it was the only thing clearing a stale "Feil kode" before a success. Mutant M3 is that deletion; test B kills it.
RED BEFORE GREEN: 15 mutants, 0 survivors. M1-STOCK is the defect verbatim and reds A, B, C7, F, I by name. 3 inverses stay green so the count cannot be mistaken for a grep.
test/login-modal-success-is-silent.test.js, 11 tests; two drive the real RequestService/UserService/adapter chain so the premise is pinned rather than assumed.
No permanent e2e journey added, deliberately: such a test passes against the defect, and this estate has already shipped nineteen non-failing assertion shapes.
Regression 135/135 across the 7 suites touching this modal; full jest 2609/2611, the 2 reds being journey-artifact-store's /^Web-modules@/ worktree-name assertion, zero refs to this diff.
FLAG: jest.config.js here does not ignore lanes/ (that entry is only on candidate/fe-compose-2026-08-05), so lane files got collected. Renamed mine to *.probe.js and *.playwright.js.
Base lane/login-modal-reports-a-failed-send @ 1a33ed7, the only newer LoginModal.vue in the repo. 0f88242 checked against its diff: no overlap. Branch lane/loginmodal-success-is-silent @ fbcc03a.
END RETURN
```

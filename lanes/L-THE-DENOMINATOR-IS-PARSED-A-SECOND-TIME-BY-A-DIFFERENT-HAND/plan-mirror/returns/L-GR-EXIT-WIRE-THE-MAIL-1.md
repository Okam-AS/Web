```
RETURN: L-GR-EXIT-WIRE-THE-MAIL
brief: 79bacebd
verdict: built
evidence: lanes/L-GR-EXIT-WIRE-THE-MAIL/evidence.md
log:
All five named changes built; backend lane/gr-exit-wire-the-mail 54a8bb51 off 8e2b57de, frontend lane/fe-gr-exit-wire-the-mail 814f04d off e34977ac. Nothing pushed, no container, no migration, appsettings untouched.
Footer now carries both links. Captured from the body the provider actually received: "Administrer eller stopp e-postene her: .../communications#token=..." then "Meld deg av nyhetsbrevet: .../unsubscribe#token=u1....".
Withdrawal proved EFFECTIVE, not just acknowledged: link read out of the body, token spent, clock advanced past the 7-day cap, campaign two dispatched -> leaver Suppressed, other recipient ProviderAccepted. That second recipient is the control; without it the frequency cap alone yields Suppressed.
Long-press leg closed: GET was 405, now 302 with the token moved query->fragment; writes no suppression and does not spend the token, so mail scanners are safe.
C7 DEFECT FOUND IN MY OWN DIFF AND FIXED: MVC RedirectResultExecutor logs the redirect target, fragment and token included, at Information into a sink App Insights retains. Location header now set directly. Mutation-checked: Redirect(target) reds the test, restored greens 19/19.
J-EXIT-UNSUB (journey growth-guest-unsubscribe) PASSED in Chromium; opens the captured link, done card "Du er meldt av", plus replay, token-dead and no-token legs. Artifact + 2 screenshots in the lane dir; token grepped for in artifacts/ and absent.
Its first green run was PARTLY VACUOUS and I fixed it: the page strips its token on mount, so a goto differing only in the fragment is same-document and never remounts - the replay and refusal legs were asserting against the previous card. All arrivals now go via about:blank.
ON YOUR RULING, both conditions met. Capture keeps a "# DEAD TOKEN..." annotation emitted by WriteEvidence so regeneration reproduces it, plus capture/README.md opening "this is not a live credential and there is nothing to rotate". Journey skips # lines; the URL never starts with one.
Your second condition needed a real change, because @fixture/grepInvert does NOT cover it and I will not claim it does. It forbids SPENDING (this journey is skipped whenever E2E_API_BASE_URL is set) but regeneration happens in the BACKEND xUnit test, which Playwright config has no reach over.
So WriteEvidence now REFUSES to write unless the captured link names web.growth.test, host literal duplicated inside the guard rather than read from the harness constant - a guard expressed in terms of the thing it guards cannot fail. Mutation-checked: repointed at okam.no it reds and the evidence dir is never created.
Suites: new exit tests 5/5; one-click wire 19/19 (4 new); ~Growth 589 passed / 8 failed / 3 skipped; frontend jest 60/60; journey 1/1 re-run green against the annotated capture.
The 8 backend failures are PRE-EXISTING, verified not assumed: cut a pristine worktree at 8e2b57de, built it, same filter, the SAME 8 names fail (8 failed / 27 passed). SQL-Server and migration-lineage tiers, no slot for a DB. Baseline worktree removed.
C5 NOT claimed: nothing marked verified or accepted. Two false sentences in unsubscribe.vue ("NOTHING LINKS HERE YET", the "gets a 405" claim) deleted in the same change that falsified them. Go-live still needs Growth:UnsubscribePageBaseUrl pointed at the real consumer-web origin.
HAZARD, since you are recording it: Playwright reuseExistingServer silently borrowed two FOREIGN e2e fixtures (port 4010, and 4021 owned by a run in ~/okam/web-kodeui), both serving old code; the symptom was a 401 indistinguishable from a missing route. Killed nothing. Passing runs used CI=1 on ports verified free first.
Accepted residual unchanged from the assessment: a JS-executing scanner could trigger the arrival-unsubscribe page. One click means one click; machine path stays the header POST.
END RETURN
```

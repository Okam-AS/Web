```
RETURN: L-WF-INVITE-SURFACE
brief: f122e6f0
verdict: fail-spec
evidence: lanes/L-WF-INVITE-SURFACE/evidence/rewalk-at-e34977ac.playwright.json — 16/16 steps passed, stamped commit e34977ac (no +dirty), re-walked in clean worktree ../wt-wfinvite on lane/wf-invite-surface, ports 3077/4077, `1 passed (1.9m)`; 7 screenshots beside it; already-committed twin at artifacts/journeys/workforce-invitation-onboarding.playwright.json
spec_gap: The invite surface, its routes, its nav entries and a committed green browser journey capturing manager-issues → worker-claims → worker-sees-own-schedule ALL already exist at baseline e34977ac (landed by 35440cf), so this lane's exit criterion is satisfied before it starts and there is nothing left to build.
log: |
  PREMISE STALE, verified by walking not reading. The invite/claim surface already exists at
  baseline e34977ac (landed by 35440cf): pages/workforce/join.vue (public, mounts its own
  LoginModal), WorkforceEngagementPanel issue-invitation, me-client #32 + roster-client #6 bound.
  C3 already closed - nav at AdminPageHeader.vue:360 and :459. The brief's citation is refuted IN
  TREE: the "out of scope" comments existed at 35440cf^ and that commit deleted them.
  I did NOT trust the committed green JSON (C5 bars suite-artifact-as-acceptance). Re-walked in a
  CLEAN worktree - the shared checkout carries ~50 lanes' edits to the two files this journey most
  depends on (fixture/api-server.js, support/journey.js). 16/16 steps, stamped e34977ac, no +dirty.
  Exit met verbatim: step 4 issue, step 12 claim, step 13 own schedule 09:00-15:00.
  C7 NOT breached: record stores the code's LENGTH not its value; screenshot token is fixture-
  minted (api-server.js:1207); @fixture tag + config grepInvert stop it ever running live.
  1280 proven not assumed: Desktop Chrome viewport IS 1280x720, so every click already lands there.
  CORRECTION to the brief: expired/already-used/wrong-recipient are DELIBERATELY indistinguishable
  (anti-oracle pinned at WorkforceInvitationTests.cs:493) so those 3 CANNOT be walked apart.
  Green is FIXTURE-backed; against a real API lane/wf-bootstrap is still needed to mint the manager.
END RETURN
```

```
RETURN: L-LIVE-WORLD-TWO-HUMANS-WALK
brief: 98b26e67
verdict: built
evidence: artifacts/journeys/workforce-week-run-two-humans.playwright.json
log:
TWO HUMANS IN ONE LIVE WORLD, from the app's own ids: published by 6ba6dd27, acknowledged by 9750cac8, asserted not-equal. live, 128 served / 94 subject / 0 foreign / 0 proxied.
Wall 1 shut with NO code change and NO edit to live-world.sh: exported AppSettings__AdminUserPhoneNumber + __PowerUserVerificationCode are inherited by its dotnet run at :346-349.
BROWSER FACT THE BRIEF MISSES: SendVerificationTokenAsync exempts neither number - UserController.cs:209 does. Without it the modal never reaches the OTP boxes and that door is unusable from a page.
C7: neither generated half, the committed power-user code, nor the 43-char claim token reaches repo, artifact, pictures or logs - swept, 0 each. Token panel dismissed before any screenshot.
BOTH FLAGS PROVEN LOAD-BEARING. In-walk probes press each control while down: flag-disabled-read-only naming workforce.publication, and "Kunne ikke bekrefte mottak". Both 409s sit in failedRequests.
AND BY MUTATION on a restored world: drop the publication flip -> RED at step 7 (no draft); drop the selfservice flip -> RED at step 13 (.wfme-pub expected 0, got 1). Mutants kept out of artifacts/.
F-WF-ACKNOWLEDGE-SHOWS-NOTHING reproduced live and ASSERTED at step 13; proof routed through the manager's publications page as instructed - screenshot 08, "Bekreftet av den ansatte (1)".
IT IS ALREADY FIXED ON TWO UNMERGED LANES: 8539b3f and ce6892a, neither an ancestor of 8ac6f63. Invert step 13, never delete it, the day either lands.
NEW WALK-ONLY DEFECT: the confirmed worker is labelled "ingen innlogging enna - kunne ikke bekrefte fra en skjerm" inside the group that exists only because she confirmed from a screen.
Cause: PublishService:310 freezes ClaimedByApplicationUserId at publish; InvitationService:317 back-fills only the invitation; ReceiptGroup.vue:29 prints that snapshot as present tense in every group.
It needs a claim AFTER a publication, then a confirm - a sequence no world on this branch could produce until now, and one no component test can assemble.
HARNESS DEFECT: pictures file under live-5971-unidentified, JSON under live-5971-8e2b57d. JourneyRecorder hands backendKeyFor `meta` (backendBuild) but it destructures `build`. Not fixed here.
NAMING: workforce-week-run path AND id belong to unmerged 4ef0d00. Renamed mine to -two-humans, moved my first run to lanes/, removed only the canonical copy, left the sibling's pictures alone.
RESOURCES ALL MINE: okam-lwtwo-sql :15436 (docker ps EMPTY, ~6.7GiB free at start), api :5971 pid 96293 from wt-lwtwo-api @ 8e2b57de, web :3971. 127 migrations from empty, 25 triggers.
NOT ACCEPTANCE (C5). World LEFT UP and restored clean: /admin on :3971, worker 99999999/123123, manager pair only in the scratchpad env file. Detail + teardown in lanes/.../evidence.md.
END RETURN
```

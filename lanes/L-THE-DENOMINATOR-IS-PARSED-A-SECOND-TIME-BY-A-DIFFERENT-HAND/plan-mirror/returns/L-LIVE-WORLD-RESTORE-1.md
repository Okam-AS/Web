```
RETURN: L-LIVE-WORLD-RESTORE
brief: 10914703
verdict: built
evidence: lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt (commit 337f9bf)
log:
EXIT MET, with three journeys not two: events-deposit-precondition -> workforce-schedule-publish -> workforce-flag-lever, ONE world, a restore before each, all green and all "backend":"live" at :5961, and __EFMigrationsHistory still reading 127 at the end. See 09-chain-three-journeys.txt and the three chain-*.live.json.
CHOSE RESTORE. Parameterisation cannot help this pair: schedule-publish does not need *a* week with no plan, it needs THE CURRENT week, which is the week the page opens on; varying the store means a second roster, rate and membership row per journey. It stays unspent for the id-discovery group, which needs room rather than a clean slate. Restore costs ~9s and a 10 MB file inside the SQL container.
MEASURED ON THIS HOST: rebuild from empty 42.1s warm (60.0s cold); snapshot 3.6s; restore+verify 8-11s; verify alone 4.0s; the RESTORE statement itself 0.03-0.12s; migrations replayed by a reset: 0.
THE RESET CAN FAIL, shown two ways. Journey B green on a restored world (Revisjon 1); journey A straight after with NO reset REDS on the override B left behind ("Expected: Av / Received: Pa"), playwright exit 1; restore; A green. And `verify` run against the used world reds ("carries 1 schedule revision") while greening on the restored one.
THE BRIEF'S FINDING IS PARTLY FALSE. A -> B with no reset PASSES: once the previous revision is published the draft view resolves none, so the badge still reads "Ingen plan" and B quietly creates *Revisjon 2*. It does not red - it produces weaker evidence than its own header claims. The collision that reds is the FLAG, not the week. Both spec headers corrected; it is also an assertion-floor item for L-LIVE-ASSERTION-FLOORS.
C1 BY CONSTRUCTION AND CHECKED EACH TIME. No UPDATE and no DELETE in the new script, against a guarded table or any other; the catalog is replaced whole by the engine. Every reset verifies all 25 append-only triggers are back and enabled with a SHA2_256 over (name|parent|is_disabled|body) identical to the image's. `snapshot` refuses a world already carrying a revision, publication or override, so the image cannot rewind a real answer.
GUARD CONFIRMED FIXED BEFORE TRUSTING ANY RUN (journey.js:410 re-throws after writing) - and it then fired for real, twice, unprompted: backendServed 0 and exit 1 when my page was broken.
WHY IT BROKE, and it is not mine: THREE `nuxt dev` watchers run out of this one checkout (pids 6601, 39821, 85915) sharing .nuxt/. A sibling recompile deleted .nuxt/views/app.template.html under my server and webpack cached the failure until I restarted it. Cost two whole chain runs.
L-ARTIFACT-PROVENANCE's defect reproduced live rather than argued: the canonical workforce-flag-lever artifact was overwritten twice within seconds of my run finishing, by another lane's live run at :5956. Every artifact I filed was copied only after checking its apiBaseUrl reads :5961.
C7: image and manifest never leave the container (/var/opt/mssql/backup; any path outside /var/opt/mssql is refused). No .bak on the host, nothing docker cp'd out, no credential in any committed file.
C2: no migration authored. Localhost asserted on the resolved target before any restore, plus a deployed-name refusal.
DID NOT TOUCH live-world.sh (the sibling lane owns it) or support/journey.js (L-ARTIFACT-PROVENANCE owns it). So live-world.sh's closing banner still prints one-world-per-journey; that correction is the sibling's to make, and the new script's header carries the truth meanwhile.
RESOURCES ALL MINE AND NAMED: container okam-lwr-sql on :15435 (started by me, memory-capped), API :5961 pid 55544 from worktree ~/okam/wt-lwr-api at 3579bbbc, web :3961 pid 51215. okam-lws-sql, okam-lws-staff-sql, okam-lvsp-sql and zen_pasteur untouched; 5 mssql containers up.
NOT ACCEPTANCE (C5). World LEFT UP and freshly reset for a walk: http://127.0.0.1:3961/admin/workforce-schedule, 99999999 / AppSettings__DemoVerificationCode__REDACTED, roster Astrid Vik / Ingrid Moen / Jonas Lie, current week unplanned. Teardown: kill 55544 51215; docker rm -f okam-lwr-sql; git worktree remove /Users/svendaneel/okam/wt-lwr-api.
Committed by pathspec onto feature/restaurant-modules (337f9bf), nothing pushed; the sibling lanes' live-world.sh and journey.js edits were left exactly as found.
END RETURN
```

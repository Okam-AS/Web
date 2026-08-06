```
RETURN: L-ARTIFACT-RANK-KEY
brief: 0df4645b
verdict: built
evidence: lanes/L-ARTIFACT-RANK-KEY/evidence.md (commits 397f4ab + 5407589, pathspec) + lanes/L-ARTIFACT-RANK-KEY/mutants/mutation-report.txt
log:
Measured the base first. Clause (a) ALREADY LANDED (533aea4; 18/18 green in this checkout). Clause (c) ALREADY TRUE: all three live journeys hold live passes with real steps and every referenced screenshot on disk, restored by other lanes' own re-runs on 08-02, not by me. Nothing fabricated, nothing re-run to manufacture a restoration. So I scoped to (b) plus the one hole in (a) the brief said landed today.
EXTENDED, not forked. Read guard-proof.js and refusal-shapes.js/fixture-divergence.js before touching that directory. None of them touches live-world.sh. guard-proof.js is the real coupling: it copies journey.js and refuses to report success if "if (wrongWorld) { throw new Error(error); }" has moved. Untouched, and the proof was run: 7/7 arms held.
live-world.sh: the one line is in. It computes <repo>@<head>[+dirty] from OKAM_API_REPO and carries it into all three run commands the banner prints, plus the banner itself and the usage header. The script was NOT executed - it stands a SQL world up and this lane may not.
The fixture now answers "which build answered" about itself, as fixture@<sha> sourced from the fixture's own file - never <repo>@<sha>, which is what would read as an API claim. Silence there was what left 19 of 22 artifacts unable to answer the clause at all. No ordering change, and it is pinned: backend is compared before identity, and two fixture runs are one lineage.
+dirty now survives into the key, so a clean and a modified build at one commit no longer key identically - the exact collision the build token is in the filename to prevent.
THE REMAINING HOLE, and it is deliberate: a run of the SAME backend takes the slot unconditionally. It has to - a failing world must be able to say so, and the provisional "running" write is the only thing stopping a killed run leaving a stale pass. But it overwrote its own runs/ file too, so the stronger record was gone from disk entirely. That is growth-newsletter-send-gate on 08-03.
Closed by preservation rather than refusal: the displaced record is kept whole at runs/<name>.<key>.superseded.playwright.json, named from the record that replaced it and from the ledger, and that file only ever moves up. The canonical still shows what is true now, and says in the same file where the stronger run is.
NON-VACUITY, attempted for real in a browser: a fixture run of workforce-flag-lever against its standing live pass left the canonical BYTE-IDENTICAL (dbc424de) and filed itself as the loser naming live-5961-3579bbb.
Paired with the acceptance: a re-run of workforce-invitation-onboarding WAS accepted and took the slot - and preservation fired unaided, the superseded file being byte-identical (be6ee9bd) to the canonical it replaced. That is the newsletter shape, caught on a real run.
Four mutants, each killing at least one test (E 3, F 1, G 1, H 1), 26/26 restored. The mutation harness's own first run compared nothing on one side - jest prints its summary on stderr - which is the twenty-first non-failing shape; caught and fixed before any number here was believed.
jest 110 suites / 2481 tests green. eslint 0 errors on the three shipped files. bash -n clean. Exactly one canonical sha moved, the one deliberately replaced; nothing else in artifacts/journeys/ changed.
DISCLOSURE: the accepted half updated another lane's force-added artifact, so I committed it separately (5407589). It is identical to the record it replaced in every field that is evidence of anything - passed, 16/16 steps, 74 fixture responses, 7 screenshots, 6 findings, 3 capabilities - plus backendBuild.
STILL OPEN: clause (b) is 2/22 on disk, not "every". The mechanism is total but a standing artifact gains identity only on its NEXT run; the 19 fixture ones need one re-run each, and the two live ones need a live world, i.e. Docker, which this lane is forbidden. I deliberately did NOT mass re-run the fixture suite - one journey is known red at the tip and reddening other lanes' green evidence before an acceptance walk is not this lane's call.
F-GR-SEND-GATE-JOURNEY-RED is untouched; its remedy is the journey, not the store. The green run it destroyed on 08-03 is NOT recoverable and was not reconstructed, because a reconstructed artifact is a fabricated one.
Ports 3094/4094, both mine. No container started or touched, no live world disturbed, no migration authored, nothing pushed.
END RETURN
```

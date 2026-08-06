```
RETURN: L-JOURNEY-EVENTS
brief: 0edc3711
verdict: built
evidence: artifacts/journeys/events-enquiry-to-settlement.playwright.json (passed, fixture, commit a1a1ec84e, 23/23 steps, 6 screenshots, 95 backend responses)
log:
WALK: public enquiry -> dark pipeline -> Events.Core lever -> proposal drafted+sent -> guest accepts -> start service -> close -> invoice line -> reconcile -> statement Closed, booking Oppgjort. Nothing seeded; each step names what the previous produced (reference, contact name, token, content hash). Green 3x, incl. after commit.
OFF-FLAG ARM is the same walk, one variable, flipped through /admin/feature-flags: off = refused, no receipt, and a reload shows the offer still answerable; on = the same press yields the receipt naming version 1 and the send-time content hash.
RIGHT REFUSAL asserted, not merely a refusal: the guest reads EVENTS_PROPOSAL_NOT_FOUND's sentence and explicitly NOT EVENTS_DISABLED's - a gate answering the latter would tell an anonymous caller which venues bought the module.
MUTATION: gate line removed from fixture/events.js -> run FAILS, exit 1, the refusal card never appears, and the mutant artifact records ZERO accept refusals (lanes/L-JOURNEY-EVENTS/mutant-run-artifact.json). Restored -> green.
ENQUIRY CREATION SUCCEEDS WITH THE FLAG OFF, as briefed (F-EV-INQUIRY-UNGATED). Not called a defect: the walk shows the consequence instead - the guest holds a reference while the venue's own pipeline is dark on the next step - and files it as a note finding in the artifact.
FIXTURE: new test/e2e/fixture/events.js owns every /events route, public and admin. They moved out of api-server.js because the gate on the public writes needs the admin half's knowledge of which venue a token belongs to; two enforcement points is one missing eventually.
CONSEQUENCE SETTLED: the standing world's two SENT tokens now need a venue that HAS the module, so they belong to world.GUEST_VENUE_STORE_ID=43 with one seeded Events.Core row. Store 42 keeps its empty deny-closed state, so the runsheet-onboarding "venue is dark" control still means something. ADMIN_EVENT_DETAIL got its own token: one token resolving to two stores makes the gate unmodellable.
NOT REDDENED: ran only the two journeys whose fixture code I rewrote - events-guest-proposal and events-runsheet-print - both GREEN after the change. No other lane's journey was run.
SUITES: jest 110/110 suites, 2481/2481 tests. guard-proof all 7 arms held. fixture-divergence vs OkamAPI-ev-acceptgate 8eee00f7: 1 divergence over 12 anchored routes, pre-existing and Growth's, unchanged by this lane.
OPEN, NAMED: no /events route carries a divergence anchor, so none of these refusals is compared against a checkout - true before this lane too, now written at the foot of events.js. Anchoring the family (~40 refusals, 5 controllers) would report the fixture AHEAD of the integration tip, since the accept/decline gate exists only on lane/ev-accept-gate.
OPEN, NAMED: the reconcile truth model answers a hand-authored line's own figure for Manual/InvoiceRef sources and null otherwise. Derived from the backend's described behaviour, not read off the seam implementation. If the real seam answers null for InvoiceRef on an unwired deployment, no statement could ever be closed there - a product finding, worth one lane's look.
ARTIFACT NOT COMMITTED: artifacts/ is gitignored by the repo's own rule ("a record of a run, not source"). The file is on disk at the contract path; the tree carries the source that reproduces it in one command.
CONSTRAINTS: no container started, no migration authored, nothing pushed, no bulk edit of any translations file. Committed by pathspec, 4 files, local commit a1a1ec8. journey-artifact-store.test.js is green here (this checkout carries the name it hardcodes).
HARNESS FLAKE SEEN ONCE, not this lane's: a re-run on a just-released port died with ECONNREFUSED against its own fixture before step 1 (reuseExistingServer adopting a server on its way out). Re-ran on a fresh port pair, green. Worth a lane if it recurs.
DETAIL: lanes/L-JOURNEY-EVENTS/NOTES.md, with the mutation log, the sibling run, and a 28/28 wire-level rehearsal of the whole lifecycle.
END RETURN
```

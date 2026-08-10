RETURN: L-WF-OPLINK
brief: c740d443
verdict: built
evidence: artifacts/journeys/wf-operator-import-clock.playwright.json (11/11 steps passed, commit 3e811b2, 0 failed requests, 6 screenshots) in worktree ~/okam/web-wf-oplink, copied to lanes/L-WF-OPLINK/artifacts/journeys/ · branch lane/fe-wf-oplink, commit 3e811b2, not pushed · Jest 98 suites / 2282 tests, 5/5 browser journeys
log:
- Brief verified before building: endpoint 7 exists (WorkforceStaffController:178) and the client named it only in a comment. True.
- Branched lane/fe-wf-oplink off feature/restaurant-modules, then merged lane/fe-pos-clock locally (438e719) — the clock surface it needs is unmerged, so my lane must land with or after it.
- Roster now binds ImportPosOperators; new WorkforceOperatorImportPanel does it as a REVIEW: both sides named per line (operator #id + the person whose hours the punches become) before the call, and the permanence stated above the button. No unlink control — no endpoint clears OperatorId.
- The 403 is pre-empted: per operator, "Kan stemple – koblet til <navn>" vs "Kan ikke stemple – ingen kobling". The map costs one GET /staff/{id} per engagement (the summary carries no operatorId); ONE failed read makes it unknown, never shorter.
- Honest limits kept: an operator carrying a login is NOT promised a new person (the service attaches to the person that login maps to; nothing here can name it), and the receipt reloads the roster first so it names the person, not the guid.
- DEFECT FOUND BY MY OWN TESTS: normalizeOperatorId was Number(value) — Number(null) is 0, so every unlinked engagement (operatorId: null, most of any roster) read as bound to operator #0 and a null id would have posted as 0. Fixed, type checked before conversion.
- THREE DEFECTS FOUND BY LOOKING at the screenshots: two adjacent buttons both read "Avbryt" (now "Skjul kobling"); the employer field showed a raw id with no explanation (now carries the add-form's hint); "1 operatør(er)"/"1 kobling(er)" (now real singulars in no/en/de).
- page.clock DOES NOT WORK ON THIS REGISTER — recorded for the next lane: installed before the mode switch, pressing Stempling never put .pos-clock in the DOM; installed after, the punch produced no result panel. The journey waits out a real minute instead, hence test.setTimeout(5m).
- Fixture extended (world + api-server): staff rows now carry legalEmployerId/personState etc., new routes for endpoint 7, GET /staff/{id}, GET /attendance, and staff roles/terms (those two were 404ing into every artifact's failedRequests). The operator→staff link moved from a module constant into state so a reset undoes an import.
- Kari's seeded operator link now points at roster row staff-2 rather than an unrelated guid, so the register and the roster describe one world. pos-clock-punch re-run unchanged: 14/14, still shows Ola refused.
- HOST FINDING, outside my lane: the disk hit 0 bytes free mid-lane (writes failed with ENOSPC). Cleared ~/.npm/_cacache to get 9 GiB back; /System/Volumes/Data is still 99% full. Other lanes will hit this.
- Not done, and not mine: the roster TABLE still cannot show the link (WorkforceStaffSummary carries no operatorId) — it is on the engagement panel and the import receipt only. A backend field would remove the N detail reads.
- F-WF-CLOCK-UNLINKED clears_when is met by the capture: operator import → clock-in → clocked minutes on the attendance table, all in one run.
END RETURN

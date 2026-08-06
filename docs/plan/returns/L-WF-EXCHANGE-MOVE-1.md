RETURN: L-WF-EXCHANGE-MOVE
brief: 9806b632
verdict: built
evidence: OkamAPI-modules a5ff40f2 on lane/wf-exchange-move (worktree ~/okam/wt-wfexmove) · fact:wf.journeys now 13 (WebApi.Tests/Workforce/WORKFORCE-JOURNEY-MANIFEST.md, WFJ-11 VERIFIED-GREEN) · Workforce fast suite 625/2 skipped/0 failed
log:
Brief verified before building: award computed AffectedScheduleRevisionId + RequiresSuccessorRevision and wrote no schedule row; CreateDraftAsync already did successor numbering + copy-from-range. Shape as described.
AwardAsync now plans and stages the successor in its own commit: revision N+1 over the same range, copied verbatim (instants, offsets, breaks, notes, roles, the zone the week froze), only moved shifts renamed. Reachable through the existing GET /schedules?view=draft - pinned.
DEVIATION: one successor per affected published week, so the response carries SuccessorScheduleRevisionIds (list), not a singular id. Endpoint 41 accepts a direct swap whose counter shift is in another week; refusing that at award would strand an offer the worker surface accepts.
Refusals, all typed workforce.exchange-not-awardable: week already superseded (reachable, pinned); counter no longer published; commit-time revision-number race. That race previously had NO mapped catch - a second award on the same week would have been a 500. Added WorkforceDbViolations.IsRevisionNumberViolation + an interceptor test.
"Shift moved / deleted" is structurally unreachable here: a published assignment row cannot move or be cancelled, so the reachable form of that case IS the superseded refusal. The one guard no mutation could falsify (MovedCount==0) is now an InvalidOperationException, not a 409 nobody can trigger.
Awarding now stands behind workforce.publication (it writes into that stage); a refusal writes no schedule row and stays ungated.
Red-then-green, 8 mutations, each rebuilt fully (no stale --no-build): move not applied -> 3 red; published rows loaded tracked and rewritten -> 3 red incl. the byte-identical fingerprint; source = newest revision -> lineage red; head guard removed -> superseded refusal red; flag gate removed -> gate red; counter week dropped -> swap red; race catch removed -> raw DbUpdateException escapes; MovedCount guard removed -> ALL GREEN (hence the demotion above).
Byte-identical is asserted as a serialized fingerprint of every assignment field plus the publication's content hash and frozen SnapshotJson, before vs after - not "still present".
No migration, no new table, no new route, no new flag, no log call. C1/C2/C3/C4/C7 unaffected.
HANDOFF to L-WF-EXCHANGE-GRID: the notice copy is now under-informative rather than wrong - wfq_successor_lede/wfq_successor_award in translations/{no,de,en}.ts say "you must publish a new version of the week" without saying it is already prepared. successorNeed() in utils/workforce/requests-inbox.js should read SuccessorScheduleRevisionIds and link the manager to the minted draft.
Not run: the SQL tier (another lane holds the slot). The revision-numbering index is a plain unique index, so SQLite enforces it identically; the filtered one-award index is unchanged by this lane.
END RETURN

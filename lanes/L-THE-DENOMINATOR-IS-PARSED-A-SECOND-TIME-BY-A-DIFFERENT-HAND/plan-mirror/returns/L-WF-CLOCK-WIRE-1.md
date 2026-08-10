```
RETURN: L-WF-CLOCK-WIRE
brief: 611bf0f5
verdict: built
evidence: OkamAPI lane/wf-clock-wire f14c91ec (base feature/restaurant-modules 3579bbbc); container-free tier 4377/0/12 vs base 4369/0/12
log:
All four gaps CONFIRMED as stated; none overstated. Gap 4 was UNDERSTATED - see below.
Base: feature/restaurant-modules 3579bbbc, the tip newest lanes branch from. Own worktree /Users/svendaneel/okam/wt-wfclockwire.
Wire proof: WebApi.Tests/Wire/WorkforcePosClockWireTests.cs, 6 tests, each refusal asserted beside a punch that worked through the same route in one world.
Non-vacuity: M1 missing-punch->Open RED; M2 cross-engagement reverted RED; M3 drop 409 openedUtc RED; M3b drop its UTC kind RED; M4 clockedIn=false RED. Each restored by edit + forced rebuild, assembly mtime moved every time (1785748387->749088).
UNDERSTATED: gap 4 is not only "no read" - the personalliste ALSO carries no staff id, so no client could have joined a read to a punch. Both halves closed by resolving the operator link.
EXTRA DEFECT 1 (fixed, in scope): an instant read from the DB serialized without its UTC designator while the same instant folded in memory kept it - both providers return Unspecified kind. Same field, same endpoint, two answers by branch; 2h out in Oslo summer on a payroll instant. Affects SQL Server too, not a SQLite artifact.
EXTRA DEFECT 2 (NOT fixed, out of brief): workforce.pos-operator-session-invalid (403) is UNREACHABLE on both POS endpoints. The real OperatorSessionResolver throws OperatorSessionException, which is deliberately not an AppException, and middleware maps it to 401 before the controller catch. The service-tier fake throws AppException, so PosClockSurfaceTests proves a branch production never takes. Pinned as measured (401 + message body vs bare 401). Needs a contract ruling: 401-with-code or 403.
C3 REACHABILITY: nothing consumes the new read - and nothing consumes POST clock-events either. Grep of Web-modules + modul finds one workforce client (personnel-list, manager route). The till register screen does not exist in any repo. Not a new orphan; the whole POS clock surface has no client.
C1: no append-only row edited or purged. C4: engagement resolved via WorkforceStaffMember.OperatorId, never a name. C7: nothing logged; the read takes no OD-2 assertion precisely so a GET cannot put one in a query string.
No migration authored. No container started. Nothing pushed.
L-WF-BOOTSTRAP dependency NOT hit: the wire world already seeds the operator-linked engagement.
Fixtures: pos-clock-event-response.json regenerated, pos-clock-event-response-refused.json + pos-clock-state.json added, manifest.json corrected - it documented the cross-engagement null rule the code did not implement.
END RETURN
```

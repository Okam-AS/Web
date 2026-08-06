```
RETURN: L-TRAIN-EVID-LAND
brief: ceb16967
verdict: built
evidence: OkamAPI-modules/artifacts/tests/f8b3a30f2ecfaf00beab1e903dd68193fbc8eca2/RUN.md
log:
lane/train-evidence-endpoint is an ancestor of feature/restaurant-modules; tip 968fd273.
Merge b84b947b took ZERO conflicts. The brief expected several; the target had not touched 16 of the lane's 17 files since the merge-base, and Program.cs auto-merged. No test file was hand-resolved, so nothing could be silently dropped. Counts (lane side = merged side): ReachabilitySweep 11, ContentHashIntegrity 9+3 rows, EvidenceRead 5 new, InspectorPack 11, TenantIsolation 18+4 rows, TrainingWire 23 with 0 skipped (base: 21 + 1 skipped).
RECEIPT f8b3a30f, clean detached worktree, Database!=SqlServer: 4313 run / 4304 passed / 0 failed / 9 skipped, exit 0 (baa5e38a: 4302/4292/10). Training svc 209, TrainingWire 23, Modules 107, Kassa 806. SQL tier NOT run — slot held elsewhere; it still has no recorded run at any SHA.
HANDOVER CONFIRMED, not trusted: I replayed both base reverse pins verbatim at the merged tip. Both fail, and the sole delta in either is "GET /training/stores/{storeId:int}/evidence -> TrainingController.GetEvidence".
HASH CONFIRMED: TrainingWorld computes ContentHash via TrainingContentHash; the golden's digest is the real SHA-256 of the seeded content (reproduced independently); the wire test re-derives it from the SERVED pages/quiz/threshold; Broken and Unresolvable are both reachable, so Intact is not vacuous.
TWO DEFECTS FOUND AND FIXED WHILE LANDING.
f8b3a30f — TrainingEvidenceService converted a zone itself (ConvertTimeFromUtc(SpecifyKind(...))): green per lane, RED at the tip on KassaBusinessDateCallSiteTests, the D-01 pin Margin and Meals were each caught by. The seam exposed no wall-clock member, so I added KassaBusinessDate.LocalWallClockOf and called it; rendered values unchanged, golden did not move.
c87adb9d — the golden's "reproduce this hash yourself" recipe used length prefixes 48/26 for 49/27-character fields, so it reproduced a different digest than the golden asserts. Comment-only; came in with 24f14e31, not with this lane.
OPEN 1: DisplayName/PersonOnFile resolve with NO store predicate — deliberate and pinned, but any store admin holding a PersonRef can turn it into a person's name.
OPEN 2: no operator surface links to the route, so C5 acceptance is unavailable — the capability answers over HTTP but nobody can walk it.
END RETURN
```

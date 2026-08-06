```
RETURN: L-DATED-TEST-OUTPUT
brief: 4091f761
verdict: built
evidence: lanes/L-DATED-TEST-OUTPUT/evidence.md
log:
Writer: WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs WriteCapture() rewrote tracked
artifacts/journeys/ev-dietary/run-sheet.{md,json} every run - the repo's only unconditional write into a
tracked path. Dated 5 ways: capturedAtUtc, 6 TimeProvider stamps, 2 Guid.NewGuid(), "(stated yyyy-MM-dd)".
Fix: PATH MOVE, path unchanged - .gitignore gains artifacts/journeys/, both files git rm'd. NOT the clock:
the JSON carries GUIDs no clock stabilises, and the dates come off the wire host's shared
TimeProvider.System that two Meals wire suites document relying on. Web-modules/.gitignore already stated
this rule - the backend was the outlier; artifacts/tests/ stays tracked.
Pin: TestOutputContainmentTests resolves the destination of every file-write site in ALL repo C# and asks
git check-ignore - not name-matched, unresolvable = red. Census 12 sites, 3 put to git, 9 allowlisted with
reasons; blind spots stated in evidence. Mutations 4/4 red-then-green: ignore rule removed (reds naming
both original files), a dated artifact elsewhere under another name, an unresolvable destination, git clean.
Tier: backend 4631/0/12 (Database!=SqlServer, no container, no --no-build) -> git status --porcelain EMPTY,
0 lines, capture still written dated 2026-08-04 and ignored; frontend jest 112/2583 -> 0 entries changed.
THE RESTORE LINE CAN COME OUT OF THE BRIEF TEMPLATE. 5 tracked-modified Web-modules files are other lanes'
(listed in evidence, untouched). Commit b10eb11c on lane/dated-test-output off 569887a5, unpushed.
END RETURN
```

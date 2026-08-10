```
RETURN: L-CORS-FOLLOWUPS
brief: 61b3215b
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-CORS-FOLLOWUPS/evidence.md
log:
Backend built in worktree /Users/svendaneel/okam/OkamAPI-corscred on a NEW branch lane/cors-followups @ 524289b9, parented on lane/cors-credentialed-origin @ edbb7dea.
That shared ref was NOT moved and L-SECURITY-LAND's merge is untouched; 524289b9 is a descendant of edbb7dea, so landing edbb7dea alone silently drops this filter.
AddOkamCors now takes IHostEnvironment; WithoutLoopbackOutsideDevelopment drops provably-loopback origins before WithOrigins when !IsDevelopment, skipping quietly like the resolver. Program.cs:96 passes builder.Environment.
Applied to the MCP policy as well as the credentialed one so a future credentialed policy inherits it. Named consequence: the MCP inspector cannot drive a non-Development host from localhost; no non-Development settings file names such an origin today.
New WebApi.Tests/OkamCorsLoopbackOriginTests.cs (4 tests) asserts WHOLE resolved CorsPolicy.Origins lists off the built CorsOptions, never a settings file - the mistake F-CORS-ORIGINS-BY-INDEX records.
Two worlds feed identical in-memory config; the environment name is the only variable, so the filtered path cannot be skipped by a harness precondition.
Mutation, both directions: filter deleted -> Failed 2 (both Outside_development cases); IsDevelopment check deleted -> Failed 1 (the Development case); restored -> Passed 4.
Restores were editor writes, source mtime confirmed newer than bin/Debug/net8.0/WebApi.dll before the green run, --no-build never used.
Full container-free tier after restore: Passed 4491, Failed 0, Skipped 12, Total 4503, 5m05s. No container started or touched. No failure that did not reproduce.
WireHost.cs:134 does UseEnvironment(Development), so the wire tier can never exercise this filter; the unit tier is the only proof. Recorded so the green wire CORS suite is not later misread as coverage.
Frontend: growth-guest-client.js header and pages/preferences/communications.vue script header now state that BOTH the named policy and same-site serving are required and neither substitutes for the other, in the backend comment's own wording.
The stale premise that the code builds CORS with AllowAnyOrigin is gone from both. eslint over both edited files: clean.
Frontend left UNCOMMITTED by design: Web-modules is on feature/restaurant-modules, which this lane may not move, and it already carries another lane's dirty test/e2e/journeys/admin-refusal-worker.spec.js. Diff preserved at lanes/L-CORS-FOLLOWUPS/frontend-comments.diff.
Two artifacts under artifacts/journeys/ev-dietary that the suite run dirtied (date churn only) were restored; nothing else in either checkout was cleaned.
Residue, not fixed: test/e2e/journeys/growth-privacy-queue.spec.js:283-294 repeats the AllowAnyOrigin premise in a journey NOTE string; outside this lane's exit criteria, changes no result, left alone.
END RETURN
```

```
RETURN: L-WORLD-STAMP-WINDOWS
brief: 35096b21
verdict: built
evidence: lanes/L-WORLD-STAMP-WINDOWS/evidence.md
log:
Commit 997936ad on refs/lanes/L-WORLD-STAMP-WINDOWS (18 files, my pathspecs only, reachability verified).
Both windows closed in world-stamp.js, NOT in live-world.sh: a guard in a script nobody runs is how both survived review.
W1 `builtFrom` is now REQUIRED - the token `world-stamp.js built <repo>` prints when the binary is built; the writer recomputes it and refuses if the checkout moved. Required so a caller cannot drop the guard.
W1 live-world.sh also dies if the commit moved WHILE dotnet build ran (sha only - a build writes obj/bin and a dirty flip is not a head moving). Strictness by consequence: that kills the world, the finer check only loses the stamp.
W2 the writer resolves the process HOLDING THE SOCKET and refuses unless it is `launchedPid` or a descendant. Reader still never touches the socket; resolution happens once, at write time, by the party that built the world.
Windows opened deliberately, not asserted from reading: a real second commit lands in a real checkout (W1), and a real child process holds a real socket under a real launcher (W2).
W2's test then CONSTRUCTS the launcher-shaped stamp by hand after killing the server and shows it still verifies - the defect demonstrated beside the guard.
MUTATION PROOF: removing either guard reds its test (3 tests for W1, 4 for W2); baseline green. Operates on a temp COPY via a new `WORLD_STAMP_MODULE` affordance, so no shared file was edited.
New guard `npm run test:e2e:live-world-stamp` 12/12: 6 structural (the script still hands over both arguments, token read AFTER dotnet build) + 6 behavioural against the real CLI with a bash launcher/child pair.
Regression: jest 2920 passed / 0 failed; build-provenance-proof 5/5 arms in real Chromium; banner check 8/8.
RESIDUAL, now recorded in BOTH directions in the header - recording only the safe one is what made it read as a bound and is how W2 survived. Open: stamped process alive but no longer serving. Closing it needs read-time socket reads, the source this file exists to avoid.
Also fixed, from the same review: `host === '::1'` dead in two files (Node returns `'[::1]'`) - one shared `isLoopbackHost` now; stamp written by rename. STAMP_VERSION -> 2, so v1 stamps written by the fallible writer are refused.
NOT PROVED: live-world.sh never ran - no container granted. Proved instead is the CLI contract it depends on and that the script still speaks it.
FOR YOU: the `json:$.backendBuild.source` probe still needs the handover step you flagged - equal-rank canonical does not displace, so it can keep reading `process:127.0.0.1:5961` against correct code. Untouched here; not fixable from this lane.
PRE-EXISTING, not caused here: `npx jest` shows 5 failed SUITES / 0 failed tests - other lanes' Playwright specs under lanes/** that jest collects (jest.config ignores test/e2e/ but not lanes/).
END RETURN
```

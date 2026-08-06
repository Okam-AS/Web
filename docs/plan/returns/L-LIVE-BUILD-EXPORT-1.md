```
RETURN: L-LIVE-BUILD-EXPORT
brief: e0181dc6
verdict: built
evidence: lanes/L-LIVE-BUILD-EXPORT/evidence.md (commit 94fa256, 6 files by pathspec) + lanes/L-LIVE-BUILD-EXPORT/journey-artifacts/arm-1.provenance-probe.playwright.json
log:
NOT already done. The mechanism half existed (E2E_API_BUILD, exported by live-world.sh); the exit did not. Of the three live artifacts on the branch, two carry backendBuild null and the third named its build via process:127.0.0.1:5961 -- lsof on the port, the source the exit rules out.
BUILT test/e2e/support/world-stamp.js: live-world.sh, once the world it built answers /health, writes artifacts/world/live/<host>-<port>.json naming the checkout AND the process it started. resolveBackendBuild reads it first; the declared/checkout/port/swagger sources follow unchanged.
A stamp is believed only while its pid is alive with the start time it was stamped with (pid reuse), only for a loopback origin, and only when its own origin field matches the one asked about. Otherwise refused, never repaired. It can lose its answer; it cannot invent a wrong one. Nothing reads the socket.
When E2E_API_BUILD disagrees, the stamp wins and backendBuild.detail records the declaration it overrode -- the stale-copied-command case, which is the F-PROBE-ROOT-WRONG-WORLD shape.
THE ARTIFACT: test/e2e/scripts/build-provenance-proof.js drives a real Chromium against the real journey.js/artifact-store.js/world-stamp.js (sha256 printed) in a throwaway tree. 5/5 arms, exit 0, every artifact backend=live status=passed.
DISCRIMINATION: the stand-in API is served from this checkout, so the port would answer Web-modules@22f2108+dirty in every arm. Stamped ALPHA the artifact says okamapi-alpha@2448954; stamped BETA it says okamapi-beta@1508522 and files under a different key.
ARM 3 is what makes 1 and 2 mean anything: invalidate the stamp and the artifact changes to the port's WRONG answer. A field that survived arm 3 unchanged would prove nothing.
MUTATIONS, restored after each: stamp never read 4 red; declaration outranks stamp again 2; no liveness check 2; pid reuse accepted 1; origin field unchecked 1. Restored 38/38.
SUITES: jest 111 suites / 2550 tests green. eslint clean. bash -n on live-world.sh clean. The journey suite was NOT re-run.
PROBE, if this ends in one: PROBE live.build.source file artifacts/journeys/workforce-flag-lever.playwright.json json:$.backendBuild.source -- extractor json:, never exists. Today it reads process:127.0.0.1:5961 and must read stamp:... for a world stood up after this.
GITIGNORE LINE: the code and this lane dir survive a clone; the stamp file itself lives under artifacts/ and does not, deliberately -- a stamp describes a process on THIS machine. Lane dir uses journey-artifacts/ because .gitignore:98 artifacts/ is unanchored and silently swallows a lane folder of that name.
RESIDUAL 1: live-world.sh was NOT executed end to end (needs a SQL container; none started, none touched). Its stamp call invokes the module the proof exercises.
RESIDUAL 2: $! in that script is the dotnet run LAUNCHER, not the WebApi child holding the socket. A dead launcher with a live child reads stale and falls back -- conservative, documented.
PRE-EXISTING, not chased: the Web-modules@ basename pin reds in a differently-named worktree; two new arms inherit it. Another lane was running admin-refusal-worker at 00:49Z and holds that spec dirty; untouched.
END RETURN
```

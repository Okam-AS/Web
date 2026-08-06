```
RETURN: L-CANNOT-BE-REBUILT-CENSUS
brief: 74b82239
verdict: built
evidence: lanes/L-CANNOT-BE-REBUILT-CENSUS/finding.md
log:
A clone gets main. The program is on NO remote: FE e34977ac +135, candidate f40fdf36 +240, BE 8e2b57de +507. Gate 1 = `git checkout feature/restaurant-modules` -> pathspec did not match, both repos.
Past gate 1: a file:// clone of the branch, which gives more than a real clone, so failures hold. Submodule = "not our ref 1bcab0b6", exit 128; NEW: main's pin 2a2e7b3e inits fine, Core is not broken.
CORRECTION: npm ci SUCCEEDS on a fresh clone (2611 pkgs, node 22 and 24, exit 0). The repository-wide claim traces to plan.md:13468, an inference the same passage correctly declined to test.
The real dependency break is narrower and still owner-only: any lock-free resolution = ETARGET, nothing matches @nuxt/cli-edge@* (all versions prerelease). The lock can never be regenerated.
FOURTH THING: `npm test` is red on any faithful clone - journey-artifact-store.test.js:295,457 assert the checkout's DIRECTORY NAME /^Web-modules@/. Renamed to Web-modules: 38/38 pass; back: red.
Also red: `npm run test:e2e` 1/22 - config:142 excludes @fixture in live mode and nothing in fixture mode, so a @live journey meets a fixture serving 2 of its 11 rules. No CI runs either suite.
docs/plan (826 files, 14M) is on NO branch: 0 tracked, 428 untracked, not ignored. lanes/: 129 tracked, 1304 untracked. BE global.json pins SDK 8.0.110, no rollForward - 8.0.4xx machines get nothing.
CORRECTION: the from-empty chain has NO duplicate column - 127 migrations scripted, Orders.TableId once at chain.sql:3626; the double-add is on origin/rebrand. Not applied live - no SQL slot.
Owner-only: 3 pushes (Web branch, Core 1bcab0b6, OkamAPI branch), 1 ruling (@nuxt/cli-edge), 1 decision (commit docs/plan?). In-repo fixes named and deliberately untouched: FE-7, FE-8, FE-9, BE-3.
END RETURN
```

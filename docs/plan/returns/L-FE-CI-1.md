```
RETURN: L-FE-CI
brief: ed06d3cb
verdict: built
evidence: fact:fe.ci
log:
lane/fe-ci @ 36ce9ae off ce77727, committed not pushed, worktree /Users/svendaneel/okam/web-fe-ci.
.github/workflows/nuxtjs.yml gains a `test` job: push on main|feature/**|lane/** and every pull_request. `build` now `needs: test` and is pinned to main, so a red suite stops the deploy and a feature push runs the gate without deploying. Concurrency keyed on the ref, not the constant "pages", so a feature suite cannot queue in front of a prod deploy.
Report at artifacts/tests/frontend/jest.json — the path fe.tests/fe.tests.failed probe — uploaded with `if: always()`, because artifacts/ is gitignored and a failing run must still leave evidence of how it failed.
REHEARSED, NOT DECLARED. The job's `run:` steps executed verbatim on Node 22.23.1 (what node-version-file selects) from a clean worktree whose node_modules came from `npm ci` alone. Captured console: lanes/L-FE-CI/rehearsal.txt.
FOUND — `mkdir -p` is load-bearing and fails in the worst way without it: jest returned 91/91 suites and 2127/2127 tests GREEN, then threw ENOENT writing the report and exited 1. A red job, no artifact, every assertion passing in the log above the error. `jest --outputFile` calls writeFileSync with no mkdir (@jest/core/build/runJest.js).
FOUND — `submodules: true` is NOT load-bearing: same tree with core/ empty is still 91 suites / 2127 green, because the suites reach ~/core/... only through stand-ins they define. Kept anyway (23 real importers under components/pages/utils/store/plugins); the file says so rather than claiming it is required.
Job as written: exit 0, 91 suites, 2127 passed, artifact written.
Probes via the plan's own run_probe against the COMMITTED blob: fe.ci ok=True present · fe.tests 2127 · fe.tests.failed 0.
actionlint 1.7.12: 4 findings on the new file, the identical 4 at the same offsets on the old one (pre-existing SC2086 in "Detect package manager", untouched) — zero new.
fe.ci still reads unconf in docs/plan: the probe reads /Users/svendaneel/okam/Web-modules and lane/fe-ci is unmerged. Sequence is merge → `plan refresh` → `plan built L-FE-CI --evidence fact:fe.ci`; before the refresh that evidence is refused as "fact:fe.ci is `unconf`, not `ok`".
The exit's second half — "a push to a feature branch produces the jest artifact" — is not observable from here: I was told to commit and not push, and there is no `act` and no container slot. Everything short of the push is measured above; the push itself is the only step left.
Untouched: translations/*.ts, playwright.config.js, every port. The e2e journeys are deliberately NOT in this job — this gate is Jest only, and wiring a browser job I could not run here is the failure mode this lane exists to stop.
Noted, not changed: the Pages build still pins node "16" while engines.node/.nvmrc say 22. Real inconsistency, but in the deploy path, which this lane did not test.
END RETURN
```

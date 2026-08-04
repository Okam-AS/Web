# L-LIVE-BUILD-EXPORT — a live artifact names the API checkout that served it, without asking the port

Exit: *a live journey artifact records the API checkout that served it, without the harness having to
interrogate the port.*

## What was already true on 2026-08-04, and what was not

`L-ARTIFACT-PROVENANCE` had already built `backendBuild` and its four sources, and `live-world.sh` had
since been given `export E2E_API_BUILD` plus a run command with the value filled in. So the MECHANISM
for naming a build existed. The EXIT did not hold, on either half:

| live artifact standing on the branch | `backendBuild` | source |
|---|---|---|
| `events-deposit-precondition.playwright.json` | `null` | — |
| `workforce-schedule-publish.playwright.json` | `null` | — |
| `workforce-flag-lever.playwright.json` | `wt-lwr-api@3579bbb` | **`process:127.0.0.1:5961`** |

One of three named a build, and it named it by running `lsof` on the port and asking whoever held it
what directory they were running from — the one source the exit criterion rules out, and the one that
answers confidently and wrongly when a stale process holds the socket. The remaining route,
`E2E_API_BUILD`, is a string in the RUNNER's shell that nothing checks against the origin the run is
pointed at: a command copied from the world that was up an hour ago names that world.

## The change

**`test/e2e/support/world-stamp.js` (new).** The script that BUILDS the world writes down, at the
moment the world answered `/health`, which checkout it built from and which process it started:

    artifacts/world/live/<host>-<port>.json
    { "origin": "http://127.0.0.1:5951",
      "build": { "id": "OkamAPI@<sha>[+dirty]", "short": "<sha7>[-dirty]", "branch": "…" },
      "pid": 41234, "processStartedAt": "Mon Aug  4 02:31:07 2026",
      "stampedAtUtc": "…", "writtenBy": "test/e2e/scripts/live-world.sh" }

A stamp is believed only while the process it names is still running AND still has the start time it
had when stamped (pid reuse), and only for a loopback origin, and only when its own `origin` field
matches the origin being asked about. Otherwise it is REFUSED — not repaired, not trusted anyway — and
the reader falls through to the sources below it. The stamp can lose its answer; it cannot invent a
wrong one.

That is not the port in a different costume: nothing reads the socket, the identity comes from the
script that did the build, and the pid check only asks whether the world that script started is still
running. The two differ exactly where it matters — a DIFFERENT process on the same port. `lsof` answers
about that process; a stamp whose own process is dead answers nothing.

**`test/e2e/support/artifact-store.js`.** `resolveBackendBuild` consults the stamp first. When
`E2E_API_BUILD` is also set and AGREES, the artifact says so; when it DISAGREES the stamp wins and
`detail` records the declaration it overrode. Declaration → checkout → port → swagger still follow,
unchanged, for every case the stamp cannot cover (a runner on another machine, a world nobody stamped).

**`test/e2e/scripts/live-world.sh`.** Clears the stamp for its origin when it kills the previous API,
and writes a new one once the world it built is healthy. A stamp failure warns and does not tear down a
good world. The banner now shows the stamp path and `node test/e2e/support/world-stamp.js show <origin>`.

## The artifact — the exit, demonstrated

`test/e2e/scripts/build-provenance-proof.js` (new, repeatable) drives a real Playwright child against a
real Chromium, with the REAL `journey.js` / `artifact-store.js` / `world-stamp.js` copied into a
throwaway checkout-shaped tree (sha256 of each printed), a stand-in live API and a stand-in app. Full
transcript: `proof.txt`. Artifacts: `journey-artifacts/arm-<n>.provenance-probe.playwright.json` —
named `journey-artifacts/` and not `artifacts/` because `.gitignore:98` is `artifacts/`, unanchored, so
a lane directory spelling it that way is silently uncommittable. Sixteen files in this repo are
force-added past that rule; renaming respects it instead.

Every arm is arranged so the WRONG ANSWER IS AVAILABLE: the stand-in API is served by the proof process
itself, whose cwd is this Web-modules checkout, so the port — if asked — answers
`Web-modules@22f2108+dirty`, the exact frontend/backend confusion `backendBuild` exists to end.

| arm | world stamp | shell | artifact `backendBuild.id` | `source` |
|---|---|---|---|---|
| 1 | ALPHA | — | `okamapi-alpha@2448954…` | `stamp:artifacts/world/live/127-0-0-1-62617.json` |
| 2 | BETA | — | `okamapi-beta@1508522…` | `stamp:…` |
| 3 | ALPHA, **invalidated** | — | `Web-modules@22f2108+dirty` | `process:127.0.0.1:62617` |
| 4 | ALPHA | declares BETA | `okamapi-alpha@2448954…` (+ `detail` names what it overrode) | `stamp:…` |
| 5 | none | declares ALPHA | `okamapi-alpha@2448954…` | `env:E2E_API_BUILD` |

All five held; each artifact is `"backend": "live"`, `"status": "passed"`, exit 0.

* **Arm 2 is the discrimination**: the same origin, the same everything, a different checkout — and the
  recorded value changes, and the artifact is filed under a different key (`live-<port>-2448954` vs
  `live-<port>-1508522`).
* **Arm 3 is what makes 1 and 2 mean anything**: invalidate the stamp and the artifact changes to the
  port's answer, which is WRONG. A field that survived that arm unchanged would have been proving
  nothing.

## Mutations (the tests can go red)

`npx jest test/journey-artifact-store.test.js` — 38 passed. Then, one at a time, with the tree restored
after each (`Tests:` line quoted):

| mutant | reds |
|---|---|
| A `resolveBackendBuild` never reads the stamp | 4 failed, 33 passed |
| B a declared build outranks the stamp again | 2 failed, 35 passed |
| C liveness not checked (a dead world's stamp believed) | 2 failed, 35 passed |
| D pid reuse accepted (alive is enough) | 1 failed, 36 passed |
| E the stamp's own `origin` field not checked | 1 failed, 36 passed |
| restored | 38 passed |

The new tests use REAL git checkouts and a REAL listening process rather than mocks, for the reason the
existing port test gives: a mock would only assert that the parser parses what the mock was told to say.

## If this lane ends in a probe

The value that can be wrong is `backendBuild.source` / `backendBuild.id` on a live journey artifact.

    PROBE  live.build.source  file  artifacts/journeys/workforce-flag-lever.playwright.json  json:$.backendBuild.source

`json:` is the extractor — never `exists`. It reads a string that today would come back
`process:127.0.0.1:5961` (the port) and must come back `stamp:artifacts/world/live/…` for a world stood
up after this change. `$.backendBuild.id` is the companion: it is `null` on two of the three live
artifacts standing now, so both facts are falsifiable against the branch as it is.

## Which side of the gitignore line this falls on

* **Survives a clone (tracked, committed by pathspec):** `test/e2e/support/world-stamp.js`,
  `test/e2e/support/artifact-store.js`, `test/e2e/support/journey.js`,
  `test/e2e/scripts/live-world.sh`, `test/e2e/scripts/build-provenance-proof.js`,
  `test/journey-artifact-store.test.js`, and this lane directory — `evidence.md`, `proof.txt` and the
  five artifacts under `journey-artifacts/`.
* **Does NOT survive a clone (gitignored by design):** everything under the repo's own `artifacts/`,
  including the stamp file itself. That is deliberate and correct — a stamp describes a process on THIS
  machine, and one that outlived the machine would be the lie the mechanism exists to prevent. The
  stamps this lane's proof wrote lived and died inside a temp harness; **the repo's own
  `artifacts/world/` was not touched** (it still holds only `WORLD.json`, from `scripts/worldstamp`).

## Residuals, said plainly

1. **`live-world.sh` was NOT executed.** It needs a SQL container and the migration chain, and this lane
   was told to start no container. Its stamp call is `bash -n` clean and invokes the same module the
   proof exercises, but the END-TO-END path (real world → stamp → real journey) is unrun. The first
   live world stood up after this lands proves it, and `world-stamp.js show <origin>` says so in a line.
2. **`$!` is the `dotnet run` LAUNCHER**, not the `WebApi` child that holds the socket (step 1 of
   `live-world.sh` kills by port for exactly this reason). A launcher that dies while its child keeps
   serving makes the stamp read stale and the run falls back. Conservative, and documented in the
   module header.
3. **Pre-existing, not chased:** `test/journey-artifact-store.test.js` pins the checkout BASENAME
   (`/^Web-modules@…/`) and therefore reds in a differently-named worktree. Two of the tests added here
   inherit that pin (arms that assert the port's answer). Same defect, same fix, not this lane's.
4. The journey suite was NOT re-run. One journey is known red at the tip
   (`growth-newsletter-send-gate`, `F-GR-SEND-GATE-JOURNEY-RED`) and reddening other lanes' evidence
   before an acceptance walk is not this lane's call.

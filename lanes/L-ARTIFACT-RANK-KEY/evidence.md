# L-ARTIFACT-RANK-KEY — what was already true, what was built, what was proven

Ports used: **3094** (web) / **4094** (fixture). No container started, none touched. No migration
authored. No live world stood up (Docker is out of bounds for this lane), so no live journey was run.

## 1. The base, measured in a clean checkout before anything was edited

`feature/restaurant-modules` at `61a76ef`, tracked tree clean (only untracked lane directories).

| exit clause | state at base | verdict |
|---|---|---|
| (a) an artifact cannot be displaced by a lower-ranked later run | `test/e2e/support/artifact-store.js` exists and ranks live>fixture, passed>failed>running, identified>unidentified; `test/journey-artifact-store.test.js` 18/18 green in this checkout | **ALREADY LANDED** by `L-ARTIFACT-PROVENANCE` (commit `533aea4`). Not rebuilt. |
| (b) every artifact records which backend build answered it | 22 artifacts under `artifacts/journeys/`; exactly **one** (`workforce-flag-lever`) carries a `backendBuild.id`. 19 are fixture runs, for which the field was `null` **by design**; 2 are live runs filed `-unidentified` | **OPEN** |
| (c) the three displaced live journeys are restored | `workforce-flag-lever` live/passed/`wt-lwr-api@3579bbb`, `workforce-schedule-publish` live/passed, `events-deposit-precondition` live/passed — all three with real steps and every referenced screenshot on disk | **ALREADY TRUE**, and not by this lane. Other lanes re-ran them on 2026-08-02; `L-ARTIFACT-PROVENANCE` recorded the same staleness in the brief it was given. **Nothing was fabricated and nothing was re-run to manufacture a restoration.** |

The test file the constraint warned about — `test/journey-artifact-store.test.js` — was read line by line
before anything else. Its checkout-name dependency is `expect(build.id).toMatch(/^Web-modules@…/)` in the
port-holder test. This checkout **is** named `Web-modules`, so it is green here; the red is real in a
differently-named worktree and is nothing but that. It was not the cover for any other failure.

## 2. What was built

Scoped to (b) plus the one hole in (a) that the brief said had landed in practice today.

### The one line, in the script two other lanes are in — `test/e2e/scripts/live-world.sh`

`L-ARTIFACT-PROVENANCE` named it and did not edit the script. It is now in:

- `API_BUILD="$(basename "$OKAM_API_REPO")@$(git rev-parse HEAD)"`, with `+dirty` appended when the
  API checkout is dirty, computed right after `OKAM_API_REPO` is validated.
- Printed in the world banner (`build   …`) and **carried into all three run commands the banner
  prints**, plus the usage header. A journey run against a world this script built now identifies its
  backend without asking `lsof` who holds the port.
- `+dirty` is carried on purpose: a dirty tree is not the commit it sits on, and the store puts this
  token in the filename.

**EXTENDED, not forked.** `test/e2e/scripts/guard-proof.js` (L-JOURNEY-GUARD-FAIL) and
`refusal-shapes.js` / `fixture-divergence.js` (L-FIXTURE-DIVERGENCE) were read first. None of the three
touches `live-world.sh`; `guard-proof.js` is the one with real coupling — it copies `journey.js` and
`artifact-store.js` into a temp harness and refuses to report success if the exact statement
`if (wrongWorld) { throw new Error(error); }` is no longer in `journey.js`. That statement is untouched
and the proof was run (below). No new script was created and nothing was duplicated under a new name.

### The fixture answers "which build?" about itself — `artifact-store.fixtureBuild`, `journey.js`

`backendBuild` was `null` for every fixture run, deliberately: resolving it would put the frontend's
commit in a field a reader takes for the API's. The danger is real; silence was the wrong remedy. It
left **19 of 22** artifacts unable to answer the clause at all.

The remedy is the name. A fixture run now records
`{"id":"fixture@<sha>","source":"fixture:test/e2e/fixture/api-server.js","detail":"the in-repo fixture
backend, not an API build (branch …)"}` — never `<repo>@<sha>`, which is what would read as an API claim.

**It changes no ordering**, and that is pinned: `backend` is compared before identity, so live still
outranks fixture whatever either can name, and two fixture runs share one key so they are the same
lineage and rank is never consulted between them.

### `+dirty` survives into the key — `shortOfBuild`

`buildFromCheckout` marked a dirty tree in its own `short`; `shortOfBuild` (the declared-`E2E_API_BUILD`
route, which `live-world.sh` now uses) threw it away. So the same tree keyed two different ways
depending on the route, and — worse — **a clean and a dirty build at one commit keyed identically**,
which is the exact collision the build token is in the filename to prevent.

### The one path by which the store still destroyed evidence — preservation

A run of the **same backend** takes the canonical slot unconditionally. That is deliberate and has to
stay: a world that has started failing must be able to say so, and the provisional `running` record
that stops an interrupted run leaving a stale pass behind is the weakest record there is. Both would be
refused by a pure ranking, and refusing them brings back the defect the store was built to end.

But it also overwrites its own `runs/` file, so the stronger record was **gone from disk entirely** and
survived only as a summary line in the ledger. That is what happened to `growth-newsletter-send-gate` on
2026-08-03 (`F-GR-SEND-GATE-JOURNEY-RED`): the app shell never settled, the run failed before reaching a
newsletter route, and the passing record it replaced cannot now be read anywhere.

The displacement stays. **The loss is closed.** Before a run overwrites its own lineage's record with a
strictly weaker one, the displaced record is copied whole to
`runs/<name>.<backendKey>.superseded.playwright.json`, and the incoming record names it in
`artifact.supersedes` — as does its ledger line. That file only ever moves **up**, so a red re-run, a
second red re-run and a killed re-run cannot erase the pass by attrition.

A reader joining on the canonical path therefore finds what is true now **and**, in the same file, that
a stronger run of the same world exists and exactly where to read it. Neither fact is destroyed by the
other, which is the point: an evidence store that argues against itself is worse than none.

## 3. Proof

### Unit, with mutants — 26 tests (18 inherited, 8 added)

`lanes/L-ARTIFACT-RANK-KEY/mutants/run.js`, output in `mutants/mutation-report.txt`:

```
pristine   Tests: 26 passed, 26 total
mutant E   Tests: 3 failed, 23 passed   the displaced stronger record is destroyed again
mutant F   Tests: 1 failed, 25 passed   the kept file is overwritten by whatever displaced last
mutant G   Tests: 1 failed, 25 passed   the fixture goes back to answering null about its own build
mutant H   Tests: 1 failed, 25 passed   a dirty tree keys identically to the clean commit it sits on
restored   Tests: 26 passed, 26 total
```

Every new guard kills at least one test when removed. The harness reads the pristine source from the
file itself and restores it on exit — no checked-in copy of a source file, which would be a duplicate
that drifts.

The harness's own first run reported `(no summary)` for pristine **and** for every mutant, because jest
prints its summary on stderr and only stdout was read: a comparison with nothing on one side of it,
i.e. the twenty-first non-failing shape, caught by the harness whose whole subject is that shape. Fixed
before any number in this file was believed.

### In the wild — the displacement attempted, and a legitimate replacement accepted

**REFUSED.** `artifacts/journeys/workforce-flag-lever.playwright.json` held a **live pass** identified as
`wt-lwr-api@3579bbb…` (sha `dbc424de…`). Ran the journey that has repeatedly displaced it —
`E2E_WEB_PORT=3094 E2E_FIXTURE_PORT=4094 npx playwright test test/e2e/journeys/workforce-flag-lever.spec.js`
in **fixture** mode, a real browser run that passed.

- canonical sha afterwards: **`dbc424de…` — byte-identical.**
- the fixture run landed at `runs/workforce-flag-lever.fixture.playwright.json`,
  `canonical: false`, `canonicalHeldBy: "live-5961-3579bbb"`, and the runner said so on stdout.
- and it now names its own backend: `fixture@61a76efa…+dirty`.

**ACCEPTED.** `artifacts/journeys/workforce-invitation-onboarding.playwright.json` held a fixture pass
with `backendBuild: null` (sha `be6ee9bd…`). Re-ran it the same way.

- canonical replaced (sha `e1c40689…`), `canonical: true`, and it now carries
  `fixture@61a76efa…+dirty`. A store that refuses everything is not a ranking; this is the pairing.
- **and the preservation fired unaided, on a real run.** The provisional `running` record written
  before the browser opened is weaker than the standing pass, so the pass was kept whole first:
  `runs/workforce-invitation-onboarding.fixture.superseded.playwright.json` is **sha `be6ee9bd…`, the
  byte-identical previous canonical.** The ledger line for that provisional names the file. Before this
  change the provisional destroyed it, which is exactly what `F-GR-SEND-GATE-JOURNEY-RED` describes.

**Nothing else moved.** `canonical-shas-before.txt` vs `canonical-shas-after.txt` differ in exactly one
line — the journey deliberately replaced. All three live artifacts still hold live passes, with 3/3,
3/3 and 1/1 of their referenced screenshots present on disk.

### Regression

- `npx jest` — **110 suites / 2481 tests, all green.**
- `npm run test:e2e:guard-proof` — **all 7 arms held**, including both mutant arms, so the wrong-world
  re-throw still fails the runner after the `journey.js` edit.
- `npx eslint` on the three shipped files — **0 errors, 0 warnings**. (The mutation harness in this lane
  directory reports 8 style warnings, all `no-console` and quote style, in a script whose output is its
  whole product.)
- `bash -n test/e2e/scripts/live-world.sh` — clean. The script itself was **not executed**: it starts a
  SQL world, and this lane may not.

## 4. What is still open, said plainly

- **Clause (b) is not "every artifact" yet, and cannot be closed from here.** On disk it moved 1/22 → 2/22.
  The mechanism is now total — both backends answer, and `live-world.sh` hands the answer to the runner —
  but a standing artifact only picks up identity from its **next run**. The 19 remaining fixture artifacts
  each need one re-run; the two remaining live ones (`workforce-schedule-publish`,
  `events-deposit-precondition`) need a **live world**, which needs Docker, which this lane is forbidden.
  Re-running the whole fixture suite was considered and **deliberately not done**: at least one journey is
  known red at the tip (`F-GR-SEND-GATE-JOURNEY-RED`), and turning other lanes' green canonical artifacts
  red on the eve of an acceptance walk is not this lane's call to make.
- **The same-lineage rule is still a hole in "a weaker run cannot displace", by design.** It is now a
  hole that costs nothing: the displaced record is kept whole and pointed at from the record that
  displaced it. Closing it outright would mean refusing the provisional `running` write, which is the
  only thing standing between a killed run and a stale pass reading as its result.
- **`F-GR-SEND-GATE-JOURNEY-RED` is untouched.** Its remedy is the journey, not the store: the app shell
  does not settle. The store's part — that the failure erased the pass — is what was fixed here. The
  green run that was lost on 2026-08-03 is **not recoverable**; only its ledger line survives, and it was
  not reconstructed, because a reconstructed artifact is a fabricated one.
- **Equal rank still does not displace across backends** (inherited): once two identified live worlds
  both pass, the first keeps the slot. Hand-over is to delete the canonical file and run again.

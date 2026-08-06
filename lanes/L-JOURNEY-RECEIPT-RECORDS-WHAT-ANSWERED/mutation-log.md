# L-JOURNEY-RECEIPT-RECORDS-WHAT-ANSWERED — the receipt can now contradict itself

**Worktree** `/Users/svendaneel/okam/web-whoanswered`, detached at `e34977a`, `core/` at `1bcab0b`.
Nothing pushed, nothing committed to a shared branch, no container, no fixed port bound.
**Port 4010 was never bound and pid 73160 was never signalled** — it was read once, read-only, to confirm it is still alive.

The field did **not** already exist. `journey.js` recorded `apiBaseUrl` from `process.env` and nothing
in the tree ever asked the port who was on it. Grep for `fixturePid|fixtureCwd|servedBy|reportedPort|
servingFixture` across `test/` and `artifacts/journeys/*.json` at `e34977a` returns nothing, so this
is not the `fail-spec` outcome.

---

## 1. What was built

| file | what |
|---|---|
| `test/e2e/support/fixture-provenance.js` | **new.** Two oracles, kept apart: `/__fixture/health` (the server's own testimony) and `lsof` (who holds the port, from outside). Plus `NodeCallLog` and the two judges. |
| `test/e2e/support/journey.js` | records `servingFixture` and `nodeCalls`; patches `globalThis.fetch` and wraps the Playwright `request` fixture; two new guards feeding the existing `wrongWorld` re-throw. |
| `test/e2e/fixture/api-server.js` | `/__fixture/health` now answers `{ok, port, pid, cwd}`. |
| `test/e2e/fixture/consumer-api-server.js` | same — it previously reported **no port at all**. |
| `test/e2e/scripts/serving-fixture-proof.js` | **new.** 10 arms, incl. the falsifying arm and 3 mutants. |
| `test/e2e/scripts/harness-copy.js` | **new.** Shared harness copier, resolved by Node's own loader. |
| `test/e2e/scripts/guard-proof.js` | uses the shared copier; its stand-in fixture declares which harness it serves. |

The receipt now has two halves that **can** disagree with `apiBaseUrl`, which is read out of this
process's own environment and therefore agrees with itself by construction:

- `servingFixture` — who is on the **granted** port: `reportedPort`, `reportedPid`, `reportedCwd`
  (testimony) and `holderPid`, `holderCwd`, `holderCommand` (`lsof`), with `identitySource` naming
  which spoke and `unresolved` carrying the reason when neither could.
- `nodeCalls` — every origin the **spec** reached from Node, by role (`granted` / `app` / `bypassed`),
  with a full `servedBy` resolution for anything bypassed.

**Fail-closed on contradiction, not on silence.** A positive contradiction reds the run; a question
nobody could answer is written down as `unresolved` and reds nothing. `lsof` is absent on plenty of
machines and a guard that red every run wherever it is missing would be switched off within a week,
taking the detection with it. The artifact still distinguishes *checked and agreed* from *could not
be checked*, which the old receipt could not express at all.

**Stated limit.** The Node-side log sees `globalThis.fetch` and Playwright's `request` fixture. A
spec reaching for `http.request`, `axios` or `node-fetch` would not appear. No journey in this repo
does today (`grep -rln "require('axios')\|require('http')\|node-fetch" test/e2e/journeys/` → empty),
and both channels that do exist are covered by an arm.

## 2. The falsifying arm — `runs/receipt-B1-bypass.json`

The world: the granted port is this harness's own fixture and serves the whole browser half; the
spec's Node-side call carries a **literal** pointing at another checkout's fixture — the shape of
`meals-statement-month.spec.js:72`, the instance committed at `4772c13` on
`lane/L-JOURNEY-PORT-HARDCODED`. **That spec was not touched here.**

**The bypassed fixture answers 200 to everything.** Both steps of the walk passed, `backendServed` is
2, and every guard that existed before this change is green. The run reds on the contradiction or not
at all — that is the difference between detecting a *wrong* fixture and a *broken* one.

```
"status": "failed",
"apiBaseUrl":     "http://127.0.0.1:55357",       <- the port the run was GIVEN
"backendServed":  2,                              <- the granted fixture really did serve the browser
"servingFixture": { "reportedPort": 55357, "holderPid": 91245,
                    "holderCwd": ".../pristine", "identitySource": "health+lsof" },
"nodeCalls": [ { "origin": "http://127.0.0.1:55364", "role": "bypassed", "via": ["fetch"],
                 "servedBy": { "reportedPort": 55364, "holderPid": 91248,
                               "holderCwd": ".../foreign-checkout" } } ]
"steps": [ 1 passed "open the page", 2 passed "read the month statement" ]
```

The receipt names one port and the log names another, with the pid and cwd of the process that
actually answered. **That is the disagreement.**

## 3. The arms — `runs/proof-01.txt`, all 10 held

```
ok  H1  exit 0  passed   granted port, own fixture, Node-side `fetch` to the granted origin
ok  H2  exit 0  passed   granted port, own fixture, Node-side `request.post` to the granted origin
ok  B1  exit 1  failed   spec BYPASSES the granted port via `fetch` — bypassed fixture answers 200
ok  B2  exit 1  failed   spec BYPASSES via `request.post`/`finalize` — the meals-statement-month channel
ok  F1  exit 1  failed   granted port is held by ANOTHER CHECKOUT's fixture (the reuse case)
ok  F2  exit 1  failed   the same, but the foreign fixture is TOO OLD to report pid/cwd — lsof alone
ok  N1  exit 0  passed   Node-side `fetch` to the APP's own origin — must NOT red
ok  M1  exit 0  passed   B1 with the bypassed-origin guard DISABLED — green again
ok  M2  exit 0  passed   F1 with the foreign-fixture guard DISABLED — green again
ok  M3  exit 0  passed   B2 with the `request` recorder REMOVED — green again
```

Each arm asserts the **receipt content**, not just the exit code — an exit code alone would let this
pass against a harness that reds for an unrelated reason.

- **B2 is the `meals-statement-month` channel.** That spec bypassed through `request.post`, not
  `fetch`. **M3 removes only the `request` recorder and B2 goes green**, so a recorder watching only
  `fetch` would have called that run clean. This is why the Playwright `request` fixture is wrapped.
- **F2 is the honest half of the reuse case.** The foreign fixture answers `{ok, port}` and nothing
  about itself — the shape of a sibling checkout too old to carry the new fields, which is exactly
  `wt-jwf`. It is still caught, from outside, by `lsof`. A detection that only worked when the
  foreign server cooperated would not have caught pid 73160.
- **N1 is what makes the rest worth having.** A Node-side call to the app's own origin stays green,
  so the guard reds on *the spec left its world*, not on *the spec used Node*.

**The stand-in fixtures are spawned child processes** with real pids and real, differing working
directories, listening on port 0 and reporting the port they bound. Nothing binds a fixed port, so no
arm can collide with a lane running beside it or be served by a process it did not start.

## 4. Verified on the real instrument — `runs/receipt-REAL-account-email-confirm.json`

A stand-in world proving a stand-in point is worth little, so one real journey was walked: real Nuxt
app, real `api-server.js`, private ports 3934/4934, `CI=1`. **1 passed (32.7s)**, and the receipt
names the real fixture:

```
"apiBaseUrl": "http://127.0.0.1:4934",
"servingFixture": { "reportedPort": 4934, "reportedPid": 95253,
                    "reportedCwd": "/Users/svendaneel/okam/web-whoanswered",
                    "holderPid": 95253, "holderCommand": "node test/e2e/fixture/api-server.js",
                    "identitySource": "health+lsof" },
"nodeCalls": [ { "origin": "http://127.0.0.1:4934", "calls": 4, "role": "granted" } ]
```

Both oracles agree, and the spec's four Node-side calls are all classed `granted`.
`meals-statement-month` was deliberately **not** run: at `e34977a` it still hardcodes 4010, and its
first API call is a mutating `POST .../statements/drafts` followed by an irreversible `/finalize`.

## 5. Two findings this lane did not go looking for

**`guard-proof.js` was DEAD at `e34977a`** — measured, not inferred (`runs/guard-proof-BASELINE-e34977a.txt`,
run in a throwaway worktree at that exact ref). **9 of its 10 arms die in module load** with
`Cannot find module './world-stamp'`: its harness copied support files from a hand-written list of two,
and `artifact-store.js` had since grown a third require. The tenth arm, arm 3, "passes" **spuriously** —
it expects `nonzero` + no artifact, which is precisely the signature of a harness that never ran.
So the one line the whole evidence standard rests on has had no working test at this tip.
`runs/guard-proof-AFTER.txt`: **10/10, exit 0.**

**The text-scan replacement produced a plausible, well-formed, wrong answer inside one run**, and it
is worth recording because it is the eleventh instance of the class the brief lists. Reading requires
out of the source with a regex after stripping block comments looks obviously correct. But
`artifact-store.js` contains the glob `artifacts/journeys/*.playwright.json` **inside a `//` comment**;
the `/*` in that glob opens a comment that runs to the next `*/` far below and swallows real code —
including the very `require('./world-stamp')` the fix existed to find. The harness built cleanly,
reported nothing wrong, and every arm died in module load. Not stripping comments is no better: the
first attempt refused on a command line quoted in prose, `require('./test/e2e/fixture/api-server.js')`.

The closure is now taken from **Node's own module loader** — require the entry, walk `module.children`
— which is the only thing in the process definitionally right about what a file imports. No parsing,
no comment handling, no glob that can pretend to be a comment opener. It resolves
`artifact-store.js, fixture-provenance.js, journey-assertions.js, journey.js, world-stamp.js`.

Both failures were **loud** rather than silent, which is the property that mattered: the first refused
to build a harness it could not place a file for, and the second was caught by `executed` — the
"did a test actually run" discriminator — rather than being read as a guard verdict.

## 6. One interaction worth naming

Wiring the guard in **immediately red `guard-proof.js` arm 5**, its honest-fixture arm, and it was
right to: that proof runs its stand-in fixture *in-process*, so its real cwd is the repo while the
harness under test is a temp directory. The stand-in now sets `state.cwd` per arm to the harness it
is standing in for, exactly as it already sets `state.target` — because *which checkout served a run*
is not a dimension those arms vary. It is this lane's subject, and this lane's proof spawns real
child processes with real working directories rather than declaring one.

No escape hatch was added to `journey.js`. An env var that switches the provenance guard off would be
set once and the guard would evaporate, which is the failure this whole family exists to end.

## 7. Not done here, on purpose

- **`meals-statement-month.spec.js` is untouched.** The fix exists at `4772c13`; landing it is a
  separate act. This lane makes the next one detectable.
- Not wired into CI — no workflow in this repo runs any suite yet (`L-FE-CI`'s subject).
- The `@live` half is unguarded by `servingFixture` by design: a live API's working directory is not
  this checkout, and live identity is `backendBuild`'s job. The record says so rather than resolving
  a field whose meaning would be unclear.

## 8. How to re-run

```
cd /Users/svendaneel/okam/web-whoanswered
npm run test:e2e:serving-fixture-proof          # 10 arms, exit 0
npm run test:e2e:guard-proof                    # 10 arms, exit 0 (was 9/10 dead)
SERVING_FIXTURE_PROOF_ONLY=B1 SERVING_FIXTURE_PROOF_KEEP=1 \
  node test/e2e/scripts/serving-fixture-proof.js   # capture one receipt; exits 1 and says why
```

A filtered run exits **nonzero** and says on its last line that it is a capture and not a verdict, so
it can never be quoted as the proof passing.

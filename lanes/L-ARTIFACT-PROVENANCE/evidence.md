# L-ARTIFACT-PROVENANCE — what was verified, built and proven

Ports used: **3092** (web) / **4092** (fixture) / **5093** (my stub API). Nothing else touched.
`test/e2e/scripts/live-world.sh` NOT edited. No container started, none touched. No migration authored.

## 1. The brief's claims, checked before building

| claim | verdict |
|---|---|
| last-writer-wins at one join key | TRUE. `playwright.config.js:127` sets `grepInvert` only when `LIVE_API` is set, so in fixture mode the three `@live` journeys run too and wrote to the same `<name>.playwright.json`. |
| teardown-only writes | TRUE. `recorder.write()` ran only after `use()`; nothing cleared the directory at start; and `await fetch(apiBaseUrl + '/__fixture/stats').then(r => r.json())` could **throw past the write**, so a dead fixture left the previous artifact standing. |
| no backend identity | TRUE, and worse than stated. `/health` answers the literal string `Healthy` on every world. Verified against the two live worlds standing on this machine (5951, 5956): identical 200/"Healthy", different worktrees. `/swagger/v1/swagger.json`, `/openapi/v1.json`, `/version` → **404** on both; `/feature-flags/catalog` → **401**. There was no unauthenticated way to tell them apart. |
| "all three live journeys are displaced right now" | **STALE by the time this lane started.** At 11:33Z when the brief was generated it was true; between 11:35Z and 11:44Z other lanes re-ran all three live and they were live+passed at their canonical paths when I read them. The three *code* defects were unaffected. |

## 2. What was built

- `test/e2e/support/artifact-store.js` (new) — the filing rules.
  - `artifacts/journeys/<name>.playwright.json` stays the canonical join key, unchanged path and shape.
  - `artifacts/journeys/runs/<name>.<backendKey>.playwright.json` — one file per backend; a run only ever overwrites its own.
  - `artifacts/journeys/runs/ledger.jsonl` — append-only, one line per run including provisional and losing runs.
  - Rank = (backend: live>fixture) → (status: passed>failed>running) → (identity: named build > unidentified). The canonical is replaced only when absent/corrupt, when the incoming run is the **same** backend key, or when it ranks **strictly** higher. Equal rank from a different backend does not displace.
  - `runs/` is a subdirectory, not a suffix, because several lanes count evidence with `artifacts/journeys/*.playwright.json`.
- Backend identity, first hit wins: `E2E_API_BUILD` → `OKAM_API_REPO`/`E2E_API_REPO` → **the listening process** (loopback only: `lsof` the port → the holder's cwd → `git rev-parse` there) → the API's swagger route surface. Null when nothing can say, and the harness prints the one-line fix.
- `test/e2e/support/journey.js` — resolves the build (live only, never for the fixture, whose process is this repo), writes a **provisional `"status": "running"` record before the browser opens**, guards the `/__fixture/stats` fetch so a dead fixture becomes a failed artifact instead of an exception that skips the write, and says on stdout when a run did not take the canonical slot and who holds it.
- Screenshots and the two printed PDFs now go to `artifacts/journeys/<name>/<backendKey>/` — the same defect one level down: a fixture re-run used to overwrite the pixels a live artifact referenced. `journey.dir` / `journey.relativeDir` replaced the two `ARTIFACT_DIR` uses in `events-runsheet-print.spec.js` and `events-runsheet-onboarding.spec.js`.
- `test/journey-artifact-store.test.js` (new) — 18 tests, each of which **attempts the displacement**.

## 3. Proof

**Unit, with mutations.** 18/18 green. Then, one at a time:

| mutation | red |
|---|---|
| A — `canTakeCanonical` returns true (last-writer-wins restored) | 5 |
| B — `beginRun` made a no-op (teardown-only writes restored) | 3 |
| C — build identity dropped, keys back to origin-only | 6 |
| D — listening-process source removed | 1 |

All restored; 18/18 green again.

**End-to-end #1 — the exact real case.** Canonical `workforce-flag-lever.playwright.json` held a **live pass** (5956, 80 served, sha `c21fe209…`). Ran `npm run test:e2e -- test/e2e/journeys/workforce-flag-lever.spec.js` in **fixture** mode — the run that has repeatedly displaced it.

- canonical sha **unchanged**; the fixture record landed at `runs/workforce-flag-lever.fixture.playwright.json` with `canonical: false, canonicalHeldBy: "live-5956-unidentified"`, and the runner said so on stdout.
- Then **mutation A applied and the identical command re-run**: canonical sha `c21fe209…` → `c4b184a2…`, `"backend": "fixture"`. **The displacement returned.** Mutation reverted, canonical restored bit-for-bit from backup.

**End-to-end #2 — a live-labelled run against a backend that is not the world.** Stub API on 5093 answering exactly what the real worlds answer (`200 "Healthy"`, no `/__fixture/health`). Ran `E2E_API_BASE_URL=http://127.0.0.1:5093 … events-deposit-precondition.spec.js`. The preflight **passed** — as the brief said, any API satisfies it — and the run was filed as
`runs/events-deposit-precondition.live-5093-fadc84a-dirty.playwright.json`, `status: failed`, `backendServed: 0`,
`backendBuild: {"id":"Web-modules@fadc84a…+dirty","source":"process:127.0.0.1:5093"}`,
`canonical: false, canonicalHeldBy: "live-5961-unidentified"`. Canonical sha `8d0fc722…` unchanged. Before this change it would have overwritten a real live pass with a failed run against a stub.

**In the wild, unaided.** At 11:49:17Z another lane's own live run of `workforce-flag-lever` — nothing of mine involved — was recorded as
`build: "wt-lwr-api@3579bbbc…", buildSource: "process:127.0.0.1:5961"` and **took the canonical slot from the unidentified 5956 record**, which is exactly the designed ordering. Ledger line preserved.

**Regression.** Jest 105 suites / 2388 tests green. `events-runsheet-print` browser journey green with the new screenshot and PDF paths. ESLint clean.

## 4. Decisions, and the residue

- **`artifacts/` stays gitignored, and I committed no artifact.** The gitignore comment is right and the store now makes force-adding less tempting: `runs/` plus the ledger is the durable record, and the canonical file is derived. Two force-added tracked files (`modal-scroll-lock`, `modal-estate-scroll-lock`) were left exactly as they are — they are another lane's, and after this change a modal re-run writes its screenshots to a new subdirectory, so those two PNGs will churn *less*, not more. Tracked-artifact churn after all my runs: **none**.
- **`grepInvert` was NOT changed.** Making fixture mode exclude `@live` would have been the other way to fix defect 1, but those three journeys pass in fixture mode and lanes count them; dropping three journeys from the fixture suite is another lane's blast radius. The per-backend key makes the fixture re-run harmless instead.
- **Equal rank does not displace**, so once two live worlds are both identified and both pass, the first keeps the canonical slot. That is the exit criterion taken literally. The loser is on disk and in the ledger, the runner names the holder, and the documented hand-over is to delete the canonical file and re-run.
- **RESIDUE, for whoever owns `live-world.sh`:** one line makes every live artifact self-describing without relying on `lsof`:
  `export E2E_API_BUILD="OkamAPI@$(git -C "$OKAM_API_REPO" rev-parse HEAD)"`, and carry it into the run command the script prints. I did not edit that script — two SQL lanes are in it.
- **RESIDUE:** the swagger fallback answers nothing on this estate (404 on both worlds). Kept for APIs that publish one; it is not what carries the estate today.

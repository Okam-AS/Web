# Census — tests that write under `artifacts/`

Lane L-TESTS-THAT-WRITE-ARTIFACTS · class analysis · 2026-08-05
Frontend `/Users/svendaneel/okam/Web-modules` @ `8ac6f636` (`lane/focustrap-teardown`)
Backend  `/Users/svendaneel/okam/OkamAPI-modules` @ `34c6c103` (`lane/meals-grace-pins`)

Census only. Nothing was changed, no suite was run, no container was touched. Whether a regenerator
should be pinned, gitignored or made read-only is a design call this list precedes.

---

## 0. Live evidence, before any argument

The frontend working tree is dirty **right now**, in exactly the shape this lane was opened about:

```
 M artifacts/journeys/workforce-invitation-onboarding.playwright.json
 M artifacts/journeys/workforce-invitation-onboarding/fixture/01-the-roster-before-an-invitation.png
 M artifacts/journeys/workforce-invitation-onboarding/fixture/02-the-invitation-code-shown-once.png
 M artifacts/journeys/workforce-invitation-onboarding/fixture/07-the-roster-after-the-claim.png
```

Four tracked files, modified by a test run — not by a lane. The JSON diff is 51 insertions / 46
deletions: timestamps, ephemeral ports (`4094` → `4028`), the frontend SHA the run saw, and five
fields (`backendSubjectServed`, `foreignSubjectServed`, …) the committed copy predates. So this is not
a whitespace flutter; the committed record and the on-disk record disagree about their own schema.

This is the state in which every other lane in the program runs `git status` to decide whether its work
is isolated.

## Method, and the two instrument traps

- `git ls-files -- 'artifacts/'` from each repo root — **not** a bare-filename pathspec, which matches
  nothing from the root, and not a `find`, which cannot tell tracked from ignored.
- `git status --porcelain -uall` — `-uall` is load-bearing: without it an untracked directory collapses
  to its ancestor and a hundred files read as one line.
- Write primitives grepped across the whole of `test/` (FE) and `WebApi.Tests/` (BE):
  `writeFileSync|appendFileSync|copyFileSync|renameSync|rmSync|unlinkSync|mkdirSync|createWriteStream`
  and `File.WriteAll*|File.AppendAll*|File.Create|File.Copy|File.Move|File.Delete|StreamWriter|Directory.CreateDirectory|Directory.Delete`.
  `--include='*.cs'` must be quoted under zsh or the glob is expanded by the shell and the grep dies.
- Every hit was then read to its call site to answer three separate questions, kept separate below:
  **(a) deliberate or incidental**, **(b) does it assert the bytes it wrote**, **(c) which committed
  files it touches**.

Ignore rules differ between the repos and this matters to every row:

| repo | rule | consequence |
| --- | --- | --- |
| frontend | `.gitignore:111` ignores `artifacts/` wholesale; 16 files force-added past it | a write under `artifacts/` is invisible **unless** it lands on one of those 16 |
| backend | **no rule for `artifacts/` at all** | every write under `artifacts/` is either a modified tracked file or a permanent `??` line |

---

## Pile A — DELIBERATE REGENERATORS

Writing is the point: the file is the deliverable, and a comment in the source says so. Present because
they are unpinned, not because they are wrong to write.

**None of the four asserts the bytes it wrote.** Every assertion in these tests is against in-memory
objects or the live DOM; the write is the last statement and nothing reads it back. On the brief's
asserted-versus-incidental axis they are therefore *not* instruments in the "writes it and then checks
it" sense — they are unchecked emissions that happen to be intentional. That distinction is the reason
this pile is not simply "keep".

### A1 · `EventsDietaryRunSheetWireTests` — the one already caught

- File: `/Users/svendaneel/okam/OkamAPI-modules/WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs`
- Writer: `WriteCapture` (line 222), called at line 110 as the last statement of the `[Fact]`
  `A_venue_records_a_requirement_and_the_reissued_run_sheet_prints_it`.
- **Committed files rewritten, both tracked:**
  - `artifacts/journeys/ev-dietary/run-sheet.md`
  - `artifacts/journeys/ev-dietary/run-sheet.json`
- Gate: **none.** No env var, no opt-in. Any run of that Fact — including a `--filter` that merely
  catches it — rewrites both.
- Asserts what it wrote: **no.**
- Deliberate: **yes, and documented** (lines 29–34): there is no Events UI anywhere in the estate, so
  the run sheet's `Body` strings *are* the printed document and the capture is the only way a human
  can read it.
- Aggravator: the JSON embeds `"capturedAtUtc": DateTime.UtcNow` (line 279), so the diff is non-empty
  on every run **even when the document is byte-identical**. There is no quiet path.

### A2 · every Playwright journey, through the shared artifact store

- Writer: `/Users/svendaneel/okam/Web-modules/test/e2e/support/artifact-store.js`, `writeRun` (line 449)
  and `beginRun` (line 528), reached from `journey.js` `write()` (line 486) and `begin()` (line 495).
- Reached by **all 37 specs** under `test/e2e/journeys/`. Three of them land on committed files:

| spec | committed file(s) it rewrites | tracked |
| --- | --- | --- |
| `test/e2e/journeys/workforce-invitation-onboarding.spec.js` | `artifacts/journeys/workforce-invitation-onboarding.playwright.json` **+ all 7 PNGs under `.../workforce-invitation-onboarding/fixture/`** | yes (8 files) |
| `test/e2e/journeys/modal-scroll-lock.spec.js` | `artifacts/journeys/modal-scroll-lock.playwright.json` | yes (1 file; see A3) |
| `test/e2e/journeys/modal-estate-scroll-lock.spec.js` | `artifacts/journeys/modal-estate-scroll-lock.playwright.json` | yes (1 file; see A3) |

- Gate: **none, and the guard that looks like one is not one.** `writeRun` writes the canonical slot
  only `if (takes)`, and `takes` comes from `canTakeCanonical` (line 394) — whose *first* rule is
  `if (sameLineage) { return true; }`. A re-run of the same journey against the same backend is always
  the same lineage, so it always takes the slot. Rank only protects against a *different* backend.
- Written **twice per run**: `begin()` files a provisional `"running"` record over the committed one
  before the browser opens, then `write()` files the result. An interrupted run leaves the committed
  file reading `"status": "running"`.
- Asserts what it wrote: **no** — the specs assert the UI; nothing reads the canonical back.
- Deliberate: **yes.** `.gitignore:94–110` records the reasoning: an exit whose evidence is
  regenerated-or-absent can be neither reviewed after the fact nor shown to fail, so these records were
  force-added on purpose.
- The other 34 specs write the same canonical path for their own journey, but those files are ignored,
  so today they touch no committed file. **The exposure is one `git add -f` wide.**

### A3 · the same store, one level down — the screenshots, and a dangling reference

`journey.js` `shot()` (line 421) writes to `artifacts/journeys/<journey>/<backendKey>/NN-<slug>.png`.
The backend key for a fixture run is the literal `fixture` (`backendKeyFor`, line 319).

- `workforce-invitation-onboarding`'s 7 committed PNGs sit at `.../fixture/…` — the current path — so
  **they are overwritten on every fixture run.** Three of the seven are modified on disk right now.
- `modal-scroll-lock` and `modal-estate-scroll-lock`'s 6 committed PNGs sit one level higher, at
  `artifacts/journeys/modal-scroll-lock/01-….png`, with no `fixture/` segment — the pre-backend-key
  layout. Their committed JSON `screenshots` arrays match that old layout and neither file carries an
  `artifact` block at all. So a re-run **does not** overwrite those PNGs; it writes new ones under
  `…/fixture/` and rewrites the committed JSON to point at them. **The committed record then references
  ignored files and the committed pictures are orphaned** — precisely the dangling reference
  `.gitignore:108–110` says must never exist. Second-order, invisible in a diff of the PNGs, and worth
  naming before anyone decides the remedy is "just re-run and commit".

### A4 · `GrowthPostmarkSandboxSmokeTests` — deliberate, gated, cross-repo

- File: `/Users/svendaneel/okam/OkamAPI-modules/WebApi.Tests/Growth/GrowthPostmarkSandboxSmokeTests.cs`,
  `WriteJourneyArtifact` (line 108).
- Gate: **doubly gated.** `[SkippableFact]` skips unless `GROWTH_POSTMARK_TEST_TOKEN/_FROM/_TO` are all
  set, and it returns without writing unless `GROWTH_POSTMARK_JOURNEY_OUT` is set.
- Committed files touched today: **none.**
- Worth one line anyway: the documented target (line 37) is
  `../Web-modules/artifacts/journeys/growth-doi-postmark-sandbox.json` — a **write from the backend
  suite into the frontend checkout**. It is ignored there today, but the destination is an
  operator-supplied absolute path with no allowlist, so it can be pointed at any tracked file in either
  repo. This is the only cross-repo writer found.

---

## Pile B — INCIDENTAL WRITES

Run state, not evidence. All of them land on ignored paths in the frontend; none touches a committed
file. Listed so the design call knows what a blanket rule would also catch.

| writer | path | tracked | note |
| --- | --- | --- | --- |
| `test/e2e/support/artifact-store.js:487,493` | `artifacts/journeys/runs/<name>.<key>.playwright.json`, `runs/<name>.<key>.superseded.playwright.json`, `runs/ledger.jsonl` | no | per-backend run store + append-only ledger; grows on every run |
| `test/e2e/support/core-checkout.js:133,139–142` | `artifacts/.core-borrowed` marker, and `rmSync`/`mkdirSync` of the borrowed core dir | no | source comment (line 34) already reasons "under `artifacts/` because it is run state, not source, and `artifacts/` is already gitignored" |
| `test/e2e/support/world-stamp.js:424–431,438` | `artifacts/world/live/<host>-<port>.json` | no | written by `live-world.sh`, removed on teardown; write-to-sibling-then-rename |
| `test/e2e/journeys/events-runsheet-print.spec.js:233` | `<journey.dir>/run-sheet.pdf` | no | printed document, under the backend key |
| `test/e2e/journeys/events-runsheet-onboarding.spec.js:214` | `<journey.dir>/run-sheet-onboarding.pdf` | no | same shape |
| `playwright.config.js:118,145` | `artifacts/playwright-output/`, `artifacts/playwright-report/` | no | traces, videos, HTML report |
| `playwright.consumer.config.js:62,74` | `artifacts/playwright-output-consumer/`, `artifacts/playwright-report-consumer/` | no | same |
| `scripts/worldstamp:32` (FE) | `artifacts/world/WORLD.json` | no | operator script, not a test |

**One backend row belongs here and behaves differently because the ignore rule is missing:**

| writer | path | state |
| --- | --- | --- |
| `Scripts/worldstamp` (BE) | `OkamAPI-modules/artifacts/world/WORLD.json` | **`??` in the backend's `git status` right now**, and permanently, because the backend has no `artifacts/` ignore rule. Not a modified tracked file, so not the same defect — but it is standing noise in the same check every lane uses, in the repo where the caught defect lives. |

---

## Pile C — ADJACENT, deliberately not merged into A or B

Six backend tests write **tracked** files that are not under `artifacts/`. They are out of the exit
criterion's scope and are listed only because they are the contrast case that shows what the correct
shape looks like — and because the `git status` hazard is identical if the gate is ever set in a shell
that outlives the command.

| test | writes | gate |
| --- | --- | --- |
| `WebApi.Tests/Growth/GrowthNewsletterContractFixtureTests.cs:51` | `docs/api/fixtures/growth/*.json` | `OKAM_EMIT_GROWTH_FIXTURES=1` |
| `WebApi.Tests/Meals/MealsContractFixtureTests.cs:111` | `docs/api/fixtures/meals/*.json` | `OKAM_EMIT_MEALS_FIXTURES=1` |
| `WebApi.Tests/Workforce/WorkforceContractFixtureTests.cs:67` | `docs/api/fixtures/workforce/*.json` | `OKAM_EMIT_WORKFORCE_FIXTURES=1` |
| `WebApi.Tests/Workforce/PosContractFixtureTests.cs:51` | `docs/api/fixtures/workforce/*.json` | `OKAM_EMIT_WORKFORCE_FIXTURES=1` |
| `WebApi.Tests/Workforce/PersonnelListContractTests.cs:41` | `docs/api/fixtures/workforce/personnel-list.json` | `OKAM_EMIT_WORKFORCE_FIXTURES=1` |
| `WebApi.Tests/Workforce/HoursExportTests.cs:82` | `docs/api/fixtures/workforce/hours-export.csv` | `OKAM_EMIT_WORKFORCE_FIXTURES=1` |

**This is the pile the brief calls instruments.** Default behaviour is to *read* the committed file and
assert equality against it; the write is an explicit, named regeneration. These are the only tests in
either repo that check the bytes they are responsible for — they are what A1–A3 are not.

---

## Checked and cleared

Examined and confirmed to write nothing into either checkout:

- `test/journey-artifact-store.test.js`, `test/journey-assertions.test.js`,
  `test/world-stamp-windows.test.js` — `fs.mkdtempSync(os.tmpdir(), …)` throughout, `rmSync` in
  `afterEach`. `artifact-store.js:278` states the rule explicitly: *"`stampDir` is for tests, which
  must not write a stamp into the real checkout's `artifacts/`."* The tests honour it.
- `test/e2e/scripts/guard-proof.js` (harness root `mkdtempSync`, line 426),
  `test/e2e/scripts/build-provenance-proof.js` (line 237),
  `test/e2e/scripts/live-world-stamp-wiring-check.js`, `test/e2e/scripts/fixture-divergence.js`
  (line 357) — throwaway harnesses; the `artifacts/journeys` they `rmSync` is the harness's own.
  `build-provenance-proof.js` copies results out only when `PROVENANCE_PROOF_OUT` is set (line 61).
- `OkamAPI-modules/artifacts/tests/*.trx` + `<sha>/RUN.md` (12 tracked files) — **no test writes
  these.** `artifacts/tests/README.md` documents them as hand-curated, one per SHA, from a detached
  worktree, with "do not overwrite an existing row" as a written rule. Tracked, and correctly so.
- `test/core-request-path-shape.test.js` — reads only; `artifacts` appears in a directory skip-list.
- No jest `globalSetup`/`globalTeardown` exists in `jest.config.js`.

---

## Facts the design call will need

1. **10 of the 16 tracked frontend artifact files are overwritten by a suite run** — 3 canonical JSONs
   + the 7 PNGs of `workforce-invitation-onboarding`. The other 6 (`modal-*` PNGs) are not
   overwritten; they are orphaned instead (A3). 16 = 3 JSON + 3 + 3 + 7 PNG.
2. **Both tracked backend artifact files are overwritten, ungated, with a timestamp guaranteeing a
   diff** (A1).
3. `.gitignore:105–107` names **five** journeys as force-added. Only **three** are:
   `git ls-files -- 'artifacts/journeys/growth-guest-lifecycle*' 'artifacts/journeys/growth-testsend-refusal*'`
   returns **0**, though `artifacts/journeys/growth-guest-lifecycle.playwright.json` exists on disk.
   Two lane exits (L-JOURNEY-GROWTH) therefore claim committed evidence that is not committed. Not this
   lane's to fix; it changes what "pin the committed ones" means.
4. 25 journey directories under `artifacts/journeys/` already carry a backend-key subdirectory — the
   current layout — against 2 that do not. The old layout survives only in the two `modal-*` records.
5. The frontend hazard scales with `git add -f`, not with test count: 34 specs already write a canonical
   file that is merely ignored today.

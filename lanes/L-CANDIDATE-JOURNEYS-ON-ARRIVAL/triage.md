# L-CANDIDATE-JOURNEYS-ON-ARRIVAL — the six journeys, classified

**Answer: all six pass on `candidate/fe-compose-2026-08-05`. None is a regression. None is a walk that
never passed. All six are harness-shape failures** — five caused by the composition lane's runs being
served by a foreign fixture, and the sixth by the spec pointing itself at that same foreign fixture.

Nothing was fixed here. Nothing was committed, nothing pushed, no container started, no branch touched.

---

## 0. The measurement, both endpoints, with the serving fixture named

Every run below was served by a fixture whose **pid, cwd and self-reported port are recorded in the
receipt**. That is the difference between this measurement and the one it corrects.

| ref | journeys | passed | failed | fixture that actually served it | receipt |
|---|---:|---:|---:|---|---|
| tip `e34977ac` | 22 | **21** | **1** | pid 9275 · cwd `/Users/svendaneel/okam/web-arrival` · health `{"ok":true,"port":4889}` | `runs/T4-tier-tip-prov.txt` |
| candidate `9f7d8df` | 29 | **27** | **2** | pid 3996 · cwd `/Users/svendaneel/okam/web-arrival` · health `{"ok":true,"port":4889}` | `runs/T3-tier-candidate-prov.txt` |

Failing at the tip: `workforce-schedule-publish` (@live).
Failing on the candidate: `meals-admin-setup` **+** `workforce-schedule-publish`.

**The whole difference between the two endpoints is one journey**, `meals-admin-setup`, already
attributed by `L-JOURNEY-REGRESSION-BISECT` to `55b2dcd` (`lane/meals-enrol-pretick`). My tier run
reproduces its failure verbatim — the same `locator('.meals-programs .mls-note--warn') resolved to 4
elements` — which independently corroborates that lane.

Both tiers were run twice; the earlier pair (`runs/T1-tier-candidate.txt`, `runs/T2-tier-tip.txt`)
gave identical counts but carried no fixture provenance, so they are superseded by T3/T4 as evidence
and kept as reproduction.

## 1. The six, classified

Three shapes were told apart at every step: **PASS** (the walk completes) · **FAIL-ASSERT** (the walk
ran, an assertion failed) · **HARNESS** (the walk never started, or ran against the wrong world).
**Not one of the six produced a FAIL-ASSERT in any run of mine.**

| # | journey | classification | measured |
|---|---|---|---|
| 1 | `workforce-kodeoversikt` | **harness-shape** — foreign fixture | PASS ×3 · `C1`, `C7` (prov), `T3` |
| 2 | `workforce-punch-correction` | **harness-shape** — foreign fixture | PASS ×2 · `C2`, `T3` |
| 3 | `workforce-role-catalogue` | **harness-shape** — foreign fixture | PASS ×2 · `C3`, `T3` |
| 4 | `training-evidence-document` | **harness-shape** — foreign fixture | PASS ×2 · `C4`, `T3` |
| 5 | `growth-preference-withdrawal` | **harness-shape** — foreign fixture | PASS ×2 · `C5`, `T3` |
| 6 | `meals-statement-month` | **harness-shape — owned by the spec**, see §4 | PASS ×2 · `C6`, `T3` |

### The statutory one is not failing, and it produces the document

The brief ranked `workforce-kodeoversikt` first because § 8-5-6 is a personalliste artifact an
inspector may demand on the day, and **C6** forbids printing the claim where the document cannot be
produced. It can be produced. The artifact my run wrote
(`/Users/svendaneel/okam/web-arrival/artifacts/journeys/runs/workforce-kodeoversikt.fixture.playwright.json`,
`status: passed`, `apiBaseUrl: http://127.0.0.1:4889`) records every step completing:

- the § 8-5-6 caveat names the overview the page can produce
- pressing the control **downloads `okam-kodeoversikt-42-2026-07-13.csv`** under the server's name
- the bytes are the template § 8-5-6 asks for — 2 codes, 1 uncoded participant, retain-until 2030-06-30
- two clicks appended **two issue rows, distinct ids, both stamped with an actor** (which is also C4)

**C6 is satisfied on the candidate. The flag raised against it should be withdrawn.**

## 2. Why five of them redded — the mechanism, and what makes it checkable

`playwright.config.js` sets `reuseExistingServer: !process.env.CI` on the fixture server and probes
`http://127.0.0.1:<FIXTURE_PORT>/__fixture/health` to decide. Port **4010** is held by

```
pid 73160   node -e require('./test/e2e/fixture/api-server.js')
            cwd /Users/svendaneel/okam/wt-jwf        started Tue Aug  4 16:03:12 2026
            GET /__fixture/health -> {"ok":true,"port":4010}
```

a **sibling lane's fixture from another checkout**, still alive, **never touched and never killed by
this lane**. With `CI` unset the probe answers 200 and Playwright reuses it rather than starting its
own — so the candidate's front end was driven against `wt-jwf`'s API.

The mechanism makes a prediction, and the prediction is what makes it checkable rather than a story.
`wt-jwf` is at `eb8f412`; grepped read-only, its `test/e2e/fixture/` contains **no** `kodeoversikt`,
**no** `code-register`, **no** `punch-correction` and **no** `statements/drafts`. So a run reused
against it fails exactly on the journeys whose fixture routes arrived with the composition, and
passes the rest. That is precisely the observed 8-vs-2 split: **every extra failure is a
newly-arrived journey, and no pre-existing journey moved.**

Three independent traces of the same reuse, none of them inferred:

1. **The candidate worktree's own artifacts.** `test/e2e/support/journey.js` writes `apiBaseUrl` into
   every artifact. In `/Users/svendaneel/okam/web-fe-candidate/artifacts/journeys/runs/` there are
   **26 artifacts recording `http://127.0.0.1:4010`** and **29 recording `http://127.0.0.1:4917`**.
2. **The compose lane's own later receipt.** `receipts/tip-playwright-ISOLATED-FIXTURE.txt` — first
   line `[fixture] listening on http://127.0.0.1:4917` — reports **26 passed / 3 failed**, not 21/8.
3. **This lane's runs**, on 3889/4889 with the server identified by pid and cwd: **27 passed / 2 failed**.

## 3. §3c is stale, and its tip row is wrong too

`compose-run.md` was last written **01:33:17 CEST**. The compose lane's own isolated re-run finished
**02:08:33 CEST** — 35 minutes later — and §3c was never revised to match it. (Local times throughout;
my receipts carry `Z` stamps and are converted before comparison, because a `Z` stamp read against a
CEST mtime inverts an ordering by two hours.)

One further correction §3c's own isolated run did not reach. §3c reports the **tip** at 20 passed / 2
failed and credits the composition with fixing `account-email-confirm`. Measured honestly, the tip is
**21 passed / 1 failed**: `account-email-confirm` **passes at the tip**. It reads `E2E_FIXTURE_PORT`
correctly, so on the default ports it too was answered by `wt-jwf`'s fixture. **The composition fixed
nothing there — that journey was never broken.** The tip has exactly one failure, `workforce-schedule-publish`.

## 4. `meals-statement-month` is not "arrived broken", and this is the ninth instance of the class

The corrected list handed to me classes this journey as never having passed anywhere. It is
misclassified, and by the same mechanism that produced the original error — one layer further in.

`test/e2e/journeys/meals-statement-month.spec.js:72`, on the candidate and at its birth commit
`9215d38`:

```js
const api = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:4010';
```

The spec **hardcodes 4010 and ignores `E2E_FIXTURE_PORT`**, while its browser half goes through the
dev server to whichever port the run was given. So it is the one spec whose failure **survives
isolating the run**: on the compose lane's isolated 4917 tier, this journey's own API calls still went
to pid 73160. `journey.js` then recorded `apiBaseUrl: 4917` in its artifact, because it records the
port the run was *given* — a receipt that cannot contradict itself.

With that single expression replaced by the one three sibling specs and `journey.js:528` already use,
**the journey passes on the candidate** (`runs/C6-statement-candidate-portfix.txt`,
`runs/T3-tier-candidate-prov.txt`). Independently, `L-JOURNEY-PORT-HARDCODED` proved the same thing
over the wire with read-only calls — `portproof/resolution.jsonl` shows the old expression answered
`{"ok":true,"port":4010}` on a run whose own fixture was 4318 — and showed the corrected journey green
on two different non-default port pairs.

**Classification: harness-shape, owned by the spec, fix already written and not merged** (commit
`4772c13` on `lane/L-JOURNEY-PORT-HARDCODED`). It is a real defect and worth landing, but it is a
defect in the instrument, not in the month statement.

**It also cannot be measured unpatched without doing damage**, which is why the deviation in §5 exists:
the spec's first use of `api` is a mutating `POST .../meals/statements/drafts` followed by an
irreversible `/finalize`. Run unpatched on a private port, those writes land **inside `wt-jwf`'s
world**. Run on 4010, it cannot start, because that port is not mine.

## 5. Where I departed from the brief — stated, not buried

1. **The ordering instruction is void and I am recording that rather than quietly complying.** The
   brief ranked the § 8-5-6 kodeoversikt first on the ground that it is a statutory artifact whose
   walk does not complete. The walk completes. Taking it first was still right, because it is what
   surfaced the error fastest — the first journey I ran passed, which is what falsified the list.
2. **I did not run the six at their origin-branch tips.** Both classes the brief asks me to separate —
   *real regression* and *never passed anywhere* — are refuted by the same fact, a PASS on the
   candidate, so a branch run cannot change any classification. And all six spec blobs are
   **byte-identical** between origin branch and candidate (`wf-kodeoversikt-ui` `7d2ffd45`,
   `journey-workforce` `531bdad6`, `wf-roles-ui` `0ba5559b`, `train-evidence-pack-ui` `6563a765`,
   `fe-growth-prefcentre` `a25a4865`, `fe-meals-statement-surface` `f5912d48`), so the instrument did
   not change on the way in. Saying so beats a triage that silently covers less than it claims.
3. **One declared change to an instrument**, `meals-statement-month.spec.js:72` only, byte-for-byte the
   fix in `4772c13`, applied identically at every ref, reverted after every run, never committed. §4
   is why there is no honest alternative.
4. **My first eight receipts carried no fixture provenance** (`C1`–`C6`, `T1`, `T2`). `CI=1` plus a
   free-port precheck is what the bisect used and it is sound, but it is not *proof* of which process
   answered — and the compose lane believed itself isolated and was not. Re-run as `T3`/`T4`/`C7` with
   pid, cwd and the server's self-reported port recorded. **The results are identical**, so the
   original readings were right; they were just not checkable.

## 6. What this changes

- **The candidate's journey tier is 27/29, not 21/29.** The one merge-caused regression is
  `meals-admin-setup`, already attributed to `55b2dcd`; the one pre-existing failure is
  `workforce-schedule-publish` (@live), unchanged at both endpoints.
- **No journey arrived with a walk it had never run.** The claim that six lanes shipped unrun walks is
  withdrawn; only `lane/meals-enrol-pretick` fails its own journey at its own tip, and that finding is
  the bisect's and stands.
- **The C6 flag against `workforce-kodeoversikt` should be withdrawn**, with the download receipt above.
- **`account-email-confirm` was never fixed by the composition** because it was never broken.
- Two instrument defects are worth landing on their own: `4772c13`'s port fix, and a harness that
  **refuses to run when it did not start the fixture it is talking to** — the failure mode here is
  that reuse is silent and every artifact it writes looks correct.

## 7. Method note, for the next lane

`CI=1` was necessary and not sufficient. The check that actually catches this is cheap: ask the port
who is listening (`lsof` pid + cwd) and ask the server what port it thinks it is on
(`/__fixture/health` answers `{"ok":true,"port":N}`, which a reused foreign server cannot fake). Both
are in `fixture-provenance.sh` and both belong beside every journey result, because **a receipt that
does not name the fixture that served it cannot be compared with another receipt.**

---

**Runner:** `run-journey.sh` (one spec), `run-tier.sh` (whole tier), `fixture-provenance.sh` (who served).
**Worktree:** `/Users/svendaneel/okam/web-arrival`, detached throughout, `core/` pre-populated at
`1bcab0b6` — which is the pin every ref in this triage declares, so `ensureCore()` borrowed nothing.
**Ports:** 3889/4889, asserted free before each run. **Never** 4010, and pid 73160 was never signalled.

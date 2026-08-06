# L-JOURNEY-PORT-HARDCODED — evidence

Baseline taken by this lane: **`e34977acebd59b223584158c33451b6f1ffd82c1`** on `feature/restaurant-modules`,
working tree carrying 132 dirty paths belonging to other live lanes. Nothing outside this lane
directory and the one spec line below was written by this lane.

## The finding, confirmed

`test/e2e/journeys/meals-statement-month.spec.js:72` (before this lane):

```js
const api = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:4010';
```

**Sibling census — the brief says "four sibling specs"; the precise count is three specs plus the
shared harness helper, four call sites in total.** All four already read the variable:

| site | line |
|---|---|
| `test/e2e/journeys/account-email-confirm.spec.js` | 48 |
| `test/e2e/journeys/growth-guest-lifecycle.spec.js` | 58 |
| `test/e2e/journeys/growth-testsend-refusal.spec.js` | 47 |
| `test/e2e/support/journey.js` | 524 — this is what writes `apiBaseUrl` into **every** artifact |

The last one is why the defect is invisible in an artifact: `journey.js` records the port the run was
*given*, while the spec talked to 4010. A run's own record would have said `apiBaseUrl:
http://127.0.0.1:4318` while its API calls went to 4010, and nothing in the file would contradict it.

## Why the full unfixed walk was deliberately NOT run

`meals-statement-month`'s first use of that base is a **mutating POST** —
`/v1/stores/<id>/meals/statements/drafts` (line 114), followed by `/finalize` (line 152), which the
spec's own header calls **irreversible**.

At the time of this lane, `127.0.0.1:4010` was answered by a **live fixture belonging to another
lane's worktree**: pid 73160, `node -e require('./test/e2e/fixture/api-server.js')`, cwd
`/Users/svendaneel/okam/wt-jwf`, started 16:03, with that lane's `nuxt-ts` compiling alongside it.

Running the unfixed spec on a non-default port would therefore have **created and then finalized a
statement inside a sibling's running world** — the precise damage this lane exists to prevent, and a
worse version of the artifact displacement the finding lane already caused. So the old code's failure
was proven over the wire with **read-only** calls instead. Both sides are still real network calls in
a real Playwright run on a non-default port; only the mutation was withheld.

## RED — the old expression, on a non-default port, over the wire

Harness (lane-local, writes nothing outside this directory):
`portproof/port-resolution.spec.js`, `portproof/playwright.portproof.config.js`.
It starts **its own** fixture on the non-default port with `reuseExistingServer: false` — silently
borrowing somebody else's fixture is the failure under investigation, so this proof refuses to do it.
It also refuses to run at all on port 4010, where it would prove nothing.

```
E2E_FIXTURE_PORT=4318 npx playwright test -c lanes/L-JOURNEY-PORT-HARDCODED/portproof/playwright.portproof.config.js
```

Result — `portproof/red-run-4318.txt`: **1 failed, 1 passed.**

The failing test is the old expression. `portproof/resolution.jsonl` records what each base actually
reached, asking `/__fixture/health`, which answers with the port it is listening on:

| expression | resolved to | answered by |
|---|---|---|
| **OLD** (hardcoded) | `http://127.0.0.1:4010` | **HTTP 200, `{"ok":true,"port":4010}` — a different, live fixture** |
| **NEW** (reads the var) | `http://127.0.0.1:4318` | HTTP 200, `{"ok":true,"port":4318}` — this run's own fixture |

This is the failure mode in its dangerous form rather than its loud one: the old base was **not
refused**. It was answered, with a 200, by a world this run did not build. A walk continuing from
there would have read and written a stranger's fixture and reported on it.

## GREEN — the real journey, on a non-default port

Fix applied at `test/e2e/journeys/meals-statement-month.spec.js:79` (comment above it explains why):

```js
const api = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));
```

```
E2E_FIXTURE_PORT=4318 E2E_WEB_PORT=3318 npx playwright test test/e2e/journeys/meals-statement-month.spec.js
```

Result — `green-run-4318.txt`: **1 passed (37.5s)**, exit 0, all 12 steps passed, `error: null`.

From the artifact it wrote, `artifacts/journeys/meals-statement-month.playwright.json`:

```
status                 passed          baseUrl               http://127.0.0.1:3318
backend                fixture         apiBaseUrl            http://127.0.0.1:4318
commit                 e34977ac        backendServed         12
foreignSubjectServed   0               backendSubjectServed  5
proxiedSubjectServed   0               backendSample         POST http://127.0.0.1:4318/user/login -> 200 …
```

`foreignSubjectServed: 0` is the load-bearing number: **no other origin served this walk.** Both the
browser traffic and the API-context traffic went to the run's own fixture on 4318. The four `note`
findings the run carries are pre-existing and about the meals module, not this change.

### A second non-default port, because one is not portability

A spec proven on exactly one port is only marginally better evidence than a spec proven on 4010 — the
brief's own argument. So the walk was run again on a *different* non-default pair:

```
E2E_FIXTURE_PORT=4319 E2E_WEB_PORT=3319 npx playwright test test/e2e/journeys/meals-statement-month.spec.js
```

Result — `green-run-4319.txt`: **1 passed (27.5s)**, exit 0, 12/12 steps, and the artifact records
`baseUrl http://127.0.0.1:3319`, `apiBaseUrl http://127.0.0.1:4319`, `foreignSubjectServed 0`,
`proxiedSubjectServed 0`. The journey follows whatever port it is given.

Default-port behaviour is unchanged by construction — `E2E_FIXTURE_PORT || 4010` falls back to the
same literal — and was not re-run, because 4010 was owned by lane `wt-jwf` throughout.

## Artifact slots — what this lane touched, and what it preserved

`ARTIFACT_DIR` is hardcoded (`test/e2e/support/journey.js:155`) and **the fixture backend key is the
constant string `fixture` regardless of port** (`artifact-store.js:315-320`). So a run on 4318 writes
to exactly the same slots as a run on 4010. That is the mechanism behind the finding lane's
displacement, and it cannot be avoided by choosing a port.

Everything the run could touch was copied to `artifact-backup/` **before** anything ran:

| slot | before | after |
|---|---|---|
| `artifacts/journeys/meals-statement-month.playwright.json` | `7e932a11` (15:58 run) | `9ac6827b` (this lane's 4319 run) |
| `runs/meals-statement-month.fixture.playwright.json` | `7e932a11` | `9ac6827b` |
| `runs/meals-statement-month.fixture.superseded.playwright.json` | `07ce60d2` | **`07ce60d2` — untouched** |
| `meals-statement-month/fixture/*.png` (3 screenshots) | — | rewritten by this run |

The store reported `"supersedes": null`: the displaced record was an equal-rank passing fixture run,
not a stronger one, so the store did **not** consume the superseded slot — the older `07ce60d2`
record survives in place. The record this run displaced (`7e932a11`) is preserved whole at
`artifact-backup/`, together with the three screenshots it had taken.

Net: the canonical slot now holds a newer passing fixture run of the same journey at the same commit
— which is what `artifact-store.js` explicitly permits for the same lineage — and nothing that
existed before this lane has been lost.

Sibling state re-checked after the run: `127.0.0.1:4010` still answers `{"ok":true,"port":4010}`,
and no listener was left behind on 4318 or 3318.

## The spec is untracked, and that matters

`git status` reports `?? test/e2e/journeys/meals-statement-month.spec.js` — the file is **not in the
tree at `e34977ac`**. It belongs to an unmerged sibling lane that has not committed it yet.

Consequences, stated rather than assumed:

- The one-line fix lives in the **working tree**, where that lane will carry it when it commits.
- This lane did not commit it to `feature/restaurant-modules` and moved no ref.
- **Residual risk:** if the owning lane rewrites this spec wholesale rather than editing it, the fix
  is silently lost and the spec goes back to being green only on 4010. Whoever lands the meals
  journey should re-check line 79 against the sibling expression before merging.

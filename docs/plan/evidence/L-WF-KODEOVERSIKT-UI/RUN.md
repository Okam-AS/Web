# L-WF-KODEOVERSIKT-UI — the browser walk, rescued onto a path that outlives its worktree

Reason-shape hit: **(1) missing write-up, in its "committed nowhere a stranger can open" form.** The census
(`docs/plan/artifacts/instrumentless-exits.md`, Batch 2) declined it for exactly this and nothing else:

> **exit demands a button pressed on a page, and the evidence is worktree-only.**
> `lanes/L-WF-KODEOVERSIKT-UI/` does not exist in the plan repo; it exists solely under
> `/Users/svendaneel/okam/web-kodeui/`, an unpushed 4-commit worktree. Citing it would put an exit's proof at
> a location that dies with `git worktree prune`.

The work itself was never in question. What was missing is a copy a stranger can open. The three files beside
this one are byte-for-byte `git show lane/wf-kodeoversikt-ui:<path>` extractions, taken today:

| file here | source on the branch |
| --- | --- |
| `evidence.md` | `lanes/L-WF-KODEOVERSIKT-UI/evidence.md` |
| `journey-green.json` | `lanes/L-WF-KODEOVERSIKT-UI/journey-green.json` |
| `workforce-kodeoversikt.spec.js` | `test/e2e/journeys/workforce-kodeoversikt.spec.js` |

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line with the single path it is given:

```
evidence: lanes/L-WF-KODEOVERSIKT-UI/{evidence.md,journey-green.json} on lane/wf-kodeoversikt-ui @ f4c355b (worktree /Users/svendaneel/okam/web-kodeui, 4 commits, nothing pushed) + test/e2e/journeys/workforce-kodeoversikt.spec.js
```

Branch state measured today, not copied from that line: `lane/wf-kodeoversikt-ui` is at
`19ad0015ed62c0854300ec3268fb0c8d5eca5eeb` (one commit past `f4c355b`, which added the RETURN), still
unpushed, still not an ancestor of anything landed.

## The exit, clause by clause, against the journey artifact

`journey-green.json` records a real Chromium run, `"status": "passed"`, eight steps, 61.6 s, started
`2026-08-04T18:59:02Z`, `"commit": "ba09fe35…"`:

| # | step | detail | exit clause |
| --- | --- | --- | --- |
| 1 | sign in as the manager (99999999 / 123123) | landed on `/admin/workforce-personnel-list` | — |
| 2 | the personalliste renders the seeded day | three participants on 2026-07-13, one of them uncoded | — |
| 3 | the § 8-5-6 caveat names the overview the page can produce | **the caveat names the issued template** | **clause 3** |
| 4 | the control is reachable and hit-testable at 1280×720 | control at 176×37 inside 1280px | — |
| 5 | pressing it downloads the kodeoversikt under the SERVER's name | **downloaded `okam-kodeoversikt-42-2026-07-13.csv`** | **clause 1** |
| 6 | the bytes are the template § 8-5-6 asks for | template carries 2 codes, 1 uncoded participant, retain-until 2030-06-30 | clause 1 |
| 7 | each click appended its own issue row | **two issue rows, distinct ids, both stamped with an actor** | **clause 2** |
| 8 | the page reported no console errors of its own | 2 shell-redirect entries recorded as a note | — |

Step 7 reads the issue row **back off the server** rather than inferring it from the request log — "the
browser sent a request" and "the handover was recorded" are different facts, and only the second is what
§ 8-5-6 leans on.

## Non-vacuity, from the lane's own mutation table

Three mutations, each applied, run, observed red, restored (`evidence.md`, "Non-vacuity proved by mutation"):

| mutation | result |
| --- | --- |
| delete the button block from the page template | RED — `locator('.wfpl-page__btn--register')` element(s) not found |
| revert `wfpl_identity_gap` to the pre-lane wording | RED — `Expected substring: "lastes ned fra personallistesiden"` |
| dedupe the issue record per business day | RED — `Expected length: 2 / Received length: 1` |

One per exit clause, which is what makes the three green steps above bite.

## What this artifact does not claim — and these are the lane's own words, not a softening

- **The backend under the walk is the in-repo fixture, not an API build.** `journey-green.json` says so in a
  field: `"backend": "fixture"`, `"backendBuild.detail": "the in-repo fixture backend, not an API build"`.
  So the issue row asserted at step 7 is a row in the fixture's append-only store, and the real table's
  retention lock — `GuardAppendOnly` plus the `AFTER UPDATE, DELETE` trigger that `ROLLBACK`s and
  `THROW 50018` — is **not** exercised here. `evidence.md` names that limit itself; the locking is the
  backend suite's ground, where it is already pinned. The wire path was verified by reading the handler at
  `8e2b57de` (`[HttpGet("personnel-list/code-register")]`, DI at `Program.cs:721`), not by driving it.
- **C5 is not met.** The RETURN's own line: *"C5 IS NOT MET AND I AM NOT CLAIMING IT. Sven has not walked
  this. What is proved is that a browser can."* `verified` here means the exit's sentence is established by
  an openable artifact; acceptance remains the owner's, and it needs this branch merged first.
- **`D-IDCODE` is `venue-procedure-template`**, so what ships is a *template*, not the register. § 8-5-6 is
  satisfied only once the venue fills in the fødselsnummer column and keeps it. The legal gap is
  **mitigated, not closed** — the lane recommends `F-WF-NOREG` stay open at reduced severity rather than
  auto-clear.
- **Two product gaps still hold**, unfixed: only `Employee` is ever set in production
  (`WorkforcePersonnelListProjection.cs:207`), and there is no correction path (`correctionActor` is null at
  both call sites). Both are § 8-5-6 obligations.

## One environment hazard worth keeping visible

The lane found an orphaned fixture server (PID 73160, PPID 1) holding port 4010 from another lane's worktree
(`wt-jwf`); Playwright's `reuseExistingServer` adopted it silently and served hours-old code, 404-ing routes
that exist. It was not killed — it was not this lane's — and the run moved to `E2E_FIXTURE_PORT=4021
E2E_WEB_PORT=3021`, which is what the `baseUrl`/`apiBaseUrl` in `journey-green.json` record. Any lane running
e2e on the default ports while that process lives is measuring a stale build.

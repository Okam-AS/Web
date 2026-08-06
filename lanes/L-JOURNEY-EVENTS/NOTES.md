# L-JOURNEY-EVENTS — detail

Commit: `a1a1ec8` on `feature/restaurant-modules` (local, not pushed).
Artifact: `artifacts/journeys/events-enquiry-to-settlement.playwright.json` — passed, 23/23 steps,
6 screenshots, 95 responses from the fixture, `commit a1a1ec84e`.
(`artifacts/` is gitignored by the repo's own rule — "the FILES are a record of a run, not source" —
so the artifact is on disk at the contract path and the tree carries the source that reproduces it:
`E2E_WEB_PORT=3061 E2E_FIXTURE_PORT=4061 npx playwright test test/e2e/journeys/events-enquiry-to-settlement.spec.js`.)

## What the walk does

One booking, nothing seeded, every step naming what the previous one produced:

1. public enquiry at `/events/inquiry/42` — succeeds **with `Events.Core` off**; the guest is handed a
   reference (`F-EV-INQUIRY-UNGATED`, open for a ruling, asserted as it is rather than as it ought to be)
2. host signs in — the pipeline is **dark** for the same store, the consequence of (1) made visible
3. `Events.Core` on through `/admin/feature-flags` (the product's own lever, never a seeded row)
4. the enquiry appears, found by the **guest's own contact name** — the join that proves identity
5. proposal drafted (server prices 40 x 895,00 = kr 35 800,00) and sent; the guest link read off the page
6. **`Events.Core` off** -> the guest presses accept -> refused, no receipt, state unmoved
7. **`Events.Core` on** -> the same press on the same token -> receipt naming version 1 + the content hash
8. `Events.Settlement` on; start service, close, invoice line, reconcile, close statement
9. the booking reads `Oppgjort`, the statement `Closed` at kr 35 800,00

## Non-vacuity

- The two arms are the same walk, one variable, flipped through the operator's lever.
- The refusal is asserted to be **the right refusal**: `EVENTS_PROPOSAL_NOT_FOUND`'s sentence
  ("Vi finner ikke det lenken peker på"), and explicitly **not** `EVENTS_DISABLED`'s
  ("Dette er ikke tilgjengelig akkurat nå"). A gate answering the second would tell an anonymous
  caller which venues bought the module.
- MUTATION: the gate line removed from `test/e2e/fixture/events.js` -> the run FAILS
  (`lanes/L-JOURNEY-EVENTS/mutation-gate-removed.log`, exit 1, `[data-test="refusal"]` never appears)
  and the mutant artifact records **zero** accept refusals
  (`lanes/L-JOURNEY-EVENTS/mutant-run-artifact.json`). Restored -> green again.
- Step 22 does not blanket-filter its own 404s: every failed request is matched against the set of
  refusals the walk asked for, and the accept is asserted to have been refused **exactly once**.

## Fixture change

`test/e2e/fixture/events.js` is new and owns every `/events` route, public and admin. The routes moved
out of `api-server.js` because the store gate on the public writes needs the admin half's knowledge of
which venue a token belongs to.

Consequence that had to be settled: the standing world's two proposal tokens now need a venue that HAS
the module (a sent proposal only exists because one drafted it). They belong to
`world.GUEST_VENUE_STORE_ID = 43`, whose `Events.Core` override row is seeded in
`world.seededFlagOverrides()`. Store 42 keeps its empty deny-closed flag state, so
`events-runsheet-onboarding`'s "before any switch is flipped, the venue is dark" control still means
something. `ADMIN_EVENT_DETAIL`'s version got its own token (`ADMIN_PROPOSAL_TOKEN`) because one token
resolving to two stores would make the gate unmodellable.

## Verification

- new journey: green x3 (initial, post-mutation restore, post-commit)
- `events-guest-proposal` + `events-runsheet-print`: **green after the change** (the two journeys whose
  fixture code paths were rewritten) — `lanes/L-JOURNEY-EVENTS/siblings-after-change.log`
- `npx jest`: 110/110 suites, 2481/2481 tests
- `npm run test:e2e:guard-proof`: all 7 arms held
- `OKAM_API_REPO=~/okam/OkamAPI-ev-acceptgate npm run test:e2e:fixture-divergence`: 1 divergence over
  12 anchored routes, pre-existing and Growth's (`test-sends` 403), unchanged by this lane
- wire-level rehearsal of the whole lifecycle, 28/28: `lanes/L-JOURNEY-EVENTS/wire-rehearsal.js`

## Open, named rather than left implicit

- **No `/events` route carries a divergence anchor**, so none of these refusals is compared against a
  real checkout. That was already true when they lived in `api-server.js`; it is now written down at
  the foot of `events.js`. Anchoring the family is its own piece of work (~40 refusals, 5 controllers)
  and would report this fixture as AHEAD of the integration tip on the accept/decline gate, which only
  exists on `lane/ev-accept-gate` (8eee00f7).
- The reconcile TRUTH model (`truthOf`) answers a hand-authored line's own figure for `Manual` and
  `InvoiceRef` sources and null for `Deposit`/`OrderRef`/`JournalRef`. It was derived from the
  backend's described behaviour, not read line by line off the seam implementation; if the real seam
  answers null for `InvoiceRef` on an unwired deployment, then no statement could ever be closed there
  and that is a product finding rather than a fixture bug — worth one lane's look.
- `backendBuild` reads `+dirty` because the checkout carries other lanes' untracked files
  (`docs/plan/`, `scripts/`, `world.config`). Nothing of this lane's is uncommitted.

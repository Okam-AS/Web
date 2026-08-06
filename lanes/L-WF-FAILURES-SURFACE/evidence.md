# L-WF-FAILURES-SURFACE — the honest delivery record reaches an operator's screen

## Baselines I measured myself

| Repo | Path | Branch | Commit |
|---|---|---|---|
| Frontend | `/Users/svendaneel/okam/Web-modules` | `feature/restaurant-modules` | `e34977acebd59b223584158c33451b6f1ffd82c1` |
| Backend (checkout as found) | `/Users/svendaneel/okam/OkamAPI-modules` | **`lane/meals-grace-pins`** | `34c6c10317ae2cde275aae6d8732b7f3ac3364b1` |
| Backend (contract read) | same repo, read via `git show` | integration tip | `8e2b57de` |

The backend checkout was **not** on the integration branch, as the brief warned. I never checked it
out — every backend fact below was read out of `8e2b57de` with `git show`, leaving the shared
worktree untouched.

## The route, verified before anything was built against it

`Controllers/WorkforceSchedulesController.cs:243` at `8e2b57de`:

```
[HttpGet("schedules/notification-failures")]     on  [Route("workforce/stores/{storeId:int}")]
```

So the path in the brief is real: `GET /workforce/stores/{storeId}/schedules/notification-failures`.
It returns a **bare JSON array** (no envelope) of `WorkforceNotificationFailureModel`, gated on
`WorkforceManager` (`WorkforceSchedulePublishService.cs:502`), filtered to
`Failed | DeadLettered | Withheld` and ordered `deadLetteredAtUtc desc, createdAtUtc desc`.
Enums serialise as **strings** — `Program.cs:113` → `AddControllersWithSerializerSettings`, which
`WebApi.Tests/Meals/MealsContractFixtureTests.cs:44` records as `StringEnumConverter`.

I confirmed the brief's reachability claim independently: `getPublicationHistory` exists in
`utils/workforce/schedule-client.js` with **zero callers**, and `notification-failures` /
`notificationFailures` had **zero hits** anywhere in the frontend before this lane.

## The distinction, and where it actually comes from

Reading `Services/Workforce/WorkforcePushNotificationDelivery.cs` pinned the two tiers precisely:

- **Store tier — `Withheld`, reason `PushNotConfigured`.** `IsConsumerPushConfigured(storeId)` is
  false, so *nothing was attempted*. Costs **no attempt**, carries **no dead-letter stamp**, and the
  backlog survives until the credential lands. A store on its first day is here. **Not a failure.**
- **Worker tier — `Failed`/`DeadLettered`, reasons `NoPushRegistration` / `NoPushTarget`.** An
  attempt *was* made against a configured hub and this named worker was not reached. Spends the
  budget and dead-letters. "No retry can invent a device."

**A constraint I found rather than assumed:** only the *push* adapter can withhold. The SMS, e-mail
and in-app adapters can only succeed or fail (`git grep Withhold` across the four adapters returns
push only). So on a single store, at a single moment, `Withheld` and `NoPushRegistration` are
**mutually exclusive** — the first needs the credential absent, the second needs it present. That is
why the fixture seeds one historical dead letter (documented in place); without it the report's most
important worker-tier reason is unreachable from a browser at all.

## What was built (client + page + nav, one change — C3)

New:
- `utils/workforce/delivery-failures.js` — the tier judgement, pure. `tierOf` maps status→tier and
  deliberately returns `null` for an unrecognised status rather than defaulting into either tier.
  `summarise` returns per-bucket counts and **no combined total**, so no caller can render
  "3 failures" over one unreached worker and two rows waiting on a credential.
- `components/admin/workforce/WorkforceDeliveryPanel.vue`, `WorkforceDeliveryGroup.vue`
- `pages/admin/workforce-delivery.vue`
- `test/e2e/fixture/workforce-delivery.js` — the outbox behind a publication
- `test/e2e/journeys/workforce-delivery-failures.spec.js`
- `test/workforce-delivery-failures.test.js`

Modified (mine only):
- `utils/workforce/schedule-client.js` — `GetNotificationFailures` + route manifest line
- `components/organisms/AdminPageHeader.vue` — nav entry + icon
- `pages/admin/workforce-schedule.vue` — the link out of the publish flow, and its style
- `test/admin-nav-access.test.js` — the pinned `STORE_ADMIN_PATHS` entry
- `translations/{no,en,de}.ts` — keys added **surgically**, never bulk-edited

The shared checkout carries other lanes' uncommitted work (`WorkforceWeekGrid.vue`, the growth/meals/
training fixtures, `journey.js`, `guard-proof.js`, `pages/admin/meals-statements.vue`,
`pages/admin/training-evidence.vue`). **None of it was touched, reverted, stashed or cleaned.**
Nothing was committed and nothing was pushed.

## The stale-fixture trap — hit, diagnosed, worked around

My first journey run was on the **default ports** and behaved absurdly: every step through publish
passed, then the report rendered its *unknown* state. The cause was not my code. **PID 73160 has held
`127.0.0.1:4010` since 16:03**, running `test/e2e/fixture/api-server.js` from another lane's
worktree, and `playwright.config.js:88` sets `reuseExistingServer: !CI` — so Playwright **adopted a
five-hour-old fixture** that has neither my route nor my publish enqueue. It 404'd, and the panel
honestly reported that it could not read the report.

**That first run is discarded, not reconciled.** Every result below is from
`E2E_FIXTURE_PORT=4021 E2E_WEB_PORT=3021`. **PID 73160 was left running** — I did not stop a process
I did not start; the artifact records `apiBaseUrl: http://127.0.0.1:4021`, which is how a reader can
check which world answered.

## The browser journey

`npx playwright test test/e2e/journeys/workforce-delivery-failures.spec.js` on `4021/3021` —
**1 passed (1.7m)**. Steps as recorded in the artifact:

```
1. landed on /admin/workforce-schedule
2. workforce.publication on
3. draft open
4. 4 people staffed across 4 grid rows, 4 shifts on the grid
5. publish toast said: "Publisert til 3 mottakere."
6. arrived at /admin/workforce-delivery by clicking
7. 4 undelivered notifications listed
8. waiting group present, 1 row(s), worded as not-a-failure
9. gave-up 2 and waiting 1 are counted separately
10. three tiers rendered as 3 separately-counted groups
11. named: Kari Hansen, Ola Ansatt, Nina Nyansatt, Ola Ansatt — all with reasons, no addresses on screen
12. clickable at 1280×800 (92×44), and the refresh re-rendered the report
```

**The failure is provoked, not mocked.** The shifts are typed into the grid, the week is validated
and published through the real buttons, and publishing *enqueues* — the fixture then resolves each
command through the adapters' own rules. Nothing seeds a failure list into the view.

**The report is reached by CLICKING**, never by URL: step 6 follows `[data-testid="wf-delivery-link"]`
from the schedule page. A journey that navigated to `/admin/workforce-delivery` directly would prove
the page exists while leaving it unreachable in the product — the exact shape this lane was opened for.

**Step 5 vs step 7 is the whole point.** The toast reports **3** (rows enqueued); the report shows
**4** undelivered (three from this publish plus the historical dead letter). Those are different
numbers, and until this surface existed only the first was visible.

### A defect in my own first journey, found and fixed

The first passing version staffed rows by index and the toast reported **2** recipients, not 3 — two
shifts had landed on the same person and the SMS tier was never exercised. It passed anyway, because
nothing asserted the count. The step now walks **every** grid row and asserts how many people were
staffed, so that cannot recur silently. This is recorded rather than quietly corrected: it is the
same class of weakening the sibling publish journey's header documents.

## What the operator sees (screenshot 02)

Three groups, separately headed and separately counted, in `artifacts/journeys/
workforce-delivery-failures/fixture/02-the-delivery-report-tiers-apart.png`:

- **`Kom aldri fram — må leveres manuelt` (2)** — red. Kari Hansen / Email / `SmtpException`;
  Ola Ansatt / Push / "Ingen enhet er registrert for denne personen."
- **`Forsøkes på nytt` (1)** — amber. Nina Nyansatt / Sms, "Forsøk 1 av 5", next attempt stamped.
- **`Venter på butikkens push-nøkkel` (1)** — **neutral grey**, reading *"Ingenting har feilet her …
  Dette er ikke en feil."* with **"Forsøk 0 av 5"**.

The waiting group is deliberately **not** coloured as a fault. A store awaiting its first credential
has not failed at anything, and tinting it red is the flattening this surface exists to prevent.

## Honest states, and the two hazards the brief named

- **Four states, never three.** loading / **unknown** / **clean** / rows. A read that could not run
  renders `wf-delivery-unknown` ("Dette betyr ikke at alt er levert — vi vet ikke"), never the empty
  state. The unit test pins that `summarise(DELIVERY_UNKNOWN).clean !== summarise([]).clean`. This is
  not theoretical: it is exactly what the stale-fixture run rendered, and it told the truth.
- **The surface shows its own outcome.** The refresh control re-renders the report and the journey
  asserts the groups are still there afterwards — not a blank panel.
- **1280 hit test.** Asserted with `elementFromPoint` at the control's centre, not merely
  `toBeVisible()`: 92×44 at 1280×800 and the click lands on the control itself. The groups are a
  stacked list, not a table in a grid track, so there is no neighbouring column to win the hit test.
- **No secrets, no addresses (C7).** The model carries a *presence* label only, and the journey
  asserts the rendered page contains neither `kari@example.test` nor `+4790000009`. Nothing is
  logged. An unexplained code (`SmtpException`) is printed verbatim under a sentence admitting it is
  unexplained — never guessed at, because provider prose is exactly what the backend redacts.

## Suites

- `npx jest test/workforce-delivery-failures.test.js test/admin-nav-access.test.js` →
  **2 suites, 40 tests, all passing.** The nav test is the enforcement one: it walks `pages/admin/`
  and reds if a `workforce-*` page has no sidebar entry, asserts the rendered store-admin paths equal
  the pinned list exactly, and asserts no two nav labels collide in **any** of no/en/de.
- Playwright journey → **1 passed**.

## Evidence committed vs not

**Nothing is committed** — the branch is shared and the brief forbids it. The source files listed
above are uncommitted working-tree changes. `artifacts/` is gitignored, so the journey JSON, the
ledger line and the three screenshots exist **on disk only**:

```
artifacts/journeys/workforce-delivery-failures.playwright.json
artifacts/journeys/runs/workforce-delivery-failures.fixture.playwright.json
artifacts/journeys/workforce-delivery-failures/fixture/01-published-with-the-enqueue-count-in-the-toast.png
artifacts/journeys/workforce-delivery-failures/fixture/02-the-delivery-report-tiers-apart.png
artifacts/journeys/workforce-delivery-failures/fixture/03-after-refresh-at-1280.png
```

## What this run does NOT prove, stated plainly

The journey is `backend: "fixture"`, and the artifact says so itself — the harness stamps
`fixture@e34977a-dirty`, so it cannot be mistaken for a live pass. **No live backend was run.** The
SQL slot was genuinely unavailable: the cap is `sql=2`, both running SQL containers
(`okam-lvsp-sql`, `okam-lwr-sql`) belong to other lanes and one sits at 1.34 of 1.56 GiB, the harness
SQL container is exited, and my brief grants `node` and "no container". `Scripts/demo/demo-up.sh`
would *borrow* a running SQL server, but that means creating a catalog inside a container I did not
start, which I judged out of bounds.

So: this proves the **wire** — nav → page → client → route → render, with the tiers intact and the
failure emerging from a real publish. It does **not** prove the live API's serialisation of this
model against a real database. The contract was read from `8e2b57de` rather than exercised. An
`@live` run of this journey, once a SQL slot is free, is the remaining step; the fixture holds the
contract deliberately (bare array, `WorkforceManager` gate, the three statuses, the sort order) so
that run should be a re-point rather than a rewrite.

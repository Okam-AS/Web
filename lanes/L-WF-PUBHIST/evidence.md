# L-WF-PUBHIST — use the publication history or delete it

Baselines, taken and named myself:

- frontend `/Users/svendaneel/okam/Web-modules` — `feature/restaurant-modules` @ `e34977ac`
- backend `/Users/svendaneel/okam/OkamAPI-modules` — checkout was on **`lane/meals-grace-pins` @ `34c6c103`**,
  not the integration branch. I read the contract from `feature/restaurant-modules` @ `8e2b57de`
  with `git show` and never checked it out.

## 1. The reachability question, answered before deciding anything

`GetPublicationHistory` is the **only one of the eleven** methods on `WorkforceScheduleService` with
no caller. Checked, each negative:

| check | result |
|---|---|
| literal name in `.vue`/`.js`/`.ts`/`.json`, incl. `.nuxt/` build output | definition + own URL only |
| Vue 2 `with(this)` mixin resolution | `plugins/global-mixin.js` declares ~50 `_xxxService` computeds and **none** is a workforce schedule service; the three importing pages each declare their own local computed |
| dynamic dispatch — `this[var]`, `$options.methods[...]`, `'Get' + …`, `Proxy`, `Reflect.*` | zero hits in app code |
| a wrapper binding every method of the client | none exists |
| the three importers | `workforce-schedule.vue` (9 methods), `workforce-requests.vue` (2), `workforce-delivery.vue` (3) — **none** calls it |
| e2e fixture | `api-server.js` had no `/schedules/publication-history` handler at all |
| unit test | `test/workforce-schedule-client.test.js` covers its neighbours, not it |

The recipients endpoint `GET /schedules/publications/{id}/recipients`
(`WorkforceSchedulesController.cs:219`) had **no client method at all**, and **no backend test** —
`GetRecipientsAsync` has zero references under `WebApi.Tests/`.

## 2. Why build rather than delete

Deletion was a live option and I did not take it, on evidence rather than preference:

- A journey lane walking the real week run graded the absence `severity: gap` — *"a manager cannot
  see who acknowledged a published week … A venue that must show it rostered someone cannot produce
  that from this UI"* (`lanes/L-JOURNEY-WORKFORCE/week-run-without-port.playwright.json:195`).
  That is a product gap finding, not a dead-code finding.
- `GetPublicationHistoryAsync` carries a real convergence proof — deterministic ordering across 40
  ranges × 3 publications (`WorkforceScheduleConvergenceTests.cs:91`).
- Nothing else answers the question. The delivery report answers *"what could not be got OUT"*;
  neither it nor the publish toast answers *"what came BACK"*. So the usual argument for deleting —
  that repairing unreachable code creates a second answer to a question something else already
  answers — does not apply here. There was no first answer.

Deleting would have erased the only server-side answer to a question a journey walk had just proved
a venue needs, and made the recorded gap permanently unclosable without rewriting the backend.

## 3. The one judgement: four attestations that never merge

`utils/workforce/publication-receipts.js`. The backend's own enum doc draws the line first —
`WorkforcePublicationDeliveryState` *"tracks whether the schedule reached the worker, INCLUDING the
manager's manual-delivery fallback"* and is *"distinct from the informational seen/acknowledged
receipt"*. So `deliveryState` describes the SEND; the timestamps describe what a PERSON did.

- **worker confirmed** — `acknowledgedAtUtc`. The only worker-attested receipt.
- **worker opened** — `seenAtUtc`, not acknowledged. Their act, weaker claim.
- **manager recorded by hand** — `manuallyDeliveredAtUtc` only. Evidence about the *manager*.
- **no receipt** — including `deliveryState: Delivered`. A transport accepting is not a person
  receiving; folding it into a receipt bucket would reinstate the false all-clear one layer up.

Strongest-first, so a row both confirmed and hand-delivered reads as confirmed. **No combined figure
is returned or rendered** — any single number would be read as "N of M were told", and none can
honestly say that.

## 4. Three things found in the wire rather than assumed

1. **`noticeLeadDays` arrives as 0 and that 0 is a DEFAULT.** Endpoint 21's projection sets sixteen
   fields and this is not among them, so every history row reads 0 — indistinguishable from a
   genuine same-day publication. Rendering it would have printed a compliance-shaped finding against
   every week in the store's history. It is dropped. (`cost` is null by design and also dropped;
   the model's own docstring says endpoint 21 leaves it null.)
2. **The recipients read can silently lose people.** `GetRecipientsAsync` INNER JOINs
   `WorkforceStaffMembers` and `WorkforcePersons`, so a recipient whose staff member is gone
   vanishes from the roster and only the history row's `recipientCount` remembers it. The page
   carries both numbers and **names the gap** rather than letting the short list stand as the answer
   to "who was told".
3. **Two grants, not one.** History is `WorkforceScheduler`; recipients is `WorkforceManager`
   (`WorkforceSchedulePublishService.cs:465`). A scheduler legitimately sees the list and gets a
   *stated refusal* for the roster — never an empty roster, which would read as a publication that
   reached nobody.

Superseded-ness is not a field: publications name only their predecessor, so it is inverted across
the whole list. Sound **only because endpoint 21 is unpaged**, which is written down at both the
client and the reader rather than assumed.

## 5. The change, whole in one diff (C3)

New: `utils/workforce/publication-receipts.js`, `pages/admin/workforce-publications.vue`,
`components/admin/workforce/WorkforcePublication{List,Recipients,ReceiptGroup}.vue`,
`test/workforce-publication-receipts.test.js`, `test/e2e/fixture/workforce-publications.js`,
`test/e2e/journeys/workforce-publication-receipts.spec.js`.

Edited surgically, all seven already dirty from sibling lanes before I started:
`utils/workforce/schedule-client.js` (`GetRecipients` + docs on `GetPublicationHistory`),
`components/organisms/AdminPageHeader.vue` (icon + nav item), `test/admin-nav-access.test.js`
(`STORE_ADMIN_PATHS`), `translations/{en,no,de}.ts`, `test/e2e/fixture/api-server.js`.

## 6. Driven by clicking

`E2E_FIXTURE_PORT=4023 E2E_WEB_PORT=3023 npx playwright test test/e2e/journeys/workforce-publication-receipts.spec.js`
→ **1 passed**. Sign in, flip `workforce.publication` through the operator's own page, draft, staff
every roster row, validate, publish — then **click the sidebar entry** (never a URL: the navigation
entry is the C3 wire under test) and click each publication.

What it asserts beyond "it renders": a week published seconds ago shows the same number the toast
celebrated as the number with **no receipt**; the four groups are four headings with their own
counts and no combined figure; a replaced week says so; a roster short of its own recipient count
names the gap.

**Stale-fixture trap avoided.** `[fixture] listening on http://127.0.0.1:4023` appears in every run,
so a fresh process bound each time. PID 73160 holding 4010 was checked with `lsof` and **left
running**.

## 7. Falsifiability, proven not asserted

Mutating `attestationOf` so a manager's hand-delivery reads as a worker confirmation:

- jest: **2 failed**, 25 passed
- playwright: **1 failed** — the by-hand group not found on screen

Both layers red. Mutation reverted and re-verified green. Transcript: `mutation-proof.txt`.

## 8. My own errors, found and fixed

- The journey first asserted *shifts typed* == recipients. This world has three staff and I typed
  four shifts, so publish deduped to three. Now asserted against the publish toast's own number —
  the same trap the delivery lane hit from the other side.
- The "no N of M" guard allowed `/` as a separator and matched the **rendered date**
  (`7/28/2026 Bekreftet`). Tightened to digits either side of the word.
- I applied this lane's own rule to my own diff and removed an exported option
  (`readNoticeLeadDays({ fromPublishResponse })`) and two row fields no caller read. The decorated
  row's shape is now pinned by a test.

## 9. Suites

`npx jest test/workforce-publication-receipts.test.js test/admin-nav-access.test.js
test/workforce-schedule-client.test.js test/workforce-delivery-failures.test.js`
→ **4 suites, 76 tests, all green**, including the nav converse walk that reds on any module page
with no sidebar entry, and the per-locale label-uniqueness checks.

## 10. NOT proven

- **No live backend ran.** The journey is `@fixture` and the fixture is my own module. The brief
  granted no container and I started none. An `@live` re-point is the remaining step.
- **The split grant is not journey-proven.** The fixture's only capability stand-in is one
  `!administers` 403, so it cannot tell `WorkforceScheduler` from `WorkforceManager`. The page's
  manager-only refusal is covered by construction and by the nav/unit layer, not by the walk. Stated
  rather than papered over.
- **C5: nobody has walked this.** A green suite and a green journey are not acceptance. The page is
  at `/admin/workforce-publications` behind the sidebar entry *Publiseringskvitteringer*, ready for
  Sven to walk.

Nothing committed, nothing pushed. Other lanes' uncommitted files in the shared checkout were not
touched; the two `components/admin/pos/*` files that changed mid-session belong to a concurrent lane.

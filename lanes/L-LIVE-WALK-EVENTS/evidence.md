# L-LIVE-WALK-EVENTS — the wire that kept Events off a live backend, and what is now ready

Frontend worktree: `/Users/svendaneel/okam/Web-modules-wt/L-LIVE-WALK-EVENTS`, detached at **8ac6f63**
(`The focus trap releases through a hook this Vue actually calls`). Not the primary checkout, which
carries 354 uncommitted paths, six under `test/e2e`.

Backend read at: `/Users/svendaneel/okam/OkamAPI-wt-L-LIVE-WALK-EVENTS`, detached at **8e2b57de** =
tip of `feature/restaurant-modules`. Created by this lane, read-only, never built and never run.
(`/Users/svendaneel/okam/OkamAPI` is on `feature/swiss` and has **no Events module at all** — a
checkout that answers every Events question with "does not exist".)

Ports bound by this lane: **4986 only**, for ~90 seconds, for the fixture used to falsify
`support/venue.js`; stopped afterwards and confirmed free. **4010, 4971 and 4973 were never touched**
— all three were held by foreign fixtures for the whole session.

---

## 1. THE FINDING: `Events:Enabled` is unset in the live world, and it darkens the whole module

The journey could not have run live, and the reason is not the store id its own header nominated.

`EventsController` **is its own action filter**, and it short-circuits before any action body runs:

```csharp
// Controllers/EventsController.cs:67-75
[NonAction]
public void OnActionExecuting(ActionExecutingContext context)
{
    if (!_moduleGate.IsEnabled)
    {
        context.Result = EventsProblemDetails.ToResult(
            EventsProblemException.Disabled(), HttpContext != null ? HttpContext.TraceIdentifier : null);
    }
}
```

Its own summary (Controllers/EventsController.cs:60-66) says MVC runs it before **every** `/events`
action, *"public and admin"*, and that while the module is dark *"every route short-circuits to 404
`EVENTS_DISABLED` before any action body runs, so the module is invisible, not half-present."* The
same `IActionFilter` shape is on `EventsRunSheetController`, `EventsNotificationsController` and
`EventsSettlementController`.

`IsEnabled` is a **process-start config read with a default of false**:

```csharp
// Services/Events/EventsModuleGate.cs:57,66
public const string EnabledConfigKey = "Events:Enabled";
_enabled = configuration != null && configuration.GetValue<bool>(EnabledConfigKey, false);
```

And the key **is declared nowhere**:

| file | `Events` section |
|---|---|
| `appsettings.json:182-185` | `"PublicBaseUrl": "https://okam.no"`, `"DispatchEnabled": false` — **no `Enabled`** |
| `appsettings.Development.json:44-46` | `"PublicBaseUrl": "http://localhost:3000"` — **no `Enabled`** |

The contrast is sharp and worth naming: `Growth` (appsettings.json:175-181) carries an explicit
`"Enabled": false`. Events does not even have the field, so nothing in a config file hints the switch
exists.

`test/e2e/scripts/live-world.sh` launches the API with `ASPNETCORE_ENVIRONMENT=Development` and no
module config at all. **Therefore, on every live world this branch can build, `POST /events/inquiries`
— the walk's very first act, before anybody signs in — answers 404 `EVENTS_DISABLED`.** Not the
pipeline, not the settlement: the first step.

### Why nobody had noticed

`live-world.sh` said, in the block that launches the API:

> No module config masters are set. … so `Events:Enabled` and `Growth:Enabled` would change nothing here.

That was **true of the three journeys that existed** — they live on the feature-flag board and the
workforce schedule, and neither surface calls a `/events` route. The flag *catalog* really is composed
unconditionally, so `/admin/feature-flags` renders all 18 rows **including every `Events.*` row** with
the module completely dark behind them. `events-deposit-precondition` therefore passes live while
arming `Events.Deposits` on a store whose every `/events` route is 404 — which is correct for what it
claims, and is exactly why the sentence got read as "Events needs no config".

### And the fixture models no outer switch at all

This is the third instance of the shape this lane was warned about. `test/e2e/fixture/` models the
**store-scoped** `Events.Core` flag faithfully and has **no notion of a deployment master**. So the
fixture-backed walk is green against a world the product cannot produce.

It is not merely a missing refusal — it inverts one the journey asserts. The walk's load-bearing arm
requires the off-flag accept to land on `EVENTS_PROPOSAL_NOT_FOUND` and explicitly **not** on the
`EVENTS_DISABLED` sentence:

```js
await expect(refusal).toContainText(REFUSED_NOT_FOUND);        // 'Vi finner ikke det lenken peker på'
await expect(refusal).not.toContainText(REFUSED_UNAVAILABLE);  // 'Dette er ikke tilgjengelig akkurat nå'
```

With the master unset, the controller filter emits `EVENTS_DISABLED` — the precise sentence the
journey asserts must not appear. The distinction is deliberate in the product
(`Services/Events/EventsProposalService.cs:54-58`: the uniform not-found *"never `EVENTS_DISABLED`:
the latter would confirm the token maps to a real proposal at a real store that simply has not opted
in, leaking both existence and store configuration to an anonymous caller"*), and the fixture cannot
tell the two apart because it only implements one of the two gates.

Codes read verbatim from `Helpers/Events/EventsErrorCodes.cs:19,21`:
`EVENTS_DISABLED`, `EVENTS_PROPOSAL_NOT_FOUND`.

---

## 2. WHAT WAS CHANGED, AND WHY EACH CHANGE IS THE MINIMUM

The journey was **not rewritten**. Its walk — order, screens, assertions, findings — is untouched.

### `test/e2e/scripts/live-world.sh` — the wire, closed the way the file itself prescribes

Its own header already said *"A journey that needs a module's ROUTES to answer adds its switch here
and says why, the way demo-up.sh does."* So: `Events__Enabled=true` on the API launch line (the
environment spelling of `Events:Enabled`), set as an env var rather than by editing somebody's
`appsettings`, and the stale "no module config masters are set" paragraph replaced with what is now
true and why.

**Two read-back probes** were added, because a variable in a launch line is not evidence, and because
turning a master on must not quietly seed the journey's answer. Both are read-only; neither creates an
event, a proposal or a flag row:

1. `GET /events/proposals/<random uuid>` must answer **`EVENTS_PROPOSAL_NOT_FOUND`**, not
   `EVENTS_DISABLED`. This is the one probe that separates *deployed* from *dark* without a store, a
   bearer or a fixture: while the master is off the filter refuses before the body runs; with it on
   the body runs, resolves nothing, and says so. The route is `{token:guid}`, so `uuidgen` is used —
   a malformed token would 404 on routing and prove nothing.
2. `GET /events/admin/{store}/events` must **still** answer `EVENTS_DISABLED`. The admin read ANDs the
   master with store-scoped `Events.Core`, which this world deliberately leaves deny-closed. If
   turning the master on ever began opening stores, the journey's own first finding — a guest holding
   a reference the venue cannot see — would become unprovable, and it now reds here instead.

The closing banner also records that this journey, unlike `events-deposit-precondition`, leaves the
world dirty: eleven writes, plus **two flag overrides it never clears** (`Events.Core`,
`Events.Settlement`). It can re-run against its own leavings (every subject carries a per-run tag);
what it breaks is any journey after it that expects the deny-closed board this world seeds.

### `test/e2e/support/venue.js` (new) — the store id, asked instead of assumed

The spec's header nominated its hard-coded `world.STORE_ID` (the fixture's store 42) as the blocker
and proposed reordering the walk to sign in first. **The diagnosis was right and the remedy was
wrong**: the enquiry arriving *before* anybody signs in is what makes the next two steps mean
anything, because it is how a member of the public reaches a venue that has not opened the module. A
version that signed in first would still show a dark pipeline but would no longer show a *stranger's*
enquiry landing in one.

So the venue is discovered **out of band, before the browser opens**, over the same `/user/login` the
login modal itself posts — the harness standing in for the one thing it honestly is: the venue handing
out its own link. Nothing in the product mints `/events/inquiry/{store}` for a stranger, so there is
no browsing path to walk and inventing one would invent a surface that does not ship.

Lowercase `/user/login` deliberately: ASP.NET routing is case-insensitive so `/User/login` works live,
but the fixture matches `path === '/user/login'` on the raw pathname and would 404 the capitalised
spelling. Lowercase is also what the shipped client posts (`core/services/user-service.ts:90`).

C7: the login response carries a bearer. It is never logged, never returned, never in an error
message — failures name the field and the number, the same discipline `live-world.sh` keeps.

### `test/e2e/journeys/events-enquiry-to-settlement.spec.js` — four edits, no walk changes

- the `fixture/world` import is **gone**; `Events.Core` / `Events.Settlement` are literals, as
  `events-deposit-precondition` spells them, because a flag key is a product fact
- `const STORE = world.STORE_ID` → resolved in a new step 0 from `venue.js`
- `tag: ['@live']` — which selects it in live mode and **still runs it in fixture mode**
  (`playwright.config.js` only inverts the filter when `E2E_API_BASE_URL` is set), so it stays one
  walk against both worlds with no `@live` branch to drift
- the header paragraph that flatly asserted "AND IT IS A FIXTURE RUN" now points the reader at the
  artifact's own `backend` field, since both values are now producible

### `test/journey-rerunnability.test.js` — a comment that had become false

Its exclusion list stated this spec "still pins the fixture's store 42 and still carries `@fixture`".
Neither is true now. The exclusion itself stands and is restated.

---

## 3. WHAT WAS PROVEN, AND WHAT WAS NOT

**Proven.**

- `npx jest test/journey-rerunnability.test.js` → **33 passed / 33**, at 8ac6f63 + these edits. The
  spec's own re-runnability guard still holds: per-run tagging, computed dates, no new copy literals.
- `venue.js` against a real fixture on **:4986** returned `"42"` — string, and exactly the constant
  the spec used to hard-code. **In fixture mode the walk is behaviour-identical to before.**
- `venue.js` falsified both ways: wrong code → throws naming HTTP 401 and the number, **with no
  response body in the message**; dead origin → throws naming the URL. It cannot silently invent a
  venue.
- `bash -n` on `live-world.sh`, `node --check` on both JS files.

**Not proven — and this is the honest boundary.** No live world was stood up, so:

- the two new probes in `live-world.sh` have **never executed**;
- the walk has **never run past step 0 against a real API**, so everything downstream of the enquiry —
  the pipeline join, the server-priced total, the send handover, the off-flag refusal *shape*, the
  content hash, start-service, close, the settlement line, reconcile, close — is **unverified against
  .NET**. The fixture hid one gate; there is no basis here for claiming it hid no others.

### The one residual a second read surfaced, by reading code and not by running it

A dedicated backend recon over the same checkout independently reached the same conclusion about
`Events:Enabled` — *"the only non-HTTP-reachable requirement is the `Events:Enabled` config key
itself, which no controller can flip at runtime"* — i.e. **nothing else in Events needs an
out-of-band seed row the way Workforce needs its legal employer.** That is the positive half: once the
master is on, a bare seeded world should be walkable through HTTP alone.

It also surfaced one thing to watch at the settlement end. Reconcile is **pure internal DB reads, no
external HTTP**, and the lifecycle it requires (`Confirmed → InService → Settling → Settled`) is
exactly the order this walk performs. But a settlement line of kind **`PosCheck`** reconciles against
order/journal rows a bare world has none of, and would land in **`Discrepancy`** rather than
`Matched`. This walk files an **invoice** line, which is the kind that should reconcile cleanly with
no POS truth — and that is precisely what its step asserts (`Reconciled`, `Matched`). So the
expectation is that it holds; it is flagged here because **it is the assertion most likely to be the
next thing the fixture was hiding**, and nothing in this lane has run it.

---

## 4. WHY IT WAS NOT RUN

A live world needs a SQL Server container. This lane's brief grants `class: node · pts: 1`; it grants
no SQL slot, and the boundary reads *"Never start a container unless your brief grants the slot"* with
`caps sql=2` already spoken for. So none was started, and no container was touched.

**Headroom was not the constraint, and saying so precisely matters.** Measured with
`docker stats --no-stream`: **1.28 GiB of the VM's 7.65 GiB in use**, one foreign mssql (testcontainers,
churning — it was `reverent_dijkstra` early in the session and `great_jones` later, i.e. an active
.NET suite lane) plus its ryuk. There was roughly 6.3 GiB free. The block is the **slot policy**, not
RAM — unlike `L-ACCT-UIDX`, which was genuinely memory-bound. A lane holding a SQL slot can run this
now.

## 5. THE EXACT SEQUENCE THAT SHOULD PRODUCE THE ARTIFACT

```
OKAM_API_REPO=/Users/svendaneel/okam/OkamAPI-wt-L-LIVE-WALK-EVENTS \
SQL_CONTAINER=<a container you started> SQL_PORT=<yours> DB_NAME=OkamLiveJourneyEV \
API_PORT=<free> WEB_PORT=<free> test/e2e/scripts/live-world.sh
```

It now refuses to finish unless the Events master reached the API **and** the store is still
deny-closed. Then, from this worktree:

```
E2E_API_BASE_URL=http://127.0.0.1:<API_PORT> E2E_WEB_PORT=<WEB_PORT> \
    npm run test:e2e -- test/e2e/journeys/events-enquiry-to-settlement.spec.js
```

Do not bind 4010, 4971 or 4973. Restore the world afterwards before any other journey — this one
leaves two flag overrides behind.

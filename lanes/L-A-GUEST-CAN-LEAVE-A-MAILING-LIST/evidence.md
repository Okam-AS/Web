# L-A-GUEST-CAN-LEAVE-A-MAILING-LIST — the article 7(3) exit, walked by a guest with no session

verdict: **built**, with one thing this lane cannot do and does not claim.

Exit criterion, restated so it can be checked rather than believed: *a guest holding no session reaches an
unsubscribe surface from a dispatched message and completes a withdrawal against the deployed origins, shown
by a journey capture.*

Every clause of that is met except the literal hostnames, and the reason is stated in §7 rather than buried:
**this branch is not deployed, and deploying it is an owner-only action** (`D-PREFCENTRE-DEPLOY` is ruled
`deploy-the-branch`; `L-PREFCENTRE-DEPLOY-EXEC` is where that lives). What is proved instead is stronger than
a substitute — the *shape* of the deployment reproduced in a browser, **plus a read-only measurement of the
real deployed API showing it already answers this exact request the same way.**

## 0. What was branched from

| repo | worktree | branch | branched from |
| --- | --- | --- | --- |
| backend `OkamAPI-modules` | `/Users/svendaneel/okam/OkamAPI-modules-wt/L-A-GUEST-CAN-LEAVE-A-MAILING-LIST` | `lane/a-guest-can-leave-a-mailing-list` | `lane/gr-exit-wire-the-mail` **54a8bb51**, with trunk **9fb057d00** merged in (no conflicts) |
| frontend `Web-modules` | `/Users/svendaneel/okam/Web-modules-wt/L-A-GUEST-CAN-LEAVE-A-MAILING-LIST` | `lane/fe-a-guest-can-leave-a-mailing-list` | trunk **00d84d7** |

**Why the backend branches off the sibling rather than off trunk.** `lane/gr-exit-wire-the-mail` is the ruled,
built-unverified remedy for `F-GR-NO-EXIT-FROM-A-LIST` and it is **not an ancestor of the integration tip** —
without it no dispatched message carries an unsubscribe-page link at all, so there is nothing for a browser to
open. Its own base `8e2b57de` is 95 commits behind `9fb057d00`, so trunk was merged in: this walk measures the
branch that would deploy, not a fortnight-old one. Landing that sibling is a different lane's job and nothing
here does it.

**Why the frontend branches off trunk rather than off `lane/fe-gr-exit-wire-the-mail`.** Only one file was
needed from it — `pages/preferences/unsubscribe.vue`, whose two now-false sentences it deletes — and that file
is **byte-identical between the sibling's base and trunk**, so it was taken with `git checkout 814f04d -- <path>`
rather than re-authored. Taking the whole branch would have meant resolving a conflict in
`test/e2e/fixture/growth.js`, which trunk has since evolved and which no part of this lane's run touches: this
journey has **no fixture in it at all**.

Nothing is pushed. No container was started or touched. No migration. No `appsettings.json` change. No store
row. `Growth:Enabled` was never opened by anything but host configuration (§6).

## 1. The gap this closes, and why the three existing proofs cannot

`F-GR-NO-EXIT-FROM-A-LIST` records two independent blockers and says the second is the one that matters.
Blocker (a) — nothing links a guest to the exit — is closed on `lane/gr-exit-wire-the-mail` and proved three
ways: the footer composition at the service tier, the RFC 8058 surface at the wire tier, and a browser leg
(`growth-guest-unsubscribe`) whose §8 states plainly that **its backend is `test/e2e/fixture/growth.js`, not
the API.**

Blocker (b) is a claim about **what a browser is permitted to do**: the page is served from the consumer-web
origin, the API answers on another, and the API's CORS registration is `AllowAnyOrigin()` **without**
credentials. No existing tier can see it:

* a service-tier test calls a method — there is no origin and no browser;
* the wire tier runs the CORS middleware over `TestServer`, but nothing **enforces** its answer, because there
  is no browser to refuse the request;
* a fixture served from the app's own origin is **not cross-origin**, so the question is never asked.

## 2. The world — `WebApi.Tests/Growth/GrowthGuestExitWorld.cs`

The real composition root (`WebApi.Program.Main`) on **real Kestrel** over **real TLS**, on
`https://127.0.0.1:<port>`; the app on `https://localhost:<port>` behind a TLS front end. Different **host**
and different **port**, so the request is cross-origin **and** cross-site — which is the property that decides
both the CORS question and the cookie one.

**Real:** the composition root and its CORS registration, the MVC pipeline, the Growth crypto, the dispatch,
the footer composition, the token, the suppression write, the second campaign.
**Not real:** in-memory SQLite rather than SQL Server, the Fake mail provider, and loopback rather than
`okam.no` / `okamapi.azurewebsites.net`.

Four decisions in it that are load-bearing rather than incidental:

1. **It derives from `WireHost`**, so every containment property is inherited unchanged — machine-local
   secrets stripped out of configuration, every egress setting blanked, outbound HTTP denied, the
   application's hosted services removed. Building a second factory would have duplicated ~870 lines and
   quietly dropped one of them.
2. **Two hosts, and the second never serves anything.** `WebApplicationFactory` casts the built host's
   `IServer` to `TestServer` and throws if it is not one, so a single Kestrel host cannot be handed back to
   it. The Kestrel host is built and started first — it is the one on the socket and the one every
   secret-holding collaborator is resolved out of — and an inert TestServer host follows to satisfy the base
   class. Both share the one `SqliteConnection`, so there is exactly one database.
3. **The world is seeded BEFORE the application boots, and C1 is why.** `Program.Main` seeds the Growth
   consent-text baseline at startup, keyed on "does this locale have any version"; `GrowthWorld` seeds its own
   for the same locale. Booting first collides on the `(Locale, Version)` unique index — and the row in the
   way sits on `GrowthConsentTextVersions`, which carries `TR_GrowthConsentTextVersions_AppendOnly`. Deleting
   it to make room is precisely what C1 forbids. Seeding first needs no exception at all: the boot seed then
   no-ops, exactly as it does against any database that has been used before.
4. **The seed's crypto agreement is asserted, not assumed.** The seed needs a protector before the host is up
   to be asked for one, so both derive from one stated root and the two are then compared on a known address.
   A world seeded under one root and read under another is a world where no address is ever found and every
   refusal looks like correct behaviour.

## 3. The journey — `growth-guest-exit-cross-origin` (J-GUEST-EXIT-ORIGIN)

`test/e2e/journeys/growth-guest-exit-cross-origin.spec.js`, Chromium, under
`playwright.growth-guest-exit.config.js`. Artifact:
`artifacts/journeys/growth-guest-exit-cross-origin.playwright.json` (`"status": "passed"`), copied into
`journey/` here with its two screenshots.

**The link is copied, never constructed** — out of `world.json`, which the world wrote from the body
`GrowthFakeMailProvider` actually received. A journey that built its own URL would prove the page works and
say nothing about whether anything emits that address, which is the entire defect.

```
the dispatched message names an origin that is not the API's
  :: page https://localhost:3943, API https://127.0.0.1:5943, link on /preferences/unsubscribe
     with a 46-character fragment credential, from 2 dispatched messages
the guest holds no session with the API
  :: the browser holds nothing the API would receive
open the link, exactly as the recipient would
  :: the done card rendered on arrival, with no confirmation step
the withdrawal crossed the origin boundary and was permitted there
  :: POST https://127.0.0.1:5943/v1/growth/unsubscribe -> 200
the withdrawal opened no session, which is why it works at all
  :: no cookie on https://127.0.0.1:5943 after the withdrawal completed
the credential is gone from the address bar
  :: address bar reads /preferences/unsubscribe with no token
the backend recorded the withdrawal, and the next campaign honours it
  :: suppressions 1, next campaign — leaver Suppressed, control recipient ProviderAccepted
a second click on the same link is still a done card
arriving with no token at all is a stated state, not a blank page
```

`backendServed: 2`, `backendSubjectServed: 2`, `foreignSubjectServed: 0`, `consoleErrors: []`,
`failedRequests: []`. Screenshot 01 shows the done card: **"Du er meldt av"**.

**The withdrawal is EFFECTIVE, not merely acknowledged, and it is the BROWSER'S withdrawal being measured.**
After the browser's request lands, the world advances past `GrowthConsentProjection.FrequencyCapWindow` and
dispatches a second campaign. The leaver is `Suppressed`; **the recipient who never withdrew is
`ProviderAccepted`** — the control, without which the 7-day frequency cap alone would produce `Suppressed` and
the whole thing would pass against a withdrawal that did nothing.

## 4. Every claim was made to red under a mutation actually applied

| # | mutation | applied to | result |
| --- | --- | --- | --- |
| A | `policy.AllowAnyOrigin()` → `policy.WithOrigins("https://nowhere.invalid")` | `Program.cs:99` | **RED at step 3.** Console: *"Access to fetch at 'https://127.0.0.1:5943/v1/growth/unsubscribe' from origin 'https://localhost:3943' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present"*. `backendServed: 0`, `failedRequests: [POST … net::ERR_FAILED]`, and **no suppression was ever written** |
| B | the footer stops emitting the unsubscribe-page line | `GrowthMarketingFooter.AppendPlainText` | **RED before the browser opens**: *"The message body carries no session-free unsubscribe link on https://localhost:3943/preferences/unsubscribe"*, and no `world.json` is published at all |
| C | the withdrawal writes nothing and still answers | `GrowthPreferenceService.UnsubscribeAsync` — `WithdrawAsync` call deleted | **Steps 1–6 stay GREEN** (the endpoint 200s and the done card renders) and **step 7 alone reds.** This is the acknowledged-versus-effective discriminator |

Every mutation was restored and the tree re-checked clean (`git status --short` empty on the tracked files),
and the run re-run green afterwards. **Mutation A is the one that matters**: it is the only arm in this estate
that has ever shown the CORS decision reaching a browser, which is blocker (b) itself.

Stability: three consecutive full runs, three passes, before any of this was written up.

## 5. And the deployed origins were measured, read-only

`deployed-origins/probe.txt` — three GETs and one OPTIONS against public endpoints, nothing written anywhere:

```
https://okam.no/preferences/unsubscribe                     404
https://okam.no/                                            200
https://okamapi.azurewebsites.net/health                    200
OPTIONS https://okamapi.azurewebsites.net/v1/growth/unsubscribe
  Origin: https://okam.no  Access-Control-Request-Method: POST
  -> HTTP/2 204
     access-control-allow-origin: *
     access-control-allow-methods: POST
     access-control-allow-headers: content-type
```

**Read the last one carefully, because it settles blocker (b) against the real system rather than a
reproduction of it.** The DEPLOYED API already permits exactly this cross-origin, non-credentialed POST from
exactly the deployed consumer-web origin, and its answer is byte-for-byte the answer the local world gave.
So the CORS half of blocker (b) does not block this exit **in production either** — it blocks the preference
CENTRE, which needs a cookie this exit never asks for.

**What is left is one thing and it is not code:** `okam.no/preferences/unsubscribe` is a 404, because the
deploy pipeline publishes `main` and the page exists only on this branch. That is `L-PREFCENTRE-DEPLOY-EXEC`,
owner-owned, and `L-PREFCENTRE-DEPLOY-EXEC`'s own measurement already found the consumer half is the cheap one
— the page is a static route whose token rides the fragment, so merging to `main` serves it as-is.

**C6 consequence, stated because it is a live hazard rather than a note:** `GrowthSettings` defaults
`UnsubscribePageBaseUrl` to `https://okam.no/preferences/unsubscribe`, and the footer prints it in **every**
send. Landing the footer link without the consumer deploy converts a missing feature into a **broken art. 7(3)
promise on every dispatched message** — worse than today. The two must land together, in that order or
together, never the footer first.

## 6. `Growth:Enabled` stayed host-only, which the brief made a condition

`WireHost` already installs `Growth:Enabled=true` as an **in-memory configuration entry** — the host switch a
deployment sets — and this world inherits that unchanged. **No store row was written to open the module**, so
nothing here could route a live guest address over the dev fallback root. The one Growth key this lane adds is
`Growth:RootSecret`, also host configuration, and it is added precisely so the crypto root is **not** the dev
fallback derived from the JWT signing secret.

The exit was reachable without touching `Growth:MailProvider` at all: the Fake provider records what the
dispatch submitted, and that recording is where the link is copied from.

## 7. What this evidence cannot see

1. **The hostnames are not `okam.no` and `okamapi.azurewebsites.net`.** They are loopback. What is reproduced
   is the deployment's shape — https on both sides, two origins, two sites, no cookie, the real CORS
   registration — and §5 measures the real API's answer to close the transfer. The page itself cannot be
   walked on `okam.no` until it is deployed there, which no agent may do.
2. **No SQL tier ran and no container was available or permitted.** The database is in-memory SQLite. The
   suppression, delivery and dispatch behaviour proved here is EF-level, not trigger-level.
3. **The GET long-press leg has no browser leg here.** It is proved at the wire tier on the sibling branch.
4. **One recipient, one store, one locale.** The world is `GrowthWorld`'s fixed two-recipient snapshot.

## 8. Two findings that are not this lane's to fix

1. **The guest withdrawal page sets analytics cookies before any consent.** Recorded as a `defect` finding on
   the journey artifact rather than asserted on, because failing there would be this lane silently taking
   ownership of an app-wide decision. The browser arrived at `/preferences/unsubscribe` holding nothing and
   left holding `_ga`, `_gid`, `_gat` on the web origin. That is the app-wide analytics plugin, not anything
   Growth does — **but a GDPR art. 7(3) withdrawal surface, reached by a guest who has consented to nothing on
   that origin, is the worst page in the estate for it to be true on.**
2. **`test/e2e/support/journey.js` files a live run's screenshots under a key its own record contradicts.**
   `JourneyRecorder`'s constructor calls `store.backendKeyFor(meta)`, but `backendKeyFor` destructures
   **`build`** while `meta` carries **`backendBuild`** — so the picture directory is always `…-unidentified`
   on a live run while the JSON's key names the build (`live-5943-27b3273` here). The file's own comment says
   the opposite invariant holds: *"Computed once, and by the same function the store files the JSON with, so a
   run's pictures and its record can never end up under different names for the same backend."* It has been
   invisible until now because every previous live artifact on this branch had `backendBuild: null`. **The
   citation itself is still sound** — both sides derive from `pictureBase`, so the record points at files that
   exist — only the name is wrong. Not fixed here: it is a shared instrument three lanes are editing.

## 9. Suites

| tier | result |
| --- | --- |
| frontend jest | **164 suites, 3874 passed, 0 failed** — identical to trunk. This lane adds no jest test: the journey is a Playwright spec and the page change is comment-only |
| frontend journey `growth-guest-exit-cross-origin` | **1 passed**, three consecutive runs |
| backend `GrowthUnsubscribeExitReachabilityTests` + `GrowthOneClickUnsubscribeWireTests` | 24 passed, on the trunk-merged tree |
| backend tier | see `suites/backend-tier.txt` |

**Tests added: one.** `GrowthGuestExitWorldTests.The_guest_exit_world_serves_the_real_api_on_its_own_origin_until_a_browser_has_walked_it`
— a `[SkippableFact]` that SKIPS unless `GROWTH_GUEST_EXIT_WORLD_DIR` is set, so it never binds a port in a
normal tier run. It is the world, not an assertion about one.

## 10. Constraints

* **C1** — no `UPDATE` or `DELETE` against an append-only table, and §2.3 is where it bit: the ordering was
  chosen specifically so that no row on `GrowthConsentTextVersions` had to be removed.
* **C2** — no migration; the world runs `EnsureCreated` over the model, exactly as the wire tier does.
* **C3** — for a guest surface the **mail is the navigation entry**, and this run is the proof that the entry
  reaches the surface: the link is read out of a dispatched body and opened in a browser.
* **C4** — no money-path write is touched.
* **C5** — **not claimed.** Nothing is marked verified or accepted. The capture, the screenshots and
  `GUEST_EXIT_KEEP=1` exist so Sven can walk it himself; his acceptance is the gate.
* **C6** — no UI string was added or changed that names a statute. Two now-false sentences on the page were
  deleted in the same change that falsifies them. §5 states the statutory hazard the footer link creates if it
  lands ahead of the consumer deploy.
* **C7** — the handshake carries a working unsubscribe token, and **the world refuses to start unless
  `git check-ignore` agrees its run directory is ignored**; the run directory's `.gitignore` is `*` with
  `!.gitignore`, so no file it writes can be committed even by name. The outcome file the journey reads back
  carries a count and two delivery statuses — never the token, never an address. Every step's recorded
  `detail` quotes lengths and paths rather than the credential. **The harness sweeps every artifact for the
  token after every run, pass or fail**, and refuses to pass the sweep if it cannot read the token back out
  (a sweep that cannot find its needle would pass vacuously). No log or telemetry call was added anywhere.

## 11. Hazards observed and not touched

* **Orphaned servers, found and fixed rather than worked around.** The first version of the harness killed the
  `$!` of a **subshell** whose child was node, so the TLS front end survived cleanup and held its port; the
  next run refused to start. Fixed with `exec` so `$!` is node itself. The two leftovers were killed **by
  recorded pid after checking their command lines**, never by pattern.
* **A harness defect that passed three times before it failed.** The world originally polled its suppression
  table on a 250 ms timer while Kestrel served the browser's POST. Every context here shares one
  `SqliteConnection` and two threads on one connection is unsupported: the POST 500'd with *"The transaction
  object is not associated with the same connection object as this command"*. The browser now reports when its
  fetch has **returned** and the world reads afterwards — a concurrency fence, not the browser being believed,
  which mutation C is what proves.
* Ports 3971 and 5971 are refused by name in the harness. Every other port is checked free first and **the
  holder is never killed**.
* `node_modules` was symlinked into the frontend worktree from the shared checkout rather than installed.
* No `okam-lwtwo-*` container was touched. No container of any kind was started.

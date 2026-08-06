# L-CORS-WILDCARD-MEASURED — what the live API's open origin policy actually exposes

Brief `5e969d67`. Flag under measurement: `F-PROD-CORS-WILDCARD` (`docs/plan/plan.md:21139`).

**Boundary honoured.** Every network call below is either an `OPTIONS` preflight or an unauthenticated
`GET`. No cookie, no `Authorization` header, no API key and no request body was ever sent to production.
Nothing was written, no ref moved, no container started or touched, nothing pushed. §9 names what that
boundary cost me.

---

## 0. The one-sentence answer

The wildcard's survivability rests on a premise the plan already states — *"a bearer-token API where
nothing rides on ambient credentials"* (`plan.md:10232-10234`). **Measured, that premise is true for the
cookie half and false for the header half.** Nothing on the deployed API decides authorisation from a
credential the browser attaches by itself, so no cross-origin *cookie* path exists to abuse. But the
deployed API accepts **three** credentials carried in explicit request headers, and an explicit header is
not "credentials" in the CORS sense — so `Access-Control-Allow-Origin: *` makes all three **fully
script-readable from any origin on the internet**, preflight and actual response alike. That is measured,
not argued: §4.

---

## 1. Which code is deployed — production and the branch are two different programs

| | ref | measured how |
|---|---|---|
| **production** = `api.okam.no` / `okamapi.azurewebsites.net` | **`origin/master` @ `6c0b3a19`** | `.github/workflows/azure-webapps-dotnet-core.yml` on master: `on.push.branches: [master, test]`, and `github.ref_name == "master" → webapp_name=okamapi`. `test` → `okamtest`. |
| integration branch | `feature/restaurant-modules` @ `8e2b57de` | read at `/Users/svendaneel/okam/OkamAPI-grdelrec`, `git status --porcelain` empty |
| the named-policy fix | `lane/cors-followups` @ `17c12c20` | `/Users/svendaneel/okam/OkamAPI-corscred`; **not an ancestor of the integration tip** |

Backend read at the integration tip and at `origin/master` via braced revs (`git show "origin/master:path"`),
never at a worktree checkout — `/Users/svendaneel/okam/OkamAPI-modules` sits on `lane/meals-grace-pins`
@ `34c6c103` and is not what runs anywhere.

**Anyone fixing this must edit `master`.** `Program.cs:71-77` on master is the `AllowAnyOrigin()` /
`AllowAnyMethod()` / `AllowAnyHeader()` default policy, applied globally at `Program.cs:210 app.UseCors()`.
The correct file on the integration branch (`Helpers/ServiceCollectionExtensions.cs`, `AddOkamCors`) does
not exist on master at all, and the branch that has it has landed nowhere.

---

## 2. The wildcard, measured (2026-08-06 11:41–11:48 UTC, read-only)

Every probe below used `Origin: https://evil.example` — an origin nobody has published, nobody has
configured and nobody has a reason to allow.

| # | request | answer |
|---|---|---|
| A | `OPTIONS /api/Growth/Preferences`, `ACRM: POST`, `ACRH: content-type` | `204` · `allow-origin: *` · `allow-methods: POST` · `allow-headers: content-type` |
| B | `OPTIONS /api/Store`, `ACRM: PUT`, `ACRH: authorization,content-type` | `204` · `allow-origin: *` · **`allow-headers: authorization,content-type`** |
| C | `OPTIONS …/preferences/Email/Newsletter`, `ACRH: content-type,x-csrf-token,cookie` | `204` · `allow-origin: *` · `allow-headers: content-type,x-csrf-token,cookie` |
| D | `OPTIONS /api/Order/1`, `ACRM: DELETE` | `204` · `allow-origin: *` · `allow-methods: DELETE` |
| E | `GET /health` | `200` · `allow-origin: *` |
| M | `GET /Stores` | `200` · `allow-origin: *` · 61 476 bytes of JSON |
| Q | `OPTIONS /Stores/52/orders`, `ACRH: x-okam-apikey` | `204` · `allow-origin: *` · **`allow-headers: x-okam-apikey`** |
| R | `OPTIONS /api/external/menu/52`, `ACRH: x-api-key` | `204` · `allow-origin: *` · **`allow-headers: x-api-key`** |
| T | `OPTIONS /User/login`, `ACRH: content-type,authorization,x-okam-apikey` | `204` · `allow-origin: *` · `allow-headers: content-type,authorization,x-okam-apikey` |

**`access-control-allow-credentials` was absent from every single response.** That is the property that
keeps the cookie half closed, and it is the only thing that does.

### 2a. Two mechanics in these numbers that are not obvious from the source

1. **`AllowAnyHeader()` echoes, it does not emit `*`.** Compare B, Q, R, T: whatever the browser asks for
   comes back verbatim. This matters because the Fetch spec gives `Authorization` a **carve-out** —
   `Access-Control-Allow-Headers: *` does *not* cover `Authorization`, it has to be listed by name. An
   implementation that emitted a literal `*` would therefore have accidentally blocked cross-origin
   bearer calls. ASP.NET Core's echo **defeats that carve-out**, by name, every time. Probe B is the
   proof; nothing in `Program.cs` says so.
2. **The `*` is on actual responses, not only preflights.** Probes E and M show it on a `200`, and probe S
   (§4) shows it on a `401`. So the browser will hand the response body to script; the grant is not
   confined to the preflight.

### 2b. The one policy on the box that is scoped correctly — and the counter-example that proves it

`/mcp` and `/mcp/*` carry `.RequireCors(ClaimConstants.McpCorsPolicy)` (`Mcp/OkamMcpEndpoints.cs:22,35`),
a named policy built from `Mcp:AllowedOrigins` with explicit methods, explicit headers and
`WithExposedHeaders("Mcp-Session-Id")` (`Program.cs:80-86`).

Measured (probe F): a preflight to `https://api.okam.no/mcp` from `https://evil.example` answers `204`
with **no CORS headers whatsoever**. So the OAuth-bearer MCP surface — the newest and most privileged
thing on the deployed API — is already closed to browsers, by the exact shape the default lacks. The fix
for the default is not novel work; it is the shape sitting one method call away in the same `AddCors`
block.

---

## 3. Credential inventory — everything the deployed API will accept as a credential

Enumerated over `origin/master` (48 controllers). This is the list the exit criterion asks for.

| # | credential | how it is carried | where it is consumed on master | attached by the browser on its own? |
|---|---|---|---|---|
| 1 | **JWT** (`AddJWTAuthentication`, `DefaultAuthenticateScheme = JwtBearer`, `ServiceCollectionExtensions.cs:183-190`) | `Authorization: Bearer` header, set explicitly by JS (`core/services/request-service.ts:52`, `utils/workforce/api-client.js:117`, `utils/margin/api-client.js:173`) | every `[Authorize]` controller — the whole admin + consumer API | **no** |
| 2 | **`X-Okam-ApiKey`** — Edda.AI integration key | custom request header | `Controllers/StoresController.cs:1199-1211`, guarding `[AllowAnonymous] GET /Stores/{storeId}/orders?date=`, store IDs 52/53/54/57 | **no** |
| 3 | **`X-API-Key`** — external menu key (`ExternalApi:ApiKey`) | custom request header | `Controllers/ExternalMenuController.cs:16,34`, guarding `GET /api/external/menu/{storeId}` (class carries neither `[Authorize]` nor `[AllowAnonymous]`) | **no** |
| 4 | **`X-API-Key`** — Wolt auth-code callback key (`WoltSettings.AuthCodeEndpointApiKey`) | custom request header | `Controllers/WoltController.cs:496` | no — server-to-server, no `Origin` |
| 5 | **`__Host-OkamOAuthLogin`** cookie | cookie: `HttpOnly`, `Secure`, `Path=/`, **`SameSite=Lax`**, 15 min, `SlidingExpiration=false` (`ServiceCollectionExtensions.cs:63-77`) | `Controllers/OAuthAuthorizationController.cs:58` (`AuthenticateAsync`) on `~/oauth/authorize` + `~/authorize`; minted by `OAuthLoginController.cs:133-135` | **yes, but only on top-level navigation** |
| 6 | OpenIddict MCP access/refresh tokens | `Authorization: Bearer` | `/mcp` endpoints | no |
| 7 | `ARRAffinity`, **`ARRAffinitySameSite`** (`SameSite=None; Secure; HttpOnly`) | cookie, set by Azure App Service on every response | nothing — routing only | **yes, cross-site** |
| 8 | Vipps / Dintero / Stripe / Wolt / Surfboard / Postmark webhook secrets and signatures | request body / provider headers | various callback controllers | no — no `Origin` is sent |

Swept for the shapes that would have widened this list and found **none** on master: no controller reads a
credential from a query string (`git grep -nE '\[FromQuery\][^)]*(token|key|secret)' "origin/master" --
'Controllers/*.cs'` → empty), and the only other `Request.Headers` reads are the non-credential telemetry
pair `ClientPlatform` / `ClientAppVersion` (`StoresController.cs:1303-1304`).

**Row 7 is why "no cookie crosses today" would be a false claim.** One cookie is already `SameSite=None`
and rides every cross-site request the browser makes to this host. It carries no authority, so it changes
no outcome — but it means the browser is already willing, and only the *absence* of
`access-control-allow-credentials` stops a credentialed request from being made at all.

---

## 4. Which of them the wildcard makes reachable — row by row

The distinction that decides every row: **CORS "credentials" means cookies, TLS client certs and HTTP
auth attached by the *user agent*.** A header the script sets itself is not credentials, so
`credentials: 'omit'` + an author-supplied `Authorization` / `X-Okam-ApiKey` / `X-API-Key` is a
**non-credentialed** request, `ACAO: *` satisfies it completely, and the response body is readable.

| row | reachable cross-origin today? | why |
|---|---|---|
| **1 JWT** | **YES — fully, response readable** | preflight for `authorization` granted by name (B, T); explicit header ⇒ not credentials-mode ⇒ `*` suffices |
| **2 `X-Okam-ApiKey`** | **YES — fully, response readable** | preflight granted by name (Q); **actual `401` carries `allow-origin: *`** (S) |
| **3 `X-API-Key` external menu** | **YES — fully, response readable** | preflight granted by name (R); **actual `401` carries `allow-origin: *`** (S) |
| 4 Wolt callback key | no | server-to-server; no browser, no `Origin`, CORS never consulted |
| **5 `__Host-OkamOAuthLogin`** | **NO** | `SameSite=Lax` ⇒ never attached to a cross-site `fetch`/XHR; and its only consumers are top-level navigations, where CORS does not apply at all. The wildcard adds nothing here in either direction. |
| 6 MCP bearer | no | `RequireCors(McpCorsPolicy)` overrides the default; production answers a preflight with no CORS headers at all (F) |
| 7 ARR cookies | n/a | no authorisation decision reads them |
| 8 webhooks | no | no `Origin` |

**Probe S is the measurement that settles rows 2 and 3**, and it stayed inside the read-only boundary
because it needed no credential:

```
GET https://api.okam.no/api/external/menu/52      Origin: https://evil.example  →  401 · access-control-allow-origin: *
GET https://api.okam.no/Stores/52/orders?date=…   Origin: https://evil.example  →  401 · access-control-allow-origin: *
```

A `401` and a `200` traverse the same CORS middleware, which runs at `Program.cs:210` — before
`UseAuthentication()` at `:222`. The header is stamped by the pipeline, not by the action, so the `200`
body would carry it too.

**So the honest scope of the wildcard's exposure today is:** it grants any web page on the internet the
ability to *be a first-class client of the deployed API and read every answer*, for any caller that can
supply one of credentials 1, 2 or 3. It does **not** grant a hostile page the use of a victim's ambient
session, because there is no ambient session to use.

---

## 5. The paths that are reachable today, named end to end

### 5.1 `GET /Stores/{52|53|54|57}/orders?date=` — completed orders, guarded by a hardcoded literal

`Controllers/StoresController.cs:1191-1235` on `origin/master`, comment `// Used by Edda.AI`:

* `[AllowAnonymous]`, so the JWT pipeline never runs.
* The whole guard is `Request.Headers["X-Okam-ApiKey"]` compared with **a GUID written as a literal in the
  source file at `:1208`** — not a config key, not a secret store. (I am deliberately not reproducing the
  value here; the estate has paid twice for credentials written into artifacts, and C7 exists for that
  reason. It is one `git show "origin/master:Controllers/StoresController.cs"` away for whoever owns the
  rotation.)
* On success it returns every `OrderStatus.Completed` order for that store and date, with `Items`,
  `Options`, `DiscountUsages` and `RegularDiscount` eager-loaded, projected to `OrderApiModel`.
* Store allowlist is a second literal array: `{ 52, 53, 54, 57 }` at `:1213`.

**What the wildcard adds.** A shared secret in a custom header is the classic case that CORS *would* have
contained: without a grant, a browser refuses the preflight and the secret is only usable from a server.
Measured, the deployed API grants `access-control-allow-headers: x-okam-apikey` to `https://evil.example`
(Q) and stamps `allow-origin: *` on the actual response (S). So the wildcard converts a
server-to-server integration key into **an any-page-on-the-internet readable feed of four real stores'
completed orders**, for anyone holding the literal — which is everyone with read access to the repository
or to a deployed binary.

**Not previously recorded.** `X-Okam-ApiKey`, `Edda`, and the literal itself return zero hits across
`docs/plan/` and zero across `docs/plan/returns/`. This is a new finding, and the key half of it is
somebody's rotation, not a CORS change.

### 5.2 `GET /api/external/menu/{storeId}` — same shape, key from config

`Controllers/ExternalMenuController.cs:30-37`. Same mechanics as 5.1, one grade less severe on two counts:
the key is read from configuration (`ExternalApi:ApiKey`) rather than hardcoded, and menus are less
sensitive than orders. Preflight measured at R, actual `401` with `allow-origin: *` at S. Named because a
tightening that fixes 5.1 and forgets this one has fixed half a pattern.

### 5.3 `POST /User/login` — a ~100-year bearer token handed to script on any origin

`Controllers/UserController.cs:130-158` on `origin/master`. `UserController` is `[Authorize]` at class
level (`:15`), but `login` and `sendverificationtoken` both carry `[AllowAnonymous]`.

On success `login` returns `ApplicationUserModel` carrying:

* `.Token` — `_userService.GenerateJwtTokenAsync(user)`, and `Services/UserService.cs:547` sets
  **`Expires = DateTime.Now.AddDays(36500)` — roughly one hundred years**;
* `.AdminIn` — the list of stores this user is an admin of (`:145-147`).

The companion `POST /User/sendverificationtoken` (`:161-180`) makes the API send a real SMS, from okam's
own sender, to any phone number in the body. **It has no rate limiter.** `IOAuthSmsRateLimiter` exists and
is wired — but only into `OAuthLoginController.cs:63` and `:106`. The global
`AddFixedWindowLimiter("fixed", …)` at `Program.cs:134-141` is registered and never applied to a route.

**What the wildcard adds.** Both preflights are granted to `https://evil.example` (K, L, T), and the
response body is readable because `ACAO: *` is enough for a non-credentialed request. So a page hosted
anywhere can, with no attacker-side server at all: (1) make okam text a victim a genuine code, (2) collect
the code on its own form, (3) exchange it at `/User/login` and **read the century-lived JWT out of the
response**, (4) drive every `[Authorize]` route from that same page for the rest of the token's life
(preflight for `authorization` granted, B).

CORS is not what makes this phishable — the credential is a code the user types. What the wildcard removes
is the **need for any infrastructure**, and what the token lifetime removes is any natural end to the
consequence. Under a named allowlist step (3) fails at the preflight and the attacker must proxy through
their own host, which puts their IP in okam's logs instead of the victim's.

---

## 6. What becomes reachable the day the preference centre appears

**Confirmed not deployed** (public reads, this session): `GET /v1/growth/stores/1/consent-text` → `404`,
`GET /v1/growth/preference-session/preferences` → `404`. `EnableCors` appears zero times on the
integration branch. So today none of this is live; it is the *next* deploy.

The preference centre introduces the **first credential on the estate that a browser attaches by itself
and that an authorisation decision then reads**. `Controllers/GrowthPreferenceController.cs` on
`feature/restaurant-modules`:

* `:58-65` — endpoint 3 sets `growth_pref_session`: `HttpOnly`, `Secure`, **`SameSite=Strict`**,
  `Path=/v1/growth`, expiring with the session.
* `:194-209` — `TryAuthorizeSession` reads that cookie **plus** the `X-Growth-Csrf` header and validates
  the signed double-submit pair; deny-closed, 401 on any mismatch.
* Endpoints 4 (read preferences), 5 (write a consent decision), 7 (file a GDPR privacy request) are
  authorised by nothing else.

**Row 5 of §3 becomes row 5 *and* a new row, and the premise in `plan.md:10232-10234` expires with it.**
From that deploy onward, "nothing rides on ambient credentials" is no longer a true sentence about the
deployed API, and the reasoning that justified leaving the wildcard alone no longer holds — even though
the wildcard itself has not changed.

Three things become reachable, in the order they will actually happen:

1. **Nothing, at first — the page is simply broken.** `ACAO: *` with no `allow-credentials` is refused
   outright by every browser once credentials mode is `include`, so endpoints 3/4/5/7 die at the preflight
   with an opaque network error and no server log line. This is exactly the accident that has kept the
   wildcard survivable, and it is the accident that produces the pressure in item 2.

2. **The dangerous fix, which is the thing worth writing down.** ASP.NET Core **throws** at startup on
   `AllowAnyOrigin() + AllowCredentials()`, so nobody can reach the bad state by that route — the process
   will not boot. **`SetIsOriginAllowed(_ => true).AllowCredentials()` does not throw.** It is one line, it
   is the first result for the symptom, and it is what a person reaches for at 22:00 when the preference
   page 401s and the derived allowlist has the wrong origin in it. Applied to the **default** policy —
   which is the global one at `Program.cs:210` — it would make every route on the deployed API answer with
   the caller's own origin plus `allow-credentials: true`. Blast radius, measured against §3:
   * `growth_pref_session` is `Path=/v1/growth`, so *that* cookie only rides Growth routes — any origin
     could then read and rewrite a named person's consent state and file GDPR privacy requests as them
     (endpoints 4/5/7). Those rows are append-only consent-receipt evidence under C1.
   * `__Host-OkamOAuthLogin` stays protected — `SameSite=Lax` is a browser property no CORS header can
     override — so the OAuth authorisation surface does **not** open. Worth stating explicitly, because
     the instinct is to assume everything opens at once.
   * Rows 1–3 are already open (§4), so that line would add nothing to them; it would open exactly the
     cookie half.

3. **The correct fix is already built and mutation-proven, on a branch that is nowhere.**
   `lane/cors-followups` @ `17c12c20` derives the allowlist from the guest links Growth actually mints
   (`Growth:PreferenceCentreBaseUrl`, `Growth:ConfirmBaseUrl`, plus `Growth:GuestOrigins`), scopes it with
   `[EnableCors]` to endpoints 3/4/5/7 only, leaves endpoint 6 (RFC 8058 one-click, no `Origin`) on the
   default, and strips loopback origins outside Development. It is **not** on the integration branch and
   the integration branch is **not** on master. See `docs/plan/returns/L-CORS-LAND-FOLLOWUPS-1.md`.

---

## 7. Production and the branch disagree — three places, so nobody fixes a correct file

1. **`Program.cs` is correct nowhere that matters and wrong where it runs.** The `AllowAnyOrigin` block is
   at `Program.cs:71-77` on `origin/master`. On the integration branch that code has moved into
   `Helpers/ServiceCollectionExtensions.cs` (`AddOkamCors`), and on `lane/cors-followups` it is a named,
   credentialed, environment-aware policy. **All three are different files.** A fixer sent to
   "`Program.cs:97-102`" — the citation carried in `plan.md:22105` — will find neither the master line
   numbers nor the branch structure.

2. **The deployed frontend does not call `api.okam.no`.** Four of the deployed bundles at `okam.no`
   (`/_nuxt/215168c.js`, `518bb11.js`, `7968095.js`, `7d28a39.js`) contain
   `https://okamapi.azurewebsites.net` and no other API host — matching `nuxt.config.js:45`'s default.
   `azurewebsites.net` is a public suffix, so `okam.no` → `okamapi.azurewebsites.net` is cross-**site**,
   not merely cross-origin, and a `SameSite=Strict` cookie will never attach across it whatever CORS says.
   Sibling lanes derived this from source; **this is the same fact measured on the deployed artifact**,
   which is the form that matters when branch and production disagree. Executing
   `D-SPEC-L-GR-WITHDRAW-ORIGIN`'s api-subdomain ruling therefore requires an `API_BASE_URL` build-time
   change shipped with the frontend deploy — not just a DNS record. Both hosts are the same App Service:
   probe N shows `okamapi.azurewebsites.net` answering an identical wildcard preflight.

3. **`F-PROD-CORS-WILDCARD`'s `clears_when` is measurable but not yet meetable, and its stated route is
   the long way round.** *"the deployed API answers a preflight with a named origin rather than a
   wildcard, checked against the live host"* — re-measured 2026-08-06 11:48 UTC: **still a wildcard, still
   no `allow-credentials`.** The flag's text says its only route runs through `D-PREFCENTRE-DEPLOY`. That
   is true of the *credentialed* half. It is **not** true of §5: rows 2 and 3 of §4 are open on master
   today, have nothing to do with Growth, and would be closed by narrowing the default policy on `master`
   alone — which is a change to a file that exists, on a branch that deploys, with no lane merge in front
   of it.

---

## 8. Two things found on the way that are not CORS, recorded so they are not lost

* **A hardcoded integration key on the deployed branch.** `StoresController.cs:1208` — a GUID literal in
  source, guarding real order data. Rotation is owner work and the literal is in git history, so rotation
  is the whole fix; deleting the line is not. Not recorded anywhere in `docs/plan/`.
* **An unrate-limited SMS sender.** `UserController.cs:161-180` calls
  `_userService.SendVerificationTokenAsync` with no limiter, while the limiter that exists
  (`IOAuthSmsRateLimiter`) is applied only at `OAuthLoginController.cs:63,106` and the registered
  `AddFixedWindowLimiter("fixed", …)` at `Program.cs:134-141` is never attached to a route. Costs money
  per request, and §5.3 makes it drivable from any page.

Both are `@sven`-owned; neither is fixed by anything in this lane's remit.

---

## 9. What I could not measure, and why

* **The `200` bodies of §5.1, §5.2 and §5.3.** Reading them needs the API key or a real SMS code, and
  driving `/User/login` or `/User/sendverificationtoken` would create a user and send a message — writes,
  which the brief forbids. What I have instead is the `401` from the same routes carrying `ACAO: *` (S),
  plus a `200` carrying it on public routes (E, M), plus the pipeline order (`UseCors` at `:210` precedes
  `UseAuthentication` at `:222`). That is a complete chain for the header claim; it is **not** a
  demonstration of a body being read cross-origin, and I am not offering it as one.
* **Whether `Mcp:AllowedOrigins` is empty in production or merely does not contain `evil.example`.** A
  preflight from an unlisted origin answers identically in both cases. "Closed to browsers" is measured;
  "empty" is inference.
* **The exact commit deployed to `okamapi`.** Inferred from the workflow's `ref_name → webapp_name`
  mapping, not read from a version endpoint — the app exposes none (`/health` answers the literal
  `Healthy`; `/` answers `OK`). If someone deployed by hand or via `workflow_dispatch` from another ref,
  the deployed code is not `6c0b3a19` and §3's line numbers move. **Confirming this needs Azure portal
  access, which no agent has.**
* **Whether anything sits in front of the App Service** that could add or strip CORS headers. Responses
  carry `server: Microsoft-IIS/10.0`, `x-powered-by: ASP.NET` and Azure's own `ARRAffinity` cookies with
  no CDN or gateway header, so the answers appear to come from the app itself — but "appears" is the
  honest word.
* **Anything about `okamtest`.** The same workflow deploys branch `test` to it with, presumably, the same
  wildcard. I did not probe it: it was outside the brief and probing a second production host is not
  free.

---

## 10. Verdict against the exit criterion

*"names every credentialed cross-origin path the deployed API would accept today, and states which of them
a wildcard origin makes reachable"* — §3 is the enumeration (8 rows, swept for the two shapes that would
have widened it), §4 is the reachability ruling row by row with the measurement behind each, §5 walks the
three that are open, §6 names what the preference-centre deploy changes.

**`F-PROD-CORS-WILDCARD` stays open** — its `clears_when` is measured false as of 2026-08-06 11:48 UTC.
What this lane changes is the reason it is open. It was recorded as *survivable because nothing
credentialed exists yet*; measured, it is **survivable for cookies and already live for header-borne
credentials**, and the branch carrying the fix is two merges and a deploy away from the code that answers
the wildcard.

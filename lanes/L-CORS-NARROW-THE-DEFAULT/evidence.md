# L-CORS-NARROW-THE-DEFAULT — the deployed default names its origins

Brief `3ba03888`. Flag it clears: `F-PROD-BEARER-IS-SCRIPT-READABLE`.

**Boundaries kept.** Nothing pushed, no shared ref moved, no production change, no container started or
touched, no `npm`, no `git stash`, no `git add -A` outside my own worktrees. Every network call to a live
host was an `OPTIONS` preflight or an unauthenticated `GET`; no credential of any kind was ever sent.
No secret value appears in any file this lane wrote — only header and configuration key *names* (C7).

---

## 0. What was delivered

| artifact | what it is |
|---|---|
| `master.diff` | the fix against **`origin/master` @ `6c0b3a19`** — the branch that deploys to `okamapi` |
| `integration.diff` | the same fix against **`feature/restaurant-modules` @ `8e2b57de`**, without which the master fix is silently reverted by a future merge |
| `probe-production-mode.txt` | side-by-side preflights and 401s: deployed API vs. a build hosted here |
| `probe-development-mode-tail.txt` | the same probe with the local host in Development, showing the loopback rows flip |
| `proof-host-Program.cs`, `probe.sh` | the proof harness, so the measurement can be repeated |

Lane branches, **local only, never pushed**:
`lane/cors-narrow-the-default` @ `bed7cab3` (worktree `/Users/svendaneel/okam/OkamAPI-corsnarrow`) and
`lane/cors-narrow-the-default-integration` @ `aa29464d` (worktree `/Users/svendaneel/okam/OkamAPI-corsnarrow-int`).

---

## 1. Two targets, because one is not enough

The brief sent me to master alone. That is wrong, and the correction that arrived mid-lane is confirmed by
measurement:

* merge-base `30dc54ae`; **master is +1, `feature/restaurant-modules` is +507**, neither an ancestor of the
  other.
* The integration branch carries **the same permissive default**, inline at `Program.cs:96-103`, defect at
  `:100-102`, with the same ordering defect (`UseCors()` at `:284`, `UseAuthentication()` at `:305`).
* `lane/cors-followups` — described elsewhere as "the correct fix" — **also leaves the default wildcard
  intact** (`Helpers/ServiceCollectionExtensions.cs:73-78`). What it added is an additional *named*
  credentialed policy. It narrows the default by nothing.

So a master-only fix would be reverted the day those 507 commits merge, and **it would not conflict**: the
integration side owns a restructured `Program.cs` whose CORS block sits at different lines. Both diffs are
therefore delivered, and the second is not optional.

---

## 2. The origin list, and where every entry came from

There is **no database-driven store domain** — no entity on either branch carries a domain column, and the
only registry is `Services/ClientConfigurationService.cs`. The enumeration is therefore closed and
exhaustive, not a sample. Note that this registry is already an origin allowlist in production:
`GetDinteroReturnWebPath` reads the browser's `Origin` header and throws `DomainNotAllowed` if it is not in
`Domains` (`ClientConfigurationService.cs:196-222`). CORS was the wildcard; the payment return path was
already named.

### Included

| origin | evidence |
|---|---|
| `https://okam.no` | **network-measured**: loading `/vilkar-store?id=1` issued `GET https://okamapi.azurewebsites.net/stores/1` → 200. Four deployed bundles (`215168c`, `518bb11`, `7968095`, `7d28a39`) carry the API base. |
| `https://www.okam.no` | Not observed as a document origin — it 301s **server-side** to `okam.no`, so a browser never issues XHR from it today. Included because `StripeService.cs:162,163,270` return browsers to `https://www.okam.no/3d/...`, and a removed redirect would otherwise be an outage on the 3-D Secure path. okam-controlled, so the cost is zero. |
| `https://admin.okam.no` | Live host, HTTPS 302 → `https://www.okam.no/admin`. The repository names it as the admin browser origin in two places (`WebApi.Tests/Wire/DownloadHeaderWireTests.cs:49`). Same reasoning as `www`: redirect today, okam-controlled, zero-cost insurance. |
| `https://www.okam-swiss.ch` | **network-measured**: `/vilkar-store?id=1` issued `GET https://okamapi.azurewebsites.net/stores/1` → 200. It is a Nuxt build **of this repository** (`/_nuxt/static/<id>/` layout, `/admin` answers 200) with `API_BASE_URL` left at its default — four of its bundles carry `okamapi.azurewebsites.net`. **This is the caller that the exit criterion's "does narrowing break anything" question was really about**; the landing page alone makes no API call, so a shallow check would have missed it. |
| `https://okam-swiss.ch` | Apex, 308s to `www`. `config/edition.js:26` declares it the CH market hostname. |
| `https://shop.okam.no` | **network-measured** `GET /stores` → 200. `ClientConfigurationService.cs:42`. |
| `https://jungelpizza.okam.no` | **network-measured** `GET /stores` → 200. `:54`. |
| `https://shop.jungelpizza.no` | **network-measured** `GET /stores` → 200. `:54`. |
| `https://mathavna.okam.no` | **network-measured** `GET /stores` and `POST /stores/106/consumer` → 200. `:96`. |
| `https://shop.mathavna.no` | **network-measured**, same two calls. `:96`. |

Development only, in code and never configurable (`OkamCorsOrigins.DevelopmentOnlyOrigins`):
`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5000`, `http://127.0.0.1:5000` —
the two ports the API's own `Domains` registry lists for the Okam theme (`:42`).

### Excluded, each for a stated reason

* `https://lora.okam.no`, `https://shop.lora-as.no` (`:70`) — neither resolves. **`lora-as.no` has no NS
  record, no NOR-ID whois entry and no certificate ever issued in the CT logs**: the registration is gone.
  Allowlisting it would grant CORS to whoever registers it next. This is the one exclusion that is a
  security decision rather than tidiness.
* `https://arv.okam.no`, `https://shop.matarv.no` (`:83`) — neither resolves. `matarv.no` is still
  registered but the shop host is gone.
* `https://shop.okam-swiss.ch` (`config/edition.js:29`) — no DNS, and the source comment says the value is
  *assumed* ("Update if the Swiss shop lives elsewhere"). A guess in the codebase is not evidence.
* MCP inspector origins — already on the correctly scoped named `McpCorsPolicy`, untouched.

Enumeration method, so it can be repeated: certificate transparency (`api.certspotter.com`) over `okam.no`,
`okam-swiss.ch`, `jungelpizza.no`, `mathavna.no`, `lora-as.no`, `matarv.no`; DNS for each candidate; a
browser driven at each live host with the network log filtered to the API host. **Caveat: CT under-reports.**
A wildcard `*.okam.no` certificate collapses to `okam.no`, so CT is a floor on the host list, not a ceiling.
The `Domains` registry and the deployed bundles are what make the list complete.

---

## 3. The change

Same shape on both branches.

* `Helpers/OkamCorsOrigins.cs` (new) — resolves the default policy's origins from `Cors:AllowedOrigins`,
  normalising each to the `scheme://host[:port]` form a browser actually sends (`GetLeftPart(Authority)`),
  because a trailing slash or a capitalised host **never matches and fails silently**. Non-absolute and
  non-http(s) entries are skipped rather than thrown on, so one stale entry cannot stop the API booting.
  Loopback origins are added in Development only and stripped from a configured list everywhere else —
  `appsettings.Development.json` ships in the publish output, so one mis-set `ASPNETCORE_ENVIRONMENT` is
  otherwise all that stands between production and trusting whatever is listening on an operator's machine.
* `Helpers/ServiceCollectionExtensions.cs` — new `AddOkamCors(IConfiguration, IHostEnvironment)`. The name
  and signature match the one on `lane/cors-followups` deliberately, to make the eventual convergence a
  merge rather than a rewrite. The MCP policy moves in unchanged; a test asserts the move did not widen it.
* `Program.cs` — the inline `AddCors` block becomes one call, and the **resolved** policy is logged at
  startup (a warning if it is empty). Read through `ICorsPolicyProvider`, the same abstraction
  `CorsMiddleware` uses per request.
* `appsettings.json` — the enumerated list.
* Methods and headers stay open. Once the origin is named they carry no further authority, and narrowing
  them would break callers for reasons unrelated to the exposure being closed.

### The trap, named in the code so the next person does not add it

`AllowAnyOrigin()` with `AllowCredentials()` **throws at startup** — a safety net.
`SetIsOriginAllowed(_ => true).AllowCredentials()` **does not throw**, is one line, and is the first thing
somebody reaches for when a page starts answering 401. On the *global default* it would hand every cookie on
this host to every origin. It appears in neither diff; the prohibition and its reasoning are written into the
`AddOkamCors` doc comment, and `Default_policy_never_carries_credentials` reds if anyone adds it. Credentials
belong on a named policy applied per action with `[EnableCors]`, which is what `lane/cors-followups` built.

### One calibration, because the earlier write-up overstated it

The `Authorization` carve-out — a literal `*` in `Access-Control-Allow-Headers` never covers it — protected
**credential #1 only**, and `AllowAnyHeader()`'s echo defeats that one carve-out. `X-Okam-ApiKey` and
`X-API-Key` are ordinary non-safelisted headers that a literal `*` **would** have covered; those two were
open on the wildcard regardless of the echo. The code comment says it this way.

---

## 4. Proof: a build hosted here refuses what the deployed API admits

The real `Program.Main` cannot boot on this machine — it seeds a power user against SQL Server before
`app.Run()`, and this lane has no SQL slot. The proof host therefore boots the parts under test and nothing
else, and each of those parts is the real thing: the production `AddOkamCors`, the worktree's own
`appsettings.json` loaded from the API's content root, and the API's middleware order
(`UseRouting → UseCors → authentication → endpoints`), which is what puts CORS headers on a 401.

Startup line, Production: `AllowAnyOrigin: False`, `SupportsCreds: False`, 10 resolved origins.

Full transcript in `probe-production-mode.txt`. Every row, `Origin: https://evil.example`:

| probe | deployed `api.okam.no` | local build |
|---|---|---|
| preflight `PUT /api/Store`, `ACRH: authorization,content-type` | `204` · `allow-origin: *` · `allow-headers: authorization,content-type` | `204` · **no CORS headers** |
| preflight `/Stores/52/orders`, `ACRH: x-okam-apikey` | `204` · `allow-origin: *` · `allow-headers: x-okam-apikey` | `204` · **no CORS headers** |
| preflight `/api/external/menu/52`, `ACRH: x-api-key` | `204` · `allow-origin: *` · `allow-headers: x-api-key` | `204` · **no CORS headers** |
| `GET /api/external/menu/52` | `401` · `allow-origin: *` | `401` · **none** |
| `GET /Stores/52/orders` | `401` · `allow-origin: *` | `401` · **none** |
| `GET /User` (an `[Authorize]` route) | `401` · `allow-origin: *` | `401` · **none** |
| `GET /health` | `200` · `allow-origin: *` | `200` · **none** |

And the direction that proves the allowlist is not simply off:

| probe | deployed | local build |
|---|---|---|
| preflight `PUT /api/Store` from `https://okam.no` | `allow-origin: *` | `allow-origin: https://okam.no` · `allow-headers: authorization,content-type` |
| `GET /health` from `https://www.okam-swiss.ch` | `allow-origin: *` | `allow-origin: https://www.okam-swiss.ch` |
| `GET /health` from `http://localhost:3000` | `allow-origin: *` | **none** in Production, `allow-origin: http://localhost:3000` in Development |

`access-control-allow-credentials` was absent from every response on both sides throughout.

Note the shape of a CORS refusal: the server returns a normal status and simply **omits** the header. That is
why a narrowed policy is easy to misread as working, and why the wire pin below asserts the refusal
direction explicitly.

---

## 5. Suites and mutation checks

**master lane** (`bed7cab3`): `Passed 168, Failed 0`. Baseline 160 + 8 new tests. Mutations, each a full
rebuild, no `--no-build` anywhere:

* restore `AllowAnyOrigin()` → **6 red**, restored → green.
* add `AllowCredentials()` to the default → **1 red** (`Default_policy_never_carries_credentials`).
* delete the loopback strip → **1 red** (`Loopback_origins_are_dropped_outside_development`).

**integration lane** (`aa29464d`), container-free tier `--filter "Database!=SqlServer"`, no container
started or touched: `Passed 4647, Failed 0, Skipped 12` in 6m33s. Mutation: restore `AllowAnyOrigin()` →
**7 red**, including `WireContractPinsTests.An_unlisted_origin_gets_no_cors_headers_at_all`, which proves
the new refusal assertion reads the real pipeline rather than the options object.

Every assertion reads the **resolved `CorsPolicy`** off the built `CorsOptions`, never a settings file —
the configuration array is overridden *by index*, so a settings file cannot answer which origins are
permitted. That is the mistake `F-CORS-ORIGINS-BY-INDEX` records.

### What the first integration run found — the part that mattered

The first full run was **14 red, and all 14 were mine**. That is the "does narrowing break a live caller"
question answering itself inside the branch's own suite:

* **13** were cross-origin download-header tests (`DownloadHeaderWireTests`, `PdfDownloadWireTests`,
  `MealsDownloadHeaderWireTests`, `WireContractPinsTests`). They send `Origin: https://admin.okam.no` and
  assert `Access-Control-Expose-Headers`; with the origin unlisted, **no** CORS headers are emitted at all
  and `Content-Disposition` becomes unreadable — the exact defect `BrowserReadableHeaders` was built to
  prevent. Fixed by enumerating `https://admin.okam.no`, on its own evidence, not to make tests pass.
* **1** was `UnboundOptionsTypeTests.Every_injected_settings_type_is_bound_to_configuration_somewhere`: my
  `IOptions<CorsOptions>` injection in `Program.cs` looked like an unbound settings type of this repository.
  The guard is right and its allowlist would have accepted `CorsOptions`, but reading the policy through
  `ICorsPolicyProvider` instead is both truer (it is what the middleware uses) and leaves another lane's
  test untouched.
* `WireContractPinsTests.The_cors_policy_exposes_the_etag_header...` used the invented origin
  `https://admin.example.test` to mean *"any other origin"* — a premise this change falsifies and a `.test`
  TLD that can never be allowlisted. It now uses a permitted origin, its doc comment says why, and it gained
  `An_unlisted_origin_gets_no_cors_headers_at_all` so neither direction can pass by accident.

Two stale security arguments were corrected where they were spelled out in prose:
`Helpers/BrowserReadableHeaders.cs` and `WebApi.Tests/Wire/DownloadHeaderWireTests.cs` both reasoned from
*"the default policy is `AllowAnyOrigin()`, so any origin holding a bearer token can already read the
BODY"*. Their conclusion survives — exposure still discloses strictly less than the body — but the reason
does not, and a false security premise left in place is how the next person re-derives the wrong answer.

---

## 6. What the owner runs — nothing here touches production

Both diffs are unpushed local branches. Review `master.diff` first; it is the one that changes what the
deployed API answers.

```sh
# 1. review
cd /Users/svendaneel/okam/OkamAPI-corsnarrow      && git log -1 --stat && git diff 6c0b3a19..HEAD
cd /Users/svendaneel/okam/OkamAPI-corsnarrow-int  && git log -1 --stat && git diff 8e2b57de..HEAD

# 2. deploy the production half: pushing master IS the deploy
#    (.github/workflows/azure-webapps-dotnet-core.yml: push to master -> webapp okamapi)
cd /Users/svendaneel/okam/OkamAPI-corsnarrow
git push origin lane/cors-narrow-the-default            # open a PR against master; do not push master directly

# 3. land the integration half so the fix is not reverted by the 507-commit merge
cd /Users/svendaneel/okam/OkamAPI-corsnarrow-int
git push origin lane/cors-narrow-the-default-integration

# 4. verify against the live host after the deploy completes - this is F-PROD-BEARER-IS-SCRIPT-READABLE's clears_when
curl -sS -o /dev/null -D - -X OPTIONS https://api.okam.no/api/Store \
  -H 'Origin: https://evil.example' \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
#    expect: NO access-control-allow-origin header at all

curl -sS -o /dev/null -D - -X OPTIONS https://api.okam.no/api/Store \
  -H 'Origin: https://okam.no' \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
#    expect: access-control-allow-origin: https://okam.no
```

**Adding or removing an origin without a redeploy** is an Azure App Service application setting on
`okamapi`. The array is indexed and overridden *by index*, so an addition must use the next free index —
with ten entries in `appsettings.json`, that is `Cors__AllowedOrigins__10`. The startup log line
`The default CORS policy permits {OriginCount} origins: ...` is there to confirm it took.

---

## 7. Named for the owner, not fixed here

* **`okamtest`.** The same workflow deploys branch `test` to `okamtest.azurewebsites.net`, so this
  `appsettings.json` reaches it too. Which browser origins call `okamtest` was not measured — probing a
  second production host was outside the brief. If a test frontend calls it, its origin needs a
  `Cors__AllowedOrigins__N` app setting on that App Service **before** master reaches `test`.
* **Rotation, not CORS.** Narrowing the origin stops a browser reading these; it does not un-publish a key.
  `StoresController.cs:1208` holds a hardcoded integration key in source (value withheld, C7 — it is one
  `git show` away for whoever owns the rotation), and the external-menu key sits in committed configuration.
  Both are in git history, so rotation is the whole fix and deleting the line is not.
* **`/User/login` returns a ~100-year JWT** (`Services/UserService.cs:547`, `AddDays(36500)`) and
  `/User/sendverificationtoken` has no rate limiter. Neither is a CORS defect; narrowing the default removes
  the attacker's ability to run the whole sequence from a page with no server, which is a reduction in
  convenience, not a fix.
* **`api.okam.no` vs `okamapi.azurewebsites.net`.** Every measured caller uses the `azurewebsites.net` host,
  a **public suffix**, so those calls are cross-*site*. Moving the API to an `api.` subdomain of each site
  needs an `API_BASE_URL` build-time change shipped with each frontend, not only DNS — and it would not make
  this policy unnecessary, because a different host is still a different *origin*.
* **The wire tier cannot see the Development branch of this code.** `WireHost.cs:136` does
  `UseEnvironment(Development)`, so the loopback strip is only ever proven by the unit tier. Recorded so a
  green wire suite is not later misread as covering it.

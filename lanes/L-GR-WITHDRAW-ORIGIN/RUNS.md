# L-GR-WITHDRAW-ORIGIN — evidence

## 1. Brief verified. Both breaks are real, and both are real IN PRODUCTION.

| break | claim | verified at | status |
|---|---|---|---|
| 1 | session cookie is `SameSite=Strict` | `OkamAPI-modules/Controllers/GrowthPreferenceController.cs:58-65` | REAL |
| 2 | default CORS policy is `AllowAnyOrigin()` | `OkamAPI-modules/Program.cs:96-103`, applied globally at `Program.cs:285` | REAL |
| — | pages on `okam.no`, API on `okamapi.azurewebsites.net` | `nuxt.config.js:45` | REAL |

Neither is already fixed. Both frontend headers state the defect accurately
(`utils/growth/growth-guest-client.js:34-42`, `pages/preferences/communications.vue:305-313`).

### Break 2 confirmed against the LIVE deployed API (not just the source)

```
OPTIONS https://api.okam.no/v1/growth/preference-session/preferences
  Origin: https://okam.no · Access-Control-Request-Method: GET
  Access-Control-Request-Headers: x-growth-csrf
->  HTTP/2 204
    access-control-allow-origin: *          <-- wildcard
    access-control-allow-headers: x-growth-csrf
    access-control-allow-methods: GET
    (NO access-control-allow-credentials)   <-- fatal for credentials:'include'
```
Identical response via `https://okamapi.azurewebsites.net`. Read-only preflight; no token involved.

## 2. THE EXIT CRITERION IS UNMEETABLE — the page is not deployed

```
https://okam.no/preferences/communications  -> 404
https://okam.no/preferences/unsubscribe     -> 404
https://okam.no/subscribe/confirm           -> 404
https://okam.no/                            -> 200
```

The whole Growth guest surface lives on `feature/restaurant-modules`. `.github/workflows/nuxtjs.yml`
deploys **`main` only**, as a static Nuxt export to GitHub Pages. There is no code change that puts a
browser in front of a working deployed preference centre from inside this lane.

## 3. A THIRD TOPOLOGY EXISTS, and it is better than both the review named

`api.okam.no` is **already a live CNAME to the very same App Service**:

```
dig api.okam.no              -> okamapi.azurewebsites.net -> 40.118.102.46
dig okamapi.azurewebsites.net ->                             40.118.102.46
dig okam.no                  -> 185.199.108-111.153  (GitHub Pages)
dig www.okam.no              -> okam-as.github.io -> 185.199.108-111.153

curl https://api.okam.no/health              -> 200, ssl_verify=0 (cert bound, valid)
curl https://okamapi.azurewebsites.net/health -> 200
```

`okam.no` and `api.okam.no` share the registrable domain `okam.no`, so they are the **same site**.
A `SameSite=Strict` cookie IS attached across them. Already referenced in `appsettings.json:111`
(`Mcp:PublicBaseUrl`) and `appsettings.json:105` (a registered Wolt callback), so it is in service.

The **reverse-proxy** option the review named is NOT available: GitHub Pages cannot reverse-proxy.
It requires moving the web hosting first.

## 4. Browser evidence — a genuinely cross-site harness, not a fixture

`api-stub.js` (port 4907) replicates the exact `Set-Cookie` attributes and CORS headers of the two
files above. `page-server.js` (port 3907) issues the same two calls `growth-guest-client.js` issues
(`credentials:'include'` + `X-Growth-Csrf`). The page server is reachable under two hostnames:

- `http://localhost:3907` -> API `http://127.0.0.1:4907` = **cross-site** (different registrable
  domains). Models `okam.no` vs `okamapi.azurewebsites.net`.
- `http://127.0.0.1:3907` -> API `http://127.0.0.1:4907` = **same-site, cross-origin** (port is not
  part of "site"). Models `okam.no` vs `api.okam.no`.

Both are potentially-trustworthy origins, so `Secure` cookies are accepted over http with no
certificate rigging. Driven by a real Chrome via Playwright.

### CROSS-SITE run (`cross-site.png`)

| topology | CORS | SameSite | session open | preferences read | verdict |
|---|---|---|---|---|---|
| today | AllowAnyOrigin | Strict | **BLOCKED BY BROWSER** (TypeError) | never reached | FAIL |
| corsonly | named + creds | Strict | 200 | **401 growth.session_invalid, cookieAttached=false** | FAIL |
| corslax | named + creds | **Lax** | 200 | **401 growth.session_invalid, cookieAttached=false** | FAIL |
| corsnone | named + creds | None; Secure | 200 | 200 cookieAttached=true | PASS |

Chrome's own words for row 1:
> Access to fetch ... has been blocked by CORS policy: Response to preflight request doesn't pass
> access control check: The value of the 'Access-Control-Allow-Origin' header in the response must
> not be the wildcard '*' when the request's credentials mode is 'include'.

### SAME-SITE run (`same-site.png`)

| topology | CORS | SameSite | session open | preferences read | verdict |
|---|---|---|---|---|---|
| today | AllowAnyOrigin | Strict | **BLOCKED BY BROWSER** | never reached | FAIL |
| corsonly | named + creds | **Strict** | 200 | **200 cookieAttached=true** | **PASS** |
| corslax | named + creds | Lax | 200 | 200 cookieAttached=true | PASS |
| corsnone | named + creds | None; Secure | 200 | 200 cookieAttached=true | PASS |

**The harness discriminates.** The identical `corsonly`/`corslax` rows are FAIL cross-site and PASS
same-site. It is not a fixture that goes green everywhere — it can see the defect under test.

## 5. What the two runs establish

1. **The CORS fix is unconditional.** `AllowAnyOrigin` blocks the credentialed preflight *even
   same-site*, because the call is still cross-**origin**. `Program.cs:96-103` must name the web
   origins with `AllowCredentials` under every topology except a true same-origin reverse proxy.
2. **A CORS fix alone is not enough cross-site** — row `corsonly`, 401 with the cookie withheld.
3. **THE TRAP, sharper than the brief states it.** "Move the cookie off `Strict`" implemented as
   **`Lax` does not work** — row `corslax` is still 401 cross-site. `Lax` is sent only on top-level
   navigations with safe methods; a `fetch()` is never a top-level navigation. Only
   `SameSite=None; Secure` crosses sites for XHR. Someone reading "off Strict" and choosing Lax
   ships a still-broken fix that presents as a mystery 401.
4. **Topology C keeps `Strict`.** Same-site + `Strict` + CORS fixed = 200. Strictly better than
   topology B, which needs `SameSite=None` and thereby gives up the browser's own cross-site
   protection, leaving the double-submit CSRF token as the sole defence.

## 6. The options, for the ruling

| | change needed | cookie | verdict |
|---|---|---|---|
| **A. reverse proxy** | move web off GitHub Pages | `Strict` kept | **not available today** |
| **B. name origins + `SameSite=None`** | `Program.cs` + controller + redeploy | `Strict` -> `None; Secure` | works; weakens posture |
| **C. `API_BASE_URL` -> `api.okam.no` + name origins** | `nuxt.config.js:45` + `Program.cs` | **`Strict` untouched** | **recommended** |

C is one frontend constant and one CORS policy. The hostname, the App Service binding and the
certificate already exist. Still requires a decision + a backend deploy, so it is not this lane's to
take.

Under C the CORS allowlist should name `https://okam.no` and `https://www.okam.no` (both resolve to
the Pages site). CH edition `okam-swiss.ch` is a **different registrable domain** and is NOT covered
by C — it would need `api.okam-swiss.ch` on the same App Service, or `SameSite=None`.

## 7. Does this bind Events? Partly — and not automatically.

- Events guest routes do **not** use `credentials:'include'` at all (no match in
  `utils/events/events-guest-client.js`); they are token-in-URL. **The cookie half does not bind
  Events.**
- **The CORS half does.** Whatever origin `EventsSettings.PublicBaseUrl` is set to must appear in
  the same allowlist, or Events breaks the day it is set.
- The real coupling: under C, `EventsSettings.PublicBaseUrl` **must be a subdomain of `okam.no`**.
  Pointing it at a different registrable domain re-opens this exact problem for Events later, which
  is the "answering one carelessly answers the other" hazard the brief named.

## 8. Untouched, deliberately

- **No source file changed.** No topology was picked silently.
- **One-click unsubscribe (endpoint 6) untouched** — server-to-server, no cookie, no CORS. Still the
  only withdrawal working at the deployed origins today.
- The `unsubscribe.vue` 405-on-GET sibling gap was not touched; I changed no route.
- Harness servers killed; ports 3907/4907 clear; no tracked file dirtied.

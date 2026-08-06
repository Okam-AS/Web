# L-GROWTH-PREFCENTRE — deploy state measured 2026-08-05

Brief `c50af366`. Every number below names the commit or command it came from. All network calls
read-only; nothing pushed, nothing merged, no container started, no production object touched.

## 1. The ruling is ruled but NOT executed

`D-PREFCENTRE-DEPLOY` = `deploy-the-branch`, ruled 2026-08-05 by @sven, to be executed as
"land to main via the integration program, then extend the pipeline". Neither half has happened.

| half | measured | command |
|---|---|---|
| frontend on main | **0** preference/subscribe files | `git ls-tree -r --name-only main \| grep -ciE 'preferences\|subscribe'` → `0`, main = `e7896bc` |
| frontend on integration | 4 pages present | `pages/preferences/communications.vue`, `pages/preferences/unsubscribe.vue`, `pages/subscribe/_store.vue`, `pages/subscribe/confirm.vue` |
| backend CORS on integration | **0** occurrences of `EnableCors` | `git grep -n EnableCors feature/restaurant-modules -- '*.cs'` → empty; integration = `8e2b57de` |
| backend CORS lane merged? | **NOT MERGED** | `git merge-base --is-ancestor lane/growth-prefcentre feature/restaurant-modules` → false; lane = `2a052800` |
| pipeline changed? | **no** | `git diff main HEAD -- .github/workflows/` touches only `claude-code-review.yml` |

## 2. Live origins (measured by me, not inherited)

- `https://okam.no/preferences/communications` → **404**. Body is the Nuxt SPA fallback shell
  (`generate.fallback: true` emits `404.html`), not the page.
- `https://okam.no/subscribe/confirm` → **404**.
- `https://okam.no/admin/` → **200** (proves the static export does serve routes that exist on main).
- `https://api.okam.no` preflight (Origin `https://okam.no`, `Access-Control-Request-Method: POST`)
  → `204` with `access-control-allow-origin: *` and **no** `access-control-allow-credentials`.
  The production defect `F-CORS-WILDCARD` records is still live.
- `api.okam-swiss.ch` → **NXDOMAIN** (`host` → `not found: 3(NXDOMAIN)`).
- `okam.no` is served by GitHub Pages (`server: GitHub.com`, `x-github-request-id`, `via: varnish`).

**Therefore the exit is unmeetable today.** It requires a browser capture from a deployed consumer
origin against a deployed API origin. The consumer origin 404s, the API origin answers a wildcard,
and the branch carrying the fix is not on either deploy path. Every remaining step — merge the lane
into the backend integration branch, merge the frontend integration branch to main, deploy the API —
is a push to a shared branch or a production action, all four of which my boundaries forbid.

Per C5 I am **not** offering the existing local capture
(`lanes/L-GROWTH-PREFCENTRE/growth-preference-withdrawal.playwright.json`) as evidence of the exit.
That capture runs page and API on `127.0.0.1`, which is same-site by construction, so it cannot
discriminate the SameSite half at all. No person has completed this journey.

## 3. Finding — "extend the pipeline" is NOT required for the consumer half

The ruling's execution note assumes a pipeline change is needed. Measured, it is not, for the
preference centre specifically:

- `/preferences/communications` is a **static** route — no dynamic segment — so `nuxt generate`
  enumerates it automatically. `/admin/` returning 200 from the same export proves the mechanism.
- The token rides in the **URL fragment**, never in a query or path segment:
  `pages/preferences/communications.vue:306` documents `…/preferences/communications` + `#token=…`,
  and the backend builds exactly that (`GrowthPreferenceCentreLink.cs:59` "the fragment carries a…";
  `GrowthPreferenceCentreReachabilityTests.cs:46` asserts `PreferenceCentreBaseUrl + "#token="`).
  A fragment is never sent to the server, so a static host serves this page correctly.

So **merging to main alone fixes the consumer origin.** No workflow edit is needed for it.
(`pages/subscribe/_store.vue` *is* a dynamic route and would need `generate.routes`, but that is the
per-store subscribe page, not the preference centre; `/subscribe/confirm` is static.)

The genuinely hard half is the **API**: `api.okam.no` is Azure App Service
(`okamapi.azurewebsites.net`) and the named CORS policy is not even on the integration branch yet.

## 4. Defect — both facts gating F-PREF-UNREACHABLE are mis-probed

`F-PREF-UNREACHABLE` has `clears_when: fact:growth.prefcentre.cors is present and
fact:growth.cookie.crosssite is present`. Neither probe can ever go green under the ruling that was
actually executed. From `docs/plan/plan.md:22437-22438`:

1. `growth.prefcentre.cors` — `wire ../OkamAPI-modules/Program.cs contains:AllowCredentials`.
   **Wrong file.** On `lane/growth-prefcentre` — the branch that built the policy — `Program.cs`
   contains neither `AllowCredentials` nor `GrowthGuestCorsPolicy` (git grep → empty). The policy is
   registered at `Helpers/ServiceCollectionExtensions.cs:81` and calls `.AllowCredentials()` at
   `:86`. This fact would read red even after a fully successful deploy.

2. `growth.cookie.crosssite` — `regex:SameSite = SameSiteMode\.(None)` on
   `Controllers/GrowthPreferenceController.cs`. **Probes for a change the plan decided against.** The
   lane deliberately left the cookie at `SameSiteMode.Strict`
   (`GrowthPreferenceController.cs:76`), and `D-PREF-ORIGIN`'s own recorded correction says the
   `samesite-none` half is "strictly more change and strictly less protection" under `api-subdomain`
   and recommends retiring it. So this fact asks for the opposite of the ruled design.

Net: even a perfect deploy leaves this flag stuck open. Both probes need repointing, and the second
needs Sven's retirement decision on the `samesite-none` half before it can be repointed at all.

## 5. C6 ordering hazard — confirmed, and it is live-adjacent

`D-MAIL` ruled `postmark` (2026-07-31) and `L-GROWTH-MAIL` is `state: verified` against the Postmark
**sandbox** (`artifacts/journeys/growth-doi-postmark-sandbox.json`, present).

Meanwhile `Models/AppSettings/GrowthSettings.cs:53` on the integration branch hardcodes the default:

```
public string PreferenceCentreBaseUrl { get; set; } = "https://okam.no/preferences/communications";
```

and `Services/Growth/GrowthDispatchService.cs:688` builds every dispatched message's preference link
from it. That URL 404s today, measured above.

**So the first real (non-sandbox) Growth send would print a GDPR Article 12 / Article 7(3) withdrawal
path that does not resolve** — a statutory claim on a document whose destination does not exist,
which is C6's exact shape. This is an ordering constraint, not a code defect: no real Growth mail may
leave until the consumer origin answers 200. It is currently held only by the provider still being
pointed at the sandbox, which is a configuration value, not a gate.

## 6. Tree hygiene

Tree state recorded before I started at `lanes/L-GROWTH-PREFCENTRE/tree-state-before.txt`
(339 dirty paths at `8ac6f63`, of which 4 are the pre-existing dirty `artifacts/journeys/` files from
a test run). I committed nothing, staged nothing, and left all 339 exactly as found. No `npm ci` or
`npm install` was run. Port 4010 was never bound.

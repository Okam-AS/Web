# L-PREFCENTRE-DEPLOY-EXEC — every claim re-measured 2026-08-06

Brief `e8c9e48b`. Nothing was pushed, merged, deployed or sent. No container was started or stopped.
No `npm ci`/`npm install`, no `git stash`, no `git add -A`. Every network call below is read-only.

---

## 0. HEADLINE — the sandbox check, answered

**Not a live exposure.** The C6 hazard is held by three independent gates, not by one configuration
value, and the strongest of the three is structural rather than configurational.

| gate | measured | where |
|---|---|---|
| the deployed API has no Growth mail code at all | `GrowthPreference*`/`GrowthDispatch*` file count on `origin/master` = **0**; `grep -il 'preferences/communications' origin/master` = **no hits** | `OkamAPI` `origin/master` `6c0b3a19` |
| Growth is switched off in committed config | `"Growth": { "Enabled": false … }` | `appsettings.json:175-176` |
| the provider is the in-process double, not even a network sandbox | `"MailProvider": "Fake"`; `Fake = 0` is documented "deterministic in-memory sandbox double. No network I/O; nothing leaves the process." | `appsettings.json:177`, `Enums/Growth/GrowthMailProviderKind.cs:16-17` |
| Postmark is fail-closed on top of that | `PostmarkFromAddress: ""`, **`PostmarkServerToken` absent from the file entirely**; `IsPostmarkConfigured` requires token AND from-address AND stream AND base-url | `appsettings.json:178-180`, `Services/Growth/GrowthMailProviderSelection.cs:87-91` |

`api.okam.no` is Azure App Service webapp **`okamapi`**, deployed by
`.github/workflows/azure-webapps-dotnet-core.yml` from branch **`master`** only (`test` → `okamtest`).
The Growth dispatch path is not on `master`. There is therefore no code on the production artifact
that can print a preference link, whatever any setting says.

**The record's phrasing — "held only by a configuration value, not by a gate" — overstates the risk.**
It was written against the integration branch, where it is true of that branch's config. Against the
thing actually deployed it is the code that is missing, which is a stronger gate than a flag.

**C7 note:** `Growth:PostmarkServerToken` is named and its value is withheld — it does not appear in
committed configuration at all, so there was no value to withhold from `appsettings.json`. Azure App
Service application settings (`Growth__PostmarkServerToken`, `Growth__Enabled`, `Growth__MailProvider`)
override `appsettings.json` at runtime and **were not read** — reading them needs Azure credentials
and is outside a read-only check. They are inert on production today regardless, because the settings
class and the dispatch service they would bind to do not exist on `master`.

**The ordering constraint survives and is still real.** The exposure becomes live the moment all three
switches move together: Growth code on `master`, `Growth__Enabled=true`, and a real Postmark token +
confirmed sender signature. Sequence A (below) before any of that.

---

## 1. The seven claims on record, re-measured today

Every one **still holds**. Each was re-run with the command shown, not inherited.

| # | claim | verdict | command and result |
|---|---|---|---|
| 1 | frontend `main` carries zero preference pages | **HOLDS** | `git ls-tree -r --name-only <main> \| grep -ciE 'preferences\|subscribe'` → `0`, and `grep -iE 'prefcent\|communications'` → empty |
| 2 | backend integration branch carries zero CORS registrations | **HOLDS** | `git grep -n EnableCors feature/restaurant-modules -- '*.cs'` → empty; same for `AllowCredentials`, `GrowthGuestCorsPolicy` |
| 3 | the lane holding it is not an ancestor | **HOLDS** | `git merge-base --is-ancestor lane/growth-prefcentre feature/restaurant-modules` → exit 1; 1 commit `2a052800` ahead, merge-base `3579bbbc` |
| 4 | the two workflow directories are byte-identical | **HOLDS** | `git rev-parse <main>:.github/workflows` = `ae4fffea…` = `feature/restaurant-modules:.github/workflows`; `git diff --name-only` → empty |
| 5 | the consumer path answers 404 | **HOLDS** | `/preferences/communications` → **404**, with and without trailing slash, and `/en/…` → **404**, zero redirects |
| 6 | the API preflight answers every origin with no credentials header | **HOLDS** | `Origin: https://okam.no` → `204`, `access-control-allow-origin: *`, **no** `access-control-allow-credentials`; `Origin: https://evil.example.com` → byte-identical wildcard |
| 7 | the Swiss API host does not resolve | **HOLDS** | `host api.okam-swiss.ch` → `NXDOMAIN`; `dig +short` → empty; `curl` → `000`. Apex `okam-swiss.ch` does resolve (`216.198.79.1`), so it is the `api.` label specifically that is unprovisioned |

### 1a. Freshness correction — the record measured stale local refs

The prior measurement used local `main = e7896bc`. That ref is **two hops stale**: local
`origin/main` was `8bcf9c3` and the actual remote tip is **`d7b5f3f`** (`2026-08-04`, "Add power-user
Wolt Drive setup page…"). I fetched the true tip into a private ref
(`refs/prefcentre-exec/main`) rather than trusting the stale one. **Claim 1 holds on the true remote
tip as well** — this is a correction to the method, not to the conclusion.

### 1b. New finding the record does not carry — neither integration branch is pushed

```
Web repo   remote heads: backup/pre-core-consolidation, feature/POS,
                         feature/dintero-in-person-terminal, feature/email-campaign,
                         feature/swiss, main, swiss            → no feature/restaurant-modules
OkamAPI    remote heads: 14, incl. feature/restaurant-control-stage0, master, test
                                                               → no feature/restaurant-modules
```

Both integration branches are **local-only**. "Merge the lane into the integration branch, then land
the integration branch" is therefore preceded by an unrecorded step: the integration branches have
never left this machine. Anything gating on them existing at origin is gating on nothing.

---

## 2. The cheap-consumer-half finding — REPRODUCED, not refuted

The record claims: static route, token in the URL fragment, so the existing export serves it as-is and
**merging to `main` alone fixes the consumer origin**. All four legs verified independently.

**(a) It is a static route.** `pages/preferences/communications.vue` — no `_`-prefixed segment. (Of the
four Growth guest pages only `pages/subscribe/_store.vue` is dynamic, and that is the per-venue capture
page, not the preference centre.)

**(b) The generator is not configured to skip it.** `nuxt.config.js:315-317` on both branches is
`generate: { fallback: true }` — **no `routes`, no `exclude`**. The `sitemapExclude` list *does* name
`'/preferences/**'` and `'/en/preferences/**'` (`nuxt.config.js:13-16`), which is the one thing that
could be mistaken for a generation exclusion. It is not: its only two consumers are the
`@nuxtjs/sitemap` module entry (`:245`) and the `sitemap` block (`:323`). Deliberate — the pages are
noindex-by-design because without a token they can only say "this link is incomplete".

**(c) The token rides in the fragment and nothing is fetched at generate time.**
`communications.vue:424` reads `tokenFromUrl(window.location.hash, window.location.search)` inside
`mounted()`; `:426` then strips it from the address bar via `history.replaceState`. There is **no
`asyncData` and no `fetch`** on the page, so `nuxt generate` needs no server. The backend builds the
matching shape (`GrowthSettings.cs:53` + `#token=…`, documented at `communications.vue:306`).

**(d) The mechanism is proven live on the deployed export — and this is the load-bearing leg.** The
record cited `/admin/` (200), an *index* route. The preference centre is a *nested non-index* route, so
I used a like-for-like control instead:

```
final=200 redirects=1  https://okam.no/admin/products/       (301 → trailing slash → 200)
final=200 redirects=1  https://okam.no/admin/statistics/
final=200 redirects=1  https://okam.no/en/admin/products/     ← the i18n variant works too
final=404 redirects=0  https://okam.no/preferences/communications
final=404 redirects=0  https://okam.no/en/preferences/communications
```

Nested non-index static routes **and** their `/en/` i18n variants are emitted as `<dir>/index.html` and
served 200 from the very export that 404s the preference centre. The generator can do this; only the
source files are absent.

> **CONFIRMED: no pipeline change is required for the consumer half. Merging to `main` and pushing is
> the whole of it.** The owner can act on this in one step (Sequence A).

**Two honesties attached to it, so "cheap" is not misread:**

1. *Cheap means "no workflow edit", not "small merge".* `main..feature/restaurant-modules` is **135
   commits, 584 files, +175,831/−6,068**, and `main` carries **1** commit the integration branch does
   not (`d7b5f3f`), so it is a real merge, not a fast-forward.
2. *The page renders; the journey still does not complete.* The page's own header says so at
   `communications.vue:315-322`: the session cookie is `HttpOnly; Secure; SameSite=Strict` on the API
   origin while the API answers `AllowAnyOrigin`, which a browser refuses to combine with credentials,
   so endpoints 4/5/7 answer `401 growth.session_invalid`. The page renders that as a `session-dead`
   branch rather than failing silently. **Sequence A satisfies the first half of the exit only.**

---

## 3. The API half is materially harder than "merge a CORS policy"

| measurement | value |
|---|---|
| `origin/master..feature/restaurant-modules` | **507 commits** |
| diff | **2,235 files, +1,397,082 / −4,752** |
| `feature/restaurant-modules..origin/master` | 1 commit |
| merge-base | `30dc54ae` |
| CORS on the deployed branch | `Program.cs:71-75` `AllowAnyOrigin()`, applied globally at `:210` |
| Growth preference endpoints on the deployed branch | **0** |

**The CORS policy cannot be cherry-picked onto `master` on its own.** It is scoped by
`[EnableCors(ClaimConstants.GrowthGuestCorsPolicy)]` to four actions of
`Controllers/GrowthPreferenceController.cs` (`:63, :98, :115, :180`), and that controller does not
exist on `master`. So satisfying the second half of the exit means landing the Growth module onto the
production deploy branch — a 507-commit integration, not a patch. That is the real cost and it belongs
in the schedule.

---

## 4. Owner's steps, in order

Nothing below was executed. Each block names what it makes true.

### Sequence A — consumer half. Makes `okam.no/preferences/communications` return the page.

**A0 — re-confirm the preconditions (read-only, ~10s).**

```bash
cd /Users/svendaneel/okam/Web-modules
git fetch origin main
git log --oneline -1 origin/main
git rev-list --count origin/main..feature/restaurant-modules   # expect ~135
git rev-list --count feature/restaurant-modules..origin/main   # expect 1  (d7b5f3f)
git rev-parse origin/main:.github/workflows \
              feature/restaurant-modules:.github/workflows     # expect two identical hashes
```

*Makes true:* the merge is the only change; the pipeline needs no edit.

**A1 — merge in a worktree, never in the primary checkout.**
The primary checkout carries **370** uncommitted paths belonging to other lanes; merging there would
entangle them.

```bash
cd /Users/svendaneel/okam/Web-modules
git worktree add /Users/svendaneel/okam/web-prefland -b release/prefcentre origin/main
cd /Users/svendaneel/okam/web-prefland
git merge feature/restaurant-modules
ls pages/preferences/communications.vue pages/subscribe/confirm.vue   # both must exist
```

*Makes true:* a branch carrying both `main`'s Wolt Drive commit and the four Growth guest pages.

**A2 — do NOT run `npm ci` or `npm install` here.** They fail repo-wide and delete a `node_modules`
shared by ~124 worktrees. The deploy workflow runs `npm ci` on a clean GitHub runner; that run is the
build gate. Watch it rather than pre-empting it.

**A3 — push. This is the deploy.**

```bash
cd /Users/svendaneel/okam/web-prefland
git push origin HEAD:main
```

*Makes true:* `push` to `main` triggers `.github/workflows/nuxtjs.yml`, which runs `nuxt generate` and
publishes the static export to GitHub Pages. No other action deploys the consumer origin.

**A4 — verify from outside.**

```bash
for p in /preferences/communications /en/preferences/communications /subscribe/confirm; do
  curl -s -L -o /dev/null -w "%{http_code}  ${p}\n" "https://okam.no${p}"
done
```

*Makes true (expected):* `200` for each, after one 301 to the trailing slash — the same shape
`/admin/products/` answers today. **A4 returning 200 is the gate that releases the C6 ordering
constraint in Sequence C.**

### Sequence B — API half. Makes the page's calls succeed instead of answering 401.

**B1 — put the CORS policy on the backend integration branch (clears claims 2 and 3).**

```bash
cd /Users/svendaneel/okam/OkamAPI-modules
git worktree add /Users/svendaneel/okam/okamapi-prefland -b integ/prefcentre feature/restaurant-modules
cd /Users/svendaneel/okam/okamapi-prefland
git merge lane/growth-prefcentre
git grep -c EnableCors -- '*.cs'          # expect non-zero
git grep -n AllowCredentials -- 'Helpers/ServiceCollectionExtensions.cs'   # expect :86
```

*Makes true:* the named `GrowthGuestCorsPolicy` exists on the integration branch. **Cheap, and it is
the only part of Sequence B that is cheap.**

**B2 — land Growth onto `master` (the branch that deploys to `api.okam.no`). GATED, owner + Sven.**
507 commits, 2,235 files. Not cherry-pickable (§3). This is the schedule item, and it is the one that
should not be estimated from the size of the CORS diff.

**B3 — configure the deployed webapp `okamapi` (Azure App Service application settings).**
Names only; values are the operator's and must not be pasted into a log, a return or a plan file.

| setting | value |
|---|---|
| `Growth__PreferenceCentreBaseUrl` | `https://okam.no/preferences/communications` |
| `Growth__GuestOrigins` | `https://okam.no` — the allowlist is derived from the guest links, this is only for extras |
| `Growth__Enabled` | `true` — **hold until A4 returns 200** |
| `Growth__MailProvider` | `Postmark` — **hold until A4 returns 200** |
| `Growth__PostmarkFromAddress` | a confirmed Postmark Sender Signature — **hold until A4 returns 200** |
| `Growth__PostmarkServerToken` | operator-held secret, **withheld here** — **hold until A4 returns 200** |

⚠ *Carried gotcha from the prior lane:* .NET configuration arrays merge **by index**, not by append.
A second file layering `Growth:GuestOrigins` shadows entry-for-entry and will silently drop an origin.

**B4 — verify the second half of the exit from outside.**

```bash
curl -s -D - -o /dev/null -X OPTIONS \
  -H 'Origin: https://okam.no' \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: content-type,x-csrf-token' \
  https://api.okam.no/api/v1/growthpreference/Email/Newsletter | grep -i '^access-control'

# then the rejection that makes the grant mean something:
curl -s -D - -o /dev/null -X OPTIONS \
  -H 'Origin: https://evil.example.com' \
  -H 'Access-Control-Request-Method: PUT' \
  https://api.okam.no/api/v1/growthpreference/Email/Newsletter | grep -i '^access-control'
```

*Makes true (expected):* the first answers `access-control-allow-origin: https://okam.no` **and**
`access-control-allow-credentials: true`; the second answers **no** `access-control-allow-origin` at
all. Today both answer `*` with no credentials header — run both, because the grant alone is
compatible with the wildcard still being in place.

### Sequence C — the C6 ordering gate

**No real Growth mail may leave until A4 returns 200.** Every dispatched message's footer is built
from `Growth:PreferenceCentreBaseUrl` (`GrowthDispatchService.cs:688`), whose default is the URL that
404s (`GrowthSettings.cs:53`). Sending before A4 prints a GDPR art. 12 / art. 7(3) withdrawal path
that does not resolve — C6's exact shape.

Today this cannot happen (§0: the code is not on `master`, Growth is `Enabled: false`, the provider is
the in-memory `Fake`). It becomes possible only when B2 and B3 land together. **The four B3 rows marked
"hold" are the ones that arm it; keep them unset until A4 is green.**

### Sequence D — the two mis-probed facts (still open, unchanged by this lane)

`F-PREF-UNREACHABLE` clears on `fact:growth.prefcentre.cors` + `fact:growth.cookie.crosssite`. Both
were shown mis-pointed by the prior lane and I did not repoint them (plan edits are outside my
boundary):

- `growth.prefcentre.cors` probes `Program.cs` for `AllowCredentials`; the policy lives at
  `Helpers/ServiceCollectionExtensions.cs:81-86`. Reads red after a perfect deploy.
- `growth.cookie.crosssite` demands `SameSiteMode.None`; the lane is deliberately `Strict`
  (`GrowthPreferenceController.cs:76`) and `D-PREF-ORIGIN`'s own correction recommends retiring the
  `samesite-none` half. Needs Sven's retirement ruling before it can be repointed.

**A fully successful A+B still leaves this flag stuck open.** Worth repointing in the same pass so the
deploy is not recorded as having failed.

---

## 5. Hygiene

- No push, no merge, no deploy, no mail, no provider configuration change, no plan edit.
- No container started, stopped or inspected. `docker run` process count: 0.
- No `npm ci`/`npm install`; no `git stash`; no `git add -A`; nothing staged or committed.
- Primary checkout left at **370** dirty paths, untouched — I wrote only under this lane directory.
- **One deliberate ref write:** `git fetch --no-write-fetch-head origin refs/heads/main:refs/prefcentre-exec/main`
  in `Web-modules`, to measure claim 1 against the true remote tip rather than a stale local ref.
  Git's opportunistic update fast-forwarded `origin/main` `8bcf9c3 → d7b5f3f` and the `core`
  submodule's own remote-tracking refs as a side-effect. Additive and correcting: no local branch, no
  working tree and no shared file changed, and any lane diffing against `origin/main` now sees the
  true remote instead of a two-day-old one.
- All shell variable references braced (`"${ref}:path"`), per the zsh history-modifier trap.

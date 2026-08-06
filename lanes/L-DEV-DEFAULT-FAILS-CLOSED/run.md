# L-DEV-DEFAULT-FAILS-CLOSED — a local build cannot reach production by forgetting a variable

Measured against **`lane/focustrap-teardown` @ `8ac6f63`**, which is this checkout's branch and *not*
the shipped tip. `nuxt.config.js:45` is identical on this branch and on the tip of what deploys — the
line is the one the brief cites, and nothing between the two branches touches it.

---

## 1. What was wrong, read at the line

```js
API_BASE_URL: process.env.API_BASE_URL || (process.env.NODE_ENV === 'production'
  ? 'https://okamapi.azurewebsites.net'
  : 'https://okamapi.azurewebsites.net'),
```

The ternary is a **no-op**: both arms are the deployed API. Somebody once meant to distinguish dev
from deployed here and the distinction was never filled in, so the file reads as if it has one and
does not. That is worse than having no ternary at all — a reader checking whether dev is handled
sees the shape of a check and moves on.

This value is inlined by webpack's DefinePlugin at **build** time (`env.ts` lists the keys
statically for exactly this reason), so it is chosen once by the process that compiles the bundle,
and nothing at runtime can change it. Both HTTP stacks in the app read that one key:
`core/helpers/configuration.ts:18` and `utils/workforce/api-client.js:111`.

---

## 2. The red, measured, without one packet reaching production

A dev server, `API_BASE_URL` unset, port 3873, started fresh:

```
env -u API_BASE_URL NODE_ENV=development PORT=3873 HOST=127.0.0.1 node node_modules/.bin/nuxt-ts
```

`where-do-requests-go.playwright.js` then opened `/vilkar-store?id=1` — whose `mounted()` calls
`this._storeService.Get(id)`, unauthenticated, a GET, the mildest surface in the app that still
proves the point — with **every off-origin request intercepted and aborted before it left the
browser**, recording only host, method and path. Nothing was sent to the deployed API; nothing was
authenticated; no value was written down.

`red-requests-3873.json`:

```json
"okamapi.azurewebsites.net": { "count": 2, "paths": ["GET /stores/1"] }
```

Two, because the page retries once when the first call fails. `red-config-matrix.txt` shows the same
fact one level up: **every** row of the matrix — dev, build, generate, start, both editions —
resolved to `https://okamapi.azurewebsites.net`.

---

## 3. What was built, and the choice inside it

**Refuse to start.** `nuxt.config.js` now resolves the value through `resolveApiBaseUrl()`, which
throws when a **dev** build names no target.

Refusing was chosen over defaulting to localhost because **silence is the failure shape being
fixed**. A localhost default starts, renders, fetches nothing, and leaves the reader to work out
which of several backends it picked — the same class of mistake one square along. A build that stops
and names the variable cannot be misread, and is one line from fixed. It is also already the
convention here: `test/e2e/scripts/dev-server.js` and `test/e2e/scripts/live-world.sh` both pass the
variable explicitly today, so nothing that runs in this repo is being asked to change.

### The discriminator is NOT "the variable is unset"

That is the trap, and it is the one the brief names. **Unset is exactly the state both deploys are
in**, so "refuse whenever unset" takes `www.okam-swiss.ch` and `okam.no` dark. The discriminator is
the **nuxt command plus NODE_ENV**:

```js
const nuxtCommand = process.argv.slice(2).filter(arg => !arg.startsWith('-'))[0] || 'dev'
const isDevServer = nuxtCommand === 'dev' || process.env.NODE_ENV !== 'production'
```

* `@nuxt/cli/dist/cli-index.js:536-539` (`setup({ dev })`) sets `NODE_ENV=production` **before this
  file is evaluated** for `build`, `generate`, `start` and `export`, and `development` for `dev`.
  `package.json` sets it explicitly again for `dev`, `start` and `generate`.
* `node_modules/.bin/nuxt-ts` does **not** re-spawn — it calls `cli.run(null, hooks)`, and `run()`
  reads `process.argv.slice(2)` in that same process — so argv[2] is the nuxt command in the config's
  own process. A bare invocation is `dev` (the CLI unshifts `"dev"` before dispatching), which is
  what `|| 'dev'` mirrors.
* The two are **ORed**, so neither `NODE_ENV=production nuxt dev` nor a bare `nuxt` can slip a dev
  server past the check, and no deployed command can be mistaken for one.

Escape hatch, deliberately the same single knob: `API_BASE_URL=https://okamapi.azurewebsites.net npm
run dev` still works. It has to be typed. Nuxt reads `.env` before evaluating the config
(`@nuxt/config/dist/config.js:849-854`), and `.gitignore:60` covers `.env`, so the error message
offers that as the remembered form.

---

## 4. What this does to the Swiss build — the question that had to be answered first

`www.okam-swiss.ch` is a Nuxt build **of this repository** (`lanes/L-CORS-NARROW-THE-DEFAULT/
evidence.md:63` measured `/vilkar-store` issuing `GET https://okamapi.azurewebsites.net/stores/1`
against it, 200). Its landing page makes **no API call at all**, so a shallow check of that site says
"safe" and is wrong.

Its build is `vercel.json` → `npm run generate` with `OKAM_EDITION=ch` and **no `API_BASE_URL`**.
`okam.no` is `.github/workflows/nuxtjs.yml` → `npm run generate`, also with no `API_BASE_URL`. Both
therefore run at `NODE_ENV=production` with the variable unset — the exact case the fallback keeps.

**Nothing changes for either.** Proven twice:

* `green-config-matrix.txt` — the `generate` rows, both editions, resolve
  `https://okamapi.azurewebsites.net`, byte-identical to `red-config-matrix.txt`.
* `green-prod-bundle-proof.txt` — two real `nuxt-ts build` runs at `NODE_ENV=production` with
  `API_BASE_URL` unset, one per edition, both exit 0. Each emits 221 client assets, of which **11
  carry `okamapi.azurewebsites.net` (14 occurrences)** and **0 carry any localhost target**. That is
  the same shape a sibling measured on the *deployed* okam.no bundles.

Both builds wrote to `lanes/L-DEV-DEFAULT-FAILS-CLOSED/.nuxt-prod{,-ch}` via
`prod-build.nuxt.config.js` — the repository's real config with **only** `buildDir` and
`generate.dir` moved — so the `.nuxt/` shared by ~124 worktrees was never overwritten by a build.
The 141 MB of output was deleted after the greps were taken; `green-prod-build{,-ch}.log` and
`green-prod-bundle-proof.txt` are what remain.

---

## 5. The green, same probe, same port, restarted per arm

The dev server was **stopped and started fresh for each arm** — a reused server compiled against the
previous config would pass against the defect.

| arm | result | evidence |
|---|---|---|
| dev, `API_BASE_URL` unset | **exit 1, nothing listening on 3873.** Fatal names the variable, both remedies and the typed opt-in | `green-devserver-refuses.log` |
| dev, `API_BASE_URL=http://127.0.0.1:4873` | boots; `GET /stores/1` addressed to `127.0.0.1:4873`; **zero requests to the deployed host** | `green-requests-3873.json` |
| `nuxt build`, `NODE_ENV=production`, unset, `OKAM_EDITION` no / ch | exit 0 both; bundles carry the deployed API | `green-prod-build{,-ch}.log`, `green-prod-bundle-proof.txt` |
| `test/e2e/scripts/dev-server.js` unchanged | boots — the harness sets `API_BASE_URL` itself and never meets the guard | `green-e2e-harness-boot.log` |

---

## 6. The regression guard, and proof it is load-bearing

`test/nuxt-config-api-base-url.test.js` (+ its paired `nuxt-config-api-base-url.loader.js`) holds
**both halves at once**, one fresh child process per case: 8 passed.

It was mutated in both directions, because a guard that only checks one half invites the other
failure:

| mutation | what it restores | suite |
|---|---|---|
| `return DEPLOYED_API_BASE_URL` unconditionally | today's defect | **2 failed** — both fail-closed cases |
| delete the deployed fallback (refuse whenever unset) | the trap that darkens the Swiss site | **3 failed** — okam.no, okam-swiss.ch, build/start |

`nuxt.config.js` was restored from a byte copy after each and re-verified at 8/8.

---

## 7. Everything else that reads the variable, checked before changing it

| consumer | effect |
|---|---|
| `env.ts:7` → `core/helpers/configuration.ts:18` | reads the inlined key; unchanged |
| `utils/workforce/api-client.js:111` | same key; unchanged |
| `test/e2e/scripts/dev-server.js:25,49` | sets `API_BASE_URL` on the compiling process **always**; never meets the guard (booted, above) |
| `test/e2e/scripts/live-world.sh:765`, `guard-proof.js`, `build-provenance-proof.js` | all pass `E2E_API_BASE_URL` through to it |
| `test/e2e/scripts/consumer-dev-server.js:42` | sets `VITE_API_BASE_URL` for a different app; untouched |
| `.github/workflows/nuxtjs.yml`, `vercel.json`, `Procfile` | production commands; default preserved |

`grep`ped for `require`/`import` of `nuxt.config` outside `node_modules`: **no jest test and no
script loads it**, so the throw cannot surprise a suite.

`eslint nuxt.config.js` reports **15 problems before and 15 after** — all pre-existing, none on the
new lines. The two new test files lint clean.

---

## 8. Residual, named rather than left to be discovered

**A *local* `npm run build` / `npm run start` still defaults to the deployed API.** Those commands
run at `NODE_ENV=production`, which is exactly what the deploys are, and this lane deliberately did
not try to tell a laptop's production build apart from a deploy's: the only signals available are CI
markers (`CI`, `VERCEL`, `GITHUB_ACTIONS`, `DYNO`), and a deploy path this repository has that is not
on that list — `Procfile` suggests a Heroku one — would go dark the day it next builds. Breaking a
deploy to tighten a case the exit criterion does not cover is the wrong trade. The dev server, which
is what `npm run dev` gives every reader of the README, now cannot reach production by omission.

## 9. Files

Changed: `nuxt.config.js`, `README.md` (the run command now carries the variable, plus a *"Which
backend am I talking to?"* section). Added: `test/nuxt-config-api-base-url.test.js`,
`test/nuxt-config-api-base-url.loader.js`.

The loader was first written to `test/support/` and **moved out** on finding that `test/support/` is
an *untracked* directory belonging to an unlanded sibling — a file left there dies if that lane is
rolled back.

Ports used: **3873** (dev arms), **4873** (the named local target; nothing needed to listen there,
since the probe aborts the request before it leaves the browser), **3874/4874** (e2e harness boot).
No foreign port was touched, no container started, nothing committed, nothing pushed.

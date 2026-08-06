# Census — which build-derived evidence came from a borrowed tree

Lane `L-WHICH-EVIDENCE-CAME-FROM-A-BORROWED-TREE`, brief `b198ac6d`, class **analysis**.
A census, not a repair. **Nothing was re-run, no worktree but my own was written to, `npm ci` / `npm install`
were not run anywhere, no container was started or touched.**

---

## 0. The tree every number below came from

| number | read from | when |
|---|---|---|
| worktree population, `node_modules` states, symlink targets, `.nuxt`, artifact files | the live filesystem, by absolute path, from `git worktree list --porcelain` captured at `lanes/L-WHICH-EVIDENCE-CAME-FROM-A-BORROWED-TREE/worktrees.raw` | 2026-08-05 09:46–10:05 local |
| lane claims | `/Users/svendaneel/okam/Web-modules/docs/plan/returns/*.md`, 357 files | same session |
| mechanism (`buildDir`) | `/Users/svendaneel/okam/Web-modules/node_modules/@nuxt/cli/dist/cli-generate.js`, `@nuxt/config/dist/config.js`, `playwright.config.js`, `test/e2e/scripts/dev-server.js`, `jest.config.js` | same session |

The shared checkout is `/Users/svendaneel/okam/Web-modules`, branch `lane/focustrap-teardown`, HEAD `8ac6f63`.
`docs/plan/**` is **untracked** in that checkout, so the returns exist in exactly one copy and no worktree
holds a rival version of them — the one place in this census where there is no "which tree" question.

**The population moves while you measure it.** `L-MODULES-PREFLIGHT-FAILS-LOUD` censused 115 worktrees with a
`package.json` at 2026-08-05T04:09:32Z — 21 absent, 80 symlinked. I measure **124 registered worktrees** ~5½
hours later — 18 absent, 91 symlinked. Both are correct at their timestamps; neither is a correction of the
other. My brief's "21 worktrees have none" is that 04:09Z figure, and it is **18 now**. Siblings add and
remove worktrees continuously; every count here is as-of 09:46.

---

## 1. Three states, counted

All **124** registered worktrees (`git worktree list --porcelain`):

| state | count | detail |
|---|---|---|
| **symlink** | **91** | 88 → `Web-modules/node_modules`; 2 (`web-fe-tm`, `web-pos-clock`) → `web-journeys/node_modules`; 1 (`web-fe-growth-guest`) → `Web/node_modules` |
| **own module tree** | **15** | incl. the shared checkout itself and `okam/Web` (the `feature/POS` main checkout) |
| **none at all** | **18** | never installed, or removed since |

Full table: `nm-census.tsv`. Per-tree facts incl. `.nuxt` and artifacts: `tree-facts.tsv`.

---

## 2. The mechanism, narrowed by measurement — it binds to `generate`, not to `dev`

The hazard is real and I reproduced its *site*, but it does **not** apply to every Nuxt invocation. Measured:

- **`@nuxt/cli/dist/cli-generate.js:128** — `config.buildDir = config.static && config.static.cacheDir ||
  path.resolve(config.rootDir, "node_modules/.cache/nuxt")`. `nuxt generate` **moves the build directory
  inside `node_modules`**. `path.resolve` is lexical, so in worktree `X` it writes to
  `X/node_modules/.cache/nuxt` — which, through the symlink, **is the shared checkout's**.
  `nuxt.config.js` sets no `static.cacheDir` (its `static:` block at line 365 is `render.static.maxAge`),
  so the fallback always applies.
- **`@nuxt/config/dist/config.js:139** — default `buildDir: ".nuxt"`. `nuxt dev` and `nuxt build` keep the
  build directory **inside the worktree**. `cli-dev.js` contains no `buildDir` assignment at all.
- **Browser journeys run `dev`, not `generate`.** `playwright.config.js:95` sets
  `webServer.command = 'node test/e2e/scripts/dev-server.js'`, and that script (line 41) spawns
  `node_modules/.bin/nuxt-ts` with **no subcommand** — i.e. `nuxt dev`, `buildDir = <worktree>/.nuxt`.
- **Jest is not exposed.** `jest.config.js` maps `~/` and `@/` to `<rootDir>/` and ignores `/node_modules/`;
  it reads neither `.nuxt` nor `node_modules/.cache`.
- Resolution actually diverges, demonstrated on a live symlinked worktree (`wt-nav`):
  `node_modules/.cache/nuxt/components/../../../../components` is **lexically**
  `/okam/wt-nav/components` and **really** `/okam/Web-modules/components`. Webpack realpaths by default
  (`resolve.symlinks` is set nowhere in this repo), so it takes the second.

**Conclusion: the symlink redirects `npm run generate` and nothing else.** A browser journey in a symlinked
worktree compiles its own `components/` out of its own `.nuxt`.

### The hazard is present tense, and I can name the borrowed tree

The shared `node_modules/.cache/nuxt/components/index.js` (mtime 08-05 08:02) holds **191** entries.
The shared checkout's `components/` holds **197** `.vue` files. Entry 94 declares
`components/admin/meals/MealsReconciliationQueue.vue` — **which does not exist in the shared checkout**
(`find components -name MealsReconciliationQueue.vue` → 0). It exists in eleven other worktrees
(`web-arrival`, `web-collectcond`, `web-dupbuild`, `web-dupkeyguard`, `web-fe-candidate`, `web-fe-tm`,
`web-lint2defects`, `web-lintrunnable`, `web-lintruns`, `web-mealsrecon`, `web-wfack`).

So the index that the **next** `npm run generate` in any of the 91 symlinked worktrees starts from is a
component list from a tree that is neither the shared checkout nor, necessarily, the caller's. That is the
defect standing armed right now, not a reconstruction of the one that was caught.

---

## 3. Which trees actually ran a build or a browser

`.nuxt/` is gitignored and cannot come from a checkout, so its presence proves a `nuxt dev`/`build` ran **in
that directory**. `artifacts/` is likewise gitignored except for a short force-added allowlist, so an
`artifacts/journeys/*.playwright.json` on disk but **not in `git ls-files`** proves a browser ran there.
(My first pass used `git status --porcelain -uall` and found only 5 such trees — wrong, because `-uall`
still hides *ignored* files. Disk-set minus `git ls-files` is the instrument that works. `35` trees hold
locally-produced artifacts.)

**47 of 124 worktrees show a local Nuxt run and/or locally-produced browser artifacts:**

| state of that tree's `node_modules` today | trees | exposure |
|---|---|---|
| **symlink** | 29 | exposed **only if the run was `npm run generate`**; not exposed for `nuxt dev`/journeys |
| **own module tree** | 12 | not exposed |
| **none today, yet the tree demonstrably built** | 6 | **state at run time is unknowable** |

In all 29 symlink cases the symlink's own mtime **precedes** that tree's `.nuxt` and artifact mtimes
(usually by minutes), so where a run happened the symlink was already in place. Table: `joined.txt`.

The six that built and have no module tree today — the module tree was removed after the fact, so nothing
on disk says whether it was a symlink or its own:

`web-fe-growth-honesty`, `web-fe-suppbasis`, `web-fe-wf-inbox`, `web-fe-wf-personnel`,
`web-wf-oplink` (5 own artifacts), `wt-prefcentre-fe` (5 own artifacts).

Trees holding their own `node_modules/.cache/nuxt` — i.e. that ran `generate` in isolation, unexposed:
`Web`, `web-dupbuild`, `web-fe-events-guest`, `web-fe-margin-supplier`, `web-fe-meals-write`,
`Web-modules`, `web-print-host`, `wt-evtb`.

---

## 4. The lane population

**74 lanes** whose returned evidence involved a build or a browser run — selected from the 357 returns by
citing a `.playwright.json`, reporting a journey/Playwright pass, saying the work was driven in a browser,
or naming a `generate`/`build` run. Pure code-reading and Jest-only lanes are **out of population**: Jest
does not touch either build directory (§2).

Attribution rule, deliberately strict — a tree is named only when (a) the lane id's slug equals a live
worktree's branch, (b) the return writes "worktree `<name>`", or (c) the `evidence:` line carries a path
under a live worktree. Everything else is **UNKNOWN**. A looser first pass matched any worktree name
appearing anywhere in the text and produced confidently wrong answers — it put `L-GR-EXIT-WIRE-THE-MAIL`
in `web-kodeui`, which that return mentions only as *another lane's* orphaned fixture, and
`L-LINT-RUNNABLE` in `web-menu-allergen`. Those attributions are discarded, not softened.

### 4a. Tree identified — 23 lanes

| lane | tree | `node_modules` today | ran locally | verdict |
|---|---|---|---|---|
| L-ARTIFACT-NAMES-ITS-LOCALE | web-artloc | symlink | yes | browser (dev) — not exposed |
| L-COMPOSE-FE-CANDIDATE (×3 returns) | web-fe-candidate | symlink | yes | browser (dev) — not exposed |
| L-DUPLICATE-KEY-IN-THE-BUILD | web-dupbuild | own-dir | generate | **was exposed, caught and corrected in-lane** |
| L-EV-JOURNEY-TIMEBOMB | wt-evtb | own-dir | yes | not exposed |
| L-EV-STALE-CAUSE | web-evstale | symlink | yes | browser (dev) — not exposed |
| L-FE-WF-INVITE-LIST-REVOKE | web-fe-invlist | symlink | yes | browser (dev) — not exposed |
| L-JOURNEY-WORKFORCE | wt-jwf | symlink | yes | browser (dev) — not exposed |
| L-LINT-RUNNABLE | web-lintrunnable | symlink | no run | claim *about* the build; no build run — out |
| L-LIVE-WORLD-ADMINCRED | web-admincred | none | no run | its cited fixture run is not in this tree — **unknown** |
| L-MEALS-RECONCILE-UI | web-mealsrecon | symlink | no run | return states journeys not run — out |
| L-MENU-ALLERGEN-MATRIX | web-menu-allergen | own-dir | yes | not exposed |
| L-MODAL-BROKEN-TWO | web-modal-two | symlink | artifacts only, `.nuxt` since deleted | browser (dev) — not exposed |
| L-MODAL-SCROLLLOCK | web-modal-scrolllock | symlink | yes | browser (dev) — not exposed |
| L-MODAL-SEVEN | web-modal-seven | symlink | yes | browser (dev) — not exposed; return *states* the symlink |
| L-PRINT-HOST | web-print-host | own-dir | yes | not exposed |
| L-STATUTE-EVIDENCE-WORLD | web-statute-world | symlink | yes | browser (dev) — not exposed |
| L-STATUTE-HONESTY | web-statute | symlink | yes | browser (dev) — not exposed |
| L-VUE3-SHAPE-GUARD | web-vue3shape | symlink | no run | claim *about* CI's generate; no build run — out |
| L-WF-IDREG | web-wf-idreg | symlink | no run | no browser run in this tree — **unknown** |
| L-WF-INVITE-SURFACE | wt-wfinvite | symlink | yes | browser (dev) — not exposed |
| L-WF-KODEOVERSIKT-UI | web-kodeui | symlink | yes | browser (dev) — not exposed |
| L-WF-LINK-DEADEND | web-linkdeadend | symlink | no run | return says nobody walked it — out |
| L-WF-OPLINK | web-wf-oplink | **none today, but it built** | yes, 5 artifacts | **state at run time unknowable** |

### 4b. Tree NOT identifiable — 51 lanes, and this is the answer, not a gap to be filled by guessing

Their worktree has been removed, or the return never named one. **They cannot be classified.** Listing them
as unknown *is* the result:

L-ARTIFACT-FIELDS-VS-HARNESS · L-ARTIFACT-PROVENANCE · L-ARTIFACT-RANK-KEY · L-BUILT-BUT-ON-NO-REF ·
L-CONFIRM-ADMIN-SURFACE · L-CORE-ORE-LABEL · L-EV-ACCEPT-RECEIPT · L-EV-DEPOSITS-PRECONDITION ·
L-EV-FAMILY-LAND · L-EV-RUNSHEET-PRINT · L-FE-JOURNEYS-MERGE · L-FE-WF-ONBOARD-WALK ·
L-FLAGS-JOURNEY-SWEEP · L-FLAGS-NOTE-FALSIFIABLE · L-GR-CONFIRMED-PIN-FIX · L-GR-DEADLINE-ONWIRE ·
L-GR-EXIT-WIRE-THE-MAIL · L-GR-PRIVACY-VENUE · L-GROWTH-PREFCENTRE · L-JOURNEY-ARTIFACTS-UNWITNESSED ·
L-JOURNEY-COVERAGE-THREE · L-JOURNEY-EVENTS · L-JOURNEY-GROWTH · L-JOURNEY-MARGIN ·
L-JOURNEY-PORT-HARDCODED · L-JOURNEY-TRAINING · L-LIVE-BUILD-EXPORT · L-LIVE-SEED-VIA-PRODUCT ·
L-LIVE-WORLD-DISCOVER · L-LIVE-WORLD-SEED · L-MEALS-FUNDED · L-MEALS-STALE-TOKEN ·
L-MEALS-STATEMENT-SURFACE · L-MODAL-LAND · L-PRICE-NULL-ZERO · L-TRAIN-DISCLOSURE ·
L-TRAIN-EVIDENCE-NAMES-COURSE · L-TRAIN-EVIDENCE-PACK-UI · L-TRAIN-PUBLISH-UNCLICKABLE ·
L-TRAIN-W3-SCHEMA · L-WF-CONTACT-IMPORTED · L-WF-DEMO-PRESENCE · L-WF-FAILURES-SURFACE · L-WF-FLAGS-UI ·
L-WF-ONBOARD · L-WF-PIVOT-DEFECTS · L-WF-PUBHIST · L-WF-PUNCH-UI · L-WF-ROLES-UI · L-WF-TIMESHEET-UI ·
L-WORLD-STAMP-WINDOWS

Two of these named their own isolation and are probably clean, but I did not verify a tree that no longer
exists and am not counting their word as measurement: `L-LIVE-WORLD-DISCOVER` ("my own detached worktree
with its own `.nuxt`, **cloned** node_modules"), `L-JOURNEY-REGRESSION-BISECT` ("shared
`node_modules/.cache` untouched").

---

## 5. What cannot be trusted without a re-measure

Ranked by how much the doubt is worth:

1. **Nothing in the browser-journey population is impeached by *this* hazard.** That is the census's main
   result and it is a narrowing, not a clearance — journeys run `nuxt dev`, whose build directory is inside
   the worktree. Re-measuring 40-odd journeys would buy nothing.
2. **`npm run generate` evidence in a symlinked tree is the exposed class, and it has exactly one member** —
   `L-DUPLICATE-KEY-IN-THE-BUILD`, which detected the fault itself, re-measured under `cp -Rc`, and whose
   worktree carries its own module tree today. Its numbers stand; the corrected run is the one it reported.
3. **`L-WF-OPLINK`** — built, 5 locally-produced artifacts, and its module tree is gone. Re-measure if that
   lane's browser evidence is load-bearing; a `dev` run means it is fine, but nothing on disk now says so.
4. **The 51 unattributable lanes** — cheapest fix is forward-looking, not archaeological: every future
   journey artifact should record the **realpath of `node_modules`** and the build directory used, beside
   the commit it already records. `artifact-store.js` already stamps commit and dirtiness; this is one more
   field, and it is the only thing that would have made this census a lookup instead of an inference.
5. **The shared cache should be treated as another lane's property.** It is a single mutable file that any
   `generate` in 91 worktrees reads and writes; today it describes a tree that is not the shared checkout
   (§2). This is a defect to fix, not a claim to re-measure — but it is out of this lane's scope.

## 6. Adjacent hazards found while counting, and explicitly *not* the same thing

- **`node_modules/.cache/pwa/icon`** (mtime 08-05 09:44) is a second shared cache site under the same
  symlink. Cosmetic, not evidentiary; noted so the next lane does not rediscover it as this one.
- **`node_modules/.cache/babel-loader`** is content-addressed and safe.
- **Multiple `nuxt dev` in one checkout sharing `.nuxt/`** — already recorded as `F-DEV-SERVERS-SHARE-BUILD`,
  and it is the hazard that *does* bite journeys. Different mechanism, same family; not re-litigated here.
- The `core/` submodule borrow/release and Playwright's `reuseExistingServer` adopting foreign fixtures are
  both recorded elsewhere and are likewise not this.

---

### Artefacts in this lane directory
`worktrees.raw` · `wt-paths.txt` · `wt-table.tsv` · `nm-census.tsv` · `tree-facts.tsv` ·
`artifact-origin.tsv` (the wrong-instrument first pass, kept) · `artifact-origin2.tsv` · `joined.txt` ·
`cand-buildish.txt` · `cand-browser.txt` · `buildish-lines.txt` · `lane-tree-signals.tsv` ·
`roster.txt` (loose pass, kept as the discarded number) · `roster2.txt` (strict pass, §4).

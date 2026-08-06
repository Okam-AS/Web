# What a clean machine and a clone actually get

Walked 2026-08-05 by `L-CANNOT-BE-REBUILT-CENSUS`. Every row below is a command that was run, not a
claim assembled from prior findings. Two of the three inherited flags did not survive the walk.

**The one-line answer: a clone gets `main`.** `origin/main` (d7b5f3f2) clones, initialises its
submodule, installs, and builds. **None of the module program is reachable from any remote** — 135
frontend commits and 507 backend commits, plus the pinned `core` object and the entire plan hub, exist
on this laptop and nowhere else. A stranger with the two clone URLs cannot check out, build, test or
read the thing this plan is about.

Scratch root for every run below: `/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/census/`
Raw output: `lanes/L-CANNOT-BE-REBUILT-CENSUS/evidence/`

---

## Frontend — `git@github.com:Okam-AS/Web.git`

| # | Step (exact command) | Result | Owner-only? |
|---|---|---|---|
| FE-1 | `git clone git@github.com:Okam-AS/Web.git` | **works** — lands on `main` d7b5f3f2 | — |
| FE-2 | `git checkout feature/restaurant-modules` | **FAILS** `error: pathspec 'feature/restaurant-modules' did not match any file(s) known to git` | **yes — needs a push** |
| FE-3 | `git submodule update --init --recursive` | **FAILS** `fatal: remote error: upload-pack: not our ref 1bcab0b6…` (exit 128) | **yes — needs a push** |
| FE-4 | `npm ci` | **works** — 2611 packages, exit 0 | — |
| FE-5 | dependency resolution without the lockfile (`npm install` on a bare `package.json`) | **FAILS** `npm error code ETARGET / notarget No matching version found for @nuxt/cli-edge@*` | **yes — dependency ruling** |
| FE-6 | `npm run build` (`nuxt-ts build`) | **works** — `Ready to run nuxt generate` | — |
| FE-7 | `npm test` | **FAILS** 2 of 2583, `test/journey-artifact-store.test.js` — the suite asserts this laptop's **directory name** | no — repairable in-repo |
| FE-8 | `npm run test:e2e` | **FAILS** 1 of 22 — a `@live` journey runs in fixture mode | no — repairable in-repo |

### FE-2 — the integration branch is on no remote
`git ls-remote --heads origin` (live, 2026-08-05) returns seven refs: `backup/pre-core-consolidation`,
`feature/POS`, `feature/dintero-in-person-terminal`, `feature/email-campaign`, `feature/swiss`, `main`,
`swiss`. **`feature/restaurant-modules` is not among them, and neither is `candidate/fe-compose-2026-08-05`.**

- `feature/restaurant-modules` = **e34977ac**, `git branch -r --contains` → nothing, **135 commits** past `origin/main`.
- `candidate/fe-compose-2026-08-05` = **f40fdf36**, contained by no remote ref, **240 commits** past `origin/main`.

This is the first gate. Every row below FE-2 was only reachable by cloning the branch **from local disk**
(`git clone --branch feature/restaurant-modules file:///Users/svendaneel/okam/Web`) — a deliberately
charitable substitute that gives a newcomer *more* than a real clone can get, so every failure found
below it is a failure a real clone would hit a fortiori.

### FE-3 — the submodule pin exists on one disk
`.gitmodules` → `url = https://github.com/Okam-AS/Core.git`, gitlink `1bcab0b6b3882bc232795437d7ad48455a5af0a6`.
The Core clone itself succeeds (public, no auth); the **object** is refused by `upload-pack`. The only
ref anywhere containing it is `refs/heads/lane/core-ore-label` in
`/Users/svendaneel/okam/Web/.git/worktrees/Web-modules/modules/core`, whose tip **is** 1bcab0b6.

**The break is branch-specific, and that is new.** `origin/main`'s gitlink (2a2e7b3e) initialises
cleanly in the fresh clone — `Submodule path 'core': checked out '2a2e7b3e…'`. So Core is not broken;
one unpushed lane commit was pinned into two module branches.

If this disk is lost, the pinned Core commit is gone and `feature/restaurant-modules` can never be
built again by anybody, including its author.

### FE-4 / FE-5 — the install claim was wrong, and the real failure is narrower
The standing brief hazard is *"`npm install` and `npm ci` fail repository-wide."* **On a fresh clone of
the integration branch `npm ci` succeeds**, twice measured, both on the pinned Node and on the host's:

- node v22.23.1 / npm 10.9.8 (`.nvmrc` = 22, `engines.node` = `22.x`): exit 0.
- node v24.15.0 / npm 11.14.1: exit 0, with `npm warn EBADENGINE`.

`npm install` on the existing tree also exits 0 (`up to date`). The hazard traces to `plan.md:13468`,
which reasoned that the lock's root record of `vue` disagreed with `package.json` and that "`npm ci`
refuses when that disagrees" — and then, in the same passage, **declined to run `npm ci` to check**,
correctly, because the module tree is shared. The unverified inference hardened into a hazard line
repeated in later briefs. Measured now: root record `^2.6.14`, `package.json` `^2.6.14` — they agree.

**What is genuinely unbuildable is resolution without the lockfile.** `@nuxt/cli-edge` is declared `*`;
every published version is a semver **prerelease** (`latest` = `2.18.2-28661769.e265ef3`,
`next` = `3.0.0-26556502.75dd90f2`), and `*` matches no prerelease. So the lockfile can never be
regenerated, `npm install <anything>` cannot complete, and the current lock survives only because it
pins `2.17.2-28177940.14bb6c2` by URL. That is a live dependency ruling, unchanged by this correction.

The *other* half of the hazard is true and is why nobody had walked this: **98 of 133 worktrees
symlink `node_modules` at `/Users/svendaneel/okam/Web-modules/node_modules`** (17 real dirs, 18 absent).
`npm ci` in the shared checkout still deletes the tree 98 worktrees are using. Both statements can hold
at once: *unsafe here*, *fine in a clone*. Only the second was ever in doubt, and it was never tested.

### FE-7 — the fourth thing: the unit suite asserts the checkout's directory name

```
Test Suites: 1 failed, 111 passed, 112 total
Tests:       2 failed, 2581 passed, 2583 total

● backend identity › asks whoever is holding the port what directory they are running from
    Expected pattern: /^Web-modules@[0-9a-f]{40}(\+dirty)?$/
    Received string:  "fe-int@e34977acebd59b223584158c33451b6f1ffd82c1"
```

`test/journey-artifact-store.test.js:295` and `:457` pin the literal `Web-modules`, while the store
derives the name from `path.basename(repo)` (`:407`). The repository is `Okam-AS/Web`, so the default
clone is `Web/` and the suite is red on it.

**Proven by isolating the single variable:** the identical tree renamed to `Web-modules/` →
`Tests: 38 passed, 38 total`, exit 0; renamed back → the two failures return. Nothing else changed.

`npm test` is, by the plan's own account (`plan.md:13462`), *"the only check runner this repository
executes."* On a faithful clone it does not pass.

### FE-8 — the default e2e command is red on a clean checkout

```
1 failed  [chromium] › test/e2e/journeys/workforce-schedule-publish.spec.js:37:1 … @live
21 passed (2.5m)

Error: The validation panel is not the pack. Expected 11 rule results (break-required, daily-rest,
minor-block, night-window, ordinary-weekly-hours, overtime-annual, overtime-four-weeks,
overtime-weekly, plan-notice-lead, scheduled-vs-contract, weekly-rest) and got 2
(workforce.rest-period, workforce.weekly-hours).
```

`playwright.config.js:142` reads `grepInvert: LIVE_API ? /@fixture/ : undefined` — live runs exclude
fixture journeys, but **fixture runs exclude nothing**, so all three `@live`-tagged journeys run against
the fixture. Two tolerate it; `workforce-schedule-publish` transcribes the backend's eleven-rule pack
(`WorkforceRulePackSeed.cs`) while `test/e2e/fixture/` answers two. The tree is self-inconsistent: the
assertion helper carrying the eleven ids and the two-rule fixture are both on the integration branch,
on `candidate/fe-compose-2026-08-05`, and on this lane's HEAD.

Everything else the walk needed worked from the clone: Playwright's config parses (`Total: 22 tests in
22 files`), the fixture server and `nuxt dev` both boot, and 21 journeys pass — so this is one broken
journey and one missing grep, not a missing harness.

### FE-9 — nothing in CI would ever have caught FE-7 or FE-8
`.github/workflows/` holds exactly two files. `claude.yml` responds to `@claude` comments. `nuxtjs.yml`
is the GitHub Pages sample: it triggers **on `main` only**, runs `npm ci` then `npm run generate`, and
**runs neither `npm test` nor the e2e suite anywhere**. It also pins `node-version: "16"` against
`engines.node: 22.x` and `.nvmrc` 22. It does set `submodules: true`, so it would have caught FE-3 —
on `main`, where the pin is fine.

### FE-10 — the plan itself is on no branch
`docs/plan/` holds **826 files, 14M** — `intent.md`, `plan.md`, `log.md`, and the `returns/`, `briefs/`,
`walks/`, `reviews/`, `lanes/` beneath it. In the shared checkout: `git ls-files docs/plan` → **0**;
`git status --porcelain -uall docs/plan` → **428** untracked entries. It is **not ignored** —
`git check-ignore -v docs/plan docs/plan/plan.md docs/plan/intent.md` exits 1 with no match. It was
simply never committed.

`git ls-tree -r --name-only <branch> -- docs/plan`: `feature/restaurant-modules` **0 files**,
`origin/main` **0**, this lane's HEAD **0**. `candidate/fe-compose-2026-08-05` carries **4** — four
return files (`L-JOURNEY-MEALS-1`, `L-JOURNEY-PROXY-BLINDSPOT-1`, `L-PRICE-SHADOW-GUARD-1`,
`L-WF-KODEOVERSIKT-UI-1`), swept in by a lane commit rather than by intent.

A clone gets no objective, no constraints, no flags, no decisions and no returns. The census this file
belongs to is itself in the set of things that cannot be rebuilt.

### FE-11 — the lane evidence is in the same condition
`lanes/`: **129 files tracked**, **1304 untracked** in the shared checkout (125 tracked on the
integration branch). The findings, receipts and mutation logs the plan cites as evidence are, in the
main, on one disk.

---

## Backend — `git@github.com:Okam-AS/OkamAPI.git`

| # | Step (exact command) | Result | Owner-only? |
|---|---|---|---|
| BE-1 | `git clone git@github.com:Okam-AS/OkamAPI.git` | **works** — lands on `master` | — |
| BE-2 | `git checkout feature/restaurant-modules` | **FAILS** `error: pathspec … did not match any file(s) known to git` | **yes — needs a push** |
| BE-3 | any `dotnet` command in the repo | **works here only by accident** — `global.json` pins SDK `8.0.110` with no `rollForward` | no — repairable in-repo |
| BE-4 | `dotnet restore` → `dotnet build` | **works** — `Build succeeded. 0 Warning(s) 0 Error(s)` | — |
| BE-5 | migration chain from empty | **no conflict found** — the recorded double-add is on another branch | — |
| BE-6 | `dotnet test` | **not walked** — needs a Testcontainers SQL slot this brief does not grant | — |

### BE-2 — same shape, larger
Live `git ls-remote --heads origin` returns thirteen refs (`master`, `test`, `rebrand`,
`feature/POS`, `feature/email-campaign`, `feature/restaurant-control-stage0`,
`feature/shift-scheduling`, six `claude/*`). **No `feature/restaurant-modules`.** Local tip
**8e2b57de**, contained by no remote ref, **507 commits** past `origin/master`, 411 past
`origin/feature/POS`, 467 past `origin/feature/restaurant-control-stage0`. Note that
`feature/rebrand-ali`, present as a remote-tracking ref in the local checkout, is **not** on the remote
today — remote-tracking refs in this estate are stale and should not be read as the remote's answer.

### BE-3 — the SDK pin only resolves on this machine
`global.json` is `{"sdk":{"version":"8.0.110"}}` with **no `rollForward` key** (`grep -c rollForward` →
0). Default resolution is `latestPatch`, which stays inside the `8.0.1xx` feature band. This laptop has
both `8.0.110` and `8.0.422` installed, so `dotnet --version` in the repo answers `8.0.110` and
everything works. A machine that installs today's .NET 8 SDK gets an `8.0.4xx` band and gets nothing —
reproduced with a probe `global.json` pinning an uninstalled band:

```
The command could not be loaded, possibly because:
  * You intended to execute a .NET SDK command:
      A compatible .NET SDK was not found.
```

Not a push problem and not a ruling — one `"rollForward": "latestFeature"` line closes it.

### BE-5 — the third inherited flag is not on this branch either
`dotnet ef migrations script --no-build` generates the full from-empty chain (127 migrations, 281,987
bytes, `census/chain.sql`) without a database. Replaying that script statically — tracking
`CREATE TABLE`, `ALTER TABLE … ADD`, `DROP COLUMN`, `sp_rename` and `DROP TABLE` — finds **zero**
duplicate column definitions and zero tables created twice. `Orders.TableId` appears exactly once as a
column add (`chain.sql:3626`), from `20260709231226_POSv1`.

The recorded defect is real but lives elsewhere: on **`origin/rebrand`**, both
`20260701102500_AddPosTablesAndZones.cs` and `20260709231226_POSv1.cs` add it. On the integration
branch the first of those two does not exist.

**Bounded claim:** the generated SQL contains no duplicate-object conflict. It has **not** been applied
to a live SQL Server in this walk — no container slot was granted — so triggers, seeds and FK ordering
are unproven. What is disproved is that *this* branch carries the twice-recorded `Orders.TableId`
collision.

---

## Owner-only rows, separated

**Needs a push and nothing else** (no code change, no ruling):
1. `Okam-AS/Web` — `feature/restaurant-modules` (e34977ac, 135 commits) and, if it is the real head,
   `candidate/fe-compose-2026-08-05` (f40fdf36, 240 commits).
2. `Okam-AS/Core` — the commit `1bcab0b6` on `lane/core-ore-label`. Until this is pushed, pushing the
   frontend branch is not enough: the clone still cannot init its submodule.
3. `Okam-AS/OkamAPI` — `feature/restaurant-modules` (8e2b57de, 507 commits).

**Needs a ruling:**
4. `@nuxt/cli-edge: "*"` — a prerelease-only package behind a stable range. Pin it to the URL the lock
   already carries, move it to the `next`/`latest` dist-tag, or drop it; until then no dependency in
   this repository can be added, updated or re-resolved.

**Needs a decision that is not a repair:**
5. Whether `docs/plan/` and the untracked half of `lanes/` are committed, backed up, or accepted as
   disposable. They are not ignored; they are simply on one disk.

**Repairable in-repo by any lane** (named here, deliberately not touched — repairing them would make
this census unreproducible):
6. FE-7 — `test/journey-artifact-store.test.js:295,457` hard-code the directory name `Web-modules`.
7. FE-8 — `playwright.config.js:142` does not exclude `@live` when `LIVE_API` is unset; the fixture
   answers 2 of the 11 rules `workforce-schedule-publish.spec.js` transcribes.
8. FE-9 — no workflow runs `npm test` or the e2e suite; the one build workflow pins node 16 against
   `engines.node: 22.x`.
9. BE-3 — `global.json` has no `rollForward`.

---

## Instrument notes earned in this walk

- **`| tail` eats the exit code.** `git submodule update --init --recursive 2>&1 | tail -20` reported
  `EXIT=0` over a fatal error; redirected to a file the same command is **128**. Every result above was
  re-taken without a pipe. This is the same class as the `|| echo 0` warning in the brief.
- **The shared checkout's remote-tracking refs are stale.** `origin/main` here is `8bcf9c34`; GitHub's
  `main` is `d7b5f3f2`. `origin/feature/rebrand-ali` exists locally in the backend and not on the
  remote. Anything measured as "ahead of `origin/…`" in a worktree is measured against a stale ref —
  `git ls-remote` is the only answer that is the remote's.
- **A local `file://` clone is the right substitute for an unpushed branch**, and it must be labelled:
  it grants a newcomer strictly more than the remote does, so it can only ever prove failure, never
  success. Cloning from a worktree's `modules/` gitdir serves that worktree's refs, so the pinned
  commit had to be fetched by explicit refspec.
- The `protocol.file.allow=always` warning in the brief did not bite here: the real `.gitmodules` URL
  is `https://`, and the plain form was refused only in the local-substitute path.

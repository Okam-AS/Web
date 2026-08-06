# L-LINT-RUNNABLE — eslint runs by one documented command, and reds

**The one command is `npm run lint`.** It did not exist. `.eslintrc.js` and 207 rules at `error`
did.

Tree under measurement: worktree `/Users/svendaneel/okam/web-lintrunnable`, branch
`lane/lint-runnable`, cut from `candidate/fe-compose-2026-08-05` = `9f7d8df`, submodule
`core` at its gitlink commit `1bcab0b`. Evidence written here, in
`/Users/svendaneel/okam/Web-modules/lanes/L-LINT-RUNNABLE/` — a **different tree** from the one
measured. All numbers below carry the tree and the moment they were taken.

---

## 1. eslint runs. This is not the `fail-spec` case.

The brief's more interesting outcome — a missing plugin, an unresolvable config, a parser the repo
no longer has — **did not happen**, and it was checked rather than assumed:

| check | result |
|---|---|
| `eslint --version` | `v7.32.0`, present in `node_modules/.bin` |
| `eslint --print-config` for a `.ts`, a `.js` and a `.vue` path | exit 0 for all three, 17 664 bytes, identical (no `overrides` in play) |
| plugins the resolved config loads | `promise, node, import, vue, unicorn, jest, @typescript-eslint, nuxt` — all resolve |
| parser | `vue-eslint-parser` |
| **rules at `error`** | **207** (plus 37 at `warn`, 7 `off`) |
| fatal / parse errors over the whole repository | **0 of 878 files** |

`.eslintrc.js` itself sets 14 rules: **10 at `warn`, 4 switched off, none at `error`.** So **every
one of the 207 error rules comes from `@nuxtjs/eslint-config-typescript` and
`plugin:nuxt/recommended`** — nobody in this repo chose them one by one, which is part of why nobody
noticed nothing was running them.

Full resolved error set: `error-rules.txt`. Resolved config: `printconfig-ts.json`.

---

## 2. What was added

Three files, in the lane worktree. **No CI workflow**, per the brief.

| file | what it does |
|---|---|
| `package.json` | `"lint": "eslint --ext .js,.ts,.vue ."` — one line, one command |
| `.eslintignore` | the scope, with the reason for each exclusion written next to it |
| `README.md` | how to run it, what it reports today, and **what a gate would need** (§6) |

`--ext` is not optional: eslint's default extension is `.js` alone, so without it the command would
silently skip **every `.ts` and `.vue` file** — 314 of the 607 it reads, 51.7 % — and report a much
smaller number with no indication anything was missed. That is precisely the "plausible result
rather than an error" failure this program keeps finding.

**`.eslintignore` excludes four things and no more.** eslint does not read `.gitignore`, so build
output has to be named:

- `.nuxt`, `dist`, `coverage`, `static/sw.js` — generated, not authored.
- **`core`** — a git submodule (`Okam-AS/Core`), a separate repository. This repo's `.eslintrc.js`
  declares `root: true` and does not govern it. Linting it reports **409 errors over 253 files**
  that nobody in this repo can land a fix for.
- **`lanes`** — lane working directories. The same exclusion, and the same reason, that
  `jest.config.js` already applies in `testPathIgnorePatterns`: what lands there is evidence, not
  source. **32 errors over 17 files.**

Both exclusions are scoping, not weakening. No rule was switched off, no severity lowered, no
plugin removed — and the full unignored number is reported in §4 alongside the scoped one so the
scoping cannot hide anything.

Cross-check that the ignore file does exactly what it says: the same run driven by explicit
`--ignore-pattern` flags instead of the file returns not just the same totals but a **byte-identical
report** — `md5 31e9f85e57ca00539c4623794ff5c8a4`, the same digest as the clean `.eslintignore` run
before the mutations and the clean run after them. Three reports, one digest; only `run-final.json`
is kept.

---

## 3. It reds. Proven against a deliberately introduced violation.

`falsify.sh` drives it; full transcript in `falsify.txt`; **27 assertions, 0 failures, driver exit
0**. Every mutation is asserted to have **landed** — `git diff --numstat`, an occurrence count of
the introduced token, and `git status` — before any lint result is read. Every reversion is asserted
to have **reverted**.

The rule is **`eqeqeq`**, resolved to `["error","always",{"null":"ignore"}]` — already `error`,
untouched by this lane. It is deliberately **not** `no-dupe-keys`: that one now has its own coverage
from `L-DUPLICATE-KEY-GUARD`, and demonstrating on it would prove nothing new.

| tree | `npx eslint <file>` | `npm run lint` (whole repo) |
|---|---|---|
| clean `9f7d8df` | `utils/body-scroll-lock.js` **exit 0**, 0 errors 0 warnings | **exit 1** — 607 files, **678 errors**, 7585 warnings |
| + `a == b` appended to `utils/body-scroll-lock.js` | **exit 1** — exactly 1 error, `eqeqeq` at `:88`, the line just added | **exit 1** — **679 errors**; `diff` of the two full error lists shows **exactly one new line-item**, and it is `eqeqeq @ utils/body-scroll-lock.js:88` |
| violation removed | **exit 0**, 0 errors | 678 / 7585 / 607 — every one back to baseline |
| + `1 == 2` inside `<script>` of `components/admin/growth/GrowthSendGate.vue` | **exit 1** — exactly 1 error, `eqeqeq` at `:130` | (file-scope only) |
| violation removed | **exit 0** | tree carries only this lane's three intended files |

**Why the second mutation exists.** `.vue` is **308 of the 607** files this command reads — the
majority of the repo's authored surface. A `.js`-only demonstration would not distinguish "eslint
reds" from "eslint reds on JavaScript and silently skips every `<script>` block", and a broken
`vue-eslint-parser` would look exactly like a clean repo. It reds inside the SFC, so the parser path
is live.

**One instrument correction inside this lane.** Mutation B was first inserted at the top of the
`<script>` block, above the imports. It produced **two** errors, not one — `eqeqeq` and
`import/first` — because a statement above an import block violates a second rule. That is correct
eslint behaviour and a wrong demonstration: it would have made a two-rule result read as a one-rule
result. The probe was moved below the import block and the assertion now pins the exact rule and the
exact line, so this cannot recur silently. The failing first run is reproducible from git history of
`falsify.sh`.

**No lint output is ever piped into `head` or `grep`.** eslint writes JSON to a file with `-o` and
the file is read afterwards. The sibling lane's first falsification reported a *stronger* red than
reality because `head` closed a pipe and the workers took SIGPIPE; that failure mode is designed out
here rather than watched for.

---

## 4. The clean run is not clean. The number is the finding.

**`npm run lint` exits 1 on an unmodified tree, and will until someone clears the backlog.** This is
what a repository looks like when its linter has never run.

| tree | as of | files | with problems | **errors** | warnings | distinct error rules | fatals |
|---|---|---|---|---|---|---|---|
| `candidate/fe-compose-2026-08-05` `9f7d8df`, clean | 2026-08-05 05:51 CEST | 607 | 172 | **678** | 7 585 | 27 | 0 |
| `feature/restaurant-modules` `e34977a`, shared checkout, **304 dirty files** | 2026-08-05 05:53 CEST | 624 | 171 | **661** | 7 579 | 26 | 0 |
| `9f7d8df` with **nothing** ignored (adds `core/` + `lanes/`) | 2026-08-05 05:47 CEST | 878 | 292 | 1 119 | 10 159 | — | 0 |

The two trees differ by **+17 files and −17 errors**, which is the point of quoting the tree: an
hour of lanes landing moves this number in both directions at once. Neither number is "the repo's
lint count" without its ref and its moment.

**Which rules.** Three formatting rules are 508 of the 678 — 75 %:

| rule | count | | rule | count |
|---|---:|---|---|---:|
| `curly` | 247 | | `object-shorthand` | 8 |
| `arrow-parens` | 163 | | `require-await` | 7 |
| `vue/max-attributes-per-line` | 98 | | `brace-style` | 7 |
| `operator-linebreak` | 32 | | `no-unused-vars` | 6 |
| `object-property-newline` | 28 | | `import/order` | 6 |
| `@typescript-eslint/no-unused-vars` | 17 | | `no-useless-computed-key` | 4 |
| `quote-props` | 15 | | `no-multi-spaces` | 3 |
| `unicorn/prefer-includes` | 13 | | 11 further rules | 1–2 each |
| `multiline-ternary` | 10 | | | |

Per-rule and per-file detail: `run-final.json` (candidate), `shared-checkout.json` (shared),
`full-all.json` (nothing ignored). Worst files, all `pages/admin/*`: `import.vue` 78,
`poweruser-growth.vue` 56, `statistics.vue` 43, `kravia-invoice.vue` 39, `products.vue` 29.

**Clearing them is not this lane** and was not attempted. Two observations for whoever does:
`--fix` resolves most of the three big formatting rules mechanically, and roughly **50**
non-formatting errors remain — fewer than they look, because `no-unused-vars` and
`@typescript-eslint/no-unused-vars` are both on and every one of the 6 base-rule reports has a
`@typescript-eslint` twin at the identical line, so those 23 reports are 17 findings. Those are the
ones worth reading one by one.

### 4b. Two of the 678 are defects, not style — and one is live in both trees

Reported, **not fixed**.

- **`pages/admin/overview.vue:541` — `no-dupe-keys`, `Duplicate key 'storeOverview'`. Present in
  both trees.** Two `watch: { storeOverview: … }` entries in one object literal; the second wins and
  **the first is silently dropped**. The dropped one recomputes `totalOrderCount` and
  `totalAmountSum`. Judgement, stated so it is not overread: the `sortedStores` watcher immediately
  above it (`:525`, `immediate: true, deep: true`) performs the same two reductions, and
  `sortedStores` derives from `storeOverview`, so this reads as **dead code rather than a live money
  defect** — a reader would have to notice both to know that. It is exactly the class
  `L-DUPLICATE-KEY-GUARD` built a guard for, and it sits **outside that guard's scope**, which only
  walks translation dictionaries. Two checks, neither of which sees what the other sees.
- **`components/admin/pos/ClockScreen.vue:149` — `vue/no-reserved-keys`, `_tick`. Shared checkout
  only** (a lane landed it tonight). Vue 2 does not proxy `data()` keys beginning with `_`, so
  `this._tick` at `:176`/`:179` is **not** the declared `data` property — it is an ad-hoc instance
  property that happens to work for `setInterval`/`clearInterval`. Latent, not currently broken:
  the declaration is dead and anything reading `$data._tick` or expecting reactivity would fail.

---

## 5. The husky hooks: **remove them, or key them. As they stand they are worse than nothing.**

The brief's mechanism, checked and **corrected in one detail**.

Confirmed: `package.json` has no top-level `husky` config key. But the v4 hook does not look for
that key — `husky.sh:hookIsDefined()` greps `package.json` and `.huskyrc*` for **the hook's own
name**. Same conclusion by a different route, and the route matters because adding a `husky` key
with the wrong shape would still not fire.

Proven by running the hook, not by reading it:

```
$ HUSKY_DEBUG=1 sh /Users/svendaneel/okam/Web/.git/hooks/pre-commit
husky:debug husky v4.3.8 - pre-commit
husky:debug Current working directory is /Users/svendaneel/okam/web-lintrunnable
husky:debug pre-commit config not found, skipping hook
hook exit=0
```

`grep -c pre-commit package.json` → **0**. No `.huskyrc*` file exists. **The configured
`lint-staged` has never fired.**

Two things the brief did not have, and both matter:

1. **The hooks are not in this repo.** They live in the *shared* git common dir
   `/Users/svendaneel/okam/Web/.git/hooks`, so all **17** generated hooks apply to **every worktree
   of `Web`** — ~90 of them.
2. **Nobody installed them on purpose.** Their header says
   `Created by Husky v4.3.8 … At: 8/1/2026, 1:12:34 PM … From:
   /Users/svendaneel/okam/web-menu-allergen/node_modules/husky`. A lane ran `npm install` in its own
   worktree four days ago and husky's postinstall wrote 20 hooks into the shared common dir.

**Recommendation: remove.** They enforce nothing, they read as enforcement to anyone who opens
`.git/hooks`, and repairing them would silently arm a lint gate across ~90 worktrees on the strength
of one lane's `npm install`. `git config core.hooksPath` is unset, so removal is deleting the 17
generated hooks plus `husky.sh` and `husky.local.sh` — 19 files — and leaving the 14 `.sample` files
git ships.

**This lane did not do it.** `.git/hooks` is shared state outside the lane's write boundary, and it
would take effect for every other lane running right now. It is a one-command change for whoever
owns the checkout. If the answer is instead *keep and arm*, the minimum is a top-level
`"husky": { "hooks": { "pre-commit": "lint-staged" } }` in `package.json` — and see §6, because
arming it is the gate decision, not a repair.

---

## 6. What a gate would need — named, and stopped there

**No CI workflow was added.** Nothing in this repository runs any suite in CI today; a lane that
quietly introduced the first one would have decided something nobody asked it to.

Three decisions, none of them this lane's:

1. **Which scope.** Whole repo (red until the 678 are cleared — unusable as a gate today) or changed
   files only (green from day one, ratchets down). Only the second can be switched on now.
2. **Which surface.** A commit hook is free and skippable with `--no-verify`; a CI job costs minutes
   per push and is not skippable. This repo currently runs neither, so a lint job would be its first
   CI gate ever. That is a cost-and-gating call.
3. **Whether the hooks are repaired or removed first** (§5). Arming the existing hooks *is* choosing
   surface #2 by accident, across ~90 worktrees.

Measured input to that decision, on this tree: **8.1 s** wall clock for the scoped 607 files,
**8.9 s** for all 878 including the submodule, warm cache, single run. Cost is not the obstacle.

**A fourth dead lever, which the brief did not name.** `@nuxtjs/eslint-module` is a declared
devDependency and is **not** in `buildModules` in `nuxt.config.js`. Its sibling
`@nuxtjs/stylelint-module` **is** (`nuxt.config.js:221`) — so **stylelint runs on every
`npm run dev` and `npm run build`, and eslint does not.** The `lint-staged` block configures both;
only one of the two is reachable by any path. That asymmetry is evidence the eslint wiring was
dropped rather than never intended, and it means a fifth option exists for §6.2: register the module
and let the dev server report. It is not free — it lints on every rebuild — which is why it is
named here and not done.

---

## Files

| file | role |
|---|---|
| `falsify.sh` / `falsify.txt` | the falsification driver and its full transcript — 27 assertions, 0 failures |
| `run-final.json` | the repo-wide clean run — 607 / 678 / 7585. Byte-identical (`md5 31e9f85e…`) to the pre-mutation clean run and to the `--ignore-pattern` cross-check, so one file stands for all three |
| `run-mutated-js.json` / `run-mutated-repo.json` | the red: 1 error in the file, 679 repo-wide |
| `run-mutated-vue.json` | the red inside a `.vue` `<script>` block |
| `run-clean-js.json` / `run-clean-vue.json` / `run-restored-js.json` / `run-restored-vue.json` | the greens either side of each mutation |
| `shared-checkout.json` | read-only census of `/Users/svendaneel/okam/Web-modules` at `e34977a`, 304 dirty |
| `full-all.json` | the same run with nothing ignored — 878 files, 1119 errors |
| `printconfig-ts.json` / `error-rules.txt` | the resolved config and its 207 `error` rules |
| `web-lintrunnable:package.json` | the `lint` script — **the lever** |
| `web-lintrunnable:.eslintignore` | the scope, each exclusion with its reason |
| `web-lintrunnable:README.md` | the documented command, the count, and §6 |

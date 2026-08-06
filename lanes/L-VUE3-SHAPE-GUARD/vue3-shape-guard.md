# A Vue 3 declaration now fails a check

Lane `L-VUE3-SHAPE-GUARD`, brief `55afaf68`. Branch `lane/vue3-shape-guard` @ `a59bca6`, worktree
`/Users/svendaneel/okam/web-vue3shape`, based on `8ac6f63` (`lane/focustrap-teardown`), itself one
commit on `feature/restaurant-modules` @ `e34977a`. Not pushed.

---

## 0. What the exit criterion asked, and where each half is answered

> a check reds on a planted `unmounted()` hook and on a planted `emits:` block, and passes on the
> tree once the two known instances are repaired

| Half | Answered by | Evidence |
|---|---|---|
| reds on a planted `unmounted()` | `test/vue3-shape-guard.test.js`, arm 4 | `evidence/04-after-repair.txt` |
| reds on a planted `emits:` | same file, arm 5 | `evidence/04-after-repair.txt` |
| …and on the REAL tree, not only in a temp dir | mutations 1 and 3 | `evidence/05-mutation-proof.txt` |
| passes on the tree | arms 9–11 | `evidence/04-after-repair.txt` |
| the two known instances repaired | FocusTrap inherited from `8ac6f63`; `emits` deleted here | `evidence/02-…txt` |

---

## 1. Why the guard is a jest test and not a lint rule

Because no runner would have executed a lint rule. Measured, not assumed:

- `@nuxtjs/eslint-module` is in `devDependencies` but is **not** in `nuxt.config.js`'s `buildModules`
  (checked at `nuxt.config.js:201-220`), so eslint does not run during `nuxt build` / `nuxt generate`.
- `package.json` has **no `lint` script**. The scripts are dev/build/start/generate/test/test:e2e*.
- `.github/workflows/nuxtjs.yml` runs `npm ci` then `npm run generate`. No test step, no lint step.
- So the only check runner this repository actually executes is **`npm test` → `jest`**.

A rule nothing invokes is the exact failure class this guard exists to catch, so the guard was put
where the runner is. Confirmed reachable rather than assumed: the full-suite run collected it —
`PASS test/vue3-shape-guard.test.js` appears in `evidence/06-full-suite-at-head.txt`.

`vue/no-unsupported-features` was **not** enabled. In `eslint-plugin-vue` 6.2.2 it gates newer *Vue 2*
syntax by declared version; it does not know Vue 3 option names, so switching it on would not have
answered either half of the exit criterion. The version declaration was still fixed (§4) because it
is the input that rule reads, and leaving it wrong leaves a trap for whoever enables it next.

## 2. The deny list is subtracted from the running framework, not written down

The brief's warning — *a guard that reds on all four teaches people to disable it* — is the design
constraint. Vue 2.7 backports part of Vue 3, so "looks like Vue 3" is the wrong test:

```
Vue.config._lifecycleHooks  (14 names, read from the live runtime, not from docs)
  beforeCreate created beforeMount mounted beforeUpdate updated beforeDestroy destroyed
  activated deactivated errorCaptured serverPrefetch renderTracked renderTriggered
```

The guard computes `VUE3_OPTIONS_API_HOOKS − Vue.config._lifecycleHooks` and **asserts the result is
exactly `['beforeUnmount', 'unmounted']`**. A Vue upgrade that changes it makes the file red rather
than quietly wrong. `renderTracked` and `renderTriggered` are asserted to be *called* — arm 3 mounts
a component declaring all five names and measures which bodies run:

```
denied  : unmounted, beforeUnmount   -> never called, and console.error never fired (the silence)
allowed : renderTracked, renderTriggered, destroyed -> all called
```

`emits` is denied on the same footing rather than by assertion: the string occurs **zero times in the
entire installed runtime bundle**, asserted directly against `vue/dist/vue.runtime.common.dev.js`.

**Deliberately not denied:** `expose` and `compatConfig`. Neither occurs in the estate, and neither
can be justified from the runtime the way the three above can — `expose` really does exist here, as
`setupContext.expose()`. Denying names that cannot be justified is what gets a guard switched off.

## 3. The scanner parses; it does not grep

`vue-eslint-parser` 7.11.0 (the parser `eslint-plugin-vue` itself runs), reading only **top-level**
properties of the SFC's default export. Two consequences that a text scan does not get:

1. **A file it cannot read is reported, never reported clean.** `unresolved` is a separate return
   channel and is asserted empty on the tree. Arm 8 plants an unparseable SFC containing `unmounted`
   and a `export default opts` re-export, and asserts the scanner reports both instead of clearing
   them. This is the failure class the whole lane is about, applied to the instrument itself.
2. **`pages/wolt-callback.vue` is answered rather than forgiven.** It is `export default
   Vue.extend({…})` under `<script lang="ts">` with a TS type assertion — the sibling's brace-matched
   text extractor could not parse it, and `babel-eslint` cannot either. The scanner picks the parser
   from the declared `lang`, so that file resolves (`mounted` only, clean).

Census of the whole tree, `evidence/census.txt`: **301 SFCs**, 22 distinct top-level option keys, 2
files with no `<script>` (genuinely optionless), **0 unresolved**, 0 spread/computed top-level keys.

> The 301 here vs the sibling's 317 is not a disagreement. This lane works in a clean worktree at a
> commit; the sibling swept the shared checkout, which carries 16 additional **untracked** `.vue`
> files. The guard scans the tree as committed, which is the tree that ships.

Arm 7 is the anti-over-rejection control and runs **after** the positive arms, so residue would show:
a component with `renderTracked`, `renderTriggered`, `beforeDestroy`, `destroyed`, Vue 2 directive
`bind`/`unbind`, a **method** named `unmounted`, `onUnmounted`/`onBeforeUnmount` from the composition
API, the word `unmounted` in a comment, `'emits: …'` inside a string, and the regex-literal-containing
-a-quote that desynchronised the sibling's text instrument. All of it passes clean.

## 4. The two repairs

**`components/atoms/Modal.vue:97` — `emits: ['close']` deleted.** Vue 2.7 cannot read it (§2).
Nothing depends on it: `Modal` emits exactly one event and does so correctly, and a repo-wide sweep
of `test/ components/ pages/ layouts/ utils/ store/ middleware/ plugins/` found no reference to the
option — every `emits` hit is the English word in a test name or comment.

**`package.json` — `vue: ^2.6.14` → `^2.7.14`.** `vue/no-unsupported-features` reads the version from
`package.json`, not from `node_modules` (which resolves 2.7.14), so the declaration was load-bearing
and wrong. The resolved version does not change; `^2.6.14` already admitted 2.7.14.

> **The lockfile had to move with it, or CI breaks.** `package-lock.json` is lockfileVersion 2 and its
> root record `packages[""].dependencies.vue` also said `^2.6.14`. `npm ci` — which
> `.github/workflows/nuxtjs.yml` runs — refuses when package.json and the lock's root record disagree,
> so bumping only package.json would have swapped a dead declaration for a broken build. One line
> changed in the lock; no resolved version moved. Verified by replicating npm's own sync check across
> all 23 deps + 25 devDeps (`evidence/03-lockfile-in-sync.txt`) rather than by running `npm ci`, which
> would have deleted `node_modules` — a **symlink shared with the main checkout and ~100 worktrees**.

A guard test holds the declaration so it cannot drift back. It compares the range floor's
**major.minor** to the installed version, not the exact patch: a patch bump is not a defect, and a
guard that reds on one gets disabled.

**`components/molecules/FocusTrap.vue` was not touched**, per the brief. Its repair is inherited from
the base commit.

## 5. Planted both ways, on the real tree

`evidence/05-mutation-proof.txt` (`evidence/mutation-proof.sh`). Temp-dir plants prove the scanner
works; these prove it works **on the files that ship**, then restore.

| | Mutation | Result |
|---|---|---|
| baseline | — | **12/12 pass** |
| 1 | `emits: ['close']` back on `Modal.vue` | RED — `components/atoms/Modal.vue:97: \`emits\`` |
| 2 | `vue: ^2.6.14` back in `package.json` | RED — `Expected: "2.7"  Received: "2.6"` |
| 3 | `FocusTrap.vue` `destroyed` → `unmounted` | RED — `components/molecules/FocusTrap.vue:160: \`unmounted\`` |
| restore | — | tree clean, **12/12 pass** |

Mutation 3 is worth reading twice. `FocusTrap.vue:142` is a **comment** that literally contains the
characters `unmounted ()`. The guard flagged **line 160**, the real option key, and not line 142 —
which is the difference between a parser and a grep, demonstrated rather than claimed.

Separately, `evidence/02-catches-both-historical-instances.txt` replays the same parse against the
**pre-repair** files from `e34977a` and reproduces the sibling's two findings at their exact lines:

```
components/molecules/FocusTrap.vue:147: `unmounted` — this Vue (2.7.14) never reads it
components/atoms/Modal.vue:97:          `emits`     — this Vue (2.7.14) never reads it
```

So the guard is shown to catch the two real historical defects, not only synthetic plants.

## 6. Suite state, and the one red that is not mine

`evidence/06-full-suite-at-head.txt` — **2599 passed / 2601, 113 of 114 suites**.

The one failing suite is `test/journey-artifact-store.test.js` (2 tests). It is **not a regression**;
it is the worktree-basename pin. The assertions require the checkout directory to be named
`Web-modules`, and this lane runs from `web-vue3shape`:

```
Expected pattern: /^Web-modules@[0-9a-f]{40}(\+dirty)?$/
Received string:  "web-vue3shape@a59bca69…+dirty"
```

Proven pre-existing rather than argued: checked out the **base commit `8ac6f63`** in this same
worktree, with none of this lane's work present, and the same two tests failed identically
(`web-vue3shape@8ac6f636…`). `L-WORKTREE-BASENAME-PIN` is the lane that owns it.

Three further suites failed on the first full run — `core-request-path-shape`, `core-price-label`,
`price-absence` — for a different environmental reason: the `core` submodule was not initialised in a
freshly created worktree. Initialised at `1bcab0b6` (`git -c protocol.file.allow=always submodule
update --init core`); all three pass. Recorded because a first run that is red for a reason nobody
writes down is how a real red gets waved through later.

`npx eslint` on the two files this lane authored or edited: **0 errors**, 4 warnings, all
`import/no-named-as-default-member` on `Vue.version` / `Vue.nextTick` — deliberate, since the same
default import is also the source of `Vue.config._lifecycleHooks`.

## 7. Constraints

C1, C2, C4, C6, C7 are not engaged: no SQL, no migration, no money-path write, no statutory string,
no log or telemetry call. **C3** is the constraint this lane is about and is met by construction —
the check is reachable from `npm test` and that was verified in the full-suite output, not assumed.
**C5** — nothing here is claimed as verified or accepted. A guard is a check that behaves; the
journey acceptance for the repairs it protects belongs to a person opening a modal.

## 8. Boundaries — what this guard does not cover, stated rather than implied

- **Only top-level options of SFC default exports**, under `components/`, `pages/`, `layouts/`.
  Option-bearing `.js` mixins (`utils/body-scroll-lock.js`, `utils/margin/money.js`) are not scanned:
  a plain `.js` module is not a component, and reading every default-export object in the repo as if
  it were one is how a guard starts rejecting things that are fine. The sibling swept them and found
  them clean; that remains a manual result.
- **Vue 3 directive hook names** (`mounted`/`unmounted` inside `directives: {}`) are nested, not
  top-level, so they are out of scope. One `directives:` site exists in the estate
  (`components/admin/LanguageSwitcher.vue`) and it uses Vue 2's `bind`/`unbind`.
- **Templates are not scanned.** `<Teleport>`, `v-model:arg`, `@vnode-*` and the rest are a different
  class; the sibling measured 0 of each and this guard does not re-measure them.
- **`expose` / `compatConfig`** — see §2.

## 9. Overlap a merger should know about

`test/focus-trap-teardown.test.js`, which arrives on the base commit from the FocusTrap lane, carries
its own estate sweep for `unmounted`/`beforeUnmount` — a `stripComments` + regex scan, one test. It is
narrower than this guard on every axis (no `emits`, regex not parser, no planted positive control for
the sweep itself, files it cannot parse are indistinguishable from clean) and the two now overlap on
that one class. **Not touched here**, because that file belongs to a lane still in flight and the
brief says so. Flagged deliberately: whoever merges both should collapse that one test into this
guard rather than keep two answers to the same question.

## Files

| Path | |
|---|---|
| `test/vue3-shape-guard.test.js` | the guard — 12 tests |
| `components/atoms/Modal.vue` | `emits: ['close']` deleted |
| `package.json`, `package-lock.json` | `vue: ^2.6.14` → `^2.7.14`, lock root record moved with it |
| `lanes/L-VUE3-SHAPE-GUARD/evidence/` | census, before/after, mutation proof, lock sync, full suite |

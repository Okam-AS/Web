# Declarations the installed Vue does not call

Read-only sweep. Nothing was edited. All line numbers are the shared checkout's **working tree**
unless a different ref is named.

---

## 0. Which tree, which moment, which denominator

| | |
|---|---|
| Checkout | `/Users/svendaneel/okam/Web-modules` (git worktree of `/Users/svendaneel/okam/Web`) |
| Branch / HEAD | `feature/restaurant-modules` @ `e34977acebd59b223584158c33451b6f1ffd82c1` |
| Moment | 2026-08-05 |
| Dirty entries (`git status --porcelain -uall`) | 1450 — 1371 `??`, 79 ` M` |

**Denominator: 317 components.** Rule: every `.vue` file under `components/`, `pages/`, `layouts/`,
excluding `node_modules/`, `.nuxt/`, `coverage/`, `artifacts/`. 301 tracked + 16 untracked.
`components/` 197, `pages/` 117, `layouts/` 3.

There is no second component population: the `core` submodule is initialised
(`1bcab0b6` / `heads/lane/core-ore-label`) and holds 253 `.ts` files and **zero** `.vue`; a sweep for
`Vue.extend(` / `defineComponent(` across every `.js`/`.ts` outside `node_modules` returned **0**. So
components exist only as SFCs, plus 5 option-bearing mixin/util modules (§5).

**Coverage of the denominator: 317/317.** 313 parsed by brace-matched extraction of the default
export; the other 4 closed by hand:

| File | Why it did not parse | Resolution |
|---|---|---|
| `components/atoms/CloseButton.vue` | no `<script>` block at all (32 lines) | no options exist — cleared |
| `components/molecules/PriceTable.vue` | no `<script>` block at all (162 lines) | no options exist — cleared |
| `pages/wolt-callback.vue` | `export default Vue.extend({…})`, not an object literal | sole option is `mounted` — cleared |
| `pages/admin/orders.vue` | line 964 `.replace(/"/g, '""')` — a **regex literal containing a quote** desynchronised the string masker | re-scanned on a scratch copy with that one token neutralised: keys are `components, data, computed, created, mounted, methods` — cleared |

That fourth row is a real instrument limitation, stated because it would otherwise have been a file
silently reported as "no findings".

---

## 1. The version question, answered by measurement

| | |
|---|---|
| `package.json` declares | `vue: ^2.6.14` |
| **Installed** `node_modules/vue` | **2.7.14** |
| `vue-template-compiler` | 2.7.14 (exact match — this is the transform `vue-loader` runs) |
| `nuxt` | 2.17.1 · `vue-router` 3.6.5 · `eslint-plugin-vue` **6.2.2** |

**The declared range is not the one running**, and 2.7 accepts some Vue 3 shapes and not others.
Measured from the installed runtime, not from docs
(`node_modules/vue/dist/vue.runtime.common.dev.js`):

- **`LIFECYCLE_HOOKS` (line 322) is exactly 14 names**: `beforeCreate, created, beforeMount, mounted,
  beforeUpdate, updated, beforeDestroy, destroyed, activated, deactivated, errorCaptured,
  serverPrefetch, renderTracked, renderTriggered`.
- `unmounted` and `beforeUnmount` appear **once each in the whole file**, at lines 3191/3194, inside
  `formatName()` — a cosmetic that prettifies a *warning message* for the composition API. They are
  not option names and cannot be.
- **`renderTracked` / `renderTriggered` ARE real option hooks in 2.7** and are called
  (proven at runtime). Two Vue 3 names accepted, two rejected — the version-specific answer.
- **`emits`: 0 occurrences in the entire runtime.** It cannot be consumed.
- **`expose`: exists only as `setupContext.expose()`** (line 2415). There is no `expose` *option*.
- `initData` proxies a key onto the instance only `if (!isReserved(key))`, and `isReserved` is
  `charCodeAt(0) === 0x24 || === 0x5f` (`$` or `_`). The skip is a silent `else if` — **no warning at
  any level**. `initMethods` has no such guard, so **the rule is data-only**.

---

## 2. FINDING 1 — dead teardown · `components/molecules/FocusTrap.vue:147`

```
147:  unmounted () {
```

Options present: `props, data, computed, watch, mounted, methods, unmounted`.
`typeof options.destroyed === 'undefined'`, `typeof options.beforeDestroy === 'undefined'`.
**There is no teardown hook on this component at all.**

**Both trees agree.** `git diff --stat e34977a -- components/molecules/FocusTrap.vue` is empty and
`e34977a:components/molecules/FocusTrap.vue` also has `unmounted ()` at line 147. HEAD and the
working tree give the same answer here, so the finding does not depend on which was read.

### Proved, not read

Environment: **jsdom 16.7.0 + real `vue@2.7.14` + `vue-template-compiler@2.7.14`** — the SFC is read
from disk, compiled with the same compiler `vue-loader` uses, and mounted. Deliberately **not**
vue-jest, whose transform differs from the running app. Harness and output:
`evidence/prove2.js`, `evidence/focustrap-runtime-proof.txt`.

Instrumentation wraps the loaded options object in memory; the file is never modified.

**Run A — the file exactly as written, 5 mount/destroy cycles:**

```
census after 5 mount+destroy cycles: {"document:focusin":1,"document:focusout":1,"window:blur":1}
PASS  unmounted() body executed 0 times across 5 destroys   [calls=0]
PASS  attachHandler ran exactly ONCE for 5 traps -> `instances` never empties
PASS  every listener still attached after all 5 destroyed
```

Also: `$options.unmounted` remains a **raw function**, never merged into the array form Vue uses for
real hooks — the framework never even saw it as a hook.

**Run B — control, identical body renamed `unmounted` → `destroyed`, fresh module scope:**

```
census after 5 mount+destroy cycles: {"document:focusin":0,"document:focusout":0,"window:blur":0}
PASS  destroyed() body executed 5 times   [calls=5]
PASS  listeners fully released (net zero) - the leak is the hook name alone
```

> **A correction worth recording.** The first version of this harness ran the control in the *same*
> module scope as Run A. It passed — for the wrong reason: Run A's leak had already poisoned the
> module-level `instances` array, so `attachHandler`/`detachHandler` were both skipped and
> "listeners released" was trivially true. Each run above gets a **fresh module instance and a fresh
> census**. The first harness is kept at `evidence/vue-version-shape-proof.txt` with that flaw.

### What depends on it

`FocusTrap` has exactly one consumer: **`components/atoms/Modal.vue:2`** (`<focus-trap>`), and
`Modal` is used in **11 files** — so this is on the teardown path of every modal in the application.

1. **Document/window listener leak.** `detachHandler()` never runs. `document` `focusin` (capture),
   `document` `focusout` and `window` `blur` are attached at the first modal and stay attached for
   the life of the page.
2. **Unbounded `instances` growth — the sharper consequence.** `attachHandler` ran **once for five
   traps**, which is only possible if `instances.length` never returned to 0. Every destroyed modal
   leaves a stale entry holding `vue` (the dead component) and `observed` (a now-detached DOM node).
   `reducePropsToState` picks `.slice(-1)[0]`, so `lastActiveTrap` — and therefore
   `moveFocusInside(observed, …)` — can target a destroyed component's detached subtree. This is a
   focus-correctness bug, not only a memory one, and it worsens monotonically within a session.
3. **The `returnFocus` prop is dead.** Its only reader is lines 152–158 inside the dead hook.
   Measured: `activeElement` was `INPUT` before mount and `INPUT` after destroy with
   `returnFocus: true` — focus is never restored. It is dead twice over: no consumer anywhere passes
   `return-focus`/`returnFocus` (sweep returned only the declaration at :92 and the dead read at
   :153), and a Vue 2 Boolean prop with no `default` is `false` regardless.
4. `emitChange()` on teardown never runs, so the remaining traps are never re-derived after a close.

**Fix is one word** — `unmounted` → `destroyed` (or `beforeDestroy`). Run B is that change and it
returns the census to net zero. *Not applied: this lane is read-only and other lanes hold this file.*

---

## 3. FINDING 2 — inert option · `components/atoms/Modal.vue:97`

```
97:  emits: ['close'],
```

`emits` has **zero occurrences in the entire Vue 2.7.14 runtime**, so it cannot be consumed. Proven
at runtime (`evidence/vue-version-shape-proof.txt`):

```
$options.emits = ["close"]
warnings captured while emitting an UNDECLARED event: []
PASS  emitting an event absent from `emits` produces no warning (no validation)
PASS  `emits` survives only as inert metadata on $options
```

### What depends on it

**Nothing.** `Modal` emits exactly one event — `this.$emit('close')` in `close()` — so the
declaration is *accurate*; it is simply unenforced. In Vue 3 it would (a) warn on an undeclared
`$emit` and (b) exclude `close` from `$attrs` fallthrough; in Vue 2, listeners live in `$listeners`
rather than `$attrs`, so (b) has no effect here either.

**This is the case where nothing depends on it, so it is a deletion somebody can make safely** — the
alternative being to keep it as forward-documentation and accept that it enforces nothing today. It
becomes load-bearing only on a Vue 3 migration.

---

## 4. NOT LIVE — `_tick` in `components/admin/pos/ClockScreen.vue`

The brief's second known instance. **It is already fixed, and it exists in no readable tree.** Stated
because reporting it as live would have been a rumour.

- The file is **untracked** (`?? components/admin/pos/ClockScreen.vue`) — it exists **only** in the
  shared checkout, as the brief said.
- In that working-tree copy the `data()` block (lines 136–158) declares **no** `_`- or `$`-prefixed
  key. The handle is a plain instance property, set at line 181 (`mounted`) and cleared at line 184
  (`beforeDestroy`). Lines 149–153 are a comment recording the old defect.
- **The four branches carrying a `ClockScreen.vue`** — `lane/fe-pos-clock`,
  `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` — contain **no `_tick`
  at all** (`git show <branch>:…` → 0 hits each).
- Guarded by `test/pos-clock-reserved-key.test.js`.

> **The trap this walked into.** `grep -n _tick components/admin/pos/ClockScreen.vue` returns 5 hits.
> **Three are the remediation comment** and two are the live instance property. A count-based sweep
> would have reported a defect that no longer exists — the orchestrator's warned-of failure exactly.

The C4 concern in the brief (a dead declaration beside a payroll-bearing timer) does not arise: the
timer drives only the displayed clock (`now`), the punch itself carries a resolved operator via
`inject: ['pos']` → `s.operatorSessionId = this.pos.sessionId`, and the retry path deliberately holds
`pending` so a retry re-sends the same `clientEventId` rather than appending a second punch (C1).

---

## 5. Shapes searched — and what each returned

Method for the option-name family: rather than grep for the two shapes already known, the
**population** of top-level option keys across all 313 parseable default exports was enumerated and
diffed against the option names the installed runtime actually consumes
(`evidence/scan-options.js`, `evidence/option-key-population.txt`). Total distinct keys observed: 22.
Exactly **three** were unrecognised.

| # | Shape looked for | How | Result |
|---|---|---|---|
| 1 | Vue 3 options lifecycle `unmounted` / `beforeUnmount` | indentation-agnostic regex + population diff | **1** — Finding 1. `beforeUnmount` 0 |
| 2 | `emits` | population diff | **1** — Finding 2 |
| 3 | `expose` as an option | population diff | 0 |
| 4 | `compatConfig` | population diff | 0 |
| 5 | `renderTracked` / `renderTriggered` | population diff | 0 declared — and would be *valid* in 2.7 anyway |
| 6 | `data()` keys prefixed `_` / `$` | brace-matched extraction, comments+strings masked | **0** |
| 7 | `watch` keys prefixed `_` / `$` | same | **0** |
| 8 | `<script setup>` | tag-attribute scan | 0 files |
| 9 | `defineProps` / `defineEmits` / `defineExpose` / `withDefaults` / `defineOptions` / `defineSlots` / `defineModel` | regex over all SFCs | 0 |
| 10 | Composition-API imports in an options component | `from 'vue'` / `@vue/composition-api` | 0 — the single hit is `import Vue from 'vue'` for `Vue.extend` in `pages/wolt-callback.vue:8` |
| 11 | `onMounted`/`onUnmounted`/`onBeforeUnmount`/… called outside `setup()` | regex over all SFCs | 0 |
| 12 | `setup()` option | regex + manual check | 0. `components/admin/pos/SignaturePad.vue:40` is a **method** named `setup`, invoked from `mounted()` — a false positive, cleared by reading it |
| 13 | Vue 3 directive hook names (`mounted`/`unmounted` in `directives:`) | all `directives:` sites | 1 site total — `components/admin/LanguageSwitcher.vue:72`, uses Vue 2's `bind`/`unbind`. Clean |
| 14 | Vue 3 template constructs: `v-model:arg`, `<Teleport>`, `<Suspense>`, `@vnode-*`, `.attr` modifier, `v-is` | regex over all SFCs | 0 each |
| 15 | Vue 3 v-model convention `modelValue` / `update:modelValue` | repo-wide | 0 |
| 16 | Nuxt **page-only** options (`asyncData`, `middleware`, `layout`, `validate`, `watchQuery`, `scrollToTop`, `transition`) declared under `components/`, where Nuxt ignores them | population diff, scoped to `components/` | **0** — all 18 occurrences are in `pages/`, where they are honoured |
| 17 | `beforeRouteLeave` — `pages/admin/category-editor.vue:460` | flagged by the population diff, then verified | **Cleared, it IS called.** `vue-router` 3.6.5 `extractGuards(deactivated, 'beforeRouteLeave', …)` at `vue-router.common.js:2504`, and `.nuxt/router.js:41,273` confirms the file is a real route component |
| 18 | Options declared in mixins (`.js`, invisible to an SFC-only sweep) | 2 mixins in use + 3 other option-bearing utils | Clean. `utils/body-scroll-lock.js` → `computed`, `head()`; `utils/margin/money.js` → `props`, `data`, `methods` |
| 19 | Vue 3 option names anywhere in `.js`/`.ts` | repo-wide regex | 0 — the one hit is the English word "emits" in a comment |

### The scanners are calibrated, not trusted

A sweep returning "(none)" is worthless unless the instrument is shown to find something. The
data-key scanner was run against a planted control (`evidence/data-key-scanner-positive-control.txt`)
containing four declaration forms and three decoys:

- **found** `_tick` and `$weird` in `data () { return {…} }`, `_arrowKey` in `data: () => ({…})`,
  `_fnKey` in `data: function () {…}`, and `_tick` under `watch:` — all with correct line numbers;
- **rejected** a `_decoy` inside a comment, a `'_stringDecoy: 1'` inside a string, a nested
  (non-top-level) `_inner`, and a local `const _tick` that is not a key;
- **over-reported once** (a value token read as a shorthand key). It errs toward false positives,
  never false negatives — so **zero hits on the real tree is a strong negative**, not a silent miss.

---

## 6. Why neither was caught, and why one class now can be

Measured with the repo's own configured eslint (`.eslintrc.js` → `@nuxtjs/eslint-config-typescript`
→ `plugin:vue/essential`):

- **`vue/no-reserved-keys` is enabled and does fire.** On the planted `_tick` fixture it reports
  `error  Keys starting with with '_' are reserved in '_tick' group`. So the *data-key* class is
  machine-catchable in this repo **today**, which is why the sibling was able to pin it.
- **The same config on `FocusTrap.vue` reports 0 errors** (one unrelated warning:
  `Prop 'group' requires default value`), and says nothing about `emits` on `Modal.vue`.
  `eslint-plugin-vue` is **6.2.2**, which predates Vue 3 — no rule in it knows `unmounted` or `emits`
  as Vue 3 option names. `vue/no-unsupported-features` exists in that version but is **not enabled**,
  and it gates newer *Vue 2* syntax by declared version, not Vue 3 option names.

So the two classes are asymmetric, and that asymmetry is the finding behind the finding: `_tick` was
guardable and is now guarded; **`unmounted` and `emits` have no available guard in the installed
toolchain**, which is precisely why the only mechanism that found them was somebody reading the file.

This is also where the version discrepancy stops being background. `vue/no-unsupported-features` —
the one rule family that gates by version — reads the version from **`package.json`**, which declares
`^2.6.14`, not from `node_modules`, which holds `2.7.14`. Enabling it without correcting the
declaration would evaluate every component against a Vue the application does not run.

---

## 7. What this sweep could not establish

- **SSR.** Every runtime proof is client-side (jsdom). Nuxt's server render never calls `destroyed`,
  so the leak is a client-session leak; server behaviour was not exercised.
- **`instances` growth was proven by proxy, not by inspection.** The array is module-private and not
  exported; the evidence is that `attachHandler` ran exactly once across five traps, which is only
  possible if the array never emptied.
- **Branch content beyond `ClockScreen.vue`.** The four lane branches were read for that one file
  only; they were not swept for these shapes.
- **A test suite was not run**, and per C5 nothing here is "verified" — these are measurements, and
  acceptance is a person completing the journey. The honest journey check for Finding 1 is: open any
  modal, close it, and observe that the document-level focus listeners survive.
- `.nuxt/` generated components are excluded by the denominator rule and were not examined.

# Collapsing the two Vue 3 option-name sweeps

## The commits this sits on

The two lanes' branches stack, and this work sits on top of both:

- `lane/focustrap-teardown` @ **`8ac6f63`** — added `test/focus-trap-teardown.test.js`, whose second
  test was a comment-stripping regex sweep of every `.vue` under `components/pages/layouts` for
  `unmounted`/`beforeUnmount`.
- `lane/vue3-shape-guard` @ **`cffede3`** — based on `8ac6f63` (`git merge-base --is-ancestor`
  confirms), added `test/vue3-shape-guard.test.js`, which derives its deny list by subtracting
  `Vue.config._lifecycleHooks` from the Vue 3 options-API set, adds `emits`, and is planted both
  ways. It also flipped `package.json`'s declared range from `^2.6.14` to `^2.7.14`.

This lane branches from **`cffede3`**, so it assumes both.

## The tree every number here came from

A worktree at `/Users/svendaneel/okam/Web-modules-wt/L-COLLAPSE-THE-TWO-HOOK-SWEEPS`, on
`lane/collapse-the-two-hook-sweeps` from `cffede3`, with **0 untracked files**. `node_modules` is a
symlink into the main checkout (shared with ~121 worktrees — `npm ci` would delete it for all of
them, and was never run). The `core` submodule was initialised at its pinned `1bcab0b` before any
red was believed; a fresh worktree leaves it empty and reds three `core/*` suites for a reason that
is not this lane's.

Measured in that tree, not in the shared checkout: **301** `.vue` under `components/pages/layouts`
(tracked and on-disk agree) and **114** test suites. The sibling that reported 317 and 129 was
counting other lanes' untracked files in the shared checkout.

## Why the narrow sweep was the one to go

Not because it duplicated. Because of what it could not do:

1. **No planted control for the sweep itself.** Nothing ever showed `VUE3_ONLY_HOOK` matching. A
   regex that had stopped matching would have reported a clean estate, forever, in green.
2. **Unparseable was indistinguishable from clean.** A text scan has two answers, "matched" and
   "did not match", and no third for "could not read this". That is the same defect both lanes were
   built to catch, one layer along.

(2) is not theoretical here. `stripComments` is itself a pair of regexes, and cases **B2** and **B3**
in `01-differential-before.txt` are files that really do declare `unmounted` at the top level and
that the sweep reports **clean**: a `//` inside a string eats the rest of the line, and a `/*` in one
string with a `*/` in a later one swallows everything between. A sibling that swept 317 components
hit exactly one such desync, on a regex literal `/"/g`, and it failed loudly only by accident of the
input.

## The collapse was measured before it landed

`differential.js` scores both detectors over one corpus, and refuses to score at all unless its
survivor copy first reproduces the survivor's own estate numbers (301 files, 0 breaches, 0
unresolved) and both runtime subtractions.

First run — `01-differential-before.txt` — the removal was **not** safe: two cases would have been
lost. The removed sweep matched its names *anywhere* in a file, so it also reached inline
`directives:` and `components:` definitions, which the survivor read only at top level:

- **D1** a Vue 3 directive hook inside an inline `directives:` definition. Vue 2 renamed every one of
  these, so it is dead code of exactly this family.
- **C1** an inline child component's options object carrying `unmounted`.

Both were closed in the survivor before the removal landed, and the second run —
`03-differential-after.txt` — reports **0 lost, 7 gained, 2 over-rejections dropped**. The gains are
`emits` (never covered by the narrow sweep), the two unparseable/opaque cases, the two
comment-stripping desyncs, and the two legal Vue 2.7 shapes the narrow sweep would have *wrongly*
flagged — a method named `unmounted`, and the name inside a string.

That last point matters: the narrow sweep's nested reach and its false positives are the same
undiscriminating match. You could not keep D1/C1 by keeping that sweep without also keeping V1/V2.
Covering them position-aware in the survivor is strictly better than either.

## What was added to the survivor

- Vue 2's five directive hooks are **read out of the runtime** — `_update`'s own `callHook` calls —
  rather than written down, matching the file's existing rule that the deny list is derived. All
  seven Vue 3 directive hook names are absent from it, and `update` (Vue 2) vs `updated` (Vue 3) is
  asserted so the two sets are known not to collide.
- `scan` descends into inline `components:` and `directives:` definitions. A registration that names
  a module is **not** followed, with a stated reason: the 394 component registrations name imported
  SFCs this same scan reads on their own pass, and the single directive registration
  (`LanguageSwitcher.vue`) names a `.js` module, which is out of scope exactly as `.js` mixins are —
  and which the text sweep could not read either, since it only opened `.vue` files. Nothing that
  was held is lost.
- An **estate-level** unparseable probe: a file the scanner cannot read is written into the real
  `components/`, scanned, and removed, and the guard is shown to red on it. The survivor already
  proved this in a temp tree; the assertion being defended is the one made about the real estate.
- A uniqueness tripwire: exactly one test file both walks the tree and names a denied option.

## Verification

- `04-mutation-proof.txt` — every arm added here broken on purpose and watched go red (M1 stop
  descending into directives, M2 into components, M3 empty the directive deny list, M4 swallow the
  parse failure — the removed sweep's exact defect — M5 put the removed sweep back). M0 shows all
  four pass unmutated. The arms are load-bearing, which is the thing the removed sweep never showed.
- `02-survivor-extended-uniqueness-red.txt` — the state *before* the removal: every coverage arm
  green, uniqueness red naming `test/focus-trap-teardown.test.js`.
- `05-full-suite.txt` — **113 of 114 suites pass, 2605 of 2607 tests.**

## The one red, which is not this lane's

`test/journey-artifact-store.test.js` fails 2 tests here, and fails them **identically at unmodified
`cffede3` in this same worktree** (`git stash`, re-run, same two). This lane's diff touches only the
two test files above.

The cause is that it asserts the checkout's **directory name**:
`expect(store.buildFromListeningProcess(origin).id).toMatch(/^Web-modules@/)`, against a received
`"L-COLLAPSE-THE-TWO-HOOK-SWEEPS@cffede3…"`. It therefore reds in any worktree not literally named
`Web-modules` — which, in an estate running ~121 worktrees, means it is green only in the main
checkout. Worth a flag against that lane's owner; it is not fixed here because it is not this lane's
file and a fix would be an unrelated change riding along.

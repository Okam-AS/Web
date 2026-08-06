# L-LINT-RUNS-ON-SOMETHING — the configured lint rules run on a change somebody makes

Base `9f7d8df` (`candidate/fe-compose-2026-08-05`). Branch `lane/lint-runs-on-something`, worktree
`/Users/svendaneel/okam/web-lintruns`, `node_modules` symlinked to the shared checkout. No `npm ci`,
no `npm install`, no container, nothing pushed, no shared ref moved.

Every number below was measured in this worktree at `9f7d8df` plus the two files this lane adds.

## The four halves of "wired into nothing", re-checked at 9f7d8df rather than inherited

| claim | verdict at 9f7d8df |
|---|---|
| no `package.json` script contains "lint" | CONFIRMED — `Object.keys(scripts)` has no key or value matching /lint/i |
| no workflow mentions it | CONFIRMED — `grep -rin lint .github/` is empty; `nuxtjs.yml` runs `npm run generate`, `claude.yml` is unrelated |
| no `husky` key while the hooks are husky v4 | CONFIRMED — `hasOwnProperty('husky') === false`; devDeps carry `husky ^4.3.6` and `lint-staged ^10.4.0` |
| so `lint-staged` never fires | CONFIRMED — `lint-staged` is `{"*.{js,vue,ts}":"eslint","*.{css,vue}":"stylelint"}` and nothing reaches it |
| `@nuxtjs/eslint-module` devDep absent from `buildModules` | CONFIRMED (sibling's find) — `nuxt.config.js:217-221` lists `@nuxtjs/stylelint-module` and not the eslint one |

The hooks are not in this worktree's `.git` at all. `git rev-parse --git-common-dir` is
`/Users/svendaneel/okam/Web/.git`, and its `hooks/` holds husky v4 files stamped
`From: /Users/svendaneel/okam/web-menu-allergen/node_modules/husky` — a **different repository's**
install, shared by this checkout and 121 other worktrees. That is why no hook was touched: it is not
version-controlled, it is not this repo's, and editing it would change every sibling lane mid-flight.

## eslint is healthy before anything is concluded about it

- `eslint v7.32.0`; parser resolves to `node_modules/vue-eslint-parser/index.js`.
- `eslint --print-config translations/no.ts` resolves **251 rules, 207 of them at `error`**.
- `no-dupe-keys` is `["error"]`. `quote-props` is `["error","as-needed"]`. `eqeqeq`, `no-var` are error.
- `vue/no-unsupported-features` is **absent from the resolved config** (undefined), so the brief's
  warning holds and nothing here is built on it. `eslint-plugin-vue` is 6.2.2.
- `eslint --ext .ts,.js translations` at `9f7d8df`: **0 errors, 3 warnings, 0.75s**, 4 files read.
  The 3 warnings are pre-existing `indent` at `de.ts:698`, `en.ts:698`, `no.ts:715`.

## What was built

1. `package.json` — one script: `"lint:translations": "eslint --ext .ts,.js translations"`.
   Inserted after `test:e2e:live-world-stamp`, **not** after `"test": "jest"`, so it does not collide
   textually with `lane/lint-runnable`'s `"lint"` insertion at that spot.
2. `test/translations-lint.test.js` — four assertions inside the jest suite, because `npm test` is
   the only check runner this repository actually executes.

**Reachability (C3).** The script is invoked by the test; the test is collected by jest's default
`testMatch` and is not under either `testPathIgnorePatterns` entry (`test/e2e/`, `lanes/`). So the
chain a person runs is `npm test` → jest → this test → `npm run lint:translations` → eslint → the
207 configured error rules. Nothing in the diff is reachable only by someone remembering it exists.

## Scope: why `translations/` and not the tree

`eslint --ext .js,.ts,.vue` over `components pages layouts utils plugins middleware store
translations modules server-middleware test` at `9f7d8df`: **596 files, 81 with errors, 649 errors,
7,540 warnings**. A gate that is red the day it lands is a gate somebody deletes — the same defect in
a different hat. The dictionaries are 16,422 lines (`no.ts` 5,513 · `en.ts` 5,451 · `de.ts` 5,458)
and lint clean, so they can carry an enforcing gate today.

No rule was enabled, no severity raised, no plugin added, no `.eslintignore` written.

## THE CORRECTION: a duplicate key was NOT invisible, and the brief's example is not the gap

The brief's premise for the example is that the duplicate-key hazard has no red. Measured, that is
**false for the `.ts` dictionaries** — and it is recorded here rather than quietly implied away.

`node lanes/L-LINT-RUNS-ON-SOMETHING/mutate-dictionary.js apply` re-declares `aIQueryBox_example1`
at `translations/no.ts:5001`. Full `npm test` with it applied (`run-full-mutated.txt`):

```
Test Suites: 16 failed, 111 passed, 127 total
Tests:        1 failed, 2475 passed, 2476 total
```

Nine of those sixteen are ts-jest reporting **`TS1117: An object literal cannot have multiple
properties with the same name`** as "Test suite failed to run" on nine unrelated suites — a red that
names neither the rule nor the reason and points at nine innocent tests. Six are the pre-existing
`core` submodule reds. One is this gate, and it says:

```
translations/no.ts:5001  no-dupe-keys  Duplicate key 'aIQueryBox_example1'.
```

So for `.ts` the gate converts a nine-suite misattributed red into one line. **The gap it actually
closes is the other 206 error-severity rules, for which the type checker has no equivalent.**

Proof, `run-full-quoteprops.txt`: quote an existing key in place —
`'aIQueryBox_example1':` instead of `aIQueryBox_example1:` — same key, same value, same behaviour,
type-checks fine:

```
Test Suites: 7 failed, 120 passed, 127 total     (6 of the 7 are the pre-existing core reds)
Tests:       1 failed, 2817 passed, 2818 total
→ translations/no.ts:2  quote-props  Unnecessarily quoted property 'aIQueryBox_example1' found.
```

**120 suites and 2,817 tests pass on that change. This gate is the only thing in the repository that
reds on it.** That is the exit criterion met on a rule already configured as `error`.

A behaviour-changing duplicate in `translations/index.js` (`{ no, en, de, no: en }`) was also tried:
33 suites red, but on the swapped locale, not on the duplicate — `translation-key-presence` and 30
others. Recorded so nobody re-derives it: the estate notices wrong strings, never a wrong shape.

## Mutation proofs — all four assertions kill (`mutation-proof.txt`)

| # | mutation | result |
|---|---|---|
| M0 | none | 4 passed |
| M1 | delete the npm script from `package.json` | **3 failed**, 1 passed |
| M2 | duplicate key in `translations/no.ts` | **1 failed**, 3 passed |
| M3 | `'no-dupe-keys': 'off'` in `.eslintrc.js` | **2 failed**, 2 passed |
| M4 | `.eslintignore` containing `translations` | **3 failed**, 1 passed |
| M5 | everything reverted | 4 passed |

M4 is the non-vacuity floor and the reason the fourth assertion exists: `eslint translations` exits
0 just as happily when an ignore entry means it read nothing at all, which would be this same defect
returning silently. A sibling lane is landing an `.eslintignore`; if `translations` ever joins it,
three tests red.

## Regression: nothing else moved

Full `npm test` on the committed tree, dictionaries clean (`run-full-clean.txt`):

```
Test Suites: 6 failed, 121 passed, 127 total
Tests:       2818 passed, 2818 total
```

The 6 are pre-existing and not this lane's: every one is
`Configuration error: Could not locate module ~/core/services` (and `core-request-path-shape`'s
`ENOENT`) from the **uninitialised `core` submodule** — `git submodule status` shows
`-1bcab0b6b3882bc232795437d7ad48455a5af0a6 core`, `core/` is empty. Not initialised on purpose: it
is a separate repository and initialising it in a linked worktree is not this lane's change.

**BRIEF DRIFT:** the dispatch said an uninitialised `core` reds "three `core/*` suites". It reds
**six** here: `core-price-label`, `core-request-path-shape`, `price-absence`, `price-bypass-legacy`,
`price-crosscurrency`, `price-gate-shadow`. Four of the six do not have `core` in their name, which
is presumably how the count came out at three.

## Two findings adjacent to this lane, fixed by nobody here

1. **`maxBuffer`, found the hard way.** eslint's JSON formatter embeds the FULL SOURCE of every file
   carrying any message. The three pre-existing `indent` warnings therefore make a *clean*
   `-f json` run emit ~1.06 MB — just over node's 1 MB default. The child is SIGTERMed, `error.status`
   is `null`, and the first red this lane saw was `Expected: 0 / Received: null` on a passing lint.
   Anything else in the estate shelling out to a formatter over these dictionaries has the same trap.
2. **No CI gate, deliberately.** `nuxtjs.yml` runs `npm run generate` on push to `main` and nothing
   runs a suite in CI at all. Making lint the first CI gate is a cost and gating decision, and a
   workflow step this lane cannot show firing would be the exact shape it was sent to end. Not done.

## Files

- `run-green.txt` — the gate passing, targeted
- `run-red.txt` — `npm test -- test/translations-lint.test.js` with the duplicate key applied
- `run-full-mutated.txt` — full suite, duplicate key present
- `run-full-quoteprops.txt` — full suite, `quote-props` violation present (the decisive one)
- `run-full-js-dupe.txt` — full suite, behaviour-changing duplicate in `translations/index.js`
- `run-full-clean.txt` — full suite, committed tree
- `mutation-proof.txt` — M0–M5
- `mutate-dictionary.js` — apply/revert, reverts from the index so it cannot leave a broken dictionary

# L-DUPLICATE-KEY-IN-THE-BUILD — what a duplicated translation key does to the production build

**Answer: SILENT. The production build accepts it, says nothing, and emits extra code to
guarantee the later entry wins.** The TS1117 result does not generalise to the tier that ships.

Tree measured: worktree `/Users/svendaneel/okam/web-dupbuild`, branch
`lane/duplicate-key-in-the-build`, cut from `candidate/fe-compose-2026-08-05` = `9f7d8df`,
`core` submodule at its gitlink `1bcab0b`, `node_modules` a real directory (see the instrument
correction below — **not** a symlink). The shared checkout's dictionaries were never opened
for write.

## The command that actually ships is `generate`, not `build`

Both deployment paths run **`npm run generate`** (= `NODE_ENV=production nuxt-ts generate`):

| path | trigger | edition | `i18n.locales` |
|---|---|---|---|
| `vercel.json` → `buildCommand` | Vercel deploy | **`OKAM_EDITION=ch`** (set in `vercel.json`) | `['de']` |
| `.github/workflows/nuxtjs.yml` → *Static HTML export with Nuxt* | push to `main` | unset → `'no'` | `['en','no']` |

So the question had to be asked twice, once per edition. It was.

## The measurement

Plant: a second `categories_create` appended as the last property of the top-level literal,
valid syntax, asserted to have landed before any result was read (2 occurrences, 0 parse
diagnostics, TS1117 actually present at the semantic tier — else the script aborts).

| # | tree | command | exit | routes | TS1117 / "duplicate" in the log |
|---|---|---|---|---|---|
| A | duplicate in `translations/no.ts` | `npm run generate` | **0** | 212 | **0 occurrences** |
| B | duplicate in `translations/de.ts` | `OKAM_EDITION=ch npm run generate` (vercel.json verbatim) | **0** | 106 | **0 occurrences** |
| — | pristine, both editions | same | 0 | 212 / 106 | 0 |

For both A and B the build's **entire warning/error set is byte-identical to its own pristine
baseline**. Not "a warning nobody reads" — no output at all changes.

## Why it is silent

`nuxt.config.js:36-38` sets `typescript: { typeCheck: false }`. `@nuxt/typescript-build` 2.1.0
therefore registers **`ts-loader` 8.4.0 transpile-only** and never instantiates
`fork-ts-checker-webpack-plugin` 6.5.3 — which *is* installed, just never constructed.

**TS1117 is a semantic diagnostic, and a transpile-only loader is structurally incapable of
seeing it.** Measured on the planted file, not assumed:

```
ts.transpileModule       (what a transpile-only loader sees) : []
program.getSemanticDiagnostics (what a type-check sees)      : [1117]
```

`buildModules` carries `@nuxtjs/stylelint-module` and **no** eslint module, so the `no-dupe-keys`
rule a sibling lane found enabled-but-unrun is not reached during a build either.

## The build does not merely tolerate the duplicate — it works to preserve it

`@babel/plugin-transform-duplicate-keys` 7.22.5 (via `@nuxt/babel-preset-app`) rewrites the
literal so the ES2015 last-wins semantics survive ES5 strict mode. Emitted chunk, verbatim:

```js
t.a = Object(n.a)({ aIQueryBox_example1:"…", …5090 keys…,
                    wfrl_toast_reinstated:"Funksjonen er tatt i bruk igjen." },
                  "categories_create", "ZZRERUN_LATER_NO")
```

`n.a` is module 6, Babel's `_defineProperty`:

```js
function r(e,n,t){ return (n=Object(o.a)(n)) in e
  ? Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0})
  : e[n]=t, e }
```

The first occurrence is built into the literal, the second is applied over it at module
evaluation. **The plan's original belief — "a merge adds a duplicate cleanly, JS keeps the later
entry, and nothing complains" — is exactly and deterministically true at the tier that ships.**

## Which locales the build compiled — the edition list does not gate the dictionaries

This is the part that would have made a locale-scoped answer wrong.

`plugins/i18n.js` → `~/utils/i18n` → `translations/index.js` **statically imports all three**
(`import no from './no'; import en from './en'; import de from './de'`) and indexes them by a
runtime locale, so webpack cannot drop any of them. Verified by string, both editions:

| build | `no` (`Opprett kategori`) | `en` (`Create category`) | `de` (`Kategorie erstellen`) | routes rendered |
|---|---|---|---|---|
| default edition (`no`) | in bundle | in bundle | **in bundle** | 106 unprefixed + 106 `/en`, **0 `/de`** |
| Swiss edition (`ch`) | **in bundle** | **in bundle** | in bundle | 106 unprefixed (`de` is `defaultLocale`), 0 `/en`, 0 `/de` |

**A duplicate planted into a locale the edition never renders is still compiled and still
shipped.** The Swiss build renders no Norwegian route at all and still ships `no.ts` whole.
Case B above is exactly that: planted in `de`, built under an edition whose route set never
prefixes `de`, silent all the same.

## The lever, measured in both directions — one line, and it is free

`nuxt.config.js:37`, `typeCheck: false` → `true`:

| tree | exit | diagnostics in the whole build | wall clock |
|---|---|---|---|
| pristine | **0** | **0 TS errors** | 35.9 s |
| same plant | **1**, `FATAL Nuxt build error` | **exactly one — TS1117** | (fails at compile) |

```
ERROR in translations/no.ts:5513:3
TS1117: An object literal cannot have multiple properties with the same name.
    5511 |   wfrl_toast_reinstated: 'Funksjonen er tatt i bruk igjen.'
  > 5513 |   categories_create: 'ZZRERUN_LATER_NO'
         |   ^^^^^^^^^^^^^^^^^
```

It names the file, the line and the column, it is the *only* thing it reports, and the pristine
build costs 35.9 s against 36.1 s untyped — no measurable cost on this tree.

**Not applied.** Flipping the integration branch's build config changes the gate under ~130
in-flight worktrees at once; that is a plan decision, not this lane's. What this lane owes is the
measurement that the decision needs, in both directions, and that is above.

## Restoration

| check | result |
|---|---|
| worktree `translations/{no,en,de}.ts` sha256 vs pre-plant | **byte-for-byte identical** |
| worktree `git status --porcelain` | **empty** |
| stray `*.PRISTINE` backups | none |
| `nuxt.config.js` | reverted, `typeCheck: false` |
| **shared checkout** `translations/*.ts` sha256, start vs end | **identical — never written** |

## Counts: what 4817/4782/4782 actually names

The brief and the coordinator both describe the shared checkout as 4817/4782/4782. That number
is real but it names a **commit, not a working tree** (fresh TS-parser count):

| tree | no/en/de |
|---|---|
| shared checkout **working tree** (dirty, `translations/*.ts` all ` M`) | **5164/5129/5129** |
| shared checkout **HEAD** `8ac6f63` (committed) | **4817/4782/4782** |
| `candidate/fe-compose-2026-08-05` `9f7d8df` — **the tree I built** | **5090/5055/5055** |
| sibling `lane/norwegian-only-keys-translate` `a8177f8` | 4817/4816/4816 |

The shared working tree is **+347 keys per dictionary** ahead of the commit the brief quotes. The
35-key no↔en gap the brief's numbers encode is still open at 5164 vs 5129. Nothing here is a
duplicate — the count is of properties, and a duplicate would raise it, not lower it.

## Instrument corrections and caveats

1. **The first build was measuring the wrong tree, and only failed loudly by luck.**
   `node_modules` was first *symlinked* into the worktree. Webpack then resolved
   `node_modules/.cache/nuxt/components/index.js` relative to the **shared checkout** and began
   compiling the shared tree's components; it died on
   `Can't resolve '.../MealsReconciliationQueue.vue'` — a component that exists in the shared
   working tree but not at `9f7d8df`. Had the two trees' component sets happened to match, that
   run would have silently reported the shared checkout's build as this lane's result. Fixed with
   an APFS clone copy (`cp -Rc`, 22 s, no extra disk). **A symlinked `node_modules` is not a
   worktree isolation technique for a Nuxt build.**
2. **Collateral I caused and cannot undo:** that first run overwrote the shared checkout's
   `node_modules/.cache/nuxt`. It is a gitignored, regenerable build cache and no tracked file
   changed, but any lane holding a warm Nuxt cache lost it.
3. **Node version.** Measured on v24.15.0. `package.json` declares `engines.node: 22.x` and the
   Pages workflow pins **node 16**. The *silence* does not depend on the version — it follows from
   `typeCheck: false` and the semantic/syntactic split shown above — but the exit-0 results were
   observed on v24, not on the version CI uses.
4. **The plant script fails loudly rather than continuing.** If the key is absent, the file stops
   parsing, occurrences ≠ 2, or TS1117 is *not* raised at the semantic tier, it prints
   `PLANT-ABORT` and exits 2. A plant that quietly failed to land would otherwise read as "the
   build is silent", which is the answer being tested for.
5. **Not re-measured here, deliberately:** the test tier. That is the sibling's result and the
   brief asked for the other half.

## The 08:20 interruption

The session was cut mid-sentence while writing this file. **Nothing was reconstructed from
memory.** Every claim above was re-measured after the fault, in runs watched to completion:
`RERUN-A` (plant + default edition), `RERUN-B` (`typeCheck:true` + plant), `RERUN-C`
(`typeCheck:true` pristine control), plus a fresh count of all four trees and a fresh sha256
comparison of the shared dictionaries. The pre-fault logs (`build-0` … `build-6`) are kept
alongside them; each pre-fault result has a post-fault twin that agrees. Nothing was lost that
mattered, because nothing had been committed and the plants had already been restored.

## Files

| file | role |
|---|---|
| `plant.js` | plants/restores one duplicate; asserts the plant landed, aborts if not |
| `evidence/RERUN-A-plant-no-default-edition.txt` | the answer: exit 0, 212 routes, silent |
| `evidence/RERUN-B-typecheck-on-plant-no.txt` | the lever red: exit 1, one TS1117 |
| `evidence/RERUN-C-typecheck-on-clean.txt` | the lever control: exit 0, 0 TS errors |
| `evidence/build-3-ch-plant-de.txt` | Swiss edition + duplicate in `de.ts`: exit 0, silent |
| `evidence/build-2-ch-baseline.txt` | its pristine baseline, identical warning set |
| `evidence/build-6-ch-locale-census.txt` | Swiss build ships all three dictionaries |
| `evidence/dict-hashes-pristine.txt`, `evidence/shared-dict-hashes-before.txt` | restoration proof |

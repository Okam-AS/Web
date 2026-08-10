# An instrument for the fourteen frontend branches

Read-only. Nothing was built, no suite was run, no ref touched. Trunk `6d5328004`, unmoved.

## What each candidate actually decides

| instrument | what it decides | can it tell superseded from stale | cost per branch |
|---|---|---|---|
| the frontend tier at the branch tip | the branch is internally consistent **with itself** | **no** — it never looks at the trunk | ~7 s, plus the `core` trap below |
| lint against the trunk's rules | conformance to a style config | **no** | ~10 s |
| typecheck | little here — the tree is Vue 2 and mostly untyped `.js`/`.vue` | **no** | n/a |
| a render | that a component mounts under fixtures somebody must write | **no**, and it is the most expensive | minutes, plus fixtures |
| the diff applying | already used; its refusal is what made these 14 undecidable | **no** | ~1 s |
| **import resolution against the trunk** | whether the branch's files reference modules the trunk still has | **partly — see below** | **~2 s, no build, no `node_modules`, no `core`** |

## The instrument, and the honest limit on it

Import resolution is the only cheap candidate that **looks at the trunk at all**. For each changed
`.js`/`.ts`/`.vue` file it resolves every `~/…` and relative import against the trunk's tree.

**It is asymmetric, and that is the finding.** It can show a branch *does not fit* the trunk — the world
moved under it. It **cannot** show the trunk already holds the change. An all-resolving branch is equally a
superseded one and a wanted one, so **no cheap frontend instrument decides supersession**; this one decides
*fit*, and fit is a different question wearing similar clothes.

## What it decided, run over all 14

| branch | files | imports | unresolved | moved | reading |
|---|---:|---:|---:|---:|---|
| `lane/ev-journey-timebomb` | 12 | 0 | 0 | 0 | no purchase — no imports to resolve |
| `lane/fe-wf-blind-bind-name` | 25 | 51 | 10 | 3 | **does not fit the trunk** |
| `lane/fe-wf-bootstrap` | 6 | 10 | 0 | 0 | fits; still undecidable |
| `lane/fe-wf-contact-imported` | 7 | 13 | 0 | 0 | fits; still undecidable |
| `lane/fe-wf-link-deadend` | 25 | 51 | 10 | 3 | **does not fit the trunk** |
| `lane/fe-wf-oplink` | 24 | 47 | 8 | 3 | **does not fit the trunk** |
| `lane/journey-workforce` | 32 | 28 | 0 | 0 | fits; still undecidable |
| `lane/meals-reachable-web` | 5 | 5 | 0 | 0 | fits; still undecidable |
| `lane/price-crosscurrency` | 15 | 31 | 3 | 0 | **does not fit the trunk** |
| `lane/train-evidence-pack-ui` | 12 | 18 | 0 | 0 | fits; still undecidable |
| `lane/train-publish-unclickable` | 19 | 13 | 0 | 0 | fits; still undecidable |
| `lane/train-readonly-visible` | 17 | 5 | 0 | 0 | fits; still undecidable |
| `lane/wf-roles-ui` | 12 | 14 | 0 | 0 | fits; still undecidable |
| `lane/wf-timesheet-ui` | 27 | 17 | 0 | 0 | fits; still undecidable |

| class | count |
|---|---:|
| **does not fit the trunk** — stale, and the backend's *signature gained an argument* shape | **4** |
| imports all resolve — the instrument is silent, still `undecidable` | 9 |
| no imports in the changed files — the instrument has no purchase | 1 |

The four that do not fit are the useful output: 10, 10, 8 and 3 unresolved imports respectively, with a
further 3 apiece whose **basename still exists elsewhere on the trunk** — a file that moved, which is the
clerical kind rather than the superseded kind.

## The tradeoff, with the number

The powerful instrument for this half does not exist: there is no frontend compiler that fails when a
signature gains an argument, which is precisely the check that makes the backend half decidable. The cheap
instrument runs in **about two seconds a branch against fourteen seconds for all of them**, needs no build,
no `node_modules` and no `core`, and **decides 4 of 14**.

So: **4 decided at ~2 s each, 10 left `undecidable` at any price this repo can currently pay.** Naming that
beats recommending a tier that would answer a different question in seven seconds and look like progress.

## The `core` trap, avoided rather than survived

A fresh worktree leaves the `core` submodule empty, ~15 jest suites then fail to RESOLVE, and **jest still
exits 0** — a green frontend run in a fresh checkout is not evidence. This instrument never runs jest, so
it cannot be fooled by that. Any future proposal to use the tier here must first populate `core` and prove
the suite count, not the exit code.

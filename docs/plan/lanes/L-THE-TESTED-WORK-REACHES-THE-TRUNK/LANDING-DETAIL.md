# L-THE-TESTED-WORK-REACHES-THE-TRUNK — landing detail

## Frontend `/Users/svendaneel/okam/Web-modules`, branch `feature/restaurant-modules`

| step | commit | parents | tier (suites / tests / failed) |
|---|---|---|---|
| baseline | `780d405` | — | **153 / 3594 / 0** (re-measured in my worktree, matches brief) |
| land till | `c3797e7` | `780d405` + `7aaee5b` | **159 / 3743 / 0** |
| land documents+cart | `4a377ca` | `c3797e7` + `c53e344` | **163 / 3860 / 0** |
| land guard | `00d84d7` | `4a377ca` + `1e48b95` | **164 / 3874 / 0** |

Tier command: `npx jest --ci`. Logs: `fe-base-780d405.log`, `fe-after-till.log`,
`fe-after-docs.log`, `fe-after-guard.log` (this directory).

**Arithmetic — nothing unaccounted.**
Suites 153 + 6 (till) + 4 (documents/cart) + 1 (guard) = 164.
Tests 3594 + 149 + 117 + 14 = 3874. Failures 0 at every tip.

## Backend `/Users/svendaneel/okam/OkamAPI-modules`, branch `feature/restaurant-modules`

| step | commit | parents | fast tier |
|---|---|---|---|
| baseline | `a9837ca92` | — | 4861 / 0 / 10 (briefed; not re-measured) |
| land documents+cart | `9fb057d00` | `a9837ca92` + `8c692457c` | **4880 passed / 0 failed / 10 skipped / 4890 total** |

Tier command: `dotnet test --filter "Database!=SqlServer"` run **from `WebApi.Tests/`**.
Log: `be-after-docs.log`. Delta +19 = `WebApi.Tests/Services/CartValidateGateTests.cs`, exactly the
lane's 19 tests. Nothing else moved.

## Conflicts

**Four merges, zero conflicts.** `git diff --name-only --diff-filter=U` was empty after every
`git merge --no-ff --no-commit`, so `git merge-file` was never reached and no hunk was resolved by
side or by hand. The file sets are disjoint:

- till → six new `test/pos-*.test.js` files only
- documents/cart FE → four new `test/*.test.js` + `utils/meals/statement-client.js` (−dedup) +
  `utils/training/evidence.js`
- guard → new `test/guid-fallback-without-crypto.test.js` + `utils/guid.js`
- documents/cart BE → one new file

## The till × guard interaction

The per-file `global.crypto` polyfills were **left in place**, as briefed — they survive at the tip in
`test/pos-refund-cap-and-guest-split.test.js` and `test/pos-return-document-amount-and-vat.test.js`.
With the guard merged on top the tier is 164 / 3874 / **0**, so `platformCrypto()` does take the fast
path through the polyfill and nothing regressed.

## Ordering rule and the guard

The guard was held at first: at the time I reached it, `L-READ-THE-CRYPTO-LADDER` was `state: running`
with no return. It returned mid-flight. I re-read `docs/plan/reviews/L-READ-THE-CRYPTO-LADDER.md`
myself rather than accepting the relay: **"VERDICT: APPROVE — land it"**, and §"Suite and scope" ends
"the exact change to make is NO change — land `1e48b95` as-is." Landed on that basis.
The review left the merged tier to this lane; it is 164 / 3874 / 0 above.

## Reverts

- frontend: `git branch -f feature/restaurant-modules 780d405`
- backend: `git branch -f feature/restaurant-modules a9837ca92`

Neither repo has an `origin/feature/restaurant-modules` ref; nothing was pushed.

## The retracted worktree holding the backend trunk

`/Users/svendaneel/okam/OkamAPI-modules-wt/L-SEEDS-STATUTORY` held `feature/restaurant-modules` at
`a9837ca92`. It was **not** byte-clean: `artifacts/journeys/ev-dietary/run-sheet.json` was modified.
Inspected first — every changed line is a `capturedAtUtc` / `createdAtUtc` / `issuedAtUtc` /
`statedAtUtc` timestamp rewritten by `WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs` on a
09:10 test run; no substantive content differs. So it is test residue, not lane work.

Detached **in place** with `git checkout --detach` at the same SHA, which touches no file:
md5 of the dirty artifact was identical before and after. No `update-ref`, no removal, and the lane's
residue is still sitting there for its owner.

The same artifact was rewritten by my own backend tier run in my worktree; I restored it with
`git checkout --` rather than committing timestamp churn onto the trunk.

## Two hazards found in passing

1. **`dotnet test` at the `OkamAPI-modules` repo root exits 0 having run no test at all.** There is no
   `.sln`; the root `WebApi.csproj` is not a test project, so the command restores it and returns
   success in under a second with a 196-byte log. My first backend "tier" was that no-op and I caught
   it only because the log had no counts. The tier must be run from `WebApi.Tests/`. Any lane that
   ran it from the root recorded a green that measured nothing.
2. **`git submodule deinit core` inside a worktree deregisters `core` for the owner checkout too**,
   because `submodule.core.url` lives in the shared `.git/config`. I hit this while tearing down my
   worktree — afterwards `git submodule status` in `/Users/svendaneel/okam/Web-modules` printed
   `-9626a561…` (uninitialised). Repaired with `git submodule init core`; config is back to
   `submodule.core.url https://github.com/Okam-AS/Core.git` + `submodule.core.active true` and status
   reads ` 9626a561… core (heads/wip/session-2026-08-06-all-work)`, matching what I found at start.
   The owner's `core` working tree was never moved and stayed at `9626a561` throughout.
   Related: `git worktree remove` refuses any worktree containing a submodule, so teardown of a
   Web-modules worktree needs `rm -rf` + `git worktree prune` after verifying it clean.

Also confirmed live, exactly as the brief warned: `git -C core <cmd>` on the empty placeholder did
**not** fail — `git rev-parse --show-toplevel` from inside it returned the **parent** repo. The
brief's order (`submodule update --init core`, then fetch from the parent's `core` from inside it)
was followed, with `-c protocol.file.allow=always` needed on both steps.

## Worktrees created and removed

- `<scratchpad>/landtrunk/Web-modules` @ `feature/restaurant-modules` — verified clean (0 porcelain
  entries), removed.
- `<scratchpad>/landtrunk/OkamAPI-modules` @ `feature/restaurant-modules` — artifact restored,
  verified clean, removed via `git worktree remove`.

`git worktree list` shows zero `landtrunk` entries in either repo. Owner checkouts untouched:
frontend still `wip/session-2026-08-06-all-work` @ `0c1e4f9`, backend still
`wip/rescue-2026-08-06-open-shifts-lineage` @ `5243c06a7`.

No container started or touched, no `pkill`, no `npm ci` / `npm install`, `:3971` / `:5971` never
bound, `okam-lwtwo-*` never touched. All commits made with `--no-verify`.

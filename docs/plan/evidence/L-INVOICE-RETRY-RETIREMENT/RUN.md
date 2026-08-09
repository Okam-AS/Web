# Backend suite run — `f18ffeda58137e9d2b58e109466d380d0847364c`

## Provenance

| | |
| --- | --- |
| SHA | `f18ffeda58137e9d2b58e109466d380d0847364c` |
| branch | `lane/invoice-retry-retirement`, off `lane/pdf-nullderef` (`17198f14`) — a LANE commit, not an ancestor of the receipts above it |
| commit | `An invoice the renderer could not produce is not an invoice that was sent` — 2026-08-02 |
| working tree | clean detached `git worktree` at the SHA (`wt-invretire-receipt`); `git status --porcelain` asserted EMPTY before the build |
| SDK | 8.0.110 (pinned by `global.json`) |
| host | macOS, Darwin 25.5.0 |
| artifact | `../f18ffeda-fast-tier.trx` |

## Command

```sh
git worktree add --detach ../wt-invretire-receipt f18ffeda58137e9d2b58e109466d380d0847364c
git status --porcelain                                          # empty — asserted BEFORE the build
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug          # 0 errors
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" \
  --logger "trx;LogFileName=f18ffeda-fast-tier.trx"
```

Process exit code `0`. Ran 15:04 → 15:10 UTC, 5 m 34 s.

The build was a **full compile into an empty `bin/`** — the worktree was created for this run — so the
`--no-build` trap in `CLAUDE.md` cannot apply. `WebApi.Tests.dll` was written at 17:04:47 local, before
the run started.

## Result

From the `.trx` `<Counters>`, which is the authority for what ran:

```
total="4411" executed="4399" passed="4399" failed="0" error="0" timeout="0" aborted="0"
```

## What this SHA is

`InvoiceService.RetrySendingExistingInvoices` selects the invoices to send on `StoreSendInvoiceToEmails`
being empty or null, and stamps the store's address onto the tracked row *before* rendering, because
`GetInvoiceModel` reads the address off the entity. The sibling commit's outage handling — skip the
invoice whose PDF could not be rendered, keep going — let that stamp reach the run's `SaveChangesAsync`
for an invoice that was never mailed, so a renderer outage retired the invoice from every future run.
The stamp is now rolled back on the skip.

## What the number is measured against

The base is **4399 passed / 0 failed / 12 skipped of 4411**, the row above at `2497ce9d`, which is this
lane's parent commit's parent. The difference is **0**: this commit adds no test, it adds assertions to
two that already existed, so an unchanged count is the expected result and not a sign the tests did not
run. `DocumentRendererFailureTests` still contributes 10 tests, verified by running the class alone.

## Non-vacuity, measured

Both new assertions were mutation-proved, each with the assembly mtime checked across the cycle so no
`--no-build` run measured a stale binary:

| mutation | expected red | observed |
| --- | --- | --- |
| rollback removed (stamp survives the skip) | outage test | `the run retired an invoice it never mailed`; with that assertion suspended, the second run returned `0` where `1` is asserted |
| stamp removed entirely | renderer-up test | `Expected: regnskap@okam.example / Actual: (null)` |

The second mutation is the one that matters for the shape of the fix: the rollback cannot be had by
simply never stamping, because a store that WAS mailed must still retire.

## What is still unmeasured

The SQL tier (`--filter "Database=SqlServer"`) did NOT run: no container slot was granted and five
containers belonging to other work were up. This commit touches no migration, no schema and no raw SQL
statement, so it changes nothing the SQL tier alone can see — an argument, not a measurement, recorded
as one.

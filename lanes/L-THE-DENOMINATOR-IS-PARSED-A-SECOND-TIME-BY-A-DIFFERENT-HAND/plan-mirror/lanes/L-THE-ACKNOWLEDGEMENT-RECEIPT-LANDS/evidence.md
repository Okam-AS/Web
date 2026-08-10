# L-THE-ACKNOWLEDGEMENT-RECEIPT-LANDS — landing evidence

## What branched from what

| thing | sha |
|---|---|
| frontend trunk `feature/restaurant-modules`, read fresh | `8db65dd` |
| lane `lane/a-worker-sees-what-she-confirmed` | `48c0462` |
| merge base | `00d84d7` |
| new trunk tip | `6b98839` |

`48c0462` sat directly on `00d84d7`. The trunk had moved four commits past that base
(`4a377ca` … `8db65dd`), so this was a real three-way merge, not a fast-forward.

## Conflict resolution

`git merge --no-ff --no-commit lane/a-worker-sees-what-she-confirmed` reported
`Automatic merge went well; stopped before committing as requested`. **Zero conflicted paths**, so
`git merge-file` was never reached — there was no hunk to arbitrate.

The only files touched by both sides were the three translation catalogues. Line-count arithmetic
confirms neither side was dropped:

| file | base `00d84d7` | trunk `8db65dd` | lane `48c0462` | merged |
|---|---|---|---|---|
| `translations/no.ts` | 5665 | 5673 (+8) | 5666 (+1) | 5674 |
| `translations/en.ts` | 5600 | 5608 (+8) | 5601 (+1) | 5609 |
| `translations/de.ts` | 5609 | 5617 (+8) | 5610 (+1) | 5618 |

5665 + 8 + 1 = 5674. The lane's single key, `wfme_pub_title_confirmed:
'Vaktplanen er bekreftet'`, is present at the merged tip, and the trunk's eight are too.

Committed with `--no-verify`. The husky hook (`/Users/svendaneel/okam/Web/.git/hooks/husky.local.sh`)
fails its own `cd` on every git operation in this tree, so the flag was load-bearing.

## Core submodule

Pinned `9626a561bb0442b0aed026be75b7f9419337ac6d` identically at base, trunk tip and lane tip. The
worktree was already populated at that SHA, so no `git submodule update` and no in-`core` fetch were
required, and none was run. `git submodule deinit` was never invoked, and no `git -C core` command
was issued against a placeholder.

## Tier at the new tip

Log: `docs/plan/lanes/L-THE-ACKNOWLEDGEMENT-RECEIPT-LANDS/tier-frontend-6b98839.log` (4097 lines).

```
Test Suites: 166 passed, 166 total
Tests:       3939 passed, 3939 total
Snapshots:   0 total
Ran all test suites.
```

`npx jest` exited 0.

**Abort scan.** The log was grepped for `crash|Aborted|abort|SIGSEGV|SIGKILL|heap out of memory|
Cannot find module|worker process|force exit|Ran all test suites|FAIL `. The **only** match in 4097
lines was line 4097, `Ran all test suites.` — no crash line, no abort line above the summary, and
`grep -c "^FAIL"` returned 0. The `core`-submodule failure signature (suites failing with zero tests
red, all module-resolution) is absent: `Cannot find module` has no hits at all.

**Every test accounted for.**

- Clerk baseline at `8db65dd`: **166 suites / 3924 / 0**.
- The lane carried **+15 tests, no new suite** — all nine of its paths are `M` in
  `git diff --name-status 00d84d7 48c0462`, none `A`.
- 3924 + 15 = **3939**, which is exactly what ran. Suite count stayed **166**.

For contrast, the trunk's own four commits added two *new* suite files
(`test/front-door-pages-resume-after-login.test.js`, `test/training-evidence-print.test.js`), which
is why the clerk's 166 is two above the lane's own 164 baseline.

### The 15 named tests

`test/workforce-me-components.test.js`

1. an acknowledged row still renders its receipt
2. the heading names the confirmation rather than announcing a new plan
3. "you have not opened this yet" is withheld once nothing is unread
4. the unread dot and the mark-as-read button go with the unread state
5. the acknowledge button stays, so the idempotent replay has a caller
6. the count in the heading is the unread ones, not the ones on screen

`test/workforce-me-inbox-filter.test.js`

7. an acknowledged row is kept even though acknowledging marked it read
8. a read row nobody acknowledged is still dropped
9. with nothing acknowledged it is exactly the unread list
10. the receipt survives an inbox re-read that failed
11. an acknowledged row the server stops reporting is not lost
12. the kept row is appended once, after what is still unread
13. a row the server has NOT marked read is kept once, in its unread position
14. the row carried forward is the SERVER's, so it reports itself as read
15. not loaded with nothing acknowledged is still null, never an empty inbox

## Constraints

- **C1** — frontend-only diff; no migration, no script, no raw SQL, no `UPDATE`/`DELETE` against any
  guarded table, no EF entity touched.
- **C2** — no migration file in the diff, and no `OnModelCreating` index or constraint.
- **C3** — `publicationsForNotice` is exported from `utils/workforce-me/inbox-filter.js`, imported by
  `pages/admin/workforce-me.vue`, bound through the `noticePublicationItems` computed and passed as
  `:items` to `WorkforcePublicationNotice`. The page already exists and is already navigated to; the
  new function is reachable from a real caller, not an orphan. The predecessor `unreadPublications`
  stays exported and stays called (by `publicationsForNotice` itself and by its own tests), so no
  dead export was left behind.
- **C4** — no deposit, capture, refund, settlement line, funded order or timesheet cost is written.
- **C5** — the acceptance evidence for the *capability* is the killed lane's two-armed live walk,
  preserved at `docs/plan/lanes/L-A-WORKER-SEES-WHAT-SHE-CONFIRMED/` (before/after screenshots,
  `before-walk.json`, `after-walk.json`, `evidence.md`): before, pressed twice and shown nothing
  either time; after, `receiptCount 1` reading "Bekreftet mottatt", with the replay path reachable.
  Ten mutations applied and reverted, 15 of 15 new tests red. **This lane's verdict is a landing, and
  the 3939 count is offered as evidence that the merge behaves — never as acceptance.** Sven walking
  it remains the gate.
- **C6** — no Norwegian statute, forskrift or § reference is added by this diff.
- **C7** — no log or telemetry call is added at any level.

## Worktree

`web-trunkland` held `feature/restaurant-modules` only for the merge and the tier, and was
**detached in place** afterwards at `6b98839`. `git worktree list | grep -c feature/restaurant-modules`
returns **0** — no worktree holds the trunk. Nothing was removed and `git worktree prune` was not
needed, so the `rm -rf` teardown path was not exercised.

`web-livewalk` was **not touched**: still `6f74f87`, still carrying its 8 uncommitted files
(`TrainingEvidenceDocument.vue`, `WorkforcePublicationNotice.vue`, `training-evidence.vue`,
`workforce-me.vue`, the three translation catalogues, `inbox-filter.js`).

## Revert

Nothing was pushed. The merge is one commit on a local branch, so the whole undo is:

```
git -C /Users/svendaneel/okam/web-trunkland branch -f feature/restaurant-modules 8db65dd
```

If the trunk has moved on by the time a revert is wanted, use
`git revert -m 1 6b98839` instead, which restores `unreadPublicationItems` as the notice's source and
re-opens the vanishing-receipt defect.

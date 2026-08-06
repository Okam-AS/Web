# The owner's step — one runnable block

> ## Gate first. Do not run the block below yet.
>
> The merge is textually clean and **functionally unlandable today**. `06b8b582` carries a wire test
> that fails and, in failing, **crashes the test host and aborts the whole fast tier** — 4638/0/12
> green at the integration tip becomes an abort at 4100 with ~550 tests never executed. It is not the
> merge's fault: a clean checkout of the lane tip with no merge at all aborts identically, and the
> lane's own accepted receipt `artifacts/tests/L-TRAIN-DISCLOSURE/after.trx` does not contain the
> test. Full account and the two-line fix: `suite.md` in this directory.
>
> **Precondition:** `WebApi.Tests/Wire/TrainingWireTests.cs:1096` materializes its `JsonElement`s
> before `Assert.All`, **and** its all-false `actorIsSubject` claim is scoped to the rows that test
> causes. Then re-run `dotnet test WebApi.Tests/WebApi.Tests.csproj -c Debug --filter
> "Database!=SqlServer"` at the merge and require **4650 passed / 0 failed / 12 skipped, total 4662,
> no `Test Run Aborted`** — that is baseline + the twelve tests the lane adds and nothing else.
>
> The fix lands on `lane/train-disclosure`; then the merge below has to be rebuilt on top of it and
> its SHA will differ from `f4407595`.

`feature/restaurant-modules` in **OkamAPI is a local-only branch**: `git rev-parse
origin/feature/restaurant-modules` → *unknown revision*, and it appears in none of the 15
remote-tracking refs. **So there is nothing to push and no push is owed here.** The exit criterion is
a local ancestry fact and the block below establishes it. A push, if Sven wants one, is a separate
decision about publishing a 60-commit integration branch, not part of this landing.

The branch is **checked out in none of the 355 backend worktrees** (`git worktree list | grep
'[feature/restaurant-modules]'` → empty), so advancing the ref cannot desync anybody's index. That is
what makes the no-checkout form below safe, and it is the form to use: the primary OkamAPI checkout
sits on `feature/swiss` and carries hundreds of uncommitted paths, so `git checkout
feature/restaurant-modules` there would be the wrong thing to do to somebody's tree.

## Run this

```sh
cd /Users/svendaneel/okam/OkamAPI

# 1. Compare-and-swap the integration branch onto the merge this lane built.
#    The third argument is the expected old value: if another lane has landed
#    since, this FAILS and changes nothing rather than merging over them.
git update-ref refs/heads/feature/restaurant-modules \
  f4407595c12687d1ada7b55e0f096c54fee684bf \
  8e2b57de8442a389a9b5f8025312c9750614c85e

# 2. The exit criterion, verbatim.
git merge-base --is-ancestor 06b8b582 feature/restaurant-modules \
  && echo "LANDED: the disclosure log is served by the integration branch"

# 3. The route is there.
git show feature/restaurant-modules:Controllers/TrainingController.cs | grep -n 'evidence/disclosures'
```

### SHAs each step should produce

| step | expected |
|---|---|
| before step 1 | `git rev-parse feature/restaurant-modules` = `8e2b57de8442a389a9b5f8025312c9750614c85e` |
| after step 1 | `git rev-parse feature/restaurant-modules` = **`f4407595c12687d1ada7b55e0f096c54fee684bf`** |
| after step 1 | `git rev-parse feature/restaurant-modules^{tree}` = `ee8da6f67d653349b391b517bc351cb91bd596cf` |
| step 2 | exit 0, prints `LANDED: …` |
| step 3 | prints `425:        [HttpGet("evidence/disclosures")]` |

### If step 1 fails

It failed because `feature/restaurant-modules` moved off `8e2b57de` — another lane landed first.
Nothing was changed. Redo the merge on the new tip; it is a two-file question at most
(`Program.cs`'s Training DI block, and whether the new tip touched `Controllers/TrainingController.cs`
or `Services/Training/`):

```sh
git worktree add --detach /Users/svendaneel/okam/wt-traindiscland-redo feature/restaurant-modules
cd /Users/svendaneel/okam/wt-traindiscland-redo
git merge --no-ff --no-edit lane/train-disclosure
```

### Undo

```sh
git update-ref refs/heads/feature/restaurant-modules \
  8e2b57de8442a389a9b5f8025312c9750614c85e \
  f4407595c12687d1ada7b55e0f096c54fee684bf
```

## Housekeeping this lane leaves behind

Three worktrees and one branch, all created by this lane, all safe to remove once the ref is
advanced. Nothing else in the estate was written to.

```sh
git worktree remove --force /Users/svendaneel/okam/wt-traindiscland-m      # the merge
git worktree remove --force /Users/svendaneel/okam/wt-traindiscland        # the baseline
git worktree remove         /Users/svendaneel/okam/wt-traindiscland-lane   # the control
git branch -d local/train-disclosure-land       # after step 1 it is fully merged
```

`--force` on the first two only because the suite itself rewrote
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` in each; both worktrees were `git status
--porcelain` empty at creation and nothing else in them was modified by hand.

## The other half — do not stop here

Advancing the backend ref alone does **not** make `L-JOURNEY-TRAINING` walkable. The frontend compose
is the other half and it is a **fast-forward** (`candidate/fe-compose-2026-08-05` is 105 ahead of
`feature/restaurant-modules` in Web-modules and the tip is a strict ancestor of it):

```sh
cd /Users/svendaneel/okam/Web-modules
git update-ref refs/heads/feature/restaurant-modules \
  f40fdf36cfe446cde5212eb8927616a8c9ba8cf6 \
  e34977acebd59b223584158c33451b6f1ffd82c1
```

Measured, so the form above is safe on this side too: **no frontend worktree has
`feature/restaurant-modules` checked out** — `/Users/svendaneel/okam/Web-modules` itself sits on
`lane/focustrap-teardown` with 370 dirty paths, and the candidate is checked out at
`/Users/svendaneel/okam/web-fe-candidate`. But that step is `L-COMPOSE-FE-CANDIDATE`'s to justify,
not this lane's; it is recorded here only so the pair is visible in one place.

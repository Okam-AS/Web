# This lane is two commits in two repositories

**A reviewer must read both.** Reading only the `Web-modules` diff shows a submodule pin moving from
one SHA to another and a page that starts calling `error.hasBackendMessage` — a property that does
not exist anywhere in that diff. The half that creates it is in the other repo.

| repo | commit | branch | what it carries |
|---|---|---|---|
| `Okam-AS/Core.git` (the `core/` submodule) | `a6ae241` | `lane/every-report-read-says-why` | all five reads in `services/statistics-service.ts`; the additive `hasBackendMessage` on `RequestService.BuildError` |
| `Web-modules` | `2b16e24` | `lane/every-report-read-says-why` | the pin bump `9626a561 -> a6ae241`, the page's `describeLoadFailure`, four keys in no/en/de, both test files |

`a6ae241`'s parent is exactly `9626a561`, the SHA the trunk was pinned at, so the submodule history
is a straight line with no rebase and no merge.

## Neither is pushed, and the order matters when they are

`git push` was not run in either repo. When this is pushed, **the core commit must go first**: a
`Web-modules` commit whose gitlink names a SHA the Core remote does not have is a pin nobody else
can check out, and the failure looks like the trap this estate already documents — suites failing
with zero tests red, all module resolution.

## The pin was ALREADY unpushed before this lane

Worth knowing before anyone treats the above as a new problem. `9626a561` — the SHA the trunk is
pinned at today — **is itself absent from `Okam-AS/Core.git`**. A plain `git submodule update --init
core` fails on it:

```
fatal: remote error: upload-pack: not our ref 9626a561bb0442b0aed026be75b7f9419337ac6d
```

which is why every brief in this program carries the local-fetch remedy. Its message is
`wip: the full-replace guard and its wiring, saved before any composition`.

So the trunk already depends on an unpushed local commit, and this lane adds a second one on top of
it. **That is a pre-existing condition, not something this lane introduced** — but it means landing
this for real is a two-repo push of at least two commits, and `9626a561` has to reach the remote
before `a6ae241` can be reachable there.

## TEARDOWN HAZARD: the core commit lived in ONE place, inside a worktree admin directory

A submodule inside a linked git worktree does not keep its objects in the shared repository. This
lane's `core/.git` read:

```
gitdir: ../../Web/.git/worktrees/web-reasons/modules/core
```

so commit `a6ae241` existed **only** under `Web/.git/worktrees/web-reasons/` — the directory that
`rm -rf` plus `git worktree prune` deletes. The ordinary teardown every brief in this program
prescribes would have destroyed the lane's main artifact, silently, with the Web-modules pin left
naming a SHA that no longer existed anywhere.

(`Web-modules` is itself a linked worktree — its `.git` is `gitdir:
/Users/svendaneel/okam/Web/.git/worktrees/Web-modules` — so the real superproject is
`/Users/svendaneel/okam/Web`. Nothing about the submodule's objects is where it looks like it is.)

**It is preserved as a git bundle committed on this branch**, so it survives teardown of everything:

    lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/core-a6ae241.bundle

Restore it into a fresh checkout's `core/` with the prerequisite the briefs already document:

```sh
cd core
git -c protocol.file.allow=always fetch /Users/svendaneel/okam/Web-modules/core \
    9626a561bb0442b0aed026be75b7f9419337ac6d
git -c protocol.file.allow=always fetch \
    ../lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/core-a6ae241.bundle 'refs/heads/*:refs/heads/*'
git checkout a6ae241
```

Proved, not asserted: the bundle was fetched into an empty `git init` repo holding only the
prerequisite, and both changed files came back byte-identical to the worktree copy with the parent
still `9626a561`.

## Why the fix touched `request-service.ts` and not only the file that was reported

`BuildError` already preferred the backend's reason and already attached the status. It did not say
**which of the two** the message was. The page needs that to decide whether to print the server's
sentence or write its own per status, and the alternative — comparing the message back against the
fallback string the caller itself just passed in — breaks the moment either string is edited.

The addition is three lines, sets one new property, and changes no existing behaviour: every current
caller sees the same `message` and the same `statusCode` it saw before.

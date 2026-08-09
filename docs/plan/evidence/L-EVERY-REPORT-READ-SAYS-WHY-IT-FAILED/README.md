# L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED — rescued, and still one clause short

Reason-shape hit: **(5) only one half of a two-part exit is shown** — after a rescue that fixes the *other*
problem the lane had. **This lane is NOT verified by this pass, deliberately.** The rescue is done because the
files were one `git clean` from being unreachable; the exit is left alone because its third clause has no
artifact and inventing one would be the failure this whole program exists to stop.

## The `evidence:` line this lane carries, preserved verbatim before anything else

    docs/plan/lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED

That path resolves nowhere and never did — the `docs/plan/` prefix error a sibling census already named. The
real files were at `lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/` on `lane/every-report-read-says-why`
(`6670619d5c009f3871e5a0d27e779e995ef752dc`), **a branch of this repo that is not an ancestor of HEAD**.

## What was rescued, and that it is the same bytes

Copied out with `git show <branch>:<path>` and verified by blob id — `git hash-object` on the copy equals
`git rev-parse` on the branch's entry, for all five:

| file | blob |
|---|---|
| `MUTATION-RECEIPT.md` | `617d2eee4eebe39fe5c38e9d4bd12b41a882419a` |
| `TWO-REPO-LANDING.md` | `6ebae7fcb01708207fbfc0b91c8690c1fd545139` |
| `mutate.py` | `7da4148b537d5af6a5ea520336129a6f6e7d1c7c` |
| `mutation-receipt.json` | `6a3b79fb3bb6e3fb024c9d0321483a8ea71410c9` |
| `core-a6ae241.bundle` | `8526e696f3b9825a29bcdaabfae3a58b3401de99` |

## Clauses 1 and 2 are carried, and by name

`MUTATION-RECEIPT.md` states its own totals — **37 in-scope arms, 37 killed, 0 survivors, 18 mutations
applied, 0 mutations that killed nothing**, and **0 of the 36 arms belonging to the prior lane disturbed**
(the last number is what makes the mutations targeted rather than merely destructive). Its driver aborts a run
whose search string is not found, so a no-op mutation cannot be mistaken for an unbreakable test.

**All four failure kinds appear as their own named arms, with the mutations that kill each:**

- **401** — `an expired session reaches the operator as the reason the backend gave`; `an expired session with
  an empty body is still named, not reduced to a code`
- **403** — `a refusal reaches the operator as the reason the backend gave`; `a refusal with an empty body is
  still named, not reduced to a code`
- **500** — `a crashed report engine reaches the operator as the reason the backend gave`; `a crashed report
  engine with an empty body names the code it answered with`
- **offline** — `being offline is told apart from the server refusing`

and the exit's *distinguishable* is itself an arm: **`the four failures do not read alike`**, killed by four
mutations including `page: 401 and 403 are collapsed into one sentence`. The *"rather than an axios string"*
half is the arm `a non-2xx reaches the service instead of escaping it as an axios error`, killed by
`core: the platform-growth read goes back to the unsafe GetRequest` — **which is exactly the exit's "reds when
the safe read is reverted"**, and the receipt shows that one mutation appearing against 13 separate arms.

## Clause 3 is the one that is unshown: *"and the frontend tier is green at the tip"*

There is **no tier artifact** in this lane, on the branch or anywhere else. `git ls-tree -r` on
`lane/every-report-read-says-why` under this lane's directory returns exactly the five files above — no junit,
no jest summary, no log. The number exists only as prose in the RETURN:

> Full tier at the lane tip: 170 suites, 4080 tests, 0 failures. 4007 baseline + 73 new arms = 4080 exactly

**That sentence is not an instrument, and this pass did not convert it into one.** Re-running it is not a
matter of typing a command: the worktree it ran in (`web-reasons`) is recorded REMOVED and pruned, the branch's
submodule pin names `a6ae241` which lives only in the bundle beside this file, and the checkout this pass runs
in is shared with five sibling agents, so it may not change branches. Producing clause 3 means a fresh
worktree, a bundle restore, a dependency install and a 170-suite run — **work outside this lane**, and it is
recorded as owed rather than waved through.

## A correction to the RETURN, measured rather than assumed

The RETURN says the bundle was *"Proved by fetching it into an empty git init"*. **It does not fetch into an
empty repository.** Run here:

```
$ git init -q . && git fetch <path>/core-a6ae241.bundle 'refs/heads/*:refs/remotes/bundle/*'
error: Repository lacks these prerequisite commits:
error: 9626a561bb0442b0aed026be75b7f9419337ac6d
```

It is a **thin** bundle whose prerequisite is the old pin — and the same RETURN records that `9626a561` is
itself absent from `Okam-AS/Core.git` (*"not our ref"*). So the two facts compose into one the RETURN does not
state: **a stranger with only the Core remote cannot open this bundle.**

What does work, measured: cloning any local Core and fetching the bundle into it.

```
$ git clone --no-checkout /Users/svendaneel/okam/Web-modules/core t && cd t
$ git fetch <path>/core-a6ae241.bundle 'refs/heads/*:refs/remotes/bundle/*'
$ git log --format='%H parent=%P %s' -1 a6ae241
a6ae24127b895e536cc600053f1cc25b1cc79f5f parent=9626a561bb0442b0aed026be75b7f9419337ac6d
  Every statistics read says why it failed, and which failure it was
$ git diff --stat 9626a561 a6ae241
 services/request-service.ts    |  8 +++++++-
 services/statistics-service.ts | 35 +++++++++++++++++++++++++++++------
```

All three local clones checked — `Web-modules/core`, `Web/core`, `ConsumerWeb/core` — carry `9626a561`, so the
commit is recoverable **today, from this machine**. The preservation works; the claim that it works from
nothing does not. Anyone landing this should read `TWO-REPO-LANDING.md` first and push `9626a561` before
`a6ae241`.

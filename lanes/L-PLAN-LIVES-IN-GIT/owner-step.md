# The owner's step — publish `plan/docs-20260806`

The branch exists locally and is proven to survive a clean checkout
(`lanes/L-PLAN-LIVES-IN-GIT/evidence.md` §3). **Only the push remains, and only the owner may
perform it.** Nothing below has been executed except the dry run, which writes nothing.

> **The branch was rebuilt on 2026-08-06 and its sha changed: `54d4dfc` → `6c4305e`.**
> The original carried two returns containing a live credential value
> (`L-PLAN-ARTIFACTS-ARE-SCRUBBED`, flag `F-PLAN-SNAPSHOT-CARRIES-A-CREDENTIAL`). The rebuilt
> branch is byte-identical except in 8 files, where each value is replaced by a placeholder
> naming the configuration key it came from. Same 444 files, same orphan shape, same message.
> The old commit is unreachable from every ref and reflog, and a `file://` clone of the rebuilt
> branch recovers no credential value from its history. The shas below are the rebuilt ones.
> **This does not rotate anything** — see §8.

---

## 1. Verify before you push (optional, ~2 seconds, read-only)

```sh
git -C /Users/svendaneel/okam/Web-modules log -1 --format='%H %s' plan/docs-20260806
# expect: 6c4305ea0212f8c834549b61931c9c6cc7a6046f docs/plan enters git: …

git -C /Users/svendaneel/okam/Web-modules ls-tree -r --name-only plan/docs-20260806 | wc -l
# expect: 444

git -C /Users/svendaneel/okam/Web-modules rev-list --parents -1 plan/docs-20260806
# expect: one sha and no parents — it is an orphan, it carries no code
```

## 2. Push — one command

```sh
git -C /Users/svendaneel/okam/Web-modules \
  push origin plan/docs-20260806:refs/heads/plan/docs-20260806
```

**Remote:** `origin` = `git@github.com:Okam-AS/Web.git`, the only remote configured.

Explicit `src:refs/heads/dst` because `push.default` is unset and the branch has no upstream.

**Dry run already passed** (`git push --dry-run …`, exit 0):

```
To github.com:Okam-AS/Web.git
 * [new branch]      plan/docs-20260806 -> plan/docs-20260806
```

`git ls-remote --heads origin 'refs/heads/plan/*'` returned 0 lines afterwards — nothing was
published.

## 3. Confirm afterwards

```sh
git -C /Users/svendaneel/okam/Web-modules ls-remote --heads origin 'refs/heads/plan/*'
# expect one line: 6c4305e…  refs/heads/plan/docs-20260806
```

---

## 4. What a reviewer sees

A branch `plan/docs-20260806` with **one commit, 444 files, no code**: `docs/plan/plan.md`
(25,686 lines), `intent.md`, `log.md`, **415 returns**, **22 reviews**, 3 walks, and
`docs/plan/.gitignore`.

It is an orphan, so GitHub's compare against `main` shows 444 additions and a PR reports
unrelated histories. **That is expected. This is a branch to read, not to merge.**

To read it without disturbing a working clone — a plain `git checkout` of it would replace the
working tree with just `docs/`:

```sh
git fetch origin plan/docs-20260806
git worktree add /tmp/plan origin/plan/docs-20260806
less /tmp/plan/docs/plan/plan.md
```

`feature/restaurant-modules` is on **no** remote (re-checked; `origin` carries 7 heads and that
is not one of them). This push would be the first thing about the restaurant-modules program to
reach `origin`.

---

## 5. Refreshing it later — the same five lines that built it

The plan is live: two files had already drifted and two new returns had appeared within ten
minutes of the branch being built. Refresh is one block, touches no other branch, and can never
conflict because nothing else writes here.

```sh
cd /Users/svendaneel/okam/Web-modules
export GIT_INDEX_FILE=$(mktemp -d)/plan-index
git read-tree --empty
git add -- docs/plan                     # pathspec-limited; honours docs/plan/.gitignore
TREE=$(git write-tree)
COMMIT=$(git commit-tree "$TREE" -p plan/docs-20260806 \
  -m "docs/plan @ $(date +%F) · corresponds-to-code $(git rev-parse --short feature/restaurant-modules)")
git update-ref refs/heads/plan/docs-20260806 "$COMMIT"
unset GIT_INDEX_FILE
git push origin plan/docs-20260806
```

**`export GIT_INDEX_FILE` is not optional and `unset` at the end is not optional.** The primary
checkout carries ~2,100 uncommitted paths belonging to other lanes; a `git add` against the real
index would stage them. `git add -A` must never be run in that checkout at all.

Detect staleness at any time:

```sh
git fetch origin plan/docs-20260806
git diff --stat FETCH_HEAD -- docs/plan
```

---

## 6. If the owner rules "same branch as the code" instead

The orphan branch is then not the right shape and should be deleted
(`git update-ref -d refs/heads/plan/docs-20260806`, or `git push origin --delete` if already
published). The same-branch equivalent, from a **clean worktree of the code branch** — never
from the primary checkout:

```sh
git worktree add /tmp/plan-onto-code feature/restaurant-modules
cd /tmp/plan-onto-code
git checkout plan/docs-20260806 -- docs/plan     # 444 files, ignore file respected
git commit -m "docs/plan enters git alongside the code it plans"
git push origin feature/restaurant-modules       # NOTE: publishes that branch's whole history
```

Read `evidence.md` §5.1 first. The measured cost is **30 files and 3,107 lines of plan churn per
day** added to every lane's diff — 2× to 6× a whole focused lane — plus a guaranteed merge
conflict on `plan.md`, a 1.7 MB file every dispatch rewrites. Keep `docs/plan/.gitignore` either
way: tracking `briefs/` and `render/` would add ~47,000 lines a day of regenerable output.

## 7. Retiring the stopgap ref

`refs/lanes/plan-snapshot` (rebuilt 2026-08-06, `5780798` → `a1ccc40`) holds nothing unique. Its
6 apparently-missing paths were hash-compared and are byte-identical to files that exist today
under repo-root `lanes/`. After the push it can be deleted
(`git update-ref -d refs/lanes/plan-snapshot`) or kept as a dated marker. This lane neither
deleted it nor resurrected its paths.

**Prefer deleting it.** Unlike the orphan branch, this ref sits on 309 commits of the product
branch, so a clone of it still receives `test/e2e/**` and `playwright.config.js` blobs carrying
the demo verification code — 82 blobs that no rewrite of the snapshot commits can reach. The
power-user code is gone from it; the demo code is not, and cannot be, from this ref.

## 8. What publishing this does NOT do

Scrubbing these artifacts is **not** rotation, and nobody should read a clean sweep as "the
credential is safe". Still true after this lane, all owner-only:

* `AppSettings:PowerUserVerificationCode` remains committed in **OkamAPI** — `appsettings.json`
  and both `Scripts/demo/demo-common.sh` and `Scripts/demo/seed-workforce-demo.sh` — and in that
  repository's history. This lane touched no file in OkamAPI.
* `AppSettings:DemoVerificationCode` remains committed in **this** repository's own test suite
  (`test/e2e/**`, `playwright.config.js`) and in 20 tracked files under `lanes/`.
* `AppSettings:Secret`, the `X-Okam-ApiKey` GUID and the Azure Functions host key were never in
  any plan artifact, and are untouched where they are committed.

The flags that own the rotation are `F-POWERUSER-CODE-IS-COMMITTED`,
`F-JWT-SIGNING-KEY-COMMITTED`, `F-PROD-STORES-APIKEY-HARDCODED` and `F-AZURE-FUNCKEY`.

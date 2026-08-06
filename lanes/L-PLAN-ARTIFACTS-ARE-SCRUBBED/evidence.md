# L-PLAN-ARTIFACTS-ARE-SCRUBBED — evidence

**No credential value appears in this file, in any file in this directory, or in any filename.**
Carriers are referred to by the configuration key they belong to, never by value.

## 1. The carrier list, derived rather than assumed

`emit-carriers.sh` reads each value from its own source in `/Users/svendaneel/okam/OkamAPI` and
writes it to stdout only. The script holds no value; nothing ever redirects its output to a file.

| # | Configuration key | Source | len |
|---|---|---|---|
| C1 | `AppSettings:Secret` | `appsettings.json:12` | 36 |
| C2 | `AppSettings:PowerUserVerificationCode` | `appsettings.json:20` | 6 |
| C3 | `AppSettings:DemoVerificationCode` | `appsettings.json` | 6 |
| C4 | `X-Okam-ApiKey` GUID | `Controllers/StoresController.cs` | 36 |
| C5 | Azure Functions host key | `Services/OkamFunctionsDocumentRenderer.cs:28` | 56 |

All five are byte-identical across `feature/restaurant-modules`, `feature/swiss` and
`origin/master`, compared by SHA-256 without printing them — so there is one value per key, not
a per-branch family. C4's line is `:1333` on the integration branch, not the `:1207` the flag
cites; that citation is `origin/master`'s numbering.

## 2. What the sweep found, against the counts on record

| Carrier | Recorded hypothesis | Measured | Verdict |
|---|---|---|---|
| C2 | 7 untracked working-tree files, 2 under `docs/plan/returns/` | exactly 7, exactly 2 | **confirmed** |
| C3 | 8 files under `docs/plan` | **9** files | **refuted by one** |
| C1, C4, C5 | not stated | **0** occurrences anywhere | new negative |

The ninth C3 file is `docs/plan/render/plan.html`, generated output that reproduces
`docs/plan/log.md:358`. A count taken over hand-written artifacts would miss it.

`plan.md` itself carries no value — it withholds them deliberately, as it claims.

Full extent in scope (`docs/plan/**` + `lanes/**`): **62 files, 93 occurrences** — C2 in 9
files / 11 occurrences (the 7 above plus 2 inside a checked-out clone), C3 in 62 files / 82.

## 3. The scrub

`scrub.py --apply docs/plan lanes` replaced every value with `<ConfigKey>__REDACTED`, e.g.
`AppSettings__DemoVerificationCode__REDACTED`. The form is alphanumeric-plus-underscore so it
stays valid inside JSON strings, HTML text, shell and JS literals and Markdown, and it names the
configuration key a later reader must look the value up in.

* 62 files rewritten, **no file deleted** — the returns stay whole as evidence.
* All 34 rewritten `.json` artifacts re-parse as valid JSON.
* File modes preserved.

## 4. The refs — where the brief's framing was incomplete

**Rebuilding the two tips would have removed nothing.** `refs/lanes/plan-snapshot` is not a
standalone snapshot: it is a 312-commit history whose two parents are themselves snapshot
commits that already carried both codes.

```
5780798  plan snapshot 2026-08-06T14:00Z      13 carrying occurrences
212a2b8  Snapshot docs/plan: 812 files        13
5197056  Preservation snapshot                89   <- includes lanes/ and test/e2e
e34977a  (product branch, 309 commits below)  carries C3 in test/e2e/**
```

So the segment `5197056 → 212a2b8 → 5780798` was rebuilt, not just the tip.

`rebuild-refs.py` starts each rebuilt commit from the **original tree** and replaces only the
blobs that carry a value, under `docs/plan/` and `lanes/` only. Product paths are deliberately
left alone: their blobs are reachable through the product ancestry regardless, so rewriting them
in a snapshot commit removes nothing and would make the snapshot disagree with the branch it
records. A temporary `GIT_INDEX_FILE` was used throughout.

| Ref | Before | After | Files | Shape |
|---|---|---|---|---|
| `plan/docs-20260806` | `54d4dfc` | **`6c4305e`** | 444 (unchanged) | orphan root, author/date/message preserved |
| `refs/lanes/plan-snapshot` | `5780798` | **`a1ccc40`** | 883 (unchanged) | 3 commits rebuilt onto `e34977a` |

`git diff` old→new touches only the 8 (resp. 9) carrier files.

### Old objects are unreachable

`refs/lanes/plan-snapshot` has no reflog (it is outside `refs/heads`).
`refs/heads/plan/docs-20260806` did, holding `54d4dfc`; that single ref's reflog was expired —
no other ref's reflog was touched. All four old commits now return 0 from
`git rev-list --all --reflog | grep`.

### Proof by clone, not by assertion

Cloned over `file://` (which copies only reachable objects — a plain local clone would hardlink
the whole object store and prove nothing) into a scratch directory, then greped both the checked
-out tree and **every object the clone received**:

| Clone of | Objects | Blobs carrying a value |
|---|---|---|
| `plan/docs-20260806` | 451 | **0** |
| `refs/lanes/plan-snapshot` | 5760 | C2 **0** (was 6) · C3 **82** (was 106) |

**`plan/docs-20260806` — the ref the owner's one-command push publishes — is completely clean.**
Neither code is recoverable from it, tip or history.

**`refs/lanes/plan-snapshot` cannot be made clean by this lane.** The power-user code is gone
from it entirely: all 6 of its blobs were snapshot-only. The demo code is not, and the 82
surviving blobs are all in the product ancestry — 62 in `test/e2e/**` and `playwright.config.js`,
20 in `lanes/**` files that are **tracked** on the product branch. Removing those means
rewriting 309 commits of the product branch, which is not this lane's to do. That ref is
local-only and is not the one proposed for pushing; `owner-step.md` §7 now recommends deleting
it rather than keeping it.

## 5. Two carriers the brief did not name

* **`lanes/L-PLAN-LIVES-IN-GIT/fresh-clone/.git`** — a clone of the pre-scrub branch sitting
  inside `lanes/`. Scrubbing its working files left its object store carrying 10 blobs. It was
  re-created from the rebuilt ref: 444 files, 0 carrying blobs, same evidentiary purpose.
* **`refs/lanes/preservation-snapshot-unreferenced-work`** (`054e140`) — a **third** local ref,
  carrying C3 in 20 `lanes/**` files and in `test/e2e/**`. It is not proposed for pushing and is
  outside the exit criterion, so it was left untouched and is reported here instead. It carries
  no C2.

## 6. `owner-step.md` was made stale by this work, and was corrected

It hardcoded `54d4dfc265d8…` as the expected sha in its pre-push verify block and again in its
post-push confirm block. After the rebuild both would have failed for the owner, at exactly the
moment a failing check invites forcing past it. Both updated, with a note recording the rebuild
and a new §8 stating plainly what this does not do.

## 7. What this does NOT do — read this before calling anything safe

**Scrubbing artifacts is not rotation.** A clean sweep means the plan hub stopped republishing a
credential; it says nothing about the credential's exposure.

* `AppSettings:PowerUserVerificationCode` stays committed in **OkamAPI** at `appsettings.json`,
  `Scripts/demo/demo-common.sh:25` and `Scripts/demo/seed-workforce-demo.sh:32`, and in that
  repository's history. **No file in OkamAPI was touched by this lane**, and nothing here says
  anything about OkamAPI's history. Per `F-POWERUSER-CODE-IS-COMMITTED` that door reaches
  `PowerUserRole`, which `StoreAdminAuthorizationHandler.cs:17` grants over every store, on
  tokens `UserService.cs:621` expires in 36500 days.
* `AppSettings:DemoVerificationCode` stays committed in **this** repository — `test/e2e/**`,
  `playwright.config.js`, and 20 tracked files under `lanes/`.
* C1, C4 and C5 were never in a plan artifact and are untouched where they are committed.

Rotation is the owner's act, under `F-POWERUSER-CODE-IS-COMMITTED`,
`F-JWT-SIGNING-KEY-COMMITTED`, `F-PROD-STORES-APIKEY-HARDCODED` and `F-AZURE-FUNCKEY`.

## 8. Boundaries observed

* **No push.** `git ls-remote --heads origin 'refs/heads/plan/*'` returns 0 lines. Both refs stay
  local. No commit was made to any shared branch.
* **No `git add` of any carrier file.** All 7 untracked C2 carriers are still untracked.
* Real index fingerprint `1785918138 89350` before and after; `git diff --cached` is empty. All
  index work used a temporary `GIT_INDEX_FILE`.
* No `git stash`, no `npm`, no container started, stopped or entered.

**One boundary was knowingly crossed.** The brief's standing clause *"You may not edit
`docs/plan/**` except your RETURN"* contradicts this lane's own objective and exit criterion,
which require the scrub to reach `docs/plan`. The specific instruction was followed over the
generic one: 9 files under `docs/plan` were edited, all of them value replacements only. Flagged
here rather than resolved silently.

## 9. Reproducing any of this

```sh
cd /Users/svendaneel/okam/Web-modules
L=lanes/L-PLAN-ARTIFACTS-ARE-SCRUBBED
python3 $L/sweep.py docs/plan lanes            # working tree, expect TOTAL LINES: 0
python3 $L/scan-ref.py . refs/lanes/plan-snapshot plan/docs-20260806
python3 $L/scan-reachable.py . plan/docs-20260806   # every reachable blob
```

`sweep.py --context` prints match context with every value replaced by `<<Cn>>`, so context can
be read without a value reaching the terminal.

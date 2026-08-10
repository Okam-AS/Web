# The twenty-one proofs that lived nowhere a stranger could read them

Consequence of a refusal, not its reversal. A prior pass declined to verify these because the artifact
was committed nowhere; this one makes them reachable and lets `plan verify` decide. No `--override`,
no `plan accept`.

## Counts

| | count |
|---|---:|
| **committed and ACCEPTED** | **20** |
| committed but still refused | 0 |
| unrecoverable | 0 |
| left untouched by standing prohibition | 1 |

Lane `verified` **322 → 342**. The +20 is exactly this pass.

## None were lost

The brief expected some of the four outside any repository to be gone — a scratch file in a temp
directory that no longer exists. **All four were still on disk**, in this session's scratchpad, and all
four were rescued. Nothing in the twenty-one was unrecoverable.

## Secrets check, which gated everything

Every file was scanned twice before any `git add`: once for generic shapes (private keys, JWTs, bearer
tokens, AWS/GitHub/Slack tokens, `secret=`/`password=` literals, connection strings) and once for this
estate's own known shapes (the Wolt secret, `AppSettings:Secret`, the JWT signing key, `MATCH_PASSWORD`).

Two files mentioned secret-adjacent terms and were read by hand:

- `L-SECRETS-READ-FROM-CONFIG` — names config KEYS and file locations, and states "nothing was rotated
  and no value was invented". No key/value literal.
- `L-A-LOGIN-TOKEN-EXPIRES-WITHIN-A-SESSION` — cites `747475`, which is **already tracked** at
  `appsettings.json:20` in the backend repo, so committing publishes nothing new.

Both were cleared on evidence, not on a pattern's silence.

## Where each artifact went

- **6 committed in place** — already inside this repo under `lanes/`, untracked. Not moved:
  they were already somewhere sensible.
- **14 copied into `docs/plan/lanes/<ID>/`** — they lived in ephemeral agent worktrees, sibling
  worktrees, or the session scratchpad, none of which a stranger can reach.
- **1 left untouched**: `L-THE-LIVE-WORLD-RUNS-THE-BRANCH`, whose artifact is in `web-livewalk` — under a
  standing prohibition. The file exists and is untracked, so it is recoverable by whoever may touch that
  worktree. It is **not** unrecoverable, and calling it so would be wrong.

## A side effect worth recording

Passing the committed repo-relative path to `plan verify` made the tool rewrite each lane's `evidence:`
line. Six lanes whose evidence was an absolute machine-local path now record a repo-relative one, so the
recorded evidence for all twenty is a path a stranger with the repo can open — which is the objective's
own bar, reached as a consequence rather than by editing the field.

# L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS — frontend landing receipt

Brief `e78ec33c`. The three frontend lanes that finished *after* the 2026-08-06 trunk landing,
merged onto `feature/restaurant-modules`.

## What landed

| merge commit | lane | lane tip merged |
|---|---|---|
| `993f185` | `lane/every-starter-resumes` | `894a3b9` |
| `cec420a` | `lane/wf-invite-pair-fe` | **`ff74b10`** |
| `6f74f87` | `lane/L-THE-DEMO-RUNS-ON-A-MACHINE-THAT-IS-NOT-THIS-ONE` | `ba2016f` |

Trunk before: `ff497c0`. Merge tip: **`6f74f874001f65fa9aa75efbdc114648f332be3c`** — every number below
was measured there. This record commits on top of it, so the branch tip is one commit further on and
differs from `6f74f874` by this file alone.

**The brief named `698383c` for `lane/wf-invite-pair-fe`; the branch was one commit further on at
`ff74b10`** ("Journey evidence for the invitation pair, captured at the landed tip") when this lane
re-checked, exactly as the brief instructed. `ff74b10` is what landed — dropping back to `698383c`
would have landed the panel without the journey evidence recorded against it.

## Conflicts

**Zero, and not by luck.** The three lanes' file sets are pairwise disjoint — checked before merging,
not discovered during:

```
for b in <the three lanes>; do git diff --name-only ff497c0..$b; done | sort | uniq -d   # empty
```

So `git merge-file` was never reached: there was no hunk for either side to win. The check is
recorded because "no conflicts appeared" and "no two lanes touched the same file" are different
claims, and only the second one is evidence.

### The fixture trap the brief named, re-checked rather than assumed

The last wave's invite-pair merge would have restored a stale `world.ROLES` stub over the trunk's
real role catalogue had it been resolved `--theirs`, and no test would have caught it because the
fixture *is* the test double. That trap cannot recur here — `lane/wf-invite-pair-fe` was **branched
from `ff497c0` itself** (`git reflog lane/wf-invite-pair-fe` → `branch: Created from ff497c0`), so it
already carried the real catalogue. Verified at the tip rather than inferred:

- `test/e2e/fixture/api-server.js`: **134 insertions, 2 deletions**; both deletions are the
  placeholders `invitations: {}` and `pendingByStaff: {}`, replaced by the real invitation state.
- `test/e2e/fixture/world.js`: **5 insertions, 3 deletions**, all inside one comment block.
- `const ROLES` at the tip still lists `role-bar`/Barista and `role-kitchen`/Kjøkken.

## Verification at the tip

One jest run at `6f74f874`, not one per merge:

```
Test Suites: 145 passed, 145 total
Tests:       3216 passed, 3216 total
```

`fe-jest-tip.raw.txt`. **Every test accounted for against the recorded baseline:**

| | suites | tests |
|---|---|---|
| baseline `ff497c0` | 144 | 3192 |
| `lane/every-starter-resumes` | +1 | +11 |
| `lane/wf-invite-pair-fe` | +0 | +13 |
| **at `6f74f874`** | **145** | **3216** |

3192 + 11 + 13 = 3216. Zero failures, zero unaccounted tests.

### The `core` submodule, and a first run that lied

The first jest run in this worktree reported **15 suites failed to run / 2915 passed**. That was the
harness, not the merge: `~/core` maps to `<rootDir>/core`, a submodule that a fresh `git worktree add`
leaves empty, so fifteen suites could not resolve their imports. Worth writing down because the run
still **exited 0** — jest reported suite-level failures while the process status said success, so a
lane trusting the exit code alone would have recorded a green tier over fifteen dead suites.

Populating it needed two non-obvious steps: `protocol.file.allow=always` (a plain
`git submodule update --init` fails with `transport 'file' not allowed`), and then a direct fetch,
because the shared module git-dir has the pinned commit checked out but no *ref* pointing at it
(`upload-pack: not our ref 9626a561`). Final state: `core` at `9626a561`, matching the trunk's gitlink.

`scripts/drift-demo/demo.sh` is covered by no tier at all — it is a `#!/bin/sh` script and jest never
sees it. Checked with `sh -n` and `bash -n` (both clean), which proves it parses and nothing more.

## Not landed, deliberately

- `preserve/german-identifier-labels` (`bfa1992`) — a preservation branch, confirmed **not** an
  ancestor of the trunk. It exists to stop a commit being garbage-collected; landing it is a separate
  decision nobody has made.

## Revert

```
git branch -f feature/restaurant-modules ff497c0
```

Nothing was pushed. Landing on the trunk was authorised; publishing was not.

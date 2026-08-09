# L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN — the arms made to red, and the tier re-measured

Reason-shape hit: **(1) missing write-up, in its hardest form — the artifact was never at the path the
evidence line named, and the worktree that held the arms was gone.** The census
(`docs/plan/artifacts/instrumentless-exits.md`, Batch 2):

> **evidence absent.** The evidence line is the bare directory
> `docs/plan/lanes/L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN`, and it does not exist. The RETURN
> closes with *"Worktree REMOVED and pruned"*, so the four pin arms it describes are not on disk to open.
> The exit also carries a second clause — *the frontend tier green at the tip* — whose tip is a branch that
> was never landed, and which this lane may not run.

Both halves are produced here. The branch survived the worktree: `lane/a-kill-certificate-requires-a-test`
is at `316f22ae`, so a fresh detached worktree was made at that commit and **both clauses were re-measured
today** rather than relayed.

## The evidence line as the original agent wrote it

```
evidence: docs/plan/lanes/L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN
```

That directory does not exist and never did. The artifacts the RETURN describes live at
`lanes/L-A-KILL-CERTIFICATE-REQUIRES-A-TEST/repro/` **on the branch** — note the shorter lane name, which is
most of why the citation missed. Copies are under `repro/` beside this file.

## Where these runs were made

A detached worktree at `316f22ae`, deliberately created with the basename **`Web-modules`**
(`…/scratchpad/killcert/Web-modules`) because `test/journey-artifact-store.test.js` asserts the process
holding the fixture port runs from a directory of that literal name and reds in any other worktree; and with
`core/` populated by copy, because a fresh worktree gets an empty submodule mount that fails three unrelated
suites. Both hazards were found and written down by a sibling lane (`L-WF-KODEOVERSIKT-UI`); avoiding them is
why the tier below is a real green and not a worktree artifact. `node_modules` is symlinked to the main
checkout. Nothing was pushed and no trunk moved.

## Clause 1 — the arms red against the implementations that carried the defect

The pin is built the way the defect requires: `test/mutation-runner-restore.test.js` reads the **shipped**
`test/support/mutate.js` as `CANONICAL` and installs it into a throwaway git world. So the mutation that
makes the arms red is a substitution of the runner itself — the historical file, fetched by
`git show <ref>:test/support/mutate.js` — and "the fix works" and "the old way was broken" are measured
against the same program.

| run | runner installed | lines | result |
| --- | --- | --- | --- |
| `killcert-baseline.json` | `316f22ae` — the tip, the shipped runner | 413 | **16 passed / 16** |
| `killcert-c65b19c.json` | `c65b19ce` — the runner the defect was reported on | 131 | **5 failed / 11 passed / 16** |
| `killcert-05c160a.json` | `05c160a9` — the partial fix that closed only the spawn case | 318 | **4 failed / 12 passed / 16** |
| `killcert-restored.json` | restored, `git hash-object` = `42ad2631…` = the committed blob | 413 | **16 passed / 16** |

**The four arms the exit is about, red against BOTH historical runners** (identical set at `05c160a9`; at
`c65b19ce` a fifth arm reds as well):

| arm | message |
| --- | --- |
| `refuses to certify anything from a command that exits 0 having run nothing` | `expect(received).not.toBe(expected)` / `Expected: not 0` — the runner exited 0 and certified |
| `refuses to certify anything from a command that exits 1 having run nothing` | `expect(received).not.toBe(expected)` / `Expected: not 0` |
| `puts the file back even when the suite command dies after the baseline` | `Expected substring: "INVAL"` / `Received string: "GREEN (0) flip the target string… 0/1 mutations reddened the suite / SURVIVED: flip the target string [STILL-GREEN]"` |
| `judges a suite that is not jest, from the counts it reports` | `Expected substring: "BASE"` / `Received string: "GREEN (0) …"` |

The fifth, red only at `c65b19ce`: `reports an anchor it cannot place instead of counting it as a pass`
(`TypeError: Cannot read properties of undefined`) — that runner writes no per-mutation results shape at all.

Read what the received strings say, because it is the whole finding: with a suite command that **executed no
test**, the historical runner printed `GREEN (0)` and `SURVIVED … [STILL-GREEN]` — a **certified survivor
from a run that never happened**. The `false` direction is the mirror image and manufactures certified kills.
`killcert-restored.json` is the restored state, and the restore is byte-verified against the committed blob
rather than assumed.

## The reproduction against the real historical files

`repro/reproduction.txt` (copied from the branch) is the three-way run, and it is the same finding measured
without jest at all:

```
--- c65b19c  with MUTATE_TEST_COMMAND=false  (exits 1, executes no test)
2/2 mutations reddened the suite
    results file written (a certificate exists)
--- c65b19c  with MUTATE_TEST_COMMAND=true   (exits 0, executes no test)
0/2 mutations reddened the suite
SURVIVED: first mutation [STILL-GREEN]; second mutation [STILL-GREEN]
    results file written (a certificate exists)
--- 05c160a  with MUTATE_TEST_COMMAND=false  (exits 1, executes no test)
2/2 mutations reddened the suite
    results file written (a certificate exists)
--- HEAD  with MUTATE_TEST_COMMAND=true      (exits 0, executes no test)
Error: UNUSABLE BASELINE … Refusing to run: every mutation would be judged against a run that proves nothi…
    source intact
    no results file (nothing certified)
```

`repro/reproduce.sh` re-runs it against any ref and **keeps no runner copy in the tree** — a copy is the
hazard the tree-wide sweep exists for — so it fetches the historical file on demand and deletes it again.

## Clause 2 — the frontend tier, green at the tip

Run today at `316f22ae` in the worktree described above, `TZ=Europe/Oslo npx jest --maxWorkers=4`, the repo's
own `jest.config.js` (coverage on, `test/e2e/` and `lanes/` excluded by that config for the reasons its
comment gives):

```
Test Suites: 172 passed, 172 total
Tests:       4138 passed, 4138 total
Snapshots:   0 total
```

`killcert-tier.json` reports `success: true`, `numFailedTests: 0`, `numFailedTestSuites: 0`, run
`2026-08-09T17:48:23` → `17:48:33`. Full console output in `tier-172-suites.log`. **172 / 4138 / 0 is
independently the number the lane's own RETURN recorded**, reproduced here rather than relayed — and it is
what makes the "green tier" a measurement instead of a claim. (The full JSON is 5.4 MB and is not committed;
its summary fields are quoted above and the log carries the same totals.)

## What this artifact does not claim

**Not landed.** `316f22ae` is not an ancestor of this repo's working branch, and the RETURN's landing order
still stands and still matters: `git diff c65b19c 40ab62d` over both files is **empty**, so `40ab62d` still
carries the 131-line runner. Landing `40ab62d` alone ships the defective runner; tranche two must take
`test/support/mutate.js` and `test/mutation-runner-restore.test.js` **wholesale from this tip** — a whole-file
resolution, not a merge.

**Not C5.** No operator walks a mutation runner. And the caveat the lane stated rather than hid holds: a
suite dialect that reports counts but no test names supports a **verdict**, not a per-test map, and the
runner now says so instead of printing a coverage ratio with nothing under it.

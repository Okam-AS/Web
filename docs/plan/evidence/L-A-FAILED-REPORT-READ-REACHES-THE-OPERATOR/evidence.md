# L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR — rescued, re-run, and the tier measured

Reason shape hit: **(1) the record existed and was unreachable**, plus **(5) the second half of a two-part
exit was prose.** `instrumentless-exits.md` Batch 2: *"the evidence line names
`docs/plan/lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR`, which does not exist … The real artifacts
are … on the **unmerged** branch `lane/a-failed-report-read-reaches-the-operator` (`6d43520`) … Nothing
openable today."* Both halves are now openable, and neither is taken on report — the mutation driver was
**re-run** and the tier was **re-measured** in a worktree at that tip.

## The evidence line as it stood before `plan verify` overwrote it

```
evidence: docs/plan/lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR
```

That path resolves nowhere and would be refused as a directory even if it did.

## Files beside this one, rescued from `6d43520`

| file | source path on the branch |
|---|---|
| `mutation-receipt.json` | `lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/mutation-receipt.json` |
| `mutate.py` | `lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/mutate.py` |
| `statistics-reads-surface-their-failure.test.js` | `test/statistics-reads-surface-their-failure.test.js` |

## How it was reproduced

Detached worktree of the plan/frontend repo at `6d43520` ("A failed report read reaches the operator on
all three pages that make one"). Two things the branch needs and a worktree does not get:

- **`core` is a gitlink**, empty in a fresh worktree. The tree's pin at `6d43520` is
  `a6ae24127b895e536cc600053f1cc25b1cc79f5f` — *"Every statistics read says why it failed, and which
  failure it was"* — the sibling lane's commit this one builds on. Materialised from a `core` worktree at
  that exact SHA. (`hasBackendMessage` lives in `core/services/request-service.ts` there; the trunk's
  `core` at `9626a561` does **not** carry it and is not a descendant of `a6ae241`, which is why the
  premise needed the pin rather than the tip.)
- `node_modules` symlinked from the main checkout: `package.json` is **byte-identical** between the
  repo HEAD and this branch (`git diff HEAD 6d43520 -- package.json` is empty), so the install is the
  same one.

## Half two — the frontend tier at the tip, which was the unshown clause

```
$ npx jest
Test Suites: 171 passed, 171 total
Tests:       4103 passed, 4103 total
Snapshots:   0 total
Ran all test suites.
```

Exit 0, zero `✕` in the output. This reproduces the RETURN's prose count (*"Full tier at the lane tip: 171
suites, 4103 tests, 0 failures"*) **as a run rather than as a claim**, and it is the clause
`instrumentless-exits.md` could not open.

## Half one — the red-on-removal set, re-derived rather than trusted

`python3 lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/mutate.py`, exit 0:

```
arms in scope                 : 23
arms red under >=1 mutation   : 23
arms no mutation could break  : 0
mutations applied             : 20
mutations that killed nothing : 0
inherited arms disturbed      : 9
all files verified byte-identical to the pre-run buffer
```

The regenerated receipt was compared field-by-field against the rescued `mutation-receipt.json`:
`killed_by`, `survivors`, `unused_mutations`, `inherited_disturbed` and `mutations` are all **IDENTICAL**.
The driver aborts on a mutation whose search string is not found, so *"20 applied"* is 20 real edits.

**The exit's four statistics reads, each with its own arm and each killed:**

| arm | killed by (excerpt) |
|---|---|
| a failure of the **general** slice alone still reaches the operator | *statistics: the failure goes back to the console only*; *the failure panel is removed from the template*; *a good read is reported as a failure*; *rule: the server's own reason is ignored* |
| a failure of the **self-pickup** slice alone still reaches the operator | same four |
| a failure of the **home-delivery** slice alone still reaches the operator | same four |
| a failure of the **table** slice alone still reaches the operator | same four |
| *(a fifth, beyond the exit)* a failure of the **heatmap** read alone still reaches the operator | same four |

`statistics: the failure goes back to the console only` — the mutation that restores `console.error` — is
the one the exit names, and it reds 13 arms including *"the reason the backend gave is on the screen, not
only in the console"* and *"the four failures do not read alike"*.

## Two things the record is careful about

**The lane is wider than its exit and the extra work is not credited here.** The RETURN says the four
reads have callers on **three** pages, and the receipt carries `wolt:` and `settlements:` mutations for
`wolt-drive-invoice.vue` and `settlements.vue` — where the old behaviour was worse than silent (a failed
read rendered as *"Ingen ordre i perioden"*, a positive claim about the venue's trade). Those arms are in
the same receipt. The exit asks only about the four statistics reads.

**`inherited_disturbed: 9`** is not noise: nine arms belonging to the sibling lane's own suite also red
under the shared-rule mutations, which is what one extracted rule in `utils/request-failure.js` looks like
from the outside — as the RETURN puts it, *"here it means genuinely shared — one implementation, not two
copies that agree"*.

## What this does not claim

The branch is **still unmerged**: `6d43520` is not an ancestor of the plan repo's HEAD, and `core`
`a6ae241` is not an ancestor of `core`'s tip. This record makes the lane's evidence openable and
reproducible; it does not land it. And it is not C5 — no operator has seen a failure panel on a real
statistics page.

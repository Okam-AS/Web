# L-TRAIN-EVIDENCE-NAMES-COURSE — both halves, in one place

**Exit:** *every completion row displays the course title and version, pinned by both a component test
and a wire test.*

**Reason shape hit: (5) half of a two-part exit.** `instrumentless-exits.md` (Batch 2) declined this lane
because the named artifact is backend-only — *"The **component test** half is cited only as the frontend
commit `cff41c8` … but no artifact records it running"*. This file produces the missing half: the
component suite run, three mutations that red it, and the restore.

**The `evidence:` line as it stood before `plan verify` overwrote it** (copied here because the tool keeps
only the single path it is passed):

```
OkamAPI wt-trn-names lane/trn-evidence-names fcb5181a + b560bc3a
(artifacts/tests/L-TRAIN-EVIDENCE-NAMES-COURSE/RUN.md, base.trx, after.trx) . Web-modules cff41c8 .
artifacts/journeys/training-course-to-evidence.playwright.json (19 steps, passed)
```

---

## Half 1 — the component test, measured here for the first time

Tree: `Web-modules` at **`cff41c85`** ("The completion ledger says what each row is evidence of"), checked
out detached into a worktree of my own so no sibling saw the mutation. `cff41c85` is an ancestor of
`feature/restaurant-modules`; the pinned component is
`components/admin/training/TrainingCompletionPanel.vue` and the suite is
`test/training-components.test.js`.

Command, identical in all five runs (`component-mutate.py` in this directory is the runner):

```
$ npx jest test/training-components.test.js --coverage=false --verbose
```

| run | result | which tests went red |
|---|---|---|
| `baseline.txt` | **70 passed / 70 total**, 1 suite passed | — |
| `M1-render-deleted.txt` | **8 failed / 62 passed / 70 total** | the three naming pins + five column-index readers |
| `M2-version-dropped-in-parse.txt` | **2 failed / 68 passed / 70 total** | exactly the two version pins |
| `M3-unresolvable-title-prints-empty.txt` | **1 failed / 69 passed / 70 total** | exactly the unresolvable-row pin |
| `restored.txt` | **70 passed / 70 total** | — |

**Every run executed 70 tests.** A mutation that reds nothing because nothing ran is the failure this
program keeps measuring; the constant total is what rules it out here. The runner asserts
`git diff --quiet` before the first run, that each mutation actually dirtied the tree, and that each
restore is byte-identical — the tree was clean again at exit.

### M1 — the render deleted (the state the lane found)

Mutation: remove the whole leading cell from `TrainingCompletionPanel.vue`.

```
-          <td data-test="completion-course">
-            {{ row.courseTitle || dash }}
-            <span v-if="row.versionNo !== null" class="trn-flag">v{{ row.versionNo }}</span>
-          </td>
```

Red, first assertion of the exit's own sentence:

```
● TrainingCompletionPanel — the ledger, and the grading it leaves to the server
  › EVERY row names the course and the version the attempt was stamped to

  expect(received).toHaveLength(expected)
  Expected length: 2
  Received length: 0
  Received object: {"selector": "[data-test=\"completion-course\"]"}
    353 |     expect(cells).toHaveLength(2)
  at Object.<anonymous> (test/training-components.test.js:353:19)
```

Eight tests red, not three, and the five extra are worth naming rather than hiding: deleting a column
shifts every later `td` index, so the score/verdict/source readers in the same table red as collateral.
That makes M1 a coarse instrument. **M2 and M3 are the fine ones**, and each reds only its own clause.

### M2 — the version dropped in the parse

Mutation, `utils/training/journey.js` (`completionRow`):
`versionNo: typeof c.versionNo === 'number' ? c.versionNo : null` → `versionNo: null`.

Exactly two tests red — the two that speak about the version, and no others:

```
● … › EVERY row names the course and the version the attempt was stamped to
  expect(received).toContain(expected) // indexOf
  Expected substring: "v1"
  Received string:    "Ansvarlig alkoholservering"
  at Object.<anonymous> (test/training-components.test.js:356:32)

● … › the version shown is the one on the ROW, never the one the form happens to offer
```

The title survives and the version does not, which is what separates the exit's two nouns.

### M3 — an unresolvable row prints empty instead of a dash

Mutation, `TrainingCompletionPanel.vue`: `{{ row.courseTitle || dash }}` → `{{ row.courseTitle }}`.
One test red:

```
● … › a row the server could not name prints a dash and no version flag, rather than disappearing
  expect(received).toBe(expected) // Object.is equality
  Expected: "—"
  Received: ""
  at Object.<anonymous> (test/training-components.test.js:378:68)
```

The pin the panel needs because the ledger holds its course reference **by value**: unresolvable is a
state, not an error, and the row is still evidence.

**What the component half does not show.** These are jsdom mounts, not a browser and not an operator.
`training-course-to-evidence.playwright.json` (19 steps) is a browser journey and is cited in the lane's
own evidence line; C5 acceptance is a separate fact from either.

---

## Half 2 — the wire test, rescued off the worktree

`wire-half-RUN.md` in this directory is a byte copy of
`/Users/svendaneel/okam/wt-trn-names/artifacts/tests/L-TRAIN-EVIDENCE-NAMES-COURSE/RUN.md`, which lives
in an unpushed worktree on `lane/trn-evidence-names @ fcb5181a` (base `3579bbbc`; **not** an ancestor of
backend trunk `6d5328004`). It records:

- base `3579bbbc` **232 run / 232 passed / 0 failed**, after `fcb5181a` **241 / 241 / 0**, filter
  `Database!=SqlServer & (FullyQualifiedName~WebApi.Tests.Training | FullyQualifiedName~TrainingWireTests)`,
  no SQL container started;
- the wire pin by name —
  `TrainingWireTests.A_completion_read_over_the_wire_names_its_course_and_the_version_actually_completed`;
- four mutations against the after-state, each restored: `MapCompletion` projecting
  `CourseTitle = null, VersionNo = null` reds 6 (5 service pins + the wire pin); an INNER version join
  reds 1 (the unresolvable row is dropped from its own list); `VersionNo` resolved as the course's
  newest version reds 5 service pins and the wire pin with `Expected: 1, Actual: 2`.

`base.trx` and `after.trx` (335 KB / 343 KB) were **not** copied — they are machine output for the same
two numbers the RUN.md states, and C5 refuses a `.trx` as the reason anything is finished. They remain at
the worktree path above until it is pruned.

**The landing caveat, stated rather than buried:** the wire half is on an unlanded local branch. The
component half is on `feature/restaurant-modules`. Nothing here says the backend projection has reached
`6d5328004`; it has not.

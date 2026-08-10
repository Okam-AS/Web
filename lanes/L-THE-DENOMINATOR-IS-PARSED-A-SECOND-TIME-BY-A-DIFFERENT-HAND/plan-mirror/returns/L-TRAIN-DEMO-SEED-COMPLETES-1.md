```
RETURN: L-TRAIN-DEMO-SEED-COMPLETES
brief: 0b3dace1
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-TRAIN-DEMO-SEED-COMPLETES/walk-training-1-courses.png
log:
The seed runs to the end against the live world on :5971, exit 0. Steps 5, 6 and 9 -- assignments, completions, holdings -- executed for the first time.
Four consecutive runs converge: 6 courses, 3 assignments, 4 completions, 7 certificates, identical counts after runs 1, 3 and 4.
No second pile. Titles carried the run's clock, so each run minted a fresh cohort; they are stable now and every row is looked up before it is written.
Two of the three courses were ADOPTED from what this world already carried, including the one the aborted earlier run left behind. Only the draft-only course was created.
FOUND AND FIXED, a false alarm the seed would raise on any second run: step 8 declared the certificate compare-and-swap unarmed when it is armed.
EF issues no UPDATE for a PATCH writing a column the value it already holds, so the rowversion never advanced and the replayed token was still current -- 200, not 409.
The correction restores the uncorrected issuer first when it must, and asserts the revision moved before drawing a conclusion from the replay. Both branches walked green.
The hard-coded scores were a second unchecked assertion: 92 / 55 / 88 are a pass, a fail and a passing retake against a threshold of 80 and against nothing else.
This world's frozen version is not the one the script publishes, so scores derive from that version's own threshold and refuse to run when a fail and a pass cannot both be said.
C5 walked in Chromium as the manager: /admin/training-courses renders with the gate open, zero console errors, zero failed requests.
On screen: 6 courses, 3 assignments (Nora Berg's overdue), 4 completions incl. Jonas Lie's 55-then-88 retake as two rows, certificates reading Gyldig, Utlopt and Utloper snart.
DEFECT, not seeding: the completions Kurs column is empty on every row. TrainingCompletionPanel.vue:32 reads row.courseTitle; TrainingCompletionModel carries no CourseTitle.
SECOND FINDING: with no course selected, "Ny tildeling" says no published version exists to assign while five do. assignable/recordable derive from the selection alone (page 328-329).
Committed e82472983 on lane/train-demo-seed-completes, not pushed. Worktree wt-traindemoseedcompletes created and removed; no other worktree touched.
No container touched, no port bound, no server restarted, no migration authored. The walk reads its code from the environment and carries no credential of its own.
END RETURN
```

## Detail

### What was already there, and what this run added

The world was surveyed before a byte was written. Store 1 held **5 courses** (all carrying a
published version after the browser walk at 21:30), **1 assignment**, **0 completions** and **4
certificates**. The four certificates already spanned Valid, Expiring and Expired.

After the seed: **6 courses, 3 assignments, 4 completions, 7 certificates** — and those numbers do
not move on any subsequent run.

| | adopted | created |
|---|---|---|
| Courses | `Alkoholservering og skjenkeregler (193639)` (the aborted run's leftover), `Næringsmiddelhygiene og temperaturkontroll` | `Brannvern og romningsveier` — the draft-only course step 5's refusal needs |
| Versions | the frozen v1 of each adopted course | a v3 draft successor on the hygiene course; a v1 draft on the fire-safety one |
| Assignments | the role-scoped Barista row the browser walk created | two person-scoped rows, one deliberately overdue |
| Completions | — | four (a pass, a fail, a retake as a second row, a hygiene pass) |
| Certificates | Astrid Vik's `fagbrev-kokk`, valid with no expiry | Expiring, Expired and Valid, one each |

### Why adoption rather than a fresh cohort

The script stamped every course title with `date +%H%M%S`. That is a reasonable design for a
throwaway harness and the wrong one for a place a manager opens: a second run puts a second
`Alkoholservering og skjenkeregler (HHMMSS)` beside the first, and the screen a venue reads then
shows the module apparently duplicating its own data. It also mattered to this lane directly —
four runs were needed to prove convergence and exercise both branches of step 8, and without
adoption that would have left four cohorts behind.

Everything is written through the product's own endpoints. Nothing was inserted.

### The step-8 false alarm

Run 2 failed with `a stale revision was accepted. The compare-and-swap is not armed.` It is not a
product defect. The certificate had already been corrected by run 1, so the PATCH wrote `issuer`
the value it already held, EF issued no UPDATE, and the returned revision was byte-identical to the
one submitted (`AAAAAAAAQKQ=` both times). The token the next probe called *superseded* was
therefore still the current one, and the server was right to accept it.

Left alone this would have been reported, eventually and by somebody else, as Training's optimistic
concurrency being broken. The correction now puts the uncorrected issuer back first when the
corrected one is already stored, and refuses to draw any conclusion from the replay unless the
revision actually moved. Run 3 exercised the plain branch, run 4 the restore-first branch; both
answered 409 on the replay.

### The derived scores

`92 / 55 / 88` express a pass, a fail and a passing retake **against a threshold of 80**. This world
publishes its own versions, and the hygiene course the seed adopted carries a threshold of 80 rather
than the 70 the script sets — under which the literal `75` for the hygiene pass would have been a
fail and the step would have died claiming the server graded wrongly. The scores are now
`threshold+12`, `threshold-25`, `threshold+8` and `threshold+5`, which reduce to exactly the old
literals at 80, and the step refuses to run at all when a fail and a pass cannot both be expressed
against the threshold it found.

### Two findings for the plan, neither of them this lane's to fix

1. **The completions ledger cannot name the course.** `TrainingCompletionPanel.vue:32` renders
   `row.courseTitle || dash`; `Models/Training/TrainingCompletionModels.cs` gives
   `TrainingCompletionModel` a `CourseId` and a `CourseVersionId` and **no `CourseTitle`** — unlike
   `TrainingAssignmentModel`, which has one and renders it. Every completion row on every world
   shows `—` in the Kurs column. Reachable, visible, and on the module's evidence surface.

2. **A form asserts a fact about the store from a fact about the selection.** With no course
   selected, *Ny tildeling* reads *«Ingen publisert versjon å tildele. Publiser en versjon først»*
   and *Før en gjennomføring* reads *«Ingen låst versjon å føre mot»* — while store 1 has five
   courses carrying published versions. `pages/admin/training-courses.vue:328-329` derive
   `assignable`/`recordable` from the selected course alone. The honest string is *select a course*,
   not *publish a version*.

### Constraints

* **C1** — no UPDATE or DELETE against any append-only table; no SQL written at all. Completions were
  matched and skipped, never repaired.
* **C2** — no migration authored.
* **C4** — nothing on a money path; every Training write carries the manager's own bearer as actor.
* **C5** — met by a person's screen, not a suite: `walk-training-1-courses.png` plus the rendered text
  in `walk-training.txt`, zero console errors and zero failed requests.
* **C7** — the walk takes `MANAGER_CODE` from the environment; the lane directory greps clean for
  bearer tokens, JWTs and the verification code.

### Artifacts

All under `/Users/svendaneel/okam/Web-modules/lanes/L-TRAIN-DEMO-SEED-COMPLETES/`:

```
run-1.log  run-3.log  run-4.log     three green runs (exit 0)
run-2.log                           the step-8 false alarm, kept as the receipt for the fix
seed.diff                           2cc5487c3..e82472983
walk-training.js                    the browser walk, credential-free
walk-training.txt                   what the screen said
walk-training-1-courses.png         the Training admin surface after the seed
walk-training-2-draft-only.png      the draft-only course selected: v1 Utkast, 60, with Publiser
```

Worktree `/Users/svendaneel/okam/wt-traindemoseedcompletes` was created off `2cc5487c3` and
**removed**. The branch `lane/train-demo-seed-completes` survives at `e82472983`, unpushed. The
owner's checkout, `okam-lwtwo-sql`, `okam-lwtwo-redis`, :5971 and :3971 were not touched.

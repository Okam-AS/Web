```
RETURN: L-TRAIN-EVIDENCE-NAMES-COURSE
brief: b1f301bb
verdict: built
evidence: OkamAPI wt-trn-names lane/trn-evidence-names fcb5181a + b560bc3a (artifacts/tests/L-TRAIN-EVIDENCE-NAMES-COURSE/RUN.md, base.trx, after.trx) . Web-modules cff41c8 . artifacts/journeys/training-course-to-evidence.playwright.json (19 steps, passed)
log:
Brief verified first: completionRow parsed courseId/courseVersionId and rendered neither, and TrainingAssignmentModel already carried CourseTitle+VersionNo. Both true as written; the finding was not understated.
NO MIGRATION, and none is needed. The wire carries both as a read-side projection in ListCompletionsAsync, the shape the assignment list already uses. That is the cheap answer and it HOLDS.
It holds for different reasons per field, and the code says which. VersionNo is read off a row the immutability trigger and GuardCourseVersionImmutable forbid changing or deleting once it leaves Draft - a snapshot read, not a live opinion. CourseTitle is read off the MUTABLE course envelope and is honest only because no route can rename or delete one, which is what the 2026-08-01 review named as the reason durability holds at all.
That absence is now a control: TrainingCourseNoEnvelopeMutationTests reflects over TrainingController and fails on any non-GET/POST on courses/{courseId}, with its own remarks saying the fix is then a write-time snapshot. A third fact pins the pattern actually matches the routes, so deleting them cannot make it green.
A snapshot column would have been WRONG here, not just blocked: C1 forbids backfilling an append-only table, so a column names only rows filed after it and the exit criterion says EVERY row. Stated for the record, not as an excuse to skip the chain.
The joins are OUTER, unlike the assignment list's INNER. The ledger holds both references by value with no FK; an inner join answers a missing partner by deleting the completion from its own response, and evidence that vanishes is worse than evidence that names no course.
BASE MEASURED, not inherited: 232 run / 232 passed at 3579bbbc in a clean detached worktree (removed after). After: 241/241, +9. Trait filter Database!=SqlServer; NO container was started and none touched.
Frontend: training-scoped base 187 -> 192; full jest 107 suites / 2417 tests / 0 failed.
The browser journey PASSED (19 steps) - and went RED on this exact step while the column was missing, which happened for real: I clobbered the panel with a git checkout during mutation work and the journey caught it before I did.
Mutations, each restored and re-measured green. Backend: null the two projected fields -> 6 red; inner join -> the unresolvable row is DROPPED (1 red); resolve the course's NEWEST version instead of the stamped one -> 5 service pins red and the wire pin red with Expected 1 / Actual 2; add a PATCH courses/{courseId} -> the envelope pin red.
Frontend: drop courseTitle from completionRow -> 2 red; remove the column -> 9 red.
The one mutation that matters is the third: a test where the course never moves cannot tell a snapshot from a live join, so every pin changes the world AFTER filing - a later version published, the completed version retired, the version row absent.
Translation trap not inherited: the harness $i falls back to the key. trn_col_course already existed in no/en/de (the assignment table uses it) and is now asserted defined and non-empty in all three rather than merely used.
LEFT FOR L-TRAIN-DISPLAY-SNAPSHOT: TrainingEvidenceService is untouched on purpose - its CourseCatalog.Titles is now a second source of the same field and could be deleted in favour of completion.CourseTitle, but that file is their file this week. Shared files I did touch: TrainingWorld (one const), WireHostFixture (one const), TrainingWireTests (one test + one helper).
IF THEY NEED A COLUMN ON TrainingCompletions, IT IS THEIRS AND IT IS ONE MIGRATION - I need none, so there is nothing here to merge with. Still open and not mine: the evidence pack has zero frontend callers, so the fuller document still cannot be opened.
END RETURN
```

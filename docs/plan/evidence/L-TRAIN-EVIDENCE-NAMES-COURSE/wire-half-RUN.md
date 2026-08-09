# L-TRAIN-EVIDENCE-NAMES-COURSE — targeted tier

Filter: `Database!=SqlServer & (FullyQualifiedName~WebApi.Tests.Training | FullyQualifiedName~TrainingWireTests)`

No SQL container was started and none was touched: the lane was granted no slot, and the trait filter
is the trait-based one rather than `FullyQualifiedName!~SqlServer`, which still starts Testcontainers.

| run | commit | result |
|---|---|---|
| `base.trx` | `3579bbbc` in a CLEAN detached worktree (`wt-trn-names-base`, removed after) | 232 run / 232 passed / 0 failed |
| `after.trx` | `fcb5181a` (this lane) | 241 run / 241 passed / 0 failed |

+9 = 5 `TrainingCompletionNamesCourseTests` + 3 `TrainingCourseNoEnvelopeMutationTests` + 1
`TrainingWireTests.A_completion_read_over_the_wire_names_its_course_and_the_version_actually_completed`.

The base was MEASURED, not inherited: the branch tip carries a recorded fast tier at a different SHA
and a different filter, and neither would have said what these 232 do.

## Mutations run against the after-state, each restored and re-measured green

| mutation | reds |
|---|---|
| `MapCompletion` projects `CourseTitle = null, VersionNo = null` | 6 (all 5 service pins + the wire pin) |
| the version join made INNER (`from version in versions`, no `DefaultIfEmpty`) | 1 — the unresolvable row is DROPPED from its own list |
| `VersionNo` resolved as the course's newest version instead of the stamped one | 5 service pins, and the wire pin with `Expected: 1, Actual: 2` — the exact "prints a later revision" failure |
| a `[HttpPatch("courses/{courseId:guid}")]` rename action added to `TrainingController` | 1 — `No_training_route_can_rename_or_delete_a_course_envelope` |

The third is the one that matters: it is the only mutation a world where the course never moves
cannot tell apart from the fix.

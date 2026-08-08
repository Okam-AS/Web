```
RETURN: L-THE-TRAINING-SCREEN-STOPS-CONTRADICTING-THE-DATA-BEHIND-IT
brief: 07840543
verdict: blocked
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-THE-TRAINING-SCREEN-STOPS-CONTRADICTING-THE-DATA-BEHIND-IT/walk-projected-completions.png
needs: +D-LIVE-WORLD-REBUILD-TRAINING-PAIR
log:
Both defects reproduced on the live screen first: four completion rows whose Kurs column is a dash, and «Ingen publisert versjon å tildele» against six published versions over five courses.
WHICH SIDE IS WRONG, by evidence: the client already reads row.courseTitle/versionNo, the e2e fixture already SERVES both, the sibling model carries them. The wire model is the omission.
Deriving the title client-side stays refused for the reason the panel already documents: what the catalogue is called today is not what the person was tested against.
Backend: TrainingCompletionModel gains courseTitle + versionNo, resolved on the READ from the row's own courseId and its exact version, in two grouped lookups and deliberately not a join.
The resolution is OUTER by construction: the ledger holds both by value with no FK, so a join would drop an inspector's evidence row. A miss is an unnamed row, never an absent one.
Backend, other half: the course LIST carries each course's versions (id, number, state, threshold, no content); versionCount and hasPublishedVersion derive from those same rows.
Frontend: assignable/recordable flatten the STORE's course list instead of the expanded course. Selecting a course no longer narrows them, and every option names the course that owns it.
An empty picker now separates two sentences it conflated: "publish one first" only when the list ANSWERED and held none; a refused or unarrived list says unknown (new key trn_store_versions_unknown).
The e2e fixture carries the same version summaries, so a journey walked against it is not proving a document the server does not send.
Backend 320/320 Training tests. The three new ones were mutation-checked: names nulled, rows dropped, versions emptied - each went red, then green on restore.
Frontend jest 2927 pass / 0 fail against a 2915/0 baseline measured by stashing on the same tree; the 15 suites that cannot run are the absent core/ and are the same 15 before and after.
BROWSER PROOF, defect one: on :3971 as the manager, with the completions document rewritten in-browser by the service's own rule, all four rows name their course and version. Zero client changes.
That establishes the client half was already right and the server half is the whole fix. It does NOT establish that :5971 serves it, and nothing available to this lane could.
BLOCKED on the browser proof the exit asks for: :5971 runs a binary built at 118f92fb9 in wt-lwtwo-api and :3971 serves web-livewalk, and neither is mine to rebuild, restart or write into.
Branches, backend first: OkamAPI lane/...-be 3478c8b40, then Web lane/... 89f4b73. Worktrees api-trainscreen and wt-trainscreen created and removed. No push, no container, no server restarted.
END RETURN
```

## Detail

### What the live screen said before anything was written

`walk-before.js` signs in as the manager and reads the surface. It changes nothing.

```
completion rows on screen: 4
their Kurs column reads: ["—","—","—","—"]
nothing selected -> «Ny tildeling» says: "Ingen publisert versjon å tildele. Publiser en versjon først …"
nothing selected -> «Før en gjennomføring» says: "Ingen låst versjon å føre mot. …"
nothing selected -> an assign version picker exists: false
GET /courses returned 6 courses; 5 carry a published version
GET /courses course keys: [courseId,title,category,competencyKey,isActive,versionCount,hasPublishedVersion,createdAtUtc]
  -> the list carries per-course versions: false
GET /completions row keys: [completionId,personRef,courseId,courseVersionId,scorePercent,passed,versionContentHash,source,completedAtUtc]
  -> the row carries courseTitle: false
  -> the row carries versionNo: false
```

Zero console errors, zero failed requests. Both defects are on the wire of the binary holding the
port, which is why neither is fixable from the client alone and why this lane is cross-repo.

### Which side was wrong

The brief asked this to be checked rather than assumed. Three independent pieces of evidence all
point the same way, and none of them is a preference:

1. **The served client already reads the field.** `TrainingCompletionPanel.vue:32` renders
   `row.courseTitle`, and `completionRow` in `utils/training/journey.js` already projects both
   `courseTitle` and `versionNo` off the wire.
2. **The e2e fixture already serves it, and says why.** `test/e2e/fixture/training.js` has a `named()`
   helper whose comment reads *"`TrainingCompletionService.ListCompletionsAsync` resolves the title
   and the version number on the READ … The server's join is OUTER for the same reason this returns
   nulls instead of dropping the row."* The fixture is a claim about a backend that was never built.
3. **The sibling carries it.** `TrainingAssignmentModel` has `CourseTitle` and `VersionNo`, resolved
   in `TrainingAssignmentService.ListAssignmentsAsync` by joining version and course.

No branch in `OkamAPI-modules` has ever had `CourseTitle` on `TrainingCompletionModel` — every head
was checked. The client and the fixture were written to a contract whose backend half never landed.

Deriving the title client-side was rejected, and the panel's own docblock states the reason better
than a new comment could: the page holds one expanded course, so naming rows from it would name most
of them wrong, and resolving from the course list prints *what the catalogue holds today* rather than
what the person was tested against.

### The two backend changes

`TrainingCompletionModel` gains `CourseTitle` (string, nullable) and `VersionNo` (`int?`).
`ListCompletionsAsync` resolves them in two grouped reads keyed by the distinct course and version
ids of the page it just fetched, and `RecordCompletionAsync` resolves the title for the row it
returns so a freshly filed completion is not blank until the next read.

**The resolution is not a join, and that is the load-bearing decision.** `TrainingCompletion` stores
`CourseId` and `CourseVersionId` BY VALUE with no foreign key — deliberately, so the append-only
ledger never participates in a cascade. An inner join therefore *can* drop rows, and the rows it
would drop are an inspector's evidence. Dictionary lookups cannot drop a row by construction; a miss
surfaces as `null` and the client prints a dash, which it already knows how to do. The title is
resolved from the completion's **own** `CourseId` rather than through the version, so a row still
names its course when the version is the unresolvable one.

`TrainingCourseSummary` gains `Versions` — a new `TrainingCourseVersionSummary` carrying
`courseVersionId`, `versionNo`, `state`, `passThresholdPercent` and **no content**. The list read
already touched every version row to compute `versionCount` and `hasPublishedVersion`; those two are
now derived from the same projection rather than from a separate aggregate, so they cannot disagree
with the list they summarise. No migration, no schema change, no `OnModelCreating` edit (C2).

### The frontend change

`assignable` and `recordable` on `pages/admin/training-courses.vue` derived from `detailView` — the
expanded course. Neither write is course-scoped: `POST /assignments` and `POST /completions` take a
`courseVersionId` and nothing else, so scoping their pickers to the last thing clicked was never a
rule the server had. They now derive from `storeVersions(coursesListing)`, and selecting a course
does not narrow them.

`versionLabel` prefixes the course title **when the entry carries one**, so the store-wide picker
reads `Allergener og merking · v1 · Published` while a single-course picker built from a detail
document is unchanged.

The empty-picker note was one string doing two jobs. *«Publiser en versjon først»* is an instruction,
and it is wrong for a course list that did not answer — the operator may have published five already
and be looking at a refused read. `versionsAreUnknown` splits them and the panels render
`trn_store_versions_unknown` (added in `no`/`en`/`de`) for the unread case. The name is deliberately
not `trn_versions_unknown`, which already exists and belongs to `TrainingVersionPanel`'s
single-course question.

The e2e fixture's `courseRow` now carries the same version summaries, newest number first, so a
journey walked against it is not proving a document the server does not send.

### Proof

**Backend.** 320/320 Training tests (SQLite tier). Three tests are new:
`Every_completion_names_the_course_and_version_it_was_stamped_to`,
`A_completion_whose_course_does_not_resolve_is_listed_unnamed_rather_than_dropped` (seeds an orphan
completion by INSERT — permitted by the append-only guards — and asserts it is listed with nulls
while its neighbours keep their names), and
`The_course_list_carries_each_courses_versions_so_a_store_wide_picker_needs_no_second_read`.

All three were mutation-checked against a mutant that nulled the names, dropped unresolvable rows and
emptied `Versions`: 3 failed, 16 passed. Restored with `cp` + `touch` (the stale-mtime trap in
`CLAUDE.md`) and re-run to 320/320.

**Frontend.** `2927 passed / 0 failed` over 145 suites. The baseline on the same tree, measured by
stashing the change and re-running, is `2915 passed / 0 failed` with the identical 15 suites failing
to *run* — all of them `Could not locate module ~/core/…`, an absent `core/` checkout, in files this
lane never touched. Twelve new tests, no regression. ESLint clean on all five changed files.

**Browser, defect one, against the live world.** `walk-projected.js` opens `:3971` as the manager,
drives the page's own course control so every version number comes from the server, then intercepts
the completions response and applies the service's own projection on the way back to the page:

```
courses opened: 6; titles known: 6; versions known: 8
completion rows: 4
their Kurs column now reads: ["Næringsmiddelhygiene og temperaturkontroll v1",
                              "Alkoholservering og skjenkeregler (193639) v1", …]
rows still unnamed: 0
```

`walk-projected-completions.png` is that screen. It proves exactly one thing and it is the thing in
dispute: **the served client needed no change at all**, so the empty column is the server's omission.
It does **not** prove `:5971` serves the field — only a rebuilt binary can be that, and the screenshot
still shows *«Ingen publisert versjon å tildele»* underneath, because the served frontend is the old
one.

**Panels, defect two, on this world's own rows.** `panels-after.receipt.js` mounts the two real
components with the course list the fixed API will serve for store 1, and writes `panels-after.txt`:

```
NY TILDELING, with no course selected
  denies a published version exists : false
  offers a version picker            : true
    Alkoholservering og skjenkeregler (193639) · v1 · Published
    HMS og brannvern · v1 · Published
    Kassaopplæring – oppgjør og retur · v1 · Published
    Allergener og merking · v1 · Published
    Næringsmiddelhygiene og temperaturkontroll · v2 · Published
    Næringsmiddelhygiene og temperaturkontroll · v1 · Published
```

This is the real template and the real helpers on the live world's rows. It is not a browser against
`:3971`, and it is not offered as one.

### Why this is blocked rather than built

The exit asks for both shown in a browser against the live world. Neither half can be:

* `:5971` is `./bin/Debug/net8.0/WebApi` started detached from `/Users/svendaneel/okam/wt-lwtwo-api`
  at frontend-trunk-mate `118f92fb9`. Not `dotnet watch` — the backend half needs a rebuild and a
  restart, which the brief forbids.
* `:3971` is a Nuxt dev server serving `/Users/svendaneel/okam/web-livewalk` (detached at `6f74f87`).
  Its Training surface is byte-identical to the trunk's, so HMR would show the frontend half — but
  that tree is the shared world's, not this lane's, and the brief confines writes to my own worktree.
  Starting a second web server is also forbidden.

**To close it:** rebuild `:5971` from a trunk carrying `3478c8b40`, and point `:3971` at a tree
carrying `89f4b73`. Backend first or both together; the frontend half reads `versions` off the course
list, so frontend-first would show an empty picker where it used to show a wrong sentence.

### Constraints

* **C1** — no UPDATE or DELETE against any append-only table, and no SQL written. The one test that
  adds a completion row does so by INSERT, which the guards and triggers permit.
* **C2** — no migration authored; both changes are read projections over the existing schema.
* **C3** — no new service, route, page or flag; both changes ride routes that are already bound.
* **C4** — nothing on a money path.
* **C5** — met as far as the constraints allow, and its shortfall is the verdict rather than a
  footnote: a person's screen, not a suite, is what found both defects and what is missing for the
  fixed halves.
* **C6** — no statutory claim added or moved.
* **C7** — the walks take `MANAGER_CODE` from the environment and carry no credential; the lane
  directory greps clean for bearers, JWTs and the code itself. No logging call was added anywhere.

### Artifacts

All under `/Users/svendaneel/okam/Web-modules/lanes/L-THE-TRAINING-SCREEN-STOPS-CONTRADICTING-THE-DATA-BEHIND-IT/`:

```
walk-before.js / .log / .txt              the live surface before anything, and what it said
walk-before-wire.json                     the two documents :5971 actually served
walk-before-training.png                  the screen with an empty Kurs column
walk-projected.js / .log / .txt           the same screen shown the repaired completions document
walk-projected-completions.png            all four rows naming their course, live, in a browser
walk-projected-versions.json              the store's titles and versions, read through the app
panels-after.receipt.js / panels-after.txt  the two forms rendered on those rows with nothing selected
```

Branches, neither pushed:

* `OkamAPI-modules` `lane/the-training-screen-stops-contradicting-the-data-behind-it-be` @ `3478c8b40`, off `118f92fb9`
* `Web` `lane/the-training-screen-stops-contradicting-the-data-behind-it` @ `89f4b73`, off `feature/restaurant-modules` `42a44de`

Worktrees `/Users/svendaneel/okam/api-trainscreen` and `/Users/svendaneel/okam/wt-trainscreen` were
created and **removed**. The owner's checkout, `web-livewalk`, `wt-lwtwo-api`, `okam-lwtwo-sql`,
`okam-lwtwo-redis`, `:3971` and `:5971` were not written to, restarted or killed.

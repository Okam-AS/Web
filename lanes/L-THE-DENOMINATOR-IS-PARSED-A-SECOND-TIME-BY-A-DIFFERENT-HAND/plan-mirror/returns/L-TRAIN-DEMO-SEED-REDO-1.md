```
RETURN: L-TRAIN-DEMO-SEED-REDO
brief: a36a564d
verdict: blocked
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-TRAIN-DEMO-SEED-REDO/publish-334-probe.txt
needs: +L-EF-DECLARES-EVERY-TRIGGER
log:
RE-DERIVED BEFORE FIXING. The recorded withheld-catalog symptom is real and still present, but it is not what stops the seed: two earlier failures kill it first.
FAILURE 1, step 3, which the dead lane never saw. The seed named Nora Berg, Jonas Lie and Selma Haug. This roster is Astrid Vik, Ingrid Moen, Jonas Lie, Nora Berg, Sander Holm -- no Selma.
One missing name sent all three ids through the SQL fallback, which docker-execs okam-harness-sql-1: stopped, and not this world's container. The run ended having written nothing.
FIXED: the seed now casts PARTS from the roster the API returns, names only preferred. The SQL branch fills only what is empty and never overwrites an id HTTP supplied. Role scope likewise.
Verified on :5971 -- step 3 resolves Nora Berg / Jonas Lie / Astrid Vik, picks role Barista (no Kokk here), and the run reaches step 4.
FAILURE 2 IS THE BLOCKER, and it is a product defect, not a seed defect: POST /training/stores/1/courses/{id}/versions/1/publish answers HTTP 500.
SQL Server 334 -- target table TrainingCourseVersions of the DML statement cannot have any enabled triggers if the statement contains an OUTPUT clause without INTO clause.
Deterministic, measured twice and probed independently. No course in store 1 carries a published version: 0 of 5, which is also why the earlier seeding pass left assignments and completions empty.
This is L-EF-DECLARES-EVERY-TRIGGER's LIVE 2 (TrainingCourseVersions publish). Its patch was REFUSED at the tip by L-BACKEND-PATCHES-ARE-APPLIED: base 9 migrations ahead, 32 triggers against 25.
Nor can I reach it: :5971 is a compiled binary from wt-lwtwo-api at 8e2b57de8, which declares no trigger, and rebuilding or restarting the owner's API is not mine to do.
Publish gates everything downstream -- assignments take only Published versions -- so steps 5, 6 and 9 cannot run. Skipping publish would seed a screen that lies about what it built.
Step 11 IS fixed and proven non-vacuous against :5971 while writing nothing: five lever probes answer 400 Unknown feature flag, and four negative controls all go red. prove-step11.sh exits 0.
DEFECT IN THE INHERITED FIX, found by running it: jq // yields its right side for false as well as null, so .featureFlags[k] // "<absent>" read a false flag as absent. It could never pass. Uses has().
C5's browser half is unavailable too: :3971 has no listener and no web dev server runs anywhere; the brief forbids starting one.
Committed 2cc5487c3 on lane/train-demo-seed-redo (worktree wt-traindemoseedredo), not pushed. Bearer tokens redacted from every artifact. No container touched, no port bound, no migration authored.
END RETURN
```

## Detail

### What was re-derived, and what it changed

The lane was retracted because its agent died, and its recorded symptom was that the seed dies on
the withheld catalog. Both halves of that survived the two days of merges:

* The catalog still withholds the five inert Training keys. `GET /feature-flags/catalog` carries
  eighteen flags, of which exactly two are Training's (`training.setup`, `training.assignments`).
  `PUT /stores/1/feature-flags` with `training.onboarding` answers `400 {"message":"Unknown feature
  flag: training.onboarding"}`. The tip's `demo_flag` helper dies unless the response reports
  `effective: true`, so seed line 367 was a guaranteed death.
* "All eighteen flags effective" means all eighteen *catalog* flags are on for store 1. It does not
  mean the five withheld Training keys became leviers. They are not in the catalog at all.

What the dead lane could not have seen is that step 11 is not where the seed dies on this world. Two
failures precede it.

### Failure 1 — the cast (fixed)

`seed-training-demo.sh` named three people. `seed-workforce-demo.sh` creates exactly those three, and
this world was not built by it: its roster is Astrid Vik, Ingrid Moen, Jonas Lie, Nora Berg, Sander
Holm, and its roles are Barista, Kjøkken, Vaktleder rather than Kokk and Servitør.

The failure mode was worse than a missing name. The guard was

```sh
if [ -z "$NORA" ] || [ -z "$JONAS" ] || [ -z "$SELMA" ]; then
```

so one absent person discarded the two ids the roster read had *already* returned and sent all three
through `person_sql`, i.e. `docker exec okam-harness-sql-1`. That container is stopped and belongs to
another world. Run receipt: `lanes/L-TRAIN-DEMO-SEED-REDO/run-unmodified.log`.

Training holds no foreign key into Workforce — a `PersonRef` is a `WorkforcePersonId` copied as a
value, checked only by `TrainingPersonBinding.RequireKnownPersonAsync` — so any roster id can play any
part. The seed now casts three parts (passes / fails-then-retakes / holds-certificates), prefers the
original names, and falls back to the next unclaimed roster id. The SQL branch survives for the case
it was written for (the roster read being refused outright) but fills only empty slots.

### Failure 2 — the blocker

`POST /training/stores/1/courses/{courseId}/versions/1/publish` answers 500:

```
Microsoft.Data.SqlClient.SqlException (0x80131904): The target table 'TrainingCourseVersions' of the
DML statement cannot have any enabled triggers if the statement contains an OUTPUT clause without
INTO clause.
```

`TrainingCourseService.PublishVersionAsync` mutates a tracked entity; EF emits `UPDATE … OUTPUT
INSERTED …` for the rowversion; SQL Server refuses at statement compile. The fix is a model
declaration (`ToTable(t => t.HasTrigger(...))`), not a schema change — and it is already owned:

* `L-EF-DECLARES-EVERY-TRIGGER` swept 25 triggers and named **TrainingCourseVersions publish** as one
  of its two LIVE cases.
* `L-BACKEND-PATCHES-ARE-APPLIED` **refused** that patch at the merge tip: the base is nine migrations
  ahead, installing 32 triggers where the patch declares 25, and a forced apply reds its own arm.

Even with the declaration landed in the repo, the API serving :5971 is a compiled binary from
`/Users/svendaneel/okam/wt-lwtwo-api` at `8e2b57de8`, which carries no declaration. Rebuilding or
restarting it is forbidden by this brief.

This also explains the world the clerk described: the four pre-existing courses have
`hasPublishedVersion: false`, and assignments and completions are empty, because assignments accept
only Published versions. The earlier seeding pass hit the same wall.

### What the seed left behind

One course, `Alkoholservering og skjenkeregler (193639)`, unpublished — the run died on its first
publish before creating the other two. Store 1 went from 4 courses to 5; certificates stayed at 4;
assignments and completions stayed at 0. No flag was changed: `training.setup` and
`training.assignments` were already on, and every withheld-key probe is refused before any write.

### Step 11, fixed and proven

`prove-step11.sh` runs the shipped step-11 bytes by line range against :5971 and writes nothing.
Three positive arms pass; four negative arms go red — a 400 with different words, a 403, a context
claiming a withheld stage is true, and a context omitting one.

The context arm needed a real fix, not a transcription. The inherited version read

```sh
[ "$(echo "$CTX_W" | jq -r --arg k "$KEY" '.featureFlags[$k] // "<absent>"')" = "false" ]
```

jq's `//` yields its right-hand operand for `false` as well as for `null`, so a flag the API reports
as `false` — the exact value the assertion demands — came back as `<absent>`. The arm could never
pass. It now uses `has()`, and negative controls C and D pin both wrong shapes.

### Constraints

* **C1** — no UPDATE or DELETE added against any append-only table; no SQL written at all.
* **C2** — no migration authored; the `GrowthAuditEvents` gap named by `L-BACKEND-PATCHES-ARE-APPLIED`
  is untouched.
* **C4** — nothing on a money path; Training completions and certificates carry the manager's own
  bearer as actor.
* **C5** — unmet and reported as such, which is why this is `blocked` and not `built`. :3971 has no
  listener.
* **C7** — the manager's bearer (whose `exp` is year 2126) was echoed into a run log by the developer
  exception page; redacted from every artifact, and `prove-step11.sh` takes the verification code from
  the environment rather than carrying it.

### For the successor

1. Land the trigger declarations, including the seven this base adds beyond the patch's 25.
2. Rebuild and restart :5971 — owner's call, not a lane's.
3. Re-run `Scripts/demo/seed-training-demo.sh` from `lane/train-demo-seed-redo` with `API_BASE`,
   `MANAGER_PHONE`, `MANAGER_CODE` and `STORE_NAME` set for this world. Steps 3, 5 and 11 are fixed;
   4 onward have never executed against a world where publish works.
4. Walk `/admin/training-courses` once a web server is up on :3971.

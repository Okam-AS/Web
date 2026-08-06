# L-LIVE-WALK-TRAINING — Training's lever is the one thing that works, and the walk still cannot run

**Read-only lane. No container started, no process started, NO PORT BOUND (4010/4971/4973 never
touched — all three held by foreign node pids 73160 / 96439 / 7406 for the whole session), nothing
committed, no ref moved, no file written outside this directory and my RETURN.** No journey was run,
live or fixture, so this lane claims no run and offers no artifact as evidence of one.

Frontend read at `/Users/svendaneel/okam/Web-modules` HEAD **`8ac6f63`** (362 uncommitted paths, 14 of
them under `test/e2e` — so **every citation below is `git show 8ac6f63:…`, never the working tree**).
Backend read at `/Users/svendaneel/okam/OkamAPI-grdelrec` = **`8e2b57de`** = `feature/restaurant-modules`
tip, `git status --porcelain` = 0 paths. Same pair all three sibling live-walk lanes read, so the four
returns are comparable line for line.

---

## 0. The resource, measured, stated first so it is not mistaken for the reason

My brief sizes this lane `class: node · pts: 1`; `caps in force: sql=2`. It grants no SQL slot, and
`test/e2e/scripts/live-world.sh:224-228` refuses to proceed unless a SQL container is **already
running**:

```
docker ps --format '{{.Names}}' | grep -qx "$SQL_CONTAINER" \
    || die "SQL container '$SQL_CONTAINER' is not running.
```

`SQL_CONTAINER` defaults to `okam-lws-sql` (`:142`), which is `Exited (0) 41 hours ago`. Starting it is
starting a container.

**What IS running, and why I did not touch it.** `docker ps` shows exactly two containers:
`mystifying_gates` (mssql 2022-CU14) and `testcontainers-ryuk-29cdcd1e-…`. Its labels —
`org.testcontainers:true`, `org.testcontainers.lang:dotnet`,
`org.testcontainers.resource-reaper-session:29cdcd1e-…` — say it is a **foreign backend SQL lane's
Testcontainers world**, reaped by its own ryuk. It came up about a minute before I looked. I did not
start it, it carries no fixed name or port I could point `SQL_CONTAINER` at, and adopting it would be
using a container I did not create.

**Headroom is NOT the constraint, and I measured rather than inferred it.** `docker stats --no-stream`:
`mystifying_gates` 2.002 GiB and ryuk 11.46 MiB of **7.653 GiB**, i.e. **~5.6 GiB free**. This matches
the sibling's ~6.3 GiB. **The block is the slot grant, not memory**, and I am not offering memory as a
reason.

---

## 1. THE HEADLINE: Training has neither sibling defect, for a FOURTH reason — it has no master at all

The brief sent me to check the master and the resolver and to sweep the extension files, not just the
composition root. All three come back clean, and the shape is new.

### 1a. There is no master, in the config or in the code

`git grep -ni training feature/restaurant-modules -- 'appsettings*.json'` returns **nothing** (exit 1).
The sections present in `appsettings.json` are `… Features, Margin, Growth, Events …`; in
`appsettings.Development.json`, `Mcp, MaintenanceSettings, Events, Logging`. There is **no `Training`
section, no `Training:Enabled`, no allow-list, and no config-bound settings class**.

Nor is one composed in code. `Services/Training/TrainingModuleGate.cs` binds exactly two things —
`ApplicationDbContext` and `ITrainingFeatureFlags` — and `Services/Training/StoreBackedTrainingFeatureFlags.cs:52-63`
resolves a flag as: per-store override row if one exists, else `TrainingFeatureFlags.DefaultFor(flag)`.
Nothing is ANDed under anything.

So Training is a **fourth shape**, and `F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE` cannot be
applied to it as written:

| module | master | where |
|---|---|---|
| Events | boolean, default false, **declared in neither settings file** | `EventsModuleGate.cs:57,66` |
| Growth | boolean, declared **false**, **ANDs** | `appsettings.json:176`, `StoreBackedGrowthFeatureFlags.cs:48-52` |
| Margin | per-store **allow-list**, declared empty, **coalesces** | `appsettings.json:170-174`, `MarginModuleGate.cs:36,42-43` |
| **Training** | **none** | — |

### 1b. No effective resolver is registered — and none is required

`Services/Platform/FeatureFlags/IStoreFeatureFlagEffectiveResolver.cs:10-24` states the rule: a
resolver is required for *"a gate that ANDs a flag under something else"*, *"otherwise the lever
silently stops working."* Training ANDs under nothing, so the board's own fallback is already correct.
`Controllers/StoreFeatureFlagsController.cs:64`:

```csharp
return overridden ? row.Enabled : descriptor.DefaultEnabled;
```

…which is **the same function** `StoreBackedTrainingFeatureFlags.IsEnabledAsync` computes. And the two
defaults cannot drift, because both derive from the ONE `Declared` list in
`Services/Training/TrainingFeatureFlags.cs`: `Describe()` feeds the catalog (`Program.cs:763`) and
`Defaults`/`DefaultFor` feeds the store-backed layer, off the same seven `FeatureFlagDescriptor` rows —
`training.setup` and `training.assignments` both `DefaultEnabled = false`, deny-closed.

**So Training is NOT in Growth's position.** An operator who flips `training.setup` on
`/admin/feature-flags` writes an override row, the gate reads that row, and the board reports what the
gate resolves. The lever really works.

### 1c. The extension sweep — the mistake made at Margin, not repeated, and it inverts here

Two `*ModuleServiceCollectionExtensions` files exist on the branch (`Helpers/Margin/…`,
`Helpers/Meals/…`) and `Program.cs` calls exactly one, `services.AddMarginModule();` at `:1160`. **Training
has no extension file at all.** All four of its registrations are in the composition root itself:

* `Program.cs:1177` `ITrainingFeatureFlags → StoreBackedTrainingFeatureFlags`
* `Program.cs:1178` `ITrainingModuleGate → TrainingModuleGate`
* `Program.cs:1182` `ITrainingContextService → TrainingContextService`
* `Program.cs:1188` `ITrainingEvidenceService → TrainingEvidenceService`

So for Training — and, of the four, only for Training — **a grep of the composition root is complete**.
The sweep was still worth doing: it is what proves the absence is real rather than hidden one call away,
which is exactly the error corrected at Margin.

### 1d. And no controller-wide filter

`EventsController` is its own `IActionFilter` and 404s every route while its gate is down.
`Controllers/TrainingController.cs:26-29` is a plain `[Authorize] [ApiController]
[Route("training/stores/{storeId:int}")]`; each of its 19 actions catches `TrainingProblemException`
and renders it. There is no controller-wide refusal. **Training has neither sibling defect.**

---

## 2. THE FIXTURE LIE, and it is bigger than a value: the visibility gate is not modelled AT ALL

The brief said to expect the fixture to have been lying. It is, and it is the third instance of the
estate's own recorded pattern — *"a fixture that modelled no feature gate"* — one layer deeper than the
flag map that was already fixed.

`test/e2e/fixture/training.js:202-215` answers the gate read **200, unconditionally**:

```js
if (rest === '/context' && method === 'GET') {
    ctx.send(200, { storeId: Number(match[1]), capabilities: ['TrainingManager'], … });
    return true;
}
```

The product does not. `Services/Training/TrainingContextService.cs:41-42`:

```csharp
await _authorization.RequireStoreAdminAsync(user, storeId, ct);
await _moduleGate.EnsureVisibleAsync(storeId, ct);          // ← throws TrainingProblemException.NotFound()
```

and `Services/Training/TrainingModuleGate.cs:60-70` — visible **only** if `training.setup` is on for the
store **OR** one of `TrainingCourses` / `TrainingCertificates` / `TrainingAssignments` /
`TrainingCompletions` already carries a row for it.

**`live-world.sh` gives it neither.** Step 4's header says *"No module config masters are set"*; its
`SEEDED_TABLES` (`:284`) is `'WorkforceLegalEmployers','WorkforcePersons','WorkforceStaffMembers'`; and
`git grep -ni training` over **both** `live-world.sh` and `live-world-reset.sh` returns nothing at all.

**Consequence, on any live world this branch builds:** `GET /training/stores/{id}/context` answers a
**404**, `pages/admin/training-courses.vue:361-379` sets `gate` from the refusal, `:21` renders
`<div v-if="gate !== 'open'" data-test="gate">` — and the walk's step 1 asserts
`expect(page.locator('[data-test="gate"]')).toHaveCount(0)`. **It reds at step one, before the module
gate is ever discussed.**

### 2a. …and this is the walk's whole thesis, not a seed gap

Steps 2 and 3 are the journey's own stated reason for existing — *"READ-ONLY, NOT DARK: the store is
visible and every write is refused"*: gate open, both flags reading `Av`, the forms drawn, the submit
live, and the press answered 409 `training.flag-disabled-read-only`.

On the shipped product that state is the **disabled-after-data** regime, and on a fresh venue it is
**unreachable by construction**: visible needs data, data needs a write, a write needs the flag on. A
brand-new store is *never-enabled* — an opaque 404, the module invisible — which is the distinction
`TrainingModuleGate` is written to make (spec §9.1) and the one the fixture's unconditional 200 erases.

**The walk already contains the honest version of its own claim.** Its LAST step —
*"and putting the assignments switch back down closes writing again"* — flips `training.assignments`
off through `/admin/feature-flags`, reloads, and proves the two completion rows survive while a third
write is refused. **That is the disabled-after-data demonstration, performed after the data exists**,
and it is exactly what a live server can do.

**So this is the difference the brief asked me to name rather than route around.** To survive a real
server the walk must either (a) open by flipping `training.setup` and assert the never-enabled 404 as
its first fact — which is a *stronger* opening than the fixture's, because it is a refusal only a real
gate can produce — or (b) move the read-only demonstration to after the first course exists, where its
own closing step already puts it. **Neither is a rewrite; both are shorter than what is there.** What
must NOT happen is seeding a Training row into `live-world.sh` to make the fixture's opening reachable:
that manufactures a store a venue cannot be, which is the defect this walk was written to stop.

### 2b. What Training does NOT need — unlike two of its three siblings

**No `live-world.sh` switch.** Events needs `Events__Enabled=true` on the launch line and Growth needs
`Growth__Enabled=true`, because both have a config master the operator screen cannot beat. Training has
no master (§1a), so the walk pulls its own lever at `/admin/feature-flags` and the gate honours the row
it writes. Step 4 of `live-world.sh` needs no change for this module.

---

## 3. THE SECOND BLOCKER: two merges, and neither one alone makes the walk possible

The lane's objective is *"the course to the **evidence pack**"*. That half is split across two refs, and
I verified both with `merge-base --is-ancestor` rather than by reading a diff.

**#17, the disclosure log — backend, one lane branch only.**
`GET /training/stores/{storeId}/evidence/disclosures` exists at `lane/train-disclosure` **`06b8b582`**.
`git merge-base --is-ancestor 06b8b582 feature/restaurant-modules` → **NO**; `git branch -a --contains
06b8b582` → that lane and nothing else. The tip serves only `#16 [HttpGet("evidence")]`
(`TrainingController.cs:383`). Meanwhile the **shipped** panel calls it: `TrainingDisclosurePanel` is
mounted at `pages/admin/training-courses.vue:96` and `pages/admin/workforce-me.vue:246`, both through
`utils/training/training-client.js:352`. **Against the integration backend that route 404s for a person.**

*Measured, because it changes who is blocked:* `training-courses.vue:519-530` fires `lookupDisclosures`
from the panel's `@lookup` event, **not on mount**. So the 404 does **not** fire during
`training-course-to-evidence` and is not what reds that walk — it is a live defect for a manager who
presses the control, and the blocker for `training-evidence-document`.

**#16, the pack caller — frontend, the composition candidate only.**
`GetEvidence`, `pages/admin/training-evidence.vue`, `TrainingEvidenceDocument.vue`, the sidebar entry and
`test/e2e/journeys/training-evidence-document.spec.js` are on `candidate/fe-compose-2026-08-05`
**`f40fdf3`**. `git cat-file -e 8ac6f63:test/e2e/journeys/training-evidence-document.spec.js` **fails** —
the spec does not exist at the tip. And the two refs have since **diverged**: `8ac6f63` is not an
ancestor of `f40fdf3` and `f40fdf3` is not an ancestor of `8ac6f63`. What L-JOURNEY-TRAINING-2 recorded
as "ahead, not diverged" has become a real merge.

**Backend-only gives the log with no surface; compose-only gives the surface with no log.** Both, or
the objective's second half cannot be walked by anybody, live or fixture.

---

## 4. THE THIRD BLOCKER: Training has two captures, both `fixture`, and one records its own failure

`artifacts/journeys/training-course-to-evidence.playwright.json` — `"backend": "fixture"`,
`"status": "failed"`, `"commit": "e34977ac…"`, `backendBuild.short` `e34977a-**dirty**`. Eight steps
passed; the ninth is red:

```
TimeoutError: locator.click: Timeout 8000ms exceeded … waiting for locator('[data-test="version-publish"]')
  <p class="trn-form__hint">…</p> from <div class="trn-page__column"> subtree intercepts pointer events
```

The repair is `lane/train-publish-unclickable` **`28548f96`** (`.trn-table-scroll{overflow-x:auto}` on all
seven Training tables, A/B proven at five widths), and `git merge-base --is-ancestor` says it is **not**
in `8ac6f63`. **Publishing is the hinge of this walk**, so a live run reds there too, for the same
product reason and at the same viewport. `L-TRAINING-WALK-IS-GREEN` is running and owns it; I did not
touch it.

The other capture, `training-evidence-document.playwright.json`, says `passed` — but it names commit
`e34977ac` and **its spec does not exist at that commit**. It is a borrowed-tree artifact, as
L-JOURNEY-TRAINING-2 warned. **Training therefore has zero live captures and one honest green.**

Both specs are `@fixture` — `journeyDetails` defaults `tag: ['@fixture']` (`support/journey.js:722-725`)
and neither passes one — so live mode selects zero of them. **Re-tagging is the last step, not the first.**

---

## 5. What a follow-on lane needs, in order

1. **A SQL slot** (`class: sql`). This is now the **fourth** consecutive live-walk lane to return on it,
   and none of the six `L-LIVE-WALK-*` lanes was given one. Nothing on this line is a product change.
2. **`lane/train-publish-unclickable` 28548f96** — without it the walk reds at the publish step on any
   backend. Owned by `L-TRAINING-WALK-IS-GREEN`.
3. **The §2a walk amendment** — never-enabled first, or read-only-after-data. This is a *prerequisite*,
   not a repair: unamended, a live run reds at step 1 and the artifact would say nothing useful.
   **Do not close it by seeding a Training row.**
4. **No `live-world.sh` switch** (§2b) — unlike Events and Growth, Training needs none.
5. For the objective's second half only: **`lane/train-disclosure` 06b8b582** *and*
   **`candidate/fe-compose-2026-08-05` f40fdf3**, both, now a merge rather than a fast-forward.
6. **Re-tag** both Training specs off `@fixture`, last.

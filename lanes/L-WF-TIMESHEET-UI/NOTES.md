# L-WF-TIMESHEET-UI — lane detail

## Baseline (measured, not assumed)
- frontend `feature/restaurant-modules` @ `e34977ac` (Web-modules, shared checkout, ~224 dirty
  files from concurrent lanes at the time of measuring)
- backend checkout was on `lane/meals-grace-pins` @ `34c6c103` — NOT the integration branch — so
  every backend fact below was read out of `lane/wf-digest-tautology` @ `4b911917` with `git show`,
  never from the working tree.

## Which backend branch this was built against, and why that one
`lane/wf-digest-tautology` (`4b911917`), because it is the branch that carries BOTH the W5 batch
(`lane/wf-w5-timesheet`, tip `9e82b286`) and the digest-tautology fix that sits on top of it. The
coordinator's note said whoever lands W5 must take `4b911917` too; this UI is written against that
pair and against nothing else.

## The premise, verified before a line was written
The brief was accurate. `timesheet|timeliste` appears **once** in the whole frontend at baseline —
`translations/en.ts:2963`, `wfr_cap_desc_payrollapprover: 'Can read wages and approve timesheets.'`
— and that is a capability description, not a surface. No client method, no component, no page, no
route, no nav entry. Nine Workforce routes existed (`workforce-schedule`, `-requests`, `-roster`,
`-rates`, `-personnel-list`, `-delivery`, `-publications`, `-me`, and the public `/workforce/join`);
none was a timesheet screen. Nothing had been built already.

## The endpoints
`Controllers/WorkforceTimesheetsController.cs`, base `[Route("workforce/stores/{storeId:int}")]`,
class-level `[Authorize]`, all five resolving `WorkforcePayrollApprover`:

| method | route | gated on `workforce.export` |
|---|---|---|
| GET | `timesheets?from&to` | no |
| GET | `timesheets/{periodId}` | no |
| POST | `timesheets/{periodId}/approve` | YES |
| POST | `timesheets/{periodId}/exports` | YES |
| GET | `timesheets/{periodId}/exports/{batchId}` | no |

All success responses are `200` — no `201` anywhere, including the two POSTs. Wire is camelCase with
PascalCase enum strings (Newtonsoft + `StringEnumConverter`).

## C4 — how the actor reaches the write
It is NOT the user id. The chain is:

1. `WorkforceControllerBase.CurrentUserId()` → `ActorClaims.ResolveUserId(User)` off the JWT.
2. `ApproveAsync` line 164: `var caller = await _authorization.RequireWriteCapabilityAsync(userId,
   storeId, WorkforceCapability.WorkforcePayrollApprover, WorkforceFeatureFlags.Export, ct);` —
   which returns a **`WorkforceStaffMember`**.
3. Line 194: `var actor = caller.StaffMemberId.ToString();`
4. Stamped into `WorkforceTimesheetPeriod.ApprovedByActorReference` (:215) and
   `WorkforceTimesheetExportBatch.RequestedByActorReference` (:405, :455).

`AppendExportAudit` (:718) hard-refuses a blank actor:
`throw new ArgumentException("A timesheet export audit event requires a resolved actor.", nameof(actor))`.
So there is no ambient-default path on the server, and **nothing in this frontend names an actor** —
the page cannot choose one, only carry the bearer token that resolves it. The e2e fixture reproduces
the refusal (`requireActor` throws rather than substituting a system actor), and the journey asserts
the value on screen is the signed-in manager's staff member AND is none of the three workers whose
hours are in the file.

## C3 — the whole wire in one change
client (`utils/workforce/timesheet-client.js`) + view logic (`utils/workforce/timesheet.js`) + two
components + page (`pages/admin/workforce-timesheets.vue`) + Nuxt file route + navigation entry
(`AdminPageHeader.vue`, Moduler group, last of the seven Workforce links) + its icon + the repo's own
pin (`admin-nav-access.test.js` `STORE_ADMIN_PATHS`). The CONVERSE WALK in that suite — "every module
page under pages/admin/ is offered by the sidebar" — is the gate an unlinked page fails, and it
passes: **28/28**.

## Two fixture facts that were stale, and are now not
1. **`workforce.export` was WITHHELD from the fixture's flag catalog**, with the stated reason that
   its enforcement point "does not exist (a W5 batch that is not built)". It exists: the backend
   advertises `new FeatureFlagDescriptor(Export, "Workforce", "Export", false)` and
   `WorkforceTimesheetService` passes it to `RequireWriteCapabilityAsync` on both writes. Withholding
   it would now make the read-only refusal unreachable and leave the journey unable to pull the lever
   an operator actually pulls. Added to the catalog, and the comment corrected rather than deleted.
2. **The fixture's `/context` granted an admin only `['WorkforceScheduler','WorkforceManager']`** —
   not `WorkforcePayrollApprover`, which all five timesheet routes require. That was the fixture
   being the outlier, not a policy: `test/e2e/scripts/live-world.sh:534` already grants the LIVE
   manager `WorkforceSelf,WorkforceScheduler,WorkforceManager,WorkforcePayrollApprover` and :657
   DIES if `GET /context` does not answer with the payroll grant. Adding it is a convergence. It is
   also why neither the rates page nor this one had a journey before: the payroll-gated half of
   Workforce was reachable over HTTP and from no browser.

## The defect found by LOOKING at the rendered page
The Approve button shipped **disabled with no reason beside it** — the one state where it must work.
`:disabled="!approve.enabled || busy"` where `busy` is a string (`'' | 'approve' | 'export'`): Vue 2
drops a boolean attribute only for `null`, `undefined` or `false`, so an empty string renders
`disabled=""`. Every gate function was correct and every unit test passed, because the fault was in
the BINDING. Fixed with an `isBusy` computed; pinned in `workforce-timesheet-components.test.js` on
the DOM attribute rather than on a computed. **Mutation-checked**: reintroducing the defect reds 5 of
the 17 component tests. There is also a standing test that a withheld control is NEVER silent — that
disabled-with-nothing-beside-it shape is exactly what the defect produced.

## What the browser cannot verify, said on screen and in the artifact
The download answers `X-Okam-Content-Sha256`, but neither the real API nor the fixture lists it in
`Access-Control-Expose-Headers`, and this app is cross-origin to both — `fetch` reads null for it.
So the page shows `payloadSha256` off the batch MODEL, which is a **server-attested** integrity claim
rather than a client-verified one. Recorded as an `info` finding in the journey artifact rather than
papered over. The estate's `BrowserReadableHeaders` helper would close it; it is on an unmerged lane.

## Duplication removed rather than added
`_requestCsv` + `fileNameFrom` lived on `WorkforceRatesService`; the timesheet download is the second
workforce route whose body is a file. Hoisted to `WorkforceClientBase._requestFile` and re-exported —
the same move `assertBusinessDate` made when the personalliste became the third date-taking surface.
**Not** consolidated across modules: `utils/meals/statement-client.js` and `utils/margin/api-client.js`
each carry their own `fileNameFrom` against their own error families. Three copies remain in the
estate, now one per module family instead of two in this one. Out of this lane's scope, noted here.

## Suites run
- `test/admin-nav-access.test.js` **28/28** (isolated with `--runTestsByPath`, incl. the converse walk)
- `test/workforce-timesheet.test.js` **20/20**, `…-client.test.js` **17/17**,
  `…-components.test.js` **17/17**
- `test/workforce-rates-client.test.js` + `…-rates-page.test.js` green after the `_requestFile` hoist
- full `TZ=Europe/Oslo npx jest`: **2910 tests passed, 0 failed**; 124 suites passed. The 5 failed
  SUITES are other lanes' untracked Playwright probe files under `lanes/` that Jest cannot run
  (`L-WF-PIVOT-DEFECTS`, `L-JOURNEY-PORT-HARDCODED`, `L-TRAIN-READONLY-VISIBLE`,
  `L-TRAIN-PUBLISH-UNCLICKABLE`) — none mine, none in this commit.
- `npm run test:e2e:fixture-divergence:prove` **7/7 arms**. The real run against
  `OKAM_API_REPO=/Users/svendaneel/okam/OkamAPI-modules` reports **1 divergence, pre-existing and not
  mine** (Growth newsletter test-sends, `growth-newsletter.js:332`). It could not validate the
  timesheet routes at all: that checkout is on `lane/meals-grace-pins`, which has no W5.
- browser journey `workforce-timesheet-export.spec.js` — **15/15 steps**, 6 screenshots, 4 console
  errors of which 2 are the inherited shell-redirect `Navigation cancelled` notes and 2 are the
  deliberate 409s this walk provokes.
- eslint clean on all 19 touched files.

## A cross-lane collision worth knowing at merge time
`lanes/L-WF-ROLES-UI/reconstructed/test/admin-nav-access.test.js` (untracked, another lane's) fails
7/28. It is **not caused by this lane**: removing my nav entry entirely leaves it failing the same
7. That lane has its own uncommitted `pages/admin/workforce-roles.vue` and a private copy of the nav
list. Once both land, that list needs BOTH `/admin/workforce-roles` and `/admin/workforce-timesheets`
— the stale-list hazard, one directory over.

## Ports
Ran on **3931/4931** after checking with `lsof` that both were free. Never touched 4010 (PID 73160,
another lane's, which `reuseExistingServer` would have silently adopted), nor 5951/5952/5961. Every
run was confirmed to have bound a FRESH fixture by the `[fixture] listening on http://127.0.0.1:4931`
line, which appears only when a new process binds. No container was started, and none was stopped
except the one short-lived fixture this lane itself started on 4931 for the curl smoke test.

## Evidence that IS and IS NOT committed
`artifacts/` is gitignored, but journey artifacts have a committed precedent (16 files tracked under
`artifacts/journeys/`, canonical JSON + the screenshots its own array names). Force-added here to
match: `artifacts/journeys/workforce-timesheet-export.playwright.json` and the six PNGs under
`artifacts/journeys/workforce-timesheet-export/fixture/`.
**NOT committed**: `artifacts/journeys/runs/**` (per-run JSON + `ledger.jsonl`) and
`artifacts/playwright-output/**`, neither of which is tracked for any existing journey.

## Commit hygiene, and what the commit deliberately does NOT contain
Made with a private `GIT_INDEX_FILE` seeded from `read-tree HEAD`, then `write-tree` → `commit-tree`
→ `update-ref`; the shared checkout's HEAD never moved, its index was left empty and its working tree
untouched. Never pushed. The branch is a **durability snapshot, not a merge candidate**.

The commit carries only the files that are **wholly this lane's**. The nine SHARED files are recorded
in `shared-edits/` instead, and that is a decision made on evidence rather than a shortcut:

- A `HEAD + only my hunks` tree was built and then REJECTED. At `-U3` a sibling's nav entry three
  lines from mine merged into one diff hunk, so hunk-level filtering silently carried
  `nav_workforce_roles` into the tree; the standalone run caught it, because the reconstructed
  sidebar offered a link to a page that tree did not contain. Re-splitting at `-U0` fixed that, and a
  third check — every line by which the reconstruction differs from HEAD must be mine — then showed
  the ANCHORS are themselves sibling work.
- The reason is that **HEAD is a long way behind this working tree**: `pages/admin/workforce-delivery.vue`,
  `workforce-publications.vue`, `training-evidence.vue` and `workforce-roles.vue` are all absent from
  `e34977ac`. Four sibling lanes' nav entries, i18n blocks and `STORE_ADMIN_PATHS` lines sit directly
  beside this lane's in the same four files.
- The deciding argument: **everything in "Suites run" above was verified against the working tree**,
  which is HEAD + those four lanes + this one. A synthetic `HEAD + mine` tree is a tree nobody has
  ever run, and committing it as though it were the tested thing would be substituting a plausible
  artifact for the real one.

`shared-edits/i18n-run.js` + `i18n-insert.js` are the ACTUAL scripts that made the translation
change, unmodified and re-runnable, with their own anchor-and-duplicate guards — so three of the nine
files need nothing read out of a diff. The other six are kept as whole `*.worktree-diff` files with
the marker list that identifies this lane's hunks, kept whole rather than filtered precisely because
a filtered diff of an entangled file is what produced the mistake above.

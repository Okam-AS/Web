# The nine shared files this lane also had to touch

## Why they are here rather than in the commit

`lane/wf-timesheet-ui` commits only the files that are **wholly this lane's**. The nine files below
are shared, and in this checkout they were already carrying several other lanes' UNLANDED work at the
moment this lane ran. That is not a small overlap: at baseline `e34977ac`, **none** of

- `pages/admin/workforce-delivery.vue`
- `pages/admin/workforce-publications.vue`
- `pages/admin/training-evidence.vue`
- `pages/admin/workforce-roles.vue`

exists in HEAD. All four are sibling lanes' uncommitted pages, and each of them has its own nav entry,
its own i18n block and its own `STORE_ADMIN_PATHS` line sitting immediately beside this lane's in the
same four files.

A "HEAD + only my hunks" tree was attempted and **rejected on evidence**. Two things went wrong and
both are worth recording:

1. At `-U3`, a sibling's nav entry three lines from mine merged into the same diff hunk, so filtering
   by hunk silently carried `nav_workforce_roles` into the commit. The standalone run caught it —
   the reconstructed tree offered a sidebar link to a page that did not exist in it.
2. Re-splitting at `-U0` fixed that, but then a third check (every line by which the reconstruction
   differs from HEAD must be mine) showed the anchors themselves are sibling work: this lane's i18n
   block was inserted directly after the `wfd_…` block, which is itself unlanded.

The deciding argument is simpler than either: **the verification in this lane's NOTES.md was run
against the working tree**, which is HEAD plus four sibling lanes plus this one. A synthetic
`HEAD + mine` tree would be a tree nobody has ever run, and shipping it as though it were tested
would be the exact substitution this programme keeps removing. So the commit carries what it can
honestly carry, and the rest is recorded here, exactly.

## What is in this directory

### `i18n-insert.js` + `i18n-run.js` — EXACT and RE-RUNNABLE
These are the scripts that made the whole translation change, unmodified. Running
`node i18n-run.js` against a checkout re-applies all 67 `wft_*` keys plus `nav_workforce_timesheets`
to `translations/{no,en,de}.ts`. They are **self-guarding**: each insert refuses unless its anchor
matches exactly once and none of the keys already exist, so re-running after a merge either
reproduces the change or refuses out loud. This is the complete record for three of the nine files —
nothing needs to be read out of a diff.

### `*.worktree-diff` — the other six files, WITH the caveat stated
Each is the FULL `git diff -U6 HEAD` for that file **as the shared working tree stood**, so each
contains other lanes' hunks as well as this lane's. They are kept whole rather than filtered because
a filtered diff of an entangled file is exactly what produced mistake (1) above.

**This lane's hunks are the ones mentioning:** `timesheet` / `Timesheet` / `TIMESHEET`,
`workforceTimesheets`, `workforce.export`, `TIMESHEET_WRITE_FLAG`, `WorkforcePayrollApprover`,
`_requestFile`, `_requestCsv`, `fileNameFrom`, `sendFile`, `Timelister`, `Arbeitszeiten`.

| file | what this lane changed |
|---|---|
| `components/organisms/AdminPageHeader.vue` | the `workforceTimesheets` icon, and one nav item `{ label: $i('nav_workforce_timesheets'), path: '/admin/workforce-timesheets', … }` last among the Workforce links in the Moduler group |
| `test/admin-nav-access.test.js` | `'/admin/workforce-timesheets'` added to `STORE_ADMIN_PATHS` |
| `test/e2e/fixture/api-server.js` | `require('./workforce-timesheets')`; `workforceTimesheets: …fresh()` in state; the `sendFile` responder; `WorkforcePayrollApprover` added to the admin `/context` grant; the `/timesheets` dispatch block with its `workforce.export` write gate |
| `test/e2e/fixture/world.js` | `workforce.export` added to `FEATURE_FLAG_CATALOG`; the `TIMESHEET_WRITE_FLAG` constant and its export; the "deliberately absent" comment corrected from seven withheld flags to six |
| `utils/workforce/api-client.js` | `WorkforceClientBase._requestFile` and the exported `fileNameFrom`, hoisted from the rates client |
| `utils/workforce-rates/rates-client.js` | its local `fileNameFrom` and `_requestCsv` removed in favour of the hoisted pair; `GetHoursExport` now calls `_requestFile` |

## Landing order

Nothing here conflicts semantically with the sibling lanes — the four nav entries, the four
`STORE_ADMIN_PATHS` lines and the four i18n blocks are additive and independent. They will conflict
TEXTUALLY, because they are adjacent insertions in the same four files. Whoever lands these together
should expect that and take all of them; the merged `STORE_ADMIN_PATHS` needs every path, and
`test/admin-nav-access.test.js`'s converse walk is the check that says so out loud.

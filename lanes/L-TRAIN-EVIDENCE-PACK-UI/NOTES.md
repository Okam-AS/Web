# L-TRAIN-EVIDENCE-PACK-UI — lane detail

## Baseline (measured, not assumed)
- frontend `feature/restaurant-modules` @ `e34977ac` (Web-modules, shared checkout)
- backend checkout was on `lane/meals-grace-pins` @ `34c6c103`; all backend facts below were
  additionally confirmed against `feature/restaurant-modules` (the integration branch).

## Commit
`af0a4a13` on `refs/heads/lane/train-evidence-pack-ui` (parent `e34977ac`).
Created with `commit-tree` + `update-ref` so the shared checkout's HEAD never moved;
reachability confirmed with `git branch --contains`. Index reset afterwards, so the
shared checkout is left as it was found. NOT pushed.

## The endpoint
`GET /training/stores/{storeId:int}/evidence?personRef={guid}` — endpoint #16, `[Authorize]`,
`RequireStoreAdminAsync` + `EnsureVisibleAsync`. Newtonsoft with the ASP.NET Core camelCase
resolver; enums are PascalCase strings via `StringEnumConverter`.

## How the disclosure claim was verified BEFORE it was printed
1. Call site — `Services/Training/TrainingEvidenceService.cs`: `GetEvidenceAsync` ends with
   `RecordDisclosureAsync(...)`, which calls `_audit.Append(new TrainingAuditEntry { EventType =
   "evidence.read", AggregateType = "TrainingEvidence", AggregateId = personRef, SemanticDelta =
   { personRef, disclosedCompletions, disclosedCertificates } })` and then
   `await _context.SaveChangesAsync(ct)` — same request, not a background writer.
2. Writer — `TrainingAuditWriter.Append` stages the row into the caller's own `ApplicationDbContext`,
   so it commits atomically with the request. Actor resolution REFUSES rather than defaulting.
3. Pin — `WebApi.Tests/Training/TrainingEvidenceReadTests.cs` reads the row back out of the DB,
   asserts a second read appends a second row, and `A_refused_read_writes_no_disclosure` is the
   negative control (with a positive control so the emptiness is not a dead writer).
4. Browser — the journey falsifies it end to end: 0 rows on arrival, 1 after one read (actor
   `user-manager`), 2 after two.

The notice therefore says only that the read is recorded. It does NOT claim a subject can retrieve
those disclosures, because endpoint #17 (`evidence/disclosures`) has NO handler on the backend
integration branch — see the finding below.

## C6 — no statutory naming added
No section, statute or forskrift reference was introduced. The page says "ved tilsyn" (at an
inspection), which names an audience rather than a provision. "Internkontroll" was deliberately
NOT put on screen even though the backend uses it internally, because that would widen statutory
naming beyond what any current screen carries.

## C3 — the whole wire in one change
service method (`GetEvidence`) + page (`pages/admin/training-evidence.vue`) + route (Nuxt file
route) + navigation entry (`AdminPageHeader.vue`, Moduler group, directly under Opplæring) +
the repo's own pin (`admin-nav-access.test.js` STORE_ADMIN_PATHS). The CONVERSE WALK in that
suite — "every module page under pages/admin/ is offered by the sidebar" — is what would have
caught an unlinked page, and it passes.

## Two defects found and fixed by LOOKING at the rendered page
- the disclosure notice rendered BELOW the button it warns about (it lived in the document
  component). Moved to the page, above the form: a warning that arrives after the irreversible
  act it describes is the one placement that makes a true sentence useless.
- the Norwegian sidebar label `Opplæringsdokumentasjon` ellipsised to "Opplæringsdo…". Shortened
  to `Dokumentasjon` (it sits directly under `Opplæring`, which carries the meaning). The page's
  own h1 keeps the full word. en/de already fitted.

## 1280px hazard (coordinator's ask)
The sibling lane's finding — the Training publish button unclickable at 1280px because the
versions table overflows its grid track and the next column paints over it — does NOT recur here:
this page is a single column and its tables scroll inside their own `overflow-x: auto` container
(the fix that lane recommended). Measured in the journey with `document.elementFromPoint` at the
button's own centre: "clear at 1280×720". The journey keeps that measurement as a standing step.

## FINDING (not mine to fix) — a frontend caller for a backend route that does not exist
`utils/training/training-client.js` ships `GetDisclosures` (#17,
`GET …/evidence/disclosures`) and `TrainingDisclosurePanel.vue` is mounted on BOTH
`/admin/training-courses` and `/admin/workforce-me`. There is no such route in the backend:
`git grep "evidence/disclosures" -- '*.cs'` is empty on `feature/restaurant-modules`. The e2e
fixture does not implement it either, so no journey has ever exercised it. Effect: the panel's
lookup can only ever answer the client's `unknown`/`refused` states, and the estate currently has
no way for a subject to read who has looked at their record — while the ledger is being written.
Left alone deliberately: out of this lane's scope and it is a backend gap, not a UI one.

## Suites run
- `test/admin-nav-access.test.js` 28/28 (incl. the converse walk)
- five Training suites 192/192
- both re-run on a throwaway worktree checked out at the COMMIT (not the working tree), because
  two of the files I touched are shared and I staged only my own hunks in them — the standalone
  run is what proves those two splits are self-consistent.
- `test:e2e:fixture-divergence -- --prove` 7/7 arms; `test:e2e:guard-proof` 15/15 arms
- browser journey `training-evidence-document.spec.js` — 18/18 steps, 0 page-specific console
  errors, one inherited shell-redirect note.

## Ports
Ran on 3947/4947 after finding 3971/4971 (and 3010/4010, 3952, 3961, 3973, 4973) already bound by
sibling lanes. Playwright's `reuseExistingServer` is true locally, so picking a busy port would
have silently run this journey against ANOTHER lane's fixture — the stale-world trap. Ports were
checked with `lsof` before the run, not assumed.

## Evidence that is NOT committed
`artifacts/` is gitignored, so the journey artifact
(`artifacts/journeys/training-evidence-document.playwright.json`) and both screenshots
(`artifacts/journeys/training-evidence-document/fixture/*.png`) live outside the clone.
Everything else listed above is inside commit `af0a4a13`.

## Commit hygiene (tail of the RETURN's last log line)
...index reset afterwards, so the shared checkout is left exactly as found: HEAD still
feature/restaurant-modules @ e34977ac, nothing staged, every sibling lane's uncommitted work
untouched in the working tree. Never pushed. No container started.

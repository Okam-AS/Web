# L-STATUTE-EVIDENCE-WORLD — the inspector PDF stops contradicting its own caveat

Worktree `/Users/svendaneel/okam/web-statute-world`, branch `lane/statute-evidence-world`, off
`lane/statute-honesty` (f01886a, which already carries `lane/print-host`). Local commit only.

## 1. The brief was checked before anything was built, and it holds — on paper

`artifacts/journeys/statute-honesty/01-personalliste-with-coverage-caveat.pdf` as committed by the
previous lane printed, in this order on one page:

> TILKNYTNING: Denne listen kan bare føre ansatte … Var en arbeidende eier, en ulønnet eller en
> innleid til stede på arbeidsstedet denne dagen, **står vedkommende ikke her** …

and then, two rows into the table:

| Marit Leder | … | **Arbeidende eier eller leder** | 06:40 | 14:15 | Rettet av Marit Leder (daglig leder) 2026-08-01 16:05 |
| Jonas Vikar | … | **Innleid**                    | 11:00 | 18:45 | Innleid fra org.nr. 998 877 665 |

## 2. What the product can actually write, read out of the backend

`/Users/svendaneel/okam/OkamAPI-modules` @ `de1e5c5e`. Three unproducible shapes, not one:

| shape | only production write | verdict |
|---|---|---|
| participant category | `Services/Workforce/WorkforcePersonnelListProjection.cs:203-215` (`ResolveOrCreateEmployeeParticipantAsync`), off a clock punch | assigns `WorkforcePersonnelParticipantCategory.Employee` **literally**; the other three enum values appear only under `WebApi.Tests/` |
| `HiredInOrganizationNumber` | none | assigned only in `WebApi.Tests/Workforce/PersonnelListFixture.cs:92` and `PosContractFixtureTests.cs:129` |
| `CorrectionActorReference` / `CorrectedAtUtc` | none | both entry writes (`:117` open, `:133` close) pass `correctionActor: null, correctedAtUtc: null`; `Controllers/WorkforcePersonnelListController.cs` exposes one read action and no write |

So the fixture world seeded model-truth rows in three independent ways, and the sheet had no
per-row pin to catch any of them — unlike the backend kodeoversikt, whose test asserts every row's
category cell.

## 3. What changed

- `test/e2e/fixture/world.js` — all four personalliste rows are `Employee`, no correction, no
  hired-in organisation number; the now-unused `HIRED_IN_ORGANIZATION_NUMBER` export is gone. Marit
  Leder, the venue's daglig leder, is deliberately kept and recorded as «Ansatt» — that is what the
  caveat says happens, so the sheet now *demonstrates* the limit it declares.
- `utils/workforce/personnel-list.js` — `CATEGORY_LABEL_KEYS` exported as the single list of
  relationships the column can print; `CATEGORIES` derives from it.
- `components/.../WorkforcePersonnelListSheet.vue` — imports that list instead of holding a second
  copy of the same four names.
- `test/workforce-personnel-list-evidence-world.test.js` — **new**, 16 tests, the pin.
- `test/e2e/journeys/statute-honesty.spec.js` — the step that asserted «Innleid» *renders* is now a
  per-row pin that every relationship cell reads «Ansatt» and that no note line is printed. New
  `defect` finding recorded (see §5).
- `test/e2e/journeys/admin-print-host.spec.js` — its clipping probe targeted `.wfpl-sheet__note-line`,
  which only ever existed because of the correction and hired-in rows. Retargeted at the note CELL
  and strengthened from "a span is visible" to "the rightmost column's right edge is inside the page
  box", which is a closer reading of the defect that lane closed.

## 4. Falsifiability — every guard was mutated and confirmed red

See `mutation-log.txt`. Baseline 16/16 green.

| # | mutation | result |
|---|---|---|
| M1 | fixture regains a `HiredIn` row | **4 failed** |
| M2 | fixture regains the manager correction | **4 failed** |
| M3 | fixture regains a hired-in organisation number | **4 failed** |
| M4 | a fifth relationship joins `CATEGORY_LABEL_KEYS` with a label the caveat never names | **4 failed**, incl. all three locales |
| M5 | the coverage caveat paragraph is deleted from the sheet | **5 failed** |
| M6 | the relationship cell stops printing the category | **5 failed** |
| M7 | the relationship column is dropped from the table | **5 failed** |
| E1 | (browser) fixture regains a `HiredIn` row | `statute-honesty` **failed** |
| E2 | (browser) the note column is pushed past the page box | `admin-print-host` **failed** (2521 > 1280) |

M4's first attempt passed and was **wrong, not lucky**: I pointed the new category at
`wfpl_cat_employee`, whose label the caveat already names. Redone against a label it does not.

**The trap named in the brief was designed against.** An absence assertion in a world that cannot
produce the presence proves nothing, so: row counts are checked before rows are read; the rendered
cell count is checked against the row count (a vanished column reds, M7); and
`the sheet can still print X when it is handed one` mounts each excluded category and proves the
sheet *does* render it — the absences mean something only because the presences are demonstrable.

## 5. New defect found while doing this — NOT closed here

**Nothing in the product can correct a personalliste entry.** § 8-5-6 requires that "dersom det
foretas rettelser i personallisten, skal det fremgå hvem som har foretatt rettelsen og tidspunkt for
når det er gjort". The sheet renders both fields when an entry carries them, and no entry ever can:
both writes pass a null correction actor and the controller has no write action. A venue that clocks
in the wrong person cannot correct the register and cannot show that it did. This was masked by the
fixture's manager-correction row, which is exactly why it surfaced only when that row was removed.
Unlike the category gap, **no caveat on the sheet mentions it** — closing it needs a correction path
in the backend, not another paragraph on the paper. Recorded as a `defect` finding in
`artifacts/journeys/statute-honesty.playwright.json`.

## 6. Numbers

- jest `TZ=Europe/Oslo`: **94 suites / 2218 tests / 0 failed** (baseline was 93/2202; this lane adds
  one suite and 16 tests). `test/core-price-label.test.js` needs the `core` submodule present — with
  an empty `core/` it fails to resolve, which is a fresh-worktree condition and not this change.
- eslint: **0 errors** on all six files touched.
- playwright: **5/5 journeys green** on the full suite, ports 3417/4417.
- No SQL tier, no container started, nothing pushed. `/Users/svendaneel/okam/Web-modules/core`
  verified intact after every borrow/teardown cycle.

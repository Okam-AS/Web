# L-RESERVATION-CONFLICT-SEES-EVERY-TABLE — evidence

Measured against `Web-modules` working tree on branch `lane/focustrap-teardown` at `8ac6f63`
("The focus trap releases through a hook this Vue actually calls"), a checkout carrying ~394
uncommitted paths belonging to other lanes. The three files this lane changes were all CLEAN at
start (`git status --porcelain` named none of them), so the diff below is this lane's alone.

Backend read from **`/Users/svendaneel/okam/OkamAPI-modules`** by object at
`feature/restaurant-modules` tip **`8e2b57de`**, via `git show "${ref}:${p}"`. Nothing was checked
out there; that clone sits on a foreign lane's branch (`lane/meals-grace-pins`) and was left on it.
The four files read are copied into this directory as `backend-*.cs` so a reviewer needs no
cross-repo access; they are byte-for-byte `git show 8e2b57de:<path>`.

---

## 1. The question that sets the severity: does the server catch it?

**Yes. It does.** This is a missing warning and a lost draft, **not** a live double-booking path.

The chain, all at `8e2b57de`:

| Where | What it does |
|---|---|
| `Controllers/ReservationController.cs:84-94` | `POST Reservation/{storeId}` → `CreateAdminReservationAsync` |
| `Controllers/ReservationController.cs:103-113` | `PUT Reservation/{storeId}/{reservationId}` → `UpdateAdminReservationAsync` |
| `Services/ReservationService.cs:327`, `:398` | both call `ResolveAdminTablesAsync`, inside `RunSerializableAsync` |
| `Services/ReservationService.cs:605-607` | resolves the request's **whole** set: `model.TableIds` wins over `model.TableId` |
| `Services/ReservationService.cs:633-637` | `if (chosen.Any(t => IsBlocked(t.TableId, …))) throw ReservationConflict` — **every** chosen table |
| `Services/ReservationService.cs:701-735` | `LoadReservationBlocksAsync` `.Include(r => r.Tables)` and blocks **every** `rt.TableId` of every Requested/Confirmed/Seated reservation in range |
| `Services/ReservationService.cs:857-858` | comment states it outright: "The ReservationTable rows are the authority for overlap checks; TableId/TableName are denormalized copies." |

Two things a reviewer would reasonably suspect, both checked and both fine:

- **`overrideCapacity` does not weaken it.** `:627` gates only the capacity comparison; the conflict
  test at `:634` is unconditional. This matters because `persistUpdate` (reservations.vue) sends
  `toApi(block, true)` on every timeline drag and status change.
- **The `IsSeatingUnchanged` skip cannot introduce one.** `:565-597` returns true only when start,
  end and the table set are all identical (set EQUALITY, not subset), i.e. nothing about the seating
  moved.

**So what the defect actually costs.** `ErrorMessages.ReservationConflict` is
`"The table is no longer available for that time"` (`Helpers/ErrorMessages.cs:163`). That string
contains `"no longer available"`, so `saveReservation`'s catch takes the second branch: it **closes
the modal**, shows `res_toast_not_available`, and refetches. The operator loses the draft they were
typing, is not told **which** of the two tables was the problem, and had no warning at all up to the
moment they pressed Save — the modal's conflict line stayed hidden and Save stayed enabled. On the
timeline the drop is accepted, the block visibly lands, and only then does `persistUpdate` fail and
snap it back with the raw English server sentence.

The shape worth naming: **the renderer already knew.** `ReservationTimeline.blocksFor` (`:158-169`)
draws a combined booking on every table of `r.tableIds`, so the operator can SEE the block sitting on
table 2 while the conflict rule swears table 2 is free.

---

## 2. The defect, both directions

`checkConflict` compared a single `r.tableId` against a single `tableId` argument. A reservation is
not one table — `fromApi` (`:385-393`) reads the L3c combination off `r.tables` into
`tableIds`/`extraTableIds`, and `toApi` (`:411`) sends the whole set back. So the single comparison
lost the secondary tables on **both** sides:

1. **The tables an existing booking holds.** A combined 1+2 made only table 1 busy. Anyone could
   book table 2 for the same hours — from the modal (no `rm-error`, Save enabled, and the picker
   even listed table 2 without the "busy" marker) or from the timeline (drop accepted).
2. **The tables the draft would take.** The modal passed only `draft.tableId`, so a draft whose
   primary was free and whose *extra* was taken reported no conflict at all. The timeline passed
   only `curTable`, so dragging or resizing a combination never asked about the tables riding along
   with it.

---

## 3. The fix

| File | Change |
|---|---|
| `pages/admin/reservations.vue` | new module-level `tableIdsOf(value)` — accepts a bare id, a list, or a reservation/draft — and `checkConflict(excludeId, tables, …)` now intersects the two SETS instead of comparing two primaries. `conflictForDay` forwards the renamed parameter. |
| `components/admin/reservations/ReservationModal.vue` | `conflictNow` passes `this.draft` (primary **+** `extraTableIds`) instead of `draft.tableId`. Combine chips gained `data-table-id`, an `is-busy` class, an inline `res_busy` label and a red outline, so a taken table says so **before** it is picked. |
| `components/admin/reservations/ReservationTimeline.vue` | `startDrag` records `extraTables` via the new `extraTablesOf(r)`; `onPointerMove` checks `[curTable].concat(d.extraTables)`. Covers move **and** both resize handles. |

`isBusy(tableId)` deliberately stays single-table — it asks about one candidate — and gets direction
1 for free. No signature changed shape for any caller outside these three files (grep for
`checkConflict`/`conflictForDay` across `components/`, `pages/`, `core/`, `utils/` returns only
`reservations.vue:79`, `:119` and the two components' props).

**Reachability (C3).** Nothing new to wire: `conflictForDay` is already bound at
`reservations.vue:79` and `checkConflict` at `:119`, on a page already linked from the admin nav
(`components/organisms/AdminPageHeader.vue:568` → `/admin/reservations`). No route, no DI, no flag.

**No new translation key.** `res_busy` and `res_modal_conflict` already exist in `no`, `en` and `de`.

---

## 4. Proof

`test/reservations-combined-table-conflict.test.js` — 14 tests. Both entry points are driven through
the **real** page instance: the modal and the timeline are mounted with `page.vm.checkConflict` /
`page.vm.conflictForDay`, the same wiring as `reservations.vue:119` and `:79`, and the reservations
under test come from the real `fromApi`/`mapTable` mappers rather than hand-built blocks.

**Red first, against the shipped code** — `red-against-shipped-code.txt`, produced by
`git checkout --` on the three files and re-running: **7 failed, 7 passed**. The seven reds are
exactly the seven defect assertions. The seven that were already green are the negative controls
that stop the fix from being "always conflict": a table the combination does not hold, a free
combination, self-exclusion, cancelled status, another day, an empty selection, and a drag onto a
free slot.

**Green** — `green-lane-suite.txt`: 14/14. `green-full-suite.txt`: **131 suites / 3022 tests, all
passing.**

**Each of the three edits is individually load-bearing** (mutation check, each applied alone and
then reverted):

| Mutant | Reds |
|---|---|
| page: `!wanted.includes(r.tableId)` instead of the set intersection | 3 (secondary-table conflict, and both modal busy-marker tests) |
| modal: `conflictNow` passes `this.draft.tableId` again | 1 (conflict line + Save block) |
| timeline: `onPointerMove` passes `curTable` again | 2 (drop refused, resize refused) |

`npx eslint` on all four touched files: **0 errors, 0 warnings**.

### Baseline note on the full run

An unfiltered `npx jest` reports 1 failed suite / 13 failed tests in
`test/delivery-save-failure.test.js`. That file is **untracked** (`??`) — another lane's in-flight
work in this shared checkout. It imports `pages/admin/delivery.vue` and nothing this lane touched.
The 3022/3022 figure above excludes it and nothing else; the exclusion is named in the command
recorded at the top of `green-full-suite.txt`.

---

## 5. Not done, and why

**No browser arm.** The fixture-mode harness (`playwright.config.js`, two servers, no container)
would be the right instrument, but it has **no floor-plan or reservation endpoints** — the
`reservation` hits in `test/e2e/fixture/` are Meals *funding* reservations in the consumer fixture, a
different concept. Adding them means editing `test/e2e/fixture/api-server.js` and
`test/e2e/fixture/world.js`, and both are **currently dirty**, i.e. being edited by lanes still in
flight; ports 4010, 4971 and 4973 are live foreign fixture servers confirming as much. No SQL slot
and no container, so a live-world arm was not available either. Recorded rather than improvised.

This leaves **C5 open**: acceptance is Sven walking `/admin/reservations` → open a booking → Combine
with more tables → pick a table another party already holds, and seeing the chip go red and Save go
dead; then dragging that combination onto an hour where one of its tables is taken and seeing the
block refuse. No stack was stood up to do it here.

## 6. Adjacent findings left alone (per brief)

Neither is touched by this diff and neither is near it — `mapSettings` sits ~90 lines above the
changed `checkConflict` and `showToast` ~170 lines below, with no shared symbol:

- `showToast` (now `:664-669`) fires a bare `setTimeout` it never clears, so a toast armed just
  before the page unmounts writes to a destroyed instance.
- `mapSettings` (now `:392-405`) reads `leadMinutes`, `maxGuests` and `bufferMinutes` that the admin
  side never enforces — the settings panel stores them and nothing on this page consults them.

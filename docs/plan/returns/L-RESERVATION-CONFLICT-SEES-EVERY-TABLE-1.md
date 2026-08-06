```
RETURN: L-RESERVATION-CONFLICT-SEES-EVERY-TABLE
brief: 6d5df7ab
verdict: built
evidence: lanes/L-RESERVATION-CONFLICT-SEES-EVERY-TABLE/evidence.md
log:
THE SERVER DOES CATCH IT. Not a live double-booking path; severity is a missing warning plus a lost draft.
OkamAPI-modules read by object at 8e2b57de (clone left on lane/meals-grace-pins, nothing checked out).
ReservationService.cs:701-735 Includes r.Tables and blocks EVERY rt.TableId; :633-637 refuses if ANY chosen table is blocked.
Both admin write routes reach it (Controller:84-94, :103-113 -> :327, :398). overrideCapacity gates only capacity (:627), never the conflict.
Cost: ErrorMessages.ReservationConflict says "no longer available", so saveReservation CLOSES the modal and the typed draft is gone.
Renderer already knew: blocksFor draws the block on every tableIds row while the rule swore that table was free.
Fix, 3 files: page tableIdsOf() + set intersection; modal conflictNow passes the whole draft; timeline drag/resize carries extraTables.
Modal combine chips gained data-table-id + is-busy + the res_busy label, so a taken table says so before it is picked.
Red first against shipped code: 7 failed / 7 passed, lanes/.../red-against-shipped-code.txt. The 7 greens are the negative controls.
Green: 14/14 lane suite; 131 suites / 3022 tests full suite (green-full-suite.txt).
Each of the 3 edits mutation-checked alone: page mutant reds 3, modal mutant reds 1, timeline mutant reds 2.
eslint clean on all 4 touched files. No new i18n key: res_busy and res_modal_conflict already exist in no/en/de.
C3 satisfied by construction: props already bound at reservations.vue:79 and :119; page already in AdminPageHeader nav.
C5 OPEN: no browser arm. The e2e fixture has no floor-plan/reservation endpoints, api-server.js and world.js are both dirty, 4010/4971/4973 foreign, no SQL slot.
Measured on lane/focustrap-teardown 8ac6f63 (~394 foreign uncommitted paths); my 3 files were clean at start. No commit, no push, no container.
END RETURN
```

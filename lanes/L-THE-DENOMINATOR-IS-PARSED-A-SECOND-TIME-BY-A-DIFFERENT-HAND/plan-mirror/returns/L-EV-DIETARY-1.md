```
RETURN: L-EV-DIETARY
brief: 8f8a4ef9
verdict: built
evidence: fact:ev.dietary (EventsRunSheetComposer.cs now reads ev.DietaryRequirements) + ../OkamAPI-modules/artifacts/journeys/ev-dietary/run-sheet.md
log:
- NOT already built. The prior lane (4e30cab1) stopped the sheet ASSERTING an absence but
  deliberately authored no schema; MIG-20 was still an unbuilt ledger entry. So I built it.
- MIG-20 authored off the chain tip (20260730150953): EventsEvents + DietaryRequirements
  (nvarchar(max)), ...UpdatedAtUtc, ...UpdatedByUserId. Snapshot diff = those 3 columns and
  nothing else, so the model matched the chain before and after (C2). No backfill, no index,
  no trigger, no UPDATE/DELETE anywhere in the diff (C1). Applied to no database.
- Third column is a deviation from the ledger's two: nothing else records who stated a
  health-adjacent claim printed onto a kitchen document. Opaque 128, no FK, no index — same
  shape as EventsRunSheet.IssuedByUserId; ledger updated to say so.
- Reachable (C3): PUT /events/admin/{storeId}/events/{eventId}/dietary -> module gate ->
  store-admin guard -> refusing CurrentUserId(); read back on the event detail; and the
  ADMIN UI lever exists — pages/admin/events-pipeline.vue got the form, EventsJourney the
  honest-state display, events-client the route, 3 locales, 3 test files.
- An EMPTY statement is refused, not stored: blank is how the module records "never asked",
  so accepting one restores the false absence one layer down. An absence prints only because
  a human wrote the words. A statement made after a sheet printed marks that sheet stale.
- Suites (evidence that code behaves, never that the capability exists — C5): backend
  Events+Modules 507/0, wire tier 166/0, my two files 18/0, frontend jest 2133/0, eslint 0
  errors. All non-SQL: I hold no sql slot, so the SQL-tier lineage suites did not run.
- WHAT A PERSON STILL HAS TO WALK: the admin page lever is unit-tested only. test/e2e's
  fixture api-server has no admin Events routes, so no browser capture exists for this walk
  — worth a follow-up on the journey-harness surface.
- Correction for the plan: docs/plans/events-dietary-capture-decision.md §7 claims "no Events
  frontend at all". FALSE for this repo — pages/admin/events-pipeline.vue and
  components/admin/events/ are live here (§7 checked ~/okam/modul and ~/okam/Web only).
- Untouched Sven-gated items this enlarges: the 90-day anonymisation (spec §13 / BE-EVT-13)
  now has a THIRD table to reach, and §8.1's verbatim-disclosure ruling is doubly live —
  printed text can now be staff transcription of a guest's health statement.
- Commits: backend 9acf4523, frontend bbb80d6. Local only, not pushed. Committed by path;
  L-MEALS-GATE's in-flight files in the same backend worktree were left alone.
END RETURN
```

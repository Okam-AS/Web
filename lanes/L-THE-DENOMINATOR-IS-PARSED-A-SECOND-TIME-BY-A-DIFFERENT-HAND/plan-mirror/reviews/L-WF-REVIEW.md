# Fable review — Workforce (L-WF-REVIEW, 2026-08-01)

Read-only review. No file was edited. Backend checkout on `lane/meals-grace-pins`, identical commit
`de1e5c5e` to `feature/restaurant-modules` (empty diff); frontend on `feature/restaurant-modules` @ `7b99f2a`.

## 1. The first stop

**In any real store the manager is stopped before the first screen renders: the module cannot be entered
at all.** Every Workforce page opens with `GET /workforce/stores/{storeId}/context`, and
`WorkforceStaffService.GetContextAsync` (`Services/Workforce/WorkforceStaffService.cs:67`) requires the
caller to already hold a Workforce capability, resolved **only** from `WorkforceStaffMember.CapabilityGrants`
— never from StoreAdmin/PowerUser (`Services/Workforce/WorkforceAuthorizationService.cs:70-83`). But every
path that creates a staff member itself requires a capability: `POST /staff` needs `WorkforceManager`+`Setup`
(`WorkforceStaffService.cs:144`), the POS-operator import needs `WorkforceManager`
(`WorkforceOperatorImportService.cs:64`), and an invitation can only be issued by someone already inside
(`WorkforceInvitationService.cs:83`). There is no bootstrap endpoint, no store-admin grant path, no seed with
a production caller. The demo script says this in its own header —
`Scripts/demo/seed-workforce-demo.sh:7`: *"engagement — which cannot come through the API because creating
staff already requires a manager"* — and closes the circle with a raw SQL `INSERT INTO WorkforceStaffMembers`
(lines 158-174). So the manager's walk halts at `pages/admin/workforce-schedule.vue` `init()` (~line 630)
with `wf_no_capability`.

**In the seeded demo world** plan / publish / decide-a-request all walk. The first stop is then **punch**:
`POST /workforce/pos/clock-events` (`Controllers/WorkforcePosController.cs:66`) is DI-registered and reachable
over HTTP, but **no screen in Web-modules calls it** — `pages/admin/pos.vue` and every file under
`components/admin/pos/` contain zero workforce references. The demo bypasses it too (step 13, ~line 372):
the POS operator surface is *"an entire second product surface that this demo does not stand up"*.

## 2. The inventory

| Step | Page / route | Wire | Verdict |
|---|---|---|---|
| Find the module | Sidebar "Modules", `components/organisms/AdminPageHeader.vue:342-350` (worker "Me" :433) | — | **reachable** — all six pages linked; no orphan-page shape here |
| Enter (context) | every workforce page `init()` | `GET /workforce/stores/{id}/context` (`WorkforceStaffController.cs:52`) | **broken: cold-start** — no production path grants the first capability |
| Build roster | `pages/admin/workforce-roster.vue` | GET/POST `/staff`, PATCH w/ If-Match, PUT staff-roles, PUT employment-terms | **reachable** |
| Author role catalogue | nothing | `PUT /workforce/stores/{id}/roles` (`WorkforceStaffController.cs:218`) | **absent (frontend)** — deliberately unbound (`roster-client.js:26-28`); a virgin store's schedule editor has an empty role axis |
| Invite / link a worker | nothing | `POST /staff/{id}/invitations` (:156); `POST /workforce/me/invitations/claim` (`WorkforceMeController.cs:66`) | **absent (frontend)** — demo links by SQL `UPDATE WorkforcePersons` |
| Plan the week | `pages/admin/workforce-schedule.vue` | `POST /schedules/drafts`, `PUT .../assignments:batch` + If-Match | **reachable** — `cost`/`eTag` consumed, not discarded |
| Validate + publish | same page | `POST .../validate`, `.../publish` (:162,:182) | **reachable** — gated `workforce.publication`; flag has no browser lever |
| Punch | nothing | `POST /workforce/pos/clock-events` (:66) | **absent (frontend)** — no caller in either repo's UI; OD-2 accept-all `WorkforcePosDevVerification` bound in production composition root (`Program.cs:749`) |
| See attendance | `pages/admin/workforce-rates.vue` | `GET /attendance` (`WorkforceAttendanceController.cs:63`) | **reachable** — empty until someone can punch |
| Correct a punch | nothing | `POST /attendance/adjustments` (:92, needs `clockSessionId`) | **broken: unaddressable** — no manager-reachable read returns a `clockSessionId` (the page says so itself, `workforce-rates.vue:160-166`) |
| Decide a request | `pages/admin/workforce-requests.vue` | `GET /requests`, `PATCH /requests/{id}` + If-Match | **reachable** — both response families read |
| Personalliste | `pages/admin/workforce-personnel-list.vue` | `GET /personnel-list` (`WorkforcePersonnelListController.cs:47`) | **reachable but vacuously empty everywhere** — projection reads `WorkforcePersonnelListEntries`, written only by clock ingest (`WorkforcePersonnelListProjection.cs:117,133`); demo seeds sessions but not entries, so even the demo register prints blank. Print path itself is first-class |
| Kodeoversikt | nothing | `GET /personnel-list/code-register` (:77) — CSV + append-only issue record, DI `Program.cs:717` | **absent (frontend)** — no client method, no button, bearer auth means URL-typing cannot fetch it. **A person cannot produce it; only curl can.** |
| W5 landing spot | rates page, hours-export section | `GET /attendance/hours-export` (:146) | **landing place exists** — `workforce.export` flag Withheld, entry says "When W5 lands, its batch write takes this flag". Not touched |
| Worker's own page | `pages/admin/workforce-me.vue` | `/workforce/me/*` | **reachable** for a linked worker; unreachable in production because linking is |

Two dead capabilities besides: `GetPublicationHistory` is bound (`schedule-client.js:122`) but no page calls it;
the recipients endpoint (`WorkforceSchedulesController.cs:219`) is not bound at all.

## Corrections to the brief — two of the clerk's claims were wrong

1. **"Six advertised Workforce flags gate nothing, one default-ON" is no longer true on this branch.** All
   seven advertised flags (`module`, `setup`, `publication`, `selfservice`, `exchange`, `clock`, `dispatch`)
   have real enforcement points. The two that cannot lawfully gate (`personnel-list`, `export`) are
   **withheld from the operator catalog with written reasons**. The default-ON one (`workforce.setup`) gates
   real writes and documents its default. An operator lever exists (`StoreFeatureFlagsController`). What is
   missing is a **browser screen** calling the PUT — so for a person, stage flags remain curl-only.
2. **"The kodeoversikt is still open" is half-false.** The backend half is built and thorough (deterministic
   rows per code, uncoded participants counted not dropped, append-only issue record, retention stamp). What
   is open is purely the frontend reach — and the demo-world emptiness of the register it decodes.

## 4. What could not be determined

- Whether frontend-mono's React POS has a punch surface (out of the two repos named).
- **Runtime truth.** Nothing was executed: no suite, no Docker SQL, no browser walk. Every verdict is static
  reading of the branch.
- Whether the in-flight W5 agent's work already claims any of these seams — de-conflict before dispatch.
- OD-2 remains Sven-owned (accept-all `WorkforcePosDevVerification`, `Program.cs:749`, due 2026-10-01). A punch
  UI lane can build against the seam without waiting; go-live punching cannot.

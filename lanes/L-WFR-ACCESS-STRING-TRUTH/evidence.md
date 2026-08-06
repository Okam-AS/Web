# L-WFR-ACCESS-STRING-TRUTH — raw evidence

Backend: /Users/svendaneel/okam/OkamAPI-modules
Read by object from refs/heads/feature/restaurant-modules (tip 8e2b57de).
NOT from the working tree, which has lane/meals-grace-pins out, 63 commits behind.

## Positive control (required before any zero is reported)

The known-existing issue route, endpoint 6, found by the same search that reports the absence:
```
refs/heads/feature/restaurant-modules:Controllers/WorkforceStaffController.cs:37:        private readonly IWorkforceInvitationService _invitations;
refs/heads/feature/restaurant-modules:Controllers/WorkforceStaffController.cs:42:            IWorkforceInvitationService invitations,
refs/heads/feature/restaurant-modules:Controllers/WorkforceStaffController.cs:46:            _invitations = invitations;
refs/heads/feature/restaurant-modules:Controllers/WorkforceStaffController.cs:156:        [HttpPost("staff/{staffMemberId:guid}/invitations")]
refs/heads/feature/restaurant-modules:Controllers/WorkforceStaffController.cs:166:                return Ok(await _invitations.IssueAsync(CurrentUserId(), storeId, staffMemberId, key, request, HttpContext.RequestAborted));
```
The search also surfaces Controllers/Meals/MealsMembershipController.cs, which DOES list/create/revoke
invitations. Those are Company Meals invitations and do not answer a wfr_ (workforce roster) question.

## Complete route surface, all ten workforce controllers

```
### Controllers/WorkforceAttendanceController.cs
40:    [Route("workforce/stores/{storeId:int}")]
63:        [HttpGet("attendance")]
92:        [HttpPost("attendance/adjustments")]
146:        [HttpGet("attendance/hours-export")]
189:        [HttpGet("attendance/contract-exposure")]
228:        [HttpGet("attendance/labour-band")]
### Controllers/WorkforceAvailabilityController.cs
23:    [Route("workforce/stores/{storeId:int}")]
35:        [HttpGet("staff/{staffMemberId:guid}/availability")]
51:        [HttpPut("staff/{staffMemberId:guid}/availability")]
### Controllers/WorkforceControllerBase.cs
### Controllers/WorkforceMeController.cs
25:    [Route("workforce/me")]
66:        [HttpPost("invitations/claim")]
95:        [HttpGet("staff-memberships/{staffMemberId:guid}/time")]
115:        [HttpGet("staff-memberships")]
133:        [HttpGet("schedule")]
153:        [HttpGet("inbox")]
170:        [HttpPost("inbox/{itemId:guid}/read")]
193:        [HttpPost("publications/{publicationId:guid}/acknowledgements")]
215:        [HttpPut("staff-memberships/{staffMemberId:guid}/availability")]
242:        [HttpPost("staff-memberships/{staffMemberId:guid}/time-off")]
269:        [HttpPost("staff-memberships/{staffMemberId:guid}/requests/{requestId:guid}/withdraw")]
293:        [HttpGet("staff-memberships/{staffMemberId:guid}/open-assignments")]
312:        [HttpPost("staff-memberships/{staffMemberId:guid}/open-assignments/{shiftAssignmentId:guid}/requests")]
333:        [HttpPost("staff-memberships/{staffMemberId:guid}/exchanges")]
361:        [HttpPost("staff-memberships/{staffMemberId:guid}/exchanges/{exchangeId:guid}/decisions")]
### Controllers/WorkforcePersonnelListController.cs
27:    [Route("workforce/stores/{storeId:int}")]
47:        [HttpGet("personnel-list")]
77:        [HttpGet("personnel-list/code-register")]
### Controllers/WorkforcePosController.cs
38:    [Route("workforce/pos")]
66:        [HttpPost("clock-events")]
145:        [HttpGet("personnel-list")]
### Controllers/WorkforceRatesController.cs
34:    [Route("workforce/stores/{storeId:int}")]
46:        [HttpGet("staff/{staffMemberId:guid}/rates")]
60:        [HttpPut("staff/{staffMemberId:guid}/rates")]
89:        [HttpGet("roles/{roleId:guid}/rates")]
102:        [HttpPut("roles/{roleId:guid}/rates")]
### Controllers/WorkforceRequestsController.cs
28:    [Route("workforce/stores/{storeId:int}")]
44:        [HttpGet("requests")]
61:        [HttpPatch("requests/{requestId:guid}")]
### Controllers/WorkforceSchedulesController.cs
29:    [Route("workforce/stores/{storeId:int}")]
50:        [HttpPost("schedules/drafts")]
82:        [HttpGet("schedules")]
110:        [HttpGet("schedules/external-commitments")]
130:        [HttpPut("schedules/{revisionId:guid}/assignments:batch")]
162:        [HttpPost("schedules/{revisionId:guid}/validate")]
182:        [HttpPost("schedules/{revisionId:guid}/publish")]
204:        [HttpGet("schedules/publication-history")]
219:        [HttpGet("schedules/publications/{publicationId:guid}/recipients")]
243:        [HttpGet("schedules/notification-failures")]
### Controllers/WorkforceStaffController.cs
31:    [Route("workforce/stores/{storeId:int}")]
52:        [HttpGet("context")]
67:        [HttpGet("staff")]
82:        [HttpPost("staff")]
107:        [HttpGet("staff/{staffMemberId:guid}")]
122:        [HttpPatch("staff/{staffMemberId:guid}")]
156:        [HttpPost("staff/{staffMemberId:guid}/invitations")]
178:        [HttpPost("staff/pos-operator-import")]
203:        [HttpGet("roles")]
218:        [HttpPut("roles")]
243:        [HttpGet("staff/{staffMemberId:guid}/roles")]
258:        [HttpPut("staff/{staffMemberId:guid}/roles")]
283:        [HttpGet("staff/{staffMemberId:guid}/employment-terms")]
298:        [HttpPut("staff/{staffMemberId:guid}/employment-terms")]
```

No GET listing an engagement's invitations. No revoke verb. Anywhere.

## Service layer: not a C3 unwired-capability gap

```
16:    public interface IWorkforceInvitationService
23:        Task<WorkforceInvitationIssuedResponse> IssueAsync(
33:        Task<WorkforceClaimResponse> ClaimAsync(
```

WorkforceInvitationState.Revoked, every occurrence in every .cs at the tip:
```
refs/heads/feature/restaurant-modules:Entities/Workforce/WorkforceInvitation.cs:27:        // Pending -> (Claimed | Revoked | Expired). Only Pending is in the filtered unique set.
refs/heads/feature/restaurant-modules:Enums/Workforce/WorkforceInvitationState.cs:18:        Revoked = 3,
```
Declared in the enum, mentioned in one comment, written by no code path.

## Ancestry: the built work has not landed
```
backend lane/wf-invite-list-revoke 68f2472c -> feature/restaurant-modules: NOT ANCESTOR
backend lane base: 8e2b57de8442a389a9b5f8025312c9750614c85e
```

## Frontend side

Repo: /Users/svendaneel/okam/Web-modules, branch feature/restaurant-modules, tip e34977a

The three shipped strings (line numbers have drifted from the brief's 2987/2934/2936):
```
translations/no.ts:3184:  wfr_access_no_list: 'Vi kan ikke vise om det finnes en aktiv kode akkurat nå, når den utløper, eller trekke den tilbake — API-et har ingen slike ruter. Lager du en ny kode, slutter den forrige å virke i samme øyeblikk. Det er den eneste måten å stoppe en kode som er sendt til feil person.',
translations/en.ts:3128:  wfr_access_no_list: 'We cannot show whether a code is live right now, when it expires, or withdraw one — the API has no such routes. Issuing a new code kills the previous one the moment it is minted, and that is the only way to stop a code that went to the wrong person.',
translations/de.ts:3131:  wfr_access_no_list: 'Wir können nicht anzeigen, ob gerade ein Code gültig ist, wann er abläuft, oder ihn zurückziehen — die API hat dafür keine Routen. Ein neuer Code macht den vorherigen im selben Moment ungültig, und das ist die einzige Möglichkeit, einen an die falsche Person gegangenen Code zu stoppen.',
```

Render site and both pins:
```
components/admin/workforce/WorkforceEngagementPanel.vue:134:          {{ $i('wfr_access_no_list') }}
test/workforce-roster-components.test.js:418:        .toBe(translations.no.wfr_access_no_list)
```

The second pin does NOT contain the key. Found only by searching the prose:
```
351:        'no invitation list or revoke route exists',
```
It is a journey.finding('note', ...), a recorded finding rather than an assertion, so it cannot
red a run - but it makes the same absence claim on every run.

Frontend lane ancestry:
```
lane/fe-wf-invite-list-revoke e8d69fc -> feature/restaurant-modules: NOT ANCESTOR
its parent: e34977a
current tip: e34977a
```

# L-WFR-ACCESS-STRING-TRUTH — verdict

**RULING: `wfr_access_no_list` is TRUE of what ships. It stays. No copy change, no test change.**

The capability it denies *has been built* — on two lanes, neither of which has landed. So the
sentence is true of the integration branch and false of the estate's work-in-progress. That is a
**landing problem to name, not a copy problem to fix**, and it is recorded as such below.

---

## 1. The API surface it was checked against

Read **by object** from `refs/heads/feature/restaurant-modules` in
`/Users/svendaneel/okam/OkamAPI-modules` (tip `8e2b57de`), never from the working tree — that
checkout has `lane/meals-grace-pins` out and is 63 commits behind, and a working-tree grep there has
manufactured false absences for three lanes today.

**All ten workforce controllers enumerated and their route attributes read** (not word-matched):

| Controller | invitation routes |
|---|---|
| `WorkforceStaffController.cs` | `POST staff/{staffMemberId:guid}/invitations` (issue/reissue) — **and nothing else** |
| `WorkforceMeController.cs` | `POST workforce/me/invitations/claim` (endpoint 32, consumer side) |
| Attendance, Availability, ControllerBase, PersonnelList, Pos, Rates, Requests, Schedules | none |

The full route dump across all ten controllers is in `evidence.md`. There is **no `GET` that lists an
engagement's invitations** and **no revoke verb** anywhere in the workforce surface.

### This is a true absence, not a C3 reachability gap

The distinction matters, because C3's failure mode is exactly "the code exists but no caller can
reach it". Checked, and it does not apply here:

- `Services/Workforce/Interfaces/IWorkforceInvitationService.cs` declares **exactly two methods**:
  `IssueAsync` and `ClaimAsync`. There is no unwired `ListAsync`/`RevokeAsync` waiting for a route.
- `WorkforceInvitationState.Revoked = 3` is declared in `Enums/Workforce/WorkforceInvitationState.cs:18`
  and appears in **no other `.cs` file** at the tip except one comment in
  `Entities/Workforce/WorkforceInvitation.cs:27`. **No code path writes it.**

## 2. The sentence, clause by clause

| Clause (no.ts) | True? | Evidence at tip `8e2b57de` |
|---|---|---|
| "vise om det finnes en aktiv kode akkurat nå" | **true** | no `GET` list route; nothing to read state from |
| "når den utløper" | **true in the branch it renders in** | see nuance below |
| "trekke den tilbake — API-et har ingen slike ruter" | **true** | no revoke verb; `Revoked` written by no code path |
| "Lager du en ny kode, slutter den forrige å virke i samme øyeblikk" | **true** | `WorkforceInvitationService.cs:117-125` — reissue **supersedes in place**, reusing the single Pending row and overwriting `TokenHash`. The old hash is gone, so the old token can never match again. |
| "Det er den eneste måten å stoppe en kode som er sendt til feil person" | **true** | no revoke exists, so reissue is the only lever against the *code* |

### The one nuance, examined and dismissed

`wfr_access_token_expires` (*"Koden utløper {expires}."*) **does** print an expiry — the issue
response carries `ExpiresAtUtc`. That does not falsify the clause, because the two strings live in
**mutually exclusive branches** of `WorkforceEngagementPanel.vue`: the expiry renders inside
`v-if="invitation.token"` (the one mint-moment the raw token is on screen, ~line 91), while
`wfr_access_no_list` renders in the steady-state `v-else` (~line 134). In the state where the
sentence is shown, the manager has no token on screen and **no route to re-read the expiry**. The
claim is accurate where it is made.

## 3. Both pins located — the second one only by searching the sentence

The brief warned a key-search would miss one. It did.

1. `test/workforce-roster-components.test.js:412-419` — *"the panel states there is no list and no
   revoke BEFORE offering the button"*, asserting `[data-test="access-limits"]` equals
   `translations.no.wfr_access_no_list`. Found by key.
2. `test/e2e/journeys/workforce-invitation-onboarding.spec.js:349-359` — a `journey.finding('note',
   'no invitation list or revoke route exists', …)`. **This is a recorded finding, not an
   assertion**, so it cannot red a run — but it is the same absence claim, emitted on every run.
   Found only by searching the prose.

Both are correct as they stand and **neither is touched**.

## 4. The landing problem (the live third case)

The work exists. It has not shipped. `git merge-base --is-ancestor` run on both, not assumed:

| Lane | Commit | Based on | Ancestor of its integration branch? |
|---|---|---|---|
| `lane/wf-invite-list-revoke` (backend) | `68f2472c` | exactly `8e2b57de`, the tip | **NO** |
| `lane/fe-wf-invite-list-revoke` (frontend) | `e8d69fc` | exactly `e34977a`, the tip | **NO** |

The backend lane adds precisely the two missing routes:

```
GET  /workforce/stores/{storeId}/invitations
POST /workforce/stores/{storeId}/invitations/{invitationId}/revoke
```

The frontend lane (23 files, +1684) binds them, and **inverts both pins rather than deleting them** —
its unit test proves no `wfr_*` value in any of the three locales still claims the routes are
missing. Its return was refused on a format placeholder and its author was lost.

**Both lanes sit exactly on their integration tips, so each is a clean fast-forward candidate.**
Neither has been reviewed by this lane — verifying `e8d69fc` was in scope only if it already answered
the question, and it does not: it answers a *different* branch's question. **The moment either lane
lands, this sentence becomes false and must go with it.** They must land together or not at all:
landing the backend alone leaves the string true-but-stale; landing the frontend alone binds routes
that return 404.

## 5. Why nothing was run

No source file changed, so no suite was run and no suite slot consumed. Both pins assert the
unmodified current behaviour and remain green by construction. Per C5 nothing is moved to verified on
suite evidence — this lane returns a **ruling with its evidence**, which is what the exit criterion
asks for.

## Constraints

C1, C2, C4, C7 not engaged (no migration, no money path, no log sink, no append-only write).
C3 checked and cleared in §1. C6 not engaged — the sentence names no statute.

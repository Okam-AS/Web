# L-FE-WF-INVITE-LIST-REVOKE — the roster panel stops saying the routes do not exist

## Baseline, named

| | |
|---|---|
| Frontend repo | `/Users/svendaneel/okam/Web-modules` |
| Baseline commit | **`e34977a`** "The corrections stop asserting what the repository cannot show", on `feature/restaurant-modules` |
| Shared checkout state at start | **207 uncommitted files** |
| My worktree | `/Users/svendaneel/okam/web-fe-invlist` on `lane/fe-wf-invite-list-revoke`, cut from `e34977a`, **clean at 0 dirty files** |

**The dirty-file hazard the brief warned about was real and still current.** `translations/{en,no,de}.ts`
and `test/e2e/fixture/api-server.js` were all four still held modified in the shared checkout when I
took my baseline. I did not build hunks through a temporary index — I cut a worktree off the
committed tip instead, which achieves the same thing more simply: every file I edited was the
committed blob, verified by line-number divergence (`wfr_access_no_list` sits at `en.ts:2934` in my
tree and `en.ts:3033` in the dirty tree — ~99 lines of another lane's uncommitted additions above it).

I checked before renaming a key that no lane in the dirty tree had taken a dependency on it:
`grep -rn wfr_access_no_list` over the dirty checkout returned the same four references my clean tree
has (the panel, one unit test, three locale definitions), so the rename breaks nobody at the merge.

`node_modules` is a symlink to the shared checkout's. Nothing was installed and nothing was written
into it.

## Which world the walk ran against

**The throwaway fixture** (`test/e2e/fixture/api-server.js`), extended by me — stated plainly because
a green against a fixture I wrote proves my fixture unless the provenance is given:

- The backend is `lane/wf-invite-list-revoke @ 68f2472c` in `/Users/svendaneel/okam/wt-wfinvlist`,
  off `8e2b57de`, **unpushed**. The routes exist in no other world, so no deployed API could have
  served this walk.
- My fixture handlers were written **against that commit's source**, not against my own guesses. The
  list's Pending-only filter, its ordering (`ExpiresAtUtc` then `InvitationId`), the 200-on-already-
  revoked, the 409 `workforce.invitation-not-revocable` on a claimed row, the opaque 404 for a
  cross-store or absent invitation, and the `Idempotency-Key`-required/no-`If-Match` header contract
  are each read out of `WorkforceInvitationService.cs` and `WorkforceStaffController.cs` at
  `68f2472c`.
- **One refusal is deliberately NOT modelled**: `workforce.invitation-revoke-conflict`. It is the
  lost-update refusal of a real DB-generated rowversion, so it is a SQL Server answer — the backend's
  own docstring says the fast tier cannot reach it either. A fixture that invented it would be
  claiming a race a single Node process cannot have. The client and the page handle the code; nothing
  in this lane claims to have *walked* it.
- I did not check my fixture with `npm run test:e2e:fixture-divergence` against the backend worktree.
  That runner reads `OKAM_API_REPO` live and compares refusal shapes, and pointing it at
  `/Users/svendaneel/okam/wt-wfinvlist` is the natural next check — recorded here as an open follow-up
  rather than claimed as done.

**Ports.** The orphaned fixture on **4010 (PID 73160)** was present exactly as briefed, and `4310`
was also taken by another lane. I bound my own — `E2E_FIXTURE_PORT=4311`, `E2E_WEB_PORT=3311` — and
confirmed a fresh process bound by the `[fixture] listening on http://127.0.0.1:4311` line in the run
log, which only a fresh bind prints. **The orphan was not touched.**

## What was false, and what replaced it

`wfr_access_no_list` said, in three locales, that *"the API has no such routes"* — and named the
reissue as the only way to stop a code. `68f2472c` made both halves false.

| | Before | After |
|---|---|---|
| Key | `wfr_access_no_list` (a name that lies) | `wfr_access_list_note` — the key is **deleted**, not reworded |
| Panel | one sentence naming an absence | a live list of outstanding codes + a withdraw control |
| Client | "the invitation surface is one route wide" | `ListInvitations` (#6b), `RevokeInvitation` (#6c) |
| Unit test | pinned the sentence | pins that no `wfr_*` value in **any** of the three locales still claims it |
| Journey step | asserted the panel says it cannot list or revoke | asserts it makes no such claim, and the list reads EMPTY for an uninvited hire |
| Journey finding | recorded "no list or revoke route exists — wanted: …" on every run | removed: the handoff was delivered |

The locale guard is deliberately scoped to the whole `wfr_` namespace rather than to one key, because
the claim lived in three files and a copy edit that missed one would otherwise pass.

## The two behaviours the surface must not flatten

**1. A stored `Pending` does not mean live.** `WorkforceInvitationState.Expired` is written by no code
path; expiry is a read-time `ExpiresAtUtc` comparison, so a code that lapsed a month ago still reads
`Pending` in its row.

- The panel renders **`isLive` only**. `state` is never printed — the journey asserts the string
  `Pending` appears nowhere in the panel, because it is the raw fact that means the opposite of what
  a reader would take it for.
- The fixture is **seeded with a lapsed code** (Kari Hansen, `Pending`, expired 30 days ago, computed
  relative to the run rather than a literal date) so the case is *produced*, not asserted. It sits on
  `staff-2` rather than on the onboarding journey's `staff-3`, whose panel that journey asserts is
  empty — a seed there would have it asserting the seed.
- The fixture computes `isLive` with the **same expression its claim handler uses**. That identity is
  the design, not a coincidence: divergence would let the fixture report a code as live that its own
  claim endpoint would refuse, and a UI built against it would ship that lie.

**2. Revoking an already-claimed code is a 409, not a success.** Surfaced through the page's existing
conflict band, with copy that names the thing that *does* remove access (ending the engagement),
because withdrawal cannot undo a link.

It is driven **as the race it actually is** rather than through a backdoor: the manager reads the
list, a worker claims the code **in a second browser context**, and the manager then presses Withdraw
against a list that is one moment stale. That is the button a real manager would press. A 200 there
would tell them they are safe at the exact moment they are not.

## The refusal stays uninformative (C7)

- The list response carries **no token and no token hash**. The fixture builds every element field by
  field for that reason — `state.invitations` is keyed *by the raw token*, so a careless
  `Object.entries` on that map is the one line that would put a live credential on the wire.
- The journey asserts C7 with **the run's own real code** as the needle — not a shape, not a regex —
  searched for in the rendered page HTML after the code is issued.
- The anti-oracle is asserted as a **property, not an implementation**: the journey claims the
  withdrawn code and then a string the server never minted, from the same account in the same visit,
  and compares the two refusals character for character. A later "more helpful error message" that
  leaked which code had once been real would fail there.
- Nothing was added to any log or telemetry call in this change.

## A defect the selectors did not catch, found by looking at the screenshot

Run 1 of both journeys passed. **Opening the screenshot showed the page contradicting itself.**

On the already-claimed refusal, the red band said *"Noen har logget inn med denne koden før den ble
trukket tilbake"* — somebody signed in with this code — while the access line **directly above it**
still read *"Ingen innlogging er koblet til engasjementet ennå"*: no login is attached. Two
sentences, one screen, flatly contradicting each other, in the one moment a manager is relying on the
page to tell them whether the wrong person got in.

Cause: `revokeInvitation` re-read the invitation list on a refusal but not the roster, so
`personState` stayed at the value it held before the race. But `workforce.invitation-not-revocable`
*means* that state moved to `Claimed` — the refusal is itself the evidence the roster is stale.

Fix: on that refusal specifically, re-read the roster rather than only the list. The journey now
asserts the access line catches up (`har koblet en innlogging`), so the contradiction cannot come
back silently. Run 2 is green, and the screenshot now shows the panel agreeing with the refusal, the
row flipped to `Registrert`, and the button offering a reissue.

**This is the argument for C5 in miniature.** Every selector in the step passed while the screen was
saying two incompatible things; only looking at it found that. Recorded here rather than quietly
fixed, because it is the second-order shape of the same defect this lane exists to remove — a surface
asserting something the rest of the system contradicts.

## Files changed

| File | What |
|---|---|
| `translations/en.ts`, `no.ts`, `de.ts` | `wfr_access_no_list` **removed**; 11 list/revoke keys + 4 conflict keys added per locale. Surgical single-hunk edits, pure additions beside one deletion — never a bulk rewrite |
| `utils/workforce/roster-client.js` | `ListInvitations` (#6b), `RevokeInvitation` (#6c); route ledger and the "one route wide" block corrected |
| `components/admin/workforce/WorkforceEngagementPanel.vue` | `invitations` prop, `engagementInvitations` computed (live-first ordering), `stamp()` extracted from `invitationExpiry`, the list + withdraw markup, styles |
| `pages/admin/workforce-roster.vue` | `invitations` state, `loadInvitations`, `revokeInvitation`, the two 409 codes wired into the conflict band |
| `test/e2e/fixture/api-server.js` | `invitationSummary` helper, the seeded lapsed code, GET `/invitations`, POST `/invitations/{id}/revoke` |
| `test/e2e/fixture/world.js` | stale "there is no invitation list endpoint" comment corrected |
| `test/workforce-roster-components.test.js` | the pin **inverted** + 8 new tests |
| `test/workforce-roster-client.test.js` | 5 new wire-contract tests |
| `test/e2e/journeys/workforce-invitation-onboarding.spec.js` | the second pin **inverted**; the delivered backend-handoff finding removed |
| `test/e2e/journeys/workforce-invitation-list-revoke.spec.js` | **new** — the two journeys |

## Results

See `RESULTS.md` in this directory for the measured tier outcomes and the run log.

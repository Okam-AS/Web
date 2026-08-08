# L-WF-INVITE-PAIR-LANDS — evidence

## The pair, and where it now sits

| half | source | branch built | tip | worktree | trunk it targets |
|---|---|---|---|---|---|
| frontend | `e8d69fc` | `lane/wf-invite-pair-fe` | `ff74b10` (code at `698383c`) | `/Users/svendaneel/okam/web-wfinvpair` | Web-modules `feature/restaurant-modules` @ `ff497c0` |
| backend | `68f2472c` | `lane/wf-invite-pair-be` | `13e8a6213` | `/Users/svendaneel/okam/api-wfinvpair` | OkamAPI-modules `feature/restaurant-modules` @ `726906fe5` |

Neither is merged. Nothing pushed. Revert is deleting two branches and two worktrees.

## Claim check before any work

- `e8d69fc` is not an ancestor of `ff497c0`; sole containing ref `lane/fe-wf-invite-list-revoke`. Confirmed.
- `68f2472c` is not an ancestor of the backend trunk. Confirmed by `git merge-base --is-ancestor` → NO.
- Not superseded: `wfr_access_no_list` was live in all three locales at `ff497c0`
  (`translations/no.ts:3199`, `en.ts:3143`, `de.ts:3147`) and rendered at
  `components/admin/workforce/WorkforceEngagementPanel.vue:134`.

## The one conflict, and why side-resolution would have regressed the trunk

`test/e2e/fixture/api-server.js`. Both sides inserted a route handler immediately after the
invitation-issue handler closes:

- **trunk** replaced the old one-liner `if (rest === '/roles' && req.method === 'GET') { return send(res, 200, world.ROLES); }`
  with the full endpoints #8/#9 job-role catalogue (`roleCatalogue(storeId).map(roleWire)`, flag gate, merge-not-replace upsert).
- **lane** added #6b (`GET /invitations`) and #6c (`POST /invitations/{id}/revoke`).

`diff` aligned the two blocks on a shared `retryable: false });` tail — both a 409 —
so they interleaved across two conflict regions.

`git checkout --theirs` would have **restored the stale `world.ROLES` one-liner** and shadowed the
trunk's roleCatalogue GET: the roles page would have read a static array instead of the store's
catalogue, with no test failing on the fixture. `--ours` would have dropped the invitation routes
this commit exists for. Resolved by content: both blocks kept whole, ordered #6b/#6c then #8/#9,
the superseded one-liner dropped because **the trunk itself deleted it**.

Mechanical check, not eyeball: every line either side added over the merge base is present in the
result — `lines from ours/trunk not fully carried: 0`, `lines from theirs/lane not fully carried: 0`.
`node --check` clean.

## Translations — the place this estate has lost keys four times

| locale | keys @ `ff497c0` | keys now | delta | keys on trunk now missing |
|---|---|---|---|---|
| no | 5172 | 5186 | +14 | `wfr_access_no_list` only |
| en | 5137 | 5151 | +14 | `wfr_access_no_list` only |
| de | 5137 | 5151 | +14 | `wfr_access_no_list` only |

+15 added, exactly one removed, in each locale. The one removal is the exit criterion.

## Suites

- Frontend: **144/144 suites, 3205/3205 tests** (trunk was 144/3192; +13 from the pick).
  First run showed 14 suites red on `Could not locate module ~/core/...` — the `core` submodule was
  unpopulated in a fresh worktree, 0 tests failed. Fetched gitlink `9626a56` from the local
  `Web-modules/core` checkout (the remote does not carry it) and the 14 went green.
- Backend: build **0 warnings / 0 errors**; `WorkforceInvitation|WorkforceContractFixture` → **51/51**.

## C-constraint findings

- **C3** — satisfied on the backend *without* a new wire, which is worth stating because the commit
  touches no DI file: `IWorkforceInvitationService` was **already** registered at `Program.cs:698`,
  and both new actions hang off the already-bound `WorkforceStaffController`. The commit extends an
  existing registered pair. Frontend half lands service + client + panel + an already-routed,
  already-navigated page (`pages/admin/workforce-roster.vue`) in one change.
- **C2** — no migration in either half. No chain contention with the lane holding the migration pen.
- **C1** — the backend revoke is a state transition on a mutable-by-design row, not a DELETE.
- **C5** — see below. Screenshots read, not just step names.

## C5 — what a person sees

Three journeys pass on chromium (`E2E_WEB_PORT=3316 E2E_FIXTURE_PORT=4316`):

1. `workforce-invitation-list-revoke` — *a manager sees which codes are still live, withdraws one*
2. `workforce-invitation-list-revoke` — *withdrawing a code somebody already used is refused*
3. `workforce-invitation-onboarding`

Read from the captures rather than asserted:

- `02-a-live-code-outstanding.png` — under **Tilgang** the panel now shows **UTESTÅENDE KODER** with
  a live code (*"Gyldig til 20. august kl. 20:10"*) and a **Trekk tilbake koden** button, in the exact
  place the absence sentence used to be.
- `03-after-the-withdrawal.png` — toast *"Koden er trukket tilbake."*, and the list reads
  *"Ingen ubrukt kode er utestående for denne personen."*
- `01-the-refusal-a-quiet-success-would-have-hidden.png` — the 409 renders as *"Koden er allerede
  brukt … Er det feil person som har kommet inn, må du avslutte engasjementet i stedet"*. The access
  line above it reads *"Denne personen har koblet en innlogging til engasjementet"* — the roster
  re-read the commit added, so the panel no longer denies a login directly above a band announcing one.

## The stale committed artifact

`artifacts/journeys/workforce-invitation-onboarding.playwright.json` on the trunk still carried the
step name *"the panel says what it cannot do before it offers the button"* and the note
*"no invitation list or revoke route exists"* — both made false by `e8d69fc`'s own diff, which
changed the spec but never regenerated the record. Regenerated the harness's documented way
(delete → re-run → `git add -f`); it now names `698383c`.

Its five `browser error during the invitation journey` findings are **byte-identical** to the ones
already on the trunk record — pre-existing, not introduced here. The only delta is the absence note.

## The four dirty files in `web-fe-invlist` — triaged, not adopted

`artifacts/journeys/workforce-invitation-onboarding.playwright.json` + 3 PNGs.

Contrary to the brief's reading, this is **not separate work**: it is the regenerated output of a
spec `e8d69fc` *does* change, so it is coupled to the pick. But it is **not worth keeping**, because
the capture names `"commit": "e34977a…"` — the *parent* — with a dirty tree, at 20:16 on 2026-08-04,
two hours *before* the 22:21 commit. It records the right screen against the wrong tree.
Superseded by the regeneration at `698383c`, which asserts the same two deltas (step rename, absence
note gone) from a clean tree. Nothing was folded in silently. The worktree is left untouched.

## Landing window

Backend trunk moved **`8e2b57de8` → `726906fe5`** between two reads minutes apart
(reflog: 20:04:40, 20:05:08, 20:06:08). `L-LAND-THE-BACKEND-ON-THE-TRUNK` has filed no return.
So neither half was merged — the pair must land together, and landing the frontend alone is the
failure `L-WFR-ACCESS-STRING-TRUTH` ruled against.

To land, once the backend trunk is free:

    git -C /Users/svendaneel/okam/OkamAPI-modules merge --ff-only lane/wf-invite-pair-be   # rebase first if it moved again
    git -C /Users/svendaneel/okam/Web-modules    merge --ff-only lane/wf-invite-pair-fe    # ff497c0 unmoved as of 20:13

## Hygiene

Own worktrees only; owner's checkout never changed branch or content. `node_modules` symlinked, no
`npm ci`/`npm install`. Ports 3316/4316; **3971/5971 never bound**. No container started, stopped or
entered. No `pkill`, no kill by pattern. Commits with `--no-verify`. Nothing pushed.

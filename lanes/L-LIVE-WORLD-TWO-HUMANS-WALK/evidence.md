# L-LIVE-WORLD-TWO-HUMANS-WALK — a manager and a worker complete one week-run in one live world

## The capture

`artifacts/journeys/workforce-week-run-two-humans.playwright.json` — `"backend": "live"`, `passed`,
16 steps, 8 screenshots, `backendServed 128` / `backendSubjectServed 94` /
`foreignSubjectServed 0` / `proxiedSubjectServed 0`,
`backendBuild = wt-lwtwo-api@8e2b57de…` resolved from the world stamp rather than declared.

The two accounts, read off what the app itself holds (`state.currentUser.id`, which is the id the API
resolved from the bearer) and not off the credentials typed:

| act | account |
|---|---|
| published the week | `6ba6dd27-42b0-4ba9-807b-96930c735f2f` (manager, power-user door) |
| acknowledged it | `9750cac8-acc5-4054-a16b-d18186b43016` (worker, demo door, created by the claim) |

`expect(workerUserId).not.toBe(managerUserId)` is asserted in step 9. Every live journey before this
one had one value there.

The proof of the acknowledgement is taken from the **manager's** publications page, not from the
button's own feedback (see the defect below): screenshot 08 shows
*Bekreftet av den ansatte (1) — Astrid Vik, 8/6/2026, 4:32:54 PM*, in the group whose own heading
says it is the only one whose receipt comes from the employee themselves.

## The world

`test/e2e/scripts/live-world.sh` **unmodified**, on my own resources:

    container   okam-lwtwo-sql  :15436   (started by me, --memory 2g)
    api         :5971  serving pid 96293, launcher 96289, from worktree /Users/svendaneel/okam/wt-lwtwo-api @ 8e2b57de
    web         :3971
    database    OkamLiveTwoHumans — 127 migrations from EMPTY, 211 tables, 25 append-only triggers
    store       1 "Two Humans Kafé", NO / NOK / Europe/Oslo, registered through POST /Stores/register

`docker ps` was empty and ~6.7 GiB of free pages were measured immediately before the container was
started; no foreign container was touched.

### Wall 1 — two sign-ins — closed by configuration, with no code change

`AppSettings__AdminUserPhoneNumber` and `AppSettings__PowerUserVerificationCode` were **generated at
run time** and exported into the shell that ran `live-world.sh`. The script's `dotnet run` at `:346-349`
inherits that environment, `Program.cs`'s `AddEnvironmentVariables()` binds it, and no line of the
script or of the API changed. `MANAGER_PHONE`/`MANAGER_CODE` are already parameters of the script, so
the manager is seeded through the power-user door and the demo pair is left free for the worker.

Verified from the source rather than assumed:

* `Controllers/UserController.cs:178-179` — the two no-SMS branches.
* `Controllers/UserController.cs:209` — `POST /User/sendverificationtoken` skips the SMS send for the
  power-user number exactly as it does for the demo one, so the **browser's** two-step sign-in works
  through both doors. Without this the modal would never reach the OTP boxes (`SendVerificationTokenAsync`
  itself does *not* exempt either number — `IsNoSmsPhoneNumber` names two unrelated numbers — so the
  exemption that matters is the controller's).
* `Services/UserService.cs:540` — `GetOrCreateAsync` skips Twilio Lookup for both numbers, so the
  account is creatable with placeholder Twilio credentials.
* `Services/PowerUserRoleSeed.cs:160` + `EnsureConfiguredAdminHoldsRoleAsync` — the role is granted at
  first token issue, so the allocation decision below is real rather than theoretical.

**The power-user door is on the MANAGER and the demo door on the worker.** `PowerUserRole` makes
`StoreAdminAuthorizationHandler.cs:17` succeed for *any* store; on a worker that would silently
falsify "a worker cannot reach the manager's pages". On the manager it only over-determines an
authorisation the seed already granted by membership.

### C7

Both halves were generated at run time and **neither is in this repository, in the artifact, in a
screenshot, or in any log**. They live only in the session scratchpad at
`…/scratchpad/lwtwo.env` (mode 600, outside the repo, un-committable). Every command that could print
them was piped through a redactor before its output was written; the banner line in
`live-world-run.txt` reads `manager PHONE-WITHHELD / CODE-WITHHELD`.

The committed power-user code (`F-POWERUSER-CODE-IS-COMMITTED`) was **not used and not spread** — the
generated value differs from it, and a sweep for all three values over this lane's directory, the
artifact, the pictures and the spec returns **0 files** for each.

The **claim token** is the fourth credential in this walk and it is handled the same way: it is held in
a local variable, never returned as a step detail, and the handover panel is **dismissed before any
screenshot is taken** (the fixture-world journey photographs its token; against a live backend that
would be a real one-time credential in a PNG). The record says only
*"a 43-character claim code was issued and withheld from this record"*.

### What was refused

A phone-change token was **not** used to manufacture a third identity. It is Identity TOTP keyed on
`AspNetUsers.SecurityStamp`, which a seed holding SQL access can read — that would make any user's code
computable offline and would install a general-purpose *become-any-user* primitive into the walk
tooling. The worker's account is created by the product's own path: `POST /staff` → `Invited` person
with no `ApplicationUserId` → endpoint 6 issues a claim code → endpoint 32 claims it.

## Falsifiability — both flags, proven twice each

`WorkforceFeatureFlags.DefaultOn` holds `workforce.setup` alone, so `workforce.publication` and
`workforce.selfservice` are deny-closed on a fresh store. The walk flips **both on `/admin/feature-flags`
as steps**, and each flip is preceded by a probe that presses the control while the flag is still down:

| probe | what the product answered |
|---|---|
| step 3, `Opprett utkast` with `workforce.publication` down | `.wf-page__conflict` — *"Vaktplanen er skrivebeskyttet · Bryteren workforce.publication står av for denne butikken"* + the link to the board; badge still "Ingen plan". `POST /schedules/drafts → 409` is in the artifact's own `failedRequests`. |
| step 11, `Bekreft mottatt` with `workforce.selfservice` down | *"Kunne ikke bekrefte mottak."*, notice still unread. `POST /me/publications/{id}/acknowledgements → 409`, also in `failedRequests`. |

Note the shape: the READS are deliberately ungated (§9.2 forbids gating a read), so the worker can see
the published week and the button and only the **write** is refused. That is the honest form of the gap
and the probe asserts it rather than asserting "the page is empty".

### And the flips are load-bearing, by mutation

Each `turnOn` was removed in turn, on a world restored to its clean image, with everything else byte-identical:

| mutation | result | where |
|---|---|---|
| `workforce.publication` flip removed | **RED** | step 7 — `Utkast opprettet` toast never appears; the draft is refused again (`lanes/…/red-1-no-publication-flip.txt`) |
| `workforce.selfservice` flip removed | **RED** | step 13 — `.wfme-pub` expected 0, received 1: the notice never goes away because the acknowledgement is refused (`lanes/…/red-2-no-selfservice-flip.txt`) |

Both mutants' artifacts are in `lanes/…/reds/` rather than in `artifacts/journeys/`, so a deliberate
red cannot be mistaken for a journey.

## Findings

### 1. `F-WF-ACKNOWLEDGE-SHOWS-NOTHING` reproduced live — and it is already fixed on two unmerged lanes

The worker presses `Bekreft mottatt` and is shown **nothing**: the notice vanishes, no receipt line, no
toast. The write lands (step 15 reads it back off the manager's roster). Asserted in step 13 rather than
narrated.

**But the brief's premise that this is open needs qualifying.** `L-WF-ACKNOWLEDGE-RECEIPT-VISIBLE`
(`8539b3f`) and `L-ACK-RECEIPT-SURVIVES-A-RELOAD-FIX` (`ce6892a`) carry the fix on
`lane/wf-acknowledge-receipt-visible` and `lane/ack-receipt-survives-reload`. **Neither is an ancestor
of this tree** (`lane/focustrap-teardown` @ `8ac6f63`), so the observation is true of this branch. The
moment either lands, step 13 must be **inverted, not deleted**.

### 2. NEW — a confirmed worker is labelled "no login yet — could not confirm from a screen"

Visible in screenshot 08. The row in the **confirmed** group reads:

> Astrid Vik · 8/6/2026, 4:32:54 PM · **ingen innlogging ennå — kunne ikke bekrefte fra en skjerm** · utsending: lagt i kø

inside a group whose own heading says *"Dette er den eneste gruppa der kvitteringen kommer fra den
ansatte selv."* The page contradicts itself in one line.

Cause, traced end to end:

* `Services/Workforce/WorkforceSchedulePublishService.cs:310` freezes
  `ClaimedByApplicationUserId = r.ApplicationUserId` **into the recipient row at publish time**.
* `WorkforceInvitationService.cs:317` sets the claim on the **invitation** row only; nothing back-fills
  publication recipients.
* `:490` returns that frozen column, and `utils/workforce/publication-receipts.js:200` maps it to
  `claimed`, whose own comment correctly says *"had claimed a login **when the publication was
  written**"*.
* `WorkforcePublicationReceiptGroup.vue:29` then renders `v-if="!row.claimed"` in **every** group,
  with a present-tense sentence.

So a point-in-time snapshot is printed as a present-tense capability claim. Its code comment says what
it is for — *"Without this, their empty row reads as somebody who ignored the plan"* — which is the
`none` group and only that group. In the confirmed group the flag is **self-contradicting by
construction**: a row can only be there because the person confirmed from a screen.

**This is walk-only by construction.** It needs somebody to claim a login *after* a publication and
then confirm it — a sequence no world on this branch could produce until this lane, and one no
component test can assemble.

### 3. HARNESS — a run's pictures are filed under a different backend key from its JSON

The record is at `runs/workforce-week-run-two-humans.live-5971-8e2b57d.playwright.json`; its pictures
are at `workforce-week-run-two-humans/live-5971-**unidentified**/`. One line:
`JourneyRecorder`'s constructor calls `store.backendKeyFor(meta)`, and `backendKeyFor` destructures
`{ backend, apiBaseUrl, **build** }` while `meta` carries `**backendBuild**` — so `build` is `undefined`
and the key falls to `UNIDENTIFIED`. `keyOfRecord` (`artifact-store.js:432`) maps the field correctly,
which is why the JSON is right and the pictures are not.

Not fixed here: it would change the picture path of every journey in the repo, and the artifact store
belongs to another lane. The record is still self-consistent — `screenshots[]` carries the literal
relative paths — but a reader joining pictures to JSON **by key** looks in the wrong directory.

### 4. NOTE — the publication list prints a raw actor GUID

`Publisering 1 · publisert 8/6/2026, 4:32:48 PM · **av ecf5f4f8-ad23-43ca-9e0a-2bf7c28cd342** · skrevet til 1`.
C4 is satisfied — the actor is frozen and named — but it is named to an operator as a staff-member id.

### 5. NOTE — 8 console errors, all one shape

`pageerror: Navigation cancelled from "/admin?redirect=…" to "/admin?redirect=…&storeId=1"` (6) and two
`Failed to load resource: 409`, which are the two deliberate probes. Recorded as findings, not asserted.

## Naming: why this is not `workforce-week-run`

`test/e2e/journeys/workforce-week-run.spec.js` and the journey id `workforce-week-run` are **already
taken** by `L-JOURNEY-WORKFORCE` (`4ef0d00`, on `lane/journey-workforce` and
`candidate/fe-compose-2026-08-05`) for the fixture walk of this same shape, and rewritten again by
`8539b3f` on top of the acknowledge fix. Neither is on this branch, so nothing collided at run time —
but leaving an untracked file of different content at that exact path in the **shared** checkout is a
merge hazard, and sharing the id would have put a live record asserting the **defect** into the
canonical slot of a journey whose other record asserts the **fix**, then outranked and blocked the
sibling's own runs.

The first run was made under the old id before this was discovered. Its record and pictures were moved
whole to `lanes/…/first-run-under-the-sibling-name/`, and the canonical copy
`artifacts/journeys/workforce-week-run.playwright.json` was deleted — which is the harness's own
documented gesture for handing that slot over. `artifacts/journeys/workforce-week-run/fixture/` (the
sibling's own leftover pictures, 2026-08-04) is untouched. The ledger keeps its two append-only lines
for that first run; nothing was edited there.

## Re-running it

The world is **left up and restored to its clean image** for the owner's own walk (C5 — no suite result
is acceptance):

    admin      http://127.0.0.1:3971/admin       api http://127.0.0.1:5971
    worker     99999999 / 123123   (the demo pair; claims a code the manager issues)
    manager    the generated pair — read it from …/scratchpad/lwtwo.env, which is where it lives and
               the only place it is written

    SQL_CONTAINER=okam-lwtwo-sql SQL_PORT=15436 DB_NAME=OkamLiveTwoHumans API_PORT=5971 \
      STORE_NAME="Two Humans Kafé" MANAGER_PHONE=… MANAGER_CODE=… \
      test/e2e/scripts/live-world-reset.sh restore

    E2E_API_BASE_URL=http://127.0.0.1:5971 E2E_WEB_PORT=3971 \
      E2E_MANAGER_PHONE=… E2E_MANAGER_CODE=… \
      npx playwright test test/e2e/journeys/workforce-week-run-two-humans.spec.js

`live-world-reset.sh` defaults `MANAGER_PHONE` to the demo number and `STORE_NAME` to
`Live Journey Kafé`; in this world both must be passed, or the restore's own post-check fails on a
world that is actually fine.

Teardown when the walk is done:

    kill 96293 96289 ; docker rm -f okam-lwtwo-sql ; git -C /Users/svendaneel/okam/OkamAPI worktree remove /Users/svendaneel/okam/wt-lwtwo-api

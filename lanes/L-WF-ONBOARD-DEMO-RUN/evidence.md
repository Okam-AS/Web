# L-WF-ONBOARD-DEMO-RUN — the demo joins a worker against a real database

**Verdict: the run holds.** `seed-workforce-demo.sh` at `de0811f6` ran end to end against a live SQL
world built from an empty catalog, and Nora reached `Claimed` through the shipped issue-then-claim
flow — not a SQL `UPDATE`. Her memberships and her schedule were read back as herself, off real rows.

## What was run, and where

| | |
|---|---|
| Backend commit | `de0811f6` (predecessor's, parent `8e2b57de`) |
| My worktree | `/Users/svendaneel/okam/wt-L-WF-ONBOARD-DEMO-RUN`, branch `lane/wf-onboard-demo-run` |
| SQL container | `okam-lwfodr-sql` — **started by me**, `-m 2g`, port 15437 |
| Database | `OkamDemoWfRun`, created empty, migrated from empty |
| API | `http://127.0.0.1:5093` (5091 was held by a foreign `WebApi`; I did not touch it) |
| Command | `lanes/L-WF-ONBOARD-DEMO-RUN/run-demo.sh` → `evidence/demo-run-{1,2}.txt` |

**It was run twice, each time from a freshly dropped and recreated catalog**, because one green run can
be luck. Both exited 0 with identical chain counts and different GUIDs throughout. The GUIDs quoted
below are from **run 2**, which is the world left standing.

The other five module seeds were skipped (`SKIP_MARGIN/EVENTS/GROWTH/MEALS/TRAINING=1`). This lane's
clause is the workforce join; each skipped seed is failure surface that is not mine to carry. Workforce
is the seed `demo-up.sh` treats as non-optional, so nothing was routed around.

## The chain applied from empty — the recorded 2705 hazard is NOT present here

```
== 3/5  Applying the migration chain from empty
   127 migrations, 211 tables, 25 append-only triggers      <- run 1
   127 migrations, 211 tables, 25 append-only triggers      <- run 2, catalog dropped and recreated
```

The brief warned of `SqlException 2705` from two migrations both adding `Orders.TableId`. **It did not
happen at `de0811f6`.** Only one non-Designer migration names that column — `20260709231226_POSv1.cs`,
and its two occurrences are the `AddColumn` in `Up` and the matching `DropColumn` in `Down`, which is
one migration, not two. The chain replayed from an empty catalog on the first attempt.

## Nora reached Claimed through the shipped flow

```
== 5b. Nora joins (POST staff/{id}/invitations -> POST /workforce/me/invitations/claim)
   Nora claimed her own engagement -> person 6b8beb8d-… is Claimed (+4790000001)
```

Checked against the rows, not the printout (run 1's world showed the same shape with other GUIDs):

```
Nora Berg   | Claimed | user=5d755b5a-434f-4a27-8265-c6674fbd1053   <- the worker's login, from step 1b
Jonas Lie   | Invited | user=<null>
Selma Haug  | Invited | user=<null>
Ingrid Moen | Claimed | user=2a0f5c19-…                              <- the bootstrap manager
```

Jonas and Selma are the built-in control: three staff were created the same way and only the one whose
invitation was claimed advanced. The invitation row stores `TokenHash = sha256:…` and nothing else,
`State = Claimed`, `ClaimedByApplicationUserId = 5d755b5a…` — the **worker's** login.

**C1 holds at the source too.** `WorkforcePersons` is named exactly twice in the seed: the bootstrap
`INSERT` for the first manager engagement (which has no endpoint by construction) and a comment. There
is no `UPDATE` and no `DELETE` against any workforce table in the script.

## Her work is visible to her — read back as herself, and the read is falsifiable

Step 14b printed real rows, not a shape:

```
Nora Berg  store=1  roles=Servitor  active=true
3 published shift(s) visible to Nora in week C
```

A read that always answers 3 would prove nothing, so both surfaces were probed for the negative
(`/workforce/me/…`, live API):

| probe | answer |
|---|---|
| `/me/schedule` week C (published) as the worker | `items: 3` |
| `/me/schedule` week B (draft, never published) as the worker | `items: 0` |
| `/me/staff-memberships` as the **manager** | only `Ingrid Moen` — never Nora's engagement |

So the schedule really filters on publication, and the membership list really is per-caller.

## The negative: the same token, two bearers

`evidence/caller-binds.txt` (`prove-caller-binds.sh`). One invitation issued once for Nora's
engagement, presented twice. **Nothing differed but the bearer.**

```
ATTEMPT 1 — the MANAGER presents Nora's token
   -> 404 {"code":"workforce.invitation-invalid","detail":"The invitation could not be claimed."}
   Nora's person after: Claimed user=5d755b5a…     (unchanged — not relinked to the manager)
   invitation after   : Pending claimedBy=<null>   (the refusal stranded nothing)

ATTEMPT 2 — the WORKER presents the SAME token
   -> 200 {"workforcePersonId":"6b8beb8d-…","personState":"Claimed","capabilities":["WorkforceSelf"]}
   invitation after   : Claimed claimedBy=5d755b5a…
```

Run twice, against two independently built worlds, with the ids **derived from the database** rather
than pasted — both times the manager 404s and the worker 200s on the same token.

This is the run that distinguishes the shipped flow from the `UPDATE` it replaced: the old statement had
no notion of a caller at all. Attempt 2 is what makes attempt 1 mean something — it proves the token was
valid and only the identity of the presenter changed the outcome. The refusal is the opaque 404 the
service documents (`WorkforceInvitationService.ClaimAsync`: the person is already bound to a *different*
login, and that fact is not disclosed).

The refused attempt wrote **no audit row** — the guard sits before the idempotency reservation, so a
refusal reserves nothing. The audit ledger carries the lifecycle and no credential:

```
invitation.issue | actor=201763f2-… (manager's staff id) | {"invitationState":"Pending"}
invitation.claim | actor=d347fe52-… (worker's login)     | {"invitationState":"Claimed","personState":"Claimed"}
```

C4 holds on both writes: each names the actor that caused it, and they are different actors.

## C7 re-checked against a real backend

The predecessor measured 0/7 against a stub. Against the live API, with the raw token held only in a
shell variable and delivered to `curl` over **stdin** (never argv, so never the process table):

```
raw invitation token in api.log : 0
raw invitation token in lane dir: 0 files
manager bearer in api.log       : 0
worker  bearer in api.log       : 0
```

Independently, `api.log` (675 KB of real request logging) contains **0** JWT-shaped strings.

**Two reds were mine, not the product's**, and both are worth recording because each is the shape that
normally passes unnoticed:

1. **The sweep cried wolf.** It printed `SOMETHING IS RED` while every count read 0: `grep -c` prints
   `0` *and* exits 1 on no match, so `|| echo 0` appended a second zero and the comparison ran against
   the literal `"0\n0"`. Fixed with a `count()` helper using `|| true`. The inverse of this bug is a
   sweep that silently passes.
2. **An identical GUID compared unequal.** `sqlcmd` renders a `uniqueidentifier` UPPERCASE; the API
   serializes the same GUID lowercase. The first version hardcoded lowercase ids and passed; the moment
   they were derived from the database the check went red on a value that matched. Fixed with a `guid()`
   helper that case-folds. **This one only surfaced because the world was rebuilt and the run repeated**
   — a hardcoded id in a demo harness is a check that stops meaning anything the first time the world
   changes underneath it.

## Container discipline

`docker ps` before starting anything showed `okam-lvsp-sql` (1.355 GiB of a **1.562 GiB** limit — the
OOM shape) and `okam-lwr-sql`, both up 2 days, neither mine. I started nothing until I had my own:

```
okam-lvsp-sql   started=2026-08-02T11:31:53Z   (untouched, still up)
okam-lwr-sql    started=2026-08-02T11:25:34Z   (untouched, still up)
okam-lwfodr-sql started=2026-08-04T19:55:56Z   (mine)
```

Mine is capped at 2 GiB and peaked at 1.101 GiB, so the host sat at ~3.7 GiB of its 8.2 GiB Docker VM.
I stopped nothing. **`okam-lwfodr-sql` is still running and the API is still on :5093** — the world is
left standing for Sven to walk (C5: a run is not acceptance either). Tear-down when he is done:
`docker rm -f okam-lwfodr-sql` and kill the `WebApi` on :5093.

## Walkable world

```
Store  : 1 (Bryggen Bistro, Europe/Oslo)   API: http://127.0.0.1:5093
Manager: 99999999 / AppSettings__DemoVerificationCode__REDACTED    Worker (Nora): 90000001 / AppSettings__PowerUserVerificationCode__REDACTED
Week A 2026-07-27..08-02 published (punches)  B 2026-08-03..08-09 draft  C 2026-08-10..08-16 published
Admin web: API_BASE_URL=http://127.0.0.1:5093 PORT=3002 npm run dev   ->  /admin/workforce-me
```

## Files

- `run-demo.sh`, `evidence/demo-run-1.txt`, `evidence/demo-run-2.txt` — the two runs, each from empty
- `prove-caller-binds.sh`, `evidence/caller-binds.txt` — the negative (against run 2's world)
- `evidence/api.log` — backend log (gitignored; swept, clean)

Nothing was committed and nothing pushed. The lane directory is untracked, matching the sibling's
convention; the backend worktree is a branch of my own (`lane/wf-onboard-demo-run`) with no commits on
it — I ran `de0811f6`'s script, I did not change it.

## Not mine, seen in passing

The anti-oracle the predecessor pinned is still true: there is no invitation **list** route and no
revoke verb, though `WorkforceInvitationState.Revoked` is declared — so a manager cannot see whether a
code is live. My world now carries three `Claimed` invitation rows for Nora's one engagement (the demo's
plus my two proof runs), which is legal but is exactly the state no screen can show.

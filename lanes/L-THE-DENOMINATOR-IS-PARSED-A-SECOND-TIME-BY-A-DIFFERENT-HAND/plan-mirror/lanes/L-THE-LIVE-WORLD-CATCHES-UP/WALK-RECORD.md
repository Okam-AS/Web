# The walk — L-THE-LIVE-WORLD-CATCHES-UP

**The world this record describes, named so it cannot later be read against a different one:**

| | |
|---|---|
| API | `http://127.0.0.1:5971` — `wt-lwtwo-api@81d06c10a8b7e6b9861a871dad0db1806d5109c9`, clean tree, pid 11713 |
| Web | `http://127.0.0.1:3971` — `web-livewalk@6b988398f059d19e2d62a82734ca7923fba6e480`, nuxt dev, listener pid 14269 |
| Database | `OkamLiveTwoHumans` on the borrowed `okam-lwtwo-sql` (:15436), store 1 = **Two Humans Kafé** |
| Walked as | manager `99681931` / `849666`, user id `6ba6dd27-42b0-4ba9-807b-96930c735f2f` |
| Walked at | 2026-08-07, 17:34–17:39 local |
| Stamp | `/Users/svendaneel/okam/web-livewalk/artifacts/world/live/127-0-0-1-5971.json` |

The binary this replaced was `wt-lwtwo-api@118f92fb9` — **56 commits behind**, not the ~50 estimated.
The web this replaced was `web-livewalk@6f74f87` — **43 commits behind** at the moment work started.

`okam-lwtwo-sql` and `okam-lwtwo-redis` were never stopped, restarted or exec'd into. Every SQL call
went over TCP. No worktree was created, so none was removed: `wt-lwtwo-api` and `web-livewalk` were
both already checked out and were advanced in place.

---

## Migrations: **zero applied**

The brief expected pending migrations. There were none, and the reason is checkable rather than
asserted: `git diff --diff-filter=A 118f92fb9..81d06c10a -- Migrations/` is **empty** — the 56
commits added no migration at all. `dotnet ef database update --connection … --no-build`, run over
TCP against `localhost,15436`, answered *"No migrations were applied. The database is already up to
date."* The chain is **137** migrations and its tip, already installed by the previous rebuild, is
`20260806125642_Growth_AuditLedger`.

The connection string was rebuilt from `test/e2e/scripts/live-world.sh:174` and never captured from
the environment. Related: the shells this estate runs are **zsh**, where unquoted `$VAR` does *not*
word-split — the inverse of the trap the brief warns about, and it silently produced an empty
`git diff` from a multi-path variable before it was caught.

---

## The other lanes' uncommitted work in `web-livewalk`

Eight modified files were found there, and they were **not** one lane's work but two, at two
different states. Measured rather than assumed, by diffing the working tree against the trunk:

| files | state found |
|---|---|
| `TrainingEvidenceDocument.vue`, `training-evidence.vue`, the `trn_ev_print*` strings | **already landed** — byte-identical to trunk |
| `WorkforcePublicationNotice.vue`, `workforce-me.vue`, `inbox-filter.js`, `wfme_pub_title_confirmed` | **not landed** — genuinely uncommitted |
| `wfpl_identity_gap` | **not a lane edit at all** — the working tree held the *older* text; trunk had superseded it |

So a blanket restore would have destroyed the workforce-me lane's work, and a blanket re-apply would
have reverted the `wfpl_identity_gap` rewrite and dropped the trunk's `wfpl_coderegister_*` copy. The
full diff was saved to `web-livewalk-uncommitted-at-6f74f87.patch`, the genuinely-uncommitted subset
to `wfme-lane-uncommitted.patch`, and only that subset was re-applied on the new tip.

**It then landed on its own.** While the walk ran, the frontend trunk moved `8db65dd → 6b98839`
(`Land lane/a-worker-sees-what-she-confirmed`), and those six files became byte-identical to the new
trunk. `web-livewalk` was advanced again and is now **clean** at `6b98839`: nothing preserved, nothing
lost, because it is all committed.

---

## The lever, turned on from a screen

The lever is **`Events.Dispatch`** — the per-store guest-link outbox drain. Screen:
`/admin/feature-flags`. Write: `PUT /stores/1/feature-flags`. The drain is a 15-second timer
(`EventsNotificationDispatchHostedService`), so no restart is involved.

The proof is sharp because **the board and the drain read the same gate**:
`EventsNotificationHealthService` resolves `dispatchEnabled` through `IsStoreFlagEnabledAsync`, which
is the identical call `EventsNotificationDrainService` makes before it draws a batch. The panel cannot
say one thing while the queue does another.

### Before — `/admin/events-pipeline` · `20-events-before.png`

> Utsending er slått av, så ingen gjestelenke forlater huset. **Venter: 10.**

And the queue was genuinely held, not merely reported as held: across **29** drain passes since the
API came up, the API log carries **0** SMTP connections and **0** delivery attempts. Nothing spent.

### The switchboard — `/admin/feature-flags` · `21-switchboard-before.png` → `22-switchboard-on.png`

The `Events.Dispatch` row read **Av · Standard: av · Ikke overstyrt · Faktisk: av**, above two
disclosures that exist only on this trunk — neither string was in the binary or the bundle that held
these ports before:

> **Før denne slås på:** hver lenke er en nøkkel — den som har den, åpner siden uten å logge inn. Å slå
> på sender ut hele køen som har samlet seg mens den sto av … En sendt e-post kan ikke kalles tilbake.

> **Når denne står av,** holdes lenkene tilbake — de forsvinner ikke … ingenting går ut, ingenting
> merkes som mislykket, og ingen forsøk brukes opp.

A note was typed into **BEGRUNNELSE** and **Slå på** was clicked. The row became:

```
På · Standard: av · Overstyrt for butikken · Faktisk: på
Sist endret av 6ba6dd27-42b0-4ba9-807b-96930c735f2f — 07.08.2026, 17:35 — L-THE-LIVE-WORLD-CATCHES-UP: …
```

The actor is the signed-in manager, stamped by the server from claims — the client never sends it.

### After — `/admin/events-pipeline` · `23-events-after.png`

> **Lenker sendes ut.** Venter på å gå ut: 10.

**That is the module's own surface changed by a store row written from another module's screen.**
Zero failed HTTP requests and zero console errors across the whole walk.

### And the pass changed behaviour, immediately

Within one 15-second tick the drain selected all ten of store 1's rows — where 29 earlier passes had
left them untouched. The API log went from 0 to **14** `Events notification delivery failed` lines
and 20 `UPDATE [EventsNotificationOutbox]` statements.

---

## What did not work, and why the queue was not drained

**Every attempt failed: `SslHandshakeException`, 14 of 14.** This world cannot deliver mail. Its
`AppSettings:SmtpFromPassword` is the appsettings placeholder — literally *"Set in Azure. For
development, set in User Secrets"* — and this machine's user-secrets store for
`1df35132-26a8-4882-9979-6b1151e63e2c` holds nine keys, **none of them SMTP**. The transport is
`SecureSocketOptions.SslOnConnect` against `send.one.com:465`; the handshake fails before AUTH, so no
credential left the machine and no guest was mailed.

So **the brief's "the next pass delivers and the queue drains" is not reachable in this world**, and
it was not claimed. What the queue does with the lever on is worse than not draining: five attempts
on a 30-second doubling backoff, so the whole backlog reaches **DeadLettered — terminal — in about
eight minutes**, which would have destroyed ten guest links a sibling lane's world state depends on
and left the board reading *Venter: 0* as though delivery had succeeded.

**So the lever was turned back OFF from the same screen** (`24-switchboard-off.png`), with a note
saying why, after one pass had proven the behaviour change. The world was left as found:

```
GET /events/admin/1/notifications/health  ->  dispatchEnabled false · queuedCount 10 · deadLetteredCount 0
```

Cost: 1 attempt on six rows and 2 on four, out of a budget of five. `25-events-held-again.png` shows
the board back at *«Utsending er slått av … Venter: 10.»*

**C7 checked, not assumed:** the API log carries zero recipient addresses, zero SMTP passwords and
zero connection-string passwords. `EventsNotificationDrainService` records only the exception *type*,
and `EmailService` redacts the recipient label.

---

## The tips moved, and this record says which one is current

`8db65dd` was the frontend trunk when the walk began; `6b98839` when it ended. The world was advanced
onto the newer one and re-checked in a browser rather than assumed — `26-switchboard-current-tip.png`
and `verify-current-tip.json`:

- `[data-precondition="Events.Dispatch"]` renders the lever copy added at `8db65dd` — **true**
- `window.$nuxt.$i('wfme_pub_title_confirmed')` answers **«Vaktplanen er bekreftet»**, the string added at `6b98839`

One bundle carrying both is a bundle built from `6b98839`. Backend trunk did not move: `81d06c10a`
at the start of the build, at the stamp, and at the last read.

*(`/_nuxt/app.js` answered 404 on the first attempt at this check. That is a fact about Nuxt 2 dev
chunk naming, not about the build, so it was replaced rather than reported as a finding.)*

---

## How to reproduce

```
node docs/plan/lanes/L-THE-LIVE-WORLD-CATCHES-UP/walk-events-lever.js       # before -> turn on -> after
node docs/plan/lanes/L-THE-LIVE-WORLD-CATCHES-UP/walk-events-lever-off.js   # turn off, queue left intact
node docs/plan/lanes/L-THE-LIVE-WORLD-CATCHES-UP/verify-current-tip.js      # the served build is the tip
```

Machine-readable records sit beside them: `walk-events-lever.json`,
`walk-events-lever-off.json`, `verify-current-tip.json`. The browser session state the first script
writes carries a bearer token and is deleted at the end of the lane rather than left in `docs/`.

---

## What this leaves open

1. **No world on this machine can prove Events delivery.** Until an SMTP sink the API can complete a
   TLS handshake against exists, `Events.Dispatch` can be shown to change the surface and to make the
   drain select rows, and cannot be shown to deliver one. Anything claiming a drained Events queue on
   this host is claiming a dead-lettered one.
2. **Turning the lever on for a real venue on this configuration destroys its backlog in ~8 minutes.**
   The row's own disclosure warns about mail that cannot be recalled; it does not warn about the
   opposite failure, where nothing is mailed and the links are spent anyway.
3. The two sign-in defects the previous walk recorded are **both still present** at `6b98839`: the
   `redirect` query is dropped after sign-in, and a click on «Send kode» before hydration does
   nothing. Both scripts here still carry the three-click retry loop that works around the second.

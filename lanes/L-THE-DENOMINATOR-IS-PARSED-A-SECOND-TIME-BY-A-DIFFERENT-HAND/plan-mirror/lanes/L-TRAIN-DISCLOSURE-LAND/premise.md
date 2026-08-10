# L-TRAIN-DISCLOSURE-LAND — the premise, re-measured

Every claim below was taken with `git show <ref>:<path>` / `git grep <ref>` against named refs.
**No working tree was read.** The frontend checkout at `/Users/svendaneel/okam/Web-modules` carries
hundreds of dirty foreign paths — one of them is `pages/admin/training-evidence.vue`, which git
reports as *"exists on disk, but not in `feature/restaurant-modules`"*. Reading that tree would have
answered the opposite question to the one this lane asks.

## Refs as measured 2026-08-06

| ref | repo | sha |
|---|---|---|
| `feature/restaurant-modules` (backend integration) | OkamAPI | `8e2b57de8442a389a9b5f8025312c9750614c85e` |
| `lane/train-disclosure` | OkamAPI | `06b8b582c12bc3a5073f1c365c2a84b8e53b9bea` |
| merge-base of the two | OkamAPI | `3579bbbc7707b38b76e9b119a0d2c31f988860aa` |
| `feature/restaurant-modules` (frontend integration) | Web-modules | `e34977acebd59b223584158c33451b6f1ffd82c1` |
| `candidate/fe-compose-2026-08-05` | Web-modules | `f40fdf36cfe446cde5212eb8927616a8c9ba8cf6` |

Divergence: `git rev-list --left-right --count feature/restaurant-modules...lane/train-disclosure`
→ **59 / 1**. The lane is one commit off a base the integration branch has since left by 59.

## Half 1 — the route exists on one branch and nowhere else. CONFIRMED.

The route is `GET training/stores/{storeId:int}/evidence/disclosures`
(`[Route("training/stores/{storeId:int}")]` + `[HttpGet("evidence/disclosures")]`,
`Controllers/TrainingController.cs:34,425` at `06b8b582`).

Scanned **332 local branches and 15 remote-tracking refs**, two independent probes:

- literal `evidence/disclosures` over `Controllers/ Services/ Models/` → **one hit**,
  `lane/train-disclosure:Controllers/TrainingController.cs`
- symbol `ITrainingDisclosureService` over `Controllers/ Services/ Program.cs` → **one hit**,
  `lane/train-disclosure`

At the integration tip `8e2b57de` the controller carries `[HttpGet("evidence")]` — the pack read —
**and no `evidence/disclosures`**. So the pack read is served and the disclosure log is not.

**The rows exist at the integration tip already.** `Services/Training/TrainingEvidenceService.cs`
at `8e2b57de` declares `DisclosureEventType = "evidence.read"` and calls
`RecordDisclosureAsync(storeId, actor, personRef, response, ct)` on every pack read. The fact has
been captured on the shipped branch the whole time; only the route that returns it is missing.

## Half 2 — the shipped panel calls it from two admin pages. CONFIRMED.

At the frontend integration tip `e34977ac`:

- `components/admin/training/TrainingDisclosurePanel.vue` exists.
- `utils/training/training-client.js:352` →
  `this._request('GET', this._base(storeId) + '/evidence/disclosures' + query)`, exported as
  `GetDisclosures(storeId, personRef)` (line 350).
- Mounted on exactly **two** pages:
  - `pages/admin/training-courses.vue:96` (manager surface, `asksForAPerson`), driven by
    `lookupDisclosures(personRef)` at line 520.
  - `pages/admin/workforce-me.vue:246` (the worker's own record), driven by
    `loadMyDisclosures()` at line 571.

Both are **explicit-action, never on mount** — the pages say so in comments, because the read itself
appends a disclosure row. So the 404 does not fire on page load; it fires the moment somebody presses
the button.

### What the person actually reads today

`readDisclosures(payload, error)` (`utils/training/disclosure.js:28`) maps the failure through
`stateOfError` (`utils/training/journey.js:99`), which returns `READ_REFUSED` only when the error
carries a `training.*` code and `READ_UNKNOWN` otherwise. **A 404 from an unmounted route carries no
`training.*` code**, so both mounts fall to the `unknown` branch and render
`data-test="disclosure-unknown"`:

> **"The lookup did not answer."** (`translations/en.ts:4557`)

Not a crash, not a refusal, not an empty log — an inert honest-unknown note, which is the right
behaviour and also the reason nobody has noticed. The panel's three-state discipline is what has kept
a missing endpoint looking like a quiet day.

## Half 3 — the reachability question: is one merge still not enough? YES, still true.

`git merge-base --is-ancestor feature/restaurant-modules candidate/fe-compose-2026-08-05` → **true**,
`rev-list --left-right --count` → **0 / 105**. The frontend compose is a **fast-forward**.

What the compose adds that bears on this walk:

| path | integration `e34977ac` | candidate `f40fdf36` |
|---|---|---|
| `pages/admin/training-evidence.vue` | absent | present, 362 lines |
| `components/admin/training/TrainingEvidenceDocument.vue` | absent | present, 496 lines |
| `utils/training/evidence.js` | absent | present |
| `training-client.js` → `GetEvidence(storeId, personRef)` | **absent** | line 369 |
| nav entry `/admin/training-evidence` | absent | `components/organisms/AdminPageHeader.vue:391` |
| `TrainingDisclosurePanel` mounts | training-courses, workforce-me | unchanged — same two |

On the frontend integration branch there is **not even a client method** for the pack read. So:

- **Backend merge only** (my merge, frontend left at `e34977ac`): the disclosure panel answers. But
  no browser surface performs a pack read, so the only rows a manager can ever see are the
  `disclosure-log.read` rows their own lookups wrote. The log is readable and has nothing in it but
  the reader's own footprints — the journey's "read the entry your own pack read created" is
  unwalkable because the pack cannot be opened.
- **Frontend compose only** (candidate composed, backend left at `8e2b57de`): a manager reaches
  `/admin/training-evidence` from the nav, presses *hent*, the pack renders, and the server silently
  appends the `evidence.read` disclosure. Then the disclosure panel on `training-courses` says
  **"The lookup did not answer."** The entry is written and unreadable — precisely the shape
  `L-TRAIN-DISCLOSURE` was opened to fix, now one layer out.
- **Both**: walkable end to end.

**The brief's claim holds against today's refs.** Neither half alone gives
`L-JOURNEY-TRAINING` its exit; the frontend half is a fast-forward and the backend half is the real
merge below.

## Constraint check on the change being landed (`06b8b582`)

- **C1** append-only — no `.Remove(`, `.Update(`, `ExecuteDelete`, `ExecuteUpdate`, `DELETE FROM` or
  `UPDATE ` added anywhere in `Services/ Controllers/ Models/`. The disclosure service reads the
  ledger and appends to it.
- **C2** migrations — the diff contains **no `Migrations/` path**. No chain author conflict.
- **C3** reachability — controller action, `ITrainingDisclosureService` interface, implementation and
  the `services.AddScoped<…>` registration in `Program.cs:1149` all land in the same commit. The
  frontend caller was already shipped; this merge is what closes the gap in the other direction.
- **C4** actor — `TrainingDisclosureService` resolves the actor via `ActorClaims.TryResolveUserId`
  and `IWorkforceCallerIdentity`; the subject branch never reads `personRef` from the query string.
  No money-path write.
- **C7** secrets — the diff adds **no** `ILogger` / `LogInformation` / `TrackEvent` call at all.

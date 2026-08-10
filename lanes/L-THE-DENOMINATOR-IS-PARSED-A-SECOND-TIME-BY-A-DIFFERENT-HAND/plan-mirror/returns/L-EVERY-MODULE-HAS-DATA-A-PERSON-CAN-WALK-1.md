```
RETURN: L-EVERY-MODULE-HAS-DATA-A-PERSON-CAN-WALK
brief: 51d7549d
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-EVERY-MODULE-HAS-DATA-A-PERSON-CAN-WALK/EVIDENCE.txt
log:
All six modules have a named seed a person runs plus a browser capture of what it put on that module's own admin surface; EVIDENCE.txt in the lane directory pairs them.
One command shape for all six: API_BASE, MANAGER_PHONE/MANAGER_CODE, STORE_NAME, then Scripts/demo/seed-<module>-demo.sh. Workforce also takes WORKER_PHONE/WORKER_CODE.
Ran all six back to back against :5971: six exit 0, and the wire census before and after is identical. Each also converged over three or more consecutive runs of its own.
Walked all six as the manager in Chromium -- margin, events, workforce, training, meals, growth. Zero console errors, zero responses at or above 400, and all six are linked in the nav.
DEFECT margin: PUT /margin/recipes/{id}/product-links demands If-Match carrying the recipe revision. The seed sent none, died on a 400, and had never reached its own step 7.
DEFECT workforce: PUT .../roles is named an upsert but keys on nothing, so a repeat call minted a second Kokk and a second Servitor on store 1. Both rows are still there.
DEFECT workforce: workforce.personnel-list is absent from the shared flag catalog, so the operator lever refuses it while the SQL bootstrap inserts it straight into StoreFeatureFlags.
DEFECT growth: GrowthNewsletterService.RequireContent checks contentJson is non-empty and never parses it, so a mangled body stored with a 200. Repaired through PUT, not by deleting.
FALSE CLAIM corrected: seed and RUNBOOK 9 both said Features:Meals never binds, so 21 of 23 routes are dark. Program.cs:887 calls AddMealsFeatureOptions and every one answers 200.
The Meals funded-order wall was a stale probe: /v1/meals/quotes carries no stores/{id} segment. The store-scoped route answers 400 from its own validation. Section 9 is rewritten.
GAP: GET /workforce/stores/{id}/invitations landed after 8e2b57de8, which is what :5971 runs, so it answers 404 here. Reissue supersedes, so the seed converges anyway.
Workforce gained a second entry condition. Adopt mode writes no SQL, so it has no clock punches, and it drops shifts falling outside an adopted engagement's own active window.
Growth used to manufacture consent, hashing a token it invented and inserting the grant. Gone. It captures over the public route; no seed can confirm -- that token lives only in a mailbox.
The brief's Growth line -- 22 products, 12 orders over 8 statuses -- names nothing on that surface. Growth holds 5 consented, 2 pending, 2 newsletters and an audience of 5.
Six backend commits on lane/every-module-has-data, tip 1f6487e92 off trunk a1c1a6dff, unpushed. No container touched, no server restarted, no migration authored.
END RETURN
```

## Detail

### The six pairs

| Module | Seed | Capture | What the screen shows |
| --- | --- | --- | --- |
| Margin | `Scripts/demo/seed-margin-demo.sh` | `walk-margin.png` | 15 recipes, 9 linked dishes, the exact/floor/true-zero/no-price states |
| Events | `Scripts/demo/seed-events-demo.sh` | `walk-events.png` | 15 enquiries across 9 states, guest links read back off the wire |
| Workforce | `Scripts/demo/seed-workforce-demo.sh` | `walk-workforce.png` | week 32 draft: an open shift priced as a floor, one shift `Mangler sats`, `Ingen sum` |
| Training | `Scripts/demo/seed-training-demo.sh` | `walk-training.png` | 6 courses, 4 assignments, 5 completions, 9 certificates over three states |
| Meals | `Scripts/demo/seed-meals-demo.sh` | `walk-meals.png` | 3 companies on Active corridors, 10 attributed orders |
| Growth | `Scripts/demo/seed-growth-demo.sh` | `walk-growth.png` | consent standing 5/0/0/2, newsletter #1 Approved and #2 Draft |

`walk-modules.js` in the lane directory is the walk. It signs in once and, per page, writes the
rendered text plus a full-page screenshot and records every console error and every response at or
above 400. It takes the verification code from the environment and carries no credential of its own.

It does **not** use the Playwright MCP tool: that tool holds one shared browser profile and another
lane already had it open (`Browser is already in use ... use --isolated`). Driving `playwright-core`
directly from the lane needs no lock and cannot disturb whoever holds it.

### What "a seed a person can run" turned out to mean

Every one of the five non-Training seeds was written for an **empty** database and could not be run
against the world the owner is looking at. Three of them failed outright on the first attempt, and
the failures are the useful part:

* **Margin** died at its own step 7 on a missing `If-Match`. Nothing about the seed had ever linked a
  recipe to a dish, so that half of the module had never been produced by the script that claims to
  produce it.
* **Workforce** refused to start: it looks for `Bryggen Bistro` in SQL and dies if the store exists.
* **Growth** and **Meals** both stopped inside `docker exec` against a container that is not theirs.

The correction is the same shape in all five: look the row up by the name it would be written under
and return what is already there. Convergence is then a property to check rather than a hope —
`margin` 15/9, `events` 15, `workforce` 6 staff and 5/5/8 assignments, `training` 6/4/5/9, `meals` 3
companies, `growth` 2 newsletters and snapshot 2, each stable over three or more consecutive runs and
over the final back-to-back pass of all six.

### The two entry conditions on Workforce

`seed-workforce-demo.sh` now decides from the manager's **own `adminIn`** — the token's admin list,
not a name and not a SQL probe — whether it is bootstrapping an empty database or adopting a world
somebody else stood up. Adopt mode touches no database at all.

Three consequences, each printed by the run rather than left to be discovered:

1. **No clock punches.** The bootstrap writes them in SQL; the only HTTP path,
   `POST /workforce/pos/clock-events`, needs a POS operator session (register, operator, PIN, OD-2
   verification). Attendance shows planned minutes with no actuals; the hours export has a header and
   no rows.
2. **The worker link is an invitation.** The bootstrap `UPDATE`s `WorkforcePersons`. Adopt mode issues
   the real one-use invitation and stops there, because claiming it is the worker's act.
3. **Shifts are dropped, not forced.** An adopted engagement carries the active window somebody else
   gave it. `Nora Berg` on this world is active only from `2026-08-10`, so her three week-A and three
   week-B shifts are a `422 workforce.assignment-invalid` that kills the whole batch at `itemIndex 0`.
   Widening her window would be editing a personnel record to make a script pass.

### Findings, in the order they were hit

1. **`PUT /margin/recipes/{id}/product-links` requires `If-Match`.** `MarginRecipesController` routes it
   through `RunWithIfMatch`, so an absent header is a flat 400: *"An If-Match header (the resource
   revision) is required for this mutation."* The token is the **recipe's** revision, not the version's
   — which is what step 6's `activate` sends, and why the omission looked survivable.
2. **`PUT /workforce/stores/{id}/roles` has no natural key.** It is named `UpsertRoles`, but a second
   call with an identical body mints a second row with the same name. Two runs left store 1 carrying
   two `Kokk` and two `Servitor`; a by-name id lookup then returns two ids, and the third run died with
   a malformed URL rather than a message. Not repaired here — there is no delete route, and removing a
   role somebody may have scheduled against is not a seed's call.
3. **`workforce.personnel-list` is not in the shared flag catalog.** `PUT /stores/{id}/feature-flags`
   answers `Unknown feature flag: workforce.personnel-list`, while the SQL bootstrap inserts that exact
   key straight into `StoreFeatureFlags`. A bootstrapped store therefore holds a flag no operator can
   ever set or clear from the product. (`workforce.module` is in the catalog and *not* in the seed's
   list — the mismatch runs both ways.)
4. **`GET /workforce/stores/{id}/invitations` does not exist on this API.** It is on the trunk at
   `WorkforceStaffController.cs:181` and absent at `8e2b57de8`, which the live API was built from, so it
   answers 404 on `:5971`. The seed names the gap and reissues instead; reissue supersedes the previous
   token rather than adding one, so exactly one invitation stays outstanding.
5. **`GrowthNewsletterService.RequireContent` never parses `contentJson`.** It checks the subject and the
   content are non-empty and stops there, so a body that is not JSON at all is stored and answered with a
   200 — and would be dispatched. Hit for real: a bash 3.2 brace expansion mangled a jq-built body inside
   `$( )`, the first request went through, and newsletter 2 landed with a broken `contentJson`. Repaired
   through the product's own `PUT /v1/growth/stores/1/newsletters/2` (now v2, still Draft), never by
   deleting the row.
6. **The Meals module was not dark, and both the seed and the runbook said it was.** The header and § 9
   asserted that `Configure<MealsFeatureSettings>` is never called, so `Features:Meals` never binds and 21
   of the module's 23 endpoints answer an opaque 404 *in every deployment*. `Program.cs:887` calls
   `services.AddMealsFeatureOptions()`. Every route § 9 now lists was called against `:5971`: the company
   account, membership, statement, reconciliation and me-companies reads all answer 200, and
   `POST /v1/meals/companies` — the route the seed inserted around — answers 200 too.
7. **The Meals funded-order "wall" was a stale probe.** The seed POSTed `/v1/meals/quotes` with no
   `stores/{id}` segment and read the 404 as a gate. The route moved under the store path in `e4e9d760a`,
   an *ancestor* of the build this world runs; `POST /v1/stores/1/meals/quotes` answers
   `400 MEALS_BAD_REQUEST "The cart total to fund must be a positive minor-unit amount."` — the ordering
   gate letting the request through to its own validation. An unrouted path and a gated one both answer
   404, which is exactly why the seed distinguishes them by body.
8. **`demo_signin_poweruser` cannot be pointed at this world.** `POWERUSER_PHONE="${WORKER_PHONE:-...}"`
   has no override of its own and `+4790000001` cannot sign in here. Both child seeds now resolve whichever
   identity actually holds `PowerUserRole`; `demo-common.sh` was left alone so other lanes' seeds are
   unaffected.
9. **Two Training screen defects re-observed**, both already recorded by `L-TRAIN-DEMO-SEED-COMPLETES`:
   every completion row renders `—` in the *Kurs* column, and *Ny tildeling* reads *«Ingen publisert
   versjon å tildele»* while five courses on this store carry a published version.

### What no seed can perform, in any mode

* **Growth cannot confirm a capture.** The grant is written by
  `POST /v1/growth/subscription-confirmations`, which takes the single-use token from the confirmation
  email; that token lives only in the guest's mailbox and only its SHA-256 is persisted. The seed used
  to *manufacture* the consent — hash a token it invented, insert the grant — which is the one thing
  this module exists to make impossible. It is gone, and the run now says what it therefore does not
  produce: no new consented contact, no withdrawal, no suppression.
* **Growth's public routes are rate-limited for real.** The third run inside fifteen minutes meets the
  per-address cap; the run reports the `429` and carries on, because the contacts it wanted are there.
* **Meals writes no statement and no quote.** The statement surface is append-only and a quote moves
  real budget; neither could be adopted on a re-run.
* **Meals writes no funded order.** A quote reserves real budget against a company account, so it could
  not be adopted on the next run. Walk it from a cart if you want to see that half.
* **The Meals concierge-only signing gate is unmeasured here.** A plain store admin should get a 403 on
  `POST /v1/stores/1/meals/companies/{id}/agreements`, but the only store admin of store 1 *is* the
  PowerUser — there is no un-privileged identity to be refused, and running the probe under the privileged
  one would write a second real corridor.
* **Events stops at a requested deposit.** Issuing one calls the live Vipps `Initiate`, and committed
  appsettings carry placeholders — so `Bryllupsmiddag Haug/Berg` sits at `Godtatt` rather than
  `Venter på depositum`, exactly as the runbook already says.

### One row this lane leaves behind

The Meals duplicate-corridor probe reserves an idempotency receipt and then throws, stranding it. It is
given a **stable** key, so that is exactly **one** dead receipt row for all time — the first run sees the
guard's 400, every later run sees that row answering 409 — rather than one per run. It is not deleted:
receipts are the record of what was attempted.

### A correction to what the brief recorded

The brief lists Growth as holding *22 products, 12 orders across 8 statuses, a newsletter approved and
unsent*. The newsletter is real. The products and orders name nothing on Growth's surface — that module has
neither — and look like another module's record. What Growth actually carries on this world: 5 consented
contacts, 2 pending invitations, 0 suppressed, 0 withdrawn, 2 newsletters (#1 Approved, #2 Draft) and an
audience snapshot of 5.

### Constraints

* **C1** — no `UPDATE` or `DELETE` against any append-only table, and no SQL written at all against the
  live world. Rate timelines, price rows, completions, settlement lines and statements are **matched and
  skipped**, never superseded to make a re-run pass: a superseding rate row is a real, permanent, wrong
  entry on somebody's wage history.
* **C2** — no migration authored.
* **C3** — all six pages were confirmed reachable from the navigation in the rendered text of every walk.
* **C4** — every write carries the manager's own bearer as actor; nothing was written by a job or a
  webhook path.
* **C5** — met by a person's screen: six full-page captures plus the rendered text, zero console errors
  and zero responses at or above 400.
* **C7** — the walk takes `MANAGER_CODE` from the environment. The runbook section names the world and
  **not** its codes: unlike the `123123`/`747475` of § 4 those are not configuration defaults, and a
  runbook that writes them down turns a laptop code into a checked-in one. `*.log` is gitignored, which
  is why the run logs beside `EVIDENCE.txt` may still print them.

### Housekeeping

Backend worktrees `/Users/svendaneel/okam/wt-everymoduledata` (off `a1c1a6dff`) and
`/Users/svendaneel/okam/wt-emhd-fix` (off the lane branch, to correct the runbook after the Meals
finding landed) were both created by this lane and both **removed**.
The branch `lane/every-module-has-data` survives at `1f6487e92`, unpushed. No other worktree was touched.
`okam-lwtwo-sql`, `okam-lwtwo-redis`, `:5971` and `:3971` were not touched, nothing was restarted, and no
container was started or stopped.

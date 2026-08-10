# L-LIVE-WALK-MARGIN — attempt 2 (brief 4a0358f1): the supplier-to-plate walk against a live backend

**STATUS: PASSED LIVE.** `margin-supplier-to-plate` ran green in 29.3s against a real SQL Server
catalog, the whole migration chain replayed from empty, and a WebApi built from the
feature/restaurant-modules tip — after two product/fixture defects the run itself surfaced were
fixed. Artifact: `live-pass/margin-supplier-to-plate.live-5941-6d53280.playwright.json` in this
directory — `backend: "live"`, `status: "passed"`, `backendBuild:
OkamAPI-wt-L-LIVE-WALK-MARGIN@6d5328004b831b3ec99424b73c4d05e1d6077dc8` (via the pid-verified world
stamp), five step screenshots beside it, and the ONLY refused request in the whole walk is the
REQUIRED dark-module status 404 the closing step asserts. It also holds the canonical slot
(`canonical.playwright.json`): live outranks every fixture capture.

## The worlds met on arrival (all foreign, none touched destructively)

- `:5091` — the owner's six-module demo world (`OkamAPI-modules/bin/.../WebApi`, DB `OkamDemo`).
  READ-ONLY probes only (one demo login + `GET /feature-flags/catalog` → 200). Never written, never stopped.
- `:5971` — the stale standing world (build `wt-lwtwo-api@8e2b57de`, stamp DEAD: it names pid 96293,
  the socket is held by pid 11713). Probed read-only, see the flag correction below. Never touched.
- SQL: `okam-lwtwo-sql` (up 2 days, port 15436, hosts `OkamLiveTwoHumans`) — BORROWED per
  live-world.sh's own design; my catalog `OkamLiveMargin` created beside it. No container started,
  no foreign container stopped, port 4010 never bound.

## F-THE-STANDING-LIVE-WORLD-CANNOT-READ-ITS-OWN-FLAGS — the 401 does not reproduce under a fresh bearer

Measured 2026-08-09 ~13:25 against `:5971`, with a token minted by ITS OWN `POST /User/login`
(+4799999999/123123):

    /user                    -> 200
    /feature-flags/catalog   -> 200
    /stores/1/feature-flags  -> 403   (Forbid — a membership/store-scope answer, not an auth answer)
    /margin/status?storeId=1 -> 403

`StoreFeatureFlagsController` is plain `[Authorize]` at BOTH 8e2b57de and trunk 6d5328004 — no
auth-scheme change to blame. Whatever bearer produced the recorded 401s, a bearer minted against the
world as it stands now reads the catalog fine; the remaining refusal is 403 and is about WHO the
token is (StoreAdmin membership on that world's store), not about the flag routes. The flag's
sentence — "cannot read its own flags" — did not hold at re-measurement time.

## The world this lane built (mine to stop, and how)

- Web worktree: `/Users/svendaneel/okam/Web-modules-wt/L-LIVE-WALK-MARGIN` — branch
  `lane/live-walk-margin` off `b704d45e`. node_modules APFS-cloned from the primary checkout;
  `core/` borrowed at run time via `OKAM_CORE_PATH=/Users/svendaneel/okam/Web-modules/core`.
- API worktree: `/Users/svendaneel/okam/OkamAPI-wt-L-LIVE-WALK-MARGIN` — detached at trunk
  `6d5328004` (feature/restaurant-modules tip). Read-only apart from build outputs.
- World: `bash test/e2e/scripts/live-world.sh` with `SQL_CONTAINER=okam-lwtwo-sql SQL_PORT=15436
  DB_NAME=OkamLiveMargin API_PORT=5941 WEB_PORT=3941`. 137 migrations replayed from empty,
  223 tables, 33 append-only triggers. Stamp:
  `artifacts/world/live/127-0-0-1-5941.json -> OkamAPI-wt-L-LIVE-WALK-MARGIN@6d5328004b831b3ec99424b73c4d05e1d6077dc8`.
- Transcript: `Web-modules-wt/L-LIVE-WALK-MARGIN/artifacts/live-world-stdout.log` (green end-to-end,
  EXIT=0 on the second run; the first run's only failure was this lane's own too-strict read-back,
  corrected — see finding 2).

## The seed extension (live-world.sh step 5c — the furniture, through the product)

The walk asserts a world the small live world did not build: TWO pre-existing suppliers and a dish
"Vaffel med rømme" priced on two bases. Step 5c plants exactly that and nothing else:

1. `PUT /stores/1/feature-flags {Margin.Module, enabled:true}` — scaffolding; Margin's gate
   COALESCES (`override ?? empty allow-list`), so the override wins, which is also the walk's own
   lever mechanism.
2. `POST /margin/suppliers` ×2 — Bergen Storkjøkken AS, Nordane Kaffe (module-gated routes, hence 1).
3. `POST /Products` — Vaffel med rømme, `wholeAmount 34/fraction "50", tax 15,
   tablePriceEnabled, tableAdditionalWholeAmount 15/"50", tableTax 25` → amount 3450,
   TableAdditionalAmount 1550 → Base gross 3450 @15 % = net 3000; Table gross 5000 @25 % = net 4000.
   (Not module-gated: the POS catalog.)
4. Read-back off the wire: suppliers=2; menu-margin nets Base 3000 / Table 4000 minor.
5. `DELETE /stores/1/feature-flags?flagKey=Margin.Module` — scaffolding removed; dark re-proven
   (see finding 2) and overrides back to 0. No ingredient, item, price or recipe seeded — the walk
   authors those, and `[data-test="ingredients-empty"]` is one of its assertions.

## Finding 1 — the third price basis, now OBSERVED (predicted unrun by attempt 1)

`GET /margin/menu-margin` on the live world answers **3 basis rows** for Vaffel med rømme (Base,
Table, Delivery) where the fixture's world declares 2. `MarginProductCatalogReadModel.Bases` emits
every basis unconditionally; with the delivery mode off the Delivery row prices as Base (no
supplement, base VAT 15 %, net 3000). The walk addresses rows by `data-basis` and its page-wide
`mm-withheld` count is unaffected by a fully-priced Delivery row, so no assertion had to move for
this. A venue DOES see a "Hjemlevering" price row for a dish it never sells for delivery — a
rendering fact every fixture capture in the estate hides.

## Finding 2 — the dark module refuses its own status read; the fixture serves it

The seed's first read-back after clearing the override expected `/margin/status` →
`{flags:{module:false}}` and the live wire answered:

    404 {"code":"margin.not-found","detail":"The requested margin resource was not found."}

That is the product's DESIGN: `MarginStatusController` gates its own status read
(`EnsureModuleAccessibleAsync` → 404 while dark — module-invisible, MARG-L10, the controller's own
doc comment). The page knows: `pages/admin/margin-suppliers.vue` `init()` maps exactly this coded
404 to the module-off blocker in its catch. The FIXTURE routes `/margin/status` ABOVE its
dark-module guard (`test/e2e/fixture/margin.js:817` vs `:836`) and answers 200 with
`flags.module:false` — so every fixture capture of this walk records **zero refused requests** as a
property of the stand-in: on a real backend, a venue's first visit to the dark surface COSTS a
refusal. The walk's closing step (`expect(journey.failedRequests).toEqual([])`) was therefore only
ever true of the fixture. Change made: the closing step now holds each mode to its own truth — in
live mode the dark-state `GET /margin/status` 404(s) are REQUIRED and are the only refusals allowed;
in fixture mode zero refusals remains the assertion. Everything else refused still fails the walk.

## Finding 3 — THE HEADLINE: the shipped page cannot link a recipe to a dish at all; the fixture said it could

Live run 1 (46.5s in) failed at the step "sell it as a dish and activate it": the menu-margin table
drew no `mm-row` for the linked dish, and the recipe list read «Ikke koblet til noe produkt». The run
artifact's wire record names the cause:

    PUT /margin/recipes/{id}/product-links?storeId=1  ->  400

`utils/margin/recipe-client.js` `SetProductLinks` sent **no If-Match**, and its comment asserted as
fact that "the controller routes it through `Run` … and asks for no header". The shipped controller
(`MarginRecipesController`, trunk 6d5328004) routes the replace-set through `RunWithIfMatch`, whose
comment states the requirement is deliberate ("Required, not honoured-when-supplied") **and records
the gap**: "the one caller of this route sends nothing today." So at trunk, the product's ONLY caller
of this route is refused 400 `margin.revision-required` on every link save — the capability "a chef
sells a recipe as a dish" did not exist end-to-end. The fixture modelled the CLIENT's stale belief
(its PUT product-links checked no If-Match), so both margin recipe walks captured green over the
unreachable half. C3's exact shape, found only when something real answered.

Second-order observation: the walk's own `[data-test="failure"]` `toHaveCount(0)` after the link save
passed against the failing save — `toHaveCount(0)` is satisfied by the instant before the refusal
renders. The page DID hold an error path (`saveLinks` catch → `fail(e)`, and the code↔message maps
for `margin.revision-required` already existed on the page); the assertion raced it.

Fix (in this lane's worktree, branch `lane/live-walk-margin`):
1. `utils/margin/recipe-client.js` — `SetProductLinks(storeId, recipeId, links, revision)` routes
   through `_mutateWithRevision` (the same quoted-`If-Match` plumbing activate/retire already use);
   the false comment replaced with the true contract.
2. `pages/admin/margin-recipes.vue` `saveLinks` — passes the RECIPE's revision, preferring the
   recipes-list row (re-read after every mutation on the page) over `this.detail.revision`.
3. `test/e2e/fixture/margin.js` — the PUT product-links route now enforces `checkRevision(ctx,
   recipe)` (400 required / 400 invalid / 409 stale), so fixture mode holds the contract live mode
   proved.

## Finding 4 — the fixture divided every plate cost by the portion count; the walks' entered quantity rode the error

Live run 2 (after the If-Match fix) got the link to LAND — and the Base plate rendered **kr 36,00**
where the walk asserts **kr 4,50**. Both numbers are honest answers to different questions:

- product (`MarginMenuMarginService.cs:109`): `plate = HalfUpOre(QuantityPerSoldUnit * BatchCostMinor)`
  — the quantity is how many recipe YIELDS one sold unit consumes (the demo seed's own comment and
  its 0.125 value agree).
- fixture (`test/e2e/fixture/margin.js:571`): `plate = roundMinor(perPortionCostMinor * quantity)` —
  it divided by the portion count first.

The walk entered quantity **1** on an EIGHT-portion batch; the fixture's wrong model and the walk's
wrong entry cancelled exactly, printing the "right" kr 4,50 for years of captures — arithmetic the
product cannot produce from those inputs. `margin-recipe-to-margin` carries the identical
cancellation (quantity 1, TEN portions, asserted kr 3,00).

Fix: the fixture now multiplies the BATCH cost (the product's contract), and both linking walks
enter the yield fraction the question actually asks — 0.125 (one of eight) and 0.1 (one of ten). All
previously asserted money figures then hold in BOTH modes because they were always stated per
portion: 36,00×0.125=4,50; 43,20×0.125=5,40; 30,00×0.1=3,00. The seeded `Kaffebrygg` link
(quantity 1, portionCount 1) is invariant under the correction. Fixture-mode proof: both margin
linking walks green after the change (`artifacts/fixture-run-2.log`, 2 passed).

## Spec changes (the whole diff to the journey)

`test/e2e/journeys/margin-supplier-to-plate.spec.js`:
1. `tag: ['@live']` (was the `@fixture` default) — with the eligibility paid for in step 5c.
2. The closing "what the browser said" step: mode-aware refusal assertion (finding 2), a
   `journey.finding('note', ...)` naming the divergence on live runs, `status of 404` added to the
   console-noise filter, and the step's return string no longer says "responses from the fixture".

No other step, selector, figure or assertion was touched.

## Run outcome — three runs, each one honest

| run | result | what it said |
|---|---|---|
| live 1 (46.5s) | FAILED at "sell it as a dish" | `PUT .../product-links` → 400; recipe list read «Ikke koblet til noe produkt» → **Finding 3** (If-Match) |
| live 2 (after If-Match fix) | FAILED at the closing table | link LANDED; Base plate `kr 36,00` exact vs asserted `kr 4,50` → **Finding 4** (batch vs per-portion) |
| live 3 (after both) | **PASSED, 29.3s** | every figure to the øre: 36,00 / 4,50 / 25,50 / 15,00 % / 35,50 / 11,25 % / 43,20 / 5,40 / 24,60 / 18,00 % — server-computed, browser-rendered |

Fixture mode after all changes: **both** margin linking walks pass (`fixture-run-2.log`, 2 passed) —
so the corrected fixture contract and the amended inputs hold in both worlds, and the
`margin-recipe-to-margin` capture is no longer built on cancelling errors.

Between live runs the world was restored from the reset image (~9s, `live-world-reset.sh`), never
re-walked dirty: run 3 started from the same seeded world the script proves.

## The world left standing (for a human walk — C5)

- API `http://127.0.0.1:5941`, serving pid 17024 (this lane's; stop with `kill 17024`), catalog
  `OkamLiveMargin` on the borrowed `okam-lwtwo-sql` (container NOT mine — never stop it).
- RESTORED to the seeded image after the pass: module dark, 0 overrides, 2 suppliers, the dish, no
  ingredient/recipe — exactly the state a person's walk should start from.
- To open the UI against it:
  `cd /Users/svendaneel/okam/Web-modules-wt/L-LIVE-WALK-MARGIN && OKAM_CORE_PATH=/Users/svendaneel/okam/Web-modules/core E2E_API_BASE_URL=http://127.0.0.1:5941 E2E_WEB_PORT=3941 node test/e2e/scripts/dev-server.js`
  then sign in at `http://127.0.0.1:3941/admin/margin-suppliers` with 99999999 / 123123.
- Re-image between journeys:
  `SQL_CONTAINER=okam-lwtwo-sql SQL_PORT=15436 DB_NAME=OkamLiveMargin API_PORT=5941 test/e2e/scripts/live-world-reset.sh restore`

## Where everything is

- Lane branch: `lane/live-walk-margin` @ `301f10cd` (off `b704d45e`) in
  `/Users/svendaneel/okam/Web-modules-wt/L-LIVE-WALK-MARGIN` — 6 files, nothing pushed, no trunk moved.
- Backend read-only worktree: `/Users/svendaneel/okam/OkamAPI-wt-L-LIVE-WALK-MARGIN` @ `6d5328004` (detached).
- Evidence copies (this directory): the live artifact + canonical + 5 screenshots + world stamp +
  world/seed transcript + run logs.
- Ports bound by this lane: 5941 (API), 3941/3942 (dev servers, released), 4941 (fixture, released).
  4010 was never bound. No container started; no foreign process or container touched.

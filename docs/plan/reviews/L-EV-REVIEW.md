# Fable review — Events (L-EV-REVIEW, 2026-08-01)

Read-only review. No file was edited. Backend checkout on `lane/meals-grace-pins`, same commit `de1e5c5e` as
`feature/restaurant-modules`; frontend on `feature/restaurant-modules`.

## 1. The first stop

A host is halted **before step one, at the module gate.** `Events:Enabled` appears in no committed
appsettings — `appsettings.json:182` carries only `"Events": { "DispatchEnabled": false }`, Development has
no Events section, user-secrets has no Events key — and `EventsModuleGate` defaults OFF
(`Services/Events/EventsModuleGate.cs:65`). All six `/events` controllers carry the gate as an
`IActionFilter`, so every route — **the public enquiry POST included** — answers 404 `EVENTS_DISABLED`. The
host opens `/admin/events-pipeline` (it is in the nav) and reads the module-off sentence. **No screen
anywhere can turn it on:** the outer switch is config-only, and the three per-store flags' only lever is
`PUT /stores/{id}/feature-flags`, which **no frontend code calls** — the sole frontend consumer of that
endpoint is Growth, read-only.

The scripted unlock exists (`demo-up.sh:131` exports `Events__Enabled=true`; `seed-events-demo.sh:34-35`
flips Core/Settlement) — **and it is now wrong.** `seed-events-demo.sh:36-37` asserts *"Events.Deposits …
gates NOTHING — the four deposit routes gate on Events.Core."* True when the script landed (`35581782`,
2026-07-30 14:07), false five hours later: `df808624` (19:27) put `Events.Deposits` in the catalog and made
it gate the issue route, deny-closed. **A store provisioned by the current seed cannot issue a deposit** —
and the refusal is a 404 the script mislabels as *"expected without live Vipps credentials"* (:134).

## 2. The inventory (abridged to the breaks)

| Step | Verdict |
|---|---|
| Module on, store flagged | **broken: no operator lever in any UI; the demo seed under-provisions the money flag** |
| Public enquiry page | **reachable** — but nothing links it and no surface prints the URL; and **not store-flag-gated** (finding below) |
| Pipeline list/detail, draft, send proposal, guest accept | **reachable**; guest link printed on screen since email dispatch is dark by default |
| Issue Vipps deposit | **broken against the real rail** — `EventsDepositPaymentPortAdapter.Initiate:138-147` sends **no `FallBack`**; the only caller that sets it is checkout (`VippsController.cs:407`). Vipps eCom v2 requires `merchantInfo.fallBack`, so a live initiate is refused or the paying guest is stranded with no return URL. **Faked in every test**, so no suite can see it |
| Guest pays | reachable to the redirect; the page reads the affordance through the stance so a settled row cannot grow a pay button |
| Completion (T9) | wired, idempotent, capture-on-authorize, verdict-classified; hourly recovery sweep present |
| Dietary requirement | reachable; the composer embeds it and late input marks the sheet stale |
| **Run sheet prints** | **absent: zero `window.print` / `@media print` in any Events file.** The estate pattern exists at `workforce-personnel-list.vue:276,326-355`. Browser File→Print would print the whole pipeline page **including guest deposit token links** onto the kitchen sheet |
| Start service → close → lines → reconcile → close settlement | **reachable** — Settled is reachable in a browser once the flags are on |
| Venue settings (spaces) | **absent from frontend** — the admin client is route-for-route with five controllers and omits the sixth. Not exit-blocking |
| Notification health / requeue | reachable; dispatch dark by design |

**Money-path actor audit: clean.** Every operator write resolves the actor via `ActorClaims` and refuses
unattributed callers; sweep/sink writes are `System` with exactly-null actor; `EventsPaymentLedger.Record`
refuses an Admin receipt with a blank actor *and* a System receipt naming one. Append-only triggers are in
the migration chain (`20260727221455_RestaurantModules_Initial.cs:4136-4156`). **No path writes money rows
under ambient identity.**

## Corrections to the clerk's brief

- **The lost-callback defect is genuinely fixed — and better than claimed.** Traced independently: the
  callback classifies verdicts instead of assuming Completed, promotion is capture-truth-only, and the hourly
  sweep additionally *recovers* authorized-but-overdue holds through the sink rather than releasing them.
- **"External-deposit guards" do not exist under that name** in either repo. The real refusals: `Initiate`
  rejects Stripe (four missing pieces, no completion signal) and Dintero (splits/commission undecided); and
  `GetStatus` refuses Dintero partial settlements rather than stamping the authorized amount as truth.
  **A person cannot trip them from the UI** — the admin page hardcodes Vipps; only a raw API call reaches them.

## What could not be determined

- Nothing was executed. The journey manifest's claims (all VERIFIED-GREEN including two on SQL Server) are
  the manifest's, not re-run.
- Whether Vipps in fact 400s a null `fallBack` — the API reference marks it required and checkout always sends
  it, but only a live sandbox call settles it.
- Production hosting/rewrites for the public `/events/*` pages.
- The six frontend Jest files and the Playwright journey exist but were not run.

**Bottom line:** the module is unusually complete — every settlement step, both guest pages, actor discipline
and the deposit lifecycle are really wired. The exit fails on exactly three things nobody has watched: the
gates have no lever (and the seed now under-provisions the one money flag), the Vipps initiate is missing its
required return URL, and the run sheet cannot print.

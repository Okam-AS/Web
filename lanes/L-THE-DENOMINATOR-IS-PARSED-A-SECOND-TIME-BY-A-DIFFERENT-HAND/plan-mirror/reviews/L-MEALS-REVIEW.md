# Fable review — Meals (L-MEALS-REVIEW, 2026-08-01)

Read-only review of `feature/restaurant-modules` on both repos (backend working tree at branch tip
`de1e5c5e`, clean; frontend `7b99f2a`), plus the sibling `ConsumerWeb`/`Core` checkouts where the funded
checkout actually lives. Nothing was run; no file was edited.

## 0. Corrections — three of the estate's own documents are now false, and one clerk claim is half-false

1. **`MealsMembership.EmployeeReference` EXISTS.** `pages/meals/join.vue:39-50,316-341` states as fact that it
   does not and that statements bill a bare GUID permanently. True when written; migration
   `20260731215452_Meals_MembershipEmployeeReference` added the column, the service copies it
   invitation→membership at claim, and the invite form sends it. **The clerk's suspicion about the statement
   line is refuted in the good direction** — see the inventory's last row.
2. **`Scripts/demo/RUNBOOK.md` § 9 is stale on the central fact it teaches.** It says
   `Configure<MealsFeatureSettings>` is never called and that setting the module flag does nothing. False on
   this branch: `Program.cs:856` binds `Features:Meals` via `BindConfiguration` (`d81f037b`) and
   `appsettings.json` ships the section explicitly false. **Flags now gate correctly and are settable; they
   merely default off.**
3. **"No cart in this estate sends a reservation token" is stale.** Two files still justify UI omissions with
   it. The funded checkout exists, ruled to live in the sibling repo: `ConsumerWeb/components/organisms/
   CheckoutMeals.vue` plus the checkout store — the only code in any client that puts `CompanyAccount` on a
   cart — and the backend receives it at `CartsController.cs:165`.
4. **Unlike Training and Workforce, the Meals flags are not advertised-but-ungating.** All four gate for
   real, hierarchically (money flags require the module too), and the withheld set records why. Only
   `meals.module` is in the per-store catalog; its reach is **pinned honestly** — it lights 4 of 29 routes
   (`MealsOperatorLeverReachTests`).

## 1. The first stop

With flags on and a corridor signed, the journey runs cleanly from invitation to membership — **and then
stops at enrolment.** The employee claims at `/meals/join` (fully built and wired), but quote eligibility
requires an Enrolled program-member row, and **no surface in the estate can enrol anyone**:
`utils/meals/admin-client.js:48-52` deliberately declines to bind the enrol endpoint on the reasoning that
*no client in the estate claims one* — **a premise `pages/meals/join.vue` has since falsified.** The program
panel renders a member count and no control. The employee reaches the checkout and is shown the ineligible
strip, and nothing an admin can click will change that.

**The deepest break is further down and harder: no production code path can capture a funded order.** Capture
derives solely from a signed Kassa journal SALREC bearing the order id; the only journal writers are the POS
finalize flows; and the POS settlement surface refuses the medium outright —
`Services/Kassa/PosSettlementService.cs:380`, *"Unsupported payment type for a settlement allocation"* for
anything but cash or terminal. Finalize additionally requires payment parts covering the final amount, which
a company-funded order never has.

The SAF-T classification for the credit sale is ready and pinned, but its own docstring says the structural
POS pieces (utleveringskvittering § 2-8-7, X/Z credit-sale spec § 2-8-2) are *escalated, not implemented* —
the Sven-gated CREDSAL item. **Every green capture and statement test reaches the ledger through a fabricated
journal row** (`MealsProjectionTestKit.InsertReceiptAsync`). In production the bound reservation would sit
until the sweep files an expiry exception — which then **blocks month close**, in a queue **no UI can read or
resolve.**

## 2. The inventory (abridged to the breaks and the notable holds)

| Step | Verdict |
|---|---|
| Turn the module on per store | **reachable, API only** — no UI lever anywhere |
| Create company / sign corridor / program + policy / invite with payroll reference | reachable (concierge for the first two) |
| Claim membership at `/meals/join` | reachable — **but the receipt shows the membership id as "what statements name you by", which is wrong when a reference was supplied**; the wire's `employeeReference` is received and discarded |
| Enrol member in program | **broken: no surface** — the first stop |
| Eligibility strip / quote + reserve / funded checkout bind | reachable in ConsumerWeb. **Known defect: a superseded reservation is never released**, double-holding the allowance until the sweep |
| Capture (Bound→Captured) | **absent in production** — the deepest break, Sven-gated (CREDSAL) |
| Refund → reversal | absent for the same reason |
| Employee order history | **dead route** — zero callers in any client |
| Venue monitor | reachable; no period filter by ruling |
| Reconciliation queue + resolve | **broken: no surface** — and open exceptions block both draft and finalize |
| Statement draft/finalize/list/get/export | **broken: no surface — the module's stated exit is API-only** |
| **Statement line names the employee** | **verified good** — snapshot at draft, not a read-time join; persisted, then frozen by an immutability trigger plus the EF guard; reads and export return the persisted value; survives finalization and membership revocation. GUID fallback only when no reference was ever supplied |

## 3. Rulings the code has already answered ahead of their owner

- **"May a venue's own admin arm its billing?"** The code answers **no** today: corridor signing and company
  creation are both concierge-only. What that ruling actually blocks is venue self-serve onboarding. **What
  is reachable anyway and merely looks blocked:** the whole statement lifecycle is StoreAdmin authority, not
  concierge — so once a concierge has signed one corridor, the venue could draft, finalize and export month
  statements with no further Okam involvement. What stops it is the config flag and the missing UI, not the
  ruling.
- **Norwegian tax treatment** — no string of that family exists anywhere in the module, yet the code has
  committed to a shape: the employer is billed **retail gross including VAT, copied verbatim from journal
  truth and never recomputed**, classified as kredittsalg. Nothing computes a per-employee taxable-benefit
  artifact for payroll or a-melding.
- **C4 actor discipline is split.** Admin, statement and reconciliation mutations all stamp the actor into an
  append-only audit event that refuses a blank. **The funding family writes no audit events at all** — and
  releases record only a cause: the payment-cancel release (reachable from webhook-driven cancels) and the
  background sweep both write Released with a reason code and **no actor and no audit row.** Those are
  allowance-freeing money-path writes under ambient identity.

## 5. What could not be determined

- **Whether the ConsumerWeb funded checkout composes with this backend branch.** The checkout lives on
  ConsumerWeb `feature/swiss`; the backend Meals surface on `feature/restaurant-modules`. No ConsumerWeb
  branch named restaurant-modules exists. Whether the two are ever deployed together is a branch-topology
  question neither repo answers.
- Whether frontend-mono's POS surface is already building credit-sale settlement — out of scope, and the
  CREDSAL escalation may have moved there.
- The grace/expiry pins — another agent holds that lane; only the sweep's product behaviour was reviewed.
- **Nothing was observed running.** The consumer journeys run against a fixture and stamp `backend: "fixture"`
  honestly; the backend's full loop is service-level with a kit-inserted journal row. **There is still no
  single artifact showing a person walking invitation → funded order → finalized statement across the real
  stack** — and two of those steps cannot currently be walked at all.

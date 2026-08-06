# L-JOURNEY-MEALS — evidence

Baseline read at `5ad0ca0043b63363e1407c1c59f82e966de06673` on `feature/restaurant-modules`,
2026-08-04 13:44 UTC.

**HEAD moved under this lane mid-run**, to `e34977acebd59b223584158c33451b6f1ffd82c1` ("The
corrections stop asserting what the repository cannot show"). `git diff 5ad0ca0..e34977a` touches
nothing under `test/e2e/`, `components/admin/meals/`, `pages/`, or `utils/meals/`, so no surface any
of these walks crosses changed. I re-ran both walks anyway rather than ship captures of two trees:
**all three captures now name `e34977a`.** The mutation and leak proofs were taken at `5ad0ca0` and
remain valid — both are keyed to `test/e2e/fixture/meals.js`, a working-tree file the commit did not
touch, and both record its sha256 `cf1f7e78…` unchanged before and after.

Ports 3760 (web) / 4760 (fixture), mine alone. Ports 3037/3952/3961/3971 and 5951/5952/5956/5961 were
already held by sibling lanes and were not touched.

## THE NAMING GAP — read this before joining on anything

The exit criterion names three artifacts:

    meals-concierge-setup.playwright.json
    meals-employee-claim.playwright.json
    meals-statement-freeze.playwright.json

**No spec in this tree produces any of those three names, and none ever did.** The string
`meals-concierge-setup` appears in exactly one file in the whole repo — `docs/plan/plan.md`, in this
lane's own exit line. The journeys the brief describes exist under different ids:

| brief's artifact name    | the spec that actually walks it            | journey id it emits    | committed?          |
|--------------------------|--------------------------------------------|------------------------|---------------------|
| meals-concierge-setup    | test/e2e/journeys/meals-admin-setup.spec.js | `meals-admin-setup`   | yes, at `ddc27fa`   |
| meals-employee-claim     | test/e2e/journeys/meals-guest-claim.spec.js | `meals-guest-claim`   | yes, at `ddc27fa`   |
| meals-statement-freeze   | test/e2e/journeys/meals-statement-month.spec.js | `meals-statement-month` | NO — untracked |

The plan contradicts itself rather than contradicting reality: its own prose at plan.md:379 and
plan.md:404 names `meals-admin-setup.spec.js` and `meals-guest-claim.spec.js` as `driven`, while the
exit line at plan.md:5807 names three artifacts nothing emits.

**I did not rename the journey ids to close this.** The id is the join key for the canonical artifact
slot, the `runs/` per-backend records and every line in `runs/ledger.jsonl`; renaming would orphan the
existing ledger history and falsify plan.md:379/404 in the same move. The captures are therefore filed
under the ids the specs actually declare, and the gap is reported rather than papered over.

## The brief's premise is stale, not wrong

"Twenty-two Meals lanes sit built-unverified and six journeys exist … Walk what nobody has walked."

The six that existed are the guest walks, and they are not in this app at all — they live in
`test/e2e/journeys/consumer/`, driven by `playwright.consumer.config.js` against the sibling
ConsumerWeb checkout. Correct.

But the operator half the brief calls the gap was already written and committed at `ddc27fa` ("The
four walks that only existed on a branch nobody was on"). What was missing was not the specs: it was
that **nobody had ever run them here**. Neither `meals-admin-setup.playwright.json` nor
`meals-guest-claim.playwright.json` existed in `artifacts/journeys/` at my baseline, and there was no
line for either journey anywhere in `runs/ledger.jsonl`. The plan called them `driven` on the strength
of a branch nobody was on.

## Runs

See `run1-admin-setup.txt`, `run2-guest-claim.txt`, `run3-statement-month.txt`.

| journey | exit | artifact status | fixture requests served |
|---------|------|-----------------|------------------------|
| `meals-admin-setup` | 0 | passed | 37 (28 subject, 0 foreign) |
| `meals-guest-claim` | 0 | passed | 11 (7 subject) |
| `meals-statement-month` | 1 | failed | 9 |

The first two are new canonical records; neither journey had ever written a line to
`artifacts/journeys/runs/ledger.jsonl` before today.

## THERE IS NO CAPABILITY TO SWITCH OFF — the exit's second half cannot be met literally

The exit asks that each walk "reds when the capability it walks is switched off". For Company Meals
**no switch exists anywhere in the estate**, and this is by design rather than by omission:

- `Features:Meals:Module`, `Features:Meals:Statements`, `Features:Meals:Ordering` are host
  configuration read through `IOptionsMonitor`. No per-store route can see or move them, so
  `/admin/feature-flags` draws no control for any of them.
- `meals.statements` and `meals.ordering` are **withheld from the per-store catalog on purpose**, so
  `PUT /stores/{id}/feature-flags` refuses the key outright (`test/e2e/support/flags.js:17`).
- `meals.module` *is* in the catalog (`test/e2e/fixture/world.js:239`, `defaultEnabled: false`) and does
  draw a switchboard row — but **`test/e2e/fixture/meals.js` calls `ctx.flagEffective` exactly zero
  times**, so no meals route consults it. Flipping that switch off changes nothing any meals journey
  can observe. For contrast, `events.js` calls it 7 times, `margin.js` 5, `growth.js` 3, `training.js` 3.

`meals-admin-setup` already carried this as a finding before I ran it — step 12 records *"the gate on
this surface has NO lever, and the walk says so"*. So the falsifiability half is met the way every
sibling lane met it: by **mutation** — deleting the clause that implements the capability and requiring
the walk to go red. See `mutation-proof.py` / `mutation-proof.txt`.

## Journey 3 (statement freeze) is BLOCKED, and on exactly the sibling lane's blocker

"A venue freezing a statement week" cannot be captured as a browser walk in this checkout, and it is
not close:

- `components/admin/meals/MealsMonthClose.vue` — the component that owns *Lås oppgjøret* — **does not
  exist here**. It exists only on `lane/fe-meals-reconcile-ui` @ `fc1c7bc`.
- Nothing in `utils/meals/` binds either write. `POST .../statements/drafts` and
  `POST .../{id}/finalize` appear in that directory only inside comments
  (`statement-client.js:7-8`).
- All 24 `meals_mc_*` translation keys are absent (`grep -c meals_mc_ translations/no.ts` → `0`
  here, `24` on the lane branch), so dropping the component in would render raw keys.
- No page mounts a close control. `pages/admin/meals-agreements.vue` registers only
  `AdminPage, MealsAgreementList, MealsFundedOrders`.

The read half **is** fully reachable — `pages/admin/meals-statements.vue` exists, mounts
`MealsStatementLines.vue`, and is linked from `AdminPageHeader.vue:389`. It is the freeze that has no
surface. This is `L-MEALS-STATEMENT-SURFACE`'s verdict reached independently:
`blocked, needs: +L-MEALS-RECONCILE-UI, +D-MEALS-FINALIZE-OWNER`.

Writing this walk anyway would mean driving `POST /finalize` through Playwright's `request` context and
calling the result a journey. That is precisely what C3 and C5 forbid: an API call is not a capability,
and a walk nobody can perform in a browser is not acceptance.

Also, for the record: the Meals statement period is a **calendar month, not a week** — `periodYear` +
`periodMonth` with `month < 1 || month > 12` validation (`test/e2e/fixture/meals.js:730-735`), page
title *Månedsoppgjør for bedrift*. The exit's "statement week" names a period this module does not have;
`margin-week-freeze` is the weekly one, and it belongs to Margin.

## DEFECT FOUND — `meals-statement-month.spec.js` only works on the default port

    Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:4010

`test/e2e/journeys/meals-statement-month.spec.js:72` reads

    const api = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:4010';

It honours `E2E_API_BASE_URL` but **ignores `E2E_FIXTURE_PORT`**, so in fixture mode on any non-default
port its two API-driven writes (#19 draft, #20 finalize) hit a port nothing is listening on. Every
other spec that talks to the fixture directly gets this right:

    growth-testsend-refusal.spec.js:47   'http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010)
    growth-guest-lifecycle.spec.js:58    same
    account-email-confirm.spec.js:48     same
    test/e2e/support/journey.js:482      same

so the fix is one line and the shape is already established four times over. I did **not** apply it:
the file is untracked and belongs to `L-MEALS-STATEMENT-SURFACE`, which is still open. Reported, not
edited.

Consequence worth naming: this journey is green only on 3010/4010, which means it is green only when
run alone on a machine where no sibling lane holds the default ports. On this checkout that is a
coin-toss, and the failure it produces reads like a dead backend rather than a hard-coded port.

## THE FINDING — `meals-guest-claim` does not watch the control it is named after

Four mutation arms, each deleting one capability clause from the world the walk crosses
(`mutation-proof.py` → `mutation-proof.txt`). Three went red at the right step. **One stayed green.**

| arm | capability switched off | result |
|-----|------------------------|--------|
| A1 | `meals.invitation.create` / exactly one contact channel | RED at *an invitation naming BOTH channels is refused by the server* |
| A2 | `meals.invitation.refusal.contact-mismatch` | RED at *THE ONE THAT MATTERS: refused for the right code and the wrong account* |
| A3 | **the withholding half of that same refusal** | **GREEN — exit 0, `1 passed`** |
| A4 | `meals.invitation.refusal.already-used` | RED at *a code somebody has already used says so* |

A3 made the fixture's 403 echo the invited person's address. Proven on the wire rather than argued
from the code (`leak-proof.js` → `leak-proof.txt`), because a mutation that changed nothing would make
the green meaningless — and the first draft of that script did exactly that, reporting "no leak" for a
request refused at the idempotency guard before it ever reached the contact check:

    CLEAN    403 {"code":"meals.invitation-contact-mismatch","detail":"This invitation was issued to a different contact."}
             withheld values present on the wire: none

    MUTATED  403 {"code":"meals.invitation-contact-mismatch","detail":"…","intendedContact":"marit@example.test"}
             withheld values present on the wire: ["marit@example.test","marit"]

and `meals-guest-claim` **still exited 0**.

The step named *AND IT DOES NOT SAY WHOSE INVITATION IT IS* asserts against
`page.locator('body').textContent()`. The leak I introduced is a problem-document *extension*
(`api-server.js:201-209` merges `extra` straight into the body), and no Vue code renders unknown
extension members — `refusal-copy.js` maps the *code* to Norwegian text. So the address reaches the
browser and never reaches the DOM, and a page-level assertion cannot see it.

**Why that matters rather than being a technicality.** The threat model is the journey's own: a
forwarded token in the wrong hands. That person is signed in, holds the token, and receives the 403.
They read it in the network tab, not in the DOM. The control has two enforcement points — the server
withholds, and the page does not render — and the journey watches only the second, which is the one
the attacker does not need to defeat.

The spec's comment shows the authors weighed exactly this and chose page-level:

> Asserted on the rendered TEXT, not on the status code. A 403 with the right code and a body naming
> the address would satisfy any check that stopped at the wire…

That reasoning is sound about a check that *only* looks at the status code, but it leaves the converse
hole open: a body naming the address passes the page check too, whenever the page declines to render
it. Both enforcement points need watching; today one does the work of two, and the capability the
journey advertises — `meals.invitation.refusal.contact-mismatch` including its withholding half — is
falsifiable only in part.

**Not fixed here, deliberately.** The fix is a response assertion in
`test/e2e/journeys/meals-guest-claim.spec.js` (the spec already listens to that route — its step
*THE FIX — the sign-in now reaches the claim client* records `{"route":"invitations/session",
"authorization":"present"}`, so the listener exists and only the body check is missing). That file is
committed and shared, and my boundary is my own lane directory. Reported with a reproduction rather
than edited.

## What I displaced, and that it was recoverable

My failed `meals-statement-month` run took the canonical slot from the sibling's passing record — the
same-lineage rule in `artifact-store.js`, working as documented. Nothing was lost: the store copied the
displaced record to `artifacts/journeys/runs/meals-statement-month.fixture.superseded.playwright.json`
first, and the sibling also holds its own copy at
`lanes/L-MEALS-STATEMENT-SURFACE/armA-green.playwright.json`. I restore the canonical at the end of the
lane by re-running on the default ports the spec requires.

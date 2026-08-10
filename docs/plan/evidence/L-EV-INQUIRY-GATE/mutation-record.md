# L-EV-INQUIRY-GATE — both halves measured, on two unlanded branches

Reason shape hit: **(5) a two-part exit with only branch SHAs and suite counts behind it**, plus **(1) the
mutation runs both RETURN clauses describe were written nowhere.** `instrumentless-exits.md` Batch 4:
*"two branch SHAs and two suite counts, and the second half is a render … no path on either side. I
checked the frontend ref: `f7695bc` carries `lanes/L-CORE-ORE-LABEL/…` and nothing for this lane, so there
is no capture to name."* **Both halves are run and recorded below.**

## The evidence line as it stood before `plan verify` overwrote it

```
evidence: backend lane/ev-inquiry-gate 8ecb47df (174/174 SQLite-tier Events+Modules) · frontend lane/fe-ev-inquiry-gate f7695bc (94 suites / 2199 tests)
```

## Landing status, stated first because it bounds everything below

**Neither branch is landed.** `8ecb47df` is **not** an ancestor of the backend trunk `6d5328004`
(`git merge-base --is-ancestor` → 1), and `f7695bc` is not an ancestor of the plan/frontend repo's HEAD.
Both refs resolve today and both were checked out into detached worktrees for these runs. No trunk moved,
nothing pushed, no container started.

## Half one — the public enquiry POST answers the module refusal

Backend worktree at `8ecb47dfa` ("A venue that never opted in stops taking public enquiries"). Runner:
`dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter
"Database!=SqlServer&(FullyQualifiedName~Events|FullyQualifiedName~Modules)" --logger trx`, each row
preceded by a build with `WebApi.dll`'s mtime asserted moved.

| # | state | mtime | result |
|---|---|---|---|
| 0 | branch tip, unmutated | (fresh build) | **Passed — 0 failed / 630 passed / 2 skipped / 632 total** |
| 1 | **M1** the flag check dropped | `18:00:23` | **Failed — 4 failed / 626 passed / 2 skipped / 632 total** |
| 2 | restored | `18:01:34` | **Passed — 7/7** on `EventsInquiryStoreGateTests` |

**M1** is the pre-lane state re-created exactly: in
`Services/Events/EventsInquiryService.EnsureStoreTakesPublicInquiriesAsync`, the gate term is removed and
only the existence check is left —

```diff
-            if (!await _moduleGate.IsStoreEnabledAsync(storeId, ct)
-                || !await _context.Stores.AsNoTracking().AnyAsync(s => s.StoreId == storeId, ct))
+            if (!await _context.Stores.AsNoTracking().AnyAsync(s => s.StoreId == storeId, ct))
```

— which is *"the enquiry service checks only that the store exists"*, the sentence the lane was opened
against. **4 red of 632, all four in `EventsInquiryStoreGateTests`, all four the same failure shape:**

```
A_deployed_module_refuses_a_public_enquiry_for_a_store_that_never_enabled_events_core
A_refused_enquiry_writes_no_event_no_transition_and_no_note
A_venue_that_declined_the_module_and_an_id_that_is_nobody_answer_identically
An_undeployed_module_refuses_with_the_same_code_as_a_store_that_declined_it
  Assert.Throws() Failure
  Expected: typeof(WebApi.Helpers.Events.EventsProblemException)
  Actual:   (No exception was thrown)
```

"No exception was thrown" **is** the defect: with the gate gone the enquiry is accepted for a venue that
never opted in. This reproduces the RETURN's "drop the flag check => 4 red" exactly. The third name is
the privacy pin the lane decided deliberately — a venue that declined and an id that is nobody must
answer *identically*, because the endpoint is anonymous and takes a sequential store id in the body.

## Half two — the enquiry page renders its refusal card

Frontend worktree at `f7695bcb` ("The enquiry form withdraws when the venue does not take enquiries
here"), with `core` materialised at that tree's own gitlink `4f3100341a152cb1e912f6a6c434c49782f5fa3b`
and `node_modules` symlinked from the main checkout. Runner:
`npx jest test/events-guest-pages.test.js --coverage=false`.

| # | state | result |
|---|---|---|
| 0 | branch tip, unmutated | **30 passed / 30 total** |
| 1 | **M1** the code mapped onto the not-found key | **2 failed / 28 passed** |
| 2 | **M2** the form no longer withdraws | **1 failed / 29 passed** |
| 3 | restored (`git diff` → 0 bytes) | **30 passed / 30 total** |

**M1** — `utils/events/guest.js`: `EVENTS_DISABLED: 'ev_guest_refused_unavailable'` →
`'ev_guest_refused_not_found'`. **2 red, with the rendered Norwegian in the message**, which is what makes
this a render assertion rather than a code-path one:

```
✕ a venue that does not take enquiries here says so, and withdraws the form
    Expected substring: "Dette er ikke tilgjengelig akkurat nå. Ta kontakt med stedet."
    Received string:    "Forespørselen ble ikke sendt … Vi finner ikke det lenken peker på. Sjekk at du har hele lenken."

✕ the refusal never tells the guest their venue does not exist
    Expected substring: not "Vi finner ikke det lenken peker på. Sjekk at du har hele lenken."
```

The second arm is the privacy rule from the backend half arriving on the page: `EVENTS_DISABLED` is
answered uniformly, so the page must not translate it into *"we cannot find what this link points to"*.

**M2** — `pages/events/inquiry/_store.vue`: `<section v-if="!venueRefused" class="eg-card">` →
`<section class="eg-card">`. **1 red:**

```
✕ a venue that does not take enquiries here says so, and withdraws the form
    expect(received).toBe(expected)   Expected: false   Received: true
    535 |     expect(wrapper.find('[data-test="sent"]').exists()).toBe(false)
```

Reproduces "un-withdraw => 1 red". The refusal card itself is `<section v-if="refusal"
class="eg-card eg-card--bad" data-test="refusal">`, and M1's assertions read its rendered text — so the
card is shown to render, and shown to render the *right* sentence.

## What is still owed, in the RETURN's own words

> **OWED: C5 human acceptance** — a live run needs `Events:Enabled=true` **and** a store with Core OFF,
> whose operator lever is the sibling lane's, not built here.

C5 says a suite count may not close a capability, and a component test that mounts the page is still a
suite. **This record closes the exit's two clauses by measurement and leaves C5 exactly where the RETURN
left it.** The landing question is separate again: both halves live on branches that are ancestors of
nothing.

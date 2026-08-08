# The offer page stops naming a cause it cannot know

**Built.** A load failure no longer claims the offer expired, and an unusable accept response can no longer
erase the page after the order is placed. Both premises were re-measured at the tip before anything was
edited — and one of them turned out to be measurable only against the *backend*, which changed the fix.

| | |
|---|---|
| Frontend | `lane/offer-page-stops-telling-untruths` @ `52a93c5`, off trunk `d4c308e` |
| Tier | `npx jest` — **169 suites / 4021 / 0**, exit 0, zero `FAIL` lines (trunk 168 / 4007 / 0) |
| Mutations | **5 applied, 5 red**, every restore verified by SHA against an out-of-tree buffer |
| Lint | `0 errors` on both files; the new test file is `0 problems` |
| Load gate | checked before each tier: 11.09 at start, 7.24 before the run — held below 14 |

`web-livewalk` was not touched, no port was bound, no container was started, nothing was installed
(`node_modules` is a symlink), and **no commit was made inside `core/`**, so nothing needed bundling.

---

## Premise check at the tip — one confirmed, one corrected, one refuted

**Confirmed.** `pages/offer/_code.vue` at `d4c308e` renders `copy.offerExpiredTitle` / `offerExpiredText`
from a bare `v-else-if="error"`, for every failure. And `acceptOffer` did `this.offerProposal = response`
with no guard. Both defects were real and unfixed.

**Corrected, and this changed the design.** The brief frames the fix as distinguishing "we could not load
this" from "this has expired". Measuring the backend shows the page **cannot** make that distinction from a
failure, and must not pretend to:

- `Services/OfferProposalService.cs:104-123` returns `null` for an anonymous guest when the offer is
  **expired**, *or* Rejected, *or* StoreRegistered, *or* accepted more than an hour ago.
- `Controllers/OfferProposalsController.cs:85` turns that `null` into **404** — the same 404 as an unknown
  code.
- `core/services/request-service.ts:87` collapses every non-200 **and** every network failure into
  `undefined`, and `GetByCode` turns that into `new Error('Failed to get offer proposal')`.

**Six causes arrive as one untyped error with no status.** Today's page picks one of the six and states it
as fact. So the fix is not to guess better — it is to stop guessing.

**Refuted.** The brief says *"the page already carries five `THE DEFECT:` tests asserting today's broken
behaviour ... convert each"*. There are none. `pages/offer/_code.vue` has **no test file at all** at the tip —
`grep -rn "THE DEFECT"` finds 24 markers across the repo and not one of them touches this page, and the
tier's own coverage table reports `pages/offer  0 | 0 | 0 | 0` with lines 217-430 uncovered. **Zero tests
were converted, because zero existed**; fourteen were written. Nothing was turned green by editing a test.
This is recorded rather than treated as fail-spec: the two blocker defects were real and unfixed, so the
lane had work to do and the exit criterion was reachable.

## What the page says now

| situation | before | now |
|---|---|---|
| network blip | "Tilbudet er utløpt" | "Vi klarte ikke å laste tilbudet" + the connection and an invalid link named as possibilities + **retry** |
| 404 (five causes) | "Tilbudet er utløpt" | the same honest failure state |
| a loaded offer past its expiration | nothing | "Tilbudet er utløpt" — a banner, document still readable |
| a live offer | document | document, and no expiry claim at all |
| accept → 200 with empty body | **blank page**, order placed | the document, marked confirmed |
| accept → refused | error | error, and no claim the order went through |

Three deliberate calls:

- **The failure names no cause.** "Det kan skyldes nettforbindelsen, eller at lenken ikke lenger er gyldig"
  states both possibilities and asserts neither, which is exactly what the server licenses.
- **Expiry is a banner, not a replacement.** Gating the document behind `!isExpired` would swap the page out
  from under a guest who is mid-way through typing her SMS code when the offer lapses. Telling her is right;
  locking her out is a new harm.
- **An unusable accept body marks the loaded proposal accepted rather than being assigned.** Reaching that
  line at all means a 200, and a 200 from `accept-with-verification` *is* the acceptance — every other
  outcome throws. Spreading the existing proposal makes blanking structurally impossible.

## Reachability (C3)

`isExpired` is not decoration: it renders for a KAM or PowerUser session, which `canViewAllOffers` serves an
expired proposal instead of a 404, and for any offer that lapses while the page is open. The retry button
calls `loadOffer`, extracted from `mounted` so both entry points share one path, and the test drives it
through a real click with the second attempt succeeding.

## Mutations — five applied, five red

Restored from a buffer outside the tree and **verified by SHA after every single restore** (`git checkout --`
was never used; it reverts to HEAD and would have destroyed the uncommitted work).

| # | mutation | red |
|---|---|---|
| 1 | the error branch prints the expiry copy again | **2** |
| 2 | `acceptOffer` assigns the response unguarded | **6** |
| 3 | the retry button removed | **1** |
| 4 | `isExpired` can never be true | **1** |
| 5 | the computed error detail thrown away again | **1** |
| — | restored | **14 / 14**, hash-matched each time |

**Mutation 1 caught a weak test of my own and it was strengthened, not kept.** The 404 test originally
asserted only that `[data-test="offer-load-failed"]` existed — which survives a mutation that puts the expiry
copy straight back inside that same element. It now asserts the words are absent. A marker-shaped assertion
on a page whose markers I added myself is close to a tautology.

## A near-miss worth recording

Two of these tests passed **for the wrong reason** at first. `_offerProposalService` is a *computed* on the
global mixin (installed as a side effect of importing `plugins/global-mixin.js`), and `mocks` cannot override
a computed — Vue warns "assigned to but it has no setter" and the **real** service runs, fails on
`currentUser`, and lands in the exact error branch the tests assert. The stub only takes effect through the
`computed` mounting option. Any future test of a page that reaches a service through this mixin has the same
trap waiting; the file says so at the mount helper.

## The other three flagged defects

- `F-THE-OFFER-PAGE-BUILDS-ERROR-COPY-IT-NEVER-RENDERS` — **touched, it fell out for free.** `this.error` was
  computed on every failure and rendered nowhere. It now renders as `[data-test="offer-load-failed-detail"]`
  beneath the plain-language heading, with a test and mutation 5 holding it.
- `F-A-FAILED-SMS-SHOWS-THE-GUEST-A-RAW-ENGLISH-EXCEPTION` — **not touched.** `sendVerification` still does
  `this.errorMessage = error.message || this.copy.errorCouldNotSendCode`.
- `F-A-MISSING-PHONE-NUMBER-SHOWS-THE-GUEST-A-TYPEERROR` — **not touched**, and it sits inside the method I
  edited: `acceptOffer` still calls `this.offerProposal.clientPhoneNumber.replace(...)` before my guard, so a
  null number throws into the catch and the guest is told her **code was wrong**, which is a second untruth
  on the money path. Unchanged by this commit, and cheap for the next lane: one line, one message, one test.

## Follow-up this lane could not close

The client cannot separate "the server said no" from "the server never answered", and it should be able to.
`core/services/request-service.ts` already carries the status helpers and documents that status is
`undefined` exactly when the request never reached the server — `GetByCode` throws that information away.
A status-carrying failure from core would let this page say "we could not reach the server, try again"
separately from "this link is no longer valid, contact the venue with your code". That is a `core` submodule
change, and the submodule is pinned at a WIP SHA shared across lanes, so it is not smuggled into a page fix.

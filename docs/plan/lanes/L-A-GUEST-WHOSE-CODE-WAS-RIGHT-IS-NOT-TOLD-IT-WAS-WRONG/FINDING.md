# A guest whose code was right is no longer told it was wrong

**Built.** Both remaining untruths on the offer page are gone, and the one that accused her is closed at the
source rather than reworded. A mutation that reported **RED while running zero tests** was caught by the
count assertion this brief demanded — it was malformed and had broken the file.

| | |
|---|---|
| Frontend | `lane/guest-code-was-right` @ `40ab62d` |
| Built on | `lane/offer-page-stops-telling-untruths` @ `52a93c5` (14 tests + the page's first `data-test` markers) |
| Merged in | `lane/mutation-runner-cannot-delete-work` @ `c65b19c` — additive, off the same trunk `d4c308e` |
| Tier | `npx jest` — **170 suites / 4044 / 0**, exit 0, zero `FAIL` lines |
| Mutations | **6 applied, 6 red**, every run executing the baseline **24**, every restore hash-verified |
| Lint | `0 errors` |
| Load gate | 7.73 at start; **14.33 before the tier, over the 13 gate, so the tier was not started**; 9.43 on the next read, then run |

`web-livewalk` untouched, nothing installed, no port bound, no commit inside `core/` so nothing needed
bundling.

---

## Premise check at the tip — both confirmed, and one is worse than described

Both defects are present at `52a93c5`. But the brief locates the `TypeError` only in `acceptOffer`, and
**the same dereference is in `sendVerification` as well** — one step *earlier* in the journey:

```js
// sendVerification, and again in acceptOffer
phoneNumber: this.offerProposal.clientPhoneNumber.replace(/\s/g, ''),
```

So the real sequence for an offer the venue left a number off is:

1. She presses **Bekreft**. `sendVerification` throws a `TypeError`, which the catch renders through
   `error.message` — she is shown **`Cannot read properties of null (reading 'replace')`**. Both flagged
   defects firing at once, from one missing field, before she types anything.
2. Only if she somehow got past that would `acceptOffer` throw and tell her the **code** was wrong.

One missing field, two defects, and the accusation is the second one she meets rather than the first.

## The fix is prevention, not better wording

The absence is **knowable before she acts** — `clientPhoneNumber` is on the proposal already loaded. Every
other failure on this page waits for a request to come back; this one does not have to. So:

- **`canConfirmBySms`** — a trimmed check, because a whitespace-only field is an empty one here and
  `"  ".replace(/\s/g,"")` yields the empty string the API would reject anyway.
- **The template** shows an up-front block instead of the acceptance UI: *"Dette tilbudet kan ikke bekreftes
  med SMS … Kontakt oss, så ordner vi det"*, with the **order number printed**, since the sentence asks her
  to quote it and it otherwise exists only in the URL she arrived from. The button that could only ever fail
  is not offered.
- **Both methods guard too**, which is what makes the `TypeError` *impossible* rather than merely unreached.
  The tests call the methods directly, past the template, for exactly that reason.

## The other two rewrites, under the rule the previous lane established

**The English exception.** `sendVerification` printed `error.message`. Core's strings are written for a
developer reading a stack trace, and a `TypeError` there printed its own internals. It now shows the
localised sentence that was sitting beside it the whole time, and the raw error goes to `console.error`.

**The accusation, in general.** `errorWrongCode` said *"Feil verifiseringskode"* for every failure of
`acceptOffer` — but core collapses a wrong code, a 500 and a dead connection into one untyped `Error`, so
that was a guess at a cause the page cannot know. It now reads *"Koden ble ikke godtatt. Sjekk at den er
riktig skrevet og prøv igjen. Kontakt oss med ordrenummeret ditt hvis det fortsetter."* — true (the server
did not accept it), useful (check it), and it names her next step without asserting why.

## The false RED, which is the instrument story of this lane

The canonical runner reported **6/6 RED** on the first pass. Two of them printed `RED (0)` — zero named
failures, which is the same shape a zero-test run prints. Running that mutation by hand:

```
Test Suites: 1 failed, 1 total
Tests:       0 total
```

**The mutation was malformed.** Its anchor ran from the method signature to `const model = {`, which
swallowed `this.isSubmitting = true; this.showError = false; try {` — leaving an unbalanced `try`. The file
would not parse, jest loaded no tests, and the non-zero exit was read as a red. Nothing was tested.

This is the coordinator's warning arriving from the other side: their case was 0 tests + exit 0 → **false
GREEN**; this was 0 tests + exit non-zero → **false RED**. Both are the same defect — *judging a suite by its
exit status without asserting it ran anything.* The runner is not at fault; it reports `reddened` honestly
and I read a `(0)` that should have stopped me, which it then did.

Repaired anchors (guard only, disambiguated by each method's own early return), plus a brace-balance check
on the mutant before running it. Then:

| mutation | reddened |
|---|---|
| `sendVerification` loses the phone guard (the TypeError site) | 1 |
| `acceptOffer` loses the phone guard (the accusation site) | 1 |
| the failed send prints core's English exception again | 2 |
| the refusal accuses the guest again | 1 |
| `canConfirmBySms` always true, so the warning never shows | 5 |
| a whitespace-only number counts as a real one | 1 |

**6/6 RED, and a separate pass asserted every run executed 24 of 24** — `SAME 24/24` on all six, with the
source SHA re-checked after each restore. Raw spec and results: `mut.json`, `mut.results.json`.

## The two inherited findings, carried rather than rediscovered

- **The mock is asserted, not assumed.** `mountPage` now records every stub call and returns the log, and
  the first test in the new block asserts `GetByCode` was reached. `_offerProposalService` is a *computed* on
  the global mixin, `mocks` cannot override a computed, and the real service fails into the same error branch
  — so "the error state rendered" is evidence of nothing on its own. If the override ever stops taking
  effect, that test reds instead of everything quietly still passing.
- **The words, not the marker.** Every new assertion checks rendered copy — *"kan ikke bekreftes med SMS"*,
  *"Kontakt oss"*, the absence of *"Feil verifiseringskode"* — and never only that a `data-test` element
  exists. On a page whose markers this pair of lanes added, a marker-shaped assertion is close to a tautology.

Also asserted: **no service call is made** on the no-phone path (`SendVerificationToken` and
`AcceptOfferWithVerification` never appear in the call log), and the converse — an offer that *has* a number
is still offered **Bekreft** — so the fix cannot be satisfied by never offering acceptance again.

## Not in scope, and left alone

Nothing else on this page was touched. The `TypeError` and the English exception were the last two of the
five flagged defects; the other three were closed by `52a93c5`.

**Still open, unchanged from the previous lane:** the client cannot separate "the server said no" from "the
server never answered", because `GetByCode` and its siblings throw untyped errors that discard the status
`request-service.ts` already computes. That is a `core` change against a submodule pinned at a WIP SHA shared
across lanes, and it is still not something to smuggle into a page fix.

**C5 is not claimed.** No person has walked an offer link with a missing phone number in a browser.

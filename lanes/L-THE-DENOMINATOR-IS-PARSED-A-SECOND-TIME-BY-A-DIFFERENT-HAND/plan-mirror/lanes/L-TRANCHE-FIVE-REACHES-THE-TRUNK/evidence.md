# L-TRANCHE-FIVE-REACHES-THE-TRUNK — evidence

Trunk **`3807e90` → `31e6c60`**, tier **183 / 4438 / 0**, `core` pin `a6ae241`. Nothing pushed.
**The landing plan is complete.**

## First, a correction to the resumption brief: the trunk had moved

The brief said *"The trunk was not moved and still reads `3807e90`"*. It did not. On resuming,
`feature/restaurant-modules` read **`7f359f4`** — the preserve commit itself.

The cause is mechanical: my worktree `L-T5-LAND` was created with the branch **checked out**, so
committing the interrupted merge inside it moved the branch. `git reflog feature/restaurant-modules`
shows `commit (merge)` landing directly on the ref. The trunk was therefore carrying an **untested T5
with nine red arms** for the whole interruption.

`preserve/tranche-five-interrupted` pointed at the same commit, so nothing was at risk. I detached the
worktree and reset the trunk to `3807e90` **before doing anything else**, restoring the invariant the
brief assumed, and did the work on a detached HEAD. Worth recording as a trap: *a landing worktree that
holds the branch turns any commit made in it — including a rescue commit — into a trunk move.*

## The red set was exactly nine, as predicted

Measured at `7f359f4` against baseline `3807e90` (182 / 4414 / 0):

```
Test Suites: 1 failed, 182 passed, 183 total
Tests:       9 failed, 4429 passed, 4438 total     — all nine in test/offer-code-guest-page.test.js
```

## The five `THE DEFECT:` pins — converted, not deleted

Each was written to red on the day its defect was fixed. Before rewriting, I ran a throwaway probe
that mounted the page in all five scenarios and printed what it actually renders, so each new
assertion states measured behaviour rather than a guess. The probe was deleted.

| was | now asserts |
|---|---|
| every load failure tells the guest the offer EXPIRED | *a load failure says the offer could not be loaded, and shows what went wrong* — title is `Vi klarte ikke å laste tilbudet`, the diagnosis reaches a pixel, retry offered |
| a link with no order number also reads as an expired offer | *a link with no order number says so instead of reading as an expired offer* — `Ingen ordrenummer oppgitt` now visible |
| an acceptance answered with an empty body blanks the page | *an acceptance answered with an empty body still confirms the order on screen* — one accept call, confirmation shown |
| a failed send shows the guest the raw English exception text | *a failed send shows the guest a localised sentence, not the exception text* |
| an offer with no phone number shows the guest a JavaScript TypeError | *an offer with no phone number says it cannot be confirmed by SMS, and offers nothing to press* |

The last is the strongest improvement: the page now refuses **before** the guest invests anything —
no terms box, no confirm button, `SendVerificationToken` never called — so the fault is *unreachable*
rather than caught behind controls.

**Nothing was deleted**: the file held 37 tests before and holds 37 after. No test name contains
`THE DEFECT:` any more; the three remaining textual mentions are prose explaining what *was* wrong.

## The four behaviour arms — a ruling each, and none held

**Two were asserting the defect from the outside.** A server refusal is a load failure, not an expiry,
and both pinned the very expired-for-everything sentence the defect block named one screen below:

- *an offer the server refuses puts up a page the guest can act on* — its own title gives it away. A
  page the guest can **act on** is not one telling her to request a new offer she does not need.
- *a Swiss guest whose offer will not load is told so in German* — same defect, German side. The
  title's claim never moved; what moved is what "so" is.

**Two pinned wording the fix deliberately replaced**, and both structural claims still hold and are
still asserted:

- *a send that failed outright also leaves the guest on the first step* — the page used to distinguish
  a server that declined from a request that threw, a distinction drawn from the failure's shape rather
  than from anything the guest can act on. Both now say *try again later*.
- *a wrong code is refused in place* — the old sentence asserted the code was **wrong**, a claim about
  the guest, and was shown whenever the request failed for any reason. That is this lane's subject.

**No arm turned out to be right against the fix, so nothing is held and `40ab62d` carries no defect
this lane can see.**

Before ruling, I checked the axis on which a rewrite would have been the wrong answer: **a new string
present in one market and not the other**. The page carries a two-market local copy map; both blocks
hold **27 keys each, symmetric**, and every new key (`loadFailedTitle`, `loadFailedText`,
`errorCouldNotSendCodeRetry`, `errorWrongCode`, `noPhoneTitle`, `noPhoneText`, `retryButton`,
`errorNoOrderNumber`) is in both. Had one been missing, that would have been a defect in `40ab62d`.

**One residue, named and not touched:** `errorCouldNotSendCode` — the short send-failure sentence — is
now referenced by no code path (both paths use `errorCouldNotSendCodeRetry` at `_code.vue:493` and
`:503`) while remaining in both copy blocks. Dead copy, not a defect, and outside this lane's remit.

## The runner did not regress — the sharpest failure mode, asserted twice

`40ab62d` contains `c65b19c`, the **131-line** defective runner; the trunk carries the **413-line** fix
from `316f22a`, which is **not** inside `40ab62d`. Git had to choose, and it will not show as a
conflict.

| file | `c65b19c`/`40ab62d` (defect) | `316f22a` (fix) | landed tip `31e6c60` |
|---|---|---|---|
| `test/support/mutate.js` | `e539034c7e24` | `42ad26312eea` | **`42ad26312eea`** |
| `test/mutation-runner-restore.test.js` | `b883cbb72e14` | `79496a63c0e7` | **`79496a63c0e7`** |

Asserted at the preserved tip and again at the final landing commit.

## Tier

`npx jest --ci`, exit 0, no `FAIL` line, `core` at `a6ae241`.

```
3807e90  before   182 suites / 4414 / 0
31e6c60  after    183 suites / 4438 / 0     +1 suite, +24 tests
```

**Every test accounted for.** `40ab62d` brings one new suite,
`test/offer-page-tells-the-guest-the-truth.test.js`, and the +24 is that suite. The nine rewrites moved
nine tests red→green **without changing the count** — 4438 total both before and after the rewrite,
because assertions changed and no test was added or removed.

**The landing commit carries exactly the tree that ran green**, proven rather than assumed: the merge
was rebuilt cleanly from `3807e90` so the trunk would not inherit the *"interrupted by the weekly API
limit"* message, and `git write-tree` gives `f22edb9cca3b5cfb3c533f175feab115db20b77d` for both the
tested state and the landing commit. The tier was then re-run at the landing commit and is green.

## Arity sweep

T5 changes **no importable module** — it changes a page and its tests. So the sweep that matters runs
the other way: every symbol `pages/offer/_code.vue` imports must resolve, because jest mounts that page
with all three of its children **stubbed**, and a browser does not.

```
~/components/atoms/Loading.vue        -> components/atoms/Loading.vue      resolves
~/components/modals/TermsModal.vue    -> components/modals/TermsModal.vue  resolves
~/components/shared/OfferDocument.vue -> components/shared/OfferDocument.vue resolves
unresolved / missing exports: 0
```

## The landing plan is complete — and what did NOT land

**Every unit the plan listed is on the trunk**, verified by ancestry:

| unit | tranche |
|---|---|
| `1c607fd` register, `32518da` wolt, `6026d35` census | T1 |
| `316f22a` (carrying `c65b19c` runner, `5ed9664` meals, `05c160a` falsifiability) | T2 |
| `8d4d1b0` export-flag (carrying `aff616d`), `2ce83f6` module-off | T3 |
| core `a6ae241` + `6d43520` report-read (carrying `6670619`) | T4 |
| `40ab62d` guest-code (carrying `52a93c5`) | T5 |

**`fddb06c` is the one nuance.** It is *not* an ancestor of the trunk, and the plan never claimed it
was — it said `6670619` contains it **patch-exactly**, a content claim. Measured blob-for-blob: **5 of
its 6 files are byte-identical on the trunk**, and the sixth, `test/growth-poweruser-page.test.js`, is
the file `6d43520` supersedes. So it is retired by supersession, and the one differing file is exactly
the one the plan flagged as the collision hazard.

**Did NOT land, and each needs its own reconciliation** — the four older 08-06 heads the artifact
recorded as out of scope, all confirmed still off the trunk:

- `lane/L-A-MENU-WITHOUT-PICTURES-STILL-SELLS` `96f18de`
- `lane/ore-padding-operator-clients` `c3695f1` (foreign core pin `4f31003`)
- `lane/tier-artifacts` `b1a2872` (foreign core pin `1bcab0b`)
- `lane/ack-receipt-survives-reload` `ac6ed72` (foreign core pin `1bcab0b`)

**Also unlanded, and named in earlier tranches rather than here:** OkamAPI `8357c8a33`, the backend
half of `2ce83f6` — a demo seed script and its test, no production code, so the trunk promises nothing
the backend does not deliver; the consequence is demo-world divergence only.

## ⚠ Still open: the core blocker, unchanged by this tranche

Neither core pin is on any remote branch, re-checked after teardown. Push order remains:

```
1. core  9626a561bb0442b0aed026be75b7f9419337ac6d    (a6ae241's parent)
2. core  a6ae24127b895e536cc600053f1cc25b1cc79f5f
3. Web-modules feature/restaurant-modules
```

## Teardown

`Web-modules-wt/L-T5-LAND` detached, then `rm -rf` plus `git worktree prune`. No worktree holds the
trunk. `preserve/tranche-five-interrupted` @ `7f359f4` is left intact as the record of the interruption.
`web-livewalk` untouched, no container started, nothing pushed.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules 3807e90
```

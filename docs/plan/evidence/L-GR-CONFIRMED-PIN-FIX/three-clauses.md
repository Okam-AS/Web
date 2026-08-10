# L-GR-CONFIRMED-PIN-FIX — the two clauses nobody had shown, measured at the trunk

**Reason shape: (5) part of a multi-part exit shown.** The prior pass called this "the closest call in the
batch": clause 1 was genuinely discharged by a tracked receipt, and clauses 2 and 3 "appear only as a
half-sentence in a summary table". This file measures clauses 2 and 3 **against the estate**, and points at
where clause 1 already lives.

Everything below is read at the backend trunk `6d5328004` and at the pre-fix base `801d36a3` with
`git show`/`git grep` **at those revisions** — never from the working checkout, which carries another
agent's uncommitted work.

**Both of the lane's commits landed.** `3cf288fb` (the code) and `48950702` (the lane tip) are each an
ancestor of `6d5328004`, measured with `git merge-base --is-ancestor`. So the three clauses are claims about
the trunk, not about a branch.

## The evidence line as the lane recorded it, preserved before `plan verify` overwrites it

```
evidence: /Users/svendaneel/okam/wt-gr-confirmed @ 48950702 (lane/gr-confirmed-email, local, unpushed) · code 3cf288fb · artifacts/tests/3cf288fb-fast-tier.trx + .../3cf288fb.../RUN.md = 4376 run / 4364 passed / 0 failed / 12 skipped
```

## Clause 1 — *the deny-closed pin reds when its own clause is deleted*: already discharged, and openable

`artifacts/tests/3cf288fb9b5465472dd0a50d50d949dbce8f4d19/RUN.md` is **tracked at the trunk**
(blob `2f5dcad85fb20d0aa7604514bedde6a413b3516f`) and carries a first-person mutation table under a heading
that says exactly why a green tier is not the evidence — *"The mutations, which are NOT in this number"*:

| mutation | result |
|---|---|
| delete `string.IsNullOrWhiteSpace(account.Email)` | **1 failed** — `An_actor_with_no_account_address_on_file_cannot_test_send_at_all`, failing with the `NullReferenceException` the clause exists to prevent, from `GrowthNewsletterService.cs:502`. **Before this commit the same deletion left the whole tier green.** |
| delete `account == null` | **1 failed** — the same test, which is the half added here |
| restore both | 474 passed / 0 failed |

Each mutation reds exactly one test, and the Growth-scoped denominator is stated (477 total / 474 passed /
3 skipped). Nothing was owed on this clause; it is named here so a reader has all three in one place.

## Clause 2 — *the dead seed parameter is used or removed*: **REMOVED**, and the deadness is measured

**At the pre-fix base `801d36a3`**, `WebApi.Tests/Growth/GrowthDeliveryHealthTestSupport.cs` declared:

```csharp
public static async Task SeedStoreWithAdminAsync(
    ApplicationDbContext ctx, int storeId, string adminUserId = AdminUserId, bool emailConfirmed = true)
```

with a `<param name="emailConfirmed">` doc block asserting it *"is how `GrowthTestSendBindingTests` builds a
world that differs from the served one by this field alone."*

**Three measurements, and they agree with the lane's account exactly:**

1. **15 call sites**, counted at `801d36a3` across `WebApi.Tests/` excluding the definition — the number the
   RETURN gives.
2. **None of them passed the argument.** `git grep` over those call sites for `emailConfirmed` or a trailing
   `, true)` / `, false)` returns **nothing**. Every one took the default, so the parameter could not change
   any behaviour: it was dead in the strict sense.
3. **The pin its documentation named never used it.** At the trunk,
   `WebApi.Tests/Growth/GrowthTestSendBindingTests.cs` sets the column on the entity itself —
   `account.EmailConfirmed = false;` (`:110`) and `account.EmailConfirmed = true;` (`:126`) — which is the
   "mutates the entity directly instead" the lane reported.

**At the trunk `6d5328004`** the signature is:

```csharp
public static async Task SeedStoreWithAdminAsync(
    ApplicationDbContext ctx, int storeId, string adminUserId = AdminUserId)
```

`EmailConfirmed = true` unconditionally, and the doc block now records the rule rather than the removed knob:

> *There is deliberately no knob for the unconfirmed world: the pins that need it flip the column on the
> seeded row themselves (`GrowthTestSendBindingTests`), so the state a test depends on is visible in the
> test rather than in a parameter's default.*

**Clause 2 is discharged in the "removed" disjunct**, and the false documentation went with it.

## Clause 3 — *the shared-code rationale says something true*: rewritten, and both its facts check out

**The old rationale, at `801d36a3:484`**, verbatim:

> *Unconfirmed and not-mine deliberately share one code — **the distinction would tell a caller which
> addresses another account holds**.*

That sentence returns **0 hits at the trunk**. It was not softened; it is gone.

**The rationale at the trunk** (`Services/Growth/GrowthNewsletterService.cs`, the doc on
`RequireOwnAccountAddressAsync`) states the negative explicitly and then gives a different reason:

> *All four reasons — no account row, unconfirmed, no address on file, a mismatch — deliberately share ONE
> code. **Not** because splitting them would disclose another account: the query below reads the caller's
> own row and no other, and `GET /user` (`UserController.Index` → `ApplicationUserModel`) already returns
> that caller their own `Email` and `EmailConfirmed`, so a split could only restate what they can already
> read about themselves. It is that the answer here is one decision on one row, and a code per failed field
> is one more way account state ends up in a response body and a log.*

**"Says something true" is not taken on trust. Both of its load-bearing facts were checked:**

| the new text asserts | measured |
|---|---|
| *the query below reads the caller's own row and no other* | **TRUE.** Six lines below the comment: `_db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => new { u.Email, u.EmailConfirmed }).FirstOrDefaultAsync(...)`. One predicate, on the caller's id. |
| *`GET /user` (`UserController.Index` → `ApplicationUserModel`) already returns that caller their own `Email` and `EmailConfirmed`* | **TRUE.** `Controllers/UserController.cs:311-314` — `Index()` loads `User.Identity.Name` and maps to `ApplicationUserModel`; `Models/Users/ApplicationUserModel.cs:38-39` declares `public string Email` and `public bool EmailConfirmed`. |

A third correction rides along and is worth naming, because it makes the new text more accurate than a
minimal fix would have been: the old sentence covered **two** reasons ("Unconfirmed and not-mine"), while
the guard's disjunction has **four** — `account == null || !account.EmailConfirmed ||
IsNullOrWhiteSpace(account.Email) || !Equals(account.Email.Trim(), requestedAddress.Trim(), …)`. The trunk's
text names all four. So the rationale is not only true, it is now complete over the code it explains.

**And the decision itself was kept.** The shared code survives; only the reason changed — which is what the
lane body asked for (*"The decision is still right; the reason is not"*).

## The archival judgement, verified rather than repeated

The lane deliberately **did not reword the earlier commit message** that repeats the false rationale,
because `a7697121`'s SHA names the only recorded measurement of that tree — the trx filename and the RUN.md
beside it — and rewording would orphan the receipt. That is checkable and it holds:
`artifacts/tests/3cf288fb-fast-tier.trx` and the `3cf288fb…/RUN.md` directory are both tracked at the trunk
under SHA-derived names, and the receipt convention is keyed on exactly that.

## What none of this closes

Carried from the lane's own RUN.md, unchanged and not repaired here:

- **§ 15 is not closed.** The confirmation flag this guard requires is itself brute-forceable — six digits,
  no attempt counter, no lockout on that path, no rate limit, and `UserService.ConfirmEmailAsync` does not
  invalidate the code on a wrong guess. A separate lane owns it.
- **The address-swap path is read and cited, never executed** — `SendEmailConfirmationCodeAsync` is not
  driven by any test here.
- **`growth.test_address_not_own` still has no admin-web mapping**, so the refusal has no reader.
- **The SQL tier (532 tests) has no run recorded against any SHA**, this one included.
- **C5 is unmet.** No person has walked this.

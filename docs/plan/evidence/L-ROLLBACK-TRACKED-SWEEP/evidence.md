# L-ROLLBACK-TRACKED-SWEEP

Base: `feature/restaurant-modules @ 3579bbbc`, worktree `/Users/svendaneel/okam/wt-rbtracked`,
branch `lane/rollback-tracked-sweep`. Local commits only.

## The shape is still present (fail-spec check)

The reference fix named in the brief is `249612ac` ("A freed Meals allowance names what freed it"),
whose message records the ruling verbatim:

> The guard is deliberately staged BEFORE the reservation is mutated: raised after, a refusal left the
> scoped DbContext tracking a Released reservation the database had rolled back, so the next release on
> that scope answered AlreadyReleased for a reservation still Bound.

`249612ac` is **NOT an ancestor of this base** (`git merge-base --is-ancestor` -> false). It sits on
`lane/meals-release-actor`, one of the two lanes named in the collision note. So the fix exists nowhere
in this tree, nothing sweeps for the shape, and the shape is present at other sites. Built, not fail-spec.

## Detection, and why a grep would have drowned

1,996 `throw` statements across 280 production files. The census is derived instead:

  strip comments/literals -> split into method bodies -> classify locals as TRACKED / AsNoTracking /
  new+Added -> find property assignments to TRACKED locals -> find throws sequenced after one.

**The ordering rule is the whole control-flow model.** A mutation is sequenced before a throw when the
mutation's chain of enclosing brace blocks is a PREFIX of the throw's:

| shape | verdict |
|---|---|
| same block, mutation first | sequenced |
| mutation encloses the throw (mutate, then a nested `if` refuses) | sequenced — the reference shape |
| sibling blocks (if/else arms, two lambdas) | NOT sequenced |

The sibling rule is not a nicety. The module services' `onProceed:` callback — Meals membership/company,
Workforce requests/exchange/time-off — is the estate's CORRECT idiom: the guard is a sibling lambda that
runs ahead of the work delegate. A sweep that flagged it would be refusing the fix it exists to ask for.

Successive refinements, each removing a class of false positive rather than a count:

| pass | findings | what it learned |
|---|---|---|
| naive lexical order | 77 | — |
| + lambda-sibling exclusion | 68 | `onProceed:` guards are not defects |
| + block-chain prefix (subsumes lambdas) | 14 | if/else arms are mutually exclusive |
| after the three fixes | 9 | — |

A detector bug found on the way: `catch (X e) when (Helper.Is(e))` has nested parentheses, so a
`\([^)]*\)` catch matcher mis-classifies save-failure rethrows as ordinary guards. The C# port matches
the filter with a balanced-paren scan.

## What this CANNOT see

Stated because a census with an unstated blind spot is the next unfailable assertion.

- **Throws behind a call.** A guard living in a helper (`EnsureCoherent(entry)`, an audit writer that
  validates on append) is invisible — no interprocedural analysis. **The Meals coherence guard that
  motivated this lane is exactly that shape.** Largest blind spot by far.
- **Collection and state mutations.** Only `x.P =`, `+=`, `-=` count. `_context.Remove/RemoveRange/Add`,
  `collection.Clear()` and `Entry(x).State =` all dirty the tracker and none are matched. (Found by
  hand in `TableService`, not by the sweep — and fixed there.)
- **Provenance by inference.** An entity reached through a navigation off an untracked local, a method
  parameter typed as an entity, or anything returned from a helper is not classified as tracked.
  `AsNoTracking()` is honoured only in the declaring statement.
- **Reachability.** A `return` in a braceless `if` between mutation and throw is not modelled, and
  `switch` sections share a block. Both over-report.
- **Whether the scope is REUSED** — a call-graph and lifetime question. The sweep reports the SHAPE; the
  allowlist carries the argument.

All of these under-report. The sweep raises a floor, never a ceiling.

## Sites fixed (write staged after the decision)

- `Services/Kassa/GoodsGroupService.cs::UpdateAsync` — the VAT-profile retirement guard (a taxable sale
  at 0 % VAT if it is wrong) ran after Name/Code/SortOrder/IsActive and `ApplyProfile` were applied.
  The guard now reads the INCOMING model (`ModelDeclaresVatProfile`) instead of the mutated entity, and
  `ValidateProfile` is split out of `ApplyProfile` so the partial-profile refusal is also staged first.
  `ApplyProfile` still calls it, so the create path is unchanged.
- `Services/TableService.cs::SaveReservationSettingsAsync` — the slot/seating/buffer guards AND the
  date-override parse ran after the settings row was mutated and after `RemoveRange` had marked the
  day/override rows Deleted. All payload refusals now precede the load entirely.
- `Services/GiftcardService.cs::CompletePurchase` — `giftcard.PaymentType = overridePaymentType` was
  written before the capture-status and validity guards, inside a payment callback whose scope goes on
  to complete other giftcards. The override now rides a detached `IPayable` for the provider reads and
  reaches the tracked entity only after every refusal has passed. `DetachedPayable` implements the
  interface rather than copying the entity so a new `IPayable` member breaks it at COMPILE time.

## Sites pinned, with the argument

Nine findings / eight keys remain, all in `Accepted` in the sweep test. Two categories:

- **Save-failure retyping** (CashPoint, CheckSplit, MarginRecipe, WorkforceInvitation, OfferProposal) —
  the mutation was staged, `SaveChanges` was called, and the DATABASE refused it; the catch retypes that
  as a conflict. The discriminating difference from the Meals case: there the guard threw out of a method
  whose contract is to RETURN A RESULT and whose caller carried on using the same scope. Here the throw
  is the request's terminal answer, rendered as 409, and the scope dies with the request.
  **What would invalidate this: a caller that catches one of these and continues on the same scope, or a
  retry loop around the call.**
- **Committed before the throw** (CartService, TerminalPaymentOrchestrator, OrderService) — the save
  succeeded, so tracker and database agree and the later throw does not roll it back.

## Non-vacuity

Moved a throw BACK after a mutation at a site fixed here (the GoodsGroupService retirement guard) —
not a deleted guard.

```
RED   : Failed: 1, Passed: 12  -- A_guard_never_throws_after_a_tracked_entity_was_mutated
        Services/Kassa/GoodsGroupService.cs:229 [UpdateAsync] Guard mutated goodsGroup.IsActive
        at line 220 (NEVER committed)
        key: Services/Kassa/GoodsGroupService.cs::UpdateAsync::goodsGroup.IsActive
restore: cp from pristine + touch (NOT mv -- preserves mtime and defeats the rebuild)
rebuild: bin/Debug/net8.0/WebApi.dll            22:57:48 -> 23:04:14
         WebApi.Tests/bin/.../WebApi.dll        22:57:48 -> 23:04:14
GREEN : Failed: 0, Passed: 13
```

The other 12 stayed green through the mutant, so the check discriminates rather than refusing
everything. The discriminating pair is pinned as tests, not prose:
`Catches_a_guard_that_throws_after_the_mutation_in_the_same_block` and
`Catches_a_guard_that_throws_from_a_block_nested_under_the_mutation` (the reference shape) against
`Stays_green_when_the_guard_precedes_the_mutation`, `Stays_green_when_the_throw_is_in_a_sibling_lambda`,
`Stays_green_when_the_mutation_and_the_throw_are_in_different_branches`.

**On the mtime trap specifically:** this sweep reads SOURCE at runtime via `TestRepoRoot`, so a
production edit changes the result with no rebuild at all and a stale test binary cannot manufacture a
false green here. That is a property of this test, not a general reprieve — the assembly timestamps
above were still checked rather than assumed.

## Suite

`dotnet test --filter "Database!=SqlServer"` (container-free tier, per the memory ceiling — no
container started, none touched): **4382 passed, 0 failed, 12 skipped**.

One real interaction found and fixed: `RowversionAssertionProviderTests` derives its scope from the
words a method body contains, and a body that QUOTES C# source contains whatever the quoted code says.
The synthetic `onProceed` sample spelled its guard `StaleRevision`, enrolling this static-analysis test
in a rowversion-provider rule it has no relationship to. The synthetic refusal was renamed rather than
the existing control widened, with a comment recording why so nobody "restores" it.

## Collision

**Not touched.** No edit here goes near `IMealsFundingAuthority`, its release members, or the Meals
funding interface, so `F-MEALS-FUNDING-AUTHORITY-COLLISION` is unaffected and no side is picked. The
Meals release path is not fixed by this lane — it is not present on this base — and when
`lane/meals-release-actor` lands, its site will already be staged guard-first and will therefore not
appear in this sweep.

## Constraints

- C1 append-only: no backfill, repair or purge; no append-only table touched.
- C4 money-path actor: no actor plumbing changed. The GoodsGroup VAT guard and the Giftcard capture are
  money-path READS re-ordered ahead of writes; no write lost its actor.
- C7 secrets: nothing logged; the Giftcard change adds no logging and copies provider REFERENCES
  (ids), no credentials.
- No migration authored. Nothing run against any database. No container started.

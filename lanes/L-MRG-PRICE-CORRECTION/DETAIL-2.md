# L-MRG-PRICE-CORRECTION attempt 2 — backdated correction, built; blocked on one column

Base: OkamAPI `lane/mrg-price-correction-2`, cut from `lane/margin-price-correction` @ `6368427b`
(itself cut from `feature/restaurant-modules` @ `3579bbbc`). Worktree `~/okam/wt-mrgprice2`.

Base chosen deliberately: attempt 1's five characterisation tests (`a371bffd`) ARE the measurement this
attempt has to move. Cutting fresh from `feature/restaurant-modules` would have thrown away the control
(the 2880 ore movement) that makes every number here meaningful. `feature/restaurant-modules` is unmoved
at `3579bbbc` and carries ZERO Margin commits since attempt 1, so the premise was re-verified, not assumed.

## Premise re-verified before building

- `MarginSupplierItemPriceService.ApplyEffectiveDatedPriceAsync` still refuses any instant not strictly
  after every existing one (`known.Any(p => p.EffectiveFrom > effectiveFrom)`), unchanged.
- The five attempt-1 tests still pass on this base, including the two that pin the hole at 10860 ore.
- The defect is REAL and unfixed. Not a fail-spec.

## What was built

| Concern | Where |
| --- | --- |
| `MarginPriceSource.Correction = 3` | `Enums/Margin/MarginPriceSource.cs` — string column at width 16, "Correction" is 10 chars, so NO migration |
| The bounded backdated write | `Services/Margin/MarginSupplierItemPriceService.CorrectPriceAsync` |
| Two coded refusals | `MarginErrorCodes.CorrectionWouldOpenTimeline` (400), `.CorrectionInstantOccupied` (409) |
| Reachability (C3) | `MarginSuppliersController.CorrectPrice` — `POST margin/supplier-items/{id}/prices/corrections` |
| Actor resolution | `ActorClaims.ResolveUserId(User)` passed VERBATIM, no prefix |
| Re-grounded refusal | `MarginErrorCodes.Unattributed` doc + `MarginPriceImportService.ApproveAsync` + `MarginPriceImportBatch` |

### The bound — why a correction can never become the open row

A correction is permitted ONLY where a strictly later price already exists, so it always closes at a real
successor boundary. The closing instant is the predecessor's own close when that is EARLIER than the
successor's start, and the successor's start otherwise — which preserves a genuine gap in the timeline
while covering the two ways an already-corrupt timeline would break this invariant: an absent or
improperly-open predecessor (historic double-open write-skew, which `MarginPriceResolver` defends against
for the same reason) would otherwise leave a null close and make the correction the OPEN row, and a
predecessor closing past the successor would make it OVERLAP. In a well-formed timeline both are no-ops.
The filtered unique index `(SupplierItemId) WHERE EffectiveTo IS NULL` is the physical floor underneath.

Self-review caught the overlap half of that after the first green tier: the original
`predecessor?.EffectiveTo ?? successor.EffectiveFrom` handled the null case only, while the doc comment
claimed it survived corruption generally. Fixed, and the tier re-run rather than the claim narrowed.

That bound also makes the two paths disjoint rather than overlapping: the forward path owns "there is
nothing later", the correction path owns "there is". Neither can do the other's job by accident.

### C1 — no money is edited

The only row touched besides the new one is the predecessor's `EffectiveTo`, which is the same boundary
move the ordinary forward path already performs on every supersession.
`A_correction_edits_no_existing_rows_money` captures every pre-existing row's (Price, Currency,
EffectiveFrom, Source) and compares field by field afterwards.

## The `con:` — re-grounding the refusal whose premise the ruling deleted

`MarginErrorCodes.Unattributed` refused an unattributed import approval **on the stated ground that**
"Margin's price history is append-only with no retraction path — a wrong price is superseded forward,
never withdrawn". `CorrectPriceAsync` makes that sentence FALSE.

RE-GROUNDED, not left standing on a deleted premise. The refusal never depended on irreversibility; it
depends on what the write does to money already reported. Approving a batch rewrites live cost prices;
appending a correction rewrites the cost of a week a statement may already have finalized. Adding a
retraction path adds a SECOND DOOR that needs the same lock. And a correction specifically is meaningless
unattributed — its whole content is "the earlier price was wrong", which unattributed is indistinguishable
from a second typo.

Five sites carried the deleted premise; all five re-grounded (`MarginErrorCodes`, `MarginPriceImportService`,
`MarginPriceImportBatch`, `MarginSupplierItemPrice`, and the attempt-1 test name that asserted permanence).

**Executable form:** `MarginUnattributedSymmetryTests` drives BOTH doors with the same four unnameable
actors and asserts the refusals AGREE (`approvalRefusal.Code == correctionRefusal.Code`), so a drift on
either side fails even if that side's own suite were updated to match its new behaviour.

## The wire tier — and a correction to what it can prove

`WebApi.Tests/Wire/MarginPriceCorrectionWireTests` drives the real host: route bound, body through the
input formatter, token minted and validated by the application itself.

**A first version of the attribution test passed while proving nothing.** It asserted only the STATUS CODE
of an unnameable caller and got 401 — from the authentication challenge, having never reached Margin.
Reading the BODY exposed it: the challenge writes an empty body, a real `margin.unattributed` writes
problem+json carrying the code.

The mechanism, now recorded in the test: `AddJWTAuthentication`'s `OnTokenValidated` looks the bearer's
`Identity.Name` up with `IUserService.GetByIdAsync` and FAILS the token when no such user exists. Since
`ActorClaims` falls back to `Identity.Name`, **no authenticated request can reach a Margin service with an
unresolvable actor**. The 401 is unreachable over HTTP at BOTH doors — it is defence in depth for
non-HTTP callers, and the wire-tier guarantee is stronger than the guard: every Margin money write is
attributed by construction. Stated plainly rather than faked.

Because the wire cannot vary the claim shape, `MarginCorrectionActorBindingTests` proves the actor BY
VALUE at the controller tier across all four claim shapes `ActorClaims` reads, each carrying a DIFFERENT
id — so a resolver reading the wrong claim returns a wrong value, not merely a non-null one. A reference
built as `"user:" + id` fails these assertions, which is the point.

## Falsification (production source mutated, then restored)

| Mutation | Result |
| --- | --- |
| M-A: delete `RequireCorrector` | RED: exactly the 8 attribution tests (4 correction + 4 symmetry), and only those |
| M-B: correction row written with `EffectiveTo = null` | RED: 7 tests across BOTH tiers — the "never the open row" claim is load-bearing |
| M-D: delete the `successor == null` bound | RED: exactly the 2 bound tests, one per tier, and only those |

Each restored by `cp` + `touch` + rebuild, with the assembly mtime read back each time. `git status`
asserted free of mutation markers afterwards.

**Assembly discipline:** the file changed by every mutation compiles into `WebApi.dll`, NOT
`WebApi.Tests.dll`. Watching the test assembly would have shown a stale timestamp and suggested a stale
run; the correct assembly (`WebApi.Tests/bin/Debug/net8.0/WebApi.dll`) was verified newer than the mutated
source before each measurement, and the authoritative run was preceded by a `--no-incremental` rebuild of
both.

## BLOCKED — the exact column

```
MarginSupplierItemPrices.CorrectedByReference   nvarchar(256) NULL
```

Mirrors `MarginPriceImportBatch.ApprovedByReference` exactly: same width, same `Truncate`-then-guard
discipline, same blank-after-truncation rule. Configure as
`b.Property(x => x.CorrectedByReference).HasMaxLength(256);` — no index change, no new table.

**The backfill question does not arise, and NOT for the sibling's reason.** `MarginSupplierItemPrices` is
an EXISTING table (created by `20260727221455_RestaurantModules_Initial`), so the "new table, therefore
NOT NULL from the first insert" reasoning established elsewhere today does NOT transfer to this lane.
But the column is nullable by DESIGN rather than by concession: `Manual` and `Import` rows legitimately
have no corrector, so NOT NULL would be semantically wrong however many rows the table holds. The
non-blankness is a per-source invariant enforced at the service by `RequireCorrector`, exactly as
`RequireApprover` enforces the nullable `ApprovedByReference`. (Margin is config-dark everywhere —
`appsettings.json` `Margin.EnabledStoreIds: []` — but that is not what decides the nullability.)

The one line to add, already written and commented out at the append site:
`CorrectedByReference = Truncate(correctedByReference, ActorReferenceMaxLength),`

**The ratchet:** `MarginPriceCorrectionTests.The_correction_row_cannot_yet_record_its_corrector` asserts
the property does NOT exist. It goes RED the moment the column lands, forcing whoever adds it to finish
the wiring and replace it with a by-value assertion. It also refuses the shortcut of adding the property
without the migration — model-and-EnsureCreated-but-no-chain is the AccountingSummaries defect verbatim.

## Deliberate omissions

- **No stage flag.** The module's other two sub-capabilities have one, but the Margin flag catalog is
  shared surface with three flag lanes in flight (`MarginStatusResponse`, `MealsFeatureFlagCompositionTests`,
  `ModuleConfigSectionGuardSelfTests` all move with it), and this lane cannot merge before the column
  lands anyway. Recorded as a cost, not an oversight: whoever lands the column should decide whether
  `Margin.PriceCorrections` is wanted before the endpoint goes live.
- **One shared-fixture change:** `Margin.PriceImport` for StoreB in `WireHostFixture`, without which the
  approve route is dark for every store and the second door is unreachable at the wire. No existing wire
  test depends on that stage being dark (checked).

## Residual, recorded not fixed

The exact-instant case remains unrepairable by design: a wrong price effective exactly at the week's
Monday midnight cannot be corrected, because append-only forbids editing it and the unique
`(SupplierItemId, EffectiveFrom)` key forbids a second row there. It now answers a NAMED code
(`margin.correction-instant-occupied`) instead of an uncoded `AppException`, so a client can at least tell
it apart from "you may not backdate at all". Attempt 1 judged this the ORDINARY case (a weekly price list
and a statement week both start on a Monday). Repairing it needs a different shape than one column —
either a superseding-row precedence in the resolver plus an index change, or a per-statement override.
Out of scope for a ruling that costs exactly one column.

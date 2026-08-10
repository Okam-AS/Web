# L-REVIEW-RESIDUALS — guard 1: the mail-provider declaration pin

Branch `lane/review-residuals-provider`, off `lane/growth-health-honest` @ `c11e78a6`
(the branch that introduced the pin; it is not on `feature/restaurant-modules` yet).

## The finding, verified before building

`GrowthMailProviderContractTests.Every_adapters_event_ingestion_declaration_matches_whether_it_can_verify_a_signed_webhook`
built its adapter list by hand —

```csharp
var adapters = new IGrowthMailProvider[]
{
    container.GetRequiredService<GrowthFakeMailProvider>(),
    container.GetRequiredService<GrowthSmtpMailProvider>(),
    container.GetRequiredService<GrowthPostmarkMailProvider>(),
};
...
Assert.Equal(2, refusing);   // "a positive anchor, so the loop cannot pass by finding nothing"
```

— and `SelectionContainer` registered the same three by hand, so a fourth adapter could not even
be resolved by the pin, let alone checked.

**Proof the brief was right, not assumed.** A fourth adapter was added to the shipped assembly
(`Services/Growth/GrowthDriftMailProviderTEMP.cs`) declaring `DeliveryEventIngestion.Possible`
while its `VerifyWebhook` throws `GrowthMailProviderCapabilityException` — exactly the
contradiction the pin exists to catch:

```
dotnet test --filter "FullyQualifiedName~GrowthMailProviderContractTests&Database!=SqlServer"
Passed!  - Failed: 0, Passed: 31, Skipped: 0, Total: 31
```

Green. The count anchor stayed satisfied because the three hand-listed adapters still produced
two refusals; the fourth was never examined.

## The change

- The adapter list is derived: `ShippedAdapterTypes()` walks `typeof(IGrowthMailProvider).Assembly`
  for concrete implementations. Test doubles are excluded by construction (they live in the test
  assembly).
- `SelectionContainer` registers those same derived types, so an adapter the walk finds can
  actually be resolved. An adapter it cannot construct fails naming the type rather than silently
  narrowing the walk (`Adapter(...)` re-throws with that sentence).
- `Assert.Equal(2, refusing)` — a fact about today — is replaced by two coverage facts:
  `examined == adapterTypes.Count` (every adapter found was put to the question), and every
  `GrowthMailProviderKind` resolved through the PRODUCTION `GrowthMailProviderSelection.Resolve`
  lands on a type the walk returned (what it reached, counted against what exists).
- The per-adapter assertion now names the offending type in its message.

## Red, then green

| step | run | result |
| --- | --- | --- |
| drift adapter present, pin as shipped | `~GrowthMailProviderContractTests` | 31/31 **passed** (the defect) |
| drift adapter present, pin derived | same | **1 failed / 30 passed** — `GrowthDriftMailProvider declares DeliveryEventIngestion.IsPossible = True while its VerifyWebhook refuses.` |
| drift adapter deleted, pin derived | same | 31/31 passed |

The mutant was deleted with `rm` (not `mv`), and the rebuild was confirmed: `WebApi.dll` mtime
moved and `strings WebApi.dll | grep -c GrowthDriftMailProvider` is `0`, so the green run did not
measure a stale binary.

## Tier

Base measured on this branch before any edit (not inherited from the lane's return):
`dotnet test --filter "Database!=SqlServer"` → 4360 passed / 0 failed / 12 skipped (4372 total).

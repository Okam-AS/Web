```
RETURN: L-TRIPLETEX-LABEL-MATCHES-THE-GUARANTEE
brief: d96cc00d
verdict: fail-spec
evidence: /Users/svendaneel/okam/Web-modules/pages/admin/tripletex.vue
spec_gap: The label's index is in the chain, not only the model, and this page never reaches the accounting-day double-post (AddTripletexIntegration.cs:84-89; TripletexAdminController.cs:82-94).
log: Label backed: all four Kjor-bilag buttons and rerunFailed funnel into TripletexVoucherPoster.PostAsync keyed on a deterministic ExternalKey.
That key's gate IS in the chain: 20260714014129_AddTripletexIntegration.cs:84-89 creates IX_TripletexVoucherLogs_ExternalKey UNIQUE, filter [ExternalKey] IS NOT NULL.
Model and snapshot agree (ApplicationDbContext.cs:687-689, ApplicationDbContextModelSnapshot.cs:8671-8673); no DropIndex touches it. C2 clause 2 holds for this pair.
This page never reaches the accounting-day double-post: TripletexAdminController.cs:82-94 resolves only the Tripletex provider, "Tripletex only - never re-fires the eMonkey webhook".
AccountingSummaries is written only by GenerateAndSendDailySummaryAsync, reached from AccountingController POST /accounting/store/{id}/generate and EmonkeyAccountingExportProvider.
Neither has a caller in this frontend: core/services/accounting-service.ts calls only the configuration endpoints; the overload this page uses (AccountingSummaryService.cs:236) writes nothing.
Closed anyway: 20260803093235_Kassa_AccountingSummaryDayUniqueIndex is the chain tip and creates IX_AccountingSummaries_StoreId_Date UNIQUE (commit c606993a).
So no label fix, no migration, ledger number 30 not needed here, no THROW number needed.
F1 substantive: the claim TTL is shorter than the client's own retry budget. Stale re-claim fires at 10 min = 600 s; MaxRateLimitRetries 5 x 120 s cap = 600 s per call, and PostAsync makes two.
A rate-limited run holds a claim ~20 min while it expires at 10; run B re-claims, its FindExistingVoucherAsync returns null, both post, both upsert one row - Tripletex holds two, the log one.
F1 fix is backend, no migration: derive the threshold from TripletexSettings, heartbeat CreatedUtc, or bound in-flight time. Unverified: whether Tripletex rejects a duplicate externalVoucherNumber.
F2 frontend one-liner, specified not applied: tripletex.vue:205-207 paints success=false+skipped=true ("another run holds the key") as red "Feil"; the retry that invites is F1's door.
Class check exists but is scoped out: HasPendingModelChanges() is asserted in 15 *MigrationLineageTests, all [Trait("Database","SqlServer")], and no Kassa or Tripletex lineage suite exists.
Needs no database round-trip; one provider-free assertion on the container-free tier catches AccountingSummaries and GrowthAuditEvents every commit. Specified, not measured; no SQL slot used.
Read-only lane: no file edited, no container, no migration, no push. Backend read by object from OkamAPI at integration/mig-stack-merge 7f8945dc.
END RETURN
```

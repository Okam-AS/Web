```
RETURN: L-REVIEW-RESIDUALS
brief: 202195ed
verdict: built
evidence: OkamAPI-modules lane/review-residuals-provider @ bd765c7d (worktree ../wt-resid-provider, off lane/growth-health-honest c11e78a6) and lane/review-residuals-rezone @ 15a1d0b7 (worktree ../wt-resid-rezone, off lane/wf-export-duplicate 3a4442a7); trx committed at artifacts/tests/3bdef5c6-fast-tier.trx and artifacts/tests/4a9cbb9c-fast-tier.trx; per-guard detail at ../wt-resid-provider/.lane/L-REVIEW-RESIDUALS-provider.md and ../wt-resid-rezone/.lane/L-REVIEW-RESIDUALS-rezone.md
log: Both findings verified against shipped code before building. Both real, and both understated in one way: the two guards do NOT live on one branch. Neither is on feature/restaurant-modules, and no branch carries both, so the work is one commit per guard on the branch that owns it rather than a merge of two lanes.
  Provider pin listed three adapters by hand and anchored on Assert.Equal(2, refusing). Added a fourth adapter to the shipped assembly declaring DeliveryEventIngestion.Possible while VerifyWebhook throws the capability exception: the class passed 31/31 green. The old SelectionContainer could not even construct it.
  Fixed by deriving both the adapter list and the container's registrations from typeof(IGrowthMailProvider).Assembly. The count is replaced by two coverage facts: examined == found, and every GrowthMailProviderKind resolved through the production GrowthMailProviderSelection.Resolve lands in the found set. An adapter the pin cannot construct now fails naming it.
  Same fourth adapter then red: 1 failed / 30 passed, naming GrowthDriftMailProvider and the contradiction. Deleted with rm, 31/31 green; rebuild confirmed by WebApi.dll mtime moving and strings | grep -c GrowthDriftMailProvider = 0, so the green run is not a stale binary.
  Re-zoning guard: EveryDeclaredAnchorIsActuallyProbedByTheGuard matches the probe body as text. Changed the kodeoversikt probe from i.StoreId == storeId to i.StoreId == 0, leaving the table name where it looks: that guard still passes 4/4.
  New StoreMarketAnchorBehaviourTests drives the real StoreMarketService over a real database. Cases derived from ZoneAnchors / MoneyAnchors at run time; the row is built from the anchor's EF entity type. Per anchor: no history accepts, the row under another store still accepts (the wrong-predicate killer), the row under this store is refused with the guard's code.
  Same wrong predicate then red: 1 failed / 10 passed, naming WorkforceIdentityCodeRegisterIssue - the anchor that had already been declared-but-unprobed once, in prose only. Restored, 11/11 green.
  Third defect, in my own builder rather than the brief: the flat placeholder violated CK_WorkforceAvailabilityExceptions_Bounds, one failure out of eighty on the first run. Two placeholder shapes are now name-aware, and a constraint it cannot satisfy fails loudly instead of skipping the anchor.
  Tiers measured on each branch, base and after, never inherited. Provider 4360/0/12 -> 4360/0/12 (an existing test changed, none added). Rezone 4362/0/7 -> 4373/0/7, the eleven new cases and nothing else.
  No SQL tier and no container taken: five were already up. Two of my OWN duplicate full runs were found racing on one worktree and killed, matched by worktree path, never by count; the other lane's run in OkamAPI-reslimiter was left alone.
  No migration authored: git diff --name-only against each base returns zero files under Migrations/.
  Not done, and outside the exit: the two commits cannot be merged as one lane. Each rides its own guard's branch, so whoever lands lane/growth-health-honest and lane/wf-export-duplicate should take these on top.
  C5: this is a suite result, not acceptance. Neither guard has a UI; what a person could walk here is the market write refusing a re-zoning, which the existing StoreMarket journey already covers.
END RETURN
```

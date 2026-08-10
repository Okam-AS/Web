# L-REVIEW-RESIDUALS — both halves are proven; there is no one tree in which both hold

Reason-shape hit: **(5) only one half of a two-part exit is shown** — but the diagnosis is sharper than that,
and the sharper version is what an owner needs. **Both halves have a real red-then-green record.** The exit
says *"both shown by fast-tier tests"*, which asserts **one tree** in which both hold, and no such tree
exists. **This lane is NOT verified by this pass.** The two records were rescued to durable paths, because
they were untracked and lived only in ephemeral worktrees.

## The `evidence:` line, preserved verbatim

    OkamAPI-modules lane/review-residuals-provider @ bd765c7d (worktree ../wt-resid-provider, off lane/growth-health-honest c11e78a6) and lane/review-residuals-rezone @ 15a1d0b7 (worktree ../wt-resid-rezone, off lane/wf-export-duplicate 3a4442a7); trx committed at artifacts/tests/3bdef5c6-fast-tier.trx and artifacts/tests/4a9cbb9c-fast-tier.trx; per-guard detail at ../wt-resid-provider/.lane/L-REVIEW-RESIDUALS-provider.md and ../wt-resid-rezone/.lane/L-REVIEW-RESIDUALS-rezone.md

## Rescued here

| file | from | sha256 |
|---|---|---|
| `provider.md` | `/Users/svendaneel/okam/wt-resid-provider/.lane/L-REVIEW-RESIDUALS-provider.md` | `f9b57256a7a59104b10daf35c9ca1c5f4e8910118a670970f7b550bcb3438caa` |
| `rezone.md` | `/Users/svendaneel/okam/wt-resid-rezone/.lane/L-REVIEW-RESIDUALS-rezone.md` | `fef7937c382d9d2b10fac7aa78700f2eb587b70b2301acd82b4b6fe070f44484` |

Hashes taken on source and destination together; they match.

## Both halves are genuinely proven, and each record is a good one

**Half 1 — the mail-provider declaration pin derives its adapter list by reflection.** `provider.md` does not
merely assert the defect, it *demonstrates* it: a fourth adapter (`GrowthDriftMailProviderTEMP`) declaring
`DeliveryEventIngestion.Possible` while its `VerifyWebhook` throws was added to the shipped assembly, and the
hand-listed pin **passed 31/31 anyway** — the count anchor `Assert.Equal(2, refusing)` stayed satisfied
because the three hand-listed adapters still produced two refusals and the fourth was never examined. With
the derived list, the same drift adapter gives **1 failed / 30 passed**,
`GrowthDriftMailProvider declares DeliveryEventIngestion.IsPossible = True while its VerifyWebhook refuses.`
Deleting the mutant with `rm` (not `mv`) returns 31/31, and the record confirms the rebuild by
`strings WebApi.dll | grep -c GrowthDriftMailProvider` = `0` — the stale-binary trap closed explicitly.

**Half 2 — the re-zoning guard has a behavioural case per anchor.** `rezone.md` names the hole precisely: the
existing `StoreMarketHistoryCoverageTests.EveryDeclaredAnchorIsActuallyProbedByTheGuard` matches anchors **as
text** (`body.Contains("_context." + setName + ".")`), so it cannot see a *predicate*. The mutation is a wrong
predicate, not a missing probe — `i.StoreId == storeId` → `i.StoreId == 0` in `HasZoneDerivedHistoryAsync`,
leaving the table name exactly where the text guard looks. Result:

| run | result |
|---|---|
| `~StoreMarketHistoryCoverageTests` (the text guard) | **4/4 passed — the drift is invisible to it** |
| `~StoreMarketAnchorBehaviourTests` (the new file) | **1 failed / 10 passed** — `A store holding a WorkforceIdentityCodeRegisterIssue row had its clock re-pointed anyway.` |

That is the strongest shape a falsifiability proof takes: the *old* guard green on the same mutant that reds
the new one.

## The clause that is unshown, stated exactly

*"**both** shown by fast-tier tests"* — meaning one tree, one tier run, both guards. Measured in
`OkamAPI-modules`:

| question | answer |
|---|---|
| `lane/review-residuals-provider` | `bd765c7d8685652ffa499bf5e40a79fe407cb87a` |
| `lane/review-residuals-rezone` | `15a1d0b7c327dee63c78188c9afd98d07f8ad548` |
| is either an ancestor of trunk `6d5328004`? | **no**, neither |
| is either an ancestor of the other? | **no**, in both directions |
| their merge base | `968fd273f1aaff3c425668ee7d5d085d216ff5ef` |

They diverge because each rides its own guard's branch — provider off `lane/growth-health-honest`
(`c11e78a6`), rezone off `lane/wf-export-duplicate` (`3a4442a7`) — and the RETURN says so: *"the two commits
cannot be merged as one lane. Each rides its own guard's branch."*

**And the two halves are in opposite states at the trunk, which is the fact that decides this:**

- **The provider half is at the trunk.** `6d5328004:WebApi.Tests/Growth/GrowthMailProviderContractTests.cs:451`
  reads `var assembly = typeof(IGrowthMailProvider).Assembly;` — the reflection walk the exit asks for, on
  the trunk, even though `lane/review-residuals-provider` is not an ancestor of it. It arrived by another
  route.
- **The re-zoning half is not.** `git ls-tree -r 6d5328004 | grep StoreMarketAnchorBehaviour` returns
  nothing. The file exists only on `lane/review-residuals-rezone`.

So today the exit is **half true at the trunk and half true on an unlanded branch**, and there is no commit
anywhere that carries both.

## The ruling this asks for

This is a **landing** question wearing a verification question's clothes, and it should not be closed by
citation. Two clean options, both an owner's:

1. **Land `lane/review-residuals-rezone`** (or re-do `StoreMarketAnchorBehaviourTests` against the trunk),
   then one fast-tier run at the trunk shows both halves and the exit closes as written.
2. **Split the lane in two**, one exit per guard, and verify the provider half at
   `GrowthMailProviderContractTests.cs:451` immediately — it is openable at the trunk today.

**Do not append a single path to the current exit.** Any one file names one guard, and appending it would
record half a two-part exit as if it were the whole — the failure this program has already ruled against.

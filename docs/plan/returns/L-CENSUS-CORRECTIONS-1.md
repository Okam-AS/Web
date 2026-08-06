```
RETURN: L-CENSUS-CORRECTIONS
brief: 9c4bc96a
verdict: built
evidence: lanes/L-CENSUS-CORRECTIONS/evidence.md (commit 5ad0ca0, pathspec only)
log:
Six corrections applied to both censuses; no verdict, site or finding removed.
Aliasing sec.2: hex-immunity was derived from TEST-tree randomness alone, but production
mints base64 into the same haystacks (4 sites + HMAC-over-GUID). Restated: the hex filter
holds only against a GUID; against base64 immunity is punctuation or length, per site.
Falsifier read at the producer: GrowthAddressProtectorTests.cs:54 = 3.3e-15 by LENGTH.
Class still clear at this tip (reviewer read all 14; I re-read 7 of my 23 at the producer).
"900 in 277 files" reproduces under no method: 966 occurrences, 940 lines, 287 files.
Overlap argument replaced: "250" has no border, so multiplicity is only 0.20%; the 10.00%
term is 2 of 22 windows impossible under the pinned version/variant nibbles.
Direction fixed: 1-in-180 and 1-in-130 OVERSTATE the rate against the true 1-in-196.
Row 6 divisor fixed to 10 x 16^-6 = 5.960e-7 (1 in 1,677,722), was 6.623e-7 (+11.1%).
False universals: 2 Assert.Empty sites carry needles; 19 of 120 predicate sites embed
literal substring searches - all immune by alphabet, not by the overload semantics given.
DI S9 guard EXISTS (ModuleFeatureFlagContractTests.cs:302, reds on a dropped AddRange):
harden-not-build + 5 gaps, 3 instrument limits, 2 Main regs, 2 "no guard" claims fixed.
END RETURN
```

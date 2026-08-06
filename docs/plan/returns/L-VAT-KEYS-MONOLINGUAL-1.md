```
RETURN: L-VAT-KEYS-MONOLINGUAL
brief: e4befa38
verdict: built
evidence: lanes/L-VAT-KEYS-MONOLINGUAL/keys.md
spec_gap: nineteen of the 35 monolingual keys are VAT-facing, not twenty; the other sixteen are the index_specialDays_ opening-hours block, which this lane's criteria do not reach
log:
Census re-derived from the e34977ac blobs by object, not the dirty checkout: 4817/4782/4782, gap 35,
zero unparsed, zero dupes — matches the collision lane; the brief's 4816/4781 is one low per locale.
VAT-facing subset is 19, not 20; the other 16 are the index_specialDays_ opening-hours block.
All 19 added to en.ts and de.ts. None qualified as deliberately Norwegian-only, and keys.md §4
argues that per key: none names a statute, forskrift or §, so C6 is not engaged. MVA renders as
VAT/MwSt. because 40+ existing keys already do, including receipts and the Z report.
Three flagged for a person: 'Avgiftsfri' (spans mval ch.3 unntatt and ch.6 fritatt — both
renderings narrow it), the presets being Norway's rates in any language, the Rohfelder calque.
Rival scan over 120 refs plus the dirty working tree: no en or de version of any of the 19 exists
anywhere and no ref rewords the Norwegian; the 19/20/21 branch disagreements were not touched.
Proof renders: 20 tests green, real components through the real resolver in all three locales;
reverting en.ts/de.ts to baseline turns 16 of 20 red. Full suite 112/113 suites, 2601/2603 — the
one failure pins the checkout basename to Web-modules@ and is proven pre-existing.
Root cause: the estate guards copy prefix-by-prefix (mrg_, ev_, gr_guest_); posset_/products_ were
never enrolled, both now are. Also found not fixed: posset_goods_hint is present but STALE in en/de.
END RETURN
```

```
RETURN: L-NORWEGIAN-ONLY-KEYS-TRANSLATE
brief: a5be9486
verdict: built
evidence: /Users/svendaneel/okam/web-noonly/lanes/L-NORWEGIAN-ONLY-KEYS-TRANSLATE/keys.md
log:
PIN REPRODUCES at e34977ac: 4817/4782/4782, 0 dupes, 0 keys absent from all three; gap 35, of which 34 are rendered on exactly the 3 surfaces the pin names (index 15, GoodsGroupsTab 14, products 5).
All 34 now carry en+de -> 4817/4816/4816, gap 1, 0 duplicates. No key deleted, no Norwegian string touched.
19 are BYTE-IDENTICAL to lane/vat-keys-monolingual @686e3c5 at identical positions (its parent IS this base) rather than re-worded -- two wordings for one key is how a merge breeds a duplicate.
PROVEN not asserted: git merge-tree of this branch x 686e3c5 is CLEAN and its merged dictionaries are byte-identical to mine, 0 dupes. The 15 authored are index_specialDays_*, styled off siblings.
THE 35TH IS NOT TRANSLATED: index_specialDays_date renders NOWHERE in the repo -- pinned with its reason, not deleted, per brief; and that reason is re-checked, M5 reds the moment a surface names it.
RATCHET test/translation-locale-symmetry.test.js, 108 tests, dictionary-level so it needs no $i( extractor and is not blind to the nine surfaces that build keys by concatenation.
BOTH DIRECTIONS: M3 new gap FAILS, M4 closed-gap-with-stale-pin FAILS; 8 mutations, each red for its own reason, all restored byte-for-byte, M0/M9 green.
C6 NOT ENGAGED, checked not waved: one string names SAF-T and the product produces it (pos-reports.vue:378 SaftService.Export). Nothing else among the 34 names a statute, forskrift or section.
CORRECTS L-TRANSLATIONS-COLLISION: a duplicate key does NOT win silently here -- ts-jest raises TS1117 and the suite fails to RUN (M7). Gated loudly at the test tier; production build NOT measured.
SUITE 112/113 suites, 2689/2691, core submodule populated at its own gitlink. The one red is journey-artifact-store.test.js pinning the checkout BASENAME to Web-modules.
Proven pre-existing by stashing this lane's whole diff and re-running that suite on the clean tree: the same 2 of 38 fail. Not mine.
NEEDS A PERSON, five, none blocking: index_specialDays_failed fires on the DELETE path at index.vue:625 while saying "could not save" -- inherited from the Norwegian, not introduced here.
Also Avgiftsfri->Zero-rated/Nullsatz narrows mval ch.3 vs ch.6; presets state Norway's rates in German; the reprice claim is backend, unverifiable here; posset_goods_hint still stale.
FOR THE MERGER: lane/mrg-waste-receipts goes RED by its own design once this lands -- empty its KNOWN_LOCALE_GAPS, exactly as its own comment instructs. Its index_ prefix guard can now be enrolled.
Committed a8177f8 on lane/norwegian-only-keys-translate. No push, no shared branch touched. C5: the UI was not walked.
END RETURN
```

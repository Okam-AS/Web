```
RETURN: L-BLOCKER-STALE-RERULE
brief: d5e6fbc5
verdict: built
evidence: lanes/L-BLOCKER-STALE-RERULE/rerule.md
spec_gap: none
reason: complete
log:
Re-derived all 14 stale verdicts at 8e2b57de (tip unmoved) / e34977ac. Split: 11 overtaken, 2 part-true, 1 unproven, 0 still-true in full.
Count reconciled: the recheck's stale table has 14 rows, not 13 -- F-UTLKVIT-SALE-ROW comes from the 6 already-fixed, not the 41 sustained. Tally of 13 is right.
Every overtaking named with build + first-parent landing commit: invoice pair d7ffdae9/21510917; gr-dispatch a1e2655f/029e2869; gr-unconfirmed 5719fc96, confirm-bruteforce + memcache c96cd21e, ai-request-body 5b2e99c8 all landed by 35696d6b; wf-push 991c21f6/569887a5; utlkvit pair + pos-tender 3a509b68 & 1854f594 / a273e013; ev-accept 8eee00f7/5c3a9be1; funckey a7b90cbd/5df07afa; fixture-divergence a62160e.
SPLIT 1 -- F-AZURE-FUNCKEY: two-site arithmetic overtaken (1 file, not 2), but the live key is STILL committed at the tip, OkamFunctionsDocumentRenderer.cs:28. clears_when's "never in a committed file" is still false. Rotation NEEDS A PERSON; no merge can close it.
SPLIT 2 -- F-WF-PUSH-SILENT: code condition fully met (Fail("NoPushRegistration") at WorkforcePushNotificationDelivery.cs:105, pinned :210/:281), but the half-applied repoint is untouched -- plan.md:14506 still reads resolve-and-record-the-actor, another flag's ruling. A document defect; 59 backend commits could not overtake it. NEEDS A PERSON.
UNPROVEN -- F-FIXTURE-BEHIND-BACKEND: verdict was TRUE at 31fc45d (file untracked, exactly six e2e scripts), confirming the recheck's false->stale re-ruling. At the tip the check exists in the strong form (both sides derived live from source, refuses a committed snapshot by design, six-arm --prove). But it is in NO automatic gate and NO receipt records a run. Met on the mechanism, unrecorded in fact -- C5. Needs a person to run it.
F-UTLKVIT-PREDICATE-COLLISION now literally matches its ruling: exactly 1 definition (KassaCreditSale.cs:25) and exactly 6 call sites, checkable on a branch a reader can check out -- which was the verdict's precise complaint.
TWO merge-order hazards were flagged and NEITHER fired: utlkvit landed 78 min before the tender-wire lane (a273e013 23:50 vs 21f79514 01:08) so the merge resolved to the shared predicate; and the gr-unconfirmed check sits in the same method as its binding, so no order could separate them. Both avoidances are unrecorded.
GATING: S-PILOT-SAFE (plan.md:671) carries 6 of the 14 and 5 are now met -- the sixth is F-AZURE-FUNCKEY, a live committed credential, the one id on that line that should genuinely stop a pilot. FT-GROWTH (plan.md:574) has all 4 of its met, but 13 of its 24 ids are foreign work (F-POS-TENDER is one), so clearing releases nothing there.
NOT CLEARABLE ANYWAY: checked all 14 flag bodies -- 0 name a fact: key, so `plan flag clear` refuses every one. Each needs a fact: key added or a recorded human ruling.
NEW C6, re-derived independently: RF-1313-systembeskrivelse.md:155 claims the credit-sale spec "er skildra der" in X/Z, but CreditSalesCount/Amount have zero code hits at the tip (lane/meals-xz-credit unmerged). Caused BY a273e013 -- the same landing that closed two of these blockers opened a statutory-claim exposure.
Smaller drift from the same landing: that doc's :153 says FinalizeService classifies "på betalingsmiddelet"; the tip classifies off the journal entry via KassaCreditSale.IsCreditSale(entry), which was the whole point of 3a509b68.
Instrument validated on a known-positive first (RequestBodyTelemetryPinTests.cs = 396 lines, matching the recheck to the line) and a known-negative. Braced ${REF}:path throughout; the bare form was confirmed to mangle in this shell.
The working-tree trap fired TWICE and was caught both times by git's "exists on disk, but not in <ref>" wording: reading the checkout would have scored F-AI-REQUEST-BODY not-fixed and F-FIXTURE-BEHIND-BACKEND already-fixed-at-its-own-ref -- one false negative and one false positive from one defect.
Read-only: nothing cleared, ruled or repaired; no suite, no container, no branch switched; the two mutation harnesses were read, not executed.
END RETURN
```

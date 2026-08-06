```
RETURN: L-MANIFEST-CONDITIONS
brief: 19bc3115
verdict: built
evidence: lanes/L-MANIFEST-CONDITIONS/applied.md
spec_gap: The brief names seven frontend heads created after the census; there were eight at 04:12Z and nine at 04:21Z, because the set grows while the lanes that make it are still running.
log:
Seven of seven APPLIED, none refused. Every one re-measured by object before it was written in, and all seven held.
Conflict census now 26 of 30 conflict / 4 clean: the 24 reported are 20C/4clean not 19; e8b58ec1 was listed "not run" while inside the denominator (CONFLICT 8); five older heads were never trial-merged (10,10,11,13,11 - all conflict). 19+4 never equalled 25. Sized on 19, a landing plan is short by SEVEN authored merges.
Fix count is 43, or 44 if a comment counts: 0dbec34b is one evidence file and 0 code files; 808d5095's only non-lanes file is jest.config.js +9/-4 with every changed line inside a // block.
20693381 x candidate = 28 conflicted paths, not 29. Still the worst merge in the estate; next is 5886ba30 at 13.
FALSE EDGE CONFIRMED: a1d57208 is NOT an ancestor of 4bbf34a5. It joins at merge 887f0512, two commits later - a sibling, not a child, both merged separately onto tip 8e2b57de.
Its conclusion survived and was re-verified: a1d57208, 54714dd6 and 4bbf34a5 are all ancestors of a6583a02. ADDED: 02684ecc carries a1d57208 but is NOT under a6583a02, and 01cd5eee is under neither - three heads in that family, not one.
"No test reds either way" now carries provenance: a half-quote inherited from 80493321 (whose same message records a mutation that DOES red) plus a mechanism argument, by a census that ran no suite.
Both lanes DID run suites - 2432/2433 (+5), 4394/0/12 (+4), 21 new backend tests - and every run is of the fixed state on a lane branch, never of the composed candidate. The claim stands on mechanism; C5 applies literally.
CORS is now a resolution rule: merge BOTH, and resolve ServiceCollectionExtensions.cs to 3c71b323's BrowserReadableHeaders.All, never the "ETag" literal. lane/gr-withdraw-origin carries 2a052800 and is the pair's backend half, so "drop the other four" cannot be followed.
Verified by object: at 2a052800's base 3579bbbc, Program.cs exposed "ETag" and BrowserReadableHeaders.cs did not exist; at 8e2b57de it exposes .All. The old commit was correct at its base and is wrong only as a resolution against today's tip - F-CORS-EXPOSURE-REVERT.
A dedup by date finds neither: identical AUTHOR timestamp to the second, commit dates a day apart.
Cut-off stated as 2026-08-05T03:08Z. Backend drift is ZERO (317, by comm against the appendix, not by counting). Frontend 116 -> 125 at 04:21Z, all nine listed, none classified.
The count moved inside my own pass - 8 at 04:12Z, 9 at 04:21Z - and lane/vat-keys-monolingual points at the modules tip itself, so it carries nothing.
Editing standard held: manifest 360 -> 568 lines, nothing deleted, every change marked [CORRECTED] with what it said before, and the census's own limits kept and extended by one.
Read-only git in both repos. No suite, no merge, no checkout, no ref moved, no push, no container.
END RETURN
```

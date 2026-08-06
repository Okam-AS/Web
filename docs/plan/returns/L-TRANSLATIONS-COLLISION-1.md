```
RETURN: L-TRANSLATIONS-COLLISION
brief: a5c593f0
verdict: built
evidence: lanes/L-TRANSLATIONS-COLLISION/keys.md
spec_gap: brief's fallback reading is inverted here -- utils/i18n.js resolves no->en->de, so the silent degrade is a missing EN/DE key rendering Norwegian, not a missing nb-NO key rendering English
log:
ALMOST NOTHING COLLIDES. 1,911 keys added across 117 refs (108 heads + 9 lanes, as-of
2026-08-05T03:06Z) plus the working tree as a 47th claimant; all three files ` M`. 1,321
added by one claimant; of the 590 added by 2+, 543 are BYTE-IDENTICAL -- one lane's commits
seen from descendant branches. Genuine branch-vs-branch divergence 47 no / 44 en / 48 de,
claimant-vs-baseline 24/25/50, collapsing to just 19/20/21 disagreements: fe-training-meals-
surfaces (49 behind) reworded a whole surface = 31 of no.ts's 71.
THE SILENT CASE IS PROVEN, NOT ASSERTED: 87 merges via `git merge-file -p --diff3` (stdout
only) = 33 conflict, 45 clean, 9 CLEAN WITH A DUPLICATE KEY; JS takes the later entry, no
conflict, no error. fe-events-margin-surfaces 2 money keys, mrg-waste-frontend 1 validation
key, fe-wf-self 1 (identical value), each x3 locales. Winner set by LINE POSITION, not by
which side is incoming -- the two money cases go opposite ways. Latent, not fired: no ref
carries a duplicate today. Validated on the brief's control first; 0 parse failures anywhere.
REMOVAL IS A THIRD CLASS: 3 of 4 removed keys are RE-ADDED by another lane, incl. the
control wfr_access_no_list (fe-wf-onboard, fe-wf-self); all four races conflict loudly.
BASELINE ALREADY DEGRADES: no.ts 4,817 keys vs en/de 4,782 -- 35 keys (20 VAT-facing) reach an EN/DE operator in Norwegian. Nothing resolved, no sentence picked.
END RETURN
```

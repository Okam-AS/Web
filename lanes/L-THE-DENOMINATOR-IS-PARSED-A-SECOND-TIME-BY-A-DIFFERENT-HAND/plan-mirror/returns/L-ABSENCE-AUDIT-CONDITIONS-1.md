```
RETURN: L-ABSENCE-AUDIT-CONDITIONS
brief: 7daf3e4f
verdict: built
evidence: lanes/L-ABSENCE-AUDIT-CONDITIONS/applied.md
spec_gap: brief anchors 636-647 and 650-651 are stale by ~5 lines (table is 637-642, rate sentence 644-646); applied by content
reason: —
log:
- absences.md 761 -> 875 lines. diff DELETES 17 lines, every one named by a condition. No compression; both demoted claims kept struck-through in place. Self-criticism verified intact after the edit: the four false zeros, S1.5 "a defect in THIS audit", the C-6 retraction, "93 is a floor", S8.8.
- ALL FIVE APPLIED, none refused outright. C5 applied in its second form (the stamp); landing the rows is REFUSED as impossible, not unwanted - the sweeps' per-claim sets were never written, so reconstructing 1,320 rows would re-run the census, not land it, and manufacturing rows to match a published total is this document's own failure mode.
- C1: `validated` -> `method-named`, disclosure caveat above the table naming where correctness WAS re-derived (14 S2b findings, 2 S8.4 calibration cases, 4 tick-marked items). I also renamed `unvalidated` -> `no method named`, beyond the letter of the condition, because complements of one rule cannot carry two vocabularies. Numbers untouched.
- C2: "healthiest" withdrawn, direction kept and attributed to the RETURN protocol's mandatory `evidence:` field, plus the three unsoundness grounds incl. that absences.md would classify largely unvalidated under its own rule.
- C3: diagnosis inserted from F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT after confirming it first-hand - `sed -n 8719,8721p ~/.claude/skills/plan-hub/bin/plan` returns the os.path.exists block verbatim. Inflation sentence deleted and marked withdrawn as false. Tracked-vs-untracked NOT restated; the text says why.
- C4: the review named two failures without naming which, so I RE-RAN ALL FOUR rather than repeat an attribution I could not inspect. Both failures are the ones described.
- DEMOTED L-DOWNLOAD-HEADERS-1.md:7 - claim TRUE when written. Lane returned 2026-08-01T16:08Z; docs/plan/briefs/L-DOWNLOAD-HEADERS.md mtime 2026-08-01 17:51, 103 min later. The "it quoted the brief's hash" inference is refuted by the return's own words: worked from the dispatch message, hash computed via brief_hash_of.
- DEMOTED L-PRICE-BYPASS-FIVE:77 - the SENTENCE was right too, not just the deletion. `git grep -n calculateTotalRewards HEAD` = exactly 1 hit, CustomerInfoModal.vue:305. The "five places" are five prose mentions in lanes/ and returns/, one of them the audited sentence itself. The absence search found itself.
- SUSTAINED L-MODAL-SEVEN: deliveryTypeLabel at plugins/global-mixin.js:97 since 76be1dce (Initial commit), present at the lane's own ref, so the sentence is false as written.
- CANDIDATE L-INVOICE-RETRY-RETIREMENT:8 - `git branch --contains 2497ce9d` answers 37 today, not the 36 recorded, and it IS an ancestor. But the commit predates the lane by ~3.5h and the 36->37 drift proves branches accrued after; a tip measurement cannot settle what it answered then. Not flipped either way.
- CLERK CORRECTION ADDED, NOT LAUNDERED: pre-edit grep proves L-JEST-COLLECTS-LANES appears exactly ONCE (line 730, S8.6, as a VALIDATED EXEMPLAR) and "83-84" appears nowhere. Recorded in S8.5 as an addition, exemplar left standing. NOT deletion-class: its own evidence says "Nothing was deleted" (:103) and "present and not collected" (:183-184); ceiling is one reversible jest.config.js line.
- NOT RE-DERIVED, left with caveats, not restated as mine: ~680, ~720, ~1,440, 51, ~700, ~620, 494, 403, the review's ~60, the 183-exit headline. The census was not recomputed.
- No commit, no push, no branch, no container, no suite. docs/plan/ has 0 tracked files and absences.md is untracked, so there is no pathspec to commit and no worktree that would hold it; amended in place. Backup at scratchpad/absences.md.bak.
END RETURN
```

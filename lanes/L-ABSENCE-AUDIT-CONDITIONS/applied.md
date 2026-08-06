# L-ABSENCE-AUDIT-CONDITIONS — the five review conditions against `absences.md`

Read-only outside this lane directory and the one document under amendment. No branch switched, no
container started, no suite run, no commit, no push. `docs/plan/` and `lanes/L-ABSENCE-CLAIMS-AUDIT/`
carry **0 tracked files** (`git ls-files docs/plan/` → 0; `absences.md` is untracked), so there is no
pathspec to commit and no worktree that would contain the file. It was amended in place.

Target: `lanes/L-ABSENCE-CLAIMS-AUDIT/absences.md`, **761 → 875 lines**. Backup of the pre-edit file at
`/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/absences.md.bak`.

**Nothing was compressed and no self-criticism was removed.** `diff` deletes **17 lines**, every one of
them a sentence a condition named. The two demoted contradictions are preserved struck-through in place
rather than deleted. Verified still present after the edit: §1's *"four times my own detector lied to
me"*, §1.5 *"A defect in THIS audit"*, the C-6 retraction, §2's *"I report the direction of the error
rather than a false precision"*, §8.8's false-zero accounting, and the sweep's *"reversed one of its own
rulings"*.

## The line numbers in the brief are stale for two of five conditions

The brief anchors §8.1 at 636–647 and the rate comparison at 650–651. In the file as delivered, the
table is at **637–642** and the rate comparison at **644–646**; 650–651 is §8.2's opening sentence, and
line 649 is a section header rather than the disclosure sentence the brief describes. The §8.3 anchors
(663–673, 675–682) match exactly. **Applied by content, not by line number.** Concurrent lanes moving
line numbers under a reader is an already-recorded hazard in this program.

## Verdict per condition

| # | condition | verdict |
|---|---|---|
| 1 | §8.1 — rename `validated` → `method-named`, insert the disclosure caveat | **applied** |
| 2 | rate comparison — keep direction, attribute to `evidence:`, drop *healthiest* | **applied** |
| 3 | §8.3 — insert the diagnosis, delete the inflation sentence | **applied** |
| 4 | §8.3 list — demote two, mark the rest candidates | **applied, and re-derived first-hand** |
| 5 | row-level evidence — land the rows or stamp §8.1 as agent authority | **applied as the stamp; landing refused, see below** |
| — | the clerk's JEST correction — **add**, do not launder | **applied as an addition** |

**None refused outright. One was applied in its second form (5), and one consequential rename was made
beyond the letter of the condition (1).** Both are recorded below rather than left to be discovered.

---

## 1 — §8.1, applied

`validated` → `method-named`. A block quote above the table now states plainly that the column is a
**disclosure** measure — it counts claims that name a surface they were checked against — and that it
does not mean the claim was shown true.

**One rename beyond the letter of the condition.** The condition named only `validated`. I renamed
`unvalidated` → `no method named` with it, because the two are complements of one rule and leaving
`unvalidated` beside a renamed sibling would have reproduced the exact defect the condition exists to
fix. The numbers are untouched.

**Where correctness actually was re-derived is now named at the table**: the fourteen §2b findings
(`V-1`–`V-9`, `C-1`–`C-5`, plus the retracted `C-6` → `V-9`), the two §8.4 calibration cases, and the
four ✔-marked items (`grep -c ✔` → 4). **The review's figure of ~60 of ~1,440 is attributed to the
review and explicitly not restated as this lane's** — recomputing it would require the per-claim lists,
which do not exist (condition 5).

The caveat also records that **the three rows are not one quantity**: three judging agents, three
readings of the rule, no shared calibration, so the `total` row sums unlike things.

## 2 — the 21% vs 80% comparison, applied

*healthiest* is withdrawn in terms. The direction is kept and attributed to the **RETURN protocol's
mandatory `evidence:` field** — a return is compelled to name a surface where a lane working note is
not, so the gap measures a form requirement rather than two populations of differing care. The three
unsoundness grounds are recorded: two uncalibrated judges; claim counts exceeding their own candidate
pools (~700 against 494, ~620 against 403) with the excess never reconciled; and per-claim crediting
that structurally favours a short return, **under which `absences.md` itself would classify largely
unvalidated** — §0 names its ref once, for everything below it.

The pool figures 494 and 403 are the review's; this lane did not re-derive them and does not assert them
as its own.

## 3 — §8.3, applied

*"confirmed symptom, not a diagnosed cause"* is replaced by the diagnosis recorded on
`F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT`, with the three offending lines quoted.

**Confirmed first-hand before writing it.** `sed -n '8719,8721p' ~/.claude/skills/plan-hub/bin/plan`
returns the `os.path.exists(path)` block verbatim: the whole decorated evidence string is the argument.

The sentence claiming every downstream admissible-evidence figure is inflated is **deleted and explicitly
marked withdrawn as false**. The refusals are protocol-correct — §2.4 requires a single existing repo
path, so an annotated line genuinely is inadmissible; the figures were misread as file-existence counts.

**The tracked-versus-untracked framing is not restated.** Per the operating note it is a correlation that
was published and then refuted, and the amended text says so in terms so no reader reintroduces it.

## 4 — §8.3 list, applied on re-derivation rather than on the review's authority

The review named two failures without naming which. **Rather than repeat an attribution I could not
inspect — the error this lane exists to correct — I re-ran all four.** The two that failed are the two
the review describes: both sweep-attributed, both in modes this document's own §0 and §1 legislate
against.

**DEMOTED — `L-DOWNLOAD-HEADERS-1.md:7`.** The claim was **true when written**. The lane returned
`2026-08-01T16:08Z` (`log.md:178`); `docs/plan/briefs/L-DOWNLOAD-HEADERS.md` has mtime
`2026-08-01 17:51` — **103 minutes later**. The audit's supporting inference (*it quoted the brief's
hash, so the file existed*) is refuted by the return's own text: *"I worked from plan.md's lane entry
plus the dispatch message"* and *"hash above computed read-only via `brief_hash_of`"*. This is §0 lines
20–22 — *"was wrong"* versus *"has since been created"* — applied against the audit itself, and the same
shape as the census whose two "absent" files were written 10 and 74 minutes after it ran.

**DEMOTED — `L-PRICE-BYPASS-FIVE:77`.** The sentence was **right**, not merely the deletion.
`git grep -n calculateTotalRewards HEAD` → **exactly one hit**,
`components/molecules/CustomerInfoModal.vue:305`, its own definition as claimed. The "five places" are
five **prose mentions** in `lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md:77`,
`lanes/L-COMPOSE-FE-CANDIDATE/compose-run.md:247`, `lanes/L-PRICE-SHADOW-GUARD/DETAIL.md:111` and `:112`,
and `docs/plan/returns/L-PRICE-BYPASS-FIVE-1.md:20` — every one a document *about* the deletion, one of
them the audited sentence itself. **The absence search found itself**, the hazard logged the same day as
*"`lanes/` is now searchable, so root-wide `-S` searches match their own evidence."*

**SUSTAINED — `L-MODAL-SEVEN`.** `deliveryTypeLabel` is defined at `plugins/global-mixin.js:97` and has
been since `76be1dce` (*Initial commit*, 2025-09-28), present at HEAD and at the lane's own ref. The
sentence is false as written. The amendment notes its underlying observation may still be sound — a
modal that will not mount where the global mixin is not installed — which is §8.4's claim-versus-
explanation split.

**CANDIDATE — `L-INVOICE-RETRY-RETIREMENT:8`.** A measurement the document did not have: today
`git branch --contains 2497ce9d` in `OkamAPI-modules` answers **37**, not the 36 recorded, and
`git merge-base --is-ancestor` → true. But `2497ce9d` is dated `2026-08-02 13:38 +0200` and the lane
returned `2026-08-02T15:13Z`. **The drift from 36 to 37 is itself evidence that branches accrued after
the fact**, and a tip measurement cannot settle what `--contains` answered that afternoon. Carried as a
candidate, not flipped in either direction.

**CANDIDATE — `L-JOURNEY-MARGIN/NOTES.md:94-102`.** Not re-derived here; left on the sweep's authority
and marked as such.

The remaining sweep-attributed contradictions, and the 46 in the census, are now stamped **candidates
needing per-item re-derivation at the ref each claim was written against**.

## 5 — row-level evidence: the stamp, and why landing was refused

`lanes/L-ABSENCE-CLAIMS-AUDIT/` holds `absences.md` and nothing else. The per-claim lists behind ~700 and
~620, and the 46 sweep contradictions, are not on disk.

**Landing them is refused because it is not possible, not because it is unwanted.** The two sweeping
agents returned prose summaries; their per-claim working sets were never written and did not survive
them. Reconstructing 1,320 rows would be **re-running the census, not landing it** — a different lane,
and one that would produce a second set of numbers that could be mistaken for a verification of the
first. Manufacturing rows to match a total already published is the precise failure this whole document
is about.

**So §8.1 carries the stamp**, in the review's own words: *a census whose rows cannot be inspected is a
number, not a measurement*, and only the `plan.md` row is hand-checkable against this document.

## The clerk's correction — added, not laundered

Verified before writing: `grep -n L-JEST-COLLECTS-LANES absences.md` on the pre-edit file returns
**exactly one line, 730**, in §8.6, as a **validated exemplar**. `grep -n "83-84"` returns **nothing**.
The attribution that `absences.md` named `L-JEST-COLLECTS-LANES:83-84` as its largest unverified
deletion-class claim **was never in the document**.

It is therefore recorded in §8.5 as an **addition**, saying so in terms, with the §8.6 exemplar entry
left standing.

**And it is not deletion-class**, which the lane's own evidence establishes twice:
`lanes/L-JEST-COLLECTS-LANES/evidence.md:103` — *"Nothing was deleted"* — and `:183-184` — *"the files
are present and not collected, so it is the exclusion doing the work and not their absence."* The
consequence ceiling is one `testPathIgnorePatterns` entry in `jest.config.js`, reversible in one line.
The claim that *is* unvalidated is the population claim at `:83-84`: that 29 superseded assertions
silently rejoin the green count.

## Numbers this lane did not re-derive, and did not restate as its own

~680 · ~720 · ~1,440 · 51 · ~700 · ~620 · ~150 · ~500 · 494 · 403 · the review's ~60 · the 183-exit
headline · the 65 case-2 exits. Each is left in place carrying its caveat. **The census was not
recomputed and this document does not claim it was.**

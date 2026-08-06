```
RETURN: L-XZ-SIGNED-COUNT
brief: f3206535
verdict: built
evidence: lanes/L-XZ-SIGNED-COUNT/mutation-log.md
log:
Base 9cbe2b93 verified; commit 6c394057 descends from 9bdfc267, 569887a5, ca2570ac, 9cbe2b93.
integration/mig-stack-land = 4b37f81b, confirmed NOT an ancestor (diverged). Not used.
Fix: TrailingCount allows one optional '-' after the last '(' before digits; one-digit rule kept.
Reproduced pre-fix: the paper read "Sesongens smaksmeny (... -1 234,00" - the reviewer's line.
BRIEF DRIFT: at amount -123,00 it reads "(-1...", not "(-12..."; "(-12..." is what -12,00 prints.
Both widths pinned, so the quoted form is on record at the width that makes it. Not fail-spec.
Sign added to the SWEEP not just the rule: a signed goods group rides all 25 cells, 30 rows each.
New 5-world theory; rows found by amount within section, never by label; asserts sign + all digits
and no ellipsis after the last '('. Non-vacuity observational: label shorter than at a 4ch amount.
M1 revert-the-sign-allowance: 913/913 -> 34 failed -> restore 913/913. KILLED. Red and green both.
Of the 34: 5 are the new theory, 28 are pre-existing sweep cells (X and Z), 1 the vacuity floor.
M4 choke-point removal: 59 failed, KILLED. M2 and M3 SURVIVED - reported, not hidden.
M2/M3 unreachable via Build: all 45 Row( labels end " (<numeric>)", so the last group is always
digits. Defensive predicates from ca2570ac, not weakened here. No unreachable pin invented.
No container, no migration, no push, no shared ref moved. C6: no statute widened, no section ref.
END RETURN
```

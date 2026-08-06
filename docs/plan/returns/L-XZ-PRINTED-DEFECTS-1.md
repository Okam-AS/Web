```
RETURN: L-XZ-PRINTED-DEFECTS
brief: 7a1d4658
verdict: built
evidence: lanes/L-XZ-PRINTED-DEFECTS/mutation-log.md
log:
BASE 9bdfc267 (lane/xz-credit-fields tip); worktree wt-xzprinted; commit ca2570ac.
MY COMMIT IS A DESCENDANT of BOTH 9bdfc267 and 569887a5, merge-base verified: a merge
taking only the parent drops the nine fields, the credit predicate AND this fix.
mig-stack-land not chosen - diverged, not behind.
DEFECT 1 WAS STILL LIVE. The sibling sized the label to fit ONE world (count 1 beside a
ten-char amount = exactly the width available) and its guard builds that world. Every
count >=10 re-truncates, and the count sits at the END of the label: 12 printed "(1...",
1234 printed nothing - a wrong plausible count, the worse half. Fixed at the choke point:
Row excludes a trailing all-digit group, so prose gives way and figures never do. Naming
NOT widened, no section ref, no migration, KassaCreditSale untouched. Defects 2/3 held,
now pinned BY VALUE (map, coverage from Enum.GetValues) and BY PLACEMENT, not by absence.
16 pins ALL on the rendered document; rows found by amount per section, never by label.
MUTATIONS 4/4 RED, 4/4 RESTORED GREEN - 8 states, full builds, mtime-confirmed, none
survived. 2 NO-RESULTs + one exit=144 were MY harness (replace("",x); tail), not the code.
SUITE 4672/4660/0/12 vs base 4656/4644/0/12; 0 containers; ev-dietary dirt restored.
END RETURN
```

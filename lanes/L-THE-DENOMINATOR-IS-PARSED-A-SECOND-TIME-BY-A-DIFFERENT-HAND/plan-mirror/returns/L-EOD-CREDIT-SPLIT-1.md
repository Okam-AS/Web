```
RETURN: L-EOD-CREDIT-SPLIT
brief: 5b013122
verdict: built
evidence: lanes/L-EOD-CREDIT-SPLIT/mutation-log.md
log:
Defect confirmed at base, then fixed. Base verified: lane/xz-printed-defects
@ 9cbe2b93, descendant of 9bdfc267 + 569887a5 + ca2570ac (all three checked).
Commit f028c0a8 on a NEW branch+worktree; no shared ref moved, nothing pushed.
Company-account ore leave EodService's default arm. KassaCreditSale still owns
the question: IsCreditLine added INSIDE it, CreditPortionOf defined on it, so
one place still decides which lines are credit. meals-xz-credit read not taken:
it predates this base and its diff DELETES KassaCreditSale.
Receipt prints Kontant/Kort/Annet, Sum mottatt, then Kredittsalg (ikke mottatt)
Pinned both directions by value; all figures distinct (15000/25000/7000/35000).
3 production mutants, each red then green; WebApi.dll back to 719b3243 each:
default-arm reds credit 35000->0; credit-in-takings reds Annet 7000->42000;
ReceivedTotal absorbing credit reds Sum mottatt alone 47000->82000/88000.
Container-free only: 13/13 EOD, 4717/0/12 full tier. No container/migration.
Report not a write (C4). No statutory naming widened, no section added (C6).
END RETURN
```

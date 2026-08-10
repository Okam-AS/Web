```
RETURN: L-MIG-NUMBER-CLAIMS
brief: 3e363ed6
verdict: built
evidence: lanes/L-MIG-NUMBER-CLAIMS/claims.md
log:
28 MIG numbers checked (denominator), from 317 backend refs/heads + 0 refs/lanes, 33,108 ref x
file rows, 19 pending-epoch migrations of 181. Frontend empty: 102 heads + 7 refs/lanes, no ledger.
5 of 28 numbers collide, not 1: MIG-12, 19, 20, 21, 22 - derived twice (parsed name, then whole
normalised header) so unbackticked entries could not hide behind an empty string.
MIG-21 is the only two-migration-file collision: a6a1174b 20260731203011 vs 23f6bbeb
20260801102621, neither an ancestor of the other; the two Margin files differ by an 8-line
comment ONLY, same CREATE TRIGGER, no IF OBJECT_ID guard, so landing both errors hard.
MIG-22 is migration vs RESERVATION: bd3a840f adds 28 files and NO migration (its own message
says so) while adding DbSet+2 indexes to ApplicationDbContext -> live C2/AccountingSummaries shape.
MIG-12 was a FIVE-way collision, resolved by serial renumber 2026-07-30 (df8dc478 12->14, then
15/16/17); MIG-19/20 are ledger-only, on stalled unmerged lane/trb2.
MIG-17 (the pilot-deadline entry) IS BUILT on INT as 20260731215452 and both ledger copies still
say not-built; 20260731220005 is on INT holding no number. Two different findings, both named.
CORRECTION: brief+stack.md say integration/mig-stack-land extends INT. It FORKS - is-ancestor
exit 1, 59 INT-only commits incl bd3a840f; INT last moved 14h before stack.md was written.
END RETURN
```

```
RETURN: L-LEDGER-NUMBERS-ARE-FREE
brief: c207607b
verdict: built
evidence: lanes/L-LEDGER-NUMBERS-ARE-FREE/finding.md
log:
3 copies, not 2: INT feature/restaurant-modules 8e2b57de blob 91de8393 MIG-1..22; STACK mig-stack-land 4b37f81b 50a98d75 1..27; MERGE mig-stack-merge 24cd4ead a96faee3 1..29, in flight.
Checked against migrations, never the ledger: THROW 5\d{4} from every non-Designer migration per ref + 332 heads -> 31 distinct Migrations trees. INT files are a strict prefix of STACK's, 0 absent.
CONFIRMED: 50018 spent on INT by 20260731220005_Workforce_IdentityCodeRegisterIssues.cs:62 while INT:291 calls it next-free. 50019, 50001-50006, 50074 free everywhere; 50073 is the true ceiling.
NOT FIXED ANYWHERE, contra the flag: all THREE copies still hand the author the literal THROW 50018 body (INT:283 STACK:426 MERGE:459); the note sits 8 lines below the block and never rewrites it.
50051 free at INT:162 but TAKEN on the chain by 20260801113131 - STACK:305 / MERGE:338 still repeat "50051 ... is free" inside an entry they head LANDED. INT's next-free MIG-23 is landed on STACK.
NEW: MIG-28 has TWO authored files. wf-bootstrap-one-engagement 6fa2cbc3 holds 20260803124302, its ledger heads it MIG-28; finalize-index-or-a-reason 5e53de83 holds 20260805160524, wrote nothing.
STACK:105 says 28 "still free" (written 5h before claim 1); MERGE:1135 reserves it for claim 2 "and nothing else", never names claim 1. MERGE's tie-break a96faee3:1165 cannot rule - both have a file.
CORRECTION: ceiling is FIVE low vs the stack tip, not six; the six came from blob 6a402d2d = wf-bootstrap-one-engagement, stack tip +1 unmerged commit. Vs MERGE it is seven. Both flags stand.
Corrections owed per copy in finding.md §5; free numbers in §6 (THROW 50019 then 50075+; MIG 30+, 28 contested, 29 Growth's). Read-only: no renumber, no migration, no edit, no commit, no suite.
END RETURN
```

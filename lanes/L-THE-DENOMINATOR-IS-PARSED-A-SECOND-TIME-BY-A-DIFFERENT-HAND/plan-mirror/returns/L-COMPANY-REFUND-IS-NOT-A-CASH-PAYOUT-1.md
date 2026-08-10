```
RETURN: L-COMPANY-REFUND-IS-NOT-A-CASH-PAYOUT
brief: 2054de52
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-ab18757354501b772/lane/company-account-referenced-return.patch
log:
Isolation refused writes to OkamAPI-modules and `git -C`. Worked from a source copy; all 4 base files byte-identical to the shared checkout. The change is a PATCH, not a commit.
Intended shape read from the spec, not invented: 20-company-meals-spec.md:107 and :37 - a Reversal allocation is keyed to the RETREC through the read-only journal projection, never minted by HTTP.
So the Meals limb already exists and needs no new code. The whole defect is POS-side: the RETREC named a tender the sale never used, and the drawer was paid out for it.
RED on unmodified code, 6/6: RETREC tender=Cash; drawer PayOut -14900; expected cash 100000->85100; X-report CashTotal -14900; with no open cash day the refund is refused outright; no company route exists.
Added POST /pos/payment/company-account/{journalEntryId}/refund on PosController: journals PaymentType.CompanyAccount, reads no drawer session, writes no CashDrawerTransaction, needs no open day.
Closed the wrong control as well: RefundCash refuses a CompanyAccount original and names the company route; the company route refuses a non-CompanyAccount original so it cannot skip a real pay-out.
GREEN 12/12, including SAF-T: the return exports payment medium 12006 CUSTACCT (kundekonto), not 12001 CASH - that follows for free once the tender is truthful. X-report CashTotal 0.
Mutation check (CompanyAccount->Cash, with touch to defeat the mtime trap): 6 of 12 red including the central claim; restored, 12/12 green. The assertions are not vacuous.
Slice `Database!=SqlServer` over Kassa|Meals: baseline 1181/0/3 measured by me, after 1193/0/3. No SQL slot used; no container started, stopped or entered; owner's :3971/:5971 world untouched.
C4: the actor is the till operator from OperatorPinService.GetActingOperatorAsync, stamped on the RETREC per kassasystemforskrifta 2-7(5), pinned by a test.
F-MEALS-FUNDING-AUTHORITY-COLLISION is NOT hit. The three Meals ledger tables carry no actor column at all, so no actor-kind value had to be chosen; provenance runs SourceJournalEntryId -> this RETREC.
C1 clean: no UPDATE or DELETE anywhere. The RETREC is a new row; the Reversal allocation is appended by the existing projection worker. C2 clean: no migration, PaymentType is already an int column.
Judgement call for the reviewer: 5-3-7's second paragraph ties signature+phone to a "tilbakebetaling til kunde". A company return pays nobody back, so both are dropped there; the reason (first paragraph) stays.
That relaxation is reachable ONLY from the new route - every other caller of both finalize-return paths passes Cash or a terminal type. A cash return still demanding a signature is pinned by a test.
C3 GAP, not closed and not closable from here: no Core pos-service.ts method and no POS UI control. This worktree is Web@d7b5f3f, which has no components/admin/pos and an empty core/. Needs a frontend lane.
END RETURN
```

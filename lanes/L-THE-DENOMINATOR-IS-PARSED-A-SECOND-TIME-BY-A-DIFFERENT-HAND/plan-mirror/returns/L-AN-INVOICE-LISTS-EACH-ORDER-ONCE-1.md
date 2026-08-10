RETURN: L-AN-INVOICE-LISTS-EACH-ORDER-ONCE
brief: 083053a5
verdict: built
evidence: docs/plan/lanes/L-AN-INVOICE-LISTS-EACH-ORDER-ONCE
log:
lane/an-invoice-lists-each-order-once @ a9d408bfb, parent b368d930e. A REVIEWER READS TWO BRANCHES: the pin on lane/pos-coverage-opened, the fix here. Not pushed; trunk 057c390ad untouched.
PREMISE VERIFIED AT THE REF: guard is numberOfMonths > 24 at line 932, and the month match is Completed.Month == month.Month at lines 943 AND 956 -- twice. Pin run: Failed 1, Passed 6.
KEYED ON YEAR AND MONTH against the iterated month. Sections stay driven by the invoice PERIOD, not by grouping lines: the empty-month skip and the day-range label both need the loop index.
The two identical Where clauses became one materialised list. The membership rule is what was wrong, and a second copy beside the sums is how a corrected one drifts out of agreement with its rows.
THE HEADING CARRIES THE YEAR TOO, and that is part of the fix: two sections headed "1.-31. mai" are arithmetically right and still impossible to reconcile against a store's own books.
Pin passes because the code changed -- assertion and fixture byte-untouched, diffable to zero. InvoiceDocumentTests 7 -> 9 (both additions mine), all 9 green; all 87 Invoice-named tests green.
Added tests for what the pin does not cover: month sums reach the invoice total (parsed back out of the rendered nb-NO currency), and the two same-month sections can be told apart.
MUTATION 4/4 KILLED, judged by the sibling's verify-mutations.py (imported byte-identical), never by the runner's output: every run executed total=9, none differed from baseline. Exit 0.
Your third correction was already in force: dotnet-suite.sh logs per-invocation total/failed, builds every run, and refuses unless WebApi.dll's mtime moved. All four printed RED (0) as you predicted.
Negative controls, precisely: STALE fired FOR REAL on the first baseline (exit 91, nothing had changed). The ZERO control was NOT run -- it needs a dotnet invocation and load stood at 40.1.
NO UNEXERCISED SIBLING PATH, measured three ways: InvoiceOrderDetailArrayItem is built in one loop only; the credit note copies period bounds into that same GetInvoiceModel; no line falls outside the period,
because orders become lines only via Completed >= model.From && <= model.To and the invoice takes those same values. That last is the shape where year+month keying would be WORSE than month-only.
WrappedService.cs:189,199 also matches month-only but is NOT a defect -- its orders are bounded to 2025-01-01..12-31, one calendar year. Recorded so nobody "fixes" it later.
TIER 4958 passed / 1 failed / 10 skipped, no abort line. The failure is GiftcardBalanceTests.Passing_a_gift_card_on..., a KNOWN pin from b368d930e; reverting my files reproduced it identically.
I lost time to the stale-build trap: after the sweep I ran --no-build without building, and the M4 mutant still in the binary threw where my code seemed to. A throwaway _Diag test settled it.
END RETURN

```
RETURN: L-CREDIT-NOTE-NUMBER
brief: 44b5f04c
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-CREDIT-NOTE-NUMBER/receipt.md
log:
Defect confirmed live at tip 26599c6e; tip moved to 569887a5 mid-lane, neither of my two files touched by that range, so I rebased and re-measured there.
Worktree /Users/svendaneel/okam/OkamAPI-cnnum, branch lane/credit-note-number, one commit 24c95aa9 on 569887a5. Nothing pushed, feature/restaurant-modules never moved.
Fix: InvoicesController now names both invoice downloads from the DOCUMENT's own number via one helper, model.Invoice.Heading + "-" + model.Invoice.Number + ".pdf", instead of the route parameter.
Filename only. No write touched: CreateCreditNote's insert and its actor path are unchanged, so C4 does not come into play. No statute or section reference added or widened. No migration, no append-only table, no new log call.
Pin: PdfDownloadWireTests.A_credit_note_downloads_under_its_own_number_not_the_one_it_credits, renamed from ..._under_the_number_of_the_invoice_it_credits, which pinned the defect and was satisfied by it.
It POSTs /invoices/creditnote/990501 through the wire host and reads Content-Disposition off the response headers, not a controller variable.
The numbers genuinely differ: 990501 is seeded explicitly, the credit note's 990502 is assigned by the database on insert. The test asserts they differ FIRST, with a message saying an equal pair would make the name assertion meaningless.
It then asserts the name by value against the credit note's own number, and separately that it is not KREDITNOTA-990501.pdf.
Mutation: put the route parameter back in CreateCreditNote. Rebuilt (never --no-build; WebApi.dll mtime 1785805477 -> 1785805531).
RED 1/6: Expected KREDITNOTA-990502.pdf, Actual KREDITNOTA-990501.pdf. Restored by editor write, rebuilt (mtime 1785805571), GREEN 6/6.
Host log on the green run: 'RAPPORT-990501.pdf' and 'KREDITNOTA-990502.pdf' - the two documents no longer share a number.
Container-free tier only, no container started or touched: dotnet test --filter "Database!=SqlServer".
4597/0/12 at 26599c6e + change; 4629/0/12 at 569887a5 + 24c95aa9. Nothing flaked, no failure failed to reproduce.
The wire tier dirtied artifacts/journeys/ev-dietary/run-sheet.{json,md} on every run; restored each time, never committed. Commit by pathspec, final git status empty.
The Azure Functions host key in Services/OkamFunctionsDocumentRenderer.cs was not read into, printed by, or carried out of this change.
END RETURN
```

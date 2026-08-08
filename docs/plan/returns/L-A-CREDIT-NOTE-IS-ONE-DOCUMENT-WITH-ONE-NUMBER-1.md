RETURN: L-A-CREDIT-NOTE-IS-ONE-DOCUMENT-WITH-ONE-NUMBER
brief: 2d6662a1
verdict: built
evidence: docs/plan/returns/L-A-CREDIT-NOTE-IS-ONE-DOCUMENT-WITH-ONE-NUMBER-1.md
log:
feature/restaurant-modules 976489141 -> c4326402c, a --no-ff merge of 24c95aa94 and nothing else. Not pushed. Worktree api-creditnote stayed DETACHED throughout.
DEFECT REPRODUCED AT THE TRUNK FIRST, and it was live: the trunk's OWN PdfDownloadWireTests pins the wrong name — KREDITNOTA-990501.pdf on a document its comment says is numbered 990502.
It asserts NotEqual(InvoiceId, creditNoteId), so the trunk proved the numbers differ before I touched it. Not fail-spec: 24c95aa94 was absent and its merge-base was an ancestor.
WHERE THE NUMBER COMES FROM: model.Invoice.Number, which GetInvoiceModel sets as entity.InvoiceId.ToString() — the exact property the renderer prints. Not the route parameter, not a re-lookup.
CreateCreditNote INSERTS a new Invoice row and serves it, so the route parameter is the credited invoice while the model is the note. Both downloads now go through DownloadNameOf(model).
SECOND CONSUMERS CHECKED. GetPdf used the identical expression, correct only because GetPdfModel looks up that same id. The branch fixes it too, so it is right by derivation now.
EmailService.cs:43 already derived from pdf.Invoice.Number, so I matched the estate's existing correct pattern. It does prefix credit notes "rapport-" — a lesser mismatch, unfixed and reported.
FOUND IN THE FRONTEND: settlements.vue:420 discards the server's Content-Disposition and rebuilds the name from the same route parameter. Right number today, wrong prefix, same shape.
MUTATION PASS re-measured at the new base: 3 mutations, 3 RED, baseline 6 tests, 0 failed. Restoring the route parameter reds it. Restore in a finally AND an atexit hook, read back, git-verified.
TIER MEASURED AT THE NEW BASE, not carried over: 4992 passed / 0 failed / 11 skipped / 5003 total, exit 0, no abort line, WebApi.dll mtime moved so it is not a stale build.
Accounting: trunk 1c71ae951 was 4980/0/11; 976489141 is 4992/0/11, the +12 being the Vipps fix. My merge adds no test — it renames and rewrites one — so the composed count is unchanged at 4992.
I HIT THE CLOBBER MYSELF AND CAUGHT IT: my first branch -f read 976489141 where I expected 1c71ae951, so I moved it straight back and recomposed. Nothing lost, nothing pushed.
The fix that made the second move safe: re-read the trunk at the instant of the move and refuse unless it still equals my merge base. Reading it at lane start is what fails.
CANONICAL RUNNER GAP: mutate.js anchors by walking up to a package.json and THROWS without one, so the dotnet dialect I added to it cannot run in the repo where .NET suites live.
Decision check made: this lane's block carries no needs: gate; the open item is the flag it clears. 9e3a607bb, 1c71ae951 and 24c95aa94 are all verified present on the landed trunk.
END RETURN

# L-CREDIT-NOTE-NUMBER - lane receipt

## Base and tip

- Worktree: `/Users/svendaneel/okam/OkamAPI-cnnum` (own worktree; `OkamAPI-modules` left untouched,
  `feature/restaurant-modules` never moved).
- Measured first at integration tip `26599c6e` (the value the brief named). The tip moved to `569887a5`
  mid-lane; neither `Controllers/InvoicesController.cs` nor `WebApi.Tests/Wire/PdfDownloadWireTests.cs` is
  touched by `26599c6e..569887a5`, so the lane rebased cleanly and was re-verified at the newer tip.
- Lane branch `lane/credit-note-number`, one commit `24c95aa9` on top of `569887a5`. Nothing pushed.

## The defect, as it stood

`InvoicesController.CreateCreditNote` composed the download name from its own route parameter:

    return File(bytes, "application/pdf", model.Invoice.Heading + "-" + invoiceId + ".pdf");

`InvoiceService.CreateCreditNote` inserts a NEW `Invoice` row and returns the model for THAT row, whose
`Invoice.Number` is `entity.InvoiceId.ToString()`. So the served bytes carried number 990502 while the
`Content-Disposition` said 990501 - the number of the invoice being credited, and the same number the
plain invoice download already uses for `RAPPORT-990501.pdf`.

`GetPdf` has the same expression, but there the route parameter and the document's own number are the
same row, so the defect is invisible at the call site. That is why a source census could not see it.

## The change

`Controllers/InvoicesController.cs`: both invoice downloads now name the file through one private helper
that reads the DOCUMENT's own number.

    private static string DownloadNameOf(InvoiceModel model)
        => model.Invoice.Heading + "-" + model.Invoice.Number + ".pdf";

No write was touched: `CreateCreditNote`'s insert, its actor path and every field on the new row are
unchanged. C4 does not come into play - this lane changed a filename, not a money-path write. No statutory
name, forskrift or section reference was added or widened (C6). No migration (C2), no append-only table
(C1). No log or telemetry call added (C7); the Azure Functions host key in
`Services/OkamFunctionsDocumentRenderer.cs` was not read into, printed by, or copied out of this change.

## The pin

`WebApi.Tests/Wire/PdfDownloadWireTests.A_credit_note_downloads_under_its_own_number_not_the_one_it_credits`
(renamed from `..._under_the_number_of_the_invoice_it_credits`, which pinned the defect and was satisfied
by it).

It drives `POST /invoices/creditnote/990501` over the real ASP.NET Core pipeline in the wire host and
reads the name off `response.Content.Headers.ContentDisposition` - the wire, not a controller variable.

Discrimination. The credited invoice is seeded with an explicit `InvoiceId` of 990501; the credit note's
number is assigned by the database when the service inserts the new row, and comes out 990502. The two are
therefore genuinely different values, and the test asserts that before it asserts the name, with a message
saying why an equal pair would make the filename assertion meaningless. It then asserts the served name
equals `KREDITNOTA-<credit note's own number>.pdf` BY VALUE and, separately, that it is not
`KREDITNOTA-<credited number>.pdf`.

## Red/green mutation

Mutation applied: the `DownloadNameOf(model)` argument in `CreateCreditNote` replaced by the original
`model.Invoice.Heading + "-" + invoiceId + ".pdf"` - i.e. the filename taken from the route parameter again.

- Rebuilt (never `--no-build`); `WebApi.dll` mtime moved 1785805477 -> 1785805531, so the assembly really
  recompiled.
- RED: `Failed: 1, Passed: 5, Total: 6`.
  `A_credit_note_downloads_under_its_own_number_not_the_one_it_credits`
  `Assert.Equal() Failure  Expected: KREDITNOTA-990502.pdf  Actual: KREDITNOTA-990501.pdf`
- Restored via an editor write (mtime forward), rebuilt (`WebApi.dll` mtime 1785805571).
- GREEN: `Failed: 0, Passed: 6, Total: 6`. Host log for the run:
  `sending file with download name 'RAPPORT-990501.pdf'` and
  `sending file with download name 'KREDITNOTA-990502.pdf'`.

## Suite

Container-free tier only, no container started, none touched.

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"

- At `26599c6e` + change: `Failed: 0, Passed: 4597, Skipped: 12, Total: 4609` (5 m 09 s).
- At `569887a5` + `24c95aa9` (rebased): `Failed: 0, Passed: 4629, Skipped: 12, Total: 4641` (5 m 29 s).

No failure failed to reproduce; nothing flaked in either run.

## Working tree

The wire tier dirties `artifacts/journeys/ev-dietary/run-sheet.json` and `run-sheet.md` on every run. Both
restored after each run, not committed. Final `git status --porcelain` in the worktree: empty. Commit made
by pathspec (`git add <two paths>`), never `git add -A`.

## Not done, deliberately

- Not pushed; `feature/restaurant-modules` not moved.
- The route parameter still names the invoice to credit, which is correct - only the FILENAME stopped
  reading it.
- `PdfRendererOutageWireTests` also POSTs `creditnote/990611` and now serves `KREDITNOTA-990614.pdf`; that
  suite asserts status and media type only, so it neither needed nor received a change.

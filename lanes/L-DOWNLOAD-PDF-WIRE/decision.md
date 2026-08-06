# L-DOWNLOAD-PDF-WIRE — the seam, argued

## The question the brief asked

Either the four external-render downloads reach a real 200 with a readable filename, or the seam that
prevents it is replaced by one that can — and if a seam is built, it must be shown that it cannot silently
become the *production* path, because a fake renderer reachable in production is worse than an unproven
filename.

## What was actually true (verified, not assumed)

**There were three, not four.** The brief and `L-DOWNLOAD-HEADERS-1` both state that all four render through an
external function call the wire host severs. The Wolt Drive statistics PDF does not.
`StatisticsService.GetWoltDriveInvoiceReportPdf` calls `GenerateWoltDriveInvoicePdf`, which builds the bytes
in process out of a `StringBuilder` (`Services/StatisticsService.cs:792`). `GetWoltDriveInvoiceReport` reads
only `ApplicationDbContext` — it touches neither `_dinteroService` (quarantined) nor `_redisService` nor any
`HttpClient`. It was drivable at the sibling's own HEAD, and the first run of this lane's pins proved it:
three failed, that one passed, with no production change of any kind.

The remaining three are real: `ReceiptService.GeneratePdf` and `InvoiceService.GeneratePdf` each posted to
`https://okamnodefunctions.azurewebsites.net/api/Get{Receipt,Invoice}` on the **default**
`IHttpClientFactory` client, which `WireHost.DenyOutboundHttp` replaces the primary handler of. The failure
was a 500 — `WireEgressBlockedException` is not `AppException`, so it escapes the controller's catch.

## Why a seam, and why this one

The wire host already draws the line this decision needs, in its own words: a payment rail gets
`BlockedEgressProxy` because "there is no correct fake for a money movement"; mail, SMS and the cache get
**recording doubles** because "a route may legitimately touch them and a suite should be able to assert *and
nothing was sent*". A document renderer is on the recording side of that line and not near the other one:
every amount, VAT line, payer label and period is computed by `ReceiptService` / `InvoiceService` and is
already fixed in the model before the port is crossed. The renderer lays out a decision; it does not make one.
There is nothing for a substitute to get wrong.

So `IDocumentRenderer` is a real production port with one real production implementation
(`OkamFunctionsDocumentRenderer`), and the wire host substitutes a **recording** double that keeps the model.

That buys a fact a census cannot give, which is the substantive reason to prefer this over a ruling:

* `InvoicesController` names its download `model.Invoice.Heading + "-" + invoiceId + ".pdf"`, and `Heading` is
  `IsCreditNote ? "KREDITNOTA" : "RAPPORT"` decided inside `InvoiceService`. A source scan can see that
  `File(...)` was passed a third argument. It cannot see what that argument evaluates to.
* Driving the credit-note branch found a real discrepancy (below) that no census could have found.

## Why this is not a hole in the outbound-denial control

The control is *no wire test reaches a real external service*. Three independent facts say the substitution
does not weaken it, and `WireContainmentTests.The_substituted_pdf_renderer_cannot_become_the_production_path`
asserts all three against the live host:

1. **The application still registers the real renderer.** `WireHost.ApplicationDocumentRendererType` is read
   off the live service collection the instant before the replacement, which is the only place that fact
   survives. Registering anything else in `Program` fails this.
2. **The double is in an assembly the application does not reference.** Asserted in both directions —
   `WebApi.Tests` references `WebApi`, `WebApi` does not reference `WebApi.Tests` — so it cannot pass by
   reading an empty list. A type in an unloaded assembly cannot be resolved by production whatever anyone
   later writes.
3. **The real renderer, driven inside this very host, is still severed.** It reaches the functions app through
   `IHttpClientFactory` like everything else, so `DenyOutboundHttpFilter` still covers it. Deleting the
   substitution restores a *refusal*, never a real call: the seam fails closed.

Nothing was removed from `QuarantinedSeams`, no configuration key was un-blanked, and no client was exempted
from the deny filter.

**The rejected alternative** was to name a dedicated `HttpClient` and exempt it inside
`DenyOutboundHttpFilter`. That *would* be a hole: the exemption would live inside the control itself, and a
mistyped or reused client name would let a real request out. A substitution at the port leaves the transport
block whole.

## Vacuity audit of each new assertion

| pin | shown able to fail by |
| --- | --- |
| the three renderer endpoints reach 200 with the right name | the RED run: 500, `WireEgressBlockedException` from the real address |
| the Wolt PDF's name | mutation — `wolt-drive-invoice-` → `wolt-drive-report-` in `StatisticsService` |
| all four exposures | mutation — `WithExposedHeaders(BrowserReadableHeaders.All)` → `("ETag")` |
| the credit-note name | it was written expecting the credit note's own id and failed; corrected to what the server does |
| the rendered model is the real one | mutation — `Description = x.Name` → `"vare"` in `ReceiptService` |
| the substitution is what makes the three pass | mutation — commenting out `SubstituteDocumentRenderer(services)` turned all five red *and* turned the containment pin red |
| the assembly-direction check reads a real graph | mutation — swapping the two assemblies; `Assert.Contains` failed against a 5+ entry list |

**The one refusal assertion, deliberately not mutated.** `AssertBlockedEgress` on the real renderer is the
shape the brief warns about, so it is worth being explicit. It is not vacuous by construction —
`AssertBlockedEgress` *fails* on any exception that is not a `WireEgressBlockedException`, so "it threw
something" does not satisfy it, and the only thrower is `DenyOutboundHttpHandler.SendAsync`, reached only by a
real send. Its positive control is the RED run above: that exact exception, from that exact address, through
the real production code path. The mutation that would prove it directly is deleting `DenyOutboundHttp`, whose
success condition is a live HTTP request to Azure from a test. That was not run.

## Findings for their owners (not changed here)

1. **The credit-note download is named after the invoice it credits, not after itself.**
   `InvoicesController.CreateCreditNote` composes the filename from its own route parameter while the document
   it serves carries the new row's number: `KREDITNOTA-990501.pdf` opens on a credit note numbered 990502, and
   a second credit note against the same invoice downloads under the same name. Pinned as-is by
   `A_credit_note_downloads_under_the_number_of_the_invoice_it_credits`, because the filename is what an
   operator files and changing it silently is a product decision.

2. **A live Azure Functions host key is committed in source**, shared by both document endpoints. It was at
   `ReceiptService.cs:144` and `InvoiceService.cs:1249`; it now lives in exactly one place,
   `OkamFunctionsDocumentRenderer.FunctionKey`, so rotating it is a one-line change. It also reaches test
   output: `DenyOutboundHttpHandler` echoes the whole request URI, so any wire run that hits a document
   endpoint red prints the key. **Deliberately not redacted here** — the estate has already paid for the lesson
   that redacting a message without rotating the credential fixes nothing (Wolt, 2026-07-30). The key is in the
   source and in git history; the owner action is rotation.

3. **`GeneratePdf` returns `null` when the renderer answers non-2xx, and all six call sites dereference it.**
   `result.Content` on a null gives a `NullReferenceException`, which is not `AppException`, so it escapes the
   controller's catch and becomes a 500 rather than a handled error. Pre-existing on every one of these
   endpoints; not touched, because it is a behaviour change on six live routes and a different lane's call.

## Constraints

C1 no append-only mutation, no UPDATE/DELETE against a guarded table. C2 no migration, no `OnModelCreating`
change. C3 satisfied by construction — the new service ships with its DI registration in the same diff and its
only callers are two services already reachable from live routes. C4 the one money-path write this suite
drives (`POST /invoices/creditnote/{id}`) goes over HTTP as the fixture's genuine `PowerUser` principal, not a
constructed or ambient actor. C5 not acceptance — no capability is claimed finished on a suite count. C6 no
statutory claim added. C7 no log or telemetry call added; see finding 2 for the pre-existing one, and note
that after this change the wire tier no longer reaches the transport for these routes at all.

Docker is down estate-wide; no SQL tier was attempted and no container was started or touched.

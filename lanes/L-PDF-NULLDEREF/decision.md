# L-PDF-NULLDEREF — what was decided, and what was rejected

## The finding, verified rather than inherited

The brief said six call sites dereference the renderer's null. **The six are exactly right**, and each
was driven to a real 500 with the `NullReferenceException` and its file:line captured (`red.txt`) —
not read off the source.

`GeneratePdf` has **twelve** call sites, and the six the brief names are the six that dereference
*directly*. The other six split three ways:

| call site | before |
| --- | --- |
| `ReceiptService.SendReceipt` | already checked `== null`, answered `false` |
| `InvoiceService` lines 249 / 479 / 558 | already checked, notified Discord and skipped the store |
| `InvoiceService` line 93 (`RetrySendingExistingInvoices`) | **unchecked** — carried the null into `EmailService.BuildInvoiceMessage`, which reads `PdfResponse.Content` |
| `OkamPayoutService` line 237 (`SendPayoutInvoice`) | **unchecked**, same one-hop dereference |

So the count of **live routes that answered a 500 with an NRE on a renderer outage is eight, not six** —
the two extra are `POST /invoices/RetrySendingExistingInvoices` (which is also **anonymous**, a separate
finding) and `POST /payouts/send-mail/{id}`. The brief is not contradicted; it undercounts. Both are
fixed and both are pinned.

## The fix: the port stops returning null

`OkamFunctionsDocumentRenderer.Post` raises `DocumentRenderException` on a non-2xx instead of answering
`null`, and a middleware maps it to **502**.

Chosen because a null return has to be remembered at twelve call sites and was forgotten at six. An
exception cannot be silently dereferenced. The shape copies the one this repository already uses:
`OperatorSessionException` + `OperatorSessionExceptionMiddleware` → 401.

**Why 502 and not 400.** Deriving from `AppException` would have been a one-word change and every
controller's existing `catch (AppException)` would have answered 400 with no new code at all. Rejected:
the request was well formed. A client told "bad request" has no reason to retry, and an alert on 4xx
will not fire for an outage that is entirely ours.

**Why the bulk runs still catch.** The three invoice loops that already notified-and-skipped keep doing
exactly that, through one `TryAttachPdf` helper. Letting the exception out of a bulk run would abort
every remaining store for a period whose invoice rows are already committed — a worse failure than the
one being fixed. `OkamPayoutService.SendPayoutInvoice` deliberately does **not** catch: it sends one
payout, and continuing would mail an empty report and then set `InvoiceSent`, the flag that stops it
ever being retried.

## How the outage is made real, and what was NOT weakened

`RecordingDocumentRenderer.RendererAnswering(status)` puts the **production**
`OkamFunctionsDocumentRenderer` into the host's path over a transport that hands it a genuine non-2xx
`HttpResponseMessage`. The rule under test is therefore the shipping one; the double contributes only
the transport. A double that simply threw would have made every "the route handled it" assertion a
statement about the test host.

Nothing about the sibling lane's containment is relaxed:

- nothing removed from `QuarantinedSeams`, no key un-blanked, **no client exempted inside
  `DenyOutboundHttpFilter`** — the rejected alternative that puts the exemption inside the control;
- the stub factory is a test object the application never sees and its handler opens no socket;
- `WireContainmentTests` still passes unchanged, including the assertion that the real renderer
  constructed inside the host is still severed by the outbound block.

`IOkamPayoutService` **is** quarantined in the wire host, so route 8 could not be driven there. It is
pinned at the service tier instead. Taking it out of `QuarantinedSeams` for a test's convenience was
considered and rejected — that is a hole in the containment, bought with a pin.

## C7 — the error path is exactly where a key leaks

The renderer posts to `.../api/GetReceipt?code=<live Azure Functions host key>`. An exception message is
the one string that reaches every sink, so `DocumentRenderException` carries the **status and the
function name only**, and the middleware's log template carries the same two values and nothing else.

Two pins, both mutation-proved: the exception's `Message` + `ToString()` contain neither the host nor
the key, and no log line recorded by the live host during an outage does either. The key is read off
the production type by reflection — **this lane does not commit it a second time**, and the key
assertion was still proved live (see mutation 3b in `red.txt`).

The key itself is untouched. **Rotation remains the owner's**, exactly as the sibling lane left it.

## Recorded, not changed

- **A credit note row is written and committed before the document renders**, so an outage leaves a real
  credit note in the ledger behind a 502 the operator reads as a failure. Equally true of the 500 this
  replaces. Pinned as it behaves; correcting it is its owner's call.
- **`POST /invoices/RetrySendingExistingInvoices` carries no `[Authorize]`** and iterates every unsent
  invoice in the database, mutating `StoreSendInvoiceToEmails` on each. Found while reading for this
  lane; out of scope here.
- The credit-note filename defect and the committed host key are the sibling lane's findings and were
  not touched.

## Base

`4373 passed / 0 failed / 12 skipped of 4385` — measured on this lane's own worktree at `a7b90cbd`
before any edit, not inherited.

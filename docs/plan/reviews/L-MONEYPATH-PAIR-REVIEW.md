# Fable review — export-duplicate x renderer-outage, read as a pair (2026-08-02)

Lane one `lane/wf-export-duplicate` @ `3a4442a7`: SOUND.
Lane two `lane/pdf-nullderef` @ `2497ce9d` + `17198f14`: SOUND-WITH-CONDITIONS.

## MIG-25 parentage, measured
Parent `3a4442a7^` = `9e82b286` = tip of `lane/wf-w5-timesheet` carrying MIG-24. Designer files
diffed with class name and timestamp normalized: the ONLY difference is the five index lines.
`feature/restaurant-modules` ends at `20260731220005_Workforce_IdentityCodeRegisterIssues`; the
chain carries exactly FIVE migrations beyond it before MIG-24. Merge-base `968fd273`, not the
feature tip. THROW ceiling in the chain is 50073; a unique index refuses with 2601, no collision.
`Down()` proven by a round-trip test present in the committed SQL trx (136/136).

Landing requires: the three-link stack lands in order (margin-waste -> wf-w5-timesheet ->
wf-export-duplicate); MIG-24 and MIG-25 share a deploy epoch; the SQL tier RE-RUNS at any squash
point (filtered indexes are what a squash regenerates badly, and the `sys.indexes` guard is
SQL-traited so it guards nothing on a run where that tier does not execute); and the
adjustment-ordinal lane claims MIG-26 in the ledger BEFORE authoring.

## D1 CONFIRMED and UNDERSTATED: four anonymous money routes, not one
`InvoicesController` carries no authorize attribute at class or action level; no fallback policy
and no global authorize filter anywhere in the composition root. The known route is the bulk
retry at `:117`. The three added: `:34`, `:51`, `:68` — GET routes that CREATE invoices before
sending them. Pre-existing; the lane changed CONSEQUENCE not reachability. At base an anonymous
call during a renderer outage answered 500 with nothing persisted; after the fix the run
completes, mails what it can, and persists.

## D2 NEW, introduced by lane two
`InvoiceService.cs:76` selects unsent by empty send-address; `:91` stamps the entity with the
store address BEFORE the render; `:93` skips on `DocumentRenderException`; `:104` saves anyway.
The skipped invoice leaves the filter forever. The lane's own commit message states the principle
it violated, about `SendPayoutInvoice`. Named change: restore the send-address in the
attach-failed branch, or stamp only after a successful attach; extend the outage test to run the
retry a SECOND time and assert the invoice is still selected.

## Claims the artifacts do not support
- "Each of the eight is captured with its NRE frame in the lane's red record" — there is NO red
  record in either commit. The eight-routes claim itself verified independently (twelve call
  sites, six direct + two one-hop + three notify-and-skip + one null-checked); the arithmetic is
  exact, the claimed frame-by-frame evidence does not exist.
- "Restore the null return and every case below fails with 500" — no committed red run.
- Lane one's injection probe and mutations M1/M2 are narrative transcripts, not red trx.
  Materially compensated: the drop-the-index control is a PERMANENT in-suite re-proof and it
  passed in the committed SQL trx.

## Assertions that could pass against broken code
`A_bulk_invoice_run_leaves_out_the_store_it_could_not_render` passes today WHILE D2 happens — it
asserts the mail was skipped and never re-queries the row. That narrow assertion set is what let
D2 through. Also: the filtered-index catalog test passes in isolation with the catch mapping
deleted; the PayloadSha256 distinct-count passes with null hashes.

Standing: the Functions host key at `OkamFunctionsDocumentRenderer.cs:28` is a live committed
credential, pre-existing, rotation owed to the owner.

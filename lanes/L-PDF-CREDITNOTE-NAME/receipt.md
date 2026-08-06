# L-PDF-CREDITNOTE-NAME — receipt

## Baseline, named

Backend `feature/restaurant-modules` at **`8e2b57de`** ("L-VIOLATION-EXACT-LAND: merge receipt…"),
measured myself. The plan hub (`Web-modules`) was at `e34977ac` as the brief said, but the code this
lane changes lives in `OkamAPI`, not in `Web-modules` — the brief's repo line names the plan repo.

Worktree `/Users/svendaneel/okam/OkamAPI-cnname`, branch `lane/pdf-creditnote-name`.
Two commits, both reachable from that branch ref (`git branch --contains` confirms):

| commit | author | what |
| --- | --- | --- |
| `6b043348` | `agent:L-CREDIT-NOTE-NUMBER` | cherry-pick of `24c95aa9` — the filename fix |
| `015c07ca` | `agent:L-PDF-CREDITNOTE-NAME` | this lane's delta — the two-credit-note pin |

Nothing pushed. `feature/restaurant-modules` never moved.

## The overlap, stated plainly

**A sibling lane already fixed the single-download half and already inverted the pin.**
`L-CREDIT-NOTE-NUMBER` (state `built-unverified`, unmerged, branch `lane/credit-note-number` at
`24c95aa9`) renamed `A_credit_note_downloads_under_the_number_of_the_invoice_it_credits` →
`A_credit_note_downloads_under_its_own_number_not_the_one_it_credits` and changed both invoice
downloads to name the file from `model.Invoice.Number` via one `DownloadNameOf(model)` helper.

The defect was still **live at the tip I measured** (`CreateCreditNote` composed the name from its
route parameter, and the pin at tip still asserted that), so the orchestrator's note was accurate for
the tip — it was simply unaware the sibling had already landed the inversion on its own branch.

I did **not** re-author that fix. I cherry-picked it, so authorship stays with the lane that did it
and **one branch supersedes both**: `24c95aa9`'s content is contained in mine, so merging
`lane/pdf-creditnote-name` also lands `lane/credit-note-number`'s change. Merging both is unnecessary
and is the duplicate-claim hazard this estate has already paid for.

Base safety: `569887a5` (the sibling's base) **is** an ancestor of `8e2b57de`, and
`git diff 569887a5 8e2b57de -- Controllers/InvoicesController.cs WebApi.Tests/Wire/PdfDownloadWireTests.cs`
is **empty** — zero drift in either file across those 5 commits, so the cherry-pick is content-identical
to the sibling's own tree.

## What my delta adds, and why it is not covered by the pin beside it

The inverted pin drives **one** credit note. The exit asks for **two**, and that is where the defect
stopped being a misreading and became a lost record: while the name came from the route parameter,
*every* credit note against one invoice arrived as `KREDITNOTA-<credited number>.pdf`, so saving the
second over the first left an operator's folder holding **one document where two were issued**, with
nothing on screen to say so.

`Two_credit_notes_against_one_invoice_download_under_distinct_names` asserts, over the wire host:

1. Two credit notes are really issued against one invoice — **two rows, two distinct ids, neither
   equal to the credited invoice**. Without this the filename assertions would be satisfied by a build
   that *refused* the second credit note, which is a different product decision.
2. The two served `Content-Disposition` names **differ from each other**.
3. The two names, as a **set**, equal the two credit notes' own numbers.
4. Neither is `KREDITNOTA-<credited invoice>.pdf`.
5. **Re-download**: `GET /invoices/pdf/{creditNoteId}`, driven as the venue admin who would actually go
   looking for it, serves each credit note under the name already on disk — plus the exposure header.

Point 5 is the reprint half the brief asked about. `GetPdf` reached the right name all along, because
*there* the route parameter and the document's own number are the same row — so under the old
behaviour **one credit note downloaded under two different names depending on which endpoint produced
it**, and the copy an operator re-filed would not match the copy already saved.

**Nothing stops a second credit note being issued.** `InvoiceService.CreateCreditNote` inserts
unconditionally — no already-credited check anywhere on the path — so a partially credited settlement,
a corrected credit note, or a double click all reach this. Recorded, not changed: whether a second
credit note *should* be refusable is a product ruling, not a filename fix.

**Test isolation:** the two credit notes are issued against their **own** seeded invoice `990601`, not
against `990501`, so the neighbouring pin's `.Single()` over credit notes hanging off `990501` keeps
holding however xUnit orders the two facts. Seeding a second invoice was the cheaper choice than
weakening that pin's cardinality assertion.

## Evidence

Container-free tier only. **No container started, none touched** — two foreign SQL containers
(`okam-lvsp-sql`, `okam-lwr-sql`) were up throughout and were left alone. No SQL tier attempted.

| fact | value |
| --- | --- |
| class green | `PdfDownloadWireTests` 7 passed / 0 failed |
| whole container-free tier | **4639 passed / 0 failed / 12 skipped** of 4651, 5m50s (`tier-containerfree.summary.txt`) |
| served names, from the host's own log | `green-names.txt` |

The host log is the load-bearing part — it is the server naming the file, not a test variable:

```
sending file with download name 'KREDITNOTA-990602.pdf'   <- first credit note, POST
sending file with download name 'KREDITNOTA-990603.pdf'   <- second credit note, POST
sending file with download name 'KREDITNOTA-990602.pdf'   <- re-download, GET /invoices/pdf/990602
sending file with download name 'KREDITNOTA-990603.pdf'   <- re-download, GET /invoices/pdf/990603
sending file with download name 'KREDITNOTA-990604.pdf'   <- the neighbouring pin's own credit note
```

Two credit notes against invoice `990601`, two distinct names, each naming the credit note and not the
invoice, and each stable across a reprint. That is the exit, observed rather than asserted.

## Mutations — two, both rebuilt, never `--no-build` over a restored file

**M1 — restore the defect.** Put `invoiceId` back in `CreateCreditNote`.
→ 2 failed / 5 passed. Mine failed with its own message:
`both credit notes downloaded as KREDITNOTA-990601.pdf, so filing the second one overwrites the first
and the operator keeps one document where two were issued`. The neighbouring pin failed too.
(`red-mutation.summary.txt`)

**M2 — break only the reprint.** Name `GetPdf`'s download from `CreditInvoice` for a credit note.
→ **1 failed / 6 passed**: only mine, and only on the re-download half —
`Expected: KREDITNOTA-990602.pdf / Actual: KREDITNOTA-990601.pdf`. The POST-only pin stayed **green**,
which is the point: the reprint assertions are not carried by their neighbour.
(`red-mutation-2.summary.txt`)

Restores were editor writes (mtime forward), each followed by a real rebuild. Verified against the
`--no-build` trap rather than assumed: after the final restore, `WebApi.dll` at `16:44:53` is **newer**
than `Controllers/InvoicesController.cs` at `16:44:29`, and the re-run served `990602`/`990603` again
rather than the mutant's `990601`.

## Constraints

- **C1** no `UPDATE`/`DELETE` against any append-only table; no append-only entity mutated. Seed adds
  rows to the wire host's own database only.
- **C2** no migration, no `OnModelCreating` index/constraint. Nothing near the chain.
- **C3** no new service, handler, page or flag — this changes one expression on two routes that were
  already wired, registered and reachable.
- **C4** no money-path write added or re-routed. `CreateCreditNote`'s insert and its actor path are
  untouched; the two credit notes this test issues go over HTTP as the fixture's **genuine PowerUser**,
  and the re-download as a genuine store admin. No null, ambient or hard-coded system actor.
- **C5** **not acceptance.** A green suite is evidence the code behaves; it is not evidence anyone has
  completed the journey. Sven opening an invoice, crediting it twice and seeing two files in a folder
  is the gate, and that has not happened.
- **C6** **no statutory naming added or widened.** No statute, forskrift or `§` reference appears
  anywhere in this diff. The filename is `KREDITNOTA-<number>.pdf`, unchanged in shape — only the
  number it carries is now the document's own. Nothing in this change claims a provision.
- **C7** no log or telemetry call added. The committed Azure Functions host key flagged by
  `L-DOWNLOAD-PDF-WIRE` was not read into, printed by, or carried out of this change; its rotation
  stays the owner's and is untouched here.

## Housekeeping

- Committed **by pathspec** (`git add WebApi.Tests/Wire/PdfDownloadWireTests.cs`), never `git add -A`.
- The wire tier regenerated another lane's `artifacts/journeys/ev-dietary/run-sheet.{json,md}` on every
  run — the only files I dirtied that were not mine. Restored with `git checkout --` on exactly those
  two paths; final `git status` empty. Nothing else reverted, stashed or cleaned.
- Ordinary `git commit`, so the refs moved normally — no `commit-tree`, no dangling commit. Both
  commits confirmed reachable from `lane/pdf-creditnote-name`.
- **Committed:** the two commits above (test file + carried fix). **Not committed:** everything in this
  lane directory — `Web-modules/lanes/L-PDF-CREDITNOTE-NAME/` is untracked, so this receipt and the
  four log extracts live outside any commit until the orchestrator takes them.

# L-MRG-EHF-SPIKE, second pass — what the ruling changed, and what it did not

Brief `408ffb79`. Backend read at `8e2b57de` (`git show 8e2b57de:<path>`, never the working directory —
the checkout sits on `lane/meals-grace-pins`, four commits past that ref). Companion to `DETAIL.md`,
which is the 2026-08-03 pass and is still accurate; this file records only what is new.

**Verdict: `fail-spec`.** Not "blocked again". The brief's exit criterion presupposes two things that do
not exist, and the decision that was supposed to make one of them exist has been ruled without moving it.
Re-raising `D-EHF-INVOICE-ACCESS` would send the next agent at the same wall.

---

## 1. What changed between the two passes: the ruling landed, the files did not

`D-EHF-INVOICE-ACCESS` was ruled `forward-the-files` at 2026-08-05T08:24Z (`docs/plan/log.md:1737`).
The brief was regenerated one minute later, at 08:25Z. **Nothing in that minute moved an invoice.**

Measured, not assumed:

- `lanes/L-MRG-EHF-SPIKE/` holds exactly four files — `DETAIL.md`, `classify-invoices.py`,
  `instrument-selftest.txt`, `.gitignore` — all unmodified since **2026-08-03 11:09**. The
  `invoices/` directory the `.gitignore` was written to receive **does not exist**.
- Re-swept, wider than the drop path, because a hand-off can land anywhere: every file created under
  `~/Downloads`, `~/Desktop`, `~/Documents` since 2026-08-03 (1,258 of them) — no supplier invoice.
  The only new PDF plausibly related is `~/Downloads/Restaurant-Costing-and-Financial-Control-System.pdf`,
  which is the costing research report, not an invoice.
- Spotlight full-text (which reads inside PDFs) for `Fakturanr*`, `Leveringsadresse`, `Nortura`, `Asko`,
  and separately for the UBL invoice namespace and `cbc:InvoiceTypeCode`: **zero** real invoices. Every
  XML hit is one of the four synthetic fixtures, replicated across worktrees.
- Filename sweep for `*ehf*` / `*peppol*` outside `~/okam`: four hits, all coincidental substrings inside
  `node_modules` and a GPU cache.

So the handling rule the review adopted — untracked, gitignored, excluded from knowledge/RAG builds,
deleted once classified — is correct and is **not yet load-bearing**, because there is nothing to handle.

---

## 2. The four fixtures are still the only EHF documents, and they are self-declared synthetic

At `8e2b57de`, `docs/api/fixtures/margin/ehf/` contains four XML documents plus `manifest.json`.
Each XML carries a `SYNTHETIC` header; every copy in every worktree is byte-identical (single md5 per
file, checked tip vs `wt-escposladder`), so they are **clones of one hand-written set, not per-venue
captures**. `manifest.json` says it in its own words:

> *"They were hand-written against the PEPPOL BIS Billing 3.0 / EHF 3.0 (UBL 2.1) specification, NOT
> anonymised from production traffic. No real supplier invoice has been classified yet… A green run of
> these goldens is evidence that MarginEhfInvoiceParser reads the SPECIFICATION correctly. It is not
> evidence about production."*

### 2.1 What the fixtures CAN answer

These claims stand on the fixtures alone and would survive a real-invoice pass unchanged:

1. **The parser reads the specification.** All four parse; the wholesaler fixture yields 4 lines with
   `KGM`/`LTR`/`H87` unit codes, the `CreditNote-2` syntax's `CreditedQuantity` is handled, sub-øre
   `BT-146` prices yield `null` rather than an invented rounding, and an unreadable line is an error
   carrying **no** amounts rather than a zero. (`instrument-selftest.txt`, and `MarginEhfInvoiceParserTests`.)
2. **The four amount flavours are kept apart** — `BT-106` / `BT-109` / `BT-112` / `BT-115`. Only the
   first two are a cost basis; reading `BT-112` where `BT-109` is meant overstates every ingredient cost
   by the full VAT rate. The wholesaler fixture is deliberately built so those are three different numbers.
3. **The instrument that would classify real files is written and self-tested**, refuses to start without
   credentials in the environment, prints no token and no amount, and reports suppliers by organisation
   number rather than name.
4. **The taxonomy is the vendor's, not ours** — A (`ediDocument`, machine-readable), B (`orderLines[]`,
   DETAILED only), C (`attachment`/`document`, always PDF), D (header only).

### 2.2 What the fixtures CANNOT answer — and this is the whole gate

The STOP rule in `docs/plans/TRIPLETEX-INVOICE-INGEST.md` §6 is *"if the majority are scanned PDF-only,
STOP"*. A majority is a property of a real venue's mix. **Four documents hand-written to exercise parser
edge cases have no mix.** Choosing them as evidence would be choosing the answer: they are 100% Class A
because someone wrote them that way, which is exactly the number a SHIP verdict would want and exactly
the number that means nothing.

Every one of the seven questions §7 says to demand of Casper's invoices is unanswered and unanswerable
here: EHF-borne or scanned; per-article lines or a lump `matvarer` posting; unit code present per line;
whether article numbers and EANs are **stable across consecutive invoices from the same supplier**;
net or gross line amounts; whether credit notes and noise lines (pant, frakt, fakturagebyr) appear;
and how many distinct supplier formats one venue actually sees. The last two need *several* invoices from
*one* venue — no single document, synthetic or real, can answer them.

---

## 3. One structural finding that needs no real invoice at all

Worth recording separately because it is the only part of the ship question that is already settled.

`Models/Tripletex/TripletexSupplierInvoiceModels.cs` and `ITripletexClient.FindSupplierInvoicesAsync`
exist at the tip and request `ediDocument(...)`, `attachment(...)`, `document(...)` alongside the invoice.
Per the vendor's own schema, **`OrderLine` carries `count` but no unit-code field of any kind**. So a
Class B (DETAILED) invoice gives a quantity whose unit basis cannot be established from the line — which
is the per-pack/per-unit hazard the plan's §3 unit guard exists for.

**Consequence: Class A is not merely the nicest class, it is the only one that can safely produce a price
comparison.** A venue whose invoices are mostly B is, for costing purposes, closer to C than to A. That
sharpens the STOP rule: the question is not "A+B versus C+D", it is "A versus everything else".

---

## 4. The entitlement half: still no referent, and no surface that could ask

Re-measured at `8e2b57de`, not inherited:

- `TripletexConnections.Add` appears **once** outside `WebApi.Tests/**` — the onboarding write path at
  `Services/Tripletex/TripletexConnectionService.cs:121`. No seed, no SQL script under `Scripts/`, no
  fixture names a real store. **No real venue is connected to Tripletex through Okam**, so "the stored
  integration token" in the exit criterion has no row behind it.
- `Program.cs:64` binds `Configure<TripletexSettings>`. The `TripletexSettings` section occurs **zero
  times** in `appsettings.json` and **zero times** in `appsettings.Development.json` (counted, not read —
  C7). The type's own members are `ApiBaseUrl`, `ConsumerToken`, `SessionTokenLifetimeDays`,
  `SessionTokenLifetimeSecondsJwt`, `AccountCacheHours`, `MaxRateLimitRetries`. The handshake needs a
  consumer credential **and** an employee credential, so the probe is **two short, not one**.
  Neither of the two environment variable names the live-verify tests read is set; checked by presence,
  never by value.
- **No shipped surface would answer this even with a connected venue.** `TripletexAdminController`
  exposes `stores/{id}/status`, `stores/{id}/validate` (whoAmI), reconciliation, voucher read/reverse and
  six export actions. **Nothing touches `/supplierInvoice`.** Entitlement is baked into the employee token
  at creation — there is no per-endpoint scope name — so the only observation is a 200 or a 403 against
  that path, and no route in the product makes that call. That is a C3-shaped gap and it belongs to Lane 3,
  not here.
- **No probe was run.** The session handshake is `PUT /v2/token/session/:create`, a state-creating call;
  and no credential exists to run it with regardless.

---

## 5. A STOP has a shelf life, and it is short

The Norwegian B2B e-invoicing amendments were adopted in June 2026 (Prop. 44 L (2025–2026)):
**sending** becomes mandatory **2027-01-01**; automatic **reception and processing** from 2030.

Two consequences the decision text should carry:

1. **A STOP concluded from an August-2026 mix expires on 2027-01-01.** It would be a decision taken
   against a supply of paper that is legally required to stop within five months, and it would have to
   be reopened almost immediately. A STOP here must therefore be written *dated*, never standing.
2. **The value of the classification itself is decaying.** The window in which this spike can change a
   decision closes as the mandate arrives. Combined with R2 (`docs/plan/intent.md:100` — no customer is
   signed), it is entirely possible that no venue ever runs Margin during the pre-mandate interim the
   classification measures. If the files have not arrived by roughly the end of 2026 Q4, **the right move
   is to stop chasing them**, not to keep the lane open: by then the input is structured by law and the
   question answers itself.

This is why `forward-the-files` is worth executing **now** or not at all. A late hand-off is not a
delayed answer; it is a worthless one.

---

## 6. Which way this points — plainly, for the two rulings that asked

**It is neither SHIP nor STOP. It is: stay parked, and do not take the STOP.**

- **`D-MRG-CURATION-CONTENT` (ruled `fill-the-csv`) does not reopen.** Its `reopen_when` is *"the EHF
  spike returns SHIP and a pilot venue is connected"*. **Both conjuncts fail** — this is not a SHIP, and
  §4 establishes that no venue is connected. `seed-from-invoices` is not available as an option today,
  so `fill-the-csv` with yields left blank stands unchanged and should be worked as ruled.
- **`D-EHF-UNPARK` (ruled `unpark-now`) does not reopen either.** Its `reopen_when` is *"the spike finds
  supplier invoices are not structured enough to rely on"* — the spike has **not** found that. It found
  nothing, because it was given nothing. The ruling is not wrong; it is **un-executed**. Distinguishing
  those two matters: a reopened ruling invites a re-argument that no new fact supports.
- **The parked state is holding correctly.** `MarginEhfIngestParkedLaneTests` pins that
  `MarginEhfInvoiceParser`, `FindSupplierInvoicesAsync` and `GetDocumentContentAsync` have no production
  caller, and fails if one appears. Confirmed at the tip: the parser's only non-test mention is a
  doc-comment in `MarginRecipeCostCalculator.cs:48`. So nothing has silently wired an append-only price
  timeline to an unvalidated input, which is what this gate exists to prevent.

**The one action that unblocks everything remains a file hand-off**, and it needs no token, no signed
pilot and no database: five to fifteen real supplier invoices from one Norwegian restaurant, into
`lanes/L-MRG-EHF-SPIKE/invoices/`. PDFs are a perfectly good answer — a PDF-only invoice *is* the
Class C observation, and seeing ten of twelve arrive as scans would be a legitimate, dated STOP.

---

## 7. What was not done, deliberately

- No container started; none touched.
- No migration authored; nothing committed, nothing pushed, no shared branch written.
- No probe run against Tripletex — no network call was made at all this pass.
- No credential read, printed, copied or committed. `TripletexSettings` presence was established by
  **occurrence count**; environment credentials by **set/unset**. No key name appears anywhere in this
  document in a position that could later carry a value.
- `docs/plan/**` untouched apart from this lane's RETURN. `DETAIL.md` and `L-MRG-EHF-SPIKE-1.md` were
  **not overwritten** — the first pass is cited as evidence by a ruled decision, so this pass is written
  alongside it.

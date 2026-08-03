# L-MRG-EHF-SPIKE — Lane 0, the EHF ship/no-ship spike

Verdict: **blocked**. The ship question cannot honestly be answered today, because the thing the
answer is a function of — a real venue's invoices — does not exist anywhere this lane can reach, and
neither does a stored token to probe. What this lane can do, and did, is make the remaining work
cheap and precise: the classification taxonomy is now pinned against the vendor's live specification
rather than against memory, the instrument that produces the answer is written and self-tested, and
the access needed is decomposed into two independent asks, the cheaper of which needs no token, no
signed pilot and no database.

---

## 1. The three exit criteria, answered honestly

| Exit criterion | Status |
|---|---|
| every one of the pilot venue's recent supplier invoices is classified by how its line data arrives | **Not possible.** No pilot venue's invoices exist. |
| the stored integration token's supplier-invoice entitlement is probed | **Not possible.** No stored token for any real venue is reachable. The entitlement *model* was pinned instead. |
| the ship-or-stop answer is merged from a RETURN | **Answered as: not yet decidable, and here is why that is not a stall.** See §5. |

---

## 2. Deliverable 1 — the classification. Nothing real exists to classify.

An exhaustive sweep of `~/okam`, `~/Downloads`, `~/Desktop`, `~/Documents` and `~/.claude`, by both
filename and content (including the Spotlight full-text index, which reads inside PDFs), found **zero**
real supplier invoices from any Norwegian venue.

What matched, and why each is not evidence:

- **EHF/PEPPOL UBL XML** — exactly four documents exist, all in
  `OkamAPI-modules/docs/api/fixtures/margin/ehf/`, replicated byte-identically into 189 worktrees
  (single distinct md5 per file, so they are clones, not per-venue captures). Every one carries the
  header `SYNTHETIC FIXTURE - NOT A REAL INVOICE` and states that the company names, organisation
  numbers and GTINs are invented. The fixture's own comment says it: *"Nobody has yet classified a
  real invoice from the pilot venue: that is Lane 0's job."*
- **Wholesaler PDFs** — no content match anywhere for `Nortura` or `Fakturanr`. The `faktura*.pdf`
  files in `~/Downloads` are personal Telenor broadband invoices to a residential address; the other
  `*Invoice.pdf` hits are Microsoft/Azure billing. `Faktura-900512.pdf` is a 9-byte stub.
- **Recorded Tripletex payloads** — none. Zero `.har` files; no `cassettes/` or `vcr/`; the harness
  `recordings/` directories hold exactly seven files each, all storefront/orders/POS, none accounting.
- **Price CSVs** — only the three hand-made parser goldens (`TOM-5KG,Tomat hakket 5kg,55.00,NOK,sekk`)
  and one false positive that is a Hedera blockchain address map.

So the parser's green suite means what its own doc-comment already admits: **it reads the EN16931
specification. It has never read what a Norwegian wholesaler actually sends.**

### Why there is no pilot venue's invoices to reach

`docs/plan/intent.md`, constraint R2, records Sven's 2026-07-20 ruling verbatim: *"there is no
customer yet whose evidence a serial gate could consume"*, with `reopen_when: a pilot venue signs`.
The exit criterion is written against a venue that has not signed. The plan's own text is
prospective throughout — *"a pilot venue signs"*, *"when this plan is dead, at one pilot venue"* —
and names no venue.

---

## 3. Deliverable 2 — the entitlement probe. No token; the model is pinned instead.

**Where a real token would live.** Not in configuration. `Entities/Tripletex/TripletexConnection.cs`
holds `ApiToken` per store, as a plaintext column in the application database. So probing a real
venue's entitlement requires a row in a database holding a real venue's connection.

**What is reachable from this machine, measured:**

- `~/.microsoft/usersecrets/1df35132-26a8-4882-9979-6b1151e63e2c/secrets.json` holds nine keys.
  `ConnectionStrings:WebApiDatabase` targets **localhost** only. No key mentions Tripletex.
- Local SQL Server on 1433 is **closed** — nothing is listening.
- The four running SQL containers (`okam-lws-sql`, `okam-lws-staff-sql`, `okam-lwr-sql`,
  `okam-lvsp-sql`) belong to other lanes. They were **not touched**, per the standing rule, and in any
  case hold model-built test worlds seeded from fixtures — no real venue row could be in them.
- No non-localhost SQL host is configured anywhere this lane could read.
- An **Azure CLI session is logged in** on this machine. So the production database is not
  *technically* unreachable — it is reachable to somebody authorised, after a firewall rule is added
  (itself a write). This lane did not go there, and should not have: pulling `ApiToken` out of a
  production row means an agent handling a live venue credential, which is the exact shape C7 exists
  to prevent, and the estate has already paid twice for credentials that leaked into places nobody
  could edit afterwards. **Whether any real venue is connected at all is a one-minute question for
  whoever holds prod access** — `SELECT COUNT(*) FROM TripletexConnections WHERE IsActive = 1` — and
  it should be answered before anyone plans around Ask 2 below.

**What was pinned instead — the entitlement model, verified live today, not from memory:**

- `GET https://tripletex.no/v2/supplierInvoice` → **HTTP 401** unauthenticated. Endpoint exists and is
  live.
- `GET https://tripletex.no/v2/document/{id}/content` → **HTTP 401** unauthenticated. Endpoint exists.
- The live `https://tripletex.no/v2/swagger.json` confirms `GET /supplierInvoice` takes
  `invoiceDateFrom` (required), `invoiceDateTo` (required), `supplierId`, `from`, `count`, `fields` —
  and confirms the plan's finding that **there is no `changedSince` parameter**, so polling by
  invoice-date window is the only option.
- Tripletex's own authentication documentation confirms there are **no per-endpoint OAuth scopes**.
  An employee token is minted with *entitlements* chosen at creation, and *"an employee token can not
  have an entitlement that the owner does not have."* So the honest answer to "what is the scope
  name" is: **there is no scope name.** The unit is a Tripletex *entitlement* on the employee token,
  and the only way to observe it is to call the endpoint and see 200 or 403. That is what
  `classify-invoices.py` reports on its first line.
- Re-minting is therefore a **venue action**, not a code change — the token owner edits the token in
  Tripletex, and cannot grant a right they do not themselves hold.

**No probe was run.** The Tripletex session handshake is `PUT /v2/token/session/:create`, which mints
a session object — a state-creating call, and this lane's brief forbids running a probe that writes.
Independently, no credential exists to run it with.

**There is also no read-only route in the product that would probe this.** `TripletexAdminController`
exposes `GET stores/{storeId}/status` (connection state, last verification) and
`POST stores/{storeId}/validate` (whoAmI). Neither touches `/supplierInvoice`, so **even a live
deployment with a connected venue could not answer the entitlement question through any shipped
surface.** That gap is worth knowing before anyone plans Lane 3.

---

## 4. What was established without venue data

### 4.1 The classification taxonomy is now the vendor's, not ours

Read off the live swagger. `Voucher` carries **three independent document slots**, and the spec says
explicitly that *"a voucher may have both a document, an attachment and an ediDocument"*:

| slot | vendor's own words | what a costing import gets |
|---|---|---|
| `ediDocument` | *"created based on a machine readable document (such as EHF or EFO/NELFO)"* | everything: per-line quantity, UN/CEFACT unit code, item net price, base quantity, seller article number, GTIN |
| `attachment` | *"provided from an external source ... **This is always a PDF**"* | nothing per-line. Posting totals only. |
| `document` | *"generated by the system ... **always a PDF**"* | nothing per-line. |

Plus `supplierVoucherType ∈ {TYPE_SUPPLIER_INVOICE_SIMPLE, TYPE_SUPPLIER_INVOICE_DETAILED}`, and
`orderLines[]` is populated only for DETAILED. And confirmed from the schema: `OrderLine` has `count`
but **no unit-code field of any kind** — so a DETAILED invoice gives quantities whose unit basis
cannot be established from the line, which is precisely the per-pack/per-unit hazard the plan's §3
unit guard exists for. That is a real limitation of Class B, and it means **EHF is not merely nicer
than order lines, it is the only class that can safely produce a price comparison at all.**

This yields four classes, which is what the instrument reports:

- **A — EHF/machine-readable**: `ediDocument` present and parses as UBL. Full line detail.
- **B — DETAILED order lines**: `orderLines[]` non-empty. Description, count, unit price ex VAT, line
  amount ex VAT — but no unit code, so every row needs the pack review.
- **C — PDF only**: `attachment` or `document`, nothing else. Totals only.
- **D — Header only**: no document at all.

The plan's STOP rule is: if C+D is the majority, stop.

### 4.2 The mandate fact behind the ruling holds, and it has a date

Verified against Norwegian tax/advisory primary commentary today, because the ruling rests on it and
it post-dates this model's training:

- Amendments to bokføringsloven extending e-invoicing to B2B were **adopted in June 2026**
  (Prop. 44 L (2025–2026)).
- **From 1 January 2027**, all bookkeeping-obliged Norwegian businesses must **send** e-invoices to
  each other in a standardised format; EHF is the proposed mandatory format, to be fixed by forskrift.
- **From 1 January 2030**, businesses must have an accounting system that automatically **receives and
  processes** e-invoices.
- Businesses under NOK 50 000 turnover are exempt — irrelevant to food wholesalers.

Two things follow that the decision text does not currently record. First, the 2027 date is the
**sending** obligation, which is the one that matters here: it is the venue's *suppliers* who must
send EHF, and Tripletex already receives EHF today. Second — and this is the load-bearing one —
**that date is five months away.**

---

## 5. Deliverable 3 — the ship-or-stop answer

**The literal answer: not decidable today, and the reason is not that the work is hard.** No real
invoice and no real token exists within reach. Every input to the decision is absent.

**The counter-argument this lane was asked to test** was: *pre-mandate, some suppliers still send
PDFs, so the spike may find the input is not yet structured enough to rely on.* It could not be
tested empirically. But the framing can be corrected, and this is the finding worth Sven's attention:

**The plan's STOP rule measures a snapshot that is guaranteed to change on a known date.** "If the
majority are scanned PDF-only, STOP" was written when the mandate was an abstraction. Today it is
2026-08-03 and the sending obligation starts 2027-01-01. A STOP concluded from an August-2026
invoice mix would be a decision made against a supply of paper that is legally required to stop
within five months — and it would have to be reopened almost immediately. Equally, a SHIP concluded
from the same mix would be over-confident about the months before that date.

So the honest reframing: **the question is not "is the input structured today", it is "is it
structured by the time a real venue is actually running Margin".** Given R2 (no customer signed) and
the 2027-01-01 date, those two dates are very likely on the same side of the mandate. That materially
weakens *both* horns of D-EHF-UNPARK as originally posed, and it makes the case for keeping the
parser parked-but-alive stronger than either "wire it now" or "delete it".

**What this lane will not do is manufacture a verdict.** The decision that the module's second-worst
deal-loser gets fixed is a real one; the evidence that it can be fixed is not yet in hand, and this
lane is the gate precisely so that nobody wires an append-only price timeline to an unvalidated
input.

---

## 6. Exactly what is needed — and it splits into two asks, one of which is cheap

The two exit criteria are **independent**, and conflating them is what makes this look expensive.

### Ask 1 (cheap, no token, no signed pilot, no database) — the one that actually decides ship/stop

**Five to fifteen real supplier invoices from one real Norwegian restaurant, as files.** The plan §7
already names the source: *"Casper's invoices."*

This is not a new discovery. The backend's own decision log,
`OkamAPI-modules/docs/plans/DECISIONS.md:172`, already carries the line:

> **Blocked on external input, not on a ruling:** Tripletex Lane 0 needs Casper's real invoices

So the estate had already classified this lane as waiting on one specific external hand-off. What
changed on 2026-08-03 is that `D-EHF-UNPARK` was ruled `unpark-now` — but the ruling authorises the
spike, and the spike's single input never arrived. **Nothing in the ruling produced Casper's
invoices, and no amount of agent time can.**

Any of these forms works:

- The EHF XML itself, if the venue's accountant can export it.
- A Tripletex user at the venue can download them from the Tripletex web UI directly — **no API
  access, no token, no developer involvement.** For each supplier voucher, the EDI document is
  downloadable from the voucher view.
- Failing that, even the PDFs answer the coarse question — because a PDF-only invoice *is* the Class
  C answer. Seeing that ten of twelve arrived as scans would be a legitimate STOP.

Drop them in `lanes/L-MRG-EHF-SPIKE/invoices/` (git-ignored) and Lane 0's core question is answered
the same afternoon. **This ask does not require a pilot venue to have signed anything.** It requires
one restaurant willing to share a dozen invoices.

### Ask 2 (only relevant once a venue is connected) — the entitlement

A real venue's Tripletex `TripletexConnection.ApiToken`, plus the consumer token, in the environment,
and someone authorised to run the handshake. Then `classify-invoices.py` prints
`ENTITLEMENT: YES|NO` on its first line. Until a venue is connected there is no stored token whose
entitlement could be probed, so this criterion is not merely unreachable — **it currently has no
referent.**

Note also §3's finding: no shipped surface probes this. If the answer is wanted from the running
product rather than a script, that is a small build (a read-only admin route), not a query.

---

## 7. The instrument left behind

`lanes/L-MRG-EHF-SPIKE/classify-invoices.py` — read-only apart from the mandatory session handshake.
It refuses to start without credentials in the environment (verified: it exits with
`set TT_CONSUMER_TOKEN and TT_EMPLOYEE_TOKEN in the environment` and makes no network call), never
takes a token on the command line, prints no token and no amount, and reports suppliers by
organisation number rather than name so the output can be shared without publishing who a venue buys
from.

Its EHF half was self-tested offline against the four synthetic fixtures — see
`instrument-selftest.txt`. It correctly reads 8 lines with `unitCode` values `KGM`/`LTR`/`H87` from
the wholesaler fixture, handles the `CreditNote-2` syntax's `CreditedQuantity`, and reports partial
fill (3 of 4 lines carrying a unit code) on the deliberately-degraded fixture. **That proves the
instrument, not the product**, and says nothing about production.

---

## 8. What was NOT done, deliberately

- No container was started; the four running SQL containers belong to other lanes and were not touched.
- No migration was authored.
- No probe that writes was run against Tripletex. The only calls made were unauthenticated GETs that
  returned 401, and a fetch of the public swagger document.
- No credential was read, printed, copied or committed. The only secrets file opened was inspected for
  **key names and the connection host** only.
- Nothing was pushed.

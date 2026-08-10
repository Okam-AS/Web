# The un-upstreamed backend branches, ranked by what a person would notice

**Backend trunk `1c71ae951` · 2026-08-08 · lane L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED**

The census classified; this ranks. It names candidates only — **it proposes no landing order and lands
nothing**, because what exists and what to do about it are separate questions.

## Re-derived, not inherited

The brief names `7d0450a4b`. The trunk had moved again by the time this ran, so everything below is
measured at **`1c71ae951`**, with `git cherry` patch identity re-run from scratch rather than the
census's numbers carried forward.

| class | at `057c390ad` (census) | at `1c71ae951` (now) |
|---|---|---|
| unlanded `lane/*` | 217 | **215** |
| superseded | 7 | **7** |
| carrying an un-upstreamed change | 143 | **145** |
| unmeasurable across the trunk rebuild | 62 | **63** |

The live class is 145, not 143 — the money tranche landing removed some and new lanes added others. Any
row ranked below was re-checked at this tip, so none of them is a branch that has since been superseded.

## What the 145 actually are, read from their diffs

| shape | count | ranked here? |
|---|---|---|
| `lane/ask-*` — one feature programme, 15 branches, **918 product files** | 15 | no — see below |
| large product changes (>12 product files) | 5 | no — not small sharp fixes |
| **small product changes touching money, statute or a guest-reachable path** | **43** | **yes — the candidate list** |
| small product changes touching none of those | 47 | no |
| test-only | 29 | no |
| docs/scripts-only | 6 | no |

**`lane/ask-*` is excluded on purpose, and it is the largest thing here.** Fifteen branches carrying 918
product files between them are the Ask module, an unlanded *feature*. Whether it ships is a programme
decision for its owner; ranking it beside a one-file credit-note bug would flatten two different
questions into one list. It is named rather than silently dropped because 918 files is not a rounding
error.

**Ranking by size was tried first and discarded.** Sorting the money/statute/guest set by product-file
count put all thirteen largest `ask-*` branches on top — it ranked the biggest feature, not the thing a
person notices most. Size is not impact.

## Ranked, each settled by reading the diff

Six opened and read. The instrument for every row is the diff at the named commit against
`git merge-base 1c71ae951 <branch>` — the branch name and the commit subject were treated as claims to
check, not as evidence.

| # | branch | at | what a person meets today | instrument |
|---|---|---|---|---|
| 1 | `lane/ev-vipps-fallback` | `9e3a607bb` | **A guest who has already paid a deposit in Vipps is returned nowhere.** The deposit order's `merchantInfo.fallBack` and the emailed link were composed separately and drift, so the guest lands on a different origin or a path the frontend does not serve — after the money moved. | diff adds `Helpers/Events/EventsGuestLink.cs` as the single composer for both callers |
| 2 | `lane/xz-printed-defects` | `6c394057e` | **A statutory X/Z report claims the venue received money it only invoiced.** Company-account allocations are receivables and were counted inside `Sum mottatt`; the kontantsalg/kredittsalg split (§ 2-8-2) was not printed unconditionally, so a reader cannot tell an absent line from an unbuilt one. | diff at the ESC/POS X/Z builder, `allMeans.Where(p => !p.PaymentType.IsCompanyAccount())` |
| 3 | `lane/credit-note-number` | `24c95aa94` | **Two bookkeeping documents share one number.** `CreateCreditNote` inserts a new invoice row but named the download from the route parameter, so `KREDITNOTA-<credited number>.pdf` sat beside `RAPPORT-<same number>.pdf`, the file name contradicted the number printed inside the PDF, and a second credit note downloaded under the first one's name. | diff at `Controllers/InvoicesController.cs`, `DownloadNameOf(model)` replacing `model.Invoice.Heading + "-" + invoiceId` |
| 4 | `lane/paymenttype-defined-tender` | `bd77cd6b0` | **An out-of-range payment type reaches a printed fiscal line.** A C# enum is not validated on cast and the Newtonsoft binder accepts any integer while rejecting only unknown names, so an undefined tender arrives intact and is printed on the journal's payment line. | diff introducing `RequireDefinedTender(...)` at both the card-finalize and sale-payment sites |
| 5 | `lane/ev-inquiry-gate` | `8ecb47dfa` | **A venue that never opted in takes public enquiries it can never open.** The inquiry service had no module gate at all; the fix makes it a required constructor dependency rather than optional-with-a-null-check. | diff at `EventsInquiryService`, `EnsureStoreExistsAsync` → `EnsureStoreTakesPublicInquiriesAsync` |
| 6 | `lane/meals-release-race` | `f70a0254c` | **The loser of a release race gets a 500 and the wrong reason.** An exception from the unwind propagated in place of the original, so the `throw;` never ran and the guest was told something untrue about why their order failed. | diff wrapping the release in its own `try`, with the propagation argument in the comment |

Ranked by what the person meets, not by claimed severity: a guest stranded after paying (1) and a fiscal
document misstating what the venue received (2) sit above a race that produces a wrong error page (6).

## `unreadable` — counted, not guessed past

**37 of the 43 candidates were not opened.** They carry a plausible money, statutory or guest signal from
their paths, and their commit subjects read like real fixes — but a subject is exactly the evidence this
program has been burned by three times, so they are recorded as `unreadable` rather than ranked on it.
They are listed in the lane directory with their tips and subjects so the next reader starts from the
shortlist rather than from 215.

The other 102 live branches (feature programme, large, non-M/S/G, test-only, docs-only) are classified by
diff shape but likewise unranked.

| | count |
|---|---|
| ranked, diff read | **6** |
| candidate, `unreadable` — not opened | **37** |
| classified by shape, not ranked | **102** |
| **total live** | **145** |

## Why this file is tracked despite `.gitignore`

A bare `artifacts/` rule catches `docs/plan/artifacts/` at any depth, so a plain `git add` silently does
nothing. Added with `git add -f` and confirmed with `git ls-files --error-unmatch`.

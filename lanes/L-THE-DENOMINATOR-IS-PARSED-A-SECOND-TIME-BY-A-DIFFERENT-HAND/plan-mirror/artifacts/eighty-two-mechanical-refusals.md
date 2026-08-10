# The eighty-two mechanical refusals

Three classes where the proof exists and the plan recorded it wrongly. The rule throughout: record what
the evidence IS, never what would make the tool say yes. No `--override`, no `plan accept`.

## Counts

| | count |
|---|---:|
| **ACCEPTED** | **59** |
| still refused, with reason | 23 |
| unrecoverable | 0 |

Lane `verified` **342 → 401**. Refusal reasons that *changed* rather than cleared: **0**.

## What cleared

- **37** whose `evidence:` held a prose sentence *around a real artifact path*. The path was extracted and
  recorded; three of them were untracked and were secrets-scanned and committed first.
- **15** whose EXIT named a directory. The evidence was already a specific file — the exit now names it too.
  One of these, `L-LIVE-WORLD-TWO-HUMANS-WALK`, verified against a journey capture the bare `artifacts/`
  rule was keeping uncommitted; it was force-added past `.gitignore:111` and verified tracked, so the
  lane does not rest on a file no stranger can fetch.
- **7** recovered from a git ref, secrets-scanned, written back and committed.

## What did NOT clear, and why it is correct

**23 lanes stay refused.** Their `evidence:` is not a prose sentence wrapped around a path — it is a
sentence naming a **worktree, a branch and a SHA**, followed by the *source files that changed*:

> `OkamAPI worktree /Users/…/wt-utlkvit, branch lane/meals-utlkvit @ 1a03bc6c (local, not pushed) ·
> SQL TIER WebApi.Tests/Meals/MealsDeliveryReceiptSqlServerTests.cs (3/3 green) · …`

There is no artifact path in the sentence to extract. The only file-shaped things in it are **test
sources**, and pointing `evidence:` at a test file would violate **C5** — *"an item is moved to verified
whose only named evidence is a .trx, a junit file, a suite-kind fact, or a test name"*. Recording one to
make the tool say yes is exactly what this pass forbids.

Their proof is a branch and a green suite. That is a real thing, but it is not an artifact a stranger can
open, so they belong with the work that still needs an artifact produced — not with the mechanical class.

- `L-MEALS-UTLKVIT`
- `L-VIPPS-REDACT-404`
- `L-WF-VIOLATION-EXACT`
- `L-STATUTE-EVIDENCE-WORLD`
- `L-WF-DEMO-PRESENCE`
- `L-GR-TESTSEND-GUARD`
- `L-PRICE-SHADOW-GUARD`
- `L-UTLKVIT-SALE-ROW`
- `L-GR-CONFIRMED-EMAIL`
- `L-GR-TESTSEND-RATELIMIT`
- `L-MEALS-FOURWAY-TIER`
- `L-GR-CONFIRMED-PIN-FIX`
- `L-CONFIRM-SERVER-HALVES`
- `L-LIVE-ASSERTION-FLOORS`
- `L-COMPOSITION-ROOT-CHECK`
- `L-CRYPTO-PIN-BYFORM`
- `L-CONFIRM-POSTMERGE-PIN`
- `L-UTLKVIT-REPRINT-KIND`
- `L-INVOICE-AUTHORIZE`
- `L-CENSUS-FLOORS-DERIVED`
- `L-WF-IDEMPOTENCY-REFUSAL-REST`
- `L-EV-JOURNEY-TIMEBOMB`
- `L-WF-WITHHELD-BOUND`
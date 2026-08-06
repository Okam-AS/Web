# These files contain a dead unsubscribe token. Here is why that is fine, and why they are committed.

**If a secret scanner brought you here: this is not a live credential and there is nothing to rotate.**

All three files carry an unsubscribe token in real production format (`u1.` + base64url). It authenticates
against nothing that exists:

- It was minted into an **in-memory SQLite database** created by
  `WebApi.Tests/Growth/GrowthUnsubscribeExitReachabilityTests`, which ceased to exist the moment the test
  process exited. There is no store, no contact point and no row it refers to.
- The links name **`web.growth.test`** — a fictional host, used by `GrowthDispatchTestSupport` precisely so a
  captured link can never point at a system anyone operates.
- It was never sent to anybody. `GrowthFakeMailProvider` performs no network I/O; these are its in-memory
  recording of what `GrowthDispatchService` submitted.

## Why committed rather than generated

The defect this lane closed (`F-GR-NO-EXIT-FROM-A-LIST`) was **a missing join**, not a broken endpoint. Both
halves worked and nothing connected them. So the property under test is the *composition*: that something in
production actually emits this address.

A journey that built its own `{base}#token={token}` would prove the page works and say **nothing** about
whether anything emits that link — it would pass just as happily against the defect. The J-EXIT-UNSUB journey
therefore opens **the link the dispatcher composed**, read out of the body below. Generating it at journey time
would substitute a constructed link for the captured one and quietly retire the assertion.

Ruled by the coordinator on 2026-08-04, recorded with its reasoning so this file has an answer waiting rather
than causing a panic.

## Nothing can regenerate these against a real backend

Two separate guarantees, because two separate things could go wrong:

1. **Regeneration** (`WriteEvidence` in `GrowthUnsubscribeExitReachabilityTests`) **refuses to write unless the
   captured link names `web.growth.test`.** The host literal is duplicated inside that guard rather than read
   from the harness constant — a guard expressed in terms of the thing it guards cannot fail. Repointing
   `GrowthDispatchTestSupport.UnsubscribePageBaseUrl` at a real origin reds the test instead of silently
   committing a live-origin link. The write is additionally opt-in, gated on `GROWTH_EXIT_EVIDENCE_DIR`, which
   has no default.
2. **Spending** the token against a live API cannot happen from the journey: `growth-guest-unsubscribe.spec.js`
   carries the default `@fixture` tag, and `playwright.config.js` sets `grepInvert: LIVE_API ? /@fixture/`, so
   the journey is skipped outright whenever `E2E_API_BASE_URL` points at a real backend.

## The files

| file | what it is |
| --- | --- |
| `captured-exit-link.txt` | the exit link alone, with a `#` annotation line the journey skips |
| `captured-plaintext-body.txt` | the plain-text alternative **verbatim**, as the provider received it |
| `captured-html-body.html` | the HTML alternative **verbatim** |

The two bodies deliberately carry **no** annotation line: they are the evidence of what the provider received,
and a body with a line we added is no longer that.

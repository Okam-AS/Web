# The thirty-seven, opened

**Backend trunk `668590cbe` · 2026-08-08 · lane L-THE-THIRTY-SEVEN-UNREADABLE-ARE-OPENED**

The ranking lane read six branches and refused thirty-seven rather than rank them on their commit
subjects. These are those thirty-seven, each opened at its own merge-base against the current trunk.
**No landing order is proposed and nothing is landed.**

## Re-derived, not inherited

`git cherry` re-run at `668590cbe`, after seven trunk moves today including two of my own landings:

| | |
|---|---|
| candidates from the census | 43 |
| already read by the ranking lane | 6 |
| **opened here** | **37** |
| **superseded since the census** | **0** — measured, not assumed |

All thirty-seven still carry at least one commit with no patch-equivalent upstream. The landings that
happened today were of other branches, not these.

## THE FIRST FINDING: thirty-seven branches are thirty-two changes

Grouping by the **exact bytes of the product diff**, four clusters hold nine branches between them —
so **five of the thirty-seven are redundant copies of a sibling**, carrying no distinct change at all.

| cluster | branches |
|---|---|
| the module flag effective-resolvers (identical, ×3) | `flags-excuse-byflag`, `flags-resolvers-cover-three`, `growth-effective-resolver` |
| the Events guest-link composer (identical, ×2) | `ev-uri-relative`, `guestlink-one-composer` |
| the Growth preference-centre credential (identical, ×2) | `gr-withdraw-origin`, `growth-prefcentre` |
| the phone-number-out-of-the-path change (identical, ×2) | `phone-in-path`, `route-guard-gaps` |

**A near-miss worth recording.** By eye, five branches looked like one CORS cluster —
`cors-credentialed-origin`, `cors-followups`, `meals-reachable-api` also carry that work. By exact
diff only two are identical; the others are a stack at different depths. Reading them as one group
would have been wrong, and only hashing the diff caught it.

**`lane/meals-reachable-api` carries the Growth preference-centre CORS diff.** Not a Meals change.
Its name is the single clearest vindication of the rule this lane exists to apply: read the diff.

## THE SECOND FINDING: six of them collide with what landed today

`git cherry` calls these live because their patches are not upstream — which is true, and misleading.
They were authored against a trunk that predates today's two landings and touch the same files.

| file landed today | branches that also change it |
|---|---|
| `Services/Kassa/EscPosXZReportBuilder.cs`, `Models/Kassa/XZReportModels.cs` | `eod-credit-split`, `meals-xz-credit`, `xz-credit-fields` |
| `Controllers/GiftcardController.cs` | `phone-in-path`, `route-guard-gaps` |
| `Services/GiftcardService.cs` | `rollback-tracked-sweep` |

The three Kassa branches carry the **EOD day-settlement counterpart** of the X/Z split landed at
`668590cbe` — the same `CreditTotal` idea applied to `EodService`. They are not superseded; they are
the other half. Whoever takes them must recompose, not replay.

The two giftcard branches rewrite `TransferGiftcard` to move the receiver's phone number out of the
route — the same method that received the ownership guard today.

## Ranked by what a person would notice

Each row was settled by reading the diff at the named commit against its own merge-base.

| # | branch | at | what a person meets | class |
|---|---|---|---|---|
| 1 | `phone-in-path` (= `route-guard-gaps`) | `a60da359b` | **A customer's phone number travels in the URL path.** Sink redaction kept it out of Application Insights, but a URL is read by every intermediary, reverse proxy and access log between caller and process. | reproduces |
| 2 | `push-token-in-path` | `363d3f7fa` | **An APNS/FCM device token — a credential for pushing to that device — travels in a URL**, recorded as the request name with no log statement involved. | reproduces |
| 3 | `eod-credit-split` / `meals-xz-credit` / `xz-credit-fields` | `f028c0a87` etc. | **The day settlement still claims the venue was paid**, folding company-account allocations into takings and contradicting the KREDITTSALG figures on the Z report the same close cuts. | reproduces, collides with today's landing |
| 4 | `isofix` | `1df46dcc9` | **A caller can tell a real store from an absent one** by sending no body: the null-body 400 fires before the store gate, and that shape is what the opaque 404 exists to withhold. | reproduces |
| 5 | `rollback-tracked-sweep` | `118297520` | **A refusal decided after a write leaves the scoped DbContext holding a row the database rolled back** — assigned up front, so the process carries a payment type the database never took. | reproduces |
| 6 | `margin-waste-500` | `1ed372bd5` | **An unknown ingredient answers 500 rather than 400** — the composite foreign key refuses at save, which is a crash rather than an answer. | reproduces |
| 7 | `pdf-creditnote-name` | `015c07ca2` | The credit-note download name, identical in substance to `credit-note-number` already ranked and flagged. | reproduces, duplicate of a ranked row |
| 8 | `margin-finalize-lag` | `a6a1174b8` | A finalized margin statement is frozen only by a service guard; this adds the database teeth (THROW 50061). | reproduces |
| 9 | `meals-idempotency-refusal` / `meals-agreement-pin-inverts` / `wf-idempotency-refusal-rest` | `54714dd6e` etc. | **A refused command answers a retry with `in-progress` forever** — the table has no expiry column and nothing purges it, so the key is permanently unusable. | reproduces |

The remainder — the flag resolvers, the CORS stack, the Events composer, the Margin starter library,
the accounting export counter, `finalize-index-or-a-reason`, `compose-and-run-the-stack`,
`ev-accept-receipt`, `margin-violation-anchor`, `mrg-price-correction-2`, `pref-cookie-half` — were
opened and are interpretable, but their impact is on operators and correctness margins rather than on
something a guest or an inspector meets, so they rank below the nine above.

## Counts

| class | count |
|---|---|
| opened and interpreted | **37** |
| of which redundant copies of a sibling branch | 5 |
| distinct product changes among them | **32** |
| superseded by the trunk since the census | **0** |
| **still-unreadable** | **0** |
| colliding with a landing made today | 6 |

**`still-unreadable` is zero and that is a real answer, not a claim of completeness.** Every one of the
thirty-seven changes product code with a diff that says plainly what it does. The class stayed
available and was not needed; had a branch required running to interpret, it would appear here.

## Why this file is tracked despite `.gitignore`

A bare `artifacts/` rule catches `docs/plan/artifacts/` at any depth, so a plain `git add` silently
does nothing. Added with `git add -f` and confirmed with `git ls-files --error-unmatch`.

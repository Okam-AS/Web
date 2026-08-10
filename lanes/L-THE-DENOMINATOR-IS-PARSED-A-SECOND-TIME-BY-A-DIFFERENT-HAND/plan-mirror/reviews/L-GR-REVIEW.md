# Fable review — Growth (L-GR-REVIEW, 2026-08-01)

Read-only review. No file was edited. Backend checkout on `lane/meals-grace-pins`, which contains
`feature/restaurant-modules` as an ancestor with **zero diff in any Growth path**, so this reads the target
branch.

## 1. The first stop

**Today a guest is stopped before the form is drawn.** The consent-text read is gated on `growth.module`,
ANDed with the deployment-wide `Growth:Enabled` switch; `Enabled` defaults **false** and the per-store flag
defaults false, so `pages/subscribe/_store.vue` renders its "unavailable" card and no capture is possible
anywhere. That is the deliberate dark posture, clearable by configuration — except that **no frontend
anywhere calls `PUT /stores/{storeId}/feature-flags`**, so the per-store half of the lever is curl-only.

**Once every ruled config is applied, the first stop that no configuration can clear is the withdraw step.**
The preference-centre session cookie is `HttpOnly/Secure/SameSite=Strict` scoped to `/v1/growth`; the pages
are served from `okam.no` and the API from `https://okamapi.azurewebsites.net` (`nuxt.config.js:45`), which
are different **sites** (`azurewebsites.net` is a public suffix), so a Strict cookie is never attached. And
independently, `Program.cs:100` builds the default CORS policy with `AllowAnyOrigin()`, which a browser
refuses to combine with `credentials: 'include'` — the preflight fails before the cookie even matters. A
guest who clicks the footer link in a real newsletter reaches the preference centre and the session open
fails. **Both frontend files state this defect in their own headers** — it is a code/deployment-topology
fix, not a config value.

## 2. The inventory (abridged to the breaks)

| Step | Verdict |
|---|---|
| Finding the subscribe page | **absent** — nothing links `/subscribe/{store}`, and no admin surface prints or copies the venue's capture URL |
| Subscribe form | **reachable** (anonymous, no credentials, CORS-fine) but dark today. Consent text seeded at boot idempotently — **the "seed with no production caller" shape does not apply here** |
| The DOI mail | **reachable-on-config** — defaults to `Fake` so no mail leaves an unconfigured deployment, but this is a **boot-logged CRITICAL, not a silent fake**, and the fake has injectable failure modes. The ruled Postmark path is real and proven against the documented sandbox token on 2026-07-31, and fails closed when incomplete |
| Confirm | **reachable** — appends exactly one Granted receipt pinning the consent-text version |
| Withdraw at the preference centre | **broken at deployed origins** — SameSite=Strict cross-site + `AllowAnyOrigin` CORS. Works only same-site (local proxy) |
| One-click unsubscribe (RFC 8058) | **reachable-on-config**; headers attached before the irreversible transition. Server-to-server, no CORS. **Currently the only withdrawal path that works end-to-end at the deployed origins** |
| Human unsubscribe page | **absent navigation** — nothing links it, and there is no GET handler to redirect a browser, so a long-pressed List-Unsubscribe URI answers 405. **Given the break above, the one browser withdraw page that would work cross-origin is the one nothing links** |
| Operator author→approve→dispatch | **reachable**. The dispatch chain is genuinely consent-gated: snapshot from the consent authority plus a final per-recipient re-check with evidence receipts. No send path bypasses approval |
| Delivery truth after send | **broken with the ruled provider** — Postmark does not sign webhooks and the verifier fails closed *by its own design*. Delivered/failed/opened stay frozen at zero forever on a Postmark deployment; bounce suppressions never ingest |
| Privacy requests (art. 15/17) | **broken for the venue: statutory claim without a surface.** The guest is told the venue has one month to answer under article 12 — the request row exists, and **no human at the venue can see it anywhere** |
| Consent receipts readable by a person | **API-only** — receipts are written correctly and the timeline endpoint is real, but no UI reads it and the id needed to call it is only discoverable from the privacy-request list, which also has no UI. "Readable by a person" today means two chained curl calls with a PowerUser token |
| PowerUser Growth ops | **misdirection in the nav** — `/admin/poweruser-growth` is a platform *statistics* page unrelated to this module. Consent-text authoring, provider accounts and the provider **pause kill switch** are all API-only |

**Can a never-consented guest be contacted?** Not by dispatch — that chain is tight. But **test-send can mail
marketing content to any address a store admin types**: it does no consent check, no verification the address
is the admin's own, and — unlike every other Growth write — the controller passes **no user id**, so the
submission is unattributed. With a real provider bound this is a working path around § 15.

## 3. The discard sweep — the clerk's flagship claim is substantially wrong

- `readApproval` does **not** null the invalidation time. `utils/growth/send-gate.js:201` parses
  `approval.invalidatedAt` and returns it on **every** branch. What it nulls in the non-Live branch is
  `approvalId`/`approvedAt`, which **mirrors the wire exactly**.
- The backend on this branch does **not** serve the revoked state, the approver, the bound content hash or
  the revoker. The approval summary carries exactly five fields, and `State` is only ever `"Live"` or
  `"None"`. The other three exist on the entity and are projected onto **no** wire model. **The collapse
  described cannot happen at the frontend because the wire never distinguishes revoked from never-approved.**
- What **is** true and stands: the page renders only the state badge and `approvedAt`; `invalidatedAt` and
  `approvalId`, which `readApproval` hands it, are rendered nowhere.

Genuine discards, by weight: the page's `invalidatedAt`/`approvalId`; the session `expiresAt` (a 30-minute
session mid-erasure whose actual expiry is never shown); privacy-request `state`/`requestType`; and — mirror
image, backend side — `GrowthConfirmResult.ConsentReceiptId` returned by the service and discarded by the
controller, so the guest gets no reference for their own consent receipt though they do get one for a privacy
request. Three further discards carry written justifications and are deliberate.

Everything else checks clean. **No advertised-but-ungating flags in Growth** — both gate real routes, unlike
Training and Workforce. No service without DI or route.

## 5. What could not be determined

- **The actual deployed configuration.** Secrets and environment config are correctly not in the repo, so
  "dark today" is inferred from code defaults, not from reading Azure.
- That okam.no serves this repo's build — assumed, no deployment manifest read.
- **Nothing was executed.** Static read of the branch. The CORS/cookie verdict in particular deserves one
  Playwright run against the deployed pair as its instrument.
- Whether Nuxt 2.17's route ordering resolves `/subscribe/confirm` ahead of `/subscribe/:store` in the built
  app.

## Clerk's note on the contradiction with L-GR-APPROVAL-STATE

Both are correct and they are reading different trees. `L-GR-APPROVAL-STATE` added the approver, the content
hash, the version number and the revoker to the projection **on `lane/gr-approval-state`, a local worktree
branch that has not been merged**. This review read `feature/restaurant-modules`, where the old five-field
shape still stands. The error was the clerk's: the Growth brief described the post-lane state as though it
were on the branch.

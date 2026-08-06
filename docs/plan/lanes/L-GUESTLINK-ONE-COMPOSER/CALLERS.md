# Tree-wide search: who composes the guest return URL

Searched 2026-08-06 by `agent:L-GUESTLINK-ONE-COMPOSER`. Backend repo is **`OkamAPI`** (`~/okam/OkamAPI`);
the plan hub lives in `Web-modules`, where the SHAs below resolve to nothing. Baseline
`feature/restaurant-modules` tip **`8e2b57de`**.

## What "the guest return URL" is

`{Events:PublicBaseUrl}/events/deposit/{PublicToken}` and `.../events/proposal/{PublicToken}` — the
anonymous, token-addressed guest pages (Events spec §5). It is **not** the module's API surface
(`GET /events/deposits/{token}`, plural) and **not** the checkout return path, which is resolved per-request
from the caller's `Origin` by `IClientConfigurationService` and is a different destination entirely.

## Production callers

| # | File | Reaches the composer | What it does with a refused origin |
| - | ---- | -------------------- | ---------------------------------- |
| 1 | `Services/Events/EventsEmailNotificationDelivery.cs` | yes, after this lane | catches `UriFormatException` at its own boundary, returns the retryable `PublicBaseUrlMalformed` delivery label — one bad row fails a row, not the outbox drain |
| 2 | `Services/Events/EventsDepositPaymentPortAdapter.cs` | **not on this branch** — on `lane/ev-vipps-fallback-2` (`fc09be1d`), unmerged | refuses the initiate *before* the Vipps call: an order is money held on a guest's card and cannot be un-made, so a `Failed` row staff can reissue beats a completed payment with a broken return link |

Caller 2 is why the composer exists at all: `merchantInfo.fallBack` is the only way back to an anonymous
deposit page addressed by `PublicToken`. It is declared here and **not** carried into this lane's branch —
it is another lane's commit to land. When it lands it reds `Every_production_caller_of_the_composer_is_named_here`
until one line is added to `DeclaredCallers`; that red is the mechanism, not an accident.

## Non-callers that a looser search would have swept in

| File | Why it is not a guest return URL |
| ---- | -------------------------------- |
| `Controllers/EventsDepositsController.cs`, `EventsController.cs`, +4 | `[Route("events")]` — no leading slash, an API prefix, not a page address |
| `Controllers/VippsController.cs:407` (`GetFallbackUrl`) | the **checkout** return path, origin-resolved per request; the Events guest page is not reachable from it |
| `Mcp/Services/McpShoppingService.cs:442` | same checkout destination via `GetVippsFallbackWebPath` |
| `Services/Growth/GrowthConfirmationMailer.cs` | Growth's double-opt-in link. Puts its token in a URL **fragment**, so it never reaches a server log or a `Referer`. Different module, deliberately different (stronger) shape |
| `Services/Mcp/McpAuthorization.cs`, `McpProtectedResourceMetadataFactory.cs` | compose from `Mcp:PublicBaseUrl` — the **API** origin, a different setting from `Events:PublicBaseUrl` |
| `Models/AppSettings/EventsSettings.cs`, `Helpers/CapabilityRouteTelemetryInitializer.cs`, 4 more | quote the address in **doc comments** only. This is why the sweep strips comments before matching, and why three synthetic comment cases guard the stripper |

## Frontend (`Web-modules`)

No production code composes the return address. `pages/events/deposit/_token.vue` and
`pages/events/proposal/_token.vue` **consume** it as a Nuxt path parameter; `utils/events/events-guest-client.js`
calls the API route (`/events/proposals/{token}`), not the page. The only files spelling the page path are
Playwright journeys navigating relative to `baseURL`, plus `events-runsheet-print.spec.js`, which asserts the
run sheet does **not** print `/events/deposit/` — a leak check, not a composition.

## Copies of the composer itself

`EventsGuestLink.cs` exists on three unmerged branches and their three worktrees. All six are **byte-identical**
(`sha 97110b7c61e6`), with no uncommitted divergence in any worktree:

    lane/ev-uri-relative      @ 6a7bf75b   + mail path + EventsGuestLinkOriginTests
    lane/ev-vipps-fallback    @ (v1)       + mail path + Vipps adapter
    lane/ev-vipps-fallback-2  @ fc09be1d   + Vipps adapter only  ← the branch the flag names

`EventsGuestLinks.cs`, **plural, does not exist** on any ref, in any worktree, tracked or untracked. Confirmed
again here; the sweep on 2026-08-04 settled it and this lane spent no time re-opening it.

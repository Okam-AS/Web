RETURN: L-MEALS-FUNDED
brief: 5787ba03
verdict: fail-spec
evidence: pages/webshop/checkout.vue (13-line redirect to shop.okam.no) · core/services/cart-service.ts:57 · .gitmodules + core@cd1cc86 vs ../ConsumerWeb core@8931bc39
spec_gap: The exit's second conjunct assumes a consumer checkout in this repo; there is none — pages/webshop/checkout.vue is a RedirectToNewStore stub to https://shop.okam.no and no page or component references useCheckout or cartService().Complete, so no capture under artifacts/journeys/ can show a funded order completing here.
log:
All three reported client gaps hold: core/enums/payment-type.ts has no CompanyAccount member; cart-service.ts:57 Complete() posts /carts/complete/{storeId} with no query string; nothing in pages/, components/ or utils/meals/ binds POST /v1/stores/{id}/meals/quotes.
The backend half is complete — PaymentType.CompanyAccount = 120, MealsQuoteResponse returns AuthorizationToken once, and CartService.cs:695-707 cancels the just-created order and throws a MEALS_* code when the token is absent. Its own comment says nothing assigns the tender today.
The blocker is the second conjunct: the consumer checkout is ../ConsumerWeb/pages/checkout.vue (Nuxt 3, branch feature/swiss), a third repo outside this plan's two branches. This repo's only consumer-facing money surface is pages/events/deposit/_token.vue; there is no cart or ordering flow here at all.
The probe is mis-targeted too. core/ is a git submodule: this repo pins cd1cc86 (POS lineage), ConsumerWeb pins 8931bc39 (swiss lineage), diverged 25/11 commits from merge-base 395986c, and the two PaymentType enums already differ (Surfboard/DinteroTerminal here, Twint there).
So writing reservationToken into THIS checkout's cart-service.ts would turn fact:meals.token.client green while the shipped consumer checkout still sends nothing — a green fact over an absent capability, which is what C3 and C5 exist to deny. That is why no code was written.
The fork is an owner decision, not mine: ConsumerWeb, ConsumerApp, frontend-mono apps/consumer-native, or a funded-order surface built in this repo. Whichever is ruled, the probe for meals.token.client and the clears_when on F-MEALS-UNFUNDED must move to that client's Core lineage, or they will keep measuring a file nobody ships.
Secondary, for whoever writes the client: CreateMealsQuoteRequest.QuoteHash has no pinned algorithm — it is stored verbatim and used only in the idempotency fingerprint at MealsQuoteService.cs:625 — so the first client to bind the quote invents the hash contract.
Nothing changed, nothing committed, no suite run. The only file written is this RETURN.
END RETURN

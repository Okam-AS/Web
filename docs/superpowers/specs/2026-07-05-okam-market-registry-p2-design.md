# Okam MarketRegistry (P2) — "Set the country, everything follows"

**Date:** 2026-07-05
**Branch:** `feature/swiss` (all repos)
**Status:** Design (from the read-only market-dimensions audit across Web + ConsumerWeb + OkamAPI)
**Goal:** One **country-keyed MarketRegistry** so that launching a new country is **(a) one config entry + (b) translation files + (c) one secrets bundle + (d) external provisioning** — *no code edits*.

---

## 1. The model

The join key is the **ISO-3166 country code** (`NO`, `CH`, …). That single key indexes three co-located sources:

- **(a) PUBLIC config** — authored once in vendored **Core** (`markets.json`, the ported `edition.js`) and mirrored to the backend as an appsettings `Markets:<CC>` section bound to a `MarketDefinition` POCO. Frontend and backend must read **one source of truth** (or a generated mirror + a contract test) — hand-maintaining two copies is a known drift risk (already happening: `edition.js` `ch.termsUrl` still points at the Norwegian `/vilkar`).
- **(b) Translation files** — one per locale (`de-CH`, `fr-CH`, …) in Core + admin dicts + backend resource strings.
- **(c) SECRET bundle** — per-market, keyed by the **same** `<CC>`, in Azure/user-secrets, **never committed**.

**What already exists (the 80%):** backend `RegionResolver`+`RegionContext` (currency/country/locale + per-region Stripe keys via `StripeSettings:Platforms:<CC>`), the per-region webhook route `/stripe/webhook/{region}`, the `/bootstrap` endpoint, `Features:Regions:<CC>` + `Features:Twint` kill-switches, a **region-aware business-registry dispatcher** (NO→Brreg, CH→Zefix, both DI-registered, endpoint `GET /stores/registry/{number}?region=`), `SwissVatRates`/`VatScheme`, and nullable `Store.{Country,CurrencyCode,Locale,TimeZone,VatScheme}` columns. **The work is ~80% wiring + widening `RegionContext` + deleting `isCh` branches.**

---

## 2. PUBLIC config fields (`markets[<CC>]`)

| Field | CH example | Drives |
|---|---|---|
| `code` | `"CH"` | Join key = secrets key = `Store.Country` = `/bootstrap?region=` = `Markets:<CC>` |
| `isDefault` | `false` (NO=true) | Fallback for null/blank/unknown region |
| `currency` | `"CHF"` | Stripe PaymentIntent currency, price display, `StoreModel.currency` |
| `currencyFormat` | `{symbol:"CHF",prefix:"CHF ",suffix:"",decimalSeparator:".",thousandSeparator:"'",fractionLength:2}` | Money formatting on **both** frontends + backend `Label.Price`/`CurrencyFormatting` |
| `locales` | `["de-CH","fr-CH","it-CH"]` | **List** of supported locales (unlocks fr/it, which ship as dead content today) |
| `defaultLocale` | `"de-CH"` | Fallback when `Store.Locale` unset; replaces hardcoded `setCultureCode('de')` |
| `country` | `"CH"` | Stripe connected-account country |
| `timeZone` | `"Europe/Zurich"` | Order timestamps, opening hours, invoice periods |
| `phone.prefix` / `.nationalLength` / `.mobilePattern` | `+41` / `9` / `^7[0-9]{8}$` | OTP/login/registration; **one canonical validity regex** reconciling today's conflicting validators |
| `enabledPaymentMethods` | `["Stripe","Twint"]` (NO: `["Stripe","Vipps"]`) | Replaces the `isSwitzerland` branch in `BootstrapConfig.Build` |
| `nativeWallet` | `"Twint"` (NO: `"Vipps"`) | Replaces NO↔Vipps / CH↔Twint hardcoded bindings |
| `paymentRails` | `{Twint:{currency:"chf",maxAmount:500000,capabilities:[…]}}` | Per-rail currency, amount cap, Stripe Connect capabilities |
| `vat.rates` | `{standard:8.1,reduced:2.6,accommodation:3.8}` | Wires the **dormant** `SwissVatRates` into `InvoiceService`/accounting |
| `vat.label` | `"MWST"` (NO:`"MVA"`, en:`"VAT"`) | Replaces hardcoded `MVA` literals |
| `vat.merchantFeeTreatment` | `"reverse-charge"` (NO:`"registered-25"`) | How okam's own platform fee to a merchant is taxed (**open legal question**) |
| `vat.orgVatIdLabel` | `"MWST-Nr." / CHE-###.###.### MWST` | Fixes `de.ts:1156` which wrongly uses Germany's `USt` |
| `businessRegistry.provider` | `"Zefix"` (NO:`"Brreg"`) | Which `IRegionBusinessRegistry` (already implemented) |
| `businessRegistry.orgNumberLabel` / `.orgNumberFormat` | `"UID"` / `CHE-###.###.###` | Field label + input mask/validation (fixes "Organisasjonsnummer" leak) |
| `domains.{hostname,shopUrl,aboutUrl}` | `okam-swiss.ch` … | Canonical host, shop links, marketing links |
| `legal.{termsUrl,privacyUrl}` | `/agb`, `/datenschutz` | Terms + privacy links (today still Norwegian) |
| `analytics.gaId` | `G-XXXX` | GA id (replaces inline `isCh?…` in nuxt.config) |
| `email.{fromAddress,invoiceBcc}` | `noreply@okam-swiss.ch` | Per-market sender identity |
| `sms.{senderId,provider}` | `okam` (CH-permitted) / `GatewayAPI` | Per-market SMS sender + optional provider override |
| `storeContentTranslation` | `{origin:"de",targets:["de","fr","it","en"]}` | Product/category auto-translation origin+targets |
| `stripe.publishableKey` | `pk_live_…CH…` | **Public but must be the correct market's** — served via `/bootstrap`, NOT committed to `edition.js` |

## 3. SECRET fields (bundle keyed by `<CC>`, never committed)
`StripeSettings:Platforms:<CC>:{SecretKey,WebhookSecret}` (NO uses legacy flat keys via back-compat) · `Vipps*` creds (NO-only) · `DinteroSettings:{ClientId,ClientSecret}` (**currently PLAINTEXT in `appsettings.json:63-64` → move to secrets**) · `ZefixSettings:{Username,Password}` · `GatewayApiSettings:Token` · `TwilioAccountDetails:{AccountSid,AuthToken}`. **Rule:** every secret is indexed by the same `<CC>` as the public config; adding a market = drop one `<CC>` bundle into Azure/user-secrets.

---

## 4. 🔴 LIVE CH bugs the audit found (fix BEFORE / alongside the refactor — these break real Swiss usage)

1. **Stripe cross-account mismatch (LIVE payment bug):** ConsumerWeb bakes ONE publishable key (the **NO** `pk` in `env.ts`) and confirms a **CH** PaymentIntent (created on the CH platform) with the NO publishable key → Swiss card/TWINT confirm is cross-account. Fix: serve `stripe.publishableKey` per market via `/bootstrap`; stop hardcoding.
2. **Accounting crash (LIVE):** `AccountingSummaryService.cs:305` unboxes a null `SafTVatCode`→`int` for any non-0/15/25 rate → **crashes** the moment a CH store (8.1/2.6/3.8) runs an accounting summary. `AccountingHelper` switch + `AccountingConfiguration` fixed 0/15/25 buckets can't represent CH rates.
3. **Signup dead-end:** `UserService.GetOrCreateAsync:483-488` and `GiftcardService:367-378` still call Twilio Lookup with private const `NorwegianCountryCode="NO"` → Swiss `+41` signup/giftcard blocked even with the phone allow-list on.
4. **Data prerequisite (blocks everything):** `Store.{Country,CurrencyCode,Locale,TimeZone,VatScheme}` columns exist but have **no write path** (grep for assignments is empty) — never populated, so every downstream default is wrong. Needs store-create defaulting from `RegionResolver` + backfill.
5. **Security:** Dintero client secret in plaintext `appsettings.json` (see §3).

## 5. Must-refactor (the hardcoded couplings → read the registry)
Backend: `RegionResolver` dict → config-bound; **widen `RegionContext`** to the full registry object; delete `BootstrapConfig.Build` `isSwitzerland` branch; gate every payment rail through `enabledPaymentMethods` in `PaymentService`/`StripeService` (not `region==CH`); move TWINT currency/limits to `paymentRails`; add per-store TWINT enablement (parity with Vipps/Dintero); localize `ReceiptService.PaymentTypeLabel`; drive VAT from `vat.rates` in `InvoiceService`/`AIService`/accounting; **`Label.cs:15` formats all money as `nb-NO` at ~79 call sites** → take a culture/currency arg; **widen int VAT columns to decimal** end-to-end (EF migration: `Product.{Tax,TableTax,DeliveryTax}`, `InvoiceLineTaxDetail.TaxPercent`, order line tax); table-drive `PhoneNormalizer` from `Markets:<CC>.phone`; per-market SMS sender in `SmsService`; route `CartService`/`AdminKraviaInvoicesController` Brreg calls through `IBusinessRegistryService`; region-drive `StoreTranslationService` origin/targets. Frontend: ConsumerWeb `env.ts`/`configuration.ts` single `pk` → `/bootstrap`; split `currency-format.client.ts` region→currency vs region→locale; `checkout.ts` `isSwissStore = currencyCode==='CHF'` → explicit `store.country`; Web `registrer.vue` phone + VAT masks → `marketConfig`; move `edition.js` off the **build-time `OKAM_EDITION`** flag to runtime (Web currently = one deploy per market).

## 6. Add-a-market checklist (target state)
1. Add `markets[<CC>]` to Core `markets.json`. 2. Re-vendor Core + SHA-bump all 4 clients in lockstep. 3. Mirror into backend `Markets:<CC>` (or point backend at the shared file) + FE↔BE contract test. 4. Add translation files (Core locales + admin dicts + backend receipt/invoice resources). 5. Drop the `<CC>` secret bundle into Azure. 6. Provision Stripe platform + register `/stripe/webhook/<CC>` URL. 7. Flip `Features:Regions:<CC>=true`, rail gates, add prefix to `AllowedPhoneCountryPrefixes`. 8. Store-create defaults populate `Country/CurrencyCode/Locale/TimeZone/VatScheme`. 9. Publish + localize legal pages. 10. Code-add ONLY if a brand-new provider is needed (new `IRegionBusinessRegistry`). 11. Verify: NO-regression tests green + add market `[Fact]`s.

## 7. Risks / big rocks
Two-source drift (Core vs backend `Markets:`); **int→decimal VAT migration** is the riskiest schema change; Web build-time→runtime market resolution; fr-CH/it-CH advertised-but-unrenderable (dead `fr.ts`/`it.ts`); Core submodule lockstep across 4 clients; external permissioning (SMS sender must be permitted per country) is not code-controllable; open legal question on merchant-fee VAT treatment.

## 8. Recommended sequencing
1. **CH correctness hotfixes** (§4 #1–#3, #5) — small, high-urgency, unblock real Swiss usage.
2. **Registry core** — author `markets.json` (single source), widen `RegionContext`, `/bootstrap` serves the public projection incl. `publishableKey`, delete `isCh` payment/locale branches.
3. **VAT correctness** — int→decimal migration + wire `SwissVatRates` + accounting buckets (the big rock; own plan).
4. **Store-region data** — write path + backfill + admin field.
5. **Locale expansion** — fr-CH/it-CH reachable (only if needed).

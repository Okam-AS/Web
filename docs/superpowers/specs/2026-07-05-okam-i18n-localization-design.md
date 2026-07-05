# Okam i18n / Localization — Design Spec

**Date:** 2026-07-05
**Branch:** `feature/swiss` (all three repos)
**Status:** Approved design — ready for implementation plan
**Repos touched:** `Web` (Nuxt2 admin+marketing), `ConsumerWeb` (Nuxt3 customer), `OkamAPI` (ASP.NET backend), and the shared `Core` git submodule (`Okam-AS/Core.git`, vendored into all clients incl. 2 NativeScript apps).

---

## 1. Problem

Okam is going multi-market (Norway `NO` live; Switzerland `CH` launching; more later). User-facing text and formatting are pervasively hardcoded to Norwegian and are **not gated by market**:

- **~282 hardcoded frontend strings** bypass every i18n engine: **261 in admin `Web`** (incl. the entire onboarding wizard) + **21 in `ConsumerWeb`**.
- **~40 hardcoded backend strings** (OTP SMS, order SMS/push, emails, invoice/receipt PDFs) ignore the `RegionContext.Locale` the backend already computes.
- **Two i18n engines in the admin** with divergent missing-key fallbacks → a missing key silently renders **Norwegian**.
- **Market selection is a build-time boolean `isCh`** branched across **22 files**, plus a parallel runtime `marketConfig` Vuex getter — fragmented, not data-driven.
- **Currency/format bugs (not just language):** admin hardcodes `kr `; the Swiss formatter `CurrencyFormatting.FormatChf` exists but has **zero callers**; backend payout PDFs hardcode `MVA 25,00 %` (Norwegian VAT — CH is 8.1%); Twilio phone validation hardcodes country `"NO"` → Swiss `+41` giftcard numbers rejected.

**Goal:** (a) no hardcoded Norwegian reaches a CH user; (b) **adding a market becomes a config entry + a translation file with zero code edits.**

---

## 2. Current state (verified 2026-07-05)

- **Core `$i()` engine already exists** and is shared: `Core` git submodule vendored into `Web`, `ConsumerWeb`, `ConsumerApp`, `AdminApp`. Ships `core/pinia/translation.ts` (`$i(key, params)`), `core/pinia/services.ts` (`setCultureCode`/`cultureCode`), `core/helpers/tools.ts` (`setCurrencyFormat`), and `core/translations/{no,en,de,fr,it}.ts` (407 keys).
- **Admin already uses `$i` in 57 files** (incl. `pages/admin/index.vue` dashboard) — migrating strings to `$i` follows an existing pattern, not a new dependency.
- **`Web/config/edition.js` already models markets:** `markets.no` / `markets.ch` with `{ code, locale, currency, country, hostname, shopUrl, phonePrefix, phoneNationalLength, termsUrl, gaId }`. Selected by **build-time** `OKAM_EDITION` env (`market = isCh ? markets.ch : markets.no`). A separate **runtime** path exists via `Web/plugins/market-mixin.js` → `$store.getters.marketConfig` / `marketIsCh`.
- **Legacy admin engine:** `Web/plugins/i18n.js` + `Web/translations/{no,en,de}.ts` (**1,548 keys**), read from Vuex `adminLocale` (init hardcoded `'no'`), fallback `no→en→de`. Core's fallback is `en→key`. This mismatch is why missing keys render Norwegian.
- **Currency seam:** `Web/plugins/global-mixin.js:38` calls `setCurrencyFormat({ prefix: 'kr ', suffix: '' })` **unconditionally**; `:136` has `if (this.isCh) return formatChf(totalPrice)` (ad-hoc detour via `~/utils/price`).
- **ConsumerWeb** already reacts region→locale: `ConsumerWeb/plugins/1.currency-format.client.ts` maps `CHF → de + Swiss format` (hardcoded `code==='CHF'?'de':'no'`).
- **Backend:** `WebApi.Services.Region.RegionResolver` maps region → `RegionContext { Region, CurrencyCode, ConnectedAccountCountry, Locale("nb-NO"|"de-CH") }`, produced per store via `ResolveForStore(store)`. `Helpers/CurrencyFormatting.FormatChf` is deterministic (hand-rolled `NumberFormatInfo`, deliberately not ICU) but unused. `Helpers/Label.Price` hardcodes `new CultureInfo("nb-NO")`. No message/string engine exists.

---

## 3. Architecture (target state)

**Decision: converge on Core `$i()`; do NOT adopt `@nuxtjs/i18n`.** Rationale: Core is shared into 2 NativeScript apps where a Nuxt-only module cannot run; adopting it would fork the deliberately-shared model and duplicate 407+1548 existing keys.

Three pillars:

1. **One string engine — Core `$i(key, params)`.** All ~282 hardcoded frontend strings become `$i` keys with values in Core catalogs (`de` first, `no` preserved). The legacy 1,548-key admin engine is **subordinated, not big-bang deleted**: unify its fallback semantics with Core so a missing key never silently renders Norwegian, and route admin locale off the same `cultureCode` variable. Admin-only keys may stay in `Web/translations/` but load+select through the same mechanism.

2. **Market = a data registry, not a build flag.** Promote `edition.js markets{}` into the single source of truth (long-term: into Core, per its `llms.txt`), extended with a `currencyFormat` block `{ prefix, suffix, symbol, decimalSeparator, thousandSeparator, symbolPosition }` and `locales: string[]`. Unify the build-time `isCh` and the runtime `marketConfig` into one resolved market object. Replace all **22 `isCh` branch sites** with data lookups keyed by the resolved market code. Locale + currency **derive from the market**. Catalog set becomes data-driven (`import.meta.glob('../translations/*.ts')` / a `locales[]` array) so dropping a new `<locale>.ts` needs no code edit.

3. **Backend — locale-keyed JSON message catalog.** `OkamAPI/Resources/strings.<locale>.json` (flat `{"sms_otpMessage":"…{app}…"}`, locales `nb-NO`, `de-CH`, … matching `RegionResolver`). A singleton `IMessageCatalog` loads all at startup and exposes `Get(locale, key, params)` with `{token}` interpolation and fallback (requested → region default → `nb-NO` → key). Chosen over `.resx`/`IStringLocalizer` because JSON needs **no satellite-assembly build step** (the host's dotnet muxer is currently broken), mirrors the frontend catalogs 1:1, and stays deterministic. Formatting: generalize `Helpers/CurrencyFormatting` + `Helpers/Label.Price` into a **region-driven** money/number/date formatter taking `RegionContext` — **keep the hand-rolled `NumberFormatInfo`; do NOT switch to ICU/`de-CH` culture lookups** (documented: ICU renders the Swiss group separator inconsistently across hosts and breaks byte-stable receipts).

---

## 4. Phasing

Each phase is independently shippable. Frontend phases hot-reload (node dev servers run); the backend phase is **authored now, compiled/verified once the dotnet build host is fixed**.

### P0 — Change store logo from the dashboard *(build first; independent of i18n)*
- New component (e.g. `components/admin/StoreLogoCard.vue`) placed in the dashboard's existing `store-info-section` (`pages/admin/index.vue`) as a `store-card`.
- Shows the current logo; drag-drop or click to replace; JPG/PNG; 5MB cap; square-crop — reuse the proven logic from `components/onboarding/OnboardingLogoUpload.vue`.
- Upload via the **already-present-but-unused** `core/services/store-service.ts#UploadLogo(imagePath, storeId)` → `POST /stores/logo` (`StoresController.LogoUpload` → `StoreService.UploadLogoAsync`, backend already works; writes to the `WebApiStorage` blob container).
- Styled per `Web/CLAUDE.md` design system (`.store-card`, `.btn-primary`, green `#1bb776`, toast on success/error).
- Its handful of strings are added as the **first `$i` keys** (de + no), establishing the P1 pattern.

### P1 — Kill the Norwegian leaks *(frontend; visible on CH immediately)*
- Migrate all **261 admin + 21 consumer** hardcoded strings to `$i('key')` keys; author **German (de-CH)** values (+ keep Norwegian). Inventory source: workflow journal + `scratchpad/findings.json`.
- Fix the currency seam: drive `setCurrencyFormat` from `market.currencyFormat` (remove the unconditional `kr `), and remove the `if (isCh) formatChf()` detour in `global-mixin.js`.
- Priority hotspots: onboarding wizard (`OnboardingLogoUpload`, `OnboardingAIImport`, `OnboardingProductImages`), terms/privacy (`vilkar.vue`, `vilkar-store.vue`, `TermsContent.vue`, `personvern.vue`), admin chrome (`LoginModal`, `AdminPageHeader/Footer`, `OrderModal`, `CustomerInfoModal`), consumer `order.vue`/checkout promos.

### P2 — Scalable market registry *(the payoff)*
- Extend the market registry (`currencyFormat`, `locales[]`); unify build-time `isCh` + runtime `marketConfig` into one resolved market; derive `cultureCode` + currency from it at startup.
- Replace the 22 `isCh` branch sites with market lookups; generalize `ConsumerWeb/plugins/1.currency-format.client.ts` off a store region/locale field instead of `code==='CHF'`.
- Unify the two admin engines' fallback + locale variable; make catalog loading data-driven (drop-in `<locale>.ts`).
- **Exit criterion:** adding a 3rd market = add `markets[xx]` + `Core/translations/xx.ts` (+ backend `strings.xx.json`), no code edits.

### P3 — Backend catalog *(authored now, compiled when dotnet host fixed)*
- Add `OkamAPI/Resources/strings.{nb-NO,de-CH}.json`, `IMessageCatalog` + loader, region-driven formatter.
- Wire the 4 services: `UserService.cs:511` (OTP), `GiftcardService.cs:318` (giftcard + `kr`), `EmailService` (confirmation body/subject), `InvoiceService` (payout email + PDF incl. `Totalt`, `Grunnlag (eks. MVA)`, `MVA 25,00 %`, `Subtotal (ink. MVA)`, `Totalt utbetalt`) via `_catalog.Get(locale, …)`, locale from `RegionContext.ResolveForStore(store)`.
- Fix functional bugs: `Label.Price`/`CurrencyFormatting` region-driven (`kr`→CHF); `MVA 25,00 %` → region VAT rate; `NorwegianCountryCode="NO"` Twilio validation (`GiftcardService`, `UserService`) → region country so `+41` is accepted; `InvoiceService.cs:990` `new CultureInfo("nb-NO")` month names → region.

---

## 5. Key naming & translation structure

- Flat keys, snake/prefixed by area, matching existing Core style (e.g. `index_welcome`, `onboarding_logo_dropHint`, `onboarding_logo_tipsTitle`, `sms_otpMessage`). Frontend and backend share the same **glossary/prefixes** where a message exists on both sides.
- Frontend values live in `Core/translations/<locale>.ts` (shared) and `Web/translations/<locale>.ts` (admin-only). Backend values in `OkamAPI/Resources/strings.<locale>.json`.
- Interpolation: `{token}` params on both sides (`$i('k',{name})` ↔ `Get(locale,'k',{name})`).

## 6. Constraints, risks, assumptions

- **dotnet build host broken** (muxer SIGKILL) → P3 code is authored but not compiled/verified until fixed; JSON-catalog choice keeps P3 build-free to author.
- **`Core` is a shared submodule → changes touch all 4 apps** (incl. NativeScript mobile). Changes must be additive/back-compat; verify no regression to NO. Commit Core changes on its own branch/PR.
- **Branch policy:** all work on `feature/swiss`; never push `master`/`test` or merge to main until Sven says so. Core submodule changes committed separately.
- **Assumptions (approved):** Swiss = **de-CH first** (registry allows `locales:['de','fr','it']` for later); logo editor on the **dashboard** (not a separate Settings page); **German copy drafted by Claude, reviewed by Sven** before go-live.
- **Out of scope:** store *content* translations (menu/product) via `CultureService`/`CultureModelBuilder` — that is a separate system, untouched. NO-only pages (e.g. `2000-brukere-i-sogn.vue`) not translated.

## 7. Verification per phase

- **P0:** upload a logo from the dashboard → persists to `WebApiStorage`, shows on consumer store page; error/oversize paths show toast.
- **P1:** load admin+consumer as CH → no Norwegian visible in the migrated surfaces; prices render CHF; a key-coverage check asserts every `$i` key used has a `de` value (no silent NO/EN fallback).
- **P2:** flip a config-only "market" and confirm locale+currency+links follow with no code change; NO market unchanged (regression check).
- **P3 (when buildable):** unit-test `IMessageCatalog.Get` fallback chain; OTP/giftcard/email/invoice render de-CH for a CH store and nb-NO for a NO store; receipt/PDF amounts byte-stable in CHF; `+41` giftcard number accepted.

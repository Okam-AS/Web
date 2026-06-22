# Okam Swiss Edition — Design & Slice‑1 Plan

**Date:** 2026-06-22 · **Branch:** `swiss` · **Status:** approved, implementing

## Goal
A Swiss-market edition of the Okam consumer/marketing app: **keep the Okam brand**, German (de‑CH), CHF, TWINT, deployed separately to **okam.ch**. Mostly a frontend reskin; minimal backend.

## Decisions
- **Architecture:** build flag `OKAM_EDITION` = `no` (default) | `ch`. One codebase, separate builds (`OKAM_EDITION=ch npm run generate`/`start`). Wired as a **build‑time** `env.EDITION` (DefinePlugin‑inlined), surfaced via `config/edition.js`.
- **Language:** de‑CH (no `ß`; prices `CHF 1'234.50`). Keep the green `#1bb776` design system with clean Swiss polish.
- **Brand:** keep Okam, Swiss‑localized. Fresh, purpose‑built German B2B landing.

## Key constraints (from expert architecture review)
1. The consumer checkout + **all Stripe client‑side confirm live in a separate app (`shop.okam.no`), not in this repo** (`pages/webshop/*` are redirect wrappers; zero Stripe.js here). → **TWINT *frontend* UI is descoped** from this repo; build it in the shop repo later.
2. `target:'static'` but production runs **SSR** (`npm run start`). Use build‑time `env.EDITION`, **not** `publicRuntimeConfig`.
3. `priceLabel` lives in the **`core` git submodule** (shared). → branch CHF formatting in the **app‑layer mixin**, never change `core`.
4. ~86 files are hardcoded Norwegian (only 6 `$t()`). → `ch` build is German on **homepage + legal** initially; make header/footer edition‑aware so the Swiss homepage doesn't link into Norwegian pages. Full translation is a later phase.
5. **TWINT via Stripe:** automatic capture (manual unsupported for bank redirects), CHF only, client confirms via `stripe.confirmTwintPayment`; requires a **Swiss Stripe account + Swiss connected accounts** (today `Country="NO"`).
6. Edition‑gate `okam.no` sitemap/canonical/PWA‑lang/GA and the **Facebook Pixel** for the `ch` build (revDSG / avoid duplicate‑content + wrong‑jurisdiction tracking).

## Slice‑1 scope (buildable now)
- **Phase 0 — Foundation:** `OKAM_EDITION` wiring (`nuxt.config.js` `env` + new `config/edition.js`), edition‑aware i18n (`de` default for `ch`) + `de` messages, edition‑aware sitemap/PWA/GA + FB‑pixel gate, `layouts/default.vue` canonical base.
- **Phase 1 (parallel):** Swiss German landing (`SwissLanding.vue` + move `index.vue` body → `NorwegianLanding.vue` + thin selector); edition‑aware `PageHeader`/`PageFooter`; CHF formatting in the mixin + unit test.
- **Phase 2 (parallel):** Swiss legal pages `impressum.vue` / `datenschutz.vue` / `agb.vue` (German).
- **Backend (OkamAPI `feature/twint-swiss` branch):** TWINT PaymentIntent branch (automatic capture, `chf`, no server confirm, `payment_method_types:['twint']`) leaving the NO card path intact + `TWINT_SWISS_NOTES.md`.

## Out of scope (later phases)
TWINT frontend UI (`shop.okam.no` repo); full ~86‑file German translation; live `.ch` hosting/DNS + Swiss Stripe credentials; analytics/SMS provider swaps; cookie‑consent banner.

## Verification
`OKAM_EDITION=ch npm run build` compiles; CHF unit test passes; manual `OKAM_EDITION=ch` dev render shows SwissLanding + German chrome + CHF prices; Norwegian (`no`) build unchanged.

## Run environment
Node 16 via nvm + `PYTHON=python3.11` for native builds (see project memory). `core` submodule initialized.

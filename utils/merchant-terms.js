// Which merchant agreement ("Avtalevilkår") a market publishes.
//
// A LOOKUP, NOT A FORK -- and deliberately with no fallback row, for the same
// reason config/edition.js has no `|| markets.no`: a silent fallback is exactly
// how a market ends up governed by another country's law. The Norwegian
// document does not merely read as untranslated to a Swiss merchant, it binds
// him to the wrong jurisdiction: "Avtalen reguleres av norsk rett. Tvister
// løses i minnelighet eller ved Oslo tingrett."
//
// Switzerland has no entry because Okam has not written a Swiss merchant
// agreement. pages/agb.vue is NOT it: the AGB govern the platform's consumer
// relationship (Okam as Vermittlerin between Verkäufer and Käufer), while this
// document is the contract a restaurant signs to buy Okam's products. Pointing
// one at the other would be a different wrong answer, so an unlisted market
// gets the honest state below instead.
//
// Adding market #3's agreement: write its markup in TermsContent.vue behind its
// own documentId, and add one row here. Until then market #3 gets the honest
// state, never Norway's.
export const MERCHANT_TERMS = {
  no: {
    documentId: 'no-avtalevilkar-2025-04-12',
    title: 'Avtalevilkår for Okam AS'
  }
}

// What to say when a market has no agreement of its own, in that market's own
// language. Keyed by the market's `locale`; English is the fallback because it
// is the only language here that belongs to no single market.
//
// This is UI copy, not legal copy: it states that no document exists and where
// to ask. It asserts no rights, no obligations and no governing law, which is
// the whole point -- inventing those is what this file exists to prevent.
const UNPUBLISHED = {
  no: {
    title: 'Avtalevilkår',
    body: 'Okam har ikke publisert avtalevilkår for dette markedet ennå. Ta kontakt med oss før du inngår avtale:'
  },
  de: {
    title: 'Vertragsbedingungen',
    body: 'Okam hat für diesen Markt noch keine Vertragsbedingungen veröffentlicht. Bitte nehmen Sie mit uns Kontakt auf, bevor Sie einen Vertrag abschliessen:'
  },
  en: {
    title: 'Terms of agreement',
    body: 'Okam has not published terms of agreement for this market yet. Please get in touch with us before entering into an agreement:'
  }
}

/**
 * Resolve the merchant agreement for a market descriptor.
 *
 * @param {object} marketConfig  a row from config/edition.js `markets`
 * @returns {{ published: boolean, documentId: string|null, title: string, body: string }}
 *   `documentId` is null when nothing is published; a template must render its
 *   document behind an explicit documentId match, so a new market can never
 *   inherit an existing one by falling through.
 */
export function merchantTermsFor (marketConfig) {
  const document = MERCHANT_TERMS[marketConfig.code]
  if (document) {
    return { published: true, documentId: document.documentId, title: document.title, body: '' }
  }
  const copy = UNPUBLISHED[marketConfig.locale] || UNPUBLISHED.en
  return { published: false, documentId: null, title: copy.title, body: copy.body }
}

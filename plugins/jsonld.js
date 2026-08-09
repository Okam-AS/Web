// Structured data (schema.org) for the site this bundle was BUILT for.
//
// Deliberately the BUILD market, not the runtime one: JSON-LD describes the
// deployed domain a crawler is currently reading, and that domain is fixed by
// the build. `market.currency` is the ISO-4217 code schema.org's priceCurrency
// wants; `market.hostname` is the canonical origin nuxt.config already feeds to
// the sitemap, so the two can never disagree again.
//
// STILL NORWEGIAN IN HERE, and knowingly so -- these are not driven by the
// market descriptor because there is no honest data to drive them from:
//   description        Norwegian copy; no German equivalent has been written.
//   downloadUrl        the '/no/' App Store storefront and '?l=nb' language,
//                      and the 'no.okam.consumer' Play id -- one app, one
//                      listing, published from Norway.
//   availableLanguage  the languages Okam's customer service actually speaks.
// Nothing in this repo reads `$jsonld` today (grep: the only references are
// this file and its nuxt.config registration), so none of the above reaches a
// rendered page on either edition.
import { market } from '~/config/edition'

export default (_, inject) => {
  inject('jsonld', {
    // Hovedside / App info
    application: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Okam',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'iOS, Android',
      description: 'Din egen bestillingsplattform',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: market.currency
      },
      aggregateRating: [
        {
          '@type': 'AggregateRating',
          ratingValue: '4.7',
          reviewCount: '24',
          author: {
            '@type': 'Organization',
            name: 'Apple App Store'
          }
        },
        {
          '@type': 'AggregateRating',
          ratingValue: '5.0',
          reviewCount: '7',
          author: {
            '@type': 'Organization',
            name: 'Google Play Store'
          }
        }
      ],
      downloadUrl: [
        'https://apps.apple.com/no/app/okam/id1514296965?l=nb',
        'https://play.google.com/store/apps/details?id=no.okam.consumer'
      ]
    },

    // Organisasjonsinfo
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Okam',
      url: market.hostname,
      logo: market.hostname + '/icon.png',
      sameAs: [
        'http://facebook.com/okam.mobilapp',
        'https://instagram.com/heiokam'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Norwegian', 'English']
      }
    }
  })
}
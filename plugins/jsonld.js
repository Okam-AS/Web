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
        priceCurrency: 'NOK'
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
      url: 'https://okam.no',
      logo: 'https://okam.no/icon.png',
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
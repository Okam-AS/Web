import no from '~/translations/no'
import de from '~/translations/de'

const LOGO_KEYS = [
  'logo_cardTitle', 'logo_dropHint', 'logo_uploading', 'logo_updated',
  'logo_tipSquare', 'logo_tipFormats', 'logo_tipMaxSize',
  'logo_errorFormat', 'logo_errorTooLarge', 'logo_errorUpload'
]

describe('logo_* translation keys', () => {
  test.each(LOGO_KEYS)('no.ts defines %s', (k) => {
    expect(typeof no[k]).toBe('string')
    expect(no[k].length).toBeGreaterThan(0)
  })
  test.each(LOGO_KEYS)('de.ts defines %s (German, reviewed)', (k) => {
    expect(typeof de[k]).toBe('string')
    expect(de[k].length).toBeGreaterThan(0)
  })
})

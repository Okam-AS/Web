import { validateLogoFile, MAX_LOGO_BYTES } from '~/utils/logo'

describe('validateLogoFile', () => {
  test('accepts a small png', () => {
    expect(validateLogoFile({ type: 'image/png', size: 1024 })).toEqual({ ok: true, errorKey: null })
  })
  test('accepts a jpeg', () => {
    expect(validateLogoFile({ type: 'image/jpeg', size: 1024 }).ok).toBe(true)
  })
  test('rejects a gif with a format error key', () => {
    expect(validateLogoFile({ type: 'image/gif', size: 1024 })).toEqual({ ok: false, errorKey: 'logo_errorFormat' })
  })
  test('rejects a file over 5MB with a size error key', () => {
    expect(validateLogoFile({ type: 'image/png', size: MAX_LOGO_BYTES + 1 })).toEqual({ ok: false, errorKey: 'logo_errorTooLarge' })
  })
  test('rejects null/undefined', () => {
    expect(validateLogoFile(null).ok).toBe(false)
    expect(validateLogoFile(undefined).ok).toBe(false)
  })
})

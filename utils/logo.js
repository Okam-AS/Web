// Pure logo-file validation shared by the dashboard logo card and (later) onboarding.
export const MAX_LOGO_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export function validateLogoFile (file) {
  if (!file || !ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, errorKey: 'logo_errorFormat' }
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, errorKey: 'logo_errorTooLarge' }
  }
  return { ok: true, errorKey: null }
}

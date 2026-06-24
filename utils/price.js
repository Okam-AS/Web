// CHF price formatting helper for the Swiss ('ch') edition.
// Amounts are in MINOR units (Rappen), matching core/helpers/tools priceLabel.
// Produces strings like "CHF 1'234.50":
//   - de-CH locale, always 2 decimals, point decimal separator
//   - thousands separator normalised to an ASCII apostrophe (U+0027),
//     since de-CH Intl may emit the typographic apostrophe (U+2019)

const TYPOGRAPHIC_APOSTROPHE = String.fromCharCode(0x2019) // ’
const ASCII_APOSTROPHE = String.fromCharCode(0x27) // '

export function formatChf (amountMinor) {
  const minor = Number(amountMinor) || 0
  const formatted = new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(minor / 100)
    .split(TYPOGRAPHIC_APOSTROPHE)
    .join(ASCII_APOSTROPHE)
  return 'CHF ' + formatted
}

export default formatChf

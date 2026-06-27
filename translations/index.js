// One flat dictionary per language (mirrors the native ConsumerApp structure:
// translations/no.ts, en.ts, de.ts). Exposed to the app as { no, en, de } and
// consumed by the `$i` helper in plugins/i18n.js.
//
// Keys are flat and namespaced by page/component (e.g. `orders_allOrders`).
// Generic shared keys use the `common_` prefix; sidebar keys use `nav_`.
import no from './no'
import en from './en'
import de from './de'

export const LANGUAGES = ['no', 'en', 'de']

const translations = { no, en, de }

export default translations

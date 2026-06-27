import Vue from 'vue'
import translations from '~/translations'

// `$i` — native-ConsumerApp-style translation helper, available in every
// component on both server and client. Reads the active admin locale from the
// Vuex store (`adminLocale`) and looks the key up in the flat dictionary.
//
// Usage:
//   <h1>{{ $i('products_pageTitle') }}</h1>
//   this.$i('common_save')
//   $i('orders_itemCount', { count: 5 })   // -> "5 varer" from "{count} varer"
//
// Interpolation: pass a params object; `{name}` tokens in the string are
// replaced with params.name.
//
// Resolution order: active locale → Norwegian → English → German → the key
// itself (so a missing translation degrades gracefully and is easy to spot).
const FALLBACK_ORDER = ['no', 'en', 'de']

function lookup (locale, key) {
  const dict = translations[locale]
  if (dict && dict[key]) { return dict[key] }

  for (const lang of FALLBACK_ORDER) {
    const fallback = translations[lang]
    if (fallback && fallback[key]) { return fallback[key] }
  }

  return key
}

function translate (locale, key, params) {
  if (!key) { return '' }

  const str = lookup(locale, key)

  if (params) {
    return str.replace(/\{(\w+)\}/g, (match, token) =>
      (params[token] != null ? params[token] : match)
    )
  }

  return str
}

Vue.mixin({
  methods: {
    $i (key, params) {
      const locale = (this.$store && this.$store.state.adminLocale) || 'no'
      return translate(locale, key, params)
    }
  }
})

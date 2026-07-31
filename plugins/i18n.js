import Vue from 'vue'
import { translate } from '~/utils/i18n'

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
// The lookup itself lives in `~/utils/i18n` because the GUEST surface needs the
// same dictionary against a locale that is not the operator's — see that file.

Vue.mixin({
  methods: {
    $i (key, params) {
      const locale = (this.$store && this.$store.state.adminLocale) || 'no'
      return translate(locale, key, params)
    }
  }
})

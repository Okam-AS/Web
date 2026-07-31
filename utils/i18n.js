// The flat-dictionary lookup behind `$i`, as a pure function.
//
// It lives here rather than inside `plugins/i18n.js` because the mixin resolves ONE locale — the
// signed-in operator's `adminLocale` — and the guest surface has no operator. A guest arrives on a
// tokenised link with a language of their own (the route prefix nuxt-i18n set, or the one they pick
// on the page), and translating their page through a preference stored by whoever last used this
// browser for admin work is how a Norwegian venue's offer reaches a German guest in Norwegian.
//
// Importing the plugin instead would also install its `Vue.mixin` as a side effect of the import,
// which a pure unit test of the guest copy must not do.

import translations from '~/translations';

// Resolution order after the active locale, matching the plugin's: Norwegian is the source language
// of this product, English is the widest fallback, German is last.
const FALLBACK_ORDER = ['no', 'en', 'de'];

function lookup (locale, key) {
  const dict = translations[locale];
  if (dict && dict[key]) { return dict[key]; }

  for (const lang of FALLBACK_ORDER) {
    const fallback = translations[lang];
    if (fallback && fallback[key]) { return fallback[key]; }
  }

  // The key itself, so a missing string degrades to something legible and greppable rather than to
  // an empty element that reads as a rendering bug.
  return key;
}

/**
 * `(locale, key, params) -> string`. `{token}` placeholders are replaced from `params`; a token the
 * params do not carry is left as written rather than blanked, so a half-filled sentence is visible.
 */
export function translate (locale, key, params) {
  if (!key) { return ''; }

  const str = lookup(locale, key);

  if (params) {
    return str.replace(/\{(\w+)\}/g, (match, token) =>
      (params[token] != null ? params[token] : match)
    );
  }

  return str;
}

export default translate;

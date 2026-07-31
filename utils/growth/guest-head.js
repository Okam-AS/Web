// The `head()` every Growth guest page returns.
//
// It exists because these four pages have two requirements the rest of the site does not, and both
// are the kind that is forgotten on page five:
//
// NOINDEX. Three of the four are entered by spending a one-time credential and are meaningless
// without it; `robots.txt` cannot usefully cover them (the confirm and preference paths are fixed by
// `GrowthSettings`, and a search result for either is a dead page at best), so each page declares it.
// The signup page is a genuinely public capture surface and opts out of this.
//
// NO THIRD-PARTY TRACKER ON A CONSENT SURFACE. `nuxt.config.js` injects the Meta Pixel into the
// document head of EVERY page in the Norwegian edition, including `layout: 'empty'` ones. A page where
// a person withdraws consent or exercises GDPR art. 17 must not be simultaneously loading a
// third-party advertising tracker; doing so would be the module's own message contradicted by the
// page it is delivered on. vue-meta deduplicates by `hid` with the deepest component winning, so
// re-declaring the two pixel tags empty here replaces them rather than adding to them.
//
// WHAT THIS DOES NOT DO, stated so nobody reads more into it: it does not remove Google Analytics,
// which `@nuxtjs/google-analytics` installs as a plugin rather than as a head tag and which cannot be
// overridden from `head()`. That property is a Universal Analytics id (`UA-167439729-2`), a service
// shut down in 2023, so it currently transmits nothing — but if the site is ever migrated to GA4, the
// guest surfaces need an explicit exclusion and this comment is the note that says so.

/**
 * `(title, options) -> head` for a Growth guest page.
 *
 * `options.index` opts a page INTO indexing (only the public signup page does).
 */
export function guestHead (title, options) {
  const opts = options || {};
  const head = {
    title,
    meta: [],
    script: [
      // Empty bodies under the same hids the global config uses: a replacement, not an addition.
      { hid: 'fb-pixel', innerHTML: '', type: 'text/javascript' }
    ],
    noscript: [
      { hid: 'fb-pixel-noscript', innerHTML: '' }
    ]
  };

  if (!opts.index) {
    head.meta.push({ hid: 'robots', name: 'robots', content: 'noindex, nofollow' });
  }

  return head;
}

export default guestHead;

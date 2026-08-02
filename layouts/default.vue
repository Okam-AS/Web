<template>
  <div>
    <nuxt />
  </div>
</template>

<script>
// ---- `bodyAttrs.class` IS AN ARRAY, AND THAT IS LOAD-BEARING ----------------------------------
//
// vue-meta owns `body.class` outright. `updateAttribute` rebuilds the whole attribute from its own
// internal map and writes it with `setAttribute`, so a class put there by anything else — a
// `document.body.classList.add` in a component's `mounted`, say — is gone on the next head update,
// and this layout's `head()` reads `this.$route`, so one fires on every navigation. That is not
// theory: on 2026-08-01 the scroll lock behind every modal in the app was measured dead in a browser
// for exactly this reason (`components/atoms/Modal.vue`), and before it the statutory print
// stylesheet on the personalliste.
//
// So a body class has to be DECLARED through `head()`. But a plain string does not compose: vue-meta
// merges component `head()` results with deepmerge, and deepmerge REPLACES a string with a string —
// so the deepest declaration wins and every shallower one silently disappears. A modal declaring
// `class: 'noscroll'` would take `okam-ch` off the Swiss site while it was open.
//
// An ARRAY composes, because vue-meta routes array-valued attributes through its own `_arrayMerge`,
// which ends in `destination.concat(source)`, and `updateAttribute` then joins the accumulated values
// with a space. Layout, page and component each CONTRIBUTE a class instead of overwriting one.
//
// Therefore: everything in this repo that declares `bodyAttrs.class` declares an ARRAY. The invariant
// is enforced in test/modal-scroll-lock.test.js, because the failure it prevents is invisible —
// nothing throws, nothing logs, a class simply stops being there.
export default {
  head() {
    const canonical = `${this.marketConfig.hostname}${this.$route.path}`;
    return {
      link: [{ rel: "canonical", href: canonical }],
      htmlAttrs: {
        lang: this.isCh ? "de-CH" : this.$i18n.locale,
      },
      bodyAttrs: {
        class: this.isCh ? ["okam-ch"] : [],
      },
    };
  },
};
</script>

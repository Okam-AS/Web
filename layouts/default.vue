<template>
  <div>
    <nuxt />
  </div>
</template>

<script>
import { market } from "~/config/edition";

export default {
  head() {
    const canonical = `${market.hostname}${this.$route.path}`;
    return {
      link: [{ rel: "canonical", href: canonical }],
      htmlAttrs: {
        lang: this.$i18n.locale,
      },
    };
  },
};
</script>

<template>
  <div>
    <nuxt />
  </div>
</template>

<script>
export default {
  head() {
    const canonical = `${this.marketConfig.hostname}${this.$route.path}`;
    return {
      link: [{ rel: "canonical", href: canonical }],
      htmlAttrs: {
        lang: this.isCh ? "de-CH" : this.$i18n.locale,
      },
      bodyAttrs: {
        class: this.isCh ? "okam-ch" : "",
      },
    };
  },
};
</script>

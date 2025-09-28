<template>
  <div>
    <nuxt />
  </div>
</template>

<script>
export default {
  head() {
    const canonical = `https://okam.no${this.$route.path}`;
    return {
      link: [{ rel: "canonical", href: canonical }],
      htmlAttrs: {
        lang: this.$i18n.locale,
      },
    };
  },
};
</script>

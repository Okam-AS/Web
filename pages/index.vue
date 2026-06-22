<template>
  <swiss-landing v-if="isCh" />
  <norwegian-landing v-else />
</template>

<script>
import { isCh } from "~/config/edition";
import NorwegianLanding from "~/components/landing/NorwegianLanding.vue";
import SwissLanding from "~/components/landing/SwissLanding.vue";

export default {
  components: { SwissLanding, NorwegianLanding },
  data: () => ({ isCh }),
};
</script>

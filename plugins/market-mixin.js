import Vue from 'vue'

// Reactive market flags available to EVERY component on BOTH server and client.
// Driven by the runtime market switcher (Vuex `market` state). Kept separate from
// the ssr:false global-mixin so `isCh` / `marketConfig` also resolve during SSR.
Vue.mixin({
  computed: {
    isCh () {
      return this.$store.getters.marketIsCh
    },
    marketConfig () {
      return this.$store.getters.marketConfig
    }
  }
})

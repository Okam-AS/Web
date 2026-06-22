<template>
  <div class="market-switcher">
    <button
      class="market-switcher__btn"
      :aria-expanded="open"
      aria-label="Markt wählen / Velg marked"
      @click="open = !open"
    >
      <span class="market-switcher__flag">{{ current.flag }}</span>
      <span class="market-switcher__code">{{ current.short }}</span>
      <span class="material-icons market-switcher__chev" :class="{ 'is-open': open }">expand_more</span>
    </button>

    <div
      v-if="open"
      class="market-switcher__backdrop"
      @click="open = false"
    />

    <ul
      v-if="open"
      class="market-switcher__menu"
    >
      <li
        v-for="m in options"
        :key="m.code"
      >
        <button
          class="market-switcher__opt"
          :class="{ 'is-active': m.code === currentCode }"
          @click="select(m.code)"
        >
          <span class="market-switcher__flag">{{ m.flag }}</span>
          <span class="market-switcher__name">{{ m.name }}</span>
          <span
            v-if="m.code === currentCode"
            class="material-icons market-switcher__check"
          >check</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "MarketSwitcher",
  data: () => ({
    open: false,
    options: [
      { code: "no", flag: "🇳🇴", name: "Norge", short: "NO" },
      { code: "ch", flag: "🇨🇭", name: "Schweiz", short: "CH" },
    ],
  }),
  computed: {
    currentCode() {
      return this.$store.state.market;
    },
    current() {
      return this.options.find((o) => o.code === this.currentCode) || this.options[0];
    },
  },
  methods: {
    select(code) {
      if (code !== this.currentCode) {
        this.$store.dispatch("SetMarket", code);
      }
      this.open = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.market-switcher {
  position: relative;
}

.market-switcher__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 10px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  color: #292c34;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e0;
  }
}

.market-switcher__flag {
  font-size: 1.1rem;
  line-height: 1;
}

.market-switcher__chev {
  font-size: 1.1rem;
  color: #94a3b8;
  transition: transform 0.2s ease;

  &.is-open {
    transform: rotate(180deg);
  }
}

.market-switcher__backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
}

.market-switcher__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  min-width: 180px;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.market-switcher__opt {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 7px;
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #292c34;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: #f8f9fa;
  }

  &.is-active {
    color: #159f63;
    font-weight: 600;
  }
}

.market-switcher__name {
  flex: 1;
}

.market-switcher__check {
  font-size: 1.1rem;
  color: #1bb776;
}
</style>
